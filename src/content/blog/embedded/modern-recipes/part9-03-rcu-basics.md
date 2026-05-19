---
title: "9-03: RCU (Read-Copy-Update) 기초"
date: 2026-05-16T07:00:00
description: "RCU 원리, rcu_read_lock, grace period, synchronize_rcu, 임베디드 적용(URCU)을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 103
tags: [recipes, concurrency, rcu]
---

## 한 줄 요약

> **"RCU = reader가 비용 0, writer가 모든 비용을 부담하는 read-mostly 동기화."** 핵심은 *grace period*입니다. 모든 reader가 한 번씩 *quiescent state*를 지나야 옛 객체를 free할 수 있습니다.

## 어떤 상황에서 쓰나

routing table, config object, kernel module 목록처럼 *읽기는 자주, 쓰기는 가끔*인 데이터에 RCU가 빛납니다. Reader 쪽은 lock도, atomic도 안 쓰니 contention이 0에 가깝습니다. SMP 환경에서 reader 수가 늘어도 성능이 일정합니다.

리눅스 커널이 RCU를 30년 가까이 운영 중이고, 사용자 공간에서도 liburcu(URCU)로 같은 패턴을 쓸 수 있습니다. 임베디드 Linux에서 routing daemon, telemetry aggregator 같은 read-mostly 자료구조에 적용합니다.

## 핵심 개념

| API | 동작 |
|-----|------|
| `rcu_read_lock` | reader 진입 — 사실상 `preempt_disable` 또는 그보다 가벼움 |
| `rcu_dereference` | protected pointer를 안전하게 읽음 |
| `rcu_read_unlock` | reader 탈출 — quiescent state 신호 가능 |
| `rcu_assign_pointer` | writer가 새 객체 publish |
| `synchronize_rcu` | 모든 in-flight reader가 끝날 때까지 wait (grace period) |
| `call_rcu` | callback을 grace period 후 호출 (sleep 안 하고 free) |

전형적인 update 흐름입니다.

1. `new = copy + modify`
2. `rcu_assign_pointer(global, new)`
3. `synchronize_rcu` (또는 `call_rcu`)
4. `free(old)`

핵심 보장은 *모든 진행 중 reader가 끝난 후*에만 옛 객체가 free된다는 점입니다.

```text
RCU의 trade-off
- reader O(1), 0 contention
- writer는 grace period 만큼 wait
- 메모리 사용량 (한순간 old + new 동시 존재)
- writer가 빈번하면 RWLock이 더 나음
```

## 코드 / 실제 사용 예

### Linux kernel RCU

```c
struct config *cfg;

void writer(void) {
    struct config *old, *new;

    new = kmalloc(sizeof(*new), GFP_KERNEL);
    *new = *current_cfg();
    new->max_threads = 16;

    old = rcu_dereference_protected(cfg, lockdep_is_held(&cfg_mtx));
    rcu_assign_pointer(cfg, new);
    synchronize_rcu();      /* 모든 reader가 끝날 때까지 wait */
    kfree(old);
}

void reader(void) {
    struct config *c;
    rcu_read_lock();
    c = rcu_dereference(cfg);
    process(c);
    rcu_read_unlock();
}
```

reader는 lock도 atomic도 안 씁니다. preemption이 disable되는 정도이므로 cost가 거의 0입니다.

### URCU (User-space RCU)

```c
#include <urcu.h>

struct config *cfg;

void *reader_thread(void *arg) {
    rcu_register_thread();
    for (;;) {
        rcu_read_lock();
        struct config *c = rcu_dereference(cfg);
        process(c);
        rcu_read_unlock();
    }
    rcu_unregister_thread();
}

void update_config(struct config *new_cfg) {
    struct config *old = rcu_xchg_pointer(&cfg, new_cfg);
    synchronize_rcu();
    free(old);
}

int main(void) {
    rcu_init();
    /* threads ... */
}
```

URCU는 liburcu library를 link하면 사용자 공간에서도 RCU semantic을 그대로 씁니다. 임베디드 Linux daemon에 적합합니다.

### call_rcu (비동기 free)

```c
struct foo {
    struct rcu_head rcu;
    int data;
};

static void foo_free(struct rcu_head *r) {
    struct foo *f = container_of(r, struct foo, rcu);
    kfree(f);
}

void writer(void) {
    struct foo *old = rcu_dereference_protected(g, ...);
    rcu_assign_pointer(g, new);
    call_rcu(&old->rcu, foo_free);    /* sleep 없이 grace period 예약 */
}
```

`synchronize_rcu`는 caller가 sleep합니다. ISR이나 atomic context에서는 `call_rcu`로 callback을 예약합니다.

### List 변경 (rculist.h)

```c
#include <linux/rculist.h>

struct entry {
    struct list_head list;
    int key;
};

LIST_HEAD(g_list);

void add_entry(struct entry *e) {
    spin_lock(&list_lock);
    list_add_rcu(&e->list, &g_list);
    spin_unlock(&list_lock);
}

void remove_entry(struct entry *e) {
    spin_lock(&list_lock);
    list_del_rcu(&e->list);
    spin_unlock(&list_lock);
    synchronize_rcu();
    kfree(e);
}

void scan(void) {
    struct entry *e;
    rcu_read_lock();
    list_for_each_entry_rcu(e, &g_list, list) {
        process(e);
    }
    rcu_read_unlock();
}
```

list 변경은 spinlock으로 writer끼리만 막고, scan은 RCU로 무비용 traverse합니다.

### Read-mostly counter (sharded)

```c
/* per-CPU counter — RCU 변종 */
DEFINE_PER_CPU(unsigned long, hits);

void hit(void) {
    this_cpu_inc(hits);
}

unsigned long total(void) {
    unsigned long s = 0;
    for_each_possible_cpu(c) s += per_cpu(hits, c);
    return s;
}
```

per-CPU counter는 RCU와 같은 정신입니다. 각 CPU가 자기 자리만 쓰고, 읽을 때만 모읍니다.

## 측정 / 성능 비교

| 패턴 | reader 1코어 | reader 8코어 scaling |
|---|---|---|
| spinlock | 100 ns | 악화 (contention) |
| rwlock | 150 ns | 일부 scaling |
| RCU | 10 ns | 거의 선형 |

reader가 늘수록 RCU가 압도적입니다. SMP 8코어에서는 보통 50배 이상 차이가 납니다.

```text
writer 비용 비교
spinlock writer         150 ns
rwlock writer           수 µs (모든 reader가 끝나야)
RCU writer + grace     수 ms (grace period 대기)
RCU writer + call_rcu  150 ns (callback 예약)
```

writer는 RCU가 더 비싸므로 *read-mostly*일 때 의미가 있습니다.

## 자주 보는 함정

> rcu_read_lock 밖에서 dereference

```c
struct config *c = rcu_dereference(cfg);   /* unlock 밖 — UB */
```

`rcu_dereference`는 반드시 `rcu_read_lock` 안에서만 호출합니다. 그렇지 않으면 reader가 진행 중인지 RCU가 모릅니다.

> read lock 중에 sleep

```c
rcu_read_lock();
msleep(10);    /* preempt 가능 → grace period 추정 깨짐 */
rcu_read_unlock();
```

전통적 RCU는 reader가 sleep하면 안 됩니다. sleep이 필요한 경우 SRCU(Sleepable RCU)를 씁니다.

> writer만 보호 안 하고 add/del

```c
list_add_rcu(...);   /* spinlock 없음 — writer끼리 race */
```

RCU는 reader와 writer 사이만 보호합니다. 여러 writer는 별도 lock으로 mutual exclusion이 필요합니다.

> synchronize_rcu를 hot path에서

```c
for (i = 0; i < N; i++) {
    new = ...;
    rcu_assign_pointer(p, new);
    synchronize_rcu();     /* 매 iteration ms 대기 */
}
```

여러 update를 한 번에 묶거나 `call_rcu`로 비동기 처리합니다.

> User-space에서 register 누락

```c
/* URCU thread가 rcu_register_thread 안 부름 */
rcu_read_lock();    /* 등록 안 된 thread → assert fail 또는 silent corruption */
```

URCU는 각 thread가 명시적으로 register/unregister해야 합니다.

## 정리

- RCU는 reader 비용 0, writer가 grace period를 부담하는 read-mostly 동기화입니다.
- `rcu_read_lock`과 `rcu_dereference`로 reader를 보호합니다.
- `rcu_assign_pointer`와 `synchronize_rcu`(또는 `call_rcu`)로 writer가 publish합니다.
- 여러 writer는 별도 spinlock이 필요합니다.
- 사용자 공간은 liburcu(URCU)로 같은 패턴을 씁니다.
- Sleep 가능한 reader가 필요하면 SRCU를 씁니다.
- writer가 빈번하면 RWLock이 더 적합합니다.

다음 편은 **Hazard Pointer**입니다. lock-free 메모리 회수를 다룹니다.

## 관련 항목

- [9-04: Hazard Pointer](/blog/embedded/modern-recipes/part9-04-hazard-pointer)
- [9-08: ABA 문제 회피](/blog/embedded/modern-recipes/part9-08-aba-problem)
- [ECPP 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
- [PE 4-07: Lock-Free](/blog/embedded/performance-engineering/part4-07-lock-free)
