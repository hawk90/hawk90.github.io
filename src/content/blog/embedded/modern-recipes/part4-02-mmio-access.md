---
title: "4-02: 레지스터 직접 접근"
date: 2026-05-13T12:00:00
description: "volatile·MMIO·packed struct — peripheral register 다루기."
series: "Modern Embedded Recipes"
seriesOrder: 36
tags: [recipes, bare-metal, mmio]
draft: false
---

## 한 줄 요약

> **"MMIO는 일반 메모리가 아닙니다."** `volatile` + 정확한 width access + memory barrier — 이 세 가지가 register 접근의 기본기입니다.

## 어떤 상황에서 쓰나

ARM Cortex-M의 peripheral은 모두 *memory-mapped*입니다. `0x40020000` 같은 주소에 write 하면 그것이 GPIO의 ODR이 되고, read 하면 IDR이 됩니다. 그런데 일반 C 코드처럼 다루면 compiler가 *최적화로 날려버리거나*, *순서를 바꿔버리거나*, *잘못된 width로 access*해서 동작하지 않습니다.

CMSIS 헤더가 이 모든 패턴을 표준화해 줍니다. 그런데 그 안에서 어떤 일이 벌어지고 있는지 모르면 새 SoC를 다룰 때 매번 막힙니다. 이 글은 register 접근의 모든 변종을 다룹니다.

## 핵심 개념

### `volatile`이 막는 것

`volatile`은 compiler에게 다음 세 가지를 약속합니다.

```c
volatile uint32_t *p = (volatile uint32_t *)0x40020014;

*p = 0x20;   // 이 write를 제거하지 않는다
x = *p;      // 이 read를 제거·합치지 않는다
*p = 0x20;   // 같은 값이라도 생략하지 않는다
```

`volatile`이 없으면 다음과 같은 최적화가 일어납니다.

```c
// 원본
uint32_t *gpio = (uint32_t *)0x40020014;
*gpio = 0x20;   // ON
*gpio = 0x00;   // OFF

// -O2 컴파일 결과 (volatile 없으면)
// 둘 다 dead store로 판단 → 첫 줄 제거
*gpio = 0x00;
```

LED toggle이 동작하지 않습니다. 단순한 문제처럼 보이지만, 처음 만나면 1주일을 날립니다.

### MMIO struct 패턴

CMSIS는 peripheral register block을 struct로 묶어 표현합니다.

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

struct member의 offset이 그대로 register offset이 되도록 모든 필드가 `uint32_t`이고 padding이 없어야 합니다. ARM target에서 4-byte 정렬 + 4-byte 멤버는 padding이 들어가지 않으므로 자연스럽게 맞습니다. 만약 8-bit register와 32-bit가 섞이면 `__attribute__((packed))`가 필요합니다.

### Access width

peripheral은 허용되는 access width가 정해져 있습니다.

| Peripheral | 허용 width | 비고 |
|------------|-----------|------|
| STM32 GPIO ODR | 32-bit | 32-bit만 허용 |
| STM32 UART RDR | 16-bit | 9-bit data까지 |
| Bit-band region (Cortex-M3/4) | 32-bit | 1-bit operation |
| 일부 EEPROM | 8-bit / 16-bit | 정확히 일치해야 |

잘못된 width로 access 하면 BusFault가 나거나 인접 register까지 영향을 줍니다. CMSIS struct를 쓰면 컴파일러가 자동으로 맞춰 줍니다.

### Memory Barrier

ARM은 weakly ordered 아키텍처입니다. write 순서가 프로그램 순서와 다를 수 있습니다. peripheral 영역은 strongly-ordered 또는 device attribute라서 순서가 보장되지만, peripheral과 normal memory가 섞인 시퀀스에서는 barrier가 필요합니다.

```c
// peripheral clock enable 직후 access 패턴
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
__DSB();   // Data Synchronization Barrier
GPIOA->MODER = ...;
```

clock enable이 물리적으로 효력 발휘하기까지 몇 cycle이 걸리는 SoC도 있습니다. 자세한 내용은 2-10에서 다룹니다.

## 코드 예제

### 1. Base + offset macro 패턴

CMSIS struct 이전 시대의 접근법입니다. 작은 프로젝트에 여전히 유용합니다.

```c
#define GPIOA_BASE     0x40020000UL
#define GPIOA_MODER    (*(volatile uint32_t *)(GPIOA_BASE + 0x00))
#define GPIOA_ODR      (*(volatile uint32_t *)(GPIOA_BASE + 0x14))
#define GPIOA_BSRR     (*(volatile uint32_t *)(GPIOA_BASE + 0x18))

GPIOA_MODER |= (1u << 10);   // PA5 output
GPIOA_BSRR  =  (1u << 5);    // PA5 set (atomic)
GPIOA_BSRR  =  (1u << 21);   // PA5 reset (BSRR upper 16-bit)
```

### 2. Struct 패턴 (CMSIS 스타일)

```c
typedef struct {
    volatile uint32_t MODER;
    volatile uint32_t OTYPER;
    volatile uint32_t OSPEEDR;
    volatile uint32_t PUPDR;
    volatile uint32_t IDR;
    volatile uint32_t ODR;
    volatile uint32_t BSRR;
} GPIO_TypeDef;

#define GPIOA  ((GPIO_TypeDef *)0x40020000)

void led_init(void) {
    GPIOA->MODER &= ~(3u << (5 * 2));
    GPIOA->MODER |=  (1u << (5 * 2));
}

void led_on(void)  { GPIOA->BSRR = (1u << 5); }
void led_off(void) { GPIOA->BSRR = (1u << 21); }
```

### 3. Bit-field 패턴 (위험, 권장 안 함)

```c
// 위험 — bit-field 레이아웃은 implementation-defined
typedef struct {
    volatile uint32_t pin0_mode : 2;
    volatile uint32_t pin1_mode : 2;
} GPIO_MODER_t;
```

bit-field는 언어 표준이 layout을 보장하지 않습니다. compiler·target에 따라 비트 순서가 바뀝니다. peripheral register에는 쓰지 않습니다.

### 4. Read-modify-write의 함정

```c
// 위험 — 두 ISR이 동시에 GPIOA->ODR을 토글하면 race
GPIOA->ODR ^= (1u << 5);

// 안전 — BSRR을 쓰면 atomic
GPIOA->BSRR = (1u << 5);    // set
GPIOA->BSRR = (1u << 21);   // reset

// 안전 — ODR을 토글하려면 critical section
__disable_irq();
GPIOA->ODR ^= (1u << 5);
__enable_irq();
```

STM32의 BSRR은 atomic set/reset을 위한 전용 register입니다. ODR XOR이 필요한 경우는 거의 없습니다.

## 측정 / 동작 확인

`volatile` 효과를 확인하려면 disassembly를 봅니다.

```bash
arm-none-eabi-objdump -d main.elf | grep -A 20 '<main>'
```

```asm
; volatile 있을 때
ldr  r3, [pc, #16]   ; r3 = &GPIOA_ODR
movs r2, #32         ; r2 = 0x20
str  r2, [r3]        ; *GPIOA_ODR = 0x20
movs r2, #0          ; r2 = 0
str  r2, [r3]        ; *GPIOA_ODR = 0   ← 두 store 모두 살아 있음

; volatile 없을 때 (-O2)
ldr  r3, [pc, #12]
movs r2, #0
str  r2, [r3]        ; 두 번째 store만 남음
```

오실로스코프로 GPIO를 봤을 때 반응이 전혀 없으면 99%는 `volatile`을 빼먹은 것입니다.

## 자주 보는 함정

> ⚠️ Compiler 최적화로 register write가 사라짐

`volatile`을 빼먹은 코드는 `-O0`에서는 동작하다가 `-O2`로 올리면 죽습니다. 항상 `volatile`을 붙입니다.

> ⚠️ Cast 후 dereference에 `volatile`을 빼먹음

```c
// 잘못
uint32_t *p = (uint32_t *)0x40020014;
*p = 0x20;

// 옳음
volatile uint32_t *p = (volatile uint32_t *)0x40020014;
*p = 0x20;
```

CMSIS struct 패턴이 안전한 이유는 struct member 선언에 `volatile`이 박혀 있기 때문입니다.

> ⚠️ Read의 부수효과 무시

UART RDR은 read하면 RXNE flag가 clear됩니다. dummy read로 flag를 청소하는 패턴이 종종 있습니다. `volatile`이 없으면 compiler가 unused read로 판단해 제거합니다.

> ⚠️ Clock 활성화 직후 access

```c
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
// __DSB();  ← 안전을 위해 권장
GPIOA->MODER = ...;
```

대부분의 STM32는 1 cycle 만에 clock이 들어와 문제가 없지만, 일부 SoC와 일부 peripheral은 몇 cycle 지연이 필요합니다. ST의 errata를 확인합니다.

> ⚠️ Reserved 비트에 write

datasheet의 reserved 비트는 read-modify-write가 안전합니다. blind write로 1을 쓰면 미래 펌웨어에서 호환성이 깨질 수 있습니다.

## 정리

- MMIO register는 **반드시 `volatile`**. compiler 최적화로 read·write가 사라지지 않게 막습니다.
- **CMSIS struct 패턴**이 표준입니다. struct member에 `volatile`이 들어가 안전합니다.
- **BSRR**처럼 atomic set/reset register가 있으면 그쪽이 read-modify-write보다 안전합니다.
- **Bit-field는 사용 금지**. layout이 implementation-defined입니다.
- **clock enable 직후**에는 `__DSB()`로 한 박자 쉬는 것이 안전합니다.

다음 편은 **GPIO 드라이버 작성**입니다. MODER·OTYPER·OSPEEDR·PUPDR·AFR — STM32 GPIO의 모든 register를 한 번에 정리합니다.

## 관련 항목

- [4-01: 첫 bare-metal 프로그램](/blog/embedded/modern-recipes/part4-01-first-baremetal)
- [4-03: GPIO 드라이버 작성](/blog/embedded/modern-recipes/part4-03-gpio-driver)
- [2-05: ARM 메모리 맵](/blog/embedded/modern-recipes/part2-05-arm-memory-map)
- [2-10: Memory Barrier 실전](/blog/embedded/modern-recipes/part2-10-memory-barrier)
