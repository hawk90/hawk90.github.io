---
title: "Part 8-01: BitGen"
date: 2026-05-24T21:00:00
description: "absl::BitGen — std::mt19937 + std::uniform_int_distribution의 길고 verbose한 조합을 단일 호출로 압축한 random engine."
series: "Abseil Code Review"
seriesOrder: 44
tags: [cpp, abseil, random, bitgen, prng]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## std::의 random은 왜 불편한가

C++11 `<random>`은 강력하지만 일상 사용에 *boilerplate가 너무 많다*.

```cpp
// std — 일상 사용에도 세 단계
std::random_device rd;
std::mt19937 gen(rd());
std::uniform_int_distribution<int> dist(1, 100);
int x = dist(gen);
```

세 객체(엔진 시드, 엔진, 분포)를 매번 결합해야 한다. Abseil은 *함수 호출 하나* 로 압축한다.

```cpp
// absl
absl::BitGen bg;
int x = absl::Uniform(bg, 1, 101);   // [1, 101) — half-open
```

## BitGen의 정체

`absl::BitGen`은 *URBG*(Uniform Random Bit Generator) 컨셉을 만족하는 엔진이다. 내부적으로 `randen`이라는 SIMD 친화 알고리즘을 쓴다. 핵심 특성:

| 특성 | BitGen | `std::mt19937` |
|------|--------|----------------|
| 상태 크기 | 256바이트 | 2.5KB |
| 속도 | ~2× 빠름 | 기준 |
| 통계적 품질 | 더 좋음 (Crush 통과) | 통과(MT 고전) |
| 보안 | 비-cryptographic | 비-cryptographic |
| Seed | 자동 OS entropy | 사용자가 직접 |

자동 시드가 큰 차이다. `absl::BitGen bg;`만 써도 OS entropy로 시드된다. 결정적 재현성이 필요한 경우만 명시 시드를 쓴다.

```cpp
#include "absl/random/random.h"

absl::BitGen bg;                              // OS entropy로 시드
absl::SeedSeq seed{42, 1337};
absl::BitGen reproducible(seed);              // 결정적 시드
```

## 사용 — Uniform이 대부분

```cpp
absl::BitGen bg;

// 정수 [0, 10)
int i = absl::Uniform(bg, 0, 10);

// 정수 [0, 10] (closed)
int j = absl::Uniform(absl::IntervalClosed, bg, 0, 10);

// 실수 [0.0, 1.0)
double d = absl::Uniform(bg, 0.0, 1.0);

// 컨테이너에서 무작위 원소
std::vector<int> v = {1, 2, 3, 4, 5};
int pick = v[absl::Uniform(bg, 0u, v.size())];
```

interval tag로 경계 의미를 명시한다.

| Tag | 의미 |
|-----|------|
| `IntervalClosedClosed` / `IntervalClosed` | `[a, b]` |
| `IntervalClosedOpen` (기본) | `[a, b)` |
| `IntervalOpenOpen` / `IntervalOpen` | `(a, b)` |
| `IntervalOpenClosed` | `(a, b]` |

정수 기본은 `[a, b)`, 실수 기본도 동일. C++ STL의 `uniform_int_distribution`(`[a, b]` closed)과 다르다. 코드 리뷰에서 자주 헷갈리는 부분이다.

```cpp
// 회피 — std와 같은 closed 가정
int dice = absl::Uniform(bg, 1, 6);   // ❌ 6은 안 나옴

// Good
int dice = absl::Uniform(absl::IntervalClosed, bg, 1, 6);
```

## 그 외 분포

`Uniform` 외에도 다양한 분포가 자유 함수로 노출된다(다음 챕터에서 자세히).

```cpp
double mean = absl::Gaussian<double>(bg, 0.0, 1.0);
double exp = absl::Exponential<double>(bg, 1.0);
bool flag = absl::Bernoulli(bg, 0.5);
```

## InsecureBitGen — 더 가벼운 변종

랜덤 품질 요구가 낮은 곳(빠른 테스트 데이터, 디버그 셔플)에는 `absl::InsecureBitGen`이 있다.

```cpp
absl::InsecureBitGen ibg;   // 더 작은 상태, 더 빠름
int x = absl::Uniform(ibg, 0, 100);
```

다음과 같이 사용처를 나눈다.

| 용도 | 엔진 |
|------|------|
| Production 일반 random | `BitGen` |
| 테스트 데이터 생성 | `InsecureBitGen` |
| 암호학적 random | `BitGen` 안 됨 — `boringssl` `RAND_bytes` 사용 |

## 코드 리뷰에서 자주 보는 지적

```cpp
// 회피 — rand() 직접
int x = rand() % 100;
// 문제 — 모듈로 편향, locale 의존, 시드 불명

// Good
absl::BitGen bg;
int x = absl::Uniform(bg, 0, 100);
```

```cpp
// 회피 — BitGen을 인라인으로 매번 생성
int Pick() {
    absl::BitGen bg;          // ❌ 매 호출마다 256B 할당 + 시드
    return absl::Uniform(bg, 0, 100);
}

// Good — BitGen은 thread_local 또는 인스턴스 멤버
thread_local absl::BitGen tls_bg;
int Pick() { return absl::Uniform(tls_bg, 0, 100); }
```

## thread 안전성

`absl::BitGen`은 *thread-safe 하지 않다*. URBG 컨셉 자체가 상태를 변경하므로 동시 호출은 정의되지 않은 동작이다.

```cpp
// 회피 — 멀티스레드에서 공유
absl::BitGen shared;   // 데이터 레이스

// Good — thread_local 또는 mutex 보호
thread_local absl::BitGen tls;
```

대부분의 server는 `thread_local`이 정답이다. 매 스레드가 독립 BitGen을 가지면 lock-free.

## 한 줄 비교 — std vs absl random

| 작업 | std::random | absl::random |
|------|-------------|--------------|
| 엔진 + 시드 | 두 줄 | 한 줄(`BitGen bg;`) |
| Uniform int | dist 생성 + 호출 | `Uniform(bg, a, b)` |
| Closed interval | 기본 | `IntervalClosed` 명시 |
| 상태 크기 | 2.5KB (`mt19937`) | 256B |
| 속도 | 기준 | ~2× |
| Mocking | 없음 | `MockingBitGen` |

## 정리

- `absl::BitGen`은 자동 시드, 작은 상태, 빠른 randen 알고리즘.
- *분포는 자유 함수* — `Uniform`, `Gaussian`, `Exponential` 등.
- 정수·실수 기본 interval이 `[a, b)`(half-open). `IntervalClosed` 태그로 명시 변경.
- thread-safe 아님 — `thread_local` 패턴이 표준 사용.
- `InsecureBitGen`은 테스트·디버그용 더 가벼운 변종. 암호학 용도 *불가*.

## 다음 장 예고

[Part 8-02: Distributions](/blog/programming/code-review/abseil/part8-02-distributions) — Uniform 외 분포 카탈로그.

## 관련 항목

- [Part 8-03: Mocking random](/blog/programming/code-review/abseil/part8-03-mocking-random)
- [Part 8-04: Seeding & entropy](/blog/programming/code-review/abseil/part8-04-seeding-entropy)
- [원문 — Abseil Random](https://abseil.io/docs/cpp/guides/random)
