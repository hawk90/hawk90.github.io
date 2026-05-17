---
title: "Ch 9: Zephyr on BL602"
date: 2025-05-19T15:00:00
description: "Zephyr RTOS on BL602 — 포팅 상태, 빌드, 예제를 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 9
tags: [RISC-V, BL602, Zephyr, RTOS]
draft: true
---

## 개요

Zephyr RTOS의 BL602 지원 상태와 사용법을 다룬다.

---

## Zephyr 설치

TODO:

```bash
pip install west
west init ~/zephyrproject
cd ~/zephyrproject
west update
west zephyr-export
pip install -r zephyr/scripts/requirements.txt
```

---

## BL602 지원 상태

TODO:

- 기본 지원: GPIO, UART, SPI, I2C
- 제한적: Wi-Fi, BLE (진행 중)

---

## 보드 설정

TODO:

```bash
west boards | grep bl602
# dt_bl10_devkit
```

---

## 빌드

TODO:

```bash
cd ~/zephyrproject/zephyr
west build -b dt_bl10_devkit samples/basic/blinky
```

---

## 플래시

TODO:

```bash
west flash
# 또는 수동으로 bflb-mcu-tool
```

---

## Blinky 예제

TODO:

```c
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>

#define LED_NODE DT_ALIAS(led0)
static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(LED_NODE, gpios);

int main(void) {
    gpio_pin_configure_dt(&led, GPIO_OUTPUT_ACTIVE);
    while (1) {
        gpio_pin_toggle_dt(&led);
        k_msleep(1000);
    }
    return 0;
}
```

---

## Devicetree

TODO:

```dts
/ {
    aliases {
        led0 = &led0;
    };

    leds {
        compatible = "gpio-leds";
        led0: led_0 {
            gpios = <&gpio0 8 GPIO_ACTIVE_HIGH>;
        };
    };
};
```

---

## 정리

- Zephyr는 BL602 기본 지원
- Wi-Fi/BLE는 아직 제한적
- west 명령어로 빌드/플래시
- Devicetree로 하드웨어 추상화

---

## 다음 장 예고

Ch 10에서는 SiFive Freedom 보드를 다룬다.

---

## 참고 자료

- [Zephyr BL602](https://docs.zephyrproject.org/latest/boards/riscv/dt_bl10_devkit/doc/index.html)
