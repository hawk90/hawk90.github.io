---
title: "Ch 6: Styles of Unit Testing"
date: 2026-05-10T06:00:00
description: "Output, State, Communication 세 가지 스타일. Functional Core와 Imperative Shell."
tags: [TDD, Styles, Functional Core]
series: "Khorikov Unit Testing"
seriesOrder: 6
---

단위 테스트에는 세 가지 스타일이 있다. 각 스타일은 다른 방식으로 SUT를 검증하며, 4가지 기둥에서 서로 다른 강점을 보인다.

## 6.1 세 가지 테스트 스타일

| 스타일 | 영어 | 검증 대상 |
|--------|------|-----------|
| 출력 기반 | Output-based | 반환값 |
| 상태 기반 | State-based | 최종 상태 |
| 통신 기반 | Communication-based | 협력자 호출 |

SUT의 동작은 다음 세 경로로 외부에 드러난다. 어느 경로를 검증할 것인지에 따라 스타일이 정해진다.

- 입력에 대해 반환값을 돌려준다.
- 자신이나 협력자의 상태를 변경한다.
- 협력자의 메서드를 호출한다.

## 6.2 Output-based 테스트

### 정의

SUT에 입력을 주고 반환값만 검증한다.

```csharp
public class PriceCalculator
{
    public decimal CalculateDiscount(
        decimal basePrice,
        bool isPremium,
        int loyaltyYears)
    {
        decimal discount = 0;

        if (isPremium)
            discount += 0.1m;

        discount += Math.Min(loyaltyYears * 0.02m, 0.1m);

        return basePrice * (1 - discount);
    }
}

[Test]
public void Premium_customer_with_5_years_gets_20_percent_discount()
{
    var calculator = new PriceCalculator();

    decimal price = calculator.CalculateDiscount(
        basePrice: 100m,
        isPremium: true,
        loyaltyYears: 5);

    Assert.That(price, Is.EqualTo(80m));
}
```

### 특징

| 장점 | 이유 |
|------|------|
| 리팩토링 내성 최고 | 구현에 결합되지 않는다 |
| 유지보수가 쉽다 | 입력과 출력만 보면 된다 |
| 부수효과가 없다 | 순수 함수에 해당한다 |

제약은 분명하다. SUT가 순수 함수여야 한다. 부수효과가 있으면 Output-based로는 검증할 수 없다.

```csharp
// Output-based 불가능 — 부수효과만 있다
public void SendEmail(string to, string body)
{
    _emailService.Send(to, body);
}
```

## 6.3 State-based 테스트

### 정의

작업을 수행한 뒤 SUT의 최종 상태를 검증한다.

```csharp
public class ShoppingCart
{
    private readonly List<Item> _items = new();

    public IReadOnlyList<Item> Items => _items;
    public decimal Total => _items.Sum(i => i.Price * i.Quantity);

    public void AddItem(Item item)
    {
        var existing = _items.FirstOrDefault(i => i.ProductId == item.ProductId);
        if (existing != null)
            existing.Quantity += item.Quantity;
        else
            _items.Add(item);
    }
}

[Test]
public void Adding_item_increases_total()
{
    var cart = new ShoppingCart();
    var item = new Item { ProductId = 1, Price = 10m, Quantity = 2 };

    cart.AddItem(item);

    Assert.That(cart.Total, Is.EqualTo(20m));
    Assert.That(cart.Items, Has.Count.EqualTo(1));
}
```

### 특징

직관적이고 OOP에 친화적이지만, 검증을 위해 상태를 노출해야 할 수도 있다. 노출은 공개 API의 자연스러운 일부일 때만 받아들이고, 테스트를 위한 노출은 피한다.

```csharp
// 회피 — 테스트를 위해 내부 상태를 노출한다
public class Order
{
    internal List<Item> InternalItems => _items;
}

// Good — 공개 API로 노출하고 검증한다
public class Order
{
    public IReadOnlyList<Item> Items => _items.AsReadOnly();
    public int ItemCount => _items.Count;
}
```

## 6.4 Communication-based 테스트

### 정의

SUT와 협력자 사이의 통신을 검증한다.

```csharp
public class OrderService
{
    private readonly IEmailService _emailService;

    public void CompleteOrder(Order order)
    {
        // ... 주문 처리 ...
        _emailService.SendConfirmation(order.CustomerEmail);
    }
}

[Test]
public void CompleteOrder_sends_confirmation_email()
{
    var mockEmail = new Mock<IEmailService>();
    var service = new OrderService(mockEmail.Object);
    var order = new Order { CustomerEmail = "test@example.com" };

    service.CompleteOrder(order);

    mockEmail.Verify(e => e.SendConfirmation("test@example.com"), Times.Once);
}
```

부수효과 검증이 가능하다는 장점이 있지만, 구현에 결합되기 쉽고 리팩토링 내성이 낮다. 시스템 경계에서 관찰 가능한 부수효과(외부 API 호출, 이메일 발송 등)에만 쓴다. 내부 클래스 사이의 통신에는 쓰지 않는다.

## 6.5 스타일 비교

| 스타일 | 회귀 보호 | 리팩토링 내성 | 빠른 피드백 | 유지보수성 |
|--------|-----------|---------------|-------------|------------|
| Output | 중간 | 최고 | 최고 | 최고 |
| State | 중간 | 높음 | 최고 | 높음 |
| Communication | 중간 | 낮음 | 최고 | 낮음 |

권장 순서는 분명하다.

- 1순위: Output-based — 가능하면 항상 선택한다.
- 2순위: State-based — Output이 불가능할 때 쓴다.
- 3순위: Communication-based — 외부 시스템 연동에만 쓴다.

## 6.6 Functional Core, Imperative Shell

### 문제

현실의 코드는 대부분 부수효과가 있어 Output-based로 직접 검증하기 어렵다.

```csharp
public class UserService
{
    private readonly IUserRepository _repo;
    private readonly IEmailService _email;

    public void ChangeEmail(int userId, string newEmail)
    {
        var user = _repo.GetById(userId);  // 부수효과: DB 읽기

        if (user.Email == newEmail)
            return;

        user.ChangeEmail(newEmail);

        _repo.Save(user);  // 부수효과: DB 쓰기
        _email.SendNotification(user.Email);  // 부수효과: 이메일
    }
}
```

### 해결: 아키텍처 분리

Functional Core와 Imperative Shell이라는 패턴이 해법이다. 핵심 비즈니스 로직은 순수 함수로 두고(Functional Core), 부수효과는 얇은 셸이 담당한다(Imperative Shell).

| 영역 | 역할 | 테스트 방식 |
|------|------|--------------|
| Functional Core | 비즈니스 결정 | Output-based 단위 테스트 |
| Imperative Shell | 부수효과 실행 | 통합 테스트로 커버 |

![Functional Core / Imperative Shell](/images/blog/khorikov/diagrams/ch06-functional-core.svg)

### 리팩토링 예시

원래 구조는 비즈니스 결정과 부수효과가 한 메서드 안에 섞여 있다.

```csharp
public class UserService
{
    public void ChangeEmail(int userId, string newEmail)
    {
        var user = _repo.GetById(userId);

        if (user.Email == newEmail)
            return;

        var oldEmail = user.Email;
        user.ChangeEmail(newEmail);
        _repo.Save(user);

        if (oldEmail != newEmail)
            _email.SendNotification(newEmail);
    }
}
```

결정 부분을 순수 함수로 떼어내고, 결과를 받아 부수효과만 실행하도록 다시 짠다.

```csharp
// Functional Core — 순수 함수
public class EmailChangeResult
{
    public bool ShouldUpdate { get; }
    public string NewEmail { get; }
    public bool ShouldNotify { get; }

    private EmailChangeResult(bool shouldUpdate, string newEmail, bool shouldNotify)
    {
        ShouldUpdate = shouldUpdate;
        NewEmail = newEmail;
        ShouldNotify = shouldNotify;
    }

    public static EmailChangeResult Create(string currentEmail, string newEmail)
    {
        if (currentEmail == newEmail)
            return new EmailChangeResult(false, newEmail, false);

        return new EmailChangeResult(true, newEmail, true);
    }
}

[Test]
public void Same_email_returns_no_update()
{
    var result = EmailChangeResult.Create("test@example.com", "test@example.com");

    Assert.That(result.ShouldUpdate, Is.False);
    Assert.That(result.ShouldNotify, Is.False);
}

[Test]
public void Different_email_returns_update_and_notify()
{
    var result = EmailChangeResult.Create("old@example.com", "new@example.com");

    Assert.That(result.ShouldUpdate, Is.True);
    Assert.That(result.ShouldNotify, Is.True);
}

// Imperative Shell — 부수효과만 담는다
public class UserService
{
    public void ChangeEmail(int userId, string newEmail)
    {
        var user = _repo.GetById(userId);

        var result = EmailChangeResult.Create(user.Email, newEmail);

        if (result.ShouldUpdate)
        {
            user.ChangeEmail(result.NewEmail);
            _repo.Save(user);
        }

        if (result.ShouldNotify)
            _email.SendNotification(result.NewEmail);
    }
}
```

## 6.7 도메인 모델에서의 적용

도메인 모델 안에 외부 의존이 박혀 있으면 Output-based로 검증하기 어렵다. 외부 의존을 호출 측에서 주입받게 하면 모델은 순수해진다.

```csharp
// Before — 부수효과를 포함한다
public class User
{
    public void ChangeEmail(string newEmail, IEmailValidator validator)
    {
        if (!validator.IsValid(newEmail))
            throw new InvalidEmailException();

        Email = newEmail;
        ModifiedAt = DateTime.Now;  // 비결정적이다
    }
}

// After — 순수 함수다
public class User
{
    public EmailChangeResult ChangeEmail(string newEmail, bool isValidEmail, DateTime now)
    {
        if (!isValidEmail)
            return EmailChangeResult.Invalid();

        return EmailChangeResult.Success(
            new User { Email = newEmail, ModifiedAt = now });
    }
}

[Test]
public void Valid_email_change_succeeds()
{
    var user = new User { Email = "old@example.com" };
    var now = new DateTime(2024, 1, 1);

    var result = user.ChangeEmail("new@example.com", isValidEmail: true, now);

    Assert.That(result.IsSuccess, Is.True);
    Assert.That(result.User.Email, Is.EqualTo("new@example.com"));
    Assert.That(result.User.ModifiedAt, Is.EqualTo(now));
}
```

## 6.8 스타일 선택 가이드

스타일은 다음 흐름으로 결정한다.

1. SUT가 값을 반환하는가? 그렇다면 Output-based로 검증한다.
2. SUT가 상태를 변경하는가? 그렇다면 State-based로 검증한다.
3. 외부로 나가는 호출만 있는가? 그렇다면 Communication-based로 검증하되, 시스템 경계에 한정한다.

좋은 테스트 스위트의 대략적인 비율은 Output 60%, State 30%, Communication 10% 정도가 자주 인용된다. 비율 자체보다는 가능한 한 Output을 늘리고 Communication을 줄이는 방향이 중요하다.

## 자주 보는 함정

- **상태 검증을 위해 internal 접근자 추가**: 테스트만을 위한 노출은 결국 캡슐화를 무너뜨린다.
- **Communication-based를 내부 협력자에 적용**: 구현 검증으로 미끄러져 리팩토링 내성이 사라진다.
- **DateTime.Now에 의존**: 같은 코드가 시점마다 다르게 동작해 Output-based의 결정성이 깨진다.
- **Functional Core를 만들었다고 안심**: 셸의 통합 테스트를 빼먹으면 부수효과 경로가 검증되지 않는다.
- **세 스타일을 한 테스트에 섞기**: 반환값도 보고, 상태도 보고, 호출도 보면 의도가 흐려진다.

## 정리

- 단위 테스트에는 Output, State, Communication 세 가지 스타일이 있다.
- Output-based는 4가지 기둥에서 가장 균형이 좋다.
- State-based는 차선이며 직관적이지만 상태 노출에 주의해야 한다.
- Communication-based는 시스템 경계의 부수효과 검증에만 쓴다.
- Functional Core는 비즈니스 결정을 순수 함수로 분리한 영역이다.
- Imperative Shell은 결정을 받아 부수효과를 실행하는 얇은 레이어다.

핵심 질문은 다음과 같다.

> 이 테스트를 Output-based로 만들 수 있는가?

## 다음 장 예고

다음 장에서는 가치 있는 테스트를 향한 리팩토링을 다룬다. 코드를 4가지 사분면으로 분류하고, 각 사분면에 맞는 테스트 전략을 살펴본다.

## 관련 항목

- [Ch 5: Mocks and Test Fragility](/blog/programming/engineering/khorikov-unit-testing/chapter05-mocks-fragility)
- [Ch 7: Refactoring Toward Valuable Unit Tests](/blog/programming/engineering/khorikov-unit-testing/chapter07-refactoring)
- [TDD Patterns](/blog/programming/engineering/tdd-patterns/) — Self-Shunt, Imposter 등 스타일 보조 패턴
- [Refactoring Catalog](/blog/programming/design/refactoring-catalog/) — Extract Function, Split Phase 같은 어휘
