---
title: "Ch 21: Superres와 Scalability"
date: 2025-10-01T22:00:00
description: "AV1의 Superres와 Scalability — 인루프 업스케일링, Temporal/Spatial Scalability, Decoder Model."
tags: [AV1, Video, Codec, Superres, Scalability, SVC]
series: "AV1"
seriesOrder: 21
draft: true
---

이번 장에서는 AV1의 **Superres**(초해상도)와 **Scalability**(확장성) 기능을 살펴본다. Superres는 인코딩 시 해상도를 낮추고 디코딩 시 업스케일링하여 압축 효율을 높이는 기법이다. Scalability는 하나의 비트스트림에서 여러 프레임레이트나 해상도를 추출할 수 있게 하는 계층적 코딩 기법이다.

---

## 21.1 Superres 개념

### 21.1.1 왜 Superres가 필요한가?

영상 압축에서 **고주파 디테일**은 비트를 많이 소모한다. 특히 낮은 비트레이트에서는 고주파 정보를 충실히 유지하기 어렵고, 무리하게 유지하면 다른 부분의 품질이 떨어진다.

```
┌─────────────────────────────────────────────────────────────┐
│  고해상도 원본                                               │
│  ┌─────────────────────────────┐                            │
│  │ 고주파 디테일 풍부           │                            │
│  │ (머리카락, 질감, 에지)       │                            │
│  └─────────────────────────────┘                            │
│              │                                              │
│              ▼ 낮은 비트레이트 인코딩                        │
│  ┌─────────────────────────────┐                            │
│  │ 방법 1: 고해상도 유지        │                            │
│  │ → 심한 블로킹, 링잉 발생     │                            │
│  └─────────────────────────────┘                            │
│  ┌─────────────────────────────┐                            │
│  │ 방법 2: 해상도 낮춤(Superres)│                            │
│  │ → 더 많은 비트/픽셀         │                            │
│  │ → 저주파 품질 유지          │                            │
│  └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

Superres의 핵심 아이디어:

1. **인코딩 시**: 원본을 **수평으로만** 다운스케일
2. **압축**: 낮아진 해상도로 더 높은 품질 유지
3. **디코딩 시**: **인루프(In-Loop)** 업스케일링으로 원래 해상도 복원
4. **결과**: 같은 비트레이트에서 **더 나은 시각적 품질**

### 21.1.2 수평 전용 스케일링 이유

왜 수평으로만 스케일링하는가?

```
해상도 축소 방식 비교:

1. 양방향 축소 (사용 안 함)
   ┌────────────────┐      ┌────────┐
   │                │  →   │        │
   │  1920×1080     │      │  960   │
   │                │      │  ×540  │
   └────────────────┘      └────────┘
   문제: 수직 디테일 손실, 인터레이스 호환성

2. 수평 전용 축소 (Superres)
   ┌────────────────┐      ┌────────────┐
   │                │  →   │            │
   │  1920×1080     │      │ 1280×1080  │
   │                │      │            │
   └────────────────┘      └────────────┘
   장점: 수직 해상도 유지, 텍스트 가독성
```

수평 전용의 장점:

| 측면 | 설명 |
|------|------|
| 인터레이스 호환 | 수직 라인 수 유지로 필드 기반 콘텐츠 대응 |
| 텍스트 가독성 | 수평 스트로크보다 수직 스트로크가 중요 |
| Motion Estimation | 수직 해상도 유지로 움직임 예측 정확도 보존 |
| 구현 단순성 | 1차원 필터만 필요 |

### 21.1.3 스펙 참조

**AV1 스펙 섹션 5.9.15** (Frame Size with Refs):
```
use_superres                        f(1)
if (use_superres) {
    coded_denom                     f(SUPERRES_DENOM_BITS)
}
```

**AV1 스펙 섹션 7.12** (Upscaling Process):
- `superres_denom`: 9 ~ 16 범위
- 스케일 비율: 8 / superres_denom
- 9이면 8/9 ≈ 88.9%, 16이면 8/16 = 50%

---

## 21.2 Superres 파라미터

### 21.2.1 superres_denom 값

```cpp
// Superres denominator 범위
// 스펙: SUPERRES_DENOM_MIN = 9, SUPERRES_DENOM_MAX = 16
// 비율 = 8 / superres_denom

struct SuperresConfig {
    bool use_superres;
    int superres_denom;  // 9 ~ 16, 또는 8 (비활성화)

    float get_scale_ratio() const {
        return 8.0f / superres_denom;
    }

    int get_downscaled_width(int original_width) const {
        // 스펙: downscaled_width = (original_width * 8 + denom/2) / denom
        return (original_width * 8 + superres_denom / 2) / superres_denom;
    }
};
```

스케일 비율 테이블:

| superres_denom | 비율 | 예시 (1920px) | 축소폭 |
|----------------|------|---------------|--------|
| 8 (비활성화) | 100% | 1920 | 0 |
| 9 | 88.9% | 1707 | -11.1% |
| 10 | 80% | 1536 | -20% |
| 11 | 72.7% | 1396 | -27.3% |
| 12 | 66.7% | 1280 | -33.3% |
| 13 | 61.5% | 1181 | -38.5% |
| 14 | 57.1% | 1097 | -42.9% |
| 15 | 53.3% | 1024 | -46.7% |
| 16 | 50% | 960 | -50% |

### 21.2.2 업스케일 필터

디코딩 시 업스케일링은 **8-tap Lanczos-like 필터**를 사용한다.

```cpp
// 스펙: Section 7.12.1 Upscaling Filter Selection
// 16개 위상(phase)에 대해 각각 8-tap 필터 계수

const int16_t upscale_filter[16][8] = {
    { 0,   0, 128,   0,   0,   0, 0,  0 },  // phase 0
    { 0,  -1, 128,   2,  -1,   0, 0,  0 },  // phase 1
    { 0,  -3, 127,   5,  -2,   1, 0,  0 },  // phase 2
    { 0,  -4, 126,   8,  -3,   1, 0,  0 },  // phase 3
    { 0,  -5, 124,  12,  -4,   1, 0,  0 },  // phase 4
    { 0,  -6, 122,  15,  -5,   2, 0,  0 },  // phase 5
    { 0,  -7, 119,  19,  -6,   2, 1,  0 },  // phase 6
    { 0,  -7, 116,  23,  -7,   3, 0,  0 },  // phase 7
    { 0,  -8, 112,  28,  -8,   4, 0,  0 },  // phase 8
    { 0,  -8, 108,  32,  -8,   4, 0,  0 },  // phase 9
    { 0,  -8, 104,  37,  -9,   5, -1, 0 },  // phase 10
    { 0,  -8,  99,  42, -10,   6, -1, 0 },  // phase 11
    { 0,  -8,  94,  47, -10,   6, -1, 0 },  // phase 12
    { 0,  -8,  89,  52, -11,   7, -1, 0 },  // phase 13
    { 0,  -8,  84,  57, -11,   7, -1, 0 },  // phase 14
    { 0,  -7,  78,  62, -11,   7, -1, 0 },  // phase 15
};

// 업스케일 수행
void upscale_plane(const uint8_t* src, int src_width, int src_height,
                   uint8_t* dst, int dst_width,
                   int superres_denom) {
    // 각 출력 픽셀 위치에서 필터 적용
    int scale = (src_width << 14) / dst_width;  // 고정소수점

    for (int y = 0; y < src_height; y++) {
        int src_x_fp = 0;  // 고정소수점 소스 좌표

        for (int dst_x = 0; dst_x < dst_width; dst_x++) {
            int src_x = src_x_fp >> 14;  // 정수 부분
            int phase = (src_x_fp >> 10) & 0xF;  // 소수점 4비트 → 위상

            // 8-tap 필터 적용
            int sum = 0;
            for (int k = 0; k < 8; k++) {
                int sx = clamp(src_x + k - 3, 0, src_width - 1);
                sum += src[y * src_width + sx] * upscale_filter[phase][k];
            }

            dst[y * dst_width + dst_x] = clamp((sum + 64) >> 7, 0, 255);
            src_x_fp += scale;
        }
    }
}
```

### 21.2.3 인루프 vs 포스트 프로세싱

Superres 업스케일링은 **인루프(In-Loop)**에서 수행된다.

```
┌─────────────────────────────────────────────────────────────┐
│  일반적인 포스트 프로세싱 업스케일                           │
│                                                             │
│  Decode → Output (낮은 해상도) → 외부 업스케일              │
│  ↓                              │                           │
│  Reference Frame (낮은 해상도)   │                           │
│                                  │                           │
│  문제: 참조 프레임과 출력의 해상도 불일치                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AV1 Superres 인루프 업스케일                               │
│                                                             │
│  Decode → Superres Upscale → Loop Filter → Output          │
│                            ↓                                │
│                   Reference Frame (원래 해상도)              │
│                                                             │
│  장점: 참조 프레임도 업스케일된 해상도                       │
└─────────────────────────────────────────────────────────────┘
```

인루프 위치:

```
Inverse Transform
       │
       ▼
 Reconstruction (축소된 해상도)
       │
       ▼
 ┌─────────────────┐
 │  SUPERRES       │  ← 여기서 업스케일
 │  UPSCALE        │
 └─────────────────┘
       │
       ▼
 CDEF (원래 해상도)
       │
       ▼
 Loop Restoration
       │
       ▼
 Reference Frame / Output
```

---

## 21.3 Temporal Scalability

### 21.3.1 기본 개념

**Temporal Scalability**는 하나의 비트스트림에서 **여러 프레임레이트**를 추출할 수 있게 한다.

```
┌─────────────────────────────────────────────────────────────┐
│  60fps 비트스트림                                           │
│                                                             │
│  T2: ·   ·   ·   ·   ·   ·   ·   ·   (60fps 전용)          │
│  T1: ·       ·       ·       ·       (30fps까지 필요)       │
│  T0: ·               ·               (15fps 베이스)         │
│      ─────────────────────────────────►                    │
│      0   1   2   3   4   5   6   7    시간                  │
│                                                             │
│  디코더가 temporal_id에 따라 선택적 디코딩:                  │
│  - temporal_id ≤ 0: 15fps (T0만)                           │
│  - temporal_id ≤ 1: 30fps (T0 + T1)                        │
│  - temporal_id ≤ 2: 60fps (T0 + T1 + T2)                   │
└─────────────────────────────────────────────────────────────┘
```

### 21.3.2 temporal_id

**AV1 스펙 섹션 5.3.3** (OBU Header Extension):
```
obu_extension_flag                  f(1)
if (obu_extension_flag) {
    temporal_id                     f(3)
    spatial_id                      f(2)
    extension_header_reserved_3bits f(3)
}
```

```cpp
struct OBUHeader {
    int obu_type;
    bool obu_extension_flag;
    bool obu_has_size_field;

    // Extension header
    int temporal_id;   // 0~7, 현재 프레임의 시간 계층
    int spatial_id;    // 0~3, 현재 프레임의 공간 계층
};

// temporal_id 해석
// - 0: 베이스 레이어 (반드시 디코딩)
// - 1~7: 향상 레이어 (선택적 디코딩)
// - 높은 temporal_id 프레임은 낮은 것만 참조 가능
```

### 21.3.3 Dyadic 계층 구조

가장 일반적인 temporal scalability 패턴은 **Dyadic (2의 거듭제곱) 구조**이다.

```
GOP (Group of Pictures) = 8 프레임 예시

temporal_id = 0:  I─────────────────────────────P
                  0                             8

temporal_id = 1:  │           P                 │
                  │           4                 │

temporal_id = 2:  │     P           P           │
                  │     2           6           │

temporal_id = 3:  │  P     P     P     P        │
                  │  1     3     5     7        │

참조 관계:
- Frame 1 (T3): Frame 0, Frame 2 참조
- Frame 2 (T2): Frame 0, Frame 4 참조
- Frame 3 (T3): Frame 2, Frame 4 참조
- Frame 4 (T1): Frame 0, Frame 8 참조
- ...

규칙: temporal_id = N인 프레임은 temporal_id < N인 프레임만 참조
```

프레임별 temporal_id 배치:

| Frame | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|-------|---|---|---|---|---|---|---|---|---|
| temporal_id | 0 | 3 | 2 | 3 | 1 | 3 | 2 | 3 | 0 |
| 타입 | I | B | B | B | P | B | B | B | P |

### 21.3.4 부분 디코딩

디코더는 필요한 temporal_id까지만 디코딩할 수 있다.

```cpp
struct TemporalScalabilityDecoder {
    int max_temporal_id;  // 디코딩할 최대 temporal_id

    bool should_decode_frame(const OBUHeader& header) {
        // 현재 프레임의 temporal_id가 목표 이하면 디코딩
        return header.temporal_id <= max_temporal_id;
    }

    void set_target_framerate(int base_fps, int target_fps) {
        // 예: base=15fps, target=60fps
        // 60/15 = 4 = 2^2 → temporal_id = 2까지 필요
        int ratio = target_fps / base_fps;
        max_temporal_id = log2(ratio);
    }
};

// 사용 예
// 60fps 스트림에서 30fps만 디코딩
decoder.max_temporal_id = 1;  // T0, T1만 디코딩
// → 약 50% 비트스트림만 파싱/디코딩
```

---

## 21.4 Spatial Scalability

### 21.4.1 기본 개념

**Spatial Scalability**는 하나의 비트스트림에서 **여러 해상도**를 추출할 수 있게 한다.

```
┌─────────────────────────────────────────────────────────────┐
│  멀티 해상도 비트스트림                                      │
│                                                             │
│  spatial_id = 2: ┌─────────────────────────────────┐        │
│                  │     4K (3840×2160)              │        │
│                  │                                 │        │
│                  └─────────────────────────────────┘        │
│                                                             │
│  spatial_id = 1: ┌─────────────────┐                        │
│                  │  FHD (1920×1080)│                        │
│                  └─────────────────┘                        │
│                                                             │
│  spatial_id = 0: ┌────────┐                                 │
│                  │ 720p   │  베이스 레이어                   │
│                  └────────┘                                 │
│                                                             │
│  디코더가 spatial_id에 따라 선택적 디코딩:                   │
│  - spatial_id = 0: 720p만                                   │
│  - spatial_id ≤ 1: 720p + FHD                              │
│  - spatial_id ≤ 2: 720p + FHD + 4K                         │
└─────────────────────────────────────────────────────────────┘
```

### 21.4.2 Inter-layer Prediction

상위 해상도 레이어는 하위 레이어를 **업스케일하여 참조**할 수 있다.

```
spatial_id = 1 (FHD) 인코딩 시:

┌─────────────────┐
│ spatial_id = 0  │ (720p 재구성 프레임)
│ ┌─────────────┐ │
│ │   720p      │─┼─→ 업스케일 ─→ FHD 참조로 사용
│ └─────────────┘ │
└─────────────────┘
        │
        ▼
┌─────────────────────────┐
│ spatial_id = 1 (FHD)    │
│ ┌─────────────────────┐ │
│ │   Current Frame     │ │
│ │   참조: 업스케일된  │ │
│ │   lower layer +     │ │
│ │   이전 FHD 프레임   │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

```cpp
// Inter-layer reference
struct SpatialScalabilityFrame {
    int spatial_id;
    int frame_width;
    int frame_height;

    // 참조 프레임 목록 구성
    void setup_reference_frames(DecoderState& state) {
        // 1. 같은 spatial_id의 이전 프레임 참조
        for (int i = 0; i < REFS_PER_FRAME; i++) {
            if (ref_frame[i].spatial_id == spatial_id) {
                add_reference(ref_frame[i]);
            }
        }

        // 2. 낮은 spatial_id의 현재 시점 프레임 (업스케일)
        if (spatial_id > 0) {
            Frame& lower = get_lower_layer_frame(state);
            Frame upscaled = upscale_frame(lower, frame_width, frame_height);
            add_inter_layer_reference(upscaled);
        }
    }
};
```

### 21.4.3 Operating Points

AV1은 **Operating Point**를 통해 시청 가능한 조합을 정의한다.

**AV1 스펙 섹션 5.5.1** (Sequence Header OBU):
```
operating_points_cnt_minus_1               f(5)
for (i = 0; i <= operating_points_cnt_minus_1; i++) {
    operating_point_idc[i]                 f(12)
    seq_level_idx[i]                       f(5)
    seq_tier[i]                            f(1)
    ...
}
```

```cpp
struct OperatingPoint {
    // operating_point_idc는 12비트:
    // - 하위 8비트: temporal_id 마스크
    // - 상위 4비트: spatial_id 마스크
    uint16_t operating_point_idc;

    int seq_level_idx;  // 레벨 (0~31)
    int seq_tier;       // 티어 (0: Main, 1: High)

    // 이 Operating Point가 특정 레이어를 포함하는지
    bool includes_temporal_layer(int tid) {
        return (operating_point_idc & (1 << tid)) != 0;
    }

    bool includes_spatial_layer(int sid) {
        return (operating_point_idc & (1 << (sid + 8))) != 0;
    }
};

// 예시: operating_point_idc = 0x30F
// - temporal mask: 0x0F = 0b00001111 → T0~T3 포함
// - spatial mask: 0x3 = 0b0011 → S0, S1 포함
// → 이 Operating Point는 S0+S1의 모든 temporal layer 포함
```

Operating Point 예시:

| OP Index | IDC | Spatial | Temporal | 해상도 | FPS |
|----------|-----|---------|----------|--------|-----|
| 0 | 0x101 | S0 | T0 | 720p | 15 |
| 1 | 0x10F | S0 | T0-T3 | 720p | 60 |
| 2 | 0x20F | S1 | T0-T3 | FHD | 60 |
| 3 | 0x30F | S0-S1 | T0-T3 | FHD | 60 |

---

## 21.5 Decoder Model

### 21.5.1 필요성

Scalable 비트스트림에서 디코더가 **어떤 레이어를 언제 디코딩해야 하는지**, **버퍼를 어떻게 관리해야 하는지** 정의가 필요하다.

**AV1 스펙 Annex E** (Decoder Model)에서 이를 정의한다.

### 21.5.2 Smoothing Buffer

```
┌─────────────────────────────────────────────────────────────┐
│  Decoder Model 구조                                         │
│                                                             │
│  비트스트림 ─→ [Smoothing Buffer] ─→ [Decoder] ─→ 출력     │
│                     │                   │                   │
│                     │                   │                   │
│              네트워크 지터 흡수     프레임 버퍼 관리        │
│              (CBR 스트림 변동)                              │
└─────────────────────────────────────────────────────────────┘
```

```cpp
// Decoder Model 파라미터
struct DecoderModelInfo {
    bool decoder_model_info_present_flag;

    int buffer_delay_length_minus_1;      // 버퍼 지연 길이 (비트)
    int num_units_in_decoding_tick;       // 디코딩 틱 단위
    int buffer_removal_time_length_minus_1;
    int frame_presentation_time_length_minus_1;
};

// 프레임별 타이밍 정보
struct FrameTimingInfo {
    uint32_t buffer_removal_time;    // 스무딩 버퍼에서 제거 시점
    uint32_t frame_presentation_time; // 화면 출력 시점
};
```

### 21.5.3 Hypothetical Reference Decoder (HRD)

HRD는 **가상의 기준 디코더**로, 비트스트림이 디코딩 가능한지 검증하는 데 사용한다.

```
HRD 모델:

1. 스무딩 버퍼 (Smoothing Buffer)
   - 네트워크 변동 흡수
   - 크기: operating_point별로 정의

2. 디코딩 버퍼 (Coded Picture Buffer)
   - 압축된 프레임 저장
   - 제거 시점: buffer_removal_time

3. 디코드된 픽처 버퍼 (Decoded Picture Buffer)
   - 재구성된 프레임 저장
   - 참조 프레임 관리
   - 출력 시점: frame_presentation_time
```

### 21.5.4 레벨별 제약

각 **Level**은 디코더 능력의 상한을 정의한다.

```cpp
// 스펙: Annex A (Profiles and Levels)
struct LevelConstraints {
    int max_pic_size;        // 최대 픽처 크기 (luma samples)
    int max_h_size;          // 최대 수평 해상도
    int max_v_size;          // 최대 수직 해상도
    float max_display_rate;  // 최대 디스플레이 레이트
    float max_decode_rate;   // 최대 디코드 레이트
    int max_header_rate;     // 최대 헤더 레이트
    int main_mbps;           // Main tier 비트레이트
    int high_mbps;           // High tier 비트레이트
    float main_cr;           // Main tier 압축률
    float high_cr;           // High tier 압축률
    int max_tiles;           // 최대 타일 수
    int max_tile_cols;       // 최대 타일 열 수
};

// 레벨 예시
// Level 5.1: 4K60 (Main: 40Mbps, High: 60Mbps)
// Level 6.0: 8K30 (Main: 60Mbps, High: 100Mbps)
```

주요 레벨:

| Level | 해상도 | FPS | Main Mbps | High Mbps |
|-------|--------|-----|-----------|-----------|
| 2.0 | 426×240 | 30 | 1.5 | - |
| 3.0 | 854×480 | 30 | 2.0 | - |
| 4.0 | 1920×1080 | 30 | 12 | 30 |
| 5.0 | 3840×2160 | 30 | 30 | 60 |
| 5.1 | 3840×2160 | 60 | 40 | 60 |
| 6.0 | 7680×4320 | 30 | 60 | 100 |

---

## 21.6 실제 활용

### 21.6.1 Superres 사용 시나리오

```cpp
// 인코더: 낮은 비트레이트에서 Superres 자동 결정
class SuperresEncoder {
public:
    void encode_frame(const Frame& input, int target_bitrate) {
        // 비트레이트가 낮을수록 더 공격적인 superres
        int superres_denom = compute_optimal_denom(input, target_bitrate);

        if (superres_denom > SUPERRES_DENOM_MIN) {
            // 수평 다운스케일
            Frame downscaled = horizontal_downscale(input, superres_denom);

            // 낮은 해상도로 인코딩 (더 높은 품질)
            encode_internal(downscaled, target_bitrate);

            // 헤더에 superres 정보 기록
            write_superres_params(superres_denom);
        } else {
            encode_internal(input, target_bitrate);
        }
    }

private:
    int compute_optimal_denom(const Frame& input, int bitrate) {
        // 경험적 공식: 비트레이트가 낮을수록 denom 증가
        float bits_per_pixel = (float)bitrate / (input.width * input.height * fps);

        if (bits_per_pixel > 0.1) return 8;   // Superres 불필요
        if (bits_per_pixel > 0.05) return 10;
        if (bits_per_pixel > 0.025) return 12;
        if (bits_per_pixel > 0.015) return 14;
        return 16;  // 최대 축소
    }
};
```

### 21.6.2 적응형 스트리밍과 Scalability

```
기존 ABR (Adaptive Bitrate):

품질 1: 720p  (별도 인코딩)
품질 2: 1080p (별도 인코딩)
품질 3: 4K    (별도 인코딩)

→ 3개의 독립 비트스트림, 중복 인코딩

AV1 Spatial Scalability:

단일 비트스트림:
├─ S0 (720p base)
├─ S1 (1080p, S0 참조)
└─ S2 (4K, S0+S1 참조)

→ 1개의 비트스트림, 계층적 참조로 중복 감소
→ 서버 스토리지 절약
→ 스트림 전환 시 끊김 없음 (같은 베이스 공유)
```

### 21.6.3 실시간 스트리밍 예시

```cpp
// 적응형 스트리밍 서버
class ScalableStreamServer {
    // 클라이언트 대역폭에 따라 레이어 선택
    void serve_client(Client& client) {
        int available_bandwidth = client.measure_bandwidth();

        // Operating Point 선택
        int op_index = select_operating_point(available_bandwidth);
        OperatingPoint& op = operating_points[op_index];

        // 해당 Operating Point에 포함된 레이어만 전송
        for (Frame& frame : bitstream) {
            if (op.includes_temporal_layer(frame.temporal_id) &&
                op.includes_spatial_layer(frame.spatial_id)) {
                send_frame(client, frame);
            }
        }
    }

    int select_operating_point(int bandwidth_kbps) {
        // 대역폭에 맞는 가장 높은 품질 선택
        for (int i = operating_points.size() - 1; i >= 0; i--) {
            if (operating_points[i].required_bitrate <= bandwidth_kbps) {
                return i;
            }
        }
        return 0;  // 최저 품질
    }
};
```

---

## 정리

1. **Superres**는 인코딩 시 **수평 축소**, 디코딩 시 **인루프 업스케일**로 낮은 비트레이트에서 품질을 개선한다.

2. **superres_denom**은 9~16 범위이며, 스케일 비율은 8/denom이다 (최소 50%, 최대 88.9%).

3. **Temporal Scalability**는 하나의 비트스트림에서 **여러 프레임레이트**를 추출할 수 있게 한다.

4. **Dyadic 구조**가 가장 일반적이며, 높은 temporal_id 프레임은 낮은 것만 참조한다.

5. **Spatial Scalability**는 하나의 비트스트림에서 **여러 해상도**를 추출할 수 있게 한다.

6. **Inter-layer Prediction**으로 상위 해상도가 하위 해상도를 업스케일하여 참조한다.

7. **Operating Point**는 디코딩 가능한 temporal/spatial 레이어 조합을 정의한다.

8. **Decoder Model**은 버퍼 관리와 타이밍을 정의하여 스트림의 디코딩 가능성을 보장한다.

---

## 다음 장 예고

Ch 22에서는 **Metadata OBU**를 다룬다. HDR, Timecode, ITU-T T.35 등 부가 정보의 구조와 활용을 살펴본다.

---

## 관련 항목

- [Ch 20: 타일과 병렬 디코딩](/blog/media/av1/part6-features/chapter20-tiles-parallel)
- [Ch 3: Sequence Header와 프레임 구조](/blog/media/av1/part2-bitstream/chapter03-sequence-header)
- [Ch 5: Frame Header 분석](/blog/media/av1/part2-bitstream/chapter05-frame-header)
- [AV1 Spec Section 5.9.15](https://aomediacodec.github.io/av1-spec/#frame-size-with-refs-syntax) — Frame Size with Refs
- [AV1 Spec Section 7.12](https://aomediacodec.github.io/av1-spec/#upscaling-process) — Upscaling Process
- [AV1 Spec Annex E](https://aomediacodec.github.io/av1-spec/#decoder-model) — Decoder Model
