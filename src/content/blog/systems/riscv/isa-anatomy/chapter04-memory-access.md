---
title: "Ch 4: 메모리 접근"
date: 2026-05-17T04:00:00
description: "RISC-V load/store 명령어, 주소 지정 모드, 정렬 요구사항을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 4
tags: [RISC-V, Load-Store, Memory]
draft: true
---

## 개요

RISC-V는 load-store 아키텍처다. 메모리 접근은 오직 load/store 명령어로만 가능하다.

---

## Load 명령어

TODO: LB, LH, LW, LD, LBU, LHU, LWU

```asm
lw  rd, offset(rs1)   # rd = mem[rs1 + offset]
lb  rd, offset(rs1)   # rd = sign_extend(mem[rs1 + offset][7:0])
lbu rd, offset(rs1)   # rd = zero_extend(mem[rs1 + offset][7:0])
```

---

## Store 명령어

TODO: SB, SH, SW, SD

```asm
sw rs2, offset(rs1)   # mem[rs1 + offset] = rs2
```

---

## 주소 지정 모드

TODO: base + offset만 지원, 단순함의 이유

---

## 정렬 요구사항

TODO: 자연 정렬 권장, misaligned 접근 처리

---

## 리틀 엔디안

TODO: RISC-V는 기본 리틀 엔디안

---

## 메모리 맵 I/O

TODO: MMIO 개념

---

## 정리

- Load-store 아키텍처
- base + offset 주소 지정
- 자연 정렬 권장
- 리틀 엔디안 기본

---

## 다음 장 예고

Ch 5에서는 명령어 인코딩 포맷을 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter 2.6 (Load and Store)
