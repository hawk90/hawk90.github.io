---
title: "상호 배제 문제"
date: 2026-05-12
description: "왜 동시성이 어려운가? 상호 배제 문제의 정의와 조건. Dekker, Peterson, Bakery 알고리즘으로 가는 첫 걸음."
series: "Parallel Programming Principles"
seriesOrder: 11
tags: [parallel, concurrency, mutual-exclusion, synchronization, critical-section]
type: tech
---

## 왜 상호 배제가 필요한가

다음 코드를 보자:

```cpp
int counter = 0;

void increment() {
    counter++;
}
```

두 스레드가 동시에 `increment()`를 호출하면 어떻게 될까?

직관적으로는 `counter`가 2가 되어야 한다. 하지만 실제로는:

```
스레드 A: counter를 읽는다 (0)
스레드 B: counter를 읽는다 (0)
스레드 A: 1을 더한다 (1)
스레드 B: 1을 더한다 (1)
스레드 A: counter에 쓴다 (1)
스레드 B: counter에 쓴다 (1)
```

결과: `counter = 1`

이것이 **레이스 컨디션(Race Condition)**이다. 두 스레드가 공유 데이터에 동시 접근해서 예상치 못한 결과가 나온다.

## 임계 영역과 상호 배제

### 임계 영역 (Critical Section)

공유 자원에 접근하는 코드 영역을 **임계 영역**이라 한다.

```cpp
void increment() {
    // 임계 영역 시작
    counter++;
    // 임계 영역 끝
}
```

### 상호 배제 (Mutual Exclusion)

**상호 배제**란 한 번에 하나의 스레드만 임계 영역에 들어갈 수 있도록 보장하는 것이다.

```cpp
void increment() {
    enter_critical_section();  // 락 획득
    counter++;                 // 임계 영역
    leave_critical_section();  // 락 해제
}
```

## 상호 배제의 조건

올바른 상호 배제 알고리즘은 다음 조건을 만족해야 한다:

### 1. 상호 배제 (Mutual Exclusion)

> 두 개 이상의 스레드가 동시에 임계 영역에 있을 수 없다.

가장 기본적인 조건. 이것을 만족하지 못하면 알고리즘이 아니다.

### 2. 진행 (Progress) / 데드락 자유 (Deadlock-Freedom)

> 임계 영역에 들어가려는 스레드가 있고, 현재 임계 영역에 아무도 없다면,
> 반드시 누군가는 들어갈 수 있어야 한다.

모든 스레드가 서로 기다리며 아무도 진행하지 못하는 **데드락**을 방지한다.

### 3. 유한 대기 (Bounded Waiting) / 기아 자유 (Starvation-Freedom)

> 임계 영역에 들어가려는 스레드는 유한한 시간 내에 들어갈 수 있어야 한다.

특정 스레드가 영원히 기다리는 **기아(Starvation)**를 방지한다.

---

## 순진한 시도 #1: 플래그 사용

```cpp
bool flag[2] = {false, false};

void thread_0() {
    while (flag[1]) { }  // 스레드 1이 임계 영역에 있으면 대기
    flag[0] = true;      // 나 들어간다

    // 임계 영역
    counter++;

    flag[0] = false;     // 나 나간다
}

void thread_1() {
    while (flag[0]) { }  // 스레드 0이 임계 영역에 있으면 대기
    flag[1] = true;      // 나 들어간다

    // 임계 영역
    counter++;

    flag[1] = false;     // 나 나간다
}
```

### 문제: 상호 배제 위반

```
스레드 0: flag[1]이 false인지 확인 → false
스레드 1: flag[0]이 false인지 확인 → false
스레드 0: flag[0] = true
스레드 1: flag[1] = true
스레드 0: 임계 영역 진입
스레드 1: 임계 영역 진입  ← 동시 진입!
```

**확인-설정 사이의 간극**에서 경쟁이 발생한다.

---

## 순진한 시도 #2: 먼저 플래그 설정

```cpp
void thread_0() {
    flag[0] = true;      // 먼저 나 들어간다고 표시
    while (flag[1]) { }  // 스레드 1이 임계 영역에 있으면 대기

    // 임계 영역
    counter++;

    flag[0] = false;
}

void thread_1() {
    flag[1] = true;      // 먼저 나 들어간다고 표시
    while (flag[0]) { }  // 스레드 0이 임계 영역에 있으면 대기

    // 임계 영역
    counter++;

    flag[1] = false;
}
```

### 문제: 데드락

```
스레드 0: flag[0] = true
스레드 1: flag[1] = true
스레드 0: flag[1]이 true이므로 대기
스레드 1: flag[0]이 true이므로 대기
← 둘 다 영원히 대기!
```

상호 배제는 만족하지만 **진행(Progress) 조건 위반**.

---

## 순진한 시도 #3: 턴(Turn) 사용

```cpp
int turn = 0;  // 누구 차례인지

void thread_0() {
    while (turn != 0) { }  // 내 차례가 아니면 대기

    // 임계 영역
    counter++;

    turn = 1;  // 다음은 스레드 1 차례
}

void thread_1() {
    while (turn != 1) { }  // 내 차례가 아니면 대기

    // 임계 영역
    counter++;

    turn = 0;  // 다음은 스레드 0 차례
}
```

### 문제: 진행 조건 위반

스레드 0이 임계 영역에 들어가고 나온 후, 스레드 0이 다시 들어가려면?

```
스레드 0: 임계 영역 진입
스레드 0: turn = 1로 설정하고 나옴
스레드 0: 다시 들어가고 싶음
스레드 0: turn이 1이므로 대기
스레드 1: (아직 들어가지 않음)
← 스레드 0은 영원히 대기!
```

스레드 1이 임계 영역에 들어가지 않으면, 스레드 0도 들어갈 수 없다. **교대(Strict Alternation)** 문제.

---

## 문제의 핵심

위 시도들의 실패 원인:

1. **확인과 설정이 원자적이지 않다**: 읽기와 쓰기 사이에 다른 스레드가 끼어든다
2. **의도와 상태가 분리되어 있다**: "들어가고 싶다"와 "들어갔다"가 동기화되지 않는다
3. **단순한 교대는 불공평하다**: 한 스레드가 더 자주 들어가야 할 수 있다

## 해결의 실마리

올바른 알고리즘을 위해서는:

1. **의도를 먼저 표현한다**: "나 들어가고 싶어"
2. **충돌 시 양보한다**: 둘 다 원하면 누군가 양보
3. **공평하게 기회를 준다**: 기아 방지

다음 글에서 이 조건을 만족하는 **Peterson의 알고리즘**을 알아본다.

---

## 현대적 관점

위의 알고리즘들은 **소프트웨어만으로** 상호 배제를 구현하려는 시도다.

현대 시스템에서는:

1. **하드웨어 지원**: `test-and-set`, `compare-and-swap` 명령어
2. **운영체제 지원**: mutex, semaphore 시스템 콜
3. **언어 지원**: `std::mutex`, `std::atomic`

하지만 이 알고리즘들을 이해하면:

- **왜** 하드웨어 지원이 필요한지 안다
- **어떤** 조건을 만족해야 하는지 안다
- **무엇이** 잘못될 수 있는지 예측한다

---

## 핵심 요약

| 조건 | 의미 | 위반 시 |
|-----|-----|--------|
| 상호 배제 | 동시 진입 방지 | 레이스 컨디션 |
| 진행 | 데드락 방지 | 무한 대기 |
| 유한 대기 | 기아 방지 | 불공평 |

---

## 생각해볼 질문

1. 임계 영역이 길면 어떤 문제가 생길까?
2. 3개 이상의 스레드에서 위 시도들은 어떻게 될까?
3. 현대 CPU의 메모리 재배치가 위 알고리즘에 미치는 영향은?

---

다음 글: [Part 2-02: Peterson의 알고리즘](/blog/parallel/parallel-principles/part2-02-peterson-algorithm)
