---
title: "Bakery 알고리즘"
date: 2026-05-12
description: "N-스레드 상호 배제의 고전적 해결책. Lamport의 Bakery Algorithm 동작 원리. 번호표 기반 공정한 동기화."
series: "Parallel Programming Principles"
seriesOrder: 13
tags: [parallel, concurrency, mutual-exclusion, bakery, lamport, synchronization]
type: tech
---

## 빵집의 번호표

**Bakery 알고리즘**(1974)은 Leslie Lamport가 고안한 **N-스레드** 상호 배제 알고리즘이다.

이름의 유래: 빵집에서 번호표를 뽑고 순서대로 서비스받는 것과 같다.

```
손님 A: 번호표 1번
손님 B: 번호표 2번
손님 C: 번호표 3번

서비스 순서: A → B → C
```

Peterson의 알고리즘이 2-스레드에 한정된 반면, Bakery는 **임의의 N-스레드**에서 동작한다.

---

## 알고리즘

```cpp
const int N = 10;                  // 스레드 수
bool choosing[N] = {false};        // 번호표 뽑는 중?
int number[N] = {0};               // 각 스레드의 번호표

void lock(int id) {
    // 1단계: 번호표 뽑기
    choosing[id] = true;
    number[id] = 1 + max(number[0], ..., number[N-1]);
    choosing[id] = false;

    // 2단계: 차례 기다리기
    for (int j = 0; j < N; j++) {
        // 상대가 번호표 뽑는 중이면 기다림
        while (choosing[j]) { }

        // 상대 번호가 더 작거나, 같으면 ID로 비교
        while (number[j] != 0 &&
               (number[j] < number[id] ||
                (number[j] == number[id] && j < id))) {
            // 대기
        }
    }
}

void unlock(int id) {
    number[id] = 0;                // 번호표 반납
}
```

---

## 동작 원리

### 번호표 뽑기 (1단계)

```cpp
choosing[id] = true;
number[id] = 1 + max(number[0], ..., number[N-1]);
choosing[id] = false;
```

- `choosing[id] = true`: "나 지금 번호표 뽑는 중"
- 현재 가장 큰 번호 + 1을 선택
- `choosing[id] = false`: "번호표 뽑기 완료"

**왜 `choosing` 플래그가 필요한가?**

번호표 뽑기가 **원자적이지 않기** 때문이다.

```
스레드 A: number[A] = 1 + max(...) 계산 중... (아직 쓰기 전)
스레드 B: number[A]를 읽음 → 0 (아직 안 써짐)
스레드 B: number[B] = 1 (A보다 작은 번호!)
```

`choosing` 플래그로 "번호표 계산 중"임을 표시한다.

### 차례 기다리기 (2단계)

```cpp
for (int j = 0; j < N; j++) {
    while (choosing[j]) { }  // 상대 번호표 확정까지 대기

    while (number[j] != 0 &&
           (number[j] < number[id] ||
            (number[j] == number[id] && j < id))) {
        // 내 번호가 더 크면 대기
    }
}
```

두 가지를 확인:

1. **상대가 번호표 뽑는 중인가?** → 기다린다
2. **상대 번호가 나보다 작은가?** → 기다린다

### 번호가 같은 경우

동시에 번호표를 뽑으면 같은 번호가 나올 수 있다.

```
스레드 A: max = 0, number[A] = 1
스레드 B: max = 0, number[B] = 1
```

이 경우 **스레드 ID로 타이브레이크**:

```cpp
(number[j] == number[id] && j < id)
```

ID가 작은 스레드가 먼저 진입한다.

---

## 실행 예시

3개 스레드가 동시에 락을 요청:

```
초기 상태:
choosing = [false, false, false]
number   = [0, 0, 0]

스레드 0: choosing[0] = true
스레드 1: choosing[1] = true
스레드 2: choosing[2] = true

스레드 0: number[0] = 1 + max(0,0,0) = 1
스레드 1: number[1] = 1 + max(0,0,0) = 1  // 동시에 읽어서 같은 값
스레드 2: number[2] = 1 + max(0,0,0) = 1

스레드 0: choosing[0] = false
스레드 1: choosing[1] = false
스레드 2: choosing[2] = false

비교:
스레드 0: number[0]=1, number[1]=1 → ID 비교 → 0 < 1 → 0이 먼저
스레드 0: number[0]=1, number[2]=1 → ID 비교 → 0 < 2 → 0이 먼저
스레드 0: 임계 영역 진입

스레드 1: number[0]=1 ≤ number[1]=1, 0 < 1 → 대기
스레드 2: number[0]=1 ≤ number[2]=1, 0 < 2 → 대기

스레드 0: unlock → number[0] = 0

스레드 1: number[0]=0 → 패스
스레드 1: number[1]=1, number[2]=1 → ID 비교 → 1 < 2 → 1이 먼저
스레드 1: 임계 영역 진입

...
```

---

## 정확성 증명

### 상호 배제 증명

**귀류법**: 스레드 A와 B가 동시에 임계 영역에 있다고 가정.

스레드 A가 진입하려면 B의 while 조건을 통과해야 한다:
- `number[B] == 0` **또는**
- `(number[A], A) < (number[B], B)` (사전식 순서)

스레드 B가 진입하려면 A의 while 조건을 통과해야 한다:
- `number[A] == 0` **또는**
- `(number[B], B) < (number[A], A)`

두 스레드 모두 `number > 0`이므로, 첫 조건은 성립 안 함.

따라서:
- `(number[A], A) < (number[B], B)` **그리고**
- `(number[B], B) < (number[A], A)`

사전식 순서는 **전순서(total order)**이므로, 두 조건이 동시에 참일 수 없다. **모순**.

∎

### 기아 자유 증명

스레드 A가 무한히 대기한다고 가정.

A가 번호표를 뽑은 후:
- A보다 작은 번호를 가진 스레드들은 유한 시간 내에 임계 영역을 통과
- A보다 나중에 번호표를 뽑은 스레드들은 A보다 큰 번호를 가짐

따라서 A보다 작은 번호의 스레드가 모두 통과하면 A가 진입.

번호는 유한하게 증가하지 않는가? **그렇다**.
- 하지만 항상 유한 개의 스레드만 락을 요청
- 모든 스레드가 unlock하면 번호가 리셋됨

∎

---

## 구현 세부사항

### C++11 구현

```cpp
#include <atomic>
#include <vector>
#include <algorithm>

class BakeryLock {
private:
    int n;
    std::vector<std::atomic<bool>> choosing;
    std::vector<std::atomic<int>> number;

public:
    explicit BakeryLock(int num_threads)
        : n(num_threads),
          choosing(num_threads),
          number(num_threads) {
        for (int i = 0; i < n; i++) {
            choosing[i].store(false, std::memory_order_relaxed);
            number[i].store(0, std::memory_order_relaxed);
        }
    }

    void lock(int id) {
        // 번호표 뽑기
        choosing[id].store(true, std::memory_order_seq_cst);

        int max_number = 0;
        for (int j = 0; j < n; j++) {
            int num = number[j].load(std::memory_order_seq_cst);
            if (num > max_number) max_number = num;
        }
        number[id].store(max_number + 1, std::memory_order_seq_cst);

        choosing[id].store(false, std::memory_order_seq_cst);

        // 차례 기다리기
        for (int j = 0; j < n; j++) {
            while (choosing[j].load(std::memory_order_seq_cst)) {
                // 스핀
            }

            while (true) {
                int nj = number[j].load(std::memory_order_seq_cst);
                int ni = number[id].load(std::memory_order_seq_cst);

                if (nj == 0) break;
                if (nj > ni) break;
                if (nj == ni && j >= id) break;
                // 대기
            }
        }
    }

    void unlock(int id) {
        number[id].store(0, std::memory_order_seq_cst);
    }
};
```

---

## 특성과 한계

### 장점

| 특성 | 설명 |
|-----|------|
| N-스레드 지원 | 임의의 스레드 수 |
| 기아 자유 | FCFS (First-Come, First-Served) |
| 하드웨어 독립 | 특별한 원자적 명령어 불필요 |
| 공정성 | 번호 순서대로 진입 |

### 단점

| 단점 | 설명 |
|-----|------|
| O(N) 공간 | 스레드당 두 개의 변수 |
| O(N) 시간 | 락 획득 시 모든 스레드 확인 |
| 번호 오버플로우 | 이론적으로 무한 증가 가능 |
| 바쁜 대기 | CPU 낭비 |

### 번호 오버플로우 문제

```
스레드가 계속 번호표를 뽑으면:
number = 1, 2, 3, ..., INT_MAX, ???
```

**실제로는** 모든 스레드가 unlock하면 max가 줄어들어 실용상 문제없다.

**이론적으로는** 무한한 번호가 필요하다 (Unbounded Timestamp).

---

## 현대적 변형

### Black-White Bakery Algorithm

번호 오버플로우를 해결한 변형. 색상(black/white)을 번갈아 사용하여 번호를 재사용.

### Bounded Timestamps

유한한 숫자로 전순서를 유지하는 방법. 복잡하지만 실용적.

---

## Peterson vs Bakery

| 특성 | Peterson | Bakery |
|-----|----------|--------|
| 스레드 수 | 2 | N |
| 공간 | O(1) | O(N) |
| 시간 | O(1) | O(N) |
| 공정성 | 없음 | FCFS |
| 기아 자유 | 제한적 | 완전 |

---

## 실전에서의 가치

Bakery 알고리즘도 실전에서 직접 쓸 일은 드물다.

하지만 이해해야 하는 이유:

1. **FCFS 동기화의 원형**: 공정한 락의 개념적 기초
2. **분산 시스템과의 연결**: Lamport Clock, Logical Timestamp의 기원
3. **하드웨어 지원 없는 동기화**: 최소한의 가정으로 무엇이 가능한지

---

## 핵심 요약

| 특성 | Bakery |
|-----|--------|
| 스레드 수 | N |
| 상호 배제 | ✓ |
| 데드락 자유 | ✓ |
| 기아 자유 | ✓ |
| 공정성 | FCFS |
| 공간 복잡도 | O(N) |
| 시간 복잡도 | O(N) |

---

## 연습 문제

1. **번호 오버플로우**: `number`가 `INT_MAX`에 도달하면 어떻게 되는가? 실제 시스템에서 이 문제가 발생할 가능성은?

2. **동시 번호표**: 세 스레드가 정확히 같은 시점에 번호표를 뽑으면 모두 같은 번호를 받는가?

3. **공정성 검증**: 스레드 0이 항상 먼저 락을 요청하면, 스레드 1은 얼마나 기다려야 하는가?

4. **확장성**: 스레드 수가 1000개면 Bakery 알고리즘의 성능은 어떤가?

---

## 다음 단계

Peterson과 Bakery 알고리즘은 **소프트웨어만으로** 상호 배제를 구현하는 방법을 보여줬다.

하지만 현대 시스템에서는 **하드웨어 지원**을 사용한다:

- **원자적 명령어**: `test-and-set`, `compare-and-swap`
- **메모리 펜스**: 재배치 방지
- **캐시 일관성**: 코어 간 동기화

다음 글에서는 이러한 **원자적 연산**을 알아본다.

---

다음 글: [Part 2-04: 원자적 연산](/blog/parallel/parallel-principles/part2-04-atomic-operations)
