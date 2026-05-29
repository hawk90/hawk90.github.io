---
title: "Part 20-04: folly::CancellationToken — 코루틴/Future 취소 전파"
date: 2026-05-28T10:00:00
description: "CancellationSource/Token의 전파 모델 — coroutine·Future·callback 트리에서 협력적 취소."
series: "Folly Code Review"
seriesOrder: 86
tags: [cpp, folly, cancellation, coro, future]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `CancellationToken`은 코루틴·Future 트리에 *협력적 취소*를 전파한다. C++26 senders/receivers의 stop_token과 등가 모델로 Meta가 일찍 도입했다.

## 동기

긴 비동기 작업이 *외부 조건* (timeout, user cancel, parent failed)으로 멈춰야 할 때가 있다. callback-style code는 일반적으로 다음 둘 중 하나.

1. **boolean flag** — 작업 시작 전 매번 체크. 누락 시 무한 hang.
2. **exception** — 강제 unwind. 자원 leak/일관성 문제.

`CancellationToken`은 셋째 길이다. *명시적이고 합성 가능한 cancellation 신호*.

```cpp
folly::CancellationSource src;
auto token = src.getToken();

// 어딘가에서 cancel
src.requestCancellation();

// 토큰을 받은 쪽은 chunks마다 check 또는 await 자체가 cancel-aware
if (token.isCancellationRequested()) {
  return;
}
```

이 모델은 *cooperative*. cancel 요청은 신호일 뿐, 실제로 멈추는 건 작업이 *체크해서* 결정.

## API

```cpp
namespace folly {

class CancellationSource {
 public:
  CancellationSource();
  bool requestCancellation() noexcept;   // 한 번만 효력
  CancellationToken getToken() const noexcept;
};

class CancellationToken {
 public:
  bool isCancellationRequested() const noexcept;
  bool canBeCancelled() const noexcept;
  CancellationCallback addCallback(/* func */);   // cancel 시 호출
};

class CancellationCallback {
  // RAII — destructor에서 unregister
};

}
```

세 클래스가 한 세트.

- `CancellationSource` — 소유자. cancel을 *발행*.
- `CancellationToken` — 소비자. cancel 여부를 *조회*.
- `CancellationCallback` — token이 cancel될 때 호출되는 callback. RAII로 자동 unregister.

## Coroutine 통합

```cpp
folly::coro::Task<int> LongCompute(folly::CancellationToken ct) {
  for (int i = 0; i < 1000000; ++i) {
    if (i % 1000 == 0 && ct.isCancellationRequested()) {
      throw folly::OperationCancelled{};
    }
    // compute step
  }
  co_return 42;
}

folly::coro::Task<int> WithCancellation() {
  folly::CancellationSource src;
  
  std::thread([src]() mutable {
    std::this_thread::sleep_for(std::chrono::seconds(5));
    src.requestCancellation();
  }).detach();

  co_return co_await folly::coro::co_withCancellation(
    src.getToken(), LongCompute(src.getToken()));
}
```

`co_withCancellation`이 token을 *코루틴 frame*에 attach. cancel-aware awaitable은 자동으로 깨어남.

### co_current_cancellation_token

```cpp
folly::coro::Task<int> Helper() {
  auto token = co_await folly::coro::co_current_cancellation_token;
  if (token.isCancellationRequested()) {
    throw folly::OperationCancelled{};
  }
  // ...
}
```

코루틴은 *호출 트리에서* token을 상속한다. parent가 cancel되면 child도 cancel 신호를 받음.

## CancellationCallback — 동기적 cleanup

```cpp
folly::coro::Task<void> ReadWithCleanup(int fd) {
  auto token = co_await folly::coro::co_current_cancellation_token;
  
  folly::CancellationCallback cb{token, [fd]() {
    // cancel 시 호출 — fd close해서 read syscall 깨움
    ::shutdown(fd, SHUT_RDWR);
  }};

  // 이 read가 cancel signal을 직접 못 받음 (blocking)
  auto bytes = co_await asyncRead(fd, buf, len);
  co_return;
}
```

`CancellationCallback`이 token cancellation 시 *동기적으로 호출*된다. 이걸로 blocking syscall을 깨우는 트릭. socket shutdown, file close 같은 자리.

## 트리 전파

![CancellationToken tree propagation](/images/blog/folly/diagrams/part20-04-cancellation-propagation.svg)

```cpp
folly::CancellationSource root;
auto rootToken = root.getToken();

folly::coro::Task<void> Parent() {
  co_await folly::coro::co_withCancellation(
    rootToken,
    folly::coro::collectAll(
      ChildA(),   // 자동으로 rootToken 상속
      ChildB(),   // 자동으로 rootToken 상속
      ChildC()    // 자동으로 rootToken 상속
    ));
}
```

`co_withCancellation`이 한 번 attach하면 child Task들은 자동으로 *같은 token*을 본다. root가 cancel되면 셋 다 신호 받음. timer wheel, RPC fan-out 같은 패턴에 자연스럽다.

### MergeCancellationToken

```cpp
auto merged = folly::cancellation_token_merge(token1, token2);
// merged는 두 token 중 하나라도 cancel되면 cancel
```

여러 cancel 조건을 OR 합성. timeout + user cancel을 동시에 표현.

## 내부 구조

```cpp
// folly/CancellationToken.h 약식
class CancellationState {
  std::atomic<uint64_t> state_;   // bit 0 = cancel requested, 상위 bits = ref count
  std::list<CancellationCallback*> callbacks_;
  std::mutex mu_;
};

// CancellationSource owns + 1 ref, each Token + 1 ref
// state_ atomic CAS로 cancel 요청 atomic하게

bool CancellationSource::requestCancellation() {
  auto prev = state_->state_.fetch_or(kCancelBit);
  if (prev & kCancelBit) return false;   // 이미 cancel됨
  
  // callbacks 호출 (lock 보호)
  std::lock_guard lk(state_->mu_);
  for (auto* cb : state_->callbacks_) {
    cb->invoke();
  }
  return true;
}
```

핵심은 *한 번만* cancel 가능 (atomic test-and-set), 그 시점에 모든 callback이 sync 호출.

## std::stop_token (C++20)과의 비교

| 항목 | std::stop_token | folly::CancellationToken |
|------|-------------------|----------------------------|
| 도입 | C++20 | folly (수년 전) |
| Source/Token | stop_source / stop_token | CancellationSource / CancellationToken |
| Callback | stop_callback | CancellationCallback |
| Coroutine 통합 | 없음 (stdexec/P2300이 추가) | co_withCancellation |
| 표준 | std | folly |

C++20 `std::stop_token`은 `std::jthread`의 멤버로 도입. 모델은 거의 동일. 차이는 *코루틴 통합*. stdexec/P2300이 표준 sender/receiver에 통합 중.

`folly::CancellationToken`은 `std::stop_token`과 형식적 일치 — 표준이 따라잡으면 마이그레이션 가능.

## 코드 리뷰 포인트

- 긴 작업에 cancellation 체크 없음 → 외부 조건 변화 시 영원히 hang.
- `requestCancellation()` 후 작업이 즉시 멈추리라고 가정 → cooperative라 작업이 check할 때 멈춤.
- callback 안에서 무거운 작업 또는 lock 획득 → cancel 발행 thread를 block.
- token을 ref로 전달하는데 source가 먼저 소멸 → callback 호출 시점에 dangling 가능 (folly 구현은 shared state로 보호).
- nested cancellation — child가 자체 source를 만들면 root cancel이 child까지 전파 안 됨. 명시적 attach.

## 자주 보는 안티패턴

```cpp
// 1. cancellation 무시
folly::coro::Task<int> Naive() {
  for (int i = 0; i < 1e9; ++i) compute();   // cancel 체크 없음
  co_return 0;
}

// 2. callback이 무거운 작업
folly::CancellationCallback cb{token, [&] {
  ProcessHugeBuffer();   // cancel 발행 thread를 block
}};

// 3. token을 cancel-naive awaitable에 전달
co_await blockingRead(fd, buf, len);   // ct가 있지만 read는 무관

// 4. exception 던지지 않고 silent return
if (ct.isCancellationRequested()) {
  co_return -1;   // 호출자가 cancel인지 fail인지 모름
}
// → folly::OperationCancelled throw가 표준 패턴
```

## 실전 — RPC client timeout

```cpp
folly::coro::Task<Response> CallRpc(Request req, std::chrono::milliseconds timeout) {
  folly::CancellationSource src;
  
  // timer가 cancel 발행
  auto timer = std::thread([src, timeout]() mutable {
    std::this_thread::sleep_for(timeout);
    src.requestCancellation();
  });

  try {
    auto result = co_await folly::coro::co_withCancellation(
      src.getToken(), client_->send(std::move(req)));
    timer.detach();   // 정상 완료 — timer 무시
    co_return result;
  } catch (const folly::OperationCancelled&) {
    timer.detach();
    throw RpcTimeoutException{};
  }
}
```

timeout 자체가 cancellation으로 표현. RPC client가 cancel-aware하면 즉시 abort. 같은 패턴이 user-initiated cancel에도 그대로.

## 정리

- `CancellationToken`은 협력적 취소 신호 — 작업이 체크해야 멈춤.
- Source/Token/Callback 셋이 한 세트. RAII로 자동 cleanup.
- 코루틴 트리 전파 — `co_withCancellation` 한 번이면 자식 모두 상속.
- `std::stop_token` (C++20)과 형식 일치 — 표준이 따라잡는 중.
- timer, user cancel, parent failed 같은 다양한 cancellation 원인을 통일된 신호로.

## 다음 편

Part 21로 넘어가 실험적 핵심 (observer, fbcode 패턴 모음)을 본다.

## 관련 항목

- [Folly Part 15-02 — coro::Task](/blog/programming/code-review/folly/part15-02-coro-task)
- [Folly Part 15-04 — collectAll / blockingWait](/blog/programming/code-review/folly/part15-04-coro-blocking-wait)
- [원문 — folly/CancellationToken.h](https://github.com/facebook/folly/blob/main/folly/CancellationToken.h)
- [P2300 — std::execution stop_token](https://wg21.link/P2300)
