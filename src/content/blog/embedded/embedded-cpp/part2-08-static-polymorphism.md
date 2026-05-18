---
title: "Part 2-08: Static Polymorphism (CRTP)"
date: 2026-05-14T08:00:00
description: "Curiously Recurring Template Pattern — virtual 함수 없이 컴파일 타임 다형성. vtable 0, 간접 호출 0."
series: "Embedded C++ for Real Systems"
seriesOrder: 16
tags: [cpp, embedded, crtp, polymorphism, virtual, zero-cost]
type: tech
---

## 한 줄 요약

> **"CRTP는 *templates를 통한 다형성*."** — virtual 함수 없이 *컴파일 타임에 dispatch 결정*.

## 어떤 문제를 푸는가

런타임 다형성(*virtual*)의 비용:

- *vtable* — 클래스당 4-N 바이트
- *vptr* — 객체당 4 바이트
- *간접 호출* — branch prediction 어려움, inline 안 됨
- *코드 크기* — 가상 함수 코드 + vtable

소규모 MCU에서 *수십 개의 다형성 객체*만으로도 *수 KB 부담*. **CRTP** (Curiously Recurring Template Pattern)가 *대안*입니다.

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

CRTP의 *마법* — `Shape<Circle>::area()`가 `static_cast<Circle*>`로 *컴파일 타임에 dispatch*. *virtual table 없이* polymorphism.

## CRTP의 구조

핵심 idiom:

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

- `Base<Derived>`가 *interface 정의*
- `Derived`가 *Base<Derived>를 상속* (자신을 template 인자로)
- Base가 *static_cast로 Derived의 method 호출*

각 *Concrete 인스턴스*는 *Base<Concrete>를 별도 인스턴스화*. *컴파일 타임에 dispatch 결정*.

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

`uart.log("hello")`의 어셈블리:

```text
# 전통 virtual
ldr     r3, [r0]         ; vptr 로드
ldr     r3, [r3]         ; vtable에서 함수 주소
blx     r3               ; 간접 호출 — branch prediction 어려움

# CRTP
bl      UartLogger::log_impl    ; 직접 호출 — 인라인 가능
```

*간접 호출 제거 + inline 가능*. 함수 작으면 *완전 인라인*.

## CRTP vs virtual — 비교

| | virtual | CRTP |
| --- | --- | --- |
| Dispatch | 런타임 | 컴파일 타임 |
| vptr | 객체당 1 (4 B) | 없음 |
| vtable | 클래스당 (N * 4 B) | 없음 |
| 간접 호출 | 있음 | 없음 |
| Inline 가능 | 거의 없음 | 자주 |
| Container 동질성 | OK (Shape*) | 제한 |
| 런타임 type 결정 | OK | 컴파일 타임만 |

CRTP의 *제약*: *런타임에 type을 결정 못 함*. *컴파일 타임에 type 알아야*.

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

CRTP는 *컴파일 타임에 type set이 닫혀 있을 때* 유리.

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

`send_buffer`의 loop 안 `send_impl`이 *인라인*. *데이터 복사 + UART 쓰기*가 *한 작은 loop*으로.

## CRTP로 mixin 패턴

여러 *독립 기능*을 *조합*. virtual base class가 아니라 *각 mixin을 CRTP*로.

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

`Version`이 *operator==와 operator<만* 구현. 나머지 비교 연산자는 `Comparable`에서 *자동*.

C++20의 `<=>` (spaceship operator)가 *같은 효과*를 제공. 단 CRTP가 *C++11부터 가능*.

## CRTP의 단점

### 1. 같은 base의 *다른 instantiation은 별개 type*

```cpp
template<typename D> struct Base {};
class A : Base<A> {};
class B : Base<B> {};

// Base<A>와 Base<B>는 다른 타입
// "Base를 받는 함수"가 자연스럽지 않음
```

해결: *concept* (C++20) 또는 *type erasure*.

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

### 2. 컴파일 에러 메시지가 *복잡*

template error의 *전형적 문제*. C++20 concepts가 *훨씬 깔끔*.

### 3. *런타임 type 결정* 불가능

plug-in 시스템, 동적 객체 생성에는 *virtual 필요*. CRTP는 *컴파일 타임 type set*.

## CRTP가 잘 맞는 *3가지 패턴*

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

자식이 *반드시 구현*해야 하는 메서드를 *컴파일 타임에 강제*.

### 2. Code sharing without runtime cost

여러 device drivers가 *같은 utility*를 사용하지만 *각자의 init/send/recv*. CRTP가 *공통 부분 한 곳, 특수 부분 자식*.

### 3. Operator generation

비교 연산자, arithmetic 연산자 등을 *자동 생성*. *boilerplate 감소*.

## CRTP 함정

### 1. *Base에서 Derived의 private member 접근*
```cpp
template<typename D>
class Base {
public:
    void foo() {
        static_cast<D*>(this)->private_method();   // ERROR
    }
};
```
해결 — `friend class Base<Derived>;` 추가 또는 *public method*.

### 2. *Derived의 destructor가 호출 안 됨*
```cpp
Base<Derived>* ptr = new Derived;
delete ptr;   // Base의 destructor만 호출 — Derived 자원 누수
```
CRTP base는 *보통 stack 또는 derived로 직접 사용*. *base pointer로 owning 금지*.

### 3. *복사 동작 무의식*
```cpp
template<typename D>
class Base {
public:
    void copy_from(const Base& other) {
        *static_cast<D*>(this) = *static_cast<const D*>(&other);
    }
};
```
*operator=가 잘 정의된 D만* 안전.

### 4. *과도한 CRTP layer*
```cpp
class Concrete : public BaseA<Concrete>, public BaseB<Concrete>, public BaseC<Concrete> {};
```
*다중 상속*. *diamond 문제*나 *이름 충돌*. 한두 layer만.

## C++20 concepts + CRTP

CRTP의 *흐릿한 interface 정의*를 *concepts로 명확화*.

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

template error message가 *명확*해짐.

## 자주 보는 함정과 안티패턴

### 1. *공허한 CRTP*
```cpp
template<typename D>
class Base {};   // 비어 있음

class Concrete : public Base<Concrete> {};
```
*기능 없음*. CRTP가 *의도된 utility 제공*해야 의미.

### 2. *CRTP base에서 virtual 사용*
```cpp
template<typename D>
class Base {
public:
    virtual void method() { /* */ }   // virtual + CRTP는 모순
};
```
*CRTP는 virtual 회피*. 의도 모호.

### 3. *Multiple CRTP base의 충돌*
```cpp
template<typename D> struct A { void foo(); };
template<typename D> struct B { void foo(); };
class C : public A<C>, public B<C> {};
C c;
c.foo();   // ERROR — A::foo와 B::foo 충돌
```
*명시적 호출*: `c.A<C>::foo()`.

### 4. *CRTP 외부 인터페이스 불일치*
서로 다른 CRTP 인스턴스를 *같은 함수에 받기* 어려움. *concept* 또는 *type erasure*.

### 5. *Sizeof 증가*
CRTP base가 *멤버를 가지면* Concrete가 *그 크기 만큼 증가*. *Empty Base Optimization*으로 *0 추가*가 일반.

## 측정 — CRTP의 효과

같은 logger를 *virtual vs CRTP*로 (ARM Cortex-M4, `-O2`).

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

*객체당 4 B + 클래스당 12 B 절약*. 100 객체 50 클래스 = *1000 B 절약*. 작은 차이지만 *극소형 MCU*에선 의미.

## CRTP의 *실용 vs 과용*

권장 사용:
- *공통 utility + 다양한 구현* — driver, logger
- *Operator generation* — comparable, arithmetic
- *Mixin* — 독립 기능 조합

피할 사용:
- *간단한 함수 한두 개* — 그냥 함수
- *plug-in 시스템* — virtual 필요
- *외부 라이브러리 인터페이스* — 사용자 친화적이지 않음

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
- [GoF 21: Strategy](/blog/programming/design/gof-design-patterns/item21-strategy) — virtual vs CRTP

## 다음 글

[Part 2-09: Type Traits 활용](/blog/embedded/embedded-cpp/part2-09-type-traits) — `std::is_*`, `std::enable_if`, SFINAE로 *컴파일 타임 type 분기*.
