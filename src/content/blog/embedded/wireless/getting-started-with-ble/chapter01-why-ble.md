---
title: "Ch 1: 왜 BLE인가 — 클래식 BT와의 결별"
date: 2026-05-08T01:00:00
description: "Bluetooth Low Energy는 클래식 BT의 호환 확장이 아닌 별도 프로토콜. 코인셀 1년 운용."
series: "Getting Started with BLE"
seriesOrder: 1
tags: [ble, bluetooth, iot, low-power]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

## 한 줄 요약

> **"Bluetooth Low Energy는 *Bluetooth의 저전력판*이 아닙니다. 같은 이름과 같은 2.4 GHz를 쓰지만, *전혀 다른 프로토콜*입니다."** 클래식 BT가 *오디오 스트림*을 위해 설계되었다면, BLE는 *작은 데이터를 가끔 보내는 센서*를 위해 처음부터 다시 그려졌습니다.

이 시리즈는 Kevin Townsend의 *Getting Started with Bluetooth Low Energy*를 한국어로 정리하면서, 2014년 출간 이후의 5.x 진화까지 같이 따라갑니다. BLE는 *Bluetooth 4.0(2010)*에서 처음 들어왔고, 지금은 거의 모든 *스마트폰·웨어러블·IoT 센서*의 기본 라디오입니다.

이번 1장에서는 *클래식 BT와 BLE가 어떻게 다른지*, *코인셀 하나로 1년을 어떻게 버티는지*, *Bluetooth SIG와 Core Specification의 전체 구조*가 무엇인지 정리합니다. 본격적인 프로토콜은 3장부터입니다.

## 클래식 BT와 BLE의 결별

이름이 같아서 헷갈리지만, 두 프로토콜은 *완전히 별도의 무선 시스템*입니다.

| 항목 | Classic Bluetooth (BR/EDR) | Bluetooth Low Energy |
|------|----------------------------|----------------------|
| 도입 | 1999 (v1.0) | 2010 (v4.0) |
| 주파수 | 2.4 GHz ISM, 79 채널 × 1 MHz | 2.4 GHz ISM, 40 채널 × 2 MHz |
| 변조 | GFSK / π/4-DQPSK / 8DPSK | GFSK |
| 호핑 | 1600 hops/s adaptive | 채널 호핑은 connection당 |
| 전형 데이터율 | 1~3 Mbps | 1 Mbps (PHY 따라 125 kbps~2 Mbps) |
| 연결 시작 | inquiry + paging (수 초) | advertising + scan (수십 ms) |
| 전력 (active) | 30~100 mW | 5~15 mW |
| 평균 전력 (센서) | 어렵게 만들어도 수 mW | 수십 µW 가능 |
| 주력 응용 | A2DP 오디오, HFP 전화, HID | 비콘, 센서, 헬스, HID |
| 프로토콜 두 스택 | SDP, RFCOMM, L2CAP, SCO, eSCO, OBEX, ... | GAP, GATT, ATT, L2CAP, SMP |
| 페어링 | 항상 필요 (대부분) | 선택 (보안 필요 시) |

두 스택은 *동시에 호스트 OS가 운영*할 수 있지만, *서로의 패킷은 해석하지 못합니다*. 그래서 *BLE-only 칩*과 *dual-mode 칩(BR/EDR + BLE)*이 따로 존재합니다.

- BLE-only 예: Nordic nRF52, ESP32-C3, TI CC2640
- Dual-mode 예: Nordic nRF5340, Espressif ESP32 (원본)

클래식 BT의 무게는 *프로파일의 양*에 있습니다. A2DP, AVRCP, HFP, HSP, PBAP, OBEX, MAP, PAN 등 *수십 개의 프로파일*이 있고, 각자 *복잡한 상태 기계*와 *코덱 협상*을 합니다. BLE는 *프로파일이 GATT 하나*입니다. 모든 응용이 *Service → Characteristic → Descriptor* 트리에 데이터를 얹습니다. 단순함이 *저전력의 출발점*입니다.

## Nokia Wibree에서 Bluetooth 4.0까지

BLE의 뿌리는 *Nokia*입니다.

- **2001** Nokia Research, 저전력 무선 프로젝트 시작
- **2004** 내부 코드명 "Wibree"
- **2006** Nokia, Wibree 공개. 2.4GHz, 1Mbps, 코인셀 운용 목표
- **2007** Bluetooth SIG가 Wibree를 흡수하기로 합의
- **2009** Bluetooth Core Spec 4.0 작업 진행
- **2010** Bluetooth Core Spec 4.0 발표 — "Bluetooth Low Energy" 포함
- **2011** iPhone 4S, 첫 BLE 지원 스마트폰
- **2013** iBeacon 발표, BLE 비콘 시장 폭발
- **2014** Bluetooth 4.2 (LESC, DLE)
- **2016** Bluetooth 5.0 (2M PHY, Coded PHY, Extended Adv)
- **2023** Bluetooth 5.4 (PAwR)

Nokia가 Wibree로 *원한 것*은 단순합니다. *손목시계가 휴대폰의 알림을 받되, 코인셀로 1년을 가는 것*. 이 한 줄의 요구가 *모든 설계 결정*을 끌어옵니다.

- *적은 채널 수* — 40 채널만 (Classic의 79 채널 절반). 채널 탐색 시간 단축
- *advertising 채널 3개 고정* (37, 38, 39) — 발견 단계의 *deterministic 시간*
- *짧은 패킷* — 한 패킷의 *on-air* 시간이 수백 µs
- *connection event 사이 sleep* — 라디오를 *대부분 끈다*

Bluetooth SIG는 2007년에 *Wibree를 흡수*했고, 2010년 *Bluetooth Core Specification 4.0*의 일부로 통합 발표했습니다. 이때부터 BLE는 *Bluetooth의 부분*이지만, *프로토콜은 완전히 분리*되어 있습니다. *물리 계층·링크 계층·호스트 프로토콜*이 모두 별도입니다. 같은 칩에서 *시분할*로 둘 다 돌릴 뿐입니다.

## 코인셀 1년 — 숫자로 보기

BLE 마케팅의 첫 줄은 항상 *"코인셀로 1년"*입니다. 어떻게 가능할까요?

CR2032 코인셀 사양입니다.

- **공칭 전압**: 3.0 V
- **공칭 용량**: 220 mAh (현실은 200 mAh로 잡는 게 안전)
- **저류 한계**: ~15 mA (이상이면 전압 강하 심함)
- **자가 방전**: 연 2~3% (1년 운용 시 무시 가능 수준은 아님)
- **운영 온도**: -20 ~ +60 °C

1년 = 8,760시간. 200 mAh를 8,760시간에 나누면 *평균 전류 23 µA*가 한계입니다. BLE 라디오의 *active 전류는 7~15 mA*이므로, *깨어 있는 시간*이 *총 시간의 0.15% 이하*여야 합니다.

비콘 한 개의 *advertising 한 번*을 모델링해 봅니다.

```text
Advertising event 한 번
├── pre-processing (CPU)        500 µs  @ 3 mA
├── radio TX 채널 37            376 µs  @ 10 mA   (legacy adv 31B + 헤더)
├── radio TX 채널 38            376 µs  @ 10 mA
├── radio TX 채널 39            376 µs  @ 10 mA
└── post-processing             500 µs  @ 3 mA
total active ~2.1 ms, 평균 7 mA → 약 14.7 µA·s 소비

광고 주기 1초마다 1번이면
14.7 µA·s / 1 s = 14.7 µA 평균
+ sleep 전류 (RTC + RAM retention) ~ 1 µA
합계 ~ 16 µA
```

CR2032 200 mAh / 16 µA = *12,500시간 ≈ 1.4년*. *1초 주기*로 광고하면 *1년 이상* 가능합니다. 만약 *100 ms 주기*로 광고하면 평균 전류가 *10배*가 되어 *수 주*로 떨어집니다.

연결을 맺으면 패턴이 또 다릅니다. *Connection interval*이 *7.5 ms ~ 4 s* 사이에서 결정되고, 매 interval마다 *짧은 packet 한 쌍*을 교환합니다. 500 ms interval이면 *광고와 비슷한 전력*에 *연결 상태*를 유지할 수 있습니다.

핵심은 두 단어입니다.

- **Duty cycle** — *깨어 있는 비율*을 0.1% 이하로 떨어뜨릴 수 있다
- **빠른 시작** — 라디오를 *수십 µs 안에 켜고 끈다* (PLL 잠금 빠름)

이 두 가지가 클래식 BT에서는 *물리적으로 불가능*했습니다. BLE를 *별도 프로토콜*로 다시 만든 첫 번째 이유입니다.

## 전형적인 유스케이스

BLE는 *작은 데이터·낮은 빈도·낮은 전력*이 만나는 자리에서 빛납니다.

### iBeacon과 비콘

![iBeacon Advertising Payload](/images/blog/ble/diagrams/ch01-ibeacon-frame.svg)

iBeacon은 *연결을 안 합니다*. *Advertising만* 합니다. 비콘은 자기 UUID를 외치기만 하고, *스마트폰이 자기 위치를 추정*합니다. 매장 안에서 *어느 통로에 있는지*를 *서버에서* 추적합니다.

### Fitness tracker

```text
Heart Rate Service (0x180D)
├── Heart Rate Measurement (0x2A37) — Notify로 BPM 송신
├── Body Sensor Location (0x2A38) — Read (손목, 가슴 등)
└── Heart Rate Control Point (0x2A39) — Write (에너지 리셋 등)

Device Information Service (0x180A)
└── Manufacturer Name, Model Number, ...

Battery Service (0x180F)
└── Battery Level (0x2A19) — Read + Notify
```

심박 트래커는 *표준 GATT 서비스 3개*만 있으면 *Android·iOS의 기본 fitness 앱*과 *바로 호환*됩니다. 추가 앱이 필요 없습니다. 6장에서 자세히 봅니다.

### 혈당계 (Glucose Profile)

병원·약국용 의료 기기도 BLE의 큰 시장입니다. *Glucose Service (0x1808)*가 표준화되어 있어서, *FDA 인증 받은 측정기*가 *환자의 폰*으로 데이터를 직접 보냅니다. 보안은 *LE Secure Connections + bonding*로 묶습니다 (7장).

### 스마트 잠금

도어락은 *드물게* 통신합니다 (하루 수십 번). 코인셀이 아닌 *AA 4개*로 *2~3년*을 운용합니다. BLE 연결을 *필요할 때만 잠깐* 맺고 끊습니다.

### HID over GATT

블루투스 키보드·마우스·게임패드도 *대부분 BLE*입니다. *클래식 HID*보다 *지연이 낮고 전력이 적습니다*. iPad 키보드 대부분이 *HID over GATT* 프로파일입니다.

| 유스케이스 | 데이터 빈도 | 평균 전류 | 배터리 수명 |
|-----------|------------|----------|------------|
| 비콘 (1초 광고) | 1 Hz, 31B | ~15 µA | 1~2년 (CR2032) |
| 비콘 (10초 광고) | 0.1 Hz, 31B | ~3 µA | 5년+ (CR2032) |
| 심박 트래커 | 1 Hz, 4B notify | ~80 µA | 2주 (180 mAh LiPo) |
| 도어락 | 0.01 Hz, 가끔 connect | ~50 µA | 2~3년 (AA×4) |
| HID 키보드 | 키 누름 시 | ~200 µA | 6개월 (AAA×2) |
| 의료기기 | 측정 시 | ~수 mA 잠깐 | 6개월~1년 |

## Bluetooth SIG와 Core Specification

Bluetooth SIG (Special Interest Group)는 *Bluetooth 표준을 관리하는 비영리 단체*입니다. Apple, Microsoft, Nokia, Ericsson 등이 1998년에 설립했고, 지금은 *35,000+ 회원사*가 있습니다. *SIG 가입 없이는 Bluetooth 로고를 제품에 붙일 수 없습니다*.

핵심 문서는 *Bluetooth Core Specification*입니다. 분량이 *5,000 페이지를 넘습니다*. 5.4 기준 구성입니다.

```text
Bluetooth Core Specification 5.4 (총 ~5,800 페이지)
├── Volume 0: Master TOC & Compliance Requirements
├── Volume 1: Architecture & Terminology Overview
├── Volume 2: Core System Package [BR/EDR Controller]
│   ├── Part A: Radio Specification
│   ├── Part B: Baseband Specification
│   ├── Part C: Link Manager Protocol
│   ├── Part D: Error Codes
│   ├── Part E: HCI Functional Specification
│   ├── Part F: Message Sequence Charts
│   └── Part G: Sample Data
├── Volume 3: Core System Package [Host]
│   ├── Part A: Logical Link Control & Adaptation Protocol (L2CAP)
│   ├── Part B: Service Discovery Protocol (SDP)
│   ├── Part C: Generic Access Profile (GAP)
│   ├── Part D: Test Support
│   ├── Part F: Attribute Protocol (ATT)
│   ├── Part G: Generic Attribute Profile (GATT)
│   └── Part H: Security Manager Specification
├── Volume 4: Host Controller Interface [Transport Layer]
└── Volume 6: Core System Package [Low Energy Controller volume]
    ├── Part A: Physical Layer Specification
    ├── Part B: Link Layer Specification
    ├── Part C: Sample Data
    ├── Part D: Message Sequence Charts
    ├── Part E: Low Energy Direct Test Mode
    └── Part F: Direction Finding
```

처음부터 끝까지 읽는 것은 *현실적이지 않습니다*. 실무자가 자주 보는 부분만 추려도 *800~1000 페이지*입니다.

- *GAP*을 만들면 Volume 3 Part C
- *GATT 서버*를 만들면 Volume 3 Part F (ATT) + Part G (GATT)
- *LL 동작*이 궁금하면 Volume 6 Part B
- *HCI 트레이스*를 보면 Volume 4

추가로 *Service Specification*과 *Profile Specification*이 별도 문서입니다. 예를 들어 *Heart Rate Service 1.0*는 별개의 *10 페이지짜리 PDF*입니다. 6장에서 자세히 봅니다.

또 하나, *Assigned Numbers* 문서가 있습니다. *모든 16-bit UUID, manufacturer ID, GATT format 코드*가 여기에 있습니다. *btsig 사이트의 PDF*로 따로 배포됩니다.

```bash
# 자주 참조하는 문서 (모두 bluetooth.com에서 무료)
# 1. Bluetooth Core Specification 5.4
#    https://www.bluetooth.com/specifications/specs/core-specification-5-4/
# 2. Assigned Numbers
#    https://www.bluetooth.com/specifications/assigned-numbers/
# 3. Specifications List (모든 service/profile spec)
#    https://www.bluetooth.com/specifications/specs/
```

## 책의 12장 로드맵

원서 *Getting Started with Bluetooth Low Energy*는 2014년에 *Bluetooth 4.1 시점*으로 출간되었습니다. 12장 구성입니다.

**1. Introduction**


**2. Protocol Basics**


**3. The BLE Controller (PHY, Link Layer)**


**4. The Host (L2CAP, ATT, GATT, SMP, GAP)**


**5. Hardware Platforms (당시 기준 nRF51, CC254x)**


**6. Tools and Toolchains**


**7. Debugging (sniffer, log)**


**8. Application Design**


**9. Beacons (iBeacon, AltBeacon)**


**10. Android Programming**


**11. iOS Programming**


**12. Internet Gateways (BLE → IP)**

이 시리즈는 *책의 구조를 따르되, 5.x까지의 변화*를 반영합니다.

- Ch 1: 왜 BLE인가 (지금 이 글)
- Ch 2: 표준 변천 — 4.0 → 5.4
- Ch 3: 프로토콜 스택 — 7계층
- Ch 4: GAP — 디바이스 발견과 연결
- Ch 5: GATT — 데이터 모델
- Ch 6: 표준 서비스와 custom 서비스
- Ch 7: Pairing과 Bonding — LE Secure Connections
- Ch 8: Advertising과 Scanning 깊이 있게
- Ch 9: Connection 관리 — interval, latency, supervision
- Ch 10: BLE 5의 새 기능 — Coded PHY, Extended Adv, LE Audio
- Ch 11: Nordic nRF Connect SDK 실전
- Ch 12: Debugging — sniffer, HCI 로그

원서는 *iOS·Android 코드*를 직접 보여줬지만, 2025년 시점에서는 *모바일 API가 너무 자주 바뀝니다*. 이 시리즈는 *임베디드 쪽 (Peripheral)*에 집중합니다. *Central 측은 nRF Connect 같은 도구*로 검증합니다.

## 자주 하는 오해

| 오해 | 현실 |
|------|------|
| BLE는 Bluetooth의 저전력 버전이다 | 완전히 별도 프로토콜, 같은 칩에서 시분할 |
| BLE는 느려서 오디오 못 한다 | 5.2부터 LE Audio (LC3 코덱)로 가능 |
| BLE 데이터율은 1 Mbps 고정 | PHY에 따라 125 kbps~2 Mbps |
| BLE는 IPv6 못 쓴다 | 6LoWPAN over BLE 가능 (RFC 7668) |
| BLE는 보안이 약하다 | LESC (4.2+)는 ECDH P-256, 클래식보다 강함 |
| 모든 폰이 BLE 5를 지원한다 | Coded PHY는 일부 폰만, Extended Adv도 미흡 |
| 비콘은 페어링이 필요하다 | 비콘은 advertising만, 연결도 페어링도 없음 |

## 정리

- BLE는 Bluetooth의 *호환 확장이 아니라*, 같은 2.4 GHz를 공유하는 *별도 프로토콜*입니다.
- 출발은 *Nokia Wibree(2006)*이고, *Bluetooth 4.0(2010)*에서 통합되어 공식 표준이 되었습니다.
- 코인셀 1년의 비밀은 *0.1% 미만의 duty cycle*입니다. active 7 mA지만 *대부분 sleep*하면 평균 *수십 µA*로 떨어집니다.
- 전형 응용은 *비콘, 웨어러블, 헬스, 도어락, HID*입니다. 데이터가 *작고 빈도가 낮으면* BLE가 거의 정답입니다.
- *Bluetooth SIG*가 표준을 관리하고, *Core Specification*은 *5,000+ 페이지*입니다. 실무자는 보통 *GAP/GATT/ATT* 부분만 정독합니다.
- 책은 *Bluetooth 4.1 시점(2014)*이지만, 이 시리즈는 *5.4까지*의 변화를 반영합니다.
- 클래식 BT와 BLE를 모두 다루는 *dual-mode 칩*과, *BLE-only 칩*이 따로 있습니다. IoT 센서는 거의 *BLE-only*면 충분합니다.

## 다음 편

[Ch 2: BLE 표준 변천 — 4.0 → 5.4까지](/blog/embedded/wireless/getting-started-with-ble/chapter02-spec-evolution)에서 *Bluetooth 4.0부터 5.4까지의 진화*를 짚습니다. *LESC, Data Length Extension, 2M PHY, Coded PHY, Extended Advertising, LE Audio, Direction Finding, PAwR*이 *어느 버전*에 *왜* 추가됐는지 시간순으로 정리합니다.

## 관련 항목

- [Ch 2: BLE 표준 변천](/blog/embedded/wireless/getting-started-with-ble/chapter02-spec-evolution)
- [Ch 3: 프로토콜 스택](/blog/embedded/wireless/getting-started-with-ble/chapter03-protocol-stack)
- [ESP32-C3 Mastering Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt) — 같은 주제의 실전편
- [원문 — Getting Started with Bluetooth Low Energy (O'Reilly)](https://www.oreilly.com/library/view/getting-started-with/9781491900550/)
- [원문 — Bluetooth Core Specification 5.4](https://www.bluetooth.com/specifications/specs/core-specification-5-4/)
- [원문 — Bluetooth Assigned Numbers](https://www.bluetooth.com/specifications/assigned-numbers/)
