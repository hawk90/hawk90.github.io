---
title: "1-07: Semaphore 개념 — Counting, Binary, P/V 연산"
date: 2026-05-08T07:00:00
description: "Dijkstra의 P/V (1965). Counting (N 자원) vs Binary (신호). ISR → task 신호의 표준 도구."
series: "Practical RTOS Internals"
seriesOrder: 7
tags: [semaphore, counting, binary, dijkstra, pv]
draft: true
---

## 한 줄 요약

> **"세마포어 = 카운터 + 대기 큐"** — counter > 0이면 통과, 아니면 대기.

## Dijkstra의 P/V 연산 (1965)

| 연산 | 의미 |
| --- | --- |
| **P (proberen, "test")** | counter-- ; 만약 < 0 → 대기 |
| **V (verhogen, "increment")** | counter++ ; 대기자 있으면 깨움 |

영어로 **Wait/Signal** 또는 **Take/Give**. FreeRTOS:

```c
xSemaphoreTake(sem, timeout);   // P
xSemaphoreGive(sem);            // V
```

## 두 종류

### Binary Semaphore (0 또는 1)

신호 전달용. *상태 자체보다 이벤트 발생*이 의미.

```c
SemaphoreHandle_t data_ready = xSemaphoreCreateBinary();

// ISR — 데이터 도착 알림
void USART_IRQHandler(void) {
    BaseType_t woken = pdFALSE;
    xSemaphoreGiveFromISR(data_ready, &woken);
    portYIELD_FROM_ISR(woken);
}

// Task — 데이터 처리
void rx_task(void *arg) {
    while (1) {
        xSemaphoreTake(data_ready, portMAX_DELAY);
        process_uart_data();
    }
}
```

> 💡 Binary semaphore = **ISR → task signal**의 표준 패턴. Task Notification이 더 효율이지만 *FreeRTOS 의존성 없는 코드*에선 semaphore 사용.

### Counting Semaphore (N 자원)

여러 자원 풀 관리.

```c
// 5개 buffer 풀
SemaphoreHandle_t bufferPool = xSemaphoreCreateCounting(5, 5);

void producer(void *arg) {
    while (1) {
        xSemaphoreTake(bufferPool, portMAX_DELAY);  // 자원 1개 점유
        Buffer *buf = allocate_buffer();
        fill_buffer(buf);
        push_to_consumer(buf);
    }
}

void consumer(void *arg) {
    while (1) {
        Buffer *buf = pop_from_producer();
        process(buf);
        free_buffer(buf);
        xSemaphoreGive(bufferPool);                  // 자원 반환
    }
}
```

5개까지는 produce 무사히, 5개 모두 in-flight면 *producer가 대기*. *Backpressure 자동*.

## 내부 구현 — Counter + Wait List

```c
typedef struct {
    int count;                  // 현재 카운터
    int max_count;              // 최대 (counting만)
    List_t wait_list;           // P()에서 대기 중인 task들
} Semaphore_t;

int sem_take(Semaphore_t *s, TickType_t timeout) {
    portENTER_CRITICAL();
    if (s->count > 0) {
        s->count--;
        portEXIT_CRITICAL();
        return SUCCESS;
    }
    // 대기 list에 자신 추가
    add_to_wait_list(s->wait_list, current_task);
    portEXIT_CRITICAL();

    block_with_timeout(timeout);  // ← context switch
    // 깨어남
    return (timeout_expired) ? TIMEOUT : SUCCESS;
}

void sem_give(Semaphore_t *s) {
    portENTER_CRITICAL();
    if (!list_empty(s->wait_list)) {
        Task_t *waiter = pop_highest_priority(s->wait_list);
        wake_task(waiter);          // Ready list로
    } else {
        s->count++;
    }
    portEXIT_CRITICAL();
}
```

## Counting Semaphore — 흔한 패턴

### 1. Resource Pool

위 예 — N 버퍼·N connection·N file descriptor.

### 2. Event Counting

```c
SemaphoreHandle_t click_counter = xSemaphoreCreateCounting(255, 0);

// ISR — 버튼 클릭마다
xSemaphoreGiveFromISR(click_counter, &woken);

// Task — 누적된 클릭 처리
while (xSemaphoreTake(click_counter, 0) == pdTRUE) {
    process_one_click();
}
```

ISR에서 *여러 번 give* → task가 *깨어나서 모두 take* 후 처리.

### 3. Throttling

```c
SemaphoreHandle_t rate_limit = xSemaphoreCreateCounting(10, 10);
// 10 token으로 시작

// 매 100 ms마다 1 token 보충 (timer task)
void refill_timer(void) {
    xSemaphoreGive(rate_limit);
}

// 요청 시 token 소비
void request(void *arg) {
    xSemaphoreTake(rate_limit, portMAX_DELAY);
    do_request();
}
```

**Token bucket** 패턴 — 1초당 10 요청 제한.

## Semaphore vs Mutex — 핵심 차이

| | Semaphore | Mutex |
| --- | --- | --- |
| **Counter** | 0-N | 0/1 only |
| **Owner** | 없음 (누구나 give) | 있음 (소유자만 unlock) |
| **사용처** | Signal, 자원 풀 | Mutual exclusion |
| **Priority Inheritance** | ✗ | ✓ |
| **Recursive** | ✗ | ✓ (선택) |
| **ISR Give** | ✓ | ✗ (owner 없음) |

**규칙**: *공유 데이터 보호 = mutex*, *이벤트 신호 = semaphore*.

## ISR에서 사용

```c
// ISR Give — OK
xSemaphoreGiveFromISR(sem, &woken);

// ISR Take — 거의 안 함 (의미 없음, blocking 불가)
// 굳이 한다면 timeout=0으로
xSemaphoreTakeFromISR(sem, &woken);
```

## 함정 — Lost Wakeup

```c
// ISR
volatile int ready = 0;
ready = 1;
xSemaphoreGiveFromISR(sem, &woken);

// Task
if (!ready) {                          // (1)
    // ← ISR이 여기서 발생, ready=1, give!
    xSemaphoreTake(sem, portMAX_DELAY); // (2) 영원히 대기
}
```

(1)과 (2) 사이에 *ISR이 give → counter 1*. (2)에서 take 가능. **OK**.

하지만 만약 *counter 무시*하는 변종 (예: condition variable)이라면 *signal lost*. Semaphore는 *counter 메모리*가 있어 안전.

## Priority Inversion 가능

```c
T_low가 semaphore 소유 → T_high가 take 대기
T_med가 실행 → T_low preempt
T_high가 *T_med 끝날 때까지* 대기 (priority inversion)
```

Semaphore는 **PI 미지원** — Mutex만. 임계 자원이면 *mutex 사용*.

## Static vs Dynamic

```c
// Dynamic — heap에서
SemaphoreHandle_t sem = xSemaphoreCreateBinary();

// Static — 컴파일 타임 메모리
StaticSemaphore_t sem_buf;
SemaphoreHandle_t sem = xSemaphoreCreateBinaryStatic(&sem_buf);
```

Safety-critical에서 static 선호.

## 자주 하는 실수

> ⚠️ Binary semaphore 초기값

`xSemaphoreCreateBinary()`는 *초기 0*. 즉 첫 take()가 *바로 block*. 만약 *available 상태로 시작*하려면 다음 줄에 `xSemaphoreGive(sem)`.

> ⚠️ Mutex 대신 semaphore로 보호

priority inversion 발생 시 *Mars Pathfinder* 시나리오. 임계 자원엔 *mutex*.

> ⚠️ Counting semaphore의 max 초과 give

`xSemaphoreCreateCounting(5, 5)` 후 추가 give → 무시됨 (count는 5 cap). 코드 로직 재확인.

> ⚠️ Take/Give 짝 안 맞음

Semaphore는 *짝* 강제 안 함. Mutex는 *owner 있어* return 시 unlock 잊으면 deadlock 명확.

## 정리

- Semaphore = **counter + wait list** — Dijkstra의 P/V.
- **Binary** (signal) vs **Counting** (resource pool).
- ISR → task signal의 *표준 도구*.
- Mutex와 차이 — *owner 없음, PI 없음*. 보호에는 mutex.
- 자원 풀·throttling·event counting에 활용.

다음 편은 **Mutex 개념** — Ownership, Recursive, Priority Inheritance.

## 관련 항목

- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-02: Semaphore 내부 구현](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
