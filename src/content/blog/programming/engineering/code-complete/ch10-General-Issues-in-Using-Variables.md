---
title: "Chapter 10: General Issues in Using Variables"
date: 2026-06-20T10:00:00
description: "변수 사용의 일반 규칙 — 초기화, 스코프 좁히기, 한 변수 한 목적, 식별자의 수명."
series: "Code Complete"
seriesOrder: 10
tags: [code-complete, variables, McConnell]
---

## 이 챕터의 메시지

변수는 — **construction에서 가장 자주 만지는 단위**다. 한 변수가 잘못 쓰이면, 사용 자리마다 사고가 일어난다.

> 좋은 변수 사용 = **항상 초기화, 좁은 스코프, 한 목적, 짧은 수명**.

## 핵심 내용

- **항상 초기화** — 사용 전에 의미 있는 값으로.
- **스코프 좁게** — 사용 가까이 선언.
- **한 변수, 한 목적** — 재사용하지 마라.
- **변수의 수명을 줄이기** — 선언과 마지막 사용 사이의 거리.

## 항상 초기화

비초기화 변수는 — **UB의 가장 흔한 원인** 중 하나.

```c
int x;            // 쓰레기 값
if (x > 0) ...    // UB

int y = 0;        // ✅ 명시적 초기화
```

### 초기화 규칙

- 변수 선언 시 즉시 초기화.
- 가능하면 의미 있는 값.
- 모든 경로에서 초기화되는지 검증.
- 컴파일러 경고(`-Wuninitialized`) 활성화.

## 스코프 좁게

변수의 스코프는 — **사용 가까이**로 좁힌다.

```c
// Bad — 함수 시작에 모든 변수 선언
void f() {
    int x;
    int y;
    int z;
    
    // ... 50줄 후 x 사용 ...
}

// Good — 사용 직전 선언
void f() {
    // ... 50줄 ...
    int x = computeX();
    use(x);
}
```

좁은 스코프의 이점:

- **이름 충돌 가능성 감소**.
- **변수의 의미를 머리에 담아 둘 시간 짧음**.
- **함수 추출이 쉬워짐**.

## 한 변수, 한 목적

> 한 변수는 **한 가지 의미만** 가져야 한다.

```c
// Bad — 같은 변수가 두 의미
int x = computeFlag();    // 처음엔 플래그
// ...
x = userInput();          // 그 다음엔 사용자 입력
```

호출자는 매번 "x가 지금 무엇을 의미하는가"를 추적해야. 두 변수로 나누면 의미가 명확.

## 변수의 수명 줄이기

변수의 **수명** = 선언 첫 줄 ~ 마지막 사용 줄.

수명이 길수록 — 그 변수를 머리에 담아둬야 할 시간이 길어진다. 짧을수록 좋다.

```c
// 수명 긴 변수 — 30줄에 걸쳐 추적
void f() {
    int total = 0;
    // ... 25줄 (total을 안 만짐) ...
    total += x;
    // ... 5줄 (total을 안 만짐) ...
    return total;
}

// 수명 짧게 — 추출
void f() {
    // ... 25줄 ...
    return computeTotalFrom(x);
}
```

## 변수 명명 규칙

[Ch 11에서 자세히](/blog/programming/engineering/code-complete/ch11-The-Power-of-Variable-Names) 다룬다. 간단히:

- **목적을 드러내는** 이름.
- **의도된 사용처에 맞는** 수준.
- **검색 가능, 발음 가능**.
- **컨벤션 일관성**.

## 정리

- 변수는 **항상 초기화**.
- **스코프 좁게** — 사용 가까이 선언.
- **한 변수, 한 목적**.
- **수명을 줄여** 인지 부담 감소.

## 관련 항목

- [Ch 11: The Power of Variable Names](/blog/programming/engineering/code-complete/ch11-The-Power-of-Variable-Names)
- [Effective C++ Ch 4: 초기화 보장](/blog/programming/cpp/effective-cpp/item04-make-sure-objects-are-initialized-before-use)
- [Effective C++ Ch 26: 변수 정의 늦추기](/blog/programming/cpp/effective-cpp/item26-postpone-variable-definitions-as-long-as-possible)
