---
title: "folly::EvictingCacheMap — LRU 구현 분석"
date: 2026-06-06T09:03:00
description: "EvictingCacheMap — 고정 size 한도와 LRU eviction policy를 결합한 single-thread cache."
series: "Folly Code Review"
seriesOrder: 39
tags: [cpp, folly, container, lru, cache]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::EvictingCacheMap<K, V>`는 fixed max size + LRU eviction의 hash map. access마다 가장 최근 위치로 옮기고, max size 초과 시 LRU 항목을 자동 제거. single-thread 전용.

## 동기

cache의 두 핵심 요구.

1. 최대 메모리 한도를 *보장*.
2. 자주 쓰는 항목은 유지, 안 쓰는 건 제거.

`std::unordered_map`은 두 가지 모두 없다. 직접 구현하면 흔히 다음 둘을 같이 들고 다닌다.

- `std::unordered_map<K, list_iterator>`: O(1) lookup.
- `std::list<pair<K, V>>`: LRU ordering.

이 짝을 매번 작성하는 게 귀찮아 표준화한 것이 `EvictingCacheMap`. boost의 `multi_index_container` 또는 LinkedHashMap의 C++ 대응.

```cpp
folly::EvictingCacheMap<int, std::string> cache(1000);  // max 1000
cache.set(1, "a");
cache.get(1);                  // hit → LRU 앞으로
auto* p = cache.get_or_null(2);  // miss → nullptr
// 1001번째 set 시 LRU 항목 자동 제거
```

## API & 사용법

```cpp
#include <folly/container/EvictingCacheMap.h>

// 1. 생성 — max size, 옵션 nclear
folly::EvictingCacheMap<int, std::string> c(1024);

// 2. set — insert/update + LRU 앞으로
c.set(1, "a");

// 3. get — hit이면 LRU 앞으로
const std::string& v = c.get(1);   // throws if miss

// 4. get_or_null — miss 시 nullptr
const std::string* p = c.get_or_null(2);

// 5. peek — LRU 갱신 안 함
const std::string* p2 = c.peek(1);

// 6. erase / clear
c.erase(1);
c.clear();

// 7. size / capacity
c.size();    c.getMaxSize();

// 8. 통계 — hit / miss / eviction
c.getStats();

// 9. eviction callback
c.setPruneHook([](const auto& k, auto&& v) {
  LOG(INFO) << "evicted: " << k;
});
```

`get`은 LRU 위치를 옮긴다. `peek`은 옮기지 않음 (debugging/snapshot 용도).

## 내부 구현

```cpp
// 약식
template <typename K, typename V>
class EvictingCacheMap {
  struct Node {
    K          key;
    V          value;
    Node*      prev;
    Node*      next;
  };

  folly::F14FastMap<K, Node*> index_;     // key → node 빠른 lookup
  Node*       head_;                      // LRU front (most recent)
  Node*       tail_;                      // LRU back  (least recent)
  size_t      size_;
  size_t      maxSize_;
  std::function<void(K&&, V&&)> pruneHook_;
};
```

intrusive doubly linked list + hash map. 둘 다 O(1).

### Set

```cpp
// 약식
void set(K k, V v) {
  if (auto it = index_.find(k); it != index_.end()) {
    // 이미 있음 — value 갱신 + LRU 앞으로
    Node* n = it->second;
    n->value = std::move(v);
    moveToFront(n);
    return;
  }
  // 새 entry
  if (size_ >= maxSize_) evictOne();   // 한 개 제거
  Node* n = newNode(std::move(k), std::move(v));
  pushFront(n);
  index_.emplace(n->key, n);
  ++size_;
}

void evictOne() {
  Node* victim = tail_;
  unlink(victim);
  index_.erase(victim->key);
  if (pruneHook_) pruneHook_(std::move(victim->key), std::move(victim->value));
  delete victim;
  --size_;
}
```

eviction은 tail 한 개씩. capacity 초과 폭이 크면 여러 번 호출.

### Get

```cpp
const V& get(const K& k) {
  auto it = index_.find(k);
  if (it == index_.end()) throw std::out_of_range{};
  Node* n = it->second;
  moveToFront(n);
  ++stats_.hits;
  return n->value;
}
```

매 get은 linked list pointer 3-4개 수정. 가벼우나 *write임에 주의* — `const get`이라도 LRU 상태 변경.

## std/abseil 비교

표준에는 LRU cache가 없다. abseil에도 직접 대응 없음.

흔히 쓰는 대안:

- boost::multi_index — full flexibility, 비용 큼.
- 직접 구현 — `std::list` + `std::unordered_map`.
- 3rd party (e.g. lru_cache11, hashlru) — header-only library.

`folly::EvictingCacheMap`은 fbcode 내부 표준 선택. 다른 folly type(F14, fbstring)과 잘 통합.

| 항목 | std/직접 구현 | boost::multi_index | folly::EvictingCacheMap |
|------|----------------|---------------------|--------------------------|
| Set/Get | O(1) | O(log n) | O(1) |
| Iterator 안정 | rehash 시 invalid | 안정 | iterator 인터페이스 제한적 |
| Prune callback | 직접 구현 | 직접 | setPruneHook |
| Multi-thread | X | X | X (single-thread 전용) |
| Custom policy | 직접 | 가능 | LRU 전용 |

## 사용 패턴

### 1. URL → 처리 결과 cache

```cpp
folly::EvictingCacheMap<std::string, Response> http_cache(10'000);

auto* cached = http_cache.get_or_null(url);
if (cached) return *cached;

auto resp = FetchAndProcess(url);
http_cache.set(url, std::move(resp));
return http_cache.get(url);
```

### 2. Compiled regex cache

```cpp
thread_local folly::EvictingCacheMap<std::string, std::regex>
    regex_cache(128);

const std::regex& compile(const std::string& pattern) {
  if (auto* r = regex_cache.get_or_null(pattern)) return *r;
  regex_cache.set(pattern, std::regex{pattern});
  return regex_cache.get(pattern);
}
```

thread_local로 multi-thread 회피.

### 3. Stats callback

```cpp
folly::EvictingCacheMap<int, BigObject> c(1024);
c.setPruneHook([](int k, BigObject&& v) {
  metrics_.evicted.increment();
  v.OnEvict();   // resource 해제 hook
});
```

## 코드 리뷰 포인트

```cpp
// Bad — multi-thread 사용
folly::EvictingCacheMap<int, std::string> shared_cache(1024);
// thread 여럿이 get/set → race

// Good — thread_local 또는 외부 mutex
thread_local folly::EvictingCacheMap<int, std::string> tls_cache(1024);
// 또는 folly::Synchronized<EvictingCacheMap<...>>
```

`EvictingCacheMap`은 single-thread 전용. concurrent용은 `folly::ConcurrentHashMap` + size limit을 직접 또는 외부 wrapper.

```cpp
// 위험 — get으로 LRU 갱신, 의도 외 eviction 변경
const auto& v = cache.get(k);   // LRU 앞으로
// 의도가 단순 확인이면 peek

// Good
if (auto* p = cache.peek(k)) Inspect(*p);   // LRU 안 건드림
```

debugging/inspection은 `peek`. 진짜 hit으로 보고 싶으면 `get`.

```cpp
// 주의 — max size를 너무 작게
folly::EvictingCacheMap<K, V> tiny(10);
// thrashing → hit rate 낮음 → cache 무용
```

cache는 *working set* 크기에 맞춰야 hit rate 의미. metric으로 모니터.

## 안티패턴

- **multi-thread 공유**: lock 없음 → race. thread_local 또는 외부 lock.
- **`get`의 LRU 부수 효과 무시**: const-correctness 깨짐. *get은 logical 쓰기*.
- **pruneHook에서 heavy work**: hook은 set/get 안에서 호출. blocking 작업은 별도 thread로.

## 정리

- `EvictingCacheMap`은 fixed size + LRU eviction의 single-thread cache.
- intrusive list + F14 hash map으로 O(1) set/get/evict.
- `setPruneHook`으로 eviction 시 콜백.
- multi-thread는 thread_local 또는 외부 lock.
- working set 크기에 맞춘 max size가 hit rate 결정.

## 다음 편

Part 9에서 동기화 프리미티브를 본다. 시작은 `folly::Synchronized` — 데이터와 lock을 묶는 wrapper.

## 관련 항목

- [Part 8-04: ConcurrentHashMap](/blog/programming/code-review/folly/part8-04-concurrent-hash-map) — thread-safe variant
- [Part 7-04: F14FastMap](/blog/programming/code-review/folly/part7-04-f14-fast-map) — 내부 index 자료구조
- [Part 9-01: Synchronized](/blog/programming/code-review/folly/part9-01-synchronized) — multi-thread 캡슐화
- [원문 — folly/container/EvictingCacheMap.h](https://github.com/facebook/folly/blob/main/folly/container/EvictingCacheMap.h)
