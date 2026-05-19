---
title: "Ch 7: 부동소수점 벡터 연산"
date: 2026-05-17T11:00:00
description: "RVV 부동소수점 — FP 산술, 변환, 비교를 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 7
tags: [RISC-V, Vector, Floating-Point, FP]
draft: true
---

## 개요

RVV의 부동소수점 벡터 연산을 다룬다.

---

## FP 산술

TODO:

```asm
vfadd.vv vd, vs2, vs1   # FP 덧셈
vfsub.vv vd, vs2, vs1   # FP 뺄셈
vfmul.vv vd, vs2, vs1   # FP 곱셈
vfdiv.vv vd, vs2, vs1   # FP 나눗셈
vfsqrt.v vd, vs2        # FP 제곱근
```

---

## FP FMA

TODO:

```asm
vfmacc.vv vd, vs1, vs2   # vd = vd + vs1 * vs2
vfnmacc.vv vd, vs1, vs2  # vd = -vd - vs1 * vs2
vfmsac.vv vd, vs1, vs2   # vd = vd - vs1 * vs2
vfnmsac.vv vd, vs1, vs2  # vd = -vd + vs1 * vs2

vfmadd.vv vd, vs1, vs2   # vd = vs1 * vd + vs2
vfnmadd.vv, vfmsub.vv, vfnmsub.vv
```

---

## FP 비교

TODO:

```asm
vmfeq.vv vd, vs2, vs1   # ==
vmfne.vv vd, vs2, vs1   # !=
vmflt.vv vd, vs2, vs1   # <
vmfle.vv vd, vs2, vs1   # <=
vmfgt.vv vd, vs2, vs1   # >
vmfge.vv vd, vs2, vs1   # >=
```

---

## FP Min/Max

TODO:

```asm
vfmin.vv vd, vs2, vs1
vfmax.vv vd, vs2, vs1
```

---

## FP 부호 조작

TODO:

```asm
vfsgnj.vv vd, vs2, vs1    # 부호 복사
vfsgnjn.vv vd, vs2, vs1   # 부호 반전 후 복사
vfsgnjx.vv vd, vs2, vs1   # 부호 XOR
```

---

## FP 변환

TODO:

```asm
vfcvt.xu.f.v vd, vs2    # FP → unsigned int
vfcvt.x.f.v vd, vs2     # FP → signed int
vfcvt.f.xu.v vd, vs2    # unsigned int → FP
vfcvt.f.x.v vd, vs2     # signed int → FP
```

---

## FP Widening/Narrowing

TODO:

```asm
vfwcvt.f.f.v vd, vs2    # 단정밀도 → 배정밀도
vfncvt.f.f.w vd, vs2    # 배정밀도 → 단정밀도
```

---

## 정리

- FP 산술, FMA 지원
- 비교 결과는 마스크
- 정수 ↔ FP 변환
- widening/narrowing 변환

---

## 다음 장 예고

Ch 8에서는 마스킹과 조건부 실행을 다룬다.

---

## 참고 자료

- RISC-V Vector Extension Spec, Chapter 13-14
