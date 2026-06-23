---
title: "Ch 5: Mocks and Test Fragility"
date: 2026-05-10T05:00:00
description: "Mock의 종류와 사용 규칙. Managed와 Unmanaged 의존, 시스템 경계에서만 Mock한다."
tags: [TDD, Mock, Stub, Fake]
series: "Khorikov Unit Testing"
seriesOrder: 5
draft: true

---

Mock은 양날의 검이다. 적절히 사용하면 테스트를 빠르고 격리되게 만들지만, 남용하면 취약한 테스트를 양산한다.

## 5.1 테스트 더블 분류 (Meszaros)

Gerard Meszaros의 분류를 따른다.

| 종류 | 목적 | 동작 |
|------|------|------|
| Dummy | 파라미터 채우기 | 사용되지 않는다 |
| Stub | 미리 준비된 답변 제공 | 입력을 제공한다 |
| Spy | 호출 기록 | 호출을 추적한다 |
| Mock | 기대 동작 + 검증 | 상호작용을 검증한다 |
| Fake | 단순화된 실제 구현 | 작동하는 대체품이다 |

```csharp
// Dummy — 사용되지 않는다
public class DummyLogger : ILogger
{
    public void Log(string message) { /* 아무것도 하지 않는다 */ }
}

// Stub — 미리 정의된 값을 반환한다
var stubRepo = new Mock<IUserRepository>();
stubRepo.Setup(r => r.GetById(1)).Returns(new User { Name = "John" });

// Spy — 호출을 기록한다
public class SpyEmailSender : IEmailSender
{
    public List<string> SentEmails { get; } = new();
    public void Send(string email) => SentEmails.Add(email);
}

// Mock — 기대 동작과 검증을 함께 가진다
var mockEmailSender = new Mock<IEmailSender>();
// ... 테스트 실행 ...
mockEmailSender.Verify(e => e.Send("test@example.com"), Times.Once);

// Fake — 작동하는 대체 구현이다
public class FakeUserRepository : IUserRepository
{
    private readonly Dictionary<int, User> _users = new();
    public User GetById(int id) => _users.GetValueOrDefault(id);
    public void Save(User user) => _users[user.Id] = user;
}
```

## 5.2 Mock과 Stub의 핵심 구분

### 방향성 차이

![Mock vs Stub 방향성](/images/blog/khorikov/diagrams/ch05-sut-direction.svg)

| 구분 | Mock | Stub |
|------|------|------|
| 방향 | SUT → 외부 (outgoing) | 외부 → SUT (incoming) |
| 검증 | 호출 여부를 검증한다 | 값을 반환할 뿐 검증하지 않는다 |
| 목적 | 부수효과 확인 | 입력 제공 |
| 예시 | 이메일 전송 확인 | 데이터 조회 결과 제공 |

### 코드 예시

같은 테스트 안에서 stub과 mock이 함께 등장하는 일은 흔하다.

```csharp
public class OrderService
{
    private readonly IInventoryService _inventory;
    private readonly IEmailService _email;

    public bool ProcessOrder(Order order)
    {
        // Stub 역할: 재고를 확인한다 (incoming)
        bool hasStock = _inventory.CheckStock(order.ProductId, order.Quantity);

        if (!hasStock)
            return false;

        _inventory.Reserve(order.ProductId, order.Quantity);

        // Mock 역할: 이메일을 전송한다 (outgoing)
        _email.SendConfirmation(order.CustomerEmail);

        return true;
    }
}

[Test]
public void ProcessOrder_sends_confirmation_email()
{
    // Stub — 입력을 제공한다
    var stubInventory = new Mock<IInventoryService>();
    stubInventory.Setup(i => i.CheckStock(It.IsAny<int>(), It.IsAny<int>()))
                 .Returns(true);

    // Mock — 출력을 검증한다
    var mockEmail = new Mock<IEmailService>();

    var service = new OrderService(stubInventory.Object, mockEmail.Object);
    var order = new Order { ProductId = 1, Quantity = 5, CustomerEmail = "test@example.com" };

    service.ProcessOrder(order);

    // Mock만 검증한다. Stub은 Verify 대상이 아니다.
    mockEmail.Verify(e => e.SendConfirmation("test@example.com"), Times.Once);
}
```

## 5.3 관찰 가능한 동작과 구현 세부사항

| 구분 | 관찰 가능한 동작 | 구현 세부사항 |
|------|-----------------|---------------|
| 정의 | 클라이언트가 의존하는 것 | 내부 작동 방식 |
| 검증 | 해야 한다 | 하면 안 된다 |
| 변경 시 의미 | 계약 위반 | 단순 리팩토링 |

```csharp
public class User
{
    private string _normalizedEmail;

    public string Email { get; private set; }

    public void SetEmail(string email)
    {
        // 구현 세부사항: 정규화 방법
        _normalizedEmail = email.Trim().ToLowerInvariant();
        Email = email;
    }

    // 관찰 가능한 동작
    public bool MatchesEmail(string email)
    {
        return _normalizedEmail == email.Trim().ToLowerInvariant();
    }
}
```

같은 클래스에 대해 두 종류의 테스트가 가능하다. 좋은 쪽과 나쁜 쪽이 분명히 갈린다.

```csharp
// 회피 — 구현 세부사항을 검증한다
[Test]
public void SetEmail_normalizes_email()
{
    var user = new User();
    user.SetEmail("  TEST@Example.COM  ");

    var normalizedField = typeof(User)
        .GetField("_normalizedEmail", BindingFlags.NonPublic | BindingFlags.Instance);
    var value = normalizedField.GetValue(user);

    Assert.That(value, Is.EqualTo("test@example.com"));
}

// Good — 관찰 가능한 동작을 검증한다
[Test]
public void User_matches_email_case_insensitively()
{
    var user = new User();
    user.SetEmail("  TEST@Example.COM  ");

    bool matches = user.MatchesEmail("test@example.com");

    Assert.That(matches, Is.True);
}
```

## 5.4 의존 유형 분류

### Managed와 Unmanaged

![Managed vs Unmanaged 의존](/images/blog/khorikov/diagrams/ch05-managed-unmanaged.svg)

| 유형 | 정의 | 예시 | Mock 여부 |
|------|------|------|-----------|
| Managed | 시스템이 직접 소유하고 관리한다 | DB, 로컬 파일 | Mock을 지양한다 |
| Unmanaged | 외부 시스템이 소유한다 | 외부 API, 이메일 | Mock을 권장한다 |

### 왜 이 구분이 중요한가

DB를 mock하면 실제 쿼리 동작이나 스키마 변경을 감지하지 못한다. 통합 문제가 그대로 운영 환경으로 흘러간다. 반대로 외부 API를 직접 호출하면 테스트가 느려지고 외부 서비스 상태에 의존하게 된다.

```csharp
// Managed 의존(DB) — Mock을 지양한다
public class UserService
{
    private readonly IUserRepository _repository;

    public User GetUser(int id)
    {
        return _repository.GetById(id);
    }
}

// 권장: 실제 DB 또는 인메모리 DB로 통합 테스트한다

// Unmanaged 의존(외부 API) — Mock을 권장한다
public class PaymentService
{
    private readonly IPaymentGateway _gateway;

    public bool ProcessPayment(Order order)
    {
        return _gateway.Charge(order.Total);
    }
}

// 권장: Mock으로 호출 계약만 검증한다
```

## 5.5 Mock 사용 규칙

Khorikov가 제시하는 규칙은 단순하다.

1. Unmanaged 의존만 Mock한다.
2. Managed 의존은 실제 객체 또는 Fake를 사용한다.
3. Mock은 시스템 경계에서만 사용한다.
4. 내부 클래스 사이의 통신은 Mock하지 않는다.

![System Boundary](/images/blog/khorikov/diagrams/ch05-system-boundary.svg)

## 5.6 Mock이 취약성을 유발하는 이유

### 구현 결합

```csharp
// 회피 — 내부 협력자를 Mock한다
[Test]
public void CreateOrder_saves_to_repository()
{
    var mockRepo = new Mock<IOrderRepository>();
    var mockValidator = new Mock<IOrderValidator>();
    var mockPricer = new Mock<IPricingService>();

    mockValidator.Setup(v => v.Validate(It.IsAny<Order>())).Returns(true);
    mockPricer.Setup(p => p.Calculate(It.IsAny<Order>())).Returns(100m);

    var service = new OrderService(mockRepo.Object, mockValidator.Object, mockPricer.Object);

    service.CreateOrder(new Order());

    // 구현 세부사항을 검증한다 — 리팩토링하면 깨진다
    mockValidator.Verify(v => v.Validate(It.IsAny<Order>()), Times.Once);
    mockPricer.Verify(p => p.Calculate(It.IsAny<Order>()), Times.Once);
    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
}
```

내부 구현을 한 단계 합치는 정도의 리팩토링만 해도 위 테스트는 무더기로 실패한다.

```csharp
public class OrderService
{
    public void CreateOrder(Order order)
    {
        // 이전: _validator.Validate(order);
        //       var price = _pricer.Calculate(order);
        //       _repo.Save(order);

        // 이후: 검증과 가격 계산을 한 메서드로 통합한다
        var processedOrder = _orderProcessor.Process(order);
        _repo.Save(processedOrder);
    }
}
```

### 해결: 동작 기반 테스트

Fake를 사용해 결과 상태로 검증하면 같은 동작을 더 견고하게 표현할 수 있다.

```csharp
[Test]
public void CreateOrder_creates_order_with_correct_total()
{
    var fakeRepo = new FakeOrderRepository();
    var service = new OrderService(
        fakeRepo,
        new OrderValidator(),
        new PricingService());

    var order = new Order { Items = CreateItems(quantity: 5, unitPrice: 20) };

    service.CreateOrder(order);

    var savedOrder = fakeRepo.GetAll().Single();
    Assert.That(savedOrder.Total, Is.EqualTo(100m));
}
```

## 5.7 Mock, Spy, Stub 정리

| 카테고리 | 종류 | 검증 | 구현 |
|----------|------|------|------|
| Mocks | Mock | outgoing 호출을 검증한다 | 프레임워크가 만든다 |
| Mocks | Spy | outgoing 호출을 기록한다 | 수동 구현이다 |
| Stubs | Stub | 검증하지 않는다 | 값을 반환한다 |
| Stubs | Dummy | 검증하지 않는다 | 사용되지 않는다 |
| Stubs | Fake | 검증하지 않는다 | 작동하는 대체품이다 |

## 5.8 취약한 테스트 식별

다음 지표 중 두 가지 이상이 보이면 테스트가 취약하다는 신호다.

| 지표 | 설명 |
|------|------|
| Mock이 3개 이상 | 테스트가 너무 많은 협력자에 결합되어 있다 |
| Verify 호출이 많다 | 구현 세부사항을 검증하고 있을 가능성이 크다 |
| Setup이 복잡하다 | 테스트가 구현에 강하게 결합되어 있다 |
| 리팩토링 때마다 실패 | 거짓 양성이 자주 발생한다 |

```csharp
// 취약성 경고 신호가 한꺼번에 보인다
[Test]
public void Complex_test_with_many_mocks()
{
    var mock1 = new Mock<IService1>();
    var mock2 = new Mock<IService2>();
    var mock3 = new Mock<IService3>();
    var mock4 = new Mock<IService4>();
    var mock5 = new Mock<IService5>();

    mock1.Setup(m => m.Method1()).Returns("value");
    mock2.Setup(m => m.Method2(It.IsAny<int>())).Returns(true);
    // 더 많은 Setup이 이어진다

    var sut = new ComplexService(
        mock1.Object, mock2.Object, mock3.Object,
        mock4.Object, mock5.Object);

    sut.DoSomething();

    mock1.Verify(m => m.Method1(), Times.Once);
    mock2.Verify(m => m.Method2(42), Times.Once);
    mock3.Verify(m => m.Method3(), Times.Exactly(2));
    // 더 많은 Verify가 이어진다
}
```

## 자주 보는 함정

- **Repository를 Mock**: DB는 Managed 의존이므로 Fake 또는 통합 테스트로 다룬다.
- **로거나 메트릭에 Verify**: 관찰 가능한 동작이 아니므로 구현 세부사항이다.
- **Setup이 7~8줄**: SUT가 너무 많은 일을 하거나, 테스트가 너무 많은 경로를 한꺼번에 검증한다.
- **Mock 프레임워크로 Fake 흉내**: Setup만 잔뜩 쌓여서 자체 Fake 클래스보다 무거워진다.
- **Stub에 Verify**: 입력 제공자의 호출 횟수를 검증하면 곧바로 mock 안티패턴이 된다.

## 정리

- Mock은 outgoing 호출 검증용이고 Stub은 incoming 입력 제공용이다.
- 관찰 가능한 동작은 검증하고 구현 세부사항은 검증하지 않는다.
- DB나 로컬 파일 같은 Managed 의존은 Mock을 지양하고 Fake나 실제 구현을 쓴다.
- 외부 API 같은 Unmanaged 의존은 Mock으로 호출 계약을 검증한다.
- Mock은 시스템 경계에서만 쓰고 내부 클래스 통신에는 쓰지 않는다.
- Mock 개수, Verify 빈도, Setup 복잡도가 모두 취약성 지표가 된다.

핵심 질문은 다음과 같다.

> 이 Mock이 시스템 경계에 있는가, 내부 협력자인가?

## 다음 장 예고

다음 장에서는 단위 테스트의 세 가지 스타일을 다룬다. Output-based, State-based, Communication-based 스타일의 장단점을 살펴본다.

## 관련 항목

- [Ch 4: The Four Pillars of a Good Unit Test](/blog/programming/engineering/khorikov-unit-testing/chapter04-four-pillars)
- [Ch 6: Styles of Unit Testing](/blog/programming/engineering/khorikov-unit-testing/chapter06-styles)
- [Ch 9: Mocking Best Practices](/blog/programming/engineering/khorikov-unit-testing/chapter09-mocking-best-practices)
- [GOOS](/blog/programming/engineering/goos/chapter01-what-is-tdd) — London 학파의 Mock 활용
- [Working Effectively with Legacy Code](/blog/programming/engineering/legacy-code/ch01) — Seam과 Sprout 패턴으로 Mock 경계 짓기
