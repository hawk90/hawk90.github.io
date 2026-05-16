---
title: "Ch 7: Rules 14~16 — 제어흐름, goto, switch"
date: 2025-09-05T08:00:00
description: "조건문 본질(R14), goto 정책(R15), switch 엄격성(R16) — 분기를 예측 가능하게 만드는 규칙들."
tags: [misra, c, control-flow, switch, goto, fallthrough]
series: "MISRA C"
seriesOrder: 7
draft: false
---

제어흐름의 위반은 *경로 추론을 망친다*. 정적 분석기, 인간 리뷰어, 그리고 미래의 디버거 모두 영향을 받는다. MISRA는 *명시적이고 예측 가능한* 제어흐름을 요구한다.

## R14 — 조건문 본질

### Rule 14.1 (Required) — 부동소수 반복 변수 금지

```c
// 위반
for (float t = 0.0f; t < 1.0f; t += 0.1f) {
    /* ... */
}
```

부동소수의 누적 오차는 반복 횟수를 *예측 불가*하게 만든다. 위 코드는 컴파일러·하드웨어에 따라 10번 또는 9번 돈다.

```c
// Good — 정수 반복 + 변환
for (int i = 0; i < 10; i++) {
    float t = (float)i * 0.1f;
    /* ... */
}
```

### Rule 14.2 (Required) — `for` 루프는 *well-formed*

`for (init; cond; iter)`의 세 부분이 *서로 일관*해야 한다.

```c
// 위반 — 반복 변수가 조건과 무관
for (int i = 0; flag; j++) {
    /* ... */
}

// Good
for (int i = 0; i < n; i++) {
    /* ... */
}
```

### Rule 14.3 (Required) — *불변* 조건 금지

```c
const int x = 5;
if (x > 0) { /* ... */ }      // 위반 — 항상 true
while (1) { /* ... */ }       // 위반 — 항상 true
```

무한 루프가 필요하면 *명시적 패턴*을 쓴다.

```c
// Good — 명시적 무한 루프
for (;;) { /* ... */ }
```

(`while (1)`도 흔하지만 일부 도구는 위반으로 검출. *deviation Permit*에 명시.)

### Rule 14.4 (Required) — 제어식은 *boolean essential type*

```c
int x = 5;
if (x) { /* ... */ }         // 위반 — int를 boolean으로

// Good
if (x != 0) { /* ... */ }
```

C에서 `0`이 false, *0 외*가 true로 처리되는 *암묵 변환*을 명시 비교로 대체.

포인터도 마찬가지.

```c
char *p = malloc(...);
if (p) { /* ... */ }         // 위반

if (p != NULL) { /* ... */ } // Good
```

## R15 — goto

### Rule 15.1 (Advisory) — `goto` 사용 금지

원칙적으로 금지. 다만 *cleanup 패턴*에서는 흔히 Permit으로 허용한다.

### Rule 15.2 (Required) — `goto`는 *같은 블록 또는 더 바깥 블록*의 label만

```c
// 위반 — 안쪽 블록 label로 점프
goto inner;
if (cond) {
inner:
    /* ... */
}
```

### Rule 15.3 (Required) — `goto`는 *코드 흐름상 뒤*의 label로만 (forward)

```c
// 위반 — backward goto = 사실상 loop
loop:
    DoWork();
    if (cond) goto loop;

// Good — 명시적 loop
while (cond) {
    DoWork();
}
```

### Rule 15.4 (Advisory) — 같은 반복문에 `break`/`return`이 다수 금지

루프에서 빠져나오는 경로가 여럿이면 *경로 추론*이 어려워진다.

```c
// 회피
for (int i = 0; i < n; i++) {
    if (cond1) break;
    if (cond2) return -1;
    if (cond3) break;
}

// Good — 상태 변수로 단일 종료
int found = 0;
int rc = 0;
for (int i = 0; i < n && !found && rc == 0; i++) {
    if (cond1) found = 1;
    else if (cond2) rc = -1;
    else if (cond3) found = 1;
}
```

가독성과 충돌하는 경우가 많아 *Advisory*. 프로젝트마다 정책 다르다.

### Rule 15.5 (Advisory) — 함수는 단일 종료점

위 R15.4와 같은 정신.

```c
// 회피
int Lookup(int key) {
    if (key < 0) return -1;
    if (key > MAX) return -1;
    int v = compute(key);
    if (v == 0) return -2;
    return v;
}

// Good — 단일 return
int Lookup(int key) {
    int rc;
    if (key < 0 || key > MAX) {
        rc = -1;
    } else {
        int v = compute(key);
        rc = (v == 0) ? -2 : v;
    }
    return rc;
}
```

리얼월드에서는 *early return*이 더 읽기 좋은 경우가 많아 *Advisory*로 격하해 운영.

### Rule 15.6 (Required) — 모든 반복·조건문 본문은 *복합 명령문*({ })

```c
// 위반
if (cond) DoSomething();
while (i < n) i++;

// Good — 항상 중괄호
if (cond) {
    DoSomething();
}
while (i < n) {
    i++;
}
```

Apple "goto fail" 버그가 단적인 예. 한 줄 if 다음에 *들여쓰기만 같은* 줄이 따라오면 시각적으로 *블록처럼 보이지만 실제로는 아니다*.

```c
// goto fail 의 시뮬레이션
if (err = check1()) goto fail;
    goto fail;          // 항상 실행됨, if 블록 밖
```

R15.6은 이 종류의 사고를 차단.

### Rule 15.7 (Required) — `if/else if` 사슬의 마지막은 `else`

```c
// 위반
if (x > 0) {
    /* ... */
} else if (x < 0) {
    /* ... */
}
// x == 0 처리 없음

// Good
if (x > 0) {
    /* ... */
} else if (x < 0) {
    /* ... */
} else {
    /* x == 0 — 의도적으로 비움 */
}
```

`else`가 *모든 경우를 처리했다*는 신호. 빈 `else`라도 명시.

## R16 — switch

### Rule 16.1 (Required) — switch 구조의 well-formedness

`switch` 본문은 *case 문 또는 default*만 시작 위치에 있어야 한다.

### Rule 16.2 (Required) — case와 default는 switch 본문 *최상위*

```c
// 위반 — case가 중첩 블록 안
switch (x) {
    case 1:
        if (cond) {
            case 2:           // 위반 — Duff's device 같은 트릭 차단
            /* ... */
        }
        break;
}
```

### Rule 16.3 (Required) — case의 본문은 *break* 또는 *throw* (또는 무조건 종료)

Fallthrough 금지.

```c
// 위반
switch (x) {
    case 1:
        DoA();
        // break 누락 — case 2로 떨어짐
    case 2:
        DoB();
        break;
}

// 의도적 fallthrough — deviation 필요
switch (x) {
    case 1:
        DoA();
        /* fall through */    // 도구가 인식하는 마커
        // [[fallthrough]];     // C++17, C23은 attribute
    case 2:
        DoB();
        break;
}
```

GCC 7+는 `__attribute__((fallthrough))` 또는 `/* fall through */` 주석을 인식한다.

### Rule 16.4 (Required) — switch는 default 절을 가져야

```c
// 위반
switch (x) {
    case 1: DoA(); break;
    case 2: DoB(); break;
}

// Good
switch (x) {
    case 1: DoA(); break;
    case 2: DoB(); break;
    default: /* unexpected */ break;
}
```

`default`가 위에 있어도 OK다. *반드시 있어야* 한다.

### Rule 16.5 (Required) — default는 switch의 *첫 또는 마지막* 위치

```c
// 위반
switch (x) {
    case 1: DoA(); break;
    default: DoX(); break;    // 위반 — 중간
    case 2: DoB(); break;
}

// Good — 마지막
switch (x) {
    case 1: DoA(); break;
    case 2: DoB(); break;
    default: DoX(); break;
}
```

### Rule 16.6 (Required) — switch는 최소 2개 case

case 하나면 `if`로 쓰는 것이 자연스럽다.

```c
// 위반
switch (x) {
    case 1: DoA(); break;
    default: DoX(); break;
}

// Good
if (x == 1) {
    DoA();
} else {
    DoX();
}
```

### Rule 16.7 (Required) — switch 식은 essential type *boolean이 아님*

`switch (b)` — b가 `_Bool`이면 위반. `if/else`로 쓰라.

## 자주 위반되는 항목

| Rule | 위반 빈도 | 흔한 원인 |
|------|----------|----------|
| 14.4 | 매우 높음 | `if (ptr)`, `if (count)` 관습 |
| 15.5 (Advisory) | 매우 높음 | early return 패턴 |
| 15.6 | 높음 | 한 줄 if 습관 |
| 15.7 | 높음 | `else` 누락 |
| 16.3 | 높음 | fallthrough 주석 누락 |
| 16.4 | 중간 | enum 완전 처리 가정 후 default 생략 |

## 정리

- R14: 부동소수 반복·불변 조건·boolean 아닌 조건 금지.
- R15: goto는 forward만, 단일 종료점은 Advisory.
- 모든 if/while/for 본문은 *중괄호*. goto fail 차단.
- R16: switch는 default 필수, fallthrough 명시, case ≥ 2.
- early return은 R15.5(Advisory) — 프로젝트마다 정책 다르다.

## 다음 장 예고

8장은 R17 — 함수 본체 규칙이다. 가변인자, 재귀, return 값 검사, 매개변수 수정 등.

## 관련 항목

- [Ch 6 — 포인터·배열](/blog/embedded/automotive/misra-c/chapter06-pointers-arrays)
- [Ch 8 — 함수](/blog/embedded/automotive/misra-c/chapter08-functions)
