---
title: "Tip 39: Use Assertions to Prevent the Impossible"
date: 2026-05-11T15:00:00
description: "단정으로 불가능을 막아라. '절대 일어날 리 없다'고 생각하는 조건을 코드로 명시한다."
series: "The Pragmatic Programmer"
seriesOrder: 39
tags: [pragmatic-programmer, defensive-programming]
draft: false
---

## 이 팁의 메시지

> **Tip 39: Use Assertions to Prevent the Impossible.** If it can't happen, use assertions to ensure that it won't.

불가능하다면, assertion으로 일어나지 않게 보장하라.

## "절대 일어날 리 없어"

코드를 짜다 보면 이런 생각이 든다.

- "이 변수는 절대 음수가 될 리 없어."
- "이 리스트는 항상 비어 있지 않아."
- "이 분기는 절대 실행되지 않아."

문제는 "절대"가 언젠가 깨진다는 것이다. 그때 assert가 있으면 즉시 알 수 있다.

## assert의 역할

assert는 "이 조건이 거짓이면 프로그램을 멈춰라"라는 뜻이다.

```python
def process_age(age):
    assert age >= 0, f"Age cannot be negative: {age}"
    assert age < 200, f"Age unreasonable: {age}"
    # ... 처리 ...

def find(haystack, needle):
    result = _internal_search(haystack, needle)
    assert result == -1 or haystack[result] == needle
    return result
```

"절대 일어날 리 없는" 조건에 assert를 넣으면, 일어났을 때 즉시 발견된다.

## assert ≠ 예외 처리

assert와 예외 처리는 다른 목적을 가진다.

| 목적 | 도구 | 예 |
|------|------|-----|
| 예상되는 실패 처리 | 예외 | 파일이 없다, 네트워크가 끊겼다 |
| 버그 발견 | assert | 내 코드의 가정이 깨졌다 |

assert는 운영 환경에서 비활성화해도 괜찮다(언어에 따라). 예외 처리는 항상 활성화되어야 한다.

## 가정의 명시화

assert는 미래의 자신에게 보내는 메모다.

```python
def process(items):
    assert len(items) > 0, "Items must not be empty"
    # 6개월 후 이 코드를 읽을 때:
    # "아, 이 함수는 빈 리스트를 받으면 안 되는구나"
```

주석으로도 쓸 수 있지만, assert는 *실행*된다. 실행되는 문서는 거짓말을 못 한다.

## 언제 쓰는가

다음 상황에서 assert를 쓴다.

- 함수 내부의 불변식
- switch/case의 default 분기 (절대 도달하지 않는다고 가정할 때)
- 알고리즘의 사후 조건 검증
- 자료구조의 일관성 검사

## 정리

- "절대"라고 생각하는 조건에 assert를 쓴다.
- assert가 발동하면 버그가 있다는 뜻이다.
- assert는 예외 처리와 목적이 다르다.
- assert는 미래의 자신에게 보내는 실행 가능한 메모다.

## 다음 장 예고

[Tip 40: Finish What You Start](/blog/programming/engineering/pragmatic-programmer/tip40)에서는 자원 관리를 다룬다. 자원을 할당한 코드가 해제 책임도 진다.

## 관련 항목

- [Tip 37: Design with Contracts](/blog/programming/engineering/pragmatic-programmer/tip37)
- [Tip 38: Crash Early](/blog/programming/engineering/pragmatic-programmer/tip38)
- [Tip 40: Finish What You Start](/blog/programming/engineering/pragmatic-programmer/tip40)
