---
title: "Pattern 41: Composite (in TDD)"
date: 2026-07-02T17:00:00
description: "Single·collection 같은 interface — 재귀 처리. xUnit Test/TestSuite의 원형."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 41
tags: [tdd, beck, composite, gof]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 단일 객체와 객체 컬렉션을 *동일 interface*로. *재귀 처리*. xUnit `Test`/`TestSuite`의 원형.

## 동기 (Motivation)

단일과 집합을 *다르게 처리*하면:

```python
if isinstance(test, TestSuite):
    for t in test.tests: t.run()
else:
    test.run()
```

호출 사이트 *복잡*. **Composite**는 *같은 interface*로 다룬다.

### 신호

- *트리 구조* (file system, UI, AST).
- *단일 vs 집합 분기* 반복.
- *재귀 알고리즘*이 자연.
- xUnit suite 구조.

### 언제 적용하는가

- *트리 데이터* — file, org chart, UI.
- *재귀 처리* 도메인.
- *uniform treatment*.

### 언제 적용하지 않는가

- 단순 list — Composite overhead 과잉.
- Leaf와 Composite *동작 크게 다름*.
- 깊이 제한 시스템.

## 절차 (Mechanics)

1. **Component interface** 정의.
2. **Leaf class** 구현.
3. **Composite class** 구현 — children + 재귀 호출.
4. 호출자가 *interface*로만 사용.

## 예시 1 — xUnit Test/TestSuite

```python
from abc import ABC, abstractmethod

class Test(ABC):
    @abstractmethod
    def run(self, result) -> None: pass
    @abstractmethod
    def count_test_cases(self) -> int: pass

class TestCase(Test):                  # Leaf
    def run(self, result):
        result.test_started()
        try:
            self.setUp(); self.run_test(); self.tearDown()
        except Exception:
            result.test_failed()
    def count_test_cases(self): return 1

class TestSuite(Test):                 # Composite
    def __init__(self): self.tests = []
    def add(self, t): self.tests.append(t)
    def run(self, result):
        for t in self.tests:
            t.run(result)              # 재귀
    def count_test_cases(self):
        return sum(t.count_test_cases() for t in self.tests)
```

xUnit의 *핵심 구조*. 중첩 가능.

## 예시 2 — Money Sum (Beck)

```python
class Expression(ABC):
    @abstractmethod
    def reduce(self, bank, to): pass

class Money(Expression):                # Leaf
    def reduce(self, bank, to):
        rate = bank.rate(self.currency, to)
        return Money(self.amount / rate, to)

class Sum(Expression):                  # Composite
    def reduce(self, bank, to):
        a = self.augend.reduce(bank, to).amount
        b = self.addend.reduce(bank, to).amount
        return Money(a + b, to)

# 중첩
expr = Sum(Sum(Money(5, "USD"), Money(10, "CHF")), Money(3, "USD"))
result = expr.reduce(bank, "USD")   # 모두 동일 interface
```

## 예시 3 — File system

```python
class Node(ABC):
    @abstractmethod
    def size(self) -> int: pass

class File(Node):                       # Leaf
    def __init__(self, name, size): self._size = size
    def size(self): return self._size

class Directory(Node):                  # Composite
    def __init__(self): self._children = []
    def add(self, n): self._children.append(n)
    def size(self):
        return sum(c.size() for c in self._children)
```

총 크기 = *재귀 합*.

## 자주 보는 안티패턴

### 1. *Leaf에 Composite 메서드*
Component에 `add()` 두면 Leaf에서도 `add()` → meaningless 또는 error.

### 2. *깊이 무제한*
재귀가 *깊으면 stack overflow*. iterative 또는 depth limit.

### 3. *Cycle 방치*
composite가 *자신 포함* → 무한 루프. cycle 검출.

### 4. *Parent reference 누락*
Leaf가 *parent 모름* → 일부 알고리즘 불가. parent pointer.

### 5. *Mixed concerns*
Component에 *너무 많은 메서드* → 모든 Leaf/Composite가 구현. *interface segregation*.

### 6. *Type cast 빈번*
caller가 `isinstance(node, Directory)` → 다형성 효과 잃음. *Component method*로 표현.

## Modern variants

### Functional composite (tree walking)

```python
def walk(node, fn):
    if isinstance(node, File):
        return fn(node)
    return [walk(c, fn) for c in node.children]
```

함수형으로 *visitor 분리*.

### Visitor pattern 조합

```python
class Visitor(ABC):
    @abstractmethod
    def visit_file(self, f): pass
    @abstractmethod
    def visit_directory(self, d): pass

class SizeVisitor(Visitor):
    def visit_file(self, f): return f.size
    def visit_directory(self, d):
        return sum(c.accept(self) for c in d.children)
```

새 연산 추가가 *visitor 추가*.

### AST 트리 (compiler)

```python
class Node(ABC): pass
class Literal(Node): ...
class BinaryOp(Node):
    def __init__(self, op, left, right): ...
```

언어 처리는 *Composite의 전형*.

### React component tree

```jsx
<App>
  <Header />
  <Sidebar>
    <Menu />
  </Sidebar>
  <Main />
</App>
```

UI 컴포넌트 = Composite.

### XML/DOM

```javascript
document.querySelectorAll(...)   // 재귀 traversal
element.children.forEach(...)
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| antlr | AST 자동 생성 |
| AST library | parser tree |
| GoF Composite | 표준 |

## 성능 고려

- *재귀 깊이*는 stack 비용. 매우 깊으면 *iterative*.
- *Composite 순회*는 O(n) (n = 노드 수).
- *cache* (size 등) 자주.

## 관련 패턴

- [Pattern 42: Collecting Parameter](/blog/programming/engineering/tdd-patterns/pattern42-collecting-parameter) — 순회 결과 수집
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — Sum이 둘 다
- [Pattern 34: Value Object](/blog/programming/engineering/tdd-patterns/pattern34-value-object) — Leaf로 자주
- GoF Composite, Visitor
