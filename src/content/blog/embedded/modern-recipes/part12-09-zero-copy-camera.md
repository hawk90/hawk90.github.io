---
title: "Zero-Copy Camera Pipeline — V4L2·DMA-BUF·GPU Import·NPU 직결"
slug: "embedded/modern-recipes/part12-09-zero-copy-camera"
date: 2026-04-21T09:08:00
description: "카메라부터 NPU·display까지 한 frame이 한 physical page를 유지하도록 V4L2·DMA-BUF·EGL·CUDA를 연결하는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 145
tags: [recipes, camera, v4l2, dma-buf, zero-copy, isp, libcamera]
topics: ["embedded"]
---

## 한 줄 요약

> **"Zero-copy camera는 가능한 한 같은 공유 buffer를 ISP·GPU·NPU·display 사이에서 재사용하는 패턴입니다."** 1080p × 60 fps에서 copy 횟수와 pixel format에 따라 메모리 대역폭 부담이 커질 수 있습니다. DMA-BUF를 사용해도 실제 처리량 향상은 driver·format·pipeline 구성에서 측정합니다.

## 어떤 상황에서 쓰나

자율주행 8-camera vision, 카메라 다중 입력 NVR, drone real-time detection, 산업용 inspection처럼 *카메라 → 추론 → 출력*이 frame-rate에 묶이는 모든 경우가 후보입니다.

문제는 naive 구현이 너무 자주 일어난다는 점입니다. `v4l2src ! videoconvert ! appsink`로 GStreamer pipeline을 짜면 매 stage가 user memory를 copy하고 format conversion까지 합니다. 1080p NV12 한 frame이 ~3 MB라서 60 fps × 6 copy = 1.1 GB/s가 *낭비*됩니다. Edge SoC는 CPU·GPU·NPU·display가 같은 DRAM bandwidth를 나눠 쓰므로 이 낭비가 그대로 다른 block의 몫을 줄입니다.

DMA-BUF는 Linux kernel의 *cross-driver buffer sharing* mechanism입니다. V4L2(camera) · DRM(display) · GPU · NPU driver가 같은 physical page를 가리키게 만들어 copy 자체를 없앱니다.

## 핵심 개념

Camera부터 display까지 한 frame이 한 physical page를 유지하는 모습을 그림으로 정리합니다.

![Zero-copy camera pipeline — DMA-BUF fd로 묶인 한 page](/images/blog/modern-recipes/diagrams/part6-06-zero-copy-camera.svg)

DMA-BUF는 *file descriptor*로 buffer를 share합니다. 흐름은 두 단계입니다.

1. **Export** — buffer를 가진 driver(예: V4L2 camera driver)가 `VIDIOC_EXPBUF`로 fd를 발급합니다.
2. **Import** — 다른 driver(EGL, DRM, VAAPI 등)가 그 fd를 받아 같은 physical page를 자기 driver의 handle로 mapping합니다. EGL은 `eglCreateImageKHR`, DRM은 `DRM_IOCTL_PRIME_FD_TO_HANDLE`을 씁니다.

fd 한 개가 cross-driver permit이 됩니다. Refcount는 kernel이 관리합니다.

V4L2는 buffer 관리 방식이 세 가지입니다.

| Mode | 동작 |
|------|------|
| `V4L2_MEMORY_MMAP` | driver 측 buffer를 user에 mmap (copy 가능) |
| `V4L2_MEMORY_USERPTR` | user 측 buffer를 driver에 등록 |
| `V4L2_MEMORY_DMABUF` | 외부 DMA-BUF fd를 buffer로 사용 (zero-copy) |

공유 방향은 두 가지입니다. Camera driver가 buffer를 할당하게 하려면 `MMAP` mode로 요청한 뒤 `VIDIOC_EXPBUF`로 fd를 export합니다. 반대로 GPU·display·dma-heap 같은 다른 allocator가 만든 fd를 camera에 넘기려면 `DMABUF` mode로 import합니다. 어느 쪽이든 camera ISP가 DMA로 write한 page를 GPU·NPU가 그대로 read합니다.

NVIDIA Jetson은 한 단계 더 추상화한 *NVMM* buffer(`NvBufSurface`)를 씁니다. GStreamer caps에 `(memory:NVMM)`이 붙은 구간은 NVMM buffer로 넘어가므로 CPU 복사를 피할 수 있습니다.

## 코드 / 실제 사용 예

### V4L2 buffer export

Camera driver가 할당한 buffer 4개를 `MMAP` mode로 요청하고 각각을 DMA-BUF fd로 export합니다.

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
    .memory = V4L2_MEMORY_MMAP,
};
ioctl(cam, VIDIOC_REQBUFS, &req);

int dma_fds[4];
for (int i = 0; i < 4; i++) {
    struct v4l2_exportbuffer exp = {
        .type  = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .index = i,
        .plane = 0,
        .flags = O_CLOEXEC,
    };
    ioctl(cam, VIDIOC_EXPBUF, &exp);
    dma_fds[i] = exp.fd;
}
```

`dma_fds[]`가 cross-driver share용 fd입니다. NV12를 2-plane으로 받으면 plane마다 export하거나, driver가 1-plane NV12(`V4L2_PIX_FMT_NV12`, `num_planes = 1`)를 지원하는지 확인합니다.

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

CUDA의 `cudaImportExternalMemory`는 Vulkan·OpenGL이 export한 opaque fd용이라 DMA-BUF fd를 그대로 받지 않습니다. Jetson에서는 위에서 만든 EGLImage를 CUDA driver API(`cudaEGL.h`)로 등록해 device pointer를 얻습니다.

```c
CUgraphicsResource res;
cuGraphicsEGLRegisterImage(&res, image, CU_GRAPHICS_MAP_RESOURCE_FLAGS_NONE);

CUeglFrame frame;
cuGraphicsResourceGetMappedEglFrame(&frame, res, 0, 0);

/* pitch-linear일 때 frame.frame.pPitch[0]이 Y plane, [1]이 UV plane */
nv12_to_tensor<<<grid, block, 0, stream>>>(
    frame.frame.pPitch[0], frame.frame.pPitch[1], frame.pitch, input_dev);
ctx->setTensorAddress("input", input_dev);
ctx->enqueueV3(stream);

cuGraphicsUnregisterResource(res);
```

Camera buffer를 CPU로 복사하지 않고 GPU kernel이 바로 읽습니다. 모델 입력이 보통 RGB planar라서 NV12→tensor 변환 kernel 한 번은 남지만, 이것은 GPU 안의 연산입니다. Jetson Multimedia API의 `NvBufSurface`를 쓰면 같은 일을 `NvBufSurfaceMapEglImage`로 할 수 있습니다.

### Capture loop

```c
struct v4l2_plane planes[1];

for (int i = 0; i < 4; i++) {
    struct v4l2_buffer buf = {
        .type   = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .memory = V4L2_MEMORY_MMAP,
        .index  = i,
        .length = 1,
        .m.planes = planes,
    };
    ioctl(cam, VIDIOC_QBUF, &buf);
}

int type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE;
ioctl(cam, VIDIOC_STREAMON, &type);

while (running) {
    struct v4l2_buffer buf = {
        .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .memory = V4L2_MEMORY_MMAP,
        .length = 1,
        .m.planes = planes,
    };
    ioctl(cam, VIDIOC_DQBUF, &buf);
    int idx = buf.index;

    inference_on_dma_fd(dma_fds[idx]);
    display_on_dma_fd(dma_fds[idx]);

    ioctl(cam, VIDIOC_QBUF, &buf);
}
```

`DQBUF`로 frame ownership을 받고 `QBUF`로 돌려줍니다. 받은 `index`로 미리 export해 둔 fd를 찾으므로 frame마다 새 fd를 만들지 않습니다. 4-buffer ring 정도로 시작해 consumer 지연에 맞춰 개수를 조정하고, 그 사이 다른 frame이 채워집니다.

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

`(memory:NVMM)`이 붙은 caps 구간은 NVMM buffer로 넘어가므로 camera ISP → inference → display 사이의 CPU 복사를 피할 수 있습니다. 실제로 복사가 없는지는 element마다 caps와 `nvvidconv` 변환 경로를 확인합니다.

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

`libcamera`는 Raspberry Pi OS의 기본 camera stack으로 쓰이는 Linux camera framework입니다. `FrameBuffer`의 plane이 DMA-BUF fd를 들고 있어 다른 driver로 넘기기 쉽습니다.

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

Camera DMA-BUF가 그대로 framebuffer가 되어 display HW가 read합니다. Display controller가 NV12 plane과 그 buffer의 pitch·alignment를 지원하면 compositor 없이 *카메라 → 화면*이 zero-copy로 흐릅니다. NV12는 UV plane도 handle·offset으로 넘겨야 하므로 실제 코드에서는 `handles[1]`·`offsets[1]`도 채웁니다.

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

samplerExternalOES의 색 변환과 CPU 개입 여부는 extension·driver·texture format에 따라 확인합니다. CPU conversion을 피할 수 있는 경로도 있지만, 모든 pipeline에서 자동으로 보장되지는 않습니다.

## 측정 / 성능 비교

Pipeline 비교는 같은 camera·해상도·모델·display 경로에서 buffer 경로만 바꿔 측정합니다. 예를 들어 Jetson에서는 다음 세 구성을 나란히 둡니다.

```bash
# CPU 변환 + user-space copy
gst-launch-1.0 v4l2src ! videoconvert ! appsink
# VIC 변환
gst-launch-1.0 v4l2src ! nvvidconv ! appsink
# NVMM buffer 유지
gst-launch-1.0 nvarguscamerasrc ! nvvidconv ! nvinfer ...
```

| 항목 | 측정 방법 |
|---|---|
| fps | `fpsdisplaysink` 또는 application timestamp |
| CPU 사용률 | `top`·`tegrastats` |
| Memory bandwidth | `tegrastats`의 EMC 사용률, SoC별 PMU |
| End-to-end latency | capture timestamp → display |

Multi-camera 구성도 같은 표로 stream 수를 늘려 가며 측정합니다. 여러 camera를 단일 보드에서 처리할 수 있는지는 zero-copy 여부만으로 결정되지 않으며, 전처리·tracking·display를 포함한 전체 pipeline benchmark가 필요합니다.

## 자주 보는 함정

> V4L2 MMAP을 zero-copy로 오해

```c
req.memory = V4L2_MEMORY_MMAP;
void *p = mmap(NULL, len, PROT_READ, MAP_SHARED, cam, offset);
memcpy(gpu_staging, p, len);   /* GPU에 넘기려고 CPU copy */
```

MMAP buffer를 CPU 주소로만 쓰면 GPU·NPU로 넘길 때 copy가 생깁니다. `VIDIOC_EXPBUF`로 fd를 export해 import하거나, 다른 allocator의 fd를 `V4L2_MEMORY_DMABUF`로 넘깁니다.

> DMA-BUF fd close 누락

```c
ioctl(VIDIOC_EXPBUF);   /* fd 4개 */
/* close(fd) 빠뜨림 → buffer leak */
```

Stream stop 시 명시적으로 close합니다. RAII wrapper로 묶는 것이 안전합니다.

> Camera·GPU page size 불일치

Exporter가 만든 buffer가 importer의 제약(물리 연속성, IOMMU 유무, pitch·offset alignment)을 만족하지 못하면 import가 실패합니다. 예를 들어 IOMMU가 없는 display controller는 물리적으로 연속된 buffer만 scan out할 수 있습니다. 이럴 때는 모든 consumer의 제약을 만족하는 쪽(CMA 기반 dma-heap 등)에서 buffer를 할당하고, 나머지 driver가 그 fd를 import하게 구성합니다.

> Format mismatch on import

NV12로 import한 EGLImage를 `GL_TEXTURE_2D`·`sampler2D` RGB texture로 sample하면 화면이 검게 나오거나 색이 뒤틀립니다. NV12 import는 `GL_TEXTURE_EXTERNAL_OES` + `samplerExternalOES`로 씁니다.

> USB camera로 zero-copy 시도

Linux `uvcvideo` driver는 USB 전송(URB)으로 받은 payload를 V4L2 buffer로 복사합니다. 그래서 USB camera에서는 이 단계의 copy를 application에서 없앨 수 없고, 그 뒤 단계부터 DMA-BUF로 공유할 수 있습니다. 처음부터 zero-copy가 필요하면 CSI camera + ISP path를 씁니다.

> Format conversion을 CPU에서

```c
yuv420_to_rgb_scalar(src, dst);   /* frame마다 CPU에서 pixel 단위 변환 */
```

VIC·GPU shader로 옮기면 CPU 부하가 그만큼 빠집니다.

## 정리

- Zero-copy camera는 한 frame이 한 physical page를 유지하며 ISP·GPU·NPU·display를 통과하는 패턴입니다.
- V4L2 `VIDIOC_EXPBUF`로 카메라 buffer를 fd로 export하거나, `V4L2_MEMORY_DMABUF`로 외부 fd를 import합니다.
- EGL `EGL_LINUX_DMA_BUF_EXT`로 GPU에 import하고, Jetson CUDA는 EGLImage를 `cuGraphicsEGLRegisterImage`로 등록합니다.
- Jetson NVMM caps `(memory:NVMM)` 구간은 CPU 복사 없이 buffer를 넘깁니다.
- libcamera는 modern Linux camera stack이고 DMA-BUF가 first-class입니다.
- DRM PRIME으로 카메라 buffer를 directly framebuffer로 쓰면 display까지 zero-copy됩니다.
- USB camera는 `uvcvideo`가 payload를 한 번 copy합니다. Zero-copy가 필요하면 CSI camera + ISP path를 씁니다.
- Edge SoC에서 frame copy는 memory bandwidth를 직접 소비하므로, copy 횟수를 줄이는 것이 throughput 확보의 출발점입니다.

다음 편은 **온디바이스 LLM**입니다.

## 관련 항목

- [12-08: Jetson](/blog/embedded/modern-recipes/part12-08-jetson)
- [12-10: 온디바이스 LLM](/blog/embedded/modern-recipes/part12-10-on-device-llm)
- [1-04: Device Tree](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
