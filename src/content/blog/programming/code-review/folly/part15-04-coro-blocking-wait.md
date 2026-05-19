---
title: "Part 15-04: blockingWait / collectAll — 동기 경계와 fan-in"
date: 2026-05-27T09:00:00
description: "blockingWait, collectAll, collectAllRange — sync 경계 연결과 병렬 합성, deadlock 회피 규칙."
series: "Folly Code Review"
seriesOrder: 67
tags: [cpp, folly, coro, blockingwait, collect]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `blockingWait`는 코루틴 세계와 동기 세계의 *유일한 합법적 경계*다. `collectAll`/`collectAllRange`는 여러 Task를 fan-out + join 한다. 둘을 잘못 섞으면 deadlock이 정해진 일.

## 동기 — 왜 별도 도구가 필요한가

코루틴은 *비동기 합성*에 강하다. 그러나 두 경계가 있다.

1. **main() 진입점** — `main`은 코루틴이 아니다. 어딘가에서 sync로 결과를 기다려야 한다.
2. **legacy 동기 API와의 통합** — `std::vector<int> foo()`처럼 sync 시그니처가 코루틴 결과를 호출하려면.

`blockingWait`가 이 두 자리를 채운다. 한편 production async의 진짜 가치는 *병렬 합성*에서 나온다. `collectAll`/`collectAllRange`가 그 도구.

## blockingWait

```cpp
#include <folly/coro/BlockingWait.h>
#include <folly/coro/Task.h>

folly::coro::Task<int> Compute();

int main() {
  folly::CPUThreadPoolExecutor pool(4);
  int v = folly::coro::blockingWait(Compute().scheduleOn(&pool));
  std::cout << v << "\n";
}
```

`blockingWait`는 현재 thread를 *block*하고 코루틴이 완료될 때까지 기다린다. 호출 thread 자체는 다른 코루틴을 실행하지 않으므로 *executor가 코루틴을 진행시킨다*는 사실이 중요하다.

```cpp
// Bad
int Caller() {
  return folly::coro::blockingWait(Compute());   // executor 없음 → 영원히 대기
}
```

`Task`를 `scheduleOn(executor)`로 묶지 않으면 lazy start가 풀리지 않는다. blocking thread 혼자서는 코루틴을 깨우지 못한다.

### Deadlock 피하기

```cpp
// Deadlock 1: 단일 thread pool + blockingWait가 그 pool에서 호출
folly::CPUThreadPoolExecutor pool(1);
folly::coro::Task<int> Inner() { co_return 1; }

folly::coro::Task<int> Outer() {
  // Outer가 pool의 유일한 thread에서 실행 중
  return folly::coro::blockingWait(Inner().scheduleOn(&pool));
  //                                      ↑ Inner도 같은 pool인데 thread 1개라 schedule 불가
}
```

**규칙**: `blockingWait`는 *코루틴/executor 외부*에서만 안전하다. main(), test fixture, sync API boundary.

```cpp
// OK
int main() {
  folly::CPUThreadPoolExecutor pool(4);
  folly::coro::blockingWait(MyApp().scheduleOn(&pool));
}

// Risk
folly::coro::Task<int> Library() {
  return folly::coro::blockingWait(Helper());   // pool 고갈 시 deadlock
}
```

## collectAll — 정해진 수의 fan-out

```cpp
#include <folly/coro/Collect.h>

folly::coro::Task<std::tuple<int, std::string, double>> ParallelFetch() {
  auto [a, b, c] = co_await folly::coro::collectAll(
    FetchInt(),
    FetchString(),
    FetchDouble());
  co_return std::make_tuple(a, b, c);
}
```

`collectAll(t1, t2, t3, ...)`은 모든 Task를 동시에 시작하고 *전부* 완료되면 결과 tuple로 반환한다. 어느 하나라도 실패하면 첫 예외가 throw, 나머지는 폐기.

### collectAllRange — 동적 수

```cpp
folly::coro::Task<std::vector<int>> ProcessAll(std::vector<int> ids) {
  std::vector<folly::coro::Task<int>> tasks;
  for (int id : ids) tasks.push_back(ProcessOne(id));
  co_return co_await folly::coro::collectAllRange(std::move(tasks));
}
```

`collectAllRange`는 range를 받아 `std::vector<T>`를 반환한다. tuple destructuring이 불가능한 경우(런타임 결정 크기).

### collectAllTry

```cpp
auto results = co_await folly::coro::collectAllTry(t1, t2, t3);
// results: tuple<Try<R1>, Try<R2>, Try<R3>>
for (auto& r : { results.t0, results.t1, results.t2 }) {
  if (r.hasException()) { ... }
}
```

`collectAll`이 fail-fast인 반면 `collectAllTry`는 모든 Task가 완료될 때까지 기다리고 각각의 결과를 `Try<T>`로 반환. 부분 실패를 허용하는 fan-in.

### collectAny

```cpp
auto idx = co_await folly::coro::collectAny(a, b, c);
// 가장 먼저 끝난 Task의 인덱스
```

race 패턴. 가장 빨리 끝나는 결과만 채택, 나머지는 cancellation 신호로 정리(awaitable이 cancel-aware라면).

## 내부 — 단순한 합성

```cpp
// 약식
template <class... Tasks>
folly::coro::Task<std::tuple<typename Tasks::result_t...>>
collectAll(Tasks... tasks) {
  // 1. 각 Task를 SemiFuture로 변환
  auto futures = std::tuple(std::move(tasks).start()...);

  // 2. SemiFuture::collect에 위임
  auto results = co_await folly::collectAll(std::move(futures));

  // 3. tuple로 묶어 반환
  co_return std::move(results);
}
```

내부적으로 코루틴 Task들이 `SemiFuture<T>`로 변환되고 기존 `folly::collectAll` Future 합성에 위임된다. *Futures 인프라 위에 코루틴 API를 얹은 형태*. 이런 재사용이 Meta가 빠르게 production-ready로 만든 비결.

## awaitable 합성 패턴

```cpp
folly::coro::Task<Result> FetchWithFallback(Key k) {
  auto primary   = FetchPrimary(k);
  auto secondary = FetchSecondary(k);

  // 5초 timeout — 둘 다 안 끝나면 fallback
  auto result = co_await folly::coro::co_awaitTry(
    folly::coro::timeout(
      folly::coro::collectAny(std::move(primary), std::move(secondary)),
      std::chrono::seconds{5}));

  if (result.hasException()) {
    co_return co_await FetchFromCache(k);
  }
  co_return /* ... */;
}
```

`timeout`, `co_awaitTry`, `collectAny`가 자유롭게 조합된다. 같은 logic을 callback 또는 future chain으로 짜면 3배 길이.

## std와의 비교

| 항목 | 표준 | folly::coro |
|------|------|-------------|
| sync wait | 없음 (`std::future::wait`만) | `blockingWait` |
| fan-in | 없음 | `collectAll`/`collectAllRange` |
| fail-fast | N/A | `collectAll` |
| collect-all-results | N/A | `collectAllTry` |
| first-wins | N/A | `collectAny` |
| timeout | N/A | `coro::timeout` |
| cancellation | N/A | 자동 전파 |

표준은 단일 코루틴까지만. 합성/대기는 라이브러리.

## 코드 리뷰 포인트

- `blockingWait`가 라이브러리 함수 안에 있다 → 거의 항상 잘못된 위치.
- `collectAll`을 single-thread executor에서 호출 → 직렬화. parallel 의도라면 multi-thread executor 필요.
- `collectAll` 후 결과 tuple destructuring을 안 하고 통째로 보유 → 큰 결과는 메모리.
- timeout과 cancellation의 조합이 누락 → 외부 요청이 영원히 hang 가능.

## 자주 보는 안티패턴

```cpp
// 1. blockingWait 안에서 같은 pool의 Task 기다림
folly::coro::Task<int> Helper(folly::Executor* e) {
  return co_await folly::coro::blockingWait(Inner().scheduleOn(e));
  // 같은 e면 deadlock
}

// 2. range의 Task를 전부 .scheduleOn(같은 pool) 후 collectAll
std::vector<folly::coro::Task<int>> ts;
for (int i = 0; i < 1000; ++i) ts.push_back(Compute(i).scheduleOn(&pool));
co_await folly::coro::collectAllRange(std::move(ts));
// pool 크기보다 한참 많으면 starvation

// 3. collectAny 사용 후 패자 Task 폐기 - cancellation aware하지 않으면 leak
auto idx = co_await folly::coro::collectAny(slowQuery1, slowQuery2);
// slow 측이 cancel을 무시하면 background에서 계속 실행
```

## 정리

- `blockingWait`는 main()과 sync boundary 전용 — 라이브러리 안에서 쓰지 말 것.
- `collectAll` / `collectAllRange` 로 정해진/동적 수의 Task fan-out.
- `collectAllTry`로 부분 실패 허용, `collectAny`로 race.
- 내부적으로 `folly::collectAll` Future 합성 재사용 — Futures 인프라 위의 어댑터.
- timeout/cancellation과 조합해 production-grade 패턴 완성.

## 다음 편

[Part 15-05: coro::Baton / Mutex](/blog/programming/code-review/folly/part15-05-coro-baton-mutex)에서 코루틴-aware 동기화 원시를 본다.

## 관련 항목

- [Folly Part 15-02 — Task](/blog/programming/code-review/folly/part15-02-coro-task)
- [Folly Part 2-05 — collect](/blog/programming/code-review/folly/part2-05-collect) — Future 버전 collectAll
- [Folly Part 9-03 — Baton](/blog/programming/code-review/folly/part9-03-baton) — non-coro Baton과 비교
- [원문 — folly/coro/Collect.h](https://github.com/facebook/folly/blob/main/folly/coro/Collect.h)
