---
title: "Ch 7: 예외 처리 — try/catch, noexcept, exception safety"
date: 2026-05-18T08:00:00
description: "예외 클래스 throw(A15-1-1), destructor에서 leak 금지(A15-5-1), exception safety guarantee, 임베디드 적용 논쟁."
tags: [autosar, cpp, exception, noexcept, raii, exception-safety]
series: "AUTOSAR C++14"
seriesOrder: 7
draft: false
---

C++ 예외는 *RAII와 결합하면* 깨끗한 자원 관리를, *분석·성능 관점에서는* 큰 부담을 준다. 임베디드 안전 시스템에서 *예외를 쓸 것인가*는 *프로젝트 차원의 결정*이다.

## A15 — Exception Handling

### A15-0-1 — 예외는 *순수 라이브러리 코드*에서만

```c++
// 회피 — 일반 비즈니스 로직에서 예외
int Process(int x) {
    if (x < 0) throw std::invalid_argument("x must be non-negative");
    return x * 2;
}

// Good — return code
int Process(int x, int *result) {
    if (x < 0) return -EINVAL;
    *result = x * 2;
    return 0;
}
```

예외는 *정말 예외적인 상황*에 한정한다. 자원 부족, OS 실패 같은 경우다. *흐름 제어*로 쓰지 마라.

### A15-1-1 — 예외는 *예외 클래스만* throw

```c++
// 위반
throw 42;                       // int throw
throw "error";                  // string literal throw

// Good
throw std::runtime_error("compute failed");
throw std::out_of_range("index out of bounds");

// 더 좋음 — 도메인 예외 정의
class CanError : public std::runtime_error {
public:
    CanError(int code, const std::string &msg)
        : std::runtime_error(msg), code_(code) {}
    int code() const noexcept { return code_; }
private:
    int code_;
};

throw CanError(0x1234, "bus off");
```

도메인 예외 클래스로 *catch 차별화* 가능.

### A15-1-2 — Exception은 *value*로 throw

```c++
// 위반 — 포인터 throw (소유권 모호)
throw new std::runtime_error("oops");

// Good — value
throw std::runtime_error("oops");
```

### A15-1-3 — Exception이 *standard exception에서 상속*

```c++
// Good — std::exception 계층
class MyError : public std::runtime_error { /* ... */ };

// catch all
try {
    DoWork();
} catch (const std::exception &e) {
    log_error("caught: %s", e.what());
}
```

`std::exception`이 *최상위 catch*. 다른 계층을 만들면 *놓치기 쉽다*.

### A15-2-1 — *Catch by const reference*

```c++
// 위반 — value catch는 slicing
try { /* ... */ } catch (std::exception e) { /* ... */ }

// 위반 — non-const reference (수정 가능)
try { /* ... */ } catch (std::exception &e) { /* ... */ }

// Good — const reference
try { /* ... */ } catch (const std::exception &e) { /* ... */ }
```

### A15-2-2 — Catch handler는 *재 throw* 가능

```c++
try {
    DoWork();
} catch (const SpecificError &e) {
    Cleanup();
    throw;                  // rethrow same exception
}

// 또는 새 예외로 wrap
try {
    DoWork();
} catch (const LowLevelError &e) {
    throw HighLevelError("operation failed", e);   // wrapping
}
```

### A15-3-1~6 — Catch *순서*

```c++
try {
    DoWork();
} catch (const DerivedError &e) {     // 먼저 — 더 구체적
    /* ... */
} catch (const BaseError &e) {        // 나중 — 일반
    /* ... */
} catch (const std::exception &e) {   // 최후
    /* ... */
}
```

*구체적 → 일반* 순서. 반대로 두면 *DerivedError가 BaseError handler에 잡혀* derived handler가 실행되지 않음.

### A15-4-1 — `noexcept`로 *예외 안 던짐 명시*

```c++
void Cleanup() noexcept;          // 약속
~Foo() noexcept;                  // destructor — 원칙적 noexcept
Foo(Foo &&) noexcept;             // move — 원칙적 noexcept
```

`noexcept`가 *거짓*이면(런타임에 예외 throw) `std::terminate`. *진짜 안 던질 때만*.

### A15-4-2 — Move·swap·destructor는 *noexcept*

```c++
class Foo {
public:
    Foo(Foo &&other) noexcept;                       // ✓
    Foo &operator=(Foo &&other) noexcept;            // ✓
    ~Foo() noexcept;                                  // ✓
    friend void swap(Foo &a, Foo &b) noexcept;       // ✓
};
```

이 함수들이 *noexcept가 아니면* `std::vector` 같은 컨테이너가 *move 대신 copy로 fallback*해 성능 저하.

### A15-5-1 — Destructor에서 *예외 leak 금지*

```c++
// 위반 — destructor가 예외 던짐
~Foo() {
    if (some_condition) {
        throw std::runtime_error("oops");     // 위반 — UB
    }
}

// Good — destructor에서 예외 catch + log
~Foo() noexcept {
    try {
        Cleanup();           // 예외 던질 수 있는 함수
    } catch (const std::exception &e) {
        log_error("Foo dtor: %s", e.what());
    } catch (...) {
        log_error("Foo dtor: unknown");
    }
}
```

Destructor에서 *예외가 빠져나가면* `std::terminate`(특히 stack unwinding 중이면).

### A15-5-2 — `std::move_if_noexcept`로 *안전 fallback*

```c++
// vector::push_back 내부 패턴
if constexpr (std::is_nothrow_move_constructible_v<T>) {
    new (storage) T(std::move(elem));
} else {
    new (storage) T(elem);                 // copy fallback
}
```

`noexcept` 표시가 *런타임 동작*에 영향. 따라서 *정확한 표시*가 중요.

### A15-5-3 — `std::terminate` 호출 회피

`std::terminate`는 *문자 그대로 즉시 종료*. 처리되지 않은 예외, noexcept 위반, double exception 등에서 호출.

### A15-7-1~7 — Exception specification *deprecated*

```c++
// 회피 — C++98 throw-spec
void Foo() throw(std::exception);    // 폐지

// Good — noexcept
void Foo() noexcept;
void Foo() noexcept(false);         // = 예외 던질 수 있음 (default)
```

## Exception Safety Guarantee

함수가 예외를 *어떻게 다루는지* 4단계로 분류.

| 등급 | 의미 |
|------|------|
| **No-throw** | 예외 절대 안 던짐 (noexcept) |
| **Strong** | 예외 시 *원상복귀* (transactional) |
| **Basic** | 예외 시 *유효한 상태* 유지 (자원 누수 없음) |
| **No guarantee** | 예외 시 *상태 불명* — 위험 |

```c++
// Strong guarantee — copy-and-swap
Foo &operator=(Foo other) {           // copy ctor가 throw 가능
    swap(*this, other);               // swap은 noexcept
    return *this;
}

// Basic guarantee
void push_back(const T &v) {
    if (size_ == cap_) Resize();      // Resize가 throw 가능
    data_[size_++] = v;
}
```

표준 라이브러리는 *대부분 basic 또는 strong guarantee*. AUTOSAR는 *각 함수의 등급을 문서화*.

## 임베디드 — 예외 사용 결정

**예외 *비활성화* 옵션** — `g++ -fno-exceptions`

```c++
// -fno-exceptions로 컴파일하면
try { /* ... */ } catch (...) { }    // 컴파일 에러
throw std::runtime_error("oops");     // 컴파일 에러

// 표준 라이브러리도 *abort 호출*로 대체
std::vector<int> v;
v.at(10);     // 원래 std::out_of_range throw → abort 호출
```

자동차·항공·의료 펌웨어는 *대부분 -fno-exceptions*. 이유:

- **결정성** — 예외 throw 시간이 *컴파일러·플랫폼에 따라 다름*.
- **바이너리 크기** — exception unwinding 메타데이터 + RTTI.
- **분석 곤란** — *모든 함수가 throw 경로*를 가짐.

AUTOSAR C++14는 *예외 허용*이지만 *프로젝트 차원에서 비활성화 가능*. *MISRA C++:2023*은 더 명시적으로 *임베디드에서 예외 회피*를 권장.

## A16 — Compiler Directives

### A16-0-1 — `#pragma`는 *컴파일러 의존*

매크로로 캡슐화.

```c++
#if defined(__GNUC__)
#  define PACKED __attribute__((packed))
#else
#  define PACKED
#endif
```

### A16-2-1 — *Conditional inclusion*은 *include guard 외 회피*

```c++
// 회피
#if PLATFORM_X
    #include "x_specific.hpp"
#else
    #include "y_specific.hpp"
#endif

// Good — 빌드 시스템으로 file 선택
// CMake: target_include_directories(... PRIVATE platform_x)
```

## 정리

- 예외는 *진짜 예외*에만. 흐름 제어 회피.
- 예외 클래스만 throw, value로, std::exception 상속.
- Catch는 *const reference, 구체적 → 일반 순서*.
- Destructor·move·swap은 *noexcept*.
- Destructor에서 *예외 leak 금지*.
- Exception Safety Guarantee — *각 함수가 어느 등급*인지 명시.
- 임베디드는 *-fno-exceptions* 채택이 일반적. AUTOSAR 허용하지만 프로젝트 결정.

## 다음 장 예고

8장은 STL 사용 정책. container, algorithm, smart pointer. 임베디드에서 *허용·금지* 영역.

## 관련 항목

- [Ch 6 — Templates](/blog/embedded/automotive/autosar-cpp/chapter06-templates)
- [Ch 8 — STL](/blog/embedded/automotive/autosar-cpp/chapter08-stl)
