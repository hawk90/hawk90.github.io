---
title: "ESP32-C3 BLE 5.0 분석 — GAP·GATT·Coded PHY"
slug: "embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt"
date: 2026-05-20T09:08:00
description: "ESP-IDF v5.4.2의 NimBLE로 ESP32-C3에서 advertising·GATT 서비스·notify·Coded PHY를 구성하고, NimBLE과 Bluedroid의 image 크기, 연결 수 한도, MTU·bond 저장 기본값을 빌드 결과와 Kconfig로 확인합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 8
tags: [ble, bluetooth, gap, gatt, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **GAP는 "어떻게 만나는가", GATT는 "무엇을 주고받는가"를 다룹니다.** C3의 BLE 5는 Coded PHY와 Extended Advertising을 지원하지만, 기본 설정에서는 연결 3개, bond 비저장, Extended Advertising 꺼짐으로 시작합니다.

C3는 Bluetooth LE만 지원하고 BR/EDR(Classic)은 없습니다(Ch 1). 이 장은 [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2)에 submodule로 들어 있는 NimBLE host를 기준으로 하고, 전체 host 초기화·sync·event 흐름은 [v5.4.2 `bleprph` 예제](https://github.com/espressif/esp-idf/tree/v5.4.2/examples/bluetooth/nimble/bleprph)를 따릅니다.

아래 코드 조각 세 개는 `bleprph` 예제 project에 넣어 esp32c3로 빌드를 통과시켰습니다. 실제 휴대폰과의 연결, pairing, RF 거리는 시험하지 않았고, Espressif QEMU도 Bluetooth를 흉내 내지 않습니다.

## GAP와 GATT — 두 축의 분리

BLE를 처음 다루면 GAP와 GATT가 섞여 보이지만, 나눠 보면 단순합니다.

| 영역 | 다루는 것 | 비유 |
|------|---------|------|
| GAP (Generic Access Profile) | advertising, scanning, connection, pairing | 명함을 돌리고 통화를 연결하는 일 |
| GATT (Generic Attribute Profile) | service, characteristic, descriptor | 연결된 통화에서 오가는 내용 |

advertise, scan, connect까지가 GAP이고, 연결이 서면 그다음부터 GATT로 데이터가 흐릅니다.

| GAP role | 설명 | 예 |
|---------|------|-----|
| Central | scan하고 연결을 시작 | 스마트폰 |
| Peripheral | 광고하고 연결을 수락 | 센서, 시계, ESP32-C3 |
| Broadcaster | 광고만, 연결 없음 | 비콘 |
| Observer | scan만, 연결 없음 | 비콘 수집기 |

C3 데이터시트 v2.5 4.3.3.2절은 "Multiple connections in simultaneous central and peripheral roles"와 "Simultaneous advertising and scanning"을 지원한다고 적습니다. 다만 동시에 쓸 수 있는 수에는 설정 한도가 있습니다. v5.4.2 C3 controller의 `CONFIG_BT_CTRL_BLE_MAX_ACT`는 연결·scan·sync·advertising을 모두 합친 "BLE maximum activities"이고 기본값 6, 범위 1~10입니다. NimBLE host 쪽 `CONFIG_BT_NIMBLE_MAX_CONNECTIONS`는 C3에서 기본값 3, 범위 1~9입니다.

## BLE 5.0이 가져온 변화

데이터시트 4.3.3.1절에 따르면 C3의 BLE PHY는 1 Mbps, 2 Mbps, Coded PHY 125 Kbps·500 Kbps입니다. Coded PHY는 같은 bit를 여러 번 부호화해 보내는 방식이라, 시끄러운 방에서 같은 말을 천천히 여러 번 반복하는 것과 비슷합니다. 속도를 내주는 대신 수신 감도를 얻습니다. 데이터시트 Features 절의 수신 감도 "Up to -105 dBm ... (125 Kbps)"가 이 PHY의 값입니다.

PHY 변경 요청은 NimBLE의 `ble_gap_set_prefered_le_phy(conn_handle, tx_phys_mask, rx_phys_mask, phy_opts)`로 합니다. `phy_opts`에는 `BLE_GAP_LE_PHY_CODED_ANY`, `_S2`, `_S8` 중 하나를 줍니다. S8이 125 Kbps, S2가 500 Kbps에 해당합니다.

```c title="c3-ble-phy.c"
#include "host/ble_hs.h"

int c3_request_coded_phy(uint16_t connection) {
    return ble_gap_set_prefered_le_phy(connection,
        BLE_GAP_LE_PHY_CODED_MASK, BLE_GAP_LE_PHY_CODED_MASK,
        BLE_GAP_LE_PHY_CODED_S8);
}
```

반환값 0은 요청을 controller에 넘겼다는 뜻입니다. 상대가 Coded PHY를 지원하지 않으면 PHY는 바뀌지 않으므로, 실제 결과는 `BLE_GAP_EVENT_PHY_UPDATE_COMPLETE` event로 확인합니다.

advertising payload 크기도 BLE 5에서 달라졌습니다. legacy advertising의 data는 31 byte이고, Extended Advertising은 여러 PDU를 이어 붙여 더 긴 data를 보냅니다. v5.4.2의 `CONFIG_BT_NIMBLE_EXT_ADV_MAX_SIZE`는 범위 0~1650, Extended Advertising을 켰을 때 기본값 1650입니다. `bleprph` 예제를 기본 설정으로 빌드한 `sdkconfig`에는 `CONFIG_BT_NIMBLE_50_FEATURE_SUPPORT=y`와 `# CONFIG_BT_NIMBLE_EXT_ADV is not set`이 함께 찍힙니다. BLE 5 기능이 켜져 있어도 Extended Advertising은 따로 켜야 한다는 뜻입니다.

## NimBLE vs Bluedroid

ESP-IDF에는 BLE host가 두 개 있습니다. NimBLE은 Apache Mynewt에서 온 BLE 전용 host이고, Bluedroid는 Classic BT까지 다루는 host입니다. C3에서 Bluedroid를 골라도 칩에 BR/EDR이 생기지는 않습니다.

크기 차이는 빌드로 바로 확인됩니다. 비슷한 역할의 두 GATT server 예제를 esp32c3, 기본 설정으로 빌드한 `idf.py size` 결과입니다.

| 항목 | NimBLE `bleprph` | Bluedroid `gatt_server` |
|------|------|------|
| Flash Code | 436936 byte | 568540 byte |
| Flash Data | 85584 byte | 124628 byte |
| DRAM 사용 | 103682 byte | 99286 byte |
| app `.bin` | 0x963b0 (615344 byte), 1 MiB의 41% 남음 | 0xbd510 (775440 byte), 26% 남음 |

app `.bin`은 NimBLE 쪽이 160096 byte(약 156 KiB) 작습니다. 두 예제는 서비스 구성과 로그 양이 같지 않으므로 이 차이가 host만의 차이는 아니지만, OTA 슬롯 1 MiB에 Wi-Fi까지 올려야 하는 C3에서는 이 정도 차이가 슬롯 여유를 가릅니다. 정적 DRAM은 Bluedroid 쪽이 4396 byte 적게 나왔습니다. 실행 중 heap 사용량은 이 표에 없고 측정하지 않았습니다.

## Advertising — 자기를 알리기

host가 controller와 sync된 뒤 advertising을 시작합니다. 아래 helper는 이름과 flag를 넣은 advertising data를 설정하고, 연결 가능·일반 발견 모드로 광고를 시작합니다. address type과 GAP event callback은 caller가 넘깁니다.

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

`BLE_HS_ADV_F_BREDR_UNSUP`(0x04)은 "BR/EDR을 지원하지 않는다"는 flag라 C3의 실제 능력과 맞습니다. NimBLE `ble_gap.h`는 `BLE_GAP_ADV_FAST_INTERVAL1_MIN`을 30 ms(high duty 설정이면 5 ms), `_MAX`를 60 ms로 정의하고, `BLE_GAP_ADV_ITVL_MS()`가 ms를 0.625 ms 단위(`BLE_HCI_ADV_ITVL` 625 µs)로 바꿉니다. 30~60 ms 간격은 휴대폰이 빨리 찾는 대신 전류를 더 쓰는 쪽입니다. 연결이 끊긴 뒤 다시 광고할지는 GAP event를 처리하는 쪽이 정합니다.

## GATT 서비스 — 데이터 모델

GATT는 장치 안의 데이터를 service와 characteristic의 표로 보여 줍니다. 아래 예제는 Bluetooth SIG 표준 Battery Service(UUID 0x180F)의 Battery Level characteristic(0x2A19)을 등록하고, 읽기 callback과 notify를 구현합니다.

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

`val_handle`은 GATT database가 시작된 뒤 host가 채우는 attribute handle입니다. UUID(0x2A19)와 handle은 다른 값이므로 notify에는 handle을 씁니다. 구독 여부는 `BLE_GAP_EVENT_SUBSCRIBE` event로 peer마다 관리하고, 연결이 끊기면 그 connection handle을 버립니다.

notify buffer는 한번 넘기면 host 소유입니다. v5.4.2 NimBLE의 `ble_gatt.h`는 `ble_gatts_notify_custom()` 설명에 "This function consumes the supplied mbuf regardless of the outcome"이라고 적습니다. 그러니 실패했다고 caller가 `os_mbuf_free_chain()`을 부르면 이중 해제가 됩니다. 반환값 0은 notification을 보낼 준비가 끝났다는 뜻이고, 휴대폰 앱이 값을 받았다는 확인은 아닙니다. 확인이 필요하면 indication을 씁니다.

## 표준 service와 자체 service

자주 쓰는 SIG 표준 service UUID입니다.

| Service | UUID | 비고 |
|---------|------|------|
| Generic Access | 0x1800 | 디바이스 이름, appearance |
| Generic Attribute | 0x1801 | 서비스 변경 통지 |
| Battery Service | 0x180F | 배터리 잔량 |
| Device Information | 0x180A | 제조사, 모델, 펌웨어 |
| Heart Rate | 0x180D | 심박수 |
| Health Thermometer | 0x1809 | 체온계 |
| HID over GATT | 0x1812 | 키보드·마우스·게임패드 |
| Nordic UART (NUS) | 6E400001-... | 시리얼 over BLE (Nordic 정의, SIG 표준 아님) |

표준 UUID를 쓰면 nRF Connect 같은 범용 앱이 service 이름을 보여 주지만, 데이터 형식까지 해석해 주는지는 앱마다 다릅니다. 자체 service는 128-bit UUID를 정하고 데이터 형식을 문서로 남겨야 합니다.

## Pairing과 Bonding

연결 자체는 암호화 없이도 동작합니다. 암호화와 인증이 필요하면 pairing을 하고, 그 결과 key를 저장해 두면 bonding입니다. 어떤 pairing 방식이 쓰일지는 양쪽의 I/O capability가 정합니다(Bluetooth Core Specification Vol 3 Part H).

| 방식 | 필요한 I/O | MITM 보호 |
|------|---------|------|
| Just Works | 없음 | 없음 |
| Passkey Entry | 한쪽 디스플레이, 다른 쪽 키패드 | 있음 |
| Numeric Comparison | 양쪽 디스플레이 + yes/no 입력 (LE Secure Connections) | 있음 |
| Out-of-Band (OOB) | NFC 같은 별도 채널 | 별도 채널의 보호에 의존 |

NimBLE에서는 `ble_hs_cfg`의 `sm_io_cap`, `sm_bonding`, `sm_mitm`, `sm_sc`로 이를 설정합니다. `ble_hs.h` 주석에 따르면 `sm_mitm`은 Pairing Request/Response에 MITM 요구 flag를 세우는 비트입니다. `sm_sc`를 켜면 상대도 지원할 때 LE Secure Connections를 쓰고, 아니면 legacy pairing으로 내려갑니다. 화면도 버튼도 없는 장치(`BLE_HS_IO_NO_INPUT_OUTPUT`)에서 `sm_mitm = 1`을 세워도 MITM 보호는 생기지 않습니다. NimBLE의 `ble_sm_sc.c`(`ble_sm_sc_io_action()`)는 양쪽 I/O capability 표에서 방식을 고르는데, NoInputNoOutput이면 Just Works로 pairing을 끝내고 key는 unauthenticated로 남습니다.

bond 저장은 기본으로 꺼져 있습니다. v5.4.2의 `CONFIG_BT_NIMBLE_NVS_PERSIST`("Persist the BLE Bonding keys in NVS")는 기본값 n이고, `bleprph` 예제의 `sdkconfig`에도 `# CONFIG_BT_NIMBLE_NVS_PERSIST is not set`으로 남습니다. 이 상태에서는 재부팅하면 bond가 사라져 휴대폰이 다시 pairing해야 합니다. 켜면 NimBLE의 `ble_store_nvs.c`가 NVS namespace `"nimble_bond"`에 key를 씁니다. Ch 3의 NVS partition을 지우면 bond도 함께 지워진다는 뜻입니다.

## Wi-Fi와 BLE 동시 운영

C3는 Wi-Fi와 BLE가 안테나와 RF를 함께 씁니다. 데이터시트 Features 절은 "Internal co-existence mechanism between Wi-Fi and Bluetooth to share the same antenna"라고 적고, ESP-IDF v5.4.2에서는 `CONFIG_ESP_COEX_SW_COEXIST_ENABLE`("Software controls WiFi/Bluetooth coexistence")은 Wi-Fi와 BT를 함께 켜면 기본값이 y입니다. 어느 쪽이 얼마만큼 시간을 받는지는 workload에 따라 달라지고, 이 장에서는 측정하지 않았습니다.

## MTU와 notify payload

ATT의 Handle Value Notification은 opcode 1 byte와 attribute handle 2 byte 뒤에 값을 싣습니다. 그래서 한 notification의 최대 payload는 `ATT_MTU - 3`입니다([Bluetooth Core 5.4 ATT](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-54/out/en/host/attribute-protocol--att-.html)).

| ATT_MTU | notify payload 최대 |
|------|------|
| 23 (BLE 기본) | 20 byte |
| 247 | 244 byte |
| 256 (NimBLE 기본 preferred) | 253 byte |

v5.4.2의 `CONFIG_BT_NIMBLE_ATT_PREFERRED_MTU` 기본값은 256이고, `ble_att_set_preferred_mtu()`로 바꿀 수 있습니다. preferred는 희망값일 뿐이라 실제 값은 상대와의 MTU exchange로 정해지며, 연결 뒤 `ble_att_mtu(conn_handle)`로 읽습니다. 휴대폰이 MTU exchange를 하지 않으면 23이 그대로 남고, 이때 21 byte 이상을 notify하면 잘립니다.

## 정리

- GAP는 advertising·연결·pairing을, GATT는 service·characteristic을 다룹니다.
- C3의 BLE PHY는 1M, 2M, Coded(125/500 Kbps)이고, PHY 변경은 요청 뒤 `PHY_UPDATE_COMPLETE` event로 확인합니다.
- 기본 설정은 controller activity 6, NimBLE 연결 3, Extended Advertising 꺼짐, bond NVS 저장 꺼짐입니다.
- 같은 역할의 예제에서 NimBLE의 app `.bin`은 Bluedroid보다 약 156 KiB 작았습니다.
- `ble_gatts_notify_custom()`은 성공·실패와 무관하게 mbuf를 가져갑니다.
- notify payload는 `ATT_MTU - 3`이고, 실제 MTU는 연결 뒤 `ble_att_mtu()`로 읽습니다.

## 다음 편

[Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)에서는 무선 코드를 어떻게 빌드해서 칩에 올리는지를 다룹니다. idf.py CLI, CMake 컴포넌트, Kconfig, Component Manager까지 한 번에 풉니다.

## 관련 항목

- [Ch 7: WiFi 4 스택 — Station·SoftAP·Mesh](/blog/embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack) — 라디오 공유 상대
- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — sleep mode와 측정 조건
- [원문 — Apache NimBLE Tutorials](https://mynewt.apache.org/latest/tutorials/ble/ble.html)
- [원문 — ESP-IDF NimBLE Examples](https://github.com/espressif/esp-idf/tree/v5.4.2/examples/bluetooth/nimble)
- [원문 — Bluetooth Core 5.0 Specification](https://www.bluetooth.com/specifications/specs/core-specification-5-0/)
