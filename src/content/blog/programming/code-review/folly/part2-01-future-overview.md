---
title: "Part 2-01: folly::Future 개요 — std::future의 한계를 넘는 composable async"
date: 2026-05-23T06:00:00
description: "folly::Future가 std::future의 어떤 한계를 해결하는가 — continuation, executor binding, exception 전파."
series: "Folly Code Review"
seriesOrder: 6
tags: [cpp, folly, future, async, overview]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: `std::future`는 값을 가져가는 통로에 그친다. `folly::Future`는 continuation, executor binding, 예외 전파를 모두 다루는 조립 가능한 async primitive다.

## 동기 — std::future는 왜 부족한가

C++11이 `std::future`를 도입했을 때 가장 큰 결함이 둘이었다.

1. **`.then` 없음** — Future가 완료된 뒤 콜백을 거는 방법이 없다. `std::async` + `std::future` 조합은 값을 한 번 받는 패턴만 표현한다.
2. **executor 개념 없음** — Future가 어디서 실행되는지 표준에 명세되지 않는다. `std::async(std::launch::async, ...)`는 OS thread를 매번 새로 만들 수도, 안 만들 수도 있다.

C++23의 `std::expected`, C++26 후보의 senders/receivers가 이 문제를 풀고 있지만 지금 production에서 쓸 도구는 아니다. Folly는 2014년부터 이 빈자리를 채워왔다.

## API 한눈에

```cpp
#include <folly/futures/Future.h>
#include <folly/executors/CPUThreadPoolExecutor.h>

folly::CPUThreadPoolExecutor pool(4);

// 1) 즉시 완료된 Future
folly::SemiFuture<int> sf = folly::makeSemiFuture(42);

// 2) executor에 bind → Future
folly::Future<int> f = std::move(sf).via(&pool);

// 3) continuation 체인
auto result = std::move(f)
  .thenValue([](int x) { return x * 2; })
  .thenValue([](int x) { return std::to_string(x); })
  .thenError(folly::tag_t<std::exception>{}, [](auto const& e) {
    return std::string{"error: "} + e.what();
  })
  .get();   // blocking wait
```

세 줄 안에 비동기 계산, 에러 처리, 결과 회수가 모두 표현된다. `std::future`로 같은 패턴을 짜면 별도의 thread, condition variable, try/catch가 필요하다.

## 핵심 타입 세 가지

```text
Promise<T>      ──setValue/setException──▶  Core<T>  ──.thenValue──▶  Future<T>
                                              ▲
                                              │
                              SemiFuture<T> ──┘ (.via(executor) 필요)
```

| 타입 | 역할 |
|------|------|
| `Promise<T>` | 값 또는 예외를 생산자가 채우는 쪽 |
| `SemiFuture<T>` | executor 미바인딩 상태 — 계산은 끝났을 수 있지만 continuation은 어디서 돌릴지 모름 |
| `Future<T>` | executor 바인딩 완료 — continuation을 그 executor에서 실행 |

이 셋의 분리가 `std::future`와의 결정적 차이다. `std::future`는 두 단계(생산/소비)지만 Folly는 세 단계(생산/실행자/소비)다.

### Promise/Future 일반 모델

타입 수와 별개로, *Promise는 생산자 쪽, Future는 소비자 쪽*이라는 분리 자체는 어느 future 구현에도 공통이다.

![Promise/Future split and chain](/images/blog/cpp-concepts/diagrams/future-promise-chain.svg)

생산자가 shared state에 값을 set하면 소비자가 그 값을 get한다. `.then` 체인은 콜백 중첩 대신 평탄한 파이프라인을 만들어 callback hell을 해소한다.

## 내부 구조 — Core

![Future / Promise lifecycle](/images/blog/folly/diagrams/part2-01-future-states.svg)

```cpp
// folly/futures/detail/Core.h (요약)
template <class T>
class Core {
 public:
  enum class State {
    Start,
    OnlyResult,        // result만 있음 (callback 없음)
    OnlyCallback,      // callback만 있음 (result 없음)
    OnlyCallbackAllowInline,
    Proxy,
    Done,              // result + callback 모두 처리
    Empty,
  };

  std::atomic<State> state_;
  folly::Try<T> result_;
  Callback callback_;
  Executor::KeepAlive<> executor_;
};
```

`Core`는 FSM으로 생산자와 소비자의 순서 무관성을 처리한다. `setValue()`가 먼저 와도 되고 `thenValue()`가 먼저 와도 된다. 둘 다 도착하면 `executor_`로 callback을 schedule한다.

```cpp
// folly/futures/detail/Core.cpp (개념)
void Core::setResult(Try<T> t) {
  State expected = State::Start;
  if (state_.compare_exchange_strong(expected, State::OnlyResult)) {
    result_ = std::move(t);
    return;   // callback이 나중에 옴
  }
  // 이미 callback이 등록됨 → 즉시 실행
  result_ = std::move(t);
  state_ = State::Done;
  executor_->add([cb = std::move(callback_), r = std::move(result_)]() mutable {
    cb(std::move(r));
  });
}
```

`compare_exchange_strong`으로 atomic FSM 전이를 한다. 두 thread가 동시에 도착해도 race가 없다.

## Continuation 모델

```cpp
// SemiFuture<int>::thenValue (개념)
template <class F>
auto SemiFuture<int>::thenValue(F&& fn) && {
  using R = std::invoke_result_t<F, int>;
  auto [p, f] = folly::makePromiseContract<R>();   // 새 Promise/Future 쌍
  std::move(*this).setCallback_([p = std::move(p), fn = std::move(fn)](Try<int>&& t) mutable {
    if (t.hasException()) {
      p.setException(std::move(t.exception()));
    } else {
      p.setWith([&] { return fn(*std::move(t)); });
    }
  });
  return std::move(f);
}
```

각 `.thenValue()`는 새 Promise/Future 쌍을 만들고 그것을 다음 단계에 넘긴다. 체인은 linked list와 비슷하게 자란다.

## std::future / std::async와의 비교

| 항목 | std::future | folly::Future |
|------|-------------|---------------|
| continuation | 없음 (C++23 `.then` 제안 중) | `.thenValue`, `.thenTry`, `.thenError` |
| executor | 없음 (launch policy만) | `.via(Executor*)` |
| exception 전파 | `set_exception` 단방향 | `Try<T>` 통합 |
| 결합 | 없음 | `collect`, `collectAll`, `collectAny` |
| timeout | `wait_for` 만 | `.within(Duration)` |
| retry | 없음 | `folly::futures::retrying(...)` |
| cancellation | 없음 | `CancellationToken` |
| coroutine 통합 | 없음 | `folly::coro::Task` (별도) |

`std::future`는 Future를 값으로 한 번 받는 인터페이스에 머문다. Folly는 Future를 데이터플로우의 노드로 본다.

## 간단한 실전 예

```cpp
folly::IOThreadPoolExecutor io(2);
folly::CPUThreadPoolExecutor cpu(4);

folly::SemiFuture<std::string> fetchUrl(std::string url);
folly::SemiFuture<Parsed> parse(std::string body);

folly::SemiFuture<Parsed> getParsed(std::string url) {
  return fetchUrl(std::move(url))
    .via(&io)              // I/O는 IO pool
    .thenValue([cpu = &cpu](std::string body) {
      return parse(std::move(body))
        .via(cpu);          // parse는 CPU pool
    });
}
```

I/O와 CPU 작업을 서로 다른 executor로 분리하는 패턴이 한 줄씩이다. `std::future`로는 별도의 thread pool 추상화를 직접 만들어야 한다.

## 코드 리뷰 포인트

- **`.via()`가 누락됐는가?** SemiFuture를 그대로 `.get()`하거나 `.thenValue()`하면 어디서 실행될지 불명확하다.
- **`.get()`이 hot path에 있는가?** blocking이다. `.then` 체인으로 풀어야 한다.
- **체인 중간에 captured by reference가 있는가?** lambda 수명이 Future 수명보다 길면 dangling이다.
- **예외가 silent하게 swallow되는가?** `.thenError`를 두지 않으면 `.get()`에서 throw된다.

## 자주 보는 안티패턴

```cpp
// 1. SemiFuture를 그대로 .get()
auto v = computeSemi().get();  // executor 없음 → InlineExecutor 또는 deadlock

// 2. Future를 멤버로 보관
class Worker {
  folly::Future<int> f_;   // continuation 체인이 살아 있어야 의미 있음
};

// 3. 매 호출마다 새 thread pool
void handle() {
  folly::CPUThreadPoolExecutor pool(4);   // 매번 생성/파괴 — 비용 폭증
  compute().via(&pool).get();
}

// 4. exception swallow
compute().thenValue([](int x) { return parse(x); }).get();
// parse가 throw하면 get()에서 다시 throw — caller가 모를 수 있음
```

## 정리

- `folly::Future`는 continuation, executor binding, exception 전파를 통합한 async primitive다.
- 핵심 타입은 `Promise<T>` / `SemiFuture<T>` / `Future<T>` 세 가지다.
- 내부 `Core<T>`가 atomic FSM으로 생산자/소비자 순서 무관성을 보장한다.
- `std::future`와 다른 사고 모델이다. 값이 아니라 데이터플로우 노드다.
- C++26 senders/receivers가 도착하면 이 패턴은 표준으로 흡수될 가능성이 높다.

## 다음 편

[Part 2-02: Promise / makeFuture](/blog/programming/code-review/folly/part2-02-promise-make-future)에서 Future를 만드는 두 가지 길을 자세히 본다.

## 관련 항목

- [Folly Part 2-03 — SemiFuture vs Future](/blog/programming/code-review/folly/part2-03-semi-future-vs-future)
- [Folly Part 3-01 — InlineExecutor](/blog/programming/code-review/folly/part3-01-inline-executor)
- [Effective Modern C++ Item 38](/blog/programming/cpp/effective-modern-cpp/item38-thread-handles) — std::future 한계
