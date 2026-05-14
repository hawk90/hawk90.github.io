---
title: "Ch 5: Mocks and Test Fragility"
date: 2025-10-15T05:00:00
description: "Mock 종류 — Dummy / Stub / Spy / Mock / Fake. 4 communications + observable / 비-observable."
tags: [TDD, Mock, Stub, Fake]
series: "Khorikov Unit Testing"
seriesOrder: 5
draft: true
---

Mock은 양날의 검이다. 적절히 사용하면 테스트를 빠르고 격리되게 만들지만, 남용하면 취약한 테스트를 만든다.

## 5.1 테스트 더블 분류 (Meszaros)

Gerard Meszaros의 분류:

| 종류 | 목적 | 동작 |
|------|------|------|
| **Dummy** | 파라미터 채우기 | 사용되지 않음 |
| **Stub** | 미리 준비된 답변 | 입력 제공 |
| **Spy** | 호출 기록 | 호출 추적 |
| **Mock** | 기대 동작 설정 + 검증 | 상호작용 검증 |
| **Fake** | 단순화된 실제 구현 | 작동하는 대체품 |

```csharp
// Dummy — 사용되지 않음
public class DummyLogger : ILogger
{
    public void Log(string message) { /* 아무것도 안 함 */ }
}

// Stub — 미리 정의된 값 반환
var stubRepo = new Mock<IUserRepository>();
stubRepo.Setup(r => r.GetById(1)).Returns(new User { Name = "John" });

// Spy — 호출 기록
public class SpyEmailSender : IEmailSender
{
    public List<string> SentEmails { get; } = new();
    public void Send(string email) => SentEmails.Add(email);
}

// Mock — 기대 동작 + 검증
var mockEmailSender = new Mock<IEmailSender>();
// ... 테스트 실행 ...
mockEmailSender.Verify(e => e.Send("test@example.com"), Times.Once);

// Fake — 작동하는 대체 구현
public class FakeUserRepository : IUserRepository
{
    private readonly Dictionary<int, User> _users = new();
    public User GetById(int id) => _users.GetValueOrDefault(id);
    public void Save(User user) => _users[user.Id] = user;
}
```

## 5.2 Mock vs Stub (핵심 구분)

### 방향성 차이

```
                 ┌─────────────────┐
                 │       SUT       │
                 └────────┬────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
     ┌─────┐          ┌─────┐          ┌─────┐
     │Stub │          │Mock │          │Stub │
     └──┬──┘          └──┬──┘          └──┬──┘
        │                │                │
        ▼                ▼                ▼
    입력 제공        출력 검증        입력 제공
   (incoming)      (outgoing)      (incoming)
```

| 구분 | Mock | Stub |
|------|------|------|
| **방향** | SUT → 외부 (outgoing) | 외부 → SUT (incoming) |
| **검증** | 호출 여부 검증 | 값만 반환 |
| **목적** | 부수효과 확인 | 입력 제공 |
| **예시** | 이메일 전송 확인 | 데이터 조회 결과 제공 |

### 코드 예시

```csharp
public class OrderService
{
    private readonly IInventoryService _inventory;
    private readonly IEmailService _email;

    public bool ProcessOrder(Order order)
    {
        // Stub 역할: 재고 확인 (incoming)
        bool hasStock = _inventory.CheckStock(order.ProductId, order.Quantity);

        if (!hasStock)
            return false;

        _inventory.Reserve(order.ProductId, order.Quantity);

        // Mock 역할: 이메일 전송 (outgoing)
        _email.SendConfirmation(order.CustomerEmail);

        return true;
    }
}

[Test]
public void ProcessOrder_sends_confirmation_email()
{
    // Stub — 입력 제공
    var stubInventory = new Mock<IInventoryService>();
    stubInventory.Setup(i => i.CheckStock(It.IsAny<int>(), It.IsAny<int>()))
                 .Returns(true);

    // Mock — 출력 검증
    var mockEmail = new Mock<IEmailService>();

    var service = new OrderService(stubInventory.Object, mockEmail.Object);
    var order = new Order { ProductId = 1, Quantity = 5, CustomerEmail = "test@example.com" };

    service.ProcessOrder(order);

    // Mock만 검증 (Stub은 검증하지 않음)
    mockEmail.Verify(e => e.SendConfirmation("test@example.com"), Times.Once);
}
```

## 5.3 관찰 가능한 동작 vs 구현 세부사항

### 핵심 구분

| 구분 | 관찰 가능한 동작 | 구현 세부사항 |
|------|-----------------|---------------|
| **정의** | 클라이언트가 의존하는 것 | 내부 작동 방식 |
| **검증** | 해야 함 | 하면 안 됨 |
| **변경 시** | 계약 위반 | 리팩토링 |

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

```csharp
// ❌ 구현 세부사항 테스트
[Test]
public void SetEmail_normalizes_email()
{
    var user = new User();
    user.SetEmail("  TEST@Example.COM  ");

    // 내부 필드를 리플렉션으로 검증 — 취약
    var normalizedField = typeof(User)
        .GetField("_normalizedEmail", BindingFlags.NonPublic | BindingFlags.Instance);
    var value = normalizedField.GetValue(user);

    Assert.That(value, Is.EqualTo("test@example.com"));
}

// ✅ 관찰 가능한 동작 테스트
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

### Managed vs Unmanaged

```
                    의존
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   Managed 의존              Unmanaged 의존
  (시스템 내부)              (시스템 외부)
        │                         │
   ┌────┴────┐               ┌────┴────┐
   ▼         ▼               ▼         ▼
  DB       파일           HTTP API    메시지 큐
(직접 소유)  시스템        결제 게이트웨이  이메일
```

| 유형 | 정의 | 예시 | Mock 여부 |
|------|------|------|-----------|
| **Managed** | 시스템이 직접 소유/관리 | DB, 로컬 파일 | Mock 지양 |
| **Unmanaged** | 외부 시스템이 소유 | 외부 API, 이메일 | Mock 권장 |

### 왜 이 구분이 중요한가

```csharp
// Managed 의존 (DB) — Mock 지양
public class UserService
{
    private readonly IUserRepository _repository;  // DB 접근

    public User GetUser(int id)
    {
        return _repository.GetById(id);  // DB 호출
    }
}

// DB를 Mock하면?
// - 실제 쿼리 동작 검증 불가
// - 스키마 변경 감지 불가
// - 통합 문제 놓침

// 권장: 실제 DB 또는 인메모리 DB 사용


// Unmanaged 의존 (외부 API) — Mock 권장
public class PaymentService
{
    private readonly IPaymentGateway _gateway;  // 외부 API

    public bool ProcessPayment(Order order)
    {
        return _gateway.Charge(order.Total);  // 외부 호출
    }
}

// 외부 API를 직접 호출하면?
// - 테스트가 느림
// - 외부 서비스 상태에 의존
// - 비용 발생 가능
// - 비결정적

// 권장: Mock 사용
```

## 5.5 Mock 사용 규칙

### Khorikov의 규칙

```
┌─────────────────────────────────────────────────────┐
│                     규칙                            │
├─────────────────────────────────────────────────────┤
│ 1. Unmanaged 의존만 Mock한다                        │
│ 2. Managed 의존은 실제 객체 또는 Fake 사용          │
│ 3. Mock은 시스템 경계에서만 사용                    │
│ 4. 내부 클래스 간 통신은 Mock하지 않는다            │
└─────────────────────────────────────────────────────┘
```

### 시스템 경계

![System Boundary](/images/blog/khorikov/diagrams/ch05-system-boundary.svg)

## 5.6 Mock이 취약성을 유발하는 이유

### 구현 결합

```csharp
// ❌ 내부 협력자 Mock — 취약
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

    // 구현 세부사항 검증 — 리팩토링하면 깨짐
    mockValidator.Verify(v => v.Validate(It.IsAny<Order>()), Times.Once);
    mockPricer.Verify(p => p.Calculate(It.IsAny<Order>()), Times.Once);
    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
}
```

리팩토링 후:

```csharp
// 내부 구현 변경 — 기능은 동일
public class OrderService
{
    public void CreateOrder(Order order)
    {
        // 이전: _validator.Validate(order);
        //       var price = _pricer.Calculate(order);
        //       _repo.Save(order);

        // 이후: 검증과 가격 계산을 통합
        var processedOrder = _orderProcessor.Process(order);
        _repo.Save(processedOrder);
    }
}

// 💥 테스트 실패! (기능은 정상인데)
```

### 해결: 동작 기반 테스트

```csharp
// ✅ 동작 검증 — 구현 독립적
[Test]
public void CreateOrder_creates_order_with_correct_total()
{
    // Fake 사용 (실제처럼 동작하는 대체 구현)
    var fakeRepo = new FakeOrderRepository();
    var service = new OrderService(
        fakeRepo,
        new OrderValidator(),
        new PricingService());

    var order = new Order { Items = CreateItems(quantity: 5, unitPrice: 20) };

    service.CreateOrder(order);

    // 최종 결과 검증
    var savedOrder = fakeRepo.GetAll().Single();
    Assert.That(savedOrder.Total, Is.EqualTo(100m));
}
```

## 5.7 Mock vs Spy vs Stub 정리

```
                    테스트 더블
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
       Mocks                        Stubs
    (검증 목적)                   (입력 목적)
          │                           │
    ┌─────┴─────┐                     │
    ▼           ▼                     ▼
  Mock        Spy                   Stub
(프레임워크) (수동 기록)          (값 반환)
                                      │
                              ┌───────┴───────┐
                              ▼               ▼
                           Dummy            Fake
                        (미사용)         (단순 구현)
```

| 카테고리 | 종류 | 검증 | 구현 |
|----------|------|------|------|
| **Mocks** | Mock | outgoing 호출 검증 | 프레임워크 |
| | Spy | outgoing 호출 기록 | 수동 |
| **Stubs** | Stub | X | 값 반환 |
| | Dummy | X | 미사용 |
| | Fake | X | 작동하는 대체 |

## 5.8 취약한 테스트 식별

### 취약성 지표

| 지표 | 설명 |
|------|------|
| Mock이 3개 이상 | 테스트가 너무 많은 협력자에 결합 |
| Verify 호출 다수 | 구현 세부사항 검증 가능성 |
| Setup이 복잡 | 테스트가 구현에 강하게 결합 |
| 리팩토링 시 자주 실패 | 거짓 양성 발생 |

```csharp
// 🚨 취약성 경고 신호
[Test]
public void Complex_test_with_many_mocks()
{
    // Mock이 5개 — 너무 많음
    var mock1 = new Mock<IService1>();
    var mock2 = new Mock<IService2>();
    var mock3 = new Mock<IService3>();
    var mock4 = new Mock<IService4>();
    var mock5 = new Mock<IService5>();

    // 복잡한 Setup
    mock1.Setup(m => m.Method1()).Returns("value");
    mock2.Setup(m => m.Method2(It.IsAny<int>())).Returns(true);
    // ... 더 많은 Setup ...

    var sut = new ComplexService(
        mock1.Object, mock2.Object, mock3.Object,
        mock4.Object, mock5.Object);

    sut.DoSomething();

    // 많은 Verify — 구현 검증
    mock1.Verify(m => m.Method1(), Times.Once);
    mock2.Verify(m => m.Method2(42), Times.Once);
    mock3.Verify(m => m.Method3(), Times.Exactly(2));
    // ... 더 많은 Verify ...
}
```

## 정리

| 개념 | 핵심 |
|------|------|
| **Mock vs Stub** | 출력 검증 vs 입력 제공 |
| **관찰 가능 vs 구현** | 검증해야 할 것 vs 검증하면 안 될 것 |
| **Managed vs Unmanaged** | Mock 지양 vs Mock 권장 |
| **시스템 경계** | Mock은 경계에서만 |
| **취약성** | Mock 남용 = 리팩토링 내성 저하 |

**핵심 질문:**
> 이 Mock이 시스템 경계에 있는가, 내부 협력자인가?

## 다음 장 예고

다음 장에서는 단위 테스트의 세 가지 스타일을 다룬다. Output-based, State-based, Communication-based 스타일과 각각의 장단점을 살펴본다.
