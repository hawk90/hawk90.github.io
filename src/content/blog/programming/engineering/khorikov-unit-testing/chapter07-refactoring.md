---
title: "Ch 7: Refactoring Toward Valuable Unit Tests"
date: 2026-05-10T07:00:00
description: "코드를 Domain, Trivial, Controller, Overcomplicated의 4사분면으로 나누고 각각의 테스트 전략을 잡는다."
tags: [TDD, Refactoring, Code Categories]
series: "Khorikov Unit Testing"
seriesOrder: 7
---

모든 코드에 같은 테스트 전략을 적용할 수는 없다. 코드를 분류하고 각 유형에 맞는 전략을 세워야 한다.

## 7.1 코드의 4가지 유형

코드를 두 축으로 분류한다.

| 축 | 설명 |
|---|------|
| 복잡도 | 비즈니스 로직의 복잡함 |
| 협력자 수 | 의존하는 외부 컴포넌트 수 |

![Code 4-Quadrant](/images/blog/khorikov/diagrams/ch07-code-quadrant.svg)

네 사분면은 다음 표처럼 정리된다.

| 사분면 | 복잡도 | 협력자 | 테스트 전략 |
|--------|--------|--------|--------------|
| Domain Model / Algorithms | 높음 | 적음 | 단위 테스트(Output/State) |
| Trivial Code | 낮음 | 적음 | 테스트하지 않는다 |
| Controllers | 낮음 | 많음 | 통합 테스트 |
| Overcomplicated | 높음 | 많음 | 분리 후 각각 테스트 |

## 7.2 네 가지 사분면

### 1. Domain Model / Algorithms

```csharp
public class PriceCalculator
{
    public decimal Calculate(Order order, Customer customer)
    {
        decimal basePrice = order.Items.Sum(i => i.Price * i.Quantity);

        decimal discount = 0;
        if (customer.IsPremium)
            discount += 0.1m;

        if (order.Total > 1000)
            discount += 0.05m;

        discount = Math.Min(discount, 0.2m);

        return basePrice * (1 - discount);
    }
}

[Test]
public void Premium_customer_with_large_order_gets_max_discount()
{
    var calculator = new PriceCalculator();
    var order = CreateOrder(total: 2000);
    var customer = CreatePremiumCustomer();

    var price = calculator.Calculate(order, customer);

    Assert.That(price, Is.EqualTo(1600m));
}
```

복잡한 결정이 모여 있고 외부 의존은 거의 없다. 단위 테스트의 가치가 가장 높은 영역이다.

### 2. Trivial Code

```csharp
public class User
{
    public string Name { get; set; }
    public string Email { get; set; }
}

// 회피 — 가치가 없는 테스트
[Test]
public void Name_can_be_set()
{
    var user = new User();
    user.Name = "John";
    Assert.That(user.Name, Is.EqualTo("John"));
}
```

setter나 단순 데이터 객체는 회귀 보호 가치가 0에 가깝다. 테스트하지 않는다.

### 3. Controllers

```csharp
public class OrderController
{
    private readonly IOrderRepository _orders;
    private readonly IPaymentGateway _payment;
    private readonly IEmailService _email;

    public async Task<OrderResult> ProcessOrder(OrderRequest request)
    {
        var order = await _orders.GetById(request.OrderId);

        var paymentResult = await _payment.Charge(order.Total);

        if (!paymentResult.Success)
            return OrderResult.Failed(paymentResult.Error);

        order.MarkAsPaid();
        await _orders.Save(order);

        await _email.SendConfirmation(order.CustomerEmail);

        return OrderResult.Success(order);
    }
}

[Test]
public async Task ProcessOrder_with_valid_payment_completes()
{
    // 실제 DB, Mock 결제, Mock 이메일
    var orders = new SqlOrderRepository(TestDb.Connection);
    var payment = new FakePaymentGateway();
    var email = new Mock<IEmailService>();

    var controller = new OrderController(orders, payment.Object, email.Object);

    var result = await controller.ProcessOrder(new OrderRequest { OrderId = 1 });

    Assert.That(result.Success, Is.True);
}
```

협력자가 많고 자체 로직은 단순한 조정 계층이다. 통합 테스트가 적합하다.

### 4. Overcomplicated Code

```csharp
// 회피 — 복잡한 로직과 많은 협력자가 한 메서드에 섞여 있다
public class OrderService
{
    private readonly IOrderRepository _orders;
    private readonly IInventoryService _inventory;
    private readonly IPaymentGateway _payment;
    private readonly IEmailService _email;
    private readonly ILogger _logger;

    public async Task<OrderResult> CreateOrder(CreateOrderRequest request)
    {
        var discount = CalculateDiscount(request.Customer, request.Items);
        var total = request.Items.Sum(i => i.Price * i.Quantity) * (1 - discount);

        if (total > request.Customer.CreditLimit)
        {
            if (request.Customer.IsPremium && request.Customer.YearsActive > 5)
            {
                total = ApplySpecialTerms(total, request.Customer);
            }
            else
            {
                return OrderResult.CreditLimitExceeded();
            }
        }

        var inventoryCheck = await _inventory.CheckStock(request.Items);
        // 더 많은 협력자 호출이 이어진다
    }
}
```

Overcomplicated 코드는 그대로는 테스트하기 어렵다. 단위 테스트로 가자니 협력자가 많고, 통합 테스트로 가자니 로직이 복잡해 케이스가 폭발한다. 분리가 답이다.

## 7.3 Overcomplicated 코드 분리

### Humble Object 패턴

복잡한 로직을 별도 객체로 추출하고, 원래 자리에는 단순한 조정만 남긴다. Michael Feathers의 *Working Effectively with Legacy Code*에서 같은 패턴이 자세히 다뤄진다.

| 영역 | 역할 | 테스트 방식 |
|------|------|--------------|
| Controller (Humble) | 조정만 한다 | 통합 테스트 |
| Domain Model | 결정과 계산을 담는다 | 단위 테스트 |

### 리팩토링 예시

원래는 도메인 결정과 협력자 호출이 한 메서드에 섞여 있다.

```csharp
public class OrderService
{
    public async Task<OrderResult> CreateOrder(CreateOrderRequest request)
    {
        // 복잡한 할인 계산이 메서드 안에 있다
        decimal discount = 0;
        if (request.Customer.IsPremium)
            discount += 0.1m;
        if (request.Items.Sum(i => i.Price * i.Quantity) > 1000)
            discount += 0.05m;
        if (request.Customer.YearsActive > 5)
            discount += 0.03m;
        discount = Math.Min(discount, 0.2m);

        var total = request.Items.Sum(i => i.Price * i.Quantity) * (1 - discount);

        await _inventory.Reserve(request.Items);
        await _payment.Charge(total);
        await _email.SendConfirmation(request.Customer.Email);

        return OrderResult.Success();
    }
}
```

결정 부분을 도메인 모델로 떼어내고, 컨트롤러는 호출과 결과 적용만 담당한다.

```csharp
// Domain Model — 복잡한 결정을 담는다
public class DiscountCalculator
{
    public decimal Calculate(Customer customer, IEnumerable<OrderItem> items)
    {
        decimal discount = 0;

        if (customer.IsPremium)
            discount += 0.1m;

        if (items.Sum(i => i.Price * i.Quantity) > 1000)
            discount += 0.05m;

        if (customer.YearsActive > 5)
            discount += 0.03m;

        return Math.Min(discount, 0.2m);
    }
}

// Controller — 단순 조정만 한다
public class OrderService
{
    private readonly DiscountCalculator _discountCalculator;
    // 협력자들이 이어진다

    public async Task<OrderResult> CreateOrder(CreateOrderRequest request)
    {
        var discount = _discountCalculator.Calculate(request.Customer, request.Items);
        var total = request.Items.Sum(i => i.Price * i.Quantity) * (1 - discount);

        await _inventory.Reserve(request.Items);
        await _payment.Charge(total);
        await _email.SendConfirmation(request.Customer.Email);

        return OrderResult.Success();
    }
}

[Test]
public void Premium_customer_with_5_years_gets_13_percent_discount()
{
    var calculator = new DiscountCalculator();
    var customer = new Customer { IsPremium = true, YearsActive = 5 };
    var items = new[] { new OrderItem { Price = 100, Quantity = 1 } };

    var discount = calculator.Calculate(customer, items);

    Assert.That(discount, Is.EqualTo(0.13m));
}
```

## 7.4 테스트 전략 매핑

| 사분면 | 테스트 전략 | 비율 |
|--------|-------------|------|
| Domain | 단위 테스트 (많이) | 높음 |
| Trivial | 테스트하지 않는다 | 0% |
| Controller | 통합 테스트 (소수) | 낮음 |
| Overcomplicated | 분리 후 각각 테스트 | 의존 |

좋은 테스트 스위트의 대략적 분포는 다음과 같다.

- Domain Model 단위 테스트: 약 70%
- Controller 통합 테스트: 약 20%
- E2E 테스트: 약 10%
- Trivial 테스트: 없다

## 7.5 실제 리팩토링 사례

### User Email 변경 시나리오

요구사항은 네 가지다.

1. 이메일 변경 시 유효성 검증을 수행한다.
2. 회사 도메인이면 직원으로 분류한다.
3. 직원 수가 바뀌면 회사 정보를 업데이트한다.
4. 이메일 변경 알림을 발송한다.

### Before — Overcomplicated

도메인 결정과 협력자 호출이 한 메서드에 뒤섞여 있다.

```csharp
public class UserController
{
    public async Task<string> ChangeEmail(int userId, string newEmail)
    {
        var user = await _userRepo.GetById(userId);
        if (user == null)
            return "User not found";

        var company = await _companyRepo.GetById(user.CompanyId);

        var newEmailDomain = newEmail.Split('@')[1];
        var isEmployee = newEmailDomain == company.Domain;

        if (user.Type == UserType.Employee && !isEmployee)
        {
            company.NumberOfEmployees--;
        }
        else if (user.Type != UserType.Employee && isEmployee)
        {
            company.NumberOfEmployees++;
        }

        user.Email = newEmail;
        user.Type = isEmployee ? UserType.Employee : UserType.Customer;

        await _userRepo.Save(user);
        await _companyRepo.Save(company);
        await _email.SendEmailChangedNotification(userId, newEmail);

        return "OK";
    }
}
```

### After — 분리됨

도메인 결정은 `User`로, 협력자 호출은 컨트롤러로 분리한다.

```csharp
// Domain Model — 순수한 비즈니스 결정만 담는다
public class User
{
    public string Email { get; private set; }
    public UserType Type { get; private set; }
    public int CompanyId { get; }

    public EmailChangeResult ChangeEmail(string newEmail, Company company)
    {
        if (Email == newEmail)
            return EmailChangeResult.NoChange();

        var newEmailDomain = newEmail.Split('@')[1];
        var newType = newEmailDomain == company.Domain
            ? UserType.Employee
            : UserType.Customer;

        int employeeDelta = 0;
        if (Type == UserType.Employee && newType != UserType.Employee)
            employeeDelta = -1;
        else if (Type != UserType.Employee && newType == UserType.Employee)
            employeeDelta = 1;

        return EmailChangeResult.Changed(newEmail, newType, employeeDelta);
    }
}

[Test]
public void Changing_from_employee_to_customer_decreases_employee_count()
{
    var user = new User(email: "user@company.com", type: UserType.Employee);
    var company = new Company { Domain = "company.com" };

    var result = user.ChangeEmail("user@gmail.com", company);

    Assert.That(result.EmployeeDelta, Is.EqualTo(-1));
    Assert.That(result.NewType, Is.EqualTo(UserType.Customer));
}

// Controller — 조정만 담당한다
public class UserController
{
    public async Task<string> ChangeEmail(int userId, string newEmail)
    {
        var user = await _userRepo.GetById(userId);
        if (user == null)
            return "User not found";

        var company = await _companyRepo.GetById(user.CompanyId);

        var result = user.ChangeEmail(newEmail, company);

        if (result.IsNoChange)
            return "OK";

        company.ChangeEmployeeCount(result.EmployeeDelta);

        await _userRepo.Save(user);
        await _companyRepo.Save(company);
        await _email.SendEmailChangedNotification(userId, newEmail);

        return "OK";
    }
}
```

## 7.6 리팩토링 가이드라인

### 도메인 모델로 추출할 것

| 추출 대상 | 예시 |
|-----------|------|
| 계산 로직 | 가격, 할인, 세금 |
| 검증 로직 | 유효성 검사 |
| 상태 전이 | 주문 상태 변경 |
| 규칙 적용 | 비즈니스 규칙 |

### 도메인 모델 밖에 둘 것

| 유지할 곳 | 예시 |
|-----------|------|
| Repository | DB 호출 |
| Gateway | 외부 API 호출 |
| Infrastructure | 파일 I/O |

## 자주 보는 함정

- **Trivial 코드까지 테스트 강제**: 커버리지 숫자를 위해 의미 없는 테스트가 쌓인다.
- **Controller를 단위 테스트로 강제**: Mock 5개를 사용한 brittle 테스트가 양산된다.
- **Overcomplicated를 그대로 두고 mock으로 우회**: 잠시 통과하지만 리팩토링 시 모두 깨진다.
- **도메인 모델에 협력자 주입**: 모델이 다시 Controller화되고 사분면이 흐려진다.
- **사분면 분류를 한 번에 끝낼 수 있다고 가정**: 사분면은 코드가 자라면서 바뀐다. 정기적으로 재분류한다.

## 정리

- 코드는 복잡도와 협력자 수의 두 축으로 4사분면으로 분류한다.
- Domain Model에는 단위 테스트의 가치가 가장 높다.
- Trivial 코드는 테스트하지 않는다.
- Controller는 통합 테스트로 다룬다.
- Overcomplicated 코드는 도메인 모델과 Humble Object로 분리한 뒤 각각 테스트한다.
- 결정과 부수효과의 분리는 좋은 단위 테스트를 위한 설계 결정이기도 하다.

핵심 질문은 다음과 같다.

> 이 코드는 어느 사분면에 있는가? Overcomplicated라면 어떻게 분리할 수 있는가?

## 다음 장 예고

다음 장에서는 통합 테스트의 필요성을 다룬다. 단위 테스트만으로 부족한 이유와 통합 테스트의 역할을 살펴본다.

## 관련 항목

- [Ch 6: Styles of Unit Testing](/blog/programming/engineering/khorikov-unit-testing/chapter06-styles)
- [Ch 8: Why Integration Testing?](/blog/programming/engineering/khorikov-unit-testing/chapter08-why-integration)
- [Working Effectively with Legacy Code](/blog/programming/engineering/legacy-code/) — Humble Object와 Sprout 패턴
- [Refactoring Catalog](/blog/programming/design/refactoring-catalog/) — Extract Class, Move Function 등의 어휘
- [TDD as XP](/blog/programming/engineering/agile-lean-engineering/part2-08-tdd-as-xp) — TDD가 만드는 설계 압력
