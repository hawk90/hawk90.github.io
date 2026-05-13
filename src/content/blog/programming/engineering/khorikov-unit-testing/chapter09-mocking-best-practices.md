---
title: "Ch 9: Mocking Best Practices"
date: 2025-10-17T03:00:00
description: "Mock — system 경계에서만. 단일 entry point. 자체 wrapper."
tags: [Testing, Mock, Best Practices]
series: "Khorikov Unit Testing"
seriesOrder: 9
draft: true
---

Mock은 강력하지만 오용하기 쉽다. 올바른 Mock 사용법은 테스트의 가치를 높이고, 잘못된 사용은 취약한 테스트를 만든다.

## 9.1 Mock 사용의 핵심 원칙

### 시스템 경계에서만 Mock

```
┌─────────────────────────────────────────────────────────┐
│                    우리 시스템                           │
│                                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│  │Controller│ ── │ Service │ ── │ Domain  │            │
│  └─────────┘    └─────────┘    └─────────┘            │
│       │                              │                  │
│       │    Mock 금지 ───────────────────               │
│       │                              │                  │
│       ▼                              ▼                  │
│  ┌─────────┐                    ┌─────────┐           │
│  │ Email   │ ◀─ Mock 허용 ─▶    │   DB    │ ◀─ Fake   │
│  │ Service │                    │         │            │
│  └─────────┘                    └─────────┘            │
│       │                              │                  │
└───────┼──────────────────────────────┼──────────────────┘
        │                              │
        ▼                              ▼
   외부 SMTP                      실제 DB 또는
   (Unmanaged)                   인메모리 DB
                                 (Managed)
```

**규칙:**
1. **내부 클래스 간** → Mock 금지
2. **Managed 의존 (DB)** → Fake 또는 실제 사용
3. **Unmanaged 의존 (외부 API)** → Mock 사용

## 9.2 Mock vs Spy vs Fake 선택

| 상황 | 선택 | 이유 |
|------|------|------|
| 외부 API 호출 검증 | Mock | 호출 여부 확인 필요 |
| DB 연동 | Fake (인메모리) | 실제 동작 검증 |
| 결과값만 필요 | Stub | 단순 값 반환 |
| 호출 기록 필요 | Spy | 수동 기록 |

```csharp
// Mock — 외부 API 호출 검증
[Test]
public void Order_completion_sends_email()
{
    var mockEmail = new Mock<IEmailService>();
    var service = new OrderService(mockEmail.Object);

    service.CompleteOrder(order);

    mockEmail.Verify(e => e.SendConfirmation(order.Email), Times.Once);
}

// Fake — DB 대신 인메모리
[Test]
public void CreateUser_persists_user()
{
    var fakeRepo = new InMemoryUserRepository();
    var service = new UserService(fakeRepo);

    service.CreateUser("test@example.com");

    Assert.That(fakeRepo.GetAll(), Has.Count.EqualTo(1));
}

// Spy — 수동 기록
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

## 9.3 Mock 수 제한

### Mock이 많으면 문제

```csharp
// ❌ Mock이 너무 많음 — 설계 문제 신호
[Test]
public void CreateOrder_processes_correctly()
{
    var mockRepo = new Mock<IOrderRepository>();
    var mockInventory = new Mock<IInventoryService>();
    var mockPayment = new Mock<IPaymentGateway>();
    var mockEmail = new Mock<IEmailService>();
    var mockLogger = new Mock<ILogger>();
    var mockMetrics = new Mock<IMetricsService>();

    // 6개의 Mock = SUT가 너무 많은 책임
}
```

### 해결: 책임 분리

```csharp
// ✅ SUT 분리 후

// OrderService — 주문 생성만
public class OrderService
{
    private readonly IOrderRepository _repo;

    public Order CreateOrder(CreateOrderRequest request) { }
}

// PaymentService — 결제만
public class PaymentService
{
    private readonly IPaymentGateway _gateway;

    public PaymentResult ProcessPayment(Order order) { }
}

// 각각 테스트 — Mock 1-2개
[Test]
public void CreateOrder_saves_order()
{
    var fakeRepo = new InMemoryOrderRepository();
    var service = new OrderService(fakeRepo);

    service.CreateOrder(request);

    Assert.That(fakeRepo.GetAll(), Has.Count.EqualTo(1));
}
```

### 가이드라인

| Mock 수 | 상태 |
|---------|------|
| 0-2 | 정상 |
| 3-4 | 주의 필요 |
| 5+ | 리팩토링 필요 |

## 9.4 자체 Wrapper 패턴

### 문제: 외부 라이브러리 직접 Mock

```csharp
// ❌ 외부 라이브러리 직접 의존
public class EmailService
{
    private readonly SmtpClient _smtp;  // System.Net.Mail

    public void Send(string to, string body)
    {
        _smtp.Send(to, body);
    }
}

// 테스트에서 SmtpClient Mock 어려움
```

### 해결: Wrapper 인터페이스

```csharp
// 자체 인터페이스 정의
public interface IEmailGateway
{
    void SendEmail(string to, string subject, string body);
}

// 실제 구현
public class SmtpEmailGateway : IEmailGateway
{
    private readonly SmtpClient _smtp;

    public void SendEmail(string to, string subject, string body)
    {
        var message = new MailMessage("noreply@example.com", to, subject, body);
        _smtp.Send(message);
    }
}

// 서비스는 자체 인터페이스 사용
public class NotificationService
{
    private readonly IEmailGateway _email;

    public void NotifyUser(User user, string message)
    {
        _email.SendEmail(user.Email, "Notification", message);
    }
}

// 테스트에서 쉽게 Mock
[Test]
public void NotifyUser_sends_email()
{
    var mockEmail = new Mock<IEmailGateway>();
    var service = new NotificationService(mockEmail.Object);

    service.NotifyUser(user, "Hello");

    mockEmail.Verify(e => e.SendEmail(user.Email, "Notification", "Hello"));
}
```

### Wrapper의 장점

| 장점 | 설명 |
|------|------|
| **테스트 용이** | 자체 인터페이스 Mock |
| **추상화** | 외부 라이브러리 세부사항 숨김 |
| **교체 용이** | 구현 변경 쉬움 |
| **도메인 언어** | 비즈니스 용어 사용 |

## 9.5 Verify 사용 지침

### Verify는 최소화

```csharp
// ❌ 과도한 Verify
[Test]
public void ProcessOrder_does_everything()
{
    mockRepo.Verify(r => r.GetById(orderId), Times.Once);
    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
    mockPayment.Verify(p => p.Charge(amount), Times.Once);
    mockEmail.Verify(e => e.Send(email), Times.Once);
    mockLogger.Verify(l => l.Log(It.IsAny<string>()), Times.AtLeastOnce);
}

// ✅ 핵심 부수효과만 검증
[Test]
public void ProcessOrder_sends_confirmation_email()
{
    // Setup...

    service.ProcessOrder(order);

    // 외부로 나가는 핵심 부수효과만
    mockEmail.Verify(e => e.SendConfirmation(order.Email), Times.Once);
}
```

### 언제 Verify 사용?

| 상황 | Verify | 이유 |
|------|--------|------|
| 외부 API 호출 | O | 부수효과 확인 필요 |
| 이메일 발송 | O | 관찰 가능한 동작 |
| 내부 메서드 호출 | X | 구현 세부사항 |
| 로깅 | X (대부분) | 일반적으로 비필수 |

## 9.6 Strict vs Loose Mock

### Strict Mock

```csharp
// Strict — 설정되지 않은 호출 시 예외
var strictMock = new Mock<IService>(MockBehavior.Strict);
strictMock.Setup(s => s.Method1()).Returns("value");

// Method2() 호출 시 예외 발생!
```

### Loose Mock (기본)

```csharp
// Loose — 설정되지 않은 호출은 기본값 반환
var looseMock = new Mock<IService>();  // MockBehavior.Loose
looseMock.Setup(s => s.Method1()).Returns("value");

// Method2() 호출 시 null 반환 (예외 없음)
```

### 권장: Loose Mock

| 특성 | Strict | Loose |
|------|--------|-------|
| 안전성 | 높음 | 낮음 |
| 유연성 | 낮음 | 높음 |
| 유지보수 | 어려움 | 쉬움 |
| **권장** | 특수 경우 | 기본 |

**Strict 사용 시기:**
- 모든 호출을 명시적으로 검증해야 할 때
- 예상치 못한 호출을 잡아야 할 때

## 9.7 Setup 가이드라인

### 필요한 것만 Setup

```csharp
// ❌ 과도한 Setup
mockService.Setup(s => s.Method1()).Returns("a");
mockService.Setup(s => s.Method2()).Returns("b");
mockService.Setup(s => s.Method3()).Returns("c");
mockService.Setup(s => s.Method4()).Returns("d");
mockService.Setup(s => s.Method5()).Returns("e");

// 테스트에서 Method1만 사용하는데...

// ✅ 필요한 것만
mockService.Setup(s => s.Method1()).Returns("a");
```

### It.IsAny vs 구체적 값

```csharp
// It.IsAny — 값이 중요하지 않을 때
mockRepo.Setup(r => r.GetById(It.IsAny<int>())).Returns(user);

// 구체적 값 — 값이 중요할 때
mockRepo.Setup(r => r.GetById(42)).Returns(user);

// Verify에서도 동일
mockEmail.Verify(e => e.Send("specific@email.com"));  // 정확한 이메일 확인
mockEmail.Verify(e => e.Send(It.IsAny<string>()));    // 아무 이메일이나
```

## 9.8 통합 테스트에서의 Mock

### Managed vs Unmanaged 전략

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

## 정리

| 개념 | 핵심 |
|------|------|
| **경계에서만** | 시스템 경계의 Unmanaged 의존만 Mock |
| **Mock 수 제한** | 3개 이상이면 설계 재검토 |
| **Wrapper 패턴** | 외부 라이브러리는 자체 인터페이스로 |
| **Verify 최소화** | 관찰 가능한 부수효과만 |
| **Loose Mock** | 기본으로 사용 |

**핵심 질문:**
> 이 Mock이 시스템 경계에 있는가? 내부 협력자를 Mock하고 있지는 않은가?

## 다음 장 예고

다음 장에서는 데이터베이스 테스트를 다룬다. 실제 DB를 사용한 통합 테스트, 테스트 격리, 테스트 데이터 관리를 살펴본다.
