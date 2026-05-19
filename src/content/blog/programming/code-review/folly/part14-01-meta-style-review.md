---
title: "Part 14-01: Meta 스타일 code review"
date: 2026-05-25T15:00:00
description: "Part 14-01: Meta(Facebook) 사내 code review 문화 — performance-first lens."
series: "Folly Code Review"
seriesOrder: 61
tags: [cpp, folly, code-review, meta, performance, best-practices]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

## Meta의 코드 리뷰 철학

Meta(Facebook)의 엔지니어링 문화는 "Move Fast"로 유명하지만, 라이브러리 코드에서는 신중함이 요구됩니다.

### 핵심 원칙

> **성능은 기능이다 (Performance is a Feature)**

Folly 코드 리뷰에서 성능은 단순한 최적화가 아닌 핵심 요구사항입니다:

```cpp
// Folly PR에서 요구되는 것들:
// 1. 벤치마크 결과 (필수)
// 2. 메모리 사용량 분석
// 3. 스레드 안전성 증명
// 4. 예외 안전성 보장
```

## 코드 리뷰 체크리스트

### 1. 성능 (Performance) - 최우선

#### 벤치마크 필수

```cpp
// ✅ PR에 포함되어야 할 벤치마크 예시
// folly/test/FBStringBenchmark.cpp

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

// 출력:
// fbstringCopy          100000000    12.3 ns
// stdstringCopy         100000000    45.6 ns
// --> fbstring이 3.7x 빠름
```

**리뷰 질문**:
- 벤치마크 결과가 있는가?
- 다양한 입력 크기에서 테스트했는가?
- 기존 구현 대비 개선되었는가?

#### 메모리 할당 최소화

```cpp
// ❌ 불필요한 할당
std::string ProcessData(const std::string& input) {
    std::string result;
    for (char c : input) {
        result += std::toupper(c);  // 매번 재할당 가능
    }
    return result;
}

// ✅ 할당 최소화
std::string ProcessData(const std::string& input) {
    std::string result;
    result.reserve(input.size());  // 미리 할당
    for (char c : input) {
        result += std::toupper(c);
    }
    return result;
}

// ✅✅ Folly 방식: in-place 변환
void ProcessDataInPlace(std::string& data) {
    for (char& c : data) {
        c = std::toupper(c);
    }
}
```

#### 캐시 친화적 설계

```cpp
// ❌ 캐시 비효율: 데이터가 흩어져 있음
struct Node {
    Node* next;
    Node* prev;
    int data;
    // ... 패딩으로 인한 낭비
};
std::list<Node> items;

// ✅ 캐시 효율: 연속 메모리
struct Data {
    int value;
    // 관련 데이터를 함께
};
std::vector<Data> items;  // 연속 메모리

// ✅✅ Folly 방식: 특화된 컨테이너
folly::fbvector<Data> items;  // jemalloc 최적화
```

### 2. 스레드 안전성 (Thread Safety)

#### 명시적 문서화

```cpp
// ✅ 좋음: 스레드 안전성 명시
/**
 * Thread-safe counter using atomic operations.
 *
 * Thread Safety:
 *   - All methods are thread-safe.
 *   - Multiple threads can call increment() concurrently.
 *
 * Memory Ordering:
 *   - Uses std::memory_order_relaxed for performance.
 *   - No happens-before relationship between operations.
 */
class Counter {
public:
    void increment() noexcept {
        count_.fetch_add(1, std::memory_order_relaxed);
    }

    int64_t get() const noexcept {
        return count_.load(std::memory_order_relaxed);
    }

private:
    std::atomic<int64_t> count_{0};
};
```

#### 동기화 검증

```cpp
// ❌ 데이터 레이스
class Cache {
public:
    void Set(const std::string& key, int value) {
        data_[key] = value;  // 동시 접근 시 위험
    }

    int Get(const std::string& key) {
        return data_[key];   // 동시 접근 시 위험
    }

private:
    std::unordered_map<std::string, int> data_;
};

// ✅ 명시적 동기화
class Cache {
public:
    void Set(const std::string& key, int value) {
        std::lock_guard<std::mutex> lock(mutex_);
        data_[key] = value;
    }

    std::optional<int> Get(const std::string& key) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = data_.find(key);
        if (it != data_.end()) {
            return it->second;
        }
        return std::nullopt;
    }

private:
    std::mutex mutex_;
    std::unordered_map<std::string, int> data_;
};

// ✅✅ Folly 방식: Lock-free
class Cache {
public:
    void Set(const std::string& key, int value) {
        data_.insert_or_assign(key, value);
    }

    std::optional<int> Get(const std::string& key) {
        auto it = data_.find(key);
        if (it != data_.end()) {
            return it->second;
        }
        return std::nullopt;
    }

private:
    folly::ConcurrentHashMap<std::string, int> data_;
};
```

### 3. 예외 안전성 (Exception Safety)

Folly는 예외를 적극 사용하므로 예외 안전성이 중요합니다:

```cpp
// 예외 안전성 수준:
// - No-throw: 절대 예외 발생 안 함 (noexcept)
// - Strong: 예외 발생 시 상태 변경 없음
// - Basic: 예외 발생 시 유효한 상태 유지
// - None: 예외 발생 시 상태 보장 없음

// ✅ Strong guarantee 예시
class Account {
public:
    void Transfer(Account& to, int amount) {
        // 검증 먼저 (예외 발생 가능)
        if (amount > balance_) {
            throw std::runtime_error("Insufficient funds");
        }

        // 원자적 수정 (예외 안전)
        balance_ -= amount;
        try {
            to.balance_ += amount;
        } catch (...) {
            balance_ += amount;  // 롤백
            throw;
        }
    }

private:
    int balance_;
};

// ✅✅ 더 나은 방식: copy-and-swap
void Transfer(Account& to, int amount) {
    // 복사본에서 작업
    int new_balance = balance_ - amount;
    int new_to_balance = to.balance_ + amount;

    if (new_balance < 0) {
        throw std::runtime_error("Insufficient funds");
    }

    // 모든 검증 통과 후 커밋 (noexcept)
    balance_ = new_balance;
    to.balance_ = new_to_balance;
}
```

#### noexcept 올바른 사용

```cpp
// ✅ noexcept 올바른 사용
class Resource {
public:
    // 이동 연산은 noexcept여야 STL 컨테이너가 최적화
    Resource(Resource&& other) noexcept
        : data_(std::exchange(other.data_, nullptr)) {}

    Resource& operator=(Resource&& other) noexcept {
        if (this != &other) {
            delete data_;
            data_ = std::exchange(other.data_, nullptr);
        }
        return *this;
    }

    // 소멸자는 항상 noexcept
    ~Resource() noexcept {
        delete data_;
    }

private:
    int* data_;
};
```

### 4. API 설계 (API Design)

#### 일관성

```cpp
// ✅ Folly 스타일: 일관된 명명
class Container {
public:
    size_t size() const;       // STL 호환
    bool empty() const;        // STL 호환
    void clear();              // STL 호환

    // Folly 추가 기능
    void reserve(size_t n);
    size_t capacity() const;
};

// ❌ 불일치: 혼란 유발
class Container {
public:
    size_t getSize() const;    // Java 스타일?
    bool isEmpty() const;      // 불일치
    void Clear();              // 대문자?
};
```

#### 0비용 추상화

```cpp
// ✅ 추상화 비용 없음
template <typename T>
class Optional {
public:
    // 값이 있을 때만 콜백 실행
    template <typename F>
    auto map(F&& f) const -> Optional<decltype(f(std::declval<T>()))> {
        if (hasValue_) {
            return Optional(f(value_));
        }
        return Optional();
    }

private:
    bool hasValue_;
    T value_;
};

// 사용: 런타임 오버헤드 없음 (인라인됨)
auto result = maybeInt.map([](int x) { return x * 2; });
```

### 5. 테스트 (Testing)

#### 성능 회귀 테스트

```cpp
// Folly는 성능 회귀를 테스트로 방지
TEST(StringPerf, CopyPerformance) {
    folly::BenchmarkSuspender braces;

    folly::fbstring s(1000, 'x');

    braces.dismiss();

    auto start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 100000; ++i) {
        folly::fbstring copy = s;
        folly::doNotOptimizeAway(copy);
    }
    auto end = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::nanoseconds>(
        end - start).count() / 100000;

    // 성능 기준: 복사당 50ns 이하
    EXPECT_LT(duration, 50);
}
```

#### 스트레스 테스트

```cpp
// 동시성 스트레스 테스트
TEST(ConcurrentHashMapTest, ConcurrentAccess) {
    folly::ConcurrentHashMap<int, int> map;
    std::atomic<int> errors{0};

    std::vector<std::thread> threads;
    for (int i = 0; i < 10; ++i) {
        threads.emplace_back([&, i]() {
            for (int j = 0; j < 10000; ++j) {
                int key = i * 10000 + j;
                map.insert(key, j);

                auto it = map.find(key);
                if (it == map.end() || it->second != j) {
                    ++errors;
                }
            }
        });
    }

    for (auto& t : threads) {
        t.join();
    }

    EXPECT_EQ(errors.load(), 0);
    EXPECT_EQ(map.size(), 100000);
}
```

## 리뷰어 가이드라인

### 성능 관련 질문

```
필수 질문:
1. 벤치마크 결과를 보여주세요.
2. 메모리 할당 패턴은 어떻게 되나요?
3. 핫 패스에서의 성능 영향은?
4. 캐시 미스는 예상대로인가요?

권장 질문:
5. SIMD 최적화 가능성은?
6. Branch prediction 친화적인가요?
7. False sharing 가능성은?
```

### PR 설명 템플릿

```markdown
## Summary
[변경 사항 요약]

## Motivation
[왜 이 변경이 필요한가]

## Performance Impact
[성능 영향 분석]

### Benchmarks
```
Before:
  Operation X: 100ns (p50), 150ns (p99)

After:
  Operation X: 50ns (p50), 80ns (p99)
  Improvement: 2x (p50), 1.9x (p99)
```

### Memory Usage
[메모리 사용량 변화]

## Thread Safety
[스레드 안전성 분석]

## Test Plan
- [ ] Unit tests added
- [ ] Benchmark added
- [ ] Stress test passed
- [ ] ASAN/TSAN clean
```

## Folly 특화 리뷰 포인트

### Expected vs 예외

```cpp
// 리뷰 시 확인: 언제 Expected, 언제 예외?

// ✅ Expected: 예상 가능한 실패
folly::Expected<User, Error> FindUser(int id) {
    if (!exists(id)) {
        return folly::makeUnexpected(Error::NotFound);
    }
    return users_[id];
}

// ✅ 예외: 프로그래머 오류 또는 복구 불가능
void ProcessUser(User* user) {
    if (!user) {
        throw std::invalid_argument("user cannot be null");
    }
    // ...
}
```

### Future 체이닝

```cpp
// ❌ 콜백 지옥
GetUser(id)
    .thenValue([](User u) {
        return GetOrders(u.id)
            .thenValue([u](Orders o) {
                return GetPayments(o.id)
                    .thenValue([u, o](Payments p) {
                        // 깊은 중첩...
                    });
            });
    });

// ✅ 평탄한 체이닝
GetUser(id)
    .thenValue([](User u) {
        return GetOrders(u.id).thenValue([u](Orders o) {
            return std::make_tuple(u, o);
        });
    })
    .thenValue([](auto tuple) {
        auto [u, o] = tuple;
        return GetPayments(o.id).thenValue([u, o](Payments p) {
            return std::make_tuple(u, o, p);
        });
    })
    .thenValue([](auto tuple) {
        auto [u, o, p] = tuple;
        return ProcessAll(u, o, p);
    });

// ✅✅ collectAll 사용
folly::collectAll(
    GetUser(id),
    GetOrders(orderId),
    GetPayments(paymentId)
).thenValue([](auto results) {
    auto [userTry, ordersTry, paymentsTry] = results;
    // ...
});
```

## 코드 스타일

Folly는 Google 스타일 가이드를 대체로 따르되 몇 가지 차이가 있습니다:

```cpp
// Folly 스타일 특징

// 1. 예외 사용 OK
try {
    riskyOperation();
} catch (const std::exception& e) {
    // 처리
}

// 2. 매크로 사용 (FOLLY_*)
FOLLY_ALWAYS_INLINE void hotPath() { /* ... */ }

// 3. 내부 구현 노출 최소화
class Impl;  // pImpl 패턴 선호

// 4. 헤더 구조
// folly/Feature.h - 공개 API
// folly/detail/FeatureDetail.h - 구현 상세
```

## 다음 단계

- **항목 3**: F14 해시맵 심층 분석
- **항목 4**: Futures와 비동기 프로그래밍
- **항목 5**: 동시성 프리미티브

## 참고 자료

- [Folly Contributing Guide](https://github.com/facebook/folly/blob/main/CONTRIBUTING.md)
- [Facebook Engineering Blog](https://engineering.fb.com/)
- [CppCon Folly 관련 발표들](https://www.youtube.com/results?search_query=cppcon+folly)
