---
title: "Ch 4: Classes"
date: 2025-05-13T04:00:00
description: "Constructors / Implicit Conversion / Copyable-Movable / Struct vs Class / Inheritance / Operator Overloading / Access / Declaration Order."
tags: [Google, C++, Style-Guide, Class, Inheritance]
series: "Google C++ Style"
seriesOrder: 4
draft: false
---

> 클래스 = 추상화의 단위. Google 가이드는 — *명시성 / 단순성*을 강조.

## Doing Work in Constructors

### 규칙

> 생성자에서 — *복잡한 일 / 실패 가능 작업* 금지.

```cpp
// 회피:
class Foo {
public:
    Foo() {
        OpenFile();         // 실패 가능!
        ConnectNetwork();   // 실패 가능!
    }
};
```

이유 — *예외 없음*. 생성자 실패를 표현할 길 없음.

### 해결 — Init 메서드

```cpp
// 좋음:
class Foo {
public:
    Foo() = default;   // 단순

    absl::Status Init() {   // 실패 표현 가능
        if (!OpenFile()) return absl::FailedPreconditionError("file");
        if (!ConnectNetwork()) return absl::UnavailableError("network");
        return absl::OkStatus();
    }
};

// 사용:
Foo foo;
RETURN_IF_ERROR(foo.Init());
```

### Virtual 호출 금지

```cpp
class Base {
public:
    Base() { DoWork(); }   // 위험!
    virtual void DoWork();
};
class Derived : public Base {
public:
    void DoWork() override;
};

Derived d;   // Base의 DoWork() 호출됨! (vtable이 아직 Derived가 아님)
```

생성자 안에서 — virtual 메서드 호출 금지. (또는 명시적으로 `Base::DoWork()`)

## Implicit Conversions

### 규칙

> 단일 인자 생성자 — *`explicit`* 필수.

```cpp
// 좋음:
class MyString {
public:
    explicit MyString(const char* s);
};

// 회피:
class MyString {
public:
    MyString(const char* s);   // implicit — "암묵 변환" 허용
};
```

### 왜?

```cpp
void Process(MyString s);

// implicit 생성자가 있으면:
Process("hello");   // 자동으로 MyString 생성 — 의도?

// explicit이면:
Process("hello");        // 에러!
Process(MyString("hello"));   // OK — 명시
```

명시 변환 강제 — 실수 방지.

### `explicit` 예외

```cpp
class Vec {
public:
    Vec(int x, int y);   // 2-arg — explicit 필요 없음
};
```

다중 인자는 — implicit 변환 안 일어남 (보통).

### 변환 연산자

```cpp
class MyType {
public:
    explicit operator bool() const;   // explicit!
};
```

`if (myObj)` 형태로 — *명시적 변환*만.

## Copyable and Movable Types

### 규칙

> 명시적으로 선택. 기본은 — *복사도 이동도 안 됨*.

```cpp
class Manager {
public:
    Manager();
    ~Manager();

    // 명시적 선택:
    Manager(const Manager&) = delete;
    Manager& operator=(const Manager&) = delete;
};
```

### 패턴

```
Copyable + Movable  — 값 타입 (e.g., Point, string)
Move-only           — 자원 소유 (e.g., unique_ptr)
Non-copyable, non-movable — 싱글톤, 매니저
```

명시적으로 선택. `= default` 또는 `= delete`.

### `= default`

```cpp
class Point {
public:
    Point(double x, double y);

    Point(const Point&) = default;             // 복사 OK
    Point& operator=(const Point&) = default;
    Point(Point&&) = default;                  // 이동 OK
    Point& operator=(Point&&) = default;
};
```

명시적으로 — 의도 표시.

## Structs vs. Classes

### 규칙

```
struct — passive data carrier (POD-like)
class  — invariant / 동작 있음
```

### `struct` 예

```cpp
struct Point {
    double x;
    double y;
};
```

- 공개 멤버
- 동작 없음 (또는 trivial 생성자만)
- 불변식 없음

### `class` 예

```cpp
class Counter {
public:
    void Increment();
    int Value() const;

private:
    int value_ = 0;   // 불변식: 0 이상
};
```

- private 데이터
- 동작 있음
- 불변식 유지

## Structs vs. Pairs and Tuples

### 규칙

> 명명된 멤버 선호.

```cpp
// 회피:
std::pair<std::string, int> GetNameAndAge();
auto p = GetNameAndAge();
p.first;   // 이름?
p.second;  // 나이?

// 좋음:
struct Person {
    std::string name;
    int age;
};
Person GetPerson();
auto person = GetPerson();
person.name;
person.age;
```

`.first` / `.second` — *의미 없음*.

### `std::tuple` 회피

```cpp
// 회피:
std::tuple<std::string, int, double> GetInfo();
auto [name, age, salary] = GetInfo();   // 구조분해 — 그래도 의미 약함

// 좋음:
struct Info { std::string name; int age; double salary; };
Info GetInfo();
```

## Inheritance

### 규칙

> `public` 상속만. `is-a` 관계가 명확할 때.

```cpp
// 좋음:
class Animal { /* ... */ };
class Dog : public Animal { /* ... */ };   // Dog is-a Animal
```

### `private` / `protected` 상속 — 회피

```cpp
class Foo : private Bar { ... };   // 회피
```

대신 — *합성 (composition)*.

```cpp
class Foo {
private:
    Bar bar_;   // 합성
};
```

### `override` / `final`

```cpp
class Base {
public:
    virtual void Method();
};
class Derived : public Base {
public:
    void Method() override;        // 필수
    void Other() final;            // 더 이상 override 안 됨
};
```

`virtual` + `override` — 한 번에 표기 (작성 시 `virtual ... override` 또는 `override` 단독).

### 다중 상속 — 인터페이스만

```cpp
// 좋음 — 모든 base가 — pure interface:
class Drawable {
public:
    virtual void Draw() = 0;
    virtual ~Drawable() = default;
};
class Serializable {
public:
    virtual void Serialize() = 0;
    virtual ~Serializable() = default;
};
class Widget : public Drawable, public Serializable { /* ... */ };

// 회피 — 구체 클래스 다중:
class Widget : public ConcreteA, public ConcreteB { ... };   // 회피
```

## Operator Overloading

### 규칙

> 신중히. *의미가 명확*할 때만.

```cpp
// 좋음 — 의미 명확:
class Vector {
public:
    Vector operator+(const Vector& other) const;
    bool operator==(const Vector& other) const;
};
```

### 회피 사례

```cpp
// 회피:
class HashMap {
public:
    HashMap& operator,(const Pair& p);   // 쉼표 연산자 — 의미 불명
    bool operator&&(const HashMap& other);   // && — 의미 불명
};
```

### Symmetry

```cpp
// 좋음 — symmetric:
bool operator==(const A& lhs, const A& rhs);
bool operator!=(const A& lhs, const A& rhs);   // 짝
```

C++20의 `<=>` (spaceship)를 — 가능하면 사용.

## Access Control

### 규칙

> 데이터 멤버 — `private`. 필요 시 접근자.

```cpp
class Foo {
public:
    int GetValue() const { return value_; }
    void SetValue(int v) { value_ = v; }

private:
    int value_;
};
```

### `struct`의 예외

`struct`는 — 모두 `public`.

```cpp
struct Point {
    double x;   // public OK
    double y;
};
```

### `protected` 데이터 — 회피

```cpp
class Base {
protected:
    int data_;   // 회피
};
```

`protected` 접근자 — 더 좋음.

## Declaration Order

### 규칙

```cpp
class Foo {
public:
    // 1. Types and type aliases (typedef, using, enum)
    using Iterator = ...;
    enum Color { RED, BLUE };

    // 2. Static constants
    static constexpr int kMax = 100;

    // 3. Factory functions
    static Foo Create(...);

    // 4. Constructors, destructor, assignment
    Foo();
    Foo(const Foo&) = default;
    ~Foo();

    // 5. Member functions
    void DoWork();
    int GetValue() const;

protected:
    // 같은 순서

private:
    // 같은 순서

    // 6. Data members (마지막)
    int value_;
};
```

순서 — 모든 클래스에서 일관성.

## 정리

- **생성자** — 단순하게, 실패 작업은 Init으로
- **`explicit`** — 단일 인자 생성자
- **Copy/Move** — 명시적 선택
- **struct vs class** — passive 데이터 vs 동작
- **명명된 멤버** > pair/tuple
- **public 상속만**, 다중 상속은 인터페이스만
- **operator overloading** — 신중히
- **데이터는 private**
- **선언 순서** — public/protected/private, 그 안에서 일관

## 다음 장 예고

다음 — **Functions**. 입출력, 길이, 오버로딩.

## 관련 항목

- [Ch 3: Scoping](/blog/embedded/standards/google-cpp/chapter03-scoping)
- [Ch 5: Functions](/blog/embedded/standards/google-cpp/chapter05-functions)
