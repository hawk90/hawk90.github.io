---
title: "Tip 52: Prefer Interfaces to Express Polymorphism"
date: 2026-05-11T04:00:00
description: "다형성은 인터페이스로 표현하라. 추상 클래스보다 인터페이스가 더 가볍고 유연하다."
series: "The Pragmatic Programmer"
seriesOrder: 52
tags: [pragmatic-programmer, oop]
draft: false
---

## 이 팁의 메시지

> **Tip 52: Prefer Interfaces to Express Polymorphism.** Interfaces make polymorphism explicit without the baggage of inheritance.

다형성을 표현할 때 인터페이스를 선호하라. 상속의 짐 없이 다형성을 명시적으로 만든다.

## 다형성의 본질

다형성은 "여러 형태가 같은 인터페이스로 동작한다"는 것이다. 핵심은 *형태가 여럿*이라는 점이지, *하나의 부모를 공유*한다는 점이 아니다.

```python
from typing import Protocol

class Logger(Protocol):
    def log(self, msg: str) -> None: ...

class ConsoleLogger:
    def log(self, msg: str):
        print(msg)

class FileLogger:
    def log(self, msg: str):
        with open("app.log", "a") as f:
            f.write(msg + "\n")

def use_logger(logger: Logger):
    logger.log("Hello")
```

`ConsoleLogger`와 `FileLogger`는 공통 부모가 없다. 그러나 둘 다 `Logger` 인터페이스를 만족하므로 `use_logger`에서 쓸 수 있다.

## 인터페이스 vs 추상 클래스

| 특성 | 인터페이스 | 추상 클래스 |
|------|-----------|------------|
| 내용 | 계약(시그니처)만 | 계약 + 일부 구현 |
| 다중 구현 | 여러 인터페이스 구현 가능 | 보통 단일 상속 |
| 결합도 | 낮다 | 상속 사슬로 높아진다 |
| 테스트 | 모킹 쉽다 | 부모 의존성까지 모킹해야 한다 |

## 인터페이스의 장점

**다중 구현이 자유롭다.** 한 클래스가 여러 인터페이스를 구현할 수 있다.

```python
class JsonSerializer(Protocol):
    def to_json(self) -> str: ...

class XmlSerializer(Protocol):
    def to_xml(self) -> str: ...

class Report:
    def to_json(self) -> str:
        return '{"report": ...}'

    def to_xml(self) -> str:
        return '<report>...</report>'
```

`Report`는 `JsonSerializer`이자 `XmlSerializer`다. 상속으로는 이런 유연성을 얻기 어렵다.

**테스트가 쉽다.** 인터페이스만 만족하면 되므로 테스트용 가짜 객체를 쉽게 만든다.

```python
class MockLogger:
    def __init__(self):
        self.logs = []

    def log(self, msg: str):
        self.logs.append(msg)

# 테스트에서 MockLogger를 주입한다
```

## 추상 클래스가 적합한 경우

추상 클래스가 유용한 경우도 있다.

- **공유 구현**: 여러 자식이 동일한 로직을 공유해야 할 때
- **템플릿 메서드 패턴**: 알고리즘의 뼈대는 부모가, 세부 단계는 자식이 구현할 때

```python
from abc import ABC, abstractmethod

class DataProcessor(ABC):
    def process(self):
        data = self.read()       # 뼈대
        result = self.transform(data)
        self.write(result)

    @abstractmethod
    def read(self): ...

    @abstractmethod
    def transform(self, data): ...

    @abstractmethod
    def write(self, result): ...
```

이 경우 `process` 메서드의 로직을 공유하는 것이 목적이므로 추상 클래스가 맞다. 그러나 단순히 다형성만 원한다면 인터페이스로 충분하다.

## 정리

- 다형성은 인터페이스로 표현한다.
- 인터페이스는 계약만 정의하므로 가볍다.
- 다중 구현이 자유롭고 테스트가 쉽다.
- 공유 구현이 필요할 때만 추상 클래스를 쓴다.
- 상속 사슬 없이 다형성을 얻는다.

## 다음 장 예고

[Tip 53: Delegate to Services: Has-A Trumps Is-A](/blog/programming/engineering/pragmatic-programmer/tip53)에서는 합성이 상속보다 나은 이유를 다룬다.

## 관련 항목

- [Tip 51: Don't Pay Inheritance Tax](/blog/programming/engineering/pragmatic-programmer/tip51)
- [Tip 53: Delegate to Services: Has-A Trumps Is-A](/blog/programming/engineering/pragmatic-programmer/tip53)
