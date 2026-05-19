---
title: "Ch 8: 페리페럴 추가"
date: 2026-05-17T08:00:00
description: "UART, SPI, I2C 등 페리페럴을 QEMU에 추가한다."
tags: [QEMU, UART, SPI, I2C]
series: "QEMU Embedded Emulation"
seriesOrder: 8
draft: true
---

## QEMU 페리페럴

QEMU virt 머신에서 추가할 수 있는 페리페럴:

- UART (PL011, 16550)
- SPI
- I2C
- GPIO

---

## UART 추가

```bash
qemu-system-aarch64 -M virt -serial mon:stdio -serial tcp::4321,server,nowait
```

---

## I2C 디바이스

QEMU에서 I2C 디바이스를 에뮬레이션합니다.

---

## 정리

- QEMU는 다양한 페리페럴 에뮬레이션을 지원한다.
- -serial 옵션으로 UART를 추가한다.
- I2C/SPI 디바이스도 에뮬레이션 가능하다.

---

## 관련 항목

- [Ch 7: 디바이스 트리](/blog/tools/qemu-embedded-emulation/chapter07-device-tree)
- [Ch 9: 네트워킹](/blog/tools/qemu-embedded-emulation/chapter09-networking)
