---
title: "Part 16-02: folly::Try — Future 결과 wrapper"
date: 2026-05-27T12:00:00
description: "Try<T>의 세 상태 (value/exception/empty), Future 내부에서의 역할, exception_wrapper와의 관계."
series: "Folly Code Review"
seriesOrder: 70
tags: [cpp, folly, try, future, error-handling]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `Try<T>`는 정상값, 예외, 빈 상태 셋 중 하나를 담는다. `Expected`가 도메인 오류 표현이라면 `Try`는 *예외 객체를 값으로 들고 다닐 때* 쓴다. Futures 내부의 결과 슬롯.

## 동기

`Future`/`Task`가 완료될 때 호출자는 두 가지 결과 중 하나를 받는다.

- 정상 결과 `T`.
- 비정상 — 예외 객체.

이 둘을 같은 슬롯에 담으려면 두 가지 해법이 있다.

1. **변종 인터페이스 (`Expected`)** — 도메인 오류 타입 `E`를 둔다. 그러나 임의 예외 타입을 그대로 받을 수 없다.
2. **예외 객체를 값으로 보관 (`Try`)** — `std::exception_ptr` 또는 `folly::exception_wrapper`로 임의 예외를 값 형태로.

Future/coroutine 결과 슬롯은 *어떤 예외*든 받아야 하므로 `Try`가 적합하다.

```cpp
folly::Try<int> t = compute();
if (t.hasValue())      use(*t);
else if (t.hasException()) handle(t.exception());
else /* empty */       // moved-from 또는 미설정
```

세 상태 모델이다. `Expected`의 empty 상태와 같은 이유 — moved-from 같은 일시적 무효 상태가 필요해서.

## API

```cpp
#include <folly/Try.h>

folly::Try<int> t1{42};                                  // value
folly::Try<int> t2{folly::make_exception_wrapper<std::runtime_error>("oops")};  // exception
folly::Try<int> t3;                                      // empty

// 상태 조회
t1.hasValue();       // true
t2.hasException();   // true
t3.hasValue();       // false

// 값 접근 — exception 상태면 throw
int v = t1.value();      // 42
int& vr = *t1;
int& vr2 = t1.value();

// 예외 접근
folly::exception_wrapper& ew = t2.exception();

// throw — exception 상태면 그 예외를 다시 throw, value 상태면 아무 일도 없음
t1.throwIfFailed();
```

`Try<void>` 도 일급. void 함수의 결과 슬롯에 쓴다.

## 생성 방식

```cpp
// 직접 값으로
folly::Try<int> a{10};
folly::Try<int> b{folly::in_place, 10};

// exception에서
folly::Try<int> c{folly::make_exception_wrapper<std::logic_error>("bad")};

// 람다 실행을 wrap — 정상이면 value, throw하면 exception 보관
auto t = folly::makeTryWith([&] { return riskyCompute(); });
// t는 hasValue 또는 hasException, throw가 호출자에게 전파되지 않음

// void 람다
auto tv = folly::makeTryWith([&] { riskyAction(); });   // Try<void>
```

`makeTryWith`가 가장 자주 쓴다. *예외를 catch해서 Try에 담는다*는 한 줄 패턴.

## Futures와의 관계

```cpp
// folly/futures/Future.h 약식
template <class T>
class Future {
 public:
  Try<T> getTry() &&;          // 결과 또는 예외를 Try로 추출
  T      get() &&;             // exception이면 throw

  template <class F>
  Future<R> thenTry(F&& fn);   // callback이 Try<T>를 받음
};
```

`thenTry`는 callback이 `Try<T>`를 받는다. value/exception을 같은 함수로 처리하고 싶을 때 쓴다.

```cpp
compute()
  .thenTry([](folly::Try<int>&& t) {
    if (t.hasException()) {
      LOG(WARNING) << "compute failed: " << t.exception().what();
      return -1;
    }
    return *t * 2;
  });
```

`thenValue`(value만)와 `thenError`(exception만)가 합쳐진 형태가 `thenTry`.

코루틴에서도 비슷한 패턴:

```cpp
auto t = co_await folly::coro::co_awaitTry(MaybeFails());
if (t.hasException()) { ... } else { use(*t); }
```

`co_awaitTry`가 `Try<T>`로 받는다. 예외 throw가 control flow에서 흔하면 이 형태가 가독성·성능 모두 낫다.

## 내부 구조

```cpp
// folly/Try.h 약식
template <class T>
class Try {
 public:
  enum class Contains { VALUE, EXCEPTION, NOTHING };

 private:
  Contains contains_ = Contains::NOTHING;
  union Storage {
    T                          value_;
    folly::exception_wrapper   ew_;
    Storage() {}
    ~Storage() {}
  };
  Storage storage_;

  void destroy() noexcept {
    if (contains_ == Contains::VALUE)     storage_.value_.~T();
    else if (contains_ == Contains::EXCEPTION) storage_.ew_.~exception_wrapper();
    contains_ = Contains::NOTHING;
  }
};
```

핵심은 두 가지.

1. **discriminated union** — `value_` 또는 `ew_` 둘 중 하나가 active. `contains_`가 어느 쪽인지 표시.
2. **exception_wrapper** — `std::exception_ptr`보다 풍부한 wrapper. 다음 절에서 본다.

## exception_wrapper — 왜 별도 타입인가

`std::exception_ptr`은 *opaque 핸들*이다. 예외 타입·메시지를 보려면 `rethrow_exception` + `catch`가 필요하다. log 한 줄 찍기에 무거운 비용.

`folly::exception_wrapper`는 wrapper 객체 자체에 type info, what() 캐시를 들고 다닌다.

```cpp
folly::exception_wrapper ew = folly::make_exception_wrapper<std::runtime_error>("bad");

LOG(ERROR) << ew.what();         // throw 없이 message 추출
LOG(ERROR) << ew.class_name();   // 타입 이름

if (ew.is_compatible_with<std::runtime_error>()) {
  ew.with_exception([](const std::runtime_error& e) {
    // type-safe handle
  });
}
```

`std::exception_ptr`은 throw/catch 없이 정보를 못 꺼낸다. `exception_wrapper`는 메타정보를 wrapper 안에 직접 보유해 *비용 없는 introspection*이 가능하다.

이게 Futures가 `Try<T>` 안에서 예외를 들고 다닐 수 있는 기반이다. throw/catch 비용 없이 callback chain을 통과한다.

## Try<void>

```cpp
folly::Try<void> t = folly::makeTryWith([] { doIt(); });
if (t.hasException()) handle(t.exception());
```

`Try<void>`는 `value()`가 의미 없지만 `hasValue() == true`일 수는 있다(정상 완료). void async 결과를 같은 인터페이스로 다루기 위한 일급.

## std와의 비교

| 항목 | std::exception_ptr | folly::exception_wrapper | folly::Try |
|------|----------------------|----------------------------|--------------|
| 역할 | 예외 캐리어 | 예외 캐리어 + 메타 | 결과 슬롯 |
| message 접근 | throw 후 catch | 직접 `.what()` | `.exception().what()` |
| 타입 introspection | 안 됨 | 됨 | `.exception().is_compatible_with<E>()` |
| 결과 + 예외 동시 | 표현 안 됨 | 표현 안 됨 | 표현됨 |
| 표준 | C++11 | folly | folly |

C++23에서도 `std::expected`가 `T` 또는 `E` (보통 enum) 두 갈래 모델만 표준화. *임의 예외*를 값처럼 들고 다니는 표준 도구는 아직 없다.

## 코드 리뷰 포인트

- `Try` 만들고 즉시 `*t` — exception 상태에서 throw. 분기 필수.
- callback이 `Try` 받는데 `hasException` 분기를 안 두면 silent swallow.
- `Try`를 멤버로 보관 — moved-from(empty)인지 항상 확인해야.
- exception_wrapper의 `with_exception<E>(...)`가 매치 안 되면 콜백이 실행되지 않는다 — fallback 필요.

## 자주 보는 안티패턴

```cpp
// 1. Try를 unwrap 강제
int v = t.value();   // empty 또는 exception이면 throw

// 2. exception_wrapper를 throw해서 다시 catch
try { t.exception().throw_exception(); }
catch (const std::runtime_error& e) { /* ... */ }
// → with_exception<std::runtime_error>(handler)로 throw 없이

// 3. Try<T>를 Expected처럼 사용 (도메인 오류 표현)
folly::Try<int> ParseInt(folly::StringPiece s);   // 의미가 어색하다
// 예외 throw가 정말 흔하면 Expected<int, ParseError> 가 옳다
```

## 정리

- `Try<T>`는 value/exception/empty 세 상태의 결과 슬롯이다.
- Future/coroutine 내부에서 결과를 보관하는 표준 wrapper.
- `exception_wrapper`로 throw/catch 없이 예외 메타정보 접근.
- `thenTry`, `co_awaitTry`로 value와 exception을 같은 분기에서 처리.
- 도메인 오류 표현(`Expected`)과는 *다른 용도* — 다음 절에서 정리.

## 다음 편

[Part 16-03: Try vs Expected](/blog/programming/code-review/folly/part16-03-try-vs-expected)에서 두 타입의 선택 기준을 정리한다.

## 관련 항목

- [Folly Part 16-01 — Expected](/blog/programming/code-review/folly/part16-01-expected)
- [Folly Part 13-01 — exception_wrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper)
- [Folly Part 2-04 — thenValue / thenTry / thenError](/blog/programming/code-review/folly/part2-04-then-value-error)
- [원문 — folly/Try.h](https://github.com/facebook/folly/blob/main/folly/Try.h)
