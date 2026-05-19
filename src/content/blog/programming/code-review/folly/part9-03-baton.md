---
title: "Part 9-03: Baton (one-shot wait)"
date: 2026-05-24T19:00:00
description: "folly::Baton — 한 번 post, 한 번 wait의 경량 signal primitive. condition variable보다 가볍다."
series: "Folly Code Review"
seriesOrder: 42
tags: [cpp, folly, sync, baton, futex]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::Baton<>`은 *한 번 post → 한 번 wait*의 one-shot 동기화 primitive. mutex와 condition_variable 없이 4-byte 상태로 thread간 signal을 전달한다. Future/Promise의 핵심 building block.

## 동기

다음 같은 패턴은 condition_variable로 흔히 작성한다.

```cpp
std::mutex mu;
std::condition_variable cv;
bool ready = false;

// thread A
void wait_for_ready() {
  std::unique_lock g(mu);
  cv.wait(g, []{ return ready; });
}

// thread B
void signal_ready() {
  { std::lock_guard g(mu); ready = true; }
  cv.notify_all();
}
```

`mutex + bool + cv` 세 개를 들고 다녀야 한다. 의도는 *signal 한 번*인데 코드는 그것보다 일반적인 도구.

`Baton`은 이 패턴 전용. 한 번 발사하는 사격 신호.

```cpp
folly::Baton<> b;

// thread A
b.wait();         // post 될 때까지 sleep

// thread B
b.post();         // wake
```

## API & 사용법

```cpp
#include <folly/synchronization/Baton.h>

// 1. 기본 — single post, multiple-wait OK (n번째 wait도 즉시 통과)
folly::Baton<> b;
b.wait();                   // post 전까지 block
b.post();                   // wake all (보통 하나)

// 2. 타임아웃
if (b.try_wait_for(std::chrono::seconds(1))) {
  // posted
} else {
  // timeout
}

// 3. try_wait — non-blocking
if (b.try_wait()) { /* 이미 posted */ }

// 4. 재사용 — reset
b.reset();
// 그 후 wait/post 다시 가능

// 5. blocking mode template param
folly::Baton<true>  spin_baton;   // spin 한 후 futex (기본)
folly::Baton<false> futex_only;   // spin 없이 바로 sleep
```

`folly::Baton`은 default가 *spin-then-futex* hybrid. 짧은 wait는 spin, 길면 sleep.

## 내부 구현

```cpp
// 약식 — folly/synchronization/Baton.h
template <bool MayBlock = true>
class Baton {
  std::atomic<uint32_t> state_;
  // state values:
  //   INIT     = 0
  //   WAITING  = 1
  //   EARLY_DELIVERY = 2 (post가 wait 전에 옴)
  //   TIMED_OUT = 3
};
```

4-byte. 추가 mutex/cv 없음.

### post

```cpp
// 약식
void post() {
  uint32_t prev = state_.exchange(EARLY_DELIVERY,
                                   std::memory_order_release);
  if (prev == WAITING) {
    // 누가 sleep 중
    futex_wake_one(&state_);
  }
}
```

CAS 없이 `exchange` 한 번. WAITING이면 wake.

### wait

```cpp
// 약식
void wait() {
  // 1. spin 시도
  for (int spin = 0; spin < kMaxSpins; ++spin) {
    uint32_t s = state_.load(std::memory_order_acquire);
    if (s == EARLY_DELIVERY) return;
    cpu_pause();
  }
  // 2. WAITING으로 표시 후 futex sleep
  uint32_t expected = INIT;
  if (state_.compare_exchange_strong(expected, WAITING,
                                      std::memory_order_acquire)) {
    while (state_.load() == WAITING) {
      futex_wait(&state_, WAITING);
    }
  }
  // 그 외 EARLY_DELIVERY 였음 — 즉시 반환
}
```

spin → CAS WAITING → futex_wait. linux의 `futex(FUTEX_WAIT)`가 state가 더 이상 WAITING이 아니면 즉시 반환.

### 왜 condition_variable보다 빠른가

cv는 보통 `mutex.lock() → predicate 확인 → wait → predicate 확인` 사이클. Baton은:

```text
Baton:
  state load (acquire) → spin → CAS → futex_wait
  state exchange (release) → futex_wake

cv:
  mutex.lock → predicate → mutex.unlock → futex_wait
  mutex.lock → state change → mutex.unlock → futex_wake_all → cv_mu.lock
```

cv는 *mutex 두 개* (사용자 mutex + cv 내부)를 잡았다 놓는다. Baton은 0개. 따라서 cv보다 3-5배 빠른 시그널.

### release/acquire가 보장하는 것

Baton의 `state.store(POSTED, release)` + `state.load(acquire)`가 mutex 없이 publish-subscribe를 안전하게 만드는 이유.

![Happens-before via release/acquire](/images/blog/cpp-concepts/diagrams/memory-ordering-happens-before.svg)

release store 이전의 모든 쓰기가 acquire load 이후의 모든 읽기에 visible. poster가 채워 놓은 데이터를 waiter가 그대로 읽을 수 있다. 이게 lock-free 자료구조의 토대다.

## 사용 사례

### 1. Future/Promise 내부

```cpp
// 약식 — folly::Future가 내부적으로
struct State {
  folly::Baton<> baton;
  std::optional<T> value;
};

void Promise::setValue(T v) {
  state_->value = std::move(v);
  state_->baton.post();
}

T Future::get() {
  state_->baton.wait();
  return std::move(*state_->value);
}
```

Future가 wait/post의 깊은 곳에 Baton.

### 2. Worker thread startup signal

```cpp
folly::Baton<> ready;
std::thread worker([&]() {
  Setup();
  ready.post();    // ready
  RunLoop();
});

ready.wait();      // setup 끝까지 대기
StartUsingWorker();
```

### 3. Test에서 lifecycle 동기

```cpp
TEST(MyTest, AsyncCallback) {
  folly::Baton<> done;
  service.DoAsync([&]() { done.post(); });
  ASSERT_TRUE(done.try_wait_for(std::chrono::seconds(5)));
}
```

cv보다 코드가 짧다.

## std/abseil 비교

```cpp
// std — cv 풀세트
std::condition_variable cv;
std::mutex mu;
bool flag = false;
void wait() { std::unique_lock g(mu); cv.wait(g, []{ return flag; }); }

// abseil — Notification
absl::Notification n;
n.WaitForNotification();
n.Notify();   // 한 번만 가능

// folly
folly::Baton<> b;
b.wait();
b.post();     // 여러 번 호출 가능, 추가 post는 no-op
```

| 항목 | std::cv + mutex | absl::Notification | folly::Baton |
|------|------------------|---------------------|---------------|
| Use case | general | one-shot | one-shot |
| sizeof | 80+ byte | ~16 byte | 4 byte |
| Spurious wakeup | 가능 | 없음 | 없음 |
| Reset | N/A | X | O |
| Multiple post | N/A | 한 번만 (assert) | 무해 |

abseil `Notification`이 가장 가깝다. 둘 다 한 번 signal 의미. folly가 약간 더 작고 reset 가능.

## 코드 리뷰 포인트

```cpp
// Bad — Baton을 반복 사용 (reset 없이)
folly::Baton<> b;
for (int i = 0; i < N; ++i) {
  worker.Submit([&]{ ... b.post(); });
  b.wait();
  // 두 번째부터는 EARLY_DELIVERY 라 즉시 통과 → race!
}

// Good — 매번 reset
for (int i = 0; i < N; ++i) {
  b.reset();
  worker.Submit([&]{ ... b.post(); });
  b.wait();
}
```

post는 idempotent하나 wait는 state를 한번만 본다. 반복은 reset 필수.

```cpp
// Good — timeout으로 deadlock 검출
if (!b.try_wait_for(std::chrono::seconds(30))) {
  LOG(ERROR) << "deadlock?";
}
```

production에서 영원 wait는 위험. 합리적 timeout.

```cpp
// 주의 — Baton이 stack object일 때 lifetime
{
  folly::Baton<> b;
  worker.Submit([&b]{ b.post(); });
  b.wait();
}   // worker가 아직 b를 본다면? — wait 후 destruct이므로 OK
```

wait 반환 = post가 이미 일어남. wait return 후 baton destruct 안전.

## 안티패턴

- **Baton을 cv 대체로 일반 signal에 사용**: Baton은 *한 번* 의미. 반복 신호는 cv 또는 semaphore.
- **post 후 reset 없이 wait 재호출**: 즉시 통과 → 동기화 실패. reset 필수.
- **wait 안에서 다른 lock 잡기**: Baton wait는 spin → futex로 lock-free path. 다른 lock 잡으면 inversion 위험. wait는 단순히 signal 대기로만.

## 정리

- `folly::Baton<>`은 4-byte one-shot signal primitive.
- spin → futex hybrid로 짧은 wait는 spin, 길면 sleep.
- cv보다 3-5배 빠름. Future/Promise 내부의 building block.
- `try_wait_for`로 timeout, `reset()`으로 재사용.
- 반복 신호는 cv 또는 semaphore.

## 다음 편

`RWSpinLock`은 매우 짧은 critical section 용 spin-only RW lock. SharedMutex보다 가벼우나 longer wait에 부적합.

## 관련 항목

- [Part 9-02: SharedMutex](/blog/programming/code-review/folly/part9-02-shared-mutex) — 일반 RW lock
- [Part 2-02: Promise / makeFuture](/blog/programming/code-review/folly/part2-02-promise-make-future) — Baton의 main client
- [Part 9-04: RWSpinLock](/blog/programming/code-review/folly/part9-04-rw-spin-lock) — spin-only variant
- [원문 — folly/synchronization/Baton.h](https://github.com/facebook/folly/blob/main/folly/synchronization/Baton.h)
