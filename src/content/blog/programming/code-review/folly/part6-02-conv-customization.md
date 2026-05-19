---
title: "Part 6-02: Customization (사용자 타입)"
date: 2026-05-24T05:00:00
description: "folly::to에 사용자 타입을 hook하기 — parseTo, toAppend ADL 확장."
series: "Folly Code Review"
seriesOrder: 28
tags: [cpp, folly, conv, customization, user-type]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

사용자 타입을 `folly::to`/`folly::tryTo` 변환 가능하게 만들려면 같은 namespace에 `parseTo(StringPiece, T&)`와 `toAppend(const T&, std::string*)` 자유 함수를 정의한다. ADL로 발견된다.

## 동기

`fbcode`는 거의 모든 타입을 텍스트 로그로 흘려보낸다. 매 타입마다 `<<` overload, `toString()` 멤버, `from_string()` factory를 따로 만들면 호출자가 어느 API를 써야 할지 헷갈린다. 통일된 hook 한 쌍을 정해 두면 `folly::to`가 자동으로 인식한다.

```cpp
struct UserId { uint64_t value; };

// 두 hook만 추가하면
void toAppend(const UserId& u, std::string* out) { /* ... */ }
folly::Expected<folly::StringPiece, folly::ConversionCode>
parseTo(folly::StringPiece sp, UserId& out)                 { /* ... */ }

// 자동 동작
auto s = folly::to<std::string>(UserId{42});
auto u = folly::to<UserId>("U#42");
```

## API & 사용법

### toAppend — T → string

```cpp
namespace myns {

struct Money {
  int64_t cents;
  std::string currency;   // "USD" 등
};

// 자유 함수, 같은 namespace
void toAppend(const Money& m, std::string* out) {
  folly::toAppend(m.cents / 100, '.',
                  folly::to<std::string>(m.cents % 100).insert(0, "00", 2 - 1),
                  ' ', m.currency, out);
}

// optional — size hint
size_t estimateSpaceNeeded(const Money& m) {
  return 32 + m.currency.size();
}

}  // myns

std::string s = folly::to<std::string>(myns::Money{12345, "USD"});
// "123.45 USD"
```

`estimateSpaceNeeded`는 reserve를 정확히 하기 위한 hook이다. 없어도 동작하나 reallocation 가능.

### parseTo — string → T

```cpp
namespace myns {

folly::Expected<folly::StringPiece, folly::ConversionCode>
parseTo(folly::StringPiece sp, Money& out) {
  // "123.45 USD" 형태 가정
  auto dot = sp.find('.');
  if (dot == folly::StringPiece::npos) {
    return folly::makeUnexpected(folly::ConversionCode::INVALID_LEADING_CHAR);
  }
  int64_t whole, cents;
  auto r1 = folly::tryTo<int64_t>(sp.subpiece(0, dot));
  if (!r1) return folly::makeUnexpected(r1.error());
  // ... cents, currency
  out = Money{whole * 100 + cents, "USD"};
  return folly::StringPiece{};   // 모두 소비
}

}  // myns

auto r = folly::tryTo<myns::Money>("123.45 USD");
```

반환은 *남은 input*. 모두 소비했으면 empty StringPiece. 부분 parse가 의도라면 남은 부분을 반환해 호출자가 이어 받게 한다.

## 내부 구현

### ADL dispatch

```cpp
// 약식 — folly/Conv.h
namespace folly {

template <class Tgt>
Tgt to(StringPiece sp) {
  Tgt result;
  using detail::parseTo_;     // 내부 default
  using ::parseTo;            // global parseTo도 보이게
  // ADL: sp가 user namespace의 parseTo도 찾는다
  auto remaining = parseTo(sp, result);
  if (!remaining) throw ConversionError{};
  if (!remaining->empty()) throw ConversionError{"trailing"};
  return result;
}

}
```

`using` declaration + 같은 expression에서의 ADL이 핵심. user namespace의 `parseTo`가 자동으로 후보에 들어간다. 이게 *Niebloid* 식으로 customizable point를 만드는 표준 패턴.

`toAppend`도 같은 방식. 다음과 같은 chain이 동작한다.

```cpp
folly::to<std::string>(a, b, c)
  → folly::toAppend(a, &out);   // ADL → user 또는 folly 기본
  → folly::toAppend(b, &out);
  → folly::toAppend(c, &out);
```

### default 동작

기본 hook은 다음을 안다.

- `std::is_arithmetic_v<T>` → built-in 빠른 path.
- `std::string`/`fbstring`/`StringPiece`/`const char*` → 직접 append.
- `bool` → "true"/"false" 또는 "0"/"1" (`<<bool>>`로 지정).
- enum → underlying integer로 폴백.

user 정의가 있으면 ADL이 우선. user가 enum class를 enum name으로 출력하고 싶으면 `toAppend` 특화로 enum-to-string switch 작성.

```cpp
enum class Color { Red, Green, Blue };

inline void toAppend(Color c, std::string* out) {
  switch (c) {
    case Color::Red:   out->append("Red");   break;
    case Color::Green: out->append("Green"); break;
    case Color::Blue:  out->append("Blue");  break;
  }
}
```

## std/abseil 비교

```cpp
// abseil — AbslStringify 멤버 또는 free function
struct UserId { uint64_t value; };

template <typename Sink>
void AbslStringify(Sink& sink, const UserId& u) {
  absl::Format(&sink, "U#%016x", u.value);
}
// 이제 absl::StrCat(UserId{42}), absl::StrFormat("%v", UserId{42}) 동작
```

| 항목 | folly::to | abseil StrCat | std::format |
|------|-----------|---------------|--------------|
| Hook name | `toAppend` / `parseTo` | `AbslStringify` | `std::formatter` 특화 |
| Find 메커니즘 | ADL + using | template + ADL | template 특화 |
| 양방향 | O (parseTo도) | X (출력만) | X (출력만) |
| C++ standard | 무관 | C++14 | C++20 |

folly만이 양방향(text↔T)을 한 쌍으로 제공한다. abseil/std는 출력만 있어 parsing은 별도로 만들어야 한다.

## 코드 리뷰 포인트

```cpp
// Bad — friend 멤버
struct UserId {
  friend std::string ToString(const UserId& u) { /* ... */ }
  // folly::to가 보지 못한다
};

// Good — ADL 자유 함수
struct UserId { uint64_t value; };
void toAppend(const UserId& u, std::string* out) { /* ... */ }
```

`ToString`/`to_string` 같은 별도 이름은 folly::to가 사용하지 못한다. *정확한 hook 이름*을 따라야 dispatch가 된다.

```cpp
// 위험 — parseTo가 estimateSpaceNeeded 없음
void toAppend(const Big& b, std::string* out) { /* 1KB 출력 */ }
// reserve 부정확 → realloc 여러 번

// 권장
size_t estimateSpaceNeeded(const Big& b) { return 1024; }
```

큰 출력은 estimate를 같이 정의해 reserve가 한 번에 끝나게.

## 안티패턴

- **template으로 toAppend 정의**: ADL은 같은 namespace의 non-template 자유 함수에 가장 잘 동작. template은 다른 컴파일 단위에서 못 볼 수 있다. concrete 타입별로.
- **`parseTo`가 input 전체 소비 후에도 empty 반환 안 함**: caller가 trailing data로 판단해 throw 한다. 모두 썼으면 empty StringPiece 반환.
- **`toAppend`가 throw**: `to<std::string>`은 nothrow를 기대한다. throw 가능성 있으면 contract 명시.

## 정리

- `toAppend(T, std::string*)` + `parseTo(StringPiece, T&)`로 양방향 hook.
- ADL로 user namespace 함수가 자동 dispatch.
- `estimateSpaceNeeded`는 옵션이나 큰 출력에 권장.
- abseil/std는 출력만, folly는 양방향 — text 양방향이 잦은 fbcode에 맞춤.
- 멤버 함수가 아니라 자유 함수, 같은 namespace.

## 다음 편

다음은 folly::to가 sprintf/stringstream 대비 얼마나 빠른지, lookup table과 SWAR가 어떻게 효과를 내는지 benchmark로 확인한다.

## 관련 항목

- [Part 6-01: folly::to / tryTo](/blog/programming/code-review/folly/part6-01-to-try-to) — hook을 호출하는 API
- [Part 6-03: Conv performance](/blog/programming/code-review/folly/part6-03-conv-performance) — toAppend 성능 측정
- [Part 5-02: fmt::format integration](/blog/programming/code-review/folly/part5-02-fmt-format-integration) — formatter 특화와 비교
- [원문 — folly/Conv.h](https://github.com/facebook/folly/blob/main/folly/Conv.h)
