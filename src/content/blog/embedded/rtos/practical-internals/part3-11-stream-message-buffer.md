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

FreeRTOS **V11.2.0**의 Stream Buffer는 byte 흐름을, Message Buffer는 가변 길이 메시지 경계를 보존합니다. 계약은 **single writer·single reader**이고, 대기와 깨우기는 queue의 event list가 아니라 task notification으로 합니다. 이 글의 실행 결과는 같은 커널(commit `0adc196d`)을 `ARM_CM3` 포트로 빌드해 QEMU 11.1.3 `mps2-an385`에서 돌린 출력입니다(`arm-none-eabi-gcc` 16.2.0).

## 어떤 문제를 푸는가

UART ISR에서 task 하나로 byte를 전달하거나 producer task에서 consumer 하나로 메시지를 넘길 때 쓰는 IPC입니다. queue가 칸이 정해진 사물함이라면 stream buffer는 한쪽에서 붓고 한쪽에서 받는 물통이고, message buffer는 봉투째 넣고 봉투째 꺼내는 우편함입니다. queue는 고정 크기 항목과 여러 sender/receiver를 지원하지만, stream/message buffer는 이용자 수 계약이 다릅니다.

| 항목 | Stream Buffer | Message Buffer |
| --- | --- | --- |
| 단위 | byte stream | 하나의 가변 길이 message |
| 경계 | 보존하지 않음 | 보존 |
| 길이 저장 | 별도 message prefix 없음 | sizeof(configMESSAGE_BUFFER_LENGTH_TYPE) |
| 작은 receive buffer | 들어가는 byte만 수신 가능 | 첫 message가 안 들어가면 0, message 유지 |

길이 prefix는 `sbBYTES_TO_STORE_MESSAGE_LENGTH = sizeof(configMESSAGE_BUFFER_LENGTH_TYPE)`(`stream_buffer.c:222`)이고, 기본 type은 `size_t`(`include/FreeRTOS.h:2867`)입니다. Cortex-M3 빌드에서는 4 byte입니다(3-07의 실행). `FreeRTOS.h:2864-2866`의 주석은 길이가 항상 `size_t`의 byte 수로 표현하는 범위보다 작다면 `FreeRTOSConfig.h`에서 이 type을 바꿀 수 있다고 적습니다. `uint16_t`로 바꾸면 message마다 2 byte를 아낍니다.

동적 생성은 `StreamBuffer_t`와 저장소를 `pvPortMalloc()` 한 번으로 잡고, 요청 크기에 1 byte를 더합니다(`stream_buffer.c:375-385`). 주석은 이것을 "free space가 논리적으로 기대한 것보다 1 byte 작게 보고되는 것을 막는 구현상의 quirk"라고 설명합니다. 그래서 `xStreamBufferCreate(8, 1)`의 빈 공간은 8로 보입니다.

```text
xStreamBufferCreate(8,1): spaces=8
```

## 내부 Ring과 Block 경로

`prvWriteBytesToBuffer()`(`stream_buffer.c:1476`)는 head부터 끝까지 한 번, 넘친 나머지를 저장소 처음부터 한 번, 최대 두 번 `memcpy()`합니다(`:1492`, `:1500`). `prvReadBytesFromBuffer()`(`:1522`)도 tail 쪽에서 같은 방식으로 두 번 읽습니다(`:1540`, `:1547`).

대기는 task handle 하나로 합니다. `StreamBuffer_t`에는 `xTaskWaitingToReceive`·`xTaskWaitingToSend`가 handle 한 개씩만 있고(`:238`), receive는 `xTaskNotifyWaitIndexed(pxStreamBuffer->uxNotificationIndex, ...)`로 잠듭니다(`:1121`). waiter를 목록이 아니라 한 칸에 담는다는 점이 SPSC 계약의 구현상 이유입니다. 두 번째 reader가 block하려 하면 `configASSERT(pxStreamBuffer->xTaskWaitingToReceive == NULL)`(`:1107`)에 걸리고, assert를 끈 빌드에서는 그 다음 줄이 첫 reader의 handle을 덮어씁니다. `uxNotificationIndex`의 기본값은 `tskDEFAULT_INDEX_TO_NOTIFY`(`:251`)이므로, application이 같은 index의 notification을 다른 용도로 쓰면 buffer의 깨우기와 섞입니다.

## 작은 예제 — Partial·Wrap·Message 경계

다음은 assert가 켜진 test task에서 호출하는 예제입니다. 8 byte stream에 6 byte를 넣고 4 byte를 뺀 뒤 다시 6 byte를 넣으면 쓰기가 끝을 넘어 처음으로 감깁니다. 이어서 message buffer의 작은 버퍼 수신과 용량 초과 send를 확인합니다.

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

이 함수를 그대로 test task에서 호출했고 assert가 모두 통과했습니다. 두 번째 receive가 wrap된 8 byte를 순서대로 돌려준 것이 두 번의 `memcpy()` 경로를 지난 결과입니다.

```text
check_buffer_contract: all asserts passed
```

## Trigger Level

trigger level은 **block 중인 receiver를 깨울 데이터 양**입니다. send 쪽은 `prvBytesInBuffer() >= xTriggerLevelBytes`일 때 receiver에게 notification을 보냅니다(`stream_buffer.c:922`). 생성 시 `configASSERT(xTriggerLevelBytes <= xBufferSizeBytes)`로 용량을 넘지 않는지 보고, 0은 1로 고칩니다(`:365-372`).

V11.2.0에는 trigger의 의미가 다른 두 종류가 있습니다. 일반 stream buffer와, V11.1.0에서 추가된(`History.txt:142`) **stream batching buffer**(`xStreamBatchingBufferCreate()`, `include/stream_buffer.h:352`)입니다. 헤더(`:290-296`)는 차이를 이렇게 적습니다. 비어 있지 않은 stream buffer에서 읽으면 양과 무관하게 바로 돌아오고, batching buffer는 데이터가 trigger를 "exceeds"할 때까지 block합니다. 두 종류 모두 trigger 4, 32 byte로 만들고 receiver를 먼저 block시킨 뒤 t=10에 2 byte, t=20에 2 byte를 넣었습니다.

```text
[stream buffer, trigger 4] receiver blocks first; 2 bytes at t=10, 2 more at t=20
  receiver woke at t=20 with 4 bytes
  data already present (2 bytes), receive with timeout 0 -> 2 bytes
[batching buffer, trigger 4] receiver blocks first; 2 bytes at t=10, 2 more at t=20
  receiver woke at t=20 with 0 bytes
  data already present (2 bytes), receive with timeout 0 -> 6 bytes
```

일반 stream buffer는 2 byte로는 깨지 않고 4 byte가 되자 깨어나 4 byte를 받았습니다. 이미 데이터가 있으면 trigger보다 적은 2 byte도 바로 돌려줍니다. trigger는 최소 반환 크기가 아닙니다.

batching buffer는 결과가 이상합니다. t=20에 깨어났는데 **0 byte**를 받았습니다. send 쪽은 4 ≥ 4라서 깨웠지만, receive 쪽은 `xBytesAvailable > xBytesToStoreMessageLength`(`:1142`)일 때만 읽고, batching buffer에서는 그 값이 trigger 4입니다(`:1079`). 4 > 4가 거짓이라 아무것도 읽지 않고 돌아온 것입니다. 깨우는 조건(`>=`)과 읽는 조건(`>`)이 한 byte 어긋나 있으니, batching buffer를 `portMAX_DELAY`로 읽더라도 반환값 0을 처리하는 루프로 감싸야 합니다.

## SPSC와 ISR 계약

`include/stream_buffer.h:38-48`의 NOTE는 writer와 reader가 각각 하나라면 둘이 서로 다른 task나 interrupt여도 안전하다고 적습니다. UART ISR이 writer, 처리 task가 reader인 구성은 이 계약 그대로입니다. 반면 **ISR과 task가 모두 send**하면 writer가 둘입니다. 같은 NOTE는 writer가 여럿이면 application이 쓰기 호출을 직렬화해야 하고, 그 한 방법으로 "각 API 호출을 critical section 안에 두고 block time 0을 쓰라"고 적습니다. task용 mutex로는 ISR을 막을 수 없으므로 이 방법이 맞습니다.

`xStreamBufferSendFromISR()`는 공간이 모자라면 들어가는 만큼만 쓰고 그 byte 수를 돌려줍니다. 반환값이 요청 길이보다 작으면 나머지는 버려진 것이므로 drop 카운터를 올립니다. DMA로 받은 버퍼를 넘긴다면 `memcpy()`가 끝난 뒤에야 DMA가 같은 버퍼를 다시 써도 됩니다.

## 가변 길이 명령을 해석할 때

수신 byte 배열을 바로 `cmd_t *`로 cast하면 구조체 padding·alignment·byte order를 상대편과 맞췄다는 가정이 숨습니다. 명시적 byte order로 header를 읽고 실제 수신 길이와 payload 길이를 대조합니다. 다음은 2-byte ID와 2-byte payload 길이를 big-endian으로 정의한 작은 parser입니다.

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

세 입력으로 돌린 결과입니다. 정상 frame, 길이 필드가 실제보다 큰 frame, header보다 짧은 입력입니다.

```text
command_header(valid 6 bytes) -> 1 id=0x1234 payload=2
command_header(len field 5, only 1 byte payload) -> 0
command_header(3 bytes) -> 0
```

Message Buffer는 message 경계를 지켜 주지만, 안에 든 application frame의 길이 필드까지 검증하지는 않습니다. 두 번째 입력처럼 producer가 길이를 잘못 쓰면 경계는 맞아도 내용은 틀립니다.

## 성능을 비교할 조건

이 글에서는 throughput을 재지 않았습니다. 이 커널을 올린 실보드가 없고 QEMU의 시간은 실리콘의 시간이 아니어서, 예전 판의 "10배·4배·CPU 6%" 표는 원시 로그가 없어 지웠습니다. 소스로 확인되는 구조 차이는 두 가지입니다. stream buffer는 waiter를 handle 한 칸에 두고 notification으로 깨우므로 event list 정렬이 없고, queue는 `uxItemSize` 단위로 한 번에 복사하지만 stream buffer는 wrap 때 두 번 복사합니다. 비교가 필요하면 같은 보드에서 DWT 사이클 카운터로 두 경로를 재야 합니다.

## 정리

- Stream은 byte 흐름, Message Buffer는 메시지 경계를 보존합니다.
- prefix 폭은 `sizeof(configMESSAGE_BUFFER_LENGTH_TYPE)`이고, Cortex-M3 기본값은 4 byte입니다.
- SPSC 계약은 waiter handle이 한 칸뿐인 구현에서 나옵니다. writer가 여럿이면 critical section + block time 0으로 직렬화합니다.
- 일반 stream buffer의 trigger는 깨우는 양일 뿐 최소 반환 크기가 아닙니다.
- batching buffer는 trigger와 같은 양에서 깨우고 0을 돌려줄 수 있습니다(QEMU 실행으로 확인).
- partial·0 반환과 application frame 길이를 검사합니다.

다음 [4-01 실시간 메모리 관리](/blog/embedded/rtos/practical-internals/part4-01-realtime-memory)에서 할당·단편화·시간 상한을 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 stream_buffer.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/stream_buffer.c), [stream_buffer.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/stream_buffer.h), [message_buffer.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/message_buffer.h): 실제 copy·trigger·notification·이용자 수·길이 저장 계약.

## 관련 항목

- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [4-04: Lock-free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
- [4-07: Lock-free 자료구조](/blog/embedded/performance-engineering/part4-07-lock-free)
