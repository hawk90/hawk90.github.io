---
title: "Part 16-01: folly::Expected — 결과 또는 오류"
date: 2026-05-27T11:00:00
description: "Expected<T, E>의 monadic API, std::expected와의 차이, absl::StatusOr와의 비교 — 예외 없는 에러 표현."
series: "Folly Code Review"
seriesOrder: 69
tags: [cpp, folly, expected, error-handling]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `Expected<T, E>`는 함수의 *정상 결과 또는 오류 코드*를 하나의 값으로 표현한다. C++23 `std::expected`의 선구자이자 `absl::StatusOr<T>`의 사촌으로 monadic 조합이 가능한 모델이다.

## 동기

C++의 오류 표현은 셋이다.

1. **예외(throw)** — 호출 그래프에서 멀리 전파되지만 throw cost가 있고 ABI/binary 크기 비용도 있다.
2. **return code + out-parameter** — C 스타일. `Status Foo(Bar* out)`. 호출 코드가 장황.
3. **결과+오류를 한 값으로** — `std::optional`, `std::variant`, 그리고 본격적 도구 `Expected<T, E>` / `StatusOr<T>`.

`Expected`는 셋째 길이다. throw cost를 피하면서 결과와 오류를 명시적으로 다룬다.

```cpp
folly::Expected<int, ParseError> ParseInt(folly::StringPiece s);

auto r = ParseInt("42");
if (r) {
  std::cout << *r;     // 정상
} else {
  std::cout << r.error();   // 오류
}
```

`bool` 변환으로 분기, `*` 또는 `value()`로 값, `error()`로 오류. 간단해 보이지만 monadic 조합에서 진가가 나온다.

### Monadic 흐름 — 그림

`Expected`의 진가는 chain에서 나온다. 각 단계가 OK면 통과, ERR면 short-circuit.

![Monadic Expected](/images/blog/cpp-concepts/diagrams/monadic-status-or.svg)

`.then(f)` / `.thenError(g)` / `EXPECTED_OR_RETURN` 모두 이 모델의 다른 표현이다. `absl::StatusOr`, `std::expected` (C++23)도 같은 그림 위에 있다.

## API

```cpp
#include <folly/Expected.h>

enum class ParseError { NotANumber, Overflow };

folly::Expected<int, ParseError> ParseInt(folly::StringPiece s) {
  int v;
  auto [p, ec] = std::from_chars(s.begin(), s.end(), v);
  if (ec == std::errc::invalid_argument) {
    return folly::makeUnexpected(ParseError::NotANumber);
  }
  if (ec == std::errc::result_out_of_range) {
    return folly::makeUnexpected(ParseError::Overflow);
  }
  return v;   // 암시 변환
}

void Use() {
  auto r = ParseInt("42");
  CHECK(r.hasValue());
  CHECK_EQ(*r, 42);

  auto e = ParseInt("xyz");
  CHECK(e.hasError());
  CHECK(e.error() == ParseError::NotANumber);
}
```

생성 패턴:

- 정상값: `return v;` (T로부터 암시 변환) 또는 `folly::Expected<T, E>{v}`.
- 오류값: `return folly::makeUnexpected(e);`.

접근:

- `hasValue()` / `hasError()` / `operator bool()`.
- `value()`, `operator*()`, `operator->()` — 오류면 throw.
- `error()`, `tryGetExceptionObject()`.
- `value_or(default)` — 오류면 default.

## Monadic 조합

![Expected monadic chain](/images/blog/folly/diagrams/part16-01-expected-states.svg)

```cpp
folly::Expected<User, Error> LookupUser(UserId id);
folly::Expected<Email, Error> GetEmail(const User& u);
folly::Expected<bool, Error>  SendNotification(const Email& e);

folly::Expected<bool, Error> Pipeline(UserId id) {
  return LookupUser(id)
    .then([](User u)  { return GetEmail(u); })
    .then([](Email e) { return SendNotification(e); });
}
```

`then(f)`는 정상값이면 `f`를 호출하고 결과 `Expected`를 반환, 오류면 그대로 전파.

`thenOrThrow(f)`, `orElse(f)`, `transform(f)`, `transformError(f)` 등 다양한 조합기.

```cpp
auto result = Lookup(id)
  .transform([](User u) { return u.name; })          // T → U 매핑
  .transformError([](Error e) { return LogError{e}; }) // E → F 매핑
  .value_or("anonymous");
```

monadic 체인이 자연스럽다. 표준 `std::expected` (C++23)도 비슷한 API를 가졌다.

## 내부 구조

```cpp
// folly/Expected.h 약식
template <class T, class E>
class Expected {
 public:
  // tagged union
  union Storage {
    T value_;
    E error_;
  };
  Storage storage_;
  enum class State { hasValue, hasError, empty } state_;

  // 생성자/소멸자가 state에 따라 분기
  ~Expected() {
    if (state_ == State::hasValue) storage_.value_.~T();
    else if (state_ == State::hasError) storage_.error_.~E();
  }

  // 접근
  bool hasValue() const noexcept { return state_ == State::hasValue; }
  T&   value() &  { if (!hasValue()) throw_(); return storage_.value_; }
  E&   error() &  { return storage_.error_; }
};
```

본질적으로 `variant<T, E>`와 비슷하지만 `Expected`는 *T가 우선*이라는 의미가 인코딩된다. `*expected`가 값을 의미하지 오류를 의미하지 않는다.

### 빈 상태 (empty)

```cpp
folly::Expected<int, Error> e;     // 기본 생성자가 있다 — 빈 상태
e = ParseInt("42");                // 채워짐
```

표준 `std::expected`는 항상 value 또는 error를 보유한다. folly는 `empty` 상태가 추가로 있다. 기본 생성자, moved-from 상태를 표현하기 위함. *사용 전에 채워야 한다*는 계약.

## std::expected (C++23)와의 비교

| 항목 | std::expected | folly::Expected |
|------|---------------|-----------------|
| 도입 | C++23 | 2015 (Folly) |
| empty state | 없음 (T 또는 E) | 있음 (`empty`) |
| `and_then` | 있음 | `then` |
| `transform` | 있음 | `transform` |
| `or_else` | 있음 | `orElse` |
| swap, hash | 있음 | 있음 |
| void T | `expected<void, E>` 지원 | 지원 |
| 예외 | `bad_expected_access` | `BadExpectedAccess` |

C++23이 표준화하면서 folly와 거의 같은 모양이 됐다. fbcode는 점진적으로 표준으로 이주 중이지만 모든 컴파일러가 받지 못한 시점이라 folly 버전이 한동안 더 살아남는다.

## absl::StatusOr와의 비교

```cpp
absl::StatusOr<int>      a = absl::InvalidArgumentError("bad");
folly::Expected<int, Error> b = folly::makeUnexpected(Error::Bad);

// 비슷한 패턴, 다른 type system
if (a.ok()) use(*a); else log(a.status());
if (b)     use(*b); else log(b.error());
```

| 항목 | absl::StatusOr<T> | folly::Expected<T, E> |
|------|-------------------|------------------------|
| 오류 타입 | `absl::Status` 고정 | `E` 자유 |
| 오류 메시지 | 항상 문자열 + code | E가 정의하기 나름 |
| monadic | 약함 (`.value_or` 정도) | 강함 (`.then`, `.transform`) |
| 도메인 | RPC 응답에 최적 | 일반 도메인 오류 |

`StatusOr`는 *문자열 메시지*가 항상 따라온다는 게 매력. 디버깅에 강하다. `Expected`는 *오류 enum/struct*를 자유롭게 선택해 분기가 쉽다.

선택 기준: cross-service RPC면 `StatusOr`(혹은 `absl::Status`), 내부 domain logic이면 `Expected<T, EnumOrStruct>`.

## 코드 리뷰 포인트

- `*expected`를 `bool` 체크 없이 사용 → throw로 가는 길.
- 함수 시그니처가 `Expected<int, std::string>`처럼 *string error* → enum/struct로 type-safe하게.
- `value_or(0)` 패턴이 `0`을 의미 있는 값과 구별 못 함 → `optional`도 같은 함정. 분기 명시가 안전.
- `Expected`를 throw 대용으로 쓰면서 호출자가 항상 무시 → throw가 더 적합한 경우가 있다.
- monadic 체인이 길어지면 가독성 손해. 변수에 풀어쓰는 게 나을 때도 많다.

## 자주 보는 안티패턴

```cpp
// 1. Expected를 가져서 즉시 *
Result r = *Compute();   // 오류 처리 안 함

// 2. Expected를 함수 시그니처로 받음 (input이 아니라)
void Process(folly::Expected<int, Error> x);   // 이상하다. 호출자가 미리 분기해야 의미.

// 3. E가 trivially copyable이 아닌 무거운 타입
folly::Expected<int, std::vector<std::string>> Compute();   // 오류 path가 무겁다

// 4. 오류 enum이 success도 표현
enum class Status { Ok, Error };
folly::Expected<int, Status> ParseInt(...);
// → Ok가 의미 없음. Expected에는 오류 only enum이 옳다.
```

## 정리

- `Expected<T, E>`는 정상값 또는 오류를 한 타입에 표현하는 sum type이다.
- monadic `then`/`transform`/`orElse`로 조합한다.
- `std::expected`(C++23)와 거의 같은 모양 — folly가 선구자.
- `absl::StatusOr<T>`는 오류 타입이 `Status` 고정, 메시지 풍부. RPC 도메인.
- empty 상태가 있다는 점만 표준과 다르다 — moved-from 표현용.

## 다음 편

[Part 16-02: folly::Try](/blog/programming/code-review/folly/part16-02-try)에서 Future 결과 wrapper를 본다.

## 관련 항목

- [Folly Part 16-02 — Try](/blog/programming/code-review/folly/part16-02-try)
- [Folly Part 16-03 — Try vs Expected](/blog/programming/code-review/folly/part16-03-try-vs-expected)
- [Folly Part 13-03 — folly::Optional](/blog/programming/code-review/folly/part13-03-folly-optional)
- [원문 — folly/Expected.h](https://github.com/facebook/folly/blob/main/folly/Expected.h)
