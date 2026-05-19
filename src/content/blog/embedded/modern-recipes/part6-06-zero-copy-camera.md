---
title: "6-06: Zero-Copy Camera — V4L2·DMA-BUF·GPU Import·NPU 직결"
date: 2026-05-21T06:00:00
description: "카메라부터 NPU·display까지 한 frame이 한 physical page를 유지하도록 V4L2·DMA-BUF·EGL·CUDA를 연결하는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 36
tags: [recipes, camera, v4l2, dma-buf, zero-copy, isp, libcamera]
---

## 한 줄 요약

> **"Zero-copy camera = 한 frame이 한 physical page를 유지하며 ISP·GPU·NPU·display를 거치는 것입니다."** 1080p × 60 fps에 4~6번 copy하면 4.5 GB/s 메모리 대역폭을 그냥 흘려보냅니다. DMA-BUF로 묶으면 같은 work를 30 fps가 아니라 60 fps로 처리할 수 있습니다.

## 어떤 상황에서 쓰나

자율주행 8-camera vision, 카메라 다중 입력 NVR, drone real-time detection, 산업용 inspection처럼 *카메라 → 추론 → 출력*이 frame-rate에 묶이는 모든 경우가 후보입니다.

문제는 naive 구현이 너무 자주 일어난다는 점입니다. `v4l2src ! videoconvert ! appsink`로 GStreamer pipeline을 짜면 매 stage가 user memory를 copy하고 format conversion까지 합니다. 1080p NV12 한 frame이 ~3 MB라서 60 fps × 6 copy = 1.1 GB/s가 *낭비*됩니다. Memory bandwidth는 edge SoC에서 가장 빠듯한 자원입니다.

DMA-BUF는 Linux kernel의 *cross-driver buffer sharing* mechanism입니다. V4L2(camera) · DRM(display) · GPU · NPU driver가 같은 physical page를 가리키게 만들어 copy 자체를 없앱니다.

## 핵심 개념

DMA-BUF는 *file descriptor*로 buffer를 share합니다.

```text
Producer 측 (예 V4L2 camera driver)
  ↓ VIDIOC_EXPBUF
  fd (file descriptor) 발급
  ↓
Consumer 측 (예 EGL / CUDA / VAAPI)
  ↓ eglCreateImageKHR / cudaImportExternalMemory
  same physical page를 자기 driver의 handle로 mapping
```

fd 한 개가 cross-driver permit이 됩니다. Refcount는 kernel이 관리합니다.

V4L2는 buffer 관리 방식이 세 가지입니다.

```text
V4L2_MEMORY_MMAP     driver 측 buffer를 user에 mmap (copy 가능)
V4L2_MEMORY_USERPTR  user 측 buffer를 driver에 등록
V4L2_MEMORY_DMABUF   외부 DMA-BUF fd를 buffer로 사용 (zero-copy)
```

`DMABUF` mode가 핵심입니다. Camera가 ISP DMA로 직접 write한 page를 그대로 GPU·NPU가 read합니다.

NVIDIA Jetson은 한 단계 더 추상화한 *NVMM (NV Memory Manager)*을 씁니다. GStreamer caps에 `(memory:NVMM)`이 붙으면 pipeline 전체가 NVMM/DMA-BUF로 zero-copy됩니다.

## 코드 / 실제 사용 예

### V4L2 DMA-BUF 요청

```c
int cam = open("/dev/video0", O_RDWR);

struct v4l2_format fmt = {
    .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
    .fmt.pix_mp = {
        .width = 1920, .height = 1080,
        .pixelformat = V4L2_PIX_FMT_NV12,
        .num_planes = 2,
    },
};
ioctl(cam, VIDIOC_S_FMT, &fmt);

struct v4l2_requestbuffers req = {
    .count  = 4,
    .type   = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
    .memory = V4L2_MEMORY_DMABUF,
};
ioctl(cam, VIDIOC_REQBUFS, &req);

int dma_fds[4];
for (int i = 0; i < 4; i++) {
    struct v4l2_exportbuffer exp = {
        .type  = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .index = i,
    };
    ioctl(cam, VIDIOC_EXPBUF, &exp);
    dma_fds[i] = exp.fd;
}
```

`dma_fds[]`가 cross-driver share용 fd입니다.

### EGL import — OpenGL ES texture

```c
EGLint attrs[] = {
    EGL_WIDTH,                     1920,
    EGL_HEIGHT,                    1080,
    EGL_LINUX_DRM_FOURCC_EXT,      DRM_FORMAT_NV12,
    EGL_DMA_BUF_PLANE0_FD_EXT,     dma_fd,
    EGL_DMA_BUF_PLANE0_OFFSET_EXT, 0,
    EGL_DMA_BUF_PLANE0_PITCH_EXT,  1920,
    EGL_DMA_BUF_PLANE1_FD_EXT,     dma_fd,
    EGL_DMA_BUF_PLANE1_OFFSET_EXT, 1920 * 1080,
    EGL_DMA_BUF_PLANE1_PITCH_EXT,  1920,
    EGL_NONE,
};
EGLImageKHR image = eglCreateImageKHR(
    egl_display, EGL_NO_CONTEXT,
    EGL_LINUX_DMA_BUF_EXT, NULL, attrs);

GLuint tex;
glGenTextures(1, &tex);
glBindTexture(GL_TEXTURE_EXTERNAL_OES, tex);
glEGLImageTargetTexture2DOES(GL_TEXTURE_EXTERNAL_OES, image);
```

Camera DMA-BUF가 GLES texture로 *직접* 매핑됩니다. Shader가 같은 physical page를 read합니다.

### CUDA import — Jetson

```c
cudaExternalMemoryHandleDesc desc = {
    .type = cudaExternalMemoryHandleTypeOpaqueFd,
    .handle.fd = dma_fd,
    .size = 1920 * 1080 * 3 / 2,
};
cudaExternalMemory_t ext_mem;
cudaImportExternalMemory(&ext_mem, &desc);

cudaExternalMemoryBufferDesc buf_desc = {
    .offset = 0,
    .size   = 1920 * 1080 * 3 / 2,
};
void *device_ptr;
cudaExternalMemoryGetMappedBuffer(&device_ptr, ext_mem, &buf_desc);

/* device_ptr를 TensorRT setTensorAddress에 그대로 줄 수 있음 */
ctx->setTensorAddress("input", device_ptr);
ctx->enqueueV3(stream);
```

Camera → NPU 사이에 copy가 한 번도 없습니다.

### Capture loop

```c
for (int i = 0; i < 4; i++) {
    struct v4l2_buffer buf = {
        .type   = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .memory = V4L2_MEMORY_DMABUF,
        .index  = i,
        .m.fd   = dma_fds[i],
    };
    ioctl(cam, VIDIOC_QBUF, &buf);
}

int type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE;
ioctl(cam, VIDIOC_STREAMON, &type);

while (running) {
    struct v4l2_buffer buf = {
        .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .memory = V4L2_MEMORY_DMABUF,
    };
    ioctl(cam, VIDIOC_DQBUF, &buf);
    int idx = buf.index;

    inference_on_dma_fd(dma_fds[idx]);
    display_on_dma_fd(dma_fds[idx]);

    ioctl(cam, VIDIOC_QBUF, &buf);
}
```

`DQBUF`로 frame ownership을 받고 `QBUF`로 돌려줍니다. 4-buffer ring이 보통이고, 그 사이 다른 frame이 채워집니다.

### GStreamer NVMM pipeline (Jetson)

```text
gst-launch-1.0 \
  nvarguscamerasrc sensor-id=0 ! \
  'video/x-raw(memory:NVMM),width=1920,height=1080,format=NV12,framerate=60/1' ! \
  nvvidconv ! \
  nvinfer config-file-path=yolo.txt ! \
  nvtracker ll-config-file=tracker.yml ! \
  nvdsosd ! \
  nvegltransform ! nveglglessink
```

`(memory:NVMM)`이 붙은 caps는 entire pipeline이 NVMM/DMA-BUF로 zero-copy됩니다. Camera ISP → inference → display 전체가 CPU를 거치지 않습니다.

### libcamera — modern stack

```cpp
#include <libcamera/libcamera.h>

camera->configure(config.get());

for (auto &fb : framebuffers) {
    auto req = camera->createRequest();
    req->addBuffer(stream, fb.get());
    camera->queueRequest(req.get());
}

/* requestCompleted signal */
camera->requestCompleted.connect([](Request *r) {
    auto &bufs = r->buffers();
    for (auto &[s, fb] : bufs) {
        int fd = fb->planes()[0].fd.get();
        process_dma_fd(fd);
    }
    r->reuse(Request::ReuseBuffers);
    camera->queueRequest(r);
});
```

`libcamera`는 Raspberry Pi 5·NXP·산업 카메라가 표준으로 채택한 modern stack입니다. DMA-BUF가 first-class입니다.

### Display — DRM/KMS PRIME

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

Camera DMA-BUF가 그대로 framebuffer가 되어 display HW가 read합니다. Compositor 없이 *카메라 → 화면*이 zero-copy로 흐릅니다.

### Color conversion in shader

```glsl
#version 300 es
#extension GL_OES_EGL_image_external_essl3 : require
precision highp float;

uniform samplerExternalOES tex;   /* YUV NV12 직접 sample */
in vec2 v_tex;
out vec4 color;

void main() {
    color = texture(tex, v_tex);   /* driver가 자동 YUV→RGB */
}
```

samplerExternalOES는 *driver가 YUV→RGB를 자동 수행*합니다. CPU에서 conversion하지 않습니다.

## 측정 / 성능 비교

1080p 60 fps × YOLOv8s 추론 + display, Jetson Orin Nano입니다.

```text
Pipeline                                 fps   CPU 사용률   Memory BW
v4l2src ! videoconvert ! appsink          25    180%         3.8 GB/s
v4l2src ! nvvidconv ! appsink             45     90%         1.7 GB/s
nvarguscamerasrc ! nvvidconv ! nvinfer    60     20%         0.6 GB/s
                  (NVMM zero-copy)
```

CPU 사용률이 1/9, memory bandwidth가 1/6으로 줄어듭니다. 같은 hardware에서 frame rate 2.4배가 나옵니다.

Multi-camera 8 stream input (Orin AGX) 비교입니다.

```text
구현                                  Total fps   Memory BW
8× user-space copy pipeline             80          18 GB/s (saturated)
8× NVMM zero-copy DeepStream           480           2.4 GB/s
```

자율주행 8-camera × 60 fps = 480 fps가 단일 보드에서 가능해지는 이유가 zero-copy입니다.

## 자주 보는 함정

> V4L2 MMAP을 zero-copy로 오해

```c
req.memory = V4L2_MEMORY_MMAP;
/* user는 mmap된 buffer를 보고 zero-copy라 생각 */
/* 하지만 GPU·NPU에 넘기려면 copy 발생 */
```

GPU·NPU와 share하려면 `V4L2_MEMORY_DMABUF`를 씁니다. MMAP은 CPU 처리에만 zero-copy입니다.

> DMA-BUF fd close 누락

```c
ioctl(VIDIOC_EXPBUF);   /* fd 4개 */
/* close(fd) 빠뜨림 → buffer leak */
```

Stream stop 시 명시적으로 close합니다. RAII wrapper로 묶는 것이 안전합니다.

> Camera·GPU page size 불일치

```text
Camera 4 KB page · GPU MMU 64 KB page
→ alignment fail → import error
```

`dma_buf_attach`로 device 간 attribute를 negotiate하면 driver가 호환 가능한 layout을 협상합니다. Backend가 안 풀리면 contiguous allocator(CMA)로 fallback합니다.

> Format mismatch on import

```c
EGL import NV12, GL shader는 RGB texture로 sample
→ 화면 검정 또는 색 뒤틀림
```

NV12 import는 `samplerExternalOES` + YUV-aware shader를 씁니다.

> USB camera로 zero-copy 시도

```text
USB cam → URB → system memory copy → 어떤 trick도 zero-copy 안 됨
```

Zero-copy를 원하면 CSI camera + ISP path를 씁니다. USB는 본질적으로 한 번 copy가 일어납니다.

> Format conversion을 CPU에서

```c
yuv420_to_rgb_scalar(src, dst);   /* CPU 50% */
```

VIC·GPU shader로 옮기면 CPU가 거의 idle해집니다.

## 정리

- Zero-copy camera는 한 frame이 한 physical page를 유지하며 ISP·GPU·NPU·display를 통과하는 패턴입니다.
- V4L2 `V4L2_MEMORY_DMABUF`로 카메라 buffer를 fd로 export합니다.
- EGL `EGL_LINUX_DMA_BUF_EXT` 또는 CUDA `cudaImportExternalMemory`로 GPU에 import합니다.
- Jetson NVMM caps `(memory:NVMM)`는 전체 GStreamer pipeline이 zero-copy로 동작합니다.
- libcamera는 modern Linux camera stack이고 DMA-BUF가 first-class입니다.
- DRM PRIME으로 카메라 buffer를 directly framebuffer로 쓰면 display까지 zero-copy됩니다.
- USB camera는 본질적으로 한 번 copy됩니다. Zero-copy가 필요하면 CSI camera + ISP path를 씁니다.
- Memory bandwidth는 edge SoC에서 가장 빠듯한 자원이고 zero-copy는 가장 큰 throughput 회복 기법입니다.

다음 편은 **온디바이스 LLM**입니다.

## 관련 항목

- [6-05: Jetson](/blog/embedded/modern-recipes/part6-05-jetson)
- [6-07: 온디바이스 LLM](/blog/embedded/modern-recipes/part6-07-llama-cpp-edge)
- [3-03: Zero-Copy](/blog/embedded/modern-recipes/part3-03-zero-copy)
- [1-04: Device Tree](/blog/embedded/modern-recipes/part1-04-device-tree)
