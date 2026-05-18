---
title: "Pattern 46: Migrate Data"
date: 2026-07-02T22:00:00
description: "Data representation 변경 — 양쪽 유지하며 점진적 이전. Expand-Migrate-Contract."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 46
tags: [tdd, beck, migrate-data, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 데이터 구조 변경 시 *새/구 표현 동시 유지* + *점진적 이전*. Expand → Migrate → Contract.

## 동기 (Motivation)

데이터 표현 변경 — *Big-bang 변경 위험*:

```python
# 현재: amount as int (cents)
class Money:
    def __init__(self, amount: int): self.amount = amount

# 목표: amount as Decimal
class Money:
    def __init__(self, amount: Decimal): self.amount = amount
```

호출처가 *수십 곳*이면 모두 동시 변경 *어려움*. **Migrate Data**는 *3단계*: expand → migrate → contract.

### 신호

- *데이터 구조 변경* 필요.
- 호출처가 *많음*.
- *zero-downtime* deploy 필요.
- DB schema migration 동반.

### 언제 적용하는가

- *internal 표현* 변경.
- *DB column* 변경.
- *API contract* 진화.
- 호출처 *점진적 이전*.

## 절차 (Mechanics) — Expand/Migrate/Contract

1. **Expand**: 새 표현 *추가* (기존 유지).
2. **Migrate**: 양쪽 *동시 유지* — write는 양쪽, read는 새 우선.
3. **호출처 점진적 이전**.
4. **Contract**: 기존 표현 *제거*.
5. 각 단계 *테스트 green*.

## 예시 1 — Money int → Decimal

### Phase 1: Expand

```python
class Money:
    def __init__(self, amount: int):
        self.amount = amount             # 기존
        self._decimal_amount = None      # 새 필드

    @property
    def decimal_amount(self):
        if self._decimal_amount is None:
            return Decimal(self.amount) / 100
        return self._decimal_amount
```

### Phase 2: Migrate (양쪽 유지)

```python
class Money:
    def __init__(self, amount: int):
        self.amount = amount
        self._decimal_amount = Decimal(amount) / 100   # 새도 설정

    @classmethod
    def from_decimal(cls, amount: Decimal):
        money = cls(int(amount * 100))
        money._decimal_amount = amount
        return money
```

### Phase 3: 호출처 이전

```python
# Before
total = money.amount / 100   # int

# After
total = money.decimal_amount  # Decimal
```

호출처 *한 곳씩* 변경.

### Phase 4: Contract

모든 호출처가 *new 사용*하면 *old 제거*.

```python
class Money:
    def __init__(self, amount: Decimal):
        self.amount = amount   # 이제 Decimal만
```

## 예시 2 — DB column 변경

### Phase 1: 새 column 추가

```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

### Phase 2: 양쪽 write

```python
def create_user(name, email, phone=None):
    db.execute(
        "INSERT INTO users (name, email, phone) VALUES (?, ?, ?)",
        (name, email, phone)
    )
```

### Phase 3: Backfill

```sql
UPDATE users SET phone = 'N/A' WHERE phone IS NULL;
```

### Phase 4: 읽기 마이그레이션

```python
def get_user(id):
    row = db.query("SELECT id, name, email, phone FROM users WHERE id=?", id)
    return User(row.id, row.name, row.email, row.phone)
```

### Phase 5: Constraint

```sql
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

## 예시 3 — Branch by abstraction

대규모 변경 시 *추상화 도입*:

```python
class DataStore(ABC):
    @abstractmethod
    def save(self, data): pass

class OldFileStore(DataStore): ...
class NewDatabaseStore(DataStore): ...

class HybridStore(DataStore):
    def __init__(self):
        self.old = OldFileStore()
        self.new = NewDatabaseStore()
        self.use_new = feature_flag("new_store")

    def save(self, data):
        self.old.save(data)
        self.new.save(data)   # dual write

    def load(self, id):
        if self.use_new:
            return self.new.load(id)
        return self.old.load(id)
```

flag로 *점진적 cutover*.

## 자주 보는 안티패턴

### 1. *Phase 잡 시 stuck*
expand 후 *영원히 양쪽 유지* → cleanup 안 됨. 명확한 *deadline*.

### 2. *Inconsistency*
old write 잊고 new만 → 데이터 분기. dual-write 보장.

### 3. *Read inconsistency*
일부 caller는 old, 일부는 new → *서로 다른 값*. 단일 source.

### 4. *Backfill 누락*
새 column 추가 후 backfill 안 함 → NULL 가득. 검증.

### 5. *Test 한 표현만*
old만 test → new 동작 모름. 양쪽 검증.

### 6. *Schema migration 비가역*
ALTER TABLE 직접 → rollback 어려움. *expand 가능한 변경*만 single deploy.

## Modern variants

### Database migration tool

| 도구 | |
| --- | --- |
| Flyway | Java |
| Alembic | Python |
| Liquibase | XML/YAML |
| Prisma migrate | TS |
| sqitch | Perl |

자동화 + version 관리.

### Schema evolution (Avro, Protobuf)

backward/forward compatibility 강제.

### Event sourcing

```text
Events log이 source of truth → 새 projection 추가 = 새 표현
```

migration이 *event replay*.

### CQRS

read/write 분리 → read model을 *점진적 갱신*.

### Dual-write + reconciliation

write를 *양쪽*에 + 주기적 *consistency 검증*.

### Strangler Fig (Fowler)

old + new system 공존 → 점진적 strangle.

### Feature flag

```python
if flag("new_data_model"):
    save_new(data)
else:
    save_old(data)
```

### Shadow mode

new system을 *production 데이터로 실행*하지만 *결과 사용 안 함* — 검증 단계.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Flyway, Alembic, Liquibase | DB migration |
| Datadog, New Relic | dual-write 모니터 |
| LaunchDarkly | feature flag |
| GitHub Scientist | parallel 비교 |

## 성능 고려

- *Dual-write*는 *2배 write*. throughput 영향.
- *Schema migration on large table*: lock 시간. *online DDL* (pt-online-schema-change, gh-ost).
- *Read from new* 점진적 cutover로 부담 감소.

## 관련 패턴

- [Pattern 44: Reconcile Differences](/blog/programming/engineering/tdd-patterns/pattern44-reconcile-differences) — 코드 통합
- [Pattern 45: Isolate Change](/blog/programming/engineering/tdd-patterns/pattern45-isolate-change) — 변경 격리
- [Pattern 53: Method Parameter to Constructor Parameter](/blog/programming/engineering/tdd-patterns/pattern53-method-parameter-to-constructor-parameter)
- Refactoring [Pattern 31: Rename Field](/blog/programming/design/refactoring-catalog/pattern31-rename-field)
