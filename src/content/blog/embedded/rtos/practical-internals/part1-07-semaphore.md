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

## Dijkstra의 P/V 연산

Dijkstra의 EWD 123 *Cooperating Sequential Processes*는 semaphore를 "본질적으로 음이 아닌 정수"로 정의하고 두 연산을 둡니다([E.W. Dijkstra Archive 전사본](https://www.cs.utexas.edu/~EWD/transcriptions/EWD01xx/EWD123.html)).

| 연산 | EWD 123의 정의 |
| --- | --- |
| **P** | 결과가 음이 아니게 되는 순간 값을 1 줄인다. 그때까지는 기다린다 |
| **V** | 값을 1 늘린다. 나눌 수 없는(indivisible) 동작이다 |

값이 0과 1만 가지면 "binary semaphore", 더 큰 값을 가지면 "general semaphore"라고 부른다는 구분도 같은 글에 있습니다. 주차장 입구의 "남은 자리" 전광판과 같습니다. 0이면 차가 기다리고, 한 대가 나가면 숫자가 올라가 다음 차가 들어갑니다. 교과서에 따라 P를 "count를 먼저 줄이고 음수면 대기"로 쓰기도 하는데, 이는 대기자 수를 음수로 함께 세는 구현 방식입니다. FreeRTOS의 count는 음수가 되지 않고 EWD 123의 정의처럼 0이면 기다립니다. API 조각은 다음과 같습니다.

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

> 💡 Binary semaphore는 **ISR → task signal**에 씁니다. 다만 task가 take하기 전에 give가 여러 번 오면 하나로 합쳐집니다. 아래 실험이 그 모습입니다.

### 합쳐지는 신호 — QEMU에서 확인

우선순위 3의 producer가 CPU를 쥔 채 TIMER0 IRQ를 연달아 세 번 pending시키고, ISR이 매번 같은 semaphore를 give합니다. 우선순위 2의 consumer는 producer가 끝난 뒤에야 돌아 몇 번 take에 성공하는지 셉니다. 같은 코드를 binary와 `xSemaphoreCreateCounting(255, 0)`으로 각각 빌드했습니다.

```c title="coalesce.c (발췌)"
void TIMER0_IRQHandler(void){ BaseType_t w=pdFALSE; give_ret[nirq++]=xSemaphoreGiveFromISR(sem,&w); portYIELD_FROM_ISR(w); }
static void consumer(void*a){ (void)a; int got=0;
  if(xSemaphoreTake(sem,portMAX_DELAY)==pdTRUE) got++;        /* first wake */
  while(xSemaphoreTake(sem,0)==pdTRUE) got++;                    /* drain what is left */
  /* ... print ... */ }
static void producer(void*a){ (void)a;
  /* ... enable IRQ8 at priority 0xE0 ... */
  vTaskDelay(1);                       /* let consumer block first */
  pend(); pend(); pend();              /* 3 events while producer (prio 3) keeps the CPU */
  vTaskDelete(NULL); }
```

FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`의 결과입니다.

```text
binary  : give results=1,0,0  takes succeeded=1
counting: give results=1,1,1  takes succeeded=3
```

binary는 두 번째와 세 번째 give가 `pdFALSE`(0)를 돌려주었고 consumer는 한 번만 깨어났습니다. 이벤트 셋 중 둘이 사라진 것입니다. counting은 세 번 모두 성공해 세 번 처리했습니다. 이벤트마다 데이터가 따라온다면 counting으로도 부족하고 queue나 buffer가 필요합니다([1-05의 UART 실험](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)).

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

위 코드는 pool/전달 함수가 있는 설명용 조각입니다. 성공 경로에서만 소유권을 넘기고 실패 시 token과 buffer를 돌려줍니다. 5개까지 in-flight 상태를 허용하며, 5개 모두 in-flight면 producer가 대기합니다. 식당의 테이블 5개와 같아서, 다 차면 손님이 입구에서 기다립니다.

## 내부 구현 — Counter + Wait List

직접 구현한다면 count와 대기 상태 등록·해제를 같은 보호 계약으로 묶어야 합니다. “wait list에 넣고 critical을 푼 뒤 나중에 block”하면 그 사이의 give를 잃을 수 있습니다. 깨어났다는 이유만으로 token을 이미 얻었다고 반환해서도 안 됩니다. 다른 task가 먼저 소비할 수 있으므로 재검사해야 합니다.

FreeRTOS V11.2.0의 semaphore는 item 크기가 0인 queue이고, count는 queue에 들어 있는 item 수(`uxMessagesWaiting`)입니다. take는 [`queue.c` L1655의 `xQueueSemaphoreTake()`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c#L1655)가 처리합니다. count가 0이고 timeout이 0이면 바로 `errQUEUE_EMPTY`를 돌려주고, timeout이 있으면 task를 event list에 넣고 block한 뒤 깨어나면 count를 다시 검사합니다. 이 경로는 [3-02](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)에서 줄 단위로 따라갑니다.

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

이는 초기 burst 최대 10개 뒤, token 보충률 기준으로 장기 평균 10개/초를 허용하는 token bucket입니다. 모든 1초 구간에 반드시 10개 이하라는 sliding-window 제한과는 다릅니다. bucket이 가득 찬 상태에서 timer가 give하면 위 실험의 binary처럼 `pdFALSE`가 돌아오고 그 token은 버려집니다. FreeRTOS software timer callback의 실제 시그니처는 `void cb(TimerHandle_t)`입니다.

## Semaphore vs Mutex — 핵심 차이

| | Semaphore | Mutex |
| --- | --- | --- |
| **Counter** | 0-N | 0/1 (recursive mutex는 중첩 횟수를 따로 셈) |
| **Owner** | 없음 (누구나 give) | 있음 (소유자만 unlock) |
| **사용처** | Signal, 자원 풀 | Mutual exclusion |
| **Priority Inheritance** | ✗ | ✓ |
| **Recursive** | ✗ | ✓ (선택) |
| **ISR Give** | ✓ | ✗ (owner가 task여야 함) |

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

(1)과 (2) 사이에 ISR이 give 하면 counter가 1이 되고, (2)에서 take가 가능합니다. Semaphore는 token을 기억하므로 이 순서 자체는 lost-wakeup이 아닙니다.

상태를 기억하지 않는 신호라면 이야기가 다릅니다. POSIX `pthread_cond_signal()`은 그 순간 기다리는 thread가 없으면 아무 일도 하지 않으므로, (1)과 (2) 사이에 온 signal은 사라집니다. 그래서 condition variable은 mutex를 쥔 채 predicate를 반복 검사하는 형태로만 씁니다. semaphore에서도 남는 함정은 위 실험의 binary 합쳐짐과 최대 count 도달입니다.

## Priority Inversion 가능

1. T_low가 semaphore token을 가져가 자원을 쓰는 중에 T_high가 take에서 기다립니다.
2. T_med가 ready가 되어 T_low를 선점합니다.
3. T_high는 *T_med가 끝날 때까지* 기다립니다(priority inversion).

FreeRTOS semaphore는 **PI를 하지 않습니다**. `xQueueSemaphoreTake()`는 queue 종류가 `queueQUEUE_IS_MUTEX`일 때만 holder를 기록하고(L1702-L1706) block 직전에 `xTaskPriorityInherit()`를 부릅니다(L1787-L1791). binary·counting semaphore는 이 분기를 타지 않습니다. 임계 자원이면 mutex를 씁니다. 실제로 inversion이 일어나는 모습은 [3-04](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)에서 QEMU로 봅니다.

## Static vs Dynamic

```c
// Dynamic — heap에서
SemaphoreHandle_t sem = xSemaphoreCreateBinary();

// Static — 컴파일 타임 메모리
StaticSemaphore_t sem_buf;
SemaphoreHandle_t sem = xSemaphoreCreateBinaryStatic(&sem_buf);
```

static 저장 공간은 객체가 사용되는 동안 살아 있어야 합니다. `vSemaphoreDelete()`는 static 객체의 저장 공간을 해제하지 않으므로, 지운 뒤 다시 쓰는 것은 호출자의 몫입니다.

## 자주 하는 실수

> ⚠️ Binary semaphore 초기값

`xSemaphoreCreateBinary()`는 초기값이 0입니다. `semphr.h`는 "must first be 'given' before it can be 'taken'"이라고 적고, 폐기된 `vSemaphoreCreateBinary()` 매크로는 반대로 첫 take가 통과하는 상태로 만들었다고 대비합니다([`semphr.h` L128-L134](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L128-L134)). 옛 코드를 옮길 때 이 차이로 첫 take가 영원히 block될 수 있습니다. available 상태로 시작하려면 다음 줄에 `xSemaphoreGive(sem)`을 넣어 줍니다.

> ⚠️ Mutex 대신 semaphore로 보호

semaphore로 자원을 보호하면 PI가 없어 Mars Pathfinder와 같은 구조의 inversion이 생깁니다. 임계 자원에는 mutex를 씁니다.

> ⚠️ Counting semaphore의 max 초과 give

`xSemaphoreCreateCounting(5, 5)` 후 추가 give는 실패를 반환하며 count는 5를 유지합니다. 아래 `semaphore-check.c`가 이 동작을 실제 커널로 확인합니다. 반환값을 무시하면 위 binary 실험처럼 이벤트가 조용히 사라집니다.

> ⚠️ Take/Give 짝 안 맞음

Semaphore는 짝을 검사하지 않습니다. 누구든 give할 수 있기 때문입니다. FreeRTOS mutex는 소유자가 아닌 task가 give하면 `xTaskPriorityDisinherit()`의 `configASSERT( pxTCB == pxCurrentTCB )`에 걸립니다([`tasks.c` L6755](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L6755)). 반대로 unlock을 잊는 쪽은 검사가 없어서, 다음 take가 영원히 기다리는 형태로만 드러납니다.

## 정리

- Semaphore는 **counter + wait list** 구조이며, Dijkstra의 P/V에서 출발했습니다.
- **Binary**(signal)와 **Counting**(resource pool) 두 종류가 있습니다.
- ISR에서 task로 signal을 보낼 때 씁니다. binary는 take 전의 give를 하나로 합칩니다(QEMU: give 3번 → take 1번).
- Mutex와 달리 owner가 없고 PI도 없으므로, 보호에는 mutex를 씁니다.
- 자원 풀, throttling, event counting에 활용합니다.

다음 편에서는 **Mutex 개념**으로 Ownership, Recursive, Priority Inheritance를 다룹니다.

## 검증과 1차 자료

[FreeRTOS V11.2.0 semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h)의 초기 상태·최대 count·FromISR 계약을 기준으로 합니다. 아래 named 함수는 공식 POSIX 포트의 controller task 안에서 실행하는 host 검사입니다.

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

저장소의 `scripts/verify-rtos-ipc-examples.mjs`가 이 함수를 본문에서 추출하고 공식 kernel과 링크해 실행합니다. `FREERTOS_KERNEL_DIR`에 V11.2.0 소스를 주고 돌리면 `PASS actual FreeRTOS V11.2.0 POSIX: binary/counting full-empty, ...`을 출력합니다. 합쳐짐 실험은 앞 절의 QEMU 실행이고, 나머지 API 조각은 플랫폼 선언과 초기화가 필요합니다.

## 관련 항목

- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-02: Semaphore 내부 구현](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
