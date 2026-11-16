---
title: "디지털 신호 기초 — Voltage Level·Edge·Noise Margin·반사 분석"
slug: "embedded/modern-recipes/part1-01-digital-signal-basics"
date: 2026-04-10T09:01:00
description: "Voltage level·rise/fall time·noise margin·신호 무결성의 기본기."
series: "Modern Embedded Recipes"
seriesOrder: 1
tags: [recipes, signal-integrity, hw-basics]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"디지털 신호는 사실 아날로그입니다."** 0과 1로 보이지만, 오실로스코프로 보면 모두 비스듬한 경사와 흔들리는 평탄부입니다.

## 어떤 상황에서 쓰나

- 새 보드를 처음 부팅해서 GPIO가 "왜 안 잡히지"를 디버깅할 때
- SPI/I2C 속도를 올리다 통신이 깨지기 시작할 때
- EMI 인증 시험에서 노이즈 스펙을 초과할 때
- 모터 드라이브 등 강전 회로 옆에서 디지털 라인이 오동작할 때

위 상황은 모두 "디지털 신호의 아날로그적 특성"을 무시했을 때 발생합니다. 코드가 아니라 전기 신호를 봐야 풀립니다.

## 핵심 개념

### 1) 전압 레벨

전압 레벨은 "TTL이면 몇 V" 같은 계열 공통값이 아니라 부품 데이터시트가 보장하는 값입니다. 아래 표는 TI의 두 데이터시트에서 그대로 옮긴 값입니다. 5 V TTL은 SN7404(SDLS029C), 3.3 V·1.8 V CMOS는 SN74LVC04A(SCAS281T, 6.3절 Recommended Operating Conditions와 6.7절 Electrical Characteristics)입니다.

| 부품 · 조건 | V_OH (min) | V_OL (max) | V_IH (min) | V_IL (max) |
| --- | --- | --- | --- | --- |
| SN7404, V_CC = 4.75 V, I_OH = −0.4 mA / I_OL = 16 mA | 2.4 V | 0.4 V | 2 V | 0.8 V |
| SN74LVC04A, V_CC = 2.7~3.6 V, \|I_O\| = 100 µA, 25 °C | V_CC − 0.2 | 0.1 V | 2 V | 0.8 V |
| SN74LVC04A, V_CC = 3 V, \|I_O\| = 24 mA, 25 °C | 2.3 V | 0.55 V | 2 V | 0.8 V |
| SN74LVC04A, V_CC = 1.65~1.95 V | V_CC − 0.2 (100 µA, 25 °C) | 0.1 V (100 µA, 25 °C) | 0.65 × V_CC | 0.35 × V_CC |

V_OH / V_OL은 출력 측이 보장하는 값이고, V_IH / V_IL은 입력 측이 0/1로 해석하는 경계입니다. 둘의 차이가 **noise margin**입니다. SN7404는 high 쪽 2.4 − 2 = 0.4 V, low 쪽 0.8 − 0.4 = 0.4 V입니다. SN74LVC04A를 3.3 V, 100 µA 부하로 쓰면 high 쪽 3.1 − 2.0 = 1.1 V, low 쪽 0.8 − 0.1 = 0.7 V입니다. 같은 부품도 출력 전류를 24 mA까지 끌어 쓰면 V_OL이 0.55 V로 올라가 low 쪽 margin이 0.25 V로 줄어듭니다. 표의 조건 칸을 같이 읽어야 하는 이유입니다.

![SN74LVC04A 3.3 V 전압 레벨과 noise margin (high 1.1 V, low 0.7 V)](/images/blog/modern-recipes/diagrams/part1-01-cmos-levels.svg)

### 2) Rise time / Fall time

이상적 디지털 신호는 즉시 0 → 1로 전환합니다. 실제로는 그렇지 않습니다. Tektronix *ABCs of Probes*(60W-6053-11)는 rise time을 펄스가 진폭의 **10%에서 90%**까지 오르는 데 걸리는 시간으로 정의합니다.

STM32F4에서는 핀마다 `OSPEEDR`의 2비트로 출력단의 속도(slew)를 고릅니다. 아래 코드는 PC5를 가장 빠른 설정으로 둡니다.

```c
// STM32F4 GPIO 출력 속도 설정 예
GPIOC->OSPEEDR &= ~(0b11 << (5 * 2));
GPIOC->OSPEEDR |=  (0b11 << (5 * 2));   // 0b11 = very high speed
```

| OSPEEDR | HAL 상수 | HAL 헤더 주석의 동작 주파수 |
| --- | --- | --- |
| 0b00 | `GPIO_SPEED_FREQ_LOW` | 2 MHz |
| 0b01 | `GPIO_SPEED_FREQ_MEDIUM` | 12.5~50 MHz |
| 0b10 | `GPIO_SPEED_FREQ_HIGH` | 25~100 MHz |
| 0b11 | `GPIO_SPEED_FREQ_VERY_HIGH` | 50~200 MHz |

상수 값과 주석은 ST의 `stm32f4xx-hal-driver`(v1.8.6) `Inc/stm32f4xx_hal_gpio.h` 141~144행에서 옮겼습니다. 같은 주석이 정확한 값은 제품 데이터시트를 보라고 적습니다. STM32F405/407 데이터시트(DS8626, DocID022152 Rev 4) Table 49 *I/O AC characteristics*는 설정별 최대 출력 주파수를 부하 조건과 함께 적지만(예: `11`은 C_L = 30 pF에서 100 MHz, 10 pF에서 200 MHz), 이 판은 rise/fall time 칸을 값 없이 비워 두었습니다. 그래서 여기서는 시간 대신 주파수만 쓰고, 설정별 f_max 전체 표는 [1-03](/blog/embedded/modern-recipes/part1-03-gpio-internals)에 있습니다.

### 3) Noise margin과 신호 무결성

배선이 신호 엣지에 비해 길어지면 선로를 특성 임피던스 Z0를 가진 전송선으로 봐야 합니다. 파동이 끝에 닿을 때마다 반사 계수 Γ = (R − Z0) / (R + Z0)만큼 되돌아오고, CMOS 입력처럼 열린 끝은 Γ = +1이라 도착한 파동이 두 배로 보입니다. 아래 스크립트는 이상적인 3.3 V 계단 입력, 50 Ω 선로, 열린 부하(입력 용량 무시)에서 부하 전압을 반사 차례대로 더합니다.

```python
def bounce(Vs, Rs, Z0, n=6):
    gs = (Rs - Z0) / (Rs + Z0); gl = 1.0
    v = Vs * Z0 / (Rs + Z0); vload = 0.0; out = []
    for k in range(n):
        vload += v * (1 + gl)          # 부하에 도착해 반사
        out.append((2*k+1, vload))
        v = v * gl * gs                # 소스에서 다시 반사
    return gs, out
```

`python3 lattice.py`(Python 3)로 소스 저항 Rs를 바꿔 가며 돌린 결과입니다. Td는 선로 편도 지연입니다.

```text
Rs=10 ohm Z0=50 ohm  Gamma_s=-0.667  V_load at t=(2k+1)Td: 1Td:5.50V, 3Td:1.83V, 5Td:4.28V, 7Td:2.65V, 9Td:3.73V, 11Td:3.01V
Rs=25 ohm Z0=50 ohm  Gamma_s=-0.333  V_load at t=(2k+1)Td: 1Td:4.40V, 3Td:2.93V, 5Td:3.42V, 7Td:3.26V, 9Td:3.31V, 11Td:3.30V
Rs=50 ohm Z0=50 ohm  Gamma_s=+0.000  V_load at t=(2k+1)Td: 1Td:3.30V, 3Td:3.30V, 5Td:3.30V, 7Td:3.30V, 9Td:3.30V, 11Td:3.30V
```

출력 저항이 10 Ω인 강한 드라이버는 첫 도착에서 5.5 V까지 튀고, 3Td에는 1.83 V로 떨어집니다. 1.83 V는 SN74LVC04A의 V_IH(2 V)보다 낮아서, 이 순간 입력은 1로 보장되지 않습니다. 소스 쪽 저항을 Z0와 같게 맞추면(series termination) 처음부터 3.3 V에 머뭅니다. 실제 엣지는 계단이 아니고 입력 용량도 있어 이 값보다 무뎌지지만, 오버슈트·언더슈트가 임피던스 불일치에서 나온다는 구조는 같습니다. 진폭이 noise margin 안에 머물면 동작은 정상이고, 넘으면 입력이 잘못 판정됩니다.

![Ringing waveform with overshoot and undershoot](/images/blog/modern-recipes/diagrams/part1-01-ringing-waveform.svg)

## 코드 / 실제 사용 예

GPIO 토글을 오실로스코프로 보며 `OSPEEDR` 설정의 영향을 확인하는 코드입니다. ST HAL 드라이버 사용법(`stm32f4xx_hal_gpio.c` 63행)이 적는 대로 GPIO 레지스터를 쓰기 전에 AHB1 클럭부터 켭니다.

```c
#include "stm32f4xx.h"

// STM32F4 — PA5에 LED, probe 신호로 사용
void gpio_speed_test(uint32_t speed_bits) {
    RCC->AHB1ENR   |= RCC_AHB1ENR_GPIOAEN;  // GPIOA 클럭
    GPIOA->MODER   |= (0b01 << (5 * 2));   // output
    GPIOA->OSPEEDR &= ~(0b11 << (5 * 2));
    GPIOA->OSPEEDR |=  (speed_bits << (5 * 2));
    GPIOA->OTYPER  &= ~(1 << 5);            // push-pull
    while (1) {
        GPIOA->BSRR = (1 << 5);
        GPIOA->BSRR = (1 << (5 + 16));
    }
}
```

ST의 `cmsis_device_f4`(commit 9192c7b)와 Arm `CMSIS_5`의 `CMSIS/Core/Include`를 받아 다음처럼 빌드했습니다. 표준 라이브러리 없이 GCC의 `stdint.h`만 쓰려면 `-ffreestanding`이 필요합니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -ffreestanding -DSTM32F407xx \
  -I cmsis_device_f4/Include -I CMSIS_5/CMSIS/Core/Include -Wall -c speed.c
arm-none-eabi-objdump -d --no-show-raw-insn speed.o
```

GCC 16.2.0이 만든 루프 부분은 BSRR에 두 번 쓰고 되돌아가는 세 명령입니다.

```text
  38:	str	r1, [r3, #24]
  3a:	str	r2, [r3, #24]
  3c:	b.n	38 <gpio_speed_test+0x38>
  3e:	nop
  40:	.word	0x40023800
  44:	.word	0x40020000
```

리터럴 `0x40023800`은 RCC 베이스(`AHB1ENR`은 오프셋 0x30), `0x40020000`은 GPIOA 베이스이고, 오프셋 24(0x18)는 BSRR입니다. high 구간은 `str` 하나, low 구간은 `str`과 `b.n`이라 duty가 정확히 50%는 아닙니다. 엣지 모양만 볼 때는 상관없습니다.

보드에서 실행하지는 않았습니다. QEMU의 STM32F405 머신(`netduinoplus2`)에서 같은 레지스터를 써 보면 `RCC_AHB1ENR`은 1로 읽히지만 GPIOA의 `MODER`·`OSPEEDR`·`ODR`은 모두 0으로 읽혀, QEMU 11.1.3이 이 GPIO를 모델링하지 않는다는 것만 확인했습니다. 그래서 설정별 rise time 측정값은 싣지 않습니다.

## 측정 / 비교

| 항목 | 측정 방법 | 비교 기준 |
| --- | --- | --- |
| Rise time | 10% → 90% 시간 | — |
| Overshoot | 정상 값 위로 튄 폭 | 입력 핀의 absolute maximum (SN74LVC04A: V_I −0.5~6.5 V) |
| Undershoot | GND 아래로 떨어진 폭 | 같은 정격, 그리고 input clamp current (SN74LVC04A: I_IK −50 mA, V_I < 0) |
| Ringing | 평탄부에 닿을 때까지 흔들리는 시간 | — |

Rise time과 ringing에는 부품과 무관한 보편 합격선이 없어 비교 기준 칸을 비워 두었습니다. 판단은 다음 단의 V_IH / V_IL과 setup/hold 조건(1-02)으로 합니다.

스코프 자체도 rise time을 갖습니다. *ABCs of Probes*는 사양에 rise time이 없으면 **T_r ≈ 0.35 / BW**로 환산하라고 적고, 측정 시스템이 신호보다 3배 빠르면 rise time 오차가 5% 이내, 5배 빠르면 2%라고 적습니다. 같은 문서는 active probe와 스코프의 rise time을 **T_r,system² ≈ T_r,probe² + T_r,scope²** 처럼 제곱합으로 합치되, passive probe에는 이 식을 쓰지 말라고 덧붙입니다. 아래는 같은 제곱합 근사를 신호와 측정 시스템에 적용해 직접 계산한 값이고, 3:1·5:1 결과가 문서의 5%·2%와 맞습니다.

```text
signal tr=5 ns, scope BW=100 MHz -> scope tr=3.50 ns, measured 6.10 ns, error 22.1%
signal tr=5 ns, scope BW=350 MHz -> scope tr=1.00 ns, measured 5.10 ns, error 2.0%
ratio 3:1 -> error 5.4%
ratio 5:1 -> error 2.0%
```

5 ns 엣지를 100 MHz 스코프로 보면 6.1 ns로 22% 느리게 보입니다. 350 MHz면 5:1 비율이 되어 오차가 2%로 줄어듭니다.

## 자주 보는 함정

> ⚠️ 모든 GPIO를 최고 속도로 설정

위 계산에서 엣지가 빠를수록 측정 시스템도 빨라야 했던 것은, 빠른 엣지가 높은 주파수 성분을 더 많이 담기 때문입니다. ST HAL 주석처럼 설정마다 정해진 동작 주파수 범위가 있으니, 그 핀이 실제로 내야 하는 주파수에 맞는 가장 낮은 설정을 고릅니다.

> ⚠️ V_IH 경계의 입력 신호

SN74LVC04A에 3.3 V 전원으로 2.1 V를 넣으면 V_IH(2 V) 이상이니 1로 보장됩니다. 그러나 V_IH까지 남은 여유가 0.1 V뿐이라, 0.1 V가 넘는 잡음이 얹히면 보장 범위를 벗어납니다. 같은 부품끼리 연결하면 위에서 계산한 1.1 V margin이 생기는데, 2.1 V를 내는 출력은 그 margin을 거의 다 써 버린 셈입니다.

> ⚠️ Open-drain 신호의 풀업 누락

I2C나 alert 라인 같은 open-drain 출력에 풀업이 없으면, 0은 잘 나오지만 1을 내야 할 때 라인이 떠 있어, 받는 쪽 입력이 흔들립니다.

> ⚠️ 스코프 probe ground spring 미사용

*ABCs of Probes* Figure 1.9는 probe ground lead가 회로에 인덕턴스를 더하고, 리드가 길수록 인덕턴스가 커져 빠른 펄스에서 ringing이 보일 가능성이 커진다고 설명합니다. Figure 1.13은 표준 6.5 inch 리드와 28 inch를 이어 붙인 리드로 같은 펄스를 비교해, 긴 리드에서 ringing이 나타나는 모습을 보여 줍니다. 같은 문서는 ground lead를 가능한 한 짧고 직접 연결하라고 권합니다.

## 정리

- 디지털 신호도 결국 아날로그입니다. noise margin은 데이터시트의 V_OH / V_OL, V_IH / V_IL로 계산하고, 출력 전류 조건에 따라 달라집니다(SN74LVC04A low margin 0.7 V → 0.25 V).
- STM32F4의 rise time은 `OSPEEDR`로 고릅니다. 핀이 내야 하는 주파수에 맞는 가장 낮은 설정을 씁니다.
- 오버슈트·언더슈트는 임피던스 불일치에서 나옵니다. 10 Ω 드라이버 + 50 Ω 선로 + 열린 끝은 5.5 V까지 튀고, 소스 저항을 50 Ω에 맞추면 사라집니다.
- 스코프는 신호보다 5배 빠르면 rise time 오차가 2%입니다(Tektronix *ABCs of Probes*). Ground lead는 짧게 씁니다.

다음 편에서는 **클럭과 타이밍**을 다룹니다. 디지털 시스템 모든 동작의 근간입니다.

## 관련 항목

- [1-02: 클럭과 타이밍](/blog/embedded/modern-recipes/part1-02-clock-timing)
- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [1-12: LVDS / 차동 신호 일반](/blog/embedded/modern-recipes/part1-12-lvds-differential)
- 더 깊이 — [Embedded Performance Engineering: I/O 측정](/blog/embedded/performance-engineering/00-preface)
