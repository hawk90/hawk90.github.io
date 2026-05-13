---
title: "Chapter 12: Fundamental Data Types"
date: 2026-06-20T12:00:00
description: "기본 데이터 타입의 안전한 사용 — 숫자, 문자, 부울. 오버플로, 부동소수 정확도, 문자열 끝 처리."
series: "Code Complete"
seriesOrder: 12
tags: [code-complete, data-types, McConnell]
---

## 이 챕터의 메시지

기본 데이터 타입(int, float, char, bool)은 — **가장 친숙하면서 가장 자주 실수가 나는 단위**다. 오버플로, 부동소수 비교, 문자열 종료, 매직 넘버.

> 익숙해 보이는 타입일수록 — 함정이 묻혀 있다.

## 핵심 내용

- **숫자**: 매직 넘버 금지, 오버플로·언더플로 의식.
- **정수**: 부호·범위·나눗셈 경계.
- **부동소수**: 정확도 한계, 비교는 epsilon 사용.
- **문자/문자열**: 종료 문자, 인코딩.
- **부울**: 명확한 명명, 짧은 회로.

## 숫자

### 매직 넘버 금지

```c
// Bad
if (status == 7) ...    // 7이 뭐?

// Good
const int STATUS_FAILED = 7;
if (status == STATUS_FAILED) ...
```

`0`, `1`, `-1` 같은 자명한 자리만 예외.

### 오버플로

```c
int a = INT_MAX;
int b = a + 1;     // 오버플로 — UB (C/C++) 또는 wrap (Java)
```

큰 정수가 예상되면 — `long long`, `int64_t`, BigInteger 등 활용.

## 정수

### 부호 vs 비부호

- `unsigned`는 0보다 작아질 수 없다 — 비교에서 함정.
- 인덱스/크기에 `int` 쓰면 음수 가능성 의식.
- 표준 라이브러리는 `size_t` 사용 (unsigned).

### 나눗셈 경계

```c
double avg = sum / count;    // count == 0이면 division by zero
double a = (double)x / y;    // 정수 나눗셈 → 0 가능
```

나눗셈 전에 0 검사. 정수/부동소수 변환 의식.

## 부동소수

부동소수는 **이산적**이다. 정확한 표현이 안 되는 값이 많다.

```c
double a = 0.1 + 0.2;    // 0.30000000000000004
if (a == 0.3) ...        // false!
```

### 비교

```c
// Bad
if (a == b) ...

// Good — epsilon
if (fabs(a - b) < EPSILON) ...
```

EPSILON은 도메인에 맞게 (`1e-9`, `1e-6` 등).

### 누적 오차

```c
double sum = 0;
for (int i = 0; i < 1000000; i++) sum += 0.1;
// sum ≠ 100000.0 — 누적 오차
```

큰 합계는 — Kahan summation 같은 정확도 보정 알고리즘.

## 문자와 문자열

### C 문자열 — 종료 문자

```c
char buf[10];
strcpy(buf, "hello world");    // 11바이트 (\0 포함) — 버퍼 오버플로!
```

- 항상 길이 검사.
- `strncpy`, `snprintf` 사용.
- C++에선 `std::string`이 훨씬 안전.

### 인코딩

- ASCII는 7비트, UTF-8은 1~4바이트.
- 한글 1글자가 UTF-8 3바이트.
- 글자 수 ≠ 바이트 수.

문자열의 "길이"가 무엇을 의미하는지 — 바이트인지 글자인지 명확히.

## 부울

### 명확한 명명

```c
bool isReady;
bool hasError;
bool canRetry;
```

### 짧은 회로 (Short-Circuit)

```c
if (ptr != NULL && ptr->value > 0) ...    // 안전
if (ptr->value > 0 && ptr != NULL) ...    // ptr가 NULL이면 crash
```

`&&`, `||`는 왼쪽부터 평가하고 결과가 정해지면 멈춤. **순서가 중요**.

## 정리

- **숫자**: 매직 넘버 X, 오버플로 의식.
- **부동소수**: epsilon으로 비교, 누적 오차 의식.
- **문자열**: 종료 문자, 인코딩, 길이 vs 바이트 수.
- **부울**: 명확한 명명, 짧은 회로 순서.

## 관련 항목

- [Ch 11: Variable Names](/blog/programming/engineering/code-complete/ch11-The-Power-of-Variable-Names)
- [Ch 13: Unusual Data Types](/blog/programming/engineering/code-complete/ch13-Unusual-Data-Types)
