---
title: "항목 17: 전역 상태에 따른 에러 처리는 피하라"
date: 2026-05-09T16:00:00
description: "errno 같은 전역 에러 채널 대신 타입에 에러를 담아 반환하기"
tags: [C++, Error Handling]
series: "Beautiful C++"
seriesOrder: 17
draft: true
---


## 핵심 내용

- `errno` 같은 전역 에러 상태는 **호출 후 반드시 검사**해야 의미가 있다 — 빠뜨리면 조용히 사라진다
- 에러는 **반환값에 담아 호출자가 거부할 수 없게** 만들어라
- 현대 C++ 선택지: `std::optional<T>`, `std::expected<T, E>`(C++23), 예외, `tl::expected`
- 멀티스레드에서 `errno`는 thread-local이라도 여전히 깨지기 쉬운 패턴이다

## 예제 코드

```cpp
// Bad: 결과는 반환값, 에러는 errno — 잊어버리면 끝
double parse_double(const char* s) {
    char* end;
    errno = 0;
    double v = std::strtod(s, &end);
    // 호출자가 errno를 안 보면 ERANGE를 놓침
    return v;
}

// Good: 에러를 타입에 담아 반환
std::expected<double, ParseError> parse_double(std::string_view s) {
    // ...
    if (out_of_range) return std::unexpected(ParseError::Range);
    if (no_digits)    return std::unexpected(ParseError::Invalid);
    return value;
}

// 호출자가 에러를 무시할 수 없다
auto r = parse_double("3.14");
if (!r) handle(r.error());
```

## 정리

에러는 **결과와 함께 한 채널에서** 흐르게 하라. 전역 상태는 잊혀지기 쉽고 멀티스레드에서 깨지기 쉽다.
