---
title: "Ch 8: Why Integration Testing?"
date: 2025-10-17T02:00:00
description: "Integration test — managed dependencies 실제로. test pyramid 변형."
tags: [Testing, Integration]
series: "Khorikov Unit Testing"
seriesOrder: 8
---

단위 테스트만으로는 충분하지 않다. 컴포넌트 간의 연동, 외부 시스템과의 통합은 통합 테스트로 검증해야 한다.

## 8.1 단위 테스트의 한계

### 검증할 수 없는 것들

| 한계 | 설명 |
|------|------|
| **연동 문제** | 컴포넌트 간 통신 오류 |
| **설정 오류** | DI 컨테이너, 환경 설정 |
| **DB 스키마** | 실제 쿼리, 마이그레이션 |
| **외부 계약** | API 스펙 변경 |

```csharp
// 단위 테스트 — 개별 컴포넌트는 정상
[Test]
public void Repository_saves_user()
{
    var repo = new FakeUserRepository();
    var user = new User { Name = "John" };

    repo.Save(user);

    Assert.That(repo.GetById(user.Id), Is.Not.Null);
}

// 하지만 실제 DB에서...
// - 컬럼명 불일치
// - 외래 키 제약 위반
// - 트랜잭션 타임아웃
```

### 통합 문제 예시

```csharp
public class UserService
{
    private readonly IUserRepository _repo;

    public async Task<User> CreateUser(string email)
    {
        var user = new User { Email = email };
        await _repo.Save(user);  // 실제로 저장되는가?
        return user;
    }
}

// 단위 테스트 — Mock으로 검증 불가능한 것들
// - SQL 쿼리가 올바른가?
// - 인덱스가 사용되는가?
// - 트랜잭션이 제대로 커밋되는가?
// - 컬럼 매핑이 정확한가?
```

## 8.2 통합 테스트의 역할

### 통합 테스트 정의

단위 테스트의 세 가지 속성 중 하나라도 위반하면 통합 테스트:

| 속성 | 단위 테스트 | 통합 테스트 |
|------|-------------|-------------|
| 작은 코드 조각 | 단일 동작 | 여러 컴포넌트 |
| 빠른 실행 | 밀리초 | 초~분 |
| 격리 | 테스트 간 독립 | 외부 시스템 공유 가능 |

### 통합 테스트 대상

```
┌─────────────────────────────────────────────────────┐
│                    시스템                            │
│                                                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐        │
│  │ Service │ ── │  Logic  │ ── │  Repo   │        │
│  └─────────┘    └─────────┘    └────┬────┘        │
│                                      │             │
│                    단위 테스트 ───────┘             │
│                                      │             │
│                                 ┌────┴────┐       │
│                                 │   DB    │       │
│                                 └─────────┘       │
│                                      ▲             │
│                           통합 테스트 ┘             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 8.3 테스트 피라미드

### 전통적 피라미드

```
              ╱╲
             ╱  ╲
            ╱ E2E╲         적음, 느림
           ╱──────╲
          ╱        ╲
         ╱  통합    ╲      중간
        ╱────────────╲
       ╱              ╲
      ╱   단위 테스트   ╲  많음, 빠름
     ╱──────────────────╲
```

### 실제 비율

| 유형 | 비율 | 역할 |
|------|------|------|
| **E2E** | 5-10% | 핵심 비즈니스 흐름 |
| **통합** | 20-30% | 외부 시스템 연동 |
| **단위** | 60-70% | 비즈니스 로직 |

### 피라미드 변형

프로젝트 특성에 따라 비율이 달라질 수 있다:

```
CRUD 중심 앱:                    로직 중심 앱:

      ╱╲                              ╱╲
     ╱  ╲                            ╱  ╲
    ╱────╲                          ╱    ╲
   ╱      ╲                        ╱──────╲
  ╱ 통합   ╲   ← 더 많음           ╱        ╲
 ╱──────────╲                    ╱   단위   ╲  ← 더 많음
╱            ╲                  ╱────────────╲
```

## 8.4 통합 테스트 작성

### 기본 구조

```csharp
[TestFixture]
public class UserServiceIntegrationTests
{
    private SqlConnection _connection;
    private UserRepository _repo;
    private UserService _service;

    [SetUp]
    public async Task SetUp()
    {
        // 실제 DB 연결
        _connection = new SqlConnection(TestConfig.ConnectionString);
        await _connection.OpenAsync();

        // 트랜잭션 시작 (롤백용)
        _transaction = _connection.BeginTransaction();

        _repo = new UserRepository(_connection, _transaction);
        _service = new UserService(_repo);
    }

    [TearDown]
    public void TearDown()
    {
        // 롤백으로 정리
        _transaction?.Rollback();
        _connection?.Dispose();
    }

    [Test]
    public async Task CreateUser_persists_to_database()
    {
        // Act
        var user = await _service.CreateUser("test@example.com");

        // Assert — 실제 DB 조회
        var loaded = await _repo.GetById(user.Id);
        Assert.That(loaded, Is.Not.Null);
        Assert.That(loaded.Email, Is.EqualTo("test@example.com"));
    }
}
```

### Managed vs Unmanaged 의존

| 유형 | 통합 테스트에서 | 이유 |
|------|-----------------|------|
| **Managed (DB)** | 실제 사용 | 쿼리, 스키마 검증 |
| **Unmanaged (외부 API)** | Mock 사용 | 비용, 안정성 |

```csharp
[Test]
public async Task ProcessPayment_with_valid_card_succeeds()
{
    // Managed — 실제 DB
    var orderRepo = new SqlOrderRepository(TestDb.Connection);

    // Unmanaged — Mock
    var paymentGateway = new Mock<IPaymentGateway>();
    paymentGateway.Setup(p => p.Charge(It.IsAny<decimal>()))
                  .ReturnsAsync(PaymentResult.Success());

    var service = new PaymentService(orderRepo, paymentGateway.Object);

    var result = await service.ProcessPayment(orderId: 1);

    Assert.That(result.Success, Is.True);
}
```

## 8.5 통합 테스트 가이드라인

### 테스트 격리

```csharp
// 방법 1: 트랜잭션 롤백
[SetUp]
public void SetUp()
{
    _transaction = _connection.BeginTransaction();
}

[TearDown]
public void TearDown()
{
    _transaction.Rollback();
}

// 방법 2: 테스트 DB 초기화
[SetUp]
public async Task SetUp()
{
    await TestDb.Reset();  // 모든 테이블 truncate
}

// 방법 3: Docker 컨테이너
[OneTimeSetUp]
public async Task OneTimeSetUp()
{
    _container = await new MsSqlBuilder().BuildAsync();
    await _container.StartAsync();
}
```

### 테스트 데이터

```csharp
// 빌더 패턴으로 테스트 데이터 생성
public class TestDataBuilder
{
    public async Task<User> CreateUser(string email = "test@example.com")
    {
        var user = new User { Email = email };
        await _repo.Save(user);
        return user;
    }

    public async Task<Order> CreateOrderFor(User user)
    {
        var order = new Order { UserId = user.Id };
        await _orderRepo.Save(order);
        return order;
    }
}

// 사용
[Test]
public async Task User_with_orders_cannot_be_deleted()
{
    var user = await _testData.CreateUser();
    await _testData.CreateOrderFor(user);

    var result = await _service.DeleteUser(user.Id);

    Assert.That(result.Success, Is.False);
    Assert.That(result.Error, Contains.Substring("has orders"));
}
```

## 8.6 통합 테스트 vs E2E 테스트

| 측면 | 통합 테스트 | E2E 테스트 |
|------|-------------|------------|
| **범위** | 일부 컴포넌트 | 전체 시스템 |
| **속도** | 빠름~중간 | 느림 |
| **안정성** | 높음 | 낮음 (flaky) |
| **유지보수** | 중간 | 어려움 |
| **목적** | 연동 검증 | 사용자 시나리오 |

### 선택 기준

```
통합 테스트:
- DB 연동 검증
- 특정 외부 서비스 연동
- 비즈니스 로직 흐름

E2E 테스트:
- 핵심 사용자 여정
- 결제 플로우
- 회원가입 플로우
```

## 8.7 통합 테스트 수 결정

### 가이드라인

| 요소 | 영향 |
|------|------|
| **외부 의존 수** | 많을수록 더 많은 통합 테스트 |
| **비즈니스 중요도** | 핵심 기능에 집중 |
| **실패 비용** | 높을수록 더 많은 테스트 |

### Happy Path 중심

```csharp
// 핵심 Happy Path — 통합 테스트
[Test]
public async Task Complete_order_flow()
{
    var user = await _testData.CreateUser();
    var product = await _testData.CreateProduct();

    var order = await _orderService.CreateOrder(user.Id, product.Id, quantity: 2);
    var payment = await _paymentService.ProcessPayment(order.Id);
    var shipment = await _shippingService.CreateShipment(order.Id);

    Assert.That(order.Status, Is.EqualTo(OrderStatus.Completed));
    Assert.That(shipment.Status, Is.EqualTo(ShipmentStatus.Pending));
}

// Edge cases — 단위 테스트로
[Test]
public void Order_with_zero_quantity_is_invalid()
{
    var order = new Order { Quantity = 0 };
    Assert.That(order.IsValid, Is.False);
}
```

## 정리

| 개념 | 핵심 |
|------|------|
| **단위 테스트 한계** | 연동 문제 검증 불가 |
| **통합 테스트 역할** | 컴포넌트 간 연동 검증 |
| **Managed 의존** | 실제 사용 (DB) |
| **Unmanaged 의존** | Mock 사용 (외부 API) |
| **피라미드** | 단위 많음, 통합 중간, E2E 적음 |

**핵심 질문:**
> 이 연동이 단위 테스트로 검증 가능한가, 통합 테스트가 필요한가?

## 다음 장 예고

다음 장에서는 Mock 사용의 모범 사례를 다룬다. Mock을 언제, 어디서, 어떻게 사용해야 하는지 구체적인 가이드라인을 살펴본다.
