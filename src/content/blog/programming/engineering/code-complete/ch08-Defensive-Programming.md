---
title: "Chapter 8: Defensive Programming"
date: 2026-06-20T08:00:00
description: "방어적 프로그래밍 — 잘못된 입력에서도 시스템이 망가지지 않게. assertion, 입력 검증, 에러 처리 전략."
series: "Code Complete"
seriesOrder: 8
tags: [code-complete, defensive-programming, McConnell]
---

## 이 챕터의 메시지

> 잘못된 입력이 들어와도 — 시스템이 **망가지지 않아야** 한다.

방어적 프로그래밍은 **나의 코드를 다른 사람의 실수에서 보호하는 일**이다. 자기 코드의 정확성만이 아니라, 호출자가 잘못 부를 가능성, 외부 데이터가 깨질 가능성, 환경이 예상 밖일 가능성에 대비한다.

## 핵심 내용

- **모든 입력은 의심**한다 — 사용자 입력, 외부 API, 다른 모듈.
- **assertion**으로 가정을 코드에 박는다.
- **에러 처리 전략**을 명확히 — 무시? 기본값? 예외?
- **barricade** — 신뢰 영역과 비신뢰 영역의 경계.
- 과도한 방어는 **부담** — 균형.

## 모든 입력은 의심하라

방어적 프로그래밍의 첫 원칙.

```cpp
void processOrder(Order order) {
    // 1. order가 null이면?
    // 2. order.items가 empty면?
    // 3. order.total이 음수면?
    // 4. order.user가 인증 안 됐다면?
}
```

각각의 가능성을 의식적으로 처리한다. 처리하지 않으면 — 어느 시점에 (운이 나쁘면 프로덕션에서) UB가 발생한다.

## Assertion

`assert`는 — **"이 시점에서 이게 참이어야 한다"** 를 코드에 박는 도구.

```cpp
double compute(double x, double y) {
    assert(x >= 0 && "x must be non-negative");
    assert(y != 0 && "y must not be zero");
    return x / y;
}
```

**assertion vs 에러 처리**:

- **assertion**: 절대 일어나면 안 되는 경우 (프로그래머 실수).
- **에러 처리**: 일어날 수 있는 경우 (사용자 입력, 외부 데이터).

assertion은 **개발 빌드에서 즉시 죽인다**. 릴리스 빌드에선 보통 꺼진다.

## 에러 처리 전략

잘못된 입력을 만났을 때 어떻게 할 것인가? 여러 옵션이 있다.

| 전략 | 사용 |
| --- | --- |
| **값을 무시** | 잘못된 데이터 무시하고 계속 |
| **이웃 값 대체** | 깨진 픽셀을 옆 픽셀로 |
| **기본값 사용** | 잘못된 설정은 기본값으로 |
| **다음 유효 값 기다림** | 스트림에서 유효한 데이터까지 |
| **로그 + 계속** | 기록만 하고 진행 |
| **에러 메시지 반환** | 호출자에게 알림 |
| **예외 던지기** | 호출 스택을 거슬러 알림 |
| **종료** | 회복 불가 시 즉시 종료 |

> 어느 전략을 쓸지는 **시스템의 정확성·견고성** 트레이드오프.

- **정확성**(correctness) — 항상 정확한 결과 (의료 시스템).
- **견고성**(robustness) — 가능한 한 계속 동작 (게임).

정확성이 중요하면 — 즉시 종료. 견고성이 중요하면 — 기본값으로 계속.

## Barricade — 신뢰 영역의 경계

McConnell의 핵심 개념. **시스템을 신뢰 영역과 비신뢰 영역으로 나눈다**.

```
[비신뢰 영역]              [신뢰 영역]
  사용자 입력
  외부 API   →  [Barricade]  →  내부 비즈니스 로직
  파일                              (검증된 데이터)
```

- **Barricade 밖**: 모든 입력 의심. 검증·정제.
- **Barricade 안**: 데이터는 검증됐다고 신뢰. 매번 재검증 X.

이 분리가 — **검증을 한 자리에 모으고**, 내부 코드를 깨끗하게 유지한다.

## 과도한 방어

방어적 프로그래밍에도 한계가 있다. **모든 함수에 모든 검증**을 박으면:

- 코드가 검증으로 도배되어 의도가 사라짐.
- 검증 자체에 버그가 생김.
- 성능 손실.

해결책 — **Barricade**. 신뢰 영역 안에선 검증 최소화.

## 디버깅 도구

방어 코드는 — 운영에서도 가치 있지만 — **개발 중에 특히 중요**.

- **Assertion** — 개발 빌드에서만 활성.
- **로깅** — 상세한 로그.
- **자가 검증** — 객체가 자기 invariant를 메서드별로 검사.
- **불가능한 분기에 의미 있는 메시지** — `switch`의 default가 잡혔다면 알림.

## 정리

- 방어적 프로그래밍 = **남의 실수에서 내 코드 보호**.
- 모든 외부 입력은 **의심**한다.
- **Assertion**: 절대 일어나면 안 되는 가정.
- **에러 처리**: 일어날 수 있는 잘못된 입력.
- **Barricade**: 신뢰 영역과 비신뢰 영역 분리.
- 과도한 방어도 부담 — 균형.

## 관련 항목

- [Ch 7: High-Quality Routines](/blog/programming/engineering/code-complete/ch07-High-Quality-Routines)
- [Clean Code Ch 7: 에러 처리](/blog/programming/engineering/clean-code/chapter07-error-handling)
- [Clean Code Ch 8: 경계](/blog/programming/engineering/clean-code/chapter08-boundaries)
