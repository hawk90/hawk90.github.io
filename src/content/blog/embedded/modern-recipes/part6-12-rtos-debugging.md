---
title: "6-12: RTOS 디버깅"
date: 2026-05-15T02:00:00
description: "Stack high-water mark, overflow hook, deadlock 탐지, heap 분석, trace 도구까지 RTOS 디버깅을 한 자리에 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 74
tags: [recipes, rtos, debugging]
---

## 한 줄 요약

> **"RTOS 디버깅은 *측정 인프라*입니다."** Stack high-water mark, overflow hook, heap stats, trace recorder 네 가지를 처음부터 켜두면 사고가 양산까지 가지 않습니다.

## 어떤 상황에서 쓰나

양산 도중 reset이 가끔 한 번씩 발생하는 펌웨어는 거의 대부분 stack overflow 또는 heap 고갈이 원인입니다. 재현이 어렵고 디버거가 attached 되지 않은 상태에서 일어나기 때문에 측정 인프라가 없으면 추정만 하다가 시간이 지나갑니다.

또 한 가지 흔한 상황은 jitter가 갑자기 튀는 경우입니다. 어떤 task가 어떤 lock을 얼마나 잡고 있었는지를 timeline으로 봐야 원인이 보입니다. Tracealyzer나 SystemView 같은 도구가 이 시점에 필요합니다.

## 핵심 개념

처음부터 켜두면 좋은 네 가지 인프라입니다.

1. **Stack high-water mark** — `uxTaskGetStackHighWaterMark`, 최대 사용량
2. **Overflow hook** — `vApplicationStackOverflowHook`, overflow 즉시 trap
3. **Heap stats** — `xPortGetFreeHeapSize`, `xPortGetMinimumEverFreeHeapSize`
4. **Trace recorder** — SystemView/Tracealyzer, task/ISR timeline

여기에 watchdog과 fault handler까지 더하면 양산 사고가 분석 가능한 형태로 남습니다.

```text
configCHECK_FOR_STACK_OVERFLOW  2  /* canary 방식 — 비싸지만 정확 */
configUSE_MALLOC_FAILED_HOOK    1
configUSE_TRACE_FACILITY        1
configGENERATE_RUN_TIME_STATS   1
```

이 옵션 네 줄이 RTOS 디버깅의 첫 출발점입니다.

## 코드 / 실제 사용 예

### Stack high-water mark 모니터링

```c
void task_monitor(void *arg) {
    char buf[256];
    for (;;) {
        TaskStatus_t info[16];
        UBaseType_t n = uxTaskGetSystemState(info, 16, NULL);

        for (UBaseType_t i = 0; i < n; i++) {
            uint32_t free_bytes = info[i].usStackHighWaterMark * sizeof(StackType_t);
            if (free_bytes < 128) {
                snprintf(buf, sizeof(buf), "STACK WARN: %s free=%u",
                         info[i].pcTaskName, (unsigned)free_bytes);
                log_warn(buf);
            }
        }
        vTaskDelay(pdMS_TO_TICKS(10000));
    }
}
```

10초마다 모든 task의 stack 여유를 확인하고, 임계 미만이면 경고를 남깁니다. 사고 전에 알아챌 수 있는 가장 단순한 인프라입니다.

### Overflow hook

```c
void vApplicationStackOverflowHook(TaskHandle_t t, char *name) {
    /* ISR context, scheduler suspended */
    panic_save_to_flash("stack overflow", name);
    NVIC_SystemReset();
}
```

`configCHECK_FOR_STACK_OVERFLOW = 2`이면 매 context switch마다 stack 끝의 canary(0xA5A5A5A5)를 확인하고 깨졌으면 hook을 부릅니다. 사고 직후 정보를 flash에 남기고 reset합니다.

### Heap 모니터링

```c
void vApplicationMallocFailedHook(void) {
    log_err("malloc failed: free=%u min=%u",
            (unsigned)xPortGetFreeHeapSize(),
            (unsigned)xPortGetMinimumEverFreeHeapSize());
    panic("heap exhausted");
}

void heap_log(void) {
    log_info("heap free=%u/%u min=%u",
             (unsigned)xPortGetFreeHeapSize(),
             configTOTAL_HEAP_SIZE,
             (unsigned)xPortGetMinimumEverFreeHeapSize());
}
```

`xPortGetMinimumEverFreeHeapSize`가 부팅 후 한 번이라도 도달한 최저값입니다. 양산 환경에서 이 값이 0에 가깝다면 heap을 키워야 합니다.

### Deadlock 감지

```c
/* mutex take에 timeout — 양산 코드 전반에 적용 */
if (xSemaphoreTake(m, pdMS_TO_TICKS(500)) != pdTRUE) {
    log_err("timeout on mtx %p — possible deadlock", m);
    dump_owners();
    return ERR_TIMEOUT;
}

/* 디버깅 빌드 — owner 기록 */
typedef struct { SemaphoreHandle_t m; TaskHandle_t owner; const char *file; int line; } dbg_mtx_t;
```

`portMAX_DELAY` 대신 timeout을 두면 deadlock이 reset 없이 detectable해집니다. 디버깅 빌드에서는 owner와 lock site를 기록합니다.

### Runtime stats

```c
/* configGENERATE_RUN_TIME_STATS = 1 */
char buf[512];
vTaskGetRunTimeStats(buf);
printf("%s", buf);
```

출력 예입니다.

| Task | Abs Time | % |
|---|---|---|
| idle | 12345670 | 85 |
| task_imu | 980000 | 6 |
| task_log | 450000 | 3 |
| timer | 12000 | <1 |

CPU 사용량이 task별로 표시됩니다. busy loop이 어디 있는지 즉시 보입니다.

### Trace recorder (SystemView)

```c
#include "SEGGER_SYSVIEW.h"

void task_x(void *arg) {
    for (;;) {
        SEGGER_SYSVIEW_RecordEnterISR();     /* 또는 task 단위 */
        do_work();
        SEGGER_SYSVIEW_RecordExitISR();
    }
}

/* PC로 J-Link RTT 또는 USB로 실시간 timeline 시각화 */
```

SystemView나 Tracealyzer는 task/ISR/lock 이벤트의 timeline을 시각화합니다. Jitter, priority inversion, lock contention을 그래프로 즉시 확인할 수 있습니다.

### Watchdog 통합

```c
TimerHandle_t wdt_kick;

void wdt_cb(TimerHandle_t t) {
    /* 모든 task의 heartbeat 확인 */
    if (all_tasks_alive()) IWDG->KR = 0xAAAA;   /* feed */
    else                   log_warn("starved task — wdt will reset");
}

void task_x(void *arg) {
    for (;;) {
        do_work();
        task_alive[TASK_X] = 1;
    }
}
```

Hardware watchdog을 software로 한 단계 감쌉니다. 어떤 task가 굶고 있는지를 reset 전에 기록할 수 있습니다.

## 측정 / 성능 비교

| 인프라 | overhead |
|---|---|
| configCHECK_FOR_STACK_OVERFLOW=1 (top of stack 검사) | 0.1 µs / switch |
| configCHECK_FOR_STACK_OVERFLOW=2 (canary) | 0.3 µs / switch |
| configGENERATE_RUN_TIME_STATS | 1 µs / switch (HW timer 1개 사용) |
| SystemView (RTT 모드) | 2 µs / event |
| Tracealyzer (J-Link 직접) | 0 µs (DAP로 RAM 직접 읽음) |

Canary 방식 stack 검사가 0.3 µs 정도 듭니다. 양산에서도 켜두는 편이 안전합니다.

```text
RAM 사용량
runtime stats                    ~16 B / task
trace recorder buffer            8~64 KB (옵션)
```

Trace recorder는 RAM이 크게 필요하므로 디버깅 빌드에만 켜는 경우가 많습니다.

## 자주 보는 함정

> 디버거에서만 잡으려 함

```text
"양산기에서 reset이 가끔 일어나요" → debugger 없이 분석 불가
```

Flash에 panic info를 남기는 인프라 없이는 reset 원인을 추정만 하게 됩니다. minimum panic record를 미리 만들어 둡니다.

> Heap fragmentation 무시

```c
xPortGetFreeHeapSize();        /* 16 KB free라고 안심 */
/* 실제로는 100 B 블록만 가능 — 1 KB malloc 실패 */
```

Heap_4는 fragmentation에 시달립니다. 가능하면 static API와 pool로 전환합니다.

> Stack을 너무 크게

```c
xTaskCreate(t, "t", 8192, NULL, 2, NULL);   /* 32 KB! */
```

여유 있게 잡으면 RAM이 빠르게 고갈됩니다. 측정 후 high-water mark + 20% 정도가 적정선입니다.

> Trace overhead를 무시한 측정

```c
SEGGER_SYSVIEW_OnTaskStartExec(t);    /* trace on */
measure_jitter();                      /* trace overhead 포함된 값 */
```

Trace recorder가 켜진 상태의 측정값은 production 값과 다릅니다. 양산 측정은 trace를 끄고 다시 합니다.

> Watchdog 없는 양산기

```c
/* IWDG 안 켜고 양산 */
```

Software 모든 사고는 watchdog이 마지막 안전망입니다. Hardware watchdog은 항상 활성화하고 적절한 timeout을 둡니다.

## 정리

- 네 가지 인프라(stack high-water, overflow hook, heap stats, trace)는 처음부터 켭니다.
- 양산 reset은 거의 항상 stack overflow나 heap 고갈입니다. 사전 모니터링이 답입니다.
- Mutex take에는 timeout을 두어 deadlock이 detectable하도록 만듭니다.
- Runtime stats는 CPU 사용량의 가장 단순한 측정 도구입니다.
- SystemView/Tracealyzer는 jitter와 priority inversion을 시각적으로 보여줍니다.
- Hardware watchdog과 panic-to-flash record가 양산 사고 분석의 기본 도구입니다.

다음 편부터 Part 7 **임베디드 Linux 부팅 흐름**으로 넘어갑니다.

## 관련 항목

- [PRTOS 4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [PRTOS 4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
- [PRTOS 2-11: Tracing/Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
- [8-01: 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)
