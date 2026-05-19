---
title: "Ch 27: GOP, Key Frame, LTR"
date: 2026-05-16T04:00:00
description: "AV1 인코더의 GOP 구조 — Hierarchical GOP, Forced Key Frame, Scene Change, Long Term Reference."
tags: [AV1, Video, Codec, Encoder, GOP, Key Frame, LTR]
series: "AV1"
seriesOrder: 27
draft: true
---

Rate Control이 "각 프레임에 몇 비트를 할당할까?"를 결정한다면, **GOP 설계**는 "어떤 프레임을 언제 만들고, 어떤 참조를 유지할까?"를 결정한다. 이 장에서는 프레임 레벨의 전략을 살펴본다.

---

## 27.1 GOP 구조 설계

### GOP의 정의

**GOP**(Group of Pictures)는 Key Frame 사이의 프레임 그룹이다.

```
기본 GOP 개념:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  GOP 1              GOP 2              GOP 3        │
│  ┌─────────────┐   ┌─────────────┐   ┌────────     │
│  │ I P P P P P │ │ I P P P P P │ │ I P P P ...    │
│  └─────────────┘   └─────────────┘   └────────     │
│  ↑               ↑               ↑                 │
│  Key Frame       Key Frame       Key Frame         │
│                                                     │
│  GOP Size = Key Frame 사이의 프레임 수              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Closed GOP vs Open GOP

```
Closed GOP:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  GOP 경계에서 참조 차단:                            │
│                                                     │
│  GOP 1              GOP 2                           │
│  I → P → P → P ║ I → P → P → P                     │
│                ║                                    │
│                ╠═══ 이 경계를 넘어 참조 불가        │
│                                                     │
│  장점:                                              │
│    - 각 GOP가 독립적 → 시크(seek) 용이              │
│    - 에러가 GOP 밖으로 전파되지 않음                │
│    - 랜덤 액세스 포인트 명확                        │
│                                                     │
│  단점:                                              │
│    - GOP 경계에서 압축 효율 저하                    │
│    - Key Frame 오버헤드                             │
│                                                     │
└─────────────────────────────────────────────────────┘

Open GOP:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  GOP 경계를 넘어 참조 허용:                         │
│                                                     │
│  GOP 1              GOP 2                           │
│  I → P → P → P → I → P → P → P                     │
│            ↑───────┘                                │
│  (GOP 2의 프레임이 GOP 1 참조)                      │
│                                                     │
│  장점:                                              │
│    - 높은 압축 효율                                 │
│    - GOP 경계에서도 좋은 예측                       │
│                                                     │
│  단점:                                              │
│    - 시크 시 이전 GOP 일부 필요                     │
│    - 에러 전파 범위 증가                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Hierarchical GOP (계층적 GOP)

현대 인코더는 **계층적 B-프레임 구조**를 사용한다.

```
Hierarchical B-Frame 구조:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Level 0 (Key):    I─────────────────I              │
│                    ↓                 ↓              │
│  Level 1 (Mid):    I───────P─────────I              │
│                    ↓   ↓   ↓   ↓     ↓              │
│  Level 2 (Near):   I───P───P───P─────I              │
│                    ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓   ↓              │
│  Level 3 (Leaf):   I P P P P P P P P I              │
│                                                     │
│  디스플레이 순서:  0 1 2 3 4 5 6 7 8 9              │
│  디코딩 순서:      0 8 4 2 1 3 6 5 7 9 (예)         │
│                                                     │
│  양자화 전략:                                       │
│    - Level 0: QP = base_qp (최고 품질)             │
│    - Level 1: QP = base_qp + 3                      │
│    - Level 2: QP = base_qp + 5                      │
│    - Level 3: QP = base_qp + 7 (가장 낮은 품질)    │
│                                                     │
│  이유: 상위 레벨은 더 많은 프레임에서 참조됨       │
│        → 높은 품질 유지가 전체 효율에 유리          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### MiniGOP

**MiniGOP**는 계층 구조의 기본 단위다.

```
MiniGOP 크기별 구조:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  MiniGOP Size = 4:                                  │
│    디스플레이: [0] [1] [2] [3] [4]                  │
│    디코딩:     [0] [4] [2] [1] [3]                  │
│    구조:        I ─── P                             │
│                 └─B─┘                               │
│                  └B┘                                │
│                                                     │
│  MiniGOP Size = 8:                                  │
│    디스플레이: [0] [1] [2] [3] [4] [5] [6] [7] [8]  │
│    디코딩:     [0] [8] [4] [2] [1] [3] [6] [5] [7]  │
│                                                     │
│  MiniGOP Size = 16:                                 │
│    레벨 4까지의 계층 구조                           │
│    복잡하지만 높은 압축 효율                        │
│                                                     │
│  트레이드오프:                                      │
│    큰 MiniGOP → 압축 효율↑, 인코딩 지연↑          │
│    작은 MiniGOP → 압축 효율↓, 인코딩 지연↓        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### AV1의 ALTREF 기반 GOP

AV1은 **ALTREF**(Alternative Reference) 프레임을 활용한 고유한 GOP 구조를 사용한다.

```
AV1 ALTREF GOP:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ALTREF = 시간 필터링으로 생성한 참조 전용 프레임   │
│           show_frame = 0 → 디스플레이하지 않음      │
│                                                     │
│  디코딩 순서:                                       │
│    [KEY] [ALT8] [ALT4] [P1] [P2] [P3] [OVL4] ...   │
│                                                     │
│  디스플레이 순서:                                   │
│    [KEY] [P1] [P2] [P3] [OVL4] [P5] [ALT6] ...     │
│                                                     │
│  프레임 설명:                                       │
│    KEY:  Key Frame (show_frame=1)                   │
│    ALT8: Frame 8 위치의 ALTREF (show_frame=0)      │
│    ALT4: Frame 4 위치의 ALTREF (show_frame=0)      │
│    P1-P3: 일반 Inter 프레임 (show_frame=1)         │
│    OVL4: show_existing_frame으로 ALT4 출력         │
│                                                     │
│  OVL (Overlay):                                     │
│    - show_existing_frame = 1                        │
│    - 이미 디코딩된 ALTREF을 화면에 표시             │
│    - 디코딩 비용 0 (데이터 없음)                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// Hierarchical GOP 스케줄링
struct GOPScheduler {
    int minigop_size = 16;
    int base_qp = 30;

    struct FrameSchedule {
        int display_order;
        int decode_order;
        FrameType type;
        int pyramid_level;
        int qp;
    };

    std::vector<FrameSchedule> schedule_minigop(int start_frame) {
        std::vector<FrameSchedule> schedule;

        // Key Frame
        schedule.push_back({
            start_frame, 0, KEY_FRAME, 0, base_qp
        });

        // Recursive hierarchical structure
        add_hierarchical_frames(schedule, start_frame, start_frame + minigop_size,
                               1, 1);

        // 디코딩 순서 정렬
        std::sort(schedule.begin(), schedule.end(),
                 [](const auto& a, const auto& b) {
                     return a.decode_order < b.decode_order;
                 });

        return schedule;
    }

    void add_hierarchical_frames(std::vector<FrameSchedule>& schedule,
                                int start, int end, int level, int& decode_idx) {
        if (end - start <= 1) return;

        int mid = (start + end) / 2;

        // ALTREF at mid position
        schedule.push_back({
            mid,
            decode_idx++,
            ALTREF_FRAME,
            level,
            base_qp + level * 3
        });

        // Recurse
        add_hierarchical_frames(schedule, start, mid, level + 1, decode_idx);
        add_hierarchical_frames(schedule, mid, end, level + 1, decode_idx);
    }
};
```

### GOP 크기 선택

```
GOP Size 선택 가이드:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  사용 사례          권장 GOP Size  이유             │
│  ─────────────────────────────────────────────────  │
│  VOD (영화)        120-240       높은 압축 효율     │
│  VOD (웹)          60-120        적당한 시크        │
│  라이브 스트리밍   30-60         빠른 채널 전환     │
│  실시간 통신       15-30         저지연, 에러 복구 │
│  화상 회의         10-30         매우 낮은 지연     │
│                                                     │
│  일반 규칙:                                         │
│    GOP Size ≈ 프레임레이트 × 원하는_키프레임_간격  │
│    예: 30fps, 2초 간격 → GOP Size = 60             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 27.2 Forced Key Frame

### Key Frame이 필요한 상황

특정 상황에서는 GOP 주기와 관계없이 **강제로 Key Frame**을 삽입해야 한다.

```
Key Frame 강제 삽입 트리거:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. 장면 전환 (Scene Change):                       │
│     - 새 장면은 이전 참조와 상관 없음               │
│     - Inter 예측보다 Intra가 효율적                 │
│                                                     │
│  2. 주기적 시크 포인트:                             │
│     - 사용자가 탐색할 수 있는 위치                  │
│     - HLS/DASH 세그먼트 경계                        │
│                                                     │
│  3. 스트림 전환 (ABR):                              │
│     - Adaptive Bitrate Streaming                    │
│     - 품질 전환 시 깨끗한 시작점 필요              │
│                                                     │
│  4. 에러 복구:                                      │
│     - 네트워크 에러 후 즉시 복구                    │
│     - 디코더 리셋 후 재동기화                       │
│                                                     │
│  5. 챕터 시작점:                                    │
│     - 영화의 챕터 구분                              │
│     - 광고 경계                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// Key Frame 결정 로직
bool should_force_keyframe(int frame_num, const EncoderConfig& cfg,
                          const FrameAnalysis& analysis) {
    // 1. 주기적 Key Frame
    if (frame_num % cfg.keyframe_interval == 0) {
        return true;
    }

    // 2. 최대 Key Frame 간격 초과
    if (frame_num - last_keyframe > cfg.max_keyframe_interval) {
        return true;
    }

    // 3. 장면 전환 감지
    if (analysis.scene_change_detected) {
        return true;
    }

    // 4. 에러 복구 요청 (RTC에서)
    if (error_recovery_requested) {
        error_recovery_requested = false;
        return true;
    }

    // 5. 외부 트리거 (API 호출)
    if (force_keyframe_flag) {
        force_keyframe_flag = false;
        return true;
    }

    return false;
}
```

### Key Frame Interval 설정

```
Key Frame Interval 권장값:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  스트리밍 (HLS/DASH):                               │
│    - Segment Duration = 2~6초                       │
│    - GOP Size = Segment Duration × FPS              │
│    - 예: 4초 세그먼트, 30fps → GOP = 120           │
│                                                     │
│  실시간 스트리밍:                                   │
│    - 1~2초 권장                                     │
│    - 채널 전환 속도 우선                            │
│                                                     │
│  화상 회의:                                         │
│    - 0.5~1초 권장 (15~30 프레임)                    │
│    - 에러 복구 속도 중요                            │
│                                                     │
│  VOD:                                               │
│    - 5~10초 허용 가능                               │
│    - 시크 응답성과 압축 효율 균형                   │
│                                                     │
│  트레이드오프:                                      │
│    짧은 간격 → 시크 빠름, 에러 복구 빠름, 비트↑   │
│    긴 간격 → 압축 효율↑, 시크 느림                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 27.3 Scene Change Detection

### 장면 전환 감지의 중요성

장면이 전환될 때 Inter 예측은 무의미하다. 이전 프레임과 완전히 다른 내용이기 때문이다.

```
장면 전환 시 Inter vs Intra:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Frame N-1 (이전 장면)    Frame N (새 장면)         │
│  ┌──────────────────┐    ┌──────────────────┐      │
│  │  거실 장면       │    │  해변 장면       │      │
│  │  [소파, TV, ...]│    │  [바다, 모래, ..]│      │
│  └──────────────────┘    └──────────────────┘      │
│                                                     │
│  Inter 예측 시도:                                   │
│    - 모든 블록에서 높은 잔차                        │
│    - 잔차 인코딩에 많은 비트                        │
│    - 예측 모드 오버헤드도 추가                      │
│                                                     │
│  Intra (Key Frame) 사용:                            │
│    - 새 장면을 직접 인코딩                          │
│    - 에러 전파 차단                                 │
│    - 총 비트가 더 적을 수 있음                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 감지 방법 1: 프레임 간 차이 (SAD/MAD)

```cpp
// SAD 기반 장면 전환 감지
struct SADSceneDetector {
    double threshold = 20.0;  // 픽셀당 평균 SAD

    bool detect_scene_change(const Frame& curr, const Frame& prev) {
        int64_t total_sad = 0;
        int pixel_count = curr.width * curr.height;

        for (int i = 0; i < pixel_count; i++) {
            total_sad += abs(curr.data[i] - prev.data[i]);
        }

        double mean_sad = (double)total_sad / pixel_count;

        return mean_sad > threshold;
    }
};
```

### 감지 방법 2: 히스토그램 비교

```cpp
// 히스토그램 기반 장면 전환 감지
struct HistogramSceneDetector {
    double chi_square_threshold = 1000.0;

    bool detect_scene_change(const Frame& curr, const Frame& prev) {
        // 밝기 히스토그램 계산 (256 bins)
        std::array<int, 256> hist_curr = {0};
        std::array<int, 256> hist_prev = {0};

        for (int i = 0; i < curr.width * curr.height; i++) {
            hist_curr[curr.data[i]]++;
            hist_prev[prev.data[i]]++;
        }

        // 카이제곱 거리 계산
        double chi_square = 0;
        for (int i = 0; i < 256; i++) {
            double sum = hist_curr[i] + hist_prev[i];
            if (sum > 0) {
                double diff = hist_curr[i] - hist_prev[i];
                chi_square += diff * diff / sum;
            }
        }

        return chi_square > chi_square_threshold;
    }
};
```

### 감지 방법 3: Intra/Inter 비용 비교

가장 정확한 방법. 1st pass에서 실제 인코딩 비용을 비교한다.

```cpp
// Intra/Inter 비용 비교
struct CostBasedSceneDetector {
    double cost_ratio_threshold = 0.8;  // Intra/Inter < 0.8이면 장면 전환

    bool detect_scene_change(const Frame& curr, const Frame& prev,
                            const MotionEstimator& me) {
        double total_intra_cost = 0;
        double total_inter_cost = 0;

        // 16x16 블록 단위로 비용 계산
        for (int y = 0; y < curr.height; y += 16) {
            for (int x = 0; x < curr.width; x += 16) {
                // Intra 비용 추정 (DC 예측 + SATD)
                double intra_cost = estimate_intra_cost(curr, x, y);

                // Inter 비용 추정 (모션 추정 + SATD)
                MotionVector mv = me.estimate(curr, prev, x, y);
                double inter_cost = estimate_inter_cost(curr, prev, x, y, mv);

                total_intra_cost += intra_cost;
                total_inter_cost += inter_cost;
            }
        }

        // Intra가 Inter보다 효율적이면 장면 전환
        double ratio = total_intra_cost / total_inter_cost;
        return ratio < cost_ratio_threshold;
    }
};
```

### 플래시 필터링

카메라 플래시나 번개 같은 짧은 밝기 변화를 장면 전환으로 오인하지 않도록 필터링한다.

```cpp
// 플래시 필터링
struct FlashFilter {
    std::deque<double> brightness_history;
    int history_size = 5;

    bool is_flash(double current_brightness) {
        if (brightness_history.size() < 2) {
            brightness_history.push_back(current_brightness);
            return false;
        }

        double prev = brightness_history.back();
        double prev_prev = brightness_history[brightness_history.size() - 2];

        // 플래시 패턴: 갑자기 밝아졌다가 다시 어두워짐
        // prev_prev → prev (밝아짐) → current (다시 어두움)
        bool sudden_bright = (prev - prev_prev) > brightness_threshold;
        bool return_dark = (prev - current_brightness) > brightness_threshold;

        brightness_history.push_back(current_brightness);
        if (brightness_history.size() > history_size) {
            brightness_history.pop_front();
        }

        return sudden_bright && return_dark;
    }

    bool detect_scene_change_with_flash_filter(const Frame& curr,
                                               const Frame& prev) {
        double curr_brightness = compute_mean_brightness(curr);

        // 플래시 감지
        if (is_flash(curr_brightness)) {
            return false;  // 플래시는 장면 전환이 아님
        }

        // 일반 장면 전환 감지
        return base_detector.detect_scene_change(curr, prev);
    }
};
```

### SVT-AV1의 장면 전환 감지

SVT-AV1은 다단계 장면 전환 감지를 사용한다.

```
SVT-AV1 장면 전환 감지 파이프라인:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. Downsample (1/4 또는 1/8 해상도)               │
│     - 빠른 분석을 위해 해상도 축소                  │
│                                                     │
│  2. SAD/SATD 기반 초기 감지                        │
│     - 블록별 SAD 계산                               │
│     - 전체 평균 SAD로 후보 선정                     │
│                                                     │
│  3. Intra/Inter 비용 비교                          │
│     - 후보 프레임에 대해 정밀 분석                  │
│     - 실제 RD 비용 비교                             │
│                                                     │
│  4. 플래시 필터링                                   │
│     - 밝기 히스토그램 분석                          │
│     - 일시적 밝기 변화 제외                         │
│                                                     │
│  5. 최종 결정                                       │
│     - scene_change_detected = true/false            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 27.4 Long Term Reference (LTR)

### LTR의 개념

**Long Term Reference**는 시간적으로 먼 과거 프레임을 참조 버퍼에 장기 유지하는 기법이다.

```
일반 참조 vs LTR:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  일반 참조:                                         │
│    - LAST, GOLDEN, ALTREF 등 최근 프레임들          │
│    - 새 프레임 인코딩 시 갱신됨                     │
│    - 시간적으로 가까운 프레임 참조                  │
│                                                     │
│  Long Term Reference:                               │
│    - 오래된 프레임을 버퍼에 장기 유지               │
│    - 명시적으로 갱신 요청 전까지 유지               │
│    - 시간적으로 먼 프레임 참조 가능                 │
│                                                     │
│  시간 →                                             │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┐         │
│  │ I  │ P  │ P  │ P  │ P  │ P  │ P  │ P  │         │
│  └────┴────┴────┴────┴────┴────┴────┴────┘         │
│    ↑                             │                  │
│    └─────────── LTR 참조 ─────────┘                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### AV1에서의 LTR 구현

AV1은 8개의 참조 프레임 슬롯을 가진다. 그 중 일부를 LTR로 활용할 수 있다.

```cpp
// AV1 참조 버퍼 관리
struct ReferenceFrameManager {
    static const int NUM_REF_FRAMES = 8;
    Frame ref_frames[NUM_REF_FRAMES];
    int ltr_slots[2] = {6, 7};  // 슬롯 6, 7을 LTR로 사용

    void update_reference_frames(const Frame& decoded_frame,
                                uint8_t refresh_frame_flags) {
        for (int i = 0; i < NUM_REF_FRAMES; i++) {
            if (refresh_frame_flags & (1 << i)) {
                // LTR 슬롯은 명시적 갱신만 허용
                if (is_ltr_slot(i) && !explicit_ltr_update) {
                    continue;  // LTR 슬롯 갱신 스킵
                }
                ref_frames[i] = decoded_frame;
            }
        }
    }

    bool is_ltr_slot(int slot) {
        return slot == ltr_slots[0] || slot == ltr_slots[1];
    }

    void update_ltr(int ltr_index, const Frame& frame) {
        int slot = ltr_slots[ltr_index];
        ref_frames[slot] = frame;
    }
};
```

### LTR 활용 사례

#### 1. 화상 회의

```
화상 회의에서의 LTR:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  시나리오: 배경이 변하지 않고 인물만 움직임         │
│                                                     │
│  ┌───────────────────┐                              │
│  │   사무실 배경     │ ← LTR로 저장                │
│  │  ┌─────┐         │                              │
│  │  │ 인물 │         │                              │
│  │  └─────┘         │                              │
│  └───────────────────┘                              │
│                                                     │
│  활용:                                              │
│    - 배경 영역: LTR 참조 (오래된 배경 재사용)       │
│    - 인물 영역: 최근 프레임 참조 (움직임 추적)      │
│                                                     │
│  효과:                                              │
│    - 배경에 비트 거의 사용 안 함                    │
│    - 대역폭 대폭 절감                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 2. 프레젠테이션

```
프레젠테이션에서의 LTR:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  슬라이드 1 → 슬라이드 2 → 슬라이드 1 (되돌아감)   │
│                                                     │
│  슬라이드 1을 LTR로 저장해두면:                     │
│    - 되돌아갈 때 전체 리인코딩 불필요              │
│    - LTR 참조로 대부분의 블록 스킵                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 3. 에러 복구

```
LTR 기반 에러 복구:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  정상 상황:                                         │
│    I → P → P → P → P → P → ...                     │
│                                                     │
│  패킷 손실 발생:                                    │
│    I → P → P → [X] → [X] → P → ...                 │
│                ↑       ↑                            │
│              손실된 프레임들                         │
│                                                     │
│  LTR 기반 복구:                                     │
│    1. 인코더가 주기적으로 LTR 업데이트              │
│    2. 디코더가 손실 감지 → 인코더에 알림            │
│    3. 인코더가 LTR만 참조하는 프레임 생성           │
│    4. 에러 전파 차단                                │
│                                                     │
│    I → P → P → [X] → [X] → P(LTR ref only) → P     │
│    ↑                         │                      │
│    └────── LTR 참조 ─────────┘                      │
│                                                     │
│  Key Frame보다 효율적: 변화 없는 부분 재사용       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// LTR 기반 에러 복구
struct LTRErrorRecovery {
    int ltr_frame_number = -1;
    bool recovery_requested = false;

    void mark_ltr(int frame_num) {
        ltr_frame_number = frame_num;
        // LTR 슬롯에 현재 프레임 저장
        ref_manager.update_ltr(0, current_decoded_frame);
    }

    void handle_packet_loss_report(int last_received_frame) {
        if (last_received_frame < ltr_frame_number) {
            // LTR도 손실됨 → Key Frame 필요
            force_keyframe = true;
        } else {
            // LTR은 무사 → LTR만 참조하는 프레임 생성
            recovery_requested = true;
        }
    }

    void configure_recovery_frame(EncoderConfig& cfg) {
        if (recovery_requested) {
            // LTR 슬롯만 참조하도록 설정
            cfg.reference_select = LTR_ONLY;
            cfg.refresh_last = true;  // 복구 후 LAST 갱신
            recovery_requested = false;
        }
    }
};
```

### WebRTC에서의 LTR

```
WebRTC LTR 시그널링:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  RTCP 피드백:                                       │
│    - PLI (Picture Loss Indication): Key Frame 요청 │
│    - RPSI (Reference Picture Selection): LTR 참조 요청
│                                                     │
│  인코더 ──── 비디오 ────→ 디코더                   │
│    ↑                          │                    │
│    └──── RTCP 피드백 ────────┘                     │
│         (PLI, RPSI, NACK)                          │
│                                                     │
│  LTR 갱신 주기:                                     │
│    - 패킷 손실률에 따라 동적 조정                   │
│    - 손실 많음 → LTR 자주 갱신                      │
│    - 손실 적음 → LTR 드물게 갱신                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 27.5 실전 설정 예제

### ffmpeg/SVT-AV1

```bash
# VOD 인코딩 (긴 GOP, 장면 전환 감지)
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -g 240 \           # GOP size = 240 (8초 @ 30fps)
    -keyint_min 30 \   # 최소 Key Frame 간격
    -sc_threshold 40 \ # 장면 전환 감지 민감도
    -crf 30 \
    output.mp4

# 스트리밍 (짧은 GOP, 세그먼트 정렬)
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -g 60 \            # GOP = 60 (2초 @ 30fps)
    -keyint_min 60 \   # 고정 GOP (세그먼트 정렬)
    -force_key_frames "expr:gte(t,n_forced*2)" \
    -crf 30 \
    output.mp4

# 실시간 (매우 짧은 GOP)
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -g 30 \            # GOP = 30 (1초 @ 30fps)
    -preset 10 \       # 빠른 인코딩
    -crf 35 \
    -tune 0 \          # PSNR 최적화
    output.mp4
```

### libaom-av1

```bash
# 고품질 VOD
ffmpeg -i input.mp4 \
    -c:v libaom-av1 \
    -cpu-used 4 \
    -row-mt 1 \
    -tiles 2x2 \
    -g 240 \
    -keyint_min 30 \
    -auto-alt-ref 1 \     # ALTREF 활성화
    -lag-in-frames 25 \   # Look-ahead
    -crf 28 \
    output.mp4
```

---

## 정리

- **GOP**: Key Frame 사이의 프레임 그룹, Closed/Open 구조
- **Hierarchical GOP**: 계층적 B-Frame 구조, 피라미드 레벨별 QP 조정
- **MiniGOP**: 계층 구조의 기본 단위 (4, 8, 16 프레임)
- **ALTREF**: AV1의 참조 전용 프레임 (show_frame=0), 시간 필터링으로 생성
- **Forced Key Frame**: 장면 전환, 시크 포인트, 에러 복구 시 강제 삽입
- **Scene Change Detection**: SAD, 히스토그램, Intra/Inter 비용 비교
- **LTR**: 장기 참조 프레임, 화상 회의, 에러 복구에 활용

---

## 다음 장 예고

Ch 28에서는 **Temporal Filtering과 Adaptive QP**를 다룬다. ALTREF 생성을 위한 시간 필터링과 영역별 양자화 조절 기법을 살펴본다.

---

## 관련 항목

- [Ch 5: Frame Header](/blog/media/av1/chapter05-frame-header) — refresh_frame_flags, 참조 관리
- [Ch 11: Inter 예측](/blog/media/av1/chapter11-inter-prediction) — 참조 프레임 선택
- [Ch 24: Error Resilience](/blog/media/av1/chapter24-error-resilience) — 에러 복구 메커니즘
- [Ch 26: Rate Control](/blog/media/av1/chapter26-rate-control) — 비트 분배
