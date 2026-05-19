---
title: "2-08: Memory Bandwidth — STREAM·Roofline·Bus Saturation"
date: 2026-05-08T15:00:00
description: "STREAM benchmark (Copy·Scale·Add·Triad). Roofline. PMU BUS_ACCESS · DDR bandwidth."
series: "Embedded Performance Engineering"
seriesOrder: 16
tags: [memory, bandwidth, stream, roofline]
draft: true
---

## 한 줄 요약

> **"Bandwidth = bytes / second"** — 대역폭 saturation 시 *CPU 안 빠름, memory가 발목*.

## STREAM Benchmark — 표준

John McCalpin의 STREAM (1995):

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

총 데이터 = `24 × N = 192 MB`. Working set > L3 → DRAM 측정.

```text
실측 예 — Raspberry Pi 4 (LPDDR4-3200, 32-bit bus):
  Copy:   4.2 GB/s
  Scale:  3.8 GB/s
  Add:    3.5 GB/s
  Triad:  3.4 GB/s
```

이론치 = `3200 × 4 byte / 8 = 1600 MB/s × 2 = 12.8 GB/s` — 실측 *25-30%만* 활용.

## 왜 이론치의 30%?

- **Refresh** — DRAM은 매 64ms 행 refresh, ~3% 손실
- **Row activation** — 다른 row 접근 시 *15-30 cycle overhead*
- **Bus turnaround** — read↔write 전환 시 *5-10 cycle*
- **Refresh 우선** — CPU 대기

좋은 paper — *Bandwidth Limited or Latency Limited?* (Hennessy & Patterson).

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

- 알고리즘의 *arithmetic intensity* (FLOPS / memory byte) 계산
- intensity가 ridge point보다 *낮으면 memory-bound*, 높으면 *compute-bound*

```c
// Vector add: 1 FLOP per 2 read + 1 write = 1/24 byte → memory bound
// Matrix multiply: 2 N^3 FLOP / 3 N^2 byte = O(N) intensity → compute bound (큰 N)
```

## ARM CCN — Coherent Mesh Network

Cortex-A57 이상 SoC에서 *4-cluster mesh*:

```text
[Cluster 0]─[Cluster 1]
     │           │
[Memory Ctrl]─[I/O]
     │
[DDR3/4/5]
```

L3 bandwidth ≫ DRAM bandwidth. *L3 hit*이 핵심.

## DRAM 측정 — perf event

```bash
# Cortex-A53
perf stat -e r19 ./prog   # BUS_ACCESS (bus 총 access 수)
perf stat -e r1a ./prog   # MEMORY_ERROR
perf stat -e r1d ./prog   # BUS_CYCLES

# 환산
bandwidth = BUS_ACCESS × line_size / elapsed_time
```

또는 `pcm-memory` (Intel), `dmidecode -t memory` 사양 확인.

## STM32H7 — Memory Hierarchy

Cortex-M7 STM32H743:

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

External SDRAM은 *bandwidth 발목* — 큰 LCD framebuffer 시 frame rate 결정.

## Cortex-A72 + LPDDR4 — 모바일

Snapdragon 845 — 4-channel LPDDR4-1866 = ~30 GB/s 이론. 실측 STREAM ~17 GB/s.

```text
4K@60fps decode: 1.5 GB/s
Display refresh: 2 GB/s
GPU: 5-10 GB/s
CPU: 2-3 GB/s
       총 ~15 GB/s → 거의 saturation
```

이게 게임이 *thermal throttle* 일으키는 한 이유.

## 자동차·항공 LV — DDR3·SDRAM·SRAM

| 시스템 | 메모리 |
|---|---|
| 자동차 ECU (저급) | 내장 flash + SRAM, 512 KB |
| 자동차 ECU (Cortex-A 인포테인먼트) | LPDDR3/4, 2-8 GB |
| 누리·항공기 FCC | rad-hard SRAM, 1-4 MB |
| 위성 OBC | rad-hard SDRAM, 16-128 MB |

Rad-hard memory — 일반 대비 *10x 비쌈*, *5x 느림*. Bandwidth 사양 *200-400 MB/s* 수준.

## NUMA — Multi-Socket

Linux server:

```bash
numactl --hardware
# node 0: CPUs 0-7, 64GB
# node 1: CPUs 8-15, 64GB
# inter-node bandwidth ~70% of local
```

```bash
numactl --cpunodebind=0 --membind=0 ./prog
```

같은 node에 *CPU + memory binding* → bandwidth 최적.

임베디드는 NUMA 드물지만 *AMP system*에서 비슷 — *CPU별 SRAM 영역* 분리.

## DMA로 CPU offload

CPU가 memcpy하면 *bandwidth + CPU cycle 둘 다 소모*.

```c
HAL_DMA_Start(&hdma, src, dst, len);   // CPU 자유
```

특히 *Cortex-M*에서 — large buffer copy 시 DMA 우선.

다만 *small copy*는 DMA 셋업 overhead가 더 큼 — *경계점 ~256 byte*.

## Streaming Store — Cache 우회

```c
for (i = 0; i < N; i++) {
    dst[i] = compute(i);
    __builtin_nontemporal_store(value, &dst[i]);   // or
}
```

큰 stream write 시 — cache evict pressure 회피.

ARM `STNP`, x86 `MOVNTPS`.

## 자주 하는 실수

> ⚠️ "RAM이 크면 빠름" 오해

용량 ≠ bandwidth. *DDR4-2666 32GB*가 *DDR4-3200 16GB*보다 *느림* (속도가 결정).

> ⚠️ Single-channel 사용

```text
Dual-channel: 2x bandwidth
Quad-channel: 4x (서버급)
```

PC 자작 시 *RAM 2 slot에 같은 모듈* — 모르고 single channel 사용 흔함.

> ⚠️ memcpy를 모두 같다고 가정

```c
memcpy(d, s, 32);     // ~5 cycle — inline
memcpy(d, s, 16384);  // SIMD + non-temporal — DMA보다 빠름 가능
memcpy(d, s, 16M);    // ← DMA 또는 hardware copy engine 고려
```

libc memcpy는 size별 자동 최적화 — 그러나 *DMA가 항상 좋진 않음*.

> ⚠️ Bandwidth 측정 시 cache warm-up 안 함

```c
warmup_array(arr);   // 한 번 순회
start = now();
benchmark();         // 진짜 측정
```

Cold cache 측정은 *compulsory miss* 포함 → 부정확.

## 정리

- STREAM = bandwidth 표준 벤치 (Copy/Scale/Add/Triad).
- 실측은 이론치의 *25-50%*.
- **Roofline model**로 memory vs compute bound 판별.
- PMU **BUS_ACCESS**로 측정.
- 자동차·항공 — rad-hard SRAM = 일반의 *10x 비쌈*.
- DMA·non-temporal store로 *cache pollution 회피*.

다음 편은 **SIMD/NEON**.

## 관련 항목

- [2-07: Cache Line](/blog/embedded/performance-engineering/part2-07-cache-line)
- [2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
