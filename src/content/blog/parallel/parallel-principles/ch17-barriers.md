---
title: "Chapter 17: Barriers"
date: 2026-05-12
description: "Barrier 동기화 — 여러 스레드가 같은 지점에서 만남. Sense-reversing, combining tree, dissemination."
series: "The Art of Multiprocessor Programming"
seriesOrder: 17
tags: [parallel, concurrency, book-review, amp, barrier]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
---

> **The Art of Multiprocessor Programming** Chapter 17 요약

## 17.1 Barrier란

**Barrier** — N 개의 스레드가 모두 도착할 때까지 기다리는 동기화 지점.

```python
b = Barrier(N)

# 각 스레드:
work_phase_1()
b.await()      # 모두가 phase 1 완료까지 대기
work_phase_2() # 이제 모두 phase 2 시작
b.await()
work_phase_3()
```

병렬 알고리즘에서 자주 등장. **Bulk Synchronous Parallel** (BSP) 모델의 핵심.

```
Phase:    ───────────────────────────────────────────
Thread 1: ── compute ──┤barrier├── compute ──┤barrier├──
Thread 2: ── compute ──┤  ↓   ├── compute ──┤  ↓   ├──
Thread 3: ──── compute ┤ wait ├──── compute ┤ wait ├──
Thread 4: ── compute ──┤      ├── compute ──┤      ├──
```

모두가 phase 1 끝나야 phase 2 시작. 데이터 의존성이 phase 경계에 모임.

## 17.2 단순 Barrier — Counter

```python
class SimpleBarrier:
    counter: AtomicInt
    total: int
    
    def await():
        if counter.atomicAdd(1) == total - 1:
            counter = 0     # 마지막이 리셋
        else:
            while counter != 0: pass  # 대기
```

**문제**:

- counter에 대한 atomic add → 경합
- 모두가 같은 counter를 spin → cache line bouncing
- 재사용 시 race condition (counter가 0 되기 전에 다른 스레드가 진입)

## 17.3 Sense-Reversing Barrier

재사용 문제를 해결하는 클래식 패턴.

```python
class SenseBarrier:
    counter: AtomicInt
    total: int
    sense: bool = false
    local_sense: ThreadLocal of bool = false
    
    def await():
        local_sense = not local_sense  # 뒤집기
        if counter.atomicDec() == 0:
            counter = total            # 리셋
            sense = local_sense        # 깨움
        else:
            while sense != local_sense: pass
```

**핵심 아이디어** — sense 비트가 매 phase마다 뒤집힘. 스레드가 다음 phase로 가면 자기 local_sense도 뒤집어서 비교.

```
Phase 1: sense=false, 모두 wait until sense=false → 즉시 통과
        마지막이 sense를 true로 → 모두 풀려남
Phase 2: 다음 await에서 local_sense를 true로 → wait until sense=true
        ...
```

재사용 안전. 그러나 여전히 sense 변수에 모두가 spin — cache bouncing.

## 17.4 Combining Tree Barrier

12장의 combining tree와 같은 아이디어.

```
        루트
       /    \
      ●      ●        
     / \    / \
    T1  T2 T3  T4
```

리프(스레드)에서 시작해 루트까지 올라간다. 마지막이 도착하면 루트가 wake up.

각 노드에서 경합은 자식 수만큼만 (보통 2). 전체 경합이 O(N) → O(log N).

**장점**: 경합 분산.
**단점**: 깊이 O(log N) → 지연시간 증가.

## 17.5 Dissemination Barrier

가장 효율적인 알고리즘 — Hensgen, Finkel, Manber 1988.

```
Round 0: 스레드 i가 스레드 (i+1) mod N에게 신호
Round 1: 스레드 i가 스레드 (i+2) mod N에게 신호
Round 2: 스레드 i가 스레드 (i+4) mod N에게 신호
...
Round k: 스레드 i가 스레드 (i+2^k) mod N에게 신호
```

```
4 스레드, log₂(4) = 2 rounds:

Round 0:
T0 → T1
T1 → T2
T2 → T3
T3 → T0

Round 1:
T0 → T2
T1 → T3
T2 → T0
T3 → T1
```

**O(log N) 단계**로 모든 스레드가 모든 스레드의 도착을 알게 된다.

**장점**:
- 매 통신이 두 스레드 사이 — 경합 없음
- 캐시 친화적 (적은 cache line)
- O(log N) 단계

가장 빠른 barrier로 알려짐.

## 17.6 Static Tree Barrier

각 스레드가 자기 부모와 자식만 본다.

```
        T0 (root)
       /   \
      T1    T2
     / \    / \
    T3 T4  T5 T6
```

각 스레드:
1. 자기 자식들이 도착했는지 확인
2. 부모에게 도착 신호
3. 부모가 풀어줄 때까지 대기 (wake-up phase)

**장점**: 각 스레드가 자기 노드만 spin — false sharing 없음.
**단점**: O(log N) 깊이, 두 phase (도착 + 깨우기).

## 17.7 Barrier 비교

| 알고리즘 | 단계 | 경합 | 비고 |
|---|---|---|---|
| Simple Counter | 1 | O(N) | 단순 |
| Sense-Reversing | 1 | O(N) | 재사용 안전 |
| Combining Tree | O(log N) | O(1) per level | 경합 분산 |
| Dissemination | O(log N) | 거의 0 | 가장 빠름 |
| Static Tree | O(log N) | 거의 0 | 메모리 친화 |

실용적으로는 **Sense-Reversing**이 가장 흔함 (단순 + 충분히 빠름). 매우 큰 N (HPC)에서는 dissemination.

## 17.8 Barrier의 사용 패턴

**1. Iterative Algorithms**

```python
for iteration in range(MAX_ITER):
    for tile in my_tiles:
        compute_iteration(tile)
    barrier.await()  # 다음 iter 전에 모두 동기화
```

- 행렬 계산
- 시뮬레이션 (셀룰러 오토마타)
- 머신러닝 (gradient descent의 batch)

**2. Phase Synchronization**

```python
phase_1_work()
barrier.await()  # 모두 phase 1 완료
phase_2_work()
barrier.await()
phase_3_work()
```

- 파이프라인 변환
- 멀티 패스 알고리즘

**3. Coarse-grain Parallelism**

전체 시스템 차원의 동기화. GPU에서 매우 흔함.

## 17.9 GPU와 Barrier

GPU 프로그래밍에서 barrier는 핵심 도구.

- **`__syncthreads()`** (CUDA) — 같은 block 내 모든 thread 동기화
- **`__syncwarp()`** — warp 내 동기화

GPU의 SIMT 모델에서 barrier가 정확한 데이터 흐름을 보장. 잘못 쓰면 **deadlock 또는 잘못된 결과**.

## 17.10 Java/C++ Barrier

| 언어 | API |
|---|---|
| Java | `java.util.concurrent.CyclicBarrier` |
| Java | `java.util.concurrent.Phaser` (더 유연) |
| C++20 | `std::barrier` |
| C++ (이전) | `pthread_barrier_t` (POSIX) |

대부분 sense-reversing 또는 dissemination 기반.

## 정리

- **Barrier** — N 스레드가 같은 지점에서 만나는 동기화
- **Simple counter** → cache bouncing
- **Sense-reversing** — 재사용 안전 (가장 흔함)
- **Combining tree** — 경합 분산
- **Dissemination** — 매 통신이 두 스레드, 가장 빠름
- **Static tree** — false sharing 없음
- 응용 — iterative algorithms, BSP, GPU

## 다음 장 예고

마지막 장 — **Transactional Memory**. 락 없는 atomic block의 약속.

## 관련 항목

- [Ch 16: Work Stealing](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention) — 비슷한 캐시 이슈
