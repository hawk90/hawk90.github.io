---
title: "Ch 10: Parallel algorithms"
date: 2026-05-06T10:00:00
description: "C++17 execution policy — seq / par / par_unseq / unseq. std::reduce, transform_reduce."
tags: [C++, C, Concurrency, Parallel Algorithms, Execution Policy]
series: "C++ Concurrency in Action"
seriesOrder: 10
draft: true
---

C++17은 표준 알고리즘에 병렬 실행을 추가했다. 실행 정책 하나로 순차/병렬/벡터화를 선택할 수 있다.

## 10.1 실행 정책 (Execution Policy)

### 네 가지 정책

```cpp
#include <execution>

std::execution::seq       // 순차 실행 (기본)
std::execution::par       // 병렬 실행
std::execution::par_unseq // 병렬 + 벡터화
std::execution::unseq     // 벡터화 (C++20)
```

![Execution policy 비교](/images/blog/cpp-concurrency-in-action/diagrams/ch10-execution-policies.svg)

### 정책별 특성

| 정책 | 병렬 | 벡터화 | 스레드 안전 요구 | 락 사용 가능 |
|------|------|--------|-----------------|-------------|
| `seq` | X | X | X | O |
| `par` | O | X | O | O |
| `par_unseq` | O | O | O | X |
| `unseq` | X | O | X | X |

### 기본 사용법

```cpp
#include <algorithm>
#include <execution>
#include <vector>

std::vector<int> data(1'000'000);

// 순차
std::sort(std::execution::seq, data.begin(), data.end());

// 병렬
std::sort(std::execution::par, data.begin(), data.end());

// 병렬 + 벡터화
std::sort(std::execution::par_unseq, data.begin(), data.end());
```

### C11의 병렬 알고리즘

C11에는 실행 정책이 없다. 병렬 알고리즘을 사용하려면 직접 구현하거나 OpenMP를 활용해야 한다.

```c
#include <threads.h>
#include <stdlib.h>
#include <string.h>

// 수동 병렬 reduce 구현
typedef struct {
    const int* data;
    size_t start;
    size_t end;
    long long result;
} ReduceArg;

static int reduce_worker(void* arg) {
    ReduceArg* ra = (ReduceArg*)arg;
    long long sum = 0;
    for (size_t i = ra->start; i < ra->end; ++i) {
        sum += ra->data[i];
    }
    ra->result = sum;
    return 0;
}

long long parallel_reduce(const int* data, size_t n, size_t num_threads) {
    thrd_t* threads = malloc(sizeof(thrd_t) * num_threads);
    ReduceArg* args = malloc(sizeof(ReduceArg) * num_threads);

    size_t chunk_size = n / num_threads;

    for (size_t i = 0; i < num_threads; ++i) {
        args[i].data = data;
        args[i].start = i * chunk_size;
        args[i].end = (i == num_threads - 1) ? n : (i + 1) * chunk_size;
        thrd_create(&threads[i], reduce_worker, &args[i]);
    }

    long long total = 0;
    for (size_t i = 0; i < num_threads; ++i) {
        thrd_join(threads[i], NULL);
        total += args[i].result;
    }

    free(threads);
    free(args);
    return total;
}

// 사용 예
int main(void) {
    int data[1000000];
    for (int i = 0; i < 1000000; ++i) data[i] = i;

    long long sum = parallel_reduce(data, 1000000, 4);
    printf("Sum: %lld\n", sum);  // 499999500000

    return 0;
}
```

**OpenMP를 사용한 C11 병렬 처리:**

```c
#include <omp.h>
#include <stdio.h>

// OpenMP parallel reduce
long long parallel_reduce_omp(const int* data, size_t n) {
    long long sum = 0;

    #pragma omp parallel for reduction(+:sum)
    for (size_t i = 0; i < n; ++i) {
        sum += data[i];
    }

    return sum;
}

// OpenMP parallel for_each
void parallel_for_each_omp(int* data, size_t n) {
    #pragma omp parallel for
    for (size_t i = 0; i < n; ++i) {
        data[i] *= 2;
    }
}

// 컴파일: gcc -fopenmp program.c -o program
```

**C11 vs C++17 병렬 알고리즘 비교:**

| 기능 | C++17 | C11 |
|------|-------|-----|
| 실행 정책 | `std::execution::par` | 없음 (수동 구현) |
| 병렬 reduce | `std::reduce` | 직접 구현 또는 OpenMP |
| 병렬 transform | `std::transform` | 직접 구현 또는 OpenMP |
| 병렬 sort | `std::sort(par, ...)` | 직접 구현 필요 |
| SIMD 힌트 | `par_unseq`, `unseq` | 컴파일러 지시자 |

## 10.2 병렬 알고리즘 카탈로그

### 변환/적용 알고리즘

```cpp
#include <algorithm>
#include <execution>
#include <vector>

std::vector<int> input(1'000'000);
std::vector<int> output(1'000'000);

// for_each: 각 요소에 함수 적용
std::for_each(std::execution::par, input.begin(), input.end(),
    [](int& x) { x *= 2; });

// transform: 변환하여 다른 컨테이너에 저장
std::transform(std::execution::par, input.begin(), input.end(),
    output.begin(), [](int x) { return x * x; });

// fill: 값으로 채우기
std::fill(std::execution::par, output.begin(), output.end(), 0);

// generate: 생성 함수로 채우기
std::generate(std::execution::par, output.begin(), output.end(),
    [n = 0]() mutable { return n++; });
```

### 검색/찾기 알고리즘

```cpp
// find: 값 찾기
auto it = std::find(std::execution::par, data.begin(), data.end(), 42);

// find_if: 조건으로 찾기
auto it2 = std::find_if(std::execution::par, data.begin(), data.end(),
    [](int x) { return x > 100; });

// any_of / all_of / none_of
bool has_negative = std::any_of(std::execution::par,
    data.begin(), data.end(), [](int x) { return x < 0; });

bool all_positive = std::all_of(std::execution::par,
    data.begin(), data.end(), [](int x) { return x >= 0; });

// count_if
auto count = std::count_if(std::execution::par,
    data.begin(), data.end(), [](int x) { return x % 2 == 0; });
```

### 정렬 알고리즘

```cpp
// sort: 정렬
std::sort(std::execution::par, data.begin(), data.end());

// stable_sort: 안정 정렬
std::stable_sort(std::execution::par, data.begin(), data.end());

// partial_sort: 부분 정렬
std::partial_sort(std::execution::par,
    data.begin(), data.begin() + 100, data.end());

// nth_element: n번째 요소 찾기
std::nth_element(std::execution::par,
    data.begin(), data.begin() + 50, data.end());
```

### 수치 알고리즘 (C++17)

```cpp
#include <numeric>

// reduce: 리덕션 (병렬 가능)
long long sum = std::reduce(std::execution::par,
    data.begin(), data.end(), 0LL);

// transform_reduce: 변환 + 리덕션
long long sum_squares = std::transform_reduce(std::execution::par,
    data.begin(), data.end(),
    0LL,                    // 초기값
    std::plus<>{},          // 리덕션 연산
    [](int x) { return static_cast<long long>(x) * x; }  // 변환
);

// inclusive_scan: 누적 합 (포함)
std::vector<int> prefix_sum(data.size());
std::inclusive_scan(std::execution::par,
    data.begin(), data.end(), prefix_sum.begin());

// exclusive_scan: 누적 합 (미포함)
std::exclusive_scan(std::execution::par,
    data.begin(), data.end(), prefix_sum.begin(), 0);

// transform_inclusive_scan: 변환 + 누적 합
std::transform_inclusive_scan(std::execution::par,
    data.begin(), data.end(), prefix_sum.begin(),
    std::plus<>{},
    [](int x) { return x * 2; });
```

## 10.3 reduce vs accumulate

### 핵심 차이

```cpp
// accumulate: 순차적, 왼쪽에서 오른쪽으로
// ((((init + a) + b) + c) + d)
auto sum1 = std::accumulate(data.begin(), data.end(), 0);

// reduce: 병렬 가능, 순서 불확정
// (init + a) + (b + c) + d  또는
// (a + b) + (c + (init + d)) 등
auto sum2 = std::reduce(std::execution::par,
    data.begin(), data.end(), 0);
```

### 수학적 요구사항

**reduce가 요구하는 연산 속성**

- **결합법칙 (Associativity)**: $(a \oplus b) \oplus c = a \oplus (b \oplus c)$ — 예: 덧셈 O, 뺄셈 X
- **가환법칙 (Commutativity)**: $a \oplus b = b \oplus a$ — 예: 덧셈 O, 뺄셈 X

병렬 실행은 순서를 보장하지 않는다.

```cpp
// ✓ 올바른 사용: 결합법칙 + 가환법칙 만족
std::reduce(std::execution::par, v.begin(), v.end(), 0, std::plus<>{});
std::reduce(std::execution::par, v.begin(), v.end(), 1, std::multiplies<>{});
std::reduce(std::execution::par, v.begin(), v.end(), 0, std::bit_xor<>{});

// 💥 잘못된 사용: 뺄셈은 결합법칙 불만족
// (1 - 2) - 3 = -4  vs  1 - (2 - 3) = 2
std::reduce(std::execution::par, v.begin(), v.end(), 0, std::minus<>{});

// 💥 잘못된 사용: 부동소수점 덧셈은 결합법칙 근사
// 결과가 순서에 따라 달라질 수 있음 (허용 가능한 경우가 많음)
std::reduce(std::execution::par, floats.begin(), floats.end(), 0.0f);
```

### 부동소수점 주의사항

```cpp
std::vector<float> floats = {1e20f, -1e20f, 1.0f};

// accumulate: 순서 보장
// 1e20 + (-1e20) + 1 = 1
float a = std::accumulate(floats.begin(), floats.end(), 0.0f);  // 1.0

// reduce: 순서 불확정
// 가능한 결과: 1.0 또는 0.0 (부동소수점 정밀도 문제)
float r = std::reduce(std::execution::par,
    floats.begin(), floats.end(), 0.0f);  // 1.0 또는 0.0
```

## 10.4 transform_reduce 패턴

### 맵-리듀스 패턴

```cpp
// 패턴: Map → Reduce
// 1. 각 요소를 변환 (map)
// 2. 결과를 하나로 합침 (reduce)

// 예: 제곱 합
auto sum_of_squares = std::transform_reduce(
    std::execution::par,
    data.begin(), data.end(),
    0LL,                           // 초기값
    std::plus<>{},                 // reduce 연산
    [](int x) -> long long {       // transform 연산
        return static_cast<long long>(x) * x;
    }
);

// 예: 벡터 내적
std::vector<double> a = {1.0, 2.0, 3.0};
std::vector<double> b = {4.0, 5.0, 6.0};

double dot_product = std::transform_reduce(
    std::execution::par,
    a.begin(), a.end(),
    b.begin(),
    0.0,                    // 초기값
    std::plus<>{},          // reduce: 합
    std::multiplies<>{}     // transform: 곱
);
// 1*4 + 2*5 + 3*6 = 32
```

### 복잡한 리덕션

```cpp
struct Stats {
    double sum = 0;
    double sum_sq = 0;
    size_t count = 0;

    Stats operator+(const Stats& other) const {
        return {sum + other.sum, sum_sq + other.sum_sq, count + other.count};
    }
};

// 한 번의 패스로 평균과 분산 계산
Stats stats = std::transform_reduce(
    std::execution::par,
    data.begin(), data.end(),
    Stats{},
    std::plus<>{},  // Stats의 operator+ 사용
    [](int x) {
        return Stats{static_cast<double>(x),
                     static_cast<double>(x) * x, 1};
    }
);

double mean = stats.sum / stats.count;
double variance = (stats.sum_sq / stats.count) - (mean * mean);
```

### C11 transform_reduce 구현

C11에서 transform_reduce 패턴을 직접 구현한다.

```c
#include <threads.h>
#include <stdlib.h>

typedef struct {
    double sum;
    double sum_sq;
    size_t count;
} Stats;

typedef struct {
    const int* data;
    size_t start;
    size_t end;
    Stats result;
} TransformReduceArg;

static int stats_worker(void* arg) {
    TransformReduceArg* tra = (TransformReduceArg*)arg;
    Stats s = {0, 0, 0};

    for (size_t i = tra->start; i < tra->end; ++i) {
        double x = (double)tra->data[i];
        s.sum += x;
        s.sum_sq += x * x;
        s.count++;
    }

    tra->result = s;
    return 0;
}

Stats parallel_stats(const int* data, size_t n, size_t num_threads) {
    thrd_t* threads = malloc(sizeof(thrd_t) * num_threads);
    TransformReduceArg* args = malloc(sizeof(TransformReduceArg) * num_threads);

    size_t chunk_size = n / num_threads;

    for (size_t i = 0; i < num_threads; ++i) {
        args[i].data = data;
        args[i].start = i * chunk_size;
        args[i].end = (i == num_threads - 1) ? n : (i + 1) * chunk_size;
        thrd_create(&threads[i], stats_worker, &args[i]);
    }

    Stats total = {0, 0, 0};
    for (size_t i = 0; i < num_threads; ++i) {
        thrd_join(threads[i], NULL);
        total.sum += args[i].result.sum;
        total.sum_sq += args[i].result.sum_sq;
        total.count += args[i].result.count;
    }

    free(threads);
    free(args);
    return total;
}

int main(void) {
    int data[1000000];
    for (int i = 0; i < 1000000; ++i) data[i] = i;

    Stats stats = parallel_stats(data, 1000000, 4);

    double mean = stats.sum / stats.count;
    double variance = (stats.sum_sq / stats.count) - (mean * mean);

    printf("Mean: %f, Variance: %f\n", mean, variance);

    return 0;
}
```

## 10.5 스캔 알고리즘 (Prefix Sum)

### inclusive vs exclusive

```
입력:  [1, 2, 3, 4, 5]

inclusive_scan (포함):
[1, 1+2, 1+2+3, 1+2+3+4, 1+2+3+4+5]
= [1, 3, 6, 10, 15]

exclusive_scan (미포함, init=0):
[0, 0+1, 0+1+2, 0+1+2+3, 0+1+2+3+4]
= [0, 1, 3, 6, 10]
```

```cpp
std::vector<int> input = {1, 2, 3, 4, 5};
std::vector<int> inclusive_result(5);
std::vector<int> exclusive_result(5);

// inclusive_scan
std::inclusive_scan(std::execution::par,
    input.begin(), input.end(), inclusive_result.begin());
// [1, 3, 6, 10, 15]

// exclusive_scan
std::exclusive_scan(std::execution::par,
    input.begin(), input.end(), exclusive_result.begin(), 0);
// [0, 1, 3, 6, 10]
```

### C11 parallel prefix sum (scan)

병렬 prefix sum은 두 단계로 구현한다: (1) 부분 합 계산, (2) 전파.

```c
#include <threads.h>
#include <stdlib.h>

typedef struct {
    const int* input;
    int* output;
    size_t start;
    size_t end;
    int partial_sum;
} ScanArg;

// 1단계: 각 청크의 부분 합 계산
static int scan_partial(void* arg) {
    ScanArg* sa = (ScanArg*)arg;
    int sum = 0;

    for (size_t i = sa->start; i < sa->end; ++i) {
        sum += sa->input[i];
        sa->output[i] = sum;
    }

    sa->partial_sum = sum;
    return 0;
}

// 2단계: 이전 청크들의 합을 더함
static int scan_propagate(void* arg) {
    ScanArg* sa = (ScanArg*)arg;
    int offset = sa->partial_sum;  // 이전 청크들의 총합

    for (size_t i = sa->start; i < sa->end; ++i) {
        sa->output[i] += offset;
    }

    return 0;
}

void parallel_inclusive_scan(const int* input, int* output, size_t n,
                              size_t num_threads) {
    thrd_t* threads = malloc(sizeof(thrd_t) * num_threads);
    ScanArg* args = malloc(sizeof(ScanArg) * num_threads);

    size_t chunk_size = n / num_threads;

    // 1단계: 부분 합
    for (size_t i = 0; i < num_threads; ++i) {
        args[i].input = input;
        args[i].output = output;
        args[i].start = i * chunk_size;
        args[i].end = (i == num_threads - 1) ? n : (i + 1) * chunk_size;
        thrd_create(&threads[i], scan_partial, &args[i]);
    }

    for (size_t i = 0; i < num_threads; ++i) {
        thrd_join(threads[i], NULL);
    }

    // 2단계: 오프셋 전파 (첫 청크는 이미 완료)
    int running_sum = 0;
    for (size_t i = 1; i < num_threads; ++i) {
        running_sum += args[i - 1].partial_sum;
        args[i].partial_sum = running_sum;
        thrd_create(&threads[i], scan_propagate, &args[i]);
    }

    for (size_t i = 1; i < num_threads; ++i) {
        thrd_join(threads[i], NULL);
    }

    free(threads);
    free(args);
}
```

### 응용: 병렬 압축

```cpp
// Parallel compaction: 조건을 만족하는 요소만 모으기

std::vector<int> input = {1, -2, 3, -4, 5, -6, 7};
std::vector<int> output(input.size());

// 1. 조건 검사 (양수인가?)
std::vector<int> flags(input.size());
std::transform(std::execution::par,
    input.begin(), input.end(), flags.begin(),
    [](int x) { return x > 0 ? 1 : 0; });
// [1, 0, 1, 0, 1, 0, 1]

// 2. 위치 계산 (exclusive scan)
std::vector<int> positions(input.size());
std::exclusive_scan(std::execution::par,
    flags.begin(), flags.end(), positions.begin(), 0);
// [0, 1, 1, 2, 2, 3, 3]

// 3. 결과 배치
std::for_each(std::execution::par,
    boost::counting_iterator(0), boost::counting_iterator((int)input.size()),
    [&](int i) {
        if (flags[i]) {
            output[positions[i]] = input[i];
        }
    });
// [1, 3, 5, 7, ?, ?, ?]

// 결과 크기
int result_size = positions.back() + flags.back();  // 4
```

## 10.6 예외 처리

### 병렬 알고리즘의 예외

```cpp
// 병렬 실행 중 예외 발생 시 std::terminate() 호출!

std::vector<int> data = {1, 2, 0, 4, 5};

try {
    std::for_each(std::execution::par, data.begin(), data.end(),
        [](int x) {
            if (x == 0) {
                throw std::runtime_error("Zero!");  // 💥 terminate!
            }
        });
} catch (...) {
    // 여기 도달하지 않을 수 있음
}
```

### 안전한 예외 처리

```cpp
// 예외를 저장하고 나중에 처리
std::vector<int> data = {1, 2, 0, 4, 5};
std::atomic<bool> has_error{false};
std::exception_ptr error;
std::mutex error_mutex;

std::for_each(std::execution::par, data.begin(), data.end(),
    [&](int x) {
        try {
            if (x == 0) {
                throw std::runtime_error("Zero!");
            }
            process(x);
        } catch (...) {
            std::lock_guard lock(error_mutex);
            if (!has_error) {
                error = std::current_exception();
                has_error = true;
            }
        }
    });

if (has_error && error) {
    std::rethrow_exception(error);
}
```

## 10.7 구현 고려사항

### 라이브러리 지원

**주요 구현**

- **GCC (libstdc++)**: Intel oneTBB 필요 (구 TBB). 컴파일 시 `g++ -std=c++17 -ltbb`
- **Clang (libc++)**: PSTL 백엔드 필요. oneTBB 또는 OpenMP 사용
- **MSVC**: 내장 구현, 추가 라이브러리 불필요

### 빌드 설정

```bash
# GCC with TBB
g++ -std=c++17 -O3 -ltbb program.cpp

# Clang with TBB
clang++ -std=c++17 -O3 -ltbb program.cpp

# MSVC
cl /std:c++17 /O2 program.cpp
```

### 폴백 구현

```cpp
// TBB가 없을 때를 대비한 폴백
#if __has_include(<execution>)
    #include <execution>
    #define HAS_PARALLEL_STL 1
#else
    #define HAS_PARALLEL_STL 0
#endif

template<typename Container, typename Func>
void parallel_for_each(Container& c, Func f) {
#if HAS_PARALLEL_STL
    std::for_each(std::execution::par, c.begin(), c.end(), f);
#else
    std::for_each(c.begin(), c.end(), f);
#endif
}
```

## 10.8 성능 가이드라인

### 언제 병렬을 사용할까

```cpp
// 경험 법칙: 요소 수 * 요소당 작업량 > 임계값

constexpr size_t PARALLEL_THRESHOLD = 10'000;

template<typename Iterator, typename Func>
void smart_for_each(Iterator first, Iterator last, Func f) {
    auto size = std::distance(first, last);

    if (size > PARALLEL_THRESHOLD) {
        std::for_each(std::execution::par, first, last, f);
    } else {
        std::for_each(first, last, f);
    }
}
```

### 병렬화 효과 측정

```cpp
#include <chrono>
#include <iostream>

template<typename Func>
auto measure(const char* name, Func f) {
    auto start = std::chrono::high_resolution_clock::now();
    auto result = f();
    auto end = std::chrono::high_resolution_clock::now();

    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << name << ": " << ms.count() << "ms\n";

    return result;
}

void benchmark() {
    std::vector<double> data(10'000'000);
    std::iota(data.begin(), data.end(), 1.0);

    // 순차
    auto sum_seq = measure("seq", [&] {
        return std::reduce(std::execution::seq,
            data.begin(), data.end(), 0.0);
    });

    // 병렬
    auto sum_par = measure("par", [&] {
        return std::reduce(std::execution::par,
            data.begin(), data.end(), 0.0);
    });

    // 병렬 + 벡터화
    auto sum_par_unseq = measure("par_unseq", [&] {
        return std::reduce(std::execution::par_unseq,
            data.begin(), data.end(), 0.0);
    });
}
```

### 주의사항

```cpp
// 💥 작은 데이터에 병렬은 오히려 느림
std::vector<int> small_data(100);
// 오버헤드 > 이득
std::sort(std::execution::par, small_data.begin(), small_data.end());

// 💥 I/O 바운드 작업은 병렬 효과 제한
std::for_each(std::execution::par, files.begin(), files.end(),
    [](auto& file) {
        read_from_disk(file);  // I/O 병목
    });

// 💥 락이 있으면 병렬 효과 감소
std::mutex mtx;
std::for_each(std::execution::par, data.begin(), data.end(),
    [&mtx](auto& x) {
        std::lock_guard lock(mtx);  // 직렬화됨
        process(x);
    });
```

### 최적화 체크리스트

| 항목 | 확인 |
|------|------|
| 데이터 크기 | 충분히 큰가? (> 10K) |
| 작업 복잡도 | 요소당 작업이 충분한가? |
| 연산 속성 | 결합/가환 법칙 만족? |
| 메모리 접근 | 캐시 친화적인가? |
| 동기화 | 락 없이 가능한가? |
| I/O | CPU 바운드인가? |

## 10.9 C++20/23 확장

### C++20: unseq 정책

```cpp
// 단일 스레드 벡터화 (SIMD)
std::for_each(std::execution::unseq, data.begin(), data.end(),
    [](int& x) { x *= 2; });

// par_unseq와 차이: 스레드 생성 오버헤드 없음
// 작은 데이터나 이미 병렬 컨텍스트에서 유용
```

### Ranges + 병렬

```cpp
// C++23: ranges algorithm은 표준화됐으나 execution policy 오버로드는
// 대부분 누락. C++26에서 std::execution (sender/receiver) 기반으로
// 더 일반적인 비동기 / 병렬 ranges가 도입 중.

// 현재 실용 — ranges::views를 materialize 후 병렬 정렬
auto filtered = data | std::views::filter([](int x) { return x > 0; });
std::vector<int> filtered_vec(filtered.begin(), filtered.end());

std::sort(std::execution::par, filtered_vec.begin(), filtered_vec.end());
```

## 10.10 실전 예제

### 이미지 처리

```cpp
struct Pixel {
    uint8_t r, g, b, a;
};

void grayscale(std::vector<Pixel>& image) {
    std::for_each(std::execution::par_unseq,
        image.begin(), image.end(),
        [](Pixel& p) {
            uint8_t gray = static_cast<uint8_t>(
                0.299 * p.r + 0.587 * p.g + 0.114 * p.b
            );
            p.r = p.g = p.b = gray;
        });
}

double average_brightness(const std::vector<Pixel>& image) {
    auto sum = std::transform_reduce(
        std::execution::par,
        image.begin(), image.end(),
        0ULL,
        std::plus<>{},
        [](const Pixel& p) -> unsigned long long {
            return (p.r + p.g + p.b) / 3;
        }
    );
    return static_cast<double>(sum) / image.size();
}
```

### 통계 계산

```cpp
struct Statistics {
    double mean;
    double variance;
    double min;
    double max;
};

Statistics compute_stats(const std::vector<double>& data) {
    // 최소/최대
    auto [min_it, max_it] = std::minmax_element(
        std::execution::par, data.begin(), data.end());

    // 합과 제곱합
    struct Accum { double sum; double sum_sq; };
    auto acc = std::transform_reduce(
        std::execution::par,
        data.begin(), data.end(),
        Accum{0, 0},
        [](Accum a, Accum b) {
            return Accum{a.sum + b.sum, a.sum_sq + b.sum_sq};
        },
        [](double x) { return Accum{x, x * x}; }
    );

    double mean = acc.sum / data.size();
    double variance = (acc.sum_sq / data.size()) - (mean * mean);

    return {mean, variance, *min_it, *max_it};
}
```

### 문자열 처리

```cpp
// 대용량 로그에서 에러 개수 세기
size_t count_errors(const std::vector<std::string>& logs) {
    return std::transform_reduce(
        std::execution::par,
        logs.begin(), logs.end(),
        size_t{0},
        std::plus<>{},
        [](const std::string& line) -> size_t {
            return line.find("ERROR") != std::string::npos ? 1 : 0;
        }
    );
}

// 병렬 문자열 검색
std::vector<size_t> find_all_positions(
    const std::vector<std::string>& lines,
    const std::string& pattern)
{
    std::vector<size_t> results;
    std::mutex mtx;

    std::for_each(std::execution::par,
        lines.begin(), lines.end(),
        [&, idx = size_t{0}](const std::string& line) mutable {
            if (line.find(pattern) != std::string::npos) {
                std::lock_guard lock(mtx);
                results.push_back(idx);
            }
            ++idx;
        });

    return results;
}
```

## 정리

- **실행 정책**으로 순차/병렬/벡터화를 선택한다:
  - `seq`: 순차 (기본)
  - `par`: 병렬
  - `par_unseq`: 병렬 + SIMD
  - `unseq`: SIMD만 (C++20)
- **reduce**는 `accumulate`의 병렬 버전이다. 결합/가환 법칙 필요
- **transform_reduce**는 맵-리듀스 패턴을 구현한다
- **scan** 알고리즘은 prefix sum을 병렬로 계산한다
- **예외**는 병렬 실행 중 `terminate()`를 호출한다. 직접 처리 필요
- **충분한 데이터**가 있어야 병렬이 효과적이다 (> 10K 요소)
- **GCC/Clang**은 TBB가 필요하다

## 한국 개발자의 함정

```
1. *execution::par만 붙이면 빠름*
   - 작은 데이터엔 오히려 느림 (오버헤드)
   - 임계값 (≈10K 요소) 이상에서만 이득
   - 측정 필수

2. *reduce = accumulate 더 빠른 버전*
   - reduce는 *순서 무관* (결합법칙 필요)
   - 뺄셈 / 부동소수점 정밀도에서 다른 결과
   - 의미가 다름

3. *par_unseq에서 락 사용*
   - 정책이 락 사용 금지
   - 데드락 또는 UB
   - thread-safe atomic만 OK

4. *예외 던지면 catch*
   - 병렬 알고리즘 안에서 예외 → terminate
   - 직접 catch + exception_ptr로 보관
   - 표준이 그렇게 정의

5. *GCC에서 그냥 컴파일*
   - libstdc++는 TBB 필요
   - -ltbb 없으면 링크 실패
   - 또는 oneTBB 설치
```

## 실무 적용

```
이론 → 실무:
- std::execution::seq      → 순차 (기본)
- std::execution::par      → 병렬
- std::execution::par_unseq → 병렬 + SIMD
- std::reduce              → MapReduce의 reduce 단계
- std::transform_reduce    → 한 번의 패스 (map + reduce)
- std::inclusive_scan      → prefix sum (segment tree 등)
- std::exclusive_scan      → parallel compaction에 사용

언어/도구:
- C++17/20: std::execution
- C++ 라이브러리: oneTBB (Intel oneAPI), OpenMP, Highway
- Rust: rayon (par_iter, par_iter_mut)
- Java: parallel streams (Stream.parallel())
- Python: numpy, multiprocessing.Pool

빌드:
- GCC: -ltbb (Linux), brew install tbb (Mac)
- Clang: -ltbb 또는 PSTL 백엔드
- MSVC: 내장
- CMake: find_package(TBB REQUIRED)
```

## 자기 점검

```
□ seq vs par vs par_unseq vs unseq 차이?
□ reduce가 결합법칙 필요한 이유?
□ transform_reduce의 map-reduce 패턴?
□ 부동소수점 reduce의 *재현 불가능* 문제?
□ 병렬 알고리즘 안 *예외 처리* 방식?
□ par_unseq에서 락 사용 금지 이유?
□ 병렬화 임계값 결정 기준?
```

## 다음 장 예고

다음 장에서는 동시성 코드의 테스트와 디버깅을 다룬다. ThreadSanitizer, 데이터 레이스 탐지, 동시성 버그 패턴을 살펴본다.

## 관련 항목

- [Ch 8: Designing Concurrent Code](/blog/parallel/cpp-concurrency-in-action/chapter08-designing-concurrent-code)
- [Ch 9: Advanced Thread Management](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
- [Ch 11: Testing and Debugging](/blog/parallel/cpp-concurrency-in-action/chapter11-testing-and-debugging-multithreaded-applications)
- [AMP Ch 16: Work Stealing](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
- [AMP Ch 12: Counting & Sorting Networks](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination)
