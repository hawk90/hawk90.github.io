---
title: "Part 15-01: folly::coro 개요 — production C++20 코루틴 어댑터"
date: 2026-05-27T06:00:00
description: "folly::coro의 위치 — std 코루틴 위에 Task/AsyncGenerator/Mutex를 쌓아 production async를 가능하게 한 이유."
series: "Folly Code Review"
seriesOrder: 64
tags: [cpp, folly, coro, coroutines, async]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: C++20 코루틴은 언어 키워드만 표준이다. Task, awaiter, executor 통합, cancellation 같은 *실행 모델*은 라이브러리가 채워야 한다. `folly::coro`는 production code에서 그 빈자리를 가장 빨리 메운 구현이다.

## 동기

C++20이 도입한 것은 `co_await`, `co_yield`, `co_return` 세 키워드와 `coroutine_handle<>`, `promise_type` 컨셉 정도다. 정작 "코루틴으로 무엇을 표현할 것인가"는 표준에 없다.

```text
표준이 준 것              표준이 안 준 것
─────────────────         ──────────────────
co_await/yield/return     Task<T>
coroutine_handle<P>       Generator<T>
promise_type 컨셉         AsyncGenerator<T>
suspend_always/never      executor 바인딩
                          collectAll / when_all
                          cancellation 전파
                          coroutine-aware Mutex/Baton
                          blocking wait
```

결과적으로 같은 키워드로 cppcoro, folly::coro, stdexec, libunifex, asio::awaitable 등 *겹치지 않는* 라이브러리가 동시에 존재한다. Meta는 Folly Futures를 운영하다가 코루틴 도입 시점부터 자체 어댑터를 키웠다. 이게 `folly::coro`다.

## 위치 — 다른 라이브러리와의 비교

| 라이브러리 | 시작 시점 | 주력 도메인 | 상태 |
|------------|-----------|-------------|------|
| **cppcoro** | 2017, Lewis Baker | 학습/실험용 코루틴 toolkit | 유지보수 정체 |
| **libunifex** | 2019, Meta + community | sender/receiver의 reference impl | 활발하나 lower-level |
| **stdexec** | 2022, NVIDIA + community | C++26 P2300 후보 구현 | 표준 후보 |
| **asio::awaitable** | 2020, Chris Kohlhoff | networking + 코루틴 | 매우 안정 |
| **folly::coro** | 2019, Meta | Futures와 호환되는 production async | fbcode에서 매일 검증 |

`folly::coro`의 정체성은 **Futures 기반 기존 API와 단방향 ↔ 양방향 변환이 가능한 코루틴 어댑터**다. 새 코드는 `Task<T>`로 짜고, 기존 `SemiFuture<T>` 반환 함수도 그대로 `co_await` 할 수 있다.

```cpp
folly::coro::Task<std::string> Fetch(std::string url);
folly::SemiFuture<int>          LegacyParse(std::string body);

folly::coro::Task<int> Pipeline(std::string url) {
  auto body = co_await Fetch(url);          // Task
  int  n    = co_await LegacyParse(body);   // SemiFuture
  co_return n;
}
```

이 경계 호환성이 production migration에서 결정적이었다.

## 주요 타입

```text
folly::coro::Task<T>           — lazy single-shot, executor에 schedule
folly::coro::AsyncGenerator<T> — async stream (co_yield)
folly::coro::Generator<T>      — sync stream (co_yield) — 일반 코루틴 generator
folly::coro::Baton             — coroutine-aware 1-shot notification
folly::coro::Mutex             — coroutine-aware mutex
folly::coro::SharedMutex       — RW mutex
folly::coro::Semaphore         — counting semaphore
folly::coro::Promise<T>        — manual promise (Future의 Promise와 유사)
folly::coro::AsyncScope        — fire-and-forget 안전판
folly::coro::CancellationToken — 협력적 취소
```

각각은 다음 절들에서 개별로 다룬다.

## API 한눈에

```cpp
#include <folly/coro/Task.h>
#include <folly/coro/BlockingWait.h>
#include <folly/coro/Collect.h>
#include <folly/executors/CPUThreadPoolExecutor.h>

folly::coro::Task<int> Compute(int x) {
  // 다른 Task await
  int y = co_await Helper(x);
  co_return x * y;
}

folly::coro::Task<std::vector<int>> ParallelCompute() {
  auto [a, b, c] = co_await folly::coro::collectAll(
    Compute(1), Compute(2), Compute(3));
  co_return std::vector{a, b, c};
}

int main() {
  folly::CPUThreadPoolExecutor pool(4);
  auto result = folly::coro::blockingWait(
    ParallelCompute().scheduleOn(&pool));
  // result = [1, 2, 9]
}
```

세 가지 패턴이 보인다.

1. `Task<T>` 함수는 일반 함수처럼 정의한다. `co_return`이 일반 `return` 자리.
2. 다른 `Task`를 `co_await`해서 합성한다.
3. `collectAll`로 fan-out, `blockingWait`로 sync 경계 연결.

## 왜 Folly가 별도로 만들었나

C++20 도입 시점(2020)에는 다음이 *없었다*.

- 표준 `Task<T>` 타입.
- `executor`와 코루틴의 표준 통합.
- `senders/receivers` (P2300은 아직 후보).
- 표준 cancellation 모델.

Meta는 이미 수십만 곳에서 `folly::SemiFuture`를 쓰고 있었고, 코루틴이 callback 지옥을 해소할 가능성이 명백했다. 표준이 따라올 때까지 *기다리지 않고* 다음 결정을 했다.

1. `Task<T>`를 `SemiFuture<T>`와 변환 가능하게 설계 — migration 부담 최소화.
2. 모든 awaitable이 executor에 명시적으로 schedule 되도록 강제 — implicit "current thread" 회피.
3. `CancellationToken`을 매개로 cancellation을 코루틴 트리에 전파 — sender/receiver의 stop token과 형식적으로 동등.

결과적으로 stdexec/P2300이 표준으로 들어와도 `folly::coro` API는 크게 깨지지 않을 설계가 됐다. 두 모델이 sender adapter로 양방향 변환 가능하다.

## 작은 실전 — RPC pipeline

```cpp
folly::coro::Task<UserProfile> GetUserProfile(UserId id) {
  // 동시에 셋을 시작
  auto userTask    = userService_->getUser(id);
  auto prefsTask   = prefsService_->getPrefs(id);
  auto avatarTask  = avatarService_->getAvatar(id);

  auto [user, prefs, avatar] = co_await folly::coro::collectAll(
    std::move(userTask),
    std::move(prefsTask),
    std::move(avatarTask));

  co_return UserProfile{std::move(user), std::move(prefs), std::move(avatar)};
}
```

같은 패턴을 `folly::Future`로 짜면 `collect(...)` + `.thenValue([](auto&& tup) { ... })` + lambda capture가 줄줄이 따라온다. 코루틴은 *호출 구조와 데이터 흐름이 같은 모양*이라는 게 가장 큰 가독성 이득.

## suspend / resume 모델

C++ coroutine은 *stackless*다. 호출 스택을 쥐고 있지 않고, 필요한 상태만 heap frame에 저장하고 caller에 반환한다.

![Coroutine suspend / resume](/images/blog/cpp-concepts/diagrams/coroutine-suspend-resume.svg)

suspend 시점에 frame에 resume 주소와 locals를 저장하고 caller 스택은 즉시 풀린다. resume 시 frame을 다시 활성화 — 그래서 같은 스레드 보장이 없고, 따라서 *executor 바인딩*이 필수가 된다.

## 내부 구현 개념

```cpp
// folly/coro/Task.h 의 약식
template <class T>
class Task {
 public:
  class promise_type {
   public:
    Task<T> get_return_object() noexcept;
    suspend_always initial_suspend() noexcept;             // lazy start
    auto           final_suspend() noexcept;               // resume awaiter
    void           return_value(T v) noexcept;
    void           unhandled_exception() noexcept;

    // executor binding
    folly::Executor::KeepAlive<> executor_;

    // exception 보관
    folly::Try<T> result_;
  };

  // awaiter: co_await Task<T>의 동작
  auto operator co_await() && noexcept;
};
```

핵심 결정 두 가지.

- **lazy start**: `initial_suspend()`가 `suspend_always`다. `Task<int> t = Compute()`만으로는 실행이 시작되지 않는다. `co_await` 또는 `scheduleOn(executor)`이 trigger.
- **executor 강제**: top-level `Task`는 반드시 `scheduleOn(executor)` 또는 부모 `Task`의 executor로 실행된다. "어디서도 실행 안 됨" 상태를 컴파일 타임에 가깝게 막는다.

## std와의 비교

| 항목 | std (C++20) | folly::coro | stdexec |
|------|-------------|-------------|---------|
| Task 타입 | 없음 | `Task<T>` | `sender` |
| executor | 없음 | 명시 필수 | scheduler |
| cancellation | 없음 | `CancellationToken` | `stop_token` |
| AsyncGenerator | 없음 | 있음 | 별도 모델 |
| Mutex/Baton | 없음 | 있음 | 직접 짜야 |
| Futures 호환 | N/A | `SemiFuture` 양방향 | adapter 필요 |
| 표준 후보 | N/A | 아님 (Meta 내부 표준) | P2300 |

`folly::coro`는 표준이 되려는 야심이 없다. *지금 production에서 쓰는 도구*다.

## 코드 리뷰 포인트

- `Task`를 반환하는 함수가 호출자 손에서 `co_await`도 `scheduleOn`도 안 받으면 *영원히 실행되지 않는다*. compile-time 경고 없다. 리뷰에서 잡아야 한다.
- top-level entry point에서만 `blockingWait`. 라이브러리 내부에서 `blockingWait` 호출은 deadlock 원천이다.
- `co_await` 안에서 lambda capture가 reference면 코루틴 suspend 동안 dangling 가능성. value capture가 기본.
- `AsyncScope` 없이 `co_spawn`/`detached` 패턴을 흉내내면 종료 시 미완료 코루틴이 남는다.

## 자주 보는 안티패턴

```cpp
// 1. Task를 호출만 하고 await도 schedule도 안 함
void Caller() {
  Compute(1);   // 영원히 실행되지 않음
}

// 2. 라이브러리 함수 안에서 blockingWait
int Helper() {
  return folly::coro::blockingWait(SomeTask());  // 호출자가 이미 coro면 deadlock 위험
}

// 3. reference capture가 lambda 외부 수명보다 김
folly::coro::Task<int> Bad(int& x) {
  co_return co_await Helper(x);  // Bad() 반환 후 x가 dangling이면 끝
}
```

## 정리

- C++20 코루틴은 키워드만 표준이다. Task, executor, cancellation은 라이브러리 책임이다.
- `folly::coro`는 `SemiFuture`와의 양방향 호환을 유지하며 production async를 표현한다.
- 모든 `Task`는 lazy start이고 executor 바인딩이 필수다.
- 다음 절들에서 `Task`, `AsyncGenerator`, `blockingWait`, `Baton`/`Mutex`를 개별로 본다.
- stdexec/P2300이 표준화돼도 sender adapter로 변환 가능한 형태로 설계됐다.

## 다음 편

[Part 15-02: folly::coro::Task](/blog/programming/code-review/folly/part15-02-coro-task)에서 가장 자주 쓰는 타입을 본격적으로 본다.

## 관련 항목

- [Folly Part 2-01 — Future overview](/blog/programming/code-review/folly/part2-01-future-overview) — Futures 모델과의 비교 출발점
- [Folly Part 2-03 — SemiFuture vs Future](/blog/programming/code-review/folly/part2-03-semi-future-vs-future) — executor 바인딩의 의미
- [원문 — folly/coro](https://github.com/facebook/folly/tree/main/folly/coro)
- [P2300 — std::execution (senders/receivers)](https://wg21.link/P2300)
