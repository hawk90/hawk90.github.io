---
title: "Pattern 46: Migrate Data"
date: 2026-07-02T22:00:00
description: "Data representation 변경 — 양쪽 유지하면서 점진."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 46
tags: [tdd, beck, migrate-data, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 데이터 구조를 변경할 때 새/구 표현을 동시에 유지하며 점진적으로 이전한다.

## 동기 (Motivation)

**데이터 표현을 바꿔야** 하는 상황:

```python
# 현재: amount를 int로 저장
class Money:
    def __init__(self, amount: int):
        self.amount = amount  # cents 단위

# 목표: amount를 Decimal로
class Money:
    def __init__(self, amount: Decimal):
        self.amount = amount  # 정밀한 금액
```

**Big-bang 변경**은 위험하다.

## Migrate Data 전략

### Phase 1: 새 필드 추가

```python
class Money:
    def __init__(self, amount: int):
        self.amount = amount          # 기존
        self._decimal_amount = None   # 새 필드

    @property
    def decimal_amount(self):
        if self._decimal_amount is None:
            return Decimal(self.amount) / 100
        return self._decimal_amount
```

### Phase 2: 새 필드에 쓰기

```python
class Money:
    def __init__(self, amount: int):
        self.amount = amount
        # 새 필드도 함께 설정
        self._decimal_amount = Decimal(amount) / 100

    @classmethod
    def from_decimal(cls, amount: Decimal):
        """새 방식으로 생성"""
        money = cls(int(amount * 100))
        money._decimal_amount = amount
        return money
```

### Phase 3: 읽기를 새 필드로

```python
class Money:
    def get_amount(self):
        # 기존 코드는 여전히 동작
        return self.amount

    def get_decimal_amount(self):
        # 새 코드는 이쪽 사용
        return self._decimal_amount
```

### Phase 4: 호출자 이전

```python
# Before
total = money.get_amount() / 100  # int 연산

# After
total = money.get_decimal_amount()  # Decimal 연산
```

### Phase 5: 기존 필드 제거

```python
class Money:
    def __init__(self, amount: Decimal):
        self.amount = amount  # 이제 Decimal만

    # amount (int) 제거됨
```

## Money 예제의 실제 과정

### 초기: 서브클래스

```python
class Dollar(Money):
    def times(self, multiplier):
        return Dollar(self.amount * multiplier)

class Franc(Money):
    def times(self, multiplier):
        return Franc(self.amount * multiplier)
```

### currency 필드 추가

```python
class Money:
    def __init__(self, amount, currency=None):
        self.amount = amount
        self.currency = currency  # 새 필드

class Dollar(Money):
    def __init__(self, amount):
        super().__init__(amount, "USD")

class Franc(Money):
    def __init__(self, amount):
        super().__init__(amount, "CHF")
```

### times()에서 currency 사용

```python
class Dollar(Money):
    def times(self, multiplier):
        return Money(self.amount * multiplier, self.currency)
        #      ^^^^^                           ^^^^^^^^^^^^^
        # Dollar 대신 Money, currency 사용
```

### 서브클래스 제거

```python
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def times(self, multiplier):
        return Money(self.amount * multiplier, self.currency)

    @classmethod
    def dollar(cls, amount):
        return cls(amount, "USD")

    @classmethod
    def franc(cls, amount):
        return cls(amount, "CHF")

# Dollar, Franc 클래스 삭제
```

## 데이터베이스 마이그레이션 예

### Phase 1: 새 컬럼 추가

```sql
-- 기존 테이블
-- users: id, name, email

-- 새 컬럼 추가
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

```python
class User:
    def __init__(self, id, name, email, phone=None):
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone  # 새 필드 (nullable)
```

### Phase 2: 새 컬럼에 쓰기

```python
def create_user(name, email, phone=None):
    # 새 필드도 저장
    db.execute(
        "INSERT INTO users (name, email, phone) VALUES (?, ?, ?)",
        (name, email, phone)
    )
```

### Phase 3: 새 컬럼 읽기

```python
def get_user(id):
    row = db.query("SELECT id, name, email, phone FROM users WHERE id=?", id)
    return User(row.id, row.name, row.email, row.phone)
```

### Phase 4: 기존 데이터 이전

```sql
-- 백필 (기존 데이터에 기본값)
UPDATE users SET phone = 'N/A' WHERE phone IS NULL;
```

### Phase 5: NOT NULL 제약 추가

```sql
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

## Branch by Abstraction

**대규모 변경**에 적합한 변형:

```python
# 1. 추상화 도입
class DataStore(ABC):
    @abstractmethod
    def save(self, data): pass

    @abstractmethod
    def load(self, id): pass

# 2. 기존 구현
class OldFileStore(DataStore):
    def save(self, data):
        # 파일로 저장

    def load(self, id):
        # 파일에서 로드

# 3. 새 구현
class NewDatabaseStore(DataStore):
    def save(self, data):
        # DB로 저장

    def load(self, id):
        # DB에서 로드

# 4. 점진적 전환
class HybridStore(DataStore):
    def __init__(self):
        self.old = OldFileStore()
        self.new = NewDatabaseStore()
        self.use_new = False  # Feature flag

    def save(self, data):
        self.old.save(data)  # 양쪽에 저장
        self.new.save(data)

    def load(self, id):
        if self.use_new:
            return self.new.load(id)
        return self.old.load(id)
```

## 테스트 전략

```python
def test_old_and_new_equivalent():
    """이전 중에 양쪽 결과가 같은지 검증"""
    money_old = Money(500)  # int
    money_new = Money.from_decimal(Decimal("5.00"))

    assert money_old.decimal_amount == money_new.decimal_amount
    assert money_old.amount == money_new.amount

def test_migration_preserves_behavior():
    """이전 후에도 동작 동일"""
    # 기존 테스트 그대로 통과해야 함
    five = Money.dollar(5)
    assert five.times(2) == Money.dollar(10)
```

## 정리

- **새/구 표현을 동시에 유지**
- **점진적으로 새 표현으로 이전**
- **호출자를 하나씩 변경**
- **기존 표현은 마지막에 제거**
- **테스트가 각 단계 보호**
- **Big-bang 변경 회피**

## 관련 패턴

- [Pattern 44: Reconcile Differences](/blog/programming/engineering/tdd-patterns/pattern44-reconcile-differences) — 코드 통합
- [Pattern 45: Isolate Change](/blog/programming/engineering/tdd-patterns/pattern45-isolate-change) — 변경 격리
- [Pattern 53: Method Parameter to Constructor Parameter](/blog/programming/engineering/tdd-patterns/pattern53-method-parameter-to-constructor-parameter) — 파라미터 이동

