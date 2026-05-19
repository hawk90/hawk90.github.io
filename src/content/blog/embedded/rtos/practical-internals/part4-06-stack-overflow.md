---
title: "4-06: Stack Overflow 탐지 — Canary·MPU·Watermark"
date: 2026-05-19T18:00:00
description: "Stack overflow의 silent corruption. Canary, MPU region, watermark, stack analysis."
series: "Practical RTOS Internals"
seriesOrder: 38
tags: [stack-overflow, canary, mpu, watermark]
draft: true
---

## 한 줄 요약

> **"Stack overflow = silent corruption"** — RTOS 가장 흔한 fault.

## 왜 위험한가

```text
Stack은 *아래로* 자람 (Cortex-M descending):
  high address: stack base
  low address:  stack pointer (현재)
  
Overflow 시 — 다른 task TCB·heap·data section *덮어쓰기*
  → 즉시 crash 안 됨 — 한참 후 *재현 안 되는 bug*
```

## Canary Pattern — FreeRTOS Method 2

```c
#define configCHECK_FOR_STACK_OVERFLOW 2

/* 부팅 시 — task stack 끝(low addr) magic value 채움 */
stack[0..15] = 0xA5A5A5A5;

/* Tick마다 또는 context switch 시 */
if (stack[0..15] != 0xA5A5A5A5) {
    vApplicationStackOverflowHook(...);
}
```

검출 범위 — *stack 끝 16 byte 침범* 시. 더 적극은 *MPU*.

## Method 1 — Cheap Check

```c
#define configCHECK_FOR_STACK_OVERFLOW 1

/* Context switch 시 SP 확인 */
if (sp < stack_base) overflow!
```

매우 cheap — 그러나 *overrun 후* 검출. Canary는 *극히 작은 overrun도* 감지.

## Application Hook

```c
void vApplicationStackOverflowHook(TaskHandle_t xTask, char *pcTaskName) {
    /* SAFETY — log + halt + watchdog reset */
    log_critical("Stack overflow in %s", pcTaskName);
    
    /* Production — system reset */
    NVIC_SystemReset();
    
    /* Debug — halt for inspection */
    __BKPT(0);
    while(1);
}
```

## High Water Mark — Stack 사용량 측정

```c
UBaseType_t high_water = uxTaskGetStackHighWaterMark(task);
/* high_water = stack의 *사용 안 된 최소 word 수* */

/* 모니터링 — periodic */
for (each task) {
    UBaseType_t hw = uxTaskGetStackHighWaterMark(task);
    printf("Task %s: %u words free\n", name, hw);
}
```

각 task가 *얼마나 stack 여유 있는지*. *0 가까이*면 *위험*.

## Stack Sizing 방법

### 1. `-fstack-usage` 정적 분석

```bash
gcc -fstack-usage source.c
# source.su:
#   main 64 static
#   task_a 128 static
#   process 256 static
#   ...
```

각 함수의 *static stack usage*. Call graph 합산:

```text
task_entry (128) → process (256) → compute (512) = 896
+ ISR worst (64) + margin (128) = 1088
→ stack size = 2048 (round up)
```

### 2. `puncover`

Memfault `puncover` — *call graph + stack* 자동 분석. Embedded 전용 도구.

### 3. 실측

```c
/* Stack을 0xDEADBEEF로 채우고 실행 */
fill_stack_pattern(stack, 0xDEADBEEF);
run_worst_case_scenario();
/* 사용된 영역 = pattern 깨진 곳까지 */
```

## MPU로 Hardware 보호

```c
/* MPU region — task stack 직전 region을 *no access*로 */
MPU_Region_InitTypeDef region = {0};
region.BaseAddress = stack_base - 32;
region.Size = MPU_REGION_SIZE_32B;
region.AccessPermission = MPU_REGION_NO_ACCESS;
region.IsCacheable = 0;
region.IsBufferable = 0;
HAL_MPU_ConfigRegion(&region);
```

Stack 넘으면 → **MemManageFault** 즉시 trigger. *컴파일러 stack probe* 명령과 함께.

## ARM `-mstack-protector` — Canary in Func

```bash
gcc -fstack-protector-strong source.c
```

각 함수 entry/exit:

```c
void function(void) {
    uint32_t canary = __stack_chk_guard;
    /* ... */
    if (__stack_chk_guard != canary) __stack_chk_fail();
}
```

Per-function 보호. ARM Cortex-M·A 모두 지원.

## Interrupt Stack 분리

Cortex-M — *MSP (Main Stack)* + *PSP (Process Stack)*:

```c
/* PSP 사용 task */
__set_PSP(stack);
__set_CONTROL(CONTROL_SPSEL_Msk);
/* IRQ → MSP 사용 */
```

ISR이 *task stack 안 침범*. ISR 깊이 + task 깊이 합쳐 *별도 분석*.

## Stack Probe — GCC `-fstack-clash-protection`

큰 stack frame (>4KB) — 컴파일러가 *접근 명령 삽입*:

```c
void big_func(void) {
    char large_buffer[16384];   /* 16 KB stack */
    /* GCC 자동 — 매 4KB마다 *접근 명령* — guard page touch */
}
```

OS·MPU가 *guard page*에 접근 시 fault — overflow 즉시 검출.

## Linux Kernel — Stack Canary + Guard Page

```text
Kernel stack: 16 KB
  Top: guard page (no access)
  Below: actual stack
  
Overflow → guard page access → page fault → oops
```

또 `task_struct->stack_canary` — context switch 시 검증.

## Recursion 깊이 제한

```c
void recursive(int n) {
    if (n == 0) return;
    char local[1024];   /* 매 호출 1 KB */
    recursive(n - 1);
}

recursive(10);   /* → 10 KB stack — risk */
```

Embedded — *recursion 회피*. *Iterative*·*explicit stack*.

## printf의 Stack Usage

```c
printf("Hello %s %d %f\n", str, val, fp_val);
/* → 256+ byte stack */
```

Newlib `printf` — *큰 stack*. Embedded — `tinyprintf`·`mini-printf`:

```c
/* tinyprintf — ~64 byte stack */
init_printf(NULL, putc);
tfp_printf("Hello %d\n", val);
```

## 자동차·항공 — Stack 분석 표준

```text
ASIL-D / DO-178C Level A:
  - All function stack 사용 *정적 분석*
  - Worst case path 산출
  - Stack canary + MPU 둘 다
  - Watermark monitoring 운영 중
  
KSLV-II 누리:
  - Stack size *fixed* + 50% margin
  - 매 task 종료 시 watermark check + telemetry
```

## 자주 하는 실수

> ⚠️ Stack size "충분해 보임"

```c
xTaskCreate(task, "name", 256, NULL, 5, &h);   /* 256 word = 1 KB */
```

→ `-fstack-usage` 또는 watermark 측정.

> ⚠️ Canary 끔

```c
#define configCHECK_FOR_STACK_OVERFLOW 0   /* ← Production에 위험 */
```

→ 최소 Method 1.

> ⚠️ ISR 안 큰 local

```c
void ISR(void) {
    char buf[4096];   /* ← ISR stack overflow 가능 */
}
```

→ static buffer 또는 작은 ISR.

> ⚠️ printf in ISR

```c
ISR: printf("...");   /* 256+ byte stack */
```

→ ITM `ITM_SendChar` 또는 ring buffer + task에서 출력.

## 정리

- Stack overflow = **silent corruption**.
- FreeRTOS `configCHECK_FOR_STACK_OVERFLOW = 2` (canary).
- `uxTaskGetStackHighWaterMark`로 *실측*.
- **MPU**로 hardware overflow detect.
- GCC `-fstack-usage` + `-fstack-protector-strong`.
- Recursion 회피, printf stack 큼 — 주의.
- ASIL-D — *정적 분석 + 운영 모니터링*.

다음 편은 **SMP RTOS**.

## 관련 항목

- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
