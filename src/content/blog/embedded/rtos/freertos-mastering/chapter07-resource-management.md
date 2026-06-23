---
title: "Ch 7: Resource Management"
date: 2026-05-09T07:00:00
description: "critical section·mutex + PI·gatekeeper — 공유 자원 보호와 priority inversion."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 7
tags: [freertos, mutex, semaphore, priority-inversion]
type: book-review
bookTitle: "Mastering the FreeRTOS Real Time Kernel"
bookAuthor: "Richard Barry"
draft: true
---

## 한 줄 요약

> **"공유 자원 보호의 5단계 — *critical section, scheduler suspension, mutex (priority inheritance 포함), gatekeeper task, counting semaphore*. 잘못된 도구는 *priority inversion으로 시스템을 멈춥니다*."**

여러 태스크가 *같은 변수·페리퍼럴·데이터 구조*를 만지면 *경쟁 조건*이 생깁니다. FreeRTOS는 *여러 보호 수단*을 제공하는데, *수단이 다르면 비용도 다르고 함정도 다릅니다*. *언제 어떤 도구를 쓸지*가 이 장의 본질이고, *priority inversion*이 그 결정의 중심에 있습니다.

이번 장에서는 *critical section과 그 한계*, *scheduler suspension*, *mutex + priority inheritance*, *recursive mutex*, *counting semaphore*, *gatekeeper task 패턴*, *priority inversion의 메커니즘과 회피*를 다룹니다.

## 보호 수단의 5단계

왼쪽일수록 차단이 강합니다 — *대부분의 정답*은 **mutex**.

| 수단 | IRQ | 스케줄러 | ISR 동작 |
|------|-----|----------|---------|
| critical section | off | (해당 없음) | 차단됨 |
| scheduler suspend | on | off | 동작 |
| mutex | on | on | 동작 |
| counting semaphore | on | on | 동작 |
| gatekeeper task | on | on | 동작 |

선택 원칙은 단순합니다.

| 상황 | 권장 수단 |
|------|----------|
| 변수 1 – 2 word 단위 짧은 update | critical section |
| 공유 자료구조 짧은 read-modify-write | critical section 또는 mutex |
| 긴 작업 (수십 – 수백 μs) | mutex |
| 복수 인스턴스 (pool of 4 buffers 등) | counting semaphore |
| 복잡한 자원 (UART, file system 등) | gatekeeper task |

## Critical Section — IRQ까지 막는 가장 강한 잠금

```c
void taskENTER_CRITICAL(void);
void taskEXIT_CRITICAL(void);

void taskENTER_CRITICAL_FROM_ISR(void);
void taskEXIT_CRITICAL_FROM_ISR(void);
```

`taskENTER_CRITICAL`은 *`configMAX_SYSCALL_INTERRUPT_PRIORITY` 이하 우선순위의 IRQ를 모두 차단*하고 *현재 태스크 안에서 코드를 직선 실행*합니다.

```c
static uint64_t g_counter;

void prvIncrement(void)
{
    taskENTER_CRITICAL();
    g_counter += 1;             /* 64-bit on 32-bit MCU — non-atomic */
    taskEXIT_CRITICAL();
}
```

**Critical section의 cost**

- 매우 짧음 (수십 ns)
- 임계 구역 길이만큼 RTOS·인터럽트 latency 증가
- `configMAX_SYSCALL_INTERRUPT_PRIORITY` 이상 IRQ는 영향 없음

**규칙**

- 가능한 한 짧게 (`printf`, 큰 루프 금지)
- 안에서 RTOS API 호출 금지 (block 발생 시 deadlock)
- 중첩 가능 (counter로 관리)

ISR 안에서 같은 변수를 만지면 *`taskENTER_CRITICAL_FROM_ISR`*을 씁니다.

## Scheduler Suspension — IRQ는 살리고 task switch만 차단

```c
void vTaskSuspendAll(void);
BaseType_t xTaskResumeAll(void);
```

*인터럽트는 그대로 받고*, *태스크 전환만 막습니다*. critical section보다 *부드러운 잠금*이라 *긴 read-only 순회* 같은 데 적합합니다.

```c
vTaskSuspendAll();
{
    /* IRQ는 동작, 태스크 전환 안 됨 */
    iterate_large_list(/* read only */);
}
xTaskResumeAll();
```

ISR이 *현재 태스크의 데이터를 만지지 않는다면* 이걸로 충분합니다.

## Mutex — Priority Inheritance 내장

```c
SemaphoreHandle_t xMutex = xSemaphoreCreateMutex();
BaseType_t xSemaphoreTake(SemaphoreHandle_t xMutex, TickType_t xTicksToWait);
BaseType_t xSemaphoreGive(SemaphoreHandle_t xMutex);
```

뮤텍스는 *take/give로 한 태스크만 임계 구역에 들어가게 합니다*. *FreeRTOS의 뮤텍스는 priority inheritance를 자동으로 수행*합니다 (Binary semaphore와의 핵심 차이).

```c
SemaphoreHandle_t xSpiMutex;

void prvUseSpi(void)
{
    if(xSemaphoreTake(xSpiMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        spi_transfer(...);                  /* 임계 구역 */
        xSemaphoreGive(xSpiMutex);
    } else {
        /* 100ms 안에 못 잡음 — 다른 처리 */
    }
}
```

**Mutex 특징**

- take 한 태스크만 give 가능
- priority inheritance 자동
- recursive 불가 (같은 태스크가 두 번 take 시 deadlock)
- 더 무거운 cost (priority 추적 때문)

## Priority Inversion — 문제와 해결

**시나리오 — priority inversion (mutex 없는 경우의 위험)**

High(3), Mid(2), Low(1) 세 태스크가 한 자원을 두고 경합. Low가 자원 보유, High가 그 자원을 기다리는 사이 Mid가 깨어나 Low를 선점합니다. 결과는 *unbounded inversion* — Mid가 끝날 때까지 High도 무한 대기.

![Priority Inversion — mutex 없는 경우](/images/blog/freertos-mastering/diagrams/ch07-priority-inversion.svg)

**유명 사건**: Mars Pathfinder (1997) reset의 원인.

**시나리오 — priority inheritance (FreeRTOS mutex의 동작)**

Low가 mutex를 보유하는 동안 *임시로 priority 3으로 상승*합니다. Mid는 우선순위가 낮아 끼어들 수 없습니다. Low가 give하는 즉시 priority 1로 복귀하고 High가 mutex를 획득합니다.

![Priority Inheritance — FreeRTOS mutex 동작](/images/blog/freertos-mastering/diagrams/ch07-priority-inheritance.svg)

priority inheritance는 *완전한 해결책*은 아닙니다. *복수 자원의 chained inversion*이나 *deadlock*은 여전히 가능합니다. *그래도 단일 자원의 unbounded inversion은 차단*하므로 *현실에서 충분히 강력*합니다.

## Binary Semaphore vs Mutex

같은 `SemaphoreHandle_t` 타입을 쓰지만 *생성 API가 다르고 의미가 다릅니다*.

```c
xSemaphoreCreateBinary();        /* binary semaphore */
xSemaphoreCreateMutex();         /* mutex */
xSemaphoreCreateCounting(...);   /* counting semaphore */
xSemaphoreCreateRecursiveMutex();/* recursive mutex */
```

| 항목 | Binary Semaphore | Mutex |
|------|----------------|-------|
| 목적 | 시그널링 (ISR → task) | 자원 보호 |
| Priority inheritance | 없음 | 있음 |
| Take/Give 짝 | 다른 태스크/ISR끼리 가능 | *take한 태스크만 give 가능* |
| 초기 상태 | 비어 있음 (take 시 block) | 가득 (즉시 take 가능) |

*"공유 자원 보호 = mutex"*, *"이벤트 시그널링 = binary semaphore"*가 원칙입니다.

## Recursive Mutex — 재진입 허용

같은 태스크가 *같은 mutex를 여러 번 take*할 수 있어야 하는 경우 사용합니다. *take 횟수만큼 give*해야 풀립니다.

```c
SemaphoreHandle_t xRMutex = xSemaphoreCreateRecursiveMutex();

void prvOuter(void) {
    xSemaphoreTakeRecursive(xRMutex, portMAX_DELAY);
    prvInner();        /* 안에서 또 take 가능 */
    xSemaphoreGiveRecursive(xRMutex);
}

void prvInner(void) {
    xSemaphoreTakeRecursive(xRMutex, portMAX_DELAY);   /* same task — OK */
    /* ... */
    xSemaphoreGiveRecursive(xRMutex);
}
```

**Recursive mutex의 cost**

- 일반 mutex보다 무거움 (take count 추적)
- 신중히 — 일반적으로 recursive는 설계의 신호 약화
- 정말 필요한 경우에만 (재귀 호출 / 같은 lock으로 보호되는 함수 끼리)

가능하면 *코드 구조 개편*으로 *재진입을 없애는 방향*이 권장됩니다.

## Counting Semaphore — 복수 인스턴스 자원

자원이 *N개* 있고 N명까지 동시 점유를 허용하려면 counting semaphore입니다.

```c
#define POOL_SIZE 4
static uint8_t buffer_pool[POOL_SIZE][1024];
static SemaphoreHandle_t xPoolSem;

void init(void) {
    xPoolSem = xSemaphoreCreateCounting(POOL_SIZE, POOL_SIZE);
}

uint8_t *acquire_buffer(TickType_t timeout)
{
    if(xSemaphoreTake(xPoolSem, timeout) == pdPASS) {
        /* 슬롯을 찾아 점유 */
        for(int i = 0; i < POOL_SIZE; i++) {
            if(try_claim(i)) return buffer_pool[i];
        }
    }
    return NULL;
}

void release_buffer(uint8_t *buf) {
    mark_free(buf);
    xSemaphoreGive(xPoolSem);
}
```

ISR 발생 횟수를 *세어* 처리할 때도 적합합니다 — counting semaphore에 *give로 누적*, 태스크가 *take로 한 건씩 처리*.

## Gatekeeper Task — 공유 자원을 한 태스크가 독점

복잡한 페리퍼럴 (UART, file system, GPRS modem)을 *어떤 태스크라도 만질 수 있게* 하면 *임계 구역이 너무 길어집니다*. 더 깔끔한 패턴은 *한 태스크만 그 자원을 만지고 다른 태스크는 큐로 부탁*하는 것입니다.

```c
typedef struct {
    enum { PRINT_LINE, PRINT_HEX } op;
    union {
        const char *line;
        uint32_t    hex;
    };
} PrintReq_t;

static QueueHandle_t xPrintQ;

void prvPrintGatekeeper(void *pv)
{
    PrintReq_t req;
    for(;;) {
        if(xQueueReceive(xPrintQ, &req, portMAX_DELAY) == pdPASS) {
            switch(req.op) {
                case PRINT_LINE: uart_send_line(req.line);   break;
                case PRINT_HEX:  uart_send_hex(req.hex);     break;
            }
        }
    }
}

/* 다른 태스크에서 */
void log_line(const char *s) {
    PrintReq_t r = { .op = PRINT_LINE, .line = s };
    xQueueSend(xPrintQ, &r, pdMS_TO_TICKS(100));
}
```

gatekeeper의 장점은 *경쟁 자체가 없어진다*는 것입니다. *UART는 한 태스크만 만지므로* mutex가 필요 없습니다. 사용자는 *비동기 큐 send*로 만족하고 *블로킹·실패 처리는 timeout으로* 표현합니다.

**Gatekeeper 패턴 요약**

장점:

- 임계 구역 자체가 없음 (자원 = 한 태스크의 사유물)
- 호출 측은 모두 비동기 (큐 send) — fire-and-forget 또는 timeout
- UART·LCD·NV memory처럼 직렬 자원에 자연스러움

단점:

- 큐 + 태스크 1개 RAM cost
- 응답이 비동기 (반환값 필요하면 별도 채널)

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| mutex로 시그널링 (ISR→task) | 의미 오용 | binary semaphore 사용 |
| binary semaphore로 자원 보호 | PI 없음 → priority inversion | mutex 사용 |
| mutex deadlock | 같은 태스크가 두 번 take | recursive mutex 또는 설계 수정 |
| critical section 안에 printf | 임계 구역 매우 길어짐 | 바깥에서 출력 |
| xSemaphoreTake(mutex, 0)으로 항상 fail | 다른 태스크가 길게 잡고 있음 | 홀딩 시간 감소·portMAX_DELAY로 |
| priority inversion이 의심됨 | binary semaphore 사용 | mutex로 교체 |
| counting semaphore의 max count 너무 작음 | waiter들이 모두 timeout | 자원 수만큼 max로 |
| gatekeeper 큐 가득 참 | consumer 못 따라감 | consumer priority↑·큐 깊이↑ |
| take 후 give 빼먹음 | 영구 lock | RAII 패턴 (대안: cleanup 매크로) |
| ISR에서 mutex take | 불가 (PI는 task 컨텍스트 전용) | ISR↔task 다리는 semaphore로 |

## 정리

- *공유 자원 보호의 도구는 5가지*입니다. *critical section, scheduler suspension, mutex, counting semaphore, gatekeeper*. 도구가 다르면 *비용·차단 범위·용도*가 다릅니다.
- *Critical section*은 *가장 강한 차단*이고 *가장 짧게* 써야 합니다. 안에서 RTOS API 호출 금지입니다.
- *Mutex*는 *priority inheritance 자동*이라 *priority inversion을 차단*합니다. *공유 자원 보호 = mutex*가 원칙입니다.
- *Binary semaphore*는 *시그널링용*입니다. *PI가 없으므로 자원 보호에 쓰면 위험*합니다.
- *Recursive mutex*는 *같은 태스크의 재진입을 허용*합니다. 더 무거우니 *정말 필요할 때만* 씁니다.
- *Counting semaphore*는 *복수 인스턴스 자원·ISR 카운트*에 적합합니다.
- *Gatekeeper task*는 *한 태스크가 자원을 사유화*하고 *다른 태스크는 큐로 부탁*합니다. UART·LCD·로깅 같은 직렬 자원에 깔끔합니다.
- *Priority inversion*은 *낮은 우선순위가 자원을 잡고 있고 중간 우선순위가 CPU를 잡으면 높은 우선순위가 무한 지연되는 현상*입니다. *mutex의 PI*가 단일 자원의 unbounded inversion을 막습니다.

## 다음 편

이 장은 FreeRTOS 핵심 시리즈의 마지막 chapter입니다. 다음 시리즈로는 *[Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface)*에서 *스케줄러·큐·뮤텍스의 내부 구현*을 코드로 풀어 보고, *[Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface)*에서 *실전 패턴 모음*을 다룹니다.

## 관련 항목

- [Ch 3: Task Management](/blog/embedded/rtos/freertos-mastering/chapter03-task-management) — 우선순위 모델
- [Ch 4: Queue Management](/blog/embedded/rtos/freertos-mastering/chapter04-queue-management) — 뮤텍스도 내부적으로 큐
- [Ch 6: Interrupt Management](/blog/embedded/rtos/freertos-mastering/chapter06-interrupt-management) — ISR↔task 시그널링
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — PI 구현 내부
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — gatekeeper·디바운스 등
- [원문 — FreeRTOS Resource Management](https://www.freertos.org/a00113.html)
- [원문 — Priority Inversion (Mars Pathfinder)](https://www.rapitasystems.com/blog/what-really-happened-software-mars-pathfinder-spacecraft)
