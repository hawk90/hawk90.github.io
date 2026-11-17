---
title: "NVIDIA Jetson 분석 — Nano·Xavier·Orin·Thor·JetPack·DLA·VPI"
slug: "embedded/modern-recipes/part12-09-jetson"
date: 2026-04-21T09:07:00
description: "Jetson 라인업의 power·성능 trade-off, JetPack 구성, DLA·VPI·DeepStream을 묶어 자율주행·로봇 stack에서 쓰는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 145
tags: [recipes, jetson, tensorrt, dla, vpi, deepstream, jetpack]
topics: ["embedded"]
---

## 한 줄 요약

> **"Jetson은 GPU 보드라기보다 GPU·DLA·PVA·VIC 같은 블록과 JetPack software stack을 묶은 플랫폼입니다."** 어느 블록이 있는지와 software 버전은 모듈과 JetPack 버전마다 다르므로, NVIDIA의 사양표와 release 문서에서 먼저 확인합니다.

## 이 글의 근거

이 글을 쓴 환경에는 Jetson 보드가 없어 아무것도 실행하지 않았습니다. 숫자와 API는 다음 NVIDIA 자료에서 옮겼고, 확인 날짜는 2026-11-17입니다. 제품 페이지에는 판 표기가 없습니다.

- Jetson Orin·Jetson Thor 제품 페이지의 사양표, developer.nvidia.com의 Jetson Modules 페이지
- JetPack 6.2 페이지, JetPack 7 페이지
- VPI 4.1 문서(Algorithms 표, Stream·Gaussian Filter API)
- CUDA for Tegra Application Note
- DeepStream 9.2 Gst-nvinfer·Gst-nvstreammux 문서
- Jetson Linux r36.4 Developer Guide(power mode·`jetson_clocks`, [12-08](/blog/embedded/modern-recipes/part12-08-thermal)에서 정리)

## 어떤 상황에서 쓰나

여러 카메라 입력을 받아 검출·추적을 실시간으로 돌려야 하고, 전력이 수 W에서 수십 W 사이로 묶인 장치입니다. 서버에서 쓰던 CUDA·TensorRT 모델을 그대로 가져오고, 영상 처리와 추론의 일부를 GPU가 아닌 고정 기능 블록에 맡길 수 있다는 점이 선택 이유가 됩니다.

## 핵심 개념

### 라인업

Jetson Orin 제품 페이지의 사양표(모듈 열 기준)와 Jetson Thor 페이지의 사양표에서 옮긴 값입니다.

| 모듈 | CPU | GPU | DLA | PVA | AI 성능 | 전력 |
|------|-----|-----|-----|-----|---------|------|
| AGX Orin 64GB | 12-core Cortex-A78AE | 2048-core Ampere, Tensor Core 64 | 2× NVDLA v2 | 1× PVA v2 | 275 TOPS | 15–60 W |
| AGX Orin 32GB | 8-core Cortex-A78AE | 1792-core Ampere, Tensor Core 56 | 2× NVDLA v2 | 1× PVA v2 | 200 TOPS | 15–60 W |
| Orin NX 16GB | 8-core Cortex-A78AE | 1024-core Ampere | 2× NVDLA v2 | 1× PVA v2 | 157 TOPS | 10–40 W |
| Orin NX 8GB | 6-core Cortex-A78AE | 1024-core Ampere | 1× NVDLA v2 | 1× PVA v2 | 117 TOPS | 10–40 W |
| Orin Nano 8GB | 6-core Cortex-A78AE | 1024-core Ampere | 없음 | 없음 | 67 TOPS | 7–25 W |
| Orin Nano 4GB | 6-core Cortex-A78AE | 512-core Ampere | 없음 | 없음 | 34 TOPS | 7–25 W |
| Jetson T5000 | 14-core Neoverse-V3AE | 2560-core Blackwell, MIG 10 TPC | 표에 항목 없음 | 1× PVA v3 | 2070 TFLOPS (FP4, sparse) | 40–130 W |
| Jetson T4000 | 12-core Neoverse-V3AE | 1536-core Blackwell, MIG 6 TPC | 표에 항목 없음 | 1× PVA v3 | 1200 TFLOPS (FP4, sparse) | 40–70 W |

Orin 표의 "Overall AI Performance" 줄은 이 값들을 sparse INT8 TOPS로 적고, Thor는 sparse FP4 TFLOPS로 적습니다. 정밀도 기준이 달라 세대 간 숫자를 그대로 비교할 수 없습니다. AGX Orin 32GB는 같은 페이지의 요약 사양표에 241 TOPS, 상세 사양표의 "Overall AI Performance" 줄에 200 sparse INT8 TOPS로 서로 다르게 적혀 있어 상세 표의 값을 옮겼습니다. Orin NX·Nano의 전력 상한 40 W와 25 W는 JetPack 6.2의 Super Mode 기준입니다. JetPack 6.2 페이지는 "With Super Modes, the Jetson Orin NX series achieves up to a 70% increase in AI TOPS"라고 적습니다.

이전 세대는 Jetson Modules 페이지의 요약만 옮깁니다. Jetson Xavier NX는 "up to 21 TOPs", Jetson AGX Xavier는 10 W·15 W·30 W power profile로 출하됩니다. 같은 페이지는 Thor를 "power configurable between 40 W and 130 W"로 적습니다.

### Software stack — JetPack

JetPack은 Jetson Linux(BSP)와 그 위의 AI stack을 묶은 SDK입니다. 버전마다 구성이 다릅니다.

| | JetPack 6.2 | JetPack 7 |
|---|---|---|
| 지원 플랫폼 | Jetson Orin | Jetson Orin, Jetson Thor |
| Linux | Jetson Linux 36.4.3, kernel 5.15, Ubuntu 22.04 | kernel 6.8, Ubuntu 24.04 LTS |
| AI stack | CUDA 12.6, TensorRT 10.3, cuDNN 9.3, VPI 3.2, DLA 3.1 | Thor는 CUDA 13.0(SBSA installer) |

JetPack 7 페이지는 7.2부터의 기능(Yocto Project 공식 지원, NemoClaw)을 소개하고, "Jetson Thor is based on the SBSA stack. Please use the SBSA installer"라고 안내합니다. 컨테이너·TensorRT engine·라이브러리는 이 버전 조합에 맞춰야 하므로, 배포할 때는 장치의 JetPack 버전을 먼저 고정합니다.

### GPU 밖의 가속기

| 블록 | 이 글에서 확인한 범위 |
|------|----------------------|
| DLA (NVDLA v2) | AGX Orin·Orin NX에 있고 Orin Nano에는 없습니다. TensorRT의 `DeviceType::kDLA`로 씁니다 |
| PVA | Orin은 PVA v2, Thor는 PVA v3. VPI의 PVA backend가 이 블록을 씁니다 |
| VIC | VPI의 VIC backend |
| NVENC/NVDEC | Thor 표에서 T5000 2개, T4000 1개 |

VPI 4.1 Algorithms 표는 PVA·VIC·OFA backend 열에 "Only available on Jetson Orin and Jetson Thor platforms"라는 각주를 답니다. 알고리즘마다 지원 backend가 다릅니다. 예를 들어 Gaussian Filter는 CPU·CUDA·PVA, Remap은 CPU·CUDA·PVA·VIC, Rescale은 CPU·CUDA·VIC입니다.

## 코드 / 실제 사용 예

### power mode

```bash
sudo /usr/sbin/nvpmodel -q          # current mode
sudo /usr/sbin/nvpmodel -m <x>      # mode IDs and budgets are per module, see /etc/nvpmodel.conf
sudo /usr/bin/jetson_clocks --show
tegrastats --interval 1000
```

Jetson Linux 문서는 MAXN을 "not the maximum performance mode"라고 적고, `jetson_clocks`를 돌린 뒤에는 reboot 없이 nvpmodel mode를 바꿀 수 없다고 적습니다. 자세한 내용은 [12-08](/blog/embedded/modern-recipes/part12-08-thermal)에 있습니다.

### DLA에 engine 올리기 (TensorRT)

```cpp
config->setDefaultDeviceType(nvinfer1::DeviceType::kDLA);
config->setDLACore(0);                                   // 1 for the second DLA, if the module has one
config->setFlag(nvinfer1::BuilderFlag::kGPU_FALLBACK);  // layers DLA can't run go to the GPU
```

DLA core 번호를 0, 1로 바꿔 engine을 따로 빌드하면 DLA가 2개인 모듈에서 두 DLA에 각각 engine을 둘 수 있습니다. precision 설정은 TensorRT 버전에 따라 다르고, TensorRT 11 header에서는 `kINT8` 같은 precision flag가 제거됐습니다([12-05](/blog/embedded/modern-recipes/part12-05-tensorrt)). JetPack 6.2의 TensorRT는 10.3이므로 그 버전의 header를 기준으로 씁니다.

### CPU·GPU 공유 메모리

CUDA for Tegra Application Note는 "In Tegra, device memory, host memory, and unified memory are allocated on the same physical SoC DRAM"이라고 적고, 그래서 중복 할당과 복사를 피할 수 있다고 합니다. 다만 메모리 종류마다 cache 동작이 다릅니다.

| 메모리 종류 | CPU | iGPU |
|------------|-----|------|
| Device memory (`cudaMalloc`) | 직접 접근 불가 | Cached |
| Pinned host memory (`cudaMallocHost`, `cudaHostAlloc`) | Compute Capability 7.2 이상이면 Cached, 미만이면 Uncached | Uncached |
| Unified memory (`cudaMallocManaged`) | Cached | `concurrentManagedAccess`가 1이면 UVM driver가 결정, 0이고 iGPU가 1개면 Cached |

```cpp
float *host, *dev;
cudaHostAlloc(&host, sz, cudaHostAllocMapped);   // pinned, mapped into the GPU address space
cudaHostGetDevicePointer(&dev, host, 0);         // GPU-side pointer to the same DRAM
```

pinned host memory는 iGPU 쪽에서 uncached이므로, zero-copy와 device memory로의 복사 중 어느 쪽이 나은지는 장치에서 재서 고릅니다. 같은 문서는 Xavier부터 I/O coherency(GPU가 CPU cache의 최신 값을 읽는 one-way coherency)를 지원하고, pinned memory의 CPU cache는 I/O coherent 플랫폼에서만 켜진다고 적습니다.

### VPI

VPI 4.1 API reference의 선언입니다.

```c
VPIStatus vpiStreamCreate(uint64_t flags, VPIStream *stream);
VPIStatus vpiSubmitGaussianFilter(VPIStream stream, uint64_t backend, VPIImage input, VPIImage output,
                                  int32_t kernelSizeX, int32_t kernelSizeY,
                                  float sigmaX, float sigmaY, VPIBorderExtension border);
```

문서의 예는 7×7, sigma 1.7, `VPI_BORDER_ZERO`로 Gaussian Filter를 CPU backend에 제출합니다.

```c
VPIStream stream;
vpiStreamCreate(VPI_BACKEND_CUDA | VPI_BACKEND_PVA, &stream);   // backends this stream may use
vpiSubmitGaussianFilter(stream, VPI_BACKEND_PVA, input, output, 7, 7, 1.7, 1.7, VPI_BORDER_ZERO);
vpiStreamSync(stream);
```

`vpiStreamCreate`의 flags는 그 stream에 제출할 수 있는 backend를 정하고, 제출할 때 backend 인자로 실제 실행 위치를 고릅니다. 위 표대로 Gaussian Filter는 VIC에서 돌 수 없으므로, VIC로 옮길 수 있는 단계(예: Rescale, Remap)와 PVA로 옮길 수 있는 단계를 표에서 골라 GPU 부담을 나눕니다.

### DeepStream

Gst-nvinfer 문서는 "The plugin accepts batched NV12/RGBA buffers from upstream. The NvDsBatchMeta structure must already be attached to the Gst Buffers."라고 적습니다. 이 batch를 만드는 것이 Gst-nvstreammux이고, 문서는 "forms a batch of frames from multiple input sources"라고 설명합니다. 그래서 카메라나 decoder와 `nvinfer` 사이에는 `nvstreammux`가 들어가야 합니다. `nvarguscamerasrc ! nvvidconv ! nvinfer`처럼 `nvstreammux`를 빼면 이 조건을 만족하지 않습니다.

nvstreammux는 source마다 `sink_%u` pad를 요청해 연결하고, `batch-size`만큼 frame이 모이거나 `batched-push-timeout`이 지나면 batch를 내보냅니다. 출력은 하나의 해상도(`width`, `height`)이고, 입력 해상도가 다르면 muxer가 scale합니다.

## 측정 / 성능 비교

이 글에서는 보드가 없어 측정값을 싣지 않았습니다. 모델별 latency·처리량·전력은 입력 해상도, TensorRT 버전, power mode, DLA 사용 여부에 따라 달라지므로, 대상 장치에서 같은 조건으로 잰 값만 비교합니다.

| 항목 | 측정 방법 | 비교 축 |
|------|-----------|---------|
| latency | `trtexec` 또는 application timer | 모델·precision |
| 처리량 | GPU·DLA engine 동시 실행 | DLA 사용 여부 |
| 전력 | `tegrastats`의 rail 항목 | power mode |
| sustained 처리량·온도 | 온도가 안정될 때까지 long-run + `tegrastats` | power mode·냉각 |

## 자주 보는 함정

> ⚠️ 모듈마다 블록 구성이 다름

같은 Orin 계열이라도 Orin Nano에는 DLA와 PVA가 없고, Orin NX 8GB의 DLA는 1개입니다. DLA·PVA를 쓰는 설계는 사양표에서 모듈별로 확인합니다.

> ⚠️ TOPS 숫자를 세대 간 비교

Orin은 sparse INT8 TOPS, Thor는 sparse FP4 TFLOPS입니다. 같은 제품 페이지 안에서도 AGX Orin 32GB처럼 값이 둘로 적힌 경우가 있습니다. 비교는 같은 모델을 직접 돌려서 합니다.

> ⚠️ JetPack 버전과 stack 버전 불일치

JetPack 6.2는 Ubuntu 22.04·CUDA 12.6·TensorRT 10.3, JetPack 7은 Ubuntu 24.04 기반이고 Thor는 CUDA 13.0입니다. 컨테이너 image와 TensorRT engine은 장치의 JetPack 버전에 맞춥니다.

> ⚠️ DLA build에 fallback 없음

DLA가 실행하지 못하는 layer를 GPU에서 돌리려면 `kGPU_FALLBACK`이 필요합니다. TensorRT header의 주석은 "Enable layers marked to execute on GPU if layer cannot execute on DLA"입니다.

> ⚠️ `nvinfer` 앞에 `nvstreammux`를 빼먹음

`nvinfer`는 `NvDsBatchMeta`가 붙은 batch buffer를 기대합니다. 카메라 하나라도 `nvstreammux`를 거칩니다.

> ⚠️ 공유 DRAM이면 무조건 zero-copy가 빠르다고 가정

pinned host memory는 iGPU에서 uncached입니다. zero-copy와 명시적 복사를 둘 다 재서 고릅니다.

## 정리

- Jetson 모듈은 CPU·GPU 외에 DLA·PVA·VIC·NVENC를 갖지만, 구성은 모듈마다 다릅니다(Orin Nano는 DLA·PVA 없음).
- 성능 수치는 Orin이 sparse INT8 TOPS, Thor가 sparse FP4 TFLOPS라 직접 비교할 수 없습니다.
- JetPack 6.2(Ubuntu 22.04, CUDA 12.6, TensorRT 10.3)와 JetPack 7(Ubuntu 24.04, Thor는 CUDA 13.0)은 stack이 다릅니다.
- CPU와 iGPU는 같은 DRAM을 쓰지만, pinned host memory는 iGPU에서 uncached라 zero-copy가 항상 빠르지는 않습니다.
- VPI는 알고리즘마다 지원 backend가 다르고, DeepStream의 `nvinfer` 앞에는 `nvstreammux`가 필요합니다.

다음 편은 **카메라→NPU zero-copy 파이프라인**입니다.

## 관련 항목

- [12-08: Thermal](/blog/embedded/modern-recipes/part12-08-thermal)
- [12-10: Zero-Copy Camera](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
- [12-05: TensorRT](/blog/embedded/modern-recipes/part12-05-tensorrt)
