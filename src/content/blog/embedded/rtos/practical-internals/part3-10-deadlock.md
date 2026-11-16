---
title: "Deadlock 분석 — 4 조건·Wait-for Graph·Lock Ordering·Timeout"
slug: "embedded/rtos/practical-internals/part3-10-deadlock"
date: 2026-05-06T09:31:00
description: "Coffman의 네 조건과 wait-for graph 분석, lock ordering, timeout, hierarchical locking을 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 31
tags: [deadlock, detection, avoidance, lock-ordering]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

Deadlock은 "서로가 쥔 것을 서로 기다리는" 순환입니다. 네 거리 교차로에서 네 대의 차가 각자 오른쪽 차가 빠지기를 기다리며 멈춘 상황과 같습니다. 이 글은 FreeRTOS V11.2.0(commit `0adc196d`)으로 ABBA deadlock을 실제로 만들고, 그 상태를 커널 API로 읽어 wait-for graph를 그린 뒤, lock ordering·timeout rollback·retry가 각각 어떻게 끝나는지 같은 프로그램으로 확인합니다. 실행 환경은 `ARM_CM3` 포트, QEMU 11.1.3 `mps2-an385`, `arm-none-eabi-gcc` 16.2.0, 1 kHz tick입니다.

## Deadlock의 네 조건

| 조건 | 의미 | 어떻게 깰까 |
|---|---|---|
| **Mutual Exclusion** | 자원이 한 task만 보유 | Mutex 대신 lock-free 사용 |
| **Hold and Wait** | 자원 보유 중 다른 자원 요청 | Try-lock 또는 atomic acquire |
| **No Preemption** | 보유 자원을 임의로 강제 회수하지 않음 | 안전한 상태 회수 protocol 검토 |
| **Circular Wait** | A→B→C→A 순환 대기 | **Lock ordering** |

네 조건은 모두 필요 조건이라, 하나라도 성립하지 않게 만들면 deadlock이 생기지 않습니다. 아래 실행에서 lock ordering은 circular wait를, timeout rollback은 hold and wait를 깹니다.

## 전형적 시나리오: 2 Mutex 순환

```c
SemaphoreHandle_t mtx_A, mtx_B;

void task1(void *p) {
    xSemaphoreTake(mtx_A, portMAX_DELAY);
    vTaskDelay(1);   // 짧은 지연
    xSemaphoreTake(mtx_B, portMAX_DELAY);   // ← Task2가 잡고 있으면 deadlock
    /* ... */
}

void task2(void *p) {
    xSemaphoreTake(mtx_B, portMAX_DELAY);
    vTaskDelay(1);
    xSemaphoreTake(mtx_A, portMAX_DELAY);   // ← Task1이 잡고 있으면 deadlock
}
```

Task1은 A를 잡은 채 B를 기다리고, Task2는 B를 잡은 채 A를 기다립니다. `vTaskDelay(1)`이 두 task에게 첫 lock을 잡을 시간을 주므로, 같은 priority에서 이 코드를 QEMU로 세 번 더 돌렸더니 세 번 모두 deadlock에 빠졌습니다. 다만 멈추는 것은 이 두 task뿐입니다. 아래 실행에서 300 tick 뒤에도 tick은 계속 올라가고 priority 5의 제어 task는 정상적으로 돌았습니다. "시스템 정지"가 아니라 "두 task 정지"이기 때문에 watchdog이 시스템 전체를 감시하는 것만으로는 잡히지 않습니다.

## Wait-for Graph

wait-for graph는 "task → 그 task가 기다리는 자원의 holder" 화살표를 모은 그래프입니다. 자원마다 instance가 하나(mutex)라면 이 그래프에 cycle이 있는 것이 곧 deadlock입니다. 그래프를 그리려면 두 정보가 필요합니다. 누가 무엇을 기다리는지, 그리고 그 자원을 누가 쥐고 있는지입니다.

FreeRTOS는 뒤쪽만 줍니다. `xSemaphoreGetMutexHolder()`(`include/semphr.h:1134`)가 holder를 돌려줍니다. 반면 `uxTaskGetSystemState()`가 채우는 `TaskStatus_t`(`include/task.h:160-181`)에는 state·priority·stack 정보는 있어도 "무엇에 block했는지"는 없습니다. 그래서 앞쪽은 application이 기록해야 합니다. 아래 실행은 take 직전에 `waiting_on[id] = mutex`를 기록하고, 제어 task가 300 tick 뒤 두 정보를 합쳐 cycle을 검사한 결과입니다.

```text
[ABBA, portMAX_DELAY]
  T1 state=Blocked
  T2 state=Blocked
  wait-for edge: T1 -> mutex B held by T2
  wait-for edge: T2 -> mutex A held by T1
  cycle T1->T2->T1: YES (deadlock), tick=300
```

| 기다리는 task | 자원 | 보유 task |
| --- | --- | --- |
| T1 | B | T2 |
| T2 | A | T1 |

wait-for graph는 지금 이 순간의 상태라 deadlock이 이미 일어난 뒤에야 cycle이 보입니다. 반대로 "L1을 쥔 채 L2를 잡은 적이 있다"는 획득 이력을 모은 dependency graph는 실제로 막히기 전에 순환 가능성을 보여 줍니다. 뒤에서 볼 Linux lockdep이 이 방식입니다.

## 해결 1: Lock Ordering (가장 흔한 방법)

규칙은 간단합니다. 모든 mutex에 전역 순서를 부여하고, 항상 낮은 순서부터 take합니다.

```c
/* Convention — 알파벳/주소/ID 기준 */
#define MTX_ORDER_A  0
#define MTX_ORDER_B  1
#define MTX_ORDER_C  2

void any_task(void) {
    /* 항상 A → B → C 순서 */
    xSemaphoreTake(mtx_A, ...);
    xSemaphoreTake(mtx_B, ...);
    xSemaphoreTake(mtx_C, ...);
    /* ... */
    xSemaphoreGive(mtx_C);
    xSemaphoreGive(mtx_B);
    xSemaphoreGive(mtx_A);
}
```

같은 프로그램에서 두 task가 모두 A → B 순서로 잡게만 바꿨더니 둘 다 끝났습니다. 순서가 같으면 B를 쥔 채 A를 기다리는 task가 있을 수 없어 cycle이 생기지 않습니다.

```text
[lock ordering A then B]
  T1 done=1 tries=0, T2 done=1 tries=0 (1=ok, -1=gave up after 20)
```

Linux lockdep 문서(`Documentation/locking/lockdep-design.rst:140-154`, v6.12)도 같은 규칙을 검사합니다. 같은 lock class를 두 번 잡지 말 것, 그리고 `L1 -> L2`와 `L2 -> L1` 두 순서가 모두 관찰되면 "lock inversion deadlock"으로 경고한다는 내용입니다.

## 해결 2: Timeout과 Rollback

timeout은 **기다리는 요청**을 실패시키는 것이지 다른 task가 보유한 mutex를 강제로 빼앗는 동작은 아닙니다. 실패한 쪽이 자기가 쥔 lock을 반납해야 hold and wait가 깨지고 상대가 진행할 수 있습니다. timeout이 났다는 사실만으로는 deadlock인지, 상대가 오래 쥐고 있었을 뿐인지 구별되지 않습니다.

다음은 서로 다른 일반 mutex 두 개를 순서대로 획득하며 두 번째 실패 시 첫 번째를 반납하는 예제입니다. callback·ISR용 함수가 아니며 호출자는 성공 후 둘 다 반납해야 합니다.

```c title="take-pair.c"
#include <stdbool.h>
#include "FreeRTOS.h"
#include "semphr.h"
bool take_pair(SemaphoreHandle_t a, SemaphoreHandle_t b,
               TickType_t timeout) {
    if (a == NULL || b == NULL || a == b) return false;
    if (xSemaphoreTake(a, timeout) != pdTRUE) return false;
    if (xSemaphoreTake(b, timeout) != pdTRUE) {
        (void)xSemaphoreGive(a);
        return false;
    }
    return true;
}
```

다른 task가 B를 50 tick 동안 쥐고 있는 동안 `take_pair(A, B, 10)`을 불렀습니다. A는 바로 얻고 B에서 10 tick 기다린 뒤 실패했고, 함수가 돌아온 뒤 A의 holder는 없습니다. rollback이 동작한 것입니다.

```text
[take_pair(A, B, 10) while another task holds B]
  returned 0 after 10 ticks; A holder afterwards=none
```

각 획득에 timeout을 따로 쓰므로, 둘 다 기다리면 최대 `2 × timeout`까지 걸립니다. 전체 deadline을 제한하려면 `xTaskCheckForTimeOut()`으로 남은 시간을 계산해 두 번째 호출에 넘깁니다.

## 해결 3: Try-Lock과 Rollback으로 Hold and Wait 깨기

```c
if (!xSemaphoreTake(mtx_A, 0)) return EBUSY;
if (!xSemaphoreTake(mtx_B, 0)) {
    xSemaphoreGive(mtx_A);
    return EBUSY;
}
/* both acquired — work */
xSemaphoreGive(mtx_B);
xSemaphoreGive(mtx_A);
```

또는 all-or-nothing 패턴으로 작성합니다.

```c
bool try_acquire_all(void) {
    if (!xSemaphoreTake(mtx_A, 0)) return false;
    if (!xSemaphoreTake(mtx_B, 0)) {
        xSemaphoreGive(mtx_A);
        return false;
    }
    return true;
}

/* Retry pattern with backoff */
while (!try_acquire_all()) {
    vTaskDelay(pdMS_TO_TICKS(random_backoff()));
}
```

## 해결 4: Lock 순서 검증

application이 각 lock에 순위를 주고, task마다 지금 쥔 lock 중 가장 높은 순위를 기록해 두는 방법이 있습니다. 새 lock의 순위가 그보다 낮으면 assert로 멈춥니다. 획득에 실패했을 때는 기록을 남기지 않아야 하고, release·recursive take 경로도 같은 기록을 갱신해야 합니다.

Linux lockdep은 이것을 일반화한 도구입니다. `lockdep-design.rst:9-27`에 따르면 검사 단위는 개별 lock이 아니라 "lock class"(예: 모든 inode의 같은 lock)이고, class 사이의 획득 순서(`L1 -> L2`)와 IRQ context 사용 이력을 추적합니다. 문서는 그 순서가 "ever happened"했다는 기록일 뿐이라고 적습니다. 실제 deadlock이 나지 않아도, 서로 다른 시점에 두 순서가 각각 한 번씩만 관찰되면 경고가 나옵니다(`:140-154`). 정수 level wrapper와 달리 순위를 미리 정해 둘 필요가 없습니다.

## Reader-Writer Lock Deadlock

```c
rwlock_t rw;

read_lock(&rw);
/* ... */
write_lock(&rw);   // ✗ Recursive read-then-write
```

write lock은 reader가 모두 나가기를 기다리는데, 그 reader 중 하나가 자기 자신이라 영원히 기다립니다. upgrade를 지원하지 않는 lock이라면 read lock을 놓고 write lock을 잡은 뒤, 그 사이 바뀌었을 수 있는 상태를 다시 읽습니다. 위 코드의 `rwlock_t`·`read_lock()`·`write_lock()`은 Linux 커널 API 이름이고, FreeRTOS V11.2.0에는 reader-writer lock이 없습니다. 이 예는 실행하지 않았습니다.

## Priority Inversion과의 구분

L이 mutex를 쥔 채 M에게 밀리고, H는 그 mutex를 기다립니다. M이 mutex와 무관하게 CPU를 쓰는 동안 H는 기한 없이 기다립니다. wait-for graph에는 H → L 화살표 하나뿐이고 cycle이 없으므로 deadlock은 아닙니다. M이 끝나면 풀리기 때문입니다. 그래도 H 입장에서는 상한이 없다는 점이 같고, 해법은 priority inheritance입니다. 3-06의 QEMU 실행에서 PI가 켜진 mutex로 같은 L·M·H 배치를 돌린 결과를 볼 수 있습니다.

## 검출 도구

### FreeRTOS Trace와 Task Snapshot

앞의 wait-for graph 절에서 본 대로 `TaskStatus_t`는 `Blocked`까지만 알려 주고 무엇을 기다리는지는 알려 주지 않습니다. 그래서 `uxTaskGetSystemState()`, `xSemaphoreGetMutexHolder()`, application의 `waiting_on` 기록 세 가지를 합쳐야 cycle을 판정할 수 있습니다. 위 실행이 그 최소 구성입니다. `uxTaskGetSystemState()`는 `configUSE_TRACE_FACILITY 1`이 필요하고, `xSemaphoreGetMutexHolder()`는 `INCLUDE_xSemaphoreGetMutexHolder 1`이 필요합니다(`semphr.h:1146`).

deadlock 중에도 tick과 다른 task는 돕니다(실행 결과의 `tick=300`). 그래서 이 검사는 deadlock에 빠지지 않는 높은 priority task에서 주기적으로 돌립니다.

### Runtime Watchdog

watchdog은 기대한 진행 신호가 사라졌을 때 대응하는 장치이고, deadlock만 골라내는 검출기는 아닙니다. 앞의 실행처럼 두 task만 멈추고 나머지는 돌기 때문에, 하드웨어 watchdog을 idle task나 한 task에서만 걷어차면 deadlock을 놓칩니다. 감시할 task마다 heartbeat를 받아, 모든 task가 기한 안에 보고했을 때만 watchdog을 걷어차는 감시 task를 둡니다.

## Livelock: Deadlock의 사촌

```c
while (try_take_all() == false) {
    release_all();
    vTaskDelay(1);   // 양보
}
```

Task A와 Task B가 매번 같은 순간에 release하고 같은 순간에 retry하면 둘 다 계속 실패합니다. 이것이 livelock입니다. 다만 단일 코어에서는 "같은 순간"이 쉽게 만들어지지 않습니다. 앞의 ABBA 코드를 10 tick timeout과 rollback, 그리고 1 tick 고정 지연 또는 1~10 tick 난수 지연으로 바꿔 20회 한도로 돌렸습니다.

```text
[retry with fixed 1-tick delay]
  T1 done=1 tries=2, T2 done=1 tries=1 (1=ok, -1=gave up after 20)
[retry with random 1..10 tick backoff]
  T1 done=1 tries=2, T2 done=1 tries=1 (1=ok, -1=gave up after 20)
```

두 경우 모두 T1이 두 번째 시도에서 끝났습니다. 한 task가 timeout으로 먼저 깨어나 rollback하는 사이 상대가 두 lock을 다 잡았기 때문입니다. 이 실행에서는 고정 지연도 livelock에 빠지지 않았지만, 그건 이 tick 배치에서의 결과일 뿐입니다. 진행을 장담할 근거가 아니므로 retry에는 한도(`tries >= 20`이면 포기)와 포기했을 때의 복구 경로를 둡니다.

```c
vTaskDelay(pdMS_TO_TICKS(rand() % 10));
```

## 자주 하는 실수

> ⚠️ `portMAX_DELAY`를 남용하는 경우

```c
xSemaphoreTake(mtx, portMAX_DELAY);   // ✗ deadlock 감지 불가
```

첫 실행의 T1·T2가 이 상태로 300 tick 동안 멈춰 있었고, 스스로는 아무 신호도 내지 않았습니다. 일감을 기다리는 event wait라면 무한 대기가 맞지만, mutex처럼 "곧 풀려야 하는" 자원은 유한 timeout을 주고 실패를 로그로 남겨야 deadlock이 보입니다.

> ⚠️ Recursive lock을 잘못 사용하는 경우

```c
xSemaphoreTake(mtx, ...);
/* ... */
xSemaphoreTake(mtx, ...);   // ✗ Self-deadlock (mutex 아닌 binary semaphore)
```

주석과 달리 이 실수는 binary semaphore만의 문제가 아닙니다. 일반 mutex도 같은 task가 두 번 잡으면 자기 자신을 기다립니다. 5 tick timeout으로 세 종류를 각각 두 번씩 take한 결과입니다.

```text
[self-deadlock checks, timeout 5 ticks]
  binary sem take #1=1 take #2=0
  mutex take #1=1 take #2 by same task=0
  recursive take #1=1 take #2=1
```

`portMAX_DELAY`였다면 앞의 두 경우는 영원히 멈췄습니다. 같은 task가 두 번 잡아야 하면 `xSemaphoreCreateRecursiveMutex()`와 `xSemaphoreTakeRecursive()`를 씁니다.

> ⚠️ ISR과 task가 lock을 공유하는 경우

```c
xSemaphoreTake(mtx, ...);
some_isr_disable_func();
/* ISR 발생 → 같은 mtx 시도 → ✗ */
```

`semphr.h:703`은 "Mutex type semaphores cannot be used from within interrupt service routines"라고 적습니다. ISR은 block할 수 없으므로 task가 쥔 mutex를 기다릴 방법도 없습니다. ISR과 task 사이에는 queue, event group, binary semaphore의 FromISR API를 씁니다(3-09).

> ⚠️ Lock 보유 중 long-blocking API를 호출하는 경우

```c
xSemaphoreTake(mtx_A, ...);
xQueueReceive(q, &item, portMAX_DELAY);   // ✗ mtx_A 보유 중 무한 대기
```

queue에 값을 넣어 줄 task가 `mtx_A`를 필요로 한다면 ABBA와 같은 cycle이 됩니다. mutex와 queue가 wait-for graph에서 같은 화살표가 되기 때문입니다. lock은 queue 대기 전에 놓고, 받은 뒤 다시 잡아 상태를 재검사합니다.

## 정리

- deadlock의 네 조건은 모두 필요 조건이라 하나만 깨도 됩니다. lock ordering은 circular wait를, rollback은 hold and wait를 깹니다.
- ABBA는 QEMU에서 네 번 돌려 네 번 모두 재현됐고, 멈춘 것은 두 task뿐이라 tick과 다른 task는 계속 돌았습니다.
- FreeRTOS에서 wait-for graph는 `xSemaphoreGetMutexHolder()`와 application의 대기 기록을 합쳐야 그릴 수 있습니다.
- 같은 순서로 바꾸자 두 task 모두 끝났고, `take_pair()`는 실패 시 첫 lock을 반납했습니다.
- 일반 mutex도 같은 task가 두 번 잡으면 self-deadlock입니다. recursive mutex만 통과합니다.
- Linux lockdep은 lock class 단위 획득 순서 이력으로, 실제로 막히기 전에 역순을 경고합니다.

다음 [3-11 Stream/Message Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)를 거쳐 Part 4의 memory management로 이어집니다.

## 근거 자료

- [Linux v6.12 lockdep-design.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/locking/lockdep-design.rst): class·dependency·IRQ 규칙과 검증 가정.
- [FreeRTOS V11.2.0 task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h), [semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): snapshot 필드·mutex 획득 계약.

## 관련 항목

- [3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
