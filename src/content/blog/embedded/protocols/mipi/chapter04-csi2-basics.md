---
title: "Ch 4: CSI-2 — 패킷 구조, Short/Long, Frame/Line Sync"
date: 2027-05-01T04:00:00
description: "이미지 센서 → SoC 데이터 흐름. Short Packet (sync) + Long Packet (pixel data)의 단순 모델."
series: "MIPI 심화"
seriesOrder: 4
tags: [mipi, csi-2, camera, packet, short-packet, long-packet]
draft: true
---

## 한 줄 요약

> **"Short Packet = 이벤트, Long Packet = 픽셀"** — CSI-2는 두 종류 packet의 단순 직렬화.

## CSI-2 — 4 layer 모델

```text
┌────────────────────────┐
│ Application Layer       │ (RAW Bayer, YUV, RGB 데이터)
├────────────────────────┤
│ Pixel-to-Byte Packing   │ (RAW10 → byte stream, etc.)
├────────────────────────┤
│ Low-Level Protocol      │ (Short/Long Packet, ECC, CRC)
├────────────────────────┤
│ Lane Distribution       │ (1 stream → N lane byte interleave)
├────────────────────────┤
│ PHY (D-PHY / C-PHY)     │ (이전 챕터)
└────────────────────────┘
```

이 시리즈는 *Low-Level Protocol*과 *Application* 중심. 데이터 형식은 5편(Data Types).

## 한눈에 보는 — 프레임 구조

![CSI-2 frame with sync packets and line data](/images/blog/mipi/diagrams/ch04-csi2-frame.svg)

한 프레임 = **Frame Start** + 각 라인 (Line Start + Long Packet + Line End) × N + **Frame End**.

## Packet 두 종류

### Short Packet (4 byte) — Sync 이벤트

```text
[DI (1)] [Data (2)] [ECC (1)]
   ↑        ↑          ↑
Data ID   Word Count   Error Correction Code
(VC+DT)   또는 Frame#  (Hamming-extended)
```

| Data Type (DT) | 의미 |
| --- | --- |
| 0x00 | Frame Start (Word Count = Frame Number) |
| 0x01 | Frame End |
| 0x02 | Line Start (Word Count = Line Number) |
| 0x03 | Line End |
| 0x08-0x0F | Generic Short Packet (사용자) |

### Long Packet — Pixel Data

```text
[DI (1)] [WC (2)] [ECC (1)] [Payload (WC bytes)] [Checksum (2)]
                                                   ↑
                                                CRC-16
```

- `WC` = Word Count = payload byte 수
- Payload = *한 라인의 픽셀 데이터*
- 끝에 CRC-16 (CCITT)

> 💡 **한 라인 = 한 Long Packet**. 1920×1080 RAW10 = 라인당 2400 byte. 1080개 Long Packet.

## Data ID (DI) — VC + DT

```text
DI (8 bit) = [VC (2)] [DT (6)]
              ↑        ↑
       Virtual    Data Type
       Channel
```

### Virtual Channel (VC) — 다중 스트림

같은 PHY lane 그룹에 *여러 스트림 동시 전송*. 예 — 메인 카메라 + 임베디드 메타데이터 + ISP 출력.

| VC | 용도 |
| --- | --- |
| 0 | 메인 이미지 (기본) |
| 1 | 사이드 이미지 / 메타 |
| 2 | 임베디드 데이터 (센서 설정 dump) |
| 3 | ISP 또는 다른 채널 |

CSI-2 v3.0부터 **확장 VC** — 16개까지.

### Data Type (DT)

| DT | 의미 |
| --- | --- |
| 0x00-0x0F | Synchronization Short Packet |
| 0x10-0x17 | Generic Short Packet |
| 0x18-0x1F | YUV Data |
| 0x20-0x27 | RGB Data |
| 0x28-0x2F | RAW Data |
| 0x30-0x37 | User-Defined |
| 0x38-0x3F | Reserved |

5편에서 자세히.

## ECC + Checksum — 신뢰성 2층

### ECC (Header)

Packet Header (DI + WC) 3 byte에 *1-bit error correction, 2-bit detection* 가능한 *24-bit ECC*. Hamming code 변형.

→ 헤더 비트 1개 깨져도 *복구*. 2개 이상이면 *검출만*, packet drop.

### Checksum (Long Packet Payload)

CRC-16 CCITT (`0x1021` 다항식). Payload 끝 2 byte. 픽셀 데이터 무결성.

CRC 불일치 시 *그 라인 폐기 또는 ISP가 보간*.

## Frame / Line Sync 흐름

```text
Time →
[FS pkt][Line 1: LS pkt → Long pkt → LE pkt][Line 2: LS → Long → LE]...[Line N][FE pkt]
  ↑                        ↑                                                       ↑
Frame Start          한 라인 픽셀                                            Frame End
```

> 💡 *LS/LE Short Packet은 옵션*. 일부 센서는 *Long Packet만* 보내고 *시간으로* 라인 경계 알림.

## Lane Distribution — Byte Interleave

1 stream → N lane에 *byte 단위*로 분산.

```text
1 lane:  B0 B1 B2 B3 B4 B5 B6 B7 ...
2 lane:  Lane0: B0 B2 B4 B6 ...
         Lane1: B1 B3 B5 B7 ...
4 lane:  Lane0: B0 B4 B8 B12 ...
         Lane1: B1 B5 B9 B13 ...
         Lane2: B2 B6 B10 B14 ...
         Lane3: B3 B7 B11 B15 ...
```

수신자가 *lane 0부터 순서대로* 재조합. *lane skew* 보정은 수신자 책임.

## Bandwidth 계산

```text
필요 대역폭 = 해상도 × bpp × fps × overhead

예) 1920×1080 RAW10 @ 30 fps:
  1920 × 1080 × 10 × 30 = 622 Mbps
  + 10% overhead (packet header, sync) ≈ 685 Mbps
  
4-lane D-PHY 2.5 Gbps:
  4 × 2.5 = 10 Gbps  →  여유 14×
  
4K (3840×2160) RAW10 @ 60 fps:
  3840 × 2160 × 10 × 60 ≈ 5 Gbps
  + overhead → 5.5 Gbps
  → 4-lane D-PHY 1.4 Gbps/lane 으로 OK
```

→ 대부분 시스템에서 *bandwidth는 충분*. 병목은 *ISP·메모리*.

## CSI-2 표준 버전

| 버전 | 발표 | 주요 추가 |
| --- | --- | --- |
| v1.0 | 2005 | 초기 |
| v1.1 | 2007 | C-PHY 옵션 |
| v2.0 | 2017 | RAW16/RAW20, ULPS |
| v3.0 | 2019 | 확장 VC (16), Smart ROI |
| v4.0 | 2021 | RAW24, USL (Unified Serial Link) |
| v4.2 | 2024 | RGB888 압축 |

대부분 시판 센서는 *v1.3 ~ v2.0*. 신규 8K·차량 센서가 *v3.0+* 채택.

## 자주 하는 실수

> ⚠️ Line Start/End packet 누락

일부 센서가 *LS/LE 안 보냄*. SoC는 *Long Packet 카운트*로 라인 결정. DT가 *line valid* 안 잡으면 *프레임 어긋남*.

> ⚠️ ECC 깨져도 진행

ECC 1-bit error는 *복구 가능*하지만 *통계적으로 신호 약함* 시그니처. SoC 통계로 모니터.

> ⚠️ Checksum 끄기

성능 향상 목적으로 Checksum 끔 → *간헐 픽셀 깨짐 무시*. 양산은 *항상 활성*.

> ⚠️ Virtual Channel 무시

여러 VC 스트림을 모두 VC 0으로 처리 → 데이터 섞임. SoC ISP에서 *VC별 분리* 명시.

## 정리

- CSI-2 = **Short Packet (sync) + Long Packet (pixel)**의 단순 모델.
- Header에 **VC + DT** 인코딩, **ECC**로 헤더 보호.
- 한 라인 = 한 Long Packet, **CRC-16**으로 페이로드 보호.
- N-lane은 *byte interleave* 분산.
- 1080p RAW10 @ 30 fps = ~685 Mbps → 4-lane D-PHY 여유 14배.

다음 편은 **CSI-2 Data Types** — RAW·YUV·RGB·임베디드.

## 관련 항목

- [Ch 3: C-PHY](/blog/embedded/protocols/mipi/chapter03-c-phy)
- [Ch 5: CSI-2 Data Types](/blog/embedded/protocols/mipi/chapter05-csi2-data-types)
