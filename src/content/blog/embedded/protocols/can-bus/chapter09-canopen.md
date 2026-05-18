---
title: "Ch 9: CANopen — Object Dictionary, SDO, PDO, NMT (CiA 301)"
date: 2027-04-01T09:00:00
description: "CAN 위에 얹은 산업 자동화 표준. Object Dictionary가 모든 노드 데이터의 골격."
series: "CAN Bus 심화"
seriesOrder: 9
tags: [canopen, sdo, pdo, nmt, object-dictionary, cia-301]
draft: true
---

## 한 줄 요약

> **"CAN ID = 노드 + 메시지 종류, 데이터 = Object Dictionary 인덱스"** — 모든 트랜잭션의 의미가 표준화.

## CANopen — 왜 만들었나

CAN 자체는 *프로토콜 없음* — 비트만 전달. *어느 ID가 무엇인지*, *데이터 바이트의 의미*는 시스템 설계자가 결정. 결과 — *벤더마다 다른 방언*, 상호 운용 0.

**CANopen** (CiA 301)이 표준화:
- **노드 ID** (1-127)
- **메시지 종류**별 CAN ID 할당 규칙
- **Object Dictionary** — 노드 데이터의 일관된 모델
- **SDO·PDO·NMT** — 전송 방식
- **EDS/DCF** — 디바이스 description 파일

산업 모션 (서보·스테퍼), 의료, 해양, 일부 자동차 보조.

## Object Dictionary (OD)

각 노드의 *데이터 카탈로그*. **16-bit Index + 8-bit Sub-index**.

```text
Index   Sub-index  Type     Access   Description
0x1000  0x00       UINT32   RO       Device Type
0x1001  0x00       UINT8    RO       Error Register
0x1008  0x00       STRING   RO       Manufacturer Device Name
0x1018  0x01       UINT32   RO       Vendor ID
0x1018  0x02       UINT32   RO       Product Code
0x1400  0x01       UINT32   RW       RPDO1 COB-ID
0x1600  0x01       UINT32   RW       RPDO1 Mapping[0]
0x6040  0x00       UINT16   RW       Controlword (CiA 402 motion)
0x6041  0x00       UINT16   RO       Statusword
0x607A  0x00       INT32    RW       Target Position
```

### 영역 분할

| Index 범위 | 용도 |
| --- | --- |
| 0x0001-0x0FFF | 데이터 타입 정의 |
| **0x1000-0x1FFF** | **Communication 영역** (필수) |
| 0x2000-0x5FFF | Manufacturer-specific |
| 0x6000-0x9FFF | Standardized device profile (CiA 4xx) |
| 0xA000-0xFFFF | Standardized network variable |

CiA 402 (서보·드라이브), CiA 401 (IO 모듈), CiA 410 (인클리노미터) 등 *프로파일* 표준 다수.

## SDO — Service Data Object (Confirmed Transfer)

*확정 전송* — Request → Response 페어. *큰 데이터·설정 변경*에 사용. 작은 빈도.

### 한 트랜잭션 — Expedited (≤ 4 byte)

```text
Client → Server  (Read request, OD 0x607A):
  CAN ID: 0x600 + node_id
  Data: 40 7A 60 00 00 00 00 00
        └ command 0x40 = "Initiate Upload Request"
           └─ index 0x607A (little-endian)
              └─ subindex 0x00

Server → Client (Response, value = 0x12345678):
  CAN ID: 0x580 + node_id
  Data: 43 7A 60 00 78 56 34 12
        └ command 0x43 = "Initiate Upload Response, 4 bytes"
           └─ index/sub (echo)
              └─ value (little-endian)
```

> 💡 **CAN ID 규칙**: SDO Client → Server = `0x600 + ID`, Server → Client = `0x580 + ID`.

### Segmented Transfer (> 4 byte)

`Initiate` + `Download/Upload Segment` × N. 진행 토글 비트. 표준 SDO 처리량 ~1 KB/s 정도.

### Block Transfer (대용량)

SDO Block Transfer — 펌웨어 OTA 등 *수 MB* 데이터. 7-byte segment를 *애크 없이* 128개 묶음 전송 → 확인. 처리량 ~10-50 KB/s.

## PDO — Process Data Object (Real-Time)

*비확정 broadcast*. 송신자 1, 수신자 N. 데이터 흐름의 *주력*.

### TPDO (Transmit) / RPDO (Receive)

각 노드가 *최대 4 TPDO + 4 RPDO* (기본). PDO 매핑 — *Object Dictionary 엔트리들*을 하나의 8-byte CAN 메시지로 묶음.

```text
TPDO1 매핑 예 (OD 0x1A00 sub-index):
  0x6041:00 (UINT16, 2 byte) - Statusword
  0x6064:00 (INT32, 4 byte) - Position Actual
  0x6044:00 (INT16, 2 byte) - Velocity Actual
  총 = 8 byte (CAN 2.0 한계)
```

### Transmission Type

- **0x00** — Synchronous acyclic — SYNC 후 *변화 있을 때만* 송신
- **0x01-0xF0** — Synchronous cyclic — N번째 SYNC마다 송신
- **0xFE** — Event-driven manufacturer
- **0xFF** — Event-driven device profile

SYNC 메시지 (CAN ID 0x80) — 마스터가 정기적으로 broadcast → 모든 TPDO 노드가 동시 송신. 결정성 보장.

### Default COB-ID (Pre-Defined Connection Set)

| 메시지 | CAN ID |
| --- | --- |
| NMT | 0x000 |
| SYNC | 0x080 |
| TIME | 0x100 |
| EMCY (Emergency, node X) | 0x080 + X |
| TPDO1 | 0x180 + X |
| RPDO1 | 0x200 + X |
| TPDO2 | 0x280 + X |
| RPDO2 | 0x300 + X |
| TPDO3 | 0x380 + X |
| RPDO3 | 0x400 + X |
| TPDO4 | 0x480 + X |
| RPDO4 | 0x500 + X |
| SDO TX | 0x580 + X |
| SDO RX | 0x600 + X |
| NMT Heartbeat | 0x700 + X |

이 표 외워두면 *프로토콜 분석기*에서 메시지 종류 즉시 식별.

## NMT — Network Management

마스터 1대가 *전 네트워크 상태* 제어.

### NMT State Machine

```text
[Initialization] → Boot-up → [Pre-Operational]
                              ↓ Start Remote Node
                          [Operational]
                              ↓ Enter Pre-op
                          [Pre-Operational]
                              ↓ Stop Remote Node
                          [Stopped]
                              ↓ Reset
                          [Initialization]
```

| 상태 | 동작 |
| --- | --- |
| **Initialization** | 부팅, OD 로드 |
| **Pre-Operational** | SDO·NMT·EMCY OK, PDO 비활성 |
| **Operational** | 모두 활성 (정상 운영) |
| **Stopped** | NMT·Heartbeat만 |

### NMT 명령 (CAN ID = 0x000)

```text
Data[0] = command
  0x01 = Start Remote Node
  0x02 = Stop Remote Node
  0x80 = Enter Pre-Operational
  0x81 = Reset Node
  0x82 = Reset Communication
Data[1] = node ID (0 = all nodes)
```

### Heartbeat — 노드 살아있나

각 노드가 *주기적* (보통 1초) Heartbeat 송신. CAN ID = `0x700 + node_id`, Data[0] = 현재 NMT state. 마스터가 *3 cycle 안 받으면 노드 실패* 판정.

## EMCY — Emergency Message

심각한 오류 (모터 과부하, 센서 fault) 발생 시 *즉시 broadcast*. CAN ID = `0x080 + node_id`.

```text
Data[0-1] = Error code (0x0000 = no error, 0x4310 = temperature, ...)
Data[2]   = Error register (OD 0x1001)
Data[3-7] = Manufacturer-specific
```

## EDS / DCF 파일

**EDS (Electronic Data Sheet)** — 디바이스의 OD를 *INI 파일*로 기술. CANopen 도구 (Vector CANeds, CiA 표준 파서)에서 import.

```ini
[1000]
ParameterName=Device Type
DataType=0x0007
AccessType=ro
DefaultValue=0x00040192

[6040]
ParameterName=Controlword
DataType=0x0006
AccessType=rw
```

**DCF (Device Configuration File)** — EDS + *특정 노드의 값*. 시스템 통합 후 *백업 ↔ 복원*.

## CANopen FD

CAN FD에 맞춘 *확장 표준* (CiA 1301). 핵심 변화:

- PDO 페이로드 8 → 64 byte
- USDO (Universal SDO) — 더 빠른 전송
- SRDO (Safety-related Data Object) — 안전 critical 메시지
- 기존 CANopen과 *상호운용*

## 코드 — 오픈소스 stack

- **CANopenNode** (GPL) — github.com/CANopenNode — 임베디드 표준
- **CanFestival** (LGPL) — Linux + 임베디드
- **CANopenSocket** (GPL) — Linux SocketCAN 위
- 상용 — Vector, IXXAT, Microchip

```c
// CANopenNode 사용 예 — 최소 노드 시작
#include <CO_app_OD.h>
CO_t *CO = CO_new(&CO_Config, NULL);
CO_CANsetConfigurationMode(NULL);
CO_CANmodule_init(...);
CO_CANopenInit(CO, ..., NMT_NODE_ID, ...);
CO_CANsetNormalMode(CO->CANmodule);

while (1) {
    CO_process(CO, false, 1, NULL);   // 1ms tick
}
```

## 자주 하는 실수

> ⚠️ OD 인덱스 little-endian 무시

`0x607A` SDO 송신 시 데이터 바이트는 `7A 60` (LE). 큰 endian으로 보내면 *Object not found*.

> ⚠️ NMT Operational 빼고 PDO 보냄

NMT 명령으로 *Operational* 진입 후에만 PDO 활성. *Pre-Operational에서 PDO는 무시됨*.

> ⚠️ Heartbeat timeout 너무 짧음

100 ms Heartbeat + 200 ms timeout → 운영 중 *간헐 timeout*. 평소 cycle의 *3-5배* 여유.

> ⚠️ EDS 안 만듦

EDS 없이 *수동 OD* — 다른 팀 도구에서 *못 읽음*. 양산 디바이스는 EDS 필수.

## 정리

- CANopen = **OD + SDO + PDO + NMT + EMCY**.
- OD index 0x1000-0x1FFF는 표준 *Communication*, 0x6000+는 *프로파일*.
- **PDO**가 실시간 broadcast (TPDO 송신 / RPDO 수신).
- **NMT** 마스터가 전 네트워크 상태 머신 제어.
- **CiA 402** (모션), **CiA 401** (IO) 프로파일이 표준화 핵심.
- CANopen FD가 CAN FD 위로 확장.

다음 편은 **J1939** — 상용차의 표준.

## 관련 항목

- [Ch 8: CAN XL](/blog/embedded/protocols/can-bus/chapter08-can-xl)
- [Ch 10: J1939](/blog/embedded/protocols/can-bus/chapter10-j1939)
