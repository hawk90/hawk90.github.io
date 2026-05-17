---
title: "Pattern 28: Replace Loop with Pipeline"
date: 2026-06-02T04:00:00
description: "Loop를 filter·map·reduce 파이프라인으로 — 의도를 직접 드러낸다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 28
tags: [refactoring, pipeline, functional, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Loop의 의도가 *collection pipeline*(filter, map, reduce)으로 더 잘 표현된다면 변환한다.

## 동기 (Motivation)

imperative loop는 *어떻게*를 강조한다 — `for`, index, accumulator. 그러나 대부분의 loop는 의도상 *무엇*을 한다 — *필터링*, *변환*, *집계*. Collection pipeline은 *무엇*을 직접 표현해 의도를 더 명확히 드러낸다.

```javascript
// "어떻게" — for loop
const r = [];
for (const x of items) if (x.active) r.push(x.name);
const result = r.sort();

// "무엇" — pipeline
const result = items
  .filter(x => x.active)
  .map(x => x.name)
  .sort();
```

각 단계가 *동사*. 흐름을 따라 읽으면 한 줄로 이해.

### 신호

- loop가 *filter + map + reduce* 패턴.
- loop body가 *순수 함수* (부수효과 없음).
- 누적 변수가 *결과 collection*.

### Pipeline의 한계

모든 loop를 파이프라인으로 바꾸지는 말 것:

1. **부수효과** — 로깅, DB write, network 호출은 *map* 안에 두면 어색.
2. **Early exit** — `break` / `return`이 깊은 곳에서. 파이프라인은 *모두 통과*.
3. **누적 상태가 복잡** — accumulator가 객체·튜플이면 reduce가 *long lambda*.
4. **디버깅** — 파이프라인 단계 breakpoint가 어렵다.
5. **성능** — N단계 파이프라인이 N번 통과 vs 한 loop 한 통과 (대부분 무시 가능, hot path는 측정).

### 언제 적용하는가

- loop가 *순수 변환·필터링·집계*.
- 의도가 *함수형 명사*로 표현 (`activeUsers`, `totalRevenue`).
- 부수효과 없음.
- 코드 베이스가 *함수형 스타일*.

## 절차 (Mechanics)

1. **source collection**을 찾아 *pipeline 시작*으로.
2. **각 loop 단계**를 pipeline 함수로 변환:
   - `if (...) continue` → `filter`
   - 변형 후 push → `map`
   - 누적 → `reduce`
   - 부수효과 (한 번) → `forEach`
3. **각 단계마다** 결과를 변수로 분해해 검증 가능.
4. 임시 변수 제거, 한 줄 chain으로 (또는 가독성 위해 다단 들여쓰기).
5. 컴파일·테스트.

## 예시 1 — Office 필터링

```javascript
// Before
function acquireData(input) {
  const lines = input.split("\n");
  let firstLine = true;
  const result = [];

  for (const line of lines) {
    if (firstLine) { firstLine = false; continue; }
    if (line.trim() === "") continue;

    const record = line.split(",");
    if (record[1].trim() === "India") {
      result.push({ city: record[0].trim(), phone: record[2].trim() });
    }
  }
  return result;
}
```

```javascript
// After
function acquireData(input) {
  return input.split("\n")
    .slice(1)
    .filter(line => line.trim() !== "")
    .map(line => line.split(","))
    .filter(fields => fields[1].trim() === "India")
    .map(fields => ({ city: fields[0].trim(), phone: fields[2].trim() }));
}
```

각 단계가 *한 변환*. 새 필터 추가 시 *한 줄*.

## 예시 2 — 집계

```javascript
// Before
let total = 0;
let count = 0;
for (const order of orders) {
  if (order.status === "completed") {
    total += order.amount;
    count++;
  }
}
const average = count > 0 ? total / count : 0;
```

```javascript
// After
const completed = orders.filter(o => o.status === "completed");
const total = completed.reduce((s, o) => s + o.amount, 0);
const average = completed.length > 0 ? total / completed.length : 0;
```

또는 한 줄:

```javascript
const completedAmounts = orders
  .filter(o => o.status === "completed")
  .map(o => o.amount);
const average = completedAmounts.length > 0
  ? completedAmounts.reduce((s, x) => s + x, 0) / completedAmounts.length
  : 0;
```

## 예시 3 — Group by + count

```javascript
// Before
const result = {};
for (const order of orders) {
  const key = order.category;
  if (!result[key]) result[key] = 0;
  result[key]++;
}
```

```javascript
// After (ES2024+)
const result = Object.groupBy(orders, o => o.category);
const counts = Object.fromEntries(
  Object.entries(result).map(([k, v]) => [k, v.length])
);

// 또는 reduce
const counts2 = orders.reduce((acc, o) => {
  acc[o.category] = (acc[o.category] || 0) + 1;
  return acc;
}, {});
```

## 자주 보는 안티패턴

### 1. 부수효과를 *map 안에*
```javascript
items.map(x => { sendEmail(x); return x.id; });   // 부수효과 + 변환 — 헷갈림
```
부수효과는 *forEach*에. 변환과 분리.

### 2. 너무 긴 lambda
```javascript
items.map(x => {
  // 20줄...
});
```
긴 lambda는 *별 함수* 추출.

### 3. 디버깅 친화성 잃음
한 줄 chain은 *breakpoint 어려움*. *각 단계를 변수*로 분해해 디버깅.

### 4. *Early exit* 무리 변환
```javascript
for (const x of items) { if (matches(x)) return x; }
// → items.find(matches)
```
`find`로 가능하지만 *복잡 조건*은 loop가 더 명확.

### 5. *비싼 중간 array* 생성
큰 데이터에 `.filter().map().filter()`는 *중간 array 3개*. lazy iteration (rxjs, lodash/fp, Rust iterator) 검토.

### 6. *명령적*이 더 명확한 경우 무리하게 변환
*상태 머신, 복잡한 종료 조건*은 imperative가 더 자연. 모든 loop를 파이프라인으로 변환할 필요 없음.

## Modern variants

### Lazy iteration

```javascript
// 모든 단계 lazy (Rust style)
import { pipe, filter, map, take } from "lodash/fp";
const result = pipe(
  filter(x => x.active),
  map(x => x.name),
  take(10),
)(items);
```

중간 array 없음, *필요한 만큼*만 평가.

### Rust iterator

```rust
let result: Vec<_> = items.iter()
    .filter(|x| x.active)
    .map(|x| x.name.clone())
    .take(10)
    .collect();
```

*zero-cost abstraction* — 컴파일 후 hand-written loop와 같은 속도.

### Java Stream

```java
List<String> result = items.stream()
    .filter(x -> x.isActive())
    .map(Item::getName)
    .limit(10)
    .collect(Collectors.toList());
```

`parallelStream()`으로 *자동 병렬화*.

### LINQ (C#)

```csharp
var result = items
    .Where(x => x.Active)
    .Select(x => x.Name)
    .Take(10)
    .ToList();
```

### RxJS / Observable
*반응형 stream*. 비동기 이벤트 스트림에 자연.

```javascript
events$.pipe(
  filter(e => e.type === "click"),
  map(e => e.coords),
  throttleTime(100),
).subscribe(handleClick);
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Convert to .filter / .map" |
| Rust Clippy | `manual_filter_map` 권장 |
| ESLint | `array-callback-return`, `prefer-array-methods` |

자동 변환 도구가 *일부 패턴*은 권장. 큰 변환은 수동.

## 성능 고려

- N단계 파이프라인은 N번 통과 (in eager mode). 작은 데이터엔 무시 가능.
- Hot path에선 *lazy* 또는 *single loop*. 측정 후 결정.
- Rust iterator·LINQ는 *fusion* 으로 single pass.
- 병렬화는 *parallelStream* / *par_iter* — CPU bound에 효과.

## 관련 패턴

- **전 단계**: [Pattern 27: Split Loop](/blog/programming/design/refactoring-catalog/pattern27-split-loop)
- **다음 단계**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **알고리즘 교체**: [Pattern 20: Substitute Algorithm](/blog/programming/design/refactoring-catalog/pattern20-substitute-algorithm)
- **dead code 제거**: [Pattern 29: Remove Dead Code](/blog/programming/design/refactoring-catalog/pattern29-remove-dead-code)
