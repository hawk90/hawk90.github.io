---
title: "Ch 26: Rate Control"
date: 2026-05-16T03:00:00
description: "AV1 인코더의 Rate Control — CRF, CBR, VBR, 2-Pass, R-λ 모델."
tags: [AV1, Video, Codec, Encoder, Rate Control]
series: "AV1"
seriesOrder: 26
draft: true
---

지금까지 디코더 관점에서 AV1을 살펴봤다. 이제 **인코더**의 핵심 문제인 **Rate Control**(비트레이트 제어)을 다룬다. 디코더는 "주어진 것을 처리"하면 되지만, 인코더는 "무엇을 어떻게 보낼지" 매 블록마다 결정해야 한다.

```
인코더의 딜레마:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  비트 예산 = 제한됨 (네트워크, 저장 용량)           │
│                                                     │
│  Frame 1 ─┬─ 복잡한 장면 → 비트 많이 필요          │
│  Frame 2 ─┼─ 단순한 장면 → 비트 적게 필요          │
│  Frame 3 ─┼─ 빠른 움직임 → 비트 많이 필요          │
│  ...      │                                         │
│                                                     │
│  질문: "이 비트를 어디에 쓰는 게 가장 효과적인가?" │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 26.1 Rate Control이 필요한 이유

### 제약 조건들

비트레이트 제어가 필요한 이유는 다양한 제약 조건 때문이다.

```
1. 네트워크 대역폭:
   ┌─────────────────────────────────────────────────┐
   │ 스트리밍 서비스 예:                             │
   │   - HD (720p): 2~4 Mbps                         │
   │   - FHD (1080p): 4~8 Mbps                       │
   │   - 4K (2160p): 15~25 Mbps                      │
   │                                                 │
   │ 사용자 환경:                                    │
   │   - WiFi 불안정 → 순간 대역폭 변동              │
   │   - 모바일 네트워크 → 데이터 요금제             │
   │   - 라이브 스트리밍 → 고정 업링크               │
   └─────────────────────────────────────────────────┘

2. 저장 용량:
   - 2시간 영화 (4K): 수십~수백 GB 가능
   - OTT 서비스: 용량당 CDN 비용
   - 스마트폰 저장: 64~256GB 제한

3. 디코더 버퍼 (HRD/VBV):
   - 디코더가 가진 버퍼 크기는 제한됨
   - 버퍼 오버플로우 → 프레임 드랍
   - 버퍼 언더플로우 → 재생 끊김
```

### Rate Control vs RDO

```
Rate Control과 RDO의 관계:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Rate Control (프레임 레벨):                        │
│    - "이 프레임에 몇 비트를 할당할까?"              │
│    - 프레임 타입, 복잡도, 버퍼 상태 고려            │
│    - 결과: 프레임별 target_bits, QP                 │
│                                                     │
│  RDO (블록 레벨):                                   │
│    - "이 블록에 어떤 모드를 사용할까?"              │
│    - J = D + λ × R 최소화                           │
│    - 결과: 예측 모드, 변환 크기, 계수               │
│                                                     │
│  상호작용:                                          │
│    Rate Control → QP/λ 결정 → RDO에서 사용         │
│    RDO 결과 → 실제 비트 수 → Rate Control 피드백   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 26.2 CRF (Constant Rate Factor)

**CRF**는 "일정한 **지각 품질**"을 목표로 한다. 가장 널리 사용되는 품질 기반 인코딩 방식이다.

### 기본 개념

```
CRF 동작 원리:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  목표: 모든 프레임에서 비슷한 "지각 품질" 유지      │
│                                                     │
│  방법: QP를 프레임별로 자동 조정                    │
│    - 복잡한 장면 (텍스처, 움직임) → 비트↑, QP↓     │
│    - 단순한 장면 (평탄, 정지) → 비트↓, QP↑         │
│                                                     │
│  결과:                                              │
│    - 파일 크기는 콘텐츠에 따라 변동                 │
│    - 품질은 일정하게 유지                           │
│                                                     │
└─────────────────────────────────────────────────────┘

CRF 값 vs 품질/크기:
┌────────┬────────────────┬─────────────────┐
│ CRF    │ 품질           │ 파일 크기       │
├────────┼────────────────┼─────────────────┤
│ 0-15   │ 거의 무손실    │ 매우 큼         │
│ 18-23  │ 고품질         │ 큼              │
│ 23-30  │ 일반 품질      │ 적당            │
│ 30-40  │ 중간 품질      │ 작음            │
│ 40-51  │ 저품질         │ 매우 작음       │
│ 51-63  │ 최저 품질      │ 최소            │
└────────┴────────────────┴─────────────────┘

권장 범위 (AV1):
- 고품질 VOD: CRF 18-25
- 일반 VOD: CRF 25-32
- 저대역폭: CRF 32-40
```

### CRF에서 QP 결정

```cpp
// CRF 기반 QP 계산 (단순화된 모델)
struct CRFController {
    int crf;           // 목표 CRF (0-63)
    double complexity; // 프레임 복잡도 추정치

    int compute_qp(FrameType type, double complexity) {
        // 기본 QP = CRF 값
        int base_qp = crf;

        // 프레임 타입에 따른 오프셋
        int type_offset = 0;
        switch (type) {
            case KEY_FRAME:      type_offset = -2; break; // 높은 품질
            case INTRA_ONLY:     type_offset = -1; break;
            case INTER_FRAME:    type_offset = 0;  break;
            case ALTREF_FRAME:   type_offset = -3; break; // 참조용, 고품질
        }

        // 복잡도에 따른 조정
        // 복잡한 장면 → QP 낮춤 (더 많은 비트)
        // 단순한 장면 → QP 높임 (더 적은 비트)
        double complexity_factor = log2(complexity / avg_complexity);
        int complexity_offset = (int)(-2.0 * complexity_factor);

        // 최종 QP
        int qp = base_qp + type_offset + complexity_offset;
        return std::clamp(qp, 0, 63);
    }
};
```

### CRF의 장단점

| 장점 | 단점 |
|------|------|
| 일정한 지각 품질 | 파일 크기 예측 불가 |
| 설정이 간단 (CRF 값 하나) | 특정 비트레이트 맞추기 어려움 |
| 비트 효율 최적화 | 버퍼 모델 준수 보장 안 됨 |

### ffmpeg/SVT-AV1 예제

```bash
# CRF 모드 인코딩 (SVT-AV1)
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -crf 30 \
    -preset 5 \
    output.mp4

# libaom-av1
ffmpeg -i input.mp4 \
    -c:v libaom-av1 \
    -crf 30 \
    -b:v 0 \
    output.mp4

# SVT-AV1 직접 호출
SvtAv1EncApp -i input.y4m \
    --crf 30 \
    --preset 5 \
    -b output.ivf
```

---

## 26.3 CBR (Constant Bitrate)

**CBR**은 "고정 비트레이트"를 목표로 한다. 라이브 스트리밍이나 방송처럼 대역폭이 정해진 환경에서 사용한다.

### 기본 개념

```
CBR 동작 원리:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  목표: 출력 비트레이트를 목표 값에 정확히 맞춤      │
│                                                     │
│  방법:                                              │
│    1. 가상 버퍼(VBV/HRD) 모델 유지                  │
│    2. 버퍼 상태에 따라 QP 적극 조정                 │
│       - 버퍼가 차면 → QP↑ (비트 절약)              │
│       - 버퍼가 비면 → QP↓ (비트 사용)              │
│                                                     │
│  결과:                                              │
│    - 비트레이트는 일정 (±작은 변동)                 │
│    - 품질은 장면에 따라 변동                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### VBV (Video Buffering Verifier) 모델

VBV는 가상의 디코더 버퍼를 시뮬레이션한다.

```
VBV 버퍼 모델:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Buffer Size = vbv_bufsize                          │
│  Fill Rate = target_bitrate (bits/sec)             │
│                                                     │
│    입력 (일정 속도)     출력 (프레임 단위)          │
│         ↓                    ↓                      │
│    ┌──────────────────────────┐                     │
│    │    ████████░░░░░░░░░░░░  │ ← 현재 버퍼 레벨   │
│    └──────────────────────────┘                     │
│                                                     │
│  규칙:                                              │
│    - 버퍼 레벨 < 0 → 언더플로우 (재생 끊김)         │
│    - 버퍼 레벨 > bufsize → 오버플로우 (데이터 손실) │
│                                                     │
│  인코더의 책임:                                     │
│    - 각 프레임 크기를 조절하여 버퍼 규칙 준수      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// VBV 버퍼 시뮬레이션
struct VBVBuffer {
    int64_t buffer_size;    // 버퍼 크기 (비트)
    int64_t buffer_level;   // 현재 버퍼 레벨 (비트)
    int64_t bitrate;        // 목표 비트레이트 (bps)
    double frame_rate;      // 프레임 레이트

    // 프레임 인코딩 전: 버퍼에 비트 추가
    void fill_buffer() {
        int64_t bits_per_frame = bitrate / frame_rate;
        buffer_level += bits_per_frame;
        buffer_level = std::min(buffer_level, buffer_size);
    }

    // 프레임 인코딩 후: 버퍼에서 비트 소비
    bool consume_bits(int64_t frame_bits) {
        buffer_level -= frame_bits;
        if (buffer_level < 0) {
            // 언더플로우! 이 프레임은 너무 큼
            return false;
        }
        return true;
    }

    // QP 조정을 위한 버퍼 상태
    double get_fullness() {
        return (double)buffer_level / buffer_size;
    }

    // 다음 프레임의 최대 허용 비트
    int64_t max_frame_bits() {
        return buffer_level;  // 언더플로우 방지
    }
};
```

### CBR QP 조정

```cpp
// CBR 컨트롤러
struct CBRController {
    VBVBuffer vbv;
    int base_qp;

    int compute_qp(FrameType type) {
        double fullness = vbv.get_fullness();

        // 버퍼 상태에 따른 QP 조정
        int qp_adjustment = 0;

        if (fullness > 0.8) {
            // 버퍼가 거의 참 → QP 낮춤 (비트 더 사용)
            qp_adjustment = -4;
        } else if (fullness > 0.6) {
            qp_adjustment = -2;
        } else if (fullness > 0.4) {
            qp_adjustment = 0;  // 목표 영역
        } else if (fullness > 0.2) {
            qp_adjustment = +2;
        } else {
            // 버퍼가 거의 빔 → QP 높임 (비트 절약)
            qp_adjustment = +4;
        }

        // 프레임 타입 오프셋
        int type_offset = (type == KEY_FRAME) ? -2 : 0;

        int qp = base_qp + qp_adjustment + type_offset;
        return std::clamp(qp, 0, 63);
    }
};
```

### CBR의 장단점

| 장점 | 단점 |
|------|------|
| 비트레이트 예측 가능 | 품질 변동 |
| 대역폭 계획 용이 | 복잡한 장면에서 품질 저하 |
| 버퍼 모델 준수 | 단순한 장면에서 비트 낭비 |
| 라이브 스트리밍 적합 | CRF보다 효율 낮음 |

### ffmpeg 예제

```bash
# CBR 모드 (2 Mbps)
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -b:v 2M \
    -maxrate 2M \
    -bufsize 4M \
    output.mp4

# 더 엄격한 CBR
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -b:v 2M \
    -maxrate 2M \
    -minrate 2M \
    -bufsize 2M \
    output.mp4
```

---

## 26.4 VBR (Variable Bitrate)

**VBR**은 "평균 비트레이트"를 목표로 하되, 순간적인 변동을 허용한다. CRF와 CBR의 중간 지점이다.

### 기본 개념

```
VBR 동작:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  목표:                                              │
│    - 전체 평균 비트레이트 = target                  │
│    - 순간 비트레이트는 변동 허용                    │
│                                                     │
│  시간 →                                             │
│  비트레이트:                                        │
│       ↑                                             │
│  max  │        ╱╲                                   │
│       │       ╱  ╲    ╱╲                            │
│  avg  │──────────────────── (목표 평균)             │
│       │  ╲  ╱      ╲╱  ╲╱                           │
│  min  │   ╲╱                                        │
│       └──────────────────────────→ 시간             │
│                                                     │
│  복잡한 장면: 비트레이트↑ (max까지)                │
│  단순한 장면: 비트레이트↓ (min까지)                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### VBR 파라미터

```
VBR 설정:
- target_bitrate: 목표 평균 비트레이트
- max_bitrate: 최대 순간 비트레이트 (피크)
- min_bitrate: 최소 순간 비트레이트 (선택적)
- bufsize: VBV 버퍼 크기

일반적인 설정:
- max_bitrate = 1.5 × target_bitrate
- bufsize = 2 × target_bitrate (2초 분량)

예: target=4Mbps
- max_bitrate = 6 Mbps
- bufsize = 8 Mb (= 8,000,000 bits)
```

### VBR 구현

```cpp
// VBR 컨트롤러
struct VBRController {
    int64_t target_bitrate;    // bps
    int64_t max_bitrate;       // bps
    int64_t min_bitrate;       // bps
    VBVBuffer vbv;

    // 비트 예산 계산
    int64_t bits_used;         // 지금까지 사용한 비트
    int frames_encoded;        // 인코딩된 프레임 수
    double frame_rate;

    int64_t compute_target_bits() {
        // 지금까지의 평균 비트레이트
        double elapsed_time = frames_encoded / frame_rate;
        int64_t expected_bits = target_bitrate * elapsed_time;
        int64_t deviation = expected_bits - bits_used;

        // 기본 프레임 비트
        int64_t base_bits = target_bitrate / frame_rate;

        // 편차 보정 (지수 평활)
        double correction_factor = 0.1;
        int64_t target = base_bits + deviation * correction_factor;

        // 상한/하한 적용
        int64_t max_frame_bits = max_bitrate / frame_rate;
        int64_t min_frame_bits = min_bitrate / frame_rate;

        return std::clamp(target, min_frame_bits, max_frame_bits);
    }

    int compute_qp(int64_t target_bits, double complexity) {
        // 복잡도와 목표 비트에서 QP 추정
        // R = α × 2^(-QP/6) × complexity 모델 사용
        double alpha = estimate_alpha();
        double qp = 6.0 * log2(alpha * complexity / target_bits);
        return std::clamp((int)qp, 0, 63);
    }
};
```

### VBR의 장단점

| 장점 | 단점 |
|------|------|
| 파일 크기 예측 가능 | CBR보다 버퍼 관리 복잡 |
| CRF보다 크기 제어 용이 | CRF보다 품질 효율 낮음 |
| 복잡한 장면에 비트 할당 | 설정 파라미터 많음 |

### ffmpeg 예제

```bash
# VBR 모드 (평균 4Mbps, 최대 6Mbps)
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -b:v 4M \
    -maxrate 6M \
    -bufsize 8M \
    output.mp4
```

---

## 26.5 2-Pass Encoding

**2-Pass 인코딩**은 두 번의 패스로 최적의 비트 분배를 달성한다.

### 동작 원리

```
2-Pass 인코딩:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Pass 1 (분석):                                     │
│    - 전체 비디오 스캔                               │
│    - 각 프레임의 복잡도 측정                        │
│    - 장면 전환 탐지                                 │
│    - 통계 파일에 저장                               │
│                                                     │
│  통계 파일:                                         │
│    Frame 0: complexity=1200, type=KEY, scene=0      │
│    Frame 1: complexity=800, type=P, scene=0         │
│    Frame 2: complexity=850, type=P, scene=0         │
│    Frame 30: complexity=2500, type=P, scene=1 ← 장면 전환
│    ...                                              │
│                                                     │
│  Pass 2 (인코딩):                                   │
│    - 전체 복잡도 합계 계산                          │
│    - 각 프레임에 복잡도 비례 비트 할당              │
│    - 실제 인코딩 수행                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 비트 분배 공식

```cpp
// 2-Pass 비트 분배
struct TwoPassController {
    std::vector<FrameStats> stats;  // 1st pass 통계
    int64_t total_budget;           // 전체 비트 예산

    void prepare_allocation() {
        // 전체 복잡도 합계
        double total_complexity = 0;
        for (const auto& s : stats) {
            total_complexity += s.complexity;
        }

        // 각 프레임에 비트 할당
        for (auto& s : stats) {
            // 복잡도 비례 분배
            double ratio = s.complexity / total_complexity;
            s.target_bits = total_budget * ratio;

            // 프레임 타입 가중치
            if (s.type == KEY_FRAME) {
                s.target_bits *= 1.5;  // 키 프레임에 더 많은 비트
            }

            // 장면 전환 보너스
            if (s.scene_change) {
                s.target_bits *= 1.2;
            }
        }

        // 정규화 (총 비트가 예산과 맞도록)
        normalize_allocation();
    }

    int64_t get_target_bits(int frame_num) {
        return stats[frame_num].target_bits;
    }
};
```

### 복잡도 측정

```cpp
// 1st Pass 복잡도 측정
double measure_complexity(const Frame& frame, const Frame& prev) {
    double complexity = 0;

    // 방법 1: Intra 비용
    // 각 블록을 Intra로 인코딩했을 때의 비용 추정
    for (int y = 0; y < frame.height; y += 16) {
        for (int x = 0; x < frame.width; x += 16) {
            complexity += estimate_intra_cost(frame, x, y);
        }
    }

    // 방법 2: 프레임 간 차이 (SAD/SATD)
    int64_t sad = 0;
    for (int i = 0; i < frame.pixels; i++) {
        sad += abs(frame.data[i] - prev.data[i]);
    }
    complexity += sad;

    // 방법 3: 분산 (텍스처 복잡도)
    complexity += compute_variance(frame);

    return complexity;
}
```

### 2-Pass의 장단점

| 장점 | 단점 |
|------|------|
| 최적의 비트 분배 | 2배의 처리 시간 |
| 정확한 파일 크기 | 실시간 불가 |
| 전체 콘텐츠 인식 | 추가 저장 공간 (통계 파일) |

### ffmpeg 예제

```bash
# 2-Pass 인코딩 (SVT-AV1)
# Pass 1
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -b:v 4M \
    -pass 1 \
    -f null /dev/null

# Pass 2
ffmpeg -i input.mp4 \
    -c:v libsvtav1 \
    -b:v 4M \
    -pass 2 \
    output.mp4

# libaom-av1 (더 정확한 2-pass)
# Pass 1
ffmpeg -i input.mp4 \
    -c:v libaom-av1 \
    -b:v 4M \
    -pass 1 \
    -cpu-used 4 \
    -f null /dev/null

# Pass 2
ffmpeg -i input.mp4 \
    -c:v libaom-av1 \
    -b:v 4M \
    -pass 2 \
    -cpu-used 4 \
    output.mp4
```

---

## 26.6 Rate Control 수학

### R-λ 모델

Rate Control의 핵심은 **비트레이트(R)**와 **라그랑주 승수(λ)**의 관계다.

```
R-λ 모델:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  기본 관계: R = α × λ^β                             │
│                                                     │
│  R: 비트레이트 (bits per pixel)                     │
│  λ: 라그랑주 승수 (RDO에서 사용)                    │
│  α, β: 모델 파라미터 (콘텐츠 의존)                  │
│                                                     │
│  일반적으로:                                        │
│    - β ≈ -0.5 ~ -1.5                               │
│    - α는 콘텐츠 복잡도에 비례                       │
│                                                     │
│  역함수: λ = (R/α)^(1/β)                            │
│                                                     │
│  활용:                                              │
│    target_bits 결정 → 해당 R 계산 → λ 도출 → RDO   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### λ와 QP의 관계

```
λ-QP 관계:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  일반적 근사:                                       │
│    λ = 0.85 × 2^((QP - 12) / 3)                    │
│                                                     │
│  또는:                                              │
│    QP = 12 + 3 × log₂(λ / 0.85)                    │
│                                                     │
│  QP    λ (근사)                                     │
│  ─────────────────                                  │
│  10    0.34                                         │
│  20    2.69                                         │
│  30    21.5                                         │
│  40    172                                          │
│  50    1376                                         │
│                                                     │
│  λ가 크면: 비트 절약 우선 (품질↓)                  │
│  λ가 작으면: 화질 우선 (비트↑)                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// λ-QP 변환
double qp_to_lambda(int qp) {
    return 0.85 * pow(2.0, (qp - 12) / 3.0);
}

int lambda_to_qp(double lambda) {
    double qp = 12 + 3.0 * log2(lambda / 0.85);
    return std::clamp((int)round(qp), 0, 63);
}
```

### 버퍼 기반 QP 조정

```cpp
// 버퍼 기반 Rate Control
struct BufferBasedRC {
    VBVBuffer vbv;
    double target_fullness = 0.5;  // 목표 버퍼 충전율

    // PID 컨트롤러 파라미터
    double Kp = 2.0;   // 비례 게인
    double Ki = 0.1;   // 적분 게인
    double Kd = 0.5;   // 미분 게인

    double error_integral = 0;
    double prev_error = 0;

    int compute_qp_adjustment() {
        double fullness = vbv.get_fullness();
        double error = target_fullness - fullness;

        // PID 제어
        error_integral += error;
        double error_derivative = error - prev_error;
        prev_error = error;

        double adjustment = Kp * error +
                           Ki * error_integral +
                           Kd * error_derivative;

        // 조정값을 QP 변화로 변환
        // fullness 낮음 → error 양수 → QP 높임
        return (int)(-adjustment * 10);  // 스케일링
    }
};
```

### Rate-Distortion 최적화 (RDO)

```
RDO 기본 공식:
┌─────────────────────────────────────────────────────┐
│                                                     │
│  비용 함수: J = D + λ × R                           │
│                                                     │
│  D: 왜곡 (Distortion)                               │
│     - MSE: Σ(original - reconstructed)² / N         │
│     - SSE: Σ(original - reconstructed)²             │
│     - SATD: Σ|Hadamard(residual)|                   │
│                                                     │
│  R: 비트 수 (Rate)                                  │
│     - 예측 모드 시그널링 비트                       │
│     - 잔차 계수 인코딩 비트                         │
│                                                     │
│  λ: 라그랑주 승수                                   │
│     - Rate Control에서 결정된 값 사용               │
│                                                     │
│  최적화: argmin_mode J(mode)                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```cpp
// RDO 모드 선택
struct RDOSelector {
    double lambda;

    int select_best_mode(const Block& block,
                        const std::vector<int>& candidate_modes) {
        int64_t best_cost = INT64_MAX;
        int best_mode = 0;

        for (int mode : candidate_modes) {
            // 예측 수행
            Block prediction = predict(block, mode);

            // 잔차 계산
            Block residual = block - prediction;

            // 왜곡 계산 (SSE)
            int64_t D = compute_sse(residual);

            // 비트 수 추정
            int64_t R = estimate_bits(mode, residual);

            // RD 비용
            int64_t cost = D + (int64_t)(lambda * R);

            if (cost < best_cost) {
                best_cost = cost;
                best_mode = mode;
            }
        }

        return best_mode;
    }
};
```

---

## 26.7 Rate Control 모드 비교

### 사용 사례별 선택

| 사용 사례 | 권장 모드 | 이유 |
|-----------|-----------|------|
| VOD (품질 우선) | CRF | 일정한 지각 품질 |
| VOD (용량 제한) | 2-Pass VBR | 정확한 크기 + 품질 최적화 |
| 라이브 스트리밍 | CBR | 대역폭 예측 필수 |
| ABR 스트리밍 | VBR | 품질 변동 허용, 평균 제어 |
| 실시간 통신 | CBR/VBR | 저지연 + 대역폭 적응 |
| 아카이빙 | CRF (낮은 값) | 최고 품질 보존 |

### 파라미터 추천

```
VOD 인코딩 (품질 우선):
┌─────────────────────────────────────────────────────┐
│ 해상도      CRF    Preset   비고                    │
├─────────────────────────────────────────────────────┤
│ 4K (2160p) 26-30   4-6      느린 인코딩, 고품질     │
│ FHD (1080p) 28-32  4-6      일반적 사용             │
│ HD (720p)  30-34   5-7      빠른 인코딩             │
│ SD (480p)  32-36   6-8      모바일/저대역폭         │
└─────────────────────────────────────────────────────┘

스트리밍 (ABR, 대역폭 우선):
┌─────────────────────────────────────────────────────┐
│ 해상도      Target   Max      Buffer                │
├─────────────────────────────────────────────────────┤
│ 4K         15Mbps   20Mbps   30Mb (2s)             │
│ 1080p      6Mbps    8Mbps    12Mb (2s)             │
│ 720p       3Mbps    4Mbps    6Mb (2s)              │
│ 480p       1.5Mbps  2Mbps    3Mb (2s)              │
└─────────────────────────────────────────────────────┘
```

---

## 정리

- **CRF**: 일정한 지각 품질 목표, QP 자동 조정, 파일 크기 가변
- **CBR**: 고정 비트레이트, VBV 버퍼 모델 준수, 품질 가변
- **VBR**: 평균 비트레이트 목표, 순간 변동 허용, CRF와 CBR의 중간
- **2-Pass**: 1st pass 분석 + 2nd pass 최적 분배, 최고 효율
- **R-λ 모델**: R = α × λ^β, Rate Control과 RDO 연결
- **RDO**: J = D + λ × R 최소화, 블록 레벨 모드 선택
- **버퍼 모델**: VBV/HRD, 디코더 버퍼 오버플로우/언더플로우 방지

---

## 다음 장 예고

Ch 27에서는 **GOP, Key Frame, LTR**을 다룬다. 프레임 레벨에서 어떤 프레임을 언제 만들고, 어떤 참조를 유지할지 전략을 살펴본다.

---

## 관련 항목

- [Ch 9: 변환과 양자화](/blog/media/av1/chapter09-transform-quantization) — QP와 양자화
- [Ch 23: Decoder Model](/blog/media/av1/chapter23-decoder-model) — 버퍼 모델 제약
- [Ch 25: Container와 Transport](/blog/media/av1/chapter25-container-transport) — 컨테이너
- [Ch 27: GOP, Key Frame, LTR](/blog/media/av1/chapter27-gop-keyframe-ltr) — 프레임 전략
