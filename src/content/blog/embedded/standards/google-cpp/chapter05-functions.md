---
title: "Ch 5: Functions"
date: 2025-05-13T05:00:00
description: "Inputs and Outputs / Short Functions / Overloading / Default Arguments / Trailing Return Type."
tags: [Google, C++, Style-Guide, Function]
series: "Google C++ Style"
seriesOrder: 5
draft: false
---

> 함수 = 추상화의 단위. 짧고 명확하게.

## Inputs and Outputs

### 규칙

> *출력 매개변수* 회피. 반환값 / `struct` / `std::tuple` 선호.

### Output Parameter 회피

```cpp
// 회피:
void GetUser(int id, User* out_user);
// 호출:
User u;
GetUser(42, &u);

// 좋음:
User GetUser(int id);
// 호출:
User u = GetUser(42);
```

### 여러 값 반환

```cpp
// 회피 — output parameter:
void GetMinMax(const std::vector<int>& data, int* out_min, int* out_max);

// 좋음 — struct 반환:
struct MinMax { int min; int max; };
MinMax GetMinMax(const std::vector<int>& data);

// 또는 — std::pair / std::tuple (덜 권장):
std::pair<int, int> GetMinMax(...);
auto [min, max] = GetMinMax(data);   // C++17 구조분해
```

### Input 매개변수

```cpp
// 좋음:
void Process(const Foo& input);          // 읽기만 — const reference
void Modify(Foo* in_out);                // 읽기 + 쓰기 — pointer
void Process(absl::Span<const int> v);   // view (안 소유)
```

규칙:
- 읽기만 → `const T&`
- 읽기+쓰기 → `T*` (NULL 가능성 명시)
- View → `absl::Span<const T>` 또는 `std::string_view`

### 매개변수 순서

```cpp
// 좋음:
void Func(int input1, int input2, int* output);   // input 먼저, output 나중

// 회피:
void Func(int* output, int input1, int input2);
```

## Write Short Functions

### 규칙

> 짧게. *40줄 이하* 권장.

```
긴 함수의 문제:
- 이해 어려움
- 테스트 어려움
- 재사용 어려움
- 버그 숨기기 좋음
```

### 함수 분해

```cpp
// 회피 — 100줄:
void ProcessOrder(...) {
    // validate (20줄)
    // calculate (30줄)
    // save (20줄)
    // notify (30줄)
}

// 좋음:
void ProcessOrder(...) {
    if (!ValidateOrder(...)) return;
    int total = CalculateTotal(...);
    SaveOrder(...);
    NotifyCustomer(...);
}
```

각 단계 — 자기 함수. 이름이 — *문서*.

### 예외

- *Lookup 테이블* — 어쩔 수 없이 김
- *간단한 switch* — 케이스 많지만 단순

이런 경우는 — 길어도 OK.

## Function Overloading

### 규칙

> 사용자가 — *어느 함수인지 헷갈리지 않게*.

```cpp
// 좋음 — 동일 의미, 다른 타입:
void Append(int value);
void Append(double value);
void Append(const std::string& value);

// 회피 — 의미가 다름:
void Process();
void Process(int x);   // 별 함수처럼 동작?
```

오버로딩 — 같은 동작의 *타입 변형*에만.

### Ambiguity 회피

```cpp
void Func(int x);
void Func(long x);

// 호출:
Func(42);   // int? long? — 명확하지 않은 경우 회피
```

### Pointer Type 오버로딩

```cpp
void Func(const char* s);
void Func(int n);

Func(0);   // 둘 다 호출 가능 — 모호
```

## Default Arguments

### 규칙

> Non-virtual 함수에서만. 신중히.

```cpp
// OK:
void Greet(const std::string& name, const std::string& greeting = "Hello");

// 호출:
Greet("Alice");                 // "Hello, Alice"
Greet("Alice", "안녕");          // "안녕, Alice"
```

### Virtual 함수 — 금지

```cpp
class Base {
public:
    virtual void Func(int x = 10);
};
class Derived : public Base {
public:
    void Func(int x = 20) override;   // 위험!
};

Base* p = new Derived;
p->Func();   // Base의 기본값 (10) — 정적 타입 기반
             // Derived의 Func 호출 — 동적 디스패치
             // 혼란!
```

이유 — default argument는 *정적*으로 결정, virtual은 *동적*으로 디스패치.

### Function Pointer 변수 — 회피

```cpp
void (*fp)(int) = &Func;   // 기본 인자 — 사라짐!
```

함수 포인터에 — default argument 정보 없음.

## Trailing Return Type Syntax

### 규칙

> 보통 회피. *템플릿 / decltype* 등 필요한 경우만.

```cpp
// 보통:
int Add(int a, int b);

// trailing return — 필요한 경우:
template <typename T>
auto Add(T a, T b) -> decltype(a + b) {   // 반환 타입이 매개변수에 의존
    return a + b;
}
```

### 그 외 — 회피

```cpp
// 회피:
auto Foo(int x) -> int { return x * 2; }

// 좋음:
int Foo(int x) { return x * 2; }
```

이유 — 일관성. 새 스타일 도입의 *비용*.

### Lambda는 — Auto OK

```cpp
auto f = [](int x) { return x * 2; };
auto f = [](int x) -> int { return x * 2; };   // 명시 OK
```

## 정리

- **Output parameter** 회피 — 반환값 / struct 선호
- **40줄 이하** 권장 — 짧게
- **Overloading** — 같은 동작, 다른 타입
- **Default argument** — non-virtual에서만
- **Trailing return** — 템플릿 등 필요한 경우만

## 다음 장 예고

다음 — **Other Features I**. 메모리 / 예외 / RTTI / 캐스팅.

## 관련 항목

- [Ch 4: Classes](/blog/embedded/standards/google-cpp/chapter04-classes)
- [Ch 6: Memory / Exceptions](/blog/embedded/standards/google-cpp/chapter06-features-memory-exceptions)
