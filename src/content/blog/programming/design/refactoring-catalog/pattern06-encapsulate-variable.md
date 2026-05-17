---
title: "Pattern 6: Encapsulate Variable"
date: 2026-06-01T06:00:00
description: "데이터를 함수 뒤로 숨겨 접근을 통제한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 6
tags: [refactoring, encapsulation, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 데이터는 어디서나 직접 접근될 수 있어 변경이 가장 어렵다. 함수 뒤로 숨기면 모든 접근에 hook을 걸 수 있다.

## 동기 (Motivation)

전역 또는 광범위하게 쓰이는 데이터를 직접 노출하면, 나중에 그 데이터의 *형태*나 *접근 규칙*을 바꾸기 어렵다. getter/setter 함수로 한 단계 감싸면 모든 read/write에 *훅(검증, 로깅, 캐싱, immutability)*을 걸 수 있다.

(이전 이름: Self-Encapsulate Field)

언제 적용하는가:
- 전역 변수 또는 광범위 객체에 직접 접근하는 코드가 많다
- 데이터의 *형태*가 바뀔 가능성이 있다
- 읽기·쓰기에 *검증, 로깅, 캐시*를 끼우고 싶다
- 데이터를 *immutable*로 만들고 싶다

## 절차 (Mechanics)

1. 변수에 대한 *encapsulation 함수* (getter, setter)를 만든다.
2. 정적 검사를 활용해 모든 직접 접근을 찾는다.
3. 각 직접 접근을 함수 호출로 바꾼다 — 한 곳씩 테스트.
4. 변수의 가시성을 제한한다(`private`, 모듈 내부).
5. 테스트한다.
6. 변수가 record 또는 collection이면 추가 캡슐화([Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record), [Encapsulate Collection](/blog/programming/design/refactoring-catalog/pattern13-encapsulate-collection)).

## 예시 (Before → After)

```javascript
// Before — 모듈 전역
let defaultOwner = { firstName: "Martin", lastName: "Fowler" };

// 사용처
spaceship.owner = defaultOwner;
defaultOwner = { firstName: "Rebecca", lastName: "Parsons" };
```

```javascript
// After — getter/setter로 감쌈
let defaultOwnerData = { firstName: "Martin", lastName: "Fowler" };

export function defaultOwner()        { return defaultOwnerData; }
export function setDefaultOwner(arg)  { defaultOwnerData = arg; }

// 사용처
spaceship.owner = defaultOwner();
setDefaultOwner({ firstName: "Rebecca", lastName: "Parsons" });
```

이제 `defaultOwnerData` 자체는 *모듈 내부*에 숨고, 외부는 함수로만 접근한다. 나중에 *immutable 복사본 반환*이나 *로깅*을 추가하려면 함수 하나만 바꾼다.

## 변형

- [Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record) — 전체 객체를 함수 뒤로
- [Encapsulate Collection](/blog/programming/design/refactoring-catalog/pattern13-encapsulate-collection) — List, Map을 함수 뒤로 (외부의 mutation 차단)

## 주의

- 변경 횟수가 적은 데이터는 캡슐화가 과잉이다.
- getter가 *내부 데이터를 그대로* 반환하면 외부가 mutation할 수 있다 — 복사본 반환 또는 immutable 사용을 검토.

## 관련 패턴

- 전체 객체: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- 컬렉션: [Pattern 13: Encapsulate Collection](/blog/programming/design/refactoring-catalog/pattern13-encapsulate-collection)
- 변수 이름 변경: [Pattern 7: Rename Variable](/blog/programming/design/refactoring-catalog/pattern07-rename-variable)
