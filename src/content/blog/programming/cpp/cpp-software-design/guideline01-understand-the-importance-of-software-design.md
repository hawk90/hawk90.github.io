---
title: "가이드라인 1: 소프트웨어 디자인의 중요성을 이해하라"
date: 2026-05-13T11:00:00
description: "디자인이란 무엇인가 — 아키텍처, 디자인, 구현 세 층위. 의존성과 결합도가 본질. 디자인 부재의 비용."
tags: [C++, Software Design, Architecture, Dependencies]
series: "C++ Software Design"
seriesOrder: 1
---

## 왜 이 가이드라인이 중요한가?

대다수 C++ 개발자가 — "디자인"을 **함수와 클래스를 적당히 나누는 것** 정도로 이해한다. 그러나 그 정의로는:

- 왜 어떤 코드는 6개월만에 다시 쓰게 되는가?
- 왜 한 줄 바꾸려는데 50군데를 손대야 하는가?
- 왜 테스트가 항상 어려운가?

답은 — **디자인이 부재하기 때문**이다. 코드는 **작성**됐지만 **설계**되지 않았다. Iglberger는 책의 첫 가이드라인을 — 패턴이나 기법이 아닌 **"디자인이 무엇이며 왜 중요한가"** 에 할애한다.

이 가이드라인은 — 시리즈 전체의 토대. 디자인의 본질을 잘못 잡으면 나머지 38개 가이드라인이 모두 미궁.

## 핵심 내용

- 소프트웨어 개발은 **3개 층위** — 소프트웨어 아키텍처 / 소프트웨어 디자인 / 구현
- 디자인의 **본질은 의존성 관리** — coupling(결합도)와 cohesion(응집도)
- **변화는 상수**다 — 디자인의 목표는 **변경 가능성**을 보존
- **나쁜 디자인의 비용은 시간이 지날수록 기하급수적** — 기술 부채 누적
- 좋은 디자인은 — 처음 작성이 아니라 **변경할 때** 빛난다

## 세 층위 — Architecture / Design / Implementation

```
┌───────────────────────────────────┐
│  소프트웨어 아키텍처 (Architecture)  │  ← 거대 단위 결정 (서비스, 모듈, 통신)
├───────────────────────────────────┤
│   소프트웨어 디자인 (Design)         │  ← 클래스 간 관계, 인터페이스, 의존성
├───────────────────────────────────┤
│      구현 (Implementation)         │  ← 알고리즘, 자료구조, 코딩
└───────────────────────────────────┘
```

각 층위가 다른 결정을 한다:

- **아키텍처** — "마이크로서비스 vs 모놀리스, gRPC vs REST"
- **디자인** — "이 기능은 어느 클래스에, 어떤 인터페이스로"
- **구현** — "이 루프는 어떻게 작성, 이 자료구조는 어떤 것"

세 층위가 **서로 다른 시간 척도와 비용**을 가진다:

| 층위 | 변경 비용 | 빈도 |
| --- | --- | --- |
| 아키텍처 | 매우 높음 | 매우 드물게 |
| 디자인 | 높음 | 종종 |
| 구현 | 낮음 | 매일 |

**디자인의 결정**은 한 번 잘못되면 — 수개월 후에야 발견되고 수정 비용은 크다. 그래서 디자인이 **알고리즘보다 중요한 경우가 많다**.

## 디자인의 본질 — 의존성 관리

Iglberger의 가장 강한 메시지:

> "**Software design is about managing dependencies.**"

좋은 디자인은 — 클래스가 적은 게 아니다. 클래스 간 **의존성이 적절히 분리**된 것.

```cpp
// Bad: 모든 게 모든 걸 알고 있음 — 의존성 폭발
class Order;
class Customer;
class PaymentSystem;
class Inventory;
class ShippingSystem;
class NotificationSystem;
// 각 클래스가 다른 모든 클래스에 의존
```

```
Order ──┬── Customer
        ├── Payment
        ├── Inventory
        ├── Shipping
        └── Notification

각 클래스도 다시 서로 의존 → N×N의 의존성 그래프
```

한 클래스를 수정하면 — N개가 영향. 테스트는 불가능에 가까움.

```cpp
// Good: 의존성 방향이 단방향, 추상화로 차단
class Order {
    OrderRepository& repo_;       // 추상 인터페이스
    EventBus&        events_;     // 추상 인터페이스
public:
    void place();
};

// Order → OrderRepository (interface) ← PostgresOrderRepository (구현)
//       → EventBus (interface)         ← KafkaEventBus (구현)
```

의존성이 — 인터페이스로 격리, 단방향. 수정 영향 범위 작음.

## 결합도(Coupling) vs 응집도(Cohesion)

두 개념이 디자인 품질의 핵심 척도:

### 결합도(Coupling) — 낮을수록 좋음

> 한 모듈이 다른 모듈에 **얼마나 의존**하는가.

```cpp
// 높은 결합도 — Service가 PostgresDB에 직접 의존
class Service {
    PostgresDB db_;
public:
    void process() { db_.query("..."); }
};

// 낮은 결합도 — 추상 인터페이스 의존
class Service {
    Database& db_;     // interface
public:
    void process() { db_.query("..."); }
};
```

낮은 결합도 = 모듈 교체 가능, 테스트 용이.

### 응집도(Cohesion) — 높을수록 좋음

> 한 모듈 안의 요소들이 **얼마나 강하게 관련**되어 있는가.

```cpp
// 낮은 응집도 — 한 클래스가 서로 무관한 일들을 함
class UserUtility {
    void sendEmail();
    void formatDate();
    void calculateTax();
    void hashPassword();
};

// 높은 응집도 — 한 클래스가 한 가지 책임
class UserAuthenticator {
    void hashPassword();
    void verifyPassword();
    void generateToken();
};
```

높은 응집도 = 단일 책임 원칙(SRP), 이해하기 쉬움.

## 디자인 부재의 비용 — 누적

```
시간 →

처음 작성:
  나쁜 디자인:   ●●●  (빠르게 끝남)
  좋은 디자인:   ●●●●● (조금 더 걸림)

6개월 후:
  나쁜 디자인:   ●●●●●●●●●● (변경 어려워 시간 폭발)
  좋은 디자인:   ●●●●●●   (변경 쉬워 일정 안정)

2년 후:
  나쁜 디자인:   결국 다시 쓰는 결정
  좋은 디자인:   여전히 정상 진화
```

**기술 부채**(technical debt) — 나쁜 디자인의 누적 비용. 처음의 작은 절약이 — 결국 큰 빚.

## 좋은 디자인의 4가지 신호

### 1) 변경이 국소적이다

새 결제 수단 추가 → `PaymentSystem` 한 클래스만 수정. 다른 곳은 영향 없음.

### 2) 테스트가 자연스럽다

`Service`가 `Database&` 인터페이스에 의존 → 테스트에서 `MockDatabase` 주입 가능.

### 3) 인터페이스를 보면 의도가 드러난다

```cpp
class OrderProcessor {
public:
    void placeOrder(Order order);
    void cancelOrder(OrderId id);
    void shipOrder(OrderId id);
};
```

이름만 봐도 — 무엇을 하는 클래스인지 명확.

### 4) 새 기능 추가가 새 클래스 / 새 함수로

기존 코드를 거의 수정 없이 — 새 클래스/함수 추가로 확장. Open-Closed Principle.

## 나쁜 디자인의 4가지 신호

### 1) Shotgun Surgery (산탄총 수술)

한 변경을 위해 — 코드베이스 곳곳에 흩어진 코드를 동시에 수정해야 함.

### 2) Feature Envy

A 클래스의 메서드가 — 자기 클래스보다 B 클래스의 데이터를 더 많이 사용. → B의 메서드여야 했음.

### 3) Long Parameter Lists

```cpp
void process(int a, int b, double c, std::string d, bool e, bool f, ...);
```

매개변수 5개 넘으면 — 책임이 너무 커진 신호.

### 4) Inappropriate Intimacy

두 클래스가 — 서로의 내부 구현을 너무 잘 알고 있음. 캡슐화 깨짐.

## 디자인의 측정 가능성

좋은 디자인은 **측정 가능**한 속성을 가진다:

- **Cyclomatic Complexity** — 함수 복잡도
- **Coupling Metrics** — 클래스 간 의존성 수
- **Cohesion Metrics** (LCOM) — 한 클래스의 응집도
- **Depth of Inheritance** — 상속 깊이
- **Lines of Code per Method** — 메서드 크기

도구: `lizard`, `pmd-cpp`, `cppcheck`, IDE 내장 분석기.

다만 — **숫자가 다는 아니다**. 디자인 품질의 80%는 **사람의 판단**.

## "디자인은 코드와 분리된 것이 아니다"

옛 관념 — "**디자이너가 UML 그리고, 코더가 구현**".

현실 — 디자인과 구현은 **같은 활동**의 다른 측면. 좋은 코드는 좋은 디자인의 결과, 좋은 디자인은 좋은 코드를 통해서만 드러남.

> Code IS design. — Jack Reeves

C++ 같은 정적 언어에선 특히 — **컴파일러가 디자인을 검증**(타입, 인터페이스, 의존성). 디자인을 코드 아닌 곳에 둘 수가 없다.

## 함정 — 과도한 디자인

```cpp
// 단순 카운터를 위해...
class CounterInterface { virtual int get() = 0; virtual void inc() = 0; };
class CounterFactory { virtual CounterInterface* create() = 0; };
class CounterStrategy { /* ... */ };
class CounterObserver { /* ... */ };
// 정작 카운터는 단 한 가지만 사용
```

**YAGNI** (You Aren't Gonna Need It). 디자인은 — **현재 알려진 변경**에 대비. 미래의 가능성을 위해 추상화를 미리 만들지 말 것. 잘못 추상화하면 — 진짜 변경이 왔을 때 그 추상화가 방해.

## 함정 — 디자인 무시

반대 극단. "**일단 돌아가게 만들고 나중에 정리**" → 그 "나중에"는 절대 안 옴.

특히 — 임베디드, 게임, 빠른 prototype 컨텍스트에서 흔함. "성능이 중요하니까", "출시 일정이 급하니까". 결국 — 기술 부채가 prototype을 무덤으로.

**원칙**: 처음 작성할 때 디자인을 **충분히** 하고, **과하지** 않게. 균형.

## 모던 C++ 도구가 디자인을 도움

C++11+ 도구들이 — 좋은 디자인을 **자연스럽게** 만들어줌:

- **스마트 포인터** (`unique_ptr`, `shared_ptr`) — 소유권 명시
- **`std::variant` / `std::optional`** — sum type, 선택적 값
- **C++20 concepts** — 인터페이스 명시
- **`std::function`** — type erasure로 의존성 차단
- **Value semantics** — 참조/포인터 회피
- **Modules** (C++20) — 의존성 구조 강화

가이드라인 진행하면서 — 각 도구가 디자인에 어떻게 기여하는지 다룸.

## 실무 가이드 — 체크리스트

새 기능을 작성하기 전:

- [ ] 이 변경의 **영향 범위**는? 한 클래스? 여러 클래스?
- [ ] 새 의존성이 추가되는가? **단방향**인가?
- [ ] 인터페이스로 격리할 수 있는가?
- [ ] 기존 클래스를 수정 vs 새 클래스 추가 — 후자가 가능한가?
- [ ] **테스트하기 쉬운가**? (의존성 주입 가능?)
- [ ] **6개월 후 다시 본 자신**이 이해할 수 있는가?

## 정리

소프트웨어 디자인은 — **의존성을 적절히 분리하고 변화의 축을 찾아 캡슐화**하는 것. 알고리즘이나 코딩 기법이 아닌, **변경 가능성을 보존하는 활동**.

핵심 원리:
1. **3 층위** — 아키텍처 / 디자인 / 구현
2. **본질은 의존성 관리** — 결합도 낮게, 응집도 높게
3. **변화는 상수** — 디자인의 목표는 변경 가능성
4. **나쁜 디자인의 비용은 기하급수적** — 기술 부채
5. **Code IS design** — 코드와 분리된 것이 아니다
6. **YAGNI** — 과도한 디자인도 함정

다음 가이드라인부터 — 이 원리들을 구체적 도구로.

## 관련 항목

- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — 변경 가능성의 구체적 방법
- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — 인터페이스로 결합도 관리
- [Effective C++ 항목 23: 비-멤버 비-friend](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — 결합도와 캡슐화
- [Beautiful C++ 항목 14: 싱글톤 피하기](/blog/programming/cpp/beautiful-cpp/item14-avoid-singletons) — 숨겨진 의존성
