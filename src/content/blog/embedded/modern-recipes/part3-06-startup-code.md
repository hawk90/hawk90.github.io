---
title: "임베디드 스타트업 코드 분석 — Reset_Handler·Vector Table·SystemInit"
slug: "embedded/modern-recipes/part3-06-startup-code"
date: 2026-04-12T09:28:00
description: "Reset_Handler·vector table·__libc_init_array·main 진입."
series: "Modern Embedded Recipes"
seriesOrder: 28
tags: [recipes, toolchain, startup]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"전원이 들어오고 `main`이 호출되기까지 수십 줄의 startup code가 실행됩니다."** 이 사이에 stack, RAM, FPU, C++ 생성자가 차례로 준비되고, 하나라도 빠지면 증상은 `main` 이후에 엉뚱한 곳에서 나타납니다.

## 어떤 상황에서 쓰나

- 전역 변수 초기값이 main에서 이상할 때
- C++ static 객체 생성자가 안 불릴 때
- `printf`의 첫 호출이 hardfault일 때
- 새 chip 지원 시 startup file 직접 작성

이 글의 예제는 아래 3)절의 어셈블리 `Reset_Handler`를 그대로 쓰고, Debian 13 arm64 guest의 `gcc-arm-none-eabi` 14.2.rel1(newlib 4.5.0)로 빌드해 QEMU 11.1.3 `netduinoplus2`(STM32F405, Cortex-M4F)에서 돌렸습니다. 비교 대상인 vendor 코드는 ST `cmsis_device_f4` v2.6.9의 `startup_stm32f407xx.s`와 `system_stm32f4xx.c`입니다.

## 핵심 개념

### 1) 전원 → main까지 순서

1. 전원 인가
2. 코어와 부트 구성에 정의된 vector table 위치(예: alias된 주소)에서 MSP, `Reset_Handler`를 fetch
3. MSP를 R13에 적재
4. `Reset_Handler`로 점프
5. `SystemInit()` — vendor 초기화(ST v2.6.9 템플릿은 FPU 접근 허용과 선택적 VTOR 설정)
6. `.data` 복사 (Flash → RAM)
7. `.bss` 클리어 (RAM 0으로 채움)
8. C runtime 초기화( newlib 계열에서는 `__libc_init_array()` 포함 )
9. `main()` 호출
10. `main`이 반환되면 startup이 정한 곳으로 갑니다. 아래 3)절 코드는 `b .`로 멈추고, ST의 `startup_stm32f407xx.s`는 `bl main` 다음에 `bx lr`을 둡니다.

### 2) Vector table

linker script와 칩의 boot 설정이 정한 주소(예: 일부 STM32의 flash base)에 배치된 vector table:

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

CPU의 reset 처리 hardware가 첫 두 word(MSP, Reset_Handler)를 자동으로 사용합니다(Cortex-M4 Generic User Guide DUI 0553A 2.3.4의 vector table 설명, [2-04](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)).

### 3) Reset_Handler

아래 코드를 `.syntax unified`·`.thumb`만 앞에 붙여 `startup.s`로 그대로 어셈블했습니다. ST의 `startup_stm32f407xx.s`도 순서는 같습니다(`ldr sp, =_estack` → `bl SystemInit` → `.data` 복사 → `.bss` 0 채움 → `bl __libc_init_array` → `bl main`). 차이는 이 코드가 FPU 허용(CPACR)을 직접 하고, ST는 그것을 `SystemInit()` 안에서 한다는 점입니다.

```asm
.global Reset_Handler
.type Reset_Handler, %function
Reset_Handler:
    @ MSP는 hardware가 이미 적재했지만, code에서도 다시
    ldr     r0, =_estack
    mov     sp, r0

    @ FPU enable (FPU가 있는 코어에서, 프로젝트 설정에 맞게)
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

    @ C/C++ runtime 초기화(newlib 계열 예시)
    bl      __libc_init_array

    @ main
    bl      main

    @ main이 반환되면
    b       .
```

### 4) `__libc_init_array` — C++ static 생성자

C++ static 객체의 생성자와 `__attribute__((constructor))` 함수는 컴파일러가 `.init_array` section에 함수 포인터로 넣고, runtime이 `main` 전에 차례로 부릅니다. newlib의 `newlib/libc/misc/init.c`에 있는 `__libc_init_array`는 세 단계입니다.

```c
void
__libc_init_array (void)
{
  size_t count;
  size_t i;

  count = __preinit_array_end - __preinit_array_start;
  for (i = 0; i < count; i++)
    __preinit_array_start[i] ();

#ifdef _HAVE_INIT_FINI
  _init ();
#endif

  count = __init_array_end - __init_array_start;
  for (i = 0; i < count; i++)
    __init_array_start[i] ();
}
```

`__init_array_start`·`__init_array_end`는 linker script가 정의해야 합니다. [3-04](/blog/embedded/modern-recipes/part3-04-linker-script-basics)의 script에는 그 부분이 없어, 이 글의 빌드에는 `.preinit_array`·`.init_array` output section을 추가했습니다. 또 `-nostartfiles`로 링크하면 `_init`을 정의하는 crt 파일이 빠지므로, 빈 `_init()`을 두지 않으면 "undefined reference to `_init'"가 납니다.

```text
.preinit_array :
{
    PROVIDE_HIDDEN(__preinit_array_start = .);
    KEEP(*(.preinit_array*))
    PROVIDE_HIDDEN(__preinit_array_end = .);
} > FLASH

.init_array :
{
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array*))
    PROVIDE_HIDDEN(__init_array_end = .);
} > FLASH
```

```c
// 예 — C++ static 객체
class Sensor {
public:
    Sensor() { initialize(); }   // __libc_init_array가 호출
};

static Sensor s_sensor;          // main 전에 생성됨
```

### 5) SystemInit

CMSIS가 이름을 정한 함수이고 chip vendor가 구현합니다. ST `cmsis_device_f4` v2.6.9의 템플릿 `system_stm32f4xx.c`는 다음이 전부입니다.

```c
void SystemInit(void)
{
  /* FPU settings ------------------------------------------------------------*/
  #if (__FPU_PRESENT == 1) && (__FPU_USED == 1)
    SCB->CPACR |= ((3UL << 10*2)|(3UL << 11*2));  /* set CP10 and CP11 Full Access */
  #endif

#if defined (DATA_IN_ExtSRAM) || defined (DATA_IN_ExtSDRAM)
  SystemInit_ExtMemCtl(); 
#endif /* DATA_IN_ExtSRAM || DATA_IN_ExtSDRAM */

  /* Configure the Vector Table location -------------------------------------*/
#if defined(USER_VECT_TAB_ADDRESS)
  SCB->VTOR = VECT_TAB_BASE_ADDRESS | VECT_TAB_OFFSET; /* Vector Table Relocation in Internal SRAM */
#endif /* USER_VECT_TAB_ADDRESS */
}
```

이 버전의 `SystemInit()`은 PLL을 건드리지 않습니다. 같은 칩이라도 템플릿 버전과 프로젝트 구조에 따라 클럭이 어디서 바뀌는지가 다릅니다. 이 함수가 `.data` 복사 *전에* 불린다는 점도 중요합니다. 여기서 초기값 있는 전역 변수를 읽으면 아직 복사되지 않은 값을 봅니다.

## 코드 / 실제 사용 예

C로 작성된 단순한 startup:

```c
#include <stddef.h>
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

3)절의 `startup.s`와 아래 `main.cpp`를 묶어 실행 순서를 확인했습니다. `SystemInit()`·생성자·`main`이 각각 semihosting으로 한 줄씩 찍습니다.

```cpp
extern "C" void SystemInit(void) { puts_("1. SystemInit\n"); }

uint32_t boot_magic = 0x5EED1234;   // .data
uint32_t zero_area[8];              // .bss

class Sensor {
public:
    Sensor() { puthex("2. Sensor() constructor, boot_magic = ", boot_magic); ready = 1; }
    int ready = 0;
};
static Sensor s_sensor;             // constructed by __libc_init_array

extern "C" int main(void) {
    puthex("3. main: s_sensor.ready = ", s_sensor.ready);
    puthex("   zero_area[7] = ", zero_area[7]);
    volatile float f = 1.5f; f *= 2.0f;   // FPU instruction: needs CPACR set in Reset_Handler
    puthex("   float 1.5*2 = ", (uint32_t)f);
    exit_(0);
    return 0;
}
```

```bash
F="-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard -O1"
arm-none-eabi-gcc $F -c vectors.c -o vectors.o && arm-none-eabi-gcc $F -c semi.c -o semi.o
arm-none-eabi-g++ $F -fno-exceptions -fno-rtti -c main.cpp -o main.o
arm-none-eabi-g++ $F -nostartfiles -T stm32f4-init.ld startup.s vectors.o semi.o main.o -o startup.elf
qemu-system-arm -M netduinoplus2 -nographic -monitor none -serial none \
    -semihosting-config enable=on,target=native -kernel startup.elf
```

```text
1. SystemInit
2. Sensor() constructor, boot_magic = 0x5EED1234
3. main: s_sensor.ready = 0x00000001
   zero_area[7] = 0x00000000
   float 1.5*2 = 0x00000003
```

생성자가 `main`보다 먼저, `.data` 복사 뒤에 불렸으므로 생성자 안에서 `boot_magic`의 초기값이 보입니다. 이 이미지의 section 크기는 `.isr_vector` 64 byte(이 예제는 system vector 16개만), `.init_array` 4 byte(생성자 하나의 포인터)였습니다. QEMU는 cycle을 재지 않으므로 단계별 시간은 측정하지 않았습니다. PLL lock처럼 시간이 드는 단계는 칩 데이터시트의 값과 실제 보드 측정으로 봅니다.

## 자주 보는 함정

> ⚠️ `.data` 복사 누락

전역 변수에 초기값을 줬는데 main에서 0이거나 garbage라면 startup의 .data 복사가 빠졌거나 `_sidata` symbol이 잘못된 위치를 가리키는 것.

> ⚠️ `.bss` 클리어 누락

0으로 초기화되는 정적 저장 기간 객체가 random 값을 가짐. C 표준의 초기화 요구를 bare-metal startup/runtime이 충족하도록 `.bss` 등 해당 영역을 클리어해야 합니다.

> ⚠️ FPU enable 없이 하드웨어 부동소수점 명령 실행

`-mfloat-abi=hard`로 빌드한 코드는 FPU 명령을 씁니다. 3)절 코드에서 CPACR에 CP10·CP11을 켜는 `orr` 한 줄만 지운 빌드를 돌리면, 생성자와 `main` 앞부분은 정상이다가 첫 FPU 명령에서 멈춥니다.

```text
3. main: s_sensor.ready = 0x00000001
   zero_area[7] = 0x00000000
HardFault HFSR = 0x40000000
  CFSR = 0x00080000
```

CFSR 0x00080000은 UsageFault의 NOCP(bit 19, coprocessor 접근 불가)이고, UsageFault를 켜 두지 않아 HardFault(FORCED)로 올라왔습니다. 정수 코드만 도는 동안은 문제가 드러나지 않으므로, float를 처음 쓰는 지점에서야 fault가 납니다.

> ⚠️ `__libc_init_array` 호출 누락

`bl __libc_init_array` 한 줄만 지운 빌드의 출력입니다. 링크도 실행도 되지만 생성자가 불리지 않아, 객체가 `.bss`의 0 상태 그대로 쓰입니다.

```text
1. SystemInit
3. main: s_sensor.ready = 0x00000000
```

> ⚠️ `main` 반환 처리 가정

`main`이 끝난 뒤의 동작은 startup 코드가 정합니다. 3)절 코드는 `b .`로 멈추고, ST v2.6.9 `startup_stm32f407xx.s`는 `bl main` 다음에 `bx lr`을 둡니다. 펌웨어가 `main`에서 돌아오지 않는 구조라도, 돌아왔을 때 무엇을 할지(재시작, 정지)를 startup에서 명시합니다.

> ⚠️ 클럭 설정 위치를 짐작

5)절처럼 ST v2.6.9의 `SystemInit()`은 PLL을 설정하지 않지만, 템플릿·프로젝트마다 다릅니다. PLL을 두 군데서 설정하거나 아예 아무 데서도 하지 않는 실수를 막으려면 프로젝트의 `SystemInit()`과 `main`의 클럭 함수를 직접 열어 봅니다.

## 정리

- 전원 → Reset → main의 흐름은 vector table fetch, `SystemInit`, `.data` 복사, `.bss` 클리어, `__libc_init_array`, `main`입니다. ST v2.6.9 startup과 이 글의 코드가 같은 순서였습니다.
- Vector table의 첫 두 word는 hardware가 자동으로 MSP와 Reset_Handler로 사용합니다.
- `_sidata`, `_sdata`, `_edata`, `_sbss`, `_ebss`, `__init_array_start/end` symbol을 linker script가 정의합니다.
- newlib의 `__libc_init_array`는 `.preinit_array` → `_init` → `.init_array` 순으로 호출하고, 빠지면 생성자가 조용히 생략됩니다.
- CPACR을 켜지 않은 hard-float 이미지는 첫 FPU 명령에서 NOCP fault가 납니다.

다음 편에서는 **C 런타임 (crt0)**을 다룹니다. newlib의 `_start`와 system call stub입니다.

## 관련 항목

- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-05: 링커 스크립트 고급](/blog/embedded/modern-recipes/part3-05-linker-script-advanced)
- [3-07: C 런타임 (crt0)](/blog/embedded/modern-recipes/part3-07-c-runtime)
- 더 깊이 — [Embedded C++ for Real Systems: 초기화 순서](/blog/embedded/embedded-cpp/00-preface)
