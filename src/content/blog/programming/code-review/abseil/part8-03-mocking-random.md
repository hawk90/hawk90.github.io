---
title: "Part 8-03: Mocking random"
date: 2026-05-24T23:00:00
description: "MockingBitGen — 분포 호출의 결과값을 결정적으로 강제. flaky random 테스트를 끝낸다."
series: "Abseil Code Review"
seriesOrder: 46
tags: [cpp, abseil, random, mock, testing]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## random 테스트의 두 가지 함정

랜덤이 들어간 코드를 테스트하는 두 가지 흔한 시도가 있고 둘 다 좋지 않다.

```cpp
// 함정 1 — 시드 고정
absl::BitGen bg(absl::SeedSeq{42});
int x = absl::Uniform(bg, 0, 100);
EXPECT_EQ(x, 73);   // ❌ Abseil 버전 업그레이드 시 깨짐
```

`absl::BitGen`의 정확한 출력 시퀀스는 ABI가 아니다. 라이브러리 버전이 바뀌면 같은 시드도 다른 값을 낸다.

```cpp
// 함정 2 — 통계적 검증
for (int i = 0; i < 1000; ++i) total += absl::Uniform(bg, 0, 100);
EXPECT_NEAR(total / 1000.0, 50.0, 1.0);   // ⚠️ 가끔 깨짐
```

평균 검증은 *언젠가* 깨진다. flaky test의 단골이다.

## MockingBitGen — 분포별 결과 강제

Abseil은 *분포 호출 자체*를 mock할 수 있는 인터페이스를 제공한다.

```cpp
#include "absl/random/mocking_bit_gen.h"
#include "absl/random/mock_distributions.h"

TEST(MyClassTest, RetriesOnRare) {
    absl::MockingBitGen bg;

    // 다음 호출에서 Bernoulli(0.01)을 true로 강제
    EXPECT_CALL(absl::MockBernoulli(), Call(bg, 0.01))
        .WillOnce(testing::Return(true));

    MyClass m(&bg);
    m.MaybeRetry();   // 내부적으로 Bernoulli(bg, 0.01) 호출
}
```

`MockingBitGen`은 URBG 컨셉을 만족하지만, `Uniform`/`Bernoulli`/`Gaussian` 호출이 들어오면 *gmock matcher*로 가로챈다.

## 분포별 Mock 매크로

각 분포마다 짝지어진 Mock 클래스가 있다.

| 분포 | Mock |
|------|------|
| `Uniform` | `MockUniform<T>()` |
| `Bernoulli` | `MockBernoulli()` |
| `Gaussian` | `MockGaussian<T>()` |
| `Exponential` | `MockExponential<T>()` |
| `Poisson` | `MockPoisson<T>()` |
| `Zipf` | `MockZipf<T>()` |
| `LogUniform` | `MockLogUniform<T>()` |
| `Beta` | `MockBeta<T>()` |

사용 패턴은 동일하다.

```cpp
absl::MockingBitGen bg;

EXPECT_CALL(absl::MockUniform<int>(), Call(bg, 0, 100))
    .WillOnce(testing::Return(42));

int x = absl::Uniform(bg, 0, 100);
EXPECT_EQ(x, 42);
```

## ON_CALL vs EXPECT_CALL

`EXPECT_CALL`은 호출이 *반드시 일어남*을 검증. `ON_CALL`은 호출이 일어나면 *이렇게 답한다*는 행동 정의(검증 없음).

```cpp
// 호출 보장 + 응답
EXPECT_CALL(absl::MockBernoulli(), Call(bg, 0.01))
    .WillOnce(testing::Return(true));

// 호출 여부 무관, 호출되면 응답
ON_CALL(absl::MockBernoulli(), Call(bg, testing::_))
    .WillByDefault(testing::Return(false));
```

코드 리뷰에서 자주 보는 패턴:
- 핵심 분기를 결정짓는 호출 → `EXPECT_CALL`
- 기본 행동만 정의(호출 횟수 무관) → `ON_CALL`

## Matcher로 인자 캡처

분포 파라미터에 matcher를 쓸 수 있다.

```cpp
// p가 무엇이든 true 반환
EXPECT_CALL(absl::MockBernoulli(), Call(bg, testing::_))
    .WillRepeatedly(testing::Return(true));

// p가 특정 범위면 true
EXPECT_CALL(absl::MockBernoulli(),
            Call(bg, testing::Lt(0.5)))
    .WillOnce(testing::Return(true));
```

`Sequence`로 호출 순서를 지정하거나 `Times`로 횟수를 박을 수도 있다.

```cpp
testing::InSequence seq;
EXPECT_CALL(absl::MockUniform<int>(), Call(bg, 0, 10))
    .Times(3)
    .WillRepeatedly(testing::Return(5));
```

## 통과시키기 — DefaultBitGenRef

mock하지 않은 분포 호출은 *진짜 random* 으로 통과시키는 옵션도 있다.

```cpp
EXPECT_CALL(absl::MockBernoulli(), Call(bg, 0.01))
    .WillOnce(testing::Return(true));

// Uniform 호출은 mock 안 함 → 실제 BitGen으로 fallback
int x = absl::Uniform(bg, 0, 10);
```

`MockingBitGen`은 내부적으로 실제 `BitGen`을 들고 있어 mock되지 않은 호출은 그쪽으로 보낸다.

## 작은 예시 — A/B 테스트 분기

```cpp
class FeatureFlag {
public:
    explicit FeatureFlag(absl::BitGenRef bg) : bg_(bg) {}

    bool IsEnabled(absl::string_view user_id) {
        // hash(user_id)를 [0, 1)로 매핑 — 결정적
        // 그 위에 1% 트래픽을 신기능에 라우팅
        double h = HashToUnit(user_id);
        if (h < 0.01) return true;
        return absl::Bernoulli(bg_, 0.5);   // 5050 분기
    }

private:
    absl::BitGenRef bg_;
};

TEST(FeatureFlagTest, RoutesBy5050) {
    absl::MockingBitGen bg;

    EXPECT_CALL(absl::MockBernoulli(), Call(bg, 0.5))
        .WillOnce(testing::Return(true))
        .WillOnce(testing::Return(false));

    FeatureFlag ff(bg);
    EXPECT_TRUE(ff.IsEnabled("user_a"));    // Bernoulli → true
    EXPECT_FALSE(ff.IsEnabled("user_b"));   // Bernoulli → false
}
```

## BitGenRef — 인터페이스 추상

`absl::BitGenRef`는 URBG 컨셉의 type-erased reference. mock과 실제 BitGen 모두 받는다.

```cpp
class Sampler {
public:
    explicit Sampler(absl::BitGenRef bg) : bg_(bg) {}
    int Pick() { return absl::Uniform(bg_, 0, 100); }

private:
    absl::BitGenRef bg_;   // ref-like, 가벼움
};

// Production
absl::BitGen real;
Sampler s(real);

// Test
absl::MockingBitGen mock;
Sampler s_test(mock);
```

`BitGenRef`로 받으면 호출자 측에서 BitGen 종류를 자유롭게 바꾼다.

## 회피 패턴

```cpp
// 회피 — 시드 고정으로 출력 검증
absl::BitGen bg(absl::SeedSeq{42});
EXPECT_EQ(absl::Uniform(bg, 0, 100), 73);   // ❌ ABI 의존

// Good — Mocking으로 결과 강제
absl::MockingBitGen mbg;
EXPECT_CALL(absl::MockUniform<int>(), Call(mbg, 0, 100))
    .WillOnce(testing::Return(73));
```

```cpp
// 회피 — random을 의존성으로 못 주입
class MyClass {
    absl::BitGen bg_;   // ❌ 내부 생성 — 테스트 불가
};

// Good — BitGenRef로 주입
class MyClass {
public:
    explicit MyClass(absl::BitGenRef bg) : bg_(bg) {}
private:
    absl::BitGenRef bg_;
};
```

## 정리

- 시드 고정으로 출력값 검증은 안 된다 — ABI가 아니다.
- `MockingBitGen` + `MockXxx()`로 *분포 호출 결과*를 강제.
- 코드는 `absl::BitGenRef`로 주입받게 설계 — production·테스트 동일 인터페이스.
- mock 안 한 호출은 내부 실제 BitGen으로 통과.
- gmock matcher(`_`, `Lt`, `Ge`)로 파라미터 조건 표현.

## 다음 장 예고

[Part 8-04: Seeding & entropy](/blog/programming/code-review/abseil/part8-04-seeding-entropy) — 시드 관리와 보안 고려.

## 관련 항목

- [Part 8-01: BitGen](/blog/programming/code-review/abseil/part8-01-bit-gen)
- [Part 7-05: Time mocking](/blog/programming/code-review/abseil/part7-05-time-mocking) — 같은 정신의 clock mock
- [원문 — Random Mocking](https://abseil.io/docs/cpp/guides/random#mocking-bit-generators)
