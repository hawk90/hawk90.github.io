---
title: "Ch 10: J1939 — 상용차·트럭·건설 표준 (29-bit ID 위)"
date: 2027-04-01T10:00:00
description: "SAE J1939 — Extended ID로 자동 주소 + 표준 PGN. 트럭·버스·건설 장비의 사실상 표준."
series: "CAN Bus 심화"
seriesOrder: 10
tags: [j1939, sae, heavy-duty, pgn, spn, transport-protocol]
draft: true
---

## 한 줄 요약

> **"29-bit ID = Priority + PGN + Source"** — ID 자체가 *우선순위 + 메시지 의미 + 송신자*를 모두 인코딩.

## J1939 — SAE 상용차 표준

SAE (Society of Automotive Engineers)가 1990년대 트럭·버스·건설장비의 *공통 통신* 표준화. 250 kbps 또는 500 kbps CAN 2.0B (Extended ID).

### 적용 범위

- **트럭/트랙터** — Volvo, Daimler, MAN, PACCAR, Scania, Hyundai
- **버스** — Mercedes Citaro, BYD eBus, 현대 일렉시티
- **건설장비** — Caterpillar, Komatsu, Volvo CE, Hyundai HCE
- **농기계** — John Deere, Kubota, AGCO
- **해양 (NMEA 2000)** — Garmin, Furuno (J1939 변형)

승용차 OBD-II와는 *다른 표준*. 승용차 = ISO 15765-4 (UDS), 상용차 = J1939.

## 29-bit ID 구조

```text
Bit 28          Bit 26  Bit 25                      Bit 8    Bit 0
[Priority (3)] [R (1)] [DP (1)] [PGN High (8)] [PGN Low (8)] [Source Addr (8)]
                              └── 18-bit PGN ──────────┘
```

### Priority (3-bit)

`000` = 최고, `111` = 최저. 보통:
- `0-2` — 안전 critical (브레이크, 조향)
- `3-5` — 일반 운전 데이터
- `6-7` — 진단·로깅

### PGN (Parameter Group Number, 18-bit)

메시지의 *종류*. 표준 PGN 카탈로그 (J1939-71).

| PGN | 이름 | 내용 |
| --- | --- | --- |
| 0x00F004 | Engine Controller 1 (EEC1) | RPM, torque, demanded |
| 0x00FEF1 | Cruise Control / Vehicle Speed | 차속 |
| 0x00FEEE | Engine Temperature 1 | 냉각수온, 엔진오일온 |
| 0x00FECA | Diagnostic Trouble Code | DTC 코드 |
| 0x00EAFF | Request | 다른 PGN 요청 |
| 0x00EEFF | Address Claimed | 노드 주소 선언 |

### Source Address (8-bit)

송신 노드의 *주소* (1-255). 0x00은 *Engine Controller 1*, 0xF8 = Tachograph, 등 *표준 할당*.

J1939-81 — *Address Claim*으로 주소 동적 할당 가능 (충돌 시 우선순위 NAME으로 결정).

## PGN 분해

```text
PGN = (DP << 16) | (PF << 8) | (GE 또는 0)

DP = Data Page (bit 25)
PF = PDU Format (bit 16-23)
GE = Group Extension (bit 8-15)
```

### PDU 두 종류

- **PDU1 (PF = 0x00-0xEF)**: GE = *Destination Address* — 1:1 통신
- **PDU2 (PF = 0xF0-0xFF)**: GE = *Group Extension* — broadcast

PDU1 메시지는 *특정 노드만 받음*, PDU2는 *모두 받음*. EEC1 (0x00F004)은 PDU2 → broadcast.

## SPN (Suspect Parameter Number)

각 PGN 안의 *바이트·비트별 파라미터*. 진단·계측 표준.

```text
PGN 0xF004 (EEC1)의 데이터 8 byte:
Byte  Bit   SPN     Name              Range/Scale
1     1-8   899     EngTorqueMode     0=No Request, ..., 14=Reserved
2     all   513     ActualEngTorque   -125 to 125%, 1% / bit
3     all   190     EngineSpeed       0 to 8031.875 rpm, 0.125 rpm/bit
4     1-8   1483    SourceAddrCMD     CAN source
5-6   all   1675    EngStarterMode    16 modes
7     all   2432    DemandTorquePct   -125% to 125%
8     1-8   2978    EngTorqueLimit    valid/notvalid
```

→ "엔진 RPM"을 알고 싶다 = PGN 0xF004의 byte 3-4, factor 0.125.

J1939-71 (SAE 문서, ~$500) 또는 *오픈소스 디코더* (`canmatrix`, `cantools`)로 해독.

## Transport Protocol — > 8 byte 메시지

CAN 2.0 한계 8 byte 초과 데이터는 *J1939-21 TP*로 분할.

### BAM (Broadcast Announce Message) — broadcast 대용량

```text
1. 송신자 → TP.CM_BAM (PGN 0xEC00):
   data = [0x20, total_size_lo, total_size_hi, num_packets, 0xFF, PGN(3 byte)]

2. 송신자 → TP.DT (PGN 0xEB00) × num_packets:
   data = [seq_num (1-255), 7 bytes payload]
```

### CMDT (Connection-Mode Data Transfer) — 1:1 대용량

```text
1. RTS (Request To Send): TP.CM_RTS
2. CTS (Clear To Send): receiver acks N packets
3. TP.DT: data packets
4. EOM ack
```

→ 대용량 (예: ECU 펌웨어, ~MB)은 CMDT로. 표준 처리량 ~수 KB/s.

## J1939 사용처 예

### 엔진 데이터 모니터링

```text
구독: PGN 0xF004 (EEC1) — 100 ms 주기로 자동 송신됨
디코드:
  RPM = (byte4 << 8 | byte3) × 0.125
  Torque = byte2 - 125 (%)
  ...
```

### DTC (Diagnostic Trouble Code) 읽기

```text
1. Request (PGN 0xEA00, Dest=Engine):
   Data = [PGN of interest = 0x00FECA 분해]

2. Response (PGN 0xFECA from Engine):
   DTC 리스트 (SPN + FMI + Occurrence Count + Conversion)
```

### 차속·연료·온도 등

모두 표준 PGN으로 표준화 — *어느 트럭이든 같은 PGN으로 같은 데이터*.

## OBD-II 진단과 차이

| | OBD-II (승용차) | J1939 (상용차) |
| --- | --- | --- |
| 표준 | ISO 15765-4 (UDS over CAN) | SAE J1939 |
| ID 폭 | 11-bit 또는 29-bit (UDS) | 29-bit (J1939) |
| 진단 요청 | 0x7DF (request) | PGN 0xEA00 |
| 진단 응답 | 0x7E8-7EF | PGN 0xEAFF or 정상 PGN |
| Bit rate | 500 kbps | 250 kbps (또는 500) |
| 커넥터 | DLC J1962 (16-pin) | 9-pin Deutsch 또는 J1939-13 |

승용차 OBD-II 스캐너는 *대형 트럭에 안 됨* — J1939 별도 필요.

## 오픈소스 도구

- **canmatrix** — DBC/KCD/CAN_FD 파일 변환 + J1939 디코드
- **cantools** — Python, DBC 파일로 J1939 디코드
- **SocketCAN + j1939 모듈** — Linux 커널 5.4+ J1939 stack
- **OpenJ1939** — 임베디드 stack

```python
# cantools 예
import cantools, can

db = cantools.database.load_file('j1939.dbc')

bus = can.interface.Bus('can0', bustype='socketcan')
for msg in bus:
    decoded = db.decode_message(msg.arbitration_id, msg.data)
    if 'EngineSpeed' in decoded:
        print(f"RPM = {decoded['EngineSpeed']}")
```

## Linux Kernel J1939 — SocketCAN

```c
#include <linux/can.h>
#include <linux/can/j1939.h>

int sock = socket(PF_CAN, SOCK_DGRAM, CAN_J1939);
struct sockaddr_can addr = {
    .can_family = AF_CAN,
    .can_addr.j1939 = {
        .name = J1939_NO_NAME,
        .addr = 0xF8,            // Tachograph 주소
        .pgn = J1939_NO_PGN,
    },
};
bind(sock, (struct sockaddr*)&addr, sizeof(addr));

// 메시지 수신
struct j1939_metadata meta;
uint8_t buf[1785];               // J1939 max payload
recv(sock, buf, sizeof(buf), 0);
```

→ Address claim, TP 등을 *커널이 자동 처리*. Userspace는 그냥 read/write.

## 자주 하는 실수

> ⚠️ Address 충돌

두 노드가 같은 SA 사용 시도 → *Address Claim에서 NAME 우선순위로 한쪽 패배*. NAME 정확히 설정 (J1939-81).

> ⚠️ 250 kbps vs 500 kbps

옛 트럭 = 250, 신차 = 500. *틀리면 모든 메시지 NACK*. 차량 매뉴얼 확인.

> ⚠️ Endianness

J1939는 *little-endian*. CANopen도. 그러나 *일부 자동차 OEM CAN*은 big-endian (Motorola format). DBC 파일에 명시.

> ⚠️ TP 미구현 + 큰 메시지

ECU가 *TP 응답* 안 하면 large message 못 받음. CMDT는 *RTS/CTS 핸드셰이크* 필수.

## 정리

- J1939 = **29-bit ID** (Priority + PGN + SA) + Extended CAN 2.0 + 250/500 kbps.
- **PGN**이 메시지 종류, **SPN**이 그 안의 파라미터.
- **PDU1** (1:1) vs **PDU2** (broadcast).
- **Transport Protocol**로 8 byte 초과 분할 — BAM (broadcast), CMDT (1:1).
- 상용차 모든 시스템의 표준 — 트럭·버스·건설·농기계.
- Linux 5.4+ 커널이 *네이티브 J1939 stack*.

다음 편은 **SocketCAN** — Linux의 CAN 인터페이스.

## 관련 항목

- [Ch 9: CANopen](/blog/embedded/protocols/can-bus/chapter09-canopen)
- [Ch 11: SocketCAN](/blog/embedded/protocols/can-bus/chapter11-socketcan)
