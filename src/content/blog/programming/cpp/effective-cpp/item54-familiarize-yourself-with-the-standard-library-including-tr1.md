---
title: "항목 54: 표준 라이브러리(TR1 포함)에 익숙해져라"
date: 2025-02-09T11:00:00
description: "C++98 표준 라이브러리, TR1, 그리고 C++11~23에서 추가된 항목들 — 직접 만들기 전에 표준 검토."
tags: [C++, Effective C++, Standard Library, TR1]
series: "Effective C++"
seriesOrder: 54
---

## 개요

C++ 표준 라이브러리는 — 동료 평가된 코드, 모든 컴파일러에 이식 가능, 평균적으로 잘 최적화. **직접 만들기 전에 표준에 같은 기능이 있는지 검토하는 습관**이 가장 큰 생산성 향상. 이 항목은 C++98 표준, TR1 (C++03 시기), 그리고 C++11~23의 주요 추가를 정리합니다.

## C++98 표준 라이브러리 — 8가지 핵심 영역

### 1) STL 컨테이너

```cpp
#include <vector>     // 동적 배열
#include <list>       // 양방향 연결 리스트
#include <deque>      // 양 끝 효율 큐
#include <map>        // 정렬 키-값
#include <set>        // 정렬 집합
#include <multimap>   // 중복 키 허용
#include <multiset>
#include <stack>      // 어댑터
#include <queue>      // 어댑터
#include <priority_queue>
#include <string>     // std::string (사실상 컨테이너)
#include <bitset>     // 고정 크기 비트 집합
```

### 2) STL 알고리즘

```cpp
#include <algorithm>

std::find, std::find_if           // 검색
std::sort, std::stable_sort        // 정렬
std::partial_sort, std::nth_element
std::binary_search, std::lower_bound, std::upper_bound
std::count, std::count_if
std::for_each
std::transform                     // 변환
std::copy, std::move (algorithm)
std::accumulate (in <numeric>)
std::min, std::max, std::clamp (C++17)
```

100+ 개의 알고리즘. 손으로 짠 루프 대신 사용.

### 3) STL 반복자

```cpp
input_iterator_tag, forward_iterator_tag,
bidirectional_iterator_tag, random_access_iterator_tag

std::begin, std::end                // 자유 함수 (C++11+)
std::back_inserter, std::front_inserter
std::istream_iterator, std::ostream_iterator
```

### 4) 수치 라이브러리

```cpp
#include <cmath>       // 수학 함수 (sin, cos, exp, log, ...)
#include <complex>     // 복소수
#include <valarray>    // 수치 배열 (벡터화 의도)
#include <numeric>     // accumulate, inner_product, ...
```

### 5) 예외

```cpp
#include <exception>   // std::exception 기반 클래스
#include <stdexcept>   // logic_error, runtime_error 등
```

### 6) I/O

```cpp
#include <iostream>    // std::cin/cout
#include <fstream>     // 파일
#include <sstream>     // string stream
#include <iomanip>     // setw, setprecision 등 manipulator
```

### 7) 다국어 / locale

```cpp
#include <locale>      // 로케일별 포맷
#include <codecvt>     // 인코딩 변환 (C++17 deprecated, C++26 제거)
```

### 8) C 표준 라이브러리

```cpp
#include <cstdio>      // printf, fopen ...
#include <cstdlib>     // malloc, atoi, exit, ...
#include <cstring>     // strcpy, memcmp, ...
#include <cctype>      // isalpha, tolower, ...
#include <cmath>       // 수학 함수
// ... 등
```

## TR1 — Technical Report 1 (2005)

C++03 직후 발표된 표준 보조 문서. 대부분 C++11에 흡수.

### 흡수된 핵심 항목들

- **스마트 포인터** — `std::shared_ptr`, `std::weak_ptr`
  ```cpp
  #include <memory>
  auto p = std::make_shared<int>(42);
  ```

- **`std::function`** — 다형적 함수 wrapper
  ```cpp
  #include <functional>
  std::function<int(int)> f = [](int x) { return x * 2; };
  ```

- **`std::bind`** — 부분 적용 (C++11+ 람다가 더 좋음)

- **`<unordered_map>`, `<unordered_set>`** — 해시 컨테이너
  ```cpp
  #include <unordered_map>
  std::unordered_map<std::string, int> dict;     // O(1) avg
  ```

- **`<random>`** — 모던 난수 생성기
  ```cpp
  #include <random>
  std::mt19937 rng(seed);
  std::uniform_int_distribution<int> dist(1, 6);
  int dice = dist(rng);
  ```

- **`<regex>`** — 정규 표현식
  ```cpp
  #include <regex>
  std::regex re("\\d+");
  std::smatch m;
  std::regex_search(text, m, re);
  ```

- **`<type_traits>`** — 타입 정보 (항목 47)
  ```cpp
  #include <type_traits>
  static_assert(std::is_integral_v<int>);
  ```

- **`std::tuple`** — 고정 크기 이종 튜플
  ```cpp
  #include <tuple>
  std::tuple<int, std::string, double> t(1, "hi", 3.14);
  auto& [a, b, c] = t;     // C++17 structured bindings
  ```

- **`std::array`** — 고정 크기 배열
  ```cpp
  #include <array>
  std::array<int, 10> arr;     // C 배열 + STL 인터페이스
  ```

## C++11 — 큰 도약

### 언어 / 라이브러리 통합

- `auto`, `decltype` — 타입 추론
- range-based for — `for (auto& x : container)`
- lambda — `[](int x) { return x + 1; }`
- 이동 의미론 — `std::move`, rvalue 참조
- forwarding 참조 (universal reference) + perfect forwarding
- `nullptr` (NULL/0 대신)
- `enum class` — 강 타입 enum
- 가변 인자 template
- `constexpr`
- `static_assert`

### 동시성

```cpp
#include <thread>      // std::thread
#include <mutex>       // std::mutex, std::lock_guard
#include <atomic>      // 원자 연산
#include <future>      // std::async, std::future, std::promise
#include <condition_variable>
```

### 시간

```cpp
#include <chrono>
auto start = std::chrono::steady_clock::now();
// ...
auto elapsed = std::chrono::steady_clock::now() - start;
```

`time_t`, `timespec` 직접 다루기 대신.

## C++14

- generic lambda — `auto`
- return type 추론
- `std::make_unique`
- `_v`, `_t` alias (`is_integral_v<T>`, `remove_const_t<T>`)
- 변수 템플릿
- `[[deprecated]]` attribute

## C++17

```cpp
#include <optional>    // std::optional<T> — 실패 가능한 값
#include <variant>     // std::variant<T1, T2, ...> — sum type
#include <any>         // std::any — 임의 타입
#include <filesystem>  // std::filesystem::path 등
#include <string_view> // std::string_view — non-owning 문자열 뷰
#include <memory_resource>  // std::pmr — polymorphic allocator
```

언어:
- `if constexpr` — 컴파일 타임 분기
- structured bindings — `auto [a, b] = pair`
- fold expression — `(args + ...)`
- guaranteed copy elision
- `[[nodiscard]]`, `[[maybe_unused]]`, `[[fallthrough]]`
- `<charconv>` — 빠른 숫자↔문자열 변환

## C++20

언어:
- **concepts** — `template<std::integral T>` (항목 41)
- **modules** — `import math;` (헤더 대안)
- **coroutines** — `co_await`, `co_yield`
- **ranges** — `v | views::filter(...) | views::transform(...)`
- `consteval`, `constinit`
- spaceship operator `<=>`
- designated initializers — `{.x = 1, .y = 2}`

라이브러리:
- `<format>` — `std::format("{}", x)` (printf 안전 대안)
- `<span>` — `std::span<T>` (배열 view)
- `<bit>` — 비트 조작
- `std::jthread` — 자동 join thread
- `<numbers>` — 수학 상수 (`std::numbers::pi`)
- atomic ref, semaphore, latch, barrier

## C++23

- `<expected>` — `std::expected<T, E>` (Result type)
- `<mdspan>` — 다차원 배열 뷰
- `<print>` — `std::print("hello {}\n", name)`
- `<stacktrace>` — 스택 추적
- assume attribute — `[[assume(x > 0)]]`
- explicit object parameter — deducing `this`

## 활용 가이드 — "표준 우선" 사고

```
새 기능이 필요한가?
├── 표준 라이브러리에 있는지 확인 → 우선 사용
├── 표준에 없으면 Boost 등 검증된 라이브러리
└── 그 외에 직접 작성
```

자주 마주치는 예:

| 직접 만들지 말고 | 표준 사용 |
| --- | --- |
| 동적 배열 | `std::vector` |
| 연결 리스트 | `std::list` |
| 키-값 맵 | `std::unordered_map`, `std::map` |
| 동적 메모리 관리 | `std::unique_ptr`, `std::shared_ptr` |
| 정렬 / 검색 | `std::sort`, `std::find_if` |
| 문자열 처리 | `std::string`, `<regex>` |
| 시간 처리 | `<chrono>` |
| 동시성 | `<thread>`, `<atomic>` |
| 옵션 타입 | `std::optional` |
| sum type | `std::variant` |
| 파일 경로 | `std::filesystem` |
| 포맷 | `std::format` (C++20) |

## 흔한 함정 — 표준 헤더 정보 부족

```cpp
std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });    // OK
std::sort(v.begin(), v.end(), std::greater<>{});                       // 표준 functor 활용
```

표준 functor: `std::less`, `std::greater`, `std::equal_to`, `std::plus`, ... — 람다 없이 깔끔.

## 참고 자료

- [cppreference.com](https://cppreference.com) — 가장 신뢰할 만한 reference
- [The C++ Standard Library by Nicolai M. Josuttis](https://www.cppstdlib.com/) — 책
- 표준 문서 자체 (`https://eel.is/c++draft/`)

## 실무 가이드 — 체크리스트

- [ ] 기능을 만들기 전 표준 라이브러리 확인?
- [ ] 자주 쓰는 STL 알고리즘 — 손 루프 대신?
- [ ] 스마트 포인터 — raw new/delete 회피?
- [ ] chrono — 시간 직접 다루기 대신?
- [ ] C++ 표준 최신 기능에 익숙?

## 핵심 정리

1. **표준 라이브러리는 검증·효율·이식성** — 직접 만들기 전 표준 우선
2. **C++98 / TR1 / C++11 / C++14 / C++17 / C++20 / C++23** — 매 표준이 추가
3. **STL 알고리즘**과 **컨테이너**에 능숙해지기 — 손 루프 줄임
4. **모던 표준**(`<chrono>`, `<filesystem>`, `<format>`, `<ranges>`)을 의식적으로 활용
5. `cppreference.com` 등 reference 활용
6. 이 책 이후의 C++11+ 변화는 **Effective Modern C++**가 다룸

## 관련 항목

- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — 표준 스마트 포인터
- [항목 47: traits 클래스](/blog/programming/cpp/effective-cpp/item47-use-traits-classes-for-information-about-types) — `<type_traits>`
- [항목 55: Boost](/blog/programming/cpp/effective-cpp/item55-familiarize-yourself-with-boost) — 표준 외 라이브러리
