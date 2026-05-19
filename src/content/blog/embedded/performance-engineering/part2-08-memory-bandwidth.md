---
title: "2-08: Memory Bandwidth — STREAM·Roofline·Bus Saturation"
date: 2026-05-08T15:00:00
description: "STREAM benchmark (Copy·Scale·Add·Triad). Roofline. PMU BUS_ACCESS · DDR bandwidth."
series: "Embedded Performance Engineering"
seriesOrder: 16
tags: [memory, bandwidth, stream, roofline]
draft: false
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

```text
실측 예 — Raspberry Pi 4 (LPDDR4-3200, 32-bit bus):
  Copy:   4.2 GB/s
  Scale:  3.8 GB/s
  Add:    3.5 GB/s
  Triad:  3.4 GB/s
```

이론치는 `3200 × 4 byte / 8 = 1600 MB/s × 2 = 12.8 GB/s`인데, 실측은 그중 25-30%만 활용합니다.

## 왜 이론치의 30%?

- **Refresh**: DRAM은 매 64ms마다 행 refresh를 수행하며, 약 3%를 손실합니다.
- **Row activation**: 다른 row에 접근할 때 15-30 cycle의 overhead가 붙습니다.
- **Bus turnaround**: read와 write를 전환할 때 5-10 cycle이 소모됩니다.
- **Refresh 우선**: refresh가 진행되는 동안 CPU는 대기합니다.

이 주제는 Hennessy & Patterson의 *Bandwidth Limited or Latency Limited?* 논문이 잘 정리해 두었습니다.

## Roofline Model

```text
       Performance (GFLOPS)
            ↑
            │
   Peak FP  ─────────────────  (compute roof)
            │                ╱
            │              ╱
            │            ╱
            │          ╱
            │        ╱       ← memory roof (slope = peak bandwidth)
            │      ╱
            │    ╱
            └─────────────────→  Arithmetic Intensity (FLOPS/byte)
                ridge point
```

- 알고리즘의 *arithmetic intensity* (FLOPS / memory byte)를 계산합니다.
- intensity가 ridge point보다 낮으면 memory-bound, 높으면 compute-bound입니다.

```c
// Vector add: 1 FLOP per 2 read + 1 write = 1/24 byte → memory bound
// Matrix multiply: 2 N^3 FLOP / 3 N^2 byte = O(N) intensity → compute bound (큰 N)
```

## ARM CCN — Coherent Mesh Network

Cortex-A57 이상 SoC는 4-cluster mesh 구조를 사용합니다.

```text
[Cluster 0]─[Cluster 1]
     │           │
[Memory Ctrl]─[I/O]
     │
[DDR3/4/5]
```

L3 bandwidth는 DRAM bandwidth보다 훨씬 큽니다. 그래서 L3 hit율이 핵심입니다.

## DRAM 측정 — perf event

```bash
# Cortex-A53
perf stat -e r19 ./prog   # BUS_ACCESS (bus 총 access 수)
perf stat -e r1a ./prog   # MEMORY_ERROR
perf stat -e r1d ./prog   # BUS_CYCLES

# 환산
bandwidth = BUS_ACCESS × line_size / elapsed_time
```

Intel 플랫폼에서는 `pcm-memory`로 측정하고, `dmidecode -t memory`로 사양을 확인할 수 있습니다.

## STM32H7 — Memory Hierarchy

Cortex-M7 STM32H743의 메모리 계층은 다음과 같습니다.

| 메모리 | 크기 | 속도 |
|---|---|---|
| ITCM | 64 KB | 0 wait state @ 480 MHz |
| DTCM | 128 KB | 0 ws |
| AXI SRAM | 512 KB | 1 ws |
| AHB SRAM | 288 KB | 2 ws |
| Flash | 2 MB | 7 ws @ 480 MHz (cache로 hide) |
| External SDRAM (FMC) | optional | ~10x slow |

```c
__attribute__((section(".dtcm"))) float dtcm_buf[256];   // fastest
```

External SDRAM은 bandwidth가 발목을 잡습니다. 큰 LCD framebuffer를 쓰면 그 자리에서 frame rate가 결정됩니다.

## Cortex-A72 + LPDDR4 — 모바일

Snapdragon 845는 4-channel LPDDR4-1866으로 이론 대역폭이 약 30 GB/s입니다. 실측 STREAM은 약 17 GB/s 수준입니다.

```text
4K@60fps decode: 1.5 GB/s
Display refresh: 2 GB/s
GPU: 5-10 GB/s
CPU: 2-3 GB/s
       총 ~15 GB/s → 거의 saturation
```

게임이 thermal throttle을 일으키는 한 가지 이유가 바로 이것입니다.

## 자동차·항공 LV — DDR3·SDRAM·SRAM

| 시스템 | 메모리 |
|---|---|
| 자동차 ECU (저급) | 내장 flash + SRAM, 512 KB |
| 자동차 ECU (Cortex-A 인포테인먼트) | LPDDR3/4, 2-8 GB |
| 누리·항공기 FCC | rad-hard SRAM, 1-4 MB |
| 위성 OBC | rad-hard SDRAM, 16-128 MB |

Rad-hard memory는 일반 메모리에 비해 약 10배 비싸고 5배 느립니다. Bandwidth 사양은 200-400 MB/s 수준입니다.

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

같은 node에 CPU와 memory를 바인딩하면 bandwidth가 최적이 됩니다.

임베디드에서는 NUMA가 드물지만, AMP 시스템에서 비슷한 구조를 만나게 됩니다. CPU마다 별도의 SRAM 영역을 분리해 두는 식입니다.

## DMA로 CPU offload

CPU가 직접 memcpy를 수행하면 bandwidth와 CPU cycle을 동시에 소모합니다.

```c
HAL_DMA_Start(&hdma, src, dst, len);   // CPU 자유
```

특히 Cortex-M에서는 large buffer를 copy할 때 DMA를 우선 고려합니다.

다만 small copy는 DMA 셋업 overhead가 오히려 더 큽니다. 경계점은 대략 256 byte 정도입니다.

## Streaming Store — Cache 우회

```c
for (i = 0; i < N; i++) {
    dst[i] = compute(i);
    __builtin_nontemporal_store(value, &dst[i]);   // or
}
```

큰 stream write를 할 때 cache evict pressure를 피하는 용도입니다.

ARM에서는 `STNP`, x86에서는 `MOVNTPS`가 같은 역할을 합니다.

## 자주 하는 실수

> ⚠️ "RAM이 크면 빠름" 오해

용량과 bandwidth는 다릅니다. DDR4-2666 32GB가 DDR4-3200 16GB보다 오히려 느립니다. 결국 속도가 결정합니다.

> ⚠️ Single-channel 사용

```text
Dual-channel: 2x bandwidth
Quad-channel: 4x (서버급)
```

PC를 자작할 때는 RAM을 2 slot에 같은 모듈로 꽂아야 합니다. 모르고 single channel로 사용하는 경우가 흔합니다.

> ⚠️ memcpy를 모두 같다고 가정

```c
memcpy(d, s, 32);     // ~5 cycle — inline
memcpy(d, s, 16384);  // SIMD + non-temporal — DMA보다 빠름 가능
memcpy(d, s, 16M);    // ← DMA 또는 hardware copy engine 고려
```

libc memcpy는 size별로 자동 최적화됩니다. 그렇다고 DMA가 항상 더 좋은 것은 아닙니다.

> ⚠️ Bandwidth 측정 시 cache warm-up 안 함

```c
warmup_array(arr);   // 한 번 순회
start = now();
benchmark();         // 진짜 측정
```

Cold cache 측정에는 compulsory miss가 포함되어 결과가 부정확해집니다.

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
