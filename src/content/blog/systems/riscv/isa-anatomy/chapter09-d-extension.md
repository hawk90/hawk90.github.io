---
title: "Ch 9: 배정밀도 부동소수점 (D)"
date: 2025-05-18T09:00:00
description: "RISC-V D 확장 — F 확장과의 관계, 64비트 FP 연산, NaN 처리를 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 9
tags: [RISC-V, D-Extension, Double-Precision, IEEE-754]
draft: true
---

## 개요

D 확장은 IEEE 754 배정밀도(64비트) 부동소수점 연산을 지원한다. F 확장을 필수로 요구한다.

---

## F 확장과의 관계

TODO: D는 F를 포함/확장

---

## 레지스터 확장

TODO: f0-f31이 64비트로 확장

---

## 산술 연산

TODO: FADD.D, FSUB.D, FMUL.D, FDIV.D, FSQRT.D

---

## FMA 연산

TODO: FMADD.D, FMSUB.D, FNMADD.D, FNMSUB.D

---

## 변환 연산

TODO:
- 정수 ↔ 배정밀도: FCVT.L.D, FCVT.D.L, ...
- 단정밀도 ↔ 배정밀도: FCVT.S.D, FCVT.D.S

---

## NaN Boxing

TODO: RV64에서 단정밀도 값을 64비트 레지스터에 저장하는 규칙

---

## Load/Store

TODO: FLD, FSD

---

## NaN 처리

TODO: Canonical NaN

---

## 정리

- D 확장은 F 확장 필수
- 64비트 레지스터 사용
- NaN boxing 규칙 중요
- F ↔ D 변환 지원

---

## 다음 장 예고

Ch 10에서는 C 확장(압축 명령어)을 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter 12 (D Extension)
