---
title: "Part 3-01: InlineExecutor — 호출자 thread에서 즉시 실행"
date: 2026-05-23T13:00:00
description: "InlineExecutor는 add()의 caller thread에서 callback을 그 자리에서 실행한다. 테스트와 단축 경로에 적합하지만 production hot path에는 위험하다."
series: "Folly Code Review"
seriesOrder: 13
tags: [cpp, folly, executor, inline, async]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: `InlineExecutor`는 `add(fn)`을 *그 자리에서 호출*한다. 가장 단순한 Executor지만 동시에 가장 잘못 쓰이는 Executor다.

## 동기 — Executor가 *없는* Executor

`folly::Executor`는 추상 인터페이스다.

```cpp
class Executor {
 public:
  virtual void add(Func) = 0;
  virtual uint8_t getNumPriorities() const { return 1; }
};
```

이 인터페이스를 *가장 단순하게 구현*하면 다음과 같다.

```cpp
class InlineExecutor : public Executor {
 public:
  void add(Func f) override { f(); }
};
```

callback을 schedule하지 않고 *호출자 thread에서 그대로 실행*한다. 비동기성을 *없애는* Executor다.

### Executor 4가지 모델 비교

Inline은 4가지 흔한 executor 모델 중 *가장 단순한* 끝에 있다.

![Executor models compared](/images/blog/cpp-concepts/diagrams/executor-models.svg)

Inline → Queued (single worker) → Fixed pool → Work-stealing 순으로 동시성과 복잡도가 올라간다. Inline은 0 오버헤드지만 deadlock과 stack overflow 위험이 있고, work-stealing은 로드밸런싱이 좋지만 cross-thread 동기화 비용이 든다.

## 사용 사례

![Folly Executor types](/images/blog/folly/diagrams/part3-01-executor-types.svg)

### 1. 단위 테스트

```cpp
TEST(MyFuture, ChainExecution) {
  auto sf = compute()
    .deferValue([](int x) { return x + 1; })
    .deferValue([](int x) { return x * 2; });

  // 테스트 thread에서 모든 callback이 동기적으로 실행됨
  auto v = std::move(sf).via(&folly::InlineExecutor::instance()).get();
  EXPECT_EQ(v, 86);
}
```

테스트는 *결정적*이어야 한다. InlineExecutor는 callback이 *언제, 어디서* 실행되는지 보장하므로 race가 없다.

### 2. 이미 결정된 값의 단축 경로

```cpp
folly::SemiFuture<Cache> getCachedOr(int id) {
  if (auto c = cache.find(id)) {
    return folly::makeSemiFuture(*c);   // 동기 결과
  }
  return fetchAsync(id);
}

// caller
getCachedOr(id)
  .via(&folly::InlineExecutor::instance())   // cache hit이면 inline
  .thenValue([](Cache c) { return process(c); });
```

cache hit일 때 *thread switch 없이* 바로 처리한다. cache miss라면 `fetchAsync`가 적절한 executor를 내부적으로 사용한다.

### 3. SemiFuture를 강제로 *명시적으로* inline 실행

```cpp
auto v = computeSemi().via(&folly::InlineExecutor::instance()).get();
```

`.via(executor)`가 빠진 채 `.get()`을 부르면 *내부적으로* InlineExecutor가 쓰인다. 의도가 inline이면 명시적으로 적는 게 코드 리뷰에 좋다.

## 구현 — folly::InlineExecutor

```cpp
// folly/executors/InlineExecutor.h
namespace folly {

class InlineExecutor : public Executor {
 public:
  static InlineExecutor& instance() {
    static InlineExecutor x;
    return x;
  }

  void add(Func f) override {
    f();
  }
};

}  // namespace folly
```

코드가 10줄도 안 된다. singleton으로 노출되며 어디서든 `folly::InlineExecutor::instance()`로 접근한다.

## 변형 — InlineLikeExecutor / QueuedImmediateExecutor

```cpp
// folly/executors/QueuedImmediateExecutor.h
class QueuedImmediateExecutor : public Executor {
 public:
  void add(Func f) override {
    if (q_.empty()) {
      q_.push(std::move(f));
      while (!q_.empty()) {
        q_.front()();
        q_.pop();
      }
    } else {
      q_.push(std::move(f));
    }
  }
 private:
  static thread_local std::queue<Func> q_;
};
```

`QueuedImmediateExecutor`는 *재진입을 막는다*. callback A가 실행 중 callback B를 `add`하면 InlineExecutor는 B를 *A 중간에* 실행해 stack을 쌓는다. QueuedImmediateExecutor는 B를 큐에 넣어 A가 끝난 뒤 실행한다.

```cpp
// 위험 — InlineExecutor
folly::Promise<int> p;
folly::InlineExecutor::instance().add([&] {
  p.setValue(1);   // 또 다른 callback을 즉시 실행 — stack 깊어짐
});

// 안전 — QueuedImmediateExecutor
folly::QueuedImmediateExecutor::instance().add([&] {
  p.setValue(1);   // queue에 들어가서 현재 callback 끝난 뒤 실행
});
```

긴 Future 체인에서는 QueuedImmediateExecutor가 *stack overflow*를 막는다.

## 위험 — 잘못 쓰일 때

### 1. 의도 없이 사용 (가장 흔함)

```cpp
auto v = computeSemi().get();   // 내부적으로 InlineExecutor
```

`compute()`가 *어디서 도는지* 코드에서 보이지 않는다. 어떤 thread의 어떤 lambda 안인지 추적 불가.

### 2. Stack overflow

```cpp
folly::Future<int> f = ...;
for (int i = 0; i < 100'000; ++i) {
  f = std::move(f).via(&folly::InlineExecutor::instance())
                   .thenValue([](int x) { return x + 1; });
}
f.get();   // stack overflow 가능
```

각 thenValue가 즉시 다음 thenValue를 호출하므로 callback이 nested된다. 1만~10만 단위에서 stack 한계를 넘는다. QueuedImmediateExecutor가 해결책이다.

### 3. Latency hiding

```cpp
folly::SemiFuture<Result> handleRequest(Request req) {
  return validate(req)
    .via(&folly::InlineExecutor::instance())   // bad
    .thenValue([](auto r) { return process(r); });
}
```

caller가 RPC handler thread에서 `handleRequest`를 부르면 *모든 callback이 그 thread에서* 실행된다. 다른 요청이 starve된다.

## 코드 리뷰 포인트

- **`.via(&InlineExecutor::instance())` 또는 `.get()` 직접 호출에 이유가 있는가?** 없으면 적절한 executor로 바꾼다.
- **Future 체인이 깊은가?** InlineExecutor 대신 QueuedImmediateExecutor를 고려한다.
- **테스트에서만 InlineExecutor를 쓰는가?** production code path와 분리한다.
- **SemiFuture가 항상 즉시 완료되는가?** 그렇다면 InlineExecutor가 안전하다.

## 자주 보는 안티패턴

```cpp
// 1. production hot path에서 .get() 호출
folly::SemiFuture<R> handleRpc(Req r) {
  auto v = doInternal(r).get();   // RPC thread block
  return processFurther(v);
}

// 2. 긴 체인을 InlineExecutor로
auto f = base;
for (auto& step : steps) {
  f = std::move(f).via(&inline).thenValue(step);   // stack 폭발 위험
}

// 3. shared executor를 쓰지 않는 이유로 InlineExecutor
// 그냥 적절한 thread pool을 만들어라

// 4. InlineExecutor를 명시 없이 사용
sf.thenValue(...)   // SemiFuture에는 .thenValue 없음 — 컴파일 에러
sf.via(...).thenValue(...)   // executor 명시
```

## std::execution과 비교

P2300의 `std::execution::inline_scheduler`(가칭)도 같은 의미다. 호출자 thread에서 즉시 실행한다. 사용 가이드라인도 비슷할 것이다.

## 정리

- `InlineExecutor`는 callback을 caller thread에서 즉시 실행하는 가장 단순한 Executor다.
- 테스트, 단축 경로, 명시적 inline 표현에 적합하다.
- 의도 없이 사용하면 *어디서 callback이 도는지* 추적이 불가능하다.
- 긴 체인에서는 stack overflow 위험이 있다. QueuedImmediateExecutor를 사용한다.
- production handler에서는 거의 항상 *부적합*하다.
- `.via(InlineExecutor)`는 *항상 의도를 적은* 흔적이어야 한다.

## 다음 편

[Part 3-02: CPUThreadPoolExecutor](/blog/programming/code-review/folly/part3-02-cpu-thread-pool-executor)에서 CPU-bound 작업을 위한 thread pool을 본다.

## 관련 항목

- [Folly Part 2-03 — SemiFuture vs Future](/blog/programming/code-review/folly/part2-03-semi-future-vs-future)
- [Folly Part 3-04 — ManualExecutor](/blog/programming/code-review/folly/part3-04-manual-executor) — 결정적 테스트의 또 다른 길
- [Folly Part 3-02 — CPUThreadPoolExecutor](/blog/programming/code-review/folly/part3-02-cpu-thread-pool-executor)
