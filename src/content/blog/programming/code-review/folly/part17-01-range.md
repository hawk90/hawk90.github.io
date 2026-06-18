---
title: "folly::Range — 일반 iterator pair"
date: 2026-06-08T09:00:00
description: "Range<Iter>의 설계, StringPiece의 일반화, std::span / std::string_view와의 관계."
series: "Folly Code Review"
seriesOrder: 72
tags: [cpp, folly, range, span, string-view]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `Range<Iter>`는 두 iterator를 묶은 view 타입이다. `StringPiece`(=`Range<const char*>`)의 일반화이며, `std::span`/`std::string_view`보다 먼저 도입돼 둘의 역할을 통합 표현한다.

## 동기

`std::span`(C++20)과 `std::string_view`(C++17)는 표준에 따로 들어왔다. 둘 다 *iterator pair view*라는 본질은 같지만 도메인을 분리한 결과다.

```text
표준
  std::string_view  ← char (and char_traits)
  std::span<T>      ← T (and extent)

folly
  Range<T*>         ← 임의 contiguous
    using StringPiece = Range<const char*>
    using MutableStringPiece = Range<char*>
    using ByteRange = Range<const uint8_t*>
```

`Range`는 *iterator pair*만 추상화한다. 그게 contiguous한지, char인지, byte인지는 alias로 분기. 결과적으로 같은 코드베이스에서 모든 *view*가 일관된 인터페이스를 가진다.

```cpp
#include <folly/Range.h>

folly::StringPiece s = "hello";              // Range<const char*>
folly::ByteRange   b(data, len);             // Range<const uint8_t*>
folly::Range<int*> r(arr.data(), arr.size()); // Range<int*>

// 모두 begin/end/size/empty/subpiece/split_step 동일
```

## API

```cpp
folly::StringPiece s = "hello world";

s.size();        // 11
s.empty();       // false
s.front();       // 'h'
s.back();        // 'd'
s[0];            // 'h'

// substring (in-place, no alloc)
auto first5 = s.subpiece(0, 5);    // "hello"
auto rest   = s.subpiece(6);       // "world"

// scan
s.find("wor");           // 6
s.startsWith("hello");   // true
s.endsWith("world");     // true

// split-style iteration
folly::StringPiece csv = "a,b,c,d";
folly::StringPiece tok;
while (folly::split(",", csv, tok, /*ignoreEmpty=*/false)) {
  process(tok);
}
```

`StringPiece` 멤버 대부분이 `std::string_view`와 시그니처가 같다 — 마이그레이션이 쉽다.

### subpiece — slice without copy

```cpp
folly::StringPiece line = ReadLine();   // 외부 buffer 가리킴
auto key   = line.subpiece(0, 5);
auto value = line.subpiece(6);
// key/value 모두 line의 backing buffer 공유 — 할당 없음
```

`subpiece(offset, length)`가 핵심 연산. `std::string::substr`은 *복사*지만 `StringPiece::subpiece`는 *view 조정*. parser가 빈번히 호출하는 자리에서 비용이 결정적이다.

### split_step

```cpp
folly::StringPiece input = "key=value;type=int;ttl=300";

while (!input.empty()) {
  auto field = input.split_step(';');
  auto k = field.split_step('=');
  auto v = field;
  // k = "key", v = "value" → ...
}
```

`split_step(delim)`은 *제자리에서* 첫 토큰을 떼어내고 입력을 갱신한다. 별도 vector 만들지 않고 streaming parse. C에서 strtok 패턴의 안전판.

## ByteRange

```cpp
folly::ByteRange b(buffer, len);

// memmem 같은 byte 단위 scan
auto pos = b.find(needle);

// 다른 view로 reinterpret (주의 — 정렬)
folly::StringPiece sv(reinterpret_cast<const char*>(b.data()), b.size());
```

binary protocol parsing에 적합. `IOBuf`에서 raw bytes를 꺼낼 때 `ByteRange`가 자연스러운 인터페이스.

## 내부 구현

```cpp
// folly/Range.h 약식
template <class Iter>
class Range {
 public:
  using value_type      = typename std::iterator_traits<Iter>::value_type;
  using reference       = typename std::iterator_traits<Iter>::reference;
  using iterator        = Iter;
  using const_iterator  = Iter;
  using size_type       = size_t;

 private:
  Iter b_;
  Iter e_;

 public:
  Range() : b_(), e_() {}
  Range(Iter b, Iter e) : b_(b), e_(e) {}
  Range(Iter b, size_t sz) : b_(b), e_(b + sz) {}

  iterator begin() const { return b_; }
  iterator end()   const { return e_; }
  size_t   size()  const { return e_ - b_; }
  bool     empty() const { return b_ == e_; }

  auto subpiece(size_t off, size_t len = npos) const {
    auto newB = b_ + off;
    auto newE = (len == npos) ? e_ : newB + std::min(len, size_t(e_ - newB));
    return Range(newB, newE);
  }
};
```

본질은 두 iterator일 뿐이다. 16 byte (64-bit pointer 두 개) sizeof. constexpr 가능.

### StringPiece-specific

```cpp
using StringPiece = Range<const char*>;

// std::string과의 변환
StringPiece(const std::string& s) : b_(s.data()), e_(s.data() + s.size()) {}
StringPiece(const char* s)        : b_(s),        e_(s + std::strlen(s)) {}
StringPiece(const char* s, size_t n) : b_(s), e_(s + n) {}
```

`std::string`을 묵시적으로 받는다. API 경계에서 `void foo(folly::StringPiece s)` 한 줄로 `std::string`, `const char*`, `std::string_view` 모두 받는다.

## std::span / std::string_view와의 비교

| 항목 | std::span<T> | std::string_view | folly::Range<Iter> |
|------|---------------|---------------------|---------------------|
| 도입 | C++20 | C++17 | folly (수년 전) |
| 타입 | T pointer + size | const char* + size | Iter pair |
| 정수 extent | static / dynamic | always dynamic | always dynamic |
| 변환 | 다양 (contiguous 컨테이너) | string-like | std::string + char* + std::string_view |
| 멤버 | 일부 (subspan 등) | 풍부 | string_view 수준 + split_step |
| mutability | 있음 | 항상 const | Iter 타입에 의존 |

표준은 use case마다 타입을 분리했다. folly는 *iterator pair* 하나로 통일. 어느 쪽이 옳다기보다 *통일성 vs 도메인 명확성* trade-off.

마이그레이션 관점: `StringPiece`를 `std::string_view`로 바꿀 수 있다. API가 거의 호환. `split_step` 같은 일부 멤버는 free function으로 대체.

```cpp
// folly StringPiece
folly::StringPiece sp = "hello,world";
auto tok = sp.split_step(',');

// std::string_view + free function
std::string_view sv = "hello,world";
auto pos = sv.find(',');
auto tok = sv.substr(0, pos);
sv.remove_prefix(pos + 1);
```

표준이 *동등한 표현력*은 갖되 몇 줄 더 쓴다.

## 코드 리뷰 포인트

- 함수가 `const std::string&` 받음 → `StringPiece` 또는 `std::string_view`로 바꿔 호출자 부담 줄임.
- `StringPiece` 변수를 *원본 lifetime 밖*에서 사용 → 명백한 UAF. lambda capture by reference도 위험.
- `subpiece` 후 인덱스 계산이 원본 기준인지 sub 기준인지 헷갈리는 코드.
- `split` vs `split_step` 선택 — 결과 컨테이너 필요하면 `split`, streaming이면 `split_step`.
- `ByteRange`/`StringPiece` 간 reinterpret 시 char 부호 차이 주의.

## 자주 보는 안티패턴

```cpp
// 1. StringPiece를 반환하면서 local std::string 가리킴
folly::StringPiece BuildKey(int id) {
  std::string s = "k" + std::to_string(id);
  return s;   // UAF — s 소멸
}

// 2. std::string으로 받았다가 StringPiece로 즉시 변환
void Process(const std::string& s) {
  folly::StringPiece sp(s);
  parse(sp);
}
// → 처음부터 Process(folly::StringPiece) 가 옳음

// 3. StringPiece에 strlen 호출
auto len = strlen(sp.data());   // sp가 null-terminated 보장 없음 — UB

// 4. subpiece 범위 미체크
auto sub = sp.subpiece(off, len);   // off > sp.size() 면 UB
```

## std::string_view 마이그레이션 정책

fbcode는 점진적으로 `StringPiece` → `std::string_view` 이주 중이다. 단 다음 자리는 `StringPiece`가 남는다.

- `split_step` 같은 in-place mutation API가 필요한 곳.
- folly 내부 의존성이 깊은 곳 (IOBuf와 함께 쓰는 API).
- ABI 호환을 깨면 안 되는 외부 노출.

새 코드는 `std::string_view`로 시작하되 folly 함수와 boundary가 잦으면 `StringPiece`도 OK.

## 정리

- `Range<Iter>`는 iterator pair view의 일반화.
- `StringPiece = Range<const char*>`, `ByteRange = Range<const uint8_t*>`.
- `subpiece`, `split_step`이 핵심 — 복사 없는 in-place parse.
- `std::span`/`std::string_view`가 표준에 들어와 일부 자리를 대체 중이지만 folly 내부에서는 여전히 표준.
- API boundary에서는 view 타입을 받는 게 호출자 부담을 줄이는 기본.

## 다음 편

[Part 17-02: folly::Uri](/blog/programming/code-review/folly/part17-02-uri)에서 URL parser를 본다.

## 관련 항목

- [Folly Part 5-03 — StringPiece](/blog/programming/code-review/folly/part5-03-string-piece)
- [Folly Part 5-04 — Join / split](/blog/programming/code-review/folly/part5-04-join-split)
- [Folly Part 4-03 — Cursor](/blog/programming/code-review/folly/part4-03-cursor) — IOBuf view의 유사 개념
- [원문 — folly/Range.h](https://github.com/facebook/folly/blob/main/folly/Range.h)
