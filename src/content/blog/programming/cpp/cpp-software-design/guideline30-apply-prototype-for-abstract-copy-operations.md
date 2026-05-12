---
title: "가이드라인 30: 추상 복사 연산에는 Prototype을 적용하라"
date: 2026-05-15T01:00:00
description: "다형 객체의 복사 — virtual clone(). Prototype 패턴 — base 포인터로 정확한 derived 타입 복제."
tags: [C++, Software Design, Prototype, GoF, Polymorphism]
series: "C++ Software Design"
seriesOrder: 30
---

## 왜 이 가이드라인이 중요한가?

다형 객체의 **복사 문제**:

```cpp
std::unique_ptr<Animal> pet = std::make_unique<Dog>("Rex");
std::unique_ptr<Animal> copy = ???;        // 어떻게 복제?
```

- 일반 복사 ctor — `Animal` 슬라이싱 — Dog의 데이터 잃음
- 컴파일 타임엔 — 타입 모름

**Prototype 패턴** — `virtual clone()` 메서드. 객체가 자신을 복제. 호출자 — 정확한 타입 모름.

GoF 23 패턴 중 하나. C++에선 — 다형 복사의 표준 솔루션. 슬라이싱 회피.

자세한 GoF 측면 — [GoF Prototype](/blog/programming/design/gof-design-patterns/item05-prototype).

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
Animal a = rex;            // ❌ 슬라이싱 — breed_ 잃음
                            //    speak()도 Animal::speak 호출 (있다면)
```

복사 시 — **객체 잘림**. C++의 함정.

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

**사용**:

```cpp
std::unique_ptr<Animal> pet = std::make_unique<Dog>("Rex", "Labrador");
auto copy = pet->clone();
copy->speak();    // "Woof" — Dog 정확히 복제됨
```

## 메커니즘 — 각 derived가 자기 복제

clone()의 본질 — derived 클래스가 **자신의 타입을 안다**:

```cpp
std::unique_ptr<Animal> Dog::clone() const {
    return std::make_unique<Dog>(*this);    // Dog가 자신을 복제 — 정확한 타입
}
```

- 호출자 — `unique_ptr<Animal>` 받음, 정확한 타입 몰라도 OK
- 객체 자신 — 타입을 알기에 — 정확히 복제

다형 복사의 정석 해결.

## Covariant 반환 — 선택적

C++ — covariant return 지원:

```cpp
class Animal {
public:
    virtual Animal* clone() const = 0;        // raw pointer 사용 시
};

class Dog : public Animal {
public:
    Dog* clone() const override {              // covariant — Dog* 반환 가능
        return new Dog(*this);
    }
};

Dog* d1 = new Dog{};
Dog* d2 = d1->clone();    // 그냥 Dog* — 캐스팅 불필요
```

그러나 `unique_ptr<Derived>`는 covariant 안 됨 — `unique_ptr<Animal>` 반환 권장.

## 추상 팩토리 vs Prototype

| 측면 | Abstract Factory | Prototype |
|---|---|---|
| 의도 | 패밀리 생성 | 객체 복제 |
| 인스턴스 | 새로 생성 | 기존 객체 복제 |
| 등록 | 컴파일 타임 | 런타임 가능 |
| 상태 보존 | 아니오 | 예 (복사) |

**Prototype의 강점** — 런타임에 등록된 객체로 복제.

```cpp
class AnimalRegistry {
    std::map<std::string, std::unique_ptr<Animal>> prototypes_;
public:
    void registerPrototype(const std::string& key, std::unique_ptr<Animal> p) {
        prototypes_[key] = std::move(p);
    }
    
    std::unique_ptr<Animal> create(const std::string& key) const {
        return prototypes_.at(key)->clone();    // 런타임에 결정
    }
};

AnimalRegistry registry;
registry.registerPrototype("rex", std::make_unique<Dog>("Rex", "Labrador"));
registry.registerPrototype("whiskers", std::make_unique<Cat>("Whiskers"));

auto pet = registry.create("rex");    // 런타임에 어느 타입인지 결정
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
    ContainerBad(const ContainerBad& other) = default;     // ❌ unique_ptr 복사 불가 — 컴파일 에러
};

class ContainerWorse {
    std::vector<Animal*> animals_;
public:
    ContainerWorse(const ContainerWorse& other) = default;     // ❌ shallow copy — 같은 객체 공유
};
```

다형 컨테이너의 깊은 복사 — clone()이 필수.

## Curiously Recurring 변형 — Cloneable Mixin

CRTP로 boilerplate 제거:

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
    // clone() 자동 구현!
public:
    void speak() const { std::cout << "Woof"; }
};
```

CRTP — [가이드라인 26](/blog/programming/cpp/cpp-software-design/guideline26-use-crtp-to-introduce-static-type-categories).

## 함정 — clone() 잊음

```cpp
class Animal {
public:
    virtual ~Animal() = default;
    virtual std::unique_ptr<Animal> clone() const = 0;
};

class Dog : public Animal {
    // clone() 구현 잊음 → 컴파일 에러 (순수 가상)
};

class Cat : public Animal {
    std::unique_ptr<Animal> clone() const override {
        return std::make_unique<Cat>(*this);    
    }
};

class Husky : public Dog {
    // clone() 오버라이드 잊음 → 컴파일은 됨, Dog::clone 상속
                                  // → Husky를 복제하면 Dog가 나옴 (slicing!)
};
```

**핵심 함정** — 깊은 계층에선 매 derived마다 clone() 재정의 필수. CRTP 또는 매크로로 자동화.

## 함정 — 복사 생성자 vs clone() 일관성

```cpp
class Dog : public Animal {
    std::string breed_;
    int age_;
public:
    Dog(const Dog& other) : Animal(other), breed_(other.breed_) {}
    //                                       ^ age_ 복사 잊음
    
    std::unique_ptr<Animal> clone() const override {
        return std::make_unique<Dog>(*this);    // 위의 buggy copy ctor 호출
    }
};
```

clone()은 복사 ctor에 의존 — 복사 ctor 버그가 clone()으로 전파. **rule of zero**(가이드라인 복사 ctor를 정의하지 않으면 컴파일러 생성)가 안전.

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
    // ↑ 깊은 복사 자동
};
```

Type erasure에선 — Concept 내부에 clone() 필수. 값 의미론 컨테이너에 사용 가능.

자세한 내용 — [가이드라인 32](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure).

## 흔한 패턴 — protected copy ctor

객체를 직접 복사 못 하게 막고 — clone()만 허용:

```cpp
class Animal {
protected:
    Animal(const Animal&) = default;        // protected — derived만 사용
public:
    Animal() = default;
    virtual std::unique_ptr<Animal> clone() const = 0;
};

Animal a, b;
a = b;        // ❌ 컴파일 에러 (protected)
auto c = a.clone();    // ✅ OK
```

다형 사용을 강제. 일반 복사 — 컴파일 에러로 안내.

## 비교 — 다양한 대안

| 방법 | 슬라이싱 회피 | 코드 양 | 성능 |
|---|---|---|---|
| 일반 복사 ctor | ❌ slice | 적음 | 빠름 |
| `virtual clone()` | ✅ | 매 derived 작성 | virtual 비용 |
| CRTP `Cloneable` | ✅ | 자동 | virtual 비용 |
| `std::variant` | ✅ | 중간 | 빠름 (no virtual) |
| Type erasure | ✅ | 많음 | virtual 비용 |

## 실무 가이드 — 결정 트리

```
다형 객체 복사 필요?
├── 닫힌 타입 집합 → std::variant + std::visit (가이드라인 17)
├── 열린 타입 집합 → Prototype (clone()) 패턴
├── 값 의미론 컨테이너 → Type erasure (가이드라인 32)
└── 단일 derived만 복사 → 정적 캐스트 + 일반 ctor
```

## 실무 가이드 — 체크리스트

- [ ] base에 `virtual clone()` 또는 동등 메커니즘?
- [ ] 모든 derived에서 clone() 오버라이드?
- [ ] 새 derived 추가 시 — clone() 잊지 않게 CRTP 또는 매크로?
- [ ] 일반 복사 ctor가 정의됐다면 — 일관성 유지?
- [ ] 다형 컨테이너 — 깊은 복사로 clone() 활용?

## 핵심 정리

1. **다형 객체 복사** — 일반 ctor는 슬라이싱
2. **Prototype 패턴** — `virtual clone()` 메서드
3. **각 derived가** — 자신을 복제 (`make_unique<Derived>(*this)`)
4. **CRTP Cloneable** — boilerplate 자동화
5. **다형 컨테이너** — 깊은 복사에 clone() 활용
6. **모던 대안** — std::variant (닫힌 집합), Type erasure

## 관련 항목

- [GoF Prototype](/blog/programming/design/gof-design-patterns/item05-prototype) — GoF 측면
- [가이드라인 17: std::variant](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 닫힌 집합 대안
- [가이드라인 26: CRTP](/blog/programming/cpp/cpp-software-design/guideline26-use-crtp-to-introduce-static-type-categories) — Cloneable mixin
- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 다른 대안
