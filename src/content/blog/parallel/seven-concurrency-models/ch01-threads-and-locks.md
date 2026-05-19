---
title: "Chapter 1: Threads and Locks"
date: 2026-05-06T01:00:00
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

Paul Butcher의 책은 한 챕터를 **세 개의 Day**로 나눕니다. Day 1은 기본기, Day 2는 한 단계 위의 도구, Day 3은 표준 라이브러리와 고수준 패턴입니다. 1장의 Day 구성은 다음과 같습니다.

| Day | 주제 | 핵심 도구 |
|-----|------|----------|
| Day 1 | Mutual Exclusion and Memory Models | `synchronized`, `volatile`, `AtomicInteger` |
| Day 2 | Beyond Intrinsic Locks | `ReentrantLock`, `Condition`, hand-over-hand |
| Day 3 | On the Shoulders of Giants | `java.util.concurrent`, `ExecutorService`, Fork/Join |
| Wrap-Up | 강점·약점 정리 | 다음 6개 모델로 가는 다리 |

이 글도 같은 순서를 따라갑니다.

## 1.1 왜 가장 먼저 락인가

Butcher가 락을 가장 먼저 다루는 이유는 분명합니다. **모든 다른 모델이 락에 대한 반작용**이기 때문입니다. 락의 한계를 알아야 함수형, Actor, CSP, STM, 데이터 병렬, 람다 아키텍처가 왜 등장했는지 이해할 수 있습니다.

| 시대 | 흐름 |
|------|------|
| 1960s | 락 등장 |
| 1980s | 락의 한계 인식 |
| 1990s | 함수형 / Actor 부활 |
| 2000s | STM, CSP 부활 |
| 2010s | 분산 모델 |

Butcher는 락을 *낡은 기술*이라고 깎아내리지 않습니다. 오히려 락이 하드웨어와 가장 가깝게 매핑되며, 다른 모든 모델의 구현 바닥에 결국 락이 자리한다는 점을 인정합니다. 우리가 풀려는 문제는 락이 아니라 *락을 직접 다루는 일*입니다.

## Day 1 — Mutual Exclusion and Memory Models

Day 1은 가장 익숙한 도구로 시작합니다. Java의 `synchronized` 키워드입니다.

## 1.2 Mutual Exclusion — Java synchronized

책의 첫 예제는 카운터입니다. 여러 스레드가 같은 정수를 증가시키는 가장 단순한 시나리오입니다.

```java
class Counter {
    private int count = 0;

    public void increment() {
        count++;
    }

    public int getCount() {
        return count;
    }
}
```

이 코드를 두 스레드에서 각각 10,000번씩 호출하면 결과가 20,000이어야 하지만, 실제로는 거의 항상 더 작은 값이 나옵니다. `count++`은 단일 연산이 아니라 *읽기 — 더하기 — 쓰기*의 세 단계이기 때문입니다.

```text
Thread A: load count (=5)
Thread B: load count (=5)
Thread A: add 1     (local=6)
Thread B: add 1     (local=6)
Thread A: store 6
Thread B: store 6   ← 한 번의 증가가 사라짐
```

책의 표현으로는 *두 일을 한 번에 하려고 한다(Two Things at Once)*는 문제입니다. 해결은 `synchronized` 키워드입니다.

```java
class Counter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

`synchronized` 메서드는 객체 자신(`this`)을 락으로 사용합니다. 메서드에 진입할 때 monitor를 획득하고, 나갈 때 해제합니다. 한 번에 한 스레드만 들어올 수 있으므로 *읽기 — 더하기 — 쓰기*가 원자적으로 묶입니다.

블록 단위 락도 가능합니다.

```java
public void increment() {
    synchronized (this) {
        count++;
    }
}
```

이 둘은 동일하게 동작합니다. 객체 단위 monitor 한 개만 잡습니다.

## 1.3 메모리 가시성과 Memory Model

락의 두 번째 역할이 등장합니다. **메모리 가시성**입니다.

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

JVM이 `done`을 캐시에 두면 다른 스레드는 변경을 못 봅니다. Java Memory Model은 *동기화가 없는 한* 한 스레드의 쓰기가 다른 스레드에 *언젠가* 보일지를 보장하지 않습니다. 컴파일러, JIT, 하드웨어 어느 단계에서나 명령 재배치가 일어날 수 있습니다.

세 가지 해결책이 있습니다.

| 방법 | 비용 | 적합한 경우 |
|------|------|-----------|
| `synchronized` | 락 획득/해제 | 복수 변수의 atomic 갱신 |
| `volatile` | 캐시 강제 동기화만 | 단일 변수의 가시성 |
| `AtomicXxx` | CAS | 단일 변수의 원자적 read-modify-write |

`volatile`은 락이 아닙니다. *원자성*은 주지 않고 *가시성*만 줍니다.

```java
private volatile boolean done = false;  // 모든 스레드가 최신값을 봅니다
```

`done = true` 한 번의 쓰기는 `volatile`로 충분합니다. 그러나 `count++`은 *읽기 — 더하기 — 쓰기*가 한 묶음이어야 하므로 `volatile`로는 부족합니다. 이때 `AtomicInteger`가 들어옵니다.

```java
import java.util.concurrent.atomic.AtomicInteger;

class Counter {
    private final AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet();   // 락 없이 atomic
    }

    public int getCount() {
        return count.get();
    }
}
```

`AtomicInteger`는 내부적으로 CAS(compare-and-swap) 명령을 씁니다. 락을 잡지 않고도 원자적 증가를 보장합니다. 책은 Day 1의 끝에서 `synchronized` 카운터를 `AtomicInteger`로 교체하며 *모든 경우에 락이 필요한 것은 아니라는 점*을 보여 줍니다.

`synchronized`가 *왜* 가시성을 보장하는지도 짚어 둘 만합니다. monitor의 release는 모든 쓰기를 메모리로 flush합니다. acquire는 캐시를 무효화합니다. 즉 같은 monitor를 잡는 두 스레드 사이에는 *happens-before* 관계가 성립합니다. 이는 Java Memory Model의 정의입니다.

## Day 2 — Beyond Intrinsic Locks

`synchronized`는 단순합니다. 그러나 곧 한계가 드러납니다. 락을 *시도만* 해 보고 싶다든지, 대기 중에 인터럽트를 받고 싶다든지, 여러 조건 변수를 따로 두고 싶다든지. 책의 Day 2는 이런 요구를 해결하는 `java.util.concurrent.locks` 패키지를 소개합니다.

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

모든 스레드가 *같은 순서*로 락을 잡으면 deadlock은 일어나지 않습니다.

## 1.5 ReentrantLock — tryLock과 interruptible

`synchronized`는 *반드시* 락을 잡을 때까지 대기합니다. 도중에 포기할 수도, 인터럽트를 받을 수도 없습니다. `ReentrantLock`은 두 동작 모두 제공합니다.

```java
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

class Account {
    private final Lock lock = new ReentrantLock();
    private int balance;

    public boolean transfer(Account other, int amount) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(1);
        while (System.nanoTime() < deadline) {
            if (this.lock.tryLock()) {
                try {
                    if (other.lock.tryLock()) {
                        try {
                            this.balance -= amount;
                            other.balance += amount;
                            return true;
                        } finally {
                            other.lock.unlock();
                        }
                    }
                } finally {
                    this.lock.unlock();
                }
            }
            Thread.sleep(1);   // backoff
        }
        return false;   // 포기
    }
}
```

`tryLock`은 deadlock을 *능동적으로* 회피합니다. 두 번째 락이 잡히지 않으면 첫 번째를 풀고 다시 시도합니다. 락 순서 고정이 어려운 상황의 대안입니다.

`lockInterruptibly`는 락 대기 중에 `interrupt()`에 반응합니다. UI 스레드가 사용자 취소 요청을 받을 때 유용합니다.

| 메서드 | 동작 |
|--------|------|
| `lock()` | 무한 대기. 인터럽트 무시 |
| `tryLock()` | 즉시 시도. 못 잡으면 `false` |
| `tryLock(time, unit)` | 시간만큼 대기 후 포기 |
| `lockInterruptibly()` | 대기 중 인터럽트 가능 |

`finally`에서 `unlock()`을 부르는 패턴이 필수입니다. `synchronized`는 자동으로 풀리지만 `ReentrantLock`은 그렇지 않습니다. 잊으면 락이 영원히 잡힙니다.

## 1.6 Condition — 여러 조건 변수

`synchronized` 객체는 `wait`/`notify`를 통해 *한 개의* 조건 변수를 가집니다. `ReentrantLock`은 `newCondition()`으로 *원하는 만큼* 만들 수 있습니다.

락 + 조건 동기화.

```java
class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;
    private final Lock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (queue.size() == capacity) {
                notFull.await();
            }
            queue.add(item);
            notEmpty.signal();   // take 대기자만 깨움
        } finally {
            lock.unlock();
        }
    }

    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (queue.isEmpty()) {
                notEmpty.await();
            }
            T item = queue.poll();
            notFull.signal();   // put 대기자만 깨움
        } finally {
            lock.unlock();
        }
    }
}
```

`notifyAll`과 비교했을 때의 이점은 분명합니다. `wait`/`notify`는 *한 monitor의 모든 대기자*를 깨워야 하므로 불필요한 깨움이 많습니다. `Condition`은 *생산자 대기자*와 *소비자 대기자*를 분리해 정확히 필요한 쪽만 깨웁니다.

`while`이 여전히 핵심입니다. spurious wakeup, `signal` 후 락 재획득 사이의 상태 변화, 둘 다 `if`를 위험하게 만듭니다.

## 1.7 Hand-Over-Hand Locking

책의 Day 2에서 가장 인상적인 패턴이 *hand-over-hand* 락입니다. 책은 연결 리스트 또는 계좌 이체 예제로 이를 보여 줍니다. 핵심은 *전체*를 한 락으로 묶지 않고, *현재 노드와 다음 노드*만 동시에 잡는 것입니다.

```java
class SortedList {
    private Node head;   // sentinel

    public void insert(int value) {
        Node prev = head;
        prev.lock.lock();
        Node curr = prev.next;
        try {
            curr.lock.lock();
            try {
                while (curr.value < value) {
                    prev.lock.unlock();   // prev 손을 뗀다
                    prev = curr;
                    curr = curr.next;
                    curr.lock.lock();     // 다음 손을 뻗는다
                }
                Node node = new Node(value);
                node.next = curr;
                prev.next = node;
            } finally {
                curr.lock.unlock();
            }
        } finally {
            prev.lock.unlock();
        }
    }
}
```

전체 락을 잡는 방식보다 동시성이 큽니다. 여러 스레드가 리스트의 *다른 부분*을 동시에 수정할 수 있기 때문입니다. 대신 락 순서가 까다롭고, 검증 비용이 큽니다.

이 패턴은 락 기반 동시성의 *상한*을 보여 줍니다. 잘 짜면 빠릅니다. 그러나 잘 짜기가 어렵습니다.

## 1.8 ABA 문제 — Optimistic Locking의 함정

CAS 기반 자료구조는 락을 안 쓰지만 *ABA 문제*에 노출됩니다. 어떤 변수가 A에서 B로 갔다가 다시 A로 돌아왔을 때, CAS는 *변하지 않았다*고 판단합니다. 그러나 그 사이 다른 일이 일어났을 수 있습니다.

```text
T1: head를 읽음 → A
T2: A를 pop → head=B
T2: B를 pop → head=C
T2: A를 다시 push → head=A
T1: CAS(head, A, A.next)  ← 성공하지만 A.next는 이제 무효한 노드
```

해결은 *버전 카운터*입니다. Java의 `AtomicStampedReference`가 정확히 이를 위한 도구입니다.

```java
AtomicStampedReference<Node> head = new AtomicStampedReference<>(initial, 0);

int[] stampHolder = new int[1];
Node oldHead = head.get(stampHolder);
int oldStamp = stampHolder[0];
boolean ok = head.compareAndSet(oldHead, oldHead.next, oldStamp, oldStamp + 1);
```

값과 스탬프를 한 묶음으로 CAS하면 *값이 같아도 스탬프가 다르면* 실패합니다.

## Day 3 — On the Shoulders of Giants

Day 3의 메시지는 단호합니다. *직접 `wait`/`notify`를 쓰지 마세요.* `java.util.concurrent`에 표준화된, 검증된, 더 빠른 도구가 있습니다.

## 1.9 java.util.concurrent — 표준 라이브러리

Java 5에서 Doug Lea가 들여온 `java.util.concurrent`(통칭 *j.u.c.*)는 현대 Java 동시성의 사실상 표준입니다. 책은 이 패키지의 활용을 Day 3 전체에 걸쳐 강조합니다.

`ConcurrentHashMap`은 `Collections.synchronizedMap`보다 훨씬 빠릅니다. 후자는 모든 연산을 한 락으로 직렬화하지만, 전자는 내부적으로 락 스트라이핑(또는 Java 8+의 CAS + bin 단위 락)을 써서 동시 읽기/쓰기를 허용합니다.

```java
Map<String, Integer> counts = new ConcurrentHashMap<>();
counts.merge("requests", 1, Integer::sum);     // atomic
counts.computeIfAbsent("users", k -> 0);
```

`CopyOnWriteArrayList`는 *쓰기가 드물고 읽기가 잦은* 경우에 유리합니다. 쓰기마다 전체 배열을 복사하므로 비싸지만, 읽기는 락 없이 진행됩니다. 옵저버 패턴의 리스너 목록이 전형적인 예입니다.

```java
List<Listener> listeners = new CopyOnWriteArrayList<>();
listeners.add(new Listener());           // 비쌈 (복사)
for (Listener l : listeners) l.fire();   // 락 없음, 일관된 스냅샷
```

`BlockingQueue`는 생산자-소비자 패턴의 표준 도구입니다.

| 구현 | 특징 |
|------|------|
| `LinkedBlockingQueue` | 크기 제한 옵션, 분리된 put/take 락 |
| `ArrayBlockingQueue` | 고정 용량, 단일 락 |
| `SynchronousQueue` | 용량 0, rendezvous |
| `PriorityBlockingQueue` | 우선순위 |

## 1.10 ExecutorService와 Future

스레드를 *직접* 만들지 마세요. 책의 Day 3가 반복하는 충고입니다. 스레드 풀과 작업 큐를 합친 `ExecutorService`가 거의 모든 경우에 정답입니다.

```java
ExecutorService pool = Executors.newFixedThreadPool(8);

Future<Integer> future = pool.submit(() -> {
    Thread.sleep(1000);
    return 42;
});

Integer result = future.get();   // 결과가 준비될 때까지 대기
pool.shutdown();
```

`Future`는 *언젠가 도착할 값*입니다. `get()`은 블로킹, `get(timeout, unit)`은 시간 제한, `isDone()`은 비차단 체크입니다.

여러 작업의 결과를 *도착하는 순서대로* 처리하고 싶을 때는 `CompletionService`를 씁니다.

```java
CompletionService<Result> cs = new ExecutorCompletionService<>(pool);
for (Task t : tasks) cs.submit(t);

for (int i = 0; i < tasks.size(); i++) {
    Result r = cs.take().get();   // 완료된 순서로 도착
    process(r);
}
```

`pool.invokeAll(tasks)`로 모든 결과를 *제출 순서대로* 받을 수도 있습니다. 둘은 상호 보완적입니다.

## 1.11 Fork/Join Framework

Java 7부터의 Fork/Join은 분할 정복 알고리즘에 특화된 풀입니다. 핵심 아이디어는 *워크 스틸링(work stealing)*입니다. 각 워커 스레드가 자기 deque에서 작업을 꺼내 처리하고, 비어 있으면 다른 워커의 deque에서 *훔쳐* 옵니다.

책은 `RecursiveTask`로 합을 구하는 예제를 보여 줍니다.

```java
import java.util.concurrent.RecursiveTask;
import java.util.concurrent.ForkJoinPool;

class Sum extends RecursiveTask<Long> {
    private static final int THRESHOLD = 1000;
    private final long[] data;
    private final int lo, hi;

    Sum(long[] data, int lo, int hi) {
        this.data = data; this.lo = lo; this.hi = hi;
    }

    @Override
    protected Long compute() {
        if (hi - lo <= THRESHOLD) {
            long sum = 0;
            for (int i = lo; i < hi; i++) sum += data[i];
            return sum;
        }
        int mid = (lo + hi) >>> 1;
        Sum left = new Sum(data, lo, mid);
        Sum right = new Sum(data, mid, hi);
        left.fork();                 // 비동기 실행
        long rightResult = right.compute();
        long leftResult = left.join();
        return leftResult + rightResult;
    }
}

ForkJoinPool pool = new ForkJoinPool();
long total = pool.invoke(new Sum(data, 0, data.length));
```

`fork()`는 작업을 deque에 넣습니다. `join()`은 결과를 기다립니다. 분기 비용이 락보다 훨씬 가볍기 때문에 작은 단위까지 분할할 수 있습니다. 책은 fork/join을 *Day 3의 정점*으로 다룹니다. 명시적 락은 사라지고, 모든 동기화가 풀에 캡슐화됩니다.

## 1.12 Producer/Consumer with BlockingQueue

직접 `wait`/`notify`를 쓰지 말라는 권고를 가장 잘 보여 주는 패턴이 producer/consumer입니다. 책의 Day 3는 `BlockingQueue` 한 줄로 같은 동작을 끝냅니다.

```java
BlockingQueue<WorkItem> queue = new LinkedBlockingQueue<>(100);

// Producer
new Thread(() -> {
    while (running) {
        WorkItem item = readNext();
        try {
            queue.put(item);    // 가득 차면 자동 대기
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
    }
}).start();

// Consumer
new Thread(() -> {
    while (running) {
        try {
            WorkItem item = queue.take();   // 비어 있으면 자동 대기
            process(item);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
    }
}).start();
```

수십 줄의 `wait`/`notify` 코드가 두 줄로 줄어듭니다. 더 빠르고, 더 안전합니다. 책은 이 한 줄을 *Day 3의 결론*으로 제시합니다.

## 1.13 Atomic Variables 심화

`AtomicInteger`는 단순한 카운터 이상의 기능을 합니다.

```java
AtomicInteger counter = new AtomicInteger(0);

counter.incrementAndGet();             // ++counter
counter.getAndIncrement();             // counter++
counter.compareAndSet(5, 10);          // 5라면 10으로
counter.updateAndGet(x -> x * 2);      // 함수 적용

AtomicReference<Node> head = new AtomicReference<>();
head.compareAndSet(expected, newNode); // 비검열 lock-free 스택
```

락보다 빠르지만 사용 범위는 좁습니다. *단일 변수의 원자 갱신*이라는 좁은 문제에만 맞습니다. 여러 변수를 함께 갱신해야 한다면 락이나 STM이 필요합니다.

## 1.14 락의 합성 불가능성

락의 가장 깊은 문제는 **합성**이 안 된다는 점입니다.

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

각 객체가 자기 락을 가지면 *내부적*으로는 안전합니다. 그러나 *조합*은 안전하지 않습니다.

이것이 STM(Software Transactional Memory)이 등장한 이유입니다. 합성 가능한 atomic 블록입니다. 7장에서 다룹니다.

## 1.15 Java 외 — 다른 언어의 락

| 언어 | API | 특징 |
|------|-----|------|
| Python | `threading.Lock`, `threading.RLock` | GIL 때문에 효용 제한 |
| C++ | `std::mutex`, `std::shared_mutex`, `std::atomic` | — |
| Go | `sync.Mutex`, `sync.RWMutex` | channel을 더 권장 |
| Ruby | `Mutex` | GVL 때문에 GIL과 유사 |
| Rust | `std::sync::Mutex` | `Send`/`Sync`로 컴파일 타임 안전성 |

## Wrap-Up — 강점과 약점

책의 각 챕터는 Wrap-Up에서 모델의 *강점*과 *약점*을 정리합니다. 다음 모델로 가는 다리를 놓기 위해서입니다.

### 강점

| 강점 | 설명 |
|------|------|
| Universal applicability | 거의 모든 언어, 모든 플랫폼에 존재 |
| Hardware mapping | CPU의 원자 명령, 캐시 일관성, 메모리 펜스에 직접 대응 |
| Performance ceiling | 잘 짜면 가장 빠름 (다른 모델은 결국 락 위에 구현됨) |
| Library maturity | `java.util.concurrent` 같은 검증된 도구가 풍부 |

### 약점

| 약점 | 설명 |
|------|------|
| Deadlock | 락 순서를 어기면 발생. 정적 검증이 어려움 |
| Livelock | tryLock + backoff 조합에서 발생 가능 |
| Race conditions | 락을 *빠뜨리면* 발생. 컴파일러가 못 잡아냄 |
| Composability | 안전한 두 객체를 합쳐도 안전하지 않음 |
| Cognitive load | 무엇이 무엇을 보호하는지 사람이 기억해야 함 |
| Memory model 함정 | reordering, 가시성, happens-before가 직관에 반함 |

### 다음 6개 모델로 가는 다리

책의 다음 챕터들은 각각 위 약점 *하나 이상*을 해결하려 합니다.

| 다음 모델 | 락의 어느 약점을 푸는가 |
|----------|----------------------|
| Functional Programming (Ch 2) | 가변 상태를 제거 → race 자체 없음 |
| Separating Identity and State (Ch 3) | 가변성을 명시적 STM/atom에 가둠 |
| Actors (Ch 4) | 메시지 전달로 공유 상태 제거 |
| CSP (Ch 5) | 채널 우선, 공유 메모리 회피 |
| Data Parallelism (Ch 6) | GPU/SIMD로 다른 레벨에서 병렬화 |
| Lambda Architecture (Ch 7) | 불변 데이터 + 재계산 |

락은 *사라지지* 않습니다. 모든 모델은 결국 누군가의 락 위에 서 있습니다. 그러나 *애플리케이션 개발자가 직접 다룰 일은* 점점 줄어듭니다. Day 3의 메시지가 챕터 전체의 메시지로 확장됩니다.

## 정리

- **Day 1**은 `synchronized`로 mutual exclusion과 memory visibility를 함께 잡습니다
- `count++`의 *Two Things at Once* 문제는 `synchronized` 또는 `AtomicInteger`로 해결합니다
- `volatile`은 *가시성*만, `Atomic`은 *원자성*도 제공합니다
- **Day 2**는 `ReentrantLock`, `tryLock`, `Condition`, hand-over-hand로 한 단계 위의 제어를 제공합니다
- CAS 자료구조는 *ABA 문제*에 노출되며 `AtomicStampedReference`로 회피합니다
- **Day 3**는 `java.util.concurrent`로 *직접 락 코드 작성을 거의 없앱니다*
- `ExecutorService` + `Future` + `CompletionService`, Fork/Join, `BlockingQueue`가 핵심 도구입니다
- Deadlock 4조건은 상호 배제, 점유 대기, 비선점, 순환 대기입니다
- 락의 가장 큰 한계는 **합성 불가**이며, 이것이 STM과 Actor 모델 등장의 직접 원인입니다

## 한국 개발자의 함정

1. ***synchronized = 만능*이라는 오해** — 합성 불가 + 성능 한계. 더 좋은 도구가 많다 (concurrent collections).
2. ***volatile = atomic*이라는 혼동** — `volatile`은 *가시성*만, atomic은 *원자성*(CAS). 카운터엔 `AtomicInteger` 필수.
3. ***wait/notify 직접 사용*** — 거의 항상 `BlockingQueue` / `Semaphore`가 더 명확. 직접 쓰면 버그 잠재력.
4. ***deadlock은 디자인 시간에 막을 수 있다*** — 락 그래프 분석이 이론적으로 가능하지만 실제로는 매우 어렵다. 코드 리뷰 + 정적 분석이 필수.
5. ***Lock-free = 빠름*** — CAS 경합이 심하면 락보다 느리다. 측정 필수.

## 실무 적용

**이론 → 실무**

| 도구 | 용도 |
|------|------|
| `synchronized` | 짧은 임계 영역 |
| `ReentrantLock` | `tryLock`, fairness가 필요할 때 |
| `ReadWriteLock` | 읽기가 압도적일 때 |
| `ConcurrentHashMap` | thread-safe map (락 직접 X) |
| `AtomicInteger` | 카운터 / 플래그 |
| `BlockingQueue` | producer-consumer |

**언어별 권장**

| 언어 | 도구 |
|------|------|
| Java | `java.util.concurrent` |
| C++ | `std::mutex` + thread-safe wrappers |
| Go | `sync.Mutex` (그러나 channel 우선) |
| Rust | `Mutex<T> + Arc` (컴파일 타임 안전성) |
| Python | `threading` + GIL 의식 |

## 자기 점검

- [ ] `synchronized`와 `volatile`의 역할 차이는?
- [ ] Deadlock 4조건과 회피법은?
- [ ] `wait`가 *while* 안에 들어가야 하는 이유는?
- [ ] 락의 *합성 불가*가 무슨 뜻인지?
- [ ] `ConcurrentHashMap`이 `synchronizedMap`보다 빠른 이유는?

## 다음 장 예고

Ch 2는 **Functional Programming**입니다. 불변성으로 동시성을 *제거*하는 길입니다. 락의 약점 중 race, deadlock, composability를 한 번에 해결하는 접근입니다.

## 관련 항목

- [Ch 2: Functional Programming](/blog/parallel/seven-concurrency-models/ch02-functional-programming)
- [C++ Concurrency in Action Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
- [AMP Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention)
