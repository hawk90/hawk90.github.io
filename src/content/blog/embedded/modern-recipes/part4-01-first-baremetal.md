---
title: "첫 bare-metal 프로그램 작성 — Linker·Startup·main의 최소 구성"
slug: "embedded/modern-recipes/part4-01-first-baremetal"
date: 2026-04-13T09:35:00
description: "LED toggle — 최소한의 startup·main·loop."
series: "Modern Embedded Recipes"
seriesOrder: 35
tags: [recipes, bare-metal, led]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"디버거 없이 LED 한 개를 깜빡이는 것은 bare-metal bring-up의 간단한 첫 검사입니다."** 다만 이 검사가 toolchain·linker·boot 전체의 정상 동작을 보장하는 것은 아닙니다.

## 어떤 상황에서 쓰나

새 보드를 받았거나, 새 toolchain을 구성했거나, 새 startup·linker script를 작성했을 때 처음 던지는 질문은 "이게 동작하는가"입니다. printf 한 줄이라도 보려면 UART의 clock, 핀 mux, baud rate 설정이 모두 맞아야 합니다. 그보다 단순한 답이 **LED toggle**입니다.

GPIO 출력 핀 하나만 살아 있으면 됩니다. 일정한 주기로 깜빡이면 main이 돌고 있다는 뜻이고, 안 깜빡이면 reset부터 GPIO 설정까지 어딘가가 틀렸다는 뜻입니다. 이 글은 Nucleo-F411RE용 최소 프로그램을 만들고, 같은 바이너리를 QEMU에서 돌려 reset 직후의 레지스터와 GPIO 쓰기를 직접 확인합니다.

## 핵심 개념

### 최소 boot 흐름

ARMv7-M Architecture Reference Manual(DDI 0403E.b) B1.5.5의 `TakeReset()` 의사코드가 Cortex-M의 reset 동작을 정의합니다. vector table 주소는 `VTOR<31:7>:'0000000'`이고, 그 첫 word를 `SP_main`에, 둘째 word를 PC에 넣습니다. 둘째 word의 bit 0은 `EPSR.T`가 되고, 분기 주소는 bit 0을 지운 값입니다. `LR`은 `0xFFFFFFFF`로 둡니다.

| 단계 | 하는 일 | 근거 |
| --- | --- | --- |
| reset | vector table word 0 → MSP, word 1 → PC | DDI 0403E.b B1.5.5 `TakeReset()` |
| `Reset_Handler` | `.data`를 Flash에서 RAM으로 복사, `.bss`를 0으로 | 아래 startup 코드 |
| `main()` | GPIO clock·모드 설정 후 `while(1) { toggle; delay; }` | 아래 main 코드 |

같은 문서 B1.5.3은 reset 때 vector table 주소가 "IMPLEMENTATION DEFINED"이고 VTOR로 옮길 수 있다고 적습니다. VTOR(B3.2.5)는 "Always implemented"이고, 칩이 reset 값을 정하는 입력을 두지 않으면 0으로 reset됩니다. table은 "(Number of Exceptions supported x 4)" 이상인 2의 거듭제곱으로, 최소 128 byte 정렬해야 하고, word 0을 뺀 모든 entry는 bit[0]이 1이어야 합니다. 0이면 INVSTATE UsageFault입니다.

### LED와 GPIO

user LED 핀은 보드마다 다릅니다. Zephyr의 board DTS(`boards/st/…`, `boards/weact/…`)에 적힌 값을 옮겼습니다.

| 보드 | LED | GPIO | Zephyr DTS |
|------|-----|------|------------|
| Nucleo-F411RE | LD2 (green) | PA5, active-high | `nucleo_f411re.dts` |
| Nucleo-F767ZI | LD1/LD2/LD3 | PB0/PB7/PB14 | `nucleo_f767zi.dts` |
| STM32F4 Discovery | LD3–LD6 | PD13/PD12/PD14/PD15 | `stm32f4_disco.dts` |
| WeAct Black Pill F411CE | User LED | PC13, `GPIO_ACTIVE_LOW` | `blackpill_f411ce.dts` |

이 글의 예제는 **Nucleo-F411RE, PA5**를 기준으로 합니다.

## 코드 예제

### 1. Vector table과 startup

vector table을 `.isr_vector` section에 두고, reset 때 `.data` 복사와 `.bss` clear만 한 뒤 `main()`을 부릅니다.

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

CMSIS 헤더 없이 register 주소를 직접 정의합니다. 한 파일에서 전체 흐름이 보입니다. 주소와 offset은 ST의 CMSIS 헤더 `stm32f411xe.h`(cmsis-device-f4)와 맞춰 봤습니다. `AHB1PERIPH_BASE`는 `0x40020000`, `GPIOA_BASE`는 그 `+0x0000`, `RCC_BASE`는 `+0x3800`이고, `RCC_TypeDef`의 `AHB1ENR`은 offset `0x30`, `GPIO_TypeDef`의 `MODER`·`ODR`은 `0x00`·`0x14`입니다. `RCC_AHB1ENR_GPIOAEN_Pos`는 0, `GPIO_MODER_MODER5_Pos`는 10입니다.

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

Flash 512 KB, RAM 128 KB는 같은 헤더의 `FLASH_BASE 0x08000000`·`FLASH_END 0x0807FFFF`와 `SRAM1_BASE 0x20000000`("SRAM1(128 KB)")에서 왔습니다.

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

arm-none-eabi-gcc 16.2.0(Homebrew)으로 빌드했습니다. 이 toolchain에는 newlib이 들어 있지 않아서, 처음 쓴 `-nostartfiles`만으로는 두 번 실패합니다. `#include <stdint.h>`는 `-ffreestanding` 없이 `fatal error: stdint.h: No such file or directory`로 멈추고, 그걸 넣어도 링크에서 `cannot find -lc`가 납니다. 이 코드는 libc를 쓰지 않으므로 `-nostdlib`로 기본 라이브러리와 startup 파일을 모두 뺍니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -ffreestanding -nostdlib \
    -T stm32f411.ld -o blink.elf startup.c main.c
arm-none-eabi-objcopy -O binary blink.elf blink.bin
arm-none-eabi-size -A blink.elf
```

```text
blink.elf  :
section           size        addr
.isr_vector         16   134217728
.text              212   134217744
```

`.isr_vector`가 `134217728`(`0x08000000`)에서 16 byte(entry 4개)를 차지합니다. `blink.bin`의 첫 8 byte는 `0000 0220 1100 0008`, 즉 little-endian으로 `0x20020000`(`_estack` = RAM 끝)과 `0x08000011`(`Reset_Handler` 주소 `0x08000010`에 Thumb bit)입니다. 보드에 올릴 때는 이렇게 씁니다.

```bash
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

### QEMU에서 reset과 GPIO 쓰기 보기

보드 없이 확인하려고 같은 `blink.elf`를 QEMU 11.1.3의 `netduinoplus2`(STM32F405, Cortex-M4)에 올렸습니다. F405의 CMSIS 헤더 `stm32f405xx.h`도 `AHB1PERIPH_BASE`, `GPIOA_BASE`, `RCC_BASE`를 F411과 같은 식으로 정의하므로 주소가 그대로 맞습니다. `-S`로 첫 명령 전에 멈추고 monitor에서 레지스터를 봤습니다.

```bash
qemu-system-arm -M netduinoplus2 -nographic -kernel blink.elf \
    -monitor stdio -serial null -S
(qemu) info registers
```

```text
R12=00000000 R13=20020000 R14=ffffffff R15=08000010
XPSR=41000000 -Z-- T priv-thread
```

`TakeReset()` 그대로입니다. R13(MSP)은 vector word 0인 `0x20020000`, R15(PC)는 word 1에서 bit 0을 지운 `0x08000010`, R14(LR)는 `0xFFFFFFFF`이고 XPSR의 `T`가 켜져 있습니다. `-S` 없이 1초 돌린 뒤에는 `R15=0800007e`, `R14=080000d1`로, PC가 `delay()`(`0x08000074`~) 안에 있고 LR이 `main()`으로 돌아갈 주소였습니다.

QEMU의 이 보드는 GPIO를 "unimplemented device"로만 두므로, `-d unimp`로 쓰기를 기록할 수 있습니다.

```bash
qemu-system-arm -M netduinoplus2 -nographic -kernel blink.elf \
    -d unimp,guest_errors -D qemu-unimp.log
```

```text
GPIOA: unimplemented device read  (size 4, offset 0x000)
GPIOA: unimplemented device write (size 4, offset 0x000, value 0x00000000)
GPIOA: unimplemented device read  (size 4, offset 0x000)
GPIOA: unimplemented device write (size 4, offset 0x000, value 0x00000400)
GPIOA: unimplemented device read  (size 4, offset 0x014)
GPIOA: unimplemented device write (size 4, offset 0x014, value 0x00000020)
```

MODER(offset `0x000`)를 읽고 bit[11:10]을 지운 값, 다시 읽고 `0x400`(bit 10)을 OR한 값을 쓰는 두 번의 read-modify-write가 그대로 보입니다. 그다음부터는 ODR(offset `0x014`)의 read와 write가 반복됩니다. 이 모델은 읽으면 0을 돌려주므로 `ODR ^= 0x20`이 늘 `0x20`을 씁니다. 실제 칩의 ODR은 출력 상태를 돌려주는 register이고, ST HAL의 `HAL_GPIO_TogglePin()`(`stm32f4xx_hal_gpio.c`)도 `odr = GPIOx->ODR`로 현재 값을 읽어 토글할 bit를 정합니다. 즉 QEMU로 확인되는 것은 vector table, startup, 주소·offset·bit 위치까지이고, LED가 실제로 깜빡이는지는 보드에서 봐야 합니다.

### delay 주기

`delay()`는 기본 최적화(-O0)에서 반복 한 번에 6개 명령(`nop`, `ldr`, `subs`, `str`, `cmp`, `bne`)으로 컴파일됐습니다(`objdump -d --disassemble=delay`). 이 코드는 clock 설정을 건드리지 않습니다. ST의 `system_stm32f4xx.c` 템플릿은 `SystemCoreClock`의 초기값을 `16000000`으로 두고 `HSI_VALUE`도 16000000으로 정의하는데, 주석은 실제 HSI 값이 "may vary depending on the variations in voltage and temperature"라고 덧붙입니다. 다만 Cortex-M4 TRM 3.3.1절의 cycle 표는 zero wait state를 전제하고, 분기는 "1 + P"(pipeline refill P는 1~3)라서 명령 수만으로 flash에서 도는 loop의 주기를 계산할 수 없습니다. 보드에서 PA5를 scope로 재서 `delay()` 인자를 맞춥니다.

![PA5 Output — Square Wave](/images/blog/modern-recipes/diagrams/part4-01-square-wave.svg)

| 관찰 | 확인되는 것 |
|-----------|------|
| LED ON/OFF | GPIO 출력 경로, RCC enable |
| 일정 주기 | main loop가 돈다 |
| 깜빡임 안 함 | reset·linker·startup·clock·GPIO 중 어디선가 멈춤. 아래 함정부터 확인 |

## 자주 보는 함정

> ⚠️ `RCC_AHB1ENR` enable을 빼먹음

GPIOA의 clock enable bit는 `RCC_AHB1ENR`의 bit 0(`RCC_AHB1ENR_GPIOAEN`)입니다. ST HAL의 `__HAL_RCC_GPIOA_CLK_ENABLE()`(`stm32f4xx_hal_rcc.h`)은 이 bit를 set한 직후 같은 bit를 다시 읽는데, 주석이 "Delay after an RCC peripheral clock enabling"입니다. 이 글의 `main.c`는 이 read-back 없이 enable 다음 명령에서 바로 MODER를 읽습니다(`str` 뒤 바로 `ldr`). 보드에서 첫 MODER 쓰기가 먹지 않는다면 HAL처럼 `(void)RCC_AHB1ENR;` 한 줄을 넣어 봅니다.

> ⚠️ MODER 비트를 OR만 하고 clear를 안 함

MODER는 핀마다 2 bit입니다. ST HAL `stm32f4xx_hal_gpio.h`의 `MODE_INPUT`/`MODE_OUTPUT`/`MODE_AF`/`MODE_ANALOG`가 각각 0/1/2/3이므로, 이전 값이 `10`(alternate function)이었다면 `01`을 OR해도 `11`(analog)이 될 뿐 output이 되지 않습니다. 위 QEMU 로그처럼 `&= ~(3u << 10)`으로 먼저 지우고 `|= (1u << 10)`을 씁니다.

> ⚠️ Vector table을 잘못된 section에 배치

startup의 `section(".isr_vector")`를 `section(".vectors")`로 바꿔 빌드하면 경고 없이 링크되지만, linker script가 모르는 `.vectors`는 `.text` 뒤(`0x080000d4`)로 밀리고 `0x08000000`에는 `Reset_Handler`의 첫 명령(`80b5 82b0 …`)이 옵니다. QEMU에 올리면 그 명령 bytes가 SP가 되고 바로 멈춥니다.

```text
qemu: fatal: Lockup: can't escalate 3 to HardFault (current priority -1)
R12=00000000 R13=b082b560 R14=fffffff9 R15=e007603a
```

`-d int`를 더해 다시 돌리면 순서가 보입니다.

```text
Loaded reset SP 0xb082b580 PC 0x4b10af00 from vector table
Taking exception 3 [Prefetch Abort] on CPU 0
...at fault address 0x4b10af00
...with CFSR.IACCVIOL
...BusFault with BFSR.STKERR
...loaded new PC 0xe007603b
Taking exception 3 [Prefetch Abort] on CPU 0
...at fault address 0xe007603a
...with CFSR.IACCVIOL
```

word 0 자리에 있던 `push {r7, lr}`(`b580`), `sub sp, #8`(`b082`)이 SP `0xb082b580`이 됐습니다. word 1(`0x4b10af00`)은 DDI 0403E.b Table B3-1에서 XN(Execute Never)인 Peripheral 영역(`0x40000000`~`0x5FFFFFFF`)이라 명령 fetch가 MemManage `IACCVIOL` fault를 냈고, 이것이 HardFault(exception 3)로 올라갔습니다. 예외 진입은 SP를 8 word(32 byte) 내려 `0xb082b560`을 만들었지만 그 주소에는 메모리가 없어 쌓기 자체도 BusFault(`BFSR.STKERR`)였습니다. HardFault vector(word 3)도 코드 bytes인 `0xe007603b`라서 PC가 `0xe007603a`로 갔고, 그곳도 XN인 System 영역이라 HardFault 안에서 다시 `IACCVIOL`이 나 lockup이 됐습니다. linker script의 `KEEP(*(.isr_vector))`와 startup의 section 이름은 정확히 같아야 합니다.

> ⚠️ startup·libc 옵션을 toolchain에 맞추지 않음

앞의 빌드 절처럼 같은 코드도 toolchain에 libc가 있느냐에 따라 필요한 옵션이 다릅니다. libc가 없는 이 Homebrew 빌드에서는 `-nostartfiles`가 `cannot find -lc`로 실패했고 `-nostdlib`가 필요했습니다. 어느 쪽이든 `arm-none-eabi-nm -n blink.elf`로 `vector_table`이 `0x08000000`에 있는지 먼저 봅니다. 위 빌드에서는 `08000000 R vector_table`, `08000010 T Reset_Handler`, `20020000 R _estack`이 나왔습니다.

> ⚠️ Active-low LED를 active-high로 다룸

Black Pill의 PC13은 Zephyr DTS에 `GPIO_ACTIVE_LOW`로 적혀 있습니다. 이런 LED는 `ODR = 0`일 때 켜집니다. 보드 schematic이나 board 정의를 먼저 확인합니다.

## 정리

- Bare-metal hello-world는 **LED toggle**입니다. UART보다 설정할 것이 적어 첫 진단에 알맞습니다.
- 최소 구성은 **vector table + Reset_Handler + main**이고, 이 예제는 코드 228 byte(`.isr_vector` 16 + `.text` 212)입니다.
- reset은 vector word 0을 MSP, word 1을 PC로 씁니다. QEMU의 `info registers`로 그대로 확인할 수 있습니다.
- section 이름 하나가 틀려도 링크는 성공하고, QEMU에서는 쓰레기 SP·PC로 바로 lockup됐습니다.
- 보드의 LED 핀과 active-high/low는 schematic이나 board 정의를 먼저 확인합니다.

다음 편은 **레지스터 직접 접근**입니다. `volatile`·MMIO·CMSIS 구조체의 의미를 깊이 들여다봅니다.

## 관련 항목

- [Part 1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [Part 3-06: Startup 코드 작성](/blog/embedded/modern-recipes/part3-06-startup-code)
- [Part 4-02: 레지스터 직접 접근](/blog/embedded/modern-recipes/part4-02-mmio-access)
- [Part 4-03: GPIO 드라이버 작성](/blog/embedded/modern-recipes/part4-03-gpio-driver)
