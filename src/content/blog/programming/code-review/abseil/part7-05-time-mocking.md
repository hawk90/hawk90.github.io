---
title: "absl::Time mocking — 테스트 친화 시간"
date: 2026-06-11T09:11:00
description: "테스트에서 절대 시간을 통제하기 — clock 주입 패턴과 absl::Now() 대체 전략."
series: "Abseil Code Review"
seriesOrder: 43
tags: [cpp, abseil, time, testing, mocking]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## absl::Now()를 직접 부르면 안 된다

`absl::Now()`를 라이브러리 코드에서 직접 부르면 테스트 가능성이 죽는다. 시간 의존 코드는 *외부에서 주입한 시계*를 통해 시간을 얻어야 한다.

```cpp
// 회피 — 테스트 불가
class Cache {
public:
    void Put(const Key& k, Value v) {
        entries_[k] = {std::move(v), absl::Now() + ttl_};  // ❌
    }
};
```

`Put`이 호출된 시각을 테스트가 통제할 수 없다. expiry 로직을 검증하려면 `sleep`을 써야 하고, 그러면 테스트가 느려지고 flaky해진다.

## Clock 추상

가장 단순한 해법은 시계 함수 객체를 받는 것이다.

```cpp
// Good — clock 주입
class Cache {
public:
    using Clock = std::function<absl::Time()>;

    explicit Cache(absl::Duration ttl, Clock clock = absl::Now)
        : ttl_(ttl), clock_(std::move(clock)) {}

    void Put(const Key& k, Value v) {
        entries_[k] = {std::move(v), clock_() + ttl_};
    }

    absl::optional<Value> Get(const Key& k) {
        auto it = entries_.find(k);
        if (it == entries_.end()) return absl::nullopt;
        if (it->second.expiry < clock_()) {
            entries_.erase(it);
            return absl::nullopt;
        }
        return it->second.value;
    }

private:
    absl::Duration ttl_;
    Clock clock_;
    struct Entry { Value value; absl::Time expiry; };
    absl::flat_hash_map<Key, Entry> entries_;
};
```

기본값이 `absl::Now`라 production 코드는 변화 없다. 테스트는 시계를 교체한다.

```cpp
TEST(CacheTest, EntryExpiresAfterTtl) {
    absl::Time now = absl::FromUnixSeconds(1'000'000);
    Cache cache(absl::Seconds(10), [&now]() { return now; });

    cache.Put("k", "v");
    EXPECT_THAT(cache.Get("k"), Optional(std::string("v")));

    now += absl::Seconds(15);
    EXPECT_EQ(cache.Get("k"), absl::nullopt);
}
```

## SimulatedClock 헬퍼

매번 `[&now](){ return now; }`를 쓰면 번거롭다. 헬퍼 클래스를 두면 깔끔하다.

```cpp
class SimulatedClock {
public:
    explicit SimulatedClock(absl::Time start = absl::UnixEpoch())
        : now_(start) {}

    absl::Time Now() const { return now_; }
    void Advance(absl::Duration d) { now_ += d; }
    void SetTime(absl::Time t) { now_ = t; }

    // std::function<absl::Time()>로 자동 변환
    operator std::function<absl::Time()>() const {
        return [this]() { return now_; };
    }

private:
    absl::Time now_;
};

TEST(CacheTest, EntryExpires) {
    SimulatedClock clock(absl::FromUnixSeconds(1'000'000));
    Cache cache(absl::Seconds(10), [&]() { return clock.Now(); });

    cache.Put("k", "v");
    clock.Advance(absl::Seconds(15));
    EXPECT_EQ(cache.Get("k"), absl::nullopt);
}
```

GoogleTest와 결합 시 fixture에 `SimulatedClock`을 두면 여러 테스트에서 재사용한다.

## sleep도 대체 가능

대기 코드도 같은 추상을 거치게 한다.

```cpp
// 회피
absl::SleepFor(absl::Seconds(1));   // ❌ 테스트가 실제로 1초 잠

// Good — Sleeper 주입
class TokenBucket {
public:
    using Sleeper = std::function<void(absl::Duration)>;

    TokenBucket(int rate, Sleeper sleeper = &absl::SleepFor)
        : rate_(rate), sleeper_(std::move(sleeper)) {}

    void Acquire() {
        if (TryAcquire()) return;
        sleeper_(WaitTime());
    }
};

// 테스트
absl::Duration total_slept = absl::ZeroDuration();
TokenBucket tb(10, [&](absl::Duration d) { total_slept += d; });
tb.Acquire();
EXPECT_GT(total_slept, absl::ZeroDuration());
```

## absl::Mutex의 condition timeout

`Mutex::AwaitWithTimeout`/`LockWhenWithTimeout`은 내부적으로 system clock에 의존한다. 이 영역만큼은 시뮬레이션이 어렵다(Abseil 자체가 mock 인터페이스를 공개하지 않음). 두 가지 우회:

1. **타임아웃을 작게 잡고 실시간 테스트** — 50ms 정도면 flaky 없이 동작.
2. **상위 계층 추상화** — `Notification`이나 `BlockingCounter`로 감싸 mock 가능한 인터페이스만 노출.

## 시계가 단조롭게 가는지

`absl::Now()`는 *wall clock*이라 NTP 보정으로 *뒤로 갈 수 있다*. timeout 측정에는 monotonic이 안전하다.

```cpp
// 회피 — wall clock 차이
absl::Time start = absl::Now();
DoWork();
absl::Duration elapsed = absl::Now() - start;   // 음수 가능

// Good — 시작/끝 모두 monotonic
auto start = std::chrono::steady_clock::now();
DoWork();
auto elapsed = std::chrono::steady_clock::now() - start;
```

Abseil은 monotonic clock을 직접 노출하지 않으므로 `std::chrono::steady_clock`을 그대로 쓴다. 짧은 elapsed 측정에는 이쪽이 안전.

## 빠른 패턴 — 한 줄 fake

코드 한 곳에서만 시간을 통제하면 되는 경우, lambda 한 줄로 충분하다.

```cpp
TEST(ExpiryTest, JustOver) {
    absl::Time t = absl::FromUnixSeconds(123);
    Expiry e(absl::Seconds(10), [&]() { return t; });

    EXPECT_FALSE(e.HasExpired());
    t += absl::Seconds(11);
    EXPECT_TRUE(e.HasExpired());
}
```

## absl 외부 옵션 — gtest_mock / Folly

GoogleTest 자체에는 시계 mock이 없다. 대안:

| 도구 | 특징 |
|------|------|
| `SimulatedClock` (직접) | 가장 단순. function 주입. |
| `folly::ManualClock` | std::chrono 기반, advance 가능. Folly와 함께 사용. |
| `std::chrono::utc_clock` (C++20) | 표준이지만 mock 인터페이스 부재. |

Abseil 친화 코드는 *함수 객체 주입* 이 가장 잘 어울린다. 추가 의존성 없음, 인터페이스 한 줄.

## 작은 예시 — Retry with backoff

```cpp
class RetryPolicy {
public:
    using Clock = std::function<absl::Time()>;
    using Sleeper = std::function<void(absl::Duration)>;

    RetryPolicy(int max_attempts, absl::Duration base,
                Clock clock = absl::Now, Sleeper sleeper = &absl::SleepFor)
        : max_attempts_(max_attempts), base_(base),
          clock_(std::move(clock)), sleeper_(std::move(sleeper)) {}

    template <typename Op>
    absl::Status Run(Op op) {
        absl::Time start = clock_();
        for (int attempt = 0; attempt < max_attempts_; ++attempt) {
            absl::Status s = op();
            if (s.ok()) return s;
            sleeper_(base_ * (1 << attempt));   // exponential
            if (clock_() - start > absl::Minutes(1)) {
                return absl::DeadlineExceededError("retry budget");
            }
        }
        return absl::DeadlineExceededError("max attempts");
    }
};

TEST(RetryPolicyTest, GivesUpAfterDeadline) {
    SimulatedClock clock;
    absl::Duration slept = absl::ZeroDuration();
    RetryPolicy p(100, absl::Seconds(1),
                  [&]() { return clock.Now(); },
                  [&](absl::Duration d) { slept += d; clock.Advance(d); });

    int calls = 0;
    auto s = p.Run([&]() { ++calls; return absl::UnknownError("nope"); });
    EXPECT_EQ(s.code(), absl::StatusCode::kDeadlineExceeded);
    EXPECT_LT(calls, 100);
    EXPECT_GT(slept, absl::Minutes(1));
}
```

## 정리

- `absl::Now()` 직접 호출은 테스트 가능성을 죽인다. 시계 함수를 *주입*한다.
- 기본값을 `absl::Now`로 두면 production 코드는 변화 없음.
- `SimulatedClock` 헬퍼로 boilerplate 축소.
- `SleepFor`도 동일하게 주입 가능 — `Sleeper` 함수 객체.
- monotonic 측정에는 `std::chrono::steady_clock` 사용. `absl::Now()`는 NTP로 역행 가능.

## 다음 장 예고

[Part 8-01: BitGen](/blog/programming/code-review/abseil/part8-01-bit-gen) — Abseil random engine.

## 관련 항목

- [Part 7-01: Time / Duration overview](/blog/programming/code-review/abseil/part7-01-time-duration-overview)
- [Part 6-03: Notification](/blog/programming/code-review/abseil/part6-03-notification) — 동기화 타임아웃과 시계 mock
- [Part 8-03: Mocking random](/blog/programming/code-review/abseil/part8-03-mocking-random) — 같은 정신의 random mock
- [원문 — Test time](https://abseil.io/docs/cpp/guides/time#testing)
