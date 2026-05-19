---
title: "Part 2-04: .thenValue / .thenError / .thenTry — continuation 체인의 세 갈래"
date: 2026-05-23T09:00:00
description: "Future continuation API의 세 변형 — 정상값, 예외, 통합 처리. .then은 deprecated."
series: "Folly Code Review"
seriesOrder: 9
tags: [cpp, folly, future, continuation, error]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: continuation은 *값을 다룰지*, *예외를 다룰지*, *둘 다 다룰지* 의도를 코드에 적는다. 세 API의 이름이 그 의도를 강제한다.

## 동기 — 왜 `.then` 하나로 안 되는가

초기 Folly는 `.then(callback)` 하나만 있었다. callback의 시그니처에 따라 정상값 처리, Try 처리, 다른 Future 반환을 모두 분기했다.

```cpp
// 옛 API — 시그니처로 분기
f.then([](int x) { return x + 1; });           // value
f.then([](Try<int> t) { return *t + 1; });     // try
f.then([](int x) { return makeFuture(x); });   // future of future
```

이 방식은 두 가지 문제가 있었다.

1. **callback signature 변경이 silent**. `int`를 `auto`로 바꾸면 의도가 흐려진다.
2. **에러를 다룰지 안 다룰지가 보이지 않음**. `t.hasException()`을 체크하지 않으면 silent하게 전파된다.

Folly는 `.then`을 deprecated하고 *세 변형*으로 분리했다.

## 세 변형의 역할

```cpp
// 정상값만 — 예외는 그대로 전파
f.thenValue([](int x) -> R { return f(x); });

// 예외만 — 정상값은 그대로 전파
f.thenError(folly::tag_t<MyError>{}, [](MyError const& e) -> int {
  return -1;
});

// 둘 다 — Try<T>로 통합
f.thenTry([](Try<int> t) -> R {
  if (t.hasException()) return R::error();
  return process(*t);
});
```

| API | 입력 | 예외 처리 |
|-----|------|-----------|
| `thenValue(fn)` | `T` | 그대로 전파 (catch 안 함) |
| `thenError<E>(fn)` | `E const&` | 일치하는 예외만 catch |
| `thenTry(fn)` | `Try<T>` | 직접 처리 |

## thenValue — 가장 흔한 변형

```cpp
folly::SemiFuture<int> compute();

auto sf = compute()
  .deferValue([](int x) { return x + 1; })       // int → int
  .deferValue([](int x) {
    return folly::makeSemiFuture(x * 2);           // int → SemiFuture<int>
  })
  .deferValue([](int x) { return std::to_string(x); }); // int → string
```

return type이 `SemiFuture<U>`면 *flatten*된다. `SemiFuture<SemiFuture<U>>`가 되지 않는다.

```cpp
// folly/futures/Future.h (개념)
template <class F>
auto Future<T>::thenValue(F&& fn) && {
  using R = std::invoke_result_t<F, T>;
  if constexpr (isSemiFuture<R>) {
    // flatten
    return this->then([fn = std::move(fn)](Try<T> t) -> SemiFuture<inner_t<R>> {
      return fn(*std::move(t));
    });
  } else {
    // wrap
    return ...;
  }
}
```

## thenError — 타입별 예외 처리

```cpp
auto sf = fetch(url)
  .deferError(folly::tag_t<TimeoutError>{}, [](auto const&) {
    return defaultResponse();
  })
  .deferError(folly::tag_t<NetworkError>{}, [](auto const& e) {
    LOG(ERROR) << "network: " << e.what();
    throw;   // 재던지기
  });
```

`folly::tag_t<E>{}`로 catch할 예외 타입을 명시한다. 일치하지 않는 예외는 *그대로 전파*된다. 마지막 catch-all로 `std::exception`을 두면 안전망이 된다.

```cpp
.deferError(folly::tag_t<std::exception>{}, [](auto const& e) {
  LOG(ERROR) << "fallback: " << e.what();
  return Response::error();
});
```

## thenTry — 통합 처리

`Try<T>`를 직접 받으므로 `hasValue()`/`hasException()`을 분기한다.

```cpp
fetch(url).deferValue(parse).thenTry([](folly::Try<Parsed> t) {
  if (t.hasException()) {
    metrics->errors.inc();
    return Result::fail(t.exception());
  }
  metrics->success.inc();
  return Result::ok(*std::move(t));
});
```

`.thenTry`는 *모든 결과를 항상 처리*해야 할 때 적합하다. logging, metrics 수집이 전형적이다.

## .then의 deprecated 이유

```cpp
// 옛 API — 사용 금지
f.then([](int x) { return x + 1; });
f.then([](Try<int> t) { ... });
```

이름이 의도를 드러내지 못한다. 새 코드는 `.thenValue`, `.thenError`, `.thenTry` 중 하나를 명시적으로 골라야 한다. 코드 리뷰에서 `.then` 사용은 *항상* 지적한다.

## 내부 — callback 등록과 실행

```cpp
// folly/futures/detail/Core.h (요약)
template <class T>
void Core::setCallback(Callback callback, Executor::KeepAlive<> e) {
  // executor 등록
  setExecutor(std::move(e));

  // FSM 전이
  State expected = State::Start;
  if (state_.compare_exchange_strong(expected, State::OnlyCallback)) {
    callback_ = std::move(callback);
    return;
  }
  // 이미 result 도착
  expected = State::OnlyResult;
  if (state_.compare_exchange_strong(expected, State::Done)) {
    executor_->add([cb = std::move(callback), r = std::move(result_)]() mutable {
      cb(std::move(r));
    });
    return;
  }
}
```

result와 callback이 *어느 쪽이 먼저 도착하든* atomic FSM이 안전하게 처리한다. callback은 `executor_->add(...)`로 schedule된다.

## std::future / std::expected와의 비교

```cpp
// std::future — continuation 없음
std::future<int> f = std::async(...);
int v = f.get();
int r = process(v);   // 동기 처리만 가능

// std::expected (C++23) — 동기 monadic
std::expected<int, Err> e = compute();
auto r = e.and_then([](int x) { return std::expected<int, Err>{x + 1}; })
          .or_else([](Err e) { return std::expected<int, Err>{0}; });

// folly::Future — async monadic
folly::Future<int> f = ...;
auto r = std::move(f)
  .thenValue([](int x) { return x + 1; })   // ≈ and_then
  .thenError(folly::tag_t<Err>{}, [](Err) { return 0; });   // ≈ or_else
```

`std::expected`의 `.and_then`/`.or_else`와 `Folly`의 `.thenValue`/`.thenError`는 의도가 같다. 동기 vs 비동기가 차이일 뿐이다.

## 코드 리뷰 포인트

- **`.then` 사용?** 즉시 `.thenValue` 또는 `.thenTry`로 바꾼다.
- **`.thenValue` 체인이 예외 처리를 빠뜨렸는가?** 마지막에 `.thenError<std::exception>`을 두거나 caller가 try/catch를 안다.
- **return type이 `SemiFuture<SemiFuture<T>>`처럼 nested되는가?** flatten이 자동이지만 명시적 `.unwrap()`이 필요한 경우가 있다.
- **`thenError`의 catch 타입이 너무 넓은가?** `std::exception`을 위쪽에 두면 아래의 더 specific한 catch가 닿지 않는다.

## 자주 보는 안티패턴

```cpp
// 1. .then 사용
f.then([](int x) { return x + 1; });   // deprecated

// 2. thenError 순서 잘못
f.thenError(folly::tag_t<std::exception>{}, [](auto&) { return 0; })
 .thenError(folly::tag_t<MyError>{}, [](auto&) { return 1; });
// MyError가 std::exception을 상속하면 위에서 catch됨 — 두 번째 핸들러 도달 불가

// 3. value continuation 안에서 throw — 명시적이 더 낫다
f.thenValue([](int x) {
  if (x < 0) throw std::runtime_error("neg");
  return x;
});
// 차라리:
f.thenTry([](Try<int> t) -> Try<int> {
  if (*t < 0) return Try<int>(make_exception_wrapper<std::runtime_error>("neg"));
  return t;
});

// 4. thenError에서 다른 타입 반환
f.thenError(folly::tag_t<MyError>{}, [](auto&) {
  return "fallback";   // 원래 Future<int>인데 string 반환 — 컴파일 에러
});
```

## 정리

- continuation은 의도에 따라 `.thenValue`/`.thenError`/`.thenTry` 세 변형을 명시적으로 고른다.
- `.thenValue`는 정상값만, `.thenError<E>`는 타입별 예외, `.thenTry`는 통합 처리다.
- 옛 `.then`은 deprecated. 코드 리뷰에서 항상 지적한다.
- callback의 return이 `SemiFuture<U>`면 자동 flatten된다.
- `thenError` 체인은 *더 specific한 타입을 위쪽에* 둔다.
- 개념적으로 `std::expected`의 `.and_then`/`.or_else`와 같은 monadic 패턴이다.

## 다음 편

[Part 2-05: collect / collectAll / collectAny](/blog/programming/code-review/folly/part2-05-collect)에서 여러 Future를 모으는 fan-in 패턴을 본다.

## 관련 항목

- [Folly Part 2-02 — Promise / makeFuture](/blog/programming/code-review/folly/part2-02-promise-make-future)
- [Folly Part 13-01 — exception_wrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper)
- [Abseil Part 3-01 — Status](/blog/programming/code-review/abseil/part3-01-status) — 동기적 에러 처리 대안
