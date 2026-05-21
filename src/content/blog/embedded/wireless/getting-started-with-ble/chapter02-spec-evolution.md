---
title: "Ch 2: BLE 표준 변천 — 4.0 → 5.4까지"
date: 2026-05-08T02:00:00
description: "Bluetooth 4.0(2010) BLE 도입 → 5.0(2016) 4×2× 거리/속도 → 5.4(2023) 주기적 PAwR."
series: "Getting Started with BLE"
seriesOrder: 2
tags: [ble, bluetooth, spec, evolution]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"BLE는 *13년 동안 7개의 마이너 버전*을 거치며 거의 모든 부분이 바뀌었습니다. 다만 *오래된 기기와의 호환*은 *모두 유지*되고 있습니다."** 4.0의 31 byte advertising은 5.0의 255 byte Extended Adv가 되었지만, *legacy 광고는 그대로* 들어옵니다. 새 기능은 *옵션이고, 디바이스가 협상*합니다.

원서가 출간된 2014년은 *Bluetooth 4.1 시점*입니다. 그 후로 *4.2, 5.0, 5.1, 5.2, 5.3, 5.4*가 차례로 나왔습니다. 가장 큰 변화는 *4.2(보안)*와 *5.0(PHY 다양화)*입니다. 5.1 이후는 *틈새 기능*이 많지만, *LE Audio(5.2)*와 *PAwR(5.4)*는 새 응용을 끌고 옵니다.

이번 장에서는 *각 버전이 무엇을 들고 왔는지*, *왜 그게 필요했는지*, *현재 시장에서 어디까지 일반화됐는지*를 정리합니다. 다음 장의 *프로토콜 스택*과 *6장의 표준 서비스* 모두 *어느 버전이 추가한 기능인지*를 알면 더 명확합니다.

## 한눈에 보는 버전 변천

- **2010 v4.0** — BLE 최초 도입. GAP, GATT, ATT, SMP, L2CAP, LL, PHY 모두 등장
- **2013 v4.1** — 호스트·컨트롤러 분리 명확화, LL Topology 개선, 동시 master/slave
- **2014 v4.2** — LE Secure Connections (ECDH), Data Length Extension, LE Privacy 1.2
- **2016 v5.0** — 2M PHY (2× 속도), Coded PHY (4× 거리), Extended Advertising
- **2019 v5.1** — Direction Finding (AoA/AoD), GATT Caching, Periodic Adv Sync Transfer
- **2020 v5.2** — LE Audio: Isochronous Channels, LC3 코덱, Multi-Stream
- **2021 v5.3** — Periodic Adv 강화, Channel Classification 개선
- **2023 v5.4** — PAwR (Periodic Adv with Responses), Encrypted Advertising Data

각 버전이 *기존 기기와의 호환성을 깨지 않습니다*. 4.0 디바이스와 5.4 폰이 만나면, *연결이 4.0 기능으로 맺어집니다*. 새 기능은 *양쪽이 다 지원할 때만* 활성화됩니다.

| 분류 | 4.0 | 4.1 | 4.2 | 5.0 | 5.1 | 5.2 | 5.3 | 5.4 |
|------|-----|-----|-----|-----|-----|-----|-----|-----|
| LE Privacy | (Host) | (Host) | LE Privacy 1.2 | 동일 | 동일 | 동일 | 동일 | EAD 추가 |
| Pairing | Legacy | Legacy | LESC 추가 | 동일 | 동일 | 동일 | 동일 | 동일 |
| Data Length | 27 B | 27 B | 251 B | 251 B | 251 B | 251 B | 251 B | 251 B |
| PHY | 1M | 1M | 1M | 1M / 2M / Coded | 동일 | 동일 | 동일 | 동일 |
| Advertising | Legacy 31B | 동일 | 동일 | Extended 255B 추가 | 동일 | 동일 | 동일 | PAwR 추가 |
| 주요 응용 추가 | — | — | IoT 보안 | 비콘 거리 확장 | 실내 측위 | LE Audio | 멀티존 audio | 추적기·자산 |

## 4.0 (2010) — BLE의 탄생

*Bluetooth 4.0*에서 BLE가 처음 등장했습니다. 1장에서 본 *Nokia Wibree*가 *Volume 6: Low Energy Controller* 형태로 통합되었습니다.

4.0의 핵심 결정들입니다.

```text
Physical Layer
- 2.4 GHz ISM, 40 채널 × 2 MHz
- GFSK 변조, 1 Mbps 데이터율 (고정)
- TX power -20 ~ +10 dBm

Link Layer
- 5개 상태: Standby, Advertising, Scanning, Initiating, Connection
- Advertising 채널 3개: 37, 38, 39
- Data 채널 37개: 0~36

Host
- L2CAP (간소화), ATT, GATT, SMP, GAP

Security
- Legacy Pairing: passkey 또는 OOB로 TK 생성
- AES-CCM 암호화 (128-bit)
```

4.0은 *최초 구현*이라 *한계도 많았습니다*.

- ATT MTU 기본 *23 byte*, payload 실용 *20 byte*
- LL packet payload *27 byte* 한계
- 비콘이 *연결되면 페어링부터* 시작 (앱 측 처리 번거로움)
- 동시에 *한 역할*만 (Central 또는 Peripheral, 동시 안 됨)

첫 BLE 지원 스마트폰은 *iPhone 4S(2011)*입니다. Android는 *4.3(2013)*부터 공식 API를 제공했습니다.

## 4.1 (2013) — 정리와 동시 다역할

4.1은 *큰 신기능보다 정리*가 주제였습니다.

- *동시 multi-role* — 한 디바이스가 *Central과 Peripheral을 동시에* 할 수 있게 됨. 메시 네트워크의 기초
- *LL Topology* 개선 — Connection을 *유연하게 재구성*
- *L2CAP Connection-Oriented Channels (LE CoC)* — TCP 같은 스트림 채널을 GATT 위가 아닌 *L2CAP 위에서 직접*
- *권장 LR (Recommended Connection Procedure)* — 재접속 절차 표준화

이 시점에 *iBeacon(2013)*이 발표되며 *비콘 시장이 폭발*했습니다. 4.1 자체보다는 *비콘 응용의 발견*이 더 큰 사건이었습니다.

## 4.2 (2014) — 보안과 처리량의 진짜 도약

원서는 *4.1 시점*이지만, *4.2의 변화가 크기 때문에* 같이 보는 게 좋습니다.

### LE Secure Connections (LESC)

기존 *Legacy Pairing*은 *passkey만 알면 누구나 키를 도청* 가능했습니다. 4.2의 *LESC*는 *ECDH (Elliptic Curve Diffie-Hellman) P-256*으로 키를 *공개 채널에서도 안전하게* 교환합니다.

**Legacy Pairing (4.0/4.1):**

1. TK 생성 (passkey 또는 OOB 또는 0)
2. `STK = AES(TK, random)`
3. LTK 교환 — *도청 가능*

**LE Secure Connections (4.2+):**

1. ECDH P-256 키 교환 — Public Key A·B 교환
2. 양쪽이 DHKey 도출 — *도청자는 도출 불가*
3. Numeric Comparison으로 MITM 방어
4. `LTK = AES-CMAC(DHKey, ...)`

7장에서 자세히 다룹니다. 양산 IoT는 *LESC + bonding*이 사실상 의무입니다.

### Data Length Extension (DLE)

LL packet payload가 *27 byte → 251 byte*로 *9.3배* 늘었습니다. ATT MTU도 *517 byte까지* 협상 가능해졌습니다.

![LL Data PDU (4.2+ Data Length Extension)](/images/blog/ble/diagrams/ch02-ll-data-pdu.svg)

throughput이 *수 배* 좋아집니다. 4.0에서 *7~10 KB/s* 수준이던 GATT가 *4.2에서는 30 KB/s+*까지 올라갑니다.

### LE Privacy 1.2

*Resolvable Private Address (RPA)*가 표준화됐습니다. 폰이 *15분마다 자기 MAC을 바꿔서* 추적을 방지합니다. 4장에서 자세히 다룹니다.

## 5.0 (2016) — PHY 다양화

5.0이 가져온 변화는 *물리 계층*입니다. 4.0~4.2의 *1 Mbps GFSK 고정*이 *3가지 PHY*로 분기했습니다.

| PHY | Data Rate | Symbol Rate | Range (옥외) |
|-----|-----------|-------------|--------------|
| LE 1M | 1 Mbps | 1 Msym/s | ~30 m (기본) |
| LE 2M | 2 Mbps | 2 Msym/s | ~25 m (고대역) |
| LE Coded S=2 | 500 kbps | 1 Msym/s × 2 | ~60 m (중간) |
| LE Coded S=8 | 125 kbps | 1 Msym/s × 8 | ~120 m (long range) |

*Coded PHY*는 *FEC(Forward Error Correction)*를 *2배 또는 8배* 적용해 *링크 budget을 +6~12 dB* 늘립니다. 옥외에서 *거리가 4배*까지 늘어납니다. 대신 *데이터율은 1/8*입니다.

링크 budget은 `TX power + 양쪽 안테나 이득 − 경로 손실 − 수신 감도(Rx sensitivity)`로 계산한다.

| PHY | 수신 감도 |
|-----|-----------|
| Coded S=8 | −103 dBm 수준 |
| 1M PHY | −93 dBm 수준 |

차이 +10 dB ≈ *거리 3~4배*.

### Extended Advertising

광고 패킷이 *31 byte → 255 byte*로 늘었습니다. 더 큰 manufacturer data, 더 긴 device name, *URL이나 IPv6 라우팅 정보*까지 실립니다.

primary 채널(37/38/39)에서는 *짧은 헤더*만 보내고, *실제 payload는 데이터 채널*에 따로 송신합니다. *비콘 시장의 정보량 부족* 문제를 해결했습니다.

![Legacy vs Extended Advertising — primary 채널의 헤더가 AuxPtr로 secondary 데이터 채널의 페이로드를 가리킨다](/images/blog/ble/diagrams/ch02-extended-adv.svg)

### Periodic Advertising

연결 없이도 *주기적으로 정확한 시각에* 데이터를 뿌립니다. 수신자는 *언제 광고가 올지를 안다*. 매번 *전체 스캔할 필요가 없어* 전력이 훨씬 좋습니다.

![Periodic Advertising — 정확한 interval beacons](/images/blog/ble/diagrams/ch02-periodic-adv-timing.svg)

기차역 안내, 박물관 음성 가이드, *Auracast 방송*의 기반입니다.

## 5.1 (2019) — Direction Finding

5.1의 메인은 *AoA (Angle of Arrival)*와 *AoD (Angle of Departure)*입니다. *Bluetooth로 실내 측위*가 가능해집니다.

| 모드 | TX | RX | 동작 |
|------|----|----|------|
| AoA (Angle of Arrival) | 단일 안테나 | 안테나 어레이 (보통 4~16개) | RX가 위상차로 신호 도래각 계산 |
| AoD (Angle of Departure) | 안테나 어레이 | 단일 안테나 | TX가 안테나 스위칭, RX가 IQ 샘플로 각도 추출 |

기존 *RSSI 기반 측위*는 오차가 *수 m*였는데, AoA/AoD는 *수십 cm까지* 정밀합니다. Apple AirTag, Tile, 자산 추적 시스템이 이걸 씁니다.

### GATT Caching

이전에는 *재접속 시 GATT 트리를 매번 재발견*했습니다. 5.1의 *Robust Caching*은 *서비스가 안 바뀌었으면 캐시를 그대로* 씁니다. 첫 발견은 느려도 *재접속이 매우 빠릅니다*.

*Service Changed Characteristic* (UUID `0x2A05`)는 *서버가 "내 GATT 트리가 바뀌었다"고 알리는* characteristic이다. Client는 이 알림이 올 때만 재발견하고, 나머지는 캐시를 그대로 쓴다.

## 5.2 (2020) — LE Audio

5.2는 *완전히 새로운 영역*인 *LE Audio*를 가져옵니다. 클래식 BT의 *A2DP/HFP를 대체*하는 게 목표입니다.

### Isochronous Channels (ISO)

*시간 동기*가 핵심인 *오디오·실시간 데이터*를 위한 새 채널입니다. 기존 ACL(Asynchronous Connection-Less) 채널과 별도입니다.

```text
ISO Channel 종류
- CIS (Connected Isochronous Stream) — 1:1 또는 1:N 연결 기반
- BIS (Broadcast Isochronous Stream) — 1:Many 브로드캐스트
```

### LC3 코덱

*Low Complexity Communication Codec*. 클래식 SBC보다 *반의 비트레이트로 같은 음질*. 16/24/32/48 kHz 샘플링, 16~32 kbps에서도 *유의미한 음질*.

오디오 코덱 비교 (음성 텔레포니):

| 코덱 | 비트레이트 | 비고 |
|------|-----------|------|
| SBC | 32~64 kbps | 품질 보통 |
| AAC | 96 kbps | 좋음 |
| LC3 | 32 kbps | SBC 64 kbps급 — *절반 비트레이트* |
| LC3plus | 16~64 kbps | 의료·통신용 무선 |

### Multi-Stream

*양쪽 무선 이어폰을 독립 스트림*으로. 기존 클래식은 *한 이어폰이 마스터, 다른 쪽이 relay*였는데, LE Audio는 *둘 다 phone과 직접 연결*합니다.

### Auracast Broadcast

*공항·체육관·박물관에서 다수 청취자에게 송출*. 음성 듣고 싶은 사람이 *Auracast assistant*로 채널 선택. 보청기·이어폰이 받습니다.

## 5.3 (2021) — Periodic Adv 정교화

5.3은 *큰 신기능보다 5.1/5.2의 개선*입니다.

- *Enhanced Periodic Advertising* — sync 정확도와 효율 개선
- *Channel Classification* — Central이 *간섭 채널을 Peripheral에게 통보*. 양쪽이 같이 회피
- *Connection Subrating* — 평소엔 *느린 interval*, 필요할 때 *빠른 interval*. 평균 전력 절감
- *Encryption Key Size 명시* — 보안 정책 강화

산업·자산 추적 시장에서 자주 보이는 버전입니다.

## 5.4 (2023) — PAwR과 EAD

5.4의 메인은 *PAwR (Periodic Advertising with Responses)*입니다.

### PAwR

기존 periodic adv는 *일방향 브로드캐스트*였습니다. PAwR는 *각 슬롯에 응답 슬롯*이 있어, *수신자가 같은 시각에 응답*합니다.

![PAwR one-cycle structure: advertise + reply slots](/images/blog/ble/diagrams/ch02-pawr-cycle.svg)

*전기 자전거의 다수 잠금 장치*, *대규모 자산 추적*, *Find My 네트워크*가 메인 응용입니다. 수천 개 디바이스를 *연결 없이* 운영합니다.

### Encrypted Advertising Data (EAD)

광고 데이터 자체를 *암호화*합니다. *RPA로 MAC을 숨겨도 광고 내용은 평문*이라 추적 가능한 게 약점이었는데, EAD가 해결합니다.

```text
EAD 적용 전
adv data: "My Heart Rate Monitor" — 평문, 누구나 읽음

EAD 적용 후
adv data: 0xA8 4F C3 ... — AES 암호문, IRK로만 복호
```

## 시장 보급 현황 (2025 시점)

표준이 있어도 *시장에 보급되는 데는 시간이 걸립니다*.

| 버전 | 칩 보급 | 폰 OS 지원 | 권장 사용 |
|------|---------|------------|----------|
| 4.0 | 폐기 수순 | 모든 폰 (Android 4.3+, iOS 5+) | 신규 채택 안 함 |
| 4.2 | 일반화 | 모든 폰 | LESC 필수 |
| 5.0 | 일반화 | iPhone 8+ (2017+), Android 8+ | 신규 IoT 기본 |
| 5.1 | 보급 중 | Android 12+ 일부, iPhone 11+ | AoA/AoD는 전용 칩 |
| 5.2 | 보급 중 | iOS 16+, Android 13+ | LE Audio는 칩 의존 |
| 5.3 | 신규 칩 | Android 14+, iOS 17+ | 산업용 |
| 5.4 | 초기 | iOS 17.5+, Android 15 일부 | 양산 채택은 2026~ |

2025년에 *새 IoT 제품*을 만든다면 *5.0이 안전한 baseline*입니다. 5.2 이상은 *고성능·LE Audio*가 필요할 때만 골라야 합니다.

## 자주 하는 실수

| 실수 | 바로잡기 |
|------|----------|
| 4.0 칩으로 BLE 5 광고가 안 잡힌다고 불만 | Extended Adv는 5.0+ 필요. Legacy로 떨어뜨리기 |
| 4.2 칩에 Coded PHY 설정 시도 | Coded는 5.0+ 전용 |
| 스마트폰이 4.2 LESC 자동 협상한다고 가정 | 구형 폰은 Legacy로 떨어질 수 있음 |
| LE Audio = BLE 5.2면 무조건 가능 | 칩 + 폰 + OS + 헤드폰 모두 지원해야 함 |
| PAwR 광고를 5.0 폰에서 받음 | 5.4 미만은 PAwR 못 봄, 일반 periodic으로 fallback 안 됨 |
| GATT Caching이 자동으로 켜진다고 기대 | Service Changed 옵션 켜야 함 |
| 2M PHY를 advertising에 사용 | Legacy advertising은 1M 또는 Coded만, Extended Adv부터 2M 가능 |

## 정리

- BLE는 *2010년 4.0 도입* 이후 *13년간 7번의 마이너 버전*을 거쳤습니다. *모든 호환성이 유지*되고 있습니다.
- *4.2(2014)*가 *LESC와 DLE*로 보안과 처리량을 동시에 끌어올렸습니다. 양산 IoT의 시작점입니다.
- *5.0(2016)*은 *2M PHY*로 처리량 2배, *Coded PHY*로 거리 4배, *Extended Adv*로 광고 페이로드 8배 늘렸습니다.
- *5.1(2019)*의 *Direction Finding*은 *RSSI 기반에서 cm 수준 측위*로 바꿨습니다. AirTag류의 기반입니다.
- *5.2(2020)*의 *LE Audio*는 *클래식 A2DP/HFP의 대체*입니다. LC3 코덱, ISO 채널, Multi-Stream, Auracast가 한 패키지입니다.
- *5.4(2023)*의 *PAwR*는 *수천 디바이스의 양방향 통신*을 연결 없이 가능하게 합니다. *Find My* 류 응용.
- 2025년에 *새 BLE 제품*을 만든다면 *5.0이 안전한 baseline*입니다. 더 새 버전은 *응용이 필요로 할 때*만 채택합니다.
- *Bluetooth 6.0 작업*도 진행 중입니다. *Channel Sounding(거리 측정)*과 *Decision-Based Advertising Filtering*이 주제입니다.

## 다음 편

[Ch 3: 프로토콜 스택 — PHY·LL·HCI·L2CAP·ATT·GATT·GAP](/blog/embedded/wireless/getting-started-with-ble/chapter03-protocol-stack)에서 *BLE 스택의 7계층*을 구체 바이트 단위로 봅니다. *Controller와 Host의 분리*, *HCI 패킷 포맷*, *L2CAP CID 매핑*, *ATT PDU의 OpCode*까지 자세히 다룹니다.

## 관련 항목

- [Ch 1: 왜 BLE인가](/blog/embedded/wireless/getting-started-with-ble/chapter01-why-ble)
- [Ch 3: 프로토콜 스택](/blog/embedded/wireless/getting-started-with-ble/chapter03-protocol-stack)
- [Ch 7: Pairing·Bonding](/blog/embedded/wireless/getting-started-with-ble/chapter07-pairing-bonding) — LESC 자세히
- [Ch 10: BLE 5의 새 기능](/blog/embedded/wireless/getting-started-with-ble/chapter10-ble5-features) — 5.x 깊이 있게
- [ESP32-C3 Mastering Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [원문 — Bluetooth 5.4 Highlights](https://www.bluetooth.com/blog/bluetooth-core-specification-version-5-4-feature-enhancements/)
- [원문 — LE Audio Overview](https://www.bluetooth.com/learn-about-bluetooth/recent-enhancements/le-audio/)
