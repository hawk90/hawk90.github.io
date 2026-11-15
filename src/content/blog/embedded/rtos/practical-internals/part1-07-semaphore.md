---
title: "Semaphore 개념 분해 — Counting·Binary·P/V 연산"
slug: "embedded/rtos/practical-internals/part1-07-semaphore"
date: 2026-05-04T09:07:00
description: "Dijkstra의 P/V(1965)에서 출발한 Counting(N 자원)과 Binary(신호) 세마포어를 다룹니다. ISR에서 task로 신호를 전달하는 표준 도구입니다."
series: "Practical RTOS Internals"
seriesOrder: 7
tags: [semaphore, counting, binary, dijkstra, pv]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"세마포어 = 카운터 + 대기 큐"** — counter > 0이면 통과하고, 아니면 대기합니다.

## Dijkstra의 P/V 연산 (1965)

| 연산 | 의미 |
| --- | --- |
| **P (proberen, "test")** | counter-- ; 만약 < 0 → 대기 |
| **V (verhogen, "increment")** | counter++ ; 대기자 있으면 깨움 |

영어로는 **Wait/Signal** 또는 **Take/Give**라고 부릅니다. 이 음수 카운터 표현은 P/V의 한 추상 모델입니다. FreeRTOS의 공개 semaphore count가 음수가 된다는 뜻은 아닙니다. FreeRTOS에서는 token이 있을 때 감소시키고 없으면 timeout·대기 조건을 처리합니다. API 조각은 다음과 같습니다.

```c
xSemaphoreTake(sem, timeout);   // P
xSemaphoreGive(sem);            // V
```

## 두 종류

### Binary Semaphore (0 또는 1)

신호 전달용입니다. 상태 자체보다 이벤트 발생 자체가 의미를 갖습니다.

```c
static SemaphoreHandle_t data_ready;
void setup_signal(void) {
    data_ready = xSemaphoreCreateBinary();
    configASSERT(data_ready != NULL);
}

// ISR — 데이터 도착 알림
void USART_IRQHandler(void) {
    BaseType_t woken = pdFALSE;
    capture_and_ack_uart_event(); // 주변장치별 조건 확인·상태 해제, platform 제공
    // binary 신호가 이미 있으면 give 실패로 합쳐짐: 별도 buffer/overflow 정책 필요
    xSemaphoreGiveFromISR(data_ready, &woken);
    portYIELD_FROM_ISR(woken);
}

// Task — 데이터 처리
void rx_task(void *arg) {
    while (1) {
        if (xSemaphoreTake(data_ready, portMAX_DELAY) == pdTRUE) process_uart_data();
    }
}
```

> 💡 Binary semaphore는 **ISR → task signal**의 표준 패턴입니다. binary 신호는 이미 pending일 때 여러 give가 합쳐질 수 있습니다. 이벤트별 데이터를 모두 보존하려면 buffer/queue와 overflow 정책이 필요합니다. task notification과 semaphore는 수신 대상·누적 의미·API 이식 계층 요구로 비교하며, FreeRTOS semaphore API 자체가 다른 RTOS에 자동 이식되는 것은 아닙니다.

### Counting Semaphore (N 자원)

여러 자원 풀을 관리합니다.

```c
// 5개 buffer 풀
SemaphoreHandle_t bufferPool = xSemaphoreCreateCounting(5, 5);

void producer(void *arg) {
    while (1) {
        if (xSemaphoreTake(bufferPool, portMAX_DELAY) != pdTRUE) continue;
        Buffer *buf = allocate_buffer();
        if (buf == NULL) { xSemaphoreGive(bufferPool); continue; }
        fill_buffer(buf);
        if (!push_to_consumer(buf)) { // 성공하면 consumer가 소유
            free_buffer(buf);
            xSemaphoreGive(bufferPool);
        }
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

위 코드는 pool/전달 함수가 있는 설명용 조각입니다. 성공 경로에서만 소유권을 넘기고 실패 시 token과 buffer를 돌려줘야 합니다. 5개까지 in-flight 상태를 허용하며, 5개 모두 in-flight면 producer가 대기합니다. Backpressure가 자동으로 걸립니다.

## 내부 구현 — Counter + Wait List

직접 구현한다면 count와 대기 상태 등록·해제를 같은 보호 계약으로 묶어야 합니다. “wait list에 넣고 critical을 푼 뒤 나중에 block”하면 그 사이의 give를 잃을 수 있습니다. 깨어났다는 이유만으로 token을 이미 얻었다고 반환해서도 안 됩니다. 다른 task가 먼저 소비할 수 있으므로 재검사해야 합니다.

FreeRTOS V11.2.0은 queue 기반의 take/give 경로를 사용합니다. timeout 0은 즉시 실패할 수 있고, 양수 timeout은 실제 block 조건을 검사합니다. [queue.c의 `xQueueSemaphoreTake`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c)를 따라 count 검사·event list·timeout·재시도 경로를 확인합니다. 이 장에서는 미완성 kernel 의사 코드를 복사 가능한 구현으로 제시하지 않습니다.

## Counting Semaphore — 흔한 패턴

### 1. Resource Pool

위 예처럼 N개의 버퍼, N개의 connection, N개의 file descriptor를 관리할 때 씁니다.

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

ISR에서 여러 번 give 하면, task가 깨어나서 모두 take 한 뒤 처리합니다.

### 3. Throttling

```c
SemaphoreHandle_t rate_limit = xSemaphoreCreateCounting(10, 10);
// 10 token으로 시작

// 매 100 ms마다 1 token 보충 (timer task)
void refill_timer(void) {
    xSemaphoreGive(rate_limit);
}

// 요청 시 token 소비
void process_request(void) { // task entry가 아닌 호출 가능한 요청 처리 조각
    if (xSemaphoreTake(rate_limit, portMAX_DELAY) == pdTRUE) do_request();
}
```

이는 초기 burst 최대10개 뒤, token 보충률 기준으로 장기 평균 10개/초를 허용하는 token bucket입니다. 모든 1초 구간에 반드시 10개 이하라는 sliding-window 제한과는 다릅니다. take 성공 여부, timer callback의 실제 시그니처·지연·give 실패도 처리해야 합니다.

## Semaphore vs Mutex — 핵심 차이

| | Semaphore | Mutex |
| --- | --- | --- |
| **Counter** | 0-N | 0/1 only |
| **Owner** | 없음 (누구나 give) | 있음 (소유자만 unlock) |
| **사용처** | Signal, 자원 풀 | Mutual exclusion |
| **Priority Inheritance** | ✗ | ✓ |
| **Recursive** | ✗ | ✓ (선택) |
| **ISR Give** | ✓ | ✗ (owner 없음) |

**규칙**: 공유 데이터 보호에는 mutex, 이벤트 신호에는 semaphore를 씁니다.

## ISR에서 사용

```c
// ISR Give — OK
xSemaphoreGiveFromISR(sem, &woken);

// ISR Take — binary/counting에 한해 대기 없이 시도 가능
// 이 API에는 timeout 인자가 없으며 mutex에는 사용하지 않음
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
    xSemaphoreTake(sem, portMAX_DELAY); // (2) 위 give로 token이 남아 있으면 즉시 성공
}
```

(1)과 (2) 사이에 ISR이 give 하면 counter가 1이 되고, (2)에서 take가 가능합니다. 문제 없습니다.

하지만 counter를 무시하는 변종(예: condition variable)이라면 signal이 lost 됩니다. Semaphore는 token을 기억하므로 위 순서 자체는 lost-wakeup이 아닙니다. 다만 binary 신호의 합쳐짐, 최대 count 도달, 잘못된 predicate·buffer 수명·다른 consumer는 별도 문제입니다. condition variable도 mutex와 predicate 반복 검사를 지키는 별도 계약이 있으므로 “원래 안전하지 않은 도구”로 일반화하지 않습니다.

## Priority Inversion 가능

```c
T_low가 semaphore token을 소비하고 자원을 사용 → T_high가 take 대기
T_med가 실행 → T_low preempt
T_high가 *T_med 끝날 때까지* 대기 (priority inversion)
```

Semaphore는 **PI를 지원하지 않습니다**. PI는 Mutex에만 있습니다. 임계 자원이면 mutex를 써야 합니다.

## Static vs Dynamic

```c
// Dynamic — heap에서
SemaphoreHandle_t sem = xSemaphoreCreateBinary();

// Static — 컴파일 타임 메모리
StaticSemaphore_t sem_buf;
SemaphoreHandle_t sem = xSemaphoreCreateBinaryStatic(&sem_buf);
```

static 저장 공간은 객체가 사용되는 동안 살아 있어야 합니다. 할당 방식은 제품의 용량·수명·실패·검증 요구로 정하며 특정 인증의 일괄 규칙으로 단정하지 않습니다.

## 자주 하는 실수

> ⚠️ Binary semaphore 초기값

`xSemaphoreCreateBinary()`는 초기값이 0입니다. 즉 첫 take()가 바로 block 됩니다. 만약 available 상태로 시작하려면 다음 줄에 `xSemaphoreGive(sem)`을 넣어 줍니다.

> ⚠️ Mutex 대신 semaphore로 보호

priority inversion이 발생하면 Mars Pathfinder 시나리오가 재현됩니다. 임계 자원에는 mutex를 씁니다.

> ⚠️ Counting semaphore의 max 초과 give

`xSemaphoreCreateCounting(5, 5)` 후 추가 give는 실패를 반환하며 count는 5를 유지합니다. 반환값을 무시하지 않습니다. 코드 로직을 재확인해야 합니다.

> ⚠️ Take/Give 짝 안 맞음

Semaphore는 짝을 강제하지 않습니다. Mutex도 unlock을 잊으면 지연된 교착으로 나타날 수 있으며 자동으로 즉시 검출되는 것은 아닙니다.

## 정리

- Semaphore는 **counter + wait list** 구조이며, Dijkstra의 P/V에서 출발했습니다.
- **Binary**(signal)와 **Counting**(resource pool) 두 종류가 있습니다.
- ISR에서 task로 signal을 보내는 표준 도구입니다.
- Mutex와 달리 owner가 없고 PI도 없으므로, 보호에는 mutex를 씁니다.
- 자원 풀, throttling, event counting에 활용합니다.

다음 편에서는 **Mutex 개념**으로 Ownership, Recursive, Priority Inheritance를 다룹니다.

## 검증과 1차 자료

[FreeRTOS V11.2.0 semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h)의 초기 상태·최대 count·FromISR 계약을 기준으로 합니다. 아래 named 함수는 공식 POSIX 포트의 controller task 안에서 실행하는 host 검사입니다. 실제 UART IRQ·보드 timing·pool 전송을 검증하지 않습니다.

```c title="semaphore-check.c"
#include <assert.h>
#include "FreeRTOS.h"
#include "semphr.h"
void check_semaphore(void) {
    SemaphoreHandle_t b = xSemaphoreCreateBinary();
    assert(b);
    assert(xSemaphoreTake(b, 0) == pdFALSE);
    assert(xSemaphoreGive(b) == pdTRUE);
    assert(xSemaphoreGive(b) == pdFALSE); // pending binary signal is full
    assert(xSemaphoreTake(b, 0) == pdTRUE);
    assert(xSemaphoreTake(b, 0) == pdFALSE);
    vSemaphoreDelete(b);
    SemaphoreHandle_t c = xSemaphoreCreateCounting(5, 5);
    assert(c);
    assert(xSemaphoreGive(c) == pdFALSE);
    for (int i = 0; i < 5; ++i) assert(xSemaphoreTake(c, 0) == pdTRUE);
    assert(xSemaphoreTake(c, 0) == pdFALSE);
    for (int i = 0; i < 5; ++i) assert(xSemaphoreGive(c) == pdTRUE);
    assert(xSemaphoreGive(c) == pdFALSE);
    vSemaphoreDelete(c);
}
```

저장소의 `scripts/verify-rtos-ipc-examples.mjs`가 이 함수를 본문에서 추출하고 공식 kernel과 링크해 실행합니다. `FREERTOS_KERNEL_DIR`은 V11.2.0 소스 경로입니다. 위의 다른 API 조각은 플랫폼 선언과 초기화가 필요합니다.

## 관련 항목

- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-02: Semaphore 내부 구현](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
