---
title: "5-05: HLS 함정들 — Pragma·Pipeline·Resource·Dataflow"
date: 2026-05-20T23:00:00
description: "Vitis HLS·Intel HLS 함정. Pragma 활용, pipeline II, resource estimation, dataflow."
series: "Modern Embedded Recipes"
seriesOrder: 29
tags: [recipes, hls, fpga, vitis, dataflow, pipeline]
draft: true
---

## 한 줄 요약

> **"HLS = C++로 FPGA 생성"** — 그러나 *RTL 사상 알아야* 효율적.

## HLS 도구

```text
Xilinx Vitis HLS — Zynq·Versal·Alveo
Intel HLS Compiler — Stratix·Agilex
Mentor Catapult — third party
SiFive Bluespec — academic
```

Vitis가 임베디드 표준. C++로 *Verilog/VHDL 생성*.

## Hello World — Matrix Multiply

```cpp
#include <ap_int.h>

void mat_mul(int A[16][16], int B[16][16], int C[16][16]) {
    #pragma HLS INTERFACE m_axi port=A offset=slave bundle=gmem
    #pragma HLS INTERFACE m_axi port=B offset=slave bundle=gmem
    #pragma HLS INTERFACE m_axi port=C offset=slave bundle=gmem
    #pragma HLS INTERFACE s_axilite port=return
    
    for (int i = 0; i < 16; i++) {
        for (int j = 0; j < 16; j++) {
            #pragma HLS PIPELINE II=1
            int sum = 0;
            for (int k = 0; k < 16; k++) {
                sum += A[i][k] * B[k][j];
            }
            C[i][j] = sum;
        }
    }
}
```

`#pragma HLS PIPELINE II=1` — *매 cycle iteration 시작* (Initiation Interval = 1).

## Interface — AXI·AXI-Stream·AXI-Lite

```cpp
/* AXI4 master — memory access */
#pragma HLS INTERFACE m_axi port=in bundle=gmem depth=1024

/* AXI4-Lite — register interface */
#pragma HLS INTERFACE s_axilite port=control

/* AXI-Stream — streaming data */
#pragma HLS INTERFACE axis port=stream_in
```

Linux driver가 *CPU에서 BAR mapping* + register write로 control.

## Pipeline II

```text
II=1 (best): 매 cycle 새 iteration 시작
II=2:        2 cycle 마다
II=N:        N cycle 마다 (bottleneck)
```

```cpp
for (int i = 0; i < N; i++) {
    #pragma HLS PIPELINE II=1
    /* logic */
}
```

`II=1` 달성 — *throughput = clock rate*. 100 MHz → 100 M op/s.

## Loop Unroll

```cpp
for (int i = 0; i < 4; i++) {
    #pragma HLS UNROLL
    sum += data[i];
}
```

→ 4개 adder 병렬. *throughput 4x*, resource 4x.

`#pragma HLS UNROLL factor=2` — *2x partial unroll*.

## Array Partitioning

```cpp
int buffer[16];
#pragma HLS ARRAY_PARTITION variable=buffer complete

/* → 16 register, 동시 access 가능 */

int matrix[16][16];
#pragma HLS ARRAY_PARTITION variable=matrix dim=1 type=complete
/* row 별로 분리 — 16 BRAM */
```

기본 — *BRAM single port*. Partition으로 *동시 access*.

## Dataflow — Task-Level Parallelism

```cpp
void filter(int *in, int *out, int N) {
    #pragma HLS DATAFLOW
    
    int stage1_out[N];
    int stage2_out[N];
    
    blur(in, stage1_out, N);     /* task 1 */
    sharpen(stage1_out, stage2_out, N);   /* task 2 */
    threshold(stage2_out, out, N);  /* task 3 */
}
```

Stage들이 *pipeline으로 동시 실행*. Image processing 표준 패턴.

## ap_int — 임의 비트폭

```cpp
ap_int<10> x;     /* signed 10-bit */
ap_uint<24> y;    /* unsigned 24-bit */
ap_fixed<16, 8> z;  /* 16-bit fixed point, 8 integer bits */

/* C에서는 int 통째로 — FPGA에선 정확한 비트만 */
```

LUT 사용량 ↓. 정확한 비트폭 *명시*.

## DSP48 Inference

```cpp
short a, b;
int c;
int product = (int)a * (int)b;
int result = c + product;
```

Vitis가 *DSP48 cascade*로 변환 — *single cycle MAC*.

## Resource Estimation

```text
Vitis HLS report:
  LUT:       2345 (1.1%)
  FF:        1234 (0.3%)
  BRAM:      4 (1.4%)
  DSP:       8 (3.6%)
  Latency:   200 cycle
  II:        1
```

Compile 후 *report 검토*. Critical path·resource 한계 확인.

## Pipeline Hazard — Data Dependency

```cpp
for (int i = 1; i < N; i++) {
    #pragma HLS PIPELINE II=1
    a[i] = a[i-1] + b[i];   /* recurrence — II=1 불가 */
}
```

`a[i]`가 *이전 iteration의 a[i-1]* 의존 → II=1 깨짐.

→ algorithm 변경 또는 *Tree reduction*.

## False Dependency 해결

```cpp
int sum;
for (int i = 0; i < N; i++) {
    #pragma HLS PIPELINE II=1
    if (cond) sum += data[i];   /* false dep on sum */
}
```

HLS — *conservative*. `#pragma HLS DEPENDENCE` hint:

```cpp
#pragma HLS DEPENDENCE variable=sum inter false
```

## Memory Burst — Wider Bus

```cpp
#pragma HLS INTERFACE m_axi port=data depth=1024 max_read_burst_length=256
```

AXI burst 256 beat = 256 × 8 byte = 2 KB per transaction. AXI overhead amortize.

## DDR Performance

```text
Vitis HLS + DDR4-2400:
  - 1 wide read: 100 MB/s
  - Burst 16-beat: 4 GB/s
  - Burst 256-beat: 19 GB/s (saturates DDR)
```

Burst 늘리기 = *bandwidth 200x*.

## ML Inference — Vitis AI

```cpp
/* Conv2D operator — HLS */
void conv2d(input_t input[CHN][H][W],
             weight_t weight[CHN][3][3],
             output_t output[H-2][W-2]) {
    #pragma HLS DATAFLOW
    
    /* Spatial unroll + pipeline */
    for (int y = 0; y < H-2; y++) {
        for (int x = 0; x < W-2; x++) {
            #pragma HLS PIPELINE II=1
            int sum = 0;
            for (int c = 0; c < CHN; c++) {
                #pragma HLS UNROLL
                for (int ky = 0; ky < 3; ky++) {
                    for (int kx = 0; kx < 3; kx++) {
                        #pragma HLS UNROLL
                        sum += input[c][y+ky][x+kx] * weight[c][ky][kx];
                    }
                }
            }
            output[y][x] = sum;
        }
    }
}
```

Vitis AI — 자동 quantization + HLS optimization.

## Co-Simulation

```cpp
/* Testbench */
int main() {
    int A[16][16], B[16][16], C[16][16];
    /* init data */
    
    mat_mul(A, B, C);
    
    /* verify */
    assert(C[0][0] == expected);
}
```

C simulation → C/RTL co-simulation → impl. *Verilog 동작 검증*.

## ARM SoC 통합 — Zynq

```text
PS (Cortex-A) side:
  - Linux + driver
  - mmap BAR (AXI-Lite control)
  - dma_alloc + DMA setup

PL (FPGA) side:
  - HLS-generated accelerator
  - AXI-Stream DMA interface
  - Interrupt to PS
```

```c
/* Linux user-space — UIO */
void *acc = mmap(NULL, 4096, ..., uio_fd, 0);
volatile uint32_t *ctrl = acc;

ctrl[0] = INPUT_ADDR;
ctrl[1] = OUTPUT_ADDR;
ctrl[2] = START;

while (!(ctrl[3] & DONE));
```

## Vitis Vivado IP Integrator

```text
Block Design GUI:
  + Zynq PS
  + Cortex-A interconnect
  + HLS-generated IP (accelerator)
  + AXI DMA
  + Custom AXI Stream
  → Wiring auto

Generate bitstream + device tree overlay
```

## 자주 하는 실수

> ⚠️ Pipeline II 무시

```cpp
for (...) {
    /* PIPELINE pragma 없음 */
    a = a + b;   /* serial — slow */
}
```

→ `#pragma HLS PIPELINE II=1`.

> ⚠️ Array partition 안 함

```cpp
int data[1024];
for (int i = 0; i < 1024; i++) {
    #pragma HLS UNROLL factor=4
    sum += data[i];   /* BRAM single port — UNROLL 효과 없음 */
}
```

→ partition 또는 *작은 array*.

> ⚠️ ap_int 부적절

```cpp
ap_int<32> x;   /* int와 동일 */
ap_int<10> y;   /* LUT 절약 — 적합 */
```

→ 정확한 비트폭.

> ⚠️ Burst 작음

```cpp
#pragma HLS INTERFACE m_axi port=data max_burst=16
/* DDR 효율 낮음 */
```

→ 256 beat까지 시도.

## 정리

- HLS = **C++ → FPGA**.
- `#pragma HLS PIPELINE II=1` = throughput 최대.
- **UNROLL·ARRAY_PARTITION·DATAFLOW** — parallelism.
- **ap_int·ap_fixed** — 정확 비트폭.
- AXI master·AXI-Stream·AXI-Lite 인터페이스.
- 자율주행·Vitis AI — production 사용.

다음 편은 **AXI Bus**.

## 관련 항목

- [5-04: PCIe Streaming](/blog/embedded/modern-recipes/part5-04-pcie-streaming)
- [5-06: AXI](/blog/embedded/modern-recipes/part5-06-axi)
