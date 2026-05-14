---
title: "항목 7: 다형성 base 클래스에는 가상 소멸자를 선언하라"
date: 2025-02-01T07:00:00
description: "non-virtual 소멸자가 부분 파괴(UB)를 일으키는 메커니즘과, 비-다형성 클래스엔 추가하지 말아야 하는 이유."
tags: [C++, Effective C++, Inheritance, Virtual]
series: "Effective C++"
seriesOrder: 7
draft: true
---

## 왜 이 항목이 중요한가?

C++에서 가장 조용히 무서운 함정 하나가 **base 포인터로 derived를 delete**할 때 일어난다. base 소멸자가 non-virtual이면 derived 부분의 소멸자가 호출되지 않는다. 자원 누수와 UB다. 컴파일러는 보통 경고도 안 준다.

해결은 단순하다 — 다형성 base의 소멸자를 `virtual`로 선언한다. 다만 두 가지 함정이 따라온다.

- **비-다형성 클래스**에 virtual을 붙이면 vptr이 추가되어 객체 크기가 늘어나고 C 호환을 잃는다.
- **표준 라이브러리 값 타입**(`std::string`, `std::vector` 등)은 다형성 base가 아니다. 상속하지 말아야 한다.

이 항목은 virtual 소멸자가 언제 필요하고 언제 비용이 되는지, 추상 클래스의 pure virtual 소멸자 패턴까지 정리한다.

## 개요

`Base*`로 `Derived`를 가리키고 그 포인터에 `delete`를 호출하면, base의 소멸자만 호출되어 **derived 부분이 소멸되지 않을 수 있다**. 결과는 자원 누수와 UB다. 해결은 base의 소멸자를 `virtual`로 선언하는 것이다. 단, **다형성 base**일 때만이다. 비-다형성 클래스에 무지성으로 virtual을 붙이면 **객체 크기와 성능에 비용**이 추가된다.

## 함정 예제 — 부분 파괴

```cpp
class TimeKeeper {
public:
    TimeKeeper();
    ~TimeKeeper();        // ⚠️ non-virtual
};

class AtomicClock : public TimeKeeper {
    BigClock* clockData;
public:
    AtomicClock() : clockData(new BigClock) {}
    ~AtomicClock() { delete clockData; }    // derived 정리 코드
};

TimeKeeper* p = getTimeKeeper();    // 실제로는 AtomicClock 인스턴스 반환
delete p;                            // ⚠️ TimeKeeper::~TimeKeeper만 호출!
                                     // AtomicClock::~AtomicClock 호출 X
                                     // → clockData 누수, 부분 파괴
```

이 코드는 **컴파일도 통과**하고 일부 컴파일러는 경고도 안 줍니다 (clang/gcc는 `-Wnon-virtual-dtor`로 경고 가능).

## 해결 — virtual 소멸자

```cpp
class TimeKeeper {
public:
    TimeKeeper();
    virtual ~TimeKeeper();    // ✅ virtual
};
```

이제 `delete p`는 동적 디스패치로 **실제 타입(AtomicClock)의 소멸자**부터 호출 → 정상 파괴 순서:

```
1. AtomicClock::~AtomicClock() 호출 → clockData 해제
2. TimeKeeper::~TimeKeeper() 자동 호출 (base 부분 정리)
```

소멸 순서는 **derived → base**(생성의 역순). virtual은 derived 소멸자를 진입하기 위한 보장.

## 왜 컴파일러가 미리 잡지 못하나

```cpp
TimeKeeper* p = getTimeKeeper();
delete p;
```

`getTimeKeeper`의 구현은 별도 컴파일 단위에 있을 수 있고, 반환된 객체의 **실제 타입은 런타임에야 결정**. 컴파일러는 `p`가 정확히 `TimeKeeper`인지, 아니면 derived인지 알 수 없음 → 보수적으로 동작.

`virtual` 키워드가 "런타임 디스패치하라"는 표시 — 없으면 컴파일러는 정적 타입(TimeKeeper)의 함수를 부름.

## vtable의 비용

virtual 함수를 가진 클래스는 **vtable 포인터(vptr)** 가 객체에 추가됨.

```cpp
class Point {
    int x, y;             // 8 byte
};
sizeof(Point);            // 8

class PointV {
    int x, y;
    virtual ~PointV() {}
};
sizeof(PointV);           // 16 (vptr 8 byte 추가, 64-bit 시스템)
```

작은 POD 같은 타입에 무지성으로 virtual 소멸자를 추가하면:
- **객체 크기 2배** (8 → 16 byte)
- **캐시 효율 저하** — 같은 캐시 라인에 더 적은 객체
- **C 호환 잃음** — `memcpy`, raw 배열 직렬화 등에서 vptr 때문에 깨짐

```cpp
PointV p{1, 2};
fwrite(&p, sizeof(PointV), 1, file);    // ⚠️ vptr까지 쓰임 — 다른 빌드에선 해석 불가
```

## "다형성 base 클래스"란?

**base 포인터/참조를 통해 derived를 다형적으로 사용할 의도가 있는 클래스**.

| 사례 | virtual 소멸자 필요? |
| --- | --- |
| `Shape*` → `Circle`, `Square` 가리킴 (전형적 OOP) | ✅ 필요 |
| `std::ostream`처럼 표준 IO 계층 | ✅ 필요 |
| `std::string` 같은 standalone 값 타입 | ❌ 불필요 |
| 단순 utility (`Point`, `Vector3`, `Complex`) | ❌ 불필요 |
| Mixin / CRTP base | 보통 ❌ (private 상속이거나 derived가 직접 사용) |

**판단 기준**: "이 클래스의 base 포인터로 derived를 가리키고 그걸 `delete`할 일이 있는가?" → 있으면 virtual.

## 추상 base 클래스 — pure virtual 소멸자 패턴

추상 클래스를 만들고 싶은데 다른 virtual 함수가 없는 경우:

```cpp
class AWOV {     // Abstract Without Other Virtuals
public:
    virtual ~AWOV() = 0;     // pure virtual 소멸자
};

AWOV::~AWOV() {}     // ⚠️ 정의는 필수
```

**왜 정의가 필요한가**: 소멸 체인에서 derived의 소멸자가 끝나면 base 소멸자가 **반드시** 호출됨 — pure virtual이라도 본문이 없으면 링크 에러.

**왜 pure virtual로 두나**: 인스턴스화 차단. `AWOV` 자체로는 객체 생성 불가, 상속해야만.

```cpp
class Concrete : public AWOV {
public:
    ~Concrete() override {}     // AWOV의 소멸자 호출이 필요
};
```

## `final` 키워드 — 추가 도구 (C++11)

상속 차단:

```cpp
class String final {     // 이 클래스는 더 이상 상속 불가
};

class Base {
public:
    virtual ~Base() = default;
    virtual void f() final;     // 메서드 단위로 차단도 가능
};
```

`final`을 적은 클래스는 다형성 base가 아닐 가능성이 높으므로 virtual 소멸자 불필요. `std::string` 같은 표준 라이브러리 타입이 다형성 base가 **아닌** 이유.

## 표준 라이브러리에서의 함정

```cpp
class MyString : public std::string {     // ⚠️ 위험
    int extra;
};

std::string* p = new MyString;
delete p;       // std::string은 non-virtual 소멸자 — extra 부분 누수 가능
```

**표준 라이브러리의 값 타입은 상속을 전제로 설계되지 않았다**. `std::string`, `std::vector`, `std::pair` 등의 소멸자는 non-virtual — base로 사용하지 말 것.

C++11+ 에선 `final`로 명시되는 표준 컨테이너도 있음. 의도가 분명.

## 모던 변형 — `override` + `= default`

```cpp
class Base {
public:
    virtual ~Base() = default;
};

class Derived : public Base {
public:
    ~Derived() override = default;   // virtual임을 명시 + 자동 본문
};
```

`override`는 derived 소멸자에도 적용 가능 — base 소멸자가 virtual인지 컴파일러가 확인.

## 실무 가이드 — 결정 트리

```
이 클래스는 base 포인터/참조로 다형적으로 사용될 것인가?
├── 예
│   ├── 다른 virtual 함수가 있는가?
│   │   ├── 예 → virtual ~T() = default;
│   │   └── 아니오 → virtual ~T() = 0; T::~T() {} (정의 필수)
│   └── 상속을 차단하고 싶은가?
│       └── 예 → class T final {} 또는 base를 noncopyable
└── 아니오 (값 타입)
    ├── 컴파일러 자동 (소멸자 적지 마)
    └── 또는 ~T() = default; 명시
```

## 핵심 정리

1. **다형성 base 클래스 = virtual 소멸자** (또는 protected non-virtual)
2. base 포인터로 derived `delete` 시 non-virtual은 **부분 파괴 UB**
3. **다형성이 아닌 클래스에 virtual 추가하지 말 것** — vptr 비용 + C 호환 손실
4. 추상 클래스인데 다른 virtual이 없으면 `virtual ~T() = 0;` + **본문 정의**
5. 표준 라이브러리 값 타입(`std::string` 등)은 **base로 사용 X** — non-virtual dtor

## 관련 항목

- [항목 8: 소멸자에서 예외가 나가지 않게](/blog/programming/cpp/effective-cpp/item08-prevent-exceptions-from-leaving-destructors) — 소멸자 본문의 규칙
- [항목 9: 생성·소멸 중 가상 함수 호출 금지](/blog/programming/cpp/effective-cpp/item09-never-call-virtual-functions-during-construction-or-destruction) — vtable 상태 함정
- [항목 32: public 상속은 is-a를 모델](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 다형성의 의미
- [EMC 항목 12: override 선언](/blog/programming/cpp/effective-modern-cpp/item12-declare-overriding-functions-override) — 소멸자 override 검증
