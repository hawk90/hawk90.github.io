---
title: "가이드라인 22: 참조 의미론보다 값 의미론을 선호하라"
date: 2026-05-14T18:00:00
description: "Value semantics — 값처럼 자연스러운 객체. 복사 의미가 명확, 컨테이너 친화, 멀티스레드 안전, NRVO 효율."
tags: [C++, Software Design, Value Semantics, Modern C++]
series: "C++ Software Design"
seriesOrder: 22
---

## 왜 이 가이드라인이 중요한가?

Iglberger 책의 가장 큰 메시지 중 하나:

> "**Prefer value semantics over reference semantics.**"

모던 C++의 큰 진화 — 값 의미론(value semantics) 중심. C++03 시대 — 포인터 / 참조 / heap 할당 가득. C++11+ — 이동 의미론 / RAII / 표준 컨테이너 / `std::variant` 등으로 **값처럼 다루는 게 자연**.

값 의미의 이점:
- **복사가 명확** — 깊은 복사 (포인터처럼 alias X)
- **컨테이너 친화** — `std::vector<T>` 직접
- **멀티스레드 안전** — 공유 가변 X
- **추론 단순** — alias 추적 불필요
- **NRVO** — 컴파일러 최적화

```cpp
// 참조 의미 (옛 C++)
std::vector<Shape*> shapes;
shapes.push_back(new Circle{5.0});

// 값 의미 (모던)
std::vector<std::variant<Circle, Square, Triangle>> shapes;
shapes.push_back(Circle{5.0});
```

이 가이드라인 — 값 의미론의 본질 + 이점 + 도구.

## 핵심 내용

- **값 의미론** — 객체를 값처럼 다룸 (int, double처럼)
- **참조 의미론** — 포인터 / 참조로 공유
- 모던 C++ — 값 의미론이 기본, 참조는 예외
- 이점: 복사 명확, 컨테이너, 멀티스레드 안전, NRVO
- 도구: `std::variant`, `std::optional`, `std::function`, RAII 컨테이너

## 비교 — 참조 의미 vs 값 의미

### Reference Semantics

```cpp
class Shape { /* virtual */ };
class Circle : public Shape { /* ... */ };
class Square : public Shape { /* ... */ };

std::vector<Shape*> shapes;
shapes.push_back(new Circle{5.0});
shapes.push_back(new Square{10.0});

// 복사 — 어떻게?
auto copy = shapes;     // 포인터만 복사 — shallow
                        // 두 vector가 같은 객체 가리킴 ⚠️

// 삭제 책임?
for (auto* s : shapes) delete s;     // 수동 정리
```

문제:
- Shallow vs deep copy 모호
- heap 할당 / 해제 책임
- 다른 vector가 같은 객체 — alias
- 멀티스레드 — race 가능
- nullptr 가능성

### Value Semantics

```cpp
struct Circle { double radius; };
struct Square { double side; };

using Shape = std::variant<Circle, Square>;

std::vector<Shape> shapes;
shapes.push_back(Circle{5.0});
shapes.push_back(Square{10.0});

// 복사 — 자연스러운 깊은 복사
auto copy = shapes;     // shape 값들 복사

// 삭제 — vector 소멸 시 자동
```

장점:
- 복사 = 깊은 복사 (명확)
- 메모리 관리 자동
- alias 없음
- 멀티스레드에 두 vector 독립
- nullptr 불가

## 값 의미론의 4 속성

### 1) 복사 = 독립 객체

```cpp
int a = 5;
int b = a;
b = 10;
// a는 여전히 5 — 독립
```

값 의미 객체도 마찬가지:

```cpp
Circle c1{5.0};
Circle c2 = c1;
c2.radius = 10.0;
// c1.radius — 여전히 5.0
```

### 2) 비교 — equality by value

```cpp
struct Point { int x, y; };

Point p1{1, 2};
Point p2{1, 2};
p1 == p2;     // ✅ true (멤버별 비교)
```

C++20 `<=>`:

```cpp
struct Point {
    int x, y;
    auto operator<=>(const Point&) const = default;
};
```

자동 생성.

### 3) Container friendly

```cpp
std::vector<int>;           // OK
std::vector<std::string>;   // OK
std::vector<Circle>;        // OK — value semantic
std::vector<Shape*>;         // 참조 — 어색
```

값 의미 — 컨테이너 자연. 메모리 연속, 캐시 친화.

### 4) Pass-by-value 자연

```cpp
void process(Circle c);     // 복사 받음 — int처럼
void render(const Circle& c); // const 참조 — 효율
```

`int`처럼 다룸. 큰 객체는 — const& 사용 (가이드라인 20 Effective C++).

## 모던 C++ — 값 의미 도구

### `std::variant`

```cpp
using Shape = std::variant<Circle, Square, Triangle>;
Shape s = Circle{5.0};
auto copy = s;     // 값 복사 — Circle 복사
```

타입 합 — 값. heap 할당 X.

### `std::optional`

```cpp
std::optional<User> find(int id);

auto user = find(42);
if (user) use(*user);

auto copy = user;     // 값 복사
```

nullable — 값. nullptr 회피.

### `std::function`

```cpp
std::function<void()> cmd = []() { /* ... */ };
auto cmd2 = cmd;     // 값 복사 (람다도 복사)
```

callable — 값. 단, type erasure 비용.

### 컨테이너 (vector, string, map)

```cpp
std::vector<int> v{1, 2, 3};
auto v2 = v;     // 깊은 복사
v2.push_back(4);
// v는 변경 없음
```

표준 컨테이너 — 모두 값 의미.

### `std::unique_ptr` — 값 의미 + ownership

```cpp
auto p = std::make_unique<Widget>();
auto q = std::move(p);     // 이동 — 소유권 이전
```

복사 불가, 이동만. 단일 소유. 값처럼 다루되 — heap 객체.

### `std::shared_ptr` — 참조 의미 (예외)

```cpp
auto p = std::make_shared<Widget>();
auto q = p;     // shallow copy — 같은 객체 공유
```

`shared_ptr` — 참조 의미. **정말 공유 의미 있을 때만**.

## 값 의미의 이점 — 추론

```cpp
void process(const Order& o) {
    // o는 — 함수 안에서만 사용
    // o의 다른 alias가 변경? — 가능 (외부 참조)
}

void process(Order o) {
    // o는 — 함수가 소유한 복사본
    // 외부 변경 — 영향 없음 ✅
    // 함수 안 변경 — 호출자 무영향 ✅
}
```

값 매개변수 — 함수 추론 쉬움. 부작용 X.

## 값 의미의 이점 — 멀티스레드

```cpp
auto shared_state = std::make_shared<State>();

std::thread t1([&shared_state]() {
    shared_state->modify();     // ⚠️ race
});

std::thread t2([&shared_state]() {
    shared_state->read();
});

// 락 필요
```

```cpp
State state;

std::thread t1([state]() {     // 값 캡처 — 복사
    State local = state;
    local.modify();             // race X
});

std::thread t2([state]() {
    State local = state;
    local.read();
});
```

값 복사 — 각 스레드가 자기 데이터. race X.

(공유가 정말 필요하면 — `shared_ptr<const T>` 또는 mutex)

## 함정 — Polymorphism 필요할 때

```cpp
// 값 의미 — 다형성?
std::vector<Shape> shapes;     // ⚠️ Shape는 abstract

// 해결책
std::vector<std::variant<Circle, Square>> shapes;     // variant
std::vector<std::unique_ptr<Shape>> shapes;            // pointer (참조 의미)
```

다형성 + 값 의미 — `std::variant` 또는 type erasure.

## NRVO (Named Return Value Optimization)

값 반환 — 비싸 보이지만 컴파일러 최적화:

```cpp
std::vector<int> create() {
    std::vector<int> result;
    result.push_back(1);
    result.push_back(2);
    return result;     // NRVO — 호출자 위치에 직접 생성
}

auto v = create();     // 복사 X — NRVO
```

C++17부터 — guaranteed copy elision (일부 케이스). 모던 C++에서 값 반환 — 거의 무비용.

## Move semantics — 값 의미의 보완

```cpp
std::vector<int> v = create_huge();     // 이동 — 빠름
auto v2 = std::move(v);                 // 명시 이동
```

이동 의미론 — 깊은 복사 없이 자원 이전. 값 의미 + 효율.

## "Value semantic types" 작성

```cpp
class Order {
    // 멤버 — value semantic 타입
    int id_;
    std::string customer_;
    std::vector<Item> items_;
public:
    // Rule of zero — 표준 컨테이너만 멤버, 자동 생성
    
    bool operator==(const Order&) const = default;     // C++20
};
```

표준 컨테이너 / 값 타입만 멤버 → 컴파일러가 — copy/move/compare 자동 생성. Rule of zero.

## 함정 — pointer 멤버

```cpp
class Order {
    Item* items_;     // ⚠️ 참조 의미 — value semantic 깨짐
public:
    Order(const Order& other) : items_(other.items_) { /* shallow! */ }
};
```

raw pointer 멤버 — value semantic 깨뜨림. 해결:

```cpp
class Order {
    std::vector<Item> items_;     // 값 — 자동 깊은 복사
    // 또는
    std::unique_ptr<Item> single_;   // unique_ptr — 복사 X (이동만)
};
```

## 함정 — virtual 멤버

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

Shape s;     // ❌ abstract — 인스턴스화 X

std::vector<Shape> shapes;     // ❌ value 컨테이너 — abstract 안 됨
```

virtual / abstract — 값 의미 X. 해결:

```cpp
// 옵션 A: variant
using Shape = std::variant<Circle, Square>;
std::vector<Shape> shapes;

// 옵션 B: unique_ptr
std::vector<std::unique_ptr<Shape>> shapes;
```

## Slicing — 값 의미의 함정

```cpp
class Animal { /* virtual */ };
class Dog : public Animal { /* extra members */ };

Dog d;
Animal a = d;     // ⚠️ slicing — Dog 부분 잘림
```

값으로 — derived → base 복사 시 derived 부분 손실. 다형성 깨짐.

해결: 다형성 — 포인터 / 참조 / variant.

## Iglberger의 메시지

```
Value semantic — 가능하면 모든 곳
Reference semantic — 정말 필요할 때만
```

값 의미가 가능한 도메인:
- 데이터 객체 (Point, Rectangle, ...)
- 옵션 / 설정 (Config, Options)
- 메시지 / 이벤트 (variant 기반)
- 함수 객체 (`std::function`, lambda)
- 컨테이너

참조 의미가 자연:
- 라이프타임이 길고 공유 (Database connection)
- Polymorphic hierarchy (open hierarchy)
- 시스템 자원 (file handle, GPU texture)

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

// 모두 값. heap X. 깊은 복사 자연.
```

이벤트 시스템 — 값 의미. 가이드라인 17.

## Type Erasure — 값 의미 + 다형성

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
    
    // 값 의미 — 깊은 복사
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

auto copy = shapes;     // 깊은 복사 — clone 호출
```

`std::function` 같은 패턴 — 다형성 + 값. 가이드라인 32-34.

## 함정 — shared_ptr 남용

```cpp
std::vector<std::shared_ptr<Widget>> widgets;     // ⚠️ 필요한가?
```

`shared_ptr` — 참조 의미. 정말 공유 필요할 때만.

대안:
- `std::vector<Widget>` (값)
- `std::vector<std::unique_ptr<Widget>>` (값 의미 + ownership)
- `std::vector<std::variant<...>>` (다형성 + 값)

## 함정 — 큰 객체 값 복사

```cpp
struct HugeObject {
    std::array<int, 1000000> data;     // 4 MB
};

void process(HugeObject o) {     // ⚠️ 4 MB 복사
    // ...
}

void process(const HugeObject& o);    // ✅ 참조
```

큰 객체 — `const &` 매개변수. 단, 함수 안에서 보관해야 하면 — 값 by-move (가이드라인 EC++ 41).

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

## Value Semantics와 RAII

RAII — 자원을 값처럼 다룸:

```cpp
{
    std::ifstream file("data.txt");
    // ... 사용 ...
}     // 자동 close — 값 의미 + RAII
```

이미 — C++의 값 의미 패턴. 표준 RAII (file, mutex, smart pointer) 모두.

## C++20+ 강화 — value semantic 더 자연

```cpp
// 모든 표준 컨테이너 — value semantic
// std::span — value semantic view
// std::variant — value semantic sum type
// std::optional — value semantic maybe
// std::expected (C++23) — value semantic Result
```

C++ 모던 — 값 의미 도구 풍부.

## 함정 — Reference 멤버

```cpp
class Service {
    Database& db_;     // ⚠️ 참조 — value semantic 깨짐
public:
    Service(Database& d) : db_(d) {}
};

// 복사? 대입?
Service s2 = s1;     // ❌ 참조 — 대입 못 함
```

참조 멤버 — 복사 / 대입 자동 생성 X. 일관성 잃음. 대안: pointer 또는 ownership 명시 (`unique_ptr` / `shared_ptr`).

## DI + Value Semantics

```cpp
class Service {
    std::shared_ptr<IDatabase> db_;     // 공유 의도 — shared_ptr OK
public:
    explicit Service(std::shared_ptr<IDatabase> d) : db_(std::move(d)) {}
};

// 또는 (라이프타임 외부 보장)
class Service {
    IDatabase* db_;     // non-owning
public:
    explicit Service(IDatabase& d) : db_(&d) {}
};
```

DI — 라이프타임 모델에 따라.

## 함정 — Mutable 멤버

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
auto c2 = c1;     // 값 복사 — c2의 cache_도 복사? 또는 reset?
```

mutable cache — 복사 의미 미묘. 보통 — 복사된 객체는 empty cache로 시작.

## 디자인 결정 — value or reference

```
이 객체의 의미 — value or reference?
├── 데이터 자체 (Point, Order, ...) → value
├── 시스템 자원 (file, socket, ...) → RAII + 종종 noncopyable
├── 공유 의미 (cache, registry, ...) → shared (참조)
├── 큰 객체 + 빈번한 복사 → 측정 후 결정
└── Polymorphic + 컨테이너 → variant 또는 unique_ptr<Base>
```

## 실무 가이드 — Value Semantics 적용

새 타입 디자인 시:

1. **기본은 value semantics**
2. **Rule of zero** — 표준 컨테이너 / 값 타입만 멤버
3. **`std::variant`** — 다형성 + value
4. **`unique_ptr`** — ownership + value (이동 only)
5. **`shared_ptr`** — 정말 공유일 때만
6. **`weak_ptr`** — 순환 끊기

## 실무 가이드 — 체크리스트

- [ ] 클래스가 — value semantic인가?
- [ ] Rule of zero 가능? (자동 생성된 copy/move/compare)
- [ ] raw pointer 멤버 없는가? — `unique_ptr` / `vector`로
- [ ] 다형성 — `variant` 또는 type erasure?
- [ ] `shared_ptr` — 정말 필요?
- [ ] 큰 객체 — `const&` 매개변수?
- [ ] 멀티스레드 — 값 복사로 race 회피?

## 정리

**Value semantics** — 모던 C++의 정설.

이점:
- 복사 = 깊은 복사 (명확)
- 컨테이너 친화
- 멀티스레드 안전
- 추론 단순
- NRVO + move 효율

도구:
- `std::variant` — 다형성 + value
- `std::optional` — nullable + value
- `std::function` — callable + value
- `std::unique_ptr` — ownership + value (이동)
- 표준 컨테이너 — value

참조 의미 — 필요한 경우만 (open hierarchy, 공유 자원, 큰 객체).

## 관련 항목

- [가이드라인 17: std::variant Visitor](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — value polymorphism
- [가이드라인 20: composition > inheritance](/blog/programming/cpp/cpp-software-design/guideline20-favor-composition-over-inheritance) — value semantic 친화
- [가이드라인 23: value-based Strategy/Command](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — 본격 적용
- [Effective Modern C++ 항목 41: by-value sink](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-parameters-that-are-cheap-to-move-and-always-copied) — by-value + move
- [Beautiful C++ 항목 26: 불변 데이터](/blog/programming/cpp/beautiful-cpp/item26-prefer-immutable-data) — value 친화
