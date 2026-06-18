---
title: "RTOS Queue 활용 — By-Value·By-Reference·Timeout 패턴"
date: 2026-04-15T09:05:00
description: "RTOS queue로 producer-consumer를 구성하고, by-value vs by-pointer, backpressure, zero-copy queue까지 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 68
tags: [recipes, rtos, queue]
---

## 한 줄 요약

> **"Queue는 producer가 데이터를 *복사해 넣고* consumer가 *복사해 꺼내는* FIFO입니다."** 작은 데이터는 by-value, 큰 데이터는 by-pointer가 표준입니다.

## 어떤 상황에서 쓰나

ISR이 ADC 샘플을 받아 task에 넘기고, BLE stack이 packet을 application에 전달하고, sensor task가 측정값을 logger에 보내는 모든 흐름이 queue입니다. Semaphore는 신호만 전달하지만 queue는 데이터까지 같이 보냅니다.

선택지가 있는 부분은 *얼마나 큰 데이터를 어떻게 넘길지*입니다. 항상 by-value로 보내면 큰 buffer를 매번 복사하느라 CPU가 새고, 항상 by-pointer로 보내면 lifetime과 ownership을 잘못 설계해 use-after-free가 발생합니다.

## 핵심 개념

| API | 동작 |
|-----|------|
| `xQueueCreate(N, sizeof(T))` | N개 슬롯, 항목 크기 `sizeof(T)` |
| `xQueueSend` | 뒤에 추가 (by value, 복사) |
| `xQueueSendToFront` | 앞에 추가 (긴급 신호) |
| `xQueueReceive` | 앞에서 제거 (by value, 복사) |
| `xQueuePeek` | 제거하지 않고 읽기 |

Queue는 내부에서 `memcpy(slot, &item, sizeof(T))`를 합니다. 그래서 `sizeof(T)`가 크면 send 비용이 그만큼 늘어납니다.

| 방식 | 적합한 경우 |
|------|------------|
| by-value | T가 32 B 이하 — 단순, 안전, lifetime 걱정 없음 |
| by-pointer | T가 큼 — pool에서 받아 pointer만 send |
| zero-copy | DMA buffer를 미리 할당, index만 queue로 전달 |

Backpressure는 queue가 full일 때 producer가 어떻게 행동할지의 정책입니다. block, drop, replace 세 가지 중 선택합니다.

## 코드 / 실제 사용 예

### By-value (작은 메시지)

```c
typedef struct { uint32_t ts; int16_t x, y, z; } sample_t;
QueueHandle_t samples;

void task_imu(void *arg) {
    sample_t s;
    for (;;) {
        read_accel(&s.x, &s.y, &s.z);
        s.ts = xTaskGetTickCount();
        if (xQueueSend(samples, &s, 0) != pdTRUE)
            stats.drop++;        /* full이면 즉시 drop */
    }
}

void task_logger(void *arg) {
    sample_t s;
    for (;;) {
        xQueueReceive(samples, &s, portMAX_DELAY);
        log_sample(&s);
    }
}

int main(void) {
    samples = xQueueCreate(64, sizeof(sample_t));
}
```

10 byte 정도의 sample은 by-value가 가장 단순합니다. lifetime 걱정이 없고 send 후 sender의 stack은 자유롭게 재사용할 수 있습니다.

### By-pointer (큰 메시지)

```c
typedef struct { uint8_t data[1024]; size_t len; } pkt_t;

QueueHandle_t pkt_q;
static pkt_t pool[8];
SemaphoreHandle_t pool_sem;

pkt_t *pkt_alloc(void) {
    if (xSemaphoreTake(pool_sem, 0) != pdTRUE) return NULL;
    /* free list에서 하나 가져오기 */
    return pool_pop();
}

void pkt_free(pkt_t *p) {
    pool_push(p);
    xSemaphoreGive(pool_sem);
}

void task_rx(void *arg) {
    for (;;) {
        pkt_t *p = pkt_alloc();
        radio_read(p->data, &p->len);
        xQueueSend(pkt_q, &p, portMAX_DELAY);   /* pointer 한 word만 복사 */
    }
}

void task_parse(void *arg) {
    pkt_t *p;
    for (;;) {
        xQueueReceive(pkt_q, &p, portMAX_DELAY);
        parse(p);
        pkt_free(p);
    }
}
```

1 KB의 packet을 매번 복사하면 32-bit ARM에서도 수 µs가 듭니다. Pool에서 미리 할당해두고 pointer만 send하면 send 비용이 4 byte로 떨어집니다. 대신 lifetime을 명확히 관리해야 합니다.

### ISR에서 send

```c
void UART_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    uint8_t byte = USART1->DR;
    xQueueSendFromISR(rx_q, &byte, &hp);
    portYIELD_FROM_ISR(hp);
}
```

`*FromISR`을 잊으면 critical section이 어긋납니다. ISR이 byte 단위로 push하고 task가 line 단위로 처리하는 패턴이 매우 흔합니다.

### Backpressure 정책 비교

```c
/* drop on full — sender가 빠를 때 */
xQueueSend(q, &item, 0);

/* block on full — sender가 늦춰져도 됨 */
xQueueSend(q, &item, portMAX_DELAY);

/* replace on full — 최신 값만 의미 있음 */
xQueueOverwrite(latest_q, &item);    /* length=1 queue에만 */
```

센서 stream처럼 손실해도 되는 데이터는 drop이 적절합니다. command queue는 block이, "현재 값"만 의미 있는 telemetry는 overwrite가 적절합니다.

### Queue set으로 다중 입력 대기

```c
QueueSetHandle_t qs = xQueueCreateSet(20);
xQueueAddToSet(cmd_q, qs);
xQueueAddToSet(timer_q, qs);

void task_dispatch(void *arg) {
    for (;;) {
        QueueHandle_t active = xQueueSelectFromSet(qs, portMAX_DELAY);
        if (active == cmd_q) {
            cmd_t c; xQueueReceive(cmd_q, &c, 0);
            handle_cmd(&c);
        } else if (active == timer_q) {
            tick_t t; xQueueReceive(timer_q, &t, 0);
            handle_tick(&t);
        }
    }
}
```

여러 queue를 동시에 기다리는 패턴입니다. Linux의 `epoll`에 해당합니다. 다만 queue set은 memory를 더 쓰니 정말 필요할 때만 씁니다.

### Stream buffer (가변 길이)

```c
StreamBufferHandle_t sb = xStreamBufferCreate(1024, 1);

/* sender — 가변 길이 byte stream */
xStreamBufferSend(sb, "hello\n", 6, 0);

/* receiver */
char buf[64];
size_t n = xStreamBufferReceive(sb, buf, sizeof(buf), portMAX_DELAY);
```

UART나 USB CDC처럼 byte 단위로 들어오는 stream에는 queue보다 stream buffer가 자연스럽습니다.

## 측정 / 성능 비교

```text
연산                              시간 (Cortex-M4 72 MHz)
xQueueSend (sizeof 12 B)          1.4 µs
xQueueSend (sizeof 256 B)         3.2 µs  ← memcpy 비용
xQueueSend (pointer only, 4 B)    1.1 µs
xQueueReceive (block → wake)      6.8 µs
xStreamBufferSend (32 B)          1.3 µs
```

대형 메시지를 by-value로 보내면 send 비용이 빠르게 증가합니다. 64 byte를 넘으면 pointer 방식을 검토할 가치가 있습니다.

```text
RAM 사용량
queue (N=64, item 12 B)           Queue 구조 + 768 B
queue (N=8, pointer 4 B)          Queue 구조 + 32 B + pool 8 KB
```

By-pointer는 pool RAM이 별도로 필요하지만, 전체로 보면 비슷하거나 더 작은 경우가 많습니다.

## 자주 보는 함정

> Lifetime 관리 실패 (by-pointer)

```c
void send_msg(void) {
    char buf[64];               /* stack */
    sprintf(buf, "hello");
    xQueueSend(q, &buf, 0);     /* receiver가 받기 전에 buf 소멸 */
}
```

Stack 변수의 pointer를 send하면 receiver가 garbage를 읽습니다. Pool 또는 static buffer에서만 보내야 합니다.

> Pool exhaustion 무시

```c
pkt_t *p = pkt_alloc();
xQueueSend(q, &p, 0);    /* p가 NULL이면 receiver crash */
```

Pool이 비면 alloc이 NULL을 돌려줍니다. 항상 check하고 backpressure 처리를 정의해둡니다.

> sizeof 실수

```c
QueueHandle_t q = xQueueCreate(64, sizeof(pkt_t *));   /* 4 B per slot */
pkt_t p;
xQueueSend(q, &p, 0);    /* by-value인 줄 알았다면 첫 4 byte만 복사됨 */
```

Create와 send/receive의 sizeof가 어긋나면 silent corruption이 발생합니다. by-pointer queue임을 명시적으로 표시합니다.

> Full에서 portMAX_DELAY로 sender block

```c
xQueueSend(q, &item, portMAX_DELAY);   /* consumer가 죽으면 producer도 영구 block */
```

Backpressure 정책 없이 무한 대기하면 cascading failure가 발생합니다. timeout과 drop counter를 함께 둡니다.

## 정리

- Queue는 by-value memcpy가 기본입니다. sizeof가 클수록 send 비용이 늘어납니다.
- 64 byte 이상은 by-pointer + pool 패턴이 거의 항상 더 빠릅니다.
- ISR은 `xQueueSendFromISR`과 `portYIELD_FROM_ISR`을 함께 씁니다.
- Backpressure 정책(block, drop, replace)을 코드 단위로 명시합니다.
- Queue set은 여러 입력을 한 task에서 대기할 때 씁니다.
- Stream buffer는 byte stream에, queue는 record 단위에 적합합니다.
- By-pointer는 lifetime과 pool exhaustion을 항상 확인합니다.

다음 편은 **Event Group**입니다. 여러 비트로 multi-condition wait을 다룹니다.

## 관련 항목

- [PRTOS 1-09: Queues](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [PRTOS 3-07: Queue Implementation](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [PRTOS 3-11: Stream/Message Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)
- [2-02: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part9-01-lock-free-ring)
- [6-07: Event Group](/blog/embedded/modern-recipes/part6-07-event-group)
