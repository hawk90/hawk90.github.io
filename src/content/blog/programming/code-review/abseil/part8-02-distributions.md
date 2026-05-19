---
title: "Part 8-02: Distributions (Uniform, Exponential 등)"
date: 2026-05-24T22:00:00
description: "absl::Uniform, Gaussian, Exponential, Poisson 등 — std::*_distribution의 클래스 객체를 함수 호출로 평탄화."
series: "Abseil Code Review"
seriesOrder: 45
tags: [cpp, abseil, random, distribution, statistics]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

## 분포 API의 형태

Abseil 분포는 모두 *자유 함수* 다. URBG를 첫 인자로, 분포 파라미터를 그 뒤로.

```cpp
absl::BitGen bg;

int    u  = absl::Uniform(bg, 0, 10);
double g  = absl::Gaussian<double>(bg, 0.0, 1.0);
double e  = absl::Exponential<double>(bg, 1.0);
int    p  = absl::Poisson<int>(bg, 5.0);
bool   b  = absl::Bernoulli(bg, 0.5);
double z  = absl::Zipf<double>(bg, 100, 2.0);
double lr = absl::LogUniform<double>(bg, 1, 1000);
```

`std::uniform_int_distribution`처럼 *분포 객체를 미리 만들 필요가 없다*. 매 호출이 stateless다(파라미터는 매번 전달).

## Uniform — 가장 자주 쓰는

`Uniform`은 정수·실수 모두 지원한다. 두 형태가 있다.

```cpp
// 기본 — [a, b) (정수·실수 동일)
int i = absl::Uniform(bg, 0, 100);

// interval tag 명시
int j = absl::Uniform(absl::IntervalClosed, bg, 1, 6);     // [1, 6]
int k = absl::Uniform(absl::IntervalOpen, bg, 0, 10);      // (0, 10)
int l = absl::Uniform(absl::IntervalOpenClosed, bg, 0, 9); // (0, 9]

// 단일 인자 — [0, n) 정수
int n = absl::Uniform(bg, 100);
```

타입 추론은 인자에서. 명시도 가능.

```cpp
auto x = absl::Uniform(bg, 0, 10);                // int
auto y = absl::Uniform(bg, 0.0, 1.0);             // double
auto z = absl::Uniform<int64_t>(bg, 0, 1'000'000); // 명시 타입
```

## Gaussian / Normal

정규 분포. 평균 `μ`와 표준편차 `σ`.

```cpp
double standard = absl::Gaussian<double>(bg, 0.0, 1.0);
double iq       = absl::Gaussian<double>(bg, 100.0, 15.0);
```

`absl::Gaussian`은 별칭(STL 호환)이고 정식 이름은 같은 함수다. `std::normal_distribution`과 동일한 통계.

## Exponential

지수 분포. 인자 `lambda`(rate).

```cpp
// 평균 = 1/lambda
double dt = absl::Exponential<double>(bg, 0.5);   // 평균 2.0
```

도착 간격(Poisson process의 inter-arrival) 시뮬레이션에 자주 쓴다.

## Poisson

이산 Poisson 분포. 인자 `mean`.

```cpp
int requests = absl::Poisson<int>(bg, 100.0);  // 평균 100건/유닛
```

부하 시뮬레이션이나 큐 도착 모델링.

## Bernoulli — 동전 던지기

```cpp
bool heads = absl::Bernoulli(bg, 0.5);    // 50%
bool rare  = absl::Bernoulli(bg, 0.01);   // 1% 확률
```

A/B 테스트, 샘플링 게이트에 깔끔.

```cpp
// 1% 샘플링 로깅
if (absl::Bernoulli(bg, 0.01)) {
    LOG(INFO) << expensive_dump;
}
```

## Zipf — 멱법칙

웹 트래픽, 단어 빈도, 캐시 키 분포에 자주 등장.

```cpp
// k ∈ [1, n], 가중치 ∝ 1 / k^s
int k = absl::Zipf<int>(bg, 1000, 1.0);   // 캐시 키 핫스팟 모방
```

## LogUniform — 로그 균등

자릿수가 균등하게 나오는 분포.

```cpp
// [1, 1000] 범위에서 자릿수 균등 (1자리, 2자리, 3자리가 같은 확률)
int latency = absl::LogUniform<int>(bg, 1, 1000);
```

응답 시간 분포 모델링이나 perf 테스트의 다양한 사이즈 생성에 적합.

## Beta

```cpp
double q = absl::Beta<double>(bg, alpha, beta);
```

베이지안 추정의 사전 분포에 흔히 등장. 알파/베타가 모두 1이면 균등 분포와 같다.

## 분포 카탈로그 요약

| 분포 | 함수 | 파라미터 | 용도 |
|------|------|----------|------|
| Uniform | `Uniform` | `(lo, hi)` | 일반 random |
| Gaussian | `Gaussian` | `(μ, σ)` | 정규 분포 |
| Exponential | `Exponential` | `(λ)` | 도착 간격 |
| Poisson | `Poisson` | `(mean)` | 카운트 |
| Bernoulli | `Bernoulli` | `(p)` | 동전, 샘플링 |
| Zipf | `Zipf` | `(n, s)` | 멱법칙, 핫스팟 |
| LogUniform | `LogUniform` | `(lo, hi)` | 자릿수 균등 |
| Beta | `Beta` | `(α, β)` | 베이지안 prior |

`std::*_distribution`은 거의 1:1로 대응이 있다(`std::geometric_distribution`만 Abseil에 직접 대응 없음 — 필요하면 `1 + Exponential / -log(1-p)`로 합성).

## 작은 예시 — 부하 생성기

```cpp
struct Request {
    absl::Time arrival;
    int size_bytes;
    int latency_budget_ms;
};

std::vector<Request> GenerateLoad(absl::BitGen& bg,
                                  absl::Duration window,
                                  double qps_mean) {
    std::vector<Request> out;
    absl::Time t = absl::Now();
    absl::Time end = t + window;

    while (t < end) {
        Request r;
        r.arrival = t;
        r.size_bytes = absl::LogUniform<int>(bg, 64, 1 << 20);
        r.latency_budget_ms = absl::Gaussian<int>(bg, 100, 30);
        out.push_back(r);

        // 다음 도착까지 Exponential 간격
        double dt = absl::Exponential<double>(bg, qps_mean);
        t += absl::Microseconds(static_cast<int64_t>(dt * 1e6));
    }
    return out;
}
```

stateless 함수 호출 덕분에 한 BitGen으로 여러 분포가 자연스럽게 섞인다.

## 회피 패턴

```cpp
// 회피 — std 분포 객체를 매번 생성
for (int i = 0; i < n; ++i) {
    std::normal_distribution<> dist(0, 1);   // ❌ 매번 객체 생성
    out[i] = dist(gen);
}

// Good — absl은 stateless
for (int i = 0; i < n; ++i) {
    out[i] = absl::Gaussian<double>(bg, 0, 1);
}
```

```cpp
// 회피 — 잘못된 interval 가정
int dice = absl::Uniform(bg, 1, 6);   // ❌ 1..5만 나옴

// Good
int dice = absl::Uniform(absl::IntervalClosed, bg, 1, 6);
```

## 정리

- 모든 분포가 *자유 함수*. URBG 첫 인자 + 파라미터.
- Stateless — 분포 객체를 들고 다닐 필요 없음.
- `Uniform`은 정수·실수 모두 `[a, b)` 기본. interval tag로 명시 변경.
- Gaussian/Exponential/Poisson/Bernoulli/Zipf/LogUniform/Beta가 표준 카탈로그.
- 같은 BitGen으로 여러 분포를 자유롭게 섞어 호출.

## 다음 장 예고

[Part 8-03: Mocking random](/blog/programming/code-review/abseil/part8-03-mocking-random) — 결정적 테스트를 위한 MockingBitGen.

## 관련 항목

- [Part 8-01: BitGen](/blog/programming/code-review/abseil/part8-01-bit-gen)
- [Part 8-04: Seeding & entropy](/blog/programming/code-review/abseil/part8-04-seeding-entropy)
- [원문 — Distributions](https://abseil.io/docs/cpp/guides/random#distribution-functions)
