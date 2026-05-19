---
title: "항목 15: 가능하다면 constexpr를 사용하라"
date: 2026-05-04T15:00:00
description: "컴파일 타임 평가 가능 — 상수 표현식 자리, 성능, 그리고 인터페이스 계약."
tags: [C++, constexpr, Modern C++, Compile Time]
series: "Effective Modern C++"
seriesOrder: 15
draft: true
---

## 왜 이 항목이 중요한가?

C++에는 컴파일 타임에 값이 정해져야 하는 자리가 많다. 배열 크기, 템플릿 인자, `static_assert`, `case` 라벨. 일반 변수로는 안 되고 **상수 표현식**이 필요하다.

`constexpr`는 이 자리를 위한 도구이면서, **같은 함수를 컴파일 타임과 런타임 양쪽에서 사용**할 수 있게 해 준다. 컴파일 타임에 룩업 테이블을 만들고, 런타임에 같은 함수로 동적 값도 계산하는 식이다.

이 항목은 다음을 정리한다.

- `const`와 `constexpr`의 결정적 차이.
- `constexpr` 함수의 "이중 사용" 성질.
- C++11/14/17/20의 본문 제약 변화.
- `constexpr`가 인터페이스 계약인 이유와 마이그레이션 시 주의.

## 개요

`constexpr`는 **"컴파일 타임에 알 수 있는 값"**을 표현한다. 변수에 붙으면 진짜 상수, 함수에 붙으면 인자가 컴파일 타임 상수일 때 컴파일 타임에 평가된다. 배열 크기·템플릿 인자·`enum` 값 등 **상수 표현식이 필요한 자리**에서 사용할 수 있다.

## 필수 개념: 상수 표현식과 컴파일 타임 평가

> **초보자를 위한 배경 지식**

<br>

### "상수 표현식이 필요한 자리"

C++엔 컴파일 타임에 값이 정해져야 하는 자리들이 있다.

```cpp
int arr[N];                    // N은 상수
template<int I> class Wrap;    // I는 상수
enum E { A = N };              // N은 상수
static_assert(N > 0, "...");
case N:                        // switch case
```

여기서 N은 **컴파일 타임 상수**여야 한다. 일반 변수는 안 된다.

### const vs constexpr

```cpp
int sz = 10;                  // 런타임 변수
const int cx = 10;            // const, 그러나 항상 컴파일 타임 상수는 아님
constexpr int cy = 10;        // 컴파일 타임 상수 — 보장됨

int arr1[sz];   // 에러
int arr2[cx];   // 컴파일러에 따라 다름 (cx 초기치가 상수 표현식이면 OK)
int arr3[cy];   // OK — 항상
```

**핵심 차이**

- `const` = "수정 불가" (런타임 값으로도 초기화 가능).
- `constexpr` = "컴파일 타임에 알 수 있고 수정 불가".

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

가장 강력한 부분은 **이중 사용**이다.

### 핵심 성질

같은 함수가 다음과 같이 동작한다.

- 인자가 **컴파일 타임 상수**면 → 컴파일 타임에 평가된다.
- 인자가 **런타임 값**이면 → 일반 함수 호출이다.

```cpp
constexpr int pow(int base, int exp) noexcept {
    return (exp == 0) ? 1 : base * pow(base, exp - 1);
}

constexpr int n = pow(2, 10);   // 컴파일 타임 — 1024
int x = 3, y = 5;
int m = pow(x, y);              // 런타임 호출
```

두 모드를 **한 함수로** 처리한다. 매우 강력하다.

## C++11 vs C++14 — 함수 본문 제약

### C++11 — `return` 한 줄만

```cpp
constexpr int factorial(int n) {
    return n == 0 ? 1 : n * factorial(n - 1);   // 재귀 OK
}
```

`if`, `for`, 지역 변수 등은 모두 X다. 재귀로 우회한다.

### C++14 — 일반적 흐름 제어

```cpp
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}
```

훨씬 자연스럽게 작성할 수 있다.

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

컴파일 타임 분기다.

### C++20 — 더 많은 자리

`constexpr` 가상 함수, dynamic_cast, try-catch (단 throw 없으면) 등이 추가됐다.

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

컴파일 시간은 늘어나지만 런타임 비용은 0이다.

## constexpr의 함의 — 인터페이스 계약

`constexpr`는 함수의 **공개 인터페이스 일부**다. 한번 약속하면 사용자가 컴파일 타임 평가에 의존하므로, 나중에 떼기 어렵다.

```cpp
constexpr int f(int);   // 약속

// 사용자
int arr[f(10)];   // arr 크기로 의존

// 나중에 f가 constexpr 아니게 변경 → 사용자 코드 깨짐
```

noexcept처럼 **신중한 약속**이다.

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

런타임 룩업이 메모리 접근만으로 끝난다. 매우 빠르다.

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

`constexpr`의 우위는 이렇다.

- 타입 안전 (`int`).
- 디버거 심볼.
- 네임스페이스·클래스 안에 둘 수 있다.
- Type-checked.

`#define` 상수는 가능하면 `constexpr`로 바꾼다.

## 함정 — constexpr가 항상 컴파일 타임 평가는 아님

```cpp
constexpr int f(int n) { return n * 2; }

int x = 5;
int y = f(x);   // 런타임 호출 — x가 상수 표현식 아님
```

`constexpr` 함수는 "컴파일 타임 평가 **가능**"이지 "항상"은 아니다.

### 정말 컴파일 타임이었나? — `static_assert`로 못 박기

말로만 "컴파일 타임"이라고 하지 말고, `static_assert`로 *증명*하면 의도가 분명해진다.

```cpp
constexpr int Max(int a, int b) { return a > b ? a : b; }

constexpr auto v = Max(10, 20);        // ① 결과를 constexpr 변수로 받고
static_assert(v == 20, "not constexpr"); // ② static_assert로 검증

// ②가 통과하면 ①은 정말로 컴파일 타임에 평가된 것.
// ①을 그냥 `auto`로 받았다면 컴파일러가 런타임으로 도망갈 여지가 있다 —
// constexpr 변수 자리는 "런타임 값 못 받음"을 강제하는 자물쇠.
```

`static_assert`가 통과한 시점에서 `Max(10, 20)`은 컴파일 타임에 *반드시* 풀린 값이다. 디버깅 노이즈 없이 한 줄로 검증할 수 있다.

### 실전 사례 — 컴파일 타임에 파일명만 뽑기

C++17 `std::string_view`와 결합하면 의외로 멋진 게 가능하다. 매크로 `__FILE_NAME__`(또는 `__FILE__`)에서 *컴파일 타임에* 경로를 잘라 파일명만 추출하는 패턴이다.

```cpp
#include <string_view>

constexpr std::string_view basename(std::string_view path) {
    const auto slash = path.find_last_of("\\/");
    return slash == std::string_view::npos ? path : path.substr(slash + 1);
}

constexpr auto kFile = basename(__FILE__);
static_assert(!kFile.empty(), "");          // 컴파일 타임에 잘랐음
```

`__FILE__`은 리터럴이라 `string_view`도 리터럴 슬라이스가 된다. 전 과정이 컴파일 타임이다. 런타임에는 잘라낸 결과만 데이터 섹션에 박혀 있어 `printf("[%s] ...", kFile.data())` 한 줄로 로그에 파일명만 깔끔히 찍을 수 있다.

C++20의 `consteval`은 "반드시 컴파일 타임만" 평가되는 더 엄격한 형태다.

```cpp
consteval int f(int n) { return n * 2; }

constexpr int a = f(5);   // OK
int x = 5;
int y = f(x);             // 에러 — 컴파일 타임 상수 아님
```

## 핵심 정리

1. **`constexpr` 변수**: 컴파일 타임 상수가 보장된다 (vs `const`는 보장 X).
2. **`constexpr` 함수**: 컴파일 타임/런타임 양용이다. "두 함수를 한 정의로" 쓸 수 있다.
3. C++11 → C++14 → C++17 → C++20으로 갈수록 본문 제약이 점차 완화된다.
4. **인터페이스 계약**이므로 신중히 약속한다.
5. **`#define` 매크로 상수 → `constexpr`** 마이그레이션이 권장된다.
6. C++20 `consteval`은 컴파일 타임 전용이다.

## 관련 항목

- [항목 14: noexcept](/blog/programming/cpp/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions) — 둘 다 인터페이스 계약이다
- [항목 16: const 멤버 함수는 thread-safe하게](/blog/programming/cpp/effective-modern-cpp/item16-make-const-member-functions-thread-safe) — const와 스레드 안전성
