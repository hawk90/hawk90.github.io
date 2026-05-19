---
title: "Ch 1: The Goal of Unit Testing"
date: 2026-05-10T01:00:00
description: "테스트의 목적 — 지속 가능한 소프트웨어 성장. 가치 vs 비용."
tags: [TDD, Unit Testing, Goal]
series: "Khorikov Unit Testing"
seriesOrder: 1
draft: true
---

단위 테스트를 왜 작성하는가? "버그를 잡기 위해"가 일반적인 대답이다. 하지만 Khorikov는 더 근본적인 목적을 제시한다: **지속 가능한 프로젝트 성장**.

## 1.1 단위 테스트의 진짜 목적

### 버그 잡기가 아닌 이유

```
버그 잡기                    지속 가능한 성장
────────                    ────────────────
단기적 관점                  장기적 관점
테스트 = 비용                테스트 = 투자
많이 = 좋다                  가치 있는 것만
커버리지 집착                비즈니스 가치
```

버그를 잡는 건 **부수 효과**다. 진짜 목적은:

> **테스트 스위트가 프로젝트의 지속 가능한 성장을 가능하게 한다.**

### 소프트웨어 엔트로피

테스트 없는 프로젝트는 시간이 지나면서 변경 비용이 급격히 증가한다:

![비용 vs 시간](/images/blog/khorikov/diagrams/ch01-cost-time-graph.svg)

**테스트가 있으면:**
- 코드 변경에 대한 자신감
- 회귀 버그 조기 발견
- 리팩토링 가능
- 문서화 효과

**테스트가 없으면:**
- "건드리면 안 돼" 코드 증가
- 기술 부채 누적
- 변경 = 두려움
- 결국 재작성

## 1.2 테스트도 코드다

### 테스트의 비용

테스트는 공짜가 아니다:

| 비용 항목 | 설명 |
|-----------|------|
| **작성 비용** | 테스트 코드 작성 시간 |
| **유지 비용** | 프로덕션 코드 변경 시 테스트 수정 |
| **실행 비용** | CI/CD 파이프라인 시간 |
| **인지 비용** | 테스트 코드 읽고 이해하는 시간 |
| **거짓 양성** | 잘못된 실패로 인한 시간 낭비 |

```csharp
// 나쁜 테스트 — 유지 비용 높음
[Test]
public void User_Should_Have_Email_Set_After_Construction()
{
    var user = new User("test@example.com", "John", "Doe");

    Assert.That(user.Email, Is.EqualTo("test@example.com"));
    Assert.That(user.FirstName, Is.EqualTo("John"));
    Assert.That(user.LastName, Is.EqualTo("Doe"));
    Assert.That(user.FullName, Is.EqualTo("John Doe"));
    Assert.That(user.CreatedAt, Is.Not.Null);
    Assert.That(user.IsActive, Is.True);
}

// 좋은 테스트 — 하나의 동작, 하나의 검증
[Test]
public void New_user_is_active_by_default()
{
    var user = new User("test@example.com", "John", "Doe");

    Assert.That(user.IsActive, Is.True);
}
```

### 가치 vs 비용

모든 테스트는 가치와 비용의 균형이다:

```
가치 = 회귀 보호 + 리팩토링 지원 + 문서화
비용 = 작성 + 유지 + 실행 + 인지

ROI = 가치 / 비용

목표: ROI 최대화 (테스트 수 최대화가 아님!)
```

## 1.3 좋은 테스트 vs 나쁜 테스트

### 테스트 스위트의 유형

![테스트 분류](/images/blog/khorikov/diagrams/ch01-test-classification.svg)

| 유형 | 가치 | 비용 | 판정 |
|------|------|------|------|
| **좋은 테스트** | 높음 | 적절함 | 유지 |
| **쓸모없는 테스트** | 낮음 | 낮음 | 삭제 고려 |
| **나쁜 테스트** | 낮음 | 높음 | 반드시 삭제 |

### 나쁜 테스트의 특징

```csharp
// 1. 구현 세부사항에 결합
[Test]
public void Should_Call_Repository_Save()
{
    var mockRepo = new Mock<IUserRepository>();
    var service = new UserService(mockRepo.Object);

    service.CreateUser("test@example.com");

    // 💥 구현을 테스트 — 리팩토링하면 깨짐
    mockRepo.Verify(r => r.Save(It.IsAny<User>()), Times.Once);
}

// 2. 비결정적 (flaky)
[Test]
public void User_age_is_calculated_correctly()
{
    var user = new User { BirthDate = new DateTime(1990, 5, 15) };

    // 💥 시간에 의존 — 매년 결과가 바뀜
    Assert.That(user.Age, Is.EqualTo(34));
}

// 3. 테스트 간 의존성
private static User _sharedUser;

[Test, Order(1)]
public void Create_user()
{
    _sharedUser = new User("test@example.com");
}

[Test, Order(2)]
public void User_email_is_set()
{
    // 💥 첫 번째 테스트가 실패하면 이것도 실패
    Assert.That(_sharedUser.Email, Is.EqualTo("test@example.com"));
}
```

## 1.4 테스트의 4가지 기둥 (미리보기)

좋은 테스트를 판단하는 4가지 기준:

| 기둥 | 설명 | 반대 |
|------|------|------|
| **회귀 보호** | 버그를 잡아내는 능력 | 버그 놓침 |
| **리팩토링 내성** | 거짓 양성 없이 리팩토링 가능 | 거짓 양성 |
| **빠른 피드백** | 빠르게 실행 | 느린 실행 |
| **유지보수성** | 읽고 수정하기 쉬움 | 복잡함 |

```
                    회귀 보호
                       △
                      ╱ ╲
                     ╱   ╲
                    ╱     ╲
                   ╱   ?   ╲
                  ╱         ╲
                 ╱           ╲
                ▽─────────────▽
        리팩토링 내성        빠른 피드백

        (유지보수성은 항상 최대화)
```

**핵심 통찰:**
- 회귀 보호, 리팩토링 내성, 빠른 피드백 중 **2개만** 최대화 가능
- 유지보수성은 항상 추구해야 함
- 각 테스트 유형(단위/통합/E2E)은 다른 기둥에 집중

## 1.5 커버리지 메트릭의 함정

### 코드 커버리지 ≠ 테스트 품질

```csharp
public decimal CalculateDiscount(Customer customer, decimal amount)
{
    if (customer.IsPremium)
        return amount * 0.2m;
    return 0;
}

// 100% 커버리지 달성!
[Test]
public void Test()
{
    var calculator = new DiscountCalculator();
    var customer = new Customer { IsPremium = true };

    calculator.CalculateDiscount(customer, 100);
    // Assert 없음 — 아무것도 검증 안 함
}
```

### 커버리지 메트릭의 문제

| 메트릭 | 한계 |
|--------|------|
| **라인 커버리지** | 실행 ≠ 검증 |
| **분기 커버리지** | 비즈니스 로직 커버 안 함 |
| **조건 커버리지** | 조합 폭발 |

**올바른 사용법:**
- 커버리지는 **하한선** 지표로만 사용
- "80% 이상" 같은 목표는 의미 없음
- 낮은 커버리지 = 문제, 높은 커버리지 ≠ 좋음

## 1.6 프로젝트 유형별 테스트 전략

### 프로젝트 특성에 따른 접근

| 프로젝트 유형 | 테스트 전략 |
|---------------|-------------|
| **스타트업/MVP** | 핵심 비즈니스 로직만 테스트 |
| **레거시 시스템** | 변경할 부분 주변에 테스트 추가 |
| **장기 프로젝트** | 포괄적인 테스트 스위트 구축 |
| **단발성 스크립트** | 테스트 최소화 또는 없음 |

### 테스트 작성 우선순위

```
1순위: 비즈니스 핵심 로직
       └─ 도메인 모델, 중요 알고리즘

2순위: 외부 시스템 연동
       └─ API 경계, 데이터 변환

3순위: 복잡한 조건 분기
       └─ 권한, 유효성 검증

낮은 우선순위:
- 단순 CRUD
- 설정 코드
- UI 레이아웃
```

## 정리

| 개념 | 핵심 |
|------|------|
| **테스트의 목적** | 지속 가능한 프로젝트 성장 |
| **테스트도 코드** | 가치 vs 비용 균형 필요 |
| **좋은 테스트** | 4가지 기둥 충족 |
| **커버리지** | 지표일 뿐, 목표 아님 |
| **전략** | 프로젝트 특성에 맞게 |

**핵심 질문:**
> 이 테스트가 프로젝트의 지속 가능한 성장에 기여하는가?

## 다음 장 예고

다음 장에서는 "단위 테스트란 무엇인가"를 정의한다. London 학파와 Classical 학파의 차이, 그리고 테스트 "단위"의 정의를 살펴본다.
