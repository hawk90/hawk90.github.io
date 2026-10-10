---
title: "NVIDIA Jetson 분석 — Nano·Xavier·Orin·Thor·JetPack·DLA·VPI"
slug: "embedded/modern-recipes/part12-08-jetson"
date: 2026-04-21T09:07:00
description: "Jetson 라인업의 power·성능 trade-off, JetPack 구성, DLA·VPI·DeepStream을 묶어 자율주행·로봇 stack에서 쓰는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 144
tags: [recipes, jetson, tensorrt, dla, vpi, deepstream, jetpack]
topics: ["embedded"]
---

## 한 줄 요약

> **"Jetson은 단순한 GPU 보드가 아니라 TensorRT·VPI·DeepStream 등 하드웨어별 SDK를 묶은 stack입니다."** 자율주행·로봇·산업 vision에서 널리 쓰이지만, 지원 가속기와 API·모델 호환성은 제품 세대와 JetPack 버전에 따라 확인해야 합니다.

## 어떤 상황에서 쓰나

카메라 다중 입력 + 실시간 detection·tracking + 5~50 W 전력 budget이 필요한 모든 사례가 후보입니다. 자율주행 ECU, 농업·물류 로봇, 산업 vision inspection, CCTV·NVR analytics, 드론 obstacle detection이 대표적입니다.

Jetson을 고르는 이유는 세 가지입니다. 첫째, NVIDIA CUDA·cuDNN·TensorRT 생태계를 그대로 쓸 수 있어 서버에서 검증한 모델을 적은 수정으로 deploy할 수 있습니다. 둘째, DLA·VIC·NVENC 같은 *fixed-function 가속기*가 동시에 돌아 GPU 부담을 분산시킵니다. 셋째, DeepStream·Isaac ROS 같은 NVIDIA-maintained pipeline이 자율주행·로봇에 잘 맞춰져 있습니다.

## 핵심 개념

라인업은 power·compute로 정렬됩니다.

| Board | CPU | GPU | DLA | AI 성능 (NVIDIA 발표) | 전력 |
|---|---|---|---|---|---|
| Jetson Nano (구) | 4× A57 | 128 Maxwell | - | 472 GFLOPS | 5-10 W |
| Xavier NX | 6× Carmel | 384 Volta | 2 | 21 TOPS | 10-20 W |
| AGX Xavier | 8× Carmel | 512 Volta | 2 | 32 TOPS | 10-30 W |
| Orin Nano 8GB | 6× A78AE | 1024 Ampere | - | 40 TOPS (Super 67) | 7-15 W (Super 25 W) |
| Orin NX 16GB | 8× A78AE | 1024 Ampere | 2 | 100 TOPS (Super 157) | 10-25 W (Super 40 W) |
| AGX Orin 64GB | 12× A78AE | 2048 Ampere | 2 | 275 TOPS | 15-60 W |
| AGX Thor (T5000) | 14× Neoverse-V3AE | 2560 Blackwell + MIG | - | 2070 FP4 TFLOPS | 40-130 W |

Orin 이후 TOPS는 sparse INT8 기준이고, Thor는 sparse FP4 기준이라 세대 간 숫자를 그대로 비교할 수 없습니다. 같은 이름 안에서도 메모리 용량별 SKU(Orin Nano 4GB, Orin NX 8GB, AGX Orin 32GB)는 core·DLA 수가 다르고, Thor는 Orin의 DLA 대신 PVA v3를 둡니다.

자율주행·로봇 production 후보로 *AGX Orin·Thor*를 검토할 수 있습니다. 개발·prototype·entry edge에서는 Orin Nano·Orin NX도 후보지만, 실제 선택은 workload·전력·JetPack 지원 범위로 비교합니다.

소프트웨어 스택은 *JetPack*이라는 SDK 묶음으로 한 번에 들어옵니다.

```text
JetPack 6.x
  Linux for Tegra (L4T) — Ubuntu 22.04 + kernel patches
  CUDA 12 + cuDNN 9 + TensorRT 10
  Multimedia API — V4L2, GStreamer, NVENC/NVDEC
  VPI — Vision Programming Interface (CUDA·PVA·VIC backend)
  DeepStream SDK — multi-camera pipeline
  Isaac ROS — GPU-accelerated ROS 2 nodes
```

DLA·VIC·PVA가 Jetson의 *숨은 가속기*입니다. 단, 모든 Jetson SKU가 이 블록을 같은 수로 제공하는 것은 아닙니다.

| 가속기 | 역할 |
|--------|------|
| DLA (Deep Learning Accelerator) | fixed-function INT8 conv·activation 가속기입니다. Xavier와 일부 Orin SKU에는 DLA가 제공되며, 정확한 개수와 지원 연산은 SKU·TensorRT 버전에 따라 다릅니다. |
| VIC (Video Image Compositor) | color conversion·resize·blending을 fixed-function으로 처리합니다. GStreamer의 `nvvidconv` plugin이 이 블록을 씁니다 |
| PVA (Programmable Vision Accelerator) | Vision DSP입니다. VPI의 일부 알고리즘이 이 backend로 떨어집니다 |
| NVENC/NVDEC | H.264/H.265/AV1 하드웨어 인코더·디코더입니다 |

DLA가 2개인 SKU에서 GPU·DLA를 같이 쓰면 *세 개의 추론 instance*를 병렬로 돌릴 수 있습니다.

## 코드 / 실제 사용 예

### nvpmodel·jetson_clocks

```bash
sudo nvpmodel -q                 # 현재 mode
sudo nvpmodel -m 0               # 대개 MAXN
sudo nvpmodel -m <id>            # ID↔전력 대응은 module별 /etc/nvpmodel.conf
sudo jetson_clocks               # 모든 clock max (benchmark 전용)
sudo tegrastats --interval 1000  # 실시간 모니터
```

Production은 `nvpmodel`로 thermal-aware mode를 고르고 `jetson_clocks`는 안 씁니다.

### DLA 활용 (TensorRT)

```cpp
auto config = builder->createBuilderConfig();
config->setDefaultDeviceType(nvinfer1::DeviceType::kDLA);
config->setDLACore(0);
config->setFlag(nvinfer1::BuilderFlag::kGPU_FALLBACK);
config->setFlag(nvinfer1::BuilderFlag::kINT8);
```

DLA 0과 DLA 1에 각각 별도 engine을 build하면 두 개가 *동시에 추론*합니다. GPU에 또 다른 engine을 두면 같은 hardware에서 *3개 instance*가 굴러갑니다.

### Zero-copy GPU 메모리

```cpp
/* Pinned memory — DMA 효율 */
float *pinned;
cudaMallocHost(&pinned, sz);

/* Mapped memory — GPU·CPU 같은 buffer */
float *host;
cudaHostAlloc(&host, sz, cudaHostAllocMapped);
float *dev;
cudaHostGetDevicePointer(&dev, host, 0);
/* CPU가 host에 쓰면 GPU가 dev에서 즉시 read */
```

Jetson은 *integrated GPU*라서 CPU·GPU가 같은 DRAM을 씁니다. discrete GPU의 PCIe copy가 없으므로 `cudaHostAllocMapped` zero-copy 패턴을 검토할 수 있습니다. 다만 cache 동작 때문에 접근 패턴에 따라 느려질 수 있어 측정으로 고릅니다.

### VPI — vision pipeline

```cpp
#include <vpi/Stream.h>
#include <vpi/Image.h>
#include <vpi/algo/GaussianFilter.h>
#include <vpi/algo/Remap.h>

VPIStream stream;
vpiStreamCreate(VPI_BACKEND_CUDA | VPI_BACKEND_PVA | VPI_BACKEND_VIC,
                 &stream);

VPIImage src, dst;
vpiImageCreateWrapper(&src_data, NULL, 0, &src);
vpiImageCreate(W, H, VPI_IMAGE_FORMAT_U8, 0, &dst);

/* lens distortion correction */
vpiSubmitRemap(stream, VPI_BACKEND_CUDA, warp, src, dst, ...);

/* blur — CUDA */
vpiSubmitGaussianFilter(stream, VPI_BACKEND_CUDA,
                         dst, output, 5, 5, 1.0, 1.0, VPI_BORDER_ZERO);

vpiStreamSync(stream);
```

VPI는 algorithm마다 backend 인자만 바꿔 CUDA·PVA·VIC·CPU에 일을 나누는 API입니다. algorithm별로 지원 backend가 다르므로 VPI 문서의 backend 표를 확인한 뒤, GPU 대신 PVA·VIC로 옮길 수 있는 단계를 골라 GPU 부담을 분산합니다.

### DeepStream — multi-camera pipeline

```text
gst-launch-1.0 \
  nvarguscamerasrc sensor-id=0 ! \
  'video/x-raw(memory:NVMM),width=1920,height=1080,format=NV12' ! \
  nvvidconv ! \
  nvinfer config-file-path=yolo_config.txt ! \
  nvtracker ll-config-file=tracker_NvDCF.yml ! \
  nvmultistreamtiler rows=2 columns=2 width=1920 height=1080 ! \
  nvdsosd ! \
  nvegltransform ! nveglglessink
```

`(memory:NVMM)` 표시는 파이프라인의 버퍼 공유·복사 경로를 점검할 때 유용합니다. 실제로 CPU 복사가 사라지는 범위와 다중 카메라 처리량은 카메라 포맷·모델·해상도·JetPack 구성에 따라 달라지므로, 8 camera × 30 fps 같은 수치는 별도 벤치마크로 확인해야 합니다.

### Isaac ROS — GPU-accelerated ROS 2

Isaac ROS package는 ROS 2 component node로 배포되고 launch file로 띄웁니다.

```bash
ros2 launch isaac_ros_visual_slam isaac_ros_visual_slam.launch.py
```

Visual SLAM·stereo depth·point cloud·TensorRT 추론을 ROS 2 node로 연결할 수 있습니다. 센서·ROS 2 배포판·GPU backend 호환성은 target에서 확인합니다.

### Container deployment

```bash
sudo docker run --runtime=nvidia --gpus all \
    -v /tmp/.X11-unix:/tmp/.X11-unix \
    -e DISPLAY=$DISPLAY \
    <l4t-based-image>:<L4T release tag>
```

NVIDIA Container Toolkit이 host의 CUDA driver를 container에 연결합니다. image tag의 L4T release(`r36.x` 등)를 host JetPack의 L4T release와 맞춰야 합니다.

### CUDA Tensor core 활용

```cuda
#include <mma.h>
using namespace nvcuda::wmma;

__global__ void wmma_gemm(half *A, half *B, float *C) {
    fragment<matrix_a, 16, 16, 16, half, row_major> a;
    fragment<matrix_b, 16, 16, 16, half, col_major> b;
    fragment<accumulator, 16, 16, 16, float> acc;
    fill_fragment(acc, 0.0f);

    load_matrix_sync(a, A + ..., 16);
    load_matrix_sync(b, B + ..., 16);
    mma_sync(acc, a, b, acc);
    store_matrix_sync(C + ..., acc, 16, mem_row_major);
}
```

대부분의 경우 cuDNN·TensorRT가 자동으로 Tensor core를 활용합니다. Custom kernel을 직접 짤 때만 `wmma` API를 봅니다.

## 측정 / 성능 비교

Model별 latency·throughput·전력은 입력 해상도·TensorRT 버전·clock·DLA partition에 따라 크게 달라지므로, target에서 같은 조건으로 측정한 값만 비교합니다. 기록할 항목입니다.

| 항목 | 측정 방법 | 비교 대상 |
|------|-----------|-----------|
| Latency (GPU only) | `trtexec` 또는 application timer | model 크기별 |
| Throughput (GPU+DLA) | GPU·DLA engine 동시 실행 | DLA partition 유무 |
| 전력 | `tegrastats` VDD_* rail | power mode별 |
| Sustained fps·온도 | 1시간 이상 long-run + `tegrastats` | power mode·cooling별 |

여러 camera 입력이 단일 Orin에서 처리되는지는 camera path·전처리·tracking·display를 포함한 end-to-end benchmark로 확인합니다. MAXN에서 sustained 성능이 떨어질 수 있으므로 적정 power mode도 long-run benchmark로 선택합니다([12-07: Thermal](/blog/embedded/modern-recipes/part12-07-thermal)).

## 자주 보는 함정

> JetPack version lock

```bash
# Pre-built container와 host JetPack 불일치
docker run <image>:r35.x ...   # host는 r36
# container 안 CUDA·TensorRT가 host driver와 맞지 않음
```

JetPack version과 container tag, TensorRT 버전을 *반드시* 맞춥니다.

> CPU·GPU 별도 buffer

```c
cpu = malloc(sz);
cudaMalloc(&gpu, sz);
cudaMemcpy(gpu, cpu, sz, cudaMemcpyHostToDevice);   /* 매 frame copy */
```

Jetson은 integrated GPU이므로 `cudaHostAllocMapped` zero-copy를 검토할 수 있지만, 접근 패턴·buffer 유형·동기화 비용에 따라 명시적 복사보다 느릴 수도 있습니다.

> DLA fallback 없이 build

```cpp
config->setDefaultDeviceType(DeviceType::kDLA);
/* 모델에 DLA 미지원 op 1개 → build fail */
```

`kGPU_FALLBACK` flag를 같이 둡니다.

> USB camera로 zero-copy 시도

```bash
v4l2src device=/dev/video0 ! nvinfer ...
# USB cam은 system memory만 — copy 발생
```

Zero-copy를 원하면 *CSI camera* + `nvarguscamerasrc`를 씁니다. USB camera는 표준 V4L2 path를 거치며 한 번 copy됩니다.

> tegrastats logging 없이 production

```bash
./app   # fps·온도 trend 기록 없음 — 성능 저하를 알 수 없음
```

Production은 thermal·power·fps trend logging이 필수입니다.

> Devkit·production module 혼동

Devkit 보드에서 thermal·power를 측정해 놓고 production module도 같을 것이라고 가정하면 어긋납니다. Devkit과 production carrier board는 thermal design이 다르므로 양쪽 모두 측정합니다.

## 정리

- Jetson은 TensorRT + DLA + VPI + DeepStream + Isaac ROS를 묶은 edge AI stack입니다.
- Nano·Xavier·Orin·Thor 라인업은 5~130 W 폭으로 펼쳐지며, AI 성능 수치는 세대마다 precision 기준이 다릅니다.
- DLA·VIC·PVA·NVENC가 *숨은 가속기*로 GPU 부담을 분산시킵니다.
- Integrated GPU에서는 `cudaHostAllocMapped` zero-copy를 검토하되, 명시적 복사와 측정으로 비교합니다.
- DeepStream `(memory:NVMM)` pipeline으로 camera→inference→display 사이의 CPU 복사를 줄이고, 실제 복사 경로는 pipeline 구성에서 확인합니다.
- nvpmodel로 thermal-aware power mode를 선택하고 production에서는 jetson_clocks를 피합니다.
- DLA에 GPU_FALLBACK flag를 함께 두어 unsupported op를 자동 처리합니다.
- JetPack version·container tag·TensorRT 버전을 일치시켜야 deploy가 안정됩니다.

다음 편은 **카메라→NPU zero-copy 파이프라인**입니다.

## 관련 항목

- [12-07: Thermal](/blog/embedded/modern-recipes/part12-07-thermal)
- [12-09: Zero-Copy Camera](/blog/embedded/modern-recipes/part12-09-zero-copy-camera)
- [12-04: TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt)
