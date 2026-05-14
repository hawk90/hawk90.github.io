---
title: "Ch 28: Temporal Filtering과 Adaptive QP"
date: 2025-10-02T04:00:00
description: "AV1 인코더의 화질 최적화 — RDO, Temporal Filtering, Variance AQ, Delta Q, ROI."
tags: [AV1, Video, Codec, Encoder, RDO, Temporal Filter, AQ]
series: "AV1"
seriesOrder: 28
draft: false
---

이 장에서는 인코더가 화질을 최적화하는 두 가지 핵심 기법을 살펴본다. **Temporal Filtering**은 시간 축을 따라 노이즈를 제거하여 깨끗한 참조 프레임을 생성한다. **Adaptive Quantization**은 영역별로 양자화 강도를 조절하여 비트를 효율적으로 분배한다.

---

## 28.1 RDO (Rate-Distortion Optimization)

### 핵심 문제

인코더는 매 블록마다 "어떤 모드를 사용할 것인가?"를 결정해야 한다.

```
모드 선택 문제:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  "이 블록에 어떤 모드를 사용할까?"                  │
│                                                     │
│  선택지:                                            │
│    - Intra vs Inter                                 │
│    - 13개의 Intra 모드 중 어떤 것?                 │
│    - 어떤 참조 프레임?                              │
│    - 어떤 모션 벡터?                                │
│    - 어떤 변환 크기/타입?                           │
│    - 어떤 QP?                                       │
│                                                     │
│  조합 수: 수천~수만 가지                            │
│                                                     │
│  목표: 품질과 비트 사용의 최적 균형                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### RD 비용 함수

**Rate-Distortion Optimization**은 비용 함수를 최소화하는 모드를 선택한다.

```
RDO 비용 함수:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  J = D + λ × R                                      │
│                                                     │
│  J: RD 비용 (최소화할 값)                           │
│  D: 왜곡 (Distortion)                               │
│     - 원본과 복원 픽셀의 차이                       │
│  R: 비트 수 (Rate)                                  │
│     - 이 모드를 인코딩하는 데 필요한 비트           │
│  λ: 라그랑주 승수                                   │
│     - D와 R 사이의 균형 조절                        │
│                                                     │
│  λ가 크면: 비트 절약 우선 (품질↓)                  │
│  λ가 작으면: 화질 우선 (비트↑)                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 왜곡 측정 방법

```
왜곡 측정 방식:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. SSE (Sum of Squared Errors):                    │
│     D = Σᵢ (original[i] - reconstructed[i])²       │
│     - 가장 일반적, 수학적으로 단순                  │
│     - MSE = SSE / N                                 │
│                                                     │
│  2. SAD (Sum of Absolute Differences):              │
│     D = Σᵢ |original[i] - prediction[i]|           │
│     - 빠른 계산, 모션 추정에서 주로 사용            │
│                                                     │
│  3. SATD (Sum of Absolute Transformed Differences): │
│     D = Σᵢ |Hadamard(residual)[i]|                 │
│     - 변환 후 비용을 더 정확히 반영                 │
│     - 모드 결정에 더 적합                           │
│                                                     │
│  실제 인코더:                                       │
│    - 초기 후보 필터링: SAD (빠름)                   │
│    - 정밀 비교: SATD 또는 실제 RD 비용             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### λ (라그랑주 승수)

```
λ와 QP의 관계:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  일반적 근사:                                       │
│    λ = 0.85 × 2^((QP - 12) / 3)                    │
│                                                     │
│  QP    λ (근사)    의미                             │
│  ─────────────────────────────────────────          │
│  10    0.34       품질 최우선                       │
│  20    2.69       고품질                            │
│  30    21.5       일반 품질                         │
│  40    172        비트 절약 우선                    │
│  50    1376       저품질 허용                       │
│                                                     │
│  Rate Control에서 결정된 QP → λ 계산 → RDO에서 사용│
│                                                     │
└─────────────────────────────────────────────────────┘
```

### RDO 모드 결정 과정

```cpp
// RDO 기반 모드 선택
struct RDOSelector {
    double lambda;

    struct ModeCandidate {
        int mode;
        int64_t distortion;
        int64_t bits;
        int64_t rd_cost;
    };

    ModeCandidate select_best_mode(const Block& original,
                                   const std::vector<int>& candidate_modes) {
        ModeCandidate best;
        best.rd_cost = INT64_MAX;

        for (int mode : candidate_modes) {
            ModeCandidate cand;
            cand.mode = mode;

            // 1. 예측 수행
            Block prediction = predict(original, mode);

            // 2. 잔차 계산
            Block residual = original - prediction;

            // 3. 변환 + 양자화 + 역변환
            Block quantized = transform_and_quantize(residual);
            Block reconstructed = prediction + inverse_transform(quantized);

            // 4. 왜곡 계산 (SSE)
            cand.distortion = compute_sse(original, reconstructed);

            // 5. 비트 수 추정
            cand.bits = estimate_bits(mode, quantized);

            // 6. RD 비용 계산
            cand.rd_cost = cand.distortion + (int64_t)(lambda * cand.bits);

            if (cand.rd_cost < best.rd_cost) {
                best = cand;
            }
        }

        return best;
    }
};
```

### 계층적 모드 결정 (SVT-AV1)

전수 검색은 비현실적이다. 현대 인코더는 계층적 결정 구조를 사용한다.

```
SVT-AV1 계층적 모드 결정:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Stage 1: Open Loop (매우 빠름)                     │
│    - 다운샘플된 해상도에서 분석                     │
│    - SAD 기반 모드 후보 선정                        │
│    - 파티션 후보 축소                               │
│                                                     │
│  Stage 2: Semi-Open Loop                            │
│    - SATD 기반 더 정밀한 비교                       │
│    - 상위 N개 모드만 유지                           │
│                                                     │
│  Stage 3: Full RDO                                  │
│    - 최종 후보들에 대해 전체 RD 비용 계산          │
│    - 실제 인코딩 + 비트 수 측정                     │
│    - 최적 모드 선택                                 │
│                                                     │
│  cpu-used (preset):                                 │
│    0 (가장 느림): Stage 3 후보 많음                 │
│    8 (가장 빠름): Stage 1에서 대부분 결정          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 28.2 Temporal Filtering

### ALTREF 프레임 생성

**Temporal Filtering**은 시간 축을 따라 여러 프레임을 혼합하여 노이즈가 제거된 참조 프레임을 생성한다.

```
Temporal Filtering 개념:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  시간 →                                             │
│  Frame:  F₋₃  F₋₂  F₋₁  F₀  F₊₁  F₊₂  F₊₃         │
│            ↓    ↓    ↓   ↓   ↓    ↓    ↓           │
│            └────┴────┴───┴───┴────┴────┘           │
│                       ↓                             │
│                  [ALTREF]                           │
│                  (시간 필터링된 프레임)             │
│                                                     │
│  과정:                                              │
│    1. 주변 프레임들 수집 (예: ±3 프레임)            │
│    2. 각 프레임의 모션 추정 → 모션 보상 정렬       │
│    3. 정렬된 프레임들의 가중 평균                   │
│    4. 노이즈 제거된 깨끗한 참조 생성               │
│                                                     │
│  결과:                                              │
│    - ALTREF은 show_frame=0 (디스플레이 안 함)      │
│    - 다른 프레임에서 참조만 함                      │
│    - 참조 품질↑ → 예측 효율↑ → 압축 효율↑        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 모션 보상 정렬

시간 필터링 전에 각 프레임을 타겟 위치에 정렬해야 한다.

```cpp
// 모션 보상 정렬
struct TemporalFilterAligner {
    // 프레임 F_i를 타겟 위치로 정렬
    Frame align_frame(const Frame& source, const Frame& target,
                     int source_time, int target_time) {
        Frame aligned(target.width, target.height);

        for (int y = 0; y < target.height; y += 16) {
            for (int x = 0; x < target.width; x += 16) {
                // 모션 추정: source에서 target 방향으로
                MotionVector mv = estimate_motion(source, target, x, y);

                // 시간 스케일링 (선형 보간)
                double scale = (double)target_time / source_time;
                int scaled_mvx = (int)(mv.x * scale);
                int scaled_mvy = (int)(mv.y * scale);

                // 모션 보상
                copy_block_with_mv(source, aligned, x, y,
                                  scaled_mvx, scaled_mvy);
            }
        }

        return aligned;
    }
};
```

### 가중 평균

정렬된 프레임들을 가중 평균하여 최종 결과를 생성한다.

```cpp
// Temporal Filter
struct TemporalFilter {
    int strength = 5;          // 필터 강도 (0~10)
    int filter_length = 7;     // 사용할 프레임 수 (±3)

    Frame apply(const std::vector<Frame>& aligned_frames,
               const std::vector<double>& errors,
               int center_idx) {
        Frame result(aligned_frames[0].width, aligned_frames[0].height);

        for (int y = 0; y < result.height; y++) {
            for (int x = 0; x < result.width; x++) {
                double weighted_sum = 0;
                double weight_sum = 0;

                for (int i = 0; i < aligned_frames.size(); i++) {
                    // 가중치 계산: 모션 보상 오차가 작을수록 큰 가중치
                    // 가우시안 가중치: w = exp(-error² / σ²)
                    double error = errors[i];
                    double sigma = strength * 10;
                    double weight = exp(-error * error / (sigma * sigma));

                    // 시간 거리에 따른 추가 감쇠
                    int time_dist = abs(i - center_idx);
                    weight *= exp(-time_dist * 0.5);

                    weighted_sum += aligned_frames[i].at(y, x) * weight;
                    weight_sum += weight;
                }

                result.at(y, x) = (int)(weighted_sum / weight_sum + 0.5);
            }
        }

        return result;
    }
};
```

### Temporal Filtering 효과

```
Temporal Filtering 전후:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  필터 전 (원본 프레임):                             │
│  ┌──────────────────────┐                          │
│  │ ░░░█░░░░░░░░░░░░░░░  │ ← 노이즈가 있는 프레임   │
│  │ ░░░░░░█░░░░░░█░░░░░  │                          │
│  │ ░░░░░░░░░░░░░░░░░░░  │                          │
│  └──────────────────────┘                          │
│                                                     │
│  필터 후 (ALTREF):                                  │
│  ┌──────────────────────┐                          │
│  │ ░░░░░░░░░░░░░░░░░░░  │ ← 노이즈 제거된 프레임   │
│  │ ░░░░░░░░░░░░░░░░░░░  │                          │
│  │ ░░░░░░░░░░░░░░░░░░░  │                          │
│  └──────────────────────┘                          │
│                                                     │
│  효과:                                              │
│    - 시간적 노이즈 감소                             │
│    - 더 깨끗한 참조 → 더 나은 Inter 예측           │
│    - 동일 품질에서 더 적은 비트                     │
│                                                     │
│  비용:                                              │
│    - show_frame=0이므로 디코딩만 하고 표시 안 함   │
│    - 추가 인코딩 계산 비용                          │
│    - Look-ahead 버퍼 필요                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 필터 강도 조절

```cpp
// 적응적 필터 강도
int compute_filter_strength(const Frame& frame, int qp) {
    // 높은 QP (낮은 품질) → 강한 필터링
    // 낮은 QP (높은 품질) → 약한 필터링
    int base_strength = (qp - 10) / 8;

    // 노이즈가 많은 프레임 → 강한 필터링
    double noise_level = estimate_noise(frame);
    int noise_adjustment = (int)(noise_level * 0.5);

    // 움직임이 많은 프레임 → 약한 필터링 (고스팅 방지)
    double motion_activity = estimate_motion_activity(frame);
    int motion_adjustment = (int)(-motion_activity * 0.3);

    return std::clamp(base_strength + noise_adjustment + motion_adjustment,
                     0, 10);
}
```

---

## 28.3 Adaptive Quantization

### 기본 개념

**Adaptive Quantization**은 영역별로 양자화 강도를 다르게 적용한다.

```
Adaptive Quantization 개념:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  동기:                                              │
│    - 모든 영역이 동일한 시각적 중요도가 아님        │
│    - 인간의 시각 시스템은 특정 영역에 더 민감       │
│                                                     │
│  예시:                                              │
│  ┌──────────────────────────────────┐              │
│  │  하늘 (평탄)    │   텍스처 (복잡)  │              │
│  │  QP↓ (고품질)  │   QP↑ (낮은품질) │              │
│  │                │                  │              │
│  │  얼굴 (중요)   │   배경 (덜 중요)  │              │
│  │  QP↓ (고품질)  │   QP↑ (낮은품질) │              │
│  └──────────────────────────────────┘              │
│                                                     │
│  효과:                                              │
│    - 시각적으로 중요한 영역에 더 많은 비트          │
│    - 전체 비트레이트는 유지하면서 지각 품질 향상   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Variance AQ

**Variance AQ**는 블록의 분산(밝기 변동)에 따라 QP를 조정한다.

```
Variance AQ 원리:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  관찰:                                              │
│    - 높은 분산 (텍스처 풍부): 왜곡이 눈에 덜 띔    │
│    - 낮은 분산 (평탄 영역): 왜곡이 눈에 잘 보임    │
│                                                     │
│  전략:                                              │
│    - 높은 분산 → QP↑ (비트 절약, 왜곡 숨김)        │
│    - 낮은 분산 → QP↓ (품질 유지)                   │
│                                                     │
│  분산 계산:                                         │
│    variance = Σ(pixel - mean)² / N                  │
│                                                     │
│  QP 조정:                                           │
│    delta_qp = f(log(variance / avg_variance))       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// Variance AQ
struct VarianceAQ {
    double strength = 0.5;  // AQ 강도 (0~1)

    int compute_delta_qp(const Block& block, double avg_variance) {
        // 블록 분산 계산
        double mean = compute_mean(block);
        double variance = 0;
        for (int y = 0; y < block.height; y++) {
            for (int x = 0; x < block.width; x++) {
                double diff = block.at(y, x) - mean;
                variance += diff * diff;
            }
        }
        variance /= (block.width * block.height);

        // 평균 대비 분산 비율
        double ratio = variance / avg_variance;

        // 로그 스케일 조정
        // ratio > 1 (높은 분산): delta_qp > 0 (QP↑)
        // ratio < 1 (낮은 분산): delta_qp < 0 (QP↓)
        double log_ratio = log2(ratio + 0.001);
        int delta_qp = (int)(strength * log_ratio * 4);

        return std::clamp(delta_qp, -8, 8);
    }
};
```

### Perceptual AQ

**Perceptual AQ**는 인간 시각 모델(HVS)을 기반으로 한다.

```
Perceptual AQ:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  인간 시각 시스템 특성:                             │
│                                                     │
│  1. 대비 민감도 함수 (CSF):                         │
│     - 중간 주파수에 가장 민감                       │
│     - 매우 낮거나 높은 주파수에는 덜 민감          │
│                                                     │
│  2. 밝기에 따른 민감도:                             │
│     - 어두운 영역: 노이즈가 잘 보임                 │
│     - 밝은 영역: 상대적으로 덜 민감                 │
│                                                     │
│  3. 마스킹 효과:                                    │
│     - 텍스처가 많은 영역에서 노이즈가 숨겨짐        │
│     - 에지 근처에서 작은 오차가 숨겨짐              │
│                                                     │
│  적용:                                              │
│    - 어두운 평탄 영역: QP↓↓ (매우 민감)            │
│    - 밝은 텍스처 영역: QP↑ (덜 민감)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Delta Q (AV1 스펙)

AV1 스펙은 **Superblock 단위로 QP 오프셋**을 허용한다.

```
Delta Q 신택스:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Frame Header에서:                                  │
│    delta_q_present = 1 (Delta Q 활성화)            │
│    delta_q_res = 0~3 (해상도, 2^delta_q_res 단위)  │
│                                                     │
│  각 Superblock에서:                                 │
│    delta_q (signed) = Delta QP 값                   │
│    실제 QP = base_qp + delta_q × (1 << delta_q_res)│
│                                                     │
│  예:                                                │
│    base_qp = 30                                     │
│    delta_q_res = 2 (4 단위)                         │
│    delta_q = -2                                     │
│    실제 QP = 30 + (-2 × 4) = 22                    │
│                                                     │
│  범위: delta_q ∈ [-63, 63]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// Delta Q 인코딩
struct DeltaQEncoder {
    int base_qp;
    int delta_q_res;  // 0~3

    int encode_superblock(const Superblock& sb, BitWriter& writer) {
        // Variance AQ로 delta_q 계산
        int delta_qp = variance_aq.compute_delta_qp(sb, avg_variance);

        // 해상도에 맞춰 양자화
        int scale = 1 << delta_q_res;
        int quantized_delta = delta_qp / scale;

        // 비트스트림에 기록
        if (quantized_delta != 0) {
            write_delta_q_abs(writer, abs(quantized_delta));
            if (quantized_delta != 0) {
                writer.write_bit(quantized_delta < 0);  // sign
            }
        }

        // 실제 적용할 QP
        return base_qp + quantized_delta * scale;
    }
};
```

### ROI (Region of Interest)

**ROI**는 사용자가 지정한 관심 영역에 높은 품질을 할당한다.

```
ROI 예시 (화상 회의):
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌────────────────────────────────────┐            │
│  │  배경 (Segment 1)                  │            │
│  │  QP = base_qp + 10                 │            │
│  │         ┌─────────────┐            │            │
│  │         │    얼굴     │            │            │
│  │         │ (Segment 0) │            │            │
│  │         │ QP = base_qp│            │            │
│  │         │ - 5         │            │            │
│  │         └─────────────┘            │            │
│  └────────────────────────────────────┘            │
│                                                     │
│  구현:                                              │
│    - Segmentation 기능 사용 (Ch 18 참조)            │
│    - 각 세그먼트에 다른 QP 오프셋 할당              │
│    - 얼굴 검출 → ROI 마스크 생성 → 세그먼트 매핑  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// ROI 기반 QP 조정
struct ROIEncoder {
    struct ROIRegion {
        int x, y, width, height;
        int qp_offset;  // 음수 = 고품질
    };

    std::vector<ROIRegion> regions;

    int get_qp_for_block(int block_x, int block_y, int base_qp) {
        // ROI 영역에 속하는지 확인
        for (const auto& roi : regions) {
            if (block_x >= roi.x && block_x < roi.x + roi.width &&
                block_y >= roi.y && block_y < roi.y + roi.height) {
                return base_qp + roi.qp_offset;
            }
        }
        return base_qp;  // ROI 밖은 기본 QP
    }

    // Segmentation 맵 생성
    void create_segment_map(int width, int height,
                           uint8_t* segment_ids) {
        for (int y = 0; y < height; y += 4) {
            for (int x = 0; x < width; x += 4) {
                segment_ids[y/4 * (width/4) + x/4] =
                    is_in_roi(x, y) ? 0 : 1;  // ROI=seg0, 배경=seg1
            }
        }
    }
};
```

### AQ 모드 선택

```
인코더별 AQ 옵션:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  SVT-AV1:                                           │
│    --aq-mode 0: AQ 비활성화                         │
│    --aq-mode 1: Variance AQ (기본값)               │
│    --aq-mode 2: Complexity AQ                      │
│                                                     │
│  libaom-av1:                                        │
│    --aq-mode=0: AQ 비활성화                         │
│    --aq-mode=1: Variance AQ                        │
│    --aq-mode=2: Complexity AQ                      │
│    --aq-mode=3: Cyclic Refresh                     │
│                                                     │
│  ffmpeg 예:                                         │
│    -svtav1-params "aq-mode=1"                       │
│    -aom-params "aq-mode=2"                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 28.4 실전 설정

### 품질 최적화

```bash
# 고품질 VOD (Temporal Filtering + AQ)
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -crf 25 \
    -preset 4 \
    -svtav1-params "aq-mode=1:tf=1:enable-tf=1" \
    output.mp4

# libaom (최고 품질)
ffmpeg -i input.mp4 \
    -c:v libaom-av1 \
    -crf 25 \
    -cpu-used 2 \
    -auto-alt-ref 1 \
    -lag-in-frames 25 \
    -aq-mode 2 \
    output.mp4
```

### 스트리밍 최적화

```bash
# 실시간 스트리밍 (AQ만, Temporal Filter 비활성화)
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -crf 35 \
    -preset 10 \
    -svtav1-params "aq-mode=1:tf=0" \
    output.mp4
```

---

## 정리

- **RDO**: J = D + λ × R 비용 함수로 최적 모드 선택
- **λ (라그랑주 승수)**: QP에서 유도, 비트-왜곡 트레이드오프 제어
- **Temporal Filtering**: 시간 축 필터링으로 노이즈 제거된 ALTREF 생성
- **Variance AQ**: 분산에 따라 QP 조정, 평탄 영역에 높은 품질
- **Perceptual AQ**: 인간 시각 모델 기반 품질 최적화
- **Delta Q**: Superblock 단위 QP 오프셋 (AV1 스펙)
- **ROI**: Segmentation으로 관심 영역에 높은 품질 할당

---

## 다음 장 예고

Ch 29에서는 **테스트 벡터**로 디코더를 검증한다. AOMedia 공식 테스트 벡터를 사용하여 구현의 정확성을 확인하고, 최종 마일스톤을 달성한다.

---

## 관련 항목

- [Ch 9: 변환과 양자화](/blog/media/av1/chapter09-transform-quantization) — QP, 양자화
- [Ch 18: Segmentation](/blog/media/av1/chapter18-segmentation) — ROI 구현
- [Ch 26: Rate Control](/blog/media/av1/chapter26-rate-control) — QP/λ 결정
- [Ch 27: GOP, Key Frame, LTR](/blog/media/av1/chapter27-gop-keyframe-ltr) — ALTREF 활용
