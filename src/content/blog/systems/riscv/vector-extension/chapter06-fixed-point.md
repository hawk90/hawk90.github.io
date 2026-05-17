---
title: "Ch 6: 고정소수점·포화 연산"
date: 2025-05-20T10:00:00
description: "RVV 고정소수점 — widening, narrowing, saturating 연산을 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 6
tags: [RISC-V, Vector, Fixed-Point, Saturating]
draft: true
---

## 개요

RVV의 고정소수점과 포화 연산을 다룬다.

---

## Widening 연산

TODO:

```asm
vwadd.vv vd, vs2, vs1   # 결과가 2배 폭
vwsub.vv vd, vs2, vs1
vwmul.vv vd, vs2, vs1

# SEW=32 입력 → SEW=64 출력
```

---

## Narrowing 연산

TODO:

```asm
vnsrl.wv vd, vs2, vs1   # 2배 폭 → 1배 폭
vnsra.wv vd, vs2, vs1

# 상위 비트 버림
```

---

## 포화 (Saturating) 연산

TODO:

```asm
vsaddu.vv vd, vs2, vs1  # unsigned 포화 덧셈
vsadd.vv vd, vs2, vs1   # signed 포화 덧셈
vssubu.vv vd, vs2, vs1  # unsigned 포화 뺄셈
vssub.vv vd, vs2, vs1   # signed 포화 뺄셈
```

---

## 포화의 의미

TODO:

```
오버플로우 시:
  unsigned: 최대값으로 클램프 (예: 0xFF)
  signed: min 또는 max로 클램프 (예: -128, 127)
```

---

## vxsat 플래그

TODO:

```
포화 발생 시 vxsat = 1
csrr t0, vxsat
```

---

## 스케일링 시프트

TODO:

```asm
vssrl.vv vd, vs2, vs1   # 스케일링 시프트 (반올림)
vssra.vv vd, vs2, vs1
```

---

## 반올림 모드 (vxrm)

TODO:

| 모드 | 설명 |
|------|------|
| 0 | round-to-nearest-up |
| 1 | round-to-nearest-even |
| 2 | round-down (truncate) |
| 3 | round-to-odd |

---

## 정리

- widening: 결과 폭 2배
- narrowing: 결과 폭 1/2
- saturating: 오버플로우 방지
- vxrm으로 반올림 제어

---

## 다음 장 예고

Ch 7에서는 부동소수점 벡터 연산을 다룬다.

---

## 참고 자료

- RISC-V Vector Extension Spec, Chapter 12
