---
title: "Pattern 39: Factory Method (in TDD)"
date: 2026-07-02T15:00:00
description: "Constructor 우회 — flexibility·naming."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 39
tags: [tdd, beck, factory-method, gof]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 생성자 대신 정적 팩토리 메서드를 사용하여 의도를 명확히 하고 유연성을 확보한다.

## 동기 (Motivation)

생성자만으로는 **의도가 불명확**할 때가 있다:

```python
# 무슨 뜻인지 불명확
money = Money(5, "USD")
money = Money(5, "CHF")

# 의도가 명확
money = Money.dollar(5)
money = Money.franc(5)
```

**Factory Method**는 **의도를 드러내는 이름**을 제공한다.

## Factory Method 예시

### Money 예제

```python
class Money:
    def __init__(self, amount, currency):
        self._amount = amount
        self._currency = currency

    @classmethod
    def dollar(cls, amount):
        """달러 생성"""
        return cls(amount, "USD")

    @classmethod
    def franc(cls, amount):
        """프랑 생성"""
        return cls(amount, "CHF")

    @classmethod
    def won(cls, amount):
        """원화 생성"""
        return cls(amount, "KRW")
```

### 사용

```python
five_dollars = Money.dollar(5)
ten_francs = Money.franc(10)
thousand_won = Money.won(1000)
```

## Factory Method의 이점

### 1. 의도 명확

```python
# 생성자 — 파라미터 의미 추측 필요
user = User("Alice", True, False)

# Factory Method — 의도 명확
user = User.create_admin("Alice")
user = User.create_guest("Alice")
user = User.create_regular("Alice")
```

### 2. 서브타입 반환

```python
class Money:
    @classmethod
    def dollar(cls, amount):
        return Dollar(amount)  # 서브클래스 반환

    @classmethod
    def franc(cls, amount):
        return Franc(amount)  # 서브클래스 반환
```

### 3. 조건부 생성

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
        else:
            raise ValueError(f"Unknown protocol: {url}")
```

### 4. 캐싱/싱글턴

```python
class Database:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

# 항상 같은 인스턴스
db1 = Database.get_instance()
db2 = Database.get_instance()
assert db1 is db2
```

## 테스트에서의 활용

### Before

```python
def test_five_dollar_times_two():
    five = Money(5, "USD")  # 타입 노출
    result = five.times(2)
    assert result == Money(10, "USD")
```

### After

```python
def test_five_dollar_times_two():
    five = Money.dollar(5)  # 의도 명확
    result = five.times(2)
    assert result == Money.dollar(10)
```

## 다양한 예시

### 테스트 데이터

```python
class User:
    @classmethod
    def create_test_user(cls, name="Test"):
        """테스트용 사용자 생성"""
        return cls(
            name=name,
            email=f"{name.lower()}@test.com",
            is_active=True
        )

    @classmethod
    def create_inactive_user(cls, name):
        """비활성 사용자 생성"""
        user = cls(name=name, email=f"{name}@test.com")
        user.is_active = False
        return user
```

### 빌더 시작점

```python
class Order:
    @classmethod
    def for_user(cls, user):
        """사용자 주문 시작"""
        return OrderBuilder(user)

# 사용
order = Order.for_user(user)\
    .add_item(item1)\
    .add_item(item2)\
    .with_discount("SAVE10")\
    .build()
```

### 파싱

```python
class Date:
    @classmethod
    def from_string(cls, s):
        """문자열에서 생성"""
        year, month, day = map(int, s.split("-"))
        return cls(year, month, day)

    @classmethod
    def from_timestamp(cls, ts):
        """타임스탬프에서 생성"""
        dt = datetime.fromtimestamp(ts)
        return cls(dt.year, dt.month, dt.day)

date1 = Date.from_string("2024-01-15")
date2 = Date.from_timestamp(1705276800)
```

## 네이밍 컨벤션

```python
# 일반적인 패턴
cls.create(...)       # 새 인스턴스
cls.from_X(...)       # X에서 변환
cls.of(...)           # 값 래핑
cls.get_instance()    # 싱글턴
cls.new_X(...)        # 특정 타입

# 예시
Money.dollar(5)
Date.from_string("2024-01-15")
Optional.of(value)
Database.get_instance()
User.new_admin("Alice")
```

## 정리

- **생성자 대신 정적 메서드**
- **의도를 명확히** 표현
- **서브타입 반환** 가능
- **조건부 생성** 가능
- **캐싱/싱글턴** 구현 용이
- **Money 예제**의 핵심 기법

## 관련 패턴

- [Pattern 34: Value Object](/blog/programming/engineering/tdd-patterns/pattern34-value-object) — 팩토리로 생성
- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 객체 생성
- [Pattern 36: Template Method](/blog/programming/engineering/tdd-patterns/pattern36-template-method) — 생성 위임

