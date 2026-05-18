---
title: "Ch 8: DSI-2 — DSC 압축, 4K/8K, VR/AR HMD"
date: 2027-05-01T08:00:00
description: "VESA Display Stream Compression 통합 — 4K/8K @ 120Hz를 같은 lane으로. AR/VR HMD의 표준."
series: "MIPI 심화"
seriesOrder: 8
tags: [mipi, dsi-2, dsc, vesa, vr, ar, foveated]
draft: true
---

## 한 줄 요약

> **"DSI-2 = DSI + VESA DSC + C-PHY"** — 3 가지 더해 *대역폭 부족*을 해소.

## 어떤 문제를 푸는가

8K 디스플레이 (7680×4320 @ 120 Hz RGB888):

```text
7680 × 4320 × 24 × 120 = 95.5 Gbps
+ overhead → ~100 Gbps
```

D-PHY v2.5 4-lane = 18 Gbps → *부족*. C-PHY v2.0 4-lane = 64 Gbps → *부족*.

**해결책** — *VESA DSC*로 *3-3.75× 압축*. 100 Gbps → 27 Gbps → 4-lane D-PHY/C-PHY 으로 가능.

## DSI-2의 3가지 신기능

### 1. C-PHY 지원

DSI 1.x = D-PHY only. DSI-2 = *D-PHY + C-PHY*. 같은 프로토콜이 두 PHY 위.

### 2. VESA DSC 통합

DSC = Display Stream Compression. *시각적 무손실 (visually lossless)* 압축. 1:3 ~ 1:3.75 비율.

### 3. 확장 DCS 명령

VR/AR용 *Foveated Rendering*, *Variable Refresh Rate*, *Multi-Eye Sync* 등.

## VESA DSC — 작동 원리

VESA Industry 표준 (DSC 1.0 = 2014, 1.2a = 2017). *블록 단위 (slice) 압축*.

```text
한 라인을 N slice로 분할 (slice 폭 = 라인폭 / N)
각 slice 독립 압축:
  1. Predictor — 인접 픽셀 예측
  2. Quantization — 차이 양자화
  3. Entropy coding — variable-length 코드
  4. Rate control — 일정 bit/pixel 목표
```

### 압축률

| 입력 | 출력 |
| --- | --- |
| RGB888 (24 bpp) | 8 bpc (3:1) ~ 6 bpc (4:1) |
| RGB101010 (30 bpp) | 12 bpc 또는 8 bpc |

### 시각적 무손실?

VESA 표준 — *visually lossless*. *수학적*으로 손실 있지만 *육안 차이 없음* (peer-reviewed 실험). 비트 정확이 필요한 *의료*나 *과학*은 RAW 유지.

### 디스플레이 칩에 디코더 내장

패널 *드라이버 IC*에 DSC 디코더 내장. SoC가 *압축 데이터*만 보내고 패널이 *실시간 복호*. AMOLED 신제품 대부분 *DSC ready*.

## 한눈에 — DSC 데이터 흐름

```text
SoC
 ↓ RGB888 (10 Gbps)
DSC Encoder
 ↓ 압축 (3.5 Gbps)
DSI-2 Tx
 ↓ D-PHY/C-PHY
DSI-2 Rx (in display driver IC)
 ↓ 압축 (3.5 Gbps)
DSC Decoder
 ↓ RGB888 (10 Gbps)
Display Panel
```

## DSC 파라미터 — SoC 측 설정

```c
struct mipi_dsi_dsc_config dsc = {
    .bits_per_component = 8,
    .bits_per_pixel = 8,            // 1:3 압축
    .block_pred_enable = 1,
    .slice_count = 4,
    .slice_width = 480,             // 1920/4
    .slice_height = 8,
    .initial_xmit_delay = 512,
    .initial_dec_delay = 526,
    .scale_increment_interval = 11,
    .scale_decrement_interval = 7,
};
```

값들은 *DSC 표준 §5.6*의 *권장 PPS (Picture Parameter Set)* 표에서 가져옴. 패널·해상도별 *정해진 값*.

## VR/AR HMD 응용

### Foveated Rendering

시선 추적 → 중심 영역만 *고해상도*, 주변은 *저해상도* 렌더링. GPU 부담 ↓.

DSI-2 + foveation:
- 중심 1000×1000 — *full DSC*
- 주변 (3000×3000) — *추가 압축* 또는 *낮은 해상도*

응용 — Apple Vision Pro, Meta Quest Pro.

### Multi-Eye Sync

양안 디스플레이 두 패널을 *마이크로초 동기*. DSI-2의 *Sync Stream*으로 보장.

### Variable Refresh Rate

콘텐츠에 따라 60-120 Hz 자유 변경. *Tearing-free*. 모바일 게임에 표준.

## 호환성 — DSI 1.x → DSI-2

새 SoC + 새 패널 = DSI-2 OK. 옛 패널 + 새 SoC = *Backward 호환* (SoC가 DSI-2 페리퍼럴이지만 DSI 1.x 모드 fallback).

> ⚠️ *옛 SoC + 새 패널*은 *패널이 DSI 1.x로 동작* 가능 (DSC 끄고). 그러나 *최대 해상도/프레임* 제한.

## 자주 하는 실수

> ⚠️ DSC 인코더/디코더 *파라미터* 불일치

PPS (Picture Parameter Set) 64 byte를 *SoC와 패널 양쪽* 동일 설정. 한 비트라도 다르면 *완전 잡음*.

> ⚠️ Foveated 영역 정렬 잘못

시선 좌표와 *압축 영역* 정렬 안 맞으면 *주변시*에서 *블록 보임*. 60 Hz 시선 추적 응답성 부족.

> ⚠️ DSC 끄고 8K 시도

해상도/FPS 계산 안 함 → *깨진 화면*. DSC 활성 후 4K@120 또는 8K@60 가능.

> ⚠️ Slice 경계에서 *artifact*

Slice 분할이 *콘텐츠 경계*에 일치하면 *경계 깜빡임*. 권장 — *짝수 분할*, *해상도 ÷ slice = 정수*.

## 정리

- DSI-2 = **DSI + VESA DSC + C-PHY**.
- **DSC**가 3-3.75× 압축 → 8K @ 120 Hz 가능.
- *시각적 무손실* — 일상 컨텐츠 OK, *의료·과학은 RAW*.
- **Foveated Rendering**, **Multi-Eye Sync**, **VRR**이 VR/AR HMD 표준.
- PPS 64 byte를 *양쪽 동일* 설정 정확히.

다음 편은 **A-PHY** — 자동차 장거리 SerDes.

## 관련 항목

- [Ch 7: DSI 기초](/blog/embedded/protocols/mipi/chapter07-dsi)
- [Ch 9: A-PHY](/blog/embedded/protocols/mipi/chapter09-a-phy)
