---
title: "DMA vs CPU Copy 성능 비교 — Break-even·Setup Overhead 실측"
date: 2026-04-25T09:03:00
description: "DMA setup overhead. CPU memcpy 최적화. Break-even size. 실측 데이터."
series: "Embedded Performance Engineering"
seriesOrder: 22
tags: [dma, memcpy, cpu, break-even]
draft: false
---

## 한 줄 요약

> **"DMA가 항상 빠른 것은 아닙니다."** 작은 transfer에서는 *CPU memcpy*가 우세합니다.

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

168 MHz Cortex-M4 기준으로 4 KB copy가 8 µs입니다.

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

200 cycle은 약 60 byte의 CPU memcpy에 해당합니다.

## Break-even Point

$$\text{CPU cost} = \frac{N}{3} \text{ cycle}, \quad \text{DMA cost} = 200 + N \text{ cycle (bus 한계)}$$

$$\text{Equal when:} \quad \frac{N}{3} = 200 + N \implies \frac{N}{3} - N = 200 \implies N < 0$$

즉 단순 cycle 비교만으로는 DMA가 빠를 수 없습니다. 하지만 CPU는 transfer 중에 *다른 일을 못 하므로* 실제 이득은 CPU offload에서 옵니다.

실제 break-even은 *CPU가 할 다른 일*에 달려 있습니다. CPU가 idle이면 *CPU copy*가 빠릅니다.

## 실 break-even - CPU가 다른 일 할 때

```c
// Path A: CPU copy, 다른 일 못 함
memcpy(dst, src, 1024);   // 350 cycle CPU 점유
do_other_work();           // 그 후 시작

// Path B: DMA + CPU 병행
HAL_DMA_Start(...);        // 30 cycle setup
do_other_work();           // 병행 가능
wait_dma();                // DMA 완료 대기 (또는 IRQ)
```

Path B의 이득은 *do_other_work 시간만큼*입니다. 작은 transfer는 *setup이 곧 끝나서* 이득이 적습니다.

> **Rule of thumb**: 64 byte 미만은 CPU, 256 byte 초과는 DMA. 그 사이는 *직접 벤치*해야 합니다.

## 4-byte word memcpy (Cortex-M4 optimal)

```c
void fast_memcpy_word(uint32_t *dst, const uint32_t *src, size_t words) {
    for (size_t i = 0; i < words; i++) dst[i] = src[i];
}
```

Cortex-M4의 ldr/str은 각각 2 cycle로 1.0 byte/cycle 수준입니다.

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

8-word burst를 쓰면 bus 효율이 좋습니다.

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

DDR bandwidth를 saturate시켜서 *DMA와 비슷한 속도*를 냅니다.

## glibc memcpy - Optimal

glibc `memcpy` (ARM aarch64)는 다음 기법을 씁니다.
- SIMD vector load/store
- *Non-temporal* (큰 size일 때)
- Loop unroll 64-byte burst
- Page-aligned check + dispatch

수십 KB 이상이면 *DMA와 동등한 속도*가 나옵니다. CPU offload 효과만 다릅니다.

## DMA가 유리한 경우

### 1. Peripheral ↔ Memory

```c
HAL_UART_Receive_DMA(&huart, rx_buf, 256);
/* CPU 자유 — 다른 일 가능 */
/* UART byte 도착 시 DMA 자동 transfer */
```

CPU polling은 *CPU 100% blocking*이지만 DMA는 *CPU 0%* (가끔 IRQ만)으로 동작합니다.

### 2. 연속 / 주기 transfer

```c
/* Camera frame — 매 frame 30 fps × 1080p × 2 byte = 60 MB/s */
HAL_DCMI_Start_DMA(&hdcmi, MODE_CONTINUOUS, frame_buf, frame_size);
```

CPU copy로 처리하면 매 frame 33 ms 동안 CPU 100%로 *전체 CPU를 점유*합니다. DMA는 0%입니다.

### 3. Cache pollution 회피

```c
/* 큰 buffer copy — CPU 시 cache evict pressure */
memcpy(dst, src, 1MB);
/* → hot working set 깨짐 */
```

DMA는 *cache를 우회*할 수 있고 non-temporal도 지원합니다. 덕분에 CPU가 하는 다른 일의 cache가 보존됩니다.

## CPU가 유리한 경우

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

## 측정 - Benchmark

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

각 size별로 측정해 break-even chart를 만듭니다.

## STM32H743 실측 (170 MHz Cortex-M7 + 1.4 GB/s DDR3)

| Size | CPU memcpy | DMA | DMA + CPU 다른 일 |
|---|---|---|---|
| 32 B | 28 cycle | 220 cycle | 220 - other |
| 256 B | 200 cycle | 350 cycle | 350 - other |
| 4 KB | 2,800 cycle | 3,200 cycle | 3,200 - other |
| 64 KB | 45,000 | 50,000 | 50,000 - other |

CPU offload 효과를 빼면 둘 다 *비슷*합니다. 다만 CPU가 다른 일을 할 수 있는 상황에서는 *DMA가 압승*입니다.

## Cortex-A - memcpy 라이브러리

| 라이브러리 | 특징 |
|---|---|
| glibc | NEON + non-temporal + page check |
| musl | 작은 코드, 보통 성능 |
| Bionic (Android) | SoC-specific 최적화 |
| Cortex-Strings (Arm) | per-Cortex 최적 |

`-mtune=cortex-a72`로 컴파일하면 적절한 memcpy가 자동으로 선택됩니다.

## DMA 손해 보는 함정

> ⚠️ 매번 setup

```c
for (i = 0; i < 1000; i++) {
    HAL_DMA_Start(...);    // ← 매번 200 cycle overhead
    wait_dma();
}
```

*one-shot 큰 transfer*나 *chain transfer*로 묶는 것이 좋습니다.

> ⚠️ CPU가 polling

```c
HAL_DMA_Start(...);
while (DMA->NDTR != 0);   // ← CPU 100% busy
```

IRQ나 *task sleep*으로 바꿔야 합니다.

> ⚠️ Buffer alignment 비매칭

```c
uint8_t buf[100];   // 보장 align 1
HAL_DMA_Start(..., buf, ...);   // ← word align 안 됨 → split
```

`__attribute__((aligned(32)))`로 정렬을 명시해야 합니다.

## 자주 하는 실수

> ⚠️ 작은 copy도 DMA로

```c
HAL_DMA_Start(&hdma, &val, &reg, 4);   // ← overkill
```

ARMv7의 stm은 1 cycle인데 DMA는 200 cycle입니다. register 한 개 쓰기에는 *직접 write*가 맞습니다.

> ⚠️ DMA의 cache 영향 무시

큰 transfer DMA에서 *non-cacheable*을 쓰지 않으면 *evict pressure로 working set이 깨집니다*.

> ⚠️ memcpy 대신 직접 loop

```c
for (i = 0; i < N; i++) dst[i] = src[i];
```

`-O2`에서는 컴파일러가 알아서 memcpy로 변환합니다. 다만 `volatile`은 변환되지 않으므로 직접 `memcpy(dst, src, N)`을 쓰는 편이 안전합니다.

> ⚠️ DMA throttle

DMA가 너무 빠르면 bus saturation이 일어나 다른 master가 starvation에 빠집니다. **bandwidth limiter**를 설정해야 합니다.

## 정리

- DMA setup overhead는 *60-200 byte 등가의 CPU 작업*에 해당합니다.
- 작은 copy(<64 B)는 CPU, 큰 copy와 peripheral은 DMA가 유리합니다.
- 진짜 이득은 *CPU offload*이며 CPU가 다른 일을 할 때만 의미가 있습니다.
- Cortex-M4 memcpy는 ldmia/stmia 최적화 기준 약 3 byte/cycle입니다.
- Cortex-A NEON memcpy는 DDR bandwidth를 saturate시킵니다.
- size별로 *직접 측정해서 break-even을 확인*해야 합니다.

다음 편은 **Interrupt Latency**를 다룹니다.

## 관련 항목

- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
