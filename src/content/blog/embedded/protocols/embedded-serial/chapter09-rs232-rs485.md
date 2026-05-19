---
title: "Ch 9: RS-232·RS-485 — 전기 사양, Differential, Modbus"
date: 2026-05-16T09:00:00
description: "UART 위에 얹는 PHY. RS-232로 ±12V, RS-485로 differential·1.2km·multi-drop."
series: "Embedded Protocols 심화"
seriesOrder: 9
tags: [rs232, rs485, modbus, differential, multidrop, termination]
draft: true
---

## 한 줄 요약

> **"UART는 프로토콜, RS-232/485는 PHY"** — 같은 UART 비트열을 어떤 *전기 신호*로 흘리느냐의 문제.

## 어떤 문제를 푸는가

MCU의 UART 핀은 보통 *3.3V TTL*. 그대로는:
- **15 m 넘으면 노이즈에 죽음** — single-ended라 EMI 약함.
- **PC RS-232 포트와 호환 안 됨** — PC는 ±12V 신호.
- **여러 장치를 한 버스에 못 붙임** — point-to-point only.

해결책이 *RS-232 transceiver* (MAX232 등)와 *RS-485 transceiver* (MAX485, SN75176 등). 모두 UART 비트는 *동일*하고 **전기 신호만 변환**.

## 한눈에 보는 구조

![RS-485 differential signaling and bus](/images/blog/embedded-serial/diagrams/ch09-rs485-bus.svg)

RS-485는 두 라인 (A·B)의 *전압 차*로 비트를 표현. 거리 1.2 km, 노드 32개, 노이즈 강함.

## RS-232 — 옛 PC 시리얼

| 항목 | 값 |
| --- | --- |
| 전기 | Bipolar — Mark = -3 to -15V, Space = +3 to +15V |
| 토폴로지 | Point-to-point |
| 거리 | ≤15 m (실제로 ~5 m 안정) |
| 속도 | ≤115200 (일반) |
| 노이즈 내성 | 약 (single-ended) |

### Transceiver

대표 칩 — **MAX232** (TI/Maxim). 3.3V/5V TTL ↔ ±10V 변환. 외부 *charge pump 캐패시터* 4개로 음전압 생성.

```text
MCU TX ──► MAX232 IN ── (음/양 ±10V) ──► DB-9 핀 3 (TXD)
                                            (PC 또는 다른 RS-232)
DB-9 핀 2 (RXD) ──► MAX232 OUT ──► MCU RX
```

요즘은 PC에 시리얼 포트가 없으므로 *USB-to-Serial 어댑터* (FT232, CH340)로 대체.

## RS-485 — 산업·장거리 표준

| 항목 | 값 |
| --- | --- |
| 전기 | Differential — A·B 두 라인의 *차이* (V_A - V_B) |
| 비트 | `+1` = V_A > V_B (≥ 200 mV) → `0` (Low) `0` = V_B > V_A → `1` (High) |
| 토폴로지 | Multi-drop bus (선형) |
| 거리 | ≤1200 m @ 100 kbps, ≤12 m @ 10 Mbps |
| 노드 수 | 32 standard / 256 with 1/8 unit load 트랜시버 |
| 신호 | Half-duplex (2-wire), Full-duplex (4-wire 옵션) |
| 노이즈 내성 | 강 (common-mode rejection) |

### Differential의 장점

`A`와 `B` 라인이 *같이* 노이즈를 받아도 *차이*는 유지 → **공통 모드 노이즈 제거**. 모터·인버터 근처에서도 통신 가능.

### Transceiver

![MAX485 transceiver + termination + bias](/images/blog/embedded-serial/diagrams/ch09-rs485-transceiver.svg)

대표 칩 — **MAX485**, **SN75176**, **THVD1450** (TI 모던). 핀 4-8개:
- `D` (Driver Input) — TTL TX 입력
- `R` (Receiver Output) — TTL RX 출력
- `DE` (Driver Enable) — TX 활성
- `/RE` (Receiver Enable) — RX 활성 (보통 active low)
- `A`, `B` — 버스 라인
- `GND`, `VCC`

### Half-Duplex Direction Control

2-wire RS-485에서 *송수신을 같은 라인에서* 하므로 `DE`를 적시 토글:

```c
void rs485_send(uint8_t *data, size_t len) {
    HAL_GPIO_WritePin(RS485_DE_GPIO_Port, RS485_DE_Pin, GPIO_PIN_SET);  // TX 모드
    HAL_UART_Transmit(&huart1, data, len, HAL_MAX_DELAY);
    while (!__HAL_UART_GET_FLAG(&huart1, UART_FLAG_TC));  // 전송 완료 대기
    HAL_GPIO_WritePin(RS485_DE_GPIO_Port, RS485_DE_Pin, GPIO_PIN_RESET); // RX 모드
}
```

> ⚠️ **TC (Transmission Complete) 플래그**가 핵심. TXE (TX Empty)만 보고 DE를 끄면 *마지막 바이트의 마지막 비트가 잘림*. STM32에 *DE 자동 제어* 기능 (`RS485Enable`)이 있어 활용 권장.

## Termination·Biasing — RS-485 성공의 80%

### Termination

선 끝에서 *신호 반사*를 막기 위한 종단 저항. 케이블 임피던스 (보통 120 Ω twisted pair)에 맞춰 **양쪽 끝에 120 Ω**.

```text
[Master] ── 120Ω ──── A ── B ──── 120Ω ── [Slave N]
                      │   │
                   [Slave 1] [Slave 2]
                   (no termination)
```

### Biasing — Idle 라인의 정의

라인 idle 상태에서 *A·B가 같은 전압*이면 수신기 출력이 *불안정*. **Bias 저항**으로 idle 시에도 *작은 차이* (≥200 mV) 유지.

```text
+5V ──── 680Ω ──── A
                          (idle bias)
GND ──── 680Ω ──── B
```

상용 RS-485 보드는 보통 *jumper*로 termination·bias on/off.

## RS-422 — Full-Duplex Differential 자매

RS-485가 *half-duplex multi-drop*이라면, RS-422는 *full-duplex point-to-(multi)point*. **4-wire** (송신 쌍 + 수신 쌍 분리).

| 항목 | RS-422 | RS-485 |
| --- | --- | --- |
| 와이어 | 4 (TX+/TX-/RX+/RX-) | 2 (A/B half) 또는 4 (full) |
| Duplex | Full-duplex | Half-duplex (보통) |
| Master | **1 master, N slaves (32)** | N master, N slaves |
| 마스터 송신 | TX+/- → 모든 slave RX | 양보 중재 (multi-master) |
| 슬레이브 송신 | 자기 슬롯에서만 TX 가능 (충돌 회피) | DE 토글 |
| 트랜시버 | SN75ALS191, MAX489 등 | MAX485 등 |
| 거리·속도 | 1200 m @ 100 kbps | 동일 |

### 사용처

- **Yamaha MIDI Star Topology** — 1 master → 다수 음원
- **CCTV Pan-Tilt-Zoom 카메라** — 컨트롤러 → 다수 카메라 (RS-422 호환 모드)
- **공장 자동화** (옛 시스템) — DCS → 다수 PLC

### Termination

RS-422도 *종단 120 Ω* 필요. 단, *각 receiver pair*마다 한 개 (마지막 receiver). TX 쌍은 *송신자만*이므로 receiver 측 한 군데.

### RS-485 트랜시버로 호환

대부분 RS-485 트랜시버 (MAX485)가 *RS-422 호환*. *4-wire 모드*로 쓰면 RS-485 full-duplex = RS-422.

## Profibus DP — RS-485 위 자동화 표준

PROFIBUS DP (Decentralized Periphery) — Siemens가 1989년 발표, IEC 61158. *PLC ↔ 분산 IO*의 표준.

### RS-485 변형

- 12 Mbps까지 (RS-485 표준 한계 초과 — 특수 트랜시버)
- 노드 32 (segment당), 리피터로 4 segment = 126 노드
- **EIA-485-A** (RS-485 강화 버전)
- DB-9 또는 M12 4-pin 커넥터

### 통신 모델

```text
PLC (마스터) ──┬── Slave 1 (IO 모듈)
                ├── Slave 2 (드라이브)
                ├── Slave 3 (HMI)
                └── ...
```

마스터가 *주기적 polling* (cyclic) — 매 슬레이브에 *작은 데이터 교환*. cycle time 1-10 ms (시스템 크기에 따라).

### 후속 — Profinet

Profibus DP는 *Ethernet으로 진화* → **PROFINET** (실시간 이더넷). PROFIBUS DP는 *레거시 시스템*에 여전히 운영. PROFINET 시리즈 별도 (Industrial Ethernet 카테고리).

## Modbus RTU — RS-485 위 산업 프로토콜

거의 모든 PLC·산업 센서·인버터의 표준. 1979년 Modicon 정의.

### 프레임 구조

![Modbus RTU frame structure](/images/blog/embedded-serial/diagrams/ch09-modbus-rtu-frame.svg)

```text
[Slave Addr (1B)] [Function Code (1B)] [Data (N B)] [CRC-16 (2B)]
                  ↑                                  ↑
                Read/Write 종류                       Modbus CRC
```

### 흔한 함수 코드

| Code | 의미 | 데이터 |
| --- | --- | --- |
| 0x01 | Read Coils (1-bit) | 시작 주소 + 개수 |
| 0x03 | Read Holding Registers (16-bit) | 시작 주소 + 개수 |
| 0x05 | Write Single Coil | 주소 + 값 |
| 0x06 | Write Single Register | 주소 + 값 |
| 0x10 | Write Multiple Registers | 시작 + 개수 + 데이터 |

### 프레임 경계

UART는 *프레임 경계 표시 안 됨* → Modbus는 **3.5 character time idle**로 프레임 종료. 9600 baud → 3.5 char × ~1 ms = **3.65 ms idle**. STM32 IDLE 인터럽트로 자연 검출.

### 메시지 예 — Holding Register 5개 읽기

```text
TX: 01 03 00 00 00 05 85 C9
     ↑  ↑   ↑     ↑    ↑
     │  │   │     │    CRC
     │  │   │     5개
     │  │   주소 0
     │  Read HR
     슬레이브 1

RX: 01 03 0A AA BB CC DD EE FF 11 22 33 44 [CRC]
     ↑  ↑  ↑  └────── 10 bytes data ──────┘
     │  │  10
     │  Read HR
     슬레이브 1
```

라이브러리 — `libmodbus` (C), `pymodbus` (Python), Modbus-Pi-Pico (RP2040).

## DMX-512 — 조명용 RS-485 변종

RS-485 PHY 위에 *512개 채널의 1-바이트 값*을 한 패킷에 보내는 표준. 콘서트·연극 조명의 사실상 표준.

```text
Reset (>88 µs Low) ── Start ── Ch0 ── Ch1 ── ... ── Ch511 ── Reset
                       (0x00)  (8 data + 2 stop)
```

baud rate **250 kbps** 고정. STM32 UART로 발생시킬 수 있지만 *Break (>88 µs Low)* 생성이 까다로움 → 보통 *전용 IC* 또는 GPIO + 타이머 트릭.

## 자주 하는 실수

> ⚠️ Termination 누락 또는 양쪽 끝 아닌 곳에

긴 RS-485 버스에 termination 없으면 *반사*로 신호 깨짐. 양 *끝*에만 120 Ω, 중간 노드는 termination 빼야.

> ⚠️ DE/RE 타이밍 잘못

전송 후 너무 빨리 DE Off → 마지막 비트 손실. 너무 늦게 → 응답 슬레이브와 충돌. **TC 플래그** 대기가 정답.

> ⚠️ A·B 라인 반대

A/B 라벨이 *제조사마다 반대*인 케이스 있음. 신호 안 가면 A·B 바꿔 시도.

> ⚠️ Common ground 부재

RS-485는 differential이지만 *common-mode 한계* (±7V 또는 ±12V)가 있어 *GND wire* 또는 *접지*가 필수. 떨어진 두 시스템 GND가 7V 넘게 다르면 트랜시버 손상.

## 정리

- RS-232는 **±12V single-ended**, 점대점, 옛 PC 시리얼.
- RS-485는 **differential**, multi-drop, 1.2 km, 32 노드.
- RS-485 성공의 80%는 **termination + biasing**.
- **Modbus RTU**가 산업 표준 — `Addr + Func + Data + CRC` 프레임.
- DE/RE 타이밍은 **TC 플래그** 기준.

다음 편은 **Linux Device Tree** — SPI/I²C/UART를 디바이스 트리로 선언.

## 관련 항목

- [Ch 8: UART 심화](/blog/embedded/protocols/embedded-serial/chapter08-uart-advanced)
- [Ch 10: Linux Device Tree](/blog/embedded/protocols/embedded-serial/chapter10-linux-device-tree)
- [CAN 시리즈](/blog/embedded/protocols/can-bus/chapter01-overview) — 다른 자동차/산업 버스
