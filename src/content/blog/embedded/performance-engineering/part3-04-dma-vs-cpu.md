---
title: "3-04: DMA vs CPU Copy — Break-even, Setup Overhead, 실측"
date: 2026-05-19T03:00:00
description: "DMA setup overhead. CPU memcpy 최적화. Break-even size. 실측 데이터."
series: "Embedded Performance Engineering"
seriesOrder: 22
tags: [dma, memcpy, cpu, break-even]
draft: true
---

## 한 줄 요약

> **"DMA가 항상 빠른 건 아니다"** — 작은 transfer엔 *CPU memcpy*가 우세.

## CPU memcpy 성능 (Cortex-M4)

```c
memcpy(dst, src, len);
```

Newlib 또는 컴파일러 inline 버전:

| len | Cycle | Bytes/cycle |
|---|---|---|
| 16 | 12 | 1.3 |
| 64 | 28 | 2.3 |
| 256 | 92 | 2.8 |
| 1024 | 350 | 2.9 |
| 4096 | 1400 | 2.9 |

@ 168 MHz Cortex-M4 → 4 KB copy = 8 µs.

## DMA setup overhead

```c
HAL_DMA_Start(&hdma, src, dst, len);
```

| 단계 | Cycle |
|---|---|
| Register write (CR·NDTR·PAR·MAR) | ~30 |
| Enable transfer | ~5 |
| IRQ handler 진입·종료 | ~50 |
| Wake task (RTOS) | ~100 |
| Total overhead | **~200 cycle** |

200 cycle ≈ 60 byte CPU memcpy.

## Break-even Point

```text
CPU cost:  N / 3 cycle
DMA cost:  200 + N / 1 cycle (bus 한계)

Equal when: N/3 = 200 + N
            N/3 - N = 200
            negative N → DMA가 절대 안 빠름? 

* CPU는 transfer 중 *다른 일 못함* → 실 이득 = CPU offload
```

실제 break-even은 *CPU가 할 일*에 달림. CPU가 idle이면 — *CPU copy*가 빠름.

## 실 break-even — CPU가 다른 일 할 때

```c
// Path A: CPU copy, 다른 일 못 함
memcpy(dst, src, 1024);   // 350 cycle CPU 점유
do_other_work();           // 그 후 시작

// Path B: DMA + CPU 병행
HAL_DMA_Start(...);        // 30 cycle setup
do_other_work();           // 병행 가능
wait_dma();                // DMA 완료 대기 (또는 IRQ)
```

Path B 이득 = *do_other_work 시간 만큼*. 작은 transfer는 *setup이 곧 끝남* → 이득 적음.

> **Rule of thumb**: < 64 byte → CPU. > 256 byte → DMA. 사이는 *벤치*.

## 4-byte word memcpy (Cortex-M4 optimal)

```c
void fast_memcpy_word(uint32_t *dst, const uint32_t *src, size_t words) {
    for (size_t i = 0; i < words; i++) dst[i] = src[i];
}
```

Cortex-M4 ldr/str = 2 cycle each. 1.0 byte/cycle.

Loop unroll + LDM/STM:

```c
void fast_memcpy_ldm(uint32_t *dst, const uint32_t *src, size_t words) {
    while (words >= 8) {
        /* ldmia / stmia — multiple register */
        uint32_t r0 = src[0], r1 = src[1], r2 = src[2], r3 = src[3];
        uint32_t r4 = src[4], r5 = src[5], r6 = src[6], r7 = src[7];
        dst[0] = r0; dst[1] = r1; dst[2] = r2; dst[3] = r3;
        dst[4] = r4; dst[5] = r5; dst[6] = r6; dst[7] = r7;
        src += 8; dst += 8; words -= 8;
    }
    while (words--) *dst++ = *src++;
}
```

8-word burst → bus efficient.

## ARM Cortex-A NEON memcpy

```c
#include <arm_neon.h>

void neon_memcpy(uint8_t *dst, const uint8_t *src, size_t n) {
    while (n >= 64) {
        vst4q_u8(dst, vld4q_u8(src));   // 64 byte = 4 × 16-byte vector
        src += 64; dst += 64; n -= 64;
    }
    /* tail */
    memcpy(dst, src, n);
}
```

DDR bandwidth saturate — *DMA와 비슷한 속도*.

## glibc memcpy — Optimal

glibc `memcpy` (ARM aarch64) 사용:
- SIMD vector load/store
- *Non-temporal* (큰 size 시)
- Loop unroll 64-byte burst
- Page-aligned check + dispatch

수십 KB 이상 — *DMA와 동등*. CPU offload 효과만 다름.

## DMA 우세 케이스

### 1. Peripheral ↔ Memory

```c
HAL_UART_Receive_DMA(&huart, rx_buf, 256);
/* CPU 자유 — 다른 일 가능 */
/* UART byte 도착 시 DMA 자동 transfer */
```

CPU polling = *CPU 100% blocking*. DMA = *CPU 0% (IRQ만 가끔)*.

### 2. 연속 / 주기 transfer

```c
/* Camera frame — 매 frame 30 fps × 1080p × 2 byte = 60 MB/s */
HAL_DCMI_Start_DMA(&hdcmi, MODE_CONTINUOUS, frame_buf, frame_size);
```

CPU copy면 매 frame 33 ms × CPU 100% — *전체 CPU 점유*. DMA = 0%.

### 3. Cache pollution 회피

```c
/* 큰 buffer copy — CPU 시 cache evict pressure */
memcpy(dst, src, 1MB);
/* → hot working set 깨짐 */
```

DMA는 *cache 우회 가능* (또는 non-temporal). CPU 다른 일의 cache 보존.

## CPU 우세 케이스

### 1. Small transfer

```c
memcpy(&header, src, 16);   // ← DMA 설정 시간 더 김
```

### 2. 한 번만, CPU idle

```c
load_config(buf, 4096);   // boot 시 한 번
/* CPU 어차피 할 일 없음 */
```

### 3. Cortex-M0/M1 (DMA 없거나 1 channel)

```c
/* DMA channel 부족 — UART/SPI 우선 점유 */
```

## 측정 — Benchmark

```c
__DSB(); uint32_t t0 = DWT->CYCCNT;
memcpy(dst, src, len);
__DSB(); uint32_t t1 = DWT->CYCCNT;
printf("CPU: %u cycle\n", t1 - t0);

__DSB(); t0 = DWT->CYCCNT;
HAL_DMA_Start(...);
while (!dma_done) {}
__DSB(); t1 = DWT->CYCCNT;
printf("DMA: %u cycle\n", t1 - t0);
```

각 size별 측정 → break-even chart.

## STM32H743 실측 (170 MHz Cortex-M7 + 1.4 GB/s DDR3)

| Size | CPU memcpy | DMA | DMA + CPU 다른 일 |
|---|---|---|---|
| 32 B | 28 cycle | 220 cycle | 220 - other |
| 256 B | 200 cycle | 350 cycle | 350 - other |
| 4 KB | 2,800 cycle | 3,200 cycle | 3,200 - other |
| 64 KB | 45,000 | 50,000 | 50,000 - other |

CPU offload 효과 빼면 *비슷*. 단, CPU 다른 일 가능 시 *DMA 압승*.

## Cortex-A — memcpy 라이브러리

| 라이브러리 | 특징 |
|---|---|
| glibc | NEON + non-temporal + page check |
| musl | 작은 코드, 보통 성능 |
| Bionic (Android) | SoC-specific 최적화 |
| Cortex-Strings (Arm) | per-Cortex 최적 |

`-mtune=cortex-a72`로 컴파일 — 적절한 memcpy 자동 선택.

## DMA 손해 보는 함정

> ⚠️ 매번 setup

```c
for (i = 0; i < 1000; i++) {
    HAL_DMA_Start(...);    // ← 매번 200 cycle overhead
    wait_dma();
}
```

→ *one-shot 큰 transfer* 또는 *chain transfer*.

> ⚠️ CPU가 polling

```c
HAL_DMA_Start(...);
while (DMA->NDTR != 0);   // ← CPU 100% busy
```

→ IRQ 또는 *task sleep*.

> ⚠️ Buffer alignment 비매칭

```c
uint8_t buf[100];   // 보장 align 1
HAL_DMA_Start(..., buf, ...);   // ← word align 안 됨 → split
```

→ `__attribute__((aligned(32)))`.

## 자주 하는 실수

> ⚠️ 작은 copy도 DMA로

```c
HAL_DMA_Start(&hdma, &val, &reg, 4);   // ← overkill
```

ARMv7 stm → 1 cycle. DMA 200 cycle. 1 register 쓰기는 *직접 write*.

> ⚠️ DMA의 cache 영향 무시

큰 transfer DMA *non-cacheable* 안 쓰면 — *evict pressure로 working set 깨짐*.

> ⚠️ memcpy 대신 직접 loop

```c
for (i = 0; i < N; i++) dst[i] = src[i];
```

`-O2`면 컴파일러가 memcpy로 변환 — 그러나 `volatile`은 안 됨. 직접 `memcpy(dst, src, N)` 안전.

> ⚠️ DMA throttle

DMA 너무 빠름 → bus saturation → 다른 master starvation. **bandwidth limiter** 설정.

## 정리

- DMA setup overhead = *60-200 byte 등가 CPU 작업*.
- 작은 copy (<64 B) — CPU. 큰 copy·peripheral — DMA.
- 진짜 이득 = *CPU offload* — CPU가 다른 일 할 때만.
- Cortex-M4 memcpy = ~3 byte/cycle (ldmia/stmia 최적).
- Cortex-A NEON memcpy = DDR bandwidth saturate.
- 매 size별 *측정해서 break-even 확인*.

다음 편은 **Interrupt Latency**.

## 관련 항목

- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
