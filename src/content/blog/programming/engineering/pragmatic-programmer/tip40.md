---
title: "Tip 40: Finish What You Start"
date: 2026-05-14T16:00:00
description: "시작한 것을 끝내라 — 자원을 할당한 함수가 — 해제 책임도 진다."
series: "The Pragmatic Programmer"
seriesOrder: 40
tags: [pragmatic-programmer, resource-management]
draft: true
---

## 이 팁의 메시지

> **Finish What You Start** — 자원을 — **연 사람**이 — **닫는다**.

## 핵심 내용

- 파일·소켓·락 — 할당한 자리에서 — 해제.
- 다른 자리로 — 책임 떠넘김 X.
- 한 함수 — 시작·끝의 — 한 쌍.
- 누수의 — 가장 흔한 원인.

## 패턴

```python
# Good — 같은 함수.
def process_file(path):
    f = open(path)
    try:
        return parse(f)
    finally:
        f.close()

# 더 좋게.
def process_file(path):
    with open(path) as f:
        return parse(f)
```

## 안 좋은 패턴

```python
# 한 함수에서 열고 — 다른 함수에서 닫는다.
def open_resources():
    return open("a"), open("b")

def use_resources(a, b):
    # ... 처리 ...
    a.close()
    b.close()  # 잊으면? 누수.
```

## 언어별 도구

- Python — `with`.
- C++ — RAII.
- Rust — drop trait.
- Java — try-with-resources.
- Go — `defer`.

## 정리

- 자원의 — 시작·끝.
- 한 자리에 — 묶는다.
- 언어 도구 — 활용.

## 관련 항목

- [Tip 39: Use Assertions](/blog/programming/engineering/pragmatic-programmer/tip39)
- [Tip 41: Act Locally](/blog/programming/engineering/pragmatic-programmer/tip41)
- [Effective Modern C++ Item 18: unique_ptr](/blog/programming/cpp/effective-modern-cpp/item18-unique-ptr)
