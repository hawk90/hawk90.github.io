---
title: "Ch 4: sifive_e 머신"
date: 2025-05-19T22:00:00
description: "QEMU sifive_e — E31 코어 에뮬레이션, 주변장치 모델을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 4
tags: [RISC-V, QEMU, SiFive, E31]
draft: true
---

## 개요

sifive_e 머신은 SiFive E 시리즈(HiFive1) 호환 플랫폼이다.

---

## 머신 스펙

TODO:

| 항목 | 값 |
|------|-----|
| CPU | E31 (RV32IMAC) |
| 클럭 | 에뮬레이션 |
| RAM | 16KB DTIM |
| Flash | 512MB (QSPI) |

---

## 실행

TODO:

```bash
qemu-system-riscv32 -machine sifive_e -nographic \
    -kernel firmware.elf
```

---

## 메모리 맵

TODO:

| 주소 | 용도 |
|------|------|
| 0x00000000 | Debug |
| 0x02000000 | CLINT |
| 0x0C000000 | PLIC |
| 0x10000000 | AON |
| 0x10008000 | PRCI |
| 0x10010000 | OTP |
| 0x10013000 | GPIO |
| 0x20000000 | Flash |
| 0x80000000 | DTIM |

---

## 주변장치

TODO:

- UART0, UART1
- QSPI0, QSPI1, QSPI2
- PWM0, PWM1, PWM2
- GPIO
- PRCI (클럭)
- AON

---

## HiFive1 호환

TODO:

- Freedom Metal 코드 실행 가능
- 메모리 맵 동일

---

## 정리

- sifive_e = HiFive1 에뮬레이션
- E31 (RV32IMAC) 코어
- Freedom Metal 호환
- 하드웨어 없이 개발 가능

---

## 다음 장 예고

Ch 5에서는 sifive_u 머신을 다룬다.

---

## 참고 자료

- [QEMU sifive_e](https://www.qemu.org/docs/master/system/riscv/sifive_u.html)
