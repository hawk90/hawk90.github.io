---
title: "ESP32-C3 위 FreeRTOS — 단일 코어 RTOS 활용 전략"
date: 2026-05-20T09:10:00
description: "ESP-IDF의 modified FreeRTOS. 우선순위 25 단계, tickless idle, software timer."
series: "ESP32-C3 Mastering"
seriesOrder: 10
tags: [freertos, rtos, task, queue, esp32-c3]
draft: false
---

## 한 줄 요약

> **"ESP32-C3는 *단일 코어*입니다. SMP가 없으니 *coreid 인자도 무의미*하고, 진짜 동시성은 *인터럽트만*입니다."** Espressif fork FreeRTOS의 단일 코어 동작, tickless idle, watchdog 세 가지를 손에 익히면 *전력·응답성·안정성*이 한꺼번에 좋아집니다.

ESP-IDF는 *Espressif fork FreeRTOS*를 씁니다. vanilla FreeRTOS에 *SMP 확장·tickless idle 통합·watchdog 통합*이 더해진 형태입니다. 원본 ESP32(2 코어)와 ESP32-S3(2 코어)는 SMP로 *진짜 동시* 실행이 가능하지만, *ESP32-C3는 단일 코어*라 *시분할*입니다.

이번 장에서는 태스크 생성, 동기화 객체, tickless idle로 절전, 그리고 *Task Watchdog*과 *Interrupt Watchdog* 두 가드 메커니즘을 정리합니다.

## 단일 코어 FreeRTOS

C3에서는 *모든 태스크가 같은 코어*에서 시분할로 돌아갑니다. `xTaskCreate`는 `xTaskCreatePinnedToCore`와 *기능적으로 동일*하지만, 호환성을 위해 `tskNO_AFFINITY` 또는 `0`을 명시할 수 있습니다.

```c
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

void sensor_task(void *param)
{
    while (1) {
        // 센서 읽기
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

void app_main(void)
{
    xTaskCreate(sensor_task,        // 함수
                "sensor",            // 이름 (디버깅용)
                4096,                // 스택 크기 (byte, RV32에선 word=4byte라 1024 word)
                NULL,                // param
                5,                   // priority (0~24)
                NULL);               // handle out
}
```

| 항목 | 값 | 비고 |
|------|-----|------|
| 코어 수 | 1 | C3는 단일 |
| 우선순위 | 0~24 (configMAX_PRIORITIES=25) | 0이 idle, 24가 최고 |
| Tick rate | 100 Hz (기본) 또는 1000 Hz | menuconfig CONFIG_FREERTOS_HZ |
| 스택 단위 | word (RV32에서 4 byte) | xTaskCreate는 byte로 받음 |
| Idle task | 자동 생성, priority 0 | tickless idle hook 진입점 |

priority 0은 *idle 전용*입니다. 사용자 태스크는 1 이상을 씁니다. 시스템 task들의 일반적 우선순위입니다.

| Priority | Task | 역할 |
|----------|------|------|
| 24 | esp_timer_task | 고우선 타이머 |
| 23 | ipc_task | 부트 IPC |
| 22 | WiFi task | WiFi 드라이버 |
| 20 | BLE host task | NimBLE |
| 19 | tcpip_thread | LwIP |
| 1 | main_task | app_main이 도는 task |
| 0 | IDLE | idle hook |

사용자 task를 *너무 높게* 두면 WiFi/BLE 응답이 느려집니다. *5~10*이 일반 application의 안전 구간입니다.

## 동기화 객체 — 네 가지 형태

FreeRTOS의 IPC는 *4가지*로 정리됩니다.

| 객체 | 용도 | API |
|------|------|-----|
| Queue | 데이터 큐 (FIFO) | `xQueueCreate`, `xQueueSend`, `xQueueReceive` |
| Semaphore (binary/counting) | 시그널·자원 카운터 | `xSemaphoreCreateBinary`, `xSemaphoreTake/Give` |
| Mutex | 상호 배제 (priority inheritance) | `xSemaphoreCreateMutex` |
| Event Group | 비트 단위 멀티 시그널 | `xEventGroupCreate`, `xEventGroupWaitBits` |
| Stream Buffer | byte 스트림 (1:1) | `xStreamBufferCreate`, `xStreamBufferSend/Receive` |
| Message Buffer | 가변 길이 메시지 (1:1) | `xMessageBufferCreate`, `xMessageBufferSend/Receive` |

### Queue — producer/consumer

```c
QueueHandle_t sample_queue;

void producer_task(void *p)
{
    int sample;
    while (1) {
        sample = read_adc();
        if (xQueueSend(sample_queue, &sample, pdMS_TO_TICKS(100)) != pdTRUE) {
            ESP_LOGW("prod", "queue full, dropping sample");
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void consumer_task(void *p)
{
    int sample;
    while (1) {
        if (xQueueReceive(sample_queue, &sample, portMAX_DELAY) == pdTRUE) {
            process_sample(sample);
        }
    }
}

void app_main(void)
{
    sample_queue = xQueueCreate(32, sizeof(int));  // 32 항목
    xTaskCreate(producer_task, "prod", 4096, NULL, 5, NULL);
    xTaskCreate(consumer_task, "cons", 4096, NULL, 6, NULL);
}
```

큐 길이는 *최악 burst*를 흡수할 만큼 잡습니다. 짧으면 *drop*, 길면 *RAM 낭비*입니다. C3는 SRAM 400 KB라 큐를 너무 키우면 다른 영역이 부족합니다.

### Mutex와 priority inheritance

```c
SemaphoreHandle_t i2c_mutex = xSemaphoreCreateMutex();

void task_A(void *p)
{
    if (xSemaphoreTake(i2c_mutex, pdMS_TO_TICKS(500)) == pdTRUE) {
        i2c_read_sensor();
        xSemaphoreGive(i2c_mutex);
    }
}
```

Mutex는 *priority inheritance*가 켜져 있습니다. 낮은 우선순위가 mutex를 잡고 있을 때 *높은 우선순위가 대기*하면, *낮은 쪽 우선순위를 일시적으로 끌어올려* 빠르게 끝내게 합니다. Binary semaphore에는 이 기능이 *없습니다*. *자원 보호에는 mutex*, *시그널링에는 binary semaphore*를 쓰는 것이 규칙입니다.

### Event Group — 비트 시그널

여러 사건을 *하나의 객체*로 묶을 때 유용합니다.

```c
EventGroupHandle_t app_events;
#define EVT_WIFI_CONNECTED  (1 << 0)
#define EVT_NTP_SYNCED      (1 << 1)
#define EVT_MQTT_CONNECTED  (1 << 2)

void main_loop_task(void *p)
{
    EventBits_t bits = xEventGroupWaitBits(
        app_events,
        EVT_WIFI_CONNECTED | EVT_NTP_SYNCED | EVT_MQTT_CONNECTED,
        pdFALSE,                   // don't clear on exit
        pdTRUE,                    // wait for ALL
        portMAX_DELAY);

    ESP_LOGI("main", "all systems ready: 0x%lx", bits);
    // 본격 application 로직
}
```

`pdTRUE`(wait for ALL)은 *세 비트 모두*가 셋되어야 깨고, `pdFALSE`는 *하나라도* 셋되면 깹니다. 부팅 시 *순차 의존*이 있는 시스템을 깔끔하게 표현합니다.

### Stream Buffer — byte 스트림

UART 수신 같이 *바이트 단위로 들어오는* 데이터에 적합합니다.

```c
StreamBufferHandle_t uart_rx_buf;

void uart_rx_task(void *p)
{
    uint8_t buf[256];
    while (1) {
        size_t n = xStreamBufferReceive(uart_rx_buf, buf, sizeof(buf),
                                         pdMS_TO_TICKS(100));
        if (n > 0) parse_protocol(buf, n);
    }
}

// ISR에서
size_t sent = xStreamBufferSendFromISR(uart_rx_buf, &byte, 1, &xHigherPriorityTaskWoken);
portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
```

Stream buffer는 *1:1*입니다. 한 producer와 한 consumer 전용. 여러 producer가 쓰면 *데이터가 깨집니다*.

## Tickless Idle — 절전의 핵심

기본 FreeRTOS는 *tick 인터럽트*가 매 ms마다 옵니다. 1000 Hz면 *초당 1000번* CPU를 깨워 *deep sleep을 방해*합니다. Tickless idle은 *idle task가 진입할 때 다음 wake 시점까지의 tick을 미리 계산해서, 그 동안 인터럽트를 끄고 sleep*합니다.

```c
#include "esp_pm.h"

esp_pm_config_t pm_config = {
    .max_freq_mhz = 160,        // 액티브 최대
    .min_freq_mhz = 40,         // 절전 시 최소 (DFS)
    .light_sleep_enable = true, // tickless idle 켬
};
ESP_ERROR_CHECK(esp_pm_configure(&pm_config));
```

```text
sdkconfig
CONFIG_PM_ENABLE=y
CONFIG_FREERTOS_USE_TICKLESS_IDLE=y
CONFIG_FREERTOS_IDLE_TIME_BEFORE_SLEEP=3   # 3 tick 이상 idle이면 sleep
```

기대 효과는 *Active 80 mA → Modem sleep 15 mA → Light sleep 130 µA*입니다. *peripheral lock*을 잡고 있는 모듈이 있으면 light sleep에 못 들어갑니다. UART transmit 도중에는 `esp_pm_lock_acquire(ESP_PM_NO_LIGHT_SLEEP)`이 자동으로 잡힙니다.

```c
// 사용자 정의 lock
esp_pm_lock_handle_t my_lock;
esp_pm_lock_create(ESP_PM_NO_LIGHT_SLEEP, 0, "my_lock", &my_lock);

esp_pm_lock_acquire(my_lock);
// 이 사이에는 light sleep 안 함
esp_pm_lock_release(my_lock);
```

## Software Timer

vTaskDelay로 *주기 작업*을 만들 수 있지만, *짧은 콜백*에는 software timer가 적합합니다. timer 콜백은 *별도 timer service task*에서 실행됩니다.

```c
void heartbeat_cb(TimerHandle_t timer)
{
    static int count = 0;
    ESP_LOGI("hb", "tick %d", ++count);
}

TimerHandle_t hb_timer = xTimerCreate(
    "heartbeat",
    pdMS_TO_TICKS(1000),   // 1 s 주기
    pdTRUE,                 // auto-reload
    NULL,                   // timer id
    heartbeat_cb);

xTimerStart(hb_timer, 0);
```

Timer 콜백 안에서는 *vTaskDelay 등 차단 호출 금지*입니다. timer service task를 막아 *다른 timer가 못 돕니다*. 무거운 작업은 *queue로 별도 task에 넘겨야* 합니다.

## Watchdog — 두 가드

ESP-IDF는 *두 종류의 watchdog*을 동시 운영합니다.

| WDT | 감시 대상 | 트리거 |
|-----|---------|--------|
| Task WDT | 등록된 task가 *주기적으로 reset 신호*를 보내는지 | feed가 안 오면 panic |
| Interrupt WDT | ISR이 *너무 오래* 점유하는지 | 임계 초과 시 panic |

### Task WDT

```c
#include "esp_task_wdt.h"

esp_task_wdt_config_t wdt_config = {
    .timeout_ms = 5000,
    .idle_core_mask = (1 << 0),     // idle task도 자동 감시
    .trigger_panic = true,
};
esp_task_wdt_init(&wdt_config);
esp_task_wdt_add(NULL);            // 현재 task 등록

while (1) {
    do_work();
    esp_task_wdt_reset();          // 5초 안에 호출 못 하면 panic
}
```

기본은 *idle task*만 감시합니다. *long-running task*가 idle을 굶기면 WDT가 발동합니다. 사용자가 추가로 task를 등록해 *해당 task의 멈춤*까지 감지할 수 있습니다.

### Interrupt WDT

ISR이 *임계 시간 이상* CPU를 잡고 있으면 panic을 일으킵니다. 기본 임계는 *300 ms*입니다.

```text
CONFIG_ESP_INT_WDT=y
CONFIG_ESP_INT_WDT_TIMEOUT_MS=300
```

ISR은 *짧아야* 합니다. 300 ms는 *명백히 잘못된 코드*를 잡는 안전망이고, 정상 코드의 ISR은 *수십 µs* 안에 끝나야 합니다. 무거운 작업은 *deferred task*로 넘기는 패턴이 표준입니다.

```c
void IRAM_ATTR uart_isr(void *arg)
{
    BaseType_t hpw = pdFALSE;
    // 최소한의 작업
    uint8_t byte = REG_READ(UART_FIFO_REG);
    xStreamBufferSendFromISR(uart_rx_buf, &byte, 1, &hpw);
    portYIELD_FROM_ISR(hpw);
}
```

`IRAM_ATTR`은 *ISR 코드가 IRAM(RAM)에 배치되도록 강제*합니다. flash cache miss로 ISR이 *수십 µs 늘어나는* 일을 막습니다. PSRAM·flash 접근 중에도 *ISR이 즉시* 돌도록 보장합니다.

## 스택 오버플로 검출

C3는 RAM이 작아 *스택 오버플로*가 흔합니다. FreeRTOS는 두 가지 검출 방식을 제공합니다.

```text
CONFIG_FREERTOS_CHECK_STACKOVERFLOW_PTRVAL=y    # 빠름, 일부만 탐지
CONFIG_FREERTOS_CHECK_STACKOVERFLOW_CANARY=y    # 정확, 약간의 오버헤드
```

런타임에 *남은 스택*을 측정하는 API도 유용합니다.

```c
UBaseType_t high_water = uxTaskGetStackHighWaterMark(NULL);
ESP_LOGI("stack", "min free stack: %u bytes", high_water * sizeof(StackType_t));
```

기본 응용 task의 stack을 *4096 byte*로 시작해, high water가 *500 byte 이하*로 떨어지면 *늘리는* 패턴이 안전합니다.

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| "Task watchdog got triggered" | high-priority task가 idle 굶김 | vTaskDelay 또는 esp_task_wdt_reset |
| ISR에서 ESP_LOGI 호출 후 crash | ISR에서 일반 함수 호출 | ISR_safe 함수만 사용 |
| mutex 후 priority inversion | binary semaphore를 자원 보호에 씀 | 자원 보호엔 mutex |
| queue가 한 번도 안 차는데 send 실패 | ticks_to_wait=0 + 즉시 send | 대기 시간 추가 또는 큐 크기 ↑ |
| stack overflow는 안 떴는데 panic | 실제 overflow지만 검출 옵션 OFF | CHECK_STACKOVERFLOW=CANARY |
| timer가 정확하지 않음 | timer service task가 막힘 | timer 콜백을 가볍게, 무거운 일은 queue로 |
| light sleep 안 들어감 | peripheral lock 잡혀 있음 | pm_lock 추적, UART idle 확인 |
| context switch 너무 자주 | Tick rate 너무 높음 | 1000 Hz → 100 Hz 검토 |

가장 자주 보는 함정은 *task watchdog*입니다. 신규 펌웨어가 *반복적으로 reboot*하는데 panic 로그가 "Task watchdog got triggered"라면, *idle task가 굶고 있다*는 뜻입니다. 모든 사용자 task가 *최소 한 번씩* `vTaskDelay`로 양보하는지 검토합니다.

## 정리

- ESP32-C3는 *단일 코어*입니다. SMP는 없고, 진짜 동시성은 *인터럽트만* 가능합니다.
- 우선순위는 *0~24*, idle이 0, 최고가 24입니다. WiFi/BLE 시스템 task가 19~22이라 사용자는 *5~10*이 안전 구간입니다.
- 동기화 객체는 *Queue·Semaphore·Mutex·Event Group·Stream Buffer*입니다. 자원 보호는 mutex, 시그널링은 binary semaphore가 규칙입니다.
- *Tickless idle*은 전력의 핵심입니다. `esp_pm_configure` + `CONFIG_FREERTOS_USE_TICKLESS_IDLE`로 light sleep까지 자동 진입합니다.
- Software timer 콜백은 *짧아야* 합니다. 무거운 작업은 queue로 별도 task에 넘깁니다.
- *Task WDT*는 task 멈춤을 감시하고, *Interrupt WDT*는 ISR이 너무 오래 점유하는지를 감시합니다. 두 개가 서로 다른 가드입니다.
- ISR은 *수십 µs*에 끝나야 합니다. `IRAM_ATTR`로 ISR을 RAM에 배치하면 flash cache miss를 피합니다.
- 스택 오버플로 검출은 *CANARY* 옵션이 가장 정확합니다. `uxTaskGetStackHighWaterMark`로 잔여 스택을 모니터링합니다.

## 다음 편

[Ch 11: 보안 — Secure Boot, Flash Encryption, eFuse](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)에서는 *펌웨어가 안전하게 부팅되는* 두 메커니즘과, 그 키를 보관하는 *eFuse*를 다룹니다. Development → Release 전환에서 *브릭을 안 만드는* 워크플로가 핵심입니다.

## 관련 항목

- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — tickless idle 이어집니다
- [Practical RTOS Internals — Part 2 FreeRTOS](/blog/embedded/rtos/practical-internals/) — vanilla FreeRTOS 내부
- [Modern Embedded Recipes — 동기화 패턴](/blog/embedded/modern-recipes/)
- [원문 — ESP-IDF FreeRTOS Reference](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/system/freertos.html)
- [원문 — ESP-IDF Power Management](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/system/power_management.html)
