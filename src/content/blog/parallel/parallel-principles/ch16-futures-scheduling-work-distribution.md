---
title: "Chapter 16: Future, Scheduling, Work Distribution"
date: 2026-05-12
description: "Future로 동시성 표현, work stealing으로 부하 분산. Fork-Join 패턴."
series: "The Art of Multiprocessor Programming"
seriesOrder: 16
tags: [parallel, concurrency, book-review, amp, future, work-stealing, fork-join]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
---

> **The Art of Multiprocessor Programming** Chapter 16 요약

## 16.1 Future — 동시성 추상화

Future는 **아직 완료되지 않은 계산의 결과**를 표현한다.

```python
class Future<T>:
    def get(): T   # 결과 기다림 (블록)
    def isDone(): bool

# 사용
future = compute_async()
# ... 다른 일 하다가 ...
result = future.get()
```

스레드의 lower-level 추상화. 결과가 어디서 어떻게 계산되는지는 future가 숨김.

C++의 `std::future`, Java의 `Future<T>`, JavaScript의 `Promise`, Rust의 `Future` 트레잇 — 모두 같은 아이디어.

## 16.2 Future의 가치

스레드를 직접 다루는 것보다 future가 좋은 이유.

**1. 합성 가능**

```python
f1 = compute_a()
f2 = compute_b()
result = combine(f1.get(), f2.get())
```

여러 future를 묶어 더 큰 계산을 표현.

**2. 백엔드 독립**

같은 future API 위에 다른 실행 모델 — 스레드 풀, 워크 큐, async runtime 등.

**3. 에러 처리**

future가 예외/실패를 캡처해 `get()`에서 전파.

## 16.3 Fork-Join 패턴

병렬 알고리즘의 기본 구조.

```python
def parallel_sum(arr, start, end):
    if end - start < THRESHOLD:
        return sequential_sum(arr, start, end)
    
    mid = (start + end) // 2
    
    # Fork
    left = fork(parallel_sum, arr, start, mid)
    right = parallel_sum(arr, mid, end)  # 현재 스레드에서
    
    # Join
    return left.get() + right
```

- **Fork** — 작업을 둘로 쪼개고 한 쪽을 다른 스레드에 위임
- **Join** — 두 결과를 기다려 합침

병렬 정렬, 병렬 reduce, 병렬 검색 등이 모두 이 패턴.

## 16.4 작업 분산의 문제

Fork-join을 효율적으로 실행하려면.

**스레드 풀** — 미리 정해진 수의 스레드가 작업을 처리.

```
Thread Pool:
  T1: [task_a, task_b, ...]
  T2: [task_c, task_d, ...]
  T3: [task_e, ...]
  T4: [...]
```

각 스레드가 작업 큐를 가진다. 새 작업이 들어오면 어느 큐로?

## 16.5 단순 분산 — Centralized Queue

```
모든 스레드가 같은 글로벌 큐에서 가져감.
```

**장점**: 부하 자동 균형.
**단점**: 글로벌 큐가 hot spot.

스레드 수가 많아지면 큐 자체가 병목.

## 16.6 Work Stealing

Cilk 프로젝트 (Blumofe & Leiserson, 1999)의 핵심 알고리즘.

**아이디어**:
- 각 스레드가 자기 작업 큐 (deque)를 가짐
- 자기 큐에 작업 추가 / 처리 — 한 쪽 끝 (bottom)에서
- **다른 스레드 큐**에서 훔칠 때 — 반대 끝 (top)에서

```
Thread 1 deque: [task_a, task_b, task_c]
                 ↑ top                 ↑ bottom
                 │                     │
              Steal!                Thread 1이 push/pop
              (다른 스레드가)
```

**장점**:
- 자기 큐에 대한 작업은 거의 경합 없음 (혼자 bottom 만짐)
- 부하가 불균형하면 다른 스레드가 훔쳐 가서 균형
- O(N)에 가까운 스케일링

## 16.7 Work Stealing의 디테일

### Push/Pop (자기 큐)

bottom에서.

```python
def push_local(task):
    deque[bottom] = task
    bottom++

def pop_local():
    bottom--
    return deque[bottom]
```

대부분 락 없이 가능 (혼자 만지니까). 다만 top에서 steal이 동시에 일어날 수 있어서 — bottom과 top이 만나면 CAS로 처리.

### Steal (다른 스레드의 큐)

top에서.

```python
def steal(victim_deque):
    while True:
        top = victim_deque.top
        bottom = victim_deque.bottom
        if top >= bottom:
            return null  # 비어 있음
        task = victim_deque[top]
        if victim_deque.cas_top(top, top + 1):
            return task
```

CAS로 top을 진행. 여러 도둑이 동시에 시도하면 한 명만 성공.

### Random Victim 선택

```python
def steal_attempt():
    victim = random_thread()
    return steal(victim.deque)
```

랜덤한 다른 스레드의 큐를 훔침. 결국 모든 스레드가 비슷한 부하.

## 16.8 Work Stealing의 성능 분석

이론적 결과 (Blumofe & Leiserson).

- 작업 T_1 = 단일 스레드에 걸리는 시간
- 작업 T_∞ = 무한 스레드에 걸리는 시간 (critical path)
- P 스레드에 걸리는 시간 T_P:

$$
T_P \leq \frac{T_1}{P} + O(T_\infty)
$$

즉 work stealing은 **거의 최적**에 가까운 스케일링을 보장.

병목은 critical path (T_∞)에 있음. critical path가 짧은 작업일수록 병렬화 효과 크다.

## 16.9 실제 구현체

Work stealing은 모든 모던 동시성 런타임의 기반.

| 시스템 | 언어 |
|---|---|
| Cilk | C/C++ extension |
| Java Fork/Join | Java 7+ |
| Intel TBB | C++ |
| Rayon | Rust |
| Tokio | Rust async |
| Go runtime | Go (goroutine 스케줄러) |
| .NET TPL | C# |

각각 디테일은 다르지만 핵심 알고리즘은 work stealing.

## 16.10 Continuation Stealing

ABP (Arora, Blumofe, Plaxton) work stealing — 호출자 측 작업을 훔쳐 감.

```python
def parent_task():
    f = fork(child_task)        # child 위임
    do_some_work()              # parent 계속
    result = f.get()
```

전통적 — child를 위임. parent가 계속 함.
ABP — fork 즉시 child가 현재 스레드에서 실행. parent의 나머지가 위임될 수 있음.

이게 stack을 더 효율적으로 쓰는 변형. Cilk가 이 방식.

## 16.11 균형 잡힌 작업 vs 불균형

Work stealing의 좋은 점 — **불균형한 작업에 강함**.

```
순진한 분할:
- 작업을 P개로 나눠 각 스레드에 분배
- 한 스레드의 작업이 일찍 끝나면 idle

Work stealing:
- 짧은 작업 끝낸 스레드가 다른 큐에서 훔침
- 모든 스레드가 끝까지 일함
```

불균형이 클수록 work stealing 이득이 큼. 균형이 잘 잡힌 작업이면 정적 분배도 OK.

## 정리

- **Future** — 비동기 계산의 추상화, 합성 가능
- **Fork-Join** — 작업을 쪼개고 합치는 병렬 패턴
- **Work Stealing** — 각 스레드 자기 큐 + 비면 훔침
- **거의 최적** 스케일링 보장 (Blumofe & Leiserson 결과)
- 모든 모던 동시성 런타임의 기반 (Cilk, TBB, Java Fork/Join, Rust Tokio, Go scheduler)
- **불균형 작업**에 특히 강함

## 다음 장 예고

다음 장은 **Barriers** — 여러 스레드가 한 시점에서 동기화하는 패턴.

## 관련 항목

- [Ch 15: Priority Queue](/blog/parallel/parallel-principles/ch15-priority-queues)
- [C++ Concurrency in Action Ch 4: Future](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
- [C++ Concurrency in Action Ch 9: Thread Pool](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
