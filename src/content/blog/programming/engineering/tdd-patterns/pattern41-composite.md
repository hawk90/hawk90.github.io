---
title: "Pattern 41: Composite (in TDD)"
date: 2026-07-02T17:00:00
description: "Single·collection 같은 interface — recursive 처리."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 41
tags: [tdd, beck, composite, gof]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 단일 객체와 객체 컬렉션을 동일한 인터페이스로 다루어 재귀적 처리를 가능하게 한다.

## 동기 (Motivation)

**단일 객체**와 **객체 집합**을 다르게 처리해야 하는 코드:

```python
# 단일 테스트 vs 테스트 모음
if isinstance(test, TestSuite):
    for t in test.tests:
        t.run()
else:
    test.run()
```

**Composite** 패턴은 둘을 **같은 인터페이스**로 다룬다.

## Composite 패턴

### 기본 구조

```python
from abc import ABC, abstractmethod

class Test(ABC):
    """Component — 공통 인터페이스"""
    @abstractmethod
    def run(self) -> None:
        pass

class TestCase(Test):
    """Leaf — 단일 테스트"""
    def __init__(self, name):
        self.name = name

    def run(self):
        print(f"Running {self.name}")
        # 실제 테스트 로직

class TestSuite(Test):
    """Composite — 테스트 모음"""
    def __init__(self):
        self.tests = []

    def add(self, test: Test):
        self.tests.append(test)

    def run(self):
        for test in self.tests:
            test.run()  # 재귀 호출
```

### 사용

```python
# 단일 테스트
test1 = TestCase("test_add")
test1.run()

# 테스트 모음
suite = TestSuite()
suite.add(TestCase("test_add"))
suite.add(TestCase("test_subtract"))

# 중첩 모음
nested = TestSuite()
nested.add(TestCase("test_multiply"))
nested.add(suite)  # 모음 안에 모음

# 동일한 인터페이스로 실행
nested.run()  # 모든 테스트 실행
```

## xUnit에서의 Composite

**xUnit 프레임워크의 핵심 구조**:

```python
class TestResult:
    def __init__(self):
        self.run_count = 0
        self.failure_count = 0

    def test_started(self):
        self.run_count += 1

    def test_failed(self):
        self.failure_count += 1

class Test(ABC):
    @abstractmethod
    def run(self, result: TestResult):
        pass

    @abstractmethod
    def count_test_cases(self) -> int:
        pass

class TestCase(Test):
    def run(self, result):
        result.test_started()
        try:
            self.setUp()
            self.run_test()
            self.tearDown()
        except Exception:
            result.test_failed()

    def count_test_cases(self):
        return 1  # Leaf는 항상 1

class TestSuite(Test):
    def __init__(self):
        self.tests = []

    def run(self, result):
        for test in self.tests:
            test.run(result)  # 재귀

    def count_test_cases(self):
        return sum(t.count_test_cases() for t in self.tests)
```

## Money 예제의 Composite

Beck의 **Money 예제**에서 `Expression`이 Composite:

```python
class Expression(ABC):
    """Component"""
    @abstractmethod
    def reduce(self, bank, to_currency):
        pass

class Money(Expression):
    """Leaf"""
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def reduce(self, bank, to_currency):
        rate = bank.rate(self.currency, to_currency)
        return Money(self.amount / rate, to_currency)

class Sum(Expression):
    """Composite"""
    def __init__(self, augend: Expression, addend: Expression):
        self.augend = augend
        self.addend = addend

    def reduce(self, bank, to_currency):
        amount = (
            self.augend.reduce(bank, to_currency).amount +
            self.addend.reduce(bank, to_currency).amount
        )
        return Money(amount, to_currency)
```

```python
# 단일 Money
five = Money(5, "USD")
result = five.reduce(bank, "USD")  # Money(5, USD)

# 복합 Expression
sum_expr = Sum(Money(5, "USD"), Money(10, "CHF"))
result = sum_expr.reduce(bank, "USD")  # 환율 적용 후 합산

# 중첩
complex_expr = Sum(
    Sum(Money(5, "USD"), Money(10, "CHF")),
    Money(3, "USD")
)
result = complex_expr.reduce(bank, "USD")  # 모두 동일 interface
```

## 파일 시스템 예제

```python
class FileSystemNode(ABC):
    @abstractmethod
    def get_size(self) -> int:
        pass

    @abstractmethod
    def get_name(self) -> str:
        pass

class File(FileSystemNode):
    def __init__(self, name, size):
        self._name = name
        self._size = size

    def get_size(self):
        return self._size

    def get_name(self):
        return self._name

class Directory(FileSystemNode):
    def __init__(self, name):
        self._name = name
        self._children = []

    def add(self, node: FileSystemNode):
        self._children.append(node)

    def get_size(self):
        return sum(child.get_size() for child in self._children)

    def get_name(self):
        return self._name

# 사용
root = Directory("root")
root.add(File("readme.md", 1024))
root.add(File("setup.py", 512))

src = Directory("src")
src.add(File("main.py", 2048))
src.add(File("utils.py", 1024))
root.add(src)

print(root.get_size())  # 4608 (재귀적 합산)
```

## Composite의 테스트

```python
def test_single_test_case_runs():
    result = TestResult()
    test = TestCase("test_example")

    test.run(result)

    assert result.run_count == 1

def test_suite_runs_all_tests():
    result = TestResult()
    suite = TestSuite()
    suite.add(TestCase("test_1"))
    suite.add(TestCase("test_2"))
    suite.add(TestCase("test_3"))

    suite.run(result)

    assert result.run_count == 3

def test_nested_suites():
    result = TestResult()
    inner = TestSuite()
    inner.add(TestCase("inner_1"))
    inner.add(TestCase("inner_2"))

    outer = TestSuite()
    outer.add(TestCase("outer_1"))
    outer.add(inner)  # 중첩

    outer.run(result)

    assert result.run_count == 3

def test_count_test_cases():
    inner = TestSuite()
    inner.add(TestCase("a"))
    inner.add(TestCase("b"))

    outer = TestSuite()
    outer.add(inner)
    outer.add(TestCase("c"))

    assert outer.count_test_cases() == 3
```

## 언제 사용하나

```text
적합한 경우:
✓ 트리 구조 데이터 (파일 시스템, 조직도, UI 컴포넌트)
✓ 재귀적 처리가 필요한 도메인
✓ 단일/복합을 구분 없이 다루고 싶을 때
✓ xUnit 테스트 러너

부적합한 경우:
✗ 단순 리스트 처리 (Composite는 오버엔지니어링)
✗ Leaf와 Composite 연산이 크게 다를 때
✗ 깊이 제한이 필요한 구조
```

## 정리

- **단일 객체와 컬렉션**을 동일 인터페이스로
- **재귀적 처리** 가능
- **xUnit의 Test/TestSuite**가 대표적
- **Money 예제의 Money/Sum**도 Composite
- **트리 구조 도메인**에 자연스러움
- **클라이언트 코드 단순화**

## 관련 패턴

- [Pattern 42: Collecting Parameter](/blog/programming/engineering/tdd-patterns/pattern42-collecting-parameter) — 트리 순회 결과 수집
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — Sum이 Command이자 Composite
- [Pattern 34: Value Object](/blog/programming/engineering/tdd-patterns/pattern34-value-object) — Leaf로 자주 사용

