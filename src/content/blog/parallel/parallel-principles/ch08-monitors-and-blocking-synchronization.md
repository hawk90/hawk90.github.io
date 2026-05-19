---
title: "Chapter 8: Monitors와 Blocking Synchronization"
date: 2026-05-06T08:00:00
description: "Monitor 패턴, condition variable, semaphore, reader-writer lock. 스핀이 아닌 sleep 기반 동기화."
series: "The Art of Multiprocessor Programming"
seriesOrder: 8
tags: [parallel, concurrency, book-review, amp, monitor, condition-variable, semaphore, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 8 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 들어가며 — *잠들 권리*가 주는 효율

7장의 spinlock은 *짧게 기다리는* 도구다. 락 보유 시간이 µs 단위로 끝날 때만 빛난다. 그 임계점을 넘어서는 순간 — I/O 대기, 큰 계산, 사용자 입력, 네트워크 응답 — CPU를 *서서 돌리는* 건 사치를 넘어 손해다. 8코어 머신에 8개 스레드가 모두 spin하면 시스템은 *진짜 일을 하는 코어가 0개*인 상태가 된다.

이때 필요한 게 *잠들 권리*다. 락을 못 잡으면 OS에게 *재워 달라*고 부탁한다. OS는 그 스레드를 대기 큐에 넣고, CPU를 다른 스레드에 양보한다. 누군가 락을 풀면 *깨워 달라*고 표시해 둔다. 깨우는 비용은 µs 단위로 들지만, 그 동안 절약한 CPU 사용량이 훨씬 크다.

이 챕터의 주연은 **monitor** — Hoare가 1974년 제안한 *상호 배제 + 조건 동기화*의 결합이다. 비유로 옮기면 *예약제 회의실*이다.

| 요소 | 회의실 비유 | monitor 요소 |
|---|---|---|
| 회의실 키 | 안내 데스크에서 받는 열쇠 | mutex (한 번에 한 명만) |
| 회의실에 들어옴 | 키로 문을 열고 입장 | `lock.acquire()` |
| 조건이 안 맞으면 대기 | 회의 자료가 안 와서 *전화기 옆에서 잠들기* | `cond.wait()` (락 풀고 잠) |
| 자료가 도착하면 깨움 | 비서가 *전화로 알림* | `cond.signal()` |
| 일어나서 다시 확인 | 전화 받고 *진짜 자료 왔는지* 확인 | `while (!ready) wait()` |
| 회의실 비움 | 키 반납 | `lock.release()` |

이 비유는 *왜 `while`로 감싸야 하는가*, *왜 signal을 락 안에서 보내야 하는가*도 자연스럽게 설명한다. 비서의 전화가 *오작동*일 수도 있고(spurious wakeup), 자료가 *다른 사람한테 또 갈 수도* 있다(다른 스레드가 가로챔). 일어났다고 무조건 회의를 시작하지 말고, *반드시 자료를 다시 확인*한다.

## 8.1 스핀의 한계

7장의 스핀 락은 좋다 — 락 보유 시간이 **매우 짧을 때**.

긴 작업(I/O, 큰 계산, 사용자 입력 대기)을 락 안에서 한다면, 스핀은 CPU 낭비다.

**해법**: 락을 못 잡으면 **OS에게 잠재워 달라고 한다**. 다른 스레드가 release할 때 OS가 깨운다.

이런 락이 **blocking lock** 또는 **mutex** (OS 차원).

## 8.2 Monitor 패턴

C.A.R. Hoare가 1974년 제안한 동기화 패턴. **상호 배제 + 조건 동기화**의 결합.

```cpp
// C++20 Monitor 패턴 — Bounded Buffer
#include <mutex>
#include <condition_variable>
#include <array>
#include <optional>

template <typename T, size_t N>
class BoundedBuffer {
    std::array<T, N> items_;
    size_t head_ = 0;
    size_t tail_ = 0;
    size_t count_ = 0;

    std::mutex mtx_;
    std::condition_variable not_full_;
    std::condition_variable not_empty_;

public:
    void put(T item) {
        std::unique_lock lock(mtx_);
        not_full_.wait(lock, [this] { return count_ < N; });  // 가득 차면 대기

        items_[tail_] = std::move(item);
        tail_ = (tail_ + 1) % N;
        ++count_;

        not_empty_.notify_one();  // 대기 중인 take 깨움
    }

    T take() {
        std::unique_lock lock(mtx_);
        not_empty_.wait(lock, [this] { return count_ > 0; });  // 비어 있으면 대기

        T item = std::move(items_[head_]);
        head_ = (head_ + 1) % N;
        --count_;

        not_full_.notify_one();
        return item;
    }
};
```

```c
// C11 Monitor 패턴 — Bounded Buffer (POSIX threads)
#include <pthread.h>
#include <stdbool.h>
#include <stdlib.h>

#define BUFFER_SIZE 10

typedef struct {
    int items[BUFFER_SIZE];
    size_t head;
    size_t tail;
    size_t count;

    pthread_mutex_t mtx;
    pthread_cond_t not_full;
    pthread_cond_t not_empty;
} BoundedBuffer;

void buffer_init(BoundedBuffer* buf) {
    buf->head = 0;
    buf->tail = 0;
    buf->count = 0;
    pthread_mutex_init(&buf->mtx, NULL);
    pthread_cond_init(&buf->not_full, NULL);
    pthread_cond_init(&buf->not_empty, NULL);
}

void buffer_destroy(BoundedBuffer* buf) {
    pthread_mutex_destroy(&buf->mtx);
    pthread_cond_destroy(&buf->not_full);
    pthread_cond_destroy(&buf->not_empty);
}

void buffer_put(BoundedBuffer* buf, int item) {
    pthread_mutex_lock(&buf->mtx);

    while (buf->count == BUFFER_SIZE) {  // 가득 차면 대기
        pthread_cond_wait(&buf->not_full, &buf->mtx);
    }

    buf->items[buf->tail] = item;
    buf->tail = (buf->tail + 1) % BUFFER_SIZE;
    buf->count++;

    pthread_cond_signal(&buf->not_empty);  // 대기 중인 take 깨움
    pthread_mutex_unlock(&buf->mtx);
}

int buffer_take(BoundedBuffer* buf) {
    pthread_mutex_lock(&buf->mtx);

    while (buf->count == 0) {  // 비어 있으면 대기
        pthread_cond_wait(&buf->not_empty, &buf->mtx);
    }

    int item = buf->items[buf->head];
    buf->head = (buf->head + 1) % BUFFER_SIZE;
    buf->count--;

    pthread_cond_signal(&buf->not_full);
    pthread_mutex_unlock(&buf->mtx);
    return item;
}
```

**Monitor의 두 요소**:

1. **Lock** — 한 번에 한 스레드만 메서드 실행
2. **Condition Variable** — 조건이 안 맞으면 대기, 다른 스레드가 깨움

### Monitor의 lock+condition 짝 vs Java synchronized

책의 monitor는 *명시적 lock + 명시적 condition*이다. Java의 `synchronized` 블록은 같은 개념이지만 *암묵적*이다.

```text
Hoare/Herlihy-Shavit monitor:
  lock.lock()
  while (!ready) condition.await()
  // ...
  lock.unlock()

Java synchronized 모델:
  synchronized(obj) {
    while (!ready) obj.wait();
    // ...
  }
  obj.notifyAll();
```

Java의 `Object`는 *모든 객체*가 monitor를 내장한다. lock과 condition이 객체 자체에 묶여 있고, condition은 *하나뿐*이다. 그래서 다른 조건을 기다리는 스레드들을 분리할 수 없다 — 결국 `notifyAll()`로 모두 깨워야 한다.

Java 5 이후 `java.util.concurrent.locks.ReentrantLock`이 *명시적* lock과 *다수의 Condition*을 제공해 이 한계를 푼다. 책이 다루는 monitor 모델과 정확히 일치한다.

## 8.3 Condition Variable

> **비유** — 알람 시계. 회의실에 들어왔지만 *자료가 안 왔다*. 자료가 도착하면 깨워 달라고 알람을 *맞추고* 잠든다. 자료 가져오는 사람이 알람을 *울리면* 깨어난다. 알람의 핵심은 *잠들 때 회의실 키를 일단 놓는다*는 것. 그래야 자료 가진 사람이 회의실에 들어와 자료를 놓고 알람을 울릴 수 있다. 깨어나면 다시 키를 받아 입장한다.

```cpp
// C++20 Condition Variable 인터페이스
#include <mutex>
#include <condition_variable>

class ConditionExample {
    std::mutex mtx_;
    std::condition_variable cv_;
    bool condition_ = false;

public:
    void wait_for_condition() {
        std::unique_lock lock(mtx_);
        cv_.wait(lock, [this] { return condition_; });  // 락 놓고 대기, 깨어나면 락 재획득
        // 조건 만족 — 작업 진행
    }

    void signal_condition() {
        {
            std::lock_guard lock(mtx_);
            condition_ = true;
        }
        cv_.notify_one();   // 대기 중인 한 스레드 깨움
        // cv_.notify_all(); // 모두 깨움
    }
};
```

```c
// C11 (POSIX) Condition Variable
#include <pthread.h>
#include <stdbool.h>

typedef struct {
    pthread_mutex_t mtx;
    pthread_cond_t cv;
    bool condition;
} ConditionExample;

void cond_init(ConditionExample* c) {
    pthread_mutex_init(&c->mtx, NULL);
    pthread_cond_init(&c->cv, NULL);
    c->condition = false;
}

void cond_wait_for(ConditionExample* c) {
    pthread_mutex_lock(&c->mtx);
    while (!c->condition) {  // 항상 while로 확인
        pthread_cond_wait(&c->cv, &c->mtx);  // 락 놓고 대기
    }
    // 조건 만족 — 작업 진행
    pthread_mutex_unlock(&c->mtx);
}

void cond_signal(ConditionExample* c) {
    pthread_mutex_lock(&c->mtx);
    c->condition = true;
    pthread_cond_signal(&c->cv);  // 한 스레드 깨움
    // pthread_cond_broadcast(&c->cv);  // 모두 깨움
    pthread_mutex_unlock(&c->mtx);
}
```

`wait()`의 미묘함 — 락을 **놓아준다**. 그래야 다른 스레드가 들어와서 조건을 바꿀 수 있으니까.

```
스레드 A: lock.acquire()
A:        while not condition: cv.wait()  ← 락 놓고 잠
스레드 B: lock.acquire()  ← 가능 (A가 락 놓았으므로)
B:        condition = true; cv.signal()
B:        lock.release()
A:        ← cv.wait에서 깨어남, 락 재획득 시도
A:        ← 락 다시 잡음, while 재확인
A:        ... 진짜 작업
```

## 8.4 왜 `while`인가 (spurious wakeup)

> **비유** — *알람을 못 듣고 잠들어 버린다* (lost wakeup). 자료 도착 5초 전에 알람을 *맞추기 직전*이었는데, 그 사이 자료 가진 사람이 들어와 알람을 *울리고 떠났다*. 정작 나는 5초 뒤에 알람을 맞추고 잠들었으니 영원히 깨지 못한다. 해법은 두 가지가 같이 가야 한다. 알람 *맞추기 + 자료 확인*을 한 동작으로 묶고(monitor의 `wait` 의미), 깨어났을 때마다 *자료가 진짜 있는지* 재확인한다(`while`).

condition variable 사용 시 가장 흔한 실수 — `if`를 쓰는 것.

```cpp
// 잘못된 예
if (!condition_) {
    cv_.wait(lock);
}
// 처리

// 올바른 예
while (!condition_) {
    cv_.wait(lock);
}
// 처리

// C++11 이후 권장 — predicate 버전
cv_.wait(lock, [this] { return condition_; });  // 내부에서 while 처리
```

이유는 두 가지.

**1. Spurious Wakeup**

OS가 이유 없이 깨울 수 있다 (실패 신호, 신호 처리 등). 깨어났다고 조건이 만족되었다는 보장이 없다.

**2. 다른 스레드가 가로챘을 수 있다**

내가 signal로 깨어났는데, 락을 잡기 전에 다른 스레드가 먼저 잡아서 조건을 다시 바꿨을 수도 있다.

따라서 항상 **조건을 다시 확인**한다.

### Lost-wakeup hazard

책의 그림 8.6은 이 함정을 다룬다. signal을 *락 없이* 보내면:

```text
스레드 A: condition 확인 → false
[여기서 컨텍스트 스위치]
스레드 B: condition = true; signal()  ← A는 아직 wait()를 호출하지 않음!
스레드 A: wait() → 영원히 대기 (lost wakeup)
```

해법은 두 가지. 첫째, signal을 *항상 같은 락 안에서* 보낸다. 둘째, 조건은 *언제나* `while`로 재확인한다. 둘 다 지켜야 안전하다. 한쪽만으로는 부족.

C++ `std::condition_variable::notify_one()`은 락을 *요구하지 않지만*, 책의 권고와 POSIX 권고 모두 *조건 변수를 보호하는 락 안에서* signal을 보내는 것이다. 그래야 *signal 순서*와 *상태 변경 순서*가 같다.

## 8.5 Signal vs SignalAll

**notify_one()** — 대기 중인 한 스레드만 깨움.
**notify_all()** — 모두 깨움.

언제 어느 쪽을 쓰는가?

- **모두 같은 조건을 기다리고, 한 스레드만 처리 가능** → notify_one
- **여러 다른 조건을 기다리거나, 여러 스레드가 처리 가능** → notify_all

신중하지 않으면 deadlock / starvation 발생.

> "When in doubt, notify_all." — 명확하지 않으면 notify_all, 안전이 우선.

## 8.6 Semaphore

세마포어 — 카운트 기반 동기화.

```cpp
// C++20 Counting Semaphore
#include <semaphore>

std::counting_semaphore<10> sem(10);  // 초기 카운트 10

void use_resource() {
    sem.acquire();      // 카운트 감소 (0이면 대기)
    // ... 자원 사용 ...
    sem.release();      // 카운트 증가
}

// Binary Semaphore (= mutex)
std::binary_semaphore bin_sem(1);
```

```c
// C11 (POSIX) Semaphore
#include <semaphore.h>

sem_t sem;

void sem_example_init(void) {
    sem_init(&sem, 0, 10);  // 초기 카운트 10
}

void use_resource(void) {
    sem_wait(&sem);     // 카운트 감소 (0이면 대기)
    // ... 자원 사용 ...
    sem_post(&sem);     // 카운트 증가
}
```

**Binary Semaphore** (count = 0 or 1) = mutex.
**Counting Semaphore** = N개의 자원 풀.

### Counting Semaphore from Monitor (책 Listing 8.13)

semaphore가 *기본 동기화 도구가 아닐 때*는 monitor로 직접 만들 수 있다. 책은 이를 monitor의 일반성을 보이는 예로 든다.

```cpp
// Monitor로 구현한 Counting Semaphore
#include <mutex>
#include <condition_variable>

class CountingSemaphore {
    std::mutex mtx_;
    std::condition_variable cv_;
    int count_;
    const int max_count_;

public:
    explicit CountingSemaphore(int initial, int max_count = INT_MAX)
        : count_(initial), max_count_(max_count) {}

    void acquire() {
        std::unique_lock lock(mtx_);
        cv_.wait(lock, [this] { return count_ > 0; });
        --count_;
    }

    void release() {
        std::lock_guard lock(mtx_);
        if (count_ < max_count_) {
            ++count_;
            cv_.notify_one();
        }
    }

    bool try_acquire() {
        std::lock_guard lock(mtx_);
        if (count_ <= 0) return false;
        --count_;
        return true;
    }
};
```

핵심 — `acquire`는 *count > 0*을 기다리고, `release`는 count를 늘리고 한 명을 깨운다. 단일 condition으로 충분한 이유는 *모두가 같은 조건*(count > 0)을 기다리기 때문이다.

반대로 `BoundedBuffer`처럼 *두 다른 조건*(not_full, not_empty)이 있으면 condition을 둘로 분리해야 한다. 단일 condition으로 가능하지만 `notify_all`만 가능하고 비효율.

```text
조건의 수 = condition variable의 수
한 condition으로 N개 다른 조건을 다루려면 → notify_all + while로 재검사
별도 condition으로 분리하면 → notify_one으로 정확히 한 명만 깨움 (효율)
```

```cpp
// 연결 풀 예제 (C++20)
#include <semaphore>

class ConnectionPool {
    std::counting_semaphore<100> slots_;
    // ... 실제 연결 관리 ...

public:
    ConnectionPool(int max_connections)
        : slots_(max_connections) {}

    Connection acquire() {
        slots_.acquire();           // 슬롯 잡기 (없으면 대기)
        return get_connection();
    }

    void release(Connection conn) {
        return_connection(conn);
        slots_.release();           // 슬롯 반환
    }
};
```

## 8.7 Reader-Writer Lock

> **비유** — *도서관 열람실*. 책을 *읽는* 사람은 여럿이 함께 있을 수 있다. 같은 책을 동시에 보아도 서로 방해하지 않는다. 그러나 *책 내용을 수정*하는 사서가 들어오는 순간 모든 독자는 일단 나가 있어야 한다. 사서가 *혼자* 작업한 뒤 나오면 다시 독자들이 들어온다. 읽기는 *공유 모드*, 쓰기는 *단독 모드*. 읽기 비율이 압도적으로 높을 때 큰 이득이 있다.

읽기는 여러 스레드 동시 OK, 쓰기는 단독.

```cpp
// C++17 shared_mutex (Reader-Writer Lock)
#include <shared_mutex>
#include <vector>

class ThreadSafeData {
    std::vector<int> data_;
    mutable std::shared_mutex mtx_;

public:
    // 읽기 — 여러 스레드 동시 가능
    int read(size_t index) const {
        std::shared_lock lock(mtx_);  // shared (read) lock
        return data_[index];
    }

    // 쓰기 — 단독
    void write(size_t index, int value) {
        std::unique_lock lock(mtx_);  // exclusive (write) lock
        data_[index] = value;
    }

    size_t size() const {
        std::shared_lock lock(mtx_);
        return data_.size();
    }
};
```

```c
// C11 (POSIX) pthread_rwlock
#include <pthread.h>
#include <stdlib.h>

typedef struct {
    int* data;
    size_t size;
    pthread_rwlock_t rwlock;
} ThreadSafeData;

void data_init(ThreadSafeData* d, size_t size) {
    d->data = malloc(sizeof(int) * size);
    d->size = size;
    pthread_rwlock_init(&d->rwlock, NULL);
}

void data_destroy(ThreadSafeData* d) {
    pthread_rwlock_destroy(&d->rwlock);
    free(d->data);
}

// 읽기 — 여러 스레드 동시 가능
int data_read(ThreadSafeData* d, size_t index) {
    pthread_rwlock_rdlock(&d->rwlock);  // read lock
    int value = d->data[index];
    pthread_rwlock_unlock(&d->rwlock);
    return value;
}

// 쓰기 — 단독
void data_write(ThreadSafeData* d, size_t index, int value) {
    pthread_rwlock_wrlock(&d->rwlock);  // write lock
    d->data[index] = value;
    pthread_rwlock_unlock(&d->rwlock);
}
```

**사용 시점**:
- 읽기가 쓰기보다 압도적으로 많을 때
- 읽기 작업이 충분히 길어서 동시 실행 이득이 클 때

**함정** — Writer Starvation. 읽기가 끊임없이 들어오면 writer가 영원히 못 잡을 수도 있다. **fairness policy**(reader 도착 시 대기 중 writer가 있으면 양보) 필요.

### Reader Preference 구현 (책 Listing 8.6)

reader가 항상 우선이라면 writer는 굶을 수 있다. 그러나 reader-heavy 워크로드에서는 throughput이 최대.

```cpp
// Reader Preference RW Lock — monitor로 직접 구현
#include <mutex>
#include <condition_variable>

class ReaderPreferRWLock {
    std::mutex mtx_;
    std::condition_variable cv_;
    int readers_ = 0;
    bool writer_ = false;

public:
    void read_lock() {
        std::unique_lock lock(mtx_);
        cv_.wait(lock, [this] { return !writer_; });
        ++readers_;
    }

    void read_unlock() {
        std::lock_guard lock(mtx_);
        if (--readers_ == 0) cv_.notify_all();
    }

    void write_lock() {
        std::unique_lock lock(mtx_);
        // writer는 readers와 다른 writer 모두 끝날 때까지 대기
        cv_.wait(lock, [this] { return !writer_ && readers_ == 0; });
        writer_ = true;
    }

    void write_unlock() {
        std::lock_guard lock(mtx_);
        writer_ = false;
        cv_.notify_all();
    }
};
```

writer는 *readers_ == 0*을 기다린다. 그 사이 새 reader가 와도 읽기를 시작한다 — writer가 무기한 대기.

### FIFO RW Lock (책 Listing 8.9)

FIFO 정책 — 도착 순서대로. writer starvation 방지.

```cpp
// FIFO RW Lock — writer가 큐에 들어오면 새 reader는 대기
#include <mutex>
#include <condition_variable>

class FairRWLock {
    std::mutex mtx_;
    std::condition_variable cv_;
    int active_readers_ = 0;
    int waiting_writers_ = 0;
    bool active_writer_ = false;

public:
    void read_lock() {
        std::unique_lock lock(mtx_);
        // 대기 중인 writer가 있으면 양보
        cv_.wait(lock, [this] {
            return !active_writer_ && waiting_writers_ == 0;
        });
        ++active_readers_;
    }

    void read_unlock() {
        std::lock_guard lock(mtx_);
        if (--active_readers_ == 0) cv_.notify_all();
    }

    void write_lock() {
        std::unique_lock lock(mtx_);
        ++waiting_writers_;
        cv_.wait(lock, [this] {
            return !active_writer_ && active_readers_ == 0;
        });
        --waiting_writers_;
        active_writer_ = true;
    }

    void write_unlock() {
        std::lock_guard lock(mtx_);
        active_writer_ = false;
        cv_.notify_all();
    }
};
```

핵심은 reader의 wait 조건에 `waiting_writers_ == 0`을 추가한 것. writer가 줄을 섰으면 reader는 양보.

### Java ReentrantReadWriteLock 비교

| 항목 | C++ `std::shared_mutex` | Java `ReentrantReadWriteLock` |
|---|---|---|
| Fairness 옵션 | 없음 (구현 정의) | 생성자 `new ReentrantReadWriteLock(true)` |
| Reentrant | 없음 (held이면 deadlock) | 같은 스레드 다시 잡기 OK |
| Downgrade (write→read) | 없음 | 가능 — write 잡고 read 잡고 write 푼다 |
| Upgrade (read→write) | 없음 | 없음 (deadlock 위험) |

Java의 reentrant + downgrade가 monitor 패턴과 잘 어울린다. 책의 reader-writer 변형이 정확히 Java JUC의 토대.

## 8.8 C++20/23 동기화 기능 비교

| 개념 | C++20/23 | C11 (POSIX) |
|---|---|---|
| Mutex | `std::mutex` | `pthread_mutex_t` |
| Recursive Mutex | `std::recursive_mutex` | `pthread_mutex_t` (PTHREAD_MUTEX_RECURSIVE) |
| Timed Mutex | `std::timed_mutex` | `pthread_mutex_timedlock` |
| Condition Variable | `std::condition_variable` | `pthread_cond_t` |
| Semaphore | `std::counting_semaphore` (C++20) | `sem_t` |
| Binary Semaphore | `std::binary_semaphore` (C++20) | `sem_t` (초기값 1) |
| RW Lock | `std::shared_mutex` (C++17) | `pthread_rwlock_t` |
| Latch | `std::latch` (C++20) | 직접 구현 |
| Barrier | `std::barrier` (C++20) | `pthread_barrier_t` |

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

```cpp
// C++20 Producer-Consumer with two condition variables
#include <mutex>
#include <condition_variable>
#include <queue>
#include <optional>

template <typename T>
class BlockingQueue {
    std::queue<T> queue_;
    size_t capacity_;

    mutable std::mutex mtx_;
    std::condition_variable not_full_;
    std::condition_variable not_empty_;

public:
    explicit BlockingQueue(size_t capacity) : capacity_(capacity) {}

    void put(T item) {
        std::unique_lock lock(mtx_);
        not_full_.wait(lock, [this] { return queue_.size() < capacity_; });

        queue_.push(std::move(item));
        not_empty_.notify_one();
    }

    T take() {
        std::unique_lock lock(mtx_);
        not_empty_.wait(lock, [this] { return !queue_.empty(); });

        T item = std::move(queue_.front());
        queue_.pop();
        not_full_.notify_one();
        return item;
    }

    // Non-blocking try versions
    bool try_put(T item) {
        std::lock_guard lock(mtx_);
        if (queue_.size() >= capacity_) return false;
        queue_.push(std::move(item));
        not_empty_.notify_one();
        return true;
    }

    std::optional<T> try_take() {
        std::lock_guard lock(mtx_);
        if (queue_.empty()) return std::nullopt;
        T item = std::move(queue_.front());
        queue_.pop();
        not_full_.notify_one();
        return item;
    }
};
```

```c
// C11 (POSIX) Producer-Consumer
#include <pthread.h>
#include <stdlib.h>
#include <stdbool.h>

#define QUEUE_CAPACITY 100

typedef struct {
    int* data;
    size_t head;
    size_t tail;
    size_t count;
    size_t capacity;

    pthread_mutex_t mtx;
    pthread_cond_t not_full;
    pthread_cond_t not_empty;
} BlockingQueue;

void queue_init(BlockingQueue* q, size_t capacity) {
    q->data = malloc(sizeof(int) * capacity);
    q->head = 0;
    q->tail = 0;
    q->count = 0;
    q->capacity = capacity;
    pthread_mutex_init(&q->mtx, NULL);
    pthread_cond_init(&q->not_full, NULL);
    pthread_cond_init(&q->not_empty, NULL);
}

void queue_destroy(BlockingQueue* q) {
    pthread_mutex_destroy(&q->mtx);
    pthread_cond_destroy(&q->not_full);
    pthread_cond_destroy(&q->not_empty);
    free(q->data);
}

void queue_put(BlockingQueue* q, int item) {
    pthread_mutex_lock(&q->mtx);

    while (q->count == q->capacity) {
        pthread_cond_wait(&q->not_full, &q->mtx);
    }

    q->data[q->tail] = item;
    q->tail = (q->tail + 1) % q->capacity;
    q->count++;

    pthread_cond_signal(&q->not_empty);
    pthread_mutex_unlock(&q->mtx);
}

int queue_take(BlockingQueue* q) {
    pthread_mutex_lock(&q->mtx);

    while (q->count == 0) {
        pthread_cond_wait(&q->not_empty, &q->mtx);
    }

    int item = q->data[q->head];
    q->head = (q->head + 1) % q->capacity;
    q->count--;

    pthread_cond_signal(&q->not_full);
    pthread_mutex_unlock(&q->mtx);
    return item;
}
```

두 condition variable — full/empty 각각. signal로 정확히 필요한 쪽만 깨움.

## 8.11 시스템 사례 — monitor가 살아있는 곳

monitor 패턴은 거의 모든 동기화 라이브러리의 골격이다.

**pthread mutex + cond — POSIX의 표준**

POSIX는 monitor를 *두 객체로 분리*해 제공한다. `pthread_mutex_t`와 `pthread_cond_t`. 짝을 맞춰 쓰는 책임은 사용자에게 있다.

```text
pthread_mutex_t / pthread_cond_t 핵심 API:
  pthread_mutex_lock(&m);
  while (!ready) pthread_cond_wait(&c, &m);   // 락을 atomically 풀고 잠
  // ... 일 ...
  pthread_mutex_unlock(&m);

  // 깨우는 쪽:
  pthread_mutex_lock(&m);
  ready = true;
  pthread_cond_signal(&c);                     // 락 안에서 signal 권장
  pthread_mutex_unlock(&m);
```

`pthread_cond_wait`이 *락 해제와 잠들기*를 한 동작으로 묶는다. 이게 monitor를 *언어 구조 없이* 구현하는 유일한 방법이다. 별도 API였다면 lost wakeup은 막을 수 없다.

리눅스에서는 `pthread_cond_t`가 *futex* 위에 얹혀 있다. fast path는 사용자 공간 atomic, 실제 잠들기는 kernel.

**Java synchronized + wait/notify — 언어 통합 monitor**

Java는 monitor를 *모든 Object*에 내장한다. `synchronized` 키워드가 mutex를, `Object.wait()/notify()`가 condition variable을 제공한다. 별도의 자료형이 없다.

```java
// Java monitor — Object 자체에 내장
class BoundedBuffer {
    private final Object[] items;
    private int head, tail, count;
    BoundedBuffer(int n) { items = new Object[n]; }

    public synchronized void put(Object x) throws InterruptedException {
        while (count == items.length) wait();    // this의 monitor에 잠
        items[tail] = x;
        tail = (tail + 1) % items.length;
        count++;
        notifyAll();                              // 모든 대기 스레드 깨움
    }

    public synchronized Object take() throws InterruptedException {
        while (count == 0) wait();
        Object x = items[head];
        head = (head + 1) % items.length;
        count--;
        notifyAll();
        return x;
    }
}
```

한계는 *condition이 객체당 하나*라는 것. not_full과 not_empty를 분리할 수 없어 `notifyAll`로 모두 깨우고 각자 재검사해야 한다. 이 한계를 풀기 위해 Java 5는 `java.util.concurrent.locks.ReentrantLock`과 `Condition`을 도입했다 — 명시적 monitor.

**C++20 std::condition_variable — RAII와 predicate**

C++은 POSIX를 따르되 RAII와 predicate 람다로 미세 실수를 줄였다.

```cpp
std::unique_lock<std::mutex> lock(mtx);
cv.wait(lock, [this] { return ready; });   // 내부에서 while 처리
```

`wait`의 두 번째 인자가 predicate. *spurious wakeup으로 깨어도* predicate가 false면 다시 잠든다. 사용자가 `while`을 잊어도 라이브러리가 처리한다.

**Go — channel이 곧 monitor**

Go는 monitor를 *직접 제공하지 않지만*, channel이 사실상 같은 역할을 한다. 송신은 buffer 가득 차면 잠들고, 수신은 빈 buffer면 잠든다. select 문이 condition variable의 역할.

```text
Go channel 의미론 (개념):
  ch <- x       → buffer 가득 차면 goroutine 잠 (put + cond_wait)
  x := <-ch     → buffer 비면 goroutine 잠 (take + cond_wait)
  내부 구현      → runtime의 hchan + mutex + sema
```

| 시스템 | mutex + cond 표현 | 특이점 |
|---|---|---|
| POSIX pthread | 별도 두 객체 | 짝 맞추기 사용자 책임 |
| Java synchronized | Object 내장 | condition 하나뿐, `notifyAll` 의존 |
| Java JUC Lock | 명시적 Lock + Condition | 다중 condition, fairness 옵션 |
| C++20 std::* | mutex + condition_variable | RAII + predicate |
| Go | hchan (사용자 보이지 않음) | 언어 차원의 channel |

API는 다르지만 *세 가지 핵심 의무*는 같다. 잠들기 전 락을 atomic하게 푼다. 깨어나면 condition을 재확인한다. signal/notify는 락 안에서 보낸다.

## 정리

- **Blocking sync** — 스핀이 아닌 OS 도움 동기화
- **Monitor 패턴** — Lock + Condition Variable
- `wait()`는 **항상 `while` 안에서** (spurious wakeup) — C++에서는 predicate 버전 권장
- **Semaphore** — 카운트 기반 (C++20 `std::counting_semaphore`)
- **Reader-Writer Lock** — 읽기 동시 / 쓰기 단독 (C++17 `std::shared_mutex`)
- 짧은 락은 스핀, 긴 락은 blocking — **adaptive mutex**가 절충

## 한국 개발자의 함정

```
1. *if (cond) wait()* — 가장 흔한 버그
   - Spurious wakeup으로 깨어남
   - 다시 잠들지 않고 진행 → race
   - 해결: *while (cond) wait()* 또는 predicate 버전

2. *notify_one() = 깨운 스레드가 즉시 실행*
   - 실제: signal 후 락 해제까지 기다림
   - Mesa semantics (C++, POSIX)

3. *notify_one vs notify_all*
   - notify_one: 하나만 깨움 (효율, 위험)
   - notify_all: 모두 깨움 (안전, 비효율)
   - 안전이 의심되면 notify_all

4. *shared_mutex로 무조건 성능 향상*
   - Reader가 많을 때만 이득
   - 짧은 critical section은 mutex가 빠름
```

## 실무 적용

```
이론 → 실무:
- Monitor pattern    → std::mutex + std::condition_variable
- Condition variable → pthread_cond_t (C), std::condition_variable (C++)
- Semaphore          → std::counting_semaphore (C++20), sem_t (POSIX)
- RWLock             → std::shared_mutex (C++17), pthread_rwlock_t

C++20 새 기능:
- std::counting_semaphore, std::binary_semaphore
- std::latch (일회성 카운트다운)
- std::barrier (재사용 가능한 동기점)

흔한 패턴:
- Producer-Consumer (bounded buffer)
- Reader-Writer (DB index)
- Barrier (parallel computation)
```

## 자기 점검

```
□ while vs if (wait)의 차이?
□ Spurious wakeup 정의?
□ Mesa vs Hoare semantics?
□ Semaphore vs Monitor 사용 자리?
□ Reader-Writer의 starvation 위험?
```

## 다음 장 예고

다음 장부터 자료구조 차원의 동시성 — **Linked List** 락 다루기.

## 관련 항목

- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention)
- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [C++ Concurrency in Action Ch 4: Synchronization](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
