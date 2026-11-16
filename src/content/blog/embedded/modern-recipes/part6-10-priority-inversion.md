---
title: "Priority Inversion 진단·예방 — Mars Pathfinder Lesson 추적"
slug: "embedded/modern-recipes/part6-10-priority-inversion"
date: 2026-04-15T09:09:00
description: "Priority Inversion 발생 시나리오. Mars Pathfinder 사례. PI mutex, Priority Ceiling."
series: "Modern Embedded Recipes"
seriesOrder: 72
tags: [recipes, priority-inversion, mars-pathfinder, pi, mutex]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Priority inversion은 High가 Low의 lock을 기다리는 동안, lock과 무관한 Medium이 Low를 밀어내 High가 Medium만큼 더 기다리는 상황입니다."** FreeRTOS mutex는 Low의 우선순위를 High로 올려 Medium의 끼어들기를 막습니다.

이 글은 현장에서 inversion을 알아보고 막는 쪽에 집중합니다. Mars Pathfinder의 경과, priority ceiling protocol의 정의와 증명, chained inheritance는 [PRTOS 3-04](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)가 1차 자료(Reeves, DDJ 1999; Sha·Rajkumar·Lehoczky, IEEE Trans. Computers 1990)로 다룹니다. 실행 환경은 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)과 같습니다(FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385` `-icount shift=5`).

## 시나리오

![Priority inversion timeline — High가 Low의 mutex를 기다리는 동안 Medium에 막힘](/images/blog/modern-recipes/diagrams/part2-03-priority-inversion.svg)

| 시점 | 일어나는 일 |
|---|---|
| 1 | L(낮음)이 mutex를 잡고 일을 시작 |
| 2 | H(높음)가 깨어나 같은 mutex를 청하고 block |
| 3 | M(중간)이 깨어나 L을 밀어내고 실행 |
| 4 | M이 끝날 때까지 L은 돌지 못하고, 그동안 H도 기다림 |

M은 mutex와 아무 관계가 없는데 H를 기다리게 합니다. [6-05](/blog/embedded/modern-recipes/part6-05-mutex-usage)의 측정에서 binary semaphore로는 H가 68 tick(M의 50 tick 포함), mutex로는 18 tick을 기다렸습니다.

Mars Pathfinder(1997)의 반복 reset도 이 구조였습니다. PRTOS 1-03이 Reeves의 원문과 Jones의 정리로 옮긴 대로, 높은 우선순위의 bus management task가 낮은 우선순위의 meteorological data task가 쥔 mutex를 기다리는 동안 중간 우선순위의 communications task가 돌았고, watchdog이 이를 잡아 시스템을 reset했습니다. 수정은 VxWorks mutex 생성 인자의 priority inheritance 옵션을 켜는 것이었습니다.

## 해결 1: Priority inheritance

FreeRTOS에서 `configUSE_MUTEXES`가 1이면 `xSemaphoreCreateMutex()`로 만든 mutex에 priority inheritance가 걸립니다. H가 block하는 순간 `tasks.c`의 `xTaskPriorityInherit()`이 holder의 우선순위를 H의 우선순위로 올리고, holder가 mutex를 놓을 때 `xTaskPriorityDisinherit()`이 원래 값으로 되돌립니다. 두 함수에는 `traceTASK_PRIORITY_INHERIT()`·`traceTASK_PRIORITY_DISINHERIT()` hook이 있어 이 순간을 기록할 수 있습니다.

### 측정 — 상속이 일어나는 순간 보기

```c
/* pitrace.h: EXTRA_CONFIG recording priority inheritance events */
extern volatile unsigned pi_events, pi_last_prio, pi_restore_prio;
#define traceTASK_PRIORITY_INHERIT( pxTCB, uxPrio )    do { pi_events++; pi_last_prio = (uxPrio); } while (0)
#define traceTASK_PRIORITY_DISINHERIT( pxTCB, uxPrio ) do { pi_restore_prio = (uxPrio); } while (0)
```

```c
/* pitrace.c: watch priority inheritance happen.
   L (prio 1) holds a mutex for 20 ticks of work; H (prio 5) waits for it
   from tick 2; a prio-6 observer reads L's priority at tick 5. */
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
extern void pr(const char *, ...); extern void hosted_exit(int);
volatile unsigned pi_events, pi_last_prio, pi_restore_prio;

static SemaphoreHandle_t m;
static TaskHandle_t hl;
static void spin(TickType_t n) {
    TickType_t done = 0, last = xTaskGetTickCount();
    while (done < n) { TickType_t now = xTaskGetTickCount(); if (now != last) { done++; last = now; } }
}
static void low(void *a) { (void)a;
    xSemaphoreTake(m, portMAX_DELAY);
    spin(20);
    xSemaphoreGive(m);
    pr("L after give: priority %u, restored to %u\n", (unsigned)uxTaskPriorityGet(NULL), pi_restore_prio);
    hosted_exit(0);
}
static void high(void *a) { (void)a;
    vTaskDelay(2);
    xSemaphoreTake(m, portMAX_DELAY);
    pr("H got the mutex at tick %u\n", (unsigned)xTaskGetTickCount());
    xSemaphoreGive(m);
    vTaskDelete(NULL);
}
static void observer(void *a) { (void)a;
    vTaskDelay(5);
    pr("tick 5: L priority %u (base 1), inherit events %u, inherited %u\n",
       (unsigned)uxTaskPriorityGet(hl), pi_events, pi_last_prio);
    vTaskDelete(NULL);
}
int main(void) {
    m = xSemaphoreCreateMutex();
    xTaskCreate(low, "L", 256, NULL, 1, &hl);
    xTaskCreate(high, "H", 256, NULL, 5, NULL);
    xTaskCreate(observer, "O", 256, NULL, 6, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```bash
./build.sh pitrace.c -I. -DEXTRA_CONFIG='"pitrace.h"' && qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel pitrace.elf
```

```text
tick 5: L priority 5 (base 1), inherit events 1, inherited 5
H got the mutex at tick 20
L after give: priority 1, restored to 1
```

H가 tick 2에 block한 뒤 tick 5에 읽은 L의 우선순위는 5였고, 상속 hook은 한 번 불렸습니다. L이 남은 일을 끝내고 tick 20에 mutex를 놓자 H가 받았고, L의 우선순위는 1로 돌아왔습니다. 현장에서는 같은 hook에 시각과 holder 이름을 남기면, 어느 mutex가 언제 얼마나 우선순위를 올렸는지 trace로 볼 수 있습니다.

POSIX 환경(예: Linux)에서는 mutex attribute로 같은 동작을 고릅니다.

```c
pthread_mutexattr_t attr;
pthread_mutexattr_init(&attr);
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);
pthread_mutex_init(&mtx, &attr);
```

POSIX의 `pthread_mutexattr_setprotocol()` 정의는 `PTHREAD_PRIO_INHERIT`에서 mutex를 쥔 thread가 그 mutex를 기다리는 thread 중 가장 높은 우선순위로 실행된다고 정합니다.

## 해결 2: Priority ceiling

각 mutex에 "그 mutex를 쓸 수 있는 task 중 가장 높은 우선순위"를 ceiling으로 미리 정하고, 그 ceiling을 기준으로 lock을 다룹니다. Sha·Rajkumar·Lehoczky(1990)의 PCP는 ceiling 규칙으로 deadlock과 chained blocking을 막는다는 것을 증명했고, 그 정의와 PI와의 비교는 PRTOS 3-04에 있습니다. FreeRTOS V11.2.0 mutex에는 ceiling protocol이 없습니다.

POSIX에서는 `PTHREAD_PRIO_PROTECT`가 이 계열입니다. POSIX 정의는 이 protocol의 mutex를 하나 이상 쥔 thread가 "shall execute at the higher of its priority or the highest of the priority ceilings of all the mutexes owned by this thread"라고 정합니다. 기다리는 thread가 있든 없든 lock을 잡는 순간 ceiling으로 올라갑니다.

```c
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_PROTECT);
pthread_mutexattr_setprioceiling(&attr, 90);
pthread_mutex_init(&mtx, &attr);
```

## ISR과 mutex

ISR은 task가 아니라 mutex의 owner가 될 수 없고, `semphr.h`는 mutex에 대해 "Mutex type semaphores cannot be used from within interrupt service routines"라고 적습니다. ISR에서 task로 알릴 때는 semaphore나 task notification([6-04](/blog/embedded/modern-recipes/part6-04-semaphore-usage))을 씁니다.

## 예방 — 설계 규칙

1. 공유 자원은 binary semaphore가 아니라 **mutex**로 보호합니다(PI가 걸림).
2. mutex를 쥔 채로 **기다리는 호출**(I/O 완료 대기, 다른 queue 대기)을 하지 않습니다. holder가 block해 있으면 우선순위를 올려도 돌지 못합니다.
3. 보호 구간은 **짧게** 둡니다. PI는 H의 대기를 Low의 남은 보호 구간으로 묶을 뿐, 0으로 만들지 않습니다(위 측정의 18 tick).
4. 여러 mutex는 **같은 순서로** 잡습니다. PI는 deadlock을 막지 못합니다.

```c
/* avoid: I/O inside the lock */
xSemaphoreTake(mtx, portMAX_DELAY);
read_file();
xSemaphoreGive(mtx);

/* better: I/O outside, only the update inside */
read_file();
xSemaphoreTake(mtx, portMAX_DELAY);
update_var();
xSemaphoreGive(mtx);
```

## 자주 하는 실수

> ⚠️ binary semaphore로 공유 자원을 보호

```c
SemaphoreHandle_t mtx = xSemaphoreCreateBinary();   /* no priority inheritance */
```

`semphr.h`는 binary semaphore에 priority inheritance가 없다고 적고, 6-05의 측정에서 H의 대기가 18 tick에서 68 tick으로 늘었습니다. `xSemaphoreCreateMutex()`를 씁니다.

> ⚠️ lock 안에서 오래 걸리는 일

```c
xSemaphoreTake(mtx, portMAX_DELAY);
http_request();
xSemaphoreGive(mtx);
```

H는 이 요청이 끝날 때까지 기다립니다. 데이터는 lock 밖에서 가져오고, lock 안에서는 갱신만 합니다.

> ⚠️ ISR에서 mutex

```c
void ISR(void) { xSemaphoreTakeFromISR(mtx, &hp); }   /* mtx is a mutex */
```

위 "ISR과 mutex" 절에서 본 대로, ISR에서는 semaphore나 notification을 씁니다.

> ⚠️ 마감이 다른 task에 같은 우선순위

```c
/* Task H priority 5, Task M priority 5 */
```

같은 우선순위면 preemption과 time slicing 설정에 따라 tick마다 번갈아 돌아, H의 일이 M과 CPU를 나눕니다([6-02](/blog/embedded/modern-recipes/part6-02-task-design)의 측정에서 3 tick → 6 tick). 마감이 다르면 우선순위를 나눕니다.

## 정리

- Priority inversion은 **Low가 쥔 lock을 High가 기다리는 동안 Medium이 Low를 밀어내는** 구조입니다.
- FreeRTOS mutex는 **holder를 기다리는 task의 우선순위로 올렸다가**, give할 때 되돌립니다. 위 실행에서 L의 우선순위는 1 → 5 → 1로 바뀌었습니다.
- `traceTASK_PRIORITY_INHERIT()` hook으로 **상속이 일어난 시점을 기록**할 수 있습니다.
- ceiling 계열(PCP, `PTHREAD_PRIO_PROTECT`)은 lock을 잡는 순간 ceiling으로 올립니다. FreeRTOS mutex에는 없습니다.
- 예방은 **mutex 사용, lock 안에서 기다리지 않기, 짧은 보호 구간, 일정한 lock 순서**입니다.

다음 편은 **Timer Wheel 분석**입니다.

## 관련 항목

- [PRTOS 3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [PRTOS 3-05: Priority Inheritance](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
- [6-05: Mutex 활용](/blog/embedded/modern-recipes/part6-05-mutex-usage)
- [9-01: Lock-Free Ring](/blog/embedded/modern-recipes/part9-01-lock-free-ring)
