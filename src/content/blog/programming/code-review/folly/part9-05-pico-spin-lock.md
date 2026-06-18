---
title: "folly::PicoSpinLock — 1-byte spinlock"
date: 2026-06-06T09:08:00
description: "PicoSpinLock — integer type의 한 bit을 lock으로 사용. 객체 안에 lock을 끼워 넣어 메모리 절약."
series: "Folly Code Review"
seriesOrder: 44
tags: [cpp, folly, sync, spinlock, memory]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::PicoSpinLock<IntType>`는 integer 한 bit을 lock으로 사용하는 spinlock. 나머지 bit은 데이터 저장에 사용 가능. lock과 데이터를 한 word에 packing해 메모리·cache line 절약.

## 동기

map의 value, node의 metadata 같이 *수백만 개*가 메모리에 존재하는 작은 객체에 mutex를 추가하면 객체 크기가 두 배가 된다. 8-byte payload + 8-byte mutex = 16 byte. 백만 개면 8MB가 mutex만으로.

이 객체가 *대부분 lock-free*이고 가끔 mutex가 필요하면, 객체 안의 *사용하지 않는 bit*을 lock으로 빌릴 수 있다.

```cpp
// pointer는 보통 하위 3 bit이 0 (8-byte align)
// 가장 낮은 bit을 lock으로 사용 가능
folly::PicoSpinLock<uintptr_t> lock_ptr;
lock_ptr.init(reinterpret_cast<uintptr_t>(some_ptr));
{
  std::lock_guard g(lock_ptr);
  void* p = reinterpret_cast<void*>(lock_ptr.getData());
  // use p
}
```

객체에 8-byte 추가 없이 lock + pointer 같이.

## API & 사용법

```cpp
#include <folly/synchronization/PicoSpinLock.h>

// 1. 기본 — uintptr_t 1 bit lock
folly::PicoSpinLock<uintptr_t> lock;
lock.init(0);                   // 데이터 초기화

// 2. lock / unlock
lock.lock();
auto data = lock.getData();
lock.setData(data + 1);
lock.unlock();

// 3. std::lock_guard 호환
{
  std::lock_guard g(lock);
  lock.setData(lock.getData() + 1);
}

// 4. try
if (lock.try_lock()) {
  lock.setData(...);
  lock.unlock();
}

// 5. bit 위치 선택 (custom)
folly::PicoSpinLock<uint64_t, /*lockBitPos=*/63> top_bit_lock;
// 최상위 bit을 lock으로, 하위 63 bit이 데이터
```

`lock` bit과 `data` bit이 같은 word에 공존. lock bit이 0이면 unlocked, 1이면 locked. 데이터 접근은 항상 `getData()`/`setData()` 통해.

## 내부 구현

```cpp
// 약식
template <typename IntType, size_t Bit = sizeof(IntType)*8 - 1>
class PicoSpinLock {
  std::atomic<IntType> data_;
  static constexpr IntType kLockMask = IntType(1) << Bit;
  static constexpr IntType kDataMask = ~kLockMask;
};
```

한 atomic integer. lock bit과 data bit이 mask로 분리.

### lock

```cpp
// 약식
void lock() {
  while (true) {
    IntType old = data_.load(std::memory_order_relaxed);
    IntType expected = old & kDataMask;     // lock bit = 0
    IntType desired  = expected | kLockMask;
    if (data_.compare_exchange_weak(expected, desired,
                                     std::memory_order_acquire)) {
      return;
    }
    cpu_pause();
  }
}
```

CAS로 lock bit set. 이미 set이면 spin.

### unlock

```cpp
void unlock() {
  data_.fetch_and(kDataMask, std::memory_order_release);   // lock bit clear
}
```

`fetch_and`로 lock bit만 끄기. data는 그대로.

### getData / setData

```cpp
IntType getData() const {
  return data_.load(std::memory_order_relaxed) & kDataMask;
}

void setData(IntType v) {
  // lock이 잡혀 있을 때만 호출하는 게 안전
  IntType old = data_.load(std::memory_order_relaxed);
  IntType desired = (v & kDataMask) | (old & kLockMask);
  data_.store(desired, std::memory_order_release);
}
```

`setData`는 *lock 잡힌 상태*에서만 호출해야 한다 — 그렇지 않으면 다른 thread의 lock bit을 덮어쓴다.

## 사용 사례

### 1. Pointer + lock 한 word

```cpp
// node에 next pointer + lock bit
struct Node {
  folly::PicoSpinLock<uintptr_t> next_locked;   // 8 byte
  Value value;
};

Node* next(Node* n) {
  std::lock_guard g(n->next_locked);
  return reinterpret_cast<Node*>(n->next_locked.getData());
}
```

`std::mutex* + next pointer` 16 byte → 8 byte.

### 2. Reference count + lock

```cpp
folly::PicoSpinLock<uint32_t, 0> rc_lock;   // bit 0 = lock, bits 1-31 = count
rc_lock.init(0 | 1u);   // count = 0, lock bit can be flipped

void increment() {
  std::lock_guard g(rc_lock);
  rc_lock.setData(rc_lock.getData() + 2);   // count는 bit 1 이상
}
```

### 3. Tagged pointer mode

```cpp
folly::PicoSpinLock<uintptr_t, 1> ptr_lock;   // bit 1 = lock, bit 0 = tag
// pointer가 4-byte align이면 하위 2 bit이 모두 사용 가능
```

## std/abseil 비교

표준에 없음. abseil도 없음. boost는 `interprocess::spin_mutex`가 비슷한 사상이지만 더 큰 sizeof.

직접 구현 가능하나 atomic 조작 + memory_order가 까다로워 미세한 버그를 만들기 쉽다. folly의 검증된 구현을 쓰는 게 안전.

## 코드 리뷰 포인트

```cpp
// Bad — setData가 lock 없이 호출
folly::PicoSpinLock<uint64_t> psl;
psl.init(0);
psl.setData(42);   // 다른 thread가 lock 중이면 lock bit 덮음
```

`setData`는 *lock 보유 시에만*. 그렇지 않으면 lock bit/state 깨짐.

```cpp
// 주의 — bit 위치 충돌
folly::PicoSpinLock<uintptr_t, 0> ptr_lock;
void* ptr = malloc(64);     // 16-byte align — bit 0 사용 안 함
ptr_lock.init(uintptr_t(ptr));
// ptr 정렬이 1-byte라면 ptr의 bit 0가 lock과 충돌!
```

lock bit 위치가 데이터의 *사용하지 않는 bit*인지 확인. 일반 malloc은 16-byte align이라 하위 4 bit OK.

```cpp
// Good — 매우 작은 객체에 lock 추가
struct Entry {
  folly::PicoSpinLock<uint64_t> data;   // 8 byte, lock + 63-bit payload
};
// vs
struct Entry {
  uint64_t data;
  std::mutex mu;                          // +40 byte
};
```

큰 차이는 대량 객체에서.

## 안티패턴

- **long critical section**: spin only — wait 길면 CPU 100% 낭비. PicoSpinLock은 *수십 cycle* CS 전용.
- **lock bit과 user bit 영역 혼동**: getData는 자동으로 mask하지만 raw `data_` 접근은 금지.
- **다양한 PicoSpinLock의 bit pos를 한 코드베이스에 섞기**: pos 0과 63 두 가지가 있으면 코드 리뷰가 어렵다. 한 가지로 통일.

## 정리

- `PicoSpinLock<IntType, BitPos>`은 integer 한 bit을 lock으로.
- lock + 데이터(remaining bit)를 한 word에 packing → 메모리 절약.
- 대량 객체(million-scale)에서 sizeof 차이가 의미 있음.
- spin only — short critical section 전용.
- `setData`는 lock 보유 시에만, lock bit 위치는 사용 안 하는 bit으로.

## 다음 편

Part 9가 Folly Code Review 시리즈의 sync 챕터를 마무리한다. 이후 Part 10에서는 큐(ProducerConsumer, MPMC 등)를 본다.

## 관련 항목

- [Part 9-04: RWSpinLock](/blog/programming/code-review/folly/part9-04-rw-spin-lock) — 별도 4-byte spin lock
- [Part 9-01: Synchronized](/blog/programming/code-review/folly/part9-01-synchronized) — 큰 객체 lock wrapper
- [Part 8-04: ConcurrentHashMap](/blog/programming/code-review/folly/part8-04-concurrent-hash-map) — 내부 bucket이 비슷한 packing
- [원문 — folly/synchronization/PicoSpinLock.h](https://github.com/facebook/folly/blob/main/folly/synchronization/PicoSpinLock.h)
