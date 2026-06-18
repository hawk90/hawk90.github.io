---
title: "CRTP 패턴 분석 — vtable 없는 정적 다형성"
date: 2026-04-29T09:16:00
description: "Curiously Recurring Template Pattern — virtual 함수 없이 컴파일 타임 다형성. vtable 0, 간접 호출 0."
series: "Embedded C++ for Real Systems"
seriesOrder: 16
tags: [cpp, embedded, crtp, polymorphism, virtual, zero-cost]
type: tech
---

## 한 줄 요약

> **"CRTP는 template을 통한 다형성."** — virtual 함수 없이 컴파일 타임에 dispatch를 결정합니다.

## 어떤 문제를 푸는가

런타임 다형성(virtual)에는 다음과 같은 비용이 따릅니다.

- vtable이 클래스당 4~N 바이트를 차지합니다.
- vptr이 객체당 4 바이트를 더합니다.
- 간접 호출이 발생해 branch prediction이 어렵고 inline이 거의 되지 않습니다.
- 가상 함수 코드와 vtable이 코드 크기에 더해집니다.

소규모 MCU에서는 다형성 객체 수십 개만으로도 수 KB의 부담이 됩니다. 이때의 대안이 **CRTP**(Curiously Recurring Template Pattern)입니다.

```cpp
// 전통 — virtual
class Shape {
public:
    virtual ~Shape() = default;
    virtual int area() const = 0;
};

class Circle : public Shape {
    int r;
public:
    int area() const override { return 3 * r * r; }
};

// CRTP — virtual 없이
template<typename Derived>
class Shape {
public:
    int area() const {
        return static_cast<const Derived*>(this)->area_impl();
    }
};

class Circle : public Shape<Circle> {
    int r;
public:
    int area_impl() const { return 3 * r * r; }
};
```

CRTP의 핵심은 `Shape<Circle>::area()`가 `static_cast<Circle*>`로 컴파일 타임에 dispatch된다는 점입니다. virtual table 없이 다형성을 얻습니다.

## CRTP의 구조

핵심 idiom은 다음과 같습니다.

```cpp
template<typename Derived>
class Base {
public:
    void interface_method() {
        // Derived의 method 호출
        static_cast<Derived*>(this)->impl_method();
    }
};

class Concrete : public Base<Concrete> {   // 자신을 template 매개변수로
public:
    void impl_method() {
        // 실제 구현
    }
};
```

- `Base<Derived>`가 interface를 정의합니다.
- `Derived`는 자신을 template 인자로 넘기며 `Base<Derived>`를 상속합니다.
- Base가 `static_cast`로 Derived의 method를 호출합니다.

각 Concrete 인스턴스는 `Base<Concrete>`를 별도로 인스턴스화하며, dispatch가 컴파일 타임에 결정됩니다.

## 임베디드 — Logger CRTP

```cpp
template<typename Derived>
class LoggerBase {
public:
    void log(const char* msg) {
        derived()->log_impl(msg);
    }

    void log_error(const char* msg) {
        derived()->log_impl("[ERROR] ");
        derived()->log_impl(msg);
    }

protected:
    Derived* derived() {
        return static_cast<Derived*>(this);
    }
};

class UartLogger : public LoggerBase<UartLogger> {
public:
    void log_impl(const char* msg) {
        while (*msg) {
            USART2->DR = *msg++;
            while (!(USART2->SR & USART_SR_TC));
        }
    }
};

class FileLogger : public LoggerBase<FileLogger> {
public:
    void log_impl(const char* msg) {
        fwrite(msg, 1, strlen(msg), file_);
    }
private:
    FILE* file_;
};

UartLogger uart;
uart.log("hello");      // 컴파일 타임에 UartLogger::log_impl 호출
```

`uart.log("hello")`의 어셈블리는 다음과 같습니다.

```text
# 전통 virtual
ldr     r3, [r0]         ; vptr 로드
ldr     r3, [r3]         ; vtable에서 함수 주소
blx     r3               ; 간접 호출 — branch prediction 어려움

# CRTP
bl      UartLogger::log_impl    ; 직접 호출 — 인라인 가능
```

간접 호출이 제거되고 inline이 가능합니다. 함수가 작으면 완전히 인라인됩니다.

## CRTP vs virtual — 비교

호출 흐름의 차이부터 보면 다음과 같습니다. virtual은 vptr → vtable → 함수까지 두 단계의 메모리 indirection을 거치지만, CRTP는 컴파일 타임에 derived 함수로 바로 인라인됩니다.

![CRTP vs virtual dispatch — indirection 단계 비교](/images/blog/embedded-cpp/diagrams/part2-08-crtp-vs-virtual.svg)

| | virtual | CRTP |
| --- | --- | --- |
| Dispatch | 런타임 | 컴파일 타임 |
| vptr | 객체당 1 (4 B) | 없음 |
| vtable | 클래스당 (N * 4 B) | 없음 |
| 간접 호출 | 있음 | 없음 |
| Inline 가능 | 거의 없음 | 자주 |
| Container 동질성 | OK (Shape*) | 제한 |
| 런타임 type 결정 | OK | 컴파일 타임만 |

CRTP에는 제약이 있습니다. 런타임에 type을 결정할 수 없고, 컴파일 타임에 type이 알려져 있어야 합니다.

```cpp
// virtual — runtime polymorphism
std::vector<Shape*> shapes;   // 다른 Shape 타입 섞임 OK
shapes.push_back(new Circle);
shapes.push_back(new Square);
for (auto* s : shapes) {
    s->area();   // 각자의 area 호출
}

// CRTP — compile-time
Circle c;
Square s;
c.area();   // OK
s.area();   // OK
// 한 컨테이너에 섞기 어려움 (다른 base type)
```

CRTP는 컴파일 타임에 type set이 닫혀 있을 때 유리합니다.

## 임베디드 — Peripheral CRTP

```cpp
template<typename Derived>
class PeripheralBase {
public:
    void init() {
        derived()->init_impl();
    }

    void send(uint8_t b) {
        derived()->send_impl(b);
    }

    void send_buffer(const uint8_t* data, size_t len) {
        for (size_t i = 0; i < len; ++i) {
            derived()->send_impl(data[i]);
        }
    }

private:
    Derived* derived() {
        return static_cast<Derived*>(this);
    }
};

class Uart2 : public PeripheralBase<Uart2> {
public:
    void init_impl() { /* */ }
    void send_impl(uint8_t b) {
        while (!(USART2->SR & USART_SR_TXE));
        USART2->DR = b;
    }
};

class Spi1 : public PeripheralBase<Spi1> {
public:
    void init_impl() { /* */ }
    void send_impl(uint8_t b) {
        SPI1->DR = b;
        while (!(SPI1->SR & SPI_SR_TXE));
    }
};

Uart2 uart;
uart.send_buffer(data, 100);   // 인라인 가능
```

`send_buffer`의 loop 안에서 `send_impl`이 인라인됩니다. 데이터 복사와 UART 쓰기가 작은 loop 하나로 압축됩니다.

## CRTP로 mixin 패턴

여러 독립 기능을 조합할 때 virtual base class 대신 각 mixin을 CRTP로 구현합니다.

```cpp
template<typename Derived>
struct Comparable {
    bool operator!=(const Derived& other) const {
        return !(static_cast<const Derived*>(this)->operator==(other));
    }
    bool operator>(const Derived& other) const {
        return other < *static_cast<const Derived*>(this);
    }
    bool operator<=(const Derived& other) const {
        return !(*static_cast<const Derived*>(this) > other);
    }
    bool operator>=(const Derived& other) const {
        return !(*static_cast<const Derived*>(this) < other);
    }
};

class Version : public Comparable<Version> {
public:
    int major, minor, patch;

    bool operator==(const Version& o) const {
        return major == o.major && minor == o.minor && patch == o.patch;
    }
    bool operator<(const Version& o) const {
        if (major != o.major) return major < o.major;
        if (minor != o.minor) return minor < o.minor;
        return patch < o.patch;
    }
};

Version v1{1, 0, 0}, v2{1, 2, 0};
bool b = v1 < v2;    // operator< — 직접 구현
bool c = v1 >= v2;   // Comparable이 자동 제공 → v1 < v2 → not
```

`Version`은 `operator==`와 `operator<`만 구현하며, 나머지 비교 연산자는 `Comparable`이 자동으로 제공합니다.

C++20의 `<=>`(spaceship operator)가 같은 효과를 내지만, CRTP는 C++11부터 가능합니다.

## CRTP의 단점

### 1. 같은 base의 다른 instantiation은 별개 type

```cpp
template<typename D> struct Base {};
class A : Base<A> {};
class B : Base<B> {};

// Base<A>와 Base<B>는 다른 타입
// "Base를 받는 함수"가 자연스럽지 않음
```

해결책은 C++20의 concept이나 type erasure입니다.

```cpp
// C++20 concept
template<typename T>
concept LoggerLike = requires(T t, const char* msg) {
    t.log(msg);
};

void log_all(LoggerLike auto& logger, ...) {
    // 어떤 Logger든 받음
}
```

### 2. 컴파일 에러 메시지가 복잡함

template error의 전형적인 문제입니다. C++20 concepts가 훨씬 깔끔하게 만들어 줍니다.

### 3. 런타임 type 결정이 불가능

plug-in 시스템이나 동적 객체 생성에는 virtual이 필요합니다. CRTP는 컴파일 타임에 정해진 type set만 다룹니다.

## CRTP가 잘 맞는 3가지 패턴

### 1. Static interface enforcement

```cpp
template<typename Derived>
class Driver {
public:
    void init() {
        static_assert(requires(Derived d) { d.init_impl(); },
                      "Derived must implement init_impl");
        static_cast<Derived*>(this)->init_impl();
    }
};
```

자식이 반드시 구현해야 하는 메서드를 컴파일 타임에 강제합니다.

### 2. Code sharing without runtime cost

여러 device driver가 같은 utility를 공유하면서도 각자의 init/send/recv를 가질 때, CRTP가 공통 부분은 한 곳에, 특수 부분은 자식에 둡니다.

### 3. Operator generation

비교 연산자나 arithmetic 연산자 등을 자동 생성해 boilerplate를 줄여 줍니다.

## CRTP 함정

### 1. Base에서 Derived의 private member 접근
```cpp
template<typename D>
class Base {
public:
    void foo() {
        static_cast<D*>(this)->private_method();   // ERROR
    }
};
```
`friend class Base<Derived>;`를 추가하거나 public method로 노출해 해결합니다.

### 2. Derived의 destructor가 호출되지 않음
```cpp
Base<Derived>* ptr = new Derived;
delete ptr;   // Base의 destructor만 호출 — Derived 자원 누수
```
CRTP base는 보통 stack에서 쓰거나 derived로 직접 사용합니다. base pointer로 소유하는 패턴은 피해야 합니다.

### 3. 복사 동작이 의도와 어긋남
```cpp
template<typename D>
class Base {
public:
    void copy_from(const Base& other) {
        *static_cast<D*>(this) = *static_cast<const D*>(&other);
    }
};
```
`operator=`가 잘 정의된 D에서만 안전합니다.

### 4. 과도한 CRTP layer
```cpp
class Concrete : public BaseA<Concrete>, public BaseB<Concrete>, public BaseC<Concrete> {};
```
다중 상속에서 diamond 문제나 이름 충돌이 발생할 수 있습니다. 한두 layer 정도로 제한합니다.

## C++20 concepts + CRTP

CRTP의 흐릿한 interface 정의를 concept으로 명확하게 만들 수 있습니다.

```cpp
template<typename T>
concept Logger = requires(T t, const char* msg) {
    { t.log_impl(msg) } -> std::same_as<void>;
};

template<Logger Derived>   // ← Derived는 Logger를 만족해야 함
class LoggerBase {
public:
    void log(const char* msg) {
        static_cast<Derived*>(this)->log_impl(msg);
    }
};
```

template error message가 한층 명확해집니다.

## 자주 보는 함정과 안티패턴

### 1. 공허한 CRTP
```cpp
template<typename D>
class Base {};   // 비어 있음

class Concrete : public Base<Concrete> {};
```
기능이 없습니다. CRTP는 의도된 utility를 제공해야 의미가 있습니다.

### 2. CRTP base에서 virtual 사용
```cpp
template<typename D>
class Base {
public:
    virtual void method() { /* */ }   // virtual + CRTP는 모순
};
```
CRTP는 virtual을 회피하는 패턴이므로 의도가 모호해집니다.

### 3. Multiple CRTP base 충돌
```cpp
template<typename D> struct A { void foo(); };
template<typename D> struct B { void foo(); };
class C : public A<C>, public B<C> {};
C c;
c.foo();   // ERROR — A::foo와 B::foo 충돌
```
`c.A<C>::foo()`처럼 명시적으로 호출합니다.

### 4. CRTP 외부 인터페이스 불일치
서로 다른 CRTP 인스턴스를 같은 함수에서 받기가 어렵습니다. concept이나 type erasure를 사용합니다.

### 5. Sizeof 증가
CRTP base가 멤버를 가지면 Concrete가 그만큼 커집니다. Empty Base Optimization 덕분에 보통은 추가 크기가 0으로 처리됩니다.

## 측정 — CRTP의 효과

같은 logger를 virtual과 CRTP로 비교합니다(ARM Cortex-M4, `-O2`).

```text
# Virtual
class Logger { virtual void log_impl(const char*); };
class UartLogger : public Logger { void log_impl(...) override; };

uart_logger.log("hello");
# 어셈블리:
ldr     r3, [r0]         ; vptr 로드
ldr     r3, [r3, #4]     ; vtable에서 log_impl 주소
blx     r3               ; 간접 호출

# vtable 크기: 12 B (Logger)
# vptr: 4 B (UartLogger 인스턴스마다)

# CRTP
template<typename D> class LoggerBase { void log(...); };
class UartLogger : public LoggerBase<UartLogger> { void log_impl(...); };

uart_logger.log("hello");
# 어셈블리:
bl      UartLogger::log_impl   ; 직접 호출 — 인라인 가능

# vtable: 0
# vptr: 0
```

객체당 4 B, 클래스당 12 B를 절약합니다. 100 객체 50 클래스 기준이면 1000 B가 절약되며, 작은 차이지만 극소형 MCU에서는 의미가 있습니다.

## CRTP의 실용과 과용

다음과 같은 경우에 권장합니다.
- 공통 utility에 다양한 구현이 붙는 경우(driver, logger).
- 비교나 산술 같은 operator generation.
- 독립 기능을 조합하는 mixin.

다음과 같은 경우에는 피합니다.
- 간단한 함수 한두 개라면 그냥 함수로 둡니다.
- plug-in 시스템처럼 런타임 확장이 필요하면 virtual을 씁니다.
- 외부 라이브러리 인터페이스는 사용자 친화적이지 않으므로 피합니다.

## 정리

- CRTP는 template 기반 다형성으로, virtual 없이 컴파일 타임에 dispatch합니다.
- vptr, vtable, 간접 호출이 모두 0이고 인라인도 가능합니다.
- 임베디드에서는 peripheral driver, logger, mixin 패턴에 적합합니다.
- 런타임에 type을 결정할 수는 없고 컴파일 타임에 닫힌 set만 다룹니다.
- C++20 concepts와 함께 쓰면 interface가 명확해집니다.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)
- [Part 2-09: Type Traits](/blog/embedded/embedded-cpp/part2-09-type-traits) — SFINAE 결합
- [Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — CRTP 명확화
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction) — CRTP peripheral
- GoF 21: Strategy — virtual vs CRTP

## 다음 글

[Part 2-09: Type Traits 활용](/blog/embedded/embedded-cpp/part2-09-type-traits) — `std::is_*`, `std::enable_if`, SFINAE로 컴파일 타임 type 분기를 다룹니다.
