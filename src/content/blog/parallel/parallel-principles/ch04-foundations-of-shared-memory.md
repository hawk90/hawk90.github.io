---
title: "Chapter 4: Foundations of Shared Memory"
date: 2026-05-06T04:00:00
description: "공유 메모리의 기초 — 레지스터의 정확성 정의. Safe, Regular, Atomic. SRSW에서 MRMW까지."
series: "The Art of Multiprocessor Programming"
seriesOrder: 4
tags: [parallel, concurrency, book-review, amp, register, atomic, safe, regular, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 4 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 들어가며 — 공유 메모리가 왜 그렇게 까다로운가

도서관의 책장을 떠올려 보자. 한 사람이 책을 꽂는 동안 다른 사람이 그 자리에서 책을 꺼낸다. 꽂는 손과 꺼내는 손이 *같은 순간*에 같은 책에 닿는다. 이 사람이 본 책은 무엇인가. 꽂히기 전의 책인가, 꽂히는 중간의 무엇인가, 꽂힌 다음의 책인가.

공유 메모리도 똑같다. 한 스레드가 변수에 값을 쓰는 *동안* 다른 스레드가 그 변수를 읽는다. 두 동작이 시간적으로 겹친다. 이때 무엇이 반환되는가 — 답은 "메모리가 어떤 종류인가"에 달려 있다.

이 챕터의 핵심은 세 가지 책장을 구분하는 일이다.

- **Safe register는 무질서한 책장이다.** 누가 책을 꽂는 동안 다른 사람이 같은 자리에 손을 뻗으면, 그 사람은 *책장 안의 어떤 책*이라도 손에 쥘 수 있다. 꽂힐 책도, 꽂히기 전의 책도, 심지어 그 자리에 *한 번도 없던 책*까지 — 단지 책장의 합법적 책 목록 안에만 있으면 된다. 다만 누구도 책을 꽂지 않는 순간에 손을 뻗으면 마지막으로 꽂힌 책을 정확히 얻는다.
- **Regular register는 조금 더 정돈된 책장이다.** 꽂는 중에 손을 뻗어도, 꽂히기 직전의 책 또는 꽂히는 중인 새 책 둘 중 하나만 손에 들어온다. 그 사이의 "정체불명의 책"은 절대 나오지 않는다. 다만 두 사람이 *연속해서* 손을 뻗었을 때, 앞사람은 새 책을 봤는데 뒷사람은 옛 책을 다시 보는 일은 일어날 수 있다.
- **Atomic register는 가장 잘 정돈된 책장이다.** 꽂는 동작이 *순간적*이다. 책이 어느 한 시점에 "갑자기" 자리에 들어가고, 그 이전엔 옛 책이 100% 보이고, 그 이후엔 새 책이 100% 보인다. 한 번 새 책을 본 사람은 그 다음에 옛 책으로 돌아갈 일이 없다.

그리고 한 가지 더 — 책장이 여러 칸일 때 *한 순간의 모든 칸 상태*를 일관되게 보고 싶다면 어떻게 해야 하는가. 군중 사진을 찍는 일과 같다. 모두가 *같은 한 순간*에 정지해 있어야 그 사진이 일관된 한 장이 된다. 이것이 **Atomic snapshot**이다.

이 세 책장과 한 장의 군중 사진 — 이 챕터의 전부다. 추상적인 정의 아래에는 실제 하드웨어의 까다로움이 깔려 있다. 약한 책장(safe)에서 강한 책장(atomic)을 만들어 내는 알고리즘이 존재한다는 사실이 이 챕터의 가장 우아한 결과 중 하나다.

## 4.1 무엇이 "메모리"인가

지금까지 우리는 공유 메모리를 당연한 것처럼 사용했다. 4장은 그 가정을 해체한다.

**핵심 질문**: 하드웨어 차원에서 "읽기"와 "쓰기"는 어떻게 동작하는가?

![Two threads concurrently writing and reading: what does read return?](/images/blog/parallel-principles/diagrams/ch04-concurrent-read-write.svg)

답은 단순하지 않다. 동시 접근 시 **무엇을 보장하느냐**에 따라 여러 종류의 메모리가 존재한다.

## 4.2 레지스터의 정확성 계층

Herlihy와 Shavit는 메모리의 정확성을 세 단계로 정의한다.

세 단계는 **읽기와 쓰기가 시간적으로 겹칠 때** 어떤 값이 허용되는지를 점점 좁혀 가는 정의다. 정의의 차이는 "겹침"(overlap)을 어떻게 다루느냐에 있다.

```text
시간 ──────────────────────────────►
  W:   [─── write(v) ───]
  R:              [─── read() → ? ───]
                  ↑ overlap
```

`R`이 `W`와 겹치는 한 호출이라면, 반환 가능한 값의 집합이 클래스마다 다르다.

### Safe Register

가장 약한 보장.

```
경합이 없을 때 (no concurrent write): 가장 마지막 쓴 값을 반환
경합이 있을 때 (concurrent with write): 어떤 값이든 반환 가능 (legal value 안에서)
```

읽기가 쓰기와 겹치면 **임의의 합법값**이 반환될 수 있다. 1-bit safe register에서 현재 0이 적혀 있고 누가 1을 쓰는 중이라면, 읽기는 0이든 1이든 무엇이든 반환할 수 있다. 심지어 "직전에 결코 쓰지 않은 값"도 — 단지 도메인 안에 있기만 하면 — 합법이다.

이 약함이 직관에 반하지만 의의가 있다. 실제 하드웨어 셀이 비트를 flip하는 도중에 transient한 값을 노출할 수 있는 상황을 모델링한다. 그럼에도 *겹치지 않는* 읽기는 항상 마지막 쓰기를 반영한다 — 이게 safe의 최소 보장이다.

### Regular Register

조금 더 강한 보장.

```
경합이 없을 때: 가장 마지막 쓴 값을 반환
경합이 있을 때: 직전에 쓴 값 또는 현재 쓰는 값 중 하나
```

읽기가 쓰기와 겹쳐도 **이전 값 또는 새 값** 둘 중 하나만 가능하다 — 그 사이의 "가짜 값"은 안 나온다. Regular는 safe보다 강하지만 atomic보다는 약하다. 그 차이는 다음 시나리오에서 드러난다.

```text
시간 ──────────────────────────────────────────►
  W:    [── write(1) ──]
  R1:      [── read → 1 ──]   ← 새 값을 봤다
  R2:           [── read → 0 ──]  ← 옛 값을 다시 본다 (regular는 허용)
```

직렬적으로 보면 비논리적이다. 그러나 regular의 정의는 *각 읽기*가 독립적으로 "이전/현재" 중 하나를 받으면 충분하다고 본다. 두 읽기 사이의 **단조성**(monotonicity)은 요구하지 않는다.

![Writer가 write(1) 진행 중 Reader가 새 값을 본 뒤 옛 값을 다시 보는 것이 허용](/images/blog/parallel-principles/diagrams/ch04-read-after-write.svg)

### Atomic Register

가장 강한 보장 — Linearizable Register라고도 부른다 (3장의 linearizability).

모든 작업이 *마치 어떤 순서로 instant하게 일어난 것처럼* 동작한다. 한 번 새 값을 봤다면, 그 이후의 읽기는 *새 값 또는 더 새 값만* 반환한다.

직관적으로 우리가 보통 "메모리"라고 부르는 것에 가장 가깝다. Atomic은 regular의 모든 보장에 더해 **단조성**을 강제한다.

**세 보장의 관계:**

- safe   ⊂ regular ⊂ atomic
- (포함 방향 — atomic은 더 좁은 행위 집합)

따라서 atomic register는 safe이고 regular이지만, 그 역은 거짓이다.

## 4.3 SRSW / MRSW / MRMW

레지스터에 접근하는 스레드의 수도 분류 기준이다.

| 약어 | 의미 | 제약 |
|---|---|---|
| **SRSW** | Single-Reader, Single-Writer | 한 스레드만 읽고, 한 스레드만 쓴다 |
| **MRSW** | Multi-Reader, Single-Writer | 여러 스레드가 읽고, 한 스레드만 쓴다 |
| **MRMW** | Multi-Reader, Multi-Writer | 여러 스레드가 읽고 쓴다 |

세 분류 × 세 정확성 = 9가지 레지스터 유형.

가장 강한 — **MRMW Atomic** — 이 우리가 흔히 가정하는 "공유 변수"다.

## 4.4 약한 것에서 강한 것으로

이 책의 가장 우아한 결과 중 하나 — **약한 레지스터로 강한 레지스터를 만들 수 있다**.

```
SRSW Safe → SRSW Regular → SRSW Atomic
            ↓
       MRSW Regular → MRSW Atomic
                      ↓
                  MRMW Atomic
```

각 단계마다 정확한 알고리즘이 존재한다. 그 알고리즘들은 **약한 레지스터만 사용해서** 강한 레지스터를 시뮬레이션한다.

### SRSW Safe → SRSW Regular (Bit 단위)

1-bit safe register를 1-bit regular register로 만든다.

```cpp
// C++20: Safe → Regular 변환 (개념적)
#include <atomic>

class RegularBit {
    std::atomic<bool> bits{false};  // safe register 역할
    bool last_written{false};

public:
    void write(bool v) {
        if (v != last_written) {
            bits.store(v, std::memory_order_relaxed);
            last_written = v;
        }
    }

    bool read() {
        return bits.load(std::memory_order_relaxed);
    }
};
```

```c
// C11: Safe → Regular 변환 (개념적)
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    _Atomic bool bits;       // safe register 역할
    bool last_written;       // writer만 접근
} RegularBit;

void regular_bit_init(RegularBit* r) {
    atomic_init(&r->bits, false);
    r->last_written = false;
}

void regular_bit_write(RegularBit* r, bool v) {
    if (v != r->last_written) {
        atomic_store_explicit(&r->bits, v, memory_order_relaxed);
        r->last_written = v;
    }
}

bool regular_bit_read(RegularBit* r) {
    return atomic_load_explicit(&r->bits, memory_order_relaxed);
}
```

**핵심 아이디어** — 같은 값을 두 번 쓰지 않는다. 그러면 safe 레지스터의 "임의 값 반환" 동작이 regular의 "이전/현재 값" 동작이 된다 (두 값이 같으니 항상 옳다).

이 변환을 책에서는 **Construction 4.1**로 부른다. 정확성 논증의 골자는 다음과 같다.

**case A — 읽기와 쓰기가 겹치지 않음:**

- safe 정의에 의해 마지막 값을 반환. OK.

**case B — 읽기와 쓰기가 겹침, 그러나 새 값 == 옛 값:**

- write가 실제로 bit를 건드리지 않음 (skip).
- safe register의 "concurrent" 모드 자체가 발동 안 함.
- → 마지막 값 = 새 값 = 옛 값, 셋 다 동일. OK.

**case C — 읽기와 쓰기가 겹침, 새 값 ≠ 옛 값:**

- safe register는 0 또는 1을 반환.
- 둘 중 무엇이 반환되어도 "옛 값 또는 새 값" 정의에 부합. OK.

이렇게 safe 한 레지스터로 regular을 만든다 — 추가 비용은 writer 측의 비교 한 번뿐.

### SRSW Boolean → SRSW Multi-Valued Regular

다음 단계는 단일 비트 regular register를 M-진 값 register로 끌어올리는 것이다 — 책의 **Construction 4.3**.

핵심은 **단조 인코딩**(monotonic encoding). 값 v를 M-비트 unary 표현으로 저장한다 — 처음 v개 비트가 1, 나머지가 0.

```text
값 0:  0 0 0 0 0
값 1:  1 0 0 0 0
값 2:  1 1 0 0 0
값 3:  1 1 1 0 0
값 4:  1 1 1 1 0
```

writer는 새 값 v를 쓰기 위해 다음을 수행한다.

**write(v):**

- # 인덱스 v-1까지 1을 채우거나, v 이상의 1을 0으로 지운다

**if v > current:**

- for i in (current..v-1): bits[i].write(1)

**else:**

- for i in (v..current-1): bits[i].write(0)
- current = v

reader는 가장 왼쪽의 0의 인덱스를 찾는다 — 그것이 곧 값.

**read():**


**for i in 0..M-1:**

- if bits[i].read() == 0: return i
- return M

겹치는 동안 reader가 보는 단조성이 핵심이다. writer가 비트를 한 방향으로만 갱신하므로, reader가 본 0/1 패턴이 비록 부분적으로 옛값 + 부분적으로 새값이어도, 그것이 **합법적인 중간 인코딩** 중 하나에 해당한다. 따라서 반환값은 옛 값 ≤ v_returned ≤ 새 값 사이의 어떤 값 — regular의 정의를 만족한다.

### MRSW Boolean Regular → MRMW Boolean Atomic

여러 writer를 허용하려면 누구의 쓰기가 "마지막"인지를 정해야 한다. 책의 해법은 **timestamp + Bakery 스타일 우선순위**다.

각 writer i는 자기 슬롯 reg[i]에 (value, timestamp)를 쓴다.
read는 모든 슬롯을 collect하여 가장 큰 timestamp를 선택한다.
writer는 자기 timestamp를 정하기 전에 모든 슬롯을 한 번 읽어
최대값 + 1을 자기 timestamp로 쓴다.

이게 4장 후반에서 다루는 **timestamp-based MRMW atomic register** 구성의 골격이다. 각 writer가 자기 전용 MRSW slot에 쓰고, reader는 모든 slot을 모아 최신을 고른다. timestamp 동률은 writer id로 깨면 (i, ts)의 lexicographic 순서로 전순서가 보장된다.

이 모든 단계가 합쳐지면 — `1-bit SRSW safe`만 출발점으로 줘도 `M-valued MRMW atomic`까지 완전히 만들 수 있다. 책의 가장 우아한 결과 중 하나다.

## 4.5 Atomic Snapshot

여러 레지스터의 값을 **한 번에 일관되게** 읽는 문제.

```
레지스터 [r1, r2, r3]
한 스레드가 [r1=1, r2=2, r3=3]를 보고 싶다 (어느 순간의 일관된 상태)
```

다른 스레드들이 동시에 쓴다면 — 한 번에 못 읽는다. r1을 읽는 동안 r2가 바뀌고, r2를 읽는 동안 r3가 바뀐다.

### 단순 시도 — 두 번 읽기

```cpp
// C++20: 단순 스냅샷 (Lock-free, Wait-free 아님)
#include <atomic>
#include <vector>
#include <optional>

template <typename T, size_t N>
class SimpleSnapshot {
    std::atomic<T> registers[N]{};

public:
    std::optional<std::vector<T>> snapshot() {
        while (true) {
            std::vector<T> s1(N), s2(N);

            for (size_t i = 0; i < N; ++i) {
                s1[i] = registers[i].load(std::memory_order_acquire);
            }
            for (size_t i = 0; i < N; ++i) {
                s2[i] = registers[i].load(std::memory_order_acquire);
            }

            if (s1 == s2) {
                return s1;  // 일관된 상태
            }
            // 다시 시도
        }
    }

    void update(size_t idx, T value) {
        registers[idx].store(value, std::memory_order_release);
    }
};
```

```c
// C11: 단순 스냅샷 (Lock-free, Wait-free 아님)
#include <stdatomic.h>
#include <stdbool.h>
#include <string.h>

#define MAX_REGISTERS 16

typedef struct {
    _Atomic int registers[MAX_REGISTERS];
    size_t size;
} SimpleSnapshot;

void snapshot_init(SimpleSnapshot* s, size_t size) {
    s->size = size;
    for (size_t i = 0; i < size; ++i) {
        atomic_init(&s->registers[i], 0);
    }
}

bool snapshot_try(SimpleSnapshot* s, int* result) {
    int s1[MAX_REGISTERS], s2[MAX_REGISTERS];

    for (size_t i = 0; i < s->size; ++i) {
        s1[i] = atomic_load_explicit(&s->registers[i], memory_order_acquire);
    }
    for (size_t i = 0; i < s->size; ++i) {
        s2[i] = atomic_load_explicit(&s->registers[i], memory_order_acquire);
    }

    if (memcmp(s1, s2, s->size * sizeof(int)) == 0) {
        memcpy(result, s1, s->size * sizeof(int));
        return true;  // 일관된 상태
    }
    return false;  // 다시 시도 필요
}

void snapshot_update(SimpleSnapshot* s, size_t idx, int value) {
    atomic_store_explicit(&s->registers[idx], value, memory_order_release);
}
```

두 번 읽었을 때 같으면, 그 사이에 변경이 없었다는 뜻 — 일관된 상태로 받아들인다.

**문제** — 다른 스레드가 자주 쓰면 무한히 재시도한다. **wait-free 아님**.

### Wait-Free Atomic Snapshot

각 쓰기에 **timestamp + 자신의 snapshot**을 함께 저장한다.

```cpp
// C++20: Wait-free Atomic Snapshot (개념적 구현)
#include <atomic>
#include <vector>
#include <memory>

template <typename T, size_t N>
class WaitFreeSnapshot {
    struct StampedValue {
        T value;
        uint64_t timestamp;
        std::vector<T> snap;  // 자신의 스냅샷

        StampedValue() : value{}, timestamp{0}, snap(N) {}
        StampedValue(T v, uint64_t ts, std::vector<T> s)
            : value(v), timestamp(ts), snap(std::move(s)) {}
    };

    std::atomic<std::shared_ptr<StampedValue>> registers[N];

    std::vector<T> collect() {
        std::vector<T> result(N);
        for (size_t i = 0; i < N; ++i) {
            auto p = registers[i].load(std::memory_order_acquire);
            result[i] = p->value;
        }
        return result;
    }

public:
    WaitFreeSnapshot() {
        for (size_t i = 0; i < N; ++i) {
            registers[i].store(std::make_shared<StampedValue>(),
                              std::memory_order_release);
        }
    }

    void update(size_t me, T value) {
        auto my_snapshot = snapshot();
        auto old = registers[me].load(std::memory_order_acquire);
        auto new_val = std::make_shared<StampedValue>(
            value, old->timestamp + 1, my_snapshot);
        registers[me].store(new_val, std::memory_order_release);
    }

    std::vector<T> snapshot() {
        std::vector<std::shared_ptr<StampedValue>> moved(N, nullptr);

        while (true) {
            std::vector<std::shared_ptr<StampedValue>> a1(N), a2(N);

            for (size_t i = 0; i < N; ++i) {
                a1[i] = registers[i].load(std::memory_order_acquire);
            }
            for (size_t i = 0; i < N; ++i) {
                a2[i] = registers[i].load(std::memory_order_acquire);
            }

            bool clean = true;
            for (size_t i = 0; i < N; ++i) {
                if (a1[i]->timestamp != a2[i]->timestamp) {
                    clean = false;
                    if (moved[i] != nullptr &&
                        moved[i]->timestamp != a2[i]->timestamp) {
                        // 스레드 i가 두 번 움직임 — 그의 스냅샷 사용
                        return a2[i]->snap;
                    }
                    moved[i] = a2[i];
                }
            }

            if (clean) {
                std::vector<T> result(N);
                for (size_t i = 0; i < N; ++i) {
                    result[i] = a1[i]->value;
                }
                return result;
            }
        }
    }
};
```

다른 스레드가 두 번 쓰는 동안 자신의 snapshot이 완료되지 못했다면 — 그 다른 스레드가 가진 snapshot이 자신이 원하는 시간 구간을 포괄하므로 그것을 빌려 쓸 수 있다.

**핵심 통찰** — 두 번의 쓰기 사이에 한 번의 snapshot이 끼어 있으므로, 두 번째 쓰기의 snapshot은 사용 가능.

### Wait-Free 증명 스케치

알고리즘이 wait-free임을 보이려면 **유한 횟수 안에 종료**됨을 증명해야 한다.

**정의:**

- clean double-collect = 두 번의 collect가 동일한 (value, timestamp) 결과를 냄.
- moved 스레드 = 한 스레드의 timestamp가 두 collect 사이에 바뀌었음.

**관찰:**

- 실패는 항상 어떤 스레드 j가 moved 되었기 때문이다.
- j가 처음 moved되었을 때는 단순히 다시 시도한다.
- j가 두 번째 moved될 때는 j 자신이 그 사이에 update를 완료했으므로
- j의 슬롯 안에 *j의 최근 snapshot*이 들어 있다.

이 j의 snapshot은 (j의 두 update 사이에 완료된 시점 ≥ 우리 snapshot의 시작 시점)이므로, 우리 snapshot 호출의 *linearization point*로 받아쓸 수 있다.

**경계 분석:**

- N개의 스레드. 각 스레드는 우리 collect 동안 최대 2번까지만 moved될 수 있음
- (두 번째 moved에서 즉시 그의 snapshot을 차용).
- 따라서 collect 시도는 최대 2N + 1 번.
- 매 collect는 O(N) — 모든 슬롯을 한 번씩.
- 총 비용: O(N²) — wait-free.

이게 책의 **Lemma 4.14** 흐름이다 — "어떤 collect 끝에서든 N개의 스레드 모두에 대해 moved 카운트가 2 미만이면 직접 일관된 결과, 아니면 차용된 snapshot이 존재한다."

## 4.6 C++/C Memory Order와의 대응

이 챕터의 이론적 분류가 실제 언어의 memory order와 어떻게 대응되는지 살펴보자.

```cpp
// C++20: Memory Order별 레지스터 특성
#include <atomic>

std::atomic<int> x;

// Relaxed — Safe/Regular 수준에 가까움
void relaxed_example() {
    x.store(1, std::memory_order_relaxed);   // 순서 보장 없음
    int r = x.load(std::memory_order_relaxed);  // 원자성만 보장
}

// Acquire-Release — 동기화 관계 형성
void acq_rel_example() {
    x.store(1, std::memory_order_release);   // 이전 연산 publish
    int r = x.load(std::memory_order_acquire);  // 동기화 수신
}

// Sequential Consistency — Atomic Register
void seq_cst_example() {
    x.store(1, std::memory_order_seq_cst);   // 전역 순서 보장
    int r = x.load(std::memory_order_seq_cst);  // Linearizable
}
```

```c
// C11: Memory Order별 레지스터 특성
#include <stdatomic.h>

_Atomic int x;

// Relaxed — Safe/Regular 수준에 가까움
void relaxed_example(void) {
    atomic_store_explicit(&x, 1, memory_order_relaxed);
    int r = atomic_load_explicit(&x, memory_order_relaxed);
}

// Acquire-Release — 동기화 관계 형성
void acq_rel_example(void) {
    atomic_store_explicit(&x, 1, memory_order_release);
    int r = atomic_load_explicit(&x, memory_order_acquire);
}

// Sequential Consistency — Atomic Register
void seq_cst_example(void) {
    atomic_store_explicit(&x, 1, memory_order_seq_cst);
    int r = atomic_load_explicit(&x, memory_order_seq_cst);
}
```

| 이론적 분류 | C++20/C11 Memory Order | 보장 |
|-----------|------------------------|-----|
| Safe Register | `memory_order_relaxed` (부분적) | 원자성만 |
| Regular Register | `memory_order_relaxed` ~ `acquire/release` | 이전/현재 값 |
| Atomic Register | `memory_order_seq_cst` | Linearizable |

## 4.7 왜 이런 이론이 필요한가

이 챕터의 메시지는 한 줄로 정리된다.

> 우리가 흔히 가정하는 "공유 메모리"는 사실 매우 강한 추상화다. 그것이 어떻게 약한 하드웨어로부터 만들어지는지를 이해해야 한다.

실전에서 마주치는 것들.

- **약한 메모리 모델** (ARM, RISC-V): 하드웨어가 atomic 보장을 안 줌
- **memory barriers**: 약한 모델 위에서 atomic 효과를 얻는 도구
- **lock-free 알고리즘**: 정확성 증명에 이 챕터의 정의들이 등장

C++의 `memory_order_relaxed`는 safe / regular 수준에 가깝다. `memory_order_seq_cst`가 atomic. 그 차이가 정확히 이 챕터의 분류다.

## 4.8 시스템 사례 — 책장의 모습

지금까지 본 세 책장은 종이 위의 정의다. 실제 시스템에서 이 정의들이 어떤 모습으로 나타나는지 본다.

### x86 TSO — 거의 잘 정돈된 책장

x86 CPU의 메모리 모델은 **TSO**(Total Store Order)라 부른다. 책장에 비유하면, 꽂는 동작이 *거의 순간적*이지만 한 가지 예외가 있다.

```text
스레드 A:   write x = 1
            read y  → 0  ?

스레드 B:   write y = 1
            read x  → 0  ?
```

직관적으로는 두 read 중 적어도 하나는 1을 봐야 할 듯하다. 그러나 x86에서 둘 다 0이 나올 수 있다. 이유는 **store buffer** — 꽂는 동작이 책장에 도달하기 전에 손에 잠시 머문다. 다른 사람의 시각에서는 아직 꽂히지 않은 책이다.

```text
A의 store buffer:  [x=1 대기 중]
B의 store buffer:  [y=1 대기 중]
공유 책장:         x=0, y=0

A.read(y) → 책장의 y를 봄 → 0
B.read(x) → 책장의 x를 봄 → 0
```

이 효과 하나를 빼면 x86은 atomic register에 매우 가깝다. 같은 변수에 대한 read/write 순서는 보장된다. 다른 변수 간의 read 다음 write 재배치만 일어난다.

x86에서 이 store buffer 효과를 막으려면 `MFENCE` 명령 또는 `LOCK` 접두사를 쓴다. C++의 `memory_order_seq_cst` store는 x86에서 보통 `MOV` + `MFENCE` (또는 `XCHG`)로 컴파일된다.

### ARM weak memory — 매우 무질서한 책장

ARM과 RISC-V의 메모리 모델은 훨씬 약하다. 책장에 비유하면, 꽂는 동작과 꺼내는 동작이 거의 자유롭게 *재배치*된다. 같은 스레드 안의 두 write조차 다른 스레드 시각에서는 거꾸로 보일 수 있다.

```text
스레드 A:           스레드 B의 시각에서:
  store x = 1         x = 0  여전히
  store y = 1         y = 1
                      x = 1  뒤늦게
```

A는 분명 x를 먼저 썼는데, B는 y를 먼저 본다. ARM 입장에선 합법적이다.

이 모델 위에서 atomic register를 만들려면 명시적 barrier가 필요하다.

| ARM 명령 | 역할 |
|---|---|
| `DMB ISH` | data memory barrier — 이전 메모리 연산이 다음보다 먼저 보임 |
| `DSB` | 더 강한 barrier — 명령 완료까지 대기 |
| `LDAR` / `STLR` | load-acquire / store-release — 페어로 동기화 관계 형성 |
| `LDAXR` / `STLXR` | exclusive load/store — LL/SC, atomic RMW의 토대 |

C++의 `memory_order_acquire` load는 ARMv8에서 `LDAR`로, `memory_order_release` store는 `STLR`로 컴파일된다. `memory_order_seq_cst`는 추가 `DMB ISH`가 붙거나, `LDAR`/`STLR`만으로도 일부 경우 처리된다.

**같은 코드, 다른 아키텍처:**

- C++:   x.store(1, memory_order_seq_cst);
- x86:   MOV [x], 1  +  MFENCE
- ARMv8: STLR W0, [x]
- RISC-V: FENCE rw, w  +  SW x0, x  +  FENCE w, rw

### Lock-free hashing — 책장 여러 칸의 군중 사진

실전에서 atomic snapshot이 가장 자주 필요한 곳이 **lock-free hash table** 리사이즈다. 테이블을 두 배로 키울 때, 기존 버킷의 모든 키-값 쌍을 새 테이블로 옮긴다. 이 동안에도 다른 스레드는 lookup / insert를 계속한다.

테이블 리사이즈 도중의 상태 — *동시에 옮기는 중*. `old_table = [k1, k3, k5, ...]`. 일부 키만 옮겨진 `new_table = [k1, k3, ?, ...]` — 일부는 옮겨졌고 일부는 아직.

lookup 스레드는 어느 테이블을 봐야 하는가. 둘 다 봐야 한다. 그러나 *언제 어떤 테이블이 권위 있는가*를 일관되게 결정해야 한다.

Cliff Click의 **NonBlockingHashMap** 같은 구현은 각 버킷에 상태 비트를 두고, 옮기는 동작이 진행되는 동안 *transition 상태*를 lock-free로 표현한다. 본질적으로 4장의 atomic snapshot 사고방식을 적용한다 — 두 번 읽어서 일관성 검증, 옮긴 스레드의 도움을 빌리는 helping 메커니즘.

Java의 `ConcurrentHashMap` (JDK 8+)도 이 패턴을 쓴다. resize 중에 lookup 하는 스레드가 *forwarding node*를 만나면 새 테이블로 점프한다. forwarding node 자체가 "이 버킷은 이미 옮겨졌다"는 atomic snapshot의 한 슬라이스다.

### 정리 — 정의와 하드웨어 사이

| 이론 | 실제 하드웨어 | 메커니즘 |
|---|---|---|
| Safe register | 정렬 안 된 word 접근 | tear 가능, 단조성 없음 |
| Regular register | aligned word write (x86) | store buffer로 일부 재배치 |
| Atomic register | `LOCK`이 붙은 RMW (x86) | bus lock 또는 cache line lock |
| Atomic snapshot | 두 번 collect + helping | timestamp + announce array |

세 책장의 정의는 단순했지만, 그것을 실제 실리콘 위에서 보장하기 위해 CPU 설계자가 들이는 노력은 막대하다.

## 정리

- 메모리는 **단일 개념이 아니다** — Safe / Regular / Atomic의 정확성 계층
- 접근 패턴 — **SRSW / MRSW / MRMW**
- **약한 것에서 강한 것으로** 만들 수 있다 — 알고리즘으로
- **Atomic Snapshot** — 여러 레지스터의 일관된 읽기, wait-free 버전 존재
- 실제 메모리 모델, lock-free 알고리즘의 정확성 증명의 토대

## 한국 개발자의 함정

**1. *volatile은 atomic*이라는 오해**

- C: volatile은 *컴파일러 최적화 회피*만
- C++: std::atomic이 atomic
- C11: _Atomic이 atomic

**2. *read / write는 자동으로 안전*하다는 착각**

- 8 byte 이상 변수는 안전 보장 없음
- x86은 word-aligned 8B까지 atomic
- ARM은 더 제한적

**3. *Memory barrier 없이도 작동*하는 듯한 코드**

- Tested OK, but undefined behavior
- 다른 CPU / 컴파일러에서 깨질 수 있음

**4. *memory_order_relaxed면 성능 최적*이라는 착각**

- 정확성 먼저, 성능은 그 다음
- 대부분의 경우 seq_cst로 시작하고 필요시 최적화

## 실무 적용

**이론 → 실무:**

- Safe register   → byte 단위 plain write
- Regular register → C++ memory_order_relaxed
- Atomic register  → C++ memory_order_seq_cst
- Atomic snapshot  → 동시성 자료구조 디버깅 도구

**Modern CPU 메모리 모델:**

- x86/x64: TSO (Total Store Order) — 비교적 강함
- ARM / RISC-V: Relaxed — 약함, 명시적 barrier 필요
- POWER: 매우 약함

**C++20/23 atomic:**

- std::atomic<T>::load(order)
- std::atomic<T>::store(value, order)
- std::atomic<T>::exchange(value, order)
- std::atomic<T>::compare_exchange_strong/weak()

**C11 atomic:**

- atomic_load_explicit(&var, order)
- atomic_store_explicit(&var, value, order)
- atomic_exchange_explicit(&var, value, order)
- atomic_compare_exchange_strong/weak_explicit()

## 자기 점검

- [ ] Safe / Regular / Atomic 차이 명시?
- [ ] SRSW / MRSW / MRMW 표기 이해?
- [ ] 약한 register에서 강한 register 만드는 방법?
- [ ] Atomic snapshot의 의미와 wait-free 가능성?
- [ ] Modern CPU 메모리 모델 (TSO, ARM) 차이?
- [ ] C++20/C11 memory_order와의 대응?

## 다음 장 예고

다음 장은 동기화 프리미티브의 **계산 능력 비교** — Consensus 문제로 위계를 정의한다.

## 관련 항목

- [Ch 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects) — Linearizability
- [Ch 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion)
- [Ch 5: Relative Power of Synchronization](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
- [C++ Concurrency in Action Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
