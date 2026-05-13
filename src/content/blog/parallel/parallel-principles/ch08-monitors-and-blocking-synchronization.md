---
title: "Chapter 8: Monitors와 Blocking Synchronization"
date: 2026-05-12
description: "Monitor 패턴, condition variable, semaphore, reader-writer lock. 스핀이 아닌 sleep 기반 동기화."
series: "The Art of Multiprocessor Programming"
seriesOrder: 8
tags: [parallel, concurrency, book-review, amp, monitor, condition-variable, semaphore]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 8 요약

## 8.1 스핀의 한계

7장의 스핀 락은 좋다 — 락 보유 시간이 **매우 짧을 때**.

긴 작업(I/O, 큰 계산, 사용자 입력 대기)을 락 안에서 한다면, 스핀은 CPU 낭비다.

**해법**: 락을 못 잡으면 **OS에게 잠재워 달라고 한다**. 다른 스레드가 release할 때 OS가 깨운다.

이런 락이 **blocking lock** 또는 **mutex** (OS 차원).

## 8.2 Monitor 패턴

C.A.R. Hoare가 1974년 제안한 동기화 패턴. **상호 배제 + 조건 동기화**의 결합.

```java
class BoundedBuffer<T> {
    items: T[N]
    count: int
    
    synchronized void put(T item):
        while count == N:        // 가득 차면 대기
            wait()
        // 추가
        count++
        notifyAll()              // 대기 중인 take 깨움
    
    synchronized T take():
        while count == 0:        // 비어 있으면 대기
            wait()
        // 꺼냄
        count--
        notifyAll()
        return item
}
```

**Monitor의 두 요소**:

1. **Lock** — 한 번에 한 스레드만 메서드 실행
2. **Condition Variable** — 조건이 안 맞으면 대기, 다른 스레드가 깨움

## 8.3 Condition Variable

```java
interface Condition {
    void await();    // 락을 풀고 대기, 깨어나면 락 재획득
    void signal();   // 대기 중인 한 스레드 깨움
    void signalAll(); // 모두 깨움
}
```

`await()`의 미묘함 — 락을 **놓아준다**. 그래야 다른 스레드가 들어와서 조건을 바꿀 수 있으니까.

```
스레드 A: lock.acquire()
A:        while not condition: cv.await()  ← 락 놓고 잠
스레드 B: lock.acquire()  ← 가능 (A가 락 놓았으므로)
B:        condition = true; cv.signal()
B:        lock.release()
A:        ← cv.await에서 깨어남, 락 재획득 시도
A:        ← 락 다시 잡음, while 재확인
A:        ... 진짜 작업
```

## 8.4 왜 `while`인가 (spurious wakeup)

condition variable 사용 시 가장 흔한 실수 — `if`를 쓰는 것.

```python
# ❌ 잘못
if not condition:
    cv.await()
# 처리

# ✅ 올바름
while not condition:
    cv.await()
# 처리
```

이유는 두 가지.

**1. Spurious Wakeup**

OS가 이유 없이 깨울 수 있다 (실패 신호, 신호 처리 등). 깨어났다고 조건이 만족되었다는 보장이 없다.

**2. 다른 스레드가 가로챘을 수 있다**

내가 signal로 깨어났는데, 락을 잡기 전에 다른 스레드가 먼저 잡아서 조건을 다시 바꿨을 수도 있다.

따라서 항상 **조건을 다시 확인**한다.

## 8.5 Signal vs SignalAll

**signal()** — 대기 중인 한 스레드만 깨움.
**signalAll()** — 모두 깨움.

언제 어느 쪽을 쓰는가?

- **모두 같은 조건을 기다리고, 한 스레드만 처리 가능** → signal
- **여러 다른 조건을 기다리거나, 여러 스레드가 처리 가능** → signalAll

신중하지 않으면 deadlock / starvation 발생.

> "When in doubt, signalAll." — 명확하지 않으면 signalAll, 안전이 우선.

## 8.6 Semaphore

세마포어 — 카운트 기반 동기화.

```java
class Semaphore:
    count: int
    
    synchronized void acquire():
        while count == 0:
            wait()
        count--
    
    synchronized void release():
        count++
        signal()
```

**Binary Semaphore** (count = 0 or 1) = mutex.
**Counting Semaphore** = N개의 자원 풀.

```
연결 풀:
semaphore = Semaphore(10)  # 동시 10개 연결 허용

사용:
sem.acquire()        # 슬롯 잡기 (없으면 대기)
connection = pool.get()
... 사용 ...
pool.release(connection)
sem.release()         # 슬롯 반환
```

## 8.7 Reader-Writer Lock

읽기는 여러 스레드 동시 OK, 쓰기는 단독.

```python
class RWLock:
    readers: int
    writer: bool
    
    def acquireRead():
        while writer: cv.await()
        readers++
    
    def releaseRead():
        readers--
        if readers == 0: cv.signalAll()
    
    def acquireWrite():
        while readers > 0 or writer: cv.await()
        writer = true
    
    def releaseWrite():
        writer = false
        cv.signalAll()
```

**사용 시점**:
- 읽기가 쓰기보다 압도적으로 많을 때
- 읽기 작업이 충분히 길어서 동시 실행 이득이 클 때

**함정** — Writer Starvation. 읽기가 끊임없이 들어오면 writer가 영원히 못 잡을 수도 있다. **fairness policy**(reader 도착 시 대기 중 writer가 있으면 양보) 필요.

## 8.8 Java / C++ 비교

| 개념 | Java | C++ |
|---|---|---|
| Mutex | `synchronized`, `ReentrantLock` | `std::mutex` |
| Condition | `wait()`, `notify()`, `notifyAll()` | `std::condition_variable` |
| Semaphore | `java.util.concurrent.Semaphore` | `std::counting_semaphore` (C++20) |
| RW Lock | `ReentrantReadWriteLock` | `std::shared_mutex` (C++17) |

## 8.9 Blocking Sync의 비용

스핀 락 vs blocking lock의 트레이드오프.

| 측면 | Spin | Blocking |
|---|---|---|
| 짧은 락 | 빠름 | 느림 (context switch) |
| 긴 락 | CPU 낭비 | 효율적 |
| 코어 < 스레드 | 위험 (deadlock 위험) | OK |
| 우선순위 역전 | 가능 | OS가 관리 |

현실에서는 **adaptive mutex**가 보편적. 짧게 스핀하다가 실패하면 sleep.

## 8.10 Producer-Consumer 패턴

Monitor의 가장 흔한 응용.

```python
class BoundedQueue<T>:
    queue: T[CAPACITY]
    count: int
    lock: Lock
    notFull: Condition
    notEmpty: Condition
    
    def put(item):
        lock.acquire()
        while count == CAPACITY:
            notFull.await()
        queue.add(item)
        count++
        notEmpty.signal()
        lock.release()
    
    def take():
        lock.acquire()
        while count == 0:
            notEmpty.await()
        item = queue.remove()
        count--
        notFull.signal()
        lock.release()
        return item
```

두 condition variable — full/empty 각각. signal로 정확히 필요한 쪽만 깨움.

## 정리

- **Blocking sync** — 스핀이 아닌 OS 도움 동기화
- **Monitor 패턴** — Lock + Condition Variable
- `await()`는 **항상 `while` 안에서** (spurious wakeup)
- **Semaphore** — 카운트 기반
- **Reader-Writer Lock** — 읽기 동시 / 쓰기 단독
- 짧은 락은 스핀, 긴 락은 blocking — **adaptive mutex**가 절충

## 다음 장 예고

다음 장부터 자료구조 차원의 동시성 — **Linked List** 락 다루기.

## 관련 항목

- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention)
- [C++ Concurrency in Action Ch 4: Synchronization](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
