---
title: "Pattern 10: Combine Functions into Transform"
date: 2026-06-01T10:00:00
description: "파생값을 생성·복사하는 transform 함수 패턴."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 10
tags: [refactoring, transform-function, derived-data, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 *파생 값(derived)* 계산이 여러 곳에 흩어져 있다면, 입력을 받아 *enriched 사본*을 반환하는 transform 함수로 모은다.

## 동기 (Motivation)

같은 데이터에서 *파생*되는 값(세금, 합계, 표시용 텍스트)을 여러 함수가 각자 계산하면 일관성을 잃기 쉽다. Transform은 입력 객체를 *복사*하고 파생 필드를 더한 *새 객체*를 반환한다. 모든 계산이 한 곳에 모여 단일 진실 원천이 된다.

[Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)와 같은 의도지만, *함수형·immutable* 스타일을 선호할 때 쓴다.

언제 적용하는가:
- 같은 derived 계산이 여러 호출처에서 반복된다
- 데이터를 *변경하지 않고* 파생만 만들고 싶다
- 데이터 파이프라인(ETL, view 구성)이 자연스럽다
- 함수형 스타일이 코드 베이스의 결과 맞다

## 절차 (Mechanics)

1. Transform 함수를 만든다. 입력 객체의 *깊은 복사*를 반환하는 게 시작.
2. 첫 번째 파생 계산을 transform 안으로 이동(원본 함수는 transform 호출로 위임).
3. 호출처를 transform 결과를 사용하도록 바꾼다.
4. 다른 파생 계산도 같은 방식으로 이동.
5. 원본 derived 함수를 제거한다.

복사를 잊으면 원본이 *오염*된다 — immutability가 핵심.

## 예시 (Before → After)

```javascript
// Before — 두 함수가 같은 reading에서 파생
function base(reading)         { return reading.month * reading.quantity; }
function taxableCharge(reading){ return Math.max(0, base(reading) - taxThreshold(reading.year)); }

// 호출
const aReading = acquireReading();
const baseCharge = base(aReading);
const taxable    = taxableCharge(aReading);
```

```javascript
// After — transform
function enrichReading(original) {
  const result = _.cloneDeep(original);
  result.baseCharge    = base(result);
  result.taxableCharge = taxableCharge(result);
  return result;
}

// 호출
const reading = enrichReading(acquireReading());
const baseCharge = reading.baseCharge;
const taxable    = reading.taxableCharge;
```

이제 *어디서나 같은 enrichReading*만 통과시키면 일관된 파생 값을 얻는다.

## 비교 — Class vs Transform

| 측면 | Class | Transform |
| --- | --- | --- |
| 상태 변경 | 있음 (mutating method 가능) | 없음 (immutable) |
| 함수형 친화 | 약함 | 강함 |
| 도메인 모델 | 자연스러움 | 단순 데이터에 적합 |
| 메모리 | 적음 (한 객체) | 더 큼 (복사) |
| 동시성 | lock 주의 | 안전 |

## 주의

- 깊은 복사 비용. 데이터가 크면 lazy 또는 [Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record).
- 원본 변경을 *완전히 막아야* immutability 보장.
- 다단계 transform이면 파이프라인으로 (`pipe(t1, t2, t3)`).

## 관련 패턴

- 대안: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
- 단계 분리: [Pattern 11: Split Phase](/blog/programming/design/refactoring-catalog/pattern11-split-phase)
- 값 객체: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
