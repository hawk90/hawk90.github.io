---
title: "Static Allocation — 컴파일 타임으로 동적 위험 제거하기"
date: 2026-05-07T09:36:00
description: "모든 RTOS 객체를 컴파일 타임에 fixed로 두는 패턴입니다. FreeRTOS Static API, Zephyr 매크로, linker section 배치, MISRA/DO-178C 호환성까지 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 36
tags: [static, deterministic, misra, do-178c, linker]
---

## 한 줄 요약

> **"Static allocation은 컴파일 타임에 모든 메모리를 결정합니다."** — safety-critical의 *황금 표준*입니다.

## 어떤 문제를 푸는가

지금까지 본 [heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)와 [TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)는 *어떻게 더 잘 alloc할 것인가*에 대한 답이었습니다. 하지만 자동차 ECU나 항공기 비행 제어처럼 *동적 할당 자체를 금지*하는 도메인이 있습니다.

이유는 단순합니다. 동적 할당은 *실패할 수 있고*, *변동 시간을 갖고*, *fragmentation 누적 위험이 있고*, *분석이 어렵습니다*. safety-critical 인증은 이 모든 항목을 *증명*해야 합니다. 차라리 동적 할당을 완전히 빼면 증명할 항목 자체가 사라집니다.

MISRA C:2012 Dir 4.12, DO-178C Level A/B, ISO 26262 ASIL-D 모두 *dynamic allocation 회피*를 명시합니다. KSLV-II 누리호 비행 컴퓨터, BMW iX ECU, Boeing 787 일부 모듈이 *malloc 한 호출도 없는* 시스템으로 출하됩니다. 이번 편은 그 패턴을 정리합니다.

## FreeRTOS Static API

FreeRTOS는 *거의 모든 객체 생성 API에 `*Static` variant*를 제공합니다. 사용자가 storage buffer와 control block buffer를 직접 제공하고, RTOS는 그 자리에 *placement-new* 형태로 객체를 구성합니다.

```c
/* Task */
static StaticTask_t sensor_tcb;
static StackType_t  sensor_stack[2048];

TaskHandle_t h = xTaskCreateStatic(
    sensor_task_fn,             /* entry */
    "sensor",                   /* name */
    2048,                       /* stack depth in words */
    NULL,                       /* parameter */
    5,                          /* priority */
    sensor_stack,               /* stack buffer */
    &sensor_tcb);               /* TCB buffer */

/* Queue */
static StaticQueue_t cmd_q_buf;
static uint8_t       cmd_q_storage[10 * sizeof(cmd_t)];
QueueHandle_t q = xQueueCreateStatic(10, sizeof(cmd_t),
                                     cmd_q_storage, &cmd_q_buf);

/* Semaphore */
static StaticSemaphore_t data_sem_buf;
SemaphoreHandle_t s = xSemaphoreCreateBinaryStatic(&data_sem_buf);

/* Mutex */
static StaticSemaphore_t bus_mtx_buf;
SemaphoreHandle_t m = xSemaphoreCreateMutexStatic(&bus_mtx_buf);

/* Software Timer */
static StaticTimer_t timer_buf;
TimerHandle_t t = xTimerCreateStatic("hb", pdMS_TO_TICKS(100),
                                     pdTRUE, NULL, hb_cb, &timer_buf);

/* Event group */
static StaticEventGroup_t eg_buf;
EventGroupHandle_t eg = xEventGroupCreateStatic(&eg_buf);
```

모든 storage가 *BSS 또는 data section*에 들어갑니다. heap은 *한 byte도 안 씁니다*. 빌드 시 `arm-none-eabi-size` 출력만 봐도 *최종 RAM 사용량이 결정*되어 있습니다.

```c
#define configSUPPORT_DYNAMIC_ALLOCATION  0
#define configSUPPORT_STATIC_ALLOCATION   1
```

`configSUPPORT_DYNAMIC_ALLOCATION = 0`으로 두면 `pvPortMalloc` 자체가 *링크되지 않습니다*. 누군가 실수로 `xTaskCreate`(static 아닌 버전)를 호출하면 *link error*가 즉시 발생합니다. 컴파일 단계에서 *동적 할당이 한 곳도 없음*을 보장하는 셈입니다.

## Application-Provided 메모리 훅

`configSUPPORT_STATIC_ALLOCATION = 1`이면 idle task와 timer task를 *application이 직접 제공한 buffer*에 만들어야 합니다. FreeRTOS는 두 개의 weak 함수를 정의하지 않으므로 사용자가 채워 줍니다.

```c
void vApplicationGetIdleTaskMemory(
        StaticTask_t **ppxTCB,
        StackType_t  **ppxStack,
        uint32_t      *pulStackSize) {
    static StaticTask_t tcb;
    static StackType_t  stack[configMINIMAL_STACK_SIZE];
    *ppxTCB       = &tcb;
    *ppxStack     = stack;
    *pulStackSize = configMINIMAL_STACK_SIZE;
}

void vApplicationGetTimerTaskMemory(
        StaticTask_t **ppxTCB,
        StackType_t  **ppxStack,
        uint32_t      *pulStackSize) {
    static StaticTask_t tcb;
    static StackType_t  stack[configTIMER_TASK_STACK_DEPTH];
    *ppxTCB       = &tcb;
    *ppxStack     = stack;
    *pulStackSize = configTIMER_TASK_STACK_DEPTH;
}
```

두 훅을 정의하지 않으면 link error로 잡혀 *부팅 자체가 안 됩니다*. 동적 할당을 완전히 끊었다는 증거가 빌드 단계에서 확보됩니다.

## Zephyr 매크로 패턴

Zephyr RTOS는 같은 사상을 *매크로*로 더 깔끔하게 표현합니다.

```c
K_THREAD_DEFINE(sensor_tid, 2048,
                sensor_thread_fn, NULL, NULL, NULL,
                5, 0, 0);

K_SEM_DEFINE(data_sem, 0, 1);

K_MUTEX_DEFINE(bus_mtx);

K_MSGQ_DEFINE(cmd_q, sizeof(cmd_t), 10, 4);

K_TIMER_DEFINE(heartbeat, hb_handler, NULL);
```

이 매크로들은 *컴파일 타임에 객체와 storage를 정의*하고 *부팅 시 자동 초기화 테이블*에 등록합니다. application 코드에는 `xTaskCreateStatic` 호출조차 없습니다. 모두 *link time에 결정*됩니다.

## Linker Section으로 메모리 영역 분리

STM32H7이나 i.MX RT처럼 *DTCM, SRAM, 외부 SDRAM*이 함께 있는 SoC에서는 *어떤 객체를 어디에 둘지*를 직접 지정합니다.

```c
__attribute__((section(".dtcm")))  static StaticTask_t  critical_tcb;
__attribute__((section(".dtcm")))  static StackType_t   critical_stack[1024];
__attribute__((section(".sdram"))) static uint8_t       frame_buffer[1024 * 1024];
__attribute__((section(".sram")))  static StaticQueue_t cmd_q_buf;
```

빠른 응답이 필요한 control task의 stack은 *DTCM(0-wait)*으로, 큰 frame buffer는 *외부 SDRAM*으로 보냅니다. linker script가 이 section을 메모리 영역에 매핑합니다.

```text
/* device.ld */
SECTIONS
{
    .dtcm  (NOLOAD) : { *(.dtcm)  } > DTCM
    .sram  (NOLOAD) : { *(.sram)  } > SRAM
    .sdram (NOLOAD) : { *(.sdram) } > SDRAM
}
```

`NOLOAD`로 잡으면 *image에는 안 들어가고* 부팅 시에만 BSS처럼 0으로 채워집니다. 메모리 배치가 *컴파일·링크 시점에 완전히 결정*됩니다.

## 메모리 footprint 분석

부팅 후의 RAM 사용량을 *빌드 산출물에서 직접* 읽을 수 있다는 것이 static allocation의 큰 장점입니다.

```bash
$ arm-none-eabi-size firmware.elf
   text    data     bss     dec     hex filename
  98432    1024  131072  230528   38480 firmware.elf

$ arm-none-eabi-nm --size-sort firmware.elf | tail -20
20000400 00000800 b sensor_stack
20000c00 00000800 b control_stack
20001400 00000400 b cmd_q_storage
...
```

`.map` 파일을 보면 *모든 static 객체의 정확한 주소와 크기*가 적혀 있습니다. 메모리 회계가 *완전히 닫혀* 있습니다. 동적 할당이 있으면 *런타임 누적 결과를 측정*해야만 알 수 있는 정보입니다.

## Stack Size 계산 — `-fstack-usage`

각 task의 stack 크기는 *추측이 아니라 계산*으로 정합니다. GCC의 `-fstack-usage` 옵션이 함수별 stack 사용량을 파일로 떨어뜨립니다.

```bash
$ gcc -fstack-usage -c source.c
$ cat source.su
source.c:42:6:task_entry    128  static
source.c:55:6:process       256  static
source.c:78:6:compute       512  static
source.c:92:6:log_event      64  static
```

call graph를 따라 *worst path*를 합산합니다.

| 항목 | Byte |
|---|---|
| `task_entry(128) → process(256) → compute(512)` | 896 |
| ISR worst case stack | +64 |
| context switch overhead | +64 |
| safety margin (25%) | +256 |
| **total** | 1280 → round up to 2048 |

운영 중에는 `uxTaskGetStackHighWaterMark`로 *실제 최대 사용량*을 측정합니다. 정적 분석값과 실측값이 *2배 이상 차이*나면 둘 중 하나가 틀린 것이므로 재검토합니다.

```c
UBaseType_t high_water = uxTaskGetStackHighWaterMark(task);
/* high_water = 남아 있던 가장 작은 stack word 수 */
```

## C++ 객체의 static 할당

C++ 전역 객체는 *컴파일 타임에 storage가 잡히고*, *부팅 시 constructor*가 호출됩니다. embedded toolchain은 `_init_array`에 constructor 포인터를 모아 두고 `Reset_Handler`가 순차 호출합니다.

```cpp
class SensorController {
public:
    void run();
private:
    int state_;
    Filter filter_;
};

/* 전역 — BSS + constructor */
static SensorController controller;

static StaticTask_t  task_tcb;
static StackType_t   task_stack[2048];

extern "C" void task_entry(void *p) {
    static_cast<SensorController*>(p)->run();
}

int main() {
    xTaskCreateStatic(task_entry, "ctrl", 2048,
                      &controller, 5, task_stack, &task_tcb);
    vTaskStartScheduler();
}
```

`static` 또는 namespace-level 객체는 모두 *static allocation*입니다. 런타임에 `new`를 호출하지 않는 한 heap은 깨끗합니다.

## 안전 표준과의 정합성

- **MISRA C:2012 Dir 4.12** — "Dynamic memory allocation shall not be used."
- **DO-178C Level A/B** — "Dynamic memory allocation in flight software shall be avoided unless thoroughly justified, analyzed, and verified."
- **ISO 26262 ASIL-D** — "Dynamic memory allocation should be avoided in safety-critical execution paths."
- **CERT C MEM30-C, MEM31-C, MEM34-C** — "Various memory management rules that static allocation makes trivially satisfied."

static allocation은 이 모든 규칙을 *공짜로 만족*시킵니다. 동적 할당을 써서 같은 규칙을 만족시키려면 WCET 분석, fragmentation 증명, OOM 경로 검증, robustness testing이 모두 필요합니다. 비용 차이는 *수십 인-월*이 됩니다.

## 자동차 ECU 사례

```c
/* Brake controller — fully static */
static StaticTask_t brake_tcb, sensor_tcb, comm_tcb;
static StackType_t  brake_stack[2048], sensor_stack[1024], comm_stack[1024];

static StaticQueue_t   cmd_q_buf;
static uint8_t         cmd_q_storage[16 * sizeof(brake_cmd_t)];

static StaticSemaphore_t data_mtx_buf;
static StaticEventGroup_t status_eg_buf;

int main(void) {
    /* 전부 static — heap 호출 0회 */
    xTaskCreateStatic(brake_task,  "brake",  2048, NULL, 6,
                      brake_stack,  &brake_tcb);
    xTaskCreateStatic(sensor_task, "sensor", 1024, NULL, 5,
                      sensor_stack, &sensor_tcb);
    xTaskCreateStatic(comm_task,   "comm",   1024, NULL, 4,
                      comm_stack,   &comm_tcb);

    vTaskStartScheduler();
    for (;;);   /* unreachable */
}
```

`arm-none-eabi-nm` 결과가 *모든 RAM 사용처를 망라*합니다. 메모리 인증 문서에 그 표를 그대로 첨부할 수 있습니다.

## 정적 할당의 한계

만능은 아닙니다. *peak 메모리가 항상 점유*된다는 단점이 있습니다. 한 task가 가끔만 큰 buffer를 쓰더라도 *항상 그 크기를 잡고* 있어야 합니다. 평균 사용량과 peak 사용량의 비율이 *수십 배 차이*나는 시스템에서는 static이 비효율적입니다.

이 경계가 모호한 경우 *static 기반 + 작은 memory pool*로 절충합니다. RTOS 객체와 task stack은 static으로 두고, 동적 buffer는 [4-05의 fixed-size pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)로 처리합니다. pool도 본질적으로는 *컴파일 타임에 잡힌 storage* 위에서 도므로 정적 분석이 가능합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Stack size를 감으로 정함

`xTaskCreateStatic(..., 512, ...)` 같이 적당한 숫자를 던지면 *언젠가 overflow*합니다. `-fstack-usage` + watermark 측정을 *모든 task에* 적용합니다. 4-06편에서 더 자세히 다룹니다.

> ⚠️ static과 dynamic API 혼용

한 시스템에 `xTaskCreate`와 `xTaskCreateStatic`이 섞이면 *heap 사용 0*이라는 보장이 깨집니다. `configSUPPORT_DYNAMIC_ALLOCATION = 0`으로 *링크 단계에서 차단*하는 것이 안전합니다.

> ⚠️ const 데이터를 RAM에

```c
const uint8_t lookup_table[1024 * 1024] = { ... };
```

`const`인데 BSS에 들어가면 RAM 1 MB를 낭비합니다. linker가 `.rodata`로 보내는지 확인하고, 안 그러면 `__attribute__((section(".rodata.lut")))`를 명시합니다. Flash로 가야 정상입니다.

> ⚠️ 전역 객체 초기화 순서 가정

C++ 전역 객체의 *생성 순서*는 translation unit 사이에서 *정의되지 않습니다*. task가 시작되기 전에 의존 객체가 준비되어 있는지 보장이 필요합니다. 의심스러우면 `main()` 안에서 explicit init 함수를 호출합니다.

## 정리

- Static allocation은 *모든 RTOS 객체를 컴파일 타임에 결정*하여 동적 할당의 위험을 원천적으로 제거합니다.
- FreeRTOS는 *거의 모든 객체*에 `*Static` API를 제공하며, `configSUPPORT_DYNAMIC_ALLOCATION = 0`으로 *링크 단계 차단*이 가능합니다.
- Zephyr는 `K_THREAD_DEFINE` 같은 매크로로 같은 결과를 *더 간결하게* 표현합니다.
- linker section과 `__attribute__((section()))`로 *DTCM·SRAM·SDRAM을 명시 배치*할 수 있습니다.
- stack 크기는 `-fstack-usage` 정적 분석과 `uxTaskGetStackHighWaterMark` 실측으로 *둘 다 검증*합니다.
- MISRA, DO-178C, ASIL-D 등 *주요 안전 표준 요구를 공짜로 충족*합니다.
- 평균 대비 peak가 큰 워크로드는 *static + 작은 pool* 절충이 합리적입니다.

다음 편은 [4-05 Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)에서 *fixed-size block allocator*를 다룹니다.

## 관련 항목

- [4-01: 실시간 메모리 요구사항](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)
- [4-02: FreeRTOS Heap_1~5](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [4-03: TLSF — O(1) bounded allocator](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
