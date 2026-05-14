---
title: "Ch 11: Testing and debugging multithreaded applications"
date: 2026-05-20T11:00:00
description: "ThreadSanitizer, 재현 가능성, 시뮬레이션 테스트, 동시성 버그 분류."
tags: [C++, C, Concurrency, Testing, Debugging, ThreadSanitizer]
series: "C++ Concurrency in Action"
seriesOrder: 11
draft: false
---

동시성 버그는 재현이 어렵고 디버깅이 까다롭다. 이 장에서는 동시성 코드의 테스트와 디버깅 기법을 다룬다.

## 11.1 동시성 버그의 종류

### 버그 분류

**동시성 버그 유형**

- **Data Race** — 동시에 같은 메모리 접근 (적어도 하나는 쓰기)
- **Race Condition** — 실행 순서에 따라 결과가 달라짐
- **Deadlock** — 스레드들이 서로 대기하며 영원히 멈춤
- **Livelock** — 스레드들이 계속 작업하지만 진행이 없음
- **Starvation** — 특정 스레드가 영원히 자원을 못 얻음
- **Priority Inversion** — 높은 우선순위 스레드가 낮은 우선순위에 의해 차단

### Data Race vs Race Condition

```cpp
// Data Race: 동기화 없이 동시 접근
int counter = 0;

void thread1() { counter++; }  // 💥 Data race
void thread2() { counter++; }

// Race Condition: 동기화했지만 순서에 따라 결과 다름
std::mutex mtx;
bool initialized = false;
Resource* resource = nullptr;

void thread1() {
    std::lock_guard lock(mtx);
    resource = new Resource();
    initialized = true;
}

void thread2() {
    std::lock_guard lock(mtx);
    if (initialized) {
        resource->use();  // 💥 Race condition: thread1이 먼저 실행되어야 함
    }
}
```

### Deadlock 예제

```cpp
std::mutex mtx1, mtx2;

void thread1() {
    std::lock_guard lock1(mtx1);
    std::this_thread::sleep_for(1ms);
    std::lock_guard lock2(mtx2);  // 💥 thread2가 mtx2 보유 중
}

void thread2() {
    std::lock_guard lock1(mtx2);
    std::this_thread::sleep_for(1ms);
    std::lock_guard lock2(mtx1);  // 💥 thread1이 mtx1 보유 중
}

// 해결: std::scoped_lock 사용
void safe_thread1() {
    std::scoped_lock lock(mtx1, mtx2);  // 데드락 방지
}
```

### Livelock 예제

```cpp
std::atomic<bool> flag1{false}, flag2{false};

void thread1() {
    while (true) {
        flag1 = true;
        while (flag2) {
            flag1 = false;  // 양보
            std::this_thread::yield();
            flag1 = true;   // 다시 시도
        }
        // 임계 영역
        flag1 = false;
        break;
    }
}

void thread2() {
    while (true) {
        flag2 = true;
        while (flag1) {
            flag2 = false;  // 양보
            std::this_thread::yield();
            flag2 = true;   // 다시 시도
        }
        // 💥 둘 다 계속 양보하며 진행 못함 (livelock)
        flag2 = false;
        break;
    }
}
```

## 11.2 재현의 어려움: Heisenbug

### Heisenbug란

> *"관찰하면 사라지는 버그"*

**특징**:
- 디버거로 실행하면 사라짐
- printf 추가하면 사라짐
- 최적화 끄면 사라짐
- 1000번에 한 번 발생

**원인**:
- 타이밍에 민감한 버그
- 디버깅이 타이밍을 변경
- 관찰 자체가 동작을 변경 (양자역학의 관찰자 효과처럼)

### 재현성 높이기

```cpp
// 1. 의도적인 지연 삽입
void suspect_function() {
    // 경합 윈도우 확대
    std::this_thread::sleep_for(std::chrono::milliseconds(1));

    // 또는
    std::this_thread::yield();
}

// 2. CPU 친화성으로 경합 유도
#ifdef __linux__
void force_same_cpu() {
    cpu_set_t cpuset;
    CPU_ZERO(&cpuset);
    CPU_SET(0, &cpuset);  // 모든 스레드를 CPU 0에
    pthread_setaffinity_np(pthread_self(), sizeof(cpuset), &cpuset);
}
#endif

// 3. 스레드 시작 동기화
std::latch start_latch(1);
std::barrier sync_point(NUM_THREADS);

void worker() {
    start_latch.wait();     // 모든 스레드가 동시에 시작
    sync_point.arrive_and_wait();  // 동기점에서 만남
    // 작업
}

int main() {
    std::vector<std::thread> threads;
    for (int i = 0; i < NUM_THREADS; ++i) {
        threads.emplace_back(worker);
    }
    start_latch.count_down();  // 모두 시작!
    // ...
}
```

## 11.3 코드 리뷰 패턴

### Race 식별 체크리스트

- [ ] 공유 데이터에 접근하는 모든 코드가 동기화되었는가?
- [ ] 락의 범위가 적절한가?
- [ ] 여러 락을 사용할 때 순서가 일관적인가?
- [ ] 조건 변수 사용 시 predicate를 사용하는가?
- [ ] 락 보유 중 외부 함수를 호출하지 않는가?
- [ ] shared_ptr의 복사는 원자적이지만, 객체 접근은?
- [ ] 참조나 포인터가 락 밖으로 노출되지 않는가?
- [ ] 복합 연산(check-then-act)이 원자적인가?

### 위험 패턴

```cpp
// 💥 패턴 1: Check-then-act (TOCTOU)
if (map.contains(key)) {
    value = map[key];  // 💥 다른 스레드가 삭제했을 수 있음
}

// ✓ 해결
auto it = map.find(key);
if (it != map.end()) {
    value = it->second;  // 동일한 락 범위 내에서
}

// 💥 패턴 2: 락 밖에서 참조 반환
class ThreadSafeContainer {
    std::mutex mtx_;
    std::vector<Item> items_;

public:
    Item& get(int idx) {
        std::lock_guard lock(mtx_);
        return items_[idx];  // 💥 락 해제 후 참조 사용됨
    }
};

// ✓ 해결: 복사 반환
Item get(int idx) {
    std::lock_guard lock(mtx_);
    return items_[idx];  // 복사본 반환
}

// 💥 패턴 3: 분리된 락
void process() {
    mtx_.lock();
    auto data = getData();
    mtx_.unlock();

    // 💥 다른 스레드가 data를 변경할 수 있음

    mtx_.lock();
    updateData(data);  // 💥 오래된 데이터로 업데이트
    mtx_.unlock();
}
```

### 불변식(Invariant) 검증

```cpp
class ThreadSafeAccount {
    mutable std::mutex mtx_;
    int balance_;
    std::vector<Transaction> history_;

    // 불변식: balance_ == sum(history_)

public:
    void deposit(int amount) {
        std::lock_guard lock(mtx_);
        balance_ += amount;
        history_.push_back({TransactionType::Deposit, amount});
        assert(check_invariant());  // 디버그 빌드에서 검증
    }

private:
    bool check_invariant() const {
        int sum = 0;
        for (const auto& t : history_) {
            sum += (t.type == TransactionType::Deposit ? t.amount : -t.amount);
        }
        return balance_ == sum;
    }
};
```

## 11.4 단위 테스트 기법

### 스레드 시작 동기화

```cpp
#include <latch>
#include <barrier>

class ConcurrentTest {
protected:
    void run_concurrent(int num_threads, std::function<void(int)> worker) {
        std::latch start_latch(1);
        std::vector<std::thread> threads;

        for (int i = 0; i < num_threads; ++i) {
            threads.emplace_back([&start_latch, &worker, i] {
                start_latch.wait();  // 모두 동시에 시작
                worker(i);
            });
        }

        start_latch.count_down();  // 시작 신호

        for (auto& t : threads) {
            t.join();
        }
    }
};

// 사용 예
class CounterTest : public ConcurrentTest {
    std::atomic<int> counter_{0};

public:
    void test_concurrent_increment() {
        constexpr int NUM_THREADS = 10;
        constexpr int INCREMENTS_PER_THREAD = 1000;

        run_concurrent(NUM_THREADS, [this](int) {
            for (int i = 0; i < INCREMENTS_PER_THREAD; ++i) {
                counter_++;
            }
        });

        assert(counter_ == NUM_THREADS * INCREMENTS_PER_THREAD);
    }
};
```

### Barrier를 활용한 단계별 테스트

```cpp
#include <barrier>

void test_producer_consumer() {
    constexpr int NUM_ITEMS = 100;
    ThreadSafeQueue<int> queue;
    std::atomic<int> consumed_sum{0};

    // 생산자와 소비자가 동시에 시작
    std::barrier sync_point(2);

    std::thread producer([&] {
        sync_point.arrive_and_wait();  // 동시 시작
        for (int i = 0; i < NUM_ITEMS; ++i) {
            queue.push(i);
        }
        queue.done();
    });

    std::thread consumer([&] {
        sync_point.arrive_and_wait();  // 동시 시작
        while (auto item = queue.pop()) {
            consumed_sum += *item;
        }
    });

    producer.join();
    consumer.join();

    int expected = (NUM_ITEMS - 1) * NUM_ITEMS / 2;
    assert(consumed_sum == expected);
}
```

### C11 동시성 테스트

```c
#include <threads.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define NUM_THREADS 8
#define ITERATIONS 10000

// 테스트 대상: 스레드 안전 카운터
typedef struct {
    mtx_t mtx;
    int value;
} SafeCounter;

void safe_counter_init(SafeCounter* c) {
    mtx_init(&c->mtx, mtx_plain);
    c->value = 0;
}

void safe_counter_increment(SafeCounter* c) {
    mtx_lock(&c->mtx);
    c->value++;
    mtx_unlock(&c->mtx);
}

int safe_counter_get(SafeCounter* c) {
    mtx_lock(&c->mtx);
    int v = c->value;
    mtx_unlock(&c->mtx);
    return v;
}

void safe_counter_destroy(SafeCounter* c) {
    mtx_destroy(&c->mtx);
}

// 테스트용 동기화 배리어 (C11에는 std::latch 없음)
typedef struct {
    mtx_t mtx;
    cnd_t cv;
    int count;
    int target;
} Barrier;

void barrier_init(Barrier* b, int target) {
    mtx_init(&b->mtx, mtx_plain);
    cnd_init(&b->cv);
    b->count = 0;
    b->target = target;
}

void barrier_wait(Barrier* b) {
    mtx_lock(&b->mtx);
    b->count++;
    if (b->count == b->target) {
        cnd_broadcast(&b->cv);
    } else {
        while (b->count < b->target) {
            cnd_wait(&b->cv, &b->mtx);
        }
    }
    mtx_unlock(&b->mtx);
}

void barrier_destroy(Barrier* b) {
    mtx_destroy(&b->mtx);
    cnd_destroy(&b->cv);
}

// 테스트 컨텍스트
typedef struct {
    SafeCounter* counter;
    Barrier* start_barrier;
} TestContext;

static int worker(void* arg) {
    TestContext* ctx = (TestContext*)arg;

    barrier_wait(ctx->start_barrier);  // 모든 스레드 동시 시작

    for (int i = 0; i < ITERATIONS; ++i) {
        safe_counter_increment(ctx->counter);
    }

    return 0;
}

void test_concurrent_counter(void) {
    SafeCounter counter;
    Barrier start_barrier;
    thrd_t threads[NUM_THREADS];
    TestContext ctx;

    safe_counter_init(&counter);
    barrier_init(&start_barrier, NUM_THREADS);

    ctx.counter = &counter;
    ctx.start_barrier = &start_barrier;

    for (int i = 0; i < NUM_THREADS; ++i) {
        thrd_create(&threads[i], worker, &ctx);
    }

    for (int i = 0; i < NUM_THREADS; ++i) {
        thrd_join(threads[i], NULL);
    }

    int expected = NUM_THREADS * ITERATIONS;
    int actual = safe_counter_get(&counter);

    if (actual == expected) {
        printf("PASS: counter = %d\n", actual);
    } else {
        printf("FAIL: expected %d, got %d\n", expected, actual);
    }

    safe_counter_destroy(&counter);
    barrier_destroy(&start_barrier);
}

int main(void) {
    test_concurrent_counter();
    return 0;
}
```

### 스트레스 테스트

```cpp
void stress_test(int duration_seconds) {
    std::atomic<bool> stop{false};
    std::atomic<uint64_t> operations{0};
    ThreadSafeMap<int, std::string> map;

    std::vector<std::thread> threads;

    // 작업자 스레드들
    for (int i = 0; i < 8; ++i) {
        threads.emplace_back([&, i] {
            std::mt19937 rng(i);
            std::uniform_int_distribution<int> key_dist(0, 1000);
            std::uniform_int_distribution<int> op_dist(0, 2);

            while (!stop) {
                int key = key_dist(rng);
                switch (op_dist(rng)) {
                    case 0: map.insert(key, std::to_string(key)); break;
                    case 1: map.get(key); break;
                    case 2: map.remove(key); break;
                }
                operations++;
            }
        });
    }

    // 지정된 시간 동안 실행
    std::this_thread::sleep_for(std::chrono::seconds(duration_seconds));
    stop = true;

    for (auto& t : threads) {
        t.join();
    }

    std::cout << "Operations: " << operations << "\n";
    std::cout << "Ops/sec: " << operations / duration_seconds << "\n";
}
```

## 11.5 ThreadSanitizer (TSan)

### TSan 소개

컴파일 시 계측 코드를 삽입하여 런타임에 데이터 레이스 탐지. 지원: GCC, Clang, MSVC (최근).

**탐지**:
- Data race
- 락 순서 위반
- 초기화 전 사용

**성능 영향**:
- 5~15x 느림
- 5~10x 메모리 사용

> **CI에서 필수, 프로덕션에서 금지.**

### 사용법

```bash
# C++ 컴파일
g++ -fsanitize=thread -g -O1 program.cpp -o program
clang++ -fsanitize=thread -g -O1 program.cpp -o program

# C11 컴파일
gcc -fsanitize=thread -g -O1 -std=c11 program.c -o program
clang -fsanitize=thread -g -O1 -std=c11 program.c -o program

# 실행
./program

# 환경 변수로 옵션 설정
TSAN_OPTIONS="history_size=7 verbosity=1" ./program
```

### C11 TSan 예제

```c
// data_race.c - TSan으로 탐지되는 data race

#include <threads.h>
#include <stdio.h>

int counter = 0;  // 보호되지 않은 공유 변수

int increment(void* arg) {
    (void)arg;
    for (int i = 0; i < 10000; ++i) {
        counter++;  // 💥 Data race!
    }
    return 0;
}

int main(void) {
    thrd_t t1, t2;

    thrd_create(&t1, increment, NULL);
    thrd_create(&t2, increment, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    printf("Counter: %d\n", counter);
    return 0;
}

// 컴파일 및 실행:
// gcc -fsanitize=thread -g -O1 -std=c11 data_race.c -o data_race
// ./data_race
// → ThreadSanitizer 경고 출력
```

```c
// fixed_race.c - atomic으로 수정된 버전

#include <threads.h>
#include <stdatomic.h>
#include <stdio.h>

atomic_int counter = 0;  // atomic으로 보호

int increment(void* arg) {
    (void)arg;
    for (int i = 0; i < 10000; ++i) {
        atomic_fetch_add(&counter, 1);  // ✓ 안전
    }
    return 0;
}

int main(void) {
    thrd_t t1, t2;

    thrd_create(&t1, increment, NULL);
    thrd_create(&t2, increment, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    printf("Counter: %d\n", atomic_load(&counter));
    return 0;
}

// TSan 경고 없음
```

### TSan 출력 예시

```
==================
WARNING: ThreadSanitizer: data race (pid=12345)
  Write of size 4 at 0x7f... by thread T1:
    #0 increment() /path/to/file.cpp:10
    #1 thread1() /path/to/file.cpp:20

  Previous read of size 4 at 0x7f... by thread T2:
    #0 get_value() /path/to/file.cpp:15
    #1 thread2() /path/to/file.cpp:25

  Location is global 'counter' of size 4 at 0x7f...

  Thread T1 (tid=12346, running) created by main thread at:
    #0 pthread_create <null>
    #1 std::thread::thread<...> /usr/include/c++/...
    #2 main /path/to/file.cpp:30

  Thread T2 (tid=12347, running) created by main thread at:
    #0 pthread_create <null>
    #1 std::thread::thread<...> /usr/include/c++/...
    #2 main /path/to/file.cpp:31
==================
```

### TSan 억제(Suppression)

```cpp
// 파일: tsan.supp
race:third_party_library*
race:known_benign_race

// 실행 시
TSAN_OPTIONS="suppressions=tsan.supp" ./program
```

```cpp
// 코드에서 직접 억제 (비권장)
#if defined(__has_feature)
#if __has_feature(thread_sanitizer)
#define NO_SANITIZE_THREAD __attribute__((no_sanitize("thread")))
#endif
#endif

NO_SANITIZE_THREAD
void benign_race_function() {
    // TSan이 이 함수를 무시
}
```

## 11.6 Valgrind 도구들

### Helgrind

```bash
# 데이터 레이스 탐지
valgrind --tool=helgrind ./program

# 옵션
valgrind --tool=helgrind \
    --history-level=full \
    --conflict-cache-size=10000000 \
    ./program
```

### DRD (Data Race Detector)

```bash
# 데이터 레이스 탐지 (Helgrind보다 빠름)
valgrind --tool=drd ./program

# 옵션
valgrind --tool=drd \
    --check-stack-var=yes \
    --exclusive-threshold=10 \
    ./program
```

### Helgrind vs DRD vs TSan

| 도구 | 속도 | 정확도 | 설치 |
|------|------|--------|------|
| TSan | 빠름 | 높음 | 컴파일러 내장 |
| DRD | 중간 | 높음 | Valgrind 필요 |
| Helgrind | 느림 | 높음 | Valgrind 필요 |

**권장:** TSan을 기본으로 사용. Valgrind는 TSan이 없는 환경이나 추가 검증용.

## 11.7 정적 분석

### Clang Thread Safety Analysis

```cpp
// 컴파일: clang++ -Wthread-safety ...

class CAPABILITY("mutex") Mutex {
public:
    void lock() ACQUIRE();
    void unlock() RELEASE();
    bool try_lock() TRY_ACQUIRE(true);
};

class ThreadSafeCounter {
    Mutex mtx_;
    int value_ GUARDED_BY(mtx_);

public:
    void increment() {
        mtx_.lock();
        value_++;  // ✓ OK: mtx_ 보유 중
        mtx_.unlock();
    }

    void bad_increment() {
        value_++;  // ⚠️ 컴파일 경고: mtx_ 없이 접근
    }

    int get() const REQUIRES(mtx_) {
        return value_;  // 호출자가 락 보유해야 함
    }
};
```

### 매크로 정의

```cpp
// 스레드 안전 어노테이션
#if defined(__clang__)
    #define CAPABILITY(x) __attribute__((capability(x)))
    #define ACQUIRE(...) __attribute__((acquire_capability(__VA_ARGS__)))
    #define RELEASE(...) __attribute__((release_capability(__VA_ARGS__)))
    #define TRY_ACQUIRE(...) __attribute__((try_acquire_capability(__VA_ARGS__)))
    #define GUARDED_BY(x) __attribute__((guarded_by(x)))
    #define REQUIRES(...) __attribute__((requires_capability(__VA_ARGS__)))
    #define EXCLUDES(...) __attribute__((locks_excluded(__VA_ARGS__)))
#else
    #define CAPABILITY(x)
    #define ACQUIRE(...)
    #define RELEASE(...)
    #define TRY_ACQUIRE(...)
    #define GUARDED_BY(x)
    #define REQUIRES(...)
    #define EXCLUDES(...)
#endif
```

## 11.8 형식 검증 도구

### CHESS (Microsoft Research)

모든 가능한 스레드 스케줄을 체계적으로 탐색.

**장점**:
- 완전한 커버리지 (가능한 모든 인터리빙)
- 재현 가능한 버그 리포트

**단점**:
- 상태 폭발 (복잡한 프로그램은 불가)
- Windows/C# 위주

**용도**: 작은 동시성 알고리즘 검증

### Spin/Promela

```promela
// Promela 모델 예: Peterson's Algorithm

bool flag[2];
byte turn;
byte critical = 0;

proctype P(byte i) {
    flag[i] = true;
    turn = 1 - i;
    (flag[1-i] == false || turn == i);

    critical++;
    assert(critical == 1);  // 상호 배제 검증
    critical--;

    flag[i] = false;
}

init {
    run P(0);
    run P(1);
}
```

```bash
# Spin으로 검증
spin -a peterson.pml
gcc -o pan pan.c
./pan
```

## 11.9 디버깅 전략

### 문제 분리

```cpp
// 1. 최소 재현 케이스 만들기
void minimal_reproduction() {
    std::atomic<int> shared{0};

    std::thread t1([&] {
        for (int i = 0; i < 1000; ++i) {
            shared++;
        }
    });

    std::thread t2([&] {
        for (int i = 0; i < 1000; ++i) {
            shared++;
        }
    });

    t1.join();
    t2.join();

    std::cout << "Expected: 2000, Got: " << shared << "\n";
}
```

### 로깅

```cpp
// 스레드 안전 로깅
class ThreadSafeLogger {
    std::mutex mtx_;
    std::ofstream file_;

public:
    void log(const std::string& msg) {
        auto now = std::chrono::system_clock::now();
        auto tid = std::this_thread::get_id();

        std::lock_guard lock(mtx_);
        file_ << "[" << now << "][" << tid << "] " << msg << "\n";
        file_.flush();
    }
};

// 또는 lock-free 로깅
thread_local std::vector<std::string> local_log;

void log_local(const std::string& msg) {
    local_log.push_back(msg);
}

void flush_logs() {
    // 프로그램 종료 시 한 번에 출력
}
```

### C11 스레드 안전 로깅

```c
#include <threads.h>
#include <stdio.h>
#include <time.h>
#include <stdarg.h>

typedef struct {
    mtx_t mtx;
    FILE* file;
} ThreadSafeLogger;

void logger_init(ThreadSafeLogger* logger, const char* filename) {
    mtx_init(&logger->mtx, mtx_plain);
    logger->file = fopen(filename, "w");
}

void logger_log(ThreadSafeLogger* logger, const char* fmt, ...) {
    time_t now = time(NULL);
    thrd_t tid = thrd_current();

    mtx_lock(&logger->mtx);

    fprintf(logger->file, "[%ld][%p] ", (long)now, (void*)tid);

    va_list args;
    va_start(args, fmt);
    vfprintf(logger->file, fmt, args);
    va_end(args);

    fprintf(logger->file, "\n");
    fflush(logger->file);

    mtx_unlock(&logger->mtx);
}

void logger_destroy(ThreadSafeLogger* logger) {
    fclose(logger->file);
    mtx_destroy(&logger->mtx);
}

// Thread-local 로깅 (lock-free 대안)
#define MAX_LOG_ENTRIES 1000
#define MAX_LOG_MSG_LEN 256

typedef struct {
    char messages[MAX_LOG_ENTRIES][MAX_LOG_MSG_LEN];
    size_t count;
} LocalLog;

static _Thread_local LocalLog local_log = {{{0}}, 0};

void log_local(const char* msg) {
    if (local_log.count < MAX_LOG_ENTRIES) {
        snprintf(local_log.messages[local_log.count],
                 MAX_LOG_MSG_LEN, "%s", msg);
        local_log.count++;
    }
}

void flush_local_logs(FILE* out) {
    for (size_t i = 0; i < local_log.count; ++i) {
        fprintf(out, "%s\n", local_log.messages[i]);
    }
    local_log.count = 0;
}
```

### 조건부 중단점

```cpp
// GDB에서 조건부 중단점
// (gdb) break file.cpp:42 if counter == 100

// 코드에서 조건부 중단
void debug_break_if(bool condition) {
#ifdef DEBUG
    if (condition) {
        raise(SIGTRAP);  // 디버거 중단
    }
#endif
}
```

## 11.10 CI/CD 통합

### 테스트 파이프라인

```yaml
# .github/workflows/test.yml
name: Concurrency Tests

on: [push, pull_request]

jobs:
  tsan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build with TSan
        run: |
          cmake -B build -DCMAKE_CXX_FLAGS="-fsanitize=thread -g"
          cmake --build build

      - name: Run tests
        run: |
          cd build
          ctest --output-on-failure
        env:
          TSAN_OPTIONS: "history_size=7 halt_on_error=1"

  stress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build
        run: cmake -B build && cmake --build build

      - name: Stress test
        run: |
          for i in {1..10}; do
            ./build/stress_test --duration=60
          done
```

### CMake 설정

```cmake
# CMakeLists.txt

option(ENABLE_TSAN "Enable ThreadSanitizer" OFF)

if(ENABLE_TSAN)
    add_compile_options(-fsanitize=thread -g)
    add_link_options(-fsanitize=thread)
endif()

# 테스트 타겟
add_executable(concurrent_tests tests/concurrent_tests.cpp)
target_link_libraries(concurrent_tests PRIVATE my_lib)

# CTest
enable_testing()
add_test(NAME concurrent_tests COMMAND concurrent_tests)

# 스트레스 테스트 (별도 타겟)
add_executable(stress_test tests/stress_test.cpp)
```

## 11.11 모범 사례 요약

### 개발 시

| 단계 | 활동 |
|------|------|
| 설계 | 공유 데이터 최소화, 불변 객체 선호 |
| 구현 | RAII 락, scoped_lock, atomic 사용 |
| 코드 리뷰 | Race 패턴 체크리스트 검토 |
| 테스트 | TSan 활성화, 동시성 테스트 작성 |
| CI | TSan + 스트레스 테스트 자동화 |

### 디버깅 시

1. **TSan 먼저**: 가장 빠르고 정확
2. **최소 재현**: 문제를 단순화
3. **로깅**: 스레드 ID와 타임스탬프 포함
4. **스트레스**: 반복 실행으로 재현율 높이기
5. **리뷰**: 다른 사람의 눈으로 확인

## 11.12 시리즈 마무리

### 배운 것들

**C++ Concurrency in Action 요약**

- 1장: 동시성 개념과 C++ 지원
- 2장: 스레드 생성과 관리
- 3장: 데이터 공유와 보호 (mutex, lock)
- 4장: 동기화 (condition_variable, future)
- 5장: 메모리 모델과 atomic
- 6장: 락 기반 자료구조
- 7장: 락 프리 자료구조
- 8장: 동시성 코드 설계
- 9장: 스레드 풀과 고급 관리
- 10장: 병렬 알고리즘
- 11장: 테스트와 디버깅

### 추가 학습 방향

| 주제 | 자료 |
|------|------|
| 메모리 모델 심화 | "C++ Memory Model" - Herb Sutter |
| 락 프리 심화 | "The Art of Multiprocessor Programming" |
| 병렬 알고리즘 | Intel TBB 문서 |
| GPU 병렬 | CUDA, OpenCL, SYCL |
| 분산 시스템 | "Designing Data-Intensive Applications" |

### 핵심 원칙

1. **단순하게 시작**: mutex부터, 필요할 때만 복잡하게
2. **도구 활용**: TSan은 필수
3. **테스트 철저히**: 동시성 버그는 나중에 발견하면 비용이 큼
4. **문서화**: 동기화 정책을 명확히
5. **겸손하게**: "내 코드에 레이스가 없다"고 확신하지 마라

## 정리

- **동시성 버그**는 재현이 어렵다 (Heisenbug)
- **코드 리뷰**에서 race 패턴을 찾아라
- **TSan**은 필수 도구다. CI에 통합하라
- **정적 분석**으로 컴파일 시 오류를 잡아라
- **스트레스 테스트**로 재현율을 높여라
- 동시성은 **어렵다**. 도구와 기법을 적극 활용하라

이 시리즈를 통해 C++ 동시성 프로그래밍의 기초부터 고급 기법까지 살펴보았다. 안전하고 효율적인 동시성 코드를 작성하기 위해서는 지속적인 학습과 실습이 필요하다.

## 한국 개발자의 함정

```
1. *재현 안 되니 없는 버그*
   - Heisenbug는 *항상* 존재함
   - 1000번에 1번 → 운영에선 매시간 발생
   - 재현 안 되면 *더 위험*

2. *printf로 디버깅*
   - I/O가 타이밍을 바꿔 버그가 사라짐
   - 보통 lock-free 또는 ring buffer 로깅
   - 또는 TSan으로 정적 탐지

3. *TSan은 false positive*라는 회피
   - false positive 매우 드물다 (보통 false negative)
   - 경고 무시 = 운영 사고
   - 억제는 정말 검증된 케이스만

4. *valgrind만 쓰면 충분*
   - Helgrind / DRD는 매우 느림
   - TSan이 더 정확 + 빠름
   - 둘 다 쓰는 게 이상적

5. *동시성 테스트는 한 번만*
   - 100번 실행해서 통과 = 운 좋음
   - 매 commit마다 + 스트레스 + 다양한 코어 수
   - CI에서 자동화
```

## 실무 적용

```
이론 → 실무:
- ThreadSanitizer        → -fsanitize=thread (Clang/GCC)
- Valgrind Helgrind/DRD  → valgrind --tool=helgrind
- Static analysis        → Clang Thread Safety Analysis
- 형식 검증              → CHESS, Spin, TLA+ (분산)
- Stress testing         → 반복 실행 + 다양한 인터리빙
- Fuzzing                → libFuzzer + concurrent harness

CI 통합:
- GitHub Actions: TSan + 스트레스 테스트
- GitLab CI: 동일
- Jenkins: 비슷한 패턴

언어별:
- C++: TSan, Helgrind, Clang TSA
- Java: jcstress (concurrency stress test 도구)
- Rust: loom (model checker), miri (UB detector)
- Go: race detector (go test -race)

설계 원칙:
- 공유 상태 최소화 (immutable 선호)
- atomic 또는 명확한 락 정책
- 동기화 정책 문서화
- 모든 PR에 동시성 영향 분석
```

## 자기 점검

```
□ Data race와 Race condition 차이?
□ Heisenbug의 정의와 대응 방법?
□ Check-then-act 패턴이 위험한 이유?
□ TSan의 작동 원리 (happens-before 추적)?
□ Clang Thread Safety Analysis의 capability 시스템?
□ Livelock과 Deadlock 차이?
□ Stress test와 unit test의 다른 점?
```

## 시리즈 마무리

C++ Concurrency in Action 11장의 여정을 끝내며.

```
1장: 동시성 개념          → 동시성과 병렬성 구분
2장: Thread 관리         → join/detach, jthread
3장: 데이터 공유         → mutex, lock_guard, deadlock
4장: 동기화              → condition_variable, future
5장: 메모리 모델         → atomic, memory_order
6장: Lock-based 자료구조 → thread-safe stack/queue/map
7장: Lock-free 자료구조  → CAS, ABA, hazard pointer
8장: 동시성 설계         → false sharing, AoS/SoA
9장: 스레드 풀          → work stealing, stop_token
10장: 병렬 알고리즘     → execution::par, reduce, scan
11장: 테스트와 디버깅   → TSan, 정적 분석
```

C++ 동시성의 모든 도구가 여기 있다. 다음은 **이 도구들을 어떤 자료구조에 어떻게 적용할지**의 이론 — *The Art of Multiprocessor Programming*에서 다룬다.

## 관련 항목

- [Ch 9: Advanced Thread Management](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
- [Ch 10: Parallel Algorithms](/blog/parallel/cpp-concurrency-in-action/chapter10-parallel-algorithms)
- [Ch 1: Hello Concurrent World](/blog/parallel/cpp-concurrency-in-action/chapter01-hello-concurrent-world) — 시작점
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction) — 이론 시리즈
- [AMP Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory) — 이론 시리즈 끝
