---
title: "Ch 16: 메모리 모델 (RVWMO)"
date: 2026-05-17T16:00:00
description: "RISC-V 메모리 모델 — RVWMO 순서 규칙, fence, acquire/release, 다른 모델과 비교를 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 16
tags: [RISC-V, RVWMO, Memory-Model, Fence, Memory-Ordering]
draft: true
---

## 개요

RISC-V Weak Memory Ordering (RVWMO)는 RISC-V의 기본 메모리 모델이다.

---

## 왜 메모리 모델이 필요한가

TODO: 컴파일러 최적화, OoO 실행, 캐시 일관성

---

## RVWMO 기본 원칙

TODO:

- 같은 주소에 대한 접근은 순서 유지
- 다른 주소에 대한 접근은 재배치 가능
- 의존성은 순서 유지

---

## Preserved Program Order

TODO: 어떤 경우에 순서가 보장되는가

---

## FENCE 명령어

TODO:

```asm
fence iorw, iorw   # 전체 메모리 배리어
fence rw, rw       # 일반 메모리만
fence.i            # 명령어 페치 동기화 (Zifencei)
```

---

## Acquire/Release

TODO: A 확장의 .aq/.rl 수식어

```asm
lr.w.aq rd, (rs1)      # load-acquire
sc.w.rl rd, rs2, (rs1) # store-release
```

---

## 순서 보장 예시

TODO: 스핀락, 메시지 패싱

---

## RVWMO vs TSO

TODO: Ztso 확장

```
RVWMO — 기본, 약한 모델
Ztso  — x86과 유사한 TSO 모델
```

---

## RVWMO vs ARM/x86

TODO:

| 모델 | 강도 | 예시 |
|------|------|------|
| Sequential Consistency | 가장 강함 | — |
| x86 TSO | 강함 | Intel, AMD |
| ARM | 약함 | ARMv8 |
| RVWMO | 약함 | RISC-V |

---

## 정리

- RVWMO는 약한 메모리 모델
- fence로 순서 강제
- .aq/.rl로 미세 제어
- Ztso로 TSO 호환 가능

---

## 다음 장 예고

Ch 17에서는 디버그 확장을 다룬다.

---

## 참고 자료

- RISC-V Unprivileged Spec, Chapter A (RVWMO)
- A Primer on Memory Consistency and Cache Coherence
