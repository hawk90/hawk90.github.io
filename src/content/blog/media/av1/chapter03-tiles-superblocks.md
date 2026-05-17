---
title: "Ch 3: Sequence Header와 공간 구조"
date: 2025-10-01T04:00:00
description: "AV1의 전역 설정과 공간 분할 구조 — Sequence Header, Color Config, 타일, 슈퍼블록, 좌표 시스템."
tags: [AV1, Video, Codec, Sequence Header, Tile, Superblock]
series: "AV1"
seriesOrder: 3
draft: true
---

이 장에서는 Sequence Header의 상세 구조와 프레임의 공간적 분할 체계를 다룬다. 스펙 Section 5.5(sequence_header_obu)와 Section 6.4(Tile)를 참조한다.

## 3.1 Sequence Header (스펙 Section 5.5)

### 3.1.1 Sequence Header의 역할

**Sequence Header**는 전체 비디오 시퀀스에 적용되는 전역 설정이다.

- 프로파일, 레벨, 비트 깊이
- 최대 프레임 크기
- 슈퍼블록 크기 (64×64 vs 128×128)
- 각종 코딩 도구 활성화 플래그
- 색 공간 정보

Key Frame마다 Sequence Header가 반복될 수 있다. 디코더는 Sequence Header 없이는 어떤 프레임도 디코딩할 수 없다.

### 3.1.2 핵심 필드 목록

```
sequence_header_obu() {                           // 스펙 Section 5.5
    seq_profile                    f(3)           // 0=Main, 1=High, 2=Pro
    still_picture                  f(1)           // AVIF용
    reduced_still_picture_header   f(1)           // 단순화된 헤더

    if (!reduced_still_picture_header) {
        timing_info_present_flag   f(1)
        if (timing_info_present_flag)
            timing_info()
        initial_display_delay_present_flag  f(1)
        operating_points_cnt_minus_1        f(5)
        for (i = 0; i <= operating_points_cnt_minus_1; i++) {
            operating_point_idc[i]          f(12)
            seq_level_idx[i]                f(5)
            seq_tier[i]                     f(1)  // level > 7이면
            ...
        }
    }

    frame_width_bits_minus_1       f(4)
    frame_height_bits_minus_1      f(4)
    max_frame_width_minus_1        f(frame_width_bits + 1)
    max_frame_height_minus_1       f(frame_height_bits + 1)

    if (!reduced_still_picture_header)
        frame_id_numbers_present_flag  f(1)

    use_128x128_superblock         f(1)           // SB 크기 결정
    enable_filter_intra            f(1)
    enable_intra_edge_filter       f(1)

    if (!reduced_still_picture_header) {
        enable_interintra_compound f(1)
        enable_masked_compound     f(1)
        enable_warped_motion       f(1)
        enable_dual_filter         f(1)
        enable_order_hint          f(1)
        if (enable_order_hint) {
            enable_jnt_comp        f(1)
            enable_ref_frame_mvs   f(1)
        }
        seq_choose_screen_content_tools  f(1)
        ...
    }

    enable_superres                f(1)
    enable_cdef                    f(1)
    enable_restoration             f(1)

    color_config()                               // 색 공간 설정

    film_grain_params_present      f(1)
}
```

### 3.1.3 도구 활성화 플래그

| 플래그 | 스펙 섹션 | 설명 |
|--------|-----------|------|
| `enable_filter_intra` | 5.5.2 | Filter Intra 모드 허용 |
| `enable_intra_edge_filter` | 5.5.2 | Intra 엣지 필터링 |
| `enable_interintra_compound` | 5.5.2 | Inter+Intra 혼합 예측 |
| `enable_masked_compound` | 5.5.2 | Wedge/DIFFWTD 마스크 |
| `enable_warped_motion` | 5.5.2 | Warped/Affine 모션 |
| `enable_dual_filter` | 5.5.2 | 수평/수직 다른 필터 |
| `enable_order_hint` | 5.5.2 | 프레임 순서 힌트 |
| `enable_jnt_comp` | 5.5.2 | Distance-weighted compound |
| `enable_ref_frame_mvs` | 5.5.2 | MFMV (Motion Field MV) |
| `enable_superres` | 5.5.2 | Super Resolution |
| `enable_cdef` | 5.5.2 | Constrained Directional Enhancement Filter |
| `enable_restoration` | 5.5.2 | Loop Restoration (Wiener, SGRPROJ) |

이 플래그가 0이면 해당 도구는 시퀀스 전체에서 사용 불가다.

## 3.2 Color Config (스펙 Section 5.5.2)

### 3.2.1 왜 Color Config이 필요한가

같은 YCbCr 값이라도 **색 공간 해석**에 따라 완전히 다른 색으로 보인다.

```
YCbCr(128, 100, 180)
  │
  ├─ BT.709 해석 → 특정 색 A
  │
  └─ BT.2020 해석 → 전혀 다른 색 B
```

Color Config이 없거나 잘못되면 전체 색이 틀어진다 (녹색 피부, 보라색 하늘).

### 3.2.2 비트 깊이 결정 (스펙 Section 5.5.2)

```
if (seq_profile == 2 && high_bitdepth) {
    twelve_bit        f(1)
    BitDepth = twelve_bit ? 12 : 10
} else if (seq_profile <= 2) {
    BitDepth = high_bitdepth ? 10 : 8
}
```

| seq_profile | high_bitdepth | twelve_bit | BitDepth |
|-------------|---------------|------------|----------|
| 0, 1 | 0 | - | 8 |
| 0, 1 | 1 | - | 10 |
| 2 | 1 | 0 | 10 |
| 2 | 1 | 1 | 12 |

### 3.2.3 색 공간 파라미터

| 필드 | 값 범위 | 설명 |
|------|---------|------|
| `color_primaries` | 1~22 | 색 좌표계 (BT.709=1, BT.2020=9) |
| `transfer_characteristics` | 1~18 | 감마/OETF (BT.709=1, PQ=16, HLG=18) |
| `matrix_coefficients` | 0~14 | YCbCr 변환 행렬 (BT.709=1, BT.2020=9) |

**자주 쓰는 조합**:

| 용도 | primaries | transfer | matrix |
|------|-----------|----------|--------|
| SDR HD | BT.709 (1) | BT.709 (1) | BT.709 (1) |
| HDR10 | BT.2020 (9) | PQ (16) | BT.2020-NCL (9) |
| HLG | BT.2020 (9) | HLG (18) | BT.2020-NCL (9) |

### 3.2.4 크로마 서브샘플링 (스펙 Section 5.5.2)

```
color_config() {
    ...
    if (mono_chrome) {
        subsampling_x = 1
        subsampling_y = 1
    } else {
        if (color_primaries == CP_BT_709 && ...) {
            subsampling_x = subsampling_y = 0  // 4:4:4 sRGB
        } else {
            if (seq_profile == 0) {
                subsampling_x = subsampling_y = 1  // 4:2:0 강제
            } else if (seq_profile == 1) {
                subsampling_x = subsampling_y = 0  // 4:4:4 강제
            } else {  // profile 2
                if (BitDepth == 12) {
                    subsampling_x      f(1)
                    if (subsampling_x)
                        subsampling_y  f(1)
                } else {
                    subsampling_x = 1
                    subsampling_y = 0  // 4:2:2
                }
            }
        }
        chroma_sample_position     f(2)
    }
    ...
}
```

| subsampling_x | subsampling_y | 포맷 |
|---------------|---------------|------|
| 0 | 0 | 4:4:4 |
| 1 | 0 | 4:2:2 |
| 1 | 1 | 4:2:0 |

**chroma_sample_position** (스펙 Section 6.4.2):

| 값 | 이름 | 의미 |
|---|------|------|
| 0 | UNKNOWN | 위치 불명 |
| 1 | VERTICAL | 루마 샘플 사이 수직 중앙 (MPEG-2 스타일) |
| 2 | COLOCATED | 왼쪽 상단 루마와 동일 위치 (H.264 스타일) |

## 3.3 타일 구조 (스펙 Section 5.9.15, 6.4)

### 3.3.1 왜 타일로 나누는가

**문제**: 프레임이 크면 디코딩이 오래 걸린다.
**해결**: 타일로 나눠서 병렬 디코딩.

```
┌───────────┬───────────┬───────────┐
│  Tile 0   │  Tile 1   │  Tile 2   │
│           │           │           │
├───────────┼───────────┼───────────┤
│  Tile 3   │  Tile 4   │  Tile 5   │
│           │           │           │
└───────────┴───────────┴───────────┘

각 타일은 독립적으로 디코딩 가능
→ 멀티코어 활용
```

H.264 Slice와의 차이:

| 특성 | H.264 Slice | AV1 Tile |
|------|-------------|----------|
| 경계 | 유연함 (어디서든) | 직사각형 그리드 |
| 의존성 | 이전 slice 의존 | 완전 독립 |
| 병렬화 | 어려움 | 쉬움 |

### 3.3.2 타일 파라미터 (스펙 Section 5.9.15)

```
tile_info() {
    if (use_128x128_superblock)
        sbCols = (MiCols + 31) >> 5   // 128×128 SB 열 수
    else
        sbCols = (MiCols + 15) >> 4   // 64×64 SB 열 수

    uniform_tile_spacing_flag       f(1)

    if (uniform_tile_spacing_flag) {
        // 균일 간격
        tile_cols_log2 = 0
        while (sbCols >> tile_cols_log2 > MaxTileWidthSb)
            tile_cols_log2++
        // 추가 비트로 타일 수 결정
        ...
    } else {
        // 명시적 크기 지정
        for (i = 0; startSb < sbCols; i++) {
            width_in_sbs_minus_1    ns(...)
            ...
        }
    }
}
```

### 3.3.3 타일 크기 제약 (스펙 Section 5.9.15)

- 최대 타일 너비: 4096 픽셀 (64 SB at 64×64, 32 SB at 128×128)
- 최대 타일 면적: 4096 × 2304 픽셀
- 최소 타일: 1 SB × 1 SB

```
MaxTileWidthSb = MAX_TILE_WIDTH / sbSize
               = 4096 / 64 = 64  (64×64 SB일 때)
               = 4096 / 128 = 32 (128×128 SB일 때)
```

## 3.4 슈퍼블록 (스펙 Section 6.4)

### 3.4.1 슈퍼블록이란

**슈퍼블록(Superblock)**은 AV1의 기본 처리 단위다.

```
┌─────────────────────────────────────┐
│           Superblock (SB)           │
│                                     │
│    64×64 또는 128×128 픽셀          │
│                                     │
│    내부적으로 재귀 분할 가능         │
│    → 4×4까지 쪼갤 수 있음            │
│                                     │
└─────────────────────────────────────┘
```

### 3.4.2 슈퍼블록 크기 선택

`use_128x128_superblock` 플래그가 결정한다.

| 플래그 | SB 크기 | 장점 | 단점 |
|--------|---------|------|------|
| 0 | 64×64 | 작은 해상도에 적합 | 대형 평탄 영역에서 비효율 |
| 1 | 128×128 | 4K/8K에 효율적 | 작은 해상도에서 과잉 |

일반적 선택:
- SD/HD → 64×64
- 4K 이상 → 128×128

### 3.4.3 프레임을 슈퍼블록으로 분할

```cpp
// 슈퍼블록 그리드 계산
int sbSize = use_128x128_superblock ? 128 : 64;
int sbCols = (FrameWidth + sbSize - 1) / sbSize;
int sbRows = (FrameHeight + sbSize - 1) / sbSize;

// 순회 순서: 래스터 스캔
for (int sbRow = 0; sbRow < sbRows; sbRow++) {
    for (int sbCol = 0; sbCol < sbCols; sbCol++) {
        decode_superblock(sbRow, sbCol);
    }
}
```

### 3.4.4 가장자리 슈퍼블록

프레임 가장자리의 불완전한 슈퍼블록은 실제 크기만큼만 처리한다.

```
1920×1080 프레임, 64×64 SB:

  1920 / 64 = 30 열 (완전)
  1080 / 64 = 16 행 + 56픽셀 나머지

  ┌────┬────┬────┬─...─┬────┐
  │ 64 │ 64 │ 64 │     │ 64 │ ← 행 0~15: 완전
  ├────┼────┼────┼─...─┼────┤
  │ 56 │ 56 │ 56 │     │ 56 │ ← 행 16: 높이 56픽셀
  └────┴────┴────┴─...─┴────┘
```

## 3.5 좌표 시스템 (스펙 Section 6.4.3)

### 3.5.1 MI (Mode Info) 단위

AV1은 **4×4 픽셀**을 기본 좌표 단위로 사용한다. 이를 **MI 단위**라 부른다.

```
픽셀 좌표 (128, 64) → MI 좌표 (32, 16)
  MI_col = 128 / 4 = 32
  MI_row = 64 / 4 = 16
```

```
MiCols = (FrameWidth + 3) / 4    // 가로 MI 수
MiRows = (FrameHeight + 3) / 4   // 세로 MI 수
```

### 3.5.2 블록 위치 계산

슈퍼블록, 코딩 블록, 변환 블록 모두 MI 단위로 위치를 표현한다.

```cpp
// 64×64 슈퍼블록의 MI 좌표
int sb_mi_col = sbCol * (sbSize / 4);
int sb_mi_row = sbRow * (sbSize / 4);

// 예: sbCol=2, sbRow=3, sbSize=64
// sb_mi_col = 2 * 16 = 32
// sb_mi_row = 3 * 16 = 48
```

### 3.5.3 블록 크기 인덱스 (스펙 Section 6.4.5)

AV1은 24가지 블록 크기를 정의한다.

```
BLOCK_4X4     = 0       BLOCK_4X8     = 1       BLOCK_8X4     = 2
BLOCK_8X8     = 3       BLOCK_8X16    = 4       BLOCK_16X8    = 5
BLOCK_16X16   = 6       BLOCK_16X32   = 7       BLOCK_32X16   = 8
BLOCK_32X32   = 9       BLOCK_32X64   = 10      BLOCK_64X32   = 11
BLOCK_64X64   = 12      BLOCK_64X128  = 13      BLOCK_128X64  = 14
BLOCK_128X128 = 15      BLOCK_4X16    = 16      BLOCK_16X4    = 17
BLOCK_8X32    = 18      BLOCK_32X8    = 19      BLOCK_16X64   = 20
BLOCK_64X16   = 21      BLOCK_32X128  = 22      BLOCK_128X32  = 23
```

크기 조회 테이블:

```cpp
const int block_width[24] = {
    4, 4, 8, 8, 8, 16, 16, 16, 32, 32, 32, 64,
    64, 64, 128, 128, 4, 16, 8, 32, 16, 64, 32, 128
};
const int block_height[24] = {
    4, 8, 4, 8, 16, 8, 16, 32, 16, 32, 64, 32,
    64, 128, 64, 128, 16, 4, 32, 8, 64, 16, 128, 32
};
```

## 3.6 실행 예시

### 3.6.1 Sequence Header 출력 예시

64×64 샘플 비트스트림의 Sequence Header:

```
=== Sequence Header ===
Profile:            Main (0)
Level:              2.0
Max Frame Size:     64×64
Superblock Size:    64×64

Bit Depth:          8
Color Primaries:    BT.709 (1)
Transfer:           BT.709 (1)
Matrix:             BT.709 (1)
Subsampling:        4:2:0
Chroma Position:    COLOCATED

Tools:
  CDEF:             enabled
  Loop Restoration: enabled
  Filter Intra:     disabled
  Warped Motion:    disabled
  Film Grain:       disabled
```

### 3.6.2 타일/슈퍼블록 그리드 시각화

```
1920×1080 프레임, 64×64 SB, 2×2 타일:

     Tile 0 (15 SB)     │     Tile 1 (15 SB)
  ┌────┬────┬...┬────┐ │ ┌────┬────┬...┬────┐
  │ SB │ SB │   │ SB │ │ │ SB │ SB │   │ SB │
  ├────┼────┼...┼────┤ │ ├────┼────┼...┼────┤
  │    │    │   │    │ │ │    │    │   │    │
  │    (8 rows)       │ │ │    (8 rows)       │
  └────┴────┴...┴────┘ │ └────┴────┴...┴────┘
  ─────────────────────┼─────────────────────
     Tile 2 (15 SB)     │     Tile 3 (15 SB)
  ┌────┬────┬...┬────┐ │ ┌────┬────┬...┬────┐
  │ SB │ SB │   │ SB │ │ │ SB │ SB │   │ SB │
  ├────┼────┼...┼────┤ │ ├────┼────┼...┼────┤
  │    (9 rows)       │ │ │    (9 rows)       │
  └────┴────┴...┴────┘ │ └────┴────┴...┴────┘

  총 SB: 30 × 17 = 510개
```

## 정리

- **Sequence Header**는 시퀀스 전역 설정을 담는다 (프로파일, 도구 플래그, 색 공간)
- **Color Config**은 올바른 색 재현에 필수적이다
- **타일**은 병렬 디코딩을 위한 독립적인 단위다
- **슈퍼블록**은 64×64 또는 128×128의 기본 처리 단위다
- **MI 단위**(4×4 픽셀)는 블록 좌표의 기본 단위다
- AV1은 24가지 블록 크기를 지원한다

## 다음 장 예고

Ch 4에서는 블록 파티셔닝을 다룬다. 슈퍼블록을 재귀적으로 분할하는 10가지 파티션 모드의 구조와 의미를 살펴본다.

## 관련 항목

- [Ch 2: 비트스트림 구조](/blog/media/av1/chapter02-bitstream/00-overview)
- [Ch 4: 블록 파티셔닝](/blog/media/av1/chapter04-partitioning)
