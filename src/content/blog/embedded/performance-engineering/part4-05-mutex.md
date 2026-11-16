---
title: "Mutex 성능 분석 — Futex·Adaptive·Priority Inheritance"
slug: "embedded/performance-engineering/part4-05-mutex"
date: 2026-04-26T09:04:00
description: "Mutex blocking 비용과 Linux futex 2-stage, adaptive mutex, priority inheritance overhead."
series: "Embedded Performance Engineering"
seriesOrder: 34
tags: [mutex, blocking, futex, adaptive, priority-inheritance]
topics: ["embedded"]
---

## 한 줄 요약

> **"Mutex는 block 가능한 lock입니다."** 경쟁이 없으면 userspace atomic 하나로 끝나고(Debian 게스트에서 lock+unlock 4.1 ns), 경쟁이 생기면 futex로 잠들고 깨어납니다(같은 CPU에서 한 번 넘기는 데 650 ns).

## 어떤 문제를 푸는가

Spinlock은 짧은 critical section에 맞지만, hold time이 길어지면 기다리는 thread 수만큼 CPU를 태웁니다. [4-04](/blog/embedded/performance-engineering/part4-04-spinlock)의 측정에서 8 thread가 spinlock 하나를 다툴 때 CPU 사용량은 6~8코어였고, 같은 조건의 mutex는 1.2~4.6코어였습니다. Mutex는 lock을 얻지 못한 thread를 재우고 holder가 unlock할 때 깨우므로, 그동안 다른 thread가 그 CPU를 씁니다.

문제는 재우고 깨우는 일이 공짜가 아니라는 점입니다. 식당 대기줄에서 진동벨을 나눠 주는 방식은 손님이 앉아 쉴 수 있게 하지만, 벨을 울리고 손님이 걸어오는 시간이 듭니다. 이 글은 Linux futex의 2단계 구조, glibc adaptive mutex가 spin과 block을 섞는 방식, priority inheritance가 실제로 무엇을 막는지를 직접 재 봅니다.

측정 환경은 두 가지입니다. Debian 13 arm64 게스트(QEMU 11.1.3 HVF, 8 vCPU, host Apple M2 Pro, 커널 6.12.116, GCC 14.2.0, glibc 2.41)와 Apple M2 Pro 네이티브(macOS 27.2.1, Apple clang 21.0.0)입니다. 조합마다 5회(PI 실험은 3회) 돌린 중앙값입니다.

## Mutex 비용 분해

먼저 경쟁이 없을 때의 비용입니다. `mutexcost.c`는 thread 하나가 mutex type별로 lock/unlock을 1,000만 번 반복합니다.

```c title="mutexcost.c (발췌)"
pthread_mutexattr_t a; pthread_mutexattr_init(&a);
if (type >= 0) pthread_mutexattr_settype(&a, type);
if (proto >= 0) pthread_mutexattr_setprotocol(&a, proto);
pthread_mutex_t m; pthread_mutex_init(&m, &a);
double t0 = ns_now();
for (long i = 0; i < n; i++) { pthread_mutex_lock(&m); pthread_mutex_unlock(&m); }
printf("%-22s ns_per_pair=%.1f\n", name, (ns_now() - t0) / n);
```

| Mutex | Debian 게스트 (glibc 2.41) | M2 Pro 네이티브 (macOS libpthread) |
|---|---:|---:|
| 기본 (`NORMAL`) | 4.1 ns | 6.6 ns |
| `PTHREAD_MUTEX_RECURSIVE` | 5.6 ns | 10.4 ns |
| `PTHREAD_MUTEX_ERRORCHECK` | 6.5 ns | 10.3 ns |
| `PTHREAD_MUTEX_ADAPTIVE_NP` | 5.9 ns | (Linux 전용) |
| `PTHREAD_PRIO_INHERIT` | 9.6 ns | 6.7 ns |
| `os_unfair_lock` | — | 4.9 ns |

네이티브 첫 번째 실행은 `os_unfair_lock`(4.9 ns)을 뺀 모든 값이 높게 나와(기본 8.7 ns, errorcheck 37.2 ns) 나머지 4회와 차이가 컸습니다. 중앙값은 이 영향을 받지 않습니다.

경쟁이 생기면 비용의 단위가 바뀝니다. `ctxsw.c`로 두 thread가 futex로 토큰을 주고받게 하면, 같은 CPU에서 한 번 넘기는 데 650 ns가 걸렸습니다(10만 왕복에 context switch 200,001번). 경쟁 없는 lock보다 두 자릿수 이상 큽니다. 그래서 mutex 성능의 핵심은 "얼마나 자주 slow path로 가는가"입니다.

## Linux Futex — Fast Userspace Mutex

Linux의 futex는 userspace의 정수 하나와 커널의 wait/wake 연산을 결합하는 primitive입니다([`futex(2)`](https://man7.org/linux/man-pages/man2/futex.2.html)). 경쟁이 없으면 userspace atomic만으로 끝나고, 기다려야 할 때만 커널에 들어갑니다. 1 thread로 2만 번 lock/unlock하면 futex 시스템 콜은 1번뿐이었습니다([4-03](/blog/embedded/performance-engineering/part4-03-lock-contention)의 `perf stat` 측정).

아래는 Ulrich Drepper의 [Futexes Are Tricky](https://www.akkadia.org/drepper/futex.pdf)(Version 1.6, 2011) 5절 "Mutex, Take 2"의 `mutex2` 코드를 C로 옮긴 것입니다.

```c
/* Drepper, "Futexes Are Tricky", mutex2 */
void lock(int *val) {
    int c;
    if ((c = cmpxchg(val, 0, 1)) != 0)
        do {
            if (c == 2 || cmpxchg(val, 1, 2) != 0)
                futex_wait(val, 2);
        } while ((c = cmpxchg(val, 0, 2)) != 0);
}

void unlock(int *val) {
    if (atomic_dec(val) != 1) {
        *val = 0;
        futex_wake(val, 1);
    }
}
```

논문은 상태를 세 값으로 정의합니다. 0은 unlocked, 1은 locked이며 waiter 없음, 2는 locked이며 waiter가 하나 이상입니다. 코드에서 바로 읽을 수 있듯, 경쟁이 없으면 lock은 `cmpxchg` 한 번, unlock은 `atomic_dec` 한 번으로 끝나고 futex 호출이 없습니다. unlock에서 값이 1이었다면(waiter 없음) `futex_wake`를 건너뛰기 때문입니다. glibc의 실제 `pthread_mutex_lock()`은 다음 절에서 보듯 mutex type마다 다른 경로를 탑니다.

## Adaptive Mutex — 짧으면 Spin

glibc의 `PTHREAD_MUTEX_ADAPTIVE_NP`는 바로 잠들지 않고 잠깐 spin합니다. glibc 2.41 `nptl/pthread_mutex_lock.c`의 adaptive 경로(133~165행)를 요약하면 다음과 같습니다.

```c
/* glibc 2.41 nptl/pthread_mutex_lock.c, PTHREAD_MUTEX_ADAPTIVE_NP 경로에서 발췌 */
if (LLL_MUTEX_TRYLOCK (mutex) != 0) {
    int cnt = 0;
    int max_cnt = MIN (max_adaptive_count (), mutex->__data.__spins * 2 + 10);
    int spin_count, exp_backoff = 1;
    unsigned int jitter = get_jitter ();
    do {
        spin_count = exp_backoff + (jitter & (exp_backoff - 1));
        cnt += spin_count;
        if (cnt >= max_cnt) { LLL_MUTEX_LOCK (mutex); break; }   /* 한도를 넘으면 잠든다 */
        do atomic_spin_nop (); while (--spin_count > 0);
        exp_backoff = get_next_backoff (exp_backoff);
    } while (LLL_MUTEX_READ_LOCK (mutex) != 0 || LLL_MUTEX_TRYLOCK (mutex) != 0);
    mutex->__data.__spins += (cnt - mutex->__data.__spins) / 8;
}
```

spin 한도는 고정값이 아닙니다. mutex마다 지난번에 얼마나 spin했는지(`__spins`)를 1/8 가중 이동평균으로 기억하고, 그 두 배 + 10과 전역 상한 중 작은 값을 씁니다. 전역 상한은 tunable `glibc.pthread.mutex_spin_count`이고, [glibc 매뉴얼](https://sourceware.org/glibc/manual/latest/html_node/POSIX-Thread-Tunables.html)은 이것이 "커널을 불러 block하기 전에 spin할 최대 횟수"이며 `PTHREAD_MUTEX_ADAPTIVE_NP`로 초기화한 mutex에만 쓰인다고 적습니다. 게스트에서 `ld-linux-aarch64.so.1 --list-tunables`로 보면 `glibc.pthread.mutex_spin_count: 100 (min: 0, max: 32767)`이었습니다.

효과를 재 봤습니다. [4-04](/blog/embedded/performance-engineering/part4-04-spinlock)의 `spinbench.c`에 `adaptive` 모드를 더해 4 thread, hold 약 0.1 µs로 돌리고 `perf stat -e syscalls:sys_enter_futex`로 시스템 콜을 셌습니다.

| Mutex | Mops/s | futex 시스템 콜 (80만 번 획득) |
|---|---:|---:|
| 기본 | 2.818 | 619,057 |
| `ADAPTIVE_NP` | 3.277 | 417,913 |

adaptive mutex는 futex 시스템 콜을 32% 줄였고 throughput은 16% 높았습니다. 임계구역이 짧아서 잠깐 기다리면 풀리는 경우가 많았다는 뜻입니다. 이 측정은 hold 약 0.1 µs 한 조건뿐이며, 긴 임계구역에서 adaptive mutex를 재지는 않았습니다.

Linux 커널 mutex의 optimistic spinning은 기준이 다릅니다. v6.12 `Documentation/locking/mutex-design.rst`는 *lock owner가 실행 중이고 더 높은 우선순위 task가 기다리지 않는 동안* spin한다고 설명합니다. 횟수가 아니라 owner의 상태를 봅니다.

## Priority Inheritance

Real-time 시스템에서 low priority task가 mutex를 쥔 채 medium priority task에게 선점되면, 그 mutex를 기다리는 high priority task는 medium이 끝날 때까지 기다립니다. medium은 mutex와 아무 관계가 없는데도 말입니다. 이것이 priority inversion입니다.

유명한 사례가 Mars Pathfinder입니다. Microsoft의 Mike Jones가 정리한 [What really happened on Mars Rover Pathfinder](https://www.cs.cornell.edu/courses/cs614/1999sp/papers/pathfinder.html)(1997년 12월)에 따르면, 1997년 7월 4일 착륙 며칠 뒤부터 우주선이 전체 시스템 리셋을 반복했습니다. 저우선순위 기상(meteorological) task가 쥔 mutex를 고우선순위 information bus task가 기다리는 동안 중간 우선순위의 통신 task가 실행되었고, bus task가 한동안 실행되지 않은 것을 본 watchdog이 전체 리셋을 걸었습니다. VxWorks mutex는 생성 시 priority inheritance 여부를 정하는 boolean 인자를 받는데, 문제의 mutex는 이 인자가 꺼진 채 만들어졌습니다. 엔지니어들은 VxWorks의 C 인터프리터로 실행할 짧은 프로그램을 우주선에 올려, 문제의 mutex와 같은 문제를 일으킬 수 있던 다른 두 mutex, 모두 세 개의 인자를 담은 전역 변수를 FALSE에서 TRUE로 바꿨습니다.

Linux에서 같은 상황을 재현했습니다. `pidemo.c`는 세 thread를 모두 CPU 3에 고정하고 `SCHED_FIFO`로 돌립니다.

```c title="pidemo.c (발췌)"
static void *low(void *x) { pthread_mutex_lock(&m); atomic_store(&low_locked, 1);
    burn_cpu_ms(hold_ms); pthread_mutex_unlock(&m); return 0; }   /* 우선순위 10, 자기 CPU 시간 20 ms */
static void *high(void *x) { atomic_store(&high_started, 1); long t0 = now_ns(); pthread_mutex_lock(&m);
    printf("high waited %.1f ms\n", (now_ns() - t0) / 1e6); pthread_mutex_unlock(&m); return 0; }   /* 30 */
static void *medium(void *x) { burn_ms(med_ms); return 0; }       /* 20, mutex와 무관한 300 ms CPU 작업 */
```

low가 mutex를 잡은 뒤 high가 같은 mutex에서 block되고, 그다음 medium이 시작합니다. mutex protocol만 바꿔 3회씩 돌렸습니다.

| Protocol | high의 대기 시간 |
|---|---:|
| `PTHREAD_PRIO_NONE` | 320.0 ms (3회 모두 320.0~320.1) |
| `PTHREAD_PRIO_INHERIT` | 20.0 ms (3회 모두) |

PI가 없으면 high는 medium의 300 ms와 low의 20 ms를 모두 기다렸습니다. PI가 있으면 low가 high의 우선순위 30을 물려받아 medium(20)보다 먼저 실행되므로, high는 low의 임계구역 20 ms만 기다렸습니다. 대가는 경쟁 없는 경로에서도 보입니다. 위 비용 표에서 게스트의 PI mutex는 lock+unlock에 9.6 ns로 기본(4.1 ns)의 2.3배였습니다.

FreeRTOS도 mutex에만 priority inheritance가 있습니다. FreeRTOS-Kernel(V11.1.0+, commit `ca759444`)의 `semphr.h`는 binary semaphore 생성 함수 설명마다 "priority inheritance mechanism을 쓰지 않으니 필요하면 `xSemaphoreCreateMutex()`를 보라"고 적습니다(71~72행 등). 구현은 `tasks.c`의 `xTaskPriorityInherit()`(6745행)이 holder의 우선순위가 요청자보다 낮으면 요청자의 우선순위로 올리고, `xTaskPriorityDisinherit()`은 holder가 쥔 mutex가 *하나도 남지 않았을 때만* 원래 우선순위로 내립니다(6869행 "Only disinherit if no other mutexes are held."). 여러 mutex를 겹쳐 쥐는 task는 마지막 mutex를 놓을 때까지 높아진 우선순위로 실행된다는 뜻이므로, 응답시간 분석에서 이 구간을 따로 계산합니다.

## FreeRTOS Mutex 측정

가장 간단한 측정은 tick 카운터입니다.

```c
TickType_t start = xTaskGetTickCount();
xSemaphoreTake(mtx, portMAX_DELAY);
TickType_t wait = xTaskGetTickCount() - start;
```

tick 해상도는 `configTICK_RATE_HZ`가 정하므로, 1 kHz tick이면 1 ms보다 짧은 대기는 0 또는 1로만 보입니다. 더 짧은 대기는 [4-03](/blog/embedded/performance-engineering/part4-03-lock-contention)에서 본 trace 매크로(`traceBLOCKING_ON_QUEUE_RECEIVE`, `traceQUEUE_RECEIVE`)를 SystemView나 Tracealyzer 같은 recorder에 연결해 타임스탬프로 잽니다. 관측한 최댓값은 그 workload와 측정 구간의 최댓값일 뿐이고 worst-case 증명이 아니라는 점도 기록에 함께 남깁니다.

## Robust Mutex

프로세스가 mutex를 쥔 채 죽으면, 일반 mutex는 영원히 잠긴 채 남습니다. robust mutex는 다음 획득자에게 "이전 주인이 죽었다"고 알려 줍니다. 프로세스 사이에서 쓰려면 robust 설정과 함께 `pthread_mutexattr_setpshared(&attr, PTHREAD_PROCESS_SHARED)`도 필요합니다([`pthread_mutexattr_setpshared(3)`](https://man7.org/linux/man-pages/man3/pthread_mutexattr_setpshared.3.html)).

`robust.c`는 공유 메모리에 robust·process-shared mutex를 만들고, 자식 프로세스가 lock을 잡은 채 `_exit()`합니다.

```c title="robust.c (발췌)"
pthread_mutexattr_setpshared(&a, PTHREAD_PROCESS_SHARED);
pthread_mutexattr_setrobust(&a, PTHREAD_MUTEX_ROBUST);
pthread_mutex_init(m, &a);                                  /* m은 MAP_SHARED 메모리 */
if (fork() == 0) { pthread_mutex_lock(m); _exit(0); }       /* lock을 쥔 채 종료 */
wait(0);
int e = pthread_mutex_lock(m);
if (e == EOWNERDEAD) pthread_mutex_consistent(m);           /* 보호하던 상태를 복구한 뒤 호출 */
```

게스트에서의 출력입니다.

```text
1st lock: 130 (Owner died)
consistent: 0
unlock: 0
2nd lock: 0
```

첫 `pthread_mutex_lock()`은 lock을 *획득하면서* `EOWNERDEAD`(130)를 돌려줬고, `pthread_mutex_consistent()` 뒤에는 평소처럼 쓸 수 있었습니다([robust mutex 매뉴얼](https://man7.org/linux/man-pages/man3/pthread_mutexattr_setrobust.3.html), [`pthread_mutex_consistent(3)`](https://man7.org/linux/man-pages/man3/pthread_mutex_consistent.3.html)). 같은 매뉴얼은 `pthread_mutex_consistent()` 없이 unlock하면 mutex가 영구히 쓸 수 없게 되고, 이후 lock은 `ENOTRECOVERABLE`로 실패한다고 적습니다. 그래서 복구 코드가 robust mutex의 핵심입니다.

## Recursive Mutex의 비용

같은 thread가 이미 쥔 lock을 다시 잡아도 되게 하는 것이 recursive mutex입니다.

```c
recursive_mutex_take(&m);   /* 처음: 실제 lock + count = 1 */
recursive_mutex_take(&m);   /* 이미 owner: count++ */
recursive_mutex_give(&m);   /* count-- */
recursive_mutex_give(&m);   /* count가 0이 되면 실제 unlock */
```

재진입 경로는 atomic이 아닙니다. glibc 2.41 `pthread_mutex_lock.c`(108~132행)는 `__owner`가 자기 TID면 overflow만 확인하고 `++mutex->__data.__count`로 끝냅니다. FreeRTOS의 `xQueueTakeMutexRecursive()`(`queue.c` 818행~)도 `xMutexHolder == xTaskGetCurrentTaskHandle()`이면 `uxRecursiveCallCount++`만 합니다. owner만 이 필드를 건드리므로 atomic이 필요 없습니다.

비용은 처음 잡을 때의 owner 확인과 count 기록에서 생깁니다. 위 표에서 경쟁 없는 lock+unlock은 게스트 5.6 ns 대 4.1 ns(1.37배), 네이티브 10.4 ns 대 6.6 ns(1.58배)였습니다. 비용보다 더 큰 문제는 설계입니다. 재귀 lock이 필요한 코드는 "이 함수가 lock을 쥔 상태에서 불리는가"가 호출 경로마다 달라서, lock 순서를 문서로 정하기 어렵습니다.

## Mutex vs Semaphore — 어느 것을 쓸까

FreeRTOS 기준으로 정리합니다. 근거는 모두 위 commit의 `include/semphr.h`입니다.

| 항목 | Mutex | Binary semaphore |
|---|---|---|
| Owner 개념 | 있음 (`xMutexHolder`) | 없음 |
| 재귀 획득 | recursive mutex(`xSemaphoreCreateRecursiveMutex`)만 | 없음 |
| Priority inheritance | 있음 (699행) | 없음 (71행) |
| ISR에서 사용 | 불가 (703행 "cannot be used from within interrupt service routines") | `xSemaphoreGiveFromISR()` |
| 용도 | 상호 배제 | ISR → task 신호, 이벤트 |

Mutex는 자원 보호용이라 take한 task가 give해야 합니다(699~701행). binary semaphore는 ISR이 give하고 task가 take하는 신호 용도로 씁니다.

## 자동차 ECU — Mutex 패턴

주기 task에서 mutex를 무한정 기다리면 주기 자체를 놓칩니다. 아래 패턴은 timeout을 주기보다 짧게 두고, 실패하면 이전 값을 씁니다.

```c
/* Brake task: 1 ms 주기, configTICK_RATE_HZ = 1000 가정 (pdMS_TO_TICKS(1) == 1 tick) */
if (xSemaphoreTake(brake_data_mtx, pdMS_TO_TICKS(1)) == pdTRUE) {
    read_data();
    xSemaphoreGive(brake_data_mtx);
} else {
    use_last_known();
}
```

`pdMS_TO_TICKS()`는 `projdefs.h` 42행에서 `ms × configTICK_RATE_HZ / 1000`으로 정의되므로, tick rate가 1 kHz보다 낮으면 1 ms가 0 tick이 되어 대기 없이 바로 실패합니다. `xSemaphoreTake()`는 timeout 안에 얻지 못하면 `pdFALSE`를 돌려줍니다(앞 절의 `traceQUEUE_RECEIVE_FAILED` 경로). 이전 값을 써도 되는지, 몇 주기까지 허용하는지는 기능 안전 분석이 정할 몫이고, 코드는 그 결정을 실패 분기로 명시해 둡니다.

## Apple os_unfair_lock

macOS와 iOS의 저수준 lock은 `os_unfair_lock`입니다.

```c
#include <os/lock.h>
os_unfair_lock lock = OS_UNFAIR_LOCK_INIT;
os_unfair_lock_lock(&lock);
critical();
os_unfair_lock_unlock(&lock);
```

macOS SDK의 `os/lock.h` 설명은 이 lock을 "contention 시 waiter가 효율적으로 block할 수 있는 저수준 lock"으로 소개합니다. lock 값에는 owner 정보가 들어 있어 시스템이 priority inversion 해소에 쓸 수 있고, 이름의 'unfair'는 unlock한 thread가 깨어난 waiter보다 먼저 다시 잡을 수 있다는 뜻이며 waiter의 starvation이 가능하다고 적습니다. 같은 thread에서만 unlock할 수 있고, 공유 메모리로 여러 프로세스에서 쓸 수 없습니다. `libkern/OSSpinLockDeprecated.h`는 `OSSpinLock`을 macOS 10.12부터 deprecated로 표시하고, 특히 우선순위가 다른 thread들이 같은 spinlock을 다툴 때 쓰지 말라며 `os_unfair_lock_lock()`을 대체재로 지정합니다.

경쟁 없는 lock+unlock은 M2 Pro에서 4.9 ns로, 같은 기계의 `pthread_mutex` 기본(6.6 ns)보다 짧았습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ ISR 안에서 mutex

```c
/* ISR */
xSemaphoreTake(mtx, 0);   /* mutex는 ISR에서 쓸 수 없음 */
```

FreeRTOS `semphr.h` 703행대로 mutex type semaphore는 ISR에서 쓸 수 없습니다. ISR에서 task로 알리려면 binary semaphore와 `xSemaphoreGiveFromISR()`을 씁니다.

> ⚠️ 무한 timeout

```c
xSemaphoreTake(mtx, portMAX_DELAY);   /* deadlock이면 영원히 대기 */
```

주기가 있는 task라면 주기 안에 끝나는 timeout과 실패 분기를 둡니다.

> ⚠️ Nested mutex의 순서 불일치

```c
xSemaphoreTake(a, portMAX_DELAY);
xSemaphoreTake(b, portMAX_DELAY);   /* 다른 task가 b를 쥐고 a를 기다리면 deadlock */
```

lock 순서를 정해 모든 코드가 같은 순서로 잡습니다. FreeRTOS에서는 위 PI 절의 "마지막 mutex를 놓을 때까지 boost 유지" 동작도 겹친 mutex의 비용에 더해집니다.

> ⚠️ Priority inversion 무시한 RT design

`pidemo.c`에서 PI가 없으면 high task가 20 ms가 아니라 320 ms를 기다렸습니다. low와 high가 공유하는 자원에는 PI mutex를 쓰고, 그 경우에도 low의 임계구역 길이를 high의 응답시간에 더해 분석합니다.

## 측정 — 기록해야 할 항목

이 글의 측정에서 실제로 기록한 항목입니다. 같은 비교를 다른 타깃에서 반복할 때 이 표를 기준으로 삼습니다.

| 경로 | 측정한 값 | 프로그램 | 함께 기록한 조건 |
|------|-------------|---------|----------------|
| Uncontended lock/unlock | ns/pair, type별 | `mutexcost.c` | CPU, OS/libc, mutex type, 5회 중앙값 |
| Contended handoff | ns/handoff, context switch 수 | `ctxsw.c` + `perf stat` | 같은 CPU/다른 CPU 고정 |
| Adaptive mutex | throughput, futex 시스템 콜 수 | `spinbench.c` + `perf stat` | thread 수, hold time, `mutex_spin_count` |
| PI mutex | high task 대기 시간 | `pidemo.c` | `SCHED_FIFO` 우선순위, CPU 고정, hold·medium 시간 |

게스트 측정은 host에서 다른 작업과 CPU를 나눠 쓰는 vCPU 위에서 나왔습니다. 절대값보다 같은 표 안의 비교로 읽습니다.

## 정리

- 경쟁 없는 mutex lock+unlock은 게스트 glibc 4.1 ns, M2 Pro 6.6 ns였고, futex로 한 번 넘기는 비용은 같은 CPU에서 650 ns였습니다.
- Drepper의 `mutex2`는 0/1/2 세 상태로 waiter가 없을 때 시스템 콜을 건너뜁니다.
- glibc adaptive mutex는 지난 spin 횟수의 이동평균과 `mutex_spin_count`(기본 100)로 한도를 정하고, 짧은 임계구역에서 futex 호출을 32% 줄였습니다.
- PI가 없으면 high task가 medium의 300 ms까지 기다렸고(320 ms), PI가 있으면 20 ms였습니다. FreeRTOS는 마지막 mutex를 놓을 때 우선순위를 되돌립니다.
- robust mutex는 owner가 죽으면 `EOWNERDEAD`와 함께 lock을 넘기고, `pthread_mutex_consistent()`로 복구합니다.
- FreeRTOS에서 mutex는 ISR에서 쓸 수 없고, ISR 신호에는 binary semaphore를 씁니다.

다음 편은 **Reader-Writer Lock** — read-mostly 워크로드의 최적화 패턴입니다.

## 관련 항목

- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
