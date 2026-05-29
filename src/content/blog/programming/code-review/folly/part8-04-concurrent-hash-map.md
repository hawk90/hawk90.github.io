---
title: "Part 8-04: ConcurrentHashMap (sharded)"
date: 2026-05-24T15:00:00
description: "ConcurrentHashMap — sharded buckets + Hazard Pointer로 erase 포함 full thread-safe hash map."
series: "Folly Code Review"
seriesOrder: 38
tags: [cpp, folly, container, concurrent, sharded]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::ConcurrentHashMap`은 N개 shard로 lock 분산, Hazard Pointer로 reader-safe erase를 구현한 thread-safe hash map. AtomicHashMap의 append-only 제약을 풀어 erase/resize 둘 다 지원.

## 동기

`AtomicHashMap`은 erase 불가, capacity 고정의 한계가 있다. 일반적인 connection pool, session table, cache는 erase가 필수다.

대안:

- `std::unordered_map` + `std::mutex`: 전체 mutex 한 개, contention 심함.
- shard별 mutex (예: 64 shard): contention 분산.
- lock-free read + RCU/Hazard Pointer: erase 시 reader 안전.

`folly::ConcurrentHashMap`은 마지막 답. shard 단위 SharedMutex + Hazard Pointer로 erase 시점에 reader가 보고 있는 메모리 해제를 지연.

```cpp
folly::ConcurrentHashMap<int, Conn> conns;
conns.insert(1, Conn{...});
conns.assign(1, Conn{...});
conns.erase(1);                    // reader 안전
auto it = conns.find(2);           // reader는 mutex 거의 안 잡음
```

## API & 사용법

```cpp
#include <folly/concurrency/ConcurrentHashMap.h>

folly::ConcurrentHashMap<int, std::string> m;

// 1. insert / assign
m.insert(1, "a");
m.insert_or_assign(1, "A");

// 2. find — iterator/value 반환
auto it = m.find(1);
if (it != m.end()) {
  // it->second 안전하게 접근
}

// 3. erase
m.erase(1);

// 4. operator[] 없음 (없는 key에 lazy insert는 위험)

// 5. size / empty
m.size();      // approximate, atomic counter
m.empty();
```

`find`는 *iterator를 반환*. iterator가 살아 있는 동안 그 value는 안전(Hazard Pointer가 보호).

## 내부 구현

### Sharding

![ConcurrentHashMap shards](/images/blog/folly/diagrams/part8-04-concurrent-hash-map-shards.svg)

```cpp
// 약식
template <typename K, typename V>
class ConcurrentHashMap {
  static constexpr size_t kNumShards = 64;
  struct alignas(64) Shard {       // cache-line align
    SharedMutex          mutex;
    // 또는 lock-free linked bucket
    HashTable<K, V>      table;
  };
  std::array<Shard, kNumShards> shards_;
};
```

key의 hash 상위 bit으로 shard 선택. shard 내부는 own SharedMutex.

64 shard라면 평균 contention 1/64. 64 threads 동시 random key insert도 거의 충돌 없음.

### Hazard Pointer

erase 시점에 reader가 해당 entry를 보고 있을 수 있다. 즉시 delete 하면 reader가 dangling. 해결책은 *지연 해제*.

```text
1. reader: 노드 pointer 읽기 전 hazard pointer에 등록
   - hazard_set(thread_local_slot, node_ptr);
2. reader: node 사용
3. reader: 사용 끝, hazard pointer 비움
   - hazard_set(thread_local_slot, nullptr);

4. writer: erase 시 노드를 retired list에 추가, 즉시 delete 안 함
5. writer (또는 별도 reclaim thread): 주기적으로
   - 모든 thread의 hazard pointer를 stable copy로 가져옴
   - retired 중 어느 hazard pointer에도 없는 것만 delete
```

folly는 `folly::hazptr_*` 모듈로 이 기능을 제공. ConcurrentHashMap이 내부적으로 사용.

### Insert/Find lock-acquire pattern

```cpp
// 약식
std::pair<Iterator, bool> insert(K key, V value) {
  size_t shard_idx = hash(key) & (kNumShards - 1);
  Shard& s = shards_[shard_idx];

  std::unique_lock<SharedMutex> lock(s.mutex);   // writer lock
  return s.table.insert(std::move(key), std::move(value));
}

Iterator find(const K& key) const {
  size_t shard_idx = hash(key) & (kNumShards - 1);
  const Shard& s = shards_[shard_idx];

  std::shared_lock<SharedMutex> lock(s.mutex);   // reader lock
  auto node = s.table.find(key);
  if (!node) return end();
  // hazard pointer로 보호
  hazptr_holder h;
  h.reset(node);
  return Iterator{node, std::move(h)};
}
```

shared_lock은 writer가 없으면 instant. shard마다 분리되어 있어 다른 shard writer가 reader를 막지 않음.

### Resize

shard별로 독립 resize. 한 shard가 grow 중에도 다른 shard는 정상 동작.

## std/abseil 비교

```cpp
// std
std::unordered_map<K, V> m;
std::shared_mutex mu;
// 호출자가 lock 명시

// abseil
absl::flat_hash_map<K, V> m;
absl::Mutex mu;
// 마찬가지로 외부 lock

// folly
folly::ConcurrentHashMap<K, V> m;
// 내부에 lock 통합 — 외부 lock 불필요
```

abseil은 thread-safe hash map을 공개하지 않는다. 사용자가 mutex로 wrap 해야 함. folly가 ConcurrentHashMap을 제공해 통합된 API.

| 항목 | wrap된 std/absl | folly::ConcurrentHashMap |
|------|------------------|---------------------------|
| Contention | 단일 mutex 시 심함 | 64 shard 분산 |
| Erase 안전 | 호출자 책임 | Hazard Pointer 보호 |
| Reader cost | mutex acquire 매번 | shared_lock (가벼움) |
| API | 호출 시마다 lock 필요 | 자동 |

## 코드 리뷰 포인트

```cpp
// Bad — operator[] 없는데 사용 시도
folly::ConcurrentHashMap<int, std::string> m;
m[1] = "a";   // 컴파일 에러

// Good — explicit
m.insert(1, "a");
m.insert_or_assign(1, "A");
```

`operator[]`가 의도적으로 빠진 이유: lazy insert는 reader/writer race를 만들기 쉽다. 명시적 API만.

```cpp
// Bad — iterator 보관 후 mutate
auto it = m.find(1);
m.insert(2, "...");
it->second = "...";   // iterator 안전하지만 race 가능
```

iterator는 Hazard Pointer로 dereference 안전. 하지만 *value mutation*은 별개. value type이 atomic 아니면 별도 lock.

```cpp
// Good — assign으로 atomic 갱신
m.assign(1, "new value");   // shard mutex 안에서 한 번에
```

## 안티패턴

- **shard 수를 너무 작게 추정**: default 64. 더 작으면 contention. 더 키울 일은 거의 없다.
- **iterator 장기 보관**: Hazard Pointer slot이 점유돼 reclamation이 지연. iterator는 즉시 사용.
- **size()를 정확한 값으로 가정**: shard counter 합이라 어느 순간 update 중간 값. snapshot 의도면 별도 mutex.

## 정리

- `ConcurrentHashMap`은 64 shard + Hazard Pointer 기반 thread-safe hash map.
- erase, resize 모두 지원 (AtomicHashMap과 대비).
- reader는 shared_lock + hazptr로 대부분 wait-free에 근접.
- abseil/std는 thread-safe hash map 없음 — folly의 차별점.
- `operator[]` 없음, `insert`/`assign` 명시.

## 다음 편

마지막 컨테이너 `EvictingCacheMap`은 LRU eviction을 자동으로 한다. cache의 표준 형태.

## 관련 항목

- [Part 8-03: AtomicHashMap](/blog/programming/code-review/folly/part8-03-atomic-hash-map) — append-only variant
- [Part 8-05: EvictingCacheMap](/blog/programming/code-review/folly/part8-05-evicting-cache-map) — LRU 변형
- [Part 9-02: SharedMutex](/blog/programming/code-review/folly/part9-02-shared-mutex) — shard lock의 기반
- [원문 — folly/concurrency/ConcurrentHashMap.h](https://github.com/facebook/folly/blob/main/folly/concurrency/ConcurrentHashMap.h)
