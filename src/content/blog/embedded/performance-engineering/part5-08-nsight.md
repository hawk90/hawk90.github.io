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

> **"Nsight Systems는 CPU 스레드, CUDA API 호출, GPU kernel·memcpy, NVTX 구간을 한 timeline에 올려 '어디서 시간이 새는가'를 보여 주는 도구입니다."** 한 kernel이 *왜* 느린지는 Nsight Compute의 몫입니다.

## 어떤 문제를 푸는가

자율주행 ECU, 로봇, 스마트 카메라처럼 ARM CPU와 NVIDIA GPU가 같이 들어간 시스템에서는 perf만으로 답이 안 나옵니다. perf는 CPU가 무엇을 했는지는 보여 주지만, CUDA kernel이 언제 GPU에서 돌았는지, GPU가 놀고 있던 시간이 얼마인지, 복사와 연산이 겹쳤는지는 보여 주지 못합니다. 주방에 비유하면 perf는 요리사(CPU) 한 명의 동선만 찍는 카메라이고, Nsight Systems는 요리사와 오븐(GPU)과 배달대(memcpy)를 같은 시계로 찍는 주방 전체 CCTV입니다.

> **메모** 이 글을 쓴 환경(Apple M2 Pro Mac, Debian arm64 VM)에는 NVIDIA GPU가 없어 nsys·ncu·CUDA·Jetson을 실행하지 않았습니다. 옵션과 동작은 [NVIDIA Nsight Systems User Guide](https://docs.nvidia.com/nsight-systems/UserGuide/index.html)(문서 버전 v2026.6), [Nsight Compute CLI](https://docs.nvidia.com/nsight-compute/NsightComputeCli/index.html)·[Profiling Guide](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html)(v2026.4.0), [CUDA Runtime API](https://docs.nvidia.com/cuda/cuda-runtime-api/stream-sync-behavior.html)(13.5)에서 확인했습니다. 직접 실행한 것은 GPU 없이도 돌아가는 NVTX 부분뿐입니다.

## 설치와 실행

CLI는 `nsys`, GUI 실행 스크립트는 `nsys-ui`입니다. User Guide는 CLI 옵션 표기 규칙을 짧은 옵션은 공백(`-s process-tree`), 긴 옵션은 등호(`--sample=process-tree`)로 정합니다.

```bash
nsys profile -o report ./app                    # report.nsys-rep 생성
nsys profile --stats=true -o report ./app       # 수집 후 요약 통계
nsys profile -t cuda,nvtx,osrt -o report ./app  # trace할 API 선택
```

`--stats=true`는 수집 뒤 SQLite 데이터베이스를 만들어 요약을 찍습니다. User Guide는 수집량이 많으면 이 데이터베이스 생성에 "several minutes"가 걸릴 수 있다고 경고합니다. 이미 만든 보고서에서 표만 뽑을 때는 `nsys stats --report cuda_gpu_kern_sum report.nsys-rep`처럼 따로 돌릴 수 있습니다.

보고서(`.nsys-rep`)는 host로 가져와 `nsys-ui`로 엽니다. User Guide는 보고서를 여는 GUI가 그 보고서를 만든 CLI와 같거나 더 새 버전이어야 하고, 새 CLI 보고서를 옛 GUI로 여는 것이 "the common failure mode"라고 적습니다. Jetson의 CLI만 올리고 PC의 GUI를 그대로 두면 이 문제를 만납니다.

## Timeline View

Timeline에서 가장 먼저 구분할 것은 *CPU 쪽 API 구간*과 *GPU 쪽 실행 구간*입니다. `cudaMemcpyAsync`나 kernel launch 호출이 CPU 행에서 짧게 끝났다고 GPU 작업이 끝난 것이 아닙니다. 호출은 작업을 큐에 넣고 돌아올 뿐이고, 실제 실행은 GPU 행에 따로 그려집니다. 두 행이 어긋나 있으면 그 사이는 큐에서 기다린 시간입니다.

`-t cuda`의 수집 방식도 GPU 세대에 따라 다릅니다. User Guide는 Blackwell부터 지원 GPU에서 `cuda` 옵션이 기본으로 CUDA hardware trace(HES trace)를 쓰고, 짧은 kernel을 많이 띄우는 워크로드에서 기존 software trace보다 대체로 빠르다고 적습니다. MPS·MIG·vGPU·VM 환경 등에서는 `cuda-sw`로 예전 방식을 강제할 수 있고, hardware trace가 안 되면 software trace로 자동 전환한 뒤 Diagnostics Summary에 어떤 방식이었는지 남깁니다.

## NVTX Annotation

GPU 행만 봐서는 어느 kernel이 어느 처리 단계에 속하는지 알기 어렵습니다. NVTX(NVIDIA Tools Extension)는 코드에 구간 이름을 직접 붙이는 API이고, 이 이름이 timeline에 막대로 나옵니다. 책에 붙이는 색인 탭과 같습니다.

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

NVTX v3는 header-only입니다. [NVTX 헤더](https://github.com/NVIDIA/NVTX/blob/release-v3/c/include/nvtx3/nvToolsExt.h)의 주석은 C/C++에서는 헤더만 include하면 되고 "There is no need to link with a static library"이며 이것이 NVTX v3에서 바뀐 점이라고 적습니다. 그래서 GPU가 없는 이 Mac에서도 그대로 컴파일하고 실행할 수 있었습니다. 도구가 붙지 않았을 때 push/pop 한 쌍의 비용을 1,000만 번 반복으로 재 본 결과입니다(Apple M2 Pro, Apple clang 21.0.0 `-O2`, NVTX `release-v3` @abc6aed8bc34, 다섯 번 실행).

```text
with push/pop: 1.35 ns/iter, empty loop: 0.31 ns/iter, diff: 1.04 ns
with push/pop: 0.62 ns/iter, empty loop: 0.31 ns/iter, diff: 0.31 ns
with push/pop: 0.67 ns/iter, empty loop: 0.31 ns/iter, diff: 0.36 ns
with push/pop: 0.90 ns/iter, empty loop: 0.31 ns/iter, diff: 0.59 ns
with push/pop: 0.63 ns/iter, empty loop: 0.33 ns/iter, diff: 0.31 ns
```

차이의 중앙값은 0.36 ns입니다. 바이너리의 미해결 심볼에는 NVTX 함수가 없고 `_dlopen`만 남았습니다. 프로파일러가 붙으면 그때 도구 라이브러리를 불러오는 구조이기 때문입니다. 그래서 NVTX range는 출시 빌드에 남겨 둬도 부담이 작습니다. 도구가 붙었을 때의 비용은 이 측정에 들어 있지 않습니다.

색을 지정하려면 attribute 구조체를 씁니다. 아래 필드 이름은 모두 같은 헤더에 정의되어 있습니다(`NVTX_VERSION` = 3, `NVTX_COLOR_ARGB` = 1, `NVTX_MESSAGE_TYPE_ASCII` = 1).

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

PyTorch는 두 길이 있습니다. 코드에 직접 `torch.cuda.nvtx.range_push(msg)`를 넣거나([PyTorch 2.15 문서](https://docs.pytorch.org/docs/2.15/generated/torch.cuda.nvtx.range_push.html)는 반환값이 시작한 range의 0부터 센 깊이라고 적습니다), nsys에 `--pytorch=autograd-nvtx`를 줍니다. User Guide는 이 옵션이 `torch.autograd.profiler.emit_nvtx(record_shapes=False)`를 켜고 `--trace=nvtx`를 함께 켠다고 설명합니다.

## Nsight Systems vs Nsight Compute

두 도구는 질문이 다릅니다.

| 도구 | 범위 | 목적 |
|---|---|---|
| Nsight Systems | 시스템 전체 timeline | "어디서 시간이 새는가" |
| Nsight Compute | kernel 하나의 하드웨어 지표 | "이 kernel은 왜 느린가" |

Nsight Systems로 오래 걸리는 kernel을 찾고, 그 kernel만 Nsight Compute로 깊게 봅니다.

```bash
# Nsight Compute - 전체 section set
ncu --set full -o kernel_report ./app

# 이름이 정확히 my_kernel인 kernel만
ncu -k my_kernel --set full ./app
```

`--set`을 생략하면 basic set을 모읍니다(CLI 문서). `-k foo`는 이름이 정확히 "foo"인 kernel, `-k regex:foo`는 "foo"를 포함하는 kernel입니다.

Nsight Compute는 timeline 도구처럼 가볍지 않습니다. Profiling Guide 2.2.3절에 따르면 GPU가 한 번에 셀 수 있는 하드웨어 counter 수가 제한되어 있어서, 요청한 지표가 많으면 같은 kernel을 여러 번 다시 돌립니다(replay). 기본인 Kernel Replay는 첫 pass 전에 kernel이 접근할 수 있는 GPU 메모리를 저장하고, pass마다 kernel이 쓴 부분을 되돌립니다. 그래서 메모리를 많이 쓰는 kernel일수록 느려집니다. Application Replay는 메모리 저장 대신 애플리케이션 전체를 pass 수만큼 다시 실행하고, 대신 애플리케이션의 kernel 실행이 매번 같아야 결과를 합칠 수 있습니다. 2.2.6절은 하드웨어 지표의 오버헤드는 "very low"이지만 kernel 명령을 고쳐 끼우는 software-patched 지표가 가장 비싸다고 적습니다. `--set full`은 가장 많은 section을 모으므로 pass도 가장 많습니다. `ncu --list-sets`가 set별 지표 수를 보여 주고, CLI 문서는 이 수를 kernel launch당 상대 오버헤드의 추정치로 쓰라고 합니다.

## CUDA Stream Overlap 진단

복사와 연산을 겹치려면 서로 독립인 작업을 다른 stream에 넣어야 합니다. 같은 stream 안의 작업은 넣은 순서대로 하나씩 실행되기 때문입니다.

```cpp
cudaStream_t s1, s2;
cudaStreamCreate(&s1);
cudaStreamCreate(&s2);

cudaMemcpyAsync(d_a, h_a, n, cudaMemcpyHostToDevice, s1);
kernel<<<grid, block, 0, s1>>>(d_a);     /* copy가 끝난 뒤 같은 stream에서 kernel */

cudaMemcpyAsync(d_b, h_b, n, cudaMemcpyHostToDevice, s2);
kernel<<<grid, block, 0, s2>>>(d_b);     /* 두 번째 독립 batch */
```

Nsight Systems timeline에서 두 stream은 별도 행으로 나옵니다. 겹치지 않았다면 먼저 아래 두 문서 규칙을 대조합니다.

첫째는 host 메모리 종류입니다. [CUDA Runtime API의 API synchronization behavior](https://docs.nvidia.com/cuda/cuda-runtime-api/api-sync-behavior.html)는 async 복사에 대해 "device memory와 pageable host memory 사이의 전송은 host 기준으로 동기일 수 있다"고 적고, pageable 메모리를 먼저 pinned 메모리로 옮겨야 하면 driver가 stream과 동기화할 수 있다고 덧붙입니다. `h_a`가 `malloc`으로 잡은 메모리라면 `cudaMemcpyAsync`라는 이름과 달리 CPU가 거기서 기다릴 수 있습니다. `cudaMallocHost`로 잡은 pinned 메모리여야 "fully asynchronous" 경우에 해당합니다. Timeline에서는 CPU 행의 `cudaMemcpyAsync` 구간 길이로 이 경우를 짐작합니다. 호출이 GPU 쪽 복사만큼 오래 걸렸다면 CPU가 거기서 기다린 것입니다.

둘째는 default stream 규칙으로, 아래 함정에서 다룹니다.

## Jetson 임베디드 활용

Jetson과 DRIVE 같은 NVIDIA SoC에서는 GPU 외의 가속기도 보고 싶어집니다. User Guide에서 확인한 범위는 다음과 같습니다.

- `--accelerator-trace=tegra-accelerators`는 GPU 외 하드웨어 엔진 유닛의 workload trace를 모으고 관련 ftrace 이벤트도 켭니다. 단 "Nsight Systems Embedded Platforms Edition only"입니다.
- 같은 옵션의 `dla` 값은 DLA workload trace를 모으지만 문서상 "only available on Windows on Arm"입니다. Jetson Linux에서 DLA를 볼 때 이 값을 쓰는 것이 아닙니다.
- SoC Metrics는 aarch64의 Linux·QNX target에서만, 그리고 Orin 이후 아키텍처에서만 됩니다. 지표 목록에는 CPU·GPU의 DRAM read/write throughput과 "DLA0/DLA1 Active"(DLA가 명령을 처리한 cycle 비율)가 있습니다.
- `--trace` 값 목록에는 `nvvideo`와 `cudla`(cuDLA API)가 있습니다. 이 글의 이전 판에 있던 `nvmedia`는 현재 목록에 없어 뺐습니다.

## Sampling과 OS Trace

Nsight Systems는 CUDA만이 아니라 CPU 샘플링과 스레드 스케줄링도 함께 모읍니다.

```bash
nsys profile --sample=process-tree --cpuctxsw=process-tree \
    --trace=cuda,nvtx,osrt -o report ./app
```

`--sample`은 CPU IP·backtrace 샘플을 어떻게 모을지 정하고, 프로그램을 nsys가 직접 띄우면 기본값이 `process-tree`입니다. `--cpuctxsw`는 OS 스레드 스케줄링을 기록합니다. User Guide는 `--sample=none`으로 샘플링을 꺼도 `--cpuctxsw=none`을 따로 주지 않으면 context switch는 계속 모은다고 적습니다.

| `--trace` 값 | 의미 |
|---|---|
| `osrt` | OS runtime library 호출(pthread, sleep 등) |
| `cuda` | CUDA API와 GPU 작업 |
| `nvtx` | NVTX range·marker |
| `cublas`, `cudnn`, `cusolver` | NVIDIA library 호출 |
| `mpi` | MPI 호출(`--mpi-impl`과 함께) |
| `openmp` | OpenMP runtime |

User Guide는 OpenACC와 cuXXX 계열 API를 고르면 CUDA trace가 자동으로 같이 켜진다고 적습니다. `cublas`를 켜 두면 GEMM 같은 라이브러리 호출이 timeline에 이름으로 나오므로, 모델의 어느 층이 어떤 cuBLAS 호출로 바뀌었는지 맞춰 볼 수 있습니다.

## 시나리오 — Jetson Orin에서 YOLO 추론 분석

Orin에서 카메라 프레임마다 YOLO를 돌리는데 목표 frame rate가 안 나온다고 해 봅시다. 아래는 실행하지 않은 조사 명령이고, 옵션은 모두 User Guide 목록에서 확인했습니다.

```bash
nsys profile -t cuda,nvtx,cudnn,osrt --sample=process-tree \
    --delay=10 --duration=30 -o yolo ./inference_app
```

`--delay=10`은 모델 로딩 같은 시작 구간을 건너뛰고, `--duration=30`은 30초만 모읍니다. 주의할 점이 있습니다. User Guide는 `--duration`이 끝나면 "the launched process will be terminated"라고 적습니다. 앱이 계속 돌아야 한다면 `--kill=none`을 함께 줍니다. 보고서를 열면 다음 순서로 봅니다.

1. 프레임 하나를 NVTX range(`preprocess`·`inference`·`postprocess`)로 나눠 어느 단계가 긴지 봅니다.
2. `inference` 구간 안에서 GPU 행이 비어 있는 곳이 있으면, 같은 시점 CPU 행에서 스레드가 무엇을 하고 있었는지(osrt 호출, CPU 샘플, context switch) 봅니다.
3. CPU 행의 `cudaMemcpyAsync`가 길게 그려져 있으면 host 버퍼가 pinned인지 코드에서 확인합니다.
4. 고친 뒤에는 같은 입력·batch·warmup으로 frame latency 분포를 다시 모아 비교합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Default stream만 사용

```cpp
cudaMemcpy(d_a, h_a, n, cudaMemcpyHostToDevice);  /* default stream */
kernel<<<g, b>>>(d_b);                            /* default stream */
```

[Stream synchronization behavior](https://docs.nvidia.com/cuda/cuda-runtime-api/stream-sync-behavior.html) 문서에 따르면 legacy default stream은 같은 context의 다른 모든 stream과 동기화합니다. 예외는 `cudaStreamNonBlocking`으로 만든 stream뿐입니다. 문서의 예는 `k_1`을 stream `s`에, `k_2`를 legacy stream에, `k_3`을 다시 `s`에 넣으면 `k_2`는 `k_1`을, `k_3`은 `k_2`를 기다립니다. 중간에 default stream 호출이 하나 끼면 다른 stream의 overlap이 끊깁니다. nvcc의 `--default-stream per-thread`나 `CUDA_API_PER_THREAD_DEFAULT_STREAM` 매크로로 per-thread default stream을 쓰면 다른 stream과 동기화하지 않지만, 이 stream도 legacy default stream과는 여전히 동기화합니다.

> ⚠️ Pinned memory 없이 Async copy

`malloc`으로 잡은 host 버퍼에 `cudaMemcpyAsync`를 쓰면 위 API synchronization 규칙대로 host 기준 동기일 수 있습니다. Timeline에서 CPU 행의 `cudaMemcpyAsync` 구간이 GPU 복사 구간만큼 길면 이 경우입니다. 버퍼를 `cudaMallocHost`로 바꾸고 다시 봅니다.

> ⚠️ Profile 시간이 너무 김

```bash
nsys profile -o long ./app
```

수집이 길면 보고서도 커지고 `--stats=true`의 데이터베이스 생성도 길어집니다. `-d 30`(`--duration`)으로 30초만 모으거나 `-y 60`(`--delay`)으로 시작 60초 뒤부터 모읍니다. `-d`는 끝날 때 프로그램을 종료시킨다는 점을 기억합니다.

> ⚠️ NVTX 없이 Python ML framework profile

Python 쪽 단계를 timeline에 나누려면 NVTX range를 직접 넣습니다.

```python
import torch
torch.cuda.nvtx.range_push("forward")
y = model(x)
torch.cuda.nvtx.range_pop()
```

코드를 고치기 어렵다면 nsys의 `--pytorch=autograd-nvtx`가 autograd 연산마다 range를 자동으로 붙입니다.

## 정리

- Nsight Systems는 CPU 스레드·CUDA API·GPU 작업·NVTX를 한 timeline에 정렬합니다. CPU의 API 구간과 GPU의 실행 구간은 다른 행입니다.
- NVTX v3는 header-only이고, 도구가 붙지 않은 상태의 push/pop 한 쌍은 M2 Pro에서 중앙값 0.36 ns였습니다.
- Nsight Compute는 counter 제약 때문에 kernel을 replay하며, `--set full`일수록 pass가 늘어납니다.
- pageable host 메모리의 async 복사와 legacy default stream이 overlap을 깨는 두 가지 대표 규칙입니다.
- Jetson의 하드웨어 가속기 trace(`tegra-accelerators`)는 Embedded Platforms Edition 전용이고, SoC Metrics는 Orin 이후에서만 됩니다.
- `--duration`은 수집이 끝나면 대상 프로그램을 종료시킵니다.

다음 편은 **Tracy·Hotspot·uftrace** — 가벼운 modern profiler들.

## 관련 항목

- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
- [5-09: Tracy·Hotspot·uftrace](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
- [Embedded C++ 2-07: 템플릿 비용](/blog/embedded/embedded-cpp/part2-07-templates-cost)
