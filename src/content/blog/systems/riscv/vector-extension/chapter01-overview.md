---
title: "Ch 1: 벡터 확장 개요"
date: 2025-05-20T05:00:00
description: "RISC-V Vector Extension — SIMD vs 벡터, VLA 설계 철학, RVV 1.0을 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 1
tags: [RISC-V, Vector, RVV, SIMD, VLA]
draft: true
---

## 개요

RISC-V Vector Extension (RVV)은 데이터 병렬 처리를 위한 확장이다.

---

## SIMD vs 벡터

TODO:

| 방식 | 특징 | 예시 |
|------|------|------|
| SIMD | 고정 폭 레지스터 | SSE (128b), AVX (256b) |
| 벡터 | 가변 폭 레지스터 | RVV, ARM SVE |

---

## VLA (Vector Length Agnostic)

TODO:

- 코드가 벡터 길이에 독립적
- 다양한 구현에서 동일 바이너리 실행
- 컴파일 타임에 길이 모름

---

## RVV 버전 역사

TODO:

| 버전 | 상태 |
|------|------|
| 0.7.1 | 초기 드래프트 |
| 0.9 | 드래프트 |
| 1.0 | Ratified (2021) |

---

## 주요 개념

TODO:

- SEW (Selected Element Width)
- LMUL (Length Multiplier)
- vl (Vector Length)
- vtype (Vector Type)

---

## 왜 벡터인가

TODO:

- 코드 이식성
- 스케일러블 성능
- 전력 효율
- 다양한 데이터 타입

---

## 정리

- RVV는 VLA 기반 벡터 확장
- SIMD보다 유연함
- SEW/LMUL로 데이터 타입/그룹 설정
- 스케일러블 성능

---

## 다음 장 예고

Ch 2에서는 벡터 레지스터와 CSR을 다룬다.

---

## 참고 자료

- [RISC-V Vector Extension Spec](https://github.com/riscv/riscv-v-spec)
