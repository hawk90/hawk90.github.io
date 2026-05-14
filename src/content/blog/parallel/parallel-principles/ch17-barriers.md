---
title: "Chapter 17: Barriers"
date: 2026-05-12
description: "Barrier 동기화 — 여러 스레드가 같은 지점에서 만남. Sense-reversing, combining tree, dissemination."
series: "The Art of Multiprocessor Programming"
seriesOrder: 17
tags: [parallel, concurrency, book-review, amp, barrier, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 17 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

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

```
Phase 1: sense=false, 모두 wait until sense=false → 즉시 통과
        마지막이 sense를 true로 → 모두 풀려남
Phase 2: 다음 await에서 local_sense를 true로 → wait until sense=true
        ...
```

재사용 안전. 그러나 여전히 sense 변수에 모두가 spin — cache bouncing.

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

## 17.6 Static Tree Barrier

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

## 17.7 C++20 std::barrier와 std::latch

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

```
1. *Counter 한 개로 barrier 충분*
   - 재사용 시 race condition (counter가 0 되기 전 새 phase)
   - Sense-reversing 필수
   - 또는 single-use barrier (std::latch)

2. *std::latch와 std::barrier 혼동*
   - std::latch: 일회용, 카운트가 0이 되면 모두 통과
   - std::barrier: 재사용 가능, sense-reversing 사용
   - 용도 다름

3. *Barrier가 항상 필요*
   - 작업이 독립적이면 work stealing이 더 빠름
   - Barrier는 *phase 동기화*가 명확할 때만
   - 너무 자주 쓰면 idle 시간 증가

4. *GPU에서 __syncthreads()는 그냥 호출*
   - 같은 thread block 안에서만 동작
   - Block 간 동기화는 kernel 종료가 유일
   - 잘못 쓰면 deadlock
```

## 실무 적용

```
이론 → 실무:
- Sense-Reversing       → std::barrier (C++20)
- One-shot              → std::latch (C++20)
- POSIX                 → pthread_barrier_t
- GPU                   → __syncthreads() (CUDA), barrier() (OpenCL)

언어별:
- C++20: std::barrier, std::latch
- C: pthread_barrier_t (POSIX), 직접 구현
- Rust: std::sync::Barrier, crossbeam
- Go: sync.WaitGroup (latch 유사)
- Python: threading.Barrier

응용:
- BSP (Bulk Synchronous Parallel) → MPI Barrier
- Iterative algorithms → 매 iter 끝 barrier
- 멀티 패스 알고리즘 → 각 패스 끝
```

## 자기 점검

```
□ Simple counter의 재사용 문제?
□ Sense-reversing의 sense bit 의미?
□ Combining tree barrier의 O(log N)?
□ Dissemination이 가장 빠른 이유?
□ Static tree barrier가 false sharing 없는 이유?
□ std::latch와 std::barrier 사용 자리?
```

## 다음 장 예고

마지막 장 — **Transactional Memory**. 락 없는 atomic block의 약속.

## 관련 항목

- [Ch 16: Work Stealing](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention) — 비슷한 캐시 이슈
- [Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory)
- [C++ Concurrency in Action Ch 4: Synchronization](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
