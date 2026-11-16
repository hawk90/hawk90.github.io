---
title: "Hazard Pointer 분석 — Lock-Free Memory Reclamation"
slug: "embedded/modern-recipes/part9-04-hazard-pointer"
date: 2026-04-18T09:03:00
description: "Lock-free 메모리 회수, ABA 회피, RCU와의 비교, C++ proposal까지 hazard pointer의 원리와 구현을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 104
tags: [recipes, concurrency, hazard-pointer]
topics: ["embedded"]
---

## 한 줄 요약

> **"Hazard pointer는 reader가 *내가 지금 이 객체 쓰는 중*을 광고하는 표지판입니다."** Writer는 어떤 표지판도 가리키지 않는 객체만 free합니다. 이 글은 Michael(2004)의 알고리즘을 그대로 따라 lock-free stack에 붙이고, 붙이기 전후를 AddressSanitizer로 비교합니다.

## 어떤 상황에서 쓰나

Lock-free stack이나 queue에서 가장 어려운 질문은 *언제 free할 수 있는가*입니다. 한 스레드가 node를 막 dereference하려는 순간 다른 스레드가 그 node를 꺼내 free하면 use-after-free가 납니다. 아래 "Hazard pointer가 없으면" 절에서 실제로 그렇게 됩니다.

공사장 비유가 맞습니다. 작업자가 건물 안에 들어갈 때 입구 게시판에 이름표를 걸고, 철거반은 게시판에 이름표가 하나도 없는 건물만 허뭅니다. [9-03의 RCU](/blog/embedded/modern-recipes/part9-03-rcu-basics)가 "들어간 사람이 모두 나올 때까지 기다린다"면, hazard pointer는 "누가 *어느* 건물에 있는지"를 하나하나 적습니다. 그래서 한 작업자가 오래 머물러도 다른 건물은 허물 수 있습니다.

## 핵심 개념

정의와 수치는 Maged M. Michael, *Hazard Pointers: Safe Memory Reclamation for Lock-Free Objects*(IEEE TPDS, Vol. 15, No. 6, 2004년 6월) 3절에서 가져옵니다.

| 요소 | 역할 |
|------|------|
| hazard pointer | 각 스레드가 "지금 보호 중인 포인터"를 공개하는 단일 writer·다중 reader 슬롯. 스레드 N개가 K개씩 가지면 총 H = NK개 |
| retired list | 지울 예정인 node를 모아 두는 스레드별 목록(`rlist`) |
| scan | retired list가 문턱 R에 닿으면 모든 hazard pointer를 모아, 어디에도 없는 node만 해제 |

논문의 수치 보장은 두 가지입니다. 하나는 R을 R = H + Ω(H)로 잡으면 retired node 하나당 처리 시간이 평균 상수가 된다는 것이고, 다른 하나는 아직 해제할 수 없는 retired node 수의 상한이 NR이라는 것입니다. 후자는 "일부 또는 모든 스레드가 지연되거나 죽어도" 성립한다고 적습니다. RCU에서는 reader 하나가 멈추면 grace period가 끝나지 않아 회수가 통째로 멈추지만, hazard pointer에서는 그 reader가 가리키는 node만 남습니다.

**Reader** 순서는 다음과 같습니다.

1. `p = load(src)`
2. 내 hazard pointer에 `p`를 쓴다.
3. `src`를 다시 읽어 아직 `p`인지 확인한다. 다르면 1로.
4. `p`를 쓴다.
5. hazard pointer를 비운다.

**Writer** 순서는 다음과 같습니다.

1. 공유 구조에서 node를 떼어 낸다(CAS 등).
2. `retire(node)`로 retired list에 넣는다. 바로 free하지 않는다.
3. retired list가 R에 닿으면 scan해서 어느 hazard pointer도 가리키지 않는 node만 free한다.

RCU와 비교하면 다음과 같습니다.

| 항목 | RCU (9-03) | Hazard pointer |
|------|-----|----------------|
| reader 비용 | 이 글이 잰 커널에서는 컴파일러 장벽뿐 | 공유 슬롯에 seq_cst store + 재확인 load (아래 절) |
| writer 비용 | grace period 대기 또는 callback | retired list가 R에 닿을 때마다 scan |
| 미해제 객체 상한 | reader가 멈추면 없음 | NR (Michael 2004, 3.1절) |
| reader가 block | 금지 | 가능. 그 node만 남음 |
| 표준 C++ | 없음 | 현재 working draft의 `<hazard_pointer>` (아래 절) |

## 코드 / 실제 사용 예

### 최소 hazard pointer

스레드마다 슬롯 하나를 갖는 가장 작은 구현입니다. 슬롯은 전역 배열에 두어 scan이 모든 스레드의 값을 읽을 수 있게 하고, 각 스레드는 처음 쓸 때 빈 슬롯 하나를 CAS로 차지합니다. 문턱은 논문의 R = H + Ω(H)를 따라 H의 두 배로 잡았습니다.

```cpp
// hp.h — one hazard pointer per thread, Michael (2004) Fig. 2/3 style retire + scan
#include <algorithm>
#include <atomic>
#include <cstdio>
#include <cstdlib>
#include <vector>

constexpr int MAX_THREADS = 16;
constexpr int R = 2 * MAX_THREADS;              // scan threshold: R = H + Omega(H), H = 16

struct alignas(128) hp_slot {                   // 128 B = cache line on the test Mac
    std::atomic<bool> used{false};
    std::atomic<void *> ptr{nullptr};
};
hp_slot g_hp[MAX_THREADS];

struct hp_owner {                               // claims a slot on first use in each thread
    hp_slot *slot = nullptr;
    std::vector<void *> retired;
    void (*deleter)(void *) = nullptr;
    hp_owner() {
        for (auto &s : g_hp) {
            bool expected = false;
            if (s.used.compare_exchange_strong(expected, true)) { slot = &s; return; }
        }
        std::fprintf(stderr, "out of hazard pointer slots\n");
        std::abort();
    }
    ~hp_owner() {                               // hand back the slot; leftovers are scanned once more
        slot->ptr.store(nullptr);
        scan();
        slot->used.store(false);
    }
    void scan() {
        std::vector<void *> live;
        for (auto &s : g_hp)
            if (void *p = s.ptr.load()) live.push_back(p);       // seq_cst load
        std::sort(live.begin(), live.end());
        std::vector<void *> keep;
        for (void *n : retired) {
            if (std::binary_search(live.begin(), live.end(), n)) keep.push_back(n);
            else deleter(n);
        }
        retired.swap(keep);
    }
};
thread_local hp_owner tl_hp;

template <class T>
T *hp_protect(const std::atomic<T *> &src)
{
    T *p = src.load();
    for (;;) {
        tl_hp.slot->ptr.store(p);              // seq_cst: must not pass the reload below
        T *again = src.load();                 // seq_cst
        if (again == p) return p;
        p = again;
    }
}

inline void hp_clear() { tl_hp.slot->ptr.store(nullptr, std::memory_order_release); }

template <class T>
void hp_retire(T *n)
{
    tl_hp.deleter = [](void *q) { delete static_cast<T *>(q); };
    tl_hp.retired.push_back(n);
    if (tl_hp.retired.size() >= static_cast<size_t>(R)) tl_hp.scan();
}
```

`hp_protect`의 store와 재확인 load가 기본값인 `memory_order_seq_cst`인 데는 이유가 있습니다. 바로 다음 절에서 봅니다.

### 왜 release/acquire로는 부족한가

Hazard pointer의 정확성은 "내가 슬롯에 쓴 값을 scan하는 쪽이 보거나, 내가 재확인에서 바뀐 `src`를 보거나, 둘 중 하나는 반드시 일어난다"에 달려 있습니다. 이것은 store 뒤의 load가 그 store를 앞질러서는 안 된다는 조건이고, 유명한 store-buffering(SB) litmus test와 같은 모양입니다. 아래 코드는 두 스레드가 각자 자기 변수에 1을 쓰고 상대 변수를 읽습니다.

```cpp
// sb.cpp — store-buffering litmus: can both threads miss each other's store?
#include <atomic>
#include <cstdio>
#include <thread>

#ifdef SEQ_CST
constexpr auto ST = std::memory_order_seq_cst, LD = std::memory_order_seq_cst;
#else
constexpr auto ST = std::memory_order_release, LD = std::memory_order_acquire;
#endif

constexpr long ROUNDS = 5000000;
std::atomic<int> x, y;
int r1[ROUNDS % 2 + 1], r2[ROUNDS % 2 + 1];
std::atomic<long> start{-1}, done{0};

static void side(std::atomic<int> &mine, std::atomic<int> &other, int *out)
{
    for (long i = 0; i < ROUNDS; i++) {
        while (start.load(std::memory_order_acquire) != i) {}
        mine.store(1, ST);           // "I am using it"
        *out = other.load(LD);       // "is the other one using it?"
        done.fetch_add(1, std::memory_order_acq_rel);
    }
}

int main()
{
    long both_zero = 0;
    std::thread a(side, std::ref(x), std::ref(y), &r1[0]);
    std::thread b(side, std::ref(y), std::ref(x), &r2[0]);
    for (long i = 0; i < ROUNDS; i++) {
        x.store(0); y.store(0);
        done.store(0);
        start.store(i, std::memory_order_release);
        while (done.load(std::memory_order_acquire) != 2) {}
        if (r1[0] == 0 && r2[0] == 0) both_zero++;
    }
    a.join(); b.join();
    std::printf("%ld rounds, both loads saw 0 in %ld\n", ROUNDS, both_zero);
}
```

```text
$ clang++ -std=c++17 -O2 sb.cpp -o sb_relacq && ./sb_relacq
5000000 rounds, both loads saw 0 in 4986231
$ clang++ -std=c++17 -O2 -DSEQ_CST sb.cpp -o sb_sc && ./sb_sc
5000000 rounds, both loads saw 0 in 0
```

Apple M2 Pro에서 release store + acquire load로는 500만 번 중 4,986,231번 두 load가 모두 0을 봤습니다. 두 스레드가 같은 시점에 출발하도록 맞춰 놓았기 때문에 거의 매번 겹친 결과입니다. 두 스레드 모두 "상대가 안 쓰고 있다"고 판단한 셈입니다. Hazard pointer로 옮기면 reader는 "scan이 내 슬롯을 못 봤는데, 나도 바뀐 `src`를 못 봤다"가 되어 해제된 node를 씁니다. Seq_cst로 바꾸면 0번이었습니다. seq_cst 연산은 모든 스레드가 동의하는 하나의 전체 순서 S에 놓이므로(C++ working draft [atomics.order]p4, C11은 N1570 7.17.3p6) 두 load가 모두 상대의 store보다 앞설 수 없습니다. Michael의 논문도 실험 구현에 "Fence instructions were inserted ... wherever memory ordering is required"라고 적습니다(5절).

### Hazard pointer가 없으면 — Treiber stack

아래 stack의 `pop`은 `old->next`를 읽은 뒤 CAS로 `top`을 옮깁니다. `-DNO_HAZARD_POINTER`로 빌드하면 보호 없이 읽고, 꺼낸 node를 바로 `delete`합니다.

```cpp
// stack.cpp — Treiber stack whose pop() is protected by hp.h
#include "hp.h"
#include <thread>

struct snode { snode *next; int val; };
std::atomic<snode *> top{nullptr};

void push(int v)
{
    snode *n = new snode{nullptr, v};
    snode *old = top.load(std::memory_order_relaxed);
    do {
        n->next = old;
    } while (!top.compare_exchange_weak(old, n, std::memory_order_release,
                                        std::memory_order_relaxed));
}

bool pop(int *out)
{
    for (;;) {
#ifdef NO_HAZARD_POINTER
        snode *old = top.load(std::memory_order_acquire);
#else
        snode *old = hp_protect(top);
#endif
        if (!old) { hp_clear(); return false; }
        snode *next = old->next;               // the dereference that needs protection
        if (top.compare_exchange_strong(old, next, std::memory_order_acquire,
                                        std::memory_order_relaxed)) {
            *out = old->val;
            hp_clear();
#ifdef NO_HAZARD_POINTER
            delete old;
#else
            hp_retire(old);
#endif
            return true;
        }
    }
}

int main()
{
    constexpr int THREADS = 8, OPS = 200000;
    std::atomic<long> sum{0};
    std::vector<std::thread> t;
    for (int i = 0; i < THREADS; i++)
        t.emplace_back([&sum] {
            long local = 0;
            for (int k = 0; k < OPS; k++) {
                push(k);
                int v;
                if (pop(&v)) local += v;
            }
            int v;
            while (pop(&v)) local += v;
            sum += local;
        });
    for (auto &th : t) th.join();
    long expect = static_cast<long>(THREADS) * OPS * (OPS - 1) / 2;
    std::printf("popped sum %ld, expected %ld\n", sum.load(), expect);
    return sum.load() != expect;
}
```

스레드 8개가 각각 20만 번 push·pop합니다. 보호를 끈 판을 AddressSanitizer로 세 번 돌린 결과입니다.

```text
$ clang++ -std=c++17 -O2 -g -fsanitize=address -DNO_HAZARD_POINTER stack.cpp -o nohp_asan && ./nohp_asan
exit=134
==12061==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000021830 at pc 0x000104b9de5c bp 0x00016b6c2eb0 sp 0x00016b6c2ea8
READ of size 8 at 0x602000021830 thread T8
    #0 0x000104b9de58 in pop(int*) stack.cpp:27
    #1 0x000104b9de58 in main::$_0::operator()() const stack.cpp:53
SUMMARY: AddressSanitizer: heap-use-after-free stack.cpp:27 in pop(int*)
exit=134
==12069==ERROR: AddressSanitizer: heap-use-after-free on address 0x60200008dc70 at pc 0x0001027fde5c bp 0x00016da62eb0 sp 0x00016da62ea8
READ of size 8 at 0x60200008dc70 thread T8
    #0 0x0001027fde58 in pop(int*) stack.cpp:27
    #1 0x0001027fde58 in main::$_0::operator()() const stack.cpp:53
SUMMARY: AddressSanitizer: heap-use-after-free stack.cpp:27 in pop(int*)
exit=134
==12076==ERROR: AddressSanitizer: heap-use-after-free on address 0x60200002a070 at pc 0x000102ec1e5c bp 0x00016d0e2eb0 sp 0x00016d0e2ea8
READ of size 8 at 0x60200002a070 thread T3
    #0 0x000102ec1e58 in pop(int*) stack.cpp:27
    #1 0x000102ec1e58 in main::$_0::operator()() const stack.cpp:53
SUMMARY: AddressSanitizer: heap-use-after-free stack.cpp:27 in pop(int*)
```

세 번 모두 27행 `old->next` 읽기에서 heap-use-after-free였습니다. 다른 스레드가 같은 node를 먼저 꺼내 `delete`한 뒤입니다. 보호를 켠 판은 ASan과 TSan 모두 조용했고, 꺼낸 값의 합도 기댓값과 같았습니다.

```text
$ clang++ -std=c++17 -O2 -g -fsanitize=address stack.cpp -o hp_asan && ./hp_asan
popped sum 159999200000, expected 159999200000
exit=0
$ clang++ -std=c++17 -O2 -g -fsanitize=thread stack.cpp -o hp_tsan && ./hp_tsan
popped sum 159999200000, expected 159999200000
exit=0
```

이 stack의 CAS는 원래 ABA에 약한 형태입니다. 그런데도 합이 맞은 이유는 Michael 논문 2.3절에 있습니다. 논문은 hazard pointer가 ABA 방지에서 GC와 같은 힘을 갖는다고, 즉 GC 아래에서 ABA-safe인 lock-free 알고리즘에 hazard pointer를 붙이면 GC 없이도 ABA-safe가 된다고 적습니다. `pop`이 보호하는 동안 그 node는 해제·재사용되지 않으므로, `top`이 같은 주소로 돌아오는 경우가 생기지 않습니다. 다만 같은 절은 "GC가 ABA를 항상 막는다"는 것은 오해이고, node를 두 리스트 사이에서 옮기는 프로그램에서는 GC가 있어도 ABA가 난다고 덧붙입니다. Hazard pointer도 그 경우는 막지 못합니다. ABA 자체는 [9-08](/blog/embedded/modern-recipes/part9-08-aba-problem)에서 다룹니다.

### Multiple hazard pointers per thread

연결 리스트를 따라가며 지우는 알고리즘은 "현재 node"와 "다음 node"를 동시에 붙잡아야 하므로 스레드당 슬롯이 둘 이상 필요합니다. 논문의 H = NK에서 K가 그 수이고, 위 `hp.h`의 `hp_slot`에 `ptr`를 배열로 두고 scan이 모두 모으면 됩니다. K는 자료구조가 동시에 dereference하는 포인터 수로 정해지므로 알고리즘마다 다릅니다. 이 글의 stack은 K = 1입니다.

### C++ 표준 `<hazard_pointer>`

현재 C++ working draft는 [saferecl.hp](32.11.3)에 hazard pointer를 둡니다(eel.is/c++draft, 2026-11-16 확인). 원래 이 글의 예제는 `std::hazard_pointer hp;`로 만든 객체에 `protect`를 불렀는데, 기본 생성자로 만든 `hazard_pointer`는 *empty*이고 `protect`의 전제 조건은 "\*this is not empty"입니다. 표준 예제의 형태는 다음과 같습니다.

```cpp
struct Name : std::hazard_pointer_obj_base<Name> { /* fields */ };
std::atomic<Name *> name;

void print_name()
{
    std::hazard_pointer h = std::make_hazard_pointer();
    Name *ptr = h.protect(name);          // protection epoch starts
    /* ... use *ptr ... */
}                                         // protection epoch ends with h

void update_name(Name *new_name)
{
    Name *ptr = name.exchange(new_name);
    ptr->retire();                        // reclaimed once no hazard pointer protects it
}
```

보호할 타입은 `hazard_pointer_obj_base<T>`를 상속해야 하고(32.11.3.1p2), draft는 해제를 기다리는 객체 수에 대해 "unspecified bound"라고만 적습니다(32.11.3.1p7). 이 글을 쓰는 시점에 Apple clang 21.0.0(libc++)과 Debian g++ 14.2.0(libstdc++)은 이 헤더가 없었습니다.

```text
$ echo "#include <hazard_pointer>" | clang++ -std=c++2c -x c++ -fsyntax-only -   # Apple clang 21.0.0, libc++
<stdin>:1:10: fatal error: 'hazard_pointer' file not found
$ echo "#include <hazard_pointer>" | g++ -std=c++26 -x c++ -fsyntax-only -   # Debian g++ 14.2.0, libstdc++
<stdin>:1:10: fatal error: hazard_pointer: No such file or directory
```

## 측정 / 성능 비교

Hazard pointer가 *빠른* 방법인지 Mac에서 쟀습니다. 같은 Treiber stack에 hazard pointer를 붙인 판과 `std::mutex`로 감싼 판을 스레드 1·4·8개로 각각 20만 번 push·pop했습니다.

```cpp
// bench.cpp — push+pop pairs per second: hazard-pointer stack vs a mutex-protected stack
#include "hp.h"
#include <chrono>
#include <mutex>
#include <thread>

struct snode { snode *next; int val; };
std::atomic<snode *> top{nullptr};
std::mutex mtx;
snode *mtop = nullptr;

void hp_push(int v)
{
    snode *n = new snode{nullptr, v};
    snode *old = top.load(std::memory_order_relaxed);
    do { n->next = old; } while (!top.compare_exchange_weak(old, n, std::memory_order_release,
                                                            std::memory_order_relaxed));
}
bool hp_pop(int *out)
{
    for (;;) {
        snode *old = hp_protect(top);
        if (!old) { hp_clear(); return false; }
        snode *next = old->next;
        if (top.compare_exchange_strong(old, next, std::memory_order_acquire,
                                        std::memory_order_relaxed)) {
            *out = old->val; hp_clear(); hp_retire(old); return true;
        }
    }
}
void mx_push(int v) { snode *n = new snode{nullptr, v}; std::lock_guard<std::mutex> g(mtx); n->next = mtop; mtop = n; }
bool mx_pop(int *out)
{
    snode *n;
    { std::lock_guard<std::mutex> g(mtx); n = mtop; if (!n) return false; mtop = n->next; }
    *out = n->val; delete n; return true;
}

template <class Push, class Pop>
double run(int threads, Push push, Pop pop)
{
    constexpr int OPS = 200000;
    std::vector<std::thread> t;
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < threads; i++)
        t.emplace_back([&] { int v; for (int k = 0; k < OPS; k++) { push(k); pop(&v); } });
    for (auto &th : t) th.join();
    std::chrono::duration<double> s = std::chrono::steady_clock::now() - t0;
    return threads * OPS / s.count() / 1e6;
}

int main()
{
    for (int th : {1, 4, 8}) {
        double h = run(th, hp_push, hp_pop);
        double m = run(th, mx_push, mx_pop);
        std::printf("threads=%d  hazard-pointer %.1f M pairs/s   mutex %.1f M pairs/s\n", th, h, m);
    }
}
```

```text
host: Apple M2 Pro (8P+4E), macOS 27.2.1, Apple clang 21.0.0
$ clang++ -std=c++17 -O2 bench.cpp -o bench && ./bench   # 3 runs
threads=1  hazard-pointer 30.3 M pairs/s   mutex 42.7 M pairs/s
threads=4  hazard-pointer 6.1 M pairs/s   mutex 15.1 M pairs/s
threads=8  hazard-pointer 2.7 M pairs/s   mutex 15.2 M pairs/s
threads=1  hazard-pointer 31.4 M pairs/s   mutex 44.2 M pairs/s
threads=4  hazard-pointer 5.8 M pairs/s   mutex 16.0 M pairs/s
threads=8  hazard-pointer 2.6 M pairs/s   mutex 15.4 M pairs/s
threads=1  hazard-pointer 31.8 M pairs/s   mutex 45.6 M pairs/s
threads=4  hazard-pointer 5.5 M pairs/s   mutex 15.9 M pairs/s
threads=8  hazard-pointer 2.7 M pairs/s   mutex 14.9 M pairs/s
```

이 Mac에서는 mutex 판이 모든 경우에 빨랐고, 스레드 8개에서는 hazard pointer 판의 약 5.5~5.9배였습니다. Hazard pointer stack은 모든 스레드가 `top` 하나에 CAS를 걸고, 실패할 때마다 slot store·reload·CAS를 다시 하므로 경합이 심한 단일 지점에서는 이득이 없습니다. 이 결과가 hazard pointer를 쓰지 말라는 뜻은 아닙니다. 이 기법이 주는 것은 *lock 없이도 안전하게 해제한다*와 *멈춘 스레드가 있어도 미해제 객체가 NR개를 넘지 않는다*는 보장이고, 처리량은 자료구조와 경합 정도에 따라 따로 재야 합니다.

## 자주 보는 함정

> ⚠️ Publish 후 재확인 누락

```cpp
T *p = src.load();
tl_hp.slot->ptr.store(p);
return p;                 /* no re-check: src may already have moved on and p been retired */
```

슬롯에 쓰기 *전에* 다른 스레드가 `p`를 떼어 내고 scan까지 마쳤다면, scan은 빈 슬롯을 봤고 `p`는 이미 해제됐습니다. 재확인은 "내 표지판이 걸린 뒤에도 `p`가 아직 거기 있다"를 확인하는 단계입니다.

> ⚠️ 슬롯 store와 재확인 load를 release/acquire로 약하게 씀

위 SB 실험처럼 store 뒤의 load가 store를 앞질러 보일 수 있습니다. 두 연산은 seq_cst로 둡니다.

> ⚠️ 매 retire마다 scan

```cpp
hp_retire(n);
tl_hp.scan();             /* scans all H slots for every single node */
```

Scan은 hazard pointer H개를 모두 읽고 정렬하므로, retire마다 부르면 node 하나당 비용이 H에 비례합니다. 논문의 평균 상수 시간은 R = H + Ω(H)개를 모았다가 한 번에 scan할 때 나옵니다.

> ⚠️ 해제된 객체를 슬롯에 직접 다시 씀

```cpp
hp_retire(n);
tl_hp.slot->ptr.store(n);    /* n may already be gone; publishing it now protects nothing */
```

보호는 `hp_protect`처럼 *공유 위치에서 읽은 값*을 쓰고 그 위치를 다시 확인해야 성립합니다. 이미 떼어 낸 node의 주소를 직접 써 넣으면, 그 사이 scan이 이미 해제했을 수 있습니다.

## 정리

- Hazard pointer는 reader가 보호 중인 포인터를 공개 슬롯에 쓰고, writer는 어떤 슬롯에도 없는 retired node만 해제합니다(Michael 2004).
- 보호 없는 Treiber stack은 ASan에서 세 번 모두 heap-use-after-free였고, 보호를 켜면 ASan·TSan이 조용했습니다.
- 슬롯 store와 재확인 load는 seq_cst여야 합니다. Release/acquire로는 M2에서 SB 결과가 500만 번 중 4,986,231번 나왔습니다.
- Scan 문턱은 R = H + Ω(H), 미해제 node 상한은 NR이고, 멈춘 스레드가 있어도 성립합니다.
- GC 아래에서 ABA-safe인 알고리즘이라면 hazard pointer로 ABA도 막힙니다. Node가 리스트 사이를 옮겨 다니는 경우는 예외입니다.
- 표준 `<hazard_pointer>`는 working draft에 있지만 이 글이 시험한 두 표준 라이브러리에는 아직 없었습니다.
- 처리량은 별개 문제입니다. 이 Mac에서는 단일 hot stack에서 mutex가 더 빨랐습니다.

다음 편은 [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)입니다.

## 관련 항목

- [9-03: RCU 기초](/blog/embedded/modern-recipes/part9-03-rcu-basics)
- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
- [9-08: ABA 문제 회피](/blog/embedded/modern-recipes/part9-08-aba-problem)
- [ECPP 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
- [ECPP 4-04: Lock-Free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
