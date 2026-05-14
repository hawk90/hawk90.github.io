---
title: "Chapter 1: Threads and Locks"
date: 2026-05-22T01:00:00
description: "가장 익숙하지만 가장 위험한 모델 — Java synchronized, deadlock, 메모리 가시성, 합성 불가."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 1
tags: [parallel, concurrency, book-review, threads, locks, java]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 1 요약

## 1.1 왜 가장 먼저 락인가

Butcher가 락을 가장 먼저 다루는 이유 — **모든 다른 모델이 락에 대한 반작용**이다. 락의 한계를 알아야 다른 모델의 가치를 안다.

```
역사:
1960s: 락 등장
1980s: 락의 한계 인식
1990s: 함수형 / Actor 부활
2000s: STM, CSP 부활
2010s: 분산 모델
```

## 1.2 Mutual Exclusion — Java synchronized

가장 단순한 락.

```java
class Counter {
    private int count = 0;
    
    public synchronized void increment() {
        count++;
    }
    
    public synchronized int get() {
        return count;
    }
}
```

`synchronized` 키워드 — 메서드 진입 시 락 획득, 나갈 때 해제. 한 번에 한 스레드만.

## 1.3 메모리 가시성

락의 두 번째 역할 — **메모리 가시성**.

```java
class Visibility {
    private boolean done = false;
    
    // Thread 1
    public void worker() {
        while (!done) { /* busy wait */ }
    }
    
    // Thread 2
    public void stop() {
        done = true;  // 💥 다른 스레드에 보이지 않을 수 있음
    }
}
```

JVM이 `done`을 캐시에 두면 다른 스레드는 변경을 못 본다.

**해결**:
1. `synchronized` 메서드 안에서 접근
2. `volatile` 키워드
3. `AtomicBoolean`

```java
private volatile boolean done = false;  // 모든 스레드가 최신값을 봄
```

## 1.4 Deadlock — 락의 가장 큰 위험

```java
class Account {
    private final Object lock = new Object();
    private int balance;
    
    public void transfer(Account other, int amount) {
        synchronized (this.lock) {
            synchronized (other.lock) {  // 💥 deadlock 위험
                this.balance -= amount;
                other.balance += amount;
            }
        }
    }
}

// 시나리오:
// Thread A: a.transfer(b, 100)  → a.lock 잡음 → b.lock 대기
// Thread B: b.transfer(a, 50)   → b.lock 잡음 → a.lock 대기
// → 영원히 대기
```

### 회피 — 락 순서 고정

```java
public void transfer(Account other, int amount) {
    Account first = this.id < other.id ? this : other;
    Account second = first == this ? other : this;
    
    synchronized (first.lock) {
        synchronized (second.lock) {
            // ...
        }
    }
}
```

모든 스레드가 *같은 순서*로 락을 잡으면 deadlock 불가.

## 1.5 wait / notify — Condition

락 + 조건 동기화.

```java
class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;
    
    public synchronized void put(T item) throws InterruptedException {
        while (queue.size() == capacity) {
            wait();  // 락 풀고 대기
        }
        queue.add(item);
        notifyAll();  // 대기 중인 take 깨움
    }
    
    public synchronized T take() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();
        }
        T item = queue.poll();
        notifyAll();
        return item;
    }
}
```

`while`이 핵심 — spurious wakeup 대비. `if`로 쓰면 버그.

## 1.6 java.util.concurrent

Java 5+의 *재발견된* 도구들.

```java
// ReentrantLock — synchronized보다 유연
Lock lock = new ReentrantLock();
lock.lock();
try {
    // critical section
} finally {
    lock.unlock();
}

// tryLock — deadlock 회피
if (lock.tryLock(1, SECONDS)) {
    try { /* ... */ } finally { lock.unlock(); }
}

// ReadWriteLock — 읽기 동시
ReadWriteLock rwl = new ReentrantReadWriteLock();
rwl.readLock().lock();  // 동시 가능

// Concurrent Collections
Map<K,V> map = new ConcurrentHashMap<>();
Queue<T> q = new ConcurrentLinkedQueue<>();
```

대부분의 경우 `synchronized` + concurrent collections로 충분.

## 1.7 Atomic Variables

CAS 기반의 lock-free.

```java
AtomicInteger counter = new AtomicInteger(0);

counter.incrementAndGet();    // ++counter
counter.compareAndSet(5, 10); // CAS

AtomicReference<Node> head = new AtomicReference<>();
```

락보다 빠르지만 사용 범위 좁다 — 단일 변수에 한정.

## 1.8 락의 합성 불가능성

락의 가장 깊은 문제 — **합성**이 안 된다.

```java
// 안전한 큐 두 개
Queue<Integer> q1 = synchronized queue;
Queue<Integer> q2 = synchronized queue;

// 두 큐에서 동시에 pop하고 싶다 — 어떻게?
int a = q1.poll();
int b = q2.poll();  
// 💥 atomic하지 않음. 다른 스레드가 중간에 들어옴.

// 둘을 묶는 락이 필요 → 락 순서 문제 다시 등장
```

각 객체가 자기 락을 가지면 *내부적*으로는 안전. 그러나 *조합*은 안전하지 않다.

이게 TM(트랜잭셔널 메모리)이 등장한 이유 — 합성 가능한 atomic 블록.

## 1.9 Java 외 — 다른 언어의 락

```
Python: threading.Lock, threading.RLock (GIL 때문에 효용 제한)
C++:    std::mutex, std::shared_mutex, std::atomic
Go:     sync.Mutex, sync.RWMutex (그러나 channel을 더 권장)
Ruby:   Mutex (GVL 때문에 GIL과 유사)
Rust:   std::sync::Mutex (Send/Sync로 컴파일 타임 안전성)
```

## 1.10 락의 패턴 — Producer/Consumer

```java
class WorkQueue<T> {
    private final BlockingQueue<T> queue = 
        new LinkedBlockingQueue<>(100);  // 표준 라이브러리 사용
    
    public void produce(T item) throws InterruptedException {
        queue.put(item);
    }
    
    public T consume() throws InterruptedException {
        return queue.take();
    }
}
```

대부분의 락 사용은 표준 라이브러리에 캡슐화. 직접 wait/notify 쓰는 일은 *드물어야* 한다.

## 정리

- **락**은 *상호 배제 + 메모리 가시성*을 제공
- **Deadlock**의 4조건 — 상호 배제, 점유 대기, 비선점, 순환 대기
- **wait/notify**는 *while* 안에서 (spurious wakeup)
- **java.util.concurrent**가 대부분의 사용 사례 대체
- 락의 가장 큰 문제는 **합성 불가**
- 다른 6개 모델이 락의 한계를 다른 방식으로 회피

## 한국 개발자의 함정

```
1. *synchronized = 만능*이라는 오해
   - 합성 불가 + 성능 한계
   - 더 좋은 도구 많음 (concurrent collections)

2. *volatile = atomic*이라는 혼동
   - volatile: *가시성*만
   - atomic: *원자성* (CAS)
   - 카운터엔 AtomicInteger 필수

3. *wait/notify 직접 사용*
   - 거의 항상 BlockingQueue / Semaphore가 더 명확
   - 직접 쓰면 버그 잠재력

4. *deadlock은 디자인 시간에 막을 수 있다*
   - 락 그래프 분석 필요
   - 그러나 실제로는 매우 어려움
   - 코드 리뷰 + 정적 분석 필수

5. *Lock-free = 빠름*
   - CAS 경합 심하면 락보다 느림
   - 측정 필요
```

## 실무 적용

```
이론 → 실무:
- synchronized       → 짧은 임계 영역
- ReentrantLock      → tryLock, fairness 필요시
- ReadWriteLock      → 읽기 압도적일 때
- ConcurrentHashMap  → thread-safe map (락 직접 X)
- AtomicInteger      → 카운터 / 플래그
- BlockingQueue      → producer-consumer

언어별:
- Java:   java.util.concurrent
- C++:    std::mutex + thread-safe wrappers
- Go:     sync.Mutex (그러나 channel 우선)
- Rust:   Mutex<T> + Arc (컴파일 타임 안전성)
- Python: threading + GIL 의식
```

## 자기 점검

```
□ synchronized와 volatile 역할 차이?
□ Deadlock 4조건과 회피법?
□ wait가 *while* 안에 들어가야 하는 이유?
□ 락의 *합성 불가* 의미?
□ ConcurrentHashMap이 synchronizedMap보다 빠른 이유?
```

## 다음 장 예고

Ch 2 — **Functional Programming**. 불변성으로 동시성을 *제거*하는 길.

## 관련 항목

- [Ch 2: Functional Programming](/blog/parallel/seven-concurrency-models/ch02-functional-programming)
- [C++ Concurrency in Action Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
- [AMP Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention)
