---
title: "Ch 20: 비즈니스 규칙"
date: 2025-06-06T03:00:00
description: "Entities는 핵심 비즈니스 규칙, Use Cases는 앱별 규칙. 가장 안 변하는 시스템의 코어."
tags: [Architecture, BusinessRules, Entities, UseCases]
series: "Clean Architecture"
seriesOrder: 20
---

## 이 챕터의 메시지

19장이 정책 일반을 다뤘다면, 20장은 그중에서도 가장 중요한 — **비즈니스 규칙**을 다룬다.

Martin은 비즈니스 규칙을 두 종류로 나눈다.

1. **Critical Business Rules** (핵심 비즈니스 규칙) — Entities
2. **Application-Specific Business Rules** (앱별 비즈니스 규칙) — Use Cases

이 둘이 시스템의 가장 깊은 부분에 자리한다.

## Critical Business Rules — Entities

> **컴퓨터가 없어도 비즈니스가 적용하는 규칙들.**

은행이 시작된 이래 항상 적용된 규칙: "잔고는 음수가 될 수 없다", "이자는 원금에 비례한다". 이런 규칙들은 컴퓨터 시대 이전부터 있었다.

이 규칙들은 **소프트웨어 시스템과 무관**하다. 수기로 처리하든, 메인프레임에서 처리하든, 웹에서 처리하든 동일하다.

Martin은 이걸 담는 객체를 **Entities**라고 부른다.

```java
class Loan {
  private Money principal;
  private InterestRate rate;
  private Period period;
  
  public Money makePayment(Money payment) {
    // 핵심 비즈니스 규칙: 이자 계산, 잔액 갱신
    Money interest = principal.times(rate);
    Money newPrincipal = principal.plus(interest).minus(payment);
    // ...
  }
}
```

`Loan`은 데이터(principal, rate, period)와 그 데이터에 대한 핵심 규칙(`makePayment`)을 묶는다. 데이터베이스, UI, 프레임워크에 무관하다.

## Application-Specific Business Rules — Use Cases

> **특정 시스템이 그 비즈니스 규칙을 어떻게 적용하는가에 관한 규칙.**

같은 핵심 규칙(이자 계산)이라도 시스템마다 다르게 사용된다.

- 은행 텔러 앱: 텔러가 직접 입력 → 잔액 갱신
- 모바일 앱: 사용자가 직접 → 잔액 갱신 + 알림
- 배치 시스템: 야간에 자동 → 잔액 갱신 + 로그

각 시나리오의 흐름이 다르다. 그 흐름이 **Use Case**다.

```java
class CreateLoanUseCase {
  private LoanRepository repo;
  private CreditService credit;
  
  public LoanResponse create(LoanRequest req) {
    // Use case별 규칙: 신용 확인, 한도 체크, 저장
    if (!credit.isCreditworthy(req.customerId)) {
      return LoanResponse.denied();
    }
    Loan loan = new Loan(req.amount, req.rate, req.period);
    repo.save(loan);
    return LoanResponse.success(loan.id);
  }
}
```

`CreateLoanUseCase`는 어떤 흐름으로 Loan을 만드는지 정의한다. 그 안에서 핵심 규칙(`new Loan(...)`)을 활용한다.

## Entities vs Use Cases의 분리

**Entities**:
- 핵심 비즈니스 규칙
- 어떤 시스템에서도 같음
- 가장 안 변함

**Use Cases**:
- 앱별 비즈니스 규칙
- 시스템마다 다름
- Entities보다 자주 변함

따라서 **Use Cases가 Entities에 의존**한다. 그 반대가 아니다.

```
[Use Case]
    ↓
[Entity]
```

Use Case가 변해도 Entity는 안 변한다. Entity가 변하면(매우 드물게) Use Case가 영향받는다.

## Request / Response 모델

Use Case의 입출력 형태도 신중히 디자인한다.

```java
class LoanRequest {  // 입력 데이터 객체
  String customerId;
  Money amount;
  InterestRate rate;
  Period period;
}

class LoanResponse {  // 출력 데이터 객체
  String loanId;
  Status status;
  String denialReason;
}
```

**왜 이런 단순 데이터 객체를 쓰는가?**

Use Case가 외부 세계와 통신하는 유일한 형태가 이 객체들이다. 외부가 HTTP든, gRPC든, CLI든 상관없이 — 모두 LoanRequest로 변환되어 들어오고, LoanResponse로 나간다.

**중요한 규칙** — 이 데이터 객체에 **프레임워크 의존이 없어야** 한다. 평범한 자바 빈, plain dataclass. JSON 어노테이션이나 ORM 어노테이션이 붙으면 안 된다 — 그건 디테일이 정책 안으로 들어오는 것이다.

## "비즈니스 규칙은 시스템의 본질"

Martin이 강조하는 핵심 메시지.

> **The Business Rules are the reason a software system exists. They are the core functionality. Without them, the system would have no value.**

비즈니스 규칙이 시스템의 존재 이유다. 다른 모든 것(DB, UI, framework)은 그 규칙이 사용자에게 도달하게 하는 **수단**일 뿐이다.

따라서 비즈니스 규칙은:
- 가장 깊은 곳에 둔다
- 외부 변화로부터 격리한다
- 가장 신중히 짜고 가장 잘 테스트한다

## 정리

- 비즈니스 규칙 = **시스템의 존재 이유**
- 두 종류 — **Entities** (핵심, 어떤 시스템에서도 같음) / **Use Cases** (앱별 흐름)
- Use Cases가 Entities에 의존 (반대 아님)
- Request/Response는 단순 데이터 객체 — **프레임워크 의존 없음**
- 비즈니스 규칙은 가장 깊은 곳, 가장 격리된 곳

## 다음 장 예고

다음 장은 **Screaming Architecture** — 시스템의 구조를 보면 그 시스템이 무엇을 하는지 즉시 알 수 있어야 한다.

## 관련 항목

- [Ch 19: 정책과 수준](/blog/programming/design/clean-architecture/chapter19-policy-and-level) — Entities는 최고 수준
- [DDD](/blog/programming/design/domain-driven-design/) — Entity / Aggregate의 더 깊은 다룸
