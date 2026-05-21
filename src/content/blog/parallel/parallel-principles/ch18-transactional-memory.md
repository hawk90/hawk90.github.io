---
title: "Chapter 18: Transactional Memory"
date: 2026-05-06T18:00:00
description: "락 없는 atomic block의 약속. Software TM, Hardware TM (Intel TSX, IBM POWER). 합성성과 진행 보장."
series: "The Art of Multiprocessor Programming"
seriesOrder: 18
tags: [parallel, concurrency, book-review, amp, transactional-memory, stm, htm, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 18 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 일상의 비유로 보기

이 책의 마지막 장은 *락의 대안*에 관한 것이다. 18장의 한 줄 — **락 대신 atomic block, 충돌하면 재시도**. 데이터베이스 트랜잭션의 메모리 버전이라고 생각하면 된다.

은행 송금을 떠올린다. A 계좌에서 100원을 빼서 B 계좌에 더한다. 둘 사이에서 *돈이 증발*하거나 *복사*되면 안 된다. 두 계좌 모두 갱신이 성공하거나, 둘 다 갱신이 *없었던 것처럼* 취소되어야 한다. 데이터베이스 사람들이 ACID의 *A(Atomicity)*라고 부르는 성질이다. 트랜잭셔널 메모리는 *메모리 쓰기*에도 같은 보장을 주려는 시도다.

각 개념을 한 줄로 정리한다.

- **Transaction (atomic block)** — 은행 송금처럼 *전부 성공 또는 전부 취소*. 사용자는 `atomic { ... }` 블록 안에 일반 코드를 쓰고, 시스템이 commit/abort를 알아서 처리한다.
- **STM (Software TM)** — 책 묶음 단위로 락을 거는 *조용한 도서관*. 책 한 권마다 락이 아니라 *해시 묶음*(stripe) 단위로 락을 건다. 락 비용을 줄이면서 충돌 감지를 한다.
- **TL2 — striped locking** — STM의 표준 알고리즘. 글로벌 *버전 클럭*을 두고, 트랜잭션 시작 시점의 버전과 commit 시점의 버전을 비교해 *낡은 읽기*를 잡는다.
- **HTM (Intel TSX)** — 공사 현장의 무전기. 한 트럭이 *공사 중* 무전을 켜면 다른 트럭은 잠깐 멈춘다. 일이 끝나면 공사 중을 끈다. 충돌이 나면 무전기가 *abort* 신호를 보내고, 트럭은 처음부터 다시 시도한다. CPU 캐시 코히런스 위에 얹은 HW 가속이다.
- **Eager vs Lazy update** — 일을 *즉시* 처리실에 반영하는가, 결산이 끝난 *뒤*에 반영하는가의 차이. 즉시 반영(eager)은 commit이 빠른 대신 abort 시 *원복* 비용이 든다. 결산 후 반영(lazy)은 abort가 싸지만 commit 시 *모두 쓰기*가 한 번에 일어난다.

| 비유 | 시스템 사례 |
|------|------------|
| 은행 송금의 all-or-nothing | Haskell STM, Clojure ref/dosync, Java Multiverse |
| 책 묶음 단위 락 | TL2 striped lock (학술 STM) |
| 공사 중 무전기 | Intel TSX (HLE/RTM), IBM POWER8+ HTM |
| 즉시 vs 결산 후 반영 | Eager (TL2), Lazy (DSTM, NOrec) |
| 락 없는 일반 코드 합성 | Haskell `atomically`, Clojure `dosync` (Ch3 7CM 합성 보장과 연결) |

핵심 통찰은 두 가지다. 첫째, 락은 *합성이 안 된다* — 두 함수를 합쳐 쓰면 deadlock 위험. 트랜잭션은 *합성된다* — atomic block 안에 다른 atomic block을 넣을 수 있다. 둘째, *낙관적 동시성*(optimistic concurrency) — 일단 동시에 시작하고, 충돌이 *드물다*는 가정 아래 성능을 챙긴다. 충돌이 잦으면 retry overhead로 망한다.

이 장은 그 약속의 *세부 알고리즘*과 *현실의 한계*를 풀어 간다.

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

## 18.2 Serializability와 Linearizability

TM의 정확성은 두 기준의 *조합*으로 정의된다.

- **Serializability** (DB 트랜잭션의 기준) — 동시 실행된 트랜잭션들의 결과가 *어떤* 순차 실행 순서와 동등하다.
- **Linearizability** (책 Ch3의 기준) — 각 연산이 호출과 반환 *사이의* 어느 한 순간에 일어난 것처럼 보이고, 그 순간 순서는 실제 *실시간*과 일치한다.

DB는 보통 serializability만으로 충분. 그러나 메모리 트랜잭션은 *외부 관찰자*(다른 atomic 블록, 또는 lock-free 코드)가 있을 수 있다. 책은 두 가지를 합친 기준을 채택한다.

> **TM의 정확성**: 트랜잭션 시퀀스가 *직렬화 가능*하고, 직렬화 순서가 *실시간 순서*를 존중한다.

쉬운 말로: 두 트랜잭션 A, B가 *겹쳤다면* 어느 쪽이 먼저든 OK. *A가 완전히 끝난 뒤* B가 시작했다면 A → B 순서로 직렬화되어야 한다.

이게 깨지면 — 예컨대 트랜잭션이 *오래된* 값을 읽고 commit하면 — *write skew*나 *phantom* 같은 DB anomaly가 발생.

## 18.3 Transactional Memory의 약속

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

## 18.4 Atomic Block의 의미론

책 18.4절은 `atomic` 블록의 *언어 수준* 의미를 정리한다. 단순한 락 lookalike가 아니다.

**1. Nesting**

```cpp
// 중첩된 atomic — flat / closed / open nesting
void outer() {
    atomic {
        update_a();
        inner();         // atomic { update_b(); } 이 안에서
    }
}
```

- **Flat nesting** — 가장 단순. 안쪽 `atomic`이 바깥과 합쳐짐. 안쪽 abort = 바깥도 abort.
- **Closed nesting** — 안쪽이 abort해도 바깥은 살아남음. 부분 실패 처리 가능.
- **Open nesting** — 안쪽이 *독립적으로* commit. 바깥과 의미가 분리. 위험하지만 유연.

대부분 시스템은 flat nesting. closed/open은 학술적.

**2. Retry와 OrElse (Haskell STM)**

```haskell
-- Haskell STM의 control flow
withdraw acc amount = atomically $ do
  bal <- readTVar acc
  if bal >= amount
    then writeTVar acc (bal - amount)
    else retry        -- 트랜잭션 abort 후, 읽은 값이 바뀔 때까지 대기
```

`retry`는 *조건이 거짓이면 잠들었다가, 읽었던 변수 중 하나가 바뀌면 깨어남*. 모니터의 `wait`와 비슷하지만 *조건 자체*가 트랜잭션의 read set으로 자동 정의.

`orElse`로 두 트랜잭션을 *대안*으로 묶기.

```haskell
withdrawEither a b amount =
  atomically $ withdraw a amount `orElse` withdraw b amount
```

a에서 retry되면 자동으로 b 시도. 락으로는 *깨끗하게* 표현 불가능.

**3. I/O와 Atomic의 충돌**

`atomic` 안에서 `printf`, file write, network send는 모두 위험. 트랜잭션이 abort되어 *없던 일*이 되더라도 외부 효과는 *없던 일이 안 됨*.

Haskell은 타입으로 막음 — `STM` monad는 `IO`와 분리. 다른 언어는 프로그래머의 양심.

## 18.5 STM — Software Transactional Memory

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

## STM의 설계 결정

위의 예는 가장 단순한 STM 한 가지 그림. 책 18.5는 *설계 공간*을 네 축으로 정리한다.

### 1. Eager vs Lazy Update

**Eager (Direct write)**

쓰기를 *즉시* 메모리에 반영하고, 옛 값은 *undo log*에 기록.

```
write x = 7:
  log.push((x, x.read()))    // 옛 값 백업
  x.write(7)                 // 즉시 반영

commit:    그냥 락 해제
abort:     undo log 역순으로 복원
```

장점: commit이 싸다. 단점: abort 비용 크고, *다른 트랜잭션이 미완성 쓰기를 봄* → 격리 위해 더 비싼 락/버전 필요.

**Lazy (Deferred write)**

쓰기를 *redo log*에 모았다가, commit에서 한 번에 반영.

```
write x = 7:
  redo_log[x] = 7            // 로컬 버퍼

read x:
  if redo_log.has(x) return redo_log[x]  // 자기 쓰기 우선
  else return x.read()

commit:    redo log를 메모리에 flush
abort:     log 버리기 (값 자체는 그대로)
```

장점: abort가 거의 free. 단점: read에서 매번 *redo log 검색*, commit 시점에 *모든 쓰기*를 한꺼번에 — long commit phase.

대부분 STM은 *lazy* (TL2 포함). abort가 흔하다는 가정에 맞기 때문.

### 2. Read Set / Write Set

트랜잭션은 두 집합을 유지한다.

| 집합 | 내용 | 용도 |
|---|---|---|
| **Read set** | (var, observed_version) 쌍 | commit 시 *검증* — 그 사이 바뀌었나? |
| **Write set** | (var, new_value) 쌍 | commit 시 *반영* |

read set이 크면 검증 비용 폭발. 그래서 *주의 깊게 작성된* 트랜잭션은 read set을 작게 유지.

```cpp
// 큰 read set 회피: 불필요한 읽기 제거
atomic {
    int total = 0;
    for (auto& acc : accounts) {        // 모든 계좌 read → 거대 read set
        total += acc.balance;
    }
    summary.total = total;
}

// 줄이기: 미리 합계를 *유지*하는 자료구조
atomic {
    summary.total = total_cache.value;  // read set = 1
}
```

### 3. Validation 전략

read set이 still valid인지 *언제* 확인하는가.

**Pessimistic validation** — 매 read마다 모든 이전 read를 재검증.

비용: $O(n^2)$ 검증 (n = read 수). 그러나 *불일치를 빨리 발견* → 헛수고 줄임. Read-heavy long transaction에 좋음.

**Optimistic validation** — commit 시점에만 한꺼번에 검증.

비용: $O(n)$. 그러나 *abort까지의 헛수고*가 큼. 충돌 적은 워크로드에 적합.

대부분 STM은 optimistic + *간단한 빠른 체크* — 매 read에서 *전역 시계*만 비교 (TL2).

### 4. Word vs Object Granularity

충돌을 *어느 단위*로 감지하는가.

```cpp
// Word granularity — 메모리 워드별 버전
class Node {
    int x;     // version_x
    int y;     // version_y
    // 한 노드의 x, y에 다른 트랜잭션이 동시에 써도 충돌 아님
};

// Object granularity — 객체 전체에 한 버전
class Node {
    int x, y;
    int version;   // 객체 전체
    // x만 바꾸는 트랜잭션과 y만 바꾸는 트랜잭션이 *false conflict*
};
```

| 단위 | 장점 | 단점 |
|---|---|---|
| Word | 정확한 충돌 감지 | 메타데이터 폭증, cache pressure |
| Object | 메타데이터 작음 | False conflict 흔함 |

TL2는 *word*(엄밀히는 *주소 해시*를 통한 *lock 줄무늬*)를 쓴다. Java DSTM2는 *object*. 트레이드오프가 명확한 영역.

## TL2 — Transactional Locking II

**TL2** (Dice, Shalev, Shavit 2006)는 가장 영향력 있는 STM. 책 18.5.3에 그 구조가 소개된다.

핵심 아이디어 두 가지.

**1. 전역 버전 시계 (Global Version Clock)**

모든 commit이 단일 atomic counter를 증가. 트랜잭션은 시작 시점에 이 시계를 *snapshot*.

```cpp
std::atomic<uint64_t> global_clock{0};

uint64_t tx_start() { return global_clock.load(); }
uint64_t tx_commit() { return global_clock.fetch_add(1) + 1; }
```

**2. 줄무늬 락 (Striped Locks)**

메모리 주소를 해시해 $L$개의 락 슬롯 중 하나에 매핑. 각 슬롯은 *버전 번호*(보통 60bit) + *lock bit*(1bit) 결합 워드.

```
lock_word[hash(addr)] = (version << 1) | lock_bit
```

읽기는 락 없음. 쓰기는 *commit*에서만 락 잡음.

**TL2 트랜잭션 흐름**

```
1. start_version = global_clock.load()

2. 본문 실행:
   read(addr):
     lock_word_before = lock_word[hash(addr)]
     value = *addr
     lock_word_after  = lock_word[hash(addr)]
     if lock_bit_set or version > start_version: abort
     read_set.add(addr, version)
     return value

   write(addr, val):
     write_set[addr] = val   // lazy

3. commit:
   a) 모든 write_set 주소의 lock을 *순서대로* 획득 (lock acquire)
   b) commit_version = global_clock.fetch_add(1) + 1
   c) 모든 read_set 항목 재검증 — version 변화 없고 lock-free
   d) 실패 시 락 해제 후 abort
   e) write_set 메모리에 반영, lock_word의 version을 commit_version으로 갱신
```

**특징**

- 읽기는 거의 free — 메타데이터 두 번 읽고 비교만.
- 쓰기는 commit 시점에만 락 — short critical section.
- 전역 clock이 *유일한 hot variable* — fetch_add 하나당 한 commit.
- 빠르고, *불변* invariant가 명확.

대부분의 후속 STM은 TL2의 변형. GCC의 `libitm`, Clojure의 STM, 학계의 여러 시스템.

## 18.6 합성성 — TM의 가장 큰 가치

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

### HTM의 Hint와 Abort Code

책 18.7은 HTM이 *순수 HW*가 아니라 *HW + SW의 협력*임을 강조한다. `_xbegin()`의 반환값은 abort 이유를 담고, SW는 그 정보로 *정책*을 결정한다.

```cpp
// TSX abort 코드 분류
unsigned status = _xbegin();
if (status != _XBEGIN_STARTED) {
    if (status & _XABORT_EXPLICIT) {
        // _xabort()로 명시적 abort
        unsigned arg = _XABORT_CODE(status);
    }
    if (status & _XABORT_RETRY) {
        // 일시적 충돌 — 재시도 권장
    }
    if (status & _XABORT_CONFLICT) {
        // 다른 트랜잭션과 데이터 경합
    }
    if (status & _XABORT_CAPACITY) {
        // L1 cache 용량 초과 — 재시도해도 무의미, fallback
    }
    if (status & _XABORT_DEBUG) {
        // 디버그 이벤트 (breakpoint)
    }
    if (status & _XABORT_NESTED) {
        // 중첩 트랜잭션 abort
    }
}
```

전략 차이가 크다.

| Abort 이유 | 정책 |
|---|---|
| `RETRY` | 짧게 backoff 후 재시도 |
| `CONFLICT` | 약간의 backoff + 재시도, 반복되면 fallback |
| `CAPACITY` | 즉시 fallback (재시도 무의미) |
| `EXPLICIT` | 의도된 abort — SW 로직대로 |
| `DEBUG` | fallback (디버그 중) |

**XTEST와 Conditional Commit**

`_xtest()`로 *현재 트랜잭션 안에 있는지* 검사. lock elision 패턴에서 핵심.

```cpp
void unlock() {
    if (_xtest()) {
        // 트랜잭션 안 — commit
        _xend();
    } else {
        // fallback 락 사용 중 — 일반 unlock
        real_unlock();
    }
}
```

**HTM의 한계 — Hardware Capacity**

L1 캐시(보통 32KB, 512 cache line)를 *트랜잭션 read/write set*으로 씀. 다음은 capacity abort를 유발:

- 너무 많은 메모리 접근 (수백 cache line)
- Set associativity 한계 — 같은 set에 너무 많은 cache line이 trans적으로 들어옴
- 컨텍스트 스위치 — OS가 끼어들면 abort
- 시스템 콜, 인터럽트, page fault

그래서 트랜잭션 본문은 *짧고, 가벼운 자료 접근만, syscall 없이*가 원칙. 책의 표현: "HTM은 짧은 critical section의 락을 *공짜로* 만드는 도구이지, STM 같은 일반 추상화가 아니다."

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

## 다시 송금과 무전기로 — 디자인 결정의 비유

이 장에서 본 결정들을 일상 비유로 다시 묶는다. *어디서 누가 충돌을 감지하고, 누가 원복하는가* — 이게 모든 TM 시스템의 본질이다.

**Eager update vs Lazy update**. 은행 송금 비유로 옮긴다. *즉시 반영*은 — A 계좌에서 100원을 *지금* 빼고, B에 *지금* 더한다. 충돌이 나면 *이미 반영된 변경*을 원복해야 한다. undo log가 필요하고, abort 비용이 크다. *결산 후 반영*은 — 송금 의도를 메모장(write set)에 적어 두고, commit 시점에 *한꺼번에* 반영한다. abort는 메모장을 버리면 끝이라 싸지만, commit이 길어 다른 트랜잭션을 막을 수 있다. TL2가 lazy update + striped lock의 대표 설계다.

**Pessimistic locking vs Optimistic concurrency**. 도서관 비유. *비관적 락*은 책을 *읽기 전부터* 다른 사람이 못 보게 잠근다. 충돌은 막지만 *대부분의 시간*을 락 위에서 보낸다. *낙관적*은 일단 그냥 읽고 쓰고, *commit 시점에* "이 책이 그 사이 다른 사람 손을 안 거쳤나"를 검증한다. 검증 실패면 재시도. TM은 거의 다 낙관적이다 — 충돌이 *드물다*는 가정 위에서 성능이 나온다.

**Version clock의 의미**. TL2의 글로벌 버전 클럭은 도서관의 *대여 일자 스탬프*다. 트랜잭션 시작 시 *지금까지의 모든 commit*을 포괄하는 timestamp $V$를 받는다. 읽은 모든 책의 *최근 대여 일자*가 $V$ 이하면 OK — 그 사이 누구도 손대지 않았다. 하나라도 $V$보다 크면 abort. *모든 검증*이 시작 시점의 단일 스냅샷에 대한 비교라 간결하다.

**HTM의 캐시 코히런스 활용**. Intel TSX의 가장 영리한 부분 — *별도의 충돌 감지 하드웨어*를 만들지 않았다. 캐시 코히런스 프로토콜(MESI/MOESI)이 이미 *누가 어느 라인을 만졌는가*를 알고 있다. 트랜잭션 안에서 캐시 라인을 읽으면 *read set*에 추가, 쓰면 *write set*에 추가. 다른 코어가 그 라인의 invalidation을 보내면 *충돌*이라고 판단하고 abort한다. 무전기 비유 그대로 — 옆 트럭이 *내 자재 더미*에 다가오는 무전을 들으면 자기 작업을 abort.

| 결정 | 비유 | 시스템 예 |
|------|-----|----------|
| Eager update | 즉시 송금 | undo-log 기반 STM |
| Lazy update | 결산 후 송금 | TL2, NOrec |
| Pessimistic | 잠가 두기 | 락 기반 (TM 아님) |
| Optimistic | 일단 하고 검증 | 거의 모든 TM |
| Version clock | 대여 일자 스탬프 | TL2 글로벌 클럭 |
| Cache coherence 재사용 | 무전기 채널 | Intel TSX RTM |

### 왜 TM이 주류가 못 되었나

이 장의 알고리즘은 학문적으로는 우아하지만 *실무 도구*가 되지는 못했다. 이유는 비유로도 보인다.

- **충돌이 잦으면 망한다**. 낙관적 동시성은 *충돌이 드물다*는 가정 위에 선다. 한 변수에 N 개 스레드가 몰리면 abort/retry가 폭주해 락보다 *느리다*. 카운터 같은 hot spot은 TM이 가장 약한 자리다.
- **I/O가 어렵다**. 송금 비유로 — *돈을 보낸 뒤* abort가 일어나면 돈을 어떻게 회수할 것인가. 메모리는 원복할 수 있지만 *외부 시스템에 보낸 신호*는 원복할 수 없다. Haskell STM이 *타입 시스템*으로 IO를 막은 건 정확히 이 문제 때문이다.
- **HTM의 정치적 좌초**. Intel TSX는 TAA(Transactional Asynchronous Abort) 부채널 취약점으로 컨슈머 CPU 대부분에서 영구 비활성화됐다(Skylake~Coffee Lake 마이크로코드). Alder Lake 이후 하이브리드 아키텍처에서는 미탑재. Sapphire Rapids 같은 서버 라인에만 잔존 — *학습 가치는 있지만 운영 가정은 금물*.
- **대체재가 충분히 좋다**. RCU(Read-Copy-Update), Hazard Pointers, fine-grained lock, message passing(Erlang/Go/Rust channel), Actor model — 각자 영역에서 TM보다 잘 동작한다. *합성성*만이 TM의 진짜 차별점인데, 그것도 Haskell처럼 *순수성*이 받쳐 줄 때만 빛난다.

### 비유 한 문장으로 시리즈를 맺으며

이 책은 *카운터 한 개를 정확하게 늘리는 법*에서 출발해 *합성 가능한 atomic 블록*까지 왔다. 카페와 군대와 도서관과 송금이 모두 같은 문제 — *누가, 무엇을, 언제, 얼마나 확실하게 본다고 보장할 것인가* — 의 변주였다. 모든 시스템 코드는 이 문제 위에 서 있다.

### 런타임별 TM 매핑

학습용으로 한눈에 보는 TM 시스템 비교다.

| 시스템 | 종류 | 비유 |
|--------|------|------|
| Haskell `STM` (`atomically`, `retry`, `orElse`) | STM | 도서관 + IO 격리 (타입으로 안전) |
| Clojure `ref` + `dosync` + `alter`/`ensure` | STM | 도서관 + 변형 함수 |
| Java Multiverse / ScalaSTM | STM | TL2 기반 striped lock |
| GCC `-fgnu-tm` (C++ TM TS) | STM (실험적) | atomic 블록 문법 |
| Intel TSX (HLE/RTM) | HTM | 무전기 (cache coherence) |
| IBM POWER8+ TM | HTM | 무전기 (POWER 코어) |
| HHVM RDS | runtime-dedicated TM | 페이스북 PHP 인터프리터 |
| pgSQL `SERIALIZABLE` 격리 | DB 트랜잭션 (참고) | 책의 원조 비유 |

Ch3의 *합성 가능성* 논의(7CM, Wait-free freedom from anomalies)와 이 장의 *atomic 블록 합성*은 같은 줄에 서 있다 — *작은 atomic 단위를 모아 더 큰 atomic 단위를 만들 수 있는가*. STM이 그 가능성을 일반 코드 영역으로 확장한 가장 야심찬 시도였다.

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

**이론 → 실무:**

- HTM (Intel TSX)        → glibc pthread, Linux kernel (일부)
- Lock Elision           → glibc rwlock (실험적)
- STM                    → Haskell stm, Clojure refs
- C++ TM TS              → GCC -fgnu-tm (실험적)

**언어별:**

- C++: Intel TSX intrinsics, GCC TM TS (실험적)
- C: Intel TSX intrinsics
- Haskell: TVar, atomically, retry, orElse
- Clojure: ref, dosync, alter, ensure
- Rust: 표준 없음 (lock-free 라이브러리 선호)

**실용적 대안:**

- RCU (Read-Copy-Update) — 읽기 많은 워크로드
- Hazard Pointers — lock-free 메모리 회수
- Actor Model — Erlang/Elixir, Akka(2022년 BSL로 전환, Apache Pekko가 오픈소스 포크)
- Message Passing — Go channels, Rust channels

## 자기 점검

- [ ] TM이 락의 어떤 문제를 해결?
- [ ] STM의 optimistic concurrency 메커니즘?
- [ ] HTM의 cache coherence 기반 충돌 감지?
- [ ] Lock Elision의 작동 원리?
- [ ] TM이 주류가 못 된 이유?
- [ ] RCU와 Hazard Pointers의 용도?

## 관련 항목

- [Ch 17: Barriers](/blog/parallel/parallel-principles/ch17-barriers)
- [Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction) — 시작점
- [Ch 10: Queue와 ABA](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem) — lock-free 어려움
- [C++ Concurrency in Action Ch 7: Lock-Free](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
