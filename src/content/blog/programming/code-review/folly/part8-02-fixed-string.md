---
title: "Part 8-02: FixedString (compile-time string)"
date: 2026-05-24T13:00:00
description: "FixedString — fixed capacity, fully constexpr 문자열 type. compile-time concat과 hash가 가능."
series: "Folly Code Review"
seriesOrder: 36
tags: [cpp, folly, container, fixedstring, constexpr]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::FixedString<N>`은 N 크기의 char 배열을 가진 fully constexpr 문자열. heap 없음, throw 없음, 모든 연산이 `constexpr`. compile-time string concat과 hash 계산이 가능.

## 동기

C++의 string handling은 runtime이 default다. `std::string`은 heap, `std::string_view`는 view만, `const char*`는 길이 정보 없음. compile-time에 다음을 하고 싶다.

- enum to string compile-time conversion.
- log tag concatenation `"[module=" + name + "]"`.
- constexpr hash key.
- table lookup의 key를 constexpr 생성.

C++17의 `std::string_view`는 view, C++20의 `consteval`은 표현력, C++26의 `constexpr std::string`은 아직 미정. 이 빈자리를 `FixedString`이 채운다.

```cpp
constexpr auto tag = folly::makeFixedString("hello") +
                     folly::makeFixedString(", world");
// tag는 컴파일 타임에 "hello, world"
static_assert(tag.size() == 12);
```

## API & 사용법

```cpp
#include <folly/FixedString.h>

// 1. 생성 — N은 컴파일 타임
constexpr folly::FixedString<5> s1{"hello"};
constexpr auto s2 = folly::makeFixedString("world");  // 추론

// 2. 표준 string 인터페이스
constexpr auto len = s1.size();             // 5
constexpr char c = s1[0];                   // 'h'
constexpr bool b = s1.starts_with("he");    // true

// 3. 연산 — 모두 constexpr
constexpr auto greeting = s1 + ", " + s2;
constexpr auto substr   = greeting.substr(0, 5);   // "hello"

// 4. string_view로 변환 (런타임에)
folly::StringPiece sp = s1;
std::string_view sv = s1;

// 5. compile-time hash
constexpr auto h = folly::FixedString{"key"}.hash();
```

`FixedString<N>`은 정확히 N+1 char buffer를 가진다(null terminator 포함). 모든 길이 정보가 type에 들어 있어 더 작은 객체.

## 내부 구현

```cpp
// 약식 — folly/FixedString.h
template <size_t N>
class BasicFixedString {
  char  data_[N + 1];   // null terminator 위해 +1
  size_t size_;

public:
  constexpr BasicFixedString() : data_{}, size_(0) {}

  constexpr BasicFixedString(const char (&s)[N + 1])
      : data_{}, size_(N) {
    for (size_t i = 0; i < N; ++i) data_[i] = s[i];
    data_[N] = '\0';
  }

  constexpr size_t size() const { return size_; }
  constexpr const char* data() const { return data_; }
  constexpr const char* c_str() const { return data_; }
  // ...
};

template <size_t N>
using FixedString = BasicFixedString<N>;
```

`data_`는 stack/static 영역. heap 호출 없음. constexpr context에서는 컴파일러가 buffer를 실제로 만들고 character를 채워 둔다.

### Operator+의 reductio

```cpp
template <size_t M, size_t N>
constexpr BasicFixedString<M + N> operator+(
    const BasicFixedString<M>& a,
    const BasicFixedString<N>& b) {
  BasicFixedString<M + N> r;
  for (size_t i = 0; i < M; ++i) r.data_[i] = a.data_[i];
  for (size_t i = 0; i < N; ++i) r.data_[M + i] = b.data_[i];
  r.data_[M + N] = '\0';
  r.size_ = M + N;
  return r;
}
```

결과 타입의 N이 두 operand size 합. compile-time 산술로 결정.

### Compile-time hash

```cpp
// 약식
constexpr uint64_t fnv1a(const char* s, size_t n) {
  uint64_t h = 0xcbf29ce484222325;
  for (size_t i = 0; i < n; ++i) {
    h ^= s[i];
    h *= 0x100000001b3;
  }
  return h;
}

template <size_t N>
constexpr uint64_t BasicFixedString<N>::hash() const {
  return fnv1a(data_, size_);
}
```

constexpr이므로 컴파일러가 hash 값을 미리 계산. `switch (FixedString{"key"}.hash()) { case ... }` 같은 코드가 동작.

## std/abseil 비교

```cpp
// std (C++26 후보)
// constexpr std::string  — 아직 미확정

// 현재 std
constexpr std::string_view sv = "hello";   // view만
// 길이 정보는 있으나 storage 합성 불가

// abseil — 직접 대응 없음. CharSet 정도

// folly
constexpr folly::FixedString s = "hello";  // 완전 constexpr
```

C++20의 `std::string_view`는 view만이라 새 문자열 합성 불가. `constexpr std::string`은 표준 일정에 따라 다름. `FixedString`은 *지금* compile-time 합성을 제공.

## 사용 사례

### 1. Enum to string

```cpp
enum class Level { Info, Warning, Error };

constexpr auto levelName(Level l) {
  switch (l) {
    case Level::Info:    return folly::makeFixedString("INFO");
    case Level::Warning: return folly::makeFixedString("WARN");
    case Level::Error:   return folly::makeFixedString("ERR");
  }
}
// 호출도 constexpr 가능
```

### 2. Log prefix concatenation

```cpp
template <size_t N>
constexpr auto logPrefix(folly::FixedString<N> module) {
  return folly::makeFixedString("[mod=") + module + "] ";
}
constexpr auto prefix = logPrefix(folly::makeFixedString("net"));
// "[mod=net] "
```

### 3. Compile-time map key

```cpp
constexpr struct {
  folly::FixedString<8> name;
  int                   value;
} table[] = {
  { folly::makeFixedString("alpha"),   1 },
  { folly::makeFixedString("beta"),    2 },
  { folly::makeFixedString("gamma"),   3 },
};
```

## 코드 리뷰 포인트

```cpp
// Bad — runtime string을 FixedString으로
auto s = folly::makeFixedString(GetRuntimeString().c_str());
// N을 컴파일 타임에 알 수 없어 안 됨

// Good — runtime은 fbstring/string
folly::fbstring s = GetRuntimeString();
```

`FixedString<N>`의 N은 컴파일 타임 상수여야 한다. runtime 길이면 다른 type을 쓴다.

```cpp
// 주의 — 큰 N은 객체 크기 증가
constexpr folly::FixedString<10000> buf;   // 10KB stack/object
```

`FixedString<N>`의 sizeof는 N+1+sizeof(size_t). 큰 N은 stack/static 메모리 압박.

## 안티패턴

- **template parameter pack에 FixedString 잘못 사용**: template argument에 사용하려면 C++20 `consteval`/`constexpr`이 잘 동작하는 컴파일러 필요. gcc 9+, clang 10+.
- **runtime string과 mix**: `folly::FixedString + std::string`은 불가. 명시적 변환 후 연결.
- **N을 type 시그니처에 노출**: 함수 인자 `void f(FixedString<5>)`은 오직 5-char만 받음. template 함수로 N 추론하게.

## 정리

- `FixedString<N>`은 N+1 char buffer + size의 constexpr 문자열.
- 모든 연산이 `constexpr` — compile-time concat, hash, substr.
- heap 없음, exception 없음.
- 런타임 길이가 가변이면 다른 type.
- C++26 `constexpr std::string` 표준화 전까지의 best practice.

## 다음 편

`AtomicHashMap`은 lock-free read가 가능한 hash map이다. append-only 제약 하에서 어떻게 동작하는지.

## 관련 항목

- [Part 8-01: SmallVector](/blog/programming/code-review/folly/part8-01-small-vector) — inline storage 사상
- [Part 5-01: FBString](/blog/programming/code-review/folly/part5-01-fbstring) — runtime string
- [Part 5-03: StringPiece](/blog/programming/code-review/folly/part5-03-string-piece) — view 변환 대상
- [원문 — folly/FixedString.h](https://github.com/facebook/folly/blob/main/folly/FixedString.h)
