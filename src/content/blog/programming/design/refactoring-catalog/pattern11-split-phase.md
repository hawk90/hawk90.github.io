---
title: "Pattern 11: Split Phase"
date: 2026-06-01T11:00:00
description: "처리를 두 단계로 — 한 함수가 여러 의무를 다할 때."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 11
tags: [refactoring, split-phase, pipeline, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 한 함수가 *서로 다른 단계*(parsing → calculating → rendering)를 섞어 한다면, 단계를 *직렬 파이프라인*으로 나눈다.

## 동기 (Motivation)

함수 안에 단계가 섞이면, 한 단계만 바꾸려 해도 다른 단계 코드를 같이 봐야 한다. 단계 사이를 *중간 데이터 구조*로 분리하면 각 phase가 독립적으로 변경 가능하다. 컴파일러의 *parser → AST → codegen*이 가장 익숙한 예다.

## 절차 (Mechanics)

1. 두 phase의 경계가 되는 *중간 데이터 구조*를 만든다.
2. 두 번째 phase의 코드를 별도 함수로 추출, 중간 데이터를 매개변수로.
3. 모든 두 번째 phase 의존이 중간 데이터로만 흐르게.
4. 첫 번째 phase가 *중간 데이터를 반환*하도록 정리.
5. 클라이언트는 phase1 → phase2 순차 호출로 정리.

## 예시 (Before → After)

```javascript
// Before — order string parsing + 가격 계산이 한 함수에
function priceOrder(product, quantity, shippingMethod) {
  const basePrice = product.basePrice * quantity;
  const discount  = Math.max(quantity - product.discountThreshold, 0)
                    * product.basePrice * product.discountRate;
  const shipping  = Math.min(basePrice * shippingMethod.discountFee, shippingMethod.feeCap)
                    * quantity;
  return basePrice - discount + shipping;
}
```

```javascript
// After — phase1: priceData 계산, phase2: 최종 가격
function priceOrder(product, quantity, shippingMethod) {
  const priceData = calculatePricingData(product, quantity);
  return applyShipping(priceData, shippingMethod);
}

function calculatePricingData(product, quantity) {
  const basePrice = product.basePrice * quantity;
  const discount  = Math.max(quantity - product.discountThreshold, 0)
                    * product.basePrice * product.discountRate;
  return { basePrice, quantity, discount };
}

function applyShipping(priceData, shippingMethod) {
  const shipping = Math.min(priceData.basePrice * shippingMethod.discountFee, shippingMethod.feeCap)
                   * priceData.quantity;
  return priceData.basePrice - priceData.discount + shipping;
}
```

이제 가격 계산만 바꾸려면 phase1만, 배송 정책만 바꾸려면 phase2만 본다.

## 사용 사례

- **컴파일러**: parser → AST → codegen
- **DTO → Domain**: API 응답 파싱 → 도메인 객체 변환
- **ETL**: extract → transform → load
- **View 구성**: model → view-model → render

## 관련 패턴

- 자매: [Pattern 10: Combine Functions into Transform](/blog/programming/design/refactoring-catalog/pattern10-combine-functions-into-transform)
- 함수 추출: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
