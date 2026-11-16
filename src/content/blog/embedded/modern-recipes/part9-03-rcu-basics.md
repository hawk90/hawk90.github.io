---
title: "RCU (Read-Copy-Update) 기초 — Quiescent State·Grace Period"
slug: "embedded/modern-recipes/part9-03-rcu-basics"
date: 2026-04-18T09:02:00
description: "RCU 원리, rcu_read_lock, grace period, synchronize_rcu, 임베디드 적용(URCU)을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 103
tags: [recipes, concurrency, rcu]
topics: ["embedded"]
---

## 한 줄 요약

> **"RCU = reader 경로를 가볍게 하고 writer가 reclamation 비용을 부담하는 read-mostly 동기화."** 핵심은 *grace period*입니다. 갱신 전에 시작한 reader가 모두 끝난 뒤에야 옛 객체를 free할 수 있습니다. 이 글은 커널 모듈과 liburcu로 그 비용을 직접 재고, grace period를 건너뛰면 무슨 일이 나는지 AddressSanitizer로 봅니다.

## 어떤 상황에서 쓰나

Routing table, 설정 객체, 모듈 목록처럼 *읽기는 자주, 쓰기는 가끔*인 데이터가 대상입니다. 도서관 열람실에 비유하면, 개정판이 나왔다고 지금 읽고 있는 사람의 책을 빼앗지 않고 새 책을 서가에 꽂아 둡니다. 옛 책은 그때 읽던 사람이 모두 자리를 뜬 뒤에 치웁니다. 새로 오는 사람은 처음부터 새 책을 집습니다.

Linux 커널 문서는 v4.20부터 한 커널에 RCU flavor가 하나만 있고, `PREEMPTION=n`이면 RCU-sched, `PREEMPTION=y`면 RCU-preempt라고 적습니다(v6.12 `Documentation/RCU/checklist.rst` 230행). 사용자 공간에서는 liburcu(Userspace RCU)가 같은 API 이름을 제공합니다.

## 핵심 개념

| API | 동작 | 출처 (Linux v6.12) |
|-----|------|------|
| `rcu_read_lock` / `rcu_read_unlock` | read-side 구간 진입·탈출. 구간 안에서 block 금지 | `Documentation/RCU/whatisRCU.rst` 160–171행 |
| `rcu_dereference` | 보호된 포인터 읽기 | `include/linux/rcupdate.h` 758행 |
| `rcu_assign_pointer` | 새 객체 publish | `rcupdate.h` 594행 |
| `rcu_dereference_protected` | updater가 lock을 쥔 채 읽기 | `rcupdate.h` 748행 |
| `synchronize_rcu` | 그 시점까지 시작한 reader가 모두 끝날 때까지 sleep | `kernel/rcu/tree.c` 4084행, 4093행에서 `rcu_blocking_is_gp()`가 `might_sleep()` 호출(4003행) |
| `call_rcu` | grace period 뒤 실행할 callback을 등록하고 바로 반환 | `rcupdate.h` 41행, `whatisRCU.rst` 232–238행 |

전형적인 update 흐름입니다.

1. 새 객체를 할당하고 옛 객체를 복사한 뒤 고칩니다.
2. `rcu_assign_pointer(global, new)`로 바꿔 끼웁니다.
3. `synchronize_rcu()`로 기다리거나 `call_rcu()`로 해제를 예약합니다.
4. 옛 객체를 free합니다.

이 순서 덕분에 갱신 전부터 옛 객체를 들고 있던 reader가 끝나기 전에는 그 객체가 해제되지 않습니다. 대가는 세 가지입니다. Writer가 grace period만큼 기다리거나 callback이 그만큼 늦게 돕니다. 그동안 옛 객체와 새 객체가 함께 메모리에 있습니다. 그리고 writer끼리는 여전히 별도 lock이 필요합니다.

Grace period가 끝났는지는 quiescent state로 압니다. Read-side 구간 안에서는 block할 수 없으므로, 어떤 CPU가 context switch를 했다면 그 CPU는 그 전에 시작한 read-side 구간을 모두 마친 것이고, 모든 CPU가 context switch를 한 번씩 하면 그 전의 read-side 구간은 모두 끝난 것입니다(`whatisRCU.rst` 762–766행). Tree RCU 문서는 CPU가 context switch를 하면 `rcu_note_context_switch()`가, user mode에서 scheduler-clock 인터럽트를 받으면 `rcu_sched_clock_irq()`가 quiescent state를 기록한다고 적습니다(`Documentation/RCU/Design/Memory-Ordering/Tree-RCU-Memory-Ordering.rst` 449–452행). 모든 CPU가 grace period 시작 뒤 quiescent state를 한 번씩 지나면 그 grace period가 끝납니다.

## 코드 / 실제 사용 예

### Linux kernel RCU — 측정 모듈

아래 모듈은 설정 객체를 21번 `synchronize_rcu()`로, 8번 `call_rcu()`로 갈아 끼우며 시간을 재고, 마지막으로 read-side 비용을 `rwlock`·`spinlock`과 비교합니다. 실행 환경은 Debian 13 arm64 guest(QEMU `-accel hvf`, vCPU 6개, Apple M2 Pro host)의 배포판 커널 `6.12.116+deb13-arm64`이고, 같은 버전의 `linux-headers` 패키지로 빌드했습니다.

```c
// rcu_bench.c — grace-period latency and read-side cost on the running kernel
#include <linux/module.h>
#include <linux/rcupdate.h>
#include <linux/slab.h>
#include <linux/sort.h>
#include <linux/spinlock.h>
#include <linux/ktime.h>

struct config {
	int max_threads;
	struct rcu_head rcu;
	u64 queued_ns;
};

static struct config __rcu *cfg;
static DEFINE_SPINLOCK(cfg_lock);
static DEFINE_RWLOCK(cfg_rwlock);
static u64 cb_delay[8];
static atomic_t cb_done;

static void config_free_cb(struct rcu_head *r)
{
	struct config *c = container_of(r, struct config, rcu);
	int i = atomic_inc_return(&cb_done) - 1;

	if (i < 8)
		cb_delay[i] = ktime_get_ns() - c->queued_ns;
	kfree(c);
}

static int cmp_u64(const void *a, const void *b)
{
	u64 x = *(const u64 *)a, y = *(const u64 *)b;
	return x < y ? -1 : x > y;
}

static int __init rcu_bench_init(void)
{
	u64 t[21], t0;
	struct config *new, *old;
	unsigned long sum = 0;
	int i;

	new = kzalloc(sizeof(*new), GFP_KERNEL);
	if (!new)
		return -ENOMEM;
	RCU_INIT_POINTER(cfg, new);

	/* 1) update with synchronize_rcu(): how long does the updater sleep? */
	for (i = 0; i < 21; i++) {
		new = kzalloc(sizeof(*new), GFP_KERNEL);
		if (!new)
			return -ENOMEM;
		new->max_threads = i;
		spin_lock(&cfg_lock);
		old = rcu_dereference_protected(cfg, lockdep_is_held(&cfg_lock));
		rcu_assign_pointer(cfg, new);
		spin_unlock(&cfg_lock);
		t0 = ktime_get_ns();
		synchronize_rcu();
		t[i] = ktime_get_ns() - t0;
		kfree(old);
	}
	sort(t, 21, sizeof(t[0]), cmp_u64, NULL);
	pr_info("rcu_bench: synchronize_rcu() x21: min %llu us, median %llu us, max %llu us\n",
		t[0] / 1000, t[10] / 1000, t[20] / 1000);

	/* 2) update with call_rcu(): the updater does not sleep */
	for (i = 0; i < 8; i++) {
		new = kzalloc(sizeof(*new), GFP_KERNEL);
		if (!new)
			return -ENOMEM;
		spin_lock(&cfg_lock);
		old = rcu_dereference_protected(cfg, lockdep_is_held(&cfg_lock));
		rcu_assign_pointer(cfg, new);
		spin_unlock(&cfg_lock);
		old->queued_ns = ktime_get_ns();
		t0 = ktime_get_ns();
		call_rcu(&old->rcu, config_free_cb);
		t[i] = ktime_get_ns() - t0;
	}
	rcu_barrier();                      /* wait for all callbacks before reading cb_delay */
	sort(t, 8, sizeof(t[0]), cmp_u64, NULL);
	sort(cb_delay, 8, sizeof(cb_delay[0]), cmp_u64, NULL);
	pr_info("rcu_bench: call_rcu() returned in max %llu ns; callback ran %llu..%llu us later\n",
		t[7], cb_delay[0] / 1000, cb_delay[7] / 1000);

	/* 3) single-thread read-side cost, 10M iterations each */
#define LOOPS 10000000
	t0 = ktime_get_ns();
	for (i = 0; i < LOOPS; i++) {
		rcu_read_lock();
		sum += rcu_dereference(cfg)->max_threads;
		rcu_read_unlock();
	}
	t[0] = ktime_get_ns() - t0;
	t0 = ktime_get_ns();
	for (i = 0; i < LOOPS; i++) {
		read_lock(&cfg_rwlock);
		sum += rcu_dereference_raw(cfg)->max_threads;
		read_unlock(&cfg_rwlock);
	}
	t[1] = ktime_get_ns() - t0;
	t0 = ktime_get_ns();
	for (i = 0; i < LOOPS; i++) {
		spin_lock(&cfg_lock);
		sum += rcu_dereference_raw(cfg)->max_threads;
		spin_unlock(&cfg_lock);
	}
	t[2] = ktime_get_ns() - t0;
	pr_info("rcu_bench: per read (ps): rcu_read_lock %llu, read_lock %llu, spin_lock %llu (sum %lu)\n",
		t[0] * 1000 / LOOPS, t[1] * 1000 / LOOPS, t[2] * 1000 / LOOPS, sum);
	return 0;
}

static void __exit rcu_bench_exit(void)
{
	struct config *c = rcu_dereference_protected(cfg, 1);

	RCU_INIT_POINTER(cfg, NULL);
	synchronize_rcu();
	kfree(c);
}

module_init(rcu_bench_init);
module_exit(rcu_bench_exit);
MODULE_LICENSE("GPL");
```

```makefile
obj-m += rcu_bench.o rcu_list.o
all:
	$(MAKE) -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules
```

```text
# Debian 13 arm64 guest, kernel 6.12.116+deb13-arm64, CONFIG_HZ=250, CONFIG_PREEMPT_VOLUNTARY=y, CONFIG_PREEMPT_COUNT not set; gcc 14.2.0
$ make && insmod rcu_bench.ko && rmmod rcu_bench   # 3 times
$ insmod rcu_list.ko && rmmod rcu_list
$ dmesg
[ 3904.176611] rcu_bench: synchronize_rcu() x21: min 15313 us, median 16123 us, max 39015 us
[ 3904.196130] rcu_bench: call_rcu() returned in max 792 ns; callback ran 18511..18512 us later
[ 3904.411922] rcu_bench: per read (ps): rcu_read_lock 396, read_lock 8191, spin_lock 12933 (sum 0)
[ 3904.884189] rcu_bench: synchronize_rcu() x21: min 14419 us, median 16141 us, max 44779 us
[ 3904.899484] rcu_bench: call_rcu() returned in max 1000 ns; callback ran 14572..14572 us later
[ 3905.035698] rcu_bench: per read (ps): rcu_read_lock 356, read_lock 8589, spin_lock 4618 (sum 0)
[ 3905.464290] rcu_bench: synchronize_rcu() x21: min 13206 us, median 16467 us, max 20388 us
[ 3905.480140] rcu_bench: call_rcu() returned in max 666 ns; callback ran 15487..15488 us later
[ 3905.630218] rcu_bench: per read (ps): rcu_read_lock 312, read_lock 9959, spin_lock 4695 (sum 0)
[ 3905.690608] rcu_list: sum before 6
[ 3905.704158] rcu_list: sum after removing key 2: 4
[ 3905.704354] rcu_list: entries visited by scan(), summed over CPUs: 5
```

읽는 법은 다음과 같습니다.

- **`synchronize_rcu()`는 이 커널에서 한 번에 13.2~44.8 ms 잤습니다(세 번 실행의 중앙값 16.1~16.5 ms).** 이 커널은 `CONFIG_HZ=250`(tick 4 ms)이라 grace period가 tick 여러 개에 걸칩니다. 설정 하나를 바꾸는 데는 문제없지만, 루프에서 부르면 반복마다 이만큼 멈춥니다.
- **`call_rcu()`는 최대 1,000 ns 만에 반환했고, callback은 14.6~18.5 ms 뒤에 돌았습니다.** 8개가 같은 grace period를 기다려 한꺼번에 돌았으므로 최소와 최대가 거의 같습니다. Updater가 기다리지 않는 대신 해제가 그만큼 늦습니다.
- **Read-side 비용은 반복당 0.31~0.40 ns로, `read_lock`(8.19~9.96 ns)이나 `spin_lock`(4.62~12.93 ns)보다 한 자릿수 이상 작았습니다.** 셋 다 경합 없는 단일 스레드 값이고, `spin_lock`의 큰 값 하나는 세 번 중 한 번에만 나왔습니다. 이 커널은 `CONFIG_PREEMPT_RCU`가 아니어서 `__rcu_read_lock()`이 `preempt_disable()`이고(`rcupdate.h` 91–94행), `CONFIG_PREEMPT_COUNT`도 꺼져 있어 `preempt_disable()`은 `barrier()`, 즉 컴파일러 장벽일 뿐입니다(`include/linux/preempt.h` 286행). 그래서 측정된 것은 사실상 포인터 하나를 읽고 더하는 비용입니다. `CONFIG_PREEMPT_RCU` 커널에서는 read-side가 카운터를 건드리므로 이 숫자가 그대로 옮겨지지 않습니다.

`rwlock`·`spinlock` 숫자는 경합 없는 단일 스레드 값입니다. 여러 reader가 동시에 읽을 때의 차이는 아래 사용자 공간 측정에서 봅니다.

### URCU (User-space RCU)

liburcu의 기본 flavor(`urcu.h`를 그대로 include하면 `urcu-memb`)에서는 read-side 구간이 있는 스레드가 `rcu_register_thread()`로 등록해야 합니다(liburcu 0.15.2 `urcu/urcu-memb.h` 40행 "Each thread containing read-side critical sections must be registered"). `rcu_init()`은 같은 헤더에서 "library constructors" 안의 이른 사용을 위한 명시적 초기화로 설명되므로, 일반 `main()`에서는 부르지 않아도 됩니다.

아래 프로그램은 reader 4개가 설정 객체를 잡고 10 µs 동안 쓰는 사이, updater가 객체를 1,998번 갈아 끼웁니다. `-DBUG_FREE_EARLY`로 빌드하면 `synchronize_rcu()`를 빼고 바로 `free()`합니다.

```c
// urcu_cfg.c — readers use a config object while an updater replaces it
#define _LGPL_SOURCE
#include <urcu.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

struct config { int max_threads; int timeout_ms; };
static struct config *cfg;
static volatile int stop;
static pthread_barrier_t start;                 /* updater waits until all readers run */

static void *reader(void *arg)
{
    unsigned long reads = 0, bad = 0;
    (void)arg;
    rcu_register_thread();
    pthread_barrier_wait(&start);
    while (!stop) {
        rcu_read_lock();
        struct config *c = rcu_dereference(cfg);
        int a = c->max_threads;
        usleep(10);                              /* hold the pointer for a while */
        if (c->timeout_ms != a * 10) bad++;      /* invariant written by the updater */
        rcu_read_unlock();
        reads++;
    }
    rcu_unregister_thread();
    printf("reader: %lu reads, %lu inconsistent\n", reads, bad);
    return NULL;
}

int main(void)
{
    pthread_t t[4];
    cfg = malloc(sizeof *cfg);
    *cfg = (struct config){ 1, 10 };
    pthread_barrier_init(&start, NULL, 5);
    for (int i = 0; i < 4; i++) pthread_create(&t[i], NULL, reader, NULL);
    pthread_barrier_wait(&start);
    for (int v = 2; v < 2000; v++) {
        struct config *new = malloc(sizeof *new);
        *new = (struct config){ v, v * 10 };
        struct config *old = rcu_xchg_pointer(&cfg, new);
#ifndef BUG_FREE_EARLY
        synchronize_rcu();                       /* wait for readers that may hold old */
#endif
        free(old);
    }
    stop = 1;
    for (int i = 0; i < 4; i++) pthread_join(t[i], NULL);
    puts("updater: 1998 updates done");
    return 0;
}
```

Debian 13 guest에서 gcc 14.2.0과 liburcu 0.15.2(`apt install liburcu-dev`)로 AddressSanitizer를 켜고 돌린 결과입니다.

```text
$ gcc -O2 -g -fsanitize=address urcu_cfg.c -o ok -lurcu && ./ok
reader: 6601 reads, 0 inconsistent
reader: 5973 reads, 0 inconsistent
reader: 5042 reads, 0 inconsistent
reader: 5025 reads, 0 inconsistent
updater: 1998 updates done
exit=0
$ gcc -O2 -g -fsanitize=address -DBUG_FREE_EARLY urcu_cfg.c -o bug -lurcu && ./bug
=================================================================
==190567==ERROR: AddressSanitizer: heap-use-after-free on address 0x502000000014 at pc 0xaaaabef51b20 bp 0xffff96fde640 sp 0xffff96fde658
READ of size 4 at 0x502000000014 thread T3
    #0 0xaaaabef51b1c in reader /root/p9/urcu_cfg.c:25
    #1 0xffff9b58e2a8 in asan_thread_start ../../../../src/libsanitizer/asan/asan_interceptors.cpp:234
    #2 0xffff9b3c61d4  (/lib/aarch64-linux-gnu/libc.so.6+0x861d4) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)
    #3 0xffff9b42e158  (/lib/aarch64-linux-gnu/libc.so.6+0xee158) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)

0x502000000014 is located 4 bytes inside of 8-byte region [0x502000000010,0x502000000018)
freed by thread T0 here:
    #0 0xffff9b6092b4 in free ../../../../src/libsanitizer/asan/asan_malloc_linux.cpp:52
    #1 0xaaaabef51448 in main /root/p9/urcu_cfg.c:49
    #2 0xffff9b362258  (/lib/aarch64-linux-gnu/libc.so.6+0x22258) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)
    #3 0xffff9b362338 in __libc_start_main (/lib/aarch64-linux-gnu/libc.so.6+0x22338) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)
    #4 0xaaaabef515ec in _start (/root/p9/bug+0x15ec) (BuildId: 441f122b8dcf2e748e59533a10c704c3688c09d2)

previously allocated by thread T0 here:
    #0 0xffff9b60a400 in malloc ../../../../src/libsanitizer/asan/asan_malloc_linux.cpp:69
    #1 0xaaaabef5131c in main /root/p9/urcu_cfg.c:37
    #2 0xffff9b362258  (/lib/aarch64-linux-gnu/libc.so.6+0x22258) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)
...
SUMMARY: AddressSanitizer: heap-use-after-free /root/p9/urcu_cfg.c:25 in reader
exit=1
```

`synchronize_rcu()`가 있으면 reader 네 개가 각자 5,025~6,601번 읽는 동안 어긋난 값도 ASan 경고도 없었습니다. 빼면 reader가 아직 쓰는 객체를 updater가 해제해, ASan이 reader의 `c` 읽기에서 heap-use-after-free를 잡았습니다. 위 로그는 25행(`c->timeout_ms`)이고, 재현 확인으로 다시 돌렸을 때는 23행(`c->max_threads`)이었습니다. 어느 읽기가 먼저 해제된 객체에 닿는지는 실행마다 다릅니다. "freed by thread T0" 스택은 `main`의 `free(old)`(49행)를 가리킵니다. 두 실행 모두 `pthread_barrier`로 reader 네 개가 읽기를 시작한 뒤에 updater가 돌게 했습니다. 실제 장비에서는 이 버그가 경고 없이 엉뚱한 설정값으로 나타납니다.

### Reader 수가 늘 때 — rwlock vs URCU

같은 guest에서 설정 객체 하나를 reader 1~5개가 1초 동안 읽고, writer 하나가 1 ms마다 갱신하는 동안 읽은 횟수를 셌습니다.

```c
// readscale.c — read throughput of one shared config under rwlock vs URCU
#define _LGPL_SOURCE
#include <urcu.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

struct config { long a, b; };
static struct config *cfg;
static pthread_rwlock_t rw = PTHREAD_RWLOCK_INITIALIZER;
static volatile int stop;
static int use_rcu;

static void *reader(void *arg)
{
    unsigned long n = 0;
    long sum = 0;
    if (use_rcu) rcu_register_thread();
    while (!stop) {
        if (use_rcu) {
            rcu_read_lock();
            struct config *c = rcu_dereference(cfg);
            sum += c->a + c->b;
            rcu_read_unlock();
        } else {
            pthread_rwlock_rdlock(&rw);
            sum += cfg->a + cfg->b;
            pthread_rwlock_unlock(&rw);
        }
        n++;
    }
    if (use_rcu) rcu_unregister_thread();
    *(unsigned long *)arg = n + (sum == 42);    /* keep sum alive */
    return NULL;
}

static void *writer(void *arg)                   /* one update per millisecond */
{
    (void)arg;
    for (long v = 1; !stop; v++) {
        struct config *new = malloc(sizeof *new);
        new->a = v; new->b = -v;
        if (use_rcu) {
            struct config *old = rcu_xchg_pointer(&cfg, new);
            synchronize_rcu();
            free(old);
        } else {
            pthread_rwlock_wrlock(&rw);
            struct config *old = cfg; cfg = new;
            pthread_rwlock_unlock(&rw);
            free(old);
        }
        usleep(1000);
    }
    return NULL;
}

int main(int argc, char **argv)
{
    int readers = atoi(argv[2]);
    use_rcu = strcmp(argv[1], "rcu") == 0;
    pthread_t t[16], w;
    unsigned long cnt[16], total = 0;
    cfg = calloc(1, sizeof *cfg);
    for (int i = 0; i < readers; i++) pthread_create(&t[i], NULL, reader, &cnt[i]);
    pthread_create(&w, NULL, writer, NULL);
    sleep(1);
    stop = 1;
    for (int i = 0; i < readers; i++) { pthread_join(t[i], NULL); total += cnt[i]; }
    pthread_join(w, NULL);
    printf("%-6s readers=%d  %6.1f M reads/s\n", argv[1], readers, total / 1e6);
    return 0;
}
```

```text
host: Debian 13 arm64 guest (QEMU -accel hvf, 6 vCPU) on Apple M2 Pro; kernel 6.12.116+deb13-arm64; gcc 14.2.0; liburcu 0.15.2 (urcu-memb flavor)
$ gcc -O2 -Wall readscale.c -o readscale -lurcu
# round 1
rwlock readers=1   162.4 M reads/s
rcu    readers=1   731.7 M reads/s
rwlock readers=2    30.9 M reads/s
rcu    readers=2  1455.7 M reads/s
rwlock readers=4    13.1 M reads/s
rcu    readers=4  2632.7 M reads/s
rwlock readers=5    16.3 M reads/s
rcu    readers=5  2691.7 M reads/s
# round 2
rwlock readers=1   129.9 M reads/s
rcu    readers=1   743.5 M reads/s
rwlock readers=2    31.0 M reads/s
rcu    readers=2  1464.4 M reads/s
rwlock readers=4    11.1 M reads/s
rcu    readers=4  2937.9 M reads/s
rwlock readers=5     9.0 M reads/s
rcu    readers=5  3637.6 M reads/s
# round 3
rwlock readers=1   125.2 M reads/s
rcu    readers=1   746.6 M reads/s
rwlock readers=2    30.2 M reads/s
rcu    readers=2  1476.5 M reads/s
rwlock readers=4    11.0 M reads/s
rcu    readers=4  2934.9 M reads/s
rwlock readers=5     9.1 M reads/s
rcu    readers=5  3552.6 M reads/s
```

`pthread_rwlock`은 reader가 하나일 때 초당 125~162M 번이었다가 둘이 되자 30.2~31.0M 번으로 떨어졌고, 다섯이면 9.0~16.3M 번이었습니다. Guest의 glibc 2.41에서 읽기 lock은 `rwlock->__data.__readers`에 `atomic_fetch_add_acquire`를 합니다(`nptl/pthread_rwlock_common.c` 353–355행). Reader가 모두 같은 word에 쓰므로 그 cache line이 코어 사이를 오갑니다. URCU reader는 공유 word에 쓰지 않아 reader 수에 따라 늘었습니다(1개 732~747M, 5개 2692~3638M). 이것은 이 guest의 숫자이고, 측정 루프가 하는 일이 포인터 두 번 읽기뿐이라 lock 비용이 그대로 드러나는 조건입니다.

### call_rcu (비동기 free)

`synchronize_rcu()`는 sleep하므로 sleep할 수 없는 문맥에서는 쓸 수 없습니다. `call_rcu()`는 "Instead of blocking, it registers a function and argument which are invoked after all ongoing RCU read-side critical sections have completed"이고, block이 금지된 곳이나 update 쪽 성능이 중요한 곳에 쓰라고 문서가 적습니다(`whatisRCU.rst` 232–238행). 위 `rcu_bench.c`의 `config_free_cb()`가 그 형태입니다. 객체 안에 `struct rcu_head`를 두고, callback에서 `container_of()`로 바깥 객체를 찾아 해제합니다. 모듈을 내리기 전에는 `rcu_barrier()`로 남은 callback이 모두 돌았는지 기다려야, callback 코드가 사라진 뒤에 불리는 일이 없습니다.

### List 변경 (rculist.h)

RCU는 reader와 writer 사이만 정리해 줄 뿐 writer끼리의 충돌은 막지 않습니다. 그래서 리스트를 고치는 쪽은 spinlock을 잡고, 읽는 쪽은 `rcu_read_lock()`만 잡습니다. 아래 모듈은 원소 세 개를 넣고 key 2를 지운 뒤 합계를 다시 셉니다. 같은 모듈에서 per-CPU 카운터도 보여 줍니다.

```c
// rcu_list.c — RCU-protected list: writers serialize on a spinlock, readers do not lock
#include <linux/module.h>
#include <linux/percpu.h>
#include <linux/rculist.h>
#include <linux/slab.h>
#include <linux/spinlock.h>

struct entry {
	struct list_head list;
	int key;
};

static LIST_HEAD(g_list);
static DEFINE_SPINLOCK(list_lock);          /* writer vs writer only */
static DEFINE_PER_CPU(unsigned long, hits);

static int add_entry(int key)
{
	struct entry *e = kmalloc(sizeof(*e), GFP_KERNEL);

	if (!e)
		return -ENOMEM;
	e->key = key;
	spin_lock(&list_lock);
	list_add_rcu(&e->list, &g_list);
	spin_unlock(&list_lock);
	return 0;
}

static void remove_entry(struct entry *e)
{
	spin_lock(&list_lock);
	list_del_rcu(&e->list);
	spin_unlock(&list_lock);
	synchronize_rcu();                      /* readers may still be on e */
	kfree(e);
}

static int scan(void)
{
	struct entry *e;
	int sum = 0;

	rcu_read_lock();
	list_for_each_entry_rcu(e, &g_list, list) {
		sum += e->key;
		this_cpu_inc(hits);
	}
	rcu_read_unlock();
	return sum;
}

static int __init rcu_list_init(void)
{
	struct entry *e, *victim = NULL;
	unsigned long total = 0;
	int cpu, i;

	for (i = 1; i <= 3; i++)
		if (add_entry(i))
			return -ENOMEM;
	pr_info("rcu_list: sum before %d\n", scan());

	spin_lock(&list_lock);
	list_for_each_entry(e, &g_list, list)
		if (e->key == 2)
			victim = e;
	spin_unlock(&list_lock);
	if (victim)
		remove_entry(victim);
	pr_info("rcu_list: sum after removing key 2: %d\n", scan());

	for_each_possible_cpu(cpu)
		total += per_cpu(hits, cpu);
	pr_info("rcu_list: entries visited by scan(), summed over CPUs: %lu\n", total);
	return 0;
}

static void __exit rcu_list_exit(void)
{
	struct entry *e, *tmp;

	list_for_each_entry_safe(e, tmp, &g_list, list) {
		list_del_rcu(&e->list);
		synchronize_rcu();
		kfree(e);
	}
}

module_init(rcu_list_init);
module_exit(rcu_list_exit);
MODULE_LICENSE("GPL");
```

위 로그의 `rcu_list:` 세 줄이 결과입니다. 합계가 6에서 4로 바뀌었고, `scan()`이 두 번 돌며 원소를 3 + 2 = 5번 방문했습니다. `list_add_rcu`·`list_del_rcu`·`list_for_each_entry_rcu`는 v6.12 `include/linux/rculist.h` 104, 155, 392행에 있습니다.

### Per-CPU counter

`hits`는 RCU가 아니라 per-CPU 변수입니다. 각 CPU가 자기 사본만 올리므로 공유 cache line을 쓰지 않고, 합계는 읽을 때 모읍니다. 커널 문서는 `this_cpu` 연산이 현재 CPU의 변수를 다른 CPU와의 동기화 비용 없이 다룬다고 설명합니다(`Documentation/core-api/this_cpu_ops.rst` 18–27행). RCU reader가 공유 word에 쓰지 않아서 확장되는 것과 같은 이유입니다. 다만 `for_each_possible_cpu` 합계는 다른 CPU가 올리는 중에 읽으면 그 순간의 근삿값입니다.

## 측정 / 성능 비교

위 실행 결과를 한 표로 모으면 다음과 같습니다.

| 항목 | 측정값 | 환경 |
| --- | --- | --- |
| `rcu_read_lock` + 포인터 읽기 + unlock | 0.31~0.40 ns/반복 | 커널 모듈, 단일 스레드 |
| `read_lock` + 읽기 + unlock | 8.19~9.96 ns/반복 | 같음 |
| `spin_lock` + 읽기 + unlock | 4.62~12.93 ns/반복 | 같음 |
| `synchronize_rcu()` 1회 | 13.2~44.8 ms (중앙값 16.1~16.5 ms) | `CONFIG_HZ=250` |
| `call_rcu()` 반환 | 최대 1,000 ns | callback은 14.6~18.5 ms 뒤 |
| reader 5개 처리량, `pthread_rwlock` | 9.0~16.3M reads/s | liburcu 0.15.2, writer 1 ms 주기 |
| reader 5개 처리량, URCU | 2692~3638M reads/s | 같음 |

환경은 모두 Debian 13 arm64 guest, 커널 `6.12.116+deb13-arm64`(`CONFIG_PREEMPT_VOLUNTARY=y`), gcc 14.2.0입니다. 가상 머신이라 host 부하에 따라 흔들리고, 다른 보드에서는 다시 재야 하는 숫자입니다. 표가 보여 주는 방향은 분명합니다. Reader 쪽은 lock보다 훨씬 싸고 reader 수에 따라 늘어나지만, writer 쪽은 수십 ms를 기다리거나 그만큼 늦게 해제합니다. 쓰기가 잦으면 이 대가가 커지므로 read-mostly일 때 고릅니다.

## 자주 보는 함정

> ⚠️ `rcu_read_lock` 밖에서 `rcu_dereference`

```c
struct config *c = rcu_dereference(cfg);   /* not inside rcu_read_lock() */
```

`rcu_dereference(p)`는 `rcu_dereference_check(p, 0)`이고(`rcupdate.h` 758행), `CONFIG_PROVE_RCU` 커널에서는 read-side 구간 밖에서 부르면 "suspicious rcu_dereference_check() usage" 경고를 냅니다(539행). 배포판 커널처럼 이 옵션이 꺼져 있으면 경고 없이 지나가므로, 개발용 커널에서 켜 두고 잡습니다. 구간 밖에서 얻은 포인터는 grace period가 그것을 지켜 주지 않으므로 위 URCU 예의 use-after-free와 같은 상황이 됩니다.

> ⚠️ Read-side 구간 안에서 sleep

```c
rcu_read_lock();
msleep(10);              /* illegal: blocks inside an RCU read-side critical section */
rcu_read_unlock();
```

문서는 "It is illegal to block while in an RCU read-side critical section"이라고 적습니다(`whatisRCU.rst` 167–168행). 구간 안에서 sleep해야 한다면 SRCU(`include/linux/srcu.h`, "Sleepable Read-Copy Update")를 쓰고, 이때 updater도 `synchronize_srcu()`/`call_srcu()`를 같은 `srcu_struct`로 써야 합니다(`checklist.rst` 238–240행).

> ⚠️ Writer끼리 lock 없이 add/del

```c
list_add_rcu(&e->list, &g_list);   /* two writers at once corrupt the list */
```

`rcu_list.c`의 `list_lock`처럼 writer끼리는 별도 lock이 필요합니다.

> ⚠️ Hot path에서 `synchronize_rcu`

```c
for (i = 0; i < N; i++) {
    rcu_assign_pointer(p, new[i]);
    synchronize_rcu();     /* ~16 ms median on the kernel measured above */
}
```

위 측정 기준이면 N = 100에서 1.6초쯤 멈춥니다. 갱신을 묶어 grace period 한 번으로 덮거나 `call_rcu()`로 넘깁니다. 문서도 expedited primitive를 루프에서 부르고 있다면 갱신을 묶으라고 권합니다(`checklist.rst` 220–228행).

> ⚠️ URCU에서 `rcu_register_thread` 누락

```c
rcu_read_lock();    /* this thread never called rcu_register_thread() */
```

`urcu-memb` flavor는 read-side 구간이 있는 모든 스레드의 등록을 요구합니다(`urcu/urcu-memb.h` 40행). 등록하지 않은 스레드는 `synchronize_rcu()`가 기다려 줄 reader 목록에 없습니다.

## 정리

- RCU reader는 이 커널에서 사실상 컴파일러 장벽뿐이라 반복당 0.31~0.40 ns였고, `rwlock`과 달리 reader 수에 따라 처리량이 늘었습니다.
- 대가는 writer 쪽입니다. `synchronize_rcu()`는 13.2~44.8 ms 잤고, `call_rcu()` callback은 그만큼 늦게 돌았습니다.
- Grace period를 건너뛰고 free하면 ASan이 heap-use-after-free를 잡았습니다.
- Writer끼리는 별도 lock이 필요하고, read-side 구간에서는 block할 수 없습니다. Block이 필요하면 SRCU를 씁니다.
- 사용자 공간은 liburcu로 같은 패턴을 쓰고, reader 스레드는 등록해야 합니다.
- 쓰기가 잦은 데이터에는 grace period 비용이 쌓이므로 rwlock 같은 다른 방법을 고릅니다.

다음 편은 [9-04: Hazard Pointer](/blog/embedded/modern-recipes/part9-04-hazard-pointer)입니다. GC 없이 lock-free 구조의 메모리를 회수하는 또 다른 방법입니다.

## 관련 항목

- [9-04: Hazard Pointer](/blog/embedded/modern-recipes/part9-04-hazard-pointer)
- [9-08: ABA 문제 회피](/blog/embedded/modern-recipes/part9-08-aba-problem)
- [ECPP 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
- [PE 4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
