---
title: "Tip 93: Find Bugs Once"
date: 2026-05-12T21:00:00
description: "버그는 한 번만 찾는다. 같은 버그가 다시 발생하면 테스트를 추가해서 영원히 잡는다."
series: "The Pragmatic Programmer"
seriesOrder: 93
tags: [pragmatic-programmer, testing, debugging]
draft: false
---

## 이 팁의 메시지

> **Tip 93: Find Bugs Once.** Once a human tester finds a bug, it should be the last time a human tester finds that bug.

인간 테스터가 버그를 발견하면, 그것은 인간 테스터가 그 버그를 발견하는 마지막이어야 한다.

## 버그 재발의 비용

같은 버그를 두 번 찾는 것은 낭비다.

```text
버그 발생
  ↓
수동으로 발견 (시간 소요)
  ↓
수정
  ↓
시간이 지남
  ↓
같은 버그 재발
  ↓
또 수동으로 발견 (시간 낭비)
```

## 회귀 테스트 추가

버그를 수정할 때 테스트도 추가한다.

```python
# 버그 발견: 빈 목록에서 평균 계산 시 ZeroDivisionError

# 1. 먼저 실패하는 테스트 작성
def test_average_empty_list():
    result = calculate_average([])
    assert result == 0  # 또는 예외 발생 확인

# 2. 버그 수정
def calculate_average(numbers):
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)

# 3. 테스트 통과 확인
```

## 버그 수정 워크플로

**1. 버그 재현 확인**


**2. 버그를 재현하는 테스트 작성**


**3. 테스트 실패 확인 (빨간색)**


**4. 버그 수정**


**5. 테스트 통과 확인 (녹색)**


**6. 테스트를 테스트 스위트에 영구 포함**

## 테스트 없이 수정하면

**버그 수정만 했을 때:**

- 당장은 해결됨
- 나중에 리팩토링 시 재발 가능
- 비슷한 코드 변경 시 재발 가능
- 의존성 업데이트 시 재발 가능
- 다른 개발자가 모르고 재발시킴

## 회귀 테스트의 가치

| 테스트 없이 수정 | 테스트와 함께 수정 |
|------------------|-------------------|
| 빠른 수정 | 약간 더 긴 수정 |
| 재발 가능 | 재발 불가 |
| 같은 디버깅 반복 | 한 번만 디버깅 |
| 불안 | 확신 |

## 버그 테스트 작성 팁

**좋은 버그 테스트:**


**1. 버그를 정확히 재현한다**


**2. 버그가 있으면 실패한다**


**3. 수정되면 통과한다**


**4. 다른 테스트와 독립적이다**


**5. 이름이 버그를 설명한다**

```python
# 좋은 테스트 이름
def test_login_fails_when_email_contains_plus_sign():
    ...

def test_cart_total_handles_negative_discount():
    ...

def test_search_returns_empty_for_special_characters():
    ...
```

## 버그 리포트 → 테스트

```text
버그 리포트:
"사용자가 이메일에 + 기호를 넣으면 로그인 실패"

테스트:
def test_login_with_plus_in_email():
    user = create_user(email="john+work@example.com")
    result = login("john+work@example.com", "password")
    assert result.success
```

리포트의 재현 단계가 테스트가 된다.

## 버그 클러스터

한 버그가 발견되면 비슷한 곳을 검사한다.

```text
버그: 이메일에 + 처리 안 됨

검사할 곳:
- 다른 특수 문자는? (-, _, .)
- 이메일 외에 + 쓰는 곳은?
- URL 인코딩은 제대로 되는가?
```

## 정리

- 같은 버그를 두 번 찾는 것은 낭비다.
- 버그 수정 시 반드시 테스트를 추가한다.
- 테스트가 버그 재발을 영원히 막는다.
- 버그 리포트의 재현 단계가 테스트가 된다.
- 한 버그 발견 시 비슷한 버그도 검사한다.
- 회귀 테스트로 확신을 얻는다.

## 다음 장 예고

[Tip 94: Don't Use Manual Procedures](/blog/programming/engineering/pragmatic-programmer/tip94)에서는 수동 절차를 자동화하는 방법을 다룬다.

## 관련 항목

- [Tip 92: Test State Coverage, Not Code Coverage](/blog/programming/engineering/pragmatic-programmer/tip92)
- [Tip 89: Test Early, Test Often, Test Automatically](/blog/programming/engineering/pragmatic-programmer/tip89)
