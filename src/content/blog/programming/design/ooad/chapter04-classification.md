---
title: "Ch 4: Classification"
date: 2026-05-19T04:00:00
description: "분류 — 클래스 발견, 핵심 추상화 식별, 분류 원칙."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 4
tags: [oop, booch, classification, abstraction, class-discovery]
draft: true
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 좋은 분류는 **핵심 추상화**를 찾는 것이다. 문제 도메인의 어휘에서 **명사를 추출**하고, 책임을 할당하며, **반복적으로 정제**한다.

## 분류의 어려움

### 왜 분류가 어려운가

| 분류의 도전 | 설명 |
|------------|------|
| 관점에 따라 달라짐 | 같은 사물도 다르게 볼 수 있음. 사용자, 개발자, 운영자의 관점 |
| 경계가 모호함 | 어디까지가 한 클래스? 책임의 범위는? |
| 완벽한 분류는 없음 | 트레이드오프 존재. 맥락에 맞는 최선의 선택 |
| 도메인 지식 필요 | 문제 영역의 이해. 전문가와의 협업 |

### 분류의 목표

| 좋은 분류의 기준 | 설명 |
|----------------|------|
| 명확한 경계 | 클래스 간 책임이 분명. 중복 없음 |
| 높은 응집도 | 관련 기능이 함께. 단일 책임 |
| 낮은 결합도 | 클래스 간 의존성 최소. 변경 영향 국소화 |
| 도메인 반영 | 문제 영역의 개념과 일치. 전문가가 이해 가능 |

## 클래스 발견 기법

### 명사 추출 (Noun Extraction)

| 방법 |
|------|
| 1. 요구사항 문서에서 명사 추출 |
| 2. 각 명사를 클래스 후보로 |
| 3. 필터링 및 정제 |

| 필터링 기준 |
|------------|
| 중복 제거 (동의어) |
| 속성으로 내리기 (색상, 크기) |
| 범위 밖 제거 |
| 구현 관련 제거 |

**예**: "고객이 상품을 장바구니에 담고 주문한다" → Customer, Product, Cart, Order

**실제 적용 예**:

> 요구사항: "도서관 시스템에서 회원은 책을 대출하고 반납한다. 사서는 신규 도서를 등록하고, 연체 회원에게 알림을 보낸다. 회원은 책을 예약할 수 있고, 대출 기한은 2주이다."

| 단계 | 결과 |
|------|------|
| 명사 추출 | 도서관, 시스템, 회원, 책, 대출, 반납, 사서, 신규 도서, 연체 회원, 알림, 예약, 대출 기한 |
| 클래스 후보 | Library, Member, Book, Loan, Librarian, Notification, Reservation |
| 속성으로 내림 | 대출 기한 → `Loan.dueDate`, 연체 상태 → `Loan.isOverdue()` |

### CRC 카드 (Class-Responsibility-Collaboration)

| CRC 카드 구성 | 설명 |
|--------------|------|
| Class | 클래스 이름 |
| Responsibilities | 할 줄 아는 것 |
| Collaborators | 협력하는 클래스 |

| 장점 |
|------|
| 물리적 도구 (종이 카드) |
| 팀 협업에 적합 |
| 책임 중심 사고 |

CRC 카드는 세 칸 — 클래스 이름 / 책임 / 협력자. 예시 두 장.

**Class: `Order`**

| Responsibilities | Collaborators |
|------------------|---------------|
| 주문 항목 관리 | `OrderItem` |
| 총액 계산 | `Customer` |
| 주문 상태 추적 | `PaymentService` |
| 결제 처리 요청 | `ShippingService` |

**Class: `OrderItem`**

| Responsibilities | Collaborators |
|------------------|---------------|
| 상품과 수량 저장 | `Product` |
| 소계 계산 | `Order` |

### 유스케이스 분석

**유스케이스: "책 대출"**

| 단계 | 내용 |
|------|------|
| 1 | 회원이 사서에게 책을 가져온다 |
| 2 | 사서가 회원증을 확인한다 |
| 3 | 사서가 대출 가능 여부를 확인한다 |
| 4 | 시스템이 대출을 기록한다 |
| 5 | 시스템이 반납일을 계산한다 |
| 6 | 회원이 책을 가져간다 |

| 도출 유형 | 클래스 |
|----------|--------|
| 액터 | Member, Librarian |
| 엔티티 | Book, Loan |
| 서비스 | LoanService |

### 도메인 모델링

**도메인 모델**: 문제 영역의 개념 모델. 기술적 세부사항 배제. 비즈니스 관점.

| 접근법 |
|--------|
| 1. 도메인 전문가 인터뷰 |
| 2. 기존 문서 분석 |
| 3. 업무 프로세스 관찰 |
| 4. 유비쿼터스 언어 정의 |

## 핵심 추상화 식별

### 핵심 추상화란

**핵심 추상화 (Key Abstractions)**: 도메인의 본질을 표현. 시스템의 중심 개념. 다른 클래스의 기반.

| 식별 기준 |
|----------|
| 도메인 전문가가 자주 언급 |
| 비즈니스 가치와 직결 |
| 시스템 전반에 영향 |
| 변경 빈도가 낮음 |

**예 (전자상거래)**: 핵심 — Product, Order, Customer. 지원 — CartItem, Address, Payment.

### 메커니즘 식별

**메커니즘 (Mechanisms)**: 여러 객체가 협력하는 패턴. 공통 문제에 대한 해결책. 재사용 가능한 협력 구조.

| 메커니즘 예 |
|------------|
| 인증 메커니즘 |
| 트랜잭션 메커니즘 |
| 알림 메커니즘 |
| 캐싱 메커니즘 |

**설계 시 질문**: 어떤 메커니즘이 필요한가? 어떤 클래스들이 참여하는가? 어떻게 협력하는가?

## 클래스 유형

### 엔티티 클래스 (Entity)

| 특성 |
|------|
| 비즈니스 개념 표현 |
| 영속적 상태 보유 |
| 생명주기가 김 |

**예**: Customer, Product, Order, Account

| 책임 |
|------|
| 데이터 보유 |
| 비즈니스 규칙 적용 |
| 자기 무결성 유지 |

### 경계 클래스 (Boundary)

| 특성 |
|------|
| 시스템과 외부 세계의 접점 |
| UI, API, 외부 시스템 |

**예**: OrderController, PaymentGateway, EmailSender, ReportGenerator

| 책임 |
|------|
| 입출력 변환 |
| 프로토콜 처리 |
| 검증 (형식 검증) |

### 컨트롤 클래스 (Control)

| 특성 |
|------|
| 유스케이스 조정 |
| 흐름 제어 |
| 엔티티와 경계 연결 |

**예**: OrderService, CheckoutProcess, LoanWorkflow, ReservationManager

| 책임 |
|------|
| 트랜잭션 관리 |
| 비즈니스 프로세스 오케스트레이션 |
| 정책 적용 |

```java
// 클래스 유형 예시

// 엔티티
public class Order {
    private OrderId id;
    private CustomerId customerId;
    private List<OrderItem> items;
    private OrderStatus status;
    private Money totalAmount;

    public void addItem(Product product, int quantity) {
        items.add(new OrderItem(product, quantity));
        recalculateTotal();
    }

    public void cancel() {
        if (status == OrderStatus.SHIPPED) {
            throw new CannotCancelShippedException();
        }
        this.status = OrderStatus.CANCELLED;
    }
}

// 경계
public class OrderController {
    private final OrderService orderService;

    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> createOrder(
            @RequestBody CreateOrderRequest request) {
        OrderDto order = orderService.createOrder(
            request.getCustomerId(),
            request.getItems());
        return ResponseEntity.created(/* ... */).body(/* ... */);
    }
}

// 컨트롤
public class OrderService {
    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;

    @Transactional
    public OrderDto createOrder(CustomerId customerId,
                                List<ItemRequest> items) {
        // 재고 확인
        inventoryService.checkAvailability(items);

        // 주문 생성
        Order order = Order.create(customerId, items);
        orderRepository.save(order);

        // 결제 처리
        paymentService.authorize(order);

        return OrderDto.from(order);
    }
}
```

## 분류 검증

### 검증 질문

| 클래스 검증 |
|------------|
| 1. 이 클래스는 명확한 책임이 있는가? |
| 2. 클래스 이름이 책임을 반영하는가? |
| 3. 이 클래스가 정말 필요한가? |
| 4. 다른 클래스와 중복되지 않는가? |
| 5. 응집도가 높은가? |
| 6. 테스트 가능한가? |

| 관계 검증 |
|----------|
| 1. 관계가 필요한가? |
| 2. 방향이 맞는가? |
| 3. 다중성이 정확한가? |
| 4. 순환 의존이 없는가? |

### 리팩터링 신호

| 분리가 필요한 경우 | 병합이 필요한 경우 | 추출이 필요한 경우 |
|------------------|------------------|------------------|
| 클래스가 너무 큼 | 항상 함께 변경됨 | 반복되는 코드 |
| 여러 책임이 섞임 | 분리의 이유가 없음 | 공통 패턴 발견 |
| 이름에 "And"가 있음 | 과도한 세분화 | 재사용 가능성 |
| 변경 이유가 여러 개 | — | — |

## 반복적 정제

### 진화하는 분류

**분류는 한 번에 완성되지 않는다.**

| 단계 | 내용 |
|------|------|
| 초기 분류 | 명사 추출, 대략적 할당 |
| 1차 정제 | CRC 검토, 책임 조정 |
| 구현 중 정제 | 실제 코딩에서 문제 발견, 리팩터링 |
| 운영 중 정제 | 새 요구사항, 성능 개선 |

### 분류의 안정화

| 안정적 분류의 특징 | 불안정 분류의 징후 |
|------------------|------------------|
| 새 요구사항이 기존 구조에 맞음 | 모든 변경이 여러 클래스에 영향 |
| 변경이 국소적 | 같은 곳이 계속 변경됨 |
| 재사용이 실제로 일어남 | 예상과 다른 곳에서 버그 발생 |
| 팀원들이 동의 | — |

## 자주 하는 실수

분류 작업에서 흔히 빠지는 함정입니다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **모든 명사를 클래스로** | 요구사항에서 추출한 명사 전부가 클래스 | 속성·열거형·상수로 내릴 것은 내린다. "색상", "상태", "크기"는 대체로 속성 |
| **도메인 무시, 기술만** | `DBManager`, `JSONParser`만 있고 `Order`, `Customer`가 없음 | 도메인 전문가가 쓰는 용어를 먼저 모델링. 기술 클래스는 인프라 계층으로 |
| **God 클래스** | `OrderManager`가 UI, 검증, DB, 이메일 전부 담당 | Entity/Boundary/Control로 분리. 단일 책임 원칙 적용 |
| **과도한 세분화** | `CustomerName`, `CustomerEmail`, `CustomerPhone` 각각 클래스 | 응집도 높은 단위로 묶는다. `Customer` 하나면 충분한 경우가 많음 |
| **초기 분류에 집착** | "처음에 이렇게 정했으니까"라며 정제 거부 | 분류는 반복적 활동. 구현 중 발견되는 문제에 따라 조정 |
| **유스케이스 없이 추측** | 실제 사용 시나리오 없이 "필요할 것 같아서" 클래스 생성 | CRC 세션, 유스케이스 워크스루로 실제 협력 검증 |
| **관계 과다** | 모든 클래스가 서로 알고 있음. 순환 의존 | 방향성 검토. 필요한 관계만 남기고 중재자 도입 |

## 정리

클래스 발견 기법:
- **명사 추출**: 요구사항에서 명사 → 클래스 후보
- **CRC 카드**: 책임과 협력 중심 설계
- **유스케이스 분석**: 시나리오에서 클래스 도출
- **도메인 모델링**: 전문가와 함께 개념 모델

클래스 유형:
- **엔티티**: 비즈니스 개념, 영속 상태
- **경계**: 외부와의 접점, 입출력
- **컨트롤**: 프로세스 조정, 오케스트레이션

## 다음 장 예고

Chapter 5에서는 **표기법**을 다룬다. UML로 클래스, 시퀀스, 상태 다이어그램을 그리는 방법.

## 관련 항목

- [Ch 3: Classes and Objects](/blog/programming/design/ooad/chapter03-classes-and-objects) — 클래스와 객체
- [Ch 5: Notation](/blog/programming/design/ooad/chapter05-notation) — 표기법
- [OOSC Ch 22: How to Find Classes](/blog/programming/design/oosc/chapter22-how-to-find-the-classes) — 클래스 찾기
