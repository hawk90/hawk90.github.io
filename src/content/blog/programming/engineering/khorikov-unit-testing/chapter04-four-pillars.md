---
title: "Ch 4: The Four Pillars of a Good Unit Test"
date: 2026-05-10T04:00:00
description: "4 pillars — Regression / Refactoring / Fast feedback / Maintainability. Trade-off."
tags: [TDD, Four Pillars]
series: "Khorikov Unit Testing"
seriesOrder: 4
draft: true
---

좋은 단위 테스트를 판단하는 객관적 기준이 있을까? Khorikov는 4가지 기둥(pillar)을 제시한다.

## 4.1 네 가지 기둥

| 기둥 | 영어 | 설명 |
|------|------|------|
| **회귀 보호** | Protection against regressions | 버그를 잡아내는 능력 |
| **리팩토링 내성** | Resistance to refactoring | 거짓 양성 없이 리팩토링 가능 |
| **빠른 피드백** | Fast feedback | 빠르게 실행 |
| **유지보수성** | Maintainability | 읽고 수정하기 쉬움 |

```
           ┌────────────────────────────────────┐
           │        좋은 단위 테스트             │
           │                                    │
           │   1. 회귀 보호      2. 리팩토링 내성  │
           │   3. 빠른 피드백    4. 유지보수성     │
           │                                    │
           └────────────────────────────────────┘
```

## 4.2 기둥 1: 회귀 보호

### 정의

**회귀(Regression)**: 이전에 작동하던 기능이 더 이상 작동하지 않는 것

회귀 보호 능력 = 테스트가 버그를 잡아낼 확률

### 회귀 보호를 높이는 요소

| 요소 | 설명 |
|------|------|
| **코드 양** | 실행되는 코드가 많을수록 |
| **복잡도** | 복잡한 로직일수록 |
| **도메인 중요성** | 비즈니스 핵심일수록 |

```csharp
// 높은 회귀 보호 — 복잡한 비즈니스 로직
[Test]
public void Discount_calculation_for_premium_customer_with_coupon()
{
    var customer = new Customer { IsPremium = true };
    var coupon = new Coupon { DiscountRate = 0.1m };
    var product = new Product { Price = 100m };

    var finalPrice = customer.CalculatePrice(product, coupon);

    // 복잡한 계산 검증
    Assert.That(finalPrice, Is.EqualTo(72m)); // 100 * 0.8 * 0.9
}

// 낮은 회귀 보호 — 단순 getter
[Test]
public void Customer_name_is_set()
{
    var customer = new Customer { Name = "John" };

    Assert.That(customer.Name, Is.EqualTo("John"));
}
```

### 주의: 코드 양 ≠ 가치

```csharp
// 많은 코드 실행, 낮은 가치
[Test]
public void Full_application_startup()
{
    var app = new Application();
    app.Start();  // 수천 줄 실행

    Assert.That(app.IsRunning, Is.True);
    // 무엇이 잘못되면 무엇이 문제인지 알 수 없음
}
```

## 4.3 기둥 2: 리팩토링 내성

### 정의

**거짓 양성(False Positive)**: 기능은 정상인데 테스트가 실패

리팩토링 내성 = 거짓 양성 없이 코드를 리팩토링할 수 있는 정도

### 거짓 양성의 비용

```
            기능 정상              기능 고장
           ─────────────────────────────────
테스트 통과│   ✓ True Negative    │ ✗ False Negative │
           │   (정상)              │   (버그 놓침)     │
           ─────────────────────────────────
테스트 실패│   ✗ False Positive   │ ✓ True Positive  │
           │   (신뢰 저하)         │   (버그 발견)     │
           ─────────────────────────────────
```

**거짓 양성이 많으면:**
- 테스트 스위트에 대한 신뢰 하락
- 리팩토링 기피 ("테스트 고치느니 안 건드림")
- 진짜 버그 무시 ("또 거짓 양성이겠지")

### 거짓 양성의 원인

```csharp
// 💥 구현에 결합 — 리팩토링하면 깨짐
[Test]
public void Purchase_calls_repository()
{
    var mockRepo = new Mock<IOrderRepository>();
    var service = new OrderService(mockRepo.Object);

    service.Purchase(product, quantity);

    // 구현 세부사항 검증
    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
    mockRepo.Verify(r => r.GetById(It.IsAny<int>()), Times.Once);
}
```

리팩토링 후:

```csharp
// OrderService 내부 변경 — 기능은 동일
public void Purchase(Product product, int quantity)
{
    // 이전: _repository.Save(order); _repository.GetById(id);
    // 이후: _repository.SaveAndReturn(order);  // 메서드 통합
}

// 💥 테스트 실패! (기능은 정상인데)
```

### 해결: 동작 검증

```csharp
// ✅ 최종 상태 검증 — 구현 독립적
[Test]
public void Purchase_creates_order()
{
    var repository = new InMemoryOrderRepository();
    var service = new OrderService(repository);

    service.Purchase(product, quantity);

    var orders = repository.GetAll();
    Assert.That(orders, Has.Exactly(1).Items);
    Assert.That(orders[0].Product, Is.EqualTo(product));
}
```

## 4.4 기둥 3: 빠른 피드백

### 정의

빠른 피드백 = 테스트 실행 시간

| 속도 | 예시 | 영향 |
|------|------|------|
| **빠름** | < 100ms | 자주 실행 가능 |
| **보통** | 1-10초 | 커밋 전 실행 |
| **느림** | > 10초 | CI에서만 실행 |

### 빠른 피드백이 중요한 이유

```
빠른 테스트 (밀리초)
    │
    ▼
  자주 실행
    │
    ▼
  빠른 발견
    │
    ▼
  낮은 수정 비용


느린 테스트 (분)
    │
    ▼
  가끔 실행
    │
    ▼
  늦은 발견
    │
    ▼
  높은 수정 비용
```

### 느린 테스트의 원인

| 원인 | 해결 |
|------|------|
| DB 접근 | 인메모리 대체 또는 Mock |
| 네트워크 호출 | Mock |
| 파일 I/O | 인메모리 대체 |
| 복잡한 설정 | 팩토리/빌더 |
| 너무 많은 테스트 | 병렬 실행, 분류 |

## 4.5 기둥 4: 유지보수성

### 정의

유지보수성 = 테스트 코드를 얼마나 쉽게 읽고 수정할 수 있는가

두 가지 측면:

| 측면 | 설명 |
|------|------|
| **이해 용이성** | 테스트가 무엇을 검증하는지 파악 |
| **수정 용이성** | 변경 시 테스트 업데이트 난이도 |

### 유지보수성을 높이는 방법

```csharp
// ❌ 유지보수 어려움
[Test]
public void Test1()
{
    var x = new C();
    x.P1 = "a";
    x.P2 = 1;
    x.P3 = true;
    var r = x.M(new D { V = 2 });
    Assert.That(r, Is.True);
}

// ✅ 유지보수 쉬움
[Test]
public void Premium_customer_can_purchase_over_limit()
{
    var customer = CreatePremiumCustomer();
    var order = CreateLargeOrder(amount: 10000);

    bool canPurchase = customer.CanPurchase(order);

    Assert.That(canPurchase, Is.True);
}
```

**가이드라인:**
- 의미 있는 이름
- 적절한 추상화 (헬퍼, 빌더)
- 불필요한 세부사항 제거
- 한 눈에 파악 가능한 구조

## 4.6 기둥 간의 관계

### 불가능한 삼각형

회귀 보호, 리팩토링 내성, 빠른 피드백 중 **2개만** 최대화 가능:

```
                    회귀 보호
                       △
                      ╱ ╲
                     ╱   ╲
              E2E   ╱     ╲  ???
                   ╱       ╲
                  ╱    X    ╲
                 ╱           ╲
                ▽─────────────▽
        리팩토링 내성        빠른 피드백
              │                 │
           통합 테스트       단위 테스트
              └───────┬────────┘
                      │
              (유지보수성은 항상 최대화)
```

### 각 테스트 유형의 위치

| 테스트 유형 | 회귀 보호 | 리팩토링 내성 | 빠른 피드백 |
|-------------|-----------|---------------|-------------|
| **E2E** | 높음 | 높음 | 낮음 |
| **통합** | 중간 | 높음 | 중간 |
| **단위** | 낮음-중간 | 높음 | 높음 |
| **Brittle (깨지기 쉬운)** | 높음 | 낮음 | 높음 |

### Brittle 테스트의 문제

```csharp
// Brittle 테스트 — 모든 내부 호출 mock
[Test]
public void Checkout_process()
{
    var mockCart = new Mock<IShoppingCart>();
    var mockPayment = new Mock<IPaymentGateway>();
    var mockInventory = new Mock<IInventoryService>();
    var mockEmail = new Mock<IEmailService>();

    mockCart.Setup(c => c.GetItems()).Returns(items);
    mockPayment.Setup(p => p.Process(It.IsAny<decimal>())).Returns(true);
    mockInventory.Setup(i => i.Reserve(It.IsAny<Item>())).Returns(true);

    var checkout = new CheckoutService(
        mockCart.Object, mockPayment.Object,
        mockInventory.Object, mockEmail.Object);

    checkout.Process();

    // 모든 내부 호출 검증
    mockPayment.Verify(p => p.Process(100m), Times.Once);
    mockInventory.Verify(i => i.Reserve(It.IsAny<Item>()), Times.Exactly(3));
    mockEmail.Verify(e => e.SendConfirmation(It.IsAny<string>()), Times.Once);
}
```

**문제:**
- 빠른 피드백 ✓
- 높은 회귀 보호 ✓ (많은 코드 커버)
- 리팩토링 내성 ✗ (구현 변경 시 깨짐)

## 4.7 테스트 유형별 전략

### E2E 테스트

```
장점: 회귀 보호 ↑, 리팩토링 내성 ↑
단점: 느림, 유지보수 어려움, 불안정

전략: 핵심 비즈니스 흐름만
```

### 통합 테스트

```
장점: 균형 잡힌 특성
단점: 단위보다 느림

전략: 외부 시스템 연동, 주요 사용 시나리오
```

### 단위 테스트

```
장점: 빠름, 유지보수 쉬움
단점: 회귀 보호 제한적

전략: 복잡한 비즈니스 로직, 도메인 모델
```

### 권장 비율

```
              ╱╲
             ╱E2E╲           5-10%
            ╱────╲
           ╱      ╲
          ╱ 통합   ╲         20-30%
         ╱──────────╲
        ╱            ╲
       ╱   단위 테스트  ╲    60-70%
      ╱────────────────╲
```

## 4.8 유지보수성은 예외

유지보수성은 트레이드오프가 아니다:

```
회귀 보호 ←──── 트레이드오프 ────→ 빠른 피드백
              ↑
              │
        리팩토링 내성


유지보수성: 항상 최대화해야 함 (타협 없음)
```

**이유:**
- 유지보수성이 낮으면 다른 기둥도 저하
- 읽기 어려운 테스트 = 신뢰할 수 없는 테스트
- 수정 어려운 테스트 = 방치되는 테스트

## 4.9 테스트 가치 공식

```
테스트 가치 = [회귀 보호] × [리팩토링 내성] × [빠른 피드백] × [유지보수성]
              ─────────────────────────────────────────────────────────
                                    테스트 비용

핵심: 곱셈이므로 하나라도 0이면 가치 = 0
```

### 가치 없는 테스트 예

| 상황 | 문제 |
|------|------|
| 회귀 보호 = 0 | 단순 getter 테스트 |
| 리팩토링 내성 = 0 | 모든 mock, 구현 검증 |
| 빠른 피드백 = 0 | 30분 걸리는 테스트 |
| 유지보수성 = 0 | 읽을 수 없는 테스트 |

## 정리

| 개념 | 핵심 |
|------|------|
| **4가지 기둥** | 회귀, 리팩토링, 피드백, 유지보수 |
| **불가능한 삼각형** | 3개 중 2개만 최대화 |
| **유지보수성** | 항상 최대화 (예외) |
| **테스트 가치** | 기둥들의 곱 |
| **전략** | 테스트 유형별 다른 기둥 집중 |

**핵심 질문:**
> 이 테스트는 어떤 기둥에서 강하고, 어떤 기둥에서 약한가?

## 다음 장 예고

다음 장에서는 Mock과 테스트 취약성(fragility)을 다룬다. Mock 사용이 왜 리팩토링 내성을 낮추는지, 언제 Mock을 써야 하는지 살펴본다.
