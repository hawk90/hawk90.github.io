---
title: "항목 22: 컴파일 타임에 계산할 수 있는 값은 constexpr를 사용하라"
date: 2026-05-05T22:00:00
description: "constexpr — 런타임 비용 0, 상수 표현식, 타입 안전성. const vs constexpr vs consteval vs constinit."
tags: [C++, constexpr, consteval]
series: "Beautiful C++"
seriesOrder: 22
draft: true
---

## 왜 이 항목이 중요한가?

C 시대의 매크로:

```cpp
#define MAX_USERS 100
#define PI 3.14159
```

문제 — 타입 없음, 스코프 없음, 디버깅 어려움. 컴파일러는 매크로를 텍스트 치환으로만 본다 — 의미는 사용 지점에서야 결정.

C++ `const`도 부족하다:

```cpp
const int max_users = 100;
int arr[max_users];     // OK — 보통 컴파일 타임 평가
```

`const`는 "변수 변경 못 함"일 뿐 — **컴파일 타임 계산을 보장하지 않는다**. `const int n = getRuntimeValue();`도 합법.

C++11 **`constexpr`** 이 명확한 답 — "이 값/함수는 **컴파일 타임에 평가 가능**". 런타임 비용 0, 상수 표현식이 필요한 곳에 사용 가능, 타입 안전. C++20+ `consteval`, `constinit`이 더 세분화. 이 항목은 그 도구들의 차이와 사용처.

## 핵심 내용

- `constexpr`로 표시한 값/함수는 **가능하면 컴파일 타임에 평가**
- 런타임 비용 0, 상수 표현식이 필요한 곳(배열 크기, 템플릿 인자, `switch` 라벨)에 그대로 사용 가능
- `const`는 "수정 못 함"일 뿐, **컴파일 타임 계산을 보장하지 않는다**
- C++20: `consteval`(반드시 컴파일 타임), `constinit`(정적 초기화 보장)
- 마법 숫자를 `#define` 대신 `constexpr` 변수로 바꾸면 **타입·스코프·디버깅** 모두 좋아짐

## 비교 — `#define` / `const` / `constexpr`

### Bad: #define

```cpp
#define MAX_USERS 100
#define COMPUTE(x) ((x) * 2 + 1)

int arr[MAX_USERS];
int y = COMPUTE(3);     // 7
```

문제:
- 타입 없음 — `MAX_USERS` 는 `int`? `size_t`?
- 스코프 없음 — 전역 노출
- 디버거에 안 보임 — 컴파일 후 사라짐
- 매크로 함정 — 항목 2 (Effective C++) 참고

### Marginal: const

```cpp
const int max_users = 100;
int arr[max_users];     // OK (대부분 컴파일러)
```

- 타입 있음 — `int`
- 스코프 있음
- 그러나 — **항상 컴파일 타임 평가 보장 X**

```cpp
const int n = getRuntimeValue();    // const지만 런타임 값
int arr[n];                          // ❌ VLA — 표준 C++ 아님
```

### Good: constexpr

```cpp
constexpr int MaxUsers = 100;
int arr[MaxUsers];     // ✅ 보장된 컴파일 타임 상수

constexpr int compute(int x) { return x * 2 + 1; }
constexpr int y = compute(3);    // 7 — 컴파일 타임
```

- 타입 명확
- 스코프 한정
- **컴파일 타임 보장** — 보장 안 되면 컴파일 에러

## constexpr 함수

```cpp
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

constexpr int x = factorial(5);     // 120 — 컴파일 타임
int n = read_input();
int y = factorial(n);                // 런타임 호출도 OK (constexpr 함수는 양쪽 다)
```

`constexpr` 함수의 의미:
- **상수 인자**로 호출 시 — 컴파일 타임 평가
- **런타임 값**으로 호출 시 — 보통 함수처럼 런타임 실행

C++14부터 — 함수 본문에 if, for, while 등 다 사용 가능:

```cpp
constexpr int sum(int n) {
    int total = 0;
    for (int i = 1; i <= n; ++i) total += i;
    return total;
}

constexpr int s = sum(100);     // 컴파일 타임 5050
```

C++20부터 — 동적 메모리 할당, 가상 함수 등 더 많은 것이 constexpr 가능.

## C++20 consteval — 강제 컴파일 타임

```cpp
consteval int square(int n) {
    return n * n;
}

constexpr int a = square(5);     // OK — 컴파일 타임
int n = read_input();
int b = square(n);                // ❌ 컴파일 에러 — consteval은 런타임 불가
```

`consteval`은 — **반드시 컴파일 타임에만** 평가. 매크로 대체에 안전.

```cpp
// 옛 매크로
#define LOG_LINE() std::source_location::current().line()

// 모던 consteval (C++20)
consteval int current_line() {
    return std::source_location::current().line();
}
```

## C++20 constinit — 정적 초기화 보장

```cpp
constinit int globalCounter = 0;     // 정적 초기화 보장
```

`constinit` ≠ `const` + `constexpr`. 의미:
- **컴파일 타임에 초기화 보장** — static initialization order fiasco 회피
- 그러나 **런타임에 변경 가능** (const 아님)

```cpp
constinit int counter = 0;

void increment() { ++counter; }     // 변경 OK — const 아님
```

C++ 정적 변수 초기화 순서 문제(다른 TU 간)를 컴파일 타임에 잡음.

## 한눈에 비교

| 키워드 | 컴파일 타임 평가 | 런타임 평가 | 변경 가능 | 도입 |
| --- | --- | --- | --- | --- |
| `const` | 보통 | 가능 | 불가 | 어디서나 |
| `constexpr` | 가능 (조건부) | 가능 | 불가 | C++11 |
| `consteval` (함수만) | 강제 | 불가 | — | C++20 |
| `constinit` (변수만) | 강제 | — | **가능** | C++20 |

## 상수 표현식이 필요한 곳

`constexpr` 값이 필요한 자리:

```cpp
constexpr int N = 100;

int arr[N];                          // 배열 크기
std::array<int, N> a;                // 템플릿 비-타입 인자
template<int Size> class Buf {};
Buf<N> b;

switch (x) {
    case N: break;                    // case 라벨
}

if constexpr (sizeof(T) > N) { /* ... */ }    // if constexpr 조건

static_assert(N > 0, "N must be positive");   // static_assert
```

이런 자리에 `const` 변수는 — 컴파일러에 따라 안 통할 수 있음. `constexpr`이 표준.

## 실전 — 컴파일 타임 lookup table

```cpp
constexpr std::array<int, 10> compute_table() {
    std::array<int, 10> t{};
    for (int i = 0; i < 10; ++i) {
        t[i] = i * i;
    }
    return t;
}

constexpr auto table = compute_table();
// table[3] == 9, 컴파일 타임에 계산 끝

int main() {
    return table[5];     // 25 — 런타임 비용 0, 메모리 .rodata에
}
```

C++14+ constexpr `std::array` — 컴파일 타임 lookup table. 런타임 비용 완전 0.

## 함정 — constexpr 함수의 제약 (C++11)

C++11 constexpr 함수는 — **return문 하나, 조건 ?: 만**. C++14에서 일반 함수 본문 허용.

```cpp
// C++11 — 매우 제한적
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);     // ?:만 가능
}

// C++14+ — 일반 함수 본문
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}
```

## 함정 — constexpr 안에서 throw

```cpp
constexpr int safe_divide(int a, int b) {
    if (b == 0) throw std::invalid_argument("div by 0");     // ⚠️
    return a / b;
}

constexpr int x = safe_divide(10, 2);     // OK
constexpr int y = safe_divide(10, 0);     // ❌ 컴파일 에러 — throw가 constexpr에서 실행
```

흥미롭게도 — `constexpr` 함수가 컴파일 타임에 throw를 실행하면 **컴파일 에러**. 런타임에서만 실행 가능한 분기는 컴파일 타임 평가에서 제외.

이건 의도된 동작 — 컴파일 타임에 invalid input을 catch.

## 모던 constexpr 능력 (C++20)

```cpp
constexpr auto process(const std::vector<int>& v) {
    std::vector<int> result;     // 동적 할당 OK (C++20)
    for (auto x : v) {
        if (x > 0) result.push_back(x);
    }
    return result;
}
```

C++20부터 — constexpr 함수에서 동적 메모리, virtual 함수, try/catch 모두 가능.

## 모던 변형 — `std::string` constexpr (C++20)

```cpp
constexpr std::string build_message() {
    return "Hello, " + std::string("World!");
}

constexpr auto msg = build_message();     // C++20
```

`std::string`이 constexpr — 단, **컴파일 타임에 메모리를 점유하지 않아야** (메모리는 컴파일 타임에 할당 후 해제 필요). 직접적으로 `constexpr std::string` 변수는 어려움.

## inline constexpr 변수 — 헤더에서

```cpp
// header.h
inline constexpr double Pi = 3.14159265358979;

inline constexpr int MaxRetries = 3;
```

C++17 `inline` 변수 — 헤더에 정의해도 ODR 안전. 여러 TU에서 같은 정의로 처리.

## 마법 숫자 제거 — 진정한 가치

```cpp
// Bad: 매직 숫자
if (size > 1024 * 1024) error_too_big();
for (int i = 0; i < 86400; ++i) tick();

// Good: 이름 + constexpr
constexpr size_t MaxFileSize = 1024 * 1024;     // 1 MB
constexpr int SecondsPerDay = 86400;

if (size > MaxFileSize) error_too_big();
for (int i = 0; i < SecondsPerDay; ++i) tick();
```

이름이 도메인 의미 + 컴파일 타임 보장. 매크로보다 안전.

## 표준 라이브러리 — constexpr 진화

C++11/14/17/20 마다 표준 라이브러리 함수에 `constexpr` 추가:

```cpp
constexpr std::min(a, b);              // C++14
constexpr std::array;                  // C++14
constexpr std::pair;                   // C++14
constexpr std::vector (in constexpr fn); // C++20
constexpr std::string (in constexpr fn); // C++20
constexpr <algorithm> 대부분;            // C++20
```

표준이 더 많은 함수를 constexpr로 — 컴파일 타임 계산의 영역이 매년 확장.

## 실무 가이드 — 결정

```
컴파일 타임 상수가 필요한가?
├── 단순 값 → constexpr 변수
├── 함수 결과 → constexpr 함수
├── 반드시 컴파일 타임 → consteval (C++20)
├── 헤더의 상수 → inline constexpr (C++17)
├── 정적 초기화 순서 보장 → constinit (C++20)
└── 일반 const도 가능하면 → 그냥 const도 OK
```

## 실무 가이드 — 체크리스트

- [ ] `#define` 대신 `constexpr`?
- [ ] 컴파일 타임 보장 필요하면 `const` 대신 `constexpr`?
- [ ] 함수가 컴파일 타임 평가 가능하면 `constexpr`?
- [ ] 헤더의 상수는 `inline constexpr`?
- [ ] C++20 `consteval`로 강제 컴파일 타임?
- [ ] 정적 초기화 순서가 문제면 `constinit`?
- [ ] 매직 숫자를 이름 있는 `constexpr` 상수로?

## 정리

런타임에 안 변하는 값과 계산은 **`constexpr`** 로 옮겨라. 성능·타입 안전성·표현력이 동시에 좋아진다.

도구 사다리:
1. **`constexpr` 변수** — 컴파일 타임 상수 (C++11)
2. **`constexpr` 함수** — 컴파일 타임 / 런타임 양쪽 가능 (C++11+)
3. **`inline constexpr`** — 헤더의 상수 (C++17)
4. **`consteval`** — 강제 컴파일 타임 함수 (C++20)
5. **`constinit`** — 정적 초기화 보장 (C++20)

`#define`은 — 헤더 가드, 조건부 컴파일에만.

## 관련 항목

- [항목 12: TMP 최소화](/blog/programming/cpp/beautiful-cpp/item12-use-template-metaprogramming-sparingly) — constexpr가 TMP 대체
- [항목 23: 템플릿 추상화](/blog/programming/cpp/beautiful-cpp/item23-use-templates-for-abstraction) — 컴파일 타임 일반화
- [Effective C++ 항목 2: #define보다 const](/blog/programming/cpp/effective-cpp/item02-prefer-consts-enums-and-inlines-to-defines) — 매크로 대체
