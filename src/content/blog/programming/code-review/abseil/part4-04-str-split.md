---
title: "absl::StrSplit — Delimiter·Predicate·컨테이너 변환"
date: 2026-06-10T09:06:00
description: "Part 4-04: absl::StrSplit — Delimiter 추상화, ByChar/ByString/ByAnyChar/ByLength, predicate 필터링, 임의 컨테이너 자동 변환."
series: "Abseil Code Review"
seriesOrder: 22
tags: [cpp, abseil, strings, strsplit, iterator]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::StrSplit`은 문자열을 *어떤 컨테이너로*, *어떤 구분자로*, *어떤 필터로* 나눌지 세 축을 직교 분리한 표현식이다. 반환값은 implicit conversion으로 사용자가 원하는 컨테이너에 맞춰지고, Delimiter와 Predicate는 정책 객체로 따로 전달한다.

## 동기

문자열 분리는 단순해 보이지만, 실제로는 변수의 조합이 많다.

- 구분자가 단일 char인지, 문자열인지, "셋 중 하나"인지
- 빈 토큰을 포함할지 버릴지
- 결과를 `vector<string>`으로 받을지, `vector<string_view>`로 받을지, `set`으로 받을지, `pair`로 받을지
- 토큰을 string_view로 다시 처리할지 string으로 복사할지

`std::string`의 `find`/`substr` 루프로 짜면 모든 조합을 매번 새로 작성해야 한다. `StrSplit`은 이를 표현식 한 줄로 압축한다.

## API와 사용법

```cpp
#include "absl/strings/str_split.h"

// 단일 char 구분자, vector<string>
std::vector<std::string> v = absl::StrSplit("a,b,c", ',');

// 단일 char 구분자, vector<string_view> (alloc 없음)
std::vector<absl::string_view> sv = absl::StrSplit("a,b,c", ',');

// 문자열 구분자
std::vector<std::string> v2 = absl::StrSplit("a::b::c", "::");
// 또는 명시적으로
std::vector<std::string> v3 = absl::StrSplit("a::b::c", absl::ByString("::"));

// "셋 중 하나"
auto parts = absl::StrSplit("a,b;c:d", absl::ByAnyChar(",;:"));

// 고정 길이 토큰
auto chunks = absl::StrSplit("abcdefgh", absl::ByLength(2));
// {"ab","cd","ef","gh"}
```

자동 컨테이너 변환은 implicit conversion으로 동작한다.

```cpp
absl::flat_hash_set<std::string> uniq = absl::StrSplit("a,b,c,a", ',');
std::map<std::string, std::string> kv = absl::StrSplit("k1=v1,k2=v2", ',');
// kv는 ',' 분할 후 각 토큰을 또 '='로 분할? — 그건 다음 단락
```

## Delimiter 종류

| Delimiter | 의미 |
|---|---|
| `char ','` | 단일 char (short-form) |
| `absl::ByChar(',')` | 명시적 단일 char |
| `"::"` (string literal) | 문자열 (short-form) |
| `absl::ByString("::")` | 명시적 문자열 |
| `absl::ByAnyChar(",;:")` | 문자 집합 중 아무거나 |
| `absl::ByLength(n)` | 고정 길이 |
| `absl::MaxSplits(d, n)` | 최대 n번 분할 |
| `absl::AllowEmpty()` | 빈 토큰 유지(기본) |

```cpp
auto a = absl::StrSplit("a:b:c:d", absl::MaxSplits(':', 2));
// {"a", "b", "c:d"}
```

`MaxSplits`는 path/URL 파싱에서 자주 쓰인다.

## Predicate 필터

세 번째 인자로 predicate를 넘기면 토큰 필터링이 된다.

```cpp
absl::SkipEmpty();         // 빈 토큰 제거
absl::SkipWhitespace();    // 공백만 있는 토큰까지 제거
absl::AllowEmpty();        // 기본 (빈 토큰 포함)
```

```cpp
// 연속 공백 처리
auto words = absl::StrSplit("  hello   world  ", ' ', absl::SkipEmpty());
// {"hello", "world"}

// 람다 predicate
auto longs = absl::StrSplit("a,bc,d,efg", ',',
    [](absl::string_view s) { return s.size() >= 2; });
// {"bc", "efg"}
```

predicate의 시그니처는 `bool(absl::string_view)`로 통일된다.

## pair / tuple 구조 분해

`std::pair`로 받으면 정확히 두 토큰을 기대한다.

```cpp
std::pair<std::string, std::string> kv = absl::StrSplit("key=value", '=');
// kv.first = "key", kv.second = "value"

// 토큰이 셋 이상이면 첫 둘만 채워지지 않고, 첫 토큰 + 나머지 join
// — 동작이 모호하므로 권장하지 않음. 명시적 split 후 확인이 안전.
```

key-value 짝을 map으로 받는 흔한 패턴.

```cpp
std::map<std::string, std::string> config =
    absl::StrSplit("k1=v1,k2=v2,k3=v3", ',', absl::SkipEmpty());
// 각 ',' 토큰이 std::pair<string,string>로 캐스팅되는 과정에서
// 다시 '='로 split될 거라 기대하면 안 된다 — 두 단계가 필요.

absl::flat_hash_map<std::string, std::string> config2;
for (absl::string_view kv : absl::StrSplit("k1=v1,k2=v2", ',')) {
  std::pair<std::string, std::string> p = absl::StrSplit(kv, absl::MaxSplits('=', 1));
  config2.insert(std::move(p));
}
```

## 내부 구현

`StrSplit`은 lazy iterator를 반환하는 view 객체다. implicit conversion 시점에 대상 컨테이너로 토큰이 흘러간다.

```cpp
// absl/strings/str_split.h (요약)
template <typename Delimiter>
class Splitter {
  string_view text_;
  Delimiter delim_;
  Predicate pred_;

  class iterator { /* string_view 토큰 생성 */ };

 public:
  iterator begin() const;
  iterator end() const;

  // 임의 컨테이너로 변환
  template <typename Container>
  operator Container() const {
    Container c;
    for (string_view tok : *this) {
      if (pred_(tok)) c.insert(c.end(), Convert<value_type>(tok));
    }
    return c;
  }
};
```

iterator는 매 step마다 `delim_.Find()`로 다음 구분 위치를 찾고, view를 잘라 반환한다. 토큰은 *원본 텍스트의 view*이므로 토큰 자체를 만드는 데에 alloc이 없다.

`vector<string_view>`로 받으면 컨테이너 alloc 한 번, 토큰 alloc 0. `vector<string>`으로 받으면 컨테이너 alloc + 토큰마다 string alloc.

## std::string 비교 — 직접 분리 루프

```cpp
// 표준 라이브러리로 직접
std::vector<std::string> Split(const std::string& s, char d) {
  std::vector<std::string> r;
  size_t start = 0, pos;
  while ((pos = s.find(d, start)) != std::string::npos) {
    r.emplace_back(s.substr(start, pos - start));  // alloc
    start = pos + 1;
  }
  r.emplace_back(s.substr(start));                  // alloc
  return r;
}
```

토큰마다 `substr` alloc이 일어난다. `StrSplit`은 lazy view라 `vector<string_view>` 결과면 토큰 alloc이 전혀 없다.

C++20부터는 `std::views::split`이 있다. 표현은 비슷하나 구체 컨테이너 자동 변환이 약하고, 컴파일 에러가 길다. 가독성·성능 면에서 `StrSplit`이 여전히 앞선다.

## 코드 리뷰 포인트

**1. `vector<string>` 대신 `vector<string_view>`**

후속 처리가 view로 충분하면 알로케이션 N번을 절약한다.

```cpp
// 회피
std::vector<std::string> parts = absl::StrSplit(line, ',');
for (const auto& p : parts) if (p == "TARGET") found = true;

// Good
for (absl::string_view p : absl::StrSplit(line, ',')) {
  if (p == "TARGET") { found = true; break; }
}
```

range-for 형태가 가장 가볍다. 컨테이너조차 만들지 않는다.

**2. SkipEmpty 명시**

CSV·log 파싱에서 trailing newline, 연속 구분자 등 빈 토큰이 흔하다. 명시적으로 처리한다.

```cpp
for (absl::string_view line : absl::StrSplit(content, '\n', absl::SkipEmpty())) {
  Process(line);
}
```

**3. `MaxSplits`로 분리 종료**

```cpp
// URL path 처리
std::pair<absl::string_view, absl::string_view> p =
    absl::StrSplit(url, absl::MaxSplits('?', 1));
absl::string_view path = p.first;
absl::string_view query = p.second;
```

## 안티패턴

**rvalue string 분리**

`StrSplit`의 첫 인자는 `string_view`다. 토큰은 원본의 view다. 임시 `std::string`을 넘기면 임시는 소멸하고 토큰은 모두 dangling이 된다.

```cpp
// 회피
auto v = absl::StrSplit(LoadFile(), '\n');  // LoadFile() rvalue → 토큰 dangling

// Good
std::string content = LoadFile();
auto v = absl::StrSplit(content, '\n');
```

`Splitter`는 임시 string에 대한 보조 생성자가 있어 컴파일은 통과하나, 토큰을 사용하기 전에 임시가 소멸할 수 있다. Abseil 문서가 명시 경고.

**predicate 안에서 토큰 변경**

predicate는 *판정만* 한다. 안에서 string으로 변환하거나 외부 상태를 바꾸면 lazy iteration이 어렵게 디버깅된다.

## 정리

- `StrSplit`은 Delimiter × Predicate × Container 세 축을 직교화한 표현식.
- 토큰은 원본의 view, alloc은 컨테이너 변환 시점에만 발생.
- `ByChar`, `ByString`, `ByAnyChar`, `ByLength`, `MaxSplits`로 Delimiter 선택.
- `SkipEmpty`, `SkipWhitespace`로 노이즈 제거.
- 임시 string을 넘기면 토큰이 dangling이 된다.

## 다음 편

[Part 4-05 — StrJoin](/blog/programming/code-review/abseil/part4-05-str-join)에서 반대 방향, 컨테이너를 한 string으로 합치는 표현식을 본다.

## 관련 항목

- [Part 4-01 — string_view](/blog/programming/code-review/abseil/part4-01-string-view)
- [Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)
- [Part 4-05 — StrJoin](/blog/programming/code-review/abseil/part4-05-str-join)
- [Tip of the Week #10: StrSplit](https://abseil.io/tips/10)
