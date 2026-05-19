---
title: "Ch 10: Parallel algorithms"
date: 2026-05-06T10:00:00
description: "C++17 execution policy — seq / par / par_unseq / unseq. std::reduce, transform_reduce."
tags: [C++, C, Concurrency, Parallel Algorithms, Execution Policy]
series: "C++ Concurrency in Action"
seriesOrder: 10
draft: false
---

C++17은 표준 알고리즘에 병렬 실행을 추가했다. 실행 정책 하나로 순차/병렬/벡터화를 선택할 수 있다.

## 10.1 표준 라이브러리 병렬화

### 세 가지 차원

Williams는 표준 알고리즘에 적용 가능한 실행 모델을 세 차원으로 정리한다. 같은 알고리즘이라도 어느 차원을 활성화하느냐에 따라 의미가 달라진다.

| 차원 | 무엇이 동시에 진행되나 | 하드웨어 자원 |
|------|----------------------|-----------------|
| 순차 (sequential) | 아무것도 동시 진행되지 않음 | 단일 스레드 |
| 벡터화 (vectorization) | 한 스레드 안에서 여러 데이터 처리 | SIMD 레지스터 (SSE/AVX/NEON) |
| 병렬 (parallelism) | 여러 스레드에서 동시 처리 | 멀티 코어 |
| 벡터 병렬 (vector parallelism) | 여러 스레드 + 각 스레드의 SIMD | 멀티 코어 + SIMD |

순차는 명령이 소스 코드 순서대로 한 스레드에서 실행된다. 벡터화는 같은 연산을 여러 데이터에 한 명령으로 적용하는 SIMD 기반 모델이다. 병렬은 작업을 여러 스레드에 분배한다. 벡터 병렬은 둘을 합쳐 가장 공격적인 형태가 된다.

### 동기

표준 라이브러리에 병렬을 도입한 동기는 두 가지다. 첫째, 데이터 병렬 패턴이 충분히 일반적이라 라이브러리 수준의 추상화가 가능하다. 둘째, 직접 `std::thread`로 분할하면 청크 크기, 작업 분배, 합치기 코드가 매번 반복된다. 알고리즘 한 줄에 정책만 끼우면 컴파일러와 표준 라이브러리가 그 부담을 떠안는다.

```cpp
// 직접 분할 — 매번 반복되는 보일러플레이트
auto chunk_size = data.size() / num_threads;
std::vector<std::thread> workers;
for (size_t i = 0; i < num_threads; ++i) {
    workers.emplace_back([&, i] {
        for (auto j = i * chunk_size; j < (i + 1) * chunk_size; ++j) {
            f(data[j]);
        }
    });
}
for (auto& t : workers) t.join();

// 실행 정책 — 한 줄
std::for_each(std::execution::par, data.begin(), data.end(), f);
```

### 책임 분기

라이브러리가 모든 책임을 떠안지는 않는다. Williams는 *데이터 레이스 회피*와 *예외 의미*는 사용자 책임으로 남는다고 강조한다. 정책은 라이브러리가 무엇을 할 수 있는지 *허용*할 뿐, 사용자가 넘긴 함수 객체의 안전성은 사용자가 보장해야 한다.

## 10.2 실행 정책 (Execution Policy)

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

### std::execution::seq — 순차 실행

`seq`는 호출 스레드 위에서 알고리즘을 직렬로 실행한다. 정책 없는 오버로드와 동일한 의미적 보증을 제공하되, 정책 인수 자리에 명시적으로 의도를 드러낼 수 있다는 차이가 있다.

```cpp
std::vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};
std::for_each(std::execution::seq, v.begin(), v.end(),
              [](int x) { std::cout << x << ' '; });
// 출력 순서는 반복자 순서와 동일하게 보장된다
```

`seq`는 함수 객체에 동시성 요구를 부과하지 않는다. 함수 객체가 호출 스레드에서 비공유 상태를 다루듯 작성돼 있어도 안전하다. 락을 잡거나 외부 상태를 변경해도 데이터 레이스가 발생하지 않는다. 정책 없는 알고리즘과 다른 점은, 구현이 *예외에 대해 `std::terminate`를 호출할 권리*를 가진다는 것뿐이다.

### std::execution::par — 멀티 스레드

`par`는 호출 스레드와 라이브러리가 생성한 추가 스레드들 사이에 작업을 분배한다. 같은 스레드 안에서는 호출 순서가 보장되지만, 서로 다른 스레드 사이에서는 보장되지 않는다.

```cpp
std::atomic<int> counter{0};
std::for_each(std::execution::par, v.begin(), v.end(),
              [&](int) { counter.fetch_add(1, std::memory_order_relaxed); });
```

함수 객체는 *서로 다른 스레드에서 동시에 호출돼도 안전*해야 한다. 공유 변수에 접근한다면 `std::atomic`이나 뮤텍스가 필요하다. SIMD 변환은 보장되지 않으므로, 함수 객체 안에서 락을 잡는 것은 합법이다. 단, 락이 직렬화 지점이 되어 병렬 효과를 잠식한다는 점은 별개의 성능 문제다.

### std::execution::par_unseq — 멀티 스레드 + SIMD

`par_unseq`는 가장 공격적인 정책이다. 라이브러리는 작업을 여러 스레드에 분배하는 동시에, 각 스레드 안에서 함수 객체의 호출을 *인터리브*하거나 SIMD 명령으로 융합할 수 있다.

```cpp
std::transform(std::execution::par_unseq, v.begin(), v.end(), out.begin(),
               [](int x) { return x * x + 1; });
```

`par_unseq`의 제약은 엄격하다. 함수 객체는 *vectorization-safe*해야 한다. 한 함수 객체의 호출이 끝나기 전에 다른 호출이 시작될 수 있기 때문에, 호출 사이에 동기화 객체를 잡는 것은 허용되지 않는다. 뮤텍스 lock, atomic 외 동기화, 메모리 할당 호출 등 동기화를 동반하는 동작은 정의되지 않은 동작이다. SIMD 친화적인 산술과 atomic 연산만 안전하다.

### unseq — SIMD만 (C++20)

C++20은 `std::execution::unseq`를 추가했다. 단일 스레드에서 벡터화만 허용한다. 스레드 생성 오버헤드가 없어 데이터가 작거나 이미 병렬 컨텍스트 안에 있을 때 유용하다. 함수 객체 제약은 `par_unseq`와 동일하다.

### 정책별 책임 분기 요약

| 정책 | 함수 객체에 요구되는 것 | 라이브러리가 약속하는 것 |
|------|------------------------|-------------------------|
| `seq` | 호출 스레드에서 동작하면 충분 | 반복자 순서대로 호출 |
| `par` | 다른 스레드 동시 호출 안전 | 작업을 여러 스레드에 분배 |
| `par_unseq` | vectorization-safe (락·할당 금지) | 스레드 + SIMD 융합 |
| `unseq` | vectorization-safe | 단일 스레드 SIMD |

데이터 레이스가 발생하면 사용자 책임이다. 라이브러리는 함수 객체가 정책 제약을 만족한다고 *가정*하고 최적화를 수행한다.

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

## 10.3 표준 라이브러리의 병렬 알고리즘

### 알고리즘 카탈로그 개요

C++17은 기존 `<algorithm>`과 `<numeric>` 알고리즘의 대다수에 실행 정책 오버로드를 추가했다. Williams는 책의 후반부에서 가장 자주 쓰이는 네 알고리즘에 집중한다: `for_each`, `sort`, `reduce`, `transform_reduce`. 나머지는 같은 패턴을 따른다.

### Listing 10.1 — 병렬 std::for_each

`for_each`는 가장 단순한 병렬 알고리즘이다. 시퀀스의 각 요소에 함수를 적용하고, 함수 반환값을 사용하지 않는다. 부수 효과를 유발하는 작업에 적합하다.

```cpp
#include <algorithm>
#include <execution>
#include <vector>

void process_in_parallel(std::vector<int>& v) {
    std::for_each(std::execution::par, v.begin(), v.end(),
                  [](int& x) { x = process(x); });
}
```

Williams가 강조하는 핵심은 두 가지다. 첫째, `for_each`는 반환값을 무시하므로 정책 없는 버전과 의미가 거의 동일하다. 둘째, 함수 객체가 *어느 스레드에서 호출될지 알 수 없으므로* 스레드 로컬 상태에 의존해서는 안 된다.

```cpp
// 위험 — 스레드 로컬 카운터는 매 스레드마다 다른 인스턴스
thread_local int local_counter = 0;
std::for_each(std::execution::par, v.begin(), v.end(),
              [](int& x) { x += local_counter++; });
// 결과는 각 스레드의 청크 크기와 분배 방식에 따라 달라진다
```

### Listing 10.2 — 병렬 std::sort

`sort`의 병렬 버전은 동일한 정렬 결과를 보장한다. 안정성은 보장되지 않으므로 안정 정렬이 필요하면 `stable_sort`의 병렬 오버로드를 쓴다.

```cpp
#include <algorithm>
#include <execution>
#include <vector>

void parallel_quicksort(std::vector<int>& v) {
    std::sort(std::execution::par, v.begin(), v.end());
}
```

내부 구현은 일반적으로 *parallel quicksort*나 *parallel mergesort* 변형이다. Williams의 책 8장에서 직접 구현했던 work-stealing 기반 quicksort와 같은 아이디어를, 표준 라이브러리가 한 줄로 제공한다. 비교 함수는 *순수해야* 한다 — 외부 상태를 변경하면 race를 일으킨다.

```cpp
// 위험 — 비교 함수가 외부 카운터를 변경
int comparisons = 0;
std::sort(std::execution::par, v.begin(), v.end(),
          [&](int a, int b) {
              ++comparisons;  // 💥 data race
              return a < b;
          });

// Good — atomic 카운터
std::atomic<int> comparisons{0};
std::sort(std::execution::par, v.begin(), v.end(),
          [&](int a, int b) {
              comparisons.fetch_add(1, std::memory_order_relaxed);
              return a < b;
          });
```

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

## 10.4 reduce vs accumulate

### 왜 새로운 알고리즘이 필요했나

Williams는 `std::accumulate`를 *순서가 의미 있는* 좌접기로 정의한다. 즉 `accumulate`는 본질적으로 직렬 알고리즘이다. 병렬화하려면 *순서를 포기*해야 하고, 그래서 별도의 이름이 필요했다. `std::reduce`는 C++17에서 `<numeric>`에 추가된 *결합법칙을 가정하는* 리덕션이다.

```cpp
// accumulate — 순서 보장, 결합법칙 불필요
//   (((init op a) op b) op c)
T s1 = std::accumulate(v.begin(), v.end(), init, op);

// reduce — 순서 불확정, 결합법칙 가정
//   임의의 트리 구조로 op를 적용
T s2 = std::reduce(std::execution::par, v.begin(), v.end(), init, op);
```

이 분리는 C++ 표준 라이브러리 설계의 한 사례다. *기존 알고리즘의 의미를 보존*하면서 *새 의미*를 별도 이름으로 추가하는 방식이다.

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

## 10.5 transform_reduce 패턴

### 왜 transform + reduce가 한 호출인가

`reduce`와 `transform`을 따로 부르면 *중간 컨테이너*가 필요하다. 변환 결과를 어딘가에 저장한 뒤 다시 리덕션을 돌려야 한다. Williams는 이 패턴이 흔하기 때문에 `std::transform_reduce`가 *한 패스로 둘을 융합*한다고 설명한다. 컴파일러는 변환과 리덕션을 한 루프 안에서 인라인할 수 있고, 캐시 친화성이 개선된다.

```cpp
// 두 번의 패스 — 중간 컨테이너 필요
std::vector<long long> squared(v.size());
std::transform(std::execution::par, v.begin(), v.end(), squared.begin(),
               [](int x) { return static_cast<long long>(x) * x; });
long long s = std::reduce(std::execution::par, squared.begin(), squared.end(), 0LL);

// 한 번의 패스 — transform_reduce
long long s2 = std::transform_reduce(std::execution::par,
                                     v.begin(), v.end(), 0LL,
                                     std::plus<>{},
                                     [](int x) { return static_cast<long long>(x) * x; });
```

`transform_reduce`도 reduce와 같은 결합/가환 요구를 그대로 받는다. 변환 함수는 *순수해야* 하며 부수 효과가 없어야 한다.

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

## 10.6 스캔 알고리즘 (Prefix Sum)

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

## 10.7 예외 처리

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

## 10.8 구현 고려사항

### 라이브러리 지원

**주요 구현**

- **GCC (libstdc++)**: Intel oneTBB 필요 (구 TBB). 컴파일 시 `g++ -std=c++17 -ltbb`
- **Clang (libc++)**: PSTL 백엔드 필요. oneTBB 또는 OpenMP 사용
- **MSVC**: 내장 구현, 추가 라이브러리 불필요

### GCC libstdc++의 TBB 의존

Williams는 표준이 *구현 방식*을 강제하지 않는다고 강조한다. 표준은 의미만 정의한다. GCC의 libstdc++는 Intel oneTBB(Threading Building Blocks)를 백엔드로 채택했다. 헤더 `<execution>`을 포함해도 링크 단계에서 `libtbb`를 함께 묶지 않으면 다음과 같은 오류를 본다.

```text
undefined reference to `tbb::detail::r1::initialize(...)'
undefined reference to `__pstl::execution::v1::par'
```

이는 표준의 *바깥*에서 발생하는 문제다. 같은 코드가 MSVC에서는 곧장 빌드된다. MSVC는 PPL(Parallel Patterns Library) 기반의 내장 구현을 가진다. Clang의 libc++는 PSTL(Parallel STL) 백엔드를 따로 선택해야 한다.

```bash
# Ubuntu/Debian
sudo apt install libtbb-dev
g++ -std=c++17 -O3 program.cpp -ltbb

# macOS Homebrew
brew install tbb
g++ -std=c++17 -O3 program.cpp -ltbb

# CMake — 권장 방식
find_package(TBB REQUIRED)
target_link_libraries(my_app PRIVATE TBB::tbb)
```

`-ltbb`로 충분한 경우가 많지만, 정적 링크나 cross-compile 환경에서는 CMake의 `TBB::tbb` 타깃을 쓰는 것이 안전하다. 의존이 명시적으로 빌드 그래프에 들어간다.

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

## 10.9 성능 가이드라인

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

## 10.10 C++20/23 확장

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

## 10.11 실전 예제

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
