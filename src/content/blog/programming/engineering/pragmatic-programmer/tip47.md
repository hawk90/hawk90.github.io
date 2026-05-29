---
title: "Tip 47: Avoid Global Data"
date: 2026-05-11T23:00:00
description: "전역 데이터를 피하라. 어디서든 접근, 어디서든 변경 = 어디서든 깨진다."
series: "The Pragmatic Programmer"
seriesOrder: 47
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Tip 47: Avoid Global Data.** It's like adding an invisible extra parameter to every method in your program.

전역 데이터는 프로그램의 모든 메서드에 보이지 않는 추가 파라미터를 더하는 것과 같다.

## 전역 데이터의 문제

전역 데이터는 어디서든 읽고 쓸 수 있다. 편해 보이지만 다음 문제를 일으킨다.

| 문제 | 설명 |
|------|------|
| 숨겨진 의존 | 함수 시그니처에 보이지 않는다 |
| 추적 불가 | 누가, 언제 바꿨는지 모른다 |
| 테스트 격리 실패 | 테스트 간에 상태가 공유된다 |
| 동시성 위험 | 여러 스레드가 동시에 접근한다 |

## 예: 전역 설정

```python
# 전역 설정
config = {}

def init():
    global config
    config["db"] = "production"

def query():
    db = config["db"]  # 누가 언제 바꿨나?
    # ...
```

`query` 함수의 진짜 입력은 `config`다. 그런데 함수 시그니처에는 보이지 않는다. 테스트할 때 `config`를 매번 초기화해야 한다.

## 더 나은 방법

전역 대신 명시적으로 전달한다.

```python
def query(config):
    db = config["db"]
    # ...
```

이제 의존이 시그니처에 드러난다. 테스트에서 원하는 설정을 쉽게 주입할 수 있다.

## 의존성 주입(DI)

객체 지향에서는 생성자나 메서드를 통해 의존을 주입한다.

```python
class QueryService:
    def __init__(self, config):
        self.config = config

    def query(self):
        db = self.config["db"]
        # ...
```

전역을 쓰는 대신 필요한 것을 명시적으로 받는다.

## 정말 전역이 필요한 경우

로깅, 메트릭, 시간 같은 것은 깊은 자리에서 인자로 전달하기 어렵다. 이런 경우에도 가능하면 DI로 해결하고, 안 되면 [Tip 48](/blog/programming/engineering/pragmatic-programmer/tip48)의 API 래핑을 적용한다.

## 정리

- 전역 데이터는 숨겨진 의존이다.
- 누가 언제 바꿨는지 추적할 수 없다.
- 테스트와 동시성에서 문제를 일으킨다.
- 명시적 전달이나 DI로 대체한다.

## 다음 장 예고

[Tip 48: If It's Important Enough to Be Global, Wrap It in an API](/blog/programming/engineering/pragmatic-programmer/tip48)에서는 전역이 정말 필요하다면 최소한 API로 감싸라는 점을 다룬다.

## 관련 항목

- [Tip 41: Act Locally](/blog/programming/engineering/pragmatic-programmer/tip41)
- [Tip 46: Don't Chain Method Calls](/blog/programming/engineering/pragmatic-programmer/tip46)
- [Tip 48: If It's Important Enough to Be Global, Wrap It in an API](/blog/programming/engineering/pragmatic-programmer/tip48)
