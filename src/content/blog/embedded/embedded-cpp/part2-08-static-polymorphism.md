---
title: "CRTP 패턴 분석 — vtable 없는 정적 다형성"
slug: "embedded/embedded-cpp/part2-08-static-polymorphism"
date: 2026-04-29T09:16:00
description: "Curiously Recurring Template Pattern — virtual 함수 없이 컴파일 타임 다형성. vtable 0, 간접 호출 0."
series: "Embedded C++ for Real Systems"
seriesOrder: 16
tags: [cpp, embedded, crtp, polymorphism, virtual, zero-cost]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"CRTP는 template을 통한 다형성."** — virtual 함수 없이 컴파일 타임에 dispatch를 결정합니다.

## 어떤 문제를 푸는가

런타임 다형성(virtual)에는 다음과 같은 비용이 따릅니다.

- 객체마다 vptr이 들어갑니다. 아래 `Circle`(int 멤버 하나)은 arm-none-eabi-g++ 16.2.0에서 virtual 버전이 8바이트, CRTP 버전이 4바이트였습니다(`static_assert`로 확인).
- 동적 타입을 모르면 간접 호출이 필요합니다. 컴파일러가 타입을 알면 devirtualization으로 직접 호출·인라인됩니다([Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#4-가상-함수)).
- 가상 함수 코드와 vtable이 코드 크기에 더해집니다. 쓰지 않는 가상 함수도 vtable이 참조하므로 남습니다([Part 2-07](/blog/embedded/embedded-cpp/part2-07-templates-cost#4-컴파일러가-dead-code를-제거하지-못함)).

이 비용을 피하려 할 때의 대안이 **CRTP**(Curiously Recurring Template Pattern)입니다.

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

위 `Shape` 두 버전에서 `area()`를 부르는 함수를 arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -mthumb -Os`로 컴파일한 결과입니다. virtual 쪽은 기반 참조(`const VShape&`)로, CRTP 쪽은 `const Circle&`를 받는 함수 템플릿으로 불렀습니다.

```text
00000000 <v_area(VShape const&)>:
   0:	ldr	r3, [r0, #0]       ; vptr 로드
   2:	ldr	r3, [r3, #0]       ; vtable에서 area 주소 (첫 슬롯)
   4:	bx	r3                 ; 간접 tail call

00000000 <int c_area<Circle>(Circle const&)>:
   0:	ldr	r0, [r0, #0]       ; r
   2:	muls	r0, r0             ; r * r
   4:	add.w	r0, r0, r0, lsl #1 ; * 3
   8:	bx	lr
```

측정에 쓴 `VShape`는 가상 소멸자 없이 `area()`만 가진 interface라 `area`가 vtable 첫 슬롯(offset 0)이었습니다. 위 글의 `Shape`처럼 `virtual ~Shape()`를 먼저 선언하면 소멸자 두 진입점이 앞 슬롯을 차지해 두 번째 load가 `ldr r3, [r3, #8]`이 됩니다. 어느 쪽이든 virtual 쪽은 메모리 load 두 번과 간접 분기로 `area`를 찾아가고, 본문은 다른 함수에 있습니다. CRTP 쪽은 `area_impl`이 인라인되어 `3 * r * r` 계산이 호출자 안에 들어왔습니다.

## CRTP vs virtual — 비교

호출 흐름의 차이부터 보면 다음과 같습니다. virtual은 vptr → vtable → 함수까지 두 단계의 메모리 indirection을 거치지만, CRTP는 컴파일 타임에 derived 구현을 선택하며 인라인 여부는 최적화에 달립니다. 그림은 전형적인 간접 호출 경로를 보여 주며 devirtualization은 생략했습니다.

![CRTP vs virtual dispatch — indirection 단계 비교](/images/blog/embedded-cpp/diagrams/part2-08-crtp-vs-virtual.svg)

| | virtual | CRTP |
| --- | --- | --- |
| Dispatch | 런타임 | 컴파일 타임 |
| vptr | 흔한 구현에서 존재, ABI별 크기 | 이 예제는 가상 함수 없음 |
| vtable | ABI·상속 구조별 | 이 예제는 가상 함수 없음 |
| 간접 호출 | 있음 | 없음 |
| Inline 가능 | devirtualization 시 가능 | 직접 호출이므로 기회 제공 |
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

`USART2`를 `SR`·`DR` 두 레지스터만 가진 구조체 포인터(`0x40004400`)로 두고 `uart.send_buffer(data, n)`을 부르는 함수를 같은 옵션으로 컴파일하면, `send_impl`이 루프 안에 인라인되어 함수 전체가 30바이트였습니다.

```text
  12:	ldrb.w	r2, [r0], #1      ; data[i] 읽고 포인터 증가
  16:	ldr	r4, [r3, #0]          ; USART2->SR
  18:	lsls	r4, r4, #24          ; TXE(bit 7)를 부호 비트로
  1a:	bpl.n	16                   ; TXE가 0이면 대기
  1c:	str	r2, [r3, #4]          ; USART2->DR = b
  1e:	b.n	c                    ; 다음 바이트
```

바이트마다 함수 호출 없이 레지스터 polling과 store만 남았습니다.

위 두 측정(`v_area`·`c_area`와 `send`)에 쓴 파일(`dispatch.cpp`)과 명령입니다.

```cpp
#include <stdint.h>
#include <stddef.h>
struct USART_TypeDef { volatile uint32_t SR, DR; };
#define USART2 ((USART_TypeDef*)0x40004400u)
constexpr uint32_t USART_SR_TXE = 1u << 7;
// virtual (측정용: 가상 소멸자 없음)
struct VShape { virtual int area() const = 0; };
struct VCircle : VShape { int r; int area() const override { return 3 * r * r; } };
int v_area(const VShape& s) { return s.area(); }
// CRTP
template<typename Derived> struct Shape { int area() const { return static_cast<const Derived*>(this)->area_impl(); } };
struct Circle : Shape<Circle> { int r; int area_impl() const { return 3 * r * r; } };
template <class S> int c_area(const S& s) { return s.area(); }
template int c_area<Circle>(const Circle&);
static_assert(sizeof(VCircle) == 8 && sizeof(Circle) == 4);
template<typename Derived>
class PeripheralBase {
public:
    void send_buffer(const uint8_t* data, size_t len) { for (size_t i = 0; i < len; ++i) derived()->send_impl(data[i]); }
private:
    Derived* derived() { return static_cast<Derived*>(this); }
};
class Uart2 : public PeripheralBase<Uart2> {
public:
    void send_impl(uint8_t b) { while (!(USART2->SR & USART_SR_TXE)); USART2->DR = b; }
};
Uart2 uart;
void send(const uint8_t* data, size_t n) { uart.send_buffer(data, n); }
```

```bash
arm-none-eabi-g++ -std=c++20 -mcpu=cortex-m4 -mthumb -Os -ffreestanding -fno-exceptions -fno-rtti -c dispatch.cpp -o d.o
arm-none-eabi-objdump -d -C --no-show-raw-insn d.o
arm-none-eabi-nm -S -C d.o
```

arm-none-eabi-g++ 16.2.0에서 `send`는 30바이트(0x1e), `v_area` 6바이트, `c_area<Circle>` 10바이트였습니다.

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
    Version(int a, int b, int c) : major(a), minor(b), patch(c) {}

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

구현이 빠지면 오류가 Base 템플릿 안에서 납니다. 아래 `Driver` 예에서 `init_impl()`이 없는 `Missing`의 `init()`을 부르면 g++-16은 `static_assert` 메시지 다음에 `error: 'struct Missing' has no member named 'init_impl'`을 Base의 `static_cast` 줄에서 냅니다. `static_assert`나 concept을 Base에 두면 메시지가 사용자가 정한 문장으로 시작합니다.

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

자식이 반드시 구현해야 하는 메서드를 컴파일 타임에 강제합니다. C++20의 requires-expression을 쓰므로 `-std=c++20`이 필요합니다. `Driver<Missing>::init()`을 부르면 Clang 23.1.5는 `error: static assertion failed due to requirement 'requires (Missing d) { <<error-expression>>; }': Derived must implement init_impl`을 냈습니다. `init()`을 부르지 않으면 멤버 함수가 인스턴스화되지 않으므로 검사도 돌지 않습니다.

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
delete ptr;   // 비virtual base를 통한 다른 동적 타입 삭제: undefined behavior
```
CRTP base는 보통 stack에서 쓰거나 derived로 직접 사용합니다. base pointer로 소유하는 패턴은 피해야 합니다. 보호된 base 소멸자로 base를 통한 삭제와 slicing을 차단하는 방법도 있습니다. 실제 downcast는 객체가 Derived의 base subobject인 경우에만 유효합니다.

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
CRTP base는 서로 다른 타입이라 diamond는 생기지 않지만, 두 base가 같은 이름의 멤버를 가지면 아래 [함정 3](#3-multiple-crtp-base-충돌)의 모호성 오류가 납니다. base마다 이름 공간이 겹치지 않게 설계합니다.

## C++20 concepts + CRTP

`class Good : LoggerBase<Good>`의 base를 지정할 때 Good은 아직 불완전합니다. 따라서 base 템플릿 자체에 Good의 멤버를 검사하는 concept을 걸면 올바른 구현도 거부될 수 있습니다. 제약 확인은 Derived의 정의가 완료된 뒤 호출되는 멤버로 미룹니다.

```cpp
template<typename T>
concept Logger = requires(T t, const char* msg) {
    { t.log_impl(msg) } -> std::same_as<void>;
};
template<typename Derived>
class LoggerBase {
public:
    void log(const char* msg) requires Logger<Derived> {
        static_cast<Derived*>(this)->log_impl(msg);
    }
protected:
    ~LoggerBase() = default;
};
```

`<concepts>`가 필요합니다. 잘못된 Derived를 정의하는 것만으로는 오류가 나지 않고, 이 제약 멤버를 호출할 때 거부됩니다. 정의가 완료된 지점의 `static_assert(Logger<Good>)`로 별도 검증할 수도 있습니다.

반대로 제약을 base 템플릿 자체(`template<Logger Derived> class LoggerBase`)에 걸면, `log_impl`을 올바르게 구현한 `class Good : public LoggerBase<Good>`도 거부됩니다. base를 지정하는 시점에 `Good`이 아직 불완전하기 때문입니다. g++-16은 `error: template constraint failure for 'template<class Derived> requires Logger<Derived> class LoggerBase'`, Clang 23.1.5는 `error: constraints not satisfied for class template 'LoggerBase' [with Derived = Good]`였습니다.

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
    virtual void method() { /* */ }   // 런타임 다형성과 정적 구현 공유를 함께 쓰는 설계
};
```
CRTP와 virtual을 함께 사용할 수는 있습니다. 그 경우 런타임 다형성 비용도 남으므로 각 계층의 목적을 구분합니다.

### 3. Multiple CRTP base 충돌
```cpp
template<typename D> struct A { void foo(); };
template<typename D> struct B { void foo(); };
class C : public A<C>, public B<C> {};
C c;
c.foo();   // ERROR — A::foo와 B::foo 충돌
```
g++-16은 `error: request for member 'foo' is ambiguous`, Clang 23.1.5는 `error: member 'foo' found in multiple base classes of different types`를 냅니다. `c.A<C>::foo()`처럼 명시적으로 호출합니다.

### 4. CRTP 외부 인터페이스 불일치
서로 다른 CRTP 인스턴스를 같은 함수에서 받기가 어렵습니다. concept이나 type erasure를 사용합니다.

### 5. Sizeof 증가
CRTP base가 멤버를 가지면 Concrete가 그만큼 커집니다. 멤버가 없는 base는 Empty Base Optimization으로 0바이트를 차지합니다. 위 CRTP `Circle`(빈 `Shape<Circle>` + `int`)이 4바이트였던 것이 그 결과입니다. 데이터 멤버가 없는 standard-layout 클래스의 base subobject는 크기가 0이라고 표준이 정합니다([intro.object]/8).

## 작은 예제 — 올바른 downcast와 base 소유 차단

base를 독립 객체로 만들거나 삭제하는 경로를 막고, 완성된 구현을 정상 호출합니다.

```cpp title="crtp-check.cpp"
#include <cassert>
#include <concepts>
template<class T> concept Logger = requires(T& t) {
    { t.log_impl() } -> std::same_as<void>;
};
template<class D> class LoggerBase {
    friend D;
    LoggerBase() = default;
    ~LoggerBase() = default;
public:
    void log() requires Logger<D> { static_cast<D*>(this)->log_impl(); }
};
struct Counter : LoggerBase<Counter> {
    int n=0;
    void log_impl() { ++n; }
};
static_assert(Logger<Counter>);
int main() {
    Counter c; c.log(); assert(c.n==1);
#ifdef BAD_BASE
    LoggerBase<Counter> bare;
#endif
#ifdef BAD_DELETE
    LoggerBase<Counter>* p = &c; delete p;
#endif
}
```

Homebrew Clang 23.1.5, arm64 macOS에서 `clang++ -std=c++20 -Wall -Wextra -pedantic-errors crtp-check.cpp -o crtp-check && ./crtp-check`가 exit 0이었습니다. `-DBAD_BASE`는 `error: calling a private constructor of class 'LoggerBase<Counter>'`, `-DBAD_DELETE`는 `error: calling a private destructor of class 'LoggerBase<Counter>'`로 거부됩니다.

[표준의 삭제 규칙](https://eel.is/c++draft/expr.delete)과 [제약 만족도 규칙](https://eel.is/c++draft/temp.constr.atomic)을 참고합니다.

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
- 이 글의 예에서 vptr(객체 8 → 4바이트), vtable, 간접 호출이 사라지고 구현이 호출자에 인라인됐습니다.
- 임베디드에서는 peripheral driver, logger, mixin 패턴에 적합합니다.
- 런타임에 type을 결정할 수는 없고 컴파일 타임에 닫힌 set만 다룹니다.
- C++20 concepts와 함께 쓰면 interface가 명확해집니다.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)
- [Part 2-09: Type Traits](/blog/embedded/embedded-cpp/part2-09-type-traits) — SFINAE 결합
- [Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — CRTP 명확화
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction) — concept 기반 peripheral 인터페이스

## 다음 글

[Part 2-09: Type Traits 활용](/blog/embedded/embedded-cpp/part2-09-type-traits) — `std::is_*`, `std::enable_if`, SFINAE로 컴파일 타임 type 분기를 다룹니다.
