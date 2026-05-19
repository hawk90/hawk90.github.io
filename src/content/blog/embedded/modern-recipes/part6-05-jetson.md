---
title: "6-05: Jetson 최적화 — TensorRT·DLA·VPI·DeepStream"
date: 2026-05-21T05:00:00
description: "Jetson AGX Orin·Xavier 최적화. TensorRT·DLA·VPI·DeepStream pipeline. 자율주행 사례."
series: "Modern Embedded Recipes"
seriesOrder: 35
tags: [recipes, jetson, tensorrt, dla, vpi, deepstream]
draft: true
---

## 한 줄 요약

> **"Jetson = TensorRT + DLA + VPI + DeepStream"** — NVIDIA edge AI stack.

## Jetson 라인업 (2024-)

| Board | CPU | GPU | NPU | TOPS |
|---|---|---|---|---|
| Jetson Nano | 4× A57 | 128 Maxwell | — | 0.5 |
| Xavier NX | 6× Carmel | 384 Volta | 2 DLA | 21 |
| AGX Xavier | 8× Carmel | 512 Volta | 2 DLA | 32 |
| Orin Nano | 6× A78AE | 1024 Ampere | — | 40 |
| AGX Orin | 12× A78AE | 2048 Ampere | 2 DLA | 275 |
| Thor (2025) | 14× Neoverse V3 | Blackwell | — | 1000+ |

자율주행 — *Orin·Thor 표준*.

## JetPack

```bash
# Jetson SDK
sudo apt install nvidia-jetpack

# 포함:
# CUDA·cuDNN·TensorRT
# Multimedia (V4L2·gstreamer)
# VPI (Vision Programming Interface)
# DeepStream SDK
# Isaac ROS
```

## DLA — Deep Learning Accelerator

```cpp
/* TensorRT — DLA enable */
config->setDefaultDeviceType(nvinfer1::DeviceType::kDLA);
config->setDLACore(0);
config->setFlag(BuilderFlag::kGPU_FALLBACK);
config->setFlag(BuilderFlag::kINT8);
```

DLA — *별도 INT8 hardware*. GPU와 *parallel*.

```text
Orin AGX:
  GPU peak:    170 TOPS (INT8)
  DLA × 2:     105 TOPS total (INT8)
  Combined:    275 TOPS
```

Pipeline 1 → GPU, Pipeline 2 → DLA — *동시 처리*.

## VPI — Vision Programming Interface

```cpp
#include <vpi/Image.h>
#include <vpi/algo/GaussianFilter.h>

VPIStream stream;
vpiStreamCreate(VPI_BACKEND_CUDA, &stream);

VPIImage input, output;
vpiImageCreateWrapper(&input_data, VPI_IMAGE_FORMAT_U8, 0, &input);
vpiImageCreate(W, H, VPI_IMAGE_FORMAT_U8, 0, &output);

vpiSubmitGaussianFilter(stream, VPI_BACKEND_CUDA, input, output, 5, 5, 1.0, 1.0, VPI_BORDER_ZERO);
vpiStreamSync(stream);
```

VPI — *CUDA·PVA·VIC backend 통합*. Image processing 표준.

## PVA — Programmable Vision Accelerator

```text
Orin PVA:
  - 2 PVA core
  - Image processing 전용 DSP
  - VPI에서 사용
  - GPU·DLA보다 *저전력*
```

Camera ISP·feature extraction — PVA offload.

## DeepStream — Multi-Camera Pipeline

```bash
# DeepStream config
[application]
gie-kitti-output-dir=./output

[tiled-display]
enable=1
rows=2
columns=4

[source0]
type=3  # URI
uri=file://camera0.mp4

[primary-gie]
enable=1
config-file=config_yolov8.txt
```

```bash
deepstream-app -c deepstream.txt
```

8-camera × inference × tracking — *단일 binary*. ROS·gstreamer plugin도.

## gstreamer + DeepStream Plugins

```text
gst-launch-1.0 \
  nvarguscamerasrc ! \
  'video/x-raw(memory:NVMM),width=1920,height=1080,format=NV12' ! \
  nvinfer config-file-path=yolo.txt ! \
  nvtracker ll-config-file=tracker.yml ! \
  nvdsosd ! \
  nvegltransform ! nveglglessink
```

*Zero-copy* throughout — `NVMM` memory format. CPU 안 거침.

## CUDA·Tensor Core

```cuda
__global__ void fused_conv_relu(float *in, float *w, float *out, int N) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= N) return;
    float sum = 0;
    for (int k = 0; k < KERNEL; k++) sum += in[i + k] * w[k];
    out[i] = fmaxf(sum, 0);   /* ReLU */
}

fused_conv_relu<<<grid, block, 0, stream>>>(in, w, out, N);
```

Ampere — *Tensor core* INT8·BF16·TF32. cuDNN가 자동 활용.

## ROS 2 + Isaac

```cpp
/* Isaac ROS — NVIDIA ROS 2 packages */
#include "isaac_ros_visual_slam/visual_slam_node.hpp"

auto slam = std::make_shared<IsaacVisualSlamNode>();
rclcpp::spin(slam);
```

Isaac ROS — GPU-accelerated ROS 2 nodes. 자율주행 stack.

## Memory — Pinned·Zero-Copy

```cpp
/* Pinned host memory — DMA 빠름 */
float *pinned;
cudaMallocHost(&pinned, size);
cudaMemcpyAsync(device_buf, pinned, size, cudaMemcpyHostToDevice, stream);

/* Zero-copy — same buffer on GPU·CPU */
float *zero_copy;
cudaHostAlloc(&zero_copy, size, cudaHostAllocMapped);
float *device_ptr;
cudaHostGetDevicePointer(&device_ptr, zero_copy, 0);

/* kernel uses device_ptr directly */
```

Jetson은 *integrated GPU* — physical memory 공유. `cudaHostAllocMapped` 효율.

## tegrastats — System Monitor

```bash
sudo tegrastats --interval 1000

# RAM 12345/30536MB SWAP 0/0MB
# CPU [50%@2200,30%@2200,...] GR3D_FREQ 80%@1300
# CPU@45.5C GPU@52C SOC@53C
# VDD_GPU_SOC 6800/6800 VDD_CPU_CV 800/800
```

CPU·GPU·thermal·power 동시 측정.

## nsys + tegrastats 결합

```bash
# Profile
nsys profile --trace=cuda,nvtx,osrt ./app

# 동시에 tegrastats logging
sudo tegrastats --logfile log.txt &

# Nsight Systems 분석:
# - GPU kernel utilization
# - CPU·GPU overlap
# - Memory transfer
# - Thermal events
```

## ROS 2 + DDS

```cpp
/* DDS — real-time pub/sub */
rclcpp::QoS qos = rclcpp::QoS(rclcpp::KeepLast(5))
                    .reliable()
                    .durability_volatile();

auto pub = node->create_publisher<sensor_msgs::msg::Image>("camera", qos);
auto sub = node->create_subscription<...>("...", qos, callback);
```

자율주행 — RT QoS + Cyclone DDS.

## Container — NVIDIA Container Toolkit

```bash
# nvidia-docker
docker run --runtime=nvidia --gpus all \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  nvcr.io/nvidia/l4t-pytorch:r35.2.1-pth2.0-py3
```

Jetson은 *L4T (Linux for Tegra)*. Pre-built container — *fast deployment*.

## Power Mode 전환 — 자동차 사례

```bash
# Driving mode (max performance)
sudo nvpmodel -m 0   # MAXN — 60W
sudo jetson_clocks

# Parking mode (low power)
sudo nvpmodel -m 2   # 15W
```

자동차 — *주행 mode·정차 mode* 동적 전환.

## VPI Pipeline 사례 — ISP·Stereo·Object

```cpp
/* Pipeline */
VPIStream stream;
vpiStreamCreate(VPI_BACKEND_CUDA | VPI_BACKEND_PVA, &stream);

/* 1. Lens distortion correct (PVA) */
vpiSubmitRemap(stream, VPI_BACKEND_PVA, ...);

/* 2. Stereo depth (CUDA) */
vpiSubmitStereoDisparityEstimator(stream, VPI_BACKEND_CUDA, ...);

/* 3. Feature extraction (PVA) */
vpiSubmitHarrisCornersDetector(stream, VPI_BACKEND_PVA, ...);

vpiStreamSync(stream);
```

각 stage *적절한 backend*. CPU 안 거침.

## 자동차·자율주행 사례

```text
NVIDIA Drive Thor:
  - Cortex-A78AE + Cortex-R52 + Blackwell GPU
  - 1000+ TOPS
  - ASIL-D safety island
  - SafeTrack + Functional Safety
  
Mercedes·BYD·Volvo·Polestar 채택.
```

## 자주 하는 실수

> ⚠️ jetson_clocks production

```bash
sudo jetson_clocks   # always max — thermal trip
```

→ nvpmodel + thermal-aware mode.

> ⚠️ GPU+CPU separate buffer

```c
cpu_buf = malloc(...);
gpu_buf = cudaMalloc(...);
cudaMemcpy(gpu_buf, cpu_buf, ...);   /* 매 frame copy */
```

→ Jetson은 *zero-copy* (cudaHostAllocMapped).

> ⚠️ DLA fallback 없이 unsupported op

```cpp
config->setDefaultDeviceType(DeviceType::kDLA);
/* op 불가 → build fail */
```

→ `kGPU_FALLBACK`.

> ⚠️ Burst benchmark만

→ thermal-throttled sustained 측정.

## 정리

- Jetson stack = **TensorRT + DLA + VPI + DeepStream + Isaac ROS**.
- GPU + DLA *parallel* — combined 275 TOPS.
- **VPI·PVA** — image processing offload.
- **DeepStream** = multi-camera pipeline.
- Zero-copy memory (integrated GPU).
- 자율주행 — Drive Thor·Orin 표준.

다음 편은 **Zero-Copy Camera**.

## 관련 항목

- [6-04: Thermal](/blog/embedded/modern-recipes/part6-04-thermal)
- [6-06: Zero-Copy Camera](/blog/embedded/modern-recipes/part6-06-zero-copy-camera)
