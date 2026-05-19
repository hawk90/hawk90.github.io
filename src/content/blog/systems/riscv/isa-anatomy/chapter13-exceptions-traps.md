---
title: "Ch 13: 예외와 트랩"
date: 2026-05-17T13:00:00
description: "RISC-V 예외 처리 — 동기/비동기 예외, 트랩 벡터, 핸들러 진입/복귀를 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 13
tags: [RISC-V, Exception, Trap, Handler]
draft: true
---

## 개요

RISC-V에서 트랩은 예외(exception)와 인터럽트(interrupt)를 통칭한다.

---

## 예외 vs 인터럽트

TODO:

| 구분 | 동기/비동기 | 원인 |
|------|-------------|------|
| 예외 | 동기 | 명령어 실행 중 발생 |
| 인터럽트 | 비동기 | 외부 이벤트 |

---

## 예외 종류

TODO:

| mcause | 이름 |
|--------|------|
| 0 | Instruction address misaligned |
| 1 | Instruction access fault |
| 2 | Illegal instruction |
| 3 | Breakpoint |
| 4 | Load address misaligned |
| 5 | Load access fault |
| 6 | Store address misaligned |
| 7 | Store access fault |
| 8-11 | Environment call (U/S/H/M) |
| 12 | Instruction page fault |
| 13 | Load page fault |
| 15 | Store page fault |

---

## 트랩 진입 과정

TODO:
1. mepc ← PC
2. mcause ← 예외 원인
3. mtval ← 예외 관련 값
4. mstatus.MPIE ← mstatus.MIE
5. mstatus.MIE ← 0
6. mstatus.MPP ← 이전 모드
7. PC ← mtvec

---

## 트랩 벡터 모드

TODO: Direct vs Vectored

```
mtvec.MODE = 0: Direct   — 모든 트랩이 BASE로
mtvec.MODE = 1: Vectored — 인터럽트는 BASE + 4*cause로
```

---

## 트랩 복귀

TODO: MRET, SRET

```asm
mret   # PC ← mepc; 권한 ← mstatus.MPP; ...
```

---

## 중첩 트랩

TODO: 소프트웨어 책임, 스택 사용

---

## 정리

- 트랩 = 예외 + 인터럽트
- mcause로 원인 식별
- mtvec으로 핸들러 주소 지정
- MRET/SRET으로 복귀

---

## 다음 장 예고

Ch 14에서는 인터럽트 상세를 다룬다.

---

## 참고 자료

- RISC-V Privileged Spec, Chapter 3 (Machine-Level ISA)
