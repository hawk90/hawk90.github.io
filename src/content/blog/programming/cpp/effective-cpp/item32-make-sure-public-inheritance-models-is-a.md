---
title: "항목 32: public 상속은 'is-a'를 모델링해야 한다"
date: 2026-05-04T08:00:00
description: "Liskov Substitution Principle — derived는 base가 쓰이는 모든 곳에서 동작해야. 직관적 분류와 LSP의 충돌."
tags: [C++, Effective C++, Inheritance, LSP]
series: "Effective C++"
seriesOrder: 32
draft: true
---

## 왜 이 항목이 중요한가?

`class D : public B`는 단순히 코드 재사용이 아니다. **"D는 B의 일종(is-a)이다"** 라는 강한 의미적 약속이다. 더 정확히는 **Liskov Substitution Principle(LSP)** — base가 쓰이는 모든 곳에서 derived가 동작해야 한다.

자연어 분류는 종종 이 원칙을 어긴다.

- **펭귄은 새다, 그런데 날지 못한다** — `Bird::fly()`를 상속하면 LSP 위반.
- **정사각형은 직사각형이다, 그런데 너비와 높이가 독립적이지 않다** — `Rectangle::setWidth()` 호출 후 invariant가 깨진다.

이런 케이스에선 public 상속이 답이 아니다. **composition** 또는 **private 상속**으로 모델링해야 한다. 이 항목은 LSP의 함정 사례와 대안 패턴을 정리한다.

## 개요

`class D : public B`는 **"D는 B의 일종이다"(is-a)** 를 의미한다. 더 정확히는 **B의 객체가 쓰이는 모든 곳에서 D의 객체로 대체 가능**해야 한다(Liskov Substitution Principle). 자연어 분류는 종종 이 원칙을 깨뜨린다. 이 항목은 LSP의 함정 사례(펭귄, 정사각형)와 올바른 모델링 도구(composition, private 상속)를 다룬다.

## 필수 개념: Liskov Substitution Principle

> **초보자를 위한 배경 지식**

<br>

Barbara Liskov가 1987년 제안한 원칙:

> "T 타입에 대해 증명된 어떤 속성도 S 타입에 대해 성립해야 한다. 단, S는 T의 서브타입이다."

C++에서:

```cpp
void useBase(Base& b) {
    // base의 어떤 계약을 사용 — pre/post/invariant
    b.method();
}

Derived d;
useBase(d);     // ← LSP: d가 Base의 계약을 모두 만족해야
```

**계약**은 단순한 시그니처 일치 이상:
- **사전 조건(pre)**: derived가 더 강한 사전 조건 요구 X
- **사후 조건(post)**: derived가 더 약한 사후 조건 보장 X
- **불변식(invariant)**: derived도 base의 불변식 모두 만족

## 함정 1 — 펭귄과 새

자연어:
> "펭귄은 새다. 새는 난다. 따라서 펭귄은 난다... 아니, 펭귄은 못 난다."

C++로:

```cpp
class Bird {
public:
    virtual void fly();      // 새는 난다
};

class Penguin : public Bird {     // 펭귄은 새다
    void fly() override {
        throw std::logic_error("penguins can't fly");
    }
};

void migrate(Bird& b) {
    b.fly();      // Bird를 받으면 날린다 — 합리적 기대
}

Penguin p;
migrate(p);       // 런타임 에러
```

**LSP 위반**: `migrate`는 `Bird`의 합리적 계약(날 수 있음)을 사용. `Penguin`이 그 계약을 깸 → derived가 base 대체 불가.

### 해결 — 분류 자체 재고

```cpp
class Bird {
public:
    virtual ~Bird() = default;
    // fly 안 둠 — 모든 새가 나는 건 아님
};

class FlyingBird : public Bird {
public:
    virtual void fly();
};

class NonFlyingBird : public Bird {
    // fly 없음
};

class Eagle    : public FlyingBird {};
class Penguin  : public NonFlyingBird {};
```

`migrate`는 `FlyingBird&`를 받음 — 컴파일러가 `Penguin` 전달을 차단.

## 함정 2 — 정사각형과 직사각형

수학적으로:
> "정사각형은 직사각형의 특수한 경우."

C++로:

```cpp
class Rectangle {
public:
    virtual void setWidth(int w)  { width = w; }
    virtual void setHeight(int h) { height = h; }
    int getWidth()  const { return width; }
    int getHeight() const { return height; }
private:
    int width, height;
};

class Square : public Rectangle {
public:
    void setWidth(int w) override  { width = height = w; }     // 정사각형 유지
    void setHeight(int h) override { width = height = h; }
};

void makeBigger(Rectangle& r) {
    int oldHeight = r.getHeight();
    r.setWidth(r.getWidth() + 10);
    assert(r.getHeight() == oldHeight);    // ⚠️ Square엔 깨짐!
}
```

**LSP 위반**:
- `Rectangle`의 계약: "setWidth는 width만 변경"
- `Square`는 setWidth가 height도 변경 → 계약 깸

`makeBigger`가 `Rectangle&`를 받지만 `Square`를 넘기면 assertion 실패.

**핵심**: 수학적 IS-A ≠ 객체 지향 IS-A. 객체 지향에선 "**계약 호환**"이 IS-A.

### 해결 — 가변성 제거 또는 별도 계층

```cpp
// 옵션 1: 불변 객체 — 변경 자체 없으면 Square⊂Rectangle OK
class Rectangle {
public:
    Rectangle(int w, int h) : width(w), height(h) {}
    int getWidth() const;
    int getHeight() const;
    // setter 없음 — 불변
};

class Square : public Rectangle {
public:
    Square(int s) : Rectangle(s, s) {}     // 한 번 생성, 변경 X
};
```

옛 Java 패턴 — 불변 객체로 LSP 충돌 회피.

```cpp
// 옵션 2: 별도 계층
class Shape { public: virtual double area() const = 0; };
class Rectangle : public Shape { /* width, height */ };
class Square    : public Shape { /* side만 */ };
```

상속 관계 자체를 끊고 형제로.

## 함정 3 — 동물의 행동

```cpp
class Animal {
public:
    virtual void makeSound();
};

class Cat : public Animal {
    void makeSound() override { /* meow */ }
};

class Mute : public Animal {
    void makeSound() override {}     // 아무 소리 안 냄
};
```

`Mute`도 LSP 의문 — "Animal은 소리를 낸다"는 계약을 비어 있는 구현으로 깨뜨림. 사용 컨텍스트에 따라 OK일 수도(소리 안 내는 것도 합법) 아닐 수도(반드시 소리가 나야 하는 코드).

LSP는 **인터페이스의 계약 명시**가 우선. 계약이 느슨하면 다양한 derived 허용, 엄격하면 제한.

## IS-A 가 아닌 관계 — 다른 도구

### HAS-A (composition)

```cpp
class Address { /* 주소 데이터 */ };

class Person {
    Address address_;     // Person이 Address를 갖고 있음
};
```

"사람은 주소를 갖는다" — IS-A가 아닌 HAS-A. **멤버로 보유**(composition).

### IS-IMPLEMENTED-IN-TERMS-OF

```cpp
template<typename T>
class Stack {
private:
    std::vector<T> items;     // Stack은 vector를 사용해 구현됨
public:
    void push(const T& x) { items.push_back(x); }
    void pop()            { items.pop_back(); }
};
```

"스택은 벡터로 구현된다" — IS-A가 아닌 "구현 수단". **composition** 또는 **private 상속**(항목 38, 39).

```cpp
// private 상속도 가능
class Stack : private std::vector<int> {
public:
    using std::vector<int>::push_back;
    using std::vector<int>::pop_back;
};
```

private 상속은 인터페이스 상속 X, 구현만. 사용자에겐 vector의 멤버가 보이지 않음.

## LSP 위반의 신호 — `dynamic_cast` 또는 `if/switch`

```cpp
void process(Animal* a) {
    if (auto* c = dynamic_cast<Cat*>(a)) {
        // Cat specific
    } else if (auto* d = dynamic_cast<Dog*>(a)) {
        // Dog specific
    }
}
```

base 인터페이스로 처리할 수 없어 down-cast를 함 — LSP 위반의 신호일 수 있음. 적절한 가상 함수 추가나 인터페이스 재설계가 필요.

## final로 LSP 보장 일부

```cpp
class FlyingBird {
public:
    virtual void fly() final;     // derived가 재정의 못 함
};
```

`final`로 메서드/클래스를 잠그면 — derived가 계약을 깨기 어려움. 그러나 LSP는 **계약 일관성**이 핵심 — final은 도구일 뿐 본질이 아님.

## 인터페이스 vs 구현 상속 — 항목 34와의 연결

LSP는 주로 **인터페이스의 계약**에 대한 것. pure virtual로 인터페이스만 상속하면 derived가 자유롭게 구현 — 단 계약은 지켜야.

```cpp
class Drawable {
public:
    virtual void draw() const = 0;
    // 계약: 화면에 자기 자신을 그린다 (state 변경 없음)
};

class Circle : public Drawable {
public:
    void draw() const override { /* 원 그리기 */ }
};
```

`Circle::draw`가 객체 상태를 바꾸면 — `const` 위반 + 계약 위반.

## 모던 변형 — C++20 concepts + LSP

```cpp
template<typename T>
concept FlyingThing = requires(T t) {
    { t.fly() } -> std::same_as<void>;
};

void migrate(FlyingThing auto& thing) {
    thing.fly();
}

migrate(eagle);      // OK
migrate(penguin);    // ❌ 컴파일 에러 — Penguin은 fly() 없음
```

concepts로 인터페이스 계약을 **컴파일 타임**에 검증. 런타임 LSP 위반(throw)을 컴파일 에러로 바꿀 수 있음.

## 흔한 함정 — 상속을 코드 재사용으로

```cpp
class StringList : public std::list<std::string> {
    // 상속해서 list 기능 가져옴 + 약간의 추가 메서드
};
```

`std::list`는 다형성 base로 설계되지 않음 — non-virtual 소멸자. 또한 IS-A 의미가 아님(StringList는 list의 종이 아니라, list로 구현된 것).

해결: composition (멤버로 list) 또는 private 상속.

## 실무 가이드 — LSP 점검 질문

상속 관계를 만들 때 자문:

1. "Derived는 정말 Base의 일종(specialization)인가?"
2. "Base를 받는 모든 함수에 Derived를 넘겨도 작동하는가?"
3. "Base의 사전/사후 조건을 Derived가 강화/약화하는가?"
4. "Base의 불변식을 Derived가 깰 가능성이 있는가?"

답이 No 또는 모호하면 — composition 또는 private 상속 검토.

## 실무 가이드 — 체크리스트

- [ ] derived가 base의 **모든 인터페이스**를 의미적으로 만족하는가?
- [ ] base의 사전 조건을 derived가 강화하지 않는가?
- [ ] base의 사후 조건을 derived가 약화하지 않는가?
- [ ] base의 불변식을 derived가 항상 유지하는가?
- [ ] HAS-A 또는 IS-IMPLEMENTED-IN-TERMS-OF면 → composition 또는 private 상속
- [ ] 다운캐스트(`dynamic_cast`)가 자주 등장한다면 LSP 위반 의심

## 핵심 정리

1. **public 상속 = IS-A = LSP** — derived는 base를 모든 곳에서 대체 가능해야
2. **자연어 분류는 LSP와 종종 충돌** — 펭귄, 정사각형
3. **계약**은 시그니처 + pre/post/invariant — derived가 모두 만족
4. **HAS-A**는 composition, **IS-IMPLEMENTED-IN-TERMS-OF**는 composition/private 상속
5. `dynamic_cast` 남용은 LSP 위반의 신호 — 인터페이스 재설계
6. C++20 **concepts**로 일부 계약을 컴파일 타임 검증

## 관련 항목

- [항목 33: 상속된 이름 가리기 X](/blog/programming/cpp/effective-cpp/item33-avoid-hiding-inherited-names) — 인터페이스 보존
- [항목 34: 인터페이스 vs 구현 상속](/blog/programming/cpp/effective-cpp/item34-differentiate-between-inheritance-of-interface-and-inheritance-of-implementation) — virtual 종류와 계약
- [항목 38: composition](/blog/programming/cpp/effective-cpp/item38-model-has-a-or-implemented-in-terms-of-through-composition) — HAS-A의 도구
- [항목 39: private 상속](/blog/programming/cpp/effective-cpp/item39-use-private-inheritance-judiciously) — IS-IMPLEMENTED-IN-TERMS-OF
