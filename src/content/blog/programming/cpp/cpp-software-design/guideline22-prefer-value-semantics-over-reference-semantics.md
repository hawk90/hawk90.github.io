---
title: "가이드라인 22: 참조 의미론보다 값 의미론을 선호하라"
date: 2026-05-02T22:00:00
description: "값 의미론은 값처럼 자연스럽게 다루는 객체다. 복사 의미가 분명하고, 컨테이너에 친화적이며, 멀티스레드에서 안전하고, NRVO로 효율적이다."
tags: [C++, Software Design, Value Semantics, Modern C++]
series: "C++ Software Design"
seriesOrder: 22
draft: true
---

## 왜 이 가이드라인이 중요한가?

Iglberger 책의 가장 큰 메시지 중 하나가 이것이다.

> "**Prefer value semantics over reference semantics.**"

모던 C++의 큰 진화는 값 의미론 중심으로의 이동이다. C++03 시대에는 포인터, 참조, heap 할당이 가득했다. C++11 이후로는 이동 의미론, RAII, 표준 컨테이너, `std::variant` 같은 도구가 들어오면서 **값처럼 다루는 것이 자연스러워졌다**.

값 의미론의 이점은 다음과 같다.

- **복사가 분명하다** — 깊은 복사다(포인터처럼 alias가 생기지 않는다).
- **컨테이너에 친화적이다** — `std::vector<T>`에 그대로 담는다.
- **멀티스레드에 안전하다** — 가변 상태를 공유하지 않는다.
- **추론이 단순하다** — alias를 추적할 필요가 없다.
- **NRVO** — 컴파일러가 최적화한다.

```cpp
// 참조 의미론 (옛 C++)
std::vector<Shape*> shapes;
shapes.push_back(new Circle{5.0});

// 값 의미론 (모던)
std::vector<std::variant<Circle, Square, Triangle>> shapes;
shapes.push_back(Circle{5.0});
```

이 가이드라인은 값 의미론의 본질과 이점, 도구를 다룬다.

## 핵심 내용

- **값 의미론** — 객체를 값처럼 다룬다(`int`나 `double`처럼).
- **참조 의미론** — 포인터나 참조로 공유한다.
- 모던 C++에서는 값 의미론이 기본이다. 참조 의미론은 예외다.
- 이점 — 복사 명확, 컨테이너 친화, 멀티스레드 안전, NRVO.
- 도구 — `std::variant`, `std::optional`, `std::function`, RAII 컨테이너.

## 비교 — 참조 의미론과 값 의미론

### Reference Semantics

```cpp
class Shape { /* virtual */ };
class Circle : public Shape { /* ... */ };
class Square : public Shape { /* ... */ };

std::vector<Shape*> shapes;
shapes.push_back(new Circle{5.0});
shapes.push_back(new Square{10.0});

// 복사는 어떻게 할까?
auto copy = shapes;     // 포인터만 복사된다 — shallow
                        // 두 vector가 같은 객체를 가리킨다 ⚠️

// 삭제 책임은?
for (auto* s : shapes) delete s;     // 수동 정리
```

문제는 다음과 같다.

- shallow와 deep copy가 모호하다.
- heap 할당과 해제 책임이 따라온다.
- 다른 vector가 같은 객체를 가리키는 alias가 생긴다.
- 멀티스레드에서 race가 가능하다.
- nullptr 가능성이 있다.

### Value Semantics

```cpp
struct Circle { double radius; };
struct Square { double side; };

using Shape = std::variant<Circle, Square>;

std::vector<Shape> shapes;
shapes.push_back(Circle{5.0});
shapes.push_back(Square{10.0});

// 복사는 자연스럽게 깊은 복사다
auto copy = shapes;     // shape 값들이 복사된다

// 삭제는 vector가 소멸할 때 자동으로 일어난다
```

장점은 다음과 같다.

- 복사는 깊은 복사다(의미가 분명하다).
- 메모리 관리가 자동이다.
- alias가 없다.
- 멀티스레드에서 두 vector가 독립적이다.
- nullptr이 불가능하다.

## 값 의미론의 네 속성

### 1) 복사 = 독립 객체

```cpp
int a = 5;
int b = a;
b = 10;
// a는 여전히 5다 — 독립이다
```

값 의미 객체도 같다.

```cpp
Circle c1{5.0};
Circle c2 = c1;
c2.radius = 10.0;
// c1.radius는 여전히 5.0이다
```

### 2) 비교 — equality by value

```cpp
struct Point { int x, y; };

Point p1{1, 2};
Point p2{1, 2};
p1 == p2;     // ✅ true (멤버별 비교)
```

C++20의 `<=>`로 자동 생성된다.

```cpp
struct Point {
    int x, y;
    auto operator<=>(const Point&) const = default;
};
```

### 3) 컨테이너에 친화적이다

```cpp
std::vector<int>;           // OK
std::vector<std::string>;   // OK
std::vector<Circle>;        // OK — value semantic
std::vector<Shape*>;         // 참조 — 어색하다
```

값 의미론은 컨테이너에 자연스럽게 들어간다. 메모리가 연속적이라 cache에도 친화적이다.

### 4) Pass-by-value가 자연스럽다

```cpp
void process(Circle c);     // 복사를 받는다 — int처럼
void render(const Circle& c); // const 참조 — 효율
```

`int`처럼 다룬다. 큰 객체는 `const&`를 쓴다(Effective C++ 항목 20).

## 모던 C++ — 값 의미 도구

### `std::variant`

```cpp
using Shape = std::variant<Circle, Square, Triangle>;
Shape s = Circle{5.0};
auto copy = s;     // 값 복사 — Circle이 복사된다
```

타입 합도 값이다. heap 할당이 없다.

### `std::optional`

```cpp
std::optional<User> find(int id);

auto user = find(42);
if (user) use(*user);

auto copy = user;     // 값 복사
```

nullable도 값이다. nullptr을 피한다.

### `std::function`

```cpp
std::function<void()> cmd = []() { /* ... */ };
auto cmd2 = cmd;     // 값 복사(람다도 복사된다)
```

callable도 값이다. 단, type erasure 비용이 있다.

### 컨테이너(vector, string, map)

```cpp
std::vector<int> v{1, 2, 3};
auto v2 = v;     // 깊은 복사
v2.push_back(4);
// v는 그대로다
```

표준 컨테이너는 모두 값 의미론을 갖는다.

### `std::unique_ptr` — 값 의미론 + 소유권

```cpp
auto p = std::make_unique<Widget>();
auto q = std::move(p);     // 이동 — 소유권 이전
```

복사가 불가능하고 이동만 된다. 단일 소유다. 값처럼 다루되 대상이 heap 객체다.

### `std::shared_ptr` — 참조 의미론(예외)

```cpp
auto p = std::make_shared<Widget>();
auto q = p;     // shallow copy — 같은 객체를 공유한다
```

`shared_ptr`는 참조 의미론이다. **정말로 공유 의미가 있을 때만** 쓴다.

## 값 의미론의 이점 — 추론

```cpp
void process(const Order& o) {
    // o는 함수 안에서만 쓰인다
    // o의 다른 alias가 변경할 가능성이 있다 (외부 참조)
}

void process(Order o) {
    // o는 함수가 소유한 복사본이다
    // 외부 변경의 영향이 없다 ✅
    // 함수 안의 변경이 호출자에게 영향을 주지 않는다 ✅
}
```

값 매개변수는 함수 추론이 쉽다. 부작용이 없다.

## 값 의미론의 이점 — 멀티스레드

```cpp
auto shared_state = std::make_shared<State>();

std::thread t1([&shared_state]() {
    shared_state->modify();     // ⚠️ race
});

std::thread t2([&shared_state]() {
    shared_state->read();
});

// 락이 필요하다
```

```cpp
State state;

std::thread t1([state]() {     // 값 캡처 — 복사
    State local = state;
    local.modify();             // race가 없다
});

std::thread t2([state]() {
    State local = state;
    local.read();
});
```

값으로 복사하면 각 스레드가 자기 데이터를 갖는다. race가 사라진다.

(공유가 정말 필요하면 `shared_ptr<const T>`나 mutex를 쓴다.)

## 함정 — 다형성이 필요할 때

```cpp
// 값 의미론에서 다형성은?
std::vector<Shape> shapes;     // ⚠️ Shape가 abstract라면 불가

// 해결
std::vector<std::variant<Circle, Square>> shapes;     // variant
std::vector<std::unique_ptr<Shape>> shapes;            // pointer (참조 의미론)
```

다형성과 값 의미론을 같이 가져가려면 `std::variant`나 type erasure가 답이다.

## NRVO (Named Return Value Optimization)

값 반환은 비싸 보이지만 컴파일러가 최적화한다.

```cpp
std::vector<int> create() {
    std::vector<int> result;
    result.push_back(1);
    result.push_back(2);
    return result;     // NRVO — 호출자 위치에 직접 생성된다
}

auto v = create();     // 복사가 일어나지 않는다 — NRVO
```

C++17부터는 일부 케이스에서 guaranteed copy elision까지 보장된다. 모던 C++에서 값 반환은 거의 무비용이다.

## Move semantics — 값 의미론의 보완

```cpp
std::vector<int> v = create_huge();     // 이동 — 빠르다
auto v2 = std::move(v);                 // 명시 이동
```

이동 의미론이 깊은 복사 없이 자원을 옮긴다. 값 의미론에 효율을 더한다.

## "값 의미 타입"을 작성한다

```cpp
class Order {
    // 멤버는 모두 값 의미 타입이다
    int id_;
    std::string customer_;
    std::vector<Item> items_;
public:
    // Rule of zero — 표준 컨테이너만 멤버, 자동 생성된 함수들이 있다

    bool operator==(const Order&) const = default;     // C++20
};
```

표준 컨테이너나 값 타입만 멤버로 두면 컴파일러가 copy / move / compare를 자동 생성한다. Rule of zero다.

## 함정 — 포인터 멤버

```cpp
class Order {
    Item* items_;     // ⚠️ 참조 의미론 — 값 의미가 깨진다
public:
    Order(const Order& other) : items_(other.items_) { /* shallow! */ }
};
```

raw pointer 멤버가 값 의미론을 무너뜨린다. 해법은 이렇다.

```cpp
class Order {
    std::vector<Item> items_;     // 값 — 자동으로 깊은 복사된다
    // 또는
    std::unique_ptr<Item> single_;   // unique_ptr — 복사가 막힌다 (이동만)
};
```

## 함정 — virtual 멤버

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

Shape s;     // ❌ abstract — 인스턴스화 불가

std::vector<Shape> shapes;     // ❌ 값 컨테이너에 abstract는 들어가지 않는다
```

virtual / abstract는 값 의미론과 어울리지 않는다. 해법은 다음과 같다.

```cpp
// 옵션 A — variant
using Shape = std::variant<Circle, Square>;
std::vector<Shape> shapes;

// 옵션 B — unique_ptr
std::vector<std::unique_ptr<Shape>> shapes;
```

## Slicing — 값 의미론의 함정

```cpp
class Animal { /* virtual */ };
class Dog : public Animal { /* extra members */ };

Dog d;
Animal a = d;     // ⚠️ slicing — Dog의 추가 부분이 잘린다
```

값으로 derived → base를 복사하면 derived의 추가 부분이 사라진다. 다형성이 깨진다.

해법은 다형성을 포인터, 참조, variant로 가져가는 것이다.

## Iglberger의 메시지

```
값 의미론 — 가능하면 모든 곳에
참조 의미론 — 정말 필요할 때만
```

값 의미론이 자연스러운 도메인은 다음이다.

- 데이터 객체(Point, Rectangle 등)
- 옵션과 설정(Config, Options)
- 메시지와 이벤트(variant 기반)
- 함수 객체(`std::function`, 람다)
- 컨테이너

참조 의미론이 자연스러운 도메인은 다음이다.

- 라이프타임이 길고 공유되는 자원(Database connection)
- Polymorphic hierarchy(open hierarchy)
- 시스템 자원(file handle, GPU texture)

## std::variant — 모던 값 의미 다형성

```cpp
struct Click  { int x, y; };
struct Key    { char ch; };
struct Resize { int w, h; };

using Event = std::variant<Click, Key, Resize>;

std::vector<Event> events;
events.push_back(Click{10, 20});
events.push_back(Key{'a'});
events.push_back(Resize{800, 600});

// 모두 값이다. heap 할당이 없다. 깊은 복사가 자연스럽다.
```

이벤트 시스템은 값 의미론으로 잘 풀린다. 가이드라인 17에서 더 다룬다.

## Type Erasure — 값 의미론 + 다형성

```cpp
class AnyShape {
    struct Concept {
        virtual ~Concept() = default;
        virtual std::unique_ptr<Concept> clone() const = 0;
        virtual double area() const = 0;
    };

    template<typename T>
    struct Model : Concept {
        T value;
        Model(T v) : value(std::move(v)) {}
        std::unique_ptr<Concept> clone() const override {
            return std::make_unique<Model>(*this);
        }
        double area() const override { return value.area(); }
    };

    std::unique_ptr<Concept> impl_;

public:
    template<typename T>
    AnyShape(T t) : impl_(std::make_unique<Model<T>>(std::move(t))) {}

    // 값 의미론 — 깊은 복사를 직접 정의한다
    AnyShape(const AnyShape& other) : impl_(other.impl_->clone()) {}
    AnyShape& operator=(const AnyShape& other) {
        impl_ = other.impl_->clone();
        return *this;
    }

    AnyShape(AnyShape&&) = default;
    AnyShape& operator=(AnyShape&&) = default;

    double area() const { return impl_->area(); }
};

// 사용
std::vector<AnyShape> shapes;
shapes.push_back(Circle{5.0});
shapes.push_back(Square{10.0});

auto copy = shapes;     // 깊은 복사 — clone이 호출된다
```

`std::function`과 같은 패턴이다. 다형성과 값 의미론을 동시에 가져간다. 가이드라인 32~34에서 자세히 다룬다.

## 함정 — shared_ptr 남용

```cpp
std::vector<std::shared_ptr<Widget>> widgets;     // ⚠️ 정말 필요한가?
```

`shared_ptr`는 참조 의미론이다. 정말로 공유가 필요할 때만 쓴다.

대안은 다음과 같다.

- `std::vector<Widget>`(값)
- `std::vector<std::unique_ptr<Widget>>`(값 의미론 + 소유권)
- `std::vector<std::variant<...>>`(다형성 + 값)

## 함정 — 큰 객체를 값으로 복사한다

```cpp
struct HugeObject {
    std::array<int, 1000000> data;     // 4 MB
};

void process(HugeObject o) {     // ⚠️ 4 MB가 복사된다
    // ...
}

void process(const HugeObject& o);    // ✅ 참조
```

큰 객체는 `const&`로 받는다. 단, 함수 안에서 보관해야 한다면 값 + move가 정답이다(Effective C++ 항목 41).

```cpp
class Cache {
    HugeObject data_;
public:
    void set(HugeObject o) {     // 값 + move
        data_ = std::move(o);
    }
};

cache.set(std::move(huge));     // 이동
cache.set(huge);                  // 복사
```

## 값 의미론과 RAII

RAII는 자원을 값처럼 다룬다.

```cpp
{
    std::ifstream file("data.txt");
    // ... 사용 ...
}     // 자동으로 close된다 — 값 의미론 + RAII
```

C++의 값 의미론 패턴이 이미 표준 RAII(file, mutex, smart pointer)에 녹아 있다.

## C++20 이후 — 값 의미론이 더 자연스러워졌다

```cpp
// 모든 표준 컨테이너 — 값 의미론
// std::span — 값 의미론 view
// std::variant — 값 의미론 sum type
// std::optional — 값 의미론 maybe
// std::expected (C++23) — 값 의미론 Result
```

모던 C++에는 값 의미 도구가 풍부하다.

## 함정 — 참조 멤버

```cpp
class Service {
    Database& db_;     // ⚠️ 참조 — 값 의미가 깨진다
public:
    Service(Database& d) : db_(d) {}
};

// 복사? 대입?
Service s2 = s1;     // ❌ 참조 — 대입이 불가능하다
```

참조 멤버는 복사와 대입을 자동으로 생성하지 못한다. 일관성이 깨진다. 대안은 포인터를 쓰거나 소유권을 명시한다(`unique_ptr` / `shared_ptr`).

## DI + 값 의미론

```cpp
class Service {
    std::shared_ptr<IDatabase> db_;     // 공유 의도가 있다면 shared_ptr이 어울린다
public:
    explicit Service(std::shared_ptr<IDatabase> d) : db_(std::move(d)) {}
};

// 또는 (라이프타임을 외부에서 보장할 때)
class Service {
    IDatabase* db_;     // non-owning
public:
    explicit Service(IDatabase& d) : db_(&d) {}
};
```

DI는 라이프타임 모델에 맞춰 골라 쓴다.

## 함정 — mutable 멤버

```cpp
class Cached {
    mutable std::optional<Result> cache_;
public:
    Result get() const {
        if (!cache_) cache_ = compute();
        return *cache_;
    }
};

Cached c1;
auto c2 = c1;     // 값 복사 — c2의 cache_도 함께 복사되는가? 아니면 reset되는가?
```

mutable cache는 복사 의미가 미묘해진다. 보통은 복사된 객체가 빈 cache로 시작한다.

## 디자인 결정 — 값과 참조 사이

```
이 객체의 의미는 무엇인가?
├── 데이터 그 자체(Point, Order 등) → 값
├── 시스템 자원(file, socket 등) → RAII + 종종 noncopyable
├── 공유 의미(cache, registry 등) → shared(참조)
├── 큰 객체 + 빈번한 복사 → 측정한 뒤 결정
└── Polymorphic + 컨테이너 → variant 또는 unique_ptr<Base>
```

## 실무 가이드 — 값 의미론 적용

새 타입을 디자인할 때 다음을 따른다.

1. **기본은 값 의미론**이다.
2. **Rule of zero** — 표준 컨테이너나 값 타입만 멤버로 둔다.
3. **`std::variant`** — 다형성과 값을 함께 갖춘다.
4. **`unique_ptr`** — 소유권과 값(이동 only)을 함께 갖춘다.
5. **`shared_ptr`** — 정말로 공유가 필요할 때만.
6. **`weak_ptr`** — 순환을 끊을 때.

## 실무 가이드 — 체크리스트

- [ ] 클래스가 값 의미론을 가지는가?
- [ ] Rule of zero가 가능한가? (copy/move/compare가 자동 생성되는가)
- [ ] raw pointer 멤버를 두지 않았는가? — `unique_ptr`나 `vector`로 풀었는가?
- [ ] 다형성을 `variant`나 type erasure로 풀었는가?
- [ ] `shared_ptr`이 정말 필요한가?
- [ ] 큰 객체를 `const&` 매개변수로 받는가?
- [ ] 멀티스레드에서 값 복사로 race를 피하는가?

## 정리

값 의미론이 모던 C++의 정설이다.

이점은 다음과 같다.

- 복사 = 깊은 복사(의미가 분명하다).
- 컨테이너에 친화적이다.
- 멀티스레드에서 안전하다.
- 추론이 단순하다.
- NRVO와 move로 효율적이다.

도구는 다음과 같다.

- `std::variant` — 다형성 + 값
- `std::optional` — nullable + 값
- `std::function` — callable + 값
- `std::unique_ptr` — 소유권 + 값(이동)
- 표준 컨테이너 — 값

참조 의미론은 필요한 경우에만 쓴다(open hierarchy, 공유 자원, 큰 객체).

## 관련 항목

- [가이드라인 17: std::variant Visitor](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 값 다형성
- [가이드라인 20: composition over inheritance](/blog/programming/cpp/cpp-software-design/guideline20-favor-composition-over-inheritance) — 값 의미론과 친화적
- [가이드라인 23: 값 기반 Strategy/Command](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — 본격 적용
- [Effective Modern C++ 항목 41: by-value sink](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params) — by-value + move
- [Beautiful C++ 항목 26: 불변 데이터](/blog/programming/cpp/beautiful-cpp/item26-prefer-immutable-data) — 값에 친화적
