---
title: "6-03: 사례 — Lock Contention (p99 spike → RCU 재설계)"
date: 2026-05-08T32:00:00
description: "Network packet 처리 p99 spike. perf lock으로 routing table mutex 발견. RCU로 전환."
series: "Embedded Performance Engineering"
seriesOrder: 49
tags: [case-study, lock, contention, rcu, routing]
draft: true
---

## 한 줄 요약

> **"P99 latency spike — routing table mutex"** — RCU로 read lock-free, throughput 10x.

## 시나리오 — 5G 기지국 라우터

```text
보드: Marvell Octeon — 16 core ARM Cortex-A72
역할: 5G UPF (User Plane Function) — packet routing
QoS: avg latency < 50 µs, p99 < 200 µs

증상:
  - avg latency 30 µs (OK)
  - p99 latency 1500 µs (target 200 µs 7x 초과)
  - Throughput 4 Gbps (target 10 Gbps)
```

## 측정 — perf stat

```bash
perf stat -e cycles,instructions,cache-misses ./upf_app

# IPC 1.2 — bad (target 2+)
# cache-misses 8% — moderate
# 다른 metric은 normal
```

CPU 자체는 OK — *대기 시간*이 문제.

## 측정 — perf lock

```bash
sudo perf lock record -a ./upf_app
sudo perf lock report

# Name              acquired   wait_total(s)   wait_avg(s)
# routing_mutex      234,567       45.234        0.000193   ← hot!
# config_rwlock        1,234        0.012        0.000010
# log_mutex           12,345        0.234        0.000019
```

`routing_mutex`:
- 234K acquired
- 45 sec wait total (over 5 sec sample!)
- avg 193 µs wait

→ Hot lock 발견.

## 코드 — 원인

```c
struct routing_table {
    pthread_mutex_t lock;
    struct route entries[100000];
    int count;
};

struct routing_table g_table;

/* Per packet — 16 core 동시 */
void route_packet(struct packet *p) {
    pthread_mutex_lock(&g_table.lock);
    struct route *r = find_route(g_table.entries, g_table.count, p->dest);
    pthread_mutex_unlock(&g_table.lock);
    
    forward(p, r);
}

/* 가끔 — control thread */
void update_route(struct route new_r) {
    pthread_mutex_lock(&g_table.lock);
    add_route(g_table.entries, &g_table.count, new_r);
    pthread_mutex_unlock(&g_table.lock);
}
```

매 packet → mutex acquire/release. 16 core serialize.

## 해결 1 — RW-Lock

```c
struct routing_table {
    pthread_rwlock_t lock;
    /* ... */
};

void route_packet(struct packet *p) {
    pthread_rwlock_rdlock(&g_table.lock);
    /* find_route */
    pthread_rwlock_unlock(&g_table.lock);
}

void update_route(...) {
    pthread_rwlock_wrlock(&g_table.lock);
    /* add_route */
    pthread_rwlock_unlock(&g_table.lock);
}
```

Read 동시 — 그러나 *RW-lock 내부 atomic*도 false sharing.

```bash
# 측정
# p99 latency 1500 µs → 400 µs   (2x 향상)
# Throughput 4 → 7 Gbps         (대단)
```

여전히 target 미달.

## 해결 2 — RCU

```c
#include <urcu.h>

struct routing_table {
    struct route_entry *array;   /* pointer */
    int count;
};

struct routing_table *g_table;   /* atomic pointer */

void route_packet(struct packet *p) {
    rcu_read_lock();
    struct routing_table *t = rcu_dereference(g_table);
    struct route *r = find_route(t->array, t->count, p->dest);
    rcu_read_unlock();
    
    forward(p, r);
}

void update_route(struct route new_r) {
    struct routing_table *new_t = make_copy(g_table);
    add_route(new_t->array, &new_t->count, new_r);
    
    struct routing_table *old = rcu_xchg_pointer(&g_table, new_t);
    synchronize_rcu();
    free(old);
}
```

Read = *lock 없음, atomic read만*. Writer = 새 copy + atomic swap.

```bash
# 측정
# p99 latency 1500 µs → 80 µs   (target 200 µs OK)
# Throughput 4 → 11 Gbps        (target 10 Gbps OK)
# Lock contention → 0
```

## userspace RCU (URCU) — liburcu

```c
#include <urcu.h>
#include <urcu/rculist.h>

/* QSBR (Quiescent-State-Based Reclamation) — fastest */
URCU_DEFINE_QSBR();

void worker(void *arg) {
    rcu_register_thread();
    while (1) {
        rcu_quiescent_state();   /* yield to RCU */
        process_packet();
    }
    rcu_unregister_thread();
}
```

QSBR — *read 거의 0 비용*. 5G·DPDK 표준.

## Linux Kernel RCU

```c
/* Linux kernel — RCU 표준 */
rcu_read_lock();
struct foo *p = rcu_dereference(global_foo);
use(p);
rcu_read_unlock();

/* Writer */
struct foo *new_foo = kmalloc(...);
*new_foo = *old_foo;
new_foo->field = new_value;
rcu_assign_pointer(global_foo, new_foo);
synchronize_rcu();
kfree(old_foo);
```

Routing table·dentry·VFS — Linux kernel 곳곳에 RCU.

## 측정 흐름 정리

```text
1. p99 latency 측정 — avg는 normal
2. perf lock — hot lock 식별
3. Lock holder·waiter 분석
4. 해결 1: RW-lock (2x 향상)
5. 해결 2: RCU (3x 향상, target 도달)
6. Throughput·latency 양쪽 확인
```

## RCU vs Lock-Free Hash

```c
/* 대안 1: Lock-free hash table */
/* Cliff Click·Folly 등 — 매우 빠름 but ABA·memory ordering 복잡 */

/* 대안 2: RCU — read 거의 무료, write 비쌈, grace period 필요 */

/* 대안 3: Seqlock — read retry, write 직렬 */
```

선택 기준:
- Read 압도적 + writer 드물게 → **RCU**
- Read 압도적 + 작은 value → Seqlock
- Write 빈번 → lock-free hash

## DPDK ACL (Access Control List)

```c
struct rte_acl_ctx *acx = rte_acl_create(&param);
/* Lock-free read, lock-based update */
rte_acl_classify(acx, data, results, num, RTE_ACL_MAX_CATEGORIES);
```

DPDK — *lock-free packet classification*. 10G+ ethernet 표준.

## Per-CPU Routing Table

```c
struct routing_table local_table[NUM_CORES];   /* per-core copy */

/* Update — broadcast to all cores */
void update_route(struct route r) {
    for (int i = 0; i < NUM_CORES; i++) {
        send_ipi(i, UPDATE_ROUTE, r);
    }
}

/* Read — local only */
void route(struct packet *p) {
    int cpu = get_current_cpu();
    struct route *r = find(&local_table[cpu], p->dest);
    forward(p, r);
}
```

Read = *false sharing 0, contention 0*. Update = IPI broadcast.

자동차 *real-time bus*·5G UPF 일부 — per-CPU 사용.

## Lesson Learned

```text
1. Avg latency OK ≠ system OK — p99·p999 봐야
2. Lock contention은 *측정으로* 발견 (추측 X)
3. RW-lock은 *부분 해결* — 내부 atomic 여전
4. RCU = read 압도적일 때 압도적 해결
5. Per-CPU + IPI = ultimate scalability
```

## Linux Kernel Routing — RCU 사용

```text
Linux kernel net/ipv4/fib_trie.c:
  - FIB (Forwarding Information Base) trie
  - RCU read for lookup
  - Writer: lock + rcu_assign_pointer
  - 표준 5G·서버 OS 그대로 사용
```

Linux network stack — *RCU 곳곳*. Kernel hacker가 *수십 년* 다듬은 표준.

## 자주 하는 실수

> ⚠️ Avg latency만 보고 OK

```bash
perf stat → avg 30 µs
# 실제 p99 1500 µs — 다른 metric 측정 안 함
```

→ histogram·percentile 측정.

> ⚠️ RW-lock으로 만족

```text
"Read parallel 됐으니 끝" — 그러나 RW-lock 자체 contention
```

→ RCU·per-CPU 고려.

> ⚠️ RCU의 memory bloat

```c
/* Old copy 잠시 살아 있음 */
struct large *new = malloc(100 MB);
rcu_assign_pointer(global, new);
/* old도 100 MB — 두 copy 살아 있는 시간 */
```

→ grace period 짧게, copy 줄임.

> ⚠️ Write 빈번 RCU

```c
/* 매 packet마다 update — grace period × N */
```

→ batch update 또는 lock-free hash.

## 정리

- P99 latency spike — **perf lock**으로 hot lock 식별.
- RW-lock = 부분 해결, **RCU** = 극적 향상.
- Read 압도적 → RCU 가장 효율.
- **Per-CPU + IPI** = ultimate scaling.
- DPDK·Linux network stack = RCU 표준.
- 5G UPF·자동차 sensor fusion 적용.

다음 편은 **DMA Tuning**.

## 관련 항목

- [6-02: Cache Thrashing](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)
- [6-04: DMA Tuning](/blog/embedded/performance-engineering/part6-04-case-dma-tuning)
- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
