---
title: "Pattern 48: Inline Method (in TDD)"
date: 2026-07-03T00:00:00
description: "잘못된 extract 복구·1줄 helper 제거."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 48
tags: [tdd, beck, inline-method, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 너무 작거나 이름이 도움이 안 되는 메서드는 호출자에 인라인한다.

## 동기 (Motivation)

**Extract Method**의 역방향. 메서드가 **가치를 더하지 않을 때**:

```python
def calculate_total(self, order):
    return self._get_sum(order.items)

def _get_sum(self, items):
    return sum(item.price for item in items)
```

`_get_sum`이 `sum()`보다 나은가? 아니라면 **인라인**.

## Inline Method 적용

### Before

```python
def process(self, data):
    validated = self._is_valid(data)
    if validated:
        return self._do_process(data)
    return None

def _is_valid(self, data):
    return data is not None  # 한 줄

def _do_process(self, data):
    return data.value * 2  # 한 줄
```

### After

```python
def process(self, data):
    if data is not None:
        return data.value * 2
    return None
```

## 인라인 대상

### 1. 한 줄짜리 wrapper

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

### 2. 이름이 정보를 추가하지 않음

```python
# Before
def calculate(self, x, y):
    return self._add(x, y)

def _add(self, a, b):
    return a + b  # 이름이 + 연산자보다 못함

# After
def calculate(self, x, y):
    return x + y
```

### 3. 잘못된 추출

```python
# Before — 과도한 추출
def process_order(self, order):
    self._step1(order)
    self._step2(order)
    self._step3(order)
    self._step4(order)
    self._step5(order)

def _step1(self, order): order.validate()
def _step2(self, order): order.calculate()
def _step3(self, order): order.apply_discount()
def _step4(self, order): order.save()
def _step5(self, order): order.notify()

# After — 의미 있는 그룹으로
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

## TDD에서의 역할

### Premature Extraction 복구

```python
# Red-Green-Refactor 중 너무 많이 추출함
# Refactor 단계에서 인라인으로 되돌림

# 테스트는 그대로 통과
def test_order_total():
    order = Order(items=[Item(100), Item(200)])
    assert order.total() == 300
```

### 실험 후 롤백

```python
# Extract Method로 실험했는데 더 안 좋아짐
# Inline Method로 원복

# Before (실험)
def method(self):
    a = self._part1()
    b = self._part2(a)
    return self._part3(b)

# After (원복)
def method(self):
    a = compute_a()
    b = compute_b(a)
    return finalize(b)
```

## 인라인 메커니즘

### 1. 호출 지점 확인

```python
def main_method(self):
    result = self._helper()  # 유일한 호출
    return result

def _helper(self):
    return self.data * 2
```

### 2. 코드 복사

```python
def main_method(self):
    result = self.data * 2  # _helper 내용을 복사
    return result

# _helper 삭제
```

### 3. 테스트 실행

```python
def test_main_method():
    obj = MyClass(data=5)
    assert obj.main_method() == 10  # 여전히 통과
```

## 여러 호출자가 있을 때

```python
# Before
def method_a(self):
    x = self._common()
    # ...

def method_b(self):
    y = self._common()
    # ...

def _common(self):
    return self.value + 1

# 인라인 (각 호출자에 복사)
def method_a(self):
    x = self.value + 1
    # ...

def method_b(self):
    y = self.value + 1
    # ...
```

**주의**: 중복이 생긴다면 인라인하지 않는 것이 나을 수 있다.

## 인라인하지 말아야 할 때

### 1. 의미 있는 추상화

```python
# 유지 — 이름이 의도를 설명
def _calculate_tax(self, amount):
    return amount * 0.1

def _apply_member_discount(self, amount):
    return amount * 0.9
```

### 2. 재사용되는 로직

```python
# 유지 — 여러 곳에서 사용
def _format_currency(self, amount):
    return f"${amount:.2f}"

def method_a(self):
    return self._format_currency(100)

def method_b(self):
    return self._format_currency(200)
```

### 3. 테스트 대상

```python
# 유지 — 독립적으로 테스트해야 함
def _complex_calculation(self, data):
    # 복잡한 로직
    pass

def test_complex_calculation():
    # 이 메서드만 테스트
    pass
```

## Extract와 Inline의 균형

```text
Extract Method ←→ Inline Method

너무 많이 추출 → 메서드 폭발, 읽기 어려움
너무 적게 추출 → 긴 메서드, 이해 어려움

적절한 균형점 찾기
```

### 판단 기준

| 질문 | Extract | Inline |
|------|---------|--------|
| 이름이 코드보다 명확한가? | ✓ | |
| 여러 곳에서 재사용되는가? | ✓ | |
| 독립적으로 테스트해야 하는가? | ✓ | |
| 한 줄짜리인가? | | ✓ |
| 이름이 구현과 같은 수준인가? | | ✓ |

## IDE 지원

```text
PyCharm: Ctrl+Alt+N (Mac: Cmd+Option+N)
VS Code: 수동 또는 확장 프로그램
IntelliJ: Ctrl+Alt+N

1. 메서드 선택
2. 단축키
3. 확인
4. 자동 인라인
```

## 정리

- **Extract Method의 역방향**
- **가치 없는 메서드 제거**
- **Premature extraction 복구**
- **한 줄짜리, 이름이 안 좋은 메서드** 대상
- **중복이 생기면 주의**
- **Extract/Inline 균형** 유지

## 관련 패턴

- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 인라인의 역
- [Pattern 45: Isolate Change](/blog/programming/engineering/tdd-patterns/pattern45-isolate-change) — 변경 격리
- [Pattern 44: Reconcile Differences](/blog/programming/engineering/tdd-patterns/pattern44-reconcile-differences) — 코드 통합

