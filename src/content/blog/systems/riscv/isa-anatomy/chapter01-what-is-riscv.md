---
title: "Ch 1: RISC-V란 무엇인가"
date: 2026-05-17T01:00:00
description: "RISC-V의 역사, 설계 철학, 모듈형 ISA 구조, 네이밍 규칙(RV32/64/128, I/M/A/F/D/C)을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 1
tags: [RISC-V, ISA, Architecture, Open-Source]
draft: true
---

## 개요

RISC-V는 UC Berkeley에서 시작된 오픈 소스 명령어 집합 아키텍처(ISA)다.

---

## RISC-V의 탄생

TODO: 2010년 UC Berkeley, Krste Asanović, David Patterson

---

## 설계 철학

TODO: 단순함, 모듈성, 확장성, 특허 없는 오픈 ISA

---

## 모듈형 ISA 구조

TODO: Base ISA + Extensions

```
RV32I  — 32비트 기본 정수
RV64I  — 64비트 기본 정수
RV128I — 128비트 기본 정수 (draft)
```

---

## 표준 확장

TODO: M, A, F, D, C, V, B, H, Zicsr, Zifencei

| 확장 | 의미 |
|------|------|
| M | 곱셈/나눗셈 |
| A | 원자 연산 |
| F | 단정밀도 부동소수점 |
| D | 배정밀도 부동소수점 |
| C | 압축 명령어 |
| V | 벡터 |

---

## 네이밍 규칙

TODO: RV64IMAFDC = RV64GC

---

## 프로파일

TODO: RVA20, RVA22, RVI20

---

## RISC-V vs ARM vs x86

TODO: 간단한 비교

---

## 정리

- RISC-V는 오픈 소스 ISA
- 모듈형 설계로 유연성 확보
- 기본 ISA + 표준/커스텀 확장
- 임베디드부터 서버까지 스케일

---

## 다음 장 예고

Ch 2에서는 RISC-V의 레지스터 구조와 호출 규약을 다룬다.

---

## 참고 자료

- [RISC-V Specifications](https://riscv.org/technical/specifications/)
- [RISC-V Reader](http://riscvbook.com/)
