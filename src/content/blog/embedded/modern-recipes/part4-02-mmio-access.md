---
title: "MMIO 레지스터 직접 접근 — volatile·Memory Map·Aliasing 분석"
slug: "embedded/modern-recipes/part4-02-mmio-access"
date: 2026-04-13T09:36:00
description: "volatile·MMIO·packed struct — peripheral register 다루기."
series: "Modern Embedded Recipes"
seriesOrder: 36
tags: [recipes, bare-metal, mmio]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"MMIO는 일반 메모리가 아닙니다."** `volatile` + 정확한 width access + 필요한 곳의 barrier, 이 세 가지가 register 접근의 기본기입니다.

## 어떤 상황에서 쓰나

ARM Cortex-M의 peripheral은 memory-mapped입니다. STM32F411의 `0x40020014`에 write하면 GPIOA의 ODR이 바뀝니다. 그런데 일반 C 변수처럼 다루면 compiler가 접근을 지우거나 한 번만 읽고 말아서 원하는 동작이 나오지 않습니다. bit-field로 선언하면 접근 폭까지 바뀝니다.

CMSIS 헤더가 이 패턴을 표준화해 주지만, 그 안에서 무슨 일이 벌어지는지 모르면 새 SoC를 다룰 때 매번 막힙니다. 이 글은 각 패턴을 arm-none-eabi-gcc 16.2.0으로 실제로 컴파일해 나온 명령으로 확인합니다.

## 핵심 개념

### `volatile`이 막는 것

C11(N1570) 6.7.3p7은 volatile 객체가 "may be modified in ways unknown to the implementation"이므로, 그 객체를 가리키는 식은 "shall be evaluated strictly according to the rules of the abstract machine"이라고 적습니다. 쓰기 두 번은 두 번, 읽기 한 번은 한 번 일어나야 한다는 뜻입니다.

```c
volatile uint32_t *p = (volatile uint32_t *)0x40020014;

*p = 0x20;   // 이 write를 제거하지 않는다
x = *p;      // 이 read를 제거·합치지 않는다
*p = 0x20;   // 같은 값이라도 생략하지 않는다
```

`volatile`이 없으면 어떻게 되는지 같은 함수를 둘 만들어 `-O2`로 컴파일해 봤습니다. `vol.c`는 `#include <stdint.h>`와 이 절의 세 함수이고, 명령은 아래 "측정" 절에 있습니다.

```c
void led_blink_plain(void) {
    uint32_t *odr = (uint32_t *)0x40020014;           /* volatile 없음 */
    *odr = 0x20;   /* ON  */
    *odr = 0x00;   /* OFF */
}

void led_blink_volatile(void) {
    volatile uint32_t *odr = (volatile uint32_t *)0x40020014;
    *odr = 0x20;
    *odr = 0x00;
}
```

```text
00000000 <led_blink_plain>:
   0:	4b01      	ldr	r3, [pc, #4]	@ (8 <led_blink_plain+0x8>)
   2:	2200      	movs	r2, #0
   4:	615a      	str	r2, [r3, #20]
   6:	4770      	bx	lr

0000000c <led_blink_volatile>:
   c:	4b02      	ldr	r3, [pc, #8]	@ (18 <led_blink_volatile+0xc>)
   e:	2120      	movs	r1, #32
  10:	2200      	movs	r2, #0
  12:	6159      	str	r1, [r3, #20]
  14:	615a      	str	r2, [r3, #20]
  16:	4770      	bx	lr
```

`volatile`이 없으면 `0x20`을 쓰는 첫 store가 dead store로 지워져 `str`이 하나만 남습니다. LED는 켜지지 않습니다. 읽기 쪽은 더 심합니다. USART1 SR(`0x40011000`)의 RXNE(bit 5)를 기다리는 loop를 `volatile` 없이 쓰면 이렇게 됩니다.

```c
uint32_t wait_flag_plain(void) {
    uint32_t *sr = (uint32_t *)0x40011000;           /* USART1 SR */
    while ((*sr & (1u << 5)) == 0) { }               /* RXNE */
    return 1;
}
```

```text
  1e:	681b      	ldr	r3, [r3, #0]
  20:	069b      	lsls	r3, r3, #26
  22:	d501      	bpl.n	28 <wait_flag_plain+0xc>
  24:	2001      	movs	r0, #1
  26:	4770      	bx	lr
  28:	e7fe      	b.n	28 <wait_flag_plain+0xc>
```

SR을 **한 번만** 읽고, 그때 bit 5가 0이면 `0x28`에서 자기 자신으로 분기하는 무한 loop에 들어갑니다. 하드웨어가 flag를 세워도 다시 읽지 않으므로 영원히 나오지 못합니다.

### MMIO struct 패턴

CMSIS는 peripheral register block을 struct로 묶어 표현합니다. 아래는 ST의 `stm32f411xe.h`(cmsis-device-f4)에 있는 `GPIO_TypeDef`와 같은 순서입니다. 헤더에서는 각 멤버가 `__IO uint32_t`(= `volatile uint32_t`)이고, 주석에 offset이 적혀 있습니다.

```c
typedef struct {
    volatile uint32_t MODER;     // 0x00
    volatile uint32_t OTYPER;    // 0x04
    volatile uint32_t OSPEEDR;   // 0x08
    volatile uint32_t PUPDR;     // 0x0C
    volatile uint32_t IDR;       // 0x10
    volatile uint32_t ODR;       // 0x14
    volatile uint32_t BSRR;      // 0x18
    volatile uint32_t LCKR;      // 0x1C
    volatile uint32_t AFR[2];    // 0x20, 0x24
} GPIO_TypeDef;

#define GPIOA  ((GPIO_TypeDef *)0x40020000)

GPIOA->MODER = 0x01 << 10;
```

struct member의 offset이 register offset과 맞는지는 컴파일 시간에 확인할 수 있습니다. 실제 ST 헤더에 대해 다음 `_Static_assert`가 모두 통과했습니다.

```c
#include <stddef.h>
#include "stm32f411xe.h"

_Static_assert(offsetof(GPIO_TypeDef, ODR)  == 0x14, "ODR");
_Static_assert(offsetof(GPIO_TypeDef, BSRR) == 0x18, "BSRR");
_Static_assert(offsetof(GPIO_TypeDef, AFR)  == 0x20, "AFR");
_Static_assert(offsetof(RCC_TypeDef, AHB1ENR) == 0x30, "AHB1ENR");
```

직접 struct를 정의할 때 이런 assert를 같이 두면 reserved 칸 하나를 빼먹은 실수가 빌드에서 잡힙니다.

### Access width와 bit-field

register를 몇 bit 폭으로 읽고 쓰는지는 C 코드만 봐서는 정해지지 않습니다. 대표적인 함정이 bit-field입니다. C11 6.7.2.1p11은 "The order of allocation of bit-fields within a unit (high-order to low-order or low-order to high-order) is implementation-defined"라고 하고, 6.7.3p7은 volatile 객체에 대한 "access"가 무엇인지도 implementation-defined라고 합니다. Arm의 AAPCS32(2025Q1)는 이를 정합니다. "Bit-fields no larger than their container" 절은 little-endian에서 bit-field 위치를 container의 최하위 bit부터 세고, "Volatile bit-fields – preserving number and width of container accesses" 절은 volatile bit-field를 쓸 때 container를 "read exactly once and written exactly once using the access width appropriate to the type of the container"로 처리하라고 합니다.

그런데 실제 컴파일러가 늘 그렇게 하지는 않습니다. MODER의 핀 0·1만 bit-field로 선언하고 `pin1_mode = 1`을 썼습니다.

```c
typedef struct {
    volatile uint32_t pin0_mode : 2;
    volatile uint32_t pin1_mode : 2;
} GPIO_MODER_t;

#define MODER_BF ((GPIO_MODER_t *)0x40020000)

void set_pin1_output(void) { MODER_BF->pin1_mode = 1; }
```

| 컴파일러 (`-O2`) | 생성 코드 |
| --- | --- |
| arm-none-eabi-gcc 16.2.0 | `ldrb` → `bfi r2, r1, #2, #2` → `strb` (byte 접근) |
| 같은 gcc, `-fstrict-volatile-bitfields` 명시 | 위와 같음 (`ldrb`/`strb`) |
| 같은 gcc, 나머지 28 bit를 `rest : 28`로 채움 | `ldr` → `bfi` → `str` (word 접근) |
| Homebrew clang 23.1.5 (`--target=armv7em-none-eabi`) | `ldr` → `bfi` → `str` (word 접근) |

bit 위치(`bfi …, #2, #2`, 즉 bit[3:2])는 AAPCS대로였지만, GCC는 32-bit register를 **byte**로 읽고 썼습니다. GCC 매뉴얼의 `-fstrict-volatile-bitfields` 항목은 "Due to restrictions of the C/C++11 memory model, write accesses are not allowed to touch non bit-field members. It is therefore recommended to define all bits of the field's type as bit-field members"라고 설명하고, 실제로 나머지 bit를 채우자 word 접근이 됐습니다. byte 쓰기를 허용하지 않는 register라면 같은 코드가 컴파일러에 따라 다르게 동작하는 셈입니다. 그래서 peripheral register에는 bit-field 대신 mask와 shift를 씁니다.

### Memory Barrier

ARMv7-M ARM(DDI 0403E.b) A3.7.2의 Figure A3-8은 접근 쌍마다 순서 보장을 정의합니다. Device 접근끼리(같은 shareability)와 Strongly-ordered 접근이 섞인 경우는 "Must occur strictly in order"(`<`)이고, Normal 접근이 끼면 순서 제약이 없습니다(`-`). Table B3-1의 기본 memory map에서 `0x40000000`~`0x5FFFFFFF` Peripheral 영역은 Device, XN입니다. 그래서 peripheral register끼리의 순서는 그대로 유지되지만, RAM의 DMA buffer를 채운 뒤 peripheral에 시작을 쓰는 것처럼 Normal과 Device가 섞이면 barrier가 필요합니다. A3.7.3은 DSB 뒤의 명령이 DSB가 끝나기 전에 실행되지 않는다고 정의합니다.

```c
// peripheral clock enable 직후 access 패턴
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
__DSB();   // Data Synchronization Barrier
GPIOA->MODER = (GPIOA->MODER & ~GPIO_MODER_MODER5) | GPIO_MODER_MODER5_0;
```

CMSIS_6의 `__DSB()`는 `dsb sy` 한 명령으로 컴파일됐습니다. 다만 ST HAL 자신은 이 자리에 DSB를 쓰지 않습니다. `stm32f4xx_hal_rcc.h`의 `__HAL_RCC_GPIOA_CLK_ENABLE()`은 bit를 set한 뒤 같은 register를 다시 읽고, 주석에 "Delay after an RCC peripheral clock enabling"이라고 적습니다. 메모리 barrier 전반은 [2-10 편](/blog/embedded/modern-recipes/part2-10-memory-barrier)에서 다룹니다.

## 코드 예제

### 1. Base + offset macro 패턴

CMSIS struct 이전의 접근법입니다. 작은 프로젝트에서는 지금도 씁니다.

```c
#define GPIOA_BASE     0x40020000UL
#define GPIOA_MODER    (*(volatile uint32_t *)(GPIOA_BASE + 0x00))
#define GPIOA_ODR      (*(volatile uint32_t *)(GPIOA_BASE + 0x14))
#define GPIOA_BSRR     (*(volatile uint32_t *)(GPIOA_BASE + 0x18))

GPIOA_MODER |= (1u << 10);   // PA5 output
GPIOA_BSRR  =  (1u << 5);    // PA5 set
GPIOA_BSRR  =  (1u << 21);   // PA5 reset (BSRR upper 16-bit)
```

`stm32f411xe.h`의 bit 정의에서 BSRR의 하위 16 bit는 `GPIO_BSRR_BS0`~`BS15`(set), 상위 16 bit는 `GPIO_BSRR_BR0`~`BR15`(reset)입니다.

### 2. Struct 패턴 (CMSIS 스타일)

```c
#include "stm32f411xe.h"

void led_init(void) {
    GPIOA->MODER &= ~(3u << (5 * 2));
    GPIOA->MODER |=  (1u << (5 * 2));
}

void led_on(void)  { GPIOA->BSRR = (1u << 5); }
void led_off(void) { GPIOA->BSRR = (1u << 21); }
```

### 3. Read-modify-write의 함정

`ODR ^=`는 한 줄이지만 명령 셋입니다. ST 헤더로 `-O2` 컴파일한 결과입니다.

```c
void toggle_rmw(void)   { GPIOA->ODR ^= (1u << 5); }
void set_bsrr(void)     { GPIOA->BSRR = (1u << 5); }
void toggle_locked(void) {
    __disable_irq();
    GPIOA->ODR ^= (1u << 5);
    __enable_irq();
}
```

```text
00000000 <toggle_rmw>:
   2:	6953      	ldr	r3, [r2, #20]
   4:	f083 0320 	eor.w	r3, r3, #32
   8:	6153      	str	r3, [r2, #20]

00000010 <set_bsrr>:
  12:	2220      	movs	r2, #32
  14:	619a      	str	r2, [r3, #24]

0000002c <toggle_locked>:
  2c:	b672      	cpsid	i
  30:	6953      	ldr	r3, [r2, #20]
  32:	f083 0320 	eor.w	r3, r3, #32
  36:	6153      	str	r3, [r2, #20]
  38:	b662      	cpsie	i
```

`ldr`과 `str` 사이에 interrupt가 들어와 ISR이 같은 register의 다른 bit를 바꾸면, main의 `str`이 ISR이 쓴 값을 옛 값으로 덮어씁니다. BSRR은 store 하나이므로 이 틈이 없습니다. ST HAL의 `HAL_GPIO_WritePin()` 주석도 "This function uses GPIOx_BSRR register to allow atomic read/modify accesses. In this way, there is no risk of an IRQ occurring between the read and the modify access"라고 적습니다.

이 손실을 실제로 보려고 QEMU `mps2-an386`(Cortex-M4)에서 RAM 변수 하나를 register 대신 썼습니다. QEMU의 이 보드는 GPIO를 모델링하지 않지만(`hw/arm/mps2.c`가 `cmsdk-ahb-gpio`를 unimplemented device로 둠), RAM이면 같은 명령 패턴을 그대로 재현할 수 있습니다. main은 `reg += 1`을 60,000번 하고, SysTick ISR은 `reg += 0x10000`과 별도 카운터 증가를 합니다. 생성된 main loop는 위 `toggle_rmw`와 같은 `ldr`/`add`/`str`입니다. `-icount shift=0`으로 SysTick을 명령 수에 묶어 매번 같은 결과가 나오게 했습니다.

실습 harness는 네 파일입니다. linker script는 [4-01](/blog/embedded/modern-recipes/part4-01-first-baremetal)의 것에서 메모리만 QEMU `mps2` 배치(code `0x0`, RAM `0x20000000`)로 바꿨습니다. startup은 4-01과 같되 vector table을 SysTick(15번)과 외부 IRQ 32개까지 늘리고, handler를 weak alias로 둬서 테스트 파일이 같은 이름으로 덮어쓰게 했습니다. 출력은 QEMU `hw/char/cmsdk-apb-uart.c`의 register 배치(DATA `0x0`, STATE `0x4`, CTRL `0x8`, BAUDDIV `0x10`)를 쓰는 CMSDK UART0(`0x40004000`)로 하고, 끝나면 semihosting `SYS_EXIT`로 QEMU를 끝냅니다. 이후 4장 글들이 이 harness를 다시 씁니다.

```text
/* mps2.ld */
MEMORY { FLASH (rx) : ORIGIN = 0x00000000, LENGTH = 4M
         RAM  (rwx) : ORIGIN = 0x20000000, LENGTH = 4M }
_estack = ORIGIN(RAM) + LENGTH(RAM);
SECTIONS {
  .isr_vector : { KEEP(*(.isr_vector)) } > FLASH
  .text : { *(.text*) *(.rodata*) } > FLASH
  _sidata = LOADADDR(.data);
  .data : { _sdata = .; *(.data*) _edata = .; } > RAM AT > FLASH
  .bss : { _sbss = .; *(.bss*) *(COMMON) _ebss = .; } > RAM
}
```

```c
/* startup.c */
#include <stdint.h>
extern uint32_t _estack, _sidata, _sdata, _edata, _sbss, _ebss;
int main(void);
void Reset_Handler(void);
static void Default_Handler(void) { for (;;) {} }
void NMI_Handler(void)        __attribute__((weak, alias("Default_Handler")));
void HardFault_Handler(void)  __attribute__((weak, alias("Default_Handler")));
void SVC_Handler(void)        __attribute__((weak, alias("Default_Handler")));
void PendSV_Handler(void)     __attribute__((weak, alias("Default_Handler")));
void SysTick_Handler(void)    __attribute__((weak, alias("Default_Handler")));
void IRQ_Handler(void)        __attribute__((weak, alias("Default_Handler")));
__attribute__((section(".isr_vector"), used))
void (* const vectors[16 + 32])(void) = {
    (void (*)(void))&_estack, Reset_Handler, NMI_Handler, HardFault_Handler,
    Default_Handler, Default_Handler, Default_Handler, 0, 0, 0, 0,
    SVC_Handler, Default_Handler, 0, PendSV_Handler, SysTick_Handler,
    [16 ... 47] = IRQ_Handler,
};
void Reset_Handler(void) {
    uint32_t *s = &_sidata, *d = &_sdata;
    while (d < &_edata) *d++ = *s++;
    for (d = &_sbss; d < &_ebss; ) *d++ = 0;
    main();
    for (;;) {}
}
```

```c
/* uart.h */
#include <stdint.h>
/* CMSDK APB UART0 on QEMU mps2-an385/an386 */
#define UART0_DATA  (*(volatile uint32_t *)0x40004000)
#define UART0_STATE (*(volatile uint32_t *)0x40004004)
#define UART0_CTRL  (*(volatile uint32_t *)0x40004008)
#define UART0_BAUD  (*(volatile uint32_t *)0x40004010)
static inline void uart_init(void) { UART0_BAUD = 16; UART0_CTRL = 1; }
static inline void uart_putc(char c) { while (UART0_STATE & 1) {} UART0_DATA = (uint32_t)c; }
static inline void uart_puts(const char *s) { while (*s) uart_putc(*s++); }
static inline void uart_hex(uint32_t v) { for (int i = 28; i >= 0; i -= 4) uart_putc("0123456789abcdef"[(v >> i) & 0xf]); }
static inline void uart_dec(uint32_t v) { char b[11]; int i = 10; b[i] = 0; do { b[--i] = '0' + v % 10; v /= 10; } while (v); uart_puts(&b[i]); }
static inline void qemu_exit(void) { /* semihosting SYS_EXIT */
    register uint32_t r0 __asm("r0") = 0x18; register uint32_t r1 __asm("r1") = 0x20026;
    __asm volatile ("bkpt 0xab" : : "r"(r0), "r"(r1) : "memory"); }
```

```c
/* race.c */
#include <stdint.h>
#include "uart.h"
#define SYST_CSR (*(volatile uint32_t *)0xE000E010)
#define SYST_RVR (*(volatile uint32_t *)0xE000E014)
#define SYST_CVR (*(volatile uint32_t *)0xE000E018)

volatile uint32_t reg;          /* ODR 대신 쓰는 RAM "register" */
volatile uint32_t isr_count;

void SysTick_Handler(void) {    /* ISR: bit 16 이상을 카운터로 사용 */
    reg += 0x10000;
    isr_count++;
}

static void run(int locked) {
    reg = 0; isr_count = 0;
    SYST_RVR = 99; SYST_CVR = 0; SYST_CSR = 7;   /* CPU clock, IRQ, enable */
    for (uint32_t i = 0; i < 60000; i++) {
        if (locked) __asm volatile ("cpsid i" ::: "memory");
        reg += 1;                                  /* main: 하위 16 bit RMW */
        if (locked) __asm volatile ("cpsie i" ::: "memory");
    }
    SYST_CSR = 0;
    uint32_t r = reg, n = isr_count;
    uart_puts(locked ? "locked  : " : "unlocked: ");
    uart_puts("isr="); uart_dec(n);
    uart_puts(" isr_seen="); uart_dec(r >> 16);
    uart_puts(" main_seen="); uart_dec(r & 0xffff);
    uart_puts(" (main expect 60000)\n");
}

int main(void) {
    uart_init();
    run(0);
    run(1);
    qemu_exit();
    return 0;
}
```

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -ffreestanding -nostdlib -O2 \
    -T mps2.ld -o race.elf startup.c race.c
qemu-system-arm -M mps2-an386 -nographic -semihosting -kernel race.elf -icount shift=0
```

```text
unlocked: isr=75 isr_seen=30 main_seen=60000 (main expect 60000)
locked  : isr=105 isr_seen=105 main_seen=60000 (main expect 60000)
```

ISR은 75번 돌았지만 그중 45번의 갱신이 main의 `str`에 덮여 사라졌습니다. 같은 loop를 `cpsid i`/`cpsie i`로 감싸면 105번 모두 남습니다. 숫자는 계산과 맞습니다. QEMU 문서(`qemu-options.hx`)에 따르면 `-icount shift=0`은 "one instruction every 2^N ns of virtual time", 즉 명령 하나가 1 ns입니다. `hw/arm/mps2.c`의 CPU clock은 25 MHz이고 `SYST_RVR = 99`이므로 SysTick 한 주기는 100 cycle = 4,000 ns = 4,000 명령입니다. 5명령 loop × 60,000번 = 300,000 명령에서 75번, `cpsid`/`cpsie`가 든 7명령 loop에서 105번입니다. `-icount` 없이 돌리면 unlocked는 `isr=0`, locked는 실행마다 5~10번으로 들쭉날쭉했습니다. 같은 문서는 icount가 결정적인 결과를 주지만 "not provide cycle accurate emulation"이라고 적으므로, 이 실험은 손실 횟수 자체가 아니라 손실이 생기는 자리가 `ldr`과 `str` 사이라는 점을 보여 줍니다.

### 4. Bit-band alias

Cortex-M4 TRM 3.7절의 bit-banding은 1 MB 영역의 각 bit를 alias 영역의 word 하나에 대응시키고, alias에 대한 write를 bus 쪽에서 "an atomic read-modify-write operation"으로 바꿉니다. 주소는 `bit_word_addr = bit_band_base + (byte_offset x 32) + (bit_number x 4)`이고, TRM은 bit-banding이 "an optional feature"라고 적습니다. ST 헤더는 `SRAM1_BB_BASE 0x22000000`, `PERIPH_BB_BASE 0x42000000`을 정의하므로 F411의 GPIOA ODR bit 5 alias는 `0x42000000 + 0x20014*32 + 5*4 = 0x42400294`입니다.

QEMU `mps2-an386`은 `hw/arm/mps2.c`에서 `enable-bitband`를 켜 두므로, 앞의 실험에서 main의 `reg += 1`을 alias 쓰기로 바꿔 같은 harness와 같은 `-icount shift=0` 명령으로 돌렸습니다.

```c
/* bitband.c */
#include <stdint.h>
#include "uart.h"
#define SYST_CSR (*(volatile uint32_t *)0xE000E010)
#define SYST_RVR (*(volatile uint32_t *)0xE000E014)
#define SYST_CVR (*(volatile uint32_t *)0xE000E018)
/* M4 TRM 3.7: bit_word_addr = 0x22000000 + byte_offset*32 + bit*4 */
#define BITBAND_SRAM(addr, bit) \
    (*(volatile uint32_t *)(0x22000000u + (((uint32_t)(addr) - 0x20000000u) * 32u) + (bit) * 4u))

volatile uint32_t reg;
volatile uint32_t isr_count;
void SysTick_Handler(void) { reg += 0x10000; isr_count++; }

int main(void) {
    uart_init();
    uart_puts("&reg="); uart_hex((uint32_t)&reg);
    uart_puts(" alias(bit5)="); uart_hex((uint32_t)&BITBAND_SRAM(&reg, 5)); uart_puts("\n");
    BITBAND_SRAM(&reg, 5) = 1;
    uart_puts("after alias write 1: reg="); uart_hex(reg);
    uart_puts(" alias read="); uart_dec(BITBAND_SRAM(&reg, 5)); uart_puts("\n");

    reg = 0; isr_count = 0;
    SYST_RVR = 99; SYST_CVR = 0; SYST_CSR = 7;
    for (uint32_t i = 0; i < 60000; i++) {
        BITBAND_SRAM(&reg, 5) = 1;
        BITBAND_SRAM(&reg, 5) = 0;
    }
    SYST_CSR = 0;
    uart_puts("bit-band: isr="); uart_dec(isr_count);
    uart_puts(" isr_seen="); uart_dec(reg >> 16); uart_puts("\n");
    qemu_exit();
    return 0;
}
```


```text
&reg=20000000 alias(bit5)=22000014
after alias write 1: reg=00000020 alias read=1
bit-band: isr=60 isr_seen=60
```

alias 쓰기는 interrupt가 끼어들 `ldr`/`str` 틈이 없으므로 ISR 갱신 60번이 모두 남았습니다.

## 측정 / 동작 확인

이 글의 출력은 모두 다음 환경에서 만들었습니다. ST 헤더를 쓰는 예제는 CMSIS_6 v6.1.0 Core 헤더와 cmsis-device-f4(2026-10 GitHub master)를 include 경로에 넣었습니다.

```bash
arm-none-eabi-gcc --version | head -1     # arm-none-eabi-gcc (GCC) 16.2.0
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -ffreestanding -O2 -c vol.c
arm-none-eabi-objdump -d vol.o
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfloat-abi=soft -ffreestanding -O2 -Wall \
    -DSTM32F411xE -ICMSIS_6/CMSIS/Core/Include -Icmsis-device-f4/Include -c ex4.c
```

disassembly에서 확인할 것은 세 가지입니다. register마다 기대한 횟수의 `ldr`/`str`이 있는지, 폭이 `ldr`/`str`(word)인지 `ldrb`/`strh` 같은 좁은 접근인지, polling loop가 매 반복 다시 `ldr`하는지입니다.

## 자주 보는 함정

> ⚠️ Compiler 최적화로 register access가 사라짐

위 `led_blink_plain`은 `-O2`에서 store 하나를 잃었고, `wait_flag_plain`은 SR을 한 번만 읽고 무한 loop가 됐습니다. 같은 파일을 `-O0`으로 빌드하면 store 두 개와 매 반복의 SR `ldr`이 그대로 남으므로, 이 문제는 최적화를 켜야 드러납니다.

> ⚠️ Cast 후 dereference에 `volatile`을 빼먹음

```c
// 잘못
uint32_t *p = (uint32_t *)0x40020014;
*p = 0x20;

// 옳음
volatile uint32_t *p = (volatile uint32_t *)0x40020014;
*p = 0x20;
```

CMSIS struct 패턴이 안전한 이유는 struct member 선언에 `__IO`(`volatile`)이 들어 있기 때문입니다.

> ⚠️ Read의 부수효과 무시

STM32F4 USART는 data register를 읽는 것 자체가 동작입니다. ST HAL `stm32f4xx_hal_uart.h`는 "RXNE flag can be also cleared by a read to the USART_DR register"라고 적습니다. flag를 지우려고 하는 dummy read를 `volatile` 없이 쓰면 compiler가 쓰이지 않는 read로 보고 지웁니다.

> ⚠️ Clock 활성화 직후 access

```c
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
(void)RCC->AHB1ENR;   // HAL과 같은 read-back
GPIOA->MODER = ...;
```

ST HAL은 enable 직후 같은 register를 한 번 더 읽습니다. 이 글의 [4-01 예제](/blog/embedded/modern-recipes/part4-01-first-baremetal)처럼 이것을 빼면 enable `str` 다음 명령이 바로 GPIO register 접근입니다.

> ⚠️ Bit-field로 register를 선언

GCC 16.2는 4 bit만 선언한 volatile bit-field에 byte 접근을 냈고, 같은 소스를 clang은 word로 접근했습니다. 같은 헤더가 컴파일러마다 다른 bus 접근을 만들 수 있으므로 mask·shift를 씁니다.

## 정리

- MMIO register는 **반드시 `volatile`**입니다. 없으면 `-O2`에서 store가 지워지고 polling loop가 무한 loop가 됩니다.
- **CMSIS struct 패턴**은 member에 `__IO`가 붙어 있고, offset은 `_Static_assert(offsetof(...))`로 빌드 때 검증할 수 있습니다.
- **BSRR**과 **bit-band alias**는 store 한 번이라 ISR과의 read-modify-write 경합이 없습니다. QEMU에서 RAM 변수의 `ldr`/`add`/`str` read-modify-write는 ISR 갱신 75번 중 45번을 잃었습니다.
- **Bit-field는 쓰지 않습니다.** 접근 폭이 컴파일러와 선언 방식에 따라 달라집니다.
- Device끼리는 순서가 보장되고, Normal과 섞일 때 barrier가 필요합니다(DDI 0403E.b Figure A3-8).

다음 편은 **GPIO 드라이버 작성**입니다. MODER·OTYPER·OSPEEDR·PUPDR·AFR, STM32 GPIO의 모든 register를 한 번에 정리합니다.

## 관련 항목

- [Part 4-01: 첫 bare-metal 프로그램](/blog/embedded/modern-recipes/part4-01-first-baremetal)
- [Part 4-03: GPIO 드라이버 작성](/blog/embedded/modern-recipes/part4-03-gpio-driver)
- [Part 2-05: ARM 메모리 맵](/blog/embedded/modern-recipes/part2-05-arm-memory-map)
- [Part 2-10: Memory Barrier 실전](/blog/embedded/modern-recipes/part2-10-memory-barrier)
