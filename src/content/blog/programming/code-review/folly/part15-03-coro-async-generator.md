---
title: "folly::coro::AsyncGenerator — 비동기 스트림"
date: 2026-06-07T09:12:00
description: "AsyncGenerator<T>의 pull-based 모델, co_yield, for co_await — 비동기 iterator의 표준 후보 패턴."
series: "Folly Code Review"
seriesOrder: 66
tags: [cpp, folly, coro, generator, stream]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `AsyncGenerator<T>`는 `co_yield`로 값을 한 번에 하나씩 비동기로 내보내고 소비자는 `for co_await`로 받는다. backpressure가 자연스럽고 cancellation도 협력적으로 동작한다.

## 동기

비동기 스트림을 표현하는 방법은 셋이다.

1. **callback** — `OnNext`, `OnComplete`, `OnError` 콜백 3종. RxCpp, Folly Observable 패턴. 가독성과 backpressure가 약점.
2. **push channel** — `Channel<T>::send(...)` / `recv()`. Go의 channel, fibers::Channel. backpressure는 buffer size로 조절.
3. **pull generator** — `co_yield` / `for co_await`. 소비자가 *원할 때만* 값을 당겨온다.

`AsyncGenerator<T>`는 셋째다. **pull-based**라 자동으로 backpressure가 생긴다. 소비자가 느리면 producer의 `co_yield`가 suspend 상태로 머문다.

```cpp
folly::coro::AsyncGenerator<int> Range(int n) {
  for (int i = 0; i < n; ++i) {
    co_await folly::coro::sleep(std::chrono::milliseconds(10));
    co_yield i;
  }
}

folly::coro::Task<int> Sum(int n) {
  int total = 0;
  auto gen = Range(n);
  while (auto v = co_await gen.next()) {
    total += *v;
  }
  co_return total;
}
```

`co_yield i`는 i를 소비자에게 넘기고 generator는 suspend 한다. 소비자가 다음 `next()`를 부르면 generator가 resume.

## API

```cpp
#include <folly/coro/AsyncGenerator.h>

folly::coro::AsyncGenerator<int> Source();

folly::coro::Task<void> Consume() {
  auto gen = Source();

  // 방법 1: next() — Optional 반환
  while (auto opt = co_await gen.next()) {
    process(*opt);
  }

  // 방법 2: for co_await (C++23 range-based)
  // CO_FOREACH macro, 또는 직접 풀어쓴 loop
}
```

`next()`는 `folly::coro::AsyncGenerator<T>::NextResult`를 반환한다. 이것이 `bool` 변환 가능(값이 있으면 true). end-of-stream이면 비어 있다.

### Reference vs Value yield

```cpp
// Value generator — co_yield가 복사/이동
folly::coro::AsyncGenerator<std::string> Lines(std::istream& in) {
  std::string line;
  while (std::getline(in, line)) {
    co_yield line;
  }
}

// Reference generator — co_yield가 참조 전달, 큰 객체 효율
folly::coro::AsyncGenerator<const LargeMessage&> Messages(Stream& s) {
  for (;;) {
    auto msg = co_await s.next();
    if (!msg) break;
    co_yield *msg;
  }
}
```

reference variant는 소비자가 다음 `co_await` 전까지만 reference가 유효하다는 계약이다. *consume-or-copy* 패턴.

## for co_await

```cpp
folly::coro::Task<void> Print(folly::coro::AsyncGenerator<int> gen) {
  while (auto v = co_await gen.next()) {
    std::cout << *v << "\n";
  }
}
```

표준에 `for co_await`가 도입되면 이렇게 쓸 수 있다.

```cpp
folly::coro::Task<void> Print(folly::coro::AsyncGenerator<int> gen) {
  CO_FOREACH (int v, gen) {        // folly macro
    std::cout << v << "\n";
  }
}
```

현재 folly가 제공하는 `CO_FOREACH` macro가 `for co_await`를 흉내낸다. 표준이 따라잡으면 사라질 헬퍼.

## 내부 구조

```cpp
// folly/coro/AsyncGenerator.h 약식
template <class Ref, class Value = std::remove_cvref_t<Ref>>
class AsyncGenerator {
 public:
  class promise_type {
   public:
    AsyncGenerator get_return_object() noexcept;
    std::suspend_always initial_suspend() noexcept;       // lazy
    auto                final_suspend() noexcept;         // notify consumer
    auto                yield_value(Ref v) noexcept;      // co_yield
    void                return_void() noexcept;
    void                unhandled_exception() noexcept;

   private:
    Ref* current_ = nullptr;
    std::coroutine_handle<> consumer_;
    folly::exception_wrapper exception_;
  };

  class NextAwaitable {
    auto await_suspend(std::coroutine_handle<> h) noexcept;
    auto await_resume();
  };

  NextAwaitable next() noexcept;
};
```

핵심은 두 코루틴(producer/consumer)이 *서로 resume*하는 패턴이다.

1. consumer가 `co_await gen.next()` 호출.
2. `await_suspend`가 producer handle을 반환 → symmetric transfer로 producer resume.
3. producer가 `co_yield v` → 값을 `current_`에 저장, consumer handle 반환 → consumer resume.
4. 반복.

end-of-stream은 producer가 `return_void`에 도달하면 final_suspend에서 consumer를 resume + 빈 NextResult.

## 합성 — chain / transform

```cpp
template <class T, class F>
folly::coro::AsyncGenerator<std::invoke_result_t<F, T>>
transform(folly::coro::AsyncGenerator<T> src, F f) {
  while (auto v = co_await src.next()) {
    co_yield f(std::move(*v));
  }
}

folly::coro::Task<void> Pipeline() {
  auto evens = transform(Range(10), [](int x) { return x * 2; });
  while (auto v = co_await evens.next()) {
    std::cout << *v << "\n";
  }
}
```

함수형 stream 조합이 일반 함수 호출로 표현된다. RxCpp의 operator 카탈로그 같은 별도 DSL이 필요 없다.

## Cancellation 전파

```cpp
folly::coro::Task<void> ConsumeWithTimeout(
    folly::coro::AsyncGenerator<int> gen) {
  auto src = folly::CancellationSource{};
  auto token = src.getToken();

  auto consumeTask = [&]() -> folly::coro::Task<void> {
    while (auto v = co_await gen.next()) {
      process(*v);
    }
  }();

  // 5초 뒤 cancel
  std::thread([s = src]() mutable {
    std::this_thread::sleep_for(std::chrono::seconds(5));
    s.requestCancellation();
  }).detach();

  co_await folly::coro::co_withCancellation(token, std::move(consumeTask));
}
```

cancellation은 producer 코루틴의 `co_await` suspend point에서 trigger된다. producer가 awaitable이 cancel-aware라면 `OperationCancelled` 예외로 깨어난다.

## Push channel과의 비교

| 항목 | AsyncGenerator | Channel |
|------|------------------|---------|
| 방향 | pull (consumer가 당김) | push (producer가 보냄) |
| backpressure | 자동 (suspend) | buffer size로 조절 |
| multi-consumer | 안 됨 (single owner) | 가능 |
| multi-producer | 안 됨 | 가능 |
| 합성 | 함수 합성 | 별도 connect/wire |

단일 producer ↔ 단일 consumer 모델이라면 `AsyncGenerator`가 단순. 팬아웃/팬인이 필요하면 `Channel`.

## std와의 비교

| 항목 | std::generator (C++23) | folly::coro::AsyncGenerator |
|------|--------------------------|------------------------------|
| 동기/비동기 | sync only | async (suspend 가능) |
| co_await | 안 됨 | yield 사이에 가능 |
| reference yield | 지원 | 지원 |
| for-range | `for (auto v : gen)` | `CO_FOREACH` 또는 `next()` |
| 표준화 | C++23 | 비표준 |

`std::generator`가 sync only라는 점이 결정적 차이. 비동기 stream은 표준에 아직 자리가 없다.

## 코드 리뷰 포인트

- generator를 두 번 iterate 시도 — single-shot이라 두 번째는 즉시 종료.
- reference yield인데 소비자가 다음 `next()` 후에 reference를 잡고 있음 — UAF.
- producer 코루틴이 cancel-aware하지 않은 외부 작업(blocking I/O)을 await — cancellation이 안 통함.
- generator를 lifetime이 짧은 stack-allocated 객체로 보유 → 코루틴 frame이 살아있는 동안 generator도 살아야 함.

## 자주 보는 안티패턴

```cpp
// 1. reference yield 결과를 collection에 보관
std::vector<const LargeMessage*> all;
while (auto v = co_await gen.next()) {
  all.push_back(&*v);   // 다음 iter에서 dangling
}

// 2. generator를 다중 consumer에게 공유
auto gen = Source();
std::thread t1([&] { folly::coro::blockingWait(consume(gen)); });
std::thread t2([&] { folly::coro::blockingWait(consume(gen)); });  // race

// 3. eager 평가 시도
auto all = collectAll(gen);   // AsyncGenerator는 collect 직접 안 됨
```

## 정리

- `AsyncGenerator<T>`는 pull-based 비동기 stream이다.
- `co_yield`로 값을 내보내고 `co_await gen.next()`로 받는다.
- producer/consumer는 symmetric transfer로 서로 resume.
- reference yield로 큰 객체를 복사 없이 전달 가능, 단 consume-or-copy 계약.
- `std::generator`(sync)와는 다른 도메인 — async stream은 표준에 아직 없다.

## 다음 편

[Part 15-04: blockingWait / collectAll](/blog/programming/code-review/folly/part15-04-coro-blocking-wait)에서 sync 경계와 fan-in을 본다.

## 관련 항목

- [Folly Part 15-02 — Task](/blog/programming/code-review/folly/part15-02-coro-task)
- [Folly Part 10-04 — fibers::Channel](/blog/programming/code-review/folly/part10-04-fibers-channel) — push channel과의 대비
- [원문 — folly/coro/AsyncGenerator.h](https://github.com/facebook/folly/blob/main/folly/coro/AsyncGenerator.h)
