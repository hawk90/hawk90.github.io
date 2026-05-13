---
title: "Ch 3: The Anatomy of a Unit Test"
date: 2025-10-15T03:00:00
description: "AAA / Arrange-Act-Assert. 명명. 매개변수 테스트."
tags: [TDD, AAA, Naming]
series: "Khorikov Unit Testing"
seriesOrder: 3
draft: true
---

좋은 단위 테스트는 일정한 구조를 따른다. 이 장에서는 테스트의 해부학적 구조를 살펴본다.

## 3.1 AAA 패턴

모든 단위 테스트는 세 단계로 구성된다:

| 단계 | 영어 | 목적 |
|------|------|------|
| **준비** | Arrange | 테스트 환경 구성 |
| **실행** | Act | SUT 동작 실행 |
| **검증** | Assert | 결과 확인 |

```csharp
[Test]
public void Sum_of_two_numbers()
{
    // Arrange
    double first = 10;
    double second = 20;
    var calculator = new Calculator();

    // Act
    double result = calculator.Sum(first, second);

    // Assert
    Assert.That(result, Is.EqualTo(30));
}
```

### AAA vs Given-When-Then

| AAA | GWT | BDD 관점 |
|-----|-----|----------|
| Arrange | Given | 사전 조건 |
| Act | When | 동작 |
| Assert | Then | 예상 결과 |

```csharp
// BDD 스타일 (Gherkin)
// Given a calculator with initial value 10
// When I add 20
// Then the result should be 30

[Test]
public void Given_calculator_When_add_Then_returns_sum()
{
    // Given
    var calculator = new Calculator();
    calculator.SetValue(10);

    // When
    calculator.Add(20);

    // Then
    Assert.That(calculator.Value, Is.EqualTo(30));
}
```

## 3.2 AAA 구조 가이드라인

### Arrange가 가장 클 수 있다

```csharp
[Test]
public void Delivery_with_past_date_is_invalid()
{
    // Arrange — 복잡한 설정
    var store = new Store();
    store.AddInventory(Product.Shampoo, 10);

    var customer = new Customer();
    customer.SetPremiumStatus(true);

    var delivery = new Delivery
    {
        Product = Product.Shampoo,
        Quantity = 5,
        Date = DateTime.Now.AddDays(-1)  // 과거 날짜
    };

    // Act — 간결해야 함
    var result = customer.CanAcceptDelivery(delivery, store);

    // Assert — 간결해야 함
    Assert.That(result, Is.False);
}
```

**일반적인 비율:**
- Arrange: 50-80%
- Act: 1-2줄
- Assert: 1-5줄

### Act는 한 줄이어야 한다

```csharp
// ❌ 나쁨 — Act가 여러 줄
[Test]
public void Purchase_with_discount()
{
    var customer = new Customer();
    var store = new Store();

    // Act — 여러 동작
    customer.AddDiscount(0.1m);
    var result = customer.Purchase(store, Product.Shampoo, 5);

    Assert.That(result.TotalPrice, Is.EqualTo(45m));
}

// ✅ 좋음 — Act가 한 줄
[Test]
public void Purchase_with_discount()
{
    // Arrange
    var customer = new Customer();
    customer.AddDiscount(0.1m);  // Arrange에서 설정
    var store = new Store();
    store.AddInventory(Product.Shampoo, 10);

    // Act — 단일 동작
    var result = customer.Purchase(store, Product.Shampoo, 5);

    // Assert
    Assert.That(result.TotalPrice, Is.EqualTo(45m));
}
```

**Act가 여러 줄이면?**
- SUT의 API가 잘못 설계된 신호
- 캡슐화 부족
- 리팩토링 고려

### Assert도 여러 개일 수 있다

```csharp
// ✅ 허용 — 같은 동작의 여러 측면 검증
[Test]
public void Purchase_succeeds()
{
    var customer = new Customer();
    var store = new Store();
    store.AddInventory(Product.Shampoo, 10);

    var result = customer.Purchase(store, Product.Shampoo, 5);

    // 하나의 동작에 대한 여러 측면
    Assert.That(result.Success, Is.True);
    Assert.That(result.Product, Is.EqualTo(Product.Shampoo));
    Assert.That(result.Quantity, Is.EqualTo(5));
    Assert.That(store.GetInventory(Product.Shampoo), Is.EqualTo(5));
}
```

**주의:** 너무 많은 Assert는 테스트가 여러 동작을 검증한다는 신호

## 3.3 빈 줄로 구분

```csharp
// ✅ 가독성 좋음
[Test]
public void Delivery_with_past_date_is_invalid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(-1) };

    bool isValid = delivery.Validate();

    Assert.That(isValid, Is.False);
}

// ❌ 가독성 나쁨
[Test]
public void Delivery_with_past_date_is_invalid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(-1) };
    bool isValid = delivery.Validate();
    Assert.That(isValid, Is.False);
}
```

**규칙:**
- 주석 없이 빈 줄로 AAA 구분
- 각 섹션이 명확히 보여야 함

## 3.4 테스트 명명

### 나쁜 명명 패턴

```csharp
// ❌ 구현 세부사항 노출
public void Test_Sum()
public void Calculator_Sum_Method()

// ❌ 너무 모호함
public void Test1()
public void It_works()

// ❌ 언더스코어 남용
public void Sum_Should_Return_Sum_Of_Two_Numbers_When_Given_Valid_Input()
```

### 좋은 명명 패턴

**동작 설명 중심:**

```csharp
// 패턴 1: 자연어 스타일
public void Sum_of_two_numbers()
public void Delivery_with_past_date_is_invalid()
public void Premium_customer_gets_discount()

// 패턴 2: 조건 명시
public void Delivery_with_past_date_should_be_invalid()
public void Purchase_fails_when_not_enough_inventory()
public void User_cannot_change_email_when_unconfirmed()
```

### 명명 가이드라인

| 원칙 | 설명 |
|------|------|
| **비기술적** | 비개발자도 이해 가능 |
| **동작 중심** | "무엇을 한다"가 아니라 "어떤 일이 일어난다" |
| **구현 제외** | 메서드명, 클래스명 제외 |
| **Should 선택적** | "should"는 필수 아님 |

```csharp
// ❌ 기술적, 구현 노출
public void CalculatorService_Sum_ReturnsCorrectValue()

// ✅ 비기술적, 동작 중심
public void Sum_of_two_numbers_returns_their_total()
```

### 테스트 클래스 명명

```csharp
// 도메인 개념 기반
public class DeliveryTests { }
public class CustomerTests { }
public class DiscountCalculationTests { }

// 기능 기반 (권장)
public class PurchaseTests { }
public class UserRegistrationTests { }
public class OrderProcessingTests { }
```

## 3.5 파라미터화 테스트

중복 테스트를 하나로 통합:

### 일반적인 중복

```csharp
// ❌ 중복 코드
[Test]
public void Delivery_with_past_date_is_invalid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(-1) };
    Assert.That(delivery.IsValid, Is.False);
}

[Test]
public void Delivery_with_today_is_invalid()
{
    var delivery = new Delivery { Date = DateTime.Now };
    Assert.That(delivery.IsValid, Is.False);
}

[Test]
public void Delivery_with_tomorrow_is_valid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(1) };
    Assert.That(delivery.IsValid, Is.True);
}
```

### 파라미터화로 통합

```csharp
// ✅ NUnit [TestCase]
[TestCase(-1, false)]
[TestCase(0, false)]
[TestCase(1, true)]
[TestCase(2, true)]
public void Delivery_date_validation(int daysFromNow, bool expected)
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(daysFromNow) };

    Assert.That(delivery.IsValid, Is.EqualTo(expected));
}

// ✅ xUnit [Theory]
[Theory]
[InlineData(-1, false)]
[InlineData(0, false)]
[InlineData(1, true)]
public void Delivery_date_validation(int daysFromNow, bool expected)
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(daysFromNow) };

    Assert.Equal(expected, delivery.IsValid);
}
```

### 복잡한 데이터

```csharp
// TestCaseSource 사용
public static IEnumerable<TestCaseData> DeliveryTestCases
{
    get
    {
        yield return new TestCaseData(
            new Delivery { Date = DateTime.Now.AddDays(-1), Quantity = 5 },
            false
        ).SetName("Past_date_is_invalid");

        yield return new TestCaseData(
            new Delivery { Date = DateTime.Now.AddDays(1), Quantity = 0 },
            false
        ).SetName("Zero_quantity_is_invalid");

        yield return new TestCaseData(
            new Delivery { Date = DateTime.Now.AddDays(1), Quantity = 5 },
            true
        ).SetName("Valid_delivery");
    }
}

[TestCaseSource(nameof(DeliveryTestCases))]
public void Delivery_validation(Delivery delivery, bool expected)
{
    Assert.That(delivery.IsValid, Is.EqualTo(expected));
}
```

### 파라미터화 주의사항

| 상황 | 권장 |
|------|------|
| 동일 동작, 다른 입력 | 파라미터화 |
| 다른 동작 | 별도 테스트 |
| 음성 케이스 | 명시적으로 분리 고려 |

```csharp
// ✅ 양성 케이스 파라미터화
[TestCase(1)]
[TestCase(5)]
[TestCase(100)]
public void Valid_quantity_is_accepted(int quantity)
{
    var order = new Order { Quantity = quantity };
    Assert.That(order.IsValid, Is.True);
}

// ✅ 음성 케이스 별도 테스트 (더 명확)
[Test]
public void Zero_quantity_is_rejected()
{
    var order = new Order { Quantity = 0 };
    Assert.That(order.IsValid, Is.False);
}

[Test]
public void Negative_quantity_is_rejected()
{
    var order = new Order { Quantity = -1 };
    Assert.That(order.IsValid, Is.False);
}
```

## 3.6 테스트 헬퍼와 빌더

### 팩토리 메서드

```csharp
public class CustomerTests
{
    [Test]
    public void Premium_customer_gets_20_percent_discount()
    {
        var customer = CreatePremiumCustomer();
        var product = CreateProduct(price: 100);

        var discount = customer.CalculateDiscount(product);

        Assert.That(discount, Is.EqualTo(20));
    }

    // 헬퍼 메서드
    private Customer CreatePremiumCustomer()
    {
        return new Customer
        {
            IsPremium = true,
            Email = "test@example.com",
            Name = "Test Customer"
        };
    }

    private Product CreateProduct(decimal price)
    {
        return new Product
        {
            Name = "Test Product",
            Price = price
        };
    }
}
```

### 빌더 패턴

```csharp
public class CustomerBuilder
{
    private bool _isPremium;
    private string _email = "test@example.com";
    private string _name = "Test Customer";

    public CustomerBuilder WithPremiumStatus()
    {
        _isPremium = true;
        return this;
    }

    public CustomerBuilder WithEmail(string email)
    {
        _email = email;
        return this;
    }

    public Customer Build()
    {
        return new Customer
        {
            IsPremium = _isPremium,
            Email = _email,
            Name = _name
        };
    }
}

// 사용
[Test]
public void Premium_customer_gets_discount()
{
    var customer = new CustomerBuilder()
        .WithPremiumStatus()
        .Build();

    Assert.That(customer.DiscountRate, Is.EqualTo(0.2m));
}
```

### Object Mother 패턴

```csharp
public static class TestCustomers
{
    public static Customer Premium() =>
        new Customer { IsPremium = true, Email = "premium@test.com" };

    public static Customer Regular() =>
        new Customer { IsPremium = false, Email = "regular@test.com" };

    public static Customer WithDiscount(decimal rate) =>
        new Customer { DiscountRate = rate };
}

// 사용
[Test]
public void Premium_customer_gets_discount()
{
    var customer = TestCustomers.Premium();

    Assert.That(customer.DiscountRate, Is.EqualTo(0.2m));
}
```

## 3.7 Assert 가이드라인

### 하나의 논리적 Assert

```csharp
// ✅ 여러 Assert지만 하나의 논리적 검증
[Test]
public void Purchase_creates_correct_result()
{
    var result = customer.Purchase(store, Product.Shampoo, 5);

    // 모두 "구매 결과"라는 하나의 개념 검증
    Assert.That(result.Success, Is.True);
    Assert.That(result.Product, Is.EqualTo(Product.Shampoo));
    Assert.That(result.Quantity, Is.EqualTo(5));
}
```

### Assert 메시지

```csharp
// 좋은 메시지 사용
Assert.That(result.IsValid, Is.True,
    "Delivery should be valid when date is in the future");

// 또는 더 나은 테스트명 사용
[Test]
public void Delivery_with_future_date_is_valid()  // 이름으로 충분
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(1) };
    Assert.That(delivery.IsValid, Is.True);
}
```

### 커스텀 Assert

```csharp
public static class CustomAssert
{
    public static void IsValidDelivery(Delivery delivery)
    {
        Assert.Multiple(() =>
        {
            Assert.That(delivery.Date, Is.GreaterThan(DateTime.Now));
            Assert.That(delivery.Quantity, Is.GreaterThan(0));
            Assert.That(delivery.Address, Is.Not.Null);
        });
    }
}

// 사용
[Test]
public void CreateDelivery_returns_valid_delivery()
{
    var delivery = service.CreateDelivery(request);

    CustomAssert.IsValidDelivery(delivery);
}
```

## 정리

| 개념 | 핵심 |
|------|------|
| **AAA 패턴** | Arrange-Act-Assert, 빈 줄 구분 |
| **Act** | 단일 동작, 한 줄 |
| **명명** | 동작 중심, 비기술적 |
| **파라미터화** | 동일 동작, 다른 입력 |
| **헬퍼** | 팩토리, 빌더, Object Mother |

**핵심 질문:**
> 이 테스트명만 보고 테스트가 무엇을 검증하는지 알 수 있는가?

## 다음 장 예고

다음 장에서는 좋은 테스트의 4가지 기둥을 자세히 살펴본다. 회귀 보호, 리팩토링 내성, 빠른 피드백, 유지보수성의 균형을 다룬다.
