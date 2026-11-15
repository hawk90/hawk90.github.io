---
title: "Mutex 개념 분해 — Ownership·Recursive·Priority Inheritance"
slug: "embedded/rtos/practical-internals/part1-08-mutex"
date: 2026-05-04T09:08:00
description: "Mutex의 소유권·재귀 횟수·priority inheritance를 구분하고, FreeRTOS의 timeout과 다중 mutex 제약을 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 8
tags: [mutex, ownership, recursive, priority-inheritance, mutual-exclusion]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"Mutex = Mutual Exclusion + Owner"** — owner 추적과 함께 대기·재귀·priority inheritance·오류 계약을 확인해야 합니다.

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
        if (xSemaphoreTake(spi_mutex, portMAX_DELAY) == pdTRUE) {
            spi_write(buf_a, 64); // 호출이 반환될 때 전송 완료라는 계약 필요
            configASSERT(xSemaphoreGive(spi_mutex) == pdTRUE);
        }
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
| **ISR에서** | ✗ (task 소유권·PI 계약과 맞지 않음) | ✓ (허용된 FromISR take/give) |
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

`xSemaphoreGive()` 호출 시 호출 task가 owner인지 확인합니다. 비소유자 해제는 계약 위반입니다. assert 구성과 포트에 따라 결과가 달라질 수 있으므로 “안전하게 무시될 것”에 의존하지 않습니다.

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

> 💡 Recursive mutex는 같은 task의 재진입이 실제로 필요한지 확인하고 사용합니다. lock 깊이·대응 give·함수 간 보호 범위를 명시하며, 단순히 재귀라는 이유로 결함으로 판정하지 않습니다.

## Priority Inheritance — Mars Pathfinder

![Priority Inversion (without/with PI) timeline](/images/blog/practical-internals/diagrams/part1-08-priority-inversion.svg)

### 시나리오 (1997 NASA)

```text
T_high (priority 5) ←─ semaphore wait (T_low가 보유)
T_med  (priority 3) ←─ 실행 중 — T_low를 preempt
T_low  (priority 1) ←─ semaphore 보유, preempted

→ T_med가 계속 runnable이면 T_low가 지연되고 T_high의 deadline을 놓칠 수 있음
```

이 그림은 priority inversion의 설명용 모델입니다. Pathfinder의 실제 임계 자원·watchdog·설정 이력은 별도 사건 자료로 확인해야 하며, 무한 대기 자체를 측정한 시간선이 아닙니다.

### 해결 — Priority Inheritance

Mutex 보유자가 대기자의 priority를 일시적으로 상속받습니다.

```text
T_high (priority 5) ←─ mutex wait → T_low의 priority를 5로 boost
T_low  (priority 5 임시) ←─ 실행 가능 → mutex 해제
T_high 진행
```

FreeRTOS V11.2.0에는 `configUSE_MUTEX_PI`라는 별도 설정이 없습니다. `configUSE_MUTEXES=1`인 mutex 구현의 관련 경로에서 priority inheritance를 사용합니다. 이는 전체 deadlock·모든 blocking 시간의 자동 해결을 뜻하지 않습니다.

### 알고리즘

원리를 단순화하면 대기하는 고우선 task의 존재를 owner의 유효 우선순위에 반영합니다. 그러나 timeout·재귀 횟수·이미 보유한 다른 mutex·대기자 변화·ready list 정렬도 고려해야 합니다. 단순히 unlock마다 저장한 priority로 복원하는 구현을 복사하면 다중 mutex에서 잘못될 수 있습니다.

V11.2.0의 [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c)와 [tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c)에서 `xTaskPriorityInherit`, `xTaskPriorityDisinherit`, `vTaskPriorityDisinheritAfterTimeout`, `uxMutexesHeld` 경로를 확인합니다. FreeRTOS의 단순화된 상속·복원 규칙을 일반적인 transitive PI 구현과 동일시하지 않습니다.

## Priority Ceiling Protocol (PCP) — PI의 대안

각 mutex에 priority ceiling을 정적으로 할당합니다. 이 값은 해당 mutex를 lock 할 수 있는 가장 높은 priority입니다.

```c
// Mutex의 ceiling = 5 (T_high의 priority)
T_low가 mutex lock 시 → 즉시 priority를 5로 boost
T_med (priority 3)은 *시작도 못 함*
```

원래 PCP와 immediate ceiling 계열은 규칙이 다릅니다. ceiling 배정만 추가하면 자동으로 모든 deadlock이 사라지는 것은 아닙니다. 자원 접근 집합·admission 규칙·프로토콜 가정이 맞아야 blocking·deadlock에 대한 결론을 적용할 수 있습니다.
단점은 priority를 미리 알아야 한다는 점입니다(정적).

FreeRTOS 기본 mutex API에 위 ceiling 지정 기능이 있다고 가정하지 않습니다. 실제 RTOS와 프로토콜 구현별 계약을 확인합니다.

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

없는 `configUSE_MUTEX_PI` 설정을 추가하지 않습니다. `configUSE_MUTEXES` 및 실제 생성한 객체가 mutex인지 확인하고, 상속과 timeout·다중 lock 해제 경로를 검토합니다.

> ⚠️ Recursive mutex 남용

비재귀 mutex로 충분한 코드까지 recursive로 만드는 경우가 많습니다. 재진입이 정말 필요한 경우에만 써야 합니다.

> ⚠️ Mutex hold 중 long blocking call

다른 mutex take나 queue receive(timeout=infinite)를 하면 cascading wait가 발생합니다.

## 정리

- Mutex는 **Mutual Exclusion + Owner** 구조입니다.
- Owner 추적이 **Priority Inheritance**의 토대입니다.
- Recursive mutex는 필요한 재진입과 횟수·대응 해제 계약을 확인해 선택합니다.
- Mars Pathfinder 사례는 PI 미적용 시 발생할 수 있는 임베디드 사고를 보여 줍니다.
- ISR에서는 사용할 수 없습니다(owner가 없으므로).
- Hold time은 짧게, lock order는 일관되게 유지합니다.

다음 편에서는 **큐와 메시지 패싱**으로 Producer-Consumer와 Ring Buffer를 다룹니다.

## 호스트 검증 범위

다음 함수는 controller task에서 공식 V11.2.0 POSIX 포트와 링크해 실행합니다. recursive의 두 번 취득·해제와 비재귀의 자기 재취득 실패만 확인합니다. 다중 task PI·timeout 상속 복원·보드 실행은 이 작은 검사 범위 밖입니다.

```c title="mutex-check.c"
#include <assert.h>
#include "FreeRTOS.h"
#include "semphr.h"
void check_mutex(void) {
    SemaphoreHandle_t normal = xSemaphoreCreateMutex();
    assert(normal);
    assert(xSemaphoreTake(normal, 0) == pdTRUE);
    assert(xSemaphoreTake(normal, 0) == pdFALSE);
    assert(xSemaphoreGive(normal) == pdTRUE);
    vSemaphoreDelete(normal);
    SemaphoreHandle_t recursive = xSemaphoreCreateRecursiveMutex();
    assert(recursive);
    assert(xSemaphoreTakeRecursive(recursive, 0) == pdTRUE);
    assert(xSemaphoreTakeRecursive(recursive, 0) == pdTRUE);
    assert(xSemaphoreGiveRecursive(recursive) == pdTRUE);
    assert(xSemaphoreGiveRecursive(recursive) == pdTRUE);
    vSemaphoreDelete(recursive);
}
```

`scripts/verify-rtos-ipc-examples.mjs`로 실행합니다. 비소유자 unlock 같은 계약 위반을 제품 오류 처리의 정상 대안으로 제시하지 않습니다. 앞의 API 조각은 초기화·수명·함수 선언이 필요한 설명용 코드입니다.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
