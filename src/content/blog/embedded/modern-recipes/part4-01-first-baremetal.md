---
title: "4-01: 첫 bare-metal 프로그램"
date: 2026-05-13T11:00:00
description: "LED toggle — 최소한의 startup·main·loop."
series: "Modern Embedded Recipes"
seriesOrder: 35
tags: [recipes, bare-metal, led]
draft: false
---

## 한 줄 요약

> **"디버거 없이 LED 한 개가 깜빡이면 toolchain·linker·boot가 모두 정상이라는 증거입니다."** Bare-metal의 hello-world입니다.

## 어떤 상황에서 쓰나

새 보드를 받았거나, 새 toolchain을 구성했거나, 새 startup·linker script를 작성했을 때 처음 던지는 질문은 "이게 동작하는가"입니다. printf 한 줄이라도 보려면 UART·clock·DMA가 모두 살아 있어야 합니다. 그보다 훨씬 단순한 답이 **LED toggle**입니다.

GPIO 출력 핀 하나만 살아 있으면 됩니다. 1초 주기로 깜빡이면 *main이 돌고 있다*는 뜻이고, 빠르게 깜빡이면 *clock이 올라갔다*는 신호이며, 안 깜빡이면 *어느 단계에서 죽었다*는 진단이 됩니다. 오실로스코프 한 대만 있으면 보드의 생사를 5초 안에 판정할 수 있습니다.

## 핵심 개념

### 최소 boot 흐름

ARM Cortex-M의 reset 시퀀스는 다음과 같습니다.

```text
Power-on / Reset
  ↓
0x00000000 (vector table)
  [0]  Initial MSP value     ← stack pointer 로드
  [1]  Reset_Handler address ← PC 로드, 점프
  ↓
Reset_Handler:
  - .data copy (Flash → RAM)
  - .bss zero
  - SystemInit() — 옵션
  - main() 호출
  ↓
main():
  - clock·GPIO 설정
  - while(1) { toggle; delay; }
```

vector table은 *Flash의 시작 주소*에 위치해야 합니다. Cortex-M3/M4/M7은 `SCB->VTOR`로 재배치 가능하지만, 첫 boot은 `0x00000000`(또는 `0x08000000`이 alias)에서 시작합니다.

### LED와 GPIO

STM32 Nucleo·Discovery 보드의 user LED는 보드마다 다릅니다. 대표 예시는 다음과 같습니다.

| 보드 | LED | GPIO |
|------|-----|------|
| Nucleo-F411RE | LD2 (green) | PA5 |
| Nucleo-F767ZI | LD1/2/3 | PB0/PB7/PB14 |
| STM32F4 Discovery | LD3-6 | PD12-15 |
| Black Pill F411 | LED | PC13 (active-low) |

이 글의 예제는 **Nucleo-F411RE, PA5**를 기준으로 합니다.

## 코드 예제

### 1. Vector table과 startup

```c
// startup_stm32f411xe.c
#include <stdint.h>

extern uint32_t _estack;       // linker가 정의 (RAM 끝)
extern uint32_t _sdata, _edata, _sidata;
extern uint32_t _sbss, _ebss;

void Reset_Handler(void);
void Default_Handler(void);
int main(void);

// Vector table을 .isr_vector section에 배치 (linker script가 0x08000000에 둠)
__attribute__((section(".isr_vector")))
const uint32_t vector_table[] = {
    (uint32_t)&_estack,             // [0] MSP 초기값
    (uint32_t)Reset_Handler,        // [1] Reset
    (uint32_t)Default_Handler,      // [2] NMI
    (uint32_t)Default_Handler,      // [3] HardFault
    // ... 나머지는 일단 Default로 채움
};

void Reset_Handler(void) {
    // .data 초기화: Flash(_sidata)에서 RAM(_sdata~_edata)으로 복사
    uint32_t *src = &_sidata;
    uint32_t *dst = &_sdata;
    while (dst < &_edata) *dst++ = *src++;

    // .bss zero
    dst = &_sbss;
    while (dst < &_ebss) *dst++ = 0;

    main();

    while (1);  // main이 return하면 무한 루프
}

void Default_Handler(void) { while (1); }
```

### 2. main — LED toggle

CMSIS 헤더 없이 register address를 직접 정의합니다. 이렇게 하면 한 파일에서 전체 흐름이 보입니다.

```c
// main.c
#include <stdint.h>

#define RCC_BASE       0x40023800UL
#define RCC_AHB1ENR    (*(volatile uint32_t *)(RCC_BASE + 0x30))

#define GPIOA_BASE     0x40020000UL
#define GPIOA_MODER    (*(volatile uint32_t *)(GPIOA_BASE + 0x00))
#define GPIOA_ODR      (*(volatile uint32_t *)(GPIOA_BASE + 0x14))

#define LED_PIN  5  // PA5

static void delay(volatile uint32_t n) {
    while (n--) __asm__("nop");
}

int main(void) {
    // 1. GPIOA clock enable
    RCC_AHB1ENR |= (1u << 0);

    // 2. PA5를 output mode (MODER bits[11:10] = 01)
    GPIOA_MODER &= ~(3u << (LED_PIN * 2));
    GPIOA_MODER |=  (1u << (LED_PIN * 2));

    // 3. Toggle loop
    while (1) {
        GPIOA_ODR ^= (1u << LED_PIN);
        delay(500000);
    }
}
```

### 3. Linker script 최소 골격

```text
/* stm32f411.ld */
MEMORY {
    FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 512K
    RAM  (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

_estack = ORIGIN(RAM) + LENGTH(RAM);

SECTIONS {
    .isr_vector : { KEEP(*(.isr_vector)) } > FLASH

    .text : { *(.text*) *(.rodata*) } > FLASH

    _sidata = LOADADDR(.data);
    .data : {
        _sdata = .;
        *(.data*)
        _edata = .;
    } > RAM AT > FLASH

    .bss : {
        _sbss = .;
        *(.bss*) *(COMMON)
        _ebss = .;
    } > RAM
}
```

### 4. 빌드와 flash

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -nostartfiles \
    -T stm32f411.ld -o blink.elf startup.c main.c

arm-none-eabi-objcopy -O binary blink.elf blink.bin

# ST-Link로 flash
st-flash write blink.bin 0x08000000

# 또는 OpenOCD + GDB
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
arm-none-eabi-gdb blink.elf
(gdb) target remote :3333
(gdb) load
(gdb) monitor reset run
```

## 측정 / 동작 확인

LED가 깜빡이면 다음이 모두 검증된 것입니다.

| 확인 항목 | 의미 |
|-----------|------|
| LED ON/OFF | GPIO 출력 동작 |
| 일정 주기 | main loop 정상 |
| 깜빡임 속도 | CPU clock (HSI 16MHz 기준 적당) |
| 깜빡임 안 함 | reset·linker·startup 중 어디서 정지 |

오실로스코프로 PA5를 보면 사각파가 명확히 보입니다. delay(500000)에 nop 1-cycle 기준이면 약 0.06초 주기 (16MHz / 500000 × 2 ≈ 16 Hz)가 나옵니다.

```text
Scope: PA5
   3.3V ┐    ┌────┐    ┌────┐    ┌────┐
        │    │    │    │    │    │    │
     0V ┘────┘    └────┘    └────┘    └
        ←  ~60ms ↓
```

빠르게 깜빡이면 사람 눈에는 연속 점등으로 보입니다. 그래서 delay를 늘려 1Hz 정도로 맞춥니다.

## 자주 보는 함정

> ⚠️ `RCC_AHB1ENR` enable을 빼먹음

GPIOA clock이 꺼진 상태에서는 register write 자체가 무시됩니다. 회로 상으로는 핀이 *floating*이 됩니다.

> ⚠️ MODER 비트를 OR만 하고 clear를 안 함

reset value가 0이라 처음에는 동작하지만, 재구성할 때 이전 모드 비트가 남아 의도와 다르게 됩니다. 항상 `&= ~mask` 후 `|= value` 패턴을 씁니다.

> ⚠️ Vector table을 잘못된 section에 배치

linker script의 `.isr_vector`와 startup의 `__attribute__((section(".isr_vector")))`가 정확히 일치해야 합니다. 안 그러면 `0x08000000`에 garbage가 들어가고 boot 즉시 HardFault가 납니다.

> ⚠️ `nostartfiles` 없이 빌드

`-nostartfiles`를 빼면 GCC가 libc의 `_start`를 자동으로 링크하려다 실패합니다. Bare-metal은 항상 `-nostartfiles` (또는 `-nostdlib`)를 줍니다.

> ⚠️ Active-low LED를 active-high로 다룸

Black Pill PC13처럼 *active-low*인 LED는 `ODR = 0`이 ON입니다. 보드 schematic을 항상 확인합니다.

## 정리

- Bare-metal hello-world는 **LED toggle**입니다. printf보다 훨씬 빠르고 안전한 진단 도구입니다.
- 최소 구성은 **vector table + Reset_Handler + main**입니다. CMSIS·HAL 없이도 100줄 안에 끝납니다.
- 동작하면 toolchain·linker·startup·clock·GPIO가 모두 정상이라는 뜻입니다. 동작 안 하면 *역순으로* 의심합니다.
- 보드의 LED 핀과 active-high/low는 **schematic 먼저 확인**합니다.

다음 편은 **레지스터 직접 접근**입니다. `volatile`·MMIO·CMSIS 구조체의 의미를 깊이 들여다봅니다.

## 관련 항목

- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [3-04: Startup 코드 작성](/blog/embedded/modern-recipes/part3-04-startup-code)
- [4-02: 레지스터 직접 접근](/blog/embedded/modern-recipes/part4-02-mmio-access)
- [4-03: GPIO 드라이버 작성](/blog/embedded/modern-recipes/part4-03-gpio-driver)
