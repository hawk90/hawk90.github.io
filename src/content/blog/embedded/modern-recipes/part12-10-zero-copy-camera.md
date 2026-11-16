---
title: "Zero-Copy Camera Pipeline — V4L2·DMA-BUF·GPU Import·NPU 직결"
slug: "embedded/modern-recipes/part12-10-zero-copy-camera"
date: 2026-04-21T09:08:00
description: "카메라부터 NPU·display까지 한 frame이 한 physical page를 유지하도록 V4L2·DMA-BUF·EGL·CUDA를 연결하는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 146
tags: [recipes, camera, v4l2, dma-buf, zero-copy, isp, libcamera]
topics: ["embedded"]
---

## 한 줄 요약

> **"Zero-copy camera는 한 frame의 buffer를 카메라·GPU·NPU·display가 DMA-BUF fd로 나눠 쓰는 패턴입니다."** V4L2는 `VIDIOC_EXPBUF`로 buffer를 fd로 내보내고(exporter), `V4L2_MEMORY_DMABUF`로 남의 fd를 받아들입니다(importer). 아래 실행에서 export한 fd는 capture buffer와 같은 page를 가리켰고, 다른 장치가 그 fd를 그대로 받았습니다.

## 이 글의 실행 환경

- Debian 13 arm64 guest, kernel 6.12.116, gcc 14.2.0, `v4l-utils` 1.30.1
- 카메라는 커널의 가상 V4L2 driver `vivid`(`modprobe vivid n_devs=1 multiplanar=2`)로 대신했습니다. `/dev/video0`이 multiplanar capture, `/dev/video1`이 multiplanar output입니다.
- 이 guest에는 DRM 장치와 GPU가 없어 EGL·DRM·libcamera 코드는 컴파일까지만 확인했습니다(`libegl-dev`, `libgles-dev`, libdrm 2.4.124, libcamera 0.4.0). CUDA 부분은 NVIDIA 문서와 대조만 했습니다.

## 어떤 상황에서 쓰나

카메라 → 전처리 → 추론 → 화면이 frame rate에 묶인 장치입니다. frame을 CPU로 한 번 복사할 때마다 그만큼 DRAM을 읽고 씁니다. 1920×1080 NV12 한 frame은 아래 실행에서 `sizeimage` 3,110,400 byte였으므로, 60 fps에서 복사 한 번은 초당 약 187 MB를 읽고 같은 양을 씁니다. CPU·GPU·NPU·display가 DRAM을 나눠 쓰는 SoC에서는 이 대역폭이 다른 블록의 몫에서 빠집니다.

## 핵심 개념

카메라부터 display까지 한 frame이 같은 page를 유지하는 모습입니다.

![Zero-copy camera pipeline — DMA-BUF fd로 묶인 한 page](/images/blog/modern-recipes/diagrams/part6-06-zero-copy-camera.svg)

커널 문서(`Documentation/userspace-api/media/v4l/dmabuf.rst`)는 DMABUF를 "a generic method for sharing buffers between multiple devices"라고 설명하고, 역할을 둘로 나눕니다.

1. **Exporter** — buffer를 가진 driver가 그것을 fd로 내보냅니다. V4L2에서는 `VIDIOC_EXPBUF`입니다.
2. **Importer** — 다른(또는 같은) 장치가 그 fd를 받아 자기 buffer로 씁니다. V4L2에서는 `V4L2_MEMORY_DMABUF`, EGL에서는 `EGL_LINUX_DMA_BUF_EXT`, DRM에서는 `DRM_IOCTL_PRIME_FD_TO_HANDLE`입니다.

V4L2 buffer 방식은 셋입니다.

| Mode | 동작 |
|------|------|
| `V4L2_MEMORY_MMAP` | driver가 할당한 buffer를 user가 mmap. `VIDIOC_EXPBUF`로 fd export 가능 |
| `V4L2_MEMORY_USERPTR` | user 메모리를 driver에 등록 |
| `V4L2_MEMORY_DMABUF` | 다른 exporter가 만든 DMA-BUF fd를 buffer로 사용 |

`vidioc-expbuf.rst`는 `VIDIOC_EXPBUF`가 "available only for `V4L2_MEMORY_MMAP` buffers"라고 적습니다. 그래서 카메라 driver가 buffer를 할당하게 하려면 `MMAP`으로 요청한 뒤 export하고, 다른 allocator(GPU, display, dma-heap, udmabuf 등)의 buffer를 쓰려면 `DMABUF`로 import합니다.

### NV12와 NV12M

`pixfmt-yuv-planar.rst`에 따르면 이름에 `M`이 붙은 format(`V4L2_PIX_FMT_NV12M`)만 plane을 따로 떨어진 메모리에 둘 수 있고, 그렇지 않은 format은 plane이 메모리에서 바로 이어져야 합니다. vivid에서 두 format을 설정한 결과입니다.

```text
Pixel Format      : 'NV12' (Y/UV 4:2:0)
Number of planes  : 1
   Size Image     : 3110400
Pixel Format      : 'NM12' (Y/UV 4:2:0 (N-C))
Number of planes  : 2
   Size Image     : 2073600
   Size Image     : 1036800
```

`V4L2_PIX_FMT_NV12`은 multiplanar API에서도 buffer 하나(plane 1개)이고, Y와 UV가 2,073,600 byte 간격으로 붙어 있습니다. 이전 판처럼 `V4L2_PIX_FMT_NV12`에 `num_planes = 2`를 적어도 driver가 1로 고쳐 돌려줍니다. plane마다 따로 export하려면 `NV12M`을 씁니다.

## 코드 / 실제 사용 예

### V4L2 export → 같은 page 확인 → 다른 장치로 import

아래는 실행한 `zc.c`의 핵심입니다(오류 처리는 `xioctl` wrapper에서 출력만 합니다).

```c
/* 1. capture buffers allocated by the driver (MMAP), exported as dma-buf fds */
struct v4l2_requestbuffers req = { .count = 4, .type = CAP, .memory = V4L2_MEMORY_MMAP };
ioctl(cam, VIDIOC_REQBUFS, &req);
for (int i = 0; i < 4; i++) {
    struct v4l2_plane pl[1] = {0};
    struct v4l2_buffer b = { .type = CAP, .memory = V4L2_MEMORY_MMAP, .index = i, .length = 1, .m.planes = pl };
    ioctl(cam, VIDIOC_QUERYBUF, &b);
    cmap[i] = mmap(NULL, pl[0].length, PROT_READ | PROT_WRITE, MAP_SHARED, cam, pl[0].m.mem_offset);
    struct v4l2_exportbuffer e = { .type = CAP, .index = i, .plane = 0, .flags = O_CLOEXEC | O_RDWR };
    ioctl(cam, VIDIOC_EXPBUF, &e);
    fds[i] = e.fd;
    ioctl(cam, VIDIOC_QBUF, &b);
}

/* 2. the exported fd maps the same pages as the capture buffer */
uint8_t *dmap = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_SHARED, fds[idx], 0);

/* 3. another device imports the capture fds */
struct v4l2_requestbuffers ro = { .count = 4, .type = OUT, .memory = V4L2_MEMORY_DMABUF };
ioctl(out, VIDIOC_REQBUFS, &ro);
struct v4l2_plane p[1] = { { .m.fd = fds[i], .length = size, .bytesused = size } };
struct v4l2_buffer ob = { .type = OUT, .memory = V4L2_MEMORY_DMABUF, .index = i, .length = 1, .m.planes = p };
ioctl(out, VIDIOC_QBUF, &ob);
```

```bash
modprobe vivid n_devs=1 multiplanar=2
gcc -std=c11 -Wall -O2 zc.c -o zc
./zc /dev/video0 /dev/video1
```

```text
capture fmt 1920x1080 NV12 planes 1 sizeimage 3110400 bytesperline 1920
buffer 0: length 3110400 exported dma-buf fd 5
buffer 1: length 3110400 exported dma-buf fd 6
buffer 2: length 3110400 exported dma-buf fd 7
buffer 3: length 3110400 exported dma-buf fd 8
captured 60 frames in 11.81 s; last index 3 bytesused 3110400
dma-buf mmap equals capture mmap: yes
byte written through dma-buf fd visible in capture mapping: yes
output node queued 4 capture dma-bufs; dequeued index 0 fd 5 (same fd as capture export)
```

dma-buf fd를 mmap한 내용은 capture buffer의 mmap과 같았고, fd 쪽으로 쓴 byte가 capture 쪽 mapping에서 그대로 보였습니다. 두 mapping이 같은 page를 가리킨다는 뜻입니다. 그 fd 4개를 output 장치가 `V4L2_MEMORY_DMABUF`로 받아 queue와 dequeue까지 마쳤습니다. 60 frame에 11.81 s가 걸린 것은 vivid가 VM의 CPU에서 test pattern을 그리기 때문이고, 실제 카메라 성능과는 관계없습니다.

### 다른 allocator의 buffer를 카메라가 받기 (udmabuf)

반대 방향도 해 봤습니다. `memfd`로 만든 메모리를 `/dev/udmabuf`로 DMA-BUF fd로 만들고, capture 장치가 `V4L2_MEMORY_DMABUF`로 받아 frame을 채우게 했습니다.

```c
int memfd = memfd_create("frame", MFD_ALLOW_SEALING);
ftruncate(memfd, usz);                       /* sizeimage rounded up to the page size */
fcntl(memfd, F_ADD_SEALS, F_SEAL_SHRINK);    /* udmabuf requires the shrink seal */
int ud = open("/dev/udmabuf", O_RDWR);
struct udmabuf_create uc = { .memfd = memfd, .flags = UDMABUF_FLAGS_CLOEXEC, .offset = 0, .size = usz };
int ufd = ioctl(ud, UDMABUF_CREATE, &uc);

struct v4l2_requestbuffers rd = { .count = 1, .type = CAP, .memory = V4L2_MEMORY_DMABUF };
ioctl(cam, VIDIOC_REQBUFS, &rd);
struct v4l2_plane up[1] = { { .m.fd = ufd, .length = usz } };
struct v4l2_buffer ub = { .type = CAP, .memory = V4L2_MEMORY_DMABUF, .index = 0, .length = 1, .m.planes = up };
ioctl(cam, VIDIOC_QBUF, &ub);
```

```text
udmabuf fd 11 (size 3112960)
capture into udmabuf: dqbuf ok, bytesused 3110400, non-zero bytes seen through memfd 3110400 of 3110400
```

카메라가 쓴 frame이 application의 `memfd` mapping에서 바로 보였습니다. 실제 장치에서는 udmabuf 자리에 GPU·display·dma-heap이 만든 fd가 들어갑니다.

### EGL import — OpenGL ES external texture

`EGL_EXT_image_dma_buf_import` 확장의 attribute로 NV12 fd 하나를 Y·UV 두 plane으로 지정합니다. 위의 single-plane NV12이므로 두 plane 모두 같은 fd이고, UV는 1920 × 1080 offset에 있습니다.

```c
GLuint import_nv12(EGLDisplay egl_display, int dma_fd) {
    /* extension entry points are not exported by libEGL/libGLESv2: look them up */
    PFNEGLCREATEIMAGEKHRPROC eglCreateImageKHR =
        (PFNEGLCREATEIMAGEKHRPROC)eglGetProcAddress("eglCreateImageKHR");
    PFNGLEGLIMAGETARGETTEXTURE2DOESPROC glEGLImageTargetTexture2DOES =
        (PFNGLEGLIMAGETARGETTEXTURE2DOESPROC)eglGetProcAddress("glEGLImageTargetTexture2DOES");
    if (!eglCreateImageKHR || !glEGLImageTargetTexture2DOES) return 0;

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
    EGLImageKHR image = eglCreateImageKHR(egl_display, EGL_NO_CONTEXT, EGL_LINUX_DMA_BUF_EXT, NULL, attrs);
    if (image == EGL_NO_IMAGE_KHR) return 0;
    GLuint tex;
    glGenTextures(1, &tex);
    glBindTexture(GL_TEXTURE_EXTERNAL_OES, tex);
    glEGLImageTargetTexture2DOES(GL_TEXTURE_EXTERNAL_OES, image);
    return tex;
}
```

이전 판처럼 `eglCreateImageKHR`·`glEGLImageTargetTexture2DOES`를 직접 부르면 Debian의 libglvnd `libEGL`·`libGLESv2`에 link할 때 `undefined reference`가 납니다. 확장 함수라 `eglGetProcAddress`로 찾아야 하고, 위 코드는 그렇게 고친 뒤 컴파일됐습니다. 확장 명세는 `EGL_LINUX_DMA_BUF_EXT`일 때 context는 `EGL_NO_CONTEXT`, buffer는 `NULL`이어야 한다고 적습니다.

### Shader에서 YUV 그대로 sample

```glsl
#version 300 es
#extension GL_OES_EGL_image_external_essl3 : require
precision highp float;

uniform samplerExternalOES tex;
in vec2 v_tex;
out vec4 color;

void main() {
    color = texture(tex, v_tex);
}
```

`OES_EGL_image_external` 명세는 "If the source image is stored in YUV (or some other basis) then the YUV values will be transformed to RGB values"라고 적고, 변환 parameter(color matrix 등)는 EGLImage에서 가져오며 변환 시점은 구현이 정한다고 합니다. 그래서 YUV→RGB 변환을 shader에 직접 쓸 필요가 없습니다. NV12 EGLImage를 `GL_TEXTURE_2D`·`sampler2D`로 받으면 이 자동 변환을 쓸 수 없습니다.

### CUDA — Jetson의 EGLImage 등록

CUDA runtime의 `cudaExternalMemoryHandleType` 값은 `OpaqueFd`, `OpaqueWin32`, `OpaqueWin32Kmt`, `D3D12Heap`, `D3D12Resource`, `D3D11Resource`, `D3D11ResourceKmt`, `NvSciBuf`이고 DMA-BUF 항목은 없습니다. 대신 CUDA driver API의 EGL interop으로 위의 EGLImage를 등록합니다. 이 글에서는 GPU가 없어 실행하지 않았고, 함수와 구조체 field는 CUDA driver API 문서와 대조했습니다.

```c
CUgraphicsResource res;
cuGraphicsEGLRegisterImage(&res, image, CU_GRAPHICS_MAP_RESOURCE_FLAGS_READ_ONLY);

CUeglFrame frame;
cuGraphicsResourceGetMappedEglFrame(&frame, res, 0, 0);
/* frame.frameType == CU_EGL_FRAME_TYPE_PITCH: frame.frame.pPitch[0] is Y, [1] is UV,
   frame.pitch is the first plane's pitch, frame.planeCount the number of planes */
nv12_to_tensor<<<grid, block, 0, stream>>>(
    frame.frame.pPitch[0], frame.frame.pPitch[1], frame.pitch, input_dev);   /* your kernel */

cuGraphicsUnregisterResource(res);
```

문서는 `cuGraphicsEGLRegisterImage`로 등록한 resource는 따로 map하지 않고 `cuGraphicsResourceGetMappedEglFrame`을 바로 부를 수 있다고 적고, 다른 API와의 동기화(예: `glFinish`, `cuEventSynchronize`)는 application 책임이라고 적습니다. 모델 입력이 RGB planar라면 NV12→tensor 변환 kernel 한 번은 남지만 GPU 안에서 끝납니다.

### Display — DRM PRIME

```c
int show_dmabuf(int drm_fd, int dma_fd, uint32_t crtc_id, uint32_t conn_id, drmModeModeInfo *mode) {
    uint32_t handle;
    if (drmPrimeFDToHandle(drm_fd, dma_fd, &handle)) return -1;   /* DRM_IOCTL_PRIME_FD_TO_HANDLE */
    uint32_t handles[4] = { handle, handle };                      /* Y and UV in the same buffer */
    uint32_t pitches[4] = { 1920, 1920 };
    uint32_t offsets[4] = { 0, 1920 * 1080 };
    uint32_t fb_id;
    if (drmModeAddFB2(drm_fd, 1920, 1080, DRM_FORMAT_NV12, handles, pitches, offsets, &fb_id, 0)) return -1;
    return drmModeSetCrtc(drm_fd, crtc_id, fb_id, 0, 0, &conn_id, 1, mode);
}
```

libdrm 2.4.124로 컴파일만 했습니다. 이전 판은 NV12의 UV plane(`handles[1]`, `offsets[1]`)을 비워 두었는데, NV12는 두 plane을 모두 넘겨야 합니다. display controller가 NV12와 그 pitch를 지원해야 이 framebuffer를 scan out할 수 있습니다.

### libcamera

libcamera의 `FrameBuffer`는 plane마다 DMA-BUF fd를 `SharedFD`로 들고 있습니다. 아래 request loop는 libcamera 0.4.0으로 컴파일했고, VM에는 카메라가 없어 `cameras found: 0`으로 끝났습니다.

```cpp
static void requestComplete(Request *r) {
    for (auto &[stream, fb] : r->buffers()) {
        int fd = fb->planes()[0].fd.get();      // FrameBuffer::Plane::fd is a SharedFD
        process_dma_fd(fd);
    }
    r->reuse(Request::ReuseBuffers);
    camera->queueRequest(r);
}
/* ... */
FrameBufferAllocator alloc(camera);
alloc.allocate(stream);
for (auto &fb : alloc.buffers(stream)) {
    auto req = camera->createRequest();
    req->addBuffer(stream, fb.get());
    reqs.push_back(std::move(req));
}
camera->requestCompleted.connect(requestComplete);
camera->start();
for (auto &req : reqs) camera->queueRequest(req.get());
```

### GStreamer — Jetson NVMM

caps의 `(memory:NVMM)`은 NVIDIA buffer 경로입니다. DeepStream 문서대로 `nvinfer`는 `NvDsBatchMeta`가 붙은 batch buffer를 받으므로 앞에 `nvstreammux`가 필요합니다([12-09](/blog/embedded/modern-recipes/part12-09-jetson)). 이전 판의 pipeline은 `nvstreammux`가 빠져 있었습니다. 이 글에서는 Jetson이 없어 pipeline을 실행하지 않았습니다.

## 측정 / 성능 비교

이 글의 VM 실행은 동작 확인이고 성능 측정이 아닙니다. VM 안에서 3,110,400 byte frame의 `memcpy`를 재 보니 실행마다 frame당 0.10~1.04 ms로 10배 가까이 흔들려 숫자를 싣지 않았습니다. 실제 장치에서는 같은 카메라·해상도·모델에서 buffer 경로만 바꿔 다음을 잽니다.

| 항목 | 측정 방법 |
|---|---|
| fps | application timestamp |
| CPU 사용률 | `top`, Jetson은 `tegrastats` |
| 메모리 대역폭 | SoC의 memory controller counter |
| end-to-end latency | capture timestamp(V4L2 `buf.timestamp`) → display |

## 자주 보는 함정

> ⚠️ MMAP buffer를 CPU 주소로만 씀

`MMAP` buffer를 mmap한 포인터로 GPU staging buffer에 `memcpy`하면 frame마다 복사가 생깁니다. `VIDIOC_EXPBUF`로 fd를 내보내 importer에 넘깁니다.

> ⚠️ `V4L2_PIX_FMT_NV12`에 plane 2개를 기대

NV12는 plane 1개, NV12M이 plane 2개입니다. `VIDIOC_S_FMT` 뒤 돌려받은 `num_planes`와 `sizeimage`를 기준으로 씁니다.

> ⚠️ EGL·GLES 확장 함수를 직접 link

`eglCreateImageKHR`, `glEGLImageTargetTexture2DOES`는 `eglGetProcAddress`로 찾습니다. 직접 부르면 libglvnd 환경에서 link가 실패합니다.

> ⚠️ CUDA에 DMA-BUF fd를 바로 넘김

`cudaImportExternalMemory`의 handle type에는 DMA-BUF가 없습니다. Jetson에서는 EGLImage를 `cuGraphicsEGLRegisterImage`로 등록합니다.

> ⚠️ exported fd를 닫지 않음

`VIDIOC_EXPBUF`가 돌려준 fd는 application이 닫을 때까지 buffer를 붙잡습니다. stream을 멈출 때 importer가 끝난 뒤 `close()`합니다.

> ⚠️ USB 카메라에서 처음부터 zero-copy를 기대

Linux `uvcvideo` driver(`drivers/media/usb/uvc/uvc_video.c`)는 USB transfer(URB)로 받은 data를 `memcpy`로 video buffer에 복사합니다(`uvc_video_copy_data_work`). 이 복사는 application에서 없앨 수 없고, video buffer 다음 단계부터 DMA-BUF로 나눌 수 있습니다.

> ⚠️ importer의 buffer 제약

exporter가 만든 buffer가 importer의 제약(물리 연속성, pitch·offset 정렬)을 만족하지 못하면 import가 실패합니다. 모든 consumer의 제약을 만족하는 allocator에서 buffer를 만들고 나머지가 import하게 구성합니다.

## 정리

- DMA-BUF는 exporter가 buffer를 fd로 내보내고 importer가 그 fd를 받는 구조입니다. V4L2는 `VIDIOC_EXPBUF`(MMAP buffer 전용)와 `V4L2_MEMORY_DMABUF`가 각각 그 역할입니다.
- vivid 실행에서 export한 fd는 capture buffer와 같은 page였고, output 장치가 그 fd를 그대로 받았으며, udmabuf로 만든 fd에는 카메라가 직접 frame을 채웠습니다.
- NV12는 plane 1개, NV12M이 plane 2개입니다.
- EGL은 `EGL_LINUX_DMA_BUF_EXT`로 import하고, 확장 함수는 `eglGetProcAddress`로 찾습니다. external texture sampling은 YUV를 RGB로 바꿔 줍니다.
- CUDA는 DMA-BUF fd를 직접 받지 않으므로 Jetson에서는 EGLImage를 등록합니다.
- USB 카메라는 `uvcvideo`가 data를 한 번 복사합니다.

다음 편은 **온디바이스 LLM**입니다.

## 관련 항목

- [12-09: Jetson](/blog/embedded/modern-recipes/part12-09-jetson)
- [12-11: 온디바이스 LLM](/blog/embedded/modern-recipes/part12-11-on-device-llm)
- [1-04: Device Tree](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
