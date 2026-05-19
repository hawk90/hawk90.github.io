---
title: "Ch 3: 벡터 타입 설정"
date: 2026-05-17T07:00:00
description: "RVV 타입 설정 — vsetvli/vsetivli, SEW, LMUL, 꼬리/마스크 정책을 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 3
tags: [RISC-V, Vector, vsetvli, SEW, LMUL]
draft: true
---

## 개요

벡터 연산 전에 vtype과 vl을 설정하는 명령어를 다룬다.

---

## vsetvli

TODO:

```asm
vsetvli rd, rs1, vtypei
# rd = 새 vl
# rs1 = AVL (Application Vector Length)
# vtypei = 즉시값으로 vtype 설정
```

---

## vsetivli

TODO:

```asm
vsetivli rd, uimm, vtypei
# uimm = 5비트 즉시값 AVL (0-31)
```

---

## vsetvl

TODO:

```asm
vsetvl rd, rs1, rs2
# rs2 = vtype 레지스터 값
```

---

## SEW (Selected Element Width)

TODO:

| SEW | 비트 |
|-----|------|
| e8 | 8 |
| e16 | 16 |
| e32 | 32 |
| e64 | 64 |

---

## LMUL (Length Multiplier)

TODO:

| LMUL | 그룹 |
|------|------|
| m1 | 1 |
| m2 | 2 |
| m4 | 4 |
| m8 | 8 |
| mf2 | 1/2 |
| mf4 | 1/4 |
| mf8 | 1/8 |

---

## 꼬리 정책 (vta)

TODO:

```
vta = 0: tail undisturbed (기존 값 유지)
vta = 1: tail agnostic (임의 값)
```

---

## 마스크 정책 (vma)

TODO:

```
vma = 0: mask undisturbed
vma = 1: mask agnostic
```

---

## 예제

TODO:

```asm
# 32비트 원소, LMUL=2, 꼬리/마스크 agnostic
vsetvli t0, a0, e32, m2, ta, ma
```

---

## VLMAX 계산

TODO:

```
VLMAX = LMUL * VLEN / SEW

예: VLEN=256, SEW=32, LMUL=2
VLMAX = 2 * 256 / 32 = 16
```

---

## 정리

- vsetvli로 vtype, vl 동시 설정
- SEW로 원소 크기
- LMUL로 레지스터 그룹
- ta/ma로 꼬리/마스크 정책

---

## 다음 장 예고

Ch 4에서는 벡터 메모리 접근을 다룬다.

---

## 참고 자료

- RISC-V Vector Extension Spec, Chapter 6
