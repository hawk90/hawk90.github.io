---
title: "Ch 2.5: Sequence Header 개요"
date: 2025-10-01T03:05:00
description: "Sequence Header가 담는 시퀀스 전역 설정 — 프로파일, 해상도, 도구 활성화 플래그, Color Config."
tags: [AV1, Video, Codec, SequenceHeader, ColorConfig]
series: "AV1"
seriesOrder: 2.05
draft: false
---

**Sequence Header OBU** 는 *전체 비디오 시퀀스에 한 번* 설정되는 전역 정보를 담는다. CVS(Coded Video Sequence) 가 시작되는 자리이자, 같은 CVS 안 모든 프레임이 *동일하게* 따르는 규칙이다.

이 절은 Sequence Header의 *전체 그림* 만 본다. 상세 필드 파싱은 Ch 3에서 다룬다.

## 어디서 보내는가

- *CVS 의 시작* — 가장 흔함. 첫 OBU
- *도구 활성화 변경* 가능 시점 — 일부 인코더는 매 KEY_FRAME 직전에 같은 Sequence Header를 재전송 (random access를 돕기 위해)
- 같은 CVS 안에서는 *바뀌면 안 된다* — 바뀌면 새 CVS

## Sequence Header가 담는 것

세 그룹으로 나누면 이해가 쉽다.

```text
SequenceHeader
├── Profile/Level/Tier
│   ├── seq_profile          (0=Main, 1=High, 2=Pro)
│   ├── operating_points[]   (스케일러빌리티)
│   └── seq_level_idx[]      (Level + Tier)
├── 공간 구조
│   ├── max_frame_width
│   ├── max_frame_height
│   ├── frame_width_bits     (헤더에서 width를 몇 비트로 표현할지)
│   ├── frame_height_bits
│   ├── use_128x128_superblock
│   └── enable_filter_intra / enable_intra_edge_filter / ...
├── 도구 활성화 플래그 (수십 개)
│   ├── enable_interintra_compound
│   ├── enable_masked_compound
│   ├── enable_warped_motion
│   ├── enable_dual_filter
│   ├── enable_order_hint
│   ├── enable_jnt_comp
│   ├── enable_ref_frame_mvs
│   ├── enable_cdef
│   ├── enable_restoration
│   ├── enable_superres
│   └── film_grain_params_present
└── Color Config
    ├── bit_depth (8/10/12)
    ├── monochrome (0/1)
    ├── subsampling (4:0:0/4:2:0/4:2:2/4:4:4)
    ├── color_range (limited/full)
    ├── chroma_sample_position
    └── matrix_coefficients / transfer_characteristics / color_primaries
```

## Operating Points

스케일러빌리티가 들어오면 *operating point* 가 여러 개일 수 있다.

```text
operating_points_cnt_minus_1   f(5)
for i in 0..operating_points_cnt:
    operating_point_idc[i]      f(12)    // 어떤 spatial/temporal 레이어 조합
    seq_level_idx[i]            f(5)     // 그 조합에 필요한 레벨
    if seq_level_idx[i] > 7:
        seq_tier[i]             f(1)
```

`operating_point_idc` 는 *비트마스크* — 어떤 `temporal_id` × `spatial_id` 조합이 이 operating point에 속하는지.

스케일러빌리티를 안 쓰면 `operating_points_cnt_minus_1=0`, `operating_point_idc[0]=0` (모든 레이어 포함).

## 도구 활성화 플래그

수십 개의 1비트 플래그가 *어떤 코딩 도구를 시퀀스 안에서 사용할 수 있는지* 결정한다. 켜지지 않은 도구는 *프레임 헤더에서도 사용 불가*.

| 플래그 | 의미 | 영향 |
|--------|------|------|
| `enable_order_hint` | order_hint 비트 사용 (인터 디스플레이 순서) | 모든 인터 코딩 |
| `enable_ref_frame_mvs` | 참조 프레임 MV 재사용 | 인터 예측 효율 |
| `enable_warped_motion` | Warped motion 모드 | Ch 14 |
| `enable_interintra_compound` | 인트라+인터 결합 예측 | Ch 13 |
| `enable_masked_compound` | 마스크 기반 컴파운드 | Ch 13 |
| `enable_dual_filter` | 수평/수직 다른 보간 필터 | 화질 향상 |
| `enable_cdef` | CDEF 루프 필터 | Ch 17 |
| `enable_restoration` | Loop Restoration | Ch 18 |
| `enable_superres` | Super-resolution | Ch 21 |
| `film_grain_params_present` | Film grain 합성 | Ch 19 |

플래그 하나가 *Ch 십 몇 장 분량* 의 도구를 켜고 끄는 거대한 스위치다.

## Color Config (Section 5.5.2)

색 공간 정보. 디코더가 *YCbCr → RGB 변환* 을 정확히 하기 위해 필요.

### bit_depth

```text
if (seq_profile == 2 && high_bitdepth)
    bit_depth = twelve_bit ? 12 : 10
elif (seq_profile <= 2 && high_bitdepth)
    bit_depth = 10
else
    bit_depth = 8
```

| Profile | 가능한 bit_depth |
|---------|------------------|
| Main (0) | 8, 10 |
| High (1) | 8, 10 |
| Professional (2) | 8, 10, 12 |

### Chroma Subsampling

```text
if (monochrome)
    4:0:0
else:
    subsampling_x   f(1)
    subsampling_y   f(1)
    → (0,0)=4:4:4  (1,0)=4:2:2  (1,1)=4:2:0
```

| `subsampling_x` | `subsampling_y` | 포맷 | Profile |
|---|---|---|---|
| 1 | 1 | 4:2:0 | Main 가능 |
| 1 | 0 | 4:2:2 | Professional만 |
| 0 | 0 | 4:4:4 | High, Professional |
| — | — | 4:0:0 (monochrome) | 모두 |

### Color Primaries / Transfer / Matrix

ITU-T 표준 코드.

| 필드 | 흔한 값 | 의미 |
|------|--------|------|
| `color_primaries` | 1 (BT.709), 9 (BT.2020) | 색역 |
| `transfer_characteristics` | 1 (BT.709), 16 (PQ), 18 (HLG) | 감마/EOTF |
| `matrix_coefficients` | 1 (BT.709), 9 (BT.2020 NCL) | YCbCr ↔ RGB 매트릭스 |

`color_description_present_flag=0` 이면 *디코더가 default* 를 가정한다 (대개 BT.709).

### color_range

```text
color_range:
  0 = limited (Y: 16-235, Cb/Cr: 16-240 at 8-bit)
  1 = full    (Y: 0-255)
```

스트리밍 콘텐츠는 limited, 스크린 캡처는 full이 흔하다.

## 최소 Sequence Header 예시

가장 단순한 8-bit 4:2:0 1080p Main Profile.

```text
seq_profile = 0                  (Main)
still_picture = 0
reduced_still_picture_header = 0
timing_info_present_flag = 0
initial_display_delay_present_flag = 0
operating_points_cnt_minus_1 = 0
operating_point_idc[0] = 0
seq_level_idx[0] = 4             (Level 4.0, 1080p)
frame_width_bits_minus_1 = 11    (12비트로 width 표현 가능, 최대 4096)
frame_height_bits_minus_1 = 11
max_frame_width_minus_1 = 1919
max_frame_height_minus_1 = 1079
frame_id_numbers_present_flag = 0
use_128x128_superblock = 0       (64×64 SB)
enable_filter_intra = 1
enable_intra_edge_filter = 1
enable_interintra_compound = 1
enable_masked_compound = 1
enable_warped_motion = 1
enable_dual_filter = 1
enable_order_hint = 1
enable_jnt_comp = 1
enable_ref_frame_mvs = 1
seq_force_screen_content_tools = SELECT (2)
seq_force_integer_mv = SELECT (2)
order_hint_bits_minus_1 = 6      (order_hint 7-bit)
enable_superres = 0
enable_cdef = 1
enable_restoration = 1
ColorConfig:
  high_bitdepth = 0              (8-bit)
  monochrome = 0
  color_description_present_flag = 1
    color_primaries = 1          (BT.709)
    transfer_characteristics = 1 (BT.709)
    matrix_coefficients = 1      (BT.709)
  color_range = 0                (limited)
  subsampling_x = 1, subsampling_y = 1 → 4:2:0
  chroma_sample_position = 0
  separate_uv_deltas = 0
film_grain_params_present = 0
```

대부분의 *YouTube AV1* 콘텐츠가 이 형태에 가깝다.

## still_picture 모드

`still_picture=1` 이면 *단일 프레임의 정적 이미지* — AVIF의 기반.

- KEY_FRAME 하나만
- 시간 관련 필드 다수 생략
- `reduced_still_picture_header` 가 추가 단순화

AVIF 이미지를 열어 보면 *Sequence Header + 한 KEY_FRAME OBU* 가 들어 있다.

## 정리

- Sequence Header = CVS의 *전역 설정 컨테이너*
- 같은 CVS 안에서 *바뀌지 않음* — 바뀌면 새 CVS
- 담는 것: Profile/Level/Tier, 공간 구조, 도구 활성화 플래그, Color Config
- 도구 활성화 플래그 하나가 *수많은 코딩 도구* 를 켜고 끈다
- AVIF는 *still_picture* 모드의 AV1 비트스트림

## 다음 절

다음은 **2.6 Profiles · Levels · Tiers** — 코덱 스트링 `av01.0.04M.10` 을 끝까지 읽는다.

## 관련 항목

- [2.4 Temporal Unit과 Frame Type](/blog/media/av1/chapter02-bitstream/04-temporal-frame)
- [2.6 Profiles · Levels · Tiers](/blog/media/av1/chapter02-bitstream/06-profiles-levels)
- [Ch 3: Tiles · Superblocks (Sequence Header 상세)](/blog/media/av1/chapter03-tiles-superblocks)
