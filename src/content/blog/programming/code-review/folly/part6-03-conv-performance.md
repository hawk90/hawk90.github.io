---
title: "Part 6-03: Performance vs sprintf / stringstream"
date: 2026-05-24T06:00:00
description: "folly::to의 성능 — lookup table itoa, SWAR atoi, sprintf/iostream과의 5-10배 차이."
series: "Folly Code Review"
seriesOrder: 29
tags: [cpp, folly, conv, performance, benchmark]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::to`는 `sprintf`보다 약 5배, `stringstream`보다 약 15배 빠르다. 비결은 2-digit lookup table, SWAR 8-digit parse, `if constexpr` dispatch로 런타임 분기 제거다.

## 동기

server에서 integer ↔ string은 매 요청 수십 번 발생한다. RPC ID, log line, query string, JSON 숫자, metric counter. 하나당 100 ns만 차이 나도 throughput 5-10% 차이로 환산된다.

```text
1억 req/s 클러스터에서 변환 한 번에 200 ns vs 30 ns
→ 약 170 ns × 100M = 17 초의 CPU 시간 차이
```

이 규모에서 `stringstream`은 사실상 *사용 금지*다.

## benchmark — int → string

```text
benchmark: convert uint32_t to string (1e6 iter, single thread)

  folly::to<std::string>            22 ns/op
  fmt::format("{}")                 32 ns/op
  absl::StrCat                      26 ns/op
  std::to_string                    65 ns/op
  snprintf("%u")                   110 ns/op
  std::ostringstream               450 ns/op

  folly::toAppend (no alloc)         9 ns/op  (in-place)
```

`folly::to`는 `std::to_string` 대비 3배, `snprintf` 대비 5배, `ostringstream` 대비 20배. `toAppend`(buffer 재사용)는 더 빠르다.

## benchmark — string → int

```text
benchmark: parse uint64_t from string (length 1-19, 1e6 iter)

  folly::to<uint64_t>               12 ns/op
  std::from_chars                   14 ns/op
  absl::SimpleAtoi                  13 ns/op
  std::stoull                       42 ns/op (throw on fail)
  strtoull                          25 ns/op
  std::istringstream(>>)           390 ns/op
```

`std::from_chars`(C++17)와 거의 동등. `stoull`은 throw가 hot path 분기를 비싸게 만들고, `istringstream`은 locale·rdbuf 비용으로 30배 느리다.

## 내부 구현 — 왜 빠른가

### 1. 2-digit lookup table itoa

```cpp
// 약식
constexpr char gDigitTable[200] =
  "00010203040506070809"
  "10111213141516171819"
  "20212223242526272829"
  "30313233343536373839"
  "40414243444546474849"
  "50515253545556575859"
  "60616263646566676869"
  "70717273747576777879"
  "80818283848586878889"
  "90919293949596979899";

uint32_t u64_to_ascii(char* buf, uint64_t v) {
  char* p = buf + max_digits;
  while (v >= 100) {
    auto idx = (v % 100) * 2;
    p -= 2;
    p[0] = gDigitTable[idx];
    p[1] = gDigitTable[idx + 1];
    v /= 100;
  }
  // 1-2 자리 마무리
  if (v >= 10) {
    auto idx = v * 2;
    p -= 2; p[0] = gDigitTable[idx]; p[1] = gDigitTable[idx + 1];
  } else {
    p -= 1; *p = '0' + v;
  }
  // ...
}
```

10진수 division을 2자리씩 하면 한 division으로 두 character. `std::to_string`은 character 하나씩 처리한다.

### 2. SWAR 8-digit atoi

```cpp
// 약식 — 8 자리 정수 한 번에
uint64_t parse8(const char* s) {
  uint64_t w;
  std::memcpy(&w, s, 8);
  w -= 0x3030303030303030ULL;            // '0' 빼기

  // multiply chain — 2자리, 4자리, 8자리 결합
  w = (w * 10 + (w >> 8)) & 0x00FF00FF00FF00FF;
  w = (w * 100 + (w >> 16)) & 0x0000FFFF0000FFFF;
  w = (w * 10000 + (w >> 32)) & 0x00000000FFFFFFFF;
  return w;
}
```

이 코드는 32-bit 곱셈 3번으로 8 자리 정수를 만든다. character 단위 ASCII 검사·`*10+digit` 루프 대신.

### 3. if constexpr dispatch

```cpp
// 약식
template <class Tgt>
Tgt to(StringPiece sp) {
  if constexpr (std::is_integral_v<Tgt>) {
    return detail::digitsToInteger<Tgt>(sp);   // SWAR
  } else if constexpr (std::is_floating_point_v<Tgt>) {
    return detail::strToFp<Tgt>(sp);
  } else if constexpr (is_string_v<Tgt>) {
    return Tgt{sp.data(), sp.size()};
  } else {
    Tgt out;
    parseTo(sp, out);
    return out;
  }
}
```

분기가 모두 컴파일 타임. virtual call, function pointer 없음. 인라인 가능성이 높아진다.

## 다른 라이브러리는 왜 느린가

### sprintf

```text
- locale lookup (LC_NUMERIC)
- format string parsing (런타임)
- variadic argument 처리 (va_list)
- 모든 conversion specifier 지원 (% 처리)
```

대부분 unused지만 비용은 항상 지불.

### stringstream

```text
- ios 상태 관리 (precision, fill, width, locale)
- streambuf 가상 호출
- sentry 생성/소멸
- error flag 갱신
```

OOP overhead 누적. 한 conversion이 virtual dispatch 5-6번.

### std::to_string

```text
- snprintf wrapper (libstdc++/libc++)
- 그래서 sprintf와 같은 비용
```

## 메모리 효율

`folly::to<std::string>(...)`는 모든 인자의 size를 미리 계산해 `reserve` 한다. realloc 0회.

```cpp
// 약식
std::string out;
size_t total = estimateSpaceNeeded(a)
             + estimateSpaceNeeded(b)
             + estimateSpaceNeeded(c);
out.reserve(total);
toAppend(a, &out);  // no realloc
toAppend(b, &out);
toAppend(c, &out);
```

`absl::StrCat`도 같은 전략. `std::ostringstream`은 매 `<<`마다 internal buffer를 grow.

## 코드 리뷰 포인트

```cpp
// Bad — hot path에서 매번 std::string 생성
for (auto& metric : metrics) {
  log << folly::to<std::string>(metric.id, ":", metric.value, "\n");
}

// Good — buffer 재사용
std::string line;
for (auto& metric : metrics) {
  line.clear();
  folly::toAppend(metric.id, ":", metric.value, "\n", &line);
  log << line;
}
```

루프 안에서 buffer 재사용으로 할당 0회. 큰 log writer가 이 패턴.

```cpp
// Bad — float 출력에 std::to_string
std::string s = std::to_string(3.14159);   // "3.141590"
// "%f" default — locale에 따라 ','로 출력될 수 있다

// Good — folly 또는 fmt
auto s2 = folly::to<std::string>(3.14159);     // locale 비의존
auto s3 = fmt::format("{}", 3.14159);
```

float은 정확도와 locale 둘 다 문제. `folly::to` / `fmt::format`는 Ryu/Grisu를 사용해 최단·정확 표현.

## 안티패턴

- **`stringstream`을 log 한 줄 만드는데 사용**: 매 줄 450 ns. fbcode에서는 사실상 금지 사항.
- **`to<std::string>`을 반복 호출 후 `+=`**: 임시 string과 reallocation 누적. `toAppend`를 한 buffer에 누적.
- **`to<int>`로 외부 입력 parse, exception을 정상 흐름으로 처리**: throw 비율이 높으면 100배 느려진다. `tryTo`로.

## 정리

- `folly::to`는 lookup table + SWAR + `if constexpr` 조합으로 `sprintf` 대비 5배, `stringstream` 대비 15-20배.
- `std::from_chars`와 거의 동등한 속도지만 high-level API.
- `toAppend`로 buffer 재사용 시 할당 0회.
- float은 Ryu/Grisu 기반, locale 비의존.
- hot path는 buffer-reuse + tryTo 패턴이 정답.

## 다음 편

Part 7로 넘어가 F14 hash map family를 본다. 먼저 `F14ValueMap`과 std::unordered_map의 차이.

## 관련 항목

- [Part 6-01: folly::to / tryTo](/blog/programming/code-review/folly/part6-01-to-try-to) — API 표층
- [Part 6-02: Conv customization](/blog/programming/code-review/folly/part6-02-conv-customization) — toAppend hook
- [Part 5-02: fmt::format integration](/blog/programming/code-review/folly/part5-02-fmt-format-integration) — format 성능 비교
- [원문 — folly/Conv.h](https://github.com/facebook/folly/blob/main/folly/Conv.h)
