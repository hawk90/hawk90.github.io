---
title: "Ch 7: Other Features II — const / Numbers / Macros"
date: 2025-05-13T07:00:00
description: "Preincrement / const / constexpr / Integer / 64-bit / Preprocessor Macros / nullptr / sizeof."
tags: [Google, C++, Style-Guide, const, constexpr, Macro, nullptr]
series: "Google C++ Style"
seriesOrder: 7
draft: false
---

> 작은 결정들이 모여 — 일관된 스타일을 만든다. 이 장은 — *상수 / 수치 / preprocessor*에 대한 규칙.

## Preincrement and Predecrement

### 규칙

> *Iterator*는 — `++i` 선호 (또는 의미 있을 때 `i++`).

```cpp
// 좋음:
for (auto it = v.begin(); it != v.end(); ++it) { ... }

// 회피 (성능 차이 미미하지만 — 관습):
for (auto it = v.begin(); it != v.end(); it++) { ... }
```

### 정수형

```cpp
// 정수 — 거의 차이 없음:
for (int i = 0; i < n; ++i) { ... }   // 권장
for (int i = 0; i < n; i++) { ... }   // 동등
```

이유 — iterator의 `i++`는 *복사본 생성*. `++i`는 — 그렇지 않음.

### `i++`를 *명시적*으로 써야 할 때

```cpp
int x = arr[i++];   // i를 사용 후 증가 — 의미가 i++ 필요
```

## Use of const

### 규칙

> 가능하면 — `const`.

```cpp
// 함수 매개변수:
void Process(const std::string& input);   // 안 바꿈을 명시

// 메서드:
class Foo {
public:
    int GetValue() const;   // 객체 상태 안 바꿈
};

// 변수:
const int kMaxRetries = 3;
```

### 위치 — 왼쪽

```cpp
// 좋음 (Google 가이드):
const int x = 10;
const std::string& s = ref;
const Foo* p = nullptr;

// 또는 (스타일 일관):
int const x = 10;   // East const — 다른 스타일이지만 Google은 West const
```

Google은 — `const T` (West const) 선호.

### Pointer의 const

```cpp
const Foo* p;   // p가 가리키는 — 변경 불가
Foo* const p;   // p 자체가 — 변경 불가
const Foo* const p;   // 둘 다
```

## constexpr / constinit / consteval

### `constexpr`

> 가능하면 — `constexpr`.

```cpp
constexpr int Square(int x) { return x * x; }
constexpr int kArea = Square(10);   // 컴파일 시 계산
```

컴파일 시 평가 — 런타임 비용 없음.

### `constinit` (C++20)

```cpp
constinit static std::string kGreeting = "Hello";
```

*정적 초기화* 보장. Static Initialization Fiasco 회피.

### `consteval` (C++20)

```cpp
consteval int Compute(int x) { return x * 2; }
constexpr int v = Compute(10);   // 반드시 컴파일 시 평가
```

`consteval` — 컴파일 시 평가 *강제*.

## Integer Types

### 규칙

> 폭이 *중요한 곳*에는 — 명시적 타입 (`int32_t`, `int64_t`).

```cpp
// 인덱싱 / 카운터 — int 또는 size_t:
for (int i = 0; i < n; ++i) { ... }
size_t len = data.size();

// 직렬화 / 프로토콜:
int32_t version;     // 명시적 폭
int64_t timestamp;
uint64_t hash;
```

### `unsigned` — 신중히

```cpp
// 회피 — unsigned로 인덱싱:
for (unsigned int i = 0; i < n; ++i) { ... }

// 좋음:
for (int i = 0; i < n; ++i) { ... }
```

`unsigned`의 underflow / signed/unsigned 비교 — 버그 원천.

**예외** — bitmask, 모듈러 산술 등에는 — `unsigned`가 의미.

### `long` / `long long` — 회피

```cpp
long x;        // 플랫폼마다 폭 다름 (32 vs 64)
long long x;   // 명확하지만 — 길음
```

대신 — `int64_t`.

## 64-bit Portability

### 규칙

> 직렬화 / 정렬 / 포맷 — 명시적.

### 포맷 지정자

```cpp
// 회피:
printf("%d", int64_t_value);    // 잘못된 포맷

// 좋음:
printf("%lld", static_cast<long long>(x));
printf("%" PRId64, x);
absl::StrFormat("%d", x);   // 자동 추론
```

### 정렬 / 패딩

```cpp
struct Bad {
    int32_t a;
    int64_t b;   // 정렬 8바이트 — 32+pad+64 = 16 (32-bit) or 16 (64-bit)
};

// 직렬화 시 — sizeof 가정 금지
```

### 64-bit 정수 리터럴

```cpp
// 회피:
int64_t x = 1000000000000;   // int overflow!

// 좋음:
int64_t x = 1000000000000LL;
int64_t x = INT64_C(1000000000000);
```

## Preprocessor Macros

### 규칙

> **회피.** inline / constexpr / template로 대체.

```cpp
// 회피 — 매크로:
#define MAX(a, b) ((a) > (b) ? (a) : (b))

// 좋음 — 함수:
template <typename T>
T Max(T a, T b) { return a > b ? a : b; }
```

### 매크로의 문제

```
- 타입 안전성 없음
- 디버깅 어려움 (이름이 — 사라짐)
- 스코프 없음 (전역)
- 부작용 — `MAX(i++, j++)` → 증가 두 번
```

### 매크로 — 허용되는 경우

```cpp
// OK — 조건부 컴파일:
#ifdef DEBUG
#endif

// OK — 표준 패턴:
#define ARRAYSIZE(a) (sizeof(a) / sizeof((a)[0]))
#define UNUSED(x) (void)(x)
```

### 매크로 이름 — UPPER_SNAKE_CASE

```cpp
#define MY_MAX_VALUE 100
```

매크로임을 — 명확히.

## 0 and `nullptr` / `NULL`

### 규칙

```
포인터: nullptr
정수:   0
문자:   '\0'
실수:   0.0 또는 0.0f
```

```cpp
// 좋음:
int* p = nullptr;
int n = 0;
char c = '\0';
double d = 0.0;

// 회피:
int* p = NULL;   // C의 NULL — 정수 0
int* p = 0;      // 정수 0 — 포인터 변환
```

### 이유

`nullptr` — 타입 명확. 오버로딩 / 템플릿에서 — 잘 동작.

```cpp
void Func(int);
void Func(int*);

Func(NULL);     // 어느 것? — 모호
Func(nullptr);  // Func(int*) — 명확
```

## sizeof

### 규칙

> *변수에 대해* — `sizeof(var)`. *타입*은 명시.

```cpp
// 좋음:
Foo foo;
size_t s = sizeof(foo);   // 변수 — 타입 변경 시 자동 추적

// 회피:
size_t s = sizeof(Foo);   // 타입 — Foo 변경 시 일치 안 보장
```

### 매크로처럼 쓰기

```cpp
struct Data { /* ... */ } data;
memset(&data, 0, sizeof(data));   // 좋음 — 변수
memset(&data, 0, sizeof(Data));   // 회피 — 타입 (변수 타입 변경 시 깨질 위험)
```

## 정리

- **`++i`** — iterator에서 선호
- **`const`** — 가능하면, 왼쪽 (West const)
- **`constexpr`** — 컴파일 시 계산
- **정수 폭** — 명시 (`int32_t` / `int64_t`)
- **`unsigned`** — 신중히 (모듈러 / bitmask에만)
- **매크로** — 회피, inline / template / constexpr 우선
- **`nullptr`** — 포인터, **0** — 정수
- **`sizeof(var)`** — 변수 기준

## 다음 장 예고

다음 — **Type Deduction / Templates / Lambdas**.

## 관련 항목

- [Ch 6: Memory / Exceptions](/blog/embedded/standards/google-cpp/chapter06-features-memory-exceptions)
- [Ch 8: Type Deduction / Templates](/blog/embedded/standards/google-cpp/chapter08-deduction-templates-lambdas)
