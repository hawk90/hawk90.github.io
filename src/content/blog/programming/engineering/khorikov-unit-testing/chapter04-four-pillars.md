---
title: "Ch 4: The Four Pillars of a Good Unit Test"
date: 2026-05-10T04:00:00
description: "회귀 보호, 리팩토링 내성, 빠른 피드백, 유지보수성. 4가지 기둥과 트레이드오프."
tags: [TDD, Four Pillars]
series: "Khorikov Unit Testing"
seriesOrder: 4
---

좋은 단위 테스트를 판단하는 객관적 기준이 있을까? Khorikov는 4가지 기둥(pillar)을 제시한다. 셋은 서로를 침범하는 트레이드오프 관계이고, 나머지 하나는 예외다.

## 4.1 네 가지 기둥

| 기둥 | 영어 | 설명 |
|------|------|------|
| 회귀 보호 | Protection against regressions | 버그를 잡아내는 능력 |
| 리팩토링 내성 | Resistance to refactoring | 거짓 양성 없이 리팩토링이 가능하다 |
| 빠른 피드백 | Fast feedback | 빠르게 실행된다 |
| 유지보수성 | Maintainability | 읽고 수정하기 쉽다 |

## 4.2 기둥 1: 회귀 보호

### 정의

회귀(regression)는 이전에 작동하던 기능이 더 이상 작동하지 않게 되는 사건이다. 회귀 보호 능력은 테스트가 그런 사건을 잡아낼 확률에 해당한다.

다음 세 요소가 회귀 보호의 강도를 결정한다.

| 요소 | 설명 |
|------|------|
| 코드 양 | 실행되는 코드의 양이 많을수록 강하다 |
| 복잡도 | 로직이 복잡할수록 강하다 |
| 도메인 중요성 | 비즈니스 핵심에 가까울수록 강하다 |

```csharp
// 회귀 보호가 높은 테스트 — 복잡한 비즈니스 로직
[Test]
public void Discount_calculation_for_premium_customer_with_coupon()
{
    var customer = new Customer { IsPremium = true };
    var coupon = new Coupon { DiscountRate = 0.1m };
    var product = new Product { Price = 100m };

    var finalPrice = customer.CalculatePrice(product, coupon);

    Assert.That(finalPrice, Is.EqualTo(72m)); // 100 * 0.8 * 0.9
}

// 회귀 보호가 낮은 테스트 — 단순 getter
[Test]
public void Customer_name_is_set()
{
    var customer = new Customer { Name = "John" };

    Assert.That(customer.Name, Is.EqualTo("John"));
}
```

### 주의: 코드 양은 가치와 같지 않다

많은 코드를 실행한다고 해서 가치가 자동으로 따라오지는 않는다. 어떤 부분이 잘못되었는지 짚지 못하면 회귀 보호는 사실상 약하다.

```csharp
// 많은 코드를 실행하지만 가치는 낮다
[Test]
public void Full_application_startup()
{
    var app = new Application();
    app.Start();  // 수천 줄이 실행된다

    Assert.That(app.IsRunning, Is.True);
    // 무엇이 잘못되면 무엇이 문제인지 알 수 없다
}
```

## 4.3 기둥 2: 리팩토링 내성

### 정의

거짓 양성(false positive)은 기능이 정상인데도 테스트가 실패하는 현상이다. 리팩토링 내성은 거짓 양성 없이 코드를 리팩토링할 수 있는 정도를 가리킨다.

![테스트 결과 매트릭스](/images/blog/khorikov/diagrams/ch04-confusion-matrix.svg)

거짓 양성이 누적되면 세 가지 부작용이 따라온다.

- 테스트 스위트에 대한 신뢰가 떨어진다.
- "테스트 고치느니 안 건드린다"는 식으로 리팩토링을 기피한다.
- "또 거짓 양성이겠지"라며 진짜 버그까지 무시한다.

### 거짓 양성의 원인

구현 세부사항에 결합한 테스트는 리팩토링 한 번에 무더기로 깨진다.

```csharp
// 구현에 결합한 테스트 — 리팩토링하면 깨진다
[Test]
public void Purchase_calls_repository()
{
    var mockRepo = new Mock<IOrderRepository>();
    var service = new OrderService(mockRepo.Object);

    service.Purchase(product, quantity);

    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
    mockRepo.Verify(r => r.GetById(It.IsAny<int>()), Times.Once);
}
```

리팩토링 후의 모습은 다음과 같다. 동작은 그대로지만 테스트는 실패한다.

```csharp
public void Purchase(Product product, int quantity)
{
    // 이전: _repository.Save(order); _repository.GetById(id);
    // 이후: _repository.SaveAndReturn(order);  // 메서드 통합
}

// 테스트가 실패한다. 기능은 정상이다.
```

### 해결: 동작 검증

같은 동작을 결과 중심으로 검증하면 구현 변경에도 강해진다.

```csharp
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

빠른 피드백은 테스트 실행 시간으로 측정한다. 속도에 따라 사용 양상이 달라진다.

| 속도 | 예시 | 영향 |
|------|------|------|
| 빠름 | 100ms 미만 | 자주 실행할 수 있다 |
| 보통 | 1~10초 | 커밋 전에 실행한다 |
| 느림 | 10초 초과 | CI에서만 실행한다 |

빠른 테스트는 자주 실행되고, 자주 실행되면 회귀를 빨리 발견하며, 빨리 발견된 회귀는 고치는 비용이 낮다. 반대로 느린 테스트는 적게 실행되고, 회귀가 늦게 드러나며, 결국 수정 비용이 커진다.

### 느린 테스트의 원인과 해결

| 원인 | 해결 |
|------|------|
| DB 접근 | 인메모리 Fake 또는 통합 테스트 계층으로 옮긴다 |
| 네트워크 호출 | Mock으로 대체한다 |
| 파일 I/O | 인메모리 추상화로 바꾼다 |
| 복잡한 설정 | 빌더와 팩토리로 정리한다 |
| 너무 많은 테스트 | 병렬 실행과 분류로 시간을 줄인다 |

## 4.5 기둥 4: 유지보수성

유지보수성은 두 가지 측면으로 이루어진다.

| 측면 | 설명 |
|------|------|
| 이해 용이성 | 테스트가 무엇을 검증하는지 빠르게 파악된다 |
| 수정 용이성 | 코드가 바뀔 때 테스트를 손보기 쉽다 |

```csharp
// 회피 — 유지보수가 어렵다
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

// Good — 유지보수가 쉽다
[Test]
public void Premium_customer_can_purchase_over_limit()
{
    var customer = CreatePremiumCustomer();
    var order = CreateLargeOrder(amount: 10000);

    bool canPurchase = customer.CanPurchase(order);

    Assert.That(canPurchase, Is.True);
}
```

유지보수성을 높이려면 의미 있는 이름과 적절한 헬퍼 추상화를 쓰고, 한눈에 파악할 수 있는 구조를 유지한다.

## 4.6 기둥 간의 관계

### 불가능한 삼각형

회귀 보호, 리팩토링 내성, 빠른 피드백 가운데 둘만 동시에 최대화할 수 있다.

![불가능한 삼각형](/images/blog/khorikov/diagrams/ch04-impossible-triangle.svg)

테스트 유형별로 그 위치는 다음과 같이 자리잡는다.

| 테스트 유형 | 회귀 보호 | 리팩토링 내성 | 빠른 피드백 |
|-------------|-----------|---------------|-------------|
| E2E | 높음 | 높음 | 낮음 |
| 통합 | 중간 | 높음 | 중간 |
| 단위 | 낮음~중간 | 높음 | 높음 |
| 깨지기 쉬운(brittle) | 높음 | 낮음 | 높음 |

### Brittle 테스트의 함정

내부 호출을 모두 mock으로 검증하면 회귀 보호와 빠른 피드백은 갖췄지만 리팩토링 내성을 잃는다.

```csharp
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

    // 모든 내부 호출을 검증한다
    mockPayment.Verify(p => p.Process(100m), Times.Once);
    mockInventory.Verify(i => i.Reserve(It.IsAny<Item>()), Times.Exactly(3));
    mockEmail.Verify(e => e.SendConfirmation(It.IsAny<string>()), Times.Once);
}
```

빠른 피드백과 회귀 보호는 확보되지만 리팩토링 내성은 0에 가깝다. 내부 구현이 살짝만 바뀌어도 테스트가 무더기로 실패한다.

## 4.7 테스트 유형별 전략

각 테스트 유형은 강점이 다르므로 다른 역할을 맡는다.

- **E2E 테스트**: 회귀 보호와 리팩토링 내성이 높지만 느리고 불안정하다. 핵심 비즈니스 흐름에만 쓴다.
- **통합 테스트**: 균형 잡힌 특성을 가지지만 단위보다 느리다. 외부 시스템 연동과 주요 시나리오에 쓴다.
- **단위 테스트**: 빠르고 유지보수가 쉽지만 회귀 보호 범위가 좁다. 복잡한 비즈니스 로직과 도메인 모델에 쓴다.

권장 비율은 다음과 같다.

- E2E: 5~10%
- 통합: 20~30%
- 단위: 60~70%

## 4.8 유지보수성은 예외다

유지보수성은 다른 세 기둥과 트레이드오프 관계가 아니다. 항상 최대로 유지해야 한다. 이유는 분명하다.

- 유지보수성이 낮으면 다른 기둥도 함께 낮아진다.
- 읽기 어려운 테스트는 결국 신뢰받지 못한다.
- 수정이 어려운 테스트는 결국 방치된다.

## 4.9 테스트 가치 공식

Khorikov는 테스트의 가치를 다음과 같이 비유한다.

```text
테스트 가치 = [회귀 보호] × [리팩토링 내성] × [빠른 피드백] × [유지보수성]
              ─────────────────────────────────────────────────────────
                                    테스트 비용
```

곱셈이라는 점이 핵심이다. 하나라도 0이면 전체 가치가 0이 된다.

| 상황 | 문제 |
|------|------|
| 회귀 보호 = 0 | 단순 getter를 검증하는 테스트 |
| 리팩토링 내성 = 0 | 모든 협력자를 mock하는 구현 검증 테스트 |
| 빠른 피드백 = 0 | 30분이 걸리는 테스트 |
| 유지보수성 = 0 | 읽을 수 없는 테스트 |

## 자주 보는 함정

- **빠른 피드백을 위해 모든 것을 mock**: 리팩토링 내성을 통째로 희생한다.
- **회귀 보호를 위해 E2E만 늘림**: 빠른 피드백과 유지보수성이 무너진다.
- **유지보수성을 후순위로 미룸**: 다른 기둥마저 함께 침식한다.
- **모든 테스트를 단위로 강제**: 통합 테스트가 잡아 줘야 할 회귀가 운영 환경에서 드러난다.
- **테스트가 깨지면 무조건 코드 잘못이라고 가정**: 거짓 양성을 잡지 못해 신뢰가 무너진다.

## 정리

- 좋은 테스트는 회귀 보호, 리팩토링 내성, 빠른 피드백, 유지보수성의 네 기둥으로 평가한다.
- 앞의 세 기둥은 동시에 셋 다 최대화할 수 없는 트레이드오프 관계다.
- 유지보수성은 예외이며, 항상 최대로 유지해야 한다.
- 테스트의 가치는 네 기둥의 곱으로 표현된다. 하나라도 0이면 전체가 0이다.
- 단위, 통합, E2E는 각각 다른 기둥에 강점을 가진다.
- Brittle 테스트는 회귀 보호가 높아 보이지만 리팩토링 내성을 갉아먹는다.

핵심 질문은 다음과 같다.

> 이 테스트는 어떤 기둥에서 강하고, 어떤 기둥에서 약한가?

## 다음 장 예고

다음 장에서는 Mock과 테스트 취약성(fragility)을 다룬다. Mock 사용이 왜 리팩토링 내성을 낮추는지, 언제 Mock을 써야 하는지 살펴본다.

## 관련 항목

- [Ch 3: The Anatomy of a Unit Test](/blog/programming/engineering/khorikov-unit-testing/chapter03-anatomy)
- [Ch 5: Mocks and Test Fragility](/blog/programming/engineering/khorikov-unit-testing/chapter05-mocks-fragility)
- [Ch 7: Refactoring Toward Valuable Unit Tests](/blog/programming/engineering/khorikov-unit-testing/chapter07-refactoring)
- [TDD as XP](/blog/programming/engineering/agile-lean-engineering/part2-08-tdd-as-xp) — TDD가 작동하는 사회적 조건
- [Refactoring Catalog](/blog/programming/design/refactoring-catalog/) — 리팩토링 어휘
