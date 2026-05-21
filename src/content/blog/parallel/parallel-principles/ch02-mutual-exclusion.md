---
title: "Chapter 2: Mutual Exclusion"
date: 2026-05-06T02:00:00
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

## 왜 이 장을 읽어야 하는가

상호 배제는 *공유 자원에 동시에 두 명이 못 들어가는* 보편 문제다. 회의실 예약, 화장실 한 칸, 은행 창구 한 자리 — 일상에서 늘 만난다. 컴퓨터에서는 한 메모리 위치를 두 스레드가 동시에 갱신하면 결과가 부서진다. 그래서 락이 필요하다. 하드웨어 명령(CAS, TAS)을 쓰면 락은 한 줄로 만들 수 있다. 그런데 *순수 SW만으로* 락을 구현할 수 있는가? Dijkstra, Peterson, Lamport는 50년 전 이 질문에 답했다. 이 장은 그 답들을 따라가며 *왜 그 알고리즘들이 그렇게 생겼는지*, 그리고 SW만으로는 절대 피할 수 없는 한계가 무엇인지를 보여준다.

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

**직관 — 2인 화장실 합의**

회사 화장실에 칸이 하나뿐이고, 사용 의사를 표시하는 두 개의 손잡이가 문 밖에 있다. 들어가려면 (1) 자기 손잡이를 *올린다* (`flag[me] = true`), (2) "**충돌하면 내가 양보**"라고 적힌 칠판에 자기 이름을 쓴다 (`victim = me`), (3) 상대 손잡이가 내려가 있거나 칠판에 *상대 이름*이 적혀 있으면 들어간다. 두 사람이 동시에 손잡이를 올리면 칠판에 나중에 쓴 사람이 양보한다. 한 명만 시도하면 상대 손잡이가 내려가 있어 즉시 들어간다. *손드는 순서*와 *양보 선언*의 조합이 핵심.

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

### LockOne을 왜 못 쓰는가 — 자세히

LockOne은 책이 첫 시도로 보여주는 알고리즘이다. 각 스레드가 "들어간다"는 신호로 자기 플래그를 켜고, 상대 플래그가 꺼질 때까지 기다린다.

**상호 배제는 성립한다**. A와 B가 동시에 임계 영역에 있다고 가정하자. A의 진입 직전 마지막 읽기가 `read(flag[B]) == false`였다. 이 읽기 시점에 B의 플래그는 꺼져 있었다. 그런데 B도 진입했으므로 어느 시점에 `write(flag[B] = true)`가 일어났다. happens-before 관계를 따져 보면 두 플래그 쓰기가 서로 상대의 읽기보다 앞서야 하는데 모순이다.

**그러나 데드락 가능**.

```text
1. A: flag[0] = true
2. B: flag[1] = true
3. A: while (flag[1]) → 영원히 true
4. B: while (flag[0]) → 영원히 true
```

두 스레드가 거의 동시에 flag을 켜면 둘 다 무한 대기. 데드락-프리 조건을 위반한다.

### LockTwo도 마찬가지

LockTwo는 정반대 전략이다. 진입 시도 시 자기를 **victim**으로 선언하고, 자신이 victim이 아닐 때까지 기다린다.

```text
A: victim = 0
A: while (victim == 0) → B가 들어오기를 기다림
```

A가 혼자 실행되면 누구도 victim을 바꿔주지 않아 무한 대기. **혼자 실행되는데도 진행 못 한다** — 데드락-프리 조건의 더 강한 위반이다.

### Peterson = LockOne + LockTwo

두 알고리즘의 약점이 정반대다.

| 알고리즘 | 둘이 동시 시도 | 혼자 시도 |
|---------|----------------|-----------|
| LockOne | 데드락 | OK |
| LockTwo | OK | 데드락 |

Peterson은 둘을 **합친다**. flag으로 "들어갈 의사 있음"을 알리고, victim으로 "충돌 시 누가 양보할지" 정한다. 둘이 동시에 시도하면 victim 메커니즘이 작동하여 한 쪽이 양보한다. 혼자면 상대 flag이 꺼져 있어 즉시 진입한다.

```cpp
void lock(int id) {
    int other = 1 - id;
    flag[id].store(true, std::memory_order_seq_cst);   // LockOne 부분
    victim.store(id, std::memory_order_seq_cst);        // LockTwo 부분
    while (flag[other].load(std::memory_order_seq_cst) &&  // ← AND
           victim.load(std::memory_order_seq_cst) == id) {
        // spin
    }
}
```

`&&`가 핵심이다. 둘 중 **하나라도** 거짓이면 진입. LockOne만 있으면 동시 시도 시 둘 다 무한 대기. LockTwo만 있으면 단독 시도 시 무한 대기. 합치면 둘 다 해결된다.

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

### 직관 — 식당 큐의 다단계 필터

인기 식당이 손님을 한 명씩만 받는데, 입구가 좁아 큐를 일렬로 세울 수 없다. 그래서 *N-1개의 대기실*을 두고 단계마다 한 명씩 거른다. 1단계 대기실에 들어온 사람들 중 한 명만 2단계로 통과, 2단계에서 한 명만 3단계로, 마지막 단계의 한 명이 식당으로 입장. 각 단계마다 *그 단계에서 양보할 사람* (victim) 한 명을 고르고, 양보자는 다음 도전자가 올 때까지 그 단계에 머문다. Peterson을 N에 일반화한 아이디어다.

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

### Wait-free 전이 논증 (Filter Lock의 진행성)

책은 Filter Lock의 진행성을 **귀납적 논증**으로 증명한다.

**주장**: 레벨 $L$의 임계 영역에 있을 수 있는 스레드는 최대 $n - L$명이다.

**기저**: 레벨 0에서는 모든 스레드가 가능하므로 최대 $n - 0 = n$명. 자명하다.

**귀납**: 레벨 $L-1$까지 최대 $n - L + 1$명이 있다고 가정. 레벨 $L$에 들어가려면 다음 조건을 모두 통과해야 한다.

```text
level[me] = L
victim[L] = me
while (∃k ≠ me: level[k] ≥ L) AND (victim[L] == me)
    spin
```

레벨 $L$에 동시에 있는 스레드들을 보자. 그 중 마지막으로 `victim[L] = me`를 쓴 스레드를 $T$라 하자. 그 시점 이후 다른 어떤 스레드도 `victim[L]`을 자기로 덮어쓰지 않는다 (이미 들어갔거나 들어가지 못한 상태). 따라서 $T$는 `victim[L] == T`를 영원히 본다.

다른 스레드들은 `victim[L] ≠ self`이므로 즉시 통과한다. **$T$만 갇혀 있고 나머지는 진행**. 따라서 레벨 $L$에 영원히 머무는 스레드는 최대 1명, 진입한 스레드는 최대 $(n - L + 1) - 1 = n - L$명이다. ∎

### 데드락-프리는 자동으로 따라온다

레벨 $n-1$은 최대 1명만 들어갈 수 있다. 그게 임계 영역이다. 어떤 스레드가 락을 시도하면, 자신보다 앞선 스레드들이 모두 임계 영역을 떠나는 한 결국 레벨 $n-1$에 도달한다. **혼자 시도하면 누구도 자신을 victim으로 만들지 않고 다른 레벨에 머물지 않으므로 모든 레벨을 즉시 통과**.

### 기아 가능성 — Filter의 약점

Filter Lock은 데드락-프리지만 **bounded waiting을 보장하지 않는다**. 다른 스레드들이 끊임없이 자신을 victim으로 만들면 영원히 갇힐 수 있다.

**시나리오:**

- A가 레벨 L에 진입, victim[L] = A
- B가 레벨 L에 진입, victim[L] = B (A 풀려남)
- A가 다시 레벨 L 진입, victim[L] = A (B 풀려남)
- ... 끝없이 반복 ...
- 그 사이 C, D, ... 가 임계 영역을 들락날락

이게 Bakery로 가는 동기다. Bakery는 **FCFS**를 보장한다.

---

## 2.5 Bakery Algorithm

### 직관 — 빵집 번호표

동네 빵집에 손님이 줄 서지 않고 *번호표*만 뽑는다. 번호표는 카운터의 디스플레이를 보고 자기가 *지금 발급된 최대 번호 + 1*을 뽑는 식. 빵집 주인은 작은 번호부터 호명한다. 같은 번호를 두 명이 동시에 뽑은 경우 (드물지만 가능) *이름의 알파벳 순*으로 양보. 이게 Bakery 알고리즘이다. 두 사람이 거의 동시에 번호를 뽑으면 같은 번호가 나올 수 있어 *(번호, 스레드 ID)* 사전식 비교로 tie-break.

빵집 비유의 강점은 **FCFS**다. 먼저 도착한 사람이 작은 번호를 뽑고, 작은 번호가 먼저 입장한다. Filter Lock의 "한 명이 끝없이 양보"하는 기아 문제가 사라진다.

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

### Bakery 정확성 — 책의 증명

책은 두 가지를 증명한다. (1) 상호 배제, (2) FCFS.

**상호 배제 증명**

A와 B가 동시에 임계 영역에 있다고 가정. WLOG `(label[A], A) < (label[B], B)` (사전식 순서).

A가 진입했다는 것은 마지막 검사에서 B에 대해 다음 중 하나가 참이었다는 뜻이다.

```text
조건 i:   flag[B] == false
조건 ii:  label[B] == 0
조건 iii: my_label < other_label
조건 iv:  my_label == other_label && id < other_id
```

A의 가정 `(label[A], A) < (label[B], B)`이므로 (iii) 또는 (iv) 중 하나가 성립한다.

이제 B의 입장에서 보자. B도 A를 통과해야 임계 영역에 들어갈 수 있다. B가 A를 검사할 때:

- B는 `flag[A] == false`이거나 `label[A] == 0`이거나 `(label[B], B) < (label[A], A)`를 봐야 한다.
- 그런데 A가 임계 영역에 있으므로 `flag[A] = true`이고 `label[A] ≠ 0`.
- `(label[B], B) < (label[A], A)`도 거짓 (가정에 의해 반대).

따라서 B는 A를 통과할 수 없다. **모순** ∎

핵심은 `flag[A] = true && label[A] != 0` 동안 B는 A의 번호표를 정확히 읽고, 자신과 비교해서 더 크면 양보한다는 것.

**FCFS 증명**

A가 B보다 먼저 도착했다고 하자 (A의 `doorway`가 B의 `doorway`보다 앞). 그러면 A의 `label[A]` 쓰기가 B가 max를 계산하는 동안 일어났거나 그 전에 일어났다.

따라서 `label[B] ≥ label[A] + 1 > label[A]`. 사전식 순서로 `(label[A], A) < (label[B], B)`. 위의 상호 배제 증명에 의해 A가 먼저 들어간다. ∎

이 FCFS 보장이 Filter Lock과 결정적으로 다른 점이다.

### Doorway 개념

책은 락 알고리즘을 **doorway**(번호표 뽑기, wait-free 부분)와 **waiting**(대기, blocking 부분)으로 나눠 분석한다.

```text
Bakery의 doorway:
1. flag[me] = true
2. label[me] = max(label) + 1
3. flag[me] = false
(여기까지는 spin 없이 유한 단계에 완료)

Bakery의 waiting:
for k != me:
    while flag[k]: spin
    while (label[k], k) < (label[me], me): spin
```

doorway가 wait-free라는 것은 **번호표 뽑기는 다른 스레드 행동과 무관하게 끝난다**는 뜻. 이게 FCFS의 기초가 된다. doorway에서 결정된 순서가 곧 입장 순서다.

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

### Theorem 2.7.1 — 읽기/쓰기 레지스터의 한계

책의 메인 불가능성 결과.

> **Theorem 2.7.1**: n-스레드 데드락-프리 상호 배제 알고리즘은 **최소 n개의 단일-쓰기, 다중-읽기 레지스터**(또는 그에 상응하는 다중-쓰기 레지스터)를 필요로 한다.

이 결과는 **읽기/쓰기 연산만**을 가정한다 (CAS, TAS 같은 RMW는 제외). 즉 메모리 명령이 단순 load/store뿐인 모델.

### 증명 스케치 — Covering State 논증

증명의 핵심은 **covering state**라는 개념이다. 스레드 $T$가 어떤 레지스터에 곧 쓸 상태(다음 명령이 그 레지스터 쓰기)에 있으면, $T$가 그 레지스터를 **cover**한다고 한다.

귀류법: 레지스터가 $n - 1$개 이하인 n-스레드 데드락-프리 알고리즘 $A$가 있다고 가정.

**1단계** — 스레드 0 혼자 락을 잡고 임계 영역에 들어간다. 이는 데드락-프리이므로 가능.

**2단계** — 스레드 1을 깨워서 진입을 시도하게 한다. 스레드 1이 임계 영역에 들어가려면 어떤 레지스터에 자기 흔적을 남겨야 한다 (그렇지 않으면 0이 0과 1을 구별할 수 없다). 스레드 1이 첫 쓰기를 하기 직전 상태에서 멈춘다. 이 상태에서 1은 어떤 레지스터 $R_1$을 cover.

**3단계** — 스레드 2도 진입 시도. 스레드 2도 첫 쓰기 직전에 멈춘다. 1이 cover한 $R_1$과는 다른 레지스터를 써야 한다 (같으면 2의 쓰기가 즉시 1의 쓰기를 덮어쓰고, 0이 둘을 구별할 수 없다). 따라서 2는 $R_2 \neq R_1$을 cover.

**...n단계** — 같은 방식으로 스레드 $k$는 새로운 레지스터 $R_k$를 cover. 모든 $R_k$가 서로 다르다.

스레드 $1, 2, \ldots, n-1$이 각각 다른 레지스터를 cover. 레지스터가 $n - 1$개 이하이므로 비둘기집 원리에 의해 모순.

따라서 알고리즘 $A$는 최소 $n$개의 레지스터가 필요. ∎

### 직관 — N명이 합의하려면 N개의 신호기 필수

N명의 등산객이 한 좁은 출구를 통과한다. 출구가 한 명씩만 받는다. *순수 SW*만 쓸 수 있다는 건 등산객들이 *깃발 N개* 외에 다른 의사소통 수단이 없다는 뜻. 각자 자기 깃발 하나를 들거나 내릴 수 있고, 모든 깃발을 *볼* 수만 있다. 깃발이 N개 미만이면? 두 명이 같은 깃발을 *공유*해야 하는데, 한 명이 들면 다른 한 명이 들었는지 구별 못 한다. 그래서 비둘기집 원리로 N개 미만은 불가능. RMW 명령(CAS, TAS)이 있으면 *깃발을 동시에 확인+갱신*할 수 있어 깃발 하나로 충분하다.

### Theorem의 의미

이 결과는 **소프트웨어만으로 효율적인 락이 불가능함**을 형식적으로 보여준다.

**n = 100 threads:**

- 단순 load/store만 → 최소 100개의 레지스터 필요
- O(n) 공간 → 스레드 수에 비례하여 메모리 사용
- O(n) 시간 → 각 락 시도마다 모든 레지스터 검사

이건 점근적 하한이지만 실용적 함의가 크다. 100개 스레드가 락 하나 잡으려고 100개 메모리 위치를 매번 읽어야 한다. 캐시 미스 폭증, 확장성 0.

**해결**: Read-Modify-Write 명령. CAS, TAS, fetch-and-add 같은 단일 명령으로 **읽기와 쓰기를 원자적으로** 수행하면 $O(1)$ 메모리로 충분하다 (예: 단일 atomic_flag).

### Bakery는 왜 이 한계를 안 피하는가

Bakery는 $O(n)$ 공간을 쓴다. 이는 Theorem 2.7.1과 정확히 일치한다. Bakery는 RMW를 안 쓰는 순수 SW 알고리즘이므로 이론적 하한 $n$개에 도달한 것.

CAS를 쓰는 TAS Lock은 단일 atomic_bool로 충분 — $O(1)$. 이게 하드웨어 RMW의 위력이다.

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

**이론 → 실무 매핑:**

- Peterson  → 학술적 예제
- Bakery    → 분산 락 (Lamport) 시초
- Filter    → 토너먼트 락의 직관

**실제로 자주 만나는 락:**

- std::mutex (C++) / mtx_t (C)
- std::atomic_flag + TAS (스핀락)
- pthread_mutex_t (POSIX)
- futex (Linux)

**C++ vs C 비교:**

- std::atomic<bool>        ↔ atomic_bool
- compare_exchange_strong  ↔ atomic_compare_exchange_strong
- memory_order_seq_cst     ↔ memory_order_seq_cst (동일)

## 자기 점검

- [ ] Mutual exclusion / deadlock-free / starvation-free 구분?
- [ ] Bounded waiting 정의?
- [ ] Peterson lock이 Modern CPU에서 깨지는 이유?
- [ ] Bakery lock의 ticket 생성 메커니즘?
- [ ] Read-modify-write 필요성?
- [ ] C++20 std::atomic_flag의 용도?

## 실제 시스템 사례

이 장의 알고리즘들이 실제 production 시스템에서 어떻게 진화·구현되어 있는지.

### Linux kernel ticket spinlock

리눅스 커널은 한때 단순 TAS spinlock을 썼는데, 코어 수가 늘면서 *공정성 문제*가 드러났다. 어떤 CPU가 cache line을 가까이 두고 있으면 그 CPU만 계속 락을 잡는 *starvation*. 해결책으로 도입한 게 **ticket lock** — 책의 Bakery 알고리즘의 직계 후손.

```text
// include/asm-generic/qspinlock_types.h (개념)
struct ticket_lock {
    atomic_t next_ticket;     // 다음 번호표
    atomic_t now_serving;     // 현재 호명 중인 번호
};

void lock(ticket_lock* l) {
    int my_ticket = atomic_fetch_add(&l->next_ticket, 1);
    while (atomic_load(&l->now_serving) != my_ticket)
        cpu_relax();   // PAUSE instruction
}

void unlock(ticket_lock* l) {
    atomic_fetch_add(&l->now_serving, 1);
}
```

빵집과 다른 점: *(번호, 스레드ID)* 사전식 비교가 필요 없다. `fetch_add`가 atomic이라 같은 번호가 두 번 발급될 일이 없기 때문. 하드웨어 RMW 덕분에 Bakery보다 훨씬 단순.

### MCS lock — cache-line bouncing 해결

Ticket lock은 모든 CPU가 *같은* `now_serving` 변수를 spin한다. 락이 풀릴 때마다 모든 코어의 캐시 라인이 무효화되어 *cache-line bouncing*이 폭증. **MCS lock** (Mellor-Crummey & Scott, 1991)은 각 스레드가 *자기 로컬* 노드를 spin하게 만들어 이를 해결.

```text
스레드 A의 lock:
1. 자기 노드(MCSNode A)를 글로벌 tail에 swap으로 enqueue
2. 이전 tail이 nullptr이면 즉시 락 획득
3. 이전 tail의 next에 자기를 연결, 그 다음 자기 노드의 locked 필드를 spin

unlock:
1. 자기 노드의 next가 nullptr이면 — 후속자 없음, tail에 CAS로 비우기
2. 그렇지 않으면 후속자의 locked = false로 깨움

각 스레드는 자기 cache line만 spin → bouncing 없음.
```

Linux qspinlock(`include/asm-generic/qspinlock.h`)은 *MCS lock + ticket lock hybrid*. 경쟁이 적을 때는 ticket처럼 빠르고, 경쟁이 많을 때는 MCS처럼 확장한다.

### Java ReentrantLock / AbstractQueuedSynchronizer

`java.util.concurrent.locks.ReentrantLock`은 내부적으로 **AbstractQueuedSynchronizer (AQS)**를 쓴다. AQS는 *CLH lock* (Craig-Landin-Hagersten, 1993)의 변형 — MCS lock의 사촌. 큐 기반 락의 직계.

```java
ReentrantLock lock = new ReentrantLock(true);  // fair=true → FCFS

lock.lock();
try {
    // critical section
} finally {
    lock.unlock();
}
```

`fair=true`로 만들면 Bakery 같은 FCFS 보장. `fair=false` (기본값)은 throughput을 위해 공정성 포기 — 갓 lock을 놓은 스레드가 다시 잡을 수 있음.

### Linux futex — kernel-assisted locking

Modern Linux의 mutex는 spinlock이 아니다. **futex (Fast Userspace Mutex)**: 경쟁이 없으면 userspace에서 atomic 한 번으로 끝, 경쟁이 있으면 kernel로 들어가 *블로킹 + 깨우기*. 글리브씨의 `pthread_mutex_t`, NPTL, `std::mutex` 모두 내부적으로 futex.

**fast path (uncontended):**

- CAS(state, 0, LOCKED) — 한 번에 성공, kernel 안 들어감

**slow path (contended):**

- futex_wait(addr, expected_value) — kernel이 깨워줄 때까지 sleep
- unlock 시 futex_wake(addr, n) — 대기 중인 n명 깨움

이 책의 spin lock과 정반대 전략: *대기 중에는 spin이 아니라 OS sleep*. Energy 친화적이고 다른 스레드가 CPU를 쓸 수 있게 양보한다.

### 데이터베이스 — row-level vs table-level lock

InnoDB, PostgreSQL의 row lock도 결국 이 장의 상호 배제다. 두 트랜잭션이 같은 row를 갱신하면 한 명이 대기. PostgreSQL은 `pg_locks` view로 현재 락 상태를 직접 볼 수 있다. *granularity*가 핵심: table 전체 락은 단순하지만 throughput 0, row 락은 복잡하지만 동시성 최대.

---

## 관련 항목

- [Chapter 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction)
- [Chapter 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects)
- [Chapter 4: Foundations of Shared Memory](/blog/parallel/parallel-principles/ch04-foundations-of-shared-memory) — Memory model
- [Chapter 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention) — 실무 락
- [C++ Concurrency in Action — Ch 3](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)

---

다음 글: [Chapter 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects)
