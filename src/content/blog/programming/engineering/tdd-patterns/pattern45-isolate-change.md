---
title: "Pattern 45: Isolate Change"
date: 2026-07-02T21:00:00
description: "변경 영역을 격리 — 다음 단계 작업하기 좋게."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 45
tags: [tdd, beck, isolate-change, scaffolding]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 변경할 부분을 먼저 격리하여 리팩터링 위험을 줄인다.

## 동기 (Motivation)

**큰 메서드**에서 일부만 수정해야 할 때:

```python
def process_order(self, order):
    # 30줄의 검증 로직
    # 20줄의 계산 로직  ← 이 부분만 수정하고 싶음
    # 15줄의 저장 로직
    # 10줄의 알림 로직
```

**전체 메서드를 이해해야** 수정할 수 있다면 위험하다.

## Isolate Change 전략

### Step 1: 변경 영역 추출

```python
def process_order(self, order):
    self._validate_order(order)
    total = self._calculate_total(order)  # 이 부분만 추출
    self._save_order(order, total)
    self._notify_customer(order)

def _calculate_total(self, order):
    # 20줄의 계산 로직
    # 이제 이 메서드만 집중해서 수정
    pass
```

### Step 2: 격리된 부분만 테스트 추가

```python
def test_calculate_total_basic():
    processor = OrderProcessor()
    order = Order(items=[Item(100), Item(200)])

    total = processor._calculate_total(order)

    assert total == 300

def test_calculate_total_with_discount():
    processor = OrderProcessor()
    order = Order(items=[Item(100)], discount=10)

    total = processor._calculate_total(order)

    assert total == 90
```

### Step 3: 안전하게 수정

```python
def _calculate_total(self, order):
    # 격리된 상태에서 안전하게 로직 변경
    # 전용 테스트가 보호
    subtotal = sum(item.price for item in order.items)
    discount = self._calculate_discount(order)
    tax = self._calculate_tax(subtotal - discount)
    return subtotal - discount + tax
```

## 예제: 복잡한 포맷팅 격리

### Before

```python
def generate_report(self, data):
    output = []
    output.append("=== Report ===")

    # 복잡한 테이블 포맷팅 (변경 필요)
    for item in data.items:
        name = item.name.ljust(20)
        price = f"${item.price:.2f}".rjust(10)
        qty = str(item.qty).center(5)
        total = f"${item.price * item.qty:.2f}".rjust(12)
        output.append(f"| {name} | {price} | {qty} | {total} |")

    output.append("=== End ===")
    return "\n".join(output)
```

### After (격리)

```python
def generate_report(self, data):
    output = []
    output.append("=== Report ===")
    output.extend(self._format_items(data.items))  # 격리
    output.append("=== End ===")
    return "\n".join(output)

def _format_items(self, items):
    """격리된 포맷팅 로직 — 테스트 가능"""
    lines = []
    for item in items:
        lines.append(self._format_single_item(item))
    return lines

def _format_single_item(self, item):
    """더 작은 단위로 격리"""
    name = item.name.ljust(20)
    price = f"${item.price:.2f}".rjust(10)
    qty = str(item.qty).center(5)
    total = f"${item.price * item.qty:.2f}".rjust(12)
    return f"| {name} | {price} | {qty} | {total} |"
```

### 격리된 부분 테스트

```python
def test_format_single_item():
    processor = ReportGenerator()
    item = Item(name="Widget", price=10.0, qty=3)

    result = processor._format_single_item(item)

    assert "Widget" in result
    assert "$10.00" in result
    assert "3" in result
    assert "$30.00" in result
```

## Scaffolding으로 격리

**임시 코드**로 변경 영역 격리:

```python
def process_payment(self, payment):
    # Step 1: 변경할 부분을 임시로 추출
    validated = self._validate_payment_TEMP(payment)
    if not validated:
        return False

    # 나머지 로직
    self._charge_card(payment)
    self._send_receipt(payment)
    return True

def _validate_payment_TEMP(self, payment):
    """Scaffolding — 나중에 rename"""
    # 이 부분만 수정
    if payment.amount <= 0:
        return False
    if not payment.card_valid:
        return False
    if payment.amount > payment.card_limit:
        return False
    return True
```

리팩터링 완료 후 `_TEMP` 제거.

## 클래스 레벨 격리

**복잡한 로직**을 별도 클래스로:

```python
# Before: 한 클래스에 모든 것
class OrderProcessor:
    def process(self, order):
        # 검증 로직 50줄
        # 계산 로직 30줄
        # 저장 로직 20줄
        pass

# After: 변경 영역을 별도 클래스로 격리
class OrderProcessor:
    def __init__(self):
        self.validator = OrderValidator()  # 격리
        self.calculator = PriceCalculator()  # 격리
        self.repository = OrderRepository()  # 격리

    def process(self, order):
        if not self.validator.validate(order):
            return False
        total = self.calculator.calculate(order)
        self.repository.save(order, total)
        return True

class PriceCalculator:
    """격리된 계산 로직 — 독립적으로 테스트 가능"""
    def calculate(self, order):
        subtotal = self._subtotal(order)
        discount = self._discount(order)
        tax = self._tax(subtotal - discount)
        return subtotal - discount + tax
```

## 테스트 관점

### 격리 전

```python
def test_order_processing():
    # 전체 프로세스를 테스트해야 함
    # 검증 + 계산 + 저장 모두 포함
    processor = OrderProcessor()
    result = processor.process(order)
    # 어느 부분이 문제인지 파악 어려움
```

### 격리 후

```python
def test_price_calculation():
    # 계산 로직만 테스트
    calculator = PriceCalculator()
    total = calculator.calculate(order)
    assert total == expected

def test_order_validation():
    # 검증 로직만 테스트
    validator = OrderValidator()
    assert validator.validate(valid_order)
    assert not validator.validate(invalid_order)

def test_order_processing_integration():
    # 통합만 테스트 (각 부분은 이미 검증됨)
    processor = OrderProcessor()
    result = processor.process(order)
```

## 격리의 이점

| 측면 | 격리 전 | 격리 후 |
|------|---------|---------|
| 이해 범위 | 전체 메서드 | 해당 부분만 |
| 테스트 범위 | 전체 흐름 | 격리된 단위 |
| 변경 위험 | 높음 | 낮음 |
| 재사용 | 어려움 | 쉬움 |

## 정리

- **변경할 부분을 먼저 격리**
- **Extract Method/Class**로 분리
- **격리된 부분에 테스트 추가**
- **안전하게 수정 후 통합**
- **Scaffolding 기법** 활용
- **리팩터링 위험 감소**

## 관련 패턴

- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 메서드 추출
- [Pattern 44: Reconcile Differences](/blog/programming/engineering/tdd-patterns/pattern44-reconcile-differences) — 차이 통합
- [Pattern 49: Extract Interface](/blog/programming/engineering/tdd-patterns/pattern49-extract-interface) — 인터페이스 추출

