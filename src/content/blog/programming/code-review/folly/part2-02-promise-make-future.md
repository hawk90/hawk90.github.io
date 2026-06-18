---
title: "folly::Promise·makeFuture — Future를 만드는 두 길"
date: 2026-06-04T09:07:00
description: "folly::Promise로 비동기 완료를 표현하고, makeFuture/makeSemiFuture로 이미 결정된 값을 Future 인터페이스에 올린다."
series: "Folly Code Review"
seriesOrder: 7
tags: [cpp, folly, future, promise, async]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: `Promise<T>`는 *나중에* 값/예외를 채우는 생산자 측 핸들이고, `makeFuture` 계열은 *이미 결정된* 값을 Future 인터페이스에 올리는 단축 길이다.

## 동기 — 왜 두 가지 길이 필요한가

비동기 계산의 결과를 Future로 표현할 때 두 가지 상황이 있다.

1. 결과가 *아직 없음* — I/O 완료, timer 발화, 다른 thread의 작업 종료 등을 기다림
2. 결과가 *이미 있음* — 캐시 hit, validation 실패로 즉시 실패, default 값 반환

(1)은 `Promise<T>`로 표현한다. 생산자는 Promise를 들고 있다가 결과가 나오면 `setValue()`를 호출한다.
(2)는 `makeFuture(value)` / `makeSemiFuture(value)`로 표현한다. 새 Promise를 만들고 즉시 set하는 한 줄짜리 단축이다.

두 길의 결과물은 같다. 동일한 `Core<T>`를 가리키는 Future/SemiFuture가 만들어진다.

## Promise — 생산자 측 핸들

```cpp
#include <folly/futures/Promise.h>
#include <folly/futures/Future.h>

folly::Promise<int> p;
folly::SemiFuture<int> sf = p.getSemiFuture();

// 다른 thread에서
std::thread([p = std::move(p)]() mutable {
  std::this_thread::sleep_for(std::chrono::seconds(1));
  p.setValue(42);
}).detach();

int v = std::move(sf).via(&inlineExecutor).get();   // 42
```

`Promise`는 한 번만 set할 수 있다. 두 번 set하면 `PromiseAlreadySatisfied` 예외가 throw된다.

```cpp
// folly/futures/Promise.h (요약)
template <class T>
class Promise {
 public:
  Promise() : Promise(makeEmptyConstruct()) {
    core_ = new detail::Core<T>();
  }

  void setValue(T&& v) {
    throwIfFulfilled();
    core_->setResult(Try<T>(std::move(v)));
  }

  void setException(exception_wrapper ew) {
    throwIfFulfilled();
    core_->setResult(Try<T>(std::move(ew)));
  }

  template <class F>
  void setWith(F&& fn) {
    throwIfFulfilled();
    core_->setResult(makeTryWith(std::forward<F>(fn)));
  }

  SemiFuture<T> getSemiFuture();   // 한 번만 호출 가능
  Future<T> getFuture();            // SemiFuture + InlineExecutor

 private:
  detail::Core<T>* core_;
};
```

`setWith()`는 *함수 호출이 throw할 수 있을 때* 편리하다.

```cpp
folly::Promise<int> p;
p.setWith([] { return mayThrow(); });
// throw하면 자동으로 setException로 변환
```

## makeFuture / makeSemiFuture

이미 결정된 값을 Future로 wrap한다.

```cpp
folly::SemiFuture<int> ok = folly::makeSemiFuture(42);
folly::SemiFuture<int> ng = folly::makeSemiFuture<int>(
    folly::make_exception_wrapper<std::runtime_error>("bad"));

// void Future
folly::SemiFuture<folly::Unit> done = folly::makeSemiFuture();
```

`Unit`은 `void`를 1급 타입으로 다루기 위한 sentinel이다. `Future<void>`는 표준에 있지만 generic 코드에서 다루기 불편해 Folly는 `Future<Unit>`을 선호한다.

```cpp
// folly/futures/Future.h (요약)
template <class T>
SemiFuture<typename std::decay_t<T>> makeSemiFuture(T&& t) {
  return SemiFuture<...>(Try<...>(std::forward<T>(t)));
}

template <class T>
SemiFuture<T> makeSemiFuture(Try<T> t) {
  return SemiFuture<T>(std::move(t));
}

SemiFuture<Unit> makeSemiFuture();   // void 대체
```

## Try — 값 또는 예외의 통합 컨테이너

`Promise::setValue`/`setException`은 내부적으로 `Try<T>`로 변환된다. `Try<T>`는 `std::variant<T, exception_wrapper>`에 가깝다.

```cpp
// folly/Try.h (요약)
template <class T>
class Try {
 public:
  Try(T&& v);
  Try(exception_wrapper ew);

  bool hasValue() const;
  bool hasException() const;

  T& value() &;          // hasException이면 throw
  T&& value() &&;
  T const& operator*() const;
  T& operator*() &;
  T&& operator*() &&;

  exception_wrapper& exception();
};
```

`Try<T>`는 단순한 컨테이너지만, Future 체인 전체가 이 위에 돌아간다. 모든 `.thenTry(callback)`은 `Try<T>`를 인자로 받고 `Try<R>`을 반환한다.

```cpp
folly::Future<int> f = folly::makeFuture(42)
  .thenTry([](folly::Try<int> t) -> int {
    if (t.hasException()) return -1;
    return *t * 2;
  });
```

## makePromiseContract — 쌍을 한 번에

```cpp
auto [p, sf] = folly::makePromiseContract<int>();
// p: Promise<int>
// sf: SemiFuture<int> — p와 같은 Core 공유
```

C++17 structured binding으로 깔끔하게 표현된다. Promise와 Future를 별도로 만들어 연결할 때 보일러플레이트를 줄인다.

```cpp
// folly/futures/Promise.h (요약)
template <class T>
std::pair<Promise<T>, SemiFuture<T>> makePromiseContract() {
  auto p = Promise<T>();
  auto sf = p.getSemiFuture();
  return {std::move(p), std::move(sf)};
}
```

## std::promise와의 차이

```cpp
// std::promise
std::promise<int> p;
std::future<int> f = p.get_future();
p.set_value(42);
int v = f.get();   // 42

// folly::Promise
folly::Promise<int> p;
folly::SemiFuture<int> sf = p.getSemiFuture();
p.setValue(42);
int v = std::move(sf).via(&inlineExecutor).get();   // 42
```

비슷해 보이지만 두 가지가 다르다.

1. **continuation** — `std::promise`의 future는 `.then`이 없다. `f.get()`만 가능.
2. **exception API** — `std::promise::set_exception(std::exception_ptr)`은 타입 정보를 잃는다. `Promise::setException(exception_wrapper)`은 타입을 보존한다.

`exception_wrapper`는 *복사 가능한* exception 핸들로, type-erased 상태에서도 `with_exception<E>()`로 타입별 분기가 가능하다.

```cpp
folly::exception_wrapper ew = folly::make_exception_wrapper<MyError>("bad");
if (ew.with_exception([](MyError& e) { handleMy(e); })) {
  // matched
}
```

## 코드 리뷰 포인트

- **Promise의 수명이 Future보다 짧지 않은가?** Promise가 먼저 파괴되면 `BrokenPromise` 예외로 Future가 완료된다. silent failure가 아닌 *명시적 실패*다.
- **`getFuture()` vs `getSemiFuture()`?** 가능하면 후자를 쓴다. `getFuture()`는 InlineExecutor에 자동 바인딩되어 *어디서 callback이 도는지 불명확*하다.
- **Promise를 두 번 set하지는 않는가?** thread 두 곳에서 set하면 둘 중 하나가 throw된다.
- **makeFuture에 큰 객체를 by value로 넘기지 않는가?** `makeFuture(std::move(x))` 또는 `makeFuture<X>(args...)` 사용.

## 자주 보는 안티패턴

```cpp
// 1. Promise를 lambda에서 capture by reference
folly::Promise<int> p;
auto f = p.getSemiFuture();
std::thread([&p]() { p.setValue(42); }).detach();
// p가 stack에서 사라지면 dangling — 반드시 std::move로 capture

// 2. Promise를 set한 뒤 다시 set
p.setValue(1);
p.setValue(2);   // throws PromiseAlreadySatisfied

// 3. getFuture()를 두 번
auto f1 = p.getFuture();
auto f2 = p.getFuture();   // throws FutureAlreadyRetrieved

// 4. setException(std::exception_ptr)
std::exception_ptr ep = std::make_exception_ptr(MyError{});
p.setException(folly::exception_wrapper(ep));
// 타입 정보가 흐려짐 — 가능하면 make_exception_wrapper<MyError>(...) 사용
```

## 정리

- `Promise<T>`는 *나중에* 값/예외를 채우는 생산자 핸들이다. 한 번만 set 가능하다.
- `makeFuture`/`makeSemiFuture`는 *이미 결정된* 값을 Future 인터페이스에 올리는 단축이다.
- 두 길의 결과물은 같은 `Core<T>`를 가리킨다.
- `makePromiseContract<T>()`로 한 번에 쌍을 만든다.
- `exception_wrapper`는 `std::exception_ptr`보다 풍부한 type-erased 예외 표현이다.
- Promise 수명이 Future보다 짧으면 `BrokenPromise` 예외가 명시적으로 발생한다.

## 다음 편

[Part 2-03: SemiFuture vs Future](/blog/programming/code-review/folly/part2-03-semi-future-vs-future)에서 executor 바인딩의 차이가 무엇을 결정하는지 본다.

## 관련 항목

- [Folly Part 2-01 — Future 개요](/blog/programming/code-review/folly/part2-01-future-overview)
- [Folly Part 13-01 — exception_wrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper)
- [Folly Part 13-03 — folly::Try](/blog/programming/code-review/folly/part6-01-to-try-to)
