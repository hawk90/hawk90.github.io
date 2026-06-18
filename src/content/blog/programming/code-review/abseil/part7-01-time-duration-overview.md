---
title: "absl::Time·Duration 분석 — 단단한 type"
date: 2026-06-11T09:07:00
description: "absl::Time과 absl::Duration — std::chrono의 위에 한 겹을 더 씌워 단위 혼동과 부호 오류를 컴파일러가 잡아내게 만든 layer."
series: "Abseil Code Review"
seriesOrder: 39
tags: [cpp, abseil, time, duration, type-safety]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 왜 또 하나의 시간 라이브러리인가

C++11에 `<chrono>`가 들어왔는데도 Google이 `absl::Time`을 따로 만든 이유는 단순하다. `std::chrono`는 강력하지만 *너무 일반화* 되어 있고, 일반 엔지니어가 매일 쓰기에는 boilerplate가 많다. 시간대(time zone), 달력(civil time), mocking 같은 일상 작업에서 표준은 침묵한다(C++20에서 일부 보강되었으나 14/17 코드베이스에는 무용지물이다).

Abseil은 두 가지 핵심 타입만 둔다.

- `absl::Time` — 어떤 *순간*. UTC epoch 기준의 단일 timestamp.
- `absl::Duration` — 두 순간 사이의 *간격*. 부호 있는 길이.

그 외 달력은 `absl::CivilDay`, 시간대는 `absl::TimeZone`으로 분리한다. 각 타입이 한 가지 의미만 가지므로 함수 시그니처에 의도가 그대로 드러난다.

`std::chrono`와의 차이를 항목별로 비교하면 다음과 같다.

![absl::Time/Duration vs std::chrono](/images/blog/abseil/diagrams/part7-01-time-vs-chrono.svg)

## 단위 안전 — Duration이 부동소수처럼 보이는 이유

`absl::Duration`은 내부적으로 nanosecond resolution이지만 사용자는 단위를 의식하지 않는다.

```cpp
#include "absl/time/time.h"

absl::Duration timeout = absl::Seconds(30);
absl::Duration jitter  = absl::Milliseconds(250);
absl::Duration total   = timeout + jitter;  // 자동 합산
```

단위 변환이 *생성자*가 아니라 *팩토리 함수*로만 일어난다. 그래서 다음과 같은 코드는 컴파일되지 않는다.

```cpp
// 회피 — 단위 명시 없는 정수 대입
absl::Duration d = 30;          // ❌ 컴파일 에러
void Sleep(absl::Duration d);
Sleep(1000);                    // ❌ 1초인지 1ms인지 모름
```

```cpp
// Good — 단위가 함수 호출에 박혀 있음
Sleep(absl::Seconds(1));        // ✅ 명백
Sleep(absl::Milliseconds(1));   // ✅ 명백
```

`std::chrono::seconds`와 비교하면 차이가 분명하다. chrono는 `std::chrono::seconds{1}`처럼 타입 자체가 단위를 인코딩한다. Abseil은 단일 타입(`Duration`)에 *팩토리* 단위를 분리한다. 이쪽이 API 시그니처가 한결 깔끔하다.

```cpp
// std::chrono — 단위마다 다른 타입
void Wait(std::chrono::seconds s);
void Wait(std::chrono::milliseconds ms);  // 오버로드 폭발

// abseil — 단일 타입
void Wait(absl::Duration d);
```

## Time — UTC epoch 기준 단일 timestamp

`absl::Time`은 *순간*만 표현한다. 시간대도, 달력도 모른다.

```cpp
absl::Time start = absl::Now();
DoExpensiveWork();
absl::Duration elapsed = absl::Now() - start;  // Time - Time = Duration

if (elapsed > absl::Seconds(5)) {
    LOG(WARNING) << "Slow: " << elapsed;
}
```

산술 규칙이 직관적이다.

| 연산 | 결과 |
|------|------|
| `Time + Duration` | `Time` |
| `Time - Time` | `Duration` |
| `Duration + Duration` | `Duration` |
| `Duration * double` | `Duration` |
| `Duration / Duration` | `double` (비율) |

`Time + Time`은 *컴파일 에러*다. epoch 합산은 의미가 없으므로 타입이 막는다. 이런 정적 안전성은 `std::chrono::time_point + time_point`도 동일하게 막지만, Abseil은 단일 `Time` 타입으로 묶어 사용 측 boilerplate를 줄였다.

## Duration의 음수 — 부호 있는 간격

`absl::Duration`은 부호 있는 값이다.

```cpp
absl::Duration d = absl::Seconds(-3);  // OK
absl::Duration negated = -timeout;     // 부호 반전

if (deadline - absl::Now() < absl::ZeroDuration()) {
    // 이미 지난 deadline
}
```

`absl::InfiniteDuration()`과 `-absl::InfiniteDuration()`도 valid한 값이다. 산술에 자연스럽게 흡수된다.

```cpp
absl::Duration timeout = WantsBlocking() ? absl::InfiniteDuration()
                                          : absl::Seconds(5);
// timeout이 무한이면 Wait()는 영원히 대기
mutex.LockWhenWithTimeout(condition, timeout);
```

## 단위 추출 — 명시적 변환

`Duration` → 정수/실수 변환은 *손실 가능성을 명시* 하는 함수 이름을 쓴다.

```cpp
absl::Duration d = absl::Microseconds(1500);

int64_t us = absl::ToInt64Microseconds(d);   // 1500
int64_t ms = absl::ToInt64Milliseconds(d);   // 1  (정수 절단)
double   s = absl::ToDoubleSeconds(d);       // 0.0015

// 회피 — 단위 모호한 추출 시도
int64_t raw = d.count();                     // ❌ 그런 메서드 없음
```

`absl::ToInt64*`는 *0 방향 절단*을 한다. 반올림이 필요하면 `Trunc`/`Floor`/`Ceil`/`Round`를 명시적으로 부른다.

```cpp
absl::Duration ms = absl::Trunc(d, absl::Milliseconds(1));  // ms 단위로 절단
absl::Duration ms2 = absl::Round(d, absl::Milliseconds(1)); // ms 단위로 반올림
```

## 한 줄 비교 — chrono vs absl

| 작업 | std::chrono | abseil |
|------|-------------|--------|
| 지금 시각 | `std::chrono::system_clock::now()` | `absl::Now()` |
| 5초 후 | `now + std::chrono::seconds{5}` | `absl::Now() + absl::Seconds(5)` |
| 정수 ms 추출 | `duration_cast<ms>(d).count()` | `absl::ToInt64Milliseconds(d)` |
| 단위 명시 | 타입(`seconds`, `milliseconds`...) | 팩토리(`Seconds`, `Milliseconds`...) |
| 시간대 변환 | C++20부터 `zoned_time` | `absl::TimeZone` + `ConvertDateTime` |
| Mocking | 표준에 없음 | `TestTime` 또는 시계 주입 |

## 코드 리뷰에서 자주 보는 지적

```cpp
// 회피 — 단위 없는 raw int
void RetryAfter(int seconds);
RetryAfter(60);  // 분? 초?

// Good — Duration으로 단위 박제
void RetryAfter(absl::Duration delay);
RetryAfter(absl::Minutes(1));
```

```cpp
// 회피 — 시간 비교에 raw 정수 ms
if (elapsed_ms > 5000) { /* ... */ }

// Good — Duration끼리 비교
if (elapsed > absl::Seconds(5)) { /* ... */ }
```

```cpp
// 회피 — std::time_t 그대로 노출
std::time_t deadline = ...;

// Good — absl::Time으로 캡슐화
absl::Time deadline = absl::FromTimeT(legacy);
```

## 정리

- `absl::Time`은 *순간*, `absl::Duration`은 *간격*. 두 타입의 산술 규칙이 의미를 강제한다.
- 단위는 *팩토리 함수*에 박혀 있어 정수 대입이 컴파일되지 않는다.
- 추출은 `ToInt64*`/`ToDouble*`로 명시. 절단/반올림이 코드에 드러난다.
- 무한·음수가 valid value. 분기 없이 산술에 그대로 흡수된다.
- chrono보다 표면적이 좁아 일상 코드의 시그니처가 한결 단순하다.

## 다음 장 예고

[Part 7-02](/blog/programming/code-review/abseil/part7-02-format-parse)에서는 `FormatTime`/`ParseTime`으로 RFC3339·strftime 호환 포맷을 다룬다.

## 관련 항목

- [Part 6-01: absl::Mutex vs std::mutex](/blog/programming/code-review/abseil/part6-01-mutex) — `Duration` 기반 timeout API
- [Part 7-03: CivilTime](/blog/programming/code-review/abseil/part7-03-civil-time)
- [Effective Modern C++ — 항목 7: chrono 활용](/blog/programming/cpp/effective-modern-cpp)
- [원문 — Abseil Time](https://abseil.io/docs/cpp/guides/time)
