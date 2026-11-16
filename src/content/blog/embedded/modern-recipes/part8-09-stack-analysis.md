---
title: "임베디드 스택 분석 — high-water·overflow 탐지"
slug: "embedded/modern-recipes/part8-09-stack-analysis"
date: 2026-04-17T09:08:00
description: "Stack 패턴 채우기로 high-water mark, overflow hook, canary, MPU guard region, RTOS task stack 분석을 한 자리에 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 97
tags: [recipes, memory, stack]
topics: ["embedded"]
---

## 한 줄 요약

> **"Stack overflow는 양산 사고로 이어질 수 있는 결함입니다."** 패턴 채우기로 사용량을 재고, 컴파일러 canary와 MPU guard로 넘침을 잡습니다. 이 글은 세 가지를 Cortex-M3(QEMU `mps2-an385`) 한 프로그램에서 돌려, 각각이 무엇을 잡고 무엇을 놓치는지 출력으로 확인합니다.

## 어떤 상황에서 쓰나

펌웨어가 며칠에 한 번 reset되는데 원인을 모를 때, 입력에 따라 깊어지는 재귀나 큰 지역 배열을 가진 함수가 깊은 호출 사슬에서 불리는 경우가 후보입니다. 이런 넘침은 특정 입력에서만 드러나므로 책상 위 시험에서는 잘 재현되지 않습니다.

또 하나는 RTOS task의 stack 크기를 정하는 일입니다. 물통에 눈금을 그어 두고 하루 뒤 물이 가장 많이 내려간 자국을 보는 것처럼, stack을 미리 알려진 값으로 칠해 두고 지워진 깊이를 재면 실제로 쓴 최대량이 나옵니다. 추정이 아니라 이 측정값으로 크기를 정합니다.

## 핵심 개념

| 기법 | 동작 | 이 글에서 확인한 것 |
| --- | --- | --- |
| high-water mark | stack을 패턴(`0xA5A5A5A5`)으로 채우고, 덮어쓰인 가장 깊은 위치를 찾음 | 재귀 10단계마다 720 B씩 늘어남 |
| compiler canary (`-fstack-protector-strong`) | 지역 배열이 있는 함수의 return 직전에 canary 값을 검사 | 8 B 배열을 넘친 복사를 `__stack_chk_fail`로 잡음 |
| RTOS 검사 (`configCHECK_FOR_STACK_OVERFLOW`) | context switch 때 SP와 stack 끝 패턴을 검사 | [6-12](/blog/embedded/modern-recipes/part6-12-rtos-debugging#overflow-감지)에서 실행 |
| MPU guard | stack 바닥 바로 위 region을 접근 금지로 두어 하드웨어가 fault | guard 주소에서 fault, 다만 handler 처리에 함정이 있음 |

세 기법은 잡는 시점이 다릅니다. high-water mark는 넘치기 전에 여유를 알려 주고, canary는 함수가 return할 때, RTOS 검사는 task가 전환될 때, MPU guard는 넘치는 바로 그 접근에서 잡습니다.

## 코드 / 실제 사용 예

아래 `stk.c` 한 파일이 이 글의 실행 전부입니다. main stack은 링커 스크립트로 4 KiB를 따로 잡고(`_sstack`~`_estack`), 출력과 종료는 [8-02](/blog/embedded/modern-recipes/part8-02-memory-alignment#재현-환경)의 `bm.h`(semihosting)를 씁니다.

```text
MEMORY { FLASH (rx) : ORIGIN = 0x00000000, LENGTH = 4M
         RAM (rwx)  : ORIGIN = 0x20000000, LENGTH = 4M }
ENTRY(Reset_Handler)
SECTIONS {
  .text : { KEEP(*(.vectors)) *(.text*) *(.rodata*) . = ALIGN(4); _etext = .; } > FLASH
  .data : AT(_etext) { _sdata = .; *(.data*) . = ALIGN(4); _edata = .; } > RAM
  .bss : { _sbss = .; *(.bss*) *(COMMON) . = ALIGN(4); _ebss = .; } > RAM
  .stack (NOLOAD) : ALIGN(4096) { _sstack = .; . += 4096; _estack = .; } > RAM   /* main stack: 4 KiB */
}
```

```c
/* main-stack high-water mark, -fstack-protector, and an MPU guard on Cortex-M3 (QEMU mps2-an385) */
#include "bm.h"

extern uint32_t _etext, _sdata, _edata, _sbss, _ebss, _sstack, _estack;
int main(void);

#define PATTERN 0xA5A5A5A5u

__attribute__((naked)) void Reset_Handler(void)
{
    /* fill the stack *below* the current SP before anything is pushed */
    __asm volatile(
        "ldr r0, =_sstack\n"
        "mov r1, sp\n"
        "ldr r2, =0xA5A5A5A5\n"
        "1: cmp r0, r1\n"
        "   bhs 2f\n"
        "   str r2, [r0], #4\n"
        "   b 1b\n"
        "2: b c_start\n");
}

void c_start(void)
{
    uint32_t *s = &_etext, *d = &_sdata;
    while (d < &_edata) *d++ = *s++;
    for (d = &_sbss; d < &_ebss;) *d++ = 0;
    main();
    for (;;) { }
}

size_t stack_used(void)                     /* bytes ever used, measured from the top */
{
    uint32_t *p = &_sstack;
    while (p < &_estack && *p == PATTERN) p++;
    return (size_t)((uint8_t *)&_estack - (uint8_t *)p);
}

/* ---- faults ---- */
static void report(const char *what)
{
    puts_(what); puts_(": CFSR="); putx(*(volatile uint32_t *)0xE000ED28);
    puts_(" MMFAR="); putx(*(volatile uint32_t *)0xE000ED34);
    puts_(" stack_used="); putu((unsigned)stack_used()); puts_("\n");
    exit_();
}
void HardFault_Handler(void) { report("HardFault"); }
void MemManage_Handler(void) { report("MemManage"); }

/* ---- -fstack-protector support (the C library would normally provide these) ---- */
uintptr_t __stack_chk_guard = 0x5ca1ab1e;
__attribute__((noreturn)) void __stack_chk_fail(void) { puts_("__stack_chk_fail: canary corrupted\n"); exit_(); for (;;) { } }

__attribute__((section(".vectors"), used))
void (*const vectors[16])(void) = {
    (void (*)(void))&_estack, Reset_Handler, HardFault_Handler, HardFault_Handler,
    MemManage_Handler, HardFault_Handler, HardFault_Handler,
};

/* ---- workloads ---- */
__attribute__((noinline)) unsigned depth(unsigned n)
{
    volatile uint8_t frame[64];             /* 64 B of locals per level */
    frame[0] = (uint8_t)n;
    return n ? depth(n - 1) + frame[0] : 0;
}

__attribute__((noinline)) void copy_name(const char *src)
{
    char name[8];
    int i = 0;
    do name[i] = src[i]; while (src[i++]);          /* copies the NUL too; no bound check */
    puts_("copied: "); puts_(name); puts_("\n");
}

static void mpu_guard(void)
{
    /* region 0: lowest 256 B of the stack, no access (AP=000), XN; default map for the rest */
    *(volatile uint32_t *)0xE000ED9C = (uint32_t)&_sstack | (1u << 4) | 0;   /* RBAR: VALID, region 0 */
    *(volatile uint32_t *)0xE000EDA0 = (1u << 28) | (0u << 24) | (7u << 1) | 1u;  /* RASR: XN, AP=0, SIZE=7 (256 B), ENABLE */
    *(volatile uint32_t *)0xE000ED24 |= 1u << 16;                           /* SHCSR.MEMFAULTENA */
    *(volatile uint32_t *)0xE000ED94 = (1u << 2) | 1u;                      /* MPU_CTRL: PRIVDEFENA, ENABLE */
    __asm volatile("dsb\n isb");
}

int main(void)
{
    puts_("stack 4096 B, after boot: used="); putu((unsigned)stack_used()); puts_("\n");
    for (unsigned n = 10; n <= 40; n += 10) {
        depth(n);
        puts_("after depth("); putu(n); puts_("): used="); putu((unsigned)stack_used()); puts_("\n");
    }
#if defined(DO_SSP)
    copy_name("abc");
    copy_name("this name is much longer than eight bytes");
#elif defined(DO_MPU)
    mpu_guard();
    depth(1000);                            /* far deeper than 4 KiB allows */
#else
    depth(1000);                            /* no protection: runs off the bottom of the stack */
    puts_("depth(1000) returned, used="); putu((unsigned)stack_used()); puts_("\n");
#endif
    exit_();
}
```

### Stack 패턴 채우기 — 지금 쓰고 있는 stack은 칠하지 않는다

`Reset_Handler`는 C 코드가 아니라 `naked` 어셈블리로, `_sstack`부터 **현재 SP 아래까지만** 패턴을 씁니다. C 함수 안에서 `&_sstack`부터 `&_estack`까지 전체를 칠하면, 그 함수 자신의 return 주소와 지역 변수가 있는 stack 꼭대기까지 덮어써 돌아갈 곳을 잃습니다. reset 직후에는 vector table이 준 SP가 `_estack`이고 아직 아무것도 push하지 않았으므로, 이 시점의 SP 아래는 모두 빈 영역입니다.

`stack_used()`는 바닥에서 위로 올라가며 패턴이 처음 깨진 곳을 찾고, 그 위치부터 꼭대기까지를 사용량으로 돌려줍니다.

### 실행 결과

```bash
#!/bin/bash
CF="-O2 -g -ffreestanding -nostdlib -fno-builtin -mthumb -mcpu=cortex-m3 -fstack-usage"
for v in "" "-DDO_SSP -fstack-protector-strong" "-DDO_MPU"; do
  arm-none-eabi-gcc $CF $v -T link-stack.ld -o stk.elf stk.c -lgcc
  echo "== $v"
  timeout 10 qemu-system-arm -M mps2-an385 -nographic -semihosting -kernel stk.elf
done
echo "== stack usage report (arm-none-eabi-gcc -fstack-usage)"; cat stk.elf-stk.su
arm-none-eabi-nm stk.elf | grep -E " _sstack| _estack"
```

보호 없이 돌린 빌드입니다.

```text
== 
stack 4096 B, after boot: used=32
after depth(10): used=840
after depth(20): used=1560
after depth(30): used=2280
after depth(40): used=3000
HardFault: CFSR= MMFAR= stack_used=
```

`depth()`는 재귀 한 단계마다 72 B를 썼습니다(아래 `-fstack-usage` 보고의 `depth 72 static`). 10단계마다 사용량이 정확히 720 B씩 늘어난 것이 high-water mark가 실제 깊이를 따라간다는 확인입니다. `depth(1000)`은 72 KB가 필요해 4 KiB stack을 지나 `.data`(4 B, `.bss`는 0 B)를 덮고 RAM 아래, QEMU가 `RESERVED`로 둔 영역(`0x01010000`~`0x1fffffff`, 쓰기는 버려지고 읽으면 0)으로 내려갔습니다. 거기서 읽어 온 return 주소가 0이라 Thumb 비트가 없는 주소로 돌아가려다 INVSTATE UsageFault가 났고, 이것이 HardFault로 올라갔습니다(`-d int` 로그). HardFault handler도 같은 영역에 지역 buffer를 두므로 숫자가 빈 문자열로 찍혔습니다. 보호 장치 없이 넘친 stack은 원인을 남기지 못합니다.

### Compiler canary

```text
== -DDO_SSP -fstack-protector-strong
stack 4096 B, after boot: used=36
after depth(10): used=924
after depth(20): used=1724
after depth(30): used=2524
after depth(40): used=3324
copied: abc
copied: this name is much longer than eight bytes
__stack_chk_fail: canary corrupted
```

`-fstack-protector-strong`을 켜면 `copy_name`처럼 지역 배열이 있는 함수에 canary가 들어갑니다. 8 B 배열에 41 B 문자열을 복사한 두 번째 호출은 복사 자체는 끝냈지만(문자열이 출력됨), 함수가 return하기 전 canary 검사에서 `__stack_chk_fail`로 멈췄습니다. canary는 덮어쓴 그 순간이 아니라 return 직전에 잡고, return 주소를 덮기 전에 이미 다른 지역 변수를 망가뜨렸을 수 있습니다. C 라이브러리가 없는 bare-metal에서는 `__stack_chk_guard`와 `__stack_chk_fail`을 직접 정의해야 링크됩니다. 이 글은 guard 값을 상수로 두었지만, 실제 제품에서는 부팅 때 난수로 채워야 공격자가 값을 맞추지 못합니다.

같은 빌드의 high-water mark는 10단계당 800 B였습니다. canary와 그 검사 코드 때문에 `depth()`의 frame이 72 B에서 80 B로 커진 것입니다.

### MPU guard

```text
== -DDO_MPU
stack 4096 B, after boot: used=32
after depth(10): used=840
after depth(20): used=1560
after depth(30): used=2280
after depth(40): used=3000
HardFault: CFSR=0x00000092 MMFAR=0x200010c0 stack_used=3972
```

`mpu_guard()`는 stack 바닥 256 B를 region 0으로 잡고 AP = 000(ARMv7-M ARM Table B3-15: "No access ... Any access generates a permission fault")으로 둡니다. region 크기는 2^(SIZE+1) byte이므로 SIZE = 7이 256 B이고(B3.5.9), `PRIVDEFENA`로 나머지 주소는 기본 memory map을 그대로 씁니다.

- **guard는 넘침을 정확한 주소에서 잡았습니다.** MMFAR `0x200010c0`은 guard(`0x20001000`~`0x200010ff`) 안이고, CFSR `0x92`는 MMARVALID(bit 7)·MSTKERR(bit 4)·DACCVIOL(bit 1)입니다(DDI 0403E.b B3.2.15).
- **하지만 실행된 것은 MemManage가 아니라 HardFault handler였습니다.** MSTKERR는 "A derived MemManage fault occurred on exception entry", 즉 fault를 처리하려고 exception frame을 push하다 다시 guard에 걸렸다는 뜻입니다. handler가 넘친 stack과 같은 stack을 쓰니 handler로 들어가지 못하고 HardFault로 올라갔습니다.
- **HardFault handler의 frame은 guard 안에 써졌습니다.** `stack_used`가 3,840(guard 위까지)이 아니라 3,972였습니다. `MPU_CTRL.HFNMIENA`가 0이면 priority 값이 0보다 작은(-1·-2) handler(HardFault, NMI)는 "MPU disabled"로 실행되기 때문입니다(B3.5.6 `MPU_CTRL`).

그래서 MPU guard는 handler가 쓰는 stack(MSP)과 넘칠 수 있는 stack을 나눠야 제대로 동작합니다. FreeRTOS 같은 RTOS는 task를 PSP에서, handler를 MSP에서 돌리므로, task stack 바닥에 guard를 두면 handler는 멀쩡한 MSP에서 fault 정보를 남길 수 있습니다. 이 글은 PSP 분리를 실행하지 않았습니다.

### 함수별 stack usage

```text
bm.h:20:37:putx	16	static
bm.h:26:37:exit_	0	static
stk.c:9:29:Reset_Handler	0	static
stk.c:40:13:report	24	static
stk.c:47:6:HardFault_Handler	8	static
stk.c:48:6:MemManage_Handler	8	static
stk.c:32:8:stack_used	0	static
stk.c:52:32:__stack_chk_fail	8	static
stk.c:61:36:depth	72	static
stk.c:68:32:copy_name	8	static
stk.c:86:5:main	40	static
stk.c:23:6:c_start	8	static
```

GCC `-fstack-usage`는 함수마다 `파일:줄:열:함수 크기 종류`를 씁니다. 링크까지 한 번에 하면 파일 이름이 `stk.elf-stk.su`가 됩니다. 종류 `static`은 크기가 고정이라는 뜻이고, `dynamic`은 함수 본문에서 stack을 더 조정한다(예: 호출 앞뒤로 인자를 push/pop)는 뜻입니다. `bounded`가 함께 붙으면 그 조정량이 컴파일 때 정해져 숫자가 전체 상한이고, 없으면 숫자는 정해진 부분만이라 VLA·`alloca`처럼 실행 중 늘어나는 양은 빠집니다. 이 값은 함수 하나의 frame이고, 실제 최대 사용량은 호출 사슬을 따라 더해야 합니다. `depth`처럼 재귀하면 사슬 길이가 입력에 달려 있어 이 보고만으로는 상한이 나오지 않습니다.

### FreeRTOS task별 high-water와 hook

FreeRTOS에서는 `uxTaskGetStackHighWaterMark()`와 `uxTaskGetSystemState()`가 같은 패턴 방식(`tskSTACK_FILL_BYTE` 0xa5)으로 task마다 남은 양을 word 단위로 돌려줍니다. 실행 예, word와 byte 단위, `vApplicationStackOverflowHook`이 PendSV 안에서 불린다는 점은 [6-12](/blog/embedded/modern-recipes/part6-12-rtos-debugging)에서 QEMU로 확인했으므로 여기서는 반복하지 않습니다. 같은 글에서 V11.1.0의 검사 방식 2가 frame마다 한두 byte만 쓰는 overflow를 놓치고 HardFault로 끝난 것도 이 글의 "보호 없이 넘친 stack" 결과와 같은 이유입니다.

## 측정 / 성능 비교

| 측정 | 결과 (Cortex-M3, `-O2`) |
| --- | --- |
| `depth()` 한 단계 frame | 72 B (`-fstack-usage`, high-water 증가량 720 B / 10단계와 일치) |
| 같은 함수, `-fstack-protector-strong` | high-water 증가량 800 B / 10단계 |
| 부팅 직후 사용량 | 32 B (canary 빌드 36 B) |
| canary | 8 B 배열 넘침을 return 직전에 검출 |
| MPU guard | 넘친 첫 접근 주소(`0x200010c0`)에서 fault, 단 같은 stack을 쓰는 handler는 HardFault로 올라감 |

이 측정은 QEMU에서 한 것이라 사이클 비용은 없습니다. canary와 MPU 설정의 실행 시간 비용은 대상 보드에서 재야 합니다.

## 자주 보는 함정

> ⚠️ 추정만으로 크기를 정함

```c
xTaskCreate(t, "t", 128, NULL, 2, NULL);   /* 128 words = 512 B, never measured */
```

위 실행의 `depth()`는 8단계(8 × 72 = 576 B)만 들어가도 512 B를 넘습니다. high-water mark를 오류 처리 경로까지 돌린 뒤 재서 정합니다.

> ⚠️ 입력이 재귀 깊이를 정함

```c
int parse(node *n) { return n ? parse(n->child) + 1 : 0; }
```

입력의 깊이에 상한이 없으면 stack 넘침이 공격 경로가 됩니다. 반복문과 명시적 stack으로 바꾸거나 깊이를 검사합니다.

> ⚠️ 큰 지역 buffer

```c
char buf[2048];                 /* on the stack */
snprintf(buf, sizeof buf, ...);
```

지역 배열의 크기는 그대로 frame에 더해집니다(`-fstack-usage`로 확인). 큰 buffer는 `static`이나 pool로 옮깁니다.

> ⚠️ FPU를 쓰는 task의 exception frame

ARMv7-M ARM B1.5.7은 FP 확장이 있으면 exception 진입 때 "a 26-word frame"(Extended frame)을 push할 수 있다고 적습니다. FP 레지스터가 없는 Basic frame은 8 word입니다. FPU를 쓰는 task는 interrupt 한 번에 stack을 72 B 더 쓸 수 있으므로, high-water mark를 interrupt가 많이 걸리는 상황에서 잽니다.

> ⚠️ RAM이 넘쳤다는 링커 오류를 무시

```text
section `.bss' will not fit in region `RAM'
```

`.bss`·`.data`가 커지면 같은 RAM에 놓인 stack 자리가 줄어듭니다. 이 글처럼 stack을 별도 section으로 잡으면 크기가 부족할 때 링커가 오류를 냅니다.

## 재현 환경

`arm-none-eabi-gcc` 16.2.0(newlib 없음), QEMU 11.1.3 `mps2-an385`입니다. `bm.h`는 [8-02의 재현 환경](/blog/embedded/modern-recipes/part8-02-memory-alignment#재현-환경)과 같고, `stk.c`·`link-stack.ld`·`run.sh`는 위에 있습니다. `bash run.sh`로 세 빌드를 차례로 돌립니다.

## 정리

- high-water mark는 패턴을 칠하고 지워진 깊이를 잽니다. 이 실행에서 재귀 10단계마다 정확히 720 B씩 늘었습니다.
- 패턴은 현재 SP 아래에만 칠합니다. C 함수 안에서 stack 전체를 칠하면 자기 frame을 덮습니다.
- `-fstack-protector-strong`은 지역 배열 넘침을 return 직전에 잡았고, frame을 72 B에서 80 B로 키웠습니다. bare-metal에서는 `__stack_chk_guard`·`__stack_chk_fail`을 직접 둡니다.
- MPU guard는 넘친 첫 주소에서 fault를 냈지만, handler가 같은 stack을 쓰면 MSTKERR로 HardFault가 됩니다. task stack(PSP)과 handler stack(MSP)을 나눠야 합니다.
- `-fstack-usage`는 함수 하나의 frame을 알려 주고, 최대 사용량은 호출 사슬을 따라 더해야 합니다.
- 보호 없이 넘친 stack은 fault handler조차 정보를 남기지 못했습니다.

다음 편은 **코드 크기 최적화**입니다. `-Os`, LTO, section gc를 다룹니다.

## 관련 항목

- [PRTOS 4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [6-12: RTOS 디버깅](/blog/embedded/modern-recipes/part6-12-rtos-debugging)
- [8-01: 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)
- [8-10: 코드 크기 최적화](/blog/embedded/modern-recipes/part8-10-code-size-optimization)
