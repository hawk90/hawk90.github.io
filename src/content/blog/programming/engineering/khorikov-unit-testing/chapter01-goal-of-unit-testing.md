---
title: "Ch 1: The Goal of Unit Testing"
date: 2026-05-10T01:00:00
description: "테스트의 목적은 지속 가능한 소프트웨어 성장이다. 가치와 비용의 균형으로 좋은 테스트를 판단한다."
tags: [TDD, Unit Testing, Goal]
series: "Khorikov Unit Testing"
seriesOrder: 1
draft: true

---

단위 테스트를 왜 작성하는가? "버그를 잡기 위해"가 일반적인 답이다. Khorikov는 더 근본적인 목적을 제시한다. 단위 테스트의 진짜 가치는 **지속 가능한 프로젝트 성장**에 있다.

## 1.1 단위 테스트의 진짜 목적

### 버그 잡기가 아닌 이유

버그를 잡는 것은 부수 효과다. 단기적으로는 테스트가 곧 버그 탐지기처럼 느껴지지만, 장기적으로는 사정이 다르다. 다음 표가 그 차이를 정리한다.

| 관점 | 버그 잡기 중심 | 지속 가능한 성장 중심 |
|------|----------------|------------------------|
| 시간 지평 | 단기 | 장기 |
| 테스트의 의미 | 비용 | 투자 |
| 추구하는 양 | 많을수록 좋다 | 가치 있는 만큼 |
| 평가 지표 | 커버리지 숫자 | 비즈니스 가치 |

핵심은 한 문장으로 요약된다.

> 테스트 스위트가 프로젝트의 지속 가능한 성장을 가능하게 한다.

### 소프트웨어 엔트로피

테스트 없는 프로젝트는 시간이 지나면서 변경 비용이 급격히 증가한다. 작은 수정이 멀리 떨어진 코드를 깨고, 그 수정이 또 다른 회귀를 부르는 순환에 빠진다.

![비용 vs 시간](/images/blog/khorikov/diagrams/ch01-cost-time-graph.svg)

테스트가 있는 프로젝트와 없는 프로젝트의 차이는 다음과 같다.

| 측면 | 테스트가 있는 코드 | 테스트가 없는 코드 |
|------|--------------------|---------------------|
| 변경 자신감 | 안전망이 있어 과감하게 수정한다 | "건드리면 안 돼" 코드가 늘어난다 |
| 회귀 발견 시점 | 변경 직후 | 운영 환경에서 |
| 리팩토링 | 자유롭게 시도한다 | 기술 부채가 누적된다 |
| 문서화 | 테스트가 사용 예제다 | 결국 재작성을 고려한다 |

## 1.2 테스트도 코드다

### 테스트의 비용

테스트는 공짜가 아니다. 다음 다섯 가지 비용이 실제로 든다.

| 비용 항목 | 설명 |
|-----------|------|
| 작성 비용 | 테스트 코드를 만드는 시간 |
| 유지 비용 | 프로덕션 코드 변경 시 테스트 수정 |
| 실행 비용 | CI/CD 파이프라인 시간 |
| 인지 비용 | 테스트를 읽고 의도를 파악하는 시간 |
| 거짓 양성 | 잘못된 실패로 인한 시간 낭비 |

다음은 동일한 동작을 검증하지만 비용 구조가 완전히 다른 두 테스트다.

```csharp
// 회피 — 유지 비용이 높다
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

// Good — 하나의 동작, 하나의 검증
[Test]
public void New_user_is_active_by_default()
{
    var user = new User("test@example.com", "John", "Doe");

    Assert.That(user.IsActive, Is.True);
}
```

### 가치와 비용의 균형

모든 테스트는 가치와 비용의 균형 위에 서 있다. 가치는 회귀 보호, 리팩토링 지원, 살아 있는 문서화에서 나오고 비용은 위의 다섯 항목에서 나온다. 둘의 비율을 ROI로 보면 목표가 분명해진다.

```text
가치 = 회귀 보호 + 리팩토링 지원 + 문서화 효과
비용 = 작성 + 유지 + 실행 + 인지 + 거짓 양성

ROI = 가치 ÷ 비용

목표: ROI를 최대화한다. 테스트 수의 최대화가 아니다.
```

## 1.3 좋은 테스트와 나쁜 테스트

### 테스트 스위트의 유형

테스트는 가치와 비용의 조합에 따라 세 부류로 갈린다.

![테스트 분류](/images/blog/khorikov/diagrams/ch01-test-classification.svg)

| 유형 | 가치 | 비용 | 판정 |
|------|------|------|------|
| 좋은 테스트 | 높음 | 적절함 | 유지한다 |
| 쓸모없는 테스트 | 낮음 | 낮음 | 삭제를 고려한다 |
| 나쁜 테스트 | 낮음 | 높음 | 반드시 삭제한다 |

### 나쁜 테스트의 특징

나쁜 테스트는 흔히 다음 세 가지 모습으로 나타난다. 모두 회귀를 막기보다 회귀처럼 보이는 거짓 신호를 만들어 낸다.

```csharp
// 1. 구현 세부사항에 결합한 테스트
[Test]
public void Should_Call_Repository_Save()
{
    var mockRepo = new Mock<IUserRepository>();
    var service = new UserService(mockRepo.Object);

    service.CreateUser("test@example.com");

    // 구현을 검증한다 — 리팩토링하면 깨진다
    mockRepo.Verify(r => r.Save(It.IsAny<User>()), Times.Once);
}

// 2. 비결정적 테스트
[Test]
public void User_age_is_calculated_correctly()
{
    var user = new User { BirthDate = new DateTime(1990, 5, 15) };

    // 시간에 의존한다 — 매년 결과가 바뀐다
    Assert.That(user.Age, Is.EqualTo(34));
}

// 3. 테스트 사이의 의존성
private static User _sharedUser;

[Test, Order(1)]
public void Create_user()
{
    _sharedUser = new User("test@example.com");
}

[Test, Order(2)]
public void User_email_is_set()
{
    // 첫 번째 테스트가 실패하면 이것도 실패한다
    Assert.That(_sharedUser.Email, Is.EqualTo("test@example.com"));
}
```

## 1.4 테스트의 4가지 기둥 (미리 보기)

좋은 테스트는 네 가지 기준으로 평가한다. 자세한 내용은 4장에서 다룬다.

| 기둥 | 설명 | 반대 모습 |
|------|------|-----------|
| 회귀 보호 | 버그를 잡아내는 능력 | 버그를 놓친다 |
| 리팩토링 내성 | 거짓 양성 없이 리팩토링이 가능하다 | 거짓 양성이 자주 발생한다 |
| 빠른 피드백 | 빠르게 실행된다 | 실행이 느리다 |
| 유지보수성 | 읽고 수정하기 쉽다 | 복잡하다 |

핵심 통찰은 셋 중 둘만 동시에 최대화할 수 있다는 점이다. 회귀 보호, 리팩토링 내성, 빠른 피드백은 한쪽을 높이면 다른 한쪽이 낮아진다. 유지보수성은 예외이며 항상 최대로 유지한다. 단위 테스트, 통합 테스트, E2E 테스트는 각각 다른 기둥에 집중한다.

## 1.5 커버리지 메트릭의 함정

### 코드 커버리지는 테스트 품질이 아니다

다음 테스트는 100% 커버리지를 달성한다. 그러나 아무것도 검증하지 않는다.

```csharp
public decimal CalculateDiscount(Customer customer, decimal amount)
{
    if (customer.IsPremium)
        return amount * 0.2m;
    return 0;
}

// 100% 커버리지가 나오지만 가치는 0이다
[Test]
public void Test()
{
    var calculator = new DiscountCalculator();
    var customer = new Customer { IsPremium = true };

    calculator.CalculateDiscount(customer, 100);
    // Assert가 없다 — 아무것도 검증하지 않는다
}
```

### 커버리지 메트릭의 한계

| 메트릭 | 한계 |
|--------|------|
| 라인 커버리지 | 실행은 검증이 아니다 |
| 분기 커버리지 | 비즈니스 로직을 커버하지 못한다 |
| 조건 커버리지 | 조합이 폭발한다 |

커버리지는 하한선 지표로만 쓴다. "80% 이상"이라는 목표는 그 자체로는 의미가 없다. 낮은 커버리지는 분명히 문제지만, 높은 커버리지가 곧 좋은 테스트는 아니다.

## 1.6 프로젝트 유형별 테스트 전략

프로젝트 특성에 따라 적정한 테스트 양과 깊이가 다르다.

| 프로젝트 유형 | 테스트 전략 |
|---------------|-------------|
| 스타트업이나 MVP | 핵심 비즈니스 로직만 테스트한다 |
| 레거시 시스템 | 변경할 부분 주변에 테스트를 추가한다 |
| 장기 프로젝트 | 포괄적인 테스트 스위트를 구축한다 |
| 단발성 스크립트 | 테스트를 최소화하거나 생략한다 |

테스트를 새로 작성할 때는 다음 순서로 우선순위를 둔다. 비즈니스 핵심 로직이 가장 위에 오고, 단순 CRUD나 설정 코드는 가장 아래에 둔다.

- 1순위: 도메인 모델, 중요한 알고리즘
- 2순위: API 경계, 데이터 변환 같은 외부 시스템 연동
- 3순위: 권한과 유효성 검증 같은 복잡한 조건 분기
- 후순위: 단순 CRUD, 설정, UI 레이아웃

## 자주 보는 함정

다음 다섯 가지는 책 전반에서 반복적으로 경고하는 함정이다.

- **커버리지 숫자 추구**: 80%를 목표로 삼는 순간 의미 없는 테스트가 양산된다.
- **모든 클래스에 단위 테스트 강제**: 단순 데이터 객체나 trivial 코드까지 테스트하면 비용만 늘어난다.
- **테스트 작성을 미루기**: 기능을 다 만든 다음에 테스트를 붙이면 설계가 이미 결합되어 있어 작성이 힘들다.
- **거짓 양성을 방치**: 잠깐 무시한 거짓 양성이 누적되면 결국 테스트 전체에 대한 신뢰가 사라진다.
- **테스트 코드를 일회용으로 취급**: 테스트도 코드다. 같은 품질 기준으로 리뷰하고 리팩토링해야 한다.

## 정리

- 단위 테스트의 목적은 버그 탐지가 아니라 프로젝트의 지속 가능한 성장이다.
- 테스트도 코드이므로 가치와 비용의 균형이 ROI를 결정한다.
- 좋은 테스트는 회귀 보호, 리팩토링 내성, 빠른 피드백, 유지보수성을 갖춘다.
- 커버리지 메트릭은 하한선 지표일 뿐 목표가 되어서는 안 된다.
- 테스트 전략은 프로젝트 특성에 맞춰 우선순위를 정해야 한다.
- 모든 코드를 동일한 강도로 테스트하면 비용 곡선이 가치를 추월한다.

핵심 질문은 한 가지다.

> 이 테스트가 프로젝트의 지속 가능한 성장에 기여하는가?

## 다음 장 예고

다음 장에서는 "단위 테스트란 무엇인가"라는 정의 문제를 다룬다. London 학파와 Classical 학파의 차이를 살펴보고, 테스트 "단위"를 어떻게 정의해야 하는지 짚는다.

## 관련 항목

- [Ch 2: What Is a Unit Test?](/blog/programming/engineering/khorikov-unit-testing/chapter02-what-is-unit-test)
- [Ch 4: The Four Pillars of a Good Unit Test](/blog/programming/engineering/khorikov-unit-testing/chapter04-four-pillars)
- [TDD by Example](/blog/programming/engineering/tdd-by-example/ch01) — Kent Beck의 TDD 입문서
- [GOOS](/blog/programming/engineering/goos/chapter01-what-is-tdd) — London 학파의 대표 텍스트
- [Working Effectively with Legacy Code](/blog/programming/engineering/legacy-code/ch01) — 테스트 없는 코드를 안전하게 변경하는 법
