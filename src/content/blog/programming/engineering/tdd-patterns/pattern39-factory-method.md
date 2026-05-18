---
title: "Pattern 39: Factory Method (in TDD)"
date: 2026-07-02T15:00:00
description: "Constructor 우회 — flexibility·naming. Money.dollar(5) 같은 의도 표현."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 39
tags: [tdd, beck, factory-method, gof]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 생성자 대신 *static factory method*로 *의도 명확* + *유연성*. `Money.dollar(5)` vs `Money(5, "USD")`.

## 동기 (Motivation)

```python
# 무슨 뜻?
money = Money(5, "USD")

# 의도 명확
money = Money.dollar(5)
```

생성자는 *class 이름 + 위치 인자*만 — *의도 약함*. Factory method가 *이름으로 표현*.

### 신호

- 같은 type 다른 *생성 모드* 빈번 (`Money(5, "USD")`, `Money(5, "CHF")`).
- 생성에 *복잡 로직* (조건부, validation).
- *subtype 결정*이 입력에 따라.
- *캐싱/singleton* 필요.

### 언제 적용하는가

- *의미 있는 이름* 필요.
- *subtype 반환*.
- *조건부 생성*.
- *cache / pool*.
- *async 생성*.

### 언제 적용하지 않는가

- 단순 생성 — constructor 충분.
- *Java/C# 관용*이 constructor.

## 절차 (Mechanics)

1. **factory method 작성** — `@classmethod` 또는 *별도 함수*.
2. **명명** — `dollar`, `from_string`, `of`, `create_admin` 등.
3. (옵션) constructor를 *private*화.
4. 호출처 *factory로 교체*.

## 예시 1 — Money

```python
class Money:
    def __init__(self, amount, currency):
        self._amount = amount
        self._currency = currency

    @classmethod
    def dollar(cls, amount):
        return cls(amount, "USD")

    @classmethod
    def franc(cls, amount):
        return cls(amount, "CHF")

    @classmethod
    def won(cls, amount):
        return cls(amount, "KRW")

# 사용
five_dollars = Money.dollar(5)
ten_francs = Money.franc(10)
thousand_won = Money.won(1000)
```

호출 사이트가 *self-documenting*.

## 예시 2 — Subtype 반환

```python
class Connection:
    @classmethod
    def create(cls, url):
        if url.startswith("http://"):
            return HttpConnection(url)
        elif url.startswith("https://"):
            return HttpsConnection(url)
        elif url.startswith("ftp://"):
            return FtpConnection(url)
        raise ValueError(f"Unknown protocol: {url}")

# 호출자는 Connection만 알면 됨
conn = Connection.create("https://api.example.com")
```

caller가 *구체 type 결정 불필요*.

## 예시 3 — From-something 파싱

```python
class Date:
    @classmethod
    def from_string(cls, s):
        year, month, day = map(int, s.split("-"))
        return cls(year, month, day)

    @classmethod
    def from_timestamp(cls, ts):
        dt = datetime.fromtimestamp(ts)
        return cls(dt.year, dt.month, dt.day)

date1 = Date.from_string("2024-01-15")
date2 = Date.from_timestamp(1705276800)
```

각 *입력 형식*마다 명명된 factory.

## 자주 보는 안티패턴

### 1. *Factory + Constructor 공존*
public constructor + factory 모두 → 어느 걸 쓸지 혼란. constructor private화.

### 2. *Factory에 비즈니스 로직*
factory가 *비즈니스 검증, 통계* → 책임 폭증. 분리.

### 3. *Factory 이름 모호*
`create`, `make` — 의미 없음. *무엇을 생성*하는지.

### 4. *Subtype 정보 leak*
caller가 `if isinstance(c, HttpsConnection)` → 다형성 무력. *interface*만 사용.

### 5. *Async factory*
sync에서 async factory 호출 → await 누락. type system 검증.

### 6. *너무 많은 factory*
class에 20개 factory → 보다. *grouping* 또는 *builder*.

## Modern variants

### Java static factory (Effective Java Item 1)

```java
public static Money dollar(BigDecimal amount) {
    return new Money(amount, "USD");
}
```

Bloch *Effective Java* "Consider static factory methods" — 표준.

### Kotlin companion object

```kotlin
class Money private constructor(val amount: BigDecimal, val currency: String) {
    companion object {
        fun dollar(amount: BigDecimal) = Money(amount, "USD")
        fun franc(amount: BigDecimal) = Money(amount, "CHF")
    }
}

val m = Money.dollar(BigDecimal("100"))
```

### Rust associated function

```rust
impl Money {
    pub fn dollar(amount: u64) -> Self { Self { amount, currency: "USD".into() } }
    pub fn franc(amount: u64) -> Self { Self { amount, currency: "CHF".into() } }
}
```

Rust는 *constructor 개념 없음* — *모두 factory*.

### TypeScript

```typescript
class Money {
  private constructor(public amount: number, public currency: string) {}
  static dollar(amount: number) { return new Money(amount, "USD"); }
  static franc(amount: number) { return new Money(amount, "CHF"); }
}
```

### Builder pattern 조합

```python
order = Order.for_user(user)\
    .add_item(item1)\
    .with_discount("SAVE10")\
    .build()
```

factory가 *builder 시작점*.

### Dependency injection

```python
class OrderFactory:
    def __init__(self, db, payment_service):
        self.db = db; self.payment_service = payment_service

    def create_for_user(self, user):
        return Order(user, self.db, self.payment_service)
```

DI container가 factory.

## 네이밍 컨벤션

| 패턴 | 의미 |
| --- | --- |
| `cls.create(...)` | 새 instance |
| `cls.from_X(...)` | X에서 변환 |
| `cls.of(...)` | 값 wrap |
| `cls.get_instance()` | singleton |
| `cls.new_X(...)` | 특정 type |
| `cls.empty()` | 빈 instance |

## 도구 / IDE

| 도구 | Factory 지원 |
| --- | --- |
| IntelliJ | "Replace constructor with factory method" |
| Rider | 같음 |
| Lombok @Builder | builder 자동 |
| Java record + static method | 표준 |

## 성능 고려

factory method *호출 추가* — JIT inline. 무관. *cache/pool*은 *생성 비용 절감*.

## 관련 패턴

- [Pattern 34: Value Object](/blog/programming/engineering/tdd-patterns/pattern34-value-object) — 팩토리로 생성
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 객체 생성
- [Pattern 36: Template Method](/blog/programming/engineering/tdd-patterns/pattern36-template-method) — 생성 위임
- Refactoring [Pattern 48: Replace Constructor with Factory Function](/blog/programming/design/refactoring-catalog/pattern48-replace-constructor-with-factory-function)
- GoF Factory Method, Abstract Factory
