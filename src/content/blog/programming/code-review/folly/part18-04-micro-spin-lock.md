---
title: "folly::MicroSpinLock — 가장 좁은 spin lock"
date: 2026-06-08T09:07:00
description: "MicroSpinLock의 1-byte 표현, sleep 없는 순수 spin — 짧은 critical section 전용."
series: "Folly Code Review"
seriesOrder: 79
tags: [cpp, folly, spinlock, microspinlock]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `MicroSpinLock`은 1-byte spin lock이다. 절대 sleep 하지 않고 CPU를 점유하며 대기한다. critical section이 *수십 nanosecond* 수준일 때 가장 빠르다.

## 동기

`std::mutex`와 `MicroLock`은 contention 시 futex로 sleep한다. sleep의 cost는 context switch — 보통 수 μs. critical section이 수십 ns면 sleep이 *훨씬 더 비싸다*.

```text
시나리오: 10ns critical section, 가끔 contention

std::mutex contended  : 1000ns (futex syscall + wake)
MicroSpinLock contended : 50ns (CPU spin ~ critical section 길이)
```

CPU를 잠깐 태우는 게 sleep보다 싸다는 결정. 단 critical section이 길면 spin 비용이 누적돼 context switch보다 비싸진다 — **trade-off가 critical section 길이에 결정적**.

## API

```cpp
#include <folly/SpinLock.h>

folly::MicroSpinLock m{};   // 명시적으로 {} (POD-aggregate init)
m.lock();
// critical section
m.unlock();

// RAII
{
  std::lock_guard lk(m);
  // ...
}
```

`MicroLock`과 같은 표면. 차이는 *contention 시 동작*.

### init

```cpp
folly::MicroSpinLock m;
m.init();              // 명시적 init — 일부 컴파일러에서 zero-init 보장 위해
```

또는 zero-init 영역(`static`, `calloc`)에 두면 자동으로 unlocked.

## 내부 구현

```cpp
// folly/SpinLock.h 약식
class MicroSpinLock {
 public:
  void lock() noexcept {
    while (!try_lock()) {
      asm_volatile_pause();   // PAUSE / YIELD
    }
  }

  bool try_lock() noexcept {
    return __atomic_test_and_set(&lock_, __ATOMIC_ACQUIRE) == 0;
  }

  void unlock() noexcept {
    __atomic_clear(&lock_, __ATOMIC_RELEASE);
  }

 private:
  uint8_t lock_;
};
```

### acquire / release가 보장하는 것

lock의 try-set은 `ACQUIRE`, clear는 `RELEASE`다. 이 조합이 mutex의 의미를 만든다.

![Happens-before via release/acquire](/images/blog/cpp-concepts/diagrams/memory-ordering-happens-before.svg)

unlock 이전의 CS 안 쓰기들이 다음에 lock을 잡는 스레드의 읽기에 visible해진다. spin-lock도 결국 release/acquire pair로 데이터 visibility를 보장하는 도구다.

핵심은 셋.

1. **test_and_set** — atomic 1-bit set. acquire fence.
2. **PAUSE 명령** — x86의 `pause`, ARM의 `yield`. spin loop hint로 CPU power 절감, hyperthread 양보.
3. **clear with release** — release fence.

```text
spin loop:
  PAUSE          ; CPU에게 spin 중임을 알림
  TEST_AND_SET   ; atomic
  JZ done        ; 0이면 (이전 unlocked) 잠금 성공
  JMP spin loop
done:
```

PAUSE는 1-15 cycle. CPU에 *짧은 backoff*를 알린다. memory ordering buffer를 비워 cache line 경합을 줄인다. PAUSE 없는 spin은 *심각하게* 성능을 깎는다.

## 언제 spin이 옳은가

```text
critical section ≈ context switch cost (수 μs)
  → mutex가 더 나음

critical section << context switch cost (수십 ns)
  → spin이 압도적

대기자 많고 critical section 김
  → spin이 CPU를 낭비. mutex
```

**짧고 자주, contention 적음** → spin이 이긴다.

## 안전 사용 — preemption

spin 도중 OS가 lock holder를 preempt하면 spinner는 그 quantum 내내 헛 spin한다. preemption-aware 시스템 (RT scheduler, sched_setscheduler)에서는 lock holder의 priority를 spinner와 동등 이상으로 두는 게 안전.

userland에서 일반적으로는 두 가지 가이드.

1. critical section 안에 절대 syscall/blocking I/O 두지 않음.
2. critical section은 가능한 한 짧게 — assignment, increment, 짧은 list 조작.

## std::atomic_flag와의 비교

```cpp
std::atomic_flag flag = ATOMIC_FLAG_INIT;

void lock() {
  while (flag.test_and_set(std::memory_order_acquire)) {
    // PAUSE? — 직접 짜야 함
  }
}
void unlock() { flag.clear(std::memory_order_release); }
```

`std::atomic_flag` + spin loop가 가능하지만 PAUSE/yield hint, RAII guard, 사용자 6-bit 같은 편의가 없다. `MicroSpinLock`이 그 boilerplate를 묶은 형태.

## 실전 — 매우 짧은 critical section

```cpp
struct Counter {
  folly::MicroSpinLock lock;
  uint64_t             value;
};

void Increment(Counter& c) {
  std::lock_guard lk(c.lock);
  ++c.value;   // 1 instruction
}
```

`std::atomic<uint64_t> value` + `fetch_add` 가 더 깔끔. spin lock이 진가를 보이는 건 critical section이 *atomic 한 instruction을 넘어선*, 그러나 *극도로 짧은* 경우.

```cpp
struct Slot {
  folly::MicroSpinLock lock;
  uint8_t              flags;
  uint16_t             refCount;
  uint32_t             generation;
};

void TouchSlot(Slot& s) {
  std::lock_guard lk(s.lock);
  s.flags |= kAccessed;
  ++s.refCount;
  s.generation = NowGen();
}
```

3-4 field를 atomic 하게 일관 갱신 — atomic 하나로 표현 어렵다. spin lock으로 묶는다.

## 사용자 7-bit

`MicroSpinLock`은 8 bit 중 1 bit만 lock에 쓴다. 나머지 7 bit이 사용자 data로 쓸 수 있다. `MicroLock`(6 bit user)보다 1 bit 더. 단 비공식적 활용이라 직접 비트 조작 필요.

## 코드 리뷰 포인트

- critical section 안에 syscall/mutex/blocking 호출 → 즉시 std::mutex로 교체.
- spin이 hot path인데 PAUSE/yield 없음 → 다른 hyperthread를 굶긴다. `MicroSpinLock` 사용 (이미 PAUSE 포함).
- contention이 *항상 큼* → spin 비용이 누적. mutex가 나음.
- userland realtime priority에서 spin → priority inversion.

## 자주 보는 안티패턴

```cpp
// 1. critical section에 LOG
{
  std::lock_guard lk(m);
  LOG(INFO) << "in critical";   // I/O — context switch가 spin 중에 일어남
}

// 2. spin lock으로 condition variable 흉내
folly::MicroSpinLock m;
bool ready = false;

void Wait() {
  while (true) {
    std::lock_guard lk(m);
    if (ready) return;
  }
  // → CPU 100% spin. condition variable + std::mutex가 옳음.
}

// 3. 100 라인 critical section
{
  std::lock_guard lk(m);
  ProcessLargeBatch(items);   // ms-scale
}
// → spin 다른 thread가 ms 동안 헛 spin. std::mutex로.
```

## std::mutex / MicroLock / MicroSpinLock 선택

| 시나리오 | 추천 |
|----------|------|
| critical section μs ~ ms | std::mutex |
| critical section 100 ns ~ μs, sleep OK | MicroLock |
| critical section ~ 50 ns, contention 적음 | MicroSpinLock |
| 수억 객체, lock 자체가 가끔 contended | MicroLock |
| 짧은 lock + 사용자 비트 1 byte | MicroSpinLock |
| read 압도, write 드묾 | RWSpinLock / SharedMutex |

## 정리

- `MicroSpinLock`은 1-byte spin lock, sleep 없음.
- PAUSE/yield 명령으로 cache 경합과 power 줄임.
- critical section이 수십 ns일 때 가장 빠름.
- 길어지면 mutex가 나음 — trade-off가 critical section 길이로 결정.
- atomic flag로도 가능하지만 RAII + 사용자 비트가 추가 가치.

## 다음 편

Part 19로 넘어가 format, demangle, DynamicConverter를 본다.

## 관련 항목

- [Folly Part 18-03 — MicroLock](/blog/programming/code-review/folly/part18-03-micro-lock)
- [Folly Part 9-04 — RWSpinLock](/blog/programming/code-review/folly/part9-04-rw-spin-lock)
- [Folly Part 9-05 — PicoSpinLock](/blog/programming/code-review/folly/part9-05-pico-spin-lock)
- [원문 — folly/SpinLock.h](https://github.com/facebook/folly/blob/main/folly/SpinLock.h)
