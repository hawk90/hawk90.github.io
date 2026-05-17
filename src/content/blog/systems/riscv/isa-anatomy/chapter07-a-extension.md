---
title: "Ch 7: 원자 연산 확장 (A)"
date: 2025-05-18T07:00:00
description: "RISC-V A 확장 — LR/SC, AMO 명령어, 메모리 순서 의미론을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 7
tags: [RISC-V, A-Extension, Atomic, LR-SC, AMO]
draft: true
---

## 개요

A 확장은 멀티프로세서 동기화를 위한 원자 연산을 제공한다.

---

## LR/SC (Load-Reserved / Store-Conditional)

TODO: 낙관적 동기화

```asm
lr.w rd, (rs1)        # rd = mem[rs1], reservation 설정
sc.w rd, rs2, (rs1)   # if (reservation valid) mem[rs1] = rs2, rd = 0
                      # else rd = nonzero
```

---

## AMO (Atomic Memory Operations)

TODO: AMOSWAP, AMOADD, AMOAND, AMOOR, AMOXOR, AMOMAX, AMOMIN

```asm
amoadd.w rd, rs2, (rs1)   # rd = mem[rs1]; mem[rs1] = rd + rs2
amoswap.w rd, rs2, (rs1)  # rd = mem[rs1]; mem[rs1] = rs2
```

---

## 메모리 순서 수식어

TODO: .aq, .rl, .aqrl

```asm
amoadd.w.aq rd, rs2, (rs1)    # acquire
amoadd.w.rl rd, rs2, (rs1)    # release
amoadd.w.aqrl rd, rs2, (rs1)  # acquire + release
```

---

## LR/SC vs AMO 선택

TODO: 용도별 적합성

---

## 스핀락 구현

TODO: 예제 코드

---

## 정리

- LR/SC: 낙관적 동기화, 복잡한 연산 가능
- AMO: 단순한 원자 연산, 하드웨어 지원
- .aq/.rl로 메모리 순서 제어

---

## 다음 장 예고

Ch 8에서는 F 확장(단정밀도 부동소수점)을 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter 8 (A Extension)
