---
title: "4-04: Static Allocation — 컴파일 타임 결정·MISRA·DO-178C 표준"
date: 2026-05-19T16:00:00
description: "모든 메모리 컴파일 타임 fixed. FreeRTOS *Static API. Linker section. Safety-critical 표준."
series: "Practical RTOS Internals"
seriesOrder: 36
tags: [static, deterministic, misra, do-178c, linker]
draft: true
---

## 한 줄 요약

> **"Static = 컴파일 타임에 모든 메모리 결정"** — Safety-critical의 *황금 표준*.

## 왜 Static인가

- **WCET 보장** — alloc 시간 0
- **Fragmentation 0** — 동적 할당 없음
- **Out-of-memory 0** — 컴파일 타임에 사이즈 검증
- **Memory footprint 분석 간편** — `.map` 파일이 정확
- **MISRA·DO-178C 호환** — Dir 4.12·Level A·B

자동차 ECU·항공기·LV — *거의 모두 static*.

## FreeRTOS *Static API

```c
/* Task */
static StaticTask_t task_tcb;
static StackType_t task_stack[2048];

TaskHandle_t h = xTaskCreateStatic(
    task_function, "name", 2048,
    pvParameters, priority,
    task_stack, &task_tcb);

/* Queue */
static StaticQueue_t q_buf;
static uint8_t q_storage[10 * sizeof(int)];

QueueHandle_t q = xQueueCreateStatic(10, sizeof(int), q_storage, &q_buf);

/* Semaphore */
static StaticSemaphore_t sem_buf;
SemaphoreHandle_t s = xSemaphoreCreateBinaryStatic(&sem_buf);

/* Timer */
static StaticTimer_t timer_buf;
TimerHandle_t t = xTimerCreateStatic(
    "name", period, autoreload,
    timer_id, callback, &timer_buf);

/* Event group */
static StaticEventGroup_t eg_buf;
EventGroupHandle_t eg = xEventGroupCreateStatic(&eg_buf);
```

모든 RTOS API의 `*Static` variant — *heap 안 씀*.

```c
#define configSUPPORT_DYNAMIC_ALLOCATION  0
#define configSUPPORT_STATIC_ALLOCATION   1
```

→ heap 함수 *link 자체 안 됨* — *malloc 호출 시 link error*.

## Application-Provided Memory Hook

`configSUPPORT_STATIC_ALLOCATION=1`이면 *idle task·timer task* 용 buffer를 application이 제공:

```c
StaticTask_t *idle_tcb;
StackType_t *idle_stack[configMINIMAL_STACK_SIZE];

void vApplicationGetIdleTaskMemory(
    StaticTask_t **ppxIdleTaskTCBBuffer,
    StackType_t **ppxIdleTaskStackBuffer,
    uint32_t *pulIdleTaskStackSize) {
    static StaticTask_t tcb;
    static StackType_t stack[configMINIMAL_STACK_SIZE];
    *ppxIdleTaskTCBBuffer = &tcb;
    *ppxIdleTaskStackBuffer = stack;
    *pulIdleTaskStackSize = configMINIMAL_STACK_SIZE;
}

/* Timer task — configUSE_TIMERS=1 시 */
void vApplicationGetTimerTaskMemory(...) { /* similar */ }
```

## Linker Section 분리

```c
__attribute__((section(".dtcm")))   StaticTask_t critical_tcb;
__attribute__((section(".dtcm")))   StackType_t critical_stack[1024];
__attribute__((section(".sdram")))  uint8_t buffer[1024 * 1024];
__attribute__((section(".sram")))   StaticTask_t normal_tcb;
```

빠른 stack → TCM, 큰 buffer → external SDRAM.

```text
Linker script (.ld):
SECTIONS {
    .dtcm (NOLOAD) : { *(.dtcm) } > DTCM
    .sdram (NOLOAD) : { *(.sdram) } > SDRAM
}
```

## 메모리 footprint 분석

```bash
arm-none-eabi-size firmware.elf
   text    data     bss     dec     hex filename
  98432    1024  131072  230528   38480 firmware.elf

# Detailed
arm-none-eabi-nm --size-sort firmware.elf | tail -20
```

`.map` 파일에서 *각 객체 정확한 위치·크기*.

## Stack Size 계산

```c
/* GCC -fstack-usage */
gcc -fstack-usage source.c
# → source.su 파일 — 각 함수 stack 사용량
```

수동 계산:

```text
Function stack usage analysis:
  task_entry:        128 byte
    process():       256 byte
      compute():     512 byte
      handle():      192 byte
    log():           64 byte
  
Worst path: task_entry → process → compute = 128+256+512 = 896 byte
+ ISR worst case: 64 byte
+ Margin: 128 byte
Total stack: 1088 byte → round up to 2048
```

Cortex-M7 `lldb`·OpenOCD에서 *stack watermark* 측정:

```c
UBaseType_t high_water = uxTaskGetStackHighWaterMark(task);
/* high_water = *남은 stack 최소량* */
```

## Stack Overflow 검출

```c
#define configCHECK_FOR_STACK_OVERFLOW 2   /* method 2 — canary check */

void vApplicationStackOverflowHook(TaskHandle_t task, char *name) {
    log_critical("Stack overflow: %s", name);
    while(1);
}
```

Method 2 — stack canary pattern. Method 1 — top-of-stack 검사 (cheaper). 양산 빌드도 *최소 method 1* 권장.

## C++ Static Object

```cpp
class SensorTask {
public:
    void run() { /* ... */ }
private:
    int state_;
};

static SensorTask sensor;
static StaticTask_t sensor_tcb;
static StackType_t sensor_stack[2048];

extern "C" void task_entry(void *p) {
    static_cast<SensorTask*>(p)->run();
}

void create_task(void) {
    xTaskCreateStatic(task_entry, "sensor", 2048,
                       &sensor, 5, sensor_stack, &sensor_tcb);
}
```

전역 C++ 객체 — *constructor* 부팅 시 호출. Embedded `_init_array`.

## Zero-Init·BSS

```c
static uint8_t buffer[1024];      /* BSS — 자동 0 초기화 */
static uint8_t buffer2[1024] = {0};   /* 동일 */

const uint8_t lut[256] = {/* init */};   /* .rodata, Flash */
```

BSS는 *부팅 시* `_start` 또는 `Reset_Handler`에서 0으로 채워짐. Init data는 *Flash → RAM copy*.

## Static Variant 누락 — Heap Fallback

```c
xTaskCreate(...)   /* ← *dynamic* — heap 사용 */
xTaskCreateStatic(...)   /* ← static — heap 안 씀 */
```

`configSUPPORT_DYNAMIC_ALLOCATION=0`이면 *dynamic 함수 자체 정의 안 됨* → 사용 시 link error.

## MISRA·DO-178C 호환

```text
MISRA C:2012 Dir 4.12:
  "Dynamic memory allocation shall not be used"

DO-178C Level A:
  "Dynamic memory allocation in flight software shall be avoided
   unless thoroughly justified and analyzed"

ASIL-D (ISO 26262):
  "Dynamic memory allocation should be avoided in safety-critical paths"
```

Static-only — *모든 표준 만족*.

## 자동차 ECU 사례

```c
/* Brake ECU — fully static */
static StaticTask_t brake_tcb, sensor_tcb, comm_tcb;
static StackType_t brake_stack[2048], sensor_stack[1024], comm_stack[1024];

static StaticQueue_t cmd_q_buf;
static uint8_t cmd_q_storage[16 * sizeof(brake_cmd_t)];

static StaticSemaphore_t data_mtx_buf;

int main(void) {
    /* 모든 RTOS 객체 static 생성 */
    xTaskCreateStatic(brake_task, ..., brake_stack, &brake_tcb);
    /* ... */
    vTaskStartScheduler();
}
```

부팅 후 *malloc 호출 0*. `.map` 파일이 *모든 RAM 사용처* 명시.

## 자주 하는 실수

> ⚠️ Stack size 추정

```c
#define STACK_SIZE 512   /* 적당히 추측 */
```

→ `-fstack-usage` + watermark 측정.

> ⚠️ Dynamic API 혼용

```c
xTaskCreate(task_a, ...);   /* dynamic */
xTaskCreateStatic(task_b, ..., ..., ...);   /* static */
```

→ 한 시스템 *일관**. 보통 *all static*.

> ⚠️ Static stack 초기화

```c
static StackType_t stack[1024];   /* BSS — 0 init */
xTaskCreateStatic(..., stack, ...);
```

OK — RTOS가 *task entry 시 init*. 별도 fill 불필요.

> ⚠️ Const data를 RAM에

```c
const uint8_t large_lut[1024 * 1024];   /* ← const, .rodata로 Flash */
```

`const` + `static` — Flash 보관. RAM 절약.

## 정리

- Static = **컴파일 타임 결정** — WCET·fragmentation 보장.
- FreeRTOS `*Static` API + `configSUPPORT_DYNAMIC_ALLOCATION=0`.
- **Linker section**으로 TCM/SRAM/SDRAM 분리.
- Stack 측정 — `-fstack-usage` + `uxTaskGetStackHighWaterMark`.
- MISRA·DO-178C·ASIL-D — *static-only 권장*.
- 자동차·항공 — *fully static* 표준.

다음 편은 **Memory Pool**.

## 관련 항목

- [4-03: TLSF](/blog/embedded/rtos/practical-internals/part4-03-tlsf)
- [4-05: Memory Pool](/blog/embedded/rtos/practical-internals/part4-05-memory-pool)
