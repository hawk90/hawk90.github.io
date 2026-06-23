---
title: "Abseil 매크로 — ABSL_HAVE_*·ABSL_ATTRIBUTE_*"
date: 2026-06-09T09:06:00
description: "Part 2-01: feature detection과 attribute 매크로 — 컴파일러·플랫폼 차이를 흡수하는 Abseil의 기반."
series: "Abseil Code Review"
seriesOrder: 6
tags: [cpp, abseil, macros, portability, base, attributes]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: `ABSL_HAVE_*`는 컴파일러·플랫폼 기능의 존재를 감지하고, `ABSL_ATTRIBUTE_*`는 표준화되지 않은 attribute의 컴파일러별 차이를 흡수한다. Abseil의 모든 코드가 이 두 매크로 위에 서 있다.

## 어떤 문제를 푸는가

C++의 portability는 표준만으로 부족하다. 같은 표준 버전이라도 컴파일러마다 지원 정도가 다르고, 비표준 attribute가 코드의 성능·정확성에 큰 영향을 준다.

세 가지 종류의 차이를 처리해야 한다.

1. **표준 기능의 존재 감지** — C++17이라도 `<filesystem>` 지원 여부가 컴파일러마다 다름.
2. **컴파일러별 builtin** — `__builtin_expect`, `__builtin_unreachable`은 GCC/Clang에만.
3. **attribute의 syntax 차이** — `[[nodiscard]]`는 C++17, MSVC의 `__declspec(...)`은 별도.

Abseil은 이 셋을 매크로로 감싸 통일한다.

## ABSL_HAVE_* — 기능 감지

`ABSL_HAVE_*`는 컴파일 시점에 사용 가능한 기능을 알려준다.

```cpp
// absl/base/config.h
#if defined(__cpp_lib_filesystem)
    #define ABSL_HAVE_STD_FILESYSTEM 1
#endif

#if defined(__has_builtin) && __has_builtin(__builtin_expect)
    #define ABSL_HAVE_BUILTIN_EXPECT 1
#endif

#if defined(__cpp_exceptions) && __cpp_exceptions
    #define ABSL_HAVE_EXCEPTIONS 1
#endif

#if defined(__cpp_rtti) && __cpp_rtti
    #define ABSL_HAVE_RTTI 1
#endif
```

사용 패턴은 단순하다.

```cpp
#include "absl/base/config.h"

void DoIO() {
#ifdef ABSL_HAVE_STD_FILESYSTEM
    std::filesystem::path p = "/tmp/x";
#else
    // POSIX fallback
    const char* p = "/tmp/x";
#endif
}
```

### 주요 ABSL_HAVE_* 목록

| 매크로 | 감지 대상 |
|---|---|
| `ABSL_HAVE_BUILTIN(x)` | clang/GCC builtin 존재 |
| `ABSL_HAVE_FEATURE(x)` | clang feature 존재 |
| `ABSL_HAVE_ATTRIBUTE(x)` | attribute 존재 |
| `ABSL_HAVE_CPP_ATTRIBUTE(x)` | `[[attr]]` 형태 존재 |
| `ABSL_HAVE_EXCEPTIONS` | `-fno-exceptions` 여부 |
| `ABSL_HAVE_RTTI` | `-fno-rtti` 여부 |
| `ABSL_HAVE_THREAD_LOCAL` | TLS 지원 |
| `ABSL_HAVE_ALIAS_TEMPLATE_ARGUMENT_DEDUCTION` | C++20 alias template CTAD |
| `ABSL_HAVE_STD_OPTIONAL` | `<optional>` 사용 가능 |
| `ABSL_HAVE_STD_VARIANT` | `<variant>` 사용 가능 |
| `ABSL_HAVE_STD_STRING_VIEW` | `<string_view>` 사용 가능 |

### __has_* 컴파일러 builtin 활용

`ABSL_HAVE_BUILTIN`, `ABSL_HAVE_ATTRIBUTE`는 GCC/Clang의 `__has_builtin`, `__has_attribute`를 감싼다.

```cpp
#if defined(__has_builtin)
    #define ABSL_HAVE_BUILTIN(x) __has_builtin(x)
#else
    #define ABSL_HAVE_BUILTIN(x) 0
#endif

// 사용
#if ABSL_HAVE_BUILTIN(__builtin_unreachable)
    [[noreturn]] inline void Unreachable() { __builtin_unreachable(); }
#else
    [[noreturn]] inline void Unreachable() { std::abort(); }
#endif
```

이 패턴이 Abseil 전반에서 반복된다. "지원하면 빠른 경로, 없으면 안전한 fallback."

## ABSL_ATTRIBUTE_* — attribute 추상화

C++ attribute는 컴파일러마다 syntax가 다르다.

```cpp
// 표준 C++11+
[[noreturn]] void Die();

// GCC/Clang 확장
__attribute__((noinline)) void Foo();

// MSVC 확장
__declspec(noinline) void Bar();
```

Abseil은 이런 차이를 매크로로 흡수한다.

```cpp
// absl/base/attributes.h에서 발췌

#if ABSL_HAVE_ATTRIBUTE(noinline) || (defined(__GNUC__) && !defined(__clang__))
    #define ABSL_ATTRIBUTE_NOINLINE __attribute__((noinline))
#elif defined(_MSC_VER)
    #define ABSL_ATTRIBUTE_NOINLINE __declspec(noinline)
#else
    #define ABSL_ATTRIBUTE_NOINLINE
#endif

ABSL_ATTRIBUTE_NOINLINE void SlowPath();
```

### 주요 ABSL_ATTRIBUTE_*

| 매크로 | 의미 |
|---|---|
| `ABSL_ATTRIBUTE_NOINLINE` | 인라인 금지 |
| `ABSL_ATTRIBUTE_ALWAYS_INLINE` | 강제 인라인 |
| `ABSL_ATTRIBUTE_COLD` | 거의 호출되지 않는 함수 (저속 경로) |
| `ABSL_ATTRIBUTE_HOT` | 자주 호출되는 함수 |
| `ABSL_ATTRIBUTE_NORETURN` | 돌아오지 않는 함수 |
| `ABSL_ATTRIBUTE_UNUSED` | 사용되지 않아도 경고 안 함 |
| `ABSL_ATTRIBUTE_PACKED` | struct padding 제거 |
| `ABSL_ATTRIBUTE_WEAK` | weak symbol |
| `ABSL_ATTRIBUTE_LIFETIME_BOUND` | 인자 lifetime이 반환값을 결정 |
| `ABSL_ATTRIBUTE_TRIVIAL_ABI` | clang의 trivial_abi |
| `ABSL_ATTRIBUTE_REINITIALIZES` | 객체가 재초기화되었음을 분석기에 알림 |

### LIFETIME_BOUND — 잘 알려지지 않은 중요한 도구

`ABSL_ATTRIBUTE_LIFETIME_BOUND`는 clang에서 dangling reference를 컴파일 시점에 잡아준다.

```cpp
#include "absl/base/attributes.h"

class Person {
public:
    const std::string& name() const ABSL_ATTRIBUTE_LIFETIME_BOUND {
        return name_;
    }
private:
    std::string name_;
};

// 위험한 사용 — clang이 경고
const std::string& bad = Person().name();
// warning: returning reference to local temporary
```

`string_view`, `Span` 같이 비소유 타입을 반환하는 함수에 붙이는 것이 권장된다. `absl::string_view` 자체가 모든 const string 반환 함수에 이걸 붙이고 있다.

### TRIVIAL_ABI — pass-by-value 최적화

`ABSL_ATTRIBUTE_TRIVIAL_ABI`는 destructor가 non-trivial한 타입이라도 ABI 관점에서 trivial로 다루도록 한다.

```cpp
class ABSL_ATTRIBUTE_TRIVIAL_ABI MyHandle {
public:
    ~MyHandle() { Release(); }
    // ...
private:
    int fd_;
};

void Process(MyHandle h);
// MyHandle이 register로 전달될 수 있음 — 호출 비용 감소
```

표준 ABI에서는 non-trivial destructor가 있으면 무조건 메모리로 전달된다. `trivial_abi`는 이 제약을 우회한다. clang에서만 동작하고, ABI break를 동반하므로 신중히 써야 한다.

## ABSL_PREDICT_*, ABSL_FALLTHROUGH_INTENDED

비슷한 카테고리에 속하는 매크로들.

```cpp
// branch hint
if (ABSL_PREDICT_FALSE(error_occurred)) {
    HandleError();
}

// switch fall-through 의도 표시
switch (x) {
    case 1:
        DoOne();
        ABSL_FALLTHROUGH_INTENDED;
    case 2:
        DoTwo();
        break;
}
```

`ABSL_PREDICT_*`는 [Part 2-02](/blog/programming/code-review/abseil/part2-02-predict-branch-hint)에서 따로 다룬다.

## ABSL_DEPRECATED — 안전한 deprecation

`ABSL_DEPRECATED`는 컴파일러의 deprecation attribute를 감싼다.

```cpp
#if ABSL_HAVE_CPP_ATTRIBUTE(deprecated)
    #define ABSL_DEPRECATED(msg) [[deprecated(msg)]]
#elif defined(__GNUC__)
    #define ABSL_DEPRECATED(msg) __attribute__((deprecated(msg)))
#else
    #define ABSL_DEPRECATED(msg)
#endif

ABSL_DEPRECATED("Use NewAPI() instead") void OldAPI();
```

deprecation message는 사용자가 마이그레이션 경로를 알 수 있도록 구체적으로 쓴다. "deprecated" 한 단어만 쓰는 것은 안티패턴.

## 코드 리뷰 포인트

```cpp
// 회피 — 컴파일러별 attribute를 직접 사용
__attribute__((noinline)) void SlowPath();
// MSVC에서 컴파일 안 됨.

// Good — Abseil 매크로
ABSL_ATTRIBUTE_NOINLINE void SlowPath();
```

```cpp
// 회피 — __has_builtin을 직접 사용
#if __has_builtin(__builtin_expect)
// 정의되지 않은 컴파일러에서 syntax error.

// Good
#if ABSL_HAVE_BUILTIN(__builtin_expect)
```

```cpp
// 회피 — string_view 반환에 LIFETIME_BOUND 누락
absl::string_view GetName() const { return name_; }

// Good
absl::string_view GetName() const ABSL_ATTRIBUTE_LIFETIME_BOUND {
    return name_;
}
```

리뷰에서 봐야 할 것:

1. **컴파일러별 분기를 직접 쓰는가** — Abseil 매크로로 감싸야 함.
2. **비소유 타입을 반환하는데 LIFETIME_BOUND 없는가** — clang에서 미리 잡을 수 있는 버그.
3. **deprecation message가 마이그레이션 경로를 알려주는가**.

## 자주 보는 안티패턴

```cpp
// 회피 — ABSL_HAVE_*를 그냥 무시
std::optional<int> Find(int key);  // C++17 가정
// C++14 빌드에서 깨짐.

// Good
#ifdef ABSL_HAVE_STD_OPTIONAL
    std::optional<int> Find(int key);
#else
    absl::optional<int> Find(int key);
#endif
// 또는 처음부터 absl::optional만 쓰고 마이그레이션은 한 번에
```

```cpp
// 회피 — ALWAYS_INLINE을 무분별하게
ABSL_ATTRIBUTE_ALWAYS_INLINE void HelperA();
ABSL_ATTRIBUTE_ALWAYS_INLINE void HelperB();
ABSL_ATTRIBUTE_ALWAYS_INLINE void HelperC();
// 코드 크기 증가, instruction cache 압박.
// 측정 없이 ALWAYS_INLINE을 붙이는 것은 보통 손해.

// Good — hot path만 측정해서 선택적으로
```

## 정리

- `ABSL_HAVE_*`는 컴파일러·플랫폼 기능 존재 감지.
- `ABSL_ATTRIBUTE_*`는 컴파일러별 attribute 차이 흡수.
- `LIFETIME_BOUND`, `TRIVIAL_ABI` 같은 잘 안 알려진 매크로가 안전성·성능에 큰 도움.
- 컴파일러별 분기를 직접 쓰지 말고 Abseil 매크로로 감쌀 것.
- `ALWAYS_INLINE`은 측정 후에만.

## 다음 편

Part 2-02에서 `ABSL_PREDICT_TRUE` / `ABSL_PREDICT_FALSE`를 본다. branch hint가 성능에 실제로 얼마나 영향을 주는지, modern CPU에서 어디까지 의미가 있는지 살핀다.

## 관련 항목

- [Part 2-02: ABSL_PREDICT_TRUE/FALSE](/blog/programming/code-review/abseil/part2-02-predict-branch-hint)
- [Part 2-05: Conformance / policy](/blog/programming/code-review/abseil/part2-05-conformance-policy)
- [Part 2-08: thread_annotations](/blog/programming/code-review/abseil/part2-08-thread-annotations)
- [Effective Modern C++: Item 11 — deleted functions](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction)
- [원문 — absl/base/attributes.h](https://github.com/abseil/abseil-cpp/blob/master/absl/base/attributes.h)
- [원문 — absl/base/config.h](https://github.com/abseil/abseil-cpp/blob/master/absl/base/config.h)
