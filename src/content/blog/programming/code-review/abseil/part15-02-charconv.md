---
title: "Part 15-02: absl::from_chars / SimpleAtoi — 숫자 변환의 빠른 길"
date: 2026-05-26T06:00:00
description: "absl::SimpleAtoi / SimpleAtof / from_chars — locale-free, exception-free, sscanf 대비 10~50배. std::charconv와의 관계."
series: "Abseil Code Review"
seriesOrder: 74
tags: [cpp, abseil, charconv, parsing, performance]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 한 줄 요약

`absl::SimpleAtoi` 계열과 `absl::from_chars`는 *locale에 의존하지 않고 예외를 던지지 않는* 숫자 변환 함수다. `sscanf`·`std::stoi`·`std::stringstream`이 가진 locale lookup, 예외, 임시 객체 alloc을 모두 제거해 hot path에서 10배 이상 빠르다.

## 동기

C++에서 문자열 → 숫자 변환에는 다섯 가지 접근이 공존한다.

```cpp
absl::string_view s = "12345";

// 1. sscanf
int v1;
::sscanf(std::string(s).c_str(), "%d", &v1);  // alloc + locale

// 2. std::stoi
int v2 = std::stoi(std::string(s));  // alloc + 예외

// 3. std::istringstream
int v3;
std::istringstream(std::string(s)) >> v3;  // alloc + locale

// 4. std::from_chars (C++17 / C++20)
int v4;
auto [ptr, ec] = std::from_chars(s.data(), s.data() + s.size(), v4);

// 5. absl::SimpleAtoi
int v5;
absl::SimpleAtoi(s, &v5);
```

벤치마크에서 `SimpleAtoi`와 `from_chars`가 압도적이다. `sscanf`/`stringstream`은 *매번 locale을 조회*하고 *임시 std::string을 alloc*한다.

## SimpleAtoi — 가장 자주 쓰는 형태

`absl/strings/numbers.h`가 제공한다.

```cpp
#include "absl/strings/numbers.h"

int32_t v;
if (!absl::SimpleAtoi(s, &v)) {
  return absl::InvalidArgumentError("not a number");
}

int64_t big;
absl::SimpleAtoi(s, &big);

uint32_t u;
absl::SimpleAtoi(s, &u);

// hex/oct도 명시
int32_t hex;
absl::SimpleHexAtoi(s, &hex);  // "ff", "0xff", "FF" 모두 OK
```

특징:

- 반환값은 `bool`. 성공·실패만 알린다.
- 전체 문자열이 숫자여야 성공. 뒤에 공백·문자가 남으면 실패.
- 부호 처리 정상.
- 부동소수점은 `SimpleAtof` / `SimpleAtod`.

## from_chars — locale-free 표준 기반

`absl::from_chars`는 `std::from_chars`와 같은 시그니처를 가진다.

```cpp
absl::string_view s = "12345xyz";
int v;
auto result = absl::from_chars(s.data(), s.data() + s.size(), v);

if (result.ec == std::errc()) {
  // result.ptr → 'x' (변환 멈춘 위치)
}
```

`SimpleAtoi`와 달리 *부분 변환을 허용*한다. 다음 토큰을 이어 파싱할 때 유용.

```cpp
// CSV "12,34,56" 파싱
const char* p = s.data();
const char* end = p + s.size();
while (p < end) {
  int v;
  auto r = absl::from_chars(p, end, v);
  if (r.ec != std::errc()) break;
  Use(v);
  p = r.ptr;
  if (p < end && *p == ',') ++p;
}
```

## 내부 구현 핵심

`absl/strings/numbers.cc`의 정수 파싱은 *직접 작성된 loop*다.

```cpp
// 정수 부분 (요약)
bool safe_strtoi(absl::string_view text, int32_t* value) {
  if (text.empty()) return false;
  bool negative = false;
  const char* p = text.data();
  const char* end = p + text.size();

  if (*p == '-') { negative = true; ++p; }
  else if (*p == '+') { ++p; }
  if (p == end) return false;

  uint64_t result = 0;
  for (; p < end; ++p) {
    if (*p < '0' || *p > '9') return false;
    uint64_t d = *p - '0';
    if (result > (UINT32_MAX - d) / 10) return false;  // overflow
    result = result * 10 + d;
  }

  if (negative) {
    if (result > -int64_t{INT32_MIN}) return false;
    *value = -static_cast<int32_t>(result);
  } else {
    if (result > INT32_MAX) return false;
    *value = static_cast<int32_t>(result);
  }
  return true;
}
```

핵심은 세 가지.

- locale 조회 없음 (`'0'`~`'9'` 직접 비교).
- overflow를 byte 단위로 *미리* 차단.
- 예외 없음.

부동소수점은 `Ryu`/`Dragonbox` 등 modern 알고리즘 기반. `std::stod`처럼 round-trip 정확성을 유지하면서 빠르다.

## std::charconv와의 관계

C++17부터 `<charconv>`가 표준에 들어왔다. 정수는 모든 주요 컴파일러가 빠르게 구현했지만 *부동소수점 from_chars*는 GCC 11, Clang 14쯤에야 안정화됐다. 이전 버전 호환성을 위해 Abseil은 자체 구현을 가진다.

```cpp
// C++17 표준
auto r = std::from_chars(begin, end, v);

// Abseil 백포트 — 동일 인터페이스
auto r = absl::from_chars(begin, end, v);
```

`ABSL_USES_STD_CHARCONV`가 정의되면 alias가 되어 표준 구현으로 위임한다.

## 성능 비교 (참고치)

64-bit 정수 파싱, 100만 회 반복 기준 (낮을수록 빠름):

| 함수 | 상대 시간 |
|---|---|
| sscanf | 100x |
| stringstream | 80x |
| std::stoi (alloc + 예외) | 30x |
| strtol | 5x |
| absl::SimpleAtoi | 1.2x |
| std::from_chars / absl::from_chars | 1.0x |

floating point에서도 비슷한 격차다. `stringstream`은 locale 조회 비용이 *호출당 microsecond 단위*다.

## 코드 리뷰 포인트

**1. sscanf 발견 → 즉시 교체 후보**

```cpp
// 회피
int year, month, day;
::sscanf(s.c_str(), "%d-%d-%d", &year, &month, &day);

// Good — 단계적 from_chars 또는 absl::Time 파서
```

복잡한 포맷이라면 `absl::SimpleAtoi` 단계 분해. 시간 포맷이면 `absl::ParseTime` ([Part 7-02](/blog/programming/code-review/abseil/part7-02-format-parse)).

**2. std::stoi 예외 의존 코드**

```cpp
// 회피 — 예외 비용
try {
  int v = std::stoi(s);
} catch (const std::exception&) { ... }

// Good — bool 반환
int v;
if (!absl::SimpleAtoi(s, &v)) { ... }
```

Google 스타일은 예외 금지. `SimpleAtoi`가 자연스럽다.

**3. ostringstream으로 숫자 → 문자열**

```cpp
// 회피
std::ostringstream oss; oss << v;
std::string s = oss.str();

// Good
std::string s = absl::StrCat(v);
```

역방향도 `StrCat` ([Part 4-03](/blog/programming/code-review/abseil/part4-03-str-cat))이 답이다.

**4. SimpleAtoi vs from_chars 선택**

- 문자열 *전체*가 숫자여야 한다 → `SimpleAtoi`
- *접두사*만 숫자고 뒤에 더 파싱할 토큰이 남았다 → `from_chars`

## 자주 보는 안티패턴

**범위 체크 누락**

```cpp
int32_t v;
absl::SimpleAtoi(s, &v);   // 반환값 무시
Use(v);                     // 실패 시 v는 알 수 없음
```

반환값 무시는 [[nodiscard]] 경고 대상이다. 항상 if로 감싼다.

**부동소수점에 SimpleAtoi**

```cpp
double d;
absl::SimpleAtoi(s, &d);   // 컴파일 에러
absl::SimpleAtod(s, &d);   // Good
```

오타로 자주 발생.

**hex 문자열에 SimpleAtoi**

```cpp
int32_t v;
absl::SimpleAtoi("0xff", &v);     // false — '0xff'는 십진 아님
absl::SimpleHexAtoi("0xff", &v);  // true → 255
```

## 정리

- `absl::SimpleAtoi`/`SimpleAtod`는 *전체 문자열이 숫자*일 때 가장 짧다.
- `absl::from_chars`는 *접두 파싱*과 표준 호환이 필요할 때.
- 둘 다 locale-free, 예외 없음, alloc 없음.
- `sscanf`·`stringstream`·`std::stoi`는 hot path에서 회피.

## 다음 편

[Part 15-03 — Cord vs std::string 선택](/blog/programming/code-review/abseil/part15-03-cord-vs-string)에서 두 문자열 타입의 적용 지점을 정리한다.

## 관련 항목

- [Part 15-03 — Cord vs std::string 선택](/blog/programming/code-review/abseil/part15-03-cord-vs-string)
- [Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat) — 숫자 → 문자열
- [Part 4-06 — StrFormat](/blog/programming/code-review/abseil/part4-06-str-format)
- [Folly Part 5-04 — to/from](/blog/programming/code-review/folly/part5-04-to-from) — Meta의 동급 도구
- [EMC++ Item 11 — 예외 비용](/blog/programming/cpp/effective-modern-cpp/item11)
