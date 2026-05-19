---
title: "3-06: Priority Ceiling Protocol — Immediate vs Original"
date: 2026-05-08T03:00:00
description: "PI의 대안. 각 mutex에 정적 ceiling — take 즉시 boost. Deadlock 방지."
series: "Practical RTOS Internals"
seriesOrder: 27
tags: [priority-ceiling, pcp, deadlock-free]
draft: true
---

## 한 줄 요약

> **"Mutex에 ceiling 정적 부여 → take 즉시 boost"** — PI의 *take-then-conflict* 와 다른 사전 적극적 접근.

## PCP 동작

각 mutex M에 *priority ceiling* C(M) = *이 mutex를 lock할 task 중 최고 priority*.

```text
mutex X: C(X) = 5 (T_high의 priority)
T_low (priority 1) take X 즉시 → T_low priority → 5
T_med (priority 3) ready → 시작 못 함 (T_low의 5 < 3)
T_low가 X release → priority → 1 복원
```

**Take 즉시 boost** — PI는 *conflict 후 boost*.

## Immediate PCP vs Original PCP

| | Immediate | Original |
| --- | --- | --- |
| Boost 시점 | Take 즉시 | Take + conflict 시 |
| 구현 | 단순 | 복잡 (system ceiling 계산) |
| Preemption | 자기 ceiling 위 task만 | 동일 + 다른 mutex ceiling |
| 사용 | VxWorks·일부 RTOS | 학술 |

## Deadlock 방지 증명

```text
T1 holds M1 (ceiling 5) → T1 priority = 5
T1 needs M2 (ceiling 5) — 시도

만약 T2가 M2 보유 → T2 priority ≥ 5 (M2의 ceiling)
T2의 priority가 5 이상이면 T1은 *시작도 못 함* — 모순
→ T2가 M2 보유 못 함
→ M2는 free → T1이 acquire

결론: PCP 사용 시 deadlock 불가능
```

이게 **PCP의 큰 매력** — *lock order 무관*.

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

FreeRTOS는 PCP 미지원 — *PI만*.

## System Ceiling — Original PCP

```text
SystemCeiling(t) = max(C(M) for M in locked mutexes at time t)

T_new가 lock 시도:
  if T_new->priority > SystemCeiling:
    OK — proceed
  else:
    block
```

복잡. Immediate가 더 흔함.

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

```text
T_high가 mutex 사용 안 할 때도 T_low가 *T_high level로 boost*
→ T_med·T_low가 *항상 starved*
→ 시스템 throughput 감소
```

PCP는 *worst case 안전* but *best case 낭비*.

## 적용 사례

| RTOS | Default | 옵션 |
| --- | --- | --- |
| FreeRTOS | PI | PCP 없음 |
| Zephyr | PI | CONFIG_PRIORITY_CEILING_PROTOCOL |
| VxWorks | PI or PCP | 양쪽 |
| QNX | PI | PCP |
| RTAI | PI | — |

**대부분 시스템 = PI**. PCP는 *deadlock 회피가 critical*인 곳.

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
        /* 누가 보유 — 대기 (priority ≥ ceiling이므로 wait 없을 것) */
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

> ⚠️ Ceiling 계산 잘못

`max(이 mutex 쓰는 task priority)` 정확히. 누락 시 *PI가 안 되어 inversion 가능*.

> ⚠️ FreeRTOS에서 PCP 시도

지원 안 함. PI만.

> ⚠️ 동적 시스템에 PCP

새 task가 *높은 priority로 mutex 사용* 시 ceiling 재계산. 동적 어려움.

## 정리

- PCP = **mutex에 정적 ceiling + take 즉시 boost**.
- **Immediate vs Original** — Immediate가 흔함.
- **Deadlock 방지 자동** — lock order 무관.
- Priority 사전 결정 필요 — 동적 시스템 어려움.
- 채택 — *VxWorks·Zephyr*. FreeRTOS는 PI만.

다음 편은 **Queue 내부 구현**.

## 관련 항목

- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
- [3-07: Queue 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
