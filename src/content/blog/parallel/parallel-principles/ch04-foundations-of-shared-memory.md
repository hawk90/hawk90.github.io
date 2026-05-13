---
title: "Chapter 4: Foundations of Shared Memory"
date: 2026-05-12
description: "공유 메모리의 기초 — 레지스터의 정확성 정의. Safe, Regular, Atomic. SRSW에서 MRMW까지."
series: "The Art of Multiprocessor Programming"
seriesOrder: 4
tags: [parallel, concurrency, book-review, amp, register, atomic, safe, regular]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 4 요약

## 4.1 무엇이 "메모리"인가

지금까지 우리는 공유 메모리를 당연한 것처럼 사용했다. 4장은 그 가정을 해체한다.

**핵심 질문**: 하드웨어 차원에서 "읽기"와 "쓰기"는 어떻게 동작하는가?

```
스레드 A: write(1) ──┐
                     │   ?
스레드 B: read() ────┘ → 무엇이 반환되나?
```

답은 단순하지 않다. 동시 접근 시 **무엇을 보장하느냐**에 따라 여러 종류의 메모리가 존재한다.

## 4.2 레지스터의 정확성 계층

Herlihy와 Shavit는 메모리의 정확성을 세 단계로 정의한다.

### Safe Register

가장 약한 보장.

```
경합이 없을 때 (no concurrent write): 가장 마지막 쓴 값을 반환
경합이 있을 때 (concurrent with write): 어떤 값이든 반환 가능 (legal value 안에서)
```

읽기가 쓰기와 겹치면 — **임의의 값**이 반환될 수 있다. 다만 그 값은 레지스터가 가질 수 있는 합법적 값이어야 한다.

**예**: 1-bit safe register에서 0이 쓰여 있는데, 누군가 1을 쓰는 동안 읽으면 0이든 1이든 반환 가능.

### Regular Register

조금 더 강한 보장.

```
경합이 없을 때: 가장 마지막 쓴 값을 반환
경합이 있을 때: 직전에 쓴 값 또는 현재 쓰는 값 중 하나
```

읽기가 쓰기와 겹쳐도 **"오래된 값"** 또는 **"새 값"** 중 하나는 보장된다 — 그 사이의 가짜 값은 안 나온다.

다만 **"새 값을 한 번 봤다가 다시 옛 값을 보는"** 현상은 허용된다.

```
시간 →
쓰기:  ─────────[ write 1 ]──────────
읽기 A:     ──[read]──         → 1 (새 값)
읽기 B:           ──[read]──   → 0 (옛 값, 가능)
```

### Atomic Register

가장 강한 보장 — Linearizable Register라고도 부른다 (3장의 linearizability).

```
모든 작업이 마치 어떤 순서로 instant하게 일어난 것처럼 동작
한 번 새 값을 봤다면, 그 이후의 읽기는 새 값 또는 더 새 값만 반환
```

직관적으로 우리가 보통 "메모리"라고 부르는 것에 가장 가깝다.

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

```
class RegularBit:
    bits = SafeBit()  # safe 레지스터
    last_written = 0
    
    def write(v):
        if v != last_written:
            bits.write(v)
            last_written = v
    
    def read():
        return bits.read()
```

**핵심 아이디어** — 같은 값을 두 번 쓰지 않는다. 그러면 safe 레지스터의 "임의 값 반환" 동작이 regular의 "이전/현재 값" 동작이 된다 (두 값이 같으니 항상 옳다).

### Multi-Bit 확장

여러 비트를 사용할 때는 더 복잡하다. 한 비트만 바뀌었는데 읽는 동안 그 비트만 다른 값으로 읽히면 — 전체 값이 의도와 다른 결과가 된다.

해법은 **단조 인코딩**(monotonic encoding) — 값이 한 방향으로만 변하는 인코딩.

```
값 0: 000
값 1: 001
값 2: 011
값 3: 111  (단조 증가)
```

이런 인코딩에서는 bit를 하나씩만 바꾸므로, 읽기와 쓰기가 겹쳐도 의도된 값들 중 하나가 반환된다.

## 4.5 Atomic Snapshot

여러 레지스터의 값을 **한 번에 일관되게** 읽는 문제.

```
레지스터 [r1, r2, r3]
한 스레드가 [r1=1, r2=2, r3=3]를 보고 싶다 (어느 순간의 일관된 상태)
```

다른 스레드들이 동시에 쓴다면 — 한 번에 못 읽는다. r1을 읽는 동안 r2가 바뀌고, r2를 읽는 동안 r3가 바뀐다.

### 단순 시도 — 두 번 읽기

```
def snapshot():
    while True:
        s1 = [r.read() for r in registers]
        s2 = [r.read() for r in registers]
        if s1 == s2:
            return s1
```

두 번 읽었을 때 같으면, 그 사이에 변경이 없었다는 뜻 — 일관된 상태로 받아들인다.

**문제** — 다른 스레드가 자주 쓰면 무한히 재시도한다. **wait-free 아님**.

### Wait-Free Atomic Snapshot

각 쓰기에 **timestamp + 자신의 snapshot**을 함께 저장한다.

```
class WaitFreeSnapshot:
    def update(value):
        my_snapshot = compute_snapshot()  # 자기 자신의 스냅샷
        registers[my_id].write(value, timestamp, my_snapshot)
    
    def snapshot():
        # 다른 스레드가 그 동안 두 번 쓴 게 보이면
        # → 그 스레드가 만든 snapshot을 그대로 사용
        ...
```

다른 스레드가 두 번 쓰는 동안 자신의 snapshot이 완료되지 못했다면 — 그 다른 스레드가 가진 snapshot이 자신이 원하는 시간 구간을 포괄하므로 그것을 빌려 쓸 수 있다.

**핵심 통찰** — 두 번의 쓰기 사이에 한 번의 snapshot이 끼어 있으므로, 두 번째 쓰기의 snapshot은 사용 가능.

## 4.6 왜 이런 이론이 필요한가

이 챕터의 메시지는 한 줄로 정리된다.

> 우리가 흔히 가정하는 "공유 메모리"는 사실 매우 강한 추상화다. 그것이 어떻게 약한 하드웨어로부터 만들어지는지를 이해해야 한다.

실전에서 마주치는 것들.

- **약한 메모리 모델** (ARM, RISC-V): 하드웨어가 atomic 보장을 안 줌
- **memory barriers**: 약한 모델 위에서 atomic 효과를 얻는 도구
- **lock-free 알고리즘**: 정확성 증명에 이 챕터의 정의들이 등장

C++의 `memory_order_relaxed`는 safe / regular 수준에 가깝다. `memory_order_seq_cst`가 atomic. 그 차이가 정확히 이 챕터의 분류다.

## 정리

- 메모리는 **단일 개념이 아니다** — Safe / Regular / Atomic의 정확성 계층
- 접근 패턴 — **SRSW / MRSW / MRMW**
- **약한 것에서 강한 것으로** 만들 수 있다 — 알고리즘으로
- **Atomic Snapshot** — 여러 레지스터의 일관된 읽기, wait-free 버전 존재
- 실제 메모리 모델, lock-free 알고리즘의 정확성 증명의 토대

## 다음 장 예고

다음 장은 동기화 프리미티브의 **계산 능력 비교** — Consensus 문제로 위계를 정의한다.

## 관련 항목

- [Ch 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects) — Linearizability
- [Ch 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion)
- [C++ Concurrency in Action Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
