---
title: "Tip 64: Refactor Early, Refactor Often"
date: 2026-05-11T16:00:00
description: "일찍, 자주 리팩터링하라. 코드를 깨끗하게 유지하는 것은 지속적인 과정이다."
series: "The Pragmatic Programmer"
seriesOrder: 64
tags: [pragmatic-programmer, refactoring, design]
draft: true
---

## 이 팁의 메시지

> **Tip 64: Refactor Early, Refactor Often.** Rewrite, rework, and re-architect code when it needs it. Fix the root of the problem.

필요할 때 코드를 다시 쓰고, 다시 작업하고, 다시 설계하라. 문제의 근본을 고친다.

## 리팩터링이란

리팩터링은 외부 동작을 바꾸지 않고 내부 구조를 개선하는 것이다.

```python
# 리팩터링 전
def calc(a, b, t):
    if t == 1:
        return a + b
    elif t == 2:
        return a - b
    elif t == 3:
        return a * b

# 리팩터링 후
def calculate(left: float, right: float, operation: str) -> float:
    operations = {
        "add": lambda a, b: a + b,
        "subtract": lambda a, b: a - b,
        "multiply": lambda a, b: a * b,
    }
    return operations[operation](left, right)
```

동작은 같지만 이름이 명확하고 확장하기 쉬워졌다.

## 언제 리팩터링하는가

리팩터링이 필요한 신호가 있다.

| 신호 | 설명 |
|------|------|
| 중복 | 같은 코드가 여러 곳에 있다 |
| 긴 함수 | 한 화면에 안 들어온다 |
| 복잡한 조건 | if-else가 깊게 중첩된다 |
| 이름 불일치 | 변수/함수 이름이 역할을 설명하지 않는다 |
| 변경 어려움 | 한 곳을 고치면 여러 곳이 깨진다 |

## 작게, 자주

큰 리팩터링보다 작은 리팩터링을 자주 한다.

```python
# 1단계: 이름 개선
def get_data():  # get_user_profile()로 변경
    ...

# 2단계: 추출
def get_user_profile():
    user = fetch_user()
    profile = format_profile(user)  # 추출
    return profile

# 3단계: 단순화
def format_profile(user):
    return {
        "name": user.name,
        "email": user.email,
    }
```

한 번에 하나씩 작은 개선을 한다. 각 단계에서 테스트가 통과하는지 확인한다.

## 테스트가 안전망

리팩터링 전에 테스트가 있어야 한다.

```python
def test_calculate():
    assert calculate(2, 3, "add") == 5
    assert calculate(5, 3, "subtract") == 2
    assert calculate(4, 3, "multiply") == 12
```

테스트가 통과하면 내부 구조를 자유롭게 바꿀 수 있다. 테스트가 실패하면 뭔가 잘못된 것이다.

## 리팩터링 vs 기능 추가

둘을 섞지 않는다.

1. **리팩터링 커밋**: 구조만 바꾸고 동작은 그대로
2. **기능 추가 커밋**: 새 기능 구현

한 커밋에 리팩터링과 기능 추가를 섞으면 문제가 생겼을 때 원인을 찾기 어렵다.

## 기술 부채

리팩터링을 미루면 기술 부채가 쌓인다.

"이번에는 시간이 없어서"라고 미루면 다음에도 시간이 없다. 코드가 점점 복잡해지고, 변경 비용이 기하급수적으로 증가하고, 결국 "전면 재작성"이 유일한 선택이 된다. 정기적인 리팩터링이 기술 부채를 막는다.

## 마틴 파울러의 조언

마틴 파울러는 "세 번 규칙"을 제안한다.

1. 처음 할 때는 그냥 한다.
2. 두 번째 비슷한 걸 할 때는 중복을 참는다.
3. 세 번째 비슷한 걸 할 때는 리팩터링한다.

```python
# 첫 번째: 그냥 작성
# 두 번째: 비슷한 코드 추가
# 세 번째: 공통 부분 추출

def send_email(to, subject, body):
    # 공통 로직
    ...

def send_welcome_email(user):
    send_email(user.email, "환영합니다", welcome_template(user))

def send_order_confirmation(user, order):
    send_email(user.email, "주문 확인", order_template(order))
```

## 정리

- 외부 동작은 유지하고 내부 구조를 개선한다.
- 작게, 자주 리팩터링한다.
- 테스트가 안전망이다.
- 리팩터링과 기능 추가를 분리한다.
- 기술 부채가 쌓이기 전에 정리한다.

## 다음 장 예고

[Tip 65: Testing Is Not About Finding Bugs](/blog/programming/engineering/pragmatic-programmer/tip65)에서는 테스트의 진짜 목적을 다룬다.

## 관련 항목

- [Tip 63: Test Your Estimates](/blog/programming/engineering/pragmatic-programmer/tip63)
- [Tip 65: Testing Is Not About Finding Bugs](/blog/programming/engineering/pragmatic-programmer/tip65)
