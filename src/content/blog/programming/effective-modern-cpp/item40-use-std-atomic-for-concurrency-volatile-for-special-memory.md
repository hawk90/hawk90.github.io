---
title: "항목 40: 동시성에는 std::atomic을, 특수 메모리에는 volatile을 사용하라"
date: 2025-01-10T15:00:00
description: "atomic과 volatile은 다른 도구 — 자주 혼동되는 두 키워드 정확히 구분."
tags: [C++, std::atomic, volatile, Concurrency, Modern C++]
series: "Effective Modern C++"
seriesOrder: 40
---

## 개요

`std::atomic`과 `volatile`은 자주 혼동되지만 **완전히 다른 도구**입니다. 이름이 비슷하고 둘 다 "최적화를 막는다"는 인상을 주지만, 해결하는 문제가 다릅니다.

- **`std::atomic`** — 멀티스레드 동시성 동기화
- **`volatile`** — 특수 메모리(MMIO, 신호 핸들러) 접근 시 컴파일러 최적화 차단

서로 대체 불가. 헷갈리면 데이터 경쟁 또는 잘못된 하드웨어 동작이 발생합니다.

## 필수 개념: 컴파일러 최적화와 메모리 가시성

> **초보자를 위한 배경 지식**

<br>

### 컴파일러는 코드를 자유롭게 변형한다

```cpp
int x = 0;

void f() {
    x = 1;
    x = 2;
    x = 3;
}
```

컴파일러는 위 함수를 다음처럼 최적화 가능:

```cpp
void f() {
    x = 3;   // 1, 2 쓰기 생략 (관찰 가능 효과 없음)
}
```

또는 다음 read도:

```cpp
int y = x;
int z = x;   // 컴파일러: y로 충분 — 다시 읽지 않음
```

→ 변수의 모든 read/write가 실제로 일어난다는 보장이 없음.

### 멀티스레드의 문제

```cpp
bool ready = false;
int data = 0;

// 스레드 A
data = 42;
ready = true;

// 스레드 B
while (!ready) { }
std::cout << data;   // 42를 볼 보장이 있나?
```

문제 두 개:
1. **컴파일러 재정렬** — `data = 42`와 `ready = true` 순서가 바뀔 수 있음
2. **CPU 재정렬** — 메모리 쓰기가 다른 코어에 보이는 순서가 다를 수 있음
3. **캐시** — 코어 A의 cache line이 코어 B로 전파되는 시점이 다름

→ 그냥 변수만으로는 멀티스레드 동기화 불가능.

### 특수 메모리 — MMIO

하드웨어 레지스터는 메모리 주소처럼 보이지만 **읽을 때마다 다른 값**, **쓸 때마다 부작용**:

```cpp
uint32_t* status_reg = (uint32_t*)0x40000000;

uint32_t s1 = *status_reg;
uint32_t s2 = *status_reg;   // 다른 값일 수 있음 (하드웨어가 변경)

*status_reg = 0;
*status_reg = 1;             // 두 쓰기 모두 의미 있음 (상태 초기화 → 동작 트리거)
```

컴파일러는 이런 의도를 모름. 일반 메모리처럼 취급해 최적화하면 → 잘못 동작.

## `std::atomic` — 동시성 동기화

```cpp
#include <atomic>

std::atomic<int> count{0};

// 두 스레드에서 동시에 안전
++count;       // atomic read-modify-write
int x = count; // atomic load
count = 42;    // atomic store
```

### 보장하는 것

1. **분할되지 않은 단일 연산** — torn read/write 없음
2. **메모리 순서 제어** — `memory_order_seq_cst` 등으로 다른 변수와의 순서 강제
3. **happens-before 관계** — 한 스레드의 쓰기가 다른 스레드에서 보이도록

### 멀티스레드 안전한 깃발

```cpp
std::atomic<bool> ready{false};
int data = 0;   // ⚠️ atomic 아님

// 스레드 A
data = 42;
ready.store(true, std::memory_order_release);

// 스레드 B
while (!ready.load(std::memory_order_acquire)) { }
std::cout << data;   // ✅ 42 보장
```

`release`/`acquire` 짝으로 `data` 쓰기가 ready보다 **먼저 일어났음**이 보장됨.

### 메모리 순서 정책

| 정책 | 의미 |
| --- | --- |
| `memory_order_relaxed` | atomicity만 — 순서 보장 X |
| `memory_order_acquire` | 이후 read/write를 이 load 이후로 |
| `memory_order_release` | 이전 read/write를 이 store 이전으로 |
| `memory_order_acq_rel` | RMW 연산 — 둘 다 |
| `memory_order_seq_cst` | 전역 순차 — 기본값, 가장 강력 |

→ 보통은 기본값(`seq_cst`) 충분. 성능이 극히 중요하면 약한 순서.

### atomic이 보장하지 않는 것

```cpp
std::atomic<int> a{0}, b{0};

a = 1;
b = 2;
// 두 atomic 변수 사이의 순서는 acquire/release 없이는 약함
```

→ 단일 변수의 atomicity ≠ 다변수 동기화. memory_order로 명시 필요.

## `volatile` — 컴파일러 최적화 차단

```cpp
volatile uint32_t* reg = (uint32_t*)0x40000000;
*reg = 1;   // 컴파일러가 캐시/생략하지 않고 매번 실제 메모리 접근
```

### 보장하는 것

1. **매 접근이 실제 read/write** — 생략 금지
2. **순서 유지** — 두 volatile 접근 사이의 순서는 컴파일러가 안 바꿈 (volatile끼리만)
3. ⚠️ **동시성 동기화는 제공 X** — atomic이 아님

### 사용처: MMIO

```cpp
struct UART {
    volatile uint32_t status;
    volatile uint32_t data;
    volatile uint32_t control;
};

UART* uart = (UART*)0x40010000;

while (!(uart->status & TX_READY)) { }   // 매번 status 다시 읽음
uart->data = 'A';                        // 쓰기 생략 X
```

`volatile` 없으면:
```cpp
while (!(uart->status & TX_READY)) { }
// 컴파일러: status 한 번만 읽어 cache → 무한 루프
```

### 사용처: 신호 핸들러 안의 공유 변수

POSIX 신호는 비동기 — 신호 핸들러에서 일반 변수를 변경하면 메인 코드가 못 봄. `volatile sig_atomic_t`가 표준.

```cpp
volatile sig_atomic_t got_signal = 0;

void handler(int) { got_signal = 1; }

int main() {
    while (!got_signal) { /* 매번 다시 읽음 */ }
}
```

### 사용처: `setjmp`/`longjmp` 호환

`setjmp` 후 수정된 자동 변수는 `longjmp` 시 미정의 — `volatile`로 막음.

### volatile이 보장하지 않는 것

```cpp
volatile int x = 0;

// 스레드 A
x = 1;

// 스레드 B
int y = x;   // 1을 본다는 보장 없음!
```

이유:
- volatile은 컴파일러 최적화만 막음 — CPU 재정렬·캐시 일관성은 별개
- 단일 접근 atomicity도 보장 X (large type은 분할 가능)
- happens-before 관계 X

→ **데이터 경쟁** 발생.

## 차이 비교 — 한눈에

| 측면 | `std::atomic` | `volatile` |
| --- | --- | --- |
| 용도 | 멀티스레드 동기화 | MMIO·신호 핸들러·setjmp |
| atomicity (분할 방지) | ✅ | ❌ |
| 메모리 순서 | ✅ (memory_order로 제어) | ❌ |
| CPU 캐시 일관성 | ✅ (seq_cst) | ❌ |
| 컴파일러 최적화 차단 | (필요한 만큼) | ✅ (모든 접근) |
| 데이터 경쟁 회피 | ✅ | ❌ |
| 매 접근 실제 실행 | ❌ (redundant 허용) | ✅ |

## 흔한 오해

### 오해 1 — "volatile이면 thread-safe다"

```cpp
volatile int counter = 0;

// 두 스레드
++counter;   // ⚠️ 데이터 경쟁! atomic 아님
```

`volatile`은 단일 변수 접근의 atomicity도 보장하지 않음. `++`는 read-modify-write 3단계 — 분할 가능.

→ 멀티스레드 카운터엔 `std::atomic<int>` 필수.

### 오해 2 — "atomic이면 컴파일러가 redundant 접근을 막는다"

```cpp
std::atomic<int> x;

int a = x;
int b = x;   // 컴파일러가 a로 대체 가능? 표준상 가능 (relaxed 한정)
```

표준은 atomic 변수에 대한 redundant load 최적화를 명시적으로 금지하지 않음 — 다만 메모리 순서를 지켜야 함. 보수적 컴파일러는 매번 읽음.

→ MMIO처럼 매 접근이 의미 있다면 `volatile std::atomic<T>` 함께 사용.

### 오해 3 — "둘은 같은 일을 한다"

완전히 다름. 두 도구 모두 필요한 경우도 존재.

## 함께 쓰는 경우 — `volatile std::atomic`

```cpp
volatile std::atomic<int> shared_signal{0};
```

상황:
- 멀티스레드 동시성 보장 필요 (atomic)
- 그리고 매 접근이 컴파일러에 의해 생략되면 안 됨 (volatile)
  - 예: 디버깅/로깅, MMIO와 결합된 동기화

흔치 않지만 표준적으로 가능.

## 코드 예 — 잘못된 사용 vs 올바른 사용

### 신호 처리 — 잘못

```cpp
bool stop = false;   // ⚠️ 일반 변수

void handler(int) { stop = true; }

int main() {
    signal(SIGINT, handler);
    while (!stop) { }   // 컴파일러: stop 한 번만 읽음 → 무한 루프
}
```

### 신호 처리 — 올바름

```cpp
volatile sig_atomic_t stop = 0;

void handler(int) { stop = 1; }

int main() {
    signal(SIGINT, handler);
    while (!stop) { }   // ✅ 매번 다시 읽음
}
```

### 멀티스레드 깃발 — 잘못

```cpp
volatile bool ready = false;   // ⚠️ atomic 아님

// 스레드 A
data = compute();
ready = true;        // CPU 재정렬 가능 — data 쓰기보다 먼저 보일 수 있음

// 스레드 B
while (!ready) { }
use(data);           // ⚠️ 미초기화 data 가능
```

### 멀티스레드 깃발 — 올바름

```cpp
std::atomic<bool> ready{false};

// 스레드 A
data = compute();
ready.store(true, std::memory_order_release);

// 스레드 B
while (!ready.load(std::memory_order_acquire)) { }
use(data);           // ✅
```

### 카운터 — 잘못

```cpp
volatile int count = 0;

// N개 스레드
++count;   // ⚠️ 분할 가능
```

### 카운터 — 올바름

```cpp
std::atomic<int> count{0};

// N개 스레드
++count;   // ✅ atomic RMW
```

## std::atomic의 대표 연산

```cpp
std::atomic<int> x{0};

x.store(42);                    // 쓰기
int v = x.load();               // 읽기
int old = x.exchange(100);      // 쓰고 이전 값 반환
x.fetch_add(1);                 // ++x
x.fetch_sub(1);                 // --x
x.fetch_and(0xFF);              // bitwise

// CAS
int expected = 42;
bool ok = x.compare_exchange_strong(expected, 99);
// expected가 x와 같으면 99로 — true
// 다르면 expected에 현재 값 저장 — false
```

### CAS 패턴 — lock-free 연산의 핵심

```cpp
void atomic_max(std::atomic<int>& target, int value) {
    int current = target.load();
    while (current < value
           && !target.compare_exchange_weak(current, value)) {
        // current 자동 갱신 — 재시도
    }
}
```

## std::atomic 가능 타입

- 모든 정수형, 포인터
- C++20부터 `float`, `double` (단 store/load만 — RMW는 없음)
- trivially copyable한 user-defined type (구현이 lock 사용 가능 — `is_lock_free()` 검사)

```cpp
std::atomic<int> a;          // ✅ 보통 lock-free
std::atomic<MyStruct> b;     // 가능하지만 lock-free 보장 X
std::cout << b.is_lock_free();
```

## 핵심 정리

1. **`std::atomic`**: 멀티스레드 동기화 — atomicity + 메모리 순서 + 캐시 일관성
2. **`volatile`**: 특수 메모리(MMIO, 신호) 접근 시 컴파일러 최적화 차단
3. 두 도구는 **서로 대체 불가** — 다른 문제를 해결
4. 멀티스레드 동시성에 `volatile` 사용 = 데이터 경쟁
5. MMIO에 `atomic`만 사용 = 컴파일러가 접근 생략 가능
6. 드물게 둘 다 필요 → `volatile std::atomic<T>`

## 관련 항목

- [항목 39: void future](/blog/programming/effective-modern-cpp/item39-consider-void-futures-for-one-shot-event-communication)
- [항목 41: pass by value](/blog/programming/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)
