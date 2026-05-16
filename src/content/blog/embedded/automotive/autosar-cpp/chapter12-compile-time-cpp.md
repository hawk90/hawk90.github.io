---
title: "Ch 12: Compile-time C++ — constexpr, type traits, concept 심화"
date: 2025-09-15T13:00:00
description: "C++의 컴파일 시 계산·검증 도구 총정리 — constexpr 진화(C++11→23), type traits 카탈로그, SFINAE에서 concept으로, 안전 critical 적용."
tags: [autosar, cpp, constexpr, type-traits, sfinae, concept, compile-time, template]
series: "AUTOSAR C++14"
seriesOrder: 12
draft: false
---

C++의 *컴파일 타임 계산*은 *런타임 비용을 0으로 줄이고, 잘못된 코드를 빌드 시점에 차단*한다. 6장에서 SFINAE를 봤지만, 이 장은 *컴파일 타임 C++의 전체 그림*을 본다 — `constexpr`의 진화, `type_traits` 카탈로그, concept으로의 전환, 안전 critical 코드 적용 사례.

## constexpr 진화 — C++11 → 23

C++ 표준이 정한 *컴파일 시 평가의 점진적 확장*.

```
C++11
  - constexpr 함수: 단일 return 문만
  - constexpr 변수: literal type만

C++14
  - constexpr 함수: 일반 statement (loop, if, local var) 허용
  - constexpr member 변수
  - constexpr lambda 일부

C++17
  - constexpr if (static_if)
  - inline constexpr 변수
  - if constexpr (이미)
  - constexpr lambda

C++20
  - constexpr 가상 함수
  - consteval (강제 컴파일 시 평가)
  - constinit (정적 초기화 보장)
  - constexpr try/catch (제한)
  - constexpr 동적 할당 (제한)
  - concept

C++23
  - constexpr if (consteval) 통합
  - 더 많은 표준 라이브러리 constexpr화
  - 더 풍부한 컴파일 시 동작
```

AUTOSAR C++14는 *C++14*까지지만, 핵심 idiom들은 더 확장됨.

## C++14 constexpr 함수 — 기본

```cpp
// 단순
constexpr int Add(int a, int b) {
    return a + b;
}

// 복합 — C++14
constexpr int Factorial(int n) {
    int r = 1;
    for (int i = 2; i <= n; ++i) {
        r *= i;
    }
    return r;
}

// 컴파일 시 평가
constexpr int kF5 = Factorial(5);    // = 120, 컴파일러가 계산
static_assert(kF5 == 120, "");

// 런타임 평가 (인자가 런타임 값이면)
int n = read_input();
int f = Factorial(n);                 // 런타임 호출
```

`constexpr` 함수는 *둘 다*. 인자가 *컴파일 시 알려진 값*이면 컴파일 평가, 아니면 런타임.

### 제약 — C++14

- 모든 인자 *literal type*.
- 호출하는 모든 함수가 *constexpr*.
- `try-catch` 금지 (C++20에서 일부 허용).
- `goto` 금지.
- 정적 변수 금지 (C++23에서 일부 허용).

## consteval — 강제 컴파일 시 (C++20)

```cpp
consteval int MustComputeAtCompileTime(int n) {
    return n * 2;
}

constexpr int kX = MustComputeAtCompileTime(5);    // OK
int n = read_input();
int x = MustComputeAtCompileTime(n);                // 컴파일 에러
```

`consteval` 함수는 *런타임 호출 자체 불가*. 컴파일 시 평가 *강제*.

## constinit — 정적 초기화 보장 (C++20)

```cpp
constinit int g_counter = 0;          // 정적 초기화 — runtime init 안 일어남
constinit Foo g_foo{ ... };           // OK if constexpr ctor

// vs
int g_x = ComputeAtRuntime();          // dynamic init — order 문제
```

*Static Initialization Order Fiasco* 차단. 컴파일러가 *순서 의존 초기화를 빌드 시 거부*.

## type_traits — 컴파일 시 타입 검사 카탈로그

`<type_traits>`(C++11+)는 *모든 컴파일 시 타입 질의*를 제공.

### Primary Type Categories

```cpp
std::is_void<T>::value             // void인가
std::is_null_pointer<T>::value     // nullptr_t인가 (C++14)
std::is_integral<T>::value         // 정수인가
std::is_floating_point<T>::value   // 부동소수인가
std::is_array<T>::value            // 배열인가
std::is_enum<T>::value             // enum인가
std::is_union<T>::value
std::is_class<T>::value
std::is_function<T>::value
std::is_pointer<T>::value
std::is_lvalue_reference<T>::value
std::is_rvalue_reference<T>::value
std::is_member_object_pointer<T>::value
std::is_member_function_pointer<T>::value
```

C++17부터 `_v` suffix.

```cpp
constexpr bool is_int = std::is_integral_v<int>;     // true
```

### Composite Type Categories

```cpp
std::is_fundamental_v<T>           // void, nullptr_t, 산술
std::is_arithmetic_v<T>            // 정수 + 부동소수
std::is_scalar_v<T>                // 산술 + enum + pointer + member ptr + nullptr
std::is_object_v<T>                // function 제외
std::is_compound_v<T>              // fundamental의 보수
std::is_reference_v<T>             // lvalue_ref + rvalue_ref
std::is_member_pointer_v<T>
```

### Type Properties

```cpp
std::is_const_v<T>
std::is_volatile_v<T>
std::is_trivial_v<T>               // 모든 SMF가 trivial
std::is_trivially_copyable_v<T>    // memcpy 안전
std::is_standard_layout_v<T>       // C 호환 layout
std::is_pod_v<T>                   // POD (deprecated C++20)
std::is_empty_v<T>                 // 데이터 멤버 없음
std::is_polymorphic_v<T>           // virtual 있음
std::is_abstract_v<T>              // pure virtual
std::is_final_v<T>                 // final 클래스
std::is_aggregate_v<T>             // aggregate 초기화 가능 (C++17)
std::is_signed_v<T>
std::is_unsigned_v<T>
```

### Type Operations

```cpp
std::is_constructible_v<T, Args...>
std::is_default_constructible_v<T>
std::is_copy_constructible_v<T>
std::is_move_constructible_v<T>
std::is_assignable_v<T, U>
std::is_destructible_v<T>
std::is_trivially_destructible_v<T>
std::is_nothrow_default_constructible_v<T>
std::is_nothrow_copy_constructible_v<T>
std::is_nothrow_move_constructible_v<T>
std::has_virtual_destructor_v<T>
```

### Type Relationships

```cpp
std::is_same_v<T, U>               // 정확히 같은 타입
std::is_base_of_v<Base, Derived>   // 상속 관계
std::is_convertible_v<From, To>    // 묵시 변환 가능
std::is_invocable_v<F, Args...>    // F(Args...) 호출 가능 (C++17)
std::is_invocable_r_v<R, F, Args...>  // R F(Args...)
std::is_nothrow_invocable_v<F, Args...>
```

### Type Transformations

```cpp
std::remove_cv_t<T>                // const/volatile 제거
std::remove_reference_t<T>         // & / && 제거
std::remove_pointer_t<T>           // * 제거
std::add_const_t<T>
std::add_lvalue_reference_t<T>
std::add_pointer_t<T>
std::make_signed_t<T>
std::make_unsigned_t<T>
std::decay_t<T>                    // 함수 인자 시 변환과 동일
std::underlying_type_t<EnumT>      // enum의 underlying type
std::common_type_t<T, U, ...>      // 공통 타입 (ternary처럼)
std::result_of_t<F(Args...)>       // 함수 호출 결과 타입 (deprecated C++17)
std::invoke_result_t<F, Args...>   // C++17 대체
std::aligned_storage_t<N, Align>   // 정렬된 raw storage
```

## SFINAE — C++14의 한계

```cpp
// C++14 SFINAE — 가독성 떨어짐
template <typename T,
          typename = std::enable_if_t<std::is_integral_v<T>>>
T Increment(T value) {
    return value + 1;
}

// return 타입 SFINAE
template <typename T>
std::enable_if_t<std::is_integral_v<T>, T>
Increment(T value) {
    return value + 1;
}

// void_t — type member 존재 확인
template <typename T, typename = void>
struct has_size : std::false_type {};

template <typename T>
struct has_size<T, std::void_t<decltype(std::declval<T>().size())>>
    : std::true_type {};

static_assert(has_size<std::vector<int>>::value, "");
static_assert(!has_size<int>::value, "");
```

SFINAE 코드는 *읽기 어렵고, 에러 메시지가 endless template error*.

## C++20 concept — SFINAE 대체

```cpp
template <typename T>
concept Integral = std::is_integral_v<T>;

template <Integral T>
T Increment(T value) {
    return value + 1;
}

// 또는 abbreviated
auto Increment(Integral auto value) {
    return value + 1;
}
```

훨씬 *읽기 쉽고, 에러 메시지가 명확*.

### 복합 concept

```cpp
template <typename T>
concept SafePackable = std::is_trivially_copyable_v<T>
                    && std::is_standard_layout_v<T>
                    && (sizeof(T) <= 64);

template <SafePackable T>
void Pack(const T &val, uint8_t *buf) {
    std::memcpy(buf, &val, sizeof(T));
}
```

여러 trait를 *논리 결합*. 자동차·항공 시스템에서 *DMA·CAN 패킷 직렬화*에 유용.

### 표준 concept (C++20)

```cpp
std::integral
std::floating_point
std::default_initializable
std::move_constructible
std::copy_constructible
std::movable
std::copyable
std::semiregular
std::regular
std::equality_comparable
std::totally_ordered
std::invocable<Args...>
std::predicate<Args...>
std::strict_weak_order<T, U>
std::derived_from<Base>
std::convertible_to<To>
std::common_with<U>
std::assignable_from<U>
std::swappable
std::destructible
```

## static_assert — 컴파일 시 어서션

```cpp
static_assert(sizeof(int) == 4, "int must be 32 bits");
static_assert(std::is_trivially_copyable_v<Packet>, "");
static_assert(CHAR_BIT == 8, "");
static_assert(std::alignment_of_v<Foo> == 16, "");

// concept을 직접 검사
template <typename T>
void Process(T x) {
    static_assert(SafePackable<T>);
    /* ... */
}
```

런타임 비용 0. 잘못된 가정이 *빌드 단계*에서 발견.

## 실전 예 — Compile-time DSP Coefficient

DSP 필터 계수를 *런타임에 계산하지 않고 컴파일 타임에*.

```cpp
// FIR filter — Hamming window
constexpr int kFilterLen = 64;

constexpr double Pi() { return 3.141592653589793; }

constexpr double Hamming(int n, int N) {
    return 0.54 - 0.46 * std::cos(2.0 * Pi() * n / (N - 1));
}

constexpr double Sinc(double x) {
    return (x == 0.0) ? 1.0 : std::sin(Pi() * x) / (Pi() * x);
}

constexpr std::array<double, kFilterLen>
ComputeFilterCoeffs(double cutoff) {
    std::array<double, kFilterLen> h{};
    int M = kFilterLen - 1;
    for (int n = 0; n <= M; ++n) {
        double x = 2.0 * cutoff * (n - M / 2.0);
        h[n] = 2.0 * cutoff * Sinc(x) * Hamming(n, kFilterLen);
    }
    return h;
}

// 컴파일 시 평가
constexpr auto kFilterCoeffs = ComputeFilterCoeffs(0.25);
```

(`std::sin`은 C++26부터 표준 constexpr. C++14에서는 자체 Taylor 시리즈 구현 필요.)

이 패턴이 *센서 신호 처리, 제어기 게인, lookup table*에 광범위. 임베디드에서 *flash 절약 + 런타임 비용 0*.

## 실전 예 — Compile-time State Machine

```cpp
enum class State { Idle, Running, Error, Shutdown };
enum class Event { Start, Stop, Fault, Reset };

struct Transition {
    State from;
    Event event;
    State to;
};

constexpr Transition kTransitions[] = {
    { State::Idle,     Event::Start, State::Running  },
    { State::Running,  Event::Stop,  State::Idle     },
    { State::Running,  Event::Fault, State::Error    },
    { State::Error,    Event::Reset, State::Idle     },
    { State::Idle,     Event::Stop,  State::Shutdown },
};

constexpr State NextState(State current, Event event) {
    for (const auto &t : kTransitions) {
        if (t.from == current && t.event == event) {
            return t.to;
        }
    }
    return current;     // no transition
}

// 컴파일 시 검증
static_assert(NextState(State::Idle, Event::Start) == State::Running);
static_assert(NextState(State::Running, Event::Fault) == State::Error);
```

상태 전이가 *코드 변경 없이 빌드 시 검증 가능*. 자동차 ECU의 *Safety State Machine* 같은 곳에 적용.

## 실전 예 — 단위 검사 (Compile-time Units)

```cpp
template <int M, int K, int S>
struct Unit {
    double value;
    constexpr Unit(double v) : value(v) {}
};

using Meters         = Unit<1, 0, 0>;
using Kilograms      = Unit<0, 1, 0>;
using Seconds        = Unit<0, 0, 1>;
using MetersPerSec   = Unit<1, 0, -1>;
using Newtons        = Unit<1, 1, -2>;    // kg·m/s²

template <int M1, int K1, int S1, int M2, int K2, int S2>
constexpr auto operator*(Unit<M1, K1, S1> a, Unit<M2, K2, S2> b) {
    return Unit<M1 + M2, K1 + K2, S1 + S2>{a.value * b.value};
}

template <int M1, int K1, int S1, int M2, int K2, int S2>
constexpr auto operator/(Unit<M1, K1, S1> a, Unit<M2, K2, S2> b) {
    return Unit<M1 - M2, K1 - K2, S1 - S2>{a.value / b.value};
}

// 사용
Meters distance{100.0};
Seconds time{10.0};

auto speed = distance / time;     // MetersPerSec
auto wrong = distance + time;     // 컴파일 에러 (operator+ 정의 없음)
```

NASA Mars Climate Orbiter 사고(1999, 미터 ↔ 피트 혼동)가 *이 패턴*으로 차단 가능했다. 자율주행 코드에 *광범위 도입*되고 있다.

## 실전 예 — Compile-time Safety Class

```cpp
template <typename T>
constexpr bool IsSafeIntegral = std::is_integral_v<T>
                              && (sizeof(T) >= 4)
                              && !std::is_same_v<T, char>;

template <typename T>
class SafeCounter {
    static_assert(IsSafeIntegral<T>, "T must be int32+");
    T value_;
public:
    void Increment() {
        if (value_ == std::numeric_limits<T>::max()) {
            throw std::overflow_error("counter saturated");
        }
        ++value_;
    }
};

SafeCounter<int32_t> c1;     // OK
SafeCounter<int8_t>  c2;     // 컴파일 에러
SafeCounter<char>    c3;     // 컴파일 에러
```

타입 안전성을 *템플릿 인자 단계에서 강제*.

## 실전 예 — Compile-time Hash

```cpp
constexpr uint32_t Fnv1a(const char *s) {
    uint32_t hash = 2166136261u;
    while (*s) {
        hash ^= static_cast<uint32_t>(*s++);
        hash *= 16777619u;
    }
    return hash;
}

// 컴파일 시 해시
constexpr uint32_t kHash = Fnv1a("hello");    // 빌드 시 계산

switch (Fnv1a(msg.id)) {
    case Fnv1a("start"): /* ... */ break;
    case Fnv1a("stop"):  /* ... */ break;
}
```

문자열 비교를 *정수 비교*로. 메시지 디스패치·event ID 매칭에 광범위 적용.

## Tag Dispatch — concept 도입 전 패턴

```cpp
template <typename T>
void ProcessImpl(T value, std::true_type /* is_integral */) {
    /* 정수 처리 */
}

template <typename T>
void ProcessImpl(T value, std::false_type /* not integral */) {
    /* 부동소수 처리 */
}

template <typename T>
void Process(T value) {
    ProcessImpl(value, std::is_integral<T>{});
}
```

C++14 패턴. C++17의 `if constexpr`이나 C++20 concept으로 *단순화*.

```cpp
// C++17 — if constexpr
template <typename T>
void Process(T value) {
    if constexpr (std::is_integral_v<T>) {
        /* 정수 처리 */
    } else {
        /* 부동소수 처리 */
    }
}

// C++20 — concept overload
void Process(std::integral auto value) {
    /* 정수 처리 */
}
void Process(std::floating_point auto value) {
    /* 부동소수 처리 */
}
```

## CRTP — Curiously Recurring Template Pattern

```cpp
template <typename Derived>
class Comparable {
public:
    bool operator!=(const Derived &other) const {
        return !static_cast<const Derived &>(*this).operator==(other);
    }
    bool operator>(const Derived &other) const {
        return other < static_cast<const Derived &>(*this);
    }
    // 등등
};

class Point : public Comparable<Point> {
public:
    bool operator==(const Point &p) const { return x_ == p.x_ && y_ == p.y_; }
    bool operator<(const Point &p) const { return x_ < p.x_ || (x_ == p.x_ && y_ < p.y_); }
private:
    int x_, y_;
};

Point p1, p2;
bool ne = p1 != p2;     // Comparable::operator!= 호출, 결국 Point::operator== 호출
```

가상 함수 없이 *컴파일 시 dispatch*. 임베디드에서 *vtable 비용 회피*.

## Policy-based Design

```cpp
// 정책 클래스
struct LogConsole {
    static void Log(const char *msg) { std::cout << msg << "\n"; }
};

struct LogFile {
    static void Log(const char *msg) {
        // ... file write ...
    }
};

struct LogSilent {
    static void Log(const char *) {}    // 비활성
};

// 정책 사용 클래스
template <typename Logger>
class Service {
public:
    void Run() {
        Logger::Log("service start");
        // ... 작업 ...
        Logger::Log("service end");
    }
};

Service<LogConsole> dev_service;
Service<LogFile>    prod_service;
Service<LogSilent>  bench_service;    // 비활성 — 컴파일러가 Log 호출 제거
```

다른 *behavior*를 *템플릿 인자*로. 런타임 분기 0.

## Expression Template

선형대수에서 *임시 객체를 만들지 않고 직접 결과 계산*.

```cpp
// 단순 — 임시 vector 다수 생성
Vec a, b, c, d;
Vec r = a + b + c + d;
// = (a + b) → tmp1; (tmp1 + c) → tmp2; (tmp2 + d) → r;
// 3개 임시 객체

// Expression template — 컴파일러가 한 번 loop으로
template <typename L, typename R>
struct AddExpr {
    const L &l;
    const R &r;
    double operator[](int i) const { return l[i] + r[i]; }
};

template <typename L, typename R>
AddExpr<L, R> operator+(const L &l, const R &r) {
    return {l, r};
}

class Vec {
    template <typename Expr>
    Vec &operator=(const Expr &e) {
        for (int i = 0; i < N; ++i) data_[i] = e[i];
        return *this;
    }
};

Vec r = a + b + c + d;     // AddExpr<AddExpr<AddExpr<Vec,Vec>,Vec>,Vec>
                            // 단 하나의 loop, 임시 없음
```

Eigen, Blaze, Armadillo 라이브러리가 이 패턴.

## Type Erasure

가상 함수처럼 *런타임 다형성*을 *상속 없이* 제공.

```cpp
class Drawable {
public:
    template <typename T>
    Drawable(T value)
        : ptr_(std::make_unique<Holder<T>>(std::move(value))) {}

    void Draw() const { ptr_->Draw(); }

private:
    struct Concept {
        virtual ~Concept() = default;
        virtual void Draw() const = 0;
    };

    template <typename T>
    struct Holder : Concept {
        T value;
        explicit Holder(T v) : value(std::move(v)) {}
        void Draw() const override { value.Draw(); }
    };

    std::unique_ptr<Concept> ptr_;
};

struct Circle { void Draw() const { /* ... */ } };
struct Square { void Draw() const { /* ... */ } };

std::vector<Drawable> shapes;
shapes.emplace_back(Circle{});
shapes.emplace_back(Square{});
for (auto &s : shapes) s.Draw();
```

`std::function`, `std::any`가 같은 패턴.

## 적용 — 안전 critical 코드

### 패턴 1 — 상태 머신 컴파일 시 검증

위 예제. 모든 상태 전이를 *빌드 시 검증*. 런타임 분기 없음.

### 패턴 2 — 단위 시스템

물리량 단위 안전성. 컴파일러가 *m + s* 같은 무의미 연산 거부.

### 패턴 3 — 컴파일 시 lookup table

DSP 필터 계수, 로그 테이블, 삼각함수 — 모두 *binary에 정적 데이터*로.

### 패턴 4 — 메시지 디스패치

Compile-time hash로 *문자열 → 정수 비교*.

### 패턴 5 — 정책 기반 design

debug/release/safety 모드를 *템플릿 인자*로. 런타임 분기 없음.

## AUTOSAR C++14 정책 — Compile-time 사용

| 기능 | AUTOSAR 정책 |
|------|-------------|
| `constexpr` 함수 | 적극 권장 (A7-1-2) |
| `constexpr` 변수 | 적극 권장 |
| `static_assert` | 권장 (DCL03와 동일) |
| `type_traits` | 권장 — 컴파일 시 검사 |
| SFINAE | 신중히 — 가독성 손해 (A14-7) |
| Template metaprogramming | 제한적 (A14-10) |
| C++17 `if constexpr` | C++14는 대안으로 tag dispatch |
| C++20 concept | 미적용 (C++14 한정) |

## C++14 → 17/20 migration 고려

AUTOSAR 컨소시엄은 *2023년 C++17 부분 채택*. 후계 표준 MISRA C++:2023은 C++17 기반. 이전 시 *concept, if constexpr, inline variable, fold expression* 활용 가능.

## 정리

- `constexpr`은 *런타임 비용 0 + 컴파일 시 검증* 양쪽 제공.
- `type_traits` 카탈로그가 *모든 컴파일 시 타입 질의* 제공.
- SFINAE는 C++14의 표준. concept(C++20)이 *훨씬 깔끔*.
- `static_assert` + traits로 *컴파일 시 계약*.
- 패턴: 상태 머신, 단위 시스템, lookup table, message dispatch, policy-based.
- 임베디드 가치: *런타임 비용 0 + 사고 차단*. 모든 가능한 곳에 적용.
- AUTOSAR는 C++14 한정 — 후계 표준에서 더 풍부한 도구.

## 다음 장 예고

13장은 *Modern C++ 보안 패턴* — `gsl::span`, `gsl::not_null`, `gsl::owner`, defensive type, fluent API.

## 관련 항목

- [Ch 6 — Templates](/blog/embedded/automotive/autosar-cpp/chapter06-templates)
- [Ch 11 — RAII Pattern Catalog](/blog/embedded/automotive/autosar-cpp/chapter11-raii-pattern-catalog)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [Compiler Explorer (Godbolt)](https://godbolt.org/)
