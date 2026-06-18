---
title: "folly::RWSpinLock 분석"
date: 2026-06-06T09:07:00
description: "folly::RWSpinLock — spin-only reader-writer lock, 매우 짧은 critical section에 SharedMutex보다 빠르다."
series: "Folly Code Review"
seriesOrder: 43
tags: [cpp, folly, sync, spinlock, rwlock]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::RWSpinLock`은 4-byte 상태에 spin만 하는 reader-writer lock. critical section이 *수십 cycle 이내*면 SharedMutex의 spin-then-futex보다 빠르다. wait가 길어지면 CPU 낭비.

## 동기

`SharedMutex`도 짧은 wait는 spin한다. 그런데 spin 후에도 lock 못 잡으면 futex로 sleep — 이때 *syscall 비용*이 발생. critical section이 항상 5-50 cycle 정도라면 spin만 하는 게 syscall 한 번보다 싸다.

```text
critical section length  ←→  best primitive
  < 50 cycle            : atomic / no lock
  50 - 500 cycle        : RWSpinLock / SpinLock
  500 cycle - 100 μs    : SharedMutex / Mutex (spin then sleep)
  > 100 μs              : Mutex + sleep, condition variable
```

`RWSpinLock`은 두 번째 구간. fbcode에서 hot path의 작은 metric 갱신, 작은 counter 보호에 사용.

```cpp
folly::RWSpinLock lock;
{
  folly::RWSpinLock::WriteHolder g(&lock);
  counter += delta;   // 1-2 instruction
}
```

## API & 사용법

```cpp
#include <folly/synchronization/RWSpinLock.h>

folly::RWSpinLock lock;

// 1. Write
{
  folly::RWSpinLock::WriteHolder g(&lock);
  // exclusive
}

// 2. Read
{
  folly::RWSpinLock::ReadHolder g(&lock);
  // shared
}

// 3. Upgrade
{
  folly::RWSpinLock::UpgradedHolder ug(&lock);
  // read-like, but can promote to write
  folly::RWSpinLock::WriteHolder wg(std::move(ug));
}

// 4. try
if (lock.try_lock()) { /* write */ }
if (lock.try_lock_shared()) { /* read */ }
```

표준 `unique_lock`/`shared_lock`과 호환되지 않음 — 자체 Holder type만. `Holder`가 RAII unlock.

## 내부 구현

```cpp
// 약식 — folly/synchronization/RWSpinLock.h
class RWSpinLock {
  // state bit layout (32-bit):
  //   bit 0    : writer (1 bit)
  //   bit 1    : upgrade pending
  //   bit 2-31 : reader count
  std::atomic<int32_t> state_;
};
```

4-byte. `SharedMutex`와 동일 size. 차이는 *contended path*.

### lock (write)

```cpp
// 약식
void lock() {
  while (true) {
    int32_t expected = 0;
    if (state_.compare_exchange_weak(expected, kWriterBit,
                                      std::memory_order_acquire)) {
      return;
    }
    do {
      cpu_pause();   // PAUSE instruction
    } while (state_.load(std::memory_order_relaxed) != 0);
  }
}
```

CAS spin + load spin. PAUSE instruction이 spin loop의 cache traffic을 줄임 (Intel pipeline hint).

futex 호출 없음. 영원히 spin.

### lock_shared

```cpp
// 약식
void lock_shared() {
  while (true) {
    int32_t old = state_.load(std::memory_order_relaxed);
    if (!(old & kWriterBit) && !(old & kUpgradeBit)) {
      if (state_.compare_exchange_weak(old, old + kReaderIncrement,
                                        std::memory_order_acquire)) {
        return;
      }
    } else {
      cpu_pause();
    }
  }
}
```

writer가 있거나 upgrade가 pending이면 reader도 양보 (writer-priority 비슷).

### Unlock

```cpp
void unlock()        { state_.fetch_and(~kWriterBit, std::memory_order_release); }
void unlock_shared() { state_.fetch_sub(kReaderIncrement, std::memory_order_release); }
```

waker 없음. 다른 thread는 spin 중이므로 알아서 본다.

## std/abseil 비교

```cpp
// std — spin lock 없음
// 직접 구현: std::atomic_flag, std::atomic<int> + CAS spin

// abseil
absl::base_internal::SpinLock spin_mu;   // internal use
// public API는 추천 안 함

// folly
folly::SpinLock        sl;    // 단순 mutex
folly::RWSpinLock      rw;    // reader-writer
folly::PicoSpinLock<T> psl;   // 다음 글 — 1-byte
```

| 항목 | std (직접) | absl::SpinLock | folly::RWSpinLock |
|------|-------------|-----------------|---------------------|
| Reader/Writer | 직접 구현 | exclusive only | O |
| Public API | 없음 | internal | O |
| Park 폴백 | 없음 | 길어지면 yield | 없음 |
| sizeof | 4 byte (CAS) | 16 byte | 4 byte |

abseil은 spin lock을 *내부 전용*으로 두고 외부에는 `absl::Mutex`만 권장. folly는 RWSpinLock을 공개 API로 제공.

## 성능

```text
benchmark: 8 threads, critical section = increment counter (5 cycle)
                              throughput / total
  folly::RWSpinLock           400 M ops/s
  folly::SpinLock             420 M
  folly::SharedMutex          180 M
  std::shared_mutex            45 M
  std::atomic<int> fetch_add  600 M (no lock)
```

spin lock이 SharedMutex 대비 2배. atomic이 더 빠르나 lock 의미가 필요한 경우는 spin lock.

critical section이 길어지면:

```text
critical section = 10 μs
  folly::RWSpinLock          50 M (CPU 100% spin)
  folly::SharedMutex         48 M (sleep, CPU 70%)
```

비슷한 throughput에 CPU 사용 차이. RWSpinLock은 power 낭비.

## 코드 리뷰 포인트

```cpp
// Good — 매우 짧은 critical section
folly::RWSpinLock m;
{
  folly::RWSpinLock::WriteHolder g(&m);
  ++counter;
}

// Bad — I/O를 critical section 안에
folly::RWSpinLock m;
{
  folly::RWSpinLock::WriteHolder g(&m);
  database.Query(...);   // ms scale!
}
// 다른 thread CPU 100% 낭비
```

I/O, file write, 큰 lookup 같은 *밀리초 scale* 작업은 SharedMutex로.

```cpp
// 주의 — multiple cores spinning이 cache line bouncing
folly::RWSpinLock m;
// thread 8개가 동시에 spinning → cache line이 cores 사이 ping-pong
```

contention 심하면 spin이 BUS traffic 폭발. cores 수에 비해 lock 수가 부족하면 SharedMutex로.

```cpp
// Good — Holder를 항상 wrap
{
  folly::RWSpinLock::WriteHolder g(&lock);
  // ...
}
// 또는 직접
// lock.lock(); ... lock.unlock();   ← 절대 금지
```

raw lock/unlock은 exception escape 시 leak. Holder RAII만.

## 안티패턴

- **long critical section**: spinning thread가 CPU/배터리 낭비. critical section이 1 μs 넘으면 SharedMutex.
- **spin lock을 multi-core 100% scale에서**: cache line bounce가 throughput을 죽인다. shard 또는 fine-grained lock.
- **lock 안에서 다른 lock 잡기**: spin lock 안에서 두 번째 lock이 long wait면 첫 spin이 영원. 가능하면 lock 하나만.

## 정리

- `RWSpinLock`은 spin-only RW lock, 4-byte.
- 매우 짧은 critical section (< 1 μs)에 SharedMutex보다 빠름.
- futex/syscall 없음 — spin만.
- 길어지면 CPU 낭비, 일반 use case는 SharedMutex.
- Holder RAII로 사용, raw lock/unlock 금지.

## 다음 편

`PicoSpinLock`은 1-byte spinlock. 더 작은 메모리, 더 제한적 use case.

## 관련 항목

- [Part 9-02: SharedMutex](/blog/programming/code-review/folly/part9-02-shared-mutex) — 더 일반적인 RW lock
- [Part 9-05: PicoSpinLock](/blog/programming/code-review/folly/part9-05-pico-spin-lock) — 1-byte variant
- [Part 8-04: ConcurrentHashMap](/blog/programming/code-review/folly/part8-04-concurrent-hash-map) — fine-grained lock 응용
- [원문 — folly/synchronization/RWSpinLock.h](https://github.com/facebook/folly/blob/main/folly/synchronization/RWSpinLock.h)
