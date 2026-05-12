---
title: "메모리 모델 기초"
date: 2026-05-12
description: "왜 volatile이 안 되는가? 순차 일관성과 하드웨어 메모리 모델. 컴파일러와 CPU의 재배치. C++ 메모리 모델 입문."
series: "Parallel Programming Principles"
seriesOrder: 16
tags: [parallel, concurrency, memory-model, sequential-consistency, memory-ordering, barrier]
type: tech
---

## 믿을 수 없는 현실

다음 코드를 보자:

```cpp
int x = 0, y = 0;
int r1, r2;

// 스레드 1
void thread1() {
    x = 1;
    r1 = y;
}

// 스레드 2
void thread2() {
    y = 1;
    r2 = x;
}
```

실행 후 가능한 결과는?

**직관적 답**: `(r1, r2)` = `(0, 1)`, `(1, 0)`, `(1, 1)` 중 하나

- `(0, 1)`: 스레드 1이 먼저 완료
- `(1, 0)`: 스레드 2가 먼저 완료
- `(1, 1)`: 교차 실행

**실제 가능한 결과**: `(0, 0)` **도 가능하다!**

어떻게 가능한가? 두 스레드가 모두 쓰기 전에 읽기를 실행?

---

## 재배치 (Reordering)

### 컴파일러 재배치

컴파일러는 **성능 최적화**를 위해 명령어 순서를 바꿀 수 있다.

```cpp
// 원본 코드
x = 1;
r1 = y;

// 컴파일러가 재배치할 수 있음
r1 = y;  // y를 먼저 읽기
x = 1;
```

**왜?** 단일 스레드 관점에서는 의미가 같다. `x`와 `y`가 독립적이면 순서 무관.

### CPU 재배치

CPU도 명령어를 **Out-of-Order** 실행한다.

```cpp
// 프로그램 순서
store x, 1
load r1, y

// CPU가 실행하는 순서 (Store-Load 재배치)
load r1, y   // 로드가 스토어보다 빠르면 먼저
store x, 1
```

**왜?** 스토어는 캐시/메모리 지연이 크다. 로드를 먼저 실행하면 전체적으로 빠르다.

### 재배치 종류

| 재배치 | 의미 | x86 | ARM |
|--------|------|-----|-----|
| Load-Load | 읽기 순서 변경 | X | O |
| Load-Store | 읽기 후 쓰기 변경 | X | O |
| Store-Load | 쓰기 후 읽기 변경 | O | O |
| Store-Store | 쓰기 순서 변경 | X | O |

**x86은 비교적 "강한" 모델** (Store-Load만 재배치)
**ARM은 "약한" 모델** (거의 모든 재배치 가능)

---

## 순차 일관성 (Sequential Consistency)

### 정의

> 모든 스레드가 **동일한 전역 순서**로 모든 연산을 본다.
> 각 스레드의 연산은 **프로그램 순서**를 유지한다.

Leslie Lamport의 정의 (1979):

> "the result of any execution is the same as if the operations of all the processors were executed in some sequential order, and the operations of each individual processor appear in this sequence in the order specified by its program."

### SC가 보장되면

```cpp
// SC 가정 하에:
// 스레드 1
x = 1;    // (A)
r1 = y;   // (B)

// 스레드 2
y = 1;    // (C)
r2 = x;   // (D)

// 가능한 전역 순서:
// A B C D: r1=0, r2=1
// A C B D: r1=1, r2=1
// A C D B: r1=1, r2=1
// C A B D: r1=1, r2=1
// C A D B: r1=1, r2=1
// C D A B: r1=1, r2=0

// (0, 0)은 불가능!
// A가 B보다 먼저, C가 D보다 먼저이므로
// r1=0이면 B가 C보다 먼저 → D 시점에 x=1 → r2=1
// r2=0이면 D가 A보다 먼저 → B 시점에 y=1 → r1=1
```

### SC의 문제

**SC는 느리다.**

SC를 보장하려면 모든 메모리 연산에 **동기화 비용**이 발생한다.

현대 CPU는 SC를 **기본 제공하지 않는다**. 성능이 너무 떨어지기 때문.

---

## 하드웨어 메모리 모델

### x86: Total Store Order (TSO)

x86은 **TSO**를 제공한다.

```
규칙:
1. 스토어는 스토어 순서 유지
2. 로드는 로드 순서 유지
3. 로드는 이전 스토어보다 먼저 실행 가능 (Store-Load 재배치)
4. 각 CPU는 자신의 스토어를 즉시 본다
```

**Store Buffer**가 원인:

```
CPU ─→ [Store Buffer] ─→ Cache ─→ Memory
         ↑
    스토어가 여기서 대기
    (다른 CPU는 아직 못 봄)
```

로드는 Store Buffer를 건너뛰어 캐시에서 바로 읽을 수 있다.

### ARM/RISC-V: Relaxed Memory Model

ARM은 훨씬 **약한(relaxed)** 모델:

```
거의 모든 재배치 허용:
- Load-Load 재배치
- Load-Store 재배치
- Store-Load 재배치
- Store-Store 재배치

단, 데이터 의존성은 유지:
x = *p;    // p를 먼저 읽어야
y = *x;    // x를 읽을 수 있음
```

**왜 이렇게 약한가?** 성능과 에너지 효율을 위해.

---

## 메모리 배리어 (Memory Barrier)

재배치를 막는 **펜스(fence)** 명령어.

### 배리어 종류

| 배리어 | 효과 |
|--------|------|
| **LoadLoad** | 이전 로드가 완료될 때까지 이후 로드 대기 |
| **StoreStore** | 이전 스토어가 완료될 때까지 이후 스토어 대기 |
| **LoadStore** | 이전 로드가 완료될 때까지 이후 스토어 대기 |
| **StoreLoad** | 이전 스토어가 완료될 때까지 이후 로드 대기 |
| **Full** | 모든 재배치 방지 |

### x86 배리어

```asm
; x86에서는 Store-Load만 막으면 됨
mfence      ; Full barrier
sfence      ; StoreStore (사실상 필요 없음)
lfence      ; LoadLoad (사실상 필요 없음)
```

### ARM 배리어

```asm
; ARM은 다양한 배리어 필요
dmb ish     ; Full barrier (inner shareable)
dmb ishld   ; Load barrier
dmb ishst   ; Store barrier
```

---

## C++ 메모리 모델

C++11부터 **언어 수준의 메모리 모델**을 제공한다.

### memory_order 옵션

```cpp
enum memory_order {
    memory_order_relaxed,   // 순서 보장 없음
    memory_order_consume,   // 데이터 의존성만
    memory_order_acquire,   // 이후 연산이 앞으로 못 감
    memory_order_release,   // 이전 연산이 뒤로 못 감
    memory_order_acq_rel,   // acquire + release
    memory_order_seq_cst    // 순차 일관성 (기본값)
};
```

### seq_cst (기본값)

```cpp
std::atomic<int> x{0}, y{0};

// 스레드 1
x.store(1, std::memory_order_seq_cst);
int r1 = y.load(std::memory_order_seq_cst);

// 스레드 2
y.store(1, std::memory_order_seq_cst);
int r2 = x.load(std::memory_order_seq_cst);

// (0, 0)은 불가능 - SC 보장
```

**가장 안전하지만 가장 느림.**

### relaxed

```cpp
std::atomic<int> counter{0};

// 여러 스레드에서
counter.fetch_add(1, std::memory_order_relaxed);

// 최종 값은 정확하지만, 중간 관찰 순서는 보장 안 됨
```

**순서 보장 없음. 원자성만 보장.**

카운터처럼 순서가 중요하지 않을 때 사용.

### acquire / release

**동기화 쌍**으로 사용:

```cpp
std::atomic<bool> ready{false};
int data = 0;

// 스레드 1 (Producer)
data = 42;                                    // (A)
ready.store(true, std::memory_order_release); // (B) - release

// 스레드 2 (Consumer)
while (!ready.load(std::memory_order_acquire)) {}  // (C) - acquire
int r = data;                                      // (D)

// 보장: (A)는 (B) 전에 완료
//       (C)가 true를 보면 (A)도 보임
//       따라서 r = 42 보장
```

**원리**:
- **release**: "이전의 모든 쓰기가 완료됨"을 보장
- **acquire**: "release의 쓰기를 볼 수 있음"을 보장

### acquire-release 동기화

```
스레드 1                    스레드 2
─────────                  ─────────
data = 42        ─┐
                  │ happens-before
release ─────────┴────────→ acquire
                             │
                             └─→ read data (42 보장)
```

---

## 실전 예제: 플래그 동기화

### 잘못된 코드

```cpp
bool ready = false;  // 일반 변수
int data = 0;

// Producer
data = 42;
ready = true;  // 재배치 가능!

// Consumer
while (!ready) {}
use(data);     // data가 42가 아닐 수 있음!
```

### 올바른 코드

```cpp
std::atomic<bool> ready{false};
int data = 0;

// Producer
data = 42;
ready.store(true, std::memory_order_release);

// Consumer
while (!ready.load(std::memory_order_acquire)) {}
use(data);  // data = 42 보장
```

---

## volatile은 왜 안 되는가?

C++에서 `volatile`은 **메모리 동기화가 아니다**.

```cpp
volatile int flag = 0;
int data = 0;

// Producer
data = 42;
flag = 1;

// Consumer
while (flag == 0) {}
use(data);  // data가 42가 아닐 수 있음!
```

`volatile`이 보장하는 것:
- 컴파일러가 변수 접근을 최적화하지 않음
- 매번 메모리에서 읽음

`volatile`이 보장하지 **않는** 것:
- 다른 변수와의 순서
- CPU 재배치 방지
- 다른 스레드에 대한 가시성

**Java의 volatile**은 다르다: acquire-release 의미론을 포함.

---

## 핵심 요약

| 개념 | 설명 |
|-----|------|
| 재배치 | 컴파일러/CPU가 순서 변경 |
| 순차 일관성 | 전역 순서 존재, 느림 |
| TSO | x86 모델, Store-Load 재배치만 |
| Relaxed | ARM 모델, 대부분 재배치 가능 |
| 배리어 | 재배치 방지 명령 |
| seq_cst | 가장 안전, 가장 느림 |
| acquire/release | 동기화 쌍, 성능과 안전 균형 |
| relaxed | 순서 무관할 때, 가장 빠름 |

---

## memory_order 선택 가이드

```
"순서가 중요한가?"
    ├─ 아니오 → relaxed
    └─ 예 → "다른 스레드와 동기화가 필요한가?"
              ├─ 아니오 → relaxed (단일 변수 내 순서)
              └─ 예 → "Producer-Consumer 패턴?"
                        ├─ 예 → acquire/release
                        └─ 아니오 → "확실하지 않으면"
                                     └─ seq_cst (안전)
```

---

## 연습 문제

1. **Store-Load 재배치 확인**: x86에서 mfence 유무에 따른 결과 차이를 실험하라.

2. **ARM 시뮬레이션**: ARM 에뮬레이터에서 relaxed memory 동작을 확인하라.

3. **acquire/release 구현**: acquire-release로 간단한 스핀락을 구현하라.

4. **relaxed 카운터**: relaxed로 구현한 카운터의 정확성을 검증하라.

---

다음 글: [Part 2-07: Acquire-Release 의미론](/blog/parallel/parallel-principles/part2-07-acquire-release)
