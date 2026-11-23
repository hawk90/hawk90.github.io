---
title: "ESP32-C3 위 FreeRTOS — 단일 코어 RTOS 활용 전략"
slug: "embedded/riscv/esp32-c3-mastering/chapter10-freertos"
date: 2026-05-20T09:10:00
description: "ESP32-C3의 ESP-IDF v5.4.2 FreeRTOS를 QEMU에서 직접 돌려 우선순위·tick·byte 단위 stack·queue·stack overflow 검출을 확인하고, watchdog과 tickless idle의 기본 설정을 Kconfig로 정리합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 10
tags: [freertos, rtos, task, queue, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3의 FreeRTOS는 코어 하나에서 돌지만, preemption과 ISR 때문에 동시성 문제는 그대로 남습니다.** ESP-IDF 판 FreeRTOS는 stack을 byte로 세고, 기본 tick은 100 Hz라 10 ms보다 짧은 `vTaskDelay()`는 0 tick이 됩니다.

ESP-IDF는 FreeRTOS를 Espressif 방식으로 고친 fork를 씁니다. 공식 FreeRTOS 문서를 그대로 읽으면 stack 단위와 tick 같은 기본값에서 어긋나는 곳이 있습니다. 이 장은 [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2)의 `components/freertos`와 C3 RISC-V port를 기준으로 하고, Espressif QEMU(`esp_develop_9.0.0_20240606`)에서 실제로 돌린 결과를 함께 싣습니다. QEMU의 시간은 실제 칩과 같지 않으므로 타이밍 수치는 다루지 않습니다.

## 단일 코어 FreeRTOS

한 사람이 여러 일을 번갈아 하는 것처럼, C3에서는 모든 task가 한 코어를 시분할로 나눠 씁니다. 그래도 높은 우선순위 task가 언제든 끼어들 수 있으므로 공유 데이터는 보호해야 합니다.

```c
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

void sensor_task(void *param)
{
    (void)param;
    while (1) {
        // 센서 읽기
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

void app_main(void)
{
    BaseType_t result = xTaskCreate(sensor_task,        // 함수
                "sensor",            // 이름 (디버깅용)
                4096,                // ESP-IDF stack byte count
                NULL,                // param
                5,                   // priority (0~24)
                NULL);              // handle out
    if (result != pdPASS) printf("task creation failed\n");
}
```

QEMU에서 `app_main()`이 기본 설정 값을 직접 출력하게 했습니다.

```text
configMAX_PRIORITIES=25 configTICK_RATE_HZ=100 sizeof(StackType_t)=1 configNUMBER_OF_CORES=1
pdMS_TO_TICKS(100)=10 pdMS_TO_TICKS(5)=0
```

| 항목 | 값 | 근거 |
|------|-----|------|
| 코어 수 | 1 | `configNUMBER_OF_CORES` |
| 우선순위 | 0~24 | `FreeRTOSConfig.h`의 `configMAX_PRIORITIES ( 25 )` |
| Tick rate | 100 Hz (기본), 1~1000 | `CONFIG_FREERTOS_HZ` |
| Stack 단위 | byte | RISC-V `portmacro.h`의 `portSTACK_TYPE uint8_t` |
| Idle task | priority 0 | 아래 task 목록 |

두 번째 줄이 중요합니다. tick이 10 ms이므로 `pdMS_TO_TICKS(5)`는 0이 되고, `vTaskDelay(0)`은 기다리지 않고 yield만 합니다. 5 ms 주기가 필요하면 `CONFIG_FREERTOS_HZ`를 1000으로 올리거나 `esp_timer`를 씁니다.

stack 단위도 vanilla FreeRTOS와 다릅니다. v5.4.2 FreeRTOS(IDF) 문서는 "Task stack sizes in Vanilla FreeRTOS are specified in a number of words, whereas in IDF FreeRTOS, the task stack sizes are specified in bytes"라고 적고, C3 port의 `StackType_t`도 1 byte입니다. `xTaskCreate()`의 4096은 4096 byte입니다.

C3에서 `xTaskCreatePinnedToCore()`에 줄 수 있는 core ID는 0과 `tskNO_AFFINITY`입니다. FreeRTOS의 `taskVALID_CORE_ID()`는 `0 <= xCoreID < configNUMBER_OF_CORES`를 검사하고, `xTaskCreatePinnedToCore()`(`esp_additions/freertos_tasks_c_additions.h`)는 이를 `configASSERT`로 확인합니다. 그래서 ESP32 코드의 core 1 지정을 C3에서 그대로 쓰면 assert 실패로 abort합니다.

### 시작 시점의 task 목록

`CONFIG_FREERTOS_USE_TRACE_FACILITY`와 `CONFIG_FREERTOS_USE_STATS_FORMATTING_FUNCTIONS`를 켜고 `app_main()` 첫 줄에서 `vTaskList()`를 부른 결과입니다.

```text
Name          State Prio Stack Num
main           	X	1	2272	1
IDLE           	R	0	1360	2
```

이 시점에는 `main`(priority 1, 지금 실행 중이라 X)과 `IDLE`(priority 0) 두 task만 있습니다. Stack 열은 그 task가 지금까지 남긴 최소 여유 stack(high-water mark)이고 단위는 byte입니다. `esp_timer` task는 v5.4.2 `esp_timer.c`의 주석대로 다른 코드가 esp_timer API를 쓸 때만 초기화되므로 이 앱에는 없습니다. 무선 stack처럼 component를 더하면 목록이 달라지므로, application task의 우선순위는 자기 빌드에서 이 목록을 찍어 보고 정합니다.

## 동기화 객체와 수명

FreeRTOS가 제공하는 데이터 전달·동기화 수단은 다음과 같습니다.

| 객체 | 용도 | API |
|------|------|-----|
| Queue | 고정 크기 item FIFO | `xQueueCreate`, `xQueueSend`, `xQueueReceive` |
| Semaphore (binary/counting) | 신호, 자원 개수 | `xSemaphoreCreateBinary`, `xSemaphoreTake/Give` |
| Mutex | 상호 배제, priority inheritance | `xSemaphoreCreateMutex` |
| Event Group | 비트 단위 여러 신호 | `xEventGroupCreate`, `xEventGroupWaitBits` |
| Stream Buffer | byte stream (writer 1, reader 1) | `xStreamBufferCreate`, `xStreamBufferSend/Receive` |
| Message Buffer | 가변 길이 메시지 (writer 1, reader 1) | `xMessageBufferCreate`, `xMessageBufferSend/Receive` |

### Queue — producer/consumer

queue는 식당 주방의 주문 꽂이와 같습니다. 홀 직원(producer)은 주문서를 꽂고 바로 다음 손님에게 가고, 주방(consumer)은 자기 속도로 하나씩 뺍니다. 아래 예는 100 ms마다 숫자를 넣는 producer와 이를 출력하는 consumer입니다. task 생성이 실패하면 이미 만든 task와 queue를 정리합니다.

```c title="c3-queue-demo.c"
#include <stdio.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"

static QueueHandle_t sample_queue;

static void producer(void *arg) {
    (void)arg;
    uint32_t sample = 0;
    for (;;) {
        if (xQueueSend(sample_queue, &sample, 0) == pdTRUE) ++sample;
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

static void consumer(void *arg) {
    (void)arg;
    uint32_t sample;
    for (;;) {
        if (xQueueReceive(sample_queue, &sample, portMAX_DELAY) == pdTRUE)
            printf("sample=%lu\n", (unsigned long)sample);
    }
}

void app_main(void) {
    sample_queue = xQueueCreate(32, sizeof(uint32_t));
    if (!sample_queue) return;
    TaskHandle_t consumer_task;
    if (xTaskCreate(consumer, "consumer", 4096, NULL, 6, &consumer_task) != pdPASS) {
        vQueueDelete(sample_queue);
        sample_queue = NULL;
        return;
    }
    if (xTaskCreate(producer, "producer", 4096, NULL, 5, NULL) != pdPASS) {
        vTaskDelete(consumer_task);
        vQueueDelete(sample_queue);
        sample_queue = NULL;
    }
}
```

QEMU 실행 결과의 처음 다섯 줄입니다(`app_main`은 테스트 harness 안에서 `queue_demo_main`으로 이름만 바꿔 호출했습니다).

```text
sample=0
sample=1
sample=2
sample=3
sample=4
```

consumer가 producer보다 우선순위가 높아(6 > 5) 값이 들어오는 즉시 깨어나므로 queue는 거의 비어 있습니다. 반대로 consumer가 느리면 32칸이 차고, `xQueueSend(..., 0)`가 `pdFALSE`를 돌려 그 sample은 버려집니다. 이 예에서는 실패하면 `sample`을 올리지 않으므로 같은 값을 다음에 다시 시도합니다.

### Mutex와 priority inheritance

mutex는 화장실 열쇠처럼 한 번에 한 task만 자원을 쓰게 합니다. FreeRTOS mutex에는 priority inheritance가 있어, 낮은 우선순위 task가 열쇠를 쥐고 있는 동안 높은 우선순위 task가 기다리면, 쥔 쪽의 우선순위를 잠시 올려 빨리 반납하게 합니다. binary semaphore에는 이 기능이 없습니다. 그래서 자원 보호에는 mutex를, 사건 신호에는 binary semaphore를 씁니다. mutex는 ISR에서 쓸 수 없습니다.

mutex는 초기화 함수에서 `xSemaphoreCreateMutex()`로 만들고 반환값을 확인합니다. take에 성공했다면 오류 경로를 포함한 모든 경로에서 give합니다.

### Event Group — 비트 신호

"Wi-Fi 연결됨", "시간 동기화됨", "MQTT 연결됨" 같은 여러 조건을 한 객체의 비트로 묶을 때 씁니다. `xEventGroupWaitBits()`의 인자로 모든 비트를 기다릴지(`xWaitForAllBits`), 깨어날 때 비트를 지울지(`xClearOnExit`)를 정하고, 반환된 비트 값으로 timeout인지 조건 충족인지를 구분합니다. 비트는 한번 세운 뒤 상태가 바뀌어도 저절로 내려가지 않으므로, disconnect event에서 해당 비트를 직접 지워야 합니다.

### Stream Buffer — byte stream

byte가 하나씩 들어오는 데이터에는 stream buffer가 맞습니다. FreeRTOS stream buffer는 writer 하나, reader 하나를 전제로 하므로, ISR 하나가 쓰고 task 하나가 읽는 구성에서 lock 없이 씁니다.

```c title="c3-stream-isr.c"
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/stream_buffer.h"

size_t c3_stream_byte_from_isr(StreamBufferHandle_t buffer, uint8_t byte) {
    if (!buffer) return 0;
    BaseType_t woken = pdFALSE;
    size_t sent = xStreamBufferSendFromISR(buffer, &byte, 1, &woken);
    portYIELD_FROM_ISR(woken);
    return sent;
}
```

반환값 0은 buffer가 가득 차 byte를 넣지 못했다는 뜻이고, 호출자가 overflow 카운터를 올리는 식으로 처리합니다. 이 함수는 UART interrupt 상태를 읽고 지우는 완성된 UART ISR이 아니라, ISR 안에서 쓰는 전달 부분만 보여 줍니다. ESP-IDF UART driver를 설치했다면 driver의 ring buffer와 event queue를 쓰고(Ch 5), 직접 ISR을 섞지 않습니다.

## Tickless Idle

tickless idle은 할 일이 없을 때 주기적인 tick interrupt를 멈춰 CPU가 더 오래 쉬게 하는 기능입니다. v5.4.2의 `CONFIG_FREERTOS_USE_TICKLESS_IDLE`은 `PM_ENABLE`에 의존하고(`depends on PM_ENABLE`) 기본값은 n이며, 켜면 `CONFIG_FREERTOS_IDLE_TIME_BEFORE_SLEEP`로 최소 idle 시간을 정합니다. power management(`CONFIG_PM_ENABLE`)를 켜고 `esp_pm_configure()`로 `light_sleep_enable`을 설정해야 idle 때 자동 Light-sleep에 들어갑니다. 이 기능은 Deep-sleep을 자동으로 쓰지 않습니다. 설정과 전류는 [Ch 12](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)에서 다룹니다.

## Software Timer

짧은 주기 작업은 task 대신 software timer callback으로 처리할 수 있습니다. callback은 timer service task 안에서 차례로 실행됩니다. v5.4.2 Kconfig에서 이 task의 우선순위 `CONFIG_FREERTOS_TIMER_TASK_PRIORITY`는 기본 1, 명령 queue 길이 `CONFIG_FREERTOS_TIMER_QUEUE_LENGTH`는 기본 10입니다.

우선순위가 1이라 그보다 높은 application task가 바쁘면 callback이 늦어집니다. callback 안에서 `vTaskDelay()`처럼 막히는 호출을 하면 같은 service task의 다른 timer가 모두 밀립니다. 무거운 일은 queue로 별도 task에 넘깁니다. `xTimerCreate()`는 실패하면 NULL을 돌려주고, `xTimerStart()`는 명령 queue에 넣지 못하면 `pdFAIL`을 돌려줍니다. 주기는 0 tick이 될 수 없으므로, 앞의 `pdMS_TO_TICKS(5)` = 0 문제는 timer에도 그대로 적용됩니다.

## Watchdog — 두 가드

ESP-IDF는 두 종류의 watchdog를 씁니다. 공사장에 비유하면 Task WDT는 작업자(task)가 일하는지 돌아보는 감독관이고, Interrupt WDT는 전기 배선(interrupt)이 끊기지 않았는지 살피는 감독관입니다. 이 장의 QEMU 빌드에서 생성된 기본값은 다음과 같습니다.

```text
CONFIG_ESP_INT_WDT=y
CONFIG_ESP_INT_WDT_TIMEOUT_MS=300
CONFIG_ESP_TASK_WDT_EN=y
CONFIG_ESP_TASK_WDT_INIT=y
# CONFIG_ESP_TASK_WDT_PANIC is not set
CONFIG_ESP_TASK_WDT_TIMEOUT_S=5
CONFIG_ESP_TASK_WDT_CHECK_IDLE_TASK_CPU0=y
```

Task WDT는 부팅 중 초기화되고(`CONFIG_ESP_TASK_WDT_INIT=y`), IDLE task를 감시하며, 5초 안에 reset이 없으면 경고를 냅니다. 기본으로 panic은 하지 않습니다. 이미 초기화된 상태에서 `esp_task_wdt_init()`을 다시 부르면 v5.4.2 `task_wdt.c`가 `"TWDT already initialized"`와 함께 `ESP_ERR_INVALID_STATE`를 돌려주므로, 설정을 바꿀 때는 `esp_task_wdt_reconfigure()`를 씁니다. 자기 task도 감시하게 하려면 `esp_task_wdt_add(NULL)`로 등록하고 주기적으로 `esp_task_wdt_reset()`을 부릅니다.

IDLE이 감시 대상이라는 점이 실무에서 중요합니다. priority가 높은 task가 막히지 않고 계속 돌면 IDLE이 실행되지 못해 Task WDT가 터집니다. 그 task가 자기 TWDT를 reset해도 IDLE 감시는 풀리지 않으므로, 그러니 그 task가 주기적으로 block하도록 고쳐야 합니다.

QEMU에서 priority 10 busy loop를 띄우고 QEMU를 timeout으로 끝낼 때까지 Task WDT 경고는 나오지 않았습니다. `idf.py qemu`가 `-global driver=timer.esp32c3.timg,property=wdt_disable,value=true`로 timer group watchdog를 끄고 실행하고(`qemu_ext.py`), v5.4.2의 Task WDT는 `CONFIG_ESP_TASK_WDT_USE_ESP_TIMER`가 꺼져 있으면 `task_wdt_impl_timergroup.c`, 즉 timer group 구현을 쓰기 때문입니다. watchdog 동작은 실제 보드에서 확인해야 합니다.

## 스택 오버플로 검출

stack 검사 방식은 Kconfig choice라 하나만 고릅니다. v5.4.2의 기본값은 `CONFIG_FREERTOS_CHECK_STACKOVERFLOW_CANARY`이고, task 전환 때 stack 끝에 써 둔 값이 바뀌었는지 봅니다.

```text
CONFIG_FREERTOS_CHECK_STACKOVERFLOW_CANARY=y
```

1024 byte stack을 준 task에서 64 byte 지역 배열을 가진 함수를 100단계 재귀 호출하게 하고 QEMU에서 실행한 결과입니다.

```text
starting small_task with 1024-byte stack

***ERROR*** A stack overflow in task small has been detected.
Core  0 register dump:
MEPC    : 0x40380880  RA      : 0x40383d3c  SP      : 0x3fc8dbc0  GP      : 0x3fc8c800  
...
```

Kconfig 도움말("on each context switch")대로 canary는 context switch 때마다 검사하므로, 넘친 stack이 다른 메모리를 덮은 뒤에 발견됩니다. 그래서 검출 메시지가 나왔다는 것은 이미 다른 데이터가 망가졌을 수 있다는 뜻입니다. 평소에는 high-water mark로 여유를 재 두는 편이 낫습니다.

```c
UBaseType_t high_water = uxTaskGetStackHighWaterMark(NULL);
printf("minimum unused stack: %lu bytes\n", (unsigned long)high_water);
```

같은 QEMU 실행에서 4096 byte stack을 받은 probe task가 `printf` 한 번을 부른 뒤 출력한 값은 `probe high-water (4096-byte stack): 3920 bytes`였습니다. high-water mark는 지금까지 실행한 경로의 최솟값이라, 아직 안 지나간 오류 처리 경로나 깊은 library 호출은 반영하지 않습니다. 시험에서 모든 경로를 지나가게 한 뒤 값을 읽어야 의미가 있습니다.

## 자주 하는 실수와 진단

| 증상 | 이 장에서 본 원인 | 먼저 볼 곳 |
|---|---|---|
| 짧은 `vTaskDelay()`가 기다리지 않음 | 100 Hz에서 `pdMS_TO_TICKS(5)` = 0 | `CONFIG_FREERTOS_HZ` |
| stack이 예상보다 4배 작게 계산됨 | vanilla FreeRTOS의 word 단위로 계산 | C3는 byte 단위 |
| `xTaskCreatePinnedToCore(..., 1)`에서 assert abort | C3는 core 0만 있음 | `tskNO_AFFINITY` 또는 0 |
| Task WDT 경고 (IDLE) | 높은 우선순위 task가 block하지 않음 | 경고에 찍힌 task 이름, busy loop |
| `***ERROR*** A stack overflow` | stack 부족 | 그 task의 stack 크기와 high-water mark |
| timer callback 지연 | service task priority 1 | `CONFIG_FREERTOS_TIMER_TASK_PRIORITY` |

## 정리

- C3 FreeRTOS는 core 1개, 우선순위 0~24, 기본 tick 100 Hz입니다.
- stack 인자는 byte 단위이고(`StackType_t` = `uint8_t`), QEMU에서 4096 byte task의 high-water mark는 3920 byte였습니다.
- 100 Hz에서는 10 ms 미만 delay가 0 tick이 됩니다.
- Task WDT는 기본 5초, IDLE 감시, panic 없음이고, Interrupt WDT는 300 ms입니다. QEMU는 timer group watchdog를 꺼서 이를 재현하지 못합니다.
- 기본 canary 검사는 1024 byte task의 과도한 재귀를 `***ERROR*** A stack overflow`로 잡았습니다.
- tickless idle은 `CONFIG_PM_ENABLE`이 필요하고 기본값은 꺼짐입니다.

## 다음 편

[Ch 11: 보안 — Secure Boot, Flash Encryption, eFuse](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)에서는 펌웨어가 안전하게 부팅되는 두 메커니즘과 그 키를 보관하는 eFuse를 다룹니다.

## 관련 항목

- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — tickless idle 설정과 전류로 이어집니다
- [Practical RTOS Internals — Part 2 FreeRTOS](/blog/embedded/rtos/practical-internals/00-preface) — vanilla FreeRTOS 내부
- [Modern Embedded Recipes — 동기화 패턴](/blog/embedded/modern-recipes/00-preface)
- [원문 — ESP-IDF FreeRTOS Reference](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/freertos.html)
- [원문 — ESP-IDF Power Management](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/power_management.html)
