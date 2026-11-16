---
title: "RTOS 디버깅 기법 — Stack·Heap·Run-time Stats·SystemView"
slug: "embedded/modern-recipes/part6-12-rtos-debugging"
date: 2026-04-15T09:11:00
description: "Stack high-water mark, overflow hook, heap 통계, run-time stats, mutex timeout을 FreeRTOS V11.2.0·QEMU에서 실행해 읽고, SystemView 연결 방법을 SEGGER 문서로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 74
tags: [recipes, rtos, debugging]
topics: ["embedded"]
---

## 한 줄 요약

> **"RTOS 디버깅은 *측정 인프라*입니다."** Stack high-water mark, overflow hook, heap 통계, run-time stats를 처음부터 켜 두면 reset이 난 뒤에도 원인을 추적할 근거가 남습니다. 이 글은 네 가지를 FreeRTOS V11.2.0과 QEMU `mps2-an385`(Cortex-M3)에서 한 프로그램으로 돌려 보고, 각 출력이 무엇을 말하는지 소스와 맞춰 읽습니다.

## 어떤 상황에서 쓰나

양산 보드에서 reset이 가끔 나는데 디버거가 붙어 있지 않으면, 남은 기록이 없는 한 원인은 추정으로만 남습니다. 비행기의 블랙박스처럼, 사고가 나기 *전부터* 기록 장치가 돌고 있어야 사고 뒤에 읽을 것이 생깁니다. FreeRTOS는 그 기록 장치의 재료를 커널 옵션으로 제공합니다.

또 하나는 응답 지연이 갑자기 튀는 경우입니다. 어떤 task가 CPU를 얼마나 썼는지, 어떤 mutex를 누가 쥐고 있는지 숫자로 봐야 원인이 좁혀집니다. 이 글의 실행 예는 그 숫자를 커널 API로 직접 뽑고, timeline이 필요한 경우를 위해 SEGGER SystemView를 붙이는 방법을 SEGGER 문서 기준으로 정리합니다.

## 핵심 개념

이 글에서 켜는 인프라는 다음 다섯 가지이고, 모두 `FreeRTOSConfig.h`의 옵션으로 켭니다.

| 인프라 | 옵션 | 쓰는 API | 근거 |
| --- | --- | --- | --- |
| Stack high-water mark | `configUSE_TRACE_FACILITY 1`(`uxTaskGetSystemState`용), `INCLUDE_uxTaskGetStackHighWaterMark 1`(`uxTaskGetStackHighWaterMark`용, 기본값 0) | `uxTaskGetSystemState`, `uxTaskGetStackHighWaterMark` | V11.2.0 `tasks.c:4440`, `:6429` |
| Overflow hook | `configCHECK_FOR_STACK_OVERFLOW 2` | `vApplicationStackOverflowHook` | `include/stack_macros.h:101-118` |
| Malloc 실패 hook | `configUSE_MALLOC_FAILED_HOOK 1` | `vApplicationMallocFailedHook` | `portable/MemMang/heap_4.c` |
| Heap 통계 | (heap_4 기본) | `xPortGetFreeHeapSize`, `xPortGetMinimumEverFreeHeapSize`, `vPortGetHeapStats` | `include/portable.h`의 `HeapStats_t` |
| Run-time stats | `configGENERATE_RUN_TIME_STATS 1`, `configUSE_STATS_FORMATTING_FUNCTIONS 1` | `vTaskGetRunTimeStatistics` | `tasks.c:7460` |

이 글에서 실제로 빌드한 설정 파일은 아래와 같습니다. 아래쪽 블록이 디버깅용으로 켠 옵션이고, run-time stats의 시계로는 `mps2-an385`의 CMSDK APB TIMER0을 free-running down-counter로 씁니다. QEMU v11.1.3 `hw/arm/mps2.c`는 timer *i*를 `0x40000000 + i * 0x1000`에 두고 25 MHz `SYSCLK_FRQ`를 pclk로 물리며, `hw/timer/cmsdk-apb-timer.c`의 레지스터 offset은 CTRL 0, VALUE 4, RELOAD 8입니다.

```c
#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H

#define configUSE_PREEMPTION                    1
#define configUSE_PORT_OPTIMISED_TASK_SELECTION 1
#define configCPU_CLOCK_HZ                      25000000UL
#define configTICK_RATE_HZ                      1000
#define configMAX_PRIORITIES                    8
#define configMINIMAL_STACK_SIZE                256
#define configTOTAL_HEAP_SIZE                   (64 * 1024)
#define configMAX_TASK_NAME_LEN                 12
#define configTICK_TYPE_WIDTH_IN_BITS           TICK_TYPE_WIDTH_32_BITS
#define configUSE_IDLE_HOOK                     0
#define configUSE_TICK_HOOK                     0
#define configUSE_MUTEXES                       1
#define configSUPPORT_DYNAMIC_ALLOCATION        1
#define configUSE_TIMERS                        1
#define configTIMER_TASK_PRIORITY               7
#define configTIMER_QUEUE_LENGTH                8
#define configTIMER_TASK_STACK_DEPTH            256
#define configKERNEL_INTERRUPT_PRIORITY         255
#define configMAX_SYSCALL_INTERRUPT_PRIORITY    (5 << 5)
#define configPRIO_BITS                         3

/* the debugging infrastructure this post turns on */
#define configCHECK_FOR_STACK_OVERFLOW          2
#define configUSE_MALLOC_FAILED_HOOK            1
#define configUSE_TRACE_FACILITY                1
#define configGENERATE_RUN_TIME_STATS           1
#define configUSE_STATS_FORMATTING_FUNCTIONS    1

/* run-time stats clock: CMSDK APB TIMER0 (0x40000000) as a free-running down-counter */
#define CMSDK_TIMER0 ((volatile unsigned *)0x40000000)   /* [0]=CTRL [1]=VALUE [2]=RELOAD */
#define portCONFIGURE_TIMER_FOR_RUN_TIME_STATS() \
    do { CMSDK_TIMER0[2] = 0xffffffffu; CMSDK_TIMER0[1] = 0xffffffffu; CMSDK_TIMER0[0] = 1u; } while (0)
#define portGET_RUN_TIME_COUNTER_VALUE()        (0xffffffffu - CMSDK_TIMER0[1])

#define INCLUDE_vTaskDelay                      1
#define INCLUDE_vTaskSuspend                    1
#define INCLUDE_xTaskGetSchedulerState          1
#define INCLUDE_xSemaphoreGetMutexHolder        1

void assert_fail(const char *file, unsigned line);
#define configASSERT(x) do { if (!(x)) assert_fail(__FILE__, __LINE__); } while (0)

#endif
```

## 코드 / 실제 사용 예

아래 네 블록(hook, task, overflow, monitor)을 순서대로 이어 붙이면 이 글에서 돌린 `rtdbg.c` 한 파일이 됩니다. 빌드 명령과 하네스(startup, UART 출력, 링커 스크립트)는 맨 뒤 [재현 환경](#재현-환경) 절에 있습니다.

### Hook 두 개

Overflow hook은 커널이 overflow를 감지했을 때, malloc 실패 hook은 `pvPortMalloc`이 NULL을 돌려주기 직전에 부릅니다. 아래 hook은 감지 순간의 실행 문맥(IPSR)과 scheduler 상태, heap 상태를 그대로 찍습니다.

```c
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"

void pr(const char *fmt, ...);      /* UART0 printf, harness io.c */
void hosted_exit(int code);         /* semihosting exit, harness io.c */

static const uint32_t *ovf_base;    /* lowest address of the "ovf" stack */

void vApplicationStackOverflowHook(TaskHandle_t t, char *name)
{
    unsigned ipsr;
    (void)t;
    __asm volatile("mrs %0, ipsr" : "=r"(ipsr));
    pr("[hook] stack overflow in task '%s' (IPSR=%u, scheduler state=%d)\n",
       name, ipsr, (int)xTaskGetSchedulerState());
    const uint32_t *w = ovf_base;   /* vTaskGetInfo() is not ISR-safe */
    pr("[hook] stack base 0x%x: %x %x %x %x\n",
       (unsigned)w, (unsigned)w[0], (unsigned)w[1], (unsigned)w[2], (unsigned)w[3]);
    hosted_exit(0);                 /* on a board: save a record, then reset */
}

void vApplicationMallocFailedHook(void)
{
    HeapStats_t s;
    vPortGetHeapStats(&s);
    pr("[hook] malloc failed: free=%u min_ever=%u largest_block=%u free_blocks=%u\n",
       (unsigned)xPortGetFreeHeapSize(), (unsigned)xPortGetMinimumEverFreeHeapSize(),
       (unsigned)s.xSizeOfLargestFreeBlockInBytes, (unsigned)s.xNumberOfFreeBlocks);
}
```

### Workload와 mutex timeout

`busy`와 `light`는 CPU를 쓰는 양이 다른 두 task이고, `holder`는 mutex를 잡은 채 놓지 않습니다. `waiter`는 그 mutex를 `portMAX_DELAY` 대신 500 ms timeout으로 기다립니다. 회의실 예약에 "30분 기다려도 안 비면 다른 방을 찾는다"는 규칙을 두는 것과 같아서, 영원히 막히는 대신 실패를 기록할 기회가 생깁니다.

```c
static volatile unsigned sink;
static SemaphoreHandle_t m;

static void busy(void *a)
{
    (void)a;
    for (;;) {
        for (int i = 0; i < 20000; i++) sink += i;
        vTaskDelay(1);
    }
}

static void light(void *a)
{
    (void)a;
    for (;;) {
        for (int i = 0; i < 2000; i++) sink += i;
        vTaskDelay(5);
    }
}

static void holder(void *a)
{
    (void)a;
    xSemaphoreTake(m, portMAX_DELAY);
    pr("holder: took mutex, never gives it back\n");
    for (;;) vTaskDelay(1000);
}

static void waiter(void *a)
{
    (void)a;
    vTaskDelay(10);
    TickType_t t0 = xTaskGetTickCount();
    if (xSemaphoreTake(m, pdMS_TO_TICKS(500)) != pdTRUE)
        pr("waiter: xSemaphoreTake timed out after %u ticks, holder=%s\n",
           (unsigned)(xTaskGetTickCount() - t0),
           pcTaskGetName(xSemaphoreGetMutexHolder(m)));
    for (;;) vTaskDelay(1000);
}
```

### 일부러 넘치는 task

`recurse`는 단계마다 64바이트 배열을 쓰고 `vTaskDelay(1)`로 context switch를 일으킵니다. FreeRTOS의 overflow 검사는 context switch 때만 돌기 때문입니다(`tasks.c:5153`의 `taskCHECK_FOR_STACK_OVERFLOW()`가 `vTaskSwitchContext` 안에 있습니다). `TOUCH_ALL`을 정의하면 배열 64바이트를 모두 쓰고, 정의하지 않으면 배열마다 한두 바이트만 씁니다. 다만 `-O2`에서 GCC는 재귀 아홉 단계를 한 함수 안에 펼칩니다. `-fstack-usage`가 보고한 `recurse`의 frame은 592 B이고 `overflow`는 72 B라, 128 word(512 B) stack에서는 첫 `recurse` 호출에서 이미 SP가 stack 시작(`pxStack`) 아래로 내려갑니다.

```c
static void recurse(volatile char *p, int depth)
{
    volatile char buf[64];
#ifdef TOUCH_ALL
    for (int i = 0; i < 64; i++) buf[i] = (char)depth;   /* write the whole frame */
#else
    buf[0] = (char)depth;                                 /* write one byte per frame */
#endif
    if (p) buf[1] = p[0];
    vTaskDelay(1);                  /* a context switch runs the check */
    recurse(buf, depth + 1);
}

static void overflow(void *a)
{
    (void)a;
    recurse(0, 0);
}
```

### Monitor task

Monitor는 2초 뒤 한 번 깨어나 stack 여유, run-time stats, heap 단편화를 차례로 찍고, 마지막에 넘치는 task `ovf`를 128 word stack으로 만듭니다. `ovf`의 stack 시작 주소는 task 문맥에서 `vTaskGetInfo`로 미리 읽어 둡니다. V11.2.0에서 hook 안에서 `vTaskGetInfo`를 불렀더니 `portable/GCC/ARM_CM3/port.c` 438행의 `configASSERT`(critical section을 interrupt 안에서 열었는지 보는 검사)에 걸렸기 때문입니다.

```c
static void monitor(void *a)
{
    static TaskStatus_t info[12];
    static char buf[512];
    static void *blk[1000];
    (void)a;

    vTaskDelay(pdMS_TO_TICKS(2000));

    UBaseType_t n = uxTaskGetSystemState(info, 12, NULL);
    pr("-- stack high-water mark (words free -> bytes)\n");
    for (UBaseType_t i = 0; i < n; i++)
        pr("%s: hwm=%u words = %u bytes\n", info[i].pcTaskName,
           (unsigned)info[i].usStackHighWaterMark,
           (unsigned)(info[i].usStackHighWaterMark * sizeof(StackType_t)));

    pr("-- vTaskGetRunTimeStatistics\n");
    vTaskGetRunTimeStatistics(buf, sizeof buf);
    pr("%s", buf);

    pr("-- heap fragmentation\n");
    int k = 0;
    pr("before: free=%u\n", (unsigned)xPortGetFreeHeapSize());
    while (k < 1000 && (blk[k] = pvPortMalloc(100)) != NULL) k++;
    pr("allocated %d x 100 B until NULL, free=%u\n", k, (unsigned)xPortGetFreeHeapSize());
    for (int i = 0; i < k; i += 2) vPortFree(blk[i]);
    HeapStats_t s;
    vPortGetHeapStats(&s);
    pr("freed every other block: free=%u largest_block=%u free_blocks=%u\n",
       (unsigned)s.xAvailableHeapSpaceInBytes,
       (unsigned)s.xSizeOfLargestFreeBlockInBytes, (unsigned)s.xNumberOfFreeBlocks);
    pr("pvPortMalloc(1024) -> %s\n", pvPortMalloc(1024) ? "ok" : "NULL");
    for (int i = 1; i < k; i += 2) vPortFree(blk[i]);
    pr("freed the rest: free=%u\n", (unsigned)xPortGetFreeHeapSize());

    pr("-- starting a task with a 128-word stack that recurses\n");
    TaskHandle_t h;
    TaskStatus_t st;
    vTaskSuspendAll();              /* record the stack base before "ovf" runs */
    xTaskCreate(overflow, "ovf", 128, NULL, 3, &h);
    vTaskGetInfo(h, &st, pdFALSE, eInvalid);
    ovf_base = (const uint32_t *)st.pxStackBase;
    xTaskResumeAll();
    for (;;) vTaskDelay(1000);
}

int main(void)
{
    m = xSemaphoreCreateMutex();
    xTaskCreate(busy, "busy", 256, NULL, 1, NULL);
    xTaskCreate(light, "light", 256, NULL, 2, NULL);
    xTaskCreate(holder, "holder", 256, NULL, 2, NULL);
    xTaskCreate(waiter, "waiter", 256, NULL, 2, NULL);
    xTaskCreate(monitor, "monitor", 512, NULL, 4, NULL);
    vTaskStartScheduler();
    return 0;
}
```

## 측정 / 성능 비교

V11.2.0으로 빌드해 `qemu-system-arm -M mps2-an385 -icount shift=5`로 돌린 전체 출력을 절별로 나눠 읽습니다. `-icount shift=5`는 명령 하나를 가상 시간 2^5 ns로 세는 모드라 출력이 실행할 때마다 같고(두 번 돌려 `diff`가 비었습니다), 시간 값은 실제 보드의 시간이 아니라 이 가상 시계 기준입니다.

### Mutex timeout

```text
holder: took mutex, never gives it back
waiter: xSemaphoreTake timed out after 500 ticks, holder=holder
```

`waiter`는 정확히 500 tick 뒤 `pdFALSE`를 받았고, `xSemaphoreGetMutexHolder`로 그 순간의 소유자 이름까지 남겼습니다. `portMAX_DELAY`였다면 `waiter`는 아무 출력 없이 영원히 Blocked 상태로 남습니다.

### Stack high-water mark

```text
-- stack high-water mark (words free -> bytes)
monitor: hwm=460 words = 1840 bytes
holder: hwm=240 words = 960 bytes
light: hwm=232 words = 928 bytes
busy: hwm=230 words = 920 bytes
IDLE: hwm=246 words = 984 bytes
waiter: hwm=226 words = 904 bytes
Tmr Svc: hwm=228 words = 912 bytes
```

`usStackHighWaterMark`의 단위는 byte가 아니라 word입니다. 이 값은 `vTaskGetInfo`가 `prvTaskCheckFreeStackSpace`로 채우고(`tasks.c:6308`), 이 함수는 stack 끝에서부터 `tskSTACK_FILL_BYTE`(`0xa5`)가 이어진 byte 수를 센 뒤 `sizeof(StackType_t)`로 나눕니다(`:6364-6377`). `uxTaskGetStackHighWaterMark`도 같은 함수를 부르고(`:6450`), ARM_CM3 port의 `StackType_t`는 `uint32_t`입니다(`portmacro.h:55-58`). 그래서 byte로 바꾸려면 4를 곱합니다. 같은 이유로 `xTaskCreate`의 stack 크기 인자도 word 단위입니다. 커널은 `uxStackDepth * sizeof(StackType_t)` byte를 할당하므로(`tasks.c:1674`), Cortex-M에서 `xTaskCreate(t, "t", 8192, ...)`는 32 KiB를 잡습니다.

256 word로 만든 task들이 226~246 word를 남겼으니, 이 workload에서는 stack의 대부분이 한 번도 쓰이지 않았습니다. 다만 high-water mark는 *지금까지 지나간 경로*만 반영합니다. 오류 처리 경로처럼 아직 실행되지 않은 경로의 깊이는 이 숫자에 없습니다.

### Run-time stats

```text
-- vTaskGetRunTimeStatistics
monitor    	29618		<1%
holder     	947		<1%
light      	3914011		7%
busy       	38522818		76%
IDLE       	7559883		15%
waiter     	2113		<1%
Tmr Svc    	374		<1%
```

형식은 V11.2.0 `vTaskGetRunTimeStatistics`가 정합니다. 이름 뒤에 누적 카운터, 그다음 백분율이 오고, 1% 미만은 `<1%`로 찍습니다(`tasks.c:7571`, `:7600`). 백분율은 전체 시간을 100으로 나눈 값으로 각 task 카운터를 나눈 정수라서(`:7520`) 합이 100이 되지 않을 수 있습니다. 이 출력에서도 76 + 15 + 7 = 98입니다.

`busy`가 76%를 썼고, idle task가 15%를 받았습니다. 어느 task가 CPU를 잡아먹는지는 이 표 한 장으로 보입니다. 카운터는 context switch마다 `portGET_RUN_TIME_COUNTER_VALUE()`의 차이를 현재 task에 더하는 방식이라(`tasks.c:5133-5150`), 시계가 32비트에서 한 바퀴 돌면 그 구간의 값이 틀어집니다. 소스 주석도 "there is no overflow protection here so count values are only valid until the timer overflows"라고 적습니다. 이 글의 25 MHz 카운터는 2^32 / 25,000,000 ≈ 171.8초마다 돕니다.

### Heap 단편화

```text
-- heap fragmentation
before: free=56280
[hook] malloc failed: free=56 min_ever=56 largest_block=56 free_blocks=1
allocated 502 x 100 B until NULL, free=56
freed every other block: free=28168 largest_block=112 free_blocks=252
[hook] malloc failed: free=28168 min_ever=56 largest_block=112 free_blocks=252
pvPortMalloc(1024) -> NULL
freed the rest: free=56280
```

heap_4는 블록을 해제할 때 이웃한 빈 블록과 합칩니다(`heap_4.c:30-32`의 "combines (coalescences) adjacent memory blocks"). 그래도 *이웃이 사용 중*이면 합칠 수 없습니다. 이 실행은 100 B를 heap이 빌 때까지 502번 할당한 뒤 하나 건너 하나씩 풀었습니다. 그 결과 빈 공간은 28,168 B로 절반이 남았지만, 가장 큰 빈 블록은 112 B였고 `pvPortMalloc(1024)`는 실패했습니다. 주차장에 빈 칸이 절반 남아 있어도 연속된 빈 칸이 없으면 버스를 세울 수 없는 것과 같습니다.

112 B는 요청 100 B에 heap_4의 블록 헤더 `xHeapStructSize`를 더하고 `portBYTE_ALIGNMENT`(ARM_CM3에서 8)로 올림한 크기입니다(`heap_4.c:158`, `:186-199`). 32비트에서 `BlockLink_t`는 포인터 하나와 `size_t` 하나라 8 B이고, 100 + 8 = 108을 8의 배수로 올리면 112입니다. 그래서 `xPortGetFreeHeapSize()` 하나만 보면 "28 KB 남았다"고 안심하게 됩니다. 단편화를 보려면 `vPortGetHeapStats`의 `xSizeOfLargestFreeBlockInBytes`를 같이 찍어야 합니다.

### Overflow 감지

```text
-- starting a task with a 128-word stack that recurses
[hook] stack overflow in task 'ovf' (IPSR=14, scheduler state=2)
[hook] stack base 0x20003918: a5a5a5a5 a5a5a5a5 a5a5a5a5 a5a5a5a5
```

IPSR = 14는 지금 처리 중인 예외 번호이고, 이 글 `startup.c`의 vector table에서 14번 자리는 `xPortPendSVHandler`입니다. 즉 hook은 task 문맥이 아니라 PendSV 핸들러 안에서 불렸습니다. V11.2.0 ARM_CM3 port의 `xPortPendSVHandler`는 BASEPRI를 `configMAX_SYSCALL_INTERRUPT_PRIORITY`로 올린 채 `vTaskSwitchContext`를 부르고(`port.c:472-473`), 그 안에서 overflow 검사가 돕니다. Scheduler 상태 2는 `taskSCHEDULER_RUNNING`입니다(`task.h:281`). 그래서 hook 안에서 critical section을 여는 API를 부르면 `port.c:438`의 assert에 걸립니다. 위에서 본 `vTaskGetInfo`는 `eInvalid`로 부르면 `eTaskGetState`가 critical section을 엽니다(`tasks.c:2530`). 이 hook이 부르는 `xTaskGetSchedulerState`는 단일 코어 빌드에서 critical section 없이 변수만 읽습니다(`tasks.c:6599-6631`).

Stack 시작의 네 word는 모두 `0xa5a5a5a5`로 남아 있었습니다. 이번 감지는 패턴 검사가 아니라 SP 검사에서 나왔다는 뜻입니다. V11.2.0의 method 2는 저장된 SP(`pxTopOfStack`)가 `pxStack` 이하인지 먼저 보고, 그다음 시작 네 word가 `0xa5a5a5a5`인지 봅니다(`stack_macros.h:109-113`).

같은 프로그램을 커널 버전과 `TOUCH_ALL`만 바꿔 네 번 돌린 결과는 다음과 같습니다.

| 커널 | frame 쓰기 | 결과 | Stack 시작 네 word |
| --- | --- | --- | --- |
| V11.2.0 | 한두 바이트 | hook 호출 | `a5a5a5a5` ×4 |
| V11.2.0 | 64바이트 전부 | hook 호출 | `a5a5a5a5` ×4 |
| V11.1.0 | 한두 바이트 | **HardFault**, hook 없음 | — |
| V11.1.0 | 64바이트 전부 | hook 호출 | `0x03030303` ×4 (`pr`의 `%x`는 앞자리 0을 찍지 않아 `3030303`으로 나옴) |

V11.1.0의 method 2는 패턴 네 word만 비교하고 SP 검사는 하지 않습니다(V11.1.0 `stack_macros.h:89-106`). 배열마다 한두 바이트만 쓰면 64 B 간격의 쓰기가 `pxStack`의 16 B 패턴을 건너뛰고, 그 결과 hook 없이 HardFault로 끝났습니다. 소스 주석도 이 검사가 "does not guarantee that an overflowed stack will always be recognised"라고 적습니다(`stack_macros.h:42-43`). 감시 카메라가 출입문 하나만 비춘다면 창문으로 들어온 사람은 찍히지 않는 것과 같습니다. 그래서 MPU로 stack 아래에 guard region을 두는 방법을 함께 검토합니다. Method 1·2와 MPU guard의 차이는 [PRTOS 4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)에서 다룹니다.

### Trace recorder (SystemView)

Run-time stats는 누적 합계라서 "언제" 튀었는지는 보여 주지 않습니다. 시점이 필요하면 이벤트를 timestamp와 함께 기록하는 trace recorder를 씁니다. 이 절은 SEGGER SystemView User Guide(UM08027, software version 4.10, 2026-03-30)를 읽고 정리한 것이고, J-Link가 없어 실행하지는 않았습니다.

- FreeRTOS에 붙일 때는 `SEGGER_SYSVIEW_Config_FreeRTOS.c`를 빌드에 넣고, `FreeRTOSConfig.h` 끝(또는 `FreeRTOS.h`를 include하는 모든 곳 위)에 `SEGGER_SYSVIEW_FreeRTOS.h`를 include합니다. 이 헤더가 커널의 trace macro를 SystemView 이벤트로 바꿉니다(4.7.5.1절).
- `SEGGER_SYSVIEW_RecordEnterISR()`와 `SEGGER_SYSVIEW_RecordExitISR()`는 task 코드가 아니라 **interrupt 핸들러의 시작과 끝**에서 부르는 함수입니다. ISR이 context switch를 일으키면 끝에서 `SEGGER_SYSVIEW_RecordExitISRToScheduler()`를 부릅니다(6.1.2.1–6.1.2.2절).
- 연속 기록의 RTT 버퍼 기본값은 1024 B(`SEGGER_SYSVIEW_RTT_BUFFER_SIZE`)이고, 문서는 대부분 1024 B로 충분하며 4096 B까지 늘릴 수 있다고 적습니다. Single-shot과 post-mortem 기록에는 최소 8 KB를 권합니다(4.5.2.1절).
- 문서가 밝힌 비용은 200 MHz Cortex-M4 기준 이벤트 하나에 1 µs 미만, 초당 10,000 이벤트에서 1% 미만이고, RTT·SystemView 모듈의 ROM은 합쳐 2 KB 미만입니다(1.1.2절).

ISR을 기록하는 형태는 문서의 예(6.1.2.3절)를 따르면 다음과 같습니다.

```c
#include "SEGGER_SYSVIEW.h"

void TIMER0_IRQHandler(void)
{
    SEGGER_SYSVIEW_RecordEnterISR();
    handle_timer0();
    SEGGER_SYSVIEW_RecordExitISR();
}
```

Tracealyzer(Percepio)도 같은 목적의 도구지만, 이 글에서는 그 문서를 확인하지 않았으므로 설정과 비용은 다루지 않습니다.

## 자주 보는 함정

> ⚠️ 디버거에서만 잡으려 함

디버거가 없는 보드에서 reset이 나면, 위 hook들이 찍은 정보(task 이름, IPSR, heap 상태)를 UART 대신 reset 뒤에도 남는 영역(flash, backup RAM 등)에 저장해 두면, 다음 부팅에서 그 기록을 읽을 수 있습니다. 저장 위치와 형식은 보드마다 다르므로 이 글의 예는 UART 출력에서 멈춥니다.

> ⚠️ `xPortGetFreeHeapSize()`만 보고 안심함

위 실행에서 free는 28,168 B였지만 1 KiB 할당이 실패했습니다. 남은 총량과 가장 큰 블록은 다른 숫자이므로 `vPortGetHeapStats`로 둘 다 기록합니다. 할당과 해제가 반복되는 크기가 정해져 있다면 정적 할당(`xTaskCreateStatic` 등)이나 고정 크기 pool로 바꾸면 단편화 자체가 생기지 않습니다. 고정 크기 블록만 주고받으면 빈 칸이 모두 같은 크기라 "칸은 있는데 안 맞는" 상황이 없기 때문입니다.

> ⚠️ Stack 크기 인자를 byte로 읽음

```c
xTaskCreate(t, "t", 8192, NULL, 2, NULL);   /* 8192 words = 32 KiB on Cortex-M */
```

위에서 본 대로 인자는 word 단위입니다. 크기는 high-water mark를 측정해 정하되, 측정은 오류 경로까지 돌린 뒤의 값이어야 의미가 있습니다.

> ⚠️ Trace를 켠 채로 timing을 잼

Trace recorder는 이벤트마다 코드를 더 실행합니다. SEGGER 문서가 밝힌 이벤트당 1 µs 미만이라는 수치도 0은 아닙니다. 그래서 trace를 켜고 잰 jitter는 trace를 끈 양산 빌드의 jitter와 같지 않습니다. 최종 timing은 trace를 끈 빌드로 다시 잽니다.

> ⚠️ Overflow 검사를 "모든 overflow를 잡는 장치"로 믿음

위 표의 V11.1.0 첫 줄처럼, 검사 방식과 커널 버전에 따라 overflow가 hook 없이 HardFault로 끝날 수 있습니다. HardFault handler에서도 fault 정보를 남기도록 해 두면 hook이 놓친 경우를 잡을 수 있습니다. Fault 레지스터를 읽는 방법은 [PRTOS 4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)를 참고합니다.

## 재현 환경

아래 파일과 명령으로 위 출력을 그대로 다시 얻을 수 있습니다. 사용한 도구는 `arm-none-eabi-gcc` 16.2.0(Homebrew, newlib 없음)과 QEMU 11.1.3이고, 커널은 FreeRTOS-Kernel V11.2.0 태그입니다. Newlib이 없으므로 FreeRTOS가 이 빌드에서 쓰는 `snprintf`·`memset`·`memcpy`·`strlen`·`strcpy`를(`arm-none-eabi-nm -u`로 확인) `io.c`에 직접 넣었습니다.

디렉터리에는 `FreeRTOSConfig.h`, `rtdbg.c`(위 네 블록), `startup.c`, `io.c`, `link.ld`, 그리고 `libc/` 아래 `stdio.h`·`stdlib.h`·`string.h` 세 헤더를 둡니다. `libc/` 헤더는 `io.c`에 넣은 함수의 선언만 담고, `stdlib.h`는 `#pragma once` 한 줄입니다.

```c
/* libc/stdio.h */
#pragma once
#include <stddef.h>
int snprintf(char *, size_t, const char *, ...);

/* libc/string.h */
#pragma once
#include <stddef.h>
void *memset(void *, int, size_t);
void *memcpy(void *, const void *, size_t);
size_t strlen(const char *);
char *strcpy(char *, const char *);
```

```c
/* Cortex-M3 vector table and reset handler for mps2-an385 */
#include <stdint.h>

extern uint32_t _etext, _sdata, _edata, _sbss, _ebss, _estack;
extern int main(void);
extern void vPortSVCHandler(void), xPortPendSVHandler(void), xPortSysTickHandler(void);
void pr(const char *f, ...);
void hosted_exit(int code);

void Reset_Handler(void)
{
    uint32_t *s = &_etext, *d = &_sdata;
    while (d < &_edata) *d++ = *s++;
    for (d = &_sbss; d < &_ebss;) *d++ = 0;
    main();
    for (;;) { }
}

void Default_Handler(void)   { hosted_exit(99); }
void HardFault_Handler(void) { pr("HardFault\n"); hosted_exit(98); }

__attribute__((section(".vectors"), used))
void (*const vectors[16])(void) = {
    (void (*)(void))&_estack, Reset_Handler, Default_Handler, HardFault_Handler,
    Default_Handler, Default_Handler, Default_Handler, 0, 0, 0, 0,
    vPortSVCHandler, Default_Handler, 0, xPortPendSVHandler, xPortSysTickHandler,
};
```

```c
/* mps2-an385 CMSDK UART0 output, semihosting exit, and the few libc calls FreeRTOS needs */
#include <stdarg.h>
#include <stddef.h>
#include <stdint.h>

#define UART0_DATA  (*(volatile uint32_t *)0x40004000)
#define UART0_STATE (*(volatile uint32_t *)0x40004004)
#define UART0_CTRL  (*(volatile uint32_t *)0x40004008)

static void putc_(char c)
{
    UART0_CTRL |= 1;                        /* TX enable */
    while (UART0_STATE & 1) { }             /* TX buffer full */
    UART0_DATA = (uint32_t)c;
}

static void putu(unsigned v, unsigned base)
{
    char b[12];
    int i = 0;
    do { b[i++] = "0123456789abcdef"[v % base]; v /= base; } while (v);
    while (i) putc_(b[--i]);
}

void pr(const char *f, ...)                 /* %s %u %d %x only */
{
    va_list a;
    va_start(a, f);
    for (; *f; f++) {
        if (*f != '%') { putc_(*f); continue; }
        switch (*++f) {
        case 's': for (const char *s = va_arg(a, const char *); *s; s++) putc_(*s); break;
        case 'u': putu(va_arg(a, unsigned), 10); break;
        case 'd': { int v = va_arg(a, int); if (v < 0) { putc_('-'); v = -v; } putu((unsigned)v, 10); } break;
        case 'x': putu(va_arg(a, unsigned), 16); break;
        default:  putc_(*f);
        }
    }
    va_end(a);
}

void hosted_exit(int code)                  /* semihosting SYS_EXIT, ADP_Stopped_ApplicationExit */
{
    (void)code;
    register uint32_t r0 __asm("r0") = 0x18;
    register uint32_t r1 __asm("r1") = 0x20026;
    __asm volatile("bkpt 0xab" : : "r"(r0), "r"(r1));
    for (;;) { }
}

void assert_fail(const char *file, unsigned line)
{
    pr("ASSERT failed: %s line %u\n", file, line);
    hosted_exit(97);
}

/* vTaskGetRunTimeStatistics() formats with snprintf: %s %u %lu %% are enough */
int snprintf(char *b, size_t n, const char *f, ...)
{
    va_list a;
    size_t o = 0;
#define PUT(c) do { if (o + 1 < n) b[o] = (c); o++; } while (0)
    va_start(a, f);
    for (; *f; f++) {
        if (*f != '%') { PUT(*f); continue; }
        if (*++f == 'l') f++;
        if (*f == 's') {
            for (const char *s = va_arg(a, const char *); *s; s++) PUT(*s);
        } else if (*f == 'u') {
            unsigned v = va_arg(a, unsigned);
            char t[12];
            int i = 0;
            do { t[i++] = (char)('0' + v % 10); v /= 10; } while (v);
            while (i) PUT(t[--i]);
        } else {
            PUT(*f);
        }
    }
    va_end(a);
    if (n) b[o < n ? o : n - 1] = 0;
    return (int)o;
}

void *memset(void *d, int c, size_t n) { unsigned char *p = d; while (n--) *p++ = (unsigned char)c; return d; }
void *memcpy(void *d, const void *s, size_t n) { unsigned char *p = d; const unsigned char *q = s; while (n--) *p++ = *q++; return d; }
size_t strlen(const char *s) { size_t n = 0; while (s[n]) n++; return n; }
char *strcpy(char *d, const char *s) { char *r = d; while ((*d++ = *s++)) { } return r; }
```

```text
MEMORY { FLASH (rx) : ORIGIN = 0x00000000, LENGTH = 4M
         RAM (rwx)  : ORIGIN = 0x20000000, LENGTH = 4M }
ENTRY(Reset_Handler)
SECTIONS {
  .text : { KEEP(*(.vectors)) *(.text*) *(.rodata*) . = ALIGN(4); _etext = .; } > FLASH
  .data : AT(_etext) { _sdata = .; *(.data*) . = ALIGN(4); _edata = .; } > RAM
  .bss : { _sbss = .; *(.bss*) *(COMMON) . = ALIGN(4); _ebss = .; } > RAM
  _estack = ORIGIN(RAM) + LENGTH(RAM);
}
```

```bash
git clone --depth 1 --branch V11.2.0 https://github.com/FreeRTOS/FreeRTOS-Kernel.git
K=FreeRTOS-Kernel P=$K/portable/GCC/ARM_CM3
arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -O2 -g -ffreestanding -nostdlib -fno-builtin \
  -I. -Ilibc -I$K/include -I$P -T link.ld -o rtdbg.elf \
  startup.c io.c rtdbg.c $K/tasks.c $K/queue.c $K/list.c $K/timers.c \
  $P/port.c $K/portable/MemMang/heap_4.c -lgcc
qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel rtdbg.elf
```

`-DTOUCH_ALL`을 gcc 명령에 더하면 frame 전체를 쓰는 변형이 되고, `--branch V11.1.0`으로 받으면 위 표의 V11.1.0 줄을 재현합니다. 프로그램은 overflow hook이나 HardFault handler에서 semihosting으로 QEMU를 끝냅니다.

## 정리

- Overflow hook, malloc 실패 hook, high-water mark, heap 통계, run-time stats는 모두 `FreeRTOSConfig.h` 옵션 몇 줄로 켜지고, 이 글의 프로그램은 그 출력을 한 번에 보여 줍니다.
- `usStackHighWaterMark`와 `xTaskCreate`의 stack 인자는 word 단위입니다. Cortex-M에서는 4를 곱해야 byte입니다.
- `vTaskGetRunTimeStatistics`의 백분율은 정수 나눗셈이라 합이 100이 안 될 수 있고, 시계가 32비트에서 한 바퀴 돌면 값이 틀어집니다.
- Heap 상태는 free 총량과 가장 큰 블록을 함께 봅니다. 이 실행에서는 28 KB가 남았는데도 1 KiB 할당이 실패했습니다.
- Mutex를 timeout으로 기다리면 deadlock이 영원한 정지 대신 기록 가능한 실패가 됩니다.
- Overflow hook은 PendSV 안에서 불립니다. hook 안에서 critical section을 여는 API를 부르면 `port.c:438`의 assert에 걸립니다.
- Method 2도 모든 overflow를 잡지는 않습니다. V11.1.0에서는 패턴을 건너뛴 overflow가 HardFault로 끝났고, V11.2.0은 SP 검사를 더해 같은 경우를 잡았습니다.

다음 편부터 Part 7 **임베디드 Linux 부팅 흐름**으로 넘어갑니다.

## 관련 항목

- [PRTOS 4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [PRTOS 4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [PRTOS 2-11: Tracing/Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
- [8-01: 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)
