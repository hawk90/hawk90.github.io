---
title: "Ch 4: GAP — Generic Access Profile, 4가지 역할"
date: 2026-05-08T04:00:00
description: "Broadcaster·Observer·Peripheral·Central 4역. 디바이스 발견·연결의 거시 정책."
series: "Getting Started with BLE"
seriesOrder: 4
tags: [ble, gap, role, advertising, connection]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"GAP은 *프로토콜이 아니라 정책*입니다. *나는 어떤 디바이스이고, 어떻게 발견되고, 어떻게 연결하는가*를 정합니다."** 4가지 역할, 4가지 주소 타입, RPA로 지키는 privacy, 광고 간격의 trade-off가 GAP의 4대 주제입니다. GATT가 데이터 모델이라면 GAP은 *연결 자체의 모델*입니다.

3장에서 *프로토콜 스택*을 봤다면, GAP은 그 *모든 계층을 가로지르는 정책 레이어*입니다. *Link Layer의 advertising 상태*, *SMP의 pairing 절차*, *GATT의 Generic Access Service*가 모두 GAP의 일부입니다.

이번 장에서는 *4가지 역할의 동시 운영*, *4가지 주소 타입과 RPA의 ECC 기반 생성*, *광고 간격 선택의 전류 trade-off*, *Connection 절차의 단계*를 다룹니다. 7장의 pairing은 GAP의 보안 모드 결정을 따릅니다.

## 4가지 GAP 역할

GAP은 디바이스를 *4가지 역할*로 분류합니다.

| 역할 | 광고 | 스캔 | 연결 시작 | 연결 수락 | 전형 디바이스 |
|------|------|------|----------|----------|--------------|
| Broadcaster | O | X | X | X | iBeacon, Eddystone, 센서 비콘 |
| Observer | X | O | X | X | 비콘 수집기, 매장 분석 단말 |
| Peripheral | O | X | X | O | 센서, 시계, 잠금, HID |
| Central | X | O | O | O | 스마트폰, 게이트웨이 |

```text
       광고 송신    스캔 수신    연결 시작    연결 수락
Broadcaster   O       X          X          X
Observer      X       O          X          X
Peripheral    O       X          X          O
Central       X       O          O          O
```

### Broadcaster

연결 없이 *광고만* 합니다. 가장 *단순하고 저전력*인 역할입니다. 비콘이 대표입니다.

```text
디바이스 흐름
- 부팅
- advertising 시작 (광고 데이터 = UUID + Major + Minor)
- 광고 주기마다 채널 37/38/39에 송신
- sleep
```

매 광고 사이클을 *수 ms*에 끝내고 나머지는 sleep합니다. 코인셀 1년 운용의 표준 형태입니다.

### Observer

광고를 *수신만* 합니다. 응답하지 않습니다. *매장에서 손님의 비콘 카운트*, *주차장의 차량 식별*에 씁니다.

### Peripheral

*광고를 송신하고, 연결되면 수락*합니다. 연결이 끊기면 다시 광고로 돌아갑니다. *IoT 센서·웨어러블·HID 키보드*가 모두 이 역할입니다.

### Central

*광고를 스캔하고, 원하는 디바이스에 연결을 시작*합니다. 한 번에 *여러 Peripheral과 동시* 연결 가능 (칩에 따라 4~20개). *스마트폰·게이트웨이·라우터*가 Central입니다.

### 동시 운영

Bluetooth 4.1부터 *한 디바이스가 여러 역할을 동시에* 할 수 있습니다. 예를 들어 *BLE 메시 게이트웨이*는 한 칩으로 다음을 동시에 합니다.

```text
            ┌────────────┐
센서 ──────►│           │◄────── 다른 센서
(BLE)       │ 게이트웨이 │
            │           │
스마트폰◄───┤           │──────► 클라우드 (WiFi)
(BLE)       └────────────┘

게이트웨이 = Central (센서들과)  +  Peripheral (스마트폰에)
```

칩 사양에 *동시 connection 개수*가 적혀 있습니다. Nordic nRF52840 NimBLE은 *최대 20개 동시 연결*, ESP32-C3 NimBLE은 *기본 3개, 최대 9개*까지 가능합니다.

```c
// NimBLE 설정 (sdkconfig 또는 menuconfig)
CONFIG_BT_NIMBLE_MAX_CONNECTIONS=4
CONFIG_BT_NIMBLE_ROLE_PERIPHERAL=y
CONFIG_BT_NIMBLE_ROLE_CENTRAL=y
CONFIG_BT_NIMBLE_ROLE_OBSERVER=y
CONFIG_BT_NIMBLE_ROLE_BROADCASTER=y
```

## 디바이스 주소 — 4가지 타입

BLE 디바이스는 *48-bit 주소*로 식별됩니다. 클래식 BT와 같은 형식이지만, *주소 종류가 4가지*입니다.

```text
주소 48 bit 구조
┌────────────────┬────────────┐
│   상위 2 bit   │ 하위 46 bit│
└────────────────┴────────────┘

상위 2 bit (Random Address일 때만 의미)
0b11 = Static Random Address
0b01 = Resolvable Private Address (RPA)
0b00 = Non-Resolvable Private Address (NRPA)
```

### 1. Public Address

```text
포맷: IEEE 48-bit MAC 주소 (OUI + NIC)
┌──────────┬──────────┐
│ OUI 24b  │ NIC 24b  │
└──────────┴──────────┘

예: A0:B1:C2:D3:E4:F5
    A0 B1 C2 = OUI (제조사 등록 번호)
    D3 E4 F5 = 디바이스 고유 번호
```

*IEEE에 등록*된 OUI를 사용합니다. 등록비가 있어서 *대형 제조사*만 사용합니다 (Apple, Samsung, Nordic 등). *세상에 unique한 주소*입니다.

### 2. Static Random Address

```text
상위 2 bit = 0b11
하위 46 bit = 랜덤
예: F2:34:56:78:9A:BC  (상위 byte의 상위 2 bit = 11)
```

*IEEE 등록 없이 사용*할 수 있는 주소입니다. 부팅마다 바뀔 수도 있고, *NVS에 저장해 고정*할 수도 있습니다. *대부분의 임베디드 SDK*가 기본으로 씁니다. *세상에 unique하지 않지만, 충돌 확률이 매우 낮습니다*.

### 3. Resolvable Private Address (RPA)

*Privacy 1.2*의 핵심입니다. *15분마다 자동으로 주소가 바뀝니다*. 추적 방지가 목적입니다.

```text
RPA = prand(24 bit) || hash(24 bit)
       │              │
       │              └─ AES-128(IRK, padding||prand)의 하위 24 bit
       └─ 상위 2 bit = 0b01, 나머지 22 bit는 랜덤

IRK (Identity Resolving Key) = 16 byte 비밀 키
                              본드된 디바이스끼리만 공유
```

*Bonded 디바이스만 IRK를 가지고 있어서, 그 디바이스만 주소를 해석*할 수 있습니다. 도청자는 *주소가 바뀌니 추적이 불가능*합니다.

```c
// RPA 해석 (Address Resolution)
bool resolve_rpa(uint8_t *rpa, uint8_t *irk) {
    uint8_t prand[16] = {0};
    memcpy(prand + 13, rpa + 3, 3);  // 상위 3 byte = prand
    prand[12] = 0x40;                 // padding fixup
    
    uint8_t hash_out[16];
    aes_128_ecb(irk, prand, hash_out);
    
    return memcmp(hash_out + 13, rpa, 3) == 0;  // 하위 3 byte = hash
}
```

iPhone과 Android 모두 *기본으로 RPA를 사용*합니다. 스마트폰의 *진짜 MAC*은 본드된 디바이스만 압니다.

### 4. Non-Resolvable Private Address (NRPA)

```text
상위 2 bit = 0b00
하위 46 bit = 완전 랜덤
```

*아무도 해석할 수 없는 임시 주소*입니다. *연결을 안 하는 단발성 광고*에 씁니다. 예를 들어 *Wi-Fi 자동 탐색*이나 *지역 진단 비콘*에 NRPA를 씁니다.

### 비교

| 종류 | 변경 | 추적 | 용도 |
|------|------|------|------|
| Public | 고정 | 가능 | OUI 등록한 대형 제조사 |
| Static Random | 부팅 시 또는 영구 | 가능 (한 번 안 바꾸면) | 일반 임베디드 |
| RPA | ~15분마다 자동 | bonded 디바이스만 해석 | 스마트폰, privacy 중요 디바이스 |
| NRPA | 매번 자동 | 불가능 | 단발성 광고 |

## Advertising — 광고의 종류와 파라미터

광고는 *Peripheral/Broadcaster가 자기 존재를 알리는 방법*입니다. 4가지 광고 모드가 있습니다.

| 광고 종류 | 연결 가능 | 스캔 응답 | PDU 타입 |
|----------|----------|----------|----------|
| Connectable Undirected (ADV_IND) | O | O | 0x00 |
| Connectable Directed (ADV_DIRECT_IND) | O | X | 0x01 |
| Non-connectable Undirected (ADV_NONCONN_IND) | X | X | 0x02 |
| Scannable Undirected (ADV_SCAN_IND) | X | O | 0x06 |

### ADV_IND — 가장 흔한 광고

```text
페이로드 최대 31 byte (legacy)
┌──────┬─────────────────────────────┐
│ AdvA │  AdvData (AD structures)    │
│  6 B │      0~31 B                 │
└──────┴─────────────────────────────┘

AD structure (TLV 형식)
┌────┬──────┬─────────────┐
│Len │ Type │   Value     │
│ 1B │  1B  │ Len-1 byte  │
└────┴──────┴─────────────┘
```

자주 쓰는 AD Type입니다.

```text
0x01  Flags (general/limited discoverable, BR/EDR support)
0x02  Incomplete List of 16-bit Service UUIDs
0x03  Complete List of 16-bit Service UUIDs
0x06  Incomplete List of 128-bit Service UUIDs
0x08  Shortened Local Name
0x09  Complete Local Name
0x0A  Tx Power Level
0x16  Service Data - 16-bit UUID
0x19  Appearance
0xFF  Manufacturer Specific Data
```

### 실제 광고 패킷 예

```text
A0 B1 C2 D3 E4 F5         ← AdvA (송신자 주소)
02 01 06                   ← Flags AD: General Discoverable, BR/EDR not supported
03 03 0F 18                ← Complete 16-bit UUIDs: 0x180F (Battery Service)
0B 09 4D 79 53 65 6E 73 6F 72 30 31  ← Complete Local Name: "MySensor01"
```

총 *24 byte*. legacy 광고의 *31 byte 한계*가 빠듯합니다. 더 큰 데이터는 *Scan Response (수신측이 SCAN_REQ로 요청)*나 *Extended Advertising (5.0+)*을 씁니다.

## Advertising Interval — 전류 trade-off

광고 간격이 *전류와 발견 시간을 좌우*합니다.

### Connectable 광고

```text
범위: 20 ms ~ 10.24 s (단위 0.625 ms)
실제 광고는 random delay ±10 ms 추가됨 (충돌 회피)
```

### Non-connectable 광고

```text
범위: 100 ms ~ 10.24 s (4.0/4.1)
범위: 20 ms ~ 10.24 s (4.2부터)
```

### 추천 값

| 시나리오 | 간격 | 평균 전류 (estimate) | 발견 시간 |
|---------|------|---------------------|----------|
| 첫 페어링 (Fast Connect) | 30~60 ms | ~5 mA | < 1 s |
| 일반 IoT, 빠른 응답 | 100~200 ms | ~1.5 mA | 1~2 s |
| 절전 모드 | 500 ms ~ 1 s | ~200 µA | 5~10 s |
| 장기 비콘 | 2~5 s | ~50 µA | 10~30 s |
| 극저전력 비콘 | 10 s | ~10 µA | 매우 느림 |

### NimBLE 설정 예

```c
// 100 ms ~ 200 ms 광고 (단위 0.625 ms)
struct ble_gap_adv_params adv_params = {
    .conn_mode = BLE_GAP_CONN_MODE_UND,    // Connectable Undirected
    .disc_mode = BLE_GAP_DISC_MODE_GEN,    // General Discoverable
    .itvl_min  = 0x00A0,                    // 160 × 0.625 ms = 100 ms
    .itvl_max  = 0x0140,                    // 320 × 0.625 ms = 200 ms
    .channel_map = 0x07,                    // 채널 37/38/39 모두
    .filter_policy = 0x00,                  // 모든 디바이스 허용
};

ble_gap_adv_start(BLE_OWN_ADDR_RANDOM, NULL, BLE_HS_FOREVER,
                  &adv_params, gap_event_handler, NULL);
```

### Fast/Slow Adv 전환

좋은 패턴은 *부팅 직후 빠른 광고로 30초*, *그 후 느린 광고로 영구*입니다.

```c
// 부팅 후 30초 fast advertising
start_advertising(itvl_min=30ms, itvl_max=60ms);
schedule_after(30000_ms, []{
    stop_advertising();
    start_advertising(itvl_min=1000ms, itvl_max=2000ms);  // 절전 모드
});
```

## Connection — 연결의 라이프사이클

### Connection Parameters

연결은 *4개 파라미터*로 정의됩니다.

| 파라미터 | 범위 | 의미 |
|---------|------|------|
| Connection Interval | 7.5 ms ~ 4 s | Connection Event 사이 시간 |
| Slave Latency | 0 ~ 499 | Slave가 응답 안 해도 되는 CE 수 |
| Supervision Timeout | 100 ms ~ 32 s | 응답 없으면 연결 종료 |
| Connection Event Length | 0 ~ 65535 (× 0.625 ms) | CE 최대 길이 |

### 절전과 응답성의 trade-off

```text
케이스 1: 빠른 응답 우선
  interval = 30 ms
  latency = 0
  → CE가 33 Hz로 일어남
  → 평균 전류 ~ 5 mA
  → 절대 지연 ~ 30 ms

케이스 2: 절전 우선
  interval = 1 s
  latency = 4
  → Slave는 5초마다 응답해도 OK
  → 평균 전류 ~ 50 µA
  → 절대 지연 0~5 s
```

### Connection Update Procedure

연결 후에도 *파라미터를 바꿀 수 있습니다*. Peripheral이 *권장값*을 광고에 실어 Central에 알리고, Central이 *수락*합니다.

```c
// NimBLE: 연결 파라미터 요청
struct ble_gap_upd_params params = {
    .itvl_min = 80,    // 100 ms
    .itvl_max = 160,   // 200 ms
    .latency = 4,
    .supervision_timeout = 600,  // 6 s
    .min_ce_len = 0,
    .max_ce_len = 0,
};
ble_gap_update_params(conn_handle, &params);
```

iOS는 *연결 파라미터에 엄격한 정책*이 있습니다. Apple Bluetooth Design Guidelines에 *최소 interval 15 ms, latency × interval ≤ 2 s*가 명시됩니다. 어기면 *연결이 끊깁니다*.

### 절차 요약

```text
1. Peripheral: Advertising 시작
2. Central: Scanning (active 또는 passive)
3. Central: 원하는 광고 발견 → CONNECT_IND 송신
4. 양쪽: 연결 채널 맵 결정, AccessAddress 생성
5. 양쪽: Connection 상태로 전환
6. 매 Connection Interval마다 CE 열림
7. (선택) Connection Update로 파라미터 변경
8. (선택) Pairing/Bonding (7장)
9. GATT 트래픽 (5장)
10. Disconnect (둘 중 누구든 가능)
```

## GAP의 Discoverability와 Connectability

GAP은 *디바이스의 모드*를 정합니다.

### Discoverability

| 모드 | 의미 |
|------|------|
| Non-Discoverable | 광고 없음 또는 BR/EDR만 |
| Limited Discoverable | 30~60초만 광고 (Flags 0x01) |
| General Discoverable | 영구 광고 (Flags 0x02) |

```c
// NimBLE: General Discoverable
fields.flags = BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP;

// Limited Discoverable (30초 후 자동 종료)
fields.flags = BLE_HS_ADV_F_DISC_LTD | BLE_HS_ADV_F_BREDR_UNSUP;
```

### Connectability

| 모드 | 의미 |
|------|------|
| Non-Connectable | 비콘, 연결 불가 |
| Directed Connectable | 특정 Central에게만 (RPA로 식별) |
| Undirected Connectable | 누구든 환영 |

### Bondable Mode

| 모드 | 의미 |
|------|------|
| Non-Bondable | pairing은 되지만 키 저장 안 함 |
| Bondable | pairing 키 저장, 재접속 시 재사용 |

양산 IoT는 *Undirected Connectable + General Discoverable + Bondable*이 기본입니다.

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| 스마트폰이 디바이스 발견 못 함 | advertising 안 시작 | ble_gap_adv_start 호출 확인 |
| 스캔에 떴다 안 떴다 함 | 광고 interval 너무 김 | interval ↓ |
| RSSI 신호 강한데 연결 후 곧 끊김 | 파라미터 협상 실패 | connection update에서 iOS 정책 확인 |
| RPA 디바이스 어떻게 식별? | IRK 모르면 못 함 | 본드한 디바이스만 가능 |
| 동시 connection 한계 초과 | SDK config에 max_connections | menuconfig에서 max 늘리기 |
| iOS와 연결 후 disconnect | latency × interval > 2 s | latency ↓ 또는 interval ↓ |
| 광고 interval 20 ms 안 됨 | 4.0/4.1 non-conn은 100 ms 최소 | 4.2+ 칩 사용 |
| public address가 충돌 | OUI 미등록인데 public 사용 | static random으로 전환 |

## 정리

- GAP의 4역할은 *Broadcaster, Observer, Peripheral, Central*입니다. 한 디바이스가 *여러 역할을 동시에* 할 수 있습니다.
- 주소 타입은 *Public, Static Random, RPA, NRPA*입니다. 임베디드는 *Static Random*이 기본이고, *Privacy가 중요한 디바이스*는 *RPA*입니다.
- *RPA는 IRK로 ECC 기반 AES-128*을 통해 *15분마다 자동 갱신*됩니다. 본드된 디바이스만 해석 가능합니다.
- 광고는 *4종*입니다. *ADV_IND가 가장 흔한* 연결 가능 광고입니다. *Manufacturer Data, Service Data, Local Name*이 31 byte 페이로드에 들어갑니다.
- Advertising interval은 *전류와 발견 시간의 trade-off*입니다. *Fast(30 ms) + Slow(1 s)의 전환 패턴*이 실전에 좋습니다.
- Connection 파라미터는 *interval, slave latency, supervision timeout*입니다. *iOS는 엄격한 정책*이 있어서 *Apple 가이드라인 준수*가 필요합니다.
- 양산 IoT의 기본 GAP 모드는 *Undirected Connectable + General Discoverable + Bondable + Static Random 또는 RPA*입니다.

## 다음 편

[Ch 5: GATT — Generic Attribute Profile, 데이터 모델](/blog/embedded/wireless/getting-started-with-ble/chapter05-gatt)에서 *연결된 후의 데이터 모델*인 GATT를 봅니다. *Attribute의 4가지 요소*, *Service/Characteristic/Descriptor 3계층*, *CCCD로 notify 활성화*, *MTU 협상*까지 다룹니다.

## 관련 항목

- [Ch 3: 프로토콜 스택](/blog/embedded/wireless/getting-started-with-ble/chapter03-protocol-stack)
- [Ch 5: GATT](/blog/embedded/wireless/getting-started-with-ble/chapter05-gatt)
- [Ch 7: Pairing·Bonding](/blog/embedded/wireless/getting-started-with-ble/chapter07-pairing-bonding) — RPA 해석에 필요한 IRK
- [Ch 8: Advertising·Scanning 깊이](/blog/embedded/wireless/getting-started-with-ble/chapter08-advertising-scanning)
- [Ch 9: Connection 관리](/blog/embedded/wireless/getting-started-with-ble/chapter09-connection-management)
- [ESP32-C3 Mastering Ch 8: BLE 5.0](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [원문 — Apple Bluetooth Design Guidelines](https://developer.apple.com/accessories/Accessory-Design-Guidelines.pdf)
- [원문 — Bluetooth Core Spec Vol 3 Part C (GAP)](https://www.bluetooth.com/specifications/specs/core-specification-5-4/)
