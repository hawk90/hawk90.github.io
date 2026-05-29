---
title: "Pattern 38: Pluggable Selector"
date: 2026-05-10T14:00:00
description: "Method name을 string으로 — reflection 기반 dispatch. xUnit 러너의 핵심."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 38
tags: [tdd, beck, pluggable-selector, reflection]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 메서드 이름을 문자열로 저장하고 reflection으로 호출. 동적 dispatch — xUnit test runner의 본질.

## 동기

객체마다 다른 메서드를 호출해야 하는 상황:

```python
if type == "add":      return self.test_add()
elif type == "subtract": return self.test_subtract()
elif type == "multiply": return self.test_multiply()
```

분기 폭증.

**Pluggable Selector**는 메서드 이름을 문자열로 저장 + 동적 호출.

### 신호

- *type/name별 method 분기*가 길어짐.
- 새 동작 추가가 모든 switch 수정.
- 동적 등록 필요 (plug-in).
- *test runner / dispatcher* 같은 framework.

### 언제 적용하는가

- 동적 언어 (Python, JS, Ruby).
- plug-in 시스템.
- test runner.
- command dispatcher.

### 언제 적용하지 않는가

- 정적 언어 + type safety 중요.
- 성능 hot path.
- IDE 지원 (자동완성, refactor) 필요.

## 절차

1. **method 이름을 string** field로.
2. **dispatch**가 reflection으로 method 찾고 호출.
3. (안전) whitelist로 허용된 method만.
4. 예외 처리 — 없는 method 시 명확한 에러.

## 예시 1 — xUnit test runner

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
for name in ["test_add", "test_subtract"]:
    MyTest(name).run()
```

`getattr`로 method 동적 lookup. xUnit의 원형.

## 예시 2 — 언어별 syntax

```python
# Python — getattr
method = getattr(obj, name)
method(args)
```

```javascript
// JS — bracket
obj[name](args);
```

```ruby
# Ruby — send
obj.send(name, args)
```

```csharp
// C# — reflection
obj.GetType().GetMethod(name).Invoke(obj, args);
```

```java
// Java — reflection
Method m = obj.getClass().getMethod(name);
m.invoke(obj);
```

## 예시 3 — 안전한 사용 (whitelist)

```python
class SafeCalculator:
    ALLOWED = {"add", "subtract", "multiply", "divide"}

    def __init__(self, operation):
        if operation not in self.ALLOWED:
            raise ValueError(f"Unknown: {operation}")
        self.operation = operation

    def execute(self, a, b):
        method = getattr(self, self.operation)
        return method(a, b)

    def add(self, a, b): return a + b
    def subtract(self, a, b): return a - b
    # ...
```

외부 입력으로 method 호출 시 반드시 whitelist.

## 자주 보는 안티패턴

### 1. 임의 method 호출

사용자 입력으로 `getattr` → 임의 method 실행 (보안). whitelist.

### 2. IDE refactor 깨짐

method 이름 rename 시 string은 자동 변경 안 됨. 검색 필수.

### 3. Typo 런타임 실패

`getattr(self, "tset_add")` → 실행 시점에 *AttributeError*. 사전 검증.

### 4. Type checker 우회

mypy/typescript가 동적 호출 못 잡음 → 보호 약함.

### 5. Strategy 적합한데 selector

Strategy로 type-safe + IDE 지원 가능한데 굳이 selector.

### 6. Reflection 비용

hot path에서 reflection → 느림 (특히 JVM/.NET). cache.

## Modern variants

### Dict dispatch

```python
operations = {
    "add": lambda a, b: a + b,
    "subtract": lambda a, b: a - b,
}

result = operations[name](a, b)
```

dict로 명시적 dispatch. type-safe, IDE-friendly.

### Pattern matching

```python
def execute(op, a, b):
    match op:
        case "add": return a + b
        case "subtract": return a - b
        case _: raise ValueError(op)
```

Python 3.10+ `match`.

### Decorator-based registration

```python
class Dispatcher:
    handlers = {}
    @classmethod
    def register(cls, name):
        def decorator(fn):
            cls.handlers[name] = fn
            return fn
        return decorator

@Dispatcher.register("add")
def add(a, b): return a + b
```

Flask/Django 라우팅 같은 decorator dispatch.

### Enum + match (Rust/Kotlin)

```rust
enum Op { Add, Subtract }
fn execute(op: Op, a: i32, b: i32) -> i32 {
    match op {
        Op::Add => a + b,
        Op::Subtract => a - b,
    }
}
```

exhaustive + type-safe.

### Method resolution by annotation

```python
import inspect
def find_handlers(cls):
    return {n: m for n, m in inspect.getmembers(cls) if hasattr(m, "_handler")}
```

class scan으로 dispatcher 자동.

## Pluggable Selector vs Strategy

| Selector | Strategy |
| --- | --- |
| 메서드 이름 문자열 | 별도 class |
| Reflection | 직접 호출 |
| 타입 안전성 ↓ | ↑ |
| IDE 지원 ↓ | ↑ |
| 간결 | 명시적 |

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Python getattr | reflection |
| JS bracket notation | 동적 access |
| Ruby send | dynamic |
| Java/C# Reflection API | reflection |
| Dispatcher decorator | Flask, Django route |

## 성능 고려

- Reflection은 직접 호출보다 느림.
- JVM/.NET은 method handle로 cache 가능.
- Python `getattr`는 상대적으로 빠름.
- Hot path는 dict dispatch 또는 직접 호출.

## 관련 패턴

- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 객체 교체
- [Pattern 30: Test Method](/blog/programming/engineering/tdd-patterns/pattern30-test-method) — 테스트 method
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 연산 캡슐화
