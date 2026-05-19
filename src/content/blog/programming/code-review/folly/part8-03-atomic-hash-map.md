---
title: "Part 8-03: AtomicHashMap (lock-free read)"
date: 2026-05-24T14:00:00
description: "AtomicHashMap — lock-free read, append-only insert, 큰 read-heavy 워크로드용 hash map."
series: "Folly Code Review"
seriesOrder: 37
tags: [cpp, folly, container, atomic-hashmap, lock-free]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::AtomicHashMap`은 *append-only + lock-free read*의 hash map이다. erase 불가, value 수정도 제한적. 대신 read는 mutex 없이 atomic load만으로 끝나 contention이 0.

## 동기

설정 cache, dictionary lookup, monitoring counter 같이 *기록은 가끔, 읽기는 매우 자주*인 데이터는 일반 mutex 기반 map이 과한 비용. 16 reader 가 동시에 read 한다면 mutex가 줄을 세우게 된다.

```text
typical use case
  - feature flags     : startup 시 fill, 그 후 read-only
  - id → name table   : 새 id 가끔 추가
  - per-thread counter : append, increment, 읽기 위주
```

AtomicHashMap의 제약:

- *erase 불가*.
- key의 in-place 갱신은 atomic value type만.
- 최대 capacity를 *처음에 지정*.

대신 얻는 것:

- read는 wait-free.
- writer 한 명이 들어와도 reader 영향 0.

```cpp
folly::AtomicHashMap<int64_t, std::string> ahm(100'000);  // capacity
ahm.insert(1, "alice");
// reader thread들
auto it = ahm.find(1);
if (it != ahm.end()) Use(it->second);
```

## API & 사용법

```cpp
#include <folly/AtomicHashMap.h>

// 1. 생성 — 최대 capacity 미리 지정
folly::AtomicHashMap<int64_t, std::string> m(1'000'000);

// 2. insert — concurrent, lock-free
auto [it, ok] = m.insert(42, "answer");

// 3. find — wait-free
auto it = m.find(42);
if (it != m.end()) {
  std::cout << it->second;
}

// 4. operator[] — insert default if absent
m[7];   // ""가 들어감

// 5. erase 없음
// m.erase(42);   // 컴파일 에러

// 6. 통계
m.size();
m.maxSize();          // 처음 지정한 capacity
```

`AtomicHashMap`은 sub-map들의 chain 구조. capacity를 초과하면 새 sub-map을 추가. 단, 더 이상 ScalableAlloc 없이 fixed.

## 내부 구현

### AtomicHashArray가 기본 단위

```text
AtomicHashMap
  └ AtomicHashArray (sub-map 1)
  └ AtomicHashArray (sub-map 2, 첫 게 가득 차면 추가)
  └ ...
```

각 `AtomicHashArray`는 고정 크기 array. open addressing linear probing.

```cpp
// 약식 — folly/AtomicHashArray.h
template <class Key, class Value>
class AtomicHashArray {
  struct Cell {
    std::atomic<Key>   key;
    Value              value;     // value는 atomic 아닐 수도
  };
  std::vector<Cell> cells_;       // fixed capacity
  std::atomic<size_t> numEntries_;
};
```

key는 `std::atomic`. Empty sentinel(보통 `0` 또는 `~0`)을 사용. CAS로 key를 lock 후 value 채움.

### Insert — CAS based

```cpp
// 약식
std::pair<Iterator, bool> insert(Key k, Value v) {
  size_t h = hash(k);
  size_t start = h % capacity_;
  for (size_t i = 0; i < capacity_; ++i) {
    size_t idx = (start + i) % capacity_;
    Cell& c = cells_[idx];

    Key expected = kEmpty;
    if (c.key.compare_exchange_strong(expected, k,
                                       std::memory_order_release)) {
      // empty 였음 → claim 성공
      c.value = std::move(v);
      numEntries_.fetch_add(1);
      return {Iterator{this, idx}, true};
    }
    if (expected == k) {
      // 이미 있음
      return {Iterator{this, idx}, false};
    }
    // 다른 key → 다음 probe
  }
  // 가득 — sub-map 추가 로직 (AtomicHashMap level)
}
```

CAS 한 번으로 claim. 성공하면 value를 채운다. value 쓰기는 *atomic 아님* — reader가 partial value를 볼 가능성. 그래서 value는 *POD 또는 immutable*이 권장.

### Find — wait-free

```cpp
// 약식
Iterator find(const Key& k) const {
  size_t h = hash(k);
  size_t start = h % capacity_;
  for (size_t i = 0; i < capacity_; ++i) {
    size_t idx = (start + i) % capacity_;
    Key found = cells_[idx].key.load(std::memory_order_acquire);
    if (found == k) return Iterator{this, idx};
    if (found == kEmpty) return end();
  }
  return end();
}
```

원자 load 한 번. lock 없음. acquire/release pairing으로 insert side가 write한 value가 reader에 보임.

### Multi sub-map chain

```cpp
// AtomicHashMap level
std::pair<Iterator, bool> insert(Key k, Value v) {
  // 1. 가장 최근 sub-map에 시도
  for (auto& sub : subMaps_) {
    auto r = sub.insert(k, v);
    if (r.second || r.first != sub.end()) return r;
  }
  // 2. 가득 → 새 sub-map (mutex로 한 번에 한 명만)
  std::lock_guard g(growLock_);
  subMaps_.emplace_back(make_unique<AtomicHashArray>(growSize));
  return subMaps_.back()->insert(k, v);
}
```

성장은 mutex 보호 하지만 read/insert는 기존 sub-map에서 lock-free.

## 제약

| 항목 | AtomicHashMap | 일반 hash map |
|------|---------------|-----------------|
| Capacity 미리 지정 | 필수 | reserve로 hint |
| Erase | X | O |
| Resize | append-only | full rehash |
| Value 수정 (in-place) | atomic type만 | 자유 |
| Iterator 안정 | 영구 (cell 그대로) | rehash 시 invalid |
| Reader contention | 0 | mutex 필요 |

이런 제약을 받아들일 수 있는 use case에서만.

## std/abseil 비교

```cpp
// std
// 직접 대응 없음. std::unordered_map + std::shared_mutex로 구현 필요

// abseil
// flat_hash_map + absl::Mutex
// 또는 absl::node_hash_map + node 자체에 lock
// concurrent variant은 없음 — Google 내부에는 있으나 미공개

// folly
folly::AtomicHashMap<K, V> ahm(N);          // append-only, lock-free read
folly::ConcurrentHashMap<K, V> chm;          // 다음 글 — 전체 thread-safe
```

abseil은 concurrent hash map을 공개하지 않는다. fbcode는 두 가지(AtomicHashMap / ConcurrentHashMap)로 다른 trade-off를 제공.

## 코드 리뷰 포인트

```cpp
// Bad — erase 필요한데 AtomicHashMap
folly::AtomicHashMap<int, Conn> conns(N);
// disconnect 시 erase 안 됨 — 메모리 누수

// Good — erase 필요하면 ConcurrentHashMap
folly::ConcurrentHashMap<int, Conn> conns;
```

erase가 의미 있으면 AtomicHashMap을 쓰면 안 된다. 또는 *tombstone value* 같은 logical delete 패턴.

```cpp
// Bad — 큰 value, partial read 위험
folly::AtomicHashMap<int, std::vector<int>> m(N);
m.insert(1, {1, 2, 3, 4, 5});
// reader가 인덱스만 본 상태에서 size를 다르게 볼 수 있음

// Good — POD / atomic
folly::AtomicHashMap<int, uint64_t> counters(N);
```

value는 *atomic* 이거나 *immutable after insert*. 그렇지 않으면 reader가 깨진 값을 본다.

```cpp
// 잘못된 capacity 추정
folly::AtomicHashMap<int, int> m(1000);
for (int i = 0; i < 1'000'000; ++i) m.insert(i, i);
// sub-map이 계속 추가 — find가 모든 sub-map을 순회, 느려짐
```

capacity는 최대값에 맞춰 한 번에. sub-map chain이 길어지면 find가 모든 chain을 본다.

## 안티패턴

- **`ConcurrentHashMap` 대신 AtomicHashMap**: erase가 필요하면 ConcurrentHashMap. AtomicHashMap은 단방향 transactional 환경만.
- **value mutation**: in-place update는 value가 `std::atomic`이어야 안전. 일반 type은 reader가 torn value를 본다.
- **capacity 부족**: chain이 길어지면 read complexity 증가. 처음에 max에 맞춰 reserve.

## 정리

- `AtomicHashMap`은 lock-free read, append-only insert.
- erase 불가, value mutation 제약.
- read-heavy + 거의 안 지우는 데이터에 ideal.
- capacity를 처음에 지정 (초과 시 sub-map chain, find 비용 증가).
- value는 atomic 또는 immutable이어야 reader 안전.

## 다음 편

`ConcurrentHashMap`은 sharded mutex로 erase 포함 full thread-safe를 제공한다.

## 관련 항목

- [Part 8-04: ConcurrentHashMap](/blog/programming/code-review/folly/part8-04-concurrent-hash-map) — 전체 thread-safe variant
- [Part 9-02: SharedMutex](/blog/programming/code-review/folly/part9-02-shared-mutex) — multi-reader 패턴 일반
- [원문 — folly/AtomicHashMap.h](https://github.com/facebook/folly/blob/main/folly/AtomicHashMap.h)
