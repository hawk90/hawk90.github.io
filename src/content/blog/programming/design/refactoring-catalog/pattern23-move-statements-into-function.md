---
title: "Pattern 23: Move Statements into Function"
date: 2026-06-01T23:00:00
description: "함수 호출 전·후 statement가 *항상* 함께 다닌다면 함수 안으로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 23
tags: [refactoring, move-statements, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 statement가 *함수 호출의 모든 위치*에서 직전·직후에 반복된다면, 그 statement는 함수 안으로 이동한다.

## 동기 (Motivation)

다음과 같은 패턴이 보인다.

```javascript
console.log("=== START ===");
processOrder(order);

console.log("=== START ===");
processPayment(order);

console.log("=== START ===");
sendConfirmation(order);
```

`console.log("=== START ===")`가 매번 함수 호출 전에. 만약 *모든 호출*이 이 패턴이라면 statement를 함수 안으로 옮긴다 — *중복 제거 + 호출자 단순화*.

함수 *책임 정의*의 측면에서도 자연스럽다. log를 매번 호출자가 책임지는 게 아니라 *함수 자체가* 자기 동작을 알리게.

### 신호

- 함수 호출 *직전 또는 직후*에 매번 같은 statement.
- 그 statement가 *그 함수의 동작과 의미상 결합*.
- 호출자에서 그 statement를 *제거하면 안 됨*.

### Move Statements to Callers와의 결정

| 상황 | 적용 |
| --- | --- |
| *모든 호출*에서 같은 statement | Into Function (안으로) |
| *일부 호출만* 그 statement 필요 | To Callers (밖으로) |
| statement가 *함수 책임*에 자연스럽다 | Into Function |
| statement가 *호출자별로 달라야* | To Callers |

### 언제 적용하는가

- 함수 호출 전/후의 반복 statement.
- 그 statement가 함수의 *전·후처리*에 해당 (log, setup, teardown).
- 함수 책임이 *자기 동작을 알리는 것*까지 포함하는 게 자연스러움.

## 절차 (Mechanics)

1. **모든 호출처 확인** — 정말 *전부* 같은 statement가 있는지.
2. statement를 함수 *시작* 또는 *끝*으로 옮긴다.
3. 호출자에서 그 statement 제거.
4. 컴파일·테스트.

호출처가 *대부분*은 같지만 *일부 다르면*, 그 일부는 *다른 함수*로 분리하거나 임시 wrapper로.

## 예시 1 — log 통합

```javascript
// Before
function renderHeader() {
  console.log("=== rendering ===");
  return "<header>...</header>";
}

// 호출자들
console.log("=== rendering ===");
const header = renderHeader();

console.log("=== rendering ===");
const otherHeader = renderHeader();
```

모든 호출이 *직전 log* + 함수 호출.

```javascript
// After
function renderHeader() {
  console.log("=== rendering ===");
  return "<header>...</header>";
}

// 호출자들 — 단순화
const header = renderHeader();
const otherHeader = renderHeader();
```

호출자가 깔끔.

## 예시 2 — Photo 정보 + emit

```javascript
// Before
function emitPhotoData(photo) {
  console.log(`<p>title: ${photo.title}</p>`);
  console.log(`<p>location: ${photo.location}</p>`);
}

// 호출자
function listRecentPhotos(photos) {
  photos.forEach(photo => {
    console.log(`<div>`);
    console.log(`<p>date: ${photo.date}</p>`);
    emitPhotoData(photo);
    console.log(`</div>`);
  });
}

function emitPhotoDetails(photo) {
  console.log(`<p>date: ${photo.date}</p>`);
  emitPhotoData(photo);
}
```

`console.log("<p>date: ...</p>")`가 *두 호출 모두* `emitPhotoData` 직전.

```javascript
// After
function emitPhotoData(photo) {
  console.log(`<p>date: ${photo.date}</p>`);
  console.log(`<p>title: ${photo.title}</p>`);
  console.log(`<p>location: ${photo.location}</p>`);
}

function listRecentPhotos(photos) {
  photos.forEach(photo => {
    console.log(`<div>`);
    emitPhotoData(photo);
    console.log(`</div>`);
  });
}

function emitPhotoDetails(photo) {
  emitPhotoData(photo);
}
```

`emitPhotoDetails`는 이제 *wrapper만* — 한 번 더 [Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function) 후보.

## 예시 3 — Setup/teardown

```javascript
// Before
function doProcess(x) { return x * 2; }

// 호출자들
const conn = openConnection();
const r1 = doProcess(1);
conn.close();

const conn2 = openConnection();
const r2 = doProcess(2);
conn2.close();
```

connection이 *항상 함께 다님*.

```javascript
// After
function doProcess(x) {
  const conn = openConnection();
  try {
    return x * 2;
  } finally {
    conn.close();
  }
}

const r1 = doProcess(1);
const r2 = doProcess(2);
```

자원 관리가 *함수 내부 책임*으로.

## 자주 보는 안티패턴

### 1. 사실 *모든 호출*에 있지 않음
"대부분 호출에 있으니까" — 한두 곳에 없다면 이동 후 *행동 변경*. 반드시 *모두 확인*.

### 2. Statement가 *호출별로 달라야*
log message가 호출 컨텍스트마다 다르다면 함수 안으로 옮기면 *유연성 잃음*. 대신 매개변수.

### 3. *책임 흐림*
함수에 너무 많은 *부수효과*를 안으로 옮기면 함수가 *too much*. 한 함수의 책임이 무너짐.

### 4. *Teardown 못 함*
setup만 함수 안에 두고 teardown은 외부에 두면 비대칭. RAII / try-finally / `using` / `with` 패턴 활용.

### 5. *Test가 깨짐*
test가 함수 호출 *전후 상태*에 의존했다면 statement 이동으로 행동 변경. test 확인.

## Modern variants

### Decorator / Aspect-Oriented
공통 전·후 처리는 *decorator*나 *AOP*로.

```javascript
// JavaScript decorator
function logged(fn) {
  return function(...args) {
    console.log("calling", fn.name);
    const r = fn.apply(this, args);
    console.log("returned");
    return r;
  };
}
const safeRender = logged(renderHeader);
```

### Context manager (Python)

```python
with open(path) as f:
    process(f)
# automatic close
```

setup/teardown이 *언어 차원*. Move Statements가 자연스러움.

### RAII (C++/Rust)
객체 생성 = setup, drop = teardown. 자원 관리가 *컴파일러 보장*.

## 도구 / IDE

수동. 호출처 검색 후 직접 이동.

## 성능 고려

호출 비용 무관. 함수 본문 길이만 변화.

## 관련 패턴

- **역연산**: [Pattern 24: Move Statements to Callers](/blog/programming/design/refactoring-catalog/pattern24-move-statements-to-callers)
- **자매**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **함수 인라인 후 재추출**: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
