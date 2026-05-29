---
title: "Tip 58: Use Actors For Concurrency Without Shared State"
date: 2026-05-11T10:00:00
description: "액터로 공유 상태 없이 동시성을 구현하라. 메시지 전달로 안전하게 병렬 처리한다."
series: "The Pragmatic Programmer"
seriesOrder: 58
tags: [pragmatic-programmer, concurrency, actors]
draft: true
---

## 이 팁의 메시지

> **Tip 58: Use Actors For Concurrency Without Shared State.** Actors are independent processes that communicate via messages.

액터는 메시지로 통신하는 독립 프로세스다.

## 액터 모델

액터(Actor)는 다음 특성을 가진다.

- **자신만의 상태**: 다른 액터와 상태를 공유하지 않는다.
- **메시지 큐**: 다른 액터로부터 메시지를 받는 큐가 있다.
- **순차 처리**: 메시지를 한 번에 하나씩 처리한다.
- **비동기 전송**: 메시지를 보내고 기다리지 않는다.

공유 상태가 없으므로 락이 필요 없다. 메시지만 주고받는다.

## 예: 계좌 액터

```python
class AccountActor:
    def __init__(self, balance):
        self.balance = balance
        self.mailbox = queue.Queue()

    def run(self):
        while True:
            message = self.mailbox.get()
            self.handle(message)

    def handle(self, message):
        if message["action"] == "withdraw":
            amount = message["amount"]
            if self.balance >= amount:
                self.balance -= amount
                message["reply_to"].put({"success": True})
            else:
                message["reply_to"].put({"success": False})

        elif message["action"] == "deposit":
            self.balance += message["amount"]

        elif message["action"] == "balance":
            message["reply_to"].put({"balance": self.balance})
```

액터는 메시지를 순차적으로 처리한다. 한 번에 하나의 출금 요청만 처리하므로 경쟁 상태가 없다.

## 메시지 전송

```python
# 출금 요청
reply_queue = queue.Queue()
account.mailbox.put({
    "action": "withdraw",
    "amount": 50,
    "reply_to": reply_queue
})

# 응답 대기
result = reply_queue.get()
if result["success"]:
    print("출금 성공")
```

메시지를 보내고 응답을 기다린다. 직접 상태에 접근하지 않는다.

## 액터 시스템의 장점

| 장점 | 설명 |
|------|------|
| 락 없음 | 상태를 공유하지 않으므로 락이 필요 없다 |
| 확장성 | 액터를 여러 머신에 분산할 수 있다 |
| 격리 | 한 액터의 실패가 다른 액터에 영향을 주지 않는다 |
| 모델링 | 현실 세계의 독립 개체를 자연스럽게 표현한다 |

## 실전 구현

여러 언어에서 액터 모델을 지원한다.

- **Erlang/Elixir**: 액터 모델이 언어에 내장되어 있다
- **Akka (Java/Scala)**: JVM 위의 액터 프레임워크
- **Python**: `pykka`, `ray` 등의 라이브러리
- **Go**: 채널과 고루틴으로 유사하게 구현

```python
# Ray 예시
import ray

@ray.remote
class AccountActor:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amount):
        if self.balance >= amount:
            self.balance -= amount
            return True
        return False

account = AccountActor.remote(100)
result = ray.get(account.withdraw.remote(50))
```

## 주의점

액터 모델에도 주의할 점이 있다.

- **데드락 가능**: 액터 A가 B의 응답을 기다리고, B가 A의 응답을 기다리면 데드락
- **순서 보장 없음**: 메시지가 도착하는 순서가 보낸 순서와 다를 수 있다
- **메시지 손실**: 네트워크 분산 시 메시지가 유실될 수 있다
- **디버깅**: 비동기 흐름은 추적이 어렵다

## 정리

- 액터는 자신만의 상태를 가지고 메시지로 통신한다.
- 공유 상태가 없으므로 락이 필요 없다.
- 메시지를 순차 처리하므로 경쟁 상태가 없다.
- Erlang, Akka, Ray 등의 프레임워크를 활용한다.
- 데드락, 순서, 메시지 손실에 주의한다.

## 다음 장 예고

[Tip 59: Use Blackboards to Coordinate Workflow](/blog/programming/engineering/pragmatic-programmer/tip59)에서는 블랙보드 패턴으로 협업을 조율하는 방법을 다룬다.

## 관련 항목

- [Tip 56: Shared State Is Incorrect State](/blog/programming/engineering/pragmatic-programmer/tip56)
- [Tip 57: Random Failures Are Often Concurrency Issues](/blog/programming/engineering/pragmatic-programmer/tip57)
- [Tip 59: Use Blackboards to Coordinate Workflow](/blog/programming/engineering/pragmatic-programmer/tip59)
