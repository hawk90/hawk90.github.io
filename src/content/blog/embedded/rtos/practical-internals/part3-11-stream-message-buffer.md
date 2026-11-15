---
title: "Stream Buffer와 Message Buffer — FreeRTOS SPSC 계약과 Byte·Message 경계"
slug: "embedded/rtos/practical-internals/part3-11-stream-message-buffer"
date: 2026-05-06T09:32:00
description: "FreeRTOS V11.2.0의 Stream·Message Buffer에서 SPSC·trigger·길이 prefix·partial 반환과 ISR 계약을 확인하고, wrap·메시지 경계·frame 길이를 검증합니다."
series: "Practical RTOS Internals"
seriesOrder: 32
tags: [stream-buffer, message-buffer, freertos, ipc, lock-free, spsc]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

FreeRTOS **V11.2.0**의 Stream Buffer는 byte 흐름을, Message Buffer는 가변 길이 메시지 경계를 보존합니다. 기본 계약은 **single writer·single reader**이며, 내부에 critical·notification 경로가 있으므로 전체 API를 무조건 lock-free라고 부르지 않습니다.

## 어떤 문제를 푸는가

UART ISR에서 task 하나로 byte를 전달하거나 producer task에서 consumer 하나로 메시지를 넘길 때 사용하는 IPC입니다. Queue는 고정 크기 항목과 복수 sender/receiver를 지원하지만 Stream/Message Buffer는 기본 이용자 수 계약이 다릅니다. 성능 우열은 payload·대기·복사·wake·target 설정에서 측정해야 합니다.

| 항목 | Stream Buffer | Message Buffer |
| --- | --- | --- |
| 단위 | byte stream | 하나의 가변 길이 message |
| 경계 | 보존하지 않음 | 보존 |
| 길이 저장 | 별도 message prefix 없음 | sizeof(configMESSAGE_BUFFER_LENGTH_TYPE) |
| 작은 receive buffer | 들어가는 byte만 수신 가능 | 첫 message가 안 들어가면 0, message 유지 |

길이 prefix의 기본 type은 size_t이며 target·config에 따라 폭이 달라집니다. 항상 4 byte나 항상 1040 byte라고 계산하지 않습니다. control block·ring 여유·할당 방식도 따로 계산합니다.

## 내부 Ring과 Block 경로

stream_buffer.c는 wrap을 고려한 copy와 head/tail 상태를 관리합니다. 끝부분을 넘는 memcpy 하나만으로 감싸지는 데이터를 처리할 수는 없습니다. volatile index만으로 언어 수준의 memory ordering과 다중 producer 안전성이 생기는 것도 아닙니다.

원본은 기다리는 sender/receiver의 task handle과 notification index, critical 경로를 사용합니다. 같은 notification index를 application이 다른 용도로 덮어쓰면 대기 계약에 영향을 줄 수 있습니다. architecture별 barrier를 memory 모델과 분리해서 한 줄 추가하는 축약 구현으로 대체하지 않습니다.

## 작은 예제 — Partial·Wrap·Message 경계

다음은 assert가 활성화된 test task에서 호출하는 예제입니다. 동적 allocation과 stream/message-buffer 지원을 준비하고 NDEBUG는 정의하지 않습니다. 부하나 처리량을 측정하는 benchmark는 아닙니다.

```c title="buffer-contract.c"
#include <assert.h>
#include <string.h>
#include "FreeRTOS.h"
#include "stream_buffer.h"
#include "message_buffer.h"
void check_buffer_contract(void) {
    StreamBufferHandle_t s = xStreamBufferCreate(8, 4);
    assert(s != NULL);
    unsigned char a[] = {1,2,3,4,5,6}, b[] = {7,8,9,10,11,12};
    unsigned char out[16], expected[] = {5,6,7,8,9,10,11,12};
    assert(xStreamBufferSend(s, a, sizeof a, 0) == sizeof a);
    assert(xStreamBufferReceive(s, out, 4, 0) == 4);
    assert(memcmp(out, a, 4) == 0);
    assert(xStreamBufferSend(s, b, sizeof b, 0) == sizeof b);
    assert(xStreamBufferReceive(s, out, sizeof out, 0) == 8);
    assert(memcmp(out, expected, 8) == 0);
    assert(xStreamBufferReceive(s, out, sizeof out, 0) == 0);
    vStreamBufferDelete(s);
    MessageBufferHandle_t m = xMessageBufferCreate(64); assert(m != NULL);
    assert(xMessageBufferSend(m, a, 4, 0) == 4);
    assert(xMessageBufferReceive(m, out, 2, 0) == 0);
    assert(xMessageBufferReceive(m, out, sizeof out, 0) == 4);
    assert(memcmp(out, a, 4) == 0);
    unsigned char oversized[65] = {0};
    assert(xMessageBufferSend(m, oversized, sizeof oversized, 0) == 0);
    vMessageBufferDelete(m);
}
```

## Trigger Level

trigger level은 **block 중인 receiver를 깨울 데이터 양**과 관련됩니다. 이미 데이터가 있을 때의 receive를 그 수만큼 모일 때까지 무조건 막는 최소 frame 길이가 아닙니다. timeout이나 다른 wake 조건도 구분해야 합니다.

생성 시 trigger가 허용 capacity를 넘지 않아야 하며 0은 원본에서 1로 보정됩니다. buffer 크기를 무조건 trigger×4로 권하지 않고 burst·drain rate·timeout·메모리 예산으로 정합니다. 반환된 byte 수와 drop을 항상 확인합니다.

## SPSC와 ISR 계약

ISR 하나가 writer이고 task 하나가 reader이면 기본 SPSC 방향과 맞을 수 있습니다. **ISR과 task가 모두 send**하면 writer가 둘이므로 같은 의미가 아닙니다. 다중 writer/reader를 직렬화하려면 공식 header가 요구하는 critical·zero-block-time 조건을 포함해 검토합니다. task mutex만으로 ISR과 동시에 접근하는 문제를 해결할 수는 없습니다.

FromISR send/receive도 buffer 포화나 작은 용량으로 요청 전체를 처리하지 못할 수 있습니다. DMA buffer를 전달한다면 cache·DMA ownership·재사용 시점과 실제 copy 완료를 따로 관리합니다. woken과 portYIELD_FROM_ISR는 switch 요청 계약이며 지연 없는 전달 보장이 아닙니다.

## 가변 길이 명령을 해석할 때

수신 byte 배열을 바로 cmd_t pointer로 cast하면 alignment·형식·길이·상대편 layout 문제가 생길 수 있습니다. 명시적 byte order로 header를 읽고 실제 수신 길이와 payload 길이를 대조합니다. 다음은 2-byte ID와 2-byte payload 길이를 big-endian으로 정의한 작은 parser입니다.

```c title="command-header.c"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
bool command_header(const uint8_t *p, size_t n,
                    uint16_t *id, size_t *payload_size) {
    if (p == NULL || id == NULL || payload_size == NULL || n < 4)
        return false;
    size_t length = ((size_t)p[2] << 8) | p[3];
    if (length != n - 4) return false;
    *id = (uint16_t)(((uint16_t)p[0] << 8) | p[1]);
    *payload_size = length;
    return true;
}
```

producer도 같은 header 계약을 따르고, 고정 256-byte buffer에는 header+payload가 들어가는지 복사 전에 확인합니다. Message Buffer가 message 경계를 보존해도 application frame의 길이·내용을 검증해 주는 것은 아닙니다.

## 성능을 비교할 조건

동일 board·clock·compiler·config에서 payload 크기·blocking·ISR/task·notification·trace off/on을 맞춰 비교합니다. 원시 로그가 없는 10배·4배·CPU 6% 표는 이 글의 실측 결과로 제시하지 않습니다. 기능 검사와 throughput·최악 응답 시간 검증은 다른 결과입니다.

## 정리

- Stream은 byte 흐름, Message Buffer는 메시지 경계를 보존합니다.
- prefix 폭은 configMESSAGE_BUFFER_LENGTH_TYPE을 확인합니다.
- SPSC는 방향별 이용자 수 계약이며 volatile이나 port 이름만으로 안전성이 생기지 않습니다.
- trigger는 frame 경계나 모든 receive의 최소 반환 크기가 아닙니다.
- partial·0 반환·buffer 수명과 application frame 길이를 검사합니다.

다음 [4-01 실시간 메모리 관리](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)에서 할당·단편화·시간 상한을 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 stream_buffer.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/stream_buffer.c), [stream_buffer.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/stream_buffer.h), [message_buffer.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/message_buffer.h): 실제 copy·trigger·notification·이용자 수·길이 저장 계약.

## 관련 항목

- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [4-04: Lock-free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
- [4-07: Lock-free 자료구조](/blog/embedded/performance-engineering/part4-07-lock-free)
