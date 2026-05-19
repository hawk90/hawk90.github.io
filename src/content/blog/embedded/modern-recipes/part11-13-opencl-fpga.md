---
title: "11-13: OpenCL on FPGA — Kernel·Channel·Burst Memory"
date: 2026-05-17T15:00:00
description: "Intel/AMD FPGA에서 OpenCL kernel·channel·burst memory를 활용하는 패턴과 SYCL/oneAPI FPGA backend."
series: "Modern Embedded Recipes"
seriesOrder: 135
tags: [recipes, fpga, opencl, sycl]
---

## 한 줄 요약

> **"OpenCL on FPGA는 *kernel 함수가 곧 하드웨어 회로*가 되는 모델입니다."** 같은 OpenCL 코드를 GPU처럼 던지지 않고, FPGA pipeline에 맞춰 *single-work-item kernel + channel + restrict + ivdep*를 활용합니다.

## 어떤 상황에서 쓰나

Intel Stratix/Arria/Cyclone, AMD Alveo, 일부 Xilinx Vitis flow에서 OpenCL/SYCL을 지원합니다. CUDA·C++ AMP에 익숙한 사람이 FPGA에 진입할 때 첫 선택입니다. HLS C++와 비슷한 위치지만 더 *kernel-centric* 모델입니다.

GPU OpenCL과 코드 자체는 호환되지만, FPGA에 *throughput*을 내려면 사고방식이 완전히 다릅니다. GPU는 *수천 work-item을 동시에*, FPGA는 *deep pipeline 하나로 throughput*.

## 핵심 개념 — Single Work-Item Kernel

GPU OpenCL:

```c
__kernel void vec_add(__global float *a, __global float *b, __global float *c) {
    int i = get_global_id(0);
    c[i] = a[i] + b[i];
}
// host: clEnqueueNDRangeKernel(...) global_size = 1024
```

GPU는 1024개 work-item을 thread로 띄움.

FPGA에 효율적인 형태:

```c
__kernel void vec_add(__global float *a, __global float *b,
                      __global float *c, int n) {
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}
```

`for` loop가 FPGA pipeline으로 합성. Loop iteration이 cycle마다 새 데이터 처리 (II=1).

```bash
# Intel OpenCL FPGA compiler
aoc -board=p520_max_sg280l vec_add.cl -o vec_add.aocx
```

`vec_add.aocx`는 bitstream + kernel metadata.

## Channel — Kernel 간 통신

Channel은 kernel 사이의 *FIFO*. Producer-consumer pipeline을 만듭니다.

```c
#pragma OPENCL EXTENSION cl_intel_channels : enable
channel float c1 __attribute__((depth(1024)));
channel float c2 __attribute__((depth(1024)));

__kernel void producer(__global float *in, int n) {
    for (int i = 0; i < n; i++) {
        float x = in[i];
        write_channel_intel(c1, x);
    }
}

__kernel void filter(int n) {
    for (int i = 0; i < n; i++) {
        float x = read_channel_intel(c1);
        write_channel_intel(c2, x * 0.5f);
    }
}

__kernel void consumer(__global float *out, int n) {
    for (int i = 0; i < n; i++) {
        out[i] = read_channel_intel(c2);
    }
}
```

세 kernel이 *동시에* 동작. Producer가 빠르면 channel에 쌓이고, consumer가 느리면 producer는 wait. Pipeline backpressure.

Xilinx의 stream과 같은 개념입니다.

## Burst memory access

```c
__kernel void vec_add(__global const float * restrict a,
                      __global const float * restrict b,
                      __global       float * restrict c,
                      int n) {
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}
```

`restrict` qualifier로 *pointer aliasing 없음*을 알려줌. Compiler가 burst load/store로 합성. 없으면 cycle마다 1 word, 있으면 burst로 16~256 word.

`ivdep` (Intel)은 *loop carried dependency 없음*을 알려줌.

```c
#pragma ivdep
for (int i = 0; i < n; i++) {
    out[i] = process(in[i]);
}
```

## Local memory — On-chip BRAM

```c
__kernel void conv2d(__global const float *in, __global float *out,
                     int h, int w) {
    __local float buf[3][MAX_W];     // BRAM에 매핑
    // ... line buffer 패턴
}
```

`__local`은 work-group 공유 메모리 (BRAM). `__private`는 work-item private (register).

## Loop unroll

```c
__kernel void mac(__global float *a, __global float *b, float *out) {
    float sum = 0;
    #pragma unroll
    for (int i = 0; i < 8; i++) {
        sum += a[i] * b[i];
    }
    *out = sum;
}
```

`#pragma unroll`로 inner loop를 펼침. 8개 MAC을 *병렬*. HLS의 UNROLL과 동일.

## NDRange vs Single Work-Item

```c
// NDRange (GPU style)
__kernel void vec_add_ndr(__global float *a, __global float *b, __global float *c) {
    int i = get_global_id(0);
    c[i] = a[i] + b[i];
}

// Single work-item (FPGA style)
__kernel void vec_add_swi(__global float *a, __global float *b, __global float *c, int n) {
    for (int i = 0; i < n; i++)
        c[i] = a[i] + b[i];
}
```

FPGA에서 둘 다 가능하지만 *single work-item이 throughput 더 좋습니다*. NDRange는 pipeline II 분석이 어렵고, work-item 간 share register가 비쌉니다.

## Host code (Intel OpenCL)

```c
#include <CL/cl.h>

int main() {
    cl_platform_id plat;
    cl_device_id dev;
    clGetPlatformIDs(1, &plat, NULL);
    clGetDeviceIDs(plat, CL_DEVICE_TYPE_ACCELERATOR, 1, &dev, NULL);

    cl_context ctx = clCreateContext(NULL, 1, &dev, NULL, NULL, NULL);
    cl_command_queue q = clCreateCommandQueue(ctx, dev, 0, NULL);

    // Load aocx
    FILE *f = fopen("vec_add.aocx", "rb");
    fseek(f, 0, SEEK_END);
    size_t sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    uint8_t *bin = malloc(sz);
    fread(bin, sz, 1, f);
    fclose(f);

    cl_program prog = clCreateProgramWithBinary(ctx, 1, &dev, &sz,
                                                 (const uint8_t**)&bin, NULL, NULL);
    clBuildProgram(prog, 1, &dev, "", NULL, NULL);
    cl_kernel k = clCreateKernel(prog, "vec_add", NULL);

    // Buffers
    cl_mem ba = clCreateBuffer(ctx, CL_MEM_READ_ONLY,  N*sizeof(float), NULL, NULL);
    cl_mem bb = clCreateBuffer(ctx, CL_MEM_READ_ONLY,  N*sizeof(float), NULL, NULL);
    cl_mem bc = clCreateBuffer(ctx, CL_MEM_WRITE_ONLY, N*sizeof(float), NULL, NULL);

    clEnqueueWriteBuffer(q, ba, CL_TRUE, 0, N*sizeof(float), host_a, 0, NULL, NULL);
    clEnqueueWriteBuffer(q, bb, CL_TRUE, 0, N*sizeof(float), host_b, 0, NULL, NULL);

    clSetKernelArg(k, 0, sizeof(cl_mem), &ba);
    clSetKernelArg(k, 1, sizeof(cl_mem), &bb);
    clSetKernelArg(k, 2, sizeof(cl_mem), &bc);
    int n = N;
    clSetKernelArg(k, 3, sizeof(int), &n);

    size_t one = 1;
    clEnqueueTask(q, k, 0, NULL, NULL);    /* single work-item */
    clFinish(q);

    clEnqueueReadBuffer(q, bc, CL_TRUE, 0, N*sizeof(float), host_c, 0, NULL, NULL);
}
```

NDRange면 `clEnqueueNDRangeKernel`을 씁니다.

## SYCL / oneAPI FPGA Backend

Intel oneAPI는 SYCL (C++ 기반 OpenCL 후속)로 FPGA를 다룹니다.

```cpp
#include <sycl/sycl.hpp>
#include <sycl/ext/intel/fpga_extensions.hpp>

using namespace sycl;

int main() {
    queue q{ext::intel::fpga_emulator_selector{}};   // emulator
    // or fpga_selector{} for real hardware

    constexpr int N = 1024;
    std::vector<float> a(N, 1.0f), b(N, 2.0f), c(N);

    {
        buffer ba{a}, bb{b}, bc{c};
        q.submit([&](handler &h) {
            accessor aa{ba, h, read_only};
            accessor ab{bb, h, read_only};
            accessor ac{bc, h, write_only, no_init};
            h.single_task<class vadd>([=]() {
                for (int i = 0; i < N; i++)
                    ac[i] = aa[i] + ab[i];
            });
        });
    }

    for (int i = 0; i < 4; i++) std::cout << c[i] << "\n";
}
```

`single_task<>`가 single work-item kernel. C++ template으로 컴파일 시간 unroll·pipeline 가능.

## 사례 — FIR Filter

```c
__kernel void fir(__global const float *in, __global float *out, int n) {
    float buf[8] = {0};
    const float coef[8] = {0.1f, 0.2f, 0.3f, 0.4f, 0.4f, 0.3f, 0.2f, 0.1f};

    for (int i = 0; i < n; i++) {
        #pragma unroll
        for (int j = 7; j > 0; j--) buf[j] = buf[j-1];
        buf[0] = in[i];

        float sum = 0;
        #pragma unroll
        for (int j = 0; j < 8; j++) sum += coef[j] * buf[j];

        out[i] = sum;
    }
}
```

Inner loop unroll로 한 cycle 8 MAC. II=1 outer pipeline으로 100 MSPS.

## Profile / Report

```bash
aoc -board=... -report fir.cl
```

Report HTML이 생성됩니다.

```text
Throughput:    100 MSPS
II:            1
Latency:       12 cycles
Resource:
  ALM:         3500 / 245440  (1.4%)
  DSP:         8
  M20K:        2
  Logic util:  2.1%
```

II=1 확인. Resource utilization과 throughput 모두 보고서에서.

## Xilinx Vitis OpenCL

Xilinx Vitis도 OpenCL flow를 지원하지만 *HLS 기반*으로 합성. 거의 같은 코드.

```cpp
// host
auto kernel = xrt::kernel(device, uuid, "vec_add");
auto run = kernel(a_buf, b_buf, c_buf, N);
run.wait();
```

XRT (Xilinx Runtime)이 OpenCL 위에 더 thin abstraction을 제공합니다.

## 자주 보는 함정

> NDRange로 GPU처럼 짜기

```c
__kernel void foo(__global float *a) {
    int i = get_global_id(0);
    a[i] = a[i] * 2.0f;
}
// global_size = 1024
```

FPGA에서 work-item 1024개 = pipeline 1개에 1024 iteration. 단순한 case는 single work-item이 더 빠르고 명확.

> restrict 누락

```c
__kernel void f(__global float *in, __global float *out, int n) {
    for (int i = 0; i < n; i++) out[i] = in[i];
}
// → in과 out이 alias 가능 → cycle마다 1 access
```

`restrict` 한 단어로 burst memory 활용.

> Channel depth 부족

```c
channel float c __attribute__((depth(4)));
```

Depth 4면 backpressure 잦음. Producer/consumer 속도 차이 흡수에 1024 정도가 보통.

> Floating point 가정

GPU는 native float, FPGA는 float에 *수십 cycle*. Fixed point가 훨씬 가볍습니다.

> emulator만으로 끝낸 가정

```bash
aoc -march=emulator      # emulator: 빠른 functional test
aoc -board=...           # real hardware: 빌드 수 시간
```

Emulator에서 동작해도 real hardware에서는 resource 부족, timing fail 가능. *Report*도 함께 확인.

> Multiple kernel 메모리 충돌

같은 DDR을 여러 kernel이 동시 access하면 bandwidth contention. Bank를 다르게 할당하거나 sequential 실행.

## 정리

- OpenCL on FPGA는 *kernel = pipeline 회로*. Single work-item이 일반적.
- Channel로 kernel 간 producer-consumer pipeline.
- `restrict`로 burst load/store, `ivdep`로 dependency 해소.
- Local memory가 BRAM, private가 register.
- Intel `aoc`, Xilinx Vitis 둘 다 지원. SYCL은 그 위 C++ 추상.
- NDRange보다 single work-item + loop가 FPGA 친화적.
- Report HTML로 II/throughput/resource 항상 확인.
- Emulator 통과 ≠ real hardware 통과.

다음 편은 **Intel Quartus 사용법**입니다.

## 관련 항목

- [11-10: HLS](/blog/embedded/modern-recipes/part11-10-hls)
- [11-11: HLS 최적화](/blog/embedded/modern-recipes/part11-11-hls-optimization)
- [11-12: Vitis AI](/blog/embedded/modern-recipes/part11-12-vitis-ai)
- [11-14: Intel Quartus](/blog/embedded/modern-recipes/part11-14-intel-quartus)
