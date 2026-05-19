---
title: "항목 36: 상속받은 non-virtual 함수를 재정의하지 말라"
date: 2026-05-04T12:00:00
description: "정적 바인딩 — 같은 객체에서 포인터 타입에 따라 다른 함수가 호출되는 함정. final로 강제 차단."
tags: [C++, Effective C++, Inheritance, Virtual]
series: "Effective C++"
seriesOrder: 36
draft: true
---

## 왜 이 항목이 중요한가?

C++에서 가장 헷갈리는 함정 중 하나가 **정적 바인딩과 동적 바인딩이 섞일 때**다. derived가 base의 non-virtual 함수를 재정의(엄밀히는 "숨김")하면, **같은 객체라도 어떤 타입의 포인터로 호출하느냐에 따라 다른 함수가 실행**된다.

```cpp
Derived d;
Base& b = d;
b.f();   // Base::f 호출 (정적 바인딩)
d.f();   // Derived::f 호출
```

같은 객체의 같은 호출이 다른 결과를 낸다. 이건 LSP를 명백히 깨뜨린다. 컴파일러는 경고하지 않는다.

해결책은 단순하다. **base의 non-virtual을 재정의하지 마라**. 다형성이 필요하면 base의 함수를 virtual로 바꾸고, 같은 동작이 강제되어야 한다면 non-virtual을 그대로 둔다 ([항목 34](/blog/programming/cpp/effective-cpp/item34-differentiate-between-inheritance-of-interface-and-inheritance-of-implementation)).

## 개요

non-virtual 함수는 **정적 바인딩**이다. 호출되는 함수가 **포인터/참조의 정적 타입**에 의해 결정된다. 같은 객체라도 어떤 타입의 포인터로 부르느냐에 따라 다른 함수가 호출된다. 매우 헷갈리고 LSP를 깨뜨린다. derived가 base의 non-virtual을 재정의하면 컴파일은 통과해도 **의도와 다른 동작**이 일어난다.

## 함정 — 같은 객체, 다른 함수

```cpp
class Base {
public:
    void f() { std::cout << "Base::f\n"; }     // non-virtual
};

class Derived : public Base {
public:
    void f() { std::cout << "Derived::f\n"; }  // base의 f를 가림 (재정의 시도)
};

Derived d;
Base*    pb = &d;
Derived* pd = &d;

pb->f();    // "Base::f"      — pb의 정적 타입이 Base
pd->f();    // "Derived::f"   — pd의 정적 타입이 Derived
```

**같은 객체에 같은 함수 호출**인데 다른 출력. 사용자는 무엇을 기대해야 할까?

```cpp
void process(Base& b) {
    b.f();              // Base::f 호출 — 정적 바인딩
}

Derived d;
process(d);             // "Base::f" — Derived의 f는 호출 안 됨!
```

LSP 위반: Derived가 Base의 계약과 동작 일치를 깸.

## 왜 이렇게 동작하나 — 정적 vs 동적 바인딩

```cpp
class Base {
public:
    virtual void f1();      // 가상 — 동적 바인딩 (런타임)
    void         f2();      // 비-가상 — 정적 바인딩 (컴파일 타임)
};

class Derived : public Base {
public:
    void f1() override;      // override
    void f2();               // 가림 (name hiding)
};

Base* p = new Derived;
p->f1();        // Derived::f1 — vtable로 런타임 결정
p->f2();        // Base::f2    — 컴파일 타임에 Base* 보고 결정
```

**동적 바인딩**(가상 함수): 런타임에 실제 객체 타입의 함수 호출.
**정적 바인딩**(non-virtual): 컴파일 타임에 포인터/참조 타입의 함수 호출.

non-virtual의 의미는 "**모든 derived가 같은 동작**" — derived가 다르게 정의할 거란 기대 자체가 잘못.

## 의미상 모순

`Derived : public Base`는 IS-A — Derived는 Base의 일종. Base의 모든 약속을 만족해야:

```cpp
class Base {
public:
    void f();    // "Base의 f는 X 동작을 한다"
};

class Derived : public Base {
public:
    void f();    // "Derived의 f는 Y 동작을 한다"
                 // → Derived가 더 이상 Base가 아님?
};
```

같은 함수에 두 가지 동작 — 모순. IS-A 위반.

해결: 결정해야 함:
- 모든 derived가 동일 동작 → non-virtual 유지, derived 재정의 X
- derived마다 다른 동작 → **virtual로 선언**

## 컴파일러 경고 — 거의 없음

```
class Derived : public Base {
public:
    void f() { /* ... */ }     // ⚠️ 컴파일러는 경고 안 함
};
```

이게 함정 — 컴파일 통과, 런타임에 미묘한 동작. 코드 리뷰로 잡아야.

일부 컴파일러:
```
gcc: -Woverloaded-virtual    (가상 함수의 name hiding은 잡음)
                              non-virtual 재정의는 경고 X
```

## 해결 — final 키워드 (C++11+)

base가 의도를 컴파일러에 못 박을 수 있음:

```cpp
class Base {
public:
    void f() final;          // ⚠️ non-virtual에 final은 의미 없음 (이미 재정의 불가)
};

// 가상 함수의 final
class Base {
public:
    virtual void f();
};

class Derived : public Base {
public:
    void f() final override;     // ✅ 재정의 OK, 그러나 더 이상 재정의 못 함
};

class DDerived : public Derived {
public:
    void f() override;            // ❌ 컴파일 에러
};
```

`final`은 **가상 함수 + 재정의 잠금** — non-virtual 자체엔 적용 의미 없음. 다만 클래스 자체에 final:

```cpp
class String final {
public:
    void length() const;     // 이 클래스가 final이라 derived 자체가 불가능
};

class MyString : public String { /* ... */ };     // ❌ String이 final
```

상속을 차단함으로써 재정의 함정 자체 회피.

## 흔한 함정 — 의도치 않은 가림

```cpp
class Base {
public:
    void doSomething();
};

class Derived : public Base {
public:
    void doSomething();      // ⚠️ override 의도였다면? base 가림이 됨
};

Base* p = new Derived;
p->doSomething();             // Base::doSomething 호출 — 의도와 다름
```

해결: 가상 함수로 만들거나, derived가 재정의 안 함.

```cpp
// 옵션 A: 가상 함수로 변경
class Base {
public:
    virtual void doSomething();
};

class Derived : public Base {
public:
    void doSomething() override;     // override — 명시
};

// 옵션 B: derived가 base 함수 그대로 사용
class Derived : public Base {
    // doSomething 재정의 안 함 — Base::doSomething 그대로
};
```

## non-virtual의 의도

non-virtual은 **"이 동작은 모든 derived에 동일하다"는 base 작성자의 약속**입니다.

```cpp
class Container {
public:
    size_t size() const { return count_; }     // 모든 Container가 동일하게 size 계산
};

class MyContainer : public Container {
    // size 재정의 X — base의 약속 존중
};
```

derived가 다른 동작을 원한다면 — 함수 자체가 다형적이어야 했다는 신호. base 설계자에게 가상화를 제안.

## 함정 — 다중 상속의 추가 복잡성

```cpp
class A { public: void f(); };
class B { public: void f(); };

class D : public A, public B {
public:
    void f();        // 둘 다 가림
};

D d;
d.A::f();           // 명시적
d.B::f();
d.f();              // D::f
```

다중 상속에서 non-virtual 함수 재정의는 더 큰 혼란 — name hiding이 양쪽 base에서 일어남.

## C++ 표준 라이브러리에서 — `unique_ptr`의 deleter

```cpp
std::unique_ptr<Base> p = std::make_unique<Derived>();
delete p;     // — virtual 소멸자가 없으면 부분 파괴 (항목 7)
```

`unique_ptr`의 deleter는 정적 — 컴파일 타임에 결정. 다형적 객체엔 virtual 소멸자 필수.

## 흔한 패턴 — 비-가상 인터페이스에 virtual hook (NVI)

```cpp
class Base {
public:
    void process() {       // non-virtual 공개 인터페이스 (재정의 금지)
        beforeProcess();    // virtual hook
        doProcess();        // virtual hook
        afterProcess();
    }
protected:
    virtual void beforeProcess() {}
    virtual void doProcess()    = 0;
    virtual void afterProcess() {}
};
```

이게 **NVI 패턴** (항목 35). public은 non-virtual, 내부에서 virtual 호출. 사용자는 process를 재정의 못 함 — 일관된 인터페이스 보장.

## 모던 변형 — `override` + `final` + 컴파일러 경고

```cpp
class Derived : public Base {
public:
    void f() override;            // virtual인지 명시 — 안 그러면 컴파일 에러
};

class Derived : public Base {
public:
    void f();                      // ⚠️ Base::f가 virtual인데 override 없음
                                   //    일부 컴파일러 경고: -Wsuggest-override
};
```

`override` 키워드 사용 + 컴파일러 경고 활성화로 의도 검증.

## 흔한 함정 — 클래스 슬라이싱

```cpp
class Base {
public:
    void f();
};

class Derived : public Base {
public:
    void f();          // 가림
};

Derived d;
Base b = d;            // 슬라이싱 — Derived 부분 잘림
b.f();                 // Base::f
```

값 복사 시 base 부분만 — derived의 f는 사라짐. 가상 함수가 아니므로 동적 디스패치도 없음. 항목 20 참고.

## 실무 가이드 — 결정 트리

```
derived가 base와 동명 non-virtual 함수를 정의하려는가?
├── 같은 시그니처 → 재정의 X (base 그대로 사용)
│   └── 다른 동작이 필요하면 — base를 virtual로 변경
├── 다른 시그니처 (의도된 오버로드) → using Base::f + 추가
└── 의도적으로 가림 → 위험 — 이름 자체를 다르게 (`myF`)
```

## 실무 가이드 — 체크리스트

- [ ] base가 non-virtual로 정의한 함수를 재정의하지 않는가?
- [ ] derived의 동작이 base와 달라야 한다면 — base를 virtual로 변경 요청
- [ ] `override` 키워드로 의도 명시?
- [ ] `final`로 가상 함수의 추가 재정의 차단?
- [ ] 다른 시그니처라면 `using Base::f`로 base 오버로드 노출?
- [ ] 값 슬라이싱 — base 복사 시 derived 잘림 인지?

## 핵심 정리

1. **non-virtual = 모든 derived가 동일 동작** — 재정의는 그 약속 깸
2. **정적 바인딩** — 포인터 타입에 따라 호출 함수 결정 → 같은 객체에 다른 동작
3. LSP 위반 — derived가 base와 다른 동작 = IS-A 깨짐
4. **컴파일러는 거의 경고 안 함** — 코드 리뷰로 잡아야
5. 다형성 원하면 — base를 virtual로 변경 (또는 `final`로 차단)
6. NVI 패턴 — public non-virtual + 내부 virtual hook으로 의도 명시

## 관련 항목

- [항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — non-virtual 재정의 = LSP 위반
- [항목 33: 이름 가리기](/blog/programming/cpp/effective-cpp/item33-avoid-hiding-inherited-names) — 가림의 다른 측면
- [항목 34: 인터페이스 vs 구현 상속](/blog/programming/cpp/effective-cpp/item34-differentiate-between-inheritance-of-interface-and-inheritance-of-implementation) — 함수 종류의 의미
- [항목 37: 기본 매개변수 재정의 금지](/blog/programming/cpp/effective-cpp/item37-never-redefine-a-functions-inherited-default-parameter-value) — 또 다른 정적 바인딩 함정
