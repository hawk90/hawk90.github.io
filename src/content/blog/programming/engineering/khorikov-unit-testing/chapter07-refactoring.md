---
title: "Ch 7: Refactoring Toward Valuable Unit Tests"
date: 2025-10-17T01:00:00
description: "코드 4 분류 — Domain / Trivial / Controllers / Overcomplicated. 리팩토링 방향."
tags: [TDD, Refactoring, Code Categories]
series: "Khorikov Unit Testing"
seriesOrder: 7
---

모든 코드에 동일한 테스트 전략을 적용할 수는 없다. 코드를 분류하고 각 유형에 맞는 테스트 전략을 세워야 한다.

## 7.1 코드의 4가지 유형

코드를 두 가지 축으로 분류한다:

| 축 | 설명 |
|---|------|
| **복잡도** | 비즈니스 로직의 복잡함 |
| **협력자 수** | 의존하는 외부 컴포넌트 수 |

```
복잡도
  높음 │   Overcomplicated    │   Domain Model
       │   (분리 필요)         │   (단위 테스트)
       │                      │
  ─────┼──────────────────────┼──────────────────
       │                      │
  낮음 │   Controllers        │   Trivial
       │   (통합 테스트)       │   (테스트 불필요)
       │                      │
       └──────────────────────┴────────────────── 협력자 수
                낮음                    높음
```

## 7.2 네 가지 사분면

### 1. Domain Model / Algorithms

| 특징 | 설명 |
|------|------|
| **복잡도** | 높음 |
| **협력자** | 적음 |
| **테스트** | 단위 테스트 (Output/State) |
| **가치** | 매우 높음 |

```csharp
// Domain Model — 복잡한 로직, 적은 의존
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

        discount = Math.Min(discount, 0.2m);  // 최대 20%

        return basePrice * (1 - discount);
    }
}

// 단위 테스트로 충분
[Test]
public void Premium_customer_with_large_order_gets_max_discount()
{
    var calculator = new PriceCalculator();
    var order = CreateOrder(total: 2000);
    var customer = CreatePremiumCustomer();

    var price = calculator.Calculate(order, customer);

    Assert.That(price, Is.EqualTo(1600m));  // 20% 할인
}
```

### 2. Trivial Code

| 특징 | 설명 |
|------|------|
| **복잡도** | 낮음 |
| **협력자** | 적음 |
| **테스트** | 불필요 |
| **가치** | 없음 |

```csharp
// Trivial — 단순 getter/setter
public class User
{
    public string Name { get; set; }
    public string Email { get; set; }
}

// ❌ 가치 없는 테스트
[Test]
public void Name_can_be_set()
{
    var user = new User();
    user.Name = "John";
    Assert.That(user.Name, Is.EqualTo("John"));
}
```

### 3. Controllers

| 특징 | 설명 |
|------|------|
| **복잡도** | 낮음 |
| **협력자** | 많음 |
| **테스트** | 통합 테스트 |
| **가치** | 중간 |

```csharp
// Controller — 단순 조정, 많은 협력자
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

// 통합 테스트 — 협력자 간 연동 검증
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

### 4. Overcomplicated Code

| 특징 | 설명 |
|------|------|
| **복잡도** | 높음 |
| **협력자** | 많음 |
| **테스트** | 어려움 (분리 필요) |
| **가치** | - |

```csharp
// ❌ Overcomplicated — 복잡한 로직 + 많은 협력자
public class OrderService
{
    private readonly IOrderRepository _orders;
    private readonly IInventoryService _inventory;
    private readonly IPaymentGateway _payment;
    private readonly IEmailService _email;
    private readonly ILogger _logger;

    public async Task<OrderResult> CreateOrder(CreateOrderRequest request)
    {
        // 복잡한 비즈니스 로직
        var discount = CalculateDiscount(request.Customer, request.Items);
        var total = request.Items.Sum(i => i.Price * i.Quantity) * (1 - discount);

        if (total > request.Customer.CreditLimit)
        {
            // 더 복잡한 로직...
            if (request.Customer.IsPremium && request.Customer.YearsActive > 5)
            {
                total = ApplySpecialTerms(total, request.Customer);
            }
            else
            {
                return OrderResult.CreditLimitExceeded();
            }
        }

        // 많은 협력자 호출
        var inventoryCheck = await _inventory.CheckStock(request.Items);
        // ... 더 많은 협력자 호출 ...
    }
}
```

## 7.3 Overcomplicated 코드 분리

### Humble Object 패턴

복잡한 로직을 테스트 가능한 객체로 추출:

```
Before:
┌─────────────────────────────────────────┐
│           Overcomplicated               │
│                                         │
│   복잡한 로직 + 많은 협력자              │
│                                         │
└─────────────────────────────────────────┘

After:
┌─────────────────────────────────────────┐
│           Controller (Humble)           │
│                                         │
│   단순한 조정만 (협력자 많음)            │
│                                         │
│       ┌─────────────────────┐          │
│       │    Domain Model     │          │
│       │                     │          │
│       │  복잡한 로직 (순수)  │          │
│       └─────────────────────┘          │
│                                         │
└─────────────────────────────────────────┘
```

### 리팩토링 예시

**Before:**

```csharp
public class OrderService
{
    public async Task<OrderResult> CreateOrder(CreateOrderRequest request)
    {
        // 복잡한 할인 계산 (도메인 로직)
        decimal discount = 0;
        if (request.Customer.IsPremium)
            discount += 0.1m;
        if (request.Items.Sum(i => i.Price * i.Quantity) > 1000)
            discount += 0.05m;
        if (request.Customer.YearsActive > 5)
            discount += 0.03m;
        discount = Math.Min(discount, 0.2m);

        var total = request.Items.Sum(i => i.Price * i.Quantity) * (1 - discount);

        // 협력자 호출
        await _inventory.Reserve(request.Items);
        await _payment.Charge(total);
        await _email.SendConfirmation(request.Customer.Email);

        return OrderResult.Success();
    }
}
```

**After:**

```csharp
// Domain Model — 복잡한 로직 추출
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

// Controller (Humble) — 단순 조정
public class OrderService
{
    private readonly DiscountCalculator _discountCalculator;
    // ... 협력자들 ...

    public async Task<OrderResult> CreateOrder(CreateOrderRequest request)
    {
        // 도메인 모델 호출
        var discount = _discountCalculator.Calculate(request.Customer, request.Items);
        var total = request.Items.Sum(i => i.Price * i.Quantity) * (1 - discount);

        // 협력자 호출만
        await _inventory.Reserve(request.Items);
        await _payment.Charge(total);
        await _email.SendConfirmation(request.Customer.Email);

        return OrderResult.Success();
    }
}

// 단위 테스트 가능!
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
| **Domain** | 단위 테스트 (많이) | 높음 |
| **Trivial** | 테스트 안 함 | 0% |
| **Controller** | 통합 테스트 (소수) | 낮음 |
| **Overcomplicated** | 분리 후 각각 테스트 | - |

### 테스트 비율

```
좋은 테스트 스위트:

Domain Model 테스트     ████████████████████████████  70%
Controller 통합 테스트  ████████                      20%
E2E 테스트              ████                          10%
Trivial 테스트          (없음)                         0%
```

## 7.5 실제 리팩토링 사례

### User Email 변경 시나리오

**요구사항:**
1. 이메일 변경 시 유효성 검증
2. 회사 도메인이면 직원으로 분류
3. 직원 수 변경 시 회사 정보 업데이트
4. 이메일 알림 발송

**Before (Overcomplicated):**

```csharp
public class UserController
{
    public async Task<string> ChangeEmail(int userId, string newEmail)
    {
        var user = await _userRepo.GetById(userId);
        if (user == null)
            return "User not found";

        // 복잡한 비즈니스 로직
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

        // 협력자 호출
        await _userRepo.Save(user);
        await _companyRepo.Save(company);
        await _email.SendEmailChangedNotification(userId, newEmail);

        return "OK";
    }
}
```

**After (분리됨):**

```csharp
// Domain Model — 순수한 비즈니스 로직
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

// 단위 테스트
[Test]
public void Changing_from_employee_to_customer_decreases_employee_count()
{
    var user = new User(email: "user@company.com", type: UserType.Employee);
    var company = new Company { Domain = "company.com" };

    var result = user.ChangeEmail("user@gmail.com", company);

    Assert.That(result.EmployeeDelta, Is.EqualTo(-1));
    Assert.That(result.NewType, Is.EqualTo(UserType.Customer));
}


// Controller (Humble) — 조정만
public class UserController
{
    public async Task<string> ChangeEmail(int userId, string newEmail)
    {
        var user = await _userRepo.GetById(userId);
        if (user == null)
            return "User not found";

        var company = await _companyRepo.GetById(user.CompanyId);

        // 도메인 로직 호출
        var result = user.ChangeEmail(newEmail, company);

        if (result.IsNoChange)
            return "OK";

        // 결과 적용
        company.ChangeEmployeeCount(result.EmployeeDelta);

        await _userRepo.Save(user);
        await _companyRepo.Save(company);
        await _email.SendEmailChangedNotification(userId, newEmail);

        return "OK";
    }
}
```

## 7.6 리팩토링 가이드라인

### 도메인 모델 추출 기준

| 추출 대상 | 예시 |
|-----------|------|
| 계산 로직 | 가격, 할인, 세금 |
| 검증 로직 | 유효성 검사 |
| 상태 전이 | 주문 상태 변경 |
| 규칙 적용 | 비즈니스 규칙 |

### 추출하지 않을 것

| 유지할 곳 | 예시 |
|-----------|------|
| DB 호출 | Repository 패턴 |
| 외부 API | Gateway 패턴 |
| 파일 I/O | Infrastructure |

## 정리

| 개념 | 핵심 |
|------|------|
| **4사분면** | 복잡도 × 협력자 수 |
| **Domain** | 단위 테스트 집중 |
| **Trivial** | 테스트 불필요 |
| **Controller** | 통합 테스트 |
| **Overcomplicated** | 분리 필요 |

**핵심 질문:**
> 이 코드는 어느 사분면에 있는가? Overcomplicated라면 어떻게 분리할 수 있는가?

## 다음 장 예고

다음 장에서는 통합 테스트의 필요성을 다룬다. 단위 테스트만으로 부족한 이유, 통합 테스트의 역할을 살펴본다.
