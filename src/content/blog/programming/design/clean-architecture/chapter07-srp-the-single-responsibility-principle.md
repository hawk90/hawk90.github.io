---
title: "Ch 7: SRP — 단일 책임 원칙"
date: 2025-06-03T01:00:00
description: "흔한 오해와 달리 SRP는 '한 가지 일만 하라'가 아니다. 한 모듈은 한 종류의 사용자(actor)에 대해서만 책임진다."
tags: [Architecture, SOLID, SRP]
series: "Clean Architecture"
seriesOrder: 7
---

## 이 챕터의 메시지

SOLID의 첫 번째 원칙. 거의 모든 책에서 가장 자주 잘못 인용되는 원칙이기도 하다. Martin은 이 챕터를 통해 SRP의 진짜 의미를 다시 못 박는다.

> **A module should be responsible to one, and only one, actor.**

한 모듈은 한 명의 **actor**(사용자/이해관계자)에게만 책임진다.

"한 가지 일만 하라"가 아니다. **한 actor에 대해서만 변경 이유를 가진다**가 정확한 의미다.

## 흔한 오해 — "한 가지 일"

SRP를 처음 듣는 사람은 거의 모두 같은 해석을 한다.

> "함수는 한 가지 일만 해야 한다. 클래스도 한 가지 일만."

Martin은 이 해석이 잘못됐다고 명확히 한다. "한 가지 일"이라는 표현은 함수 추출(Extract Function)의 가이드라인으로는 맞다. 하지만 SRP는 함수가 아니라 **모듈**에 관한 원칙이고, 의도하는 바가 다르다.

> "It's a function that should do one thing. SRP says: a module should have one, and only one, reason to change."

## SRP의 진짜 정의 — actor

Martin이 강조하는 SRP의 의미.

**한 모듈은 한 actor에게만 책임진다.**

**actor**는 그 모듈의 변경 요구를 만들어 내는 한 묶음의 사용자/이해관계자다. 다음 모두가 다른 actor가 될 수 있다.

- CEO / CFO / CTO / COO
- 마케팅 팀 / 개발 팀
- 외부 클라이언트 A / B / C
- 정부 규제 / 비즈니스 비즈니스 규칙

한 모듈을 두 actor가 동시에 바꿔야 한다면 — **SRP 위반**이다. 한 쪽의 변경이 다른 쪽에 의도치 않은 영향을 줄 수 있다.

## 사례 — Employee 클래스

Martin은 책에서 다음 예를 든다.

```java
class Employee {
  public Money calculatePay() { ... }
  public void save() { ... }
  public String reportHours() { ... }
}
```

세 메서드가 한 클래스에 있다. SRP 위반인가?

세 메서드의 변경 이유를 본다.

- `calculatePay()` — **CFO**의 요구로 바뀐다 (급여 계산 규칙)
- `save()` — **DBA**의 요구로 바뀐다 (데이터베이스 스키마)
- `reportHours()` — **COO**의 요구로 바뀐다 (인사 보고서 형식)

세 actor가 한 클래스를 동시에 만진다. **SRP 위반**이다.

### 무엇이 잘못될까

흔한 시나리오 — CFO가 급여 계산 규칙을 바꾼다. 그런데 calculatePay와 reportHours가 공통 helper 메서드 `regularHours()`를 사용한다고 하자.

CFO 요구를 처리하는 개발자가 `regularHours`의 동작을 바꾼다. CFO 입장에서는 OK다. 그러나 COO에게도 영향이 간다 — reportHours의 결과가 바뀐다.

COO는 자신은 아무 요구도 하지 않았는데 보고서가 달라진 걸 발견한다. 누가 책임지나? 추적이 어렵다.

이게 SRP 위반의 실제 결과다 — **한 actor의 변경이 다른 actor에게 영향을 준다**.

## 해결 — 분리

```java
class Employee { /* 데이터만 */ }

class PayCalculator {
  public Money calculatePay(Employee e) { ... }
}

class HourReporter {
  public String reportHours(Employee e) { ... }
}

class EmployeeRepository {
  public void save(Employee e) { ... }
}
```

각 actor마다 별도 클래스를 둔다. 한 actor의 요구는 그 actor의 클래스만 바꾼다.

`regularHours` 같은 공통 helper는 어떻게 할까? 더 이상 공유하지 않는다. 두 곳에 따로 둔다. **중복 같지만 사실 우발적 동질성**이다. CFO와 COO가 같은 시점에 같은 정의를 갖고 있을 뿐, 한쪽이 바뀌면 다른 쪽이 따라 가지 않는다.

## 우발적 중복 vs 진짜 중복

이 원칙은 종종 DRY(Don't Repeat Yourself)와 충돌해 보인다. 두 곳에 같은 코드가 있는 게 어떻게 좋은가?

답은 **변경 이유**다.

- **진짜 중복** — 같은 actor가 두 곳을 동시에 바꾸기를 원한다. 합쳐야 한다.
- **우발적 중복** — 서로 다른 actor가 우연히 같은 코드를 가지고 있을 뿐이다. 분리해야 한다.

겉모습이 같다고 같은 중복이 아니다. 변경의 동기가 같아야 진짜 중복이다.

## 책임이란 무엇인가 — actor의 시점

Martin은 책임을 자주 "변경 이유"로 정의한다. 그러나 "변경 이유"는 모호하다. 어떤 코드든 N가지 변경 이유를 만들어 낼 수 있다.

좀 더 명확한 기준이 **actor**다.

- 누가 이 코드의 변경을 요청할 수 있는가?
- 그 요청자들의 관심사가 서로 다른가?

서로 다른 관심사를 가진 두 명 이상이 한 모듈을 바꿔야 한다면 SRP 위반이다.

## 모듈의 크기

SRP는 함수, 클래스, 컴포넌트, 시스템 — 모든 모듈 단위에 적용된다.

- **함수 수준** — 함수의 변경 이유가 한 가지인가?
- **클래스 수준** — 클래스의 actor가 한 명인가?
- **컴포넌트 수준** — 컴포넌트가 한 종류의 요구에만 응답하는가?
- **시스템 수준** — 시스템 경계가 actor 경계와 일치하는가?

규모가 커질수록 actor가 더 명확하게 분리된다. 작은 함수 수준에서는 actor가 같을 수 있지만, 컴포넌트 수준에서는 거의 항상 actor가 갈린다.

## SRP와 Facade 패턴

Employee 예에서 세 클래스로 분리하면 사용자가 세 객체를 다 알아야 한다. 불편하다.

해법은 **Facade**다.

```java
class EmployeeFacade {
  public Money calculatePay() { return payCalc.calculatePay(this.data); }
  public void save() { repo.save(this.data); }
  public String reportHours() { return reporter.reportHours(this.data); }
  
  private Employee data;
  private PayCalculator payCalc;
  private EmployeeRepository repo;
  private HourReporter reporter;
}
```

Facade는 SRP를 깨지 않는다. 세 actor의 변경은 여전히 세 클래스에 격리되어 있다. Facade는 단순히 외부 API를 통일하는 역할만 한다.

## 정리

- SRP = "한 가지 일"이 아니다 — **한 actor에 대해서만 책임**
- actor = 변경 요구를 만드는 사용자/이해관계자 묶음
- 한 모듈을 두 actor가 동시에 만지면 SRP 위반
- 우발적 중복을 두려워하지 마라 — actor가 다르면 같은 코드도 따로 둔다
- 함수 / 클래스 / 컴포넌트 / 시스템 — 모든 모듈 단위에 적용
- **Facade**로 분리된 모듈을 외부에 통합 노출 가능

## 다음 장 예고

다음 장은 **OCP** — Open-Closed Principle. 확장에는 열려 있고 변경에는 닫혀 있게.

## 관련 항목

- [C++ Software Design 가이드라인 2: 변경 대비](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — 같은 정신
- [Refactoring Ch 3: Divergent Change](/blog/programming/design/refactoring/ch03) — SRP 위반의 냄새
- [GoF Facade](/blog/programming/design/gof-design-patterns/) — 분리된 모듈의 외부 통합
