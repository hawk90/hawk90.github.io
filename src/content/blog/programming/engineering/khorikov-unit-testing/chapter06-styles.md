---
title: "Ch 6: Styles of Unit Testing"
date: 2025-10-16T03:00:00
description: "Output / State / Communication 3 스타일. functional core vs imperative shell."
tags: [TDD, Styles, Functional Core]
series: "Khorikov Unit Testing"
seriesOrder: 6
---

단위 테스트에는 세 가지 스타일이 있다. 각 스타일은 다른 방식으로 SUT를 검증하며, 4가지 기둥에서 서로 다른 강점을 보인다.

## 6.1 세 가지 테스트 스타일

| 스타일 | 영어 | 검증 대상 |
|--------|------|-----------|
| **출력 기반** | Output-based | 반환값 |
| **상태 기반** | State-based | 최종 상태 |
| **통신 기반** | Communication-based | 협력자 호출 |

```
             ┌─────────────────┐
    입력 ──▶ │       SUT       │ ──▶ 출력
             └────────┬────────┘
                      │
              ┌───────┴───────┐
              ▼               ▼
          상태 변경       협력자 호출
```

## 6.2 Output-based 테스트

### 정의

SUT에 입력을 주고 **반환값**만 검증한다:

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

// Output-based 테스트
[Test]
public void Premium_customer_with_5_years_gets_20_percent_discount()
{
    var calculator = new PriceCalculator();

    decimal price = calculator.CalculateDiscount(
        basePrice: 100m,
        isPremium: true,
        loyaltyYears: 5);

    Assert.That(price, Is.EqualTo(80m));  // 출력만 검증
}
```

### 특징

| 장점 | 이유 |
|------|------|
| **리팩토링 내성 최고** | 구현에 결합 없음 |
| **유지보수 쉬움** | 단순한 입출력 |
| **부수효과 없음** | 순수 함수 |

### 제약

- SUT가 **순수 함수**여야 함
- 부수효과가 있으면 불가능

```csharp
// ❌ Output-based 불가능 — 부수효과 있음
public void SendEmail(string to, string body)
{
    _emailService.Send(to, body);  // 부수효과
    // 반환값 없음
}
```

## 6.3 State-based 테스트

### 정의

작업 수행 후 SUT의 **최종 상태**를 검증한다:

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

// State-based 테스트
[Test]
public void Adding_item_increases_total()
{
    var cart = new ShoppingCart();
    var item = new Item { ProductId = 1, Price = 10m, Quantity = 2 };

    cart.AddItem(item);

    Assert.That(cart.Total, Is.EqualTo(20m));  // 상태 검증
    Assert.That(cart.Items, Has.Count.EqualTo(1));
}
```

### 특징

| 장점 | 단점 |
|------|------|
| 직관적 | 상태 노출 필요 |
| 널리 사용 | 테스트가 상태에 결합 |
| OOP 친화적 | Output보다 취약 |

### 주의: 테스트를 위한 상태 노출

```csharp
// ❌ 테스트를 위해 내부 상태 노출
public class Order
{
    // 테스트에서만 사용되는 프로퍼티
    internal List<Item> InternalItems => _items;  // 코드 오염
}

// ✅ 공개 API를 통해 검증
public class Order
{
    public IReadOnlyList<Item> Items => _items.AsReadOnly();
    public int ItemCount => _items.Count;
}
```

## 6.4 Communication-based 테스트

### 정의

SUT와 **협력자 간의 통신**을 검증한다:

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

// Communication-based 테스트
[Test]
public void CompleteOrder_sends_confirmation_email()
{
    var mockEmail = new Mock<IEmailService>();
    var service = new OrderService(mockEmail.Object);
    var order = new Order { CustomerEmail = "test@example.com" };

    service.CompleteOrder(order);

    // 통신 검증
    mockEmail.Verify(e => e.SendConfirmation("test@example.com"), Times.Once);
}
```

### 특징

| 장점 | 단점 |
|------|------|
| 부수효과 테스트 가능 | 구현에 결합 |
| 협력자 검증 | 리팩토링 내성 낮음 |
| | 취약한 테스트 |

### 언제 사용?

**적절한 사용:**
- 시스템 경계 (외부 API)
- 관찰 가능한 부수효과

**부적절한 사용:**
- 내부 클래스 간 통신
- 구현 세부사항

## 6.5 스타일 비교

### 4가지 기둥 관점

| 스타일 | 회귀 보호 | 리팩토링 내성 | 빠른 피드백 | 유지보수성 |
|--------|-----------|---------------|-------------|------------|
| **Output** | 중간 | **최고** | 최고 | **최고** |
| **State** | 중간 | 높음 | 최고 | 높음 |
| **Communication** | 중간 | **낮음** | 최고 | 낮음 |

### 권장 순서

```
1순위: Output-based
       └─ 가능하면 항상 선택

2순위: State-based
       └─ Output 불가능할 때

3순위: Communication-based
       └─ 외부 시스템 연동에만
```

## 6.6 Functional Core, Imperative Shell

### 문제

현실의 코드는 대부분 부수효과가 있어 Output-based가 어렵다:

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

**Functional Core:**
- 순수 함수로 비즈니스 로직
- Output-based 테스트 가능

**Imperative Shell:**
- 부수효과 담당
- 최소한의 로직
- 통합 테스트로 커버

```
┌─────────────────────────────────────────────────────┐
│                 Imperative Shell                     │
│                                                     │
│    DB 읽기 ──▶ ┌─────────────────┐ ──▶ DB 쓰기      │
│                │                 │                  │
│                │ Functional Core │                  │
│                │                 │                  │
│    이메일 ◀── └─────────────────┘ ──▶ 로깅         │
│                                                     │
│          (순수 함수, 비즈니스 로직)                   │
└─────────────────────────────────────────────────────┘
```

### 리팩토링 예시

**Before:**

```csharp
public class UserService
{
    public void ChangeEmail(int userId, string newEmail)
    {
        var user = _repo.GetById(userId);

        // 비즈니스 로직이 부수효과와 섞임
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

**After:**

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

// Output-based 테스트 가능!
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


// Imperative Shell — 부수효과만
public class UserService
{
    public void ChangeEmail(int userId, string newEmail)
    {
        var user = _repo.GetById(userId);

        // Functional Core 호출
        var result = EmailChangeResult.Create(user.Email, newEmail);

        // 부수효과 실행
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

### User 클래스 리팩토링

```csharp
// Before — 부수효과 포함
public class User
{
    public void ChangeEmail(string newEmail, IEmailValidator validator)
    {
        if (!validator.IsValid(newEmail))  // 외부 의존
            throw new InvalidEmailException();

        Email = newEmail;
        ModifiedAt = DateTime.Now;  // 비결정적
    }
}

// After — 순수 함수
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

// Output-based 테스트
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

### 의사결정 트리

```
SUT가 값을 반환하는가?
    │
    ├─ Yes ──▶ Output-based ✓
    │
    └─ No
        │
        └─ SUT가 상태를 변경하는가?
            │
            ├─ Yes ──▶ State-based ✓
            │
            └─ No (외부 호출만)
                │
                └─ Communication-based ✓
                   (단, 시스템 경계에서만)
```

### 실제 코드에서의 비율

```
좋은 테스트 스위트:

Output-based     ████████████████████  60%
State-based      ██████████            30%
Communication    ████                  10%
```

## 정리

| 개념 | 핵심 |
|------|------|
| **Output-based** | 반환값 검증, 최선 |
| **State-based** | 상태 검증, 차선 |
| **Communication-based** | 호출 검증, 경계에서만 |
| **Functional Core** | 비즈니스 로직을 순수 함수로 |
| **Imperative Shell** | 부수효과는 얇은 레이어로 |

**핵심 질문:**
> 이 테스트를 Output-based로 만들 수 있는가?

## 다음 장 예고

다음 장에서는 가치 있는 테스트를 향한 리팩토링을 다룬다. 코드를 4가지 사분면으로 분류하고, 각 사분면에 맞는 테스트 전략을 살펴본다.
