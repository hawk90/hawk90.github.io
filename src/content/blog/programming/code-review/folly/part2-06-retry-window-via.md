---
title: "Part 2-06: retry / window / via — 제어 흐름 조합자"
date: 2026-05-23T11:00:00
description: "Future 조립의 제어 흐름 — 재시도, 동시성 윈도, executor 전환."
series: "Folly Code Review"
seriesOrder: 11
tags: [cpp, folly, future, retry, control]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: `retry`는 실패 시 재시도, `window`는 동시성 제한, `via`는 executor 전환이다. 이 세 조합자가 Future 코드의 *제어 흐름*을 표현한다.

## 동기 — 단순 체인을 넘는 제어

`.thenValue`와 `collect`만으로는 표현되지 않는 패턴이 있다.

- "실패하면 *최대 3번* 재시도하고, 매번 *2배 backoff*"
- "1000개 요청을 *동시에 100개씩만* 처리"
- "I/O 작업은 IO pool에서, *결과 처리는 다른 CPU pool*에서"

이 패턴들은 retry/window/via 세 조합자로 표현된다.

## retry — 재시도 정책

```cpp
#include <folly/futures/Retrying.h>

// 즉시 재시도, 최대 3회
auto sf = folly::futures::retrying(
    folly::futures::retryingPolicyBasic(3),
    [](size_t attempt) {
      LOG(INFO) << "attempt " << attempt;
      return doRpc();   // SemiFuture<Response>
    });

// jittered exponential backoff
auto sf2 = folly::futures::retrying(
    folly::futures::retryingPolicyCappedJitteredExponentialBackoff(
        5,                                  // 최대 5회
        std::chrono::milliseconds(100),     // base delay
        std::chrono::seconds(10),           // max delay
        0.1,                                 // jitter ratio
        rng,
        [](size_t /*attempt*/, exception_wrapper const& ew) {
          // shouldRetry — 특정 예외만 재시도
          return !ew.is_compatible_with<NonRetryableError>();
        }),
    [](size_t attempt) {
      return doRpc();
    });
```

policy는 `(attempt, exception_wrapper) -> SemiFuture<bool>`로 *재시도할지*를 결정한다. true면 delay 후 다시 호출한다.

```cpp
// folly/futures/Retrying.h (개념)
template <class Policy, class FF>
SemiFuture<R> retrying(Policy policy, FF func) {
  return func(0).thenTry([=, p = std::move(policy)](Try<R> t) -> SemiFuture<R> {
    if (t.hasValue()) return makeSemiFuture(*std::move(t));
    return p(0, t.exception()).thenValue([](bool retry) {
      if (!retry) throw t.exception();
      return retrying(p, func);   // recursion
    });
  });
}
```

내부는 recursive로 구현되지만 *tail call로 펼쳐지므로* 스택이 쌓이지 않는다(Future continuation은 heap에 살아 있음).

### 자주 쓰는 policy

| Policy | 설명 |
|--------|------|
| `retryingPolicyBasic(n)` | 즉시 재시도 n회 |
| `retryingPolicyCappedJitteredExponentialBackoff` | exponential + jitter |
| `retryingPolicyCappedExponentialBackoff` | exponential 만 |
| 사용자 정의 | `(attempt, ew) -> SemiFuture<bool>` |

## window — 동시성 제한

```cpp
#include <folly/futures/Future.h>

std::vector<std::string> urls = ...;  // 10,000개

// 동시에 100개씩만
auto sf = folly::window(
    std::move(urls),
    [](std::string url) -> SemiFuture<Response> {
      return fetchAsync(url);
    },
    100);   // window size

// sf: SemiFuture<vector<Try<Response>>>
sf.via(&pool).thenValue([](auto results) {
  process(results);
});
```

`window`는 *cardinality와 메모리 폭발*을 막는다. 10,000 RPC를 한 번에 띄우면 file descriptor가 부족하거나 다운스트림이 throttle한다. window=100이면 100개씩 진행하다 하나 끝날 때마다 다음 하나를 시작한다.

```cpp
// folly/futures/Future-inl.h (개념)
template <class Range, class F>
SemiFuture<vector<Try<R>>> window(Range input, F func, size_t cap) {
  auto ctx = std::make_shared<WindowContext>(input.size());
  for (size_t i = 0; i < cap && i < input.size(); ++i) {
    spawn(ctx, input, func, i);   // 첫 cap개 시작
  }
  return ctx->promise.getSemiFuture();
}

void spawn(ctx, input, func, idx) {
  func(input[idx]).setCallback_([=](Try<R> t) {
    ctx->results[idx] = std::move(t);
    size_t next = ctx->nextIdx.fetch_add(1);
    if (next < input.size()) spawn(ctx, input, func, next);
    if (ctx->remaining.fetch_sub(1) == 1) ctx->promise.setValue(...);
  });
}
```

## via — executor 전환

```cpp
folly::IOThreadPoolExecutor io(2);
folly::CPUThreadPoolExecutor cpu(8);

fetchAsync(url)
  .via(&cpu)                   // 받은 body를 CPU pool에서 parse
  .thenValue(parse)
  .via(&io)                    // 결과를 IO pool에서 write
  .thenValue(writeFile)
  .get();
```

`.via(executor)`는 *그 이후 continuation*이 도는 executor를 바꾼다. I/O와 CPU 작업을 다른 thread pool에 분리할 때 핵심이다.

`SemiFuture<T>::via(Executor*)`는 SemiFuture를 Future로 *바인딩*하지만, `Future<T>::via(Executor*)`는 *재바인딩*한다.

```cpp
// folly/futures/Future.h
template <class T>
Future<T> Future<T>::via(Executor::KeepAlive<> e) && {
  auto sf = std::move(*this).semi();   // 먼저 SemiFuture로
  return std::move(sf).via(std::move(e));
}
```

## within — timeout

```cpp
fetchAsync(url)
  .within(std::chrono::seconds(5))   // 5초 안에 안 끝나면 timeout
  .thenError(folly::tag_t<folly::FutureTimeout>{}, [](auto&) {
    return Response::timeout();
  });
```

내부적으로 timer thread를 사용해 *지정 시간 후 cancellation*을 트리거한다. 원래 작업은 계속 돌 수도 있지만 결과는 무시된다.

`onTimeout`은 비슷하지만 *기본값을 직접 반환*하는 변형이다.

```cpp
fetchAsync(url).onTimeout(std::chrono::seconds(5), [] {
  return Response::cached();
});
```

## 조합 예 — retry + window + via

```cpp
// 1000개 URL을 동시 50개씩, 각각 최대 3회 재시도, CPU pool에서 처리

folly::window(
    std::move(urls),
    [](std::string url) {
      return folly::futures::retrying(
          folly::futures::retryingPolicyBasic(3),
          [url](size_t) { return fetchAsync(url); });
    },
    50)
  .via(&cpu)
  .thenValue([](std::vector<Try<Response>> results) {
    size_t ok = 0;
    for (auto& r : results) if (r.hasValue()) ++ok;
    LOG(INFO) << "ok=" << ok;
  });
```

선언적 표현으로 *동시성 + 재시도 + executor*가 모두 한 화면에 들어온다.

## std/Abseil과 비교

표준에는 없다. Abseil도 없다. Folly의 retry/window/via는 *고유한* 영역이다.

C++26 senders/receivers (P2300) 에서는 `let_value`/`bulk`/`schedule` 조합으로 표현된다.

```text
Folly                   std::execution
─────────────────       ─────────────────
.via(e)                 on(scheduler, sender)
window(range, f, n)     bulk(range, f) + scheduler
retry(policy, f)        let_error(sender, retry_logic)
within(d)               stop_when(sender, timer(d))
```

## 코드 리뷰 포인트

- **retry policy가 *모든* 예외에 적용되는가?** non-retryable error를 분류하지 않으면 무한 재시도 위험.
- **window cap이 합리적인가?** 다운스트림 capacity와 일치하는지 확인.
- **via 후 다음 thenValue가 어느 executor에서 도는지 명확한가?** 마지막 `.via`가 우세하다.
- **within 후 timeout 처리가 있는가?** `.thenError<FutureTimeout>` 또는 `.onTimeout` 사용.

## 자주 보는 안티패턴

```cpp
// 1. retry policy 없음 — 무한 재시도
folly::futures::retrying([](size_t) { return doRpc(); });   // 컴파일 OK지만 위험

// 2. window cap이 너무 큼
folly::window(million_urls, fetch, 1'000'000);   // window 의미 없음 — collect와 동일

// 3. via를 한 번도 안 부르고 thenValue 체인
computeSemi().deferValue(...).deferValue(...).get();
// 내부적으로 InlineExecutor — caller thread에서 dom

// 4. within timeout이 실제 작업보다 짧음 (의도된 게 아니라면)
fetchAsync(slowUrl).within(std::chrono::milliseconds(1)).get();
// 거의 항상 timeout
```

## 정리

- `retry`는 정책에 따라 실패 재시도, `window`는 동시성 cap, `via`는 executor 전환이다.
- `within`/`onTimeout`은 작업에 시한을 건다.
- retry policy는 *재시도 여부*를 동적으로 결정한다. non-retryable error 분류 필수.
- 세 조합자는 *선언적으로* 결합되어 복잡한 워크플로를 한 화면에 표현한다.
- C++26 senders/receivers에서 `bulk`/`let_error`/`stop_when`으로 대응된다.

## 다음 편

[Part 2-07: fibers (M:N coroutine)](/blog/programming/code-review/folly/part2-07-fibers)에서 stackful coroutine 모델을 본다.

## 관련 항목

- [Folly Part 2-05 — collect](/blog/programming/code-review/folly/part2-05-collect)
- [Folly Part 3-02 — CPUThreadPoolExecutor](/blog/programming/code-review/folly/part3-02-cpu-thread-pool-executor)
- [Folly Part 3-03 — IOThreadPoolExecutor](/blog/programming/code-review/folly/part3-03-io-thread-pool-executor)
