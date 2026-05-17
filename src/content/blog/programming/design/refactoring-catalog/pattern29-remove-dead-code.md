---
title: "Pattern 29: Remove Dead Code"
date: 2026-06-02T05:00:00
description: "사용되지 않는 코드는 망설이지 말고 제거 — Git이 기억한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 29
tags: [refactoring, dead-code, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Dead code는 *읽는 사람의 두뇌 사이클*만 잡아먹는다. 망설이지 말고 제거 — version control이 기억한다.

## 동기 (Motivation)

코드 베이스에 *호출되지 않는 함수, 도달할 수 없는 분기, 사용 안 되는 변수, 옛 기능의 잔해*가 누적되는 것은 자연스러운 일이다. 그러나 그것들이 살아 있는 한 다음 비용이 든다.

1. **읽는 비용** — "이 코드는 뭐 하는 거지?" 의문을 매번 점검.
2. **유지보수 비용** — refactoring 도구가 dead code도 갱신, 컴파일러 경고, 의존성 업데이트.
3. **테스트 부담** — 자동 테스트가 dead code도 커버하려 시도.
4. **혼란** — 새 개발자가 dead code를 *살아있다*고 가정해 잘못된 결정.
5. **숨겨진 버그** — dead 처럼 보였지만 *간접 호출*로 가끔 실행되어 *조용히 깨짐*.

### "혹시 필요할까?" 신화

가장 큰 심리적 저항. 그러나:

- **Git이 기억한다** — 삭제해도 history에 남는다. 정말 필요하면 *revert*.
- **5년 후에도 필요 없다** — 통계상 dead code의 99%는 *영원히 부활 안 됨*.
- **부활 시 더 좋게 작성** — 옛 코드를 그대로 되살리는 경우는 거의 없다. 그때의 컨텍스트로 *새로* 작성.

### 신호

- IDE가 *gray out* 또는 *unused* 경고.
- 함수가 *호출되지 않음* (정적 분석).
- `if (false)` 또는 `if (DEBUG_OLD_CODE)` 같은 비활성 분기.
- 주석 처리된 코드 블록.
- 옛 기능의 유틸 함수.
- *과거 시점*의 conditional (예: `if (year < 2020)`).

### 언제 적용하는가

- 코드 정리 작업 중.
- coverage 도구가 *0% 커버*인 함수 발견.
- *옛 기능 제거* 마무리.
- 코드 리뷰에서 dead code 발견.

## 절차 (Mechanics)

1. **dead 여부 확신** — 동적 호출, reflection, 외부 lib 사용 안 함 확인.
2. *간단한 dead*는 바로 삭제.
3. *복잡한 dead* (참조가 얽힘)는 한 호출씩 점진 제거.
4. 컴파일·테스트.
5. *다른 dead*가 노출되면 같은 식으로.

## 예시 1 — 호출되지 않는 함수

```javascript
// Before
function processOrder(order) { /* used */ }

function legacyProcess(order) {
  // 2년 전 옛 로직, 호출 없음
  /* ... */
}

function processOrderV2(order) { /* used */ }
```

```javascript
// After
function processOrder(order) { /* used */ }
function processOrderV2(order) { /* used */ }
// legacyProcess 삭제
```

## 예시 2 — 도달 불가 분기

```javascript
// Before
function calculate(x) {
  if (x > 0) return x * 2;
  return x * 3;
  return x * 4;   // 도달 불가
}

if (false) {
  // 옛 디버그 코드
  console.log("debug");
}
```

```javascript
// After
function calculate(x) {
  if (x > 0) return x * 2;
  return x * 3;
}
// `if (false)` 블록 삭제
```

linter (ESLint `no-unreachable`)가 자동 검출.

## 예시 3 — 옛 기능 잔해

```javascript
// Before
class Order {
  process() { /* 현재 로직 */ }

  // 2020년 이전 fallback
  processLegacy() { /* ... */ }
  isLegacyMode() { return false; }   // 항상 false 반환
  legacyConfig = { enabled: false };
}
```

전체 *legacy* 영역이 dead.

```javascript
// After
class Order {
  process() { /* 현재 로직 */ }
}
```

대대적 삭제. *조심*: legacy를 호출하는 다른 모듈도 확인.

## 자주 보는 안티패턴

### 1. 주석 처리만 하기
`// 옛 코드 — 혹시 필요할까봐` — *주석 코드*는 더 나쁘다. 실행 안 되고, 의도 불명, 코드 베이스만 키운다. *지운다*.

### 2. *동적 호출* 무시
JavaScript의 `obj[method]`, Python의 `getattr`, Java reflection — 정적 분석이 못 잡는 호출. dead로 보이지만 *실제 호출됨*. 신중히.

### 3. *Public API* 함부로 삭제
라이브러리 공개 함수는 *외부 사용자*가 있다. semantic versioning + deprecated → 다음 메이저 버전에서 제거.

### 4. 한 번에 *너무 많이*
500줄 삭제 PR은 리뷰가 *불가능*. *작은 묶음씩*.

### 5. *테스트 코드 잊음*
함수 삭제 시 그 함수의 *테스트*도 같이.

### 6. *Feature flag로 비활성화된 코드* 영구 보존
flag를 *오프로 한 채 1년*이 지나면 dead. 결정을 내리고 제거.

## Modern variants

### Static analysis 도구

```bash
# JavaScript
eslint --rule 'no-unused-vars: error'
ts-prune                   # unused exports
unimported                 # unused files

# Java
mvn pmd:check              # PMD
mvn dependency:analyze     # unused dependencies

# Rust
cargo +nightly udeps       # unused dependencies
```

### Code coverage
production traffic의 *coverage data*로 dead 함수 자동 식별 (Datadog Code Coverage, NYC, JaCoCo).

### Feature flag 정리
LaunchDarkly 등 feature flag platform이 *오래된 flag 알림*. 정기 cleanup.

### Tree shaking
빌드 도구 (webpack, Rollup, Vite)가 *unused exports* 자동 제거 — production bundle에서. 그러나 *source*에서도 정리.

### Sourcegraph / GitHub Code Search
대규모 코드 베이스에서 함수 *모든 사용처* 검색. dead 확신.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Safe Delete" — 호출처 모두 확인 후 삭제 |
| ESLint | `no-unused-vars`, `no-unreachable` |
| ts-prune | TypeScript unused exports |
| Rust Clippy | `dead_code` warning |
| Java IDE | "Find Unused" |

자동 도구가 *후보 식별*, 사람이 *최종 판단*.

## 성능 고려

dead code는 *컴파일러가 제거* (dead code elimination). 런타임 성능 영향 0. 단 *bundle size*에는 영향 — 클라이언트 JS는 *KB가 중요*.

## 관련 패턴

- **자매**: [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class) (옛 추상 제거)
- **호출자 정리**: [Pattern 24: Move Statements to Callers](/blog/programming/design/refactoring-catalog/pattern24-move-statements-to-callers)
- **변경 후 정리**: [Pattern 47: Remove Setting Method](/blog/programming/design/refactoring-catalog/pattern47-remove-setting-method)
