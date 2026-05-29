---
title: "Ch 5: Notation"
date: 2026-05-19T05:00:00
description: "표기법 — UML 클래스, 시퀀스, 상태 다이어그램."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 5
tags: [oop, booch, uml, notation, diagrams]
draft: true
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

클래스 박스는 세 칸으로 나뉩니다.

| 칸 | 내용 |
|----|------|
| 1 | (옵션) `<<stereotype>>` + ClassName |
| 2 | 속성 — `visibility name : Type` |
| 3 | 연산 — `visibility name() : ReturnType` |

가시성 기호:

| 기호 | 의미 |
|------|------|
| `+` | public |
| `-` | private |
| `#` | protected |
| `~` | package (Java) |

속성 형식: `visibility name : type [multiplicity] = default {property}`

```text
- balance : Money = 0 {readOnly}
+ items : List<OrderItem> [0..*]
```

연산 형식: `visibility name (parameters) : return-type {property}`

```text
+ withdraw(amount: Money) : boolean
+ getBalance() : Money {query}
- validate(amount: Money) : void
```

### 관계 표현

클래스 사이 관계는 선 종류와 끝 기호로 구분합니다.

| 관계 | 기호 | 의미 | 예 |
|------|------|------|-----|
| 연관 (Association) | 실선 | 두 클래스가 서로 안다 | `Customer ── Order` (고객이 주문을 가진다) |
| 집합 (Aggregation) | 빈 다이아몬드 ◇ | 약한 소유 — 부분이 전체와 독립 생명주기 | `Department ◇── Employee` |
| 합성 (Composition) | 채운 다이아몬드 ◆ | 강한 소유 — 전체가 사라지면 부분도 사라짐 | `House ◆── Room` |
| 의존 (Dependency) | 점선 화살표 | 일시적 사용 (매개변수, 지역 변수) | `Controller ┄┄▶ Service` |
| 일반화 (Generalization) | 빈 삼각형 + 실선 | 상속 (is-a) | `Dog ──▷ Animal` |
| 실체화 (Realization) | 빈 삼각형 + 점선 | 인터페이스 구현 | `Product ┄┄▷ <<interface>> Comparable` |

연관 선에는 추가 정보를 표기합니다.

| 표기 | 의미 |
|------|------|
| 역할명 | 양 끝에 역할 (예: `owner`, `items`) |
| 다중성 | `1`, `0..1`, `*`, `1..*`, `0..*` |
| 방향 화살표 | 단방향 탐색 (예: `Customer ──▶ Order`) |
| 다중성 예시 | `Customer 1 ── * Order` (고객 한 명이 주문 여러 개) |

**판단 기준** — 집합과 합성의 구분은 "전체가 사라질 때 부분도 사라지는가?"입니다. 부서가 해체되어도 직원은 남으면 집합, 집이 철거되면 방도 없어지면 합성입니다.

### 클래스 다이어그램 예시

전자상거래 도메인의 핵심 클래스를 풀어쓰면 다음과 같습니다.

| 클래스 | 속성 | 연산 |
|--------|------|------|
| `Customer` | `id: CustomerId`, `name: String`, `email: Email` | `placeOrder()`, `getOrders()` |
| `Order` | `id: OrderId`, `status: Status`, `createdAt: Date` | `addItem()`, `cancel()`, `getTotal()` |
| `OrderItem` | `quantity: int`, `unitPrice: Money` | `getSubtotal()` |
| `Product` | `name: String`, `price: Money` | — |

클래스 사이 관계.

| 출발 | 관계 | 도착 | 다중성 | 라벨 |
|------|------|------|--------|------|
| `Customer` | 합성 ◆── | `Order` | `1 ── *` | `places` |
| `Order` | 합성 ◆── | `OrderItem` | `1 ── *` | `contains` |
| `OrderItem` | 연관 ── | `Product` | `* ── 1` | `refers to` |

읽는 법: 한 고객은 여러 주문을 *소유*하고(주문은 고객에 종속), 한 주문은 여러 항목을 *포함*합니다. 각 항목은 한 상품을 *참조*하지만 상품의 생명주기는 독립적입니다.

## 동적 모델: 시퀀스 다이어그램

### 기본 요소

시퀀스 다이어그램은 시간 흐름에 따른 객체 간 메시지 교환을 보여줍니다.

| 요소 | 표기 | 의미 |
|------|------|------|
| 라이프라인 (Lifeline) | 세로 점선 | 참여 객체의 존재 기간 |
| 동기 메시지 (sync) | 실선 + 채운 화살촉 | 호출자가 응답을 기다림 |
| 비동기 메시지 (async) | 실선 + 빈 화살촉 | 호출자가 기다리지 않음 |
| 응답 메시지 (return) | 점선 화살표 | 호출 결과 반환 |
| 활성 막대 (Activation) | 세로 직사각형 | 객체가 실행 중인 구간 |
| 프레임 (Frame) | 사각형 박스 | `alt`, `loop`, `opt`, `par` 같은 제어 구조 |
| 자기 호출 | 라이프라인으로 되돌아오는 화살표 | 같은 객체 내부 메서드 호출 |
| 생성/소멸 | 메시지 끝에 객체 또는 X | 객체 라이프사이클 변화 |

### 시퀀스 다이어그램 예시

주문 처리 시나리오 — 참여자: `Client`, `OrderController`, `OrderService`, `Inventory`, `Payment`.

![Order Processing Sequence Diagram](/images/blog/ooad/diagrams/ch05-sequence-order.svg)

읽는 법: `OrderService`가 *오케스트레이터*입니다. 재고 확인 → 결제 승인 → 재고 차감의 순서가 보장됩니다. 결제가 실패하면 7번 `reserve()`가 실행되지 않아 재고가 그대로 남습니다.

### 조합 프래그먼트

복잡한 흐름은 프레임으로 묶습니다. 프레임 좌상단에 키워드, 대괄호 안에 가드 조건.

| 키워드 | 의미 | 예 (가드 / 메시지) |
|--------|------|---------------------|
| `alt` | 분기 (여러 가지 중 하나) | `[stock > 0]` → `reserve()` / `[else]` → `backorder()` |
| `opt` | 선택적 실행 (조건이 참일 때만) | `[customer.isVIP()]` → `applyDiscount()` |
| `loop` | 반복 | `[for each item]` → `checkItem()` |
| `par` | 병렬 실행 (여러 분기가 동시에) | `sendEmail()` + `sendSMS()` |
| `break` | 흐름 중단 후 외부로 빠져나옴 | `[error]` → `logError()` |
| `critical` | 원자적 실행 (중간에 끼어들기 금지) | `[transaction]` → `commit()` |
| `ref` | 다른 시퀀스 다이어그램 참조 | `[any]` → `sd PaymentFlow` |

`alt`는 두 영역 이상을 점선으로 구분합니다. `par`도 마찬가지로 병렬 분기를 점선으로 나눕니다.

## 동적 모델: 상태 다이어그램

### 상태 머신 요소

| 요소 | 표기 | 의미 |
|------|------|------|
| 상태 (State) | 둥근 사각형 | 이름 + (옵션) 진입/유지/퇴장 동작 |
| 전이 (Transition) | 화살표 | `trigger [guard] / action` 형식 라벨 |
| 초기 상태 | 채워진 원 ● | 진입점, 단 하나만 존재 |
| 최종 상태 | 이중원 ◎ | 종료점, 여러 개 가능 |
| 복합 상태 | 더 큰 둥근 사각형 안에 하위 상태 | 직교 영역(`||`)으로 동시 상태 표현 |
| 결정 노드 | 다이아몬드 ◇ | 가드 조건에 따라 분기 |

상태 박스 내부 구조 — 한 칸에 이름, 다음 칸에 동작.

```text
StateName
─────────────
entry / doSomething()
do / continuousAction()
exit / cleanup()
```

전이 라벨 형식: `trigger [guard] / action`

예 — `submit [valid] / save()`: `submit` 이벤트가 발생하고 `valid` 가드가 참이면 `save()` 동작을 수행하며 다음 상태로 전이합니다.

### 상태 다이어그램 예시

주문 상태 머신 — 초기 상태 ● → `Draft` 진입.

![Order State Machine](/images/blog/ooad/diagrams/ch05-order-state.svg)

읽는 법: `Pending`은 두 갈래 — 결제하면 `Paid`로, 취소하면 `Cancelled`로. `Shipped` 이후로는 취소 불가능합니다. `Cancelled`는 최종 상태가 아니라 별도 종료점으로 표시할 수도 있습니다.

복합 상태 — `PaymentProcessing`이 외부 상태이고 내부에 결제 단계가 있습니다.

| 영역 | 출발 | 이벤트 | 도착 |
|------|------|--------|------|
| `PaymentProcessing` 내부 | `Authorizing` | `authorize()` | `Authorized` |
| `PaymentProcessing` 내부 | `Authorized` | `capture()` | `Captured` |
| `PaymentProcessing` 내부 | `Authorizing` | `fail()` | `Failed` |
| `PaymentProcessing` 내부 | `Authorized` | `cancel()` | `Voided` |

복합 상태의 가치는 *그룹 전이*입니다. `PaymentProcessing` 전체에서 발생할 수 있는 공통 이벤트(예: 타임아웃)를 한 번만 그리면 됩니다.

## 기타 다이어그램

### 유스케이스 다이어그램

시스템 기능의 외부 뷰 — 누가(액터) 무엇을(유스케이스) 하는가.

| 액터 | 유스케이스 |
|------|-----------|
| Customer | `Browse Catalog`, `Place Order` |
| Admin | `Process Payment` |

유스케이스 사이 관계.

| 출발 | 관계 | 도착 | 의미 |
|------|------|------|------|
| `Place Order` | `<<include>>` | `Process Payment` | 주문 시 결제는 *항상* 수행 |
| `Place Order` | `<<extend>>` | `Apply Coupon` | 쿠폰 적용은 *선택적* |
| `Premium Order` | 일반화 | `Place Order` | 프리미엄 주문은 일반 주문의 특수화 |

표기 요소: 액터는 막대인간(stick figure), 유스케이스는 타원, 시스템은 큰 사각형으로 경계를 표시합니다. 액터와 유스케이스 사이는 실선, `include`/`extend`는 점선 화살표에 stereotype 라벨.

### 활동 다이어그램

업무 흐름(workflow)을 단계와 분기로 표현합니다. 시퀀스 다이어그램이 *누가 누구에게* 메시지를 보내는지 보여준다면, 활동 다이어그램은 *무엇이 무엇 다음에* 일어나는지를 보여줍니다.

표기 요소.

| 요소 | 표기 | 의미 |
|------|------|------|
| 시작 | 채운 원 | 흐름 시작점 |
| 활동 | 둥근 사각형 | 작업 한 단위 |
| 결정 | 다이아몬드 | 가드 조건에 따른 분기 |
| 합류 | 다이아몬드 | 여러 분기가 하나로 모임 |
| 포크 | 굵은 가로 막대 | 병렬 분기 시작 |
| 조인 | 굵은 가로 막대 | 병렬 분기 종료 (모두 끝나야 다음) |
| 종료 | 이중원 | 흐름 끝 |

예 — 주문 처리 워크플로우.

![Order Processing Activity Diagram](/images/blog/ooad/diagrams/ch05-activity-order.svg)

배송과 알림은 *동시에* 진행되며, 둘 다 끝나야 종료에 도달합니다.

### 컴포넌트 다이어그램

시스템의 *물리적* 구조를 컴포넌트와 의존성으로 표현합니다. 클래스 다이어그램이 *논리적 구조*라면 컴포넌트 다이어그램은 *배포 단위*에 가깝습니다.

예 — 온라인 스토어 컴포넌트 구성.

| 컴포넌트 | 의존하는 컴포넌트 | 역할 |
|----------|--------------------|------|
| `WebClient` | `APIServer` | 브라우저 측 UI |
| `APIServer` | `OrderService`, `PaymentService` | 외부 요청 수신 및 라우팅 |
| `OrderService` | `Database` | 주문 도메인 로직 |
| `PaymentService` | (외부 PG) | 결제 처리 |
| `Database` | — | 영속화 저장소 |

표기 — 각 컴포넌트는 `<<component>>` stereotype을 단 사각형 또는 좌측에 작은 컴포넌트 아이콘이 붙은 사각형. 의존성은 점선 화살표(`┄┄▶`), 인터페이스는 lollipop(○) 또는 socket(⊃)으로 표시합니다.

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
- [OOSC Ch 27: Object-Oriented Analysis](/blog/programming/design/oosc/chapter27-object-oriented-analysis) — 분석

