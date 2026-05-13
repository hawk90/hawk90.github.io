---
title: "Chapter 26: Code-Tuning Techniques"
date: 2025-06-21T02:00:00
description: "구체적 코드 튜닝 기법 — 루프, 자료구조, 산술, 표현식. 각 기법의 효과와 비용."
series: "Code Complete"
seriesOrder: 26
tags: [code-complete, performance, optimization, McConnell]
draft: true
---

## 이 챕터의 메시지

[Ch 25](/blog/programming/engineering/code-complete/ch25-Code-Tuning-Strategies)에서 — **측정 후 핫스팟에만** 최적화한다고 했다. 그럼 — 핫스팟에서 무엇을 할 수 있는가?

이 챕터는 — **구체적 기법들의 카탈로그**.

## 핵심 내용

- **루프**: unrolling, sentinel, 한정자, 반복 풀기.
- **자료구조**: 캐시 친화, 메모리 접근 패턴.
- **표현식**: 강도 감소(strength reduction), 단순화.
- **함수**: 인라인, 작은 함수 호출 비용.
- 각 기법은 — **측정 후에만**.

## 루프 최적화

### Loop unrolling — 본문 풀기

```c
// Before
for (int i = 0; i < n; i++) sum += arr[i];

// Unrolled — 4개씩
int i;
for (i = 0; i < n - 3; i += 4) {
    sum += arr[i] + arr[i+1] + arr[i+2] + arr[i+3];
}
for (; i < n; i++) sum += arr[i];
```

장점: 루프 조건 검사 횟수 ↓, 명령어 파이프라인 활용.
단점: 코드 양 ↑, 컴파일러가 이미 함.

### Sentinel — 종료 조건 단순화

```c
// Before — 두 조건
while (i < n && arr[i] != target) i++;

// Sentinel — 한 조건
arr[n] = target;    // sentinel 배치
while (arr[i] != target) i++;
```

루프 본문 검사 1개 → 0개.

### Loop invariants 추출

```c
// Before — 매번 계산
for (int i = 0; i < n; i++) {
    arr[i] = base + offset * scale;
}

// After
double constant = base + offset * scale;
for (int i = 0; i < n; i++) arr[i] = constant;
```

루프 안에서 안 변하는 — 밖으로.

## 자료구조

### 캐시 친화 (Cache-friendly)

```c
// Bad — column-major access in row-major array
for (j = 0; j < M; j++)
    for (i = 0; i < N; i++)
        arr[i][j] = ...;

// Good — row-major
for (i = 0; i < N; i++)
    for (j = 0; j < M; j++)
        arr[i][j] = ...;
```

캐시 라인 단위 접근. 큰 행렬에서 — 수배 차이.

### Struct of Arrays vs Array of Structs

```c
// AoS — Array of Structs
struct Point { float x, y, z; };
Point points[N];   // x,y,z가 인터리브

// SoA — Struct of Arrays
struct Points {
    float x[N], y[N], z[N];
};
```

벡터 연산에선 SoA가 — SIMD 활용 가능.

## 표현식

### Strength Reduction

비싼 연산을 싼 연산으로.

```c
// Bad
x * 2 → x << 1
x / 2 → x >> 1
x % 2 → x & 1
x % 8 → x & 7   // 8 = 2^3
```

(현대 컴파일러는 이미 함. 직접 할 필요 거의 없음.)

### 공통 부분식 제거

```c
// Bad
y = a * b + c;
z = a * b + d;

// Good
double ab = a * b;
y = ab + c;
z = ab + d;
```

## 함수 호출

### Inline 작은 함수

작은 함수 호출은 — 호출 비용이 본체보다 클 수 있다.

```cpp
inline int add(int a, int b) { return a + b; }
```

컴파일러가 보통 알아서 함. `inline` 키워드는 힌트.

### 함수 호출 자체 줄이기

호출이 핫 루프 안에 있으면 — 본문을 직접 또는 매크로로.

## 어셈블리

극한 최적화 — 어셈블리. 거의 안 한다. 컴파일러가 사람보다 잘함.

예외:

- SIMD 직접 작성.
- 임베디드의 인터럽트 핸들러.
- 고성능 라이브러리 핵심.

## 함정

- **컴파일러보다 똑똑한 척**. 보통 컴파일러가 이김.
- **측정 안 한 최적화**. 효과 X, 가독성만 손실.
- **포팅성 손실** — 한 컴파일러·CPU에 의존.

## 정리

- 루프: unrolling, sentinel, invariants 추출.
- 자료구조: 캐시 친화, AoS/SoA.
- 표현식: strength reduction, 공통 부분식.
- 함수: inline, 호출 최소화.
- 모든 기법은 — **측정 후, 핫스팟에만**.

## 관련 항목

- [Ch 25: Tuning Strategies](/blog/programming/engineering/code-complete/ch25-Code-Tuning-Strategies)
- [Ch 27: Program Size](/blog/programming/engineering/code-complete/ch27-How-Program-Size-Affects-Construction)
