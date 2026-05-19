---
title: "Ch 2: 레지스터와 호출 규약"
date: 2026-05-17T02:00:00
description: "x0-x31 레지스터, ABI 이름(zero, ra, sp, gp, tp, a0-a7, s0-s11, t0-t6), 함수 호출 규약을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 2
tags: [RISC-V, Registers, ABI, Calling-Convention]
draft: true
---

## 개요

RISC-V는 32개의 범용 레지스터를 가진다.

---

## 정수 레지스터 (x0-x31)

TODO: 레지스터 테이블

| 레지스터 | ABI 이름 | 용도 | Caller/Callee Saved |
|----------|----------|------|---------------------|
| x0 | zero | 항상 0 | — |
| x1 | ra | 복귀 주소 | Caller |
| x2 | sp | 스택 포인터 | Callee |
| ... | ... | ... | ... |

---

## ABI 이름의 의미

TODO: zero, ra, sp, gp, tp, a0-a7, s0-s11, t0-t6

---

## 함수 호출 규약

TODO: 인자 전달, 반환값, 스택 프레임

---

## 스택 프레임 구조

TODO: 다이어그램

---

## Caller-Saved vs Callee-Saved

TODO: 책임 분리

---

## 부동소수점 레지스터 (f0-f31)

TODO: F/D 확장 사용 시

---

## 정리

- 32개 범용 레지스터
- x0는 항상 0
- ABI 이름으로 역할 명시
- 호출 규약으로 레지스터 책임 분리

---

## 다음 장 예고

Ch 3에서는 RV32I/RV64I 기본 정수 명령어를 다룬다.

---

## 참고 자료

- [RISC-V ABI Specification](https://github.com/riscv-non-isa/riscv-elf-psabi-doc)
- RISC-V Unprivileged Spec, Chapter 25
