---
title: "Ch 12: MIPI 디버깅 — 신호 분석, Linux 도구, 시나리오"
date: 2027-05-01T12:00:00
description: "Protocol analyzer + DSO + Linux 도구. 보드 살리기부터 frame drop까지."
series: "MIPI 심화"
seriesOrder: 12
tags: [mipi, debugging, analyzer, dso, v4l2-ctl, media-ctl]
draft: true
---

## 한 줄 요약

> **"신호 → format → driver → 메모리"** — 4 단계 어디서 깨졌나 순서대로.

## 도구 분류

### 1. Protocol Analyzer ($$$)

| 도구 | 가격 | 특징 |
| --- | --- | --- |
| **Keysight U4421A** | $40k+ | 산업 표준, CSI/DSI 디코드 |
| **Lecroy Maui** | $50k+ | 오실로 + protocol decoder |
| **Crescent Heart MIPI** | $10k+ | 가성비 PE |
| **Promira CSI-2** | $5k | Total Phase, 비교적 저렴 |
| **Tektronix DPO 시리즈** | $$$ | 오실로 + 옵션 디코드 |

→ *MIPI 라이센스* + 고속 (수 Gbps) 측정 = 비쌈.

### 2. DSO + Decoder ($)

8 GHz BW 이상 DSO (Lecroy WaveSurfer, Tektronix DPO) + MIPI 옵션. ~$5-20k.

### 3. Linux SW 도구 (무료)

- `media-ctl`, `v4l2-ctl`, `v4l2-compliance`
- `yavta` — V4L2 yet-another test app
- `GStreamer` — `gst-launch-1.0` pipeline
- `dmesg` 커널 로그

## 시나리오 1 — Pipeline Bring-Up (가장 흔함)

새 카메라 + 새 SoC. 보드 살리기.

### 단계별 확인

```bash
# 1. I²C로 센서 ID 확인 — 가장 기본
i2cdetect -y 0
# 센서 주소 (예 0x10) 보여야

i2cget -y 0 0x10 0x00 w        # chip ID register
# IMX219는 0x0219

# 2. dmesg
dmesg | grep -i "imx\|csi\|sensor"
# probe 메시지 + 매칭 확인

# 3. Media graph
media-ctl -d /dev/media0 -p
# entity 모두 보이는지

# 4. Pipeline 설정
media-ctl -V "'imx219 0-0010':0 [fmt:SBGGR10_1X10/1920x1080]"
media-ctl -V "'rkisp1_isp':0 [fmt:SBGGR10_1X10/1920x1080]"
media-ctl -V "'rkisp1_isp':2 [fmt:YUYV8_2X8/1920x1080]"

# 5. V4L2 capture format
v4l2-ctl -d /dev/video0 \
    --set-fmt-video=width=1920,height=1080,pixelformat=YUYV

# 6. 시험 캡처
v4l2-ctl --stream-mmap=4 --stream-count=10 --stream-to=test.raw
# 또는
yavta -c10 -f YUYV -s 1920x1080 -F /dev/video0
```

### 각 단계 실패 시 → 위로 거슬러 올라가기

- I²C 안 됨 → 회로·전원·DT
- Probe 실패 → DT compatible·드라이버 매칭
- Media graph 비정상 → 드라이버 async binding
- Pipeline format 거부 → 센서/CSI receiver 형식 협상
- Capture 깨짐 → CSI receiver settle time·lane skew

## 시나리오 2 — 첫 프레임 후 멈춤

증상 — 1-2 프레임은 받지만 그 후 *DMA timeout*.

원인 후보:
- DMA 버퍼 부족 (count 4+ 권장)
- *Continuous clock* 미설정 → 두 프레임 사이 LP 진입 → SoC 못 따라감
- 센서 frame interval 잘못

```bash
# Continuous clock 강제
media-ctl -V "'csi_phy':0 [fmt:SBGGR10_1X10/1920x1080@1/30 field:none]"
# 또는 DT에서 `clock-noncontinuous` 제거
```

## 시나리오 3 — 픽셀 *반은 정상*, 반은 *깨짐*

증상 — 상단 몇 백 라인 OK, 그 후 색깔 깨짐 또는 검정.

원인 — **Lane skew**. lane들 사이 *bit-level 정렬 깨짐*.

해결 — PCB 트레이스 *matched length* 재검토. ±2 mm 이내. 또는 SoC의 *lane swap·polarity* 설정 확인.

## 시나리오 4 — Frame Drop

증상 — *간헐* 프레임 missing. statistics — `v4l2-ctl --info` 의 *frame loss counter*.

원인:
- ISP·메모리 *대역폭 부족*
- DDR contention (다른 마스터)
- 인터럽트 latency (PREEMPT_RT?)

해결 — buffer count ↑, ISP 해상도 ↓ 또는 DDR QoS 설정.

## 시나리오 5 — 색깔이 *완전 뒤집힘*

증상 — 빨간 사물이 *파랗게 나옴*.

원인 — Bayer 순서 잘못. SBGGR / SRGGB / SGRBG / SGBRG 4 종 중 *센서 ↔ ISP* 불일치.

```bash
media-ctl -V "'imx219 0-0010':0 [fmt:SRGGB10_1X10/1920x1080]"
# vs
media-ctl -V "'imx219 0-0010':0 [fmt:SBGGR10_1X10/1920x1080]"
```

센서 데이터시트의 *CFA pattern* 그림 확인.

## 시나리오 6 — DSI 패널 화면 안 나옴

```bash
# DRM 상태 확인
cat /sys/class/drm/card0-DSI-1/status
# "connected" 또는 "disconnected"

# Mode list
cat /sys/class/drm/card0-DSI-1/modes
# 패널이 제공하는 해상도 목록

# DRM 디버그 활성
echo 0xFF > /sys/module/drm/parameters/debug
dmesg | grep -i "drm\|dsi"
```

흔한 원인:
- DT `panel` 노드 누락
- panel 드라이버 *probe 실패* (compatible 미스매치)
- DSI host 페리퍼럴 *초기화 실패* (PLL lock 실패 등)
- 패널 *power 시퀀스* 잘못 (3.3V → 1.8V vs 반대)

## 시나리오 7 — 영상은 OK 인데 *너무 어두움/밝음*

이미지 처리 (ISP) 영역. *센서 그자체*는 OK, **AE/AWB**가 문제.

- libcamera *3A* 알고리즘 튜닝
- ISP의 *gain·exposure 자동* 설정
- *raw 캡처 (V4L2_PIX_FMT_SBGGR10P)*로 *bypass* 시험 — raw도 어두우면 *센서 노출 시간* 문제

## Protocol Analyzer 사용

### CSI-2 캡처 표시

```text
Packet 1: Short, DT=0x00 (Frame Start), VC=0, ECC OK
Packet 2: Short, DT=0x02 (Line Start), Line=0, ECC OK
Packet 3: Long, DT=0x2B (RAW10), WC=2400, CRC OK
  Data: 0x12 0x34 0x56 ... (5 픽셀 packed)
Packet 4: Short, DT=0x03 (Line End)
...
Packet N: Short, DT=0x01 (Frame End)
```

→ *Pixel-level 비교*까지 가능. 비싸지만 *센서 ↔ SoC 정합성* 시험에 필수.

### DSO Eye Diagram

D-PHY HS 신호의 *eye opening* — 비트 마진 측정. JEDEC 표준 mask 위에 *겹쳐서* pass/fail.

8 GHz BW 이상 DSO + *active probe* (1 GHz Z-input) 필요.

## libcamera 디버깅

```bash
# 디버그 환경변수
export LIBCAMERA_LOG_LEVELS="*:DEBUG"
cam --list-cameras                       # libcamera 도구
cam -c 1 --capture=10 --file=/tmp/img.bin
```

3A 알고리즘 (AE/AWB/AF) 로그가 *왜 노출 안 조정*되는지 보여줌.

## GStreamer Pipeline

```bash
# CSI 입력 → 디스플레이 출력
gst-launch-1.0 v4l2src device=/dev/video0 ! \
    video/x-raw,format=YUY2,width=1920,height=1080,framerate=30/1 ! \
    videoconvert ! \
    autovideosink

# 또는 인코딩 → 파일
gst-launch-1.0 v4l2src device=/dev/video0 ! \
    video/x-raw,format=YUY2,width=1920,height=1080 ! \
    videoconvert ! \
    v4l2h264enc ! \
    h264parse ! \
    mp4mux ! \
    filesink location=/tmp/out.mp4
```

GStreamer가 *pipeline negotiation* 자동 — 빠른 시험에 좋음.

## 자주 하는 실수

> ⚠️ Pipeline 미설정 후 capture 시도

`media-ctl` 명령 안 보내고 *바로 V4L2 capture* → *No supported format*. 모든 entity의 link format 명시.

> ⚠️ Buffer queue 부족

2 버퍼만 큐잉하면 *프레임 드롭 빈발*. 권장 *6-8 버퍼*.

> ⚠️ Polling 인터럽트로 처리

V4L2 capture를 *busy-loop polling* — CPU 100%. `poll()` 또는 `select()` 또는 *V4L2 event*.

> ⚠️ 신호 무결성 무시

소프트웨어로 *모든 것 해결 가능하다 가정* — 결국 *PCB 재설계*. eye diagram 측정으로 *마진 확인*.

## 정리 — 시리즈 마무리

- 카메라 디버깅 = **I²C → probe → media graph → pipeline → V4L2 capture** 순서.
- 신호 무결성은 **eye diagram** + **lane skew matched length**.
- Linux 도구 — `media-ctl`, `v4l2-ctl`, `yavta`, `libcamera`, `GStreamer`.
- DSI 패널 — DRM/KMS + panel driver + DT `port/endpoint`.
- *DMA frame drop*은 *buffer count + DDR QoS*.

12편 시리즈 완료. MIPI Alliance 소개 → PHY (D/C) → CSI-2 (v1-v4) → DSI (1.x·2) → A-PHY → Linux integration → 카메라 드라이버 → 디버깅.

## 관련 항목

- [Embedded Serial (SPI/I²C/UART)](/blog/embedded/protocols/embedded-serial/chapter01-overview)
- [CAN Bus 심화](/blog/embedded/protocols/can-bus/chapter01-overview)
- [Industrial Ethernet](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)
