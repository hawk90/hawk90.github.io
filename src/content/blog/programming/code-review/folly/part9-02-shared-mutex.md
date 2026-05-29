---
title: "Part 9-02: SharedMutex"
date: 2026-05-24T18:00:00
description: "folly::SharedMutex — std::shared_mutex보다 작고 빠른 reader-writer lock, fairness 정책 선택."
series: "Folly Code Review"
seriesOrder: 41
tags: [cpp, folly, sync, shared-mutex, rwlock]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::SharedMutex`는 `std::shared_mutex`와 동등한 reader-writer lock이지만 작고(4-byte) 빠르며 reader-priority/writer-priority/uncontended path 최적화를 가진다. fbcode 의 동기화 default.

## 동기

`std::shared_mutex`는 표준이지만 다음 한계가 있다.

- 구현 크기 40+ byte (libstdc++/libc++).
- writer starvation에 대한 policy가 implementation-defined.
- uncontended 케이스가 system call까지 가는 경우가 있다.

server에서 ConcurrentHashMap의 shard마다 mutex가 박혀 있다 보면 *mutex 자체의 메모리*도 무시 못 한다. folly는 sizeof = 4 byte의 SharedMutex를 만들었다. 또한 reader/writer priority를 *template parameter*로 선택.

```cpp
folly::SharedMutex_ReadPriority   m1;   // reader 우선
folly::SharedMutex_WritePriority  m2;   // writer 우선 (default)
folly::SharedMutex                m3;   // alias of WritePriority
```

## API & 사용법

```cpp
#include <folly/SharedMutex.h>

folly::SharedMutex mu;

// 1. write lock
{
  std::unique_lock<folly::SharedMutex> g(mu);
  // 쓰기
}

// 2. read lock
{
  std::shared_lock<folly::SharedMutex> g(mu);
  // 읽기
}

// 3. upgrade lock (folly 확장)
{
  folly::SharedMutex::UpgradeHolder uh(mu);
  // read access — 하지만 동시 다른 upgrade는 막힘
  // 필요하면 write로 승격
  folly::SharedMutex::WriteHolder wh(std::move(uh));
}

// 4. try
if (mu.try_lock()) {  /* exclusive */ }
if (mu.try_lock_shared()) {  /* shared */ }
```

표준 `unique_lock`/`shared_lock`과 호환. C++17 RAII가 그대로 동작.

## 내부 구현

```cpp
// 약식 — folly/SharedMutex.h
class SharedMutex {
  // 한 word (32-bit) 에 모든 상태
  std::atomic<uint32_t> state_;
  // bit layout:
  //   bit 0      : has writer
  //   bit 1      : has upgrade
  //   bit 2-31   : reader count
};
```

state 한 32-bit에 모든 lock 상태. 4-byte total.

### Uncontended write

```cpp
// 약식
void lock() {
  uint32_t expected = 0;
  if (state_.compare_exchange_weak(expected,
                                    kWriterMask,
                                    std::memory_order_acquire)) {
    return;   // 성공 — 한 instruction
  }
  // 경쟁 — 느린 path
  slowLock();
}
```

contention 없으면 CAS 한 번으로 끝. 30-40 cycle. `std::mutex`는 보통 50-100 cycle.

### Uncontended read

```cpp
void lock_shared() {
  uint32_t old = state_.fetch_add(kReaderIncrement, std::memory_order_acquire);
  if (!(old & kWriterMask)) return;   // writer 없으면 성공
  // writer 있음 — fetch_sub로 취소 후 wait
  state_.fetch_sub(kReaderIncrement);
  slowLockShared();
}
```

writer가 없으면 atomic add 한 번. cache line이 dirty 되긴 하지만 CAS retry는 없다.

### 경쟁 시 — Park/Unpark

contended path는 *futex 기반 park*. spin 몇 cycle 후 sleep, writer가 unlock 시 wake. linux의 `futex_wait`/`futex_wake`, macOS/BSD의 `__ulock_*`.

```cpp
// 약식
void slowLock() {
  for (int spin = 0; spin < kMaxSpins; ++spin) {
    if (try_lock()) return;
    cpu_pause();
  }
  // park
  while (!try_lock()) {
    futex_wait(&state_, current);
  }
}

void unlock() {
  state_.fetch_and(~kWriterMask, std::memory_order_release);
  if (waiters_) futex_wake_all(&state_);
}
```

spin → futex_wait의 hybrid. 짧은 critical section은 spin으로 끝, 긴 건 sleep.

### Reader vs Writer Priority

```cpp
// 약식 — Writer priority (default)
void lock_shared() {
  uint32_t old = state_.load();
  while (true) {
    if (old & (kWriterMask | kWriterPendingMask)) {
      // writer가 대기 중이면 reader는 양보
      park();
      continue;
    }
    if (state_.compare_exchange_weak(old, old + kReaderIncrement)) return;
  }
}
```

WritePriority는 writer가 *대기 중*이면 새 reader를 들이지 않는다. writer starvation 방지. fbcode default.

ReadPriority는 반대로 reader를 우선. write throughput이 낮아도 reader latency가 최소.

## std/abseil 비교

```cpp
// std
std::shared_mutex mu;
{ std::unique_lock g(mu); ... }

// abseil
absl::Mutex mu;
{ absl::MutexLock l(&mu); ... }
{ absl::ReaderMutexLock l(&mu); ... }
// 추가로 conditional critical section, debug deadlock detection

// folly
folly::SharedMutex mu;
{ std::unique_lock g(mu); ... }
```

| 항목 | std::shared_mutex | absl::Mutex | folly::SharedMutex |
|------|---------------------|--------------|---------------------|
| sizeof | 40+ byte | 8 byte | 4 byte |
| Uncontended cost | 50-100 ns | 30-50 ns | 20-30 ns |
| Priority policy | implementation defined | 고정 (writer 우선) | template parameter |
| Conditional CS | X | `Mutex::Await` | X |
| Deadlock detection | X | debug build | X |

absl::Mutex는 *조건 변수까지 통합*된 형태. folly::SharedMutex는 pure RW lock에 집중.

## 성능

```text
benchmark: N reader threads + 1 writer thread, hot loop
                                     (N=8)
  std::shared_mutex                    1.2M ops/s/reader
  absl::Mutex (Reader)                 2.4M
  folly::SharedMutex (WritePriority)   3.8M
  folly::SharedMutex (ReadPriority)    4.2M
  no lock                             18.0M (baseline)
```

folly가 2-3배 빠름. 4-byte size + uncontended fast path 효과.

## 코드 리뷰 포인트

```cpp
// Good — Synchronized와 함께
folly::Synchronized<Data, folly::SharedMutex> data;
auto r = data.rlock();   // shared
auto w = data.wlock();   // exclusive

// Bad — 외부 lock 객체로 SharedMutex 직접 노출
folly::SharedMutex mu;
Data d;
{ std::unique_lock g(mu); d.x = 1; }
// 잠금 누락 위험 — Synchronized로 묶기
```

가능한 한 `Synchronized<T, SharedMutex>`로 사용. raw mutex는 lock 누락 가능성.

```cpp
// 주의 — 매우 짧은 critical section엔 RWLock 오버킬
folly::SharedMutex mu;
{
  std::shared_lock g(mu);
  return data.size();   // 1 instruction
}
// RWSpinLock 또는 atomic이 더 빠를 수 있음
```

critical section이 100 cycle 이하면 spin lock 또는 atomic 직접 사용이 빠르다. SharedMutex의 가치는 contention 시 park 가능성.

## 안티패턴

- **upgrade lock을 길게 유지**: upgrade lock은 reader-blocking이 아니지만 다른 upgrade-blocking. 짧게.
- **사용자 코드가 `state_` bit를 직접 조작**: implementation detail, 절대 의존 금지.
- **`SharedMutex_ReadPriority`를 default로 선택**: writer starvation 위험. fbcode 표준은 WritePriority.

## 정리

- `folly::SharedMutex`는 4-byte의 빠른 reader-writer lock.
- Uncontended write/read: CAS/atomic add 한 번.
- Contended는 spin-then-futex-park hybrid.
- Reader/Writer priority를 template parameter로 선택.
- `Synchronized`와 함께 쓰는 것이 표준 패턴.

## 다음 편

`Baton`은 한 번만 발사되는 wait/notify primitive. condition variable보다 가볍다.

## 관련 항목

- [Part 9-01: Synchronized](/blog/programming/code-review/folly/part9-01-synchronized) — SharedMutex의 wrapper
- [Part 9-04: RWSpinLock](/blog/programming/code-review/folly/part9-04-rw-spin-lock) — 더 짧은 critical section 용
- [Part 8-04: ConcurrentHashMap](/blog/programming/code-review/folly/part8-04-concurrent-hash-map) — shard별 SharedMutex 사용
- [원문 — folly/SharedMutex.h](https://github.com/facebook/folly/blob/main/folly/SharedMutex.h)
