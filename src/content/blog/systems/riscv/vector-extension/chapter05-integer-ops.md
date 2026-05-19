---
title: "Ch 5: 정수 벡터 연산"
date: 2026-05-17T09:00:00
description: "RVV 정수 연산 — 산술, 비교, 논리, 시프트를 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 5
tags: [RISC-V, Vector, Integer, Arithmetic]
draft: true
---

## 개요

RVV의 정수 벡터 연산을 다룬다.

---

## 산술 연산

TODO:

```asm
vadd.vv vd, vs2, vs1    # vd = vs2 + vs1
vadd.vx vd, vs2, rs1    # vd = vs2 + x[rs1]
vadd.vi vd, vs2, imm    # vd = vs2 + imm

vsub.vv vd, vs2, vs1    # vd = vs2 - vs1
vrsub.vx vd, vs2, rs1   # vd = x[rs1] - vs2
vrsub.vi vd, vs2, imm   # vd = imm - vs2
```

---

## 비교 연산

TODO:

```asm
vmseq.vv vd, vs2, vs1   # vd[i] = (vs2[i] == vs1[i])
vmsne.vv vd, vs2, vs1   # vd[i] = (vs2[i] != vs1[i])
vmsltu.vv vd, vs2, vs1  # vd[i] = (vs2[i] < vs1[i]) unsigned
vmslt.vv vd, vs2, vs1   # vd[i] = (vs2[i] < vs1[i]) signed
vmsleu.vv, vmsle.vv, vmsgtu.vv, vmsgt.vv
```

---

## 논리 연산

TODO:

```asm
vand.vv vd, vs2, vs1
vor.vv vd, vs2, vs1
vxor.vv vd, vs2, vs1
```

---

## 시프트 연산

TODO:

```asm
vsll.vv vd, vs2, vs1    # 왼쪽 시프트
vsrl.vv vd, vs2, vs1    # 논리 오른쪽 시프트
vsra.vv vd, vs2, vs1    # 산술 오른쪽 시프트
```

---

## Min/Max

TODO:

```asm
vminu.vv vd, vs2, vs1   # unsigned min
vmin.vv vd, vs2, vs1    # signed min
vmaxu.vv vd, vs2, vs1   # unsigned max
vmax.vv vd, vs2, vs1    # signed max
```

---

## 곱셈

TODO:

```asm
vmul.vv vd, vs2, vs1     # 하위 결과
vmulh.vv vd, vs2, vs1    # 상위 결과 (signed)
vmulhu.vv vd, vs2, vs1   # 상위 결과 (unsigned)
vmulhsu.vv vd, vs2, vs1  # 상위 결과 (signed*unsigned)
```

---

## 나눗셈

TODO:

```asm
vdivu.vv vd, vs2, vs1
vdiv.vv vd, vs2, vs1
vremu.vv vd, vs2, vs1
vrem.vv vd, vs2, vs1
```

---

## 정리

- 대부분 .vv, .vx, .vi 변형
- 비교 결과는 마스크 레지스터
- min/max, 곱셈, 나눗셈 지원
- 시프트량은 하위 비트만 사용

---

## 다음 장 예고

Ch 6에서는 고정소수점과 포화 연산을 다룬다.

---

## 참고 자료

- RISC-V Vector Extension Spec, Chapter 11-12
