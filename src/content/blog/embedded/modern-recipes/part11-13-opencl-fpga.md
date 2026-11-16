---
title: "OpenCL on FPGA — Kernel·Channel·Burst Memory 분석"
slug: "embedded/modern-recipes/part11-13-opencl-fpga"
date: 2026-04-20T09:12:00
description: "Intel FPGA SDK for OpenCL의 single work-item kernel·channel·ivdep·aoc 흐름을 Pro Edition 22.3 Programming/Best Practices Guide로 정리하고, oneAPI SYCL·AMD XRT로 넘어간 현재 상태를 소스로 확인합니다. 커널 코드는 Apple GPU OpenCL에서 기능만 검증합니다."
series: "Modern Embedded Recipes"
seriesOrder: 135
tags: [recipes, fpga, opencl, sycl]
topics: ["embedded"]
---

## 한 줄 요약

> **"OpenCL on FPGA에서는 kernel 함수가 그대로 회로가 되고, GPU처럼 work-item을 많이 띄우기보다 loop 하나를 깊은 pipeline으로 만드는 single work-item kernel이 기본입니다."** kernel 사이는 channel(FIFO)로 잇고, loop의 메모리 의존성은 `ivdep`로 풉니다.

## 어떤 상황에서 쓰나

Intel(현 Altera) FPGA에서 OpenCL로 가속기를 만들던 흐름이 Intel FPGA SDK for OpenCL이고, 오프라인 컴파일러 `aoc`가 `.cl` 커널을 FPGA 비트스트림이 들어 있는 `.aocx`로 만듭니다. CUDA나 GPU OpenCL을 써 본 사람이라면 호스트 코드는 익숙하지만, FPGA에서 처리율을 내는 커널 모양은 GPU와 다릅니다.

이 흐름은 이미 단종됐다는 점부터 짚습니다. docs.altera.com의 *Intel FPGA SDK for OpenCL Pro Edition Version 22.4 Release Notes* 첫 절 "Product Discontinuance Notification"은 Intel이 Intel FPGA SDK for OpenCL 제품을 단종한다고 알리고(Product Discontinuation Notice PDN2219), 대신 SYCL 컴파일러가 든 oneAPI Base Toolkit과 *Migrating OpenCL FPGA Designs to SYCL* 가이드를 권합니다. 같은 릴리스 노트는 22.4에 새 기능이 없다고 적습니다. 이 글이 인용하는 *Programming Guide*(683846)와 *Best Practices Guide*(683521)는 그 직전 판인 22.3(2022.09.26) PDF에서 확인했습니다. 그런데 그 SYCL 쪽도 오픈소스 DPC++ 저장소([intel/llvm](https://github.com/intel/llvm))에서는 2025-12-16 커밋 `e4cbcf5`("Remove fpga features from SYCL RT", #20882)로 `sycl_ext_intel_fpga_device_selector`를 비롯한 FPGA 확장이 제거됐습니다. 그래서 이 글은 OpenCL SDK 22.3 문서를 기준으로 개념과 코드 모양을 설명하고, 지금 새로 시작한다면 무엇을 확인해야 하는지를 덧붙입니다.

> **실행한 것과 하지 않은 것.** `aoc`, Intel FPGA 보드, oneAPI FPGA 툴체인, AMD Vitis/XRT는 이 환경에 없어 실행하지 않았습니다. Intel 전용 확장(`cl_intel_channels`)이 없는 커널은 macOS의 OpenCL(Apple M2 Pro GPU 장치)에서 돌려 **결과가 맞는지만** 확인했습니다. GPU에서 돈 결과는 FPGA에서의 II·자원·처리율에 대해 아무것도 말해 주지 않습니다.

## 핵심 개념 — Single Work-Item Kernel

GPU OpenCL은 같은 커널을 work-item 수천 개로 띄워 데이터 병렬로 처리합니다. 수천 명의 학생이 같은 문제를 하나씩 맡아 푸는 모양입니다. FPGA에서는 회로 하나를 조립 라인처럼 깊게 만들어, 매 사이클 새 데이터가 라인에 들어가게 합니다.

```c
// NDRange (GPU style): one work-item per element
__kernel void vec_add_ndr(__global const float *a, __global const float *b,
                          __global float *c) {
    int i = get_global_id(0);
    c[i] = a[i] + b[i];
}

// Single work-item (FPGA style): one loop, pipelined
__kernel void vec_add_swi(__global const float * restrict a,
                          __global const float * restrict b,
                          __global       float * restrict c, int n) {
    for (int i = 0; i < n; i++)
        c[i] = a[i] + b[i];
}
```

*Best Practices Guide* 22.3의 1.3절 "Single Work-Item Kernel versus NDRange Kernel"은 가능하면 커널을 single work-item으로 짜라고 권합니다. single work-item 커널은 NDRange 크기 (1, 1, 1)로 띄운 것과 같고, 컴파일러는 loop iteration을 pipeline해서 여러 단계를 동시에 처리하는 방식으로 처리율을 냅니다. 같은 절은 work-item 사이에 세밀하게 데이터를 나눠야 하는 경우 NDRange 모델이 맞지 않고, single work-item은 C처럼 순차 모델이라 데이터를 work-item에 나눌 필요가 없다고 설명합니다. 반대로 여러 스레드를 명시적으로 기술하는 쪽이 이득인 프로그램은 NDRange로 짜도 된다고 적습니다.

두 커널은 같은 답을 내야 합니다. 호스트에서 NDRange 커널은 `clEnqueueNDRangeKernel`로, single work-item 커널은 `clEnqueueTask`로 띄웁니다(*Programming Guide* 22.3의 호스트 절차). Apple GPU OpenCL에서 두 커널을 4096개 원소로 돌려 비교했습니다.

```text
device: Apple M2 Pro
vec_add: NDRange vs clEnqueueTask, 4096 samples, 0 mismatches
```

같은 프로그램을 `CL_DEVICE_TYPE_CPU`로 돌리면 `clGetDeviceIDs`가 -30(`CL_INVALID_VALUE`)을 돌려줘, 이 Mac의 OpenCL에서는 CPU 장치를 쓸 수 없었습니다.

## 컴파일 흐름 — `aoc`와 `.aocx`

```bash
aoc -march=emulator vec_add.cl                 # functional check on the host CPU
aoc -rtl vec_add.cl -report                     # stop before hardware, print estimates
aoc -board=<board_name> vec_add.cl -report      # full hardware compile -> vec_add.aocx
```

*Programming Guide* 22.3의 2장은 `.aocx`를 "실행 시점에 FPGA를 프로그래밍하는 데 필요한 정보를 담은 하드웨어 구성 파일"로 설명하고, 호스트는 이 파일로 OpenCL program 객체를 만든다고 적습니다. 같은 장의 흐름 그림은 emulator 컴파일 시간을 "seconds", `-c`·`-rtl` 단계를 "seconds to minutes", 전체 하드웨어 컴파일을 "hours"로 적습니다. `-report`는 자원 사용 추정 요약을 화면에 찍는 옵션입니다(7.11절). `-board=`에는 설치된 보드 지원 패키지가 정의한 보드 이름을 넣습니다.

## Channel — kernel 사이 FIFO

여러 커널을 생산자-소비자로 이으려면 Intel 확장 channel을 씁니다. 공장 라인 사이의 컨베이어 벨트처럼, 앞 커널이 올려놓은 데이터를 뒤 커널이 순서대로 집어 갑니다.

```c
#pragma OPENCL EXTENSION cl_intel_channels : enable
channel float c1 __attribute__((depth(1024)));
channel float c2 __attribute__((depth(1024)));

__kernel void producer(__global const float * restrict in, int n) {
    for (int i = 0; i < n; i++)
        write_channel_intel(c1, in[i]);
}

__kernel void filter(int n) {
    for (int i = 0; i < n; i++)
        write_channel_intel(c2, read_channel_intel(c1) * 0.5f);
}

__kernel void consumer(__global float * restrict out, int n) {
    for (int i = 0; i < n; i++)
        out[i] = read_channel_intel(c2);
}
```

*Programming Guide* 22.3의 channel 절에 따르면 `write_channel_intel`은 FIFO가 차 있으면 자리가 날 때까지 커널을 멈추는 blocking 쓰기이고, `depth` 속성은 FIFO의 버퍼 용량을 늘립니다. 그리고 "한 커널이 같은 channel에 여러 번 쓸 수는 있지만, 여러 커널이 같은 channel에 쓸 수는 없다"(읽기도 같음)는 제약이 있습니다. 세 커널을 동시에 돌리려면 같은 문서 6.1.5절대로 커널마다 별도의 in-order command queue를 만들거나, out-of-order queue 하나에 서로 의존하지 않는 커널을 넣습니다. in-order queue 하나는 앞 작업이 끝나야 다음 작업을 내보내기 때문입니다. 이 코드는 Apple OpenCL에 `cl_intel_channels`가 없어 실행하지 않았습니다.

AMD Vitis HLS의 `hls::stream`이 같은 역할입니다([11-10 Vitis HLS](/blog/embedded/modern-recipes/part11-10-hls)). SYCL로 옮기면 channel은 pipe API가 맡고, *Migrating OpenCL FPGA Designs to SYCL*의 "Channels/Pipes APIs" 절에 대응표가 있습니다.

## Loop-carried 의존성과 `ivdep`

```c
#pragma ivdep
for (int i = 0; i < n; i++)
    out[idx[i]] = process(in[i]);
```

*Best Practices Guide* 22.3의 6.1.5절은 컴파일러가 의존 관계가 있을 수 있는 load·store의 순서를 지키는 하드웨어를 넣는데, `ivdep`는 바로 다음 loop의 메모리 배열 접근이 loop-carried 의존성을 만들지 않는다고 단언해 그 하드웨어를 없애고 II를 낮출 수 있게 한다고 설명합니다. `safelen(N)`을 붙이면 의존성이 없는 연속 iteration 수를 알려 줄 수 있습니다.

단언이 틀리면 결과가 틀립니다. *Programming Guide* 22.3은 emulator와 하드웨어 결과가 다른 가장 흔한 이유의 첫째로 이 경우를 꼽습니다. emulator는 `ivdep`로 깨진 실제 의존성을 모델링하지 않으므로, emulator에서는 맞고 하드웨어 컴파일 뒤에야 틀린 결과로 드러납니다.

## Loop unroll

```c
float sum = 0;
#pragma unroll
for (int i = 0; i < 8; i++)
    sum += a[i] * b[i];
```

`#pragma unroll`은 loop 본문을 복제하고, `#pragma unroll <N>`은 최대 N배까지 펼칩니다(*Programming Guide* 22.3, 5.2.1절 "Unrolling a Loop"). 문서는 펼치면 loop 제어 오버헤드를 줄이고, loop-carried 의존성이 없고 iteration을 병렬로 처리할 수 있으면 지연과 오버헤드도 줄인다고 적습니다. 이 예처럼 float 누적이면 덧셈 순서가 사슬로 남는데, `aoc -ffp-reassociate`(7.20절)는 float 연산 순서를 균형 트리로 바꿔도 된다고 허락하는 옵션이고, 문서는 그 대가로 결과에 작은 수치 차이가 생긴다고 적습니다.

## `__local` 메모리

```c
__kernel void conv_row(__global const float * restrict in,
                       __global float * restrict out, int w) {
    __local float line[3][MAX_W];        /* on-chip memory */
    /* ... line-buffer pattern ... */
}
```

*Best Practices Guide* 22.3은 local memory가 하나 또는 여러 개의 M20K 블록(on-chip RAM)으로 구현되는 그림을 보여 줍니다. 몇 개 블록, 몇 개 포트로 구현될지는 접근 패턴에 따라 컴파일러가 정하므로 보고서에서 확인합니다.

## 사례 — FIR filter

8-tap FIR을 single work-item으로 쓴 것입니다. 바깥 loop가 pipeline되고, 안쪽 두 loop는 `#pragma unroll`로 펼쳐 탭마다 곱셈기를 둡니다.

```c
__kernel void fir(__global const float * restrict in,
                  __global       float * restrict out, int n) {
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

Apple GPU에서 `clEnqueueTask`로 4096개 샘플을 돌려 C로 직접 계산한 값과 비교한 결과입니다.

```text
fir: 4096 samples, max |device - C| = 0
```

이 커널이 FPGA에서 II=1이 되는지, DSP를 몇 개 쓰는지는 `aoc -report`나 HTML 보고서로만 알 수 있고 이 글에는 그 값이 없습니다. *Programming Guide* 22.3도 single work-item 커널이라면 최적화 보고서가 성능 병목을 짚어 준다고 적습니다.

## 호스트 코드 (Intel OpenCL)

FPGA에서는 커널을 런타임에 소스로 컴파일하지 않고, `aoc`가 만든 `.aocx`를 `clCreateProgramWithBinary`로 올립니다(*Programming Guide* 22.3).

```c
FILE *f = fopen("vec_add.aocx", "rb");
fseek(f, 0, SEEK_END);
size_t sz = ftell(f);
fseek(f, 0, SEEK_SET);
unsigned char *bin = malloc(sz);
fread(bin, 1, sz, f);
fclose(f);

cl_int st, bin_st;
cl_program prog = clCreateProgramWithBinary(ctx, 1, &dev, &sz,
                        (const unsigned char **)&bin, &bin_st, &st);
clBuildProgram(prog, 1, &dev, "", NULL, NULL);
cl_kernel k = clCreateKernel(prog, "vec_add_swi", &st);
/* clSetKernelArg(...) x4, then: */
clEnqueueTask(q, k, 0, NULL, NULL);            /* single work-item */
clFinish(q);
```

위 GPU 실행은 같은 순서에서 `clCreateProgramWithBinary` 대신 `clCreateProgramWithSource`를 썼고, 나머지(버퍼, `clSetKernelArg`, `clEnqueueTask`, `clEnqueueReadBuffer`)는 같습니다.

## SYCL / oneAPI로 옮길 때

Intel의 *Migrating OpenCL FPGA Designs to SYCL*(2024)은 OpenCL의 `clEnqueueTask`가 SYCL의 `single_task`에, `aoc -march=emulator`가 `icpx -fsycl -fintelfpga` 계열 플래그에 대응한다고 보여 주고, 예제는 `queue device_queue(ext::intel::fpga_selector());`로 장치를 고릅니다.

```cpp
#include <sycl/sycl.hpp>
#include <sycl/ext/intel/fpga_extensions.hpp>
using namespace sycl;

queue q{ext::intel::fpga_emulator_selector_v};   // or fpga_selector_v
q.submit([&](handler &h) {
    accessor aa{ba, h, read_only};
    accessor ab{bb, h, read_only};
    accessor ac{bc, h, write_only, no_init};
    h.single_task<class vadd>([=]() {
        for (int i = 0; i < N; i++)
            ac[i] = aa[i] + ab[i];
    });
});
```

장치 선택자 이름은 버전에 따라 바뀌었습니다. intel/llvm `v6.0.0`의 `fpga_device_selector.hpp`는 클래스 `fpga_selector`·`fpga_emulator_selector`를 deprecated로 표시하고 callable `fpga_selector_v`·`fpga_emulator_selector_v`를 쓰라고 적습니다. 그리고 앞에서 본 대로 오픈소스 DPC++의 최신 소스에서는 이 FPGA 확장 자체가 제거됐습니다. 이 코드는 컴파일하지 않았고, 쓸 수 있는 SYCL FPGA 툴체인이 무엇인지는 Altera의 현재 문서로 확인해야 합니다.

## AMD Vitis와 XRT

AMD Vitis에서 PL 커널은 C/C++(HLS)나 RTL로 쓰고, 호스트는 XRT native C++ API로 짭니다(*Vitis Unified Software Platform Documentation: Application Acceleration Development*, UG1393 2024.1). 같은 문서는 XRT가 관리하는 커널을 OpenCL API(`cl::kernel`)로도 다룰 수 있다고 적습니다. 즉 XRT native API가 OpenCL 위에 얹힌 층인 것은 아닙니다.

```cpp
auto device = xrt::device(0);
auto uuid   = device.load_xclbin("vadd.xclbin");
auto krnl   = xrt::kernel(device, uuid, "vadd");
auto run    = krnl(a_bo, b_bo, c_bo, N);   /* set args + start, returns xrt::run */
run.wait();
```

UG1393 2024.1의 예제가 이 `xrt::kernel(device, uuid, name)` 형태를 씁니다. 다만 XRT 최신 릴리스(`202610.2.23.244`)의 [`xrt_kernel.h`](https://github.com/Xilinx/XRT/blob/202610.2.23.244/src/runtime_src/core/include/xrt/xrt_kernel.h)는 이 생성자에 `[[deprecated("deprecated, please use kernel(hw_context, name) instead")]]`를 붙여 두었으므로, 새 코드는 `xrt::hw_context`를 거치는 생성자를 확인합니다. `kernel::operator()`는 인자를 설정하고 실행을 시작한 `xrt::run`을 돌려준다고 같은 헤더에 적혀 있습니다.

## 자주 보는 함정

> NDRange로 GPU처럼 짜기

```c
__kernel void scale(__global float *a) {
    int i = get_global_id(0);
    a[i] = a[i] * 2.0f;
}
```

동작은 하지만, *Best Practices Guide*가 권하는 기본형은 single work-item입니다. 같은 절은 여러 스레드를 명시적으로 기술하는 쪽이 이득인 경우에는 NDRange로 짜도 된다고 적습니다.

> `restrict` 누락

포인터 인자가 겹칠 수 있다고 보면 컴파일러는 load·store 순서를 지키는 하드웨어를 넣습니다. *Best Practices Guide* 22.3의 4.7절 "Avoiding Pointer Aliasing"은 가능하면 포인터 인자에 `restrict`를 넣으라고 권하면서, 다른 포인터와 실제로 겹치는 포인터에 붙이면 결과가 틀릴 수 있다고 경고합니다. 겹치지 않는다는 것이 확실할 때만 붙입니다.

> Channel을 여러 커널이 같이 씀

두 커널이 같은 channel에 쓰거나 같은 channel을 읽는 구조는 *Programming Guide*의 제약에 걸립니다.

> Float을 그대로 쓰고 GPU 같은 처리율 기대

float 연산은 기본적으로 소스 순서대로 구현됩니다. 순서를 바꿔도 되면 `-ffp-reassociate`, 중간 반올림을 줄여도 되면 `-ffp-contract=fast`(7.21절)를 검토하고, 결과 허용 오차를 testbench에 반영합니다.

> Emulator 통과를 하드웨어 통과로 믿기

emulator는 호스트 CPU의 부동소수점 하드웨어를 쓰고, `ivdep`로 깨진 의존성이나 초기화되지 않은 데이터에서 하드웨어와 결과가 달라질 수 있습니다(*Programming Guide* 22.3의 emulator 절). emulator는 기능 확인용이고, 타이밍·자원은 하드웨어 컴파일 보고서로 확인합니다.

## 정리

- OpenCL on FPGA는 커널이 회로가 되는 모델이고, Intel 문서는 single work-item(loop pipeline)을 기본형으로 권합니다.
- 호스트는 `.aocx`를 `clCreateProgramWithBinary`로 올리고, single work-item 커널은 `clEnqueueTask`로 띄웁니다.
- Channel은 blocking FIFO이고, channel 하나에 writer 커널·reader 커널은 하나씩입니다.
- `ivdep`는 의존성이 없다는 단언이라, 틀리면 emulator에서는 안 보이고 하드웨어에서 틀립니다.
- Intel FPGA SDK for OpenCL은 단종됐고(22.4 릴리스 노트, PDN2219), Intel은 SYCL로 이전을 안내하지만 오픈소스 DPC++에서는 FPGA 확장이 제거됐습니다.
- AMD 쪽 호스트는 XRT native API이고, OpenCL API는 그 위에서 쓸 수 있는 선택지입니다.
- 이 글의 실행은 GPU에서의 기능 확인까지입니다. II·자원·처리율은 `aoc` 보고서로 확인합니다.

다음 편은 **Intel Quartus 사용법**입니다.

## 재현 절차

- 환경: macOS 27.2.1, Apple M2 Pro, Apple clang 21.0.0, 시스템 `OpenCL.framework`.
- `clang -O2 -Wall host.c -framework OpenCL -o host && ./host gpu` (커널은 `kernels.cl`에서 `clCreateProgramWithSource`로 빌드). `./host cpu`는 `clGetDeviceIDs ... -> -30`으로 끝났습니다.
- 문서: docs.altera.com의 22.4 Release Notes, Programming Guide(683846, 22.3)·Best Practices Guide(683521, 22.3)·Migrating OpenCL FPGA Designs to SYCL(2024) PDF, intel/llvm `v6.0.0`의 `fpga_device_selector.hpp`와 커밋 `e4cbcf5`, Xilinx/XRT `202610.2.23.244`의 `xrt_kernel.h`, UG1393 2024.1.

## 관련 항목

- [11-10: Vitis HLS](/blog/embedded/modern-recipes/part11-10-hls)
- [11-11: HLS 최적화](/blog/embedded/modern-recipes/part11-11-hls-optimization)
- [11-12: Vitis AI](/blog/embedded/modern-recipes/part11-12-vitis-ai)
- [11-14: Intel Quartus](/blog/embedded/modern-recipes/part11-14-intel-quartus)
