---
title: "Ch 8: Type Deduction / Templates / Lambdas / Aliases"
date: 2025-05-13T08:00:00
description: "auto / CTAD / Lambdas / Template Metaprogramming / Concepts / Boost / Aliases."
tags: [Google, C++, Style-Guide, auto, Lambda, Template, Concepts]
series: "Google C++ Style"
seriesOrder: 8
draft: false
---

이 장은 모던 C++의 강력하지만 양날의 검 같은 기능들을 다룬다. `auto`, lambda, 템플릿, concept이 모두 그렇다. 잘 쓰면 코드가 짧고 명확해지지만, 잘못 쓰면 타입이 보이지 않고 컴파일 에러가 거대해진다.

## Type Deduction — `auto`

`auto`는 우변의 타입이 *읽는 사람에게 자명*할 때만 쓴다. 자명함의 기준은 호출하는 함수 이름과 형태다.

```cpp
// Good — 자명
auto it = users_.begin();                 // iterator 타입 자명
auto p = std::make_unique<Foo>();          // make_unique → unique_ptr
auto user_or = FindUser(42);               // FindUser의 반환 타입 (StatusOr)

// 회피 — 타입이 불명확
auto x = ComputeSomething();   // int? double? Status?
auto v = GetValues();          // vector? span?
```

다음 두 코드를 비교하면 `auto`의 적절한 자리가 보인다.

```cpp
// auto가 유용 — 타입을 적기 번거롭다
std::map<std::string, std::vector<int>>::const_iterator it = m.find(key);
auto it = m.find(key);

// auto가 해롭다 — 타입을 적는 게 더 명확
auto x = obj.GetSomething();
StatusOr<User> x = obj.GetSomething();
```

range-based for 루프에서는 `auto`가 자연스럽다.

```cpp
// 읽기만
for (const auto& item : items) { Process(item); }

// 수정
for (auto& item : items) { item.Update(); }

// forwarding (range가 prvalue를 줄 때)
for (auto&& item : GenerateItems()) { Process(item); }
```

### Structured Bindings

C++17의 구조분해는 가독성에 큰 도움이 된다. 명명된 멤버가 곧 코드에 드러난다.

```cpp
// pair/tuple 반환을 받을 때
auto [min, max] = GetMinMax(data);

// map 순회
for (const auto& [key, value] : my_map) {
    LOG(INFO) << key << " -> " << value;
}

// struct도 가능 (C++17)
struct Point { double x, y; };
Point p = GetPoint();
auto [x, y] = p;
```

## Class Template Argument Deduction (CTAD)

CTAD는 C++17의 기능으로, 생성자 호출 시 템플릿 인자를 추론한다. *명백히 도움*이 될 때만 쓴다.

```cpp
// Good — 자명
std::vector v = {1, 2, 3};        // vector<int>
std::pair p{"name", 42};           // pair<const char*, int>
std::array a = {1, 2, 3};          // array<int, 3>

// Good — lock_guard
std::mutex m;
std::lock_guard lock(m);           // lock_guard<std::mutex>

// 회피 — 모호한 추론
std::vector v(other_vec);          // 복사? 원소 1개?
std::vector v(5);                  // 크기 5? 원소 5?
```

명시적으로 적는 편이 안전한 경우가 더 많다.

```cpp
// 회피 — 추론 결과가 직관과 다를 수 있다
std::tuple t{1, 2.0, "x"};   // tuple<int, double, const char*>

// 명시
std::tuple<int, double, std::string> t{1, 2.0, "x"};
```

## Lambda Expressions

람다는 *짧은 콜백*과 *지역 함수*에 적합하다. capture는 가능한 명시적으로 하고, mutable은 신중히 쓴다.

```cpp
// Good — 짧은 콜백
auto cmp = [](int a, int b) { return a > b; };
std::sort(v.begin(), v.end(), cmp);

// Good — capture 명시
auto handler = [&counter](Event e) {
    counter += e.weight;
};
```

디폴트 capture(`[&]` 또는 `[=]`)는 무엇을 잡는지 호출자에게 숨긴다. 가능하면 피한다.

```cpp
// 회피 — 무엇을 캡처하는지 불명확
auto callback = [&](int x) {
    counter += x;       // & 캡처
    log_.Write(x);      // & 캡처
    Process(x, total);  // & 캡처? total은 어디서?
};

// Good — 명시
auto callback = [&counter, &log_, &total](int x) {
    counter += x;
    log_.Write(x);
    Process(x, total);
};
```

긴 람다는 함수로 빼는 게 좋다. 인라인으로 거대한 람다가 들어가면 호출지점의 가독성이 떨어진다.

```cpp
// 회피 — 30줄짜리 람다
std::sort(items.begin(), items.end(),
    [&](const Item& a, const Item& b) {
        // 30줄 비교 로직...
    });

// Good — 이름 있는 함수
bool CompareByPriority(const Item& a, const Item& b) {
    // 30줄 비교 로직...
}
std::sort(items.begin(), items.end(), CompareByPriority);
```

C++14의 init-capture는 move 캡처를 표현하는 자리다.

```cpp
// move 캡처
auto callback = [data = std::move(large_data)]() mutable {
    Process(data);
};

// 계산한 값을 캡처
auto callback = [snapshot = SnapshotCurrentState()]() {
    Compare(snapshot, GetCurrentState());
};
```

`mutable` 람다는 람다 안에서 캡처된 값을 수정할 때 필요하다. 상태 있는 람다를 만들 때 쓰지만, 의도가 명확해야 한다.

```cpp
// 상태 있는 람다
auto counter = [count = 0]() mutable {
    return ++count;
};

LOG(INFO) << counter();   // 1
LOG(INFO) << counter();   // 2
```

## Template Metaprogramming

복잡한 템플릿 메타프로그래밍(SFINAE, tag dispatch의 깊은 사용 등)은 피한다. 가독성과 컴파일 에러 모두 비용이 크다.

```cpp
// 회피 — SFINAE로 컨테이너 검출
template <typename T>
struct is_container {
    template <typename U>
    static auto test(U*) -> decltype(
        std::begin(std::declval<U>()),
        std::true_type{});
    template <typename>
    static std::false_type test(...);
    static constexpr bool value = decltype(test<T>(nullptr))::value;
};

template <typename T,
          typename = std::enable_if_t<is_container<T>::value>>
void Process(const T& c) { /* ... */ }
```

```cpp
// Good — C++20 Concepts
template <typename T>
concept Container = requires(T t) {
    std::begin(t);
    std::end(t);
};

template <Container T>
void Process(const T& c) { /* ... */ }
```

`if constexpr`도 메타프로그래밍을 크게 단순화한다.

```cpp
// 회피 — 특수화로 분기
template <typename T>
void Print(const T& x) { std::cout << x; }
template <typename T>
void Print(const std::vector<T>& v) { /* 벡터 전용 */ }

// Good — if constexpr
template <typename T>
void Print(const T& x) {
    if constexpr (std::is_arithmetic_v<T>) {
        std::cout << x;
    } else if constexpr (requires { x.begin(); x.end(); }) {
        for (const auto& item : x) Print(item);
    } else {
        std::cout << "(unknown)";
    }
}
```

깊은 메타프로그래밍이 정당한 자리는 라이브러리 내부의 구현 디테일이다. 일반 응용 코드에서는 거의 나오지 않아야 한다.

## Concepts and Constraints (C++20)

Concepts는 적극 권장된다. SFINAE를 대체하면서 에러 메시지도 훨씬 명확해진다.

```cpp
// 표준 concepts
#include <concepts>

template <std::integral T>
T Add(T a, T b) { return a + b; }

template <std::floating_point T>
T Normalize(T x) { return std::clamp(x, T{0}, T{1}); }
```

사용자 정의 concept도 간단하다.

```cpp
template <typename T>
concept Hashable = requires(T x) {
    { std::hash<T>{}(x) } -> std::convertible_to<size_t>;
};

template <Hashable Key, typename Value>
class HashMap { /* ... */ };
```

콘셉트가 깨지면 컴파일러는 "어느 요구사항이 깨졌는지"를 직접 알려 준다.

```cpp
class NonHashable {};

HashMap<NonHashable, int> m;
// error: constraint 'Hashable<NonHashable>' was not satisfied
// note: required by 'std::hash<NonHashable>{}(x)' — no such function
```

SFINAE의 거대한 인스턴스화 trace보다 훨씬 읽기 좋다.

## Boost

Boost 라이브러리는 *승인된 항목*만 쓸 수 있다. 승인 목록은 시간에 따라 바뀐다.

```cpp
// 보통 OK — 표준에 없거나 표준이 따라가는 중인 기능
#include <boost/asio.hpp>          // 네트워크
#include <boost/format.hpp>
#include <boost/multi_index/...>
```

C++ 표준이 따라잡은 항목은 표준 쪽을 쓴다.

```cpp
// 표준이 있다 — 표준 우선
boost::optional<T>   →   std::optional<T>      (C++17)
boost::variant<...>  →   std::variant<...>      (C++17)
boost::filesystem    →   std::filesystem        (C++17)
boost::shared_ptr    →   std::shared_ptr         (C++11)
```

이미 Boost를 쓰는 코드는 일관성을 위해 그대로 둘 수 있지만, 새 코드에서는 표준을 우선한다.

## Designated Initializers (C++20)

C++20의 designated initializer는 struct 초기화의 가독성을 크게 높인다. 적극 권장된다.

```cpp
struct WindowOptions {
    int width;
    int height;
    bool fullscreen;
    bool vsync;
};

// Good
WindowOptions opts = {
    .width = 1920,
    .height = 1080,
    .fullscreen = true,
    .vsync = false,
};

// 회피 — 위치 순서에 의존
WindowOptions opts = {1920, 1080, true, false};   // 무엇이 어느 자리?
```

선언 순서를 따라야 한다는 점만 주의한다.

```cpp
struct Point { double x, y; };

Point p = {.y = 2.0, .x = 1.0};   // 컴파일 에러 — 선언 순서가 다름
```

## Aliases

`using` 별칭은 `typedef`보다 강력하고 읽기 좋다. 거의 항상 `using`을 쓴다.

```cpp
// Good — using
using EventHandler = std::function<void(const Event&)>;
using ConfigMap = std::map<std::string, std::string>;

// Alias template
template <typename T>
using SmallVector = absl::InlinedVector<T, 16>;

// 회피 — typedef
typedef std::function<void(const Event&)> EventHandler;
typedef std::map<std::string, std::string> ConfigMap;
```

별칭이 공개 API의 일부라면 그 별칭을 바꾸는 것이 곧 API breaking이라는 점을 의식한다. 헤더의 namespace에 별칭을 노출할 때는 신중해야 한다.

```cpp
// 공개 API — 안정성이 약속된다
namespace mylib {
using Handle = std::unique_ptr<Resource>;
using Callback = std::function<void(Status)>;
}

// 구현 디테일 — 자유롭게 변경
namespace mylib::internal {
using IntPair = std::pair<int, int>;
}
```

`using std::string;` 같은 별칭을 헤더에 두면 그 헤더를 포함한 모든 곳에 영향을 준다. 헤더에서는 금지다(Ch 3 참조).

## 작은 예시 — 모던 기능 한 묶음

```cpp
// myproject/util/result.h
#ifndef MYPROJECT_UTIL_RESULT_H_
#define MYPROJECT_UTIL_RESULT_H_

#include <concepts>
#include <functional>
#include <utility>

#include "absl/status/statusor.h"

namespace myproject::util {

template <typename T>
concept Serializable = requires(const T& x, std::string* out) {
    { x.Serialize(out) } -> std::same_as<void>;
};

template <typename T>
using Result = absl::StatusOr<T>;

template <Serializable T>
absl::Status Send(const T& value, Sink* sink) {
    std::string buffer;
    value.Serialize(&buffer);
    return sink->Write(buffer);
}

struct SendOptions {
    int timeout_ms = 5000;
    bool retry_on_failure = true;
    int max_retries = 3;
};

// 호출 예
//   SendOptions opts = {.timeout_ms = 1000, .max_retries = 5};
//   auto status = Send(my_value, sink);

}  // namespace myproject::util

#endif  // MYPROJECT_UTIL_RESULT_H_
```

Concept, alias, designated initializer가 자연스럽게 함께 쓰였다.

## 정리

- `auto`는 우변이 자명할 때만. 그 외에는 타입 명시.
- Structured bindings는 권장. `pair`/`tuple` 사용 시 가독성 보완.
- CTAD는 자명할 때만. 모호하면 명시.
- Lambda는 짧게, capture 명시, 길면 함수로.
- 깊은 템플릿 메타프로그래밍은 회피. `if constexpr`/Concepts로 대체.
- Concepts는 적극 권장.
- Boost는 승인 목록만. 표준이 있으면 표준 우선.
- Designated initializers는 적극 권장.
- 별칭은 `using`. 공개 API의 별칭은 안정성 약속.

## 다음 장 예고

다음은 **Naming**이다. 모든 식별자의 명명 규칙을 정리한다.

## 관련 항목

- [Ch 7: const / Numbers / Macros](/blog/embedded/automotive/google-cpp/chapter07-features-const-macros)
- [Ch 9: Naming](/blog/embedded/automotive/google-cpp/chapter09-naming)
