---
title: "Ch 2: What Is a Unit Test?"
date: 2026-05-10T02:00:00
description: "London 학파와 Classical 학파의 차이. Khorikov가 Classical을 선호하는 이유와 테스트 단위의 정의."
tags: [TDD, London, Classical, School]
series: "Khorikov Unit Testing"
seriesOrder: 2
---

"단위 테스트란 무엇인가?"라는 질문은 생각보다 논쟁적이다. 두 학파가 서로 다른 정의를 제시하고, 그 정의 차이가 테스트 코드의 모양을 결정한다.

## 2.1 단위 테스트의 세 가지 속성

모든 단위 테스트는 다음 세 가지를 만족해야 한다는 점에는 양 학파가 동의한다.

| 속성 | 설명 |
|------|------|
| 작은 코드 조각 검증 | "단위"를 테스트한다 |
| 빠른 실행 | 밀리초 단위로 끝난다 |
| 격리 | 다른 테스트와 독립적으로 실행된다 |

논쟁은 세 번째 "격리"의 의미에서 발생한다. 누구로부터의 격리인지, 어떤 격리인지가 학파를 가른다.

## 2.2 두 학파

### London 학파 (Mockist)

London 학파는 격리를 "테스트 대상 시스템(SUT)을 모든 협력자로부터 격리"하는 것으로 본다.

![London vs Classical Schools](/images/blog/khorikov/diagrams/ch02-school-comparison.svg)

특징은 명확하다. 모든 변경 가능한 의존을 mock으로 대체하고, 테스트가 실패하면 원인은 SUT 하나로 좁혀진다. 단위는 클래스다.

```csharp
// London 스타일
[Test]
public void Purchase_succeeds_when_enough_inventory()
{
    // 모든 의존을 mock으로 대체한다
    var storeMock = new Mock<IStore>();
    storeMock.Setup(s => s.HasEnoughInventory(Product.Shampoo, 5))
             .Returns(true);

    var customer = new Customer();

    bool result = customer.Purchase(storeMock.Object, Product.Shampoo, 5);

    Assert.That(result, Is.True);
    storeMock.Verify(s => s.RemoveInventory(Product.Shampoo, 5), Times.Once);
}
```

### Classical 학파 (Detroit)

Classical 학파는 격리를 "테스트 사이의 격리"로 본다. 공유 상태가 없는 한 협력자는 실제 객체를 그대로 사용한다.

특징도 분명하다. 실제 협력자를 사용하고, DB나 파일시스템처럼 공유되는 의존만 mock으로 대체한다. 단위는 동작(behavior)이다.

```csharp
// Classical 스타일
[Test]
public void Purchase_succeeds_when_enough_inventory()
{
    // 실제 객체를 사용한다
    var store = new Store();
    store.AddInventory(Product.Shampoo, 10);
    var customer = new Customer();

    bool result = customer.Purchase(store, Product.Shampoo, 5);

    Assert.That(result, Is.True);
    Assert.That(store.GetInventory(Product.Shampoo), Is.EqualTo(5));
}
```

## 2.3 학파 비교

| 관점 | London | Classical |
|------|--------|-----------|
| 격리 대상 | SUT를 협력자로부터 | 테스트를 다른 테스트로부터 |
| 단위 | 클래스 | 동작 |
| Mock 사용 | 모든 변경 가능 의존 | 공유 의존만 |
| 실패 진단 | 쉽다 (SUT만 본다) | 협력자 묶음을 본다 |
| 리팩토링 내성 | 낮다 | 높다 |

### 의존의 분류

학파를 가르는 결정적 차이는 의존을 어떻게 분류하느냐다. 다음 그림처럼 의존은 세 부류로 나뉜다.

![Dependency Classification](/images/blog/khorikov/diagrams/ch02-dependency-tree.svg)

| 의존 유형 | 예시 | Classical | London |
|-----------|------|-----------|--------|
| 공유 의존 | DB, 파일, 싱글톤 | Mock | Mock |
| 변경 가능 비공유 | 일반 서비스 | 실제 | Mock |
| 불변 비공유 | 값 객체 | 실제 | 실제 |

## 2.4 책의 입장: Classical 선호

Khorikov는 명확하게 Classical 학파를 선호한다. 그 이유는 세 가지로 정리된다.

### 이유 1: 리팩토링 내성

같은 동작을 검증하는 두 테스트가 리팩토링 앞에서 어떻게 갈리는지 비교한다.

```csharp
// London 스타일 — 구현에 결합한다
[Test]
public void Successful_purchase()
{
    var storeMock = new Mock<IStore>();
    var customer = new Customer();

    customer.Purchase(storeMock.Object, Product.Shampoo, 5);

    // 내부 구현을 검증한다 — 리팩토링하면 깨진다
    storeMock.Verify(s => s.RemoveInventory(Product.Shampoo, 5));
}

// Classical 스타일 — 결과에 집중한다
[Test]
public void Successful_purchase()
{
    var store = new Store();
    store.AddInventory(Product.Shampoo, 10);
    var customer = new Customer();

    customer.Purchase(store, Product.Shampoo, 5);

    // 최종 상태를 검증한다 — 구현 변경에 강하다
    Assert.That(store.GetInventory(Product.Shampoo), Is.EqualTo(5));
}
```

### 이유 2: 테스트 단위는 "동작"

테스트의 단위는 메서드도 클래스도 아니라 비즈니스 관점의 동작이어야 한다. "고객이 제품을 구매한다", "사용자가 비밀번호를 변경한다", "주문이 배송 상태로 변경된다" 같은 식이다.

!["단위"의 정의 차이](/images/blog/khorikov/diagrams/ch02-unit-definition.svg)

### 이유 3: 테스트 세분화 문제

London 스타일은 클래스마다 테스트를 작성하도록 강요한다. 결과적으로 다음과 같은 구조가 만들어진다.

```text
CustomerTest
├── Purchase_calls_store_HasEnoughInventory
├── Purchase_calls_store_RemoveInventory_when_success
├── Purchase_does_not_call_RemoveInventory_when_failure
└── ...

StoreTest
├── HasEnoughInventory_returns_true_when_enough
├── HasEnoughInventory_returns_false_when_not_enough
├── RemoveInventory_decreases_count
└── ...
```

이런 테스트는 구현에 결합되어 있고, 리팩토링 시 대량 수정이 필요하며, 비즈니스 의미가 불명확하다.

## 2.5 통합 테스트와의 경계

Classical 학파의 정의를 따르면 단위 테스트의 경계가 분명해진다. 다음 중 하나라도 해당하면 통합 테스트로 분류한다.

- 프로세스 외부 의존을 사용한다 (DB, 파일, 네트워크)
- 실행이 느리다
- 테스트 사이에 공유 상태가 있다

### 테스트 피라미드

![Test Pyramid](/images/blog/khorikov/diagrams/ch02-test-pyramid.svg)

| 레벨 | 특징 | 비율 |
|------|------|------|
| E2E | 전체 시스템, 가장 느리다 | 적다 |
| 통합 | 외부 의존 포함, 느리다 | 중간 |
| 단위 | 격리, 빠르다 | 많다 |

## 2.6 테스트 더블의 종류

테스트 더블(test double)은 실제 의존을 대체하는 객체의 총칭이다. Meszaros 분류를 따른다.

| 종류 | 목적 | 사용 시점 |
|------|------|-----------|
| Dummy | 전달만 하고 사용되지 않는다 | 파라미터 채우기 |
| Stub | 미리 정의된 답변을 반환한다 | 입력 제공 |
| Spy | 호출을 기록한다 | 호출 검증 |
| Mock | 기대 동작과 검증을 함께 가진다 | 상호작용 검증 |
| Fake | 단순화된 실제 구현이다 | 복잡한 의존 대체 |

```csharp
// Dummy — 사용되지 않는다
var dummyLogger = new DummyLogger();
var service = new Service(dummyLogger);

// Stub — 값을 반환한다
var stubStore = new Mock<IStore>();
stubStore.Setup(s => s.GetPrice(Product.Shampoo)).Returns(10m);

// Mock — 호출을 검증한다
var mockEmailSender = new Mock<IEmailSender>();
service.Process();
mockEmailSender.Verify(e => e.Send(It.IsAny<Email>()), Times.Once);

// Fake — 실제처럼 동작하는 단순 구현이다
public class FakeDatabase : IDatabase
{
    private readonly Dictionary<int, User> _users = new();

    public void Save(User user) => _users[user.Id] = user;
    public User GetById(int id) => _users.GetValueOrDefault(id);
}
```

## 2.7 Mock과 Stub의 구분

Khorikov가 가장 강조하는 구분이다. 같은 도구(Moq, Mockito 등)에서 만들어진다는 이유로 둘을 혼동하기 쉽다.

| 구분 | Mock | Stub |
|------|------|------|
| 방향 | SUT → 의존 (outgoing) | 의존 → SUT (incoming) |
| 검증 | 호출 여부를 검증한다 | 값을 반환할 뿐 검증하지 않는다 |
| 목적 | 부수효과 확인 | 입력 제공 |

```csharp
// Stub — 입력을 제공한다 (incoming)
var stubStore = new Mock<IStore>();
stubStore.Setup(s => s.HasEnoughInventory(Product.Shampoo, 5))
         .Returns(true);  // SUT에 값을 제공한다

// Mock — 출력을 검증한다 (outgoing)
var mockEmailSender = new Mock<IEmailSender>();
// ... SUT 실행 ...
mockEmailSender.Verify(e => e.Send(It.IsAny<Email>()));  // SUT의 호출을 검증한다
```

![Stub vs Mock 방향](/images/blog/khorikov/diagrams/ch02-stub-mock-flow.svg)

Stub에 대해 Verify를 거는 것은 안티패턴이다. 그것은 입력 제공자의 호출 횟수를 검증하는 것이며, 자연스럽게 구현 세부사항에 결합된다.

## 자주 보는 함정

- **모든 의존을 자동으로 mock**: Moq나 AutoFixture로 의존을 자동 생성하면 London 스타일이 디폴트가 된다.
- **단위를 메서드로 정의**: `MethodA_ReturnsX` 같은 이름은 단위가 동작이 아니라 메서드라는 사고를 굳힌다.
- **Stub에 Verify 추가**: 입력 제공용 stub의 호출 여부까지 검증하면 그 순간 stub이 mock으로 변질된다.
- **Fake와 Mock을 혼동**: 인메모리 구현은 Fake다. Mock 프레임워크로 흉내 내면 코드량과 깨지기 쉬움이 모두 늘어난다.

## 정리

- 단위 테스트의 세 가지 속성 중 "격리"의 정의가 학파를 가른다.
- London 학파는 SUT를 모든 협력자로부터 격리하고, 단위를 클래스로 본다.
- Classical 학파는 테스트 사이의 격리를 중시하고, 단위를 동작으로 본다.
- Khorikov는 리팩토링 내성을 이유로 Classical을 선호한다.
- Mock은 outgoing 호출 검증용이고 Stub은 incoming 입력 제공용이다.
- 외부 의존이나 공유 상태가 끼면 단위 테스트가 아니라 통합 테스트다.

핵심 질문은 다음 하나다.

> 이 테스트가 검증하는 것은 "동작"인가, "구현"인가?

## 다음 장 예고

다음 장에서는 단위 테스트의 구조를 다룬다. AAA 패턴, 명명 규칙, 파라미터화 테스트를 살펴본다.

## 관련 항목

- [Ch 1: The Goal of Unit Testing](/blog/programming/engineering/khorikov-unit-testing/chapter01-goal-of-unit-testing)
- [Ch 3: The Anatomy of a Unit Test](/blog/programming/engineering/khorikov-unit-testing/chapter03-anatomy)
- [Ch 5: Mocks and Test Fragility](/blog/programming/engineering/khorikov-unit-testing/chapter05-mocks-fragility)
- [GOOS](/blog/programming/engineering/goos/) — London 학파의 원전
- [TDD by Example](/blog/programming/engineering/tdd-by-example/) — Classical 흐름에 가까운 입문서
