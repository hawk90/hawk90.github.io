---
title: "가이드라인 35: Decorator로 사용자화를 계층적으로 추가하라"
date: 2026-05-15T06:00:00
description: "Decorator 패턴 — 객체에 책임을 동적으로 추가. 컴파일 타임(템플릿) vs 런타임(상속) 변형."
tags: [C++, Software Design, Decorator, GoF, Composition]
series: "C++ Software Design"
seriesOrder: 35
---

## 왜 이 가이드라인이 중요한가?

기능 조합이 폭발하는 문제:

```cpp
// 차량 옵션 — 조합 폭발
class Car { ... };
class CarWithSunroof : public Car { ... };
class CarWithLeatherSeats : public Car { ... };
class CarWithSunroofAndLeatherSeats : public Car { ... };
class CarWithSunroofAndLeatherSeatsAndGPS : public Car { ... };
// ... 2^N 조합
```

N개 옵션 → 2^N 클래스. 명백히 불가능.

**Decorator 패턴** — 동일 인터페이스의 객체를 **감싸기** — 기능 추가. 조합 자유.

```cpp
auto car = std::make_unique<BasicCar>();
auto withSunroof = std::make_unique<SunroofDecorator>(std::move(car));
auto withGPS = std::make_unique<GPSDecorator>(std::move(withSunroof));
withGPS->price();    // 모든 옵션 누적
```

GoF 23 패턴 중 하나. 자세한 GoF — [Decorator](/blog/programming/gof-design-patterns/item11-decorator).

## 기본 구조 — 런타임 (상속 기반)

```cpp
class Item {
public:
    virtual ~Item() = default;
    virtual double price() const = 0;
};

// 콘크리트 — 기본 객체
class CClassCar : public Item {
public:
    double price() const override { return 50000; }
};

// Decorator base
class Decorator : public Item {
protected:
    std::unique_ptr<Item> wrapped_;
public:
    explicit Decorator(std::unique_ptr<Item> w) : wrapped_(std::move(w)) {}
};

// 콘크리트 decorator
class Sunroof : public Decorator {
public:
    using Decorator::Decorator;
    double price() const override {
        return wrapped_->price() + 3000;
    }
};

class GPS : public Decorator {
public:
    using Decorator::Decorator;
    double price() const override {
        return wrapped_->price() + 1500;
    }
};
```

**사용**:

```cpp
std::unique_ptr<Item> car = std::make_unique<CClassCar>();
car = std::make_unique<Sunroof>(std::move(car));
car = std::make_unique<GPS>(std::move(car));
std::cout << car->price();    // 50000 + 3000 + 1500 = 54500
```

## 메커니즘 — 책임의 연결

각 decorator — 자신의 책임만 추가 + wrapped에 위임:

```cpp
double Sunroof::price() const {
    return wrapped_->price() + 3000;       // 위임 + 추가
}
```

**연결 그래프**:

```
GPS → Sunroof → CClassCar
       (각각 자신의 가격 추가)
```

호출은 — 사슬을 타고 안쪽으로. 결과 합산.

## 컴파일 타임 변형 — 템플릿 기반

```cpp
class CClassCar {
public:
    double price() const { return 50000; }
};

template<typename T>
class Sunroof {
    T wrapped_;
public:
    explicit Sunroof(T w) : wrapped_(std::move(w)) {}
    double price() const { return wrapped_.price() + 3000; }
};

template<typename T>
class GPS {
    T wrapped_;
public:
    explicit GPS(T w) : wrapped_(std::move(w)) {}
    double price() const { return wrapped_.price() + 1500; }
};
```

**사용**:

```cpp
GPS<Sunroof<CClassCar>> car{
    Sunroof<CClassCar>{
        CClassCar{}
    }
};
std::cout << car.price();        // 54500 — virtual 비용 0
```

타입이 길어짐 — `auto` 또는 helper:

```cpp
auto car = GPS{Sunroof{CClassCar{}}};   // C++17 CTAD
```

## 비교 — 런타임 vs 컴파일 타임

| 측면 | 상속 기반 | 템플릿 기반 |
|---|---|---|
| 결정 시점 | 런타임 | 컴파일 타임 |
| 성능 | virtual 비용 | 0 (인라인) |
| 유연성 | 런타임 조합 | 컴파일 타임 고정 |
| 타입 | 단일 (Item*) | 복합 타입 |
| 메모리 | 힙 (보통) | 스택 가능 |
| 사용자 입장 | 깔끔 | 타입 복잡 |

**런타임** — 사용자 입력에 따라 옵션 결정.
**컴파일 타임** — 설정이 정적이고 — 성능 핵심.

## std::pmr — Decorator 예

```cpp
std::pmr::memory_resource* base = std::pmr::new_delete_resource();
std::pmr::synchronized_pool_resource pool{base};        // base를 감쌈
std::pmr::monotonic_buffer_resource buf{&pool};        // pool을 감쌈

std::pmr::vector<int> v{&buf};
```

각 레이어 — 메모리 자원에 기능 추가. 동기화, 풀링, 모노토닉 등. C++17 표준 라이브러리의 Decorator 응용.

## 함수 Decorator — 함수의 일을 확장

```cpp
template<typename F>
auto logged(F f) {
    return [f = std::move(f)](auto&&... args) {
        std::cout << "calling...\n";
        auto result = f(std::forward<decltype(args)>(args)...);
        std::cout << "done\n";
        return result;
    };
}

template<typename F>
auto timed(F f) {
    return [f = std::move(f)](auto&&... args) {
        auto start = std::chrono::steady_clock::now();
        auto result = f(std::forward<decltype(args)>(args)...);
        auto end = std::chrono::steady_clock::now();
        std::cout << (end - start).count() << "ns\n";
        return result;
    };
}

auto fn = timed(logged([](int x) { return x * 2; }));
fn(5);    // log + 측정 + 본체 호출
```

함수형 스타일의 decorator. Python 데코레이터 ≈.

## Range Adapter — 모던 사례

```cpp
auto v = std::views::iota(1, 100)
    | std::views::filter([](int x) { return x % 2 == 0; })
    | std::views::transform([](int x) { return x * x; })
    | std::views::take(5);
```

각 `views::*` — 이전 view를 감쌈. Decorator + Pipeline 결합. C++20.

## 함정 — Decorator 깊이 폭주

```cpp
auto car = make_unique<CClassCar>();
car = make_unique<Sunroof>(std::move(car));
car = make_unique<Sunroof>(std::move(car));        // 중복 OK? — 의미는?
car = make_unique<GPS>(std::move(car));
car = make_unique<Sunroof>(std::move(car));         // 또?
```

같은 decorator 중복 — 의미 모호. 도메인 규칙으로 제어 필요. 검증 메서드 또는 fluent API.

## 함정 — Decorator vs 단순 멤버

```cpp
// Decorator 과용
auto car = make_unique<RedColor>(
    make_unique<Wheels<18>>(
        make_unique<Engine<300>>(
            make_unique<CClassCar>())));

// 더 간단한 대안
struct CarConfig {
    int hp = 300;
    int wheel_size = 18;
    Color color = Color::Red;
};
CClassCar car{CarConfig{}};
```

**언제 Decorator?**
- 책임 추가가 **수직적** — 우주적, 행동 변경
- 조합이 **다양** — 모든 경우의 수
- 결정 시점이 **런타임**

**언제 단순 멤버?**
- 단순 데이터 변형
- 조합이 한정적
- 결정이 정적

## 함정 — Decorator 순서

```cpp
auto a = Encrypt{Compress{file}};        // 압축 후 암호화
auto b = Compress{Encrypt{file}};         // 암호화 후 압축

// a와 b — 다른 결과!
```

Decorator는 — 일반적으로 **순서 의존**. 도메인이 순서를 정의해야.

## 함정 — Decorator vs Strategy 혼동

| | Decorator | Strategy |
|---|---|---|
| 의도 | 책임 **추가** | 알고리즘 **교체** |
| 구조 | 객체 감싸기 | 객체 보관 |
| 호출 | 본체 + 추가 | 보유한 알고리즘 |
| 조합 | 다중 가능 | 1개씩 교체 |

같은 다형성 — 다른 목적. 가이드라인 19 (Strategy)와 구분.

## 모던 변형 — Type Erasure + Decorator

```cpp
class Item {
    struct Concept {
        virtual double price() const = 0;
        virtual ~Concept() = default;
    };
    template<typename T>
    struct Model : Concept { 
        T data_;
        double price() const override { return data_.price(); }
    };
    std::unique_ptr<Concept> pimpl_;
public:
    template<typename T>
    Item(T t) : pimpl_(std::make_unique<Model<T>>(std::move(t))) {}
    double price() const { return pimpl_->price(); }
};

template<typename T>
class Sunroof {
    T wrapped_;
public:
    Sunroof(T w) : wrapped_(std::move(w)) {}
    double price() const { return wrapped_.price() + 3000; }
};

Item car = Sunroof{CClassCar{}};
// Type erasure가 외부 인터페이스 — decorator는 컴파일 타임 적용
```

값 의미론 + 컴파일 타임 decorator 결합. Iglberger의 추천 방식.

## Decorator vs Pipeline

```cpp
// Pipeline (range-v3 style)
auto result = data 
    | filter(pred1) 
    | transform(fn1) 
    | reduce(0, std::plus{});

// Decorator (object style)
auto pipeline = Reduce{0, std::plus{}, 
                  Transform{fn1, 
                    Filter{pred1, data}}};
```

표현은 달라도 — 본질 유사. **데이터/책임의 layered 처리**.

## 실무 가이드 — 결정 트리

```
기능 추가 방식 결정:
├── 컴파일 타임 + 성능 핵심 → 템플릿 Decorator
├── 런타임 조합 + 사용자 선택 → 상속 Decorator
├── 함수 변환 + 함수형 스타일 → 함수 Decorator (lambda)
├── 데이터 변형 흐름 → Range Adapter (views)
└── 단순한 옵션 → CarConfig 등 데이터 멤버
```

## 실무 가이드 — 체크리스트

- [ ] 책임이 **수직적** — Decorator 합당?
- [ ] 동일 인터페이스 유지 — wrapped와 wrapper 같은 시그니처?
- [ ] 결정 시점 (런타임/컴파일) — 적절한 구현 선택?
- [ ] 순서 의미 — 도메인이 명확히 정의?
- [ ] 깊이 제한 — 무한 중첩 방지?
- [ ] Strategy와 혼동 — 의도가 추가인지 교체인지?

## 핵심 정리

1. **Decorator** — 동일 인터페이스로 객체를 감싸 책임 추가
2. **상속 기반** — 런타임 조합, virtual 비용
3. **템플릿 기반** — 컴파일 타임 결정, 0 비용
4. **함수 decorator** — lambda, 함수형
5. **Range adapter** — C++20 views, pipeline 스타일
6. **순서 의존** — 도메인이 의미 정의 필요

## 관련 항목

- [GoF Decorator](/blog/programming/gof-design-patterns/item11-decorator) — GoF 측면
- [가이드라인 19: Strategy](/blog/programming/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — 다른 의도
- [가이드라인 20: Composition over Inheritance](/blog/programming/cpp-software-design/guideline20-favor-composition-over-inheritance) — 같은 정신
- [가이드라인 32: Type Erasure](/blog/programming/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 결합 패턴
