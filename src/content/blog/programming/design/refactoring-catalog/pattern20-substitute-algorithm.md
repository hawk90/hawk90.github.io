---
title: "Pattern 20: Substitute Algorithm"
date: 2026-06-01T20:00:00
description: "알고리즘 자체를 더 명확하거나 효율적인 것으로 교체."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 20
tags: [refactoring, substitute-algorithm, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 결과를 *더 단순하거나 효율적인 알고리즘*으로 교체한다.

## 동기 (Motivation)

리팩터링은 보통 *동작을 보존*하면서 구조만 바꾼다. 그러나 가끔 알고리즘 자체가 잘못 선택된 경우가 있다 — 손으로 짠 quadratic search보다 hash map이, ad-hoc sort보다 표준 라이브러리 sort가 낫다. 그땐 알고리즘을 통째로 교체한다.

## 절차 (Mechanics)

1. 새 알고리즘이 *기존 동작과 동일*함을 검증할 테스트를 충분히 갖춘다. 부족하면 추가.
2. 함수 본문을 새 알고리즘으로 교체.
3. 모든 테스트가 통과하는지 확인.
4. edge case (빈 입력, 큰 입력, NaN, 동시 동일 키 등) 테스트.
5. 성능 비교 (필요시).

## 예시 (Before → After)

```javascript
// Before — 손으로 짠 search
function foundPerson(people) {
  for (let i = 0; i < people.length; i++) {
    if (people[i] === "Don")    return "Don";
    if (people[i] === "John")   return "John";
    if (people[i] === "Kent")   return "Kent";
  }
  return "";
}
```

```javascript
// After — 명확한 알고리즘
function foundPerson(people) {
  const candidates = ["Don", "John", "Kent"];
  return people.find(p => candidates.includes(p)) || "";
}
```

의도가 한눈에 드러난다.

## 주의

- 알고리즘 교체는 *행동 보존*보다 큰 변경이다. 테스트 커버리지가 *전제*.
- Edge case에서 미세한 동작 차이 (NaN, empty, ordering) 확인.
- 성능 가정 ("hash map이 더 빠르다")은 *측정 후* 검증.

## 관련 패턴

- 자매: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function) (교체 전 구조 정리)
- 후속: [Pattern 28: Replace Loop with Pipeline](/blog/programming/design/refactoring-catalog/pattern28-replace-loop-with-pipeline)
