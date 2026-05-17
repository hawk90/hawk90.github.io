---
title: "Ch 11: Freedom Metal"
date: 2025-05-19T17:00:00
description: "Freedom Metal — HAL 사용, GPIO, 인터럽트 핸들링을 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 11
tags: [RISC-V, SiFive, Freedom-Metal, HAL]
draft: true
---

## 개요

Freedom Metal은 SiFive의 베어메탈 HAL이다.

---

## 설치

TODO:

```bash
git clone --recursive https://github.com/sifive/freedom-e-sdk.git
cd freedom-e-sdk
```

---

## 프로젝트 구조

TODO:

```
freedom-e-sdk/
├── bsp/
│   └── sifive-hifive1-revb/
├── freedom-metal/
├── software/
│   └── led-blink/
└── scripts/
```

---

## 빌드

TODO:

```bash
make PROGRAM=led-blink TARGET=sifive-hifive1-revb software
```

---

## GPIO 사용

TODO:

```c
#include <metal/gpio.h>

struct metal_gpio *gpio;

int main(void) {
    gpio = metal_gpio_get_device(0);
    metal_gpio_disable_input(gpio, 5);
    metal_gpio_enable_output(gpio, 5);

    while (1) {
        metal_gpio_set_pin(gpio, 5, 1);
        // delay
        metal_gpio_set_pin(gpio, 5, 0);
        // delay
    }
}
```

---

## 인터럽트 핸들링

TODO:

```c
#include <metal/interrupt.h>

void button_isr(int id, void *data) {
    // 버튼 처리
}

void setup_interrupt(void) {
    struct metal_interrupt *plic = metal_interrupt_get_controller(
        METAL_PLIC_CONTROLLER, 0);
    metal_interrupt_register_handler(plic, BUTTON_IRQ, button_isr, NULL);
    metal_interrupt_enable(plic, BUTTON_IRQ);
}
```

---

## 타이머

TODO:

```c
#include <metal/cpu.h>

struct metal_cpu *cpu = metal_cpu_get(0);
unsigned long long mtime = metal_cpu_get_mtime(cpu);
```

---

## UART

TODO:

```c
#include <metal/uart.h>

struct metal_uart *uart = metal_uart_get_device(0);
metal_uart_init(uart, 115200);
metal_uart_putc(uart, 'A');
```

---

## 정리

- Freedom Metal = SiFive HAL
- GPIO, UART, 인터럽트, 타이머 추상화
- BSP로 보드별 설정
- 예제 풍부

---

## 다음 장 예고

Ch 12에서는 Linux on HiFive를 다룬다.

---

## 참고 자료

- [Freedom Metal Documentation](https://sifive.github.io/freedom-metal-docs/)
