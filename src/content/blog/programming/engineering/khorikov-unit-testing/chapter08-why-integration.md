---
title: "Ch 8: Why Integration Testing?"
date: 2026-05-10T08:00:00
description: "통합 테스트의 역할과 테스트 피라미드. Managed 의존은 실제 사용하고 Unmanaged는 Mock한다."
tags: [Testing, Integration]
series: "Khorikov Unit Testing"
seriesOrder: 8
draft: true

---

단위 테스트만으로는 충분하지 않다. 컴포넌트 간의 연동, 외부 시스템과의 통합은 통합 테스트로 검증해야 한다.

## 8.1 단위 테스트의 한계

### 검증할 수 없는 것들

단위 테스트가 잡지 못하는 영역은 다음과 같다.

| 한계 | 설명 |
|------|------|
| 연동 문제 | 컴포넌트 사이의 통신 오류 |
| 설정 오류 | DI 컨테이너, 환경 설정 |
| DB 스키마 | 실제 쿼리, 마이그레이션 |
| 외부 계약 | API 스펙 변경 |

다음 예시처럼 개별 컴포넌트는 단위 테스트에서 정상이라도 실제 DB에서 컬럼명 불일치, 외래 키 위반, 트랜잭션 타임아웃 같은 문제가 드러난다.

```csharp
// 단위 테스트 — 개별 컴포넌트는 정상이다
[Test]
public void Repository_saves_user()
{
    var repo = new FakeUserRepository();
    var user = new User { Name = "John" };

    repo.Save(user);

    Assert.That(repo.GetById(user.Id), Is.Not.Null);
}
```

### 통합 문제 예시

Mock으로 검증할 수 없는 것들은 다음과 같다.

- SQL 쿼리가 올바른가
- 인덱스가 사용되는가
- 트랜잭션이 제대로 커밋되는가
- 컬럼 매핑이 정확한가

```csharp
public class UserService
{
    private readonly IUserRepository _repo;

    public async Task<User> CreateUser(string email)
    {
        var user = new User { Email = email };
        await _repo.Save(user);
        return user;
    }
}
```

## 8.2 통합 테스트의 역할

### 통합 테스트의 정의

단위 테스트의 세 가지 속성(작은 코드 조각, 빠른 실행, 격리) 중 하나라도 위반하면 통합 테스트다.

| 속성 | 단위 테스트 | 통합 테스트 |
|------|-------------|-------------|
| 작은 코드 조각 | 단일 동작 | 여러 컴포넌트 |
| 빠른 실행 | 밀리초 | 초 단위 |
| 격리 | 테스트 사이 독립 | 외부 시스템 공유 가능 |

### 통합 테스트가 다루는 영역

| 검증 대상 | 예시 |
|-----------|------|
| Repository와 DB 사이 매핑 | SQL, ORM 매핑 |
| 외부 API 게이트웨이 | HTTP 호출 계약 |
| 트랜잭션 경계 | 커밋, 롤백 |
| DI 구성 | 컨테이너 결선 |

## 8.3 테스트 피라미드

전통적인 비율은 다음과 같다.

| 유형 | 비율 | 역할 |
|------|------|------|
| E2E | 5~10% | 핵심 비즈니스 흐름 |
| 통합 | 20~30% | 외부 시스템 연동 |
| 단위 | 60~70% | 비즈니스 로직 |

프로젝트 특성에 따라 비율이 달라진다. CRUD 중심 애플리케이션은 통합 테스트의 비중이 더 커지고, 로직 중심 애플리케이션은 단위 테스트의 비중이 더 커진다. 비율 자체보다 각 테스트가 어떤 기둥에 강한지 의식하고 배치하는 것이 중요하다.

## 8.4 통합 테스트 작성

### 기본 구조

다음은 트랜잭션 롤백을 활용한 격리 패턴이다.

```csharp
[TestFixture]
public class UserServiceIntegrationTests
{
    private SqlConnection _connection;
    private IDbTransaction _transaction;
    private UserRepository _repo;
    private UserService _service;

    [SetUp]
    public async Task SetUp()
    {
        _connection = new SqlConnection(TestConfig.ConnectionString);
        await _connection.OpenAsync();

        _transaction = _connection.BeginTransaction();

        _repo = new UserRepository(_connection, _transaction);
        _service = new UserService(_repo);
    }

    [TearDown]
    public void TearDown()
    {
        _transaction?.Rollback();
        _connection?.Dispose();
    }

    [Test]
    public async Task CreateUser_persists_to_database()
    {
        var user = await _service.CreateUser("test@example.com");

        var loaded = await _repo.GetById(user.Id);
        Assert.That(loaded, Is.Not.Null);
        Assert.That(loaded.Email, Is.EqualTo("test@example.com"));
    }
}
```

### Managed와 Unmanaged 의존 처리

| 유형 | 통합 테스트에서의 처리 | 이유 |
|------|-------------------------|------|
| Managed (DB) | 실제 사용 | 쿼리와 스키마를 검증한다 |
| Unmanaged (외부 API) | Mock 사용 | 비용과 안정성 |

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

### 테스트 격리 전략

격리에는 세 가지 방법이 흔히 쓰인다.

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

// 방법 2: 테스트마다 DB 초기화
[SetUp]
public async Task SetUp()
{
    await TestDb.Reset();  // 모든 테이블을 truncate한다
}

// 방법 3: Docker 컨테이너
[OneTimeSetUp]
public async Task OneTimeSetUp()
{
    _container = await new MsSqlBuilder().BuildAsync();
    await _container.StartAsync();
}
```

| 방법 | 장점 | 단점 |
|------|------|------|
| 트랜잭션 롤백 | 빠르다, 자동 정리 | 커밋 이후 트리거를 검증하지 못한다 |
| DB 초기화 | 커밋까지 검증 가능 | 느리다 |
| Docker 컨테이너 | 완전한 격리, 재현성 | 초기 기동 비용 |

### 테스트 데이터

빌더 패턴을 통해 의도가 분명한 테스트 데이터를 만든다.

```csharp
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

## 8.6 통합 테스트와 E2E 테스트

| 측면 | 통합 테스트 | E2E 테스트 |
|------|-------------|------------|
| 범위 | 일부 컴포넌트 | 전체 시스템 |
| 속도 | 빠르거나 중간 | 느리다 |
| 안정성 | 높다 | 낮다 (flaky하기 쉽다) |
| 유지보수 | 중간 | 어렵다 |
| 목적 | 연동 검증 | 사용자 시나리오 |

선택 기준은 다음과 같다.

- 통합 테스트: DB 연동 검증, 특정 외부 서비스 연동, 비즈니스 로직 흐름
- E2E 테스트: 핵심 사용자 여정, 결제 플로우, 회원가입 플로우

## 8.7 통합 테스트 수 결정

다음 세 가지가 통합 테스트 수에 영향을 준다.

| 요소 | 영향 |
|------|------|
| 외부 의존 수 | 많을수록 더 많은 통합 테스트가 필요하다 |
| 비즈니스 중요도 | 핵심 기능에 집중한다 |
| 실패 비용 | 비용이 클수록 더 많이 작성한다 |

### Happy Path 중심으로

통합 테스트는 핵심 happy path에 집중하고, edge case는 단위 테스트로 다룬다.

```csharp
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

[Test]
public void Order_with_zero_quantity_is_invalid()
{
    var order = new Order { Quantity = 0 };
    Assert.That(order.IsValid, Is.False);
}
```

## 자주 보는 함정

- **단위 테스트만으로 충분하다는 가정**: 매핑과 결선의 회귀가 운영 환경에서 드러난다.
- **모든 경로를 통합 테스트로 커버**: 테스트 시간이 폭발하고 피드백이 느려진다.
- **인메모리 DB로 통합 테스트 대체**: SQL 방언과 트랜잭션 동작 차이를 잡지 못한다.
- **테스트 격리를 생략**: 순서 의존이 생겨 flaky 테스트가 양산된다.
- **외부 API를 실제 호출**: 비용, 속도, 결정성이 모두 무너진다.

## 정리

- 단위 테스트는 연동 문제를 검증하지 못한다.
- 통합 테스트는 컴포넌트 사이의 연동을 검증한다.
- Managed 의존(DB)은 실제 사용하고 Unmanaged 의존(외부 API)은 Mock으로 다룬다.
- 격리는 트랜잭션 롤백, DB 초기화, Docker 컨테이너 중에서 상황에 맞게 선택한다.
- 통합 테스트는 happy path에 집중하고 edge case는 단위 테스트로 다룬다.
- 테스트 피라미드의 비율은 프로젝트 성격에 따라 조정한다.

핵심 질문은 다음과 같다.

> 이 연동이 단위 테스트로 검증 가능한가, 통합 테스트가 필요한가?

## 다음 장 예고

다음 장에서는 Mock 사용의 모범 사례를 다룬다. Mock을 언제, 어디서, 어떻게 사용해야 하는지 구체적인 가이드라인을 살펴본다.

## 관련 항목

- [Ch 7: Refactoring Toward Valuable Unit Tests](/blog/programming/engineering/khorikov-unit-testing/chapter07-refactoring)
- [Ch 9: Mocking Best Practices](/blog/programming/engineering/khorikov-unit-testing/chapter09-mocking-best-practices)
- [Ch 10: Testing the Database](/blog/programming/engineering/khorikov-unit-testing/chapter10-testing-database)
- [GOOS](/blog/programming/engineering/goos/) — Outside-In과 End-to-End 사이의 균형
- [Working Effectively with Legacy Code](/blog/programming/engineering/legacy-code/) — 통합 테스트가 필요한 레거시 진입점
