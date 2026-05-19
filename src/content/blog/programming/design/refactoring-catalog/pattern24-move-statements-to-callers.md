---
title: "Pattern 24: Move Statements to Callers"
date: 2026-05-02T00:00:00
description: "함수 일부가 호출자별로 달라야 한다면 statement를 밖으로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 24
tags: [refactoring, move-statements, callers, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수의 한 statement가 *모든 호출자에 적합하지 않다*면, 그 statement는 호출자로 이동해야 한다.

## 동기 (Motivation)

함수는 *공통 책임을 추출*한 결과지만, 시간이 지나며 *호출자별로 다른 처리*가 필요해질 수 있다. 함수가 모든 호출자에 *같은 동작*을 강요하면 *변경 비용*이 커진다. 일부 동작을 *호출자에게 돌려주면* 호출자별 차별화가 가능해진다.

[Move Statements into Function](/blog/programming/design/refactoring-catalog/pattern23-move-statements-into-function)의 역연산. 책임이 잘못 흡수되면 *다시 분리*.

### 신호

- 한 호출자만 *그 동작이 필요 없다*.
- 호출자별로 *그 statement를 다르게 하고 싶다*.
- 함수가 *과도하게 많은 일*을 한다.
- *새 호출자*를 추가하려는데 그 동작이 어색.

### 언제 적용하는가

- 함수 본문 일부가 *호출자별로 달라야* 한다.
- 한 호출자가 *그 동작 없이* 사용하고 싶다.
- *책임 분리*가 필요한 시점.
- 함수가 너무 많은 일을 하기 시작.

## 절차 (Mechanics)

1. **statement를 *모든 호출 사이트*로 복사** — 한 호출자씩 옮긴다.
2. 모든 호출자가 옮겨졌으면 함수에서 그 statement 제거.
3. 컴파일·테스트 — *각 단계마다*.
4. 호출자별로 *다른 동작*이 필요하면 그 자리에서 변형.

호출자가 *많을 때*는 [Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration) 마이그레이션 방식 — 임시 이름으로 새 함수, 기존 함수 deprecated, 점진 이동.

## 예시 1 — 책임 분리

```javascript
// Before — emitPhotoData가 setup·content·teardown 모두
function emitPhotoData(photo) {
  console.log(`<div>`);
  console.log(`<p>title: ${photo.title}</p>`);
  console.log(`<p>location: ${photo.location}</p>`);
  console.log(`</div>`);
}

// 호출자들
emitPhotoData(photoA);
emitPhotoData(photoB);
```

새 호출자가 *div 없이* photo data만 원하면? 또는 *다른 wrapping element*가 필요하면?

```javascript
// After — wrapping은 호출자 책임
function emitPhotoData(photo) {
  console.log(`<p>title: ${photo.title}</p>`);
  console.log(`<p>location: ${photo.location}</p>`);
}

// 기존 호출자
console.log(`<div>`);
emitPhotoData(photoA);
console.log(`</div>`);

// 새 호출자 — 다른 wrapping 가능
console.log(`<article>`);
emitPhotoData(photoB);
console.log(`</article>`);
```

함수는 *coredata만*. wrapping은 *각 호출자가 결정*.

## 예시 2 — 점진적 마이그레이션

```javascript
// Before — 100 호출처
function renderPerson(person) {
  outStream.write(`<p>${person.name}</p>\n`);
  renderPhoto(person.photo);
  emitPhotoData(person.photo);
}

function listRecentPhotos(photos) {
  photos.forEach(p => {
    outStream.write(`<div>\n`);
    emitPhotoData(p);
    outStream.write(`</div>\n`);
  });
}
```

`emitPhotoData`에 *location 출력*이 항상 안 어울리는 호출자가 생겼다고 가정. 점진 이동:

```javascript
// 단계 1 — 임시 함수 zztmp_
function zztmp_emitPhotoData(photo) {
  console.log(`<p>location: ${photo.location}</p>`);
}

function emitPhotoData(photo) {
  console.log(`<p>title: ${photo.title}</p>`);
  zztmp_emitPhotoData(photo);
}

// 호출자 한 곳씩 마이그레이션
function renderPerson(person) {
  outStream.write(`<p>${person.name}</p>\n`);
  renderPhoto(person.photo);
  emitPhotoData(person.photo);
  zztmp_emitPhotoData(person.photo);   // 직접 호출
}
```

```javascript
// 단계 2 — 마이그레이션 완료 후 본 함수에서 제거
function emitPhotoData(photo) {
  console.log(`<p>title: ${photo.title}</p>`);
  // location 부분 제거됨
}

function renderPerson(person) {
  outStream.write(`<p>${person.name}</p>\n`);
  renderPhoto(person.photo);
  emitPhotoData(person.photo);
  console.log(`<p>location: ${person.photo.location}</p>`);   // 인라인
}
```

다른 호출자도 같은 식으로. 마지막에 `zztmp_emitPhotoData` 제거.

## 예시 3 — 조건 분기 흡수

```javascript
// Before — 함수가 옵션 분기
function processOrder(order, options) {
  validate(order);
  calculate(order);
  if (options.sendEmail) sendConfirmation(order);
  if (options.audit) auditLog(order);
}

// 호출자
processOrder(order1, { sendEmail: true, audit: false });
processOrder(order2, { sendEmail: false, audit: true });
```

함수가 *모든 옵션*을 알아야. 옵션이 늘면 폭발.

```javascript
// After — 부수효과는 호출자가
function processOrder(order) {
  validate(order);
  calculate(order);
}

// 호출자
processOrder(order1);
sendConfirmation(order1);

processOrder(order2);
auditLog(order2);
```

`processOrder`의 *책임이 명확*. 부수효과 선택은 *호출자 결정*.

## 자주 보는 안티패턴

### 1. 모든 호출자에 *기계적 복사*
일부 호출자는 그 동작이 *진짜 필요*해서 그대로 둬야 할 수도. *호출자별 선택*.

### 2. 중복 폭발
statement가 *복잡한데* N개 호출자에 다 복사하면 *코드 중복*. 그땐 *작은 helper 함수*로 추출 + 일부만 호출.

### 3. 호출자가 *모르는 책임* 떠맡음
function이 안전하게 처리하던 부수효과(로깅, 검증)를 호출자에 넘기면 *잊을 위험*. 책임 명확화 + 문서.

### 4. *순서 의존* 깨짐
함수가 *순서를 보장*하던 statement를 호출자가 흩어 놓으면 race나 *논리 오류*.

### 5. *Test 깨짐*
함수의 *원래 책임*을 가정한 test가 깨진다. test 코드도 정리.

## Modern variants

### Strategy 패턴 — 옵션 → 객체

```javascript
// 옵션 boolean이 많으면 strategy로
function processOrder(order, postProcessor) {
  validate(order);
  calculate(order);
  postProcessor.run(order);
}

const emailPP = { run: (o) => sendConfirmation(o) };
const auditPP = { run: (o) => auditLog(o) };

processOrder(order, emailPP);
```

### Event-driven

```javascript
function processOrder(order) {
  validate(order);
  calculate(order);
  events.emit("orderProcessed", order);
}

events.on("orderProcessed", o => sendConfirmation(o));
events.on("orderProcessed", o => auditLog(o));
```

부수효과를 *호출자가 결정*하되 *느슨한 결합*.

### Decorator

```javascript
const processOrderWithEmail = withEmail(processOrder);
processOrderWithEmail(order);
```

함수 합성으로 *옵션화*.

## 도구 / IDE

수동. 호출처 검색 + 복사.

## 성능 고려

코드 중복은 일부 성능 영향 가능 (캐시 압박). 보통 무시.

## 관련 패턴

- **역연산**: [Pattern 23: Move Statements into Function](/blog/programming/design/refactoring-catalog/pattern23-move-statements-into-function)
- **함수 인라인**: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
- **시그니처 변경**: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)
- **flag 제거**: [Pattern 43: Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument)
