---
title: "Pattern 42: Collecting Parameter"
date: 2026-07-02T18:00:00
description: "Collect 결과를 parameter로 전달 — visitor·report."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 42
tags: [tdd, beck, collecting-parameter, builder]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 결과를 누적할 컬렉터 객체를 파라미터로 전달하여 여러 객체가 협력해 결과를 구축한다.

## 동기 (Motivation)

여러 객체를 순회하며 **결과를 모아야** 하는 상황:

```python
# 반환값으로 결과 수집 — 복잡해짐
def collect_all_names(node):
    names = [node.name]
    for child in node.children:
        names.extend(collect_all_names(child))  # 매번 리스트 생성
    return names
```

**Collecting Parameter**는 결과를 담을 **컬렉터 객체**를 전달한다.

## Collecting Parameter 패턴

### 기본 구현

```python
def collect_all_names(node, collector):
    """collector에 결과 누적"""
    collector.append(node.name)
    for child in node.children:
        collect_all_names(child, collector)

# 사용
names = []
collect_all_names(root_node, names)
print(names)  # 모든 이름이 담김
```

### 반환값 vs Collecting Parameter

```python
# 반환값 방식 — 메모리 비효율
def sum_tree(node):
    total = node.value
    for child in node.children:
        total += sum_tree(child)  # 스택 깊이 = 트리 깊이
    return total

# Collecting Parameter — 단일 누적기
def sum_tree(node, accumulator):
    accumulator.add(node.value)
    for child in node.children:
        sum_tree(child, accumulator)

class Accumulator:
    def __init__(self):
        self.total = 0

    def add(self, value):
        self.total += value
```

## xUnit의 TestResult

**xUnit 프레임워크**에서 `TestResult`가 대표적인 Collecting Parameter:

```python
class TestResult:
    """Collecting Parameter for test execution"""
    def __init__(self):
        self.run_count = 0
        self.failures = []
        self.errors = []

    def test_started(self):
        self.run_count += 1

    def test_failed(self, test, message):
        self.failures.append((test, message))

    def test_errored(self, test, exception):
        self.errors.append((test, exception))

    def summary(self):
        return f"{self.run_count} run, {len(self.failures)} failed"

class TestCase:
    def run(self, result: TestResult):
        """result가 Collecting Parameter"""
        result.test_started()
        try:
            self.setUp()
            self.run_test()
            self.tearDown()
        except AssertionError as e:
            result.test_failed(self, str(e))
        except Exception as e:
            result.test_errored(self, e)

class TestSuite:
    def run(self, result: TestResult):
        """같은 result를 모든 테스트에 전달"""
        for test in self.tests:
            test.run(result)
```

```python
# 사용
result = TestResult()

suite = TestSuite()
suite.add(MyTest("test_add"))
suite.add(MyTest("test_subtract"))
suite.add(MyTest("test_multiply"))

suite.run(result)  # result에 모든 결과 수집

print(result.summary())  # "3 run, 0 failed"
```

## StringBuilder 패턴

**StringBuilder**도 Collecting Parameter와 같은 정신:

```python
class StringBuilder:
    def __init__(self):
        self._parts = []

    def append(self, text):
        self._parts.append(text)
        return self  # fluent interface

    def to_string(self):
        return "".join(self._parts)

def build_report(nodes, sb: StringBuilder):
    sb.append("Report:\n")
    for node in nodes:
        sb.append(f"  - {node.name}\n")
        build_children_report(node.children, sb)

def build_children_report(children, sb: StringBuilder):
    for child in children:
        sb.append(f"    * {child.name}\n")
```

```python
sb = StringBuilder()
build_report(root_nodes, sb)
print(sb.to_string())
```

## Visitor 패턴과 결합

```python
class TreeVisitor:
    """Collecting Parameter + Visitor"""
    def __init__(self):
        self.visited = []
        self.total_value = 0

    def visit(self, node):
        self.visited.append(node.name)
        self.total_value += node.value
        for child in node.children:
            child.accept(self)

class TreeNode:
    def __init__(self, name, value):
        self.name = name
        self.value = value
        self.children = []

    def accept(self, visitor):
        visitor.visit(self)
```

```python
visitor = TreeVisitor()
root.accept(visitor)
print(visitor.visited)      # ['root', 'child1', 'child2', ...]
print(visitor.total_value)  # 합계
```

## 리포트 생성 예제

```python
class ReportCollector:
    """복잡한 리포트 구축용 Collecting Parameter"""
    def __init__(self):
        self.sections = []
        self.warnings = []
        self.statistics = {}

    def add_section(self, title, content):
        self.sections.append({"title": title, "content": content})

    def add_warning(self, message):
        self.warnings.append(message)

    def set_statistic(self, key, value):
        self.statistics[key] = value

    def render(self):
        output = []
        for section in self.sections:
            output.append(f"## {section['title']}")
            output.append(section['content'])
        if self.warnings:
            output.append("## Warnings")
            for w in self.warnings:
                output.append(f"- {w}")
        return "\n".join(output)

def analyze_codebase(modules, collector: ReportCollector):
    total_lines = 0
    for module in modules:
        analyze_module(module, collector)
        total_lines += module.line_count

    collector.set_statistic("total_lines", total_lines)
    collector.set_statistic("module_count", len(modules))

def analyze_module(module, collector: ReportCollector):
    collector.add_section(
        module.name,
        f"Lines: {module.line_count}, Functions: {len(module.functions)}"
    )
    if module.has_issues:
        collector.add_warning(f"{module.name} has code quality issues")
```

## 테스트

```python
def test_collecting_parameter_accumulates():
    result = TestResult()
    test1 = PassingTest("test_1")
    test2 = PassingTest("test_2")

    test1.run(result)
    test2.run(result)

    assert result.run_count == 2

def test_collecting_parameter_with_failures():
    result = TestResult()
    passing = PassingTest("pass")
    failing = FailingTest("fail")

    passing.run(result)
    failing.run(result)

    assert result.run_count == 2
    assert len(result.failures) == 1

def test_suite_collects_all_results():
    result = TestResult()
    suite = TestSuite()
    suite.add(PassingTest("a"))
    suite.add(PassingTest("b"))
    suite.add(FailingTest("c"))

    suite.run(result)

    assert result.run_count == 3
    assert len(result.failures) == 1
```

## 언제 사용하나

| 상황 | 사용 여부 |
|------|----------|
| 트리/그래프 순회 결과 수집 | ✓ |
| 여러 객체가 협력해 결과 구축 | ✓ |
| 리포트/로그 생성 | ✓ |
| 반환값이 복잡한 구조 | ✓ |
| 단순 값 계산 | ✗ (반환값 사용) |
| 불변성이 중요할 때 | ✗ (mutation 기반) |

## 정리

- **결과를 담을 객체**를 파라미터로 전달
- **여러 호출이 같은 컬렉터**에 누적
- **xUnit의 TestResult**가 대표적
- **StringBuilder, Visitor**와 유사한 정신
- **트리 순회, 리포트 생성**에 유용
- **Composite 패턴과 자연스럽게 결합**

## 관련 패턴

- [Pattern 41: Composite](/blog/programming/engineering/tdd-patterns/pattern41-composite) — 트리 구조 순회
- [Pattern 32: All Tests](/blog/programming/engineering/tdd-patterns/pattern32-all-tests) — TestResult 사용
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 연산 객체

