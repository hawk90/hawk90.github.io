---
title: "3-04: Priority Inversion 문제 — Mars Pathfinder, Bounded vs Unbounded"
date: 2026-05-13T01:00:00
description: "고우선 task가 저우선 task 때문에 막힘. 1997 화성 탐사선 reset의 원인."
series: "Practical RTOS Internals"
seriesOrder: 25
tags: [priority-inversion, mars-pathfinder, bounded, unbounded]
draft: true
---

## 한 줄 요약

> **"고우선 task가 저우선 task 때문에 막힌다"** — Priority Inversion.

## Bounded vs Unbounded

### Bounded (정상)

```text
T_high → mutex 대기 (T_low가 보유, critical 짧음)
T_low → critical 종료 (수 µs) → mutex release
T_high → 즉시 진행
```

대기 = T_low의 critical 길이. 짧으면 OK.

### Unbounded (위험)

```text
T_high → mutex 대기 → T_low 보유
T_med ready → T_low preempt
T_med 계속 — T_low 진행 X
T_high → T_med 끝까지 대기 (무한)
```

T_med 길면 T_high도 무한 대기. *시스템 fail*.

## Mars Pathfinder 1997

NASA Pathfinder가 화성 도착 후 *지속 reset*:

```text
- 데이터 수집 task (T_low)
- 통신 task (T_med, long-running)
- bus 관리 task (T_high)

T_low → bus mutex
T_med → T_low preempt
T_high → mutex 대기 → watchdog timeout → reset
```

**JPL 해결 — Priority Inheritance enable** (VxWorks 설정). 화성에서 원격 디버그.

## 해결책 1 — Priority Inheritance Protocol (PIP)

```text
T_low가 mutex 보유 + T_high 대기:
  T_low priority → T_high level boost
T_low release:
  T_low priority → 원래 복원
```

T_med가 *T_low preempt 못 함* — boost된 priority가 더 높음.

```c
configUSE_MUTEX_PI = 1   // FreeRTOS default
```

## 해결책 2 — Priority Ceiling Protocol (PCP)

각 mutex에 *priority ceiling* 정적 부여.

```text
mutex X의 ceiling = T_high priority
T_low가 take 즉시 priority → ceiling boost
→ T_med 시작 못 함
```

**Take 즉시 boost** — PI는 wait 시 boost.

장점 — *deadlock 방지*. 단점 — priority 사전 결정.

## Immediate PCP vs Original PCP

| | Immediate | Original |
| --- | --- | --- |
| Boost 시점 | Take 즉시 | Conflict 시 |
| 구현 | 단순 | 복잡 |
| 채택 | VxWorks·Zephyr | 옛 academic |

## PIP vs PCP

| | PIP | PCP |
| --- | --- | --- |
| 단순성 | ✓ | ✗ |
| Priority 사전 분석 | ✗ | ✓ |
| Deadlock 방지 | ✗ | ✓ |
| 채택 | FreeRTOS·Zephyr | VxWorks |

FreeRTOS = **PIP**.

## PI의 한계 — Chained Inheritance

```text
T_high → mutex A 대기 → T_med 보유
T_med → mutex B 대기 → T_low 보유

T_med priority boost → T_low priority boost
```

체인 길수록 boost 전파 비용. RTOS는 *깊이 제한*.

## Linux PREEMPT_RT

Mainline mutex = no PI. **PREEMPT_RT의 rtmutex** = PI 지원. RT 보장 핵심.

## 실전 — 회피 우선

1. Critical 짧게 (수 µs)
2. Lock 보유 중 long blocking 회피
3. Lock order 일관
4. 공유 자원 최소화

## 자주 하는 실수

> ⚠️ Semaphore로 critical 자원 보호 — no PI

> ⚠️ `configUSE_MUTEX_PI = 0` — Pathfinder 재현

> ⚠️ PI 가정 critical 길게 — bounded이지 zero 아님

> ⚠️ Multiple mutex without lock order — chain inheritance·deadlock

## 정리

- Priority Inversion = 고우선이 저우선에 막힘.
- **Bounded** (critical 길이) vs **Unbounded** (T_med preempt).
- **Mars Pathfinder 1997** — PI로 fix.
- **PIP** (FreeRTOS) vs **PCP** (VxWorks).
- Semaphore는 PI 없음 — critical 자원엔 mutex.

## 관련 항목

- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
