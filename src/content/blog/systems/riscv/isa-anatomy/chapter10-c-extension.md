---
title: "Ch 10: 압축 명령어 (C)"
date: 2025-05-18T10:00:00
description: "RISC-V C 확장 — 16비트 명령어 인코딩, RVC 매핑, 코드 밀도 향상을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 10
tags: [RISC-V, C-Extension, Compressed, Code-Density]
draft: true
---

## 개요

C 확장은 자주 사용되는 명령어를 16비트로 압축하여 코드 밀도를 높인다.

---

## 왜 압축 명령어인가

TODO: 코드 크기 감소, I-cache 효율, Thumb-2와 비교

---

## 16비트 vs 32비트 구분

TODO: 하위 2비트로 구분

```
명령어[1:0] = 11  → 32비트 명령어
명령어[1:0] ≠ 11  → 16비트 명령어
```

---

## 압축 명령어 포맷

TODO: CR, CI, CSS, CIW, CL, CS, CA, CB, CJ

---

## 주요 압축 명령어

TODO:

| 압축 | 원본 |
|------|------|
| C.LW | LW |
| C.SW | SW |
| C.ADDI | ADDI |
| C.ADD | ADD |
| C.MV | MV (ADD rd, x0, rs2) |
| C.J | JAL x0, offset |
| C.JR | JALR x0, rs1, 0 |

---

## 레지스터 제한

TODO: 일부 명령어는 x8-x15만 사용 가능

---

## 스택 포인터 명령어

TODO: C.ADDI16SP, C.LWSP, C.SWSP

---

## 정리

- 16비트 압축으로 코드 크기 25-30% 감소
- 하위 2비트로 길이 구분
- 일부 레지스터 제한 있음
- 어셈블러가 자동 선택 가능

---

## 다음 장 예고

Ch 11에서는 특권 모드 개요를 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter 16 (C Extension)
