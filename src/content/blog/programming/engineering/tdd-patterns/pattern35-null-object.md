---
title: "Pattern 35: Null Object"
date: 2026-07-02T11:00:00
description: "Null check 없애기 — 동일 인터페이스의 do-nothing 객체."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 35
tags: [tdd, beck, null-object, gof]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> null 대신 동일 인터페이스의 아무것도 하지 않는 객체를 반환하여 조건문을 제거한다.

## 동기 (Motivation)

null 체크가 코드 곳곳에 퍼진다:

```python
# null 체크 지옥
def process(user):
    if user is not None:
        if user.account is not None:
            if user.account.balance is not None:
                return user.account.balance
    return 0
```

**Null Object**는 null 대신 **"아무것도 하지 않는" 객체**를 사용한다.

## Null Object 패턴

### Before (null 체크)

```python
class Logger:
    def log(self, message):
        print(message)

def process(data, logger=None):
    if logger is not None:
        logger.log("Processing started")

    result = transform(data)

    if logger is not None:
        logger.log("Processing completed")

    return result
```

### After (Null Object)

```python
class Logger:
    def log(self, message):
        print(message)

class NullLogger:
    def log(self, message):
        pass  # 아무것도 안 함

def process(data, logger=None):
    if logger is None:
        logger = NullLogger()  # Null Object 사용

    logger.log("Processing started")
    result = transform(data)
    logger.log("Processing completed")
    return result
```

## 실제 예시

### 컬렉션의 Null Object

```python
# 빈 리스트는 Null Object
def get_users():
    users = fetch_from_db()
    return users if users else []  # None 대신 빈 리스트

# 사용처에서 null 체크 불필요
for user in get_users():
    print(user.name)
```

### Strategy의 Default

```python
class NoDiscount:
    def apply(self, price):
        return price  # 할인 없음

class PercentDiscount:
    def __init__(self, percent):
        self.percent = percent

    def apply(self, price):
        return price * (1 - self.percent / 100)

class Order:
    def __init__(self, discount=None):
        self.discount = discount or NoDiscount()  # Null Object

    def total(self):
        return self.discount.apply(self.subtotal)
```

### 이벤트 핸들러

```python
class NullEventHandler:
    def on_start(self): pass
    def on_complete(self): pass
    def on_error(self, error): pass

class LoggingEventHandler:
    def on_start(self):
        print("Started")

    def on_complete(self):
        print("Completed")

    def on_error(self, error):
        print(f"Error: {error}")

class Processor:
    def __init__(self, handler=None):
        self.handler = handler or NullEventHandler()

    def process(self):
        self.handler.on_start()
        try:
            # 처리 로직
            self.handler.on_complete()
        except Exception as e:
            self.handler.on_error(e)
```

## 테스트에서의 활용

```python
def test_process_without_logger():
    # logger 없이 테스트 — NullLogger 사용
    result = process(data)  # logger=None
    assert result == expected

def test_process_with_logger():
    logger = FakeLogger()  # 테스트용 로거
    result = process(data, logger)

    assert "Processing started" in logger.messages
    assert "Processing completed" in logger.messages
```

## Null Object vs Optional

```python
# Optional/Maybe (함수형)
from typing import Optional

def find_user(id) -> Optional[User]:
    return db.find(id)  # User 또는 None

# Null Object (객체지향)
class NullUser:
    name = "Guest"
    is_authenticated = False

def find_user(id) -> User:
    user = db.find(id)
    return user if user else NullUser()
```

| 접근 | 장점 | 단점 |
|------|------|------|
| Optional | 타입으로 명시, 강제 처리 | 매번 unwrap 필요 |
| Null Object | 조건문 제거, 다형성 | 숨겨진 동작 가능성 |

## 주의사항

### 언제 적합한가

```text
✓ 기본 동작이 "아무것도 안 함"일 때
✓ 인터페이스가 명확할 때
✓ 조건문이 반복될 때
✓ 테스트에서 의존성 제거할 때

✗ 기본 동작이 에러여야 할 때
✗ null이 "데이터 없음"을 의미할 때
✗ 명시적 처리가 필요할 때
```

## 정리

- **null 대신 do-nothing 객체**
- **조건문 제거** — polymorphism 활용
- **동일 인터페이스** 유지
- **테스트에서 유용** — 의존성 제거
- **빈 컬렉션**도 Null Object
- **Strategy의 default**로 자주 사용

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 테스트 대역
- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 동작 교체
- [Pattern 34: Value Object](/blog/programming/engineering/tdd-patterns/pattern34-value-object) — 값 객체

