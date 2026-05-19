---
title: "Ch 5: Avionics Buses — MIL-STD-1553·ARINC-429·AFDX"
date: 2026-05-18T05:00:00
description: "Avionics 데이터 버스 비교 — 1553(군용), 429(민항), 664/AFDX(switched ethernet)."
series: "Digital Avionics Handbook"
seriesOrder: 5
tags: [avionics, mil-std-1553, arinc-429, afdx, bus]
draft: true
---

## 한 줄 요약

> **"Avionics bus = deterministic + redundant + 인증 친화"** — 1553/429/AFDX 3 축.

## Avionics Bus 요구사항

```text
일반 IT bus vs Avionics bus:

일반 IT (Ethernet, USB, PCIe):
  + 고대역폭
  + 표준화·범용
  + Plug-and-play
  - Best-effort (deterministic 보장 ↓)
  - Single point of failure
  
Avionics:
  + Deterministic (bounded latency)
  + Redundant (dual·triple bus)
  + Long supply (~20-30년)
  + Wide environmental
  + 인증 (DO-254·DO-178C 호환)
  + EMI·rad immunity
  - 대역폭 보통 낮음
  - 비용 ↑
```

Avionics — *예측 가능성 + 신뢰성 > 성능*.

## 3 주요 표준

```text
MIL-STD-1553B (군용):
  1970s 개발
  1 Mbps, command-response
  Boeing F-15·F-16·F-22·F-35
  Aircraft·LV·위성
  
ARINC-429 (민항):
  1977
  100 kbps (high speed) 또는 12.5 kbps
  Point-to-point
  Boeing 727·737·747·777
  
ARINC-664 / AFDX (modern):
  2002
  100 Mbps·1 Gbps
  Switched Ethernet 기반
  Airbus A380·A350, Boeing 787
```

각 *세대의 산업 표준*. 공존 중.

## MIL-STD-1553B — 군용 표준

```text
표준명:
  MIL-STD-1553B (Military Standard 1553)
  Aircraft Internal Time Division Command/Response 
  Multiplex Data Bus
  
역사:
  1973 — 1553A
  1978 — 1553B (current de facto)
  1996 — Notice 2 (clarification)

물리층:
  Manchester encoding
  1 Mbps
  Twisted-pair, shielded
  Transformer-coupled
  Stub up to 6 m
  Bus length up to 100 m

Topology:
  Multi-drop (single bus)
  Up to 32 terminals
  Dual-redundant standard
```

40년 — *여전히 현역*. 군 표준 안정성.

## 1553B Topology — BC·RT·MT

```text
Bus Controller (BC):
  Master — 모든 transaction 시작
  Command word issue
  보통 1개 active (대개 redundant standby 있음)

Remote Terminal (RT):
  Slave — BC 명령 응답
  최대 31 RT per bus (address 0-30)
  Sensor·actuator·subcomputer
  
Bus Monitor (BM):
  Passive listener
  Logging·debug·analysis
  
Topology:
  ┌─────┐    Bus    ┌─────┐    ┌─────┐
  │ BC  │←─────────→│ RT1 │ ── │ RT2 │ ── ...
  └─────┘            └─────┘    └─────┘
                       │
                     Stub
                       │
                     Device
```

Single-master — *deterministic 보장*. 모든 통신 BC가 schedule.

## 1553B Message Type

```text
Word format (20 bit):
  3 bit sync
  16 bit data·command
  1 bit parity

Word types:
  Command Word (CW) — BC issued
    RT addr (5 bit)
    T/R bit (1 = RT→BC)
    Subaddr (5 bit)
    Word count (5 bit)
    
  Data Word (DW)
    16 bit data
    
  Status Word (SW) — RT response
    RT addr
    Message·status bits

Message types:
  BC → RT      (Receive)
  RT → BC      (Transmit)
  RT → RT      (BC mediation)
  Mode Command (system control)
  Broadcast
```

Word 20 bit, Message 1~32 data words. Frame deterministic.

## 1553B Schedule — Major Frame

```text
Major Frame (typical 50·100 ms):
  Periodic schedule of messages
  
예 — 100 ms major frame:
  0-10 ms:  IMU data (RT 5 → BC)
  10-20:    GPS data (RT 8 → BC)
  20-25:    Cmd RT 3 — actuator (BC → RT 3)
  25-30:    Telemetry (BC → RT 10)
  30-50:    ...
  50-100:   Reserved · aperiodic
  
Bus utilization:
  보통 < 50% (slack for aperiodic·jitter)
  
Multiplexing:
  Time-division multiplex (TDM)
  No collision possible
```

Schedule — *predetermined*. Real-time guarantee.

## 1553B 사용 사례

```text
LV·우주:
  Apollo (1960s) — 1553 precursor
  Space Shuttle
  ISS (multiple buses)
  KSLV-II (likely)
  Falcon 9 (partial)
  
Aircraft:
  F-16·F/A-18 (military)
  KC-46·B707 retrofit
  Eurofighter·Rafale
  KAI KF-21·KUH 수리온
  
Helicopters:
  Apache·Black Hawk
  Tiger·NH90

Modern alternatives:
  Faster MIL-STD-1553 (수 Mbps 변형)
  Mil-Std-1773 (fiber-optic 변형)
```

40년 — *legacy + modern* 공존.

## ARINC-429 — 민항 표준

```text
표준명:
  ARINC Specification 429
  Mark 33 Digital Information Transfer System (DITS)
  
역사:
  1977 발간
  지속 update

물리층:
  RZ (Return-to-Zero) encoding
  100 kbps high-speed, 12.5 kbps low-speed
  Twisted-pair, shielded
  
Topology:
  Unidirectional point-to-point
  1 transmitter → up to 20 receivers
  No bidirectional!
  No bus arbitration needed
  
Word format (32 bit):
  8 bit label (data type)
  2 bit SDI (source/destination identifier)
  19 bit data
  2 bit SSM (sign/status matrix)
  1 bit parity
```

각 transmitter — 자기 만 전송. *간단·robust*.

## ARINC-429 Label

```text
Label (8 bit) — 데이터 type 식별:

대표 label (3 digit octal):
  101 — selected course
  102 — selected heading
  103 — selected altitude
  201 — airspeed
  203 — altitude
  204 — vertical speed
  210 — true airspeed
  310 — present position latitude
  311 — present position longitude
  314 — true heading
  ...

ARINC-429 공인 label catalog — 1000+
각 system·subsystem 별 표준 label 사용
```

Label — *self-describing data*. 수신자가 type 판단.

## ARINC-429 사용

```text
Boeing 727·737·747·757·767·777:
  수십~수백 ARINC-429 wire
  Each box → 다른 box로 한 wire
  
Airbus A320·A330·A340:
  ARINC-429 위주
  ARINC-664/AFDX 도입 부분 (A350)
  
Smaller aircraft·biz jet:
  ARINC-429 widely
  비용·복잡도 낮음
  
LV·위성:
  덜 일반적 (1553 위주)
```

배선 무게 — 항공기 *수백 kg*. AFDX로 *근본 해결*.

## ARINC-664 / AFDX — Switched Ethernet

```text
표준명:
  ARINC-664 Part 7
  AFDX (Avionics Full-Duplex Switched Ethernet)
  Airbus trademark — ARINC-664P7가 표준
  
기반:
  IEEE 802.3 Ethernet
  100 Mbps full-duplex
  + Avionics extension
  
Avionics extension:
  Virtual Link (VL)
    Bandwidth Allocation Gap (BAG)
    Maximum Frame Size
  Redundant dual-channel (A·B)
  Deterministic routing
```

Modern — *Ethernet의 deterministic 변형*.

## AFDX Virtual Link (VL)

```text
Virtual Link (VL) 개념:
  Logical unidirectional path
  Source → multiple destinations
  
Parameters:
  VL ID (16 bit)
  BAG (Bandwidth Allocation Gap):
    Min interval between frames
    1, 2, 4, ..., 128 ms
  Maximum Frame Size (MFS):
    64 ~ 1518 bytes
  
Schedule:
  Source — VL별 BAG·MFS 준수
  Switch — VL별 enforce + policing
  
효과:
  Bounded latency
  Bounded jitter
  No congestion (policed)
  
사용:
  보통 수백~수천 VL
  각 logical message type별
```

VL — *deterministic Ethernet*. AFDX 핵심.

## AFDX Network — Dual Channel

```text
Topology:

End System (ES1) → Switch A1 ── Switch A2 → ES2
                                            
End System (ES1) → Switch B1 ── Switch B2 → ES2

각 frame — A·B 동시 송신
Receiver — first valid frame 사용 (deduplication)
한 channel fail → 다른 channel continue
  
인증:
  DO-254 (HW), DO-178C (SW)
  Switch + ES 인증 packet
  
Vendor:
  Thales TSC-A380
  Honeywell·BAE AFDX modules
  TTTech AFDX
```

Dual redundancy — *기본 내장*. Fault tolerance.

## AFDX 사용

```text
Airbus A380·A350·A220:
  AFDX 표준
  ~수백 VL
  100 Mbps 또는 1 Gbps
  
Boeing 787 Dreamliner:
  CDN (Common Data Network) = AFDX 변형
  
Boeing 777X:
  AFDX 도입 (777 classic은 ARINC-429 위주)
  
Embraer E2:
  AFDX
  
Bombardier·Mitsubishi:
  AFDX
  
LV·위성:
  AFDX 도입 부분 (Ariane 6, Vulcan)
  
TTEthernet (Time-Triggered Ethernet):
  AFDX의 확장 — TT scheduling
  Orion·Ariane 6
  IEEE 802.1AS (PTP) 기반
```

AFDX — *현대 대형기 표준*. 우주로 확산.

## SpaceWire — 우주 전용

```text
SpaceWire (ECSS-E-ST-50-12C):
  ESA·NASA·JAXA 공동 표준
  우주선 (위성·심우주) 위주
  
물리층:
  LVDS (Low-Voltage Differential Signaling)
  4 wire (2 pair) — Data·Strobe each direction
  2 ~ 400 Mbps
  Cable up to 10 m
  
프로토콜:
  Packet-based
  Routing (path 또는 logical addressing)
  Flow control
  
사용:
  ESA missions
  NASA New Horizons·MMS
  ISS Columbus
  KOMPSAT (일부)
  KARI 위성 자체
  
인증:
  ECSS standard
  NASA NPR 7150.2

장점:
  높은 대역폭 (vs 1553)
  Modular routing
  
단점:
  Avionics standard라기보단 우주 특화
  Aircraft 미사용
```

SpaceWire — *위성·심우주의 1553*. 우주 전용.

## TTP·CAN·FlexRay — 자동차·산업

```text
TTP (Time-Triggered Protocol):
  TTTech 개발
  100 Mbps·1 Gbps
  Deterministic
  자동차·항공 일부

CAN (Controller Area Network):
  자동차 표준 (Bosch 1986)
  1 Mbps
  Aerospace — actuator·sensor 통신 일부
  CANaerospace·ARINC-825 (CAN 변형)

FlexRay:
  자동차 — 차세대 CAN
  10 Mbps
  Aerospace 일부

Aerospace 사용:
  ARINC-825 — CAN-based avionics standard
  CANopen·CANaerospace
  Small aircraft·UAV·LV subsystem
```

자동차 표준 — *avionics 도용*. Cost-effective.

## Bus 비교 표

```text
Standard      | Bandwidth | Topology       | Determinism | Use
─────────────────────────────────────────────────────────────────
MIL-STD-1553B | 1 Mbps   | Multidrop      | High        | Military
ARINC-429    | 100 kbps  | P2P            | High        | Civil
ARINC-664/   | 100Mbps~  | Switched Eth   | High (VL)   | Modern
AFDX         | 1 Gbps    |                |             | civil
SpaceWire    | 400 Mbps  | Point/Router   | High        | Space
TTEthernet   | 1 Gbps    | Switched Eth   | High (TT)   | Space·new
CAN/ARINC-825| 1 Mbps    | Bus            | Medium      | Smaller
TTP          | 100 Mbps  | Bus            | High        | Auto·Aero
```

각 — *역사적 기원 + 현재 niche*.

## Avionics Bus Selection

```text
선택 기준:

Bandwidth:
  Voice·basic data → 1553·429
  Camera·SAR·heavy data → AFDX·SpaceWire
  
Determinism:
  All — deterministic
  AFDX BAG 보장
  
Redundancy:
  1553 — dual standard
  AFDX — dual A·B
  SpaceWire — programmable redundancy
  
Cost:
  Cheapest — 429 (point-to-point)
  Mid — 1553
  Premium — AFDX·SpaceWire
  
Legacy:
  Retrofit aircraft → 기존 bus 호환
  New design → AFDX preferred
  
Certification:
  All — DO-178C·DO-254 호환 evidence 존재
  AFDX·SpaceWire — switch·router 추가 인증
```

선택 — *legacy + future + budget*.

## 한국 Avionics Bus

```text
KAI KF-21 보라매:
  AFDX (mission system)
  1553 (legacy weapons interface)
  
KAI FA-50:
  1553 + ARINC-429
  
한화·LIG 미사일:
  1553 + custom
  Smaller — CAN
  
KARI KSLV-II:
  1553-like + custom serial
  SpaceWire 일부
  
KARI KOMPSAT·KPLO:
  SpaceWire + 1553
  ECSS·NASA 호환
  
인노스페이스·페리지:
  Custom serial + Ethernet
  AFDX-style 표준 도입 검토
```

한국 — *1553·AFDX·SpaceWire 모두 사용*. 자체 + commercial.

## Bus Implementation 예 — 1553

```c
// 1553 BC software (simplified)

typedef struct {
    uint16_t cmd;       /* RT addr + T/R + subaddr + count */
    uint16_t data[32];
    uint8_t  word_count;
    uint8_t  rt_addr;
    uint8_t  subaddr;
    uint8_t  tx_rx;     /* 1 = RT→BC */
} bc1553_msg_t;

void bc_run_major_frame(void) {
    /* Schedule table */
    static const bc1553_msg_t schedule[] = {
        { .rt_addr=5, .subaddr=1, .tx_rx=1, .word_count=16 }, /* IMU */
        { .rt_addr=8, .subaddr=1, .tx_rx=1, .word_count=8 },  /* GPS */
        { .rt_addr=3, .subaddr=1, .tx_rx=0, .word_count=4 },  /* Cmd */
        /* ... */
    };
    
    for (int i = 0; i < ARRAY_SIZE(schedule); i++) {
        bc1553_send_message(&schedule[i]);
        /* wait until end of message slot */
    }
}

/* RT software (responder) */
void rt_message_handler(uint8_t subaddr, uint8_t tx_rx, 
                       uint16_t *data, uint8_t count) {
    if (tx_rx == 1) {
        /* Transmit IMU·GPS data */
        memcpy(data, imu_buffer, count * 2);
    } else {
        /* Receive command */
        process_command(data, count);
    }
}
```

1553 ASIC — DDC·BAE 등 commercial chip. Driver wrap.

## 자주 하는 실수

> ⚠️ AFDX without VL config

```text
"AFDX = Ethernet" → 일반 IP traffic
→ BAG·MFS unspecified
→ Determinism 깨짐
```

→ VL 설계·configuration 우선.

> ⚠️ 1553 schedule overrun

```text
Major frame 100% 채움 + jitter
→ Overrun·deadline miss
```

→ 50% 슬랙 권장.

> ⚠️ Redundant channel 한쪽만 검증

```text
"A channel test pass"
→ B channel switch test 미실시
→ Real fault 시 fail
```

→ Cross-over test 필수.

> ⚠️ Bus integration 늦음

```text
"Subsystem 개발 후 integration 시작"
→ Bus traffic·scheduling 충돌
→ Last-minute rework
```

→ Early bus design + budget.

## 정리

- **MIL-STD-1553B** — 군용·LV 표준, 1 Mbps, BC-RT-MT.
- **ARINC-429** — 민항 legacy, point-to-point, label-based.
- **ARINC-664 / AFDX** — 현대 *switched Ethernet*, VL, 100Mbps~1Gbps.
- **SpaceWire** — 우주 전용, ESA·NASA·KARI.
- **TTEthernet** — AFDX + time-triggered, 차세대.
- **CAN/ARINC-825** — small aircraft·UAV.
- 한국 — *1553·AFDX·SpaceWire 모두 사용*.

다음 편은 **Sensors — IMU·GPS·Star tracker·Pressure**.

## 관련 항목

- [Ch 4: Computer Architecture](/blog/embedded/avionics/digital-avionics-handbook/chapter04-computer-architecture)
- [Ch 6: Sensors](/blog/embedded/avionics/digital-avionics-handbook/chapter06-sensors)
- [Launch Vehicle Flight SW Ch 6: CCSDS Space Packet](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter06-ccsds-space-packet)
