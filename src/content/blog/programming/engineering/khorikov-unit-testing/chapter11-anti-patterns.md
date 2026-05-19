---
title: "Ch 11: Unit Testing Anti-Patterns"
date: 2026-05-10T11:00:00
description: "Private 메서드 테스트, 시간 누수, 코드 오염, 구체 클래스 Mock 등 흔한 안티패턴과 해결책."
tags: [TDD, Anti-Patterns]
series: "Khorikov Unit Testing"
seriesOrder: 11
---

안티패턴을 알면 좋은 테스트를 작성하기 쉬워진다. 마지막 장에서는 흔한 실수와 해결책을 살펴보고, 시리즈 전체를 마무리한다.

## 11.1 Private Method 직접 테스트

### 문제

```csharp
public class PriceCalculator
{
    public decimal Calculate(Order order)
    {
        var discount = CalculateDiscount(order);
        return order.Total * (1 - discount);
    }

    private decimal CalculateDiscount(Order order)
    {
        if (order.Total > 1000) return 0.1m;
        if (order.Total > 500) return 0.05m;
        return 0;
    }
}

// 회피 — private 메서드를 리플렉션으로 호출한다
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

이 테스트는 구현 세부사항에 결합되어 있고, 메서드 이름만 바뀌어도 깨진다. 또한 private 메서드를 직접 테스트해야 한다는 사실 자체가 설계가 잘못되었다는 신호다.

### 해결책 1: Public API를 통해 테스트

```csharp
[Test]
public void Large_order_gets_10_percent_discount()
{
    var calculator = new PriceCalculator();
    var order = new Order { Total = 1500m };

    var result = calculator.Calculate(order);

    Assert.That(result, Is.EqualTo(1350m));
}
```

### 해결책 2: 클래스 추출

private 로직이 충분히 복잡하다면 별도 클래스로 끌어올린다.

```csharp
public class DiscountCalculator
{
    public decimal Calculate(decimal orderTotal)
    {
        if (orderTotal > 1000) return 0.1m;
        if (orderTotal > 500) return 0.05m;
        return 0;
    }
}

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

`DateTime.Now`에 직접 의존하면 테스트가 비결정적이 된다.

```csharp
public class Delivery
{
    public bool IsValid()
    {
        return Date > DateTime.Now;
    }
}

// 회피 — 비결정적 테스트
[Test]
public void Future_delivery_is_valid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(1) };

    // 자정 직전에 실행하면 실패할 수 있다
    Assert.That(delivery.IsValid(), Is.True);
}
```

### 해결책 1: 시간 주입

메서드 인자로 시간을 받는다. 가장 단순한 해법이다.

```csharp
public class Delivery
{
    public DateTime Date { get; set; }

    public bool IsValid(DateTime now)
    {
        return Date > now;
    }
}

[Test]
public void Future_delivery_is_valid()
{
    var now = new DateTime(2024, 1, 1, 12, 0, 0);
    var delivery = new Delivery { Date = new DateTime(2024, 1, 2) };

    Assert.That(delivery.IsValid(now), Is.True);
}
```

### 해결책 2: Clock 인터페이스

서비스 수준에서는 `IClock` 추상화를 두고 의존성 주입으로 다룬다.

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

테스트 전용 분기가 프로덕션 코드에 섞여 들어간다.

```csharp
public class UserService
{
    private readonly bool _isTestMode;

    public UserService(bool isTestMode = false)
    {
        _isTestMode = isTestMode;
    }

    public void CreateUser(string email)
    {
        // 유저 생성 로직

        if (!_isTestMode)
        {
            SendWelcomeEmail(email);
        }
    }
}

[Test]
public void CreateUser_does_not_send_email_in_test_mode()
{
    var service = new UserService(isTestMode: true);
    service.CreateUser("test@example.com");
}
```

프로덕션 코드 복잡도가 늘어나고, 정작 테스트는 실제 동작 경로를 검증하지 못한다.

### 해결책: 의존성 주입

테스트 분기를 두지 않고, 이메일 발송을 의존으로 빼낸다.

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
        // 유저 생성 로직
        _email.SendWelcomeEmail(email);
    }
}

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

구체 클래스를 Mock하면 virtual 메서드만 가로챌 수 있고, 생성자가 실행되어 의도치 않은 부작용이 발생한다.

```csharp
// 회피 — 구체 클래스 Mock
var mockService = new Mock<UserService>();
mockService.Setup(s => s.GetUser(1)).Returns(user);
```

### 해결책: 인터페이스 사용

```csharp
public interface IUserService
{
    User GetUser(int id);
    void CreateUser(string email);
}

public class UserService : IUserService { /* ... */ }

var mockService = new Mock<IUserService>();
mockService.Setup(s => s.GetUser(1)).Returns(user);
```

## 11.5 Asserting on Implementation Details

### 문제

내부 호출 순서와 횟수를 검증하면 리팩토링에 매우 취약해진다.

```csharp
// 회피 — 구현 세부사항 검증
[Test]
public void CreateOrder_calls_correct_methods()
{
    var mockRepo = new Mock<IOrderRepository>();
    var service = new OrderService(mockRepo.Object);

    service.CreateOrder(request);

    mockRepo.Verify(r => r.BeginTransaction(), Times.Once);
    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
    mockRepo.Verify(r => r.Commit(), Times.Once);
}
```

### 해결책: 결과 검증

```csharp
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

테스트만을 위해 `internal`이나 `public`을 부여하면 캡슐화가 깨진다.

```csharp
public class ShoppingCart
{
    internal List<Item> InternalItems { get; }  // 테스트용 노출
}

[Test]
public void AddItem_adds_to_internal_list()
{
    var cart = new ShoppingCart();

    cart.AddItem(item);

    Assert.That(cart.InternalItems, Contains.Item(item));
}
```

### 해결책: 의미 있는 Public API

읽기 전용 노출이나 파생 속성을 통해 의도를 표현한다.

```csharp
public class ShoppingCart
{
    private readonly List<Item> _items = new();

    public IReadOnlyList<Item> Items => _items.AsReadOnly();
    public int ItemCount => _items.Count;
    public decimal Total => _items.Sum(i => i.Price);
}

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

테스트가 SUT의 계산식을 그대로 복제하면 버그가 있어도 통과한다.

```csharp
// 회피 — 테스트가 로직을 복제한다
[Test]
public void Calculate_discount_correctly()
{
    var calculator = new DiscountCalculator();
    var order = new Order { Total = 1500m };

    var expected = order.Total * 0.1m;  // 로직 복제

    var result = calculator.Calculate(order);

    Assert.That(result, Is.EqualTo(expected));
}
```

### 해결책: 하드코딩된 기대값

```csharp
[Test]
public void Large_order_gets_10_percent_discount()
{
    var calculator = new DiscountCalculator();
    var order = new Order { Total = 1500m };

    var result = calculator.Calculate(order);

    Assert.That(result, Is.EqualTo(150m));
}
```

기대값은 사람이 직접 계산하거나 명세에서 도출한 값이어야 한다.

## 11.8 안티패턴 체크리스트

| 안티패턴 | 증상 | 해결 |
|----------|------|------|
| Private 테스트 | 리플렉션 사용 | Public API 또는 클래스 추출 |
| 시간 의존 | DateTime.Now 직접 사용 | 시간 주입 또는 Clock 인터페이스 |
| 코드 오염 | isTestMode 플래그 | 의존성 주입 |
| 구체 클래스 Mock | virtual 강요 | 인터페이스 |
| 구현 검증 | Verify 남용 | 결과 검증 |
| 상태 노출 | internal 오용 | 의미 있는 Public API |
| 로직 복제 | 테스트에서 계산 | 하드코딩된 값 |

## 11.9 시리즈 마무리

### 핵심 원칙 요약

이 시리즈가 반복해서 강조한 여섯 가지 원칙은 다음과 같다.

1. 테스트의 목적은 지속 가능한 프로젝트 성장이다.
2. 단위는 동작이며 클래스가 아니다.
3. 좋은 테스트는 회귀 보호, 리팩토링 내성, 빠른 피드백, 유지보수성의 네 기둥으로 평가한다.
4. Mock은 시스템 경계에서만 쓴다.
5. Output-based가 State-based보다, State-based가 Communication-based보다 우선이다.
6. 코드를 4사분면으로 분류하고 각각 다른 전략을 적용한다.

### 관련 도서

| 책 | 저자 | 특징 |
|----|------|------|
| TDD by Example | Kent Beck | TDD 입문서 |
| GOOS | Freeman & Pryce | London 학파의 대표 |
| xUnit Test Patterns | Meszaros | 패턴 카탈로그 |
| Working Effectively with Legacy Code | Feathers | 테스트 없는 코드 다루기 |
| 이 책 | Khorikov | Classical 학파의 현대적 정리 |

### 마지막 질문들

테스트를 작성할 때마다 다음 다섯 가지를 자문한다.

- 이 테스트가 프로젝트 성장에 기여하는가?
- 동작을 테스트하는가, 구현을 테스트하는가?
- 4가지 기둥 중 어디가 약한가?
- Mock이 경계에 있는가?
- 어떤 안티패턴에 가까운가?

## 자주 보는 함정

- **안티패턴을 한 번에 모두 없애려 함**: 큰 변경은 거짓 양성 폭발로 이어진다. 점진적으로 정리한다.
- **Private 메서드 추출을 거부**: 도메인 모델이 자라야 할 곳에서 자라지 못한다.
- **Clock 인터페이스를 모든 곳에 강요**: 단순 함수라면 시간을 인자로 받는 편이 더 깔끔하다.
- **인터페이스를 mock 용도로만 사용**: 추상화 자체가 필요한지 검토하지 않으면 결합도가 흩어진다.
- **체크리스트만 만족하면 끝났다고 생각**: 안티패턴이 없어도 가치 없는 테스트는 가치가 없다.

## 정리

- Private 메서드는 Public API 또는 추출된 클래스를 통해 간접적으로 테스트한다.
- 시간 의존은 시간 주입이나 Clock 인터페이스로 제거한다.
- 테스트 전용 분기를 프로덕션 코드에 두지 않는다.
- 구체 클래스 대신 인터페이스를 Mock한다.
- 구현 세부사항이 아닌 관찰 가능한 결과를 검증한다.
- 테스트만을 위한 상태 노출은 피하고 의미 있는 Public API를 제공한다.

최종 질문은 다음과 같다.

> 이 테스트가 미래의 나에게 도움이 되는가, 아니면 짐이 되는가?

## 관련 항목

- [Ch 1: The Goal of Unit Testing](/blog/programming/engineering/khorikov-unit-testing/chapter01-goal-of-unit-testing)
- [Ch 5: Mocks and Test Fragility](/blog/programming/engineering/khorikov-unit-testing/chapter05-mocks-fragility)
- [Ch 9: Mocking Best Practices](/blog/programming/engineering/khorikov-unit-testing/chapter09-mocking-best-practices)
- [TDD by Example](/blog/programming/engineering/tdd-by-example/) — TDD의 기본 리듬
- [TDD Patterns](/blog/programming/engineering/tdd-patterns/) — 안티패턴 회피를 돕는 보조 패턴
- [GOOS](/blog/programming/engineering/goos/) — Outside-In 흐름과 Mock 경계 짓기
- [Working Effectively with Legacy Code](/blog/programming/engineering/legacy-code/) — Seam과 Sprout으로 안티패턴 정리
- [Refactoring Catalog](/blog/programming/design/refactoring-catalog/) — Extract Class, Replace Conditional 등의 어휘
- [TDD as XP](/blog/programming/engineering/agile-lean-engineering/part2-08-tdd-as-xp) — TDD가 작동하기 위한 사회적 조건
