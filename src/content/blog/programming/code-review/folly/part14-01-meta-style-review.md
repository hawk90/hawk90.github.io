---
title: "folly Meta 스타일 code review 패턴"
date: 2026-06-07T09:07:00
description: "Part 14-01: Meta(Facebook) 사내 code review 문화 — performance-first lens."
series: "Folly Code Review"
seriesOrder: 61
tags: [cpp, folly, code-review, meta, performance, best-practices]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

Meta의 코드 리뷰는 "Move Fast"의 이미지와 달리 **라이브러리 코드에선 신중**하다. Folly에 들어오는 PR은 벤치마크·메모리·스레드안전·예외안전 네 가지를 모두 증명해야 한다. 이 절에서는 그 lens를 통한 리뷰 체크리스트를 정리한다.

## Meta의 리뷰 철학

핵심 원칙은 한 줄로 표현된다.

> **Performance is a feature.**

Folly에서 성능은 단순한 최적화 옵션이 아니다. throughput·latency 회귀가 발견되면 새 기능보다 우선해서 차단된다. PR마다 측정 가능한 결과를 요구한다.

Folly PR에서 필수로 따라붙는 항목.

1. 벤치마크 결과 (전/후 비교)
2. 메모리 사용량 분석
3. 스레드 안전성 증명
4. 예외 안전성 보장

## 1. 성능 — 최우선 lens

### 벤치마크 필수

새 함수·새 컨테이너·기존 핫패스 수정은 모두 `folly/Benchmark.h` 기반 측정이 따라온다.

```cpp
BENCHMARK(fbstringCopy, iters) {
  folly::fbstring s("benchmark string");
  for (size_t i = 0; i < iters; ++i) {
    folly::fbstring copy = s;
    folly::doNotOptimizeAway(copy);
  }
}

BENCHMARK(stdstringCopy, iters) {
  std::string s("benchmark string");
  for (size_t i = 0; i < iters; ++i) {
    std::string copy = s;
    folly::doNotOptimizeAway(copy);
  }
}

// 결과 예시:
// fbstringCopy   100000000   12.3 ns
// stdstringCopy  100000000   45.6 ns  → fbstring 3.7x 빠름
```

리뷰어가 묻는다.

- 벤치마크 결과가 있는가?
- 다양한 입력 크기에서 측정했는가?
- 기존 구현 대비 개선되었는가?
- p50/p99 분포는?

### 메모리 할당 최소화

```cpp
// 회피 — 매 push가 realloc 가능
std::string upper(const std::string& s) {
  std::string r;
  for (char c : s) r += std::toupper(c);
  return r;
}

// Good — 미리 할당
std::string upper(const std::string& s) {
  std::string r;
  r.reserve(s.size());
  for (char c : s) r += std::toupper(c);
  return r;
}

// Better — in-place
void upperInPlace(std::string& s) {
  for (char& c : s) c = std::toupper(c);
}
```

리뷰에서 "왜 alloc이 N번 일어나는가" 같은 질문이 흔하다.

### 캐시 친화 설계

```cpp
// 회피 — 흩어진 메모리
struct Node { Node* next; Node* prev; int data; };
std::list<Node> items;

// Good — 연속 메모리
std::vector<int> items;

// Folly 스타일
folly::fbvector<int> items; // jemalloc 통합
```

핫패스에선 cacheline 분석을 요구하기도 한다.

## 2. 스레드 안전성

### 명시적 문서화

```cpp
/**
 * Thread Safety:
 *   - All methods are thread-safe.
 *   - Multiple threads may call increment() concurrently.
 *
 * Memory Ordering:
 *   - Uses std::memory_order_relaxed for performance.
 *   - No happens-before relationship between operations.
 */
class Counter {
 public:
  void increment() noexcept { count_.fetch_add(1, std::memory_order_relaxed); }
  int64_t get() const noexcept { return count_.load(std::memory_order_relaxed); }
 private:
  std::atomic<int64_t> count_{0};
};
```

memory order 선택 이유까지 명시. 단순 `relaxed`를 썼다면 그 이유와 안전성 분석이 필요.

### 동기화 검증

```cpp
// 회피 — 데이터 레이스
class Cache {
 public:
  void set(string k, int v) { data_[k] = v; }   // unsynchronized
  int get(string k) { return data_[k]; }
 private:
  std::unordered_map<string, int> data_;
};

// Good — 명시 동기화
class Cache {
 public:
  void set(string k, int v) {
    std::lock_guard l(m_);
    data_[k] = v;
  }
  std::optional<int> get(string k) {
    std::lock_guard l(m_);
    auto it = data_.find(k);
    return it != data_.end() ? std::optional(it->second) : std::nullopt;
  }
 private:
  std::mutex m_;
  std::unordered_map<string, int> data_;
};

// Better — lock-free
class Cache {
 public:
  void set(string k, int v) { data_.insert_or_assign(k, v); }
  std::optional<int> get(string k) {
    auto it = data_.find(k);
    return it != data_.end() ? std::optional(it->second) : std::nullopt;
  }
 private:
  folly::ConcurrentHashMap<string, int> data_;
};
```

mutex가 답일 때도, ConcurrentHashMap이 답일 때도 있다. 리뷰어는 **선택 이유**를 묻는다.

## 3. 예외 안전성

Folly는 예외를 적극 사용한다. 그래서 예외 안전성이 더 중요하다.

수준.

- **No-throw** — 절대 발생 안 함 (`noexcept`).
- **Strong** — 발생 시 상태 변경 없음.
- **Basic** — 발생 시 유효한 상태 유지.
- **None** — 보장 없음.

### Strong guarantee 예

```cpp
// Good — 검증 먼저, 그 다음 commit
void transfer(Account& to, int amount) {
  if (amount > balance_) throw std::runtime_error("insufficient");

  balance_ -= amount;
  try {
    to.balance_ += amount;
  } catch (...) {
    balance_ += amount; // rollback
    throw;
  }
}

// Better — copy-and-commit
void transfer(Account& to, int amount) {
  int new_balance = balance_ - amount;
  int new_to     = to.balance_ + amount;
  if (new_balance < 0) throw std::runtime_error("insufficient");

  // 검증 끝, 이제 noexcept commit
  balance_      = new_balance;
  to.balance_   = new_to;
}
```

### noexcept 올바른 사용

```cpp
class Resource {
 public:
  // move는 noexcept이어야 STL container가 최적화
  Resource(Resource&& o) noexcept : data_(std::exchange(o.data_, nullptr)) {}
  Resource& operator=(Resource&& o) noexcept {
    delete data_;
    data_ = std::exchange(o.data_, nullptr);
    return *this;
  }
  // 소멸자는 항상 noexcept
  ~Resource() noexcept { delete data_; }
 private:
  int* data_ = nullptr;
};
```

## 4. API 설계

### 일관성

```cpp
// Good — STL 호환
class Container {
 public:
  size_t size() const;
  bool empty() const;
  void clear();
  void reserve(size_t);
};

// 회피 — Java-style 혼재
class Container {
 public:
  size_t getSize() const;
  bool isEmpty() const;
  void Clear();
};
```

### 0비용 추상화

```cpp
template <typename T>
class Optional {
 public:
  template <typename F>
  auto map(F&& f) const -> Optional<decltype(f(std::declval<T>()))> {
    if (hasValue_) return Optional(f(value_));
    return Optional();
  }
};

// 사용: inline되어 런타임 오버헤드 없음
auto y = maybeInt.map([](int x){ return x * 2; });
```

## 5. 테스트

### 성능 회귀 테스트

```cpp
TEST(StringPerf, CopyPerformance) {
  folly::BenchmarkSuspender s;
  folly::fbstring str(1000, 'x');
  s.dismiss();

  auto start = std::chrono::high_resolution_clock::now();
  for (int i = 0; i < 100000; ++i) {
    folly::fbstring copy = str;
    folly::doNotOptimizeAway(copy);
  }
  auto end = std::chrono::high_resolution_clock::now();
  auto ns = std::chrono::duration_cast<std::chrono::nanoseconds>(end - start).count() / 100000;
  EXPECT_LT(ns, 50); // 회귀 가드
}
```

### 스트레스 테스트

```cpp
TEST(ConcurrentHashMapTest, ConcurrentAccess) {
  folly::ConcurrentHashMap<int, int> map;
  std::atomic<int> errors{0};

  std::vector<std::thread> ts;
  for (int i = 0; i < 10; ++i) {
    ts.emplace_back([&, i]{
      for (int j = 0; j < 10000; ++j) {
        int k = i * 10000 + j;
        map.insert(k, j);
        auto it = map.find(k);
        if (it == map.end() || it->second != j) ++errors;
      }
    });
  }
  for (auto& t : ts) t.join();
  EXPECT_EQ(0, errors.load());
}
```

## 리뷰어 질문 템플릿

### 성능

```text
필수:
1. 벤치마크 결과 (전/후, 입력 크기별)
2. 메모리 할당 패턴
3. 핫패스 영향
4. 캐시 미스 예상치

권장:
5. SIMD 가능성
6. branch prediction 친화성
7. false sharing 가능성
```

### PR 본문 템플릿

```markdown
## Summary
변경 내용

## Motivation
왜 필요한가

## Performance
### Benchmarks
Before:
  op X: 100ns (p50), 150ns (p99)
After:
  op X: 50ns (p50), 80ns (p99)
  Improvement: 2x p50, 1.9x p99

### Memory
peak heap 변화

## Thread Safety
분석

## Test Plan
- [ ] unit
- [ ] benchmark
- [ ] stress
- [ ] ASAN/TSAN clean
```

## Folly 특유 리뷰 포인트

### Expected vs 예외

```cpp
// Expected — 예상 가능한 실패
folly::Expected<User, Error> findUser(int id) {
  if (!exists(id)) return folly::makeUnexpected(Error::NotFound);
  return users_[id];
}

// 예외 — 프로그래머 오류 또는 복구 불가
void processUser(User* u) {
  if (!u) throw std::invalid_argument("null");
}
```

### Future 체이닝 평탄화

```cpp
// 회피 — 콜백 지옥
getUser(id).thenValue([](User u) {
  return getOrders(u.id).thenValue([u](Orders o) {
    return getPayments(o.id).thenValue([u,o](Payments p) {
      return process(u, o, p);
    });
  });
});

// Good — collectAll
folly::collectAll(getUser(id), getOrders(orderId), getPayments(pid))
  .thenValue([](auto t) {
    auto [u, o, p] = t;
    return process(u, o, p);
  });
```

## 코드 스타일

Folly는 Google C++ Style을 따르되 몇 가지 차이.

```cpp
// 1. 예외 사용 OK
try { risky(); } catch (const std::exception& e) { handle(e); }

// 2. 매크로 사용 (FOLLY_*)
FOLLY_ALWAYS_INLINE void hotPath() {}

// 3. pImpl로 ABI 안정
class Impl;

// 4. 헤더 구조
// folly/Feature.h — 공개 API
// folly/detail/FeatureDetail.h — 구현 상세
```

## 정리

- Meta의 Folly 리뷰는 **performance-first**.
- 모든 PR이 벤치마크·메모리·스레드·예외 안전을 증명.
- 스레드 안전성은 memory order 선택 이유까지 문서화.
- noexcept 보장으로 STL 컨테이너 최적화 활성.
- API는 STL과 일관성 유지.
- Future 체이닝은 collectAll로 평탄화 권장.

## 다음 편

[Part 14-02 Folly anti-patterns](/blog/programming/code-review/folly/part14-02-folly-anti-patterns) — 잘못 쓰면 std보다 느려지는 사례들.

## 관련 항목

- [Part 1-01 Overview](/blog/programming/code-review/folly/part1-01-overview) — 시리즈 도입
- [Part 14-02 Folly anti-patterns](/blog/programming/code-review/folly/part14-02-folly-anti-patterns) — 오용 사례
- [원문 — Folly Contributing](https://github.com/facebook/folly/blob/main/CONTRIBUTING.md)
