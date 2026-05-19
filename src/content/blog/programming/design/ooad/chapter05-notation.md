---
title: "Ch 5: Notation"
date: 2026-05-19T05:00:00
description: "표기법 — UML 클래스, 시퀀스, 상태 다이어그램."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 5
tags: [oop, booch, uml, notation, diagrams]
draft: false
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 좋은 표기법은 **시스템의 본질을 드러낸다**. UML은 정적 구조(클래스 다이어그램)와 동적 행동(시퀀스, 상태 다이어그램)을 시각화하는 표준이다.

## 표기법의 목적

"그림 한 장이 천 마디 말보다 낫다"는 말이 소프트웨어 설계에도 적용됩니다. 코드 10만 줄을 읽으며 전체 구조를 파악하기는 어렵지만, 클래스 다이어그램 한 장은 핵심 구조를 한눈에 보여줍니다.

### 왜 표기법이 필요한가

| 역할 | 설명 | 실무 상황 |
|------|------|----------|
| 의사소통 | 팀원 간 설계 공유, 이해관계자와 소통 | "이 다이어그램 보세요, 주문이 결제로 가는 흐름입니다" |
| 시각화 | 복잡성을 관리 가능하게, 전체와 세부를 오갈 수 있음 | 아키텍처 리뷰에서 모듈 간 의존성 파악 |
| 검증 | 설계 결함 조기 발견, 일관성 확인 | 시퀀스 다이어그램으로 "이 시나리오에서 누가 호출을 시작하지?" |
| 명세 | 구현 가이드, 계약 정의 | 클래스 다이어그램을 보고 코드 뼈대 생성 |

**주의**: 다이어그램은 *코드의 대체*가 아닙니다. 다이어그램은 *코드에 대해 이야기하는 도구*입니다. 다이어그램이 코드와 불일치하면 혼란만 줍니다.

### UML의 탄생

1990년대 초, 객체지향 방법론이 난립했습니다. Booch 방법론, OMT, OOSE 등 각자의 표기법을 가졌고, 서로 호환되지 않았습니다.

| 기여자 | 방법론 | 강점 |
|--------|--------|------|
| Grady Booch | Booch 방법론 | 설계, 구현 상세 |
| James Rumbaugh | OMT (Object Modeling Technique) | 데이터 모델링 |
| Ivar Jacobson | OOSE (Object-Oriented Software Engineering) | 유스케이스 |

세 사람이 Rational Software에서 만나 방법론을 통합했고, 1997년 **UML (Unified Modeling Language)**이 탄생했습니다. OMG(Object Management Group)가 표준으로 채택했고, 현재 UML 2.5까지 발전했습니다.

**UML의 가치**: 어떤 언어(Java, C#, Python)를 쓰든, 어떤 도구를 쓰든, 같은 표기법으로 소통할 수 있습니다. "클래스 다이어그램"이라고 하면 모두가 같은 그림을 떠올립니다.

## 정적 모델: 클래스 다이어그램

### 클래스 표현

```text
클래스 박스:
┌─────────────────────┐
│   <<stereotype>>    │  (선택)
│     ClassName       │  클래스 이름
├─────────────────────┤
│ - privateAttr: Type │  속성
│ + publicAttr: Type  │
│ # protectedAttr     │
├─────────────────────┤
│ + publicMethod()    │  연산
│ - privateMethod()   │
│ # protectedMethod() │
└─────────────────────┘

가시성 기호:
  + public
  - private
  # protected
  ~ package (Java)
```

```text
속성과 연산 표기:

속성:
  visibility name : type [multiplicity] = default {property}
  - balance : Money = 0 {readOnly}
  + items : List<OrderItem> [0..*]

연산:
  visibility name (parameters) : return-type {property}
  + withdraw(amount: Money) : boolean
  + getBalance() : Money {query}
  - validate(amount: Money) : void
```

### 관계 표현

```text
연관 (Association):
  Customer ────────── Order
  고객이 주문을 가진다

  표기:
    실선 연결
    역할명 (선택)
    다중성 (1, 0..1, *, 1..*)
    화살표 (단방향 탐색)

예:
  Customer 1 ─────── * Order
            owns▶

집합 (Aggregation):
  Department ◇────── Employee
  부서가 직원을 포함 (약한 소유)

  표기:
    빈 다이아몬드

합성 (Composition):
  House ◆────── Room
  집이 방을 소유 (강한 소유)

  표기:
    채워진 다이아몬드
```

```text
의존 (Dependency):
  Controller -------> Service
  컨트롤러가 서비스를 사용

  표기:
    점선 화살표

일반화 (Generalization):
  Animal
    △
    │
  ┌─┴─┐
 Dog  Cat

  표기:
    삼각형 화살표 (상위로)

실체화 (Realization):
  <<interface>>
  Comparable
      △
      ┊
   Product

  표기:
    빈 삼각형 + 점선
```

### 클래스 다이어그램 예시

```text
전자상거래 도메인:

┌─────────────────┐       1  places  *  ┌─────────────────┐
│    Customer     │◆──────────────────│      Order       │
├─────────────────┤                    ├─────────────────┤
│ - id: CustomerId│                    │ - id: OrderId    │
│ - name: String  │                    │ - status: Status │
│ - email: Email  │                    │ - createdAt: Date│
├─────────────────┤                    ├─────────────────┤
│ + placeOrder()  │                    │ + addItem()      │
│ + getOrders()   │                    │ + cancel()       │
└─────────────────┘                    │ + getTotal()     │
                                       └────────┬────────┘
                                                │ 1
                                                │contains
                                                │ *
                                       ┌────────┴────────┐
                                       │    OrderItem    │
                                       ├─────────────────┤
                                       │ - quantity: int │
                                       │ - unitPrice     │
                                       ├─────────────────┤
                                       │ + getSubtotal() │
                                       └────────┬────────┘
                                                │ *
                                                │refers to
                                                │ 1
                                       ┌────────┴────────┐
                                       │    Product      │
                                       ├─────────────────┤
                                       │ - name: String  │
                                       │ - price: Money  │
                                       └─────────────────┘
```

## 동적 모델: 시퀀스 다이어그램

### 기본 요소

```text
시퀀스 다이어그램 구성:
  1. 라이프라인 (Lifeline)
     - 참여 객체
     - 세로 점선

  2. 메시지 (Message)
     - 동기 호출: 실선 + 채운 화살촉 ─────▶
     - 비동기: 실선 + 빈 화살촉 ─────>
     - 응답: 점선 <------

  3. 활성 막대 (Activation)
     - 실행 중인 시간
     - 세로 직사각형

  4. 프레임 (Frame)
     - 조건, 반복 등
     - alt, loop, opt, par
```

### 시퀀스 다이어그램 예시

```text
주문 처리 시나리오:

  :Client    :OrderController   :OrderService   :Inventory   :Payment
     │              │                 │              │           │
     │ createOrder()│                 │              │           │
     │─────────────▶│                 │              │           │
     │              │ createOrder()   │              │           │
     │              │────────────────▶│              │           │
     │              │                 │ checkStock() │           │
     │              │                 │─────────────▶│           │
     │              │                 │   available  │           │
     │              │                 │◀─ ─ ─ ─ ─ ─ ─│           │
     │              │                 │              │           │
     │              │                 │ authorize()  │           │
     │              │                 │─────────────────────────▶│
     │              │                 │   success    │           │
     │              │                 │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
     │              │                 │              │           │
     │              │                 │ reserve()    │           │
     │              │                 │─────────────▶│           │
     │              │                 │              │           │
     │              │   OrderDto      │              │           │
     │              │◀─ ─ ─ ─ ─ ─ ─ ─ │              │           │
     │  response    │                 │              │           │
     │◀─ ─ ─ ─ ─ ─ ─│                 │              │           │
```

### 조합 프래그먼트

```text
조건부 (alt):
  ┌──────────────────────────────────┐
  │ alt [stock > 0]                  │
  │   ─────────▶ reserve()           │
  ├──────────────────────────────────┤
  │ [else]                           │
  │   ─────────▶ backorder()         │
  └──────────────────────────────────┘

반복 (loop):
  ┌──────────────────────────────────┐
  │ loop [for each item]             │
  │   ─────────▶ checkItem()         │
  └──────────────────────────────────┘

선택 (opt):
  ┌──────────────────────────────────┐
  │ opt [customer.isVIP()]           │
  │   ─────────▶ applyDiscount()     │
  └──────────────────────────────────┘

병렬 (par):
  ┌──────────────────────────────────┐
  │ par                              │
  │   ─────────▶ sendEmail()         │
  ├──────────────────────────────────┤
  │   ─────────▶ sendSMS()           │
  └──────────────────────────────────┘
```

## 동적 모델: 상태 다이어그램

### 상태 머신 요소

```text
상태 다이어그램 구성:
  1. 상태 (State)
     - 둥근 사각형
     - 이름, 진입/퇴장 동작

  2. 전이 (Transition)
     - 화살표
     - 트리거 [조건] / 동작

  3. 초기 상태
     - 채워진 원 ●

  4. 최종 상태
     - 이중원 ◎

  5. 복합 상태
     - 하위 상태 포함
```

```text
상태 표기:

┌─────────────────────────┐
│       StateName         │
├─────────────────────────┤
│ entry / doSomething()   │
│ do / continuousAction() │
│ exit / cleanup()        │
└─────────────────────────┘

전이 표기:
  trigger [guard] / action
  예: submit [valid] / save()
```

### 상태 다이어그램 예시

```text
주문 상태 머신:

     ●
     │
     ▼
┌─────────┐   place()   ┌─────────┐   pay()    ┌─────────┐
│  Draft  │────────────▶│ Pending │───────────▶│  Paid   │
└─────────┘             └────┬────┘            └────┬────┘
                             │                      │
                        cancel()                ship()
                             │                      │
                             ▼                      ▼
                       ┌─────────┐            ┌─────────┐
                       │Cancelled│            │ Shipped │
                       └─────────┘            └────┬────┘
                                                   │
                                              deliver()
                                                   │
                                                   ▼
                                             ┌─────────┐
                                             │Delivered│
                                             └────┬────┘
                                                  │
                                                  ▼
                                                  ◎
```

```text
복합 상태 예시 — 결제 처리:

┌──────────────────────────────────────────────────────┐
│                    PaymentProcessing                 │
│  ┌─────────┐  authorize()  ┌─────────┐  capture()   │
│  │Authorizing│────────────▶│Authorized│────────────▶│
│  └─────────┘              └─────────┘              │
│       │                        │                    │
│   fail()                   cancel()                │
│       │                        │                    │
│       ▼                        ▼                    │
│  ┌─────────┐              ┌─────────┐              │
│  │ Failed  │              │ Voided  │              │
│  └─────────┘              └─────────┘              │
└──────────────────────────────────────────────────────┘
```

## 기타 다이어그램

### 유스케이스 다이어그램

```text
유스케이스 다이어그램:
  - 시스템 기능의 외부 뷰
  - 액터와 유스케이스 관계

┌─────────────────────────────────────────┐
│           Online Store System           │
│                                         │
│    ┌─────────┐                         │
│    │ Browse  │◀──────────┐             │
│    │ Catalog │           │             │
│    └─────────┘           │             │
│                          │             │
│    ┌─────────┐       ┌───┴───┐        │
│    │  Place  │◀──────│Customer│        │
│    │  Order  │       └───────┘        │
│    └────┬────┘                         │
│         │                              │
│    <<include>>                         │
│         │                              │
│         ▼                              │
│    ┌─────────┐       ┌───────┐        │
│    │ Process │◀──────│ Admin │        │
│    │ Payment │       └───────┘        │
│    └─────────┘                         │
└─────────────────────────────────────────┘
```

### 활동 다이어그램

```text
활동 다이어그램:
  - 워크플로우 표현
  - 병렬 처리, 분기, 합류

        ●
        │
        ▼
  ┌───────────┐
  │ 주문 접수  │
  └─────┬─────┘
        │
        ◆ [재고 확인]
       ╱ ╲
      ╱   ╲
    있음   없음
     │       │
     ▼       ▼
┌───────┐ ┌───────┐
│ 출고  │ │ 발주  │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ═══════ (포크/조인)
        ╱     ╲
       ▼       ▼
  ┌───────┐ ┌───────┐
  │ 배송  │ │ 알림  │
  └───┬───┘ └───┬───┘
      └────┬────┘
           │
           ═══════
           │
           ▼
           ◎
```

### 컴포넌트 다이어그램

```text
컴포넌트 다이어그램:
  - 물리적 구조
  - 컴포넌트 간 의존성

┌───────────────┐     ┌───────────────┐
│  <<component>>│     │  <<component>>│
│   WebClient   │────▶│   APIServer   │
└───────────────┘     └───────┬───────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
           ┌────────▼───────┐  ┌────────▼───────┐
           │  <<component>> │  │  <<component>> │
           │ OrderService   │  │ PaymentService │
           └────────┬───────┘  └────────────────┘
                    │
           ┌────────▼───────┐
           │  <<component>> │
           │   Database     │
           └────────────────┘
```

## 표기법 적용 지침

### 적절한 추상화 수준

| 추상화 수준 | 대상 | 내용 |
|------------|------|------|
| 개념 수준 (Conceptual) | 비즈니스 분석가 | 도메인 개념만, 구현 세부사항 없음 |
| 명세 수준 (Specification) | 설계자 | 인터페이스 정의, 타입 정보 포함 |
| 구현 수준 (Implementation) | 개발자 | 모든 세부사항, 코드와 1:1 대응 |

**권장**: 한 다이어그램에서 수준을 섞지 않는다.

### 다이어그램 선택 가이드

| 질문 | 다이어그램 |
|------|-----------|
| 시스템에 어떤 클래스가 있는가? | 클래스 다이어그램 |
| 객체들이 어떻게 협력하는가? | 시퀀스 다이어그램 |
| 객체의 상태가 어떻게 변하는가? | 상태 다이어그램 |
| 시스템이 어떤 기능을 제공하는가? | 유스케이스 다이어그램 |
| 업무가 어떻게 흐르는가? | 활동 다이어그램 |
| 시스템이 물리적으로 어떻게 구성되는가? | 컴포넌트/배포 다이어그램 |

### 효과적인 다이어그램 작성

| 좋은 다이어그램 | 나쁜 다이어그램 |
|----------------|----------------|
| 목적이 명확 — 무엇을, 누구를 위해 | 한 다이어그램에 모든 것 |
| 적절한 세부 수준 — 너무 상세/추상적이지 않게 | 설명 없이는 이해 불가 |
| 일관된 표기 — 표준 UML 준수, 프로젝트 내 일관성 | 코드와 불일치 |
| 레이아웃 명확 — 교차 최소화, 논리적 배치, 충분한 공간 | 오래되어 쓸모없음 |

## 코드와 다이어그램

### 클래스 다이어그램 → 코드

```java
// UML 클래스 다이어그램에서 코드로

// 클래스 정의
public class Order {
    // 속성
    private OrderId id;
    private OrderStatus status;
    private LocalDateTime createdAt;

    // 연관: Order 1 -- * OrderItem
    private List<OrderItem> items = new ArrayList<>();

    // 연산
    public void addItem(Product product, int quantity) {
        items.add(new OrderItem(product, quantity));
    }

    public void cancel() {
        if (status == OrderStatus.SHIPPED) {
            throw new IllegalStateException("Cannot cancel shipped order");
        }
        this.status = OrderStatus.CANCELLED;
    }

    public Money getTotal() {
        return items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(Money.ZERO, Money::add);
    }
}

// 합성 관계: Order ◆── OrderItem
public class OrderItem {
    private final Product product;  // 연관
    private final int quantity;
    private final Money unitPrice;

    OrderItem(Product product, int quantity) {
        this.product = product;
        this.quantity = quantity;
        this.unitPrice = product.getPrice();
    }

    public Money getSubtotal() {
        return unitPrice.multiply(quantity);
    }
}
```

### 상태 다이어그램 → 코드

```java
// 상태 머신 구현

public enum OrderStatus {
    DRAFT, PENDING, PAID, SHIPPED, DELIVERED, CANCELLED
}

public class Order {
    private OrderStatus status = OrderStatus.DRAFT;

    // 상태 전이: DRAFT → PENDING
    public void place() {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException(
                "Cannot place order in " + status);
        }
        this.status = OrderStatus.PENDING;
    }

    // 상태 전이: PENDING → PAID
    public void pay() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException(
                "Cannot pay order in " + status);
        }
        this.status = OrderStatus.PAID;
    }

    // 상태 전이: PAID → SHIPPED
    public void ship() {
        if (status != OrderStatus.PAID) {
            throw new IllegalStateException(
                "Cannot ship order in " + status);
        }
        this.status = OrderStatus.SHIPPED;
    }

    // 상태 전이: PENDING → CANCELLED
    public void cancel() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException(
                "Cannot cancel order in " + status);
        }
        this.status = OrderStatus.CANCELLED;
    }
}
```

## 자주 하는 실수

다이어그램을 그릴 때 흔히 빠지는 함정입니다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **한 다이어그램에 모든 것** | 클래스 50개, 선 100개가 한 장에 | 관심사별로 분리, 추상화 수준 통일 |
| **코드와 불일치** | 다이어그램과 실제 코드가 다름 | 코드에서 자동 생성하거나, 다이어그램을 버리거나 |
| **추상화 수준 혼합** | 같은 다이어그램에 `CustomerController`와 `StringBuilder` | 한 다이어그램에서 일관된 수준 유지 |
| **관계 표기 오용** | 합성(◆)과 연관(—)을 구분 없이 사용 | "생명주기를 관리하는가?" 질문으로 판단 |
| **시퀀스의 과도한 상세** | 한 시퀀스에 메시지 50개 | 핵심 흐름만, 세부는 별도 다이어그램 |
| **상태 전이 누락** | 상태 다이어그램에서 일부 전이만 표시 | 모든 유효한 전이 명시, 불가능한 전이도 고려 |
| **다이어그램 목적 불명확** | "이 다이어그램이 뭘 보여주려는 거지?" | 다이어그램 제목과 설명을 명확히 |

**핵심 원칙**: 다이어그램은 *질문에 답하기 위해* 그립니다. "시스템에 어떤 클래스가 있지?" → 클래스 다이어그램. "주문 처리 흐름이 어떻게 되지?" → 시퀀스 다이어그램. 질문 없이 그린 다이어그램은 쓸모가 없습니다.

## 정리

다이어그램 유형:
- **클래스 다이어그램**: 정적 구조 — 클래스, 속성, 관계
- **시퀀스 다이어그램**: 동적 협력 — 객체 간 메시지 흐름
- **상태 다이어그램**: 생명주기 — 상태와 전이
- **유스케이스**: 기능 — 액터와 시스템 상호작용
- **활동 다이어그램**: 워크플로우 — 분기, 병렬, 합류

작성 원칙:
- **목적 명확히**: 누구를 위해, 무엇을 보여줄지
- **추상화 수준 일관**: 한 다이어그램에서 섞지 않기
- **표기법 준수**: 표준 UML 사용
- **코드와 동기화**: 오래된 다이어그램은 해로움

## 다음 장 예고

Chapter 6에서는 **프로세스**를 다룬다. 객체지향 개발의 마이크로/매크로 프로세스와 반복적·점진적 개발.

## 관련 항목

- [Ch 4: Classification](/blog/programming/design/ooad/chapter04-classification) — 분류
- [Ch 6: Process](/blog/programming/design/ooad/chapter06-process) — 프로세스
- [OOSC Ch 27: Object-Oriented Analysis](/blog/programming/design/oosc/chapter27-oo-analysis) — 분석

