---
title: "Ch 6: I²C 디버깅 — Stuck Bus, 풀업, Level Shift, 분석기"
date: 2027-03-01T06:00:00
description: "현장에서 만나는 I²C 버그 7가지 시그니처와 처방. 그리고 로직 분석기 사용법."
series: "Embedded Protocols 심화"
seriesOrder: 6
tags: [i2c, debugging, stuck-bus, pullup, level-shift, logic-analyzer]
draft: true
---

## 한 줄 요약

> **"로직 분석기 한 번이면 90% 풀린다"** — Saleae 또는 ZeroPlus 짜리만 있어도 I²C 디버깅의 절반은 끝.

## I²C 7가지 흔한 증상

| 증상 | 원인 후보 | 1차 처방 |
| --- | --- | --- |
| **모든 read가 0xFF** | SDA 풀업 없음 | 4.7 kΩ 풀업 확인 |
| **모든 read가 0x00** | SDA가 GND short / 슬레이브 미응답 | 회로·전원 확인 |
| **NACK on address** | 주소 7/8-bit 혼동, 슬레이브 미전원 | 주소 형식, V_DD |
| **중간에 NACK** | 슬레이브 internal busy (EEPROM write) | polling delay |
| **버스 행 (SCL Low 고정)** | 슬레이브가 SCL을 stuck | Bus recovery 9-clock |
| **간헐적 데이터 오류** | 풀업 약함 / capacitance 과다 | 풀업 감소, 트레이스 단축 |
| **Read 데이터 한 비트 밀림** | Repeated Start 누락 | Mem_Read API 사용 |

## Stuck Bus Recovery

가장 까다로운 케이스. 마스터가 통신 도중 *리셋*되면 슬레이브가 *비트 송신 중*에 멈춰 SDA를 Low로 잡고 있을 수 있습니다. 마스터는 Start 못 보냄.

해결 — **마스터가 SCL을 GPIO로 잡고 수동 9 펄스**:

```c
void i2c_bus_recover(void) {
    GPIO_InitTypeDef gpio = {0};
    // SCL을 GPIO output open-drain으로 임시 변경
    gpio.Pin = I2C_SCL_Pin;
    gpio.Mode = GPIO_MODE_OUTPUT_OD;
    gpio.Pull = GPIO_PULLUP;
    HAL_GPIO_Init(I2C_SCL_GPIO_Port, &gpio);

    // 9 펄스로 슬레이브 시프트 레지스터 비우기
    for (int i = 0; i < 9; i++) {
        HAL_GPIO_WritePin(I2C_SCL_GPIO_Port, I2C_SCL_Pin, GPIO_PIN_RESET);
        HAL_Delay(1);
        HAL_GPIO_WritePin(I2C_SCL_GPIO_Port, I2C_SCL_Pin, GPIO_PIN_SET);
        HAL_Delay(1);
    }
    // Stop condition 생성
    // ...

    // SCL을 다시 I2C 페리퍼럴로
    gpio.Mode = GPIO_MODE_AF_OD;
    HAL_GPIO_Init(I2C_SCL_GPIO_Port, &gpio);
}
```

## 풀업 저항 — 실측 계산

```text
공식: t_rise (low → 70%) ≈ 0.85 × R_p × C_bus

목표 (Standard 100 kHz): t_rise ≤ 1 µs
보드 capacitance 추정:
  - 디바이스 핀 capacitance × N + 트레이스 × cm
  - 일반 PCB 트레이스: 1 cm ≈ 1 pF
  - 디바이스 핀: 5-10 pF 각
  - 5 디바이스 + 30 cm 트레이스 ≈ 80 pF

R_p ≤ 1 µs / (0.85 × 80 pF) ≈ 14 kΩ → 안전하게 4.7 kΩ
```

풀업 값을 모르면 *오실로스코프로 SDA rising edge*를 보고 *t_rise* 측정 → 1 µs 넘으면 줄임.

## Level Shifting

3.3V MCU + 5V 센서는 *level shifter*가 필요합니다. 가장 간단한 회로 — **N-MOSFET + 풀업 양쪽**.

![I²C BSS138 level shifter](/images/blog/embedded-serial/diagrams/ch06-i2c-level-shifter.svg)

NMOS drain → 5V side, source → 3.3V side, gate → 3.3V (low-side reference). 풀업 4.7 kΩ 양쪽. 표준 회로는 NXP AN10441 (또는 Philips AN10441). SDA와 SCL *각각 BSS138 1개씩* 필요. 일부 보드는 PCA9306 같은 *전용 IC* 사용.

## 로직 분석기 사용

![I²C protocol decoder example](/images/blog/embedded-serial/diagrams/ch06-i2c-decoder.svg)

### 필수 도구

- **Saleae Logic 8/16** — 사용성 최고, 가격 부담
- **ZeroPlus LAP-C** — 가성비
- **PulseView (sigrok)** — 오픈소스 + DSLogic, Logic16

### 캡처 셋업

1. SDA·SCL 두 라인에 클립
2. GND 클립
3. Sample rate ≥ I²C 클럭의 **10배** (400 kHz면 4 MHz)
4. **트리거** — Start condition (SCL High에서 SDA falling)

### 디코더 출력 보는 법

```text
S 68 W A 75 A Sr 68 R A 68 NA P
↑  ↑  ↑ ↑ ↑  ↑ ↑  ↑  ↑ ↑ ↑  ↑ ↑
S=Start, Sr=Repeated, P=Stop, A=ACK, NA=NACK
68=주소(7-bit), W/R=방향, 75=레지스터, 68=read 데이터
```

**ACK가 NA로 나오면** 즉시 알 수 있음 — 슬레이브 미응답 또는 주소 오류.

## 자주 만나는 캡처 시그니처

### 풀업 약함

SDA·SCL rising edge가 *완만한 RC 곡선*. 디지털인데 *기울기*가 보이면 풀업 부족.

### 슬레이브 데드

Start 잘 보내고 주소·W까지 갔는데 *9번째 클럭에서 SDA High 유지* → NACK. 슬레이브가 응답을 안 함. 원인 — 전원 미공급, 잘못된 주소, 슬레이브 행.

### 풀업 V_DD 불일치

5V 슬레이브 라인에 3.3V 풀업 → SDA·SCL이 3.3V로만 올라감 — 5V 슬레이브의 V_IH (≥3.5V) 미달 → *지속적 비트 오류*.

### Clock Stretching 무시

마스터가 SCL을 펄스 보냈는데 슬레이브가 stretch하려 했지만 마스터는 이미 다음 펄스 시작 → SCL이 *불규칙 펄스*. 일부 호스트 (라파)에서 흔함.

## 자주 하는 실수

> ⚠️ 풀업 V_DD를 잘못된 전원에

3.3V·5V 혼용 보드에서 풀업 V_DD를 잘못 선택하면 *전체 보드 망*. 반드시 *낮은 쪽 전원*에 풀업 + level shifter.

> ⚠️ "I²C가 안 되네" → 풀업부터 의심

90% 이상 풀업 문제. 의심 순서: ① 풀업 ② 주소 ③ 전원 ④ 슬레이브 행.

> ⚠️ 분석기 sample rate 부족

100 kHz I²C인데 1 MHz로 캡처 → *Glitch 못 봄*. 10× 이상.

## 정리

- 7가지 흔한 증상 — 풀업, 주소, NACK, 행, 약한 풀업, Repeated Start.
- **Stuck Bus**는 마스터가 9-clock 펄스로 복구.
- 풀업 저항 = `t_rise / (0.85 × C_bus)` 역산.
- Level Shifter는 BSS138 또는 PCA9306.
- **로직 분석기 한 번**이 회로 디버깅의 절반.

다음 편은 **UART 기초** — 비동기 직렬, baud rate, frame format.

## 관련 항목

- [Ch 4: I²C 기초](/blog/embedded/protocols/embedded-serial/chapter04-i2c-basics)
- [Ch 12: 전체 디버깅](/blog/embedded/protocols/embedded-serial/chapter12-debugging)
