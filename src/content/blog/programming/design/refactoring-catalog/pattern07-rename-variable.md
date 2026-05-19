---
title: "Pattern 7: Rename Variable"
date: 2026-05-02T07:00:00
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

이름의 가치는 *컨텍스트*에 따라 다르다.

- **2-3줄짜리 람다 안의 임시 변수**: `x`, `e` 같은 짧은 이름도 OK. 의미가 *그 함수 안에서만* 짧게 산다.
- **메서드 단위 지역 변수**: `result`, `total` 같은 일반적 이름은 의미를 못 더한다. 도메인 단어로.
- **클래스 필드**: 외부 접근자가 의존하므로 이름이 *공개 API*에 가깝다. 신중하게.
- **모듈 전역**: *문서다*. 약어와 모호함은 금지.

라이프타임이 길수록·범위가 넓을수록 *이름의 비중*이 크다. 짧은 이름은 *짧은 영역*에서만.

### 좋은 이름의 휴리스틱

- **동사 + 명사** — `getActiveUsers`, `validateEmail`
- **단수/복수** — collection은 복수형. `customers` (list), `customer` (one).
- **단위 명시** — `timeout` → `timeoutMs`, `size` → `sizeBytes`, `duration` → `durationSec`
- **부정 회피** — `isNotReady`보다 `isReady`. 이중 부정 `!notReady` 금지.
- **불필요한 접두사 회피** — `m_name`, `s_count` (헝가리안 표기법) 보통 불필요. 현대 IDE는 색상으로 구분.
- **약어는 통용되는 것만** — `ctx`, `req`, `res`는 OK. `mgr`, `bs`, `tpHd`는 모호.

### 언제 적용하는가

- 변수가 *오해를 살 수 있는 이름*을 가졌다 (`data`, `result`, `temp`, `obj`).
- 코드의 의미가 바뀌어 이름이 옛 의미를 가리킨다.
- 타이포·오자.
- 약어가 모호하다.
- *컨텍스트가 확장*되어 짧은 이름이 더 이상 충분하지 않다.

## 절차 (Mechanics)

### 로컬 변수 (한 함수 안에만)
1. IDE의 rename 기능으로 한 번에 바꾼다.
2. 테스트.

### 외부에 노출되는 변수 (모듈 전역, 공개 필드)
1. 먼저 [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)로 함수 뒤에 숨긴다.
2. 함수만 [Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)로 rename.
3. 내부 변수를 rename.
4. *각 단계마다* 테스트.

이렇게 *간접 단계*를 거치면 외부 호출자는 함수 이름만 보고 마이그레이션할 수 있고, 내부 변수 이름 변경은 *모듈 밖에 영향 없음*.

## 예시 1 — 로컬 변수 (가장 단순)

```javascript
// Before
let a = height * width;
return a > 1000 ? "large" : "small";
```

```javascript
// After
let area = height * width;
return area > 1000 ? "large" : "small";
```

IDE rename으로 한 번에. 1초.

## 예시 2 — 외부 노출 변수 (간접 단계)

```javascript
// Before
let tpHd = "untitled";   // 모듈 전역, 여러 곳에서 직접 접근

result += `<h1>${tpHd}</h1>`;
tpHd = obj['articleTitle'];
```

직접 rename은 위험. 단계적 마이그레이션.

### 단계 1 — Encapsulate

```javascript
let tpHd = "untitled";
function title()       { return tpHd; }
function setTitle(arg) { tpHd = arg; }

// 사용처 교체 (한 곳씩)
result += `<h1>${title()}</h1>`;
setTitle(obj['articleTitle']);
```

### 단계 2 — 모든 외부 호출자 통과

```bash
$ grep -rn 'tpHd' src/   # 모듈 외부에 직접 접근 남았는지 확인
```

### 단계 3 — 내부 변수 rename

```javascript
let _title = "untitled";   // tpHd → _title
function title()       { return _title; }
function setTitle(arg) { _title = arg; }
```

함수 이름은 그대로지만 *내부가 깔끔*. 외부 호출자는 영향 없음.

## 예시 3 — 단위 명시

```javascript
// Before — timeout이 ms인지 s인지?
function connect(host, timeout) { /* ... */ }
connect("api.example.com", 30);   // 30ms? 30s?
```

```javascript
// After
function connect(host, timeoutMs) { /* ... */ }
connect("api.example.com", 30000);   // 의도 명확
```

또는 *값 객체*로 승격 ([Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)):

```javascript
function connect(host, timeout) { /* ... */ }
connect("api.example.com", Duration.seconds(30));
```

## 자주 보는 안티패턴

### 1. 한 PR에 너무 많은 rename
1000줄 rename PR은 *코드 리뷰가 불가능*. 변수 1-2개씩 작은 PR로.

### 2. *유의어*로 바꾸기만
`get` → `fetch`, `compute` → `calculate` — 의미가 같다면 *바꾸지 말 것*. rename은 *의도가 정말 달라질 때*만.

### 3. 잘못된 통일
`customer` 한 곳, `client` 다른 곳, `user` 또 다른 곳. 도메인 용어로 *하나* 정착 후 통일.

### 4. 헝가리안 표기법
`strName`, `iCount`, `boIsReady` — 현대 IDE는 type을 색깔로 보여준다. 접두사는 *노이즈*.

### 5. 너무 긴 이름
`numberOfCustomersWhoAreActiveAndNotDeleted` — 60자 변수는 가독성을 해친다. 컨텍스트로 줄여 `activeCustomers` 정도.

### 6. *한 번 더 바꾸기* 미루기
첫 rename에 *완벽한 이름*을 찾지 못해도 OK. 후에 더 좋은 이름이 떠오르면 *또 바꾼다*. 이름은 *진화*한다.

### 7. 외부 노출 변수를 직접 rename
공개 필드를 직접 rename하면 모든 호출자가 깨진다. 반드시 *encapsulate → rename* 단계.

## Modern variants

### TypeScript / IDE 도구
F2 (rename symbol)로 *모든 사용처* 안전 변경. 동적 호출(`obj[varName]`)은 못 잡으니 grep 보조.

### Code review 자동화
PR에 *rename only* 라벨을 붙이면 리뷰어가 *동작 변경 없음*을 빠르게 확인.

### Linter / 규칙
ESLint, Pylint 등으로 *명명 규칙* 강제. `camelCase`, `PascalCase`, 길이, 약어 금지 등.

```json
// .eslintrc
"rules": {
  "id-length": ["error", { "min": 2, "exceptions": ["i", "j", "x", "y"] }],
  "camelcase": "error"
}
```

## 도구 / IDE

| 도구 | 단축키 |
| --- | --- |
| IntelliJ | Shift-F6 (Rename) |
| VS Code | F2 |
| Rider | F2 / Ctrl-R, R |
| Rust Analyzer | F2 |
| Eclipse | Alt-Shift-R |

## 성능 고려

이름은 *컴파일 시점*에 사라진다. 런타임 비용 0.

## 관련 패턴

- **함수 이름 변경**: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)
- **필드 이름 변경**: [Pattern 31: Rename Field](/blog/programming/design/refactoring-catalog/pattern31-rename-field)
- **캡슐화**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
- **값 객체 승격**: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
