---
title: "Ch 4: 데드락 / Race 진단 방법론"
date: 2025-09-04T04:00:00
description: "데드락 그래프, race condition 분류, lock-free 함정, lost update / ABA / 메모리 reorder 진단."
tags: [deadlock, race-condition, lock-free, aba, memory-ordering]
series: "Concurrency Debugging"
seriesOrder: 4
draft: true
---

멀티스레드 버그의 80%가 데드락·race·메모리 순서 문제로 귀결됩니다. 이 장은 *각각의 정체*와 *체계적 진단 방법*을 정리합니다. 락 보유 그래프, race condition의 5가지 분류, lock-free 데이터구조의 ABA 문제, 그리고 메모리 모델 reorder까지.

## 한 줄 요약

데드락 = 사이클 있는 락 보유 그래프. Race = 두 스레드가 동기화 없이 공유 데이터에 접근. Lock-free의 ABA = 같은 값으로 보이지만 사이에 변화. 메모리 reorder = CPU가 명령 순서를 바꿈.

## 데드락의 4 조건 (Coffman 조건)

데드락이 일어나려면 *동시에 네 조건* 모두 만족.

1. **Mutual exclusion** — 자원을 한 번에 한 스레드만.
2. **Hold and wait** — 자원 들고 다른 자원 대기.
3. **No preemption** — 다른 스레드가 *강제로 빼앗을 수 없음*.
4. **Circular wait** — 대기 사이클.

하나라도 깨면 데드락 회피.

## 데드락 그래프

각 노드 = 스레드, 각 엣지 = "스레드 A가 락 X를 기다리는데 락 X는 스레드 B가 들고 있다".

![데드락 — hold/wait 사이클](/images/blog/tools/diagrams/deadlock-graph.svg)

사이클 = 데드락.

### 그래프 직접 그리기

`thread apply all bt`의 출력을 보고 *각 스레드의 *대기 락* + *보유 락*을 추출.

```python
import gdb
import re

class DeadlockCheck(gdb.Command):
    def __init__(self):
        super().__init__("deadlock-check", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        edges = []        # (thread_waiting, mutex_addr)
        owners = {}       # mutex_addr -> thread_holding
        for thread in gdb.selected_inferior().threads():
            thread.switch()
            frame = gdb.newest_frame()
            # 콜스택 내려가며 __lll_lock_wait + mutex 추출
            f = frame
            while f:
                name = f.function() and f.function().name
                if name == 'pthread_mutex_lock':
                    try:
                        mutex_arg = f.read_var('mutex')
                        mutex_addr = int(mutex_arg)
                        owner_tid = int(mutex_arg['__data']['__owner'])
                        edges.append((thread.num, mutex_addr))
                        owners[mutex_addr] = owner_tid
                    except gdb.error:
                        pass
                    break
                f = f.older()

        # 사이클 검출
        # ...

DeadlockCheck()
```

대규모 프로세스에서 *자동 데드락 탐지* 도구의 출발점.

## 데드락 회피 — 락 순서

```c
// BAD: 락 순서가 코드 위치에 따라 다름
void f1() {
    mu_a.lock();
    mu_b.lock();    // A then B
    ...
}
void f2() {
    mu_b.lock();
    mu_a.lock();    // B then A — 데드락 가능
    ...
}
```

해법: *전역 락 순서*. 예: 메모리 주소 순서.

```c
void lock_both(mutex_t *a, mutex_t *b) {
    if (a < b) {
        a->lock(); b->lock();
    } else {
        b->lock(); a->lock();
    }
}
```

또는 `std::scoped_lock` (C++17) / `std::lock` — 표준 라이브러리가 *데드락 회피 알고리즘*으로 여러 락을 안전히 잡음.

```cpp
std::scoped_lock lk(mu_a, mu_b);    // 데드락 free
```

## try_lock + back-off

```c
while (1) {
    a->lock();
    if (b->try_lock()) break;
    a->unlock();
    usleep(rand() % 100);
}
```

`try_lock` 실패하면 *둘 다 풀고 잠시 대기*. 데드락 없지만 *livelock* 위험 (스레드 둘 다 같은 시점에 retry).

## hierarchical lock

각 락에 *레벨*을 부여. 항상 *낮은 레벨 → 높은 레벨* 순서로만.

```c
class HierarchyMutex {
    int level;
    std::mutex mu;
    static thread_local int current_level;
    
    void lock() {
        if (current_level >= level)
            throw "hierarchy violation";
        mu.lock();
        prev_level = current_level;
        current_level = level;
    }
    void unlock() {
        current_level = prev_level;
        mu.unlock();
    }
};
```

런타임에 hierarchy 검사. 디버그 빌드에만 활성화.

## Race condition — 5가지 분류

### 1. Data race

두 스레드가 *동기화 없이* 같은 메모리에 접근하고 *적어도 하나가 쓰기*.

```c
int counter = 0;

void incr() { counter++; }     // RACE — 동시 호출 시 잃은 update
```

C11/C++11에서 *undefined behavior*. 표준 해법: atomic 또는 mutex.

```c
std::atomic<int> counter = 0;
counter.fetch_add(1, std::memory_order_relaxed);
```

### 2. Lost update

```c
int x;
void update() {
    int tmp = x;
    tmp = tmp + 1;
    x = tmp;     // 비-atomic
}
```

두 스레드가 동시 호출 → 둘 다 0을 읽고, 둘 다 1을 쓰면 *update 하나 잃음*.

### 3. Read-modify-write race

```c
// 위와 같음. CAS로 해결.
do {
    old = x.load();
    new_val = old + 1;
} while (!x.compare_exchange_weak(old, new_val));
```

### 4. Time-of-check / time-of-use (TOCTOU)

```c
if (file_exists("/tmp/foo")) {     // check
    int fd = open("/tmp/foo", ...); // use — 사이에 다른 스레드/프로세스가 삭제
}
```

해법: *atomic operation* — `open(..., O_CREAT | O_EXCL)`.

### 5. Order violation

```c
// Thread A
ready = true;
data = compute();

// Thread B
if (ready) use(data);   // data가 아직 계산 안 됐을 수 있음
```

순서가 *암시적 가정*. 메모리 fence 또는 release/acquire으로 보장.

## TSan으로 race 자동 검출

ThreadSanitizer가 *happens-before* 관계를 추적.

```bash
$ clang -fsanitize=thread -g ./prog.c -o prog
$ ./prog
==================
WARNING: ThreadSanitizer: data race (pid=12345)
  Write of size 4 at 0x7b... by thread T1:
    #0 increment counter.cpp:12
    #1 worker counter.cpp:30

  Previous read of size 4 at 0x7b... by main thread:
    #0 main counter.cpp:50

  Location is global 'counter' of size 4 at 0x...
==================
```

*어디서 race*인지 정확히. CI에 통합하면 *모든 race 자동 차단*.

오버헤드 — *5-10x 느림*. CI 또는 일일 빌드에만.

## Helgrind / DRD

Valgrind 위의 race detector. TSan보다 *훨씬 느리지만* recompile 불필요.

```bash
$ valgrind --tool=helgrind ./prog
$ valgrind --tool=drd ./prog
```

상용 바이너리에 적용 가능. 한 번 실행이 *수십 분 ~ 시간* — CI 적용은 부담.

## Lock-free와 ABA 문제

ABA가 lock-free 데이터구조의 *고전 함정*.

```
Thread A: head를 읽음 → ptr X
Thread A: 다른 작업 중 정지
Thread B: X를 pop → free
Thread B: 새 노드 alloc → 우연히 같은 주소 X로
Thread B: 새 노드 push, head = X
Thread A: 재개 — head 비교 → X 같음! CAS 성공
하지만 X는 *전혀 다른 노드*!
```

해법.

### 1. Hazard pointers

Maged Michael의 해법. 각 스레드가 *읽고 있는 포인터*를 hazard로 표시 → 다른 스레드가 free 못 함.

```c
hazard_ptr.set(ptr);
if (atomic_load(&head) != ptr) { /* retry */ }
// 이제 ptr은 free되지 않음 (다른 스레드들이 hazard 검사)
...
hazard_ptr.clear();
```

복잡하지만 정확.

### 2. Tagged pointer / counter

각 포인터에 *generation counter*를 함께 저장.

```c
struct TaggedPtr {
    Node *ptr;
    uint64_t tag;       // 매 CAS마다 증가
};
std::atomic<TaggedPtr> head;

TaggedPtr old = head.load();
while (!head.compare_exchange_weak(old, {new_ptr, old.tag + 1})) {}
```

64-bit 시스템에서 128-bit CAS (CMPXCHG16B) 필요. 또는 *주소의 사용 안 하는 비트*에 counter 박기.

### 3. Epoch-based reclamation

각 작업에 *epoch*. free된 메모리는 *어떤 활성 epoch 가진 스레드도 안 들고 있을 때*만 실제 해제.

userspace RCU (URCU) 라이브러리가 이 방식.

### 4. Wait-free queue / stack

ABA 자체를 회피하는 알고리즘 설계. 매우 어렵고 미세한 차이로 정확성 깨짐.

GDB로 lock-free race를 잡는 건 *거의 불가능* — 너무 빠르고 비결정적. TSan 또는 정적 분석 (cppcheck, Coverity).

## 메모리 모델 — reorder

CPU가 *명령 순서를 바꿀 수 있음*. 단일 스레드에선 *결과 동일*하면 OK지만 멀티스레드에선 다른 스레드가 *중간 상태를 봄*.

```c
// Thread A
data = 42;
ready = true;       // 이 두 줄이 reorder될 수 있음

// Thread B
if (ready) {
    use(data);      // data가 42인가? 아닐 수도!
}
```

CPU 종류별 reorder.

| CPU | 허용 reorder |
|-----|--------------|
| x86 | StoreLoad만 (가장 제한적) |
| ARM | 거의 모든 reorder |
| POWER | 가장 약함 |

x86은 *비교적 안전*하지만 ARM은 *매우 위험*. ARM에 옮긴 후 race가 *나타나는* 일이 흔함.

해법: *memory order* 명시.

```cpp
// release/acquire pair
std::atomic<bool> ready{false};
int data;

// Thread A
data = 42;
ready.store(true, std::memory_order_release);

// Thread B
while (!ready.load(std::memory_order_acquire));
use(data);    // 안전
```

release-acquire가 *그 시점 이전의 모든 쓰기가 다른 스레드에 보임*을 보장.

| memory_order | 의미 |
|--------------|------|
| `relaxed` | 순서 보장 없음 (atomic만) |
| `consume` | 의존 데이터만 보장 (거의 deprecated) |
| `acquire` | 이후 read/write가 *재배치 안 됨 위로* |
| `release` | 이전 read/write가 *재배치 안 됨 아래로* |
| `acq_rel` | 둘 다 |
| `seq_cst` | 가장 엄격, 전역 순서 |

대부분 코드는 *seq_cst*로 시작 (안전), 성능 critical 영역에서 *acq_rel* 또는 *release*만.

## fence — 명시적 메모리 장벽

```cpp
std::atomic_thread_fence(std::memory_order_release);
```

특정 위치에서 *reorder 막기*. 자체 lock-free 구현에서.

## 진단 흐름 (실전)

### 1. 증상 분류

- *재현 가능* → GDB 직접.
- *재현 불가* / *비결정적* → rr 또는 TSan.
- *프로덕션만* → core dump + log.
- *특정 환경만* → 환경 변수 (LD_PRELOAD malloc tracking 등).

### 2. 데드락 의심

```text
(gdb) attach <pid>
(gdb) info threads
(gdb) thread apply all bt
```

`__lll_lock_wait` / `pthread_cond_wait`이 많은가? 각 락의 `__owner`로 그래프.

### 3. Race 의심

증상: *가끔* 잘못된 결과, *load 부하 시* 나타남, *single thread에선 안 일어남*.

→ TSan 빌드로 자동 검출.

### 4. Lock-free 버그

증상: ABA, *드물게* crash, *atomic 사용 코드*.

→ 단위 테스트 + ThreadSanitizer + 정적 분석. 디버거로 직접 잡기 매우 어려움.

### 5. 메모리 reorder

증상: x86에서 안 일어나는데 ARM에서 일어남.

→ memory order 명시, fence 추가, *acq_rel*로 시작 후 *relaxed*로 최적화.

## 자주 보이는 패턴 — Double-checked locking

```c
// 고전 버그
Singleton *get() {
    if (!instance) {                   // race
        std::lock_guard lk(mu);
        if (!instance)
            instance = new Singleton;
    }
    return instance;
}
```

C++11+ 표준 해법:

```cpp
std::call_once(flag, []{ instance = new Singleton; });
return instance;
```

또는 `static` 변수의 *thread-safe 초기화* 보장 활용:

```cpp
Singleton& get() {
    static Singleton instance;
    return instance;
}
```

C++11+은 static 초기화가 *자동으로 thread-safe*. 옛 코드는 manual로.

## 정리

- 데드락 = 4조건 + 사이클 락 그래프.
- `thread apply all bt` + `mutex->__owner`로 그래프 구성.
- 락 순서·`std::scoped_lock`·hierarchy로 회피.
- Race condition 5분류 — data race / lost update / RMW / TOCTOU / order.
- TSan으로 *자동 race 검출*.
- Lock-free의 ABA는 hazard pointer / tagged pointer / epoch로.
- 메모리 reorder는 *release/acquire*로 통제.
- 진단 흐름 — 재현성 / 영역 / 도구 선택.
- Double-checked locking은 `std::call_once` 또는 `static` 변수로.

## 다음 장 예고

Ch 5 (시리즈 마지막) — rr 시간 역행 + Pernosco + TSan/Helgrind 통합 워크플로.

## 관련 항목

- [Ch 3: 멀티프로세스 디버깅](/blog/tools/debugging/concurrency-debug/chapter03-fork-multiprocess)
- [Ch 5: rr / Pernosco / TSan](/blog/tools/debugging/concurrency-debug/chapter05-rr-tsan-workflow)
- [Sanitizers 시리즈](/blog/tools/debugging/sanitizers/chapter04-tsan-msan)
- [Valgrind Helgrind](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)
- [C++ memory model](https://en.cppreference.com/w/cpp/atomic/memory_order)
- [Preshing — Memory Reordering Caught in the Act](https://preshing.com/20120515/memory-reordering-caught-in-the-act/)
