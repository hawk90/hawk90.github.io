---
title: "Pattern 48: Inline Method (in TDD)"
date: 2026-05-10T00:00:00
description: "잘못된 extract 복구·1줄 helper 제거. Extract Method의 역연산."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 48
tags: [tdd, beck, inline-method, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 너무 작거나 *이름이 도움 안 되는* method를 *호출자에 인라인*. Extract Method의 역연산.

## 동기 (Motivation)

[Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method)의 역.

```python
def get_sum(self, items):
    return sum(item.price for item in items)
```

`get_sum`이 `sum()`보다 *나은가*? 아니면 *인라인*.

### 신호

- 한 줄짜리 wrapper.
- 이름이 *코드보다 정보 적음*.
- 과도한 분해 → method 폭증.
- *Premature extraction* 결과.

### 언제 적용하는가

- *trivial wrapper* — 한 줄.
- *이름 안 도움* 됨.
- *과도한 추출* 복구.
- 단일 호출처.

### 언제 적용하지 않는가

- *의미 있는 추상화*.
- *재사용*되는 로직.
- *test 대상*.
- *다형성* 필요.

## 절차 (Mechanics)

1. **인라인 대상** 확인.
2. **호출처 식별**.
3. **method 본문을 호출처로** 복사.
4. **method 제거**.
5. *테스트 green* 확인.

## 예시 1 — 단순 inline

```python
# Before
def process(self, data):
    validated = self._is_valid(data)
    if validated:
        return self._do_process(data)
    return None

def _is_valid(self, data):
    return data is not None

def _do_process(self, data):
    return data.value * 2

# After
def process(self, data):
    if data is not None:
        return data.value * 2
    return None
```

helper *제거 + 호출자 단순화*.

## 예시 2 — Wrapper 제거

```python
# Before
def get_name(self):
    return self._fetch_name()

def _fetch_name(self):
    return self.name

# After
def get_name(self):
    return self.name
```

## 예시 3 — 과도한 분해 복구

```python
# Before — 5개 micro method
def process_order(self, order):
    self._step1(order); self._step2(order); self._step3(order)
    self._step4(order); self._step5(order)

# After — 의미 있는 그룹
def process_order(self, order):
    order.validate()
    self._calculate_total(order)
    self._persist_and_notify(order)

def _calculate_total(self, order):
    order.calculate()
    order.apply_discount()

def _persist_and_notify(self, order):
    order.save()
    order.notify()
```

micro method 5개 → *의미 있는 2개 + inline*.

## 자주 보는 안티패턴

### 1. *중복 발생*
여러 호출처를 모두 inline → 중복. 그땐 *그대로 유지*.

### 2. *의미 있는 추상화 inline*
`calculate_tax` 같은 *도메인 method* inline → 의미 손실.

### 3. *test 대상 inline*
private method가 *test 단위*인데 inline → test 불가.

### 4. *Polymorphism 무력화*
override되는 method inline → 다형성 깨짐.

### 5. *Long inline*
50줄 method를 inline → 호출자가 *200줄* → 다시 분해 부담.

### 6. *Inline 후 commit message 부정확*
"feat: ..."로 inline 변경 commit → 의도 모호. "refactor: inline method X".

## Modern variants

### IDE 자동

| IDE | 단축키 |
| --- | --- |
| IntelliJ / PyCharm | Cmd+Alt+N (Mac) |
| Rider | Ctrl+R, I |
| VS Code | 수동 또는 extension |

자동 inline + 안전.

### Inline temp

local 변수를 *없애고 호출 직접*.

```python
# Before
total = self._calculate()
return total

# After
return self._calculate()
```

### Inline class

class 전체를 *호출자 class에 흡수* — 책임 통합.

```python
# Before
class Helper:
    def help(self, x): return x * 2

class Main:
    def __init__(self): self.helper = Helper()
    def method(self, x): return self.helper.help(x)

# After
class Main:
    def method(self, x): return x * 2
```

## Extract vs Inline 균형

```text
Extract ←──── Refactor cycle ────→ Inline
너무 많이             너무 적게
method 폭증           긴 method
```

| 질문 | Extract | Inline |
| --- | --- | --- |
| 이름이 코드보다 명확? | ✓ | |
| 여러 곳 재사용? | ✓ | |
| 독립 test? | ✓ | |
| 한 줄? | | ✓ |
| 이름이 구현과 같은 수준? | | ✓ |

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ Inline | 자동 inline |
| Resharper | 같음 |
| Refactor menu | 거의 모든 IDE |

## 성능 고려

method 호출 한 단계 제거 → 거의 무관 (JIT inline). *over-decomposed code*에서 약간 cache locality 개선 가능.

## 관련 패턴

- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 인라인의 역
- [Pattern 45: Isolate Change](/blog/programming/engineering/tdd-patterns/pattern45-isolate-change) — 변경 격리
- [Pattern 44: Reconcile Differences](/blog/programming/engineering/tdd-patterns/pattern44-reconcile-differences) — 코드 통합
- Refactoring [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
