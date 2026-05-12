---
title: "항목 35: 가상 함수의 대안을 고려하라"
date: 2025-02-06T13:00:00
description: "NVI, Strategy 패턴, std::function, 템플릿 — 다형성 구현의 다양한 방법과 그 트레이드오프."
tags: [C++, Effective C++, Virtual, Design Pattern]
series: "Effective C++"
seriesOrder: 35
---

## 개요

가상 함수는 다형성의 가장 직관적 도구지만 — 유일한 도구는 아닙니다. **NVI**(Non-Virtual Interface), **Strategy** 패턴, **`std::function`**, **템플릿** 등 각자 다른 트레이드오프를 가진 대안이 있습니다. 이 항목은 다섯 가지 접근법을 비교하고, 도메인에 맞는 도구를 선택하는 기준을 제시합니다.

## 시작 — 평범한 가상 함수

```cpp
class GameCharacter {
public:
    virtual int healthValue() const {     // 기본 구현
        return 100;
    }
};

class Warrior : public GameCharacter {
public:
    int healthValue() const override {     // 다른 구현
        return baseHealth + armor;
    }
};
```

장점: 단순, 의도 명확.
단점: derived마다 클래스 필요, 사전·사후 처리 분리 불가, 클래스 단위 다형성만.

## 대안 1 — NVI (Non-Virtual Interface)

public 인터페이스는 non-virtual, 내부에서 private virtual을 호출:

```cpp
class GameCharacter {
public:
    int healthValue() const {           // ✅ non-virtual 공개
        // 사전 처리 (mutex 잠금, 로깅, 검증)
        std::lock_guard lock(mu);
        log("healthValue called");

        int retVal = doHealthValue();    // private virtual 호출

        // 사후 처리
        log("healthValue returned " + std::to_string(retVal));
        return retVal;
    }

private:
    virtual int doHealthValue() const { return 100; }     // hook
    mutable std::mutex mu;
};

class Warrior : public GameCharacter {
private:
    int doHealthValue() const override { return baseHealth + armor; }
};
```

**Template Method 패턴**의 C++ 적용 — base가 호출 시점을 통제, derived는 핵심 로직만 변경.

장점:
- base가 사전·사후 처리 제어 (로깅, 잠금, 검증)
- derived가 일관된 컨텍스트에서 호출됨
- public 인터페이스 변경이 derived에 영향 없음 (private virtual만 contract)

단점:
- 약간의 코드 복잡도 (래퍼 함수)
- 가상 호출 비용 (NVI 자체는 안 줄임)

## 대안 2 — Strategy: 함수 포인터

다형성을 **객체 단위**로:

```cpp
class GameCharacter;
int defaultHealthCalc(const GameCharacter&);

class GameCharacter {
    using HealthCalcFunc = int (*)(const GameCharacter&);
    HealthCalcFunc healthFunc;
public:
    explicit GameCharacter(HealthCalcFunc f = defaultHealthCalc)
        : healthFunc(f) {}

    int healthValue() const {
        return healthFunc(*this);
    }
};

int strongHealthCalc(const GameCharacter& c) { return 200; }
int weakHealthCalc  (const GameCharacter& c) { return  50; }

GameCharacter c1(strongHealthCalc);
GameCharacter c2(weakHealthCalc);
GameCharacter c3;                    // default
```

장점:
- 객체별로 다른 동작 — 클래스 단위 아님
- 런타임에 동작 교체 가능 (`c1.setHealthFunc(...)`)
- 새 전략 추가에 클래스 상속 불필요

단점:
- 함수 포인터는 객체 상태에 접근하기 어려움 (전부 인자로 받아야)
- private 멤버 접근 — friend 또는 public 노출 필요

## 대안 3 — Strategy: `std::function`

`std::function`이 함수 포인터·람다·함수 객체·멤버 함수 모두 받음:

```cpp
class GameCharacter {
    std::function<int(const GameCharacter&)> healthFunc;
public:
    template<typename F>
    explicit GameCharacter(F f = defaultHealthCalc)
        : healthFunc(std::move(f)) {}

    int healthValue() const {
        return healthFunc(*this);
    }
};

// 다양한 callable 모두 가능
GameCharacter c1(strongHealthCalc);
GameCharacter c2([](const GameCharacter& c) { return c.level * 10; });

struct ComplexCalc {
    int base;
    int operator()(const GameCharacter& c) const { return base + c.armor; }
};
GameCharacter c3(ComplexCalc{50});

class Boss {
public:
    int specialCalc(const GameCharacter& c) const { return c.level * 100; }
};
Boss b;
GameCharacter c4(std::bind(&Boss::specialCalc, &b, std::placeholders::_1));
```

장점:
- **매우 유연** — 어떤 callable이든 OK
- 람다로 인라인 정의 가능 — 클래스 상속 없이

단점:
- **Type erasure 비용** — 보통 작지만 0은 아님 (간접 호출, 동적 할당 가능)
- 컴파일 시간 ↑ (template 인스턴스화)
- 디버깅 정보가 generic해짐

## 대안 4 — Strategy: 다른 클래스 계층 (전통적 Strategy)

```cpp
class HealthCalcFunc {
public:
    virtual ~HealthCalcFunc() = default;
    virtual int calc(const GameCharacter&) const = 0;
};

class DefaultHealthCalc : public HealthCalcFunc {
public:
    int calc(const GameCharacter& c) const override { return 100; }
};

class StrongHealthCalc : public HealthCalcFunc {
public:
    int calc(const GameCharacter& c) const override { return 200; }
};

class GameCharacter {
    HealthCalcFunc* pHealthCalc;
public:
    int healthValue() const {
        return pHealthCalc->calc(*this);
    }
};
```

장점:
- 전략 객체에 **상태와 메서드** 보관 가능
- 표준 GoF Strategy 패턴 — 가장 일반적·확장 가능

단점:
- 보일러플레이트 (클래스 정의 다수)
- 객체 라이프타임 관리 (`unique_ptr<HealthCalcFunc>` 권장)

## 대안 5 — 템플릿 (Compile-time Polymorphism)

```cpp
template<typename HealthCalc>
class GameCharacter {
    HealthCalc healthCalc;
public:
    explicit GameCharacter(HealthCalc f = HealthCalc{})
        : healthCalc(std::move(f)) {}

    int healthValue() const {
        return healthCalc(*this);     // 컴파일 타임 호출
    }
};

struct DefaultHealthCalc {
    template<typename Char>
    int operator()(const Char& c) const { return 100; }
};

struct StrongHealthCalc {
    template<typename Char>
    int operator()(const Char& c) const { return 200; }
};

GameCharacter<DefaultHealthCalc> c1;
GameCharacter<StrongHealthCalc>  c2;
```

장점:
- **런타임 비용 0** — 모든 호출이 정적
- 컴파일러 인라인 가능
- 강력한 최적화

단점:
- **다른 `HealthCalc`을 가진 객체는 별개 타입** — `c1`과 `c2`를 같은 컨테이너에 못 담음
- 컴파일 시간 ↑
- 에러 메시지 복잡 (concepts로 개선)

### 임베디드 실전 예 — RTOS 비교를 위한 LockGuard

게임 캐릭터 예제는 추상적이라 와닿지 않을 수 있다. **공통 베이스 클래스 없이도** 정적 다형성을 쓰는 전형적 패턴은 임베디드에서 RTOS 추상화:

```cpp
template<typename MutexType>
class GenericLockGuard {
    MutexType& m;
public:
    explicit GenericLockGuard(MutexType& mtx) : m(mtx) { m.Lock(); }
    ~GenericLockGuard()                                 { m.Unlock(); }
    GenericLockGuard(const GenericLockGuard&)            = delete;
    GenericLockGuard& operator=(const GenericLockGuard&) = delete;
};

class FreeRTOSLock { public: void Lock(); void Unlock(); };
class ThreadXLock  { public: void Lock(); void Unlock(); };

FreeRTOSLock fLk; ThreadXLock tLk;
{
    GenericLockGuard g1(fLk);   // OK — FreeRTOSLock에 Lock/Unlock 있음
    GenericLockGuard g2(tLk);   // OK — ThreadXLock에도 있음
}
```

두 락 클래스는 **같은 상속 계통이 아니다** — 그저 `Lock()`/`Unlock()`이라는 *암묵 인터페이스* ([항목 41](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism))만 공유한다. 가상 함수로 했다면 추상 베이스 `IMutex`를 만들고 `FreeRTOSLock`/`ThreadXLock`이 *제3자 라이브러리라면 손도 못 대므로* 어댑터까지 동원해야 했을 것. 템플릿은 그 모든 의식을 건너뛴다 — vtable 비용은 0이고, **다른 인스턴스가 각자 코드를 생성하므로 코드 크기는 늘어난다** (트레이드오프).

> 💡 **C++20 concepts**로 "`Lock()`과 `Unlock()`이 있는 타입만" 이라는 제약을 *명시적으로* 적을 수 있다 — 잘못된 타입을 넣었을 때의 에러 메시지가 훨씬 짧아진다.
>
> ```cpp
> template<typename T>
> concept Lockable = requires(T m) { m.Lock(); m.Unlock(); };
>
> template<Lockable MutexType>
> class GenericLockGuard { /* … */ };
> ```

## 트레이드오프 비교

| 방식 | 런타임 비용 | 동작 변경 단위 | 코드 복잡도 | 라이프타임 |
| --- | --- | --- | --- | --- |
| 가상 함수 | vtable 디스패치 | 클래스 | 단순 | 객체 라이프타임 |
| NVI | 가상 호출 + 래퍼 | 클래스 | 약간 | 객체 라이프타임 |
| 함수 포인터 | 간접 호출 | 객체 | 단순 | 객체 라이프타임 |
| `std::function` | type erasure | 객체 | 단순 | 객체 라이프타임 |
| Strategy 클래스 | 가상 호출 | 객체 | 복잡 | 전략 객체 별도 관리 |
| 템플릿 | **0** | 컴파일 타임 | 단순~복잡 | N/A |

## 실무 결정 — 어떤 도구를?

### NVI: 사전·사후 처리가 의미 있을 때

```cpp
class Cache {
public:
    Value get(Key k) {
        std::lock_guard lock(mu);    // 모든 get에 잠금
        return doGet(k);
    }
private:
    virtual Value doGet(Key k) = 0;   // derived가 핵심 로직
};
```

### 함수 포인터: 단순·가벼움이 핵심

C 라이브러리와의 통합, GPU 콜백, 마이크로 컨트롤러 등.

### `std::function`: 일반 GUI / 이벤트 시스템

```cpp
class Button {
    std::function<void()> onClick;
public:
    void setOnClick(std::function<void()> f) { onClick = std::move(f); }
    void click() { if (onClick) onClick(); }
};

Button b;
b.setOnClick([&]() { count++; });
```

### Strategy 클래스: 전략 자체가 상태·기능 다수

OOP 디자인 패턴 책의 정석 사용처. 알고리즘이 복잡하고 상태가 있을 때.

### 템플릿: 컴파일 타임에 결정 가능 + 성능 critical

STL 알고리즘, 컨테이너의 비교 함수 — 모두 템플릿 기반.

```cpp
std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });
// lambda는 unique type — 컴파일 타임 결정 + 인라인
```

## 흔한 함정 — 도구 잘못 선택

### `std::function`을 hot loop에

```cpp
for (int i = 0; i < 1'000'000; ++i) {
    handler(i);     // std::function 호출 — type erasure 비용 누적
}
```

같은 hot path는 템플릿이 적절.

### 가상 함수를 단순 콜백에

```cpp
class EventBase {
public:
    virtual void handle() = 0;
};

class ButtonClick : public EventBase {
    void handle() override { /* 한 줄짜리 */ }
};
// 한 줄 처리에 클래스 정의 — 보일러플레이트
```

`std::function` 또는 람다가 더 깔끔.

## 모던 변형 — concepts와 CRTP

### CRTP (Curiously Recurring Template Pattern)

```cpp
template<typename Derived>
class Base {
public:
    void interface() {
        static_cast<Derived*>(this)->impl();   // 정적 디스패치
    }
};

class Derived : public Base<Derived> {
public:
    void impl() { /* ... */ }
};
```

가상 함수 비용 없는 컴파일 타임 다형성. mixin 패턴.

### Type erasure with concepts (C++20)

```cpp
template<typename T>
concept Drawable = requires(const T& t) {
    t.draw();
};

class AnyDrawable {
    // 내부적으로 std::function 또는 PIMPL로 type erasure
public:
    template<Drawable T>
    AnyDrawable(T t) : impl(std::make_unique<Model<T>>(std::move(t))) {}
    void draw() const { impl->draw(); }
};
```

`std::function`의 일반화 — 임의 인터페이스 타입.

## 실무 가이드 — 체크리스트

다형성 도구 선택 시:

- [ ] 사전·사후 처리가 의미 있는가? → NVI
- [ ] 객체별로 다른 동작이 필요? → Strategy (function pointer / `std::function` / 클래스)
- [ ] 런타임 비용 critical, 컴파일 타임 결정 가능? → 템플릿
- [ ] 표준 라이브러리 알고리즘 호환? → callable / template
- [ ] 한 클래스 계층 안에서 자연스러운 다형성? → 가상 함수
- [ ] hot path? → 측정 후 결정

## 핵심 정리

1. **가상 함수만이 다형성의 답이 아니다**
2. **NVI** — base가 사전·사후 처리 통제 (Template Method)
3. **Strategy (함수 포인터, `std::function`, 클래스)** — 객체별 동작
4. **템플릿** — 컴파일 타임 다형성, 런타임 비용 0
5. 도구별 트레이드오프: 비용, 변경 단위, 복잡도, 라이프타임
6. `std::function`은 hot loop에서 type erasure 비용 주의

## 관련 항목

- [항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 가상 함수의 LSP 책임
- [항목 34: 인터페이스 vs 구현 상속](/blog/programming/cpp/effective-cpp/item34-differentiate-between-inheritance-of-interface-and-inheritance-of-implementation) — 가상 함수 종류
- [항목 41: 암묵 인터페이스 + 컴파일 타임 다형성](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 템플릿 다형성
