---
title: "1-08: Mutex 개념 — Ownership, Recursive, Priority Inheritance"
date: 2026-05-12T08:00:00
description: "공유 자원 보호의 정답. Owner tracking으로 PI 가능, recursive로 재진입 OK."
series: "Practical RTOS Internals"
seriesOrder: 8
tags: [mutex, ownership, recursive, priority-inheritance, mutual-exclusion]
draft: true
---

## 한 줄 요약

> **"Mutex = Mutual Exclusion + Owner"** — semaphore 위의 owner 추적이 차이의 모든 것.

## 왜 Mutex가 필요한가

```c
// 두 task가 같은 자원 (예: SPI bus) 접근
void task_a(void *arg) {
    while (1) {
        spi_write(buf_a, 64);   // 64 byte 전송 — 도중 preempt 시?
    }
}

void task_b(void *arg) {
    while (1) {
        spi_write(buf_b, 64);   // ← task_a 도중 끼어들면 데이터 섞임
    }
}
```

**Mutual Exclusion** 필요. 한 task의 SPI 트랜잭션이 *끝날 때까지* 다른 task 대기.

```c
SemaphoreHandle_t spi_mutex = xSemaphoreCreateMutex();

void task_a(void *arg) {
    while (1) {
        xSemaphoreTake(spi_mutex, portMAX_DELAY);
        spi_write(buf_a, 64);
        xSemaphoreGive(spi_mutex);
    }
}
```

## Mutex vs Semaphore — 본질적 차이

| | Mutex | Binary Semaphore |
| --- | --- | --- |
| **Counter** | 0 또는 1 | 0 또는 1 |
| **Owner 추적** | ✓ 누가 lock 했는지 기록 | ✗ |
| **Unlock 권한** | Owner만 | 누구나 |
| **Priority Inheritance** | ✓ 지원 | ✗ |
| **Recursive (nested lock)** | ✓ (option) | ✗ |
| **ISR에서** | ✗ (owner 없음) | ✓ (give만) |
| **사용 목적** | Mutual exclusion | Signal |

**핵심 — owner 추적**. Mutex는 *누가 잠갔는지* 안다. 이게 priority inheritance·recursive·unlock 권한의 토대.

## Owner 추적 — 내부 구조

```c
typedef struct {
    int locked;                     // 0=free, 1=locked
    Task_t *owner;                  // lock 보유 task
    int recursion_count;            // 같은 task의 재진입 횟수
    int original_priority;          // owner의 원래 priority (PI 시 복원용)
    List_t wait_list;
} Mutex_t;
```

`xSemaphoreGive()` 호출 시 — *호출 task = owner*인지 확인. 아니면 *error 또는 무시*.

## Recursive Mutex

같은 task가 *여러 번 lock 가능*. lock 횟수만큼 unlock 해야 풀림.

```c
SemaphoreHandle_t mtx = xSemaphoreCreateRecursiveMutex();

void inner(void) {
    xSemaphoreTakeRecursive(mtx, portMAX_DELAY);
    /* ... */
    xSemaphoreGiveRecursive(mtx);
}

void outer(void *arg) {
    xSemaphoreTakeRecursive(mtx, portMAX_DELAY);   // count=1
    inner();                                          // count=2 → 1
    xSemaphoreGiveRecursive(mtx);                    // count=0 → unlock
}
```

> 💡 Recursive mutex는 *코드 구조 나쁜 신호*. 가능하면 *비재귀*로 설계.

## Priority Inheritance — Mars Pathfinder

![Priority Inversion (without/with PI) timeline](/images/blog/practical-internals/diagrams/part1-08-priority-inversion.svg)

### 시나리오 (1997 NASA)

```text
T_high (priority 5) ←─ semaphore wait (T_low가 보유)
T_med  (priority 3) ←─ 실행 중 — T_low를 preempt
T_low  (priority 1) ←─ semaphore 보유, preempted

→ T_high가 *영원히 대기* (T_med이 끝나야 T_low 실행)
```

화성 탐사선이 *지속 reset* 했던 원인.

### 해결 — Priority Inheritance

Mutex 보유자가 *대기자의 priority 일시 상속*.

```text
T_high (priority 5) ←─ mutex wait → T_low의 priority를 5로 boost
T_low  (priority 5 임시) ←─ 실행 가능 → mutex 해제
T_high 진행
```

FreeRTOS — `configUSE_MUTEX_PI = 1` (default).

### 알고리즘

```c
void mutex_take(Mutex_t *m, TickType_t timeout) {
    portENTER_CRITICAL();
    if (m->locked == 0) {
        m->locked = 1;
        m->owner = current_task;
        m->original_priority = current_task->priority;
        portEXIT_CRITICAL();
        return;
    }
    // PI — owner의 priority를 자신과 같게 올림
    if (current_task->priority > m->owner->priority) {
        m->owner->priority = current_task->priority;
        rebalance_ready_lists(m->owner);
    }
    add_to_wait_list(m->wait_list, current_task);
    portEXIT_CRITICAL();
    block(timeout);
}

void mutex_give(Mutex_t *m) {
    portENTER_CRITICAL();
    if (current_task != m->owner) {
        portEXIT_CRITICAL();
        return ERROR_NOT_OWNER;
    }
    current_task->priority = m->original_priority;  // 복원
    if (!list_empty(m->wait_list)) {
        Task_t *next = pop_highest(m->wait_list);
        m->owner = next;
        m->original_priority = next->priority;
        wake(next);
    } else {
        m->locked = 0;
        m->owner = NULL;
    }
    portEXIT_CRITICAL();
}
```

## Priority Ceiling Protocol (PCP) — PI의 대안

각 mutex에 *priority ceiling* 정적 할당 — 그 mutex에 lock 가능한 *가장 높은 priority*.

```c
// Mutex의 ceiling = 5 (T_high의 priority)
T_low가 mutex lock 시 → 즉시 priority를 5로 boost
T_med (priority 3)은 *시작도 못 함*
```

장점 — *PI보다 단순*, *deadlock 방지*.
단점 — *priority 미리 알아야* (정적).

VxWorks·일부 RTOS 채택. FreeRTOS는 PI만.

## Deadlock — Mutex 사용의 어둠

### 예 — Lock Ordering 위반

```c
// Task A
xSemaphoreTake(mutex_X, ...);
xSemaphoreTake(mutex_Y, ...);

// Task B
xSemaphoreTake(mutex_Y, ...);
xSemaphoreTake(mutex_X, ...);

// A는 X 보유 후 Y 기다림, B는 Y 보유 후 X 기다림 → 영원
```

해결 — **항상 같은 순서로 lock**. *글로벌 lock order* 정해두고 모든 코드가 준수.

### Timeout 사용

```c
if (xSemaphoreTake(mtx, pdMS_TO_TICKS(100)) != pdTRUE) {
    log_warning("mutex timeout — possible deadlock");
    return ERROR;
}
```

`portMAX_DELAY` 대신 *유한 timeout* — deadlock 감지·복구.

## Mutex Hold Time — 짧게

```c
// 나쁨
xSemaphoreTake(mtx, portMAX_DELAY);
log_data();                          // 5 ms (printf 등)
xSemaphoreGive(mtx);

// 좋음 — 자원 접근만 protect
xSemaphoreTake(mtx, portMAX_DELAY);
data = shared_resource;
xSemaphoreGive(mtx);
log_data();                          // mutex 밖에서
```

Mutex hold time이 길수록 *other task가 대기*. **µs 단위 유지**.

## ISR에서 Mutex 사용 불가

```c
void some_ISR(void) {
    xSemaphoreTakeFromISR(mtx, ...);  // ✗ 컴파일 에러 또는 crash
}
```

ISR은 *owner가 될 task 없음* — mutex 의미 자체가 없음. ISR ↔ task signal엔 *semaphore* 사용.

## 자주 하는 실수

> ⚠️ Owner 확인 없이 give

Non-owner의 give 시도 → error. 코드 검토에서 *take/give 한 함수* 또는 *RAII pattern*.

> ⚠️ PI 비활성으로 critical 자원 보호

`configUSE_MUTEX_PI = 0`이면 Mars Pathfinder 재현 가능. *Default = enabled*.

> ⚠️ Recursive mutex 남용

비재귀 mutex로 충분한 코드를 recursive로. *재진입 필요한 진짜 경우*만.

> ⚠️ Mutex hold 중 long blocking call

다른 mutex take·queue receive (timeout=infinite) → cascading wait.

## 정리

- Mutex = **Mutual Exclusion + Owner**.
- Owner 추적이 **Priority Inheritance**의 토대.
- Recursive mutex는 *코드 구조 신호* — 가능하면 비재귀.
- Mars Pathfinder 사례 — PI 미적용 시 임베디드 사고.
- ISR에서 사용 불가 (owner 없음).
- Hold time 짧게, lock order 일관되게.

다음 편은 **큐와 메시지 패싱** — Producer-Consumer, Ring Buffer.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
