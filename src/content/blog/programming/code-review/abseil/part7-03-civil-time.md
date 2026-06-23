---
title: "absl::CivilTime 분석"
date: 2026-06-11T09:09:00
description: "absl::CivilDay와 가족들 — 시간대 없는 달력 산술. 윤년·월말을 직접 처리할 필요가 없게 한다."
series: "Abseil Code Review"
seriesOrder: 41
tags: [cpp, abseil, time, civiltime, calendar]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## CivilTime이 푸는 문제

"3월 31일에 한 달을 더하면 4월 31일?" — 달력 산술은 자연스러워 보이지만 윤년, 30일/31일 월, DST 같은 잡일이 숨어 있다. Abseil의 `CivilTime` 계열은 *시간대를 모르는* 달력 좌표만 다루어 이 잡일을 압축한다.

```cpp
#include "absl/time/civil_time.h"

absl::CivilDay d(2026, 3, 31);
d += 1;             // 2026-04-01

absl::CivilMonth m(2026, 3);
m += 1;             // 2026-04
absl::CivilDay end_of_april(m.year(), m.month() + 1, 1);
--end_of_april;     // 2026-04-30
```

핵심 원칙은 *시간대가 없다*는 점이다. `CivilDay`는 "어떤 달력 좌표"일 뿐 "어느 순간"이 아니다.

## 여섯 가지 정밀도

| 타입 | 의미 | 산술 단위 |
|------|------|----------|
| `CivilSecond` | YYYY-MM-DD hh:mm:ss | 1초 |
| `CivilMinute` | YYYY-MM-DD hh:mm | 1분 |
| `CivilHour` | YYYY-MM-DD hh | 1시간 |
| `CivilDay` | YYYY-MM-DD | 1일 |
| `CivilMonth` | YYYY-MM | 1월 |
| `CivilYear` | YYYY | 1년 |

각 타입의 `operator++`/`+=`가 *해당 단위*로 진행한다. 정밀도가 낮은 타입은 *시작 시점* 으로 truncate된다.

```cpp
absl::CivilSecond cs(2026, 5, 24, 16, 23, 45);

absl::CivilDay   cd(cs);   // 2026-05-24 00:00:00
absl::CivilMonth cm(cs);   // 2026-05-01 00:00:00
absl::CivilYear  cy(cs);   // 2026-01-01 00:00:00
```

암묵 변환이 *높은 정밀도 → 낮은 정밀도* 방향으로만 동작한다. 반대는 명시 변환만 허용한다.

## 산술 — 정규화가 자동

이상한 입력을 넣어도 정규화된다.

```cpp
absl::CivilDay d(2026, 13, 32);  // ❓ 13월 32일?
// → 정규화: 2027-02-01
```

명시적으로 잘못된 날짜를 만들 수 없으므로 `if (month <= 12 && day <= 31)` 같은 가드가 사라진다.

윤년도 자연스럽다.

```cpp
absl::CivilDay leap(2024, 2, 29);   // OK
absl::CivilDay nope(2025, 2, 29);   // 정규화 → 2025-03-01
```

월말 산술도 직관적이다.

```cpp
absl::CivilMonth m(2026, 1);
for (int i = 0; i < 12; ++i) {
    absl::CivilDay last = absl::CivilDay(m + 1, 1) - 1;
    std::cout << m << " ends on " << last << "\n";
    ++m;
}
```

## TimeZone과의 결합 — FromCivil / ToCivil

`CivilTime`만으로는 절대 시간을 만들 수 없다. `TimeZone`과 결합해야 `absl::Time`이 된다.

```cpp
absl::TimeZone seoul;
absl::LoadTimeZone("Asia/Seoul", &seoul);

absl::CivilSecond cs(2026, 5, 24, 9, 0, 0);
absl::Time t = absl::FromCivil(cs, seoul);    // 2026-05-24 09:00:00 KST
                                              //     = 2026-05-24 00:00:00 UTC
```

반대도 가능하다.

```cpp
absl::Time now = absl::Now();
absl::CivilSecond cs_seoul = absl::ToCivilSecond(now, seoul);
absl::CivilSecond cs_utc   = absl::ToCivilSecond(now, absl::UTCTimeZone());
```

DST 전환점에 있는 모호한 시각은 `TimeZone::At`이 자세한 분기 정보를 준다.

```cpp
auto info = seoul.At(cs);
// info.kind: UNIQUE / SKIPPED / REPEATED
// info.pre / info.trans / info.post
```

대부분의 코드는 `FromCivil`이면 충분하다(SKIPPED·REPEATED 모두 합리적 기본값을 고른다).

## 요일 계산 — GetWeekday

```cpp
absl::CivilDay d(2026, 5, 24);
absl::Weekday wd = absl::GetWeekday(d);  // absl::Weekday::sunday

// 다음 월요일
absl::CivilDay next_mon = absl::NextWeekday(d, absl::Weekday::monday);
absl::CivilDay prev_mon = absl::PrevWeekday(d, absl::Weekday::monday);
```

`NextWeekday(d, wd)`는 *오늘이 wd라도 7일 후를* 반환한다. 오늘 포함이 필요하면 `d - 1`부터 시작한다.

## 두 날짜 사이 일수

```cpp
absl::CivilDay start(2026, 1, 1);
absl::CivilDay end(2026, 5, 24);

int64_t days = end - start;   // 143
```

`operator-`는 *해당 단위 개수*를 반환한다. `CivilMonth` 끼리 빼면 월 차이, `CivilSecond`는 초 차이.

## 흔한 함정

### 1. CivilDay가 곧 자정인 줄 알기

`CivilDay`는 좌표일 뿐 *순간이 아니다*. `FromCivil(CivilDay(...), tz)`가 자정이 되는 것이지, `CivilDay` 자체는 시간대가 없다.

### 2. 시간대 잊고 빼기

```cpp
// 회피 — 다른 사용자의 "오늘"이 같다고 가정
auto today = absl::ToCivilDay(absl::Now(), absl::UTCTimeZone());

// Good — 사용자 TZ를 함께
auto today_for_user = absl::ToCivilDay(absl::Now(), user_tz);
```

### 3. 윤초 처리

`CivilSecond`는 *60초 분*을 모르는 SI 시간이다. POSIX 시간과 동일하게 윤초가 흡수된다. 천체·물리 계산이 아니라면 신경 쓸 필요 없다.

## 작은 예시 — 청구서 주기

```cpp
struct BillingCycle {
    absl::CivilDay start;
    absl::CivilDay end;  // 마지막 날 포함
};

BillingCycle MonthlyCycle(absl::CivilDay any_day_in_month) {
    absl::CivilMonth m(any_day_in_month);
    absl::CivilDay start(m, 1);
    absl::CivilDay end = absl::CivilDay(m + 1, 1) - 1;
    return {start, end};
}

// 청구 기간이 30일 이상 떨어졌는지
bool LongerThanMonth(BillingCycle a, BillingCycle b) {
    return (b.start - a.end) > 30;
}
```

## 정리

- `CivilSecond`~`CivilYear` 여섯 타입, 각각 *해당 단위로 산술*.
- 이상한 입력은 정규화로 흡수 — 윤년·월말·invalid date 가드 불필요.
- *시간대 없음*. `absl::Time`이 필요하면 `FromCivil(civil, tz)`로 결합.
- `GetWeekday`, `NextWeekday`, `PrevWeekday`로 요일 산술.
- 두 좌표의 차이는 `operator-` — 단위 개수 반환.

## 다음 장 예고

[Part 7-04: TimeZone](/blog/programming/code-review/abseil/part7-04-time-zone) — IANA TZ DB와 안전한 변환.

## 관련 항목

- [Part 7-01: Time / Duration overview](/blog/programming/code-review/abseil/part7-01-time-duration-overview)
- [Part 7-02: Format / Parse](/blog/programming/code-review/abseil/part7-02-format-parse)
- [원문 — CivilTime](https://abseil.io/docs/cpp/guides/time#civil-times)
