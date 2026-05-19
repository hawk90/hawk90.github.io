---
title: "3-04: Priority Inversion 문제 — Mars Pathfinder, Bounded vs Unbounded"
date: 2026-05-07T01:00:00
description: "고우선 task가 저우선 task 때문에 막힘. 1997 화성 탐사선 reset의 원인."
series: "Practical RTOS Internals"
seriesOrder: 25
tags: [priority-inversion, mars-pathfinder, bounded, unbounded]
draft: false
---

## 한 줄 요약

> **"고우선 task가 저우선 task 때문에 막힌다"** — 이것이 Priority Inversion입니다.

Priority Inversion은 RTOS 설계에서 가장 악명 높은 함정 중 하나입니다. 우선순위 기반 스케줄링의 전제 자체를 흔드는 현상이라 정확히 이해해 두는 것이 좋습니다.

## Bounded vs Unbounded

### Bounded (정상)

```text
T_high → mutex 대기 (T_low가 보유, critical 짧음)
T_low → critical 종료 (수 µs) → mutex release
T_high → 즉시 진행
```

대기 시간은 T_low의 critical 길이로 정해집니다. 짧으면 문제가 없습니다.

### Unbounded (위험)

```text
T_high → mutex 대기 → T_low 보유
T_med ready → T_low preempt
T_med 계속 진행 → T_low는 멈춤
T_high → T_med가 끝날 때까지 무한 대기
```

T_med가 길어지면 T_high도 무한히 대기합니다. 이렇게 되면 *시스템이 실패*합니다.

## Mars Pathfinder 1997

NASA Pathfinder는 화성 도착 후 *지속적으로 reset*하는 문제를 겪었습니다.

```text
- 데이터 수집 task (T_low)
- 통신 task (T_med, long-running)
- bus 관리 task (T_high)

T_low → bus mutex 획득
T_med → T_low preempt
T_high → mutex 대기 → watchdog timeout → reset
```

JPL은 **Priority Inheritance를 활성화**(VxWorks 설정)해 문제를 해결했습니다. 화성 현지의 탐사선을 지구에서 원격으로 디버그한 사례로 유명합니다.

## 해결책 1 — Priority Inheritance Protocol (PIP)

```text
T_low가 mutex 보유 + T_high 대기:
  T_low priority → T_high level로 boost
T_low release:
  T_low priority → 원래대로 복원
```

이렇게 되면 T_med가 *T_low를 preempt하지 못합니다*. boost된 priority가 더 높기 때문입니다.

```c
configUSE_MUTEX_PI = 1   // FreeRTOS default
```

## 해결책 2 — Priority Ceiling Protocol (PCP)

각 mutex에 *priority ceiling*을 정적으로 부여하는 방식입니다.

```text
mutex X의 ceiling = T_high priority
T_low가 take하는 즉시 priority → ceiling level로 boost
→ T_med가 시작조차 못 함
```

PCP는 **take 즉시 boost**합니다. 반면 PI는 wait가 발생해야 boost가 일어납니다.

장점은 *deadlock 방지*입니다. 단점은 priority를 사전에 결정해야 한다는 점입니다.

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

FreeRTOS의 기본 정책은 **PIP**입니다.

## PI의 한계 — Chained Inheritance

```text
T_high → mutex A 대기 → T_med 보유
T_med → mutex B 대기 → T_low 보유

T_med priority boost → T_low priority boost
```

체인이 길수록 boost 전파 비용이 커집니다. RTOS 구현체는 보통 *깊이 제한*을 둡니다.

## Linux PREEMPT_RT

Mainline mutex에는 PI가 없습니다. **PREEMPT_RT의 rtmutex**가 PI를 지원하며, 이것이 RT 보장의 핵심입니다.

## 실전 — 회피 우선

1. Critical section은 짧게 유지합니다(수 µs).
2. Lock을 보유한 채로 long blocking 호출을 피합니다.
3. Lock 획득 순서를 일관되게 유지합니다.
4. 공유 자원을 최소화합니다.

## 자주 하는 실수

> ⚠️ Semaphore로 critical 자원을 보호하면 PI가 적용되지 않습니다.

> ⚠️ `configUSE_MUTEX_PI = 0`으로 두면 Pathfinder 사례가 재현됩니다.

> ⚠️ PI를 믿고 critical section을 길게 두는 것은 위험합니다. bounded일 뿐 zero는 아닙니다.

> ⚠️ 여러 mutex를 lock order 없이 쓰면 chain inheritance와 deadlock이 함께 발생합니다.

## 정리

- Priority Inversion은 고우선 task가 저우선 task에 막히는 현상입니다.
- **Bounded**(critical 길이로 한정)와 **Unbounded**(T_med preempt) 두 형태가 있습니다.
- **Mars Pathfinder 1997** 사건은 PI 활성화로 해결됐습니다.
- **PIP**(FreeRTOS)와 **PCP**(VxWorks)가 양대 해결책입니다.
- Semaphore는 PI를 지원하지 않으므로, critical 자원에는 mutex를 씁니다.

## 관련 항목

- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
