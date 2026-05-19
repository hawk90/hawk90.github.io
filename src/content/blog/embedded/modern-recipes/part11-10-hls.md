---
title: "11-10: Vitis HLS — Pragma·Pipeline II·Dataflow를 실전 감각으로"
date: 2026-05-17T12:00:00
description: "Vitis HLS로 C++ 코드를 RTL로 합성할 때 II=1을 끌어내는 pragma 조합, dataflow, AXI 인터페이스 결정을 실전 패턴 중심으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 132
tags: [recipes, hls, vitis, fpga, pipeline, dataflow]
---

## 한 줄 요약

> **"Vitis HLS는 C++을 RTL로 합성하지만, II=1과 dataflow를 끌어내려면 RTL 사상을 머릿속에 들고 짜야 합니다."** Pragma는 도구일 뿐이고, 메모리 port와 데이터 의존성이 진짜 결정자입니다.

## 어떤 상황에서 쓰나

FPGA로 카메라 frame을 stream-처리하거나, ML inference의 한 layer를 가속하거나, NVMe acceleration용 custom engine을 만들 때 RTL을 직접 쓰는 대신 Vitis HLS로 가는 경우가 점점 늘고 있습니다. C++로 알고리즘을 표현하고 pragma로 schedule을 지정해 합성하는 흐름은 RTL 코딩 대비 검증·재사용 측면에서 이점이 큽니다.

다만 Vitis HLS는 *마법사*가 아닙니다. C++ 한 줄이 LUT·FF·DSP·BRAM 어느 자원으로 떨어질지, loop가 II=1로 pipeline 될지 II=8로 떨어질지는 작성한 사람이 의도해야 합니다. 그 감각을 만드는 게 이 글의 목표입니다.

## 핵심 개념

가장 자주 손대는 pragma는 다섯 가지입니다.

| Pragma | 역할 |
|--------|------|
| `INTERFACE` | 외부 신호 — `m_axi`, `s_axilite`, `axis`, `ap_memory` |
| `PIPELINE` | loop를 매 cycle iteration 시작 (II=1) |
| `UNROLL` | loop body를 N개 복제 (병렬 + resource ×N) |
| `ARRAY_PARTITION` | 배열을 여러 BRAM/register로 쪼개 동시 access |
| `DATAFLOW` | 함수 사이 producer-consumer pipeline |

Pipeline II(Initiation Interval)는 새 iteration이 시작되는 주기입니다. II=1이면 매 cycle 한 iteration을 시작하므로 throughput은 clock rate와 같아집니다. II가 더 큰 이유는 거의 항상 *데이터 의존성*이거나 *메모리 port 부족*입니다.

Array partition은 *기본 BRAM이 single-port*라는 사실을 우회합니다. UNROLL factor 4를 줬는데 모든 access가 같은 BRAM 한 port를 지나가면 직렬화되어 효과가 사라집니다.

Dataflow는 함수 단위 pipeline입니다. 예를 들어 image filter 3 stage를 dataflow로 묶으면 stage 1이 다음 pixel을 만들 동안 stage 2가 이전 pixel을 처리합니다.

## 코드 / 실제 사용 예

### FIR filter 한 장

```cpp
#include <ap_int.h>
#include <hls_stream.h>

#define TAPS 32

void fir(hls::stream<int16_t> &in,
         hls::stream<int16_t> &out,
         const int16_t coeff[TAPS]) {
#pragma HLS INTERFACE axis      port=in
#pragma HLS INTERFACE axis      port=out
#pragma HLS INTERFACE s_axilite port=coeff bundle=ctrl
#pragma HLS INTERFACE s_axilite port=return bundle=ctrl

    static int16_t shift[TAPS] = {0};
#pragma HLS ARRAY_PARTITION variable=shift complete

    int16_t sample = in.read();

    SHIFT: for (int i = TAPS - 1; i > 0; i--) {
#pragma HLS UNROLL
        shift[i] = shift[i - 1];
    }
    shift[0] = sample;

    int32_t acc = 0;
    MAC: for (int i = 0; i < TAPS; i++) {
#pragma HLS UNROLL
        acc += (int32_t)shift[i] * (int32_t)coeff[i];
    }

    out.write((int16_t)(acc >> 15));
}
```

`shift`를 완전 partition했기 때문에 MAC loop의 unroll이 실제 32개 DSP로 펼쳐집니다. AXI-Stream으로 들어와 AXI-Stream으로 나가는 형태라 DMA와 자연스럽게 붙습니다.

### 동일 알고리즘을 m_axi로

```cpp
void fir_mm(int16_t *in, int16_t *out, int n,
            const int16_t coeff[TAPS]) {
#pragma HLS INTERFACE m_axi      port=in    offset=slave bundle=gmem0 \
                                  max_read_burst_length=256
#pragma HLS INTERFACE m_axi      port=out   offset=slave bundle=gmem1 \
                                  max_write_burst_length=256
#pragma HLS INTERFACE s_axilite  port=n     bundle=ctrl
#pragma HLS INTERFACE s_axilite  port=coeff bundle=ctrl
#pragma HLS INTERFACE s_axilite  port=return bundle=ctrl

    static int16_t shift[TAPS] = {0};
#pragma HLS ARRAY_PARTITION variable=shift complete

    for (int n_i = 0; n_i < n; n_i++) {
#pragma HLS PIPELINE II=1
        /* ... 위와 동일 logic ... */
    }
}
```

`m_axi`는 host memory에 직접 DMA합니다. `bundle`을 다르게 주면 read·write가 별도 AXI port로 분리되어 동시 진행이 가능합니다. `max_read_burst_length=256`은 DDR controller가 한 transaction에서 256 beat까지 burst하도록 허용합니다.

### 3-stage dataflow image pipeline

```cpp
void image_pipe(hls::stream<pixel> &in,
                hls::stream<pixel> &out) {
#pragma HLS DATAFLOW

    hls::stream<pixel> s1, s2;
#pragma HLS STREAM variable=s1 depth=32
#pragma HLS STREAM variable=s2 depth=32

    blur     (in,  s1);
    sharpen  (s1,  s2);
    threshold(s2, out);
}
```

세 함수가 producer-consumer pipeline으로 묶여 동시에 돌아갑니다. `STREAM depth`로 stage 사이 FIFO 깊이를 키우면 stage별 latency 차이를 흡수합니다.

### II=1을 깨뜨리는 의존성 풀기

```cpp
/* Naive — recurrence */
for (int i = 1; i < N; i++) {
#pragma HLS PIPELINE II=1
    a[i] = a[i - 1] + b[i];       /* II=2~3로 떨어짐 */
}

/* Tree reduction */
int partial[4] = {0};
for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    partial[i & 3] += b[i];        /* 4-way 누적 */
}
int total = partial[0] + partial[1] + partial[2] + partial[3];
```

직선 누적을 4개로 나눠 의존 거리를 늘리면 II=1이 살아납니다.

### 정확한 비트폭 — ap_int·ap_fixed

```cpp
ap_uint<10> coord_x;            /* 0..1023 */
ap_int<24>  sample;              /* 24-bit ADC */
ap_fixed<16, 1> gain;            /* 1.15 fixed-point */
```

`int` 그대로 쓰면 32-bit 회로가 잡혀 LUT을 낭비합니다. ADC bit폭, 이미지 좌표 bit폭에 맞춰 정확한 폭을 지정합니다.

### 작은 testbench

```cpp
int main() {
    hls::stream<int16_t> in, out;
    int16_t coeff[TAPS] = { ... };

    for (int i = 0; i < 1024; i++) in.write(test[i]);
    fir(in, out, coeff);
    for (int i = 0; i < 1024; i++) assert(out.read() == expected[i]);
    return 0;
}
```

C simulation으로 알고리즘이 맞는지 먼저 확인하고, 그 다음 C/RTL co-sim으로 RTL이 같은 결과를 내는지 검증합니다. 합성 직전 함정 대부분이 여기서 잡힙니다.

### Vitis 합성 보고서 읽기

```text
+ Latency:
    * Loop:
      |Loop Name |min |max |Iter Latency |Init Interval |Trip|
      |MAC       |  3 |  3 |           3 |            1 |  32|
+ Utilization Estimates:
    BRAM_18K: 2     DSP48E: 32     FF: 1812     LUT: 2154
```

II=1이면 MAC loop는 매 cycle 시작합니다. DSP48E 32개는 32-tap MAC의 완전 unroll이 적용된 결과입니다. 합성 결과를 보고 *내가 예상한 자원과 같은가*를 매번 검증하는 습관이 필요합니다.

## 측정 / 성능 비교

같은 32-tap FIR을 세 가지 합성 옵션으로 비교한 예입니다(Zynq UltraScale+ ZU3, 200 MHz 가정).

```text
구현                              II   throughput   DSP   LUT   BRAM
Naive (UNROLL/PARTITION 없음)     32   6 MSPS       1     400   1
UNROLL만                          32   6 MSPS       32    1500  1   ← partition 없어 직렬화
UNROLL + PARTITION complete       1    200 MSPS     32    2154  2
Dataflow 3-stage pipeline         1    200 MSPS    96    6400  6
```

UNROLL만 추가하면 자원만 늘고 throughput은 그대로입니다. Array partition까지 같이 줘야 진짜 32-way 병렬이 나옵니다.

DDR burst 크기에 따른 streaming throughput도 큰 차이를 만듭니다.

| max_burst_length | effective bandwidth |
|---|---|
| 8 | 0.4 GB/s |
| 64 | 2.1 GB/s |
| 256 | 6.8 GB/s (PCIe Gen3 x8 한계 근접) |

## 자주 보는 함정

> Pointer aliasing — HLS가 보수적으로 의존성을 잡음

```cpp
void foo(int *a, int *b, int n) {
    for (int i = 0; i < n; i++) {
#pragma HLS PIPELINE II=1
        a[i] = b[i] + 1;          /* a와 b가 겹칠 수 있다고 가정 */
    }
}
```

`__restrict__` 키워드를 붙이거나 `#pragma HLS DEPENDENCE`로 false dependency를 알려줍니다.

> Dynamic memory·재귀·system call

```cpp
int *buf = new int[N];            /* 합성 안 됨 */
recursive_fn(n);                   /* 안 됨 */
printf(...);                       /* 합성 단계에서 무시 */
```

HLS는 정적 분석 가능한 코드만 합성합니다. heap·재귀·I/O는 모두 금지입니다.

> Float을 그냥 사용

```cpp
float gain = 1.5f;
out[i] = in[i] * gain;
```

DSP·LUT을 크게 소모합니다. 가능하면 `ap_fixed`로 변환합니다.

> ARRAY_PARTITION 없이 UNROLL

```cpp
int buf[1024];
for (...) {
#pragma HLS UNROLL factor=4
    sum += buf[i];                 /* BRAM 단일 port → 직렬화 */
}
```

UNROLL만 보고 throughput이 4배가 될 거라고 기대하면 안 됩니다. partition이 같이 가야 합니다.

> Dataflow 안의 array를 stream으로 안 바꿈

```cpp
#pragma HLS DATAFLOW
    stage1(in, mid);              /* mid는 array */
    stage2(mid, out);
```

Stage 사이를 `hls::stream`이나 PIPO buffer로 두지 않으면 dataflow가 lock됩니다. 합성기가 경고를 띄우지만 놓치기 쉽습니다.

> Coefficient를 매 호출마다 host에서 전송

```cpp
fir(in, out, host_coeff);          /* 매 frame coeff DMA */
```

작은 LUT 상수는 `const` BRAM에 둬서 한 번만 load하는 편이 throughput·DDR 트래픽 모두에 좋습니다.

## 정리

- Vitis HLS의 핵심은 INTERFACE·PIPELINE·UNROLL·ARRAY_PARTITION·DATAFLOW 다섯 pragma입니다.
- II=1이 깨지면 데이터 의존성이나 메모리 port를 먼저 의심합니다.
- UNROLL은 ARRAY_PARTITION과 짝으로 갈 때 의미가 있습니다.
- AXI-Stream(axis)은 DMA와 자연스럽게 붙고, m_axi는 host memory에 직접 burst합니다.
- AXI-Lite(s_axilite)는 control register용입니다.
- ap_int·ap_fixed로 정확한 비트폭을 잡아 LUT을 아낍니다.
- Dynamic memory·recursion·float은 합성을 깨거나 자원을 폭발시킵니다.
- 합성 보고서의 II, DSP·LUT·BRAM 숫자를 매번 *예상값과 비교*하는 습관이 가장 중요합니다.

다음 편은 **AXI 인터페이스**입니다.

## 관련 항목

- [5-04: PCIe Streaming](/blog/embedded/modern-recipes/part5-04-pcie-streaming)
- [5-06: AXI](/blog/embedded/modern-recipes/part5-06-axi)
- [4-04: UIO·VFIO](/blog/embedded/modern-recipes/part4-04-uio-vfio)
