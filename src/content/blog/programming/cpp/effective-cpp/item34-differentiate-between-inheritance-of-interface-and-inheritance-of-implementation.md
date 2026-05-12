---
title: "항목 34: 인터페이스 상속과 구현 상속을 구분하라"
date: 2025-02-06T12:00:00
description: "pure virtual / simple virtual / non-virtual — base가 derived에 무엇을 강제·제공하는지의 차이."
tags: [C++, Effective C++, Inheritance, Virtual]
series: "Effective C++"
seriesOrder: 34
---

## 개요

C++의 멤버 함수는 base 클래스가 derived에 무엇을 강제하고 무엇을 제공하는지에 따라 세 가지 의도를 표현합니다:

- **pure virtual** — "인터페이스만" 상속, 구현은 derived가 반드시 제공
- **simple virtual** — 인터페이스 상속 + 기본 구현 제공, derived가 선택적으로 override
- **non-virtual** — 인터페이스 상속 + **강제된 구현**(모든 derived가 동일)

각 의도를 잘못된 종류로 표현하면 — 깜빡 잊은 override, 의도치 않은 기본 동작 호출, 불일치 등 함정이 생깁니다.

## pure virtual — 인터페이스만

```cpp
class Shape {
public:
    virtual void draw() const = 0;        // = 0 — pure virtual
    virtual double area() const = 0;
};
```

**의미**: "모든 Shape은 draw와 area를 가진다 — **어떻게**는 너희가 정해라."

- 추상 클래스 — 인스턴스화 불가
- derived는 반드시 구현 (또는 자신도 추상 유지)

```cpp
class Circle : public Shape {
    double radius;
public:
    void draw() const override { /* 원 그리기 */ }
    double area() const override { return M_PI * radius * radius; }
};

Shape s;     // ❌ 추상 클래스
Circle c;    // ✅
```

### pure virtual에도 본문 둘 수 있다

```cpp
class Shape {
public:
    virtual void draw() const = 0;
};

void Shape::draw() const {     // 본문 정의
    // 모든 도형 공통 사전 처리 (예: 좌표 검증, 로깅)
}

class Circle : public Shape {
public:
    void draw() const override {
        Shape::draw();         // 명시적 호출 — 사전 처리 재사용
        // 원 그리기 코드
    }
};
```

**왜 유용한가**: 모든 derived가 호출할 수 있는 **공통 사전 처리**를 base에 두고 싶을 때. derived가 자기 구현 안에서 명시적으로 호출.

## simple virtual — 인터페이스 + 기본 구현

```cpp
class Airplane {
public:
    virtual void fly(const Airport& dest) {
        // 기본 비행 로직
        std::cout << "Flying to " << dest << " using default logic\n";
    }
};

class ModelC : public Airplane {
    // fly 재정의 X → 기본 사용
};

class ModelX : public Airplane {
public:
    void fly(const Airport& dest) override {
        // ModelX 전용 로직
    }
};
```

**의미**: "모든 Airplane은 fly를 가진다 — 기본 동작은 제공, 다르게 하고 싶으면 override."

장점: 새 derived가 별 신경 안 쓰고 기본 동작 사용.
단점: derived 작성자가 **깜빡 잊고 override 안 하면** base 동작이 의도치 않게 호출.

### 함정 — 의도치 않은 기본 동작

```cpp
class ModelE : public Airplane {
    // fly override 안 함 — 의도? 실수?
    // Airplane의 기본 fly가 호출됨 — ModelE에 안 맞아도 그냥 작동
};

// 사용자 — 진짜 ModelE에 맞는 fly인지 검증할 수 없음
```

base의 fly 본문이 "**ModelA를 위한 코드**"였다면 ModelE는 잘못된 동작을 침묵하게 수행.

### 안전 패턴 — pure virtual + 기본 함수 분리

```cpp
class Airplane {
public:
    virtual void fly(const Airport&) = 0;     // pure — 강제 구현
protected:
    void defaultFly(const Airport& dest) {     // 기본 동작 (이름이 다름)
        // 기본 비행 로직
    }
};

class ModelC : public Airplane {
public:
    void fly(const Airport& dest) override {
        defaultFly(dest);          // ← 의식적 선택
    }
};

class ModelX : public Airplane {
public:
    void fly(const Airport& dest) override {
        // 다른 동작
    }
};

class ModelE : public Airplane {
    // fly override 안 하면 — 컴파일 에러 (추상 클래스 인스턴스화)
    // → 깜빡 잊을 수 없음
};
```

derived가 **명시적으로** 기본 동작 사용 또는 새 구현 작성. "기본 동작이 있다"는 사실이 인터페이스에 드러남.

## non-virtual — 강제된 구현

```cpp
class Shape {
public:
    int objectID() const {     // non-virtual
        return id_;
    }
private:
    int id_;
};
```

**의미**: "모든 Shape은 같은 방식으로 objectID를 계산한다 — derived가 바꿀 수 없음."

- 정적 바인딩 — 컴파일 타임에 결정
- derived가 재정의 시도하면 — name hiding(항목 33) + LSP 위반 위험(항목 36)

```cpp
class Circle : public Shape {
public:
    int objectID() const { /* 재정의? */ }     // ⚠️ 함정 — 다음 항목 36에서 자세히
};
```

## 세 종류의 표현 — 도식

```
class Base {
public:
    virtual void f1() = 0;      // 인터페이스만 — derived 강제
    virtual void f2();          // 인터페이스 + 기본 구현 — derived 선택
    void f3();                  // 인터페이스 + 강제된 동작 — derived 변경 X
};
```

각 함수는 **derived 작성자에게 다른 의무**를 부과:

| 종류 | derived 의무 | 동작 |
| --- | --- | --- |
| pure virtual | 반드시 정의 | 다형적 (런타임 디스패치) |
| simple virtual | 선택적 (default 동작 받기 가능) | 다형적 |
| non-virtual | 재정의 금지 | 정적 (컴파일 타임 바인딩) |

## 흔한 실수

### 1) 모든 함수를 non-virtual

```cpp
class Vehicle {
public:
    void start();           // ⚠️ 차종마다 다른 시동 방식인데 non-virtual
    void stop();
};

class Car : public Vehicle {
public:
    void start();           // base 가림 — 정적 바인딩
};

Vehicle* v = new Car;
v->start();                 // ⚠️ Vehicle::start 호출 (의도와 다름)
```

다형성을 활용하지 못함. 어떤 함수가 정말 다형적이어야 하는지 검토 필요.

### 2) 모든 함수를 virtual

```cpp
class Point {
public:
    virtual int getX() const;        // ⚠️ 의미 없는 가상
    virtual int getY() const;
    virtual ~Point();
};
```

작은 값 타입에 가상 함수 — vtable 비용 + 인라인 못 함. 의도가 다형성이 아니라면 non-virtual.

### 3) simple virtual의 깜빡 함정

```cpp
class Animal {
public:
    virtual void makeSound() { /* 기본: 침묵 */ }
};

class Cat : public Animal {
public:
    void makeSound() override { /* meow */ }
};

class Dog : public Animal {
    // makeSound override 깜빡 — 침묵하는 개?
};
```

해결: pure virtual + 명시적 default 함수.

## 인터페이스 vs 구현 상속의 의미

인터페이스 상속 — derived가 **base의 인터페이스(시그니처, 계약)** 를 갖음. pure virtual.
구현 상속 — derived가 **base의 코드**를 함께 받음. simple virtual + non-virtual.

```cpp
class Stack : private std::vector<int> {     // private 상속 — 구현만
public:
    using std::vector<int>::push_back;     // 인터페이스 일부 노출
    using std::vector<int>::pop_back;
};
```

private 상속(항목 39)은 인터페이스 상속 없이 **구현만** 얻는 방식.

## 모던 변형 — `override`와 `final`

```cpp
class Derived : public Base {
public:
    void f() override;          // override 명시 — base에 있는지 검증
    void g() override final;    // 더 이상 재정의 금지
};

class Final final : public Base {     // 클래스 자체 final
};
```

`override`: 재정의 의도 명시 + 검증.
`final`: 더 이상의 재정의 차단.

이 두 키워드로 인터페이스/구현 상속 의도를 명시적으로 표현.

## 표준 라이브러리의 패턴

```cpp
// std::ostream — 다형성 hierarchy
class basic_ostream {
public:
    virtual ~basic_ostream();        // pure virtual base는 아니지만 다형적
    basic_ostream& operator<<(int);  // non-virtual — 모든 ostream 공통
                                      //   내부에서 rdbuf()를 통해 다형적
protected:
    virtual void do_format();         // hook — derived가 override
};
```

표준 라이브러리는 **공개 인터페이스는 non-virtual + 내부 hook이 virtual** (NVI 패턴, 항목 35).

## 실무 가이드 — 결정

```
이 함수는 derived에게 어떤 자유를 줄 것인가?
├── 인터페이스만, 구현은 derived가 — pure virtual (= 0)
├── 기본 구현 제공 + 선택적 변경 — simple virtual
│   └── 깜빡 위험 검토 → 안전하면 OK, 그렇지 않으면 pure + default 함수
├── 모든 derived가 동일 동작 — non-virtual
└── 다형성 자체가 필요 없으면 — non-virtual + final
```

## 실무 가이드 — 체크리스트

- [ ] 각 멤버 함수가 세 종류 중 어디인지 의식적으로 결정?
- [ ] simple virtual인데 derived가 깜빡 잊으면 위험한가? → pure + default 함수
- [ ] non-virtual에 derived가 재정의 시도할 가능성? → final 또는 문서
- [ ] pure virtual인데 본문 둘 가치 있는가? (공통 사전 처리)
- [ ] `override` 키워드로 의도 명시?

## 핵심 정리

1. **세 종류의 멤버 함수 — 세 종류의 의도**
2. **pure virtual** = "인터페이스만, 구현은 너희가 제공"
3. **simple virtual** = "기본 줄게, 필요하면 변경" — 깜빡 함정
4. **non-virtual** = "모든 derived가 동일" — 재정의 금지(항목 36)
5. simple virtual의 안전 패턴 = pure virtual + protected default 함수
6. 표준은 **non-virtual 공개 + virtual 내부**(NVI) — 항목 35

## 관련 항목

- [항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 인터페이스 계약
- [항목 33: 이름 가리기 X](/blog/programming/cpp/effective-cpp/item33-avoid-hiding-inherited-names) — 인터페이스 보존
- [항목 35: 가상 함수의 대안](/blog/programming/cpp/effective-cpp/item35-consider-alternatives-to-virtual-functions) — NVI 등 다른 방식
- [항목 36: non-virtual 재정의 금지](/blog/programming/cpp/effective-cpp/item36-never-redefine-an-inherited-non-virtual-function) — non-virtual의 약속
