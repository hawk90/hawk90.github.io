---
title: "Chapter 2: Mutual Exclusion"
date: 2026-05-12
description: "상호 배제 문제와 해결책. Peterson, Filter, Bakery 알고리즘. 하한 증명과 불가능성 결과."
series: "The Art of Multiprocessor Programming"
seriesOrder: 2
tags: [parallel, concurrency, book-review, amp, mutual-exclusion, peterson, bakery]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 2 요약

## 2.1 시간과 이벤트

### 이벤트 순서

스레드 A의 이벤트 a가 스레드 B의 이벤트 b **이전에 발생**:

$$
a \rightarrow b \text{ (happens-before)}
$$

### 간격 (Interval)

이벤트 쌍으로 정의되는 시간 간격:

```
       ┌─────────────┐
A: ────┤  [a₀, a₁)   ├────────
       └─────────────┘

       ┌─────────────────────┐
B: ────┤     [b₀, b₁)        ├──
       └─────────────────────┘
```

**겹침 (Overlap)**: 두 간격이 동시에 진행
**선행 (Precedes)**: 한 간격이 완전히 먼저

---

## 2.2 임계 영역 문제

### 정의

```java
while (true) {
    // 진입 영역 (Doorway)
    lock();

    // 임계 영역 (Critical Section)
    // ... 공유 자원 접근 ...

    // 탈출 영역
    unlock();

    // 나머지 영역
}
```

### 요구 조건

| 조건 | 설명 |
|-----|------|
| **상호 배제** | 동시에 둘 이상이 임계 영역에 없음 |
| **데드락-프리** | 누군가는 항상 진입 가능 |
| **기아-프리** | 모든 요청자가 결국 진입 |

---

## 2.3 2-스레드 해결책

### LockOne: 플래그만

```java
class LockOne implements Lock {
    private boolean[] flag = new boolean[2];

    public void lock() {
        int i = ThreadID.get();  // 0 or 1
        int j = 1 - i;
        flag[i] = true;
        while (flag[j]) {}  // wait
    }

    public void unlock() {
        int i = ThreadID.get();
        flag[i] = false;
    }
}
```

**문제**: 데드락 가능

```
Thread 0: flag[0] = true
Thread 1: flag[1] = true
Thread 0: while(flag[1]) → 무한 대기
Thread 1: while(flag[0]) → 무한 대기
```

### LockTwo: victim만

```java
class LockTwo implements Lock {
    private int victim;

    public void lock() {
        int i = ThreadID.get();
        victim = i;  // 내가 양보
        while (victim == i) {}  // wait
    }

    public void unlock() {}
}
```

**문제**: 한 스레드만 실행하면 무한 대기

### Peterson Lock: 둘의 조합

```java
class Peterson implements Lock {
    private boolean[] flag = new boolean[2];
    private int victim;

    public void lock() {
        int i = ThreadID.get();
        int j = 1 - i;
        flag[i] = true;     // 나 들어간다
        victim = i;          // 충돌 시 내가 양보
        while (flag[j] && victim == i) {}
    }

    public void unlock() {
        int i = ThreadID.get();
        flag[i] = false;
    }
}
```

### Peterson 정확성 증명

**Lemma 2.3.1 (상호 배제)**

귀류법: A와 B가 동시에 임계 영역에 있다고 가정.

A가 진입: `flag[B] == false` 또는 `victim == B`
B가 진입: `flag[A] == false` 또는 `victim == A`

둘 다 flag = true이므로: `victim == B` **그리고** `victim == A`

victim은 단일 변수 → **모순** ∎

**Lemma 2.3.2 (기아-프리)**

A가 무한 대기 → `flag[B] && victim == A` 유지

B가 unlock → `flag[B] = false` → A 진입
B가 다시 lock → `victim = B` → A 진입

따라서 A는 B의 최대 1회 통과 후 진입 ∎

---

## 2.4 Filter Lock (N-스레드)

### 아이디어

N-1개의 "대기실"을 통과해야 임계 영역 진입.

```
Level 0: 모든 스레드
Level 1: 최대 N-1개 스레드
Level 2: 최대 N-2개 스레드
...
Level N-1: 최대 1개 스레드 (임계 영역)
```

### 구현

```java
class Filter implements Lock {
    int[] level;   // level[i]: 스레드 i의 현재 레벨
    int[] victim;  // victim[L]: 레벨 L의 양보자

    public Filter(int n) {
        level = new int[n];
        victim = new int[n];
        for (int i = 0; i < n; i++) {
            level[i] = 0;
        }
    }

    public void lock() {
        int me = ThreadID.get();
        for (int L = 1; L < n; L++) {
            level[me] = L;
            victim[L] = me;
            // 나보다 높은 레벨이 있거나, 같은 레벨의 victim이면 대기
            while (existsHigherLevel(L, me) && victim[L] == me) {}
        }
    }

    private boolean existsHigherLevel(int L, int me) {
        for (int k = 0; k < n; k++) {
            if (k != me && level[k] >= L) return true;
        }
        return false;
    }

    public void unlock() {
        int me = ThreadID.get();
        level[me] = 0;
    }
}
```

### 특성

- **상호 배제**: ✓
- **데드락-프리**: ✓
- **기아-프리**: ✓
- **공간**: O(n)
- **시간**: O(n) 레벨 통과

---

## 2.5 Bakery Algorithm

### 아이디어

빵집 번호표: 작은 번호가 먼저 서비스.

### 구현

```java
class Bakery implements Lock {
    boolean[] flag;  // 번호표 뽑는 중?
    int[] label;     // 번호표

    public Bakery(int n) {
        flag = new boolean[n];
        label = new int[n];
    }

    public void lock() {
        int me = ThreadID.get();
        flag[me] = true;
        label[me] = max(label[0], ..., label[n-1]) + 1;
        flag[me] = false;

        for (int k = 0; k < n; k++) {
            while (flag[k]) {}  // 번호표 뽑는 중이면 대기
            while (label[k] != 0 &&
                   (label[k], k) < (label[me], me)) {}
        }
    }

    public void unlock() {
        int me = ThreadID.get();
        label[me] = 0;
    }
}
```

### (label, id) 비교

```java
// 사전식 순서
(a, i) < (b, j) ≡ (a < b) || (a == b && i < j)
```

### 특성

- **상호 배제**: ✓
- **FCFS (First-Come-First-Served)**: ✓
- **기아-프리**: ✓
- **공간**: O(n)
- **번호 크기**: **무한** (이론적 한계)

---

## 2.6 한계와 불가능성

### 정리 2.6.1: 공간 하한

> N-스레드 데드락-프리 상호 배제는 최소 N개의 **다중-쓰기** 레지스터가 필요하다.

증명 아이디어: 각 스레드가 최소 하나의 레지스터에 "흔적"을 남겨야 다른 스레드가 감지 가능.

### 정리 2.6.2: Read-Modify-Write 필요성

> 단순 읽기/쓰기만으로는 N-스레드 기아-프리 상호 배제가 불가능하다 (bounded waiting 보장 불가).

해결: **하드웨어 지원** (Test-and-Set, Compare-and-Swap)

---

## 핵심 요약

| 알고리즘 | 스레드 | 공간 | 공정성 | 특징 |
|---------|-------|------|--------|------|
| Peterson | 2 | O(1) | 제한적 | 가장 단순 |
| Filter | N | O(n) | 제한적 | N-1 레벨 통과 |
| Bakery | N | O(n) | FCFS | 번호표 기반 |

---

## 중요 Lemma

**Lemma 2.3.1**: Peterson Lock은 상호 배제 만족
**Lemma 2.3.2**: Peterson Lock은 기아-프리
**Theorem 2.4.1**: Filter Lock은 최대 n-L 스레드가 레벨 L 이상
**Theorem 2.6.1**: 데드락-프리 상호 배제는 O(n) 공간 필요

---

## 연습 문제

1. Peterson Lock에서 `flag[i] = true`와 `victim = i` 순서를 바꾸면?

2. Filter Lock에서 `victim[L] = me`를 빼면?

3. Bakery에서 `flag` 배열 없이 구현하면 어떤 문제가?

4. 3-스레드용 Peterson을 직접 설계해보라.

---

다음 글: [Chapter 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects)
