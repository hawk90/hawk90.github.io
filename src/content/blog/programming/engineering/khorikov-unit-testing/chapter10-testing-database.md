---
title: "Ch 10: Testing the Database"
date: 2026-05-10T10:00:00
description: "DB 통합 테스트의 원칙. 실제 DB, 격리 전략, 테스트 데이터 관리, CI/CD 통합."
tags: [Testing, Database]
series: "Khorikov Unit Testing"
seriesOrder: 10
draft: true

---

데이터베이스는 대부분의 애플리케이션에서 핵심 컴포넌트다. DB와의 연동을 올바르게 테스트하는 방법을 정리한다.

## 10.1 DB 테스트의 원칙

### 실제 DB를 쓴다

인메모리 DB는 빠르지만 SQL 문법, 트랜잭션 동작, 제약 조건, 성능 특성 모두에서 운영 DB와 차이가 난다. 실제 DB를 써야 그 차이가 드러나지 않는다.

| 접근법 | 장점 | 단점 |
|--------|------|------|
| 실제 DB | 정확한 검증 | 느리다, 설정이 복잡하다 |
| 인메모리 DB | 빠르다 | 동작이 미묘하게 다르다 |
| Mock | 가장 빠르다 | 통합 검증이 불가능하다 |

권장은 통합 테스트에서 실제 DB를 쓰는 것이다.

## 10.2 테스트 격리

각 테스트는 다음을 만족해야 한다.

- 다른 테스트의 데이터에 영향받지 않는다.
- 다른 테스트에 영향을 주지 않는다.
- 어떤 순서로 실행해도 동일한 결과가 나온다.

### 격리 전략 1: 트랜잭션 롤백

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
        _transaction.Rollback();
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
}
```

장점은 빠르고 자동으로 정리된다는 것이다. 단점은 트랜잭션 안의 동작만 검증할 수 있다는 점이다. 커밋 후 트리거나 큐 발행 같은 동작은 검증할 수 없다.

### 격리 전략 2: 테스트마다 DB 초기화

```csharp
[SetUp]
public async Task SetUp()
{
    await TestDb.Reset();
}

public static class TestDb
{
    public static async Task Reset()
    {
        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();

        // 순서가 중요하다. 외래 키 의존성을 고려한다.
        await conn.ExecuteAsync("DELETE FROM OrderItems");
        await conn.ExecuteAsync("DELETE FROM Orders");
        await conn.ExecuteAsync("DELETE FROM Users");
    }
}
```

커밋 이후의 동작까지 검증할 수 있다. 대신 매 테스트마다 초기화 비용이 든다.

### 격리 전략 3: Docker 컨테이너

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

        await ApplyMigrations(_container.GetConnectionString());
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        await _container.DisposeAsync();
    }
}
```

완전한 격리와 재현성을 얻지만 초기 기동 시간이 든다. Testcontainers 같은 라이브러리가 도움이 된다.

## 10.3 테스트 데이터 관리

### 빌더 패턴

설정 항목이 많고 변형이 잦으면 fluent 빌더가 편하다.

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

정해진 형태의 객체가 자주 등장하면 Object Mother가 깔끔하다.

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

### CRUD 기본

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

조건이 들어가는 쿼리는 양성/음성 케이스를 모두 확인해 회귀 보호를 확보한다.

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

    Assert.That(result.Total, Is.EqualTo(350m));
}
```

## 10.5 마이그레이션 테스트

스키마 변경 자체를 테스트 가능한 단위로 다룬다.

```csharp
[TestFixture]
public class MigrationTests
{
    [Test]
    public async Task All_migrations_apply_successfully()
    {
        await TestDb.DropAndCreate();

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

        // 두 번 적용해도 문제가 없어야 한다
        await migrator.MigrateToLatest();
        await migrator.MigrateToLatest();

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
| 병렬 실행 | 총 시간을 단축한다 |
| 트랜잭션 롤백 | 정리 시간을 절약한다 |
| 공유 컨테이너 | 초기화 시간을 절약한다 |
| 최소 데이터 | 쿼리 시간을 단축한다 |

병렬 실행은 격리가 보장되어야 안전하다. 테스트마다 고유 스키마를 만들면 안전하게 병렬화할 수 있다.

```csharp
[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class OrderRepositoryTests
{
    private string _uniqueSchema;

    [SetUp]
    public void SetUp()
    {
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

## 자주 보는 함정

- **인메모리 DB로 대체**: 운영 DB와의 SQL 차이를 잡지 못한다.
- **격리를 생략한 병렬 실행**: 한 테스트의 데이터가 다른 테스트로 새어 들어가 flaky해진다.
- **테스트 데이터 시드를 한 번에 전부 실행**: 의존성이 흐려져 테스트 의도가 모호해진다.
- **마이그레이션을 테스트 대상에서 제외**: 스키마 변경이 운영에서 깨진다.
- **트랜잭션 롤백으로 모든 경우를 다 검증한다고 가정**: 커밋 이후 트리거나 외부 큐 발행은 잡지 못한다.

## 정리

- DB 통합 테스트는 인메모리 대신 실제 DB로 작성한다.
- 격리는 트랜잭션 롤백, DB 초기화, Docker 컨테이너 중에서 선택한다.
- 테스트 데이터는 빌더와 Object Mother로 의도를 분명히 한다.
- 마이그레이션도 테스트 대상에 포함해 스키마 회귀를 잡는다.
- 병렬 실행은 테스트별 고유 스키마 같은 격리 전략이 전제되어야 안전하다.
- CI/CD는 Docker Compose나 서비스 컨테이너로 DB를 재현 가능하게 만든다.

핵심 질문은 다음과 같다.

> 이 테스트가 실제 DB 동작을 검증하고 있는가? 테스트 사이의 격리가 보장되는가?

## 다음 장 예고

마지막 장에서는 단위 테스트 안티패턴을 다룬다. 피해야 할 일반적인 실수와 해결 방법을 살펴본다.

## 관련 항목

- [Ch 8: Why Integration Testing?](/blog/programming/engineering/khorikov-unit-testing/chapter08-why-integration)
- [Ch 9: Mocking Best Practices](/blog/programming/engineering/khorikov-unit-testing/chapter09-mocking-best-practices)
- [Ch 11: Unit Testing Anti-Patterns](/blog/programming/engineering/khorikov-unit-testing/chapter11-anti-patterns)
- [Working Effectively with Legacy Code](/blog/programming/engineering/legacy-code/) — DB가 박혀 있는 레거시의 진입점 설계
- [TDD Patterns](/blog/programming/engineering/tdd-patterns/) — 테스트 데이터 빌더와 격리 패턴
