---
title: "Ch 8: 마스킹과 조건부 실행"
date: 2025-05-20T12:00:00
description: "RVV 마스킹 — v0 마스크, vmerge, vcompress를 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 8
tags: [RISC-V, Vector, Mask, Predication]
draft: true
---

## 개요

RVV의 마스킹 메커니즘으로 조건부 벡터 연산을 수행한다.

---

## 마스크 레지스터

TODO:

- v0가 마스크로 사용됨
- 각 비트가 하나의 원소에 대응
- 마스크 비트 = 1이면 연산 수행

---

## 마스크 연산 지정

TODO:

```asm
vadd.vv vd, vs2, vs1, v0.t   # v0 마스크 사용
vadd.vv vd, vs2, vs1         # 마스크 없음 (모든 원소)
```

---

## 마스크 정책

TODO:

```
vma = 0: 마스크된 원소 undisturbed (기존 값 유지)
vma = 1: 마스크된 원소 agnostic (임의 값)
```

---

## 마스크 연산

TODO:

```asm
vmand.mm vd, vs2, vs1   # AND
vmnand.mm vd, vs2, vs1  # NAND
vmor.mm vd, vs2, vs1    # OR
vmxor.mm vd, vs2, vs1   # XOR
vmnot.m vd, vs2         # NOT (의사 명령어)
```

---

## vmerge

TODO:

```asm
vmerge.vvm vd, vs2, vs1, v0
# vd[i] = v0[i] ? vs1[i] : vs2[i]

vmerge.vxm vd, vs2, rs1, v0
vmerge.vim vd, vs2, imm, v0
```

---

## vmv (Move)

TODO:

```asm
vmv.v.v vd, vs1         # 레지스터 복사
vmv.v.x vd, rs1         # 스칼라 브로드캐스트
vmv.v.i vd, imm         # 즉시값 브로드캐스트
```

---

## vcompress

TODO:

```asm
vcompress.vm vd, vs2, vs1
# vs1 마스크에서 1인 원소만 vd에 압축
```

---

## 마스크 팝카운트

TODO:

```asm
vcpop.m rd, vs2         # 마스크에서 1 비트 수
vfirst.m rd, vs2        # 첫 번째 1 비트 인덱스
```

---

## 정리

- v0가 마스크 레지스터
- .t 접미사로 마스크 활성화
- vmerge로 조건부 선택
- vcompress로 필터링

---

## 다음 장 예고

Ch 9에서는 Intrinsics 프로그래밍을 다룬다.

---

## 참고 자료

- RISC-V Vector Extension Spec, Chapter 15-16
