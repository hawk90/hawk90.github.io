---
title: "Ch 4: Queue Management"
date: 2026-05-09T04:00:00
description: "xQueueCreate·블로킹·queue set·mailbox — 태스크 간 메시지 전달의 기본."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 4
tags: [freertos, queue, ipc, message-passing]
type: book-review
bookTitle: "Mastering the FreeRTOS Real Time Kernel"
bookAuthor: "Richard Barry"
draft: true
---

## 한 줄 요약

> **"FreeRTOS 큐는 *FIFO·고정 크기·복사 전달의 thread-safe 컨테이너*이고, *블로킹 send/receive로 producer-consumer를 자연스럽게* 표현합니다. 세마포·뮤텍스도 *내부적으로 깊이 1짜리 큐*입니다."**

태스크가 *직접 변수를 공유하는 것*은 *경쟁 조건의 시작*입니다. FreeRTOS는 *공유 변수 대신 큐*를 권장합니다. 큐는 *생산자가 send, 소비자가 receive*하는 단방향 통로이고, *내부 lock과 블로킹*을 커널이 책임집니다. 큐 하나만 잘 써도 *대부분의 동기화*가 해결됩니다.

이번 장에서는 *큐의 메모리 모델*, *`xQueueSend`·`xQueueReceive`의 블로킹*, *by-copy의 의미와 트레이드오프*, *큐 집합(queue set)으로 여러 큐 동시 대기*, *mailbox 패턴*, *큐 vs 태스크 알림*을 다룹니다.

## xQueueCreate — 시그니처

```c
QueueHandle_t xQueueCreate(
    UBaseType_t uxQueueLength,    /* 한 번에 담을 수 있는 항목 수 */
    UBaseType_t uxItemSize        /* 각 항목의 byte 크기 */
);
```

큐는 *길이 × 항목 크기*의 *연속 RAM 영역*을 잡아 *원형 버퍼*로 운용합니다. 두 파라미터의 곱이 *큐가 차지하는 데이터 메모리*입니다.

```c
typedef struct {
    uint8_t  sensor_id;
    uint16_t value;
    uint32_t timestamp;
} SensorMsg_t;

QueueHandle_t xSensorQueue = xQueueCreate(8, sizeof(SensorMsg_t));
configASSERT(xSensorQueue != NULL);
```

위는 *8개의 `SensorMsg_t`를 담는 큐*입니다. 데이터 영역만 *8 × 8 byte = 64 byte*이고, *큐 control block*이 별도로 *몇십 byte*를 더 씁니다.

정적 버전은 `xQueueCreateStatic`입니다.

```c
#define Q_LEN 8
static StaticQueue_t xStaticQueue;
static uint8_t       ucStorage[Q_LEN * sizeof(SensorMsg_t)];

QueueHandle_t xQ = xQueueCreateStatic(Q_LEN, sizeof(SensorMsg_t),
                                       ucStorage, &xStaticQueue);
```

## Send·Receive — 4가지 변형

```c
BaseType_t xQueueSend(QueueHandle_t xQueue,
                       const void *pvItemToQueue,
                       TickType_t xTicksToWait);

BaseType_t xQueueSendToFront(QueueHandle_t xQueue,
                              const void *pvItemToQueue,
                              TickType_t xTicksToWait);

BaseType_t xQueueReceive(QueueHandle_t xQueue,
                          void *pvBuffer,
                          TickType_t xTicksToWait);

BaseType_t xQueuePeek(QueueHandle_t xQueue,
                       void *pvBuffer,
                       TickType_t xTicksToWait);
```

| API | 동작 |
|-----|------|
| `xQueueSend` | 뒤(back)에 추가, *FIFO* |
| `xQueueSendToFront` | 앞에 끼움, *LIFO 효과* (긴급 처리) |
| `xQueueReceive` | 앞에서 꺼냄, *큐에서 제거* |
| `xQueuePeek` | 앞을 *제거하지 않고 본다* |

*`xTicksToWait`*가 핵심입니다. 큐가 *가득 차거나(send) 비어 있을(receive) 때 얼마나 기다릴지*입니다.

```text
xTicksToWait 의미
  0                    : 즉시 반환 (non-blocking)
  pdMS_TO_TICKS(100)   : 100ms까지 기다림
  portMAX_DELAY        : 무한 대기 (INCLUDE_vTaskSuspend=1 필요)
```

```c
/* Producer */
SensorMsg_t msg = { .sensor_id = 1, .value = 3210, .timestamp = xTaskGetTickCount() };
if(xQueueSend(xSensorQueue, &msg, pdMS_TO_TICKS(10)) != pdPASS) {
    /* 10ms 안에 못 넣음 → 큐 가득 참 */
    drop_count++;
}

/* Consumer */
SensorMsg_t rx;
for(;;) {
    if(xQueueReceive(xSensorQueue, &rx, portMAX_DELAY) == pdPASS) {
        publish(rx.sensor_id, rx.value);
    }
}
```

`portMAX_DELAY`로 무한 대기 중인 consumer는 *Blocked 상태*입니다. CPU를 *전혀 쓰지 않습니다*. send가 도착하면 *커널이 깨워 Ready로 옮깁니다*.

## By-Copy — 핵심 의미

`xQueueSend`는 *값을 큐 내부로 복사*합니다. `xQueueReceive`는 *큐 내부에서 사용자 버퍼로 복사*합니다. 즉 *큐를 통과한 직후 원본을 수정해도 안전*하고, *큐가 가진 사본은 독립적*입니다.

```c
void prvProducer(void *pv) {
    SensorMsg_t msg;
    for(;;) {
        msg.value = read_adc();
        xQueueSend(xSensorQueue, &msg, 0);
        msg.value = 0xFFFF;     /* OK — 큐의 사본은 영향 없음 */
    }
}
```

복사 비용이 부담인 *큰 구조체*는 *포인터를 send*하는 패턴을 씁니다. 단, *생애주기 관리*가 *호출자 책임*이 됩니다.

```c
/* by-pointer 패턴 */
typedef struct { uint8_t *buf; size_t len; } Packet_t;

void prvProducer(void *pv) {
    Packet_t *pkt = pvPortMalloc(sizeof(Packet_t));
    pkt->buf = pvPortMalloc(1024);
    fill_packet(pkt);
    xQueueSend(xPktQueue, &pkt, portMAX_DELAY);   /* 포인터 한 개를 send */
    /* 여기서 pkt 또는 pkt->buf를 해제하면 안 됨 — 수신자가 해제 */
}

void prvConsumer(void *pv) {
    Packet_t *pkt;
    for(;;) {
        if(xQueueReceive(xPktQueue, &pkt, portMAX_DELAY) == pdPASS) {
            process(pkt);
            vPortFree(pkt->buf);
            vPortFree(pkt);
        }
    }
}
```

이 패턴은 *효율적*이지만 *해제 책임 누가 갖는지를 문서화*해야 합니다.

## 블로킹의 동작 — 내부

송신 측이 *가득 찬 큐에 send*하면 *send 태스크가 Blocked 상태*가 됩니다. 큐의 *waiters list*에 등록되고, *수신 측이 한 항목을 receive*하는 순간 *waiters 중 가장 우선순위 높은 태스크가 Ready*가 됩니다.

```text
시간축
   t0: ConsumerLow가 빈 큐에 receive(portMAX_DELAY) 호출 → Blocked
   t1: ConsumerHigh가 빈 큐에 receive 호출 → Blocked
   t2: Producer가 xQueueSend 호출
       → 큐에 데이터 들어감
       → ConsumerHigh가 우선순위 더 높음 → 깨움 → Ready
       → 즉시 Producer 선점 → ConsumerHigh가 receive 마치고 실행
   t3: ConsumerHigh가 다시 block 또는 yield
       → ConsumerLow는 큐에 데이터 없어 계속 Blocked
```

*큐 자체에 우선순위 정렬이 있는 것이 아니라 waiters를 깨울 때 우선순위를 본다*는 게 핵심입니다.

## Queue Set — 여러 큐를 한 번에 대기

여러 입력 소스를 *한 태스크가 동시에* 다뤄야 할 때 `QueueSet`을 씁니다.

```c
QueueSetHandle_t xQueueCreateSet(UBaseType_t uxEventQueueLength);
BaseType_t xQueueAddToSet(QueueSetMemberHandle_t xQueueOrSemaphore,
                           QueueSetHandle_t xQueueSet);
QueueSetMemberHandle_t xQueueSelectFromSet(QueueSetHandle_t xQueueSet,
                                            TickType_t xTicksToWait);
```

`configUSE_QUEUE_SETS=1`가 필요합니다. *set에 추가된 큐/세마포 어디든 데이터가 오면* `xQueueSelectFromSet`이 *그 핸들을 반환*합니다.

```c
QueueHandle_t xUartRx;   /* UART에서 받은 명령 */
QueueHandle_t xSensor;   /* 센서 측정값 */
SemaphoreHandle_t xBtn;  /* 버튼 이벤트 (binary semaphore) */

QueueSetHandle_t xSet = xQueueCreateSet(8 + 8 + 1);
xQueueAddToSet(xUartRx, xSet);
xQueueAddToSet(xSensor, xSet);
xQueueAddToSet(xBtn,    xSet);

void prvDispatcher(void *pv) {
    for(;;) {
        QueueSetMemberHandle_t xActive = xQueueSelectFromSet(xSet, portMAX_DELAY);
        if(xActive == xUartRx) {
            char cmd[16];
            xQueueReceive(xUartRx, cmd, 0);
            handle_cmd(cmd);
        } else if(xActive == xSensor) {
            SensorMsg_t m;
            xQueueReceive(xSensor, &m, 0);
            handle_sensor(&m);
        } else if(xActive == xBtn) {
            xSemaphoreTake(xBtn, 0);
            handle_button();
        }
    }
}
```

*주의*: `xQueueSelectFromSet`이 반환한 후에 *해당 큐/세마포로부터 다시 receive/take*를 *반드시* 호출해야 합니다. select가 *데이터를 꺼내주는 것이 아닙니다*.

Queue Set 길이는 *모든 멤버의 최대 깊이의 합*과 같거나 커야 합니다. 합보다 작으면 *busy 상태에서 send 누락*이 생깁니다.

## Mailbox 패턴 — 깊이 1

*"최신값만 알리면 되는"* 데이터는 *큐 깊이 1 + `xQueueOverwrite`*로 표현합니다.

```c
QueueHandle_t xMailbox = xQueueCreate(1, sizeof(uint16_t));

/* Producer: 어떤 일이 있어도 항상 가장 최신값을 갖게 만듦 */
uint16_t v = read_sensor();
xQueueOverwrite(xMailbox, &v);    /* 가득 차도 덮어쓰기 */

/* Consumer: 현재 값을 본다 (지우지 않음) */
uint16_t cur;
if(xQueuePeek(xMailbox, &cur, 0) == pdPASS) {
    use(cur);
}
```

| API | 행동 |
|-----|------|
| `xQueueSend` | 가득 차면 실패 또는 block |
| `xQueueOverwrite` | 가득 차면 *덮어쓰기 (실패 없음)* |
| `xQueuePeek` | 값을 보고 *남겨둠* |
| `xQueueReceive` | 값을 *꺼냄* |

mailbox는 *센서의 최신 상태, 시스템 모드, 현재 시각* 같은 *상태 변수*에 적합합니다. *이력이 필요 없는* 경우입니다.

## Queue vs Task Notification

큐는 강력하지만 *간단한 신호 전달*에는 무겁습니다. 한 태스크당 *한 32-bit notification value*를 갖는 *task notification*이 *큐보다 빠르고 가볍습니다* (RAM·CPU 둘 다).

```c
/* 알림 보내기 (큐와 비슷한 의미) */
xTaskNotify(xWorkerHandle, /*value=*/0x01, eSetBits);

/* 알림 받기 */
uint32_t notified;
xTaskNotifyWait(/*clearOnEntry=*/0,
                /*clearOnExit=*/0xFFFFFFFF,
                &notified,
                portMAX_DELAY);
```

| 목적 | 큐 | Task Notification |
|------|-----|-------------------|
| 작은 값 1개 전달 | OK | *훨씬 빠름* |
| 여러 producer → 1 consumer | OK | OK |
| 1 producer → 여러 consumer | OK | *불가* (1 태스크 전용) |
| 큰 구조체 | OK | 불가 |
| 깊이 > 1 | OK | 불가 (값이 OR/덮어쓰기) |

*1-to-1 신호*는 task notification, *큰 데이터·복수 consumer*는 큐로 가르는 게 흔한 분배입니다.

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| xQueueReceive가 항상 timeout | 큐가 정말 비어 있음 | producer 동작 확인, send 반환값 검사 |
| 큐가 자주 가득 참 | consumer가 너무 느림 | consumer 우선순위 ↑, 큐 깊이 ↑ |
| xQueueSend에 NULL pointer 넘김 | 컴파일러 경고 없이 죽음 | 컴파일 시 -Wall -Wnonnull |
| sizeof(struct) 대신 sizeof(struct*) 큐 만듦 | by-copy인데 포인터만 복사 (의도?) | 의도면 OK, 아니면 sizeof(T) |
| portMAX_DELAY로 무한 대기 → 응답 없음 | INCLUDE_vTaskSuspend=0 | FreeRTOSConfig.h에서 1로 |
| queue set 길이가 모자람 | send 누락 | 모든 멤버 깊이 합 이상으로 |
| ISR에서 xQueueSend 호출 | crash | xQueueSendFromISR 사용 |
| xQueueOverwrite로 큐 깊이 2+ 사용 | assert (overwrite는 깊이 1만) | 깊이 1로 만들기 |
| 큐 내부 데이터 정렬 안 됨 (32-bit 멤버 4 byte 비정렬) | Cortex-M에서 misaligned fault | 구조체에 padding 추가 |

## 정리

- 큐는 *FIFO·고정 크기·by-copy*의 thread-safe 컨테이너입니다. *생산자-소비자 패턴*을 자연스럽게 표현하고, *공유 변수보다 안전*합니다.
- *`xQueueCreate(length, itemSize)`*가 *length × itemSize*의 데이터 영역을 잡습니다. 큰 구조체는 *포인터를 send*하되 *해제 책임을 명시*합니다.
- *`xTicksToWait`*가 *블로킹 시간*입니다. `0`은 non-blocking, `portMAX_DELAY`는 무한, 그 사이는 timeout 있는 대기입니다.
- *송수신 시 우선순위 높은 waiter가 먼저 깨워집니다*. 큐가 우선순위로 정렬되는 게 아니라 *waiters 깨움 시 우선순위가 적용*됩니다.
- *Queue Set*은 *여러 큐/세마포를 동시에 대기*합니다. `xQueueSelectFromSet`이 *활성 핸들만 반환*하고 *데이터는 별도로 꺼냅니다*.
- *Mailbox 패턴*은 *깊이 1 + `xQueueOverwrite` + `xQueuePeek`*입니다. *최신 상태*만 의미 있는 데이터에 적합합니다.
- *Task notification*은 *1-to-1 작은 신호*에 *큐보다 빠르고 가볍습니다*. 여러 consumer가 필요하면 큐를 씁니다.
- 큐가 *자주 차거나 자주 비면* consumer 우선순위·큐 깊이·send timeout을 함께 조정합니다. *드롭 카운터*를 두면 부담 분포가 보입니다.

## 다음 편

[Ch 5: Software Timer Management](/blog/embedded/rtos/freertos-mastering/chapter05-software-timers)에서 *소프트웨어 타이머*를 다룹니다. *타이머 데몬이 큐로 동작하는 이유*, *one-shot vs auto-reload*, *콜백 안에서 해야 할 것·하지 말아야 할 것*을 봅니다.

## 관련 항목

- [Ch 3: Task Management](/blog/embedded/rtos/freertos-mastering/chapter03-task-management)
- [Ch 5: Software Timer Management](/blog/embedded/rtos/freertos-mastering/chapter05-software-timers)
- [Ch 6: Interrupt Management](/blog/embedded/rtos/freertos-mastering/chapter06-interrupt-management) — `xQueueSendFromISR`
- [Ch 7: Resource Management](/blog/embedded/rtos/freertos-mastering/chapter07-resource-management) — 세마포·뮤텍스도 큐
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — 큐 내부 구현
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [원문 — FreeRTOS Queue Management](https://www.freertos.org/Embedded-RTOS-Queues.html)
- [원문 — Task Notifications](https://www.freertos.org/RTOS-task-notifications.html)
