---
title: "Pattern 38: Pluggable Selector"
date: 2026-07-02T14:00:00
description: "Method name을 string으로 — reflection 기반 dispatch."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 38
tags: [tdd, beck, pluggable-selector, reflection]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 메서드 이름을 문자열로 저장하고 reflection으로 호출하여 동적 dispatch를 구현한다.

## 동기 (Motivation)

객체마다 **다른 메서드를 호출**해야 하는 상황:

```python
# 각 타입마다 다른 메서드
if type == "add":
    return self.test_add()
elif type == "subtract":
    return self.test_subtract()
elif type == "multiply":
    return self.test_multiply()
```

**Pluggable Selector**는 메서드 이름을 **문자열로 저장**하고 **동적으로 호출**한다.

## Pluggable Selector 패턴

### 기본 구현

```python
class TestCase:
    def __init__(self, name):
        self.name = name  # 메서드 이름을 저장

    def run(self):
        method = getattr(self, self.name)  # reflection
        method()

# 사용
test = TestCase("test_add")
test.run()  # self.test_add() 호출
```

### xUnit의 실제 구현

```python
class TestCase:
    def __init__(self, method_name):
        self.method_name = method_name

    def run(self):
        self.setUp()
        method = getattr(self, self.method_name)
        method()
        self.tearDown()

class MyTest(TestCase):
    def test_add(self):
        assert 1 + 1 == 2

    def test_subtract(self):
        assert 3 - 1 == 2

# 실행
suite = [
    MyTest("test_add"),
    MyTest("test_subtract")
]
for test in suite:
    test.run()
```

## 언어별 구현

### Python (getattr)

```python
class Calculator:
    def __init__(self, operation):
        self.operation = operation

    def execute(self, a, b):
        method = getattr(self, self.operation)
        return method(a, b)

    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b

calc = Calculator("add")
result = calc.execute(3, 2)  # 5
```

### JavaScript (bracket notation)

```javascript
class Calculator {
    constructor(operation) {
        this.operation = operation;
    }

    execute(a, b) {
        return this[this.operation](a, b);
    }

    add(a, b) { return a + b; }
    subtract(a, b) { return a - b; }
}

const calc = new Calculator("add");
calc.execute(3, 2);  // 5
```

### Ruby (send)

```ruby
class Calculator
    def initialize(operation)
        @operation = operation
    end

    def execute(a, b)
        send(@operation, a, b)
    end

    def add(a, b)
        a + b
    end
end

calc = Calculator.new(:add)
calc.execute(3, 2)  # 5
```

## 언제 사용하나

### 적합한 경우

```text
✓ Smalltalk, Ruby, Python (동적 언어)
✓ 테스트 프레임워크
✓ 플러그인 시스템
✓ 명령 디스패처
✓ 설정 기반 동작 선택
```

### 부적합한 경우

```text
✗ Java, C++ (정적 언어, 타입 안전성 중요)
✗ 성능이 중요한 경우
✗ IDE 지원이 중요한 경우 (리팩터링, 자동완성)
✗ 컴파일 타임 체크가 필요한 경우
```

## Trade-off

| 장점 | 단점 |
|------|------|
| 간결한 코드 | 타입 안전성 없음 |
| 동적 확장성 | IDE 지원 부족 |
| 설정으로 동작 변경 | 런타임 에러 가능 |
| 적은 클래스 수 | 디버깅 어려움 |

## Strategy vs Pluggable Selector

```python
# Strategy: 여러 클래스
class AddStrategy:
    def execute(self, a, b):
        return a + b

class SubtractStrategy:
    def execute(self, a, b):
        return a - b

calc = Calculator(AddStrategy())

# Pluggable Selector: 하나의 클래스, 문자열
calc = Calculator("add")
```

**Strategy**는 타입 안전하고, **Pluggable Selector**는 간결하다.

## 안전한 사용

### 화이트리스트

```python
class SafeCalculator:
    ALLOWED_OPERATIONS = {"add", "subtract", "multiply"}

    def __init__(self, operation):
        if operation not in self.ALLOWED_OPERATIONS:
            raise ValueError(f"Unknown operation: {operation}")
        self.operation = operation

    def execute(self, a, b):
        method = getattr(self, self.operation)
        return method(a, b)
```

### 예외 처리

```python
def execute(self, a, b):
    method = getattr(self, self.operation, None)
    if method is None:
        raise AttributeError(f"No method: {self.operation}")
    return method(a, b)
```

## 테스트

```python
def test_pluggable_selector():
    calc = Calculator("add")
    assert calc.execute(3, 2) == 5

    calc = Calculator("subtract")
    assert calc.execute(3, 2) == 1

def test_invalid_operation():
    with pytest.raises(ValueError):
        Calculator("invalid")
```

## 정리

- **메서드 이름을 문자열로** 저장
- **Reflection으로 동적 호출**
- **동적 언어**에서 자연스러움
- **xUnit 테스트 러너**의 핵심
- **타입 안전성 trade-off** 있음
- **Strategy보다 간결**, 덜 안전

## 관련 패턴

- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 객체 교체
- [Pattern 30: Test Method](/blog/programming/engineering/tdd-patterns/pattern30-test-method) — 테스트 메서드 구조
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 연산 캡슐화

