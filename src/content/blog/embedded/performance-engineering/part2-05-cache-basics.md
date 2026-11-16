---
title: "CPU Cache 기초 — L1·L2·L3·Set Associative·Replacement Policy"
slug: "embedded/performance-engineering/part2-05-cache-basics"
date: 2026-04-24T09:04:00
description: "Cache hierarchy를 M2 Pro에서 latency 계단으로 재고, Cortex-A53·M7 TRM의 캐시 구성으로 direct mapped·set associative·교체 정책을 설명합니다."
series: "Embedded Performance Engineering"
seriesOrder: 13
tags: [cache, l1, l2, l3, set-associative]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Cache = locality 활용"**입니다. 자주 쓰는 데이터를 코어 가까이 둡니다.

## Memory Hierarchy — M2 Pro에서 재 보기

캐시 계층이 실제로 어떤 모양인지는 working set 크기를 바꿔 가며 load 하나의 latency를 재면 보입니다. M2 Pro에서 크기 S 바이트의 버퍼에 128 바이트(`sysctl hw.cachelinesize`)마다 포인터 하나를 두고, 무작위 순서로 이은 순환 리스트를 2천만 번 따라갔습니다. 각 load가 앞 load의 결과를 주소로 쓰므로 하나씩 기다리게 되고, 무작위 순서라 하드웨어 prefetcher가 다음 주소를 맞히기 어렵습니다(`bench/lat.c`, `clang -O2`, 2회).

| working set | 1회차 | 2회차 |
|---:|---:|---:|
| 8 KiB ~ 128 KiB | 0.90 ~ 0.94 ns | 0.90 ~ 0.94 ns |
| 256 KiB | 5.85 ns | 5.68 ns |
| 1 ~ 4 MiB | 6.14 ~ 6.57 ns | 5.91 ~ 6.16 ns |
| 8 MiB | 11.09 ns | 7.57 ns |
| 12 MiB | 22.93 ns | 18.62 ns |
| 16 MiB | 40.55 ns | 52.49 ns |
| 24 MiB | 48.83 ns | 117.42 ns |
| 32 MiB ~ 512 MiB | 107.94 ~ 122.38 ns | 122.02 ~ 135.17 ns |

계단이 세 개 보입니다. 128 KiB까지는 1 ns 안쪽이고, 이 크기는 `sysctl hw.perflevel0.l1dcachesize`가 보고하는 P코어 L1D 128 KiB와 같습니다. 256 KiB부터 4 MiB까지는 6 ns 근처의 두 번째 계단입니다. 32 MiB 이상은 120 ns 안팎으로, 2-04의 독립 사슬 측정에서 본 메모리 왕복 시간과 같습니다. 8~24 MiB 구간은 실행마다 값이 다르고, `hw.perflevel0.l2cachesize`가 보고하는 16 MiB보다 작은 8 MiB에서 이미 올라가기 시작합니다. 이 구간의 원인(L2를 다른 코어와 나눠 쓰는 것, TLB 등)은 이 측정으로 가려내지 않았습니다.

![L1/L2/L3/DRAM 메모리 hierarchy — 계층별 용량과 지연은 구현에 따라 달라진다](/images/blog/perf-eng/diagrams/part2-05-cache-hierarchy.svg)

## 임베디드 코어의 캐시 구성 — TRM 기준

| | Cortex-A53 (DDI 0500E) | Cortex-M7 (DDI 0489D) |
|---|---|---|
| L1 I-cache | 8/16/32/64 KB 중 구현 시 선택, 2-way, 64 B line (6.1) | 4~64 KB, 2-way, 32 B line (1.1.3, 3.3.4 표 3-7) |
| L1 D-cache | 8/16/32/64 KB 중 선택, 4-way, 64 B line (6.1) | 4~64 KB, 4-way, 32 B line (같은 절) |
| L1 교체 정책 | I·D 모두 pseudo-random (2.1.1, 2.1.6) | — |
| L2 | 선택 사항. 128 KB~2 MB, 16-way, 64 B line (2.1.7) | 없음 |
| TCM | — | I-TCM, D-TCM 각각 없음 또는 4 KB~16 MB(2의 거듭제곱) (1.1.3) |

M7의 line 크기는 CCSIDR의 `LineSize` 필드에서 나옵니다. M7 TRM 3.3.4는 이 필드가 "line의 word 수의 log2 − 2"로 인코딩되며 값 0x1이 8 word, 즉 32 byte라고 적습니다. A53의 L1 D-cache는 동시에 처리할 수 있는 miss가 3개라고 6.1절이 적습니다. 2-04의 M2 Pro 측정에서 독립 사슬 16개까지 겹쳐졌던 것과 비교하면, 같은 코드라도 A53에서는 겹칠 수 있는 miss가 훨씬 적습니다.

## L1 — Split I/D (Harvard)

- **L1 I-cache**: 명령 전용입니다.
- **L1 D-cache**: 데이터의 읽기와 쓰기를 맡습니다.

![L1 Split I/D Cache — fetch와 load/store 동시 처리](/images/blog/perf-eng/diagrams/part2-05-l1-split.svg)

명령 fetch와 load/store가 서로 다른 캐시를 쓰므로 같은 cycle에 함께 진행할 수 있습니다(2-02의 structural hazard). A53 TRM 6.1은 L1이 "separate instruction and data caches"로 이루어진다고 적습니다. 그 아래 L2(2.1.7)는 코어들이 함께 쓰는 선택 사항 캐시이고, SCU가 코어들의 L2 요청을 중재합니다.

## Inclusive와 Exclusive

| 정책 | 의미 |
|---|---|
| **Inclusive** | 위 계층(L1)에 있는 line은 아래 계층(L2)에도 있음 |
| **Exclusive** | 위 계층에 있는 line은 아래 계층에 없음 |
| **NINE** (Non-Inclusive Non-Exclusive) | 둘 중 어느 쪽도 보장하지 않음 |

inclusive는 아래 계층만 보고도 위 계층에 그 line이 있는지 알 수 있어 snoop 처리가 단순하고, exclusive는 두 계층의 용량을 겹치지 않게 씁니다. 코어마다 어느 쪽인지는 해당 TRM에서 확인합니다.

## Cache Line

CPU가 1 byte만 읽어도 line 전체를 가져옵니다. 그래서 가까운 주소를 연달아 읽으면 첫 접근만 miss가 납니다(spatial locality). A53에서는 64 byte, M7에서는 32 byte, M2 Pro는 `hw.cachelinesize`가 128 byte입니다.

```c
int arr[1024];
arr[0];   // 64 byte line이면 arr[0]~arr[15]가 함께 들어옴
arr[1];   // 같은 line → hit
arr[16];  // 다음 line → miss
```

Cortex-M4 코어에는 L1 캐시가 없습니다. M4 TRM(DDI 0439B) 2.2.1이 설명하는 코어 인터페이스는 ICode, DCode, System AHB-Lite 버스뿐입니다.

## Direct Mapped Cache

주소를 [Tag | Index | Offset]으로 나누고, Index가 정하는 단 하나의 line에만 데이터를 둡니다. 64 KiB, 64 byte line이라면 line이 1,024개이므로 Offset 6비트, Index 10비트, 32비트 주소의 나머지 16비트가 Tag입니다.

| 주소 | Index = (addr >> 6) & 0x3FF | 결과 |
|---|---:|---|
| 0x0000_1000 | 64 | line 64에 들어감 |
| 0x0001_1000 | 64 | 같은 line → 0x1000을 쫓아냄 |
| 0x0002_1000 | 64 | 또 같은 line |

주소 차이가 캐시 크기(64 KiB = 0x10000)의 배수이면 같은 line을 놓고 다툽니다. 이런 conflict miss는 2-06에서 측정합니다.

## N-Way Set Associative

Index로 set 하나를 고르고, 그 set 안의 N개 way 중 아무 곳에나 둡니다. 위 표의 세 주소도 4-way라면 같은 set의 서로 다른 way에 함께 들어갈 수 있습니다. A53의 L1D는 4-way, L2는 16-way, M7의 L1D는 4-way, L1I는 2-way입니다(위 표).

## Fully Associative

모든 entry가 어떤 주소든 담을 수 있어 conflict miss가 없지만, 찾을 때마다 모든 tag를 비교해야 합니다. 그래서 작은 구조에만 씁니다. A53 TRM 5.1에 따르면 A53 MMU의 명령·데이터 micro TLB가 각각 10-entry fully-associative이고, 그 뒤의 main TLB는 512-entry 4-way입니다.

## Replacement Policy

set이 가득 찼을 때 어느 way를 쫓아낼지 정합니다.

- **LRU (Least Recently Used)**: 가장 오래 안 쓴 way를 쫓아냅니다. way 수가 늘면 순서를 기록하는 비용이 커집니다.
- **Pseudo-LRU (PLRU)**: 4-way라면 3비트 tree로 "최근에 쓰지 않은 쪽"을 근사합니다. 각 노드의 bit가 최근 접근의 반대 방향을 가리키고, 교체할 때 그 방향을 따라 내려갑니다.
- **Random / Pseudo-random**: 무작위(또는 의사 무작위)로 고릅니다. 상태를 거의 두지 않습니다. Cortex-A53의 L1 I·D cache는 pseudo-random입니다(A53 TRM 2.1.1, 2.1.6).

## Write Policy

### Write-Through

write가 발생하면 cache와 memory를 둘 다 즉시 업데이트합니다. memory가 늘 최신이라 coherence가 단순한 대신 write traffic이 큽니다.

### Write-Back

write는 cache에만 하고 line에 dirty 표시를 합니다. 그 line이 쫓겨나거나 clean할 때 memory에 씁니다. write traffic은 적지만, DMA나 다른 코어가 memory를 직접 볼 때 아직 cache에만 있는 값을 놓칠 수 있어 maintenance가 필요합니다.

Cortex-M7은 두 정책을 모두 지원합니다. M7 TRM 3.3.4의 CCSIDR은 WT·WB·RA·WA 비트를 모두 1로 보고하고, MPU 속성으로 영역마다 정책을 고릅니다.

### Write-Allocate vs No-Write-Allocate

```c
*ptr = 42;   // write miss
```

- **Write-allocate**: miss 시 line을 먼저 가져온 뒤 cache에 씁니다.
- **No-write-allocate**: miss 시 cache를 거치지 않고 memory에 바로 씁니다.

한 번 쓰고 다시 읽지 않는 큰 버퍼를 write-allocate로 쓰면, 어차피 덮어쓸 line을 먼저 읽어 오느라 읽기 traffic이 더 생깁니다(1-07의 triad OI 0.167 대 0.125).

## Cortex-M Cache

Cortex-M4에는 코어 캐시가 없고, Cortex-M7은 L1 I·D 캐시를 각각 구성 선택으로 둡니다(M7 TRM 1.1.3). CMSIS `cachel1_armv7.h`에 켜기와 maintenance 함수가 있습니다.

```c
SCB_EnableICache();
SCB_EnableDCache();
```

DMA와 함께 쓸 때는 `SCB_CleanDCache_by_Addr()`(CPU가 쓴 내용을 memory로 내보냄)와 `SCB_InvalidateDCache_by_Addr()`(cache의 옛 내용을 버림)를 씁니다. CMSIS 주석에 따르면 invalidate는 32 byte로 정렬된 주소부터 32 byte 단위로 동작합니다.

## TCM (Tightly Coupled Memory)

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[4096];
__attribute__((section(".itcm"))) void critical_isr(void) { /* ... */ }
```

TCM은 캐시를 거치지 않고 코어에 직접 붙은 SRAM이라 hit·miss가 없습니다. Cortex-M7에서는 I-TCM과 D-TCM을 각각 없음 또는 4 KB~16 MB로 구성할 수 있고, D-TCM은 D0TCM·D1TCM 두 개로 나뉩니다(M7 TRM 1.1.3). `.dtcm`·`.itcm` section 이름은 링커 스크립트가 정하는 것이므로 프로젝트의 링커 스크립트에 맞춥니다.

## 측정 — Cache Miss Rate

```bash
perf stat -e l1d_cache,l1d_cache_refill,l2d_cache,l2d_cache_refill -- ./prog
```

A53 TRM 12.9 표 12-28에 0x04 `L1D_CACHE`(L1 data cache access), 0x03 `L1D_CACHE_REFILL`, 0x16 `L2D_CACHE`, 0x17 `L2D_CACHE_REFILL`이 있습니다. 이 시리즈의 게스트에는 PMU 카운터가 없어 실행하지 못했습니다(1-01). 캐시 동작을 소프트웨어로 시뮬레이션해 보는 방법은 2-06의 Cachegrind입니다.

## 자주 하는 실수

> ⚠️ 큰 구조체에서 필드 하나만 순회

```c
struct Big { int id; char name[60]; int value; };
for (i = 0; i < N; i++) sum += arr[i].value;
```

이 구조체는 M2 Pro clang에서 `sizeof`가 68 byte, `value`의 offset이 64입니다(`bench/big.c`). 4 byte를 쓰려고 원소마다 거의 한 line씩 가져오는 셈입니다. 자주 함께 쓰는 필드끼리 모으거나 `value`만 따로 배열로 빼냅니다(SoA). 2-07에서 측정합니다.

> ⚠️ Stride access

```c
for (j = 0; j < W; j++)
    for (i = 0; i < H; i++)
        sum += matrix[i][j];   // 안쪽 루프가 행을 건너뜀
```

C 배열은 row-major이므로 안쪽 루프에서 `i`가 바뀌면 매번 `W × sizeof(element)` byte씩 건너뜁니다. 안쪽 루프를 `j`로 바꿉니다. 2-06에서 측정합니다.

> ⚠️ DMA 후 cache invalidate 안 함

```c
HAL_UART_Receive_DMA(&huart, buf, len);
/* ... DMA 완료 후 */
SCB_InvalidateDCache_by_Addr(buf, len);   // 이게 없으면 cache의 옛 값을 읽을 수 있음
```

> ⚠️ DMA buffer를 cache line에 맞추지 않음

Cortex-M7의 line은 32 byte이고 invalidate도 32 byte 단위입니다. buffer가 다른 변수와 line을 나눠 쓰면, buffer를 invalidate할 때 같은 line의 다른 변수 값도 함께 버려집니다. 주소와 크기를 모두 32 byte에 맞춥니다.

```c
__attribute__((aligned(32))) uint8_t dma_buf[256];   /* 256은 32의 배수 */
```

## 정리

- M2 Pro에서 load latency는 128 KiB까지 0.9 ns, 4 MiB까지 6 ns, 32 MiB 이상 120 ns 안팎이었습니다. 계단의 위치가 sysctl이 보고하는 L1D 크기와 맞습니다.
- Cortex-A53은 L1 I 2-way, D 4-way, 64 B line, pseudo-random 교체, L2 16-way입니다. Cortex-M7은 L1 I 2-way, D 4-way, 32 B line입니다.
- Fully associative는 TLB처럼 작은 구조에만 씁니다(A53 micro TLB 10 entry).
- Cortex-M7에서 cache와 DMA를 함께 쓸 때는 32 byte 정렬과 clean·invalidate가 필요합니다.

다음 편은 **Cache Miss 분석**으로 3C model을 다룹니다.

## 관련 항목

- [2-04: Speculative Execution](/blog/embedded/performance-engineering/part2-04-speculative-execution)
- [2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [2-07: Cache Line 최적화](/blog/embedded/performance-engineering/part2-07-cache-line)

## 참고 자료

- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 2.1.1, 2.1.6, 2.1.7, 5.1, 6.1, 12.9
- Cortex-M7 Technical Reference Manual (DDI 0489D) 1.1.3, 3.3.4 표 3-7
- Cortex-M4 Technical Reference Manual (DDI 0439B) 2.2.1
- [CMSIS_5 `cachel1_armv7.h`](https://github.com/ARM-software/CMSIS_5/blob/develop/CMSIS/Core/Include/cachel1_armv7.h)
