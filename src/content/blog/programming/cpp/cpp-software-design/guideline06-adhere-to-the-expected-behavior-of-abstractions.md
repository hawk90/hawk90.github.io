---
title: "가이드라인 6: 추상화의 기대 동작을 준수하라"
date: 2026-05-13T16:00:00
description: "Liskov Substitution Principle. 인터페이스는 시그니처만이 아니라 의미·계약·불변식까지 포함한다는 이야기."
tags: [C++, Software Design, SOLID, LSP, Liskov]
series: "C++ Software Design"
seriesOrder: 6
draft: true
---

## 왜 이 가이드라인이 중요한가?

```cpp
class Bird {
public:
    virtual void fly() = 0;
};

class Penguin : public Bird {
public:
    void fly() override { throw std::logic_error("penguins can't fly"); }
};

void migrate(Bird& b) { b.fly(); }     // Bird를 받으면 날린다. 합리적이다.

Penguin p;
migrate(p);     // ⚠️ 런타임 에러. Penguin은 Bird를 대체할 수 없다.
```

문제는 분명하다. `Penguin`은 컴파일러 입장에서는 `Bird`의 derived이지만, 의미적으로는 `Bird`의 약속을 지키지 못한다.

이것이 **Liskov Substitution Principle(LSP)** 의 본질이다. 인터페이스는 시그니처에 의미와 계약과 불변식까지 더해진 약속이다. 시그니처만 일치한다고 진짜 derived가 되는 것은 아니다.

Iglberger는 이 가이드라인에서 "추상화의 기대 동작"이 무엇인지, 그것을 어떻게 정의하고 검증할지를 다룬다.

## 핵심 내용

- **LSP** — derived는 base가 쓰이는 모든 자리에서 동작해야 한다.
- 추상화는 **시그니처 + 의미 + 계약(pre/post condition) + 불변식**으로 구성된다.
- 컴파일러는 시그니처만 검사한다. 의미적 준수는 사람의 책임이다.
- LSP 위반의 흔한 형태는 다음과 같다.
  - `throw "not supported"`
  - 사전조건 강화(입력 범위 축소)
  - 사후조건 약화(반환 보장 축소)
  - 불변식 깨기

## 비교 — LSP 위반과 만족

### Bad — 의미적 LSP 위반

```cpp
class Rectangle {
public:
    virtual void setWidth(int w)  { width = w; }
    virtual void setHeight(int h) { height = h; }
    int getWidth()  const { return width; }
    int getHeight() const { return height; }
protected:
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
    assert(r.getHeight() == oldHeight);     // ⚠️ Square에서는 깨진다
}
```

수학적으로 보면 "Square ⊂ Rectangle"이 맞다. 그러나 변경 가능한 객체 모델에서는 `Rectangle::setWidth`가 가진 약속("width만 바꾼다")을 `Square`가 깬다. LSP 위반이다.

`makeBigger`가 `Rectangle&`를 받지만 `Square`를 넘기면 assertion이 무너진다.

### Good — 분리하거나 불변 객체로 둔다

```cpp
// 옵션 1 — Square가 Rectangle을 대체하지 않는 형제 관계로 둔다
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Rectangle : public Shape { /* ... */ };
class Square    : public Shape { /* ... */ };

// 옵션 2 — 불변 객체로 두면 변경 자체가 없으니 LSP가 깨질 일도 없다
class Rectangle {
    const int width_, height_;
public:
    Rectangle(int w, int h) : width_(w), height_(h) {}
    // setter 없음
};
class Square : public Rectangle {
public:
    explicit Square(int side) : Rectangle(side, side) {}
};
```

수학적 IS-A와 객체 지향의 IS-A는 같지 않다. 객체 지향에서 IS-A는 **계약 호환**이다.

## LSP의 형식 정의 — 네 가지 조건

Liskov와 Wing(1994)이 정리한 조건은 다음과 같다.

derived class T가 base class S를 대체할 수 있으려면 아래 네 조건을 모두 지켜야 한다.

### 1) 사전조건(precondition)을 강화하지 마라

base가 더 넓은 입력을 받는데 derived가 좁게 받으면, 호출자가 base를 기대해서 넓은 입력을 넘긴 순간 깨진다.

```cpp
class Base {
public:
    // pre: x ≥ 0
    virtual void process(int x);
};

class Derived : public Base {
public:
    // pre: x > 0  (강화됐다. 0이 제외됐다)
    void process(int x) override {
        if (x == 0) throw "invalid";     // ⚠️ Base는 0을 허용한다
    }
};

void caller(Base& b) {
    b.process(0);     // Base 기대로는 OK이지만
                      // Derived라면 throw — 깨진다
}
```

### 2) 사후조건(postcondition)을 약화하지 마라

base가 어떤 결과를 보장하는데 derived가 덜 보장하면, 호출자의 기대가 무너진다.

```cpp
class Base {
public:
    // post: 반환값은 양수다
    virtual int compute();
};

class Derived : public Base {
public:
    // post: 반환값은 정수다(양수 보장 없음) — 약화됐다
    int compute() override { return -1; }     // ⚠️ Base는 양수를 약속했다
};
```

### 3) 불변식(invariant)을 깨지 마라

base가 늘 만족시키는 불변식을 derived도 유지해야 한다.

```cpp
class Account {
public:
    // 불변식: balance ≥ 0
    virtual void withdraw(int amount);
};

class OverdraftAccount : public Account {
public:
    void withdraw(int amount) override {
        balance_ -= amount;     // ⚠️ balance가 음수가 될 수 있다. Account 불변식이 깨진다
    }
};
```

### 4) 새로운 예외를 던지지 마라

base가 던지지 않는 예외를 derived가 던지면 사용자가 처리할 길이 없다.

```cpp
class Base {
public:
    virtual void process(int x);     // 예외를 던지지 않는다
};

class Derived : public Base {
public:
    void process(int x) override {
        if (x < 0) throw std::invalid_argument("...");     // ⚠️ 새 예외
    }
};

void caller(Base& b) {
    b.process(-1);     // Base는 예외가 없을 거라고 기대 — Derived라면 잡지도 못한다
}
```

C++에서는 `noexcept` 명시로 일부를 검증할 수 있지만, 의미적 보장은 별개다.

## 시그니처만으로는 부족하다 — 의미가 본질이다

```cpp
class Collection {
public:
    virtual void add(int x);
    virtual size_t size() const;
};

class UniqueCollection : public Collection {
public:
    void add(int x) override {
        if (!contains(x)) Collection::add(x);     // 중복을 거부한다
    }
};
```

시그니처는 일치한다. 그런데 "`add` 후에는 `size()`가 항상 1 증가한다"는 암묵적 계약을 `UniqueCollection`이 깬다.

```cpp
void process(Collection& c) {
    size_t before = c.size();
    c.add(42);
    assert(c.size() == before + 1);     // ⚠️ UniqueCollection이라면 깨진다
}
```

이런 것을 **암묵적 계약(implicit contract)** 이라 부른다. 시그니처에 적혀 있지는 않지만 사용자가 기대하는 약속이다.

## 계약을 어디에 적어 둘까

```cpp
class Account {
public:
    /// Withdraws @p amount from the account.
    /// @pre  amount > 0
    /// @pre  amount <= balance()
    /// @post balance() == old.balance() - amount
    /// @throws None
    virtual void withdraw(int amount);
};
```

문서 주석으로 pre, post, throws를 명시한다. derived 작성자가 이 계약을 코드와 문서로 함께 준수한다.

도구는 다음이 있다.

- **Doxygen** `@pre @post @invariant @throws` — 표준 문서화 형식
- **`assert`** — debug 모드에서 런타임 검증
- **`static_assert`** — 컴파일 타임 검증(타입 수준)
- **C++ Contract 제안** — 표준화되면 컴파일러가 직접 검증

C++26 이후 표준에 contract가 들어올 예정이다. 그때까지는 주석과 `assert`로 보강한다.

## 불변식의 표현

```cpp
class Account {
    int balance_ = 0;
public:
    /// Invariant: balance_ >= 0

    void deposit(int amount) {
        assert(amount >= 0);
        balance_ += amount;
        assert(balance_ >= 0);     // 불변식 검증
    }

    void withdraw(int amount) {
        assert(amount >= 0);
        assert(amount <= balance_);     // 사전조건
        balance_ -= amount;
        assert(balance_ >= 0);          // 불변식이 유지되는지 검증
    }
};
```

각 public 메서드의 진입부에서 사전조건을 검증하고, 종료부에서 불변식이 유지되는지 확인한다. 표준 패턴이다.

## 함정 — 자연어식 IS-A 분류

```cpp
// 자연어: "정사각형은 직사각형이다"
//         "펭귄은 새다"
//         "구글은 회사다"
```

이런 분류는 거의 항상 LSP 위반의 위험을 안고 있다. 객체 지향의 IS-A는 자연어가 아니라 **계약 호환**이다.

매번 자문해 보자. *"Derived가 Base의 모든 약속을 지킬 수 있는가?"*

지키기 어렵다면 상속이 아니라 composition이나 형제 관계로 둔다.

## LSP와 컴파일러

C++ 컴파일러는 시그니처만 검사한다.

```cpp
class Base {
public:
    virtual int f(int);
};

class Derived : public Base {
public:
    int f(int) override;     // 시그니처가 일치하면 OK
};
```

`override` 키워드도 시그니처 검사 도구일 뿐이다. 의미적 LSP는 컴파일러의 능력 밖에 있다.

쓸 수 있는 도구는 이렇다.

- **`override`** — 시그니처 검사(오타 등을 잡는다)
- **`final`** — 추가 derived 차단
- **`assert`** — 런타임 검증

진짜 검증은 코드 리뷰와 테스트로 한다.

## C++20 concepts와 LSP

```cpp
template<typename T>
concept Drawable = requires(const T& t) {
    { t.draw() } -> std::same_as<void>;
};
```

concept은 시그니처를 명시한다. 의미적 계약은 여전히 문서와 테스트가 맡는다.

```cpp
template<typename T>
concept Account = requires(T& acc, int amount) {
    { acc.balance() } -> std::convertible_to<int>;
    { acc.deposit(amount) } -> std::same_as<void>;
    // 의미적 약속(사후조건과 불변식)은 사용자가 별도로 책임진다
};
```

C++ contract 표준이 들어오면 일부 의미도 표현할 수 있게 된다.

## 함정 — Empty override

```cpp
class Animal {
public:
    virtual void breathe();
};

class Doll : public Animal {     // ⚠️ Doll이 Animal인가?
public:
    void breathe() override {}     // 아무것도 하지 않는다 — LSP 위반
};
```

derived가 아무 동작도 하지 않음으로써 base의 약속을 회피한다. 사용자가 `breathe()`를 호출해 효과를 기대했는데 아무 일도 일어나지 않는다.

해법은 상속 관계 자체를 다시 보는 것이다. `Doll`이 `Animal`이어야 할 이유가 있는가?

## 함정 — 사후조건 약화의 미묘함

```cpp
class Container {
public:
    /// post: 반환된 iterator는 valid하다
    virtual Iterator find(int x);
};

class LazyContainer : public Container {
public:
    /// post: 반환된 iterator는 lazy하다 — 첫 접근 시 데이터를 가져온다
    Iterator find(int x) override {
        return LazyIterator{this, x};     // ⚠️ Container가 말하는 "valid"의 의미와 같은가?
    }
};
```

"valid iterator"의 정의가 base와 derived에서 다르다. 사용자가 `Container`로 받아 즉시 `*it`를 호출하면, `Container`는 즉시 데이터를 보장하지만 `LazyContainer`는 그제야 fetch한다. 사용자 입장에서 문제가 없을 수도 있지만, 타이밍 차이가 LSP 위반을 만든다.

## 함정 — Refused Bequest

derived가 base의 메서드를 "사용 안 함"이나 "의미 없음"으로 처리하는 경우다.

```cpp
class Stack {
public:
    virtual void push(int x);
    virtual int pop();
    virtual int& operator[](size_t i);     // ⚠️ Stack에 인덱스 접근?
};

class StrictStack : public Stack {
public:
    int& operator[](size_t i) override {
        throw "stack does not support random access";     // ⚠️ 거부한다
    }
};
```

이런 경우는 인터페이스 자체의 설계가 잘못된 것이다. ISP 위반과도 맞물린다.

## 깊은 메시지 — 추상화는 약속이다

추상화는 외부와 맺은 약속이다. 그 약속을 모든 derived가 지켜야 한다.

> "**An abstraction is a promise.** Every derived class must keep that promise."

이 약속은 시그니처에 의미와 계약과 불변식을 더한 묶음이다. 시그니처만 일치하는 것은 가짜 derived다.

그래서 다음이 따라온다.

1. base를 설계할 때 약속을 코드와 문서로 명확히 둔다.
2. derived를 작성할 때 약속을 준수한다(`assert`로 검증).
3. 사용자 코드는 약속에만 의존한다. 구체 derived를 알지 못한다.

## 추상화의 네 요소

```
┌─────────────────────────────────┐
│         추상화 (Abstraction)    │
├─────────────────────────────────┤
│  1. 시그니처                    │
│     - 메서드 이름, 매개변수      │
│     - 반환 타입                 │
│     ─────────────              │
│  2. 의미                       │
│     - "이 메서드가 무엇을 하는가" │
│     ─────────────              │
│  3. 계약                       │
│     - 사전조건 (precondition)   │
│     - 사후조건 (postcondition)  │
│     - 예외 보장                │
│     ─────────────              │
│  4. 불변식                     │
│     - 객체가 항상 만족하는 조건  │
└─────────────────────────────────┘
```

derived는 이 네 요소를 모두 만족해야 진정한 LSP다.

## 실전 예 — STL iterator 계층

```
input_iterator
  └── forward_iterator
       └── bidirectional_iterator
            └── random_access_iterator
                 └── contiguous_iterator
```

각 계층이 이전 계층의 약속을 모두 만족하면서 새 능력만 더한다.

- input: `++`, `*`, `==`
- forward: + multi-pass
- bidirectional: + `--`
- random access: + `+n`, `[i]`, `<`
- contiguous: + 연속 메모리 보장

`std::sort`는 `random_access_iterator`를 요구한다. `forward_iterator`만 가진 `std::list`에는 `std::list::sort`가 따로 있다. 인터페이스가 정확히 LSP를 따른다.

## C++ 표준 라이브러리에서 보는 LSP

```cpp
std::vector<T>::iterator        // random_access
std::list<T>::iterator          // bidirectional
std::forward_list<T>::iterator  // forward

std::sort(begin, end);     // random_access 요구 — forward로 부르면 컴파일 에러
```

C++20 concepts 이전에는 에러 메시지가 깊이 들어가서 읽기 힘들었다. 이후로는 "constraint not satisfied: random_access_iterator" 같은 형태로 분명해졌다.

## 실무 가이드 — 새 derived를 작성할 때

각 메서드에서 다음을 자문하자.

- [ ] base의 사전조건을 강화하지는 않았는가?
- [ ] base의 사후조건을 약화하지는 않았는가?
- [ ] base의 불변식을 깨지는 않는가?
- [ ] base가 던지지 않는 예외를 던지지는 않는가?
- [ ] base가 `noexcept`였는데 derived가 throw 가능해지지는 않았는가?
- [ ] base 메서드의 의미를 그대로 유지하는가? (refused bequest가 아닌가)
- [ ] base의 약속을 derived 문서에도 명시했는가?

## 실무 가이드 — base를 설계할 때

- [ ] 모든 derived가 자연스럽게 만족할 수 있는 약속만 정의했는가?
- [ ] 사전조건이 지나치게 좁아 derived에 부담을 주지는 않는가?
- [ ] 사후조건이 지나치게 강해 derived가 못 지킬 가능성은 없는가?
- [ ] 불변식을 코드로 강제하고 있는가? (private 멤버 + invariant)
- [ ] `assert`로 런타임에 검증하는가?

## 정리

LSP는 derived가 base가 쓰이는 모든 자리에서 동작해야 한다는 원칙이다.

추상화의 네 요소는 다음과 같다.

1. **시그니처** — 컴파일러가 검사한다.
2. **의미** — 사람이 이해한다.
3. **계약** — 사전·사후·예외 보장.
4. **불변식** — 객체 상태에 대한 항구적 조건.

derived는 네 요소를 모두 만족해야 진정한 LSP다. 시그니처만 맞는 것은 가짜 derived다.

도구는 다음이 있다.

- `override`, `final` — 시그니처 검사
- Doxygen `@pre @post @invariant` — 계약 문서화
- `assert` — 런타임 검증
- C++ contract 제안 — 미래의 표준

## 관련 항목

- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — ISP와 LSP의 자매 관계
- [가이드라인 7: base와 concept의 유사성](/blog/programming/cpp/cpp-software-design/guideline07-understand-the-similarities-between-base-classes-and-concepts) — concept에도 LSP가 적용된다
- [Effective C++ 항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — LSP의 EC++ 버전
- [Effective C++ 항목 36: non-virtual을 재정의하지 마라](/blog/programming/cpp/effective-cpp/item36-never-redefine-an-inherited-non-virtual-function) — LSP 위반의 한 형태
