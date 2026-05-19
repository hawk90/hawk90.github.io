---
title: "3-06: Priority Ceiling Protocol — Immediate vs Original"
date: 2026-05-07T03:00:00
description: "PI의 대안. 각 mutex에 정적 ceiling — take 즉시 boost. Deadlock 방지."
series: "Practical RTOS Internals"
seriesOrder: 27
tags: [priority-ceiling, pcp, deadlock-free]
draft: false
---

## 한 줄 요약

> **"Mutex에 ceiling을 정적으로 부여하고 take 즉시 boost한다"** — PI의 *take-then-conflict* 방식과 달리, 사전에 적극적으로 막는 접근입니다.

이번 글에서는 Priority Ceiling Protocol(PCP)을 살펴봅니다. PI보다 덜 알려졌지만 deadlock 보장 측면에서 강력합니다.

## PCP 동작

각 mutex M에 *priority ceiling* `C(M)`을 부여합니다. `C(M)`은 *이 mutex를 lock할 task 중 최고 priority*입니다.

예시 — mutex X: `C(X) = 5` (`T_high`의 priority)

1. `T_low` (priority 1)가 X를 take하는 즉시 → `T_low`의 priority가 5로 boost.
2. `T_med` (priority 3)가 ready 되어도 시작 못 함 (`T_low`의 5 > 3).
3. `T_low`가 X를 release하면 priority가 1로 복원.

PCP는 **take 즉시 boost**합니다. PI는 *conflict가 발생한 후에 boost*합니다.

## Immediate PCP vs Original PCP

| | Immediate | Original |
| --- | --- | --- |
| Boost 시점 | Take 즉시 | Take + conflict 시 |
| 구현 | 단순 | 복잡 (system ceiling 계산) |
| Preemption | 자기 ceiling 위 task만 | 동일 + 다른 mutex ceiling |
| 사용 | VxWorks·일부 RTOS | 학술 |

## Deadlock 방지 증명

1. `T1`이 `M1` 보유 (ceiling 5) → `T1` priority = 5.
2. `T1`이 `M2` (ceiling 5)를 시도.
3. 만약 `T2`가 `M2`를 보유 중이면 → `T2` priority ≥ 5 (`M2`의 ceiling).
4. `T2`의 priority가 5 이상이면 `T1`은 *시작도 못 함* — 모순.
5. 따라서 `T2`가 `M2`를 보유할 수 없고, `M2`는 free 상태이므로 `T1`이 acquire 가능.

결론은 *PCP를 쓰면 deadlock이 불가능*하다는 것입니다.

이것이 **PCP의 가장 큰 매력**입니다. *Lock order에 무관*하게 deadlock이 막힙니다.

## 구현 — RTOS API

```c
// VxWorks
semMCreate(SEM_PRIORITY_CEILING, ceiling_priority);

// Zephyr (config 옵션)
CONFIG_PRIORITY_CEILING=y
struct k_mutex mtx;
k_mutex_init(&mtx);
mtx.ceiling = HIGH_PRIO;
```

FreeRTOS는 PCP를 지원하지 않습니다. *PI만* 제공합니다.

## System Ceiling — Original PCP

`SystemCeiling(t) = max(C(M) for M in locked mutexes at time t)`

`T_new`가 lock을 시도할 때

- `T_new->priority > SystemCeiling`이면 proceed.
- 그 외에는 block.

구현이 복잡합니다. 그래서 Immediate 방식이 훨씬 흔합니다.

## PI vs PCP 비교

| | PIP | Immediate PCP |
| --- | --- | --- |
| Boost 발생 | Conflict 시 | Take 즉시 |
| Priority 사전 결정 | 불필요 | **필수** |
| Deadlock 방지 | ✗ | **✓** |
| Blocking 길이 | bounded (by critical) | bounded (이론 동일) |
| Unnecessary boost | 자주 발생 | 자주 발생 |
| 구현 복잡도 | 중 | 저 |
| 호환성 | 동적 시스템 | 정적 분석 가능 |

## 단점 — Unnecessary Boost

`T_high`가 mutex를 사용하지 않는 시점에도 `T_low`가 *`T_high` level로 boost*되어, `T_med`·`T_low`가 *항상 starved*되고 시스템 throughput이 감소합니다.

PCP는 *worst case 안전*하지만 *best case 낭비*가 심합니다.

## 적용 사례

| RTOS | Default | 옵션 |
| --- | --- | --- |
| FreeRTOS | PI | PCP 없음 |
| Zephyr | PI | CONFIG_PRIORITY_CEILING_PROTOCOL |
| VxWorks | PI or PCP | 양쪽 |
| QNX | PI | PCP |
| RTAI | PI | — |

**대부분의 시스템은 PI를 기본으로** 씁니다. PCP는 *deadlock 회피가 critical*인 환경에서 선택됩니다.

## Immediate PCP 구현 예

```c
typedef struct {
    int locked;
    int ceiling;
    TaskHandle_t owner;
    int owner_orig_prio;
} mutex_pcp_t;

int mutex_pcp_take(mutex_pcp_t *m) {
    taskENTER_CRITICAL();
    if (m->locked) {
        /* 누가 보유 중 — 대기 (priority ≥ ceiling이므로 wait가 없어야 정상) */
        taskEXIT_CRITICAL();
        return ERROR;
    }
    m->locked = 1;
    m->owner = current_task();
    m->owner_orig_prio = current_task()->prio;
    /* Boost */
    current_task()->prio = m->ceiling;
    taskEXIT_CRITICAL();
    return 0;
}

int mutex_pcp_give(mutex_pcp_t *m) {
    taskENTER_CRITICAL();
    if (m->owner != current_task()) {
        taskEXIT_CRITICAL();
        return ERROR;
    }
    /* Restore */
    current_task()->prio = m->owner_orig_prio;
    m->locked = 0;
    m->owner = NULL;
    taskEXIT_CRITICAL();
    return 0;
}
```

## 자주 하는 실수

> ⚠️ Ceiling 계산 실수

`max(이 mutex를 쓰는 task priority)`로 정확히 잡아야 합니다. 빠지면 *PI가 적용되지 않아 inversion이 발생*합니다.

> ⚠️ FreeRTOS에서 PCP를 시도

지원하지 않습니다. PI만 가능합니다.

> ⚠️ 동적 시스템에 PCP 적용

새 task가 *더 높은 priority로 mutex를 사용*하면 ceiling을 재계산해야 합니다. 동적 환경에서는 어렵습니다.

## 정리

- PCP는 **mutex에 정적 ceiling을 두고 take 즉시 boost**합니다.
- **Immediate vs Original** 중 Immediate가 훨씬 흔합니다.
- **Deadlock 방지가 자동**이며 lock order에 무관합니다.
- Priority 사전 결정이 필요해서 동적 시스템에서는 적용이 어렵습니다.
- 채택 사례는 *VxWorks·Zephyr*입니다. FreeRTOS는 PI만 지원합니다.

다음 편은 **Queue 내부 구현**입니다.

## 관련 항목

- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
- [3-07: Queue 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
