---
title: "Tip 47: Avoid Global Data"
date: 2026-05-13
description: "전역 데이터를 피하라 — 어디서든 접근, 어디서든 변경 = 어디서든 깨진다."
series: "The Pragmatic Programmer"
seriesOrder: 47
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Avoid Global Data** — 전역 데이터 = **숨겨진 의존**.

## 핵심 내용

- 전역 = 어디서든 — 읽기·쓰기.
- 누가 — 언제 — 바꾸는지 — 모름.
- 테스트 — 격리 X.
- 동시성 — 안전 X.
- 의존이 — 코드에서 안 보임.

## 전역 데이터의 함정

```python
# 전역.
config = {}

def init():
    global config
    config["db"] = "production"

def query():
    db = config["db"]  # 어디에서 — 누가 — 변경?
    ...
```

- `query`의 — 진짜 입력 = `config` (인자에 없음).
- 테스트 시 — `config`를 — 매번 초기화.
- 동시 실행 — 안전 X.

## 더 나은 방법

- **인자** — 명시적으로 전달.
- **DI** — 생성 시 — 주입.
- **컨텍스트** — 함수에 — 명시적으로.

```python
def query(config):
    db = config["db"]
    ...
```

의존이 — 시그니처에 — 보인다.

## "정말 전역" 경우

- 로깅 — 사실상 전역.
- 메트릭 — 같음.
- 시간/난수 — 깊은 자리에서 — 인자로 전달 어려움.

이런 자리도 — 가능하면 — DI로. 안 되면 — **신중히**.

## 정리

- 전역 = 숨겨진 의존.
- 테스트·동시성 — 안전 X.
- 인자·DI로 — 명시.

## 관련 항목

- [Tip 41: Act Locally](/blog/programming/engineering/pragmatic-programmer/tip41)
- [Tip 46: Don't Chain Method Calls](/blog/programming/engineering/pragmatic-programmer/tip46)
- [Tip 48: Wrap Global in API](/blog/programming/engineering/pragmatic-programmer/tip48)
