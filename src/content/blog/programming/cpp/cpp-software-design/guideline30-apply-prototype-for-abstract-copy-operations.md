---
title: "가이드라인 30: 추상 복사 연산에는 Prototype을 적용하라"
date: 2026-05-15T01:00:00
description: "다형 객체의 복사 문제는 virtual clone()으로 풀린다. Prototype 패턴은 base 포인터에서 정확한 derived 타입을 그대로 복제하게 해 준다."
tags: [C++, Software Design, Prototype, GoF, Polymorphism]
series: "C++ Software Design"
seriesOrder: 30
---

## 왜 이 가이드라인이 중요한가?

다형 객체에는 **복사 문제**가 따라붙는다.

```cpp
std::unique_ptr<Animal> pet = std::make_unique<Dog>("Rex");
std::unique_ptr<Animal> copy = ???;        // 어떻게 복제할까?
```

- 일반 복사 생성자는 `Animal`로 슬라이싱이 일어나 Dog의 데이터를 잃는다
- 컴파일 타임에는 정확한 타입을 알 수 없다

**Prototype 패턴**은 `virtual clone()` 메서드로 이 문제를 해결한다. 객체가 자기 자신을 복제하기 때문에 호출자는 정확한 타입을 몰라도 된다.

GoF 23개 패턴 중 하나이며, C++에서는 다형 복사의 표준적인 해법이다. 슬라이싱을 깔끔하게 피할 수 있다.

GoF 관점의 자세한 설명은 [GoF Prototype](/blog/programming/design/gof-design-patterns/item05-prototype)을 참고하라.

## 핵심 문제 — 슬라이싱

```cpp
class Animal {
public:
    virtual ~Animal() = default;
    virtual void speak() const = 0;
    std::string name_;
};

class Dog : public Animal {
public:
    void speak() const override { std::cout << "Woof"; }
    std::string breed_;        // Dog 전용
};

Dog rex{"Rex", "Labrador"};
Animal a = rex;            // ❌ 슬라이싱 — breed_가 잘려 나간다
                           //    speak()도 Animal::speak가 호출된다 (있다면)
```

복사하는 순간 **객체가 잘린다**. C++ 특유의 함정이다.

## Prototype 솔루션

```cpp
class Animal {
public:
    virtual ~Animal() = default;
    virtual std::unique_ptr<Animal> clone() const = 0;       // ← Prototype 메서드
    virtual void speak() const = 0;
    std::string name_;
};

class Dog : public Animal {
public:
    std::unique_ptr<Animal> clone() const override {
        return std::make_unique<Dog>(*this);            // covariant 복제
    }
    void speak() const override { std::cout << "Woof"; }
    std::string breed_;
};

class Cat : public Animal {
public:
    std::unique_ptr<Animal> clone() const override {
        return std::make_unique<Cat>(*this);
    }
    void speak() const override { std::cout << "Meow"; }
};
```

사용은 다음과 같다.

```cpp
std::unique_ptr<Animal> pet = std::make_unique<Dog>("Rex", "Labrador");
auto copy = pet->clone();
copy->speak();    // "Woof" — Dog가 정확히 복제됐다
```

## 메커니즘 — derived가 자기를 복제한다

`clone()`의 본질은 derived 클래스가 **자신의 타입을 안다**는 사실이다.

```cpp
std::unique_ptr<Animal> Dog::clone() const {
    return std::make_unique<Dog>(*this);    // Dog가 자신을 복제 — 정확한 타입
}
```

- 호출자는 `unique_ptr<Animal>`만 받으면 되고, 정확한 타입을 몰라도 된다
- 객체 자신은 타입을 알고 있으므로 정확히 복제할 수 있다

다형 복사를 다루는 정석이다.

## Covariant 반환 — 선택적

C++은 covariant return을 지원한다.

```cpp
class Animal {
public:
    virtual Animal* clone() const = 0;        // raw pointer를 쓰는 경우
};

class Dog : public Animal {
public:
    Dog* clone() const override {              // covariant — Dog*를 반환할 수 있다
        return new Dog(*this);
    }
};

Dog* d1 = new Dog{};
Dog* d2 = d1->clone();    // 그냥 Dog* — 캐스팅 불필요
```

다만 `unique_ptr<Derived>`는 covariant가 동작하지 않으므로, 보통은 `unique_ptr<Animal>` 반환을 권장한다.

## 추상 팩토리 vs Prototype

| 측면 | Abstract Factory | Prototype |
|---|---|---|
| 의도 | 패밀리 생성 | 객체 복제 |
| 인스턴스 | 새로 만든다 | 기존 객체를 복제한다 |
| 등록 | 컴파일 타임 | 런타임 가능 |
| 상태 보존 | 아니다 | 그렇다 (복사된다) |

Prototype의 강점은 **런타임에 등록한 객체로 복제**할 수 있다는 점이다.

```cpp
class AnimalRegistry {
    std::map<std::string, std::unique_ptr<Animal>> prototypes_;
public:
    void registerPrototype(const std::string& key, std::unique_ptr<Animal> p) {
        prototypes_[key] = std::move(p);
    }
    
    std::unique_ptr<Animal> create(const std::string& key) const {
        return prototypes_.at(key)->clone();    // 런타임에 결정된다
    }
};

AnimalRegistry registry;
registry.registerPrototype("rex", std::make_unique<Dog>("Rex", "Labrador"));
registry.registerPrototype("whiskers", std::make_unique<Cat>("Whiskers"));

auto pet = registry.create("rex");    // 런타임에 어느 타입인지 결정된다
```

## Deep Copy vs Shallow Copy

```cpp
class Container {
    std::vector<std::unique_ptr<Animal>> animals_;
public:
    Container(const Container& other) {
        for (const auto& a : other.animals_) {
            animals_.push_back(a->clone());        // ✅ 깊은 복사
        }
    }
};
```

```cpp
class ContainerBad {
    std::vector<std::unique_ptr<Animal>> animals_;
public:
    ContainerBad(const ContainerBad& other) = default;     // ❌ unique_ptr는 복사 불가 — 컴파일 에러
};

class ContainerWorse {
    std::vector<Animal*> animals_;
public:
    ContainerWorse(const ContainerWorse& other) = default;     // ❌ shallow copy — 같은 객체를 공유한다
};
```

다형 컨테이너에서 깊은 복사를 하려면 `clone()`이 사실상 필수다.

## Curiously Recurring 변형 — Cloneable Mixin

CRTP로 boilerplate를 줄일 수 있다.

```cpp
template<typename Derived, typename Base>
class Cloneable : public Base {
public:
    std::unique_ptr<Base> clone() const override {
        return std::make_unique<Derived>(static_cast<const Derived&>(*this));
    }
};

class Animal {
public:
    virtual ~Animal() = default;
    virtual std::unique_ptr<Animal> clone() const = 0;
};

class Dog : public Cloneable<Dog, Animal> {
    // clone()이 자동 구현된다
public:
    void speak() const { std::cout << "Woof"; }
};
```

CRTP 자체에 대한 설명은 [가이드라인 26](/blog/programming/cpp/cpp-software-design/guideline26-use-crtp-to-introduce-static-type-categories)을 참고하라.

## 함정 — clone()을 잊는다

```cpp
class Animal {
public:
    virtual ~Animal() = default;
    virtual std::unique_ptr<Animal> clone() const = 0;
};

class Dog : public Animal {
    // clone()을 구현하지 않으면 컴파일 에러 (순수 가상)
};

class Cat : public Animal {
    std::unique_ptr<Animal> clone() const override {
        return std::make_unique<Cat>(*this);    
    }
};

class Husky : public Dog {
    // clone() 오버라이드를 깜빡 → 컴파일은 되지만 Dog::clone을 상속한다
    //                            → Husky를 복제하면 Dog가 나온다 (slicing!)
};
```

이 함정이 가장 흔하다. 계층이 깊어지면 매 derived마다 `clone()`을 다시 정의해야 한다. CRTP나 매크로로 자동화하는 편이 안전하다.

## 함정 — 복사 생성자와 clone()의 일관성

```cpp
class Dog : public Animal {
    std::string breed_;
    int age_;
public:
    Dog(const Dog& other) : Animal(other), breed_(other.breed_) {}
    //                                       ^ age_ 복사를 잊었다
    
    std::unique_ptr<Animal> clone() const override {
        return std::make_unique<Dog>(*this);    // 버그가 있는 copy ctor를 호출한다
    }
};
```

`clone()`은 결국 복사 생성자에 의존한다. 복사 생성자에 버그가 있으면 `clone()`까지 그대로 옮겨 간다. 복사 생성자를 직접 정의하지 않는 **rule of zero**가 가장 안전하다.

## 모던 변형 — Type Erasure로 대체

```cpp
class AnimalErased {
    struct Concept {
        virtual ~Concept() = default;
        virtual std::unique_ptr<Concept> clone() const = 0;
        virtual void speak() const = 0;
    };
    
    template<typename T>
    struct Model : Concept {
        T data_;
        std::unique_ptr<Concept> clone() const override {
            return std::make_unique<Model>(*this);
        }
        void speak() const override { data_.speak(); }
    };
    
    std::unique_ptr<Concept> pimpl_;
    
public:
    template<typename T>
    AnimalErased(T t) : pimpl_(std::make_unique<Model<T>>(std::move(t))) {}
    
    AnimalErased(const AnimalErased& other) : pimpl_(other.pimpl_->clone()) {}
    // ↑ 깊은 복사를 자동으로 처리한다
};
```

Type erasure에서도 Concept 내부에 `clone()`이 필수다. 값 의미론 컨테이너에 그대로 담아 쓸 수 있다.

자세한 내용은 [가이드라인 32](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure)에서 다룬다.

## 흔한 패턴 — protected copy ctor

직접 복사는 막고 `clone()`만 허용하는 방식이다.

```cpp
class Animal {
protected:
    Animal(const Animal&) = default;        // protected — derived에서만 쓴다
public:
    Animal() = default;
    virtual std::unique_ptr<Animal> clone() const = 0;
};

Animal a, b;
a = b;        // ❌ 컴파일 에러 (protected)
auto c = a.clone();    // ✅ OK
```

다형 사용을 강제할 수 있고, 일반 복사를 시도하면 컴파일 에러로 안내된다.

## 비교 — 다양한 대안

| 방법 | 슬라이싱 회피 | 코드 양 | 성능 |
|---|---|---|---|
| 일반 복사 ctor | ❌ slice | 적다 | 빠르다 |
| `virtual clone()` | ✅ | derived마다 작성 | virtual 비용 |
| CRTP `Cloneable` | ✅ | 자동 | virtual 비용 |
| `std::variant` | ✅ | 중간 | 빠르다 (no virtual) |
| Type erasure | ✅ | 많다 | virtual 비용 |

## 실무 가이드 — 결정 트리

```
다형 객체 복사가 필요한가?
├── 닫힌 타입 집합 → std::variant + std::visit (가이드라인 17)
├── 열린 타입 집합 → Prototype (clone()) 패턴
├── 값 의미론 컨테이너 → Type erasure (가이드라인 32)
└── 단일 derived만 복사 → 정적 캐스트 + 일반 ctor
```

## 실무 가이드 — 체크리스트

- [ ] base에 `virtual clone()` 또는 동등 메커니즘이 있는가?
- [ ] 모든 derived가 `clone()`을 오버라이드했는가?
- [ ] 새 derived를 추가할 때 `clone()`을 잊지 않도록 CRTP나 매크로를 썼는가?
- [ ] 직접 정의한 복사 생성자가 있다면 `clone()`과 일관성이 유지되는가?
- [ ] 다형 컨테이너에서 깊은 복사에 `clone()`을 활용하는가?

## 핵심 정리

1. **다형 객체 복사** — 일반 ctor는 슬라이싱을 일으킨다
2. **Prototype 패턴** — `virtual clone()` 메서드가 해법이다
3. **각 derived**가 자기 자신을 `make_unique<Derived>(*this)`로 복제한다
4. **CRTP Cloneable**로 boilerplate를 자동화한다
5. **다형 컨테이너**의 깊은 복사에는 `clone()`을 활용한다
6. **모던 대안**으로 `std::variant`(닫힌 집합)와 Type erasure가 있다

## 관련 항목

- [GoF Prototype](/blog/programming/design/gof-design-patterns/item05-prototype) — GoF 관점
- [가이드라인 17: std::variant](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 닫힌 집합 대안
- [가이드라인 26: CRTP](/blog/programming/cpp/cpp-software-design/guideline26-use-crtp-to-introduce-static-type-categories) — Cloneable mixin
- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 또 다른 대안
