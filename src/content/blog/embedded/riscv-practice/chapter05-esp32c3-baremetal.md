---
title: "Ch 5: 베어메탈 LED 깜빡이기"
date: 2026-05-17T11:00:00
description: "ESP32-C3 베어메탈 — GPIO 제어, 링커 스크립트, 스타트업 코드를 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 5
tags: [RISC-V, ESP32-C3, Bare-Metal, GPIO]
draft: true
---

## 개요

ESP32-C3에서 SDK 없이 LED를 깜빡이는 베어메탈 프로그램을 작성한다.

---

## GPIO 레지스터

TODO:

```c
#define GPIO_OUT_REG       0x60004004
#define GPIO_OUT_W1TS_REG  0x60004008
#define GPIO_OUT_W1TC_REG  0x6000400C
#define GPIO_ENABLE_REG    0x60004020
```

---

## 링커 스크립트

TODO:

```ld
MEMORY {
    IRAM (rwx) : ORIGIN = 0x40380000, LENGTH = 64K
    DRAM (rw)  : ORIGIN = 0x3FC80000, LENGTH = 320K
}

SECTIONS {
    .text : { *(.text.start) *(.text*) } > IRAM
    .data : { *(.data*) } > DRAM
    .bss  : { *(.bss*) } > DRAM
}
```

---

## 스타트업 코드

TODO:

```asm
.section .text.start
.global _start
_start:
    la sp, _stack_top
    call main
1:  j 1b
```

---

## LED 제어 코드

TODO:

```c
#define GPIO_PIN 8  // 온보드 LED

void gpio_init(void) {
    *(volatile uint32_t *)GPIO_ENABLE_REG |= (1 << GPIO_PIN);
}

void gpio_set(int val) {
    if (val)
        *(volatile uint32_t *)GPIO_OUT_W1TS_REG = (1 << GPIO_PIN);
    else
        *(volatile uint32_t *)GPIO_OUT_W1TC_REG = (1 << GPIO_PIN);
}

void delay(int n) {
    for (volatile int i = 0; i < n; i++);
}

void main(void) {
    gpio_init();
    while (1) {
        gpio_set(1);
        delay(1000000);
        gpio_set(0);
        delay(1000000);
    }
}
```

---

## 빌드

TODO:

```bash
riscv32-unknown-elf-gcc -march=rv32imc -mabi=ilp32 \
    -nostdlib -T linker.ld -o blink.elf start.S main.c
```

---

## 플래시

TODO:

```bash
esptool.py --chip esp32c3 write_flash 0x0 blink.bin
```

---

## 정리

- 베어메탈로 하드웨어 직접 제어
- 링커 스크립트로 메모리 배치
- GPIO 레지스터 직접 조작
- esptool로 플래시

---

## 다음 장 예고

Ch 6에서는 ESP-IDF + FreeRTOS를 다룬다.

---

## 참고 자료

- ESP32-C3 Technical Reference Manual
