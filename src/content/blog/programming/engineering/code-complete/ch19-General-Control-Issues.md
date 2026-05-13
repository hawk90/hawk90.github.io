---
title: "Chapter 19: General Control Issues"
date: 2025-06-20T19:00:00
description: "제어 흐름의 일반 쟁점 — 부울 표현식 단순화, 깊이 제한, 흐름 복잡도 측정."
series: "Code Complete"
seriesOrder: 19
tags: [code-complete, control-flow, McConnell]
---

## 이 챕터의 메시지

조건문·루프 외에도 — 제어 흐름 전반에 적용되는 원리가 있다. 부울 표현식을 단순하게, 깊이를 줄여, 복잡도를 측정.

> 좋은 제어 흐름 = **사람이 추적할 수 있는 흐름**.

## 핵심 내용

- **부울 표현식 단순화** — 긍정형, 짧게.
- **들여쓰기 깊이 ≤ 3** — 더 깊으면 추출 신호.
- **순환 복잡도(Cyclomatic Complexity)**: 10 이하.
- **흐름 단순화** — 분기보다 다형성, 조건보다 가드.

## 부울 표현식 단순화

### 긍정 형식

```c
// Bad — 이중 부정
if (!isNotReady) ...

// Good — 긍정
if (isReady) ...
```

### 변수로 추출

```c
// Bad — 표현식이 길다
if ((document.AtEndOfStream() && !inputError && messageType == HOLD_HEARTBEAT) ||
    (numberOfRetries >= MAX_RETRIES && criticalError)) ...

// Good — 의도 있는 변수
bool readyToProcess  = document.AtEndOfStream() && !inputError && messageType == HOLD_HEARTBEAT;
bool givenUp         = numberOfRetries >= MAX_RETRIES && criticalError;
if (readyToProcess || givenUp) ...
```

복잡한 조건은 — **이름 있는 변수/함수**로 추출.

### 비교 순서 — 자연어처럼

```c
// Bad — 자연어와 반대
if (5 < a) ...

// Good — "a가 5보다 크면"
if (a > 5) ...
```

다만 — **상수 비교의 함정 방지**(C/C++):

```c
if (a = 5) ...    // 대입! 의도는 비교?
if (5 == a) ...   // 5에 대입 못 함 → 컴파일 에러
```

이건 옛 트릭. 현대 컴파일러 경고(`-Wparentheses`)가 잡아 준다.

## 깊이 제한

들여쓰기 깊이가 **3을 넘으면** — 거의 항상 함수 추출 신호.

```c
// Bad — 깊이 5
if (a) {
    if (b) {
        if (c) {
            if (d) {
                doSomething();
            }
        }
    }
}

// Good — 가드 절 + 추출
if (!a) return;
if (!b) return;
processIfCD(c, d);
```

## 순환 복잡도

함수의 가능한 경로 수.

```
복잡도 = 결정점 수 + 1
```

결정점 = `if`, `case`, `for`, `while`, `&&`, `||`, `?:`.

| 복잡도 | 평가 |
| --- | --- |
| 0~5 | 좋음 |
| 6~10 | 검토 — 더 줄일 수 있는가 |
| 11~ | 분할 거의 확실 |

도구로 측정 — `lizard`, `metric_runner`, IDE의 metric 도구.

## 흐름 단순화 전략

- **분기보다 다형성** — switch는 다형성으로.
- **조건보다 가드 절** — early return.
- **복잡한 조건 추출** — 이름 있는 함수/변수.
- **루프 안의 조건** — 두 루프로 분리.

## 정리

- 부울 표현식 — **긍정, 짧게, 추출**.
- 들여쓰기 깊이 — **≤ 3**.
- 순환 복잡도 — **≤ 10**.
- 흐름 단순화 — 분기/조건을 다형성/가드로.

## 관련 항목

- [Ch 18: Table-Driven](/blog/programming/engineering/code-complete/ch18-Table-Driven-Methods)
- [Ch 20: Quality Landscape](/blog/programming/engineering/code-complete/ch20-The-Software-Quality-Landscape)
