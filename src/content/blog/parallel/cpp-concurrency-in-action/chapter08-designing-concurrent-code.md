---
title: "Ch 8: Designing concurrent code"
date: 2026-05-06T08:00:00
description: "작업 분할 — 데이터 vs 작업 병렬, false sharing, 작업 단위 결정."
tags: [C++, C, Concurrency, Design, Parallelism, False Sharing]
series: "C++ Concurrency in Action"
seriesOrder: 8
draft: false
---

동시성 코드는 단순히 스레드를 만드는 것 이상이다. 작업을 어떻게 분할하고, 성능을 어떻게 최적화하는지가 중요하다.

## 8.1 작업 분할 전략

### 데이터 병렬 vs 작업 병렬

![데이터 병렬 vs 작업 병렬](/images/blog/cpp-concurrency-in-action/diagrams/ch08-data-vs-task-parallel.svg)

### 처리 전 분할 vs 처리 중 분할

Williams는 두 가지 분할 시점을 구분한다. 처리 *전* 분할은 입력을 미리 N개의 블록으로 나누고 각 스레드에 정적으로 배정한다. 처리 *중* 분할은 알고리즘이 진행되면서 동적으로 작업을 만들어 다른 스레드로 넘긴다. quicksort가 후자의 대표 사례다.

```cpp
// 처리 전 분할 — 정적 블록 배정
// (이미 위의 parallel_accumulate가 이 패턴이다)

// 처리 중 분할 — 재귀적 quicksort
template<typename T>
std::list<T> parallel_quick_sort(std::list<T> input) {
    if (input.empty()) return input;

    std::list<T> result;
    result.splice(result.begin(), input, input.begin());
    const T& pivot = *result.begin();

    auto divide_point = std::partition(
        input.begin(), input.end(),
        [&](const T& t) { return t < pivot; });

    std::list<T> lower_part;
    lower_part.splice(lower_part.end(), input, input.begin(), divide_point);

    // 한쪽은 비동기로 분기, 다른 쪽은 현재 스레드에서 재귀
    std::future<std::list<T>> new_lower(
        std::async(&parallel_quick_sort<T>, std::move(lower_part)));

    auto new_higher(parallel_quick_sort(std::move(input)));

    result.splice(result.end(), new_higher);
    result.splice(result.begin(), new_lower.get());
    return result;
}
```

`std::async`는 구현에 따라 새 스레드를 띄울지 동기 실행할지 정한다. 재귀 깊이가 깊어질수록 스레드 폭증을 막아 주는 안전판이지만, 동시에 분할 시점을 통제하기 어렵게 만든다. 진짜 통제가 필요하면 스레드 풀과 work-stealing 큐를 직접 구성한다(9장 주제).

### 데이터 병렬: 벡터 처리

### 데이터 병렬: 벡터 처리

```cpp
#include <thread>
#include <vector>
#include <numeric>

template<typename Iterator, typename T>
T parallel_accumulate(Iterator first, Iterator last, T init) {
    const auto length = std::distance(first, last);
    if (length == 0) return init;

    const auto hardware_threads = std::thread::hardware_concurrency();
    const auto num_threads = std::min(
        hardware_threads != 0 ? hardware_threads : 2,
        static_cast<unsigned long>(length)
    );
    const auto block_size = length / num_threads;

    std::vector<T> results(num_threads);
    std::vector<std::thread> threads(num_threads - 1);

    Iterator block_start = first;
    for (unsigned long i = 0; i < num_threads - 1; ++i) {
        Iterator block_end = block_start;
        std::advance(block_end, block_size);

        threads[i] = std::thread([=, &results] {
            results[i] = std::accumulate(block_start, block_end, T{});
        });

        block_start = block_end;
    }

    // 마지막 블록은 현재 스레드에서 처리
    results[num_threads - 1] = std::accumulate(block_start, last, T{});

    for (auto& t : threads) {
        t.join();
    }

    return std::accumulate(results.begin(), results.end(), init);
}
```

### C11 데이터 병렬 합계

```c
// C11 <threads.h> 기반 병렬 합계
#include <threads.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    const int* data;
    size_t start;
    size_t end;
    long result;
} AccumulateTask;

int accumulate_worker(void* arg) {
    AccumulateTask* task = (AccumulateTask*)arg;
    long sum = 0;
    for (size_t i = task->start; i < task->end; ++i) {
        sum += task->data[i];
    }
    task->result = sum;
    return 0;
}

long parallel_accumulate_c11(const int* data, size_t length, int num_threads) {
    if (length == 0) return 0;
    if (num_threads <= 0) num_threads = 4;

    size_t block_size = length / num_threads;

    thrd_t* threads = malloc(sizeof(thrd_t) * (num_threads - 1));
    AccumulateTask* tasks = malloc(sizeof(AccumulateTask) * num_threads);

    // 각 스레드에 작업 할당
    size_t start = 0;
    for (int i = 0; i < num_threads - 1; ++i) {
        tasks[i].data = data;
        tasks[i].start = start;
        tasks[i].end = start + block_size;
        tasks[i].result = 0;

        thrd_create(&threads[i], accumulate_worker, &tasks[i]);
        start += block_size;
    }

    // 마지막 블록은 현재 스레드에서 처리
    tasks[num_threads - 1].data = data;
    tasks[num_threads - 1].start = start;
    tasks[num_threads - 1].end = length;
    accumulate_worker(&tasks[num_threads - 1]);

    // 스레드 대기
    for (int i = 0; i < num_threads - 1; ++i) {
        thrd_join(threads[i], NULL);
    }

    // 결과 합산
    long total = 0;
    for (int i = 0; i < num_threads; ++i) {
        total += tasks[i].result;
    }

    free(threads);
    free(tasks);
    return total;
}
```

### 작업 병렬: 파이프라인

```cpp
#include <thread>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <optional>

template<typename T>
class threadsafe_queue {
    std::queue<T> queue_;
    mutable std::mutex mtx_;
    std::condition_variable cv_;
    bool done_ = false;

public:
    void push(T value) {
        {
            std::lock_guard lock(mtx_);
            queue_.push(std::move(value));
        }
        cv_.notify_one();
    }

    std::optional<T> pop() {
        std::unique_lock lock(mtx_);
        cv_.wait(lock, [this] { return !queue_.empty() || done_; });
        if (queue_.empty()) return std::nullopt;
        T value = std::move(queue_.front());
        queue_.pop();
        return value;
    }

    void done() {
        {
            std::lock_guard lock(mtx_);
            done_ = true;
        }
        cv_.notify_all();
    }
};

// 파이프라인 예제: 이미지 처리
void pipeline_example() {
    threadsafe_queue<Image> raw_images;
    threadsafe_queue<Image> resized_images;
    threadsafe_queue<Image> filtered_images;

    // Stage 1: 리사이즈
    std::thread resizer([&] {
        while (auto img = raw_images.pop()) {
            resized_images.push(resize(*img));
        }
        resized_images.done();
    });

    // Stage 2: 필터
    std::thread filterer([&] {
        while (auto img = resized_images.pop()) {
            filtered_images.push(apply_filter(*img));
        }
        filtered_images.done();
    });

    // Stage 3: 저장
    std::thread saver([&] {
        while (auto img = filtered_images.pop()) {
            save_to_disk(*img);
        }
    });

    // 입력 제공
    for (const auto& path : image_paths) {
        raw_images.push(load_image(path));
    }
    raw_images.done();

    resizer.join();
    filterer.join();
    saver.join();
}
```

### 파이프라인이 어울리는 작업

데이터 병렬은 작업이 균일하고 독립적일 때 강하다. 파이프라인은 다음 조건에서 유리하다.

- 입력이 *스트림*처럼 흐른다 — 모든 데이터를 미리 가지고 있지 않다.
- 단계별 비용이 다르다 — 디코드는 빠르고, 필터는 느리다.
- 단계마다 *상태*가 다르다 — GPU 컨텍스트, 파일 핸들 등 한 스레드에 고정해야 하는 자원.

대신 파이프라인은 *지연(latency)*이 누적된다. 한 항목이 모든 단계를 통과하는 시간은 가장 느린 단계의 합이다. 데이터 병렬이라면 같은 작업을 N개로 쪼개 1/N 시간에 끝낼 수 있다. 처리량이냐 지연이냐를 먼저 정하고 분할 모델을 고른다.

## 8.2 성능 법칙

### Amdahl의 법칙

**병렬화할 수 없는 부분이 전체 성능을 제한한다.**

$$
\text{Speedup} = \frac{1}{(1-P) + P/N}
$$

- $P$ = 병렬화 가능 비율
- $N$ = 프로세서 수

P = 0.95 (95% 병렬화 가능)일 때:

| N | Speedup |
|---|---|
| 2 | 1.9x |
| 4 | 3.5x |
| 8 | 5.9x |
| 16 | 9.1x |
| ∞ | **20x** (최대 한계) |

5%의 직렬 코드가 무한 코어에서도 20배 이상을 불가능하게 만든다.

```cpp
// Amdahl 계산기
double amdahl_speedup(double parallel_fraction, int num_processors) {
    double serial_fraction = 1.0 - parallel_fraction;
    return 1.0 / (serial_fraction + parallel_fraction / num_processors);
}

// 예: 95% 병렬화, 8코어
double speedup = amdahl_speedup(0.95, 8);  // ≈ 5.9
```

### Amdahl 수치 예: 직렬 비율이 결정한다

같은 코드여도 직렬 비율에 따라 스케일링 곡선이 완전히 달라진다. 표는 코어 수가 16일 때의 가속비다.

| 직렬 비율 (1−P) | N=2 | N=4 | N=8 | N=16 | N=∞ |
|------|------|------|------|------|------|
| 1%   | 1.98 | 3.88 | 7.48 | 13.9 | 100  |
| 5%   | 1.90 | 3.48 | 5.93 | 9.14 | 20   |
| 10%  | 1.82 | 3.08 | 4.71 | 6.40 | 10   |
| 25%  | 1.60 | 2.29 | 2.91 | 3.37 | 4    |
| 50%  | 1.33 | 1.60 | 1.78 | 1.88 | 2    |

직렬 5%만 남아도 무한 코어 한계가 20배다. 25%면 4배가 천장이다. 측정으로 직렬 부분을 *먼저* 찾고, 거기서 직렬 비율을 줄이는 것이 일반적으로 코어를 늘리는 것보다 효과가 크다.

### Gustafson의 법칙

**문제 크기를 늘리면 병렬화 비율도 증가한다.**

$$
\text{Speedup} = N - (1-P)(N-1) \approx N \cdot P + (1-P)
$$

![Gustafson 법칙](/images/blog/cpp-concurrency-in-action/diagrams/ch08-gustafson-law.svg)

### 실용적 관점

| 법칙 | 관점 | 적용 |
|------|------|------|
| Amdahl | 고정 크기 문제 | 직렬 병목 최소화 |
| Gustafson | 확장 가능 문제 | 더 큰 문제 해결 |

**핵심:** 직렬 코드를 최소화하고, 가능하면 문제 크기를 확장하라.

### 세 가지 메모리 병목 — 구분이 먼저다

Williams는 8.2에서 "다중 스레드가 같은 데이터를 만지는 비용"을 세 단계로 나눠 설명한다. 셋은 비슷해 보이지만 원인과 해법이 다르다.

| 현상 | 원인 | 비용 | 해법 |
|------|------|------|------|
| Data contention | 실제 같은 변수에 여러 스레드가 쓴다 | 캐시 라인 무효화 + 동기화 | 알고리즘 자체를 바꾼다 (스레드별 누적 후 병합) |
| Cache ping-pong | 같은 캐시 라인이 코어 사이를 *왔다 갔다* | 캐시 라인 전송 + 무효화 메시지 | 접근 빈도 줄이기, 락 잘게 쪼개기 |
| False sharing | 다른 변수인데 한 캐시 라인에 모여 있어 *서로의* 라인을 무효화 | ping-pong과 동일하지만 *논리적* 데이터는 독립 | 패딩 / `alignas` |

True sharing(첫째)은 알고리즘 수준에서 해결한다. Ping-pong(둘째)은 접근 패턴 — 락의 입자, 갱신 주기 — 을 손본다. False sharing(셋째)은 메모리 레이아웃만 바꿔도 사라진다. 어느 단계인지 모르면 엉뚱한 곳을 손보다 시간을 버린다.

## 8.3 데이터 의존성

### 의존성 분석

```cpp
// 의존성 없음 → 완전 병렬화 가능
for (int i = 0; i < n; ++i) {
    result[i] = process(data[i]);
}

// 의존성 있음 → 병렬화 어려움
for (int i = 1; i < n; ++i) {
    result[i] = result[i-1] + data[i];  // 이전 결과에 의존
}
```

### 의존성 유형

**True Dependency (RAW — Read After Write)**

```cpp
a = 1;       // Write
b = a + 2;   // Read (a에 의존) → 반드시 순서 유지
```

**Anti-Dependency (WAR — Write After Read)**

```cpp
b = a + 2;   // Read
a = 3;       // Write → 재정렬 가능 (임시 변수로)
```

**Output Dependency (WAW — Write After Write)**

```cpp
a = 1;       // Write
a = 2;       // Write → 마지막 쓰기만 유지하면 됨
```

### 의존성 해결 기법

```cpp
// 문제: 누적 합 (prefix sum) - 의존성 있음
// result[i] = result[i-1] + data[i]

// 해결: 병렬 스캔 알고리즘
template<typename T>
std::vector<T> parallel_prefix_sum(const std::vector<T>& input) {
    const size_t n = input.size();
    std::vector<T> result(n);

    // Phase 1: 각 스레드가 로컬 prefix sum 계산
    const auto num_threads = std::thread::hardware_concurrency();
    const auto chunk_size = (n + num_threads - 1) / num_threads;

    std::vector<T> chunk_sums(num_threads);
    std::vector<std::thread> threads;

    for (size_t t = 0; t < num_threads; ++t) {
        threads.emplace_back([&, t] {
            size_t start = t * chunk_size;
            size_t end = std::min(start + chunk_size, n);

            T sum = 0;
            for (size_t i = start; i < end; ++i) {
                sum += input[i];
                result[i] = sum;
            }
            chunk_sums[t] = sum;
        });
    }

    for (auto& t : threads) t.join();

    // Phase 2: 청크 합의 prefix sum (직렬)
    for (size_t t = 1; t < num_threads; ++t) {
        chunk_sums[t] += chunk_sums[t - 1];
    }

    // Phase 3: 오프셋 적용 (병렬)
    threads.clear();
    for (size_t t = 1; t < num_threads; ++t) {
        threads.emplace_back([&, t] {
            size_t start = t * chunk_size;
            size_t end = std::min(start + chunk_size, n);
            T offset = chunk_sums[t - 1];

            for (size_t i = start; i < end; ++i) {
                result[i] += offset;
            }
        });
    }

    for (auto& t : threads) t.join();

    return result;
}
```

## 8.4 False Sharing

### 문제: 캐시 라인 충돌

![False Sharing — cache line bouncing](/images/blog/cpp-concurrency-in-action/diagrams/ch08-false-sharing.svg)

```cpp
// 💥 False sharing 발생
struct BadCounters {
    int counter1;  // 4 bytes
    int counter2;  // 4 bytes (같은 캐시 라인)
};

BadCounters counters;

// Thread 1: counter1 증가
void thread1() {
    for (int i = 0; i < 1'000'000; ++i) {
        ++counters.counter1;  // 💥 cache line bouncing
    }
}

// Thread 2: counter2 증가
void thread2() {
    for (int i = 0; i < 1'000'000; ++i) {
        ++counters.counter2;  // 💥 cache line bouncing
    }
}
```

### 해결: 캐시 라인 정렬

```cpp
// C++17: hardware_destructive_interference_size
#include <new>

struct alignas(std::hardware_destructive_interference_size) GoodCounters {
    struct alignas(std::hardware_destructive_interference_size) Counter {
        std::atomic<int> value{0};
    };

    Counter counter1;
    Counter counter2;  // 다른 캐시 라인
};

// 또는 수동 패딩
struct PaddedCounters {
    std::atomic<int> counter1;
    char padding1[60];  // 64 - 4 = 60 bytes padding
    std::atomic<int> counter2;
    char padding2[60];
};
```

### 벤치마크: False Sharing의 영향

```cpp
#include <chrono>
#include <iostream>
#include <thread>
#include <atomic>
#include <new>

constexpr size_t CACHE_LINE = 64;

struct BadLayout {
    std::atomic<long> a{0};
    std::atomic<long> b{0};
};

struct GoodLayout {
    alignas(CACHE_LINE) std::atomic<long> a{0};
    alignas(CACHE_LINE) std::atomic<long> b{0};
};

template<typename Layout>
void benchmark(const char* name) {
    Layout layout;
    constexpr int iterations = 100'000'000;

    auto start = std::chrono::high_resolution_clock::now();

    std::thread t1([&] {
        for (int i = 0; i < iterations; ++i) {
            layout.a.fetch_add(1, std::memory_order_relaxed);
        }
    });

    std::thread t2([&] {
        for (int i = 0; i < iterations; ++i) {
            layout.b.fetch_add(1, std::memory_order_relaxed);
        }
    });

    t1.join();
    t2.join();

    auto end = std::chrono::high_resolution_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    std::cout << name << ": " << ms.count() << "ms\n";
}

int main() {
    benchmark<BadLayout>("BadLayout (false sharing)");
    benchmark<GoodLayout>("GoodLayout (no false sharing)");
}

// 예상 결과:
// BadLayout (false sharing): ~2000ms
// GoodLayout (no false sharing): ~500ms
```

### C11 False Sharing 회피

```c
// C11 캐시 라인 정렬로 False Sharing 회피
#include <stdatomic.h>
#include <threads.h>
#include <stdalign.h>
#include <stdlib.h>
#include <time.h>
#include <stdio.h>

#define CACHE_LINE 64
#define ITERATIONS 100000000

// 나쁜 레이아웃: false sharing 발생
typedef struct {
    atomic_long a;
    atomic_long b;  // 같은 캐시 라인에 있을 가능성 높음
} BadLayout;

// 좋은 레이아웃: 캐시 라인 분리
typedef struct {
    _Alignas(CACHE_LINE) atomic_long a;
    _Alignas(CACHE_LINE) atomic_long b;  // 다른 캐시 라인
} GoodLayout;

typedef struct {
    atomic_long* counter;
} WorkerArg;

int worker(void* arg) {
    WorkerArg* wa = (WorkerArg*)arg;
    for (int i = 0; i < ITERATIONS; ++i) {
        atomic_fetch_add_explicit(wa->counter, 1, memory_order_relaxed);
    }
    return 0;
}

void benchmark_c11(const char* name, atomic_long* a, atomic_long* b) {
    thrd_t t1, t2;
    WorkerArg wa1 = {a};
    WorkerArg wa2 = {b};

    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);

    thrd_create(&t1, worker, &wa1);
    thrd_create(&t2, worker, &wa2);
    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    clock_gettime(CLOCK_MONOTONIC, &end);

    long ms = (end.tv_sec - start.tv_sec) * 1000 +
              (end.tv_nsec - start.tv_nsec) / 1000000;
    printf("%s: %ld ms\n", name, ms);
}

int main(void) {
    BadLayout bad = {0, 0};
    GoodLayout good = {0, 0};

    benchmark_c11("BadLayout (false sharing)", &bad.a, &bad.b);
    benchmark_c11("GoodLayout (no false sharing)", &good.a, &good.b);

    return 0;
}
```

## 8.5 데이터 레이아웃

### AoS vs SoA

![AoS vs SoA 메모리 레이아웃](/images/blog/cpp-concurrency-in-action/diagrams/ch08-aos-vs-soa.svg)

```cpp
// AoS: 개별 파티클 처리에 적합
struct ParticleAoS {
    float x, y, z;
    float vx, vy, vz;
};

void update_particle_aos(ParticleAoS& p, float dt) {
    p.x += p.vx * dt;  // 모든 필드가 같은 캐시 라인
    p.y += p.vy * dt;
    p.z += p.vz * dt;
}

// SoA: SIMD 벡터화에 적합
struct ParticlesSoA {
    std::vector<float> x, y, z;
    std::vector<float> vx, vy, vz;

    void update_positions(float dt) {
        const size_t n = x.size();
        // 벡터화 가능 (SIMD)
        for (size_t i = 0; i < n; ++i) {
            x[i] += vx[i] * dt;
        }
        for (size_t i = 0; i < n; ++i) {
            y[i] += vy[i] * dt;
        }
        for (size_t i = 0; i < n; ++i) {
            z[i] += vz[i] * dt;
        }
    }
};
```

### 선택 가이드

| 패턴 | 사용 시점 |
|------|-----------|
| AoS | 개별 객체 자주 접근, 객체 전체 처리 |
| SoA | 특정 필드만 대량 처리, SIMD 벡터화 |
| AoSoA | 둘의 장점 조합 (고급) |

### Contention을 줄이는 객체 분할

Williams의 8.4에서는 한 객체 안의 필드들을 *접근 패턴*에 따라 분리하라고 말한다. 같은 객체라도 여러 스레드가 *서로 다른 필드*만 만진다면, 그 필드들을 별도의 캐시 라인으로 갈라 둔다.

```cpp
// 회피 — 모든 필드가 같은 라인 안에서 충돌
struct ProtectedData {
    std::mutex mtx_read;
    int read_count{0};        // 읽기 카운터

    std::mutex mtx_write;
    int write_count{0};       // 쓰기 카운터

    std::mutex mtx_data;
    std::vector<int> data;    // 실제 데이터
};

// Good — 접근 패턴별로 분리 + 캐시 라인 정렬
struct alignas(std::hardware_destructive_interference_size) ReadCounter {
    std::mutex mtx;
    int count{0};
};

struct alignas(std::hardware_destructive_interference_size) WriteCounter {
    std::mutex mtx;
    int count{0};
};

struct SeparatedData {
    ReadCounter reads;
    WriteCounter writes;
    alignas(std::hardware_destructive_interference_size) std::vector<int> data;
    std::mutex data_mtx;
};
```

읽기 측정 스레드가 read_count만 만지고, 쓰기 측정 스레드가 write_count만 만지면, 두 카운터가 같은 라인에 있을 때 ping-pong이 계속 일어난다. 라인 단위로 갈라 두면 사라진다. 데이터 자체와도 같은 라인을 공유하지 않도록 패딩을 둔다.

### "혼자만의 캐시 라인"이 필요한 경우

스레드 풀의 워커, lock-free 큐의 head/tail, 카운터의 thread-local 슬롯처럼 *각 스레드가 거의 독점적으로* 만지는 변수는 자신만의 캐시 라인을 받아야 한다. C++17의 `hardware_destructive_interference_size`는 이 경계를 표준 상수로 노출한다(보통 64 또는 128).

```cpp
struct alignas(std::hardware_destructive_interference_size) WorkerSlot {
    std::atomic<size_t> head{0};
    std::atomic<size_t> tail{0};
    // 나머지는 padding으로 채워짐 (alignas의 부수효과)
};
```

## 8.6 Contention 회피

### Lock Contention

```cpp
// 💥 High contention: 모든 스레드가 같은 락 경쟁
class HighContention {
    std::mutex mtx_;
    int counter_ = 0;

public:
    void increment() {
        std::lock_guard lock(mtx_);
        ++counter_;
    }
};

// ✓ Low contention: 스레드별 로컬 카운터 + 주기적 병합
class LowContention {
    struct alignas(64) LocalCounter {
        std::atomic<int> value{0};
    };

    std::vector<LocalCounter> local_counters_;
    std::atomic<int> global_counter_{0};

public:
    explicit LowContention(int num_threads)
        : local_counters_(num_threads) {}

    void increment(int thread_id) {
        local_counters_[thread_id].value.fetch_add(1, std::memory_order_relaxed);
    }

    int get_total() {
        int sum = global_counter_.load(std::memory_order_relaxed);
        for (const auto& lc : local_counters_) {
            sum += lc.value.load(std::memory_order_relaxed);
        }
        return sum;
    }
};
```

### 락 분할 (Lock Striping)

```cpp
template<typename K, typename V, size_t NumStripes = 16>
class StripedMap {
    struct Stripe {
        std::shared_mutex mtx;
        std::unordered_map<K, V> map;
    };

    std::array<Stripe, NumStripes> stripes_;

    size_t get_stripe(const K& key) const {
        return std::hash<K>{}(key) % NumStripes;
    }

public:
    void insert(const K& key, const V& value) {
        auto& stripe = stripes_[get_stripe(key)];
        std::unique_lock lock(stripe.mtx);
        stripe.map[key] = value;
    }

    std::optional<V> get(const K& key) const {
        auto& stripe = stripes_[get_stripe(key)];
        std::shared_lock lock(stripe.mtx);
        auto it = stripe.map.find(key);
        if (it != stripe.map.end()) {
            return it->second;
        }
        return std::nullopt;
    }

    void remove(const K& key) {
        auto& stripe = stripes_[get_stripe(key)];
        std::unique_lock lock(stripe.mtx);
        stripe.map.erase(key);
    }
};
```

## 8.7 병렬 알고리즘 구현

책의 8.5는 표준 알고리즘 네 개를 *직접* 병렬화해 보는 절이다. 차례로 `accumulate`, `for_each`, `find`, `partial_sum`을 다룬다. 각 알고리즘은 다른 종류의 어려움을 가지고 있고, 거기서 일반 설계 원칙을 끌어낸다.

### Listing 8.7 — Parallel accumulate (예외 안전)

앞서 8.1의 `parallel_accumulate`는 예외가 던져지면 join 전에 스택이 풀려 `std::terminate`를 부른다. Williams는 `std::packaged_task` + RAII로 join을 보장하는 버전을 8.5에서 다시 보여 준다.

```cpp
template<typename Iterator, typename T>
struct accumulate_block {
    T operator()(Iterator first, Iterator last) {
        return std::accumulate(first, last, T{});
    }
};

class join_threads {
    std::vector<std::thread>& threads_;
public:
    explicit join_threads(std::vector<std::thread>& t) : threads_(t) {}
    ~join_threads() {
        for (auto& t : threads_) {
            if (t.joinable()) t.join();
        }
    }
};

template<typename Iterator, typename T>
T parallel_accumulate_safe(Iterator first, Iterator last, T init) {
    const auto length = std::distance(first, last);
    if (length == 0) return init;

    const size_t min_per_thread = 25;
    const size_t max_threads = (length + min_per_thread - 1) / min_per_thread;
    const auto hw = std::thread::hardware_concurrency();
    const auto num_threads = std::min(hw != 0 ? hw : 2u,
                                      static_cast<unsigned>(max_threads));
    const auto block_size = length / num_threads;

    std::vector<std::future<T>> futures(num_threads - 1);
    std::vector<std::thread> threads(num_threads - 1);
    join_threads joiner(threads);  // 예외 시 자동 join

    Iterator block_start = first;
    for (unsigned i = 0; i < num_threads - 1; ++i) {
        Iterator block_end = block_start;
        std::advance(block_end, block_size);

        std::packaged_task<T(Iterator, Iterator)> task{
            accumulate_block<Iterator, T>()};
        futures[i] = task.get_future();
        threads[i] = std::thread(std::move(task), block_start, block_end);

        block_start = block_end;
    }

    T last_result = accumulate_block<Iterator, T>()(block_start, last);

    T result = init;
    for (unsigned i = 0; i < num_threads - 1; ++i) {
        result += futures[i].get();  // worker의 예외가 여기서 다시 던져진다
    }
    result += last_result;
    return result;
}
```

`packaged_task`는 워커에서 던져진 예외를 future에 *저장*한다. main 스레드가 `get()`을 부를 때 같은 예외가 다시 올라온다. join은 RAII로 보장되므로 어떤 워커가 예외를 던져도 leaked thread는 없다.

### Listing 8.8 — Parallel for_each

`for_each`는 반환값이 없어 `accumulate`보다 간단해 보인다. 그러나 예외 전파는 똑같이 필요하다. `std::async`는 launch::async로 띄울 때 future 안에 예외를 *자동으로* 저장한다. 모든 future에 `get()`을 호출하면 첫 번째 예외가 다시 던져진다.

```cpp
template<typename Iterator, typename Func>
void parallel_for_each(Iterator first, Iterator last, Func f) {
    const auto length = std::distance(first, last);
    if (length == 0) return;

    const auto hardware_threads = std::thread::hardware_concurrency();
    const auto num_threads = std::min(
        hardware_threads != 0 ? hardware_threads : 2,
        static_cast<unsigned long>(length)
    );
    const auto block_size = length / num_threads;

    std::vector<std::future<void>> futures(num_threads - 1);
    Iterator block_start = first;

    for (unsigned long i = 0; i < num_threads - 1; ++i) {
        Iterator block_end = block_start;
        std::advance(block_end, block_size);

        futures[i] = std::async(std::launch::async, [=, &f] {
            std::for_each(block_start, block_end, f);
        });

        block_start = block_end;
    }

    // 마지막 블록은 현재 스레드에서
    std::for_each(block_start, last, f);

    // 모든 스레드 대기
    for (auto& fut : futures) {
        fut.get();
    }
}
```

`std::async`로 띄운 future들의 `get()`은 *예외 전파*를 자연스럽게 처리한다. 워커에서 던져진 어떤 예외든 future에 저장돼, 호출자가 받게 된다. 여러 worker가 동시에 던지면 첫 `get()`이 첫 예외를, 그 시점에서 함수가 나가면서 나머지 future들은 소멸자에서 자기 스레드를 기다린다(launch::async일 때). 단, 두 번째 이후 예외들은 *조용히 사라진다*.

### Listing 8.9 — Parallel find

```cpp
template<typename Iterator, typename T>
Iterator parallel_find(Iterator first, Iterator last, const T& value) {
    const auto length = std::distance(first, last);
    if (length == 0) return last;

    const auto hardware_threads = std::thread::hardware_concurrency();
    const auto num_threads = std::min(
        hardware_threads != 0 ? hardware_threads : 2,
        static_cast<unsigned long>(length)
    );
    const auto block_size = length / num_threads;

    std::atomic<bool> found{false};
    std::atomic<Iterator> result{last};

    std::vector<std::thread> threads(num_threads);
    Iterator block_start = first;

    for (unsigned long i = 0; i < num_threads; ++i) {
        Iterator block_end = (i == num_threads - 1) ? last : block_start;
        if (i != num_threads - 1) {
            std::advance(block_end, block_size);
        }

        threads[i] = std::thread([=, &found, &result, &value] {
            for (Iterator it = block_start; it != block_end && !found.load(); ++it) {
                if (*it == value) {
                    found.store(true);
                    result.store(it);
                    return;
                }
            }
        });

        block_start = block_end;
    }

    for (auto& t : threads) {
        t.join();
    }

    return result.load();
}
```

`find`가 흥미로운 점은 "*다른* 스레드가 찾으면 *나는* 멈춰도 된다"는 조기 종료 의미가 있다는 것이다. `accumulate`는 모든 블록을 다 봐야 하지만, `find`는 매치 하나면 충분하다. `found` 플래그를 atomic으로 두고 매 반복마다 확인한다. 책은 이 플래그가 *너무 자주* 확인되지 않게 청크 단위로 검사하는 변형도 제시한다 — 매 원소마다 atomic load를 부르면 그 자체가 비용이다.

```cpp
// 청크 단위 조기 종료 — 매 원소가 아닌 매 청크 끝에만 검사
for (Iterator it = block_start; it != block_end; ) {
    Iterator chunk_end = it;
    std::advance(chunk_end, std::min<ptrdiff_t>(64, block_end - it));
    for (; it != chunk_end; ++it) {
        if (*it == value) { /* 찾음 */ return; }
    }
    if (found.load(std::memory_order_relaxed)) return;  // 청크 사이에서만 검사
}
```

### Parallel reduce

```cpp
template<typename Iterator, typename T, typename BinaryOp>
T parallel_reduce(Iterator first, Iterator last, T init, BinaryOp op) {
    const auto length = std::distance(first, last);
    if (length == 0) return init;

    const auto hardware_threads = std::thread::hardware_concurrency();
    const auto num_threads = std::min(
        hardware_threads != 0 ? hardware_threads : 2,
        static_cast<unsigned long>(length)
    );
    const auto block_size = length / num_threads;

    std::vector<std::future<T>> futures(num_threads - 1);
    Iterator block_start = first;

    for (unsigned long i = 0; i < num_threads - 1; ++i) {
        Iterator block_end = block_start;
        std::advance(block_end, block_size);

        futures[i] = std::async(std::launch::async, [=, &op] {
            return std::accumulate(block_start, block_end, T{}, op);
        });

        block_start = block_end;
    }

    T local_result = std::accumulate(block_start, last, T{}, op);

    T final_result = op(init, local_result);
    for (auto& fut : futures) {
        final_result = op(final_result, fut.get());
    }

    return final_result;
}

// 사용 예
std::vector<int> data = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
int sum = parallel_reduce(data.begin(), data.end(), 0, std::plus<int>{});
int product = parallel_reduce(data.begin(), data.end(), 1, std::multiplies<int>{});
```

### Listing 8.11 — Parallel partial_sum

`partial_sum` (= prefix sum / scan)은 책에서 *가장 까다로운* 사례로 다뤄진다. 출력 원소가 모든 이전 입력에 의존하기 때문이다. Williams는 두 가지 접근을 제시한다.

**접근 1 — 블록별 합 + 오프셋 누적 (3-phase)**
8.3절의 `parallel_prefix_sum`이 이미 이 방식이다. 한 번 전체를 훑고, 직렬로 블록 합의 prefix sum을 계산한 뒤, 다시 한 번 훑어 오프셋을 더한다. 메모리는 2회 통과, 일은 약 2배지만 *각 통과가 완전히 병렬*이다.

**접근 2 — 쌍별 갱신 (pairwise propagation, 책의 메인 listing)**
스레드들이 동기화 지점에서 만나며 *서로의 부분합*을 단계적으로 갱신한다. 거리 1, 2, 4, … 만큼 떨어진 이웃과 더해 나가면 $\log_2 N$ 단계 후 모든 위치에 정답이 들어선다.

```cpp
template<typename Iterator>
void parallel_partial_sum(Iterator first, Iterator last) {
    using value_type = typename Iterator::value_type;
    const auto length = std::distance(first, last);
    if (length <= 1) return;

    const auto hw = std::thread::hardware_concurrency();
    const auto num_threads = std::min(hw != 0 ? hw : 2u,
                                      static_cast<unsigned>(length));
    const auto block_size = length / num_threads;

    using future_t = std::future<void>;
    std::vector<future_t> futures(num_threads - 1);
    std::vector<value_type> end_values(num_threads);
    std::vector<std::promise<value_type>> end_promises(num_threads - 1);

    // Phase 1: 각 블록 안에서 로컬 partial_sum
    // Phase 2: 이전 블록의 끝 값을 받아 자기 블록에 더함
    auto worker = [&](Iterator b, Iterator e, unsigned idx) {
        std::partial_sum(b, e, b);
        if (idx < num_threads - 1) {
            end_promises[idx].set_value(*std::prev(e));
        }
        if (idx > 0) {
            value_type prev_end = end_promises[idx - 1].get_future().get();
            for (auto it = b; it != e; ++it) *it += prev_end;
            if (idx < num_threads - 1) {
                // 이미 set_value한 promise는 갱신 못 함 — 위 흐름은 단순화
            }
        }
    };

    // (실제 책 리스팅은 promise/future로 단계별 동기화를 정밀하게 묶는다)
}
```

실전에서는 두 접근의 비용/스레드 수에 따라 선택이 갈린다. 메모리 대역이 충분하고 스레드 수가 적당하면 접근 1이 단순하고 빠르다. 스레드가 많아 동기화 오버헤드를 흡수할 수 있으면 접근 2가 메모리를 덜 쓴다. 책은 양쪽 모두 직렬 코드보다 *작은 N에서는* 느릴 수 있음을 짚는다. 항상 측정한다.

## 8.8 예외 안전성

### 병렬 코드의 예외 처리

```cpp
template<typename Iterator, typename Func>
void parallel_for_each_safe(Iterator first, Iterator last, Func f) {
    const auto length = std::distance(first, last);
    if (length == 0) return;

    const auto num_threads = std::thread::hardware_concurrency();
    const auto block_size = length / num_threads;

    std::vector<std::future<void>> futures;
    std::exception_ptr exception = nullptr;
    std::mutex exception_mutex;

    Iterator block_start = first;
    for (unsigned long i = 0; i < num_threads; ++i) {
        Iterator block_end = (i == num_threads - 1) ? last : block_start;
        if (i != num_threads - 1) {
            std::advance(block_end, block_size);
        }

        futures.push_back(std::async(std::launch::async, [=, &exception, &exception_mutex, &f] {
            try {
                for (Iterator it = block_start; it != block_end; ++it) {
                    f(*it);
                }
            } catch (...) {
                std::lock_guard lock(exception_mutex);
                if (!exception) {
                    exception = std::current_exception();
                }
            }
        }));

        block_start = block_end;
    }

    // 모든 스레드 대기
    for (auto& fut : futures) {
        fut.wait();
    }

    // 예외가 있으면 다시 던지기
    if (exception) {
        std::rethrow_exception(exception);
    }
}
```

### `std::async`의 예외 전파 — 미묘한 함정

`std::async`로 띄운 future는 worker가 던진 예외를 자동으로 저장한다. 호출 측이 `get()` 또는 `wait_for()`를 부르면 예외가 다시 던져진다. 이 동작 자체는 안전하지만, 두 가지 함정이 있다.

1. **launch policy를 명시하지 않으면 deferred일 수 있다.** 디폴트 `std::async(f)`는 구현이 `async`나 `deferred`를 *선택*한다. deferred면 `get()`을 부를 때까지 *호출조차* 일어나지 않는다. 진짜 병렬을 원하면 항상 `std::launch::async`를 명시한다.
2. **future의 소멸자가 *블록*할 수 있다.** `std::async(launch::async, ...)`가 만든 future는 마지막 reference가 사라질 때 자동으로 join한다. 예외 경로에서 future들이 줄줄이 소멸하면 호출자가 의도치 않게 모든 worker 완료를 기다린다.

```cpp
// 회피 — 첫 future가 예외를 받자마자 함수가 나가지만,
// 나머지 future들이 소멸자에서 자기 worker를 기다린다 (의도와 다를 수 있다)
void run_all() {
    std::vector<std::future<void>> fs;
    for (int i = 0; i < 8; ++i)
        fs.push_back(std::async(std::launch::async, work, i));
    for (auto& f : fs) f.get();   // 어느 하나가 던지면 나머지는?
}

// Good — 모든 future를 한 곳에서 거두고 예외를 종합한다
void run_all_collected() {
    std::vector<std::future<void>> fs;
    for (int i = 0; i < 8; ++i)
        fs.push_back(std::async(std::launch::async, work, i));

    std::exception_ptr first_ex;
    for (auto& f : fs) {
        try { f.get(); }
        catch (...) { if (!first_ex) first_ex = std::current_exception(); }
    }
    if (first_ex) std::rethrow_exception(first_ex);
}
```

### 숨은 contention — 공유 메모리 할당자

병렬화한 알고리즘이 기대만큼 빨라지지 않을 때, 자주 놓치는 원인이 *전역 메모리 할당자*다. `new`, `std::vector::push_back`, `std::string` 생성 — 모두 내부적으로 같은 힙을 만진다. 표준 라이브러리 구현은 락 또는 atomic CAS로 자유 리스트를 보호하므로, 100% "병렬"로 보이는 코드가 사실은 할당자 락에서 직렬화된다.

```cpp
// 워커가 매 반복마다 작은 vector를 할당한다 — 할당자 락에서 직렬화될 수 있다
void slow_worker(const Input& in) {
    std::vector<int> tmp;  // 매번 new
    for (auto& x : in) tmp.push_back(process(x));
    save(tmp);
}

// Good — 버퍼를 재사용하거나 thread-local로 둔다
void fast_worker(const Input& in) {
    thread_local std::vector<int> tmp;
    tmp.clear();
    for (auto& x : in) tmp.push_back(process(x));
    save(tmp);
}
```

해법은 몇 가지다.

- **thread-local 재사용 버퍼** — 위 예처럼 워커마다 자신의 버퍼를 유지.
- **arena/bump allocator** — 작업 시작 시 큰 블록을 한 번 할당하고 그 안에서 잘라 쓰는 할당자(예: `std::pmr::monotonic_buffer_resource`).
- **thread-caching 할당자** — jemalloc, tcmalloc, mimalloc. 스레드별 캐시를 두어 전역 락 빈도를 낮춤.

`std::pmr` (C++17 polymorphic memory resource)는 이 패턴을 표준으로 제공한다.

```cpp
#include <memory_resource>

void pmr_worker(std::span<const Input> in) {
    std::array<std::byte, 64 * 1024> buf;
    std::pmr::monotonic_buffer_resource arena{buf.data(), buf.size()};
    std::pmr::vector<int> tmp{&arena};

    for (auto& x : in) tmp.push_back(process(x));
    save(tmp);
    // arena는 함수가 끝날 때 한꺼번에 풀려난다 — 개별 free 없음
}
```

전역 할당자 외에도 `std::cout`, `std::cerr`, 공유 로거, 글로벌 카운터, 통계 객체 등도 같은 함정에 빠진다. 프로파일러에서 락 wait가 의외의 곳에서 잡히면 *어떤* 공유 자원이 보이는지 확인한다.

### std::jthread와 중단

```cpp
#include <stop_token>

void cancellable_work(std::stop_token stoken) {
    while (!stoken.stop_requested()) {
        // 작업 수행
        do_work();
    }
    // 정리
    cleanup();
}

void parallel_with_cancellation() {
    std::vector<std::jthread> threads;

    for (int i = 0; i < 4; ++i) {
        threads.emplace_back(cancellable_work);
    }

    // 일정 시간 후 모두 중단
    std::this_thread::sleep_for(std::chrono::seconds(5));

    // jthread 소멸 시 자동으로 stop_request + join
}
```

## 8.9 작업 단위 결정

### 최적 입자도 (Granularity)

![작업 입자도 트레이드오프](/images/blog/cpp-concurrency-in-action/diagrams/ch08-task-granularity.svg)

### 경험 법칙

```cpp
// 작업 단위 크기 결정
size_t calculate_chunk_size(size_t total_work, unsigned num_threads) {
    // 경험 법칙: 스레드 수의 4~8배 청크
    const size_t min_chunks = num_threads * 4;
    const size_t max_chunk_size = total_work / min_chunks;

    // 최소 작업량 보장
    const size_t min_work_per_chunk = 1000;  // 작업 유형에 따라 조정

    return std::max(min_work_per_chunk, max_chunk_size);
}

// 동적 로드 밸런싱
template<typename Func>
void work_stealing_for(size_t total, Func f) {
    std::atomic<size_t> next_index{0};
    const size_t chunk_size = 64;  // 작은 청크로 로드 밸런싱

    auto worker = [&] {
        while (true) {
            size_t start = next_index.fetch_add(chunk_size);
            if (start >= total) break;

            size_t end = std::min(start + chunk_size, total);
            for (size_t i = start; i < end; ++i) {
                f(i);
            }
        }
    };

    const auto num_threads = std::thread::hardware_concurrency();
    std::vector<std::thread> threads;

    for (unsigned i = 0; i < num_threads; ++i) {
        threads.emplace_back(worker);
    }

    for (auto& t : threads) {
        t.join();
    }
}
```

## 8.10 가이드라인 요약

### 설계 체크리스트

| 항목 | 확인 |
|------|------|
| 작업 분할 전략 | 데이터 병렬 vs 작업 병렬 결정 |
| 의존성 분석 | 병렬화 가능 여부 확인 |
| False sharing | 캐시 라인 정렬 |
| 데이터 레이아웃 | AoS vs SoA 선택 |
| Contention | 락 분할, 로컬 카운터 |
| 입자도 | 작업 단위 크기 결정 |
| 예외 안전 | 예외 전파 처리 |

### 성능 최적화 순서

1. **알고리즘 선택**: 가장 큰 영향
2. **데이터 레이아웃**: 캐시 효율
3. **False sharing 제거**: 캐시 라인 정렬
4. **Contention 감소**: 락 분할
5. **입자도 조정**: 오버헤드 vs 로드 밸런싱

## 정리

- **데이터 병렬**은 같은 연산을 다른 데이터에, **작업 병렬**은 다른 연산을 동시에
- **Amdahl의 법칙**: 직렬 코드가 병렬화 한계를 결정한다
- **False sharing**은 성능을 크게 저하시킨다. 캐시 라인 정렬로 해결
- **데이터 의존성**을 분석하여 병렬화 가능 여부를 판단하라
- **SoA**는 SIMD와 특정 필드 처리에, **AoS**는 개별 객체 접근에 적합
- **예외 안전성**을 고려하여 병렬 코드를 설계하라

## 한국 개발자의 함정

```
1. *N코어 = N배 빠름*
   - Amdahl로 깨짐 (직렬 부분 한계)
   - 동기화 + cache + memory bandwidth 병목
   - 보통 80%도 이상적

2. *False sharing 무시*
   - 다른 변수인데 같은 cache line이면 ping-pong
   - 측정 안 하면 발견 어려움
   - alignas(64) 또는 hardware_destructive_interference_size

3. *작업 단위가 작을수록 좋음*
   - 스레드 생성/동기화 오버헤드 큼
   - 보통 청크 = N_threads × 4~8
   - 너무 크면 load imbalance

4. *모든 코드가 thread-safe 필요*
   - 단일 스레드 코드는 그대로 두기
   - 공유 데이터만 보호
   - 과도한 락은 성능 저하

5. *AoS / SoA 자동 결정*
   - SIMD / cache 패턴이 다름
   - 워크로드 분석 필요
   - 게임/HPC는 SoA가 보통 빠름
```

## 실무 적용

```
이론 → 실무:
- Parallel for_each      → std::for_each(par, ...) (C++17 병렬 알고리즘)
- Parallel reduce        → std::reduce(par, ...) (C++17)
- Work-stealing          → Intel oneTBB (구 TBB), rayon (Rust), ForkJoinPool (Java)
- Pipeline               → oneTBB flow graph, GStreamer, Akka Streams (Akka는 2022년 BSL 재라이선싱 — 오픈소스 후속은 Apache Pekko)
- SIMD                   → std::simd (C++26 표준화 진행), std::experimental::simd, Highway, xsimd
- False sharing 회피     → alignas(64), padding

언어/프레임워크:
- C++: std::execution::par, oneTBB, OpenMP, MPI
- Rust: rayon, crossbeam
- Java: parallel streams, ForkJoinPool
- Go: goroutine + channel
- Python: multiprocessing (GIL 우회)

설계 패턴:
- Embarrassingly parallel → parallel for_each
- Reduce/Aggregate       → parallel reduce
- Pipeline               → producer-consumer chain
- Scatter-gather         → 데이터 분배 + 결과 수집
- Map-Reduce             → Hadoop / Spark 패턴
```

## 자기 점검

```
□ Amdahl과 Gustafson 차이?
□ False sharing 메커니즘과 회피 방법?
□ AoS vs SoA 선택 기준?
□ Lock striping의 작동?
□ Critical section을 *최소화*하는 방법?
□ 작업 단위 결정 (입자도) 기준?
□ Parallel reduce가 commutative + associative 필요한 이유?
```

## 다음 장 예고

다음 장에서는 고급 스레드 관리를 다룬다. 스레드 풀, 작업 훔치기, 인터럽트 등을 살펴본다.

## 관련 항목

- [Ch 6: Lock-based Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
- [Ch 7: Lock-free Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
- [Ch 9: Advanced Thread Management](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
- [Ch 10: Parallel Algorithms](/blog/parallel/cpp-concurrency-in-action/chapter10-parallel-algorithms)
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction) — Amdahl
- [AMP Ch 12: Counting & Sorting](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination) — sharded counter
- [AMP Ch 16: Work Stealing](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
