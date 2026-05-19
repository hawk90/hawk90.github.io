---
title: "Part 15-02: folly::coro::Task — lazy single-shot 코루틴"
date: 2026-05-27T07:00:00
description: "Task<T>의 lazy start, executor 바인딩, scheduleOn, 값/예외 전파 — production async의 기본 단위."
series: "Folly Code Review"
seriesOrder: 65
tags: [cpp, folly, coro, task, async]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `Task<T>`는 lazy하게 시작되고 executor에 schedule된 후에야 실행되는 single-shot 코루틴이다. 매 `co_await`마다 결과 또는 예외가 전파되고, 소비되지 않으면 영원히 실행되지 않는다.

## 동기

`folly::coro::Task<T>`는 가장 흔한 코루틴 타입이다. 비동기 함수의 *반환 타입*이고, 다른 `Task`를 `co_await`하면서 합성된다.

세 가지 결정이 Task의 정체성을 만든다.

1. **Lazy start** — 호출만으로는 실행되지 않는다. `co_await`되거나 `scheduleOn`으로 executor에 올라가야 시작한다.
2. **Executor 바인딩 필수** — 어디서 실행될지가 항상 명시적이다. "implicit 현재 thread"라는 함정이 없다.
3. **Single-shot** — 한 번 `co_await`하면 값을 가져가고 Task는 소진된다. shared ownership이 필요하면 `Future`로 변환해야 한다.

이 셋이 합쳐져 production async의 *예측 가능한 실행 모델*을 만든다.

## API

```cpp
#include <folly/coro/Task.h>
#include <folly/coro/BlockingWait.h>
#include <folly/executors/CPUThreadPoolExecutor.h>

folly::coro::Task<int> Add(int a, int b) {
  co_return a + b;
}

folly::coro::Task<int> Compose() {
  int x = co_await Add(1, 2);
  int y = co_await Add(x, 10);
  co_return y;
}

int main() {
  folly::CPUThreadPoolExecutor pool(4);
  int v = folly::coro::blockingWait(Compose().scheduleOn(&pool));
  // v == 13
}
```

세 가지 합쳐 보면 다음 패턴이 나온다.

- `co_return`은 `return` 자리에 그대로. `Task<void>`라면 인수 없이 `co_return;`.
- `co_await`은 다른 `Task` 또는 awaitable에 사용. 결과가 함수의 *반환값*처럼 추출된다.
- `scheduleOn(executor)`은 한 번만 — root에서. 자식 Task는 부모의 executor를 상속.

## scheduleOn vs co_await

```cpp
// 1. scheduleOn: SemiAwaitable로 만든다. blockingWait 또는 SemiFuture 변환에 사용.
auto sf = Compute().scheduleOn(&pool).start();  // start() → SemiFuture<int>

// 2. co_await: 부모 Task의 executor를 상속받아 실행
folly::coro::Task<int> Caller() {
  int v = co_await Compute();   // pool이 명시되지 않음 — 부모 따라감
  co_return v;
}
```

| 호출 형식 | 시작 시점 | executor 결정 |
|-----------|-----------|---------------|
| `Compute()` | 시작 안 함 | 미정 |
| `Compute().scheduleOn(e)` | 시작 안 함 (SemiAwaitable) | `e` 고정 |
| `co_await Compute()` | 즉시 시작 | 호출자 Task의 executor 상속 |
| `co_await Compute().scheduleOn(e)` | 즉시 시작 | `e` 사용 후 호출자로 복귀 |

마지막 패턴이 중요하다. `co_await Compute().scheduleOn(cpuPool)` 형태로 호출자 코루틴 한가운데서 *임시로* 다른 executor에 일을 던지고 결과를 가져온다.

## co_awaitTry — 예외 노출

```cpp
folly::coro::Task<int> RiskyCompute();

folly::coro::Task<int> Safe() {
  auto t = co_await folly::coro::co_awaitTry(RiskyCompute());
  if (t.hasException()) {
    LOG(ERROR) << "compute failed: " << t.exception().what();
    co_return -1;
  }
  co_return t.value();
}
```

`co_awaitTry`는 `Try<T>`를 반환한다. throw 대신 명시적 분기로 처리하고 싶을 때 쓴다. exception이 expected control flow면 이 형태가 비용이 작다(throw/catch 회피).

## void Task

```cpp
folly::coro::Task<void> Log(std::string msg) {
  co_await asyncWrite(msg);
  co_return;   // 또는 그냥 함수 끝
}
```

`Task<void>`도 일급. `collectAll`에서 void Task가 섞여도 결과 tuple에서 `Unit` placeholder로 들어간다.

## 내부 구조

![coro::Task state machine](/images/blog/folly/diagrams/part15-02-coro-task-states.svg)

### stackless suspend의 그림

state machine 안의 각 suspend point는 *frame에 진행 상황을 저장하고 caller에 돌아가는* 지점이다.

![Coroutine suspend / resume](/images/blog/cpp-concepts/diagrams/coroutine-suspend-resume.svg)

Task의 promise_type, awaiter, executor handle 등이 모두 이 frame 안에 산다 — 보통 수십에서 수백 바이트. 한 스레드가 수많은 in-flight Task를 표현할 수 있는 이유다.

```cpp
// folly/coro/Task.h 약식
template <class T>
class Task {
 public:
  using promise_type = TaskPromise<T>;
  // ...
};

template <class T>
class TaskPromise {
 public:
  Task<T> get_return_object() noexcept {
    return Task<T>{std::coroutine_handle<TaskPromise>::from_promise(*this)};
  }
  std::suspend_always initial_suspend() noexcept { return {}; }
  FinalAwaiter        final_suspend() noexcept   { return {}; }
  void                return_value(T value) noexcept {
    result_.emplace(std::move(value));
  }
  void unhandled_exception() noexcept {
    result_.emplaceException(std::current_exception());
  }

 private:
  folly::Try<T>                  result_;
  folly::Executor::KeepAlive<>   executor_;
  std::coroutine_handle<>        continuation_;
};
```

- `initial_suspend()`가 `suspend_always`라서 lazy.
- `FinalAwaiter`가 `continuation_`을 resume — 호출자 코루틴이 재개됨.
- `result_`가 `Try<T>`라 값/예외가 같은 슬롯에 저장된다.

```cpp
// awaiter — co_await Task<T>의 동작
struct TaskAwaiter {
  std::coroutine_handle<TaskPromise<T>> child_;

  bool await_ready() noexcept { return false; }

  auto await_suspend(std::coroutine_handle<> caller) noexcept {
    auto& childPromise = child_.promise();
    childPromise.continuation_ = caller;
    childPromise.executor_     = currentExecutor();   // 부모로부터 상속
    return child_;   // symmetric transfer — 즉시 child 실행
  }

  T await_resume() {
    auto& promise = child_.promise();
    if (promise.result_.hasException()) {
      promise.result_.exception().throw_exception();
    }
    return std::move(*promise.result_);
  }
};
```

핵심은 `await_suspend`가 `coroutine_handle`을 *반환*한다는 점이다. 이게 **symmetric transfer**다. 호출자의 stack frame을 그대로 두고 child로 점프 — `std::coroutine_handle::resume()`을 명시적으로 호출하지 않아 stack overflow를 회피한다.

## Symmetric transfer가 왜 중요한가

```cpp
folly::coro::Task<int> RecursiveSum(int n) {
  if (n == 0) co_return 0;
  int rest = co_await RecursiveSum(n - 1);
  co_return n + rest;
}

// n = 100,000도 OK
folly::coro::blockingWait(RecursiveSum(100000).scheduleOn(&pool));
```

`await_suspend`가 handle을 반환하면 컴파일러는 *tail call*로 바꿔 stack을 키우지 않는다. naive하게 `handle.resume()`을 호출했다면 매 단계마다 새 frame이 쌓여 overflow.

이 기법이 `folly::coro::Task`가 deeply nested call을 견딜 수 있는 이유.

## 사용 패턴 — 인자/캡처

```cpp
// Good — value capture
folly::coro::Task<int> Compute(std::string s) {
  co_await Delay(std::chrono::milliseconds(1));
  co_return std::stoi(s);
}

// Bad — reference 인자
folly::coro::Task<int> Compute(const std::string& s) {  // dangling 위험
  co_await Delay(std::chrono::milliseconds(1));
  co_return std::stoi(s);  // suspend 뒤에 s가 살아있을까?
}
```

코루틴은 suspend 동안 호출 스택이 사라진다. 인자가 reference면 원본이 살아있어야 하는데 호출자가 보장 안 한다. **인자는 value 또는 owning type**.

같은 이유로 lambda capture도 value가 기본.

```cpp
folly::coro::Task<int> MakeWork(std::string input) {
  co_return co_await [s = std::move(input)]() -> folly::coro::Task<int> {
    co_await Delay(std::chrono::milliseconds(1));
    co_return std::stoi(s);
  }();
}
```

## SemiFuture와의 상호변환

```cpp
// Task → SemiFuture
folly::SemiFuture<int> sf = std::move(task).scheduleOn(&pool).start();

// SemiFuture → Task
folly::coro::Task<int> t = folly::coro::toTask(std::move(sf));

// 또는 SemiFuture는 직접 co_await 가능
folly::coro::Task<int> Caller(folly::SemiFuture<int> sf) {
  int v = co_await std::move(sf);
  co_return v;
}
```

이 양방향성이 기존 Futures 코드와 코루틴 코드를 섞어 쓸 수 있게 한다. migration이 한꺼번에 일어나지 않는 현실에 맞춘 설계.

## std와의 비교

| 항목 | 표준 (없음) | folly::coro::Task | cppcoro::task |
|------|-------------|--------------------|---------------|
| Lazy start | N/A | 있음 | 있음 |
| Executor binding | N/A | 강제 | 없음 |
| Symmetric transfer | N/A | 사용 | 사용 |
| Try 통합 | N/A | `co_awaitTry` | 없음 |
| Future 변환 | N/A | `SemiFuture` 호환 | 없음 |

cppcoro::task와 표층 API는 비슷하지만 executor 강제와 Futures 통합이 차별점.

## 코드 리뷰 포인트

- `Task<T>` 함수가 호출만 되고 await/schedule이 없는 곳을 찾는다 — silent skip.
- `co_await`로 수정한 함수가 reference 인자를 받는지 — 인자는 value로.
- 라이브러리 함수가 `blockingWait`를 부르면 곤란하다. caller가 코루틴이면 deadlock.
- `Task<T>`의 멤버 함수 호출 결과(또는 rvalue chained)가 lambda 안에서 dangling 되지 않는지.

## 자주 보는 안티패턴

```cpp
// 1. Task 즉시 폐기
void Bad() {
  Compute();   // 무시됨 — 실행 안 됨
}

// 2. Task를 두 번 await
folly::coro::Task<int> Twice(folly::coro::Task<int> t) {
  int a = co_await std::move(t);
  int b = co_await std::move(t);  // already consumed — UB
  co_return a + b;
}

// 3. ScheduleOn 두 번
auto v = co_await Compute().scheduleOn(&p1).scheduleOn(&p2);  // p2가 이김 — 의도 불명
```

## 정리

- `Task<T>`는 lazy하고 single-shot이며 executor 바인딩이 명시적이다.
- `co_await`로 합성하고 `scheduleOn`으로 schedule 한다.
- `co_awaitTry`로 예외를 throw 없이 `Try<T>`로 받을 수 있다.
- 내부는 symmetric transfer로 깊은 nesting도 stack overflow 없이 처리.
- `SemiFuture`와 양방향 호환 — 점진적 migration에 맞다.

## 다음 편

[Part 15-03: AsyncGenerator](/blog/programming/code-review/folly/part15-03-coro-async-generator)에서 비동기 스트림을 표현하는 타입을 본다.

## 관련 항목

- [Folly Part 15-01 — coro 개요](/blog/programming/code-review/folly/part15-01-coro-overview)
- [Folly Part 15-04 — blockingWait / collectAll](/blog/programming/code-review/folly/part15-04-coro-blocking-wait)
- [Folly Part 2-03 — SemiFuture vs Future](/blog/programming/code-review/folly/part2-03-semi-future-vs-future)
- [원문 — folly/coro/Task.h](https://github.com/facebook/folly/blob/main/folly/coro/Task.h)
