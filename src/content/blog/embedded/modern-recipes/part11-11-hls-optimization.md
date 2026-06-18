---
title: "HLS 최적화 기법 — Pipeline·Unroll·Partition·Dataflow"
date: 2026-04-20T09:10:00
description: "Vitis/Vivado HLS의 pragma로 II=1 pipeline·array partition·dataflow를 적용해 throughput을 극대화하는 패턴."
series: "Modern Embedded Recipes"
seriesOrder: 133
tags: [recipes, fpga, hls, vitis]
---

## 한 줄 요약

> **"HLS의 성능은 *코드*가 아니라 *pragma*가 결정합니다."** 같은 C++ 함수가 pragma 한 줄로 throughput이 100배 변할 수 있습니다.

## 어떤 상황에서 쓰나

DSP filter, image convolution, matrix multiply, neural network inference 등 *데이터 흐름*이 정형적인 알고리즘은 HLS가 RTL보다 빠르게 high-throughput accelerator를 만듭니다. 단, *naive* HLS는 1 sample에 수십 cycle을 씁니다. Pragma로 pipeline II=1을 만들어야 throughput이 살아납니다.

## 핵심 개념 — Initiation Interval (II)

```text
II=1: 매 cycle 새 input 1개 받음 → throughput = clock
II=4: 4 cycle마다 input 1개   → throughput = clock / 4
```

II가 1이면 100 MHz fabric에서 100 Msamples/s. II가 4면 25 Msamples/s. 4배 차이.

Loop pipeline pragma:

```cpp
for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    out[i] = process(in[i]);
}
```

II=1을 *달성하려면* loop body 안에서 *모든 resource 충돌*과 *data dependency*가 해결되어야 합니다.

## Pragma 1 — PIPELINE

```cpp
void filter(float in[N], float out[N]) {
#pragma HLS PIPELINE II=1
    static float prev = 0;
    for (int i = 0; i < N; i++) {
        out[i] = 0.5f * (in[i] + prev);
        prev = in[i];
    }
}
```

Loop pipeline은 단계별 register로 *iteration 간 overlap*을 만듭니다. 5 cycle latency의 multiply가 있어도 II=1이면 *throughput*은 1 sample/cycle.

## Pragma 2 — UNROLL

```cpp
for (int j = 0; j < 4; j++) {
#pragma HLS UNROLL
    sum += tap[j] * x[i-j];
}
```

작은 inner loop를 *완전 펼침*. 4 MAC을 *병렬*로 실행. 4× DSP, 1/4 latency.

```cpp
for (int j = 0; j < 8; j++) {
#pragma HLS UNROLL factor=2
    /* 2 단계씩 펼침 */
}
```

`factor=2`는 partial unroll. Resource와 throughput을 trade-off.

## Pragma 3 — ARRAY_PARTITION

BRAM은 *port 2개*. 한 cycle에 2 word 이상 access하려면 partition 필요.

```cpp
float coef[8];
#pragma HLS ARRAY_PARTITION variable=coef complete dim=1

float buf[32];
#pragma HLS ARRAY_PARTITION variable=buf cyclic factor=4 dim=1

for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    float sum = 0;
    for (int j = 0; j < 8; j++) {
#pragma HLS UNROLL
        sum += coef[j] * buf[(i+j) & 31];   /* 8개 동시 read */
    }
    out[i] = sum;
}
```

`complete`은 *모든 원소*를 별도 register로 분리. `cyclic factor=4`는 4개의 BRAM으로 round-robin. `block factor=4`는 4개 BRAM에 연속 chunk.

## Pragma 4 — DATAFLOW

함수 chain을 *동시에 실행*. Producer가 끝나기 전에 consumer가 처리 시작.

```cpp
void top(stream<pixel> &in, stream<pixel> &out) {
#pragma HLS DATAFLOW
    stream<pixel> s1, s2;
    color_convert(in, s1);
    blur(s1, s2);
    edge_detect(s2, out);
}
```

세 함수가 *pipeline의 stage처럼* 동시에 동작. `stream<>`는 FIFO. 각 stage가 한 frame씩 처리하면서 다음 frame이 들어옴.

## Pragma 5 — INTERFACE

함수의 argument를 *어떤 hardware 인터페이스*로 노출할지 결정.

```cpp
void accel(int *in, int *out, int n) {
#pragma HLS INTERFACE m_axi      port=in  offset=slave bundle=g0
#pragma HLS INTERFACE m_axi      port=out offset=slave bundle=g1
#pragma HLS INTERFACE s_axilite  port=n   bundle=ctrl
#pragma HLS INTERFACE s_axilite  port=return bundle=ctrl
    /* ... */
}
```

`m_axi`로 DDR에 직접 access. `s_axilite`로 register에서 control.

## 사례 — Naive vs Optimized FIR Filter

### Naive (II=4, 1 MSPS @ 100 MHz)

```cpp
void fir_naive(float in[N], float out[N]) {
    static float buf[8];
    for (int i = 0; i < N; i++) {
        for (int j = 7; j > 0; j--) buf[j] = buf[j-1];
        buf[0] = in[i];

        float sum = 0;
        for (int j = 0; j < 8; j++) sum += COEF[j] * buf[j];
        out[i] = sum;
    }
}
```

Shift loop와 MAC loop가 *순차* 실행. II=8~16.

### Optimized (II=1, 100 MSPS @ 100 MHz)

```cpp
void fir_fast(float in[N], float out[N]) {
#pragma HLS INTERFACE m_axi port=in  offset=slave bundle=g0
#pragma HLS INTERFACE m_axi port=out offset=slave bundle=g1

    static float buf[8];
#pragma HLS ARRAY_PARTITION variable=buf complete dim=1

    static const float coef[8] = {0.1f, 0.2f, 0.3f, 0.4f, 0.4f, 0.3f, 0.2f, 0.1f};
#pragma HLS ARRAY_PARTITION variable=coef complete dim=1

    for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
        for (int j = 7; j > 0; j--) {
#pragma HLS UNROLL
            buf[j] = buf[j-1];
        }
        buf[0] = in[i];

        float sum = 0;
        for (int j = 0; j < 8; j++) {
#pragma HLS UNROLL
            sum += coef[j] * buf[j];
        }
        out[i] = sum;
    }
}
```

100배 빨라집니다. Resource는 8× DSP + 8× register.

## Image Processing 예 — Sobel Edge

```cpp
void sobel(stream<uchar_t> &in, stream<uchar_t> &out, int H, int W) {
#pragma HLS INTERFACE axis port=in
#pragma HLS INTERFACE axis port=out
#pragma HLS PIPELINE II=1

    static uchar_t line[2][MAX_W];   // 2 line buffer
#pragma HLS ARRAY_PARTITION variable=line dim=1

    uchar_t win[3][3];
#pragma HLS ARRAY_PARTITION variable=win complete dim=0

    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
#pragma HLS PIPELINE II=1
            uchar_t p = in.read();

            // 3x3 sliding window
            for (int j = 0; j < 3; j++)
#pragma HLS UNROLL
                for (int i = 0; i < 2; i++)
#pragma HLS UNROLL
                    win[j][i] = win[j][i+1];
            win[0][2] = line[0][x];
            win[1][2] = line[1][x];
            win[2][2] = p;

            line[0][x] = line[1][x];
            line[1][x] = p;

            // Sobel
            int gx = -win[0][0] + win[0][2] - 2*win[1][0] + 2*win[1][2]
                     - win[2][0] + win[2][2];
            int gy = -win[0][0] - 2*win[0][1] - win[0][2]
                     + win[2][0] + 2*win[2][1] + win[2][2];
            int mag = (gx < 0 ? -gx : gx) + (gy < 0 ? -gy : gy);

            out.write(mag > 255 ? 255 : mag);
        }
    }
}
```

1080p60 입력을 100 MHz fabric에서 그대로 처리. *Line buffer*가 핵심 메모리 패턴.

## Resource Estimate

HLS report:

```text
Latency:    8302 cycles (1080×768)
Interval:   8294 cycles
II:         1
Resource:
  BRAM:     2  (line buffer)
  DSP:      8  (Sobel multipliers)
  LUT:      850
  FF:       1200
```

Latency · interval · II 셋을 확인. Interval ≈ data 수 / II면 throughput 정상.

## Dataflow 예 — Multi-stage Pipeline

```cpp
void rgb_to_gray(stream<rgb_t> &in, stream<uchar_t> &gray, int N) {
    for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
        rgb_t p = in.read();
        gray.write((p.r * 77 + p.g * 150 + p.b * 29) >> 8);
    }
}

void blur(stream<uchar_t> &in, stream<uchar_t> &out, int H, int W) { /* ... */ }
void edge(stream<uchar_t> &in, stream<uchar_t> &out, int H, int W) { /* ... */ }

void pipeline(stream<rgb_t> &in, stream<uchar_t> &out, int H, int W) {
#pragma HLS DATAFLOW
    stream<uchar_t, 1024> s1, s2;
    rgb_to_gray(in,  s1, H*W);
    blur(s1, s2, H, W);
    edge(s2, out, H, W);
}
```

세 함수가 *동시에* 실행. FIFO depth가 stage 간 balancing에 중요.

## 자주 보는 함정

> Loop carried dependency

```cpp
for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    sum = sum + arr[i];     /* sum 이전 결과 의존 → II > 1 가능 */
}
```

`sum += a` 같은 reduction은 II=1 안 됨 (5-cycle add chain). Multi-accumulator + 마지막에 reduce.

```cpp
float acc[4] = {0};
for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    acc[i & 3] += arr[i];    /* 4 independent acc */
}
sum = acc[0] + acc[1] + acc[2] + acc[3];
```

> Array를 sequential access하면서 partition만

```cpp
int arr[8];
#pragma HLS ARRAY_PARTITION variable=arr complete

for (int i = 0; i < 8; i++)
    sum += arr[i];   /* 그래도 sequential — UNROLL 같이 필요 */
```

Partition은 *동시 access 가능*하게 할 뿐. UNROLL로 *실제로 동시* access하게.

> DATAFLOW 안에서 array share

```cpp
void f1() { arr[0] = 5; }
void f2() { x = arr[0]; }
DATAFLOW { f1(); f2(); }   /* arr 통한 share 안 됨 */
```

Stream으로만 통신. Array share는 dependency violation.

> Stream depth 너무 작음

```cpp
stream<int, 2> s;   /* depth 2 — backpressure 자주 */
```

Producer가 빨리 보내고 consumer가 느리면 stream이 가득 차 producer 정지. Depth 256~4096이 보통.

> Resource 폭증

```cpp
#pragma HLS ARRAY_PARTITION variable=big_arr[1024] complete
```

1024 element를 모두 register로 = 1024 FF + 1024 mux. Resource fail. `factor=N`으로 부분 partition.

> Floating point 가정

```cpp
out = sin(x);  /* float sin → 수십 cycle */
```

Trigonometric은 cordic IP 또는 LUT-based로 직접. Floating point는 fixed point보다 *훨씬 비쌉니다*.

## 정리

- HLS 성능은 pragma가 결정. `PIPELINE II=1`이 목표.
- II=1을 달성하려면 *resource conflict* + *data dependency* 해소.
- ARRAY_PARTITION으로 한 cycle 다중 access.
- UNROLL로 inner loop 병렬화.
- DATAFLOW로 함수 chain pipeline.
- INTERFACE pragma로 AXI master/slave, stream 노출.
- Image processing은 line buffer + sliding window 패턴.
- Floating point는 비쌉니다. Fixed point가 FPGA 친화적.

다음 편은 **Vitis AI**입니다.

## 관련 항목

- [11-10: HLS](/blog/embedded/modern-recipes/part11-10-hls)
- [11-12: Vitis AI](/blog/embedded/modern-recipes/part11-12-vitis-ai)
- [11-13: OpenCL on FPGA](/blog/embedded/modern-recipes/part11-13-opencl-fpga)
- [6-03: Quantization](/blog/embedded/modern-recipes/part12-03-quantization)
