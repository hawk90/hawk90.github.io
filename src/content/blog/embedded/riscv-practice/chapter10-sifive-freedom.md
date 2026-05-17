---
title: "Ch 10: SiFive Freedom 보드"
date: 2025-05-19T16:00:00
description: "SiFive Freedom — E310, U540, 메모리 맵, 개발 환경을 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 10
tags: [RISC-V, SiFive, Freedom, HiFive]
draft: true
---

## 개요

SiFive의 Freedom 플랫폼과 HiFive 보드를 다룬다.

---

## SiFive 코어 라인업

TODO:

| 시리즈 | 타겟 | 예시 |
|--------|------|------|
| E | 임베디드 MCU | E20, E21, E24, E31, E34 |
| S | 임베디드 애플리케이션 | S21, S51, S54, S76 |
| U | 애플리케이션/Linux | U54, U74 |

---

## HiFive1 Rev B

TODO:

| 항목 | 스펙 |
|------|------|
| 코어 | FE310-G002 (E31) |
| ISA | RV32IMAC |
| 클럭 | 320MHz |
| SRAM | 16KB |
| Flash | 4MB |

---

## HiFive Unmatched

TODO:

| 항목 | 스펙 |
|------|------|
| 코어 | FU740 (4xU74 + 1xS7) |
| ISA | RV64GC |
| 클럭 | 1.2GHz |
| RAM | 16GB DDR4 |
| 스토리지 | NVMe, microSD |

---

## Freedom Metal

TODO:

- SiFive의 베어메탈 라이브러리
- HAL 제공
- 예제 포함

```bash
git clone https://github.com/sifive/freedom-metal.git
```

---

## 메모리 맵 (FE310)

TODO:

| 주소 | 용도 |
|------|------|
| 0x00000000 | Debug ROM |
| 0x02000000 | CLINT |
| 0x0C000000 | PLIC |
| 0x10000000 | AON |
| 0x20000000 | Flash |
| 0x80000000 | DTIM (SRAM) |

---

## 정리

- SiFive는 RISC-V IP 선두 기업
- HiFive1: 임베디드 학습용
- HiFive Unmatched: Linux 실행 가능
- Freedom Metal로 베어메탈 개발

---

## 다음 장 예고

Ch 11에서는 Freedom Metal HAL을 다룬다.

---

## 참고 자료

- [SiFive Freedom](https://www.sifive.com/boards)
- [Freedom Metal](https://github.com/sifive/freedom-metal)
