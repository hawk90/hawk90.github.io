---
title: "항목 33: 상속된 이름을 가리지 말라"
date: 2025-02-06T11:00:00
description: "derived의 동명 함수는 base의 모든 동명 함수를 가린다 — 시그니처 무관. using 선언으로 해결."
tags: [C++, Effective C++, Inheritance, Name Hiding]
series: "Effective C++"
seriesOrder: 33
draft: true
---

## 왜 이 항목이 중요한가?

C++의 **name hiding** 규칙은 직관과 정반대다. derived에서 base와 같은 이름의 함수를 정의하면, **시그니처가 다르더라도** base의 모든 동명 함수가 가려진다. 일반 오버로드는 시그니처별로 공존하는데, 상속에선 이름 자체가 가려진다.

이게 사용자가 자주 빠지는 함정이다. base에 `f(int)`, `f(double)`, `f(std::string)`이 있고 derived가 `f(double)`만 재정의하면 — base의 `f(int)`와 `f(std::string)`도 모두 호출할 수 없게 된다.

해결책은 `using Base::f;` 선언으로 base의 모든 동명 함수를 derived 스코프로 끌어오는 것이다. C++11+에선 생성자도 `using Base::Base;`로 가져올 수 있다. 이 항목은 그 메커니즘과 패턴을 정리한다.

## 개요

C++의 상속에서 **name hiding** 규칙은 직관과 다르다. derived 클래스에서 base와 같은 이름의 함수를 정의하면 **시그니처가 다르더라도** base의 모든 동명 함수가 가려진다. 일반적인 함수 오버로딩 규칙과 정반대다. `using` 선언으로 base의 이름을 명시적으로 가져와야 한다. C++11+ 에선 생성자도 마찬가지다.

## 필수 개념: 이름 해상도와 스코프

> **초보자를 위한 배경 지식**

<br>

이름 검색의 기본 규칙:

1. 로컬 스코프 검색
2. 둘러싼 블록·함수 스코프
3. 클래스 스코프 (멤버 검색)
4. 베이스 클래스 스코프
5. 네임스페이스 스코프
6. 전역 스코프

3단계에서 이름이 발견되면 **거기서 검색 종료** — 다음 단계로 가지 않음. 그러므로 derived 클래스에 같은 이름의 함수가 있으면 — base 단계까지 검색이 도달하지 않습니다. 오버로드 후보 풀에도 안 들어감.

## 함정 — 동명 함수가 시그니처 무관하게 모두 가려짐

```cpp
class Base {
public:
    virtual void f();
    virtual void f(int);
    virtual void f(double);
            void g();
};

class Derived : public Base {
public:
    void f();      // ⚠️ Base::f()를 override
                   //    + Base::f(int), Base::f(double)까지 모두 숨김!
};

Derived d;
d.f();             // ✅ Derived::f()
d.f(10);           // ❌ 컴파일 에러 — Base::f(int)는 숨겨짐
d.f(3.14);         // ❌ 컴파일 에러
d.g();             // ✅ Derived에 g가 없음 → Base::g() 발견
```

`d.f(10)` — Derived 스코프에 `f`가 있으므로 거기서 검색 종료. Base의 `f(int)`는 후보에 안 들어감. 컴파일러 메시지:

```
error: no matching function for call to 'Derived::f(int)'
note: candidate: 'void Derived::f()'
note:   no known conversion for argument 1
```

`f(int)`가 있긴 한데 Derived가 가렸음을 알려주지 않음.

## 왜 이렇게 설계됐나

목적: **derived가 의도치 않게 base 함수를 노출하는 것 방지**.

```cpp
class Base {
public:
    void deprecatedOldF(int);     // 옛 API
};

class Derived : public Base {
public:
    void deprecatedOldF();         // 새 API — 동명, 다른 시그니처
};

Derived d;
d.deprecatedOldF(42);     // 만약 base의 옛 API가 자동 노출되면 위험
                           // → name hiding으로 차단
```

이 안전망은 의도된 동작 — 그러나 보통은 base의 오버로드도 함께 노출하고 싶을 때가 더 많음.

## 해결 — `using` 선언

```cpp
class Derived : public Base {
public:
    using Base::f;       // base의 모든 f를 derived 스코프로 가져옴
    void f();            // 그 위에 추가 (override)
};

Derived d;
d.f();                   // Derived::f()
d.f(10);                 // ✅ Base::f(int) — using 덕분
d.f(3.14);               // ✅ Base::f(double)
```

`using Base::f`는 — "base의 모든 f를 내 스코프에 포함시켜라". 그 위에 derived가 추가 정의해도 오버로드 후보로 함께 등장.

## 일부만 노출하고 싶을 때 — private 상속과 결합

```cpp
class Derived : private Base {
public:
    using Base::f;     // base의 f만 derived의 public으로 노출
                       // 다른 base 멤버는 private 상속으로 인해 숨겨짐
};
```

private 상속(항목 39)은 모든 base 멤버를 private으로 만듦. `using`으로 **특정 멤버만 의도적으로 노출**.

## 함정 — override 의도가 부분 노출이 됐을 때

```cpp
class Base {
public:
    virtual void onEvent(int);
    virtual void onEvent(double);
};

class Derived : public Base {
public:
    void onEvent(int) override;   // int 버전만 override
                                   // double 버전은 숨겨짐!
};

Derived d;
d.onEvent(3.14);    // ⚠️ 컴파일 에러 — Base::onEvent(double) 숨겨짐
```

derived가 일부 오버로드만 재정의하면 — 나머지 오버로드까지 가려짐. 호출자가 헷갈림.

해결:

```cpp
class Derived : public Base {
public:
    using Base::onEvent;          // 모든 오버로드 가져오기
    void onEvent(int) override;   // int만 재정의
                                   // double은 Base 구현 그대로
};
```

## C++11+ 생성자 상속

```cpp
class Base {
public:
    Base();
    Base(int);
    Base(double);
    Base(const std::string&);
};

class Derived : public Base {
    // 생성자 명시 안 하면 — base 생성자 자동 호출 불가
};

Derived d(42);         // ❌ 컴파일 에러 (C++03)
```

C++03까지는 derived가 base 생성자를 명시적으로 호출해야:

```cpp
class Derived : public Base {
public:
    Derived()                       : Base() {}
    Derived(int x)                  : Base(x) {}
    Derived(double x)               : Base(x) {}
    Derived(const std::string& s)   : Base(s) {}
};
```

C++11+ `using Base::Base`로 모두 상속:

```cpp
class Derived : public Base {
public:
    using Base::Base;              // 모든 base 생성자 상속
                                    // Derived의 추가 멤버는 default 초기화
};

Derived d(42);                     // ✅ Base(int) 호출
Derived d2("hello");                // ✅ Base(const std::string&)
```

### 함정 — derived 멤버 추가

```cpp
class Derived : public Base {
    int extra_;
public:
    using Base::Base;       // extra_는 default-init만 됨 (쓰레기!)
};

Derived d(42);              // ⚠️ d.extra_는 init 안 됨
```

`using Base::Base`로 상속된 생성자는 **derived의 추가 멤버를 모름**. 해결:

```cpp
class Derived : public Base {
    int extra_ = 0;                // in-class init (C++11)
public:
    using Base::Base;              // extra_는 default 0
};
```

또는 명시적 생성자 추가:

```cpp
class Derived : public Base {
    int extra_;
public:
    Derived(int x, int e) : Base(x), extra_(e) {}
};
```

## ADL과의 상호작용

```cpp
namespace ns {
    class Base {
    public:
        friend void process(const Base&);
    };

    class Derived : public Base {};
}

ns::Derived d;
process(d);     // ADL이 ns::process 찾음 — base의 friend라도 OK
```

ADL은 클래스 스코프와 별도 — name hiding 영향 받지 않음.

## 가상 함수 + 비-가상 오버로드 — name hiding이 더 위험

```cpp
class Base {
public:
    virtual void f(int);          // 가상
    void         f(double);       // 비-가상
};

class Derived : public Base {
public:
    void f(int) override;     // 가상 — int만 override
                              // double은 가려짐
};

Derived d;
d.f(3.14);                    // ❌ 가려져 호출 불가
                              //    base의 f(double)을 부르고 싶었지만...
```

해결: `using Base::f`로 모두 노출.

## 모던 변형 — explicit `override`

```cpp
class Derived : public Base {
public:
    using Base::f;
    void f(int) override;          // 명시 — 컴파일러가 base에 f(int)가 있는지 확인
};
```

`override`는 name hiding 자체를 막진 않지만, **이름 일치 검증**으로 실수를 잡음.

```cpp
class Derived : public Base {
public:
    void f(long) override;        // ❌ Base에 f(long) 없음 — 컴파일 에러
                                   //    "override but does not override any function"
};
```

`override` 없으면 이런 오타가 새 함수 정의로 인식 + base 가림 → 더 큰 함정.

## 흔한 함정 — 데이터 멤버도 name hiding

```cpp
class Base {
public:
    int x;
};

class Derived : public Base {
public:
    double x;            // ⚠️ Base::x 가림
};

Derived d;
d.x = 3.14;              // Derived::x (double)
d.Base::x = 42;          // 명시적으로 Base::x 접근
```

함수뿐 아니라 **모든 이름**이 이 규칙 — 변수도, 타입도, enum도.

## 실무 가이드 — 결정

```
derived가 base와 동명 함수를 정의하나?
├── 모든 오버로드 override → 모두 명시 + override (각자 작성)
├── 일부만 override → using Base::f + 일부 override
├── 일부만 추가 (다른 오버로드 없음) → using Base::f + 추가
└── 의도적으로 base 노출 차단 → 그대로 (using 없이)
```

## 실무 가이드 — 체크리스트

- [ ] derived의 함수가 base의 동명 오버로드를 의도치 않게 가리지 않는가?
- [ ] 가리는 게 의도인지, 노출하고 싶은지 명확한가?
- [ ] base의 모든 오버로드 노출 → `using Base::f`
- [ ] override 시 `override` 키워드로 검증?
- [ ] C++11+ 생성자 상속 — `using Base::Base`로 효율
- [ ] derived의 추가 멤버에 in-class init 또는 명시적 ctor?

## 핵심 정리

1. **derived의 동명 이름은 base의 동명 이름을 모두 가린다** — 시그니처 무관
2. 일반 함수 오버로딩과 다른 규칙 — 스코프가 우선
3. **`using Base::name`** 으로 base 멤버를 derived 스코프에 포함
4. C++11+ **`using Base::Base`** 로 생성자 상속
5. `override` 키워드로 의도된 재정의 명시 — name hiding 함정 일부 방지
6. **데이터 멤버, 타입, enum**도 같은 규칙

## 관련 항목

- [항목 32: public 상속은 is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 인터페이스 보존
- [항목 34: 인터페이스 vs 구현 상속](/blog/programming/cpp/effective-cpp/item34-differentiate-between-inheritance-of-interface-and-inheritance-of-implementation) — 가상 함수 종류
- [항목 39: private 상속](/blog/programming/cpp/effective-cpp/item39-use-private-inheritance-judiciously) — using과의 결합
