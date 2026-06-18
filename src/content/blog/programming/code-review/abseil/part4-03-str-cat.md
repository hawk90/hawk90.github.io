---
title: "absl::StrCat — 가변 인자 문자열 연결과 AlphaNum"
date: 2026-06-10T09:05:00
description: "Part 4-03: absl::StrCat — variadic 문자열 연결, AlphaNum 어댑터, operator+ / ostringstream과의 성능 차이."
series: "Abseil Code Review"
seriesOrder: 21
tags: [cpp, abseil, strings, strcat, performance]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::StrCat`은 임의 개수 인자를 받아 **단 한 번의 alloc**으로 `std::string`을 만든다. 각 인자는 `AlphaNum` 어댑터를 거쳐 통일된 view로 환산되며, 미리 합계 길이를 계산한 뒤 buffer를 한 번만 reserve한다. `operator+` 체인이나 `ostringstream`보다 빠른 이유는 여기에 있다.

## 동기

`std::string`의 `operator+`는 좌결합으로 평가된다.

```cpp
// 회피
std::string r = a + b + c + d;
// 실제: ((a + b) + c) + d
// alloc 1: a+b → temp1
// alloc 2: temp1+c → temp2
// alloc 3: temp2+d → r
```

각 단계마다 임시 string이 만들어진다. N개 인자에서 N-1번의 alloc이 발생하고, 누적 복사량은 O(N²)에 가깝다. `ostringstream`은 더 낫지만, locale/format state 머신 비용이 따른다.

`StrCat`은 이 비용을 한 번의 alloc + 선형 복사로 압축한다.

## API와 사용법

```cpp
#include "absl/strings/str_cat.h"

namespace absl {
template <typename... AV>
std::string StrCat(const AV&... args);

template <typename... AV>
void StrAppend(std::string* dest, const AV&... args);
}
```

기본 사용은 직관적이다.

```cpp
std::string s = absl::StrCat("user=", user_id, " action=", action);
// "user=42 action=login"

absl::StrAppend(&buf, " ", key, "=", value);
```

지원 타입은 다음과 같다.

- `const char*`, `absl::string_view`, `std::string`
- 정수 타입(`int`, `int64_t`, ...), 부동소수점(`float`, `double`)
- `bool` (→ "0" 또는 "1")
- `char`
- 진법 어댑터: `absl::Hex`, `absl::Dec`
- 정밀도 어댑터: `absl::SixDigits(d)`

```cpp
absl::StrCat(absl::Hex(255));                      // "ff"
absl::StrCat(absl::Hex(255, absl::kZeroPad4));     // "00ff"
absl::StrCat(absl::Hex(0xff, absl::kSpacePad6));   // "    ff"
absl::StrCat(absl::SixDigits(3.141592653589));     // "3.14159"
```

## 내부 구현 — AlphaNum

핵심은 `absl::AlphaNum`이라는 어댑터다. 모든 인자가 `StrCat` 본체로 들어가기 전 `AlphaNum`으로 변환된다.

```cpp
// absl/strings/str_cat.h (요약)
class AlphaNum {
  string_view piece_;
  char digits_[kFastToBufferSize];  // 정수/부동소수점 stringify 버퍼

 public:
  AlphaNum(int x);
  AlphaNum(int64_t x);
  AlphaNum(double f);
  AlphaNum(absl::string_view sv) : piece_(sv) {}
  AlphaNum(const std::string& s) : piece_(s) {}
  AlphaNum(const char* c) : piece_(c) {}
  AlphaNum(Hex hex);
  // ...

  string_view Piece() const { return piece_; }
  size_t size() const { return piece_.size(); }
};
```

정수 같은 비-문자열 타입은 생성자에서 즉시 stringify되어 내부 `digits_` 버퍼에 저장되고, `piece_`는 그 버퍼를 가리키는 view가 된다. 이 변환은 *스택에서* 일어난다. heap alloc 없음.

`StrCat`의 본체는 단순하다.

```cpp
// absl/strings/str_cat.cc (요약)
std::string CatPieces(std::initializer_list<string_view> pieces) {
  // 1) 합계 길이 계산
  size_t total = 0;
  for (string_view p : pieces) total += p.size();

  // 2) 한 번에 reserve
  std::string result;
  STLStringResizeUninitialized(&result, total);

  // 3) 순차 memcpy
  char* dst = &*result.begin();
  for (string_view p : pieces) {
    if (!p.empty()) memcpy(dst, p.data(), p.size());
    dst += p.size();
  }
  return result;
}

template <typename... AV>
std::string StrCat(const AV&... args) {
  // 각 args를 AlphaNum으로 감싸 Piece()를 추출
  return CatPieces({static_cast<const AlphaNum&>(args).Piece()...});
}
```

`STLStringResizeUninitialized`는 `std::string`의 내부 버퍼를 *0 초기화 없이* 늘리는 트릭이다. 어차피 곧 덮어쓰기 때문에 zeroing 비용을 절약한다.

## std::string 비교

| 방식 | alloc 횟수 | 비용 |
|---|---|---|
| `operator+` 체인 | N-1 | O(N²) 누적 복사 |
| `ostringstream` | log(N) (재할당) | format state 머신 |
| `string::append` 반복 | log(N) (재할당) | 좋음 |
| `StrCat` | 1 | O(N) 복사, 가장 빠름 |

벤치마크 예(인자 10개, 짧은 문자열):

```text
operator+        ~ 380 ns
ostringstream    ~ 270 ns
StrCat           ~  85 ns
```

차이는 인자 개수가 늘수록 벌어진다.

## StrAppend

기존 string에 추가할 때는 `StrAppend`를 쓴다.

```cpp
std::string log_line = "[INFO] ";
absl::StrAppend(&log_line, "user=", user_id, " action=", action);
```

내부 동작은 `StrCat`과 같다. 다만 결과 버퍼가 *기존 string의 capacity 안*에 들어가면 alloc 없이 끝난다. log accumulation 등에서 유용하다.

```cpp
// 회피 — 매 라인마다 alloc
for (const auto& e : entries) {
  buf = buf + Format(e) + "\n";
}

// Good — 기존 buf 확장
for (const auto& e : entries) {
  absl::StrAppend(&buf, Format(e), "\n");
}
```

## 자가 참조 금지

`StrCat` 인자에 결과 변수를 직접 넣는 형태는 **금지**다.

```cpp
std::string s = "abc";

// 회피 — UB
s = absl::StrCat(s, "def", s);
// StrCat의 첫 인자에 들어간 `s`의 view가
// 결과 alloc 중 무효화될 수 있음

// Good — StrAppend
absl::StrAppend(&s, "def", s);  // 이쪽도 위험 — Abseil 문서가 금지
// 정말 자기 자신을 추가하려면 임시 변수
std::string tmp = s;
absl::StrAppend(&s, "def", tmp);
```

Abseil 문서는 `StrAppend(&s, ..., s, ...)`도 명시적으로 금지한다.

## 코드 리뷰 포인트

**1. log 메시지의 `<<` 체인을 StrCat으로**

```cpp
// 회피 — operator<< 호출이 매번 발생, 임시 stringstream
LOG(INFO) << "user=" << id << " ip=" << ip << " ms=" << ms;

// Good
LOG(INFO) << absl::StrCat("user=", id, " ip=", ip, " ms=", ms);
```

단, glog/LOG은 stream 인터페이스가 표준이라 강요는 아니다. hot path만 변경한다.

**2. 정수 to_string**

```cpp
// 회피
std::string s = std::to_string(n);  // alloc + format

// Good (동일 alloc, 더 빠른 코드 경로)
std::string s = absl::StrCat(n);
```

`absl::StrCat(n)`은 `std::to_string`보다 빠르다. `AlphaNum`이 스택 버퍼에서 itoa를 돌리고, locale을 무시하기 때문이다.

**3. error message 조립**

```cpp
return absl::InvalidArgumentError(
    absl::StrCat("Expected ", expected, " got ", actual));
```

`absl::Status` 메시지 조립의 표준 패턴이다.

## 안티패턴

**과도한 인자 수**

StrCat은 한 호출에 최대 26개 인자까지 지원한다(Abseil 정의 한계). 그 이상이면 컴파일 에러. 분할해서 호출한다.

```cpp
// 회피
absl::StrCat(a, b, c, ..., z, aa);  // 컴파일 에러

// Good
std::string r = absl::StrCat(a, b, c, ..., z);
absl::StrAppend(&r, aa);
```

**floating-point 정밀도**

`StrCat(double)`은 6 significant digits로 출력한다. 더 필요하면 `absl::StrFormat`을 쓰거나 [Part 4-06](/blog/programming/code-review/abseil/part4-06-str-format) 참조.

## 정리

- `StrCat`은 모든 인자를 `AlphaNum`으로 환산해 길이를 미리 계산한다.
- 단 한 번의 alloc + 선형 memcpy로 완성된다.
- `operator+`, `ostringstream`보다 빠르며 코드도 짧다.
- `StrAppend`는 기존 버퍼를 확장한다.
- 자가 참조 인자는 금지.

## 다음 편

[Part 4-04 — StrSplit](/blog/programming/code-review/abseil/part4-04-str-split)에서 반대 방향, 즉 문자열 분리의 일등 시민 API를 본다.

## 관련 항목

- [Part 4-01 — string_view](/blog/programming/code-review/abseil/part4-01-string-view)
- [Part 4-05 — StrJoin](/blog/programming/code-review/abseil/part4-05-str-join)
- [Part 4-06 — StrFormat](/blog/programming/code-review/abseil/part4-06-str-format)
- [Folly Part 6-02 — Conv customization](/blog/programming/code-review/folly/part6-02-conv-customization)
- [Tip of the Week #3: StrCat](https://abseil.io/tips/3)
