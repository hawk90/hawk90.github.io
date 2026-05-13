---
title: "Unit Testing: Principles, Practices, Patterns (Khorikov) — 시리즈 개요"
date: 2025-10-15T00:00:00
description: "Vladimir Khorikov의 모던 단위 테스트 가이드. classicist vs mockist 정리."
tags: [TDD, Unit Testing, Khorikov, Series]
series: "Khorikov Unit Testing"
seriesOrder: 0
---

## 이 시리즈에 대하여

Vladimir Khorikov의 *Unit Testing: Principles, Practices, and Patterns* (Manning, 2020)을 기반으로 한 단위 테스트 학습 시리즈다.

```
┌─────────────────────────────────────────────────────────────┐
│              Unit Testing Principles                        │
│                                                             │
│    "좋은 테스트는 프로젝트의 지속 가능한 성장을 돕는다"       │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  회귀 방지   │  │리팩토링 내성│  │ 빠른 피드백  │        │
│  │ Regression  │  │ Refactoring │  │   Fast      │        │
│  │ Protection  │  │ Resistance  │  │  Feedback   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │               │               │                  │
│         └───────────────┼───────────────┘                  │
│                         │                                   │
│                  ┌──────┴──────┐                           │
│                  │  유지보수성  │                           │
│                  │Maintainability│                          │
│                  └─────────────┘                           │
│                                                             │
│          "4가지 기둥 위에 세워진 테스트 가치"                │
└─────────────────────────────────────────────────────────────┘
```

### 왜 이 책인가?

| 특징 | 설명 |
|------|------|
| **모던 시각** | Classical vs London 학파 논쟁을 객관적으로 정리 |
| **실용적 접근** | 이론보다 실제 적용 가능한 가이드라인 |
| **4가지 기둥** | 좋은 테스트를 판단하는 명확한 기준 제시 |
| **통합 테스트** | 단위 테스트의 한계와 통합 테스트 역할 균형 |
| **안티패턴** | 흔한 실수와 해결책 |

### 테스트 3대 시리즈

```
┌─────────────────────────────────────────────────────────────┐
│                    테스트 3대장                              │
│                                                             │
│  ┌───────────────┐   ┌───────────────┐   ┌──────────────┐  │
│  │  TDD by       │   │    GOOS       │   │ Unit Testing │  │
│  │  Example      │   │               │   │  (Khorikov)  │  │
│  │               │   │ Growing OO    │   │              │  │
│  │  Kent Beck    │   │ Software      │   │  Principles, │  │
│  │  (2002)       │   │ (2009)        │   │  Practices,  │  │
│  │               │   │               │   │  Patterns    │  │
│  │  TDD 입문     │   │ London 학파   │   │  (2020)      │  │
│  │  기본 원칙    │   │ Outside-In    │   │              │  │
│  │               │   │ Mock 중심     │   │  모던 정리   │  │
│  └───────────────┘   └───────────────┘   └──────────────┘  │
│         │                   │                    │          │
│         │                   │                    │          │
│    TDD 시작           London 심화         균형잡힌 시각     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 시리즈 구성

### Part 1: The Bigger Picture (Ch 1-3)

| 장 | 제목 | 핵심 내용 |
|----|------|-----------|
| **Ch 1** | Goal of Unit Testing | 테스트의 목적 — 지속 가능한 성장 |
| **Ch 2** | What is a Unit Test | London vs Classical 학파 비교 |
| **Ch 3** | Anatomy of a Unit Test | AAA 패턴, 네이밍, 테스트 구조 |

**Part 1 핵심:** 단위 테스트의 "왜"와 "무엇"을 이해한다.

### Part 2: Making Tests Work for You (Ch 4-7)

| 장 | 제목 | 핵심 내용 |
|----|------|-----------|
| **Ch 4** | Four Pillars of a Good Test | 회귀 방지, 리팩토링 내성, 빠른 피드백, 유지보수성 |
| **Ch 5** | Mocks and Test Fragility | Mock vs Stub, Managed vs Unmanaged |
| **Ch 6** | Styles of Unit Testing | Output / State / Communication 기반 |
| **Ch 7** | Refactoring Toward Valuable Tests | 코드 4분류, Humble Object 패턴 |

**Part 2 핵심:** 좋은 테스트를 판단하고 개선하는 방법을 배운다.

### Part 3: Integration Testing (Ch 8-10)

| 장 | 제목 | 핵심 내용 |
|----|------|-----------|
| **Ch 8** | Why Integration Testing | 단위 테스트의 한계, 테스트 피라미드 |
| **Ch 9** | Mocking Best Practices | 시스템 경계에서만 Mock, Wrapper 패턴 |
| **Ch 10** | Testing the Database | 실제 DB, 격리 전략, 테스트 데이터 |

**Part 3 핵심:** 통합 테스트의 역할과 실전 적용법을 익힌다.

### Part 4: Anti-Patterns (Ch 11)

| 장 | 제목 | 핵심 내용 |
|----|------|-----------|
| **Ch 11** | Unit Testing Anti-Patterns | Private 테스트, 시간 누수, 코드 오염 |

**Part 4 핵심:** 피해야 할 안티패턴을 정리하고 시리즈를 마무리한다.

## 핵심 개념 미리보기

### Two Schools: London vs Classical

```
┌──────────────────────────────────────────────────────────────┐
│                     두 학파 비교                              │
│                                                              │
│   Classical (Detroit)              London (Mockist)          │
│   ─────────────────               ─────────────────          │
│                                                              │
│   "단위 = 동작"                    "단위 = 클래스"            │
│   실제 협력자 사용                  모든 의존성 Mock           │
│   상태 검증                        상호작용 검증              │
│   Inside-Out                      Outside-In                │
│                                                              │
│   ┌─────────┐                     ┌─────────┐               │
│   │   SUT   │                     │   SUT   │               │
│   └────┬────┘                     └────┬────┘               │
│        │                               │                     │
│   ┌────┴────┐                     ┌────┴────┐               │
│   │ 실제    │                     │  Mock   │               │
│   │ 협력자  │                     │ 협력자  │               │
│   └─────────┘                     └─────────┘               │
│                                                              │
│   장점: 리팩토링 내성              장점: 격리, 빠른 실행      │
│   단점: 실패 원인 추적 어려움      단점: 취약한 테스트        │
│                                                              │
│              Khorikov의 결론: Classical 선호                 │
│              (Mock은 시스템 경계에서만)                       │
└──────────────────────────────────────────────────────────────┘
```

### Four Pillars of Good Tests

```
              회귀 방지                     리팩토링 내성
                 │                              │
    "버그를 잡아내는가?"            "리팩토링해도 안 깨지는가?"
                 │                              │
                 └──────────┬──────────────────┘
                            │
                     ┌──────┴──────┐
                     │ 테스트 가치  │
                     │   공식:     │
                     │ P×R×F×M    │
                     └──────┬──────┘
                            │
                 ┌──────────┴──────────┐
                 │                      │
          빠른 피드백                유지보수성
                 │                      │
    "빠르게 실행되는가?"       "읽고 수정하기 쉬운가?"
```

### Test Styles Comparison

| 스타일 | 설명 | 리팩토링 내성 | 유지보수 |
|--------|------|---------------|----------|
| **Output-based** | 반환값만 검증 | 최고 | 최고 |
| **State-based** | 상태 변화 검증 | 높음 | 중간 |
| **Communication-based** | 협력자 호출 검증 | 낮음 | 낮음 |

### Code 4-Quadrant

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

## 학습 경로

```
┌─────────────────────────────────────────────────────────────┐
│                     학습 경로                                │
│                                                             │
│  Week 1: 기초 (Part 1)                                      │
│  ─────────────────────                                      │
│  Ch 1-3: 테스트 목적, 학파, 구조                             │
│                                                             │
│                    ▼                                        │
│                                                             │
│  Week 2: 좋은 테스트 (Part 2 전반)                          │
│  ──────────────────────────────                             │
│  Ch 4-5: 4가지 기둥, Mock과 취약성                          │
│                                                             │
│                    ▼                                        │
│                                                             │
│  Week 3: 스타일과 리팩토링 (Part 2 후반)                    │
│  ─────────────────────────────────                          │
│  Ch 6-7: 테스트 스타일, 코드 분류                           │
│                                                             │
│                    ▼                                        │
│                                                             │
│  Week 4: 통합 테스트 (Part 3)                               │
│  ───────────────────────────                                │
│  Ch 8-10: 통합 테스트, Mock 모범 사례, DB 테스트            │
│                                                             │
│                    ▼                                        │
│                                                             │
│  Week 5: 마무리 (Part 4)                                    │
│  ─────────────────────                                      │
│  Ch 11: 안티패턴, 시리즈 정리                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 환경 설정

### C# + NUnit

```csharp
// 기본 테스트 구조
using NUnit.Framework;

[TestFixture]
public class CalculatorTests
{
    [Test]
    public void Sum_TwoPositiveNumbers_ReturnsCorrectResult()
    {
        // Arrange
        var calculator = new Calculator();

        // Act
        int result = calculator.Sum(2, 3);

        // Assert
        Assert.That(result, Is.EqualTo(5));
    }
}
```

### Mock 라이브러리 (Moq)

```csharp
using Moq;

[Test]
public void Service_calls_external_api()
{
    // Arrange
    var mockApi = new Mock<IExternalApi>();
    mockApi.Setup(a => a.GetData()).Returns("test");

    var service = new MyService(mockApi.Object);

    // Act
    service.Process();

    // Assert
    mockApi.Verify(a => a.GetData(), Times.Once);
}
```

## 관련 자료

### 필독서

| 책 | 저자 | 특징 |
|----|------|------|
| **TDD by Example** | Kent Beck | TDD 입문, 기본 원칙 |
| **GOOS** | Freeman & Pryce | London 학파, Outside-In |
| **xUnit Test Patterns** | Meszaros | 패턴 카탈로그 |
| **Clean Code** | Robert Martin | 테스트 관련 장 |

### 온라인 자료

- [Vladimir Khorikov 블로그](https://enterprisecraftsmanship.com/)
- [Pluralsight 코스](https://www.pluralsight.com/) (저자 강의)
- [NUnit Documentation](https://docs.nunit.org/)

## 시리즈 목차

1. [Ch 1: Goal of Unit Testing](./chapter01-goal-of-unit-testing) — 테스트의 목적
2. [Ch 2: What is a Unit Test](./chapter02-what-is-unit-test) — London vs Classical
3. [Ch 3: Anatomy of a Unit Test](./chapter03-anatomy) — AAA 패턴, 네이밍
4. [Ch 4: Four Pillars of a Good Test](./chapter04-four-pillars) — 4가지 기둥
5. [Ch 5: Mocks and Test Fragility](./chapter05-mocks-fragility) — Mock과 취약성
6. [Ch 6: Styles of Unit Testing](./chapter06-styles) — Output/State/Communication
7. [Ch 7: Refactoring Toward Valuable Tests](./chapter07-refactoring) — 코드 4분류
8. [Ch 8: Why Integration Testing](./chapter08-why-integration) — 통합 테스트
9. [Ch 9: Mocking Best Practices](./chapter09-mocking-best-practices) — Mock 모범 사례
10. [Ch 10: Testing the Database](./chapter10-testing-database) — DB 테스트
11. [Ch 11: Unit Testing Anti-Patterns](./chapter11-anti-patterns) — 안티패턴

## 핵심 질문

시리즈를 진행하면서 다음 질문들에 답할 수 있게 된다:

1. **좋은 테스트란 무엇인가?** → 4가지 기둥
2. **Mock을 언제 사용해야 하는가?** → 시스템 경계에서만
3. **테스트 스타일 중 어떤 것이 좋은가?** → Output-based > State > Communication
4. **어떤 코드를 테스트해야 하는가?** → Domain Model 집중
5. **통합 테스트는 언제 필요한가?** → 단위 테스트의 한계 보완

**시리즈 핵심 메시지:**
> 테스트의 목적은 버그를 잡는 것이 아니라, 프로젝트의 **지속 가능한 성장**을 돕는 것이다.
