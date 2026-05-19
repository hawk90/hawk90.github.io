---
title: "항목 2: #define보다 const, enum, inline을 선호하라"
date: 2026-05-04T02:00:00
description: "전처리기 매크로의 네 가지 문제와 컴파일러가 다룰 수 있는 대안 — const, constexpr, enum, inline 템플릿."
tags: [C++, Effective C++, Preprocessor]
series: "Effective C++"
seriesOrder: 2
draft: true
---

## 왜 이 항목이 중요한가?

`#define`은 C 시절의 관성으로 코드베이스 곳곳에 남아 있다. 단순 상수 정의용, 함수형 매크로, 플랫폼 분기 등 다양한 용도로 쓰인다. 그런데 매크로는 **컴파일러가 소스를 보기 전에 사라진다**. 이 한 가지 사실이 네 가지 문제를 만든다.

- **디버깅** — 매크로 이름이 심볼 테이블에 없다. 에러 메시지에 숫자만 보인다.
- **타입 검사** — 매크로는 타입이 없다. 오버로드가 깨진다.
- **스코프** — 클래스나 네임스페이스에 가둘 수 없다. 전역으로 새어 나간다.
- **인자 평가 횟수** — 함수형 매크로는 인자를 여러 번 평가한다 (`++a`가 두 번 증가하는 식).

C++에서는 `const`, `constexpr`, `enum`, `inline` 함수 템플릿이 이 셋을 모두 대체한다. 이 항목은 각 함정과 대안을 정리하고, 매크로가 여전히 정당한 자리(헤더 가드, 플랫폼 분기, 소스 위치 매크로)까지 본다.

## 개요

`#define`은 컴파일러가 소스를 보기 **전에 전처리기가 처리**한다. 컴파일러 입장에선 매크로의 이름은 존재한 적이 없다. 디버그 심볼에 안 잡히고, 타입 체크가 없으며, 스코프도 없다. C 시절의 관성으로 남아 있는 이 도구를, C++ 영역에서는 `const`·`constexpr`·`enum`·`inline 함수 템플릿`으로 거의 모두 대체할 수 있다.

## 필수 개념: 전처리기는 컴파일러가 아니다

> **초보자를 위한 배경 지식**

<br>

C/C++ 빌드는 두 단계로 진행된다.

```
.cpp 파일 ──► [전처리기] ──► 토큰 스트림 ──► [컴파일러] ──► .o
                #define, #include 처리      여기부터 타입·스코프 등장
```

`#define ASPECT_RATIO 1.653`은 전처리기에서 **단순 텍스트 치환**으로 끝난다. 컴파일러가 보는 것은 `1.653`이라는 리터럴뿐이다. "`ASPECT_RATIO`"라는 이름은 디버거에도, 에러 메시지에도, 심볼 테이블에도 없다.

```
warning: narrowing conversion of '1.653e+0' to 'int'
                                    ^^^^^^^^
                                    ASPECT_RATIO가 아니라 그냥 숫자
```

### 디버깅 팁 — 전처리 결과 보기

매크로가 어떻게 펼쳐졌는지 확인하려면 컴파일러의 전처리 단계만 실행시킬 수 있다.

```bash
g++ -E foo.cpp           # 전처리 결과 출력
g++ -E -P foo.cpp        # 라인 마커 없이
clang++ -E foo.cpp | less

# MSVC
cl /E foo.cpp
```

매크로 함정이 의심되면 가장 먼저 이 출력부터 본다. 펼친 모양이 의도와 다른 경우가 흔하다.

## `#define`의 네 가지 문제

### 1) 디버깅 — 이름이 사라진다

```cpp
#define ASPECT_RATIO 1.653

double area = width * height * ASPECT_RATIO;
// 컴파일 에러가 나면 메시지에 1.653만 보임 — 어디서 왔는지 추적 불가
```

수십 개의 매크로 상수가 있는 코드베이스에서 "이 1.653은 어떤 상수인가"를 찾는 데 들이는 시간은 결코 작지 않다.

### 2) 타입 검사가 없다

```cpp
#define PI 3.14    // int? double? long double? 컴파일러는 모름

void f(int) { /* ... */ }
void f(double) { /* ... */ }

f(PI);   // 어느 오버로드? — 컨텍스트에 따라 달라짐
```

`const double pi = 3.14;`로 두면 명확히 `double`이다. 오버로드 해상도가 결정적이 된다.

### 3) 스코프가 없다

```cpp
class Widget {
    #define MAX_VALUE 100   // 클래스 멤버처럼 보이지만, 사실 전역!
};

#undef MAX_VALUE   // 명시적으로 풀어야 다른 곳에서 충돌 안 남
```

매크로는 정의된 시점부터 `#undef` 또는 파일 끝까지 살아남는다. 클래스/네임스페이스 안에 둘 수 없다.

이게 진짜 문제가 되는 사례 — Windows 헤더의 `min`/`max` 매크로다.

```cpp
#include <windows.h>   // min, max를 매크로로 정의
#include <algorithm>

auto x = std::max(a, b);   // 컴파일 에러!
                            // 매크로가 std::max를 (a, b)로 펼쳐 깨버림
```

해결책은 `#define NOMINMAX`를 windows.h 앞에 두거나, `(std::max)(a, b)`로 괄호를 추가하는 것이다. 매크로가 스코프를 무시하기에 일어나는 전형적 사고다.

### 4) 함수형 매크로는 평가 횟수가 위험

```cpp
#define CALL_WITH_MAX(a, b) f((a) > (b) ? (a) : (b))

int a = 5, b = 0;
CALL_WITH_MAX(++a, b);    // ((++a) > (b) ? (++a) : (b))로 펼쳐짐
                          // ⚠️ a가 두 번 증가!
CALL_WITH_MAX(++a, b+10); // ⚠️ a가 두 번 증가, b+10도 두 번 평가
```

설계자가 모든 호출자의 사용 패턴을 통제할 수는 없다.

부작용이 없는 인자라도 비용이 두 번 발생할 수 있다.

```cpp
CALL_WITH_MAX(expensive(), 10);   // expensive()가 두 번 호출!
```

## 대안 1 — 단순 상수에는 `const` / `constexpr`

### 헤더 파일의 상수

```cpp
// utils.h
constexpr double AspectRatio = 1.653;   // C++11+ — 컴파일 타임 상수
const     double Pi          = 3.14;    // 어느 버전이든 OK
```

`constexpr`은 "**컴파일 타임에 알려진 값**"임을 명시한다. 배열 크기·템플릿 인자 등 상수식이 필요한 자리에 사용 가능하다.

### 문자열 상수 — 포인터 자체도 const

```cpp
// ❌ 흔한 실수 — 포인터는 변경 가능
const char* authorName = "Scott Meyers";

// ✅ 포인터까지 const
const char* const authorName = "Scott Meyers";

// ✅ 더 나음 — std::string 또는 string_view
const std::string author     = "Scott Meyers";
constexpr std::string_view a = "Scott Meyers";   // C++17, 메모리 추가 X
```

`std::string_view`는 정적 데이터를 그대로 참조하므로 추가 메모리가 없고, 런타임 초기화 비용도 없다. C++17 이후 헤더의 문자열 상수에 가장 적합한 도구다.

### ODR — One Definition Rule 함정

```cpp
// utils.h
const int Limit = 100;   // OK — 헤더에 둬도 안전 (internal linkage)
```

C++17 이전엔 헤더의 `const`는 자동으로 **내부 연결(internal linkage)** 이 되므로 여러 번 include되어도 충돌이 없다. **단**, C++17 이전에 `inline`이 없는 `constexpr` 변수를 헤더에 두면 ODR 위반이 가능하다. C++17부터 `inline constexpr`이 정답이다.

```cpp
// C++17+ — 헤더에 두기 위한 정석
inline constexpr double Pi = 3.14159265358979;
```

내부 연결의 부작용도 알아 둘 가치가 있다. 각 translation unit이 자기 사본을 가지므로 같은 상수라도 주소가 다르다.

```cpp
// header.h
const int Limit = 100;

// a.cpp, b.cpp 양쪽 include
// &Limit가 a와 b에서 다른 주소를 가리킬 수 있음
```

주소 비교가 의미를 가지는 자리라면 `inline constexpr` 또는 `extern`을 명시한다.

## 대안 2 — 클래스 안의 상수

### in-class 초기화 (정수 타입만)

```cpp
class GamePlayer {
private:
    static const int NumTurns = 5;   // 선언 + 인-클래스 초기화 (정수만)
    int scores[NumTurns];            // 사용 OK — 컴파일 타임 값
};

// 정의 — C++17 이전엔 ODR-used일 경우 .cpp에 필요
const int GamePlayer::NumTurns;
```

**제약**: in-class 초기화는 **정수형 + `const`** 또는 `constexpr` 한정이다. `double`·`std::string` 같은 비-정수 상수는 .cpp에 정의한다.

```cpp
class Cfg {
    static const double Threshold;    // 선언만
};
// Cfg.cpp
const double Cfg::Threshold = 0.05;   // 정의
```

### C++17 — `inline static`

C++17부터 모든 타입의 in-class 정의가 가능하다. ODR 걱정이 없다.

```cpp
class Cfg {
    inline static const double Threshold = 0.05;    // OK from C++17
    inline static constexpr double Pi    = 3.14159; // OK from C++17
};
```

## 대안 3 — "the enum hack"

```cpp
class GamePlayer {
private:
    enum { NumTurns = 5 };    // enum 값은 컴파일 타임 정수 상수
    int scores[NumTurns];
};
```

`enum` 멤버는 **rvalue**(주소가 없음)다. `&NumTurns`처럼 주소를 얻을 수 없다. 이게 단점이자 장점이다.

| 측면 | `static const int` | `enum` hack |
| --- | --- | --- |
| 주소 얻기 | OK (정의 필요할 수도) | 불가능 |
| 컴파일 타임 사용 | OK | OK |
| TMP에서 사용 | OK | OK (전통적) |
| 호환성 | 옛 컴파일러 일부 약함 | 어느 컴파일러든 동작 |

지금은 `static constexpr int`가 가장 깔끔하다. 다만 **TMP 코드와 일부 헤더-온리 라이브러리**에서는 여전히 enum hack을 만나게 된다. Boost.MPL, 옛 Loki 라이브러리 등의 코드를 읽으려면 알아둬야 한다.

## 대안 4 — 함수형 매크로 → `inline` 함수 템플릿

```cpp
// ❌ 매크로
#define CALL_WITH_MAX(a, b) f((a) > (b) ? (a) : (b))

// ✅ 인라인 함수 템플릿
template<typename T>
inline void callWithMax(const T& a, const T& b) {
    f(a > b ? a : b);
}

int a = 5, b = 0;
callWithMax(++a, b);   // a는 정확히 한 번 증가
```

이점은 이렇다.

- **타입 안전** — `int`와 `string`을 섞어 호출하면 컴파일 에러다.
- **스코프** — 네임스페이스·클래스에 둘 수 있다.
- **인라인** — 컴파일러가 적절히 인라인한다. 디버그 빌드에선 진짜 함수다.
- **인자 평가 횟수 고정** — 한 번씩 평가된다.

### 매크로가 여전히 필요한 곳

- **헤더 가드** — `#ifndef X_H / #define X_H / #endif`.
- **조건부 컴파일** — `#ifdef _WIN32`.
- **소스 위치** — `__FILE__`, `__LINE__`, `__func__`.
- **토큰 붙이기** — `#`, `##`.

순수한 "상수"나 "함수 매크로"가 아닌, **컴파일 단계 자체를 조작**하는 용도다. 이 외에는 거의 없다.

C++20 모듈이 도입되면서 `#include`와 함께 헤더 가드도 사라질 전망이다. 모듈은 전처리 없이 직접 import되므로 매크로의 마지막 보루도 줄어든다.

```cpp
// C++20 모듈
export module math;     // 헤더 가드 불필요
export constexpr double Pi = 3.14159;
```

## 모던 변형

### `consteval` — C++20

"반드시 컴파일 타임에만" 평가되도록 강제한다.

```cpp
consteval int square(int n) { return n * n; }

constexpr auto x = square(5);   // OK
int n = 5;
auto y = square(n);             // ❌ 컴파일 에러 — 런타임 인자
```

기존 `constexpr` 함수는 컴파일/런타임 모두 가능했지만, `consteval`은 컴파일 타임 한정이다.

### `if constexpr` — C++17

매크로의 `#ifdef`스러운 분기를 함수 안에서 표현할 수 있다.

```cpp
template<typename T>
void process(T x) {
    if constexpr (std::is_integral_v<T>) {
        // 정수 전용 코드 — T가 정수일 때만 컴파일
    } else {
        // 다른 케이스
    }
}
```

이전엔 SFINAE 트릭으로 풀던 분기를 깔끔하게 표현할 수 있다.

### `constinit` — C++20

전역/static 변수가 **컴파일 타임 초기화**됨을 보장한다. static initialization order fiasco를 회피한다.

```cpp
constinit int counter = 0;   // 반드시 컴파일 타임 초기화
// counter는 일반 변수처럼 변경 가능, 다만 초기 값만 컴파일 타임 보장
```

`constexpr`이 "값도 상수"라면 `constinit`은 "초기화만 컴파일 타임"이다. 매크로로 풀던 일부 초기화 패턴을 대체한다.

## 실무 가이드

| 상황 | 권장 |
| --- | --- |
| 헤더의 단순 상수 | `inline constexpr T = ...` (C++17+) |
| 클래스 멤버 상수 | `static constexpr T = ...` (정수면 인-클래스 OK) |
| 컴파일 타임 정수 (TMP) | `enum` hack 또는 `static constexpr int` |
| 함수형 매크로 | `inline` 함수 템플릿 |
| 헤더 가드, 플랫폼 분기 | `#define` 유지 (대안 없음) |
| 전역 변수 초기화 순서 | `constinit` (C++20) |

## 핵심 정리

1. **단순 상수**: `#define` 대신 `const` 객체 / `constexpr` / `enum`.
2. **함수형 매크로**: `#define` 대신 `inline` 함수 템플릿.
3. C++17부터 `inline constexpr`로 헤더의 상수 정의가 깨끗해졌다.
4. 매크로는 디버그·타입·스코프·평가 횟수 모두 잃는다. 사용 영역을 최소화한다.
5. **유일하게 매크로가 필요한 곳**: 헤더 가드, 조건부 컴파일, 소스 위치 매크로.
6. 매크로 함정이 의심되면 `g++ -E`로 전처리 결과를 확인한다.

## 관련 항목

- [항목 1: C++를 언어들의 연합체로 보라](/blog/programming/cpp/effective-cpp/item01-view-cpp-as-a-federation-of-languages) — C 영역에서 OOP 영역으로 옮겨갈 때 매크로를 버리는 한 단계
- [항목 3: const를 가능한 곳마다](/blog/programming/cpp/effective-cpp/item03-use-const-whenever-possible) — `const`가 컴파일러에 약속을 박는 방식
- [항목 30: inline의 이해](/blog/programming/cpp/effective-cpp/item30-understand-the-ins-and-outs-of-inlining) — `inline` 함수의 비용과 한계
