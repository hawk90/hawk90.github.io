---
title: "Ch 9: Connection 관리 — Interval·Latency·Supervision Timeout"
date: 2026-05-08T09:00:00
description: "3가지 connection parameter가 처리량과 배터리를 결정한다."
series: "Getting Started with BLE"
seriesOrder: 9
tags: [ble, connection, interval, latency, throughput]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"BLE 연결은 *세 숫자*로 거의 모든 것이 결정됩니다 — Connection Interval(7.5 ms ~ 4 s), Slave Latency(skip할 interval 수), Supervision Timeout(연결 끊김 판정 시간). 이 셋의 *대수적 관계*가 안전한 값의 범위를 정의합니다."** 추가로 BLE 4.2의 *DLE(Data Length Extension)*가 27 B → 251 B로 한 packet을 늘려 *동일 interval에서 9배 처리량*을 줍니다.

이번 장은 *연결이 서고 난 후*의 모든 것을 다룹니다. 연결 파라미터의 세 숫자, 그 숫자들이 만족해야 할 *수학적 제약*, AFH(Adaptive Frequency Hopping)의 channel map, DLE와 MTU의 차이, 마지막으로 *처리량 계산 공식*까지 한 번에 정리합니다.

## 세 개의 Connection Parameter

연결 후 *master*(central)와 *slave*(peripheral) 사이의 동작은 *세 숫자*로 결정됩니다.

| 파라미터 | 단위 | 범위 | 의미 |
|---------|------|------|------|
| Connection Interval | 1.25 ms (스펙은 raw 값 × 1.25 ms) | 6 ~ 3200 (= 7.5 ms ~ 4 s) | central → peripheral packet 송신 간격 |
| Slave Latency | interval 수 | 0 ~ 499 | peripheral이 *깨어나지 않아도* 되는 interval 수 |
| Supervision Timeout | 10 ms (raw × 10 ms) | 10 ~ 3200 (= 100 ms ~ 32 s) | 마지막 packet 후 이 시간 무응답이면 연결 끊김 판정 |

```text
[Connection Interval = 50ms, Slave Latency = 4, Supervision Timeout = 5s]

Master:      ▌   ▌   ▌   ▌   ▌   ▌   ▌   ▌   ▌   ▌   ▌   ▌
             0   50  100 150 200 250 300 350 400 450 500 550 ms
             ↑   ↑                       ↑                       
             깨어남                    데이터 송신                
                                                                
Peripheral: ▌                       ▌                       ▌
            0                       250                     500 ms
            (4 interval skip 후 깨어남, latency=4)            

만약 250ms 슬롯에서 packet 손실:
  → 다음 슬롯 500ms도 손실
  → 손실 누적이 5초(5000ms)를 넘기면 연결 끊김
  → 따라서 5초 < supervision_timeout 이면 안전
```

이 세 숫자 사이의 *제약*은 다음 식 하나로 정리됩니다.

```text
Supervision Timeout > (1 + Slave Latency) × Connection Interval × 2
```

이 부등식을 위반하면 *central이 연결을 거부*합니다. 위 예에서는 5000 > (1 + 4) × 50 × 2 = 500이라 안전합니다. 반대로 latency를 100으로 늘리면 (1 + 100) × 50 × 2 = 10100 ms > 5000 ms라 연결 거부됩니다.

## 트레이드오프 - 처리량 vs 배터리

세 숫자의 조합이 *전형적인 응용 시나리오*를 결정합니다.

| 시나리오 | Interval | Latency | Timeout | 평균 전류 | 처리량 |
|---------|----------|---------|---------|----------|--------|
| 마우스/키보드 | 7.5 ms | 0 | 4 s | ~5 mA | ~50 kbps |
| 헤드셋 (HFP over BLE) | 7.5 ms | 0 | 1 s | ~10 mA | 높음 |
| 심박계 | 100 ms | 4 | 5 s | ~200 µA | 낮음 |
| 온도 센서 | 1 s | 30 | 30 s | ~10 µA | 매우 낮음 |
| OTA 업데이트 | 7.5 ms | 0 | 4 s | ~10 mA | ~1 Mbps (1M PHY) |
| 잠금 해제 (Apple Watch) | 30 ms | 0 | 6 s | ~1 mA | 중간 |

마우스는 *반응성*이 핵심이라 7.5 ms interval에 latency 0. 온도 센서는 *분 단위 갱신*이면 충분해 1 s interval에 latency 30 (≈ 30 s skip). 두 끝점이 *세 자리 µA*와 *세 자리 mA*만큼 다릅니다.

## Connection Parameter Update Request

연결 직후 central이 *자기 기본값*을 강제합니다. 안드로이드는 *50 ms / 0 / 5 s* 같은 *일반 목적값*을 씁니다. iOS는 *15 ms*에 가까운 빠른 값을 씁니다. Peripheral이 *자기 응용에 맞는 값*을 쓰려면 *Connection Parameter Update Request*를 보냅니다.

```c
// nRF Connect SDK - peripheral이 권장 값 제안
static const struct bt_le_conn_param param = {
    .interval_min = BT_GAP_INIT_CONN_INT_MIN,  // 0x18 = 30 ms
    .interval_max = BT_GAP_INIT_CONN_INT_MAX,  // 0x28 = 50 ms
    .latency = 0,
    .timeout = 400,  // 4 s
};

static void connected(struct bt_conn *conn, uint8_t err)
{
    if (err) return;
    
    /* 연결 직후 즉시 보내지 말고 30s 정도 대기 권장 (iOS 정책)
     * 그렇지 않으면 iOS가 거부할 수 있음 */
    k_work_schedule(&update_work, K_SECONDS(30));
}

static void update_work_handler(struct k_work *work)
{
    bt_conn_le_param_update(current_conn, &param);
}
```

iOS는 *Apple Bluetooth Accessory Design Guidelines*에 *허용 범위*를 명시합니다.

```text
[iOS connection parameter 정책 - 2024년 기준]

interval_min  ≥ 15 ms
interval_max ≥ interval_min + 15 ms
latency      ≤ 30
timeout      ≥ 2 s, 가능하면 6 s 이상
(interval_max × (latency + 1)) ≤ 2 s
timeout      ≥ 6 × interval_max × (1 + latency)
```

위반하면 iOS가 Update Request를 *조용히 거부*합니다. Android는 *훨씬 관대*하지만 그래도 `gatt.requestConnectionPriority(PRIORITY_HIGH)`로 *high(11.25-15 ms)*, *balanced(30-50 ms)*, *low_power(100-125 ms)* 셋 중 선택만 됩니다.

## Channel Map과 AFH

연결 후 데이터는 *0~36번 데이터 채널* 중 *37개 채널을 hopping*하며 흐릅니다. *Adaptive Frequency Hopping*은 *간섭이 심한 채널을 동적으로 제외*하는 메커니즘입니다.

```text
[Channel hopping - hopInc 알고리즘]

next_channel = (current_channel + hopInc) mod 37
              ↑                       ↑
              connection event마다    5 ~ 16 사이 odd 정수
                                     (연결 셋업 시 결정)

만약 next_channel이 *used map*에 없으면 (AFH로 제외됨):
  next_channel = used_map[next_channel mod num_used]
```

`hopInc`는 5~16 사이 *홀수*만 가능합니다. 그래서 *32가지 hopping 시퀀스*가 만들어집니다. 두 연결이 같은 hopInc를 쓰면 충돌 가능성이 생기는데, 첫 hop 시각이 다르면 통계적으로 분산됩니다.

```c
// nRF Connect SDK - channel map 명시
uint8_t chmap[5] = { 0xFF, 0xFF, 0xFF, 0xFF, 0x1F };
// 모든 37개 채널 사용

// WiFi 채널 6과 겹치는 BLE 채널 11~22 (대략) 제외
uint8_t chmap_avoid_wifi[5] = { 0x07, 0xC0, 0xFF, 0xFF, 0x1F };
bt_le_set_chan_map(chmap_avoid_wifi);
```

수동으로 채널을 막을 수 있지만, AFH가 거의 항상 *더 잘* 합니다. WiFi와 공존하는 환경에서는 *기본 AFH*를 켜놓고 *추가 회피*가 필요한 경우에만 수동 map을 씁니다.

## DLE - Data Length Extension

BLE 4.0의 *LL payload*는 *최대 27 byte*였습니다. ATT MTU 23 byte와 비슷한 한계로 *처리량이 처참*했습니다. BLE 4.2의 *Data Length Extension*은 LL payload를 *최대 251 byte*로 늘렸습니다.

```text
[LL packet 구조 - DLE 적용 전후]

Pre-DLE (BLE 4.0/4.1):
┌────┬────────────┬─────────────┬─────┐
│ 1B │ 1B         │ 0~27B       │ 3B  │
│ LL │ Length     │ LL payload  │ CRC │
│ Hdr│            │             │     │
└────┴────────────┴─────────────┴─────┘
total ≈ 33 B per packet

DLE (BLE 4.2+):
┌────┬────────────┬─────────────────────────────┬─────┐
│ 1B │ 1B         │ 27~251B                     │ 3B  │
│ LL │ Length     │ LL payload                  │ CRC │
│ Hdr│            │                             │     │
└────┴────────────┴─────────────────────────────┴─────┘
total ≈ 33~258 B per packet
```

DLE는 LL Length Update procedure로 *연결 중*에 협상됩니다.

```c
// nRF Connect SDK - DLE 협상 트리거
static void connected(struct bt_conn *conn, uint8_t err)
{
    if (err) return;
    
    /* PHY와 Data Length을 동시에 협상 (BLE 5.x) */
    struct bt_conn_le_data_len_param dle = {
        .tx_max_len = BT_GAP_DATA_LEN_MAX,    // 251
        .tx_max_time = BT_GAP_DATA_TIME_MAX,  // 17040 µs at 1M PHY
    };
    bt_conn_le_data_len_update(conn, &dle);
}

static void le_data_len_updated(struct bt_conn *conn,
                                struct bt_conn_le_data_len_info *info)
{
    printk("DLE updated: tx_max_len=%u, rx_max_len=%u\n",
           info->tx_max_len, info->rx_max_len);
}
```

central도 251 byte를 허용해야 협상이 성공합니다. iOS는 BLE 4.2부터 자동 251 byte를 수락하고, Android는 *플랫폼별로 다릅니다*. 양쪽 다 *DLE 미지원이면 27 byte*로 떨어집니다.

## MTU vs LL Payload - 두 개의 한계

자주 혼동되는 두 숫자입니다.

| 항목 | 약자 | 의미 | BLE 4.0 기본 | 가능한 최대 |
|------|------|------|------------|-----------|
| ATT MTU | MTU | 한 ATT operation에 실리는 *최대 attribute data* | 23 B | 247 B (LE 추천) ~ 517 B (이론) |
| LL Payload | DLE | 한 LL packet에 실리는 *최대 PHY 전송 바이트* | 27 B | 251 B |

MTU 23이면 ATT 헤더 3 B를 빼고 *실제 사용 가능 20 B*입니다. MTU 247이면 *244 B*. MTU 자체는 *ATT 레이어*의 협상이고, LL Payload는 *Link Layer*의 협상입니다. 둘은 *독립적*입니다.

```c
// MTU 협상 - GATT 레이어
bt_gatt_exchange_mtu(conn, &mtu_params);

static void mtu_exchanged(struct bt_conn *conn, uint8_t err,
                          struct bt_gatt_exchange_params *params)
{
    uint16_t mtu = bt_gatt_get_mtu(conn);
    printk("MTU = %u\n", mtu);
}
```

ATT operation이 MTU보다 *크면 자동으로 fragmenting*됩니다 — `ATT_PREPARE_WRITE_REQ` + 여러 chunks. 그러나 *Notify/Indicate는 fragment 불가*라 *MTU - 3 byte*가 단단한 한계입니다.

## 처리량 계산 공식

연결의 *이론 처리량*을 계산하는 공식입니다.

```text
Throughput = (bytes_per_event × events_per_second)

bytes_per_event = packets_per_event × payload_per_packet
events_per_second = 1000 / connection_interval_ms

[예: 1M PHY, interval=15 ms, MTU=247, DLE 251 B]

  packets_per_event ≈ 6 (1M PHY에서 15ms 안에 6 packet 정도)
  payload_per_packet = MTU - 3 = 244 B (notify 기준)
  events_per_second = 1000 / 15 ≈ 66.7

  Throughput ≈ 6 × 244 × 66.7 ≈ 97,700 B/s ≈ 780 kbps
```

| 설정 | 이론 처리량 | 비고 |
|------|----------|------|
| 1M PHY, MTU 23, no DLE | ~6 kbps | BLE 4.0 worst case |
| 1M PHY, MTU 247, DLE 251 | ~780 kbps | 1M PHY 한계에 근접 |
| 2M PHY, MTU 247, DLE 251 | ~1.4 Mbps | 2M PHY 한계 |
| Coded PHY S=2 | ~390 kbps | range 2x |
| Coded PHY S=8 | ~100 kbps | range 4x |

실측은 *interference·재전송·반대 방향 트래픽* 때문에 *이론치의 60~80%*가 보통입니다. OTA 업데이트나 audio streaming처럼 *고속*이 필요하면 *2M PHY + MTU 247 + 7.5 ms interval*이 표준 조합입니다.

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| 연결 자주 끊김 | supervision timeout 너무 짧음 | timeout 늘리기 (5-10s) |
| iOS가 Update Request 거부 | Apple 정책 위반 | interval/latency/timeout 재계산 |
| 배터리 빨리 닳음 | interval 너무 짧음 또는 latency=0 | 응용 시나리오 별 표 참조 |
| 처리량 100 kbps에서 멈춤 | MTU 23 또는 DLE 27 B | MTU+DLE 협상 확인 |
| WiFi 켜면 packet 손실 증가 | 채널 충돌, AFH 미동작 | AFH 활성, 채널 map 수동 |
| 연결 후 1초간 데이터 안 옴 | MTU 협상 진행 중 | MTU 협상 완료 wait 또는 미리 MTU 247로 시작 |
| notify가 다음 interval까지 지연 | latency 큼 | 중요한 notify는 latency=0 |
| DLE는 251 협상했는데 packet은 작음 | 상대 central 미지원 | log에서 tx/rx_max_len 확인 |

가장 큰 함정은 *iOS Update Request 거부*입니다. 원인이 *조용한 거부*라 알아채기 어렵습니다. 연결 직후 `bt_conn_le_param_update`의 *callback에서 실제 적용된 값을 확인*하는 것이 안전합니다.

```c
static void le_param_updated(struct bt_conn *conn, uint16_t interval,
                             uint16_t latency, uint16_t timeout)
{
    printk("Param updated: interval=%u (%.2f ms), latency=%u, timeout=%u (%u ms)\n",
           interval, interval * 1.25, latency, timeout, timeout * 10);
}

BT_CONN_CB_DEFINE(conn_callbacks) = {
    .le_param_updated = le_param_updated,
};
```

## 정리

- 연결은 *세 숫자*로 거의 모든 것이 결정됩니다 — interval(7.5 ms ~ 4 s), latency(0~499), timeout(100 ms ~ 32 s).
- 세 값은 *Supervision Timeout > (1 + Latency) × Interval × 2* 부등식을 만족해야 합니다.
- 응용 시나리오별 *전형 값*이 있습니다. 마우스는 7.5 ms/0/4 s, 온도 센서는 1 s/30/30 s.
- iOS는 *Apple Accessory Guidelines*에 엄격합니다. Update Request 위반은 *조용한 거부*로 떨어집니다.
- *Channel hopping*은 hopInc(5~16 odd)로 결정됩니다. AFH가 간섭 채널을 자동 제외합니다.
- *DLE*가 LL payload를 27 → 251 byte로 늘려 *동일 interval에서 9배 처리량*을 줍니다. MTU와 *독립*입니다.
- *처리량 공식*: bytes_per_event × events_per_second. 1M+MTU247+DLE면 ~780 kbps, 2M PHY는 ~1.4 Mbps.
- 가장 흔한 실수는 *iOS update 거부*와 *MTU 미협상*입니다. 연결 후 *실측 값을 로그*로 확인합니다.

## 다음 편

[Ch 10: BLE 5의 진짜 변화 — 2M·Coded·Extended Adv](/blog/embedded/wireless/getting-started-with-ble/chapter10-ble5-features)에서는 BLE 5에서 *새로 추가된* 기능들을 다룹니다. 2M PHY, Coded PHY S=2/S=8, Extended Advertising chained PDU, Periodic Advertising, LE Audio + LC3 codec, Direction Finding (AoA/AoD)까지 한 번에 정리합니다.

## 관련 항목

- [Ch 8: Advertising·Scanning](/blog/embedded/wireless/getting-started-with-ble/chapter08-advertising-scanning) — 연결 이전 단계
- [Ch 10: BLE 5의 진짜 변화](/blog/embedded/wireless/getting-started-with-ble/chapter10-ble5-features) — 2M/Coded PHY 심층
- [Ch 11: nRF Connect SDK 실습](/blog/embedded/wireless/getting-started-with-ble/chapter11-nrf-connect-sdk)
- [ESP32-C3 Mastering Ch 8: BLE 5.0](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt) — NimBLE connection API
- [원문 — Apple Bluetooth Accessory Design Guidelines](https://developer.apple.com/accessories/Accessory-Design-Guidelines.pdf)
- [원문 — Bluetooth Core 5.4, Vol 6 Part B (Link Layer)](https://www.bluetooth.com/specifications/specs/core-specification-5-4/)
