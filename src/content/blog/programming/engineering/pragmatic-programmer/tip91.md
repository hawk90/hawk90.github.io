---
title: "Tip 91: Use Saboteurs to Test Your Testing"
date: 2026-05-12T19:00:00
description: "테스트를 테스트하기 위해 사보타주를 사용하라. 버그를 일부러 넣어서 테스트가 잡는지 확인한다."
series: "The Pragmatic Programmer"
seriesOrder: 91
tags: [pragmatic-programmer, testing, mutation-testing]
draft: false
---

## 이 팁의 메시지

> **Tip 91: Use Saboteurs to Test Your Testing.** Introduce bugs on purpose in a separate copy of the source to verify that testing will catch them.

테스트가 버그를 잡는지 검증하기 위해 소스 복사본에 일부러 버그를 넣는다.

## 테스트의 테스트

테스트가 정말 버그를 잡는지 어떻게 아는가?

**가능한 상황:**

- 테스트가 통과하지만 버그가 있다
- 테스트가 항상 통과한다 (아무것도 검증 안 함)
- 테스트가 잘못된 것을 검증한다

테스트가 효과적인지 검증해야 한다.

## 뮤테이션 테스트

코드에 작은 변화(뮤턴트)를 만들고 테스트가 실패하는지 확인한다.

```python
# 원본 코드
def is_adult(age):
    return age >= 18

# 뮤턴트 1: >= 를 > 로 변경
def is_adult(age):
    return age > 18  # 18살이 성인이 아니게 됨

# 뮤턴트 2: >= 를 <= 로 변경
def is_adult(age):
    return age <= 18  # 반대로 됨

# 뮤턴트 3: 18을 19로 변경
def is_adult(age):
    return age >= 19  # 기준이 바뀜
```

테스트가 이 뮤턴트들을 잡아야 한다.

## 뮤테이션 유형

| 뮤테이션 | 원본 | 변경 |
|----------|------|------|
| 경계 변경 | `>=` | `>` |
| 논리 반전 | `and` | `or` |
| 상수 변경 | `18` | `19` |
| 반환값 변경 | `return x` | `return None` |
| 조건 제거 | `if x:` | (조건 삭제) |

## 뮤테이션 테스트 도구

| 언어 | 도구 |
|------|------|
| Python | mutmut, cosmic-ray |
| Java | PIT (pitest) |
| JavaScript | Stryker |
| Ruby | mutant |
| Go | go-mutesting |

```bash
# mutmut 사용 예
mutmut run
mutmut results
```

## 뮤테이션 점수

뮤테이션 점수는 죽인 뮤턴트 수를 전체 뮤턴트 수로 나눈 값이다. 예를 들어 생성된 뮤턴트 100개 중 테스트가 85개를 잡았다면 뮤테이션 점수는 85%다. 점수가 낮으면 테스트가 허술하다.

## 수동 사보타주

도구 없이도 할 수 있다. 수동 테스트 방법:

1. 코드 복사본 만들기
2. 명백한 버그 넣기
3. 테스트 실행
4. 테스트가 실패하는지 확인
5. 실패하면 테스트가 효과적
6. 통과하면 테스트 보강 필요

## 경계 조건 테스트

```python
# 원본
def calculate_discount(price):
    if price >= 10000:
        return price * 0.1
    return 0

# 테스트
def test_discount():
    assert calculate_discount(10000) == 1000  # 경계
    assert calculate_discount(9999) == 0       # 경계 - 1
    assert calculate_discount(10001) == 1000.1 # 경계 + 1
```

경계에서 테스트해야 뮤턴트를 잡는다.

## 살아남은 뮤턴트 분석

뮤턴트가 살아남았을 때 세 가지 원인을 점검한다.

1. **테스트가 부족한가?** 테스트 케이스를 추가한다.
2. **뮤테이션이 의미 없는가?** 동등한 뮤턴트(equivalent mutant)라면 무시해도 된다.
3. **코드가 죽은 코드인가?** 도달 불가능한 코드라면 제거를 고려한다.

## 정리

- 테스트가 버그를 잡는지 검증해야 한다.
- 뮤테이션 테스트로 코드에 버그를 일부러 넣는다.
- 테스트가 뮤턴트를 죽이면 효과적이다.
- 살아남은 뮤턴트는 테스트 보강 신호다.
- 도구를 사용하거나 수동으로 사보타주한다.
- 뮤테이션 점수로 테스트 품질을 측정한다.

## 다음 장 예고

[Tip 92: Test State Coverage, Not Code Coverage](/blog/programming/engineering/pragmatic-programmer/tip92)에서는 코드 커버리지보다 상태 커버리지를 테스트하는 방법을 다룬다.

## 관련 항목

- [Tip 90: Coding Ain't Done 'Til All the Tests Run](/blog/programming/engineering/pragmatic-programmer/tip90)
- [Tip 70: Use Property-Based Tests to Validate Your Assumptions](/blog/programming/engineering/pragmatic-programmer/tip70)
