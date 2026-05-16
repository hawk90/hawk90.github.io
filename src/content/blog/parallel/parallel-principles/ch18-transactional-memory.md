---
title: "Chapter 18: Transactional Memory"
date: 2026-05-12T18:00:00
description: "락 없는 atomic block의 약속. Software TM, Hardware TM (Intel TSX, IBM POWER). 합성성과 진행 보장."
series: "The Art of Multiprocessor Programming"
seriesOrder: 18
tags: [parallel, concurrency, book-review, amp, transactional-memory, stm, htm, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 18 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 18.1 락의 문제

지금까지 본 모든 동기화 도구는 락 또는 lock-free 알고리즘. 둘 다 문제가 있다.

**락의 문제**:
- 합성 불가 — 두 함수를 합치면 deadlock 위험
- 잘못된 락 순서 → deadlock
- 우선순위 역전
- 보유 시간 / 임계 영역 분석 어려움

**Lock-Free의 문제**:
- 매우 복잡 (ABA, 메모리 회수)
- 자료구조마다 새 알고리즘
- 일반 코드에는 적용 어려움

**Transactional Memory** (TM)는 이 둘의 대안 약속.

## 18.2 Transactional Memory의 약속

```cpp
// 이상적인 TM 문법 (C++에는 없음)
atomic {
    if (account_a.balance >= 100) {
        account_a.balance -= 100;
        account_b.balance += 100;
    }
}
```

`atomic` 블록 안의 모든 작업이 **하나의 트랜잭션**처럼 실행. DB 트랜잭션처럼:

- **Atomicity** — 모두 성공 또는 모두 실패
- **Isolation** — 다른 트랜잭션과 격리

락 없이. 코드는 마치 단일 스레드인 것처럼 작성.

## 18.3 STM — Software Transactional Memory

소프트웨어로 TM을 구현.

**Optimistic Concurrency**:

1. 트랜잭션 시작 — 읽기 셋 / 쓰기 셋 추적
2. 트랜잭션 본문 실행 — 실제 메모리는 안 만지고 로그에
3. 커밋 시점 — 읽기 셋이 그 사이에 변경됐는지 확인
4. 안 변경됐으면 쓰기 셋을 실제 메모리에 반영, 커밋
5. 변경됐으면 **abort** 후 재시도

```cpp
// C++20 — STM 개념 구현 (단순화)
#include <unordered_map>
#include <atomic>
#include <functional>
#include <stdexcept>

template<typename T>
class TVar {
    std::atomic<T> value_;
    std::atomic<uint64_t> version_{0};

public:
    explicit TVar(T initial) : value_(initial) {}

    T read() const { return value_.load(std::memory_order_acquire); }
    uint64_t version() const { return version_.load(std::memory_order_acquire); }

    bool try_commit(T new_value, uint64_t expected_version) {
        uint64_t current = expected_version;
        if (version_.compare_exchange_strong(current, expected_version + 1,
                                              std::memory_order_acq_rel)) {
            value_.store(new_value, std::memory_order_release);
            return true;
        }
        return false;
    }

    friend class STMTransaction;
};

class STMTransaction {
    struct ReadEntry {
        void* var;
        uint64_t version;
    };

    struct WriteEntry {
        void* var;
        std::function<bool()> commit_fn;
    };

    std::vector<ReadEntry> read_set_;
    std::vector<WriteEntry> write_set_;
    bool aborted_ = false;

public:
    template<typename T>
    T read(TVar<T>& var) {
        T value = var.read();
        read_set_.push_back({&var, var.version()});
        return value;
    }

    template<typename T>
    void write(TVar<T>& var, T value) {
        uint64_t ver = var.version();
        read_set_.push_back({&var, ver});
        write_set_.push_back({
            &var,
            [&var, value, ver]() { return var.try_commit(value, ver); }
        });
    }

    bool validate() {
        for (auto& entry : read_set_) {
            auto* var = static_cast<TVar<int>*>(entry.var);  // 단순화
            if (var->version() != entry.version) {
                return false;  // 충돌 발생
            }
        }
        return true;
    }

    bool commit() {
        if (!validate()) {
            return false;  // abort
        }
        for (auto& entry : write_set_) {
            if (!entry.commit_fn()) {
                return false;  // abort
            }
        }
        return true;
    }
};

// 사용 예
template<typename F>
void atomically(F&& fn) {
    while (true) {
        STMTransaction tx;
        try {
            fn(tx);
            if (tx.commit()) {
                return;  // 성공
            }
        } catch (...) {
            // abort
        }
        // 재시도
    }
}
```

```c
// C11 — STM 개념 구현 (단순화)
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    atomic_int value;
    atomic_uint_fast64_t version;
} TVar_int;

#define MAX_READ_SET 64
#define MAX_WRITE_SET 64

typedef struct {
    TVar_int* var;
    uint64_t version;
} ReadEntry;

typedef struct {
    TVar_int* var;
    int new_value;
    uint64_t expected_version;
} WriteEntry;

typedef struct {
    ReadEntry read_set[MAX_READ_SET];
    WriteEntry write_set[MAX_WRITE_SET];
    size_t read_count;
    size_t write_count;
} STMTransaction;

void stm_init(STMTransaction* tx) {
    tx->read_count = 0;
    tx->write_count = 0;
}

int stm_read(STMTransaction* tx, TVar_int* var) {
    int value = atomic_load(&var->value);
    uint64_t ver = atomic_load(&var->version);

    tx->read_set[tx->read_count].var = var;
    tx->read_set[tx->read_count].version = ver;
    tx->read_count++;

    return value;
}

void stm_write(STMTransaction* tx, TVar_int* var, int value) {
    uint64_t ver = atomic_load(&var->version);

    tx->read_set[tx->read_count].var = var;
    tx->read_set[tx->read_count].version = ver;
    tx->read_count++;

    tx->write_set[tx->write_count].var = var;
    tx->write_set[tx->write_count].new_value = value;
    tx->write_set[tx->write_count].expected_version = ver;
    tx->write_count++;
}

bool stm_validate(STMTransaction* tx) {
    for (size_t i = 0; i < tx->read_count; ++i) {
        TVar_int* var = tx->read_set[i].var;
        if (atomic_load(&var->version) != tx->read_set[i].version) {
            return false;  // 충돌
        }
    }
    return true;
}

bool stm_commit(STMTransaction* tx) {
    if (!stm_validate(tx)) {
        return false;
    }

    for (size_t i = 0; i < tx->write_count; ++i) {
        TVar_int* var = tx->write_set[i].var;
        uint64_t expected = tx->write_set[i].expected_version;

        if (!atomic_compare_exchange_strong(&var->version, &expected, expected + 1)) {
            return false;  // 다른 트랜잭션이 먼저 커밋
        }
        atomic_store(&var->value, tx->write_set[i].new_value);
    }
    return true;
}

// 사용 예
void transfer_money(TVar_int* from, TVar_int* to, int amount) {
    while (1) {
        STMTransaction tx;
        stm_init(&tx);

        int from_balance = stm_read(&tx, from);
        int to_balance = stm_read(&tx, to);

        if (from_balance >= amount) {
            stm_write(&tx, from, from_balance - amount);
            stm_write(&tx, to, to_balance + amount);

            if (stm_commit(&tx)) {
                return;  // 성공
            }
        } else {
            return;  // 잔액 부족
        }
        // 재시도
    }
}
```

**장점**: 일반 코드처럼 자연스럽다. 합성 가능.
**단점**: 충돌 시 abort → 재실행 비용.

## 18.4 합성성 — TM의 가장 큰 가치

락의 가장 큰 문제는 **합성 불가**.

```cpp
// C++20 — 락 기반의 합성 문제
#include <mutex>

class Account {
    int balance_;
    std::mutex mtx_;

public:
    void deposit(int amount) {
        std::lock_guard lock(mtx_);
        balance_ += amount;
    }

    void withdraw(int amount) {
        std::lock_guard lock(mtx_);
        balance_ -= amount;
    }
};

// 두 함수를 합치려면?
void transfer(Account& from, Account& to, int amount) {
    // 락 순서 문제 — deadlock 위험!
    std::scoped_lock lock(from.mtx_, to.mtx_);  // 해결책
    from.balance_ -= amount;
    to.balance_ += amount;
}
// 그러나 모든 함수가 이렇게 설계되어야 함
```

TM에서는 자연스러움.

```cpp
// 이상적인 TM (개념)
void transfer(TVar<int>& from, TVar<int>& to, int amount) {
    atomically([&](auto& tx) {
        int from_bal = tx.read(from);
        int to_bal = tx.read(to);

        if (from_bal >= amount) {
            tx.write(from, from_bal - amount);
            tx.write(to, to_bal + amount);
        }
    });
}
```

`atomic` 블록은 합성이 자유롭다. 함수의 `atomic`이 호출자의 `atomic` 안에 자연스럽게 nested.

이게 TM의 진정한 가치 — **모듈러 동시성**.

## 18.5 STM의 비용

좋은 점만 있는 건 아니다.

**1. 메타데이터 비용**

읽기 셋 / 쓰기 셋 추적에 메모리 + CPU. 매 메모리 접근이 추가 비용.

**2. 충돌 시 재실행**

낙관적 — 충돌 거의 없다는 가정. 충돌 많으면 락보다 나쁨.

**3. I/O와 안 맞음**

트랜잭션이 abort 가능. 그 안에서 I/O를 하면 — 어떻게 롤백? Console에 출력했다 abort하면 출력이 거짓이 됨.

**4. 성능**

STM은 일반적으로 lock-free보다 느림. 잘 짠 lock 기반보다도 가끔 느림.

이런 이유로 STM은 학계의 관심에 비해 산업에서는 제한적으로 사용.

## 18.6 HTM — Hardware Transactional Memory

CPU가 TM을 직접 지원.

**Intel TSX** (Transactional Synchronization Extensions, 2013):
- `XBEGIN`, `XEND`, `XABORT` 명령어
- Cache coherence 메커니즘이 충돌 감지
- 충돌 시 CPU가 자동 abort

> **현재 상태**: TAA 사이드 채널 취약점(2019) 이후 Intel은 Skylake~Coffee Lake에서 마이크로코드로 TSX를 *영구 비활성화*했고, Alder Lake 이후 컨슈머 CPU에서는 기본 *제공 안 함*. Sapphire Rapids 등 일부 서버/HPC 라인에만 잔존. 새 코드에서 TSX 의존은 권장하지 않는다.

**IBM POWER8+, ARM** — 비슷한 지원 (ARM TME는 v9 일부 구현).

```cpp
// GCC/Clang — Intel TSX intrinsics
#include <immintrin.h>

void critical_section_with_tsx() {
    unsigned status;

    // 트랜잭션 시작 시도
    if ((status = _xbegin()) == _XBEGIN_STARTED) {
        // 트랜잭션 안에서 실행
        // ... 임계 영역 코드 ...

        _xend();  // 트랜잭션 커밋
    } else {
        // Fallback — 일반 락 사용
        // status에 abort 이유가 있음
        take_fallback_lock();
        // ... 임계 영역 코드 ...
        release_fallback_lock();
    }
}
```

```c
// C — Intel TSX intrinsics
#include <immintrin.h>
#include <threads.h>

mtx_t fallback_lock;

void critical_section_with_tsx(void) {
    unsigned status;

    if ((status = _xbegin()) == _XBEGIN_STARTED) {
        // 트랜잭션 실행
        // ... 임계 영역 ...
        _xend();
    } else {
        // Fallback
        mtx_lock(&fallback_lock);
        // ... 임계 영역 ...
        mtx_unlock(&fallback_lock);
    }
}
```

**장점**: 매우 빠름 — 충돌 없으면 거의 free.
**단점**: 작은 트랜잭션만 가능 (cache line 수 제한), 항상 fallback path 필요.

## 18.7 HTM의 사용 패턴 — Lock Elision

가장 흔한 HTM 사용:

```
1. 락 잡으려 시도 — 그러나 실제로 락 안 잡고 트랜잭션 시작
2. 임계 영역 실행
3. 끝에서 commit
4. 충돌 시 — 진짜 락으로 fallback
```

```cpp
// C++20 — Lock Elision 패턴
#include <immintrin.h>
#include <mutex>
#include <atomic>

class ElisionMutex {
    std::atomic<bool> locked_{false};
    static constexpr int MAX_RETRIES = 3;

public:
    void lock() {
        // TSX로 시도
        for (int i = 0; i < MAX_RETRIES; ++i) {
            unsigned status;
            if ((status = _xbegin()) == _XBEGIN_STARTED) {
                // 다른 스레드가 락을 잡았는지 확인
                if (!locked_.load(std::memory_order_relaxed)) {
                    return;  // 트랜잭션으로 진행
                }
                _xabort(0xFF);  // 다른 스레드가 락 보유 중
            }

            // abort 이유 분석
            if (status & _XABORT_RETRY) {
                continue;  // 재시도 가능
            }
            break;  // fallback으로
        }

        // Fallback — 실제 락
        while (locked_.exchange(true, std::memory_order_acquire)) {
            while (locked_.load(std::memory_order_relaxed)) {
                // spin
            }
        }
    }

    void unlock() {
        if (_xtest()) {
            _xend();  // 트랜잭션 커밋
        } else {
            locked_.store(false, std::memory_order_release);
        }
    }
};
```

여러 스레드가 같은 락을 잡으려 시도해도, 실제로 충돌하지 않으면 동시 실행. 충돌 시에만 직렬화.

**효과** — 락의 의미는 유지하면서 경합 적을 때는 lock-free처럼 빠름. Linux 커널, glibc의 `pthread_rwlock` 등에 적용된 적 있음.

## 18.8 C++ Transactional Memory TS

C++ 표준에서는 Transactional Memory TS (Technical Specification)가 제안되었다.

```cpp
// C++ TM TS (실험적, 컴파일러 지원 필요)
// GCC -fgnu-tm 옵션으로 사용 가능

void transfer(int& from, int& to, int amount) {
    __transaction_atomic {
        if (from >= amount) {
            from -= amount;
            to += amount;
        }
    }
}

// relaxed 트랜잭션 (I/O 허용, 그러나 위험)
void log_and_transfer(int& from, int& to, int amount) {
    __transaction_relaxed {
        if (from >= amount) {
            from -= amount;
            to += amount;
            printf("Transferred %d\n", amount);  // 위험!
        }
    }
}
```

그러나 아직 표준 C++에는 포함되지 않았고, 컴파일러 지원도 제한적이다.

## 18.9 TM의 미래

TM이 20년 넘게 연구됐지만 **주류로 자리 잡지 못했다**. 이유.

**1. HTM의 한계**

작은 트랜잭션만 가능. 일반 코드에는 fallback path가 필수.

**2. STM의 성능 부족**

좋은 케이스에서도 lock-free에 못 미침.

**3. 디자인 복잡도**

쉬워 보이는 추상화지만 — I/O, 예외, 다른 abort 가능 작업과의 상호작용이 복잡.

**4. 대안의 성장**

Lock-free 라이브러리, message passing, actor 모델 등이 다른 길.

다만 GC 언어 + STM은 여전히 흥미로운 영역. Haskell의 STM이 가장 성공한 사례 — pure 함수 + 명시적 atomic의 조합.

## 18.10 실용적 대안들

TM 대신 실무에서 쓰는 패턴들.

```cpp
// C++20 — RCU (Read-Copy-Update) 패턴
#include <atomic>
#include <memory>

template<typename T>
class RCUProtected {
    std::atomic<std::shared_ptr<T>> ptr_;

public:
    explicit RCUProtected(T value)
        : ptr_(std::make_shared<T>(std::move(value))) {}

    // 읽기 — 락 없음
    std::shared_ptr<T> read() const {
        return ptr_.load(std::memory_order_acquire);
    }

    // 쓰기 — copy-on-write
    template<typename F>
    void update(F&& modifier) {
        std::shared_ptr<T> old_ptr, new_ptr;
        do {
            old_ptr = ptr_.load(std::memory_order_acquire);
            new_ptr = std::make_shared<T>(*old_ptr);
            modifier(*new_ptr);
        } while (!ptr_.compare_exchange_weak(
            old_ptr, new_ptr,
            std::memory_order_release,
            std::memory_order_acquire));
    }
};

// 사용
RCUProtected<Config> config(Config{});
auto current = config.read();  // 락 없음
config.update([](Config& c) { c.timeout = 5000; });
```

```cpp
// C++20 — Hazard Pointers (lock-free 메모리 회수)
#include <atomic>
#include <array>
#include <thread>

template<typename T, size_t MaxThreads = 64>
class HazardPointer {
    struct HazardRecord {
        std::atomic<std::thread::id> owner{std::thread::id{}};
        std::atomic<T*> ptr{nullptr};
    };

    static inline std::array<HazardRecord, MaxThreads> hazards_;

public:
    class Guard {
        HazardRecord* record_;
    public:
        explicit Guard(T* ptr) {
            // 빈 슬롯 찾기
            for (auto& h : hazards_) {
                std::thread::id empty{};
                if (h.owner.compare_exchange_strong(
                        empty, std::this_thread::get_id())) {
                    record_ = &h;
                    record_->ptr.store(ptr, std::memory_order_release);
                    return;
                }
            }
            throw std::runtime_error("No hazard slot available");
        }

        ~Guard() {
            record_->ptr.store(nullptr, std::memory_order_release);
            record_->owner.store(std::thread::id{}, std::memory_order_release);
        }
    };

    static bool is_hazardous(T* ptr) {
        for (auto& h : hazards_) {
            if (h.ptr.load(std::memory_order_acquire) == ptr) {
                return true;
            }
        }
        return false;
    }
};
```

## 18.11 정리 — TM의 위상

20년 후의 결론:

- **HTM** — 락 elision의 도구로 일부 환경에서 유용. 일반 도구는 아님.
- **STM** — Haskell 같은 함수형 환경에서 우아함. 그 외에선 거의 안 쓰임.
- **C++ TM TS** — 실험적, 표준 채택 불확실
- **연구는 계속** — 매년 새 논문 나옴.

실무자는 여전히 락 / lock-free 라이브러리 / 메시지 패싱을 쓴다. TM은 흥미로운 가능성이지만 마지막 도구가 되진 못했다.

## 정리

- **Transactional Memory** — atomic 블록으로 락 대체하는 추상화
- **STM** — 소프트웨어 구현, 합성 가능, 그러나 비싸다
- **HTM** — 하드웨어 지원, 작은 트랜잭션에 빠름
- 가장 큰 가치는 **합성성** — 락의 가장 큰 문제 해결
- **Lock Elision** — HTM의 실용적 사용
- **대안**: RCU, Hazard Pointers, Actor Model

## 시리즈 마무리

18장의 여정을 끝내며.

**Part 1 (Ch 1-3)**: 정확성 이론 — sequential consistency, linearizability, progress conditions.
**Part 2 (Ch 4-6)**: 토대 — memory, consensus, universality.
**Part 3 (Ch 7-8)**: 락 — spin / blocking / monitor.
**Part 4 (Ch 9-15)**: 자료구조 — list / queue / stack / counter / hash / skiplist / PQ.
**Part 5 (Ch 16-18)**: 스케줄링 / 동기화 / 미래 — work stealing / barrier / TM.

이 18장이 모든 모던 동시성 시스템의 이론적 토대다. **정확성을 정의하고, 그 정의 위에서 정확하고 빠른 알고리즘을 짓는다**.

## 한국 개발자의 함정

```
1. *TM = lock-free*라는 오해
   - TM은 abort/retry 기반 — wait-free가 아님
   - 충돌 시 진행 보장 없음
   - 일부 시스템은 retry 횟수 제한

2. *Intel TSX는 현역 도구*
   - TAA 취약점 이후 컨슈머 CPU 대부분 영구 비활성화 (Skylake~Coffee Lake 마이크로코드, Alder Lake 이후 미탑재)
   - Sapphire Rapids 등 서버 라인에만 잔존
   - 새 코드에서 TSX 의존 비권장
   - HTM 학습 목적으론 여전히 가치 있으나 운영 가정은 금물

3. *STM이 lock-free 자료구조 대체*
   - 일반 코드엔 매력적이지만 성능 부족
   - 잘 짠 lock-free / fine-grained lock보다 보통 느림
   - 합성성이 필요한 곳에만

4. *atomic 블록에서 I/O 자유*
   - I/O는 abort 불가 — 트랜잭션 의미 깨짐
   - Haskell STM은 타입으로 막음
   - 다른 언어는 프로그래머가 주의
```

## 실무 적용

```
이론 → 실무:
- HTM (Intel TSX)        → glibc pthread, Linux kernel (일부)
- Lock Elision           → glibc rwlock (실험적)
- STM                    → Haskell stm, Clojure refs
- C++ TM TS              → GCC -fgnu-tm (실험적)

언어별:
- C++: Intel TSX intrinsics, GCC TM TS (실험적)
- C: Intel TSX intrinsics
- Haskell: TVar, atomically, retry, orElse
- Clojure: ref, dosync, alter, ensure
- Rust: 표준 없음 (lock-free 라이브러리 선호)

실용적 대안:
- RCU (Read-Copy-Update) — 읽기 많은 워크로드
- Hazard Pointers — lock-free 메모리 회수
- Actor Model — Erlang/Elixir, Akka(2022년 BSL로 전환, Apache Pekko가 오픈소스 포크)
- Message Passing — Go channels, Rust channels
```

## 자기 점검

```
□ TM이 락의 어떤 문제를 해결?
□ STM의 optimistic concurrency 메커니즘?
□ HTM의 cache coherence 기반 충돌 감지?
□ Lock Elision의 작동 원리?
□ TM이 주류가 못 된 이유?
□ RCU와 Hazard Pointers의 용도?
```

## 관련 항목

- [Ch 17: Barriers](/blog/parallel/parallel-principles/ch17-barriers)
- [Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction) — 시작점
- [Ch 10: Queue와 ABA](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem) — lock-free 어려움
- [C++ Concurrency in Action Ch 7: Lock-Free](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
