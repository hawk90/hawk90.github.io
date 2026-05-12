---
title: "가이드라인 6: 추상화의 기대 동작을 준수하라"
date: 2026-05-13T16:00:00
description: "Liskov Substitution Principle — 인터페이스는 시그니처만이 아니라 의미·계약·불변식. derived는 base의 약속을 모두 지켜야."
tags: [C++, Software Design, SOLID, LSP, Liskov]
series: "C++ Software Design"
seriesOrder: 6
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

void migrate(Bird& b) { b.fly(); }     // Bird 받으면 날린다 — 합리적

Penguin p;
migrate(p);     // ⚠️ 런타임 에러 — Penguin은 Bird를 대체 못 함
```

문제 — `Penguin`이 컴파일러 입장에선 `Bird`의 derived이지만, **의미적으로는 Bird의 약속을 못 지킴**.

이게 **Liskov Substitution Principle**(LSP)의 본질. 인터페이스 = **시그니처 + 의미 + 계약 + 불변식**. 시그니처만 일치하는 게 — 진짜 derived가 아니다.

Iglberger는 이 가이드라인에서 — "추상화의 기대 동작"이 무엇인지, 어떻게 정의하고 검증할지를 다룬다.

## 핵심 내용

- **Liskov Substitution Principle**(LSP) — derived는 base가 쓰이는 모든 곳에서 동작해야
- 추상화는 — **시그니처 + 의미 + 계약(pre/post condition) + 불변식**
- 컴파일러는 시그니처만 검사 — **의미적 준수는 사람**
- LSP 위반의 흔한 형태:
  - throw "not supported"
  - 사전조건 강화 (입력 범위 축소)
  - 사후조건 약화 (반환 보장 축소)
  - 불변식 깨기

## 비교 — LSP 위반 vs 만족

### Bad: 의미적 LSP 위반

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
    assert(r.getHeight() == oldHeight);     // ⚠️ Square엔 깨짐
}
```

수학적으로 — "Square ⊂ Rectangle" 맞음. 그러나 **변경 가능한 객체 모델**에선 — `Rectangle.setWidth`의 약속(width만 변경)을 Square가 깸. LSP 위반.

`makeBigger`가 `Rectangle&`를 받지만 `Square`를 넘기면 — assertion 실패.

### Good: 분리 또는 불변 객체

```cpp
// 옵션 1: Square가 Rectangle을 대체하지 않음 — 형제 관계
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Rectangle : public Shape { /* ... */ };
class Square    : public Shape { /* ... */ };

// 옵션 2: 불변 객체 — 변경 자체 없음
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
// 변경 없으니 — LSP OK
```

수학적 IS-A ≠ 객체 지향 IS-A. 객체 지향에선 — **계약 호환**이 IS-A.

## LSP의 형식 정의 — 4가지 조건

Liskov & Wing (1994):

derived class T가 base class S를 대체할 수 있으려면:

### 1) 사전 조건(precondition)을 강화하지 마라

base가 더 넓은 입력을 받는데, derived가 좁게 받으면 — 호출자가 base 기대해서 넓은 입력 줬을 때 깨짐.

```cpp
class Base {
public:
    // pre: x ≥ 0
    virtual void process(int x);
};

class Derived : public Base {
public:
    // pre: x > 0  (강화 — 0이 제외됨)
    void process(int x) override {
        if (x == 0) throw "invalid";     // ⚠️ Base는 0 허용
    }
};

void caller(Base& b) {
    b.process(0);     // Base 기대 — OK
                      // Derived면 throw — 깨짐
}
```

### 2) 사후 조건(postcondition)을 약화하지 마라

base가 어떤 결과를 보장하는데, derived가 덜 보장하면 — 호출자 기대 깨짐.

```cpp
class Base {
public:
    // post: 반환값은 양수
    virtual int compute();
};

class Derived : public Base {
public:
    // post: 반환값은 정수 (양수 보장 X)  — 약화
    int compute() override { return -1; }     // ⚠️ Base는 양수 약속
};
```

### 3) 불변식(invariant)을 깨지 마라

base의 불변식을 — derived는 항상 유지해야 한다.

```cpp
class Account {
public:
    // 불변식: balance ≥ 0
    virtual void withdraw(int amount);
};

class OverdraftAccount : public Account {
public:
    void withdraw(int amount) override {
        balance_ -= amount;     // ⚠️ balance가 음수 가능 — Account 불변식 깸
    }
};
```

### 4) 새로운 예외를 던지지 마라

base가 던지지 않는 예외를 — derived가 던지면, 사용자가 처리 못 함.

```cpp
class Base {
public:
    virtual void process(int x);     // 예외 던지지 않음
};

class Derived : public Base {
public:
    void process(int x) override {
        if (x < 0) throw std::invalid_argument("...");     // ⚠️ 새 예외
    }
};

void caller(Base& b) {
    b.process(-1);     // Base는 예외 X 기대 — Derived면 catch 못 함
}
```

(C++에선 `noexcept` 명시로 일부 검증 가능, 그러나 의미적 보장은 별개)

## 시그니처만으로는 부족 — 의미가 본질

```cpp
class Collection {
public:
    virtual void add(int x);
    virtual size_t size() const;
};

class UniqueCollection : public Collection {
public:
    void add(int x) override {
        if (!contains(x)) Collection::add(x);     // 중복 거부
    }
};
```

시그니처 일치, 다만 — `add` 후 `size()`가 항상 +1이라는 **암묵적 계약**을 깸. 사용자가:

```cpp
void process(Collection& c) {
    size_t before = c.size();
    c.add(42);
    assert(c.size() == before + 1);     // ⚠️ UniqueCollection이면 깨짐
}
```

이게 — **암묵 계약**(implicit contract). 시그니처에 안 적힘, 그러나 사용자가 기대.

## 계약을 어디에 명시?

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

문서 주석으로 — pre/post/throw 명시. derived 작성자가 이 계약을 — 코드로 + 문서로 준수.

도구:
- **Doxygen** `@pre @post @invariant @throws` — 표준 문서화
- **`assert`** — 런타임 검증 (debug mode)
- **`static_assert`** — 컴파일 타임 검증 (타입 수준)
- **C++ Contract proposal** (미래) — 컴파일러가 검증

C++26+ 표준이 contract 추가 예정 — 그때까지는 주석 + assert.

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
        assert(balance_ >= 0);          // 불변식 유지
    }
};
```

각 public 메서드 — 진입 시 사전조건, 종료 시 불변식 검증. 표준 패턴.

## 함정 — IS-A 자연어 분류

```cpp
// 자연어: "정사각형은 직사각형이다"
//         "펭귄은 새다"
//         "구글은 회사다"
```

이런 분류 — 거의 항상 LSP 위반 위험. 객체 지향 IS-A는 — **자연어가 아닌 계약 호환**.

매번 자문: "**Derived가 Base의 모든 약속을 지킬 수 있는가?**"

지키기 어려우면 — 상속이 아니라 composition 또는 형제 관계.

## LSP와 컴파일러

C++ 컴파일러는 — **시그니처만 검사**:

```cpp
class Base {
public:
    virtual int f(int);
};

class Derived : public Base {
public:
    int f(int) override;     // 시그니처 일치 — OK
};
```

`override` 키워드도 — 시그니처 검사만. 의미적 LSP 검증은 — 컴파일러 능력 밖.

도구:
- **`override`** — 시그니처 검사 (오타 등)
- **`final`** — 추가 derived 차단
- **`assert`** — 런타임 검증

**진짜 검증은 — 코드 리뷰 + 테스트.**

## C++20 concepts와 LSP

```cpp
template<typename T>
concept Drawable = requires(const T& t) {
    { t.draw() } -> std::same_as<void>;
};
```

concept이 — **시그니처 명시**. 의미적 계약은 여전히 — 문서 + 테스트.

```cpp
template<typename T>
concept Account = requires(T& acc, int amount) {
    { acc.balance() } -> std::convertible_to<int>;
    { acc.deposit(amount) } -> std::same_as<void>;
    // 의미적: 사용자가 약속 — 사후조건, 불변식
};
```

C++ contract 표준이 도입되면 — 의미도 일부 표현.

## 함정 — Empty override

```cpp
class Animal {
public:
    virtual void breathe();
};

class Doll : public Animal {     // ⚠️ Doll은 Animal?
public:
    void breathe() override {}     // 아무것도 안 함 — LSP 위반
};
```

derived가 — **아무 동작도 안 함**으로 base 약속 회피. 사용자가 `breathe()` 호출해 효과 기대하는데 안 일어남.

해결: 상속 관계 자체 재검토. Doll이 Animal이어야 하는가?

## 함정 — 사후조건 약화의 미묘함

```cpp
class Container {
public:
    /// post: 반환된 iterator는 valid
    virtual Iterator find(int x);
};

class LazyContainer : public Container {
public:
    /// post: 반환된 iterator는 lazy initialized — 첫 접근 시 데이터 fetch
    Iterator find(int x) override {
        return LazyIterator{this, x};     // ⚠️ Container의 "valid" 의미가 다름?
    }
};
```

"valid iterator"의 정의가 — base와 derived에서 다름. 사용자가 Container 받아 즉시 `*it` 하면 — Container는 즉시 데이터 보장, LazyContainer는 그 시점에 fetch. 사용자 입장에선 OK일 수 있지만 — **timing 차이**가 LSP 위반.

## 함정 — Refused Bequest

derived가 base의 메서드를 — "사용 안 함" 또는 "의미 없음"으로 처리.

```cpp
class Stack {
public:
    virtual void push(int x);
    virtual int pop();
    virtual int& operator[](size_t i);     // ⚠️ Stack에 index access?
};

class StrictStack : public Stack {
public:
    int& operator[](size_t i) override {
        throw "stack does not support random access";     // ⚠️ refused bequest
    }
};
```

→ 인터페이스 자체가 잘못 설계. ISP 위반과 결합.

## 깊은 메시지 — 추상화는 약속

추상화 = **외부와의 약속**. 그 약속을 — 모든 derived가 지켜야.

> "**An abstraction is a promise.** Every derived class must keep that promise."

이 약속이 — **시그니처 + 의미 + 계약 + 불변식**. 시그니처만 일치하는 — 가짜 derived. 그래서:

1. base 설계 시 — **약속을 명확히** (코드 + 문서)
2. derived 작성 시 — **약속 준수** (assert로 검증)
3. 사용자 코드 — **약속만 의존** (구체 derived 모름)

## 추상화의 4 요소

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

derived는 **4가지 모두** 만족해야 — 진정한 LSP.

## 실전 예 — STL iterator 계층

```
input_iterator
  └── forward_iterator
       └── bidirectional_iterator
            └── random_access_iterator
                 └── contiguous_iterator
```

각 계층이 — 이전 계층의 모든 약속을 만족 + 새 능력 추가:
- input: `++`, `*`, `==`
- forward: + multi-pass
- bidirectional: + `--`
- random access: + `+n`, `[i]`, `<`
- contiguous: + 연속 메모리 보장

`std::sort`가 `random_access_iterator` 요구 — `forward_iterator`만 가진 `std::list`는 `std::list::sort` 별도. 인터페이스가 정확히 LSP를 따름.

## C++ 표준 라이브러리의 LSP

```cpp
std::vector<T>::iterator     // random_access
std::list<T>::iterator        // bidirectional
std::forward_list<T>::iterator // forward

std::sort(begin, end);     // random_access 요구 — forward로 호출 시 컴파일 에러
```

C++20 concepts 이전엔 — 깊은 에러 메시지. 이후엔 — "constraint not satisfied: random_access_iterator".

## 실무 가이드 — 새 derived 작성 시

각 메서드별로 자문:

- [ ] base의 **사전조건**을 강화하지 않았나? (입력 범위)
- [ ] base의 **사후조건**을 약화하지 않았나? (반환 보장)
- [ ] base의 **불변식**을 깨지 않았나? (객체 상태)
- [ ] base가 던지지 않는 **예외**를 던지지 않나?
- [ ] base가 — `noexcept`였는데 derived가 throw 가능?
- [ ] base 메서드의 **의미**를 그대로 유지하나? (refused bequest 아님)
- [ ] base의 약속을 — derived **문서에 명시**?

## 실무 가이드 — base 설계 시

- [ ] 모든 derived가 — **자연스럽게 만족할** 약속만 정의?
- [ ] 너무 좁은 사전조건 — derived 부담?
- [ ] 너무 강한 사후조건 — derived가 못 지킬 가능성?
- [ ] 불변식을 — 코드로 강제 (private 멤버 + invariant)?
- [ ] `assert`로 — 런타임 검증?

## 정리

**Liskov Substitution Principle** — derived는 base가 쓰이는 모든 곳에서 동작해야 한다.

추상화의 4 요소:
1. **시그니처** — 컴파일러가 검사
2. **의미** — 사람이 이해
3. **계약** — 사전·사후·예외 보장
4. **불변식** — 객체 상태

derived는 — **4가지 모두** 만족해야 진정한 LSP. 시그니처만 일치는 가짜 derived.

도구:
- **`override`, `final`** — 시그니처 검사
- **Doxygen `@pre @post @invariant`** — 계약 문서화
- **`assert`** — 런타임 검증
- **C++ contract proposal** (미래) — 표준 contract

## 관련 항목

- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — ISP와 LSP의 자매
- [가이드라인 7: base vs concept](/blog/programming/cpp/cpp-software-design/guideline07-understand-the-similarities-between-base-classes-and-concepts) — concepts에도 LSP
- [Effective C++ 항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — LSP의 EC++ 버전
- [Effective C++ 항목 36: non-virtual 재정의 X](/blog/programming/cpp/effective-cpp/item36-never-redefine-an-inherited-non-virtual-function) — LSP 위반의 한 형태
