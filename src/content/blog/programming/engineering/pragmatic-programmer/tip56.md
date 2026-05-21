---
title: "Tip 56: Shared State Is Incorrect State"
date: 2026-05-11T08:00:00
description: "공유 상태는 잘못된 상태다. 여러 스레드가 같은 데이터에 접근하면 문제가 생긴다."
series: "The Pragmatic Programmer"
seriesOrder: 56
tags: [pragmatic-programmer, concurrency]
draft: false
---

## 이 팁의 메시지

> **Tip 56: Shared State Is Incorrect State.** Shared state opens a large can of worms.

공유 상태는 벌레 캔을 여는 것이다.

## 공유 상태의 문제

두 스레드가 같은 변수에 접근한다.

```python
balance = 100

def withdraw(amount):
    global balance
    if balance >= amount:
        balance -= amount
        return True
    return False

# 스레드 A: withdraw(80)
# 스레드 B: withdraw(50)
```

두 스레드가 동시에 `balance >= amount`를 확인한다. 둘 다 통과한다. 둘 다 출금한다. 잔액이 -30이 된다.

이것이 **경쟁 상태(race condition)**다.

## 락으로 보호

공유 상태에 접근할 때 락을 건다.

```python
import threading

balance = 100
lock = threading.Lock()

def withdraw(amount):
    global balance
    with lock:
        if balance >= amount:
            balance -= amount
            return True
        return False
```

한 스레드가 락을 잡으면 다른 스레드는 기다린다. 경쟁 상태는 해결됐다.

그러나 새로운 문제가 생긴다.

## 락의 문제

| 문제 | 설명 |
|------|------|
| 성능 저하 | 스레드들이 줄 서서 기다린다 |
| 데드락 | 두 스레드가 서로의 락을 기다린다 |
| 복잡성 | 락 순서, 범위를 관리해야 한다 |
| 우선순위 역전 | 낮은 우선순위 스레드가 락을 잡고 있으면 높은 우선순위가 기다린다 |

락은 문제를 해결하지만 새로운 문제를 가져온다.

## 더 나은 방법: 공유하지 않기

가장 좋은 해결책은 공유 상태 자체를 없애는 것이다.

```python
# 각 스레드가 자신만의 상태를 가진다
class Account:
    def __init__(self, initial_balance):
        self.balance = initial_balance

    def withdraw(self, amount):
        if self.balance >= amount:
            self.balance -= amount
            return True
        return False

# 스레드마다 별도의 Account 인스턴스
thread_a_account = Account(100)
thread_b_account = Account(100)
```

공유가 없으면 경쟁도 없다.

## 불변 데이터

데이터를 변경하지 않으면 공유해도 안전하다.

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Transaction:
    account_id: str
    amount: int
    timestamp: float

# 불변 객체는 여러 스레드에서 안전하게 읽는다
```

`frozen=True`로 객체를 불변으로 만든다. 읽기 전용이므로 락이 필요 없다.

## 메시지 전달

상태를 직접 공유하지 않고 메시지로 전달한다.

```python
import queue

task_queue = queue.Queue()

# 생산자
def producer():
    task_queue.put({"action": "withdraw", "amount": 50})

# 소비자 (단일 스레드)
def consumer():
    while True:
        task = task_queue.get()
        process_task(task)  # 이 스레드만 상태에 접근
```

큐를 통해 작업을 전달한다. 상태에 접근하는 스레드는 하나뿐이다.

## 정리

- 공유 상태는 경쟁 상태를 일으킨다.
- 락은 문제를 해결하지만 새로운 복잡성을 가져온다.
- 가능하면 상태를 공유하지 않는다.
- 불변 데이터는 안전하게 공유할 수 있다.
- 메시지 전달로 상태 접근을 직렬화한다.

## 다음 장 예고

[Tip 57: Random Failures Are Often Concurrency Issues](/blog/programming/engineering/pragmatic-programmer/tip57)에서는 무작위로 발생하는 버그의 원인을 다룬다.

## 관련 항목

- [Tip 55: Analyze Workflow to Improve Concurrency](/blog/programming/engineering/pragmatic-programmer/tip55)
- [Tip 57: Random Failures Are Often Concurrency Issues](/blog/programming/engineering/pragmatic-programmer/tip57)
- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
