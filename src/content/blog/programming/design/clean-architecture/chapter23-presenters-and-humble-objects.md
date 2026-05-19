---
title: "Ch 23: Presenters와 Humble Objects"
date: 2026-05-01T23:00:00
description: "Humble Object 패턴 — 테스트하기 어려운 부분과 쉬운 부분을 분리. Presenter와 View Model의 정확한 위치."
tags: [Architecture, Presenter, HumbleObject, MVP]
series: "Clean Architecture"
seriesOrder: 23
draft: true
---

## 이 챕터의 메시지

22장의 동심원 다이어그램의 Adapters 층은 어떻게 디자인할 것인가. Martin이 권하는 핵심 패턴이 **Humble Object**다.

> 테스트하기 어려운 부분을 가능한 한 작게 만들고, 테스트하기 쉬운 부분을 가능한 한 크게 만든다.

## Humble Object 패턴

원래 GerardMeszaros의 *xUnit Test Patterns* 책에서 나온 패턴.

문제: 어떤 코드는 본질적으로 테스트하기 어렵다.
- GUI — 화면이 렌더링되는 것을 어떻게 검증?
- 데이터베이스 — 매번 진짜 DB?
- 외부 API — 매번 호출?
- 네트워크 — 신뢰성 떨어짐

해법: 테스트 어려운 부분을 **humble**(겸손한 — 거의 아무 로직이 없는) 객체로 만들고, 로직은 다른 곳에 두어 테스트한다.

```
[복잡한 로직, 테스트 쉬움]  ←─→  [Humble Object, 테스트 어려움]
                                    (단순 표시/저장만)
```

Humble Object는 "거의 아무 일도 안 하는" 것이 핵심이다. 로직이 없으니 안 테스트해도 큰 위험이 없다.

## Presenter — View의 Humble 짝

전통적인 MVP(Model-View-Presenter) 패턴이 정확히 이 형태다.

```
Use Case
   ↓
Presenter — Use Case 출력을 View 데이터로 변환 (로직)
   ↓
View Model — 단순 데이터 (필드, getter만)
   ↓
View — 단순 표시 (humble)
```

**Presenter의 책임**:
- Use Case의 결과를 받음
- 화면에 표시할 형식으로 변환 (날짜 포맷, 색상 결정, 정렬, ...)
- View Model에 채움

```java
class LoanPresenter {
  void present(LoanResponse response) {
    LoanViewModel vm = new LoanViewModel();
    vm.amount = formatCurrency(response.amount);
    vm.status = response.status.toDisplayString();
    vm.statusColor = (response.approved) ? "green" : "red";
    view.show(vm);
  }
}
```

**View Model의 책임**:
- 단순한 데이터 컨테이너
- 필드와 getter만
- 로직 없음

```java
class LoanViewModel {
  String amount;
  String status;
  String statusColor;
}
```

**View의 책임**:
- View Model을 화면에 표시
- 거의 아무 로직 없음
- 단순히 데이터를 UI 컨트롤에 넣음 (humble)

```java
class LoanView {
  void show(LoanViewModel vm) {
    amountLabel.setText(vm.amount);
    statusLabel.setText(vm.status);
    statusLabel.setColor(vm.statusColor);
  }
}
```

이게 가능하면 Presenter는 단위 테스트가 가능하고, View는 거의 아무 로직이 없으니 테스트 안 해도 위험이 작다.

## 다른 Humble Object 사례

이 패턴은 GUI에만 적용되는 게 아니다.

### Database Gateway

```
Use Case ↔ Repository Interface ↔ SqlGateway (humble)
                                   - 단순 CRUD
                                   - 비즈니스 로직 없음
```

Gateway는 SQL을 던지고 결과를 받아 도메인 객체로 변환한다. 단순 CRUD만. 비즈니스 로직은 없다.

### Service Listeners

외부 메시징 / API 호출을 받는 부분도 humble이다.

```
HTTP/MQ 메시지 → Listener (humble) → Use Case (테스트 가능)
```

Listener는 메시지를 파싱해서 Use Case에 넘긴다. 그 외엔 아무 일도 안 한다.

### Data Mappers

ORM의 핵심 패턴. DB row를 도메인 객체로 변환하는 매퍼.

```java
class LoanMapper {
  Loan fromRow(Row r) {
    return new Loan(r.getLong("id"), r.getMoney("amount"), ...);
  }
  Row toRow(Loan l) { /* 반대 */ }
}
```

매핑 로직은 단순하다 — 한쪽 형식을 다른 쪽 형식으로 옮길 뿐. 변환 규칙이 복잡하면 그건 비즈니스 로직이고, Use Case로 옮긴다.

## 경계 가로지르는 데이터 — DTO

22장에서 말한 "경계 가로지르는 데이터 객체"가 이 형태다. **DTO** (Data Transfer Object).

```java
class LoanRequest {   // Controller → Use Case
  String customerId;
  double amount;
}

class LoanResponse {  // Use Case → Presenter
  String loanId;
  boolean approved;
}
```

DTO는 humble의 일종이다. 데이터만 들고 있고, 로직이 없다.

## Humble Object의 진짜 가치

이 패턴이 만들어내는 가치.

**1. 테스트 가능성**

복잡한 로직(Presenter, Use Case, Mapper의 변환 규칙)은 단위 테스트 가능. 테스트 어려운 부분(View, DB Gateway 실제 호출)은 최소화.

**2. 책임 분리**

각 부분의 역할이 명확. Presenter = 표현 로직, View = 표시. 한 클래스가 두 역할을 짊어지지 않는다.

**3. UI 프레임워크 독립**

View가 humble이면 UI 프레임워크 교체가 쉽다. Presenter와 ViewModel은 그대로 두고 View만 다시 짠다.

## Humble의 한계 — 진짜로 humble한가

이 패턴의 함정 — humble Object가 어느새 로직을 머금기 시작한다.

```java
// 처음
class LoanView {
  void show(LoanViewModel vm) {
    amountLabel.setText(vm.amount);
  }
}

// 시간 지난 후 — 로직이 침투
class LoanView {
  void show(LoanViewModel vm) {
    if (vm.isPremium) amountLabel.setColor("gold");
    else if (vm.isVIP) amountLabel.setColor("silver");
    else amountLabel.setColor("default");
    // ↑ 이 로직은 Presenter에 있어야 한다
  }
}
```

이 함정을 막으려면 정기적으로 검토한다. View에 if 문이 보이면 빨간불 — Presenter로 옮긴다.

## 정리

- **Humble Object** — 테스트 어려운 부분을 작게, 테스트 쉬운 부분을 크게
- **Presenter / View Model / View** — MVP 패턴, View가 humble
- **Database Gateway** — SQL 호출만 담당, 비즈니스 로직 없음
- **Mapper** — 한 형식을 다른 형식으로, 단순 변환만
- 경계 가로지르는 데이터 = **DTO** = humble의 일종
- 함정 — humble Object에 로직이 침투. 정기 검토 필요

## 다음 장 예고

다음 장은 **부분 경계** — 완전한 경계는 비싸므로 절충안.

## 관련 항목

- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — Adapters 층의 위치
- [GoF MVC / MVP](/blog/programming/design/gof-design-patterns/item01-abstract-factory/) — 같은 패턴 가족
- [Refactoring Ch 7: 캡슐화](/blog/programming/design/refactoring/ch07) — Encapsulate Collection
