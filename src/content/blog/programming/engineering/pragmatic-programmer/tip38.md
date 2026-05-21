---
title: "Tip 38: Crash Early"
date: 2026-05-11T14:00:00
description: "일찍 죽어라. 잘못된 상태로 계속 가지 마라. 즉시 멈춰서 원인을 보여라."
series: "The Pragmatic Programmer"
seriesOrder: 38
tags: [pragmatic-programmer, defensive-programming]
draft: false
---

## 이 팁의 메시지

> **Tip 38: Crash Early.** A dead program normally does a lot less damage than a crippled one.

죽은 프로그램은 보통 불구가 된 프로그램보다 피해가 적다.

## 늦은 실패의 함정

잘못된 입력이나 상태가 발생했을 때 프로그램이 바로 멈추지 않으면 어떻게 될까.

1. 잘못된 입력이 들어온다.
2. 프로그램이 계속 실행된다.
3. 잘못된 데이터가 다른 함수로 전달된다.
4. 그 데이터가 또 다른 함수로 전달된다.
5. 한참 후에 이상한 에러가 발생한다.

이때 에러 메시지와 실제 원인의 거리가 멀다. 원인을 찾는 데 시간이 오래 걸린다.

## 일찍 실패의 이점

잘못이 발견되면 즉시 멈추는 게 낫다.

```python
def process(data):
    if not validate(data):
        raise ValueError(f"Invalid data: {data}")  # 즉시 멈춤
    # ... 처리 ...
```

원인 자리에서 멈추면 진단이 즉시 된다. 스택 트레이스가 정확히 문제 지점을 가리킨다.

## "회복"의 함정

다음 패턴은 문제를 숨긴다.

```python
# 위험한 패턴
try:
    process(data)
except:
    data = default_value  # 위장
    process(data)
```

데이터의 잘못을 기본값으로 숨기면 다음에 같은 문제가 생겨도 원인을 모른다. 잘못된 데이터가 왜 들어왔는지 조사할 기회를 놓친다.

## 예외 처리 vs 버그

모든 예외를 잡아서 회복하라는 게 아니다.

| 상황 | 처리 |
|------|------|
| 예상되는 실패 (파일 없음, 네트워크 끊김) | 잡고 처리한다 |
| 버그 (프로그래머의 실수) | 잡지 말고 죽는다 |

버그는 회복 대상이 아니다. 버그는 발견 대상이다. 일찍 죽어야 일찍 발견된다.

## 데이터 무결성

잘못된 상태로 계속 실행하면 데이터가 오염될 수 있다. 데이터베이스에 잘못된 값이 들어가면 나중에 복구하기 어렵다. 차라리 트랜잭션을 롤백하고 멈추는 게 낫다.

## 정리

- 잘못이 발견되면 즉시 멈춘다.
- 회복 시도는 문제를 숨긴다.
- 원인 자리에서 멈추면 진단이 쉽다.
- 버그는 회복하지 말고 발견한다.
- 데이터 무결성을 지킨다.

## 다음 장 예고

[Tip 39: Use Assertions to Prevent the Impossible](/blog/programming/engineering/pragmatic-programmer/tip39)에서는 "절대 일어나지 않는다"고 생각하는 조건을 assert로 명시하는 방법을 다룬다.

## 관련 항목

- [Tip 37: Design with Contracts](/blog/programming/engineering/pragmatic-programmer/tip37)
- [Tip 39: Use Assertions to Prevent the Impossible](/blog/programming/engineering/pragmatic-programmer/tip39)
