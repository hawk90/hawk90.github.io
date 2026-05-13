---
title: "Ch 2: What Is a Unit Test?"
date: 2025-10-15T02:00:00
description: "London (mockist) vs Classical (Detroit) 학파. 테스트 분리도 차이."
tags: [TDD, London, Classical, School]
series: "Khorikov Unit Testing"
seriesOrder: 2
---

"단위 테스트란 무엇인가?"에 대한 답은 생각보다 논쟁적이다. 두 가지 학파가 서로 다른 정의를 제시한다.

## 2.1 단위 테스트의 세 가지 속성

모든 단위 테스트는 다음 세 가지를 만족해야 한다:

| 속성 | 설명 |
|------|------|
| **작은 코드 조각 검증** | "단위"를 테스트 |
| **빠른 실행** | 밀리초 단위 |
| **격리** | 다른 테스트와 독립적 |

논쟁은 세 번째 **"격리"**에서 발생한다.

## 2.2 두 학파

### London 학파 (Mockist)

```
격리 = 테스트 대상 시스템(SUT)을 모든 협력자로부터 격리

         ┌─────────────┐
         │    SUT      │
         └──────┬──────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌───────┐   ┌───────┐   ┌───────┐
│ Mock  │   │ Mock  │   │ Mock  │
└───────┘   └───────┘   └───────┘
   (모든 의존을 mock으로 대체)
```

**특징:**
- 모든 변경 가능한 의존을 mock으로 대체
- 테스트가 실패하면 → SUT만 문제
- 테스트 단위 = 클래스

```csharp
// London 스타일
[Test]
public void Purchase_succeeds_when_enough_inventory()
{
    // 모든 의존을 mock
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

```
격리 = 테스트 간의 격리 (공유 상태가 없음)

         ┌─────────────┐
         │    SUT      │
         └──────┬──────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌───────┐   ┌───────┐   ┌───────┐
│ Real  │   │ Real  │   │ Mock  │ ← 공유 의존만
└───────┘   └───────┘   └───────┘
   (실제 협력자 사용, 공유 의존만 mock)
```

**특징:**
- 실제 협력자 사용
- 공유 의존(DB, 파일시스템)만 mock
- 테스트 단위 = 동작(behavior)

```csharp
// Classical 스타일
[Test]
public void Purchase_succeeds_when_enough_inventory()
{
    // 실제 객체 사용
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
| **격리 대상** | SUT를 협력자로부터 | 테스트를 다른 테스트로부터 |
| **단위** | 클래스 | 동작 |
| **Mock 사용** | 모든 변경 가능 의존 | 공유 의존만 |
| **실패 진단** | 쉬움 (SUT만 확인) | 어려울 수 있음 |
| **리팩토링 내성** | 낮음 | 높음 |

### 의존의 분류

```
                    의존 (Dependency)
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
      공유 의존                        비공유 의존
   (Shared Dependency)              (Private Dependency)
           │                               │
     ┌─────┴─────┐                   ┌─────┴─────┐
     ▼           ▼                   ▼           ▼
   DB          파일              값 객체       서비스
  캐시         큐                             (인스턴스)
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
               변경 가능                   불변
            (Mutable)                (Immutable)
```

| 의존 유형 | 예시 | Classical | London |
|-----------|------|-----------|--------|
| **공유 의존** | DB, 파일, 싱글톤 | Mock | Mock |
| **변경 가능 비공유** | 일반 서비스 | 실제 | Mock |
| **불변 비공유** | 값 객체 | 실제 | 실제 |

## 2.4 책의 입장: Classical 선호

Khorikov는 Classical 학파를 선호한다:

### 이유 1: 리팩토링 내성

```csharp
// London 스타일 — 구현에 결합
[Test]
public void Successful_purchase()
{
    var storeMock = new Mock<IStore>();
    var customer = new Customer();

    customer.Purchase(storeMock.Object, Product.Shampoo, 5);

    // 💥 내부 구현 검증 — 리팩토링하면 깨짐
    storeMock.Verify(s => s.RemoveInventory(Product.Shampoo, 5));
}

// Classical 스타일 — 결과에 집중
[Test]
public void Successful_purchase()
{
    var store = new Store();
    store.AddInventory(Product.Shampoo, 10);
    var customer = new Customer();

    customer.Purchase(store, Product.Shampoo, 5);

    // ✓ 최종 상태 검증 — 구현 변경에 강함
    Assert.That(store.GetInventory(Product.Shampoo), Is.EqualTo(5));
}
```

### 이유 2: 테스트 단위는 "동작"

```
London의 "단위 = 클래스"

    ┌─────────────────────────────────────┐
    │          한 클래스                   │
    │   ┌─────────────────────────────┐   │
    │   │ Method1  Method2  Method3   │   │
    │   └─────────────────────────────┘   │
    └─────────────────────────────────────┘
            (인위적인 경계)


Classical의 "단위 = 동작"

    ┌─────────────────────────────────────┐
    │      하나의 비즈니스 동작            │
    │                                     │
    │   Class A ─── Class B ─── Class C   │
    │                                     │
    └─────────────────────────────────────┘
            (자연스러운 경계)
```

**동작의 예:**
- "고객이 제품을 구매한다"
- "사용자가 비밀번호를 변경한다"
- "주문이 배송 상태로 변경된다"

### 이유 3: 테스트 세분화 문제

London 스타일은 클래스당 테스트를 작성하게 만든다:

```
// 불필요한 세분화
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

이런 테스트는:
- 구현에 결합
- 리팩토링 시 대량 수정 필요
- 비즈니스 의미 불명확

## 2.5 통합 테스트와의 경계

### 단위 테스트 정의 (Classical)

단위 테스트는:
1. 작은 코드 조각 검증 (단일 동작)
2. 빠른 실행
3. 격리 (테스트 간)

다음 중 하나라도 해당되면 **통합 테스트**:
- 프로세스 외부 의존 사용 (DB, 파일, 네트워크)
- 느린 실행
- 테스트 간 공유 상태

### 테스트 피라미드

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲
                 ╱──────╲
                ╱        ╲
               ╱ 통합     ╲
              ╱────────────╲
             ╱              ╲
            ╱   단위 테스트   ╲
           ╱──────────────────╲

    빠름/많음 ◀──────────────▶ 느림/적음
```

| 레벨 | 특징 | 비율 |
|------|------|------|
| **E2E** | 전체 시스템, 가장 느림 | 적음 |
| **통합** | 외부 의존 포함, 느림 | 중간 |
| **단위** | 격리, 빠름 | 많음 |

## 2.6 테스트 더블의 종류

테스트 더블(Test Double)은 실제 의존을 대체하는 객체다:

| 종류 | 목적 | 사용 시점 |
|------|------|-----------|
| **Dummy** | 전달만, 사용 안 됨 | 파라미터 채우기 |
| **Stub** | 미리 정의된 답변 반환 | 입력 제공 |
| **Spy** | 호출 기록 | 호출 검증 |
| **Mock** | 기대 동작 + 검증 | 상호작용 검증 |
| **Fake** | 단순화된 실제 구현 | 복잡한 의존 대체 |

```csharp
// Dummy — 사용되지 않음
var dummyLogger = new DummyLogger();
var service = new Service(dummyLogger);

// Stub — 값 반환
var stubStore = new Mock<IStore>();
stubStore.Setup(s => s.GetPrice(Product.Shampoo)).Returns(10m);

// Mock — 호출 검증
var mockEmailSender = new Mock<IEmailSender>();
service.Process();
mockEmailSender.Verify(e => e.Send(It.IsAny<Email>()), Times.Once);

// Fake — 실제처럼 동작하는 단순 구현
public class FakeDatabase : IDatabase
{
    private readonly Dictionary<int, User> _users = new();

    public void Save(User user) => _users[user.Id] = user;
    public User GetById(int id) => _users.GetValueOrDefault(id);
}
```

## 2.7 Mock vs Stub 구분

**핵심 차이:**

| 구분 | Mock | Stub |
|------|------|------|
| **방향** | SUT → 의존 (outgoing) | 의존 → SUT (incoming) |
| **검증** | 호출 여부 검증 | 값만 반환 |
| **목적** | 부수효과 확인 | 입력 제공 |

```csharp
// Stub — 입력 제공 (incoming)
var stubStore = new Mock<IStore>();
stubStore.Setup(s => s.HasEnoughInventory(Product.Shampoo, 5))
         .Returns(true);  // SUT에 값을 제공

// Mock — 출력 검증 (outgoing)
var mockEmailSender = new Mock<IEmailSender>();
// ... SUT 실행 ...
mockEmailSender.Verify(e => e.Send(It.IsAny<Email>()));  // SUT의 호출 검증
```

```
        ┌─────────────────┐
        │       SUT       │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
 Stub         Mock         Stub
  │            │             │
  ▼            ▼             ▼
입력 제공   호출 검증     입력 제공
(incoming) (outgoing)   (incoming)
```

## 정리

| 개념 | 핵심 |
|------|------|
| **London 학파** | 모든 의존 mock, 단위 = 클래스 |
| **Classical 학파** | 공유 의존만 mock, 단위 = 동작 |
| **책의 입장** | Classical 선호 (리팩토링 내성) |
| **통합 테스트** | 외부 의존 사용 시 |
| **Mock vs Stub** | 출력 검증 vs 입력 제공 |

**핵심 질문:**
> 이 테스트가 검증하는 것은 "동작"인가, "구현"인가?

## 다음 장 예고

다음 장에서는 단위 테스트의 구조를 다룬다. AAA 패턴, 명명 규칙, 파라미터화 테스트를 살펴본다.
