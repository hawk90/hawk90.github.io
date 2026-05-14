---
title: "Chapter 13: Concurrent Hashing과 자연스러운 병렬성"
date: 2026-05-12
description: "Closed / Open / Lock-Free 해시 테이블. Resizing의 동시성 문제. Split-Ordered List."
series: "The Art of Multiprocessor Programming"
seriesOrder: 13
tags: [parallel, concurrency, book-review, amp, hashing, lock-free, split-ordered, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 13 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 13.1 왜 해시 테이블이 동시성에 좋은가

해시 테이블은 동시성 자료구조 중 가장 친화적이다. 이유 — **자연스러운 병렬성**.

```
키 X → bucket[h(X)]
키 Y → bucket[h(Y)]
키 Z → bucket[h(Z)]

다른 키들은 다른 bucket → 서로 안 만남
```

대부분의 작업이 서로 다른 bucket을 만진다. 락을 bucket마다 잡으면 거의 경합 없음.

이게 해시 테이블의 동시성 친화성. **Sharded by hash**가 자연스럽다.

## 13.2 단순 동시 해시 테이블

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

**문제** — **resizing**. bucket 수가 바뀌면 어떻게?

## 13.3 Resize의 동시성 문제

해시 테이블은 load factor가 커지면 크기를 늘려야 한다.

```
초기: 16 buckets, 12 entries → load 75%
삽입: → load 75% 초과 → resize to 32 buckets
        모든 entry를 새 bucket으로 재배치
```

이게 단일 스레드에서는 쉽다. 동시에서는 어렵다.

**문제**:
- resize 중에 다른 스레드가 put / get을 하면?
- 일부 entry는 옛 위치, 일부는 새 위치
- get이 어디를 찾아야 하나?

## 13.4 Stop-The-World Resize

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

`bucketLock[i]`의 i가 hash(key) mod (lock count)에 의존. lock count도 변할 수 있다면?

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

## 정리

- 해시 테이블은 **자연스럽게 병렬화** — 다른 키는 다른 bucket
- **Striped locking** — bucket마다 (또는 그룹마다) 락
- **Resize**가 동시 환경의 가장 큰 도전
- **Split-Ordered List** — 비트 뒤집기로 resize를 데이터 이동 없이
- 실용적으로는 **incremental resize** + striped locking
- **Read-Mostly** 워크로드에는 RCU 패턴 적합

## 한국 개발자의 함정

```
1. *std::unordered_map을 동시에 써도 OK*
   - 절대 안 됨 (thread-unsafe)
   - resize 중 undefined behavior
   - tbb::concurrent_hash_map 또는 folly::ConcurrentHashMap 사용

2. *std::shared_mutex로 래핑 = concurrent hash map*
   - 전체에 락 (coarse)
   - striped locking과 성능 차이 매우 큼

3. *Go의 sync.Map = 만능*
   - Read-mostly 최적화된 자료구조
   - Write-heavy에선 일반 map + Mutex가 더 빠름
   - 측정 필요

4. *Lock-free hash table 직접 구현*
   - Split-Ordered List는 매우 복잡
   - 라이브러리(folly, tbb) 사용 권장
```

## 실무 적용

```
이론 → 실무:
- Striped locking      → tbb::concurrent_hash_map
- CAS-based            → folly::ConcurrentHashMap
- Read-mostly          → folly::AtomicHashMap (static size)
- Split-Ordered List   → 학술적

언어별:
- C++: folly::ConcurrentHashMap, tbb::concurrent_hash_map
- C: 직접 구현 + pthread_rwlock (striped)
- Java: ConcurrentHashMap (사실상 표준)
- Rust: dashmap, evmap
- Go: sync.Map (read-mostly), shard 직접 구현
- Python: 없음 (GIL 의존)

기준:
- Read >> Write    → RCU / Copy-on-Write
- Read ~ Write     → ConcurrentHashMap / dashmap
- Write 매우 많음   → 샤딩 + 일반 map
```

## 자기 점검

```
□ 해시 테이블이 동시성에 좋은 이유?
□ Striped locking과 fine-grained locking 차이?
□ Resize의 *동시성* 도전?
□ Split-Ordered List의 *bit reversal* 아이디어?
□ Incremental resize의 작동?
□ RCU 패턴이 적합한 워크로드?
```

## 다음 장 예고

다음 장은 **Skiplist와 균형 검색** — 정렬된 동시성 자료구조.

## 관련 항목

- [Ch 12: Counting](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination)
- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search)
- [C++ Concurrency in Action Ch 6: Lock-based 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
