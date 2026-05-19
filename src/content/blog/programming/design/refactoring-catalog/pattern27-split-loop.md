---
title: "Pattern 27: Split Loop"
date: 2026-05-02T03:00:00
description: "한 loop가 *두 가지 일*을 하면 분리한다 — Extract Function의 전 단계."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 27
tags: [refactoring, split-loop, single-responsibility, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 한 loop가 *서로 무관한 일 두 가지*를 한다면 두 loop로 분리한다. 한 loop는 *한 책임*만.

## 동기 (Motivation)

"하나의 loop가 모든 걸 한다"는 흔한 *효율 최적화*다. 그러나 그 효율의 대가로 다음을 잃는다.

1. **추출 불가능** — 한 loop 안에서 *책임이 섞이면* 함수로 빼내기 어렵다.
2. **수정 위험** — 한 책임을 바꾸려는데 다른 책임 코드도 같이 건드린다.
3. **의도 불명** — loop 한 토막을 보고 *이 loop가 무엇을 위한지*가 모호.
4. **재사용 불가** — 한 책임만 따로 쓰고 싶은데 묶여 있어 못 함.

성능을 위해 한 loop로 묶는 것은 *흔한 함정*. 측정 결과 정말 hot path가 아니라면 *가독성*을 우선. 두 loop가 코드의 *의미*를 더 잘 드러낸다.

### Loop Fusion 신화

"두 loop가 한 loop보다 *2배 느리다*" — 거의 사실 아님:
- JIT/컴파일러가 *loop fusion 최적화*를 자동 수행.
- O(2n) = O(n). 점근 복잡도 동일.
- 데이터 크기 *수만 이하*에선 차이 측정 불가.

진짜 hot path에선 측정 후 결정. *대부분* 가독성이 답.

### 신호

- loop 본문에 *서로 다른 누적 변수* 2-3개.
- loop 안에 `if`/`else`가 *완전히 다른 계산*을 한다.
- 같은 collection을 *두 가지 통계*로 산출.
- 주석으로 *loop body를 두 구역*으로 나눌 수 있다.

### 언제 적용하는가

- 한 loop가 *둘 이상의 무관한 일*.
- loop body가 *복잡*해 의도 파악이 어렵다.
- [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)을 *준비*.
- [Replace Loop with Pipeline](/blog/programming/design/refactoring-catalog/pattern28-replace-loop-with-pipeline)을 *준비*.

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 27 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern27-split-loop.svg)

## 절차 (Mechanics)

1. **loop 본문을 복사**해 두 loop로 만든다.
2. 각 loop는 *한 가지 일*만 하도록 정리 — 다른 누적·다른 조건 제거.
3. *부작용*이 다른 loop와 *순서 의존*이 없는지 확인.
4. 컴파일·테스트.
5. 보통 *후속 단계*: 각 loop를 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)으로 추출.

## 예시 1 — 무관한 두 통계

```javascript
// Before — 한 loop에 두 일
function statistics(people) {
  let totalSalary = 0;
  let youngest = people[0] ? people[0].age : Infinity;

  for (const p of people) {
    if (p.age < youngest) youngest = p.age;
    totalSalary += p.salary;
  }

  return `youngest: ${youngest}, total salary: ${totalSalary}`;
}
```

`youngest` 계산과 `totalSalary` 누적은 *완전히 무관*.

```javascript
// After
function statistics(people) {
  let totalSalary = 0;
  for (const p of people) totalSalary += p.salary;

  let youngest = people[0] ? people[0].age : Infinity;
  for (const p of people) if (p.age < youngest) youngest = p.age;

  return `youngest: ${youngest}, total salary: ${totalSalary}`;
}
```

이제 *각 loop가 한 책임*. 추출이 자연:

```javascript
function statistics(people) {
  return `youngest: ${youngestAge(people)}, total salary: ${totalSalary(people)}`;
}

function totalSalary(people) {
  return people.reduce((s, p) => s + p.salary, 0);
}

function youngestAge(people) {
  if (people.length === 0) return Infinity;
  return Math.min(...people.map(p => p.age));
}
```

각 함수가 *독립 테스트* 가능, *재사용* 가능.

## 예시 2 — 조건별 다른 일

```javascript
// Before
for (const order of orders) {
  if (order.status === "pending") {
    pendingTotal += order.amount;
    pendingCount++;
  } else if (order.status === "completed") {
    completedRevenue += order.amount;
    addToReport(order);
  }
}
```

pending과 completed가 *완전히 다른 처리*. loop 한 번으로 묶은 *효율 가정*. 분리.

```javascript
// After
for (const order of orders) {
  if (order.status === "pending") {
    pendingTotal += order.amount;
    pendingCount++;
  }
}

for (const order of orders) {
  if (order.status === "completed") {
    completedRevenue += order.amount;
    addToReport(order);
  }
}
```

이후 [Replace Loop with Pipeline](/blog/programming/design/refactoring-catalog/pattern28-replace-loop-with-pipeline)로:

```javascript
const pending = orders.filter(o => o.status === "pending");
const pendingTotal = pending.reduce((s, o) => s + o.amount, 0);
const pendingCount = pending.length;

const completed = orders.filter(o => o.status === "completed");
const completedRevenue = completed.reduce((s, o) => s + o.amount, 0);
completed.forEach(addToReport);
```

선언적, 의도 명확.

## 예시 3 — 변환 + 부수효과 분리

```javascript
// Before — 변환과 로깅 섞임
const result = [];
for (const item of items) {
  console.log(`processing ${item.id}`);
  if (item.active) result.push(item.transform());
}
```

```javascript
// After
items.forEach(item => console.log(`processing ${item.id}`));
const result = items.filter(i => i.active).map(i => i.transform());
```

부수효과(로그)와 *순수 변환*이 분리. 테스트가 *순수 부분*만 가능.

## 자주 보는 안티패턴

### 1. 성능 우려로 *분리 거부*
"O(2n)이라 느림" — 측정 없이 가정. *가독성을 위한 분리* 우선, 정말 hot이면 *나중에 합침*.

### 2. *순서 의존* 무시
두 책임이 *순서에 의존*하면 분리 후 행동 변경. 예: 첫 loop가 *변형*한 collection을 두 번째 loop가 사용.

### 3. *Iteration 중 mutation*
첫 loop에서 collection 자체를 변경하면 두 번째 loop가 *다른 데이터*를 본다. immutable로 변경 또는 *복사*.

### 4. *부수효과* 분리 못 함
loop 안의 부수효과(DB write, network)가 *원자적*이어야 하는데 분리하면 *부분 실패* 가능. transaction 또는 그대로.

### 5. 두 loop가 *진짜로 같은 일*
무관해 보이지만 사실 *같은 collection 같은 누적*이면 분리가 의미 없다. 의도 명확화.

## Modern variants

### Pipeline로 진화 (가장 자연스러운 후속)

```javascript
// Imperative two-loop → Functional pipeline
const totalSalary = people.reduce((s, p) => s + p.salary, 0);
const youngestAge = Math.min(...people.map(p => p.age));
```

### Parallel processing
분리된 loop는 *병렬화*가 쉽다 (각 loop가 독립).

```javascript
const [salaryTotal, youngest] = await Promise.all([
  computeSalaryTotal(people),
  computeYoungest(people),
]);
```

### Stream / generator
대용량 데이터는 *stream*으로 같은 데이터를 *한 번만* 통과.

```javascript
let salaryTotal = 0, youngest = Infinity;
for await (const p of streamPeople()) {
  salaryTotal += p.salary;
  if (p.age < youngest) youngest = p.age;
}
```

I/O bound면 *한 통과*가 필수. 그 경우 split loop 안 함.

## 도구 / IDE

수동. *loop 복사 + 정리*.

## 성능 고려

- JIT/컴파일러의 *loop fusion* 최적화 — 작은 데이터엔 차이 없음.
- 큰 데이터 (백만+)·hot path에서 *한 번 통과*가 정말 빠를 수 있음 — 측정.
- I/O bound (DB, network)는 *반드시 한 통과* — 그러나 그땐 *함수 추출*만 (분리 X).

## 관련 패턴

- **다음 단계**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **선언적 전환**: [Pattern 28: Replace Loop with Pipeline](/blog/programming/design/refactoring-catalog/pattern28-replace-loop-with-pipeline)
- **자매**: [Pattern 26: Slide Statements](/blog/programming/design/refactoring-catalog/pattern26-slide-statements)
- **변수 분리**: [Pattern 30: Split Variable](/blog/programming/design/refactoring-catalog/pattern30-split-variable)
