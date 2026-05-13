---
title: "Ch 10: Testing the Database"
date: 2025-10-17T04:00:00
description: "DB 통합 테스트 — 실제 DB / 격리 / 결정성. 트랜잭션 / 스냅샷."
tags: [Testing, Database]
series: "Khorikov Unit Testing"
seriesOrder: 10
draft: true
---

데이터베이스는 대부분의 애플리케이션에서 핵심 컴포넌트다. DB와의 연동을 올바르게 테스트하는 방법을 알아본다.

## 10.1 DB 테스트의 원칙

### 실제 DB 사용

```
❌ 인메모리 DB의 문제:
- SQL 문법 차이
- 트랜잭션 동작 차이
- 제약 조건 차이
- 성능 특성 차이

✅ 실제 DB 사용:
- 실제 환경과 동일
- 쿼리 검증 가능
- 스키마 문제 발견
```

| 접근법 | 장점 | 단점 |
|--------|------|------|
| **실제 DB** | 정확한 검증 | 느림, 설정 복잡 |
| **인메모리** | 빠름 | 동작 차이 |
| **Mock** | 가장 빠름 | 검증 불가 |

**권장:** 통합 테스트에서 실제 DB 사용

## 10.2 테스트 격리

### 테스트 간 독립성

각 테스트는:
- 다른 테스트의 데이터에 영향받지 않아야 함
- 다른 테스트에 영향을 주지 않아야 함
- 어떤 순서로 실행해도 동일한 결과

### 격리 전략

#### 1. 트랜잭션 롤백

```csharp
[TestFixture]
public class UserRepositoryTests
{
    private IDbTransaction _transaction;

    [SetUp]
    public void SetUp()
    {
        _connection = new SqlConnection(ConnectionString);
        _connection.Open();
        _transaction = _connection.BeginTransaction();

        _repo = new UserRepository(_connection, _transaction);
    }

    [TearDown]
    public void TearDown()
    {
        _transaction.Rollback();  // 모든 변경 취소
        _connection.Dispose();
    }

    [Test]
    public void Save_persists_user()
    {
        var user = new User { Email = "test@example.com" };

        _repo.Save(user);

        var loaded = _repo.GetById(user.Id);
        Assert.That(loaded.Email, Is.EqualTo("test@example.com"));
    }
    // TearDown에서 롤백 → DB는 원래 상태
}
```

**장점:**
- 빠름 (커밋 없음)
- 자동 정리

**단점:**
- 트랜잭션 내 동작만 테스트
- 커밋 후 트리거 테스트 불가

#### 2. 테스트마다 DB 초기화

```csharp
[SetUp]
public async Task SetUp()
{
    await TestDb.Reset();  // 모든 데이터 삭제
}

public static class TestDb
{
    public static async Task Reset()
    {
        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();

        // 순서 중요: 외래 키 의존성 고려
        await conn.ExecuteAsync("DELETE FROM OrderItems");
        await conn.ExecuteAsync("DELETE FROM Orders");
        await conn.ExecuteAsync("DELETE FROM Users");

        // 또는 TRUNCATE (더 빠름, 외래 키 비활성화 필요)
    }
}
```

**장점:**
- 커밋 포함 테스트 가능
- 실제 환경과 동일

**단점:**
- 느림
- 정리 로직 필요

#### 3. Docker 컨테이너

```csharp
[TestFixture]
public class IntegrationTests
{
    private static MsSqlContainer _container;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        _container = new MsSqlBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
            .Build();

        await _container.StartAsync();

        // 스키마 마이그레이션
        await ApplyMigrations(_container.GetConnectionString());
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        await _container.DisposeAsync();
    }
}
```

**장점:**
- 완전한 격리
- 실제 DB와 동일
- CI/CD 친화적

**단점:**
- 초기 시작 시간
- 리소스 사용

## 10.3 테스트 데이터 관리

### 빌더 패턴

```csharp
public class TestUserBuilder
{
    private string _email = "default@example.com";
    private string _name = "Default User";
    private UserType _type = UserType.Customer;

    public TestUserBuilder WithEmail(string email)
    {
        _email = email;
        return this;
    }

    public TestUserBuilder WithName(string name)
    {
        _name = name;
        return this;
    }

    public TestUserBuilder AsPremium()
    {
        _type = UserType.Premium;
        return this;
    }

    public User Build()
    {
        return new User
        {
            Email = _email,
            Name = _name,
            Type = _type
        };
    }

    public async Task<User> BuildAndSave(IUserRepository repo)
    {
        var user = Build();
        await repo.Save(user);
        return user;
    }
}

// 사용
[Test]
public async Task Premium_user_gets_discount()
{
    var user = await new TestUserBuilder()
        .WithEmail("premium@example.com")
        .AsPremium()
        .BuildAndSave(_repo);

    var discount = _discountService.Calculate(user);

    Assert.That(discount, Is.EqualTo(0.2m));
}
```

### Object Mother

```csharp
public static class TestUsers
{
    public static User DefaultCustomer() =>
        new User { Email = "customer@example.com", Type = UserType.Customer };

    public static User PremiumMember() =>
        new User { Email = "premium@example.com", Type = UserType.Premium };

    public static User WithOrders(int orderCount)
    {
        var user = DefaultCustomer();
        for (int i = 0; i < orderCount; i++)
            user.Orders.Add(new Order { UserId = user.Id });
        return user;
    }
}

// 사용
[Test]
public async Task User_with_orders_cannot_be_deleted()
{
    var user = TestUsers.WithOrders(3);
    await _repo.Save(user);

    var result = await _service.DeleteUser(user.Id);

    Assert.That(result.Success, Is.False);
}
```

## 10.4 Repository 테스트

### CRUD 테스트

```csharp
[TestFixture]
public class UserRepositoryTests
{
    [Test]
    public async Task Save_new_user_assigns_id()
    {
        var user = new User { Email = "test@example.com" };

        await _repo.Save(user);

        Assert.That(user.Id, Is.GreaterThan(0));
    }

    [Test]
    public async Task GetById_returns_saved_user()
    {
        var user = new User { Email = "test@example.com" };
        await _repo.Save(user);

        var loaded = await _repo.GetById(user.Id);

        Assert.That(loaded, Is.Not.Null);
        Assert.That(loaded.Email, Is.EqualTo("test@example.com"));
    }

    [Test]
    public async Task GetById_returns_null_for_nonexistent()
    {
        var loaded = await _repo.GetById(999999);

        Assert.That(loaded, Is.Null);
    }

    [Test]
    public async Task Update_modifies_existing_user()
    {
        var user = new User { Email = "old@example.com" };
        await _repo.Save(user);

        user.Email = "new@example.com";
        await _repo.Save(user);

        var loaded = await _repo.GetById(user.Id);
        Assert.That(loaded.Email, Is.EqualTo("new@example.com"));
    }

    [Test]
    public async Task Delete_removes_user()
    {
        var user = new User { Email = "test@example.com" };
        await _repo.Save(user);

        await _repo.Delete(user);

        var loaded = await _repo.GetById(user.Id);
        Assert.That(loaded, Is.Null);
    }
}
```

### 복잡한 쿼리 테스트

```csharp
[Test]
public async Task GetActiveOrdersByUser_returns_only_active_orders()
{
    var user = await CreateUser();
    var activeOrder = await CreateOrder(user, OrderStatus.Active);
    var completedOrder = await CreateOrder(user, OrderStatus.Completed);
    var cancelledOrder = await CreateOrder(user, OrderStatus.Cancelled);

    var result = await _repo.GetActiveOrdersByUser(user.Id);

    Assert.That(result, Has.Count.EqualTo(1));
    Assert.That(result[0].Id, Is.EqualTo(activeOrder.Id));
}

[Test]
public async Task GetOrdersWithTotal_calculates_correctly()
{
    var user = await CreateUser();
    var order = await CreateOrder(user);
    await CreateOrderItem(order, price: 100, quantity: 2);
    await CreateOrderItem(order, price: 50, quantity: 3);

    var result = await _repo.GetOrderWithTotal(order.Id);

    Assert.That(result.Total, Is.EqualTo(350m));  // 200 + 150
}
```

## 10.5 마이그레이션 테스트

### 스키마 변경 테스트

```csharp
[TestFixture]
public class MigrationTests
{
    [Test]
    public async Task All_migrations_apply_successfully()
    {
        // 빈 DB에서 시작
        await TestDb.DropAndCreate();

        // 모든 마이그레이션 적용
        var migrator = new DbMigrator(ConnectionString);

        Assert.DoesNotThrowAsync(async () =>
        {
            await migrator.MigrateToLatest();
        });
    }

    [Test]
    public async Task Migration_is_idempotent()
    {
        await TestDb.DropAndCreate();
        var migrator = new DbMigrator(ConnectionString);

        // 두 번 적용해도 문제 없음
        await migrator.MigrateToLatest();
        await migrator.MigrateToLatest();

        // 스키마 검증
        var tables = await GetTableNames();
        Assert.That(tables, Contains.Item("Users"));
        Assert.That(tables, Contains.Item("Orders"));
    }
}
```

## 10.6 성능 고려사항

### 테스트 속도 최적화

| 기법 | 효과 |
|------|------|
| **병렬 실행** | 총 시간 감소 |
| **트랜잭션 롤백** | 정리 시간 절약 |
| **공유 컨테이너** | 초기화 시간 절약 |
| **최소 데이터** | 쿼리 시간 감소 |

```csharp
// 병렬 실행 가능하도록 격리
[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class OrderRepositoryTests
{
    private string _uniqueSchema;

    [SetUp]
    public void SetUp()
    {
        // 테스트별 고유 스키마
        _uniqueSchema = $"test_{Guid.NewGuid():N}";
        CreateSchema(_uniqueSchema);
    }

    [TearDown]
    public void TearDown()
    {
        DropSchema(_uniqueSchema);
    }
}
```

## 10.7 CI/CD 통합

### Docker Compose

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=TestPassword123!
    ports:
      - "1433:1433"

  tests:
    build: .
    depends_on:
      - db
    environment:
      - CONNECTION_STRING=Server=db;Database=TestDb;User=sa;Password=TestPassword123!
    command: dotnet test
```

### GitHub Actions

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mssql:
        image: mcr.microsoft.com/mssql/server:2022-latest
        env:
          ACCEPT_EULA: Y
          SA_PASSWORD: TestPassword123!
        ports:
          - 1433:1433
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: dotnet test
        env:
          CONNECTION_STRING: "Server=localhost;..."
```

## 정리

| 개념 | 핵심 |
|------|------|
| **실제 DB** | 인메모리 대신 실제 DB 사용 |
| **격리** | 트랜잭션 롤백 또는 초기화 |
| **데이터 관리** | 빌더, Object Mother |
| **Docker** | 컨테이너로 격리된 환경 |
| **CI/CD** | 자동화된 DB 테스트 |

**핵심 질문:**
> 이 테스트가 실제 DB 동작을 검증하고 있는가? 테스트 간 격리가 보장되는가?

## 다음 장 예고

마지막 장에서는 단위 테스트 안티패턴을 다룬다. 피해야 할 일반적인 실수와 해결 방법을 살펴본다.
