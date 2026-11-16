---
title: "ABA 문제 회피 — Tagged Pointer·Hazard·Generation Counter"
slug: "embedded/modern-recipes/part9-08-aba-problem"
date: 2026-04-18T09:07:00
description: "ABA 시나리오, tagged pointer (64-bit + tag), version counter, hazard pointer 활용, 실제 사례를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 108
tags: [recipes, concurrency, aba]
topics: ["embedded"]
---

## 한 줄 요약

> **"ABA = CAS가 *값은 같지만 의미가 다른* 상황을 못 구별하는 문제."** 해결은 변경 횟수(tag)를 함께 비교하거나, 보고 있는 node가 재사용되지 못하게 하는 것입니다. 이 글은 ABA를 한 스레드에서 단계별로 재연하고, 8스레드 stack을 실제로 망가뜨린 뒤, tag가 그것을 막는 것과 16비트 tag가 한 바퀴 돌아 다시 뚫리는 것을 보여 줍니다.

## 어떤 상황에서 쓰나

Lock-free stack의 pop, free list, node를 재사용하는 큐에서 나타납니다. 주차장 비유가 맞습니다. 내 차 자리(주소 A)를 보고 잠깐 자리를 비운 사이, 차가 빠지고 다른 차가 같은 자리에 섰습니다. 돌아와서 "A 자리에 차가 있다"만 확인하면 내 차인 줄 압니다. 번호판(tag)까지 봐야 다른 차라는 것을 압니다.

Michael(2004)은 이 문제가 IBM System/370의 CAS 문서에서 처음 보고됐고, 메모리 회수와 상관없이 막아야 하는 문제라고 적습니다. 또 GC가 ABA를 항상 막아 준다는 것은 오해이며, node를 두 리스트 사이에서 옮기는 프로그램에서는 완벽한 GC 아래서도 ABA가 난다고 덧붙입니다(*Hazard Pointers*, IEEE TPDS 15(6), 2.3절).

## 핵심 개념

시나리오는 다음과 같습니다.

1. T1: `top`을 읽어 A, `A->next`를 읽어 B를 얻습니다.
2. T1이 멈춥니다.
3. T2: A를 pop하고, B를 pop하고, A를 다시 push합니다. stack은 이제 A → C이고 B는 빠졌습니다.
4. T1: `CAS(top, A, B)`가 성공합니다. `top`이 아직 A이기 때문입니다. 결과로 `top`은 이미 빠진 B를 가리킵니다.

막는 방법은 세 갈래입니다.

1. **Tag(version)** — 포인터와 함께 매번 늘어나는 번호를 한 CAS로 비교합니다. 16바이트 CAS를 쓰거나, 포인터의 쓰지 않는 상위 비트에 넣습니다.
2. **Hazard pointer** — 다른 스레드가 보고 있는 node는 해제·재사용하지 않습니다([9-04](/blog/embedded/modern-recipes/part9-04-hazard-pointer)).
3. **RCU/epoch** — grace period가 끝나기 전에는 해제하지 않습니다([9-03](/blog/embedded/modern-recipes/part9-03-rcu-basics)).

2와 3은 *메모리 해제·재사용* 때문에 생기는 ABA를 막습니다. 위 시나리오처럼 같은 node를 다시 push하는 경우는 해제가 없으므로 tag가 필요합니다.

## 코드 / 실제 사용 예

### ABA를 한 단계씩 재연

스레드 경쟁에 기대지 않고 위 4단계를 한 스레드에서 순서대로 실행합니다. 같은 일을 일반 포인터 CAS와 `{pointer, tag}` 16바이트 CAS 두 가지로 합니다.

```cpp
// aba_steps.cpp — the ABA interleaving replayed step by step in one thread
#include <atomic>
#include <cstdint>
#include <cstdio>

struct node { node *next; int v; };
node pool[3] = { {nullptr, 'A'}, {nullptr, 'B'}, {nullptr, 'C'} };
node *const A = &pool[0], *const B = &pool[1], *const C = &pool[2];

struct tagged { node *p; std::uint64_t tag; };

int main()
{
    /* stack: A -> B -> C */
    A->next = B; B->next = C; C->next = nullptr;
    std::atomic<node *> top{A};
    std::atomic<tagged> ttop{tagged{A, 0}};

    /* T1 starts pop(): reads top and top->next, then is preempted */
    node *t1_cur = top.load();
    node *t1_next = t1_cur->next;                       // B
    tagged t1_tcur = ttop.load();

    /* T2 runs: pop A, pop B, push A back (A's memory reused for the same node) */
    top.store(B); ttop.store(tagged{B, 1});             // pop A
    top.store(C); ttop.store(tagged{C, 2});             // pop B (B is now free)
    A->next = C; top.store(A); ttop.store(tagged{A, 3});// push A: stack is A -> C

    /* T1 resumes */
    bool ok = top.compare_exchange_strong(t1_cur, t1_next);
    std::printf("plain pointer CAS: %s, top is now %c (B was already popped)\n",
                ok ? "succeeded" : "failed", top.load()->v);

    tagged want{t1_next, t1_tcur.tag + 1};
    bool tok = ttop.compare_exchange_strong(t1_tcur, want);
    std::printf("tagged CAS:        %s, current tag %llu, top is %c\n",
                tok ? "succeeded" : "failed", (unsigned long long)ttop.load().tag, ttop.load().p->v);
}
```

```text
$ clang++ -std=c++17 -O2 aba_steps.cpp -o aba_steps && ./aba_steps
plain pointer CAS: succeeded, top is now B (B was already popped)
tagged CAS:        failed, current tag 3, top is A
```

일반 포인터 CAS는 성공해 `top`이 이미 pop된 B를 가리키게 됐습니다. Tagged CAS는 tag가 0에서 3으로 바뀐 것을 보고 실패했습니다. T1은 실패한 값을 받아 다시 시도하므로 올바른 `top`(A)에서 출발하게 됩니다.

### 8스레드에서 실제로 망가지는가

Node 64개짜리 pool을 stack에 넣고 스레드 8개가 각자 200만 번 pop한 node를 바로 push합니다. Node를 해제하지 않으므로 use-after-free는 없고, 남는 문제는 ABA뿐입니다. 끝나고 stack을 따라가며 node를 셉니다.

```cpp
// aba_stress.cpp — 8 threads pop/push nodes of a fixed pool; count nodes at the end
#include <atomic>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <thread>
#include <vector>

struct node { std::atomic<node *> next; int id; };   // atomic: read while another thread may write it
constexpr int NODES = 64, THREADS = 8, OPS = 2000000;
node pool[NODES];

struct tagged { node *p; std::uint64_t tag; };
std::atomic<node *> top;
std::atomic<tagged> ttop;
bool use_tag;

node *pop()
{
    if (use_tag) {
        tagged cur = ttop.load(std::memory_order_acquire);
        while (cur.p && !ttop.compare_exchange_weak(cur, tagged{cur.p->next.load(std::memory_order_relaxed), cur.tag + 1},
                                                    std::memory_order_acquire)) {}
        return cur.p;
    }
    node *cur = top.load(std::memory_order_acquire);
    while (cur && !top.compare_exchange_weak(cur, cur->next.load(std::memory_order_relaxed),
                                         std::memory_order_acquire)) {}
    return cur;
}

void push(node *n)
{
    if (use_tag) {
        tagged cur = ttop.load(std::memory_order_relaxed);
        do { n->next.store(cur.p, std::memory_order_relaxed); } while (!ttop.compare_exchange_weak(cur, tagged{n, cur.tag + 1},
                                                                    std::memory_order_release));
        return;
    }
    node *cur = top.load(std::memory_order_relaxed);
    do { n->next.store(cur, std::memory_order_relaxed); } while (!top.compare_exchange_weak(cur, n, std::memory_order_release));
}

int main(int argc, char **argv)
{
    use_tag = argc > 1 && !std::strcmp(argv[1], "tagged");
    for (int i = 0; i < NODES; i++) { pool[i].id = i; pool[i].next.store(i + 1 < NODES ? &pool[i + 1] : nullptr); }
    top = &pool[0]; ttop = tagged{&pool[0], 0};
    std::vector<std::thread> t;
    for (int i = 0; i < THREADS; i++)
        t.emplace_back([] { for (int k = 0; k < OPS; k++) if (node *n = pop()) push(n); });
    for (auto &x : t) x.join();
    int count = 0, seen[NODES] = {0}, dup = 0;
    for (node *n = use_tag ? ttop.load().p : top.load(); n && count <= NODES; n = n->next, count++)
        if (seen[n->id]++) dup++;
    std::printf("%-7s nodes reachable %d of %d%s\n", use_tag ? "tagged" : "plain",
                count > NODES ? -1 : count, NODES, dup ? " (cycle: a node appears twice)" : "");
}
```

```text
$ clang++ -std=c++17 -O2 aba_stress.cpp -o aba_stress && ./aba_stress plain; ./aba_stress tagged   # 3 rounds
plain   nodes reachable -1 of 64 (cycle: a node appears twice)
tagged  nodes reachable 64 of 64
plain   nodes reachable -1 of 64 (cycle: a node appears twice)
tagged  nodes reachable 64 of 64
plain   nodes reachable -1 of 64 (cycle: a node appears twice)
tagged  nodes reachable 64 of 64
$ clang++ -std=c++17 -O1 -g -fsanitize=thread aba_stress.cpp -o aba_tsan && ./aba_tsan tagged
tagged  nodes reachable 64 of 64
exit=0
```

일반 포인터 판은 세 번 모두 stack이 고리(cycle)가 됐습니다. 같은 node가 두 번 나타나 64개를 넘어도 끝나지 않았습니다. Tag 판은 세 번 모두 64개가 정확히 남았고, TSan으로 돌려도 race 보고가 없었습니다. `next`를 `std::atomic`으로 둔 것은 한 스레드가 읽는 동안 다른 스레드가 같은 node를 push하며 쓸 수 있기 때문입니다.

### Tagged pointer (struct + 16바이트 CAS)

위 두 프로그램의 `tagged` 구조체가 이 방식입니다. 16바이트 CAS가 lock-free인지는 컴파일러와 런타임에 달려 있습니다. [9-05](/blog/embedded/modern-recipes/part9-05-cas-patterns)에서 같은 M2 위에서도 macOS의 Apple clang은 LSE `caspal` 한 명령을, Debian의 g++ 14.2.0은 libatomic의 `__atomic_compare_exchange_16` 호출을 만들었습니다. 후자는 `is_always_lock_free`가 0이었습니다.

### 포인터 상위 비트에 16비트 tag

16바이트 CAS가 없거나 lock-free가 아니면, 8바이트 포인터의 쓰지 않는 상위 비트에 tag를 넣고 8바이트 CAS 하나로 처리하기도 합니다. 그 비트가 정말 비어 있는지는 OS와 하드웨어 설정이 정합니다. AArch64 Linux v6.12 문서 기준으로 정리하면 다음과 같습니다.

- 사용자 공간 주소는 기본적으로 48비트 범위에서 나옵니다. 52비트 VA를 지원하는 커널이라도 사용자 프로그램이 48비트보다 큰 mmap hint를 주어 "opt-in"해야 52비트 주소를 받습니다(`Documentation/arch/arm64/memory.rst` 142–149행). 이 글의 Debian guest 커널도 `CONFIG_ARM64_VA_BITS=52`입니다.
- 하드웨어는 사용자 주소의 최상위 바이트(63:56)를 주소 변환에서 무시합니다(TBI, `tagged-pointers.rst` 12–15행). 그래도 그 아래 55:48비트는 무시되지 않으므로, tag를 넣은 값은 dereference 전에 반드시 마스크해야 합니다.
- MTE를 쓰면 63:56 중 59:56비트가 메모리 태그 검사에 쓰입니다(`memory-tagging-extension.rst` 14–24행). Pointer Authentication의 PAC는 "55 minus the virtual address size" 비트를 상위에 차지합니다(`pointer-authentication.rst` 52–54행). 이 Debian 커널은 `CONFIG_ARM64_MTE=y`, `CONFIG_ARM64_PTR_AUTH=y`입니다.

그래서 상위 비트 tag는 "MTE·PAC를 쓰지 않는 프로세스, 48비트 주소"라는 조건을 확인한 뒤에 씁니다. 이 Mac에서 정적 객체의 주소는 상위 16비트가 0이었습니다(아래 출력 첫 줄). 다른 운영체제의 주소 배치는 이 글에서 확인하지 않았습니다.

16비트 tag의 진짜 한계는 wraparound입니다. 느린 스레드가 값을 읽은 뒤 다른 스레드들이 정확히 65,536번 갱신하면 tag가 한 바퀴 돌아 같은 값이 됩니다.

```cpp
// tagwrap.cpp — a 16-bit tag in the top bits repeats after 65536 updates
#include <atomic>
#include <cstdint>
#include <cstdio>

static inline std::uintptr_t pack(void *p, std::uint16_t tag) { return (std::uintptr_t)p | ((std::uintptr_t)tag << 48); }

int main()
{
    static int obj;
    std::printf("&obj = %p, top 16 bits = 0x%04llx\n", (void *)&obj,
                (unsigned long long)((std::uintptr_t)&obj >> 48));
    std::atomic<std::uintptr_t> top{pack(&obj, 0)};
    std::uintptr_t seen = top.load();                     // a slow thread remembers this
    for (unsigned i = 1; i <= 65536; i++)                 // others update 65536 times, same pointer
        top.store(pack(&obj, (std::uint16_t)i));
    bool ok = top.compare_exchange_strong(seen, pack(&obj, 1));
    std::printf("after 65536 updates the slow thread's CAS %s\n", ok ? "SUCCEEDED (tag wrapped)" : "failed");
}
```

```text
$ clang++ -std=c++17 -O2 tagwrap.cpp -o tagwrap && ./tagwrap
&obj = 0x100974000, top 16 bits = 0x0000
after 65536 updates the slow thread's CAS SUCCEEDED (tag wrapped)
```

65,536번 갱신 뒤 느린 스레드의 CAS가 성공했습니다. 위 8스레드 실험에서 한 스레드가 200만 번 연산한 것을 보면, 선점된 스레드가 다시 돌기 전에 다른 스레드들이 65,536번 갱신하는 일은 충분히 가능한 규모입니다(실행 수로부터의 추론이고, 선점 시간 자체는 재지 않았습니다). 그래서 상위 비트 tag를 쓰려면 "한 스레드가 멈춰 있는 최대 시간 × 갱신 빈도"가 2^16보다 작다는 근거가 필요하고, 그 근거가 없으면 64비트 tag(16바이트 CAS)나 hazard pointer를 씁니다.

### Hazard pointer로 회피

[9-04](/blog/embedded/modern-recipes/part9-04-hazard-pointer)에서 hazard pointer로 보호한 Treiber stack은 ABA에 약한 CAS를 그대로 쓰면서도 8스레드에서 ASan·TSan이 조용했고 합이 맞았습니다. 보호하는 동안 node가 해제·재사용되지 않으므로, *메모리 재사용 때문에* 같은 주소가 돌아오는 경로가 막히기 때문입니다. Michael은 GC 아래에서 ABA-safe인 알고리즘이라면 hazard pointer로 GC 없이도 ABA-safe가 된다고 적습니다(2.3절). 다만 위 `aba_steps`처럼 같은 node를 해제 없이 다시 넣는 경우는 해당하지 않습니다.

### RCU 기반 (Linux 커널 식)

```c
rcu_read_lock();
list_for_each_entry_rcu(e, &head, list)
    process(e);
rcu_read_unlock();

/* writer, under the list's spinlock */
list_del_rcu(&e->list);
call_rcu(&e->rcu, free_entry);    /* freed only after a grace period */
```

RCU도 reader가 볼 수 있는 동안 node를 해제하지 않으므로, 해제·재할당으로 같은 주소가 돌아오는 ABA는 생기지 않습니다. RCU list writer는 서로 spinlock으로 직렬화하므로 writer 사이의 CAS 경쟁 자체가 없습니다. 실행 예는 [9-03](/blog/embedded/modern-recipes/part9-03-rcu-basics)의 `rcu_list.ko`에 있습니다.

## 측정 / 성능 비교

위 실행 결과를 모으면 다음과 같습니다(Apple M2 Pro, macOS 27.2.1, Apple clang 21.0.0).

| 방식 | 결과 | 근거 |
|------|------|------|
| 일반 포인터 CAS | 단계 재연에서 CAS 성공·stack 손상, 8스레드에서 3/3 cycle | `aba_steps`, `aba_stress plain` |
| `{pointer, 64비트 tag}` 16바이트 CAS | 단계 재연에서 CAS 실패, 8스레드에서 3/3 정상, TSan 조용 | `aba_steps`, `aba_stress tagged` |
| 상위 16비트 tag | 65,536번 갱신 뒤 CAS 다시 성공 | `tagwrap` |
| Hazard pointer | 8스레드 Treiber stack, ASan·TSan 조용 | 9-04 |

비용은 이 글에서 따로 재지 않았습니다. 16바이트 CAS가 libatomic 호출이 되는 환경에서는 그 함수의 비용을 따로 재야 하고, hazard pointer stack이 이 Mac의 단일 hot stack에서 mutex보다 느렸던 측정은 [9-04](/blog/embedded/modern-recipes/part9-04-hazard-pointer)에 있습니다.

## 자주 보는 함정

> ⚠️ 16비트 tag wraparound

```cpp
top.store(pack(p, (std::uint16_t)(tag + 1)));   /* wraps every 65536 updates */
```

위 `tagwrap` 실행처럼 정확히 65,536번 뒤에 같은 값이 됩니다. 스레드가 멈출 수 있는 최대 시간과 갱신 빈도로 따져 봅니다.

> ⚠️ Tag만 비교하고 포인터는 따로

```cpp
if (cur.tag == old.tag) top_ptr.store(next);   /* two separate steps: not atomic */
```

포인터와 tag는 *한 번의* CAS로 같이 비교하고 같이 바꿔야 합니다.

> ⚠️ 상위 비트가 비어 있다고 가정

MTE는 59:56비트를, PAC는 VA 크기에 따라 그 아래 비트를 씁니다. 52비트 주소를 opt-in한 프로세스에서는 51:48비트도 주소입니다. 위 Linux 문서의 조건을 확인하지 않은 상위 비트 tag는 쓰지 않습니다.

> ⚠️ 포인터 CAS와 version 증가를 따로 함

```cpp
top.compare_exchange_weak(cur, next);
version.fetch_add(1);    /* another thread can run between the two */
```

두 atomic을 따로 바꾸면 그 사이에 다른 스레드가 끼어들 수 있어 version이 포인터 상태를 대표하지 못합니다. 하나의 CAS로 묶을 수 없으면 hazard pointer나 RCU로 우회합니다.

## 정리

- ABA는 CAS가 "같은 값"만 보고 그 사이의 변경을 놓치는 문제입니다. 단계 재연에서 일반 포인터 CAS는 이미 빠진 node를 `top`에 걸었습니다.
- 8스레드 stack은 일반 포인터 CAS로 세 번 모두 cycle이 됐고, `{pointer, tag}` 16바이트 CAS로는 세 번 모두 정상이었습니다.
- 상위 16비트 tag는 65,536번 갱신 뒤 다시 뚫립니다. AArch64 Linux에서는 MTE·PAC·52비트 VA 조건도 확인해야 합니다.
- Hazard pointer와 RCU는 메모리 재사용으로 생기는 ABA를 막지만, 해제 없이 같은 node를 다시 넣는 경우까지 막지는 않습니다.
- 16바이트 CAS의 lock-freedom은 컴파일러·런타임마다 다르므로 대상에서 확인합니다.

다음 편은 [9-09: False Sharing 해결](/blog/embedded/modern-recipes/part9-09-false-sharing)입니다.

## 관련 항목

- [9-03: RCU 기초](/blog/embedded/modern-recipes/part9-03-rcu-basics)
- [9-04: Hazard Pointer](/blog/embedded/modern-recipes/part9-04-hazard-pointer)
- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-10: MPMC 큐](/blog/embedded/modern-recipes/part9-10-mpmc-queue)
- [ECPP 4-04: Lock-Free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
