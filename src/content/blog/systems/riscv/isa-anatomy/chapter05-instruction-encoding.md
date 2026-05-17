---
title: "Ch 5: 명령어 인코딩"
date: 2025-05-18T05:00:00
description: "RISC-V 명령어 포맷 — R/I/S/B/U/J 타입, 즉시값 배치, opcode 맵을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 5
tags: [RISC-V, Encoding, Instruction-Format]
draft: true
---

## 개요

RISC-V 명령어는 32비트 고정 길이(C 확장 제외)이며, 6가지 기본 포맷이 있다.

---

## 명령어 포맷 개요

TODO: 6가지 포맷 다이어그램

| 포맷 | 용도 | 예시 |
|------|------|------|
| R | 레지스터-레지스터 | ADD, SUB |
| I | 즉시값, Load | ADDI, LW |
| S | Store | SW, SB |
| B | 분기 | BEQ, BNE |
| U | 상위 즉시값 | LUI, AUIPC |
| J | 점프 | JAL |

---

## R-Type

TODO: funct7, rs2, rs1, funct3, rd, opcode

```
31      25 24   20 19   15 14  12 11    7 6      0
┌─────────┬───────┬───────┬──────┬───────┬────────┐
│ funct7  │  rs2  │  rs1  │funct3│   rd  │ opcode │
└─────────┴───────┴───────┴──────┴───────┴────────┘
```

---

## I-Type

TODO: imm[11:0], rs1, funct3, rd, opcode

---

## S-Type

TODO: imm[11:5], rs2, rs1, funct3, imm[4:0], opcode

---

## B-Type

TODO: imm 비트 배치의 특이점

---

## U-Type

TODO: imm[31:12], rd, opcode

---

## J-Type

TODO: JAL 인코딩

---

## 즉시값 배치 철학

TODO: 왜 이렇게 복잡한가 — 하드웨어 단순화

---

## Opcode 맵

TODO: 주요 opcode 테이블

---

## 정리

- 6가지 기본 포맷
- 즉시값 배치는 하드웨어 최적화 고려
- opcode + funct3 + funct7로 명령어 식별

---

## 다음 장 예고

Ch 6에서는 M 확장(곱셈/나눗셈)을 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter 2.2 (Base Instruction Formats)
