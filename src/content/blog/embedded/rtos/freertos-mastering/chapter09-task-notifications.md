---
title: "Ch 9: Task Notifications"
date: 2026-05-09T09:00:00
description: "xTaskNotify·NotifyValue — 큐/세마포보다 가볍고 빠른 알림 방식."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 9
tags: [freertos, notification, lightweight-ipc]
draft: false
---

## 한 줄 요약

> **"Task notification은 *모든 태스크가 기본으로 갖는 32-bit notification value*를 통해 *큐와 세마포 없이* 알림을 주고받는 방식입니다. 객체를 따로 만들지 않아서 *RAM이 거의 0*이고, 컨텍스트 스위치 비용도 일반 큐 대비 *45% 가량 빠르다*고 공식 문서가 밝힙니다. 단일 수신자 한정이라는 제약을 받아들이면 *binary/counting semaphore의 직접 대체*가 됩니다."**

큐, 세마포, event group은 모두 *별도의 커널 객체*입니다. 객체마다 헤더와 임계 영역 락이 따라옵니다. *수신자가 한 명뿐*인 패턴에서는 그 비용이 낭비입니다. FreeRTOS 8.2부터 *모든 TCB(task control block)에 32-bit 알림 값이 내장*되어, 객체 없이 직접 통신할 수 있게 됐습니다. 이번 장에서는 노티 값과 상태, 6가지 액션, 세마포 대체 패턴, 그리고 성능 벤치마크를 다룹니다.

## Notification value와 state

각 태스크의 TCB는 다음 두 필드를 갖습니다.

| TCB 필드 | 크기 | 값 |
|----------|------|-----|
| `ucNotifyState[N]` | 1 byte × N | `taskNOT_WAITING_NOTIFICATION` / `taskWAITING_NOTIFICATION` / `taskNOTIFICATION_RECEIVED` |
| `ulNotifiedValue[N]` | 4 byte × N | 32-bit 알림 값 |

여기서 `N = configTASK_NOTIFICATION_ARRAY_ENTRIES` 입니다.

기본 `configTASK_NOTIFICATION_ARRAY_ENTRIES`는 1입니다. 즉 *태스크당 노티 슬롯 하나*. v10.4부터 *배열로 확장 가능*해서, 한 태스크가 *여러 종류의 알림을 별도 슬롯*으로 관리할 수 있습니다.

```c
/* FreeRTOSConfig.h */
#define configTASK_NOTIFICATION_ARRAY_ENTRIES   3   /* 슬롯 3개 */
```

| 슬롯 인덱스 | 흔한 용도 |
|------------|----------|
| 0 (default) | 일반 시그널, 세마포 대체 |
| 1 | 큐 wake-up 등 별도 채널 |
| 2 | 에러/예외 알림 |

## 6가지 action — eNotifyAction

`xTaskNotify`는 *어떤 식으로 값을 갱신할지*를 enum으로 지정합니다.

```c
typedef enum {
    eNoAction = 0,                  /* 값 갱신 없음, 단순 wake */
    eSetBits,                       /* 비트 OR */
    eIncrement,                     /* +1 */
    eSetValueWithOverwrite,         /* 무조건 덮어쓰기 */
    eSetValueWithoutOverwrite,      /* 이전 값이 안 읽혔으면 실패 */
} eNotifyAction;
```

| Action | 의미 | 대체 가능 객체 |
|--------|------|---------------|
| `eNoAction` | 깨우기만 함 | binary semaphore (Give) |
| `eSetBits` | 비트 OR로 누적 | event group (24-bit 한정) |
| `eIncrement` | 카운트 증가 | counting semaphore |
| `eSetValueWithOverwrite` | 최신값 1개 | length 1 queue (overwrite) |
| `eSetValueWithoutOverwrite` | 1회용 메시지 | length 1 queue (block on full) |

`eSetValueWithoutOverwrite`는 *이전 값이 아직 안 읽힌 경우 pdFAIL을 반환*합니다. 메시지 손실을 감지하고 싶을 때 유용합니다.

## 핵심 API

### 보내는 쪽

```c
/* 일반적인 보내기 */
BaseType_t xTaskNotify(TaskHandle_t xTaskToNotify,
                       uint32_t ulValue,
                       eNotifyAction eAction);

/* 인덱스 지정 (배열 사용 시) */
BaseType_t xTaskNotifyIndexed(TaskHandle_t xTask, UBaseType_t uxIndex,
                              uint32_t ulValue, eNotifyAction eAction);

/* 이전 값을 같이 받음 */
BaseType_t xTaskNotifyAndQuery(TaskHandle_t xTask, uint32_t ulValue,
                                eNotifyAction eAction,
                                uint32_t *pulPreviousNotificationValue);

/* ISR 변형 */
BaseType_t xTaskNotifyFromISR(TaskHandle_t xTask, uint32_t ulValue,
                               eNotifyAction eAction,
                               BaseType_t *pxHigherPriorityTaskWoken);

/* counting-semaphore 흉내 (eIncrement의 shortcut) */
BaseType_t xTaskNotifyGive(TaskHandle_t xTask);
void vTaskNotifyGiveFromISR(TaskHandle_t xTask, BaseType_t *pxHigherTaskWoken);
```

### 받는 쪽

```c
/* 일반 wait — bits 지정 가능 */
BaseType_t xTaskNotifyWait(uint32_t ulBitsToClearOnEntry,
                           uint32_t ulBitsToClearOnExit,
                           uint32_t *pulNotificationValue,
                           TickType_t xTicksToWait);

/* counting-semaphore Take 흉내 */
uint32_t ulTaskNotifyTake(BaseType_t xClearCountOnExit,
                          TickType_t xTicksToWait);
```

`ulTaskNotifyTake`의 `xClearCountOnExit`가 `pdTRUE`면 *binary semaphore*, `pdFALSE`면 *counting semaphore*처럼 동작합니다. 깨어날 때 *카운트를 0으로 리셋할지 1만 감소할지* 차이입니다.

## 세마포 대체 — 가장 흔한 패턴

UART RX ISR이 데이터 한 줄을 받고 처리 태스크를 깨우는 전형적인 시나리오입니다.

```c
/* 큐+세마포 버전 (전통) */
SemaphoreHandle_t rx_sem;

void uart_isr(void)
{
    BaseType_t hp = pdFALSE;
    xSemaphoreGiveFromISR(rx_sem, &hp);
    portYIELD_FROM_ISR(hp);
}

void rx_task(void *p)
{
    for (;;) {
        xSemaphoreTake(rx_sem, portMAX_DELAY);
        process_rx_line();
    }
}
```

```c
/* Task notification 버전 (권장) */
static TaskHandle_t g_rx_task;

void uart_isr(void)
{
    BaseType_t hp = pdFALSE;
    vTaskNotifyGiveFromISR(g_rx_task, &hp);
    portYIELD_FROM_ISR(hp);
}

void rx_task(void *p)
{
    g_rx_task = xTaskGetCurrentTaskHandle();
    for (;;) {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);   /* binary */
        process_rx_line();
    }
}
```

세마포 핸들을 따로 만들지 않고, *태스크 핸들 자체*가 통신 endpoint입니다. RAM은 0이 추가되고, 한 번의 락 + 한 번의 값 갱신으로 끝나서 빠릅니다.

## counting semaphore 대체

ISR에서 *여러 이벤트가 빠르게* 발생하고 태스크가 *나중에 한꺼번에* 처리해야 할 때, `eIncrement`로 카운트를 누적합니다.

```c
void timer_isr(void)
{
    BaseType_t hp = pdFALSE;
    vTaskNotifyGiveFromISR(g_worker, &hp);
    portYIELD_FROM_ISR(hp);
}

void worker(void *p)
{
    for (;;) {
        uint32_t n = ulTaskNotifyTake(
            pdFALSE,           /* 1만 감소, 카운트 유지 */
            portMAX_DELAY
        );
        /* n = 깨어난 시점의 카운트 (보통 1, 폭주 시 N) */
        for (uint32_t i = 0; i < n; ++i) {
            do_one_unit();
        }
    }
}
```

`xClearCountOnExit=pdFALSE`라서 *놓친 이벤트가 자동으로 누적*됩니다. counting semaphore와 동일한 의미입니다.

## eSetBits — event group 대체

24개를 넘지 않고 *단일 수신자*면 event group보다 notification이 가볍습니다.

```c
#define EVT_NETWORK_UP   (1U << 0)
#define EVT_CONFIG_READY (1U << 1)
#define EVT_TIME_SYNCED  (1U << 2)

void wifi_done(void)  { xTaskNotify(g_main, EVT_NETWORK_UP,  eSetBits); }
void cfg_done(void)   { xTaskNotify(g_main, EVT_CONFIG_READY, eSetBits); }
void sntp_done(void)  { xTaskNotify(g_main, EVT_TIME_SYNCED, eSetBits); }

void main_task(void *p)
{
    uint32_t val = 0;
    while ((val & 0x7) != 0x7) {
        uint32_t inc;
        xTaskNotifyWait(0, 0, &inc, portMAX_DELAY);
        val |= inc;
    }
    run_app();
}
```

*수신자가 한 명이라는 전제*만 지키면 event group의 비트 OR와 동일한 효과입니다. 객체가 없어서 *생성/삭제 비용도 없습니다*.

## 벤치마크

FreeRTOS 공식 비교(Cortex-M3 @ 16 MHz, GCC -O2 기준)입니다.

| 패턴 | 사이클(보낸이 + 받은이) | RAM |
|------|----------------------|-----|
| Binary semaphore Give + Take | ~3000 | ~80 B |
| Length 1 queue Send + Receive | ~3300 | ~88 B + 4 B item |
| Task notification Give + Take | ~1600 | 0 (TCB 내장) |

같은 알림 한 번에 *약 45% 사이클*과 *80B+ RAM*을 아낍니다. 양산 펌웨어에서 *태스크 수십 개*와 *세마포 수십 개*를 운용하면 누적 효과가 큽니다.

## 제약 — 단일 수신자

Notification value는 *해당 태스크 한 명만* 읽을 수 있습니다. *broadcast가 필요한 경우 event group이 옳은 선택*입니다. 또한 *여러 producer가 같은 비트를 set*하면 그 사이를 *읽기 전에* 한꺼번에 누적될 수 있으므로, *읽은 즉시 처리*하는 패턴이 안전합니다.

| 허용 | 회피 |
|------|------|
| ISR → Task | Task A → Task B and Task C (둘 다 수신) |
| Task A → Task B | ISR → Multiple tasks (broadcast) |
| Multiple producers → Single Task | Multiple consumers of one notification |

## 인덱스 슬롯 활용

배열 슬롯을 켜면 *한 태스크가 여러 채널*을 갖습니다. *제어 채널과 데이터 채널 분리* 같은 패턴에 유용합니다.

```c
/* FreeRTOSConfig.h */
#define configTASK_NOTIFICATION_ARRAY_ENTRIES   2

/* 채널 0: 제어 (start/stop) */
xTaskNotifyIndexed(g_motor, 0, MOTOR_START, eSetValueWithOverwrite);

/* 채널 1: 위치 업데이트 (덮어쓰기) */
xTaskNotifyIndexed(g_motor, 1, target_pos, eSetValueWithOverwrite);

void motor_task(void *p)
{
    for (;;) {
        uint32_t cmd, pos;
        if (xTaskNotifyWaitIndexed(0, 0, ULONG_MAX, &cmd, 0) == pdTRUE) {
            apply_command(cmd);
        }
        if (xTaskNotifyWaitIndexed(1, 0, ULONG_MAX, &pos, 0) == pdTRUE) {
            move_to(pos);
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
```

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| xTaskNotify 후 즉시 보이지 않음 | xClearOnEntry로 직전 값 지움 | clear 마스크 정리 |
| NotifyGive 후 Take가 0 반환 | eIncrement인데 Take가 너무 빠름 | portMAX_DELAY 또는 적절 timeout |
| 다른 태스크도 같은 알림 받고 싶음 | notification은 단일 수신자 only | event group 사용 |
| ISR에서 일반 Notify 호출 후 hard fault | non-FromISR API | xTaskNotifyFromISR |
| 배열 인덱스 잘못 (slot 1 없음) | ARRAY_ENTRIES=1 | configTASK_NOTIFICATION_ARRAY_ENTRIES 늘림 |
| TaskHandle이 NULL인 상태로 보냄 | create 직후 핸들 미저장 | xTaskCreate의 &handle 저장 |

가장 흔한 함정은 *수신자가 두 곳에서 읽으려는 시도*입니다. notification은 *오직 한 태스크 한 슬롯*입니다. 여러 곳에서 신호를 받아야 하면 *처음부터 event group이나 queue를 쓰는 편*이 옳습니다.

## 정리

- Task notification은 *모든 태스크의 TCB에 내장된 32-bit 값*을 통해 객체 없이 통신하는 경량 IPC입니다.
- 6가지 action(`eNoAction`/`eSetBits`/`eIncrement`/`eSetValueWith[out]Overwrite`)으로 *세마포·event group·queue를 부분 대체*합니다.
- `vTaskNotifyGiveFromISR` + `ulTaskNotifyTake` 조합이 *ISR-to-task* 알림의 표준 패턴입니다.
- RAM은 0, 사이클은 큐 대비 약 45% 빠릅니다. 양산에서 누적 효과가 큽니다.
- 단점은 *단일 수신자 한정*. broadcast가 필요하면 event group으로 갑니다.
- `configTASK_NOTIFICATION_ARRAY_ENTRIES`를 늘리면 *한 태스크에 여러 채널*을 둘 수 있습니다.
- `eSetValueWithoutOverwrite`로 *손실 감지*가 가능합니다. *eSetValueWithOverwrite는 최신값만 의미 있을 때* 씁니다.
- 큐와 세마포를 모두 task notification으로 갈아치우는 것이 아니라, *수신자가 한 명*일 때 우선 선택입니다.

## 다음 편

[Ch 10: Stream and Message Buffers](/blog/embedded/rtos/freertos-mastering/chapter10-stream-message-buffers)에서는 *단일 reader/writer용 lock-free 버퍼*를 다룹니다. 듀얼 코어(RP2040·ESP32-S3) 등 *AMP* 통신에 특히 적합한 객체입니다.

## 관련 항목

- [Ch 6: Queue Management](/blog/embedded/rtos/freertos-mastering/chapter06-queue-management) — 객체 기반 IPC의 표준
- [Ch 8: Event Groups](/blog/embedded/rtos/freertos-mastering/chapter08-event-groups) — broadcast 대안
- [Ch 10: Stream and Message Buffers](/blog/embedded/rtos/freertos-mastering/chapter10-stream-message-buffers)
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [원문 — FreeRTOS Task Notifications](https://www.freertos.org/RTOS-task-notifications.html)
