---
title: "항목 38: composition으로 'has-a'나 'is-implemented-in-terms-of'를 모델링하라"
date: 2026-05-04T14:00:00
description: "composition의 두 의미 — 도메인의 has-a, 구현의 is-implemented-in-terms-of. 상속(is-a)과의 명확한 구분."
tags: [C++, Effective C++, Composition]
series: "Effective C++"
seriesOrder: 38
draft: true
---

## 왜 이 항목이 중요한가?

composition(다른 클래스의 객체를 멤버로 보유)은 단순한 코드 재사용 도구가 아니다. 두 가지 다른 의미를 표현한다.

- **어플리케이션 도메인의 has-a** — `Person`은 `Address`를 갖는다.
- **구현 도메인의 is-implemented-in-terms-of** — `Set`은 `List`로 구현된다.

공교롭게 둘 다 같은 C++ 문법(멤버 변수)으로 표현되지만 의도는 완전히 다르다. 그리고 둘 다 **상속(is-a)과는 명확히 구분**되어야 한다. is-a 관계를 has-a로 표현하면 다형성 활용이 어려워지고, has-a를 is-a로 표현하면 LSP를 깬다.

이 항목은 세 관계(is-a, has-a, is-implemented-in-terms-of)의 구분과 각각의 적절한 표현 방식을 정리한다.

## 개요

composition은 다른 클래스의 객체를 멤버로 보유하는 관계다. 두 가지 의미를 가진다.

- **어플리케이션 도메인의 has-a**: `Person`은 `Address`를 갖는다.
- **구현 도메인의 is-implemented-in-terms-of**: `Set`은 `List`로 구현된다.

공교롭게 둘 다 같은 C++ 문법(멤버 변수)으로 표현되지만 **의미는 다르다**. 상속(IS-A)과 명확히 구분해 이 둘 중 어느 의미인지 의식적으로 선택해야 한다.

## 필수 개념: 두 도메인의 차이

> **초보자를 위한 배경 지식**

<br>

소프트웨어 설계는 두 도메인에서 일어남:

- **어플리케이션 도메인**: 문제를 풀려는 실제 세계 — 사람, 주소, 트랜잭션, 게임 캐릭터
- **구현 도메인**: 코드를 효율적으로 만들기 위한 자료구조·알고리즘 — 해시 테이블, 리스트, 버퍼

`Person has-a Address`는 도메인 사실 (사람은 주소를 갖는다). `Set is implemented in terms of List`는 구현 선택 (Set을 List 위에 구현). 둘 다 멤버 변수로 표현되지만 **의도가 다르므로 코드 리뷰·문서에서 구분**해야.

## has-a — 어플리케이션 도메인

```cpp
class Address { /* 주소 데이터 */ };
class Phone   { /* 전화 데이터 */ };

class Person {
    std::string name;
    Address     addr;        // Person has-a Address
    Phone       phone;       // Person has-a Phone
public:
    // ...
};
```

**의미**: "사람은 이름, 주소, 전화를 갖는다." — 도메인 사실 그대로.

다른 도메인 예:
- `Car has-a Engine, Wheels[4], Driver` (자동차)
- `Order has-a Customer, OrderItem[]` (전자상거래)
- `Tree has-a Root` (게임)

도메인 모델링에서 IS-A와 HAS-A는 자연스럽게 구분됨 — "사람은 주소이다(IS-A)"는 말이 안 되니까.

## is-implemented-in-terms-of — 구현 도메인

`Set` 자료구조를 만들고 싶다고 가정. `Set`은:
- 중복 없는 원소 컬렉션
- 멤버십 검사 (`contains`), 삽입, 삭제

표준의 `std::list`로 구현하고 싶음. 잘못된 접근 — IS-A 상속:

```cpp
template<typename T>
class Set : public std::list<T> { /* ... */ };    // ❌
```

문제:
- `list`는 중복 허용, `Set`은 중복 X — **LSP 위반**
- `list::push_back`이 그대로 노출됨 — Set 사용자가 중복 삽입 가능
- 결국 `Set`이 `list`라는 약속을 지킬 수 없음

올바른 접근 — composition:

```cpp
template<typename T>
class Set {
    std::list<T> rep;       // ✅ Set is implemented in terms of List
public:
    bool member(const T& item) const {
        return std::find(rep.begin(), rep.end(), item) != rep.end();
    }

    void insert(const T& item) {
        if (!member(item)) rep.push_back(item);     // 중복 검사
    }

    void remove(const T& item) {
        auto it = std::find(rep.begin(), rep.end(), item);
        if (it != rep.end()) rep.erase(it);
    }

    std::size_t size() const { return rep.size(); }
};
```

**의미**: "Set은 list로 구현한다" — Set은 list가 **아니지만** 내부에서 활용. 인터페이스는 Set의 contract만, list는 구현 디테일.

## composition vs 상속 — 결정 트리

```
두 클래스 X와 Y의 관계는?
├── X is-a Y (도메인) → public 상속 (LSP 만족 확인)
├── X has-a Y → composition
├── X is-implemented-in-terms-of Y (구현 도구) → composition (또는 private 상속)
└── 헷갈리면 — composition 먼저 시도
```

## 흔한 함정 — 코드 재사용을 위한 IS-A

```cpp
class Animal {
public:
    void breathe();
    void eat();
};

class Robot : public Animal {     // ⚠️ 로봇은 동물?
public:
    void compute();
};
```

코드 재사용을 위해 상속을 쓰는 함정. `Robot is-a Animal`은 도메인상 거짓 — `breathe()`, `eat()`이 노출되면 사용자가 혼란.

해결: composition

```cpp
class Robot {
    Body body;        // Body 정의에 breathe·eat 비슷한 mechanic 있을 수도
public:
    void compute();
};
```

또는 공통 기능을 별도 base에:

```cpp
class LivingMechanism {
public:
    void consumeEnergy();
};

class Animal : public LivingMechanism {
public:
    void breathe();
};

class Robot : public LivingMechanism {
public:
    void compute();
};
```

## composition의 이점

### 1) LSP 위반 위험 없음

상속의 IS-A 계약이 깨질 일이 없음. 구현이 도메인 관계와 분리.

### 2) 결합도 낮음

```cpp
class Set {
    std::list<T> rep;       // 구현 교체 가능
public:
    // 인터페이스는 그대로
};

// 내일 std::vector로 교체
class Set {
    std::vector<T> rep;      // 인터페이스 동일, 구현만 변경
};
```

내부 구현을 바꿔도 사용자는 영향 없음.

### 3) 다중 구현 — 합성

```cpp
class Player {
    Renderer  renderer;        // 렌더링 위임
    Physics   physics;          // 물리 위임
    Inventory inventory;        // 인벤토리 위임
public:
    // ...
};
```

한 클래스가 여러 구현을 결합 — 다중 상속의 복잡성 없이.

## composition의 비용

### 1) 멤버 접근 비용 — 한 단계 더

`composition`은 멤버를 통한 호출 — 보통 무비용이지만 가상 함수와 결합 시 인라인 안 됨.

### 2) 코드 양

상속이면 자동으로 노출되는 기능을 — composition은 명시적 wrapping 필요.

```cpp
class Set {
    std::list<T> rep;
public:
    // rep의 size를 노출하려면:
    std::size_t size() const { return rep.size(); }
};
```

`using` 선언은 상속에만 가능 — composition에선 직접 wrapping.

### 3) EBO 안 됨

빈 클래스를 멤버로 두면 (보통) 1 byte 차지 — EBO는 base에만 적용. 항목 39 참고.

## 흔한 패턴 — 도메인 + 구현 결합

```cpp
class Order {
    // has-a (도메인)
    Customer        customer;
    Address         shippingAddress;
    OrderItem       items[10];

    // is-implemented-in-terms-of (구현)
    std::list<Payment> paymentLog;        // 결제 이력 — list로 구현
    std::unordered_map<int, int> indexCache;   // 빠른 조회 — map으로
};
```

도메인 멤버와 구현 멤버가 한 클래스에 함께 — 흔한 현실.

## 상속과 composition을 함께 — 안전한 패턴

```cpp
class Person {                          // 도메인 — 사람
public:
    virtual ~Person() = default;
    virtual std::string name() const;
};

class Customer : public Person {        // Customer is-a Person
    OrderHistory orders;                 // Customer has-a OrderHistory
    std::list<int> internalIDs;          // is-implemented-in-terms-of
public:
    // ...
};
```

`Person`이 인터페이스/도메인 상위 — `public 상속`. 내부 데이터 — composition.

## 모던 변형 — `std::pair`, `std::tuple`, aggregate

```cpp
class Config {
public:
    std::pair<int, int>           portRange;     // composition
    std::tuple<int, std::string>  versionInfo;
};
```

`std::pair`나 `std::tuple`도 composition의 한 형태 — 표준이 제공하는 has-a 구조.

C++20 aggregate + designated init:

```cpp
struct Config {
    std::string host = "localhost";
    int         port = 8080;
    Auth        auth;
};

Config c{.host = "example.com", .port = 9000};
```

## 흔한 함정 — composition으로 너무 일찍

```cpp
class Shape { /* virtual ... */ };
class Circle { Shape shape; };       // ⚠️ Circle has-a Shape??
```

`Circle is-a Shape`이 도메인 IS-A. composition은 함정. **첫 번째 도구는 도메인 IS-A 확인** — 맞으면 상속, 아니면 composition.

## 실무 가이드 — 체크리스트

새 멤버 관계 설계 시:

- [ ] 두 클래스의 관계가 무엇인가? (IS-A / HAS-A / IS-IMPLEMENTED-IN-TERMS-OF)
- [ ] IS-A라면 LSP 만족 확인 — 만족하면 public 상속
- [ ] HAS-A는 composition (멤버)
- [ ] IS-IMPLEMENTED-IN-TERMS-OF — composition (기본) 또는 private 상속 (항목 39 사유)
- [ ] 도메인 모델과 구현 디테일을 코드에서 구분 (네이밍, 코멘트)?
- [ ] 단순 코드 재사용을 위한 잘못된 IS-A 상속 아닌가?

## 핵심 정리

1. composition = **has-a** (도메인) 또는 **is-implemented-in-terms-of** (구현)
2. 상속(**IS-A**)과 혼동하지 말 것 — LSP 위반 위험
3. **결합도 낮음 + 구현 교체 자유** — composition의 이점
4. 단순 코드 재사용을 위한 IS-A 상속은 금지
5. 도메인 멤버와 구현 멤버를 코드/네이밍에서 구분
6. EBO나 protected 접근이 필요하면 → private 상속 (항목 39)

## 관련 항목

- [항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — IS-A의 조건
- [항목 39: private 상속](/blog/programming/cpp/effective-cpp/item39-use-private-inheritance-judiciously) — composition의 변형
- [항목 40: 다중 상속](/blog/programming/cpp/effective-cpp/item40-use-multiple-inheritance-judiciously) — 복합 관계
