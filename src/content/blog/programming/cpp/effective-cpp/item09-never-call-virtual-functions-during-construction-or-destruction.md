---
title: "항목 9: 생성·소멸 중에는 가상 함수를 호출하지 말라"
date: 2026-05-04T09:00:00
description: "생성/소멸 중 vtable이 현재 클래스를 가리키는 이유 — derived 오버라이드는 호출되지 않는다."
tags: [C++, Effective C++, Virtual, Constructor, Destructor]
series: "Effective C++"
seriesOrder: 9
draft: true
---

## 왜 이 항목이 중요한가?

생성자나 소멸자에서 가상 함수를 호출하면, "derived의 오버라이드가 호출되겠지"라는 직관과 정반대로 동작한다. **base 시점에서 호출되는 가상 함수는 base의 버전**이다. derived 부분이 아직 생성되지 않았거나(생성자) 이미 사라진(소멸자) 상태이므로, derived 오버라이드 호출은 UB로 이어진다.

이게 위험한 진짜 이유는 **컴파일러가 보통 경고하지 않는다**는 점이다. 코드는 동작하는 것처럼 보이지만 다형성이 사라진다. 로깅, 초기화 콜백, RAII 정리 같은 패턴에서 조용히 깨진다.

이 항목은 그 메커니즘(vtable의 단계적 변화)과 회피 패턴(NVI, factory + 비-virtual init)을 정리한다.

## 개요

생성자나 소멸자 안에서 가상 함수를 호출하면, **현재 실행 중인 클래스 레벨의 함수**가 호출된다. derived의 오버라이드는 호출되지 않는다. 이는 직관에 어긋나지만 C++ 객체 모델의 필연적 결과 — derived 부분이 아직 존재하지 않거나 이미 사라진 상태에서 derived 함수를 부르면 UB가 되기 때문이다.

## 함정 예제 — Transaction 로깅

```cpp
class Transaction {
public:
    Transaction() {
        logTransaction();         // ⚠️ 가상 함수 호출 from 생성자
    }
    virtual void logTransaction() const = 0;   // pure virtual
};

class BuyTransaction : public Transaction {
public:
    void logTransaction() const override {
        std::cout << "BUY: " << /* ... */;
    }
};

BuyTransaction b;
```

기대: `BuyTransaction::logTransaction`이 호출되어 "BUY: ..."가 출력될 것.

실제:

```
1. Transaction()  진입 (base 생성자)
2. Transaction::logTransaction() 호출 시도
   → pure virtual이라 정의 없음 → undefined behavior
   (대부분 컴파일러: __cxa_pure_virtual abort)
3. BuyTransaction의 멤버는 아직 생성도 안 됨
```

만약 `Transaction::logTransaction`이 pure가 아니라 본문이 있었다면 — **base 버전이 실행**됨. derived의 오버라이드는 무시.

## 왜 이렇게 동작하나 — vtable 상태

C++ 객체는 **base 부터 시작해 점진적으로 생성**된다.

```
class Derived : public Base { ... };
new Derived;
↓
Step 1: Base 부분 메모리 확보
Step 2: Base 생성자 진입  ← vtable이 "Base"를 가리킴
Step 3: Base 생성자 본문 실행 완료
Step 4: Derived 부분 메모리 확보
Step 5: Derived 생성자 진입  ← vtable이 "Derived"를 가리킴
Step 6: Derived 생성자 본문 실행 완료
```

**핵심**: Step 2에서 vtable은 **Base를 가리킴**. 이유는 Step 2 시점에 Derived 부분이 아직 메모리에 없기 때문 — derived 함수가 derived 멤버에 접근하면 garbage.

> 즉 컴파일러는 "지금까지 만들어진 부분만 있는 것처럼 행동하라"고 안전망을 친다.

**소멸은 역순** — derived → base. derived 소멸자가 끝나면 vtable이 base로 돌아감 → base 소멸자에서 가상 함수 호출은 base 버전.

## 직접적인 호출만 함정인가? — 아니다

```cpp
class Transaction {
public:
    Transaction() {
        init();                  // 일반 멤버 함수 호출
    }
    void init() {                // 가상 함수 호출을 포함!
        logTransaction();        // ⚠️ 간접 호출도 같음
    }
    virtual void logTransaction() const = 0;
};
```

`init`은 가상이 아니지만, 그 본문에서 가상 함수를 호출 → 결국 같은 함정. **생성자에서 호출하는 모든 코드 경로**에서 가상 함수가 등장하면 함정.

## 해결 — non-virtual + 인자 전달

가장 권장되는 패턴: derived가 로그 정보를 만들어 base 생성자에 넘기고, base는 non-virtual 함수로 로그.

```cpp
class Transaction {
public:
    explicit Transaction(const std::string& logInfo) {
        logTransaction(logInfo);     // non-virtual
    }
    void logTransaction(const std::string& info) const;   // non-virtual
};

class BuyTransaction : public Transaction {
public:
    BuyTransaction(int parameters)
        : Transaction(createLogString(parameters)) {}    // 인자 만들어 전달

private:
    static std::string createLogString(int p) {           // static!
        // this를 사용할 수 없음 — 생성 중인 derived 멤버 접근 X
        return "BUY: " + std::to_string(p);
    }
};
```

**핵심 두 가지**:
1. `createLogString`은 **static** — `this`를 받지 않음. 아직 존재하지 않는 derived 멤버 접근 위험이 없음.
2. base 생성자가 받은 인자는 평범한 데이터 — 어떤 vtable 상태와도 무관.

## 다른 해결책 — 두 단계 초기화

```cpp
class Transaction {
public:
    Transaction() = default;
    void init() {           // 객체가 완전히 생성된 후 호출
        logTransaction();   // 이제 derived의 vtable 가리킴
    }
    virtual void logTransaction() const = 0;
};

BuyTransaction b;     // 1) 생성자 호출 — logTransaction 미실행
b.init();             // 2) derived 완성 후 init 호출
```

장점: 의도가 명확. 단점: 사용자가 `init()` 호출을 잊으면 객체가 "부분적으로 초기화"된 상태. **권장도 떨어짐**.

팩토리 함수로 강제 가능:

```cpp
class Transaction {
protected:
    Transaction() = default;
public:
    template<typename T, typename... Args>
    static std::unique_ptr<T> create(Args&&... args) {
        auto p = std::unique_ptr<T>(new T(std::forward<Args>(args)...));
        p->init();
        return p;
    }
    virtual void init() = 0;
};
```

## 일반화된 함정 — `this`를 다른 곳에 넘기는 경우

```cpp
class Widget {
public:
    Widget() {
        Registry::register(this);   // ⚠️ 위험
    }
};

class FancyWidget : public Widget {
public:
    FancyWidget() : Widget() { /* ... */ }
    void onEvent() override { /* ... */ }
};

FancyWidget fw;
// 1) Widget() 진입 → Registry에 등록
// 2) 다른 스레드가 즉시 fw.onEvent() 호출
//    → vtable 상태가 Widget — FancyWidget 오버라이드 미호출!
```

생성자에서 `this`를 외부에 노출하는 것도 함정. derived의 vtable이 아직 설정 안 됨.

## 컴파일러 경고

gcc/clang은 일부 케이스를 잡아냅니다:

```
warning: call to virtual function 'logTransaction' in constructor
  will not dispatch to derived class
```

그러나 간접 호출(다른 멤버 함수 경유)은 잡기 어렵다. 코드 검토로 잡아야 한다.

## 모던 변형 — `override` + `final`

```cpp
class Base {
public:
    Base() { setup(); }
    virtual void setup() = 0;
};

class Derived : public Base {
public:
    void setup() override final { /* ... */ }
};

Derived d;   // 여전히 같은 함정 — Base의 setup()이 호출됨
```

`override`, `final`은 가상 dispatch 규칙을 바꾸지 않음 — 컴파일 타임 검증만. 생성/소멸 중 가상 호출 함정은 그대로.

## 실무 가이드

- [ ] 생성자/소멸자에서 가상 함수를 호출하고 있는가?
- [ ] 직접 호출은 안 해도, 호출하는 다른 멤버가 가상 함수를 부르는가?
- [ ] derived 정보가 필요하다면 → 인자로 받기 (static helper)
- [ ] 두 단계 초기화 패턴이 필요하면 → 팩토리 + private ctor

## 핵심 정리

1. 생성자/소멸자 중의 가상 호출은 **현재 클래스의 버전**이 호출 — derived 오버라이드 X
2. **vtable 상태**: 생성 중엔 점진적으로 derived로 이동, 소멸 중엔 역순
3. pure virtual을 부르면 **UB** — 대부분 컴파일러는 abort
4. **해결**: derived가 정보를 만들어 base 생성자에 인자로 전달 (static helper)
5. **간접 호출**도 같은 함정 — 모든 호출 경로 점검

## 관련 항목

- [항목 7: 다형성 base에 virtual 소멸자](/blog/programming/cpp/effective-cpp/item07-declare-destructors-virtual-in-polymorphic-base-classes) — vtable 메커니즘 관련
- [항목 35: 가상 함수의 대안](/blog/programming/cpp/effective-cpp/item35-consider-alternatives-to-virtual-functions) — 다른 방식의 다형성
- [항목 36: non-virtual 함수 재정의 금지](/blog/programming/cpp/effective-cpp/item36-never-redefine-an-inherited-non-virtual-function) — 비-가상 함수의 규칙
