---
title: "Chapter 15: Using Conditionals"
date: 2026-05-11T15:00:00
description: "조건문의 올바른 사용 — 정상 경로 먼저, else 명시, 가드 절, 복잡한 조건 캡슐화."
series: "Code Complete"
seriesOrder: 15
tags: [code-complete, conditionals, McConnell]
draft: true
---

## 이 챕터의 메시지

`if`, `if-else`, `if-else-if`, `switch` — 가장 흔한 흐름 도구다. 잘 쓰면 명확, 못 쓰면 — 깊은 중첩과 추적 불가능한 분기.

> 좋은 조건문 = **정상 경로 먼저 + 명시적 else + 복잡한 조건 캡슐화**.

## 핵심 내용

- 정상 경로를 **`if`로**, 예외 경로를 **`else`로**.
- **`else`를 명시적으로 적기** — 빠뜨리지 마라.
- 복잡한 조건은 **이름 있는 메서드/변수**로 추출.
- **가드 절**로 깊은 중첩 회피.
- `switch`는 — 다형성으로 대체 가능한지 검토.

## 정상 경로 먼저

```c
// Bad — 예외가 먼저
if (error) {
    handleError();
} else {
    processNormal();
}

// Good — 정상이 먼저
if (success) {
    processNormal();
} else {
    handleError();
}
```

읽는 사람은 — **무엇이 정상 흐름인지** 먼저 알고 싶다. 예외는 그 다음.

## else를 명시적으로

```c
// Bad — 빠진 else
if (x > 0) {
    doSomething();
}
// x <= 0이면? 의도된 동작인가? 빠뜨린 건가?

// Good — 모든 케이스 명시
if (x > 0) {
    doSomething();
} else {
    // 의도 명시: x <= 0이면 아무것도 안 한다
}
```

복잡한 분기에선 — 빠진 케이스가 버그의 원천. 명시적으로 두 면 검토가 쉬워진다.

## 가드 절로 중첩 회피

```c
// Bad — 깊은 중첩
void process(Order order) {
    if (order != null) {
        if (order.isValid()) {
            if (order.hasStock()) {
                // 비즈니스 로직
            }
        }
    }
}

// Good — 가드 절
void process(Order order) {
    if (order == null) return;
    if (!order.isValid()) return;
    if (!order.hasStock()) return;
    // 비즈니스 로직
}
```

예외 케이스는 **함수 위쪽에서 빠르게 빠져나간다**. 정상 흐름은 본문에 명확.

## 복잡한 조건 캡슐화

```c
// Bad — 조건이 코드에 떠있음
if (date.day == 31 && (date.month == 4 || date.month == 6 ||
                       date.month == 9 || date.month == 11)) ...

// Good — 의도 있는 이름
if (isInvalidDayForMonth(date)) ...
```

조건의 의미가 즉시 보이고, 다른 자리에서 같은 검증을 재사용할 수 있다.

### 부울 변수로 추출

```c
bool isInvalid = (date.day == 31 && hasShortMonth(date.month));
if (isInvalid) ...
```

함수가 과도하면 — 변수로 추출도 OK.

## switch / case

다중 분기는 — `if-else-if` 체인보다 `switch`가 명확하다 (값 비교일 때).

```c
switch (type) {
    case TYPE_A: handleA(); break;
    case TYPE_B: handleB(); break;
    case TYPE_C: handleC(); break;
    default:     handleUnknown();
}
```

### 규칙

- **모든 case에 break** — fall-through는 의도적일 때만, 주석으로 표시.
- **default 항상 두기** — 의도된 동작이거나 에러 처리.
- **case가 5개 이상**이면 — 다형성으로 대체 검토.

### 다형성으로 대체

```cpp
// switch
double calculatePay(Employee e) {
    switch (e.type) {
        case HOURLY: return e.hours * e.rate;
        case SALARY: return e.salary;
    }
}

// 다형성
class Employee { virtual double calculatePay() = 0; };
class HourlyEmployee : public Employee { ... };
```

새 타입 추가 시 — switch는 여러 자리 수정, 다형성은 새 클래스만 추가.

## 정리

- **정상 경로 먼저**, 예외는 else로.
- `else`를 **명시적으로** 적기.
- **가드 절**로 깊은 중첩 회피.
- 복잡한 조건은 **함수/변수로 추출**.
- `switch`는 — 다형성으로 대체 가능한지 검토.

## 관련 항목

- [Ch 14: Straight-Line Code](/blog/programming/engineering/code-complete/ch14-Organizing-Straight-Line-Code)
- [Ch 16: Controlling Loops](/blog/programming/engineering/code-complete/ch16-Controlling-Loops)
- [Clean Code Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions)
