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

**Mutual Exclusion**이 필요합니다. 한 task의 SPI 트랜잭션이 끝날 때까지 다른 task는 대기해야 합니다. 화장실 문 잠금과 같습니다. 안에 있는 사람만 문을 열 수 있고, 밖에서는 기다립니다.

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

FreeRTOS에는 별도 mutex 구조체가 없습니다. mutex도 queue(`Queue_t`)이고, `uxQueueType`(= `pcHead`)이 `queueQUEUE_IS_MUTEX`(NULL)일 때 union의 `xSemaphore` 부분에 holder와 재귀 횟수를 둡니다. 원래 우선순위는 mutex가 아니라 holder task의 TCB(`uxBasePriority`, `uxMutexesHeld`)에 있습니다(1-02의 `tskTCB`).

```c
/* queue.c V11.2.0 L74-L78 */
typedef struct SemaphoreData
{
    TaskHandle_t xMutexHolder;        /**< The handle of the task that holds the mutex. */
    UBaseType_t uxRecursiveCallCount; /**< Maintains a count of the number of times a recursive mutex has been recursively 'taken' when the structure is used as a mutex. */
} SemaphoreData_t;
```

비소유자가 `xSemaphoreGive()`를 부르면 `xTaskPriorityDisinherit()`의 `configASSERT( pxTCB == pxCurrentTCB )`가 걸립니다([`tasks.c` L6755](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L6755)). 아래 QEMU 실험에서 그대로 확인합니다. `configASSERT`를 정의하지 않은 빌드에서는 이 검사가 없으므로 다른 task가 holder 대신 우선순위 복원을 해 버립니다.

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

> 💡 재귀 횟수는 위 `uxRecursiveCallCount`에 쌓이고, 0이 될 때 비로소 실제로 풀립니다. 비재귀 mutex를 같은 task가 다시 take하면 아래 `mutex-check.c`처럼 timeout 0에서 `pdFALSE`, `portMAX_DELAY`에서는 영원히 기다립니다.

## Priority Inheritance — Mars Pathfinder

![Priority Inversion (without/with PI) timeline](/images/blog/practical-internals/diagrams/part1-08-priority-inversion.svg)

### 시나리오 (1997 NASA)

| Task | 역할 |
| --- | --- |
| T_high (priority 5) | T_low가 쥔 semaphore를 기다림 |
| T_med (priority 3) | 계속 실행하며 T_low를 선점 |
| T_low (priority 1) | semaphore를 쥔 채 선점당함 |

T_med가 runnable인 동안 T_low는 돌지 못하고, 그만큼 T_high도 기다립니다. 그림은 이 구조를 그린 설명용 모델입니다. Pathfinder에서는 bus management task가 information bus mutex를 기다리는 동안 communications task가 meteorological task를 선점했고, 결국 watchdog이 system reset을 일으켰습니다(1-03, Reeves의 사건 설명).

### 해결 — Priority Inheritance

Mutex 보유자가 대기자의 priority를 일시적으로 상속받습니다.

```text
T_high (priority 5) ←─ mutex wait → T_low의 priority를 5로 boost
T_low  (priority 5 임시) ←─ 실행 가능 → mutex 해제
T_high 진행
```

FreeRTOS V11.2.0에는 `configUSE_MUTEX_PI`라는 별도 설정이 없습니다(소스 트리 전체에 이 이름이 나오지 않습니다). `configUSE_MUTEXES=1`이면 mutex를 기다리기 직전에 `xQueueSemaphoreTake()`가 `xTaskPriorityInherit()`를 부릅니다(1-07). 상속은 blocking 시간을 *줄일* 뿐 deadlock을 풀지는 못합니다.

### 알고리즘

원리를 단순화하면 대기하는 고우선 task의 존재를 owner의 유효 우선순위에 반영합니다. 복원 규칙이 커널마다 다릅니다. FreeRTOS의 `xTaskPriorityDisinherit()`는 mutex를 하나 줄 때마다 `uxMutexesHeld`를 1 줄이고, 이 값이 **0이 될 때만** `uxBasePriority`로 돌아갑니다([`tasks.c` L6742-L6790](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L6742), 원문 주석 "Only disinherit if no other mutexes are held."). 상속은 `xTaskPriorityInherit()`(L6639), timeout으로 대기자가 떠날 때의 조정은 `vTaskPriorityDisinheritAfterTimeout()`(L6836)이 맡습니다.

### QEMU에서 상속과 복원 보기

low(우선순위 1)가 mutex m1과 m2를 쥐고 일하는 동안 high(우선순위 3)가 m1을 기다리게 했습니다. low는 m1을 먼저 놓고, 그다음 m2를 놓습니다.

```c title="mutexdemo.c (MODE 1 발췌)"
static void high(void*a){ (void)a; vTaskDelay(2);
  pr("t=%u high(3) blocks on m1; low prio before=%u\n",(unsigned)xTaskGetTickCount(),PRIO(hLow));
  xSemaphoreTake(m1,portMAX_DELAY); pr("t=%u high got m1\n",(unsigned)xTaskGetTickCount()); xSemaphoreGive(m1); vTaskDelete(NULL); }
static void low(void*a){ (void)a;
  xSemaphoreTake(m1,portMAX_DELAY); xSemaphoreTake(m2,portMAX_DELAY);
  burn(4); pr("t=%u low holds m1+m2, prio=%u (base 1)\n",(unsigned)xTaskGetTickCount(),PRIO(NULL));
  xSemaphoreGive(m1); pr("t=%u low gave m1, still holds m2, prio=%u\n",(unsigned)xTaskGetTickCount(),PRIO(NULL));
  xSemaphoreGive(m2); pr("t=%u low gave m2, prio=%u\n",(unsigned)xTaskGetTickCount(),PRIO(NULL)); hosted_exit(0); }
```

FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`입니다.

```text
t=2 high(3) blocks on m1; low prio before=1
t=4 low holds m1+m2, prio=3 (base 1)
t=4 low gave m1, still holds m2, prio=3
t=4 high got m1
t=4 low gave m2, prio=1
```

high가 기다리자 low는 3으로 올라갔습니다. m1을 놓은 뒤에도 low는 m2를 쥐고 있으므로 여전히 3이고, 그래서 m1을 받은 high도 같은 우선순위의 low를 선점하지 못했습니다. high는 low가 m2까지 놓고 1로 내려간 뒤에야 돌았습니다. m2는 high와 상관없는 자원인데도 high가 그 구간만큼 더 기다린 셈입니다. "필요한 만큼만 정확히 복원"하는 대신 단순하고 상한이 분명한 규칙을 고른 결과입니다. 연쇄 상속은 [3-05](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)에서 다룹니다.

## Priority Ceiling Protocol (PCP) — PI의 대안

각 mutex에 priority ceiling을 정적으로 할당합니다. 이 값은 해당 mutex를 lock 할 수 있는 가장 높은 priority입니다.

immediate ceiling 방식에서는 mutex마다 그 mutex를 쓰는 task 중 가장 높은 우선순위(ceiling)를 미리 정해 둡니다. ceiling이 5인 mutex를 T_low가 잡는 순간 T_low는 5로 올라가므로, 우선순위 3인 T_med는 그동안 시작조차 못 합니다. 대신 어느 task가 어느 mutex를 쓰는지 설계 시점에 알아야 합니다. 원래의 Priority Ceiling Protocol은 잠그는 순간 올리지 않는 다른 규칙을 쓰며, 두 방식의 차이는 [3-06](/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling)에서 다룹니다.

FreeRTOS V11.2.0의 mutex 생성 API(`xSemaphoreCreateMutex`, `xSemaphoreCreateRecursiveMutex`와 `...Static`)에는 ceiling 인자가 없습니다([`semphr.h`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h)).

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

`portMAX_DELAY` 대신 유한 timeout을 쓰면 deadlock에서 빠져나올 수 있습니다. 위 lock ordering 위반을 QEMU에서 만들어 봤습니다. Task A(우선순위 1)는 X를, Task B(우선순위 3)는 Y를 쥔 뒤 각각 상대 mutex를 100 tick timeout으로 기다립니다.

```text
t=101 B: holds Y, take X -> pdFALSE (timeout)
t=101 A: holds X, take Y -> pdTRUE
```

B가 100 tick 뒤 `pdFALSE`를 받고 Y를 놓자 A가 Y를 얻었습니다. timeout은 교착을 *풀어* 주지만 그동안 두 task가 100 tick을 잃었고, B는 결국 일을 하지 못했습니다. 근본 해결은 lock order입니다.

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

Mutex hold time은 같은 mutex를 기다리는 모든 task의 blocking 시간에 그대로 더해집니다. 위 MODE 1 실험처럼 FreeRTOS에서는 *다른* mutex를 쥔 시간까지 상속된 우선순위가 유지됩니다.

## ISR에서 Mutex 사용 불가

```c
void some_ISR(void) {
    xSemaphoreTakeFromISR(mtx, ...);  // ✗ 컴파일은 되고, 조용히 성공함
}
```

컴파일 에러가 나지 않습니다. mutex 핸들도 `SemaphoreHandle_t`이기 때문입니다. QEMU에서 TIMER0 ISR이 비어 있는 mutex에 `xSemaphoreTakeFromISR()`를 부르자 `pdTRUE`(1)를 돌려받았고, holder는 `NULL`로 남았습니다.

```text
ISR xSemaphoreTakeFromISR on mutex returned 1; holder now NULL
```

mutex는 잠겼는데 주인이 없으니 아무도 정상적으로 풀 수 없고, PI도 걸 대상이 없습니다. 반대로 task가 쥔 mutex에 ISR이 `xSemaphoreGiveFromISR()`를 부르면 `ASSERT failed: queue.c line 1356`에서 멈췄습니다. 이 줄은 "mutex holder가 있는 mutex를 ISR에서 give하지 말라"는 검사입니다([`queue.c` L1353-L1356](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c#L1353-L1356)). take 쪽에는 같은 검사가 없습니다. ISR은 owner가 될 task가 없으므로 mutex 의미 자체가 성립하지 않습니다. ISR과 task 사이의 signal에는 semaphore를 씁니다.

## 자주 하는 실수

> ⚠️ Owner 확인 없이 give

Non-owner가 give하면 `configASSERT`가 켜진 빌드에서 QEMU 출력은 `ASSERT failed: tasks.c line 6755`였습니다. 반환값으로 알려 주는 오류가 아니라 멈춤입니다. take/give를 한 함수에 묶거나 C++ RAII guard를 씁니다([4-13](/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos)).

> ⚠️ PI 비활성으로 critical 자원 보호

없는 `configUSE_MUTEX_PI` 설정을 추가해도 아무 효과가 없습니다. PI는 `configUSE_MUTEXES == 1`에서 `xSemaphoreCreateMutex()`로 만든 객체에만 걸리고, `xSemaphoreCreateBinary()`로 만든 객체에는 걸리지 않습니다(1-07).

> ⚠️ Recursive mutex 남용

recursive mutex는 같은 task가 다시 잡아도 막지 않으므로, 실수로 생긴 재진입을 숨깁니다. 비재귀 mutex였다면 위 `mutex-check.c`처럼 두 번째 take가 실패해 바로 드러났을 것입니다. 재진입이 설계상 필요한 경우에만 씁니다.

> ⚠️ Mutex hold 중 long blocking call

mutex를 쥔 채 다른 mutex나 queue를 `portMAX_DELAY`로 기다리면, 이 mutex를 기다리는 task들이 그 바깥 이벤트까지 함께 기다립니다. FreeRTOS에서는 쥔 mutex 수가 0이 될 때까지 상속 우선순위도 내려가지 않습니다.

## 정리

- Mutex는 **Mutual Exclusion + Owner** 구조입니다.
- Owner 추적이 **Priority Inheritance**의 토대입니다.
- Recursive mutex는 필요한 재진입과 횟수·대응 해제 계약을 확인해 선택합니다.
- FreeRTOS는 쥔 mutex가 모두 풀릴 때 base priority로 돌아갑니다(QEMU: m1을 놓아도 m2를 놓을 때까지 3 유지).
- Mars Pathfinder 사례는 PI를 켜지 않은 mutex가 watchdog reset까지 이어진 경우입니다.
- ISR에서는 사용할 수 없습니다. TakeFromISR는 조용히 성공해 holder 없는 mutex를 만들고, 쥔 mutex의 GiveFromISR는 assert에 걸립니다.
- Hold time은 짧게, lock order는 일관되게 유지합니다.

다음 편에서는 **큐와 메시지 패싱**으로 Producer-Consumer와 Ring Buffer를 다룹니다.

## 호스트 검증 범위

다음 함수는 controller task에서 공식 V11.2.0 POSIX 포트와 링크해 실행합니다. recursive의 두 번 취득·해제와 비재귀의 자기 재취득 실패를 확인합니다. 다중 task PI·non-owner give·ISR 오용은 앞의 QEMU `mutexdemo.c`(MODE 1~5)가 다룹니다.

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

`scripts/verify-rtos-ipc-examples.mjs`(`FREERTOS_KERNEL_DIR`=V11.2.0)로 실행하면 `PASS ... recursive/nonrecursive ...`를 출력합니다. 앞의 SPI 조각은 초기화·함수 선언이 필요한 설명용 코드입니다.

## 관련 항목

- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
