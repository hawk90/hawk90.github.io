---
title: "Ch 22: Metadata OBU"
date: 2025-10-01T23:00:00
description: "AV1의 Metadata OBU — HDR CLL, MDCV, Scalability, ITU-T T.35, Timecode."
tags: [AV1, Video, Codec, Metadata, HDR]
series: "AV1"
seriesOrder: 22
draft: true
---

이번 장에서는 AV1의 **Metadata OBU**를 살펴본다. Metadata OBU는 비디오 데이터 자체가 아닌 **부가 정보**를 전달한다. HDR 디스플레이 정보, Scalability 구조, 타임코드 등이 이를 통해 전송된다.

---

## 22.0 배경 — HDR과 메타데이터의 필요성

### 22.0.1 SDR vs HDR

```
┌─────────────────────────────────────────────────────────────┐
│  SDR (Standard Dynamic Range)                               │
│  ┌─────────────────────────────────────────┐               │
│  │  밝기 범위: ~100 nits                    │               │
│  │  색 깊이: 8-bit (256단계)                │               │
│  │  한계: 실제 밝기 표현 불가               │               │
│  │  (햇빛 10만 nits, 촛불 12 nits)          │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  HDR (High Dynamic Range)                                   │
│  ┌─────────────────────────────────────────┐               │
│  │  밝기 범위: 1000~10000+ nits            │               │
│  │  색 깊이: 10-bit+ (1024+단계)           │               │
│  │  더 밝은 하이라이트, 더 깊은 암부        │               │
│  │  → 현실에 가까운 영상                   │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 22.0.2 왜 메타데이터가 필요한가

영상이 **어떤 디스플레이에서 마스터링되었는지** 알아야 올바르게 표시할 수 있다.

```
┌─────────────────────────────────────────────────────────────┐
│  HDR 콘텐츠 재생 시나리오                                    │
│                                                             │
│  마스터링 디스플레이: 4000 nits                              │
│  시청자 디스플레이: 1000 nits                                │
│                                                             │
│  문제: 4000 nits 영상을 1000 nits에서 어떻게?               │
│                                                             │
│  해결: 톤 매핑 (Tone Mapping)                               │
│  ┌─────────────────────┐     ┌─────────────────────┐       │
│  │ 원본 (0~4000 nits)  │ →   │ 매핑 (0~1000 nits)  │       │
│  │ max_cll = 4000      │     │ 밝기 범위 압축      │       │
│  └─────────────────────┘     └─────────────────────┘       │
│                                                             │
│  톤 매핑의 기준 = 메타데이터                                │
│  - max_cll: 콘텐츠 최대 밝기                                │
│  - MDCV: 마스터링 디스플레이 정보                           │
└─────────────────────────────────────────────────────────────┘
```

비유: 사진의 **EXIF 데이터**와 같다. 사진 자체는 아니지만, 올바르게 보려면 필요한 정보다.

---

## 22.1 Metadata OBU 구조

### 22.1.1 기본 형식

**AV1 스펙 섹션 5.8.1** (Metadata OBU Syntax):
```
metadata_obu() {
    metadata_type                       leb128()
    if (metadata_type == METADATA_TYPE_HDR_CLL)
        metadata_hdr_cll()
    else if (metadata_type == METADATA_TYPE_HDR_MDCV)
        metadata_hdr_mdcv()
    else if (metadata_type == METADATA_TYPE_SCALABILITY)
        metadata_scalability()
    else if (metadata_type == METADATA_TYPE_ITUT_T35)
        metadata_itut_t35()
    else if (metadata_type == METADATA_TYPE_TIMECODE)
        metadata_timecode()
}
```

### 22.1.2 metadata_type 값

```cpp
enum MetadataType {
    METADATA_TYPE_HDR_CLL     = 1,  // HDR Content Light Level
    METADATA_TYPE_HDR_MDCV    = 2,  // HDR Mastering Display Color Volume
    METADATA_TYPE_SCALABILITY = 3,  // Scalability 구조 정의
    METADATA_TYPE_ITUT_T35    = 4,  // ITU-T T.35 (국가별 정의)
    METADATA_TYPE_TIMECODE    = 5,  // SMPTE 타임코드
    // 6~31: 예약
    // 32+: 사용자 정의 가능
};
```

### 22.1.3 파싱 구조

```cpp
struct MetadataOBU {
    uint32_t metadata_type;  // leb128으로 읽음

    union {
        HDRContentLightLevel hdr_cll;
        HDRMasteringDisplayColorVolume hdr_mdcv;
        ScalabilityMetadata scalability;
        ITUT_T35Payload itut_t35;
        TimecodeMetadata timecode;
    } payload;
};

void parse_metadata_obu(BitReader& br, MetadataOBU& meta) {
    meta.metadata_type = read_leb128(br);

    switch (meta.metadata_type) {
        case METADATA_TYPE_HDR_CLL:
            parse_hdr_cll(br, meta.payload.hdr_cll);
            break;
        case METADATA_TYPE_HDR_MDCV:
            parse_hdr_mdcv(br, meta.payload.hdr_mdcv);
            break;
        case METADATA_TYPE_SCALABILITY:
            parse_scalability(br, meta.payload.scalability);
            break;
        case METADATA_TYPE_ITUT_T35:
            parse_itut_t35(br, meta.payload.itut_t35);
            break;
        case METADATA_TYPE_TIMECODE:
            parse_timecode(br, meta.payload.timecode);
            break;
        default:
            skip_unknown_metadata(br);
            break;
    }
}
```

---

## 22.2 HDR Content Light Level (CLL)

### 22.2.1 목적

**Content Light Level**은 콘텐츠의 **밝기 범위**를 정의한다. 디스플레이가 톤 매핑할 때 기준으로 사용한다.

**AV1 스펙 섹션 5.8.2** (metadata_hdr_cll):
```
metadata_hdr_cll() {
    max_cll                             f(16)
    max_fall                            f(16)
}
```

### 22.2.2 필드 설명

```cpp
struct HDRContentLightLevel {
    uint16_t max_cll;   // Maximum Content Light Level (nits)
    uint16_t max_fall;  // Maximum Frame-Average Light Level (nits)
};
```

| 필드 | 설명 |
|------|------|
| max_cll | 전체 비디오에서 **가장 밝은 픽셀**의 휘도 (cd/m²) |
| max_fall | **프레임 평균 휘도**의 최대값 (cd/m²) |

### 22.2.3 값 예시

```
일반적인 HDR 콘텐츠:
┌────────────────────────────────────────┐
│ max_cll = 1000                         │
│ max_fall = 400                         │
│                                        │
│ 의미:                                  │
│ - 가장 밝은 픽셀: 1000 nits           │
│ - 프레임 평균 최대: 400 nits          │
└────────────────────────────────────────┘

영화 (HDR10):
┌────────────────────────────────────────┐
│ max_cll = 4000                         │
│ max_fall = 1000                        │
│                                        │
│ 의미:                                  │
│ - 하이라이트(폭발 등): 4000 nits      │
│ - 평균 장면: 최대 1000 nits           │
└────────────────────────────────────────┘
```

### 22.2.4 톤 매핑에서의 사용

```cpp
// 디스플레이의 톤 매핑 로직 (개념적)
void apply_tone_mapping(Frame& frame, const HDRContentLightLevel& cll,
                        int display_max_nits) {
    // 콘텐츠 밝기가 디스플레이 능력 초과 시 압축
    if (cll.max_cll > display_max_nits) {
        float compression_ratio = (float)display_max_nits / cll.max_cll;

        for (int y = 0; y < frame.height; y++) {
            for (int x = 0; x < frame.width; x++) {
                // 비선형 압축 (S-curve 등)
                frame[y][x].luminance = tone_curve(
                    frame[y][x].luminance,
                    cll.max_cll,
                    display_max_nits
                );
            }
        }
    }
}
```

---

## 22.3 HDR Mastering Display Color Volume (MDCV)

### 22.3.1 목적

**MDCV**는 콘텐츠가 **마스터링된 디스플레이의 특성**을 정의한다. 시청 디스플레이가 원본의 의도를 재현하는 데 사용한다.

**AV1 스펙 섹션 5.8.3** (metadata_hdr_mdcv):
```
metadata_hdr_mdcv() {
    for (i = 0; i < 3; i++) {
        primary_chromaticity_x[i]       f(16)
        primary_chromaticity_y[i]       f(16)
    }
    white_point_chromaticity_x          f(16)
    white_point_chromaticity_y          f(16)
    luminance_max                       f(32)
    luminance_min                       f(32)
}
```

### 22.3.2 필드 설명

```cpp
struct HDRMasteringDisplayColorVolume {
    // CIE 1931 xy 좌표계, 0.00002 단위 (16-bit)
    uint16_t primary_chromaticity_x[3];  // RGB 원색의 x 좌표
    uint16_t primary_chromaticity_y[3];  // RGB 원색의 y 좌표

    uint16_t white_point_x;  // 백색점 x 좌표
    uint16_t white_point_y;  // 백색점 y 좌표

    // 0.0001 nits 단위 (32-bit)
    uint32_t luminance_max;  // 최대 휘도
    uint32_t luminance_min;  // 최소 휘도
};

// 실제 값으로 변환
float get_chromaticity(uint16_t value) {
    return value * 0.00002f;  // 0~1.31070 범위
}

float get_luminance(uint32_t value) {
    return value * 0.0001f;  // nits 단위
}
```

### 22.3.3 색좌표 시스템

```
CIE 1931 색도 다이어그램:

        y
    0.9 │
        │     ╭─────╮
    0.7 │   ╭╯       ╰╮   ← 가시광 영역
        │  │   [G]     │
    0.5 │  │           │
        │   ╲         ╱
    0.3 │    ╲ [W]   ╱
        │     ╲     ╱
    0.1 │  [B] ╲   ╱ [R]
        └────────────────→ x
           0.1  0.3  0.5  0.7

[R] Red Primary (예: x=0.680, y=0.320)
[G] Green Primary (예: x=0.265, y=0.690)
[B] Blue Primary (예: x=0.150, y=0.060)
[W] White Point (예: x=0.3127, y=0.3290 = D65)
```

### 22.3.4 SMPTE ST 2086 호환

MDCV는 **SMPTE ST 2086** 표준과 대응한다.

| AV1 필드 | ST 2086 필드 | 예시 값 |
|----------|-------------|---------|
| primary_chromaticity_x[0] | display_primaries_r_x | 34000 (0.680) |
| primary_chromaticity_y[0] | display_primaries_r_y | 16000 (0.320) |
| primary_chromaticity_x[1] | display_primaries_g_x | 13250 (0.265) |
| primary_chromaticity_y[1] | display_primaries_g_y | 34500 (0.690) |
| primary_chromaticity_x[2] | display_primaries_b_x | 7500 (0.150) |
| primary_chromaticity_y[2] | display_primaries_b_y | 3000 (0.060) |
| white_point_x | white_point_x | 15635 (0.3127) |
| white_point_y | white_point_y | 16450 (0.3290) |
| luminance_max | max_display_mastering_luminance | 10000000 (1000 nits) |
| luminance_min | min_display_mastering_luminance | 50 (0.005 nits) |

### 22.3.5 색역 매핑

```cpp
// 마스터링 색역이 디스플레이 색역과 다를 때
void apply_gamut_mapping(Frame& frame,
                         const HDRMasteringDisplayColorVolume& master,
                         const DisplayColorVolume& display) {
    // 1. 마스터링 원색 → XYZ 변환 행렬 계산
    Matrix3x3 master_to_xyz = compute_rgb_to_xyz_matrix(
        master.primary_chromaticity_x,
        master.primary_chromaticity_y,
        master.white_point_x,
        master.white_point_y
    );

    // 2. XYZ → 디스플레이 원색 변환 행렬 계산
    Matrix3x3 xyz_to_display = compute_xyz_to_rgb_matrix(
        display.primary_chromaticity_x,
        display.primary_chromaticity_y,
        display.white_point_x,
        display.white_point_y
    );

    // 3. 전체 변환 행렬
    Matrix3x3 transform = xyz_to_display * master_to_xyz;

    // 4. 프레임 적용
    for (int y = 0; y < frame.height; y++) {
        for (int x = 0; x < frame.width; x++) {
            frame[y][x].rgb = transform * frame[y][x].rgb;
            // 색역 외 값은 클램프 또는 압축
        }
    }
}
```

---

## 22.4 Scalability Metadata

### 22.4.1 목적

**Scalability Metadata**는 비트스트림의 **계층적 구조**를 정의한다. 디코더가 어떤 레이어 조합이 가능한지 파악하는 데 사용한다.

**AV1 스펙 섹션 5.8.4** (metadata_scalability):
```
metadata_scalability() {
    scalability_mode_idc                f(8)
    if (scalability_mode_idc == SCALABILITY_SS)
        scalability_structure()
}
```

### 22.4.2 사전 정의 모드

```cpp
enum ScalabilityModeIdc {
    SCALABILITY_L1T2 = 0,   // 1 spatial, 2 temporal
    SCALABILITY_L1T3 = 1,   // 1 spatial, 3 temporal
    SCALABILITY_L2T1 = 2,   // 2 spatial, 1 temporal
    SCALABILITY_L2T2 = 3,   // 2 spatial, 2 temporal
    SCALABILITY_L2T3 = 4,   // 2 spatial, 3 temporal
    SCALABILITY_S2T1 = 5,   // 2 simulcast, 1 temporal
    SCALABILITY_S2T2 = 6,   // 2 simulcast, 2 temporal
    SCALABILITY_S2T3 = 7,   // 2 simulcast, 3 temporal
    SCALABILITY_L2T1h = 8,  // 2 spatial (1.5x), 1 temporal
    SCALABILITY_L2T2h = 9,  // 2 spatial (1.5x), 2 temporal
    SCALABILITY_L2T3h = 10, // 2 spatial (1.5x), 3 temporal
    SCALABILITY_S2T1h = 11, // 2 simulcast (1.5x), 1 temporal
    SCALABILITY_S2T2h = 12, // 2 simulcast (1.5x), 2 temporal
    SCALABILITY_S2T3h = 13, // 2 simulcast (1.5x), 3 temporal
    SCALABILITY_SS    = 14, // 사용자 정의 구조
    SCALABILITY_L3T1  = 15, // 3 spatial, 1 temporal
    SCALABILITY_L3T2  = 16, // 3 spatial, 2 temporal
    SCALABILITY_L3T3  = 17, // 3 spatial, 3 temporal
    // ...
};
```

모드별 구조:

| 모드 | Spatial | Temporal | 용도 |
|------|---------|----------|------|
| L1T2 | 1 | 2 | 30/60fps 전환 |
| L1T3 | 1 | 3 | 15/30/60fps 전환 |
| L2T1 | 2 | 1 | 720p/1080p 전환 |
| L2T3 | 2 | 3 | 720p/1080p × 15/30/60fps |
| L3T3 | 3 | 3 | 720p/1080p/4K × 15/30/60fps |
| S2T1 | 2 simulcast | 1 | 독립 해상도 (참조 없음) |

### 22.4.3 사용자 정의 구조 (SCALABILITY_SS)

```cpp
// scalability_mode_idc == SCALABILITY_SS일 때 추가 파싱
struct ScalabilityStructure {
    int spatial_layers_cnt_minus_1;   // 공간 레이어 수 - 1
    bool spatial_layer_dimensions_present_flag;
    bool spatial_layer_description_present_flag;
    bool temporal_group_description_present_flag;
    int scalability_structure_reserved_3bits;

    // 각 공간 레이어의 해상도
    int spatial_layer_max_width[4];
    int spatial_layer_max_height[4];

    // 시간 그룹 정보
    int temporal_group_size;
    struct TemporalGroupFrame {
        int temporal_id;
        bool temporal_switching_up_point_flag;
        bool spatial_switching_up_point_flag;
        int ref_cnt;
        int ref_pic_diff[7];
    } temporal_group[256];
};

void parse_scalability_structure(BitReader& br, ScalabilityStructure& ss) {
    ss.spatial_layers_cnt_minus_1 = br.read_bits(2);
    ss.spatial_layer_dimensions_present_flag = br.read_bit();
    // ...

    if (ss.spatial_layer_dimensions_present_flag) {
        for (int i = 0; i <= ss.spatial_layers_cnt_minus_1; i++) {
            ss.spatial_layer_max_width[i] = br.read_bits(16);
            ss.spatial_layer_max_height[i] = br.read_bits(16);
        }
    }
}
```

---

## 22.5 ITU-T T.35 Payload

### 22.5.1 목적

**ITU-T T.35**는 **국가별 정의 데이터**를 전달하는 범용 메커니즘이다. HDR10+ 동적 메타데이터도 이 경로로 전송된다.

**AV1 스펙 섹션 5.8.5** (metadata_itut_t35):
```
metadata_itut_t35() {
    itu_t_t35_country_code              f(8)
    if (itu_t_t35_country_code == 0xFF)
        itu_t_t35_country_code_extension_byte    f(8)
    itu_t_t35_payload_bytes             // remaining bytes
}
```

### 22.5.2 국가 코드

```cpp
struct ITUT_T35Payload {
    uint8_t country_code;           // ITU-T T.35 국가 코드
    uint8_t country_code_extension; // country_code == 0xFF일 때

    std::vector<uint8_t> payload_bytes;  // 국가별 정의 데이터
};

// 주요 국가 코드
const uint8_t COUNTRY_USA = 0xB5;
const uint8_t COUNTRY_KOREA = 0x86;
const uint8_t COUNTRY_JAPAN = 0x6A;
```

### 22.5.3 용도 예시

| 국가 코드 | 용도 |
|-----------|------|
| 0xB5 (미국) | ATSC 방송 정보, HDR10+ 메타데이터 |
| 0x86 (한국) | KBS, SBS 등 방송사 식별 정보 |
| 0x6A (일본) | ISDB 방송 정보 |

### 22.5.4 HDR10+ 동적 메타데이터

**HDR10+**는 프레임별 동적 톤매핑 정보를 제공한다. ITU-T T.35를 통해 전송된다.

```cpp
// HDR10+ 식별
bool is_hdr10_plus(const ITUT_T35Payload& t35) {
    if (t35.country_code != 0xB5) return false;  // 미국

    // Provider Code 확인 (Samsung = 0x003C)
    if (t35.payload_bytes.size() < 4) return false;
    uint16_t provider_code = (t35.payload_bytes[0] << 8) | t35.payload_bytes[1];
    uint16_t provider_oriented_code = (t35.payload_bytes[2] << 8) | t35.payload_bytes[3];

    return provider_code == 0x003C && provider_oriented_code == 0x0001;
}

// HDR10+ 데이터 구조 (개념적)
struct HDR10PlusMetadata {
    // 프레임별 밝기 정보
    float targeted_system_display_maximum_luminance;

    // 장면별 톤 매핑 커브
    struct BezierCurve {
        float knee_point_x;
        float knee_point_y;
        float anchors[9];
    } tone_mapping_curve;

    // 색역 정보
    float maxscl[3];  // R, G, B 최대값
    float average_maxrgb;
};
```

HDR10 vs HDR10+ 비교:

| 특성 | HDR10 (Static) | HDR10+ (Dynamic) |
|------|----------------|------------------|
| 메타데이터 | 전체 영상 1회 | 프레임/장면별 |
| 톤 매핑 정확도 | 전체 영상 평균 기준 | 장면별 최적화 |
| 전송 위치 | MDCV + CLL | ITU-T T.35 |
| 복잡도 | 단순 | 디코더 지원 필요 |

---

## 22.6 Timecode Metadata

### 22.6.1 목적

**Timecode**는 비디오의 **시간 위치**를 SMPTE 12M 형식으로 기록한다. 편집 소프트웨어와 방송 자동화에서 사용된다.

**AV1 스펙 섹션 5.8.6** (metadata_timecode):
```
metadata_timecode() {
    counting_type                       f(5)
    full_timestamp_flag                 f(1)
    discontinuity_flag                  f(1)
    cnt_dropped_flag                    f(1)
    n_frames                            f(9)
    if (full_timestamp_flag) {
        seconds_value                   f(6)
        minutes_value                   f(6)
        hours_value                     f(5)
    } else {
        // 차분 정보
    }
    // ...
}
```

### 22.6.2 필드 설명

```cpp
struct TimecodeMetadata {
    int counting_type;         // 카운팅 모드
    bool full_timestamp_flag;  // 전체 타임코드 vs 차분
    bool discontinuity_flag;   // 불연속점 표시
    bool cnt_dropped_flag;     // Drop Frame 모드

    int n_frames;              // 초 내의 프레임 번호
    int seconds_value;         // 초 (0~59)
    int minutes_value;         // 분 (0~59)
    int hours_value;           // 시 (0~23)

    // 확장 정보 (optional)
    int time_offset_value;     // 시간 오프셋
};

// counting_type 값
enum CountingType {
    COUNT_PROGRESSIVE = 0,     // 프로그레시브
    COUNT_INTERLACED_TOP = 1,  // 인터레이스 (상단 필드 우선)
    COUNT_INTERLACED_BOT = 2,  // 인터레이스 (하단 필드 우선)
    COUNT_DROP_FRAME = 4,      // 드롭 프레임
    // ...
};
```

### 22.6.3 Drop Frame Timecode

**29.97fps** (NTSC)에서는 실시간과 타임코드가 어긋난다. 이를 보정하기 위해 **Drop Frame**을 사용한다.

```
문제:
30fps 가정: 1분 = 30 × 60 = 1800 프레임
실제 29.97fps: 1분 = 29.97 × 60 ≈ 1798.2 프레임

1시간 후:
30fps 가정: 108000 프레임
실제: 107892 프레임
차이: 108 프레임 ≈ 3.6초

해결 (Drop Frame):
매 분마다 프레임 번호 0, 1을 건너뜀
(단, 10분 단위에서는 건너뛰지 않음)

예시:
00:00:59;28
00:00:59;29
00:01:00;02  ← 00, 01 건너뜀
00:01:00;03

00:09:59;28
00:09:59;29
00:10:00;00  ← 10분 단위는 건너뛰지 않음
00:10:00;01
```

```cpp
// Drop Frame 타임코드 계산
void frame_to_drop_frame_timecode(int total_frames, int& h, int& m, int& s, int& f) {
    // 29.97fps Drop Frame 계산
    const int FRAMES_PER_10_MIN = 17982;  // 10분당 프레임 수
    const int FRAMES_PER_1_MIN = 1798;    // 1분당 프레임 수 (드롭 적용 시)
    const int DROP_FRAMES = 2;            // 매 분 드롭되는 프레임 수

    int ten_min_blocks = total_frames / FRAMES_PER_10_MIN;
    int remaining = total_frames % FRAMES_PER_10_MIN;

    int minutes_in_block;
    if (remaining < 30) {
        minutes_in_block = 0;
    } else {
        minutes_in_block = 1 + (remaining - 30) / FRAMES_PER_1_MIN;
    }

    int total_minutes = ten_min_blocks * 10 + minutes_in_block;
    h = total_minutes / 60;
    m = total_minutes % 60;

    // ... (상세 계산)
}
```

### 22.6.4 용도

| 용도 | 설명 |
|------|------|
| 편집 소프트웨어 | 정확한 프레임 위치 지정 |
| 방송 자동화 | 광고 삽입, 프로그램 전환 시점 |
| 립싱크 | 오디오-비디오 동기화 검증 |
| 자막 | 타임스탬프 기반 자막 삽입 |

---

## 22.7 Metadata OBU 위치

### 22.7.1 비트스트림 내 위치

Metadata OBU는 비트스트림의 여러 위치에 올 수 있다.

```
┌─────────────────────────────────────────────────────────────┐
│  비트스트림 구조                                             │
│                                                             │
│  [Sequence Header OBU]                                      │
│  [Metadata OBU - MDCV]    ← 시퀀스 레벨 메타데이터          │
│  [Metadata OBU - CLL]     ← 시퀀스 레벨 메타데이터          │
│                                                             │
│  ─── Temporal Unit 1 ───                                    │
│  [Frame Header OBU]                                         │
│  [Metadata OBU - Timecode] ← 프레임 레벨 메타데이터         │
│  [Metadata OBU - T.35]     ← 프레임 레벨 (HDR10+ 등)        │
│  [Tile Group OBU]                                           │
│                                                             │
│  ─── Temporal Unit 2 ───                                    │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 22.7.2 메타데이터 유효 범위

| 타입 | 유효 범위 | 위치 |
|------|-----------|------|
| HDR_CLL | 전체 시퀀스 | Sequence Header 직후 |
| HDR_MDCV | 전체 시퀀스 | Sequence Header 직후 |
| SCALABILITY | 전체 시퀀스 | Sequence Header 직후 |
| ITUT_T35 | 해당 프레임 | Frame Header 부근 |
| TIMECODE | 해당 프레임 | Frame Header 부근 |

---

## 정리

1. **Metadata OBU**는 OBU 타입 5로, 비디오 데이터 외의 부가 정보를 전달한다.

2. **metadata_type**으로 메타데이터 종류를 구분한다 (CLL, MDCV, Scalability, T.35, Timecode).

3. **HDR CLL**은 콘텐츠의 최대 밝기(max_cll)와 프레임 평균 최대 밝기(max_fall)를 정의한다.

4. **HDR MDCV**는 마스터링 디스플레이의 색좌표와 휘도 범위를 정의한다 (SMPTE ST 2086 호환).

5. **Scalability Metadata**는 사전 정의된 확장성 모드(L2T3 등)나 사용자 정의 구조를 기술한다.

6. **ITU-T T.35**는 국가별 정의 데이터를 전달하며, HDR10+ 동적 메타데이터도 이 경로로 전송된다.

7. **Timecode**는 SMPTE 12M 호환 타임코드로, 29.97fps의 Drop Frame 처리를 지원한다.

8. 메타데이터의 유효 범위는 **시퀀스 레벨**(CLL, MDCV, Scalability)과 **프레임 레벨**(T.35, Timecode)로 구분된다.

---

## 다음 장 예고

Ch 23에서는 **Decoder Model**을 다룬다. 비트스트림이 디코더 자원 한계를 넘지 않음을 보증하는 적합성 모델의 상세를 살펴본다.

---

## 관련 항목

- [Ch 21: Superres와 Scalability](/blog/media/av1/part6-features/chapter21-superres-scalability)
- [Ch 3: Sequence Header와 프레임 구조](/blog/media/av1/part2-bitstream/chapter03-sequence-header)
- [AV1 Spec Section 5.8](https://aomediacodec.github.io/av1-spec/#metadata-obu-syntax) — Metadata OBU Syntax
- [SMPTE ST 2086](https://www.smpte.org/) — Mastering Display Color Volume
- [SMPTE 12M](https://www.smpte.org/) — Time and Control Code
