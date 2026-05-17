---
title: "Pattern 7: Rename Variable"
date: 2026-06-01T07:00:00
description: "변수 이름을 의도에 맞게 — 가장 흔하고 가장 가치 있는 리팩토링."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 7
tags: [refactoring, rename-variable, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 이름이 곧 문서다. 더 나은 이름이 떠오르면 미루지 말고 바꾼다.

## 동기 (Motivation)

좋은 이름은 코드의 자기 설명력을 가장 크게 키운다. 짧은 라이프타임의 임시 변수도 의미가 모호하면 읽는 사람의 두뇌 사이클을 갉아먹는다. *더 나은 이름이 떠오르는 순간 바로 바꾸는 습관*이 결국 코드 베이스 전체의 가독성을 만든다.

언제 적용하는가:
- 변수가 *오해를 살 수 있는 이름*을 가졌다 (`data`, `result`, `temp`, `obj`)
- 코드의 의미가 바뀌어 이름이 옛 의미를 가리킨다
- 타이포·오자
- 약어가 모호하다 (`mgr`, `ctx`, `bs`)

## 절차 (Mechanics)

### 로컬 변수 (한 함수 안에만)
1. IDE의 rename 기능으로 한 번에 바꾼다.
2. 테스트한다.

### 외부에 노출되는 변수 (모듈 전역, 공개 필드)
1. 먼저 [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)로 함수 뒤에 숨긴다.
2. 함수만 [Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)으로 rename.
3. 내부 변수를 rename.
4. 모든 단계마다 테스트.

## 예시 (Before → After)

```javascript
// Before
let tpHd = "untitled";

// 사용처가 여러 모듈에 흩어져 있음 — 직접 rename은 위험
result += `<h1>${tpHd}</h1>`;
tpHd = obj['articleTitle'];
```

```javascript
// 1) Encapsulate Variable
function title()        { return tpHd; }
function setTitle(arg)  { tpHd = arg; }

// 2) 사용처 교체
result += `<h1>${title()}</h1>`;
setTitle(obj['articleTitle']);

// 3) 함수 이름 그대로, 내부 변수만 rename
let _title = "untitled";
function title()        { return _title; }
function setTitle(arg)  { _title = arg; }
```

## 휴리스틱

- *동사*가 들어가야 더 명확한지: `valid` → `isValid`, `count` → `getActiveCount`
- *단위*가 모호하면 추가: `timeout` → `timeoutMs`, `size` → `sizeBytes`
- *복수형*으로 collection 의도 드러내기: `customer` → `customers`
- *부정형*은 피하기: `!notReady` 같은 이중 부정 회피

## 주의

- 공개 API rename은 deprecated alias로 단계적 마이그레이션.
- 한 번에 너무 많은 rename은 코드 리뷰를 어렵게 한다 — *작게, 자주*.

## 관련 패턴

- 함수 이름 변경: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)
- 필드 이름 변경: [Pattern 31: Rename Field](/blog/programming/design/refactoring-catalog/pattern31-rename-field)
- 캡슐화: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
