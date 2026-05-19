---
title: "3-10: Deadlock — 4 조건·Wait-for Graph·Lock Ordering·Timeout"
date: 2026-05-08T07:00:00
description: "Coffman 4 조건. Wait-for graph 분석. Lock ordering·timeout·hierarchical locking."
series: "Practical RTOS Internals"
seriesOrder: 31
tags: [deadlock, detection, avoidance, lock-ordering]
draft: true
---

## 한 줄 요약

> **"Deadlock = 4 조건 동시 성립"** — 그 중 *하나만 깨도* 회피 가능.

## Coffman 4 조건 (1971)

| 조건 | 의미 | 어떻게 깰까 |
|---|---|---|
| **Mutual Exclusion** | 자원이 *한 task만* 보유 | Mutex 대신 lock-free 사용 |
| **Hold and Wait** | 자원 보유 *중 다른 자원 요청* | Try-lock·atomic acquire |
| **No Preemption** | 강제 회수 불가 | Timeout·rollback |
| **Circular Wait** | A→B→C→A 순환 대기 | **Lock ordering** |

4 가지 *모두* 만족해야 deadlock. 하나라도 깨면 회피.

## 전형적 시나리오 — 2 Mutex 순환

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

Task1: A 보유, B 대기 / Task2: B 보유, A 대기 → 영원 정지.

## Wait-for Graph

```text
       T1 ──── waiting for ────→ T2
        ↑                          │
        │                       holds
       holds              waiting for
        │                          ↓
       mtx_A    ←── waiting for ── mtx_B
```

Graph에 *cycle 있음 = deadlock*. RTOS는 이 graph를 *컴파일 타임에 확인 불가* — 동적.

## 해결 1: Lock Ordering — 가장 흔함

**규칙** — 모든 mutex에 *전역 순서* 부여. 항상 *낮은 순서부터* take.

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

장점 — *컴파일 타임에 검증 가능* (도구·문서로). Linux kernel·DB 엔진 등에서 표준.

## 해결 2: Timeout (No Preemption 깨기)

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

*감지 + 복구*. 모든 lock acquisition에 *유한 timeout* — `portMAX_DELAY` 사용 자제.

## 해결 3: Try-Lock + Rollback (Hold and Wait 깨기)

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

또는 *all-or-nothing*:

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

## 해결 4: Hierarchical Locking (Linux lockdep)

각 lock에 *level*. 같은 level lock 동시 보유 금지. 다른 level은 *오름차순* 으로만.

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

*Runtime 검증*. Linux lockdep — 실제 deadlock 발생 전에 발견.

## Reader-Writer Lock Deadlock

```c
rwlock_t rw;

read_lock(&rw);
/* ... */
write_lock(&rw);   // ✗ Recursive read-then-write
```

같은 task가 *read lock 보유* 중 *write lock* 시도 → 자기 자신 wait → deadlock. 해결 — recursive variant 또는 lock upgrade API.

## ABA Variation — Priority Inversion 결합

```text
Low task L:  mtx 보유, M에 의해 선점
Med task M:  CPU 점유 (mtx 안 씀)
High task H: mtx 대기 → L 못 풀고 M이 CPU → unbounded wait
```

Deadlock 아니지만 *비슷한 효과*. **Priority Inheritance**로 해결 (3-05).

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

모든 task가 *blocked* 상태 + tick 진행 없음 → deadlock 의심.

### Static Analysis — Coverity·Klocwork

함수 호출 그래프 + lock acquire 순서 분석 → *lock order inconsistency* 경고.

### Runtime — Watchdog

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

Lock acquisition timeout + watchdog reset = *최후의 보루*.

## Livelock — Deadlock의 사촌

```c
while (try_take_all() == false) {
    release_all();
    vTaskDelay(1);   // 양보
}
```

Task A와 Task B가 *동시 release + retry* → 영원 retry. **Random backoff**:

```c
vTaskDelay(pdMS_TO_TICKS(rand() % 10));
```

## 자주 하는 실수

> ⚠️ `portMAX_DELAY` 남발

```c
xSemaphoreTake(mtx, portMAX_DELAY);   // ✗ deadlock 감지 불가
```

Production code엔 *유한 timeout*. Debug build에선 OK.

> ⚠️ Recursive lock 잘못

```c
xSemaphoreTake(mtx, ...);
/* ... */
xSemaphoreTake(mtx, ...);   // ✗ Self-deadlock (mutex 아닌 binary semaphore)
```

Recursive 필요 시 *recursive variant* 명시.

> ⚠️ ISR과 task 간 lock 공유

```c
xSemaphoreTake(mtx, ...);
some_isr_disable_func();
/* ISR 발생 → 같은 mtx 시도 → ✗ */
```

ISR ↔ task 동기화엔 *queue·event group·semaphore* (mutex 아님).

> ⚠️ Lock holder 중 long-blocking API

```c
xSemaphoreTake(mtx_A, ...);
xQueueReceive(q, &item, portMAX_DELAY);   // ✗ mtx_A 보유 중 무한 대기
```

*Lock hold time*은 짧게. Blocking call 전에 release.

## 정리

- Deadlock = **Coffman 4 조건 동시 성립**.
- **Lock ordering**이 가장 실용적 — 모든 lock에 전역 순서.
- **Timeout + rollback**으로 감지·복구.
- **Hierarchical lock**으로 runtime 검증.
- 모든 production lock에 *유한 timeout* + watchdog.

다음 part는 **Memory Management** — heap·stack·MPU.

## 관련 항목

- [3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
