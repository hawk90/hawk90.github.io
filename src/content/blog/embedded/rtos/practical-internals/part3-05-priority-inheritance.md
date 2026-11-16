---
title: "Priority Inheritance 구현 — Inherit·Disinherit·Chain"
slug: "embedded/rtos/practical-internals/part3-05-priority-inheritance"
date: 2026-05-06T09:26:00
description: "FreeRTOS V11.2.0의 xTaskPriorityInherit·xTaskPriorityDisinherit와 timeout 복원 경로를 따라가고, 다중 mutex와 chain 전파의 제한을 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 26
tags: [priority-inheritance, pi, inherit, disinherit]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

FreeRTOS **V11.2.0**의 PI는 "지금 막 block하려는 task의 priority를 holder 한 명에게 넘긴다"는 규칙 하나로 동작합니다. 복원은 holder가 쥔 mutex 수(`uxMutexesHeld`)가 0이 될 때 한 번에 일어나고, chain은 순서에 따라 전파되기도 하고 안 되기도 합니다. 이 글은 `tasks.c`·`queue.c`의 해당 줄을 따라가고, 같은 커널을 QEMU에서 돌려 여덟 가지 시나리오(1~7, 2b)의 priority 값을 직접 찍어 봅니다.

## 실험 환경

코드를 읽기 전에 결과부터 보겠습니다. 아래 수치는 모두 다음 환경에서 직접 돌린 출력입니다.

- 커널: FreeRTOS-Kernel `V11.2.0` 태그(commit `0adc196d`), `portable/GCC/ARM_CM3` 포트, `heap_4.c`
- 툴체인: `arm-none-eabi-gcc` 16.2.0, `-mcpu=cortex-m3 -O1`
- 보드: QEMU 11.1.3 `-M mps2-an385`(Cortex-M3), 출력은 semihosting
- 설정: `configMAX_PRIORITIES 8`, `configUSE_MUTEXES 1`, `configTICK_RATE_HZ 1000`

priority 6의 제어 task가 holder와 waiter를 만들고, `vTaskDelay(5)`로 낮은 task들이 돌 시간을 준 뒤 `uxTaskPriorityGet()`(현재 priority)과 `uxTaskBasePriorityGet()`(base priority)을 찍습니다. 이 실험은 priority 값과 실행 순서만 봅니다. 시간은 재지 않았습니다.

```bash
qemu-system-arm -M mps2-an385 -nographic \
  -semihosting-config enable=on,target=native -kernel build/pi.elf
```

## TCB의 PI Field

PI에 쓰이는 필드는 세 개입니다. V11.2.0 `tasks.c`에서 그대로 옮기면 다음과 같습니다.

```c
/* tasks.c:388 */
UBaseType_t uxPriority;      /**< The priority of the task.  0 is the lowest priority. */
/* tasks.c:413-416 */
#if ( configUSE_MUTEXES == 1 )
    UBaseType_t uxBasePriority; /**< The priority last assigned to the task - used by the priority inheritance mechanism. */
    UBaseType_t uxMutexesHeld;
#endif
```

`uxPriority`는 스케줄러가 실제로 쓰는 값이고, `uxBasePriority`는 "마지막으로 지정된" priority입니다. 주석이 말하듯 base는 불변 상수가 아니어서 `vTaskPrioritySet()`이 바꿀 수 있습니다(아래 시나리오 7). `uxMutexesHeld`는 mutex를 take할 때마다 `pvTaskIncrementMutexHeldCount()`가 올리고(`tasks.c:7678`), give할 때 `xTaskPriorityDisinherit()`가 내립니다.

비유하자면 base priority는 사원증에 적힌 직급이고, current priority는 오늘 하루 임원 회의에 대리 참석하느라 받은 임시 출입증입니다. 출입증은 회의(mutex)가 모두 끝나야 반납합니다.

## Inherit — Boost

호출 지점은 `queue.c`의 `xQueueSemaphoreTake()`입니다. 순서가 중요합니다.

1. count가 0이고 `xTicksToWait == 0`이면 바로 `errQUEUE_EMPTY`를 반환합니다(`queue.c:1741-1751`). 이 경로에는 상속이 없습니다.
2. 기다릴 시간이 남아 있으면 `xTaskCheckForTimeOut()`(`queue.c:1775`)을 통과한 뒤, mutex일 때만 critical section 안에서 `xTaskPriorityInherit()`를 부릅니다(`queue.c:1791`).

`xTaskPriorityInherit()`(`tasks.c:6639`) 안의 판단은 다음 표와 같습니다.

| 조건 (소스 위치) | 처리 |
| --- | --- |
| holder가 `NULL` (`tasks.c:6646-6648`) | ISR이 take한 경우입니다. 상속하지 않습니다 |
| holder `uxPriority` < 호출 task `uxPriority` (`tasks.c:6653`) | holder의 `uxPriority`를 호출 task 값으로 올리고 `pdTRUE` 반환 |
| 그중 holder가 ready list에 있음 | 옛 ready list에서 `uxListRemove()` 후 새 priority로 `prvAddTaskToReadyList()` |
| 그중 holder가 blocked·suspended (`tasks.c:6699`) | `uxPriority`만 바꿉니다. 상태 list는 건드리지 않습니다 |
| holder 현재 값이 이미 높지만 base는 낮음 (`tasks.c:6710`) | 값은 그대로 두고 "이미 상속 중"이라는 뜻으로 `pdTRUE` 반환 |

blocked holder를 ready로 옮기지 않는다는 점이 시나리오 3·4의 결과를 설명합니다. holder의 event list item 값도 `configMAX_PRIORITIES - 새 priority`로 다시 씁니다. 다만 그 값이 다른 용도(`taskEVENT_LIST_ITEM_VALUE_IN_USE`)로 쓰이는 중이면 건드리지 않습니다.

시나리오 1은 가장 단순한 경우입니다. L(1)이 A를 쥐고 H(4)가 A에 block합니다.

```text
[1] single mutex: L(1) holds A, H(4) blocks on A
  before H blocks              L cur=1 base=1
  after H blocks on A          L cur=4 base=1
  H take -> got it
  L gave mutex #0 -> cur=1
```

H가 block하는 순간 L의 current priority가 4가 되고, give 직후 1로 돌아옵니다. `H take -> got it`이 L의 출력보다 먼저 찍힌 것은, L이 give 안에서 1로 내려가자마자 priority 4의 H가 선점했기 때문입니다.

## Disinherit — 복원

일반 give 경로는 `queue.c:2411`에서 `xTaskPriorityDisinherit()`(`tasks.c:6742`)를 부릅니다. 이 함수는 holder가 현재 task인지 assert하고, `uxMutexesHeld`를 1 줄인 다음, `uxPriority != uxBasePriority`이고 **`uxMutexesHeld == 0`일 때만**(`tasks.c:6764`) base로 되돌립니다. 남은 mutex의 waiter 중 최고 priority를 다시 계산하지 않습니다.

반환값 `pdTRUE`에 붙은 주석이 이 단순화를 그대로 인정합니다. 여러 mutex를 take 순서와 다르게 give하면 첫 give에서는 context switch가 일어나지 않을 수 있고, 마지막 give에서는 waiter 유무와 상관없이 switch해야 한다는 내용입니다. recursive mutex는 `xSemaphoreGiveRecursive()`가 마지막 give에서만 이 경로로 들어갑니다.

![Priority inheritance timeline](/images/blog/rtos/diagrams/part3-05-priority-inheritance.svg)

## Multi-Mutex 시나리오

L(1)이 A·B를 모두 쥔 상태에서 W4(4)가 A에, W5(5)가 B에 block합니다. 그다음 L이 A부터 놓습니다.

```text
[2] two mutexes, out of order: L(1) holds A,B; W4 on A; W5 on B; L gives A then B
  after W4 blocks on A         L cur=4 base=1
  after W5 blocks on B         L cur=5 base=1
  L gave mutex #0 -> cur=5
  W4 take -> got it
  W5 take -> got it
  L gave mutex #1 -> cur=1
```

W5가 block할 때 L은 이미 4였지만, 4 < 5이므로 `tasks.c:6653` 조건이 참이 되어 5로 다시 올라갑니다. "이미 상속했으면 그대로"라는 규칙은 없습니다.

A를 놓은 뒤에도 L은 5에 머뭅니다. 이 시점에서 L을 5로 만든 원인(B의 W5)은 아직 남아 있으니 결과는 맞습니다. W4의 출력이 L의 첫 출력 뒤에 나온 것도 같은 이유입니다. L이 5로 남아 있어서 A를 받은 W4(4)가 바로 선점하지 못했습니다.

순서를 바꿔 B를 먼저 놓으면 결과가 달라집니다.

```text
[2b] two mutexes, B first: L(1) holds A,B; W4 on A; W5 on B; L gives B then A
  after W5 blocks on B         L cur=5 base=1
  L gave mutex #0 -> cur=5
  W5 take -> got it
  after B given (only W4 on A) L cur=5 base=1
  W4 take -> got it
  L gave mutex #1 -> cur=1
```

B를 넘겨받은 W5가 일을 마치고 떠난 뒤에도 L은 5입니다. A에는 W4(4)만 남았으니 필요한 값은 4인데, `uxMutexesHeld`가 1이라 복원 조건이 거짓입니다. 이 구현의 오차는 필요한 값보다 **높게** 남는 방향입니다. give 경로는 0개일 때만, timeout 경로는 1개일 때만 값을 내리기 때문입니다.

## Chained Inheritance

V11.2.0 소스 어디에도 `xTaskCheckForChainedInheritance`라는 함수는 없습니다(`grep -rn` 결과 0건). 상속은 "현재 task → 그 mutex의 holder" 한 단계로 끝나고, holder가 또 다른 mutex를 기다리고 있어도 그 너머로 재귀하지 않습니다. 실제로 그런지 두 가지 순서로 확인했습니다.

먼저 M이 먼저 block하고 H가 나중에 block하는 순서입니다.

```text
[3] chain, order 1: L(1) holds X; M(2) holds Y then blocks on X; H(5) blocks on Y
  M blocked on X               L cur=2 base=1
  H blocked on Y (M)           M cur=5 base=2
  H blocked on Y (L)           L cur=2 base=1
  H take -> got it
  L gave mutex #0 -> cur=1
```

H(5)가 Y에 block하면서 M은 5가 되지만, M이 기다리는 X의 holder L은 2에 머뭅니다. M은 blocked 상태라 `tasks.c:6699`의 "Just inherit" 분기만 타고, 그 아래 L에게 다시 넘기는 코드가 없습니다. chain 하나 건너로는 inversion이 그대로 남습니다. 같은 배치에 priority 3의 busy task C를 더하고 L에게 X를 놓으라고 알렸습니다.

```text
[chain order 1 + load] L(1) holds X; M(2) holds Y, blocks on X; H(5) blocks on Y; C(3) busy; then L is told to release
  t= 8 L prio=2, M prio=5
  t= 8 C(3) starts 20-tick busy loop
  t=28 C done
  t=28 L releases X (prio 2)
  t=28 H got Y
```

L은 priority 2라서 C(3)가 20 tick 동안 도는 내내 X를 놓지 못했고, H(5)는 C가 끝난 t=28에야 Y를 얻었습니다. H보다 낮은 C가 H를 20 tick 막은 셈입니다.

다음은 H가 먼저 block하고 M이 나중에 block하는 순서입니다.

```text
[4] chain, order 2: L(1) holds X; M(2) holds Y; H(5) blocks on Y first; then M blocks on X
  H blocked on Y (M)           M cur=5 base=2
  M blocked on X (L)           L cur=5 base=1
  H take -> got it
  L gave mutex #0 -> cur=1
```

M이 이미 5로 올라간 상태에서 X에 block하므로 `xTaskPriorityInherit()`는 M의 현재 값 5를 L에게 넘깁니다. 결과적으로 같은 세 task, 같은 두 mutex라도 **block 순서에 따라 L이 2가 되기도 하고 5가 되기도 합니다.** 중첩 lock을 쓰는 설계라면 이 차이를 분석에 넣어야 합니다.

## Disinherit After Timeout

waiter가 기다리다 timeout되면 `queue.c:1850-1859`가 남은 waiter 중 최고 priority(`prvGetHighestPriorityOfWaitToReceiveList()`, `queue.c:2368`)를 구해 `vTaskPriorityDisinheritAfterTimeout()`(`tasks.c:6836`)에 넘깁니다. 이 함수는 base와 그 값 중 큰 쪽을 목표로 잡되, **holder가 mutex를 정확히 하나만 쥐고 있을 때만**(`tasks.c:6871`) 값을 바꿉니다. 소스 주석은 이것을 "a simplification in the priority inheritance implementation"이라고 부르고, 다른 mutex가 상속의 원인일 수 있어서라고 이유를 적어 둡니다.

```text
[5] timeout, holder has 1 mutex: L(1) holds A; H(4) waits 20 ticks
  H waiting                    L cur=4 base=1
  H take -> timeout
  after H timed out            L cur=1 base=1
  L gave mutex #0 -> cur=1
[6] timeout, holder has 2 mutexes: L(1) holds A,B; H(4) waits 20 ticks on A
  H waiting                    L cur=4 base=1
  H take -> timeout
  after H timed out            L cur=4 base=1
  L gave mutex #0 -> cur=4
  L gave mutex #1 -> cur=1
```

시나리오 6에서 B에는 아무도 기다리지 않는데도 L은 timeout 뒤 4를 유지하고, 두 mutex를 다 놓은 뒤에야 1로 내려옵니다. 기다리던 task가 이미 포기했는데 holder가 여전히 높은 priority로 도는 셈이라, 그 사이 priority 2·3 task가 불필요하게 밀립니다.

## Time Slicing과 Boost 상호작용

`prvAddTaskToReadyList()`는 `listINSERT_END()`로 ready list의 **끝**에 붙입니다(`tasks.c:284-288`). 그래서 상속으로 priority 4가 된 holder는 원래 priority 4인 다른 ready task들 뒤에 줄을 섭니다. 같은 priority의 task끼리는 `configUSE_TIME_SLICING 1`에서 tick마다 돌아가며 실행되므로(3-06의 immediate ceiling 실행에서 같은 priority 4의 H가 한 tick 늦게 돈 것이 그 예입니다), 상속 직후 holder가 곧바로 CPU를 받는다고 가정할 수 없습니다. 이 순서 효과를 holder 상속 상황에서 따로 돌려 보지는 않았습니다.

## Implementation Overhead

이 글에서는 사이클을 재지 않았습니다. 이 커널을 올린 실보드가 없고, QEMU에서 잰 시간은 Cortex-M3 실리콘의 시간이 아닙니다. 그래서 예전 판의 "50 cycle" 같은 값은 지웠습니다.

소스로 확인되는 작업량은 다음과 같습니다. 상속 한 번은 `taskENTER_CRITICAL()` 안에서 holder 하나에 대해 비교 몇 번, `uxListRemove()` 한 번, `prvAddTaskToReadyList()` 한 번을 합니다(`tasks.c:6653-6697`). 루프나 재귀가 없으므로 chain 길이와 무관한 상수 작업입니다. 그 대가가 시나리오 3의 전파 누락입니다.

## Zephyr — k_mutex의 PI

Zephyr v3.7.0(commit `36940db9`)의 mutex 문서(`doc/kernel/services/synchronization/mutexes.rst:62-89`)는 동작을 이렇게 설명합니다. holder의 base priority를 lock 시점에 **mutex 안에** 저장해 두고, 해제나 waiter timeout 때 그 값으로 되돌립니다. 이 방식은 mutex가 하나일 때는 잘 동작하지만, 여러 mutex를 priority가 올라간 순서의 역순으로 풀지 않으면 "sub-optimal behavior"가 생긴다고 문서가 직접 적습니다. 그래서 서로 다른 priority의 thread가 여러 mutex를 공유하면 한 번에 하나만 잠그라고 권합니다.

FreeRTOS가 task마다 `uxMutexesHeld` 카운터 하나를 두는 것과 달리, Zephyr는 mutex마다 `owner_orig_prio`를 둡니다(선언 `include/zephyr/kernel.h:2927`, lock 때 저장 `kernel/mutex.c:119`, unlock 때 복원 `:254`). 두 커널 모두 다중 mutex에서 완전한 복원을 하지 않지만, 틀리는 방향이 다릅니다.

`CONFIG_PRIORITY_CEILING`은 PCP를 켜는 옵션이 아닙니다. `kernel/Kconfig:83-89`에서 이 옵션은 int이고, help 문구는 "k_mutex priority inheritance로 thread가 얻을 수 있는 최소 priority 값(논리적으로 가장 높은 priority)"이라고 정의합니다. Kconfig의 기본값은 `-127`입니다. 같은 태그의 문서 note(`mutexes.rst:74-76`)는 "기본값 0이 무제한 상승을 허용한다"고 적어 두어, 문서와 Kconfig가 기본값에서 서로 어긋납니다. 이 값은 `kernel/mutex.c:82`의 `new_prio_for_inheritance()`가 상속 priority를 자를 때 씁니다.

## Linux PREEMPT_RT rtmutex

Linux v6.12의 `Documentation/locking/rt-mutex-design.rst`는 FreeRTOS와 반대 선택을 설명합니다. 각 rt_mutex는 waiter를 priority 순 rbtree에 두고(`rt-mutex-design.rst:200`), 각 task는 자기가 가진 mutex들의 top waiter만 모은 `pi_waiters` rbtree를 가집니다(`:208-219`). `rt_mutex_adjust_prio()`는 이 트리의 top waiter와 task 자신의 normal priority를 비교해 높은 쪽을 씁니다(`:356-362`). 문서는 같은 함수가 higher priority waiter가 timeout이나 signal로 떠날 때 priority를 내린다고도 적습니다(`:370-378`). 설계상 시나리오 2b·6 같은 과잉 boost가 남지 않는 구조입니다.

chain은 `rt_mutex_adjust_prio_chain()`(`kernel/locking/rtmutex.c:675`)이 따라 올라갑니다. 시나리오 3처럼 owner가 다른 lock에 block해 있으면 그 owner의 owner까지 priority를 전파합니다. 대신 한 번의 walk는 `max_lock_depth`(기본 1024, `kernel/locking/rtmutex_api.c:14`) 단계에서 멈추고, 넘으면 "Maximum lock depth %d reached" 경고를 한 번 찍습니다(`rtmutex.c:701-713`).

user space의 PI futex도 같은 기계를 씁니다. `Documentation/locking/pi-futex.rst:108-111`에 따르면 unlock fastpath가 실패하면 `FUTEX_UNLOCK_PI`가 커널에 들어가 `pi_state->rt_mutex`를 풀고 waiter를 깨웁니다. `PTHREAD_PRIO_INHERIT` mutex는 결국 rtmutex의 PI를 그대로 받습니다. 이 글에서 Linux 쪽은 실행하지 않았고, 위 내용은 v6.12 소스와 문서에서 확인한 것입니다.

## 자주 하는 실수

> ⚠️ Inherit 중 `vTaskPrioritySet()`의 효과를 오해

`vTaskPrioritySet()`은 base를 항상 바꾸지만(`tasks.c:2916`), current는 상속 중이 아니거나 새 값이 현재 값보다 클 때만 바꿉니다(`tasks.c:2906`). 시나리오 7이 그 결과입니다.

```text
[7] vTaskPrioritySet on a boosted holder: L(1) holds A, H(4) blocks, set L to 2
  boosted                      L cur=4 base=1
  after vTaskPrioritySet(L,2)  L cur=4 base=2
  H take -> got it
  L gave mutex #0 -> cur=2
```

boost를 풀려고 priority를 낮춰도 current는 4로 남고, give 뒤에 새 base 2로 내려옵니다. TCB 필드를 직접 쓰지 말고 API를 쓰면 이 일관성이 지켜집니다.

> ⚠️ 중첩 lock에서 chain 전파를 기대

시나리오 3처럼 FreeRTOS는 한 단계만 상속합니다. 중첩이 필요하면 lock 순서를 고정하고, 바깥 lock을 잡은 채 안쪽 lock에서 오래 기다리지 않게 설계합니다.

> ⚠️ ISR에서 mutex 사용

`semphr.h:703`은 "Mutex type semaphores cannot be used from within interrupt service routines"라고 못 박습니다. holder가 ISR이면 `NULL`로 기록되어 상속 자체가 일어나지 않습니다(`tasks.c:6646-6648`). ISR에서 task를 깨우는 용도라면 같은 주석(`semphr.h:705-708`)이 안내하듯 binary semaphore를 씁니다.

## 정리

- 실제 함수는 `xTaskPriorityInherit`·`xTaskPriorityDisinherit`·`vTaskPriorityDisinheritAfterTimeout` 세 개입니다. 상속은 block 직전, timeout 0이 아닐 때만 일어납니다.
- blocked holder는 priority만 바뀌고 ready로 옮겨지지 않습니다.
- 복원은 `uxMutexesHeld == 0`(give)이나 `== 1`(timeout)일 때만 일어나서, 여러 mutex를 쥐면 필요 이상으로 높게 남습니다(시나리오 2b·6).
- chain은 block 순서에 따라 전파되거나(시나리오 4) 안 됩니다(시나리오 3).
- Linux rtmutex는 `pi_waiters` 트리와 chain walk로 이 두 제한을 풀고, 대신 `max_lock_depth`로 walk 길이를 제한합니다.

다음 [3-06](/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling)에서 ceiling protocol의 정의와 지원 옵션을 구분합니다.

## 근거 자료

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c), [semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): 본문의 줄 번호는 모두 이 태그 기준입니다.
- [Zephyr v3.7.0 mutex 문서](https://docs.zephyrproject.org/3.7.0/kernel/services/synchronization/mutexes.html), [kernel/Kconfig](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/Kconfig), [kernel/mutex.c](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/mutex.c).
- [Linux v6.12 rt-mutex-design.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/locking/rt-mutex-design.rst), [pi-futex.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/locking/pi-futex.rst), [kernel/locking/rtmutex.c](https://github.com/torvalds/linux/blob/v6.12/kernel/locking/rtmutex.c).

## 관련 항목

- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-06: Priority Ceiling Protocol](/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling)
