---
title: "Chapter 13: Concurrent Hashing과 자연스러운 병렬성"
date: 2026-05-06T13:00:00
description: "Closed / Open / Lock-Free 해시 테이블. Resizing의 동시성 문제. Split-Ordered List."
series: "The Art of Multiprocessor Programming"
seriesOrder: 13
tags: [parallel, concurrency, book-review, amp, hashing, lock-free, split-ordered, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 13 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 비유로 먼저 — 호텔 청소·둥지 빼앗기·리모델링·책장

이 챕터의 네 알고리즘을 한 호텔 운영에 비유해두면 본문이 잘 읽힌다.

**Striped lock — 호텔 층별 청소.** 한 층 청소 중에는 그 층 객실에만 락이 걸린다. 다른 층 객실은 동시에 청소 가능. 다른 키가 다른 버킷에 가는 해시 테이블의 본성과 같다.

**Cuckoo hash — 둥지 빼앗기.** 새가 둥지에 와서 다른 새가 있으면 쫓아낸다. 쫓겨난 새는 자기의 두 번째 후보 둥지로 간다. 거기도 차 있으면 다시 누가 쫓겨난다. 검색은 항상 두 둥지만 보면 된다는 점이 매력.

**Refinable lock — 호텔 리모델링.** 손님이 머무는 동안 객실 수와 청소 구역을 같이 늘린다. 청소 직원이 락을 잡는 동안 구역이 갱신되면 곤란하므로, *잡기 전에 한 번 보고 잡고 다시 한 번 확인*하는 이중 점검이 필요.

**Lock-free split-ordering — 책장 분할.** 책을 일렬로 늘어놓은 다음, *번호의 비트를 거꾸로* 읽어 정렬한다. 그러면 책장을 둘로 쪼갤 때 새 칸의 시작점이 기존 줄 어딘가에 정확히 박혀 있다. 책을 옮길 필요가 없다.

호텔이면 충분히 직관적인 그림이다. 본문에서는 같은 그림을 알고리즘 용어로 다시 본다.

## 13.1 왜 해시 테이블이 동시성에 좋은가

해시 테이블은 동시성 자료구조 중 가장 친화적이다. 이유 — **자연스러운 병렬성**.

- 키 X → `bucket[h(X)]`
- 키 Y → `bucket[h(Y)]`
- 키 Z → `bucket[h(Z)]`

다른 키들은 다른 bucket → *서로 안 만남*.

대부분의 작업이 서로 다른 bucket을 만진다. 락을 bucket마다 잡으면 거의 경합 없음.

이게 해시 테이블의 동시성 친화성. **Sharded by hash**가 자연스럽다.

### 자연스러운 병렬성의 정의

Herlihy와 Shavit은 13장 도입에서 **자연스러운 병렬성(natural parallelism)** 을 다음과 같이 정의한다.

> 한 자료구조가 자연스러운 병렬성을 가진다는 것은, *서로 다른 입력에 대한 메서드 호출이 동일한 메모리 위치를 거의 만지지 않는다* 는 뜻이다.

해시 함수 `h: K → [0, N)`가 키를 균등 분포로 흩는다면, `put(x)`와 `put(y)` (단, `x ≠ y`)는 거의 확률 `1 − 1/N` 으로 다른 bucket을 건드린다. 다시 말해 *충돌하지 않는다*. 이 충돌 없음이 **synchronization 없이도 진행 가능**의 토대다.

반대로 **부자연스러운 병렬성(unnatural parallelism)** 의 예 — priority queue. 모든 `extractMin` 호출이 head 한 점을 다툰다 (15장의 주제).

호텔 비유로 옮기면 이렇다. 손님 100명이 동시에 체크인을 하는데 키 카드가 객실 번호에 따라 *서로 다른 카운터*로 분산된다면, 100개 카운터가 동시에 일한다. 이게 자연 병렬. 반대로 모두가 *맨 앞자리 손님*을 처리하려고 한 카운터에 줄을 선다면 (priority queue), 카운터를 100개 두어도 의미가 없다.

해시 테이블의 좋은 점은 첫 번째 그림이라는 것이다. 키만 *어느 정도 잘 흩어지면* 카운터끼리 부딪힐 일이 없다. 그래서 13장의 모든 기법은 "어떻게 카운터끼리 더 안 부딪히게 할까"의 변주다.

자연스러운 병렬성의 강도를 측정하는 척도는 두 가지.

- **읽기 충돌(read conflict)** — 두 호출이 같은 위치를 읽는가
- **쓰기 충돌(write conflict)** — 두 호출이 같은 위치를 쓰는가

쓰기-쓰기 충돌이 가장 비싸다. 해시는 이 충돌을 본질적으로 분산시킨다.

## 13.2 단순 동시 해시 테이블

### 비유 — 호텔 층별 청소 직원

버킷마다 락을 두면 비용이 크다. 그래서 *층마다* 락 하나, 즉 *여러 버킷이 한 락을 공유*하게 한다. 이게 striped lock.

```text
1층 (락 0): 객실 101, 102, 103, ...
2층 (락 1): 객실 201, 202, 203, ...
3층 (락 2): 객실 301, 302, 303, ...
```

청소 직원이 1층을 청소하는 동안 1층 락이 잡힌다. 다른 직원은 2층, 3층을 동시에 청소. 한 층 안에서는 직렬화되지만 *층 사이는 완전 병렬*이다.

층 수(=락 수)와 객실 수(=버킷 수)는 *서로 다른 양*임에 유의. 객실은 천 개여도 청소 직원이 16명이면 락 배열 크기는 16. 한 직원이 64개 방을 책임진다.

### C++20/23 Striped Locking Hash Table

```cpp
#include <atomic>
#include <mutex>
#include <shared_mutex>
#include <vector>
#include <list>
#include <optional>
#include <functional>

template<typename K, typename V, size_t NumLocks = 16>
class StripedHashTable {
private:
    struct Entry {
        K key;
        V value;
    };

    std::vector<std::list<Entry>> buckets;
    mutable std::array<std::shared_mutex, NumLocks> locks;
    size_t numBuckets;

    size_t getBucketIndex(const K& key) const {
        return std::hash<K>{}(key) % numBuckets;
    }

    size_t getLockIndex(size_t bucketIdx) const {
        return bucketIdx % NumLocks;
    }

public:
    explicit StripedHashTable(size_t initialBuckets = 256)
        : buckets(initialBuckets), numBuckets(initialBuckets) {}

    void put(const K& key, const V& value) {
        size_t bucketIdx = getBucketIndex(key);
        size_t lockIdx = getLockIndex(bucketIdx);

        std::unique_lock lock(locks[lockIdx]);

        auto& bucket = buckets[bucketIdx];
        for (auto& entry : bucket) {
            if (entry.key == key) {
                entry.value = value;
                return;
            }
        }
        bucket.push_back({key, value});
    }

    std::optional<V> get(const K& key) const {
        size_t bucketIdx = getBucketIndex(key);
        size_t lockIdx = getLockIndex(bucketIdx);

        std::shared_lock lock(locks[lockIdx]);

        const auto& bucket = buckets[bucketIdx];
        for (const auto& entry : bucket) {
            if (entry.key == key) {
                return entry.value;
            }
        }
        return std::nullopt;
    }

    bool remove(const K& key) {
        size_t bucketIdx = getBucketIndex(key);
        size_t lockIdx = getLockIndex(bucketIdx);

        std::unique_lock lock(locks[lockIdx]);

        auto& bucket = buckets[bucketIdx];
        for (auto it = bucket.begin(); it != bucket.end(); ++it) {
            if (it->key == key) {
                bucket.erase(it);
                return true;
            }
        }
        return false;
    }
};
```

### C11 Striped Locking Hash Table

```c
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <stdbool.h>

#define NUM_LOCKS 16
#define INITIAL_BUCKETS 256

typedef struct Entry {
    int key;
    int value;
    struct Entry* next;
} Entry;

typedef struct {
    Entry** buckets;
    size_t num_buckets;
    pthread_rwlock_t locks[NUM_LOCKS];
} StripedHashTable;

static size_t hash_int(int key) {
    return (size_t)key;
}

void striped_hash_init(StripedHashTable* ht) {
    ht->num_buckets = INITIAL_BUCKETS;
    ht->buckets = calloc(INITIAL_BUCKETS, sizeof(Entry*));

    for (int i = 0; i < NUM_LOCKS; i++) {
        pthread_rwlock_init(&ht->locks[i], NULL);
    }
}

static size_t get_bucket_index(const StripedHashTable* ht, int key) {
    return hash_int(key) % ht->num_buckets;
}

static size_t get_lock_index(size_t bucket_idx) {
    return bucket_idx % NUM_LOCKS;
}

void striped_hash_put(StripedHashTable* ht, int key, int value) {
    size_t bucket_idx = get_bucket_index(ht, key);
    size_t lock_idx = get_lock_index(bucket_idx);

    pthread_rwlock_wrlock(&ht->locks[lock_idx]);

    Entry* curr = ht->buckets[bucket_idx];
    while (curr != NULL) {
        if (curr->key == key) {
            curr->value = value;
            pthread_rwlock_unlock(&ht->locks[lock_idx]);
            return;
        }
        curr = curr->next;
    }

    // 새 엔트리 추가
    Entry* new_entry = malloc(sizeof(Entry));
    new_entry->key = key;
    new_entry->value = value;
    new_entry->next = ht->buckets[bucket_idx];
    ht->buckets[bucket_idx] = new_entry;

    pthread_rwlock_unlock(&ht->locks[lock_idx]);
}

bool striped_hash_get(const StripedHashTable* ht, int key, int* out_value) {
    size_t bucket_idx = get_bucket_index(ht, key);
    size_t lock_idx = get_lock_index(bucket_idx);

    pthread_rwlock_rdlock(&ht->locks[lock_idx]);

    Entry* curr = ht->buckets[bucket_idx];
    while (curr != NULL) {
        if (curr->key == key) {
            *out_value = curr->value;
            pthread_rwlock_unlock(&ht->locks[lock_idx]);
            return true;
        }
        curr = curr->next;
    }

    pthread_rwlock_unlock(&ht->locks[lock_idx]);
    return false;
}

bool striped_hash_remove(StripedHashTable* ht, int key) {
    size_t bucket_idx = get_bucket_index(ht, key);
    size_t lock_idx = get_lock_index(bucket_idx);

    pthread_rwlock_wrlock(&ht->locks[lock_idx]);

    Entry** prev = &ht->buckets[bucket_idx];
    Entry* curr = *prev;

    while (curr != NULL) {
        if (curr->key == key) {
            *prev = curr->next;
            free(curr);
            pthread_rwlock_unlock(&ht->locks[lock_idx]);
            return true;
        }
        prev = &curr->next;
        curr = curr->next;
    }

    pthread_rwlock_unlock(&ht->locks[lock_idx]);
    return false;
}
```

**Striped locking** — 락 수 < bucket 수도 OK. 락 하나가 여러 bucket을 보호.

### StripedHash (Listing 13.7) — 고정 락 배열

책 Listing 13.7의 `StripedHashSet`이 모범. 불변량.

- 락의 개수 `L`은 **생성 후 고정** (resize에도 그대로)
- bucket 배열 크기 `N`은 자유롭게 변한다
- bucket `b`의 락은 `lock[b mod L]`
- resize는 모든 L개 락을 순서대로 획득 후 진행

```cpp
// StripedHash — 책 Listing 13.7의 핵심
template<typename T>
class StripedHash {
    static constexpr size_t L = 16;
    std::array<std::mutex, L> locks;
    std::vector<std::list<T>> table;
    std::atomic<size_t> setSize{0};

    void resize() {
        size_t oldCap = table.size();
        for (auto& l : locks) l.lock();
        if (oldCap == table.size()) {
            auto oldTable = std::move(table);
            table.assign(2 * oldCap, {});
            for (auto& bucket : oldTable)
                for (auto& x : bucket)
                    table[std::hash<T>{}(x) % table.size()].push_back(x);
        }
        for (auto it = locks.rbegin(); it != locks.rend(); ++it) it->unlock();
    }
public:
    bool add(const T& x) {
        locks[std::hash<T>{}(x) % L].lock();
        // ... bucket에 삽입
        locks[std::hash<T>{}(x) % L].unlock();
        if (setSize / table.size() > 4) resize();
        return true;
    }
};
```

`add()`는 락 *하나만*. `resize()`는 *모두*. 두 연산이 자연스럽게 배제된다.

**문제** — **resizing**. bucket 수가 바뀌면 어떻게?

## 13.3 Resize의 동시성 문제

해시 테이블은 load factor가 커지면 크기를 늘려야 한다.

- 초기 — 16 buckets, 12 entries → load 75%
- 삽입 → load 75% 초과 → *resize to 32 buckets*
- 모든 entry를 새 bucket으로 재배치

이게 단일 스레드에서는 쉽다. 동시에서는 어렵다.

**문제**:
- resize 중에 다른 스레드가 put / get을 하면?
- 일부 entry는 옛 위치, 일부는 새 위치
- get이 어디를 찾아야 하나?

## 13.3a Open Addressing와 StripedCuckooHash (Listing 13.18)

### 비유 — 둥지 빼앗기

이름이 *cuckoo*인 이유는 뻐꾸기의 *탁란*에서 왔다. 다른 새의 둥지에 알을 낳고, 부화한 새끼가 원래 주인의 알이나 새끼를 둥지 밖으로 *밀어내는* 행동.

알고리즘을 이 그림으로 보면.

새 X가 자기 첫 번째 둥지로 온다.

- 비어 있으면 그 자리에 앉는다.
- Y가 이미 있으면 Y를 쫓아내고 X가 앉는다. Y는 자기 *두 번째 둥지*로 간다.
- 거기도 차 있으면 Z가 쫓겨난다.
- 체인이 길어지면 새 보금자리 찾기 포기 → 숲 확장(resize).

검색은 항상 *두 둥지*만 확인하면 끝난다. 어느 새든 자기 둥지는 둘 중 하나에 반드시 있다. 이게 cuckoo의 핵심 — *worst-case O(1) lookup*.

지금까지의 closed-address(=separate chaining) 외에 **open addressing**이 있다. 각 bucket은 *최대 1개* 원소만 갖고, 충돌 시 다른 bucket으로 이동한다.

대표적 open addressing — **cuckoo hashing**. Pagh와 Rodler(2001)의 알고리즘. 두 해시 함수 `h0`, `h1`를 쓰며 원소 `x`는 `table[0][h0(x)]` 또는 `table[1][h1(x)]` 중 하나에 산다.

**add(x):**

- h0(x) 위치가 비었다면 → 거기에 놓음
- 그렇지 않으면 → 그 자리의 y를 쫓아내고 (cuckoo!)
- y의 *다른 후보 위치*로 옮김
- 재귀적으로 반복
- cycle이 너무 길면 → resize

책 Listing 13.18의 **StripedCuckooHash** — 두 테이블에 각각 striped locking을 적용.

```cpp
// StripedCuckooHash — 책 Listing 13.18의 핵심
template<typename T>
class StripedCuckooHash {
    static constexpr int LIMIT = 32;
    std::array<std::array<std::mutex, 16>, 2> locks;
    std::array<std::vector<std::optional<T>>, 2> table;

    void acquire(const T& x) {
        locks[0][std::hash<T>{}(x) % 16].lock();
        locks[1][(std::hash<T>{}(x) >> 16) % 16].lock();
    }
public:
    bool add(const T& x) {
        acquire(x);
        std::optional<T> displaced = x;
        int side = 0;
        for (int k = 0; k < LIMIT; ++k) {
            size_t idx = std::hash<T>{}(*displaced) % table[side].size();
            std::swap(displaced, table[side][idx]);
            if (!displaced) return true;  // 빈 자리 찾음
            side = 1 - side;
        }
        // LIMIT 초과 → resize 후 재삽입
        return false;
    }
};
```

**Cuckoo의 매력** — `contains(x)`는 항상 **두 위치만 검사**. O(1) worst case. Closed-address(체이닝)는 worst case O(N).

**약점** — `add`의 displacement chain이 길 수 있다. 평균은 O(1)이지만 cycle 가능. 그래서 LIMIT을 두고 초과 시 resize.



가장 단순 — resize 시 모든 락을 잡는다.

### C++20/23 Stop-The-World Resize

```cpp
template<typename K, typename V, size_t NumLocks>
void StripedHashTable<K, V, NumLocks>::resize(size_t newSize) {
    // 모든 락을 exclusive로 획득
    std::array<std::unique_lock<std::shared_mutex>, NumLocks> allLocks;
    for (size_t i = 0; i < NumLocks; ++i) {
        allLocks[i] = std::unique_lock(locks[i]);
    }

    // 새 버킷 배열 생성
    std::vector<std::list<Entry>> newBuckets(newSize);

    // 모든 엔트리 재배치
    for (const auto& bucket : buckets) {
        for (const auto& entry : bucket) {
            size_t newIdx = std::hash<K>{}(entry.key) % newSize;
            newBuckets[newIdx].push_back(entry);
        }
    }

    buckets = std::move(newBuckets);
    numBuckets = newSize;

    // allLocks 소멸자가 자동으로 모든 락 해제
}
```

**장점**: 단순.
**단점**: resize 동안 시스템 정지. 큰 테이블이면 오래.

## 13.5 Refinable Lock — 락 자체를 동적 분할

### 비유 — 호텔 리모델링

호텔이 잘 되어 객실을 두 배로 늘리기로 했다. 문제는 *손님이 계속 들고 난다*는 것. 영업 중단 없이 객실 수와 청소 구역(=락 배열)을 함께 늘려야 한다.

직원이 4층을 청소하러 락을 잡는 동안 갑자기 *층 번호가 재편되어* 4층이 사라지면 어떻게 되나. 잡은 락은 더 이상 "그 객실들의 락"이 아니게 된다. 청소가 무의미해진다.

해결책 — *잡기 전에 한 번 본 번호*와 *잡은 뒤 다시 본 번호*가 같은지 확인한다. 같으면 안심하고 청소. 다르면 풀고 처음부터.

**직원이 청소하러 옴:**

- 1) 게시판 본다 — "지금 락 배열은 v17"
- 2) 게시판이 "리모델링 중" 깃발이 없는지 확인
- 3) 손님 키 → 락 번호 계산 → 그 락 획득
- 4) 다시 게시판 본다 — "여전히 v17?" → 예 → 청소 시작
- → 아니오 → 풀고 1)부터

이게 **double-checked snapshot**. 본문 Listing 13.11이 그대로 이 패턴.

`bucketLock[i]`의 i가 hash(key) mod (lock count)에 의존. lock count도 변할 수 있다면?

### RefinableHash (Listing 13.11) — 락 배열을 함께 resize

StripedHash는 락 수가 고정. bucket이 늘어도 *한 락이 더 많은 bucket을 보호* 하게 된다. 8개 락 + 1024 bucket이라면 락 하나가 128 bucket의 충돌을 받는다.

**RefinableHash**는 bucket과 함께 락 배열도 키운다. 어떤 스레드가 락을 잡은 동안 락 배열을 바꾸면 정합성이 깨진다. 책 Listing 13.11의 방어 패턴 — **double-checked snapshot**.

```cpp
// RefinableHash — 책 Listing 13.11의 acquire 패턴
void acquire(const T& x) {
    while (true) {
        // 1) resize 중이면 대기
        while (mark.load() != 0) std::this_thread::yield();
        // 2) 현재 락 배열 스냅샷
        auto snap = locks.load();
        size_t idx = std::hash<T>{}(x) % snap->locks.size();
        snap->locks[idx].lock();
        // 3) 락 잡은 사이에 배열이 바뀌지 않았는지
        if (snap == locks.load() && mark.load() == 0) return;
        snap->locks[idx].unlock();  // 재시도
    }
}

void resize(size_t newCap) {
    if (!owner.compare_exchange_strong(zero, me)) return;
    mark.store(1);
    // quiesce: 모든 락을 한 번씩 잡았다 풀어 진행 중 작업 종료 보장
    for (auto& m : locks.load()->locks) { m.lock(); m.unlock(); }
    locks.store(std::make_shared<LockArray>(newCap));
    // bucket 재분배 ...
    mark.store(0);
}
```

핵심.

1. `acquire`는 스냅샷으로 락을 잡고 *그 사이 배열이 바뀌지 않았는지* 재검사.
2. `resize`는 `mark=1`로 새 acquire를 막고, 기존 락들을 일일이 잡았다 풀어 진행 중 작업이 끝났음을 보장한 뒤 새 배열을 publish.



### C++20/23 Refinable Lock 패턴

```cpp
#include <atomic>
#include <mutex>
#include <memory>
#include <vector>

template<typename K, typename V>
class RefinableHashTable {
private:
    struct LockArray {
        std::vector<std::mutex> locks;
        explicit LockArray(size_t n) : locks(n) {}
    };

    std::atomic<LockArray*> lockArray;
    std::atomic<bool> resizing{false};
    std::vector<std::list<Entry>> buckets;
    std::atomic<size_t> numBuckets;

    void acquireLock(const K& key) {
        while (true) {
            // resize 중이면 대기
            while (resizing.load(std::memory_order_acquire)) {
                std::this_thread::yield();
            }

            LockArray* locks = lockArray.load(std::memory_order_acquire);
            size_t lockIdx = std::hash<K>{}(key) % locks->locks.size();
            locks->locks[lockIdx].lock();

            // 락 획득 후 resize가 시작되지 않았는지 확인
            if (!resizing.load(std::memory_order_acquire) &&
                locks == lockArray.load(std::memory_order_acquire)) {
                return;  // 성공
            }

            // resize 시작됨 — 다시 시도
            locks->locks[lockIdx].unlock();
        }
    }

    void releaseLock(const K& key) {
        LockArray* locks = lockArray.load(std::memory_order_acquire);
        size_t lockIdx = std::hash<K>{}(key) % locks->locks.size();
        locks->locks[lockIdx].unlock();
    }

public:
    // put, get, remove는 acquireLock/releaseLock 사용
    // ...
};
```

복잡하다. 그러나 resize를 **non-blocking**하게 만든다.

## 13.6 Lock-Free Hash Table — Split-Ordered List

### 비유 — 책장을 둘로 쪼갤 때 번호를 거꾸로 읽기

도서관 책장이 *번호 순*으로 책을 보관한다. 0, 1, 2, 3, 4, ... 책장이 가득 차서 한 칸을 두 칸으로 쪼개려 한다.

순진한 방법 — 짝수는 왼쪽 칸, 홀수는 오른쪽 칸. 모든 책을 옮겨야 한다. 큰 비용.

영리한 방법 — 책 번호를 *이진수로 쓰고 비트를 거꾸로 읽어서* 정렬한다.

| 번호 | 이진 | 비트 reverse | 위치 |
|------|------|--------------|------|
| 0 | 000 | 000 | 0번째 |
| 1 | 001 | 100 | 4번째 |
| 2 | 010 | 010 | 2번째 |
| 3 | 011 | 110 | 6번째 |
| 4 | 100 | 001 | 1번째 |

이렇게 줄을 세우면 `[0(00) 4(10) 2(01) 6(11) 1(00) 5(10) 3(01) 7(11)]` 순서가 된다.

**칸 두 개일 때:**

- 칸0 → 0번째 책 (그 뒤로 4, 2, 6, 1, 5, 3, 7이 줄줄이)
- 칸1 → 1번째 책(인덱스 4 위치) — *어디부터가 칸1인지* 책장 사이에 표시만 끼움

**칸 네 개로 쪼개면:**

- 칸0 → 0번째 (여전히)
- 칸1 → 4번째 위치 (여전히)
- 칸2 → 2번째 위치 — *기존 줄에 이미 있음, 표시만 새로 끼움*
- 칸3 → 6번째 위치 — *역시 있음, 표시만 새로 끼움*

*책을 한 권도 옮기지 않는다*. 칸 경계 표시(=sentinel)만 새로 끼운다. 이게 split-ordered list의 핵심. 칸을 늘리는 비용 = 단일 lock-free linked list 삽입 한 번.

비트를 거꾸로 읽으면 같은 칸에 들어갈 책들이 자연스럽게 *연속*된다는 게 핵심 통찰이다. 이 정렬은 trie의 root-to-leaf 순회와 같다.

Shalev와 Shavit의 우아한 알고리즘.

**핵심 아이디어**:

1. 모든 entry를 **단일 정렬된 lock-free linked list**에 저장
2. 해시값의 비트 순서를 뒤집어서 정렬 키로 사용
3. Bucket을 **리스트의 위치**로 매핑
4. Resize = 새 bucket 포인터 추가 (재배치 안 함!)

```
키들이 단일 리스트에:
[0 → 4 → 2 → 6 → 1 → 5 → 3 → 7]
 (비트 뒤집은 순서)

Bucket 포인터들:
bucket[0] → 0
bucket[1] → 4

Resize (bucket 수 2 → 4):
bucket[0] → 0
bucket[1] → 4
bucket[2] → 2  ← 새로 추가
bucket[3] → 6  ← 새로 추가
```

**Resize 시 데이터 이동 없음**. 단지 더 많은 bucket 포인터가 리스트의 다른 위치를 가리킬 뿐.

### C++20/23 Bit-Reversal Key

```cpp
#include <cstdint>
#include <bit>

// 비트 뒤집기 (32-bit)
constexpr uint32_t reverseBits(uint32_t n) {
    n = ((n >> 1) & 0x55555555) | ((n & 0x55555555) << 1);
    n = ((n >> 2) & 0x33333333) | ((n & 0x33333333) << 2);
    n = ((n >> 4) & 0x0F0F0F0F) | ((n & 0x0F0F0F0F) << 4);
    n = ((n >> 8) & 0x00FF00FF) | ((n & 0x00FF00FF) << 8);
    n = (n >> 16) | (n << 16);
    return n;
}

// Split-ordered key 생성
constexpr uint32_t makeSplitOrderedKey(uint32_t key, uint32_t bucketSize) {
    // 해시값의 비트를 뒤집어서 정렬 키로
    return reverseBits(key & (bucketSize - 1));
}
```

### C11 Bit-Reversal

```c
#include <stdint.h>

// 비트 뒤집기 (32-bit)
static inline uint32_t reverse_bits(uint32_t n) {
    n = ((n >> 1) & 0x55555555) | ((n & 0x55555555) << 1);
    n = ((n >> 2) & 0x33333333) | ((n & 0x33333333) << 2);
    n = ((n >> 4) & 0x0F0F0F0F) | ((n & 0x0F0F0F0F) << 4);
    n = ((n >> 8) & 0x00FF00FF) | ((n & 0x00FF00FF) << 8);
    n = (n >> 16) | (n << 16);
    return n;
}

// Split-ordered key 생성
static inline uint32_t make_split_ordered_key(uint32_t key, uint32_t bucket_size) {
    return reverse_bits(key & (bucket_size - 1));
}
```

비트 뒤집기를 하면 — 같은 bucket의 키들이 리스트에서 연속하게 된다. 그리고 bucket이 늘어났을 때 새 bucket이 가리킬 위치가 정확히 리스트 안에 있다.

### LockFreeHashSet (Listing 13.24) — Recursive Split-Ordering

Shalev-Shavit의 핵심 통찰 — *비트를 뒤집은 키로 정렬* 하면 bucket이 2배가 될 때 새 bucket의 시작점이 *기존 리스트의 어느 한 위치를 정확히 가리킨다*.

**초기 (size = 2):**

- 키 0, 1, 2, 3을 비트-뒤집은 순서로
- binary: 00, 01, 10, 11
- reversed: 00, 10, 01, 11 → 0, 4, 2, 6 (8-bit 가정)

bucket[0]은 reversed=0 (sentinel) 위치를 가리킴
bucket[1]은 reversed=4 위치를 가리킴 (key=1)

**resize → size = 4:**

- bucket[2]는 reversed=2 위치 (key=2)
- bucket[3]는 reversed=6 위치 (key=3)

*기존 리스트에 그 위치가 이미 있다!*
단지 새 sentinel을 끼워넣기만 하면 됨.

이게 **recursive split-ordering**. bucket[i]는 i의 비트 뒤집기 위치에 sentinel이 있다. resize는 그 sentinel을 lock-free linked list에 삽입할 뿐.

```cpp
// LockFreeHashSet — 책 Listing 13.24의 핵심
class LockFreeHashSet {
    // bucket의 lazy 초기화 — 처음 접근 시 sentinel 삽입
    void initializeBucket(size_t bucket) {
        // 가장 높은 비트를 끈 위치가 부모 bucket
        size_t parent = bucket & (bucket - 1) ? bucket - (bucket & -bucket) : 0;
        if (buckets[parent].load() == nullptr) initializeBucket(parent);
        // 새 sentinel을 부모 리스트에 lock-free 삽입
        Node* sentinel = new Node{reverseBits(bucket), -1, 0};
        // ... CAS로 끼워넣기
        buckets[bucket].store(sentinel);
    }

    bool add(int x) {
        size_t bucket = std::hash<int>{}(x) % bucketCount.load();
        Node* start = getBucketList(bucket);
        size_t key = reverseBits(std::hash<int>{}(x)) | 0x1;  // regular key
        // start부터 정렬된 위치 찾아 lock-free 삽입 ...
        if (setSize.fetch_add(1) / bucketCount > 4)
            bucketCount.compare_exchange_strong(/* ... 2배 */);
        return true;
    }
};
```

**우아한 점**.

- bucket 배열은 *리스트의 lazy index*. 데이터 이동 없음.
- 모든 변경은 lock-free linked list 연산.
- bucket을 늘리는 것 = lock-free 삽입 한 번.

이게 lock-free hash table의 정점. 다만 sentinel 키 LSB로 regular key와 구분하는 등 디테일이 많다.

## 13.7 Split-Ordered List의 우아함

이 알고리즘이 우아한 이유.

- **Resize가 free** — 새 bucket 포인터 추가만, 데이터 이동 없음
- **Lock-free** — 락 전혀 없음
- **단순한 구조** — 리스트 + 포인터 배열

다만 구현은 복잡하다. bit-reversal, sentinel nodes, atomic 갱신 등 디테일이 많다.

## 13.8 실용적 해시 테이블 라이브러리

| 라이브러리 | 언어 | 특징 |
|---|---|---|
| `java.util.concurrent.ConcurrentHashMap` | Java | striped locking + lazy resize |
| `tbb::concurrent_hash_map` | C++ | oneTBB (구 Intel TBB) |
| `folly::ConcurrentHashMap` | C++ | 매우 빠름 |
| `dashmap` (Rust) | Rust | striped locking |
| `sync.Map` | Go | 매우 단순한 read-mostly |

대부분의 라이브러리는 split-ordered list가 아니라 **striped locking + careful resize**.

## 13.9 Resize 시 일관성 보장

striped locking 기반에서 resize를 어떻게 안전하게?

**Java's ConcurrentHashMap 방식**:

1. 새 큰 배열을 만든다
2. 일부 bucket을 새 배열로 옮기는 동안 그 bucket을 "forwarding" 마크
3. forwarding 마크된 bucket을 읽으면 새 배열로 follow
4. 모두 옮기면 옛 배열 폐기

### C++20/23 Incremental Resize (간략화)

```cpp
#include <atomic>
#include <memory>
#include <vector>

template<typename K, typename V>
class IncrementalResizeHashTable {
private:
    struct Bucket {
        std::atomic<bool> forwarded{false};
        std::list<Entry> entries;
        std::mutex lock;
    };

    std::atomic<std::vector<Bucket>*> currentTable;
    std::atomic<std::vector<Bucket>*> newTable{nullptr};
    std::atomic<size_t> migrationIndex{0};

    void helpMigrate() {
        auto* oldT = currentTable.load(std::memory_order_acquire);
        auto* newT = newTable.load(std::memory_order_acquire);

        if (newT == nullptr) return;

        // 하나의 bucket 이전 시도
        size_t idx = migrationIndex.fetch_add(1, std::memory_order_relaxed);
        if (idx < oldT->size()) {
            migrateBucket(idx, oldT, newT);
        }
    }

    void migrateBucket(size_t idx,
                       std::vector<Bucket>* oldT,
                       std::vector<Bucket>* newT) {
        Bucket& oldBucket = (*oldT)[idx];

        std::unique_lock lock(oldBucket.lock);
        if (oldBucket.forwarded.load(std::memory_order_acquire)) {
            return;  // 이미 이전됨
        }

        // 엔트리들을 새 테이블로 이동
        for (const auto& entry : oldBucket.entries) {
            size_t newIdx = std::hash<K>{}(entry.key) % newT->size();
            std::unique_lock newLock((*newT)[newIdx].lock);
            (*newT)[newIdx].entries.push_back(entry);
        }

        oldBucket.forwarded.store(true, std::memory_order_release);
    }

public:
    std::optional<V> get(const K& key) {
        helpMigrate();  // 작업 전에 이전 돕기

        auto* table = currentTable.load(std::memory_order_acquire);
        size_t idx = std::hash<K>{}(key) % table->size();

        Bucket& bucket = (*table)[idx];

        // forwarding 체크
        if (bucket.forwarded.load(std::memory_order_acquire)) {
            auto* newT = newTable.load(std::memory_order_acquire);
            idx = std::hash<K>{}(key) % newT->size();
            // 새 테이블에서 검색
            // ...
        }

        // 현재 테이블에서 검색
        // ...
    }
};
```

이게 incremental resize. resize 비용을 한 번에 부담 안 하고 작업들에 분산.

## 13.10 Read-Mostly 워크로드

해시 테이블 사용의 90%는 read-mostly다. cache처럼.

### C++20/23 Read-Mostly Map (RCU 패턴)

```cpp
#include <atomic>
#include <memory>
#include <shared_mutex>
#include <unordered_map>

template<typename K, typename V>
class ReadMostlyMap {
private:
    using MapType = std::unordered_map<K, V>;
    std::atomic<std::shared_ptr<const MapType>> mapPtr;
    mutable std::mutex writeMutex;

public:
    ReadMostlyMap() : mapPtr(std::make_shared<const MapType>()) {}

    // 읽기: lock-free, 매우 빠름
    std::optional<V> get(const K& key) const {
        auto map = mapPtr.load(std::memory_order_acquire);
        auto it = map->find(key);
        if (it != map->end()) {
            return it->second;
        }
        return std::nullopt;
    }

    // 쓰기: 새 맵 생성 (비용 큼)
    void put(const K& key, const V& value) {
        std::lock_guard lock(writeMutex);

        auto oldMap = mapPtr.load(std::memory_order_acquire);
        auto newMap = std::make_shared<MapType>(*oldMap);
        (*newMap)[key] = value;

        mapPtr.store(newMap, std::memory_order_release);
        // 옛 맵은 참조 카운트 0이 되면 자동 해제
    }

    void remove(const K& key) {
        std::lock_guard lock(writeMutex);

        auto oldMap = mapPtr.load(std::memory_order_acquire);
        auto newMap = std::make_shared<MapType>(*oldMap);
        newMap->erase(key);

        mapPtr.store(newMap, std::memory_order_release);
    }
};
```

### C11 Read-Mostly Map (간략화)

```c
#include <stdatomic.h>
#include <stdlib.h>
#include <pthread.h>

// 간단한 immutable map 구조
typedef struct ImmutableMap {
    int* keys;
    int* values;
    size_t size;
    size_t capacity;
    _Atomic size_t refcount;
} ImmutableMap;

typedef struct {
    _Atomic(ImmutableMap*) map;
    pthread_mutex_t write_mutex;
} ReadMostlyMap;

// 참조 카운트 증가
static void map_acquire(ImmutableMap* m) {
    if (m) atomic_fetch_add(&m->refcount, 1);
}

// 참조 카운트 감소 및 해제
static void map_release(ImmutableMap* m) {
    if (m && atomic_fetch_sub(&m->refcount, 1) == 1) {
        free(m->keys);
        free(m->values);
        free(m);
    }
}

// 읽기: lock-free
bool read_mostly_get(ReadMostlyMap* rm, int key, int* out_value) {
    ImmutableMap* m = atomic_load_explicit(&rm->map, memory_order_acquire);
    map_acquire(m);

    for (size_t i = 0; i < m->size; i++) {
        if (m->keys[i] == key) {
            *out_value = m->values[i];
            map_release(m);
            return true;
        }
    }

    map_release(m);
    return false;
}

// 쓰기: 새 맵 생성
void read_mostly_put(ReadMostlyMap* rm, int key, int value) {
    pthread_mutex_lock(&rm->write_mutex);

    ImmutableMap* old = atomic_load(&rm->map);

    // 새 맵 생성 및 복사
    ImmutableMap* new_map = malloc(sizeof(ImmutableMap));
    new_map->capacity = old->capacity;
    new_map->keys = malloc(sizeof(int) * new_map->capacity);
    new_map->values = malloc(sizeof(int) * new_map->capacity);
    memcpy(new_map->keys, old->keys, sizeof(int) * old->size);
    memcpy(new_map->values, old->values, sizeof(int) * old->size);
    new_map->size = old->size;
    atomic_store(&new_map->refcount, 1);

    // 키 찾아서 갱신 또는 추가
    // ...

    atomic_store_explicit(&rm->map, new_map, memory_order_release);
    map_release(old);

    pthread_mutex_unlock(&rm->write_mutex);
}
```

읽기는 immutable map에 대한 lock-free read. 쓰기는 새 map을 만들고 원자적 교체.

쓰기 비용이 크지만(전체 map 복사), 읽기가 압도적으로 많으면 효율적. 이게 RCU(Read-Copy-Update) 패턴과 같음.

## 시스템 사례 — 어디서 이 기법들이 살아 있나

### Java `ConcurrentHashMap`

Java 8 이후의 `ConcurrentHashMap`은 striped lock의 정점이다. 초기 버전(JDK 5~7)은 명시적 *세그먼트*에 락을 분리한 segmented hash table. JDK 8부터는 *버킷 단위 락*(`synchronized` 블록 + CAS)으로 더 잘게 쪼갰다. resize는 *incremental* — 한 번에 다 옮기지 않고 put/get이 지나가며 helper로 동참한다.

이 라이브러리가 striped lock의 **practical state of the art**. 책의 13.2와 13.5를 가장 정직하게 구현한 사례다.

### Cassandra memtable

Apache Cassandra의 *memtable*은 쓰기가 들어오면 메모리에 누적되었다가 일정 크기에 도달하면 SSTable로 flush된다. 이 memtable이 사실상 *concurrent skiplist*인데, 같은 key의 동시 update를 striped lock으로 처리한다 (14장과 겹치는 부분).

특이한 점은 *resize 없음*. memtable은 가득 차면 *통째로 교체*된다. 이게 책의 incremental resize를 회피하는 시스템 차원의 답.

### Linux dcache (`dentry` cache)

리눅스 커널의 dcache는 파일 경로 lookup 캐시. 매 시스템 콜이 `path_walk`로 dcache를 친다 — 워크로드가 **읽기 압도적**이다.

구현은 *RCU*. 읽기는 락 없이 lock-free read, 쓰기는 grace period 후 옛 노드 회수. 13.10절의 read-mostly 패턴이 커널 한가운데 박혀 있다. lockless lookup은 `__d_lookup_rcu`, 쓰기는 `d_alloc` + `hlist_bl_lock`.

세 사례의 공통점은 *워크로드 패턴에 따라 다른 기법을 골랐다*는 것. 같은 해시 테이블이라도 쓰기 비중·resize 빈도·읽기 빈도에 따라 최적 답이 다르다.

## 정리

- 해시 테이블은 **자연스럽게 병렬화** — 다른 키는 다른 bucket
- **Striped locking** — bucket마다 (또는 그룹마다) 락
- **Resize**가 동시 환경의 가장 큰 도전
- **Split-Ordered List** — 비트 뒤집기로 resize를 데이터 이동 없이
- 실용적으로는 **incremental resize** + striped locking
- **Read-Mostly** 워크로드에는 RCU 패턴 적합

## 한국 개발자의 함정

**1. *std::unordered_map을 동시에 써도 OK***

- 절대 안 됨 (thread-unsafe)
- resize 중 undefined behavior
- tbb::concurrent_hash_map 또는 folly::ConcurrentHashMap 사용

**2. *std::shared_mutex로 래핑 = concurrent hash map***

- 전체에 락 (coarse)
- striped locking과 성능 차이 매우 큼

**3. *Go의 sync.Map = 만능***

- Read-mostly 최적화된 자료구조
- Write-heavy에선 일반 map + Mutex가 더 빠름
- 측정 필요

**4. *Lock-free hash table 직접 구현***

- Split-Ordered List는 매우 복잡
- 라이브러리(folly, tbb) 사용 권장

## 실무 적용

**이론 → 실무:**

- Striped locking      → tbb::concurrent_hash_map
- CAS-based            → folly::ConcurrentHashMap
- Read-mostly          → folly::AtomicHashMap (static size)
- Split-Ordered List   → 학술적

**언어별:**

- C++: folly::ConcurrentHashMap, tbb::concurrent_hash_map
- C: 직접 구현 + pthread_rwlock (striped)
- Java: ConcurrentHashMap (사실상 표준)
- Rust: dashmap, evmap
- Go: sync.Map (read-mostly), shard 직접 구현
- Python: 없음 (GIL 의존)

**기준:**

- Read >> Write    → RCU / Copy-on-Write
- Read ~ Write     → ConcurrentHashMap / dashmap
- Write 매우 많음   → 샤딩 + 일반 map

## 자기 점검

- [ ] 해시 테이블이 동시성에 좋은 이유?
- [ ] Striped locking과 fine-grained locking 차이?
- [ ] Resize의 *동시성* 도전?
- [ ] Split-Ordered List의 *bit reversal* 아이디어?
- [ ] Incremental resize의 작동?
- [ ] RCU 패턴이 적합한 워크로드?

## 다음 장 예고

다음 장은 **Skiplist와 균형 검색** — 정렬된 동시성 자료구조.

## 관련 항목

- [Ch 12: Counting](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination)
- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search)
- [C++ Concurrency in Action Ch 6: Lock-based 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
