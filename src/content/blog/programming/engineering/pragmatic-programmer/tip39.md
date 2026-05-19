---
title: "Tip 39: Use Assertions to Prevent the Impossible"
date: 2026-05-11T15:00:00
description: "단정으로 불가능을 막아라 — '절대 일어날 리 없다' = 일어날 때를 위한 단정."
series: "The Pragmatic Programmer"
seriesOrder: 39
tags: [pragmatic-programmer, defensive-programming]
draft: true
---

## 이 팁의 메시지

> **Use Assertions to Prevent the Impossible** — "불가능"이 — 일어났을 때 — 즉시 알 수 있게.

## 핵심 내용

- assert는 — "이건 절대 ..." 가정을 — 코드로.
- 가정이 깨지면 — 즉시 실패.
- 디버그 모드에 — 활성화.
- 운영에서는 — 비활성화 OK(언어에 따라).

## 흔한 자리

```python
def process_age(age):
    assert age >= 0, f"Age cannot be negative: {age}"
    assert age < 200, f"Age unreasonable: {age}"
    # ... 처리 ...

def find(haystack, needle):
    result = ...
    assert result == -1 or haystack[result] == needle
    return result
```

"절대 일어날 리 없는" 자리에 — assert. 일어나면 — **즉시** 보인다.

## assert ≠ 예외 처리

- **예외** — 예상되는 실패(파일 없음·네트워크 끊김).
- **assert** — **버그 발견** 도구.

assert가 — 운영에서 비활성화되어도 — OK. 예외는 — 항상 처리.

## 가정의 명시화

assert는 — 자기 코드의 **가정**을 — 미래 자신에게 — 전달.

> "여기서 이 변수는 — null이 아니어야 한다. 만약 null이면 — 호출자의 잘못."

이게 — 6개월 후의 — 자기에게 보내는 메모.

## 정리

- 불가능 = assert로 — 표시.
- 깨지면 — 즉시 실패.
- 가정의 명시화.
- 예외 처리와 다름.

## 관련 항목

- [Tip 37: Design with Contracts](/blog/programming/engineering/pragmatic-programmer/tip37)
- [Tip 38: Crash Early](/blog/programming/engineering/pragmatic-programmer/tip38)
- [Tip 40: Finish What You Start](/blog/programming/engineering/pragmatic-programmer/tip40)
- [Code Complete Ch 8: Defensive Programming](/blog/programming/engineering/code-complete/ch08-Defensive-Programming)
