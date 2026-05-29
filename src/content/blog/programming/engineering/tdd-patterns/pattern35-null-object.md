---
title: "Pattern 35: Null Object"
date: 2026-05-10T11:00:00
description: "Null check 없애기 — 동일 인터페이스의 do-nothing 객체."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 35
tags: [tdd, beck, null-object, gof]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> null 대신 동일 인터페이스의 do-nothing 객체. 조건문 제거 + 다형성 활용.

## 동기

null check가 코드 곳곳:

```python
# null 체크 지옥
def process(user):
    if user is not None:
        if user.account is not None:
            if user.account.balance is not None:
                return user.account.balance
    return 0
```

**Null Object**는 null 대신 아무것도 하지 않는 객체.

### 신호

- `if x is not None` 반복.
- `obj?.method()?.field?.value` 옵셔널 체인.
- 기본 동작이 no-op.
- Strategy default.

### 언제 적용하는가

- 기본 동작이 no-op 가능.
- 인터페이스 명확.
- 조건문이 여러 곳에 반복.
- test에서 dependency 제거.

### 언제 적용하지 않는가

- 기본이 에러여야 함.
- null이 진짜 "데이터 없음" (호출자가 알아야).
- 명시적 처리 필요.

## 절차

1. **공통 interface** 식별.
2. **Null Object class** 작성 — 같은 interface, 본문은 no-op 또는 기본값.
3. **factory가 적절한 instance** 반환 (정상 또는 Null).
4. 호출처에서 null check 제거.

## 예시 1 — NullLogger

```python
class Logger:
    def log(self, message):
        print(message)

class NullLogger:
    def log(self, message):
        pass   # no-op

def process(data, logger=None):
    if logger is None:
        logger = NullLogger()
    logger.log("Processing started")
    result = transform(data)
    logger.log("Processing completed")
    return result
```

`logger` 호출 언제나 안전하다.

## 예시 2 — Strategy default

```python
class NoDiscount:
    def apply(self, price):
        return price

class PercentDiscount:
    def __init__(self, percent):
        self.percent = percent
    def apply(self, price):
        return price * (1 - self.percent / 100)

class Order:
    def __init__(self, discount=None):
        self.discount = discount or NoDiscount()   # Null Object
    def total(self):
        return self.discount.apply(self.subtotal)
```

discount 없음 = `NoDiscount` (할인 0).

## 예시 3 — Event handler

```python
class NullEventHandler:
    def on_start(self): pass
    def on_complete(self): pass
    def on_error(self, error): pass

class LoggingEventHandler:
    def on_start(self): print("Started")
    def on_complete(self): print("Completed")
    def on_error(self, error): print(f"Error: {error}")

class Processor:
    def __init__(self, handler=None):
        self.handler = handler or NullEventHandler()
    def process(self):
        self.handler.on_start()
        try:
            # ...
            self.handler.on_complete()
        except Exception as e:
            self.handler.on_error(e)
```

핸들러 없어도 동일 코드.

## 자주 보는 안티패턴

### 1. Null Object에 side effect

```python
class NullLogger:
    def log(self, msg):
        send_metric("log_called")   # ← side effect
```
진짜 no-op만.

### 2. Method 누락

production class에 method 추가하면서 Null Object에 안 추가 → NPE/AttributeError. abstract base class로 강제.

### 3. Null Object check

```python
if isinstance(logger, NullLogger):
    skip()
```
다형성 효과 사라짐. 진짜 equally treat.

### 4. Mutable Null Object

NullObject가 상태 가짐 + setter → 의미 모호. immutable singleton.

### 5. Singleton 강제

NullObject가 singleton instance인 척 → multiple Null type 필요할 때 부담.

### 6. 너무 많은 Null Object

모든 dependency에 NullObject → boilerplate. 진짜 no-op 의미인 case만.

## Modern variants

### Optional / Maybe

```python
from typing import Optional

def find_user(id) -> Optional[User]:
    return db.find(id)   # None 가능

# 사용
name = (user.name if user else "Guest")
```

언어 차원 옵셔널 타입.

### Kotlin elvis

```kotlin
val name = customer?.name ?: "Guest"
```

`?:` 연산자.

### TypeScript `??`

```typescript
const name = customer?.name ?? "Guest";
```

### Rust enum

```rust
enum UserLookup {
    Known(User),
    Anonymous,
}

impl UserLookup {
    fn name(&self) -> &str {
        match self {
            UserLookup::Known(u) => &u.name,
            UserLookup::Anonymous => "Guest",
        }
    }
}
```

exhaustive enum.

### React default props

```jsx
function Avatar({ user = anonymousUser }) {
  return <img src={user.avatar} />;
}
```

default value가 Null Object.

### Default dict (Python)

```python
from collections import defaultdict
d = defaultdict(int)   # 없는 key는 0 — Null Object 효과
d["unknown"] += 1
```

### Optional chaining (JS/TS)

```javascript
const name = customer?.address?.city ?? "Unknown";
```

언어 차원의 null-safe chaining.

## Null Object vs Optional

| 접근 | 장점 | 단점 |
| --- | --- | --- |
| Optional/Maybe | 타입 명시, 강제 처리 | 매번 unwrap |
| Null Object | 조건문 제거, 다형성 | 숨겨진 동작 가능성 |

함수형은 Optional, OO는 Null Object 선호.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Java Optional | `Optional.empty()` |
| Kotlin null safety | `?:` |
| TypeScript `??` | nullish coalescing |
| Rust Option | `match` exhaustive |
| collections.defaultdict | dict null object |

## 성능 고려

no-op method 호출은 JIT이 dead code 제거. 거의 비용 0. singleton 활용으로 allocation 없다.

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 테스트 대역
- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 동작 교체
- [Pattern 34: Value Object](/blog/programming/engineering/tdd-patterns/pattern34-value-object) — 값 객체
- GoF Null Object pattern
- Refactoring [Pattern 39: Introduce Special Case](/blog/programming/design/refactoring-catalog/pattern39-introduce-special-case)
