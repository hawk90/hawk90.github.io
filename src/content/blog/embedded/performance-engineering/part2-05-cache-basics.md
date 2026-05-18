---
title: "2-05: Cache 기초 — L1·L2·L3·Set Associative·Replacement Policy"
date: 2026-05-13T12:00:00
description: "Cache hierarchy. Direct mapped vs N-way set associative. LRU·PLRU·Random."
series: "Embedded Performance Engineering"
seriesOrder: 13
tags: [cache, l1, l2, l3, set-associative]
draft: true
---

## 한 줄 요약

> **"Cache = locality 활용"** — 자주 쓰는 데이터를 *코어 가까이*.

## Memory Hierarchy

| 레벨 | 접근 시간 | 크기 (Cortex-A72) | 위치 |
|---|---|---|---|
| **Register** | 0 cycle | 32 × 32-bit | CPU 내부 |
| **L1 Cache** | 3-4 cycle | I:48KB + D:32KB | CPU core 옆 |
| **L2 Cache** | 10-15 cycle | 1MB shared (4-core) | Cluster |
| **L3 Cache** (있다면) | 30-50 cycle | 4-8MB | SoC 공유 |
| **DRAM** | 100-300 cycle | GB | external |

매 단계 *10배 느려짐, 10배 커짐*.

## L1 — Split I/D (Harvard)

- **L1 I-cache** — 명령 전용 (read-only, no write-back)
- **L1 D-cache** — 데이터 (read + write)

```text
        ┌──── CPU Core ────┐
        │                  │
        │   ┌───────────┐  │
        │   │   L1 I    │  │ → instruction fetch
        │   └───────────┘  │
        │   ┌───────────┐  │
        │   │   L1 D    │  │ → load/store
        │   └───────────┘  │
        └─────────┬────────┘
                  ↓
              [L2 Cache]
```

동시 fetch + load/store 가능 — *structural hazard* 회피.

## L2/L3 — Unified

L2 이상은 instruction/data 통합. *Inclusive vs Exclusive*:

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

CPU가 *1 byte 읽어도* 전체 line fetch — *spatial locality* 활용.

```c
int arr[1024];
arr[0];   // 64 byte line fetch: arr[0]~arr[15] 캐시 입력
arr[1];   // ← 같은 line, hit!
arr[16];  // ← 다른 line, miss
```

## Direct Mapped Cache

```text
Address bits:
   [Tag] [Index] [Offset]
    20    8       6        (64 KB cache, 64 byte line)
```

각 메모리 주소 → *유일한 cache line*에만 들어감.

```text
addr 0x1000 → line 64
addr 0x5000 → line 64 (conflict! evict 0x1000)
addr 0x9000 → line 64 (conflict!)
```

Conflict miss 빈번 — 단순 hardware, 그러나 hit rate 낮음.

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

Hit rate ↑, hardware complexity ↑.

## Fully Associative

모든 cache line이 *임의 데이터* 보유 가능. Translation Lookaside Buffer (TLB)의 작은 부분이 fully associative.

```text
Lookup: compare tag with ALL entries — 비싸지만 conflict 0
```

용량 작을 때만 (8-32 entry).

## Replacement Policy

### LRU (Least Recently Used)

각 way의 *access 시간*을 timestamp 저장. Eviction 시 *가장 오래된 것* 폐기.

```text
Way: 0  1  2  3
Time: 5 8  3  10   → 다음 miss 시 way 2 (가장 오래된) 폐기
```

4-way 정도까지 정확 구현, 그 이상은 비쌈.

### Pseudo-LRU (PLRU) — 표준

Binary tree 형태 — *log N* bit으로 근사.

```text
4-way PLRU (3 bits):
       [root: 0/1]
        /        \
   [0/1]         [0/1]
   /    \        /    \
 way 0  way 1  way 2  way 3
```

각 노드의 bit가 *마지막 access의 반대 방향*을 가리킴 → eviction은 *그 방향 따라* 내려감.

근사적이지만 *간단·빠름*. ARM Cortex-A53 = PLRU.

### Random

진짜 random 또는 round-robin. **WCET 예측 가능** — 자동차 인증 자주 사용 (예측 어려운 LRU 회피).

## Write Policy

### Write-Through

```text
Write → cache + memory 둘 다 즉시 업데이트
```

장점 — coherence 단순. 단점 — write traffic 큼.

### Write-Back

```text
Write → cache만 (dirty bit set)
Eviction or flush → memory 업데이트
```

장점 — write traffic 적음. 단점 — DMA·SMP coherence 복잡.

ARM L1 D-cache — write-back, write-allocate.

### Write-Allocate vs No-Write-Allocate

```c
*ptr = 42;   // write miss
```

- **Write-allocate** — miss 시 line fetch + write into cache
- **No-write-allocate** — miss 시 cache 안 거치고 memory 직행

Streaming write (한 번 쓰고 안 읽음)엔 *no-write-allocate*가 효율.

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

DMA 사용 시 *cache maintenance* 필수 — `SCB_CleanDCache_by_Addr` / `SCB_InvalidateDCache_by_Addr`.

## TCM (Tightly Coupled Memory)

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[4096];
__attribute__((section(".itcm"))) void critical_isr(void) { ... }
```

Cache miss 없는 *결정성 메모리*. Cortex-M7·R52 등에 32-256 KB 내장. 자동차·항공기 critical loop에 사용.

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

→ SoA (Structure of Arrays) 또는 *value만 별도 array*.

> ⚠️ Stride access

```c
for (j = 0; j < W; j++)
    for (i = 0; i < H; i++)
        sum += matrix[i][j];   // ← column-major access
                               // 매 access cache miss
```

→ row-major (`matrix[i][j]` 안쪽 loop이 `j`).

> ⚠️ DMA 후 cache invalidate 안 함

```c
HAL_UART_Receive_DMA(&huart, buf, len);
// DMA 끝났는데
printf("%s", buf);   // ← cache가 옛 데이터 보여줌
```

`SCB_InvalidateDCache_by_Addr(buf, len);` 필요.

> ⚠️ Cache 활성화 후 Variable alignment

DMA buffer는 *cache line aligned*여야 — 32-byte align 권장.

```c
__attribute__((aligned(32))) uint8_t dma_buf[256];
```

## 정리

- Hierarchy — L1 split (I+D) → L2/L3 unified → DRAM.
- Cache line **64 byte** (Cortex-A), **32 byte** (Cortex-M7).
- **N-way set associative** — Cortex-A 4-16 way.
- Replacement = LRU·**PLRU**·Random (WCET용).
- Write-back + write-allocate가 표준.
- Cortex-M7 cache + DMA = *cache maintenance* 필수.

다음 편은 **Cache Miss 분석** — 3C model.

## 관련 항목

- [2-04: Speculative Execution](/blog/embedded/performance-engineering/part2-04-speculative-execution)
- [2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [2-07: Cache Line 최적화](/blog/embedded/performance-engineering/part2-07-cache-line)
