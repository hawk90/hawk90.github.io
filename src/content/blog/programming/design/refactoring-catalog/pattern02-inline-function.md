---
title: "Pattern 2: Inline Function"
date: 2026-05-02T02:00:00
description: "함수 본문이 이름만큼 명확하면 인라인 — Extract Function의 역연산."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 2
tags: [refactoring, inline-function, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수의 본문이 *이름만큼 명확*하다면, 그 함수는 사라져야 한다.

## 동기 (Motivation)

리팩터링은 한 방향이 아니다. *Extract → Inline → 다시 Extract* 사이클을 반복하며 코드의 결을 찾는다. Inline Function은 그 사이클의 *되돌리기* 도구이자, 다음 리팩터링을 위한 *준비 단계*다.

세 가지 동기.

### 1. 추출이 가치를 못 만든 경우
어떤 추출은 결과적으로 *함수가 추가 정보를 못 준다*. `getRating()`이 그저 `score`를 반환만 한다면 함수 한 단계가 *해석 비용만* 보탠다. 인라인이 답.

### 2. 여러 작은 함수가 응집을 깨는 경우
긴 호출 chain (a→b→c→d→e)을 따라가야 한 동작을 파악할 수 있다면, 그 chain은 *너무 잘게 잘려* 있다. 한 번 다 인라인한 뒤 *큰 그림으로* 다시 추출하면 결을 다시 잡는다.

### 3. 다음 리팩터링을 위한 평탄화
[Replace Function with Command](/blog/programming/design/refactoring-catalog/pattern49-replace-function-with-command)나 [Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class) 같은 큰 변환을 하기 전에, *여러 helper 함수를 한 곳에 모으는 평탄화*가 유리할 때가 있다. 인라인으로 평탄화 후 새 구조로 재추출.

### 언제 적용하는가

- 함수 본문이 이름만큼 의미가 명확하다 — `function moreThanFiveLateDeliveries(d) { return d.late > 5; }`
- 잘못 추출된 helper가 오히려 가독성을 해친다.
- 너무 많은 위임(delegation)으로 호출 chain이 길다.
- 한 함수가 *함수 자체로 존재할 정당성*보다 *호출자 안에서의 표현*이 더 직접적이다.

## 절차 (Mechanics)

1. **다형성 함수 (override)** 인지 확인. override가 있으면 인라인 *불가* — 메서드 디스패치를 잃는다.
2. **모든 호출처를 찾는다**. IDE 활용 + 동적 호출(reflection, eval) grep.
3. **각 호출처에서 함수 호출을 본문으로** 바꾼다.
   - 매개변수 → 인자 표현식
   - return 한 줄이면 그 표현식으로 치환
   - 여러 줄이면 호출자가 *문장 컨텍스트*인지 *표현식 컨텍스트*인지 따져 처리.
4. **각 단계마다** 컴파일·테스트. 한 번에 다 인라인하지 말 것.
5. **함수 정의 제거**.

호출처가 많으면 *한 곳씩* 인라인하면서 테스트. 모든 호출처가 같은 형태가 아니라면 일부는 인라인하지 않을 수도 있다.

## 예시 1 — 단순 wrapper

```javascript
// Before
function getRating(driver) {
  return moreThanFiveLateDeliveries(driver) ? 2 : 1;
}
function moreThanFiveLateDeliveries(driver) {
  return driver.numberOfLateDeliveries > 5;
}
```

`moreThanFiveLateDeliveries`의 이름과 본문이 *같은 의미*를 가진다. 함수 한 단계가 정보를 더하지 않는다.

```javascript
// After
function getRating(driver) {
  return driver.numberOfLateDeliveries > 5 ? 2 : 1;
}
```

한 줄로 의도가 더 직접적이다.

## 예시 2 — 긴 위임 chain 평탄화

```javascript
// Before — 4단계 위임
function reportLines(customer) {
  return formatLines(buildLines(loadCustomerData(customer.id)));
}
function loadCustomerData(id)     { return repo.find(id); }
function buildLines(data)         { return [["name", data.name]]; }
function formatLines(lines)       { return lines.map(([k, v]) => `${k}: ${v}`); }
```

각 helper가 한 줄짜리. 추적할 때 4번 점프해야 한 줄을 본다.

```javascript
// After — 한 곳에서 평탄, 결을 다시 본 뒤 재추출 가능성
function reportLines(customer) {
  const data = repo.find(customer.id);
  const lines = [["name", data.name]];
  return lines.map(([k, v]) => `${k}: ${v}`);
}
```

평탄화 후 *진짜 의미 있는 단위*가 보이면 다시 추출 — 예컨대 `formatLines`만 별도로 둘 수 있다 (여러 곳에서 재사용된다면).

## 예시 3 — 다음 리팩터링을 위한 준비

```javascript
// Before — A class에 helper 4개가 흩어져 있음
class Order {
  total()      { return this._sumItems() - this._discount() + this._tax(); }
  _sumItems()  { /* ... */ }
  _discount()  { /* ... */ }
  _tax()       { /* ... */ }
}
```

전부 인라인해 *총합 함수 한 곳*에 펼쳐 두면, 그 다음에 [Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)로 `OrderCalculator` 같은 *집중된* 객체로 새로 추출할 결을 본다.

```javascript
// After (평탄화) — 다음 리팩터링을 위한 임시 상태
class Order {
  total() {
    const sum = this.items.reduce((a, x) => a + x.price, 0);
    const discount = sum > 1000 ? sum * 0.05 : 0;
    const tax = (sum - discount) * 0.1;
    return sum - discount + tax;
  }
}
```

여기서 새 구조 발견 → [Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class)로 `OrderCalculator`.

## 자주 보는 안티패턴

### 1. 재귀 함수 인라인 시도
재귀는 인라인 불가. 컴파일러 tail-call 최적화로 우회 가능하지만 *소스 차원의 인라인*은 안 된다.

### 2. 다형성 메서드 인라인
override되는 메서드를 인라인하면 *서브클래스의 동작*을 잃는다. 절대 금지. 먼저 [Push Down Method](/blog/programming/design/refactoring-catalog/pattern54-push-down-method)로 상속 해소.

### 3. 한 번에 N단계 인라인
3단계 chain (a→b→c→d)을 한 번에 c·d까지 다 인라인하면 *어디서 회귀가 들어왔는지* 추적 불가. 한 단계씩.

### 4. 호출 횟수가 많은 곳에서의 부주의 인라인
같은 함수가 10곳에서 호출된다면 모두 *같은 형태*로 인라인되는지 확인. 일부는 인라인이 어색할 수 있다 — 그땐 일부만 처리.

### 5. 부수효과 함수의 미세 결정
`incrementCounter()` 같은 부수효과 함수를 인라인하면 *호출자 위치에 직접 mutation*이 노출된다. 의도를 흐릴 수 있다.

### 6. *임시 변수* 인라인과 헷갈리지 말기
함수 인라인은 [Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable)과 별개. 변수 인라인은 표현식 치환, 함수 인라인은 본문 치환.

## Modern variants

### TypeScript / JavaScript IDE
VS Code/WebStorm의 *Inline function* code action이 호출처를 모두 안전하게 치환한다. 단 동적 호출 (`Function.prototype.call`, dispatch by string)은 못 잡는다.

### Rust Analyzer
`Inline function` code action이 `let inlined = my_fn(x);`를 본문으로 치환. 라이프타임이 얽힌 경우 신중하게.

### Functional language (Haskell, OCaml)
순수 함수 인라인은 *referentially transparent* — 컴파일러가 자동으로 한다. 소스 레벨 인라인은 가독성을 위해서만.

## 도구 / IDE

| 도구 | 단축키 |
| --- | --- |
| IntelliJ / WebStorm | Cmd-Option-N (Inline) |
| VS Code | Cmd-. → "Inline" |
| Rider | Ctrl-R, I |
| Rust Analyzer | code action "Inline function" |
| Eclipse | Alt-Shift-I |

## 성능 고려

소스 차원의 인라인은 보통 성능에 *무관*. 컴파일러/JIT이 이미 hot 함수를 인라인한다. 인라인은 *가독성* 결정.

## 관련 패턴

- **역연산**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **변수 인라인**: [Pattern 4: Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable)
- **위임 제거**: [Pattern 19: Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)
- **상속 인라인**: [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
- **상속 해소 후 인라인**: [Pattern 54: Push Down Method](/blog/programming/design/refactoring-catalog/pattern54-push-down-method)
