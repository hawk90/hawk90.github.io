---
title: "GPIO 내부 구조 분해 — Push-Pull·Open-Drain·Schmitt Trigger"
slug: "embedded/modern-recipes/part1-03-gpio-internals"
date: 2026-04-10T09:03:00
description: "Push-pull과 open-drain을 QEMU STM32L4 GPIO 모델에서 돌려 보고, STM32F405/407 데이터시트로 내부 풀업·OSPEEDR f_max·5 V 입력 정격을, UM10204 식으로 I2C 풀업 범위를 계산합니다."
series: "Modern Embedded Recipes"
seriesOrder: 3
tags: [recipes, gpio, hw-basics]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"GPIO는 단순한 핀이 아니라 작은 회로 블록입니다."** 출력 트랜지스터 두 개와 풀업·풀다운, 슈미트 트리거 입력으로 구성된 미니 회로입니다.

## 어떤 상황에서 쓰나

- LED는 켜지는데 다른 보드와의 인터페이스에서 1이 안 나올 때
- I2C 라인을 GPIO로 흉내 내려는데 통신이 안 될 때
- 외부 입력이 3.3V 보드에 5V를 줄 때

## 핵심 개념

### 1) 출력 단 — Push-Pull vs Open-Drain

GPIO 출력단은 VDD 쪽 P-MOS와 GND 쪽 N-MOS 두 트랜지스터로 그립니다. 출력 타입 설정은 P-MOS를 쓸지 말지를 고르는 일입니다.

![Push-Pull과 Open-Drain 출력 구조](/images/blog/modern-recipes/diagrams/part1-03-gpio-structure.svg)

| 구조 요소 | Push-Pull | Open-Drain |
| --- | --- | --- |
| VDD 측 | P-MOS (1 출력) | 풀업 저항 (값은 아래 I2C 계산 참고) |
| OUT → pin | 양방향 driver | drain only |
| GND 측 | N-MOS (0 출력) | N-MOS (0 출력만, high-Z로 1) |

| 구분 | Push-Pull | Open-Drain |
| --- | --- | --- |
| 0 출력 | N-MOS ON | N-MOS ON |
| 1 출력 | P-MOS ON | high-Z (풀업이 끌어올림) |
| 외부 풀업 | 불필요 | 필수 |
| 양방향 가능 | 어려움 | 가능 (wired-AND) |
| 사용 예 | LED, 일반 출력 | I2C, alert, IRQ |

I2C가 open-drain인 이유는 여러 디바이스가 같은 라인을 공유해야 하기 때문입니다. Push-pull이면 한 디바이스가 1을, 다른 디바이스가 0을 동시에 내는 순간 VDD에서 P-MOS와 N-MOS를 거쳐 GND로 전류가 바로 흐릅니다. Open-drain에서는 누구든 0을 내면 라인이 0이 되고(wired-AND), 아무도 당기지 않을 때만 풀업이 1을 만듭니다.

### 2) 입력 단 — 풀업/풀다운/플로팅

입력 모드는 핀이 어디에도 연결되지 않은 경우(플로팅)와 풀업/풀다운으로 명시 레벨을 잡는 경우가 있습니다.

STM32F4에서 PA0를 내부 풀업 입력으로 두는 코드입니다.

```c
// STM32F4 입력 설정
// MODER = 00 (input)
GPIOA->MODER &= ~(0b11 << (0 * 2));

// PUPDR = 01 (pull-up), 10 (pull-down), 00 (no pull)
GPIOA->PUPDR &= ~(0b11 << (0 * 2));
GPIOA->PUPDR |=  (0b01 << (0 * 2));   // pull-up
```

STM32F405/407 데이터시트(DS8626, DocID022152 Rev 4) Table 47은 내부 풀업 R_PU와 풀다운 R_PD를 최소 30, 대표 40, 최대 50 kΩ으로 적습니다. 예외는 PA10과 PB12로 8/11/15 kΩ입니다. 같은 표의 주석 5는 이 저항이 실제 저항에 스위칭용 MOS를 직렬로 단 구조이고 MOS 몫은 10% 정도라고 설명합니다. 이 값이 I2C 풀업으로 쓸 만한지는 아래 '측정 / 비교'에서 계산합니다.

### 3) Drive strength

출력단이 부하 용량을 얼마나 빨리 충전·방전하느냐가 rise/fall time을 정합니다.

STM32F4에서는 `OSPEEDR` 2비트가 출력 속도 설정을 고릅니다. 데이터시트는 이 설정을 "I/O speed"라고만 부르고 회로로 어떻게 구현했는지는 적지 않습니다.

```c
// STM32F4 OSPEEDR: 00 low, 01 medium, 10 high, 11 very high
GPIOA->OSPEEDR |= (0b11 << (5 * 2));   // very high speed
```

DS8626 Rev 4 Table 49는 설정마다 최대 출력 주파수를 부하 조건과 함께 적습니다. V_DD > 2.7 V 기준 값만 옮겼습니다.

| OSPEEDR | f_max (부하 큰 조건) | f_max (C_L = 10 pF) |
| --- | --- | --- |
| 00 | 2 MHz (C_L = 50 pF) | 값 없음 |
| 01 | 25 MHz (C_L = 50 pF) | 50 MHz |
| 10 | 50 MHz (C_L = 40 pF) | 100 MHz |
| 11 | 100 MHz (C_L = 30 pF) | 200 MHz |

이 판의 Table 49는 00 설정의 10 pF 조건 f_max와 모든 rise/fall time 칸을 아직 값 없이 비워 두었으므로(표 주석 3), 그 칸은 옮기지 않았습니다. 같은 표의 주석 5는 50 MHz가 넘는 주파수에서 compensation cell을 쓰라고 적습니다. 또 데이터시트 본문은 PC13~PC15를 출력으로 쓸 때 30 pF 부하에서 2 MHz를 넘지 말라고 합니다.

### 4) Schmitt trigger 입력

입력 비교기는 일반 비교기가 아니라 히스테리시스가 있는 Schmitt trigger입니다. 0 → 1 임계와 1 → 0 임계가 다릅니다.

![Schmitt trigger 전달 특성 — 입력 상승 시 V_T+, 하강 시 V_T−에서 출력이 바뀌고 그 차이가 V_hys](/images/blog/modern-recipes/diagrams/part1-03-schmitt-hysteresis.svg)

DS8626 Table 47은 STM32F405/407 I/O의 Schmitt trigger 히스테리시스 V_hys를 대표 200 mV, FT 핀은 V_DD의 5% 이상(최소 100 mV)으로 적습니다. 히스테리시스는 두 스위칭 임계 V_T+와 V_T− 사이의 전압 폭입니다(Table 47 주석 2). 입력이 스위칭 임계 근처에서 이보다 작은 잡음으로 흔들리면 출력은 한 번만 바뀝니다. 스위칭 임계는 보장값인 V_IL과 V_IH 사이에 있습니다. 같은 표의 입력 임계값은 TTL 포트가 V_IL 0.8 V / V_IH 2.0 V(2.7~3.6 V), CMOS 포트가 0.3 V_DD / 0.7 V_DD이고, 표 아래 문장은 모든 I/O가 CMOS와 TTL 양쪽을 만족한다고 적습니다.

## 코드 / 실제 사용 예

5 V 신호를 3.3 V MCU에 받는 방법은 데이터시트의 절대 최대 정격에서 출발합니다. DS8626 Table 11은 입력 전압 최대값을 FT(5 V tolerant) 핀에서 V_DD + 4 V, 그 밖의 핀에서 4.0 V로 적습니다. V_DD = 3.3 V면 FT 핀은 7.3 V까지, 일반 핀은 4.0 V까지입니다. 그래서 일반 핀에 5 V를 바로 넣으면 정격을 넘습니다. Table 12는 일반 핀의 주입 전류(injected current)를 ±5 mA, FT 핀은 −5/+0 mA로 제한하고, 모든 핀의 합을 ±25 mA로 제한합니다.

| 방법 | 근거 |
| --- | --- |
| FT 핀 사용 | 핀 정의 표에서 I/O 구조가 FT인 핀. V_DD + 4 V까지 |
| 저항 분압 | 10 kΩ + 20 kΩ이면 5 × 20 / 30 = 3.33 V. 분압 출력이 입력 핀을 직접 구동하므로 속도는 저항과 핀 용량(C_IO 5 pF, Table 47)이 정함 |
| 레벨 시프터 | TI SN74LVC2T45(SCES516N): `DIR` 핀으로 방향을 정하는 양방향 2비트 버퍼. TI TXB0108(SCES643L): 방향 자동 감지 8비트 |

TXB0108 데이터시트는 이 소자가 push-pull CMOS 출력만 변환할 수 있고, I2C나 1-Wire처럼 open-drain 드라이버를 쓰는 곳에는 쓰지 말라고 적습니다. I2C 레벨 변환에는 open-drain용 변환기를 따로 고릅니다.

소프트웨어 I2C bit-bang에서 SDA를 어떻게 다룰지도 자주 헷갈립니다. STM32 GPIO는 `OTYPER`로 출력단을 open-drain으로 바꿀 수 있으므로, 핀을 open-drain 출력으로 두고 `BSRR`로 0과 release를 오가면 됩니다. MODER를 output/input으로 바꿔 흉내 내는 방법은 ODR이 0이라는 전제가 깨지면 1을 *구동*해 버립니다. 두 방식을 QEMU에서 돌려 비교했습니다.

STM32F4 머신(`netduinoplus2`)은 GPIO를 모델링하지 않으므로, `MODER`~`AFR`(0x00~0x24) 레지스터 배치가 F4와 같은 STM32L475 보드 머신 `b-l475e-iot01a`를 썼습니다. QEMU 11.1의 `hw/gpio/stm32l4x5_gpio.c`는 `update_gpio_idr()`에서 open-drain ODR=1이고 외부 연결이 없을 때 풀업이면 1, 풀다운이면 0, 둘 다 없으면 floating으로 IDR을 정합니다.

```c
#include "stm32l4xx.h"
void pr(const char *, ...);   /* semihosting printf */

#define SDA 7   /* PB7 */

static void sda_init_open_drain(void) {
    RCC->AHB2ENR |= RCC_AHB2ENR_GPIOBEN;
    GPIOB->OTYPER |=  (1u << SDA);                 /* open-drain */
    GPIOB->PUPDR  &= ~(3u << (SDA * 2));
    GPIOB->PUPDR  |=  (1u << (SDA * 2));           /* internal pull-up (demo) */
    GPIOB->BSRR    =  (1u << SDA);                 /* ODR=1: release */
    GPIOB->MODER   = (GPIOB->MODER & ~(3u << (SDA * 2))) | (1u << (SDA * 2));
}
static inline void sda_low(void)     { GPIOB->BSRR = (1u << (SDA + 16)); }
static inline void sda_release(void) { GPIOB->BSRR = (1u << SDA); }
static inline int  sda_read(void)    { return (GPIOB->IDR >> SDA) & 1; }

int main(void) {
    sda_init_open_drain();
    pr("open-drain, pull-up : release -> IDR=%d\n", sda_read());
    sda_low();
    pr("open-drain, pull-up : low     -> IDR=%d\n", sda_read());
    sda_release();
    GPIOB->PUPDR &= ~(3u << (SDA * 2));            /* no pull */
    sda_low(); sda_release();
    pr("open-drain, no pull : release -> IDR=%d (QEMU keeps last value: floating)\n", sda_read());

    /* the MODER-switching variant without clearing ODR first */
    GPIOB->OTYPER &= ~(1u << SDA);                 /* push-pull */
    GPIOB->BSRR    =  (1u << SDA);                 /* ODR left at 1 */
    GPIOB->MODER  &= ~(3u << (SDA * 2));           /* "release" = input */
    GPIOB->MODER  |=  (1u << (SDA * 2));           /* "sda_low" = output */
    pr("push-pull, ODR=1, MODER=output -> IDR=%d (drives HIGH, not low)\n", sda_read());
    return 0;
}
```

`pr()`는 semihosting으로 한 글자씩 내보내는 작은 printf이고, startup·링커 스크립트와 함께 빌드했습니다. 헤더는 ST `cmsis_device_l4`(commit ca0bfa2)와 Arm `CMSIS_5` Core입니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O1 -ffreestanding -nostdlib -DSTM32L475xx \
  -I cmsis_device_l4/Include -I CMSIS_5/CMSIS/Core/Include -Wall \
  -T link-l4.ld startup.c sh.c od.c -lgcc -o od.elf
qemu-system-arm -M b-l475e-iot01a -nographic \
  -semihosting-config enable=on,target=native -kernel od.elf
```

```text
open-drain, pull-up : release -> IDR=1
open-drain, pull-up : low     -> IDR=0
open-drain, no pull : release -> IDR=0 (QEMU keeps last value: floating)
push-pull, ODR=1, MODER=output -> IDR=1 (drives HIGH, not low)
```

풀업이 없으면 release한 라인이 1로 올라가지 않고 직전 값 0에 머뭅니다. QEMU가 floating을 "이전 값 유지"로 모델링한 결과이고, 실제 핀이라면 잡음에 따라 아무 값이나 읽힙니다. 마지막 줄이 MODER 전환 방식의 함정입니다. ODR에 1이 남은 채 output으로 바꾸면 0이 아니라 1을 push-pull로 내보내고, 그 순간 다른 디바이스가 SDA를 0으로 당기고 있었다면 두 출력이 맞붙습니다. MODER 방식을 쓰려면 초기화 때 ODR 비트를 0으로 한 번 정해 두어야 합니다.

## 측정 / 비교

I2C 풀업의 범위는 NXP UM10204(Rev. 7.0) 7.1절 *Pull-up resistor sizing*의 두 식으로 정합니다. 최솟값은 디바이스가 3 mA를 싱크하면서 V_OL 0.4 V를 지켜야 한다는 조건에서, 최댓값은 0.3 V_DD에서 0.7 V_DD까지 오르는 시간 0.8473 × RC가 rise time 상한 t_r(Standard-mode 1000 ns, Fast-mode 300 ns, Table 11) 안에 들어야 한다는 조건에서 나옵니다. V_DD = 3.3 V로 계산한 결과입니다.

```text
Rp(min) = (VDD - VOL)/IOL = (3.3 - 0.4)/3 mA = 967 ohm
Standard-mode tr<= 1000 ns Cb= 50 pF -> Rp(max) = tr/(0.8473*Cb) =  23.60 kohm
Standard-mode tr<= 1000 ns Cb=100 pF -> Rp(max) = tr/(0.8473*Cb) =  11.80 kohm
Standard-mode tr<= 1000 ns Cb=200 pF -> Rp(max) = tr/(0.8473*Cb) =   5.90 kohm
Standard-mode tr<= 1000 ns Cb=400 pF -> Rp(max) = tr/(0.8473*Cb) =   2.95 kohm
Fast-mode     tr<= 300 ns Cb= 50 pF -> Rp(max) = tr/(0.8473*Cb) =   7.08 kohm
Fast-mode     tr<= 300 ns Cb=100 pF -> Rp(max) = tr/(0.8473*Cb) =   3.54 kohm
Fast-mode     tr<= 300 ns Cb=200 pF -> Rp(max) = tr/(0.8473*Cb) =   1.77 kohm
Fast-mode     tr<= 300 ns Cb=400 pF -> Rp(max) = tr/(0.8473*Cb) =   0.89 kohm
internal pull-up 30 kohm, Cb=50 pF -> tr(0.3->0.7 VDD) = 1271 ns
internal pull-up 40 kohm, Cb=50 pF -> tr(0.3->0.7 VDD) = 1695 ns
internal pull-up 50 kohm, Cb=50 pF -> tr(0.3->0.7 VDD) = 2118 ns
```

정답은 고정된 저항값이 아니라 버스 용량 C_b에 따른 범위입니다. 100 pF 버스라면 Standard-mode는 0.97~11.8 kΩ, Fast-mode는 0.97~3.54 kΩ 사이에서 고릅니다. 3 mA / V_OL 0.4 V 디바이스로 Fast-mode에서 C_b가 400 pF(규격 상한)면 최댓값 0.89 kΩ이 최솟값 0.97 kΩ보다 작아 두 조건을 함께 맞출 수 없습니다. UM10204 Table 10 주석 [4]가 바로 이 경우를 다룹니다. 400 kHz에서 400 pF 전체 부하를 구동하려면 V_OL 0.6 V에서 6 mA를 싱크해야 하고, 그러면 Rp(min) = (3.3 − 0.6) / 6 mA = 450 Ω이라 0.45~0.89 kΩ 범위가 생깁니다. 내부 풀업은 PA10·PB12를 뺀 핀의 가장 작은 값 30 kΩ에 50 pF만 걸어도 rise time이 1271 ns로 Standard-mode 상한 1000 ns를 넘습니다.

## 자주 보는 함정

> ⚠️ Open-drain만 설정하고 풀업을 안 달기

위 QEMU 실행의 세 번째 줄처럼, 풀업이 없는 open-drain 핀은 release해도 1이 되지 않습니다. N-MOS가 꺼지면 핀을 VDD로 끌어올릴 소자가 없기 때문입니다. LED를 핀이 GND 쪽으로 당겨 켜는 회로(LED 애노드가 VDD)라면 0 출력만 필요하므로 풀업 없이도 동작하지만, 다른 칩의 입력으로 1을 보내야 하는 라인은 풀업이 있어야 합니다.

> ⚠️ 입력으로 두고 플로팅

풀업·풀다운이 없는 입력은 레벨이 정해지지 않습니다. 그 핀에 EXTI를 걸어 두면 떠 있는 레벨이 임계값을 넘나들 때마다 인터럽트가 들어옵니다. 쓰지 않는 핀은 풀업·풀다운으로 레벨을 정해 둡니다. TI SN74LVC04A 데이터시트도 쓰지 않는 입력을 V_CC나 GND에 묶으라고 적고, 그 이유를 앱노트 SCBA004 *Implications of Slow or Floating CMOS Inputs*로 안내합니다.

> ⚠️ 5V 입력을 3.3V FT 아닌 핀에 직결

위 표대로 일반 핀의 입력 전압 정격은 4.0 V이고, V_DD를 넘는 입력은 양(+)의 주입 전류가 됩니다. 일반 핀은 ±5 mA, 모든 핀의 합은 ±25 mA가 한계입니다(DS8626 Table 12). 같은 표 주석은 음(−)의 주입이 ADC 정확도를 해친다고 적습니다. DS8626 5.2절은 정격을 넘으면 영구 손상이 생길 수 있고 오래 노출되면 신뢰성에 영향을 줄 수 있다고만 적고, 시간이나 고장 모드는 적지 않습니다. 그래서 판단 기준은 '정격 안에 있는가' 하나입니다.

> ⚠️ Drive strength 과다

Table 49의 f_max는 그 설정이 낼 수 있는 상한이지 권장값이 아닙니다. 1-01의 반사 계산처럼 엣지가 빠를수록 짧은 배선도 전송선처럼 보이기 시작하므로, 핀이 실제로 내야 하는 주파수를 넘는 가장 낮은 설정을 고릅니다. 50 MHz를 넘기면 compensation cell도 켜야 합니다.

## 정리

- GPIO는 push-pull 또는 open-drain 출력, 풀업/풀다운/플로팅 입력으로 구성됩니다.
- Open-drain은 공유 버스(I2C 등)에 씁니다. 풀업이 없으면 release해도 1이 되지 않습니다(QEMU 실행으로 확인).
- STM32F4 bit-bang I2C는 `OTYPER`로 open-drain을 켜고 `BSRR`로 0/release를 오갑니다. MODER 전환 방식은 ODR = 1이 남아 있으면 1을 구동합니다.
- STM32F405/407 내부 풀업은 30~50 kΩ(PA10·PB12 제외, DS8626)이라, 50 pF 버스에서도 rise time이 1271 ns 이상으로 I2C Standard-mode 상한을 넘습니다. 외부 풀업은 UM10204 식으로 C_b에 맞춰 고릅니다.
- `OSPEEDR`의 f_max는 부하 조건이 붙은 상한입니다(DS8626 Table 49).
- 5 V 입력은 FT 핀(V_DD + 4 V까지) 또는 레벨 시프터로 받습니다. 일반 핀의 정격은 4.0 V입니다. TXB0108은 I2C에 쓰지 않습니다.

다음 편에서는 **UART 하드웨어 동작**을 다룹니다. 가장 흔한 시리얼 통신의 내부 구조입니다.

## 관련 항목

- [1-02: 클럭과 타이밍](/blog/embedded/modern-recipes/part1-02-clock-timing)
- [1-04: UART 하드웨어 동작](/blog/embedded/modern-recipes/part1-04-uart-hardware)
- [1-06: I2C 하드웨어](/blog/embedded/modern-recipes/part1-06-i2c-hardware)
- 더 깊이 — [Embedded Performance Engineering: Bare-metal 프로파일링 — GPIO 토글](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
