---
title: "Ch 8: Advertising·Scanning — 발견의 비대칭"
date: 2026-05-08T08:00:00
description: "광고 채널 37/38/39, 비콘과 스캐너의 듀티 사이클. iBeacon·Eddystone 포맷."
series: "Getting Started with BLE"
seriesOrder: 8
tags: [ble, advertising, scanning, beacon, ibeacon]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"Advertising은 *발견의 송신 측*, Scanning은 *수신 측*. 두 동작은 비대칭입니다 — peripheral은 *주기적으로 잠깐 쏘고*, central은 *길게 듣습니다*. 세 개의 광고 채널(37=2402 MHz, 38=2426 MHz, 39=2480 MHz)이 WiFi 채널 1·6·11 사이에 끼어 있어, 혼잡한 2.4 GHz 환경에서도 발견이 동작합니다."** 광고 주기는 *발견 속도와 배터리*의 trade-off이고, iBeacon·Eddystone·AltBeacon은 ADV_NONCONN_IND의 *manufacturer data*를 다르게 채울 뿐 본질은 같습니다.

이번 장은 *연결 이전*의 모든 것을 다룹니다. 광고 채널의 주파수 배치, scanner의 듀티 사이클, advertising PDU의 5가지 타입, 31 byte와 255 byte payload의 차이, 마지막으로 *비콘 3대장*(iBeacon, Eddystone, AltBeacon)의 페이로드 포맷까지 모두 풉니다.

## 3개의 광고 채널 - 주파수 설계

BLE는 *2.4 GHz ISM 대역*(2402~2480 MHz)에 40개의 *2 MHz 폭 채널*을 둡니다. 그중 *37·38·39*가 광고 채널이고, *0~36*은 연결 후 데이터 채널입니다. 광고 채널은 *WiFi 채널 1·6·11 사이*에 끼어 있어 *고의적 회피*입니다.

| 채널 | 주파수 | WiFi 회피 위치 |
|------|--------|---------------|
| 37 | 2402 MHz | WiFi ch 1(2412) 아래 |
| 38 | 2426 MHz | WiFi ch 1(2412)과 ch 6(2437) 사이 |
| 39 | 2480 MHz | WiFi ch 11(2462) 위 |

```text
2.4 GHz ISM 대역 (2400~2500 MHz)

WiFi:    [────── ch1 ─────][────── ch6 ─────][────── ch11 ─────]
         2401              2437              2473

BLE adv:  ▲          ▲                                    ▲
         37 (2402)   38 (2426)                            39 (2480)

BLE data:  0  1  2  ...  10  11  12  ...  35  36  (2 MHz 간격, 37/38/39 제외)
```

광고 시 peripheral은 *세 채널을 순차적으로 송신*합니다 — 37 → 38 → 39 → (advDelay 0~10ms 랜덤) → 다시 37. 한 번에 모든 채널을 *동시에* 보낼 수는 없습니다(라디오 한 개). 그래서 scanner가 *어느 한 채널에 머무는 동안* peripheral의 광고를 잡으려면 *광고 주기 ≥ scan window* 관계가 성립해야 합니다.

```text
[광고와 스캔의 듀티 사이클 매칭]

Peripheral adv (interval=100ms):
  ch37 ▌──────────────────── ▌──────────────────── ▌
  ch38   ▌────────────────── ▌────────────────── ▌
  ch39     ▌──────────────── ▌──────────────── ▌
         │  │  │             │  │  │
         0ms                100ms                200ms

Central scan (window=30ms, interval=100ms):
  ch37 ████████              ████████
                  (다음에 ch38로 hop)

→ ch37 scan window 안에 peripheral의 ch37 광고가 들어와야 발견
```

*advDelay*는 0~10 ms 랜덤이라 *경합 회피*에 쓰입니다. 같은 시각에 여러 디바이스가 광고하면 충돌이 나는데, 매 광고마다 시작 시각이 약간씩 흔들리면 다음 슬롯에서 살아남을 확률이 생깁니다.

## Scan Mode - Passive vs Active

Scanner는 *수동(passive)*과 *능동(active)* 두 모드로 동작합니다.

| 모드 | 동작 | 전력 | 수집 데이터 |
|------|------|------|------------|
| Passive | 광고만 수신 | 낮음 | adv data만 (31/255 B) |
| Active | 광고 수신 후 Scan Request 송신 | 높음 | adv data + scan response (각 31/255 B) |

```c
// nRF Connect SDK - active scan 시작
static struct bt_le_scan_param scan_param = {
    .type     = BT_LE_SCAN_TYPE_ACTIVE,
    .options  = BT_LE_SCAN_OPT_FILTER_DUPLICATE,
    .interval = BT_GAP_SCAN_FAST_INTERVAL,  // 0x0060 = 60 ms
    .window   = BT_GAP_SCAN_FAST_WINDOW,    // 0x0030 = 30 ms
};

static void device_found(const bt_addr_le_t *addr, int8_t rssi,
                         uint8_t type, struct net_buf_simple *ad)
{
    char addr_str[BT_ADDR_LE_STR_LEN];
    bt_addr_le_to_str(addr, addr_str, sizeof(addr_str));
    printk("%s rssi=%d type=%u len=%u\n", addr_str, rssi, type, ad->len);
}

int main(void)
{
    bt_enable(NULL);
    bt_le_scan_start(&scan_param, device_found);
}
```

*Scan window / interval* 비율이 *듀티 사이클*입니다. 위 예처럼 30/60 = 50%면 scanner가 전체 시간의 절반을 듣는 데 씁니다. 빠른 발견에는 100% (window = interval), 저전력에는 ~10%가 보통입니다.

## Advertising PDU의 5가지 타입

광고에는 *5가지 PDU type*이 있습니다. 각각 *연결 가능 여부*와 *방향성*이 다릅니다.

| PDU | 연결 가능 | 스캔 응답 | 방향 | 용도 |
|-----|---------|----------|------|------|
| ADV_IND | yes | yes | undirected | 일반 연결 가능 디바이스 (가장 흔함) |
| ADV_DIRECT_IND | yes | no | directed (특정 central) | 빠른 재연결 |
| ADV_NONCONN_IND | no | no | undirected | 비콘 (iBeacon/Eddystone) |
| ADV_SCAN_IND | no | yes | undirected | 비콘인데 추가 데이터 필요 |
| ADV_EXT_IND (BLE 5) | varies | varies | varies | Extended Advertising 포인터 |

```text
[ADV_IND 페이로드 구조 - Legacy 31 byte]

┌─────────────┬─────────────────┬─────────────────────────────────┐
│ Header (2B) │ AdvA (6B)       │ AdvData (0~31B)                 │
└─────────────┴─────────────────┴─────────────────────────────────┘

AdvData는 (length, type, data) TLV 시퀀스:

┌─────┬──────┬──────────────────┐
│ Len │ Type │ Data             │
├─────┼──────┼──────────────────┤
│ 02  │ 01   │ 06               │ ← Flags: LE General Discoverable + BR/EDR not supported
│ 03  │ 03   │ 0F 18            │ ← Complete 16-bit Service UUIDs: Battery (0x180F)
│ 0A  │ 09   │ 4D 79 53 65 6E   │ ← Complete Local Name: "MySensor"
│     │      │ 73 6F 72 00 00   │
└─────┴──────┴──────────────────┘
```

AdvData의 *type 코드*는 *Bluetooth Assigned Numbers*에 정의되어 있습니다. 자주 쓰는 것은 다음과 같습니다.

| Type | 의미 | 길이 |
|------|------|------|
| 0x01 | Flags | 1 B |
| 0x02/0x03 | Incomplete/Complete List of 16-bit Service UUIDs | n × 2 B |
| 0x06/0x07 | Incomplete/Complete List of 128-bit Service UUIDs | n × 16 B |
| 0x08/0x09 | Shortened/Complete Local Name | 변동 |
| 0x0A | TX Power Level | 1 B |
| 0x16 | Service Data (16-bit UUID) | 2 B + n |
| 0xFF | Manufacturer Specific Data | 2 B (company ID) + n |

이름이 길면 *완성 이름은 scan response*에 두고 광고에는 *Shortened Local Name*만 넣는 패턴이 흔합니다. ADV_IND는 31 byte라 *manufacturer data와 service UUID와 이름*을 다 못 담는 경우가 많습니다.

## 31 byte → 255 byte (BLE 5 Extended Advertising)

BLE 4까지는 *Legacy Advertising*만 있어 *최대 31 byte payload*였습니다. BLE 5는 *Extended Advertising*을 추가해 *AUX_ADV_IND*에 *최대 255 byte*를 실을 수 있게 했고, *chained PDU*로 *최대 1650 byte*까지 늘립니다.

```text
[Extended Advertising 흐름]

Primary channel (37/38/39):
  ADV_EXT_IND ─┐
              "data is on AUX channel X at time T"

Secondary channel (0~36 중 하나):
                └──► AUX_ADV_IND (~ 254 B 데이터)
                            └──► AUX_CHAIN_IND (다음 fragment)
                                       └──► ... (최대 1650 B 누적)
```

```c
// nRF Connect SDK - Extended Advertising
static const struct bt_le_adv_param ext_adv_param = BT_LE_ADV_PARAM_INIT(
    BT_LE_ADV_OPT_EXT_ADV | BT_LE_ADV_OPT_USE_NAME,
    BT_GAP_ADV_FAST_INT_MIN_2,  // 100 ms
    BT_GAP_ADV_FAST_INT_MAX_2,  // 150 ms
    NULL
);

static struct bt_le_ext_adv *adv;

int main(void)
{
    bt_enable(NULL);
    bt_le_ext_adv_create(&ext_adv_param, NULL, &adv);
    bt_le_ext_adv_set_data(adv, ad, ARRAY_SIZE(ad), NULL, 0);
    bt_le_ext_adv_start(adv, BT_LE_EXT_ADV_START_DEFAULT);
}
```

Extended는 *central도 BLE 5 지원*해야 받습니다. iPhone 8 이상, Android 9 이상의 일부 칩에서 지원합니다. *비콘 양산*은 한동안 Legacy 31 B로 가는 것이 안전합니다.

## iBeacon 페이로드

Apple이 2013년 발표한 *iBeacon*은 *ADV_NONCONN_IND*의 manufacturer data를 정해진 포맷으로 채운 것입니다. 별도 스펙이 아니라 *관행*입니다.

iBeacon manufacturer data (총 25 byte):

| Offset | 크기 | 의미 | 값(예) |
|--------|------|------|--------|
| 0 | 1B | AD length | 1A |
| 1 | 1B | AD type (0xFF) | FF |
| 2 | 2B | Company ID (Apple) | 4C 00 |
| 4 | 1B | iBeacon type | 02 |
| 5 | 1B | iBeacon length | 15 (= 21 byte) |
| 6 | 16B | Proximity UUID | E2C56DB5-DFFB-48D2-B060-D0F5A71096E0 |
| 22 | 2B | Major | 00 01 |
| 24 | 2B | Minor | 00 02 |
| 26 | 1B | Measured TX power | C5 (= -59 dBm @ 1m) |

```c
// iBeacon payload 직접 구성
static const uint8_t ibeacon_data[] = {
    0x4C, 0x00,                   // Apple Company ID
    0x02, 0x15,                   // iBeacon type and length
    /* Proximity UUID */
    0xE2, 0xC5, 0x6D, 0xB5, 0xDF, 0xFB, 0x48, 0xD2,
    0xB0, 0x60, 0xD0, 0xF5, 0xA7, 0x10, 0x96, 0xE0,
    0x00, 0x01,                   // Major
    0x00, 0x02,                   // Minor
    0xC5,                         // Measured power -59 dBm
};

static const struct bt_data ad[] = {
    BT_DATA_BYTES(BT_DATA_FLAGS, BT_LE_AD_NO_BREDR),
    BT_DATA(BT_DATA_MANUFACTURER_DATA, ibeacon_data, sizeof(ibeacon_data)),
};

int main(void)
{
    bt_enable(NULL);
    bt_le_adv_start(BT_LE_ADV_NCONN, ad, ARRAY_SIZE(ad), NULL, 0);
}
```

iOS는 *Proximity UUID를 앱이 미리 알고 있어야* 백그라운드에서 wake합니다(CoreLocation `CLBeaconRegion`). 일반 BLE scan으로는 *iBeacon이 보이지 않는* 게 iOS의 정책입니다.

## Eddystone 페이로드 - URL 프레임

Google이 2015년 발표한 *Eddystone*은 *Service Data (type 0x16)*를 활용합니다. 2021년 GitHub repo가 archive 되어 *공식 deprecated*이지만, 인프라가 남아 있어 여전히 보입니다.

Eddystone-URL service data:

| Offset | 크기 | 의미 | 예 |
|--------|------|------|-----|
| 0 | 2B | Eddystone Service UUID | AA FE |
| 2 | 1B | Frame Type (URL) | 10 |
| 3 | 1B | TX Power @ 0m | EE (= -18 dBm) |
| 4 | 1B | URL scheme prefix | 00 (http://www.) |
| 5 | N B | Encoded URL | "example.com" |

URL scheme prefix 코드:

| 코드 | Prefix |
|------|--------|
| 0x00 | http://www. |
| 0x01 | https://www. |
| 0x02 | http:// |
| 0x03 | https:// |

URL 단축 코드:

| 코드 | 확장 |
|------|------|
| 0x00 | .com/ |
| 0x07 | .com |
| 0x01 | .org/ |
| ... | ... |

Eddystone은 *UID* (16 B 식별자), *URL* (단축 URL), *TLM* (텔레메트리: 전압·온도·운영 시간) 세 프레임 타입을 정의했습니다. *URL 프레임*은 사용자가 별도 앱 없이 *주변 URL 광고*를 받을 수 있다는 매력이 있었지만 Chrome의 *Physical Web*이 사라지면서 실용성을 잃었습니다.

## AltBeacon

Radius Networks의 *AltBeacon*은 *벤더 중립적 비콘*입니다. iBeacon의 Apple-only 정책에 대한 대안으로 만들어졌습니다.

AltBeacon manufacturer data:

| Offset | 크기 | 의미 |
|--------|------|------|
| 0 | 2B | Manufacturer ID (custom) |
| 2 | 2B | Beacon Code (0xBEAC) |
| 4 | 20B | Beacon ID (UUID 16B + Major 2B + Minor 2B 와 유사) |
| 24 | 1B | Reference RSSI |
| 25 | 1B | MFG reserved |

Android는 *AltBeacon SDK*가 iBeacon보다 더 잘 동작합니다(스캔 제한이 적음). 다만 *플랫폼별 점유율*은 iBeacon이 압도적입니다.

## 비콘 배터리 수명 계산

Coin cell *CR2032*는 *235 mAh*가 표준입니다. 비콘 전류는 *광고 주기와 페이로드 크기*로 결정됩니다.

| 광고 주기 | 평균 전류 (대략) | 예상 수명 (CR2032) |
|-----------|----------------|------------------|
| 100 ms | 0.5 mA | ~20 일 |
| 500 ms | 100 µA | ~100 일 |
| 1 s | 50 µA | ~7 개월 |
| 5 s | 10 µA | ~2.5 년 |
| 10 s | 5 µA | ~5 년 |

```text
평균 전류 ≈ (광고 1회 활성 시간 × 활성 전류) / (광고 주기)

예) nRF52, ADV_NONCONN_IND, 31B payload, 3 channels:
  활성 시간 ≈ 1.5 ms (TX + processing)
  활성 전류 ≈ 7 mA (TX 0 dBm)
  주기 = 1000 ms
  
  평균 ≈ (1.5 ms × 7 mA) / 1000 ms ≈ 10.5 µA
  
  CR2032 235 mAh / 10.5 µA ≈ 22,400 시간 ≈ 2.5 년
```

실측은 *temperature·payload·TX power*에 따라 ±30% 변동합니다. 양산 전에 *Power Profiler Kit II* 같은 µA 단위 측정기로 확인합니다.

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| 스캐너가 광고를 못 잡음 | scan window < adv interval | window 키우거나 active scan |
| adv data가 32 B 이상이라 안 시작 | Legacy 31B 한계 | Extended adv 사용 또는 분리 |
| iPhone이 iBeacon 인식 안 함 | CoreLocation region 등록 누락 | 앱이 monitorRegion 등록 |
| 배터리 한 달도 못 감 | 광고 주기 100 ms | 500 ms 이상으로 늘리기 |
| WiFi 켜면 발견 시간 5배 늘어남 | ch 37/38/39 ↔ WiFi 충돌 | ch 39만 광고 시도 |
| Scan response 안 옴 | ADV_NONCONN_IND 또는 passive | ADV_IND + active scan |
| Duplicates filter로 정보 손실 | interval보다 짧은 변화 무시 | filter 끄거나 polling 짧게 |

가장 흔한 함정은 *adv data 31 byte 초과*입니다. service UUID 128-bit 한 개(17 byte) + 이름 10 byte + flags 3 byte면 이미 30 byte입니다. *manufacturer data를 추가*하면 광고가 안 시작됩니다. 이름을 scan response로 옮기거나 Extended Advertising으로 전환합니다.

## 정리

- 광고 채널 *37·38·39*는 WiFi 채널 1·6·11 *사이에 끼어* 있어 2.4 GHz 혼잡 회피가 설계되어 있습니다.
- Peripheral은 세 채널을 *순차 송신*, Central은 *한 채널씩 hop*합니다. 두 듀티 사이클이 맞아야 발견됩니다.
- Adv PDU 5가지 중 *ADV_IND*가 일반 연결용, *ADV_NONCONN_IND*가 비콘용입니다.
- Legacy 31 byte는 *service UUID + 이름 + manufacturer data*를 모두 담기 어렵습니다. Extended Advertising으로 255 B 또는 chained 1650 B까지 늘립니다.
- *iBeacon*은 ADV_NONCONN_IND의 Apple manufacturer data, *Eddystone*은 service data, *AltBeacon*은 custom manufacturer data를 사용합니다.
- 비콘 *배터리 수명*은 광고 주기로 거의 결정됩니다. CR2032에서 1초 주기 ≈ 7개월, 10초 주기 ≈ 5년이 목표선입니다.
- 가장 흔한 실수는 *31 byte 초과*와 *scan window 부족*입니다. 양산 전에 *실제 스캐너 환경*으로 발견율을 확인합니다.

## 다음 편

[Ch 9: Connection 관리 — Interval·Latency·Supervision Timeout](/blog/embedded/wireless/getting-started-with-ble/chapter09-connection-management)에서는 *연결 이후*를 다룹니다. Connection interval과 slave latency, supervision timeout의 상호 제약, 그리고 *처리량 계산 공식*까지 한 번에 풉니다.

## 관련 항목

- [Ch 7: Pairing·Bonding — BLE 보안의 핵심](/blog/embedded/wireless/getting-started-with-ble/chapter07-pairing-bonding)
- [Ch 9: Connection 관리](/blog/embedded/wireless/getting-started-with-ble/chapter09-connection-management)
- [Ch 10: BLE 5의 진짜 변화](/blog/embedded/wireless/getting-started-with-ble/chapter10-ble5-features) — Extended Advertising 심층
- [ESP32-C3 Mastering Ch 8: BLE 5.0 — GAP·GATT](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt) — NimBLE 광고 API
- [원문 — Bluetooth Assigned Numbers](https://www.bluetooth.com/specifications/assigned-numbers/)
- [원문 — Apple iBeacon Spec](https://developer.apple.com/ibeacon/)
