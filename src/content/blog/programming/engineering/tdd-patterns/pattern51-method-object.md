---
title: "Pattern 51: Method Object"
date: 2026-05-10T03:00:00
description: "복잡한 method를 새 class로 — local 변수 = field. 분해의 발판."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 51
tags: [tdd, beck, method-object, refactor]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 지역 변수 많은 복잡한 method를 별도 class로. 지역 변수 → field가 되어 분해 가능. Command 패턴과 유사.

## 동기

지역 변수 많아서 Extract Method 어려운 상황:

```python
def calculate_price(self, order):
    base_price = 0
    discount = 0
    tax = 0
    shipping = 0
    # 50줄, 변수가 얽힘
    return base_price - discount + tax + shipping
```

helper로 추출하려면 parameter 폭발. **Method Object**는 지역 변수 → field.

### 신호

- 지역 변수 5개+.
- Extract Method 시도 시 parameter 7+.
- 50줄+ method.
- 단계별 test 필요.

### 언제 적용하는가

- 알고리즘 복잡.
- 분해할 논리 단계 명확.
- 단계별 검증 필요.
- *undo / progress / state* 필요.

### 언제 적용하지 않는가

- 단순 계산.
- 지역 변수 1-2개.
- Class overhead가 과잉.

## 절차

1. **새 class 생성** (e.g., `PriceCalculator`).
2. **constructor**가 원본 method parameter 받음.
3. **지역 변수 → field**.
4. **method 본문 복사** + self-reference 수정.
5. 원본 method는 delegate — `Calculator(self).calculate()`.
6. 이제 단계별 분해 — Extract Method 자유.

## 예시 1 — Price calculation

```python
# After Method Object
class PriceCalculator:
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
        self.base_price = sum(i.price for i in self.order.items)

    def _calculate_discounts(self):
        if len(self.order.items) > 10:
            self.quantity_discount = self.base_price * 0.1
        if self.order.customer.is_member:
            self.member_discount = self.base_price * 0.05

    def _calculate_subtotal(self):
        self.subtotal = self.base_price - self.quantity_discount - self.member_discount

    def _calculate_tax(self):
        self.tax = self.subtotal * 0.1

    def _calculate_shipping(self):
        if self.subtotal < 100: self.shipping = 10
        elif self.subtotal < 500: self.shipping = 5

class Order:
    def calculate_price(self):
        return PriceCalculator(self).calculate()
```

각 step이 method — 단독 test 가능하다.

## 예시 2 — 단계별 test

```python
def test_calculate_base_price():
    order = Order(items=[Item(100), Item(200)])
    calc = PriceCalculator(order)
    calc._calculate_base_price()
    assert calc.base_price == 300

def test_quantity_discount():
    items = [Item(10) for _ in range(15)]
    order = Order(items=items)
    calc = PriceCalculator(order)
    calc._calculate_base_price()
    calc._calculate_discounts()
    assert calc.quantity_discount == 15
```

partial state 검증 — 세분화된 test.

## 예시 3 — 알고리즘

```python
class DijkstraAlgorithm:
    def __init__(self, graph, start, end):
        self.graph = graph
        self.start = start; self.end = end
        self.distances = {}
        self.previous = {}
        self.unvisited = set()

    def find_path(self):
        self._initialize()
        self._process_nodes()
        return self._build_path()

    def _initialize(self): ...
    def _process_nodes(self): ...
    def _build_path(self): ...
```

복잡한 알고리즘 → 명명된 단계.

## 자주 보는 안티패턴

### 1. Class overhead 과잉

간단한 method까지 class화 → boilerplate. 진짜 복잡만.

### 2. 모든 step exposed

internal step이 public → test 외 호출자 의존.

### 3. Mutable state race

multi-thread에서 같은 instance 공유 → race. instance per call.

### 4. Step 순서 의존 모호

`_step1, _step2`처럼 호출 순서 가정 명시 없다.

### 5. Calculator + 비즈니스 로직

계산 외 DB save 같은 책임 추가 → SRP 위반.

### 6. 원본 method 안 지움

duplicate logic — Method Object + 원본 동작 → maintain 두 곳.

## Modern variants

### Command 패턴 (Pattern 33)

```python
class CalculateCommand:
    def __init__(self, order): ...
    def execute(self) -> Price: ...
```

같은 정신. Method Object는 분해 목적, Command는 연산 객체화.

### Pipeline

```python
result = (
    Pipeline(order)
    .step(calculate_base)
    .step(apply_discount)
    .step(add_tax)
    .step(add_shipping)
    .run()
)
```

함수형 pipeline 표현.

### Builder

복잡한 객체 단계적 구축 — Method Object의 build 변형.

### State machine

```python
class OrderStateMachine:
    def __init__(self): self.state = "initial"
    def pay(self): if self.state == "initial": self.state = "paid"
    def ship(self): ...
```

상태 + 전이를 class로.

### Saga (분산 transaction)

여러 service 호출을 Saga class로 — 각 step + compensation.

## Method Object vs Command vs Strategy

| 패턴 | 목적 |
| --- | --- |
| Method Object | 분해 가능하게 |
| Command | 연산 캡슐화 (undo, queue) |
| Strategy | 알고리즘 교체 |

겹치지만 주 목적이 다름.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ "Replace Method with Method Object" | 자동 |
| Resharper | 같음 |
| 수동 + Extract Method 반복 | 일반 |

## 성능 고려

- Object 생성 overhead — 한 번. 무관.
- Field access vs local var — JIT 최적화 — 차이 거의 없음.
- 분해된 method 호출 — JIT inline.

## 관련 패턴

- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 분해 전 단계
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 연산 객체
- [Pattern 50: Move Method](/blog/programming/engineering/tdd-patterns/pattern50-move-method) — 메서드 이동
- Refactoring [Pattern 49: Replace Function with Command](/blog/programming/design/refactoring-catalog/pattern49-replace-function-with-command)
