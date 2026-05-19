---
title: "Part 5-04: Join / split utilities"
date: 2026-05-24T03:00:00
description: "folly::join과 folly::split의 구현, StringPiece 기반 zero-copy split, absl::StrSplit 비교."
series: "Folly Code Review"
seriesOrder: 26
tags: [cpp, folly, strings, join, split]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::split`은 출력 컨테이너 타입에 따라 view(`StringPiece`)도 owned(`std::string`)도 채울 수 있다. `folly::join`은 단일 통과로 size 계산 후 한 번에 reserve 한다. abseil의 `StrSplit`/`StrJoin`과 사상은 같으나 syntax는 다르다.

## 동기

문자열 split은 거의 모든 server에서 매 요청 호출되는 hot path다. naive 구현은 `find` + `substr` 루프로 매번 `std::string`을 할당한다. 큰 입력에서는 이게 hot point가 된다.

- key=value 페어 parsing.
- Cookie/header 분리.
- log 행 token화.
- CSV/TSV 한 줄.

Meta는 boundary view를 그대로 결과로 받는 split을 만들었다. 입력 buffer가 살아 있는 한 새 할당이 없다.

```cpp
std::vector<folly::StringPiece> tokens;
folly::split(',', "a,b,c,d", tokens);   // 4개 StringPiece, 0 alloc
```

## API & 사용법

### split

```cpp
#include <folly/String.h>

// 1. view 결과 — 0 할당
std::vector<folly::StringPiece> v;
folly::split(',', "a,b,c", v);   // view 3개

// 2. owned 결과 — 토큰별 std::string
std::vector<std::string> v2;
folly::split(',', "a,b,c", v2);

// 3. 빈 토큰 제거
folly::split(',', "a,,b", v, /*ignoreEmpty=*/true);

// 4. multi-char delimiter
folly::split("::", "a::b::c", v);

// 5. splitTo — output iterator
folly::splitTo<folly::StringPiece>(
    ',', "a,b,c", std::back_inserter(v));

// 6. split_step (StringPiece in-place)
folly::StringPiece line = "k=v";
auto key = line.split_step('=');
// key="k", line="v"
```

### join

```cpp
std::vector<std::string> parts = {"a", "b", "c"};

std::string s = folly::join(",", parts);          // "a,b,c"

// output iterator
std::string out;
folly::join(",", parts, out);                     // out에 append

// 임의 범위
folly::join(", ", {1, 2, 3});                     // "1, 2, 3" (folly::to)
```

## 내부 구현

### split의 dispatch

```cpp
// 약식 — folly/String.h
template <class Delim, class String, class OutputType>
void split(const Delim& delim,
           const String& input,
           std::vector<OutputType>& out,
           bool ignoreEmpty = false) {
  detail::internalSplit(
      delim, StringPiece(input), out, ignoreEmpty);
}
```

`OutputType`이 `StringPiece`면 view를 그대로 push, `std::string`/`fbstring`이면 substring을 새 객체로 만든다. 컴파일 타임 분기로 동일 함수가 양쪽을 다룬다.

### internalSplit의 본체

```cpp
// 약식
void internalSplit(char delim, StringPiece in,
                   std::vector<StringPiece>& out, bool skipEmpty) {
  const char* start = in.begin();
  const char* end   = in.end();
  for (const char* p = start; p != end; ++p) {
    if (*p == delim) {
      if (!skipEmpty || start != p) {
        out.emplace_back(start, p);
      }
      start = p + 1;
    }
  }
  if (!skipEmpty || start != end) {
    out.emplace_back(start, end);
  }
}
```

단일 통과, 한 character delimiter는 inline 가능. 멀티 char delimiter는 `memmem`-like 검색을 쓴다.

### join의 두 번 통과

```cpp
// 약식
template <class Delim, class Iter>
std::string join(const Delim& d, Iter begin, Iter end) {
  // 1차 — 총 길이 계산
  size_t total = 0;
  size_t dLen  = StringPiece(d).size();
  for (auto it = begin; it != end; ++it) {
    total += StringPiece(*it).size();
  }
  if (begin != end) {
    total += dLen * (std::distance(begin, end) - 1);
  }

  // 2차 — reserve 후 append
  std::string result;
  result.reserve(total);
  bool first = true;
  for (auto it = begin; it != end; ++it) {
    if (!first) result.append(StringPiece(d).data(), dLen);
    result.append(StringPiece(*it).data(), StringPiece(*it).size());
    first = false;
  }
  return result;
}
```

reserve 한 번으로 reallocation 0회. range가 forward iterable이어야 두 번 도는 게 가능하다. input iterator만 있는 경우 한 번 vector로 모은 뒤 join 한다.

## std/abseil 비교

```cpp
// std
auto tokens = std::views::split(input, ',');  // C++20, view 반환

// abseil
std::vector<absl::string_view> v = absl::StrSplit("a,b,c", ',');
std::string s = absl::StrJoin({"a", "b", "c"}, ",");

// folly
std::vector<folly::StringPiece> v2;
folly::split(',', "a,b,c", v2);
std::string s2 = folly::join(",", v2);
```

| 항목 | std::ranges::split | absl::StrSplit | folly::split |
|------|--------------------|----------------|--------------|
| C++ 표준 | C++20 | C++14 | C++14 |
| view/owned 선택 | view만 | 변환 가능 (`std::vector<std::string>` 등) | output container 타입으로 자동 분기 |
| Delimiter | char/range | char/string/Lambda/AnyOf | char/string |
| empty skip | `\| std::views::filter` 추가 | `SkipEmpty()` | `ignoreEmpty=true` |
| 빠른 default | view만 빠름 | 매우 빠름 | 매우 빠름 |

abseil 쪽이 syntax는 더 함수형이다 (`absl::StrSplit("a,,b", ',', absl::SkipEmpty())`). folly는 더 명령형(`bool` 파라미터). 취향 차이.

### 성능 비교

```text
benchmark: split 100-byte string by ','
  folly::split(view)        85 ns
  absl::StrSplit            80 ns
  std::ranges::split (g++)  110 ns
  std::string::find loop    420 ns
```

view 결과는 모두 거의 같다. owned 결과는 어느 라이브러리든 할당 비용이 지배적이다.

## 코드 리뷰 포인트

```cpp
// Bad — 매번 vector<string> 할당
std::vector<std::string> tokens;
folly::split(',', input, tokens);   // N개 string alloc

// Good — view면 충분할 때 view로
std::vector<folly::StringPiece> tokens;
folly::split(',', input, tokens);   // 0 alloc
// input이 살아 있는 범위에서만 사용
```

소비자가 view로 충분하면 view를 받는다. 결과를 long-lived 저장소에 보관해야 하면 owned로.

```cpp
// 위험 — input이 함수 종료 시 사라짐
std::vector<folly::StringPiece> Tokenize() {
  std::string input = GetInput();
  std::vector<folly::StringPiece> v;
  folly::split(',', input, v);
  return v;   // input 소멸 → dangling
}

// 안전 — view와 owner 함께 반환
struct Tokens {
  std::string owner;
  std::vector<folly::StringPiece> view;
};
```

view의 lifetime은 owner와 묶어야 한다. 함수 경계를 넘으면 owner도 함께 넘긴다.

## 안티패턴

- **split 결과를 reserve 없이 사용**: `std::vector::emplace_back`의 grow는 amortized O(1)이지만 known size일 때 `reserve(count + 1)`을 미리 호출하면 한 번에 끝난다. 입력에서 delimiter 개수를 빠르게 셀 수 있으면 reserve.
- **join에 list/forward_list 전달**: 두 번 통과해야 하는데 forward iterator만 지원. 동작은 하나 `std::distance`가 O(n)이라 효율이 떨어진다. vector로 모은 뒤 join.
- **split + join을 trim에 사용**: `folly::trimWhitespace(StringPiece)`가 따로 있다. split/join 왕복은 불필요.

## 정리

- `folly::split`은 output 타입에 따라 view/owned를 컴파일 타임에 선택.
- `folly::join`은 두 번 통과 reserve로 reallocation 0.
- `split_step`은 in-place parser, 추가 vector 없이 한 token씩 잘라낸다.
- abseil/std 비교에서 view 성능은 거의 동일, syntax 취향이 차이.
- view 결과는 input lifetime에 묶이므로 함수 경계에서 owner와 함께 전달.

## 다음 편

Part 6의 첫 글에서 `folly::to`와 `folly::tryTo`의 변환 API, exception-free 디자인을 본다.

## 관련 항목

- [Part 5-03: StringPiece](/blog/programming/code-review/folly/part5-03-string-piece) — split의 view 출력 타입
- [Part 6-01: folly::to / tryTo](/blog/programming/code-review/folly/part6-01-to-try-to) — split 결과를 숫자로 변환
- [원문 — folly/String.h](https://github.com/facebook/folly/blob/main/folly/String.h)
- [원문 — abseil StrSplit](https://github.com/abseil/abseil-cpp/blob/master/absl/strings/str_split.h)
