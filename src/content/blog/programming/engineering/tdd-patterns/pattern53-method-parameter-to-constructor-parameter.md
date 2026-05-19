---
title: "Pattern 53: Method Parameter to Constructor Parameter"
date: 2026-05-10T05:00:00
description: "모든 호출에 같은 값 전달 — constructor로 옮기기. DI의 기초. 시리즈 마무리."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 53
tags: [tdd, beck, constructor-parameter, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> Method 호출마다 *같은 값* 전달한다면 *constructor로 옮겨* field 보관. *Dependency Injection*의 기초.

## 동기 (Motivation)

```python
class OrderService:
    def create_order(self, items, database):
        database.save(Order(items))
    def get_order(self, id, database):
        return database.find(id)
    def delete_order(self, id, database):
        database.delete(id)

# 매번 db 전달
service = OrderService()
service.create_order(items, db)
service.get_order(1, db)
```

`database`가 *항상 같은 인스턴스*. constructor로.

```python
class OrderService:
    def __init__(self, database):
        self.db = database

    def create_order(self, items): self.db.save(Order(items))
    def get_order(self, id): return self.db.find(id)
    def delete_order(self, id): self.db.delete(id)

service = OrderService(db)
service.create_order(items)
service.get_order(1)
```

호출이 *간결*해지고 *의존이 명시*.

### 신호

- 같은 *인자가 method마다 반복*.
- 객체 생명주기 동안 *고정된 의존성*.
- *호출 site 복잡*.

### 언제 적용하는가

- *의존성/설정*은 constructor.
- *입력 데이터*는 method parameter.
- *DI* 적용 시.

### 언제 적용하지 않는가

- 호출마다 *다른 값* — method parameter 유지.
- 객체가 *짧은 수명* — 생성 비용.

## 절차 (Mechanics)

1. **constructor에 parameter 추가** — 기본값 옵션.
2. **field 보관**.
3. **method 본문**에서 *field 사용*.
4. *method parameter 제거*.
5. **호출처 수정** — *생성 시 1번 전달*.

## 예시 1 — DB 의존

위 OrderService 참고.

## 예시 2 — 여러 의존성

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

## 예시 3 — 설정 vs 입력

```python
class PriceCalculator:
    def __init__(self, tax_rate, discount_rate):   # 설정 → constructor
        self.tax_rate = tax_rate
        self.discount_rate = discount_rate

    def calculate(self, items):                     # 입력 → method
        subtotal = sum(item.price for item in items)
        after_discount = subtotal * (1 - self.discount_rate)
        return after_discount * (1 + self.tax_rate)

us = PriceCalculator(tax_rate=0.08, discount_rate=0.10)
eu = PriceCalculator(tax_rate=0.20, discount_rate=0.05)

us.calculate(items)
eu.calculate(items)
```

설정별 *인스턴스 생성* + 같은 method.

## 자주 보는 안티패턴

### 1. *모든 것을 constructor로*
호출마다 다른 값까지 constructor → *매번 새 instance*. 의미 없음.

### 2. *Constructor 폭증*
parameter 10개+ → 호출 부담. *parameter object* 또는 *builder*.

### 3. *Singleton 회피 (다시 Singleton)*
DI한다고 한 후 *전역 instance 유지* → 다시 Singleton 안티패턴.

### 4. *Mutable field*
constructor parameter를 *mutate* → 의도 모호. *immutable* 우선.

### 5. *Optional dependency 강제*
모든 dependency를 *required* → test 부담. *None 허용 + NullObject*.

### 6. *생성 cost 무시*
test마다 *비싼 setup* — fixture로 공유.

## Modern variants

### DI framework

```java
@Component
public class OrderService {
    private final Database db;

    @Autowired
    public OrderService(Database db) {
        this.db = db;
    }
}
```

Spring, Guice, Dagger가 *자동 wire*.

### Pytest fixture

```python
@pytest.fixture
def db(): return FakeDatabase()

@pytest.fixture
def order_service(db): return OrderService(db)

def test_create(order_service, db):
    order_service.create_order([Item(100)])
    assert len(db.saved) == 1
```

### Immutable + frozen dataclass

```python
@dataclass(frozen=True)
class PriceCalculator:
    tax_rate: float
    discount_rate: float

    def calculate(self, items): ...
```

설정 불변 보장.

### Builder for multi-dep

```python
service = (OrderServiceBuilder()
    .with_database(db)
    .with_logger(logger)
    .with_metrics(metrics)
    .build())
```

dependency 많을 때.

### Functional approach

```python
def make_order_service(db):
    def create_order(items): db.save(Order(items))
    def get_order(id): return db.find(id)
    return {"create": create_order, "get": get_order}
```

closure가 *constructor* 역할.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ "Move parameter to field" | 자동 |
| Resharper | 같음 |
| DI framework | Spring/Guice/Dagger |
| pytest fixture | DI testing |

## 성능 고려

- *생성 cost* 한 번 — 호출마다 절약.
- *field access* vs *parameter access* — 거의 무관.
- *Constructor injection*은 *test cycle*에서 자주 — fixture caching.

## 관련 패턴

- [Pattern 52: Add Parameter](/blog/programming/engineering/tdd-patterns/pattern52-add-parameter) — parameter 추가
- [Pattern 43: Singleton](/blog/programming/engineering/tdd-patterns/pattern43-singleton) — DI 대안 (비교)
- [Pattern 49: Extract Interface](/blog/programming/engineering/tdd-patterns/pattern49-extract-interface) — DI에 필요
- Refactoring [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)

## 시리즈 마무리

**TDD by Example — Patterns Deep Dive** 시리즈 53개 패턴 모두 살펴봤다.

Kent Beck의 *Test-Driven Development: By Example*에서 소개된 이 패턴들은 *Red-Green-Refactor* 사이클 각 단계의 *도구*다.

| 그룹 | 패턴 번호 | 주제 |
| --- | --- | --- |
| Test 패턴 | 1-20 | 테스트 작성 방법 |
| Green Bar 패턴 | 21-26 | 빠르게 Green으로 |
| xUnit 패턴 | 27-32 | 테스트 프레임워크 구조 |
| 디자인 패턴 | 33-43 | TDD에서 자주 쓰는 GoF |
| 리팩터링 패턴 | 44-53 | 안전한 코드 개선 |

TDD는 단순히 *테스트 먼저 작성*이 아니다 — *설계를 이끄는 피드백 루프*. 이 패턴들이 *내재화*되면 *더 빠르고 안전하고 좋은 코드*를 작성할 수 있다.

**다음 추천 시리즈**:
- [Refactoring Catalog (Fowler 2nd ed)](/blog/programming/design/refactoring-catalog/pattern01-extract-function) — 61개 리팩터링 패턴 (방금 완료)
- *Working Effectively with Legacy Code* (Michael Feathers)
- *Growing Object-Oriented Software Guided by Tests* (Freeman/Pryce)
