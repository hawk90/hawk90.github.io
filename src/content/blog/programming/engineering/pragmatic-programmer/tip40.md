---
title: "Tip 40: Finish What You Start"
date: 2026-05-11T16:00:00
description: "시작한 것을 끝내라. 자원을 할당한 함수가 해제 책임도 진다."
series: "The Pragmatic Programmer"
seriesOrder: 40
tags: [pragmatic-programmer, resource-management]
draft: true
---

## 이 팁의 메시지

> **Tip 40: Finish What You Start.** Where possible, the routine or object that allocates a resource should be responsible for deallocating it.

가능하면 자원을 할당한 루틴이나 객체가 해제 책임도 진다.

## 자원의 시작과 끝

파일을 열면 닫아야 한다. 소켓을 열면 닫아야 한다. 락을 잡으면 풀어야 한다. 메모리를 할당하면 해제해야 한다.

문제는 시작과 끝이 다른 곳에 있으면 누수가 생긴다는 것이다.

## 좋은 패턴

자원을 할당한 곳에서 해제까지 책임진다.

```python
def process_file(path):
    f = open(path)
    try:
        return parse(f)
    finally:
        f.close()

# 더 좋은 방법: 언어 도구 활용
def process_file(path):
    with open(path) as f:
        return parse(f)
```

`with`가 할당과 해제를 한 자리에 묶는다.

## 나쁜 패턴

한 함수에서 열고 다른 함수에서 닫으면 위험하다.

```python
def open_resources():
    return open("a"), open("b")

def use_resources(a, b):
    # ... 처리 ...
    a.close()
    b.close()  # 잊으면? 누수
```

`use_resources`를 호출하는 쪽이 닫는 것을 까먹으면 누수가 생긴다. 예외가 발생하면 닫는 코드에 도달하지 못할 수도 있다.

## 언어별 도구

대부분의 언어가 자원 관리를 위한 도구를 제공한다.

| 언어 | 도구 |
|------|------|
| Python | `with` 문 (context manager) |
| C++ | RAII (Resource Acquisition Is Initialization) |
| Rust | Drop trait |
| Java | try-with-resources |
| Go | `defer` |
| C# | `using` 문 |

언어의 관용구를 따르면 실수를 줄일 수 있다.

## 중첩 자원

여러 자원을 사용할 때는 할당의 역순으로 해제한다.

```python
with open("input.txt") as inp:
    with open("output.txt", "w") as out:
        # inp 먼저 열고, out 나중에 열었다
        # out 먼저 닫고, inp 나중에 닫는다
        process(inp, out)
```

스택처럼 생각하면 된다. 나중에 열린 것이 먼저 닫힌다.

## 정리

- 자원을 할당한 곳에서 해제까지 책임진다.
- 언어의 자원 관리 도구를 활용한다.
- 시작과 끝이 분리되면 누수가 생긴다.
- 여러 자원은 할당의 역순으로 해제한다.

## 다음 장 예고

[Tip 41: Act Locally](/blog/programming/engineering/pragmatic-programmer/tip41)에서는 지역성의 원칙을 다룬다. 변경의 범위를 최소화하면 부작용이 줄어든다.

## 관련 항목

- [Tip 39: Use Assertions to Prevent the Impossible](/blog/programming/engineering/pragmatic-programmer/tip39)
- [Tip 41: Act Locally](/blog/programming/engineering/pragmatic-programmer/tip41)
