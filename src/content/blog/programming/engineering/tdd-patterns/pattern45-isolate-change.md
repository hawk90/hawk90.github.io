---
title: "Pattern 45: Isolate Change"
date: 2026-05-10T21:00:00
description: "변경 영역을 격리 — 리팩터링 위험 감소, 테스트 가능 단위 확보."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 45
tags: [tdd, beck, isolate-change, scaffolding]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 변경할 부분을 먼저 격리해 리팩터링 위험 감소. 격리된 단위에 전용 테스트 추가 후 안전하게 수정.

## 동기

큰 method 일부만 수정해야 할 때:

```python
def process_order(self, order):
    # 30줄 검증
    # 20줄 계산  ← 이 부분만 수정
    # 15줄 저장
    # 10줄 알림
```

전체 이해 필요하면 위험. **Isolate Change**는 수정 영역 분리.

### 신호

- 큰 method 일부 수정 빈번.
- 변경이 다른 곳에 영향 의심.
- 테스트 단위가 너무 큼.
- legacy code 수정.

### 언제 적용하는가

- 부분 수정 필요.
- 테스트 단위 작게 만들고 싶음.
- 리팩터링 안전망 확보.
- 큰 method/class 분해.

## 절차

1. **변경 영역 식별**.
2. **Extract Method/Class**로 격리.
3. **격리된 단위에 테스트** 추가.
4. 전체 테스트 green 확인.
5. **격리된 단위만 수정** — 안전망 위에서.
6. (필요 시) 격리 코드 통합 환원 또는 유지.

## 예시 1 — Method 격리

```python
# Before
def process_order(self, order):
    self._validate_order(order)
    # 20줄 계산
    self._save_order(order, total)
    self._notify_customer(order)

# After: 변경 영역 추출
def process_order(self, order):
    self._validate_order(order)
    total = self._calculate_total(order)   # 격리
    self._save_order(order, total)
    self._notify_customer(order)

def _calculate_total(self, order):
    # 20줄 — 이제 집중해서 수정
    pass

# 격리된 단위 테스트
def test_calculate_total_basic():
    p = OrderProcessor()
    order = Order(items=[Item(100), Item(200)])
    assert p._calculate_total(order) == 300
```

## 예시 2 — Class 격리

복잡한 책임을 별도 class로:

```python
# Before — 한 class에 모든 것
class OrderProcessor:
    def process(self, order):
        # 검증 50줄, 계산 30줄, 저장 20줄
        ...

# After — 책임별 분리
class OrderProcessor:
    def __init__(self):
        self.validator = OrderValidator()
        self.calculator = PriceCalculator()
        self.repository = OrderRepository()

    def process(self, order):
        if not self.validator.validate(order): return False
        total = self.calculator.calculate(order)
        self.repository.save(order, total)
        return True

class PriceCalculator:
    def calculate(self, order):
        # 격리된 계산 — 독립 테스트
        return self._subtotal(order) - self._discount(order) + self._tax(order)
```

각 class가 독립 테스트 가능하다.

## 예시 3 — Scaffolding (temp 이름)

```python
def process_payment(self, payment):
    validated = self._validate_payment_TEMP(payment)
    if not validated: return False
    self._charge_card(payment)
    return True

def _validate_payment_TEMP(self, payment):
    """Scaffolding — 나중에 rename"""
    if payment.amount <= 0: return False
    if not payment.card_valid: return False
    return True
```

리팩터링 완료 후 *`_TEMP` 제거*.

## 자주 보는 안티패턴

### 1. Big-bang 추출

한 번에 여러 method 추출 → 어디서 깨지는지 모름. 한 번에 하나.

### 2. 추출 후 테스트 없음

격리만 하고 test 안 씀 → 안전망 없음. 항상 test 동반.

### 3. 과도한 분해

모든 줄을 method로 → noise. 의미 단위.

### 4. Private method test 결합

private method 직접 test → 리팩터링 시 test도 깨짐. behavior test.

### 5. 통합 환원 잊음

임시 격리가 영구 남음 → 의도 모호. 끝나면 환원 또는 정식화.

### 6. Class 격리 + 양방향 의존

새 class가 원본도 의존 → 순환. 단방향.

## Modern variants

### Sprout Method (Feathers)

```python
def existing_method(self, x):
    self._sprout(x)   # 새 코드는 새 method로
    return self._original_logic()

def _sprout(self, x):
    """새 동작만 — test 풍부"""
    ...
```

기존 코드 건드리지 않고 새 동작 추가.

### Sprout Class

```python
class ExistingClass:
    def method(self, x):
        return NewFeature().process(x)

class NewFeature:
    def process(self, x):
        ...   # 독립 테스트
```

### Wrap Method (Feathers)

```python
def method(self, x):
    self._before_logic()
    result = self._original(x)
    self._after_logic()
    return result
```

원본 변경 없이 wrap.

### Branch by abstraction

interface 도입 → 점진적 마이그레이션.

### Feature flag

flag로 new code 분리 + rollback 쉬움.

```python
if flag("new_calculation"):
    return new_calculate(order)
return old_calculate(order)
```

### Strangler Fig

old system 옆에 new system — 점진적 대체.

## 도구 / IDE

| 도구 | Isolate 지원 |
| --- | --- |
| IntelliJ "Extract Method" | 자동 추출 |
| Refactor → Extract Class | 자동 |
| Resharper | 같음 |
| Refactoring [Pattern 1](/blog/programming/design/refactoring-catalog/pattern01-extract-function) | 표준 |

## 성능 고려

method/class 추출은 JIT inline — 런타임 무관. 분해된 코드는 cache locality 약간 변화 가능 — 측정.

## 관련 패턴

- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 메서드 추출
- [Pattern 44: Reconcile Differences](/blog/programming/engineering/tdd-patterns/pattern44-reconcile-differences) — 차이 통합
- [Pattern 49: Extract Interface](/blog/programming/engineering/tdd-patterns/pattern49-extract-interface) — 인터페이스 추출
- [Working Effectively with Legacy Code](/blog/programming/engineering/wewlc) — Feathers의 sprout/wrap
