---
title: "Pattern 47: Extract Method (in TDD)"
date: 2026-07-02T23:00:00
description: "TDD 흐름에서의 Extract Method."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 47
tags: [tdd, beck, extract-method, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 코드 블록에 이름을 붙여 별도 메서드로 추출한다 — Refactor 단계의 핵심 도구.

## 동기 (Motivation)

**Green 상태**에서 코드를 정리할 때:

```python
def process_order(self, order):
    # 검증
    if order.total <= 0:
        raise ValueError("Invalid total")
    if not order.items:
        raise ValueError("No items")

    # 계산
    subtotal = sum(item.price for item in order.items)
    discount = subtotal * 0.1 if order.is_member else 0
    total = subtotal - discount

    # 저장
    self.db.save(order)
    self.db.save_total(order.id, total)

    return total
```

**Extract Method**로 의도를 드러낸다.

## Extract Method 적용

### Before

```python
def process_order(self, order):
    # 검증
    if order.total <= 0:
        raise ValueError("Invalid total")
    if not order.items:
        raise ValueError("No items")

    # 계산
    subtotal = sum(item.price for item in order.items)
    discount = subtotal * 0.1 if order.is_member else 0
    total = subtotal - discount

    # 저장
    self.db.save(order)
    self.db.save_total(order.id, total)

    return total
```

### After

```python
def process_order(self, order):
    self._validate(order)
    total = self._calculate_total(order)
    self._save(order, total)
    return total

def _validate(self, order):
    if order.total <= 0:
        raise ValueError("Invalid total")
    if not order.items:
        raise ValueError("No items")

def _calculate_total(self, order):
    subtotal = sum(item.price for item in order.items)
    discount = subtotal * 0.1 if order.is_member else 0
    return subtotal - discount

def _save(self, order, total):
    self.db.save(order)
    self.db.save_total(order.id, total)
```

## TDD 흐름에서의 위치

```text
Red → Green → Refactor
              ^^^^^^^^
              Extract Method는 여기서!
```

**테스트가 Green인 상태**에서 안전하게 추출:

```python
# 테스트는 그대로
def test_process_order():
    processor = OrderProcessor(fake_db)
    order = Order(items=[Item(100)], is_member=True)

    total = processor.process_order(order)

    assert total == 90  # 10% 할인

# 내부 구조만 변경 — 테스트는 통과
```

## 추출 동기

### 1. 이름 붙이기

```python
# Before — 무슨 일인지 읽어야 앎
total = sum(item.price * item.qty for item in items)
total = total - (total * discount_rate)
total = total + (total * tax_rate)

# After — 이름이 의도를 설명
subtotal = self._calculate_subtotal(items)
total = self._apply_discount(subtotal, discount_rate)
total = self._apply_tax(total, tax_rate)
```

### 2. 중복 제거

```python
# Before — 중복
def method_a(self):
    x = self.data.value * 2 + self.data.offset
    # ...

def method_b(self):
    x = self.data.value * 2 + self.data.offset
    # ...

# After — 공통 추출
def method_a(self):
    x = self._computed_value()
    # ...

def method_b(self):
    x = self._computed_value()
    # ...

def _computed_value(self):
    return self.data.value * 2 + self.data.offset
```

### 3. 테스트 용이성

```python
# Before — 복잡한 메서드 전체를 테스트
def complex_method(self):
    # 50줄의 로직
    pass

# After — 작은 단위로 테스트 가능
def complex_method(self):
    a = self._step_a()
    b = self._step_b(a)
    return self._step_c(b)

def test_step_a():
    # step_a만 테스트
    pass
```

## 추출 메커니즘

### 1. 추출할 코드 식별

```python
def method(self):
    # 이 부분을 추출
    # ----------------
    result = []
    for item in self.items:
        if item.is_valid:
            result.append(item.value)
    # ----------------
    return sum(result)
```

### 2. 지역 변수 확인

```python
# 추출할 코드가 사용하는 것:
# - self.items (인스턴스 변수) → 파라미터 불필요
# - item (루프 변수) → 내부에서 처리
# - result (지역 변수) → 반환값

def _extract_valid_values(self):
    result = []
    for item in self.items:
        if item.is_valid:
            result.append(item.value)
    return result
```

### 3. 호출로 대체

```python
def method(self):
    valid_values = self._extract_valid_values()
    return sum(valid_values)
```

## 파라미터와 반환값

### 파라미터 필요한 경우

```python
# Before
def method(self, data):
    result = data.value * 2 + data.offset  # data 사용

# After
def method(self, data):
    result = self._compute(data)  # data 전달

def _compute(self, data):
    return data.value * 2 + data.offset
```

### 여러 값 반환

```python
# Before
def method(self):
    a = calculate_a()
    b = calculate_b()
    c = a + b
    d = a * b
    return (c, d)

# After — 튜플 반환
def method(self):
    a = calculate_a()
    b = calculate_b()
    return self._combine(a, b)

def _combine(self, a, b):
    c = a + b
    d = a * b
    return (c, d)
```

## IDE 지원

대부분의 IDE가 **자동 추출** 지원:

```text
PyCharm: Ctrl+Alt+M (Mac: Cmd+Option+M)
VS Code: Ctrl+Shift+R → Extract Method
IntelliJ: Ctrl+Alt+M

1. 코드 선택
2. 단축키
3. 메서드 이름 입력
4. 완료
```

## 주의사항

### 너무 작은 추출

```python
# 오버킬 — 한 줄 추출은 보통 불필요
def _add(self, a, b):
    return a + b

# 그냥 인라인으로
total = a + b
```

### 이름이 더 나빠지면

```python
# Bad — 이름이 정보를 추가하지 않음
def _do_stuff(self):
    # ...

# Bad — 너무 일반적
def _process(self):
    # ...

# Good — 의도가 명확
def _calculate_discount(self):
    # ...
```

## 정리

- **코드 블록에 이름 부여**
- **Refactor 단계의 핵심 도구**
- **테스트 Green 상태에서 수행**
- **중복 제거·가독성 향상**
- **작은 단위 테스트 가능**
- **IDE 자동화 활용**

## 관련 패턴

- [Pattern 48: Inline Method](/blog/programming/engineering/tdd-patterns/pattern48-inline-method) — 추출의 역
- [Pattern 45: Isolate Change](/blog/programming/engineering/tdd-patterns/pattern45-isolate-change) — 변경 격리
- [Pattern 51: Method Object](/blog/programming/engineering/tdd-patterns/pattern51-method-object) — 메서드를 클래스로

