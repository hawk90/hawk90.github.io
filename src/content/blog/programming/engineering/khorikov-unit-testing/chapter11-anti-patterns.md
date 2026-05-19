---
title: "Ch 11: Unit Testing Anti-Patterns"
date: 2026-05-10T11:00:00
description: "흔한 안티패턴 — private method 테스트, time leak, code pollution. 시리즈 마무리."
tags: [TDD, Anti-Patterns]
series: "Khorikov Unit Testing"
seriesOrder: 11
draft: true
---

안티패턴을 알면 좋은 테스트를 작성하기 쉬워진다. 마지막 장에서는 흔한 실수와 해결책을 살펴본다.

## 11.1 Private Method 직접 테스트

### 문제

```csharp
public class PriceCalculator
{
    public decimal Calculate(Order order)
    {
        var discount = CalculateDiscount(order);  // private
        return order.Total * (1 - discount);
    }

    private decimal CalculateDiscount(Order order)
    {
        if (order.Total > 1000) return 0.1m;
        if (order.Total > 500) return 0.05m;
        return 0;
    }
}

// ❌ private 메서드 직접 테스트 — 리플렉션 사용
[Test]
public void CalculateDiscount_returns_10_percent_for_large_orders()
{
    var calculator = new PriceCalculator();
    var method = typeof(PriceCalculator)
        .GetMethod("CalculateDiscount", BindingFlags.NonPublic | BindingFlags.Instance);

    var result = method.Invoke(calculator, new object[] { new Order { Total = 1500 } });

    Assert.That(result, Is.EqualTo(0.1m));
}
```

**왜 문제인가:**
- 구현 세부사항에 결합
- 리팩토링 시 깨짐
- 테스트하기 어려운 설계 신호

### 해결책

#### 1. Public API를 통해 테스트

```csharp
// ✅ public 메서드를 통해 간접 테스트
[Test]
public void Large_order_gets_10_percent_discount()
{
    var calculator = new PriceCalculator();
    var order = new Order { Total = 1500m };

    var result = calculator.Calculate(order);

    Assert.That(result, Is.EqualTo(1350m));  // 1500 * 0.9
}
```

#### 2. 클래스 추출 (로직이 복잡할 때)

```csharp
// private이 복잡하면 별도 클래스로
public class DiscountCalculator
{
    public decimal Calculate(decimal orderTotal)
    {
        if (orderTotal > 1000) return 0.1m;
        if (orderTotal > 500) return 0.05m;
        return 0;
    }
}

// 직접 테스트 가능
[Test]
public void Large_order_gets_10_percent()
{
    var calculator = new DiscountCalculator();

    var result = calculator.Calculate(1500m);

    Assert.That(result, Is.EqualTo(0.1m));
}
```

## 11.2 Time Dependency (시간 누수)

### 문제

```csharp
public class Delivery
{
    public bool IsValid()
    {
        return Date > DateTime.Now;  // 💥 시간 의존
    }
}

// ❌ 비결정적 테스트
[Test]
public void Future_delivery_is_valid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(1) };

    // 자정 직전에 실행하면 실패할 수 있음!
    Assert.That(delivery.IsValid(), Is.True);
}
```

### 해결책

#### 1. 시간 주입

```csharp
public class Delivery
{
    public DateTime Date { get; set; }

    public bool IsValid(DateTime now)  // 시간 주입
    {
        return Date > now;
    }
}

// ✅ 결정적 테스트
[Test]
public void Future_delivery_is_valid()
{
    var now = new DateTime(2024, 1, 1, 12, 0, 0);
    var delivery = new Delivery { Date = new DateTime(2024, 1, 2) };

    Assert.That(delivery.IsValid(now), Is.True);
}
```

#### 2. Clock 인터페이스

```csharp
public interface IClock
{
    DateTime Now { get; }
}

public class SystemClock : IClock
{
    public DateTime Now => DateTime.Now;
}

public class TestClock : IClock
{
    public DateTime Now { get; set; }
}

public class DeliveryService
{
    private readonly IClock _clock;

    public DeliveryService(IClock clock)
    {
        _clock = clock;
    }

    public bool IsDeliveryValid(Delivery delivery)
    {
        return delivery.Date > _clock.Now;
    }
}

// 테스트
[Test]
public void Future_delivery_is_valid()
{
    var clock = new TestClock { Now = new DateTime(2024, 1, 1) };
    var service = new DeliveryService(clock);
    var delivery = new Delivery { Date = new DateTime(2024, 1, 2) };

    Assert.That(service.IsDeliveryValid(delivery), Is.True);
}
```

## 11.3 Code Pollution (코드 오염)

### 문제

프로덕션 코드에 테스트 전용 로직이 들어감:

```csharp
public class UserService
{
    private readonly bool _isTestMode;  // 💥 테스트 전용 플래그

    public UserService(bool isTestMode = false)
    {
        _isTestMode = isTestMode;
    }

    public void CreateUser(string email)
    {
        // ... 유저 생성 ...

        if (!_isTestMode)  // 💥 테스트 분기
        {
            SendWelcomeEmail(email);
        }
    }
}

// 테스트
[Test]
public void CreateUser_does_not_send_email_in_test_mode()
{
    var service = new UserService(isTestMode: true);  // 💥
    service.CreateUser("test@example.com");
}
```

**문제점:**
- 프로덕션 코드 복잡도 증가
- 버그 가능성 증가
- 테스트가 실제 동작 검증 안 함

### 해결책: 의존성 주입

```csharp
public interface IEmailService
{
    void SendWelcomeEmail(string email);
}

public class UserService
{
    private readonly IEmailService _email;

    public UserService(IEmailService email)
    {
        _email = email;
    }

    public void CreateUser(string email)
    {
        // ... 유저 생성 ...
        _email.SendWelcomeEmail(email);
    }
}

// 테스트 — Mock 사용
[Test]
public void CreateUser_sends_welcome_email()
{
    var mockEmail = new Mock<IEmailService>();
    var service = new UserService(mockEmail.Object);

    service.CreateUser("test@example.com");

    mockEmail.Verify(e => e.SendWelcomeEmail("test@example.com"));
}
```

## 11.4 Concrete Class Mocking

### 문제

```csharp
// ❌ 구체 클래스 Mock
var mockService = new Mock<UserService>();  // 가상 메서드만 가능
mockService.Setup(s => s.GetUser(1)).Returns(user);
```

**문제점:**
- 가상(virtual) 메서드만 Mock 가능
- 생성자 실행됨
- 의도치 않은 부작용

### 해결책: 인터페이스 사용

```csharp
public interface IUserService
{
    User GetUser(int id);
    void CreateUser(string email);
}

public class UserService : IUserService { ... }

// ✅ 인터페이스 Mock
var mockService = new Mock<IUserService>();
mockService.Setup(s => s.GetUser(1)).Returns(user);
```

## 11.5 Asserting on Implementation Details

### 문제

```csharp
// ❌ 구현 세부사항 검증
[Test]
public void CreateOrder_calls_correct_methods()
{
    var mockRepo = new Mock<IOrderRepository>();
    var service = new OrderService(mockRepo.Object);

    service.CreateOrder(request);

    // 내부 호출 순서와 횟수 검증 — 취약
    mockRepo.Verify(r => r.BeginTransaction(), Times.Once);
    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
    mockRepo.Verify(r => r.Commit(), Times.Once);
}
```

### 해결책: 결과 검증

```csharp
// ✅ 관찰 가능한 결과 검증
[Test]
public void CreateOrder_persists_order()
{
    var fakeRepo = new FakeOrderRepository();
    var service = new OrderService(fakeRepo);

    var result = service.CreateOrder(request);

    Assert.That(result.Success, Is.True);
    Assert.That(fakeRepo.GetAll(), Has.Count.EqualTo(1));
}
```

## 11.6 Exposing State for Testing

### 문제

```csharp
public class ShoppingCart
{
    internal List<Item> InternalItems { get; }  // 💥 테스트용 노출

    // 원래 private이어야 할 것을 internal로
}

// ❌ 테스트
[Test]
public void AddItem_adds_to_internal_list()
{
    var cart = new ShoppingCart();

    cart.AddItem(item);

    Assert.That(cart.InternalItems, Contains.Item(item));  // 내부 구현 의존
}
```

### 해결책: Public API 사용

```csharp
public class ShoppingCart
{
    private readonly List<Item> _items = new();

    public IReadOnlyList<Item> Items => _items.AsReadOnly();  // 읽기 전용 노출
    public int ItemCount => _items.Count;
    public decimal Total => _items.Sum(i => i.Price);
}

// ✅ public API로 검증
[Test]
public void AddItem_increases_item_count()
{
    var cart = new ShoppingCart();

    cart.AddItem(item);

    Assert.That(cart.ItemCount, Is.EqualTo(1));
    Assert.That(cart.Items, Contains.Item(item));
}
```

## 11.7 Leaking Domain Knowledge

### 문제

```csharp
// ❌ 테스트가 도메인 로직 복제
[Test]
public void Calculate_discount_correctly()
{
    var calculator = new DiscountCalculator();
    var order = new Order { Total = 1500m };

    // 테스트가 로직을 알고 있음
    var expected = order.Total * 0.1m;  // 💥 로직 복제

    var result = calculator.Calculate(order);

    Assert.That(result, Is.EqualTo(expected));
}
```

**문제점:**
- 로직 변경 시 테스트도 변경 필요
- 버그가 있어도 테스트 통과 가능

### 해결책: 하드코딩된 기대값

```csharp
// ✅ 구체적인 기대값
[Test]
public void Large_order_gets_10_percent_discount()
{
    var calculator = new DiscountCalculator();
    var order = new Order { Total = 1500m };

    var result = calculator.Calculate(order);

    Assert.That(result, Is.EqualTo(150m));  // 계산하지 않고 직접 명시
}
```

## 11.8 안티패턴 체크리스트

| 안티패턴 | 증상 | 해결 |
|----------|------|------|
| Private 테스트 | 리플렉션 사용 | Public API 또는 추출 |
| 시간 의존 | DateTime.Now 직접 사용 | 시간 주입 |
| 코드 오염 | isTestMode 플래그 | 의존성 주입 |
| 구체 클래스 Mock | virtual 필요 | 인터페이스 |
| 구현 검증 | Verify 남용 | 결과 검증 |
| 상태 노출 | internal/public 오용 | 적절한 public API |
| 로직 복제 | 테스트에서 계산 | 하드코딩된 값 |

## 11.9 시리즈 마무리

### 핵심 원칙 요약

```
1. 테스트의 목적 = 지속 가능한 성장
2. 단위 = 동작 (클래스 아님)
3. 4가지 기둥 = 회귀 + 리팩토링 + 피드백 + 유지보수
4. Mock = 시스템 경계에서만
5. Output-based > State-based > Communication-based
6. 코드 4사분면 → 각각 다른 전략
```

### 관련 도서

| 책 | 저자 | 특징 |
|----|------|------|
| **TDD by Example** | Kent Beck | TDD 입문 |
| **GOOS** | Freeman & Pryce | London 학파 |
| **xUnit Test Patterns** | Meszaros | 패턴 카탈로그 |
| **이 책** | Khorikov | Classical + 현대적 시각 |

### 마지막 질문들

테스트를 작성할 때마다:
1. 이 테스트가 프로젝트 성장에 기여하는가?
2. 동작을 테스트하는가, 구현을 테스트하는가?
3. 4가지 기둥 중 어디가 약한가?
4. Mock이 경계에 있는가?
5. 안티패턴에 해당하는가?

## 정리

| 안티패턴 | 핵심 |
|----------|------|
| **Private 테스트** | 리플렉션 대신 public API |
| **시간 누수** | DateTime.Now 주입 |
| **코드 오염** | 테스트 플래그 제거 |
| **구체 클래스 Mock** | 인터페이스 사용 |
| **구현 검증** | 결과에 집중 |

**최종 질문:**
> 이 테스트가 미래의 나에게 도움이 되는가, 아니면 짐이 되는가?
