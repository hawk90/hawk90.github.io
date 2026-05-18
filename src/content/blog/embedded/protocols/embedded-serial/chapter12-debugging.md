---
title: "Ch 12: 디버깅 종합 — Logic Analyzer, DSO, sigrok, 시나리오별 도구"
date: 2027-03-01T12:00:00
description: "Saleae·sigrok·oscilloscope의 결합. SPI·I²C·UART·RS-485를 시각화하는 7가지 시나리오."
series: "Embedded Protocols 심화"
seriesOrder: 12
tags: [debugging, logic-analyzer, sigrok, saleae, oscilloscope, protocol-decoder]
draft: true
---

## 한 줄 요약

> **"안 보이면 디버그도 못 한다"** — 로직 분석기 한 번이 보드 디버깅 시간을 *몇 시간 → 몇 분*으로 줄입니다.

## 어떤 문제를 푸는가

UART·SPI·I²C·RS-485가 *말 안 들으면* 어디가 문제인지 알 길이 없습니다. 핀에 멀티미터 댔자 *디지털 신호*는 의미 없음. **로직 분석기**가 표준 답:

1. 신호 캡처
2. 프로토콜 디코더로 *바이트 단위 해석*
3. 트리거로 *특정 시점* 잡기

## 도구 분류

| 도구 | 가격대 | 강점 | 약점 |
| --- | --- | --- | --- |
| **Saleae Logic 8/16** | $400-1500 | UI 최고, 디코더 풍부 | 비쌈 |
| **sigrok + DSLogic** | $100-200 | 오픈소스 SW, 가격 좋음 | UI 거침 |
| **Sigrok + 저가 Cypress USB** | $5-20 | "fx2lafw" 클론 | 24 MS/s 한계 |
| **Hantek 4032L** | $200 | 32 채널 | UI 옛스럽 |
| **Rigol DS1054Z + decoder** | $400 | 오실로 + 디지털 + 디코더 | 채널 적음 |
| **Lecroy / Tek** | $5k+ | 전문가급 | 가격 |

**입문 권장** — Saleae Logic 8 정품 또는 *Saleae 클론 (8 ch, $10) + sigrok*. 후자는 PulseView가 잘 동작.

## 도구 선택 — 시나리오별

### 시나리오 1 — UART printf가 나오긴 하는데 깨짐

→ **로직 분석기 + UART decoder**. baud rate 확인. *0xCC*나 *0xAA* 같은 *주기적* 비트 패턴이 나오면 baud 불일치.

### 시나리오 2 — I²C 슬레이브가 NACK

→ **로직 분석기 + I²C decoder**. 첫 바이트 ACK까지 봤다면 *주소 OK + 슬레이브 응답*. 두 번째 바이트에서 NACK면 *주소만 다른 슬레이브가 끼어든* 가능성.

### 시나리오 3 — SPI Mode 0과 Mode 3 헷갈림

→ **DSO** (디지털 신호 + 모서리 모양). 로직 분석기는 *deskew*된 깨끗한 디지털을 보여서 *실제 모서리*를 못 봄. SCLK idle level 확인은 *DSO* 가 정답.

### 시나리오 4 — RS-485 통신 안 됨

→ **DSO 차동 모드** 또는 **2 채널** (A·B 둘 다). 차이 V_A - V_B를 직접 봐야. termination·biasing 문제 진단.

### 시나리오 5 — DMA RX가 데이터 일부 놓침

→ **로직 분석기 + UART decoder + SW logging**. UART 라인엔 다 보이지만 DMA 버퍼엔 일부만? → DMA 처리 + 코드 동시 캡처.

### 시나리오 6 — Stuck Bus (SCL Low 고정)

→ **로직 분석기**. SCL 영구 Low면 마스터 또는 슬레이브 하나가 잡고 있음. *전원 사이클 후 회복 여부*로 분리.

### 시나리오 7 — 간헐적 비트 에러 (1/10000 케이스)

→ **로직 분석기 + 트리거 on framing error / NACK**. 트리거 셋업이 까다롭지만 *원인 시점*을 정확히 잡음.

## sigrok / PulseView 사용

```bash
# 설치
sudo apt install sigrok-cli pulseview

# CLI로 캡처
sigrok-cli --driver=fx2lafw --samples=10M --channels=D0=SDA,D1=SCL \
           --output-format=csv --output-file=cap.csv

# GUI
pulseview &
# Add Decoder → I2C → I2C channels 매핑
# Run
```

PulseView UI에서 *trigger*, *protocol decoder stacking* (I²C → SMBus → 더 위 프로토콜) 가능.

## 트리거 셋업

복잡한 시나리오는 *특정 바이트 시퀀스*에서만 캡처:

| 트리거 | 의미 |
| --- | --- |
| Edge on SCL | 첫 클럭 |
| Pattern: `S addr=0x68 W` | 슬레이브 0x68 write 시작 |
| Pattern: `NACK` | 어떤 슬레이브든 NACK |
| Pattern: 특정 데이터 바이트 | 에러 코드 발생 |

Saleae는 *프로토콜 디코더 후*의 결과를 트리거로 쓸 수 있어 강력 (예: "I²C write to 0x68 with reg=0x6B value=0x80").

## 오실로스코프와의 결합

신호 *모서리 품질*은 로직 분석기로 안 보임. DSO가 필요한 케이스:

- **Rise time / fall time** — 풀업 약함, 트레이스 너무 김
- **Overshoot / ringing** — 종단 안 됨
- **Crosstalk** — 인접 라인 신호 누설
- **Common-mode noise** — RS-485 noise margin

DSO + 디지털 채널 + decoder를 결합하면 *DSO 화면에 디코딩된 바이트* 표시 (Rigol DS1000Z, Siglent SDS, Lecroy).

## Loopback Test 패턴

페리퍼럴 자체 *살아있나* 확인. 보드 살리는 첫 단계.

### UART Loopback

TX·RX 핀을 *점퍼로 연결* (또는 페리퍼럴 내장 loopback mode).

```c
HAL_UART_Transmit(&huart1, (uint8_t*)"PING", 4, 100);
uint8_t buf[4];
HAL_UART_Receive(&huart1, buf, 4, 100);
assert(memcmp(buf, "PING", 4) == 0);  // OK = 페리퍼럴 살아있음
```

페리퍼럴 *내부 loopback mode* (STM32 USART_CR3.HDSEL=1, 일부 칩)로 *핀 안 거치고* 시험 가능.

### SPI Loopback

MOSI·MISO 핀을 *점퍼*. 마스터 모드에서:

```c
uint8_t tx[4] = {0xDE, 0xAD, 0xBE, 0xEF};
uint8_t rx[4];
HAL_SPI_TransmitReceive(&hspi1, tx, rx, 4, 100);
assert(memcmp(tx, rx, 4) == 0);
```

### I²C Loopback — 더 복잡

I²C는 양방향 동시 송수신 어려움 — *2 I²C 페리퍼럴* 필요 (한 페리퍼럴 마스터, 다른 페리퍼럴 슬레이브). 또는 *외부 슬레이브 칩으로 자체 시험*.

### CAN Loopback

페리퍼럴 내장 mode 강력 추천 — *외부 노드 없이* 송수신.

```c
hcan1.Init.Mode = CAN_MODE_LOOPBACK;
// 또는 CAN_MODE_SILENT_LOOPBACK (TX·RX 핀에서 격리)
```

자기 송신 메시지가 *자기 수신 FIFO*에 들어옴. 펌웨어 초기 검증에 필수.

## JTAG / SWD / SWO — 디버깅 인터페이스

UART printf는 *비침습적이지만 코드 크기*가 부담. **JTAG·SWD**가 모던 표준.

| 인터페이스 | 핀 | 속도 | 특징 |
| --- | --- | --- | --- |
| **JTAG** | 4-5 (TCK·TMS·TDI·TDO·TRST) | ≤ 30 MHz | 표준, ARM·MIPS·RISC-V 공통 |
| **SWD** (Serial Wire Debug) | 2 (SWCLK·SWDIO) | ≤ 50 MHz | ARM Cortex 표준, JTAG 후속 |
| **SWO** (Serial Wire Output) | 1 (SWO) — SWD 보조 | UART-like | printf 출력만 (CPU 부담 거의 0) |

### SWO printf — UART 대체

`ITM` (Instrumentation Trace Macrocell) 페리퍼럴 → *SWD 인터페이스를 통해 호스트로 메시지*.

```c
// CMSIS의 ITM_SendChar() 사용
static void _putchar(char c) {
    ITM_SendChar(c);
}

// printf 리다이렉트
int _write(int fd, char *ptr, int len) {
    for (int i = 0; i < len; i++) _putchar(ptr[i]);
    return len;
}
```

ST-Link·J-Link로 캡처. 장점 — *UART 핀 절약*, *고속* (수 Mbps).

### Cortex-M 디버그 도구

- **OpenOCD** + GDB — 오픈소스 표준
- **ST-Link**, **J-Link** — 하드웨어 디버거
- **SEGGER Ozone** — J-Link 전용 GUI
- **VSCode + cortex-debug** — IDE 통합

JTAG/SWD가 *동작 안 하면* 보드 자체 의심 (전원·리셋·플래시). 거의 *마지막 의지 도구*.

## 디버깅 워크플로


1. **신호 자체가 나오는가** — 로직 분석기로 핀 확인.
2. **클럭 정상인가** — Hz, idle level, jitter (DSO).
3. **프레임 구조 OK인가** — protocol decoder.
4. **데이터 값이 기대치인가** — 트랜잭션 로그 비교.
5. **에러 플래그** — ISR 클리어 안 되어 후속 시작 멈춤?

## 한 가지 황금률

> "**버그를 의심하기 전에 신호를 보라**"

코드는 *의도*를 표현하고, *신호*는 *현실*입니다. 둘이 안 맞으면 신호가 옳습니다 — 코드를 고치든 회로를 고치든.

## 자주 하는 실수

> ⚠️ Sample rate 부족

100 kHz I²C 캡처에 200 kHz sample → *글리치 못 봄*. 최소 *10×*.

> ⚠️ GND 클립 누락

로직 분석기 GND를 보드 GND에 안 묶으면 *모든 신호가 노이즈*. 첫 번째 점검 포인트.

> ⚠️ 트리거 없이 hour-long 캡처

5분 캡처 = 수 GB. PulseView가 *느려짐*. **트리거를 정확히** 셋업 후 1-10초.

> ⚠️ Decoder 채널 매핑 잘못

I²C 캡처할 때 SDA·SCL 핀을 *반대*로 매핑하면 *완전히 다른 데이터* 디코딩 — 처음엔 잘못된 데이터인 줄 모름.

## 정리 — 시리즈 마무리

- 디버깅 1차 도구는 **로직 분석기 + protocol decoder**.
- 신호 *품질*은 **DSO**, 신호 *내용*은 **로직 분석기**.
- **sigrok + DSLogic**이 가성비 표준.
- 트리거를 정확히 — 5분 캡처보다 *1초 정밀 캡처*가 가치.
- "**버그를 의심하기 전에 신호를 보라**" — 황금률.

12편 시리즈가 끝났습니다. SPI·I²C·UART·RS-485의 *전기·프로토콜·소프트웨어·디버깅*까지 한 바퀴. 다음 시리즈 후보 — **CAN/CAN-FD/CAN-XL** 또는 **MIPI D-PHY/CSI-2**.

## 관련 항목

- [Ch 6: I²C 디버깅 (디테일)](/blog/embedded/protocols/embedded-serial/chapter06-i2c-debugging)
- [CAN 시리즈](/blog/embedded/protocols/can-bus/chapter01-overview)
- [MIPI 시리즈](/blog/embedded/protocols/mipi/chapter01-overview)
