---
title: "Pattern 3: Extract Variable"
date: 2026-05-02T03:00:00
description: "복잡한 표현식에 이름을 붙여 의도를 드러낸다 — Introduce Explaining Variable."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 3
tags: [refactoring, extract-variable, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 복잡한 표현식에 이름을 붙여 *왜* 그 계산을 하는지 드러낸다. (이전 이름: Introduce Explaining Variable)

## 동기 (Motivation)

표현식이 복잡하면 *왜* 그 계산을 하는지 코드에 드러나지 않는다. 중간 결과에 이름을 붙이면 코드 자체가 설명이 된다. 짧은 변수 추출 하나가 *주석 한 줄*보다 더 잘 작동하는 이유는, 주석은 *코드와 따로* 늙어가지만 변수는 *코드와 같이 움직이기* 때문이다.

또 한 가지 동기. 디버거를 켜면 *중간 값*을 보고 싶다. 한 줄짜리 복합 표현식은 breakpoint와 watch에 직접 들어가지 않는다. 변수로 빼두면 *각 단계의 값*을 즉시 본다.

### 변수 vs 함수 추출

같은 의도에서 둘 다 가능하다. 결정 기준은 *범위*.

- 한 함수 안에서만 의미 있다면 **Extract Variable**.
- 다른 함수도 같은 표현식을 쓰면 **Extract Function** — 한 곳에서 정의하고 여러 곳에서 호출.
- 같은 함수 안 *여러 곳*에서 같은 표현식이라면 변수 추출도 가치 있음(중복 제거).

### 언제 적용하는가

- 한 줄 안에 여러 단계 계산이 섞여 있다.
- 같은 표현식이 한 함수 안 여러 곳에 반복된다.
- 디버거에서 *중간 값을 보고 싶다*.
- 표현식이 너무 길어 한 줄에 안 들어간다.
- 표현식이 *의미를 가지는데 이름이 없다*.

## 절차 (Mechanics)

1. **추출할 표현식이 side effect 없는지** 확인. 있다면 인라인 후 호출 횟수가 변해 동작이 바뀐다.
2. **변경 불가능 변수**(`const`, `final`, `val`)를 만든다.
3. 표현식 전체를 새 변수에 *대입*한다.
4. 원래 표현식을 *새 변수 참조*로 교체한다.
5. 컴파일·테스트.
6. 같은 표현식이 다른 곳에도 있으면 *한 곳씩* 교체 (중복 제거).

객체의 메서드 안에서 추출했고 *함수 범위를 넘는* 의미를 가진다면 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)이 더 강력하다 — 다른 메서드도 같은 query 호출로 재사용.

## 예시 1 — 가격 계산

```javascript
// Before
function price(order) {
  return order.quantity * order.itemPrice
       - Math.max(0, order.quantity - 500) * order.itemPrice * 0.05
       + Math.min(order.quantity * order.itemPrice * 0.1, 100);
}
```

세 가지 계산이 한 줄에 섞여 있다 — *base, discount, shipping*. 의미를 모르면 의도 파악이 어렵다.

```javascript
// After
function price(order) {
  const basePrice        = order.quantity * order.itemPrice;
  const quantityDiscount = Math.max(0, order.quantity - 500) * order.itemPrice * 0.05;
  const shipping         = Math.min(basePrice * 0.1, 100);
  return basePrice - quantityDiscount + shipping;
}
```

이름이 *주석을 대체*한다. 그리고 두 번째 줄에서 `basePrice`가 재사용되어 표현식이 단순해진다.

### 다음 단계 — 클래스로 승격

같은 계산이 *다른 함수에서도* 필요해지면 변수 추출에서 함수 추출, 더 나아가 클래스 추출이 다음 결.

```javascript
// After (한 단계 더)
class PricedOrder {
  constructor(order) {
    this._quantity  = order.quantity;
    this._itemPrice = order.itemPrice;
  }
  get basePrice()        { return this._quantity * this._itemPrice; }
  get quantityDiscount() { return Math.max(0, this._quantity - 500) * this._itemPrice * 0.05; }
  get shipping()         { return Math.min(this.basePrice * 0.1, 100); }
  get price()            { return this.basePrice - this.quantityDiscount + this.shipping; }
}
```

변수 추출 → 함수 추출 → 클래스 추출의 *연속*. 작게 가다가 패턴이 보이면 큰 단계로.

## 예시 2 — 객체 메서드 안에서 추출

객체 메서드 안에서 추출하면 *함수 추출이 더 자연스러운* 경우가 많다.

```javascript
// Before — Order 클래스 안
get price() {
  return this.quantity * this.itemPrice
       - Math.max(0, this.quantity - 500) * this.itemPrice * 0.05
       + Math.min(this.quantity * this.itemPrice * 0.1, 100);
}
```

```javascript
// After — function 추출이 변수 추출보다 강력
get price() {
  return this.basePrice - this.quantityDiscount + this.shipping;
}

get basePrice()        { return this.quantity * this.itemPrice; }
get quantityDiscount() { return Math.max(0, this.quantity - 500) * this.itemPrice * 0.05; }
get shipping()         { return Math.min(this.basePrice * 0.1, 100); }
```

다른 메서드(예: `discountedTotal`)도 `basePrice`나 `shipping`을 재사용할 수 있다.

## 예시 3 — 디버깅을 위한 추출

```javascript
// Before — breakpoint를 어디 두지?
return invoice.lineItems.reduce((s, x) => s + x.qty * x.price * (1 - x.discountRate), 0);
```

```javascript
// After — 각 단계 watch
const lineTotal = (x) => {
  const gross = x.qty * x.price;
  const net   = gross * (1 - x.discountRate);
  return net;
};
return invoice.lineItems.reduce((s, x) => s + lineTotal(x), 0);
```

이제 `lineTotal` 안에 breakpoint 걸고 `gross`, `net`을 본다.

## 자주 보는 안티패턴

### 1. 의미 없는 이름
`const x = ...;`, `const temp = ...;` — 추출의 목적은 *이름으로 설명*인데 이름이 없다면 인라인하는 게 낫다.

### 2. Side effect 표현식 추출
`const id = generateNextId();` — 호출 횟수가 바뀌면 의미가 바뀌는 표현식은 추출이 안전하지 않다. 부수효과는 *원래 위치*에 그대로.

### 3. 너무 잘게 쪼개기
모든 부분 표현식에 이름을 붙이면 코드가 *변수 정의 목록*이 된다. 의미 있는 *덩어리* 단위로.

### 4. 같은 의미 두 번 표현
변수 이름과 표현식이 *같은 단어*면 이름이 정보를 안 더한다. `const orderQuantity = order.quantity;` — 인라인이 답.

### 5. 변수 추출 vs 함수 추출 결정 미루기
한 함수 안에서만 의미 있는 표현식이 *다른 메서드에서도 필요*해지는 순간이 온다. 그때 변수 추출에 머무르지 말고 *함수 추출로 승격*.

## Modern variants

### Destructuring + naming
ES6+ 분해로 *복수 결과*를 한 번에 이름 짓는다.

```javascript
const { basePrice, quantityDiscount } = computeDiscount(order);
```

### Pipeline + intermediate names
함수형 파이프라인에서도 중간 단계를 변수로 빼면 의미가 명확해진다.

```javascript
// 모호
const result = data |> filter |> sort |> aggregate;

// 명확
const valid     = filter(data);
const sorted    = sort(valid);
const aggregated = aggregate(sorted);
```

### Pattern-matching binding (Rust, Scala, OCaml)
`let Range { start, end } = foo();` 같은 분해 binding도 일종의 변수 추출.

## 도구 / IDE

| 도구 | 단축키 |
| --- | --- |
| IntelliJ | Cmd-Option-V (Extract Variable) |
| VS Code | Cmd-. → "Extract to constant" |
| Rider | Ctrl-R, V |
| Rust Analyzer | "Extract into variable" |

## 성능 고려

변수 추출은 *컴파일러에 의해 최적화*되어 사실상 추가 비용 없음. 같은 표현식이 두 번 등장하던 것이 한 번 계산되어 *오히려 더 빠를* 수 있다(CSE — common subexpression elimination 효과).

## 관련 패턴

- **역연산**: [Pattern 4: Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable)
- **더 강한 도구**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **객체로 승격**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable), [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
- **derived 값**: [Pattern 32: Replace Derived Variable with Query](/blog/programming/design/refactoring-catalog/pattern32-replace-derived-variable-with-query)
