---
title: "Pattern 19: Remove Middle Man"
date: 2026-06-01T19:00:00
description: "Delegate가 너무 많아지면 중개자를 제거한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 19
tags: [refactoring, middle-man, remove-delegate, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Hide Delegate를 과하게 적용해 클래스가 *단순 통과 메서드*로 채워지면, 중개자를 제거하고 client가 직접 호출하게 한다.

## 동기 (Motivation)

[Hide Delegate](/blog/programming/design/refactoring-catalog/pattern18-hide-delegate)의 결과로 server class에 *단순 forwarding* 메서드가 쌓이면 그 class의 가치가 줄어든다. *반은 자기 일, 반은 남의 일 위임*이면 직접 호출이 더 깔끔하다.

Demeter의 엄격함과 simplicity 사이의 균형 — 한 방향으로만 가지 않는다.

## 절차 (Mechanics)

1. delegate getter를 server class에 추가.
2. delegating method를 사용하는 client를 *직접 호출*로 변경.
3. 모든 client가 옮겨졌으면 forwarding method 제거.
4. 테스트.

## 예시 (Before → After)

```javascript
// Before — Person이 manager를 통째 위임
class Person {
  get manager() { return this._department.manager; }
  get chargeCode() { return this._department.chargeCode; }
  get costCenter() { return this._department.costCenter; }
  // ... department의 거의 모든 메서드 forward
}

// 사용
const manager = person.manager;
```

```javascript
// After — department를 직접 노출, client가 알아서
class Person {
  get department() { return this._department; }
}

// 사용
const manager = person.department.manager;
```

forwarding 코드가 줄어든다.

## 균형

- *몇 개* delegate는 OK (Hide Delegate)
- *대부분 delegate*면 Remove Middle Man
- 결정 기준은 *server class의 정체성*이 forwarding으로 흐려지는가

## 관련 패턴

- 역연산: [Pattern 18: Hide Delegate](/blog/programming/design/refactoring-catalog/pattern18-hide-delegate)
- 자매: [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
