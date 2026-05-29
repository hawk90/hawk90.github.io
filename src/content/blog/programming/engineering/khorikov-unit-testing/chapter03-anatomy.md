---
title: "Ch 3: The Anatomy of a Unit Test"
date: 2026-05-10T03:00:00
description: "Arrange-Act-Assert 패턴, 테스트 명명, 파라미터화 테스트, 빌더와 Object Mother."
tags: [TDD, AAA, Naming]
series: "Khorikov Unit Testing"
seriesOrder: 3
draft: true

---

좋은 단위 테스트는 일정한 구조를 따른다. 이 장에서는 테스트의 해부학적 구조와 명명 규칙, 그리고 중복을 줄이는 헬퍼 패턴을 살펴본다.

## 3.1 AAA 패턴

모든 단위 테스트는 세 단계로 구성된다.

| 단계 | 영어 | 목적 |
|------|------|------|
| 준비 | Arrange | 테스트 환경을 구성한다 |
| 실행 | Act | SUT의 동작을 실행한다 |
| 검증 | Assert | 결과를 확인한다 |

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

### AAA와 Given-When-Then

BDD 진영에서는 같은 구조를 Given-When-Then으로 부른다. 두 표현은 사실상 같다.

| AAA | Given-When-Then | BDD 관점 |
|-----|------------------|----------|
| Arrange | Given | 사전 조건 |
| Act | When | 동작 |
| Assert | Then | 예상 결과 |

```csharp
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

Arrange 섹션은 셋업이 복잡하면 자연스럽게 길어진다. 보통은 다음 비율이 일반적이다.

- Arrange: 전체의 50~80%
- Act: 1~2줄
- Assert: 1~5줄

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
        Date = DateTime.Now.AddDays(-1)
    };

    // Act — 간결해야 한다
    var result = customer.CanAcceptDelivery(delivery, store);

    // Assert — 간결해야 한다
    Assert.That(result, Is.False);
}
```

### Act는 한 줄이어야 한다

Act가 여러 줄이라는 것은 SUT의 API가 잘못 설계되었거나 캡슐화가 부족하다는 신호다.

```csharp
// 회피 — Act가 여러 줄이다
[Test]
public void Purchase_with_discount()
{
    var customer = new Customer();
    var store = new Store();

    // Act가 둘로 쪼개졌다
    customer.AddDiscount(0.1m);
    var result = customer.Purchase(store, Product.Shampoo, 5);

    Assert.That(result.TotalPrice, Is.EqualTo(45m));
}

// Good — Act가 한 줄이다
[Test]
public void Purchase_with_discount()
{
    // Arrange
    var customer = new Customer();
    customer.AddDiscount(0.1m);  // Arrange에서 설정한다
    var store = new Store();
    store.AddInventory(Product.Shampoo, 10);

    // Act — 단일 동작
    var result = customer.Purchase(store, Product.Shampoo, 5);

    // Assert
    Assert.That(result.TotalPrice, Is.EqualTo(45m));
}
```

### Assert는 하나의 동작에 대한 여러 측면

Assert가 여러 개여도 같은 동작의 다른 측면을 검증한다면 문제가 없다. 다만 너무 많은 Assert는 테스트가 여러 동작을 검증한다는 신호다.

```csharp
// 허용 — 같은 동작의 여러 측면이다
[Test]
public void Purchase_succeeds()
{
    var customer = new Customer();
    var store = new Store();
    store.AddInventory(Product.Shampoo, 10);

    var result = customer.Purchase(store, Product.Shampoo, 5);

    Assert.That(result.Success, Is.True);
    Assert.That(result.Product, Is.EqualTo(Product.Shampoo));
    Assert.That(result.Quantity, Is.EqualTo(5));
    Assert.That(store.GetInventory(Product.Shampoo), Is.EqualTo(5));
}
```

## 3.3 빈 줄로 구분한다

주석 없이 빈 줄만으로도 AAA 구분이 가능해야 한다.

```csharp
// Good — 가독성이 좋다
[Test]
public void Delivery_with_past_date_is_invalid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(-1) };

    bool isValid = delivery.Validate();

    Assert.That(isValid, Is.False);
}

// 회피 — 세 단계가 한 덩어리로 보인다
[Test]
public void Delivery_with_past_date_is_invalid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(-1) };
    bool isValid = delivery.Validate();
    Assert.That(isValid, Is.False);
}
```

## 3.4 테스트 명명

### 나쁜 명명 패턴

```csharp
// 회피 — 구현 세부사항을 노출한다
public void Test_Sum()
public void Calculator_Sum_Method()

// 회피 — 너무 모호하다
public void Test1()
public void It_works()

// 회피 — 언더스코어를 남용한다
public void Sum_Should_Return_Sum_Of_Two_Numbers_When_Given_Valid_Input()
```

### 좋은 명명 패턴

```csharp
// 패턴 1: 자연어 스타일
public void Sum_of_two_numbers()
public void Delivery_with_past_date_is_invalid()
public void Premium_customer_gets_discount()

// 패턴 2: 조건을 명시한다
public void Delivery_with_past_date_should_be_invalid()
public void Purchase_fails_when_not_enough_inventory()
public void User_cannot_change_email_when_unconfirmed()
```

### 명명 가이드라인

| 원칙 | 설명 |
|------|------|
| 비기술적 | 비개발자도 의미를 파악할 수 있다 |
| 동작 중심 | "무엇을 한다"가 아니라 "어떤 일이 일어난다" |
| 구현 제외 | 메서드명이나 클래스명을 넣지 않는다 |
| Should는 선택 | "should"는 필수가 아니다 |

```csharp
// 회피 — 기술적이고 구현이 노출된다
public void CalculatorService_Sum_ReturnsCorrectValue()

// Good — 비기술적이고 동작 중심이다
public void Sum_of_two_numbers_returns_their_total()
```

### 테스트 클래스 명명

기능 단위로 묶으면 도메인의 어휘가 살아난다.

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

중복된 테스트를 하나로 통합할 때 유용하다.

### 일반적인 중복

```csharp
// 회피 — 거의 같은 테스트가 셋이다
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

NUnit이라면 `[TestCase]`, xUnit이라면 `[Theory]`/`[InlineData]`를 쓴다.

```csharp
// NUnit [TestCase]
[TestCase(-1, false)]
[TestCase(0, false)]
[TestCase(1, true)]
[TestCase(2, true)]
public void Delivery_date_validation(int daysFromNow, bool expected)
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(daysFromNow) };

    Assert.That(delivery.IsValid, Is.EqualTo(expected));
}

// xUnit [Theory]
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

객체나 컬렉션을 넘겨야 한다면 `TestCaseSource` 같은 메커니즘이 깔끔하다.

```csharp
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
| 동일 동작, 다른 입력 | 파라미터화한다 |
| 다른 동작 | 별도 테스트로 분리한다 |
| 음성 케이스 | 명시적으로 분리하는 편이 자주 더 명확하다 |

```csharp
// Good — 양성 케이스는 파라미터화한다
[TestCase(1)]
[TestCase(5)]
[TestCase(100)]
public void Valid_quantity_is_accepted(int quantity)
{
    var order = new Order { Quantity = quantity };
    Assert.That(order.IsValid, Is.True);
}

// Good — 음성 케이스는 별도로 두는 편이 명확하다
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

작은 테스트 클래스 안에서 반복되는 객체 생성은 팩토리 메서드로 묶는다.

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

설정 항목이 늘어나면 fluent 빌더가 유지보수에 유리하다.

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

테스트 케이스 전반에서 자주 등장하는 정해진 형태의 객체는 Object Mother로 만든다.

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

[Test]
public void Premium_customer_gets_discount()
{
    var customer = TestCustomers.Premium();

    Assert.That(customer.DiscountRate, Is.EqualTo(0.2m));
}
```

빌더는 변형이 많은 경우에, Object Mother는 변형이 적고 의미가 분명한 경우에 어울린다.

## 3.7 Assert 가이드라인

### 하나의 논리적 Assert

여러 줄의 Assert가 하나의 개념을 검증하면 충분히 받아들일 만하다.

```csharp
// Good — 여러 Assert지만 "구매 결과"라는 하나의 개념을 검증한다
[Test]
public void Purchase_creates_correct_result()
{
    var result = customer.Purchase(store, Product.Shampoo, 5);

    Assert.That(result.Success, Is.True);
    Assert.That(result.Product, Is.EqualTo(Product.Shampoo));
    Assert.That(result.Quantity, Is.EqualTo(5));
}
```

### Assert 메시지

메시지를 다는 것보다 테스트명이 분명한 편이 낫다.

```csharp
// 좋은 메시지를 사용한다
Assert.That(result.IsValid, Is.True,
    "Delivery should be valid when date is in the future");

// 더 나은 방법은 테스트명에 의도를 담는 것이다
[Test]
public void Delivery_with_future_date_is_valid()
{
    var delivery = new Delivery { Date = DateTime.Now.AddDays(1) };
    Assert.That(delivery.IsValid, Is.True);
}
```

### 커스텀 Assert

도메인적으로 의미 있는 검증을 묶어 두면 의도가 또렷해진다.

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

[Test]
public void CreateDelivery_returns_valid_delivery()
{
    var delivery = service.CreateDelivery(request);

    CustomAssert.IsValidDelivery(delivery);
}
```

## 자주 보는 함정

- **Arrange를 [SetUp]으로 몰아넣기**: 모든 테스트가 같은 셋업을 공유하면 테스트만의 사전 조건이 흐려진다.
- **Act가 두 줄**: 단일 동작이 아닐 가능성이 크다. SUT의 API를 다시 본다.
- **메서드 이름이 테스트 이름**: 동작이 아니라 메서드를 단위로 본다는 신호다.
- **음성과 양성을 같은 파라미터화에 섞기**: 실패 케이스의 의미가 묻혀서 디버깅이 어려워진다.
- **빌더와 Object Mother를 동시에 남용**: 한 테스트에 둘이 섞이면 어디서 무엇이 만들어지는지 추적이 어렵다.

## 정리

- AAA 패턴은 Arrange-Act-Assert로 테스트의 골격을 잡는다.
- Act는 한 줄이 원칙이며, 여러 줄이면 SUT 설계를 다시 본다.
- 테스트명은 동작 중심으로 비기술적인 자연어 문장에 가깝게 짓는다.
- 동일한 동작에 입력만 다른 경우 파라미터화로 중복을 제거한다.
- 빌더와 Object Mother는 테스트 데이터를 깔끔하게 정돈한다.
- 여러 Assert는 같은 동작의 여러 측면을 검증할 때에 한해 허용한다.

핵심 질문은 다음과 같다.

> 이 테스트명만 보고 테스트가 무엇을 검증하는지 알 수 있는가?

## 다음 장 예고

다음 장에서는 좋은 테스트의 4가지 기둥을 자세히 살펴본다. 회귀 보호, 리팩토링 내성, 빠른 피드백, 유지보수성 사이의 균형을 다룬다.

## 관련 항목

- [Ch 2: What Is a Unit Test?](/blog/programming/engineering/khorikov-unit-testing/chapter02-what-is-unit-test)
- [Ch 4: The Four Pillars of a Good Unit Test](/blog/programming/engineering/khorikov-unit-testing/chapter04-four-pillars)
- [TDD by Example](/blog/programming/engineering/tdd-by-example/) — Kent Beck의 TDD 입문서
- [TDD Patterns](/blog/programming/engineering/tdd-patterns/) — 테스트 데이터, 픽스처, 단언 패턴
- [Refactoring Catalog](/blog/programming/design/refactoring-catalog/) — Extract Function 등 리팩토링 어휘
