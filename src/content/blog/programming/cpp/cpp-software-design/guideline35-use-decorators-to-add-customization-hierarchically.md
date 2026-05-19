---
title: "가이드라인 35: Decorator로 사용자화를 계층적으로 추가하라"
date: 2026-05-02T11:00:00
description: "Decorator 패턴은 객체에 책임을 동적으로 더한다. 컴파일 타임(템플릿)과 런타임(상속) 두 변형 모두를 살펴본다."
tags: [C++, Software Design, Decorator, GoF, Composition]
series: "C++ Software Design"
seriesOrder: 35
draft: true
---

## 왜 이 가이드라인이 중요한가?

옵션이 늘어나면 기능 조합이 폭발한다.

```cpp
// 차량 옵션 — 조합이 폭발한다
class Car { ... };
class CarWithSunroof : public Car { ... };
class CarWithLeatherSeats : public Car { ... };
class CarWithSunroofAndLeatherSeats : public Car { ... };
class CarWithSunroofAndLeatherSeatsAndGPS : public Car { ... };
// ... 2^N 조합
```

옵션이 N개면 클래스가 2^N개로 늘어난다. 명백히 불가능한 접근이다.

**Decorator 패턴**은 같은 인터페이스의 객체를 **감싸서** 기능을 더한다. 조합은 자유롭게 만들 수 있다.

```cpp
auto car = std::make_unique<BasicCar>();
auto withSunroof = std::make_unique<SunroofDecorator>(std::move(car));
auto withGPS = std::make_unique<GPSDecorator>(std::move(withSunroof));
withGPS->price();    // 모든 옵션이 누적된다
```

GoF 23개 패턴 중 하나다. 자세한 GoF 측면은 [Decorator](/blog/programming/design/gof-design-patterns/item11-decorator)에서 다룬다.

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

사용은 다음과 같다.

```cpp
std::unique_ptr<Item> car = std::make_unique<CClassCar>();
car = std::make_unique<Sunroof>(std::move(car));
car = std::make_unique<GPS>(std::move(car));
std::cout << car->price();    // 50000 + 3000 + 1500 = 54500
```

## 메커니즘 — 책임의 연결

각 decorator는 자기 책임만 더하고 wrapped에 위임한다.

```cpp
double Sunroof::price() const {
    return wrapped_->price() + 3000;       // 위임 + 추가
}
```

연결 그래프는 다음과 같다.

```
GPS → Sunroof → CClassCar
       (각자 자기 가격을 더한다)
```

호출은 사슬을 타고 안쪽으로 내려갔다가 결과를 합산하며 돌아온다.

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

사용은 다음과 같다.

```cpp
GPS<Sunroof<CClassCar>> car{
    Sunroof<CClassCar>{
        CClassCar{}
    }
};
std::cout << car.price();        // 54500 — virtual 비용 0
```

타입이 길어지므로 `auto`나 헬퍼를 활용한다.

```cpp
auto car = GPS{Sunroof{CClassCar{}}};   // C++17 CTAD
```

## 비교 — 런타임 vs 컴파일 타임

| 측면 | 상속 기반 | 템플릿 기반 |
|---|---|---|
| 결정 시점 | 런타임 | 컴파일 타임 |
| 성능 | virtual 비용 | 0 (인라이닝) |
| 유연성 | 런타임 조합 | 컴파일 타임 고정 |
| 타입 | 단일 (Item*) | 복합 타입 |
| 메모리 | 힙 (보통) | 스택 가능 |
| 사용자 입장 | 깔끔 | 타입이 복잡 |

런타임 방식은 사용자 입력에 따라 옵션이 결정될 때 적합하다. 컴파일 타임 방식은 설정이 정적이고 성능이 핵심일 때 빛난다.

## std::pmr — Decorator의 예

```cpp
std::pmr::memory_resource* base = std::pmr::new_delete_resource();
std::pmr::synchronized_pool_resource pool{base};        // base를 감싼다
std::pmr::monotonic_buffer_resource buf{&pool};         // pool을 감싼다

std::pmr::vector<int> v{&buf};
```

각 레이어는 메모리 자원에 기능을 더한다. 동기화, 풀링, 모노토닉 같은 책임을 쌓아 올린다. C++17 표준 라이브러리의 Decorator 응용이다.

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
fn(5);    // 로깅 + 측정 + 본체 호출
```

함수형 스타일의 decorator다. Python의 데코레이터와 유사하다.

## Range Adapter — 모던 사례

```cpp
auto v = std::views::iota(1, 100)
    | std::views::filter([](int x) { return x % 2 == 0; })
    | std::views::transform([](int x) { return x * x; })
    | std::views::take(5);
```

각 `views::*`는 이전 view를 감싼다. Decorator와 Pipeline의 결합 형태이며, C++20에서 표준화됐다.

## 함정 — Decorator 깊이 폭주

```cpp
auto car = make_unique<CClassCar>();
car = make_unique<Sunroof>(std::move(car));
car = make_unique<Sunroof>(std::move(car));        // 중복 OK? 의미는?
car = make_unique<GPS>(std::move(car));
car = make_unique<Sunroof>(std::move(car));         // 또?
```

같은 decorator가 중복되면 의미가 모호해진다. 도메인 규칙으로 제어해야 하며, 검증 메서드나 fluent API로 막는다.

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

Decorator가 어울리는 경우는 다음과 같다.

- 책임이 **수직적**으로 쌓이고 행동을 바꾼다
- 조합이 다양해서 모든 경우의 수를 다뤄야 한다
- 결정 시점이 런타임이다

단순 멤버가 어울리는 경우는 다음과 같다.

- 단순한 데이터 변형이다
- 조합이 제한적이다
- 결정이 정적이다

## 함정 — Decorator 순서

```cpp
auto a = Encrypt{Compress{file}};        // 압축 후 암호화
auto b = Compress{Encrypt{file}};         // 암호화 후 압축

// a와 b는 결과가 다르다!
```

Decorator는 보통 **순서에 의존**한다. 의미를 정의하는 것은 도메인의 몫이다.

## 함정 — Decorator vs Strategy 혼동

| | Decorator | Strategy |
|---|---|---|
| 의도 | 책임을 **추가**한다 | 알고리즘을 **교체**한다 |
| 구조 | 객체를 감싼다 | 객체를 보관한다 |
| 호출 | 본체 + 추가 | 보유한 알고리즘만 |
| 조합 | 다중 가능 | 한 번에 하나씩 교체 |

같은 다형성이지만 목적이 다르다. 가이드라인 19의 Strategy와 명확히 구분해야 한다.

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
// Type erasure가 외부 인터페이스를 제공하고, decorator는 컴파일 타임에 적용된다
```

값 의미론과 컴파일 타임 decorator를 결합한 형태다. Iglberger가 권하는 방식이다.

## Decorator vs Pipeline

```cpp
// Pipeline (range-v3 스타일)
auto result = data 
    | filter(pred1) 
    | transform(fn1) 
    | reduce(0, std::plus{});

// Decorator (객체 스타일)
auto pipeline = Reduce{0, std::plus{}, 
                  Transform{fn1, 
                    Filter{pred1, data}}};
```

표현은 달라도 본질은 같다. 데이터와 책임을 **계층적으로 처리**한다.

## 실무 가이드 — 결정 트리

```
기능 추가 방식을 어떻게 정할까?
├── 컴파일 타임 + 성능 핵심 → 템플릿 Decorator
├── 런타임 조합 + 사용자 선택 → 상속 Decorator
├── 함수 변환 + 함수형 스타일 → 함수 Decorator (lambda)
├── 데이터 변형 흐름 → Range Adapter (views)
└── 단순한 옵션 → CarConfig 같은 데이터 멤버
```

## 실무 가이드 — 체크리스트

- [ ] 책임이 **수직적**으로 쌓이는가? Decorator가 합당한가?
- [ ] 동일 인터페이스를 유지하는가? wrapped와 wrapper가 같은 시그니처인가?
- [ ] 결정 시점(런타임/컴파일)에 맞는 구현을 골랐는가?
- [ ] 순서의 의미를 도메인이 명확히 정의했는가?
- [ ] 깊이를 제한해 무한 중첩을 막는가?
- [ ] Strategy와 혼동하지 않았는가? 의도가 추가인지 교체인지 확인했는가?

## 핵심 정리

1. **Decorator**는 같은 인터페이스로 객체를 감싸 책임을 더한다
2. **상속 기반**은 런타임 조합이 가능하지만 virtual 비용이 있다
3. **템플릿 기반**은 컴파일 타임에 결정되고 비용이 0이다
4. **함수 decorator**는 lambda 기반의 함수형 스타일이다
5. **Range adapter**는 C++20 views의 pipeline 스타일이다
6. **순서 의존**이 본질적이므로 도메인이 의미를 정의해야 한다

## 관련 항목

- [GoF Decorator](/blog/programming/design/gof-design-patterns/item11-decorator) — GoF 측면
- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — 다른 의도
- [가이드라인 20: Composition over Inheritance](/blog/programming/cpp/cpp-software-design/guideline20-favor-composition-over-inheritance) — 같은 정신
- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 결합 패턴
