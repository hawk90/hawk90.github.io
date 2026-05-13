---
title: "Ch 10: Comments / Formatting / Closing"
date: 2025-05-13T10:00:00
description: "주석 / 형식 (줄 길이, 공백, 중괄호, 조건문, 루프, 포인터, 리턴, 초기화) / Exceptions to Rules / Inclusive Language / Parting Words."
tags: [Google, C++, Style-Guide, Comments, Formatting]
series: "Google C++ Style"
seriesOrder: 10
draft: false
---

> 마지막 장. 주석 / 형식 / 예외 / 마무리.

## Comments

### Comment Style

> `//` 선호. 다중 줄도 — `//`.

```cpp
// 좋음:
// This is a comment.
// Multiple lines also use //.

// 회피:
/* C-style block comment. */
```

`/* */` — 라이선스 헤더 / 거대 블록 등 특수 경우만.

### File Comments

```cpp
// Copyright 2025 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// ...
//
// This file implements the URL parsing for the foo project.
// See URL Parsing Design Doc for details.
```

- 라이선스
- 저작자 (선택)
- 파일의 목적

### Class Comments

```cpp
// A class for representing a 2D point in screen coordinates.
//
// This class is not thread-safe.
//
// Example usage:
//   Point p(10.0, 20.0);
//   p.Translate(5.0, 5.0);
class Point {
    // ...
};
```

- 무엇을 하는 클래스
- 동시성 보장
- 사용 예 (있으면 좋음)

### Function Comments

```cpp
// Returns the user with the given ID. Returns nullptr if not found.
//
// The returned pointer is owned by the User table.
User* GetUser(int id);

// Computes the sum of all elements.
//
// Args:
//   v: The vector to sum. Must not be empty.
//
// Returns: The sum.
int Sum(const std::vector<int>& v);
```

- 무엇을 하는 함수
- 인자 의미 (자명하지 않으면)
- 반환값 의미
- 예외 / 에러 조건
- 부작용

### Variable Comments

```cpp
// Number of retries before giving up.
constexpr int kMaxRetries = 3;

class Foo {
    int counter_;   // 자명 — 주석 생략
    int delta_;     // 시간차(초) — 의미 자명 안 함 → 주석:
    // The time difference in seconds.
};
```

자명한 변수 — 주석 생략. 의미 / 단위 / 제약이 — 코드만으로 안 보이면 주석.

### Implementation Comments

```cpp
void Process() {
    // Skip header bytes.
    cursor += 16;

    // The DEFLATE algorithm requires window size >= 32K.
    int window = std::max(input_size, 32768);
}
```

*왜*에 대한 주석. *무엇*은 코드.

### Function Argument Comments

```cpp
// 호출 시 — 명시:
ProductCalculator pc(
    /*price=*/100,
    /*quantity=*/5,
    /*discount=*/true);   // 의미 명시
```

flag / magic number — 의미 명시.

### TODO Comments

```cpp
// TODO(username): Fix this when foo is implemented.
// TODO(b/123456): Refactor after migration.
```

- 사용자명 (또는 버그 번호)
- 콜론
- 무엇을 / 언제

### Deprecation Comments

```cpp
ABSL_DEPRECATED("Use NewFunc instead.")
void OldFunc();
```

매크로 — 컴파일 시 경고.

## Formatting

### Line Length

> **80자**.

```cpp
// 좋음:
int result = ComputeSomething(input_value, threshold);

// 회피 — 80자 초과:
int result = ComputeSomethingWithVeryLongName(input_value, very_long_threshold);

// 좋음 — 분할:
int result = ComputeSomethingWithVeryLongName(
    input_value, very_long_threshold);
```

### Non-ASCII Characters

```cpp
// 좋음 — UTF-8:
const std::string kHello = "안녕";   // UTF-8 인코딩
const std::u8string kHelloU8 = u8"안녕";   // C++20 u8string
```

### Spaces vs. Tabs

> **2 spaces**. 탭 금지.

```cpp
void Func() {
··int x = 0;   // 2 spaces (· 표시)
}
```

### Function Declarations / Definitions

```cpp
// 한 줄에 들어가면 — 한 줄:
ReturnType FunctionName(Type1 param1, Type2 param2);

// 안 들어가면 — 분할 (들여쓰기 4):
ReturnType FunctionNameWithLongName(Type1 param1, Type2 param2,
                                    Type3 param3);

// 또는 — 더 안 들어가면:
ReturnType ClassName::FunctionNameThatIsReallyReallyLong(
    Type1 param1,
    Type2 param2,
    Type3 param3) {
    // ...
}
```

### Function Calls

```cpp
// 한 줄에:
bool result = DoSomething(arg1, arg2, arg3);

// 분할:
bool result = DoSomething(
    argument1, argument2, argument3, argument4);
```

### Conditionals

```cpp
// 좋음:
if (condition) {
    DoSomething();
} else if (other) {
    DoOther();
} else {
    DoElse();
}

// 회피 — 중괄호 생략:
if (condition) DoSomething();   // 가이드는 — 신중 (다중 줄로 변경 시 버그 위험)

// 한 줄이면 — OK:
if (condition) return -1;
```

`if`와 `(` 사이 — *공백*. `(`와 `condition` 사이 — 공백 없음.

### Loops and switch

```cpp
// 좋음:
for (int i = 0; i < n; ++i) {
    Process(i);
}

while (HasMore()) {
    Process(GetNext());
}

switch (var) {
    case 0:
        DoZero();
        break;
    case 1:
        DoOne();
        break;
    default:
        DoDefault();
        break;
}
```

`switch` — `default` 항상 처리.

### Pointer and Reference Expressions

```cpp
// 좋음 (Google):
int* p = nullptr;
int& r = x;
const int* p = nullptr;
const int& r = x;

// 회피:
int *p;    // 또는
int * p;
```

`*` / `&`는 — *타입*에 붙임.

### Boolean Expressions

```cpp
// 한 줄에 들어가면:
if (this_one_thing > this_other_thing &&
    a_third_thing == a_fourth_thing) {
    // ...
}

// 연산자는 — 줄 끝에 (Google 스타일)
```

### Return Values

```cpp
// 좋음:
return x;
return (x + y);   // 의미 있을 때만 괄호

// 회피:
return(x);   // 함수 호출처럼 보임
```

### Variable and Array Initialization

```cpp
// 좋음:
int x = 0;
int x(0);   // OK
int x{0};   // C++11+ — 권장

std::vector<int> v = {1, 2, 3};
std::vector<int> v{1, 2, 3};
```

`{}`는 — *narrowing 방지*.

```cpp
int x{3.14};   // 컴파일 에러 (narrowing)
int x(3.14);   // 3 (silent narrowing)
```

### Preprocessor Directives

```cpp
// 좋음 — 들여쓰기 없이:
#ifdef DEBUG
#define LOG(x) std::cerr << x
#else
#define LOG(x)
#endif

// 회피 — 들여쓰기:
    #ifdef DEBUG
```

### Class Format

```cpp
class MyClass {
public:
    MyClass();

    void DoWork();

private:
    int value_;
};
```

`public:` / `private:` — 들여쓰기 *없이*.

### Constructor Initializer Lists

```cpp
// 좋음:
MyClass::MyClass(int x, int y, int z)
    : x_(x), y_(y), z_(z) {
    // ...
}

// 또는 — 길면:
MyClass::MyClass(int x, int y, int z)
    : x_(x),
      y_(y),
      z_(z) {
    // ...
}
```

선언 순서로 — 초기화.

### Namespace Formatting

```cpp
// 좋음 — 들여쓰기 없이:
namespace mylib {

class Foo { /* ... */ };

void Bar();

}  // namespace mylib
```

`namespace` 안 — 들여쓰기 없음.

## Exceptions to the Rules

### 규칙

> 기존 코드 — *일관성 우선*.

```
규칙 vs. 기존 코드 충돌:
→ 기존 코드를 따른다 (점진 마이그레이션 외)
```

이유 — 일관성이 — *읽기*에 가장 중요.

### 새 파일 / 모듈

새로 시작하면 — 가이드 따름. 일관성 유지.

## Inclusive Language

### 규칙

> 차별적 용어 회피.

```cpp
// 회피:
master / slave         → primary / replica, leader / follower
blacklist / whitelist  → blocklist / allowlist
```

### 적용

```cpp
// 좋음:
class DatabasePrimary { /* ... */ };
class DatabaseReplica { /* ... */ };
std::vector<std::string> blocklist;
```

기존 용어가 — 그대로면 (외부 표준 등) 점진 마이그레이션.

## Parting Words

> 가이드를 *적용*하라.

```
이 가이드는 — 완벽하지 않다.
완벽한 스타일 가이드도 — 존재하지 않는다.
하지만 — 일관성이 가독성을 만든다.
의문이 있으면 — 가이드를 따른다.
```

### 일관성의 가치

- 새 인원 — 빠른 적응
- 코드 검토 — 빠른 진행
- 자동 도구 — 잘 동작
- 의사 결정 — 단순화

### 규칙은 — 도구

규칙 자체가 — 목적이 아니다. *읽기 쉬운 코드*가 목적. 규칙이 — 그것을 방해하면, 가이드 갱신을 — 제안.

## 시리즈 마무리

10장에 걸쳐 — Google C++ Style Guide의 모든 절을 정리.

```
1. Background / Version / Magic
2. Header Files
3. Scoping
4. Classes
5. Functions
6. Memory / Exceptions / Casting
7. const / Numbers / Macros
8. Type Deduction / Templates / Lambdas
9. Naming
10. Comments / Formatting (이 글)
```

핵심 메시지 — **Optimize for the reader**. 코드는 — 읽히기 위해 쓴다.

## 관련 항목

- [Ch 9: Naming](/blog/embedded/standards/google-cpp/chapter09-naming)
- [Ch 1: Background](/blog/embedded/standards/google-cpp/chapter01-background-version-magic)
- [시리즈 개요](/blog/embedded/standards/google-cpp/00-overview)
- [원문 — Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
