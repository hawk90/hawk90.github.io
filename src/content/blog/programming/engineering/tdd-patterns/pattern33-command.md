---
title: "Pattern 33: Command (in TDD)"
date: 2026-07-02T09:00:00
description: "Operation을 object로 — TDD에서의 활용."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 33
tags: [tdd, beck, command, gof]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 연산을 객체로 캡슐화하여 실행, 취소, 큐잉, 로깅을 가능하게 한다.

## 동기 (Motivation)

함수 호출을 **객체로 표현**하면 다양한 이점이 생긴다:

```python
# 함수 호출
account.withdraw(100)

# Command 객체
command = WithdrawCommand(account, 100)
command.execute()
command.undo()  # 취소 가능!
```

TDD에서 Command 패턴은 **의도를 명확히** 하고 **테스트를 쉽게** 만든다.

## Command 패턴 기본

### 인터페이스

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self):
        pass
```

### 구현

```python
class WithdrawCommand(Command):
    def __init__(self, account, amount):
        self.account = account
        self.amount = amount

    def execute(self):
        self.account.withdraw(self.amount)

    def undo(self):
        self.account.deposit(self.amount)
```

## TDD에서의 활용

### Money 예제의 Sum

Beck의 Money 예제에서 `Sum`은 Command와 비슷하다:

```python
class Sum:
    def __init__(self, augend, addend):
        self.augend = augend
        self.addend = addend

    def reduce(self, bank, to):
        amount = (
            self.augend.reduce(bank, to).amount +
            self.addend.reduce(bank, to).amount
        )
        return Money(amount, to)
```

**연산 자체를 객체로** 표현했다.

### 테스트에서의 이점

```python
def test_withdraw_command():
    account = Account(balance=500)
    command = WithdrawCommand(account, 100)

    # 실행 전 상태 확인
    assert account.balance == 500

    # 실행
    command.execute()
    assert account.balance == 400

    # 취소
    command.undo()
    assert account.balance == 500
```

## 다양한 활용

### Undo/Redo

```python
class CommandHistory:
    def __init__(self):
        self.history = []
        self.position = -1

    def execute(self, command):
        command.execute()
        self.position += 1
        self.history = self.history[:self.position]
        self.history.append(command)

    def undo(self):
        if self.position >= 0:
            self.history[self.position].undo()
            self.position -= 1

    def redo(self):
        if self.position < len(self.history) - 1:
            self.position += 1
            self.history[self.position].execute()
```

### 큐잉/지연 실행

```python
class CommandQueue:
    def __init__(self):
        self.queue = []

    def add(self, command):
        self.queue.append(command)

    def execute_all(self):
        for command in self.queue:
            command.execute()
        self.queue.clear()
```

### 트랜잭션

```python
class TransactionCommand(Command):
    def __init__(self, commands):
        self.commands = commands

    def execute(self):
        try:
            for cmd in self.commands:
                cmd.execute()
        except Exception:
            self.undo()
            raise

    def undo(self):
        for cmd in reversed(self.commands):
            cmd.undo()
```

## 함수형 대안

Python에서는 **first-class function**으로도 가능:

```python
# Command 객체 대신
def make_withdraw(account, amount):
    def execute():
        account.withdraw(amount)
    def undo():
        account.deposit(amount)
    return execute, undo

execute, undo = make_withdraw(account, 100)
execute()
undo()
```

### 언제 객체를 쓰나

```text
객체 (Command 패턴):
✓ 상태가 필요할 때 (undo 정보)
✓ 직렬화가 필요할 때
✓ 복잡한 파라미터가 있을 때
✓ 타입 안전성이 중요할 때

함수:
✓ 간단한 연산
✓ 상태가 필요 없을 때
✓ 함수형 스타일 선호
```

## 테스트 시나리오

```python
def test_command_logging():
    commands = []
    account = Account(balance=1000)

    cmd1 = WithdrawCommand(account, 100)
    cmd2 = DepositCommand(account, 50)

    commands.append(cmd1)
    commands.append(cmd2)

    for cmd in commands:
        cmd.execute()

    assert account.balance == 950
    # commands 리스트로 히스토리 추적 가능
```

## 정리

- **연산을 객체로** 캡슐화
- **Undo/Redo** 가능
- **큐잉, 로깅, 직렬화** 가능
- **테스트에서 의도 명확**
- **함수형 대안** 존재 (closure)
- **Money 예제의 Sum**이 대표적

## 관련 패턴

- [Pattern 34: Value Object](/blog/programming/engineering/tdd-patterns/pattern34-value-object) — 불변 객체
- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 동작 교체
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 객체 생성

