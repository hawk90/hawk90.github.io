---
title: "Ch 12: CAN 디버깅 — CANalyzer, DBC, Trigger, Bus Load"
date: 2026-05-16T12:00:00
description: "Vector·PCAN·Kvaser 상용 도구 vs 오픈소스. DBC 파일과 시나리오별 디버깅 절차."
series: "CAN Bus 심화"
seriesOrder: 12
tags: [can, debugging, canalyzer, pcan, kvaser, dbc, bus-load]
draft: true
---

## 한 줄 요약

> **"DBC 파일이 곧 CAN의 사전"** — 메시지 ID + 시그널 인코딩 정의서. 도구 절반은 DBC 해석.

## 도구 분류 — 상용 vs 오픈

| 카테고리 | 도구 | 가격대 | 강점 |
| --- | --- | --- | --- |
| **상용 — 자동차** | **Vector CANalyzer / CANoe** | $$$ ($5-50k) | OEM 표준, *시뮬레이션·CI* |
| | **PEAK PCAN-Explorer 6** | $$ ($500) | 가성비 |
| | **Kvaser CanKing** | $ ($100) | 라이트 |
| **상용 — 산업** | **IXXAT canAnalyser** | $$ | EtherCAT·CANopen |
| **오픈** | **can-utils + Wireshark** | 무료 | Linux 기본 |
| | **SavvyCAN** | 무료 | GUI + reverse-engineering |
| | **BUSMASTER** | 무료 (BSD) | Bosch 후원 |

선택:
- *자동차 OEM* — Vector 사실상 강제.
- *연구·hobbyist* — can-utils + SavvyCAN.
- *산업 CANopen* — IXXAT 또는 CANopenNode + Vector.

## DBC 파일 — CAN의 사전

Vector가 정의한 *de facto 표준* 메시지 description.

```text
BO_ 100 EngineData: 8 ECU_Engine
  SG_ EngineSpeed   : 0|16@1+ (0.125, 0)    [0|8031.875] "rpm"  Driver
  SG_ Throttle      : 16|8@1+ (1, 0)        [0|100]     "%"    Driver
  SG_ EngTemp       : 24|8@1+ (1, -40)      [-40|215]   "°C"   Driver

BO_ 200 VehicleStatus: 8 ECU_Body
  SG_ VehicleSpeed  : 0|16@1+ (0.01, 0)     [0|655.35]  "km/h" Driver
  SG_ DoorStatus    : 16|4@1+ (1, 0)        [0|15]      ""     Driver
```

### 구문 해석

```text
BO_ <CAN-ID> <MessageName>: <DLC> <Transmitter>
  SG_ <SignalName> : <StartBit>|<Length>@<ByteOrder><Sign> (<Factor>, <Offset>) [<Min>|<Max>] "<Unit>"  <Receiver>
```

- `@1` — little-endian (Intel), `@0` — big-endian (Motorola)
- `+` — unsigned, `-` — signed
- `Factor·Offset` — physical = raw × factor + offset

### DBC 만들기

- **Vector CANdb++** — 표준 GUI 에디터
- **canmatrix** — Python, 변환 (DBC ↔ KCD ↔ ARXML)
- **cantools** — Python, *수동 작성 + 디코드*
- 텍스트 에디터 — 작은 DBC는 직접 편집

OEM은 *각자의 DBC*를 보유 + NDA. *역공학* (SavvyCAN의 *reverse engineering tab*)으로 *알려진 신호*를 매핑.

## 시나리오별 디버깅

### 시나리오 1 — 새 ECU가 *조용함*

순서:
1. **CAN_H·CAN_L 전압** 확인 — 멀티미터로 ~2.5V 평균 (Recessive)
2. **트랜시버 V_CC** — 5V (또는 3.3V) 정상
3. **termination 120 Ω** — 무전원에서 측정 — 양 끝 + 60 Ω 합성
4. **MCU CAN 페리퍼럴 시동** — STM32 ESR 레지스터 (BOFF, EPVF)
5. **Loopback mode 시험** — 자기 송수신
6. **2 노드 연결 시험** — 다른 노드와 통신

### 시나리오 2 — 간헐 에러

- 카운터 모니터링 — TEC/REC 시간별 추이
- 로직 분석기 캡처 — **bit-level**로 *어디서 깨지는지*
- 종단·풀업 확인
- 다른 노드 *과도 송신*인지 — 우선순위 미스매치

### 시나리오 3 — Bus-Off 반복

- LEC (Last Error Code) 기록 → *어떤 에러 유형*
- 트랜시버 파형 — *Dominant 출력 정상인가*
- ID 충돌 — 두 노드가 같은 ID 송신 시도
- *Auto-recovery* 설정 후에도 반복이면 *하드웨어 문제*

### 시나리오 4 — Latency 측정

```bash
# 송신·수신 타임스탬프 차
candump -t a can0 | tee log.txt

# 또는 wireshark/SocketCAN dissector로 분석
```

평균 latency = 메시지 송신 시각 vs 수신 시각 차. WCRT 분석과 비교.

### 시나리오 5 — Bus Load

```bash
cangen can0 -g 0 -L 8 -D random    # 부하 생성 (best effort)

# 통계
ip -s -d link show can0
candump can0 | wc -l               # 초당 메시지
```

상용 도구는 *그래프*로 실시간 표시.

**경고선**:
- *< 30%* — 안전
- *30-50%* — 정상
- *50-70%* — 주의
- *> 70%* — 마지노선 (안전 critical 시스템은 회피)

## DBC + 도구 활용 — Wireshark

`wireshark`가 SocketCAN dissector 내장. `~/.config/wireshark/socketcan` 또는 plugin으로 DBC 적용.

```bash
sudo tshark -i can0 -V              # verbose, 패킷별 표시
# 또는 GUI
wireshark -i can0
```

자동차 OEM에서 *시스템 통합 시험*에 wireshark + DBC = 강력한 조합.

## 시뮬레이션 — CI/CD 통합

### vcan + Pytest

```python
# test_can_protocol.py
import can, cantools
import pytest

@pytest.fixture
def vcan():
    bus = can.interface.Bus('vcan0', bustype='socketcan')
    yield bus
    bus.shutdown()

def test_engine_rpm_decode(vcan):
    db = cantools.database.load_file('vehicle.dbc')
    # raw frame 송신
    msg = can.Message(arbitration_id=0x100,
                      data=[0x00, 0x10, 0, 0, 0, 0, 0, 0])
    vcan.send(msg)
    rx = vcan.recv(timeout=0.1)
    decoded = db.decode_message(rx.arbitration_id, rx.data)
    assert decoded['EngineSpeed'] == 512.0   # 0x1000 × 0.125
```

자동화된 *프로토콜 적합성 테스트* — 양산 ECU 검증의 표준.

## Vector CANoe — 통합 시뮬레이션

Vector의 *CANalyzer + 시뮬레이션 + 자동 테스트* 통합 도구. 자동차 OEM 사실상 표준.

- **CAPL** — 자체 스크립트 언어 (C-like)
- **Trace window** — 캡처
- **Bus statistics** — bus load, error count
- **Network simulation** — 실 ECU 없이 *가상 ECU* 시뮬레이션
- **Test feature** — 자동 회귀 테스트

가격 $5-50k지만 *없으면 자동차 OEM 협업 안 됨*.

## 자주 하는 실수

> ⚠️ DBC 없이 raw 헤매기

DBC 없이 *바이트 0x10·0x20 의미 추측* — *시간 낭비*. *최소한 PGN/SPN 표준* 참조.

> ⚠️ Trigger 없이 시간 캡처

5분 캡처 = 수십만 메시지. *grep*에서 길 잃음. **trigger on ID + 변화 조건**으로 좁히기.

> ⚠️ Bus load 안 측정

ECU 추가하면서 *bus load 70% 넘김* → 운영 중 *간헐 latency*. **신 메시지 추가 시 항상 load 재계산**.

> ⚠️ Endianness 추측

DBC `@0` (Motorola) vs `@1` (Intel). *추측 말고* 데이터시트·DBC 명시 확인.

> ⚠️ Logic analyzer만 사용

CAN 전기 사양 (V_CC, termination, common-mode)은 *DSO 또는 멀티미터*가 답. 로직 분석기로는 *디지털만*.

## 정리 — 시리즈 마무리

- 자동차 디버깅 = **Vector CANalyzer + DBC** (사실상 표준).
- 오픈/임베디드 = **can-utils + SocketCAN + python-can**.
- **DBC**가 모든 도구의 *공통 사전*.
- **Bus load 30-50% 이하**로 여유.
- *시뮬레이션 (vcan)* + *DBC 디코드*로 CI/CD에 통합.

12편 시리즈 완료. CAN 2.0 → CAN FD → CAN XL → CANopen → J1939 → SocketCAN → 디버깅까지. **다음 시리즈** 후보 — *Industrial Ethernet 심화* (EtherCAT/PROFINET/TSN) 또는 *MIPI* (D-PHY/C-PHY/CSI-2/DSI).

## 관련 항목

- [Ch 11: SocketCAN](/blog/embedded/protocols/can-bus/chapter11-socketcan)
- [Industrial Ethernet 심화](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)
- [MIPI 심화](/blog/embedded/protocols/mipi/chapter01-overview)
