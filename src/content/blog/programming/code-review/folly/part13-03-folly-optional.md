---
title: "Part 13-03: folly::Optional (vs std::optional)"
date: 2026-05-25T12:00:00
description: "Part 13-03: folly::Optional — std::optional와의 차이, 역사적 배경, monadic op과 std 호환."
series: "Folly Code Review"
seriesOrder: 58
tags: [cpp, folly, optional, types, std-compatible]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::Optional<T>`는 C++17 이전부터 존재하던 **std::optional의 선조**다. 지금은 거의 std::optional로 대체되었지만 일부 monadic op(`.then`, `.map`)과 `value_or_throw`, 그리고 fbcode 전반의 일관성을 위해 남아 있다. 신규 코드라면 std::optional이 정답에 가깝다.

## 동기 — 역사적 맥락

Folly가 만들어진 시점(2012년경)엔 표준에 `std::optional`이 없었다. boost::optional은 있었으나 fbcode는 boost 의존을 최소화했다. 그래서 자체 Optional을 만들었다.

C++17에서 `std::optional`이 표준화되면서 같은 위치를 차지하게 됐다. Folly는 자체 Optional을 deprecated하지 않고 std와 거의 호환되는 API + 약간의 extension으로 유지하고 있다. 이미 fbcode 전반이 folly::Optional을 쓰기 때문이다.

## API — std::optional와 거의 동일

```cpp
#include <folly/Optional.h>

folly::Optional<int> a;          // empty
folly::Optional<int> b = 42;     // has_value
folly::Optional<int> c{folly::none};

if (b) {
  int v = *b;        // dereference
  int v2 = b.value();
  int v3 = b.value_or(0);
}

// std 호환
b.has_value();
b.reset();
b.emplace(99);
```

이 부분만 보면 std::optional와 거의 같다.

## 추가 기능 — monadic op (std::optional는 C++23부터)

```cpp
folly::Optional<int> x = 42;

// map (std::optional의 transform과 같음)
auto y = x.map([](int v) { return v * 2; }); // Optional<int> = 84
auto z = x.then([](int v) { return getOpt(v); }); // Optional<int> 또는 flatMap

// or_else
auto w = x.or_else([] { return folly::Optional<int>(99); });

// value_or_throw
int v = x.value_or_throw<std::runtime_error>("missing");
```

이게 std::optional가 C++23 이전엔 없던 monadic API다. 지금 std::optional도 `transform`/`and_then`/`or_else`를 갖지만, fbcode가 C++17 시절에 작성됐기에 folly::Optional의 monadic op이 코드 전반에 박혀 있다.

## std::optional와의 차이 정리

| 항목 | std::optional | folly::Optional |
|------|---------------|-----------------|
| has_value | yes | yes |
| value_or | yes | yes |
| transform (C++23) | yes | yes (map) |
| and_then (C++23) | yes | yes (then) |
| or_else (C++23) | yes | yes |
| value_or_throw\<E\> | x | yes (custom exception) |
| operator== with T | yes | yes |
| 호환 변환 | — | std::optional 변환 가능 |

```cpp
folly::Optional<int> fo = 42;
std::optional<int> so = fo; // 호환 변환 OK
```

## 내부 구현

```cpp
template <typename T>
class Optional {
  union { T value_; }; // alignas(T)
  bool hasValue_;
};
```

std::optional와 같은 SBO 구조. value_가 union에 인라인 저장돼 heap 할당 없음.

생성자/소멸자가 hasValue_에 따라 placement-new / explicit destructor 호출.

## 코드 리뷰 포인트

### 1. 신규 코드는 std::optional

```cpp
// 회피 — 신규 코드에 folly::Optional
folly::Optional<int> get();

// Good — 신규는 std::optional
std::optional<int> get();
```

fbcode 안에서는 folly::Optional이 표준이지만, 외부에 노출되는 lib나 newer code면 std::optional이 호환성이 좋다.

### 2. monadic op vs if-then-else

```cpp
// monadic
auto greeting = name.map([](auto& n) { return "Hello, " + n; });

// if-then-else
folly::Optional<std::string> greeting;
if (name) greeting = "Hello, " + *name;
```

monadic이 짧지만, 단순 한 줄이면 if도 명료. chain이 두 단계 넘으면 monadic이 가독성 win.

### 3. value() throw 처리

```cpp
// 회피 — empty 시 throw
auto v = opt.value();

// Good — has_value 확인 또는 value_or
if (opt) auto v = *opt;
auto v = opt.value_or(default_v);
```

`value()`는 empty면 `bad_optional_access` throw. 의도된 throw인지 명확히.

### 4. Optional<reference> 회피

```cpp
// 회피
folly::Optional<int&> oref; // 정의되어 있지만 비추

// Good
folly::Optional<std::reference_wrapper<int>> oref;
// 또는 nullable pointer (T*)
```

reference에 대한 optional은 reference rebinding의 모호함이 있다.

## std::optional와 비교 — 어떤 걸 골라야 하나

| 상황 | 선택 |
|------|------|
| fbcode 내부 신규 모듈 | folly::Optional (관행) |
| 외부 lib / open-source 노출 API | std::optional |
| C++20 이하 코드 + monadic 필요 | folly::Optional |
| C++23 이상 사용 | std::optional |
| value_or_throw\<E\> 필요 | folly::Optional |

Folly 팀도 새 코드는 std::optional을 점진적으로 권장한다. folly::Optional은 fbcode 일관성과 monadic op(C++17 시절)이 주된 존재 이유.

## 안티패턴

### 1. Optional을 출력 인자로

```cpp
// 회피 — 출력 인자
void get(folly::Optional<int>& out);

// Good — 반환
folly::Optional<int> get();
```

Optional은 "값 또는 없음"의 의도가 반환 타입에 가장 잘 드러난다.

### 2. Optional<bool>을 tri-state로 남용

```cpp
folly::Optional<bool> flag; // empty / true / false — 의미 모호
```

명확한 enum이 가독성에 더 낫다.

```cpp
enum class FlagState { Unset, On, Off };
```

### 3. Optional<unique_ptr>

```cpp
// 회피 — 중복 nullable
folly::Optional<std::unique_ptr<T>> opt;
```

`unique_ptr<T>`가 이미 nullable. 그냥 `unique_ptr<T>`로.

## 정리

- folly::Optional은 std::optional의 선조, 호환 가능.
- C++17 이전에 필요했던 monadic op(map/then/or_else)을 일찍 도입.
- 추가 메서드: value_or_throw\<E\>, std::optional와 변환 가능.
- 신규 코드는 std::optional, fbcode 내부는 folly::Optional 관행 유지.
- Optional<reference>나 Optional<unique_ptr> 같은 중복 nullable은 회피.

## 다음 편

[Part 13-04 folly::Function](/blog/programming/code-review/folly/part13-04-folly-function) — move-only callable. std::function이 못 담는 unique_ptr capture를 어떻게 처리하나.

## 관련 항목

- [Part 6-01 to / tryTo](/blog/programming/code-review/folly/part6-01-to-try-to) — Optional 반환 패턴
- [Effective Modern C++ Item 5](/blog/programming/cpp/effective-modern-cpp/item05-prefer-auto) — auto와 Optional 추론
- [Effective Modern C++ Item 41](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value) — value vs reference 반환
