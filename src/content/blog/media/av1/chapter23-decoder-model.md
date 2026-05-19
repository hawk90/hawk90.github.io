---
title: "Ch 23: Decoder Model"
date: 2026-05-16T00:00:00
description: "AV1의 Decoder Model — Smoothing Buffer, Frame Buffer, 타이밍, Level 적합성 검증."
tags: [AV1, Video, Codec, Decoder Model, Conformance]
series: "AV1"
seriesOrder: 23
draft: true
---

이번 장에서는 AV1의 **Decoder Model**을 살펴본다. Decoder Model은 비트스트림이 **디코더의 자원 한계를 넘지 않음**을 수학적으로 보증하는 모델이다. 실시간 스트리밍과 하드웨어 디코더 설계에 필수적인 개념이다.

---

## 23.1 왜 Decoder Model이 필요한가

### 23.1.1 문제 상황

인코더가 무제한으로 비트를 생성하면 디코더에서 문제가 발생한다.

```
┌─────────────────────────────────────────────────────────────┐
│  문제 시나리오                                               │
│                                                             │
│  인코더 출력:                                               │
│  [Frame 1: 500KB] [Frame 2: 50KB] [Frame 3: 2MB] ...       │
│                                           ↑                 │
│                                      갑자기 큰 프레임       │
│                                                             │
│  디코더 상황:                                               │
│  ┌─────────────────────────┐                               │
│  │  입력 버퍼 (1MB 한계)   │ ← 2MB 프레임 도착             │
│  │  ████████████████████████│   → 오버플로우!              │
│  └─────────────────────────┘                               │
│                                                             │
│  결과:                                                      │
│  - 데이터 손실                                              │
│  - 재생 중단                                                │
│  - 화면 깨짐                                                │
└─────────────────────────────────────────────────────────────┘
```

### 23.1.2 해결 방안

**Decoder Model**은 수학적 모델로 비트스트림이 **특정 레벨의 디코더에서 재생 가능함**을 보증한다.

```
┌─────────────────────────────────────────────────────────────┐
│  Decoder Model의 역할                                       │
│                                                             │
│  인코더:                                                    │
│  "이 비트스트림은 Level 5.1 디코더에서 재생 가능합니다"     │
│           ↓                                                 │
│  Level 5.1 스펙:                                            │
│  - MaxPicSize: 8,912,896 samples                           │
│  - MaxDecodeRate: 534,773,760 samples/sec                  │
│  - MaxBitrate: 100 Mbps                                    │
│  - BufferSize: 레벨별 정의                                 │
│           ↓                                                 │
│  디코더:                                                    │
│  "Level 5.1 지원 → 이 비트스트림을 문제 없이 재생"         │
└─────────────────────────────────────────────────────────────┘
```

### 23.1.3 HRD와의 유사성

AV1 Decoder Model은 H.264/HEVC의 **HRD (Hypothetical Reference Decoder)**와 유사한 개념이다.

| 코덱 | 모델 이름 | 표준 위치 |
|------|-----------|-----------|
| H.264/AVC | HRD (Hypothetical Reference Decoder) | Annex C |
| H.265/HEVC | HRD | Annex C |
| AV1 | Decoder Model | Annex E |

**AV1 스펙 Annex E**에서 상세를 정의한다.

---

## 23.2 Smoothing Buffer Model

### 23.2.1 Leaky Bucket 모델

**Smoothing Buffer**는 **Leaky Bucket (새는 양동이)** 모델로 동작한다.

```
┌─────────────────────────────────────────────────────────────┐
│  Leaky Bucket 모델                                          │
│                                                             │
│      비트스트림 입력 (가변 비트레이트)                      │
│            │                                                │
│            ▼                                                │
│      ┌───────────┐                                          │
│      │           │  ← BufferSize (레벨별 상한)              │
│      │  ████████ │                                          │
│      │  ████████ │  ← 현재 버퍼 레벨 B(t)                   │
│      │  ████████ │                                          │
│      └─────┬─────┘                                          │
│            │                                                │
│            ▼  일정 속도로 출력 (디코딩)                     │
│                                                             │
│  조건:                                                      │
│  - B(t) >= 0       (언더플로우 금지 → 재생 중단)           │
│  - B(t) <= Size    (오버플로우 금지 → 데이터 손실)         │
└─────────────────────────────────────────────────────────────┘
```

### 23.2.2 버퍼 레벨 계산

**AV1 스펙 Annex E.2** (Smoothing Buffer Model):

```cpp
// 버퍼 레벨 변화
// B(t) = B(t-1) + bitrate × Δt - frame_size(t)

struct SmoothingBuffer {
    int64_t buffer_level;      // 현재 버퍼 레벨 (비트)
    int64_t buffer_size;       // 버퍼 크기 (비트)
    int64_t bitrate;           // 입력 비트레이트 (bps)

    // 프레임 도착 시 버퍼 업데이트
    bool on_frame_arrival(int64_t frame_size_bits, double delta_time) {
        // 시간 경과에 따른 비트 유입
        buffer_level += (int64_t)(bitrate * delta_time);

        // 버퍼 오버플로우 검사
        if (buffer_level > buffer_size) {
            // 오버플로우: 비적합 (non-conformant)
            return false;
        }

        // 프레임 제거
        buffer_level -= frame_size_bits;

        // 버퍼 언더플로우 검사
        if (buffer_level < 0) {
            // 언더플로우: 비적합
            return false;
        }

        return true;  // 적합 (conformant)
    }
};
```

### 23.2.3 두 가지 디코딩 모드

AV1 Decoder Model은 두 가지 동작 모드를 정의한다.

```
1. Decoding Schedule Mode (스케줄 기반)
┌─────────────────────────────────────────────────────────────┐
│  프레임 디코딩 시작 시점 = initial_delay + buffer_removal_time │
│                                                             │
│  시간 축:                                                    │
│  ──────────────────────────────────────────────────────►    │
│  │<── initial_delay ──>│                                    │
│  0                     │                                    │
│                        │<── buffer_removal_time ──>│        │
│                        └──────────────────────────►│        │
│                                                    디코딩    │
│                                                             │
│  용도: 라이브 스트리밍, 방송                                │
└─────────────────────────────────────────────────────────────┘

2. Resource Availability Mode (자원 가용성 기반)
┌─────────────────────────────────────────────────────────────┐
│  프레임 도착 즉시 디코딩 시작                               │
│                                                             │
│  시간 축:                                                    │
│  ──────────────────────────────────────────────────────►    │
│       │ 프레임 도착                                         │
│       └──► 즉시 디코딩 시작                                 │
│                                                             │
│  용도: 로컬 파일 재생, VoD                                  │
└─────────────────────────────────────────────────────────────┘
```

```cpp
enum DecoderModelMode {
    DECODING_SCHEDULE_MODE,      // 스케줄 기반
    RESOURCE_AVAILABILITY_MODE   // 자원 가용성 기반
};

struct DecoderModelParams {
    DecoderModelMode mode;

    // Decoding Schedule Mode 파라미터
    double initial_delay;        // 초기 지연 (초)

    // 공통 파라미터
    int64_t buffer_size;         // 스무딩 버퍼 크기
    int64_t max_bitrate;         // 최대 비트레이트
};
```

### 23.2.4 Sequence Header에서의 파라미터

**AV1 스펙 섹션 5.5.2** (decoder_model_info):

```cpp
struct DecoderModelInfo {
    bool decoder_model_info_present_flag;

    // 비트 필드 길이
    int buffer_delay_length_minus_1;              // 0~31
    int num_units_in_decoding_tick;               // 디코딩 틱 단위
    int buffer_removal_time_length_minus_1;       // 0~31
    int frame_presentation_time_length_minus_1;   // 0~31
};

// 파싱
void parse_decoder_model_info(BitReader& br, DecoderModelInfo& info) {
    info.buffer_delay_length_minus_1 = br.read_bits(5);
    info.num_units_in_decoding_tick = br.read_bits(32);
    info.buffer_removal_time_length_minus_1 = br.read_bits(5);
    info.frame_presentation_time_length_minus_1 = br.read_bits(5);
}
```

---

## 23.3 Frame Buffer Model

### 23.3.1 물리 프레임 버퍼

AV1은 **10개의 물리 프레임 버퍼**를 가정한다.

**AV1 스펙 Annex E.3** (Frame Buffer Model):

```
┌─────────────────────────────────────────────────────────────┐
│  10개 물리 프레임 버퍼                                       │
│                                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ VBI │ │ VBI │ │ VBI │ │ VBI │ │ VBI │ │ VBI │           │
│  │  0  │ │  1  │ │  2  │ │  3  │ │  4  │ │  5  │           │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│                                                             │
│  ┌─────┐ ┌─────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ VBI │ │ VBI │ │   현재       │ │   디스플레이  │         │
│  │  6  │ │  7  │ │   디코딩     │ │   출력 대기   │         │
│  └─────┘ └─────┘ └──────────────┘ └──────────────┘         │
│                                                             │
│  VBI (Virtual Buffer Index): 참조 프레임 저장용 (8개)       │
│  현재 디코딩: 디코딩 중인 프레임 (1개)                      │
│  디스플레이 출력: 화면 출력 대기 (1개)                      │
└─────────────────────────────────────────────────────────────┘
```

### 23.3.2 VBI (Virtual Buffer Index)

**VBI**는 8개의 참조 프레임 슬롯이다.

```cpp
struct FrameBufferModel {
    static const int NUM_REF_FRAMES = 8;
    static const int BUFFER_POOL_SIZE = 10;

    // 각 버퍼 슬롯의 상태
    struct BufferSlot {
        bool in_use;
        int order_hint;          // 프레임 순서 힌트
        bool is_reference;       // 참조로 사용 중
        bool awaiting_display;   // 디스플레이 대기 중
    };

    BufferSlot buffer_pool[BUFFER_POOL_SIZE];

    // 참조 프레임 매핑
    int ref_frame_idx[NUM_REF_FRAMES];  // VBI → buffer_pool 인덱스

    // 현재 디코딩 버퍼
    int current_frame_idx;

    // 디스플레이 대기 버퍼
    int display_frame_idx;
};
```

### 23.3.3 버퍼 할당과 해제

```
버퍼 할당 시점:
  - 프레임 디코딩 시작 시 빈 버퍼 할당

버퍼 해제 시점:
  - 프레임이 더 이상 참조되지 않음 AND
  - 디스플레이 출력 완료

제약 조건:
  - 동시 사용 버퍼 ≤ 10
```

```cpp
// 버퍼 할당
int allocate_buffer(FrameBufferModel& model) {
    for (int i = 0; i < BUFFER_POOL_SIZE; i++) {
        if (!model.buffer_pool[i].in_use) {
            model.buffer_pool[i].in_use = true;
            return i;
        }
    }
    return -1;  // 할당 실패 (버퍼 부족)
}

// 버퍼 해제 검사
void check_buffer_release(FrameBufferModel& model, int idx) {
    BufferSlot& slot = model.buffer_pool[idx];

    // 참조로 사용 중인지 확인
    bool is_referenced = false;
    for (int i = 0; i < NUM_REF_FRAMES; i++) {
        if (model.ref_frame_idx[i] == idx) {
            is_referenced = true;
            break;
        }
    }

    // 참조 없고, 디스플레이 완료면 해제
    if (!is_referenced && !slot.awaiting_display) {
        slot.in_use = false;
    }
}
```

### 23.3.4 참조 프레임 상태 추적

```cpp
// 참조 프레임 상태 (스펙 변수)
bool RefValid[NUM_REF_FRAMES];      // 유효한 참조 프레임
int RefOrderHint[NUM_REF_FRAMES];   // 각 참조의 순서 힌트

// 프레임 디코딩 후 참조 상태 업데이트
void update_reference_frames(FrameBufferModel& model,
                             int decoded_frame_idx,
                             int refresh_frame_flags) {
    // refresh_frame_flags: 8비트, 각 비트가 VBI 슬롯에 대응
    for (int i = 0; i < NUM_REF_FRAMES; i++) {
        if (refresh_frame_flags & (1 << i)) {
            // 이전 참조 버퍼 해제 검사
            if (RefValid[i]) {
                check_buffer_release(model, model.ref_frame_idx[i]);
            }

            // 새 참조로 업데이트
            model.ref_frame_idx[i] = decoded_frame_idx;
            RefValid[i] = true;
            RefOrderHint[i] = current_order_hint;
        }
    }
}
```

---

## 23.4 디코딩 타이밍

### 23.4.1 decode_time 계산

**AV1 스펙 Annex E.4** (Decoding Timing):

프레임 디코딩에 필요한 시간은 두 제약 중 **큰 값**으로 결정된다.

```
decode_time = max(
    luma_samples / MaxDecodeRate,    // 디코딩 능력 기반
    coded_bits / MaxBitrate          // 전송 속도 기반
)
```

```cpp
struct DecodingTiming {
    // 레벨별 제약
    int64_t max_decode_rate;  // samples/sec
    int64_t max_bitrate;      // bits/sec

    // 프레임 디코딩 시간 계산
    double compute_decode_time(int64_t luma_samples, int64_t coded_bits) {
        double decode_capacity_time = (double)luma_samples / max_decode_rate;
        double bitrate_time = (double)coded_bits / max_bitrate;
        return std::max(decode_capacity_time, bitrate_time);
    }
};

// 예시: Level 5.1
// MaxDecodeRate = 534,773,760 samples/sec
// MaxBitrate = 100,000,000 bits/sec (Main tier)
//
// 4K 프레임 (3840×2160 = 8,294,400 samples), 2MB (16,777,216 bits):
// decode_capacity_time = 8,294,400 / 534,773,760 ≈ 0.0155초
// bitrate_time = 16,777,216 / 100,000,000 = 0.168초
// decode_time = max(0.0155, 0.168) = 0.168초
```

### 23.4.2 presentation_time

**presentation_time**은 프레임이 화면에 표시되어야 하는 시점이다.

```
┌─────────────────────────────────────────────────────────────┐
│  타이밍 제약                                                │
│                                                             │
│  시간 축:                                                    │
│  ──────────────────────────────────────────────────────►    │
│                                                             │
│  ├──────────────────────────────────────────────────────┤   │
│  │              decode_time                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  디코딩 시작                               디코딩 완료      │
│                                               │             │
│                                               ▼             │
│                                          presentation_time  │
│                                                             │
│  제약:                                                      │
│  디코딩 완료 시점 ≤ presentation_time                       │
│  (디코딩이 표시보다 빨라야 함)                              │
└─────────────────────────────────────────────────────────────┘
```

```cpp
// 타이밍 검증
bool verify_timing(double decode_start, double decode_time,
                   double presentation_time) {
    double decode_end = decode_start + decode_time;

    // 디코딩 완료가 표시 시점 이전이어야 함
    return decode_end <= presentation_time;
}
```

### 23.4.3 가변 프레임레이트 (VFR)

AV1은 **가변 프레임레이트**를 지원한다.

```cpp
// Frame Header에서 frame_presentation_time 지정
// equal_picture_interval = 0일 때 사용

struct FrameTimingInfo {
    bool timing_info_present_flag;
    bool equal_picture_interval;     // 균등 간격 여부

    // 균등 간격일 때
    int num_ticks_per_picture_minus_1;

    // 가변 간격일 때 (프레임별)
    uint32_t frame_presentation_time;  // 각 프레임의 표시 시간
};

// VFR 예시: 24fps → 30fps → 60fps 전환
// 각 프레임에 개별 presentation_time 지정으로 가능
```

### 23.4.4 연속 프레임 제약

연속 프레임의 디코딩이 **겹치지 않아야** 한다.

```
Frame N:   [──── decode_time ────]
Frame N+1:                         [──── decode_time ────]
                                   ↑
                              Frame N 완료 후 시작
```

```cpp
// 연속 프레임 타이밍 검증
bool verify_sequential_decoding(const std::vector<FrameInfo>& frames) {
    double prev_decode_end = 0;

    for (const auto& frame : frames) {
        double decode_start = prev_decode_end;  // 이전 완료 후 시작
        double decode_end = decode_start + frame.decode_time;

        // 표시 시점 검증
        if (decode_end > frame.presentation_time) {
            return false;  // 비적합
        }

        prev_decode_end = decode_end;
    }
    return true;
}
```

---

## 23.5 Level 적합성 검사

### 23.5.1 레벨별 한계

**AV1 스펙 Annex A** (Profiles and Levels)에서 각 레벨의 한계를 정의한다.

| Level | MaxPicSize | MaxHSize | MaxVSize | MaxDecodeRate | Main Mbps | High Mbps |
|-------|-----------|----------|----------|---------------|-----------|-----------|
| 2.0 | 147,456 | 2048 | 1152 | 4,423,680 | 1.5 | - |
| 2.1 | 278,784 | 2816 | 1584 | 8,363,520 | 3.0 | - |
| 3.0 | 665,856 | 4352 | 2448 | 19,975,680 | 6.0 | - |
| 3.1 | 1,065,024 | 5504 | 3096 | 31,950,720 | 10.0 | - |
| 4.0 | 2,359,296 | 6144 | 3456 | 70,778,880 | 12.0 | 30.0 |
| 4.1 | 2,359,296 | 6144 | 3456 | 141,557,760 | 20.0 | 50.0 |
| 5.0 | 8,912,896 | 8192 | 4352 | 267,386,880 | 30.0 | 100.0 |
| 5.1 | 8,912,896 | 8192 | 4352 | 534,773,760 | 40.0 | 160.0 |
| 5.2 | 8,912,896 | 8192 | 4352 | 1,069,547,520 | 60.0 | 240.0 |
| 5.3 | 8,912,896 | 8192 | 4352 | 1,069,547,520 | 60.0 | 240.0 |
| 6.0 | 35,651,584 | 16384 | 8704 | 1,069,547,520 | 60.0 | 240.0 |
| 6.1 | 35,651,584 | 16384 | 8704 | 2,139,095,040 | 100.0 | 480.0 |
| 6.2 | 35,651,584 | 16384 | 8704 | 4,278,190,080 | 160.0 | 800.0 |
| 6.3 | 35,651,584 | 16384 | 8704 | 4,278,190,080 | 160.0 | 800.0 |

### 23.5.2 적합성 조건

비트스트림이 특정 레벨에 **적합(conformant)**하려면 모든 프레임에서 다음을 만족해야 한다.

```cpp
struct LevelConstraints {
    int64_t max_pic_size;      // 최대 픽처 크기 (luma samples)
    int max_h_size;            // 최대 수평 해상도
    int max_v_size;            // 최대 수직 해상도
    int64_t max_decode_rate;   // 최대 디코드 레이트
    int max_bitrate_main;      // Main tier 비트레이트 (Mbps)
    int max_bitrate_high;      // High tier 비트레이트 (Mbps)
    int max_tiles;             // 최대 타일 수
    int max_tile_cols;         // 최대 타일 열 수
};

bool check_level_conformance(const Bitstream& bs, const LevelConstraints& level) {
    for (const auto& frame : bs.frames) {
        // 1. 프레임 크기 검사
        int64_t pic_size = frame.width * frame.height;
        if (pic_size > level.max_pic_size) return false;

        // 2. 해상도 검사
        if (frame.width > level.max_h_size) return false;
        if (frame.height > level.max_v_size) return false;

        // 3. 디코딩 속도 검사
        // (1초간 디코딩되는 총 샘플 수 ≤ MaxDecodeRate)

        // 4. 비트레이트 검사 (순간 최대 = 1.5배 허용)
        if (frame.size_bits > level.max_bitrate * 1.5 / frame.fps) return false;

        // 5. 버퍼 검사
        // (스무딩 버퍼 오버플로우/언더플로우 없음)

        // 6. 참조 프레임 수 검사
        // (동시 참조 ≤ 버퍼 한계)

        // 7. 타일 수 검사
        if (frame.num_tiles > level.max_tiles) return false;
    }
    return true;
}
```

### 23.5.3 적합성 검증 도구

```bash
# aomenc로 적합성 검증
aomenc --test-decode=conformance input.y4m -o output.ivf

# dav1d로 검증
dav1d -i input.ivf -o /dev/null --verify

# aomdec으로 검증
aomdec --summary input.ivf
```

### 23.5.4 실제 레벨 선택 예시

```
┌────────────────────────────────────────────────────────────┐
│  콘텐츠별 권장 레벨                                        │
│                                                            │
│  720p30:   Level 3.0 (6 Mbps)                             │
│  1080p30:  Level 4.0 (12 Mbps Main, 30 Mbps High)         │
│  1080p60:  Level 4.1 (20 Mbps Main, 50 Mbps High)         │
│  4K30:     Level 5.0 (30 Mbps Main, 100 Mbps High)        │
│  4K60:     Level 5.1 (40 Mbps Main, 160 Mbps High)        │
│  8K30:     Level 6.0 (60 Mbps Main, 240 Mbps High)        │
│  8K60:     Level 6.1 (100 Mbps Main, 480 Mbps High)       │
└────────────────────────────────────────────────────────────┘
```

---

## 23.6 실전 적용

### 23.6.1 인코더의 책임

인코더는 목표 레벨에 맞게 비트스트림을 생성해야 한다.

```cpp
class ConformantEncoder {
    LevelConstraints target_level;
    SmoothingBuffer buffer;

public:
    void encode_frame(const Frame& input) {
        // 1. 프레임 크기 검사
        if (input.width * input.height > target_level.max_pic_size) {
            // 에러 또는 다운스케일
        }

        // 2. 비트 예산 계산
        int64_t max_frame_bits = target_level.max_bitrate / fps * 1.5;

        // 3. 인코딩 (예산 내에서)
        EncodedFrame encoded = encode_with_budget(input, max_frame_bits);

        // 4. 버퍼 모델 검증
        if (!buffer.on_frame_arrival(encoded.size_bits, 1.0 / fps)) {
            // 버퍼 오버플로우/언더플로우
            // → 비트 재할당 또는 품질 조정
        }
    }
};
```

### 23.6.2 디코더의 책임

디코더는 선언된 레벨을 지원해야 한다.

```cpp
class LevelAwareDecoder {
    int supported_level;  // 디코더가 지원하는 최대 레벨

public:
    bool can_decode(const SequenceHeader& seq) {
        // 비트스트림 레벨이 지원 범위 내인지 확인
        return seq.seq_level_idx <= supported_level;
    }

    void decode(const Bitstream& bs) {
        if (!can_decode(bs.sequence_header)) {
            throw UnsupportedLevelError();
        }

        // 레벨 검증 통과 → 정상 디코딩
        for (const auto& frame : bs.frames) {
            decode_frame(frame);
        }
    }
};
```

### 23.6.3 스트리밍 서버의 활용

```cpp
// 적응형 스트리밍에서 레벨 기반 품질 선택
class AdaptiveStreamingServer {
    std::vector<EncodedStream> quality_levels;

    EncodedStream& select_quality(const ClientCapabilities& client) {
        // 클라이언트가 지원하는 최대 레벨 확인
        int max_supported = client.max_decoder_level;

        // 해당 레벨에 맞는 스트림 선택
        for (auto& stream : quality_levels) {
            if (stream.level <= max_supported) {
                return stream;
            }
        }
        return quality_levels.back();  // 최저 품질
    }
};
```

---

## 정리

1. **Decoder Model**은 비트스트림이 디코더의 자원 한계를 넘지 않음을 수학적으로 보증한다.

2. **Smoothing Buffer**는 Leaky Bucket 모델로 동작하며, 오버플로우/언더플로우가 없어야 적합하다.

3. 두 가지 디코딩 모드가 있다: **Decoding Schedule Mode** (스케줄 기반)와 **Resource Availability Mode** (자원 가용성 기반).

4. **Frame Buffer Model**은 10개의 물리 버퍼를 가정한다 (VBI 8개 + 현재 디코딩 1개 + 디스플레이 1개).

5. **decode_time**은 디코딩 능력과 전송 속도 중 더 큰 제약으로 결정된다.

6. **presentation_time**은 프레임 표시 시점이며, 디코딩 완료가 이전이어야 한다.

7. 각 **Level**은 MaxPicSize, MaxDecodeRate, MaxBitrate 등의 한계를 정의한다.

8. **적합성 검증**은 모든 프레임에서 레벨 제약을 만족하는지 확인한다.

---

## 다음 장 예고

Ch 24에서는 **Error Resilience**를 다룬다. 네트워크 에러 상황에서의 복원 전략을 살펴본다.

---

## 관련 항목

- [Ch 22: Metadata OBU](/blog/media/av1/chapter22-metadata)
- [Ch 21: Superres와 Scalability](/blog/media/av1/chapter21-superres-scalability)
- [Ch 3: Sequence Header와 프레임 구조](/blog/media/av1/chapter03-sequence-frame)
- [AV1 Spec Annex A](https://aomediacodec.github.io/av1-spec/#profiles-and-levels) — Profiles and Levels
- [AV1 Spec Annex E](https://aomediacodec.github.io/av1-spec/#decoder-model) — Decoder Model
