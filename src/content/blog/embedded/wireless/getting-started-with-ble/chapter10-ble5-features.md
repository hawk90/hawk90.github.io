---
title: "Ch 10: BLE 5의 진짜 변화 — 2M·Coded·Extended Adv"
date: 2026-05-08T10:00:00
description: "2× 속도, 4× 거리, 8× 광고 데이터. 그리고 LE Audio (5.2)와 Direction Finding (5.1)."
series: "Getting Started with BLE"
seriesOrder: 10
tags: [ble, ble5, 2m-phy, coded-phy, le-audio]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"BLE 5의 슬로건은 *2× 속도, 4× 거리, 8× 광고 데이터*입니다. 2M PHY가 처리량을, Coded PHY가 거리를, Extended Advertising이 페이로드를 늘렸습니다. 그리고 BLE 5.1의 *Direction Finding*과 BLE 5.2의 *LE Audio + LC3*는 이전과는 *질적으로 다른* 응용을 열었습니다."** 단, 양쪽 모두 BLE 5 지원이 필수입니다.

이번 장은 BLE 5.0~5.4에 추가된 주요 기능을 *왜 만들었는가*와 *어디에 쓰는가* 중심으로 정리합니다. PHY 변경 절차, Extended Advertising의 chained PDU, Periodic Advertising의 sync 메커니즘, LE Audio의 CIS/BIS와 LC3 codec, 마지막으로 Direction Finding의 CTE까지 한 번에 다룹니다.

## BLE 5 버전별 핵심

| 버전 | 발표 | 주요 추가 |
|------|------|----------|
| 5.0 | 2016 | 2M PHY, Coded PHY, Extended Advertising, Periodic Advertising |
| 5.1 | 2019 | Direction Finding (AoA/AoD), GATT caching, Randomized advertising channel order |
| 5.2 | 2019 | LE Audio (Isochronous Channels, LC3 codec), EATT |
| 5.3 | 2021 | Periodic Advertising Enhancement, Channel Classification Enhancement |
| 5.4 | 2023 | Encrypted Advertising Data, PAwR (Periodic Advertising with Response) |

가장 큰 *기능적 분기*는 5.0과 5.2입니다. 5.0이 *PHY와 광고*를 늘렸고, 5.2가 *LE Audio*로 새로운 응용 영역을 열었습니다.

## 2M PHY - 처리량 2배

기본 *1M PHY*는 1 Msymbol/s, 1 bit/symbol입니다. *2M PHY*는 2 Msymbol/s로 같은 modulation이지만 *심볼 속도가 2배*입니다.

| PHY | 심볼 속도 | 데이터율 | 송신 시간 (251 B 기준) | 사정 거리 (옥외) |
|-----|----------|---------|---------------------|----------------|
| 1M | 1 Msym/s | 1 Mbps | ~2 ms | ~30 m |
| 2M | 2 Msym/s | 2 Mbps | ~1 ms | ~25 m |
| Coded S=2 | 1 Msym/s, ½ FEC | 500 kbps | ~4 ms | ~60 m |
| Coded S=8 | 1 Msym/s, ⅛ FEC | 125 kbps | ~16 ms | ~120 m |

2M PHY는 *송신 시간이 짧아져 전력도 절감*됩니다. 같은 데이터를 보내는 데 라디오가 켜져 있는 시간이 절반이라는 뜻입니다.

```c
// nRF Connect SDK - 2M PHY 전환
static void connected(struct bt_conn *conn, uint8_t err)
{
    if (err) return;

    const struct bt_conn_le_phy_param phy = {
        .options = BT_CONN_LE_PHY_OPT_NONE,
        .pref_tx_phy = BT_GAP_LE_PHY_2M,
        .pref_rx_phy = BT_GAP_LE_PHY_2M,
    };
    bt_conn_le_phy_update(conn, &phy);
}

static void le_phy_updated(struct bt_conn *conn,
                           struct bt_conn_le_phy_info *info)
{
    printk("PHY updated: tx=%u rx=%u\n", info->tx_phy, info->rx_phy);
    // tx=2 (BT_GAP_LE_PHY_2M), rx=2 means success
}
```

광고는 *항상 1M PHY*(Legacy) 또는 *Coded PHY*(Extended)입니다. *2M PHY는 광고에 못 씁니다*. 연결 후에만 PHY Update procedure로 전환합니다.

## Coded PHY - 거리 4배

*Coded PHY*는 *Forward Error Correction*을 적용해 *링크 budget을 12 dB 늘립니다*. 12 dB는 자유공간에서 *4배 거리*에 해당합니다(이론). 두 가지 coding rate가 있습니다.

| Coding | FEC ratio | 데이터율 | 링크 budget gain |
|--------|----------|---------|-----------------|
| S=2 | 1/2 (각 bit 2 symbol) | 500 kbps | +6 dB ≈ 2× 거리 |
| S=8 | 1/8 (각 bit 8 symbol) | 125 kbps | +12 dB ≈ 4× 거리 |

```text
[Coded PHY 패킷 구조]

1M / 2M:
┌──────┬──────┬─────────────┬───┐
│ Pre  │ AA   │ PDU + MIC   │ CRC│
│ 1/2B │ 4B   │ 2~258B      │ 3B │
└──────┴──────┴─────────────┴───┘

Coded:
┌──────┬─────────────┬──────┬─────────────┬───┬──┐
│ Pre  │ AA + CI + TERM1 │ PDU + CRC + TERM2     │
│ 10B  │ S=8 coded       │ S=2 또는 S=8 coded     │
└──────┴─────────────────┴────────────────────────┘

CI=Coding Indicator: S=8 (S2=0) or S=2 (S2=1)
```

```c
// nRF Connect SDK - Coded PHY S=8
const struct bt_conn_le_phy_param phy = {
    .options = BT_CONN_LE_PHY_OPT_CODED_S8,  // S=8 우선
    .pref_tx_phy = BT_GAP_LE_PHY_CODED,
    .pref_rx_phy = BT_GAP_LE_PHY_CODED,
};
bt_conn_le_phy_update(conn, &phy);
```

Coded PHY는 *광고에도 적용 가능*합니다(*Extended Advertising만*). long-range tracker, 농업 IoT, 산업 모니터링에서 핵심 기능입니다. 단, 폰 측 지원이 *제한적*입니다. iPhone 12 이후, Android는 *chip 의존*입니다.

## Extended Advertising - 31 B → 1650 B

Legacy Advertising은 *31 byte payload* 한계로 service UUID 128-bit + 이름 + manufacturer data를 모두 못 담는 경우가 많았습니다. Extended Advertising은 *secondary channel*에 *최대 254 B*를 싣고, *chained PDU*로 *최대 1650 B*까지 누적합니다.

```text
[Extended Advertising 흐름]

Primary advertising channel (37/38/39):
  ┌──────────────────┐
  │ ADV_EXT_IND      │
  │ (헤더 + 포인터)   │ ──┐
  └──────────────────┘   │ "data is on channel X at time T"
                          │
Secondary advertising channel (0~36):
                          ▼
  ┌──────────────────┐
  │ AUX_ADV_IND      │
  │ (~254 B data)    │ ──┐
  └──────────────────┘   │ "more data..."
                          │
                          ▼
  ┌──────────────────┐
  │ AUX_CHAIN_IND    │
  │ (~254 B data)    │ ──┐
  └──────────────────┘   │
                          ▼
  ... (최대 6개까지 chain, 총 ~1650 B)
```

```c
// nRF Connect SDK - Extended Advertising
static struct bt_le_ext_adv *adv;
static const struct bt_le_adv_param param = BT_LE_ADV_PARAM_INIT(
    BT_LE_ADV_OPT_EXT_ADV | BT_LE_ADV_OPT_CODED,  // Coded PHY로 장거리
    BT_GAP_ADV_FAST_INT_MIN_2,
    BT_GAP_ADV_FAST_INT_MAX_2,
    NULL
);

static const struct bt_data ad[] = {
    /* 큰 manufacturer data 250 B 정도 */
    BT_DATA(BT_DATA_MANUFACTURER_DATA, big_payload, sizeof(big_payload)),
};

int main(void)
{
    bt_enable(NULL);
    bt_le_ext_adv_create(&param, NULL, &adv);
    bt_le_ext_adv_set_data(adv, ad, ARRAY_SIZE(ad), NULL, 0);
    bt_le_ext_adv_start(adv, BT_LE_EXT_ADV_START_DEFAULT);
}
```

## Periodic Advertising - 동기화된 비콘

Extended Advertising 위에 *Periodic Advertising*이 올라갑니다. 비콘이 *정확한 주기로 데이터를 송출*하면 scanner가 *한 번 sync*한 후 그 슬롯에만 깨어나서 받을 수 있습니다. *극단적 저전력 비콘 수신*에 쓰입니다.

```text
[Periodic Advertising sync 절차]

1. Scanner가 ADV_EXT_IND를 발견하고 SyncInfo를 봄
   ┌──────────────┐
   │ SyncInfo:    │
   │  - Interval  │  (예: 100 ms)
   │  - Offset    │  (다음 periodic 발생까지 µs)
   │  - PHY       │
   │  - SID       │  (advertising Set ID)
   └──────────────┘

2. Scanner가 LE Periodic Advertising Create Sync 요청

3. 이후 scanner는 매 100ms마다 짧게 깨어나서 periodic data 수신
   광고 디바이스는 모름 (one-way broadcast)
```

```c
// nRF Connect SDK - Periodic Advertising sync
static void scan_recv(const struct bt_le_scan_recv_info *info,
                       struct net_buf_simple *buf)
{
    if (info->periodic_interval) {
        /* sync 가능한 periodic advertiser 발견 */
        struct bt_le_per_adv_sync_param sync_param = {
            .options = 0,
            .sid = info->sid,
            .skip = 0,
            .timeout = 1000,  // 10 s
        };
        bt_addr_le_copy(&sync_param.addr, info->addr);
        bt_le_per_adv_sync_create(&sync_param, &per_sync);
    }
}
```

응용은 *대규모 센서 모니터링*입니다. 수백 개 센서가 *주기 광고*만 하고, 게이트웨이가 *각각에 sync*해서 데이터를 수집합니다. 연결 없이 *broadcast로 양산 가능*합니다.

## LE Audio - CIS/BIS + LC3

BLE 5.2의 *LE Audio*는 BLE를 *Bluetooth Classic A2DP의 대체*로 끌어 올렸습니다. 두 가지 채널 타입이 추가되었습니다.

| 타입 | 약자 | 용도 | 비고 |
|------|------|------|------|
| Connected Isochronous Stream | CIS | 양방향 단일 연결 audio | 헤드셋, 보청기 |
| Broadcast Isochronous Stream | BIS | one-to-many broadcast audio | 공항, 강당 (Auracast) |

```text
[CIS - 두 ear bud에 동시 송신]

Phone ──┬── CIS_1 ────► Left ear bud
        └── CIS_2 ────► Right ear bud
        (같은 CIG = CIS Group, 동기화 보장)

[BIS - Auracast broadcast]

Stadium ───┬───► All paired headphones
broadcast  │     (sub-second sync)
TX         ├───► Hearing aids
           └───► Tour guide receivers
```

*LC3 (Low Complexity Communications Codec)*가 새 표준 codec입니다. SBC와 AAC를 대체하며 *훨씬 낮은 비트레이트에서 더 좋은 음질*을 냅니다.

| Codec | 최저 비트레이트 | 음질 (16 kbps에서) | latency |
|-------|---------------|------------------|---------|
| SBC (BR/EDR) | 192 kbps | poor | ~150 ms |
| AAC (BR/EDR) | 64 kbps | 보통 | ~150 ms |
| LC3 (LE Audio) | 16 kbps | 좋음 | ~10-20 ms |

LC3는 *10 ms frame size*를 기본으로 합니다. 16 kbps에서 32 kbps까지가 *전화 통화 수준*, 48 kbps 이상이 *고품질 음악*입니다. *Auracast broadcast*는 LE Audio + BIS + LC3의 조합으로, 2024년부터 공항·박물관·강당에 도입이 시작되었습니다.

```c
// nRF Connect SDK - LE Audio (간략)
#include <zephyr/bluetooth/audio/audio.h>
#include <zephyr/bluetooth/audio/bap.h>

static struct bt_bap_lc3_preset preset_16_2_1 = BT_BAP_LC3_UNICAST_PRESET_16_2_1(
    BT_AUDIO_LOCATION_FRONT_LEFT,
    BT_AUDIO_CONTEXT_TYPE_MEDIA
);
// 16 kHz, 2 (10ms frames per SDU), config 1
```

LE Audio는 *모바일 OS·SoC·codec*가 모두 받쳐야 동작합니다. 2025년 기준 *Pixel 8, iPhone 15 이후*가 양산 라인업입니다. 양산 IoT보다 *consumer audio*에 먼저 도입됩니다.

## Direction Finding - AoA/AoD

BLE 5.1의 *Direction Finding*은 *위치 추적*을 새 차원으로 끌어 올렸습니다. RSSI 기반은 ±몇 m 정확도였는데, *AoA(Angle of Arrival)*와 *AoD(Angle of Departure)*는 *~10 cm* 수준이 가능합니다.

| 모드 | 누가 안테나 array를 갖는가 | 응용 |
|------|---------------------------|------|
| AoA | 수신측 (예: 게이트웨이) | tag 위치 추적 (locator beacons) |
| AoD | 송신측 (예: 비콘) | smartphone 위치 표시 (실내 navigation) |

```text
[AoA - 4개 안테나 array가 도착 각도 측정]

Transmitter (BLE tag, CTE 송신):
                     │
                     │
                     ▼  (CTE = Constant Tone Extension)
                     
       ┌─Ant0─Ant1─Ant2─Ant3─┐
       │  4-element array     │
       │                      │  IQ 샘플의 phase difference
       │  CPU: AoA 계산       │  → 도착 각도 θ
       └──────────────────────┘
```

*CTE(Constant Tone Extension)*은 packet 끝에 *modulation 없는 constant 신호*를 더 보내는 것입니다. 수신측이 안테나를 *switching*하며 *IQ phase difference*를 측정합니다.

```c
// nRF Connect SDK - AoA enable (sender side)
static const struct bt_df_adv_cte_tx_param cte_param = {
    .cte_len = 20,                            // 20 × 8 µs = 160 µs
    .cte_count = 3,                           // packet 당 3 CTE
    .cte_type = BT_DF_CTE_TYPE_AOA,
    .num_ant_ids = 0,                         // AoA는 수신측이 array를 가짐
    .ant_ids = NULL,
};

bt_df_set_adv_cte_tx_param(adv, &cte_param);
bt_df_adv_cte_tx_enable(adv);
```

*응용*은 자산 추적, 실내 navigation, 사람 흐름 분석입니다. *RTLS(Real-Time Location System)*가 BLE로 가능해진 것이 BLE 5.1의 가장 큰 영향입니다.

## Encrypted Advertising Data (BLE 5.4)

BLE 5.4의 *EAD*는 광고 페이로드 자체를 *암호화*합니다. 비콘이 *민감한 정보*(예: 일련번호, 위치)를 광고하고 싶을 때, 키를 공유한 디바이스만 해독합니다.

```text
[EAD 구조]

Plain advertising:
  ┌─────────────────────────────┐
  │ Anyone can read everything   │
  └─────────────────────────────┘

Encrypted advertising (BLE 5.4):
  ┌─────────────┬─────────────────┐
  │ Public info │ Encrypted blob   │
  │ (flag, UUID)│ (AES-CCM)        │
  └─────────────┴─────────────────┘
                  ↑
                only key holders decrypt
```

응용은 *Find My Network* 같은 시스템입니다. 분실 디바이스가 광고하는 데이터가 *암호화*되어 있어 *주인만 해독*하고, 다른 사람들의 폰은 *암호문을 그냥 forward*만 합니다.

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| 2M PHY 협상 실패 | central 미지원 또는 Coded PHY 우선 | PHY update timing 조정 |
| Coded PHY 거리가 4배 안 나옴 | 장애물·반사·multipath | 옥외 LOS에서만 4× |
| Extended Adv가 일반 폰에 안 잡힘 | Legacy-only 스캐너 | Legacy + Extended 동시 광고 |
| Periodic Adv sync 실패 | scanner 옵션 잘못 | BT_LE_SCAN_OPT_FILTER_DUPLICATE 끄기 |
| LE Audio 재생이 끊김 | CIS interval과 codec frame 미스매치 | preset (16_2, 24_2, 48_4) 검증 |
| Direction Finding IQ 데이터 노이즈 | 안테나 칼리브레이션 부족 | 제조사 calibration 절차 적용 |
| EAD 디코딩 실패 | key 분배 mismatch | DK key 동기화 확인 |

가장 흔한 *실용 함정*은 *Extended Advertising과 Legacy Advertising의 동시 운영*입니다. BLE 4 스캐너만 있는 환경에서는 *Legacy 광고가 필수*입니다. 새 BLE 5 칩만 받는 응용이 아니면, *둘 다 광고*하는 *advertising set 두 개*를 권장합니다.

## 정리

- BLE 5.0의 핵심은 *2M PHY(처리량 2×), Coded PHY(거리 4×), Extended Adv(데이터 8×)*의 세 축입니다.
- *2M PHY*는 연결 후에만 전환 가능. 광고에는 못 씁니다.
- *Coded PHY*는 S=2(2×), S=8(4×) 두 단계. 옥외 LOS에서만 이론 거리 달성합니다.
- *Extended Advertising*은 secondary channel과 chained PDU로 *31 B → 최대 1650 B*까지 가능합니다.
- *Periodic Advertising*은 sync 후 *극단적 저전력 broadcast 수신*을 가능하게 합니다.
- BLE 5.2의 *LE Audio + LC3*는 *Auracast broadcast audio*를 열었습니다. 16 kbps에서 SBC 192 kbps 수준 음질입니다.
- BLE 5.1의 *Direction Finding* (AoA/AoD)는 RSSI 기반 위치 추정을 ~10 cm 정밀도로 끌어 올렸습니다.
- 모든 새 기능은 *양쪽 모두 BLE 5*가 필수. Legacy 폰을 위한 *호환 광고*를 병행하는 것이 안전합니다.

## 다음 편

[Ch 11: nRF Connect SDK 실습](/blog/embedded/wireless/getting-started-with-ble/chapter11-nrf-connect-sdk)에서는 *실제 칩과 SDK*로 본 시리즈의 코드를 동작시킵니다. Nordic nRF52/nRF53 + Zephyr 기반 NCS의 구조, sample 빌드, Power Profiler Kit II 측정, ESP32와 STM32WB 비교까지 한 번에 풉니다.

## 관련 항목

- [Ch 9: Connection 관리](/blog/embedded/wireless/getting-started-with-ble/chapter09-connection-management) — PHY와 처리량
- [Ch 11: nRF Connect SDK 실습](/blog/embedded/wireless/getting-started-with-ble/chapter11-nrf-connect-sdk)
- [Ch 12: BLE 디버깅 — Wireshark, BLE Sniffer](/blog/embedded/wireless/getting-started-with-ble/chapter12-debugging)
- [ESP32-C3 Mastering Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [원문 — Bluetooth Core 5.4 Specification](https://www.bluetooth.com/specifications/specs/core-specification-5-4/)
- [원문 — LE Audio Auracast](https://www.bluetooth.com/auracast/)
