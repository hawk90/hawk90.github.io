---
title: "RTOS Queue 활용 — By-Value·By-Reference·Timeout 패턴"
slug: "embedded/modern-recipes/part6-06-queue-usage"
date: 2026-04-15T09:05:00
description: "RTOS queue로 producer-consumer를 구성하고, by-value vs by-pointer, backpressure, zero-copy queue까지 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 68
tags: [recipes, rtos, queue]
topics: ["embedded"]
---

## 한 줄 요약

> **"Queue는 producer가 데이터를 *복사해 넣고* consumer가 *복사해 꺼내는* FIFO입니다."** 복사 비용이 item 크기에 비례하므로, 큰 데이터는 pool의 pointer만 넣는 by-pointer로 보냅니다.

## 어떤 상황에서 쓰나

ISR이 받은 byte를 task에 넘기거나, sensor task가 측정값을 logger task에 보낼 때 queue를 씁니다. semaphore는 "일어났다"는 신호만 전하고, queue는 데이터도 함께 보냅니다.

실행 환경은 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)과 같습니다(FreeRTOS V11.2.0 `ARM_CM3` + `heap_4`, QEMU 11.1.3 `mps2-an385` `-icount shift=5`). 아래 코드 중 `read_accel()`, `radio_read()`, `pool_pop()` 같은 함수는 애플리케이션 함수이고, 실행한 코드는 "측정" 절에 있습니다.

정할 것은 데이터를 복사해 넣을지(by-value), 다른 곳에 둔 데이터의 pointer만 넣을지(by-pointer)입니다. by-value는 item 크기만큼 매번 복사하고, by-pointer는 데이터가 언제까지 살아 있어야 하는지를 코드가 지켜야 합니다.

## 핵심 개념

| API | 동작 |
|-----|------|
| `xQueueCreate(N, sizeof(T))` | N개 슬롯, 항목 크기 `sizeof(T)` |
| `xQueueSend` | 뒤에 추가 (by value, 복사) |
| `xQueueSendToFront` | 앞에 추가 (긴급 신호) |
| `xQueueReceive` | 앞에서 제거 (by value, 복사) |
| `xQueuePeek` | 제거하지 않고 읽기 |

`queue.c`의 `prvCopyDataToQueue()`는 `memcpy( pxQueue->pcWriteTo, pvItemToQueue, pxQueue->uxItemSize )`로 넣고, 꺼낼 때도 `uxItemSize`만큼 `memcpy`합니다. send와 receive가 각각 item 크기만큼 복사합니다.

| 방식 | 적합한 경우 |
|------|------------|
| by-value | item이 작을 때. 복사본이 queue에 있으므로 보낸 쪽 변수는 바로 다시 써도 됨 |
| by-pointer | item이 클 때. pool에서 받은 buffer의 pointer(4 B)만 넣음 |
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

`sample_t`는 12 B입니다(정렬 포함). 복사본이 queue에 들어가므로 send 뒤 `s`를 바로 다시 채워도 됩니다.

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

queue에는 pointer 4 B만 복사됩니다. 대신 buffer는 받는 쪽이 `pkt_free()`할 때까지 보낸 쪽이 건드리지 않아야 하고, pool이 비면 `pkt_alloc()`이 NULL을 돌려주므로 받는 쪽처럼 확인해야 합니다(위 `task_rx`는 그 확인을 생략한 발췌입니다).

### ISR에서 send

```c
void UART_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    uint8_t byte = USART1->DR;
    xQueueSendFromISR(rx_q, &byte, &hp);
    portYIELD_FROM_ISR(hp);
}
```

ISR에서는 `FromISR` 변종을 씁니다. 일반 `xQueueSend()`를 ISR에서 부르면 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)의 실행처럼 port의 `configASSERT`에 걸립니다.

### Backpressure 정책 비교

```c
/* drop on full — sender가 빠를 때 */
xQueueSend(q, &item, 0);

/* block on full — sender가 늦춰져도 됨 */
xQueueSend(q, &item, portMAX_DELAY);

/* replace on full — 최신 값만 의미 있음 */
xQueueOverwrite(latest_q, &item);    /* length=1 queue에만 */
```

잃어도 되는 sample stream은 drop, 잃으면 안 되는 command는 block, 최신 값 하나만 의미 있는 상태값은 overwrite를 씁니다. `queue.h`는 `xQueueOverwrite()`를 "Only for use with queues that have a length of one"이라고 적습니다.

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

한 task가 여러 queue를 동시에 기다립니다. `configUSE_QUEUE_SETS`를 1로 두어야 쓸 수 있고, queue set 자체가 handle을 담는 queue(여기서는 20칸)이므로 그만큼 heap을 더 씁니다.

### Stream buffer (가변 길이)

```c
StreamBufferHandle_t sb = xStreamBufferCreate(1024, 1);

/* sender — 가변 길이 byte stream */
xStreamBufferSend(sb, "hello\n", 6, 0);

/* receiver */
char buf[64];
size_t n = xStreamBufferReceive(sb, buf, sizeof(buf), portMAX_DELAY);
```

byte 단위로 들어오는 stream은 stream buffer로 받으면 byte마다 queue item을 쓰지 않고 한 번에 여러 byte를 꺼냅니다. `xStreamBufferCreate()`의 두 번째 인자는 받는 task를 깨우는 trigger level(byte)입니다.

## 측정

### item 크기와 비용

64칸 queue를 item 4 B(pointer), 12 B, 64 B, 256 B로 만들어 heap 사용량을 재고, 각각 send+receive를 20,000번 해서 지난 tick을 셌습니다.

```c
/* qcost.c: heap cost and send+receive time per item size.
   Time is QEMU icount virtual time (instruction-count based), not board time. */
#include <string.h>
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

static uint8_t item[256];

static void run(size_t size, int n) {
    size_t h0 = xPortGetFreeHeapSize();
    QueueHandle_t q = xQueueCreate(64, size);
    size_t used = h0 - xPortGetFreeHeapSize();
    TickType_t t0 = xTaskGetTickCount();
    for (int i = 0; i < n; i++) {                  /* send + receive, no blocking */
        xQueueSend(q, item, 0);
        xQueueReceive(q, item, 0);
    }
    TickType_t dt = xTaskGetTickCount() - t0;
    pr("item %3u B: heap %5u B for 64 slots, %u send+receive pairs took %u ticks\n",
       (unsigned)size, (unsigned)used, n, (unsigned)dt);
    vQueueDelete(q);
}

static void t(void *a) {
    (void)a;
    run(4, 20000);      /* a pointer */
    run(12, 20000);
    run(64, 20000);
    run(256, 20000);
    hosted_exit(0);
}

int main(void) {
    xTaskCreate(t, "t", 512, NULL, 1, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```text
item   4 B: heap   344 B for 64 slots, 20000 send+receive pairs took 133 ticks
item  12 B: heap   856 B for 64 slots, 20000 send+receive pairs took 175 ticks
item  64 B: heap  4184 B for 64 slots, 20000 send+receive pairs took 442 ticks
item 256 B: heap 16472 B for 64 slots, 20000 send+receive pairs took 1426 ticks
```

heap은 64 × item 크기에 queue 구조체와 heap_4 header를 더한 값입니다(4 B: 256 + 88 = 344). 시간은 QEMU icount의 명령 수 기반 가상 시간이라 보드의 시간이 아니고, 이 harness의 `memcpy`는 한 byte씩 복사하므로 word 단위로 복사하는 C 라이브러리보다 크기에 따른 증가가 가파릅니다. 그래도 item 크기가 커질수록 send+receive 비용이 복사량에 따라 늘어나는 모양은 그대로이고, 4 B와 256 B 사이가 약 10.7배였습니다.

### create와 send의 크기가 다를 때

```c
/* mismatch.c: a queue created for pointers, sent a whole struct */
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
extern void pr(const char *, ...); extern void hosted_exit(int);
typedef struct { uint32_t a, b, c; } pkt_t;
static void t(void *arg) {
    (void)arg;
    QueueHandle_t q = xQueueCreate(4, sizeof(pkt_t *));   /* 4-byte slots */
    pkt_t in = {0x11111111, 0x22222222, 0x33333333}, out = {0, 0, 0};
    xQueueSend(q, &in, 0);                                /* copies 4 bytes */
    xQueueReceive(q, &out, 0);
    pr("out = %x %x %x\n", (unsigned)out.a, (unsigned)out.b, (unsigned)out.c);
    hosted_exit(0);
}
int main(void) { xTaskCreate(t, "t", 256, NULL, 1, NULL); vTaskStartScheduler(); return 0; }
```

```text
out = 11111111 0 0
```

queue는 만들 때 정한 `uxItemSize`(4 B)만 복사하므로 12 B 구조체의 첫 field만 건너갔습니다. 컴파일러는 이 차이를 잡지 못합니다.

## 자주 보는 함정

> Lifetime 관리 실패 (by-pointer)

```c
void send_msg(void) {
    char buf[64];               /* stack */
    sprintf(buf, "hello");
    xQueueSend(q, &buf, 0);     /* receiver가 받기 전에 buf 소멸 */
}
```

pointer queue에 stack 변수의 주소를 넣으면, 함수가 돌아간 뒤에는 그 stack 영역을 다른 호출이 덮어쓰므로, 받는 task는 덮어쓴 값을 읽습니다. pointer로 보내는 buffer는 pool이나 static에서 가져옵니다.

> Pool exhaustion 무시

```c
pkt_t *p = pkt_alloc();
xQueueSend(q, &p, 0);    /* p가 NULL이면 receiver crash */
```

pool이 비면 `pkt_alloc()`이 NULL을 돌려주고, 받는 쪽은 NULL을 역참조합니다. 보내기 전에 확인하고, pool이 빈 경우의 정책(drop, 대기)을 정합니다.

> sizeof 실수

```c
QueueHandle_t q = xQueueCreate(64, sizeof(pkt_t *));   /* 4 B per slot */
pkt_t p;
xQueueSend(q, &p, 0);    /* by-value인 줄 알았다면 첫 4 byte만 복사됨 */
```

위 측정처럼 앞 4 B만 복사되고 나머지는 조용히 빠집니다. pointer queue는 이름이나 typedef로 표시합니다.

> Full에서 portMAX_DELAY로 sender block

```c
xQueueSend(q, &item, portMAX_DELAY);   /* consumer가 죽으면 producer도 영구 block */
```

consumer가 멈추면 producer도 queue가 찬 시점에 영원히 멈춥니다. timeout을 두고 실패를 셉니다.

## 정리

- Queue는 send·receive 때 **item 크기만큼 memcpy**합니다. 위 측정에서 4 B → 256 B로 비용이 약 10.7배, heap이 344 → 16,472 B가 되었습니다.
- 큰 record는 by-pointer + pool. 이때 buffer의 수명과 pool 고갈을 코드가 지켜야 합니다.
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
