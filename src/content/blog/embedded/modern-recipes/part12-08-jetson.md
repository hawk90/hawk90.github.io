---
title: "12-08: Jetson — Nano·Xavier·Orin·Thor·JetPack·DLA·VPI"
date: 2026-05-18T00:00:00
description: "Jetson 라인업의 power·성능 trade-off, JetPack 구성, DLA·VPI·DeepStream을 묶어 자율주행·로봇 stack에서 쓰는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 144
tags: [recipes, jetson, tensorrt, dla, vpi, deepstream, jetpack]
---

## 한 줄 요약

> **"Jetson은 단순한 GPU 보드가 아니라 TensorRT + DLA + VPI + DeepStream을 묶은 stack입니다."** 자율주행·로봇·산업 vision의 사실상 reference platform이고, 같은 코드가 Nano부터 Orin AGX까지 그대로 돌아갑니다.

## 어떤 상황에서 쓰나

카메라 다중 입력 + 실시간 detection·tracking + 5~50 W 전력 budget이 필요한 모든 사례가 후보입니다. 자율주행 ECU, 농업·물류 로봇, 산업 vision inspection, CCTV·NVR analytics, 드론 obstacle detection이 대표적입니다.

Jetson을 고르는 이유는 세 가지입니다. 첫째, NVIDIA CUDA·cuDNN·TensorRT 생태계를 그대로 쓸 수 있어 서버에서 검증한 모델을 적은 수정으로 deploy할 수 있습니다. 둘째, DLA·VIC·NVENC 같은 *fixed-function 가속기*가 동시에 돌아 GPU 부담을 분산시킵니다. 셋째, DeepStream·Isaac ROS 같은 NVIDIA-maintained pipeline이 자율주행·로봇에 잘 맞춰져 있습니다.

## 핵심 개념

라인업은 power·compute로 정렬됩니다.

```text
Board               CPU              GPU                  NPU      INT8 TOPS   전력
Jetson Nano (구)    4× A57           128 Maxwell          -          0.5       5-10 W
Xavier NX           6× Carmel        384 Volta            2 DLA     21         10-20 W
AGX Xavier          8× Carmel        512 Volta            2 DLA     32         10-30 W
Orin Nano           6× A78AE         1024 Ampere          -         40         7-15 W
Orin NX             8× A78AE         1024 Ampere          2 DLA     100        10-25 W
AGX Orin            12× A78AE        2048 Ampere          2 DLA     275        15-60 W
Thor (2025)         14× Neoverse V3  Blackwell + safety   -        1000+       40-130 W
```

자율주행·로봇 production은 *AGX Orin·Thor*가 표준입니다. 개발·prototype·entry edge는 Orin Nano·Orin NX가 가성비가 좋습니다.

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

DLA·VIC·PVA가 Jetson의 *숨은 가속기*입니다.

```text
DLA (Deep Learning Accelerator)
  fixed-function INT8 conv·activation 가속기
  Xavier·Orin에 2개 — TensorRT에서 분리 사용 가능
  GPU 대비 더 낮은 전력으로 INT8 추론

VIC (Video Image Compositor)
  color conversion·resize·blending fixed-function
  GStreamer nvvidconv plugin이 사용

PVA (Programmable Vision Accelerator)
  Vision DSP — VPI의 일부 알고리즘 backend

NVENC/NVDEC
  H.264/H.265/AV1 인코더·디코더 hardware
```

자율주행처럼 GPU·DLA를 같이 쓰면 *세 개의 추론 instance*가 병렬로 굴러갑니다.

## 코드 / 실제 사용 예

### nvpmodel·jetson_clocks

```bash
sudo nvpmodel -q                 # 현재 mode
sudo nvpmodel -m 0               # MAXN
sudo nvpmodel -m 2               # 15W
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

Jetson은 *integrated GPU*라서 CPU·GPU가 같은 DRAM을 씁니다. discrete GPU의 PCIe copy가 없으므로 `cudaHostAllocMapped`로 zero-copy 패턴을 적극 활용합니다.

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
vpiImageCreateWrapper(&src_data, VPI_IMAGE_FORMAT_U8, 0, &src);
vpiImageCreate(W, H, VPI_IMAGE_FORMAT_U8, 0, &dst);

/* lens distortion correction — PVA 빠름·저전력 */
vpiSubmitRemap(stream, VPI_BACKEND_PVA, warp, src, dst, ...);

/* blur — CUDA */
vpiSubmitGaussianFilter(stream, VPI_BACKEND_CUDA,
                         dst, output, 5, 5, 1.0, 1.0, VPI_BORDER_ZERO);

vpiStreamSync(stream);
```

VPI는 *backend agnostic API*라서 같은 코드가 CUDA·PVA·VIC·CPU 어디서든 돌아갑니다. 가장 적합한 backend를 골라 GPU 부담을 분산할 수 있습니다.

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

`(memory:NVMM)` 표시가 *전체 pipeline zero-copy*의 핵심입니다. Camera → ISP → inference → display가 CPU를 한 번도 거치지 않습니다. 8 camera × YOLO inference × tracking이 single Orin AGX에서 30 fps로 돌아갑니다.

### Isaac ROS — GPU-accelerated ROS 2

```cpp
#include "isaac_ros_visual_slam/visual_slam_node.hpp"

int main(int argc, char **argv) {
    rclcpp::init(argc, argv);
    auto slam = std::make_shared<isaac_ros::visual_slam::VisualSlamNode>(
        rclcpp::NodeOptions{});
    rclcpp::spin(slam);
    rclcpp::shutdown();
    return 0;
}
```

Visual SLAM·stereo depth·point cloud·tensor RT 추론까지 ROS 2 node로 wrap되어 있어 robot stack에 바로 끼울 수 있습니다.

### Container deployment

```bash
sudo docker run --runtime=nvidia --gpus all \
    -v /tmp/.X11-unix:/tmp/.X11-unix \
    -e DISPLAY=$DISPLAY \
    nvcr.io/nvidia/l4t-pytorch:r36.2.0-pth2.2-py3
```

NVIDIA Container Toolkit이 host의 CUDA driver를 container에 연결합니다. JetPack version과 container tag(`r36.2.0` 등)을 맞춰야 합니다.

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

Orin AGX, YOLOv8 시리즈, INT8 TensorRT, GPU + 2 DLA 동시 사용입니다.

```text
Model           Latency (GPU only)   Throughput (GPU+2DLA)   전력
YOLOv8n           1.5 ms              1200 fps                25 W
YOLOv8s           2.5 ms               800 fps                30 W
YOLOv8m           5 ms                 450 fps                40 W
YOLOv8l           9 ms                 220 fps                45 W
YOLOv8x          18 ms                 110 fps                50 W
```

YOLOv8n으로 자율주행 8-camera × 60 fps = 480 fps가 단일 Orin에서 처리 가능합니다.

Power mode별 sustained 비교(YOLOv8m)입니다.

```text
Power mode      Sustained fps   Peak temp   Mode 적합
MAXN  (60W)      140            96°C        burst demo
50W              180            91°C        cooling 충분 시
40W              170            87°C        production 권장
30W              140            83°C        thermal 빠듯 시
15W               85            73°C        battery·passive cooling
```

MAXN이 oversubscribe되어 sustained가 떨어지는 패턴이 흔합니다. 40W mode가 sweet spot인 경우가 많습니다.

## 자주 보는 함정

> JetPack version lock

```bash
# Pre-built container와 host JetPack 불일치
docker run nvcr.io/...:r35.2.1 ...   # host는 r36
# CUDA initialization error
```

JetPack version과 container tag, TensorRT 버전을 *반드시* 맞춥니다.

> CPU·GPU 별도 buffer

```c
cpu = malloc(sz);
cudaMalloc(&gpu, sz);
cudaMemcpy(gpu, cpu, sz, cudaMemcpyHostToDevice);   /* 매 frame copy */
```

Jetson은 integrated GPU이므로 `cudaHostAllocMapped` zero-copy가 거의 항상 빠릅니다.

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
./app   /* 1주일 후 fps 30% 떨어진 채 운영 */
```

Production은 thermal·power·fps trend logging이 필수입니다.

> Devkit·production module 혼동

```text
Devkit 보드 thermal·power 측정 → production module도 동일하다고 가정
→ production carrier board에서는 다름
```

Devkit과 production carrier board는 thermal design이 다릅니다. 양쪽 모두 측정합니다.

## 정리

- Jetson은 TensorRT + DLA + VPI + DeepStream + Isaac ROS를 묶은 edge AI stack입니다.
- Nano·Xavier·Orin·Thor 라인업은 5~130 W, 0.5~1000 TOPS 폭으로 펼쳐집니다.
- DLA·VIC·PVA·NVENC가 *숨은 가속기*로 GPU 부담을 분산시킵니다.
- Integrated GPU 특성을 살려 `cudaHostAllocMapped` zero-copy를 적극 활용합니다.
- DeepStream `(memory:NVMM)` pipeline은 camera→inference→display 전체가 zero-copy입니다.
- nvpmodel로 thermal-aware power mode를 선택하고 production에서는 jetson_clocks를 피합니다.
- DLA에 GPU_FALLBACK flag를 함께 두어 unsupported op를 자동 처리합니다.
- JetPack version·container tag·TensorRT 버전을 일치시켜야 deploy가 안정됩니다.

다음 편은 **카메라→NPU zero-copy 파이프라인**입니다.

## 관련 항목

- [6-04: Thermal](/blog/embedded/modern-recipes/part6-04-thermal)
- [6-06: Zero-Copy Camera](/blog/embedded/modern-recipes/part6-06-zero-copy-camera)
- [6-02: TensorRT](/blog/embedded/modern-recipes/part6-02-tensorrt)
- [3-03: Zero-Copy](/blog/embedded/modern-recipes/part3-03-zero-copy)
