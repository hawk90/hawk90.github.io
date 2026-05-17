---
title: "Pattern 41: Separate Query from Modifier"
date: 2026-06-02T17:00:00
description: "값을 묻는 것과 상태를 바꾸는 것 — 한 함수에 섞지 않는다 (CQS 원칙)."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 41
tags: [refactoring, cqs, command-query, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 한 함수가 *값을 반환*하면서 *상태를 바꾸지 않는다* (query). 상태를 바꾸면 *값을 반환하지 않는다* (command). Bertrand Meyer의 *Command-Query Separation* 원칙.

## 동기 (Motivation)

함수에 두 책임이 섞이면 *호출자가 함수의 다른 효과를 알아채기 어렵다*. `getTotalOutstandingAndSetReadyForSummaries()` — 이름은 그나마 솔직하지만, 호출 시점·횟수에 *조심*해야 한다. 같은 함수를 *두 번 호출*하면 *값은 같은데 부수효과가 두 번*.

```javascript
// Before — query + modifier
function getTotalOutstandingAndSetReadyForSummaries(customer) {
  let total = 0;
  for (const order of customer.orders) {
    total += order.outstanding;
    order.readyForSummary = true;   // ← side effect
  }
  return total;
}
```

이 함수는 *총액 계산*과 *order 상태 변경*을 함께. 호출자가 *총액만* 필요해도 *상태가 바뀜*. 디버깅 어려움.

```javascript
// After — 분리
function getTotalOutstanding(customer) {
  return customer.orders.reduce((s, o) => s + o.outstanding, 0);
}

function setReadyForSummaries(customer) {
  customer.orders.forEach(o => { o.readyForSummary = true; });
}

// 호출 패턴
const total = getTotalOutstanding(customer);
setReadyForSummaries(customer);
```

`getTotalOutstanding`은 *순수 함수* — 여러 번 호출해도 안전, 메모이즈 가능, 추론 단순. `setReadyForSummaries`는 *목적이 명확한 명령*.

### Command-Query Separation (CQS)

Bertrand Meyer (1988, *Object-Oriented Software Construction*):

- **Query**: 값 반환, 상태 변경 없음.
- **Command**: 상태 변경, 값 반환 없음 (혹은 void).

CQS는 *디자인 원칙*. 강제는 아니지만 *기본은 분리*.

### 신호

- 함수 이름에 `andDoX`, `andSetY`가 들어감.
- 함수가 *값을 반환하면서 변수/객체를 mutate*.
- 호출자가 *결과만 원해서 두 번 호출했더니 의도치 않은 추가 동작*.
- 함수 테스트가 어려움 — *값 검증 + 상태 변경 검증* 모두 필요.

### 언제 적용하는가

- 함수가 *명백히 두 일*을 함.
- *순수 함수로 추출 가능*한 query 부분 존재.
- *side effect free* query가 가치 있음 (memoize, parallel, 테스트).

### 언제 분리하지 않는가 (실용적 예외)

stdlib나 *concurrency primitive*는 *원자성*을 위해 양쪽을 함께 한다:

- `stack.pop()` — 값 반환 + 제거. *분리하면 race*.
- `iterator.next()` — 값 + 진전.
- `Queue.take()` — 값 + 제거.
- `AtomicInteger.getAndIncrement()`.

이들은 *진짜 원자성이 필요*. 일반 도메인 함수에는 분리가 기본.

## 절차 (Mechanics)

1. **함수 복제** — query 이름과 command 이름 각각.
2. **query 버전**에서 *side effect 제거*.
3. **command 버전**에서 *return 제거* (또는 void).
4. **호출처**에서 query 호출 + command 호출로 분리.
5. 컴파일·테스트.
6. 원본 제거.

## 예시 1 — 기본 분리

위 totalOutstanding 예 참고.

## 예시 2 — 검색 + 등록

```javascript
// Before
function findMiscreant(people) {
  for (const p of people) {
    if (p.criminalRecord) {
      setOffAlarms();   // side effect
      return p;
    }
  }
  return "Don Quixote";
}
```

```javascript
// After
function findMiscreant(people) {
  return people.find(p => p.criminalRecord) ?? "Don Quixote";
}

function checkSecurity(people) {
  const miscreant = findMiscreant(people);
  if (miscreant !== "Don Quixote") setOffAlarms();
  return miscreant;
}
```

`findMiscreant`는 순수 — 테스트하고 캐시하고 병렬화 안전. `checkSecurity`가 *결정 + 알람*.

## 예시 3 — Counter 분리

```javascript
// Before
function nextId() {
  return ++_lastId;   // mutate + return
}
```

`pop`처럼 *원자성 필요*하면 그대로 두는 게 옳다. 하지만 *컨텍스트가 다르면* 분리:

```javascript
// After (if not concurrency-critical)
function currentId() { return _lastId; }
function advanceId() { _lastId++; }

// 사용
const id = currentId();
advanceId();
// 위 두 줄을 한 함수로 다시 묶으려면 그게 next의 원자성을 보장
```

분리가 *항상 좋다*는 아니다. *호출 컨텍스트*가 결정.

## 자주 보는 안티패턴

### 1. *Lazy initialization*을 query에 숨김
```javascript
function getConfig() {
  if (!_config) _config = load();   // ← 첫 호출에서 mutate
  return _config;
}
```
*외부 관찰자에게는 순수*이므로 OK. 단 *thread-safe* 보장 필요.

### 2. *Logging*을 query에 두기
```javascript
function getName() {
  log("name requested");   // ← side effect
  return this._name;
}
```
logging은 *외부 관찰 가능 효과*. side effect.

### 3. *Caching*을 modifier로
캐싱은 *대표적 lazy* — 외부 효과 없으면 OK. 캐시가 *외부에 보이면* (e.g., 통계 카운터) 분리.

### 4. *Audit trail* 함수
`getDocument` 호출 시 *조회 기록 저장* → 분리 어려움. 보통 *getDocumentAndAudit* 또는 wrapper로 처리.

### 5. 분리 후 *호출 순서 망각*
command를 잊으면 동작 변경. 분리 직후 *모든 호출처 확인*.

### 6. *원자성 깨는 분리*
concurrent stack `pop`을 `top()` + `pop()`으로 분리하면 *race condition*. 원자성이 본질인 함수는 *그대로*.

## Modern variants

### React `useState` setter

```javascript
const [count, setCount] = useState(0);
// setCount는 command, count는 query — 자연스럽게 분리
```

### Redux

actions는 *command*, selectors는 *query*. 강제로 분리.

### Java `Stream`

```java
list.stream().filter(...).map(...).count();   // query, no mutation
```

stream API는 *기본 query*.

### Rust — `&self` vs `&mut self`

```rust
impl Counter {
    fn current(&self) -> u32 { self.value }       // query
    fn advance(&mut self) { self.value += 1; }    // command
}
```

타입 시스템이 *분리를 강제*.

### Kotlin — `val` vs `var`

`val`은 read-only — query를 자연스럽게 표현.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Extract Method" — query 분리에 활용 |
| ESLint | `no-param-reassign` (modifier 감지) |
| Clippy (Rust) | `&mut self` 불필요시 경고 |

## 성능 고려

분리하면 *때로 두 번 순회*. 일반적 무관. 측정 후 *원자성/성능 critical*이면 합쳐도 OK (CQS는 원칙이지 규칙 아님).

## 관련 패턴

- **자매**: [Pattern 47: Remove Setting Method](/blog/programming/design/refactoring-catalog/pattern47-remove-setting-method)
- **반대**: [Pattern 42: Parameterize Function](/blog/programming/design/refactoring-catalog/pattern42-parameterize-function) — 분리한 뒤 통합 결정
- **원칙**: Command-Query Separation (Meyer)
