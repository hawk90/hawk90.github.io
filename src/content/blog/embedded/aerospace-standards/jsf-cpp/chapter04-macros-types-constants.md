---
title: "Ch 4: Macros, Types, Constants"
date: 2025-09-30T05:00:00
description: "JSF C++ — Preprocessor 제한, type 정의, integer/enum, 상수 명명, typedef vs using."
tags: [jsf-cpp, macros, preprocessor, types, constants, enums, typedef]
series: "JSF C++"
seriesOrder: 4
draft: false
---

JSF C++의 *macros / types / constants* 정책. *preprocessor minimal*, *integer type strict*, *constants well-defined*. *정확한 AV Rule 번호·wording은 원문 PDF 참조*.

## Macros — Preprocessor 제한

JSF는 *매크로 사용을 강하게 제한*. *type-safe inline function* 권장.

### 함수형 매크로 회피

```cpp
// 회피 — 매크로
#define MAX(a, b) ((a) > (b) ? (a) : (b))
int x = MAX(i++, j);   // i 두 번 평가 — undefined

// Good — inline function
inline int Max(int a, int b) {
    return (a > b) ? a : b;
}
int x = Max(i++, j);   // i 한 번
```

C++의 *inline*이 *매크로 대체*. *Type-safe + debugger 친화*.

### Control flow 숨김 회피

```cpp
// 회피 — 매크로 안에 return / break
#define RETURN_IF_ERROR(x) do { if ((x) != 0) return (x); } while (0)

// 명시 코드가 안전
int rc = DoWork();
if (rc != 0) return rc;
```

매크로가 *control flow를 숨김*. 읽기 어려움.

### 매크로 이름과 함수 충돌 금지

```cpp
#define max(a, b) ...
int max(int a, int b) { ... }   // 충돌
```

`#undef` 광범위 사용도 *의미 추적 어려움*.

### 허용되는 매크로

```cpp
// 1. include guard
#ifndef PROJECT_FOO_H
#define PROJECT_FOO_H
// ...
#endif

// 2. 조건부 컴파일 (platform abstraction)
#if defined(__GNUC__)
#  define COMPILER_GCC
#elif defined(_MSC_VER)
#  define COMPILER_MSVC
#endif

// 3. 단순 상수 (const variable로 대체 권장)
#define MAX_BUFFER_SIZE 256
// → 더 나은: const int MAX_BUFFER_SIZE = 256;

// 4. 디버그 wrapper
#ifdef DEBUG
#  define LOG(msg) cerr << msg << endl
#else
#  define LOG(msg) ((void)0)
#endif
```

### 매크로 회피의 일반 이유

```
1. Type 안전성 없음
   - 컴파일러가 type check 못함

2. Debugger에서 안 보임
   - 매크로 expansion 후 코드만 표시

3. Side effect 위험
   - MAX(i++, j) — i 두 번 평가

4. Namespace 무시
   - 모든 매크로가 글로벌

5. Scope 무시
   - 정의 후 모든 file에 영향
```

C++의 *inline + const*가 *매크로의 대안 대부분*.

## Integer Types

JSF는 *integer type strict*. *signed/unsigned 명확*, *width 명시*.

### 표준 타입 사용 (`<cstdint>`)

```cpp
// 회피 — basic type (width 불명)
int counter;
unsigned x;

// Good — 폭 명시
#include <cstdint>

int32_t counter;
uint16_t x;
```

`<cstdint>`가 *플랫폼별 차이 회피*.

### Signed vs Unsigned 비교

```cpp
// 회피 — 혼용
unsigned int u = 100;
int s = -1;
if (s < u) { /* ... */ }   // s가 큰 unsigned로 변환

// Good — 명시
if (s < 0 || static_cast<unsigned int>(s) < u) { /* ... */ }
```

CERT INT35와 같은 정신.

### Implicit Narrowing 회피

```cpp
// 회피
int32_t big = 100000;
int8_t small = big;   // silent truncation

// Good
if (big < INT8_MIN || big > INT8_MAX) {
    return ERROR_RANGE;
}
int8_t small = static_cast<int8_t>(big);
```

### Boolean 표현식

```cpp
// 회피
int count = GetCount();
if (count) { /* ... */ }

// Good
bool result = (count > 0);
if (count != 0) { /* ... */ }
```

### Floating-point Comparison

```cpp
// 회피
if (f == 0.0F) { /* ... */ }

// Good
if (std::fabs(f) < 1e-6F) { /* ... */ }
```

### Pointer NULL Check

```cpp
// 회피
if (p) { /* ... */ }

// Good
if (p != NULL) { /* ... */ }
```

## typedef vs using

C++03에는 *`typedef`*만. C++11의 *`using`*은 *JSF 원본 외*.

```cpp
// C++03
typedef int32_t MyCounter;
typedef std::vector<int> IntList;

// Template typedef 불가 (C++03)
// 대안 — struct trick
template <typename T>
struct VectorOf {
    typedef std::vector<T> type;
};
typename VectorOf<int>::type intVec;
```

C++11의 `using`이 깔끔:

```cpp
// C++11
using MyCounter = int32_t;
using IntList = std::vector<int>;

template <typename T>
using Vector = std::vector<T>;
Vector<int> intVec;
```

JSF 원본 (C++03) → typedef. 후속 표준에서 *using 권장*.

## Enum — C++03 vs C++11

C++03 enum은 *unscoped + implicit int*.

```cpp
// C++03 enum
enum EColor {
    COLOR_RED,
    COLOR_GREEN,
    COLOR_BLUE
};

EColor c = COLOR_RED;
int x = COLOR_RED;       // implicit int 변환 (위험)
```

문제:
- *Global namespace pollution* (`COLOR_RED`)
- *Implicit int 변환* (type safety 약함)
- *서로 다른 enum이 같은 값* 가능

C++11의 *enum class*가 해결:

```cpp
// C++11
enum class Color {
    RED,
    GREEN,
    BLUE
};

Color c = Color::RED;
int x = Color::RED;                    // 컴파일 에러
int x = static_cast<int>(Color::RED);  // 명시
```

JSF 원본은 *C++03*이라 unscoped enum + `E` prefix.

### Underlying Type — C++03 trick

```cpp
// C++03 — enum size 강제
enum EColor {
    COLOR_RED = 0,
    COLOR_GREEN = 1,
    COLOR_BLUE = 2,
    COLOR_MAX = 0x7FFFFFFF   // int32 강제
};

// C++11 — clean
enum class Color : int32_t {
    RED = 0,
    GREEN = 1,
    BLUE = 2
};
```

`MAX = 0x7FFFFFFF` trick이 *enum size를 int32로 강제*. C++03 legacy 패턴.

## Constants

### const vs #define

```cpp
// 회피
#define MAX_BUFFER 256

// 권장
const int MAX_BUFFER = 256;
```

이유: *type 안전, debugger 보임, scope 가능, macro pollution 회피*.

### Magic Number 회피

```cpp
// 회피
char buf[256];
if (count > 256) { /* ... */ }

// Good
const int BUFFER_SIZE = 256;
char buf[BUFFER_SIZE];
if (count > BUFFER_SIZE) { /* ... */ }
```

이름 있는 상수로 *의도 표현 + 변경 한 곳*.

### Literal Suffix 명시

```cpp
// 명시
long x = 100L;
unsigned u = 100U;
float f = 1.0F;
double d = 1.0;

// 회피
long x = 100;        // int → long (silent)
float f = 1.0;       // double → float (silent narrowing)
```

명시 suffix가 *implicit 변환 회피*.

### String Literal

```cpp
// Good
const char *name = "value";

// 회피 (일부 컴파일러 warning)
char *name = "value";

// 수정 금지
const char *s = "hello";
s[0] = 'H';                       // 컴파일 에러
const_cast<char *>(s)[0] = 'H';   // UB
```

C++17의 *`std::string_view`*가 더 안전한 대안. C++03 원본은 *C-string 위주*.

## JSF Style — 상수 정의 예

```cpp
// flight_constants.h
#ifndef FLIGHT_CONSTANTS_H
#define FLIGHT_CONSTANTS_H

#include <cstdint>

// Numerical limits
const int32_t MAX_ALTITUDE_FT = 50000;
const int32_t MIN_ALTITUDE_FT = 0;
const int32_t MAX_AIRSPEED_KIAS = 600;
const int32_t MIN_AIRSPEED_KIAS = 60;

// Control gains
const float PITCH_KP = 2.5F;
const float PITCH_KI = 0.8F;
const float PITCH_KD = 0.15F;

// Timing
const int32_t FCS_CYCLE_PERIOD_MS = 20;
const int32_t FAULT_DETECTOR_PERIOD_MS = 100;
const int32_t TELEMETRY_PERIOD_MS = 1000;

// Buffer sizes
const int32_t MAX_PACKET_SIZE = 512;
const int32_t MAX_QUEUE_DEPTH = 32;

// Enums
enum EFlightMode {
    MODE_MANUAL = 0,
    MODE_HEADING_HOLD = 1,
    MODE_ALTITUDE_HOLD = 2,
    MODE_NAV = 3,
    MODE_AUTOLAND = 4,
    MODE_MAX = 0x7FFFFFFF
};

enum EFaultSeverity {
    SEVERITY_NONE = 0,
    SEVERITY_INFO = 1,
    SEVERITY_WARNING = 2,
    SEVERITY_ERROR = 3,
    SEVERITY_CRITICAL = 4,
    SEVERITY_MAX = 0x7FFFFFFF
};

#endif
```

특징:
- 모든 상수가 const variable
- Width-specified type (`int32_t`, `float`)
- Suffix 명시 (`F` for float)
- Magic number 회피
- Enum `E` prefix + `MAX` trick

## Type System — Strong vs Weak

JSF의 *type safety 강조*. Implicit 변환 최소.

```cpp
// 회피 — implicit
int32_t altitude = 10000;
int16_t small = altitude;   // silent truncation

float fraction = 5.5F;
int32_t whole = fraction;   // silent truncation

// Good — 명시 + 검사
if (altitude > INT16_MAX) return ERROR_RANGE;
int16_t small = static_cast<int16_t>(altitude);

int32_t whole = static_cast<int32_t>(fraction);
```

C-style cast `(int16_t)altitude`는 *피하고*, *static_cast* 권장.

## C++03 → 후속 표준의 진화

```
JSF C++03 (2005 원본):
  - basic int / long
  - typedef
  - unscoped enum (E prefix)
  - C-string

후속 표준 (AUTOSAR C++14, MISRA C++:2023):
  - int32_t, uint16_t (<cstdint>)
  - using alias
  - enum class
  - std::string, std::string_view
  - constexpr
  - auto (제한적)
```

각 표준의 *허용 범위*는 *해당 문서 참조*.

## Tool 자동 검사

```bash
# Helix QAC — JSF rule profile
qac.exe -prj jsf.prj

# clang-tidy — modern style check
clang-tidy --checks='cppcoreguidelines-*,readability-*' src.cpp
```

관련 check 예:
- `cppcoreguidelines-init-variables`
- `cppcoreguidelines-pro-type-cstyle-cast`
- `readability-magic-numbers`

## 일반적인 finding (macros / types / constants)

```
실전에서 자주 발견되는 위반:

1. 함수형 매크로 사용
2. signed/unsigned 혼용 비교
3. Implicit narrowing (int → short, int → char)
4. Magic number (256, 1000, ...)
5. #define으로 상수 (const variable 권장)
6. C-style cast
7. Floating-point == 비교
8. if (count) — boolean 명시 누락
```

## 정리

- **Macros**: 함수형 매크로 회피 → inline. 조건부 컴파일 + include guard만.
- **Types**: width-specified (`int32_t`, `uint16_t`). signed/unsigned 명시.
- **Enums**: C++03은 `E` prefix + `MAX = 0x7FFFFFFF` trick. C++11+ enum class.
- **Constants**: const variable >> `#define`. Magic number 금지.
- **String literal**: `const char *`. 수정 금지.
- **Numeric literal**: suffix 명시 (`L`, `U`, `F`).
- **Type conversion**: implicit 회피. `static_cast` 명시.
- 정확한 AV Rule 번호·wording은 *원문 PDF*.

## 다음 장 예고

5장은 *Declarations, Initialization, Casts*.

## 관련 항목

- [Ch 3 — Lexical, Naming](/blog/embedded/aerospace-standards/jsf-cpp/chapter03-lexical-naming)
- [Ch 5 — Declarations, Casts](/blog/embedded/aerospace-standards/jsf-cpp/chapter05-declarations-casts)
- [MISRA C++ Ch 5 — Essential Type Model](/blog/embedded/automotive/misra-c/chapter05-expressions-types)
- [AUTOSAR C++14 Ch 3 — Expressions, Conversions](/blog/embedded/automotive/autosar-cpp/chapter03-expressions-conversions)
