---
title: "Ch 5: CSI-2 Data Types — RAW·YUV·RGB, Bit Packing, DPCM"
date: 2027-05-01T05:00:00
description: "Data Type 6 bit로 표현하는 pixel format. RAW10이 카메라의 표준 → SoC ISP 입력."
series: "MIPI 심화"
seriesOrder: 5
tags: [mipi, csi-2, raw, yuv, rgb, data-type, bit-packing, dpcm]
draft: true
---

## 한 줄 요약

> **"RAW10 5 픽셀 = 8 byte"** — 카메라가 가장 흔히 보내는 형식. byte-packing의 단순한 트릭.

## Data Type — 6 bit, 64 값

| DT 범위 | 카테고리 |
| --- | --- |
| 0x00-0x0F | Synchronization Short Packet |
| 0x10-0x17 | Generic Short Packet (사용자) |
| 0x18-0x1F | YUV |
| 0x20-0x27 | RGB |
| 0x28-0x2F | RAW |
| 0x30-0x37 | User-Defined |
| 0x38-0x3F | Reserved / Future |

## RAW Bayer — 카메라의 출구

이미지 센서가 *Color Filter Array (Bayer)* 통해 출력하는 raw 데이터. SoC ISP가 *demosaicing*으로 RGB로 변환.

| DT | 형식 | bit/pixel | 사용처 |
| --- | --- | --- | --- |
| 0x28 | RAW6 | 6 | 옛 저해상도 |
| 0x29 | RAW7 | 7 | 거의 미사용 |
| 0x2A | RAW8 | 8 | 8MP 이하 |
| **0x2B** | **RAW10** | **10** | **가장 흔함** |
| 0x2C | RAW12 | 12 | HDR 카메라 |
| 0x2D | RAW14 | 14 | 고급 카메라 |
| 0x2E | RAW16 (v2.0+) | 16 | 16-bit linear |
| 0x2F | RAW20 (v3.0+) | 20 | 산업·과학 |
| 0x2C (v4.0) | RAW24 | 24 | 의료 영상 |

## Bit Packing — RAW10 예

10-bit 픽셀은 *byte 경계*가 안 맞음. **5 픽셀을 8 byte로 packing**:

```text
픽셀 P0[9:0], P1[9:0], P2[9:0], P3[9:0], P4[9:0]

Packed (5 pixels in 8 bytes):
Byte 0 = P0[9:2]
Byte 1 = P1[9:2]
Byte 2 = P2[9:2]
Byte 3 = P3[9:2]
Byte 4 = P4[9:2]
Byte 5 = P0[1:0] | (P1[1:0] << 2) | (P2[1:0] << 4) | (P3[1:0] << 6)
Byte 6 = P4[1:0]   ← (또는 비슷한 패턴, 표준 §10 참조)
```

→ 한 byte에 *상위 8 bit 유의미*, 마지막 byte에 *나머지 LSB 2 bit*. 디코더가 reassemble.

### RAW12 packing — 4 픽셀 → 6 byte

```text
Byte 0 = P0[11:4]
Byte 1 = P1[11:4]
Byte 2 = P0[3:0] | (P1[3:0] << 4)
Byte 3 = P2[11:4]
Byte 4 = P3[11:4]
Byte 5 = P2[3:0] | (P3[3:0] << 4)
```

ISP가 RAW10/12 packed → 16-bit aligned 해서 *DDR 메모리* 저장.

## YUV — ISP 출력 또는 압축 전

| DT | 형식 | bit/pixel 평균 | 사용처 |
| --- | --- | --- | --- |
| 0x18 | YUV420 8-bit | 12 | 비디오 인코더 입력 |
| 0x19 | YUV420 10-bit | 15 | HDR 비디오 |
| 0x1A | YUV420 8-bit Legacy | 12 | 호환 |
| 0x1C | YUV422 8-bit | 16 | 방송 |
| 0x1D | YUV422 10-bit | 20 | 고급 비디오 |
| 0x1E | YUV422 12-bit | 24 | 의료·과학 |

YUV 420은 *chroma subsampling* — U·V 채널이 *해상도 1/2*. 12 bit/pixel로 압축 효율.

### Packing — YUV422 8-bit

```text
2 픽셀당 4 byte:
Byte 0 = Y0
Byte 1 = U (P0·P1 공유)
Byte 2 = Y1
Byte 3 = V (P0·P1 공유)
```

YUYV / UYVY 변종 — packing 순서 차이.

## RGB

| DT | 형식 | bit/pixel | 사용처 |
| --- | --- | --- | --- |
| 0x20 | RGB444 | 12 | 옛 디스플레이 |
| 0x21 | RGB555 | 15 | — |
| 0x22 | RGB565 | 16 | 저급 디스플레이 |
| 0x23 | RGB666 | 18 | 옛 LCD |
| **0x24** | **RGB888** | **24** | **표준** |
| 0x27 (v4.2) | RGB101010 | 30 | HDR 디스플레이 |

RGB는 *디스플레이 (DSI)에 더 흔함*. 카메라는 RAW → ISP → YUV/RGB 변환.

## User-Defined (0x30-0x37)

벤더가 자유 정의. 흔한 사용:

- **임베디드 데이터** — 센서 설정 dump, AE/AF 메타데이터
- **PDAF (Phase Detection Auto-Focus)** 데이터 — 추가 픽셀
- **HDR 멀티노출 메타** — 노출별 라인

### Embedded Data 예 — Sony IMX

라인 1-N에 *센서 register 값* (gain, exposure time, frame count) embedded. ISP가 *프레임별 메타*로 받음.

## DPCM Compression — 대역폭 절감

Bandwidth 부족 시 *DPCM (Differential PCM)*으로 압축:

| DT | 형식 | 압축률 |
| --- | --- | --- |
| 0x30 | RAW8 | 1× |
| 0x32 | RAW10-8 DPCM | 1.25× |
| 0x34 | RAW10-6 DPCM | 1.67× |
| 0x35 | RAW12-8 DPCM | 1.5× |
| 0x36 | RAW14-10 DPCM | 1.4× |

원리 — *연속 픽셀의 차*만 인코딩. *완만한 그라데이션*은 압축 잘 됨, *경계*는 손실 가능. 일반 카메라보다 *공간 절약 우선*인 시스템 (드론, IoT 카메라).

## Linux V4L2 — Pixel Format 매핑

```c
// V4L2_PIX_FMT_SBGGR10P = RAW10 packed Bayer (B/G/G/R 시작)
// V4L2_PIX_FMT_Y10P = RAW10 monochrome packed
// V4L2_PIX_FMT_YUYV = YUV422 8-bit

struct v4l2_format fmt = {0};
fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
fmt.fmt.pix.width = 1920;
fmt.fmt.pix.height = 1080;
fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_SBGGR10P;
ioctl(fd, VIDIOC_S_FMT, &fmt);
```

`media-ctl`로 *센서·CSI·ISP 모듈* 사이의 *pixel format* 명시:

```bash
media-ctl -d /dev/media0 \
    -V "'imx219 0-0010':0 [fmt:SBGGR10_1X10/1920x1080]"
```

## 자주 하는 실수

> ⚠️ Packed vs unpacked 혼동

V4L2의 `V4L2_PIX_FMT_SBGGR10` (16-bit aligned) vs `V4L2_PIX_FMT_SBGGR10P` (packed). ISP 입력은 *packed*. 메모리 dump 분석은 *unpacked*가 편함.

> ⚠️ Bayer 순서

`SBGGR` (BG/GR), `SRGGB` (RG/GB), `SGRBG`, `SGBRG`. 센서별로 다름. *틀리면 색깔 뒤집힘*.

> ⚠️ DPCM 결정 후 손실 무시

DPCM은 *비가역 손실*. 의료·과학에서는 *RAW 그대로*가 안전.

> ⚠️ Embedded Data를 *이미지로 처리*

라인 1-N에 메타 있으면 *이미지 시작은 라인 N+1*. CSI receiver에 *embedded line count* 명시.

## 정리

- Data Type 6 bit = **64 종류** — RAW·YUV·RGB·User로 분류.
- **RAW10 (0x2B)이 카메라 표준** — 5 픽셀 → 8 byte packing.
- YUV는 *ISP 출력·인코더 입력*, RGB는 *디스플레이*.
- **DPCM**으로 1.25-1.67× 압축 가능.
- V4L2 / media-ctl로 Linux 측 format 명시.

다음 편은 **CSI-2 v4.2** — Smart ROI, USL, RAW24 등 최신 기능.

## 관련 항목

- [Ch 4: CSI-2 기초](/blog/embedded/protocols/mipi/chapter04-csi2-basics)
- [Ch 6: CSI-2 v4.2](/blog/embedded/protocols/mipi/chapter06-csi2-v4)
