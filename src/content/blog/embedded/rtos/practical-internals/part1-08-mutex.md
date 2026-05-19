---
title: "1-08: Mutex 개념 — Ownership, Recursive, Priority Inheritance"
date: 2026-05-07T08:00:00
description: "공유 자원 보호의 정답입니다. Owner tracking 덕에 PI가 가능하고, recursive로 재진입도 허용합니다."
series: "Practical RTOS Internals"
seriesOrder: 8
tags: [mutex, ownership, recursive, priority-inheritance, mutual-exclusion]
draft: false
---

## 한 줄 요약

> **"Mutex = Mutual Exclusion + Owner"** — semaphore 위에 얹힌 owner 추적이 차이의 전부입니다.

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

**Mutual Exclusion**이 필요합니다. 한 task의 SPI 트랜잭션이 끝날 때까지 다른 task는 대기해야 합니다.

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

**핵심은 owner 추적**입니다. Mutex는 누가 잠갔는지 압니다. 이 정보가 priority inheritance, recursive, unlock 권한의 토대가 됩니다.

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

`xSemaphoreGive()` 호출 시 호출 task가 owner인지 확인합니다. 아니면 error를 내거나 무시합니다.

## Recursive Mutex

같은 task가 여러 번 lock 할 수 있습니다. lock한 횟수만큼 unlock 해야 풀립니다.

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

> 💡 Recursive mutex는 코드 구조가 나쁘다는 신호일 때가 많습니다. 가능하면 비재귀로 설계하는 것이 좋습니다.

## Priority Inheritance — Mars Pathfinder

![Priority Inversion (without/with PI) timeline](/images/blog/practical-internals/diagrams/part1-08-priority-inversion.svg)

### 시나리오 (1997 NASA)

```text
T_high (priority 5) ←─ semaphore wait (T_low가 보유)
T_med  (priority 3) ←─ 실행 중 — T_low를 preempt
T_low  (priority 1) ←─ semaphore 보유, preempted

→ T_high가 *영원히 대기* (T_med이 끝나야 T_low 실행)
```

화성 탐사선이 지속적으로 reset 됐던 원인이 바로 이것이었습니다.

### 해결 — Priority Inheritance

Mutex 보유자가 대기자의 priority를 일시적으로 상속받습니다.

```text
T_high (priority 5) ←─ mutex wait → T_low의 priority를 5로 boost
T_low  (priority 5 임시) ←─ 실행 가능 → mutex 해제
T_high 진행
```

FreeRTOS에서는 `configUSE_MUTEX_PI = 1`이 기본값입니다.

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

각 mutex에 priority ceiling을 정적으로 할당합니다. 이 값은 해당 mutex를 lock 할 수 있는 가장 높은 priority입니다.

```c
// Mutex의 ceiling = 5 (T_high의 priority)
T_low가 mutex lock 시 → 즉시 priority를 5로 boost
T_med (priority 3)은 *시작도 못 함*
```

장점은 PI보다 단순하고 deadlock을 방지한다는 점입니다.
단점은 priority를 미리 알아야 한다는 점입니다(정적).

VxWorks와 일부 RTOS가 채택했고, FreeRTOS는 PI만 지원합니다.

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

해결책은 **항상 같은 순서로 lock 하는 것**입니다. 글로벌 lock order를 정해두고 모든 코드가 이를 준수해야 합니다.

### Timeout 사용

```c
if (xSemaphoreTake(mtx, pdMS_TO_TICKS(100)) != pdTRUE) {
    log_warning("mutex timeout — possible deadlock");
    return ERROR;
}
```

`portMAX_DELAY` 대신 유한 timeout을 쓰면 deadlock을 감지하고 복구할 수 있습니다.

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

Mutex hold time이 길수록 다른 task가 더 오래 대기합니다. **µs 단위로 유지**해야 합니다.

## ISR에서 Mutex 사용 불가

```c
void some_ISR(void) {
    xSemaphoreTakeFromISR(mtx, ...);  // ✗ 컴파일 에러 또는 crash
}
```

ISR은 owner가 될 task가 없으므로 mutex 의미 자체가 성립하지 않습니다. ISR과 task 사이의 signal에는 semaphore를 씁니다.

## 자주 하는 실수

> ⚠️ Owner 확인 없이 give

Non-owner가 give를 시도하면 error가 발생합니다. 코드 검토 시 take/give를 한 함수에 묶거나 RAII pattern을 활용합니다.

> ⚠️ PI 비활성으로 critical 자원 보호

`configUSE_MUTEX_PI = 0`이면 Mars Pathfinder가 재현될 수 있습니다. 기본값이 enabled이므로 그대로 두는 것이 좋습니다.

> ⚠️ Recursive mutex 남용

비재귀 mutex로 충분한 코드까지 recursive로 만드는 경우가 많습니다. 재진입이 정말 필요한 경우에만 써야 합니다.

> ⚠️ Mutex hold 중 long blocking call

다른 mutex take나 queue receive(timeout=infinite)를 하면 cascading wait가 발생합니다.

## 정리

- Mutex는 **Mutual Exclusion + Owner** 구조입니다.
- Owner 추적이 **Priority Inheritance**의 토대입니다.
- Recursive mutex는 코드 구조의 경고 신호일 때가 많으므로, 가능하면 비재귀로 설계합니다.
- Mars Pathfinder 사례는 PI 미적용 시 발생할 수 있는 임베디드 사고를 보여 줍니다.
- ISR에서는 사용할 수 없습니다(owner가 없으므로).
- Hold time은 짧게, lock order는 일관되게 유지합니다.

다음 편에서는 **큐와 메시지 패싱**으로 Producer-Consumer와 Ring Buffer를 다룹니다.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
