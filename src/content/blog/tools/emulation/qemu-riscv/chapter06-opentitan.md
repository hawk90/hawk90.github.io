---
title: "Ch 6: opentitan 머신"
date: 2025-05-20T00:00:00
description: "QEMU opentitan — 보안 칩 에뮬레이션, ROM 부팅을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 6
tags: [RISC-V, QEMU, OpenTitan, Security]
draft: true
---

## 개요

opentitan 머신은 OpenTitan 오픈소스 보안 칩을 에뮬레이션한다.

---

## OpenTitan이란

TODO:

- 오픈소스 Root of Trust
- Google 주도 프로젝트
- RV32IMC 코어 (Ibex)

---

## 머신 스펙

TODO:

| 항목 | 값 |
|------|-----|
| CPU | Ibex (RV32IMC) |
| RAM | SRAM |
| Flash | 내장 |

---

## 실행

TODO:

```bash
qemu-system-riscv32 -machine opentitan -nographic \
    -kernel boot_rom.elf
```

---

## 메모리 맵

TODO:

| 주소 | 용도 |
|------|------|
| 0x00000000 | ROM |
| 0x10000000 | RAM |
| 0x20000000 | Flash |
| 0x40000000 | 주변장치 |

---

## 주변장치

TODO:

- UART
- GPIO
- SPI
- HMAC
- AES
- KMAC

---

## 보안 기능

TODO:

- 보안 부팅
- 암호화 가속기
- 키 관리

---

## 정리

- opentitan = 오픈소스 보안 칩
- Ibex (RV32IMC) 코어
- 암호화 하드웨어 에뮬레이션
- 보안 펌웨어 개발에 활용

---

## 다음 장 예고

Ch 7에서는 spike vs QEMU 비교를 다룬다.

---

## 참고 자료

- [OpenTitan](https://opentitan.org/)
- [QEMU OpenTitan](https://www.qemu.org/docs/master/system/riscv/opentitan.html)
