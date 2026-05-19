---
title: "Pattern 11: Split Phase"
date: 2026-05-02T11:00:00
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

함수 안에 단계가 섞이면, 한 단계만 바꾸려 해도 다른 단계 코드를 같이 봐야 한다. 단계 사이를 *중간 데이터 구조*로 분리하면 각 phase가 독립적으로 변경 가능해진다.

컴파일러의 *parser → AST → codegen*이 가장 익숙한 예다. 각 phase는 *자기 입력의 형태*만 알면 되고, 다른 phase의 *구현*은 모른다.

### 단계 분리의 가치

1. **변경 독립** — parsing 알고리즘 바뀌어도 codegen 안 깨짐.
2. **테스트 독립** — phase 1의 입출력만으로 phase 1 검증, phase 2는 *중간 데이터를 직접 만들어* 검증.
3. **재사용** — 같은 phase 1 결과를 *여러 phase 2*에 보낼 수 있다 (HTML 렌더링, PDF 렌더링).
4. **이해 가능** — 한 phase는 *한 가지 의무*만, 추상화 단계 통일.

### 신호

- 한 함수 안에 *추상화 단계가 섞임* (한 줄은 문자열 파싱, 다음 줄은 비즈니스 규칙).
- 함수 도중에 *완전히 다른 도메인*으로 전환 (문자열 → 숫자 → 객체 → 출력).
- 입력과 출력 사이에 *중간 산물*이 자연스럽다.
- 같은 입력에 *여러 출력 형태*가 필요해질 수 있다.

### 언제 적용하는가

- 함수가 *수십 줄*이고 단계가 보인다.
- 한 단계 알고리즘을 *바꾸려는데 다른 단계가 같이 잡힘*.
- 테스트가 함수 전체를 통과해야 작은 부분도 확인 가능.
- 같은 데이터에 *다른 형태의 출력*이 필요해진다.

## 절차 (Mechanics)

1. 두 phase의 경계가 되는 *중간 데이터 구조*를 만든다.
2. 두 번째 phase의 코드를 *별도 함수*로 추출, 중간 데이터를 매개변수로 받게.
3. 모든 두 번째 phase 의존이 *중간 데이터로만* 흐르게 한다 (원본 입력 직접 참조 제거).
4. 첫 번째 phase가 *중간 데이터를 반환*하도록 정리.
5. 클라이언트는 phase1 → phase2 순차 호출로 정리.

## 예시 1 — 가격 계산 + 배송

```javascript
// Before — order string parsing + 가격 계산이 한 함수
function priceOrder(product, quantity, shippingMethod) {
  const basePrice = product.basePrice * quantity;
  const discount  = Math.max(quantity - product.discountThreshold, 0)
                    * product.basePrice * product.discountRate;
  const shipping  = Math.min(basePrice * shippingMethod.discountFee, shippingMethod.feeCap)
                    * quantity;
  return basePrice - discount + shipping;
}
```

가격 계산과 배송 계산이 섞여 있다.

```javascript
// After — phase1: priceData 계산, phase2: 배송 적용
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

이제 가격 계산만 바꾸려면 phase1만, 배송 정책만 바꾸려면 phase2만 본다. `priceData`가 *계약*.

## 예시 2 — Parser → Interpreter

```javascript
// Before — 한 함수가 parsing과 evaluation 모두
function evaluate(input) {
  const tokens = input.split(/\s+/);
  let result = parseFloat(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const operand = parseFloat(tokens[i + 1]);
    if (op === "+") result += operand;
    else if (op === "-") result -= operand;
    else throw new Error("unknown op");
  }
  return result;
}
```

```javascript
// After — parse → AST → eval
function evaluate(input) {
  return interpret(parse(input));
}

function parse(input) {
  const tokens = input.split(/\s+/);
  const node = { type: "num", value: parseFloat(tokens[0]) };
  let current = node;
  for (let i = 1; i < tokens.length; i += 2) {
    current = { type: "binop", op: tokens[i],
                left: current,
                right: { type: "num", value: parseFloat(tokens[i + 1]) } };
  }
  return current;
}

function interpret(ast) {
  if (ast.type === "num") return ast.value;
  if (ast.type === "binop") {
    const l = interpret(ast.left);
    const r = interpret(ast.right);
    if (ast.op === "+") return l + r;
    if (ast.op === "-") return l - r;
    throw new Error("unknown op");
  }
}
```

AST가 *재사용 가능*. 다른 interpreter (구문 강조, 컴파일러)에도 같은 parse 결과 활용.

## 예시 3 — ETL Pipeline

```javascript
// Before — extract + transform + load가 섞여
function importUsers(csvText) {
  const rows = csvText.split("\n").map(line => line.split(","));
  for (let i = 1; i < rows.length; i++) {
    const [id, name, email] = rows[i];
    if (!email.includes("@")) continue;
    db.upsertUser({ id: parseInt(id), name: name.trim(), email: email.toLowerCase() });
  }
}
```

```javascript
// After — 3 phase
function importUsers(csvText) {
  const raw     = extract(csvText);
  const valid   = transform(raw);
  load(valid);
}

function extract(csvText) {
  const rows = csvText.split("\n").map(line => line.split(","));
  return rows.slice(1).map(([id, name, email]) => ({ id, name, email }));
}

function transform(rows) {
  return rows
    .filter(r => r.email.includes("@"))
    .map(r => ({ id: parseInt(r.id), name: r.name.trim(), email: r.email.toLowerCase() }));
}

function load(rows) {
  for (const r of rows) db.upsertUser(r);
}
```

각 단계 *순수 함수* (load 제외), *유닛 테스트* 가능. ETL 표준 패턴.

## 사용 사례

- **컴파일러**: parser → AST → codegen
- **DTO → Domain**: API 응답 파싱 → 도메인 객체 변환
- **ETL**: extract → transform → load
- **View 구성**: model → view-model → render
- **이미지 처리**: load → filter → resize → save
- **요청 처리**: parse → validate → execute → format response

## 자주 보는 안티패턴

### 1. 중간 데이터 구조가 약함
phase 사이 *임시 객체*가 너무 *느슨한 dict*면 의존 추적이 어렵다. 명시적 type 또는 record로.

### 2. Phase 간 결합 잔류
phase 2가 *원본 input*도 참조하면 분리가 *부분적*. 의존은 *중간 데이터*로만 흐르게.

### 3. 단계 너무 잘게
2단계로 충분한 걸 5단계로 자르면 *간단한 로직이 흩어진다*. *변경의 축*이 맞을 때만 분리.

### 4. 모든 phase가 같은 모듈
파일이 거대해질 수 있다. *각 phase를 별 모듈*로 (compiler.parser, compiler.interpreter).

### 5. Streaming 무시
큰 데이터에 *한 번에 전체 통과*하면 메모리 부족. Generator·async stream으로 *lazy phase*.

## Modern variants

### Functional pipeline (JS / Rust / F#)

```javascript
const result = pipe(parse, validate, transform, format)(input);
```

### RxJS / Reactive streams

```javascript
const stream = from(input)
  .pipe(map(parse), filter(validate), map(transform), reduce(format));
```

### Async generators

```javascript
async function* parsePhase(stream)  { for await (const x of stream) yield parse(x); }
async function* transformPhase(stream) { for await (const x of stream) yield transform(x); }

for await (const out of transformPhase(parsePhase(input))) { /* use */ }
```

### Rust iterators

```rust
input.lines().map(parse).filter(valid).map(transform).for_each(load);
```

## 도구 / IDE

수동 추출. 표준 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function) 도구 활용.

## 성능 고려

- 중간 데이터 *복사·할당* 비용. 작은 데이터엔 무시 가능.
- 큰 데이터는 *streaming* (Generator, RxJS, Rust iterator) — 한 phase가 끝나기 전 다음 phase 시작.
- Pipeline composition은 JIT 최적화로 *fusion* 가능 (Rust iterator의 zero-cost abstraction).

## 관련 패턴

- **자매**: [Pattern 10: Combine Functions into Transform](/blog/programming/design/refactoring-catalog/pattern10-combine-functions-into-transform)
- **함수 추출**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **객체 모델**: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
- **loop → pipeline**: [Pattern 28: Replace Loop with Pipeline](/blog/programming/design/refactoring-catalog/pattern28-replace-loop-with-pipeline)
