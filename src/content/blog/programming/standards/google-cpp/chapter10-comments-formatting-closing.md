---
title: "Ch 10: Comments / Formatting / Closing"
date: 2026-05-18T10:00:00
description: "주석 / 형식 (줄 길이, 공백, 중괄호, 조건문, 루프, 포인터, 리턴, 초기화) / Exceptions to Rules / Inclusive Language / Parting Words."
tags: [Google, C++, Style-Guide, Comments, Formatting]
series: "Google C++ Style"
seriesOrder: 10
draft: true
---

마지막 장은 주석과 형식, 그리고 가이드 자체의 마무리 메시지로 구성된다. 형식 규칙은 자동화 도구(clang-format)로 거의 다 처리되지만, 주석과 *원칙*은 사람이 의식해야 한다.

## Comments — Style

C++ 주석은 `//`를 기본으로 한다. 한 줄짜리도, 여러 줄짜리도 `//`로.

```cpp
// 한 줄 주석.

// 여러 줄 주석.
// 다음 줄.
// 그 다음 줄.
```

`/* ... */` 형식은 라이선스 헤더처럼 거대한 블록에만 쓴다.

```cpp
/*
 * Copyright 2025 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
```

함수 인자에 인라인으로 의미를 표시할 때는 `/* */`가 유용하다.

```cpp
// 호출지점에서 의미 명시
ProductCalculator pc(/*price=*/100,
                     /*quantity=*/5,
                     /*apply_discount=*/true);
```

## File Comments

파일 시작에는 라이선스(필요하면)와 파일이 하는 일에 대한 짧은 설명을 둔다.

```cpp
// Copyright 2025 Google LLC.
//
// Licensed under the Apache License, Version 2.0.
//
// URL parsing routines. This file implements the public API
// declared in url_parser.h. For the parsing algorithm, see
// https://example.com/url-parsing-design-doc.

#include "myproject/util/url_parser.h"
```

너무 명백한 내용("This file contains the URL parser.")은 적지 않는다. 디자인 문서 링크나 동시성 가정 같은 *코드만 봐서는 모르는 것*이 가치 있는 주석이다.

## Class Comments

클래스 선언 위에 클래스가 *무엇*을 *어떻게* 쓰이도록 의도되었는지 적는다.

```cpp
// A least-recently-used cache with a fixed maximum size.
//
// This cache is NOT thread-safe; callers must wrap access in a mutex
// if used from multiple threads. The cache evicts the oldest entry
// when capacity would be exceeded.
//
// Example:
//   LruCache<std::string, int> cache(/*capacity=*/100);
//   cache.Put("key", 42);
//   int value;
//   if (cache.Get("key", &value)) { /* ... */ }
template <typename Key, typename Value>
class LruCache {
    // ...
};
```

자주 빠뜨리지만 중요한 항목들:
- 동시성 보장 (thread-safe인지)
- 예외 안전성(있다면)
- 소유권 가정
- 라이프타임 제약
- 간단한 사용 예

## Function Comments

선언부에는 *무엇을 하는가, 입력의 의미는, 반환의 의미는, 부작용은 있는가*를 적는다. 정의에는 구현 디테일을 적는다.

```cpp
// 선언부 — 사용자를 위한 설명
//
// Returns the user with the given ID.
//
// The returned pointer is owned by this UserTable and remains valid
// until either RemoveUser() is called or this table is destroyed.
// Returns nullptr if no user has the given ID.
const User* GetUser(int user_id) const;
```

```cpp
// 정의부 — 구현 디테일
const User* UserTable::GetUser(int user_id) const {
    // Binary search keyed on user_id. The vector is kept sorted on
    // insert.
    auto it = std::lower_bound(users_.begin(), users_.end(), user_id,
                               UserIdComparator());
    if (it == users_.end() || it->id != user_id) {
        return nullptr;
    }
    return &*it;
}
```

자명한 함수는 주석을 생략해도 된다.

```cpp
// 주석 불필요 — 이름이 전부 알려 줌
int Size() const;
bool IsEmpty() const;
```

## Variable Comments

자명한 변수에는 주석이 필요 없다. 단위나 제약 같은 *코드에서 안 보이는 정보*가 있을 때 주석을 적는다.

```cpp
class Server {
private:
    int port_;             // 자명 — 주석 불필요

    // Connection timeout in milliseconds.
    int timeout_ms_;

    // Total bytes sent since the server started. Reset on Restart().
    int64_t bytes_sent_;

    // Whether handshake has been completed. Must be true before
    // SendMessage() is called.
    bool is_handshake_complete_;
};
```

## Implementation Comments

구현 안에서는 *왜*에 답하는 주석이 좋은 주석이다. *무엇*은 코드 자체가 말한다.

```cpp
// 회피 — 무엇 (코드가 말해 줌)
i += 1;   // Increment i

// Good — 왜
i += 1;   // Skip the BOM byte at the start of UTF-8 files.

cursor_ += 16;   // Skip the fixed 16-byte header.

// The DEFLATE algorithm requires a window of at least 32K bytes.
const int kWindowSize = std::max(input_size, 32 * 1024);
```

마법 같은 숫자나 조건의 *근거*는 주석으로 남긴다.

```cpp
if (retries_ >= 3) {
    // After 3 retries, increasing back-off doesn't help — the
    // service is most likely down. Fail fast.
    return absl::UnavailableError("...");
}
```

## TODO Comments

미래 작업은 `TODO`로 표시한다. 작성자나 추적 가능한 식별자를 함께 적는다.

```cpp
// TODO(yongbin): Replace polling with a condition variable once the
// new threading primitives land.
//
// TODO(b/123456): Remove this workaround after the upstream fix.
//
// TODO: Investigate slow path here.   // 회피 — 책임자 없음
```

비슷한 마커로 `FIXME`나 `XXX`를 쓰는 코드베이스도 있지만 Google은 `TODO`로 통일한다.

## Deprecation Comments

지원이 끝나는 API에는 `ABSL_DEPRECATED` 같은 매크로로 컴파일 시 경고를 띄운다. 주석도 함께 둔다.

```cpp
ABSL_DEPRECATED("Use NewProcessor::Process instead.")
absl::Status OldProcess(const Order& order);
```

호출자는 컴파일 시 경고와 함께 대체 API를 안내받는다.

## Formatting — 자동화 우선

형식 규칙은 대부분 `clang-format`이 처리한다. 코드베이스에 `.clang-format` 설정 파일을 두고, 저장 시 자동 포매팅을 켜는 것이 권장이다.

```yaml
# .clang-format
BasedOnStyle: Google
ColumnLimit: 80
IndentWidth: 2
```

이하 규칙은 자동 도구가 무엇을 강제하는지 이해하기 위한 참고다.

## Line Length

한 줄은 80자가 한도다. 80자를 넘기면 분할한다.

```cpp
// 회피 — 80자 초과
int result = ComputeSomethingWithVeryLongName(input_value, very_long_threshold);

// Good — 분할
int result = ComputeSomethingWithVeryLongName(
    input_value, very_long_threshold);
```

함수 선언이 한 줄에 안 들어가면 매개변수를 정렬한다.

```cpp
ReturnType ClassName::FunctionNameThatIsLong(Type1 param1, Type2 param2,
                                             Type3 param3);

// 또는 더 길면
ReturnType ClassName::FunctionNameThatIsReallyReallyLong(
    Type1 param1,
    Type2 param2,
    Type3 param3) {
    // ...
}
```

## Spaces vs. Tabs

들여쓰기는 2 spaces다. 탭은 절대 쓰지 않는다.

```cpp
void Func() {
  if (cond) {
    DoSomething();   // 2 spaces 들여쓰기
  }
}
```

## Function Calls

호출이 한 줄에 들어가면 한 줄로, 길면 분할한다.

```cpp
// 한 줄
bool result = DoSomething(arg1, arg2, arg3);

// 분할 — 첫 인자 들여쓰기 정렬
bool result = DoSomething(arg1, arg2,
                          arg3, arg4);

// 분할 — 함수 다음 줄에 모든 인자
bool result = DoSomething(
    arg1, arg2, arg3, arg4);
```

## Conditionals

`if`와 `(` 사이에 공백 하나, `(`와 조건 사이에 공백 없음.

```cpp
if (cond) { /* ... */ }      // Good
if(cond) { /* ... */ }       // 회피
if (cond ) { /* ... */ }     // 회피
```

본문이 한 줄이어도 중괄호를 두는 편을 권한다. 미래에 줄이 추가될 때 버그를 막는다.

```cpp
// Good
if (cond) {
    DoSomething();
}

// 회피 — 문장이 추가될 때 들여쓰기 함정
if (cond)
    DoSomething();
```

한 줄에 끝나는 짧은 조건은 OK다.

```cpp
if (cond) return -1;
if (!ok) continue;
```

## Loops and switch

`switch`에는 `default` 케이스를 항상 둔다. 비어 있으면 명시적으로 적는다.

```cpp
switch (status) {
    case Status::kOk:
        HandleOk();
        break;
    case Status::kError:
        HandleError();
        break;
    case Status::kPending:
    case Status::kRetrying:
        // 두 케이스 같은 처리
        HandleWait();
        break;
    default:
        LOG(FATAL) << "Unhandled status: " << status;
}
```

fall-through가 의도된 경우 `[[fallthrough]]`로 표시한다.

```cpp
switch (kind) {
    case Kind::kA:
        DoA();
        [[fallthrough]];
    case Kind::kB:
        DoB();
        break;
}
```

빈 루프 본문은 `{}` 또는 `continue;`로 명시한다.

```cpp
while (Process()) {
}
// 또는
while (Process()) continue;
```

## Pointer and Reference Expressions

`*`와 `&`는 타입에 붙인다. 변수에 붙이지 않는다.

```cpp
// Good
int* p = nullptr;
const int& r = x;
const Foo* p = nullptr;

// 회피
int *p;
int * p;
const int &r = x;
```

여러 변수를 한 줄에 선언할 때는 위 규칙이 혼란을 만들 수 있으므로 한 줄에 하나씩 선언한다.

```cpp
// 회피
int* p, q;   // p는 포인터, q는 int — 혼란

// Good
int* p;
int q;
```

## Boolean Expressions

긴 boolean 식은 연산자를 줄 끝에 둔다. 들여쓰기로 같은 우선순위가 시각적으로 정렬되게 한다.

```cpp
if (this_one_thing > this_other_thing &&
    a_third_thing == a_fourth_thing &&
    yet_another && last_one) {
    // ...
}
```

## Return Values

return에 불필요한 괄호를 두지 않는다.

```cpp
// Good
return x;
return x + y;

// 회피
return (x);
return (x + y);   // 의미 없는 괄호
```

복잡한 식에서 가독성을 위해 괄호를 쓰는 것은 OK다.

```cpp
return (cond_a && cond_b) || cond_c;
```

## Variable and Array Initialization

초기화에는 `=`, `()`, `{}` 세 가지 형태가 있다. `{}`는 narrowing을 막아 주므로 권장된다.

```cpp
int x = 0;        // 전통적
int x(0);         // 함수처럼 보임
int x{0};         // 권장 — narrowing 방지

std::vector<int> v = {1, 2, 3};
std::vector<int> v{1, 2, 3};
```

`{}`가 막아 주는 사례:

```cpp
int x{3.14};   // 컴파일 에러 (narrowing)
int x(3.14);   // 3 (silent narrowing)
int x = 3.14;  // 3 (silent narrowing)
```

`auto`와 `{}`를 함께 쓰면 `std::initializer_list`로 추론되므로 주의한다.

```cpp
auto x = 5;           // int
auto y = {5};         // std::initializer_list<int>
auto z{5};            // int (C++17 이후)
auto w = std::vector{1, 2, 3};   // vector<int>
```

## Preprocessor Directives

`#ifdef`/`#define`은 들여쓰기 없이 왼쪽 끝에 둔다.

```cpp
#ifdef DEBUG
#define LOG_DEBUG(msg) LOG(INFO) << msg
#else
#define LOG_DEBUG(msg) ((void)0)
#endif
```

들여쓰기로 중첩 의미를 표현할 수도 있다.

```cpp
#ifdef ENABLE_TLS
#  ifdef USE_OPENSSL
#    include <openssl/ssl.h>
#  else
#    include <mbedtls/ssl.h>
#  endif
#endif
```

## Class Format

access specifier(`public:`/`private:`/`protected:`)는 들여쓰기 없이 클래스와 같은 열에 둔다. 안의 멤버만 들여쓴다.

```cpp
class MyClass {
public:
    MyClass();

    void DoWork();
    int GetValue() const { return value_; }

private:
    int value_;
};
```

## Constructor Initializer Lists

초기화 목록은 멤버 선언 순서대로 쓴다. 컴파일러가 그 순서로 초기화하기 때문이다.

```cpp
class MyClass {
public:
    MyClass(int x, int y, int z)
        : x_(x), y_(y), z_(z) {}

private:
    int x_;
    int y_;
    int z_;
};
```

길면 줄을 나누고 콜론과 콤마를 정렬한다.

```cpp
MyClass::MyClass(int x, int y, int z, int w, int v)
    : x_(x),
      y_(y),
      z_(z),
      w_(w),
      v_(v) {
    // ...
}
```

## Namespace Formatting

namespace 본문에는 들여쓰기를 하지 않는다. 닫을 때는 어느 namespace인지 주석으로 표시한다.

```cpp
namespace myproject {
namespace cache {

class LruCache { /* ... */ };

void Helper();

}  // namespace cache
}  // namespace myproject
```

C++17의 중첩 namespace 선언도 자주 쓴다.

```cpp
namespace myproject::cache {

class LruCache { /* ... */ };

}  // namespace myproject::cache
```

## Exceptions to the Rules

이 가이드의 규칙은 *기존 코드와 일관성*을 위해 깨질 수 있다. 오래된 모듈에 새 코드를 추가할 때는 그 모듈의 스타일을 따른다. 일관성이 가독성을 만든다는 원칙이 모든 개별 규칙보다 우위에 있다.

새로 시작하는 파일과 모듈은 가이드를 따른다.

## Inclusive Language

차별적이거나 배제적 함의가 있는 용어는 피한다. 일반적으로 다음과 같은 대체가 권장된다.

```cpp
// 회피  →  Good
master / slave         →   primary / replica, leader / follower
blacklist / whitelist  →   blocklist / allowlist
```

새 코드에서는 권장 용어를 쓰고, 기존 용어는 점진적으로 마이그레이션한다. 외부 표준이나 API가 옛 용어를 쓰는 경우는 그대로 두되, 가능한 한 우리 코드에서는 새 용어로 감싼다.

## Parting Words

가이드 원문의 마지막 메시지는 단순하다.

> Use common sense and BE CONSISTENT.

이 가이드가 완벽하지 않다는 것을 가이드 자신이 인정한다. 모든 상황에 답을 줄 수도 없다. 그래서 두 가지를 강조한다. 첫째, 의문이 있으면 가이드의 규칙을 따른다. 일관성이 자산이다. 둘째, 가이드가 분명히 잘못된 경우에는 가이드 갱신을 제안한다.

스타일 가이드는 도구지 신앙이 아니다. 더 읽기 좋은 코드를 만든다는 목적에 봉사한다. 규칙이 그 목적을 방해한다면 규칙을 고친다.

## 시리즈 마무리

10장에 걸쳐 Google C++ Style Guide의 모든 절을 정리했다.

- Ch 1 — Background / Version / Magic
- Ch 2 — Header Files
- Ch 3 — Scoping
- Ch 4 — Classes
- Ch 5 — Functions
- Ch 6 — Memory / Exceptions / Casting
- Ch 7 — `const` / Numbers / Macros
- Ch 8 — Type Deduction / Templates / Lambdas
- Ch 9 — Naming
- Ch 10 — Comments / Formatting / Closing (이 글)

가이드의 핵심 메시지를 한 문장으로 줄이면 *Optimize for the reader*다. 코드는 한 번 쓰이고 수십 번 읽히기 때문이다. 일관성, 명시성, 단순함은 모두 그 목적을 위한 도구다.

## 관련 항목

- [Ch 9: Naming](/blog/programming/standards/google-cpp/chapter09-naming)
- [Ch 1: Background](/blog/programming/standards/google-cpp/chapter01-background-version-magic)
- [원문 — Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
