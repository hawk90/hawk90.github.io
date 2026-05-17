---
title: "Ch 2: virt 머신 해부"
date: 2025-05-19T20:00:00
description: "QEMU virt 머신 — 메모리 맵, 가상 디바이스, DTB 자동 생성을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 2
tags: [RISC-V, QEMU, virt, Memory-Map]
draft: true
---

## 개요

QEMU virt 머신은 RISC-V 개발을 위한 범용 가상 플랫폼이다.

---

## 메모리 맵

TODO:

| 주소 | 크기 | 용도 |
|------|------|------|
| 0x00001000 | 0x100 | Boot ROM |
| 0x00100000 | 0x1000 | Test 디바이스 |
| 0x02000000 | 0x10000 | CLINT |
| 0x0C000000 | 0x4000000 | PLIC |
| 0x10000000 | 0x100 | UART (ns16550) |
| 0x10001000 | 0x1000 | VirtIO |
| 0x80000000 | - | DRAM |

---

## 가상 디바이스

TODO:

- UART: ns16550a
- RTC: Goldfish RTC
- VirtIO: block, net, rng, ...
- PLIC: Platform-Level Interrupt Controller
- CLINT: Core Local Interruptor

---

## DTB 자동 생성

TODO:

```bash
# DTB 덤프
qemu-system-riscv64 -machine virt,dumpdtb=virt.dtb -nographic

# DTS로 변환
dtc -I dtb -O dts virt.dtb -o virt.dts
```

---

## CPU 옵션

TODO:

```bash
qemu-system-riscv64 -machine virt -cpu rv64,v=true,vlen=256
```

---

## 멀티코어

TODO:

```bash
qemu-system-riscv64 -machine virt -smp 4
```

---

## 메모리 설정

TODO:

```bash
qemu-system-riscv64 -machine virt -m 2G
```

---

## 정리

- virt 머신은 범용 RISC-V 플랫폼
- 표준 주변장치 포함
- DTB 자동 생성
- 멀티코어, 확장 선택 가능

---

## 다음 장 예고

Ch 3에서는 QEMU + GDB 디버깅을 다룬다.

---

## 참고 자료

- [QEMU virt machine](https://www.qemu.org/docs/master/system/riscv/virt.html)
