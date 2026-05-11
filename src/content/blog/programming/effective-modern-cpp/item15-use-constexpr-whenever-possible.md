---
title: "항목 15: 가능하다면 constexpr를 사용하라"
date: 2025-01-06T18:00:00
description: "컴파일 타임 평가 가능 — 상수 표현식 자리, 성능, 그리고 인터페이스 계약."
tags: [C++, constexpr, Modern C++, Compile Time]
series: "Effective Modern C++"
seriesOrder: 15
---

## 개요

`constexpr`는 **"컴파일 타임에 알 수 있는 값"**을 표현. 변수에 붙으면 진짜 상수, 함수에 붙으면 인자가 컴파일 타임 상수일 때 컴파일 타임에 평가됩니다. 배열 크기·템플릿 인자·`enum` 값 등 **상수 표현식이 필요한 자리**에서 사용 가능.

## 필수 개념: 상수 표현식과 컴파일 타임 평가

> **초보자를 위한 배경 지식**

<br>

### "상수 표현식이 필요한 자리"

C++엔 컴파일 타임에 값이 정해져야 하는 자리들:

```cpp
int arr[N];                    // N은 상수
template<int I> class Wrap;    // I는 상수
enum E { A = N };              // N은 상수
static_assert(N > 0, "...");
case N:                        // switch case
```

여기서 N은 **컴파일 타임 상수**여야 — 일반 변수는 안 됨.

### const vs constexpr

```cpp
int sz = 10;                  // 런타임 변수
const int cx = 10;            // const, 그러나 항상 컴파일 타임 상수는 아님
constexpr int cy = 10;        // 컴파일 타임 상수 — 보장됨

int arr1[sz];   // 에러
int arr2[cx];   // 컴파일러에 따라 다름 (cx 초기치가 상수 표현식이면 OK)
int arr3[cy];   // OK — 항상
```

**핵심 차이**:
- `const` = "수정 불가" (런타임 값으로도 초기화 가능)
- `constexpr` = "컴파일 타임에 알 수 있고 수정 불가"

```cpp
int n = std::rand();
const int  cx = n;      // OK — n의 런타임 값으로 초기화
constexpr int cy = n;   // 에러! n은 컴파일 타임 상수가 아님
```

## constexpr 변수

```cpp
constexpr int n = 100;            // OK
constexpr double pi = 3.14;
constexpr Point p{1.0, 2.0};       // OK if Point가 literal type

int arr[n];                        // OK — n은 상수 표현식
```

## constexpr 함수

가장 강력한 부분 — **이중 사용** 가능.

### 핵심 성질

같은 함수가:
- 인자가 **컴파일 타임 상수** → 컴파일 타임에 평가
- 인자가 **런타임 값** → 일반 함수 호출

```cpp
constexpr int pow(int base, int exp) noexcept {
    return (exp == 0) ? 1 : base * pow(base, exp - 1);
}

constexpr int n = pow(2, 10);   // 컴파일 타임 — 1024
int x = 3, y = 5;
int m = pow(x, y);              // 런타임 호출
```

→ 두 모드를 **한 함수로** — 매우 강력.

## C++11 vs C++14 — 함수 본문 제약

### C++11 — `return` 한 줄만

```cpp
constexpr int factorial(int n) {
    return n == 0 ? 1 : n * factorial(n - 1);   // 재귀 OK
}
```

`if`, `for`, 지역 변수 등 — 모두 X. 재귀로 우회.

### C++14 — 일반적 흐름 제어

```cpp
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}
```

훨씬 자연스럽게 작성 가능.

### C++17 — `if constexpr`

```cpp
template<typename T>
constexpr auto getValue(T x) {
    if constexpr (std::is_integral_v<T>) {
        return x * 2;
    } else {
        return x;
    }
}
```

컴파일 타임 분기.

### C++20 — 더 많은 자리

`constexpr` 가상 함수, dynamic_cast, try-catch (단 throw 없으면) 등 추가.

## constexpr 사용자 정의 타입

```cpp
class Point {
    double x, y;
public:
    constexpr Point(double xVal = 0, double yVal = 0) noexcept
        : x(xVal), y(yVal) {}

    constexpr double xValue() const noexcept { return x; }
    constexpr double yValue() const noexcept { return y; }
    
    constexpr void setX(double newX) noexcept { x = newX; }   // C++14+
    constexpr void setY(double newY) noexcept { y = newY; }
};

constexpr Point p1(1.0, 2.0);    // 컴파일 타임 객체
constexpr Point p2(3.0, 4.0);

constexpr Point midpoint(const Point& a, const Point& b) noexcept {
    return { (a.xValue() + b.xValue()) / 2,
             (a.yValue() + b.yValue()) / 2 };
}

constexpr Point mid = midpoint(p1, p2);   // 컴파일 타임 계산!
```

→ 컴파일 시간 늘어나지만 런타임 비용 0.

## constexpr의 함의 — 인터페이스 계약

`constexpr`는 함수의 **공개 인터페이스 일부** — 한번 약속하면 사용자가 컴파일 타임 평가에 의존하므로, 나중에 떼기 어려움.

```cpp
constexpr int f(int);   // 약속

// 사용자
int arr[f(10)];   // arr 크기로 의존

// 나중에 f가 constexpr 아니게 변경 → 사용자 코드 깨짐
```

→ noexcept처럼 **신중한 약속**.

## 활용 예 — 컴파일 타임 자료구조

### 컴파일 타임 lookup table

```cpp
constexpr std::array<int, 256> makeTable() {
    std::array<int, 256> t = {};
    for (int i = 0; i < 256; ++i) t[i] = i * i;
    return t;
}

constexpr auto squareTable = makeTable();   // 컴파일 타임 빌드
```

런타임 룩업이 메모리 접근만 — 매우 빠름.

### 컴파일 타임 hash

```cpp
constexpr std::uint32_t hash(const char* str) {
    std::uint32_t h = 0;
    while (*str) h = h * 31 + *str++;
    return h;
}

constexpr auto h = hash("hello");   // 컴파일 타임에 계산
```

## constexpr vs 매크로

```cpp
#define MAX_SIZE 100
constexpr int kMaxSize = 100;
```

`constexpr` 우위:
- 타입 안전 (`int`)
- 디버거 심볼
- 네임스페이스·클래스 안에 둘 수 있음
- Type-checked

→ `#define` 상수는 가능하면 `constexpr`로.

## 함정 — constexpr가 항상 컴파일 타임 평가는 아님

```cpp
constexpr int f(int n) { return n * 2; }

int x = 5;
int y = f(x);   // 런타임 호출 — x가 상수 표현식 아님
```

`constexpr` 함수는 "컴파일 타임 평가 **가능**"이지 "항상"은 아님.

C++20의 `consteval`이 "반드시 컴파일 타임만":

```cpp
consteval int f(int n) { return n * 2; }

constexpr int a = f(5);   // OK
int x = 5;
int y = f(x);             // 에러 — 컴파일 타임 상수 아님
```

## 핵심 정리

1. **`constexpr` 변수**: 컴파일 타임 상수 보장 (vs `const`는 보장 X)
2. **`constexpr` 함수**: 컴파일 타임/런타임 양용 — "두 함수를 한 정의로"
3. C++11 → C++14 → C++17 → C++20 — 본문 제약 점차 완화
4. **인터페이스 계약**이므로 신중히 약속
5. **`#define` 매크로 상수 → `constexpr`** 마이그레이션
6. C++20 `consteval`은 컴파일 타임 전용

## 관련 항목

- [항목 14: noexcept](/blog/programming/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions) — 둘 다 인터페이스 계약
