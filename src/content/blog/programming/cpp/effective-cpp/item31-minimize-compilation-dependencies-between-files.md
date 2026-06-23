---
title: "항목 31: 파일 사이 컴파일 의존성을 최소화하라"
date: 2026-05-04T07:00:00
description: "Pimpl 관용구와 인터페이스 클래스로 빌드 시간을 줄이는 패턴 — 전방 선언과 멤버 타입 결정."
tags: [C++, Effective C++, Pimpl, Compilation]
series: "Effective C++"
seriesOrder: 31
draft: true
---

## 왜 이 항목이 중요한가?

C++ 빌드 시간이 길어지는 가장 큰 원인은 **헤더 파일의 의존성 그래프**다. 한 헤더를 수정하면 그것을 직접/간접 include하는 모든 .cpp가 재컴파일된다. 큰 프로젝트에선 한 줄 수정에 수십 분이 날아간다.

이 의존성을 끊는 두 가지 핵심 패턴이 있다.

- **Pimpl 관용구** — 구현 세부를 포인터 뒤로 숨겨 헤더에서 사라지게 한다.
- **인터페이스 클래스** — 추상 base 클래스만 노출하고 구현은 derived에 둔다.

두 패턴 모두 컴파일 의존성을 끊지만 런타임 비용(포인터 간접, 가상 호출)이 따라온다. 이 항목은 메커니즘과 트레이드오프를 정리한다.

## 개요

C++ 빌드 시간이 길어지는 주 원인은 **헤더 파일의 의존성 그래프**다. 한 헤더를 수정하면 그 헤더를 직접 또는 간접적으로 include하는 모든 .cpp가 재컴파일된다. 큰 프로젝트에선 이 영향이 수십 분에서 수 시간이다. 이 항목은 **Pimpl 관용구**와 **인터페이스 클래스** 두 가지 핵심 패턴으로 의존성을 끊는 법을 다룬다.

## 필수 개념: 헤더가 의존성을 만드는 메커니즘

> **초보자를 위한 배경 지식**

<br>

```cpp
// Person.h
#include <string>
#include "Date.h"
#include "Address.h"

class Person {
public:
    std::string name() const;
    Date        birthday() const;
    Address     address() const;
private:
    std::string  name_;
    Date         birthday_;
    Address      address_;
};
```

`Person.h`를 include하는 모든 .cpp는:
- `<string>` 전체 파싱
- `Date.h` 전체 파싱 (다시 그 안의 include들...)
- `Address.h` 전체 파싱

`Date.h`가 수정되면 → Date.h를 직접 사용하는 코드뿐 아니라 **Person.h를 사용하는 모든 곳도 재컴파일**. 의존성 폭발.

## 왜 헤더가 모든 걸 강요하나 — 멤버 변수가 핵심

```cpp
class Person {
private:
    std::string  name_;        // 멤버 — 완전한 타입 필요
    Date         birthday_;    // 멤버 — 완전한 타입 필요
};
```

컴파일러가 `Person` 객체의 **크기**(`sizeof`)를 알아야 합니다 — 스택 할당, 멤버 오프셋 계산을 위해. 그러려면 모든 멤버의 크기를 알아야 하고, 그러려면 각 멤버 타입의 **완전한 정의**를 봐야 합니다.

```cpp
class Person {
private:
    Date birthday_;       // ⚠️ Date의 sizeof를 알아야 함 → Date.h include 강요
};
```

## 해결의 원리 — "참조/포인터는 완전 타입 불필요"

```cpp
class Date;     // ⚠️ 전방 선언 — sizeof 알 수 없음

class Person {
private:
    Date  birthday_;     // ❌ 에러 — 완전 타입 필요
    Date* birthday_;     // ✅ — 포인터는 sizeof = sizeof(void*) 항상
    Date& birthday_;     // ✅ — 참조도 마찬가지
};
```

포인터/참조는 **고정 크기** — 가리키는 타입의 완전 정의 불필요. 이 사실이 **Pimpl과 인터페이스 클래스의 기반**.

함수 매개변수/반환 타입도 마찬가지:

```cpp
class Date;     // 전방 선언

Date foo();                    // 반환 — 전방 선언으로 OK
void bar(Date d);              // 매개변수 — 전방 선언으로 OK
void baz(const Date& d);       // 마찬가지
```

호출 시점에만 완전 타입 필요. 함수 호출 시점에 헤더 include하면 됨.

## 패턴 1 — Pimpl (Pointer to Implementation)

내부 데이터를 별도 클래스로 빼고 그 포인터만 멤버로 둠.

```cpp
// Person.h
#include <memory>
#include <string>

class PersonImpl;        // 전방 선언

class Person {
public:
    Person(const std::string& name, const Date& birthday, const Address& addr);
    ~Person();           // ⚠️ .cpp에 정의 — PersonImpl 완전 타입 필요

    std::string name() const;
    std::string birthDate() const;

private:
    std::unique_ptr<PersonImpl> pImpl;
};
```

```cpp
// Person.cpp
#include "Person.h"
#include "PersonImpl.h"   // 여기만 의존성 — Date.h, Address.h 포함

struct PersonImpl {
    std::string name;
    Date        birthday;
    Address     address;
};

Person::Person(const std::string& name, const Date& birthday, const Address& addr)
    : pImpl(std::make_unique<PersonImpl>(name, birthday, addr)) {}

Person::~Person() = default;     // 여기서 ~unique_ptr<PersonImpl> 완성 — PersonImpl 완전 타입 필요

std::string Person::name() const { return pImpl->name; }
```

**효과**:
- `Person.h`를 include하는 코드는 `<memory>`, `<string>`만 봄 — Date.h, Address.h **불필요**
- Date 변경해도 — `Person.cpp`만 재컴파일, 사용자는 영향 없음

### Pimpl 함정 — 소멸자 위치

```cpp
class Person {
    std::unique_ptr<PersonImpl> pImpl;
public:
    // 소멸자 명시 안 함 — 컴파일러 자동
};
```

기본 소멸자는 **헤더에 인라인**되어 컴파일됩니다 — 그 시점에 `PersonImpl`의 완전 타입이 보여야 함. 안 보이므로 컴파일 에러.

해결 — **소멸자를 .cpp에 명시**:

```cpp
// Person.h
class Person {
public:
    ~Person();    // 선언만
};

// Person.cpp
Person::~Person() = default;     // PersonImpl 완전 타입 본 상태에서 정의
```

같은 이유로 **복사·이동 생성자/대입**도 .cpp에 정의해야 할 수 있습니다.

```cpp
// Person.cpp
Person::Person(Person&& other) noexcept = default;
Person& Person::operator=(Person&& other) noexcept = default;
```

## 패턴 2 — 인터페이스 클래스 (추상 base + 팩토리)

구현 클래스 자체를 사용자에게 숨김:

```cpp
// Person.h
#include <memory>
#include <string>

class Person {
public:
    virtual ~Person() = default;
    virtual std::string name() const = 0;
    virtual Date birthday() const = 0;

    static std::unique_ptr<Person> create(
        const std::string& name, const Date& birthday, const Address& addr);
};
```

```cpp
// Person.cpp
#include "Person.h"
#include "Date.h"
#include "Address.h"

class RealPerson : public Person {
    std::string name_;
    Date        birthday_;
    Address     address_;
public:
    RealPerson(...) : ... {}
    std::string name() const override { return name_; }
    Date birthday() const override { return birthday_; }
};

std::unique_ptr<Person> Person::create(
    const std::string& name, const Date& birthday, const Address& addr) {
    return std::make_unique<RealPerson>(name, birthday, addr);
}
```

사용자:

```cpp
auto p = Person::create("Alice", Date(1990, 1, 1), Address(...));
p->name();
```

**효과**:
- 사용자는 `Person` 인터페이스만 봄 — 구현은 .cpp에 격리
- 다양한 구현(`RealPerson`, `MockPerson`)을 교체 가능 — 테스트 친화적
- 비용: 가상 함수 디스패치, 동적 할당

## 두 패턴 비교

| 측면 | Pimpl | 인터페이스 클래스 |
| --- | --- | --- |
| 구현 숨김 | 데이터 멤버 숨김 | 구현 클래스 자체 숨김 |
| 가상 호출 비용 | 없음 (멤버 함수가 정적 호출) | 있음 (모든 메서드가 virtual) |
| 동적 할당 | unique_ptr 하나 | 매 인스턴스 |
| 다중 구현 | 어려움 | 자연스러움 (Mock 등) |
| 사용자 라이프타임 | `Person p;` (스택 OK) | `unique_ptr<Person>` 강제 |
| 적합한 사용처 | 단일 구현, 안정 인터페이스 | 다형성/의존성 주입 |

## 가이드라인 — "선언이면 충분한지" 검토

```cpp
// header.h
class Date;     // ✅ 선언만 충분
void f(Date);              // 매개변수 by-value도 OK (호출자가 include)
Date g();                  // 반환 by-value도 OK
const Date& h(Date& d);    // 참조도 OK

class Container {
    Date* pd;              // 포인터 멤버
    Date& rd;              // 참조 멤버
};
```

`Date` 객체를 **사용하는 코드**(생성, 메서드 호출, 멤버 접근)는 완전 타입 필요 — 그 코드는 .cpp 또는 다른 헤더에 둠.

## 표준 라이브러리 헤더 — 전방 선언 금지

```cpp
namespace std {
    class string;     // ❌ 표준이 허용 안 함
}
```

표준 헤더의 클래스를 전방 선언하면 안 됨 — 라이브러리 구현이 정확한 클래스 이름이 아닐 수도(template 일 수도). 표준 헤더는 그대로 `#include`.

C++20 modules가 이 영역을 일부 개선.

### 관련 함정 — STL 컨테이너 값 타입은 *완전 타입* 필요

```cpp
// MyHeader.h
class Resource;                          // 전방 선언

class Holder {
    Resource* ptr;                       // ✅ — 포인터는 OK
    std::vector<Resource> vec;           // ❌ — vector<T>는 T가 완전 타입이어야 함
};
```

`std::vector<T>` 같은 컨테이너는 인스턴스화 시점에 T의 크기·생성자·소멸자를 *알아야* 한다(historically — C++17 이후 일부 컨테이너는 "불완전 타입 friendly"하게 명시적으로 정의되긴 했으나, 실무에서는 안전을 기준으로 한다). 전방 선언만으로는 그 정보가 없어 컴파일 실패 — 이 경우 그냥 `Resource.h`를 `#include` 해야 한다.

> 💡 **혼합 사용 금지**: 같은 타입을 어떤 줄에선 전방 선언, 어떤 줄에선 `#include` — 이중 정보는 헷갈림의 원인이다. 한 헤더에서는 한 쪽만 골라라.
>
> 또한 전방 선언만 쓰고 *링크 단계*에 와서야 "정의 없음"으로 실패하면, 빌드 로그 끝까지 가야 알아챈다. 컴파일 실패가 링크 실패보다 항상 친절하다는 점은 기억할 만하다.

## 큰 함수 인라인의 의존성 영향

```cpp
// Widget.h
inline void Widget::doSomething() {
    // ... Date 메서드 호출 ...
    Date d = ...;
    d.format();
}
```

inline 함수 본문이 헤더에 있으면 — `Date` 완전 타입 필요. include 강요. 큰 인라인 함수가 의존성을 끌어들임 (항목 30).

해결: 본문을 .cpp로 이동, inline 제거 (또는 헤더에 그대로 두되 의존성 받아들임).

## 트레이드오프

| 장점 | 단점 |
| --- | --- |
| 빌드 시간 ↓ | 간접 메모리 접근 (한 단계 더) |
| ABI 안정성 ↑ | 동적 할당 (Pimpl의 unique_ptr) |
| 인터페이스 변경 영향 격리 | 가상 함수 비용 (인터페이스 클래스) |
| 다중 구현·테스트 용이 (인터페이스) | 작성 복잡도 ↑ |

핫 패스가 아니면 비용 무시 가능. **라이브러리 헤더, 자주 변경되는 큰 헤더**에 가장 유용.

## 모던 변형 — C++20 modules

```cpp
// math.cppm
export module math;

import <string>;

export class Calculator {
    // ... 멤버, 함수 모두 한 모듈 파일에 ...
};
```

C++20 모듈은 헤더 시스템 자체를 대체 — include로 인한 재컴파일 문제가 사라짐. 컴파일러/툴체인 지원이 진행 중.

## 실무 가이드

```
헤더 의존성 줄이고 싶다 — 어디부터?
├── 라이브러리 인터페이스 (외부 사용자 노출) — 우선순위 1
├── 자주 변경되는 큰 헤더 — 우선순위 2
├── 핵심 도메인 클래스 — Pimpl 또는 인터페이스
└── 작은 utility — 보통 그대로 OK
```

## 실무 가이드 — 체크리스트

- [ ] 헤더의 멤버 변수가 다른 큰 헤더를 끌어들이는가?
- [ ] 포인터/참조 멤버로 바꿀 수 있는가? (Pimpl)
- [ ] 다중 구현/테스트가 필요한가? (인터페이스 클래스)
- [ ] 함수 매개변수/반환 타입은 전방 선언으로 충분?
- [ ] 헤더에 인라인 함수가 다른 헤더를 끌어들이는가? → .cpp로
- [ ] Pimpl 사용 시 ctor/dtor/이동을 .cpp에 명시했는가?

## 핵심 정리

1. **헤더 의존성 = 빌드 시간 비용** — 큰 프로젝트에서 결정적
2. **포인터/참조 멤버는 전방 선언으로 충분** — 완전 타입 불필요
3. **Pimpl**: 데이터를 별도 클래스로 빼고 포인터만 멤버 — 데이터 의존성 격리
4. **인터페이스 클래스**: 구현 자체 숨김 — 다형성·다중 구현
5. Pimpl 사용 시 **소멸자/복사/이동을 .cpp에 명시** (불완전 타입 함정)
6. 표준 헤더는 전방 선언 금지 — 그대로 include

## 관련 항목

- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — Pimpl의 unique_ptr 자동 해제
- [항목 25: non-throwing swap](/blog/programming/cpp/effective-cpp/item25-consider-support-for-a-non-throwing-swap) — Pimpl의 효율적 swap
- [Effective Modern C++ 항목 22: Pimpl idiom](/blog/programming/cpp/effective-modern-cpp/item22-when-using-pimpl-define-special-members-in-impl-file) — 함정 정리
