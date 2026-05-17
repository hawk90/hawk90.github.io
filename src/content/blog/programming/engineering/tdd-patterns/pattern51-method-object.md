---
title: "Pattern 51: Method Object"
date: 2026-07-03T03:00:00
description: "복잡한 method를 새 class로 — local 변수 = field."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 51
tags: [tdd, beck, method-object, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 지역 변수가 많은 복잡한 메서드를 별도 클래스로 추출하여 분해를 가능하게 한다.

## 동기 (Motivation)

**지역 변수가 많아서** Extract Method가 어려운 상황:

```python
def calculate_price(self, order):
    base_price = 0
    discount = 0
    tax = 0
    shipping = 0
    handling = 0
    insurance = 0

    # 50줄의 복잡한 계산
    # 모든 변수가 얽혀 있음

    return base_price - discount + tax + shipping + handling + insurance
```

**지역 변수 → 필드**로 만들면 분해가 가능해진다.

## Method Object 적용

### Before

```python
class Order:
    def calculate_price(self):
        base_price = sum(item.price for item in self.items)
        quantity_discount = 0
        if len(self.items) > 10:
            quantity_discount = base_price * 0.1

        member_discount = 0
        if self.customer.is_member:
            member_discount = base_price * 0.05

        subtotal = base_price - quantity_discount - member_discount

        tax = subtotal * 0.1

        shipping = 0
        if subtotal < 100:
            shipping = 10
        elif subtotal < 500:
            shipping = 5

        return subtotal + tax + shipping
```

### After

```python
class PriceCalculator:
    """Method Object — 계산을 전담하는 클래스"""
    def __init__(self, order):
        self.order = order
        self.base_price = 0
        self.quantity_discount = 0
        self.member_discount = 0
        self.subtotal = 0
        self.tax = 0
        self.shipping = 0

    def calculate(self):
        self._calculate_base_price()
        self._calculate_discounts()
        self._calculate_subtotal()
        self._calculate_tax()
        self._calculate_shipping()
        return self.subtotal + self.tax + self.shipping

    def _calculate_base_price(self):
        self.base_price = sum(item.price for item in self.order.items)

    def _calculate_discounts(self):
        if len(self.order.items) > 10:
            self.quantity_discount = self.base_price * 0.1
        if self.order.customer.is_member:
            self.member_discount = self.base_price * 0.05

    def _calculate_subtotal(self):
        self.subtotal = (
            self.base_price -
            self.quantity_discount -
            self.member_discount
        )

    def _calculate_tax(self):
        self.tax = self.subtotal * 0.1

    def _calculate_shipping(self):
        if self.subtotal < 100:
            self.shipping = 10
        elif self.subtotal < 500:
            self.shipping = 5
        else:
            self.shipping = 0

class Order:
    def calculate_price(self):
        return PriceCalculator(self).calculate()
```

## 변환 과정

### Step 1: 새 클래스 생성

```python
class PriceCalculator:
    def __init__(self, order):
        self.order = order
```

### Step 2: 지역 변수를 필드로

```python
class PriceCalculator:
    def __init__(self, order):
        self.order = order
        # 지역 변수 → 필드
        self.base_price = 0
        self.discount = 0
        self.tax = 0
```

### Step 3: 메서드 복사

```python
class PriceCalculator:
    def calculate(self):
        # 원래 메서드 내용 복사
        # local var → self.field
        pass
```

### Step 4: 원래 메서드에서 위임

```python
class Order:
    def calculate_price(self):
        return PriceCalculator(self).calculate()
```

### Step 5: 분해 (이제 가능!)

```python
class PriceCalculator:
    def calculate(self):
        self._step1()
        self._step2()
        self._step3()
        return self.result
```

## 테스트 이점

```python
# 전체 계산 테스트
def test_calculate_price_total():
    order = Order(items=[Item(100), Item(200)])
    calculator = PriceCalculator(order)

    result = calculator.calculate()

    assert result == 330  # 300 + 30(tax)

# 개별 단계 테스트 (Method Object만의 이점!)
def test_calculate_base_price():
    order = Order(items=[Item(100), Item(200)])
    calculator = PriceCalculator(order)

    calculator._calculate_base_price()

    assert calculator.base_price == 300

def test_calculate_quantity_discount():
    items = [Item(10) for _ in range(15)]  # 15개 아이템
    order = Order(items=items)
    calculator = PriceCalculator(order)
    calculator._calculate_base_price()

    calculator._calculate_discounts()

    assert calculator.quantity_discount == 15  # 10% 할인
```

## Command 패턴과의 관계

**Method Object**는 **Command 패턴**과 유사:

```python
# Command — 연산을 객체로
class CalculatePriceCommand:
    def __init__(self, order):
        self.order = order

    def execute(self):
        # 계산 로직
        return result

# Method Object — 복잡한 메서드를 객체로
class PriceCalculator:
    def __init__(self, order):
        self.order = order

    def calculate(self):
        # 같은 계산 로직
        return result
```

**차이**: Method Object는 **내부 분해가 목적**, Command는 **연산 캡슐화가 목적**.

## 다른 예제

### 보고서 생성

```python
# Before
class Report:
    def generate(self, data):
        header = ...
        summary = ...
        details = ...
        charts = ...
        footer = ...
        # 100줄의 로직
        return combined_output

# After
class ReportGenerator:
    def __init__(self, data):
        self.data = data
        self.header = None
        self.summary = None
        self.details = None
        self.charts = None
        self.footer = None

    def generate(self):
        self._build_header()
        self._build_summary()
        self._build_details()
        self._build_charts()
        self._build_footer()
        return self._combine()

    def _build_header(self):
        self.header = f"Report: {self.data.title}"

    # ... 각 단계를 개별 테스트 가능
```

### 알고리즘 구현

```python
class DijkstraAlgorithm:
    """최단 경로 알고리즘을 Method Object로"""
    def __init__(self, graph, start, end):
        self.graph = graph
        self.start = start
        self.end = end
        self.distances = {}
        self.previous = {}
        self.unvisited = set()

    def find_path(self):
        self._initialize()
        self._process_nodes()
        return self._build_path()

    def _initialize(self):
        for node in self.graph.nodes:
            self.distances[node] = float('inf')
            self.unvisited.add(node)
        self.distances[self.start] = 0

    def _process_nodes(self):
        while self.unvisited:
            current = self._get_nearest_unvisited()
            if current == self.end:
                break
            self._update_neighbors(current)
            self.unvisited.remove(current)

    # 각 단계를 독립적으로 테스트 가능
```

## 언제 사용하나

| 상황 | 사용 |
|------|------|
| 지역 변수가 5개 이상 | ✓ |
| Extract Method가 파라미터 폭발 | ✓ |
| 단계별 테스트가 필요 | ✓ |
| 복잡한 알고리즘 | ✓ |
| 단순한 계산 | ✗ |
| 지역 변수 1-2개 | ✗ |

## 정리

- **지역 변수 → 필드**로 변환
- **Extract Method 제약 해소**
- **복잡한 메서드 분해** 가능
- **단계별 테스트** 가능
- **Command 패턴**과 유사
- **알고리즘·보고서 생성**에 유용

## 관련 패턴

- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 분해 전 단계
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 연산 객체
- [Pattern 50: Move Method](/blog/programming/engineering/tdd-patterns/pattern50-move-method) — 메서드 이동

