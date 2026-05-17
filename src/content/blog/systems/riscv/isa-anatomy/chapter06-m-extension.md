---
title: "Ch 6: 곱셈·나눗셈 확장 (M)"
date: 2025-05-18T06:00:00
description: "RISC-V M 확장 — MUL, MULH, MULHSU, MULHU, DIV, DIVU, REM, REMU 명령어를 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 6
tags: [RISC-V, M-Extension, Multiply, Divide]
draft: true
---

## 개요

M 확장은 정수 곱셈과 나눗셈 명령어를 추가한다.

---

## 곱셈 명령어

TODO: MUL, MULH, MULHSU, MULHU

```asm
mul    rd, rs1, rs2   # rd = (rs1 * rs2)[XLEN-1:0]
mulh   rd, rs1, rs2   # rd = (rs1 * rs2)[2*XLEN-1:XLEN] (signed)
mulhu  rd, rs1, rs2   # rd = (rs1 * rs2)[2*XLEN-1:XLEN] (unsigned)
mulhsu rd, rs1, rs2   # rd = (rs1 * rs2)[2*XLEN-1:XLEN] (signed * unsigned)
```

---

## 나눗셈 명령어

TODO: DIV, DIVU, REM, REMU

```asm
div  rd, rs1, rs2   # rd = rs1 / rs2 (signed)
divu rd, rs1, rs2   # rd = rs1 / rs2 (unsigned)
rem  rd, rs1, rs2   # rd = rs1 % rs2 (signed)
remu rd, rs1, rs2   # rd = rs1 % rs2 (unsigned)
```

---

## RV64M 추가 명령어

TODO: MULW, DIVW, DIVUW, REMW, REMUW

---

## 0으로 나누기

TODO: 예외 없음, 정의된 결과

---

## 오버플로우 처리

TODO: signed min / -1

---

## 성능 고려

TODO: 나눗셈은 보통 다중 사이클

---

## 정리

- M 확장: 8개 명령어 (RV32M), 13개 (RV64M)
- 곱셈 상위 비트 접근 가능
- 나눗셈 예외 없음 (정의된 결과)

---

## 다음 장 예고

Ch 7에서는 A 확장(원자 연산)을 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter 7 (M Extension)
