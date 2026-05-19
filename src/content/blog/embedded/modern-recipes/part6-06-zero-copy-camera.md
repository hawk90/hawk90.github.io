---
title: "6-06: Zero-Copy Camera Path — V4L2·DMA-BUF·GPU·NPU"
date: 2026-05-21T06:00:00
description: "Camera → ISP → DMA-BUF → GPU → NPU end-to-end zero-copy. V4L2 multi-plane, DRM/KMS."
series: "Modern Embedded Recipes"
seriesOrder: 36
tags: [recipes, camera, v4l2, dma-buf, zero-copy, isp]
draft: true
---

## 한 줄 요약

> **"Camera → NPU end-to-end zero-copy"** — V4L2 + DMA-BUF + GPU compute + NPU inference.

## 일반 Pipeline의 Copy

```text
Sensor (CSI-2) → ISP → DDR → user buffer → GPU upload → GPU memory →
  NPU upload → NPU memory → result downloads → ...

매 stage 1-2 copy = total 4-6 copy
1080p × 60 fps × 6 byte = 750 MB/s × 6 = 4.5 GB/s 낭비
```

## Zero-Copy Pipeline

```text
Sensor → ISP DMA → DMA-BUF →
  GPU access (shared mapping) →
  NPU access (shared mapping) →
  Display DMA-BUF
  
모든 stage *같은 physical pages*.
```

## V4L2 DMA-BUF Mode

```c
int cam_fd = open("/dev/video0", O_RDWR);

/* Set format */
struct v4l2_format fmt = {
    .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
    .fmt.pix_mp = {
        .width = 1920, .height = 1080,
        .pixelformat = V4L2_PIX_FMT_NV12,
        .num_planes = 2,
    },
};
ioctl(cam_fd, VIDIOC_S_FMT, &fmt);

/* Request DMA-BUF buffers */
struct v4l2_requestbuffers req = {
    .count = 4,
    .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
    .memory = V4L2_MEMORY_DMABUF,
};
ioctl(cam_fd, VIDIOC_REQBUFS, &req);

/* Export — get DMA-BUF fd */
for (int i = 0; i < 4; i++) {
    struct v4l2_exportbuffer exp = {
        .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .index = i,
    };
    ioctl(cam_fd, VIDIOC_EXPBUF, &exp);
    dma_fds[i] = exp.fd;
}
```

`dma_fds[]` — *cross-driver shared*.

## GPU Import — EGL·CUDA

```c
/* OpenGL ES — EGLImage */
EGLClientBuffer client_buffer = (EGLClientBuffer)(intptr_t)dma_fd;
EGLImageKHR image = eglCreateImageKHR(
    egl_display, EGL_NO_CONTEXT,
    EGL_LINUX_DMA_BUF_EXT, client_buffer, attrs);

GLuint tex;
glBindTexture(GL_TEXTURE_EXTERNAL_OES, tex);
glEGLImageTargetTexture2DOES(GL_TEXTURE_EXTERNAL_OES, image);
```

```c
/* CUDA on Jetson */
cudaExternalMemoryHandleDesc desc = {
    .type = cudaExternalMemoryHandleTypeOpaqueFd,
    .handle.fd = dma_fd,
    .size = w * h * 3 / 2,
};
cudaExternalMemory_t mem;
cudaImportExternalMemory(&mem, &desc);
```

DMA-BUF fd → GPU texture *직접 mapping*. CPU memcpy 0.

## V4L2 Stream Loop

```c
/* Queue all buffers */
for (int i = 0; i < 4; i++) {
    struct v4l2_buffer buf = {
        .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .memory = V4L2_MEMORY_DMABUF,
        .index = i,
        .m.fd = dma_fds[i],
    };
    ioctl(cam_fd, VIDIOC_QBUF, &buf);
}

/* Start */
int type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE;
ioctl(cam_fd, VIDIOC_STREAMON, &type);

/* Capture loop */
while (1) {
    struct v4l2_buffer buf = { .memory = V4L2_MEMORY_DMABUF };
    ioctl(cam_fd, VIDIOC_DQBUF, &buf);   /* wait next frame */
    
    int frame_idx = buf.index;
    int dma_fd = dma_fds[frame_idx];
    
    /* Process — same buffer */
    gpu_process(dma_fd);
    npu_inference(dma_fd);
    display(dma_fd);
    
    /* Return buffer */
    ioctl(cam_fd, VIDIOC_QBUF, &buf);
}
```

`DQBUF`/`QBUF` — *buffer ownership* ring. Camera·CPU·display 사이.

## DRM/KMS Display

```c
struct drm_prime_handle prime = { .fd = dma_fd };
ioctl(drm_fd, DRM_IOCTL_PRIME_FD_TO_HANDLE, &prime);

uint32_t handles[4] = { prime.handle };
uint32_t pitches[4] = { 1920 };
uint32_t offsets[4] = { 0 };
uint32_t fb_id;
drmModeAddFB2(drm_fd, 1920, 1080, DRM_FORMAT_NV12,
              handles, pitches, offsets, &fb_id, 0);

drmModeSetCrtc(drm_fd, crtc_id, fb_id, 0, 0, &conn_id, 1, &mode);
```

Camera → DMA-BUF → display → *0 copy*. Wayland·DRM atomic.

## ISP — Sensor Tuning

```text
ISP (Image Signal Processor) pipeline:
  Bayer raw → Demosaic → AWB → CCM → Gamma → Tonemap → YUV
  
SoC ISP:
  - 자동차 SoC: Mobileye·NVIDIA·Qualcomm
  - 모바일: ISP integrated
  
Output:
  YUV420 NV12 — 표준
  DDR DMA 자동
```

ISP hardware — *CPU·GPU 안 거침*.

## Gstreamer + DMA-BUF

```bash
gst-launch-1.0 \
  v4l2src device=/dev/video0 ! \
  'video/x-raw,format=NV12,width=1920,height=1080,framerate=60/1' ! \
  glimagesink
```

`gst-v4l2-dmabuf` plugin — *all-pipeline zero-copy*.

## NVIDIA NVMM

```c
/* Jetson — NVMM (NV Memory Manager) */
NvBufSurface *surf;
NvBufSurfaceCreate(&surf, 1, &params);
/* surf — GPU·NPU·display 공유 가능 */
```

Jetson DeepStream — NVMM 표준. Camera·GPU·display·encoder *all NVMM*.

## ARM IPA — Image Processing Algorithm

```text
libcamera framework:
  Application
    ↓
  libcamera (high-level API)
    ↓
  IPA (Image Processing Algorithm)
    ↓
  V4L2 device
    ↓
  Sensor driver
```

libcamera — *modern Linux camera stack*. Raspberry Pi 표준.

## Multi-Camera — 자동차

```text
ADAS 8 camera sync:
  Each → /dev/videoN
  V4L2 multi-plane DMA-BUF
  GPU compute fusion
  NPU detection per stream
  
Wall-clock sync via PTP (Precision Time Protocol)
```

## Memory Format

```text
NV12 (Y + interleaved UV)
  Y plane: 1920 × 1080 bytes
  UV plane: 1920 × 540 bytes (subsampled)
  
NV12_T (tiled) — GPU/encoder native
NV21 — Android (UV swapped)
RGB888 — display·rendering
P010 — 10-bit HDR
```

ISP·codec — *NV12 native*. Color conversion → DMA-BUF로 *zero-copy*.

## Color Conversion — On GPU

```glsl
/* OpenGL ES shader */
#version 300 es
precision highp float;
uniform samplerExternalOES tex_y;
uniform samplerExternalOES tex_uv;

in vec2 v_tex;
out vec4 frag_color;

void main() {
    float y = texture(tex_y, v_tex).r;
    vec2 uv = texture(tex_uv, v_tex).rg - 0.5;
    /* YUV → RGB */
    frag_color = vec4(
        y + 1.402 * uv.y,
        y - 0.344 * uv.x - 0.714 * uv.y,
        y + 1.772 * uv.x, 1.0);
}
```

DMA-BUF YUV → shader → display. CPU 0.

## NPU Direct Input — TensorRT

```cpp
/* Jetson TensorRT — NV12 input */
cudaExternalMemoryGetMappedBuffer(&device_ptr, ext_mem, &desc);

/* Direct inference on camera buffer */
context->setTensorAddress("input", device_ptr);
context->enqueueV3(stream);
```

NPU가 *camera DMA 직접 read*. Preprocessing GPU·NPU에서 *fused*.

## Cortex-M55 — Camera + NPU

```c
/* Embedded camera (low-res) */
HAL_DCMI_Start_DMA(&hdcmi, MODE_CONTINUOUS, frame_buf, FRAME_SIZE);

/* Helium MVE preprocessing */
preprocess_mve(frame_buf, preproc_buf);

/* Ethos-U NPU inference */
ethosu_invoke(&ethosu, preproc_buf, output_buf, ...);
```

MCU edge AI — *DCMI camera → NPU* 가능. ~10 fps 추론.

## libcamera Application

```cpp
#include <libcamera/libcamera.h>

camera->requestCompleted.connect(this, &on_request_complete);

auto config = camera->generateConfiguration({StreamRole::Viewfinder});
config->at(0).pixelFormat = formats::NV12;
config->at(0).size = {1920, 1080};

camera->configure(config.get());

/* DMA-BUF frame requests */
auto request = camera->createRequest();
auto fb = framebuffers[i];   /* DMA-BUF mapped */
request->addBuffer(stream, fb.get());
camera->queueRequest(request.get());
```

libcamera — *Raspberry Pi 5·NXP·산업 카메라 표준*.

## Tracing — V4L2·DMA-BUF

```bash
# Linux tracepoints
echo 1 > /sys/kernel/debug/tracing/events/v4l2/enable
echo 1 > /sys/kernel/debug/tracing/events/dma_fence/enable

cat /sys/kernel/debug/tracing/trace
```

V4L2 + DMA-BUF + GPU fence — *full pipeline timing*.

## 자주 하는 실수

> ⚠️ V4L2 MMAP vs DMA-BUF

```c
req.memory = V4L2_MEMORY_MMAP;   /* user buffer copy 발생 */
```

→ `V4L2_MEMORY_DMABUF` — zero-copy.

> ⚠️ DMA-BUF fd close 안 함

```c
ioctl(VIDIOC_EXPBUF);   /* fd 4개 받음 */
/* close(fd) 안 함 → leak */
```

→ stream stop 시 close.

> ⚠️ Camera·GPU 다른 page size

```text
Camera DMA 4 KB page, GPU MMU 64 KB page
→ alignment 안 맞으면 fail
```

→ `dma_buf_attach`로 negotiate.

> ⚠️ Wrong format on import

```c
EGL import NV12, but GL texture RGB → black screen
```

→ format 명시 + correct shader.

## 정리

- Zero-copy camera = **V4L2 DMA-BUF + GPU import + NPU import + display**.
- ISP·codec — *NV12 NVMM/DMA-BUF native*.
- **libcamera** — modern Linux camera stack.
- 4-6 copy → *0 copy* — bandwidth 6x 절약.
- 자율주행 8-camera sync — DMA-BUF + PTP.
- Cortex-M55 — DCMI + Ethos-U NPU도 가능.

다음 편은 **온디바이스 LLM**.

## 관련 항목

- [6-05: Jetson](/blog/embedded/modern-recipes/part6-05-jetson)
- [6-07: 온디바이스 LLM](/blog/embedded/modern-recipes/part6-07-llama-cpp-edge)
