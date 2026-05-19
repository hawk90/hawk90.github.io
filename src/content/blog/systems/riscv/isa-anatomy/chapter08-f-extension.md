---
title: "Ch 8: 단정밀도 부동소수점 (F)"
date: 2026-05-17T08:00:00
description: "RISC-V F 확장 — f0-f31 레지스터, FP 연산, 반올림 모드, fcsr을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 8
tags: [RISC-V, F-Extension, Floating-Point, IEEE-754]
draft: true
---

## 개요

F 확장은 IEEE 754 단정밀도(32비트) 부동소수점 연산을 지원한다.

---

## 부동소수점 레지스터

TODO: f0-f31, 32개 레지스터

---

## 부동소수점 CSR

TODO: fcsr, frm, fflags

```
fcsr = { frm[2:0], fflags[4:0] }

fflags:
  NV (Invalid)
  DZ (Divide by Zero)
  OF (Overflow)
  UF (Underflow)
  NX (Inexact)
```

---

## 반올림 모드

TODO: RNE, RTZ, RDN, RUP, RMM, DYN

---

## 산술 연산

TODO: FADD.S, FSUB.S, FMUL.S, FDIV.S, FSQRT.S

---

## FMA 연산

TODO: FMADD.S, FMSUB.S, FNMADD.S, FNMSUB.S

---

## 비교 연산

TODO: FEQ.S, FLT.S, FLE.S

---

## 변환 연산

TODO: FCVT.W.S, FCVT.S.W, FCVT.WU.S, FCVT.S.WU

---

## 부호 조작

TODO: FSGNJ.S, FSGNJN.S, FSGNJX.S

---

## Load/Store

TODO: FLW, FSW

---

## 정리

- 32개 부동소수점 레지스터
- IEEE 754 준수
- fcsr로 반올림/예외 제어
- FMA 네이티브 지원

---

## 다음 장 예고

Ch 9에서는 D 확장(배정밀도 부동소수점)을 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter 11 (F Extension)
- IEEE 754-2008
