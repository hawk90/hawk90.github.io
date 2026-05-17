---
title: "Ch 6: ESP-IDF + FreeRTOS"
date: 2025-05-19T12:00:00
description: "ESP-IDF — 빌드 시스템, FreeRTOS 태스크, Wi-Fi 기초를 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 6
tags: [RISC-V, ESP32-C3, ESP-IDF, FreeRTOS]
draft: true
---

## 개요

ESP-IDF는 Espressif의 공식 개발 프레임워크다.

---

## ESP-IDF 설치

TODO:

```bash
git clone --recursive https://github.com/espressif/esp-idf.git
cd esp-idf
./install.sh esp32c3
source export.sh
```

---

## 프로젝트 생성

TODO:

```bash
idf.py create-project my_project
cd my_project
idf.py set-target esp32c3
```

---

## 빌드 & 플래시

TODO:

```bash
idf.py build
idf.py flash
idf.py monitor
```

---

## FreeRTOS 태스크

TODO:

```c
void blink_task(void *arg) {
    gpio_set_direction(GPIO_NUM_8, GPIO_MODE_OUTPUT);
    while (1) {
        gpio_set_level(GPIO_NUM_8, 1);
        vTaskDelay(pdMS_TO_TICKS(500));
        gpio_set_level(GPIO_NUM_8, 0);
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

void app_main(void) {
    xTaskCreate(blink_task, "blink", 2048, NULL, 5, NULL);
}
```

---

## 컴포넌트 시스템

TODO:

```
my_project/
├── main/
│   ├── CMakeLists.txt
│   └── main.c
├── components/
│   └── my_component/
└── CMakeLists.txt
```

---

## Wi-Fi 연결

TODO:

```c
#include "esp_wifi.h"

void wifi_init(void) {
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);
    // ... 설정 및 연결
}
```

---

## 정리

- ESP-IDF = 빌드 + FreeRTOS + 드라이버
- idf.py로 빌드/플래시/모니터
- 컴포넌트 시스템으로 모듈화
- Wi-Fi/BLE API 내장

---

## 다음 장 예고

Ch 7에서는 BL602 개요를 다룬다.

---

## 참고 자료

- [ESP-IDF Programming Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/)
