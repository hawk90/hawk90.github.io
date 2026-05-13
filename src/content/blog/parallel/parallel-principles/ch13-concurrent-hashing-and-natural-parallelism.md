---
title: "Chapter 13: Concurrent Hashing과 자연스러운 병렬성"
date: 2026-05-12
description: "Closed / Open / Lock-Free 해시 테이블. Resizing의 동시성 문제. Split-Ordered List."
series: "The Art of Multiprocessor Programming"
seriesOrder: 13
tags: [parallel, concurrency, book-review, amp, hashing, lock-free, split-ordered]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
---

> **The Art of Multiprocessor Programming** Chapter 13 요약

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

```python
class ConcurrentHashTable<K, V>:
    buckets: List<List<Entry>>
    locks: List<Lock>  # bucket마다 락
    
    def put(key, value):
        h = hash(key) % len(buckets)
        locks[h].acquire()
        try:
            buckets[h].add(Entry(key, value))
        finally:
            locks[h].release()
    
    def get(key):
        h = hash(key) % len(buckets)
        locks[h].acquire()
        try:
            for e in buckets[h]:
                if e.key == key: return e.value
        finally:
            locks[h].release()
        return null
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

```python
def resize():
    for lock in locks:
        lock.acquire()    # 모두 잠금
    # ... resize ...
    for lock in locks:
        lock.release()
```

**장점**: 단순.
**단점**: resize 동안 시스템 정지. 큰 테이블이면 오래.

## 13.5 Refinable Lock — 락 자체를 동적 분할

`bucketLock[i]`의 i가 hash(key) mod (lock count)에 의존. lock count도 변할 수 있다면?

```python
class RefinableHashTable:
    locks: AtomicArray<Lock>
    bucket_count: AtomicInt
    
    def acquire(key):
        while True:
            mark, locks = readLocks()
            if not mark:    # resize 중 아님
                lock = locks[hash(key) % len(locks)]
                lock.acquire()
                if locks == self.locks:  # 그 사이 resize 안 됨
                    return lock
                lock.release()  # resize 된 경우 — 다시
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

### Bit-Reversal Key

```
키 1 (binary 01) → reversed → 10 → 정렬 키
키 2 (binary 10) → reversed → 01 → 정렬 키
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
| `tbb::concurrent_hash_map` | C++ | TBB 라이브러리 |
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

이게 incremental resize. resize 비용을 한 번에 부담 안 하고 작업들에 분산.

## 13.10 Read-Mostly 워크로드

해시 테이블 사용의 90%는 read-mostly다. cache처럼.

```python
class ReadMostlyMap:
    immutable_map: AtomicRef of ImmutableMap
    
    def get(key):
        return immutable_map.read().get(key)  # 락 없음, 매우 빠름
    
    def put(key, value):
        while True:
            old = immutable_map.read()
            new = old.with(key, value)
            if immutable_map.cas(old, new):
                return
```

읽기는 immutable map에 대한 lock-free read. 쓰기는 새 map을 만들고 CAS.

쓰기 비용이 크지만(전체 map 복사), 읽기가 압도적으로 많으면 효율적. 이게 RCU(Read-Copy-Update) 패턴과 같음.

## 정리

- 해시 테이블은 **자연스럽게 병렬화** — 다른 키는 다른 bucket
- **Striped locking** — bucket마다 (또는 그룹마다) 락
- **Resize**가 동시 환경의 가장 큰 도전
- **Split-Ordered List** — 비트 뒤집기로 resize를 데이터 이동 없이
- 실용적으로는 **incremental resize** + striped locking
- **Read-Mostly** 워크로드에는 RCU 패턴 적합

## 다음 장 예고

다음 장은 **Skiplist와 균형 검색** — 정렬된 동시성 자료구조.

## 관련 항목

- [Ch 12: Counting](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination)
- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
