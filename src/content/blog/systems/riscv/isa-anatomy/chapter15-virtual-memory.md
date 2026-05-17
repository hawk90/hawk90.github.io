---
title: "Ch 15: 가상 메모리"
date: 2025-05-18T15:00:00
description: "RISC-V 가상 메모리 — Sv32/Sv39/Sv48/Sv57, 페이지 테이블, satp, TLB를 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 15
tags: [RISC-V, Virtual-Memory, Sv39, Page-Table, MMU]
draft: true
---

## 개요

RISC-V는 다양한 가상 메모리 스킴을 지원한다.

---

## 가상 메모리 스킴

TODO:

| 스킴 | 가상 주소 비트 | 페이지 테이블 레벨 | 물리 주소 비트 |
|------|---------------|-------------------|---------------|
| Sv32 | 32 | 2 | 34 |
| Sv39 | 39 | 3 | 56 |
| Sv48 | 48 | 4 | 56 |
| Sv57 | 57 | 5 | 56 |

---

## satp 레지스터

TODO:

```
RV64:
  MODE (bits 63-60): 0=Bare, 8=Sv39, 9=Sv48, 10=Sv57
  ASID (bits 59-44): Address Space ID
  PPN  (bits 43-0):  Page table root PPN
```

---

## 페이지 테이블 엔트리 (PTE)

TODO:

```
63    54 53    28 27    19 18    10 9   8 7 6 5 4 3 2 1 0
┌───────┬────────┬────────┬────────┬─────┬─┬─┬─┬─┬─┬─┬─┬─┐
│Reserved│ PPN[2] │ PPN[1] │ PPN[0] │ RSW │D│A│G│U│X│W│R│V│
└───────┴────────┴────────┴────────┴─────┴─┴─┴─┴─┴─┴─┴─┴─┘
```

---

## PTE 플래그

TODO:

| 비트 | 이름 | 의미 |
|------|------|------|
| V | Valid | 유효 |
| R | Read | 읽기 |
| W | Write | 쓰기 |
| X | Execute | 실행 |
| U | User | 사용자 모드 접근 |
| G | Global | 전역 매핑 |
| A | Accessed | 접근됨 |
| D | Dirty | 수정됨 |

---

## 주소 변환 과정

TODO: Sv39 예시로 3단계 워크

---

## 슈퍼페이지

TODO: 2MB, 1GB 페이지

---

## TLB 관리

TODO: SFENCE.VMA

```asm
sfence.vma           # 전체 TLB 무효화
sfence.vma rs1, x0   # 특정 주소만
sfence.vma x0, rs2   # 특정 ASID만
sfence.vma rs1, rs2  # 주소 + ASID
```

---

## 페이지 폴트

TODO: mcause 12, 13, 15

---

## 정리

- Sv39가 가장 일반적 (Linux)
- satp로 페이지 테이블 루트 지정
- PTE 플래그로 권한 제어
- SFENCE.VMA로 TLB 관리

---

## 다음 장 예고

Ch 16에서는 메모리 모델(RVWMO)을 다룬다.

---

## 참고 자료

- RISC-V Privileged Spec, Chapter 4.3-4.6 (Sv32/39/48/57)
