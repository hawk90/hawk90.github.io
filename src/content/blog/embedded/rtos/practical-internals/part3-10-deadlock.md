---
title: "Deadlock 분석 — 4 조건·Wait-for Graph·Lock Ordering·Timeout"
slug: "embedded/rtos/practical-internals/part3-10-deadlock"
date: 2026-05-06T09:31:00
description: "Coffman의 네 조건과 wait-for graph 분석, lock ordering, timeout, hierarchical locking을 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 31
tags: [deadlock, detection, avoidance, lock-ordering]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

Deadlock에는 자원·대기 모델에 따른 필요 조건이 있습니다. 네 조건이 가능한 시스템이라고 해서 모든 실행이 deadlock인 것은 아니며, 실제 owner·waiter·진행 가능성을 확인해야 합니다.

## Coffman의 네 조건 (1971)

| 조건 | 의미 | 어떻게 깰까 |
|---|---|---|
| **Mutual Exclusion** | 자원이 한 task만 보유 | Mutex 대신 lock-free 사용 |
| **Hold and Wait** | 자원 보유 중 다른 자원 요청 | Try-lock 또는 atomic acquire |
| **No Preemption** | 보유 자원을 임의로 강제 회수하지 않음 | 안전한 상태 회수 protocol 검토 |
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

단일 instance의 배타 자원과 실제 대기 관계를 모델링할 때 T1이 T2의 자원을 기다리고 T2도 T1의 자원을 기다리면 cycle을 확인할 수 있습니다. 여러 instance·timeout·취소·외부 event가 있으면 그 조건까지 포함해야 합니다.

| 기다리는 task | 자원 | 보유 task |
| --- | --- | --- |
| T1 | B | T2 |
| T2 | A | T1 |

실제 상태를 보는 wait-for graph와 lock 획득 이력을 보는 dependency graph도 다릅니다. 정적 분석이 모든 실행을 판단하지 못할 수 있지만 코드·lock 순서 규약으로 일부 위반을 찾아낼 수는 있습니다.

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

## 해결 2: Timeout과 Rollback

timeout은 **기다리는 요청**을 실패시키는 것이지 다른 task가 보유한 mutex를 강제로 빼앗는 동작은 아닙니다. 실패 뒤 자신이 보유한 lock을 반납하고 부분 작업을 복구해야 순환 대기를 끊는 데 도움이 됩니다. timeout만으로 원인을 확정하거나 전체 복구를 자동 보장하지 않습니다.

다음은 서로 다른 일반 mutex 두 개를 순서대로 획득하며 두 번째 실패 시 첫 번째를 반납하는 예제입니다. callback·ISR용 함수가 아니며 호출자는 성공 후 둘 다 반납해야 합니다.

```c title="take-pair.c"
#include <stdbool.h>
#include "FreeRTOS.h"
#include "semphr.h"
bool take_pair(SemaphoreHandle_t a, SemaphoreHandle_t b,
               TickType_t timeout) {
    if (a == NULL || b == NULL || a == b) return false;
    if (xSemaphoreTake(a, timeout) != pdTRUE) return false;
    if (xSemaphoreTake(b, timeout) != pdTRUE) {
        (void)xSemaphoreGive(a);
        return false;
    }
    return true;
}
```

각 획득에 timeout을 따로 쓰므로 함수 전체의 대기 예산이 timeout 하나로 제한되지는 않습니다. 전체 deadline을 제한하려면 남은 시간 예산을 계산해 전달해야 합니다.

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

## 해결 4: Lock 순서 검증

application이 각 lock에 순위를 주고 task별 보유 순서를 검사하는 방법이 있습니다. 획득 실패 때는 보유 기록을 추가하지 않아야 하며, release·재귀·예외 경로의 기록도 일치해야 합니다.

Linux lockdep은 단순한 정수 level 검사만으로 구현되지 않습니다. lock class의 획득 의존성과 IRQ 사용 이력을 추적하고 관찰한 경로에서 잠재적인 순환 등을 검출합니다. [공식 설계](https://docs.kernel.org/locking/lockdep-design.html)의 가정과 검사 범위를 확인하며, application의 축약 level wrapper와 동일시하지 않습니다.

## Reader-Writer Lock Deadlock

```c
rwlock_t rw;

read_lock(&rw);
/* ... */
write_lock(&rw);   // ✗ Recursive read-then-write
```

같은 task가 read lock을 보유한 상태에서 write lock을 요청하면 자기 자신을 기다리는 deadlock에 빠집니다. 해당 API가 지원하는 upgrade protocol이 있는지 확인합니다. 지원하지 않으면 read lock을 놓고 write lock을 획득한 뒤 상태를 재검사해야 합니다. 단순 recursive 변형으로 모든 read→write upgrade가 해결되지는 않습니다.

## Priority Inversion과의 구분

```text
Low task L:  mtx 보유, M에 의해 선점
Med task M:  CPU 점유 (mtx 안 씀)
High task H: mtx 대기 → L 못 풀고 M이 CPU → unbounded wait
```

엄밀히 deadlock은 아니지만 효과는 비슷합니다. Priority Inheritance로 해결합니다 (3-05 참고).

## 검출 도구

### FreeRTOS Trace와 Task Snapshot

V11.2.0 TaskStatus_t에는 xEventListItem 필드가 없습니다. uxTaskGetSystemState의 반환 count와 buffer 크기를 확인해 task 상태를 수집할 수 있지만, blocked라는 상태만으로 기다리는 mutex·owner를 복원할 수는 없습니다. 필요한 object·take/give·timeout 이벤트를 지원되는 recorder나 application 계측으로 기록합니다.

일부 task의 deadlock 중에도 idle·다른 task·tick은 계속 진행할 수 있습니다. tick이 멈춘다는 조건을 deadlock의 필요 조건으로 삼지 않습니다.

### Static Analysis (Coverity, Klocwork)

함수 호출 그래프와 lock acquire 순서를 함께 분석해 lock order inconsistency를 경고합니다.

### Runtime Watchdog

watchdog은 기대한 진행 신호가 사라졌을 때 대응하는 장치이며 deadlock만을 구별하는 검출기는 아닙니다. 특정 task의 shared bool 한 개를 volatile 없이 읽고 쓰는 예제로 동기화를 대신하지 않습니다. 실제 watchdog driver·heartbeat ownership·atomic 또는 kernel 전달 계약과 reset 뒤 복구를 설계해야 합니다.

## Livelock: Deadlock의 사촌

```c
while (try_take_all() == false) {
    release_all();
    vTaskDelay(1);   // 양보
}
```

Task A와 Task B가 동시에 release하고 다시 retry하는 패턴이 반복되면 영원히 진전이 없습니다. random backoff가 충돌을 줄일 수 있지만 유한 시간 내 진행과 공정성을 보장하지는 않습니다. retry 한계와 취소·복구 정책도 필요합니다.

```c
vTaskDelay(pdMS_TO_TICKS(rand() % 10));
```

## 자주 하는 실수

> ⚠️ `portMAX_DELAY`를 남용하는 경우

```c
xSemaphoreTake(mtx, portMAX_DELAY);   // ✗ deadlock 감지 불가
```

제품의 수명·종료·복구 계약에 따라 무한 대기가 적절한 event wait도 있습니다. 자원 대기 상한이 필요한 경로에는 유한 예산과 실패 처리를 설계합니다.

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

lock 보유 중 block이 생기면 dependency와 상한을 함께 분석합니다. 보호해야 할 상태를 중간에 무조건 release하는 것 역시 정확성을 깨뜨릴 수 있습니다.

## 정리

- Coffman의 네 조건은 필요 조건이며 실제 대기·owner와 진행 가능성을 함께 확인합니다.
- Lock ordering이 가장 실용적인 해결책이며 모든 lock에 전역 순서를 부여합니다.
- Timeout과 rollback으로 감지하고 복구할 수 있습니다.
- Hierarchical lock으로 runtime에 lock 순서를 검증할 수 있습니다.
- timeout·watchdog은 요구에 맞춰 선택하고 rollback·복구까지 설계합니다.

다음 [3-11 Stream/Message Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)를 거쳐 Part 4의 memory management로 이어집니다.

## 근거 자료

- [Linux lockdep design](https://docs.kernel.org/locking/lockdep-design.html): class·dependency·IRQ 규칙과 검증 가정.
- [FreeRTOS V11.2.0 task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h), [semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): snapshot 필드·mutex 획득 계약.

## 관련 항목

- [3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
