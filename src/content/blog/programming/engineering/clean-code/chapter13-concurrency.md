---
title: "Ch 13: 동시성"
date: 2025-06-15T13:00:00
description: "동시성은 직관을 깬다. 분리, 캡슐화, 적은 임계 영역. Producer-Consumer, Readers-Writers 같은 표준 패턴."
tags: [CleanCode, Concurrency, Robert Martin]
series: "Clean Code"
seriesOrder: 13
---

## 이 챕터의 메시지

단일 스레드 코드의 모든 직관이 — **동시성 코드에서 깨진다**.

> "함수가 한 번에 한 번씩 실행된다"는 가장 기본적인 가정이 사라진다.

동시성 버그는 가장 찾기 어려운 종류다. 운이 좋으면 (혹은 나쁘면?) 100만 번에 한 번 발생한다. 대부분의 테스트가 통과하다가, 프로덕션에서 어느 날 한 번 시스템이 깨진다.

Martin의 권장은 두 줄로 요약된다.

- **동시성과 비즈니스 로직을 분리하라**.
- **공유 상태를 줄이고, 임계 영역을 작게 유지하라**.

## 핵심 내용

- 동시성은 **결합·복잡도·비결정성**을 추가한다. 함부로 도입 X.
- **동시성과 비즈니스 로직 분리** — 가능하면 동시성을 한 자리에 가둔다.
- **공유 데이터를 줄여라** — 공유가 없으면 동기화도 없다.
- **임계 영역(synchronized 블록)을 작게**.
- **표준 라이브러리** 동시 컬렉션을 활용.
- **테스트**가 어렵다 — 의도적 부하·반복으로 경합을 노출.

## 동시성에 대한 흔한 오해

### 미신 1: "동시성은 항상 성능을 올린다"

거짓이다. 동시성은 **여러 작업을 동시 처리**하기 위해 도입하지만, 동기화 비용·캐시 경합·컨텍스트 스위치 때문에 **단일 스레드보다 느릴 수 있다**.

- I/O 대기 시간이 길면 동시성이 유리하다 (CPU가 다른 일을 함).
- CPU-bound 코드에서 코어보다 많은 스레드를 만들면 — 오히려 느려진다.

### 미신 2: "동시성은 디자인을 안 바꾼다"

거짓이다. 단일 스레드 코드와 멀티 스레드 코드는 **다른 종류의 시스템**이다. 공유 상태, 락, 메모리 가시성, 데드락 — 모두 새 차원의 복잡도다.

### 미신 3: "프레임워크가 알아서 해 준다"

부분적으로 사실이지만 — 프레임워크의 가정을 이해하지 못하면 잘못 쓴다. `ConcurrentHashMap`을 써도, 두 번의 호출을 묶는 자리에서 락이 필요할 수 있다.

### 진실

- 동시성은 **본질적으로 복잡하다**.
- "올바르게 동작하는 듯한" 동시 코드가 사실 **잘못된 경우**가 많다.
- 동시성 버그는 **재현이 어렵다** — 가벼이 보면 안 된다.

## 동시성과 비즈니스 로직 분리

가장 큰 원칙이다. 동시성 메커니즘(스레드, 락, 큐)을 **비즈니스 로직과 섞지 마라**.

```java
// Bad — 비즈니스 로직에 동시성이 섞임
public class OrderService {
    private final Lock lock = new ReentrantLock();
    private final List<Order> orders = new ArrayList<>();

    public void process(Order order) {
        lock.lock();
        try {
            orders.add(order);
            // 비즈니스 로직 ...
            order.validate();
            order.persist();
        } finally {
            lock.unlock();
        }
    }
}
```

`OrderService`가 **두 가지 책임**을 가진다 — 주문 처리 + 동시성 관리.

### 분리

```java
// Good — 동시성은 외부에서, 비즈니스는 순수
public class OrderService {
    public void process(Order order) {
        order.validate();
        order.persist();
    }
}

// 동시성 wrapper는 별도
public class SynchronizedOrderService {
    private final OrderService service;
    private final Lock lock = new ReentrantLock();

    public void process(Order order) {
        lock.lock();
        try {
            service.process(order);
        } finally {
            lock.unlock();
        }
    }
}
```

비즈니스 로직은 깔끔하게 테스트할 수 있다 (락 없이). 동시성 wrapper는 별도로 테스트한다.

## 공유 데이터를 줄여라

> 공유가 없으면 동기화도 없다.

가장 안전한 멀티스레드 코드는 — **공유 상태가 없는 코드**다. 각 스레드가 자기 데이터만 만진다.

### 패턴 1: Thread-local

```java
ThreadLocal<DateFormat> formatter = ThreadLocal.withInitial(
    () -> new SimpleDateFormat("yyyy-MM-dd")
);
```

각 스레드가 자기 인스턴스를 가진다. 공유가 없다 — 동기화도 없다.

### 패턴 2: 불변 객체 (Immutable)

```java
public final class Point {
    private final double x;
    private final double y;
    // getter만, setter 없음
}
```

생성 후 변경 불가. 여러 스레드가 공유해도 안전하다.

### 패턴 3: 메시지 전달 (Actor 모델)

스레드 간 데이터를 직접 공유하지 않고 — **메시지를 큐로 주고받는다**. Erlang, Akka가 대표적.

```
Thread A → [Message Queue] → Thread B
```

공유 상태가 큐 하나로 갇힌다. 큐 자체만 thread-safe하면 된다.

## 임계 영역을 작게

`synchronized`를 쓸 때는 — **꼭 필요한 코드만** 안에 둔다.

```java
// Bad — 큰 임계 영역
public synchronized void process(Order order) {
    validate(order);        // 락 안에서 할 필요 X
    sendEmail(order);       // I/O — 락 안에서 매우 위험
    save(order);            // DB
}

// Good — 꼭 필요한 부분만
public void process(Order order) {
    validate(order);        // 락 없이
    sendEmail(order);
    synchronized (this) {
        save(order);        // 진짜로 공유 상태 변경하는 부분만
    }
}
```

임계 영역이 크면 — 다른 스레드가 그 동안 못 들어온다. 처리량이 떨어진다.

### 락 안에서의 외부 호출 — 데드락 위험

락 안에서 다른 객체의 메서드를 부르면 — 그 객체가 또 다른 락을 잡으려 할 수 있다. **데드락**이다.

```java
// Bad — 락 안에서 외부 호출
synchronized (objA) {
    objB.doSomething();   // objB가 objA의 다른 락을 잡으려 함 → 데드락
}
```

가능하면 **외부 호출은 락 밖에서** 한다.

## 표준 동시 컬렉션

직접 락을 짜기 전에 — 표준 라이브러리의 동시 컬렉션을 활용한다.

| Java |
| --- |
| `ConcurrentHashMap` |
| `CopyOnWriteArrayList` |
| `BlockingQueue` |
| `ConcurrentLinkedQueue` |
| `AtomicInteger`, `AtomicReference` |

| C++ |
| --- |
| `std::atomic<T>` |
| `std::mutex`, `std::lock_guard` (직접 보호) |
| Boost.LockFree, TBB concurrent containers |

| Python |
| --- |
| `queue.Queue` |
| `multiprocessing.Manager()` |

표준 컬렉션은 **검증된 코드**다. 직접 락을 짜는 것보다 안전하고 빠르다.

## 표준 동시성 패턴

흔한 동시성 시나리오들은 — 패턴 이름이 있고, 표준 도구가 있다.

### Producer-Consumer

생산자가 작업을 큐에 넣고, 소비자가 큐에서 가져간다.

```java
BlockingQueue<Task> queue = new LinkedBlockingQueue<>();

// Producer
queue.put(new Task(...));

// Consumer
Task t = queue.take();   // 비어 있으면 대기
process(t);
```

큐가 동기화를 책임진다. 생산자/소비자는 자기 일만 한다.

### Readers-Writers

다수의 읽기, 가끔의 쓰기. **ReadWriteLock**.

```java
ReadWriteLock lock = new ReentrantReadWriteLock();

// 읽기 — 다수 동시 OK
lock.readLock().lock();
try { return data.get(); } finally { lock.readLock().unlock(); }

// 쓰기 — 독점
lock.writeLock().lock();
try { data.set(...); } finally { lock.writeLock().unlock(); }
```

### Dining Philosophers

데드락 회피의 고전 문제. **자원 획득 순서 통일**이 표준 해법.

## 동시성 테스트

동시성 버그는 재현이 어렵다. **의도적 부하**가 답이다.

- **반복 실행** — 1000번, 10000번 돌려 본다.
- **스레드 수 변화** — 1, 2, 4, 8, 16. 각 환경에서 통과해야.
- **임의 지연** — `Thread.sleep` 또는 `Thread.yield`로 다른 스케줄링 시도.
- **부하 도구** — 의도적으로 CPU/메모리에 부담을 주며 테스트.

테스트가 **한 번** 통과하는 게 의미 없다. **계속** 통과해야 한다.

> 동시성 코드가 "한 번 잘 돌았다"는 보장이 아니다. 1000번 돌리고 모두 통과하는 게 시작이다.

## 정리

- 동시성은 **결합·복잡도·비결정성**을 추가한다.
- **동시성과 비즈니스 로직 분리** — 동시성은 별도 wrapper에.
- **공유 데이터를 줄여라** — 가장 안전한 동시 코드는 공유 없는 코드.
- **임계 영역을 작게** — 락 안의 외부 호출은 데드락 위험.
- **표준 동시 컬렉션·패턴** 활용.
- **반복·부하 테스트**로 경합 노출.

다음 챕터부터는 책의 후반 — **3개의 리팩토링 사례 연구**가 이어진다.

## 관련 항목

- [Ch 7: 에러 처리](/blog/programming/engineering/clean-code/chapter07-error-handling) — 예외와 동시성의 결합
- [EMC Ch 16: thread-safe const](/blog/programming/cpp/effective-modern-cpp/item16-make-const-member-functions-thread-safe) — C++에서의 const와 동시성
- [EMC Ch 35: task vs thread](/blog/programming/cpp/effective-modern-cpp/item35-prefer-task-based-programming-to-thread-based) — 추상 단위 선택
- [EMC Ch 40: atomic vs volatile](/blog/programming/cpp/effective-modern-cpp/item40-use-std-atomic-for-concurrency-volatile-for-special-memory) — 동시성 도구의 정확한 사용
