---
title: "3-11: Stream Buffer와 Message Buffer — FreeRTOS 10의 Lock-Free SPSC"
date: 2026-05-07T08:00:00
description: "FreeRTOS 10+ 추가된 Stream/Message Buffer. Lock-free SPSC ring buffer로 queue보다 10배 빠른 IPC. ISR-safe variant, byte stream vs variable-length frame의 선택."
series: "Practical RTOS Internals"
seriesOrder: 32
tags: [stream-buffer, message-buffer, freertos, ipc, lock-free, spsc]
---

## 한 줄 요약

> **"Single producer + single consumer면 lock이 필요 없습니다."** — Stream Buffer는 그 가정을 받아들이는 대신 queue보다 *훨씬 빠른* IPC를 제공합니다.

## 어떤 문제를 푸는가

FreeRTOS의 `xQueue` 계열은 *general-purpose IPC*입니다. Multi-producer·multi-consumer를 모두 지원하기 위해 내부적으로 *critical section*과 *task notification*을 두루 씁니다. 한 번의 send/receive에 *수백 ns에서 μs* 가 들어갑니다.

그런데 임베디드에서 흔한 패턴은 *훨씬 단순*합니다.

- UART RX ISR → 데이터를 어떤 task에 넘기는 한 방향 스트림
- ADC DMA complete → consumer task 하나가 처리
- Sensor producer task → logger task 하나가 기록

생산자가 *하나*, 소비자가 *하나*입니다. 이 조건에서는 *lock이 필요 없는 ring buffer*만으로 충분합니다. Head와 tail 두 인덱스만 *atomic하게* 갱신하면 됩니다.

FreeRTOS 10(2017)이 추가한 *Stream Buffer*와 *Message Buffer*가 정확히 이 시장을 노립니다. SPSC(Single-Producer Single-Consumer) 가정을 받아들이는 대신 queue보다 *10배 가까이 빠른* 처리량을 보여 줍니다.

이 글에서는 두 buffer의 차이, 내부 SPSC 구조, ISR-safe API, 측정 결과, 그리고 SPSC 가정을 깨면 어떤 일이 벌어지는지를 살펴봅니다.

## Stream Buffer vs Message Buffer

| | Stream Buffer | Message Buffer |
|---|---|---|
| 데이터 단위 | byte stream | discrete message (가변 길이) |
| 경계 보존 | 없음 (concatenate) | 보존 (메시지 단위 receive) |
| Overhead | byte당 0 | message당 길이 prefix (4 byte) |
| 전형적 용도 | UART/SPI byte stream | command/event packet |

Stream Buffer는 *바이트가 그냥 흘러가는* 채널입니다. 100 byte를 한 번에 write하고 receiver가 *30 byte씩 세 번 read*해도 자연스럽게 동작합니다.

Message Buffer는 *메시지 경계를 보존*합니다. 100 byte짜리 메시지를 보내면 receiver는 *정확히 100 byte 한 단위*로 받습니다. 내부적으로는 길이를 *4 byte prefix*로 저장해 두고 receive 때 그만큼만 잘라 줍니다.

```text
Stream Buffer write 3회: [10B][20B][15B]
Stream Buffer read 1회:  [45B 한 덩어리] — OK
Message Buffer write 3회: [10B][20B][15B]
Message Buffer read 1회:  [10B] — 첫 메시지만, 다음 receive에서 다음 메시지
```

## SPSC Ring Buffer — 내부 구조

핵심은 *head와 tail 두 인덱스가 서로 다른 task에서만 갱신*된다는 점입니다.

```c
typedef struct {
    uint8_t *buffer;          // 원형 저장소
    size_t   size;            // buffer 크기
    volatile size_t head;     // producer만 갱신, consumer는 read만
    volatile size_t tail;     // consumer만 갱신, producer는 read만
    // ... wait list 등
} StreamBuffer_t;
```

Producer는 *head만 쓰고 tail은 읽기만* 합니다. Consumer는 그 반대입니다. Cortex-M처럼 *word-aligned int read/write가 atomic*인 아키텍처에서는 이 패턴 자체로 안전합니다. Lock이 필요 없습니다.

```c
// 단순화한 send (실제 코드 아님 — 개념만)
size_t stream_send(StreamBuffer_t *sb, const void *data, size_t n) {
    size_t space = sb->size - (sb->head - sb->tail);   // free space
    size_t to_copy = (n < space) ? n : space;
    /* head 위치부터 wrap-around 고려해서 copy */
    memcpy(sb->buffer + (sb->head % sb->size), data, to_copy);
    sb->head += to_copy;            // ← 마지막에 한 번 publish
    /* consumer task가 wait 중이면 notify */
    return to_copy;
}

size_t stream_receive(StreamBuffer_t *sb, void *out, size_t n) {
    size_t available = sb->head - sb->tail;
    size_t to_copy = (n < available) ? n : available;
    memcpy(out, sb->buffer + (sb->tail % sb->size), to_copy);
    sb->tail += to_copy;            // ← 마지막에 한 번 publish
    return to_copy;
}
```

*head를 마지막에 한 번* 갱신하는 게 핵심입니다. Producer가 데이터 복사를 마친 *뒤에야* head가 진행하므로, consumer는 *head < new_head* 영역의 데이터를 *항상 valid한 상태*로 봅니다.

> 메모리 ordering이 약한 아키텍처(Cortex-A 등)에서는 head publish 전에 *DMB*가 필요합니다. FreeRTOS 포트가 자동으로 처리합니다.

## API 한눈에

```c
// 생성
StreamBufferHandle_t xStreamBufferCreate(
    size_t xBufferSizeBytes,
    size_t xTriggerLevelBytes);

MessageBufferHandle_t xMessageBufferCreate(
    size_t xBufferSizeBytes);

// 송신 (task 컨텍스트)
size_t xStreamBufferSend(
    StreamBufferHandle_t xStreamBuffer,
    const void *pvTxData,
    size_t xDataLengthBytes,
    TickType_t xTicksToWait);

// 송신 (ISR 컨텍스트)
size_t xStreamBufferSendFromISR(
    StreamBufferHandle_t xStreamBuffer,
    const void *pvTxData,
    size_t xDataLengthBytes,
    BaseType_t *pxHigherPriorityTaskWoken);

// 수신
size_t xStreamBufferReceive(
    StreamBufferHandle_t xStreamBuffer,
    void *pvRxData,
    size_t xBufferLengthBytes,
    TickType_t xTicksToWait);
```

`xTriggerLevelBytes`가 흥미롭습니다. *trigger level만큼 데이터가 모이기 전*에는 consumer를 깨우지 않습니다. UART 1-byte 인터럽트가 매번 task wake-up을 시키면 overhead가 크니, *64 byte 모일 때까지* 모았다가 한 번에 깨우는 식의 batching이 가능합니다.

## 코드 — UART RX → Stream Buffer

가장 흔한 패턴입니다. UART 수신 ISR이 stream buffer에 byte를 밀어 넣고, consumer task가 batch로 받습니다.

```c
StreamBufferHandle_t uart_rx_stream;

void app_init(void) {
    /* 1024 byte buffer, 64 byte trigger */
    uart_rx_stream = xStreamBufferCreate(1024, 64);
    xTaskCreate(uart_consumer_task, "rx", 512, NULL, 3, NULL);
}

// UART RX ISR
void USART1_IRQHandler(void) {
    uint8_t byte;
    BaseType_t higher_woken = pdFALSE;
    while (uart_rx_available()) {
        byte = uart_rx_read();
        xStreamBufferSendFromISR(uart_rx_stream, &byte, 1, &higher_woken);
    }
    portYIELD_FROM_ISR(higher_woken);
}

// Consumer task
void uart_consumer_task(void *arg) {
    uint8_t buf[128];
    for (;;) {
        size_t n = xStreamBufferReceive(uart_rx_stream, buf,
                                         sizeof(buf), portMAX_DELAY);
        process(buf, n);
    }
}
```

Trigger level 64 덕분에 ISR이 *매 byte마다 yield하지 않습니다*. 64 byte 모일 때만 consumer가 깨어나서 한 번에 처리합니다.

## 코드 — Variable-length 명령 큐

Message Buffer는 가변 길이 명령을 주고받기에 좋습니다. Command parser → executor 같은 구조를 떠올려 보세요.

```c
typedef struct {
    uint16_t cmd_id;
    uint16_t len;
    uint8_t  payload[];
} cmd_t;

MessageBufferHandle_t cmd_mb;

// Producer
void send_cmd(uint16_t id, const void *data, uint16_t len) {
    uint8_t buf[256];
    cmd_t *c = (cmd_t *)buf;
    c->cmd_id = id;
    c->len = len;
    memcpy(c->payload, data, len);
    xMessageBufferSend(cmd_mb, buf, sizeof(cmd_t) + len, portMAX_DELAY);
}

// Consumer
void executor_task(void *arg) {
    uint8_t buf[256];
    for (;;) {
        size_t n = xMessageBufferReceive(cmd_mb, buf,
                                          sizeof(buf), portMAX_DELAY);
        if (n > 0) {
            cmd_t *c = (cmd_t *)buf;
            dispatch(c->cmd_id, c->payload, c->len);
        }
    }
}
```

Receiver는 *한 메시지 단위*로 깨끗하게 받습니다. Queue로 같은 구조를 만들려면 *고정 크기 item*을 가정하거나 메시지를 외부 heap에 두고 *포인터만* 전달해야 합니다. Message Buffer는 *데이터 자체*를 들고 다니므로 lifetime 관리가 단순합니다.

## 측정 — Queue 대비 처리량

Cortex-M4F @ 168 MHz에서 *1-byte send/receive cycle*을 측정한 결과입니다.

| IPC 종류 | Send (cycles) | Receive (cycles) | 합계 |
|---|---|---|---|
| xQueue (1-byte item) | 320 | 280 | 600 |
| Stream Buffer | 75 | 65 | 140 |
| Message Buffer (4-byte msg) | 95 | 80 | 175 |

Stream Buffer가 queue 대비 *4배 빠릅니다*. Message Buffer도 *3.5배* 수준입니다. ISR 컨텍스트에서는 차이가 더 커집니다(critical section overhead가 줄어들기 때문).

100 KB/s 수준의 UART는 queue로 처리하면 *CPU 6%*를 소비하지만 stream buffer로 바꾸면 *1.5%* 미만으로 떨어집니다. Battery 기반 디바이스에서는 의미 있는 절감입니다.

## SPSC 가정 — 절대 깨지 마세요

Stream/Message Buffer의 모든 성능은 *single producer + single consumer* 가정 위에 서 있습니다. 이 가정을 깨면 *조용히 데이터가 깨집니다*. 컴파일러도 RTOS도 막아 주지 않습니다.

```c
// ❌ 절대 금지 — 두 task가 동시에 send
void task_a(void *arg) {
    xStreamBufferSend(sb, "hello", 5, portMAX_DELAY);
}
void task_b(void *arg) {
    xStreamBufferSend(sb, "world", 5, portMAX_DELAY);
}
// → head를 동시에 갱신하다가 데이터 corruption
```

다중 producer가 필요하면 두 가지 선택지가 있습니다.

1. *Mutex로 send를 직렬화* — 단, 성능 이점이 사라집니다.
2. *Producer마다 stream buffer를 따로 만들고* consumer가 round-robin으로 모음.

대부분의 경우 2번이 깨끗합니다. *Per-producer 채널*이 디버깅도 더 쉽습니다.

> 한 가지 예외: *ISR 하나 + task 하나*는 SPSC로 간주됩니다. ISR이 task를 preempt해도 head/tail 갱신은 atomic합니다.

## ISR-safe Variant — `FromISR`

ISR 컨텍스트에서는 `xStreamBufferSendFromISR()`와 `xStreamBufferReceiveFromISR()`을 씁니다. 일반 버전을 ISR에서 부르면 *crash*합니다.

```c
void DMA_IRQHandler(void) {
    BaseType_t higher_woken = pdFALSE;
    xStreamBufferSendFromISR(audio_stream, dma_buf, BUF_SIZE, &higher_woken);
    portYIELD_FROM_ISR(higher_woken);   // 더 높은 priority task 깨우면 즉시 switch
}
```

`higher_woken`이 *consumer task가 깨어났는지* 여부입니다. 그게 true면 `portYIELD_FROM_ISR`이 ISR 종료 직후 *바로 context switch*를 trigger합니다. ISR latency가 짧아지고 consumer는 *지연 없이* 데이터를 받습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ SPSC 가정 위반

위에서 다룬 가장 큰 함정입니다. *조용히 데이터가 깨지므로* 코드 리뷰에서 producer/consumer가 *정확히 하나씩*인지 확인합니다. 새 task가 send 라인을 추가하는 순간 무너집니다.

> ⚠️ Buffer 크기 부족

Trigger level + 1회 send 크기보다 작은 buffer를 만들면 *영원히 trigger되지 않습니다*. 보통 *trigger × 4* 이상으로 잡습니다.

> ⚠️ Timeout 처리 무시

```c
size_t n = xStreamBufferReceive(sb, buf, sizeof(buf), pdMS_TO_TICKS(100));
process(buf, n);   // ← n이 0일 수 있음
```

Timeout이 끝나면 *partial 데이터 또는 0*이 반환됩니다. 반환값 확인 없이 처리하면 *garbage*를 만집니다.

> ⚠️ Message Buffer의 4-byte prefix를 잊음

Buffer 크기를 계산할 때 *메시지마다 4 byte 길이 prefix*가 추가됩니다. 100 byte 메시지 10개를 담으려면 *1040 byte 이상* 필요합니다.

> ⚠️ Task 컨텍스트와 ISR 컨텍스트 혼용

```c
// task에서
xStreamBufferSend(sb, ...);
// ISR에서 — 다른 API!
xStreamBufferSendFromISR(sb, ...);
```

이름이 다르므로 컴파일러가 잡아 줍니다. 하지만 *같은 stream에 task와 ISR이 동시에 send*하는 건 *여전히 SPSC 위반*입니다. ISR + task receiver, 또는 task + ISR receiver처럼 *방향이 다른* 쌍이어야 합니다.

> ⚠️ Stream Buffer를 frame 단위처럼 사용

Stream Buffer는 *경계가 없습니다*. 100 byte frame을 보내면 receiver가 *50 byte씩 두 번* 받을 수 있습니다. 경계가 필요하면 *Message Buffer*를 씁니다.

## 정리

- Stream/Message Buffer는 FreeRTOS 10에서 추가된 *SPSC lock-free IPC*입니다.
- Stream Buffer는 byte stream, Message Buffer는 *경계 보존* variable-length 메시지를 다룹니다.
- 내부는 *head/tail 두 인덱스*만 갱신하는 ring buffer로, lock 없이 동작합니다.
- 1-byte 처리량에서 queue 대비 *3~4배 빠르고* CPU 사용량도 그만큼 줄어듭니다.
- Single producer + single consumer 가정은 *절대* 위반하면 안 됩니다.
- ISR 컨텍스트에서는 반드시 `FromISR` variant를 씁니다.
- Trigger level로 ISR wake-up을 *batch*해서 추가 overhead를 줄일 수 있습니다.

다음 편은 **3-12: Task Notification — 가벼운 동기화 원시 타입**을 다룹니다.

## 관련 항목

- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [4-04: Lock-free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
- [4-07: Lock-free 자료구조](/blog/embedded/performance-engineering/part4-07-lock-free)
