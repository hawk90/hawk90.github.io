---
title: "Ch 8: BLE 5.0 — GAP·GATT·Coded PHY"
date: 2026-05-01T08:00:00
description: "BLE 5.0 — 2M PHY로 2배 처리량, Coded PHY로 4배 거리. GATT 서버 만들기."
series: "ESP32-C3 Mastering"
seriesOrder: 8
tags: [ble, bluetooth, gap, gatt, esp32-c3]
draft: false
---

## 한 줄 요약

> **"BLE 5.0의 두 가지 무기는 *2M PHY*와 *Coded PHY*입니다. 전자는 처리량 2배, 후자는 거리 4배. C3는 *둘 다* 지원합니다."** GATT는 *데이터 모델*이고 GAP는 *연결 절차*입니다. 두 개를 섞으면 헷갈리고, 분리해서 보면 단순합니다.

ESP32-C3는 *Bluetooth 5.0 LE*만 지원합니다. 클래식 BR/EDR은 없습니다. 단일 라디오가 *WiFi와 BLE를 시분할*하므로, 둘을 동시에 켜면 *각자의 throughput이 절반 이하*로 떨어집니다.

이번 장에서는 BLE의 두 축인 *GAP*과 *GATT*를 정리하고, NimBLE 스택으로 *Battery Service*를 구현해 봅니다. BLE 5.0이 새로 들고 온 *2M PHY·Coded PHY·Extended Advertising*도 다룹니다. 마지막에 *Pairing 모델*과 *NimBLE vs Bluedroid* 선택을 정리합니다.

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

ESP32-C3는 *네 역할 모두* 동시에 가능합니다(라디오 한 개를 시분할). 가장 흔한 패턴은 *Peripheral*입니다.

## BLE 5.0이 가져온 변화

BLE 4.2 → 5.0의 핵심 차이입니다.

| 기능 | BLE 4.2 | BLE 5.0 | C3 지원 |
|------|---------|---------|--------|
| 1M PHY | yes | yes | yes |
| 2M PHY (2 Mbps) | no | yes | yes |
| Coded PHY S=2 (500 kbps) | no | yes | yes |
| Coded PHY S=8 (125 kbps) | no | yes | yes |
| Legacy Advertising (31B) | yes | yes | yes |
| Extended Advertising (255B) | no | yes | yes |
| Periodic Advertising | no | yes | yes |
| LE Audio (Auracast) | no | 5.2 부터 | no (C3는 5.0) |

*Coded PHY*가 이 시리즈에서 가장 흥미로운 항목입니다. FEC(Forward Error Correction)를 *S=2* 또는 *S=8* 배 적용해 *링크 budget을 12 dB 늘립니다*. 실제 옥외 환경에서 *거리가 4배*로 늘어납니다. 대신 *데이터 비율은 1/2 또는 1/8*입니다.

```text
PHY          Data Rate   Range (옥외)   용도
─────────────────────────────────────────
1M           1 Mbps      ~30 m          기본
2M           2 Mbps      ~25 m          고대역
Coded S=2    500 kbps    ~60 m          중간
Coded S=8    125 kbps    ~120 m         long range
```

```c
// NimBLE: 연결 후 PHY 변경
struct ble_gap_set_phy_args args = {
    .tx_phys = BLE_GAP_LE_PHY_CODED_MASK,
    .rx_phys = BLE_GAP_LE_PHY_CODED_MASK,
    .phy_opts = BLE_HCI_LE_PHY_CODED_S8_PREF,
};
ble_gap_set_prefered_le_phy(conn_handle, args.tx_phys, args.rx_phys, args.phy_opts);
```

Central쪽도 *Coded PHY를 지원*해야 합니다. iPhone은 12 이후, Android는 8.0 이후 일부 칩에서 지원합니다. *지원하지 않는 폰이 많은 시장*에는 사용 못 합니다.

## NimBLE vs Bluedroid

ESP-IDF는 *두 BLE 스택*을 제공합니다.

| 항목 | NimBLE | Bluedroid |
|------|--------|----------|
| 출신 | Apache Mynewt | Android AOSP |
| RAM 사용 | ~25 KB | ~70 KB |
| Flash 사용 | ~150 KB | ~430 KB |
| 클래식 BR/EDR | 미지원 | 지원 (C3는 어차피 없음) |
| API 스타일 | 콜백 위주, 깔끔 | 이벤트+상태머신, 복잡 |
| 문서 | ESP-IDF + Mynewt | Espressif 자체 wrap |
| 권장 | C3·S3·H2 (BLE-only) | 원본 ESP32 (BT/BLE dual) |

*ESP32-C3에서는 NimBLE이 기본 권장*입니다. RAM 풋프린트 차이가 50 KB에 가까운데, C3는 SRAM이 400 KB뿐이라 *체감 차이가 큽니다*. 새 프로젝트라면 NimBLE을 고르는 것이 거의 항상 옳습니다.

## Advertising — 자기를 알리기

Peripheral은 advertising으로 *자기 존재를 알립니다*. 주기와 형식이 핵심입니다.

```c
// NimBLE advertising 시작
static int gap_event_handler(struct ble_gap_event *event, void *arg)
{
    switch (event->type) {
    case BLE_GAP_EVENT_CONNECT:
        if (event->connect.status == 0) {
            ESP_LOGI("ble", "connected handle=%d", event->connect.conn_handle);
        }
        break;
    case BLE_GAP_EVENT_DISCONNECT:
        ESP_LOGI("ble", "disconnected reason=%d", event->disconnect.reason);
        ble_advertise_start();
        break;
    case BLE_GAP_EVENT_SUBSCRIBE:
        ESP_LOGI("ble", "notify enabled=%d", event->subscribe.cur_notify);
        break;
    }
    return 0;
}

void ble_advertise_start(void)
{
    struct ble_hs_adv_fields fields = {0};
    fields.flags = BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP;
    fields.tx_pwr_lvl_is_present = 1;
    fields.tx_pwr_lvl = BLE_HS_ADV_TX_PWR_LVL_AUTO;
    fields.name = (uint8_t*)"ESP32-C3-Sensor";
    fields.name_len = strlen("ESP32-C3-Sensor");
    fields.name_is_complete = 1;
    ble_gap_adv_set_fields(&fields);

    struct ble_gap_adv_params adv_params = {
        .conn_mode = BLE_GAP_CONN_MODE_UND,
        .disc_mode = BLE_GAP_DISC_MODE_GEN,
        .itvl_min = BLE_GAP_ADV_FAST_INTERVAL1_MIN, // 30 ms
        .itvl_max = BLE_GAP_ADV_FAST_INTERVAL1_MAX, // 60 ms
    };
    ble_gap_adv_start(BLE_OWN_ADDR_PUBLIC, NULL, BLE_HS_FOREVER,
                      &adv_params, gap_event_handler, NULL);
}
```

광고 *주기*가 *전류와 발견 시간*의 trade-off입니다.

| 주기 | 평균 전류 | 발견 시간 | 용도 |
|------|---------|---------|------|
| 30~60 ms | ~5 mA | < 1 s | 빠른 페어링이 필요한 첫 부팅 |
| 100~200 ms | ~2 mA | 1~2 s | 일반 IoT |
| 500 ms~1 s | < 1 mA | 5~10 s | 절전 우선 비콘 |
| 2~10 s | < 200 µA | 매우 느림 | 장기 비콘 (배터리 1년+) |

Legacy advertising은 *31 byte*까지만 실립니다. *Extended Advertising*은 *255 byte*까지 가능해, 디바이스 이름이 길거나 *manufacturer data*가 풍부하면 유용합니다. 단, Central이 Extended를 지원해야 받습니다.

## GATT 서비스 — 데이터 모델

GATT는 *Service → Characteristic → Descriptor* 3계층입니다.

```text
Battery Service (0x180F)
├── Battery Level Characteristic (0x2A19)
│   ├── value (uint8, 0~100)
│   ├── property: READ | NOTIFY
│   └── descriptor: CCCD (0x2902) — notify 활성화 비트
└── (다른 characteristic은 옵션)
```

표준 service UUID는 *16-bit 짧은 형식*입니다(예: `0x180F`). 자체 정의 service는 *128-bit UUID*가 필수입니다(`12345678-1234-1234-1234-1234567890AB` 같은 형식).

```c
static uint8_t battery_level = 87;

static int battery_level_access(uint16_t conn_handle, uint16_t attr_handle,
                                 struct ble_gatt_access_ctxt *ctxt, void *arg)
{
    if (ctxt->op == BLE_GATT_ACCESS_OP_READ_CHR) {
        os_mbuf_append(ctxt->om, &battery_level, sizeof(battery_level));
        return 0;
    }
    return BLE_ATT_ERR_UNLIKELY;
}

static const struct ble_gatt_svc_def gatt_svcs[] = {
    {
        .type = BLE_GATT_SVC_TYPE_PRIMARY,
        .uuid = BLE_UUID16_DECLARE(0x180F),  // Battery Service
        .characteristics = (struct ble_gatt_chr_def[]) {
            {
                .uuid = BLE_UUID16_DECLARE(0x2A19),
                .access_cb = battery_level_access,
                .flags = BLE_GATT_CHR_F_READ | BLE_GATT_CHR_F_NOTIFY,
            },
            { 0 } // terminator
        },
    },
    { 0 } // terminator
};

void gatt_init(void)
{
    ble_svc_gap_init();
    ble_svc_gatt_init();
    ble_gatts_count_cfg(gatt_svcs);
    ble_gatts_add_svcs(gatt_svcs);
}
```

`NOTIFY`는 *연결된 클라이언트가 CCCD를 켰을 때*만 발송됩니다. 끄면 무시됩니다.

```c
// 1초마다 battery level notify
void battery_notify_task(void *param)
{
    while (1) {
        if (current_conn_handle != BLE_HS_CONN_HANDLE_NONE) {
            struct os_mbuf *om = ble_hs_mbuf_from_flat(&battery_level, 1);
            ble_gatts_notify_custom(current_conn_handle,
                                     battery_level_attr_handle, om);
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
```

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

표준을 *그대로* 따르면 스마트폰의 *표준 앱*이 바로 해석합니다. 자체 service는 *전용 앱*이 필요합니다.

## Pairing과 Bonding

연결 자체는 *암호화 없이*도 동작합니다. 보안이 필요하면 *pairing*을 합니다. Pairing 결과를 영구 저장하면 *bonding*입니다.

| 모드 | I/O 요구 | 보안 | 비고 |
|------|---------|------|------|
| Just Works | 없음 | MITM 취약 | 가장 흔함 |
| Passkey Entry | 디스플레이 또는 키패드 | MITM 방어 | 6자리 숫자 |
| Numeric Comparison | 양쪽 디스플레이 | MITM 방어 | LE Secure Connections |
| Out-of-Band (OOB) | NFC 또는 카메라 | 강력 | 별도 채널로 키 교환 |

ESP32-C3는 *모든 모드*를 지원합니다. 펌웨어에서 *I/O capability*를 선언합니다.

```c
ble_hs_cfg.sm_io_cap = BLE_SM_IO_CAP_NO_IO;          // Just Works
// ble_hs_cfg.sm_io_cap = BLE_SM_IO_CAP_DISP_ONLY;   // Passkey display
// ble_hs_cfg.sm_io_cap = BLE_SM_IO_CAP_KEYBOARD_ONLY;
ble_hs_cfg.sm_bonding = 1;       // bond 저장
ble_hs_cfg.sm_mitm = 1;          // MITM 방어 요구
ble_hs_cfg.sm_sc = 1;            // LE Secure Connections (ECDH P-256)
```

Bond 정보는 NVS의 `ble_hs_store` 영역에 저장됩니다. 펌웨어 업데이트로 *NVS partition table이 바뀌면 모두 날아갑니다*. 펌웨어 OTA 절차에 *bond 보존* 케어가 필요합니다.

## WiFi와 BLE 동시 운영

C3는 라디오가 *하나*입니다. WiFi 패킷과 BLE 패킷이 *시분할*됩니다.

```text
시간 ──────────────────────────────────────►
WiFi:  ███   ██     ████    ██   ███
BLE:      ██    ███     ██     ██    ██
       양쪽 모두 약 50%씩 시간 점유
```

```c
// menuconfig: Component config → Bluetooth → Bluetooth controller
// CONFIG_BT_CTRL_COEX_PHY_CODED_TX_RX_TIME_LIMIT (BLE Coded PHY 우선)
// Component config → Wi-Fi → CONFIG_ESP_COEX_SW_COEXIST_ENABLE
```

기본 설정으로도 동작은 합니다. 다만 *Coded PHY S=8을 쓰는 BLE long-range*와 *WiFi 고대역*을 같이 켜면 *둘 다 처참하게* 떨어집니다. 운영 단계에서는 *주로 BLE 쓸 때 WiFi disconnect*, *WiFi 쓸 때 BLE advertise 멈춤* 같은 *명시적 시분할*이 안전합니다.

## 자주 하는 실수와 troubleshooting

```text
증상                                원인                              해결
────────────────────────────────────────────────────────────────────────────
폰이 디바이스를 발견 못 함            advertising 안 시작              ble_gap_adv_start 호출 확인
연결 직후 끊김                       MTU 협상 실패 또는 power 부족    MTU = 247, decoupling cap 확인
notify가 폰에 도착 안 함             CCCD 안 켬                       클라이언트에서 notify 활성화
characteristic value 길이 초과       MTU 23 (default)에서 20 byte 한계 ble_att_set_preferred_mtu(247)
페어링 후 reconnect에 다시 페어링    bond 저장 안 됨                  sm_bonding=1, NVS partition 확인
Coded PHY 안 잡힘                   Central이 미지원                  Central 측 chipset 확인
WiFi+BLE 동시에 짙은 끊김             SW coexistence 미활성             CONFIG_ESP_COEX_SW_COEXIST_ENABLE
```

가장 흔한 함정은 *MTU*입니다. BLE 기본 MTU는 23 byte이고, 헤더 빼면 *20 byte의 payload*만 됩니다. `ble_att_set_preferred_mtu(247)`로 키워야 *224 byte의 payload*가 한 packet에 실립니다. 클라이언트도 동의해야 협상이 성공합니다.

## 정리

- BLE는 *GAP(연결 절차)*과 *GATT(데이터 모델)*의 두 축으로 분리해서 봐야 명확합니다.
- BLE 5.0의 무기는 *2M PHY(처리량 2배)*와 *Coded PHY(거리 4배)*입니다. C3는 둘 다 지원합니다.
- C3에서는 *NimBLE 스택*이 사실상 표준입니다. RAM 25 KB, Flash 150 KB로 Bluedroid의 1/3 수준입니다.
- Advertising 주기는 *전류와 발견 속도의 trade-off*입니다. 30 ms면 빠르지만 5 mA, 1 s면 느려도 1 mA 이하입니다.
- 표준 service UUID는 *16-bit*, 자체 service는 *128-bit*입니다. 표준을 쓰면 표준 앱이 바로 해석합니다.
- Pairing 모드는 *Just Works·Passkey·Numeric Comparison·OOB*입니다. 양산 IoT는 *Numeric Comparison + bonding*이 안전합니다.
- WiFi와 BLE는 *라디오 하나*를 시분할합니다. 둘 다 고대역을 동시에 쓰면 양쪽 처리량이 처참합니다.
- MTU는 *기본 23 byte*입니다. 247로 올려야 한 packet에 224 byte payload가 들어갑니다.

## 다음 편

[Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)에서는 무선 코드를 *어떻게 빌드해서 칩에 올리는지*를 다룹니다. idf.py CLI, CMake 컴포넌트, Kconfig, Component Manager까지 한 번에 풉니다.

## 관련 항목

- [Ch 7: WiFi 4 스택 — Station·SoftAP·Mesh](/blog/embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack) — 라디오 공유 상대
- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — BLE advertise 절전 패턴
- [원문 — Apache NimBLE Tutorials](https://mynewt.apache.org/latest/tutorials/ble/ble.html)
- [원문 — ESP-IDF NimBLE Examples](https://github.com/espressif/esp-idf/tree/master/examples/bluetooth/nimble)
- [원문 — Bluetooth Core 5.0 Specification](https://www.bluetooth.com/specifications/specs/core-specification-5-0/)
