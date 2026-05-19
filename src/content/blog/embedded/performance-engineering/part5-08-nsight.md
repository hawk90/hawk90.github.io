---
title: "5-08: Nsight Systems — GPU·NPU 포함 시스템 분석"
date: 2026-05-08T46:00:00
description: "NVIDIA Nsight Systems로 CPU·GPU·메모리 통합 timeline 분석. Jetson 임베디드 활용."
series: "Embedded Performance Engineering"
seriesOrder: 46
tags: [nsight, gpu, npu, jetson, cuda, nvtx]
---

## 한 줄 요약

> **"Nsight Systems는 CPU와 GPU, 메모리, OS를 한 timeline에 올려 kernel launch와 memcpy의 overlap을 ns 단위로 보여 줍니다."**

## 어떤 문제를 푸는가

자율주행 ECU, 로봇, 스마트 카메라처럼 ARM CPU와 NVIDIA GPU/NPU가 같이 들어간 시스템에서 perf는 CPU만 봅니다. CUDA kernel이 언제 실행되었는지, GPU가 idle한 시간이 얼마인지, memcpy와 compute가 overlap되었는지는 perf로 알 수 없습니다.

Nsight Systems는 CPU profiler와 GPU profiler를 하나의 timeline으로 통합합니다. CUDA API 호출, kernel 실행, memcpy, NVTX annotation, OS scheduling이 같은 시간축에 정렬되어 표시됩니다. Jetson 같은 임베디드 보드에서도 정확히 같은 방식으로 동작합니다.

이 글에서는 Nsight Systems의 설치와 capture, NVTX annotation, Nsight Compute와의 차이, Jetson 활용을 다룹니다.

## 설치와 실행

Nsight Systems는 NVIDIA Developer에서 무료로 받습니다.

```bash
# Linux x86_64
wget https://developer.nvidia.com/nsight-systems-2024-x-x-linux
sudo dpkg -i nsight-systems-*.deb

# Jetson (aarch64) - JetPack 설치 시 포함
which nsys
```

기본 사용은 `nsys profile`로 시작합니다.

```bash
nsys profile -o report ./app                    # CPU + CUDA
nsys profile --stats=true -o report ./app       # 요약 출력
nsys profile -t cuda,nvtx,osrt -o report ./app  # trace 카테고리 선택
```

생성된 `report.nsys-rep`을 호스트로 가져와 GUI(`nsight-sys`)로 엽니다.

## Timeline View

```text
Time → →

CPU 0      [main thread       ][cuda_callback]
CPU 1      [worker            ]
CPU 2      [worker            ]

CUDA API   [cudaMallocAsync][cudaMemcpyAsync][cudaLaunchKernel ]
CUDA HW    [memcpy H2D     ][kernel run        ][memcpy D2H    ]
NVTX       [== preprocess ==][== inference ==][== postprocess ==]
```

`CUDA API`는 CPU에서 호출된 시점, `CUDA HW`는 GPU에서 실제 실행된 시점입니다. 둘 사이의 gap이 launch latency이며, 보통 5-20 us 수준입니다.

memcpy H2D(host-to-device)와 kernel이 다른 stream에서 overlap되면 timeline에서 시각적으로 겹쳐 보입니다. 겹치지 않으면 동기적으로 직렬화된 상태이며 GPU 활용도가 떨어집니다.

## NVTX Annotation

NVTX(NVIDIA Tools Extension)는 사용자 코드에 marker를 심는 API입니다.

```cpp
#include <nvtx3/nvToolsExt.h>

void process_frame(Frame& f) {
    nvtxRangePush("process_frame");

    nvtxRangePush("preprocess");
    preprocess(f);
    nvtxRangePop();

    nvtxRangePush("inference");
    run_model(f);
    nvtxRangePop();

    nvtxRangePush("postprocess");
    postprocess(f);
    nvtxRangePop();

    nvtxRangePop();
}
```

이 marker가 timeline에 그대로 표시되어, 어느 phase에서 시간이 새는지 직관적으로 보입니다. 색상 지정도 가능합니다.

```cpp
nvtxEventAttributes_t attr = {};
attr.version = NVTX_VERSION;
attr.size = NVTX_EVENT_ATTRIB_STRUCT_SIZE;
attr.colorType = NVTX_COLOR_ARGB;
attr.color = 0xFFFF0000;
attr.messageType = NVTX_MESSAGE_TYPE_ASCII;
attr.message.ascii = "critical";
nvtxRangePushEx(&attr);
```

PyTorch와 TensorFlow는 내부에 NVTX marker가 이미 있어, Python 코드는 별도 작업 없이도 layer별 timeline이 보입니다.

## Nsight Systems vs Nsight Compute

두 도구는 다른 목적을 가집니다.

| 도구 | 범위 | 목적 |
|---|---|---|
| Nsight Systems | 시스템 전체 timeline | "어디서 시간 새는가" |
| Nsight Compute | 단일 kernel 깊은 분석 | "이 kernel을 왜 느린가" |

Nsight Systems로 hot kernel을 찾고, Nsight Compute로 그 kernel의 occupancy, memory throughput, instruction mix를 본다는 순서가 일반적입니다.

```bash
# Nsight Compute - kernel 한 개를 매우 자세히
ncu --set full -o kernel_report ./app

# 특정 kernel만
ncu --kernel-name "my_kernel" --set full ./app
```

Nsight Compute는 kernel을 여러 번 replay하면서 PMU counter를 수집하므로 실행이 5-10배 느려질 수 있습니다.

## CUDA Stream Overlap 진단

CUDA에서 throughput을 올리는 가장 큰 트릭은 stream 병렬화입니다. Default stream만 쓰면 모든 작업이 직렬화됩니다.

```cpp
cudaStream_t s1, s2;
cudaStreamCreate(&s1);
cudaStreamCreate(&s2);

cudaMemcpyAsync(d_a, h_a, n, cudaMemcpyHostToDevice, s1);
kernel<<<grid, block, 0, s2>>>(d_b);     /* 다른 stream에서 동시 실행 */
cudaMemcpyAsync(d_b, h_b, n, cudaMemcpyHostToDevice, s2);
```

Nsight Systems timeline에서 두 stream이 다른 row로 표시되며, 실제 GPU hardware에서 overlap된 시간 영역이 시각적으로 나타납니다. 직렬화된 경우에는 한 row가 끝나야 다음 row가 시작합니다.

## Jetson 임베디드 활용

Jetson Orin, Xavier, Nano 같은 임베디드 보드에서는 nsys가 JetPack에 기본 포함됩니다. ARM CPU + NVIDIA GPU + DLA(Deep Learning Accelerator)가 같은 SoC에 있으며, Nsight Systems가 모두를 한 timeline에 표시합니다.

```bash
# Jetson에서 capture
nsys profile -t cuda,nvtx,osrt,nvmedia,nvvideo -o frame ./video_app

# 호스트로 전송 후 GUI에서 열기
scp jetson:report.nsys-rep .
nsight-sys report.nsys-rep
```

`nvmedia`와 `nvvideo` trace는 Jetson의 비디오 디코더, ISP, NVENC 사용 timeline을 추가로 보여 줍니다. 자율주행 ECU의 카메라 → ISP → AI 추론 → 출력 pipeline을 한 timeline에서 추적할 수 있는 거의 유일한 도구입니다.

DLA가 따로 표시되므로 GPU와 DLA의 작업 분할이 잘 되었는지도 확인할 수 있습니다.

## Sampling과 OS Trace

Nsight Systems는 CUDA만이 아니라 CPU sampling도 합니다.

```bash
nsys profile --sample=cpu --cpuctxsw=process \
    --trace=cuda,nvtx,osrt -o report ./app
```

| 카테고리 | 의미 |
|---|---|
| `osrt` | OS runtime calls (pthread, sleep, futex) |
| `cuda` | CUDA API 호출 |
| `nvtx` | NVTX marker |
| `cublas`, `cudnn`, `cusolver` | NVIDIA library 호출 |
| `mpi` | MPI calls |
| `nvmedia`, `nvvideo` | Jetson 멀티미디어 |
| `openmp` | OpenMP runtime |

`cublas` trace를 켜면 GEMM 호출이 timeline에 표시되어, 어느 layer가 cuBLAS의 어떤 함수로 매핑되는지 확인할 수 있습니다.

## 시나리오 — Jetson Orin에서 YOLO 추론 분석

```bash
nsys profile -t cuda,nvtx,cudnn,osrt --sample=cpu \
    -o yolo ./inference_app
```

Timeline에서 다음과 같은 패턴을 발견합니다.

```text
preprocess  [====]  CPU bound, GPU idle
H2D copy         [==]
inference            [==========]
D2H copy                       [=]
postprocess                     [==] CPU bound, GPU idle
```

CPU의 preprocess와 postprocess가 GPU idle 구간을 만듭니다. 두 작업을 다른 stream과 thread로 옮기면 GPU가 다음 frame을 미리 처리해 throughput이 1.5-2배로 늘어납니다.

```text
                    Frame N+1 [==========]
preprocess  [====]  H2D copy [==]
                              inference   [==========]  ← overlap
                                                D2H [=]
                                                postprocess [==]
```

이 식의 pipeline 최적화가 Nsight 없이 코드만 보고는 거의 보이지 않습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Default stream만 사용

```cpp
cudaMemcpy(d_a, h_a, n, cudaMemcpyHostToDevice);  /* default stream */
kernel<<<g, b>>>(d_b);                            /* default stream */
```

Default stream은 모든 작업과 implicit synchronize됩니다. `cudaStreamCreate`로 명시적 stream을 만들고 `Async` API를 사용해야 overlap이 가능합니다.

> ⚠️ Pinned memory 없이 Async copy

```cpp
cudaMallocHost(&h_a, n);                  /* pinned */
cudaMemcpyAsync(d_a, h_a, n, ..., s);
```

Pageable host memory로는 진짜 async가 안 됩니다. `cudaMallocHost` 또는 `cudaHostRegister`로 pin해야 DMA 엔진이 작동합니다.

> ⚠️ Profile 시간이 너무 김

```bash
nsys profile -o long ./app                # 1시간 측정 → 수 GB report
```

Capture 파일이 너무 크면 GUI가 느려집니다. `-d 30`으로 30초만 capture하거나 `--delay 60`으로 startup 이후로 미룹니다.

> ⚠️ NVTX 없이 Python ML framework profile

PyTorch는 자동 NVTX를 켜야 보입니다.

```python
import torch
torch.cuda.nvtx.range_push("forward")
y = model(x)
torch.cuda.nvtx.range_pop()
```

또는 `torch.profiler`와 함께 사용하면 layer별 timeline이 풍부해집니다.

## 정리

- Nsight Systems는 CPU, GPU, OS, CUDA를 한 timeline에 통합 표시합니다.
- NVTX annotation으로 사용자 코드의 phase를 timeline에 직접 marker로 남깁니다.
- Nsight Systems가 "어디서 시간 새는가", Nsight Compute가 "왜 느린가"를 봅니다.
- CUDA stream overlap을 시각적으로 확인할 수 있어 pipeline 최적화의 출발점입니다.
- Jetson에서 ARM CPU, GPU, DLA, ISP, NVENC를 한 timeline에서 추적합니다.
- PyTorch와 TensorFlow는 NVTX marker를 내장해 추가 작업 없이 layer별 분석이 가능합니다.

다음 편은 **Tracy·Hotspot·uftrace** — 가벼운 modern profiler들.

## 관련 항목

- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
- [5-09: Tracy·Hotspot·uftrace](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
- [Embedded C++ 2-07: 템플릿 비용](/blog/embedded/embedded-cpp/part2-07-templates-cost)
