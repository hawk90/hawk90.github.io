---
title: "Pattern 52: Add Parameter"
date: 2026-05-10T04:00:00
description: "Function signature에 안전하게 parameter 추가 — 기본값으로 점진 이전."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 52
tags: [tdd, beck, add-parameter, refactor]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> Method에 새 parameter 추가. 기본값으로 호환성 유지 + 점진적 이전.

## 동기

기존 method가 추가 정보 필요:

```python
# 현재
def send_email(self, to, body):
    subject = "Notification"   # 항상 고정
    self._send(to, subject, body)

# 필요
def send_email(self, to, body, subject):
    self._send(to, subject, body)
```

호출처가 수십 곳이면 signature 변경 부담. default value로 점진.

### 신호

- 동일 method에 다양한 case 필요.
- configuration 확장.
- 기존 호출처 유지하면서 신규 기능.

### 언제 적용하는가

- 새 기능 추가 — backward compatible.
- 옵션 확장.
- TDD cycle에서 parameter 진화.

### 언제 적용하지 않는가

- parameter 이미 많음 (5+) — parameter object 검토.
- 모드 분기인 boolean flag — [Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument).

## 절차

1. **새 parameter** 추가 — 기본값과 함께.
2. **method 본문**에서 새 parameter 사용.
3. **호출처 점진적** 새 인자 전달.
4. (옵션) 모두 이전 후 기본값 제거.

## 예시 1 — 기본값으로 호환

```python
# Phase 1: 기본값 추가
def calculate_price(self, items, discount_rate=0):
    total = sum(item.price for item in items)
    return total * (1 - discount_rate)

# 기존 호출처는 그대로
price = calc.calculate_price(items)

# 새 호출처
price = calc.calculate_price(items, 0.1)
```

backward compatible + 점진 이전.

## 예시 2 — Keyword arguments (Python)

```python
def send_email(
    self,
    to,
    body,
    subject="Notification",
    cc=None,
    bcc=None,
    priority="normal"
):
    pass

# 필요한 것만
send_email(to="user@example.com", body="Hello", priority="high")
```

호출 사이트 self-documenting.

## 예시 3 — Java overloading

```java
// 기존 시그니처 유지
public double calculatePrice(List<Item> items) {
    return calculatePrice(items, 0);   // 새 메서드에 위임
}

public double calculatePrice(List<Item> items, double discountRate) {
    double total = items.stream().mapToDouble(Item::getPrice).sum();
    return total * (1 - discountRate);
}
```

C#, Java 등 overloading으로 호환.

## 자주 보는 안티패턴

### 1. 중간에 parameter 삽입

```python
def method(a, new_param, b, c):   # ← 기존 호출 깨짐
```
끝에 + 기본값.

### 2. Parameter 폭증

5+ parameter → 호출 사이트 복잡. parameter object.

### 3. Boolean flag parameter

```python
def process(data, urgent=False):
    if urgent: ...
```
[Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument) — 별도 method.

### 4. Mutable default

```python
def method(items=[]):   # 위험!
```
default가 공유 mutable → bug. `None` 사용.

### 5. Default 잘못된 값

default가 invalid → silent 동작 변경.

### 6. 기존 호출 모두 강제 수정

default 없이 추가 → 모든 호출 동시 수정 필요. PR 거대화.

## Modern variants

### Parameter object

```python
@dataclass
class PricingOptions:
    discount_rate: float = 0
    tax_rate: float = 0
    shipping_rate: float = 0

def calculate_price(self, items, options: PricingOptions = None):
    options = options or PricingOptions()
    # ...

# 사용
opts = PricingOptions(discount_rate=0.1, tax_rate=0.1)
price = calc.calculate_price(items, opts)
```

여러 옵션을 한 객체.

### Builder pattern

```python
email = (EmailBuilder("user@x.com", "Hello")
    .with_subject("Important")
    .with_priority("high")
    .build())
```

fluent + 옵셔널 자연.

### Function overload (TS)

```typescript
function send(to: string): void;
function send(to: string, body: string): void;
function send(to: string, body: string, subject: string): void;
function send(to: string, body?: string, subject?: string): void {
    // implementation
}
```

### Optional/Default (Kotlin)

```kotlin
fun calculatePrice(items: List<Item>, discountRate: Double = 0.0): Double = ...
```

### Splat / spread

```python
def method(*args, **kwargs):
    # 가변
```

flexibility는 높지만 signature 모호하다.

### Variadic / OptionsPattern (Rust)

```rust
#[derive(Default)]
struct PricingOptions {
    discount_rate: f64,
    tax_rate: f64,
}

fn calculate_price(items: &[Item], options: PricingOptions) -> f64 { ... }

// 사용
calculate_price(&items, PricingOptions { discount_rate: 0.1, ..Default::default() });
```

## 도구 / IDE

| 도구 | Add Parameter |
| --- | --- |
| IntelliJ "Change Signature" | parameter 추가 자동 |
| Resharper | 같음 |
| 모든 IDE refactor menu | 기본 기능 |

## 성능 고려

parameter 추가 자체는 무관. 너무 많은 parameter는 stack pressure (CPU 등록기 spill). 일반 무시.

## 관련 패턴

- [Pattern 53: Method Parameter to Constructor Parameter](/blog/programming/engineering/tdd-patterns/pattern53-method-parameter-to-constructor-parameter)
- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method)
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method)
- Refactoring [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
- Refactoring [Pattern 43: Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument)
