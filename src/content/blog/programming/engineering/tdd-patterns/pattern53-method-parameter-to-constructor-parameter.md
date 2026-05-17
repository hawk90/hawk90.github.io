---
title: "Pattern 53: Method Parameter to Constructor Parameter"
date: 2026-07-03T05:00:00
description: "모든 호출에 같은 값 전달 — constructor로 옮기기."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 53
tags: [tdd, beck, constructor-parameter, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 메서드 호출마다 같은 값을 전달한다면 생성자로 옮겨 필드로 보관한다.

## 동기 (Motivation)

**매번 같은 값**을 메서드에 전달하는 상황:

```python
class OrderService:
    def create_order(self, items, database):
        database.save(Order(items))

    def get_order(self, id, database):
        return database.find(id)

    def delete_order(self, id, database):
        database.delete(id)

# 사용 — 매번 db 전달
service = OrderService()
service.create_order(items, db)
service.get_order(1, db)
service.delete_order(1, db)
```

**database**는 **항상 같은 인스턴스**다. 생성자로 옮기자.

## 적용

### Before

```python
class OrderService:
    def create_order(self, items, database):
        database.save(Order(items))

    def get_order(self, id, database):
        return database.find(id)

    def delete_order(self, id, database):
        database.delete(id)

# 매번 전달
service = OrderService()
service.create_order(items, db)
service.get_order(1, db)
```

### After

```python
class OrderService:
    def __init__(self, database):
        self.db = database  # 필드로 보관

    def create_order(self, items):
        self.db.save(Order(items))

    def get_order(self, id):
        return self.db.find(id)

    def delete_order(self, id):
        self.db.delete(id)

# 생성 시 한 번만
service = OrderService(db)
service.create_order(items)
service.get_order(1)
```

## 변환 과정

### Step 1: 생성자 파라미터 추가

```python
class OrderService:
    def __init__(self, database=None):  # 기본값으로 호환성 유지
        self.db = database
```

### Step 2: 메서드에서 필드 사용

```python
def create_order(self, items, database=None):
    db = database or self.db  # 필드 우선
    db.save(Order(items))
```

### Step 3: 호출자 수정

```python
# Before
service = OrderService()
service.create_order(items, db)

# After
service = OrderService(db)
service.create_order(items)
```

### Step 4: 메서드 파라미터 제거

```python
def create_order(self, items):
    self.db.save(Order(items))
```

## Dependency Injection 관점

이 패턴은 **생성자 주입**의 핵심:

```python
class EmailService:
    def __init__(self, smtp_client, template_engine):
        self.smtp = smtp_client
        self.templates = template_engine

    def send_welcome(self, user):
        body = self.templates.render("welcome", user=user)
        self.smtp.send(user.email, "Welcome!", body)

    def send_notification(self, user, message):
        body = self.templates.render("notification", message=message)
        self.smtp.send(user.email, "Notification", body)

# 생성 시 의존성 주입
service = EmailService(SmtpClient(), TemplateEngine())
```

## 테스트에서의 이점

```python
# Before — 매번 fake 전달
def test_create_order():
    service = OrderService()
    fake_db = FakeDatabase()

    service.create_order(items, fake_db)  # 파라미터로

    assert fake_db.saved == [expected_order]

# After — 생성 시 한 번
def test_create_order():
    fake_db = FakeDatabase()
    service = OrderService(fake_db)  # 생성자로

    service.create_order(items)  # 깔끔

    assert fake_db.saved == [expected_order]
```

### pytest fixture 활용

```python
@pytest.fixture
def fake_db():
    return FakeDatabase()

@pytest.fixture
def order_service(fake_db):
    return OrderService(fake_db)

def test_create_order(order_service, fake_db):
    order_service.create_order([Item(100)])

    assert len(fake_db.saved) == 1
```

## 상태 vs 설정

### 생성자로 옮길 것 (설정/의존성)

```python
class ReportGenerator:
    def __init__(self, formatter, exporter):
        # 한 번 설정, 여러 번 사용
        self.formatter = formatter
        self.exporter = exporter

    def generate(self, data):
        # data만 변하고, formatter/exporter는 고정
        formatted = self.formatter.format(data)
        return self.exporter.export(formatted)
```

### 메서드에 남길 것 (입력 데이터)

```python
class Calculator:
    def __init__(self, precision):
        self.precision = precision  # 설정 → 생성자

    def calculate(self, a, b):
        # a, b는 호출마다 다름 → 메서드 파라미터
        return round(a + b, self.precision)
```

## 판단 기준

| 질문 | 생성자 | 메서드 |
|------|--------|--------|
| 모든 호출에 같은 값? | ✓ | |
| 의존성/설정인가? | ✓ | |
| 객체 생명주기 동안 고정? | ✓ | |
| 호출마다 다른 값? | | ✓ |
| 입력 데이터인가? | | ✓ |

## 여러 생성자 버전

```python
class OrderService:
    def __init__(self, database, logger=None, metrics=None):
        self.db = database
        self.logger = logger or NullLogger()
        self.metrics = metrics or NullMetrics()

# 기본 사용
service = OrderService(db)

# 로깅 추가
service = OrderService(db, logger=FileLogger())

# 모든 옵션
service = OrderService(db, logger=FileLogger(), metrics=Prometheus())
```

## 불변 객체 고려

```python
@dataclass(frozen=True)
class PriceCalculator:
    """설정이 불변인 계산기"""
    tax_rate: float
    discount_rate: float

    def calculate(self, items):
        subtotal = sum(item.price for item in items)
        after_discount = subtotal * (1 - self.discount_rate)
        return after_discount * (1 + self.tax_rate)

# 설정별로 인스턴스 생성
us_calculator = PriceCalculator(tax_rate=0.08, discount_rate=0.1)
eu_calculator = PriceCalculator(tax_rate=0.2, discount_rate=0.05)
```

## 정리

- **반복 파라미터 → 필드**
- **생성자 주입의 기초**
- **Dependency Injection** 패턴
- **테스트 간소화**
- **설정 vs 입력** 구분
- **시그니처 단순화**

## 관련 패턴

- [Pattern 52: Add Parameter](/blog/programming/engineering/tdd-patterns/pattern52-add-parameter) — 파라미터 추가
- [Pattern 43: Singleton](/blog/programming/engineering/tdd-patterns/pattern43-singleton) — DI 대안
- [Pattern 49: Extract Interface](/blog/programming/engineering/tdd-patterns/pattern49-extract-interface) — 의존성 추상화

## 시리즈 마무리

이것으로 **TDD by Example — Patterns Deep Dive** 시리즈의 53개 패턴을 모두 살펴보았다.

Kent Beck의 **Test-Driven Development: By Example**에서 소개된 이 패턴들은 TDD의 **Red-Green-Refactor** 사이클에서 각각의 역할을 한다:

- **테스트 패턴** (Pattern 1-20): 테스트를 어떻게 작성할 것인가
- **Green Bar 패턴** (Pattern 21-26): 어떻게 빠르게 Green으로 갈 것인가
- **xUnit 패턴** (Pattern 27-32): 테스트 프레임워크 구조
- **디자인 패턴** (Pattern 33-43): TDD에서 자주 쓰이는 설계 패턴
- **리팩터링 패턴** (Pattern 44-53): 안전하게 코드를 개선하는 방법

TDD는 단순히 테스트를 먼저 작성하는 것이 아니다. **설계를 이끄는 피드백 루프**다. 이 패턴들을 내재화하면 더 빠르고, 더 안전하게, 더 좋은 코드를 작성할 수 있다.

