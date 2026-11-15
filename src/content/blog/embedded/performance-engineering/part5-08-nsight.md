---
title: "NVIDIA Nsight Systems — GPU·NPU 포함 시스템 분석"
slug: "embedded/performance-engineering/part5-08-nsight"
date: 2026-04-27T09:07:00
description: "NVIDIA Nsight Systems로 CPU·GPU·메모리 통합 timeline 분석. Jetson 임베디드 활용."
series: "Embedded Performance Engineering"
seriesOrder: 47
tags: [nsight, gpu, npu, jetson, cuda, nvtx]
topics: ["embedded"]
---

## 한 줄 요약

> **"Nsight Systems는 CPU와 GPU, OS trace를 한 timeline에 정렬해 kernel launch와 memcpy의 관계를 확인하게 합니다. timestamp resolution과 수집 정확도는 event source와 설정에 따릅니다."**

## 어떤 문제를 푸는가

자율주행 ECU, 로봇, 스마트 카메라처럼 ARM CPU와 NVIDIA GPU/NPU가 같이 들어간 시스템에서는 CPU PMU 분석과 GPU/accelerator trace의 역할을 구분해야 합니다. CUDA kernel이 언제 실행되었는지, GPU가 idle한 시간이 얼마인지, memcpy와 compute가 overlap되었는지는 perf로 알 수 없습니다.

Nsight Systems는 CPU profiler와 GPU profiler를 하나의 timeline으로 통합합니다. CUDA API 호출, kernel 실행, memcpy, NVTX annotation, OS scheduling이 같은 시간축에 정렬되어 표시됩니다. Host/target edition·JetPack·driver·SoC에 따라 수집 source와 권한이 다릅니다.

이 글에서는 Nsight Systems의 설치와 capture, NVTX annotation, Nsight Compute와의 차이, Jetson 활용을 다룹니다.

## 설치와 실행

버전별 설치·CLI·GUI 이름은 [NVIDIA Nsight Systems User Guide](https://docs.nvidia.com/nsight-systems/UserGuide/index.html)에서 확인합니다. NVIDIA는 GUI launcher를 `nsys-ui`로 문서화합니다.

공식 User Guide의 CLI·수집 범위를 2026-10-24에 확인했습니다. 특정 설치 release에서 `nsys --version`·`nsys profile --help`로 재확인해야 합니다. 이 환경에서는 nsys·CUDA·Jetson을 실행하지 않았습니다.

설치 package는 실제 host/target·driver·JetPack 조합의 지원표로 선택합니다. 자리표시자 package를 apt install하는 명령을 실행 예로 제시하지 않습니다.

기본 사용은 `nsys profile`로 시작합니다.

```bash
nsys profile -o report ./app                    # CPU + CUDA
nsys profile --stats=true -o report ./app       # 요약 출력
nsys profile -t cuda,nvtx,osrt -o report ./app  # trace 카테고리 선택
```

생성된 `report.nsys-rep`을 호스트로 가져와 GUI(`nsys-ui`)로 엽니다.

## Timeline View

CPU API 호출 구간과 GPU의 실제 activity 구간은 다릅니다. Correlation과 stream·dependency를 따라 memcpy·kernel·synchronization을 연결합니다. API duration을 곧 GPU execution time으로 바꾸지 않습니다. 작업이 겹치지 않은 이유도 데이터 의존·resource 한계·동기화·수집 누락 등으로 나눠 조사합니다.

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
/* work being annotated */
nvtxRangePop();
```

PyTorch와 TensorFlow의 layer별 구간은 프레임워크 profiler 또는 명시적인 NVTX instrumentation으로 수집합니다. 모든 실행에서 Python 코드만으로 자동 layer marker가 생기는 것은 아니므로, 대상 버전과 trace 설정을 확인합니다.

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

Nsight Compute의 replay 방식과 분석 비용은 kernel, counter 수, replay mode 및 target에 따라 달라집니다. 실제 실행 영향은 해당 capture 설정에서 확인합니다.

## CUDA Stream Overlap 진단

독립 작업을 여러 CUDA stream에 제출하면 가능한 경우 겹쳐 실행할 수 있습니다. legacy default stream은 같은 context의 다른 stream과 동기화 규칙이 있지만, per-thread default stream 모드와 non-blocking stream은 다르게 동작합니다.

```cpp
cudaStream_t s1, s2;
cudaStreamCreate(&s1);
cudaStreamCreate(&s2);

cudaMemcpyAsync(d_a, h_a, n, cudaMemcpyHostToDevice, s1);
kernel<<<grid, block, 0, s1>>>(d_a);     /* copy가 끝난 뒤 같은 stream에서 kernel */

cudaMemcpyAsync(d_b, h_b, n, cudaMemcpyHostToDevice, s2);
kernel<<<grid, block, 0, s2>>>(d_b);     /* 두 번째 독립 batch */
```

Nsight Systems timeline에서 두 stream은 별도 row로 보입니다. 실제 overlap은 pinned host memory, device 지원, 자원 여유, 의존 관계에 따라 달라지므로 캡처로 확인합니다. 직렬화된 경우에는 한 row가 끝나야 다음 row가 시작합니다.

## Jetson 임베디드 활용

Jetson의 board/SoC·JetPack·Nsight edition·driver version에 따라 CUDA·DLA·multimedia 수집이 달라집니다. Nano까지 모두 DLA가 있다고 하거나 모든 accelerator가 자동으로 별도 row에 나타난다고 쓰지 않습니다. 설치 여부와 실제 trace option을 해당 release의 help와 support matrix로 확인합니다.

이 글의 기존 `nvmedia,nvvideo` trace 목록·ISP/NVENC 자동 표시 주장은 현재 검토한 CLI 전체와 일치한다고 확인하지 못해 보편 실행 예에서 제거했습니다. 특정 Jetson capture가 필요하면 그 release·기능·설정과 실제 보고서를 함께 남깁니다.

## Sampling과 OS Trace

Nsight Systems는 CUDA만이 아니라 CPU sampling도 합니다.

```bash
nsys profile --sample=process-tree --cpuctxsw=process-tree \
    --trace=cuda,nvtx,osrt -o report ./app
```

| 카테고리 | 의미 |
|---|---|
| `osrt` | OS runtime calls (pthread, sleep, futex) |
| `cuda` | CUDA API 호출 |
| `nvtx` | NVTX marker |
| `cublas`, `cudnn`, `cusolver` | NVIDIA library 호출 |
| `mpi` | MPI calls |
| `openmp` | OpenMP runtime |

`cublas` trace를 켜면 GEMM 호출이 timeline에 표시되어, 어느 layer가 cuBLAS의 어떤 함수로 매핑되는지 확인할 수 있습니다.

## 시나리오 — Jetson Orin에서 YOLO 추론 분석

```bash
nsys profile -t cuda,nvtx,cudnn,osrt --sample=process-tree \
    -o yolo ./inference_app
```

이는 미실행 조사 command입니다. 실제 capture에서 CPU preprocess, GPU copy·kernel, postprocess, synchronization과 다음 frame의 dependency를 확인합니다. 이전의 가상 ASCII timeline을 캡처 결과처럼 사용하지 않습니다. Pipeline을 바꾼 뒤 동일 입력·batch·warmup·완료량으로 throughput과 frame latency 분포를 비교해야 합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Default stream만 사용

```cpp
cudaMemcpy(d_a, h_a, n, cudaMemcpyHostToDevice);  /* default stream */
kernel<<<g, b>>>(d_b);                            /* default stream */
```

Legacy default stream은 같은 context의 blocking stream 사이에 암묵적 동기화 지점을 만들 수 있습니다. per-thread default stream과 non-blocking stream은 다르게 동작하므로, 선택한 build mode에 맞춰 [CUDA stream synchronization 규칙](https://docs.nvidia.com/cuda/cuda-runtime-api/stream-sync-behavior.html)을 확인합니다. 명시적 stream과 async API만으로 overlap이 보장되지는 않습니다.

> ⚠️ Pinned memory 없이 Async copy

Page-locked host memory는 copy/compute overlap의 중요한 전제지만 실제 overlap은 API·device·stream mode·resource·dependency로 확인합니다. Pinned allocation·copy·kernel의 오류를 처리하고 stream 완료 후 free하는 완전한 harness 없이 성공을 주장하지 않습니다. 이 글의 `...`가 든 불완전한 호출은 제거했습니다.

> ⚠️ Profile 시간이 너무 김

```bash
nsys profile -o long ./app                # capture size depends on events and duration
```

Capture 파일이 너무 크면 GUI가 느려집니다. `-d 30`으로 30초만 capture하거나 `--delay 60`으로 startup 이후로 미룹니다.

> ⚠️ NVTX 없이 Python ML framework profile

Python model phase를 보려면 명시적 NVTX range 또는 PyTorch profiler 같은 framework instrumentation을 사용합니다.

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
- Jetson의 수집 대상은 SoC·JetPack·Nsight edition과 실제 지원 source로 확인합니다.
- PyTorch/TensorFlow의 layer-level view는 framework profiler·NVTX 설정과 버전에 따라 달라집니다.

다음 편은 **Tracy·Hotspot·uftrace** — 가벼운 modern profiler들.

## 관련 항목

- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
- [5-09: Tracy·Hotspot·uftrace](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
- [Embedded C++ 2-07: 템플릿 비용](/blog/embedded/embedded-cpp/part2-07-templates-cost)
