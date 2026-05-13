---
title: "Ch 22: The Clean Architecture"
date: 2025-06-07T01:00:00
description: "책의 이름이자 책 전체의 시각적 요약. 4겹 동심원, 의존성은 안쪽으로만. Hexagonal / Onion과 같은 본질의 변형."
tags: [Architecture, CleanArchitecture, DependencyRule]
series: "Clean Architecture"
seriesOrder: 22
draft: true
---

## 이 챕터의 메시지

책 전체의 정점. 한 장의 다이어그램이 모든 챕터의 메시지를 요약한다.

## 동심원 다이어그램

```
                        ┌────────────────────────┐
                        │  Frameworks & Drivers   │
                        │  (Web, DB, Devices)     │
                        │                        │
                        │   ┌──────────────────┐ │
                        │   │ Interface Adapters│ │
                        │   │ (Controllers,    │ │
                        │   │  Presenters,     │ │
                        │   │  Gateways)       │ │
                        │   │                  │ │
                        │   │   ┌────────────┐ │ │
                        │   │   │ Use Cases   │ │ │
                        │   │   │ (App-specific│ │ │
                        │   │   │  business    │ │ │
                        │   │   │  rules)      │ │ │
                        │   │   │             │ │ │
                        │   │   │  ┌────────┐ │ │ │
                        │   │   │  │Entities │ │ │ │
                        │   │   │  │(Core    │ │ │ │
                        │   │   │  │ Business│ │ │ │
                        │   │   │  │ Rules)  │ │ │ │
                        │   │   │  └────────┘ │ │ │
                        │   │   └────────────┘ │ │
                        │   └──────────────────┘ │
                        └────────────────────────┘

           ←━━━━━━━━━━━━━━━━━━━━━ 의존성 화살표는 안쪽으로만 ━━━━━━━━━━━━━━━━━━━━━←
```

4겹 동심원이다.

## 네 겹

### 1. Entities (가장 안쪽)

핵심 비즈니스 규칙(20장). 어떤 시스템에서도 같다. 가장 안 변한다.

```java
class Loan {
  Money calculateInterest(Period p) { /* 핵심 비즈니스 규칙 */ }
}
```

### 2. Use Cases

앱별 비즈니스 규칙(20장). 한 시스템이 Entity들을 어떤 흐름으로 다루는가.

```java
class CreateLoanUseCase {
  void execute(LoanRequest req) {
    // 신용 확인 → Entity 생성 → 저장
  }
}
```

### 3. Interface Adapters

내부와 외부 사이의 **번역기**. Use Case의 입출력을 외부 형식으로 변환하고, 외부 입력을 Use Case의 형식으로 변환한다.

- **Controllers** — HTTP 요청 → Use Case 입력
- **Presenters** — Use Case 출력 → 화면 표시 형식
- **Gateways** — Repository 인터페이스의 구현 (DB 호출)

```java
class LoanController {
  void post(HttpRequest req) {
    LoanRequest loan = mapHttpToLoanRequest(req);
    useCase.execute(loan);  // 안쪽으로
  }
}
```

### 4. Frameworks & Drivers (가장 바깥)

디테일. 웹 프레임워크, DB, 외부 라이브러리, OS.

```
Spring, Rails, MySQL, MongoDB, React, Vue, ...
```

이 모든 것은 도구일 뿐 시스템의 본질이 아니다.

## 의존성 규칙 (The Dependency Rule)

이 다이어그램의 핵심 규칙은 단 하나.

> **소스 코드 의존성은 안쪽으로만 향한다.**

- 안쪽 원은 바깥쪽 원의 어떤 것도 모른다
- 바깥쪽 원이 안쪽 원의 인터페이스를 구현한다

```
Entities         ← 다른 무엇도 모름
   ↑
Use Cases        ← Entities만 안다
   ↑
Adapters         ← Use Cases와 Entities를 안다
   ↑
Frameworks       ← 모든 안쪽 원을 안다
```

이게 16장(Independence)과 17장(Boundaries)의 정점이다.

## 데이터 흐름이 경계를 가로지를 때

경계를 가로지를 때는 **단순 데이터 객체**로 전달한다. 클래스, 구조체, 또는 JSON-like 구조. **객체 안에 함수가 거의 없다**.

```java
// 단순 데이터 객체 - 경계 가로지름
class LoanRequest {
  String customerId;
  Money amount;
  InterestRate rate;
}

// Entities 같은 풍부한 객체는 경계 안쪽에서만
class Loan { /* 데이터 + 비즈니스 규칙 */ }
```

경계를 가로지르는 데이터는 그 자체로 디테일에 묶이지 않아야 한다. JSON annotation, ORM annotation 같은 게 붙으면 안 된다.

## 의존성 역전 — 경계를 가로질러 호출하기

문제: Use Case가 Gateway(Adapter 층)를 호출해야 한다. 그런데 의존성 규칙은 안쪽이 바깥쪽을 모른다고 한다. 어떻게?

답: 인터페이스를 안쪽에 둔다.

```java
// Use Cases 층
interface LoanRepository {  // 인터페이스가 안쪽에 산다
  void save(Loan l);
}

class CreateLoanUseCase {
  private LoanRepository repo;  // 인터페이스만 안다
}

// Adapters 층
class SqlLoanRepository implements LoanRepository {  // 구현이 바깥에
  public void save(Loan l) { /* SQL */ }
}
```

화살표를 보면.

```
Use Cases ← LoanRepository (인터페이스)
              ↑
              │
Adapters → SqlLoanRepository (구현)
```

`SqlLoanRepository`(바깥)가 `LoanRepository`(안쪽)에 의존한다. 의존성 규칙 만족. **DIP의 정확한 응용**.

## 다른 동심원 아키텍처들

Clean Architecture는 사실 새로운 발명이 아니다. 비슷한 다이어그램이 여러 이름으로 존재해 왔다.

- **Hexagonal Architecture** (Alistair Cockburn) — Ports & Adapters
- **Onion Architecture** (Jeffrey Palermo) — 양파 같은 겹
- **DCI** (Data-Context-Interaction) — Trygve Reenskaug
- **BCE** (Boundary-Control-Entity) — Ivar Jacobson

이들 모두의 공통 본질을 Martin이 추출해서 정리한 것이 **Clean Architecture**다.

> "These architectures all share the same goal, which is the separation of concerns. They all achieve this separation by dividing the software into layers."

핵심 정신은 같다 — **관심사의 분리**. 디테일과 정책의 분리.

## 이 다이어그램만으로는 부족하다

Martin이 솔직히 인정한다 — 4겹이 마지막은 아니다. 더 많은 겹이 있을 수 있다.

- Use Cases 안에 여러 그룹
- Adapters 안에 다양한 종류
- Frameworks 안에서도 분리 필요

핵심은 **겹의 수**가 아니라 **의존성 규칙**이다. 바깥은 안을 모르고, 안은 바깥을 모른다. 이것만 지키면 겹은 더 많아도, 더 적어도 된다.

## 정리

- Clean Architecture = **4겹 동심원** + **의존성 규칙**
- 안쪽부터 — **Entities / Use Cases / Adapters / Frameworks**
- 의존성은 **항상 안쪽으로만**
- 경계를 가로지를 때는 **단순 데이터 객체**로
- 경계 가로지르는 호출은 **인터페이스를 안쪽에 두고 DIP**
- Hexagonal, Onion, DCI, BCE — 모두 같은 본질의 변형
- 4겹이 절대적인 것은 아니다 — 의존성 규칙이 본질

## 다음 장 예고

다음 장은 **Presenters and Humble Objects** — Adapter 층의 디자인 패턴.

## 관련 항목

- [Ch 11: DIP](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle) — 경계 가로지름의 도구
- [Ch 20: 비즈니스 규칙](/blog/programming/design/clean-architecture/chapter20-business-rules) — Entities + Use Cases
- [Ch 21: Screaming Architecture](/blog/programming/design/clean-architecture/chapter21-screaming-architecture) — 도메인 우선
- [C++ Software Design 가이드라인 9: 추상화 소유권](/blog/programming/cpp/cpp-software-design/guideline09-pay-attention-to-the-ownership-of-abstractions)
