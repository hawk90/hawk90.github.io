---
title: "Part 18-03: folly::MicroLock — 1-byte 락"
date: 2026-05-27T20:00:00
description: "MicroLock의 1-byte 표현 — futex 기반 lock으로 std::mutex(40+ byte)의 메모리 비용 회피."
series: "Folly Code Review"
seriesOrder: 78
tags: [cpp, folly, microlock, lock, memory]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `MicroLock`은 1-byte 안에 lock 상태와 wait queue head를 표현한다. `std::mutex`가 40+ byte를 쓰는 자리에서 *수억 개 객체*에 각각 lock을 박을 수 있게 한다.

## 동기

`std::mutex`는 plat마다 다르지만 보통 40 byte 정도다.

```text
glibc pthread_mutex_t :   40 bytes
libc++ std::mutex     :   40 bytes  
MSVC std::mutex       :   80 bytes
```

대부분 wait queue, owner thread, robust mutex 메타데이터 등을 포함. *수억 개* 객체에 lock을 박으려면 너무 비싸다.

```cpp
// 1억 개 작은 객체에 각자 mutex
struct Slot {
  std::mutex mu;     // 40 byte
  uint32_t   value;  // 4 byte
};                   // sizeof = 48 byte. mu가 90%
```

`MicroLock`은 1 byte. 같은 자리에서 sizeof(Slot)이 8 byte로 줄어든다.

```cpp
#include <folly/MicroLock.h>

struct Slot {
  folly::MicroLock lock;  // 1 byte
  uint32_t         value;  // 4 byte (padding 포함 8 byte)
};
```

## API

```cpp
#include <folly/MicroLock.h>

folly::MicroLock m;

m.lock();
// critical section
m.unlock();

// RAII
{
  std::lock_guard lk(m);   // 표준 lock_guard 사용 가능
  // ...
}

// try_lock
if (m.try_lock()) {
  // ...
  m.unlock();
}
```

표준 `std::mutex`와 인터페이스가 호환. `std::lock_guard`, `std::unique_lock` 모두 사용 가능.

### init

```cpp
struct Slot {
  folly::MicroLock lock;
  uint32_t value;
};

Slot s{};   // lock은 zero-init 상태 — 자동으로 unlocked

// 또는
s.lock.init();   // 명시적 init
```

`MicroLock`은 zero-init이 unlock 상태. global static, calloc된 영역에서 즉시 사용 가능. `std::mutex`는 일반적으로 명시적 생성자 호출 필요.

## 내부 구현

![MicroLock 1-byte vs std::mutex 40-byte](/images/blog/folly/diagrams/part18-03-micro-lock-byte.svg)

```cpp
// folly/MicroLock.h 약식
class MicroLock {
 public:
  void lock() noexcept {
    if (LIKELY(tryLock())) return;
    lockSlow();
  }

  bool try_lock() noexcept {
    uint8_t expected = 0;
    return lock_.compare_exchange_strong(
      expected, kLockedBit, std::memory_order_acquire);
  }

  void unlock() noexcept {
    uint8_t prev = lock_.fetch_and(~kLockedBit, std::memory_order_release);
    if (prev & kWaitersBit) {
      futexWake(reinterpret_cast<uint32_t*>(&lock_), 1);
    }
  }

 private:
  static constexpr uint8_t kLockedBit  = 0x01;
  static constexpr uint8_t kWaitersBit = 0x02;
  // 나머지 6-bit: user data 또는 wait queue 메타

  std::atomic<uint8_t> lock_;

  void lockSlow() noexcept {
    for (;;) {
      uint8_t cur = lock_.load(std::memory_order_relaxed);
      if (!(cur & kLockedBit)) {
        if (lock_.compare_exchange_weak(
              cur, cur | kLockedBit, std::memory_order_acquire)) {
          return;
        }
        continue;
      }
      // mark as having waiters
      if (!(cur & kWaitersBit)) {
        lock_.fetch_or(kWaitersBit, std::memory_order_relaxed);
      }
      // futex wait
      futexWait(reinterpret_cast<uint32_t*>(&lock_),
                static_cast<uint32_t>(cur | kWaitersBit));
    }
  }
};
```

핵심 비트 두 개.

- **bit 0** — `kLockedBit`: 1이면 locked.
- **bit 1** — `kWaitersBit`: 1이면 대기자 있음.

나머지 6-bit은 사용자가 활용 가능 (next 절 참고).

### Futex 활용

Linux futex는 4-byte aligned `uint32_t`를 대상으로 한다. `MicroLock`은 1 byte라 fragment지만 8-byte aligned 구조체 안에 들어가면 wait/wake가 byte 일부를 보고 동작 가능 — 첫 byte의 변화로 trigger.

```cpp
// futex 호출이 lock 변수의 정수 비교로 trigger됨
// fast path는 user-space에서 1 instruction CAS
// slow path만 kernel
```

uncontended fast path가 CAS 1회 — `std::mutex`의 user-space fast path와 동등. contention 시 futex로 sleep.

## 사용자 데이터 6-bit

```cpp
folly::MicroLock m;

m.lock();
uint8_t userBits = m.load() & 0xFC;   // 상위 6-bit
m.unlock();

// lock과 동시에 user data 갱신
{
  std::lock_guard lk(m);
  setUserData(m, newBits);   // critical section 안에서 6-bit 사용
}
```

이 6-bit이 활용되는 자리는 *각 lock에 작은 state*가 필요한 곳. 예: cache slot의 LRU flag, generation counter 일부.

## 실전 — hash map의 chunk lock

```cpp
struct Chunk {
  folly::MicroLock lock;   // 1 byte
  uint8_t          countAndFlags;
  uint16_t         epoch;
  // 4 byte 안에 동기화 + 메타 다 들어감
  uint8_t          data[60];
};
```

64-byte cache line 안에 lock + 메타데이터 + payload가 모두. `std::mutex`였다면 한 chunk가 100+ byte로 cache line을 넘긴다.

LMAX, robin-hood hash, F14 같은 데이터 구조가 비슷한 trade-off.

## std::mutex와의 비교

| 항목 | std::mutex | MicroLock | MicroSpinLock |
|------|------------|-------------|----------------|
| sizeof | 40 byte | 1 byte | 1 byte |
| zero-init | 안 됨 (생성자 필요) | 됨 (0 = unlocked) | 됨 |
| uncontended fast path | CAS 1회 | CAS 1회 | CAS 1회 |
| contention 대응 | futex / queue | futex | spin (no sleep) |
| 사용자 비트 | 없음 | 6 bit | 7 bit |
| RAII | std::lock_guard | std::lock_guard | std::lock_guard |
| recursive | non-recursive | non-recursive | non-recursive |

`MicroLock`은 sleep-capable, `MicroSpinLock`은 spin-only(다음 절).

### false sharing — 왜 같은 line 안에 두는가

per-object lock의 핵심은 *lock과 보호되는 데이터를 한 cache line에 묶는 것*이다. 그 이유는 false sharing의 역방향이다.

![False sharing on cache line](/images/blog/cpp-concepts/diagrams/false-sharing-cacheline.svg)

서로 다른 변수가 같은 line에 있으면 한 코어의 쓰기가 다른 코어의 line을 invalidate한다. MicroLock은 보호 대상 데이터의 메타 byte로 자기 자신을 박아 *항상 함께 invalidate되도록* 한다 — 어차피 lock을 잡으면 데이터를 읽을 테니 같이 fetch되는 게 이득이다.

## 코드 리뷰 포인트

- *수만/수억 개 객체*에 mutex 박는 자리 → MicroLock로 메모리 절감.
- per-object lock이 *한 cache line*에 다른 fields와 함께 들어가야 false sharing 줄어듦.
- 사용자 6-bit을 lock 보호 *밖에서* 읽으면 race. lock 안에서 일관되게 다뤄야.
- contention이 *매우 큼* → MicroLock의 futex가 std::mutex와 비슷한 성능. 메모리만 절약.
- spin이 더 빠르면(짧은 critical section) MicroSpinLock 고려.

## 자주 보는 안티패턴

```cpp
// 1. MicroLock을 condition_variable과 함께
folly::MicroLock m;
std::condition_variable cv;   // 호환 안 됨 — std::mutex가 필요

// 2. recursive 사용
folly::MicroLock m;
{
  std::lock_guard lk(m);
  {
    std::lock_guard lk2(m);   // deadlock — non-recursive
  }
}

// 3. 6-bit user data 변경을 race
m.unlock();
m.setUserBits(newVal);   // 다른 thread가 lock 시도 중일 수 있음
// → lock 안에서 변경

// 4. heap에 1-byte alloc
auto* m = new folly::MicroLock;   // sizeof는 1이지만 alignment + malloc header로 32+ byte
delete m;
// → 1-byte 객체 따로 alloc은 의미 없음. 다른 데이터와 함께 묶어야.
```

## 정리

- `MicroLock`은 1 byte futex-backed lock.
- zero-init이 unlocked — calloc/static 영역에서 바로 사용.
- uncontended fast path는 std::mutex와 동등 (CAS 1회).
- 6-bit user data를 같은 byte에 보유 가능.
- 수억 개 객체에 lock 박을 자리에서 메모리 비용을 결정적으로 줄임.

## 다음 편

[Part 18-04: MicroSpinLock](/blog/programming/code-review/folly/part18-04-micro-spin-lock)에서 spin-only variant를 본다.

## 관련 항목

- [Folly Part 18-04 — MicroSpinLock](/blog/programming/code-review/folly/part18-04-micro-spin-lock)
- [Folly Part 9-04 — RWSpinLock](/blog/programming/code-review/folly/part9-04-rw-spin-lock)
- [Folly Part 9-05 — PicoSpinLock](/blog/programming/code-review/folly/part9-05-pico-spin-lock)
- [원문 — folly/MicroLock.h](https://github.com/facebook/folly/blob/main/folly/MicroLock.h)
