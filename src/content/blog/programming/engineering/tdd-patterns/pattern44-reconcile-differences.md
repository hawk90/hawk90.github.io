---
title: "Pattern 44: Reconcile Differences"
date: 2026-07-02T20:00:00
description: "거의 동일한 두 method — 점점 가까이 → 통합."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 44
tags: [tdd, beck, reconcile, dry]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 비슷한 두 코드를 작은 변경으로 점점 같게 만든 다음 통합한다.

## 동기 (Motivation)

**거의 같지만 미묘하게 다른** 두 메서드:

```python
class Dollar:
    def times(self, multiplier):
        return Dollar(self.amount * multiplier)

class Franc:
    def times(self, multiplier):
        return Franc(self.amount * multiplier)
```

**Big-bang 통합** 대신 **점진적으로 같게** 만든다.

## Reconcile Differences 전략

### Step 1: 차이점 파악

```python
# Dollar
def times(self, multiplier):
    return Dollar(self.amount * multiplier)
#          ^^^^^^ 차이점

# Franc
def times(self, multiplier):
    return Franc(self.amount * multiplier)
#          ^^^^^ 차이점
```

### Step 2: 차이를 파라미터로

```python
class Dollar:
    def times(self, multiplier):
        return Money(self.amount * multiplier, "USD")
        #      ^^^^^                           ^^^^^ 통일

class Franc:
    def times(self, multiplier):
        return Money(self.amount * multiplier, "CHF")
        #      ^^^^^                           ^^^^^ 통일
```

### Step 3: 공통 구조 확인

```python
# 이제 둘 다 같은 구조
def times(self, multiplier):
    return Money(self.amount * multiplier, self.currency)
```

### Step 4: 부모로 Pull Up

```python
class Money:
    def times(self, multiplier):
        return Money(self.amount * multiplier, self.currency)

# Dollar와 Franc에서 times() 제거
```

## Money 예제의 실제 과정

### 초기 상태

```python
class Dollar:
    def __init__(self, amount):
        self.amount = amount

    def times(self, multiplier):
        return Dollar(self.amount * multiplier)

    def __eq__(self, other):
        return self.amount == other.amount

class Franc:
    def __init__(self, amount):
        self.amount = amount

    def times(self, multiplier):
        return Franc(self.amount * multiplier)

    def __eq__(self, other):
        return self.amount == other.amount
```

### 공통 부모 도입

```python
class Money:
    def __init__(self, amount):
        self.amount = amount

    def __eq__(self, other):
        return (
            self.amount == other.amount and
            type(self) == type(other)
        )

class Dollar(Money):
    def times(self, multiplier):
        return Dollar(self.amount * multiplier)

class Franc(Money):
    def times(self, multiplier):
        return Franc(self.amount * multiplier)
```

### currency 추가

```python
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def __eq__(self, other):
        return (
            self.amount == other.amount and
            self.currency == other.currency
        )

class Dollar(Money):
    def __init__(self, amount):
        super().__init__(amount, "USD")

    def times(self, multiplier):
        return Dollar(self.amount * multiplier)

class Franc(Money):
    def __init__(self, amount):
        super().__init__(amount, "CHF")

    def times(self, multiplier):
        return Franc(self.amount * multiplier)
```

### times() 통일

```python
class Dollar(Money):
    def times(self, multiplier):
        return Money(self.amount * multiplier, self.currency)
        #      ^^^^^                           ^^^^^^^^^^^^^
        # Dollar 대신 Money, "USD" 대신 self.currency

class Franc(Money):
    def times(self, multiplier):
        return Money(self.amount * multiplier, self.currency)
        # 이제 Dollar.times()와 완전히 동일!
```

### Pull Up

```python
class Money:
    def times(self, multiplier):
        return Money(self.amount * multiplier, self.currency)

# Dollar와 Franc에서 times() 제거 가능
```

## 테스트가 보호

**각 단계에서 테스트 통과**:

```python
def test_dollar_multiplication():
    five = Dollar(5)
    assert five.times(2) == Dollar(10)

def test_franc_multiplication():
    five = Franc(5)
    assert five.times(2) == Franc(10)

def test_currency():
    assert Dollar(5).currency == "USD"
    assert Franc(5).currency == "CHF"

def test_equality():
    assert Dollar(5) == Dollar(5)
    assert Dollar(5) != Franc(5)
```

**리팩터링 중에도 모든 테스트 green**.

## 다른 예: 중복 메서드 통합

### Before

```python
class ReportGenerator:
    def generate_pdf_report(self, data):
        header = self._create_header("PDF Report")
        content = self._format_data(data)
        footer = self._create_footer()
        return self._write_pdf(header + content + footer)

    def generate_html_report(self, data):
        header = self._create_header("HTML Report")
        content = self._format_data(data)
        footer = self._create_footer()
        return self._write_html(header + content + footer)
```

### 차이점 추출

```python
def generate_pdf_report(self, data):
    return self._generate_report(data, "PDF Report", self._write_pdf)
    #                                  ^^^^^^^^^^^^  ^^^^^^^^^^^^^^

def generate_html_report(self, data):
    return self._generate_report(data, "HTML Report", self._write_html)
    #                                  ^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^
```

### 통합

```python
class ReportGenerator:
    def generate_report(self, data, title, writer):
        header = self._create_header(title)
        content = self._format_data(data)
        footer = self._create_footer()
        return writer(header + content + footer)

    def generate_pdf_report(self, data):
        return self.generate_report(data, "PDF Report", self._write_pdf)

    def generate_html_report(self, data):
        return self.generate_report(data, "HTML Report", self._write_html)
```

## 점진적 접근의 이점

### Big-bang 방식의 위험

```python
# 한 번에 모든 것을 바꾸려 함
# → 테스트 실패
# → 어디가 문제인지 모름
# → 롤백하고 처음부터
```

### Reconcile Differences 방식

```python
# Step 1: 테스트 green
# Step 2: 작은 변경 → 테스트 green
# Step 3: 작은 변경 → 테스트 green
# Step 4: 작은 변경 → 테스트 green
# 완료: 통합된 코드 + 테스트 green
```

## 정리

- **비슷한 코드**를 점진적으로 통일
- **작은 단계**로 차이를 줄임
- **매 단계 테스트 green** 유지
- **Big-bang 리팩터링 회피**
- **Pull Up Method**로 마무리
- **Money 예제의 핵심 기법**

## 관련 패턴

- [Pattern 45: Isolate Change](/blog/programming/engineering/tdd-patterns/pattern45-isolate-change) — 변경 영역 격리
- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 메서드 추출
- [Pattern 36: Template Method](/blog/programming/engineering/tdd-patterns/pattern36-template-method) — 골격 + 가변 단계

