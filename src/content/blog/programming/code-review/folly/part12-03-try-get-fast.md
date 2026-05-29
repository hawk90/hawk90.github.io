---
title: "Part 12-03: try_get / try_get_fast (TLS-cached 접근)"
date: 2026-05-25T09:00:00
description: "Part 12-03: try_get vs try_get_fast — TLS 캐시로 hot-path singleton 접근을 nanosecond 수준으로."
series: "Folly Code Review"
seriesOrder: 55
tags: [cpp, folly, singleton, performance, access]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`try_get`은 매번 vault lookup + shared_ptr 복사가 발생한다. 핫패스에서 부담이다. `try_get_fast`는 **thread-local cache**로 그 비용을 nanosecond 단위로 떨어뜨린다. shared_ptr 대신 raw pointer를 돌려주므로 lifetime 책임이 호출자에게 일부 이동한다.

## 동기 — try_get은 생각보다 비싸다

```cpp
auto p = folly::Singleton<Service>::try_get();
```

이 한 줄에서 일어나는 일.

1. vault에서 type → holder lookup (F14Map find).
2. holder의 state check (Quiescing 등).
3. holder가 보관한 shared_ptr 복사 (atomic refcount inc).
4. 결과 shared_ptr 반환 (또 atomic refcount inc).
5. 호출자 끝나면 ~shared_ptr (atomic refcount dec).

전체 50~100ns. 한 번이면 무시할 만하지만 RPC 핸들러 안에서 매 request마다 호출되면 영향이 누적된다.

## try_get_fast

```cpp
auto* p = folly::Singleton<Service>::try_get_fast(); // Service*, nullable
if (p) {
  p->doWork();
}
```

내부는 `thread_local`로 캐시된 pointer다.

```cpp
template <typename T>
class Singleton {
  static T* try_get_fast() noexcept {
    thread_local T* cached = nullptr;
    if (FOLLY_LIKELY(cached != nullptr)) {
      return cached;
    }
    // slow path
    auto sp = try_get();
    cached = sp.get();
    return cached;
  }
};
```

첫 호출은 slow path(`try_get`). 이후는 TLS load 한 번. amortized 비용 ~3ns.

### TLS 캐시의 문제 — 언제 무효화하나

cached pointer가 dangling일 수 있다.

- vault가 destroyInstance 호출 후엔 그 pointer 무효.
- 새 thread가 cached==nullptr이면 다시 slow path.

Folly의 해법: TLS 캐시는 **vault의 lifecycle version**에 묶여 있다. version이 바뀌면 캐시 무효 처리. 매 access마다 version check가 한 번 더 있지만 매우 가볍다.

## try_get vs try_get_fast 비교

| | try_get | try_get_fast |
|---|---------|---------------|
| 반환 | `std::shared_ptr<T>` | `T*` (nullable) |
| 평균 비용 | 50~100ns | 3~5ns |
| lifetime 책임 | shared_ptr가 자동 | 호출자가 vault destroy 인지 |
| thread-safe | yes | yes (TLS) |
| nullptr | shutdown 후 | shutdown 후, version 체크 |
| 권장 위치 | cold path, init | hot path, RPC handler |

## 사용 예 — RPC handler

```cpp
// 회피 — 핫패스마다 shared_ptr copy
folly::Future<Response> handle(Request req) {
  auto cache = folly::Singleton<Cache>::try_get();
  if (!cache) return errorResponse();
  return cache->lookup(req.key);
}

// Good — TLS 캐시
folly::Future<Response> handle(Request req) {
  auto* cache = folly::Singleton<Cache>::try_get_fast();
  if (!cache) return errorResponse();
  return cache->lookup(req.key);
}
```

QPS 100k라면 throughput 차이가 측정 가능하다.

## 안전성 — 언제 try_get_fast가 위험한가

raw pointer를 반환하므로 호출자가 다음을 확인해야 한다.

### 1. 호출자가 pointer를 보관하지 않는다

```cpp
// 회피
class Worker {
  Cache* cache_ = folly::Singleton<Cache>::try_get_fast();
  // ↑ vault destroy 후엔 dangling
};

// Good — 매번 try_get_fast
class Worker {
  void doWork() {
    auto* cache = folly::Singleton<Cache>::try_get_fast();
    if (!cache) return;
    cache->lookup(...);
  }
};
```

매번 호출해도 TLS 캐시라 거의 무비용. 멤버에 보관하는 게 오히려 위험.

### 2. shutdown path에서 try_get_fast

```cpp
// 회피
~Worker() {
  folly::Singleton<Logger>::try_get_fast()->log("bye");
  // shutdown 중이면 nullptr (체크 안 함)
}

// Good — try_get 또는 null check
~Worker() {
  if (auto* logger = folly::Singleton<Logger>::try_get_fast()) {
    logger->log("bye");
  }
}
```

null check 필수.

## std / abseil 비교

| 접근 방식 | 비용 | 안전성 |
|----------|------|--------|
| Meyers `static T s; return s;` | ~1ns (이후), thread-safe init 비용 첫 호출 | dangling 없음 (전 lifetime) |
| `absl::NoDestructor<T>::get()` | ~1ns | 누수 — destroy 안 함 |
| `folly::Singleton<T>::try_get()` | 50~100ns | shared_ptr, race-free |
| `folly::Singleton<T>::try_get_fast()` | 3~5ns | raw ptr, vault state 의존 |

Meyers와 absl::NoDestructor는 빠르지만 destruction order 보장이 없다. Folly의 try_get_fast는 그 보장을 유지하면서 hot-path 비용을 비슷한 수준으로 끌어내린다.

## 코드 리뷰 포인트

### 1. 어디서 try_get_fast를 쓸지 명확히

```cpp
// 명시적 주석
// HOT PATH — try_get_fast로 ns 단위 access
auto* svc = folly::Singleton<Service>::try_get_fast();

// COLD PATH — init 단계, shared_ptr 안전
auto svc = folly::Singleton<Service>::try_get();
```

PR 리뷰에서 어떤 path인지 확인.

### 2. nullptr 체크 빠짐

```cpp
// 회피
folly::Singleton<X>::try_get_fast()->method(); // shutdown 직후 crash
```

`try_get_fast`도 nullable. shutdown 경계나 fork 직후 nullptr 가능.

### 3. shared_ptr이 정말 필요한 경우

```cpp
// async에 stash
auto svc = folly::Singleton<Service>::try_get(); // shared_ptr
folly::makeFuture().thenValue([svc](auto) {
  svc->doWork(); // future 끝날 때까지 svc 유효
});
```

async 콜백처럼 lifetime이 호출 스택을 넘는 경우엔 shared_ptr이 필요. raw로 캡처하면 dangling 위험.

### 4. benchmark로 차이 확인

```cpp
BENCHMARK(try_get) {
  auto sp = folly::Singleton<Foo>::try_get();
  doNotOptimizeAway(sp);
}

BENCHMARK(try_get_fast) {
  auto* p = folly::Singleton<Foo>::try_get_fast();
  doNotOptimizeAway(p);
}
```

대략 10-30x 차이. 핫패스라면 측정해 보고 결정.

## 안티패턴

### 1. 모든 try_get을 try_get_fast로 mass-replace

```cpp
// 회피 — async 콜백 안에서 raw ptr capture
folly::makeFuture().thenValue([cache = folly::Singleton<Cache>::try_get_fast()](auto) {
  cache->lookup(...); // future 실행 시점에 cache가 살아있는지?
});
```

async 콜백은 capture 시점과 실행 시점이 다르다. shared_ptr이 옳다.

### 2. try_get_fast 결과를 멤버에 보관

```cpp
// 회피
class Handler {
  Cache* cache_ = folly::Singleton<Cache>::try_get_fast(); // 한 번만 호출
};
```

vault가 destroyInstance를 호출하면 cache_가 dangling. 멤버 대신 매 method에서 호출.

### 3. const 호출에서 mutable 메서드

```cpp
// 회피
void readOnly() const {
  auto* c = folly::Singleton<Cache>::try_get_fast();
  c->mutate(); // 의도와 다른 mutation
}
```

singleton 자체는 mutable이지만, const 함수가 mutable 메서드를 호출하면 설계 의도가 흐려진다.

## 정리

- try_get: shared_ptr, 50~100ns, 가장 안전.
- try_get_fast: raw ptr (TLS-cached), 3~5ns, hot path용.
- TLS 캐시는 vault lifecycle version에 묶여 자동 무효화.
- async/콜백에 캡처는 shared_ptr (try_get).
- raw ptr을 멤버로 보관 금지, 매 호출마다 try_get_fast가 안전.
- nullptr 체크 빠뜨리면 shutdown 경계에서 crash.

## 다음 편

[Part 13-01 ExceptionWrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper) — Part 13 시작. 비동기 컨텍스트로 exception을 안전하게 옮기는 패턴.

## 관련 항목

- [Part 12-01 Singleton vs Meyers](/blog/programming/code-review/folly/part12-01-singleton-vs-meyers) — 왜 vault가 필요한가
- [Part 12-02 SingletonVault](/blog/programming/code-review/folly/part12-02-singleton-vault) — vault 라이프사이클
- [Part 2-03 SemiFuture vs Future](/blog/programming/code-review/folly/part2-03-semi-future-vs-future) — async 캡처 패턴
