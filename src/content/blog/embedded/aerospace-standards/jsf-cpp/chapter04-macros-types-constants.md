---
title: "Ch 4: Macros, Types, Constants (Rule 67-153)"
date: 2025-09-30T05:00:00
description: "JSF C++ Rule 67-153 — Preprocessor 제한, type 정의, integer/enum, 상수 명명. typedef vs using."
tags: [jsf-cpp, macros, preprocessor, types, constants, enums, typedef]
series: "JSF C++"
seriesOrder: 4
draft: false
---

JSF C++의 *큰 영역* — Macros (67-99), Types (100-130), Constants (131-153). *preprocessor minimal*, *integer type strict*, *constants well-defined*. 이 장은 *각 영역의 핵심 rules + F-35 적용*까지.

## Macros — Preprocessor 제한

JSF는 *매크로 사용 strongly 제한*. *type-safe inline function* 권장.

### AV Rule 26 — 함수형 매크로 회피

```
AV Rule 26 (Should)
"Function-like macros shall not be used. Use inline functions instead."
```

```cpp
// 위반 — 매크로
#define MAX(a, b) ((a) > (b) ? (a) : (b))
int x = MAX(i++, j);  // i 두 번 증가 — undefined behavior

// Good — inline function
inline int Max(int a, int b) {
    return (a > b) ? a : b;
}
int x = Max(i++, j);  // i 한 번만
```

C++03의 *inline*이 *매크로 대체*. *Type-safe + debugger 친화*.

### AV Rule 27 — Side Effect Macro 회피

```
AV Rule 27 (Will)
"An assertion will be used to verify any assumption that is made about
 the validity of expressions, parameters, and return values."
```

(Assertion 관련, 다음 장에서)

### AV Rule 28-30 — 매크로 제한

```cpp
// AV Rule 28 (Should)
// 매크로 안에 control flow (return, break, continue) 회피
#define RETURN_IF_ERROR(x) do { if ((x) != 0) return (x); } while (0)
// → 안전하지만 control flow 숨김. 회피.

// AV Rule 29 (Will)
// 매크로 이름과 함수 이름 충돌 금지
#define max(a, b) ...
int max(int a, int b) { ... }  // 충돌

// AV Rule 30 (Will)
// Macro #undef 회피
#define DEBUG 1
// ...
#undef DEBUG  // 위반 — 의미 추적 어려움
```

### 허용되는 매크로

```cpp
// 1. include guard (Rule 6)
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

// 4. 디버그/로깅 wrapper
#ifdef DEBUG
#  define LOG(msg) cerr << msg << endl
#else
#  define LOG(msg) ((void)0)
#endif
```

### JSF가 매크로 회피 이유

```
1. Type 안전성 없음
   #define MAX(a,b) ...  → int, float, string 모두 적용
   → 컴파일러가 type check 못함

2. Debugger에서 안 보임
   매크로 expansion 후 코드만 보임
   원본 매크로 호출 추적 어려움

3. Side effect 위험
   MAX(i++, j) — i 두 번 평가

4. Namespace 무시
   글로벌 매크로
   namespace 안 방법 없음

5. Scope 무시
   #define 후 전체 file에 영향
```

C++03의 *inline + const*가 *매크로의 대안 90%*.

## Type — Integer Types (Rule 100-130)

JSF는 *integer type strict*. *signed/unsigned 명확*, *width 명시*.

### AV Rule 100 — 표준 타입 사용

```cpp
// 위반 — basic type
int counter;        // signed int (which width?)
unsigned x;         // unsigned int

// Good — 폭 명시
int32_t counter;
uint16_t x;
```

`<cstdint>` (C99 `<stdint.h>`의 C++ 버전) 사용. *플랫폼별 차이 회피*.

### AV Rule 102 — Signed vs Unsigned

```cpp
// 위반 — 혼용
unsigned int u = 100;
int s = -1;
if (s < u) { /* ... */ }  // C 변환 함정: s가 큰 unsigned로 변환

// Good — 명시
if (s < 0 || static_cast<unsigned int>(s) < u) { /* ... */ }
```

CERT INT35와 동일. *언어 간 표준*.

### AV Rule 103-110 — Type Conversion

```cpp
// 위반 — implicit narrowing
int32_t big = 100000;
int8_t small = big;  // 위반 — silent truncation

// Good — 명시 + 검사
if (big < INT8_MIN || big > INT8_MAX) {
    return ERROR_RANGE;
}
int8_t small = static_cast<int8_t>(big);
```

### AV Rule 111-130 — Numeric

```cpp
// AV Rule 111 (Will)
// Boolean expression 사용 시 bool 타입
bool result = (x > 0);  // bool 명시
if (result) { /* ... */ }

// AV Rule 112 (Should)
// Floating-point comparison 회피 (== 대신)
if (f == 0.0f) { ... }  // 위반
if (std::fabs(f) < 1e-6f) { ... }  // Good

// AV Rule 113 (Will)
// integer 0과 boolean 혼용 금지
if (count) { ... }       // 위반 — count는 int
if (count != 0) { ... }  // Good

// AV Rule 114 (Will)
// Pointer NULL check 명시
if (p) { ... }           // 위반 (Hungarian 또한 p와 헷갈림)
if (p != NULL) { ... }   // Good
```

## Type Definitions — typedef vs using

C++03에서는 *`typedef`*만. C++11의 *`using`*은 *JSF 원본 외*.

```cpp
// JSF C++03 표준
typedef int32_t MyCounter;
typedef std::vector<int> IntList;

// Template typedef 불가 (C++03)
template <typename T>
typedef std::vector<T> Vector;  // 컴파일 에러

// 대안: struct trick
template <typename T>
struct VectorOf {
    typedef std::vector<T> type;
};
typename VectorOf<int>::type intVec;
```

C++11의 *`using`*이 이를 해결:

```cpp
// C++11
using MyCounter = int32_t;
using IntList = std::vector<int>;

template <typename T>
using Vector = std::vector<T>;
Vector<int> intVec;
```

JSF 원본은 *C++03 한정* → typedef. 후기 update (Block 4)에서 *using 일부 채택*.

## Enum — JSF의 C++03 Style

C++03 enum은 *unscoped + implicit int*.

```cpp
// JSF C++03 enum
enum EColor {
    COLOR_RED,
    COLOR_GREEN,
    COLOR_BLUE
};

EColor c = COLOR_RED;
int x = COLOR_RED;       // implicit int 변환 (위험)
COLOR_RED == 0;          // true (implicit int)
```

문제:
- *Global namespace pollution* (`COLOR_RED`)
- *Implicit int 변환* (type safety 부족)
- *Same value enum 가능* (`enum E1 { A=1 }; enum E2 { B=1 };`)

C++11의 *enum class*가 해결:

```cpp
// C++11 enum class
enum class Color {
    RED,
    GREEN,
    BLUE
};

Color c = Color::RED;
int x = Color::RED;          // 컴파일 에러 (implicit 변환 안 됨)
int x = static_cast<int>(Color::RED);  // 명시
```

JSF 원본은 *C++03* → unscoped enum. *E prefix*로 *type 표시*.

### JSF Enum 패턴 — Underlying Type

```cpp
// JSF: underlying type 명시 (C++03 hack)
enum EColor {
    COLOR_RED = 0,
    COLOR_GREEN = 1,
    COLOR_BLUE = 2,
    COLOR_MAX = 0x7FFFFFFF  // int32 size 강제
};

// C++11 — clean
enum class Color : int32_t {
    RED = 0,
    GREEN = 1,
    BLUE = 2
};
```

`COLOR_MAX = 0x7FFFFFFF` trick이 *enum size를 int32로 강제*. 항공계 *legacy pattern*.

## Constants — Rule 131-153

JSF는 *constant 정의*에 엄격.

### AV Rule 131 — const vs #define

```
AV Rule 131 (Should)
"Use const variables instead of #define for constants."
```

```cpp
// 회피
#define MAX_BUFFER 256

// 권장
const int MAX_BUFFER = 256;
```

이유:
- *Type 안전*
- *Debugger 보임*
- *Scope 가능*
- *Macro pollution 회피*

### AV Rule 132 — Magic Number 회피

```cpp
// 위반
char buf[256];
if (count > 256) { /* ... */ }

// Good
const int BUFFER_SIZE = 256;
char buf[BUFFER_SIZE];
if (count > BUFFER_SIZE) { /* ... */ }
```

*256*이 *어디 두 번 사용*. 변경 시 *한 곳만*.

### AV Rule 133-140 — Literal Suffix

```cpp
// AV Rule 134 (Will)
// Literal suffix 명시 (long: L, unsigned: U, float: F)
long x = 100L;         // L 명시
unsigned u = 100U;     // U 명시
float f = 1.0F;        // F 명시
double d = 1.0;        // 기본 double

// 위반
long x = 100;          // int → long (silent)
float f = 1.0;         // double → float (silent narrowing)
```

명시적 suffix가 *implicit 변환 회피*.

### AV Rule 141-150 — String Literal

```cpp
// AV Rule 141 (Will)
// String literal은 const char*로
const char *name = "F-35";      // Good

char *name = "F-35";             // 위반 — 일부 컴파일러 warning

// AV Rule 142 (Will)
// String 수정 금지
const char *s = "hello";
s[0] = 'H';                      // 컴파일 에러
const_cast<char*>(s)[0] = 'H';   // 위반 — UB
```

C++14의 *`std::string`*과 *string_view* (C++17)이 더 안전. JSF 원본은 *C-string 위주*.

## 실전 — F-35 Style 상수 정의

```cpp
// flight_constants.h

#ifndef FLIGHT_CONSTANTS_H
#define FLIGHT_CONSTANTS_H

#include <cstdint>

// === Numerical limits ===
const int32_t MAX_ALTITUDE_FT = 50000;
const int32_t MIN_ALTITUDE_FT = 0;
const int32_t MAX_AIRSPEED_KIAS = 600;
const int32_t MIN_AIRSPEED_KIAS = 60;

// === Control gains ===
const float PITCH_KP = 2.5F;
const float PITCH_KI = 0.8F;
const float PITCH_KD = 0.15F;

const float ROLL_KP = 1.8F;
const float ROLL_KI = 0.5F;
const float ROLL_KD = 0.1F;

const float YAW_KP = 1.0F;
const float YAW_KI = 0.3F;
const float YAW_KD = 0.05F;

// === Timing ===
const int32_t FCS_CYCLE_PERIOD_MS = 20;       // 50 Hz
const int32_t FAULT_DETECTOR_PERIOD_MS = 100; // 10 Hz
const int32_t TELEMETRY_PERIOD_MS = 1000;     // 1 Hz

// === Buffer sizes ===
const int32_t MAX_PACKET_SIZE = 512;
const int32_t MAX_QUEUE_DEPTH = 32;

// === Enum definitions ===
enum EFlightMode {
    MODE_MANUAL = 0,
    MODE_HEADING_HOLD = 1,
    MODE_ALTITUDE_HOLD = 2,
    MODE_NAV = 3,
    MODE_AUTOLAND = 4,
    MODE_MAX = 0x7FFFFFFF  // size force
};

enum EFaultSeverity {
    SEVERITY_NONE = 0,
    SEVERITY_INFO = 1,
    SEVERITY_WARNING = 2,
    SEVERITY_ERROR = 3,
    SEVERITY_CRITICAL = 4,
    SEVERITY_MAX = 0x7FFFFFFF
};

#endif // FLIGHT_CONSTANTS_H
```

특징:
- *모든 상수 const variable*
- *Width-specified type* (int32_t, float)
- *Suffix 명시* (F for float)
- *Magic number 회피*
- *Enum E prefix + MAX trick*

## Type System — strong vs weak

JSF가 *type safety 강조*. *implicit 변환 최소*.

```cpp
// 위반 — implicit 변환
int32_t altitude = 10000;
int16_t small = altitude;  // 위반 — silent truncation

float fraction = 5.5F;
int32_t whole = fraction;   // 위반 — silent truncation

// Good — 명시 변환
if (altitude > INT16_MAX) return ERROR_RANGE;
int16_t small = static_cast<int16_t>(altitude);

int32_t whole = static_cast<int32_t>(fraction);  // 절단 명시
```

C-style cast (`(int16_t)altitude`)는 *피해야*. *static_cast* 권장.

## C++03 vs C++14 Type System — JSF 진화

```
JSF C++03 (2005):
  - basic type (int, long, ...)
  - typedef
  - unscoped enum (E prefix)
  - C-string

JSF C++14 (theoretical update):
  - int32_t, uint16_t (<cstdint>)
  - using alias
  - enum class
  - std::string, std::string_view
  - constexpr
  - auto (제한적)
```

F-35 Block 4가 *C++14 부분 채택* 시 *modern type system 일부 도입*.

## Tool 자동 검사

```bash
# Helix QAC — JSF rule 자동 검출
qac.exe -prj jsf.prj    # AV Rule 100-153 자동

# clang-tidy — 일부 JSF 규칙
clang-tidy --checks='cppcoreguidelines-*,readability-*' src.cpp
```

특히:
- `cppcoreguidelines-init-variables` (no implicit narrowing)
- `cppcoreguidelines-pro-type-cstyle-cast` (no C-style cast)
- `readability-magic-numbers` (no magic numbers)

## 정리

- **Macros**: 함수형 매크로 회피 → inline. 조건부 컴파일 + include guard만.
- **Types**: width-specified (int32_t, uint16_t). signed/unsigned 명시.
- **Enums**: E prefix (C++03), `MAX = 0x7FFFFFFF` trick.
- **Constants**: const variable >> #define. magic number 금지.
- **String literal**: const char*. 수정 금지.
- **Numeric literal**: suffix 명시 (L, U, F).
- **Type conversion**: implicit 회피. static_cast 명시.
- *Type safety*가 *aerospace SW의 핵심*.

## 다음 장 예고

5장은 *Declarations, Initialization, Casts* (Rule 138-168) — 선언·초기화 + cast 정책.

## 관련 항목

- [Ch 3 — Lexical, Naming](/blog/embedded/aerospace-standards/jsf-cpp/chapter03-lexical-naming)
- [Ch 5 — Declarations, Casts](/blog/embedded/aerospace-standards/jsf-cpp/chapter05-declarations-casts)
- [MISRA C++ Ch 5 — Essential Type Model](/blog/embedded/car-standards/misra-c/chapter05-expressions-types)
- [AUTOSAR C++14 Ch 3 — Expressions, Conversions](/blog/embedded/car-standards/autosar-cpp/chapter03-expressions-conversions)
