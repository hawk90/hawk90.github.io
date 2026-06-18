---
title: "Deadlock 분석 — 4 조건·Wait-for Graph·Lock Ordering·Timeout"
date: 2026-05-06T09:31:00
description: "Coffman의 네 조건과 wait-for graph 분석, lock ordering, timeout, hierarchical locking을 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 31
tags: [deadlock, detection, avoidance, lock-ordering]
draft: false
---

## 한 줄 요약

> **"Deadlock은 네 조건이 동시에 성립할 때 발생합니다."** 그중 하나만 깨도 회피할 수 있습니다.

## Coffman의 네 조건 (1971)

| 조건 | 의미 | 어떻게 깰까 |
|---|---|---|
| **Mutual Exclusion** | 자원이 한 task만 보유 | Mutex 대신 lock-free 사용 |
| **Hold and Wait** | 자원 보유 중 다른 자원 요청 | Try-lock 또는 atomic acquire |
| **No Preemption** | 강제 회수 불가 | Timeout과 rollback |
| **Circular Wait** | A→B→C→A 순환 대기 | **Lock ordering** |

네 가지를 모두 만족할 때만 deadlock이 성립합니다. 하나라도 깨면 회피할 수 있습니다.

## 전형적 시나리오: 2 Mutex 순환

```c
SemaphoreHandle_t mtx_A, mtx_B;

void task1(void *p) {
    xSemaphoreTake(mtx_A, portMAX_DELAY);
    vTaskDelay(1);   // 짧은 지연
    xSemaphoreTake(mtx_B, portMAX_DELAY);   // ← Task2가 잡고 있으면 deadlock
    /* ... */
}

void task2(void *p) {
    xSemaphoreTake(mtx_B, portMAX_DELAY);
    vTaskDelay(1);
    xSemaphoreTake(mtx_A, portMAX_DELAY);   // ← Task1이 잡고 있으면 deadlock
}
```

Task1은 A를 잡은 채 B를 기다리고, Task2는 B를 잡은 채 A를 기다립니다. 두 task가 서로를 영원히 막아 시스템이 정지합니다.

## Wait-for Graph

```text
       T1 ──── waiting for ────→ T2
        ↑                          │
        │                       holds
       holds              waiting for
        │                          ↓
       mtx_A    ←── waiting for ── mtx_B
```

Graph에 cycle이 있으면 곧 deadlock입니다. RTOS는 이 graph가 동적으로 만들어지므로 컴파일 타임에 확인할 수 없습니다.

## 해결 1: Lock Ordering (가장 흔한 방법)

규칙은 간단합니다. 모든 mutex에 전역 순서를 부여하고, 항상 낮은 순서부터 take합니다.

```c
/* Convention — 알파벳/주소/ID 기준 */
#define MTX_ORDER_A  0
#define MTX_ORDER_B  1
#define MTX_ORDER_C  2

void any_task(void) {
    /* 항상 A → B → C 순서 */
    xSemaphoreTake(mtx_A, ...);
    xSemaphoreTake(mtx_B, ...);
    xSemaphoreTake(mtx_C, ...);
    /* ... */
    xSemaphoreGive(mtx_C);
    xSemaphoreGive(mtx_B);
    xSemaphoreGive(mtx_A);
}
```

이 방식의 장점은 컴파일 타임에 도구나 문서로 검증할 수 있다는 점입니다. Linux 커널이나 DB 엔진에서도 표준 관행입니다.

## 해결 2: Timeout으로 No Preemption 깨기

```c
if (xSemaphoreTake(mtx_A, pdMS_TO_TICKS(100)) != pdPASS) {
    log_warning("mtx_A acquire timeout — possible deadlock");
    return ERROR_TIMEOUT;
}
if (xSemaphoreTake(mtx_B, pdMS_TO_TICKS(100)) != pdPASS) {
    xSemaphoreGive(mtx_A);   // 보유 자원 release
    return ERROR_TIMEOUT;
}
```

감지와 복구를 한 번에 처리할 수 있습니다. 모든 lock acquisition에 유한 timeout을 지정하고, `portMAX_DELAY` 사용은 자제해야 합니다.

## 해결 3: Try-Lock과 Rollback으로 Hold and Wait 깨기

```c
if (!xSemaphoreTake(mtx_A, 0)) return EBUSY;
if (!xSemaphoreTake(mtx_B, 0)) {
    xSemaphoreGive(mtx_A);
    return EBUSY;
}
/* both acquired — work */
xSemaphoreGive(mtx_B);
xSemaphoreGive(mtx_A);
```

또는 all-or-nothing 패턴으로 작성합니다.

```c
bool try_acquire_all(void) {
    if (!xSemaphoreTake(mtx_A, 0)) return false;
    if (!xSemaphoreTake(mtx_B, 0)) {
        xSemaphoreGive(mtx_A);
        return false;
    }
    return true;
}

/* Retry pattern with backoff */
while (!try_acquire_all()) {
    vTaskDelay(pdMS_TO_TICKS(random_backoff()));
}
```

## 해결 4: Hierarchical Locking (Linux lockdep 방식)

각 lock에 level을 부여합니다. 같은 level의 lock을 동시에 보유할 수 없고, 다른 level은 오름차순으로만 잡을 수 있습니다.

```c
typedef struct {
    SemaphoreHandle_t sem;
    int level;
    const char *name;
} hier_mutex_t;

bool hier_take(hier_mutex_t *m, TickType_t timeout) {
    /* TLS 또는 TCB 확장에 현재 task의 보유 level set 보관 */
    for (each held lock h) {
        if (h.level >= m->level) {
            panic("Lock order violation: hold %s (L%d), taking %s (L%d)",
                  h.name, h.level, m->name, m->level);
        }
    }
    xSemaphoreTake(m->sem, timeout);
    record_held(m);
    return true;
}
```

Runtime에서 lock 순서를 검증하는 방식입니다. Linux lockdep이 이 기법으로 실제 deadlock이 발생하기 전에 위반을 잡아냅니다.

## Reader-Writer Lock Deadlock

```c
rwlock_t rw;

read_lock(&rw);
/* ... */
write_lock(&rw);   // ✗ Recursive read-then-write
```

같은 task가 read lock을 보유한 상태에서 write lock을 요청하면 자기 자신을 기다리는 deadlock에 빠집니다. recursive variant나 lock upgrade API로 해결합니다.

## ABA 변형: Priority Inversion 결합

```text
Low task L:  mtx 보유, M에 의해 선점
Med task M:  CPU 점유 (mtx 안 씀)
High task H: mtx 대기 → L 못 풀고 M이 CPU → unbounded wait
```

엄밀히 deadlock은 아니지만 효과는 비슷합니다. Priority Inheritance로 해결합니다 (3-05 참고).

## 검출 도구

### FreeRTOS Trace + Sysview (Segger)

```c
/* configUSE_TRACE_FACILITY = 1 */
TaskStatus_t arr[20];
uxTaskGetSystemState(arr, 20, NULL);

for (int i = 0; i < N; i++) {
    if (arr[i].eCurrentState == eBlocked) {
        printf("Task %s blocked on %p\n",
               arr[i].pcTaskName, arr[i].xEventListItem);
    }
}
```

모든 task가 blocked 상태이고 tick도 진행되지 않으면 deadlock을 의심합니다.

### Static Analysis (Coverity, Klocwork)

함수 호출 그래프와 lock acquire 순서를 함께 분석해 lock order inconsistency를 경고합니다.

### Runtime Watchdog

```c
void wd_task(void *p) {
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(1000));
        if (system_alive_flag == 0) {
            log_panic("Possible deadlock — resetting");
            HAL_NVIC_SystemReset();
        }
        system_alive_flag = 0;
    }
}

void main_task(void *p) {
    for (;;) {
        do_work();
        system_alive_flag = 1;
    }
}
```

Lock acquisition timeout과 watchdog reset의 조합은 최후의 보루입니다.

## Livelock: Deadlock의 사촌

```c
while (try_take_all() == false) {
    release_all();
    vTaskDelay(1);   // 양보
}
```

Task A와 Task B가 동시에 release하고 다시 retry하는 패턴이 반복되면 영원히 진전이 없습니다. random backoff로 해결합니다.

```c
vTaskDelay(pdMS_TO_TICKS(rand() % 10));
```

## 자주 하는 실수

> ⚠️ `portMAX_DELAY`를 남용하는 경우

```c
xSemaphoreTake(mtx, portMAX_DELAY);   // ✗ deadlock 감지 불가
```

Production code에는 반드시 유한한 timeout을 지정해야 합니다. Debug build에서만 무한 대기를 허용합니다.

> ⚠️ Recursive lock을 잘못 사용하는 경우

```c
xSemaphoreTake(mtx, ...);
/* ... */
xSemaphoreTake(mtx, ...);   // ✗ Self-deadlock (mutex 아닌 binary semaphore)
```

같은 task가 mutex를 두 번 잡는 패턴이 필요하면 recursive variant를 명시적으로 사용해야 합니다.

> ⚠️ ISR과 task가 lock을 공유하는 경우

```c
xSemaphoreTake(mtx, ...);
some_isr_disable_func();
/* ISR 발생 → 같은 mtx 시도 → ✗ */
```

ISR과 task 간 동기화에는 mutex가 아니라 queue, event group, semaphore를 사용합니다.

> ⚠️ Lock 보유 중 long-blocking API를 호출하는 경우

```c
xSemaphoreTake(mtx_A, ...);
xQueueReceive(q, &item, portMAX_DELAY);   // ✗ mtx_A 보유 중 무한 대기
```

Lock hold time은 짧게 유지하고, blocking call 전에는 반드시 release합니다.

## 정리

- Deadlock은 Coffman의 네 조건이 동시에 성립할 때 발생합니다.
- Lock ordering이 가장 실용적인 해결책이며 모든 lock에 전역 순서를 부여합니다.
- Timeout과 rollback으로 감지하고 복구할 수 있습니다.
- Hierarchical lock으로 runtime에 lock 순서를 검증할 수 있습니다.
- 모든 production lock에는 유한 timeout과 watchdog을 함께 두어야 합니다.

다음 part에서는 memory management를 다룹니다. heap, stack, MPU 순서로 살펴봅니다.

## 관련 항목

- [3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
