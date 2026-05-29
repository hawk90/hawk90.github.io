---
title: "Part 2-07: folly::fibers — M:N stackful coroutine"
date: 2026-05-23T12:00:00
description: "Folly fibers는 boost.context 기반 stackful coroutine. 동기 코드처럼 쓰고 비동기로 동작하는 M:N 모델."
series: "Folly Code Review"
seriesOrder: 12
tags: [cpp, folly, fibers, coroutine, async]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: `folly::fibers`는 boost.context 기반 stackful coroutine으로 *동기적으로 보이는* 코드를 비동기 실행한다. C++20 coroutine보다 코드 변환이 가볍지만 stack 메모리를 쓴다.

## 동기 — stackful coroutine이 필요한 이유

`folly::Future` 체인은 강력하지만 *코드 모양*이 비동기적이다.

```cpp
folly::SemiFuture<Result> process(int id) {
  return fetchUser(id)
    .deferValue([](User u) { return fetchOrders(u); })
    .deferValue([](std::vector<Order> orders) { return summarize(orders); });
}
```

같은 로직을 동기 스타일로 쓰고 싶다.

```cpp
Result process(int id) {
  User u = fetchUserSync(id);
  auto orders = fetchOrdersSync(u);
  return summarize(orders);
}
```

C++20 coroutine은 이를 위해 `co_await`을 도입했다. Folly fibers는 그 *이전부터* 같은 일을 한다. boost.context의 `make_fcontext`/`jump_fcontext`로 *진짜 stack을 만들어* 그 위에서 동기 코드를 돌린다. blocking call에서 fiber를 yield하고 다른 fiber로 jump한다.

## 핵심 API

```cpp
#include <folly/fibers/FiberManager.h>
#include <folly/fibers/EventBaseLoopController.h>
#include <folly/io/async/EventBase.h>

folly::EventBase evb;
folly::fibers::FiberManager& fm =
    folly::fibers::getFiberManager(evb);

fm.addTask([] {
  // 이 lambda는 fiber stack에서 실행됨
  Result r = doSyncWork();   // blocking call OK
  saveResult(r);
});

evb.loop();   // FiberManager 가 EventBase에 schedule됨
```

`fm.addTask(fn)`은 *fn을 새 fiber stack에서* 실행한다. fiber 안의 코드는 `baton.wait()`, `await(future)`, channel read 등에서 yield할 수 있다.

## await — Future를 fiber 안에서 동기적으로

```cpp
fm.addTask([] {
  folly::SemiFuture<int> sf = computeAsync();
  int v = folly::fibers::await([&](folly::Promise<int> p) {
    std::move(sf).via(...).thenValue([p = std::move(p)](int x) mutable {
      p.setValue(x);
    });
  });
  // v를 동기 코드처럼 사용
});
```

좀 더 간단한 변형도 있다.

```cpp
int v = folly::fibers::await(computeAsyncFuture());   // SemiFuture 직접
```

`await`은 *현재 fiber를 yield*시키고 Promise를 caller가 채워줄 때 *돌아온다*. 다른 fiber는 그 사이 계속 돈다.

## Baton — fiber-aware 동기화

```cpp
folly::fibers::Baton baton;

fm.addTask([&] {
  std::cout << "wait\n";
  baton.wait();   // fiber yield
  std::cout << "done\n";
});

// 다른 fiber 또는 다른 thread에서
baton.post();   // wait중인 fiber를 깨움
```

`std::condition_variable`과 비슷하지만 *thread를 block하지 않고 fiber만 block*한다. 같은 thread의 다른 fiber는 계속 진행된다.

## Channel — fiber 간 메시지 통신

```cpp
folly::fibers::Channel<int, 10> ch;   // buffered, capacity 10

fm.addTask([&] {
  for (int i = 0; i < 100; ++i) {
    ch.send(i);   // 가득 차면 fiber yield
  }
  ch.close();
});

fm.addTask([&] {
  while (auto v = ch.receive()) {   // 비어 있으면 fiber yield
    process(*v);
  }
});
```

Go의 channel과 비슷하다. *producer/consumer를 fiber 단위로 분리*한다.

## 내부 — stackful의 구현

![Fiber cooperative swap](/images/blog/folly/diagrams/part2-07-fibers-swap-seq.svg)

```cpp
// folly/fibers/Fiber.h (요약)
class Fiber {
  void* stack_;           // mmap된 stack
  size_t stackSize_;
  boost::context::fcontext_t ctx_;   // saved context (rsp, rbp, ...)
  std::function<void()> func_;
  // ...
};

// 전환 시
void switchToFiber(Fiber* f) {
  boost::context::jump_fcontext(&main_ctx_, f->ctx_, 0);
  // jump 후 함수가 yield하면 여기로 돌아옴
}
```

`boost::context::jump_fcontext`는 *register 저장/복구*를 어셈블리로 수행한다. context switch는 100ns 정도로 OS thread switch(~1μs)보다 한 자릿수 빠르다.

stack은 기본 64KB(설정 가능)다. 1만 개 fiber면 640MB. M:N 모델이지만 stack memory가 *thread보다 절약*되는 정도지 *무한*은 아니다.

## C++20 coroutine과의 비교

C++20 coroutine은 *stackless*다. compiler가 함수의 local을 heap-allocated frame에 변환한다.

| 항목 | folly::fibers (stackful) | C++20 coroutine (stackless) |
|------|--------------------------|------------------------------|
| stack | 진짜 stack (mmap) | heap-allocated frame |
| memory | fiber당 64KB+ | 함수당 변수 합 |
| 변환 | 없음 (그냥 함수) | compiler 변환 (`co_await`) |
| 호출 깊이 | 일반 함수처럼 무제한 | coroutine은 stackless라 nested 어려움 |
| 디버깅 | stack trace 정상 | frame이 흩어져 어려움 |
| 표준 | 비표준 | 표준 (C++20) |

C++20 coroutine은 *함수당* heap allocation을 한 번 한다. 메모리는 fiber보다 적게 쓰지만 *컴파일러 마법*이 들어간다. fiber는 메모리가 더 들지만 *코드는 그대로*다.

## 적합한 사용 사례

**Fiber 권장**:
- Legacy 동기 코드를 *그대로* 비동기 실행하고 싶을 때
- nested function call이 깊을 때 (RPC -> validate -> log -> db ...)
- 디버깅 가능한 stack trace가 필요할 때

**C++20 coroutine 권장**:
- 새 코드, 메모리 효율이 중요할 때
- 표준 사용 가능한 환경
- `folly::coro::Task<T>`로 통합 가능

Folly는 두 모델을 모두 지원한다. `folly/experimental/coro/`에 C++20 coroutine 통합이 있다.

## EventBase와의 통합

```cpp
folly::EventBase evb;
folly::fibers::FiberManager::Options opts;
opts.stackSize = 64 * 1024;
auto& fm = folly::fibers::getFiberManager(evb, opts);

fm.addTask([&] {
  // I/O는 EventBase에 schedule되고
  // 그 결과를 await으로 동기 스타일로 받음
  auto result = folly::fibers::await(asyncFetch());
  process(result);
});

evb.loopForever();
```

`FiberManager`는 *EventBase에 schedule된 task*다. EventBase loop이 돌 때마다 ready fiber를 실행한다.

## 코드 리뷰 포인트

- **fiber stack size가 적정한가?** 기본 64KB. 깊은 호출이면 늘리고, 많이 띄우면 줄인다.
- **fiber 안에서 *thread blocking* 호출을 하지 않는가?** `std::this_thread::sleep_for`는 fiber만이 아니라 *전체 thread*를 block한다. `folly::fibers::sleep_for` 사용.
- **shared state에 동시 접근 시 lock이 있는가?** 같은 thread의 다른 fiber라도 yield 지점에서 race가 생긴다.
- **C++20 coroutine과 혼용하는가?** 가능하지만 *진입점*이 헷갈린다. 모듈 단위로 통일한다.

## 자주 보는 안티패턴

```cpp
// 1. fiber 안에서 thread block
fm.addTask([] {
  std::this_thread::sleep_for(std::chrono::seconds(1));   // 잘못
  // 같은 thread의 모든 fiber가 멈춤
});

// 옳음:
fm.addTask([] {
  folly::fibers::Baton b;
  b.try_wait_for(std::chrono::seconds(1));   // fiber만 yield
});

// 2. 너무 큰 stack
opts.stackSize = 16 * 1024 * 1024;   // 16MB
fm.addTask(...);   // 1만 개면 160GB

// 3. fiber 외부에서 await
folly::fibers::await(sf);   // fiber 안에서만 호출 가능 — assert 위반

// 4. shared mutable state without lock
int counter = 0;
fm.addTask([&] { ... counter++; ... });   // yield 지점에서 race
```

## 정리

- `folly::fibers`는 boost.context 기반 stackful coroutine으로 동기 스타일 비동기 코드를 가능하게 한다.
- `await`, `Baton`, `Channel`이 핵심 동기화 primitive다.
- context switch가 ~100ns로 thread보다 빠르지만 stack memory(기본 64KB)를 쓴다.
- C++20 coroutine은 stackless라 메모리 효율적이지만 컴파일러 변환과 디버깅 부담이 있다.
- 새 코드는 `folly::coro::Task`(C++20 coroutine) 검토 후 결정한다.
- fiber 안에서 thread-blocking 호출 금지. fiber-aware variant를 쓴다.

## 다음 편

Part 3에서 Executor를 본다. [Part 3-01: InlineExecutor](/blog/programming/code-review/folly/part3-01-inline-executor)에서 시작한다.

## 관련 항목

- [Folly Part 2-01 — Future 개요](/blog/programming/code-review/folly/part2-01-future-overview)
- [Folly Part 3-05 — EventBase](/blog/programming/code-review/folly/part3-05-event-base)
- [Folly Part 10-04 — fibers Channel](/blog/programming/code-review/folly/part10-04-fibers-channel)
