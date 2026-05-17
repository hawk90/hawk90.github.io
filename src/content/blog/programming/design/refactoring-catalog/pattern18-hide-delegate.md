---
title: "Pattern 18: Hide Delegate"
date: 2026-06-01T18:00:00
description: "Law of Demeter — 중개자 노출을 막는다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 18
tags: [refactoring, law-of-demeter, hide-delegate, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 클라이언트가 `manager.getDepartment().getManager()` 같은 체인을 부른다면, 그 체인은 server class 내부에 숨긴다(Law of Demeter).

## 동기 (Motivation)

캡슐화는 단순히 데이터를 숨기는 게 아니다. *이웃의 이웃을 알게 만들지 않는 것*도 포함한다(Law of Demeter, "Don't talk to strangers"). client가 `person.department.manager`까지 chain하면, department 구조가 바뀔 때 모든 client가 깨진다.

## 절차 (Mechanics)

1. 자주 호출되는 delegate method를 *server class*에 추가.
2. client가 server method를 호출하도록 변경.
3. 모든 client가 옮겨졌으면 server에서 delegate getter 제거.
4. 테스트.

## 예시 (Before → After)

```javascript
// Before — client가 department를 안다
class Person {
  get department() { return this._department; }
}
class Department {
  get manager() { return this._manager; }
}

const manager = person.department.manager;   // chain
```

```javascript
// After — Person이 manager를 직접 노출
class Person {
  get manager() { return this._department.manager; }
}

const manager = person.manager;   // 한 단계
```

이제 `Department` 구조가 바뀌어도 client는 `Person.manager`만 알면 된다.

## 주의 — 모든 chain을 막을 필요는 없다

[Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)도 함께 존재한다. *너무 많이 숨기면* server class가 단순 통과(facade) method로 폭발한다. 균형이 필요.

## 관련 패턴

- 역연산: [Pattern 19: Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)
- 자매: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
