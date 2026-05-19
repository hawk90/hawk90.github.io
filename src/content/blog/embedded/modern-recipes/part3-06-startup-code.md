---
title: "3-06: 스타트업 코드 분석"
date: 2026-05-13T04:00:00
description: "Reset_Handler·vector table·__libc_init_array·main 진입."
series: "Modern Embedded Recipes"
seriesOrder: 28
tags: [recipes, toolchain, startup]
draft: false
---

## 한 줄 요약

> **"전원이 들어오고 `main`이 호출되기까지 수십 줄의 startup code가 실행됩니다."** 이 시간 동안 stack, RAM, FPU, C++ 생성자가 차례로 준비됩니다.

## 어떤 상황에서 쓰나

- 전역 변수 초기값이 main에서 이상할 때
- C++ static 객체 생성자가 안 불릴 때
- `printf`의 첫 호출이 hardfault일 때
- 새 chip 지원 시 startup file 직접 작성

## 핵심 개념

### 1) 전원 → main까지 순서

1. 전원 인가
2. CPU가 `0x00000000` (또는 boot pin에 따른 alias)에서 MSP, `Reset_Handler`를 fetch
3. MSP를 R13에 적재
4. `Reset_Handler`로 점프
5. `SystemInit()` — 클럭, FPU
6. `.data` 복사 (Flash → RAM)
7. `.bss` 클리어 (RAM 0으로 채움)
8. `__libc_init_array()` — C++ static constructor 호출
9. `main()` 호출
10. `main`이 반환되면 `exit()` → 무한 loop

### 2) Vector table

linker script에서 0x08000000(또는 chip별 boot address)에 배치된 vector table:

```c
// startup_stm32f4xx.s 일부 (C 표현)
__attribute__((section(".isr_vector")))
const uint32_t vector_table[] = {
    (uint32_t)&_estack,           // 0x00: Initial MSP
    (uint32_t)Reset_Handler,      // 0x04: Reset
    (uint32_t)NMI_Handler,        // 0x08: NMI
    (uint32_t)HardFault_Handler,  // 0x0C
    (uint32_t)MemManage_Handler,
    (uint32_t)BusFault_Handler,
    (uint32_t)UsageFault_Handler,
    0, 0, 0, 0,
    (uint32_t)SVC_Handler,        // 0x2C
    (uint32_t)DebugMon_Handler,
    0,
    (uint32_t)PendSV_Handler,     // 0x38
    (uint32_t)SysTick_Handler,    // 0x3C
    // ... external IRQ
};
```

CPU의 reset 처리 hardware가 첫 두 word(MSP, Reset_Handler)를 자동으로 사용합니다.

### 3) Reset_Handler

```asm
.global Reset_Handler
.type Reset_Handler, %function
Reset_Handler:
    @ MSP는 hardware가 이미 적재했지만, code에서도 다시
    ldr     r0, =_estack
    mov     sp, r0

    @ FPU enable (M4 + FPU 옵션)
    ldr     r0, =0xE000ED88           @ CPACR
    ldr     r1, [r0]
    orr     r1, r1, #(0xF << 20)
    str     r1, [r0]

    @ SystemInit — 클럭, PLL
    bl      SystemInit

    @ .data 복사
    ldr     r0, =_sidata
    ldr     r1, =_sdata
    ldr     r2, =_edata
copy_data:
    cmp     r1, r2
    ittt    lt
    ldrlt   r3, [r0], #4
    strlt   r3, [r1], #4
    blt     copy_data

    @ .bss 클리어
    ldr     r0, =_sbss
    ldr     r1, =_ebss
    mov     r2, #0
zero_bss:
    cmp     r0, r1
    itt     lt
    strlt   r2, [r0], #4
    blt     zero_bss

    @ C++ static constructor
    bl      __libc_init_array

    @ main
    bl      main

    @ main이 반환되면
    b       .
```

### 4) `__libc_init_array` — C++ static 생성자

C++ static 객체나 `__attribute__((constructor))` 함수들을 호출합니다.

```c
// newlib의 __libc_init_array 단순 구현
extern void (*__init_array_start[])(void);
extern void (*__init_array_end[])(void);

void __libc_init_array(void) {
    size_t count = __init_array_end - __init_array_start;
    for (size_t i = 0; i < count; i++) {
        __init_array_start[i]();
    }
}
```

linker가 모든 `.init_array` section을 모아 함수 포인터 배열을 만들고, startup이 차례로 호출합니다.

```c
// 예 — C++ static 객체
class Sensor {
public:
    Sensor() { initialize(); }   // __libc_init_array가 호출
};

static Sensor s_sensor;          // main 전에 생성됨
```

### 5) SystemInit

ARM CMSIS의 표준 함수. chip vendor가 구현합니다. 클럭 설정, vector table 위치(`SCB->VTOR`), FPU 등을 설정.

```c
void SystemInit(void) {
    // FPU enable
    SCB->CPACR |= ((3UL << 10*2) | (3UL << 11*2));
    
    // Vector table 위치
    SCB->VTOR = FLASH_BASE | 0x00;
    
    // (보통 클럭은 main에서 설정)
}
```

vendor 마다 SystemInit 내용이 다릅니다. ST는 PLL 설정까지, NXP는 최소만.

## 코드 / 실제 사용 예

C로 작성된 단순한 startup:

```c
#include <stdint.h>

extern uint32_t _estack;
extern uint32_t _sidata, _sdata, _edata;
extern uint32_t _sbss, _ebss;
extern void (*__init_array_start[])(void);
extern void (*__init_array_end[])(void);

extern int main(void);
extern void SystemInit(void);

void Default_Handler(void) {
    while (1);
}

void Reset_Handler(void) {
    SystemInit();

    uint32_t *src = &_sidata;
    uint32_t *dst = &_sdata;
    while (dst < &_edata) *dst++ = *src++;

    for (uint32_t *p = &_sbss; p < &_ebss; p++) *p = 0;

    size_t count = __init_array_end - __init_array_start;
    for (size_t i = 0; i < count; i++) {
        __init_array_start[i]();
    }

    main();

    while (1);
}

__attribute__((weak, alias("Default_Handler"))) void NMI_Handler(void);
__attribute__((weak, alias("Default_Handler"))) void HardFault_Handler(void);
// ... 나머지 IRQ도 weak alias

__attribute__((section(".isr_vector"), used))
void (* const vector_table[])(void) = {
    (void (*)(void))((uint32_t)&_estack),
    Reset_Handler,
    NMI_Handler,
    HardFault_Handler,
    // ...
};
```

## 측정 / 비교

| 단계 | 시간 (Cortex-M4 @ 168 MHz) |
| --- | --- |
| Reset → Reset_Handler | < 1 µs |
| SystemInit (PLL) | 2 ms (PLL lock) |
| .data 복사 (1 KB) | 5 µs |
| .bss 클리어 (16 KB) | 80 µs |
| __libc_init_array (생성자 10개) | 100 µs ~ 1 ms |
| main 진입 | 총 2 ~ 5 ms |

| Section | 보통 크기 |
| --- | --- |
| .isr_vector | 0.3 ~ 1 KB |
| Reset_Handler | 100 ~ 200 byte |
| .init_array | 4 byte * 생성자 수 |

## 자주 보는 함정

> ⚠️ `.data` 복사 누락

전역 변수에 초기값을 줬는데 main에서 0이거나 garbage라면 startup의 .data 복사가 빠졌거나 `_sidata` symbol이 잘못된 위치를 가리키는 것.

> ⚠️ `.bss` 클리어 누락

0으로 초기화한 전역 변수가 random 값을 가짐. C 표준은 .bss가 0으로 시작한다고 정의하므로 startup 책임.

> ⚠️ FPU enable 없이 float 사용

M4 FPU 활성 없이 float 연산 시 hardfault. SystemInit 또는 Reset_Handler에서 CPACR 설정 필수.

> ⚠️ `__libc_init_array` 호출 누락

C는 문제 없지만 C++ static 객체 생성자가 안 불립니다. 객체가 default(0) 상태로 사용됨.

> ⚠️ `main` 반환 시 무한 loop 안 만들어 둠

main이 반환하면 stack의 LR(garbage)로 점프해 hardfault. 반드시 `while (1);` 또는 `exit` 처리.

> ⚠️ Vendor의 SystemInit이 PLL을 설정하는데 main에서 다시 설정

이중 PLL 설정으로 클럭이 어긋날 수 있습니다. vendor의 SystemInit이 무엇을 하는지 코드로 확인.

## 정리

- 전원 → Reset → main까지 vector table fetch, SystemInit, .data 복사, .bss 클리어, C++ 생성자 순으로 진행됩니다.
- Vector table의 첫 두 word는 hardware가 자동으로 MSP와 Reset_Handler로 사용합니다.
- `_sidata`, `_sdata`, `_edata`, `_sbss`, `_ebss`, `__init_array_start/end` symbol을 linker script가 정의합니다.
- C++ static 생성자는 `__libc_init_array`가 main 전에 호출합니다.
- 전체 startup 시간은 2 ~ 5 ms 정도입니다. PLL lock이 대부분 차지.

다음 편에서는 **C 런타임 (crt0)**을 다룹니다. newlib의 `_start`와 system call stub입니다.

## 관련 항목

- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-05: 링커 스크립트 고급](/blog/embedded/modern-recipes/part3-05-linker-script-advanced)
- [3-07: C 런타임 (crt0)](/blog/embedded/modern-recipes/part3-07-c-runtime)
- 더 깊이 — [Embedded C++ for Real Systems: 초기화 순서](/blog/embedded/embedded-cpp/)
