---
title: "Pattern 47: Extract Method (in TDD)"
date: 2026-05-10T23:00:00
description: "TDD 흐름에서의 Extract Method — Refactor 단계의 핵심 도구."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 47
tags: [tdd, beck, extract-method, refactor]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 코드 블록에 이름을 붙여 별도 method로. Refactor 단계 핵심 도구. 가독성·중복 제거·test 용이성.

## 동기

Green 상태에서 코드 정리:

```python
# Before
def process_order(self, order):
    # 검증
    if order.total <= 0: raise ValueError(...)
    if not order.items: raise ValueError(...)

    # 계산
    subtotal = sum(item.price for item in order.items)
    discount = subtotal * 0.1 if order.is_member else 0
    total = subtotal - discount

    # 저장
    self.db.save(order)
    self.db.save_total(order.id, total)

    return total

# After — 의도가 이름으로
def process_order(self, order):
    self._validate(order)
    total = self._calculate_total(order)
    self._save(order, total)
    return total
```

각 블록이 명명된 method — 의도 자명하다.

### 신호

- 큰 method (30+ 줄).
- 주석으로 블록 구분 (검증, 계산, 저장).
- 중복 코드.
- test 단위가 너무 큼.

### TDD 흐름 위치

```text
Red → Green → Refactor
              ^^^^^^^^
              여기서 Extract Method
```

테스트 green 상태에서 안전하게.

### 언제 적용하는가

- 코드 블록에 이름 부여 가치.
- 중복 제거.
- test 단위 작게.
- Refactoring [Pattern 1](/blog/programming/design/refactoring-catalog/pattern01-extract-function) 참고.

### 언제 적용하지 않는가

- 한 줄 추출 — 보통 과잉.
- 이름이 더 모호해짐.
- 추출 자체가 결합 증가.

## 절차

1. **추출 영역** 식별.
2. 지역 변수 + 의존 분석.
3. **새 method** 작성 — parameter + return.
4. **원본을 호출로** 대체.
5. 테스트 green 확인.
6. 이름 review.

## 예시 1 — 위 process_order 참고.

## 예시 2 — 중복 제거

```python
# Before
def method_a(self):
    x = self.data.value * 2 + self.data.offset

def method_b(self):
    x = self.data.value * 2 + self.data.offset

# After
def _computed_value(self):
    return self.data.value * 2 + self.data.offset

def method_a(self):
    x = self._computed_value()

def method_b(self):
    x = self._computed_value()
```

DRY + 의도 표현.

## 예시 3 — Parameter + return

```python
# Before
def method(self, data):
    result = data.value * 2 + data.offset

# After
def method(self, data):
    result = self._compute(data)

def _compute(self, data):
    return data.value * 2 + data.offset

# Multiple return — tuple
def _combine(self, a, b):
    return (a + b, a * b)

c, d = self._combine(x, y)
```

## 자주 보는 안티패턴

### 1. 너무 작은 추출

```python
def _add(self, a, b): return a + b   # 과잉
```
한 줄은 보통 인라인.

### 2. 나쁜 이름

`_do_stuff`, `_process` → 의미 없음. 도메인 단어.

### 3. Parameter 폭증

추출 method가 10개 parameter → 결합 강함. 객체화.

### 4. 부수효과 숨김

추출 method 안 외부 state 변경 → 호출자가 모름. 순수 또는 명확하다.

### 5. Test 없이 추출

Red 상태 추출 → 잘못된 동작 보존. 항상 green 후.

### 6. Naming 일관 없음

`compute_total`, `calculate_total`, `_calc_total` 혼재. 컨벤션.

## Modern variants

### IDE 자동 추출

| IDE | 단축키 |
| --- | --- |
| IntelliJ / PyCharm | Cmd+Alt+M (Mac) / Ctrl+Alt+M |
| VS Code | Ctrl+Shift+R → Extract Method |
| Rider | Ctrl+R, M |
| Vim coc / lsp | code action |

자동 + 안전하다.

### Extract function (Top-level)

class method 아닌 module-level function으로:

```python
def calculate_total(order):   # standalone
    return ...
```

순수 함수에 자연.

### Extract closure (JS, Python)

```javascript
const computeTotal = (order) => {
  // ...
};
```

closure로 캡슐화.

### Sprout Method (Feathers)

```python
def existing(self):
    self._sprout()   # 새 method
    # 기존 로직

def _sprout(self):
    """새 기능만"""
    ...
```

기존 변경 최소 + 새 영역 test.

### Method Object

복잡한 method 전체를 class로 — [Pattern 51: Method Object](/blog/programming/engineering/tdd-patterns/pattern51-method-object).

## 도구 / IDE

| 도구 | Extract Method |
| --- | --- |
| IntelliJ | Refactor → Extract → Method |
| Resharper | Ctrl+R, M |
| VS Code | code action |
| Vim language server | code action |

## 성능 고려

method 호출 추가 — JIT inline. 무관. 과도한 분해가 cache miss 가능 (극히 드물게).

## 관련 패턴

- [Pattern 48: Inline Method](/blog/programming/engineering/tdd-patterns/pattern48-inline-method) — 역연산
- [Pattern 45: Isolate Change](/blog/programming/engineering/tdd-patterns/pattern45-isolate-change) — 변경 격리
- [Pattern 51: Method Object](/blog/programming/engineering/tdd-patterns/pattern51-method-object) — class로
- Refactoring [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
