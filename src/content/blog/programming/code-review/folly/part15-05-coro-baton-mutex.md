---
title: "folly::coro::Baton·Mutex — 코루틴-aware 동기화"
date: 2026-06-07T09:14:00
description: "coro::Baton과 coro::Mutex — thread를 block하지 않고 코루틴만 suspend하는 동기화 프리미티브."
series: "Folly Code Review"
seriesOrder: 68
tags: [cpp, folly, coro, baton, mutex]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `std::mutex`는 thread를 block한다. 코루틴 안에서 그러면 executor의 thread 한 칸을 통째로 잠근다. `folly::coro::Mutex`/`Baton`은 *코루틴만* suspend해 같은 thread가 다른 일을 한다.

## 동기

코루틴의 핵심 자원은 thread가 아니라 *frame*이다. thread는 executor pool에 소수만 있다(보통 CPU 코어 수). 코루틴 frame은 수십만 개 살 수 있다. 그런데 코루틴 안에서 `std::mutex::lock()`을 쓰면 thread가 block된다. *frame은 살아있는데 thread가 없는* 상황.

```cpp
// Bad
folly::coro::Task<void> Process(SharedData& d) {
  std::lock_guard lk(d.mu);   // ← thread block. pool 1/n 잠금.
  co_await asyncWrite(d.snapshot());
  d.update();
}
```

이 코드는 `co_await` 동안 thread가 자유로워지긴 한다. 그러나 `lock_guard`가 살아있는 동안 mutex를 점유하므로 다른 코루틴이 `lock()`을 시도하면 *thread가 block*된다. executor 4-thread pool에서 4개 코루틴이 lock 경합하면 모든 thread가 idle하지 못한다.

`coro::Mutex`는 lock 경합 시 코루틴만 suspend, thread는 다른 코루틴을 실행한다.

## coro::Baton

```cpp
#include <folly/coro/Baton.h>

folly::coro::Baton baton;

folly::coro::Task<void> Waiter() {
  co_await baton;        // suspend until post
  // do work
}

folly::coro::Task<void> Poster() {
  // ... compute ...
  baton.post();         // wake all waiters
}
```

`Baton`은 1-shot edge-triggered notification. `post()`가 한 번 호출되면 그 이후의 `co_await`은 즉시 통과. `reset()`으로 재사용 가능.

multi-waiter 가능:

```cpp
folly::coro::Baton ready;

auto t1 = []() -> folly::coro::Task<void> { co_await ready; /* ... */ }();
auto t2 = []() -> folly::coro::Task<void> { co_await ready; /* ... */ }();
auto t3 = []() -> folly::coro::Task<void> { co_await ready; /* ... */ }();

// ... 시간이 흐른 후
ready.post();   // 셋 다 동시에 깨어남
```

여러 코루틴이 같은 baton을 기다릴 수 있다. `post()` 시 모두 깨운다.

## coro::Mutex

```cpp
#include <folly/coro/Mutex.h>

folly::coro::Mutex mu;
int counter = 0;

folly::coro::Task<void> Increment() {
  auto lock = co_await mu.co_scoped_lock();
  // critical section — 다른 코루틴이 이 mu에 락 시도하면 suspend
  co_await asyncWork();
  ++counter;
  // lock 소멸자가 unlock
}
```

`co_scoped_lock()`은 awaitable. await 결과로 RAII lock guard 반환. critical section에서 다른 `co_await`도 가능하다 — *await 도중에도 lock은 유지*된다.

이게 std::mutex와 결정적으로 다른 점.

```cpp
// std::mutex와 std::async — lock 들고 async 안 됨
std::mutex m;
auto fut = std::async(std::launch::async, [&] {
  std::lock_guard lk(m);
  return otherAsync().get();   // block — thread 다시 잠김
});
```

coro::Mutex는 *코루틴 frame*에 lock 상태가 매여 있어 suspend 동안 thread가 다른 코루틴을 돌릴 수 있다.

## coro::SharedMutex

```cpp
folly::coro::SharedMutex mu;
Config cfg;

folly::coro::Task<Config> Read() {
  auto lk = co_await mu.co_scoped_lock_shared();
  co_return cfg;
}

folly::coro::Task<void> Write(Config c) {
  auto lk = co_await mu.co_scoped_lock();
  cfg = std::move(c);
}
```

reader/writer 분리. read가 많은 hot path에서 유리.

## coro::Semaphore

```cpp
folly::coro::Semaphore sem{4};   // 최대 4 동시

folly::coro::Task<void> BatchProcess(std::vector<Item> items) {
  std::vector<folly::coro::Task<void>> tasks;
  for (auto& item : items) {
    tasks.push_back([&, item]() -> folly::coro::Task<void> {
      auto guard = co_await sem.co_scoped_lock();
      co_await Process(item);
    }());
  }
  co_await folly::coro::collectAllRange(std::move(tasks));
}
```

동시 처리 수를 제한. backpressure pattern. 외부 API rate limit, DB connection pool 같은 자리에 자연스럽다.

## 내부 구조 — wait list

```cpp
// folly/coro/Mutex.h 약식
class Mutex {
 public:
  auto co_lock() noexcept {
    struct Awaiter {
      Mutex* mu;
      std::coroutine_handle<> handle_;
      Awaiter* next_ = nullptr;

      bool await_ready() noexcept {
        return mu->tryLock();
      }
      void await_suspend(std::coroutine_handle<> h) noexcept {
        handle_ = h;
        mu->addWaiter(this);   // atomic linked list 앞에 push
      }
      void await_resume() noexcept {}
    };
    return Awaiter{this};
  }

  void unlock() noexcept {
    auto* w = popWaiter();   // atomic pop
    if (w) {
      // resume on executor — current thread 또는 captured executor
      executor_->add([h = w->handle_] { h.resume(); });
    } else {
      locked_.store(false);
    }
  }
};
```

waiter들이 atomic linked list에 줄을 선다. `unlock()`이 한 명을 깨워 그의 코루틴을 *executor에 schedule*한다. 곧바로 그 자리에서 `resume`하면 stack이 깊어지므로 executor를 거치는 게 정석.

## std::mutex와의 비교

| 항목 | std::mutex | coro::Mutex |
|------|------------|---------------|
| 대기 시 | thread block | 코루틴 suspend |
| 재진입 | non-recursive | non-recursive |
| 조건 변수 | std::condition_variable 별도 | Baton/Channel 별도 |
| critical section 안 async | block 가능 (위험) | 자연스럽게 OK |
| sizeof | ~40 byte (glibc) | 보통 더 작음 (waiter list head만) |

`std::mutex`를 코루틴 안에서 *짧은* 동기 critical section에만 쓰는 건 OK. 그러나 critical section 안에서 `co_await`이 등장하면 무조건 `coro::Mutex`.

## fiber와의 관계

`folly::fibers::Baton`이 fibers 도메인의 짝이다.

| 도메인 | 동기화 | 어디서 suspend |
|--------|--------|---------------|
| std thread | std::mutex / condition_variable | OS scheduler |
| folly::fibers | fibers::Baton / fibers::TimedMutex | fiber scheduler |
| folly::coro | coro::Mutex / coro::Baton | executor |

세 시스템이 비슷한 API로 추상화를 통일하려는 흐름이 보인다.

## 코드 리뷰 포인트

- 코루틴 안 critical section에 `co_await`이 있는데 `std::mutex` 사용 → 즉시 `coro::Mutex`로 교체 대상.
- `Baton`을 multi-shot으로 쓰려고 함 → `reset()`이 필요하거나 `Channel` 고려.
- semaphore 슬롯이 lock guard 없이 `acquire/release` 분리 → 예외 시 leak. `co_scoped_lock` 사용.
- mutex가 hot path에 있고 read가 압도적이면 SharedMutex 검토.

## 자주 보는 안티패턴

```cpp
// 1. coro::Mutex 사용하지만 std::lock_guard와 혼용
folly::coro::Mutex mu;
{
  std::lock_guard lk(mu);   // 컴파일 에러 또는 wrong overload
  co_await ...;
}

// 2. Baton을 broadcast로 사용한 뒤 reset 잊음
baton.post();
// 다음 라운드 시작
co_await baton;   // 즉시 통과 — 의도와 다름

// 3. Semaphore acquire 후 await 도중 throw, release 안 됨
co_await sem.acquire();   // raw acquire
co_await mayThrow();      // 예외 → semaphore 영원히 점유
co_await sem.release();
// → co_scoped_lock으로 RAII 처리해야
```

## 정리

- 코루틴 안 동기화는 thread를 block하지 않는 *코루틴-aware* primitive가 필요하다.
- `coro::Baton`은 1-shot notification, multi-waiter 가능.
- `coro::Mutex`/`SharedMutex`/`Semaphore`는 std와 표층 API가 비슷하지만 suspend 의미론.
- critical section 안에서 `co_await`이 등장한다면 무조건 coro variant.
- waiter는 atomic linked list로 줄을 서고 unlock 시 executor를 거쳐 resume.

## 다음 편

Part 16에서 `Expected`/`Try` — error 표현의 두 갈래를 다룬다.

## 관련 항목

- [Folly Part 15-02 — Task](/blog/programming/code-review/folly/part15-02-coro-task)
- [Folly Part 9-03 — Baton (non-coro)](/blog/programming/code-review/folly/part9-03-baton)
- [Folly Part 9-01 — Synchronized](/blog/programming/code-review/folly/part9-01-synchronized) — std::mutex wrapper
- [원문 — folly/coro/Mutex.h](https://github.com/facebook/folly/blob/main/folly/coro/Mutex.h)
