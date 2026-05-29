---
title: "Tip 61: Don't Program by Coincidence"
date: 2026-05-11T13:00:00
description: "우연에 의존해 프로그래밍하지 마라. 왜 동작하는지 이해하고, 의도적으로 코드를 작성한다."
series: "The Pragmatic Programmer"
seriesOrder: 61
tags: [pragmatic-programmer, mindset, debugging]
draft: true
---

## 이 팁의 메시지

> **Tip 61: Don't Program by Coincidence.** Rely only on reliable things. Beware of accidental complexity, and don't confuse a happy coincidence with a purposeful plan.

신뢰할 수 있는 것에만 의존하라. 우연의 일치를 의도적인 계획으로 착각하지 않는다.

## 우연에 의존하는 프로그래밍

코드가 동작한다. 왜 동작하는지 모르지만 동작한다. 건드리지 말자.

```python
# 왜 되는지 모르지만 동작한다
def process(data):
    result = data[::-1]  # 뒤집기?
    result = result.upper()  # 대문자?
    result = result[::-1]  # 다시 뒤집기?
    return result

# 테스트 통과
assert process("hello") == "HELLO"
```

테스트가 통과한다. 그러나 왜 동작하는지 모른다. 이것이 우연에 의존하는 프로그래밍이다.

## 왜 위험한가

우연에 의존하면 다음 문제가 생긴다.

| 문제 | 설명 |
|------|------|
| 취약성 | 환경이 조금만 바뀌어도 깨진다 |
| 유지보수 어려움 | 왜 동작하는지 몰라서 고칠 수 없다 |
| 확장 불가 | 다른 케이스에 적용할 수 없다 |
| 디버깅 어려움 | 문제가 생기면 어디서부터 봐야 할지 모른다 |

## 우연의 예

**실행 순서에 의존**

```python
# 초기화 순서에 우연히 의존
def setup():
    init_database()  # 먼저 호출되어야 함
    init_cache()     # 여기서 database 사용

# 순서가 바뀌면 실패
```

문서화되지 않은 순서에 의존한다. 나중에 누군가 순서를 바꾸면 버그가 생긴다.

**테스트 데이터에 의존**

```python
def test_sort():
    data = [3, 1, 2]
    result = my_sort(data)
    assert result == [1, 2, 3]

# 우연히 입력이 작아서 통과
# 큰 데이터에서는 실패할 수 있다
```

작은 테스트 데이터에서만 동작한다. 실제 데이터에서 실패한다.

**플랫폼에 의존**

```python
path = "data/file.txt"  # 유닉스 경로
# 윈도우에서는 실패

# 의도적으로 작성
import os
path = os.path.join("data", "file.txt")
```

개발 환경에서만 동작하고 운영 환경에서 실패한다.

## 의도적으로 프로그래밍하기

우연 대신 의도로 코드를 작성한다.

**1. 왜 동작하는지 이해한다**

```python
# 의도적: 문자열을 대문자로 변환
def process(data):
    return data.upper()
```

단순하고 명확하다. 왜 동작하는지 안다.

**2. 가정을 문서화한다**

```python
def calculate_discount(price: float, customer_type: str) -> float:
    """
    가정:
    - price는 양수
    - customer_type은 "regular" 또는 "premium"
    """
    assert price > 0
    assert customer_type in ("regular", "premium")
    # ...
```

**3. 의존성을 명시한다**

```python
# 암묵적 의존 (나쁨)
def get_user():
    return current_request.user

# 명시적 의존 (좋음)
def get_user(request):
    return request.user
```

## 코드 고고학 피하기

레거시 코드를 만났을 때 "왜 이렇게 했지?"라고 궁금해진다. 이유를 찾지 못하면 우연이었을 가능성이 높다.

```python
# 원래 코드
result = data[::-1][::-1]  # 왜 두 번 뒤집나?

# 아마도 우연: 한 번 뒤집고 실패해서 다시 뒤집었을 것
# 의도적 수정
result = data  # 그냥 그대로 쓴다
```

## 정리

- 코드가 왜 동작하는지 이해한다.
- 우연의 일치에 의존하지 않는다.
- 가정을 문서화하고 검증한다.
- 의존성을 명시적으로 표현한다.
- "동작하니까 건드리지 말자"는 위험하다.

## 다음 장 예고

[Tip 62: Estimate the Order of Your Algorithms](/blog/programming/engineering/pragmatic-programmer/tip62)에서는 알고리즘의 복잡도를 추정하는 방법을 다룬다.

## 관련 항목

- [Tip 60: Listen to Your Lizard Brain](/blog/programming/engineering/pragmatic-programmer/tip60)
- [Tip 34: Don't Assume—Prove It](/blog/programming/engineering/pragmatic-programmer/tip34)
