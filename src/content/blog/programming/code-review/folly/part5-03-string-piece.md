---
title: "folly::StringPiece — string_view 호환 분석"
date: 2026-06-05T09:07:00
description: "StringPiece의 역사적 배경, std::string_view와의 호환 layer, Range<const char*>로서의 일반화."
series: "Folly Code Review"
seriesOrder: 25
tags: [cpp, folly, stringpiece, string-view, strings]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::StringPiece`는 `Range<const char*>`의 alias로, `std::string_view` 이전 시대의 read-only view다. 지금은 두 타입이 implicit 변환되므로 함수 시그니처는 무엇을 써도 되지만 fbcode 관성으로 StringPiece가 우세하다.

## 동기

`std::string_view`는 C++17에 도입됐다. fbcode는 그 7년 전인 2010년부터 같은 개념의 `StringPiece`(Google이 먼저 제안)를 써왔다. 코드베이스 관성, ABI 안정성, 그리고 `Range<T*>` 일반화의 한 경우라는 디자인 가치 때문에 deprecated 되지 않고 남아 있다.

```cpp
// 모두 등가 — 함수 boundary에서 view 전달
void Process(folly::StringPiece s);
void Process(std::string_view s);
void Process(folly::Range<const char*> s);
```

핵심은 *어떤 형태의 contiguous read-only 문자열도 함수가 받을 수 있게* 하는 것. `std::string`, `fbstring`, `const char*`, 리터럴, 부분 substring 모두 변환된다.

## API & 사용법

```cpp
#include <folly/Range.h>

// 1. 생성 — 어디서든
folly::StringPiece sp1 = "literal";
folly::StringPiece sp2{std::string{"std::string"}};
folly::StringPiece sp3{fb_string};
folly::StringPiece sp4{sv};                       // std::string_view에서
folly::StringPiece sp5{buf, n};                   // (ptr, len)

// 2. 표준 view 인터페이스
sp1.size();        sp1.empty();
sp1.data();        sp1.front();
sp1.starts_with("li");
sp1.ends_with("al");
sp1.find('e');

// 3. Range 인터페이스 (folly만의 추가)
sp1.subpiece(2, 3);          // "ter"
sp1.removePrefix("lit");     // sp1이 "eral"로 mutate
sp1.removeSuffix("al");      // sp1이 "lit" 으로
sp1.split_step(' ');         // delimiter로 잘라 앞 조각 반환

// 4. std::string_view로 명시 변환
std::string_view sv = sp1;   // implicit OK
auto sv2 = sp1.toFmt();      // fmt가 인식하는 형태
```

`removePrefix`/`removeSuffix`/`split_step`은 view를 *in-place로 진행*시킨다. parser에서 token을 잘라낼 때 새 객체 없이 진행할 수 있어 가볍다.

## 내부 구현

```cpp
// folly/Range.h 의 약식
template <class Iter>
class Range {
  Iter b_;       // begin
  Iter e_;       // end
public:
  constexpr Range() : b_(), e_() {}
  constexpr Range(Iter b, Iter e) : b_(b), e_(e) {}
  constexpr Range(Iter b, size_t n) : b_(b), e_(b + n) {}

  // const char* + size_t 특화 등 다수 ctor
  /* implicit */ Range(const std::string& s)
    : b_(s.data()), e_(s.data() + s.size()) {}

  constexpr size_t size() const { return e_ - b_; }
  constexpr Iter data() const { return b_; }
  // ...
};

using StringPiece = Range<const char*>;
using MutableStringPiece = Range<char*>;
using ByteRange = Range<const unsigned char*>;
using MutableByteRange = Range<unsigned char*>;
```

두 포인터(begin/end)만 들고 다닌다. `std::string_view`가 (ptr, len)인 것과 representation이 다르다. 의미는 같지만 ABI는 호환되지 않는다.

`folly::Range`는 char에 한정되지 않는다. `ByteRange`(`uint8_t*`), `MutableStringPiece`(`char*`), 사용자 타입 포인터 등 모든 contiguous range를 같은 타입 family로 다룰 수 있다. `IOBuf::coalesce()`가 `ByteRange`를 반환하는 이유다.

### split_step의 진행 의미

```cpp
folly::StringPiece line = "user:42:active";
auto user   = line.split_step(':');   // "user", line은 "42:active"
auto id     = line.split_step(':');   // "42",   line은 "active"
auto status = line;                   // "active"
```

`line`이 in-place로 줄어들면서 token을 하나씩 반환한다. heap 할당 0, 추가 buffer 0. 큰 log 파일을 parse할 때 성능 차이가 크다.

## std::string_view 비교

| 항목 | `folly::StringPiece` | `std::string_view` |
|------|----------------------|--------------------|
| Representation | (begin, end) | (ptr, size) |
| 도입 시기 | 2010 (folly) | C++17 |
| `starts_with` | O | O (C++20) |
| `removePrefix(StringPiece)` | O (substring 매칭) | X (chars만) |
| `split_step` | O | X |
| general Range alias | O (`Range<T*>`) | X (char/wchar 한정) |
| ADL hash | `folly::hasher` | `std::hash` |
| `constexpr` | C++14 한정 | 전체 constexpr |

`std::string_view::remove_prefix(n)`는 n개 char만 떼는 반면, `StringPiece::removePrefix(sp)`는 prefix가 일치하면 잘라낸다. 두 의미가 같은 이름을 공유해 혼동이 생긴다(folly가 더 일찍 정의했다).

## 코드 리뷰 포인트

```cpp
// Bad — 새 코드에서 std::string으로 받음
void Tokenize(const std::string& input);    // 호출자가 변환 강제

// Good — view로 받아 모든 호출자 흡수
void Tokenize(folly::StringPiece input);
```

함수가 데이터를 소유하지 않으면 view로 받는다. `const std::string&`는 `const char*` literal을 받으면 임시 `std::string`을 만들어 할당이 일어난다.

```cpp
// 위험 — 임시에서 view 잡기
folly::StringPiece bad = std::string("temp");   // dangling!
LOG(INFO) << bad;                                // UB

// 안전 — 생존을 보장하는 source
const std::string& s = GetString();              // refer to long-lived
folly::StringPiece ok = s;
```

`StringPiece`는 view 라서 lifetime을 직접 관리하지 않는다. 임시 객체에서 뽑으면 dangle 한다.

```cpp
// 미묘 — Range가 nullptr이 아닌 빈 view를 가질 수 있다
folly::StringPiece e1;                    // size==0, data==nullptr
folly::StringPiece e2 = "";               // size==0, data!=nullptr
e1.data();   // nullptr — c_str로 못 씀
e2.data();   // ""    — c_str OK
```

`StringPiece`는 NUL-terminated를 *보장하지 않는다*. `c_str()`이 필요한 C API에는 `to<std::string>(sp).c_str()`로 복사 후 전달.

## 안티패턴

- **`std::string_view`와 `StringPiece`를 한 코드베이스에 혼재**: 변환은 implicit이지만 hash·comparator·overload set이 충돌할 수 있다. 새 모듈은 한 쪽으로 통일.
- **`StringPiece`에서 `c_str()` 호출 시도**: 그런 멤버는 없다. NUL terminate가 필요한 곳은 view를 쓰지 않는다.
- **multi-thread에서 `removePrefix` 등 mutating 호출**: 진행형 in-place 연산이라 같은 view를 두 스레드가 mutate하면 race. view는 thread-local로.

## 정리

- `StringPiece = Range<const char*>` — 두 포인터(begin/end) view.
- `std::string_view`와 implicit 변환 가능하나 ABI는 별개.
- `removePrefix/Suffix`, `split_step`로 parser 작성이 가볍다.
- 임시에서 뽑으면 dangle, NUL-terminate 보장 없음.
- 새 코드는 std/folly 중 하나로 통일하고 boundary에서만 변환.

## 다음 편

다음은 `folly::join`과 `folly::split`의 구현, StringPiece 기반 zero-copy split이 어떻게 동작하는지 본다.

## 관련 항목

- [Part 5-01: FBString](/blog/programming/code-review/folly/part5-01-fbstring) — StringPiece가 가리키는 owner
- [Part 5-04: Join / split utilities](/blog/programming/code-review/folly/part5-04-join-split) — split_step의 high-level wrapper
- [Part 4-03: Cursor](/blog/programming/code-review/folly/part4-03-cursor) — IOBuf 위의 ByteRange parser
- [원문 — folly/Range.h](https://github.com/facebook/folly/blob/main/folly/Range.h)
