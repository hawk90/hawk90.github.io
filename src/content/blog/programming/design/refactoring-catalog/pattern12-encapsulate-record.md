---
title: "Pattern 12: Encapsulate Record"
date: 2026-06-01T12:00:00
description: "Record를 class로 감싸 접근을 통제하고 미래 변화에 대비한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 12
tags: [refactoring, encapsulate-record, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> bare record(`{}`, dict, struct)가 광범위하게 노출되면 *나중에 derived 필드를 추가*하거나 *rename*하기 어렵다. class wrapper로 감싸 미래에 대비한다.

## 동기 (Motivation)

JavaScript의 `{}`, Python의 `dict`, C의 struct처럼 *공개 필드*를 가진 record는 처음엔 편하지만 다음 두 가지가 어려워진다.

1. **derived 필드 추가** — `firstName, lastName`에서 `fullName`을 추가하려면 모든 setter를 hook해야 함.
2. **rename / 형태 변경** — 외부가 직접 필드를 알면 변경 시 모든 사용처를 추적해야 함.

class로 감싸면 getter/setter를 통해 이런 변경이 한 곳에서 가능하다.

## 절차 (Mechanics)

1. record를 가진 변수에 [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable) 적용.
2. record 자체를 단순 class로 변환 (getter/setter 추가).
3. 모든 *직접 필드 접근*을 메서드 호출로 교체.
4. 클래스 안에서 *원본 record와 사본* 처리를 결정 (mutation 의도면 그대로, immutable이면 깊은 복사 반환).
5. 테스트.

## 예시 (Before → After)

```javascript
// Before
const organization = { name: "Acme Gooseberries", country: "GB" };

// 사용처 — 직접 접근
result += `<h1>${organization.name}</h1>`;
organization.name = newName;
```

```javascript
// After
class Organization {
  constructor(data) {
    this._name    = data.name;
    this._country = data.country;
  }
  get name()        { return this._name; }
  set name(arg)     { this._name = arg; }
  get country()     { return this._country; }
  set country(arg)  { this._country = arg; }
}

// 사용처 — 메서드 호출
result += `<h1>${organization.name}</h1>`;
organization.name = newName;
```

이후 `name` setter에 검증·로깅을 끼우거나, `displayName` 같은 derived 필드를 추가할 수 있다.

## 언어별 도구

- **Java**: getter/setter, Lombok `@Data`
- **Python**: `@property`, `dataclass`
- **JavaScript**: getter/setter, Proxy
- **C++**: encapsulation by design, `const` member
- **Rust**: pub/private + impl

## 관련 패턴

- 자매: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
- 컬렉션: [Pattern 13: Encapsulate Collection](/blog/programming/design/refactoring-catalog/pattern13-encapsulate-collection)
- 단일 필드: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
