---
title: "ESP32-C3 위 FreeRTOS — 단일 코어 RTOS 활용 전략"
slug: "embedded/riscv/esp32-c3-mastering/chapter10-freertos"
date: 2026-05-20T09:10:00
description: "ESP-IDF v5.4.2 단일 코어의 task·queue 수명, byte 단위 stack·우선순위와 tickless·timer·watchdog 조건을 확인합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 10
tags: [freertos, rtos, task, queue, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **단일 코어에서도 task preemption·interrupt·DMA에 의한 동시성 문제는 남습니다.** Core affinity와 lock·buffer lifetime은 서로 다른 계약입니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`의 FreeRTOS fork와 C3 RISC-V port입니다. Vanilla FreeRTOS와 stack 단위·port macro·config가 다를 수 있으므로 대상 소스를 확인합니다. 아래 source/API 대조는 실제 C3 scheduler·ISR·watchdog·전류 측정과 구분합니다.

## 단일 코어 FreeRTOS

C3에서는 *모든 태스크가 같은 코어*에서 시분할로 돌아갑니다. Affinity API를 쓸 때는0 또는 `tskNO_AFFINITY`처럼 유효한 값을 사용하며 다른 core 번호를 의미 없다는 이유로 허용하지 않습니다.

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

| 항목 | 값 | 비고 |
|------|-----|------|
| 코어 수 | 1 | C3는 단일 |
| 우선순위 | 0~24 (configMAX_PRIORITIES=25) | 0이 idle, 24가 최고 |
| Tick rate | 100 Hz (기본) 또는 1000 Hz | menuconfig CONFIG_FREERTOS_HZ |
| Stack API 단위 | byte | C3 port의 StackType_t는 uint8_t |
| Idle task | 자동 생성, priority 0 | tickless idle hook 진입점 |

Priority0은 idle task도 쓰지만 사용자 task가 절대 사용할 수 없는 전용값은 아닙니다. 기준 `FreeRTOSConfig.h`는 `configMAX_PRIORITIES=25`이며 system task의 priority·affinity는 subsystem Kconfig·SDK 설정을 확인합니다. C3에 존재하지 않을 수 있는 IPC task를 포함한 고정 우선순위 표는 제거했습니다.

Application priority5~10이 무조건 안전하다는 보장은 없습니다. Task의 실행·block 시간, deadline·IRQ·무선/네트워크 부하와 idle의 실행 필요를 함께 분석합니다.

## 동기화 객체와 수명

아래는 주요 데이터 전달·동기화 수단입니다.

| 객체 | 용도 | API |
|------|------|-----|
| Queue | 데이터 큐 (FIFO) | `xQueueCreate`, `xQueueSend`, `xQueueReceive` |
| Semaphore (binary/counting) | 시그널·자원 카운터 | `xSemaphoreCreateBinary`, `xSemaphoreTake/Give` |
| Mutex | 상호 배제 (priority inheritance) | `xSemaphoreCreateMutex` |
| Event Group | 비트 단위 멀티 시그널 | `xEventGroupCreate`, `xEventGroupWaitBits` |
| Stream Buffer | byte 스트림 (1:1) | `xStreamBufferCreate`, `xStreamBufferSend/Receive` |
| Message Buffer | 가변 길이 메시지 (1:1) | `xMessageBufferCreate`, `xMessageBufferSend/Receive` |

### Queue — producer/consumer

다음은 ADC driver가 없는 독립 counter producer/consumer 예입니다. Task 실행 중 queue를 삭제하지 않으며 이 예에서는 application 수명 동안 유지합니다. 동적 task 생성 실패를 확인한 뒤 이미 만든 task·queue를 정리합니다.

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

위 우선순위·주기는 설명용 설정입니다. Production에서는 counter wrap, queue full·producer 종료·consumer 지연·watchdog와 전체 system 부하를 정책으로 정합니다.

큐 길이는 *최악 burst*를 흡수할 만큼 잡습니다. 짧으면 *drop*, 길면 *RAM 낭비*입니다. C3는 SRAM 400 KB라 큐를 너무 키우면 다른 영역이 부족합니다.

### Mutex와 priority inheritance

Mutex는 file-scope initializer에서 생성하지 않습니다. Owner의 초기화 함수에서 `xSemaphoreCreateMutex()` 결과를 검사한 뒤 task에 공유합니다. Take 성공 후 모든 작업의 성공·실패 경로에서 Give하며, ISR에서는 mutex를 사용하지 않습니다.

Mutex는 *priority inheritance*가 켜져 있습니다. 낮은 우선순위가 mutex를 잡고 있을 때 *높은 우선순위가 대기*하면, *낮은 쪽 우선순위를 일시적으로 끌어올려* 빠르게 끝내게 합니다. Binary semaphore에는 이 기능이 *없습니다*. *자원 보호에는 mutex*, *시그널링에는 binary semaphore*를 쓰는 것이 규칙입니다.

### Event Group — 비트 시그널

여러 사건을 *하나의 객체*로 묶을 때 유용합니다.

먼저 `xEventGroupCreate()` 성공을 확인하고 setter와 waiter의 lifetime을 정합니다. `xEventGroupWaitBits()`의 wait-for-all·clear-on-exit·timeout을 구분하고 반환한 bit mask가 요구 조건을 만족하는지 확인합니다. 모든 bit를 한 번 관찰했다고 Wi-Fi/NTP/MQTT 상태가 이후에도 계속 유지되는 것은 아닙니다. 재연결·disconnect 때 bit를 갱신하는 owner가 필요합니다.

### Stream Buffer — byte 스트림

UART 수신 같이 *바이트 단위로 들어오는* 데이터에 적합합니다.

다음 publication helper는 먼저 만든 stream buffer를 받습니다. 한 ISR writer·한 task reader라는 조건을 유지하고 반환0을 overflow/drop 정책에 반영합니다. 여러 writer/reader를 쓰려면 외부 직렬화를 포함한 별도 계약이 필요합니다.

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

이는 UART interrupt status의 확인·clear·driver ownership을 구현한 UART ISR이 아닙니다. 일반 UART driver가 설치한 ISR과 임의 register 직접 읽기를 섞지 않습니다. IRAM-safe 경로 여부도 별도로 증명해야 합니다.

## Tickless Idle — 절전의 핵심

Tick 주기는 `CONFIG_FREERTOS_HZ`에 따라 달라집니다. Tickless idle은 idle 시간을 이용해 tick 처리를 줄이는 port 경로이며 Deep-sleep을 자동으로 사용하는 기능이 아닙니다. `CONFIG_PM_ENABLE`·tickless 설정과 `esp_pm_configure()`의 자동 Light-sleep, clock source·PM lock·driver 조건을 함께 확인합니다.

PM lock은 create/acquire/release/delete의 반환값과 소유 수명을 관리합니다. 특정 UART 전송이 항상 같은 lock을 잡는다고 일반화하지 않습니다. 초기화 성공만으로 정해진 전류에 도달하는 것이 아니며 실제 wake·sleep·peripheral 동작과 전류 측정은 [Ch12](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)에서 다룹니다.

## Software Timer

vTaskDelay로 *주기 작업*을 만들 수 있지만, *짧은 콜백*에는 software timer가 적합합니다. timer 콜백은 *별도 timer service task*에서 실행됩니다.

`xTimerCreate()`는 초기화 함수 안에서 호출하고 NULL을 검사합니다. `xTimerStart()`도 command queue에 요청을 보낼 수 있는지 확인합니다. 요청 성공과 callback 실행 완료는 다르며 timer service task의 priority·queue·tick resolution에 영향을 받습니다. Period는0tick이 되면 안 됩니다.

Timer 콜백 안에서는 *vTaskDelay 등 차단 호출 금지*입니다. timer service task를 막아 *다른 timer가 못 돕니다*. 무거운 작업은 *queue로 별도 task에 넘겨야* 합니다.

## Watchdog — 두 가드

여기서는 Task WDT와 Interrupt WDT를 구분합니다. Chip의 모든 watchdog 종류를 이 두 개로 제한하는 설명은 아닙니다.

| WDT | 확인할 계약 |
|---|---|
| Task WDT | 구독한 task/user가 reset/feed를 수행하는지; idle 구독 포함 여부 |
| Interrupt WDT | tick/interrupt 진행이 장시간 차단되는지; critical section·높은 ISR 포함 |

기준 config에서 TWDT가 startup에 초기화됐을 수 있으므로 `esp_task_wdt_init()`를 중복 호출하지 않습니다. Global owner가 init/reconfigure/deinit을 담당하고 task는 `esp_task_wdt_add(NULL)`, `reset()`, `delete(NULL)`의 결과와 등록 수명을 관리합니다. 일부 함수에 성공했다고 모든 watchdog을 feed한 것은 아닙니다.

높은 priority의 busy loop가 자기 TWDT만 reset해도 감시 중인 idle task가 굶으면 timeout할 수 있습니다. 무조건 feed하거나 delay를 하나 넣는 방식으로 deadline 문제를 덮지 않고 실제로 timeout한 subscriber·panic config·scheduler 부하를 확인합니다.

Interrupt WDT의 timeout은 config 값이며 정상 ISR에 허용되는 latency budget은 제품 요구에서 정합니다. 고정300ms 또는 모든 ISR 수십µs라는 수치를 보편 합격선으로 사용하지 않습니다. `IRAM_ATTR`은 배치 요청이고 참조 code/data·API의 ISR 계약까지 확인해야 cache-disabled 경로를 평가할 수 있습니다.

## 스택 오버플로 검출

Stack 검사 옵션은 choice를 따르므로 PTRVAL과 CANARY를 동시에 y로 제시하지 않습니다. Canary 검사는 모든 overflow·임의 memory corruption의 완전한 검출기가 아닙니다. 예를 들어 다음은 한 가지 선택입니다.

```text
CONFIG_FREERTOS_CHECK_STACKOVERFLOW_CANARY=y
```

기준 C3 port는 `StackType_t`를 `uint8_t`로 정의하며 stack API의 단위는 byte입니다. Vanilla FreeRTOS의32-bit stack word 설명을 그대로 가져오지 않습니다.

```c
UBaseType_t high_water = uxTaskGetStackHighWaterMark(NULL);
printf("minimum unused stack: %lu bytes\n", (unsigned long)high_water);
```

High-water mark는 관찰한 실행 경로의 최소 미사용량입니다. 전체 worst-case proof가 아니며 실행되지 않은 error path·재귀·library call을 포함해 margin과 측정 범위를 정합니다. 모든 task를4096byte로 시작하거나500byte 이하만 보면 충분하다는 고정 기준은 제외했습니다.

## 자주 하는 실수와 troubleshooting

| 증상 | 먼저 확인할 근거 |
|---|---|
| Task WDT timeout | 실제 subscriber·등록/해제·feed 결과·idle 실행·panic 설정 |
| Queue send 실패 | valid handle·full 상태·item lifetime·대기 시간·동시 작업 |
| Timer 지연 | tick resolution·command queue·service task·긴 callback |
| Stack 관련 panic | map/stack 범위·오류 경로·canary·관찰한 high-water 범위 |
| Light-sleep 미진입 | effective config·PM lock·wake/driver 조건과 실제 trace |

## 정리

C3의 단일 코어에서도 preemption과 ISR·DMA의 lifetime을 관리해야 합니다. 동적 객체와 task 생성 실패를 처리하고 queue·timer·event 결과를 해당 contract로 해석합니다. Tickless·watchdog·stack 검사 성공은 제품의 timing·전력·memory safety를 자동 보장하지 않습니다.

## 다음 편

[Ch 11: 보안 — Secure Boot, Flash Encryption, eFuse](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)에서는 *펌웨어가 안전하게 부팅되는* 두 메커니즘과, 그 키를 보관하는 *eFuse*를 다룹니다. Security 설정·키·chip revision·복구 경로를 함께 확인하는 절차를 다룹니다.

## 관련 항목

- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — tickless idle 이어집니다
- [Practical RTOS Internals — Part 2 FreeRTOS](/blog/embedded/rtos/practical-internals/00-preface) — vanilla FreeRTOS 내부
- [Modern Embedded Recipes — 동기화 패턴](/blog/embedded/modern-recipes/00-preface)
- [원문 — ESP-IDF FreeRTOS Reference](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/freertos.html)
- [원문 — ESP-IDF Power Management](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/power_management.html)
