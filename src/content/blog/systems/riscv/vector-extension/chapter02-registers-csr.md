---
title: "Ch 2: 벡터 레지스터와 CSR"
date: 2025-05-20T06:00:00
description: "RVV 레지스터 — v0-v31, vl, vtype, vlenb, vstart를 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 2
tags: [RISC-V, Vector, Registers, CSR]
draft: true
---

## 개요

RVV의 벡터 레지스터와 제어 CSR을 다룬다.

---

## 벡터 레지스터

TODO:

- v0-v31: 32개 벡터 레지스터
- VLEN: 구현 정의 (예: 128, 256, 512, ...)
- 각 레지스터는 VLEN 비트

---

## VLEN

TODO:

```
VLEN = 벡터 레지스터 비트 수 (구현 정의)
최소 128비트, 최대 65536비트
2의 거듭제곱
```

---

## 벡터 CSR

TODO:

| CSR | 용도 |
|-----|------|
| vtype | 벡터 타입 설정 |
| vl | 현재 벡터 길이 |
| vlenb | VLEN/8 (바이트 단위) |
| vstart | 시작 인덱스 |
| vxsat | 고정소수점 포화 플래그 |
| vxrm | 고정소수점 반올림 모드 |
| vcsr | vxsat + vxrm |

---

## vtype 인코딩

TODO:

```
vtype = { vill, reserved, vma, vta, vsew[2:0], vlmul[2:0] }

vsew: 00=8b, 01=16b, 10=32b, 11=64b
vlmul: 000=1, 001=2, 010=4, 011=8, 101=1/8, 110=1/4, 111=1/2
vta: 0=undisturbed, 1=agnostic
vma: 0=undisturbed, 1=agnostic
```

---

## vl (Vector Length)

TODO:

```
vl = min(AVL, VLMAX)
VLMAX = LMUL * VLEN / SEW
```

---

## vlenb

TODO:

```
vlenb = VLEN / 8  (읽기 전용)
```

---

## vstart

TODO:

- 예외 후 재개 지점
- 대부분 0

---

## 정리

- 32개 벡터 레지스터 (v0-v31)
- VLEN은 구현 정의
- vtype으로 SEW, LMUL 설정
- vl은 실제 처리 원소 수

---

## 다음 장 예고

Ch 3에서는 vsetvli 명령어를 다룬다.

---

## 참고 자료

- RISC-V Vector Extension Spec, Chapter 3
