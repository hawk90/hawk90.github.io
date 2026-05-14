---
title: "가이드라인 1: 소프트웨어 디자인의 중요성을 이해하라"
date: 2026-05-13T01:00:00
description: "디자인이란 무엇인가. 아키텍처·디자인·구현이라는 세 층위, 의존성 관리라는 본질, 그리고 디자인을 미룬 대가."
tags: [C++, Software Design, Architecture, Dependencies]
series: "C++ Software Design"
seriesOrder: 1
draft: true
---

## 왜 이 가이드라인이 중요한가?

C++ 개발자 대부분이 '디자인'을 함수와 클래스를 적당히 나누는 일 정도로 이해한다. 그런데 그 정의로는 다음과 같은 질문이 풀리지 않는다.

- 왜 어떤 코드는 6개월 만에 다시 쓰게 될까?
- 왜 한 줄 바꾸려는데 50군데를 손대야 할까?
- 왜 테스트는 늘 어려울까?

답은 단순하다. **디자인이 없기 때문이다**. 코드는 작성됐지만 설계되지는 않은 상태다. Iglberger가 책의 첫 가이드라인을 어떤 패턴이나 기법이 아니라 '디자인이 무엇이며 왜 중요한가'에 할애한 이유다.

이 가이드라인은 시리즈 전체의 토대다. 여기서 디자인의 본질을 잘못 잡으면 나머지 38개 가이드라인이 모두 미궁에 빠진다.

## 핵심 내용

- 소프트웨어 개발은 **세 층위**로 이루어진다. 아키텍처, 디자인, 구현.
- 디자인의 본질은 **의존성 관리**다. 결합도(coupling)와 응집도(cohesion)가 척도다.
- **변화는 상수**다. 디자인의 목표는 변경 가능성을 보존하는 일이다.
- 나쁜 디자인의 비용은 시간이 갈수록 **기하급수적으로** 쌓인다. 기술 부채다.
- 좋은 디자인은 처음 작성할 때가 아니라 **변경할 때** 빛을 발한다.

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

층위마다 다루는 결정이 다르다.

- **아키텍처** — 마이크로서비스로 갈지 모놀리스로 갈지, gRPC인지 REST인지.
- **디자인** — 이 기능을 어느 클래스에 둘지, 어떤 인터페이스로 노출할지.
- **구현** — 이 루프를 어떻게 작성할지, 어떤 자료구조를 쓸지.

각 층위는 변경 비용과 빈도가 크게 다르다.

| 층위 | 변경 비용 | 빈도 |
| --- | --- | --- |
| 아키텍처 | 매우 높음 | 매우 드묾 |
| 디자인 | 높음 | 종종 |
| 구현 | 낮음 | 매일 |

한번 잘못된 디자인 결정은 수개월 뒤에야 모습을 드러내고, 그때 고치는 비용은 크다. 그래서 많은 경우 디자인이 알고리즘보다 더 중요하다.

## 디자인의 본질 — 의존성 관리

Iglberger의 가장 강한 메시지가 이것이다.

> "**Software design is about managing dependencies.**"

좋은 디자인이란 클래스가 적은 게 아니다. 클래스 사이의 의존성이 적절히 분리된 상태다.

```cpp
// Bad: 모든 클래스가 다른 모든 클래스를 안다 — 의존성 폭발
class Order;
class Customer;
class PaymentSystem;
class Inventory;
class ShippingSystem;
class NotificationSystem;
// 각 클래스가 나머지 모두에 의존
```

```
Order ──┬── Customer
        ├── Payment
        ├── Inventory
        ├── Shipping
        └── Notification

다른 클래스들도 다시 서로 의존하므로 N×N의 의존성 그래프가 만들어진다.
```

이런 구조에서 클래스 하나를 수정하면 N개가 영향을 받는다. 테스트는 사실상 불가능해진다.

```cpp
// Good: 의존성이 단방향이고, 추상화로 차단된다
class Order {
    OrderRepository& repo_;       // 추상 인터페이스
    EventBus&        events_;     // 추상 인터페이스
public:
    void place();
};

// Order → OrderRepository (interface) ← PostgresOrderRepository (구현)
//       → EventBus (interface)         ← KafkaEventBus (구현)
```

의존성이 인터페이스로 격리되고 방향이 정해졌다. 수정의 영향 범위가 작아진다.

## 결합도(Coupling)와 응집도(Cohesion)

이 두 개념이 디자인 품질을 가늠하는 핵심 척도다.

### 결합도 — 낮을수록 좋다

> 한 모듈이 다른 모듈에 **얼마나 의존하는가**.

```cpp
// 결합도가 높다 — Service가 PostgresDB 자체에 의존한다
class Service {
    PostgresDB db_;
public:
    void process() { db_.query("..."); }
};

// 결합도가 낮다 — 추상 인터페이스에만 의존한다
class Service {
    Database& db_;     // interface
public:
    void process() { db_.query("..."); }
};
```

결합도가 낮으면 모듈을 갈아 끼울 수 있고 테스트하기도 쉽다.

### 응집도 — 높을수록 좋다

> 한 모듈 안의 요소들이 **얼마나 강하게 관련되어 있는가**.

```cpp
// 응집도가 낮다 — 한 클래스가 서로 무관한 일을 함께 한다
class UserUtility {
    void sendEmail();
    void formatDate();
    void calculateTax();
    void hashPassword();
};

// 응집도가 높다 — 한 클래스가 한 가지 책임만 진다
class UserAuthenticator {
    void hashPassword();
    void verifyPassword();
    void generateToken();
};
```

응집도가 높으면 단일 책임 원칙(SRP)에 가까워지고, 코드를 이해하기도 쉬워진다.

## 디자인을 미룰 때 누적되는 비용

```
시간 →

처음 작성:
  나쁜 디자인:   ●●●        (빨리 끝난다)
  좋은 디자인:   ●●●●●      (조금 더 걸린다)

6개월 뒤:
  나쁜 디자인:   ●●●●●●●●●● (변경이 어려워 시간이 폭발한다)
  좋은 디자인:   ●●●●●●     (변경이 쉬워 일정이 안정적이다)

2년 뒤:
  나쁜 디자인:   결국 다시 쓰기로 결정한다
  좋은 디자인:   여전히 정상적으로 진화한다
```

**기술 부채(technical debt)** 가 바로 이 누적 비용이다. 처음에 아낀 시간이 결국 큰 빚이 된다.

## 좋은 디자인의 네 가지 신호

### 1) 변경이 한 곳에서 끝난다

새 결제 수단을 추가하면 `PaymentSystem` 한 클래스만 손대면 된다. 다른 곳은 그대로다.

### 2) 테스트가 자연스럽다

`Service`가 `Database&` 인터페이스에 의존하므로 테스트에서 `MockDatabase`를 주입할 수 있다.

### 3) 인터페이스가 의도를 드러낸다

```cpp
class OrderProcessor {
public:
    void placeOrder(Order order);
    void cancelOrder(OrderId id);
    void shipOrder(OrderId id);
};
```

이름만 봐도 이 클래스가 무엇을 하는지 분명하다.

### 4) 새 기능은 새 클래스나 새 함수로 들어온다

기존 코드를 거의 손대지 않고 새 클래스나 함수를 추가하는 방식으로 확장된다. 개방-폐쇄 원칙(Open-Closed Principle)이다.

## 나쁜 디자인의 네 가지 신호

### 1) 산탄총 수술 (Shotgun Surgery)

한 가지 변경을 위해 코드베이스 곳곳에 흩어진 코드를 동시에 손대야 한다.

### 2) Feature Envy

A 클래스의 메서드가 정작 자기 클래스보다 B 클래스의 데이터를 더 많이 들여다본다. B의 메서드로 옮겨야 한다는 신호다.

### 3) 긴 매개변수 목록

```cpp
void process(int a, int b, double c, std::string d, bool e, bool f, ...);
```

매개변수가 다섯을 넘어가면 책임이 너무 커졌다는 신호다.

### 4) 부적절한 친밀함 (Inappropriate Intimacy)

두 클래스가 서로의 내부 구현을 너무 잘 안다. 캡슐화가 깨진 상태다.

## 디자인은 측정 가능하다

좋은 디자인에는 측정 가능한 속성이 따라온다.

- **Cyclomatic Complexity** — 함수 복잡도
- **Coupling Metrics** — 클래스 간 의존성 수
- **Cohesion Metrics (LCOM)** — 한 클래스의 응집도
- **Depth of Inheritance** — 상속 깊이
- **Lines of Code per Method** — 메서드 크기

도구로는 `lizard`, `pmd-cpp`, `cppcheck`, IDE 내장 분석기 등이 있다.

다만 숫자만 따져서는 안 된다. 디자인 품질의 8할은 결국 사람의 판단이다.

## "디자인은 코드와 분리된 것이 아니다"

옛 관념은 이런 식이었다. *"디자이너가 UML을 그리고, 코더가 그것을 구현한다."*

현실은 그렇지 않다. 디자인과 구현은 같은 활동의 두 측면일 뿐이다. 좋은 코드는 좋은 디자인의 결과이고, 좋은 디자인은 좋은 코드를 통해서만 드러난다.

> Code IS design. — Jack Reeves

특히 C++ 같은 정적 언어에서는 컴파일러가 타입, 인터페이스, 의존성을 통해 디자인을 직접 검증한다. 코드 바깥에 디자인을 따로 둘 자리가 없다.

## 함정 — 과도한 디자인

```cpp
// 단순 카운터 하나를 두고...
class CounterInterface { virtual int get() = 0; virtual void inc() = 0; };
class CounterFactory { virtual CounterInterface* create() = 0; };
class CounterStrategy { /* ... */ };
class CounterObserver { /* ... */ };
// 정작 사용처는 카운터 한 종류뿐
```

**YAGNI**, You Aren't Gonna Need It. 디자인은 현재 알려진 변경에 대비하는 일이다. 미래에 일어날지도 모르는 변화를 위해 추상화를 미리 만들지 말자. 잘못 추상화해 두면, 정작 진짜 변경이 왔을 때 그 추상화가 발목을 잡는다.

## 함정 — 디자인 무시

반대쪽 극단도 있다. *"일단 돌아가게 만들고 나중에 정리하자."* 그런데 그 '나중'은 거의 오지 않는다.

임베디드, 게임, 빠른 프로토타입 같은 맥락에서 특히 흔하다. "성능이 중요하니까", "출시가 급하니까"가 이유다. 결국 기술 부채가 쌓여 프로토타입이 그대로 무덤이 된다.

원칙은 이렇다. **처음 작성할 때 디자인을 충분히, 그러나 과하지 않게.** 이 균형이 핵심이다.

## 모던 C++ 도구가 디자인을 돕는다

C++11 이후의 도구들은 좋은 디자인을 자연스럽게 유도한다.

- **스마트 포인터** (`unique_ptr`, `shared_ptr`) — 소유권을 명시한다
- **`std::variant`, `std::optional`** — sum type과 선택적 값을 표현한다
- **C++20 concepts** — 인터페이스를 명시한다
- **`std::function`** — type erasure로 의존성을 차단한다
- **값 의미론(value semantics)** — 참조와 포인터를 줄인다
- **C++20 모듈** — 의존성 구조를 강화한다

각 도구가 디자인에 어떻게 기여하는지는 이후 가이드라인에서 차례로 다룬다.

## 실무 가이드 — 체크리스트

새 기능을 작성하기 전에 한 번씩 확인하자.

- [ ] 이 변경의 영향 범위는 어디까지인가? 한 클래스인가, 여러 클래스인가?
- [ ] 새 의존성이 생기는가? 그 의존성은 단방향인가?
- [ ] 인터페이스로 격리할 수 있는가?
- [ ] 기존 클래스를 수정하는 대신 새 클래스를 추가할 수 있는가?
- [ ] 테스트하기 쉬운가? 의존성을 주입할 수 있는가?
- [ ] 6개월 뒤의 내가 이 코드를 이해할 수 있는가?

## 정리

소프트웨어 디자인은 의존성을 적절히 분리하고 변화의 축을 찾아 캡슐화하는 활동이다. 알고리즘이나 코딩 기법이 아니라, **변경 가능성을 보존하는 일**이다.

핵심 원리를 다시 짚어 보면 다음과 같다.

1. **세 층위** — 아키텍처, 디자인, 구현
2. **본질은 의존성 관리** — 결합도는 낮게, 응집도는 높게
3. **변화는 상수** — 디자인의 목표는 변경 가능성이다
4. **나쁜 디자인의 비용은 기하급수적** — 기술 부채
5. **Code IS design** — 코드와 분리된 무엇이 아니다
6. **YAGNI** — 과도한 디자인도 함정이다

다음 가이드라인부터는 이 원리를 구체적인 도구로 풀어 본다.

## 관련 항목

- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — 변경 가능성을 구체적으로 어떻게 확보할지
- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — 인터페이스로 결합도를 다루는 법
- [Effective C++ 항목 23: 비-멤버 비-friend 함수](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — 결합도와 캡슐화
- [Beautiful C++ 항목 14: 싱글톤 피하기](/blog/programming/cpp/beautiful-cpp/item14-avoid-singletons) — 숨겨진 의존성
