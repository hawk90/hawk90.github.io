---
title: "Part 4-01: absl::string_view — non-owning 문자열 참조"
date: 2026-05-23T19:00:00
description: "Part 4-01: absl::string_view — 복사 없는 문자열 전달, lifetime 책임, std::string_view와의 관계."
series: "Abseil Code Review"
seriesOrder: 19
tags: [cpp, abseil, string-view, strings, performance]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: false
---

## 한 줄 요약

`absl::string_view`는 **포인터 + 길이**만 보유하는 non-owning 참조 타입이다. `const std::string&` 매개변수가 강제하는 임시 복사와 alloc 경로를 제거하기 위해 도입됐고, 함수 시그니처의 input 문자열 표현을 단일화하는 기반 타입이다.

## 왜 string_view가 필요한가

전통적 시그니처는 `const std::string&`이다. 그러나 이 타입은 호출 측에 부담을 안긴다.

```cpp
// 회피
bool StartsWithBoo(const std::string& s);

// 호출 측에서 std::string 객체가 강제됨
StartsWithBoo("boom");            // 임시 string 객체 alloc + 복사
char c[] = "boom";
StartsWithBoo(c);                 // 임시 string 객체 alloc + 복사

absl::string_view sv = "boom";
StartsWithBoo(std::string(sv));   // 호출 측이 변환 비용을 지불
```

`std::string&`를 받는다는 사실만으로 모든 호출 경로에 alloc이 끼어든다. 짧은 문자열도 SSO(short string optimization) 임계치를 넘으면 힙으로 간다. 빈번히 호출되는 비교 함수에서 이는 무시할 수 없는 비용이다.

`string_view`는 이를 해소한다.

```cpp
// Good
bool StartsWithBoo(absl::string_view s);

StartsWithBoo("boom");                       // alloc 없음
StartsWithBoo(std::string("boom"));          // alloc 없음 (std::string → view)
StartsWithBoo(absl::string_view("boom"));    // alloc 없음
```

호출 측이 어떤 형태로 문자열을 들고 있든 view 한 번에 수렴한다.

## API와 사용법

`absl::string_view`의 인터페이스는 `std::string_view`(C++17)와 동일하다. 핵심만 보면 다음과 같다.

```cpp
namespace absl {
class string_view {
 public:
  // 생성
  constexpr string_view() noexcept;                       // 빈 view
  constexpr string_view(const char* data, size_t len);    // 명시 길이
  string_view(const char* str);                           // strlen
  string_view(const std::string& s) noexcept;             // 변환

  // 접근
  constexpr const char* data() const noexcept;
  constexpr size_t size() const noexcept;
  constexpr bool empty() const noexcept;
  constexpr char operator[](size_t i) const;

  // 잘라내기 (새 view 생성, alloc 없음)
  constexpr string_view substr(size_t pos, size_t n = npos) const;
  constexpr void remove_prefix(size_t n);
  constexpr void remove_suffix(size_t n);

  // 검색
  size_t find(string_view s, size_t pos = 0) const noexcept;
  size_t rfind(string_view s, size_t pos = npos) const noexcept;

  // 변환
  explicit operator std::string() const;  // alloc 발생
};
}
```

핵심은 `substr`, `remove_prefix`, `remove_suffix`가 **alloc 없이 view를 갱신**한다는 점이다. `std::string`의 동일 연산은 새 문자열을 만든다.

```cpp
// std::string — 매 substr마다 alloc
std::string log = "2026-05-23T19:00:00 INFO ...";
std::string date = log.substr(0, 10);       // alloc
std::string level = log.substr(20, 4);      // alloc

// absl::string_view — alloc 0
absl::string_view log = "2026-05-23T19:00:00 INFO ...";
absl::string_view date = log.substr(0, 10);   // 포인터+길이만 갱신
absl::string_view level = log.substr(20, 4);
```

## 내부 구현

`absl::string_view`는 두 필드만 갖는다.

```cpp
// absl/strings/string_view.h (요약)
class string_view {
  const char* ptr_;
  size_t length_;
 public:
  // ...
};
```

`sizeof(absl::string_view) == sizeof(void*) + sizeof(size_t)`로, 64-bit에서 16바이트다. 레지스터 한 쌍에 들어가는 크기다. 전달은 값으로 한다.

```cpp
// 권장 — 값으로 받는다
void Parse(absl::string_view input);

// 회피 — 참조로 받을 이유가 없다 (이미 충분히 작다)
void Parse(const absl::string_view& input);
```

`ptr_`는 null이 아니더라도 *null-terminated 보장이 없다*. 이 점이 C API와의 마찰을 만든다.

## std::string_view와의 관계

C++17부터 `std::string_view`가 표준에 들어왔다. Abseil은 `ABSL_USES_STD_STRING_VIEW` 플래그에 따라 alias로 동작한다.

```cpp
// absl/strings/string_view.h (요약)
#ifdef ABSL_USES_STD_STRING_VIEW
namespace absl {
using string_view = std::string_view;
}
#else
namespace absl {
class string_view { /* ... */ };
}
#endif
```

C++17 이상 빌드에서는 `absl::string_view`가 `std::string_view`의 별칭이다. 둘 다 ABI 호환이고, 인터페이스도 동일하다. 새 코드라면 `std::string_view`로 적어도 무방하나, Google 사내 스타일은 Abseil 일관성을 위해 `absl::string_view`를 선호한다.

## 코드 리뷰 포인트

리뷰에서 가장 자주 보이는 권장 변환은 다음 세 가지다.

**1. 함수 매개변수의 `const std::string&` → `absl::string_view`**

```cpp
// 회피
absl::Status SaveUser(const std::string& name);

// Good
absl::Status SaveUser(absl::string_view name);
```

저장 시점에 `std::string`이 필요하면 함수 안에서 `std::string(name)`으로 변환하면 된다. 호출 측에 비용을 떠넘기지 않는다.

**2. 임시 substring 추출**

```cpp
// 회피 (alloc 발생)
if (path.substr(0, 5) == "/api/") { ... }

// Good (alloc 없음)
absl::string_view path_view = path;
if (path_view.substr(0, 5) == "/api/") { ... }

// 더 Good
if (absl::StartsWith(path, "/api/")) { ... }
```

**3. 검색·비교 헬퍼는 view를 받는다**

```cpp
bool absl::StartsWith(absl::string_view s, absl::string_view prefix);
bool absl::EndsWith(absl::string_view s, absl::string_view suffix);
bool absl::StrContains(absl::string_view haystack, absl::string_view needle);
```

이 함수들이 `string_view`를 받기 때문에 `const std::string&`로 받는 사용자 정의 헬퍼는 일관성을 깨뜨린다.

## 안티패턴

**값 보관**

`string_view`는 데이터의 소유권이 없다. 멤버 변수로 보관하면 dangling 위험이 생긴다.

```cpp
// 회피
class UserCache {
  absl::string_view user_name_;  // dangling 위험
 public:
  void SetName(absl::string_view name) { user_name_ = name; }
};

// Good — 보관할 거면 std::string으로
class UserCache {
  std::string user_name_;
 public:
  void SetName(absl::string_view name) { user_name_ = std::string(name); }
};
```

상세는 다음 글 [Part 4-02 — string_view 함정](/blog/programming/code-review/abseil/part4-02-string-view-pitfalls)에서 다룬다.

**`c_str()` 기대**

`string_view`에는 `c_str()`이 없다. null-terminated가 아니기 때문이다. C API에 넘기려면 `std::string`으로 변환해야 한다.

```cpp
// 회피 — 컴파일 안 됨
open(view.c_str(), O_RDONLY);

// Good — 변환 비용 인지
open(std::string(view).c_str(), O_RDONLY);
```

## 정리

- `absl::string_view`는 **포인터 + 길이**만 보유하는 non-owning 참조.
- 함수 매개변수에서 `const std::string&`을 대체해 호출 측 alloc을 제거한다.
- `substr`, `remove_prefix`, `remove_suffix`가 alloc 없이 view를 재계산한다.
- C++17 빌드에서는 `std::string_view`의 alias가 된다.
- null-terminated 보장이 없어 C API에는 `std::string` 변환이 필요하다.
- 멤버 변수 보관은 dangling을 부른다.

## 다음 편

[Part 4-02 — string_view 함정](/blog/programming/code-review/abseil/part4-02-string-view-pitfalls)에서 dangling reference, 임시 객체 바인딩, `c_str()` 변환 비용 등 실전 함정을 본다.

## 관련 항목

- [Part 4-02 — string_view 함정](/blog/programming/code-review/abseil/part4-02-string-view-pitfalls)
- [Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)
- [Folly Part 5-01 — FBString](/blog/programming/code-review/folly/part5-01-fbstring) — Meta의 문자열 대응
- [Tip of the Week #1: string_view](https://abseil.io/tips/1)
