---
title: "absl::time_zone 분석"
date: 2026-06-11T09:10:00
description: "absl::TimeZone — IANA TZ database 위에 얹은 안전한 변환 layer. UTC가 아닌 시각을 다루는 모든 코드가 거쳐야 할 관문."
series: "Abseil Code Review"
seriesOrder: 42
tags: [cpp, abseil, time, timezone, iana]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 시간대는 분류 문제다

UTC·로컬시간·IANA 이름·POSIX TZ 환경 변수 — 동일한 개념을 표현하는 방법이 너무 많다. Abseil은 *한 가지*만 인정한다: **IANA 이름**(`"Asia/Seoul"`, `"America/Los_Angeles"`). 이걸 통해 DST·역사적 오프셋 변경·UTC 변환을 정확히 처리한다.

```cpp
#include "absl/time/time.h"

absl::TimeZone seoul;
if (!absl::LoadTimeZone("Asia/Seoul", &seoul)) {
    return absl::InternalError("TZ DB missing");
}

absl::TimeZone utc = absl::UTCTimeZone();
absl::TimeZone local = absl::LocalTimeZone();   // 시스템 기본
```

## TimeZone의 의미론

`absl::TimeZone`은 *값* 이다. 가볍게 복사·전달 가능. 내부적으로 IANA DB의 항목 포인터만 들고 있다.

`LoadTimeZone`은 비싸지만(파일 로드) 캐시된다. 같은 이름을 반복해 불러도 첫 호출 이후는 빠르다.

## 변환의 세 시나리오

### 1. UTC Time → Civil (지역 시계)

```cpp
absl::Time t = absl::Now();
absl::CivilSecond cs = absl::ToCivilSecond(t, seoul);
// "지금이 한국 시계로 몇 시인가"
```

### 2. Civil + TimeZone → UTC Time

```cpp
absl::CivilSecond cs(2026, 5, 24, 9, 0, 0);
absl::Time t = absl::FromCivil(cs, seoul);
// "한국 시각 09:00은 절대 시간으로 언제인가"
```

### 3. Time → Time (시간대만 바꾼 표현)

`absl::Time`은 시간대를 *모른다*. UTC epoch 기준 절대값이므로 "시간대 변환"이라는 개념이 없다. 변환은 항상 *표시 시점*에 일어난다.

```cpp
absl::Time t = absl::Now();
std::string seoul_str = absl::FormatTime(absl::RFC3339_full, t, seoul);
std::string la_str    = absl::FormatTime(absl::RFC3339_full, t, la);
// 같은 t, 다른 표시
```

이 점이 가장 헷갈리는데, 한 번 익히면 코드가 훨씬 깨끗해진다. 내부 저장은 항상 `absl::Time`(UTC epoch), 표시·파싱 시점에만 `TimeZone`이 등장한다.

## DST 모호성 처리

봄/가을의 DST 전환 시각은 *민감*하다. 한 시각이 사라지거나 두 번 나타난다.

```cpp
absl::TimeZone la;
absl::LoadTimeZone("America/Los_Angeles", &la);

absl::CivilSecond skipped(2026, 3, 8, 2, 30, 0);  // DST 시작 — 02:30 없음
absl::TimeZone::CivilInfo info = la.At(skipped);

switch (info.kind) {
    case absl::TimeZone::CivilInfo::UNIQUE:
        // 보통 경우
        break;
    case absl::TimeZone::CivilInfo::SKIPPED:
        // DST 시작 — 시각이 존재하지 않음
        // info.trans: 전환 직후 시각
        // info.pre / info.post: 두 가지 해석
        break;
    case absl::TimeZone::CivilInfo::REPEATED:
        // DST 종료 — 시각이 두 번 일어남
        break;
}
```

`FromCivil`은 분기 없이 부르면 *합리적 기본값*(보통 post-transition)을 선택한다. 청구·알람처럼 정확도가 중요한 곳만 `At()`로 명시 처리한다.

## 시스템 TimeZone

`absl::LocalTimeZone()`은 OS에 따라 다음을 본다.

| OS | 출처 |
|----|------|
| Linux/macOS | `TZ` 환경 변수 → `/etc/localtime` symlink |
| Windows | 레지스트리 + ICU |

서버 코드는 *명시적 TZ*를 권장한다. 운영자가 머신 시간대를 바꾸면 동작이 달라지는 일을 막는다.

```cpp
// 회피 — 호스트 의존
auto local = absl::LocalTimeZone();

// Good — 서비스 TZ 명시
absl::TimeZone svc;
ABSL_CHECK(absl::LoadTimeZone(absl::GetFlag(FLAGS_service_timezone), &svc));
```

## TZ DB 가용성

`LoadTimeZone`은 OS의 zoneinfo 파일(`/usr/share/zoneinfo`)을 읽는다. 컨테이너 베이스 이미지가 *slim*이면 zoneinfo가 없을 수 있다.

```dockerfile
# Debian slim
RUN apt-get install -y tzdata

# Alpine
RUN apk add --no-cache tzdata
```

Abseil은 zoneinfo 파일이 없으면 `LoadTimeZone`이 false를 반환한다. 빌드에 임베드된 zoneinfo가 필요하면 `absl::FixedTimeZone(offset_seconds)`로 폴백한다.

```cpp
absl::TimeZone svc;
if (!absl::LoadTimeZone("Asia/Seoul", &svc)) {
    LOG(WARNING) << "tzdata missing, using +09:00 fixed";
    svc = absl::FixedTimeZone(9 * 60 * 60);
}
```

`FixedTimeZone`은 DST·역사적 변경을 모른다. 비상용에 한정.

## 작은 예시 — 사용자 별 알림 시간

```cpp
struct User {
    std::string id;
    std::string tz_name;   // "Asia/Seoul" 등
    absl::CivilSecond preferred_local;  // 09:00:00 등
};

absl::Time NextNotification(const User& u, absl::Time now) {
    absl::TimeZone tz;
    if (!absl::LoadTimeZone(u.tz_name, &tz)) {
        tz = absl::UTCTimeZone();
    }

    absl::CivilDay today = absl::ToCivilDay(now, tz);
    absl::CivilSecond candidate(today, u.preferred_local.hour(),
                                       u.preferred_local.minute(),
                                       u.preferred_local.second());
    absl::Time t = absl::FromCivil(candidate, tz);

    if (t <= now) {
        // 오늘 시각이 지났으면 내일
        candidate = absl::CivilSecond(today + 1,
                                      u.preferred_local.hour(),
                                      u.preferred_local.minute(),
                                      u.preferred_local.second());
        t = absl::FromCivil(candidate, tz);
    }
    return t;
}
```

저장은 `absl::Time` 하나, 표시는 사용자 TZ. DST 전환일에도 동작이 명확하다.

## 코드 리뷰 체크리스트

```cpp
// 회피 — 시간대 가정
int hour = (epoch_seconds / 3600) % 24;  // 어디 시간?

// Good — TZ 명시
absl::Time t = absl::FromUnixSeconds(epoch_seconds);
int hour = absl::ToCivilHour(t, user_tz).hour();
```

```cpp
// 회피 — 문자열로 TZ 표현
std::string tz_offset = "+0900";

// Good — IANA 이름
std::string tz_name = "Asia/Seoul";   // DST·역사 변경 자동 처리
```

```cpp
// 회피 — TZ 로드 실패 무시
absl::TimeZone tz;
absl::LoadTimeZone(name, &tz);   // 반환값 무시

// Good
if (!absl::LoadTimeZone(name, &tz)) {
    return absl::InvalidArgumentError(absl::StrCat("unknown tz: ", name));
}
```

## 정리

- `absl::TimeZone`은 IANA 이름을 통해 DST·역사 변경을 정확히 처리.
- `absl::Time`은 시간대 *모름*. 변환은 표시/파싱 시점에만.
- DST 전환 시각은 `At()`로 SKIPPED/REPEATED 분기 처리 가능. 보통은 `FromCivil` 기본값으로 충분.
- 컨테이너 이미지에는 `tzdata` 패키지 필수.
- `FixedTimeZone`은 비상용 — DST를 모른다.

## 다음 장 예고

[Part 7-05: Time mocking](/blog/programming/code-review/abseil/part7-05-time-mocking) — 테스트에서 시간을 통제하는 패턴.

## 관련 항목

- [Part 7-03: CivilTime](/blog/programming/code-review/abseil/part7-03-civil-time)
- [Part 12-01: ABSL_FLAG](/blog/programming/code-review/abseil/part12-01-absl-flag-define) — `--service_timezone` 같은 명시 TZ flag
- [원문 — Time Zones](https://abseil.io/docs/cpp/guides/time#time-zones)
