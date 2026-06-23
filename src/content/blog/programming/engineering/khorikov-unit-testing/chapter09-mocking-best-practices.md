---
title: "Ch 9: Mocking Best Practices"
date: 2026-05-10T09:00:00
description: "시스템 경계에서만 Mock한다. 자체 Wrapper, Mock 수 제한, Verify 최소화, Loose Mock을 기본으로."
tags: [Testing, Mock, Best Practices]
series: "Khorikov Unit Testing"
seriesOrder: 9
draft: true

---

Mock은 강력하지만 오용하기 쉽다. 올바른 Mock 사용법은 테스트의 가치를 높이고, 잘못된 사용은 취약한 테스트를 만든다.

## 9.1 Mock 사용의 핵심 원칙

### 시스템 경계에서만 Mock한다

다음 세 규칙이 핵심이다.

1. 내부 클래스 사이에는 Mock을 쓰지 않는다.
2. Managed 의존(DB)은 Fake 또는 실제 구현을 쓴다.
3. Unmanaged 의존(외부 API)은 Mock을 쓴다.

| 의존 위치 | 처리 |
|-----------|------|
| 같은 시스템 내부 | Mock 금지 — 실제 객체나 Fake |
| 시스템 경계, Managed | Fake 또는 실제 DB |
| 시스템 경계, Unmanaged | Mock 사용 |

## 9.2 Mock, Spy, Fake 선택

| 상황 | 선택 | 이유 |
|------|------|------|
| 외부 API 호출 검증 | Mock | 호출 여부 확인이 필요하다 |
| DB 연동 | Fake (인메모리) 또는 실제 DB | 실제 동작 검증 |
| 결과값만 필요 | Stub | 단순 값 반환 |
| 호출 기록 필요 | Spy | 수동 기록 |

```csharp
// Mock — 외부 API 호출을 검증한다
[Test]
public void Order_completion_sends_email()
{
    var mockEmail = new Mock<IEmailService>();
    var service = new OrderService(mockEmail.Object);

    service.CompleteOrder(order);

    mockEmail.Verify(e => e.SendConfirmation(order.Email), Times.Once);
}

// Fake — DB 대신 인메모리를 쓴다
[Test]
public void CreateUser_persists_user()
{
    var fakeRepo = new InMemoryUserRepository();
    var service = new UserService(fakeRepo);

    service.CreateUser("test@example.com");

    Assert.That(fakeRepo.GetAll(), Has.Count.EqualTo(1));
}

// Spy — 수동으로 호출을 기록한다
public class EmailSpy : IEmailService
{
    public List<string> SentEmails { get; } = new();

    public void SendConfirmation(string email)
    {
        SentEmails.Add(email);
    }
}

[Test]
public void Order_completion_sends_email_to_customer()
{
    var spy = new EmailSpy();
    var service = new OrderService(spy);

    service.CompleteOrder(new Order { Email = "test@example.com" });

    Assert.That(spy.SentEmails, Contains.Item("test@example.com"));
}
```

## 9.3 Mock 개수 제한

Mock이 많다는 것은 설계 문제의 신호다.

```csharp
// 회피 — Mock이 너무 많다 (설계 문제)
[Test]
public void CreateOrder_processes_correctly()
{
    var mockRepo = new Mock<IOrderRepository>();
    var mockInventory = new Mock<IInventoryService>();
    var mockPayment = new Mock<IPaymentGateway>();
    var mockEmail = new Mock<IEmailService>();
    var mockLogger = new Mock<ILogger>();
    var mockMetrics = new Mock<IMetricsService>();
    // Mock 6개 = SUT가 너무 많은 책임을 진다
}
```

### 해결: 책임 분리

각 서비스가 하나의 책임을 가지도록 분리한다.

```csharp
// OrderService — 주문 생성만
public class OrderService
{
    private readonly IOrderRepository _repo;

    public Order CreateOrder(CreateOrderRequest request) { /* ... */ }
}

// PaymentService — 결제만
public class PaymentService
{
    private readonly IPaymentGateway _gateway;

    public PaymentResult ProcessPayment(Order order) { /* ... */ }
}

[Test]
public void CreateOrder_saves_order()
{
    var fakeRepo = new InMemoryOrderRepository();
    var service = new OrderService(fakeRepo);

    service.CreateOrder(request);

    Assert.That(fakeRepo.GetAll(), Has.Count.EqualTo(1));
}
```

| Mock 수 | 상태 |
|---------|------|
| 0~2 | 정상 |
| 3~4 | 주의가 필요하다 |
| 5 이상 | 리팩토링이 필요하다 |

## 9.4 자체 Wrapper 패턴

### 문제: 외부 라이브러리를 직접 의존

`SmtpClient` 같은 외부 타입을 직접 의존하면 테스트에서 다루기 까다롭다.

```csharp
// 회피 — 외부 라이브러리에 직접 의존한다
public class EmailService
{
    private readonly SmtpClient _smtp;

    public void Send(string to, string body)
    {
        _smtp.Send(to, body);
    }
}
```

### 해결: 자체 Wrapper 인터페이스

도메인 어휘에 맞는 자체 인터페이스를 두고, 그것을 통해서만 외부 라이브러리에 접근한다.

```csharp
public interface IEmailGateway
{
    void SendEmail(string to, string subject, string body);
}

public class SmtpEmailGateway : IEmailGateway
{
    private readonly SmtpClient _smtp;

    public void SendEmail(string to, string subject, string body)
    {
        var message = new MailMessage("noreply@example.com", to, subject, body);
        _smtp.Send(message);
    }
}

public class NotificationService
{
    private readonly IEmailGateway _email;

    public void NotifyUser(User user, string message)
    {
        _email.SendEmail(user.Email, "Notification", message);
    }
}

[Test]
public void NotifyUser_sends_email()
{
    var mockEmail = new Mock<IEmailGateway>();
    var service = new NotificationService(mockEmail.Object);

    service.NotifyUser(user, "Hello");

    mockEmail.Verify(e => e.SendEmail(user.Email, "Notification", "Hello"));
}
```

| 장점 | 설명 |
|------|------|
| 테스트 용이 | 자체 인터페이스를 Mock한다 |
| 추상화 | 외부 라이브러리 세부사항을 숨긴다 |
| 교체 용이 | 구현 변경이 쉽다 |
| 도메인 언어 | 비즈니스 어휘를 사용한다 |

## 9.5 Verify 사용 지침

### Verify는 최소화한다

```csharp
// 회피 — 과도한 Verify
[Test]
public void ProcessOrder_does_everything()
{
    mockRepo.Verify(r => r.GetById(orderId), Times.Once);
    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
    mockPayment.Verify(p => p.Charge(amount), Times.Once);
    mockEmail.Verify(e => e.Send(email), Times.Once);
    mockLogger.Verify(l => l.Log(It.IsAny<string>()), Times.AtLeastOnce);
}

// Good — 핵심 부수효과만 검증한다
[Test]
public void ProcessOrder_sends_confirmation_email()
{
    service.ProcessOrder(order);

    mockEmail.Verify(e => e.SendConfirmation(order.Email), Times.Once);
}
```

| 상황 | Verify | 이유 |
|------|--------|------|
| 외부 API 호출 | 적절하다 | 부수효과 확인이 필요하다 |
| 이메일 발송 | 적절하다 | 관찰 가능한 동작이다 |
| 내부 메서드 호출 | 부적절하다 | 구현 세부사항이다 |
| 로깅 | 대개 부적절하다 | 일반적으로 비필수다 |

## 9.6 Strict와 Loose Mock

### Strict Mock

설정되지 않은 호출이 발생하면 예외를 던진다.

```csharp
var strictMock = new Mock<IService>(MockBehavior.Strict);
strictMock.Setup(s => s.Method1()).Returns("value");

// Method2() 호출 시 예외가 발생한다
```

### Loose Mock (기본)

설정되지 않은 호출은 기본값(null, 0 등)을 반환한다.

```csharp
var looseMock = new Mock<IService>();
looseMock.Setup(s => s.Method1()).Returns("value");

// Method2() 호출 시 null을 반환한다 (예외 없음)
```

### 권장: Loose Mock

| 특성 | Strict | Loose |
|------|--------|-------|
| 안전성 | 높다 | 낮다 |
| 유연성 | 낮다 | 높다 |
| 유지보수 | 어렵다 | 쉽다 |
| 권장 | 특수 경우 | 기본 |

Strict는 모든 호출을 명시적으로 검증해야 하거나, 예상치 못한 호출을 잡아야 하는 경우에 한정해서 쓴다.

## 9.7 Setup 가이드라인

### 필요한 것만 Setup한다

```csharp
// 회피 — 과도한 Setup
mockService.Setup(s => s.Method1()).Returns("a");
mockService.Setup(s => s.Method2()).Returns("b");
mockService.Setup(s => s.Method3()).Returns("c");
mockService.Setup(s => s.Method4()).Returns("d");
mockService.Setup(s => s.Method5()).Returns("e");

// Good — 필요한 것만
mockService.Setup(s => s.Method1()).Returns("a");
```

### It.IsAny와 구체적 값

값이 중요하지 않을 때는 `It.IsAny<>`를 쓰고, 중요할 때는 구체적인 값을 쓴다.

```csharp
// It.IsAny — 값이 중요하지 않다
mockRepo.Setup(r => r.GetById(It.IsAny<int>())).Returns(user);

// 구체적 값 — 값이 중요하다
mockRepo.Setup(r => r.GetById(42)).Returns(user);

// Verify에서도 동일하게 적용한다
mockEmail.Verify(e => e.Send("specific@email.com"));
mockEmail.Verify(e => e.Send(It.IsAny<string>()));
```

## 9.8 통합 테스트에서의 Mock

Managed 의존은 실제 사용하고, Unmanaged 의존만 Mock한다는 원칙을 유지한다.

```csharp
[Test]
public async Task CompleteOrder_integration_test()
{
    // Managed (DB) — 실제 또는 Fake
    var orderRepo = new SqlOrderRepository(TestDb.Connection);

    // Unmanaged (외부 API) — Mock
    var mockPayment = new Mock<IPaymentGateway>();
    mockPayment.Setup(p => p.Charge(It.IsAny<decimal>()))
               .ReturnsAsync(PaymentResult.Success());

    var mockEmail = new Mock<IEmailGateway>();

    var service = new OrderService(orderRepo, mockPayment.Object, mockEmail.Object);

    await service.CompleteOrder(orderId);

    // DB 상태 검증
    var order = await orderRepo.GetById(orderId);
    Assert.That(order.Status, Is.EqualTo(OrderStatus.Completed));

    // 외부 호출 검증
    mockPayment.Verify(p => p.Charge(order.Total), Times.Once);
    mockEmail.Verify(e => e.SendConfirmation(order.Email), Times.Once);
}
```

## 자주 보는 함정

- **외부 라이브러리 타입을 그대로 Mock**: virtual이 아닌 메서드 때문에 mock 프레임워크가 거부하거나 우회 코드가 늘어난다.
- **모든 호출에 대해 Verify**: 구현 검증으로 전락한다.
- **Strict Mock을 기본으로**: 테스트가 셋업에 강하게 결합되어 유지보수가 어려워진다.
- **It.IsAny 남용**: 의도된 값 전달을 검증하지 못해 회귀 보호가 약해진다.
- **로거나 메트릭에 Verify**: 관찰 가능한 동작이 아니라 운영 도구다.

## 정리

- Mock은 시스템 경계의 Unmanaged 의존에만 쓴다.
- Mock이 3개를 넘으면 SUT의 책임을 재검토한다.
- 외부 라이브러리는 자체 Wrapper 인터페이스를 통해 의존한다.
- Verify는 관찰 가능한 부수효과에만 사용한다.
- 기본은 Loose Mock으로 두고, Strict는 특수한 경우에만 쓴다.
- Setup은 필요한 항목만 두고, It.IsAny와 구체적 값을 의도에 맞게 골라 쓴다.

핵심 질문은 다음과 같다.

> 이 Mock이 시스템 경계에 있는가? 내부 협력자를 Mock하고 있지는 않은가?

## 다음 장 예고

다음 장에서는 데이터베이스 테스트를 다룬다. 실제 DB를 사용한 통합 테스트, 테스트 격리, 테스트 데이터 관리를 살펴본다.

## 관련 항목

- [Ch 5: Mocks and Test Fragility](/blog/programming/engineering/khorikov-unit-testing/chapter05-mocks-fragility)
- [Ch 8: Why Integration Testing?](/blog/programming/engineering/khorikov-unit-testing/chapter08-why-integration)
- [Ch 10: Testing the Database](/blog/programming/engineering/khorikov-unit-testing/chapter10-testing-database)
- [GOOS](/blog/programming/engineering/goos/chapter01-what-is-tdd) — Wrapper와 Adapter 사용법
- [TDD Patterns](/blog/programming/engineering/tdd-patterns/pattern01-test) — Self-Shunt, Imposter 패턴
