---
title: "absl::string_view 함정 — dangling·c_str·임시 객체"
date: 2026-06-10T09:04:00
description: "Part 4-02: string_view를 실전에서 잘못 쓰는 패턴 — dangling reference, c_str 변환 비용, 임시 std::string 바인딩."
series: "Abseil Code Review"
seriesOrder: 20
tags: [cpp, abseil, string-view, pitfalls, code-review]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`string_view`는 가볍지만 *non-owning*이다. 소유권을 다른 객체에 의탁한다는 뜻이며, lifetime을 잘못 다루면 모든 잘못이 정적 분석으로 잡히지 않는다. 가장 자주 보이는 세 함정은 **dangling reference**, **임시 std::string 바인딩**, **null-terminator 가정**이다.

## 함정 1 — 임시 std::string 바인딩

가장 흔하다. 함수가 `std::string`을 반환하는 경우에 발생한다.

```cpp
std::string GetUserName();

// 회피 — UB
absl::string_view name = GetUserName();
LOG(INFO) << name;  // GetUserName()의 반환값은 이미 소멸됨
```

`GetUserName()`의 반환값은 임시 객체다. `name`이 그 임시의 내부 버퍼를 가리키는 순간, full expression이 끝나면서 임시는 파괴된다. `name`은 해제된 메모리를 가리킨다.

**규칙**: `string_view`로 함수 반환값을 받지 말 것. 함수가 *view를 반환*하는 경우에만 view로 받는다.

```cpp
// Good — std::string으로 받는다
std::string name = GetUserName();
LOG(INFO) << name;

// Good — view를 반환하는 함수라면
absl::string_view ViewSomething();
absl::string_view v = ViewSomething();
```

리뷰 시점 패턴: `string_view x = Func()` 형태를 보면 `Func`의 반환 타입을 확인한다.

## 함정 2 — 멤버 변수 보관

```cpp
// 회피
class Logger {
 public:
  explicit Logger(absl::string_view prefix) : prefix_(prefix) {}
  void Log(absl::string_view msg) { /* prefix_ 사용 */ }
 private:
  absl::string_view prefix_;
};

// 호출 측
std::string p = "[server] ";
Logger logger(p);
p = "[changed] ";  // 원본이 변경되거나
// p가 스코프 밖으로 나가면 prefix_는 dangling
```

`string_view`를 멤버로 들면 객체의 lifetime이 외부 문자열의 lifetime에 묶인다. 사용자가 이 규약을 어기는 순간 UB가 발생한다.

```cpp
// Good — 보관할 거면 복사한다
class Logger {
 public:
  explicit Logger(absl::string_view prefix) : prefix_(prefix) {}
  // ...
 private:
  std::string prefix_;  // 복사 보관
};
```

예외는 **flyweight 패턴**처럼 외부 영구 객체의 view를 의도적으로 들고 있는 경우다. 이때 의도를 주석으로 명시한다.

```cpp
class Token {
  // 원본 source의 lifetime > Token의 lifetime이 호출 규약으로 보장됨.
  absl::string_view text_;
};
```

## 함정 3 — c_str 변환

`string_view`에는 `c_str()`이 없다. 메모리 종단에 null이 있다는 보장이 없기 때문이다.

```cpp
// substring view
absl::string_view full = "boom-shaka-laka";
absl::string_view first = full.substr(0, 4);  // "boom"
// first.data()는 'b'를 가리키지만, first.data()[4]는 '-'이다
```

C API에 넘기려면 새 string을 만들어야 한다.

```cpp
// 회피 — 컴파일 안 됨
open(view.c_str(), O_RDONLY);

// 회피 — view.data()는 null-terminated 아님
open(view.data(), O_RDONLY);

// Good — 변환 비용을 인지하고 알로케이션
std::string path(view);
open(path.c_str(), O_RDONLY);
```

이 변환은 alloc + 복사 비용이 든다. 짧은 경로라면 SSO 안에 들어가 alloc은 없지만 복사는 일어난다. **C API 경계는 view의 약점이다.** 가능하면 C++ API를 거치는 쪽으로 설계를 끌어간다.

## 함정 4 — 비교 함수의 char* 트랩

```cpp
absl::string_view sv = "boom";
const char* cs = sv.data();  // 위험: cs는 null-terminated 아닐 수 있음

strcmp(cs, "boom") == 0;  // sv가 full string이면 우연히 동작
```

`sv`가 다른 view의 substring이면 `strcmp`는 종단을 넘어서 읽는다. 비교는 항상 view 비교 또는 absl 헬퍼로.

```cpp
// Good
sv == "boom"
absl::EqualsIgnoreCase(sv, "boom")
```

## 함정 5 — operator+의 함정

`std::string`은 `string_view`와의 `+`를 지원하지 않는다.

```cpp
absl::string_view a = "hello";
absl::string_view b = " world";

// 회피 — 컴파일 안 됨
std::string s = a + b;

// 회피 — 부분 컴파일 (string + view는 지원)
std::string s2 = std::string(a) + b;  // 변환 비용

// Good — StrCat
std::string s3 = absl::StrCat(a, b);
```

[Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)에서 StrCat이 왜 더 빠른지 본다.

## 함정 6 — 잘못된 length 가정

생성자 두 종류를 혼동하면 데이터를 잘못 읽는다.

```cpp
const char data[] = {'a', 'b', 'c', 0, 'd', 'e'};  // 6 bytes, 중간에 NUL

absl::string_view s1(data);          // strlen 사용 → length=3 ("abc")
absl::string_view s2(data, 6);       // 명시 length=6 ("abc\0de")
```

binary 데이터를 view로 다룰 때는 *반드시* 명시 length 생성자를 쓴다. `strlen`은 첫 NUL에서 끊는다.

## 함정 7 — operator[]는 검사 없음

```cpp
absl::string_view sv = "";
char c = sv[0];  // UB — bound check 없음
```

검사가 필요하면 `sv.at(i)`(예외)나 사전 size 검사로.

## 코드 리뷰 패턴

이 함정들을 잡는 리뷰 룰은 단순하다.

1. **`string_view x = Func();`**가 보이면 `Func`의 반환 타입을 본다. `std::string`이면 차단.
2. 클래스 멤버 `string_view`는 lifetime 주석이 있는지 확인.
3. `view.data()` 또는 `view.c_str()`이 보이면 C API로 흘러가는지 확인.
4. binary 데이터 처리에 `string_view(ptr)` 단일 인자 생성자가 쓰이는지 확인.

## 정적 분석 도구

clang의 `-Wdangling-gsl` 경고가 일부 패턴을 잡는다. `[[clang::lifetimebound]]` 어노테이션은 함수 인자의 lifetime이 반환값에 묶인다는 정보를 컴파일러에 준다.

```cpp
// 명시: 반환된 view의 lifetime은 input의 lifetime에 묶인다
absl::string_view Trim(absl::string_view s [[clang::lifetimebound]]);

std::string GetSrc();
absl::string_view v = Trim(GetSrc());  // 컴파일러 경고
```

Abseil 자체도 일부 함수에 lifetimebound를 붙인다. 새 view 반환 함수를 만들 때 함께 붙이면 사용자 측 dangling을 줄인다.

## 정리

- `string_view`는 lifetime을 외부에 의탁하는 non-owning 참조.
- **임시 std::string 바인딩**, **멤버 변수 보관**, **C API c_str 변환**이 3대 함정.
- C API 경계에서는 `std::string` 변환 비용을 인지한다.
- binary 데이터에는 명시 length 생성자만 쓴다.
- `[[clang::lifetimebound]]`로 정적 분석 적용 범위를 넓힌다.

## 다음 편

[Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)에서 `string_view`를 받는 가변 인자 문자열 연결 API를 본다.

## 관련 항목

- [Part 4-01 — string_view 개요](/blog/programming/code-review/abseil/part4-01-string-view)
- [Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)
- [Tip of the Week #1: string_view](https://abseil.io/tips/1)
- [Tip of the Week #180: Avoiding dangling references](https://abseil.io/tips/180)
