---
title: "항목 43: 템플릿화된 base 클래스의 이름에 접근하는 방법을 알아두라"
date: 2026-05-04T19:00:00
description: "템플릿 base의 멤버 접근에 this->, using, 명시 자격 — 세 가지 방법과 트레이드오프."
tags: [C++, Effective C++, Template, Inheritance]
series: "Effective C++"
seriesOrder: 43
draft: true
---

## 왜 이 항목이 중요한가?

derived 클래스 템플릿에서 base 템플릿의 멤버를 그냥 호출하면 **컴파일 에러**가 난다. 일반 상속에선 잘 동작하던 코드가 템플릿화하는 순간 깨진다.

```cpp
template<typename Company>
class MsgSender { void sendClear() { /* ... */ } };

template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    void sendLogged() {
        sendClear();   // ❌ 컴파일 에러
    }
};
```

이유는 C++의 **2단계 이름 검색** 때문이다. 1단계(템플릿 정의 시점)에선 base 템플릿이 어떤 특수화로 인스턴스화될지 모르므로 base의 멤버를 검색하지 않는다. `MsgSender<Bob>::sendClear`가 없을 수도 있기 때문이다.

해결책은 세 가지다 — `this->sendClear()`, `using MsgSender<Company>::sendClear;`, 또는 명시 자격 `MsgSender<Company>::sendClear()`. 이 항목은 세 방식의 트레이드오프를 정리한다.

## 개요

derived 클래스 템플릿이 base 클래스 템플릿을 상속할 때 base의 멤버 함수를 그냥 호출하면 **컴파일 에러**가 날 수 있다. 이유는 base 템플릿의 특수화로 인해 그 멤버가 존재하지 않을 가능성이 있기 때문이다. 해결책은 세 가지(`this->`, `using`, 명시 자격)이고 각각 트레이드오프가 있다.

## 함정 — base 멤버를 그냥 호출

```cpp
class MsgInfo { /* ... */ };

template<typename Company>
class MsgSender {
public:
    void sendClear(const MsgInfo& info) {
        // ... clear text 전송 ...
    }
    void sendSecret(const MsgInfo& info) {
        // ... 암호화 전송 ...
    }
};

template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    void sendClearMsg(const MsgInfo& info) {
        // log 전 처리
        sendClear(info);     // ⚠️ 컴파일 에러
                              //    error: 'sendClear' was not declared in this scope
    }
};
```

**왜 에러?** 컴파일러는 `MsgSender<Company>`의 특수화가 `sendClear`를 갖지 않을 수 있다고 의심:

```cpp
class CompanyZ { /* 평문 금지 */ };

template<>
class MsgSender<CompanyZ> {     // 특수화 — sendClear 없음
public:
    void sendSecret(const MsgInfo& info);
};
```

`LoggingMsgSender<CompanyZ>`가 인스턴스화될 때 `sendClear`가 없으므로 — 컴파일러는 보수적으로 그 가능성을 가정.

## 왜 컴파일러가 이렇게 동작하나 — 두 단계 이름 검색

C++ 템플릿은 **2단계 검색**으로 컴파일됨:

1. **템플릿 정의 시점** — 비-의존 이름(매개변수에 무관) 검색
2. **인스턴스화 시점** — 의존 이름 검색

`sendClear`가 비-의존 이름으로 보임 (1단계). 1단계에서 base 안 들어감 — base가 `MsgSender<Company>`라는 의존 타입이라서. 그래서 발견 안 됨 → 에러.

## 해결 1 — `this->`

```cpp
template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    void sendClearMsg(const MsgInfo& info) {
        this->sendClear(info);     // ✅ this->로 base 검색 강제
    }
};
```

**왜 동작하나**: `this->`로 시작하면 — `sendClear`는 **의존 이름**으로 처리됨 (`*this`의 타입이 의존). 2단계(인스턴스화 시점)에 검색 → base 멤버 발견.

**장점**:
- 가장 짧고 단순
- 가상 함수의 **동적 디스패치 유지**
- 코드 의도 명확

가장 권장되는 방법.

## 해결 2 — `using` 선언

```cpp
template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    using MsgSender<Company>::sendClear;     // base 멤버를 derived 스코프로

    void sendClearMsg(const MsgInfo& info) {
        sendClear(info);     // ✅ — using 덕분에 1단계에 발견
    }
};
```

**장점**:
- 본문은 깔끔 (`this->` 생략 가능)
- 명시적으로 어떤 base 멤버 사용하는지 선언

**단점**:
- 본문이 길면 `using` 선언이 많아짐
- base 멤버 추가 시마다 using 갱신 필요

## 해결 3 — 명시 자격

```cpp
template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    void sendClearMsg(const MsgInfo& info) {
        MsgSender<Company>::sendClear(info);     // ✅ 명시
    }
};
```

**장점**:
- 가장 명확 — 어느 base의 어느 멤버인지 드러남

**단점**:
- 가상 함수의 **동적 디스패치를 차단** — 정적 호출이 됨

```cpp
template<typename T>
class Base {
public:
    virtual void hook() { /* default */ }
};

template<typename T>
class Derived : public Base<T> {
public:
    void hook() override { /* 다른 동작 */ }

    void call() {
        this->hook();              // ✅ vtable — Derived::hook 호출
        Base<T>::hook();           // ⚠️ 명시 자격 — Base::hook 강제 호출
    }
};
```

가상 함수의 NVI 패턴에서 의도적으로 base 호출하고 싶을 땐 명시 자격이 적절. 그 외엔 `this->` 권장.

## 세 방법 비교

| 측면 | `this->` | `using` | 명시 자격 |
| --- | --- | --- | --- |
| 본문 가독성 | 좋음 | 매우 좋음 | 보통 (긴 이름) |
| 가상 함수 디스패치 | 동적 | 동적 | 정적 |
| 한 번 선언 + 여러 곳 사용 | ❌ 매번 | ✅ | ❌ 매번 |
| 컴파일러 에러 메시지 | 깔끔 | 깔끔 | 보통 |

**기본 권장**: `this->`. base 멤버 사용이 많으면 `using`. 정적 호출 의도면 명시 자격.

## 흔한 함정 — 데이터 멤버도 같은 문제

```cpp
template<typename T>
class Base {
protected:
    int count = 0;
};

template<typename T>
class Derived : public Base<T> {
public:
    void increment() {
        count++;       // ⚠️ 에러
        this->count++; // ✅
    }
};
```

함수뿐 아니라 데이터 멤버, 타입 멤버 모두 같은 함정. **base가 의존 타입이라면 모든 멤버 접근에 `this->`**.

## 흔한 함정 — typedef / using도 마찬가지

```cpp
template<typename T>
class Base {
public:
    using value_type = T;
};

template<typename T>
class Derived : public Base<T> {
public:
    void f() {
        value_type x;             // ⚠️ 에러
        typename Derived::value_type y;       // ✅ — typename 필요 (의존 타입)
        typename Base<T>::value_type z;        // ✅
        using typename Base<T>::value_type;    // ✅ — 더 깔끔
        value_type w;                            // ✅ — 위 using 덕분
    }
};
```

타입 멤버에는 `typename`도 함께. `using`이 가장 깔끔.

## 함정 — 특수화로 의도가 깨질 수 있음

```cpp
template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    void sendClearMsg(const MsgInfo& info) {
        this->sendClear(info);     // 컴파일 통과
    }
};

LoggingMsgSender<CompanyZ> sender;
sender.sendClearMsg(info);     // ⚠️ 인스턴스화 시점에 에러
                                //    CompanyZ의 MsgSender에 sendClear 없음
```

`this->`로 컴파일 단계는 통과 — 그러나 **인스턴스화 시점에는 sendClear가 정말 있어야 함**. 없으면 인스턴스화 에러.

특수화로 base가 멤버를 안 가질 가능성을 의식적으로 다뤄야:

```cpp
if constexpr (requires { this->sendClear(info); }) {     // C++20 concepts
    this->sendClear(info);
} else {
    // 다른 방법
}
```

## 표준 라이브러리 — `std::enable_shared_from_this`

```cpp
template<typename T>
class enable_shared_from_this {
public:
    std::shared_ptr<T> shared_from_this() {
        return std::shared_ptr<T>(weak_this);
    }
};

class Widget : public std::enable_shared_from_this<Widget> {
public:
    std::shared_ptr<Widget> getSharedPtr() {
        return shared_from_this();    // ⚠️ 에러? 또는 OK?
                                       //    실제론 OK — CRTP라 base가 인스턴스화 가능
    }
};
```

CRTP 패턴은 base가 derived의 타입에 의존하지만, 인스턴스화 시점에 모두 알려져 있으므로 `this->` 없이도 OK. 그러나 안전을 위해 `this->shared_from_this()` 권장.

## 모던 변형 — C++14의 `auto` + lambda

```cpp
template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    auto sendClearLambda(const MsgInfo& info) {
        return [this, &info]() {
            this->sendClear(info);     // 람다 안에서도 동일 — this-> 필요
        };
    }
};
```

람다도 같은 규칙 적용.

## 실무 가이드 — 결정

```
템플릿 base의 멤버를 호출하려는가?
├── 단순 호출 → this->name (기본 권장)
├── base 멤버 자주 사용 + 가독성 우선 → using Base::name
├── 의도적으로 base 버전 호출 (NVI) → Base<T>::name (정적)
└── 타입 멤버 → typename 추가 또는 using으로 alias
```

## 실무 가이드 — 체크리스트

- [ ] 템플릿 base 멤버 접근에 `this->`, `using`, 명시 중 어느 방법?
- [ ] 가상 함수의 동적 디스패치를 유지하고 싶은가? → `this->` 또는 `using`
- [ ] base가 특수화될 가능성이 있는가? → 인스턴스화 에러 가능 인지
- [ ] 타입 멤버 사용에 `typename` 추가?
- [ ] `using` 선언으로 자주 쓰는 base 멤버 정리?

## 핵심 정리

1. **템플릿 base의 멤버는 그냥 호출 못 함** — 2단계 이름 검색 + 특수화 가능성
2. **세 해결법**: `this->`, `using Base::name`, `Base<T>::name`
3. 보통 **`this->`** 가 가장 단순 + 동적 디스패치 유지
4. **`using`** — 본문 깔끔, base 멤버 추가 시 업데이트
5. **명시 자격** — 정적 호출 (가상 함수의 동적 디스패치 차단)
6. 타입 멤버는 `typename` 추가 또는 alias

## 관련 항목

- [항목 33: 이름 가리기](/blog/programming/cpp/effective-cpp/item33-avoid-hiding-inherited-names) — using 선언의 다른 사용
- [항목 41: 암묵 인터페이스](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 템플릿 영역
- [항목 42: typename의 두 의미](/blog/programming/cpp/effective-cpp/item42-understand-the-two-meanings-of-typename) — 의존 타입 명시
