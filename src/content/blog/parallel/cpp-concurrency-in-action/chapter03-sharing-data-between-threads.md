---
title: "Ch 3: Sharing data between threads"
date: 2026-05-06T03:00:00
description: "race condition, std::mutex, lock guard, deadlock 회피, std::shared_mutex."
tags: [C++, Concurrency, Mutex, Race Condition, Deadlock]
series: "C++ Concurrency in Action"
seriesOrder: 3
draft: false
---

스레드가 데이터를 공유하는 순간 문제가 시작된다. 이 장에서는 race condition의 본질, `std::mutex`로 보호하는 방법, deadlock을 피하는 전략을 다룬다.

## 3.1 Race Condition

### 불변식이 깨지는 순간

Williams는 3장 도입에서 race condition을 *불변식이 깨지는 시간 구간*으로 정의한다. 자료구조가 일시적으로 일관되지 않은 상태로 들어가는 순간이 있고, 그 순간에 다른 스레드가 접근하면 문제가 발생한다는 시각이다.

doubly-linked list에서 노드를 삭제하는 예제(책 Listing 3.1 해설)를 보자. 단일 스레드라면 `delete_node` 한 호출이 끝날 때까지 불변식 위반은 외부에서 보이지 않는다.

```cpp
struct Node {
    int value;
    Node* prev;
    Node* next;
};

// 단일 스레드 가정 — 중간 상태가 외부에 보이지 않는다
void delete_node(Node* n) {
    n->prev->next = n->next;   // (1) prev의 next 갱신
    // 이 시점에 list 불변식 일시 위반:
    //   n->next->prev == n 이지만 n->prev->next != n
    n->next->prev = n->prev;   // (2) next의 prev 갱신
    delete n;                  // (3) 노드 해제
}
```

(1)과 (2) 사이는 *불변식 위반 구간*이다. 단일 스레드에서는 문제가 없다. 그 구간에서 외부 코드가 list를 읽지 않기 때문이다.

스레드를 추가하면 그 구간이 다른 스레드에 노출된다. 두 스레드가 인접한 노드를 동시에 삭제하면 어느 한쪽이 (1)을 끝낸 직후 다른 쪽이 (1)을 다시 실행한다. 결과는 정의되지 않은 동작이다. dangling pointer, 이중 해제, 순환 list 어느 쪽이든 나올 수 있다.

> **메모.** Williams는 race condition을 두 종류로 나눈다. *problematic race*는 불변식이 깨지는 race이고, *benign race*는 결과가 어떻든 무방한 race다. C++ 표준이 정의하는 *data race*는 동기화 없이 같은 메모리에 접근하는 모든 race를 포함한다. data race는 UB이지만, race condition은 동기화 후에도 논리적으로 남을 수 있다(3.2.3절 stack 인터페이스가 그 예다).

### 데이터 레이스란

두 스레드가 같은 메모리에 동시에 접근하고, **적어도 하나가 쓰기**이면 **데이터 레이스**다.

```cpp
int counter = 0;

void increment() {
    for (int i = 0; i < 100000; ++i) {
        ++counter;  // 💥 데이터 레이스
    }
}

int main() {
    std::thread t1(increment);
    std::thread t2(increment);
    t1.join();
    t2.join();
    std::cout << counter << "\n";  // 예상: 200000, 실제: ?
}
```

실행할 때마다 다른 값이 나올 수 있다. 170000, 185432, 199876 — 예측 불가능하다.

### 왜 이런 일이?

`++counter`는 단일 연산이 아니다. 세 단계로 분해된다.

```
1. 메모리에서 counter 읽기   (LOAD)
2. 값에 1 더하기            (ADD)
3. 결과를 메모리에 쓰기      (STORE)
```

두 스레드가 동시에 실행하면:

![데이터 레이스 시퀀스](/images/blog/parallel/diagrams/data-race-sequence.svg)

두 스레드 모두 0을 읽어서 1을 썼다. 증가는 두 번 일어났지만 결과는 1이다.

### C++ 표준에서의 데이터 레이스

C++ 표준은 명확하다: **데이터 레이스는 정의되지 않은 동작(UB)**이다.

> 두 표현식 평가가 같은 메모리 위치에 접근하고, 적어도 하나가 수정이며, 둘 사이에 happens-before 관계가 없으면, 프로그램의 동작은 정의되지 않는다.

UB이므로 컴파일러는 아무 가정이나 할 수 있다. 최적화로 코드를 완전히 다르게 바꿔도 합법이다.

### race 회피의 네 가지 접근

Williams는 race를 다루는 네 가지 방법을 제시한다.

1. **자료구조 자체를 보호한다.** 가장 흔한 접근이며 mutex가 대표 도구다. 3.2절의 주제다.
2. **lock-free 자료구조로 설계한다.** 불변식 위반 구간이 외부에 보이지 않도록 모든 변경이 *원자적 단위*로 일어나게 만든다. 7장에서 다룬다.
3. **변경을 트랜잭션처럼 다룬다.** software transactional memory(STM)다. C++ 표준에는 아직 없다.
4. **공유 자체를 피한다.** thread-local 데이터, message passing, immutable 데이터로. 이 장 범위 밖이지만 가장 강력한 회피책이다.

이 장은 첫 번째 접근에 집중한다.

## 3.2 C11 뮤텍스

C11은 `<threads.h>`에 뮤텍스 타입을 제공한다.

### C11 기본 뮤텍스

```c
#include <stdio.h>
#include <threads.h>

mtx_t mtx;
int counter = 0;

int worker(void* arg) {
    (void)arg;
    for (int i = 0; i < 100000; ++i) {
        mtx_lock(&mtx);
        ++counter;
        mtx_unlock(&mtx);
    }
    return 0;
}

int main(void) {
    // 일반 뮤텍스 초기화
    mtx_init(&mtx, mtx_plain);

    thrd_t t1, t2;
    thrd_create(&t1, worker, NULL);
    thrd_create(&t2, worker, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    printf("Counter: %d\n", counter);  // 200000

    mtx_destroy(&mtx);
    return 0;
}
```

### C11 vs C++11 뮤텍스 비교

| 기능 | C11 | C++11 |
|------|-----|-------|
| 타입 | `mtx_t` | `std::mutex` |
| 초기화 | `mtx_init(&m, mtx_plain)` | 기본 생성자 |
| 잠금 | `mtx_lock(&m)` | `m.lock()` |
| 해제 | `mtx_unlock(&m)` | `m.unlock()` |
| 시도 | `mtx_trylock(&m)` | `m.try_lock()` |
| 소멸 | `mtx_destroy(&m)` | 소멸자 |
| 재귀적 | `mtx_init(&m, mtx_recursive)` | `std::recursive_mutex` |
| 시간 제한 | `mtx_init(&m, mtx_timed)` | `std::timed_mutex` |

### C11 뮤텍스 타입

```c
// 일반 뮤텍스
mtx_init(&mtx, mtx_plain);

// 재귀적 뮤텍스 (같은 스레드가 여러 번 잠금 가능)
mtx_init(&mtx, mtx_recursive);

// 시간 제한 뮤텍스
mtx_init(&mtx, mtx_timed);

// 재귀적 + 시간 제한
mtx_init(&mtx, mtx_recursive | mtx_timed);

// 시간 제한 잠금
struct timespec ts;
timespec_get(&ts, TIME_UTC);
ts.tv_sec += 1;  // 1초 후
if (mtx_timedlock(&mtx, &ts) == thrd_success) {
    // 잠금 성공
    mtx_unlock(&mtx);
}
```

### C11 조건 변수

```c
#include <stdio.h>
#include <threads.h>
#include <stdbool.h>

mtx_t mtx;
cnd_t cnd;
bool ready = false;

int waiter(void* arg) {
    (void)arg;
    mtx_lock(&mtx);
    while (!ready) {
        cnd_wait(&cnd, &mtx);
    }
    printf("Condition met!\n");
    mtx_unlock(&mtx);
    return 0;
}

int setter(void* arg) {
    (void)arg;
    mtx_lock(&mtx);
    ready = true;
    mtx_unlock(&mtx);
    cnd_signal(&cnd);
    return 0;
}

int main(void) {
    mtx_init(&mtx, mtx_plain);
    cnd_init(&cnd);

    thrd_t t1, t2;
    thrd_create(&t1, waiter, NULL);
    thrd_create(&t2, setter, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    mtx_destroy(&mtx);
    cnd_destroy(&cnd);
    return 0;
}
```

## 3.3 std::mutex

### 기본 사용법

`std::mutex`는 상호 배제(mutual exclusion)를 제공한다.

```cpp
#include <mutex>

std::mutex mtx;
int counter = 0;

void safe_increment() {
    for (int i = 0; i < 100000; ++i) {
        mtx.lock();
        ++counter;
        mtx.unlock();
    }
}
```

한 스레드가 `lock()`을 호출하면, 다른 스레드는 `unlock()`될 때까지 `lock()`에서 대기한다.

### 문제: 예외 시 unlock 실패

```cpp
void risky() {
    mtx.lock();
    process();  // 💥 예외 발생!
    mtx.unlock();  // 도달 못함 → 영원히 잠김
}
```

## 3.4 Lock Guards

### std::lock_guard

RAII로 락을 관리한다. 생성자에서 lock, 소멸자에서 unlock.

```cpp
void safe() {
    std::lock_guard<std::mutex> guard(mtx);
    ++counter;  // 보호됨
}  // guard 소멸 → 자동 unlock
```

**C++17부터 CTAD(Class Template Argument Deduction)** 사용 가능:

```cpp
std::lock_guard guard(mtx);  // <std::mutex> 생략
```

### std::unique_lock

`lock_guard`보다 유연하다. 지연 락, 조기 해제, 조건 변수와 함께 사용.

```cpp
std::unique_lock<std::mutex> lock(mtx);  // 즉시 락

// 지연 락
std::unique_lock<std::mutex> lock2(mtx, std::defer_lock);
// ... 나중에
lock2.lock();

// 조기 해제
lock.unlock();
// ... 락 없이 작업
lock.lock();  // 다시 획득

// 이동 가능
std::unique_lock<std::mutex> lock3 = std::move(lock);
```

### std::scoped_lock (C++17)

**여러 뮤텍스를 한 번에** deadlock 없이 잠근다.

```cpp
std::mutex mtx1, mtx2;

void safe_swap(Data& a, Data& b) {
    std::scoped_lock lock(mtx1, mtx2);  // 순서 무관, deadlock 방지
    std::swap(a, b);
}
```

**새 코드에서는 `std::scoped_lock`을 기본으로 사용하라.** 단일 뮤텍스도 OK.

### 세 가드의 정확한 차이

세 RAII 가드를 혼동하면 안 된다. 책 3.2절을 따라 표로 정리한다.

| 기준 | `std::lock_guard` | `std::unique_lock` | `std::scoped_lock` |
|------|-------------------|---------------------|---------------------|
| 도입 | C++11 | C++11 | C++17 |
| 뮤텍스 수 | 1개 | 1개 | 가변 (0개 이상) |
| 이동 가능 | X | O | X |
| `unlock()` 호출 | X | O | X |
| 지연 락 (`defer_lock`) | X | O | X |
| 락 시도 (`try_to_lock`) | X | O | X |
| 락 채택 (`adopt_lock`) | O | O | O |
| 조건 변수와 함께 | X | O | X |
| 오버헤드 | 가장 낮음 | 약간 있음(상태 비트) | 가장 낮음 |

`unique_lock`은 *락 상태*를 멤버로 들고 다닌다. 객체가 락을 보유 중인지, 뮤텍스 포인터가 무엇인지 추적해야 하므로 약간의 메모리·실행 비용이 발생한다. 대신 유연하다.

선택 규칙은 다음과 같다.

- **단일 뮤텍스, 전체 스코프** → `lock_guard` 또는 `scoped_lock`. 책은 새 코드에서 `scoped_lock`을 권한다.
- **여러 뮤텍스 동시 락** → `scoped_lock` (C++17). C++14 이하라면 `std::lock` + `lock_guard(..., adopt_lock)`.
- **조건 변수 사용** → `unique_lock`. `condition_variable::wait`이 `unique_lock`만 받는다.
- **함수 간 락 이동, 조기 해제, 지연 락** → `unique_lock`.

### std::lock + adopt_lock 패턴

C++17 이전에는 `std::scoped_lock`이 없었다. 여러 뮤텍스를 deadlock 없이 잡으려면 `std::lock` 함수를 쓰고, 그 결과를 RAII 가드에 *채택*해야 했다(책 Listing 3.6 해설).

```cpp
class some_big_object;
void swap(some_big_object& lhs, some_big_object& rhs);

class X {
    some_big_object some_detail_;
    mutable std::mutex m_;
public:
    X(some_big_object const& sd) : some_detail_(sd) {}

    friend void swap(X& lhs, X& rhs) {
        if (&lhs == &rhs) return;          // 자기 자신과 swap → 같은 뮤텍스 두 번 잠금 → UB
        std::lock(lhs.m_, rhs.m_);          // (1) 둘 다 잠금. 순서 자동 결정
        std::lock_guard<std::mutex> lock_a(lhs.m_, std::adopt_lock);  // (2) 채택
        std::lock_guard<std::mutex> lock_b(rhs.m_, std::adopt_lock);  // (3) 채택
        swap(lhs.some_detail_, rhs.some_detail_);
    }
};
```

(1)에서 `std::lock`은 *all-or-nothing* 방식으로 두 뮤텍스를 잡는다. 한쪽이 막히면 이미 잡은 쪽을 풀고 재시도하므로 deadlock이 발생하지 않는다.

(2)(3)의 `std::adopt_lock`은 가드에게 "이 뮤텍스는 이미 잠겨 있으니 *해제 책임만 진다*"고 알리는 태그다. `adopt_lock` 없이 생성하면 가드가 다시 `lock()`을 호출해 이중 잠금이 된다.

C++17부터는 이 전체가 한 줄로 줄어든다.

```cpp
// C++17: scoped_lock 한 줄
friend void swap(X& lhs, X& rhs) {
    if (&lhs == &rhs) return;
    std::scoped_lock guard(lhs.m_, rhs.m_);  // 자동으로 std::lock 사용
    swap(lhs.some_detail_, rhs.some_detail_);
}
```

`scoped_lock`은 두 개 이상의 뮤텍스를 받으면 내부적으로 `std::lock`을 호출한다. 단일 뮤텍스를 받으면 단순 `lock()`을 호출한다. 가변 인자 템플릿 덕분에 인자 수가 0개여도 컴파일된다(아무 락도 잡지 않는다).

> **함정.** `std::lock`은 deadlock을 막지만 *예외 안전성*은 직접 챙겨야 한다. (1) 직후 (2) 사이에 예외가 나면 두 뮤텍스가 잠긴 채 남는다. `std::lock` 자체는 예외를 던질 때 모든 뮤텍스를 해제하므로, *그 이후*에 가드 생성이 실패할 일은 거의 없지만, 책은 `scoped_lock`을 쓰는 편이 안전하다고 권한다.

## 3.5 Deadlock

### 교착 상태란

두 스레드가 서로가 가진 락을 기다리며 영원히 블로킹.

```cpp
std::mutex mtx_a, mtx_b;

void thread1() {
    std::lock_guard<std::mutex> lock_a(mtx_a);
    std::this_thread::sleep_for(1ms);  // 타이밍 문제 유발
    std::lock_guard<std::mutex> lock_b(mtx_b);  // 💥 thread2가 mtx_b 보유
}

void thread2() {
    std::lock_guard<std::mutex> lock_b(mtx_b);
    std::this_thread::sleep_for(1ms);
    std::lock_guard<std::mutex> lock_a(mtx_a);  // 💥 thread1이 mtx_a 보유
}
```

```
Thread 1              Thread 2
──────────────────────────────────
lock(mtx_a) ✓        lock(mtx_b) ✓
   ...                  ...
lock(mtx_b) 대기 →   lock(mtx_a) 대기 →
     ↑_______________________|
              데드락!
```

### 데드락의 4조건 (Coffman)

네 조건이 **모두** 만족되어야 데드락이 발생한다:

1. **상호 배제** — 리소스를 한 번에 하나만 사용
2. **점유 대기** — 리소스를 점유하면서 다른 리소스 대기
3. **비선점** — 강제로 리소스를 빼앗을 수 없음
4. **순환 대기** — 스레드들이 원형으로 서로를 대기

하나라도 깨면 데드락은 발생하지 않는다.

### 회피 전략 1: 락 순서 고정

모든 스레드가 **같은 순서**로 락을 획득하면 순환 대기가 깨진다.

```cpp
// 항상 mtx_a → mtx_b 순서로
void thread1() {
    std::lock_guard<std::mutex> lock_a(mtx_a);
    std::lock_guard<std::mutex> lock_b(mtx_b);
    // ...
}

void thread2() {
    std::lock_guard<std::mutex> lock_a(mtx_a);  // 순서 동일
    std::lock_guard<std::mutex> lock_b(mtx_b);
    // ...
}
```

### 회피 전략 2: std::lock + std::scoped_lock

`std::lock`은 데드락 회피 알고리즘을 사용해 여러 뮤텍스를 한 번에 잠근다.

```cpp
// C++11/14: std::lock + adopt_lock
void safe_swap() {
    std::lock(mtx_a, mtx_b);  // 둘 다 잠금 (순서 자동 결정)
    std::lock_guard<std::mutex> lock_a(mtx_a, std::adopt_lock);
    std::lock_guard<std::mutex> lock_b(mtx_b, std::adopt_lock);
    // ...
}

// C++17: scoped_lock (더 간단)
void safe_swap_17() {
    std::scoped_lock lock(mtx_a, mtx_b);
    // ...
}
```

### 회피 전략 3: 락 계층 (Hierarchical Locking)

각 뮤텍스에 레벨을 부여하고, **낮은 레벨 → 높은 레벨 순서로만** 획득한다.

```cpp
class hierarchical_mutex {
    std::mutex mtx_;
    unsigned long const hierarchy_value_;
    unsigned long previous_hierarchy_value_;
    static thread_local unsigned long this_thread_hierarchy_value_;

    void check_for_hierarchy_violation() {
        if (this_thread_hierarchy_value_ <= hierarchy_value_) {
            throw std::logic_error("mutex hierarchy violated");
        }
    }

public:
    explicit hierarchical_mutex(unsigned long value)
        : hierarchy_value_(value), previous_hierarchy_value_(0) {}

    void lock() {
        check_for_hierarchy_violation();
        mtx_.lock();
        previous_hierarchy_value_ = this_thread_hierarchy_value_;
        this_thread_hierarchy_value_ = hierarchy_value_;
    }

    void unlock() {
        this_thread_hierarchy_value_ = previous_hierarchy_value_;
        mtx_.unlock();
    }

    bool try_lock() {
        check_for_hierarchy_violation();
        if (!mtx_.try_lock()) return false;
        previous_hierarchy_value_ = this_thread_hierarchy_value_;
        this_thread_hierarchy_value_ = hierarchy_value_;
        return true;
    }
};

thread_local unsigned long
    hierarchical_mutex::this_thread_hierarchy_value_ = ULONG_MAX;
```

사용 예:

```cpp
hierarchical_mutex high_level(10000);
hierarchical_mutex mid_level(5000);
hierarchical_mutex low_level(1000);

void good() {
    std::lock_guard<hierarchical_mutex> h(high_level);
    std::lock_guard<hierarchical_mutex> m(mid_level);  // OK: 10000 > 5000
    std::lock_guard<hierarchical_mutex> l(low_level);  // OK: 5000 > 1000
}

void bad() {
    std::lock_guard<hierarchical_mutex> l(low_level);
    std::lock_guard<hierarchical_mutex> h(high_level);  // 💥 예외: 1000 < 10000
}
```

### hierarchical_mutex의 핵심 아이디어

이 도구의 본질은 *thread_local 변수로 현재 스레드의 락 계층 위치를 추적*하는 것이다(책 Listing 3.7, 3.8 해설).

각 스레드는 자신만의 `this_thread_hierarchy_value_`를 가진다. 초기값은 `ULONG_MAX`로, 어떤 레벨이든 받을 수 있는 상태다. 락을 잡으면 그 락의 레벨로 갱신되고, 이후로는 *더 낮은 레벨의 락만* 잡을 수 있다.

```text
스레드 시작
  this_thread_hierarchy_value_ = ULONG_MAX
  ↓ high_level(10000) 잡음
  this_thread_hierarchy_value_ = 10000
  ↓ mid_level(5000) 잡음 → 검사: 10000 > 5000 OK
  this_thread_hierarchy_value_ = 5000
  ↓ low_level(1000) 잡음 → 검사: 5000 > 1000 OK
  this_thread_hierarchy_value_ = 1000
  ↑ low_level 해제 → 복원: 5000
  ↑ mid_level 해제 → 복원: 10000
  ↑ high_level 해제 → 복원: ULONG_MAX
```

언락 시에는 `previous_hierarchy_value_`로 *복원*한다. 락 객체가 스택처럼 동작하므로 LIFO 해제 순서가 자동으로 지켜진다.

### 실제 사용 예 (책 Listing 3.7)

책은 두 함수가 서로를 호출할 수 있는 시나리오로 hierarchical_mutex를 시연한다.

```cpp
hierarchical_mutex high_level_mutex(10000);
hierarchical_mutex low_level_mutex(5000);
hierarchical_mutex other_mutex(6000);

int do_low_level_stuff() { return 42; }

int low_level_func() {
    std::lock_guard<hierarchical_mutex> lk(low_level_mutex);
    return do_low_level_stuff();
}

void high_level_stuff(int some_param) { /* ... */ }

void high_level_func() {
    std::lock_guard<hierarchical_mutex> lk(high_level_mutex);  // 10000
    high_level_stuff(low_level_func());                          // 내부에서 5000 잡음 → OK
}

void thread_a() {
    high_level_func();  // 정상 동작
}

void do_other_stuff() { /* ... */ }

void other_stuff() {
    high_level_func();   // 💥 여기서 high_level(10000) 잡으려 함
    do_other_stuff();
}

void thread_b() {
    std::lock_guard<hierarchical_mutex> lk(other_mutex);  // 6000
    other_stuff();        // 내부에서 high_level(10000) 잡으려다 예외
}
```

`thread_b`는 `other_mutex`(6000)를 먼저 잡고 그 안에서 `high_level_mutex`(10000)를 잡으려 한다. 6000을 잡은 시점에 `this_thread_hierarchy_value_ = 6000`이 되어 *6000 미만*만 허용된다. 10000은 위반이므로 `lock()` 시 예외가 발생한다.

이 검사는 *런타임*에 일어나지만, 한 번이라도 violation이 나면 즉시 발견된다. 락 순서 위반이 *우연한 타이밍*에 데드락을 일으키기 전에, 모든 실행 경로에서 같은 예외로 드러난다는 점이 핵심 가치다.

### hierarchical_mutex의 한계

이 도구는 만능이 아니다. 책이 명시하지 않지만 따라오는 제약은 다음과 같다.

- *같은 레벨* 두 뮤텍스를 동시에 잡을 수 없다. `level==5000` 두 개를 다 잡으려면 5000 미만이어야 하는데 자신과 같으니 위반이다. 같은 레벨 락이 필요하면 별도 메커니즘(`std::lock`+`scoped_lock`)을 써야 한다.
- 레벨 부여가 *전역 설계 결정*이다. 라이브러리 경계를 넘는 통일이 어렵다.
- 동적으로 생성되는 락(노드별 락 등)에는 부적합하다.
- 검사가 런타임이므로 *디버그/테스트 빌드에서만* 활성화하는 패턴이 흔하다. 릴리스에서는 일반 `std::mutex`로 typedef한다.

> **사용 패턴.** Williams는 hierarchical_mutex를 *디버깅 도구*로 권장한다. 개발 중에 락 순서를 강제로 검증하고, 일정 안정화 후 일반 mutex로 교체하는 경우가 많다.

## 3.6 std::shared_mutex

### Reader-Writer Lock

읽기는 동시에 여러 스레드가, 쓰기는 배타적으로.

```cpp
#include <shared_mutex>

std::shared_mutex rw_mtx;
std::map<int, std::string> cache;

std::string read(int key) {
    std::shared_lock<std::shared_mutex> lock(rw_mtx);  // 읽기 락
    auto it = cache.find(key);
    return it != cache.end() ? it->second : "";
}

void write(int key, const std::string& value) {
    std::unique_lock<std::shared_mutex> lock(rw_mtx);  // 쓰기 락 (배타적)
    cache[key] = value;
}
```

- `std::shared_lock` — 읽기 락. 다른 shared_lock과 공존 가능.
- `std::unique_lock` — 쓰기 락. 다른 모든 락과 배타적.

### 언제 사용하는가

| 상황 | 권장 |
|------|------|
| 읽기 >> 쓰기 | `std::shared_mutex` |
| 읽기 ≈ 쓰기 | 일반 `std::mutex` |
| 쓰기 >> 읽기 | 일반 `std::mutex` |

`shared_mutex`는 오버헤드가 있다. 읽기가 압도적으로 많을 때만 이득이다.

### DNS 캐시 예제 (책 Listing 3.13)

Williams가 드는 대표 예는 DNS 캐시다. 도메인 이름을 IP로 매핑하는 캐시는 *읽기가 압도적*이다. 갱신은 TTL 만료나 새 항목 추가 때만 일어난다.

```cpp
#include <map>
#include <string>
#include <mutex>
#include <shared_mutex>

class dns_entry { /* ... */ };

class dns_cache {
    std::map<std::string, dns_entry> entries_;
    mutable std::shared_mutex entry_mutex_;
public:
    dns_entry find_entry(std::string const& domain) const {
        std::shared_lock<std::shared_mutex> lk(entry_mutex_);  // 읽기 락
        auto const it = entries_.find(domain);
        return (it == entries_.end()) ? dns_entry() : it->second;
    }

    void update_or_add_entry(std::string const& domain,
                             dns_entry const& dns_details) {
        std::lock_guard<std::shared_mutex> lk(entry_mutex_);   // 배타 락
        entries_[domain] = dns_details;
    }
};
```

읽기 측은 `std::shared_lock`을 쓴다. 여러 스레드가 동시에 `find_entry`를 호출해도 서로 막지 않는다. 쓰기 측은 일반 `std::lock_guard`를 `shared_mutex`에 채워 *배타적*으로 잡는다. 쓰기 중에는 모든 읽기가 대기한다.

### shared_lock의 특성

`std::shared_lock`은 `unique_lock`과 유사한 인터페이스를 가진다. 이동 가능하고, `lock()`/`unlock()`을 직접 호출할 수 있으며, `defer_lock`/`try_to_lock`/`adopt_lock` 태그를 받는다. 다른 점은 *공유 락*을 잡는다는 것뿐이다.

```cpp
std::shared_mutex m;

std::shared_lock<std::shared_mutex> r1(m);                 // 즉시 공유 락
std::shared_lock<std::shared_mutex> r2(m, std::defer_lock); // 지연
r2.lock();
r2.unlock();                                                // 명시적 해제
```

배타 락이 필요할 때는 `std::lock_guard<std::shared_mutex>` 또는 `std::unique_lock<std::shared_mutex>`를 쓴다. `shared_mutex` 자체가 두 모드를 제공하고, *어느 가드를 쓰느냐*가 모드를 결정한다.

### 갱신 빈도와 성능

`shared_mutex`의 내부 자료구조는 *현재 read holder 수와 대기 중인 writer*를 모두 추적해야 한다. 일반 `mutex`보다 자료구조가 무겁고 atomic 연산도 많다. 짧은 임계 영역에서는 *오히려 느릴 수 있다*.

대략의 기준은 다음과 같다.

- 읽기 비율 > 95% + 임계 영역 길이 > 수 마이크로초 → `shared_mutex`가 이득
- 읽기 비율 < 80% 또는 임계 영역 길이 < 수백 나노초 → `mutex`가 빠를 가능성

플랫폼에 따라 다르므로 *측정 후 결정*해야 한다. 책은 "측정 없이 `shared_mutex`로 갈아타지 말 것"이라고 경고한다.

### writer starvation

대부분의 `shared_mutex` 구현은 *reader-preferring*이다. reader가 끊임없이 들어오면 writer가 영원히 대기할 수 있다. 일부 구현은 writer가 대기 중일 때 *새 reader를 막는* writer-preferring 정책을 쓰지만, 표준은 어느 쪽도 강제하지 않는다.

starvation이 문제라면 갱신 빈도와 캐시 무효화 전략을 함께 설계해야 한다. 단순히 `shared_mutex`로 바꾼다고 해결되는 문제가 아니다.

## 3.4 std::recursive_mutex — 대부분은 설계 결함의 신호

### 같은 스레드가 여러 번 잠글 수 있는 락

`std::mutex`는 같은 스레드가 두 번 `lock()`을 호출하면 *UB*다(보통 deadlock으로 나타난다). `std::recursive_mutex`는 같은 스레드의 재진입을 허용한다. 내부적으로 *카운터*를 두고, `lock()` 횟수만큼 `unlock()`이 호출돼야 실제로 해제된다.

```cpp
std::recursive_mutex m;

void inner() {
    std::lock_guard<std::recursive_mutex> lk(m);  // 두 번째 lock — OK
    // ...
}

void outer() {
    std::lock_guard<std::recursive_mutex> lk(m);  // 첫 번째 lock
    inner();  // 같은 스레드가 다시 lock — recursive_mutex니까 허용
}
```

`std::mutex`로 같은 코드를 쓰면 `inner()`에서 deadlock에 빠진다.

### Williams의 경고

책은 `recursive_mutex`를 *마지막 수단*으로 분류한다. 핵심 메시지를 그대로 옮기면 다음과 같다.

> 대부분의 경우, recursive_mutex가 필요하다고 느낀다면 *설계가 잘못되어 있을 가능성이 높다*. 같은 스레드가 같은 락을 두 번 잡아야 한다는 사실은 보통 *클래스 불변식이 락 보유 중에 일시적으로 깨져 있다*는 것을 의미한다.

전형적인 잘못된 패턴은 다음과 같다.

```cpp
// 안티 패턴 — recursive_mutex로 *증상*만 가린 코드
class Account {
    std::recursive_mutex m_;
    double balance_;

public:
    double balance() const {
        std::lock_guard<std::recursive_mutex> lk(m_);
        return balance_;
    }

    void withdraw(double amount) {
        std::lock_guard<std::recursive_mutex> lk(m_);
        if (balance() >= amount) {        // 💥 자기 자신의 락을 재진입
            balance_ -= amount;
        }
    }
};
```

`withdraw`가 락을 잡은 채로 `balance()`를 호출하고, `balance()`도 같은 락을 잡으려 한다. `recursive_mutex`로 회피할 수 있지만 *근본 문제*는 함수 분할이다.

### 해결: 락을 잡은 / 안 잡은 버전 분리

전통적인 해결책은 *공개 API*는 락을 잡고, *내부 헬퍼*는 락 없이 호출자가 책임지게 분리하는 것이다.

```cpp
class Account {
    std::mutex m_;     // 일반 mutex로 충분
    double balance_;

    // 락이 이미 잡혀 있다고 가정하는 내부 함수
    double balance_locked() const { return balance_; }

public:
    double balance() const {
        std::lock_guard<std::mutex> lk(m_);
        return balance_locked();
    }

    void withdraw(double amount) {
        std::lock_guard<std::mutex> lk(m_);
        if (balance_locked() >= amount) {
            balance_ -= amount;
        }
    }
};
```

내부 함수에 `_locked` 접미사를 붙이는 컨벤션이 흔하다. "락이 이미 잡혀 있는 컨텍스트에서만 호출하라"는 신호다.

### 더 큰 문제: 락 보유 중의 불변식 위반

`recursive_mutex`가 정말 위험한 이유는 *재진입 시 불변식이 깨져 있을 수 있다*는 점이다.

```cpp
class List {
    std::recursive_mutex m_;
    std::vector<int> data_;
    int sum_;  // 불변식: sum_ == sum(data_)

public:
    void add(int x) {
        std::lock_guard<std::recursive_mutex> lk(m_);
        data_.push_back(x);
        // 💥 여기서 다른 멤버 함수가 호출되면 sum_ != sum(data_)
        callback();  // 가상 함수 — 어떤 멤버 함수든 호출 가능
        sum_ += x;
    }

    void verify() {
        std::lock_guard<std::recursive_mutex> lk(m_);
        assert(sum_ == std::accumulate(data_.begin(), data_.end(), 0));
    }
};
```

`add` 도중에 `callback`이 `verify`를 호출하면, `recursive_mutex`가 재진입을 허용해 `verify` 안으로 들어가지만, 그 시점 *불변식은 깨져 있다*. `std::mutex`였다면 deadlock으로 즉시 발견됐을 문제가, `recursive_mutex`에서는 *assertion failure*로 늦게 드러난다.

### 정당한 사용 사례

드물지만 `recursive_mutex`가 진짜 필요한 경우도 있다.

- *legacy code 적응*. 기존 API를 못 바꾸는 상황에서 thread safety를 덧붙일 때.
- *callback 기반 라이브러리*. 콜백이 같은 객체를 호출할 가능성을 막을 수 없을 때.
- *모듈 경계가 명확하고*, 재진입 시 불변식이 항상 유효함을 보장할 수 있을 때.

이런 경우에도 일단 `recursive_mutex`로 동작시킨 뒤, 가능한 한 빨리 일반 `mutex` + `_locked` 헬퍼 패턴으로 리팩터링하는 것이 권장된다.

> **요약.** `std::recursive_mutex`는 *설계 결함의 응급조치*다. 새 코드에서 자연스럽게 등장한다면 거의 항상 함수 분할로 해결할 수 있다.

## 3.7 std::call_once

### 단 한 번만 실행

초기화를 스레드 안전하게 한 번만 수행한다.

```cpp
std::once_flag init_flag;
std::shared_ptr<Resource> resource;

void init_resource() {
    resource = std::make_shared<Resource>();
}

void use_resource() {
    std::call_once(init_flag, init_resource);  // 첫 호출만 실행
    resource->do_something();
}
```

여러 스레드가 동시에 `call_once`를 호출해도 `init_resource`는 **정확히 한 번**만 실행된다. 나머지는 완료까지 대기.

### 정적 지역 변수의 대안

C++11부터 정적 지역 변수 초기화는 스레드 안전하다.

```cpp
Resource& get_resource() {
    static Resource instance;  // 스레드 안전한 초기화 (C++11+)
    return instance;
}
```

컴파일러가 내부적으로 `call_once`와 유사한 메커니즘을 사용한다.

### 왜 DCLP가 아닌 call_once인가

Williams는 `call_once`를 소개하기 전에 *Double-Checked Locking Pattern(DCLP)*의 함정을 짚는다. 흔히 보이는 잘못된 코드는 다음과 같다.

```cpp
// 회피 — race condition
std::shared_ptr<Resource> resource_ptr;
std::mutex resource_mutex;

void use_resource() {
    if (!resource_ptr) {                                   // (1) 락 없이 읽기
        std::lock_guard<std::mutex> lock(resource_mutex);
        if (!resource_ptr) {                               // (2) 다시 확인
            resource_ptr.reset(new Resource);              // (3) 초기화
        }
    }
    resource_ptr->do_something();                          // (4) 사용
}
```

(1)의 락 없는 읽기와 (3)의 쓰기 사이에 데이터 레이스가 있다. 한 스레드가 (3)에서 `reset`을 하는 동안, 다른 스레드가 (1)에서 같은 포인터를 읽으면 UB다. 더 미묘하게, (3)이 *완료된 것처럼 보여도* `Resource` 객체 초기화가 다른 코어에서 *아직 보이지 않을* 수 있다. CPU·컴파일러 양쪽의 reordering 때문이다.

`std::call_once`는 이 모든 동기화를 표준이 책임진다. 사용자는 race를 직접 다루지 않는다.

### 클래스 멤버 초기화 (책 Listing 3.12)

`std::call_once`의 진가는 클래스 멤버를 지연 초기화할 때 드러난다.

```cpp
class X {
private:
    connection_info connection_details_;
    connection_handle connection_;
    std::once_flag connection_init_flag_;

    void open_connection() {
        connection_ = connection_manager.open(connection_details_);
    }

public:
    X(connection_info const& connection_details)
        : connection_details_(connection_details) {}

    void send_data(data_packet const& data) {
        std::call_once(connection_init_flag_,
                       &X::open_connection, this);  // 멤버 함수 + this
        connection_.send_data(data);
    }

    data_packet receive_data() {
        std::call_once(connection_init_flag_,
                       &X::open_connection, this);
        return connection_.receive_data();
    }
};
```

요점은 다음과 같다.

- `connection_init_flag_`는 `X`의 멤버다. 인스턴스마다 한 번씩 초기화된다.
- `std::call_once`의 첫 인자는 flag, 두 번째 인자부터는 *호출할 함수와 인자*다. 멤버 함수면 `&X::open_connection`과 `this`를 전달한다.
- `send_data`든 `receive_data`든 어느 쪽이 먼저 호출되더라도 `open_connection`은 정확히 한 번만 실행된다. 그 동안 다른 스레드는 대기한다.

### once_flag의 특성

`std::once_flag`는 *복사도 이동도 불가능*하다. 클래스 멤버로 둘 때 클래스의 복사/이동도 막힌다. 보통 의도된 제약이지만, 필요하다면 클래스 복사 생성자를 직접 정의해 *새로운 flag로 초기화* 상태로 시작해야 한다.

```cpp
// once_flag는 복사 불가
std::once_flag a;
std::once_flag b = a;  // 컴파일 에러
```

또한 호출된 함수가 *예외를 던지면* flag는 set되지 않는다. 다음 호출이 다시 시도한다. 초기화 시도가 실패해도 영구적으로 망가지지 않는다는 보장이다.

```cpp
std::once_flag flag;

void init() {
    static int attempt = 0;
    ++attempt;
    if (attempt < 3) throw std::runtime_error("not yet");
    // 세 번째 시도에 성공
}

void caller() {
    try {
        std::call_once(flag, init);
    } catch (...) {
        // 다시 시도 가능
    }
}
```

## 3.8 락 입자도 (Granularity)

### 세밀한 락 vs 거친 락

| 입자도 | 장점 | 단점 |
|--------|------|------|
| **거친 락 (Coarse)** | 단순, 데드락 위험 낮음 | 병렬성 낮음 |
| **세밀한 락 (Fine)** | 병렬성 높음 | 복잡, 데드락 위험 |

```cpp
// 거친 락: 전체 컨테이너에 하나의 락
class CoarseQueue {
    std::mutex mtx_;
    std::queue<T> data_;
public:
    void push(T value) {
        std::lock_guard lock(mtx_);
        data_.push(std::move(value));
    }
    // ...
};

// 세밀한 락: 노드별 락 (6장에서 다룸)
// 더 복잡하지만 병렬 접근 가능
```

### 락 보유 시간 최소화

락을 잡고 있는 동안에는 **필요한 작업만** 수행한다.

```cpp
void bad() {
    std::lock_guard lock(mtx_);
    auto result = expensive_computation(data_);  // 💥 락 잡고 오래 계산
    send_to_network(result);                      // 💥 락 잡고 I/O
}

void good() {
    Data local_copy;
    {
        std::lock_guard lock(mtx_);
        local_copy = data_;  // 최소한의 작업만
    }
    auto result = expensive_computation(local_copy);  // 락 없이 계산
    send_to_network(result);                          // 락 없이 I/O
}
```

## 3.9 스레드 안전한 인터페이스

### top() + pop() 문제

```cpp
std::stack<int> s;

// 스레드 안전하지 않음!
if (!s.empty()) {
    int value = s.top();  // 다른 스레드가 pop 할 수 있음
    s.pop();              // 💥 이미 비어 있을 수 있음
}
```

`empty()`, `top()`, `pop()`이 개별적으로 보호되어도 **조합**이 안전하지 않다.

### 해결: 통합 인터페이스

```cpp
class threadsafe_stack {
    std::stack<T> data_;
    mutable std::mutex mtx_;
public:
    void push(T value) {
        std::lock_guard lock(mtx_);
        data_.push(std::move(value));
    }

    std::shared_ptr<T> pop() {
        std::lock_guard lock(mtx_);
        if (data_.empty()) throw empty_stack();
        auto result = std::make_shared<T>(std::move(data_.top()));
        data_.pop();
        return result;
    }

    bool try_pop(T& value) {
        std::lock_guard lock(mtx_);
        if (data_.empty()) return false;
        value = std::move(data_.top());
        data_.pop();
        return true;
    }
};
```

`top()`과 `pop()`을 **하나의 원자적 연산**으로 합쳤다.

### 왜 표준 stack이 그렇게 설계되었나

`std::stack`은 왜 `top()`과 `pop()`을 처음부터 분리했을까. 책 3.2.3절은 이를 *예외 안전성* 문제로 설명한다.

`pop()`이 값을 반환하려면 다음 순서가 필요하다.

```text
1. top()으로 최상위 원소 참조
2. 그 원소를 호출자에게 반환할 객체로 복사 (또는 이동)
3. pop()으로 stack에서 제거
```

문제는 2번에서 *복사 생성자가 예외를 던지면* 어떻게 되느냐다. 만약 단일 `pop()`이 값을 반환한다면, 예외 발생 시 *값이 사라진다*. stack에서는 이미 제거되었고, 호출자는 받지 못했다. `vector<int>` 같은 단순 타입은 안전하지만, `vector<MyClass>`처럼 복사가 던질 수 있는 타입은 위험하다.

표준 라이브러리는 안전을 택했다. `top()`은 참조만 반환(복사하지 않음), `pop()`은 `void`(값 반환 안 함). 호출자가 두 단계를 직접 조합하면서 자신의 예외 정책을 결정한다.

단일 스레드에서는 합리적이다. 멀티 스레드에서는 두 호출 사이에 다른 스레드가 끼어들면서 race condition이 된다.

### 통합 인터페이스의 네 가지 옵션

책은 race-free `pop()`을 만드는 네 가지 옵션을 제시한다.

```cpp
// Option 1: 참조로 반환받기
template<typename T>
class threadsafe_stack {
    std::stack<T> data_;
    mutable std::mutex m_;
public:
    void pop(T& value);  // 호출자가 미리 만든 객체에 채워줌
};
```

호출자는 `T`를 *기본 생성*해 둬야 한다. 모든 `T`가 기본 생성 가능한 것은 아니라는 제약이 생긴다.

```cpp
// Option 2: no-throw copy/move 타입만 허용
template<typename T,
         typename = std::enable_if_t<
             std::is_nothrow_copy_constructible_v<T> ||
             std::is_nothrow_move_constructible_v<T>>>
class threadsafe_stack {
public:
    T pop();  // 안전
};
```

타입 시스템으로 막는다. `int`, `std::shared_ptr<X>` 같은 타입은 OK. `std::string`은 컴파일 통과(이동이 noexcept). 사용자 정의 타입은 책임이 사용자에게 간다.

```cpp
// Option 3: 포인터 반환
template<typename T>
class threadsafe_stack {
public:
    std::shared_ptr<T> pop();  // nullptr이면 empty
};
```

`shared_ptr` 자체의 복사는 noexcept다. stack 내부에서 미리 `shared_ptr<T>`로 저장해 두면 `pop()`에서 안전하게 반환할 수 있다. 책이 권장하는 방식.

```cpp
// Option 4: 위 옵션들의 조합
template<typename T>
class threadsafe_stack {
public:
    std::shared_ptr<T> pop();         // 옵션 3
    void pop(T& value);               // 옵션 1
};
```

Williams의 표준 권고는 **옵션 3 + 옵션 1 조합**(책 Listing 3.5). 호출자에게 두 가지 선택지를 준다.

```cpp
struct empty_stack : std::exception {
    const char* what() const noexcept override { return "empty stack"; }
};

template<typename T>
class threadsafe_stack {
    std::stack<T> data_;
    mutable std::mutex m_;
public:
    threadsafe_stack() = default;
    threadsafe_stack(const threadsafe_stack& other) {
        std::lock_guard<std::mutex> lock(other.m_);
        data_ = other.data_;
    }
    threadsafe_stack& operator=(const threadsafe_stack&) = delete;

    void push(T new_value) {
        std::lock_guard<std::mutex> lock(m_);
        data_.push(std::move(new_value));
    }

    std::shared_ptr<T> pop() {
        std::lock_guard<std::mutex> lock(m_);
        if (data_.empty()) throw empty_stack();
        auto res = std::make_shared<T>(std::move(data_.top()));
        data_.pop();
        return res;
    }

    void pop(T& value) {
        std::lock_guard<std::mutex> lock(m_);
        if (data_.empty()) throw empty_stack();
        value = std::move(data_.top());
        data_.pop();
    }

    bool empty() const {
        std::lock_guard<std::mutex> lock(m_);
        return data_.empty();
    }
};
```

`empty()`는 여전히 race 가능성이 있다(반환 직후 다른 스레드가 push할 수 있다). 그러나 `empty()`로 분기한 뒤 `pop()`을 호출하는 패턴은 더 이상 *안전*하지 않다. 호출자에게 "확신이 없다면 try/catch로 `empty_stack`을 잡아라"고 요구한다.

### 인터페이스 race의 더 큰 교훈

`std::list`, `std::queue`, `std::map`도 같은 문제를 안고 있다. 모든 *조회 후 행동* 패턴이 race가 된다.

```cpp
// 어떤 표준 컨테이너든 모두 race
auto it = map.find(key);     // (1)
if (it != map.end()) {
    use(it->second);          // (2)
}
// (1)과 (2) 사이에 다른 스레드가 erase하면 it는 dangling
```

해결책은 같다. *질문과 행동을 하나의 락 안에서 묶는다*. 표준 컨테이너는 본질적으로 멀티 스레드용이 아니다. concurrent 컨테이너를 따로 설계하거나(6장, 7장), 외부에서 전체를 락으로 감싸야 한다.

## 정리

- **race condition**은 불변식이 일시적으로 깨지는 구간이 외부에 노출될 때 발생한다. doubly-linked list 삭제가 단일 스레드에선 안전한 이유와 멀티 스레드에선 위험한 이유를 같은 틀로 설명할 수 있다
- **데이터 레이스**는 정의되지 않은 동작이다. 반드시 동기화해야 한다
- `std::mutex`로 임계 영역을 보호한다. RAII 가드(`lock_guard`, `unique_lock`, `scoped_lock`)를 상황에 맞게 선택하라
- 인터페이스 레벨에서 원자성을 보장하라. `top() + pop()` 분리는 race이고, 통합 인터페이스의 네 가지 옵션 중 `shared_ptr<T> pop()`이 표준 해법이다
- **데드락**은 순환 대기에서 발생한다. 락 순서 고정, `std::scoped_lock`, hierarchical_mutex 중 상황에 맞는 전략을 쓴다
- C++14 이하에선 `std::lock` + `std::adopt_lock`을 조합하고, C++17부터는 `std::scoped_lock` 한 줄로 끝낸다
- `std::call_once`로 스레드 안전한 일회성 초기화. DCLP는 잘못된 패턴이다. 클래스 멤버 초기화에도 `once_flag`를 멤버로 둔다
- `std::shared_mutex`는 읽기 위주 워크로드에서 병렬성을 높인다. 짧은 임계 영역에선 오히려 느릴 수 있으니 측정이 필수
- `std::recursive_mutex`는 설계 결함의 응급조치다. 새 코드에서는 함수 분할(`_locked` 헬퍼)로 회피한다
- 락 입자도와 보유 시간을 최적화하라. 락 안에서는 I/O와 무거운 계산을 피한다

## 한국 개발자의 함정

```
1. *mutex.lock() / mutex.unlock() 직접*
   - 예외 시 unlock 안 됨 → deadlock
   - 반드시 lock_guard / unique_lock / scoped_lock
   - 직접 호출은 거의 *항상* 잘못

2. *volatile = thread-safe* (C++에서)
   - C/C++ volatile은 *최적화 방지*만, 동기화 아님
   - Java volatile과 의미 다름
   - thread-safe 필요 시 std::atomic 또는 mutex

3. *읽기는 락 없이 OK*라는 오해
   - C++ 데이터 레이스는 UB
   - 동시 읽기 OK, 읽기-쓰기 동시는 데이터 레이스
   - std::atomic 또는 shared_mutex 사용

4. *shared_mutex가 항상 빠름*
   - 읽기/쓰기 비율 + 임계 영역 길이에 의존
   - 짧은 임계 영역은 std::mutex가 더 빠를 수 있음
   - 측정 필수

5. *동시에 락 잡는 순서가 자유*
   - 락 순서가 모든 스레드에서 같아야 deadlock 회피
   - 어렵다면 std::scoped_lock 사용
   - hierarchical_mutex로 강제도 가능
```

## 실무 적용

```
이론 → 실무:
- std::mutex          → pthread_mutex_t, CRITICAL_SECTION
- std::recursive_mutex → pthread_mutex_t (PTHREAD_RECURSIVE)
- std::shared_mutex   → pthread_rwlock_t, SRWLOCK
- std::scoped_lock    → std::lock + adopt_lock 패턴
- std::call_once      → pthread_once
- thread_local        → __thread, TLS

언제 어느 락:
- 짧은 + 단일 자원      → std::mutex + lock_guard
- 여러 자원 동시 락     → std::scoped_lock
- 조건부 락 / 조기 해제 → std::unique_lock
- 읽기 압도적           → std::shared_mutex
- 일회성 초기화         → static (C++11+) 또는 std::call_once

설계 원칙:
- 락 보유 시간 최소화 (I/O 절대 금지)
- 인터페이스 레벨 원자성 (top + pop 통합)
- 락 그래프가 *DAG*이도록 설계
```

## 자기 점검

```
□ Data race가 UB인 이유?
□ race condition과 data race의 차이?
□ doubly-linked list 삭제의 불변식 위반 구간?
□ ++counter가 atomic 아닌 이유 (LOAD/ADD/STORE)?
□ lock_guard vs unique_lock vs scoped_lock?
□ std::lock + std::adopt_lock 패턴이 필요한 이유?
□ Coffman의 4조건과 회피 전략?
□ hierarchical_mutex의 thread_local 추적 메커니즘?
□ top() + pop() 분리의 race 문제와 네 가지 통합 옵션?
□ std::stack이 처음부터 top/pop을 분리한 예외 안전성 이유?
□ DCLP가 잘못된 이유와 call_once의 해결?
□ once_flag를 클래스 멤버로 둘 때의 제약(복사/이동 불가)?
□ shared_mutex의 writer starvation?
□ static local 변수와 call_once 차이?
□ recursive_mutex가 설계 결함의 신호인 이유와 _locked 헬퍼 패턴?
```

## 다음 장 예고

다음 장에서는 스레드 간 **동기화**를 다룬다. condition variable로 이벤트를 대기하고, future/promise로 결과를 전달하고, C++20의 latch와 barrier를 살펴본다.

## 관련 항목

- [Ch 2: Managing Threads](/blog/parallel/cpp-concurrency-in-action/chapter02-managing-threads)
- [Ch 4: Synchronizing Concurrent Operations](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
- [AMP Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention)
- [AMP Ch 8: Monitors](/blog/parallel/parallel-principles/ch08-monitors-and-blocking-synchronization)
