---
title: "Chapter 2: Mutual Exclusion"
date: 2026-05-12T02:00:00
description: "상호 배제 문제와 해결책. Peterson, Filter, Bakery 알고리즘. 하한 증명과 불가능성 결과."
series: "The Art of Multiprocessor Programming"
seriesOrder: 2
tags: [parallel, concurrency, book-review, amp, mutual-exclusion, peterson, bakery, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 2 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 2.1 시간과 이벤트

### 이벤트 순서

스레드 A의 이벤트 a가 스레드 B의 이벤트 b **이전에 발생**:

$$
a \rightarrow b \text{ (happens-before)}
$$

### 간격 (Interval)

이벤트 쌍으로 정의되는 시간 간격:

![Interval — 시간 간격](/images/blog/parallel/diagrams/ch02-intervals.svg)

**겹침 (Overlap)**: 두 간격이 동시에 진행
**선행 (Precedes)**: 한 간격이 완전히 먼저

---

## 2.2 임계 영역 문제

### 정의

**C++20**

```cpp
#include <mutex>

std::mutex mtx;

void critical_section() {
    // 진입 영역 (Doorway)
    mtx.lock();

    // 임계 영역 (Critical Section)
    // ... 공유 자원 접근 ...

    // 탈출 영역
    mtx.unlock();

    // 나머지 영역
}

// 또는 RAII 스타일
void critical_section_raii() {
    std::scoped_lock lock(mtx);  // 자동 lock
    // 임계 영역
}  // 자동 unlock
```

**C11**

```c
#include <threads.h>

mtx_t mtx;

void critical_section(void) {
    // 진입 영역
    mtx_lock(&mtx);

    // 임계 영역
    // ... 공유 자원 접근 ...

    // 탈출 영역
    mtx_unlock(&mtx);

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

**C++20 (std::atomic)**

```cpp
#include <atomic>
#include <array>

class LockOne {
    std::array<std::atomic<bool>, 2> flag{};

public:
    void lock(int id) {
        int other = 1 - id;
        flag[id].store(true, std::memory_order_seq_cst);
        while (flag[other].load(std::memory_order_seq_cst)) {
            // spin wait
        }
    }

    void unlock(int id) {
        flag[id].store(false, std::memory_order_seq_cst);
    }
};
```

**C11**

```c
#include <stdatomic.h>
#include <stdbool.h>

atomic_bool flag[2] = {false, false};

void lock_one_lock(int id) {
    int other = 1 - id;
    atomic_store(&flag[id], true);
    while (atomic_load(&flag[other])) {
        // spin wait
    }
}

void lock_one_unlock(int id) {
    atomic_store(&flag[id], false);
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

**C++20**

```cpp
#include <atomic>

class LockTwo {
    std::atomic<int> victim{0};

public:
    void lock(int id) {
        victim.store(id, std::memory_order_seq_cst);  // 내가 양보
        while (victim.load(std::memory_order_seq_cst) == id) {
            // spin wait
        }
    }

    void unlock(int id) {
        // 아무것도 안 함
    }
};
```

**C11**

```c
#include <stdatomic.h>

atomic_int victim = 0;

void lock_two_lock(int id) {
    atomic_store(&victim, id);  // 내가 양보
    while (atomic_load(&victim) == id) {
        // spin wait
    }
}

void lock_two_unlock(int id) {
    // 아무것도 안 함
}
```

**문제**: 한 스레드만 실행하면 무한 대기

### Peterson Lock: 둘의 조합

**C++20**

```cpp
#include <atomic>
#include <array>

class Peterson {
    std::array<std::atomic<bool>, 2> flag{};
    std::atomic<int> victim{0};

public:
    void lock(int id) {
        int other = 1 - id;
        flag[id].store(true, std::memory_order_seq_cst);   // 나 들어간다
        victim.store(id, std::memory_order_seq_cst);        // 충돌 시 내가 양보

        while (flag[other].load(std::memory_order_seq_cst) &&
               victim.load(std::memory_order_seq_cst) == id) {
            // spin wait
        }
    }

    void unlock(int id) {
        flag[id].store(false, std::memory_order_seq_cst);
    }
};
```

**C11**

```c
#include <stdatomic.h>
#include <stdbool.h>

atomic_bool flag[2] = {false, false};
atomic_int victim = 0;

void peterson_lock(int id) {
    int other = 1 - id;
    atomic_store(&flag[id], true);   // 나 들어간다
    atomic_store(&victim, id);        // 충돌 시 내가 양보

    while (atomic_load(&flag[other]) &&
           atomic_load(&victim) == id) {
        // spin wait
    }
}

void peterson_unlock(int id) {
    atomic_store(&flag[id], false);
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

**C++20**

```cpp
#include <atomic>
#include <vector>
#include <thread>

class FilterLock {
    int n;
    std::vector<std::atomic<int>> level;   // level[i]: 스레드 i의 현재 레벨
    std::vector<std::atomic<int>> victim;  // victim[L]: 레벨 L의 양보자

public:
    explicit FilterLock(int num_threads)
        : n(num_threads), level(n), victim(n) {
        for (int i = 0; i < n; ++i) {
            level[i].store(0, std::memory_order_relaxed);
            victim[i].store(0, std::memory_order_relaxed);
        }
    }

    void lock(int id) {
        for (int L = 1; L < n; ++L) {
            level[id].store(L, std::memory_order_seq_cst);
            victim[L].store(id, std::memory_order_seq_cst);

            // 나보다 높은 레벨이 있거나, 같은 레벨의 victim이면 대기
            while (exists_higher_level(L, id) &&
                   victim[L].load(std::memory_order_seq_cst) == id) {
                std::this_thread::yield();  // CPU 양보
            }
        }
    }

    void unlock(int id) {
        level[id].store(0, std::memory_order_seq_cst);
    }

private:
    bool exists_higher_level(int L, int me) {
        for (int k = 0; k < n; ++k) {
            if (k != me && level[k].load(std::memory_order_seq_cst) >= L) {
                return true;
            }
        }
        return false;
    }
};
```

**C11**

```c
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>

typedef struct {
    int n;
    atomic_int* level;   // level[i]: 스레드 i의 현재 레벨
    atomic_int* victim;  // victim[L]: 레벨 L의 양보자
} FilterLock;

FilterLock* filter_lock_create(int num_threads) {
    FilterLock* lock = malloc(sizeof(FilterLock));
    lock->n = num_threads;
    lock->level = calloc(num_threads, sizeof(atomic_int));
    lock->victim = calloc(num_threads, sizeof(atomic_int));
    return lock;
}

void filter_lock_destroy(FilterLock* lock) {
    free(lock->level);
    free(lock->victim);
    free(lock);
}

static bool exists_higher_level(FilterLock* lock, int L, int me) {
    for (int k = 0; k < lock->n; ++k) {
        if (k != me && atomic_load(&lock->level[k]) >= L) {
            return true;
        }
    }
    return false;
}

void filter_lock_lock(FilterLock* lock, int id) {
    for (int L = 1; L < lock->n; ++L) {
        atomic_store(&lock->level[id], L);
        atomic_store(&lock->victim[L], id);

        while (exists_higher_level(lock, L, id) &&
               atomic_load(&lock->victim[L]) == id) {
            // spin wait (또는 sched_yield())
        }
    }
}

void filter_lock_unlock(FilterLock* lock, int id) {
    atomic_store(&lock->level[id], 0);
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

**C++20**

```cpp
#include <atomic>
#include <vector>
#include <algorithm>
#include <limits>

class Bakery {
    int n;
    std::vector<std::atomic<bool>> flag;   // 번호표 뽑는 중?
    std::vector<std::atomic<int>> label;   // 번호표

public:
    explicit Bakery(int num_threads)
        : n(num_threads), flag(n), label(n) {
        for (int i = 0; i < n; ++i) {
            flag[i].store(false, std::memory_order_relaxed);
            label[i].store(0, std::memory_order_relaxed);
        }
    }

    void lock(int id) {
        // 번호표 뽑기 시작
        flag[id].store(true, std::memory_order_seq_cst);

        // 최대 번호 + 1 받기
        int max_label = 0;
        for (int k = 0; k < n; ++k) {
            max_label = std::max(max_label,
                label[k].load(std::memory_order_seq_cst));
        }
        label[id].store(max_label + 1, std::memory_order_seq_cst);

        // 번호표 뽑기 완료
        flag[id].store(false, std::memory_order_seq_cst);

        // 대기: 다른 스레드의 번호표와 비교
        for (int k = 0; k < n; ++k) {
            if (k == id) continue;

            // 번호표 뽑는 중이면 대기
            while (flag[k].load(std::memory_order_seq_cst)) {
                std::this_thread::yield();
            }

            // (label, id) 사전식 비교
            while (true) {
                int other_label = label[k].load(std::memory_order_seq_cst);
                int my_label = label[id].load(std::memory_order_seq_cst);

                if (other_label == 0) break;  // k는 대기 안 함
                if (my_label < other_label) break;  // 내가 먼저
                if (my_label == other_label && id < k) break;  // 같으면 id로

                std::this_thread::yield();
            }
        }
    }

    void unlock(int id) {
        label[id].store(0, std::memory_order_seq_cst);
    }
};
```

**C11**

```c
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>

typedef struct {
    int n;
    atomic_bool* flag;   // 번호표 뽑는 중?
    atomic_int* label;   // 번호표
} BakeryLock;

BakeryLock* bakery_lock_create(int num_threads) {
    BakeryLock* lock = malloc(sizeof(BakeryLock));
    lock->n = num_threads;
    lock->flag = calloc(num_threads, sizeof(atomic_bool));
    lock->label = calloc(num_threads, sizeof(atomic_int));
    return lock;
}

void bakery_lock_destroy(BakeryLock* lock) {
    free(lock->flag);
    free(lock->label);
    free(lock);
}

static int max_label(BakeryLock* lock) {
    int max = 0;
    for (int k = 0; k < lock->n; ++k) {
        int lbl = atomic_load(&lock->label[k]);
        if (lbl > max) max = lbl;
    }
    return max;
}

void bakery_lock_lock(BakeryLock* lock, int id) {
    // 번호표 뽑기 시작
    atomic_store(&lock->flag[id], true);

    // 최대 번호 + 1 받기
    atomic_store(&lock->label[id], max_label(lock) + 1);

    // 번호표 뽑기 완료
    atomic_store(&lock->flag[id], false);

    // 대기
    for (int k = 0; k < lock->n; ++k) {
        if (k == id) continue;

        // 번호표 뽑는 중이면 대기
        while (atomic_load(&lock->flag[k])) {
            // spin
        }

        // (label, id) 사전식 비교
        while (true) {
            int other_label = atomic_load(&lock->label[k]);
            int my_label = atomic_load(&lock->label[id]);

            if (other_label == 0) break;
            if (my_label < other_label) break;
            if (my_label == other_label && id < k) break;

            // spin
        }
    }
}

void bakery_lock_unlock(BakeryLock* lock, int id) {
    atomic_store(&lock->label[id], 0);
}
```

### (label, id) 비교

```cpp
// 사전식 순서
// (a, i) < (b, j) ≡ (a < b) || (a == b && i < j)
auto less_than = [](int a, int i, int b, int j) {
    return (a < b) || (a == b && i < j);
};
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

**C++20 — compare_exchange_strong**

```cpp
#include <atomic>

class TASLock {
    std::atomic<bool> locked{false};

public:
    void lock() {
        while (locked.exchange(true, std::memory_order_acquire)) {
            // spin — 이미 잠김
        }
    }

    void unlock() {
        locked.store(false, std::memory_order_release);
    }
};
```

**C11 — atomic_exchange**

```c
#include <stdatomic.h>
#include <stdbool.h>

atomic_bool locked = false;

void tas_lock(void) {
    while (atomic_exchange(&locked, true)) {
        // spin
    }
}

void tas_unlock(void) {
    atomic_store(&locked, false);
}
```

---

## 2.7 실무: 왜 Peterson을 직접 쓰지 않는가

### 메모리 재정렬 문제

Modern CPU와 컴파일러는 메모리 연산을 재정렬한다.

```cpp
// Peterson lock without proper memory ordering
flag[id] = true;   // (1)
victim = id;       // (2)
while (flag[other] && victim == id);  // (3)

// CPU/컴파일러가 (1)과 (2)를 재정렬할 수 있음!
// → 상호 배제 깨짐
```

**해결: memory_order 명시 또는 std::mutex 사용**

### 실무 권장

```cpp
// 대부분의 경우 std::mutex 사용
#include <mutex>

std::mutex mtx;

void critical_section() {
    std::scoped_lock lock(mtx);
    // 임계 영역
}

// C++20에서 spin lock이 정말 필요하면
#include <atomic>

class SpinLock {
    std::atomic_flag flag = ATOMIC_FLAG_INIT;

public:
    void lock() {
        while (flag.test_and_set(std::memory_order_acquire)) {
            // C++20: wait 사용 가능
            // flag.wait(true, std::memory_order_relaxed);
        }
    }

    void unlock() {
        flag.clear(std::memory_order_release);
        // flag.notify_one();  // C++20
    }
};
```

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

1. Peterson Lock에서 `flag[id] = true`와 `victim = id` 순서를 바꾸면?

2. Filter Lock에서 `victim[L] = me`를 빼면?

3. Bakery에서 `flag` 배열 없이 구현하면 어떤 문제가?

4. 3-스레드용 Peterson을 직접 설계해보라.

---

## 한국 개발자의 함정

```
1. *Modern CPU에서는 순수 SW 락이 안 통한다*
   - Memory reordering 때문 (Ch 4)
   - std::memory_order_seq_cst 필수
   - 실무는 *하드웨어 명령*에 의존 (CAS, TAS)

2. *순수 SW 락은 학술적*
   - Bakery는 증명용
   - 실무는 OS / 하드웨어 락

3. *데드락 없으면 안전*하다는 오해
   - Starvation은 데드락-프리에서도 발생
   - Bounded waiting이 진짜 공정성
```

## 실무 적용

```
이론 → 실무 매핑:
- Peterson  → 학술적 예제
- Bakery    → 분산 락 (Lamport) 시초
- Filter    → 토너먼트 락의 직관

실제로 자주 만나는 락:
- std::mutex (C++) / mtx_t (C)
- std::atomic_flag + TAS (스핀락)
- pthread_mutex_t (POSIX)
- futex (Linux)

C++ vs C 비교:
- std::atomic<bool>        ↔ atomic_bool
- compare_exchange_strong  ↔ atomic_compare_exchange_strong
- memory_order_seq_cst     ↔ memory_order_seq_cst (동일)
```

## 자기 점검

```
□ Mutual exclusion / deadlock-free / starvation-free 구분?
□ Bounded waiting 정의?
□ Peterson lock이 Modern CPU에서 깨지는 이유?
□ Bakery lock의 ticket 생성 메커니즘?
□ Read-modify-write 필요성?
□ C++20 std::atomic_flag의 용도?
```

## 관련 항목

- [Chapter 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction)
- [Chapter 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects)
- [Chapter 4: Foundations of Shared Memory](/blog/parallel/parallel-principles/ch04-foundations-of-shared-memory) — Memory model
- [Chapter 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention) — 실무 락
- [C++ Concurrency in Action — Ch 3](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)

---

다음 글: [Chapter 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects)
