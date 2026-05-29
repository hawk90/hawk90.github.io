---
title: "Ch 4: 함수, 람다, noexcept, default argument"
date: 2026-05-18T05:00:00
description: "함수 정의 정책(A8), 반환 타입 추론(A7-1-5), default argument 제한, noexcept 명시, lambda 안전 캡처."
tags: [autosar, cpp, function, lambda, noexcept, default-argument]
series: "AUTOSAR C++14"
seriesOrder: 4
draft: true
---

함수는 C++ 코드의 *최소 검증 단위*다. AUTOSAR는 함수 시그니처와 정의에서 *예측 가능성과 안전성*을 요구한다.

## A8 — Functions

### A8-2-1 — 함수의 *시그니처가 의도 표현*

```c++
// 회피 — 의미 불명확
int Process(int x, int y, bool flag);

// Good — 의도 명시
struct ProcessOptions {
    int width;
    int height;
    bool fullscreen;
};
int Process(const ProcessOptions &opts);

// 또는 named parameters
int Process(int width, int height, bool fullscreen);   // 호출 측은 여전히 위치 의존
```

C++20의 *designated initializer*가 정착하면 *명명 인자* 패턴이 자연스러워진다. C++14에서는 *구조체 wrapper*가 대안.

### A8-2-2 — 함수 인자가 *7개 이하*

C 함수와 같은 정책. 더 많으면 *구조체로 묶어라*.

### A8-2-3 — `auto` 반환 타입 회피 (헤더에서)

```c++
// 회피 (헤더에서) — 반환 타입이 무엇인지 모름
auto Foo() {
    return std::vector<int>{1, 2, 3};
}

// Good
std::vector<int> Foo();
```

`auto` 반환은 *include하는 모든 곳*이 *함수 body를 봐야 한다*. *컴파일 시간 증가, 인터페이스 불투명*.

내부 helper(`.cpp` 안)에서는 `auto` OK.

### A8-2-4 — `auto&&` 반환은 *forward reference*

```c++
// 회피
auto &&Get() { return std::vector<int>{}; }   // 임시 객체 reference

// Good — 명시
std::vector<int> Get();
```

### A8-2-5~6 — *Trailing return type*은 *필요할 때만*

```c++
// 회피 — 단순한 경우 trailing 불필요
auto Add(int a, int b) -> int { return a + b; }

// Good — 단순한 경우
int Add(int a, int b) { return a + b; }

// 정당한 trailing return
template <typename T, typename U>
auto Add(T a, U b) -> decltype(a + b) {     // 반환 타입이 매개변수에 의존
    return a + b;
}
```

### A8-3-1 — 모든 함수 매개변수는 *의미를 가짐*

미사용 매개변수 회피. 콜백 시그니처 강제는 `[[maybe_unused]]`.

### A8-4-1 — 함수 *재귀 회피*

MISRA R17.2와 같다. 스택 분석 곤란.

```c++
// 회피
int Factorial(int n) { return n <= 1 ? 1 : n * Factorial(n - 1); }

// Good — iteration
int Factorial(int n) {
    int r = 1;
    for (int i = 2; i <= n; i++) r *= i;
    return r;
}
```

### A8-4-2 — 함수 *반환값 사용*

```c++
[[nodiscard]] int may_fail();        // C++17 — C++14는 GCC attribute
int __attribute__((warn_unused_result)) may_fail();

// 호출
int rc = may_fail();                  // OK
(void)may_fail();                     // 의도적 무시 표시
may_fail();                           // 위반 — 경고
```

### A8-4-3 — `inline` 함수의 *외부 정의*

C++의 inline은 *ODR 예외 허용* — 여러 TU에 같은 정의 OK. 하지만 *모든 정의가 동일*해야.

### A8-4-4 — Default argument 사용 회피

```c++
// 회피
void Render(const Frame &f, bool overlay = false);

// 호출 측 코드 두 가지
Render(frame);              // overlay = false
Render(frame, true);

// Good — 명시적 오버로딩
void Render(const Frame &f);
void Render(const Frame &f, bool overlay);
```

Default argument는 *호출 측 코드의 의미*를 *함수 선언이 가린다*. 또한 *상속과 결합 시 미묘한 함정*.

### A8-4-5 — `noexcept` 명시

```c++
// 회피 — exception 던질 가능성 불명
void Cleanup();

// Good — exception 안 던짐 명시
void Cleanup() noexcept;
```

`noexcept`는 *컴파일러 최적화*와 *동시성 코드의 안전 보장*에 활용. Destructor, move operations, swap은 *원칙적으로 noexcept*.

```c++
class Foo {
public:
    Foo(Foo &&) noexcept = default;
    Foo &operator=(Foo &&) noexcept = default;
    ~Foo() noexcept;
};
```

## A8-5 — Lambda

### A8-5-1 — Lambda는 *명시적 캡처*

```c++
// 회피
auto fn = [=](int x) { return x + offset; };  // 전체 by-value 캡처

// Good
auto fn = [offset](int x) { return x + offset; };
```

### A8-5-2 — Lambda 반환 타입 *명시* (필요 시)

```c++
// 회피 — 반환 타입 추론 헷갈림
auto fn = [](bool b) {
    if (b) return 1;
    else return 2.0;          // 컴파일 에러? 또는 묵시 변환?
};

// Good
auto fn = [](bool b) -> double {
    return b ? 1.0 : 2.0;
};
```

### A8-5-3~4 — Lambda *수명* 관리

```c++
// 위반 — 자동 변수 참조 캡처 후 외부 반환
std::function<int()> MakeFn() {
    int x = 5;
    return [&x]() { return x; };   // x 사라짐
}

// Good
std::function<int()> MakeFn() {
    int x = 5;
    return [x]() { return x; };    // by-value
}
```

## Pass by — 인자 전달 정책

| 인자 | 전달 방식 |
|------|----------|
| 작은 값(int, pointer, enum) | by value |
| 큰 객체, 읽기만 | `const T &` |
| 큰 객체, 수정 | `T &` |
| 객체, 소유권 이전 | `T &&` (rvalue ref) |
| 객체, 옵션 | `const T *` 또는 `std::optional<T>` |

```c++
// 회피
void Process(std::vector<int> data);      // 복사

// Good
void Process(const std::vector<int> &data);   // 읽기만
void Process(std::vector<int> &data);          // 수정
void Process(std::vector<int> &&data);         // 소유권 이전 (move)
```

## RVO와 NRVO

C++17부터 *Return Value Optimization*이 *의무화*. 반환 값 *복사를 컴파일러가 제거*.

```c++
std::vector<int> Make() {
    std::vector<int> v;
    /* ... */
    return v;            // RVO/NRVO — 복사 없음
}

auto v = Make();         // v는 함수 안의 v와 동일 객체
```

*명시적 std::move*가 *오히려 RVO를 막을 수* 있다.

```c++
// 회피
std::vector<int> Make() {
    std::vector<int> v;
    return std::move(v);    // RVO 방해
}

// Good
std::vector<int> Make() {
    std::vector<int> v;
    return v;               // RVO 동작
}
```

## constexpr 함수

```c++
constexpr int Factorial(int n) {
    return n <= 1 ? 1 : n * Factorial(n - 1);   // 위반 — 재귀
}

// C++14 — constexpr이 loop 허용
constexpr int Factorial(int n) {
    int r = 1;
    for (int i = 2; i <= n; i++) r *= i;
    return r;
}

// 사용
constexpr int kF5 = Factorial(5);    // 컴파일 시 평가
int n = read_input();
int f = Factorial(n);                 // 런타임 평가
```

`constexpr` 함수는 *컴파일 타임과 런타임 둘 다* 호출 가능. 가능한 *constexpr로 표시*.

## noexcept 와 exception safety

```c++
// destructor — 항상 noexcept
~Foo() noexcept { /* ... */ }

// move — 가능하면 noexcept (그렇지 않으면 copy로 fallback)
Foo(Foo &&) noexcept = default;

// swap — noexcept
friend void swap(Foo &a, Foo &b) noexcept { /* ... */ }
```

`std::vector::push_back`은 *element가 noexcept move-constructible이면 move*, 아니면 *copy*. 즉 `noexcept` 표시 하나가 *성능 차이*를 만든다.

## 자주 마주치는 항목

| 규칙 | 흔한 위반 |
|------|---------|
| A8-2-3 (auto 반환) | 헤더에서 lambda·complicated 반환 |
| A8-4-4 (default arg) | C API 호환을 위한 default 사용 |
| A8-4-5 (noexcept) | destructor에 noexcept 누락 |
| A8-5-1 (캡처 명시) | `[=]` 또는 `[&]` 광범위 캡처 |

## 정리

- 함수 *시그니처가 의도 표현*. 인자 7개 이하.
- `auto` 반환은 *내부 helper만*. 헤더 회피.
- Default argument *회피* — 오버로딩.
- *noexcept 명시* — destructor, move, swap은 원칙적으로.
- Lambda는 *명시 캡처*. dangling reference 차단.
- *RVO를 방해하지 마라* — return에 `std::move` 회피.
- `constexpr` 적극 활용 — 컴파일 시 평가.

## 다음 장 예고

5장은 클래스. OOP, RAII, virtual, special member functions (rule of zero/five/three).

## 관련 항목

- [Ch 3 — Expressions, Conversions](/blog/embedded/automotive/autosar-cpp/chapter03-expressions-conversions)
- [Ch 5 — Classes, Inheritance](/blog/embedded/automotive/autosar-cpp/chapter05-classes-inheritance)
