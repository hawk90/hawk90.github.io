---
title: "Ch 10: Stream and Message Buffers"
date: 2026-05-09T10:00:00
description: "xStreamBufferSend·xMessageBufferSend — 단일 reader/writer용 lock-free 버퍼."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 10
tags: [freertos, stream-buffer, message-buffer, lock-free]
draft: true
---

## 한 줄 요약

> **"Stream buffer는 *바이트 단위의 producer/consumer FIFO*, Message buffer는 *가변 크기 메시지를 길이 prefix로 감싼* 변형입니다. 둘 다 *단일 reader + 단일 writer* 제약을 받아들이는 대신 *내부 임계 영역 락이 없어서* 큐보다 빠르고, 특히 *듀얼 코어(AMP) 코어 간 통신*에서 진가를 발휘합니다."**

큐는 동시에 여러 producer/consumer를 안전하게 처리하기 위해 *임계 영역 락*을 내부에 둡니다. 반면 stream/message buffer는 *수신자 한 명, 송신자 한 명*이라는 약속을 받고 그 락을 빼 버립니다. 그 결과 코어 간 *lock-free* 통신이 가능하고, *DMA 직결*이나 *대량 바이트 스트림*(UART, ADC, audio)에 적합한 객체가 됩니다. 이번 장에서는 두 종류 차이, API, trigger level, 그리고 *RP2040 / ESP32-S3* 듀얼 코어 사용 사례까지 다룹니다.

## Stream vs Message — 두 종류의 차이

| 항목 | Stream buffer | Message buffer |
|------|--------------|----------------|
| 단위 | 바이트(byte) | 메시지(가변 길이) |
| 내부 헤더 | 없음 | 4B (length prefix) |
| 부분 읽기 | 가능 (trigger level까지) | 불가 (메시지 단위) |
| 적합한 데이터 | UART, ADC stream | log line, packet |
| 메모리 효율 | 100% 페이로드 | 페이로드 + 4B/메시지 |

```text
[Stream buffer]
write: "Hello, world!\n"
  └─► [H][e][l][l][o][,][ ][w][o][r][l][d][!][\n]
read 5 bytes → "Hello"  (남은 9바이트 그대로)

[Message buffer]
write: "Hello"   →  [05][H][e][l][l][o]
write: "World!"  →  [05][H][e][l][l][o][06][W][o][r][l][d][!]
read → "Hello"           (반드시 메시지 단위로)
read → "World!"
```

## API 한눈

### Stream buffer

```c
#include "stream_buffer.h"

/* 생성 — size: 버퍼 바이트, trigger: 수신 임계값 */
StreamBufferHandle_t xStreamBufferCreate(size_t xBufferSizeBytes,
                                          size_t xTriggerLevelBytes);

/* 송신 */
size_t xStreamBufferSend(StreamBufferHandle_t sb,
                          const void *pvTxData, size_t xDataLengthBytes,
                          TickType_t xTicksToWait);

/* 수신 */
size_t xStreamBufferReceive(StreamBufferHandle_t sb,
                             void *pvRxData, size_t xBufferLengthBytes,
                             TickType_t xTicksToWait);

/* trigger level 변경 (runtime) */
BaseType_t xStreamBufferSetTriggerLevel(StreamBufferHandle_t sb,
                                         size_t xTriggerLevel);

/* 상태 */
size_t xStreamBufferBytesAvailable(StreamBufferHandle_t sb);
size_t xStreamBufferSpacesAvailable(StreamBufferHandle_t sb);

/* ISR 변형 */
size_t xStreamBufferSendFromISR(...);
size_t xStreamBufferReceiveFromISR(...);
```

### Message buffer

```c
#include "message_buffer.h"

MessageBufferHandle_t xMessageBufferCreate(size_t xBufferSizeBytes);

size_t xMessageBufferSend(MessageBufferHandle_t mb,
                           const void *pvTxData, size_t xDataLengthBytes,
                           TickType_t xTicksToWait);

size_t xMessageBufferReceive(MessageBufferHandle_t mb,
                              void *pvRxData, size_t xBufferLengthBytes,
                              TickType_t xTicksToWait);
```

Message buffer는 *내부적으로 stream buffer를 4B length prefix와 함께 사용*합니다. 즉 message 하나당 *4B 오버헤드*가 붙습니다.

## UART RX — 바이트 스트림 패턴

ISR이 UART RX FIFO에서 받은 바이트를 stream buffer에 *바로 밀어 넣고*, 처리 태스크가 *임계값에 도달*하면 깨어납니다.

```c
#define UART_RX_BUF_SIZE   2048
#define UART_RX_TRIGGER    32        /* 32바이트 모이면 wake */

static StreamBufferHandle_t g_uart_rx;

void uart_init(void)
{
    g_uart_rx = xStreamBufferCreate(UART_RX_BUF_SIZE, UART_RX_TRIGGER);
    configASSERT(g_uart_rx);
}

void USART2_IRQHandler(void)
{
    BaseType_t hp = pdFALSE;
    while (LL_USART_IsActiveFlag_RXNE(USART2)) {
        uint8_t b = LL_USART_ReceiveData8(USART2);
        xStreamBufferSendFromISR(g_uart_rx, &b, 1, &hp);
    }
    portYIELD_FROM_ISR(hp);
}

void uart_rx_task(void *p)
{
    uint8_t buf[64];
    for (;;) {
        size_t n = xStreamBufferReceive(g_uart_rx, buf, sizeof(buf),
                                         pdMS_TO_TICKS(100));
        if (n) process_bytes(buf, n);
    }
}
```

Trigger level이 32라서 *바이트가 32개 쌓이거나 100ms timeout*에 깨어납니다. 짧은 패킷에는 timeout이, 긴 burst에는 trigger가 wake 트리거 역할을 합니다.

## 로그 출력 — 메시지 단위 패턴

여러 태스크가 *완성된 로그 라인*을 한 곳에 보내고, *직렬화 태스크 하나*가 UART/USB로 내보내는 흐름입니다.

```c
#define LOG_BUF_SIZE   4096
static MessageBufferHandle_t g_log_mb;

void log_init(void) { g_log_mb = xMessageBufferCreate(LOG_BUF_SIZE); }

void log_printf(const char *fmt, ...)
{
    char line[128];
    va_list ap; va_start(ap, fmt);
    int n = vsnprintf(line, sizeof(line), fmt, ap);
    va_end(ap);
    if (n > 0) {
        xMessageBufferSend(g_log_mb, line, (size_t)n, pdMS_TO_TICKS(10));
    }
}

void log_writer_task(void *p)
{
    char buf[160];
    for (;;) {
        size_t n = xMessageBufferReceive(g_log_mb, buf, sizeof(buf),
                                          portMAX_DELAY);
        uart_write(buf, n);
    }
}
```

*line 단위 무결성*이 보장됩니다. stream buffer를 썼다면 두 로그가 *바이트 단위로 섞일* 위험이 있는데, message buffer는 *수신측이 항상 한 메시지를 통째로 받습니다*.

> ⚠️ Message buffer는 *단일 송신자* 가정입니다. 여러 태스크가 동시에 `log_printf`를 호출하면 *내부적으로 race*가 생깁니다. 다중 송신이 필요하면 *임시 mutex로 보호*하거나, message buffer 앞에 queue 한 단을 두어 직렬화합니다.

## SBSE (Send Buffer Stream Event) 콜백

`configUSE_SB_COMPLETED_CALLBACK = 1`로 활성화하면, *생성 시 콜백을 지정*해 send/receive 완료 시 알릴 수 있습니다. *DMA가 끝났을 때 다음 청크를 준비*하는 패턴에 유용합니다.

```c
/* FreeRTOSConfig.h */
#define configUSE_SB_COMPLETED_CALLBACK   1

static void send_done_cb(StreamBufferHandle_t sb,
                          BaseType_t isFirst, BaseType_t *higher)
{
    /* DMA 후속 청크 prepare */
}

g_sb = xStreamBufferCreateWithCallback(
    SIZE, TRIGGER, send_done_cb, NULL
);
```

## 듀얼 코어 (AMP) 통신

Stream/message buffer가 *진짜로 빛나는 곳*은 *비대칭 멀티프로세싱(AMP)*입니다. RP2040은 *코어 0/1이 서로 다른 펌웨어*를 돌릴 수 있고, ESP32-S3는 *PRO/APP CPU*가 *공유 RAM*을 통해 통신합니다. 두 코어 모두 *내부 락 없이* 안전하게 쓸 수 있는 IPC가 필요합니다.

![RP2040 dual M0+ stream buffer in shared SRAM](/images/blog/freertos-mastering/diagrams/ch10-rp2040-amp-stream.svg)

```c
/* shared memory section에 stream buffer 배치 */
__attribute__((section(".shared_sram")))
static uint8_t g_sb_storage[1024 + sizeof(StaticStreamBuffer_t)];

StreamBufferHandle_t init_shared_sb(void)
{
    return xStreamBufferCreateStatic(
        1024,                                  /* size */
        16,                                    /* trigger */
        g_sb_storage,                          /* storage */
        (StaticStreamBuffer_t *)&g_sb_storage[1024]
    );
}
```

핵심 조건은 *송신자 코어 1명, 수신자 코어 1명*입니다. 이 약속이 깨지면 *memory barrier가 추가로 필요*하거나, 아예 *queue + spinlock* 같은 다른 객체로 가야 합니다.

### ESP32 듀얼 코어

ESP-IDF의 `pdMS_TO_TICKS` 호환 변형으로 같은 패턴이 동작합니다. 다만 *cache coherency*가 자동 보장되지 않아서, 공유 SRAM에 두려면 *DRAM·SHARED 영역*에 위치시켜야 합니다.

```c
DRAM_ATTR static uint8_t shared_sb_buf[2048];

StreamBufferHandle_t sb = xStreamBufferCreateStatic(
    2048, 64, shared_sb_buf, &sb_meta);

/* core 0에서 송신 */
xTaskCreatePinnedToCore(producer, "tx", 4096, sb, 5, NULL, 0);

/* core 1에서 수신 */
xTaskCreatePinnedToCore(consumer, "rx", 4096, sb, 5, NULL, 1);
```

## Queue와의 비교

| 항목 | Queue | Stream/Message buffer |
|------|-------|----------------------|
| 송신자 수 | 다수 | **1명** |
| 수신자 수 | 다수 | **1명** |
| 락 | 내부 critical | 없음 (가정 기반) |
| 데이터 단위 | 고정 크기 N개 | 가변 바이트/메시지 |
| 듀얼 코어 | 추가 보호 필요 | 그대로 사용 가능 |
| 사이클 | 보통 | 빠름 (~30% 감소) |
| RAM | 작은 항목 다수에 유리 | 큰 스트림에 유리 |

*"수신자가 한 명, 송신자도 한 명"이 보장될 때*는 stream/message buffer가 빠르고 깔끔합니다. 그 외에는 queue가 안전합니다.

## 성능 비교 (Cortex-M4 @ 80 MHz, GCC -O2)

| 작업 | Queue (4B item) | Stream buffer (4B) | Message buffer (4B) |
|------|----------------|-------------------|--------------------|
| 송신 사이클 | ~720 | ~520 | ~580 |
| 수신 사이클 | ~700 | ~510 | ~570 |
| 1KB block 송수신 | item × 256 호출 | 1회 호출, ~5500 | 1회 호출, ~5600 |

대량 바이트는 stream buffer가 *압도적*입니다. queue로 1024개를 보내면 *호출 256번 + 락 256번*인 반면, stream buffer는 *memcpy 한 번 + 락 0번*입니다.

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| 두 태스크가 같이 send → 데이터 깨짐 | 단일 송신자 제약 위반 | queue로 직렬화 |
| trigger level이 너무 커서 응답 느림 | 평균 메시지보다 큰 trigger | 작은 값 + timeout 조합 |
| ISR send 후 yield 없음 | pxHigherPriorityTaskWoken 무시 | portYIELD_FROM_ISR |
| message buffer가 끝까지 못 채움 | length prefix 4B 빠뜨림 | size에 4B 여유 |
| 듀얼 코어에서 동작 이상 | buffer가 cache 영역에 있음 | DRAM/SHARED 섹션에 배치 |
| xStreamBufferSend 0 반환 | buffer 가득 + timeout 짧음 | 충분한 timeout 또는 capacity |

가장 잦은 함정이 *"단일 reader/writer"라는 가정*을 어기는 것입니다. 큐는 자동으로 보호해 주지만, stream/message는 *조용히 데이터가 깨집니다*. 코드 리뷰 단계에서 *송신 호출 지점이 한 곳뿐*임을 점검합니다.

## 정리

- Stream buffer는 *바이트 FIFO*, message buffer는 *가변 메시지 + 길이 prefix*입니다.
- 둘 다 *단일 reader + 단일 writer* 제약. 그 대신 내부 락이 없어서 빠르고 *듀얼 코어 안전*합니다.
- UART RX 등 *바이트 스트림*은 stream buffer, *로그 라인 / 패킷*은 message buffer가 자연스럽습니다.
- `xStreamBufferSetTriggerLevel`로 *임계값에 도달하면 깨우는* 동작을 만듭니다. timeout과 조합해 응답성을 조절합니다.
- `configUSE_SB_COMPLETED_CALLBACK`으로 send/receive 완료 콜백을 받을 수 있습니다.
- 듀얼 코어(RP2040, ESP32-S3)에서는 *공유 RAM 섹션*에 static으로 배치합니다.
- 대량 바이트 통신은 queue보다 *수십 배* 빠릅니다. 항목 수가 적고 broadcast가 필요한 경우는 queue가 옳습니다.
- 다중 송신이 필요하면 *앞단에 mutex 또는 queue를 두어 직렬화*합니다.

## 다음 편

[Ch 11: Low Power Support](/blog/embedded/rtos/freertos-mastering/chapter11-low-power)에서는 *tickless idle*과 *MCU sleep mode*를 다룹니다. RTOS의 tick을 끄고 µA 단위까지 내리는 표준 패턴입니다.

## 관련 항목

- [Ch 6: Queue Management](/blog/embedded/rtos/freertos-mastering/chapter04-queue-management) — 다중 송수신용
- [Ch 9: Task Notifications](/blog/embedded/rtos/freertos-mastering/chapter09-task-notifications) — 알림 전용 경량 IPC
- [Ch 13: SMP Support](/blog/embedded/rtos/freertos-mastering/chapter13-smp-support) — SMP와의 차이
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — DMA + 버퍼 패턴
- [원문 — FreeRTOS Stream Buffers](https://www.freertos.org/RTOS-stream-buffer-API.html)
- [원문 — FreeRTOS Message Buffers](https://www.freertos.org/RTOS-message-buffer-API.html)
