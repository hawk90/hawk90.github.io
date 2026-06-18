---
title: "CPU Cache 기초 — L1·L2·L3·Set Associative·Replacement Policy"
date: 2026-04-24T09:04:00
description: "Cache hierarchy. Direct mapped vs N-way set associative. LRU·PLRU·Random."
series: "Embedded Performance Engineering"
seriesOrder: 13
tags: [cache, l1, l2, l3, set-associative]
draft: false
---

## 한 줄 요약

> **"Cache = locality 활용"**입니다. 자주 쓰는 데이터를 코어 가까이 둡니다.

## Memory Hierarchy

| 레벨 | 접근 시간 | 크기 (Cortex-A72) | 위치 |
|---|---|---|---|
| **Register** | 0 cycle | 32 × 32-bit | CPU 내부 |
| **L1 Cache** | 3-4 cycle | I:48KB + D:32KB | CPU core 옆 |
| **L2 Cache** | 10-15 cycle | 1MB shared (4-core) | Cluster |
| **L3 Cache** (있다면) | 30-50 cycle | 4-8MB | SoC 공유 |
| **DRAM** | 100-300 cycle | GB | external |

매 단계마다 약 10배 느려지고 10배 커집니다. 그림으로 보면 hierarchy의 폭과 latency가 한눈에 들어옵니다.

![L1/L2/L3/DRAM 메모리 hierarchy — 단계마다 약 10배 커지고 10배 느려진다](/images/blog/perf-eng/diagrams/part2-05-cache-hierarchy.svg)

## L1 — Split I/D (Harvard)

- **L1 I-cache** — 명령 전용 (read-only, no write-back)
- **L1 D-cache** — 데이터 (read + write)

![L1 Split I/D Cache — fetch와 load/store 동시 처리](/images/blog/perf-eng/diagrams/part2-05-l1-split.svg)

fetch와 load/store가 동시에 가능해 *structural hazard*를 회피합니다.

## L2/L3 — Unified

L2 이상은 instruction과 data를 통합합니다. Inclusive와 Exclusive로 나뉩니다.

| 정책 | 의미 | 사용처 |
|---|---|---|
| **Inclusive** | L1의 데이터는 L2에도 있음 | Intel (snoop 효율) |
| **Exclusive** | L1의 데이터는 L2에 없음 | ARM Cortex-A (용량 효율) |
| **NINE** (Non-Inclusive Non-Exclusive) | 가능하나 보장 안 함 | 최신 Intel L3 |

## Cache Line

```text
일반적 line size — 64 bytes (Cortex-A, x86)
                  32 bytes (Cortex-M7)
                   16 bytes (Cortex-M4 cache)
```

CPU가 1 byte만 읽어도 전체 line이 fetch되어 *spatial locality*를 활용합니다.

```c
int arr[1024];
arr[0];   // 64 byte line fetch: arr[0]~arr[15] 캐시 입력
arr[1];   // ← 같은 line, hit!
arr[16];  // ← 다른 line, miss
```

## Direct Mapped Cache

**Address bits:**

- [Tag] [Index] [Offset]
- 20    8       6        (64 KB cache, 64 byte line)

각 메모리 주소는 유일한 cache line에만 들어갑니다.

```text
addr 0x1000 → line 64
addr 0x5000 → line 64 (conflict! evict 0x1000)
addr 0x9000 → line 64 (conflict!)
```

Conflict miss가 빈번합니다. hardware는 단순하지만 hit rate가 낮습니다.

## N-Way Set Associative

```text
[Tag][Index][Offset]
Index → set (한 set에 N개 way)

Set 64:
   way 0: [tag=0x1, data=...]
   way 1: [tag=0x5, data=...]
   way 2: [tag=0x9, data=...]
   way 3: [tag=...]
```

Cortex-A72 L1 D = **4-way set associative**. Cortex-A72 L2 = **16-way**.

```text
addr 0x1000 hits set X way 0
addr 0x5000 hits set X way 1   ← coexist!
```

Hit rate가 올라가고 hardware complexity도 함께 올라갑니다.

## Fully Associative

모든 cache line이 임의 데이터를 보유할 수 있습니다. Translation Lookaside Buffer (TLB)의 작은 부분이 fully associative 구조로 되어 있습니다.

```text
Lookup: compare tag with ALL entries — 비싸지만 conflict 0
```

용량이 작을 때만 씁니다 (8-32 entry).

## Replacement Policy

### LRU (Least Recently Used)

각 way의 access 시간을 timestamp로 저장합니다. Eviction 시 가장 오래된 것을 폐기합니다.

```text
Way: 0  1  2  3
Time: 5 8  3  10   → 다음 miss 시 way 2 (가장 오래된) 폐기
```

4-way 정도까지는 정확하게 구현하지만 그 이상은 비용이 큽니다.

### Pseudo-LRU (PLRU) — 표준

Binary tree 형태로 *log N* bit으로 근사합니다.

```text
4-way PLRU (3 bits):
       [root: 0/1]
        /        \
   [0/1]         [0/1]
   /    \        /    \
 way 0  way 1  way 2  way 3
```

각 노드의 bit가 마지막 access의 반대 방향을 가리키며, eviction은 그 방향을 따라 내려갑니다.

근사적이지만 간단하고 빠릅니다. ARM Cortex-A53이 PLRU를 사용합니다.

### Random

진짜 random이거나 round-robin 방식입니다. **WCET 예측이 가능**해 자동차 인증에서 자주 사용합니다 (예측이 어려운 LRU를 회피).

## Write Policy

### Write-Through

```text
Write → cache + memory 둘 다 즉시 업데이트
```

장점은 coherence가 단순하다는 점입니다. 단점은 write traffic이 크다는 점입니다.

### Write-Back

```text
Write → cache만 (dirty bit set)
Eviction or flush → memory 업데이트
```

장점은 write traffic이 적다는 점입니다. 단점은 DMA·SMP coherence가 복잡하다는 점입니다.

ARM L1 D-cache는 write-back에 write-allocate 방식입니다.

### Write-Allocate vs No-Write-Allocate

```c
*ptr = 42;   // write miss
```

- **Write-allocate**: miss 시 line을 fetch하고 cache에 write
- **No-write-allocate**: miss 시 cache를 거치지 않고 memory에 직행

Streaming write(한 번 쓰고 다시 읽지 않는 패턴)에는 no-write-allocate가 효율적입니다.

## Cortex-M Cache

| MCU | Cache |
|---|---|
| Cortex-M0/M3/M4 | **없음** (TCM 또는 직접 flash 실행) |
| Cortex-M7 | L1 I + L1 D (선택적 enable) |
| Cortex-M33 | optional |
| Cortex-M55 | optional |

Cortex-M7 cache enable:

```c
SCB_EnableICache();
SCB_EnableDCache();
```

DMA 사용 시 cache maintenance가 필수입니다. `SCB_CleanDCache_by_Addr`나 `SCB_InvalidateDCache_by_Addr`를 사용합니다.

## TCM (Tightly Coupled Memory)

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[4096];
__attribute__((section(".itcm"))) void critical_isr(void) { ... }
```

Cache miss가 없는 결정성 메모리입니다. Cortex-M7·R52 등에 32-256 KB가 내장되어 있고 자동차·항공기 critical loop에 사용됩니다.

## 측정 — Cache Miss Rate

```bash
perf stat -e cache-references,cache-misses ./prog

# miss-rate = misses / references
# < 5% — 좋음
# 10-20% — 보통
# > 30% — 문제
```

PMU event:
- `L1D_CACHE` `L1D_CACHE_REFILL` (Cortex-A)
- `L1I_CACHE` `L1I_CACHE_REFILL`
- `L2D_CACHE` `L2D_CACHE_REFILL`

## 자주 하는 실수

> ⚠️ 큰 array 순회 시 cache line 무시

```c
struct Big { int id; char name[60]; int value; };
for (i = 0; i < N; i++) sum += arr[i].value;
// 64 byte struct → line당 1개 → memory bandwidth 낭비
```

→ SoA(Structure of Arrays)를 쓰거나 value만 별도 array로 빼내야 합니다.

> ⚠️ Stride access

```c
for (j = 0; j < W; j++)
    for (i = 0; i < H; i++)
        sum += matrix[i][j];   // ← column-major access
                               // 매 access cache miss
```

→ row-major 방식으로 안쪽 loop을 `j`로 두어야 합니다 (`matrix[i][j]`).

> ⚠️ DMA 후 cache invalidate 안 함

```c
HAL_UART_Receive_DMA(&huart, buf, len);
// DMA 끝났는데
printf("%s", buf);   // ← cache가 옛 데이터 보여줌
```

`SCB_InvalidateDCache_by_Addr(buf, len);` 호출이 필요합니다.

> ⚠️ Cache 활성화 후 Variable alignment

DMA buffer는 cache line aligned여야 하며 32-byte align을 권장합니다.

```c
__attribute__((aligned(32))) uint8_t dma_buf[256];
```

## 정리

- Hierarchy는 L1 split(I+D)에서 L2/L3 unified, DRAM 순으로 이어집니다.
- Cache line은 Cortex-A에서 **64 byte**, Cortex-M7에서 **32 byte**입니다.
- **N-way set associative**는 Cortex-A에서 4-16 way로 사용합니다.
- Replacement는 LRU, **PLRU**, Random(WCET용)으로 나뉩니다.
- Write-back + write-allocate가 표준입니다.
- Cortex-M7에서 cache와 DMA를 함께 쓸 때는 cache maintenance가 필수입니다.

다음 편은 **Cache Miss 분석**으로 3C model을 다룹니다.

## 관련 항목

- [2-04: Speculative Execution](/blog/embedded/performance-engineering/part2-04-speculative-execution)
- [2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [2-07: Cache Line 최적화](/blog/embedded/performance-engineering/part2-07-cache-line)
