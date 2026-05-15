---
title: "Ch 2.6: Profiles · Levels · Tiers"
date: 2025-10-01T03:06:00
description: "AV1의 3-Profile, 13-Level, 2-Tier 체계와 코덱 스트링 av01.X.YYZ.B를 읽는 법."
tags: [AV1, Video, Codec, Profile, Level, Tier]
series: "AV1"
seriesOrder: 2.06
draft: false
---

코덱 스트링 `av01.0.04M.10` 이 무슨 뜻인지 안 풀려서 답답했을 사람을 위해. 이 절은 Annex A의 *Profiles*, *Levels*, *Tiers* 를 한꺼번에 푼다.

## 3축 — Profile / Level / Tier

| 축 | 답하는 질문 | 비트스트림 위치 |
|----|------------|-----------------|
| **Profile** | 어떤 *코딩 도구* 를 쓸 수 있는가 | `seq_profile` (3비트) |
| **Level** | 어떤 *해상도·프레임률* 까지 가능한가 | `seq_level_idx[i]` (5비트) |
| **Tier** | 어떤 *비트레이트* 까지 허용되는가 | `seq_tier[i]` (1비트, level > 7일 때만) |

세 축이 *함께* 한 디코더의 능력을 정의한다.

## Profiles (Annex A.2)

`seq_profile` 3비트 — 현재 3개 값만 정의.

| `seq_profile` | 이름 | bit_depth | Subsampling | 용도 |
|---|---|---|---|---|
| 0 | **Main** | 8, 10 | 4:0:0, 4:2:0 | 일반 스트리밍 (대부분의 콘텐츠) |
| 1 | **High** | 8, 10 | + 4:4:4 | 스크린 콘텐츠, 일부 영화 |
| 2 | **Professional** | 8, 10, 12 | + 4:2:2 | 방송, 영화, 보관 |

상위 프로파일은 *하위 프로파일을 포함* 하지 않는다 — 인코더가 4:2:2를 쓰려면 *반드시 Professional*. (HEVC와 다른 점.)

### 도구 가용성

스펙은 *각 도구가 어느 Profile부터 사용 가능한지* 명시한다. 대부분의 도구는 *모든 Profile* 에서 가능 — Profile 간의 주요 차이는 *bit_depth · chroma subsampling* 이다.

## Levels (Annex A.3)

`seq_level_idx[i]` 5비트 — 13개 값.

| Level | seq_level_idx | MaxPicSize (samples) | MaxHSize | MaxVSize | MaxDisplayRate (samples/s) | 대표 해상도 |
|-------|---------------|---------------------|----------|----------|---------------------------|-------------|
| 2.0 | 0 | 147,456 | 2,048 | 1,152 | 4,423,680 | 426×240 @ 30 |
| 2.1 | 1 | 278,784 | 2,816 | 1,584 | 8,363,520 | 640×360 @ 30 |
| 3.0 | 4 | 665,856 | 4,352 | 2,448 | 19,975,680 | 854×480 @ 30 |
| 3.1 | 5 | 1,065,024 | 5,504 | 3,096 | 31,950,720 | 1280×720 @ 30 |
| 4.0 | 8 | 2,359,296 | 6,144 | 3,456 | 70,778,880 | 1920×1080 @ 30 |
| 4.1 | 9 | 2,359,296 | 6,144 | 3,456 | 141,557,760 | 1920×1080 @ 60 |
| 5.0 | 12 | 8,912,896 | 8,192 | 4,352 | 267,386,880 | 2560×1440 @ 30 |
| 5.1 | 13 | 8,912,896 | 8,192 | 4,352 | 534,773,760 | 3840×2160 @ 30 |
| 5.2 | 14 | 8,912,896 | 8,192 | 4,352 | 1,069,547,520 | 3840×2160 @ 60 |
| 5.3 | 15 | 8,912,896 | 8,192 | 4,352 | 1,069,547,520 | 3840×2160 @ 120 |
| 6.0 | 16 | 35,651,584 | 16,384 | 8,704 | 1,069,547,520 | 7680×4320 @ 30 |
| 6.1 | 17 | 35,651,584 | 16,384 | 8,704 | 2,139,095,040 | 7680×4320 @ 60 |
| 6.2 | 18 | 35,651,584 | 16,384 | 8,704 | 4,278,190,080 | 7680×4320 @ 120 |
| 6.3 | 19 | 35,651,584 | 16,384 | 8,704 | 4,278,190,080 | 7680×4320 @ 120 |

값 2, 3, 6, 7, 10, 11 은 *예약* — 미래 levels용.

### Level이 정하는 것

- **MaxPicSize** — 한 프레임의 *최대 픽셀 수*
- **MaxHSize / MaxVSize** — 가로/세로 픽셀 상한
- **MaxDisplayRate** — *초당 표시 픽셀 수* (해상도 × FPS의 상한)
- **MaxDecodeRate** — 디코딩 처리율 상한
- **MaxHeaderRate** — 초당 *프레임 헤더 수* (작은 프레임 다발 방지)
- **MainMbps / HighMbps** — Tier별 *최대 비트레이트*
- **MainCR / HighCR** — *압축 비* 상한 (너무 고압축으로 노이즈 발생 방지)
- **MaxTiles** — 최대 타일 수
- **MaxTileCols** — 최대 타일 컬럼

`seq_level_idx > 7` (즉 Level ≥ 4.0) 이면 *Tier 선택 가능* — `seq_tier` 비트가 등장한다.

## Tiers (Annex A.5)

| Tier | seq_tier | 용도 |
|------|----------|------|
| Main | 0 | 일반 — 낮은 비트레이트, 낮은 메모리 |
| High | 1 | 고급 — *높은 peak bitrate* 허용 (방송·아카이브) |

같은 Level에서도 *High Tier가 4배 가까운 비트레이트* 를 허용. 예: Level 5.1 Main = 40 Mbps, Level 5.1 High = 160 Mbps.

## MaxBitrate 예시

| Level | Main Tier (Mbps) | High Tier (Mbps) |
|-------|------------------|------------------|
| 3.0 | 1.2 | — |
| 4.0 | 12 | 30 |
| 4.1 | 20 | 50 |
| 5.0 | 30 | 100 |
| 5.1 | 40 | 160 |
| 5.2 | 60 | 240 |
| 5.3 | 60 | 240 |
| 6.0 | 60 | 240 |
| 6.1 | 100 | 480 |
| 6.2 | 160 | 800 |
| 6.3 | 160 | 800 |

## 코덱 스트링 — `av01.X.YYZ.B`

ISO BMFF (MP4) 와 RFC 6381 의 *codecs* 파라미터에 들어가는 형식.

```text
av01.<Profile>.<Level><Tier>.<BitDepth>[.<Mono><Chr><Range><Primaries><Transfer><Matrix>]
   |    |        |      |       |        └──── optional Color suffix
   |    |        |      |       └────── 8/10/12
   |    |        |      └────────────── M (Main) / H (High)
   |    |        └──────────────────── seq_level_idx 두 자릿수
   |    └──────────────────────────── 0/1/2
   └───────────────────────────── 항상 "av01"
```

### 풀어 보기

```text
av01.0.04M.08
   │ │ │  │  │
   │ │ │  │  └─ 8-bit
   │ │ │  └──── Main tier
   │ │ └─────── seq_level_idx=4 → Level 3.0
   │ └───────── Profile 0 (Main)
   └─────────── av01

→ Profile 0 (Main), Level 3.0 Main Tier, 8-bit
   대략 854×480 @ 30fps, 1.2 Mbps 까지
```

```text
av01.2.19H.12
   → Profile 2 (Professional), seq_level_idx=19 → Level 6.3 High Tier, 12-bit
     대략 8K @ 120fps, 800 Mbps까지
```

```text
av01.0.13M.08.0.110.01.01.01.0
   → Profile 0, Level 5.1 Main, 8-bit
   + Color suffix:
     monochrome = 0
     chroma_subsampling_x/y/position = 1,1,0  (4:2:0, vert+colocated)
     color_primaries = 01      (BT.709)
     transfer = 01             (BT.709)
     matrix = 01               (BT.709)
     color_range = 0           (limited)
```

Color suffix는 *선택* — 생략하면 디코더가 *컨테이너의 색 정보* 를 본다.

## 호환성 — 디코더가 이 콘텐츠를 재생할 수 있나?

브라우저의 `MediaCapabilities.decodingInfo()` 가 이 스트링을 인자로 받는다.

```js
await navigator.mediaCapabilities.decodingInfo({
  type: 'file',
  video: {
    contentType: 'video/mp4; codecs="av01.0.04M.08"',
    width: 854,
    height: 480,
    framerate: 30,
    bitrate: 1_200_000,
  },
});
// → { supported: true, smooth: true, powerEfficient: true }
```

`av01.0.04M.08` 은 *AV1 Main Profile Level 3.0 8-bit* — 가장 보수적인 조합. 거의 모든 AV1 디코더가 지원한다.

## Operating Point 와의 관계

스케일러빌리티가 있는 비트스트림이면 *Operating Point 별로 Level 이 다르다* — Sequence Header에 배열로 들어간다.

```text
operating_points_cnt_minus_1 = 2  // 3 operating points

[0] operating_point_idc[0] = 0x000     // 모든 레이어
    seq_level_idx[0] = 13              // Level 5.1
    seq_tier[0] = 0                    // Main
[1] operating_point_idc[1] = 0x100     // base spatial layer만
    seq_level_idx[1] = 8               // Level 4.0
    seq_tier[1] = 0
[2] operating_point_idc[2] = 0x200     // enhancement spatial layer
    seq_level_idx[2] = 13              // Level 5.1
    seq_tier[2] = 1                    // High
```

플레이어가 *자기 능력에 맞는 operating point* 를 골라 디코딩.

## 정리

- **Profile** = 도구 / 픽셀 포맷 능력 (Main/High/Professional)
- **Level** = 해상도·프레임률·픽셀률 상한 (2.0~6.3, 13개)
- **Tier** = 비트레이트 상한 (Main/High; Level ≥ 4.0만)
- 코덱 스트링 `av01.X.YYZ.B[.colorSuffix]` 로 모두 인코딩
- 스케일러빌리티 스트림은 *Operating Point 별 Level*

## 다음 절

다음은 **2.7 스펙 표기법** — `f(n)`, `uvlc()`, `leb128()`, `su(n)`, `ns(n)`, `S()`, `L(n)` 디스크립터들을 정리한다.

## 관련 항목

- [2.5 Sequence Header 개요](/blog/media/av1/chapter02-bitstream/05-sequence-header)
- [2.7 스펙 표기법](/blog/media/av1/chapter02-bitstream/07-notation)
- [Ch 25: 컨테이너와 전송](/blog/media/av1/chapter25-container-transport)
