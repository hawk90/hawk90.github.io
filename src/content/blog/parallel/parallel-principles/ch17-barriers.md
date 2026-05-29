---
title: "Chapter 17: Barriers"
date: 2026-05-06T17:00:00
description: "Barrier 동기화 — 여러 스레드가 같은 지점에서 만남. Sense-reversing, combining tree, dissemination."
series: "The Art of Multiprocessor Programming"
seriesOrder: 17
tags: [parallel, concurrency, book-review, amp, barrier, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 17 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 일상의 비유로 보기

병렬 계산은 종종 *phase*로 나뉜다 — 1단계가 끝나야 2단계가 시작될 수 있고, 모든 스레드가 1단계를 끝낸 *뒤*에야 다음 단계로 넘어가야 한다. 이때 필요한 동기화가 **barrier**다.

생활 속 비유로 옮긴다. 군대의 행진을 떠올린다. 한 부대가 한 마디씩 발을 맞춰 나아간다. 한 사람이 늦으면 *전원이 그 자리에 멈춰* 기다린다. 모두가 같은 발을 디딘 뒤에야 다음 마디로 넘어간다. 이게 barrier의 본질이다.

각 변종을 한 줄로 정리한다.

- **Simple barrier (counter)** — 부대원이 한 명씩 도착 지점에 모인다. 마지막 사람이 도착하면 *전원이* 다음 단계로 출발한다. 단순한 카운터 한 개로 구현할 수 있다. 다만 *재사용*하려면 문제가 생긴다 — 카운터가 0이 된 직후 새 단계가 시작되는데, 누군가는 아직 직전 단계에서 깨어나는 중이다.
- **Sense-reversing barrier** — 단계마다 *깃발 색*이 바뀐다. 빨강 단계가 끝나면 파랑 깃발, 그다음은 다시 빨강. 각 스레드는 *지금 단계의 색*과 *다음 단계의 색*을 알기 때문에 잘못된 단계에서 깨어나지 않는다. C++20 `std::barrier`가 이 방식이다.
- **Combining tree barrier** — 부대를 페어로 묶고, 페어가 합쳐 더 큰 페어를 이룬다. 토너먼트처럼 위로 올라간다. $N$명이 모이는 데 $O(\log N)$ 단계가 든다. 한 카운터에 모두 몰리는 경합을 분산한다.
- **Dissemination barrier** — 회사의 슬랙 공지처럼 동작한다. 단계 $k$에서 각 스레드 $i$가 스레드 $(i + 2^k) \bmod N$에게 "나 끝났음"을 알린다. $\log_2 N$ 라운드면 모두가 모두의 도착을 안다. 메시지 한 건마다 두 스레드만 만나서 false sharing이 적다.

| 비유 | 시스템 사례 |
|------|------------|
| 마지막 사람 도착하면 전진 | POSIX `pthread_barrier_t`, OpenMP `#pragma omp barrier` |
| 색깔 바뀌는 깃발 | C++20 `std::barrier`, Java `CyclicBarrier` |
| 페어 → 페어 → ... | Tournament/Combining-Tree (학술 구현) |
| 슬랙 단체 공지 | MPI 일부 collective, dissemination barrier |
| GPU thread block 동기화 | CUDA `__syncthreads()`, OpenCL `barrier(CLK_LOCAL_MEM_FENCE)` |

핵심 통찰은 두 가지다. 첫째, *모두 모이는 동기화*가 표면적으로는 단순해 보이지만 캐시 라인 한 줄에 N 스레드가 몰리면 *bouncing*이 일어나 큰 비용이다. 둘째, 같은 의미론을 만족하면서 통신 패턴을 바꾸면 — tree, dissemination — 확장성이 극적으로 달라진다. 17장은 같은 barrier를 *어떻게 만드는가*의 카탈로그다.

## 17.1 Barrier란

**Barrier** — N 개의 스레드가 모두 도착할 때까지 기다리는 동기화 지점.

```cpp
// C++20 — std::barrier 기본 사용
#include <barrier>
#include <thread>
#include <vector>
#include <iostream>

int main() {
    constexpr int N = 4;
    std::barrier sync_point(N);

    auto worker = [&](int id) {
        // Phase 1
        std::cout << "Worker " << id << " phase 1\n";
        sync_point.arrive_and_wait();  // 모두가 phase 1 완료까지 대기

        // Phase 2
        std::cout << "Worker " << id << " phase 2\n";
        sync_point.arrive_and_wait();

        // Phase 3
        std::cout << "Worker " << id << " phase 3\n";
    };

    std::vector<std::jthread> threads;
    for (int i = 0; i < N; ++i) {
        threads.emplace_back(worker, i);
    }
}
```

```c
// C11 — Barrier 직접 구현 (C11에는 barrier가 없음)
#include <threads.h>
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    atomic_int count;
    int total;
    atomic_bool sense;
} SimpleBarrier;

_Thread_local bool local_sense = false;

void barrier_init(SimpleBarrier* b, int n) {
    atomic_init(&b->count, n);
    b->total = n;
    atomic_init(&b->sense, false);
}

void barrier_wait(SimpleBarrier* b) {
    local_sense = !local_sense;

    if (atomic_fetch_sub(&b->count, 1) == 1) {
        // 마지막 스레드
        atomic_store(&b->count, b->total);
        atomic_store(&b->sense, local_sense);
    } else {
        // 대기
        while (atomic_load(&b->sense) != local_sense) {
            thrd_yield();
        }
    }
}
```

병렬 알고리즘에서 자주 등장. **Bulk Synchronous Parallel** (BSP) 모델의 핵심.

![BSP — barrier로 phase 동기화](/images/blog/parallel/diagrams/ch17-barrier-bsp.svg)

모두가 phase 1 끝나야 phase 2 시작. 데이터 의존성이 phase 경계에 모임.

## 17.2 단순 Barrier — Counter

```cpp
// C++20 — 단순 Counter Barrier (문제 있음)
#include <atomic>

class SimpleCounterBarrier {
    std::atomic<int> counter_;
    int total_;

public:
    explicit SimpleCounterBarrier(int n) : counter_(0), total_(n) {}

    void wait() {
        if (counter_.fetch_add(1, std::memory_order_acq_rel) == total_ - 1) {
            counter_.store(0, std::memory_order_release);  // 마지막이 리셋
        } else {
            while (counter_.load(std::memory_order_acquire) != 0) {
                // 대기
            }
        }
    }
};
```

**문제**:

- counter에 대한 atomic add → 경합
- 모두가 같은 counter를 spin → cache line bouncing
- 재사용 시 race condition (counter가 0 되기 전에 다른 스레드가 진입)

## 17.3 Sense-Reversing Barrier

재사용 문제를 해결하는 클래식 패턴.

```cpp
// C++20 — Sense-Reversing Barrier
#include <atomic>
#include <thread>

class SenseBarrier {
    std::atomic<int> counter_;
    int total_;
    std::atomic<bool> sense_{false};

    // thread_local은 클래스 밖에 정의해야 함
    static inline thread_local bool local_sense_ = false;

public:
    explicit SenseBarrier(int n) : counter_(n), total_(n) {}

    void wait() {
        local_sense_ = !local_sense_;  // sense 뒤집기

        if (counter_.fetch_sub(1, std::memory_order_acq_rel) == 1) {
            // 마지막 스레드
            counter_.store(total_, std::memory_order_relaxed);
            sense_.store(local_sense_, std::memory_order_release);  // 모두 깨움
        } else {
            // 대기
            while (sense_.load(std::memory_order_acquire) != local_sense_) {
                std::this_thread::yield();
            }
        }
    }
};
```

```c
// C11 — Sense-Reversing Barrier
#include <stdatomic.h>
#include <threads.h>
#include <stdbool.h>

typedef struct {
    atomic_int counter;
    int total;
    atomic_bool sense;
} SenseBarrier;

_Thread_local bool local_sense = false;

void sense_barrier_init(SenseBarrier* b, int n) {
    atomic_init(&b->counter, n);
    b->total = n;
    atomic_init(&b->sense, false);
}

void sense_barrier_wait(SenseBarrier* b) {
    local_sense = !local_sense;  // 뒤집기

    if (atomic_fetch_sub(&b->counter, 1) == 1) {
        // 마지막 스레드
        atomic_store(&b->counter, b->total);
        atomic_store(&b->sense, local_sense);
    } else {
        while (atomic_load(&b->sense) != local_sense) {
            thrd_yield();
        }
    }
}
```

**핵심 아이디어** — sense 비트가 매 phase마다 뒤집힘. 스레드가 다음 phase로 가면 자기 local_sense도 뒤집어서 비교.

![Sense-reversing barrier — phase마다 sense 비트가 뒤집히고 마지막 스레드가 sense를 토글하면 모든 spinner가 풀려난다](/images/blog/parallel-principles/diagrams/ch17-sense-barrier.svg)

재사용 안전. 그러나 여전히 sense 변수에 모두가 spin — cache bouncing.

### Phase-Sensitive Bit의 의미

책 Listing 17.3의 핵심은 *전역 sense*와 *지역 sense*의 비대칭이다. 각 스레드는 자신의 `local_sense`(스택/TLS 변수)를 기억하고, 매 barrier 통과 시 *뒤집은 후* 전역과 비교한다.

```
Phase 0:    전역 sense = false
            모든 스레드 local_sense = false (초기값)
            barrier 진입: local_sense = !false = true
                          기다림: 전역 sense == true 가 될 때까지
            마지막 스레드: 전역 sense = local_sense = true → 모두 풀림

Phase 1:    전역 sense = true
            각 스레드 local_sense = true (이전 phase 결과)
            barrier 진입: local_sense = !true = false
                          기다림: 전역 sense == false 가 될 때까지
            마지막 스레드: 전역 sense = false → 모두 풀림
```

**왜 동작하는가** — 두 phase가 *같은 sense 값을 두 번* 보지 않는다. 그러므로 phase k의 늦은 도착자가 phase k+1의 전역 sense 변경을 phase k의 신호로 *오인*할 수 없다. counter 0 리셋만으로는 막을 수 없던 race가 sense bit 한 줄로 사라진다.

비용은 여전히 모든 스레드가 같은 sense 위치를 spin — 한 cache line에 P개 스레드 invalidation. P가 수십을 넘으면 다른 알고리즘이 필요해진다.

## 17.4 Combining Tree Barrier

12장의 combining tree와 같은 아이디어.

```
        루트
       /    \
      ●      ●
     / \    / \
    T1  T2 T3  T4
```

리프(스레드)에서 시작해 루트까지 올라간다. 마지막이 도착하면 루트가 wake up.

```cpp
// C++20 — Combining Tree Barrier
#include <atomic>
#include <vector>
#include <thread>
#include <cmath>

class TreeBarrier {
    struct Node {
        std::atomic<int> count{0};
        std::atomic<bool> sense{false};
        int children;
        Node* parent;
    };

    std::vector<Node> nodes_;
    int num_threads_;
    static inline thread_local bool local_sense_ = false;

public:
    explicit TreeBarrier(int n) : num_threads_(n) {
        // 완전 이진 트리 구성
        int num_leaves = n;
        int num_internal = (n > 1) ? (n - 1) : 0;
        nodes_.resize(num_internal + num_leaves);

        // 각 노드 초기화
        for (size_t i = 0; i < nodes_.size(); ++i) {
            if (i < static_cast<size_t>(num_internal)) {
                // 내부 노드
                nodes_[i].children = (i * 2 + 2 < nodes_.size()) ? 2 : 1;
            } else {
                // 리프 노드
                nodes_[i].children = 0;
            }
            nodes_[i].count.store(0);
            nodes_[i].parent = (i > 0) ? &nodes_[(i - 1) / 2] : nullptr;
        }
    }

    void wait(int thread_id) {
        local_sense_ = !local_sense_;
        Node* node = &nodes_[num_threads_ - 1 + thread_id];  // 리프

        // 올라가기
        while (node != nullptr) {
            if (node->count.fetch_add(1, std::memory_order_acq_rel)
                    == node->children - 1) {
                // 마지막 도착 — 위로 전파
                node->count.store(0, std::memory_order_relaxed);
                if (node->parent == nullptr) {
                    // 루트 — 모두 깨움
                    node->sense.store(local_sense_, std::memory_order_release);
                }
                node = node->parent;
            } else {
                // 대기
                break;
            }
        }

        // 루트에서 sense 기다림
        Node& root = nodes_[0];
        while (root.sense.load(std::memory_order_acquire) != local_sense_) {
            std::this_thread::yield();
        }
    }
};
```

각 노드에서 경합은 자식 수만큼만 (보통 2). 전체 경합이 O(N) → O(log N).

**장점**: 경합 분산.
**단점**: 깊이 O(log N) → 지연시간 증가.

### Listing 17.7의 노드 동작

책 Listing 17.7은 각 노드를 *독립된 sense barrier*로 본다. 노드는 자기 자식 수만큼의 카운터를 가지고, 마지막 자식이 도착하면 부모에게 *한 번* 알린다.

```cpp
// Combining Tree 노드 — 의사 코드 (Listing 17.7 변형)
struct CombiningNode {
    std::atomic<int> count;    // 남은 자식 수
    int children;              // 총 자식 수
    CombiningNode* parent;
    std::atomic<bool> sense;   // 이 부분 트리의 sense
};

void combining_wait(int tid) {
    bool my_sense = local_sense_[tid] = !local_sense_[tid];
    CombiningNode* n = leaf_for(tid);
    while (n != nullptr) {
        int remaining = n->count.fetch_sub(1) - 1;
        if (remaining == 0) {
            n->count.store(n->children);   // 리셋
            if (n->parent == nullptr) {
                // 루트 — 모든 부분트리 sense 흘려보냄
                broadcast_sense_down(my_sense);
                return;
            }
            n = n->parent;          // 부모로 전파
        } else {
            // 자식 중 하나가 마지막이 아님 — 대기
            while (n->sense.load() != my_sense) std::this_thread::yield();
            return;
        }
    }
}
```

중요한 디테일은 wake-up 단계도 트리를 *내려가며* 전파한다는 점. 노드별로 한 명만 부모와 통신하므로 매 cache line의 invalidation이 자식 수만큼만 발생.

## 17.5 Dissemination Barrier

가장 효율적인 알고리즘 — Hensgen, Finkel, Manber 1988.

```
Round 0: 스레드 i가 스레드 (i+1) mod N에게 신호
Round 1: 스레드 i가 스레드 (i+2) mod N에게 신호
Round 2: 스레드 i가 스레드 (i+4) mod N에게 신호
...
Round k: 스레드 i가 스레드 (i+2^k) mod N에게 신호
```

```cpp
// C++20 — Dissemination Barrier
#include <atomic>
#include <vector>
#include <cmath>
#include <thread>

class DisseminationBarrier {
    struct Flag {
        alignas(64) std::atomic<bool> flag{false};  // cache line padding
    };

    int num_threads_;
    int num_rounds_;
    std::vector<std::vector<Flag>> flags_;  // [round][thread]
    static inline thread_local int parity_ = 0;

public:
    explicit DisseminationBarrier(int n)
        : num_threads_(n),
          num_rounds_(static_cast<int>(std::ceil(std::log2(n)))) {

        flags_.resize(num_rounds_);
        for (int r = 0; r < num_rounds_; ++r) {
            flags_[r].resize(n);
        }
    }

    void wait(int thread_id) {
        for (int round = 0; round < num_rounds_; ++round) {
            // 파트너에게 신호
            int partner = (thread_id + (1 << round)) % num_threads_;
            flags_[round][partner].flag.store(true, std::memory_order_release);

            // 자기 플래그 기다림
            while (!flags_[round][thread_id].flag.load(std::memory_order_acquire)) {
                std::this_thread::yield();
            }

            // 다음 phase 위해 리셋
            flags_[round][thread_id].flag.store(false, std::memory_order_relaxed);
        }
    }
};
```

```c
// C11 — Dissemination Barrier
#include <stdatomic.h>
#include <threads.h>
#include <stdlib.h>
#include <math.h>

typedef struct {
    atomic_bool* flags;  // [round * num_threads + thread]
    int num_threads;
    int num_rounds;
} DisseminationBarrier;

DisseminationBarrier* dissemination_create(int n) {
    DisseminationBarrier* b = malloc(sizeof(DisseminationBarrier));
    b->num_threads = n;
    b->num_rounds = (int)ceil(log2(n));
    b->flags = malloc(sizeof(atomic_bool) * b->num_rounds * n);

    for (int i = 0; i < b->num_rounds * n; ++i) {
        atomic_init(&b->flags[i], false);
    }
    return b;
}

void dissemination_wait(DisseminationBarrier* b, int thread_id) {
    for (int round = 0; round < b->num_rounds; ++round) {
        int partner = (thread_id + (1 << round)) % b->num_threads;
        int partner_idx = round * b->num_threads + partner;
        int my_idx = round * b->num_threads + thread_id;

        // 파트너에게 신호
        atomic_store(&b->flags[partner_idx], true);

        // 자기 플래그 기다림
        while (!atomic_load(&b->flags[my_idx])) {
            thrd_yield();
        }

        // 리셋
        atomic_store(&b->flags[my_idx], false);
    }
}
```

```
4 스레드, log₂(4) = 2 rounds:

Round 0:
T0 → T1
T1 → T2
T2 → T3
T3 → T0

Round 1:
T0 → T2
T1 → T3
T2 → T0
T3 → T1
```

**O(log N) 단계**로 모든 스레드가 모든 스레드의 도착을 알게 된다.

**장점**:
- 매 통신이 두 스레드 사이 — 경합 없음
- 캐시 친화적 (적은 cache line)
- O(log N) 단계

가장 빠른 barrier로 알려짐.

### Listing 17.15의 라운드 구조

책 Listing 17.15는 각 스레드가 *자기 flag 배열*만 spin하도록 신호 위치를 *수신자별로* 정렬한다. 즉 round r에서 스레드 i가 spin하는 위치는 `flags[r][i]` — partner가 *그 위치에* write.

```cpp
// Dissemination 한 라운드의 핵심 (Listing 17.15)
for (int r = 0; r < num_rounds; ++r) {
    int partner = (id + (1 << r)) % N;
    // 보내기: 내가 partner의 flag를 set
    flags[r][partner].store(true, std::memory_order_release);
    // 받기: 내 flag가 set될 때까지
    while (!flags[r][id].load(std::memory_order_acquire)) {
        std::this_thread::yield();
    }
    flags[r][id].store(false, std::memory_order_relaxed); // 다음 phase 위해 리셋
}
```

매 라운드는 *논리적으로 독립*된 P/2 쌍의 통신. 각 cache line에 작가 1명, 독자 1명 — false sharing조차 발생하지 않는다. log₂N 라운드 뒤 모두가 모두의 도착을 *간접적으로* 알게 된다.

흥미로운 점은 *대칭성*. 어떤 스레드도 특별하지 않고, 모두 같은 일을 한다. Sense-reversing의 "마지막 도착자"같은 비대칭이 없어 분기 예측에도 좋다.

## 17.6 Tournament Barrier

Dissemination이 *모든 쌍*을 매 라운드 묶는다면, **Tournament barrier**(Hensgen et al.; 책 17.6)는 *토너먼트처럼* 한쪽이 다른 쪽을 기다리는 구조다.

```
Round 0:  T0 vs T1     T2 vs T3     T4 vs T5     T6 vs T7
          |            |            |            |
          (winner=T0)  (winner=T2)  (winner=T4)  (winner=T6)

Round 1:  T0 vs T2                  T4 vs T6
          |                         |
          (winner=T0)               (winner=T4)

Round 2:  T0 vs T4
          |
          (champion=T0)

Wake-up:  champion이 트리를 거꾸로 내려가며 깨움
```

규칙은 단순하다: 매 라운드 한 스레드가 *상대를 기다리고*, 다른 스레드는 *상대에게 신호하고 끝*. 승자가 다음 라운드에 진출.

```cpp
// Tournament Barrier (책 17.6 의사 코드)
struct Slot {
    std::atomic<bool> flag{false};
    int role;   // WINNER, LOSER, BYE, CHAMPION
    int opponent;
};
// roles[round][thread] 미리 계산

void tournament_wait(int tid) {
    bool my_sense = local_sense_[tid] = !local_sense_[tid];
    // 올라가기 (winner들이 진출)
    for (int r = 0; r < num_rounds_; ++r) {
        auto& s = roles[r][tid];
        if (s.role == LOSER) {
            flags[r][s.opponent].store(my_sense);
            while (flags[r][tid].load() != my_sense) ;  // wake-up 대기
            break;  // loser는 여기서 끝
        } else if (s.role == WINNER) {
            while (flags[r][tid].load() != my_sense) ;
        } // BYE는 그냥 통과
    }
    // 내려가기 (champion → ... → 모든 loser 깨움)
    for (int r = num_rounds_ - 1; r >= 0; --r) {
        auto& s = roles[r][tid];
        if (s.role == WINNER || s.role == CHAMPION) {
            flags[r][s.opponent].store(my_sense);
        }
    }
}
```

장점은 **각 스레드가 자기 flag만 spin** — false sharing 없음. 단점은 dissemination보다 *깊이* 깊다 (2 log N — 올라가고 내려가는 두 phase). HPC에서는 dissemination이 보통 더 빠르고, 캐시 일관성 비용이 비싼 NUMA에서는 tournament가 경쟁력 있다.

## 17.7 Static Tree Barrier

각 스레드가 자기 부모와 자식만 본다.

```
        T0 (root)
       /   \
      T1    T2
     / \    / \
    T3 T4  T5 T6
```

각 스레드:
1. 자기 자식들이 도착했는지 확인
2. 부모에게 도착 신호
3. 부모가 풀어줄 때까지 대기 (wake-up phase)

**장점**: 각 스레드가 자기 노드만 spin — false sharing 없음.
**단점**: O(log N) 깊이, 두 phase (도착 + 깨우기).

## Static vs Dynamic Barrier

지금까지 본 모든 barrier는 *N이 고정*이라 가정한다. 책 17.7은 그 가정이 깨지는 경우를 다룬다.

**Static Barrier** — 참여 스레드 수가 컴파일/초기화 시점에 결정.

```cpp
// C++20 — std::barrier는 N 고정
std::barrier sync(4);    // 4 스레드 고정
```

대부분의 HPC 시나리오. 알고리즘이 *처음부터 끝까지* P개 스레드를 쓴다고 약속.

**Dynamic Barrier** — 매 phase마다 참여자 수가 바뀜.

```cpp
// std::barrier의 arrive_and_drop — 빠지기
std::barrier sync(N);

// phase 1: N명 참여
sync.arrive_and_wait();

// 일부 스레드가 작업 끝났음 — barrier에서 탈퇴
sync.arrive_and_drop();   // 다음 phase부터 N-1명

// phase 2: 남은 스레드들만
sync.arrive_and_wait();
```

이게 필요한 워크로드 — 가지치기(branch-and-bound), 적응형 메시 재정의, 동적 스레드 풀.

| 종류 | 사용처 | 구현 |
|---|---|---|
| Static | iterative solver, BSP | counter / sense / tree |
| Dynamic | branch-and-bound, adaptive AMR | C++20 `arrive_and_drop`, custom |

책의 통찰은 dynamic이 *훨씬 어렵다*는 점. counter 기반은 N을 atomically 바꿔야 하고, tree 기반은 *재구성*이 필요할 수도. 그래서 dynamic barrier는 보통 *느슨한* 보장만 — "현재 등록된 스레드들의 도착을 기다림."

대안: 일회용 `std::latch`를 phase마다 새로 만드는 패턴. 단순하고 dynamic.

## 17.8 C++20 std::barrier와 std::latch

```cpp
// C++20 — std::barrier with completion function
#include <barrier>
#include <thread>
#include <vector>
#include <iostream>

int main() {
    int phase = 0;

    // 완료 함수 — 마지막 스레드가 호출
    auto on_completion = [&phase]() noexcept {
        ++phase;
        std::cout << "Phase " << phase << " complete\n";
    };

    std::barrier sync_point(4, on_completion);

    auto worker = [&](int id) {
        for (int i = 0; i < 3; ++i) {
            std::cout << "Worker " << id << " working\n";
            sync_point.arrive_and_wait();
        }
    };

    std::vector<std::jthread> threads;
    for (int i = 0; i < 4; ++i) {
        threads.emplace_back(worker, i);
    }
}
```

```cpp
// C++20 — std::latch (일회용 barrier)
#include <latch>
#include <thread>
#include <vector>
#include <iostream>

int main() {
    std::latch start_signal(1);
    std::latch done_signal(4);

    auto worker = [&](int id) {
        start_signal.wait();  // 시작 신호 대기
        std::cout << "Worker " << id << " started\n";
        // 작업 수행
        done_signal.count_down();  // 완료 신호
    };

    std::vector<std::jthread> threads;
    for (int i = 0; i < 4; ++i) {
        threads.emplace_back(worker, i);
    }

    std::cout << "Starting workers...\n";
    start_signal.count_down();  // 모든 워커 시작

    done_signal.wait();  // 모든 워커 완료 대기
    std::cout << "All workers done\n";
}
```

## 17.8 Barrier 비교

| 알고리즘 | 단계 | 경합 | 비고 |
|---|---|---|---|
| Simple Counter | 1 | O(N) | 단순 |
| Sense-Reversing | 1 | O(N) | 재사용 안전 |
| Combining Tree | O(log N) | O(1) per level | 경합 분산 |
| Dissemination | O(log N) | 거의 0 | 가장 빠름 |
| Static Tree | O(log N) | 거의 0 | 메모리 친화 |

실용적으로는 **Sense-Reversing**이 가장 흔함 (단순 + 충분히 빠름). 매우 큰 N (HPC)에서는 dissemination.

## 17.9 Barrier의 사용 패턴

**1. Iterative Algorithms**

```cpp
// C++20 — Jacobi Iteration with Barrier
#include <barrier>
#include <vector>
#include <thread>
#include <cmath>

void jacobi_parallel(std::vector<std::vector<double>>& grid,
                     int iterations,
                     int num_threads) {
    int rows = grid.size();
    std::vector<std::vector<double>> next_grid = grid;

    std::barrier sync(num_threads);

    auto worker = [&](int id) {
        int start_row = 1 + id * (rows - 2) / num_threads;
        int end_row = 1 + (id + 1) * (rows - 2) / num_threads;

        for (int iter = 0; iter < iterations; ++iter) {
            // 계산
            for (int i = start_row; i < end_row; ++i) {
                for (size_t j = 1; j < grid[i].size() - 1; ++j) {
                    next_grid[i][j] = 0.25 * (
                        grid[i-1][j] + grid[i+1][j] +
                        grid[i][j-1] + grid[i][j+1]
                    );
                }
            }

            sync.arrive_and_wait();  // 모두 계산 완료

            // swap
            std::swap(grid, next_grid);

            sync.arrive_and_wait();  // 모두 swap 완료
        }
    };

    std::vector<std::jthread> threads;
    for (int i = 0; i < num_threads; ++i) {
        threads.emplace_back(worker, i);
    }
}
```

- 행렬 계산
- 시뮬레이션 (셀룰러 오토마타)
- 머신러닝 (gradient descent의 batch)

**2. Phase Synchronization**

```cpp
// C++20 — Multi-phase pipeline
#include <barrier>
#include <thread>

void multi_phase_work(std::barrier<>& sync, int id) {
    // Phase 1: 데이터 준비
    prepare_data(id);
    sync.arrive_and_wait();

    // Phase 2: 계산
    compute(id);
    sync.arrive_and_wait();

    // Phase 3: 결과 저장
    save_results(id);
}
```

- 파이프라인 변환
- 멀티 패스 알고리즘

**3. Coarse-grain Parallelism**

전체 시스템 차원의 동기화. GPU에서 매우 흔함.

## 17.10 GPU와 Barrier

GPU 프로그래밍에서 barrier는 핵심 도구.

- **`__syncthreads()`** (CUDA) — 같은 block 내 모든 thread 동기화
- **`__syncwarp()`** — warp 내 동기화

GPU의 SIMT 모델에서 barrier가 정확한 데이터 흐름을 보장. 잘못 쓰면 **deadlock 또는 잘못된 결과**.

## 다시 행진 대형으로 — 어떤 barrier를 고를까

이 장의 알고리즘은 모두 *같은 보장*을 한다 — "전원이 도착할 때까지 모두 기다린다". 그런데 왜 이렇게 많은 변종이 존재할까. *비용 구조*가 다르기 때문이다.

**카운터 한 개의 함정**. 가장 단순한 barrier는 atomic counter를 N에서 0까지 줄이는 것이다. 카페로 옮기면 *카운터 한 곳에 모두 도장을 찍는다*. 4명이면 괜찮다. 64명이면 한 줄에 64명이 줄을 선다 — 캐시 라인 한 줄을 64개 코어가 동시에 두드리니 *cache line bouncing*이 일어난다. CPU 한 사이클이 아니라 수백 사이클짜리 동기화가 된다.

**트리로 분산**. 토너먼트 비유처럼, 페어 단위로 합의하고 한 단계 위로 올라간다. 통신은 $O(\log N)$ 단계에 걸쳐 일어나지만 각 단계의 *경합 폭*은 2다. 64명이라도 한 번에 두 명만 같은 라인을 두드린다. Combining tree, Tournament, Static tree barrier가 모두 이 계열이다.

**Dissemination — 가장 균일한 통신**. 슬랙 단체 채널 비유. 각 스레드가 *자기 단계의 메시지*를 다른 한 명에게 보낸다. $\log_2 N$ 라운드 뒤에는 *모두가 모두의 도착*을 안다. 매 통신이 정확히 두 스레드 사이에서만 일어나므로 false sharing이 발생하지 않는다. 다만 메시지 수는 $N \log_2 N$로 가장 많다.

| Barrier | 라운드 수 | 통신 폭 | 메시지 수 | 적합한 곳 |
|---------|----------|---------|----------|----------|
| Simple counter | 1 | $N$ | $N$ | $N \leq 8$ 정도 |
| Combining tree | $\log_2 N$ | 2 | $N$ | 일반 |
| Tournament | $\log_2 N$ | 2 | $N$ | NUMA 일반 |
| Static tree | $\log_2 N$ | 2 | $N$ | 임베디드/cache-friendly |
| Dissemination | $\log_2 N$ | 2 | $N \log_2 N$ | 최저 latency |

**Latency vs throughput**. Dissemination이 *가장 빠르게* 모든 스레드를 통과시키지만 *메시지 총량*은 가장 많다. 트리 계열은 메시지 수가 적지만 *path length*가 길다. 한 phase의 *임계 경로*가 짧아야 하는 워크로드 — iterative solver의 매 iter — 에서는 dissemination이 좋고, *barrier 빈도가 낮은* 워크로드는 트리로도 충분하다.

**One-shot인가 재사용인가**. 한 번만 만나는 동기화라면 *깃발 색을 바꿀 필요*가 없다. C++20 `std::latch`가 그 자리다 — 카운트가 0이 되면 *영원히* 통과 가능. 반복되는 phase 동기화는 *깃발 색을 매번 뒤집어야* 한다 — C++20 `std::barrier`, Java `CyclicBarrier`가 그 자리다.

### GPU 한정 주의사항

`__syncthreads()`는 *같은 thread block 안*에서만 동작한다. 다른 block 사이의 동기화는 kernel 종료가 유일한 방법이다 — 사실상 *호스트 측 barrier*다. SM(streaming multiprocessor) 단위 스케줄링과 맞물려 있어서, block 단위로 자체적인 phase가 끝나야 한다.

또 하나의 함정 — `__syncthreads()`는 *모든 스레드가 도달*해야 한다. 분기문(`if`) 안에 두면 *일부 스레드만* 도달하고 나머지는 영원히 기다린다. CUDA의 가장 흔한 deadlock 패턴이다. 모든 스레드가 같은 path를 타도록 *공통 코드 경로*에 둬야 한다.

```cuda
// 잘못된 패턴 — 일부 스레드만 도달
if (threadIdx.x < 16) {
    // 무언가 작업
    __syncthreads();   // 잘못 — 16개 스레드만 도달
}

// 올바른 패턴 — 모든 스레드 도달
if (threadIdx.x < 16) {
    // 무언가 작업
}
__syncthreads();   // OK — block 전체 도달
```

이 한 줄짜리 차이가 GPU 디버깅의 절반을 만든다. 행진 비유로 — *대형 일부만 다음 칸으로 가면 전 부대가 멈춘다*.

### 런타임별 비유 매핑

같은 barrier 의미론이 런타임마다 다른 API로 등장한다.

| 런타임 | 재사용 가능 | 일회용 | 라운드 패턴 |
|--------|-------------|--------|-------------|
| C++20 | `std::barrier` | `std::latch` | sense-reversing 내장 |
| POSIX | `pthread_barrier_t` | (직접 구현) | 구현 의존 |
| Java | `CyclicBarrier`, `Phaser` | `CountDownLatch` | sense-reversing 또는 tournament |
| Go | (없음 — `sync.WaitGroup`가 latch 유사) | `sync.WaitGroup` | counter 기반 |
| Python | `threading.Barrier` | `threading.Event` | counter 기반 |
| MPI | `MPI_Barrier` | (collective 한 번) | 구현 의존 (tree/dissemination) |
| OpenMP | `#pragma omp barrier` | (없음 — implicit at parallel region end) | 구현 의존 |
| CUDA | (없음 — kernel 종료가 barrier) | `__syncthreads()` (block 내) | hardware fence |

`std::barrier`와 `std::latch`의 사용 자리를 한 문장으로 — *모임이 반복되면* barrier, *한 번뿐이면* latch.

## 정리

- **Barrier** — N 스레드가 같은 지점에서 만나는 동기화
- **Simple counter** → cache bouncing
- **Sense-reversing** — 재사용 안전 (가장 흔함)
- **Combining tree** — 경합 분산
- **Dissemination** — 매 통신이 두 스레드, 가장 빠름
- **Static tree** — false sharing 없음
- **C++20**: `std::barrier` (재사용), `std::latch` (일회용)
- 응용 — iterative algorithms, BSP, GPU

## 한국 개발자의 함정

**1. *Counter 한 개로 barrier 충분***

- 재사용 시 race condition (counter가 0 되기 전 새 phase)
- Sense-reversing 필수
- 또는 single-use barrier (std::latch)

**2. *std::latch와 std::barrier 혼동***

- std::latch: 일회용, 카운트가 0이 되면 모두 통과
- std::barrier: 재사용 가능, sense-reversing 사용
- 용도 다름

**3. *Barrier가 항상 필요***

- 작업이 독립적이면 work stealing이 더 빠름
- Barrier는 *phase 동기화*가 명확할 때만
- 너무 자주 쓰면 idle 시간 증가

**4. *GPU에서 __syncthreads()는 그냥 호출***

- 같은 thread block 안에서만 동작
- Block 간 동기화는 kernel 종료가 유일
- 잘못 쓰면 deadlock

## 실무 적용

**이론 → 실무:**

- Sense-Reversing       → std::barrier (C++20)
- One-shot              → std::latch (C++20)
- POSIX                 → pthread_barrier_t
- GPU                   → __syncthreads() (CUDA, 사실상 표준), barrier() (OpenCL — 쇠퇴, SYCL/Vulkan Compute가 후속)

**언어별:**

- C++20: std::barrier, std::latch
- C: pthread_barrier_t (POSIX), 직접 구현
- Rust: std::sync::Barrier, crossbeam
- Go: sync.WaitGroup (latch 유사)
- Python: threading.Barrier

**응용:**

- BSP (Bulk Synchronous Parallel) → MPI Barrier
- Iterative algorithms → 매 iter 끝 barrier
- 멀티 패스 알고리즘 → 각 패스 끝

## 자기 점검

- [ ] Simple counter의 재사용 문제?
- [ ] Sense-reversing의 sense bit 의미?
- [ ] Combining tree barrier의 O(log N)?
- [ ] Dissemination이 가장 빠른 이유?
- [ ] Static tree barrier가 false sharing 없는 이유?
- [ ] std::latch와 std::barrier 사용 자리?

## 다음 장 예고

마지막 장 — **Transactional Memory**. 락 없는 atomic block의 약속.

## 관련 항목

- [Ch 16: Work Stealing](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention) — 비슷한 캐시 이슈
- [Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory)
- [C++ Concurrency in Action Ch 4: Synchronization](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
