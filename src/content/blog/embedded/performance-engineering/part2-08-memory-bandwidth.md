---
title: "메모리 대역폭 분석 — STREAM·Roofline·Bus Saturation 측정"
slug: "embedded/performance-engineering/part2-08-memory-bandwidth"
date: 2026-04-24T09:07:00
description: "STREAM benchmark (Copy·Scale·Add·Triad). Roofline. PMU BUS_ACCESS · DDR bandwidth."
series: "Embedded Performance Engineering"
seriesOrder: 16
tags: [memory, bandwidth, stream, roofline]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> $\text{Bandwidth} = \text{bytes} / \text{second}$입니다. 대역폭이 saturation 상태에 이르면 CPU가 빠르지 않은 것이 아니라 메모리가 발목을 잡습니다.

## STREAM Benchmark — 표준

John McCalpin이 1995년에 만든 STREAM이 표준입니다.

| Kernel | 동작 | bytes per element |
|---|---|---|
| **Copy** | `c[i] = a[i]` | 16 (8 read + 8 write) |
| **Scale** | `c[i] = k * a[i]` | 16 |
| **Add** | `c[i] = a[i] + b[i]` | 24 |
| **Triad** | `c[i] = a[i] + k * b[i]` | 24 |

```c
#define N 8000000
double a[N], b[N], c[N];

for (i = 0; i < N; i++) c[i] = a[i] + 3.0 * b[i];   // Triad
```

총 데이터는 `24 × N = 192 MB`입니다. Working set이 L3보다 크기 때문에 사실상 DRAM 대역폭을 측정합니다.

**실측 예 — Raspberry Pi 4 (LPDDR4-3200, 32-bit bus):**

- Copy·Scale·Add·Triad 결과는 보드, compiler, STREAM version, 배열 크기와 thread 수가 고정되지 않아 삭제합니다. 재현 가능한 benchmark 결과를 추가할 때는 해당 조건과 원자료를 함께 기록합니다.

이론 최대치는 데이터율 3200 MT/s와 32-bit(4-byte) bus 폭을 가정하면 `3200 × 4 byte = 12.8 GB/s`입니다. 1600 MT/s로 표기하는 경우 DDR의 두 전송/clock을 이미 반영하므로 다시 ×2 하지 않습니다. Raspberry Pi 4의 아래 throughput 값은 특정 board·OS·STREAM build·thread 설정의 측정치가 아니므로 대표 측정 결과로 인용하지 않습니다.

## 이론치와 실효 대역폭의 차이

실효 대역폭은 DRAM timing, access pattern, read/write 전환, refresh, memory controller 정책, 동시 bus master 등 여러 요인의 영향을 받습니다. 각 비용은 memory part와 controller 설정에 따라 달라지므로 데이터시트 및 측정으로 확인합니다.

이 주제는 Hennessy & Patterson의 *Bandwidth Limited or Latency Limited?* 논문이 잘 정리해 두었습니다.

## Roofline Model

![Roofline Model — Memory vs Compute Bound 판별](/images/blog/perf-eng/diagrams/part2-08-roofline.svg)

- 알고리즘의 *arithmetic intensity* (FLOPS / memory byte)를 계산합니다.
- intensity가 ridge point보다 낮으면 memory-bound, 높으면 compute-bound입니다.

```c
// float32 vector add: 1 FLOP / (2 × 4-byte read + 4-byte write) = 1/12 FLOP per byte → 보통 memory-bound
// Matrix multiply: 2 N^3 FLOP / 3 N^2 byte = O(N) intensity → compute bound (큰 N)
```

## ARM CCN — Coherent Mesh Network

Cortex-A SoC interconnect의 구조와 cluster 수는 구현·제품별입니다.

![ARM CCN — Coherent Mesh Network 구조](/images/blog/perf-eng/diagrams/part2-08-ccn-mesh.svg)

cache와 DRAM의 대역폭은 target과 access pattern에 따라 달라집니다. cache hit rate와 memory bandwidth를 함께 측정합니다.

## DRAM 측정 — perf event

```bash
# Generic Linux events are preferred when supported by the PMU driver
perf stat -e cycles,instructions,cache-misses ./prog

# Raw PMU events and BUS_ACCESS semantics are core/SoC-specific.
# A generic event count is not automatically a byte count; validate the
# vendor event definition and transaction width before converting to bytes/s.
```

Intel 플랫폼에서는 `pcm-memory`로 측정하고, `dmidecode -t memory`로 사양을 확인할 수 있습니다.

## STM32H7 — Memory Hierarchy

STM32H743에서 TCM, SRAM, Flash, FMC 외부 메모리의 지연과 대역폭은 part number, clock, voltage, wait-state와 cache/ART 설정을 포함한 target 조건으로 확인합니다. 이 글에서는 board 측정 없이 수치 사양을 단정하지 않습니다.

```c
__attribute__((section(".dtcm"))) float dtcm_buf[256];   // fastest
```

External SDRAM은 CPU와 DMA/display가 공유하는 bus의 병목이 될 수 있습니다. 실제 frame rate 영향은 target에서 측정합니다.

## Cortex-A72 + LPDDR4 — 모바일

Snapdragon 845 계열 SoC의 LPDDR 채널 수와 data rate는 실제 제품 구성에 따라 확인해야 합니다. STREAM 수치가 필요하면 특정 기기·버전·실행 조건을 명시한 1차 벤치마크 결과를 인용해야 합니다. 여기서는 확인 가능한 원출처가 없어 값을 제시하지 않습니다.

Display·decode·GPU·CPU traffic은 device 설계와 동시 workload에 따라 다르므로 출처 없는 고정 GB/s 값을 합산해 saturation을 판정하지 않습니다.

memory traffic과 thermal throttling의 인과관계는 해당 device 측정으로 확인합니다.

## 자동차·항공 LV — 메모리 구성

자동차·항공·위성 시스템의 메모리 종류와 용량은 platform, safety·radiation requirements와 product generation에 따라 다릅니다. system datasheet/reference manual을 확인합니다.

radiation-hardened 메모리의 용량·대역폭·가격은 제품·등급·구성에 따라 달라집니다. 원출처 제품 자료 없이 보편 수치를 제시하지 않습니다.

## NUMA — Multi-Socket

Linux 서버에서는 다음과 같이 NUMA 토폴로지를 확인합니다.

```bash
numactl --hardware
# node 0: CPUs 0-7, 64GB
# node 1: CPUs 8-15, 64GB
# inter-node bandwidth ~70% of local
```

```bash
numactl --cpunodebind=0 --membind=0 ./prog
```

CPU와 memory node를 함께 바인딩하면 local access를 유도할 수 있지만, 실제 throughput은 workload와 system topology를 측정해 확인합니다.

임베디드에서는 NUMA가 드물지만, AMP 시스템에서 비슷한 구조를 만나게 됩니다. CPU마다 별도의 SRAM 영역을 분리해 두는 식입니다.

## DMA로 CPU offload

CPU가 직접 memcpy를 수행하면 bandwidth와 CPU cycle을 동시에 소모합니다.

```c
HAL_DMA_Start(&hdma, src, dst, len);   // CPU 자유
```

특히 Cortex-M에서는 large buffer를 copy할 때 DMA를 우선 고려합니다.

DMA setup overhead와 CPU copy 비용의 break-even은 DMA engine, memory location, cache 상태와 driver에서 달라집니다. 대상에서 길이별로 측정합니다.

## Streaming Store — Cache 우회

```c
for (i = 0; i < N; i++) {
    dst[i] = compute(i);
    __builtin_nontemporal_store(value, &dst[i]);   // or
}
```

큰 stream write를 할 때 cache evict pressure를 피하는 용도입니다.

AArch64와 x86의 non-temporal store instruction은 architecture별 hint·ordering semantics가 다르며 서로 완전히 같은 동작으로 간주하지 않습니다.

## 자주 하는 실수

> ⚠️ "RAM이 크면 빠름" 오해

용량과 bandwidth는 다릅니다. 용량과 theoretical bandwidth는 서로 다른 사양입니다. module data rate 외에도 channel count, rank, timings와 controller 설정을 함께 확인합니다.

> ⚠️ Single-channel 사용

이론 최대 대역폭은 channel 수·data rate·bus width에 따라 달라지며 실제 throughput은 병렬성·timing·controller 설정의 영향을 받습니다.

채널 구성이 지원되는지와 실제 channel interleave 동작은 CPU·mainboard·DIMM 구성 문서에서 확인합니다.

> ⚠️ memcpy를 모두 같다고 가정

```c
memcpy(d, s, small_size);  // libc가 size별 구현을 선택할 수 있음
memcpy(d, s, large_size);  // CPU, DMA, copy engine을 대상에서 비교
```

libc `memcpy` 구현은 compiler/libc/target 별로 다릅니다. DMA와 CPU copy는 대상 memory와 transfer size에서 비교합니다.

> ⚠️ Bandwidth 측정 시 cache warm-up 안 함

```c
warmup_array(arr);   // 한 번 순회
start = now();
benchmark();         // 진짜 측정
```

Cold-cache와 warm-cache는 서로 다른 측정 질문에 답합니다. 측정 목적에 맞게 cache state를 통제·보고합니다.

## 정리

- STREAM은 bandwidth 표준 벤치마크입니다 (Copy/Scale/Add/Triad).
- 실측은 이론치의 25-50% 수준입니다.
- **Roofline model**로 memory bound와 compute bound를 판별합니다.
- PMU **BUS_ACCESS** 카운터로 측정합니다.
- 자동차·항공용 rad-hard SRAM은 일반 메모리보다 약 10배 비쌉니다.
- DMA와 non-temporal store로 cache pollution을 회피합니다.

다음 편에서는 **SIMD/NEON**을 다룹니다.

## 관련 항목

- [2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
- [2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
