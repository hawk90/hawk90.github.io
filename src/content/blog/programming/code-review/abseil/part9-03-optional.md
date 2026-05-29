---
title: "Part 9-03: absl::optional (vs std)"
date: 2026-05-25T04:00:00
description: "absl::optional — std::optional이 도착하기 전 시기의 polyfill. 지금은 std::optional의 alias로 동작."
series: "Abseil Code Review"
seriesOrder: 50
tags: [cpp, abseil, types, optional, std-compatible]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 짧은 역사

`std::optional`은 C++17에 들어왔다. Abseil은 C++11 이후 Google이 사용하던 `absl::optional`을 그대로 유지하되, *C++17 이상 빌드에서는 std의 별칭*이 된다.

```cpp
// absl/types/optional.h 의 의사 코드
namespace absl {
#if defined(ABSL_USES_STD_OPTIONAL)
    using std::optional;
    using std::nullopt;
    using std::make_optional;
    using std::in_place;
#else
    template <typename T>
    class optional { /* polyfill */ };
#endif
}
```

C++17/20/23 어디서나 `absl::optional<T>`를 써도 안전하다. 코드를 옮길 때마다 `#include`만 정리하면 된다.

## 사용 — 표준 인터페이스

`std::optional`과 동일하다.

```cpp
#include "absl/types/optional.h"

absl::optional<int> FindUserAge(absl::string_view name);

auto age = FindUserAge("alice");
if (age.has_value()) {
    LOG(INFO) << "age = " << *age;
}

int safe = age.value_or(0);

absl::optional<std::string> empty;
empty = "hello";
empty.reset();
```

`has_value()` / `operator bool` / `operator*` / `value()` / `value_or` 모두 그대로.

## 함수 반환에서의 가치

null pointer 대신 값을 옵셔널로 감싸면 *수명·소유권* 의문이 사라진다.

```cpp
// 회피 — null 가능 raw pointer
const User* FindUser(int id);   // 누가 소유? null이면?

// Good — optional value
absl::optional<User> FindUser(int id);
```

또는 *error vs 부재* 구분이 필요하면 `StatusOr`를 쓴다(다음 비교).

| 시그니처 | 의미 |
|---------|------|
| `optional<T>` | 값이 *없을 수 있음*. 부재가 정상. |
| `StatusOr<T>` | 값이 있거나 *에러*. 에러 이유 전달. |
| `unique_ptr<T>` | 값이 있거나 nullptr. *소유권 이동* 필요할 때. |
| `const T*` | 값이 있거나 nullptr. *borrow*. |

## in-place 생성

복사·이동 없이 직접 생성.

```cpp
absl::optional<std::vector<int>> v(absl::in_place, {1, 2, 3, 4});

// 또는 make_optional
auto v2 = absl::make_optional<std::vector<int>>(10, 0);   // 10개 0
```

`emplace`도 같은 효과.

```cpp
absl::optional<std::string> s;
s.emplace("hello", 3);   // "hel"
```

## 비교와 정렬

`optional`끼리 비교 가능. `nullopt`는 *최소값*으로 취급.

```cpp
absl::optional<int> a = 5;
absl::optional<int> b = 10;
absl::optional<int> n;

a < b;   // true
n < a;   // true — nullopt is "smaller"
```

`std::set<absl::optional<T>>`도 자연스럽게 정렬한다.

## monadic 연산 — std는 있지만 absl polyfill에는 없음

C++23에 `optional::and_then`, `transform`, `or_else`가 들어왔다. `absl::optional`이 std alias로 동작하는 환경에서는 함께 사용 가능하지만, polyfill 시기에는 없다.

```cpp
// C++23
absl::optional<int> result = FindUser(id)
    .transform([](User u) { return u.age; });

// C++17/Abseil polyfill — 수동
absl::optional<int> result;
if (auto u = FindUser(id); u.has_value()) {
    result = u->age;
}
```

`absl::optional`을 *polyfill 모드* 로 강제하는 코드를 짤 일은 거의 없으므로 신경 쓰지 않아도 된다.

## absl 만의 추가 헬퍼

`absl::optional`은 std 호환을 우선해 추가 헬퍼를 거의 두지 않는다. *유일한 예외*는 polyfill 시기의 trivial copy/destroy 최적화 정도다. Production 코드는 `std::optional`과 동일하게 다룬다.

## 회피 패턴

```cpp
// 회피 — value() 무방비 호출
absl::optional<int> x = MaybeParse(s);
int v = x.value();   // ❌ 비어 있으면 bad_optional_access throw

// Good
if (!x) return absl::InvalidArgumentError("parse failed");
int v = *x;
```

```cpp
// 회피 — *를 if 가드 없이
return *FindUser(id);   // ❌ 부재일 때 UB

// Good
auto u = FindUser(id);
if (!u) return absl::NotFoundError("...");
return *u;
```

```cpp
// 회피 — optional<bool>은 의도 모호
absl::optional<bool> done;   // ❌ 세 상태: true/false/nullopt

// Good — enum class
enum class Done { kNo, kYes, kUnknown };
```

## std::optional 마이그레이션

C++17 이상 빌드라면 `absl::optional` ↔ `std::optional`은 *같은 타입*(alias)이다. 따라서 한 곳에서 다른 곳으로 자유롭게 통과시킨다.

```cpp
absl::optional<int> a = 5;
std::optional<int> s = a;   // OK — 같은 타입
```

장기 마이그레이션은 점진적으로 `std::optional`로 통일하면 된다. 헤더만 바꾸면 끝.

## 정리

- `absl::optional<T>`는 C++17 이상에서 `std::optional<T>`의 별칭.
- C++14 polyfill 시기에는 자체 구현으로 동일 인터페이스 제공.
- null pointer 대신 *값*으로 부재 표현 — 수명·소유권 의문 제거.
- `StatusOr`(에러), `unique_ptr`(소유), `T*`(borrow)와 의도를 구분.
- monadic 연산(C++23)은 std와 동일 — polyfill 시기에는 수동 분기.

## 다음 장 예고

[Part 9-04: absl::variant](/blog/programming/code-review/abseil/part9-04-variant) — `std::variant`의 polyfill.

## 관련 항목

- [Part 3-02: StatusOr](/blog/programming/code-review/abseil/part3-02-status-or) — 에러 vs 부재 구분
- [Part 9-04: absl::variant](/blog/programming/code-review/abseil/part9-04-variant)
- [Effective Modern C++ — 항목 18: unique_ptr](/blog/programming/cpp/effective-modern-cpp)
- [원문 — absl::optional](https://abseil.io/docs/cpp/guides/types#optional)
