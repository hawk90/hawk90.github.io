---
title: "ESP32-C3 BLE 5.0 분석 — GAP·GATT·Coded PHY"
slug: "embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt"
date: 2026-05-20T09:08:00
description: "ESP-IDF v5.4.2와 고정 NimBLE의 GAP·GATT 등록, notify buffer 소유권·MTU·pairing 조건을 확인합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 8
tags: [ble, bluetooth, gap, gatt, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **PHY의 전송률을 application 처리량·거리의 고정 배수로 읽지 않습니다.** GAP는 발견·연결 절차를, GATT는 attribute 기반 데이터 접근을 다룹니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`와 그 submodule인 esp-nimble commit `0225775e49669cd4f070400908f73718bddce83b`입니다. BR/EDR을 지원하지 않는 C3에서 host/controller 설정·peer 기능·동시 역할 자원 제한을 함께 확인합니다. Wi-Fi와 radio를 공유해도 처리량이 항상 절반이 되는 것은 아닙니다.

아래 예는 host lifecycle에 연결할 advertising·Battery Service 구성 요소입니다. 전체 host/controller 초기화·sync·event loop는 [고정 bleprph 예제](https://github.com/espressif/esp-idf/tree/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0/examples/bluetooth/nimble/bleprph)를 기준으로 준비합니다. 이 장에서는 실제 phone·RF·pairing을 실행하지 않았습니다.

## GAP와 GATT — 두 축의 분리

BLE를 처음 만지면 GAP와 GATT가 *섞여 보입니다*. 분리하면 단순해집니다.

| 영역 | 다루는 것 | 비유 |
|------|---------|------|
| GAP (Generic Access Profile) | *어떻게 만나는가* — advertising, scanning, connection, pairing | 명함 교환과 통화 연결 |
| GATT (Generic Attribute Profile) | *무엇을 주고받는가* — service, characteristic, descriptor | 통화 내용 |

advertise → scan → connect 까지는 *GAP의 영역*입니다. 일단 연결이 서면 그때부터 *GATT*로 데이터가 흐릅니다. *역할*도 다릅니다.

| GAP role | 설명 | 예 |
|---------|------|-----|
| Central | 스캔하고 연결을 *시작* | 스마트폰 |
| Peripheral | 광고하고 연결을 *수락* | 센서, 시계, ESP32-C3 |
| Broadcaster | 광고만, 연결 없음 | iBeacon, Eddystone |
| Observer | 스캔만, 연결 없음 | 비콘 수집기 |

여러 GAP 역할의 조합은 controller/host build 설정·connection/advertising set 수와 peer 조건을 확인합니다. 역할 이름이 지원된다고 네 역할의 임의 workload를 동시에 보장하는 것은 아닙니다.

## BLE 5.0이 가져온 변화

1M/2M/Coded PHY의 선택은 controller와 peer 양쪽의 지원을 필요로 합니다. Coded PHY는 coding과 link 조건의 trade-off이며12dB·거리4배·특정 야외 거리를 모든 제품에서 보장하지 않습니다. Phone의 OS 버전이나 모델 이름만으로 PHY 지원을 단정하지 않고 실제 협상 event와 peer 기능을 확인합니다.

기준 NimBLE에는 다음 API가 있습니다. 기존의 미정의 `ble_gap_set_phy_args` 구조체 없이 실제 인자를 사용합니다.

```c title="c3-ble-phy.c"
#include "host/ble_hs.h"

int c3_request_coded_phy(uint16_t connection) {
    return ble_gap_set_prefered_le_phy(connection,
        BLE_GAP_LE_PHY_CODED_MASK, BLE_GAP_LE_PHY_CODED_MASK,
        BLE_GAP_LE_PHY_CODED_S8);
}
```

Return0은 요청 처리 단계이며 최종 PHY 전환·throughput 성공까지 증명하지 않습니다. Peer의 응답과 PHY update event를 확인합니다.

Legacy advertising의31byte 한도와 Extended Advertising의 PDU별/chain별 data는 다릅니다. Extended advertising 전체가 무조건255byte까지라는 설명은 제거했습니다. 선택한 host/controller의 설정·data 길이·advertising mode·peer parser 지원을 확인합니다. Periodic advertising과 LE Audio의 지원도 Bluetooth version 숫자 하나로 자동 결정하지 않습니다.

## NimBLE vs Bluedroid

NimBLE과 Bluedroid는 API·지원 profile·설정·port 의존성이 다릅니다. C3에서 Bluedroid를 선택해도 chip에 BR/EDR 기능이 생기지 않습니다. 검증하지 않은 고정RAM/flash 크기와 "항상 NimBLE이 정답"이라는 순위는 사용하지 않습니다.

동일한 connection 수·MTU·profile·보안·log 설정에서 map/heap/stack과 interoperability를 비교합니다. 이 장의 코드는 NimBLE용이며 Bluedroid event/API와 혼용하지 않습니다.

## Advertising — 자기를 알리기

Host sync 뒤 own address를 준비·추론한 owner가 advertising을 시작합니다. 다음 helper는 address type과 callback을 caller에게 받으며 각 API 오류를 그대로 반환합니다.

```c title="c3-ble-advertise.c"
#include <string.h>
#include "host/ble_hs.h"

int c3_advertise(uint8_t own_address_type, ble_gap_event_fn *callback, void *context) {
    if (!callback) return BLE_HS_EINVAL;
    static const uint8_t name[] = "C3-Sensor";
    struct ble_hs_adv_fields fields = {0};
    fields.flags = BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP;
    fields.name = name;
    fields.name_len = sizeof(name) - 1;
    fields.name_is_complete = 1;
    int error = ble_gap_adv_set_fields(&fields);
    if (error) return error;
    struct ble_gap_adv_params parameters = {
        .conn_mode = BLE_GAP_CONN_MODE_UND,
        .disc_mode = BLE_GAP_DISC_MODE_GEN,
        .itvl_min = BLE_GAP_ADV_FAST_INTERVAL1_MIN,
        .itvl_max = BLE_GAP_ADV_FAST_INTERVAL1_MAX,
    };
    return ble_gap_adv_start(own_address_type, NULL, BLE_HS_FOREVER,
                             &parameters, callback, context);
}
```

Connect 실패와 disconnect 뒤의 재광고는 GAP event를 처리하는 owner가 판단합니다. 광고 중지·host reset·종료와 중복 start를 함께 관리합니다. `BLE_GAP_ADV_FAST_INTERVAL1_MIN/MAX`의 실제 값은 선택한 build 설정을 따르며, interval만으로 평균 전류·발견 latency를 보장하지 않습니다.

## GATT 서비스 — 데이터 모델

Battery Service0x180F의 Battery Level0x2A19는0~100 값으로 설명할 수 있습니다. 다음 예는 GATT 등록·read callback·notify payload 소유권을 묶습니다. Application이 관련 호출을 host context에서 직렬화하고 Battery Service를 중복 등록하지 않는 조건입니다.

```c title="c3-battery-gatt.c"
#include <stdbool.h>
#include <stdint.h>
#include "host/ble_hs.h"

static uint8_t battery_level = 87;
static uint16_t battery_value_handle;

static int battery_read(uint16_t connection, uint16_t attribute,
                         struct ble_gatt_access_ctxt *context, void *arg) {
    (void)connection; (void)attribute; (void)arg;
    if (context->op != BLE_GATT_ACCESS_OP_READ_CHR) return BLE_ATT_ERR_UNLIKELY;
    return os_mbuf_append(context->om, &battery_level, 1) == 0
        ? 0 : BLE_ATT_ERR_INSUFFICIENT_RES;
}

static const struct ble_gatt_svc_def services[] = {
    {
        .type = BLE_GATT_SVC_TYPE_PRIMARY,
        .uuid = BLE_UUID16_DECLARE(0x180f),
        .characteristics = (struct ble_gatt_chr_def[]) {
            {
                .uuid = BLE_UUID16_DECLARE(0x2a19),
                .access_cb = battery_read,
                .flags = BLE_GATT_CHR_F_READ | BLE_GATT_CHR_F_NOTIFY,
                .val_handle = &battery_value_handle,
            },
            {0},
        },
    },
    {0},
};

int c3_battery_register(void) {
    int error = ble_gatts_count_cfg(services);
    return error ? error : ble_gatts_add_svcs(services);
}

int c3_battery_notify(uint16_t connection, bool subscribed, uint8_t level) {
    if (connection == BLE_HS_CONN_HANDLE_NONE || !subscribed ||
        battery_value_handle == 0 || level > 100) return BLE_HS_EINVAL;
    battery_level = level;
    struct os_mbuf *packet = ble_hs_mbuf_from_flat(&level, 1);
    if (!packet) return BLE_HS_ENOMEM;
    return ble_gatts_notify_custom(connection, battery_value_handle, packet);
}
```

Host owner는 GAP/GATT 기본 service 준비와 이 등록을 startup 순서에 연결합니다. `val_handle`은 실제 GATT database가 준비된 뒤 유효하며 UUID와 attribute handle을 혼동하지 않습니다. Peer별 CONNECT/SUBSCRIBE/DISCONNECT 상태와 해당 value handle을 확인해 `connection`·`subscribed`를 전달합니다. 비동기 task에 보관한 옛 handle을 새 연결에 재사용하지 않습니다.

[고정 ble_gatt.h](https://github.com/espressif/esp-nimble/blob/0225775e49669cd4f070400908f73718bddce83b/nimble/host/include/host/ble_gatt.h)는 `ble_gatts_notify_custom()`이 **성공·실패와 무관하게 mbuf를 소비**한다고 명시합니다. 호출 뒤 application에서 다시 free하지 않습니다. 이 free-form API가 CCCD 정책을 대신 확인한다고 가정하지 않으며 application이 peer별 구독·보안 상태를 검사합니다. Local battery 값 갱신과 notification 전달 성공도 별개입니다. Return0은 phone application의 수신 확인이 아닙니다.

## 표준 service와 자체 service

자주 쓰는 *표준 service UUID*입니다.

| Service | UUID | 비고 |
|---------|------|------|
| Generic Access | 0x1800 | 디바이스 이름, appearance |
| Generic Attribute | 0x1801 | 서비스 변경 통지 |
| Battery Service | 0x180F | 배터리 잔량 |
| Device Information | 0x180A | 제조사, 모델, 펌웨어 |
| Heart Rate | 0x180D | 심박수 |
| Health Thermometer | 0x1809 | 체온계 |
| HID over GATT | 0x1812 | 키보드·마우스·게임패드 |
| Nordic UART (NUS) | 6E400001-... | 시리얼 over BLE (de facto) |

UUID만 맞췄다고 모든 phone app이 자동 해석하는 것은 아닙니다. Profile의 데이터 형식·동작·보안과 client의 지원을 확인합니다. 자체 service도 generic GATT client로 탐색할 수 있지만 의미 해석에는 별도 schema가 필요합니다.

## Pairing과 Bonding

연결 자체는 *암호화 없이*도 동작합니다. 보안이 필요하면 *pairing*을 합니다. Pairing 결과를 영구 저장하면 *bonding*입니다.

| 모드 | I/O 요구 | 보안 | 비고 |
|------|---------|------|------|
| Just Works | 없음 | MITM 취약 | 가장 흔함 |
| Passkey Entry | 디스플레이 또는 키패드 | MITM 방어 | 6자리 숫자 |
| Numeric Comparison | 양쪽 숫자 표시와 사용자 확인 입력 | MITM 방어 | LE Secure Connections |
| Out-of-Band (OOB) | 별도 신뢰 채널 | 채널의 인증·보호에 의존 | 별도 채널로 키 교환 |

I/O capability는 실제 display·입력·사용자 확인 수단과 맞아야 합니다. `NO_IO`로 Just Works를 선택한 상태에서 `sm_mitm=1`만 켜면 인증된 MITM 방어가 생긴다는 뜻은 아닙니다. Secure Connections 사용 여부와 authenticated pairing은 별도 조건입니다. 실제 association method·실패·재연결과 잘못된 key를 시험합니다.

Bond 저장은 선택한 store backend와 NVS 구성·초기화·erase/migration 정책에 달려 있습니다. Namespace를 무조건 `ble_hs_store`라고 가정하거나 partition table 변경만으로 항상 삭제된다고 설명하지 않습니다. OTA/복구 과정에서 기존 bond가 유지·폐기되어야 할 조건을 정합니다.

## WiFi와 BLE 동시 운영

C3는 Wi-Fi와 BLE가 radio를 공유합니다. Arbitration은 workload·connection interval·scan/advertising·PHY·coexistence 설정에 달려 있어 고정50:50 timeline을 사용하지 않습니다. 기존 ASCII/TODO 도식은 잘못된 비율을 암시하므로 제거했습니다.

Coexistence 설정 이름과 지원 조건을 고정 SDK의 Kconfig에서 확인하고 Wi-Fi만·BLE만·동시 사용의 전달률·tail latency·reconnect·전류를 같은 조건에서 측정합니다. 중간에 Wi-Fi를 끊거나 advertising을 멈추는 정책은 제품의 연결 요구와 함께 검토합니다.

## 자주 하는 실수와 troubleshooting

연결 직후 끊김을 무조건 MTU·전원 문제로 진단하지 않습니다. GAP status/reason, 보안 협상과 controller/host log를 확인합니다. 광고·구독·notify handle·buffer 부족·bond store를 단계별로 분리합니다.

단일 ATT Handle Value Notification에는 opcode1byte와 handle2byte가 있어 payload 한계는 `ATT_MTU - 3`입니다. 따라서23에서는20byte,247에서는244byte입니다. [Bluetooth ATT 명세](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-54/out/en/host/attribute-protocol--att-.html)의 이 계산을 적용하되 attribute 최대 길이·host buffer 한도도 만족해야 합니다. 이 명세 참조가 C3의 Bluetooth5.4 기능 지원을 뜻하지는 않습니다.

`ble_att_set_preferred_mtu(247)`는 preference이며 peer와의 실제 negotiated MTU를 조회해 사용합니다. ATT message와 Link Layer PDU 하나를 같은 packet으로 취급하지 않습니다. 큰 MTU를 설정한다고 BLE link의 reliability·application throughput이 자동 향상되지 않습니다.

## 정리

GAP·GATT·PHY·보안 협상을 구분하고 고정 host API의 수명과 buffer 소유권을 지킵니다. Advertising 설정과 GATT 등록 예는 완성된 host startup·phone interoperability 시험이 아닙니다. 실제 negotiated state·구독·MTU·bond 저장과 실패 경로를 제품에서 관찰합니다.

## 다음 편

[Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)에서는 무선 코드를 *어떻게 빌드해서 칩에 올리는지*를 다룹니다. idf.py CLI, CMake 컴포넌트, Kconfig, Component Manager까지 한 번에 풉니다.

## 관련 항목

- [Ch 7: WiFi 4 스택 — Station·SoftAP·Mesh](/blog/embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack) — 라디오 공유 상대
- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — sleep mode와 측정 조건
- [원문 — Apache NimBLE Tutorials](https://mynewt.apache.org/latest/tutorials/ble/ble.html)
- [원문 — ESP-IDF NimBLE Examples](https://github.com/espressif/esp-idf/tree/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0/examples/bluetooth/nimble)
- [원문 — Bluetooth Core 5.0 Specification](https://www.bluetooth.com/specifications/specs/core-specification-5-0/)
