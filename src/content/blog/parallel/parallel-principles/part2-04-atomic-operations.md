---
title: "원자적 연산"
date: 2026-05-12
description: "하드웨어가 제공하는 동기화 프리미티브. Read-Modify-Write 연산의 원리. Test-and-Set, Fetch-and-Add, Compare-and-Swap."
series: "Parallel Programming Principles"
seriesOrder: 14
tags: [parallel, concurrency, atomic, rmw, test-and-set, fetch-and-add, hardware]
type: tech
---

## 소프트웨어의 한계

Peterson과 Bakery 알고리즘은 **소프트웨어만으로** 상호 배제를 구현했다.

하지만 심각한 한계가 있다:

1. **복잡하다**: 정확성 증명이 어렵고 버그가 숨기 쉽다
2. **느리다**: 여러 변수를 읽고 써야 한다
3. **메모리 모델 의존**: 현대 CPU의 재배치에 취약하다
4. **확장성이 없다**: N-스레드면 O(N) 공간과 시간

현대 CPU는 이 문제를 **하드웨어 수준**에서 해결한다.

---

## 원자적 연산이란

**원자적(Atomic)** 연산은 **중간 상태가 없는** 연산이다.

- 실행이 시작되면 완료될 때까지 다른 스레드가 개입할 수 없다
- 다른 스레드는 실행 전 또는 실행 후 상태만 본다
- "all or nothing"

### 원자적이지 않은 예

```cpp
// 64비트 값을 32비트 CPU에서 쓰기
uint64_t counter = 0;

void increment() {
    counter++;  // 실제로는 여러 단계
}
```

32비트 CPU에서 64비트 쓰기는:
1. 하위 32비트 쓰기
2. 상위 32비트 쓰기

다른 스레드가 중간에 읽으면 **찢어진 값(torn read)**을 볼 수 있다.

### 원자적인 예

```cpp
std::atomic<int> counter{0};

void increment() {
    counter++;  // 원자적 증가
}
```

`std::atomic<int>`의 증가는 CPU가 **단일 명령어**로 보장한다.

---

## Read-Modify-Write (RMW) 연산

**Read-Modify-Write**는 원자적 연산의 핵심 패턴이다:

1. **Read**: 메모리 값을 읽는다
2. **Modify**: 값을 변경한다
3. **Write**: 결과를 쓴다

이 세 단계가 **원자적으로** 실행된다.

### 왜 RMW가 필요한가?

일반적인 읽기-쓰기는 원자적이지 않다:

```cpp
// 원자적이지 않음
int temp = counter;  // Read
temp = temp + 1;     // Modify
counter = temp;      // Write
```

RMW는 세 단계를 하나로 묶는다:

```cpp
// 원자적 RMW
counter.fetch_add(1);  // Read + Modify + Write가 원자적
```

---

## Test-and-Set (TAS)

가장 간단한 RMW 연산.

### 의미론

```cpp
// 의사 코드 (실제로는 원자적)
bool test_and_set(bool* target) {
    bool old = *target;  // Read
    *target = true;      // Write
    return old;          // 이전 값 반환
}
```

- 값을 읽고
- `true`로 설정하고
- 이전 값을 반환

### TAS 기반 스핀락

```cpp
class TASLock {
private:
    std::atomic<bool> locked{false};

public:
    void lock() {
        while (locked.exchange(true)) {
            // 이전 값이 true면 이미 잠겨 있음 → 스핀
        }
    }

    void unlock() {
        locked.store(false);
    }
};
```

`exchange(true)`는 TAS와 동일한 동작을 한다.

### TAS 락의 문제

**캐시 스래싱(Cache Thrashing)**:

```
스레드 A: TAS 실행 → 캐시라인 독점 → 성공
스레드 B: TAS 실행 → 캐시라인 요청 → 실패 → 다시 TAS
스레드 C: TAS 실행 → 캐시라인 요청 → 실패 → 다시 TAS
...
```

모든 스레드가 같은 캐시라인을 두고 경쟁한다. **버스 트래픽 폭발**.

### TTAS (Test-and-Test-and-Set)

```cpp
void lock() {
    while (true) {
        // 1단계: 읽기만 (캐시에서)
        while (locked.load()) {
            // 로컬 캐시에서 스핀
        }

        // 2단계: TAS 시도
        if (!locked.exchange(true)) {
            return;  // 성공
        }
    }
}
```

먼저 **읽기만** 해서 잠금 상태를 확인. 풀린 것 같을 때만 TAS 시도.

**장점**: 대부분의 스핀이 로컬 캐시에서 발생 → 버스 트래픽 감소

---

## Fetch-and-Add (FAA)

값을 읽고 더한 후 이전 값을 반환.

### 의미론

```cpp
// 의사 코드 (실제로는 원자적)
int fetch_and_add(int* target, int delta) {
    int old = *target;      // Read
    *target = old + delta;  // Modify + Write
    return old;             // 이전 값 반환
}
```

### C++ 사용

```cpp
std::atomic<int> counter{0};

int old_value = counter.fetch_add(1);  // old_value = 0, counter = 1
int new_value = counter.fetch_add(5);  // new_value = 1, counter = 6
```

### 티켓 락 (Ticket Lock)

FAA로 구현하는 공정한 락:

```cpp
class TicketLock {
private:
    std::atomic<int> next_ticket{0};  // 다음 번호표
    std::atomic<int> now_serving{0};  // 현재 서비스 중인 번호

public:
    void lock() {
        int my_ticket = next_ticket.fetch_add(1);  // 번호표 뽑기

        while (now_serving.load() != my_ticket) {
            // 내 차례가 아니면 대기
        }
    }

    void unlock() {
        now_serving.fetch_add(1);  // 다음 번호 호출
    }
};
```

**장점**:
- FIFO 공정성 보장
- Bakery 알고리즘과 유사하지만 훨씬 효율적

**단점**:
- 여전히 스핀 (바쁜 대기)
- 캐시라인 공유 문제 (`now_serving` 경쟁)

---

## Compare-and-Swap (CAS)

가장 강력하고 범용적인 RMW 연산.

### 의미론

```cpp
// 의사 코드 (실제로는 원자적)
bool compare_and_swap(int* target, int expected, int desired) {
    if (*target == expected) {
        *target = desired;
        return true;   // 성공
    }
    return false;      // 실패
}
```

- `*target`이 `expected`와 같으면 `desired`로 변경
- 다르면 아무것도 하지 않음
- 성공/실패를 반환

### C++ 사용

```cpp
std::atomic<int> value{10};

int expected = 10;
bool success = value.compare_exchange_strong(expected, 20);
// success = true, value = 20

expected = 10;
success = value.compare_exchange_strong(expected, 30);
// success = false, value = 20, expected = 20 (현재 값으로 업데이트)
```

### CAS 기반 락

```cpp
class CASLock {
private:
    std::atomic<bool> locked{false};

public:
    void lock() {
        bool expected = false;
        while (!locked.compare_exchange_weak(expected, true)) {
            expected = false;  // 실패 시 expected가 변경되므로 리셋
        }
    }

    void unlock() {
        locked.store(false);
    }
};
```

### CAS의 진정한 힘: Lock-free 자료구조

CAS는 **락 없이** 동시성 자료구조를 구현할 수 있게 한다.

```cpp
// Lock-free 스택 push (개념)
void push(Node* new_node) {
    while (true) {
        Node* old_top = top.load();
        new_node->next = old_top;

        if (top.compare_exchange_weak(old_top, new_node)) {
            return;  // 성공
        }
        // 실패하면 다시 시도
    }
}
```

다음 글에서 CAS를 자세히 다룬다.

---

## 연산 비교

| 연산 | 읽기 | 쓰기 | 조건 | 반환 |
|-----|-----|-----|-----|-----|
| Load | ✓ | | | 값 |
| Store | | ✓ | | |
| Exchange (TAS) | ✓ | ✓ | | 이전 값 |
| Fetch-and-Add | ✓ | ✓ | | 이전 값 |
| Compare-and-Swap | ✓ | 조건부 | 값 비교 | 성공/실패 |

---

## 하드웨어 지원

### x86

| 연산 | x86 명령어 |
|-----|----------|
| Exchange | `XCHG` |
| Fetch-and-Add | `LOCK XADD` |
| Compare-and-Swap | `LOCK CMPXCHG` |

`LOCK` 접두어: 버스 락 또는 캐시 락으로 원자성 보장

### ARM

| 연산 | ARM 명령어 |
|-----|----------|
| Load-Link | `LDREX` / `LDXR` |
| Store-Conditional | `STREX` / `STXR` |
| Exchange | `SWP` (deprecated) / LL/SC |

ARM은 **LL/SC (Load-Link/Store-Conditional)** 패턴 사용:
- `LDREX`: 값을 읽고 "예약"
- `STREX`: 예약이 유효하면 쓰기, 아니면 실패

### LL/SC vs CAS

```cpp
// CAS 의미론
if (*addr == expected) {
    *addr = desired;
    return true;
}
return false;

// LL/SC 의미론
tmp = load_linked(addr);     // 읽고 예약
if (tmp == expected) {
    if (store_conditional(addr, desired)) {  // 예약 유효하면 쓰기
        return true;
    }
}
return false;
```

LL/SC는 **ABA 문제**에 더 강하다 (다음 글에서 설명).

---

## 성능 고려사항

### 원자적 연산의 비용

원자적 연산은 **일반 연산보다 느리다**:

| 연산 | 대략적 비용 (cycles) |
|-----|-------------------|
| 일반 메모리 접근 | 1-4 |
| L1 캐시 원자적 연산 | 10-20 |
| 캐시라인 경쟁 시 | 50-200+ |

### 경쟁의 영향

```
스레드 1개: fetch_add 약 15 cycles
스레드 2개: fetch_add 약 50 cycles (캐시 무효화)
스레드 8개: fetch_add 약 200+ cycles (버스 포화)
```

**경쟁이 많을수록** 원자적 연산이 느려진다.

### 최적화 전략

1. **경쟁 줄이기**: 공유 변수 최소화
2. **배치 처리**: 여러 업데이트를 묶어서 한 번에
3. **파티셔닝**: 스레드별 로컬 카운터 → 주기적 병합
4. **락-프리 vs 락**: 항상 락-프리가 빠르진 않다

---

## C++ `std::atomic` 인터페이스

```cpp
#include <atomic>

std::atomic<int> x{0};

// 기본 연산
x.store(10);              // 쓰기
int v = x.load();         // 읽기
int old = x.exchange(20); // TAS

// 산술 연산
x.fetch_add(1);           // x++ 원자적
x.fetch_sub(1);           // x-- 원자적
x.fetch_and(mask);        // x &= mask
x.fetch_or(mask);         // x |= mask
x.fetch_xor(mask);        // x ^= mask

// CAS
int expected = 10;
x.compare_exchange_strong(expected, 20);
x.compare_exchange_weak(expected, 20);  // 가짜 실패 가능
```

### `compare_exchange_weak` vs `strong`

- **`weak`**: 가짜 실패(spurious failure) 가능. 루프에서 사용.
- **`strong`**: 실패하면 진짜 값이 다른 것. 단일 시도에 적합.

LL/SC 아키텍처에서 `weak`가 더 효율적일 수 있다.

---

## 핵심 요약

| 연산 | 용도 | 특성 |
|-----|-----|-----|
| Test-and-Set | 단순 락 | 불공정, 간단 |
| Fetch-and-Add | 카운터, 티켓 락 | 공정 락 가능 |
| Compare-and-Swap | 범용, lock-free | 가장 강력 |

---

## 연습 문제

1. **TAS vs TTAS**: 8-스레드 환경에서 TAS 락과 TTAS 락의 성능을 비교하라.

2. **티켓 락 구현**: FAA로 티켓 락을 구현하고 TTAS 락과 비교하라.

3. **원자적 최대값**: CAS로 `atomic_max(addr, value)` 함수를 구현하라.

4. **경쟁 측정**: 1, 2, 4, 8 스레드에서 `fetch_add` 처리량을 측정하라.

---

다음 글: [Part 2-05: Compare-and-Swap (CAS)](/blog/parallel/parallel-principles/part2-05-compare-and-swap)
