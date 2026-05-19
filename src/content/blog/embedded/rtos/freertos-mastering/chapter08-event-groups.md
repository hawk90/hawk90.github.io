---
title: "Ch 8: Event Groups"
date: 2026-05-09T08:00:00
description: "xEventGroupSetBits·WaitForBits — 24비트 이벤트 플래그로 다중 동기화."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 8
tags: [freertos, event-group, synchronization, rendezvous]
draft: false
---

## 한 줄 요약

> **"Event group은 *24비트의 이벤트 플래그*입니다. 여러 태스크가 *같은 비트 묶음*을 보고 깨어나거나 기다릴 수 있어서, 큐·세마포로는 표현이 번거로운 *broadcast*와 *rendezvous*를 깨끗하게 풉니다. `xEventGroupWaitBits`는 *AND/OR* 조건과 *auto-clear*를 옵션으로 갖고, `xEventGroupSync`는 *세 태스크 이상이 한 지점에서 만나는* 동기화를 한 API로 제공합니다."**

큐는 1:1 또는 1:N producer/consumer에 강하고, 세마포는 자원 카운트에 강하지만, *"네 가지 초기화가 모두 끝났을 때 메인 루프 시작"* 같은 *AND 조건*은 표현이 어색합니다. Event group은 *비트 묶음을 한 단위*로 다루기 때문에 이런 패턴이 자연스럽습니다. 이번 장에서는 24-bit 표현, 핵심 API, *wait any/all*, *auto-clear*, 그리고 *rendezvous* 패턴까지 한 번에 살펴봅니다.

## 24-bit 이벤트 비트

Event group의 본체는 *`EventBits_t`* 타입의 비트맵입니다. 폭은 `configUSE_16_BIT_TICKS`에 따라 정해지는데, *32-bit MCU 기본 설정에서는 24비트*가 사용자 비트이고 상위 8비트는 *커널 예약*입니다.

```c
/* event_groups.h (요약) */
typedef TickType_t EventBits_t;

#define eventEVENT_BITS_CONTROL_BYTES   0xff000000U  /* upper 8 bits reserved */
```

| `configUSE_16_BIT_TICKS` | EventBits_t 폭 | 사용자 비트 | 예약 비트 |
|--------------------------|---------------|------------|----------|
| 0 (default, 32-bit MCU) | 32 | 0~23 (24개) | 24~31 |
| 1 (8/16-bit MCU) | 16 | 0~7 (8개) | 8~15 |

24개 사용자 비트가 너무 적다고 느낄 수 있는데, 실제 펌웨어에서 *한 묶음으로 묶어야 할 이벤트는 보통 10개를 넘지 않습니다*. 더 많은 비트가 필요하면 *event group을 두 개* 만드는 편이 깔끔합니다.

```c
/* 비트 의미를 enum이나 #define으로 명확하게 부여합니다. */
#define EVT_WIFI_CONNECTED      (1U << 0)
#define EVT_MQTT_CONNECTED      (1U << 1)
#define EVT_TIME_SYNCED         (1U << 2)
#define EVT_CONFIG_LOADED       (1U << 3)
#define EVT_ALL_READY           (EVT_WIFI_CONNECTED | EVT_MQTT_CONNECTED \
                                 | EVT_TIME_SYNCED | EVT_CONFIG_LOADED)
```

## 생성과 set/clear

```c
#include "FreeRTOS.h"
#include "event_groups.h"

static EventGroupHandle_t g_boot_evt;

void boot_event_init(void)
{
    g_boot_evt = xEventGroupCreate();
    configASSERT(g_boot_evt != NULL);
}

/* 비트 set — 다른 태스크의 wait를 깨울 수 있습니다. */
EventBits_t prev = xEventGroupSetBits(g_boot_evt, EVT_WIFI_CONNECTED);

/* 비트 clear — 명시적으로 지움. wait 조건은 깨우지 않습니다. */
xEventGroupClearBits(g_boot_evt, EVT_WIFI_CONNECTED);

/* 현재 값 읽기 (수정 없이). */
EventBits_t now = xEventGroupGetBits(g_boot_evt);
```

`xEventGroupSetBits`는 *daemon task*에 작업을 위임해서 처리합니다. 호출자는 즉시 반환되지만, 실제 비트 세팅과 wait 풀이는 *timer service task* 우선순위에서 일어납니다. 그래서 *`configTIMER_TASK_PRIORITY`가 충분히 높아야* 응답성이 보장됩니다.

ISR 안에서는 *FromISR 변형*을 씁니다.

```c
void uart_rx_isr(void)
{
    BaseType_t higher = pdFALSE;
    xEventGroupSetBitsFromISR(g_boot_evt, EVT_UART_RX, &higher);
    portYIELD_FROM_ISR(higher);
}
```

## xEventGroupWaitBits — AND / OR / auto-clear

`xEventGroupWaitBits`는 *기다릴 비트 묶음*, *AND인지 OR인지*, *깬 뒤에 자동으로 clear할지*를 인자로 받습니다.

```c
EventBits_t xEventGroupWaitBits(
    EventGroupHandle_t  xEventGroup,
    const EventBits_t   uxBitsToWaitFor,
    const BaseType_t    xClearOnExit,
    const BaseType_t    xWaitForAllBits,
    TickType_t          xTicksToWait
);
```

- `uxBitsToWaitFor`: 관심 있는 비트 집합.
- `xClearOnExit`: `pdTRUE`면 깨어날 때 *해당 비트들을 자동 clear*. 한 번만 처리하는 이벤트에 쓰면 안전합니다.
- `xWaitForAllBits`: `pdTRUE`면 *AND*(모두 set되어야 깸), `pdFALSE`면 *OR*(하나라도 set되면 깸).
- 반환값: *block 해제 시점의 비트 값*입니다. 어떤 비트가 set되어 깨어났는지 확인할 수 있습니다.

```c
/* AND + auto-clear — "네 단계가 모두 끝나면" */
void app_main_task(void *param)
{
    EventBits_t bits = xEventGroupWaitBits(
        g_boot_evt,
        EVT_ALL_READY,        /* WIFI | MQTT | TIME | CONFIG */
        pdTRUE,               /* clear on exit */
        pdTRUE,               /* wait for ALL bits */
        portMAX_DELAY
    );

    if ((bits & EVT_ALL_READY) == EVT_ALL_READY) {
        run_main_loop();
    }
}

/* OR + 유지 — "WIFI 또는 BLE 중 하나라도 연결되면" */
EventBits_t bits = xEventGroupWaitBits(
    g_link_evt,
    EVT_WIFI_LINK | EVT_BLE_LINK,
    pdFALSE,                  /* don't clear */
    pdFALSE,                  /* wait for ANY bit */
    pdMS_TO_TICKS(5000)
);

if (bits & EVT_WIFI_LINK)      use_wifi_path();
else if (bits & EVT_BLE_LINK)  use_ble_path();
else                            timeout_handler();
```

`xClearOnExit`는 *깨어난 비트만* clear합니다. 여러 태스크가 같은 비트를 기다리면 *먼저 깬 태스크가 clear*해 버려서 나머지가 못 깨는 race가 생깁니다. *broadcast가 필요한 비트는 clear하지 말고*, 별도의 *one-shot 비트*를 두는 것이 안전합니다.

## xEventGroupSync — 다중 태스크 rendezvous

`xEventGroupSync`는 *여러 태스크가 한 지점에서 모이는* 패턴을 위한 전용 API입니다. 각 태스크가 *자기 비트를 set*하면서 *다른 태스크의 비트도 함께 기다리는* 한 호출입니다.

```c
EventBits_t xEventGroupSync(
    EventGroupHandle_t xEventGroup,
    const EventBits_t  uxBitsToSet,     /* 내가 set할 비트 */
    const EventBits_t  uxBitsToWaitFor, /* 모든 태스크가 set해야 할 비트 묶음 */
    TickType_t         xTicksToWait
);
```

세 태스크가 *한 회의 지점에서 만난 뒤 다음 라운드로 진행*하는 예입니다.

```c
#define SYNC_TASK_A   (1U << 0)
#define SYNC_TASK_B   (1U << 1)
#define SYNC_TASK_C   (1U << 2)
#define SYNC_ALL      (SYNC_TASK_A | SYNC_TASK_B | SYNC_TASK_C)

static EventGroupHandle_t g_sync;

void task_a(void *p)
{
    for (;;) {
        do_phase1_a();
        xEventGroupSync(g_sync, SYNC_TASK_A, SYNC_ALL, portMAX_DELAY);
        do_phase2_a();
        xEventGroupSync(g_sync, SYNC_TASK_A, SYNC_ALL, portMAX_DELAY);
    }
}

void task_b(void *p)
{
    for (;;) {
        do_phase1_b();
        xEventGroupSync(g_sync, SYNC_TASK_B, SYNC_ALL, portMAX_DELAY);
        do_phase2_b();
        xEventGroupSync(g_sync, SYNC_TASK_B, SYNC_ALL, portMAX_DELAY);
    }
}

void task_c(void *p) { /* task_b와 대칭, SYNC_TASK_C 사용 */ }
```

`xEventGroupSync`는 *세 태스크가 모두 도착*하면 *지정한 비트들을 한 번에 clear*하고 세 태스크를 동시에 깨웁니다. 이걸 `WaitBits`만으로 직접 구현하면 *마지막 도착자가 clear*해야 하는데, 그 시점을 정하기 어렵습니다. `Sync`가 이 race를 *원자적으로* 해결해 줍니다.

## 타이밍 그림

```text
Task A      Task B      Task C       g_sync bits
─────────────────────────────────────────────────
do_a1                                 0x000
            do_b1                     0x000
Sync(A,ALL)                           0x001  (A 도착, 대기)
            Sync(B,ALL)               0x003  (B 도착, 대기)
                        do_c1
                        Sync(C,ALL)   0x000  (C 도착, ALL 충족 → 동시 wake + clear)
do_a2       do_b2       do_c2         (세 태스크 모두 깨어남)
```

## 흔한 패턴 — boot ordering

복잡한 *부팅 시퀀스*를 event group 하나로 정리하는 예입니다. 각 초기화 태스크가 *자기 비트를 set*하고, 메인 태스크가 *모든 비트가 set될 때까지* 기다립니다.

```c
static EventGroupHandle_t g_boot;

void wifi_init_task(void *p)
{
    wifi_connect();
    xEventGroupSetBits(g_boot, EVT_WIFI_CONNECTED);
    vTaskDelete(NULL);
}

void mqtt_init_task(void *p)
{
    /* WiFi가 먼저 올라온 뒤 시작 */
    xEventGroupWaitBits(g_boot, EVT_WIFI_CONNECTED,
                        pdFALSE, pdTRUE, portMAX_DELAY);
    mqtt_connect();
    xEventGroupSetBits(g_boot, EVT_MQTT_CONNECTED);
    vTaskDelete(NULL);
}

void time_sync_task(void *p) { /* SNTP, EVT_TIME_SYNCED 처리 */ }
void config_load_task(void *p) { /* flash 로드, EVT_CONFIG_LOADED 처리 */ }

void main_task(void *p)
{
    g_boot = xEventGroupCreate();

    xTaskCreate(wifi_init_task,    "wifi",   2048, NULL, 3, NULL);
    xTaskCreate(mqtt_init_task,    "mqtt",   2048, NULL, 3, NULL);
    xTaskCreate(time_sync_task,    "time",   2048, NULL, 3, NULL);
    xTaskCreate(config_load_task,  "cfg",    1024, NULL, 3, NULL);

    EventBits_t bits = xEventGroupWaitBits(
        g_boot, EVT_ALL_READY,
        pdFALSE, pdTRUE,
        pdMS_TO_TICKS(30000)
    );

    if ((bits & EVT_ALL_READY) != EVT_ALL_READY) {
        log_error("boot timeout, missing: 0x%lx", EVT_ALL_READY & ~bits);
        reset_device();
    }

    run_main_loop();
}
```

선형 코드처럼 읽히는데 실제로는 *네 태스크가 병렬*로 초기화됩니다. 부팅 시간이 *직렬 합*에서 *최대값*으로 줄어듭니다.

## 큐·세마포와의 비교

| 특성 | Queue | Binary semaphore | Event group |
|------|-------|------------------|-------------|
| 데이터 전달 | 있음 (copy) | 없음 | 없음 (비트만) |
| broadcast | 어려움 (N개 큐) | 어려움 (Give 한 번) | 자연스러움 (set 한 번) |
| AND 조건 | 직접 구현 | 직접 구현 | `xWaitForAllBits=pdTRUE` |
| 다중 대기자 깨우기 | 1명만 | 1명만 | 모두 |
| RAM (객체당) | ~80 B + buffer | ~80 B | ~16 B |
| ISR set | FromISR | FromISR | FromISR (daemon 경유) |

세 가지를 *경합*시키지 말고, *서로 다른 문제*에 쓰는 것이 핵심입니다. 데이터 전달은 큐, 자원 카운트는 세마포, *조건 묶음*은 event group입니다.

## 자주 하는 실수

```text
증상                                    원인                                해결
─────────────────────────────────────────────────────────────────────────────────
xEventGroupSetBits 호출 후 즉시 wake X  daemon task 우선순위가 낮음          configTIMER_TASK_PRIORITY 상향
auto-clear 후 다른 태스크가 못 깸       broadcast 비트를 clear함             clear하지 말거나 sync 사용
EventBits_t가 16-bit만 동작             configUSE_16_BIT_TICKS=1             32-bit 모드로
upper 8 bits 사용했을 때 동작 이상      커널 예약 비트 침범                  0xFFFFFF 이하만 사용
ISR에서 SetBits 직후 ASSERT              non-FromISR 호출                    SetBitsFromISR 사용
모든 비트 set인데도 wait 안 풀림         xWaitForAllBits=pdFALSE 오설정      AND 조건은 pdTRUE
```

가장 잦은 실수가 *AND/OR 플래그 혼동*입니다. *"모두 set돼야 깨어남"이 OR 같아 보이지만 AND*입니다. 매개변수 이름이 `xWaitForAllBits`라는 점을 기억하면 헷갈리지 않습니다.

## 정리

- Event group은 *24비트 이벤트 플래그*로 다중 태스크의 *broadcast·AND/OR·rendezvous*를 자연스럽게 표현합니다.
- `xEventGroupSetBits`/`ClearBits`/`WaitBits`가 핵심 3종 세트입니다. 비트 의미는 `#define` 또는 enum으로 명확히 부여합니다.
- `xWaitForAllBits=pdTRUE`가 AND, `pdFALSE`가 OR입니다. `xClearOnExit`는 *한 번만 처리하는 이벤트*에서만 안전합니다.
- `xEventGroupSync`는 *세 태스크 이상의 rendezvous*를 원자적으로 해결합니다. 직접 구현하면 race가 생깁니다.
- 부팅 시퀀스를 *비트 묶음 + 메인 태스크 단일 wait*로 정리하면 *직렬 합 시간이 최대값으로* 줄어듭니다.
- daemon task가 처리하므로 `configTIMER_TASK_PRIORITY`가 충분히 높아야 응답성이 보장됩니다.
- ISR에서는 `FromISR` 변형을 쓰고 `portYIELD_FROM_ISR`로 마무리합니다.
- 큐·세마포·event group은 *경합 관계가 아니라 보완 관계*입니다. 문제에 맞는 객체를 고릅니다.

## 다음 편

[Ch 9: Task Notifications](/blog/embedded/rtos/freertos-mastering/chapter09-task-notifications)에서는 *큐와 세마포의 경량 대안*을 다룹니다. 태스크 하나에 *32-bit notification value*를 내장해서 RAM과 사이클을 크게 줄이는 패턴입니다.

## 관련 항목

- [Ch 7: Software Timers](/blog/embedded/rtos/freertos-mastering/chapter07-software-timers) — daemon task 우선순위와의 상호작용
- [Ch 9: Task Notifications](/blog/embedded/rtos/freertos-mastering/chapter09-task-notifications) — 경량 대안
- [Ch 10: Stream and Message Buffers](/blog/embedded/rtos/freertos-mastering/chapter10-stream-message-buffers) — 단일 reader/writer용
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos) — ESP-IDF 변형
- [원문 — FreeRTOS Event Groups](https://www.freertos.org/Real-time-embedded-RTOS-Event-Groups.html)
