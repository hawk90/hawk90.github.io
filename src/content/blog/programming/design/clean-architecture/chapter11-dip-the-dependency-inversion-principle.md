---
title: "Ch 11: DIP — 의존성 역전 원칙"
date: 2025-06-03T05:00:00
description: "고수준 모듈은 저수준 모듈에 의존하면 안 된다. 양쪽 모두 추상에 의존해야 한다 — Clean Architecture의 핵심 도구."
tags: [Architecture, SOLID, DIP]
series: "Clean Architecture"
seriesOrder: 11
---

## 이 챕터의 메시지

SOLID의 마지막 원칙. 그리고 Clean Architecture에서 가장 중요한 원칙.

> **High-level modules should not depend on low-level modules. Both should depend on abstractions.**
> **Abstractions should not depend on details. Details should depend on abstractions.**

고수준 모듈은 저수준 모듈에 의존하면 안 된다. 양쪽 모두 추상에 의존해야 한다.

추상은 디테일에 의존하면 안 된다. 디테일이 추상에 의존해야 한다.

이 원칙이 5장(OO)에서 본 **의존성 역전**을 정식화한다.

## 안정성과 의존성 — 변동성 차원

DIP를 이해하려면 한 가지 직관이 필요하다.

> **소스 코드는 자주 바뀌는 것에 의존하면 안 된다. 안정적인 것에 의존해야 한다.**

코드 변경은 비용이다. 자주 바뀌는 것에 의존하면 그 변경이 우리 코드를 자주 깨뜨린다. 안정적인 것에 의존하면 우리 코드도 안정된다.

**자주 바뀌는 것**:
- 구체적 구현체 (concrete classes)
- 디테일 (DB, UI, 외부 API)
- 사람이 짠 코드

**안정적인 것**:
- 표준 라이브러리 (java.lang.String, std::vector)
- 안정적인 추상 (인터페이스, 추상 클래스)
- 도메인의 본질적 개념

DIP의 핵심 — **변동성이 높은 것은 변동성이 낮은 것에 의존하게**.

## 구체적 예 — 의존성 역전 전과 후

```java
// 역전 전 — 고수준이 저수준에 의존
class OrderProcessor {
  private MySqlDatabase db;
  public OrderProcessor() { this.db = new MySqlDatabase(); }
  public void process(Order o) { db.save(o); }
}
```

`OrderProcessor`(정책)가 `MySqlDatabase`(디테일)에 의존한다. MySQL이 변하면 OrderProcessor가 영향을 받는다. DB를 다른 것으로 바꾸려면 OrderProcessor를 수정해야 한다.

```java
// 역전 후 — 양쪽이 추상에 의존
interface OrderRepository {  // 정책 측이 소유
  void save(Order o);
}

class OrderProcessor {
  private OrderRepository repo;
  public OrderProcessor(OrderRepository r) { this.repo = r; }
  public void process(Order o) { repo.save(o); }
}

class MySqlOrderRepository implements OrderRepository {  // 디테일이 추상을 구현
  public void save(Order o) { /* MySQL 코드 */ }
}
```

이제 **의존성 화살표가 뒤집혔다**.

```
이전:                       이후:
OrderProcessor              OrderProcessor
     ↓                            ↓
MySqlDatabase             OrderRepository (추상)
                                ↑
                          MySqlOrderRepository (구현)
```

OrderProcessor가 OrderRepository만 알면 되고, MySqlOrderRepository는 OrderRepository에 의존한다. MySQL이 변해도 OrderProcessor는 그대로다.

## 누가 인터페이스를 소유하는가

이 부분이 핵심이다. **인터페이스는 정책 측(고수준)이 소유한다**.

```
정책 컴포넌트                  디테일 컴포넌트
┌─────────────────┐           ┌──────────────────┐
│ OrderProcessor  │           │                  │
│                 │           │ MySqlOrderRepository
│ OrderRepository │ ←─────── │                  │
│  (인터페이스)    │           │ (인터페이스 구현) │
└─────────────────┘           └──────────────────┘
```

OrderRepository 인터페이스가 정책 컴포넌트에 살아 있다. MySqlOrderRepository는 그 인터페이스에 의존한다(implements). 의존성 화살표가 모두 정책 쪽을 향한다.

이게 "역전"의 진짜 의미다. **저수준이 고수준의 인터페이스를 구현한다**.

## 변동성과 안정성의 매핑

DIP의 응용은 단순한 규칙이다.

> **변동성이 높은 클래스(concrete class)를 직접 참조하지 마라. 안정적인 추상(인터페이스)을 통해 참조하라.**

따라서 코드는 다음과 같이 짜인다.

- 변수의 타입은 인터페이스로
- 객체 생성은 분리 (팩토리, DI)
- `new` 키워드의 사용을 최소화

```java
// ❌
OrderProcessor proc = new OrderProcessor(new MySqlDatabase());

// ✅
OrderRepository repo = factory.createRepository();
OrderProcessor proc = new OrderProcessor(repo);
```

## Abstract Factory — 객체 생성의 역전

객체 생성은 본질적으로 구체 클래스를 알아야 한다. `new` 키워드는 항상 구체 클래스 이름을 요구한다.

해법은 **Abstract Factory**다.

```java
interface OrderRepositoryFactory {
  OrderRepository create();
}

class MySqlOrderRepositoryFactory implements OrderRepositoryFactory { ... }
class MongoDbOrderRepositoryFactory implements OrderRepositoryFactory { ... }
```

이제 객체 생성도 인터페이스를 통해 일어난다. 정책 코드는 어떤 팩토리를 받았는지에 따라 다른 구현을 사용한다.

이게 GoF Abstract Factory 패턴의 정확한 동기다 — **DIP를 객체 생성에까지 확장**.

## DIP의 한계 — 모든 의존을 역전할 수는 없다

Martin도 인정한다. 어딘가에서 구체 클래스의 이름이 등장해야 한다. 누군가가 `new MySqlOrderRepository()`를 해야만 한다.

DIP의 목표는 그 의존을 **시스템의 한 곳에 격리**하는 것이다.

- `main()` 함수 또는 **Composition Root**
- 의존성 주입 컨테이너 (Spring, Guice, Boost.DI)
- 부트스트랩 모듈

이 한 곳을 제외한 모든 코드는 추상에만 의존한다.

## 변경의 영향 차단

DIP가 만들어내는 진짜 가치는 **변경의 영향 범위 차단**이다.

```
변경:                      영향 범위 (DIP 미적용):
DB를 MySQL에서 Mongo로     모든 코드가 영향 받음

변경:                      영향 범위 (DIP 적용):
DB를 MySQL에서 Mongo로     새 Repository 구현체 하나만
```

DIP가 적용된 시스템은 **디테일의 변경이 정책에 도달하지 못한다**. 이게 Clean Architecture의 동심원 다이어그램(22장)에서 보게 될 의존성 규칙 — "모든 의존성은 안쪽을 향한다" — 의 본질이다.

## DIP와 다른 SOLID의 관계

DIP는 SOLID의 다른 원칙들의 결과이기도 하다.

- **OCP**가 디테일 추가에 닫혀 있으려면 → DIP로 디테일을 추상 뒤로
- **LSP**가 보장되려면 → 인터페이스 계약이 명확해야 → DIP의 추상이 안정적이어야
- **ISP**가 작동하려면 → 인터페이스가 클라이언트별로 분리 → DIP의 추상이 적절히 작아야

DIP는 SOLID의 마지막이지만, 다른 원칙들의 결과를 묶는 자석이다.

## 정리

- DIP — **고수준은 저수준에 의존하지 마라**, 양쪽 모두 **추상에 의존**
- 변동성이 높은 것은 **변동성이 낮은 것**에 의존
- **인터페이스는 정책 측이 소유** — 디테일이 그 인터페이스를 구현
- 의존성 화살표가 **모두 정책을 향한다**
- 객체 생성도 **Abstract Factory**로 역전
- 구체 클래스 사용은 **한 곳(main / Composition Root)**에 격리
- 진짜 가치 — **디테일의 변경이 정책에 도달하지 못한다**

## 다음 장 예고

여기까지가 SOLID(클래스 수준). 다음 장부터는 **컴포넌트 원칙** — 클래스 수준에서 컴포넌트 수준으로 줌 아웃한다.

## 관련 항목

- [Ch 5: OO](/blog/programming/design/clean-architecture/chapter05-object-oriented-programming) — DIP의 도구로서의 다형성
- [C++ Software Design 가이드라인 9: 추상화 소유권](/blog/programming/cpp/cpp-software-design/guideline09-pay-attention-to-the-ownership-of-abstractions) — 같은 원칙
- [GoF Abstract Factory](/blog/programming/design/gof-design-patterns/) — DIP의 객체 생성 확장
