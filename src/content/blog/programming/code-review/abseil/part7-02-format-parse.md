---
title: "absl::Time Format·Parse"
date: 2026-06-11T09:08:00
description: "FormatTime, ParseTime — Abseil이 strftime/RFC3339를 한 함수로 흡수하는 방법."
series: "Abseil Code Review"
seriesOrder: 40
tags: [cpp, abseil, time, format, parse]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## FormatTime — 단일 진입점

표준 라이브러리의 시간 포맷팅은 `std::put_time`, `std::strftime`, `std::format`(C++20) 셋으로 갈라져 있다. Abseil은 `absl::FormatTime` 하나로 통합한다.

```cpp
#include "absl/time/time.h"

absl::Time t = absl::Now();
absl::TimeZone utc = absl::UTCTimeZone();

std::string s = absl::FormatTime("%Y-%m-%dT%H:%M:%S%Ez", t, utc);
// "2026-05-24T16:23:45+00:00"
```

세 가지 형태가 있다.

| 호출 | 결과 |
|------|------|
| `FormatTime(t)` | 기본 — RFC3339, UTC, 나노초 포함 |
| `FormatTime(format, t, tz)` | 사용자 포맷 |
| `FormatTime(format, t, tz, fmt_kind)` | 추가 옵션(드물게 사용) |

## 포맷 specifier

`strftime` 계열을 따르되 RFC3339 친화 확장을 추가한다.

```cpp
absl::Time t = absl::FromCivil(absl::CivilSecond(2026, 5, 24, 16, 23, 45), utc);

absl::FormatTime("%Y-%m-%d %H:%M:%S", t, utc);
// "2026-05-24 16:23:45"

absl::FormatTime("%E4Y-%m-%d", t, utc);
// "2026-05-24"  — %E4Y는 4자리 연도 보장

absl::FormatTime("%H:%M:%E*S", t, utc);
// "16:23:45"   — %E*S는 가변 정밀도 초(소수점 자동 트림)

absl::FormatTime("%Ez", t, utc);
// "+00:00"     — RFC3339 시간대 오프셋
```

`%E` 접두는 Abseil 확장이다. `*` 부분은 정밀도 가변, 숫자는 고정 자릿수.

| Specifier | 의미 |
|-----------|------|
| `%Y`, `%m`, `%d` | 연/월/일 |
| `%H`, `%M`, `%S` | 시/분/초 |
| `%E4Y` | 4자리 연도(음수도 처리) |
| `%E*S` | 초 + 자동 소수점 |
| `%E3S` | 초 + 3자리 소수점(ms) |
| `%E6S` | 초 + 6자리 소수점(μs) |
| `%Ez` | `+HH:MM` 시간대 |
| `%E*z` | `+HHMM` 또는 `+HH:MM`(원본 유지) |

## 미리 정의된 포맷 문자열

자주 쓰는 포맷은 상수로 제공한다.

```cpp
absl::FormatTime(absl::RFC3339_full, t, utc);
// "2026-05-24T16:23:45.123456789+00:00"

absl::FormatTime(absl::RFC3339_sec, t, utc);
// "2026-05-24T16:23:45+00:00"

absl::FormatTime(absl::RFC1123_full, t, utc);
// "Sun, 24 May 2026 16:23:45 +0000"

absl::FormatTime(absl::RFC1123_no_wday, t, utc);
// "24 May 2026 16:23:45 +0000"
```

코드 리뷰에서 *직접 만든 포맷 문자열* 보다 상수를 권장한다. 일관성과 검색성이 좋아진다.

## ParseTime — 반대 방향

```cpp
absl::Time parsed;
std::string err;
if (!absl::ParseTime("%Y-%m-%d %H:%M:%S", "2026-05-24 16:23:45", utc, &parsed, &err)) {
    LOG(ERROR) << "parse failed: " << err;
}
```

시그니처는 출력 매개변수 두 개를 받는다.

```cpp
bool ParseTime(absl::string_view format,
               absl::string_view input,
               absl::TimeZone tz,
               absl::Time* time,
               std::string* err);
```

세 번째 인자가 `TimeZone`이다. 포맷에 시간대 specifier(`%z`, `%Ez`)가 *없을 때* 이 시간대로 해석한다. 있으면 입력이 우선한다.

```cpp
// 입력에 시간대 없음 → utc로 해석
absl::ParseTime("%Y-%m-%d %H:%M:%S", "2026-05-24 16:00:00", utc, &t, &err);

// 입력에 +09:00 있음 → KST로 해석 (utc 인자는 무시)
absl::ParseTime("%Y-%m-%dT%H:%M:%S%Ez", "2026-05-24T16:00:00+09:00", utc, &t, &err);
```

## 흔한 파싱 함정

### 1. ISO8601 'Z' 표기

```cpp
// 회피 — Z를 직접 매칭 시도
absl::ParseTime("%Y-%m-%dT%H:%M:%SZ", "2026-05-24T16:00:00Z", utc, &t, &err);
// ❌ false — Z는 specifier로 인식 안 됨

// Good — %Ez가 Z를 함께 처리
absl::ParseTime("%Y-%m-%dT%H:%M:%S%Ez", "2026-05-24T16:00:00Z", utc, &t, &err);
```

### 2. 가변 정밀도 초

```cpp
// 회피 — 고정 자릿수 specifier로 가변 입력 파싱
absl::ParseTime("%H:%M:%E6S", "16:00:00.123", utc, &t, &err);
// ❌ 실패 — 입력은 3자리, specifier는 6자리

// Good — %E*S로 가변 매칭
absl::ParseTime("%H:%M:%E*S", "16:00:00.123", utc, &t, &err);
```

### 3. 빈 err 문자열

`ParseTime`은 *실패 시에만* `err`에 쓴다. 호출 전 비워둘 필요는 없지만, 성공/실패 분기는 반드시 반환값으로 판단한다.

```cpp
// 회피
absl::ParseTime(fmt, in, utc, &t, &err);
if (!err.empty()) { /* ... */ }   // ❌ 이전 호출의 잔재일 수 있음

// Good
if (!absl::ParseTime(fmt, in, utc, &t, &err)) { /* ... */ }
```

## 로깅·직렬화 표준화

Abseil의 `LOG(INFO) << absl::Now()`는 자동으로 RFC3339_full을 사용한다. 직접 포맷팅이 필요한 곳에서도 RFC3339 상수를 쓰면 ELK·Splunk 같은 로그 수집기가 그대로 인식한다.

```cpp
// 권장 — 로그/JSON/protobuf 직렬화
std::string ts = absl::FormatTime(absl::RFC3339_full, t, absl::UTCTimeZone());

// 회피 — locale 의존 strftime
char buf[64];
std::time_t tt = absl::ToTimeT(t);
std::strftime(buf, sizeof(buf), "%c", std::localtime(&tt));
// ❌ locale·timezone에 따라 결과가 흔들림
```

## 작은 예시 — HTTP 요청 처리

```cpp
absl::StatusOr<RequestStamp> ParseStamp(absl::string_view header) {
    absl::Time t;
    std::string err;
    if (!absl::ParseTime(absl::RFC1123_full, header,
                         absl::UTCTimeZone(), &t, &err)) {
        return absl::InvalidArgumentError(
            absl::StrCat("bad Date header: ", err));
    }

    if (t > absl::Now() + absl::Minutes(5)) {
        return absl::InvalidArgumentError("clock skew too large");
    }

    return RequestStamp{t};
}
```

## 정리

- `FormatTime`/`ParseTime` — 시간 ↔ 문자열 변환의 단일 진입점.
- `%E*S`, `%E4Y`, `%Ez` 등 Abseil 확장이 RFC3339 정확도를 보장한다.
- 미리 정의된 `RFC3339_full`, `RFC1123_full` 상수를 우선 사용.
- `ParseTime`은 반환값 `bool`로 분기, `err`는 진단용으로만.
- 로그·직렬화는 UTC + RFC3339_full로 통일하면 다운스트림 도구와 호환된다.

## 다음 장 예고

[Part 7-03: CivilTime](/blog/programming/code-review/abseil/part7-03-civil-time) — 시간대와 무관한 달력 산술.

## 관련 항목

- [Part 7-01: Time / Duration overview](/blog/programming/code-review/abseil/part7-01-time-duration-overview-overview)
- [Part 7-04: TimeZone](/blog/programming/code-review/abseil/part7-04-time-zone)
- [Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check) — 자동 timestamp 포맷
- [원문 — Format/Parse](https://abseil.io/docs/cpp/guides/time#formatting-and-parsing)
