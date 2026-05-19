---
title: "Part 13-05: Lazy (지연 초기화 wrapper)"
date: 2026-05-25T14:00:00
description: "Part 13-05: folly::Lazy — once_flag/call_once 패턴을 type level로. 무거운 객체의 첫 사용까지 초기화 연기."
series: "Folly Code Review"
seriesOrder: 60
tags: [cpp, folly, lazy, init, utility]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::Lazy<T>`는 **첫 접근 시점에 T를 생성**하는 wrapper다. 무거운 객체(DB connection, ML model, regex)를 모든 인스턴스에 미리 만들지 않고, 실제 사용 시점까지 미루기 위한 type-level 도구다. `std::once_flag` + lambda 패턴의 정형화된 버전.

## 동기 — 항상 사용되지 않는 무거운 객체

```cpp
// 회피 — 무거운 객체를 매번 생성
class Handler {
  ExpensiveCache cache_{loadFromDisk()}; // ctor에서 디스크 I/O
  Handler() {} // 인스턴스 생성마다 cache 만들어짐
};
```

handler가 cache를 사용하지 않는 path가 있다면 디스크 I/O가 낭비다.

전통적 해법: `std::optional<T>` + `std::once_flag` + 수동 init.

```cpp
class Handler {
  mutable std::optional<ExpensiveCache> cache_;
  mutable std::once_flag flag_;

  const ExpensiveCache& cache() const {
    std::call_once(flag_, [&]{ cache_.emplace(loadFromDisk()); });
    return *cache_;
  }
};
```

동작하지만 반복적이다. Lazy가 이걸 한 줄로.

## API

```cpp
#include <folly/Lazy.h>

class Handler {
  folly::Lazy<ExpensiveCache> cache_ = folly::lazy([]{ return loadFromDisk(); });

  void serve() {
    auto& c = *cache_; // 첫 접근 시 lambda 실행
    c.lookup(...);
  }
};
```

`folly::lazy(creator)`가 `Lazy<T>`를 만든다. T는 lambda의 반환 타입에서 자동 추론.

이후 `*lazy`나 `lazy->method()`로 접근. 첫 접근 시 lambda 1회 호출, 이후 캐시.

## 내부 구현

```cpp
template <typename Func>
class Lazy {
  using T = std::invoke_result_t<Func>;

  mutable std::optional<T> value_;
  mutable std::once_flag flag_;
  Func creator_;

public:
  T& operator*() const {
    std::call_once(flag_, [&]{ value_.emplace(creator_()); });
    return *value_;
  }
  T* operator->() const { return &**this; }
};
```

거의 위의 수동 패턴 그대로. once_flag로 thread-safe 단일 초기화 보장.

## thread safety

`std::call_once`가 사용되므로 thread-safe.

- 첫 호출자가 lambda 실행, 다른 thread는 wait.
- 이후 호출은 already-initialized 빠른 path.

## 사용 패턴

### regex compile

```cpp
// 회피 — 매번 compile (느림)
bool match(string s) {
  std::regex re("complex pattern"); // compile 비용
  return std::regex_search(s, re);
}

// Good — 첫 호출에 compile, 이후 cache
bool match(string s) {
  static folly::Lazy<std::regex> re = folly::lazy([]{
    return std::regex("complex pattern");
  });
  return std::regex_search(s, *re);
}
```

regex compile은 매우 비싸다. lazy + static으로 한 번만.

### per-thread DB connection

```cpp
class ServiceContext {
  folly::Lazy<DbConnection> db_ = folly::lazy([]{ return connectToDb(); });
};

void handleRequest(ServiceContext& ctx) {
  if (need_db) {
    ctx.db_->query(...); // 첫 사용 시 connect
  }
}
```

DB 안 쓰는 request라면 connect 안 함.

### ML model loading

```cpp
class Inference {
  folly::Lazy<Model> model_ = folly::lazy([]{ return Model::load("path"); });
};
```

모델 load는 수백 MB · 수십 초. 처음 inference 요청 시점까지 미룸.

## std / abseil 비교

| 도구 | one-time init | thread-safe | API 무게 |
|------|---------------|-------------|---------|
| `std::optional<T>` 수동 | manual | manual | 무거움 |
| `std::call_once` + lambda | yes | yes | 중간 |
| static 함수 내부 (Meyers) | yes | yes (C++11+) | 가벼움 |
| `folly::Lazy<T>` | yes | yes | 가장 가벼움 |
| `absl::call_once` | yes | yes | 중간 |

Meyers static은 정적 객체에 좋고, Lazy는 멤버 필드에 좋다. 인스턴스마다 lazy init이 필요하면 Lazy가 정답.

## 코드 리뷰 포인트

### 1. 정말 lazy가 필요한가

```cpp
// 회피 — 항상 사용되는 객체에 Lazy
class Worker {
  folly::Lazy<Logger> log_ = folly::lazy([]{ return Logger(); }); // 항상 쓰는데
};

// Good — 항상 쓰면 그냥 멤버
class Worker {
  Logger log_;
};
```

매 접근에 once_flag 분기가 들어간다. 항상 사용한다면 그냥 멤버로.

### 2. lambda 안 capture 주의

```cpp
// 회피 — capture by reference + lifetime 문제
auto x = makeBigConfig();
auto lazy = folly::lazy([&x]{ return process(x); });
// lazy 살아있을 때 x가 살아 있어야 함

// Good — by value capture
auto lazy = folly::lazy([x = std::move(x)]{ return process(x); });
```

lambda capture의 lifetime을 lazy 객체의 lifetime과 맞춘다.

### 3. 첫 호출 latency 인지

```cpp
// 회피 — 핫패스 첫 호출이 느림
folly::Lazy<HeavyCache> cache;
// p99 latency가 첫 request에서 spike
```

핫패스 lazy는 startup 시 warm-up 호출로 미리 init.

```cpp
void warmup() {
  *cache; // pre-init
}
```

### 4. Lazy<unique_ptr> 회피

```cpp
// 회피 — 이중 indirection
folly::Lazy<std::unique_ptr<T>> bad;

// Good — Lazy<T>
folly::Lazy<T> good;
```

Lazy 자체가 storage를 가진다. unique_ptr로 다시 감쌀 이유 없음.

## 안티패턴

### 1. Lazy를 매 호출마다 새로 생성

```cpp
// 회피
void use() {
  auto lz = folly::lazy([]{ return compute(); });
  auto v = *lz; // 즉시 첫 접근 — lazy 의미 없음
}
```

매 호출에서 새 lazy면 lambda가 매번 실행. lazy는 *재사용*되는 컨텍스트에서만 의미 있음.

### 2. creator 안에서 예외

```cpp
// 회피
folly::Lazy<T> bad = folly::lazy([]{
  throw std::runtime_error("..."); // 첫 호출자에게만 던져짐
});

// 첫 호출자 catch한 후 다음 호출은 어떻게 되나?
// Folly Lazy 구현마다 다르므로 명세 확인 필요
```

creator는 noexcept이거나 외부에서 명확히 catch. lazy init 실패의 retry semantics는 모호함.

### 3. mutable이 아닌 Lazy를 const 메서드에서 접근

```cpp
class X {
  folly::Lazy<T> lazy_; // non-mutable

  const T& get() const {
    return *lazy_; // 컴파일 에러 — lazy_가 mutable이 아니면
  }
};

// Good — mutable Lazy
mutable folly::Lazy<T> lazy_;
```

Lazy 내부는 `mutable` 멤버를 갖지만, 멤버 자체가 mutable이 아니면 const 메서드에서 첫 init 못 함.

## 정리

- Lazy<T>는 **첫 접근 시 T 생성**하는 wrapper.
- `std::call_once` + `std::optional` 패턴을 한 줄로.
- regex, DB connection, ML model 같이 비싼 init에 적합.
- 항상 사용되는 객체에는 그냥 멤버가 더 빠름.
- creator는 noexcept 또는 명확한 retry 정책.
- mutable로 선언해야 const 메서드에서 init 가능.
- Lazy<unique_ptr> 같은 이중 wrap 회피.

## 다음 편

[Part 14-01 Meta 스타일 code review](/blog/programming/code-review/folly/part14-01-meta-style-review) — Part 14 시작. Meta 사내 리뷰 문화와 Folly 특유의 리뷰 포인트.

## 관련 항목

- [Part 12-02 SingletonVault](/blog/programming/code-review/folly/part12-02-singleton-vault) — eager vs lazy init 트레이드오프
- [Part 13-04 folly::Function](/blog/programming/code-review/folly/part13-04-folly-function) — Lazy creator도 결국 callable
- [Effective Modern C++ Item 39](/blog/programming/cpp/effective-modern-cpp/item39-future-for-one-shot) — once_flag 대안
