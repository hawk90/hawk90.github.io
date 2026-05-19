---
title: "Pattern 50: Replace Command with Function"
date: 2026-05-02T02:00:00
description: "Command가 단순해졌다면 — 다시 함수로 돌려 over-engineering 제거."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 50
tags: [refactoring, command-object, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Command 객체가 *분해 없이 한 method로 단순*해졌다면, 다시 함수로 돌려 *over-engineering*을 제거한다.

## 동기 (Motivation)

[Replace Function with Command](/blog/programming/design/refactoring-catalog/pattern49-replace-function-with-command)의 *역방향*. 시간이 지나며 command가 *단순해질 수* 있다 — 분해할 단계가 사라지고 *execute 메서드만 남음*. 그때는 *함수가 더 적절*.

```javascript
// Before — Command class
class ChargeCalculator {
  constructor(customer, usage, provider) {
    this._customer = customer;
    this._usage = usage;
    this._provider = provider;
  }

  execute() {
    const baseCharge = this._customer.baseRate * this._usage;
    return baseCharge + this._provider.connectionCharge;
  }
}

const charge = new ChargeCalculator(customer, usage, provider).execute();
```

execute가 *두 줄*. constructor + execute가 *boilerplate*. 함수 한 개로 충분.

```javascript
// After — function
function charge(customer, usage, provider) {
  const baseCharge = customer.baseRate * usage;
  return baseCharge + provider.connectionCharge;
}

const c = charge(customer, usage, provider);
```

### 신호

- Command class가 *execute method 하나*.
- private helper *0-1개*.
- field가 *모두 constructor 매개변수의 직접 저장*.
- *undo/queue/state* 없음.
- 호출자가 *항상 `new X(...).execute()`* 패턴.

### 언제 적용하는가

- Command가 *단순화됨*.
- *undo/queue 더 이상 필요 없음*.
- *boilerplate 부담* 인식됨.

### 언제 적용하지 않는가

- *undo/queue* 여전히 사용.
- 분해된 *private method 가치*.
- *Plugin 시스템*에서 Command interface 필요.

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 50 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern50-replace-command-with-function.svg)

## 절차 (Mechanics)

1. **execute body** 분석 — 함수로 충분한지 확인.
2. **field를 parameter로** 옮기는 함수 작성.
3. *호출처를 함수 호출로* 한 곳씩 교체.
4. 모든 호출 옮겼으면 *class 제거*.
5. 컴파일·테스트.

## 예시 1 — 단순 command 제거

위 ChargeCalculator 예 참고.

## 예시 2 — Helper method 일부 유지

```javascript
// Before
class Compiler {
  constructor(source) { this._source = source; }
  execute() {
    const tokens = this._tokenize();
    const ast = this._parse(tokens);
    return this._generate(ast);
  }
  _tokenize() { /* */ }
  _parse(tokens) { /* */ }
  _generate(ast) { /* */ }
}
```

여기서는 *3단계 분해 + state(`_source`)*가 의미. command 유지가 옳음.

```javascript
// After — 분해 제거 가능하면 함수
function compile(source) {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  return generate(ast);
}

function tokenize(source) { /* */ }
function parse(tokens) { /* */ }
function generate(ast) { /* */ }
```

각 단계가 *순수 함수*. *state 공유 없음*이면 함수가 더 적합.

## 예시 3 — Closure 대체

```javascript
// Before
class Counter {
  constructor(start) { this._count = start; }
  execute() { return ++this._count; }
}

const c = new Counter(0);
c.execute();   // 1
c.execute();   // 2
```

```javascript
// After (closure)
function makeCounter(start) {
  let count = start;
  return () => ++count;
}

const c = makeCounter(0);
c();   // 1
c();   // 2
```

class → closure. *함수형* 표현.

## 자주 보는 안티패턴

### 1. *Premature simplification*
command가 단순한 *현재 시점에* 함수화했는데 *다시 복잡해짐* → class 부활. 변화 패턴 파악.

### 2. *Helper 함수 노출*
class private이 *함수가 되면 모두 module-level*. *export 정책* 정리.

### 3. *State 잃어버림*
command가 *전체 실행 동안 state 보유*했는데 함수화로 *parameter 폭증*. state가 본질이면 command 유지.

### 4. *Interface 깨기*
plugin/extension 시스템이 *Command interface* 의존 — 함수화 시 *외부 API 깨짐*.

### 5. *Undo 무시*
undo 가능했던 command를 함수화 → *undo 기능 상실*. 사용자가 명시적으로 *기능 제거 확인*.

### 6. *Naming 충돌*
함수 이름이 *기존 함수와 충돌*. 적절한 이름.

## Modern variants

### Functional vs OOP

함수형 언어(Haskell, Scala)에선 *closure*가 자연스러운 command 대안. OOP 언어도 *lambda/arrow function* 강력.

### Higher-order function

command queue를 *함수 배열*로:

```javascript
const queue = [];
queue.push(() => doSomething());
queue.push(() => doSomethingElse());
queue.forEach(cmd => cmd());
```

class 없이 *queue + execute*.

### Rust closure

```rust
let charge = |customer: &Customer, usage: u32, provider: &Provider| -> f64 {
    customer.base_rate * usage as f64 + provider.connection_charge
};
```

closure가 *암묵 state 포착* — command 대안.

### TS function type

```typescript
type ChargeFn = (customer: Customer, usage: number, provider: Provider) => number;

const charge: ChargeFn = (customer, usage, provider) =>
  customer.baseRate * usage + provider.connectionCharge;
```

## Pattern 49 vs 50 — 결정 표

| 상황 | 권장 |
| --- | --- |
| 함수 50줄+, helper 분해 절실 | Function → Command (Pattern 49) |
| 단계마다 *state 공유* | Command |
| Undo/queue 필요 | Command |
| 함수가 한 두 줄, helper 없음 | Function 그대로 |
| Command가 *execute만 남음* | Command → Function (Pattern 50) |
| *Closure로 state 캡처* 가능 | Function |

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Inline Class" |
| Resharper | "Replace with delegate" |
| ESLint | `no-unnecessary-class` (일부) |

## 성능 고려

class → 함수: *생성 비용 절약*. closure는 *capture overhead* 약간 — 일반적 무관.

## 관련 패턴

- **역방향**: [Pattern 49: Replace Function with Command](/blog/programming/design/refactoring-catalog/pattern49-replace-function-with-command)
- **자매**: [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
- **함수형**: closure, lambda, higher-order function
