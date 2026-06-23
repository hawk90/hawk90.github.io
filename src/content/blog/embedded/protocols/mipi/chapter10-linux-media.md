---
title: "Ch 10: Linux Media — V4L2 카메라, DRM/KMS 디스플레이"
date: 2026-05-16T10:00:00
description: "V4L2 (capture) + DRM/KMS (display) — MIPI 디바이스의 Linux 통합 모델."
series: "MIPI 심화"
seriesOrder: 10
tags: [linux, v4l2, drm, kms, media, libcamera]
draft: true
---

## 한 줄 요약

> **"카메라 = V4L2, 디스플레이 = DRM/KMS"** — Linux의 두 미디어 서브시스템.

## V4L2 — Video4Linux 2

`/dev/videoN`, `/dev/v4l-subdevN`. 카메라·튜너·캡처 카드의 표준 인터페이스.

### Entity Graph — Media Controller

![V4L2 media graph (sensor → CSI → ISP → DMA)](/images/blog/mipi/diagrams/ch10-v4l2-media-graph.svg)

여러 IP 블록 (센서·CSI receiver·ISP·DMA)을 *그래프*로 표현. `media-ctl` CLI로 확인·설정.

```bash
$ media-ctl -d /dev/media0 -p
Device topology
- entity 1: imx219 0-0010 (1 pad, 1 link)
            type V4L2 subdev subtype Sensor flags 0
            device node name /dev/v4l-subdev0
    pad0: Source
        [fmt:SBGGR10_1X10/1920x1080@1/30]
        -> "rkisp1_isp":0 [ENABLED]

- entity 5: rkisp1_isp (4 pads, 2 links)
    pad0: Sink → from imx219
    pad1: Sink (parameters)
    pad2: Source → /dev/video0 (main path)
    pad3: Source → /dev/video1 (self path)
```

→ *각 IP가 entity*, *연결이 link*. format negotiation은 *각 link*마다.

### Pipeline Format 설정

```bash
# 센서 format 설정
media-ctl -d /dev/media0 \
    -V "'imx219 0-0010':0 [fmt:SBGGR10_1X10/1920x1080]"

# CSI receiver
media-ctl -V "'rkisp1_isp':0 [fmt:SBGGR10_1X10/1920x1080]"

# ISP 출력
media-ctl -V "'rkisp1_isp':2 [fmt:YUYV8_2X8/1920x1080]"

# DMA 캡처
v4l2-ctl -d /dev/video0 \
    --set-fmt-video=width=1920,height=1080,pixelformat=YUYV
```

### 캡처 — V4L2 API

```c
int fd = open("/dev/video0", O_RDWR);

struct v4l2_format fmt = {0};
fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
fmt.fmt.pix.width = 1920;
fmt.fmt.pix.height = 1080;
fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_YUYV;
ioctl(fd, VIDIOC_S_FMT, &fmt);

// Buffer 요청 + mmap
struct v4l2_requestbuffers req = {
    .count = 4,
    .type = V4L2_BUF_TYPE_VIDEO_CAPTURE,
    .memory = V4L2_MEMORY_MMAP,
};
ioctl(fd, VIDIOC_REQBUFS, &req);

// 각 버퍼 mmap
void *buffers[4];
for (int i = 0; i < 4; i++) {
    struct v4l2_buffer buf = {
        .type = V4L2_BUF_TYPE_VIDEO_CAPTURE,
        .memory = V4L2_MEMORY_MMAP,
        .index = i,
    };
    ioctl(fd, VIDIOC_QUERYBUF, &buf);
    buffers[i] = mmap(NULL, buf.length, PROT_READ, MAP_SHARED,
                       fd, buf.m.offset);
    ioctl(fd, VIDIOC_QBUF, &buf);
}

// Stream 시작
enum v4l2_buf_type type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
ioctl(fd, VIDIOC_STREAMON, &type);

// 캡처 loop
while (1) {
    struct v4l2_buffer buf = {...};
    ioctl(fd, VIDIOC_DQBUF, &buf);  // 1 프레임 받음
    process_frame(buffers[buf.index], buf.bytesused);
    ioctl(fd, VIDIOC_QBUF, &buf);    // 버퍼 다시 enqueue
}
```

### Subdev Control — 직접 센서 명령

```bash
# 노출시간 (microseconds)
v4l2-ctl -d /dev/v4l-subdev0 --set-ctrl=exposure=10000

# Analog gain
v4l2-ctl -d /dev/v4l-subdev0 --set-ctrl=analogue_gain=200
```

`v4l2-ctl --list-ctrls` 로 가능한 컨트롤 확인.

## libcamera — 모던 카메라 stack

V4L2를 직접 다루기는 *복잡* (특히 ISP). **libcamera** (RaspberryPi Foundation 주도, 2020+)가 *고수준 추상화*:

- 자동 노출 (AE), 자동 화이트밸런스 (AWB), 자동 초점 (AF)
- 멀티 카메라 동기
- HDR, NR (Noise Reduction), CCM (Color Correction Matrix)
- 표준 control API

```cpp
#include <libcamera/libcamera.h>
using namespace libcamera;

CameraManager cm;
cm.start();
auto camera = cm.cameras()[0];
camera->acquire();

std::unique_ptr<CameraConfiguration> config =
    camera->generateConfiguration({StreamRole::StillCapture});
config->at(0).size = Size(1920, 1080);
config->at(0).pixelFormat = formats::BGR888;
camera->configure(config.get());

// Buffers + requests
FrameBufferAllocator alloc(camera);
alloc.allocate(config->at(0).stream());

camera->start();
// requestCompleted signal로 프레임 받음
```

대부분 *모던 임베디드 카메라 시스템*은 libcamera 사용.

## DRM/KMS — Display

`/dev/dri/cardN`, `/dev/dri/renderD128`. **DRM (Direct Rendering Manager)** + **KMS (Kernel Mode Setting)**.

### KMS 객체 모델

```text
Framebuffer (메모리 buffer with pixels)
   ↓
Plane (frambuffer를 어디에 어떻게 표시할지)
   ↓
CRTC (Cathode Ray Tube Controller — timing 생성)
   ↓
Encoder (CRTC 출력을 어떻게 인코딩)
   ↓
Bridge (옵션 — DSI 인코더 또는 HDMI bridge)
   ↓
Connector (물리 출력 — eDP, DSI, HDMI port)
   ↓
Panel
```

### DSI 패널 = Bridge / Panel

DSI 패널은 *드라이버 패널 (drm/panel/)* + *DSI bridge (drm/bridge/)*. *패널 드라이버*에 패널 데이터시트의 *명령 시퀀스* 코드화.

```c
// drm/panel/panel-samsung-s6e63m0.c 예
static int s6e63m0_init(struct s6e63m0 *ctx) {
    s6e63m0_dcs_write_seq(ctx, MCS_LEVEL2_KEY, 0x5A, 0x5A);
    s6e63m0_dcs_write_seq(ctx, MCS_GAMMA_SET, ...);
    s6e63m0_dcs_write_seq(ctx, MIPI_DCS_EXIT_SLEEP_MODE);
    msleep(120);
    s6e63m0_dcs_write_seq(ctx, MIPI_DCS_SET_DISPLAY_ON);
    return 0;
}
```

### DT 패널 + DSI host 연결

```dts
&dsi {
    panel@0 {
        compatible = "samsung,s6e63m0";
        reg = <0>;
        reset-gpios = <&gpiog 6 GPIO_ACTIVE_LOW>;
        vdd3-supply = <&v3v3>;

        port {
            panel_in: endpoint {
                remote-endpoint = <&dsi_out>;
            };
        };
    };
};
```

부팅 후 `cat /sys/class/drm/card0-DSI-1/status` 로 `connected` 확인.

## 디버깅 — 둘 다

```bash
# V4L2
dmesg | grep -i "v4l2\|csi\|imx"
v4l2-compliance -d /dev/video0   # 표준 적합성 시험

# DRM
dmesg | grep -i "drm\|dsi\|panel"
xrandr                            # X11
weston-info                       # Wayland
```

`drm_debug` kernel param으로 *상세 로그* 활성. format negotiation·timing·power on/off 모두 출력.

## 자주 하는 실수

> ⚠️ Media pipeline 미설정

V4L2 디바이스 open 후 *바로 capture 시도* → *No supported format*. *media-ctl로 pipeline 셋업* 먼저.

> ⚠️ Buffer count 너무 적음

2 버퍼 = *프레임 드롭 빈발*. 권장 *4-8 버퍼*. *Ring buffer* 모델.

> ⚠️ DRM mode 강제

DSI 패널의 *고정 timing*에 맞지 않는 mode 강제 → *화면 안 나옴*. 패널 데이터시트 timing 따르기.

> ⚠️ Wayland vs X11 무지

`xrandr`은 X11 only. Wayland (Sway, GNOME 등)은 *Compositor API*.

## 정리

- **V4L2** = 카메라·캡처 (`/dev/videoN`).
- **Media Controller** + `media-ctl`로 *entity graph* 설정.
- **libcamera**가 모던 고수준 stack.
- **DRM/KMS** = 디스플레이 (`/dev/dri/cardN`).
- DSI 패널 = *panel driver* (panel-samsung-*, panel-otm8009a 등) + DSI bridge.

다음 편은 **카메라 드라이버 작성** — IMX 센서 예제.

## 관련 항목

- [Ch 9: A-PHY](/blog/embedded/protocols/mipi/chapter09-a-phy)
- [Ch 11: 카메라 드라이버](/blog/embedded/protocols/mipi/chapter11-camera-driver)
- [Linux Drivers (LDD3)](/blog/systems/linux-drivers/ldd3-modern/chapter01-introduction)
