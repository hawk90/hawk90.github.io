---
title: "Pattern 42: Collecting Parameter"
date: 2026-05-10T18:00:00
description: "Collect 결과를 parameter로 전달 — xUnit TestResult의 본질."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 42
tags: [tdd, beck, collecting-parameter, builder]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 결과를 담을 collector 객체를 parameter로 전달 → 여러 객체가 협력해 결과 구축. xUnit `TestResult`가 대표.

## 동기

여러 객체 순회하며 결과 수집. 반환값 방식은 매번 복사.

```python
# 반환값 — 매 호출 list 생성
def collect_names(node):
    names = [node.name]
    for child in node.children:
        names.extend(collect_names(child))
    return names
```

**Collecting Parameter**는 결과 컨테이너를 주입:

```python
def collect_names(node, collector):
    collector.append(node.name)
    for child in node.children:
        collect_names(child, collector)
```

### 신호

- 트리/graph 순회 결과 수집 필요.
- 여러 callback에서 같은 결과 누적.
- 반환값이 복잡 구조 (report, log).
- Composite + 결과 모음.

### 언제 적용하는가

- 트리 순회 결과 수집.
- 여러 객체 협력 결과 구축.
- *report/log 생성*.
- test runner 결과 누적.

### 언제 적용하지 않는가

- 단순 값 계산 — 반환값.
- immutability 강조 (mutation 기반).

## 절차

1. **collector class** 정의 — 결과 누적 method.
2. 함수에 collector parameter 추가.
3. 각 호출에서 collector에 add.
4. 호출자는 collector 생성 → 호출 → 결과 추출.

## 예시 1 — xUnit TestResult

```python
class TestResult:
    def __init__(self):
        self.run_count = 0
        self.failures = []

    def test_started(self):
        self.run_count += 1

    def test_failed(self, test, msg):
        self.failures.append((test, msg))

    def summary(self):
        return f"{self.run_count} run, {len(self.failures)} failed"

class TestCase:
    def run(self, result):           # result = collecting parameter
        result.test_started()
        try:
            self.setUp(); self.run_test(); self.tearDown()
        except AssertionError as e:
            result.test_failed(self, str(e))

class TestSuite:
    def run(self, result):
        for test in self.tests:
            test.run(result)         # 같은 result 전달

# 사용
result = TestResult()
suite.run(result)
print(result.summary())
```

xUnit framework의 핵심.

## 예시 2 — StringBuilder

```python
class StringBuilder:
    def __init__(self): self._parts = []
    def append(self, text): self._parts.append(text); return self
    def to_string(self): return "".join(self._parts)

def build_report(nodes, sb):
    sb.append("Report:\n")
    for n in nodes:
        sb.append(f"  - {n.name}\n")
        build_children(n.children, sb)

def build_children(children, sb):
    for c in children:
        sb.append(f"    * {c.name}\n")

sb = StringBuilder()
build_report(roots, sb)
print(sb.to_string())
```

문자열 concat 비효율 해결 + 의도 명시.

## 예시 3 — Visitor + Collecting

```python
class TreeVisitor:
    def __init__(self):
        self.visited = []
        self.total = 0

    def visit(self, node):
        self.visited.append(node.name)
        self.total += node.value
        for c in node.children:
            c.accept(self)

class TreeNode:
    def accept(self, v):
        v.visit(self)

visitor = TreeVisitor()
root.accept(visitor)
# visitor에 결과 누적
```

Visitor + Collecting의 자연 결합.

## 자주 보는 안티패턴

### 1. Collector mutate 전파

caller가 같은 collector 재사용 → 이전 결과 leak. 새 instance.

### 2. Thread-safe 무시

concurrent caller가 동일 collector → race. lock 또는 thread-local.

### 3. Collector가 너무 큼

30개 method → 책임 폭증. 분리.

### 4. 반환값과 혼용

collector + return 모두 → 어디서 결과 받는지 혼란. 하나만.

### 5. Optional collector

`collector or None` → 호출자가 check 반복. Null Object.

### 6. Mutation을 hide

collector 받지만 사실 return new collector → fake 효과. 명확히.

## Modern variants

### Functional fold/reduce

```python
total = reduce(lambda acc, n: acc + n.value, nodes, 0)
```

immutable accumulator.

### Builder pattern

```python
report = ReportBuilder()\
    .add_section("Header", "...")\
    .add_warning("...")\
    .build()
```

fluent collector.

### Output parameter (C/C++ idiom)

```c
void collect(Node* node, int* total) {
    *total += node->value;
    // ...
}
```

C에서는 pointer가 collector.

### Generator/Iterator

```python
def collect_names(node):
    yield node.name
    for c in node.children:
        yield from collect_names(c)

names = list(collect_names(root))
```

lazy + 메모리 효율.

### Reactive streams

```python
Observable.from(nodes).flatMap(traverse).collect(toList())
```

RxJava/RxJS — stream으로 collecting.

### Java Collector

```java
List<String> names = nodes.stream()
    .flatMap(Node::traverse)
    .collect(Collectors.toList());
```

`Collector` interface가 공식 패턴.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Java Stream Collector | 표준 collector |
| Python yield/generator | lazy collection |
| Rust Iterator collect | type-safe |
| Visitor + collector | 트리 순회 |

## 성능 고려

- Mutation 기반 — 매 호출 alloc 없음. 빠름.
- Thread-safe 필요 시 lock 비용.
- 큰 트리 순회는 stack — iterative + collector.

## 관련 패턴

- [Pattern 41: Composite](/blog/programming/engineering/tdd-patterns/pattern41-composite) — 트리 순회
- [Pattern 32: All Tests](/blog/programming/engineering/tdd-patterns/pattern32-all-tests) — TestResult 사용
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 연산 객체
- GoF Visitor pattern
