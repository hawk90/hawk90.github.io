---
title: "RTOS Scheduler 동작 분석 — Tick·Context Switch·Yield"
slug: "embedded/modern-recipes/part6-03-scheduler-internals"
date: 2026-04-15T09:02:00
description: "Preemptive와 cooperative, time-slice, context switch 비용, tickless idle까지 scheduler가 실제로 어떻게 도는지 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 65
tags: [recipes, rtos, scheduler]
topics: ["embedded"]
---

## 한 줄 요약

> **"FreeRTOS scheduler는 tick, block, unblock, yield 때 ready list에서 가장 높은 우선순위를 고릅니다."** preemption을 끄면 그 선택이 다음 yield까지 미뤄지고, tickless idle을 켜면 기다리는 동안 tick 인터럽트 자체가 사라집니다.

## 어떤 상황에서 쓰나

우선순위가 높은 task가 생각보다 늦게 돌 때, 전환이 언제 일어나는지 알아야 원인을 좁힐 수 있습니다. 전력이 문제일 때는 1 ms마다 들어오는 tick 인터럽트가 sleep을 깨우는지 봐야 합니다.

이 글은 FreeRTOS-Kernel V11.2.0 `ARM_CM3` port의 tick 처리와 PendSV context switch를 소스로 읽고, preemptive·cooperative 차이와 tickless idle의 tick 인터럽트 수를 QEMU에서 돌려 봅니다. 실행 환경은 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)과 같습니다(QEMU 11.1.3 `mps2-an385` `-icount shift=5`, `configTICK_RATE_HZ` 1000). QEMU의 tick은 가상 시간이라 실제 보드의 시간이 아닙니다.

## 핵심 개념

scheduler가 다음 task를 다시 고르는 때는 넷입니다.

1. **Tick 인터럽트**: delay가 끝난 task를 ready로 옮기고, time slicing이면 같은 우선순위끼리 바꿉니다.
2. **Task가 block**: delay, queue 대기, semaphore 대기.
3. **Task가 unblock**: ISR이나 다른 task가 queue·semaphore로 깨움.
4. **명시적 yield**: `taskYIELD()`, `portYIELD_FROM_ISR()`.

| 설정 | 동작 |
|------|------|
| `configUSE_PREEMPTION` 1 | 더 높은 우선순위가 ready가 되면 그 자리에서 전환 |
| `configUSE_PREEMPTION` 0 (cooperative) | 지금 task가 block하거나 yield할 때까지 전환하지 않음 |
| `configUSE_TIME_SLICING` 1 | `configUSE_PREEMPTION` 1일 때, 같은 우선순위 ready task끼리 tick마다 전환(`tasks.c` 4861행) |

## 코드 / 실제 사용 예

### Tick 인터럽트

`ARM_CM3` port의 `xPortSysTickHandler()`(`portable/GCC/ARM_CM3/port.c` 491행) 본문입니다.

```c
portDISABLE_INTERRUPTS();
traceISR_ENTER();
{
    /* Increment the RTOS tick. */
    if( xTaskIncrementTick() != pdFALSE )
    {
        traceISR_EXIT_TO_SCHEDULER();

        /* A context switch is required.  Context switching is performed in
         * the PendSV interrupt.  Pend the PendSV interrupt. */
        portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
    }
    else
    {
        traceISR_EXIT();
    }
}
portENABLE_INTERRUPTS();
```

`xTaskIncrementTick()`이 전환이 필요하다고 하면 SysTick handler는 전환을 하지 않고 PendSV만 걸어 둡니다. 전환은 PendSV 인터럽트에서 일어납니다.

### PendSV context switch

같은 파일의 `xPortPendSVHandler()`가 하는 일입니다.

1. `mrs r0, psp`로 지금 task의 stack pointer를 읽고, `stmdb r0!, {r4-r11}`로 r4–r11을 그 stack에 저장합니다. r0–r3, r12, lr, pc, xPSR은 예외 진입 때 hardware가 이미 쌓았습니다.
2. `bl vTaskSwitchContext`로 다음 task를 고릅니다(앞뒤로 BASEPRI를 올렸다 내림).
3. 새 task의 stack pointer에서 `ldmia r0!, {r4-r11}`로 r4–r11을 꺼내고, `msr psp, r0`로 PSP를 바꿉니다.
4. `bx r14`로 예외에서 돌아가며 hardware가 나머지 register를 꺼냅니다.

hardware 쪽 비용(예외 진입·복귀·tail-chaining cycle)과 FPU context는 [PRTOS 2-04](/blog/embedded/rtos/practical-internals/part2-04-context-switch)가 Cortex-M4 TRM으로 정리합니다.

### Cooperative 모드

`configUSE_PREEMPTION`을 0으로 두면 우선순위가 높은 task가 ready가 되어도, 지금 task가 block하거나 yield할 때까지 전환하지 않습니다. 우선순위 2 task가 tick 5에 깨어나려는 동안 우선순위 1 task가 30 tick 동안 계산한 뒤 `taskYIELD()`하는 프로그램을 두 설정으로 돌렸습니다.

```c
/* coop.c: a prio-2 task wakes at tick 5 while a prio-1 task computes for
   about 30 ticks and then yields. Build with -DconfigUSE_PREEMPTION_OVERRIDE=0
   for cooperative scheduling. */
#include "FreeRTOS.h"
#include "task.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

static void worker(void *arg) {                     /* prio 1 */
    (void)arg;
    TickType_t t0 = xTaskGetTickCount();
    while (xTaskGetTickCount() - t0 < 30) { }       /* long computation */
    pr("worker yields at tick %u\n", (unsigned)xTaskGetTickCount());
    taskYIELD();
    for (;;) vTaskDelay(100);
}

static void urgent(void *arg) {                     /* prio 2 */
    (void)arg;
    vTaskDelay(5);                                  /* wants to run at tick 5 */
    pr("urgent runs at tick %u (preemption %d)\n", (unsigned)xTaskGetTickCount(), configUSE_PREEMPTION);
    hosted_exit(0);
}

int main(void) {
    xTaskCreate(worker, "w", 256, NULL, 1, NULL);
    xTaskCreate(urgent, "u", 256, NULL, 2, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```bash
./build.sh coop.c                                    # configUSE_PREEMPTION 1
./build.sh coop.c -DconfigUSE_PREEMPTION_OVERRIDE=0  # cooperative
qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel coop.elf
```

```text
urgent runs at tick 5 (preemption 1)
worker yields at tick 30
urgent runs at tick 30 (preemption 0)
```

preemptive에서는 tick 5에 바로 돌았고, cooperative에서는 worker가 양보한 tick 30까지 기다렸습니다. cooperative에서 양보하지 않는 loop가 있으면 우선순위와 상관없이 다른 task가 돌지 못합니다.

### Idle hook과 sleep

```c
void vApplicationIdleHook(void) {
    __WFI();        /* sleep until the next interrupt */
}
```

idle task는 우선순위 0이라 다른 task가 모두 block일 때만 돕니다. `configUSE_IDLE_HOOK`이 1이면 idle loop가 이 hook을 부릅니다. WFI로 자도 tick 인터럽트가 1 ms마다 깨웁니다.

### Tickless idle

`configUSE_TICKLESS_IDLE`을 1로 두면 idle 상태에서 port의 `vPortSuppressTicksAndSleep()`이 SysTick을 길게 다시 맞추고 잠든 뒤, 깨어나서 지난 tick 수를 보정합니다. task 하나가 `vTaskDelay(100)` 하는 동안 SysTick handler가 몇 번 들어오는지 셌습니다. 세는 방법은 port.c가 SysTick handler 첫머리에서 부르는 `traceISR_ENTER()`를 counter 증가로 정의한 것입니다.

```c
/* count.h: EXTRA_CONFIG that counts SysTick handler entries */
extern volatile unsigned systick_entries;
#define traceISR_ENTER() (systick_entries++)
```

```c
/* tickless.c: one task sleeps 100 ticks; count SysTick interrupts.
   Build with and without -DconfigUSE_TICKLESS_IDLE=1. */
#include "FreeRTOS.h"
#include "task.h"
extern void pr(const char *, ...); extern void hosted_exit(int);
volatile unsigned systick_entries;

static void sleeper(void *arg) {
    (void)arg;
    vTaskDelay(1);                                  /* align to a tick */
    unsigned n0 = systick_entries; TickType_t t0 = xTaskGetTickCount();
    vTaskDelay(100);
    pr("tickless=%d: %u ticks passed, %u SysTick interrupts\n", configUSE_TICKLESS_IDLE,
       (unsigned)(xTaskGetTickCount() - t0), systick_entries - n0);
    hosted_exit(0);
}

int main(void) {
    xTaskCreate(sleeper, "s", 256, NULL, 1, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```bash
./build.sh tickless.c -I. -DEXTRA_CONFIG='"count.h"'
./build.sh tickless.c -I. -DEXTRA_CONFIG='"count.h"' -DconfigUSE_TICKLESS_IDLE=1
```

```text
tickless=0: 100 ticks passed, 100 SysTick interrupts
tickless=1: 100 ticks passed, 1 SysTick interrupts
```

두 경우 모두 100 tick이 지났고, SysTick 인터럽트는 100번과 1번이었습니다. 전력 차이는 그 MCU의 sleep 전류와 깨어나는 횟수로 정해지므로 보드에서 재야 합니다.

### Yield로 일 나누기

```c
for (int i = 0; i < N; i += CHUNK) {
    process_chunk(i);
    taskYIELD();
}
```

cooperative 설정이나, 같은 우선순위 task 사이에서 tick을 기다리지 않고 순서를 넘길 때 씁니다. preemptive에서는 더 높은 우선순위 task가 알아서 끼어들므로 이 목적의 yield는 필요 없습니다.

## 자주 보는 함정

> ⚠️ Tick rate를 올리면 jitter가 줄어든다는 기대

```c
#define configTICK_RATE_HZ   10000   /* 0.1 ms */
```

tick rate를 10배로 올리면 SysTick handler도 10배 자주 돕니다. tick rate는 `vTaskDelay()` 같은 시간 단위의 해상도를 정할 뿐이고, ISR에서 깨운 task는 tick을 기다리지 않고 `portYIELD_FROM_ISR()`로 바로 전환됩니다.

> ⚠️ Idle hook에서 무거운 작업

```c
void vApplicationIdleHook(void) {
    log_to_flash();
}
```

idle hook은 우선순위 0에서 돕니다. 여기서 막히면 idle task가 하는 일(삭제된 task의 메모리 정리 등)도 미뤄지고, tickless idle에도 들어가지 못합니다.

> ⚠️ Cooperative에서 양보 없는 loop

```c
for (;;) {
    do_work();    /* no yield, no block */
}
```

위 실행처럼 cooperative에서는 이 task가 양보할 때까지 다른 task가 돌지 못합니다. 이 loop가 끝나지 않으면 시스템 전체가 멈춥니다.

> ⚠️ ISR에서 많은 task를 깨움

```c
for (int i = 0; i < N; i++)
    xSemaphoreGiveFromISR(s[i], &hp);
```

ISR이 길어지면 그 사이 같거나 낮은 우선순위 인터럽트와 모든 task가 기다립니다. ISR에서는 하나만 깨우고, 깨어난 task가 나머지를 처리합니다.

## 정리

- 전환 시점은 **tick, block, unblock, yield** 넷입니다. SysTick은 전환이 필요하면 **PendSV만 걸고**, PendSV가 r4–r11을 저장·복원합니다.
- **cooperative**(`configUSE_PREEMPTION` 0)에서는 높은 우선순위 task도 지금 task의 yield를 기다립니다. 위 실행에서는 tick 5에서 30으로 늦어졌습니다.
- **tickless idle**은 100 tick 대기 동안 SysTick 인터럽트를 100번에서 1번으로 줄였습니다.
- tick rate는 시간 해상도를, 우선순위와 ISR 길이는 응답 지연을 정합니다.

다음 편은 **Semaphore 활용**입니다. Binary, counting, resource pool 패턴을 정리합니다.

## 관련 항목

- [PRTOS 1-03: Scheduling Algorithm](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [PRTOS 2-04: Context Switch](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
- [PRTOS 2-09: Tickless](/blog/embedded/rtos/practical-internals/part2-09-tickless)
- [6-02: Task 설계 패턴](/blog/embedded/modern-recipes/part6-02-task-design)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
