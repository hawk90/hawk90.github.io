---
title: "Pattern 33: Command (in TDD)"
date: 2026-05-10T09:00:00
description: "Operation을 object로 — undo·queue·log 가능. TDD에서 의도 명확."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 33
tags: [tdd, beck, command, gof]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 연산을 객체로 캡슐화하여 실행·취소·큐잉·로깅 가능. TDD에서 의도 명확 + 테스트 용이.

## 동기

함수 호출을 객체로 표현하면 다양한 이점:

```python
# 함수 호출 (휘발성)
account.withdraw(100)

# Command 객체
command = WithdrawCommand(account, 100)
command.execute()
command.undo()   # 취소 가능
```

GoF Command 패턴의 TDD 활용. Beck의 Money 예제에서 `Sum`이 연산 객체.

### 신호

- *Undo/Redo* 필요.
- 작업 큐 (지연 실행, batch).
- transaction (모두 success 또는 rollback).
- audit log가 호출 자체.

### 언제 적용하는가

- 상태가 있는 연산 (undo info).
- *queue/scheduling* 필요.
- 복잡한 parameter.
- type-safe invocation.

### 언제 적용하지 않는가

- 단순 순수 함수 호출.
- 상태 없음.
- 함수형 style.

## 절차

1. **Command interface** 정의 (`execute`, 옵션 `undo`).
2. 각 연산을 class로 — constructor가 parameter 저장.
3. execute가 실제 동작.
4. (옵션) undo가 역연산.
5. *queue/history/log* 등 외부 처리.

## 예시 1 — Basic command + undo

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self): pass

class WithdrawCommand(Command):
    def __init__(self, account, amount):
        self.account = account
        self.amount = amount

    def execute(self):
        self.account.withdraw(self.amount)

    def undo(self):
        self.account.deposit(self.amount)

# 테스트
def test_withdraw_command():
    account = Account(balance=500)
    cmd = WithdrawCommand(account, 100)

    cmd.execute()
    assert account.balance == 400

    cmd.undo()
    assert account.balance == 500
```

## 예시 2 — Money Sum (Beck)

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

연산 자체를 객체. `+` 같은 연산자도 first-class.

## 예시 3 — Transaction + history

```python
class TransactionCommand(Command):
    def __init__(self, commands):
        self.commands = commands
        self.executed = []

    def execute(self):
        try:
            for cmd in self.commands:
                cmd.execute()
                self.executed.append(cmd)
        except Exception:
            self.undo()   # 부분 실행 rollback
            raise

    def undo(self):
        for cmd in reversed(self.executed):
            cmd.undo()

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

undo + redo + history.

## 자주 보는 안티패턴

### 1. Undo 정확하지 않음

execute 후 완전한 상태 복원 안 됨 → undo가 부분. 외부 상태도 고려.

### 2. Command가 너무 큼

한 command가 복잡한 알고리즘 전체 → 분해.

### 3. Mutation in execute

command가 자체 상태 변경 → 재실행 불가. 순수 execute.

### 4. 모든 함수를 command로

간단한 호출까지 → boilerplate. 진짜 *undo/queue 필요*한 것만.

### 5. Concurrent execute

같은 command 객체 여러 thread에서 execute → race. immutable 또는 thread-local.

### 6. History 무제한

memory growth → 정기 정리, max history size.

## Modern variants

### Functional command (closure)

```python
def make_withdraw(account, amount):
    def execute(): account.withdraw(amount)
    def undo(): account.deposit(amount)
    return execute, undo

execute, undo = make_withdraw(account, 100)
execute()
undo()
```

class 없이도 같은 효과.

### Redux action + reducer

```javascript
const action = { type: "WITHDRAW", payload: { amount: 100 } };
const newState = reducer(state, action);
```

action이 plain data — 직렬화·로깅 자연.

### CQRS Command

```python
class WithdrawMoneyCommand:
    def __init__(self, account_id, amount):
        self.account_id = account_id
        self.amount = amount

# Handler
class WithdrawMoneyHandler:
    def handle(self, command):
        account = self.repo.find(command.account_id)
        account.withdraw(command.amount)
```

Command 객체 + 별도 handler 분리.

### Event sourcing

```python
# Command → Events
class TransferCommand:
    def __init__(self, from_acc, to_acc, amount): ...

class TransferHandler:
    def handle(self, cmd):
        return [
            Withdrawn(cmd.from_acc, cmd.amount),
            Deposited(cmd.to_acc, cmd.amount),
        ]
```

command가 events 생성. state는 event replay.

### Job queue (Celery, Sidekiq, BullMQ)

```python
@celery.task
def withdraw_task(account_id, amount):
    ...

withdraw_task.delay(123, 100)   # queue로 보냄
```

분산 환경 command queue.

### Saga pattern

여러 service에 걸친 분산 transaction — 각 step이 command + compensation.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Redux/RTK | action + reducer |
| MediatR (.NET) | command handler |
| Celery, Sidekiq, BullMQ | job queue |
| Axon Framework | CQRS/Event sourcing |
| Akka | actor + command |

## 성능 고려

- Command 객체 생성 overhead — 일반 무관.
- queue 처리 latency — 비동기 cost.
- history 메모리 — TTL 설정.
- Event sourcing — replay 비용 (snapshot으로 완화).

## 관련 패턴

- [Pattern 34: Value Object](/blog/programming/engineering/tdd-patterns/pattern34-value-object) — 불변 객체
- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 동작 교체
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 객체 생성
- GoF Command pattern
