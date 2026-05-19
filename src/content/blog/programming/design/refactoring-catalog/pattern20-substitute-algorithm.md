---
title: "Pattern 20: Substitute Algorithm"
date: 2026-05-02T20:00:00
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

리팩터링은 보통 *동작을 보존하면서 구조만* 바꾼다. 그러나 가끔 알고리즘 자체가 *잘못 선택*된 경우가 있다.

- 손으로 짠 quadratic search보다 *hash map* lookup이 좋다.
- ad-hoc sort보다 *표준 라이브러리 sort*가 정확하고 빠르다.
- 직접 짠 string formatter보다 *Intl* 가 locale-aware.
- DIY date 계산보다 *Temporal API* 또는 라이브러리가 안전.

그땐 알고리즘을 *통째로 교체*. 작은 단계 리팩터링이 *한계에 도달*하면 한 번에 큰 점프.

### 일반 리팩터링과 다른 점

다른 리팩터링은 *한 단계마다 동작 보존* 보장. Substitute Algorithm은 *전제 변경* — 새 알고리즘이 *동일 결과를 낸다*는 *가정*에 의존. 따라서 *테스트 커버리지*가 *전제 조건*.

### 신호

- 알고리즘 본문이 *복잡한데* 실은 표준 라이브러리에 있다.
- 손으로 짠 정렬·검색·암호화 (직접 짤 이유 거의 없음).
- 알고리즘이 *성능에 비해 너무 길다*.
- 새 라이브러리·언어 기능이 *같은 일을 한 줄로*.

### 언제 적용하는가

- 알고리즘 *교체로 가독성 또는 성능* 향상.
- *테스트 커버리지*가 충분 (edge case 포함).
- 새 알고리즘이 *검증된 라이브러리*.
- 옛 알고리즘이 *불필요한 복잡도*를 가짐.

## 절차 (Mechanics)

1. 새 알고리즘이 *기존 동작과 동일*함을 검증할 *테스트를 충분히* 갖춘다. 부족하면 추가.
2. 함수 본문을 *새 알고리즘*으로 교체.
3. 모든 테스트가 통과하는지 확인.
4. edge case 테스트 (빈 입력, 큰 입력, NaN, 동시 동일 키, null, unicode 등).
5. 성능 비교 (필요시).
6. 옛 알고리즘이 *문서·comment*에 남아 있으면 정리.

## 예시 1 — 손으로 짠 search

```javascript
// Before — 4명 후보를 하드코딩으로 검색
function foundPerson(people) {
  for (let i = 0; i < people.length; i++) {
    if (people[i] === "Don")    return "Don";
    if (people[i] === "John")   return "John";
    if (people[i] === "Kent")   return "Kent";
  }
  return "";
}
```

후보 목록과 검색 로직이 *섞임*.

```javascript
// After — 명확한 알고리즘
function foundPerson(people) {
  const candidates = ["Don", "John", "Kent"];
  return people.find(p => candidates.includes(p)) || "";
}
```

의도가 한눈에 드러난다. 후보 추가도 *배열만 수정*.

## 예시 2 — quadratic → hash

```javascript
// Before — O(n²)
function findDuplicates(items) {
  const dups = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i] === items[j] && !dups.includes(items[i])) {
        dups.push(items[i]);
      }
    }
  }
  return dups;
}
```

10000개 입력에서 10초.

```javascript
// After — O(n)
function findDuplicates(items) {
  const seen = new Set();
  const dups = new Set();
  for (const item of items) {
    if (seen.has(item)) dups.add(item);
    else seen.add(item);
  }
  return [...dups];
}
```

10000개 입력에서 5ms. *2000배 빠름*.

테스트:
- 빈 배열: `[]` → `[]`
- 중복 없음: `[1,2,3]` → `[]`
- 모두 중복: `[1,1,1]` → `[1]`
- 여러 중복: `[1,2,2,3,3,3]` → `[2,3]`
- 큰 입력: `Array(10000).fill(0).map((_,i) => i%100)` → 정상

## 예시 3 — 직접 sort → 표준

```javascript
// Before
function sortByAge(people) {
  // bubble sort
  const arr = [...people];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j].age > arr[j + 1].age) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}
```

O(n²) bubble sort.

```javascript
// After — V8의 TimSort
function sortByAge(people) {
  return [...people].sort((a, b) => a.age - b.age);
}
```

표준 라이브러리는 *수년의 최적화*. 직접 짤 이유 없음.

## 자주 보는 안티패턴

### 1. 테스트 없이 교체
*동작 차이*를 못 잡으면 production에서 회귀. 반드시 테스트 우선.

### 2. Edge case 검증 누락
- NaN, Infinity, -0
- 빈 입력, 단일 원소
- 매우 큰 입력 (메모리, stack)
- Unicode (한글, emoji, RTL)
- 동시 같은 키
- null/undefined
- 순서 보존 여부 (stable sort vs unstable)

새 알고리즘이 *이 모든 케이스*에 옛 알고리즘과 동일한지.

### 3. 성능 가정 검증 안 함
"hash map이 더 빠르다" — *측정 후* 검증. 작은 입력엔 *오히려 느릴 수 있다* (hashing overhead).

### 4. 라이브러리 검증 안 함
새 라이브러리에 *bug, security issue*가 있을 수 있다. 인기·유지보수·이슈 트래커 확인.

### 5. *비결정적* 알고리즘으로 교체
hash map은 *순서가 implementation-defined*. 옛 알고리즘이 *insertion order 보장*에 의존했다면 깨짐. JS Map은 보장, plain object는 보장 안 됨.

### 6. 너무 *큰 점프*
한 번에 *알고리즘 + 자료구조 + 인터페이스* 모두 바꾸면 어디서 회귀가 들어왔는지 추적 불가. *알고리즘만* 우선, 자료구조는 다음.

## Modern variants

### Library 활용 우선

```javascript
// 직접 안 짜기
import _ from "lodash";
import dayjs from "dayjs";

const unique = _.uniq(items);
const formatted = dayjs(date).format("YYYY-MM-DD");
```

### 함수형 변환

```javascript
// Before — for loop + 조건
const result = [];
for (const x of items) if (x.active) result.push(x.name.toUpperCase());

// After — pipeline
const result = items.filter(x => x.active).map(x => x.name.toUpperCase());
```

함수형이 항상 빠르지는 않다 — *읽기*는 보통 더 좋음.

### SIMD / parallel
대용량 데이터는 *SIMD*(`Float32Array` + WebAssembly SIMD), *worker thread*, *GPU*.

### Streaming
큰 데이터는 *array 통째* 대신 *stream*으로. Node.js Streams, RxJS, async iterators.

## 도구 / IDE

자동 도구 없음. *알고리즘 결정은 사람*.

## 성능 고려

- 알고리즘 복잡도 (Big O) 측정.
- 실제 *입력 크기 분포* 확인 — 100개 vs 100만개 다름.
- 작은 입력엔 *상수 계수* 중요 (hash overhead, allocation).
- *프로파일링* 후 결정 — guess 금지.

## 관련 패턴

- **자매**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function) (교체 전 구조 정리)
- **loop → pipeline**: [Pattern 28: Replace Loop with Pipeline](/blog/programming/design/refactoring-catalog/pattern28-replace-loop-with-pipeline)
- **조건 → 다형성**: [Pattern 38: Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)
