---
title: "Ch 10: Parallel algorithms"
date: 2026-05-20T10:00:00
description: "C++17 execution policy — seq / par / par_unseq / unseq. std::reduce, transform_reduce."
tags: [C++, Concurrency, Parallel Algorithms, Execution Policy]
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

```
┌─────────────────────────────────────────────────────────────┐
│  실행 정책 비교                                              │
│                                                             │
│  seq:       [===작업1===][===작업2===][===작업3===]         │
│             순차 실행, 하나씩                                │
│                                                             │
│  par:       [===작업1===]                                   │
│             [===작업2===]  병렬 실행, 동시에                 │
│             [===작업3===]                                   │
│                                                             │
│  par_unseq: [=1=|=2=|=3=]  병렬 + SIMD 벡터화              │
│             [=4=|=5=|=6=]                                   │
│                                                             │
│  unseq:     [=1=|=2=|=3=|=4=|=5=|=6=]  단일 스레드 SIMD    │
└─────────────────────────────────────────────────────────────┘
```

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

```
┌─────────────────────────────────────────────────────────────┐
│  reduce가 요구하는 연산 속성                                 │
│                                                             │
│  결합법칙 (Associativity):                                  │
│  (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)                                 │
│  예: 덧셈 O, 뺄셈 X                                         │
│                                                             │
│  가환법칙 (Commutativity):                                  │
│  a ⊕ b = b ⊕ a                                              │
│  예: 덧셈 O, 뺄셈 X                                         │
│                                                             │
│  병렬 실행은 순서를 보장하지 않음!                          │
└─────────────────────────────────────────────────────────────┘
```

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

```
┌─────────────────────────────────────────────────────────────┐
│  주요 구현                                                   │
│                                                             │
│  GCC (libstdc++):                                           │
│  - Intel TBB 필요 (기본)                                    │
│  - 컴파일: g++ -std=c++17 -ltbb                            │
│                                                             │
│  Clang (libc++):                                            │
│  - PSTL 백엔드 필요                                         │
│  - TBB 또는 OpenMP 사용                                     │
│                                                             │
│  MSVC:                                                      │
│  - 내장 구현                                                │
│  - 추가 라이브러리 불필요                                   │
└─────────────────────────────────────────────────────────────┘
```

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

### 향후: Ranges + 병렬

```cpp
// C++23에서 일부 ranges 알고리즘이 병렬 지원 예정
// (아직 표준화 진행 중)

// 현재는 ranges::views를 materialize 후 사용
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

## 다음 장 예고

다음 장에서는 동시성 코드의 테스트와 디버깅을 다룬다. ThreadSanitizer, 데이터 레이스 탐지, 동시성 버그 패턴을 살펴본다.
