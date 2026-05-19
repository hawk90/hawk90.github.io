---
title: "Part 2-05: collect / collectAll / collectAny — fan-in 패턴"
date: 2026-05-23T10:00:00
description: "여러 SemiFuture를 모으는 세 가지 의미 — 모두 성공, 모두 완료, 하나만 완료."
series: "Folly Code Review"
seriesOrder: 10
tags: [cpp, folly, future, collect, parallel]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: `collect`는 *모두 성공*을, `collectAll`은 *모두 완료*(예외 포함)를, `collectAny`는 *하나만 완료*를 기다린다. 셋의 의미가 fan-in 패턴의 의도를 코드에 적는다.

## 동기 — fan-in 패턴

비동기 시스템에서 자주 등장하는 구조는 *여러 작업의 결과를 모으는 것*이다.

```text
   ┌──▶ fetch(a) ──┐
   │               │
req┼──▶ fetch(b) ──┼──▶ aggregate
   │               │
   └──▶ fetch(c) ──┘
```

이를 일반화하면 세 가지 패턴이 보인다.

1. **all-or-nothing** — 하나라도 실패하면 전체 실패 (예: parallel RPC가 모두 성공해야 응답)
2. **gather-all** — 성공/실패를 모두 받아 부분 결과 활용 (예: 일부 서비스가 죽어도 응답)
3. **first-wins** — 가장 먼저 완료된 하나만 사용 (예: redundant query, timeout race)

Folly는 이 셋을 `collect`/`collectAll`/`collectAny`로 명시한다.

## API 요약

```cpp
#include <folly/futures/Future.h>

// (1) collect — 하나라도 실패하면 전체 실패
folly::SemiFuture<std::tuple<int, std::string>> sf1 =
    folly::collect(makeSemiFuture(1), makeSemiFuture<std::string>("ok"));

folly::SemiFuture<std::vector<int>> sf2 =
    folly::collect(vector_of_semifutures);

// (2) collectAll — 모두 완료 (Try로 감쌈)
folly::SemiFuture<std::tuple<Try<int>, Try<std::string>>> sf3 =
    folly::collectAll(makeSemiFuture(1), makeSemiFuture<std::string>("ok"));

folly::SemiFuture<std::vector<Try<int>>> sf4 =
    folly::collectAll(vector_of_semifutures);

// (3) collectAny — 가장 먼저 완료 (pair: index + Try)
folly::SemiFuture<std::pair<size_t, Try<int>>> sf5 =
    folly::collectAny(vector_of_semifutures);

// (4) collectN — n개 완료
folly::SemiFuture<std::vector<std::pair<size_t, Try<int>>>> sf6 =
    folly::collectN(vector_of_semifutures, 3);
```

## collect — 모두 성공해야 함

```cpp
auto futures = std::vector{
  fetchUser(1),    // SemiFuture<User>
  fetchUser(2),
  fetchUser(3),
};

folly::collect(std::move(futures))
  .via(&pool)
  .thenValue([](std::vector<User> users) {
    return aggregate(users);
  })
  .thenError(folly::tag_t<std::exception>{}, [](auto& e) {
    LOG(ERROR) << "at least one fetch failed: " << e.what();
    return Aggregate{};
  });
```

하나라도 실패하면 *첫 실패의 예외*가 결과 SemiFuture로 전파된다. 나머지 작업은 계속 돌지만 결과는 버려진다.

```cpp
// folly/futures/Future-inl.h (개념)
template <class It>
SemiFuture<std::vector<value_t>> collect(It first, It last) {
  size_t n = std::distance(first, last);
  auto ctx = std::make_shared<CollectContext>(n);
  for (size_t i = 0; first != last; ++first, ++i) {
    std::move(*first).setCallback_([ctx, i](Try<T>&& t) {
      if (t.hasException()) {
        ctx->setPartialResult(t.exception());
      } else {
        ctx->setPartialResult(i, *std::move(t));
      }
    });
  }
  return ctx->promise.getSemiFuture();
}
```

`CollectContext`가 *남은 갯수*를 atomic 카운터로 추적하고, 0이 되면 Promise를 set한다.

## collectAll — 부분 실패 허용

```cpp
folly::collectAll(std::move(futures))
  .via(&pool)
  .thenValue([](std::vector<Try<User>> results) {
    std::vector<User> ok;
    size_t failed = 0;
    for (auto& r : results) {
      if (r.hasValue()) ok.push_back(*std::move(r));
      else ++failed;
    }
    LOG(INFO) << "ok=" << ok.size() << " failed=" << failed;
    return aggregate(ok);
  });
```

각 결과가 `Try<T>`로 감싸져 *예외도 값으로 다룬다*. 부분 결과를 활용해야 할 때 적합하다.

## collectAny — race / first-wins

```cpp
auto futures = std::vector{
  queryReplicaA(),
  queryReplicaB(),
  queryReplicaC(),
};

folly::collectAny(std::move(futures))
  .via(&pool)
  .thenValue([](auto pair) {
    auto [idx, result] = std::move(pair);
    LOG(INFO) << "first replica: " << idx;
    if (result.hasException()) {
      // 가장 빠른 응답이 실패 — 다음 단계는 collectAnySuccessful 고려
    }
    return *std::move(result);
  });
```

가장 빠른 *완료*이지 가장 빠른 *성공*이 아니다. 가장 빠른 실패도 잡힌다. 성공만 원한다면 `collectAnySuccessful`을 쓴다.

## collectAnySuccessful — 모두 실패해야 실패

```cpp
folly::collectAnySuccessful(std::move(futures))
  .via(&pool)
  .thenValue([](auto pair) {
    auto [idx, value] = std::move(pair);   // 성공값
    return value;
  })
  .thenError(folly::tag_t<CollectAllFailedException>{}, [](auto&) {
    return Default{};   // 모두 실패
  });
```

내부적으로 `CollectAllFailedException`이 모아진 모든 예외를 전달한다.

## variadic vs range

`collect` 계열은 두 오버로드를 제공한다.

```cpp
// variadic — 타입이 다른 Future
auto sf = folly::collect(
    fetchUser(1),       // SemiFuture<User>
    fetchOrders(1),     // SemiFuture<vector<Order>>
    fetchAddress(1));   // SemiFuture<Address>
// sf: SemiFuture<tuple<User, vector<Order>, Address>>

// range — 같은 타입의 Future
std::vector<SemiFuture<User>> v = ...;
auto sf = folly::collect(std::move(v));
// sf: SemiFuture<vector<User>>
```

variadic은 *서로 다른 type의 결과*를 한 번에 모을 때 편리하다.

## collectN — n개 완료 기다림

```cpp
auto sf = folly::collectN(std::move(futures), 3);
// sf: SemiFuture<vector<pair<size_t, Try<T>>>>

// 가장 빠른 3개를 받는다
```

quorum read 같은 패턴에 유용하다. 5개 replica 중 3개 응답을 받으면 진행한다.

## 비교 표

| API | 완료 시점 | 결과 타입 | 예외 처리 |
|-----|-----------|-----------|-----------|
| `collect` | 모두 성공 OR 첫 실패 | `vector<T>` 또는 tuple | 첫 예외 전파 |
| `collectAll` | 모두 완료 | `vector<Try<T>>` 또는 tuple | 모두 Try로 |
| `collectAny` | 첫 완료 | `pair<size_t, Try<T>>` | Try로 |
| `collectAnySuccessful` | 첫 성공 OR 모두 실패 | `pair<size_t, T>` | 모두 실패 시 예외 |
| `collectN` | n개 완료 | `vector<pair<size_t, Try<T>>>` | Try로 |

## std와 비교

C++ 표준에는 fan-in primitive가 없다. `std::async`로 여러 작업을 띄우고 *각각 `.get()`*해야 한다.

```cpp
// std로 동등 — sequential get
auto f1 = std::async(...);
auto f2 = std::async(...);
auto f3 = std::async(...);
auto r1 = f1.get();   // f2/f3는 끝나도 못 받음
auto r2 = f2.get();
auto r3 = f3.get();
// 첫 .get()이 blocking, 그 동안 다른 결과는 idle
```

`folly::collect`는 *동시 wait*을 한 번에 한다. context switch가 줄고, 가장 늦은 완료까지의 time만 든다.

## 코드 리뷰 포인트

- **`collect`인지 `collectAll`인지 의도가 맞는가?** 부분 실패 허용 여부가 결정한다.
- **결과의 vector size가 input과 같은가?** 그렇다. index 순서 유지된다.
- **`collectAny`의 결과가 실패면 다음 step이 처리하는가?** 자주 빠뜨리는 부분.
- **여러 작업이 *서로 다른 executor*에서 도는가?** OK다. `collect`는 executor를 묶지 않는다.

## 자주 보는 안티패턴

```cpp
// 1. collect로 부분 실패 무시
folly::collect(futures).get();
// 하나만 실패해도 전체 throw — 의도가 partial이면 collectAll

// 2. collectAll 후 첫 예외만 체크
auto results = folly::collectAll(futures).get();
for (auto& r : results) {
  if (r.hasException()) throw r.exception();   // 첫 예외만 본다
}
// 의도가 all-or-nothing이면 처음부터 collect 사용

// 3. collectAny가 실패해도 진행
folly::collectAny(futures).thenValue([](auto pair) {
  return process(*pair.second);   // pair.second가 예외면 throw
});

// 4. 무한히 큰 vector를 collect
folly::collect(million_futures);   // memory 부담 — window로 분할
```

## 정리

- `collect`/`collectAll`/`collectAny`는 fan-in 패턴의 세 의미를 명시한다.
- `collect`는 all-or-nothing, `collectAll`은 부분 실패 허용, `collectAny`는 first-wins다.
- variadic 오버로드는 타입이 다른 Future를 tuple로, range 오버로드는 vector로 반환한다.
- 결과는 input과 같은 index 순서를 유지한다.
- `collectN`은 quorum 패턴에, `collectAnySuccessful`은 redundant query에 적합하다.
- 큰 수의 작업에는 `folly::window`로 동시성 제한과 결합한다.

## 다음 편

[Part 2-06: retry / window / via](/blog/programming/code-review/folly/part2-06-retry-window-via)에서 retry 정책, 동시성 제한, executor 전환을 본다.

## 관련 항목

- [Folly Part 2-04 — thenValue / thenError](/blog/programming/code-review/folly/part2-04-then-value-error)
- [Folly Part 2-06 — retry / window / via](/blog/programming/code-review/folly/part2-06-retry-window-via)
- [Folly Part 3-02 — CPUThreadPoolExecutor](/blog/programming/code-review/folly/part3-02-cpu-thread-pool-executor)
