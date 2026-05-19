---
title: "Ch 4: 벡터 메모리 접근"
date: 2026-05-17T08:00:00
description: "RVV 메모리 접근 — unit-stride, strided, indexed, segment를 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 4
tags: [RISC-V, Vector, Load, Store, Memory]
draft: true
---

## 개요

RVV의 다양한 벡터 메모리 접근 패턴을 다룬다.

---

## Unit-Stride Load/Store

TODO:

```asm
vle32.v vd, (rs1)      # 연속 32비트 원소 로드
vse32.v vs3, (rs1)     # 연속 32비트 원소 스토어

# 다른 폭
vle8.v, vle16.v, vle64.v
vse8.v, vse16.v, vse64.v
```

---

## Strided Load/Store

TODO:

```asm
vlse32.v vd, (rs1), rs2   # 스트라이드 rs2 바이트
vsse32.v vs3, (rs1), rs2
```

---

## Indexed Load/Store

TODO:

```asm
vluxei32.v vd, (rs1), vs2  # 인덱스 벡터 (비정렬)
vsuxei32.v vs3, (rs1), vs2

vloxei32.v vd, (rs1), vs2  # 인덱스 벡터 (정렬)
vsoxei32.v vs3, (rs1), vs2
```

---

## Segment Load/Store

TODO:

```asm
vlseg2e32.v vd, (rs1)     # 2 필드 구조체
vsseg2e32.v vs3, (rs1)

# vlsegNe<eew>.v (N = 2-8)
```

---

## 정렬 요구사항

TODO:

- 기본: 원소 크기 정렬
- misaligned 접근 가능 (구현 정의)

---

## Fault-Only-First

TODO:

```asm
vle32ff.v vd, (rs1)
# 첫 원소 폴트 → 예외
# 이후 원소 폴트 → vl 조정, 예외 없음
```

---

## Whole Register Load/Store

TODO:

```asm
vl1re32.v v1, (rs1)   # 레지스터 1개 전체
vs1r.v v1, (rs1)
```

---

## 정리

- unit-stride: 연속 접근
- strided: 일정 간격
- indexed: 임의 접근
- segment: 구조체 접근
- fault-only-first: 안전한 루프

---

## 다음 장 예고

Ch 5에서는 정수 벡터 연산을 다룬다.

---

## 참고 자료

- RISC-V Vector Extension Spec, Chapter 7
