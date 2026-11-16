---
title: "Vitis HLS 분석 — Pragma·Pipeline II·Dataflow 실전 감각"
slug: "embedded/modern-recipes/part11-10-hls"
date: 2026-04-20T09:09:00
description: "Vitis HLS의 INTERFACE·PIPELINE·UNROLL·ARRAY_PARTITION·DATAFLOW pragma가 하는 일을 UG1399(2025.2) 원문으로 정리하고, FIR·dataflow 커널과 testbench를 g++ C 시뮬레이션으로 직접 돌려 확인합니다."
series: "Modern Embedded Recipes"
seriesOrder: 132
tags: [recipes, hls, vitis, fpga, pipeline, dataflow]
topics: ["embedded"]
---

## 한 줄 요약

> **"Vitis HLS는 C++을 RTL로 바꿔 주지만, 몇 사이클마다 새 입력을 받을지(II)는 메모리 포트와 데이터 의존성이 정합니다."** Pragma는 의도를 전하는 수단이고, 도구가 그 의도를 못 지키면 경고를 내고 가능한 가장 작은 II로 물러납니다.

## 어떤 상황에서 쓰나

FPGA로 카메라 프레임을 stream으로 처리하거나, 필터 하나를 가속하거나, DMA 뒤에 붙일 연산 블록을 만들 때 RTL을 직접 쓰는 대신 Vitis HLS를 고를 수 있습니다. 알고리즘은 C++로 쓰고 pragma로 구조를 지정하며, 같은 C++ 코드를 testbench로 먼저 돌려 볼 수 있다는 것이 큰 장점입니다.

다만 HLS는 C++ 한 줄을 알아서 빠른 회로로 바꿔 주는 도구가 아닙니다. 공장 조립 라인에 비유하면, pragma는 "라인을 몇 개 둘지, 부품 선반을 몇 칸으로 나눌지"를 적은 작업 지시서입니다. 선반이 한 칸이면 작업자 네 명이 줄을 서서 기다리듯, 배열의 포트가 모자라면 UNROLL을 줘도 접근이 줄을 섭니다. 이 글은 그 감각을 AMD의 *Vitis High-Level Synthesis User Guide*(UG1399, 2025.2 English, 2026-01-22) 원문과 직접 돌린 C 시뮬레이션으로 잡습니다.

> **이 글에서 실행한 것과 하지 않은 것.** Vitis HLS는 설치할 수 없어 합성(C synthesis)과 C/RTL co-simulation은 돌리지 않았습니다. 그래서 II·지연·DSP·LUT 같은 합성 결과 숫자는 이 글에 없습니다. 실행한 것은 C 시뮬레이션입니다. AMD가 공개한 [`ap_int`·`ap_fixed` 헤더](https://github.com/Xilinx/HLS_arbitrary_Precision_Types)(커밋 `200a9ae`)와 g++ 16.2로 커널과 testbench를 빌드해 돌렸습니다. `hls::stream`은 AMD가 따로 공개한 [`hls-lib-stream`](https://github.com/Xilinx/hls-lib-stream)(Apache-2.0, 커밋 `e7e04ab`)의 `hls_stream.h`를 썼습니다.

## 핵심 개념

가장 자주 손대는 pragma는 다섯 가지입니다.

| Pragma | UG1399 2025.2의 설명 |
|--------|------|
| `INTERFACE` | 함수 인자를 RTL 포트로 어떻게 낼지 정함. `ap_none`, `ap_memory`, `s_axilite`(AXI4-Lite, C 드라이버 파일 생성), `m_axi`(AXI4 메모리 맵), `axis`(AXI4-Stream) 등 |
| `PIPELINE` | 함수나 loop가 `<N>` 사이클마다 새 입력을 받게 함. `II=1`이면 매 사이클 |
| `UNROLL` | loop 본문을 복제해 여러 iteration을 동시에 실행 |
| `ARRAY_PARTITION` | 배열을 작은 배열이나 개별 레지스터로 쪼갬. `type=`은 `cyclic`, `block`, `complete`(기본값) |
| `DATAFLOW` | 함수·loop 사이를 채널로 이어 동시에 돌게 함 |

**II(Initiation Interval)** 는 새 iteration을 시작하는 간격입니다. UG1399의 `pragma HLS pipeline` 절은 II를 지정하지 않으면 도구가 클록 제약 안에서 가능한 최소 II를 만들되 타이밍을 우선하고, 지정한 II를 만들 수 없으면 경고를 내고 가능한 가장 낮은 II로 만든다고 적습니다. 같은 절의 "Important"는 loop-carried 의존성이 pipelining을 막을 수 있다고 덧붙입니다.

**PIPELINE은 아래 loop를 모두 펼칩니다.** "Working with Variable Loop Bounds" 절의 문장 그대로 "When a loop or function is pipelined, Vitis HLS unrolls all loops in the hierarchy below"입니다. 그래서 아래 FIR처럼 바깥 loop에 PIPELINE을 주면 안쪽 shift·MAC loop에는 UNROLL을 따로 달지 않아도 펼쳐지고, 안쪽 loop 경계가 변수면 펼칠 수 없어 pipelining 자체가 막힙니다.

**배열 포트가 II를 정합니다.** "Array Accesses and Performance" 절의 예제는 한 iteration에서 배열을 세 번 읽는 loop를 single-port RAM으로 두면 II=1을 못 맞추고 `Final II: 2`로 물러나는 로그를 보여 주고, dual-port RAM도 한 사이클에 두 번만 접근할 수 있다고 설명합니다. 인터페이스 배열은 따로 지정하지 않으면 single-port RAM이고, dual-port가 II나 지연을 줄일 때만 dual-port가 됩니다("Array Interfaces" 절). 한 사이클에 더 많이 읽어야 한다면 ARRAY_PARTITION으로 배열을 쪼개 포트를 늘립니다.

**DATAFLOW의 채널은 FIFO 또는 PIPO입니다.** "Configuring Dataflow Memory Channels" 절에 따르면 스칼라는 FIFO로, 배열은 사용자가 PIPO(ping-pong)나 FIFO를 고르며, 임의 순서로 접근하는 배열은 PIPO여야 합니다(기본 크기는 원래 배열의 두 배). 그리고 canonical dataflow에서 배열과 stream 채널은 쓰는 프로세스와 읽는 프로세스가 각각 하나여야 하고, 쓰는 쪽이 소스에서 먼저 나와야 합니다("WYSIWYG Coding Style" 절).

## 코드 / 실제 사용 예

### FIR filter, AXI-Stream 한 샘플씩

입력 한 샘플을 받아 32-tap 결과 한 샘플을 내는 커널입니다. MAC loop가 펼쳐지면 한 호출에서 `shift`와 `coeff`를 각각 32번 읽습니다. 앞에서 본 대로 배열 하나는 사이클당 1~2번만 읽을 수 있으므로, 두 배열을 모두 `type=complete`로 나눠 32개 레지스터로 만들어야 32개 곱셈이 포트를 두고 줄을 서지 않습니다. 인터페이스 배열인 `coeff`도 ARRAY_PARTITION으로 다시 나눌 수 있습니다(UG1399 "Array Interfaces").

```cpp
#include <ap_int.h>
#include <hls_stream.h>
#include <cstdint>

#define TAPS 32

void fir(hls::stream<int16_t> &in,
         hls::stream<int16_t> &out,
         const int16_t coeff[TAPS]) {
#pragma HLS INTERFACE axis      port=in
#pragma HLS INTERFACE axis      port=out
#pragma HLS INTERFACE s_axilite port=coeff bundle=ctrl
#pragma HLS INTERFACE s_axilite port=return bundle=ctrl
#pragma HLS ARRAY_PARTITION variable=coeff type=complete

    static int16_t shift[TAPS] = {0};
#pragma HLS ARRAY_PARTITION variable=shift type=complete

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

계수는 Q15(정수 값 ÷ 32768)로 보고 마지막에 `>> 15`로 되돌립니다. 이 커널이 실제로 DSP 몇 개, LUT 몇 개가 되는지는 합성해야 알 수 있고, 이 글은 그 숫자를 갖고 있지 않습니다.

### Testbench는 호출 한 번에 한 샘플

이 커널은 호출마다 `in`에서 한 개를 읽고 `out`에 한 개를 씁니다. 그래서 testbench도 한 샘플씩 넣고 한 번씩 호출해야 합니다. 아래 testbench는 1024개 샘플을 직접형(direct form) 계산과 비교합니다.

```cpp
for (int n = 0; n < 1024; n++) {
    hls::stream<int16_t> in, out;
    in.write(x[n]);
    fir(in, out, coeff);                       /* one sample per call */
    int32_t acc = 0;                           /* golden: direct form */
    for (int k = 0; k < TAPS; k++)
        acc += (int32_t)coeff[k] * (n - k >= 0 ? x[n - k] : 0);
    if (out.read() != (int16_t)(acc >> 15)) errors++;
}
```

```bash
g++-16 -std=c++17 -O2 -Wno-unknown-pragmas \
    -I HLS_arbitrary_Precision_Types/include -I hls-lib-stream fir.cpp fir_tb.cpp -o fir_csim
./fir_csim
```

```text
fir csim: 1024 samples, 0 mismatches -> PASS
INFO [HLS SIM]: The maximum depth reached by any hls::stream() instance in the design is 1
```

마지막 줄은 `hls_stream.h`가 프로그램 끝에 찍는 정보로, testbench가 stream에 한 번에 최대 1개만 쌓았다는 뜻입니다.

샘플 1024개를 한꺼번에 쓰고 `fir()`를 한 번만 부른 뒤 1024개를 읽는 testbench로 바꾸면 어떻게 될까요. `fir()`는 한 번에 하나만 처리하므로 입력 1023개가 남고 출력은 1개뿐이고, 두 번째 `out.read()`가 빈 stream을 읽게 됩니다. 같은 `hls_stream.h`를 `-DHLS_STREAM_THREAD_SAFE`로 빌드해 돌리면 그 읽기에서 영원히 기다리다 `timeout 10`에 잘렸습니다.

```text
$ g++-16 -std=c++17 -O2 -Wno-unknown-pragmas -DHLS_STREAM_THREAD_SAFE ... fir.cpp tb_orig.cpp -o tb_orig -lpthread && timeout 10 ./tb_orig
exit=124
```

Vitis HLS의 C 시뮬레이션은 이 상황을 오류로 잡습니다. UG1399 "Tasks and Channels" 절은 2022.2부터 빈 stream 읽기가 C 시뮬레이션에서도 deadlock을 낼 수 있어 오류로 바뀌었다고 하고, `hls::task`를 쓰지 않는 설계에서 나오는 메시지를 `ERROR [HLS SIM]: an hls::stream is read while empty, which may result in RTL simulation hanging.`로 적습니다(`-DHLS_STREAM_READ_EMPTY_RETURNS_GARBAGE`를 주면 경고로 바뀝니다). 어느 쪽이든 testbench는 커널이 "호출당 몇 개를 소비하고 내는지"를 그대로 따라야 합니다.

### 같은 알고리즘을 m_axi로

DMA 대신 커널이 직접 DDR을 읽고 쓰게 하려면 포인터 인자를 `m_axi`로 냅니다. 이번에는 바깥 loop에 PIPELINE을 주었으므로, 앞 절에서 본 규칙대로 안쪽 두 loop는 UNROLL 없이도 펼쳐집니다.

```cpp
void fir_mm(const int16_t *in, int16_t *out, int n,
            const int16_t coeff[TAPS]) {
#pragma HLS INTERFACE m_axi     port=in  offset=slave bundle=gmem0 max_read_burst_length=256
#pragma HLS INTERFACE m_axi     port=out offset=slave bundle=gmem1 max_write_burst_length=256
#pragma HLS INTERFACE s_axilite port=n      bundle=ctrl
#pragma HLS INTERFACE s_axilite port=coeff  bundle=ctrl
#pragma HLS INTERFACE s_axilite port=return bundle=ctrl
#pragma HLS ARRAY_PARTITION variable=coeff type=complete
    int16_t shift[TAPS] = {0};
#pragma HLS ARRAY_PARTITION variable=shift type=complete
    for (int k = 0; k < n; k++) {
#pragma HLS PIPELINE II=1
        for (int i = TAPS - 1; i > 0; i--)      /* unrolled by the pipeline */
            shift[i] = shift[i - 1];
        shift[0] = in[k];
        int32_t acc = 0;
        for (int i = 0; i < TAPS; i++)
            acc += (int32_t)shift[i] * coeff[i];
        out[k] = (int16_t)(acc >> 15);
    }
}
```

UG1399의 `pragma HLS interface` 절에 따르면 `offset=slave`는 오프셋 포트를 만들어 AXI4-Lite에 자동으로 매핑하는 기본값이고, `bundle`이 다른 `m_axi` 인자는 서로 다른 AXI4 포트가 됩니다. `max_read_burst_length`·`max_write_burst_length`는 burst 한 번에 읽고 쓸 데이터 개수의 최대값입니다. 같은 문서의 "Options for Controlling AXI4 Burst Behavior" 절은 도구가 메모리 지연을 모르기 때문에 기본으로 64 커널 사이클을 가정해 요청을 스케줄하고, 실제 지연과 다르면 처리량을 잃을 수 있다고 적습니다. 이 커널을 1024 샘플로 돌린 결과는 위 스트림 버전과 샘플 단위로 같았습니다(아래 "재현 절차"의 `tb2`).

### 3단 dataflow

세 단계 함수를 stream으로 이어 DATAFLOW로 묶은 예입니다. `STREAM depth`로 단계 사이 FIFO 깊이를 정합니다. UG1399는 이런 stream의 기본 깊이를 2로 적습니다.

```cpp
static void scale(hls::stream<int16_t> &in, hls::stream<int32_t> &out, int n) {
    for (int i = 0; i < n; i++) {
#pragma HLS PIPELINE II=1
        out.write((int32_t)in.read() * 3);
    }
}
/* offset(): + 1000, clip(): saturate to int16 -- same shape */

void pipe3(hls::stream<int16_t> &in, hls::stream<int16_t> &out, int n) {
#pragma HLS DATAFLOW
    hls::stream<int32_t> s1, s2;
#pragma HLS STREAM variable=s1 depth=32
#pragma HLS STREAM variable=s2 depth=32
    scale (in, s1, n);
    offset(s1, s2, n);
    clip  (s2, out, n);
}
```

```text
fir_mm vs fir (stream): 1024 samples, 0 differences
pipe3 dataflow: 1024 samples, 0 mismatches
INFO [HLS SIM]: The maximum depth reached by any hls::stream() instance in the design is 1024
```

C 시뮬레이션은 세 함수를 차례로 실행하므로, 하드웨어에서 세 단계가 동시에 도는지는 이 실행으로 알 수 없습니다. 그것은 합성 뒤 dataflow 보고서와 co-simulation에서 확인하는 항목입니다. C 시뮬레이션이 확인해 주는 것은 단계를 나눠도 결과가 같다는 점입니다.

### 누적 loop가 II=1을 못 맞추는 경우

float 누적은 대표적인 loop-carried 의존성입니다. 이번 iteration의 덧셈이 끝나야 다음 덧셈을 시작할 수 있기 때문입니다.

```cpp
float sum = 0;                                  /* one dependency chain */
for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    sum += b[i];
}

float partial[4] = {0};                         /* four independent chains */
for (int i = 0; i < N; i++) {
#pragma HLS PIPELINE II=1
    partial[i & 3] += b[i];
}
float total = (partial[0] + partial[1]) + (partial[2] + partial[3]);
```

UG1399 "Floats and Doubles" 절은 Versal이 아닌 디바이스에서 표준 정밀도 부동소수점 누적이 보통 II 3~5로 pipeline된다고 적습니다(Versal에서는 II=1, non-Versal 전용인 저정밀 누적 모드는 II=1). 또 Vitis HLS는 C 시뮬레이션과 결과를 맞추려고 float·double 연산 순서를 C 코드대로 지킵니다(`config_compile -unsafe_math_optimizations`로 풀 수 있음). 그래서 순서를 바꾸는 4갈래 누적은 도구가 알아서 해 주지 않고 코드로 써야 합니다.

순서를 바꾸면 결과도 바뀝니다. `b[i] = 1/(i+1)`을 10만 개 더해 본 결과입니다.

```text
serial=12.0908508 four-way=12.0901299 double=12.0901461954
```

두 float 결과가 소수 넷째 자리에서 다릅니다. testbench가 C 코드 결과와 비트 단위로 비교한다면 이 차이를 허용 오차로 다뤄야 합니다. 정수 누적은 덧셈이 그대로 결합법칙을 지키므로 이 문제가 없습니다.

### 정확한 비트폭, `ap_int`·`ap_fixed`

`ap_uint<W>`·`ap_int<W>`는 W비트 정수, `ap_fixed<W, I>`는 전체 W비트 중 부호 비트를 포함한 정수부가 I비트인 고정소수점입니다(UG1399 "Overview of Arbitrary Precision Fixed-Point Data Types"). 같은 절은 기본 양자화 모드를 `AP_TRN`(음의 무한대 쪽으로 버림), 기본 오버플로 모드를 `AP_WRAP`(wrap around)으로 적습니다.

```cpp
ap_uint<10> x = 1023; x++;                       /* wraps */
ap_int<24> s = (1 << 23) - 1;
ap_fixed<16, 1> g = 0.5, lo = -1.0, hi = 0.99999;
ap_fixed<16, 1> over = 1.0;                       /* out of range */
```

```text
ap_uint<10> 1023+1 = 0
ap_int<24> max = 8388607
ap_fixed<16,1>: 0.5=0.500000 -1.0=-1.000000 0.99999->0.999969 1.0->-1.000000 lsb=0.0000305176
```

`ap_fixed<16,1>`은 -1.0 이상 1.0 미만을 2^-15(약 0.0000305) 간격으로 표현하는 Q1.15입니다. 0.99999는 `AP_TRN`으로 0.999969가 되고, 범위를 넘는 1.0은 `AP_WRAP`으로 -1.0이 됩니다. 이득(gain)처럼 1.0이 들어올 수 있는 값을 이 타입에 담으면 부호가 뒤집힌다는 뜻입니다.

## 측정 / 성능 비교

이 글에는 합성 결과 표가 없습니다. II·처리율·DSP·LUT·burst 대역은 디바이스·클록·도구 버전마다 달라지는 합성 결과이고, 이 글은 Vitis HLS를 실행하지 않았기 때문입니다.

직접 비교하려면 같은 C++ 코드로 아래를 바꿔 가며 C synthesis를 돌리고, UG1399가 말하는 함수별 합성 보고서(II, latency, 자원)와 m_axi의 burst 요약을 기록합니다.

| 바꿀 것 | 기록할 것 |
|---|---|
| ARRAY_PARTITION 유무, UNROLL 유무 | loop별 achieved II, 경고(`SCHED 69` 등), DSP·LUT·FF·BRAM |
| `max_read_burst_length` | 보고서의 burst 성공/실패 요약, co-simulation 처리 사이클 |
| 대상 디바이스·클록 | float 누적 loop의 II(UG1399 기준 non-Versal 3~5, Versal 1) |

## 자주 보는 함정

> 같은 버퍼를 가리키는 두 `m_axi` 포인터

```cpp
void foo(int *a, int *b, int n) {
    for (int i = 0; i < n; i++) {
#pragma HLS PIPELINE II=1
        a[i] = b[i] + 1;
    }
}
```

C 컴파일러라면 `a`와 `b`가 겹칠 수 있다고 보고 조심스럽게 다루지만, HLS는 반대입니다. UG1399의 `pragma HLS alias` 절은 Vitis HLS가 서로 다른 포인터를 독립된 채널로 보고 대체로 의존성 분석을 하지 않는다고 적습니다. 그래서 호스트가 한 버퍼를 잘라 `a`와 `b`로 넘기는데 둘이 겹치면, 도구는 그 사실을 모른 채 하드웨어를 만듭니다. 이때는 ALIAS pragma로 두 포인터 사이 거리(offset)를 알려 줘야 의존성 분석이 유지되고, 이 pragma는 `m_axi`에 매핑된 최상위 함수 인자에만 적용됩니다. 반대로 같은 배열 안에서 도구가 너무 보수적으로 잡은 거짓 의존성은 DEPENDENCE pragma로 풀 수 있지만, 실제로 있는 의존성을 false로 지정하면 잘못된 하드웨어가 나온다고 같은 문서의 `pragma HLS dependence` 절이 경고합니다.

> 동적 메모리, 재귀, 시스템 호출

```cpp
int *buf = (int *)malloc(N * sizeof(int));   /* 회피: not synthesizable */
unsigned fib(unsigned n) { return n < 2 ? 1 : fib(n - 1) + fib(n - 2); }
printf("%d\n", x);                            /* ignored by synthesis */
```

UG1399 "Unsupported C/C++ Constructs" 계열 절은 `malloc()`·`free()` 같은 메모리 할당 호출을 합성 전에 제거해야 하고, 재귀 함수(꼬리 재귀 포함)는 합성되지 않으며, `printf()`·`fprintf(stdout, …)`처럼 값을 출력만 하는 호출은 무시된다고 적습니다. 합성 대상 함수 안의 시뮬레이션 전용 코드(파일 출력 등)는 `#ifndef __SYNTHESIS__`로 제외할 수 있고, 같은 절은 이 매크로를 testbench에는 쓰지 말라고 적습니다.

> float을 그대로 쓰고 II=1을 기대

위 누적 예처럼 non-Versal에서 표준 정밀도 float 누적은 UG1399 기준 보통 II 3~5입니다. 고정소수점으로 충분하다면 `ap_fixed`로 바꾸고, float가 필요하면 부분합을 나누거나 디바이스·연산자 설정(`syn.op`)을 검토합니다.

> ARRAY_PARTITION 없이 UNROLL만

```cpp
int buf[1024];
for (int i = 0; i < 1024; i++) {
#pragma HLS UNROLL factor=4
    sum += buf[i];
}
```

펼친 네 iteration이 같은 배열을 읽으면 접근 수가 포트 수를 넘습니다. single-port면 한 사이클에 한 번, dual-port여도 두 번입니다("Array Accesses and Performance"). `cyclic factor=4`로 나눠 네 접근이 서로 다른 조각으로 가게 해야 펼친 효과가 납니다.

> Dataflow 채널 규칙 위반

배열을 dataflow 단계 사이에 넘기는 것 자체는 문제가 아닙니다. 기본이 PIPO이기 때문입니다. 문제가 되는 것은 배열·stream 채널 하나를 두 프로세스가 쓰거나 두 프로세스가 읽는 경우, 그리고 dataflow 함수 안에 static 지역 변수를 두는 경우입니다. UG1399 "WYSIWYG Coding Style" 절은 채널마다 writer 하나와 reader 하나를 요구하고(배열 reader 여럿은 `bind_storage`로 지정할 때만), dataflow 영역의 지역 변수는 static이 아니어야 한다고 적습니다.

> 읽기만 하는 계수 배열을 일반 RAM으로 둠

UG1399 "Implementing ROMs" 절은 읽기만 하는 배열에 `const`를 붙이라고 권하고, 도구가 ROM으로 추론하는 일반 규칙은 "지역 static 배열이 읽히기 전에 모두 쓰이고 다시 쓰이지 않는 경우"라고 적습니다. 계수가 런타임에 바뀌지 않는다면 `s_axilite` 인자 대신 `static const` 배열로 두는 쪽을 검토합니다.

## 정리

- 다섯 pragma(INTERFACE·PIPELINE·UNROLL·ARRAY_PARTITION·DATAFLOW)가 HLS 구조의 대부분을 정합니다.
- PIPELINE은 아래 loop를 모두 펼칩니다. 안쪽 loop 경계가 변수면 pipelining이 막힙니다.
- II가 안 나오면 배열 포트(single 1회, dual 2회/사이클)와 loop-carried 의존성을 먼저 봅니다.
- 표준 정밀도 float 누적은 non-Versal에서 보통 II 3~5이고, 도구는 float 순서를 바꾸지 않으므로 부분합은 코드로 나눕니다. 결과도 바뀝니다.
- `ap_fixed<16,1>`은 Q1.15이고 기본이 버림·wrap이라 1.0이 -1.0이 됩니다.
- testbench는 커널이 호출당 소비·생산하는 개수를 따라야 합니다.
- 합성 결과(II·자원)는 보고서로만 알 수 있습니다. 이 글의 실행은 C 시뮬레이션까지입니다.

다음 편은 **HLS 최적화 기법**입니다.

## 재현 절차

- 헤더: `git clone https://github.com/Xilinx/HLS_arbitrary_Precision_Types` (커밋 `200a9ae`). `hls_stream.h`: `git clone https://github.com/Xilinx/hls-lib-stream` (커밋 `e7e04ab`).
- 컴파일러: Homebrew GCC 16.2.0(`g++-16`). macOS의 Apple clang 21은 libc++의 `std::complex`와 `ap_int_special.h`의 전방 선언이 충돌해 이 헤더를 빌드하지 못했습니다.
- FIR: `g++-16 -std=c++17 -O2 -Wno-unknown-pragmas -I<apt>/include -I<hls-lib-stream> fir.cpp fir_tb.cpp`.
- m_axi·dataflow: 같은 옵션으로 `fir.cpp fir_mm.cpp pipe3.cpp tb2.cpp`.
- 타입·누적: `g++-16 -std=c++17 -O2 -w -I<apt>/include types.cpp`, `g++-16 -O2 accum.cpp`.

## 관련 항목

- [11-09: PCIe Streaming](/blog/embedded/modern-recipes/part11-09-pcie-streaming)
- [11-11: HLS 최적화](/blog/embedded/modern-recipes/part11-11-hls-optimization)
- [11-04: AXI](/blog/embedded/modern-recipes/part11-04-axi)
- [7-11: UIO·VFIO](/blog/embedded/modern-recipes/part7-11-uio-vfio)
