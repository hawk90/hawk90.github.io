---
title: "Ch 3: RV32I/RV64I 기본 정수 명령어"
date: 2026-05-17T03:00:00
description: "RISC-V 기본 정수 명령어 — 산술, 논리, 비교, 분기, 점프 명령어를 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 3
tags: [RISC-V, RV32I, RV64I, Instructions]
draft: true
---

## 개요

RV32I/RV64I는 RISC-V의 기본 정수 명령어 집합이다.

---

## 산술 연산

TODO: ADD, SUB, ADDI

```asm
add  rd, rs1, rs2   # rd = rs1 + rs2
addi rd, rs1, imm   # rd = rs1 + imm
sub  rd, rs1, rs2   # rd = rs1 - rs2
```

---

## 논리 연산

TODO: AND, OR, XOR, ANDI, ORI, XORI

---

## 시프트 연산

TODO: SLL, SRL, SRA, SLLI, SRLI, SRAI

---

## 비교 연산

TODO: SLT, SLTU, SLTI, SLTIU

---

## 분기 명령어

TODO: BEQ, BNE, BLT, BGE, BLTU, BGEU

```asm
beq rs1, rs2, offset   # if (rs1 == rs2) PC += offset
bne rs1, rs2, offset   # if (rs1 != rs2) PC += offset
```

---

## 점프 명령어

TODO: JAL, JALR

---

## 상위 즉시값

TODO: LUI, AUIPC

---

## RV64I 추가 명령어

TODO: ADDIW, SLLIW, SRLIW, SRAIW, ADDW, SUBW, ...

---

## 의사 명령어

TODO: li, la, mv, nop, j, ret, call

---

## 정리

- RV32I: 40개 기본 명령어
- RV64I: RV32I + 워드 단위 연산
- 의사 명령어로 가독성 향상

---

## 다음 장 예고

Ch 4에서는 메모리 접근 명령어를 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter 2 (RV32I), Chapter 5 (RV64I)
