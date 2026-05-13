---
title: "Chapter 22: Developer Testing"
date: 2025-06-20T22:00:00
description: "개발자가 짜는 테스트 — TDD, 단위 테스트, 경계 조건, 테스트의 발견적 가치."
series: "Code Complete"
seriesOrder: 22
tags: [code-complete, testing, TDD, McConnell]
draft: true
---

## 이 챕터의 메시지

테스트는 — **QA의 책임이 아니라 개발자의 책임**이다. 코드를 쓴 사람이 가장 잘 안다.

> 개발자 테스트는 — **결함 발견 도구**이자 **설계 도구**다.

## 핵심 내용

- **TDD** — 테스트 먼저, 코드 나중.
- **단위 테스트** — 함수/클래스 단위.
- **경계 조건**이 가장 자주 깨진다.
- 테스트가 — **설계 개선**의 도구.

## TDD — Test-Driven Development

```
1. 실패하는 테스트 작성
2. 통과시키는 최소 코드 작성
3. 리팩토링
4. 반복
```

TDD의 가치:

- 테스트가 빠지지 않는다 (먼저 짜니까).
- **설계가 테스트 가능**한 형태로 자라난다.
- 작은 단위로 진행 — 디버깅 용이.

자세한 패턴은 — [Clean Code Ch 9](/blog/programming/engineering/clean-code/chapter09-unit-tests).

## 단위 테스트

함수/클래스 단위로 — **분리된 자체 검증**.

```python
def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0
```

### F.I.R.S.T

- **Fast** — 빠르게.
- **Independent** — 서로 안 엮임.
- **Repeatable** — 어디서든 같은 결과.
- **Self-Validating** — 자동 판정.
- **Timely** — 코드 직전·직후.

## 경계 조건

가장 자주 깨지는 자리.

| 카테고리 | 경계 |
| --- | --- |
| 숫자 | 0, ±1, 최대값, 최소값 |
| 컬렉션 | empty, 한 개, 가득 |
| 시간 | 자정, 윤년, 시간대 변경 |
| 문자열 | empty, 한 글자, 매우 김 |
| 인덱스 | 0, n-1, n (off-by-one) |

테스트는 — **정상 + 경계 + 비정상 입력**.

## 구조적 테스트 vs 데이터 테스트

### 구조적 (Structural)

코드 구조를 보고 — 모든 경로를 한 번씩 실행.

```c
if (x > 0) {        // path 1: x > 0
    doA();
} else {            // path 2: x <= 0
    doB();
}
```

테스트 2개 (각 경로).

### 데이터 / Black-box

명세를 보고 — 입력·출력 조합.

```
입력: 음수, 0, 양수
경계: INT_MIN, INT_MAX
이상: NaN, null
```

## 테스트의 다른 가치

- **자기 문서화** — 코드 사용 예시.
- **회귀 방지** — 옛 버그 재발 차단.
- **리팩토링 안전망** — 변경 후 동작 검증.
- **설계 피드백** — 테스트하기 어려운 코드는 — 설계가 나쁜 신호.

## 일반적 결함 패턴

- **off-by-one** — `<` vs `<=`.
- **null 검사 누락** — null 가능성 의식.
- **integer overflow** — 큰 입력에서.
- **resource leak** — 예외 경로에서 정리 누락.
- **race condition** — 동시성.

## 정리

- 테스트는 **개발자의 책임**.
- **TDD**가 표준 — 테스트 먼저.
- F.I.R.S.T 속성.
- **경계 조건**이 가장 자주 깨진다.
- 테스트는 — **결함 + 설계 + 문서**의 도구.

## 관련 항목

- [Ch 9: Pseudocode Process](/blog/programming/engineering/code-complete/ch09-The-Pseudocode-Programming-Process)
- [Ch 23: Debugging](/blog/programming/engineering/code-complete/ch23-Debugging)
- [Clean Code Ch 9: 단위 테스트](/blog/programming/engineering/clean-code/chapter09-unit-tests)
