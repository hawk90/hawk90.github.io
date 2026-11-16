---
title: "HLS 최적화 기법 — Pipeline·Unroll·Partition·Dataflow"
slug: "embedded/modern-recipes/part11-11-hls-optimization"
date: 2026-04-20T09:10:00
description: "Vitis HLS에서 II를 끌어내리는 pragma 조합(PIPELINE 위치, partition 종류, 부분합, line buffer)을 UG1399 2025.2 원문, g++ C 시뮬레이션, Icarus Verilog 누산기 RTL 실험으로 확인합니다."
series: "Modern Embedded Recipes"
seriesOrder: 133
tags: [recipes, fpga, hls, vitis]
topics: ["embedded"]
---

## 한 줄 요약

> **"HLS 최적화는 II를 1로 만드는 일이고, II를 막는 것은 거의 항상 배열 포트 수와 loop를 거슬러 올라가는 의존성입니다."** PIPELINE을 어디에 다느냐, 배열을 어떻게 나누느냐, 누적을 몇 갈래로 나누느냐가 그 둘을 푸는 손잡이입니다.

## 어떤 상황에서 쓰나

[11-10 Vitis HLS](/blog/embedded/modern-recipes/part11-10-hls)에서 다섯 pragma가 무엇인지 봤다면, 이 글은 그 pragma를 실제 커널(FIR, Sobel)에 붙일 때 생기는 판단을 다룹니다. PIPELINE을 함수에 달지 loop에 달지, partition을 `complete`로 할지 `cyclic`으로 할지, 누적 loop가 왜 II=1이 안 나오는지 같은 질문입니다.

> **이 글에서 실행한 것.** Vitis HLS는 설치할 수 없어 합성은 하지 않았습니다. 그래서 II·지연·자원 숫자는 HLS 보고서에서 나온 것이 하나도 없습니다. 대신 (1) 커널을 g++ 16.2와 AMD의 공개 [`ap_int` 헤더](https://github.com/Xilinx/HLS_arbitrary_Precision_Types)로 C 시뮬레이션해 최적화 전후 결과가 같은지 확인했고, (2) "누적 loop의 의존성이 II를 정한다"는 주장은 Icarus Verilog 13.0으로 직접 짠 누산기 RTL을 돌려 사이클을 셌습니다. 근거 문서는 AMD *Vitis High-Level Synthesis User Guide*(UG1399, 2025.2 English)입니다.

## 핵심 개념 — II와 처리율

II(Initiation Interval)는 새 입력을 받는 간격입니다. 클록이 f, II가 k면 정상 상태에서 초당 f/k개를 받습니다. 100 MHz에서 II=1이면 초당 1억 개, II=4면 2500만 개입니다. 여기에 pipeline을 채우고 비우는 시간과 메모리·인터페이스 대기가 더해지므로, 실제 처리율은 co-simulation이나 보드에서 확인합니다.

```text
throughput (items/s) = f_clk / II           steady state, no stalls
total cycles         ~ (trip_count - 1) * II + depth
```

목표 처리율에서 거꾸로 계산하면 필요한 클록과 II가 나옵니다. 1080p60의 화소 수는 1920 × 1080 × 60 = 124,416,000개/s입니다. 화소 하나에 한 사이클(II=1)을 쓰는 커널이라도 100 MHz로는 활성 화소만으로도 따라갈 수 없고, 클록이 적어도 124.4 MHz는 되어야 합니다(블랭킹 구간을 처리하는 방식에 따라 더 필요할 수 있습니다). 처리율 계산은 클록·II·화소 수만 있으면 되므로 합성 전에 해 둘 수 있습니다.

## PIPELINE — 함수에 달지, loop에 달지

UG1399 "Working with Variable Loop Bounds" 절은 "When a loop or function is pipelined, Vitis HLS unrolls all loops in the hierarchy below"라고 적습니다. 그래서 함수 맨 위에 PIPELINE을 달면 그 안의 loop가 모두 펼쳐집니다. 바깥 loop가 데이터 개수 N만큼 도는 함수라면 N개 iteration이 전부 복제된다는 뜻입니다.

```cpp
// 회피: function-level pipeline unrolls the N-iteration loop below
void filter(float in[N], float out[N]) {
#pragma HLS PIPELINE II=1
    static float prev = 0;
    for (int i = 0; i < N; i++) {
        out[i] = 0.5f * (in[i] + prev);
        prev = in[i];
    }
}

// Good: pipeline the loop that walks the data
void filter(float in[N], float out[N]) {
    static float prev = 0;
    for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
        out[i] = 0.5f * (in[i] + prev);
        prev = in[i];
    }
}
```

데이터를 한 개씩 훑는 loop에 PIPELINE을 달고, 그 안의 작은 고정 길이 loop(탭, 윈도)는 PIPELINE이 펼치게 두는 것이 기본 형태입니다. 안쪽 loop 경계가 변수면 펼칠 수 없어 바깥 loop의 pipelining까지 막힌다는 것도 같은 절의 내용입니다.

## UNROLL과 ARRAY_PARTITION은 짝

UNROLL은 iteration을 복제하지만, 복제된 iteration이 같은 배열을 읽으면 포트가 모자랍니다. UG1399 "Array Accesses and Performance" 절은 한 iteration에서 배열을 세 번 읽는 loop를 single-port RAM으로 두면 `Final II: 2`로 물러나는 로그를 보여 주고, dual-port RAM도 사이클당 두 번만 접근할 수 있다고 적습니다.

```cpp
float coef[8];
#pragma HLS ARRAY_PARTITION variable=coef type=complete dim=1

float buf[32];
#pragma HLS ARRAY_PARTITION variable=buf type=cyclic factor=8 dim=1

for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    float sum = 0;
    for (int j = 0; j < 8; j++)
        sum += coef[j] * buf[(i + j) & 31];   /* 8 reads per iteration */
    out[i] = sum;
}
```

`pragma HLS array_partition` 절의 정의를 그대로 옮기면 세 종류는 이렇습니다.

| type | 나누는 방식 | 이 예에서 |
|---|---|---|
| `complete` (기본값) | 원소 하나하나로 쪼갬. 1차원 배열이면 개별 레지스터 | `coef` 8개를 레지스터 8개로 |
| `cyclic factor=k` | 원소를 k개 배열에 돌아가며 하나씩 넣음 | `buf[(i+j)&31]`의 연속 8개가 서로 다른 8개 조각으로 감 |
| `block factor=k` | 연속된 덩어리 k개로 나눔 | 4개짜리 덩어리 8개라 연속 8개가 2~3개 덩어리에 최대 4개씩 몰려 포트가 모자람 |

`dim`은 몇 번째 차원을 나눌지 정하고 기본값은 1, `dim=0`이면 모든 차원을 나눕니다. 위 loop는 iteration마다 연속된 원소 8개를 읽으므로 `cyclic factor=8`이 맞습니다. `cyclic factor=4`로 두면 조각 하나에 두 번씩 접근이 몰립니다. 조각마다 dual-port라면 버틸 수 있지만, 그것은 도구가 조각을 dual-port로 구현했을 때의 이야기이므로 합성 보고서로 확인할 항목입니다.

## 사례 — Naive vs Optimized FIR

같은 8-tap float FIR을 pragma 없이 쓴 것과 pragma를 단 것입니다. pragma는 C 의미를 바꾸지 않으므로 C 시뮬레이션 결과는 비트까지 같아야 합니다.

```cpp
void fir_fast(float in[N], float out[N]) {
#pragma HLS INTERFACE m_axi port=in  offset=slave bundle=g0
#pragma HLS INTERFACE m_axi port=out offset=slave bundle=g1
    static float buf[8];
#pragma HLS ARRAY_PARTITION variable=buf type=complete dim=1
    static const float coef[8] = {0.1f, 0.2f, 0.3f, 0.4f, 0.4f, 0.3f, 0.2f, 0.1f};
#pragma HLS ARRAY_PARTITION variable=coef type=complete dim=1
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

`fir_naive()`는 같은 loop에서 pragma만 뺀 것입니다. 4096개 무작위 입력으로 두 함수를 비교했습니다.

```text
fir8 csim: 4096 samples, 0 bit-level differences naive vs fast
```

결과가 같다는 것은 확인했지만, 몇 배 빨라지는지는 합성과 co-simulation 없이 알 수 없습니다. C 코드에서 읽을 수 있는 것은 구조입니다. `sum`은 8개 곱의 float 덧셈 사슬이고, UG1399 "Floats and Doubles" 절에 따르면 Vitis HLS는 float 연산 순서를 C 코드대로 지키므로 이 8개 덧셈은 트리로 바뀌지 않고 차례로 이어집니다. 그 사슬은 iteration 안에 있어 II가 아니라 지연(depth)을 늘립니다. 반면 다음 절의 누적처럼 사슬이 iteration을 건너가면 II가 늘어납니다.

## Loop-carried 의존성 — 누산기 RTL로 보기

```cpp
for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    sum = sum + arr[i];        /* this add needs the previous add's result */
}
```

UG1399 "Floats and Doubles" 절은 Versal이 아닌 디바이스에서 표준 정밀도 float 누적이 보통 II 3~5로 pipeline된다고 적습니다(Versal은 II=1). 이유는 덧셈기의 지연입니다. 덧셈기가 여러 단 pipeline이면, 이번 덧셈 결과가 나오기 전까지 다음 덧셈은 피연산자 `sum`을 받을 수 없습니다.

이 현상을 HLS 없이 확인하려고 Verilog로 누산기를 짰습니다. 덧셈기는 4단 pipeline이고, 결과를 부분합 레지스터에 다시 쓰는 데 한 사이클이 더 걸려 되먹임 경로가 5사이클입니다. 부분합을 1개, 4개, 5개로 두고 1부터 64까지 더했습니다.

```bash
iverilog -g2012 -o acc acc.v && vvp -n acc
```

```text
adder latency 4, N=64 inputs (1..64, expected sum 2080)
one running sum : sum=2080 cycles=320
four partial sums: sum=2080 cycles=83
five partial sums: sum=2080 cycles=68
```

부분합이 하나면 5사이클마다 한 입력(64 × 5 = 320사이클)밖에 못 받습니다. 부분합을 4개로 나누면 83사이클로 줄지만, 되먹임 경로가 5사이클이라 4갈래로는 다섯 사이클에 한 번씩 막힙니다. 부분합 수가 되먹임 지연 이상인 5개가 되자 매 사이클 입력을 받아 64 + 4사이클 만에 끝났습니다. **나눌 갈래 수는 "되먹임 경로의 사이클 수" 이상이어야 II=1이 됩니다.** 실제 float 덧셈기의 지연은 디바이스·클록·연산자 설정마다 다르므로, HLS 보고서의 덧셈기 지연을 보고 갈래 수를 정합니다.

C++로는 이렇게 씁니다. float에서는 이 변환이 덧셈 순서를 바꾸므로 결과가 달라질 수 있습니다. UG1399는 기본 설정에서 float 연산 순서를 C 코드대로 지키고, 이 제약은 `config_compile -unsafe_math_optimizations`로 풀 수 있다고 적습니다. 아래 코드가 실제로 II=1이 되는지(`acc`가 레지스터로 나뉘었는지, carried dependence 경고가 없는지)는 합성 보고서로 확인할 항목입니다.

```cpp
float acc[8] = {0};              /* lanes >= adder feedback latency */
#pragma HLS ARRAY_PARTITION variable=acc type=complete
for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    acc[i & 7] += arr[i];
}
float sum = 0;
for (int k = 0; k < 8; k++)
    sum += acc[k];
```

10만 개를 더해 보면 실제로 순서에 따라 결과가 다릅니다(11-10의 실행: serial 12.0908508, 4-way 12.0901299). 정수 누적은 결과가 같으니 이 걱정이 없고, UG1399는 정밀도를 낮춘 float 누적 모드도 II=1로 pipeline된다고 적습니다.

## Image Processing 예 — Sobel과 line buffer

3×3 Sobel은 화소마다 위 두 줄의 같은 열을 다시 봐야 합니다. 프레임 전체를 저장하지 않고 두 줄만 들고 다니는 것이 line buffer입니다. 줄 서 있는 사람에게 "앞의 두 사람이 무엇을 들고 있었는지"만 메모해 두는 것과 같습니다.

```cpp
void sobel(hls::stream<uchar_t> &in, hls::stream<uchar_t> &out, int H, int W) {
#pragma HLS INTERFACE axis port=in
#pragma HLS INTERFACE axis port=out
    static uchar_t line[2][MAX_W];             // two previous rows
#pragma HLS ARRAY_PARTITION variable=line type=complete dim=1
    uchar_t win[3][3];
#pragma HLS ARRAY_PARTITION variable=win type=complete dim=0

    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
#pragma HLS PIPELINE II=1
            uchar_t p = in.read();
            for (int j = 0; j < 3; j++)        // shift the 3x3 window left
                for (int i = 0; i < 2; i++)
                    win[j][i] = win[j][i+1];
            win[0][2] = line[0][x];            // row y-2
            win[1][2] = line[1][x];            // row y-1
            win[2][2] = p;                     // row y
            line[0][x] = line[1][x];
            line[1][x] = p;
            /* gx, gy, |gx|+|gy| clipped to 255 -> out.write() */
        }
    }
}
```

함수 맨 위에 `#pragma HLS PIPELINE II=1`을 하나 더 달면 앞 절의 규칙대로 그 pragma가 y·x loop까지 펼치려 하고, `H`·`W`가 변수라 펼칠 수 없으니 pipelining이 막힙니다. 그래서 PIPELINE은 화소 loop 안쪽에만 둡니다. `line`은 `dim=1`로 두 줄을 따로 나눠, 한 사이클에 `line[0][x]`와 `line[1][x]`를 동시에 다룰 수 있게 했습니다. 다만 나눈 뒤에도 각 줄은 iteration마다 읽기 1번·쓰기 1번이 필요하므로, 조각마다 읽기·쓰기 포트를 따로 가진 RAM으로 구현됐는지는 합성 보고서로 확인할 항목입니다.

이 커널을 64×48 무작위 영상으로 돌려, 윈도가 영상 안에 완전히 들어가는 출력을 2차원 배열로 직접 계산한 Sobel과 비교했습니다. 출력 (y, x)의 중심 화소는 (y−1, x−1)입니다.

```text
sobel csim: 64x48, 2852 interior outputs checked, 0 mismatches
INFO [HLS SIM]: The maximum depth reached by any hls::stream() instance in the design is 3072
```

자원 사용량(BRAM 몇 개, LUT 몇 개)과 지연은 합성 결과라 이 글에 없습니다. 지연의 하한은 산술로 잡을 수 있습니다. 1920×1080 프레임을 II=1로 처리하면 화소 수만큼, 즉 2,073,600사이클 이상이 걸립니다.

## Dataflow — 단계 사이 FIFO 깊이

```cpp
void pipeline(hls::stream<rgb_t> &in, hls::stream<uchar_t> &out, int H, int W) {
#pragma HLS DATAFLOW
    hls::stream<uchar_t> s1, s2;
#pragma HLS STREAM variable=s1 depth=1024
#pragma HLS STREAM variable=s2 depth=1024
    rgb_to_gray(in, s1, H * W);
    blur(s1, s2, H, W);
    edge(s2, out, H, W);           /* blur, edge: 3x3 line-buffer kernels */
}
```

UG1399의 data-driven 모델 설명은 `hls::stream`의 기본 깊이를 2로 적고, "Configuring Dataflow Memory Channels" 절은 FIFO 크기를 직접 지정하면 도구가 계산한 기본값을 덮어쓰며, 어느 단계가 그보다 많이 몰아서 만들거나 소비하면 FIFO가 비거나 차서 멈추고 deadlock이 될 수 있다고 적습니다. `blur`가 테두리 출력을 생략해 두 줄을 받은 뒤에야 출력을 시작하는 식으로 단계마다 출력 시작 시점이 다르면, 그 차이만큼 FIFO가 버텨야 합니다.

## 자주 보는 함정

> Partition만 하고 접근은 순차

```cpp
int arr[8];
#pragma HLS ARRAY_PARTITION variable=arr type=complete
for (int i = 0; i < 8; i++)
    sum += arr[i];
```

Partition은 동시에 읽을 수 있는 길을 만들 뿐입니다. loop를 펼치거나(UNROLL, 또는 바깥 loop의 PIPELINE) 해서 실제로 여러 원소를 같은 사이클에 읽어야 효과가 납니다. 이 loop는 정수 누적이라 펼쳐도 결과가 같습니다.

> 큰 배열을 `complete`로

```cpp
int big_arr[1024];
#pragma HLS ARRAY_PARTITION variable=big_arr type=complete
```

`complete`는 원소를 개별 레지스터로 만듭니다(1차원 배열). `int` 1024개면 레지스터 1024개, 비트로는 1024 × 32 = 32,768비트입니다. 여기에 변수 인덱스로 읽는 코드가 있으면 1024개 중 하나를 고르는 선택 회로가 붙습니다. 동시에 읽을 원소 수만큼만 `cyclic factor=k`나 `block factor=k`로 나눕니다.

> Dataflow 채널 규칙 위반

```cpp
void top() {
#pragma HLS DATAFLOW
    int arr[64];
    f1(arr);           /* writes arr */
    f2(arr);           /* reads arr  */
    f3(arr);           /* 회피: second reader */
}
```

`f1`이 쓰고 `f2`가 읽는 배열 하나는 문제가 없습니다. 배열 채널은 기본이 PIPO이기 때문입니다(UG1399 "Specifying Arrays as PIPOs or FIFOs"). 문제는 reader가 둘 이상이거나 writer가 둘 이상인 경우입니다. "WYSIWYG Coding Style" 절은 배열·stream 채널에 writer 하나와 reader 하나를 요구하고, 배열에 reader를 여럿 두려면 `bind_storage`(`type=ram_1wnr`)로 지정하라고 적습니다.

> Stream depth를 최소로 두기

```cpp
hls::stream<int, 2> s;
```

깊이 2는 `hls::stream`의 기본값입니다. 생산과 소비 속도가 같고 시작 시점도 같다면 충분하지만, 한쪽이 몰아서 내보내면 생산자가 멈춥니다. 깊이는 위 Dataflow 절처럼 단계 사이 시작 시점 차이에서 정하고, co-simulation에서 멈춤이 없는지 확인합니다.

> `std::sin` 그대로 쓰기

UG1399의 HLS Math Library 절과 Fixed-Point Math Functions 절은 `hls_math.h`가 `cmath` 함수를 C 시뮬레이션과 합성 모두에서 쓸 수 있게 제공하고(`hls` namespace), float·double·half와 대부분 함수의 고정소수점 버전을 지원한다고 적습니다. 고정소수점 버전은 `ap_fixed<W,I>`에서 I ≤ 33, W−I ≤ 32 같은 비트폭 조건이 있습니다. 비용이 얼마인지는 합성 보고서에서 확인합니다.

## 정리

- 처리율은 f_clk/II입니다. 1080p60은 활성 화소만 초당 1억 2441만 개라 II=1이어도 100 MHz로는 모자랍니다.
- PIPELINE은 아래 loop를 모두 펼칩니다. 데이터를 훑는 loop에 달고, 함수 맨 위에는 달지 않습니다.
- UNROLL로 늘린 접근 수만큼 ARRAY_PARTITION으로 포트를 늘립니다. 연속 접근이면 `cyclic`이 맞습니다.
- 누적 의존성은 부분합으로 풉니다. RTL 실험에서 부분합 수가 되먹임 지연(5사이클) 이상일 때만 매 사이클 입력을 받았습니다.
- float 부분합은 결과를 바꾸고, 도구는 기본으로 이 변환을 하지 않습니다.
- line buffer Sobel은 C 시뮬레이션에서 직접 계산과 일치했습니다. 출력 위치가 (y−1, x−1)이라는 점을 testbench가 알아야 합니다.
- Dataflow 채널은 writer 하나·reader 하나, FIFO 깊이는 단계 사이 시작 시점 차이로 정합니다.

다음 편은 **Vitis AI**입니다.

## 재현 절차

- C 시뮬레이션: Homebrew GCC 16.2.0, `HLS_arbitrary_Precision_Types` 커밋 `200a9ae`, `hls_stream.h`는 AMD의 [`hls-lib-stream`](https://github.com/Xilinx/hls-lib-stream) 커밋 `e7e04ab`.
  - `g++-16 -std=c++17 -O2 -Wall -Wno-unknown-pragmas fir8.cpp fir8_tb.cpp -o fir8 && ./fir8`
  - `g++-16 -std=c++17 -O2 -w -I<apt>/include -I<hls-lib-stream> sobel.cpp sobel_tb.cpp -o sobel && ./sobel`
- RTL: Icarus Verilog 13.0, `iverilog -g2012 -o acc acc.v && vvp -n acc`. 누산기는 `LAT`(덧셈기 단수)와 `WAYS`(부분합 수)를 파라미터로 받습니다.
- 산술: 1920 × 1080 × 60 = 124,416,000, 1920 × 1080 = 2,073,600, 1024 × 32 = 32,768.

## 관련 항목

- [11-10: Vitis HLS](/blog/embedded/modern-recipes/part11-10-hls)
- [11-12: Vitis AI](/blog/embedded/modern-recipes/part11-12-vitis-ai)
- [11-13: OpenCL on FPGA](/blog/embedded/modern-recipes/part11-13-opencl-fpga)
- [12-04: Quantization](/blog/embedded/modern-recipes/part12-04-quantization)
