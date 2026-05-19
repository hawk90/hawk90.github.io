---
title: "Pattern 21: Move Function"
date: 2026-05-02T21:00:00
description: "함수를 자기가 속해야 할 모듈로 옮긴다 — feature envy 해소의 핵심."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 21
tags: [refactoring, move-function, modules, feature-envy, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수가 자기 모듈보다 *다른 모듈의 데이터를 더 많이* 만진다면, 그 함수는 잘못된 위치에 있다.

## 동기 (Motivation)

좋은 소프트웨어는 *변경의 축*과 *모듈 경계*가 일치한다. 함수가 자기 class보다 *다른 class의 필드와 메서드를 더 많이* 사용한다면, 그것은 **feature envy** — 다른 모듈을 부러워하는 함수다. 그 함수를 진짜 주인에게 돌려보내면 결합도가 낮아지고, 그 데이터에 대한 모든 동작이 한 곳에 모인다.

함수를 이동할 이유는 여럿이다.

1. **Feature envy** — 호출 통계가 *다른 모듈*에 쏠림
2. **모듈 경계 재정의** — 컨텍스트가 바뀌어 응집을 다시 잡아야 함
3. **순환 의존 끊기** — 한쪽 함수를 옮기면 cycle이 풀리는 경우
4. **테스트 용이성** — 부수효과가 적은 곳으로 옮기면 테스트 분리가 쉬워짐
5. **재사용** — 한 클라이언트만의 helper를 공용 utility로 승격

판단은 *통계*로 한다. 함수 본문에서 호출되는 멤버 중 *현 클래스 멤버 비율*과 *다른 클래스 멤버 비율*을 세어 본다. 후자가 더 크면 이사가 답이다.

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 21 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern21-move-function.svg)

## 절차 (Mechanics)

1. **함수가 의존하는 모든 요소를 식별**한다. 현 컨텍스트(필드, 헬퍼, 외부 상수)와 목적지 컨텍스트 양쪽.
2. **다형성 (override) 여부** 확인. override되어 있으면 이동 어렵다 — [Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method)나 [Push Down Method](/blog/programming/design/refactoring-catalog/pattern54-push-down-method) 먼저.
3. **함수를 목적지에 복사**. 새 이름이 필요하면 임시로 다른 이름.
4. **참조 정리** — 현 컨텍스트 의존을 매개변수로 받거나, source 객체 자체를 인자로 받거나, 의존을 source에 위임.
5. **컴파일·테스트**.
6. **원본 위치의 함수를 위임(delegation)으로** 만들거나 *바로 제거*. delegation은 점진적 마이그레이션에 유리.
7. **모든 호출처를 새 위치로 변경**. 한 곳씩 테스트.
8. **위임 함수 제거** (제거 단계).
9. 원본 함수 이름이 더 좋았으면 새 위치에서 [Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)로 이름 정리.

위 단계 내내 *한 번에 한 테스트 그린*을 지킨다. 큰 점프 하나가 작은 단계 다섯보다 위험하다.

## 예시 1 — 중첩 함수를 모듈 최상위로

가장 작은 이동. 같은 파일·모듈 안에서 위치만 옮긴다.

```javascript
// Before
function trackSummary(points) {
  const totalTime = calculateTime();
  const totalDistance = calculateDistance();
  const pace = totalTime / 60 / totalDistance;
  return { time: totalTime, distance: totalDistance, pace };

  function calculateDistance() {                  // 중첩 함수
    let result = 0;
    for (let i = 1; i < points.length; i++)
      result += distance(points[i - 1], points[i]);
    return result;
  }

  function distance(p1, p2) { /* haversine */ }
  function radians(degrees) { return degrees * Math.PI / 180; }
  function calculateTime()  { /* ... */ }
}
```

`calculateDistance`는 외부 함수 `trackSummary`에 갇혀 있지만 *points 외에는 외부 상태를 전혀 안 본다*. 다른 곳에서 거리 합을 구하고 싶을 수도 있다 — 최상위로 끌어올린다.

```javascript
// After
function trackSummary(points) {
  const totalTime = calculateTime();
  const totalDistance = totalDistance(points);
  const pace = totalTime / 60 / totalDistance;
  return { time: totalTime, distance: totalDistance, pace };
}

function totalDistance(points) {
  let result = 0;
  for (let i = 1; i < points.length; i++)
    result += distance(points[i - 1], points[i]);
  return result;
}

function distance(p1, p2) { /* haversine */ }
function radians(degrees) { return degrees * Math.PI / 180; }
```

이제 `totalDistance`는 *재사용 가능한 query*가 되고, `trackSummary` 본문은 더 간결하다. `distance`와 `radians`도 함께 끌어올렸다 — 한 가족이라서.

## 예시 2 — 다른 클래스로 이동 (Feature Envy 해소)

전형적인 이사. 호출 통계가 다른 클래스에 쏠린 경우.

```javascript
// Before — Account에 있는 overdraftCharge가 AccountType의 필드만 만진다
class Account {
  get bankCharge() {
    let result = 4.5;
    if (this._daysOverdrawn > 0) result += this.overdraftCharge;
    return result;
  }

  get overdraftCharge() {
    if (this.type.isPremium) {
      const baseCharge = 10;
      return this._daysOverdrawn <= 7
        ? baseCharge
        : baseCharge + (this._daysOverdrawn - 7) * 0.85;
    } else {
      return this._daysOverdrawn * 1.75;
    }
  }
}
```

`overdraftCharge`의 본문은 `this.type.isPremium`을 본다. `this._daysOverdrawn`은 자기 필드지만 *나머지 로직 전체가 type-aware*다 — 진짜 주인은 `AccountType`이다.

```javascript
// After
class AccountType {
  overdraftCharge(daysOverdrawn) {
    if (this.isPremium) {
      const baseCharge = 10;
      return daysOverdrawn <= 7
        ? baseCharge
        : baseCharge + (daysOverdrawn - 7) * 0.85;
    } else {
      return daysOverdrawn * 1.75;
    }
  }
}

class Account {
  get bankCharge() {
    let result = 4.5;
    if (this._daysOverdrawn > 0) result += this.overdraftCharge;
    return result;
  }

  get overdraftCharge() {                          // 잠시 위임으로 유지
    return this.type.overdraftCharge(this._daysOverdrawn);
  }
}
```

위임을 잠시 두면 호출자가 천천히 이주할 수 있다. 모든 호출자가 `account.type.overdraftCharge(account.daysOverdrawn)`로 옮겨지면 `Account.overdraftCharge`를 지운다.

이후 단계로 [Preserve Whole Object](/blog/programming/design/refactoring-catalog/pattern44-preserve-whole-object)를 적용해 `account` 자체를 넘기는 옵션도 검토할 만하다. 그러나 그러면 *AccountType이 Account를 알게* 되어 양방향 의존이 된다 — 보통은 *값만 넘기는* 단방향이 좋다.

## 예시 3 — 순환 의존 끊기

`A → B → A`처럼 cycle이 있으면 한쪽의 *경계 함수*를 제삼의 위치로 옮겨 끊는다.

```javascript
// Before — Order ↔ Customer 양방향
class Order   { /* uses Customer.discount() */ }
class Customer{ /* uses Order.total() */ }
```

```javascript
// After — Pricing 모듈로 함수 이동
class Order    { /* no Customer reference */ }
class Customer { /* no Order reference */ }

// pricing.js — 둘 다 안다, 그러나 양쪽 모듈은 pricing을 모름
export function discountedTotal(order, customer) { /* ... */ }
```

순환이 풀리고 *각 도메인 모듈은 자기 일에만 집중*한다.

## 자주 보는 안티패턴

### 1. 위임 함수만 남기고 끝
정리하지 않은 위임 함수가 누적되면 [Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man) 시즌이 온다. *마이그레이션은 끝낸다*는 원칙.

### 2. 너무 많이 한 번에 이동
함수 한 묶음을 한 번에 옮기면 *어디서 깨졌는지* 추적 불가. 한 함수씩, 그린 → 다음.

### 3. 양방향 의존 만들기
이동 후 destination이 source를 알게 되면 의존이 거꾸로 늘어난다. *값만 받는* 쪽으로 정리.

### 4. 함수 이름을 안 바꿈
새 위치에서 옛 이름이 어색해도 그대로 두는 경우. 위치가 바뀌면 *이름도 자기 컨텍스트에 맞게* 새로 본다.

### 5. 정적 분석 도구 무시
IDE의 "Move method" refactoring (IntelliJ, VS Code, Rider)을 활용하라. 수동 이동은 *호출처 누락*을 부른다.

## 언어·환경별 도구

| 도구 | Move 지원 |
| --- | --- |
| IntelliJ / WebStorm / PyCharm | F6 (move method) |
| VS Code | TypeScript "Move to file" code action |
| Rider (C#) | F6 |
| Rust Analyzer | "Move definition" |
| Eclipse | Alt+Shift+V |

자동 도구는 *모든 호출처를 한 번에* 갱신해 안전성이 높다. 단 *동적 호출*(reflection, eval)은 못 잡으니 grep 보조.

## 성능 고려

- 함수 이동 자체는 보통 성능에 무관(인라인되거나 같은 호출 비용).
- 위임 단계가 *영구 남으면* 한 단계 더 indirection. 핫패스라면 위임 단계를 빠르게 제거.
- 다른 모듈로 옮기면 *call site의 cache locality*가 변할 수 있음(JIT 친화도). 측정 영역.

## 호출 통계 측정 — *Feature Envy 감별법*

함수를 옮길지 고민될 때 다음을 센다.

```text
- 현 클래스 멤버 호출 수: N_self
- 다른 클래스 멤버 호출 수 (가장 자주 부르는 클래스 X): N_other(X)
- 매개변수 수가 N_self보다 많은 다른 클래스 X 멤버 호출: 강한 신호
```

`N_other(X) > N_self`면 X로 옮기는 게 자연스럽다.

## 관련 패턴

- **필드 이동**: [Pattern 22: Move Field](/blog/programming/design/refactoring-catalog/pattern22-move-field)
- **클래스 분리/합치기**: [Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class), [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
- **함수 이름 변경**: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)
- **위임 정리**: [Pattern 18: Hide Delegate](/blog/programming/design/refactoring-catalog/pattern18-hide-delegate), [Pattern 19: Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)
- **상속 계층 이동**: [Pattern 51: Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method), [Pattern 54: Push Down Method](/blog/programming/design/refactoring-catalog/pattern54-push-down-method)
