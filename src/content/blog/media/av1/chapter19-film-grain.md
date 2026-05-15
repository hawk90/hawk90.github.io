---
title: "Ch 19: Film Grain"
date: 2025-10-01T20:00:00
description: "AV1의 Film Grain Synthesis — AR 모델, 그레인 템플릿, 스케일링 곡선."
tags: [AV1, Video, Codec, Film Grain, Synthesis]
series: "AV1"
seriesOrder: 19
draft: false
---

Ch 16~18에서 디블로킹, CDEF, Loop Restoration으로 3단 필터 파이프라인을 완성했다. 이 필터들은 **복원 품질**을 높이는 데 집중한다. 그런데 필름 영상에는 독특한 질감이 있다 — **필름 그레인(film grain)**이다.

이 장에서는 AV1의 **Film Grain Synthesis**를 다룬다. 인코딩 시 제거했던 그레인을 디코더에서 합성으로 복원하는 기술이다. "복원"이 아닌 "재합성"이라는 점이 핵심이다.

---

## 19.1 왜 그레인을 따로 처리하는가

### Film Grain의 특성

필름 그레인은 아날로그 필름 촬영 시 감광 입자가 만드는 랜덤 패턴이다:

```
필름 그레인의 특징:
1. 고주파: 매우 미세한 점/얼룩 패턴
2. 랜덤: 예측 불가능한 패턴
3. 시간적 비상관: 매 프레임마다 다른 패턴
4. 밝기 의존: 어두운 영역에서 더 강함
```

디지털에서도 의도적으로 그레인을 추가하는 경우가 많다. 영화적 느낌을 주거나, 디지털 노이즈를 숨기거나, 밴딩(banding) 아티팩트를 완화하기 위해서다.

### 인코더 입장에서의 문제

그레인은 압축의 **적(敵)**이다:

```
일반 영상:
  프레임 N:   [배경] [인물]
  프레임 N+1: [배경] [인물] (거의 동일)
  → Inter 예측 잘 됨 → 잔차 작음 → 비트 적게 필요

그레인 있는 영상:
  프레임 N:   [배경+그레인A] [인물+그레인A]
  프레임 N+1: [배경+그레인B] [인물+그레인B] (그레인 완전 다름!)
  → Inter 예측 실패 → 잔차 큼 → 비트 많이 필요
```

그레인은 매 프레임 랜덤하므로:
- Intra 예측 불가 (이웃 픽셀과 상관 낮음)
- Inter 예측 불가 (이전 프레임과 상관 낮음)
- 모든 그레인을 잔차로 전송해야 함 → **엄청난 비트 낭비**

### AV1의 전략: 분리 + 재합성

AV1은 그레인을 "따로" 처리한다:

```
┌─────────────────────────────────────────────────────────┐
│ [인코더]                                                │
│                                                         │
│ 원본 (그레인 있음)                                       │
│     │                                                   │
│     ├─→ 그레인 추정 (분석)                              │
│     │        │                                          │
│     │        ▼                                          │
│     │   그레인 파라미터 (AR 계수, 스케일링 곡선 등)       │
│     │        │                                          │
│     ▼        │                                          │
│ 그레인 제거 (깨끗한 영상)                                │
│     │        │                                          │
│     ▼        │                                          │
│ 일반 압축    │                                          │
│     │        │                                          │
│     ▼        ▼                                          │
│ [비트스트림] = 압축된 영상 + 그레인 파라미터              │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ [디코더]                                                │
│                                                         │
│ 깨끗한 영상 디코딩                                       │
│     │                                                   │
│     ▼                                                   │
│ 3단 필터 (Deblocking → CDEF → Loop Restoration)         │
│     │                                                   │
│     ▼                                                   │
│ Film Grain Synthesis (파라미터로 그레인 합성)            │
│     │                                                   │
│     ▼                                                   │
│ 최종 출력 (그레인 복원됨)                                │
└─────────────────────────────────────────────────────────┘
```

효과:
- **비트레이트 대폭 절감**: 그레인 자체는 전송 안 함, 파라미터만 전송 (~수백 바이트)
- **시각적 유사성**: 합성된 그레인이 원본과 통계적으로 유사
- **유연성**: 디코더가 그레인 적용 여부/강도 조절 가능

### 적용 위치

Film Grain은 **루프 외부**에서 적용된다:

```
복원 → Deblocking → CDEF → Loop Restoration → [참조 버퍼]
                                                    │
                                          Film Grain Synthesis
                                                    │
                                                    ▼
                                              [디스플레이]
```

참조 버퍼에는 깨끗한 영상이 저장된다. 그레인은 **디스플레이 직전에만** 합성한다. 다음 프레임의 Inter 예측은 깨끗한 버전을 참조한다.

---

## 19.2 AR(Autoregressive) Grain Model

AV1은 **AR(Autoregressive) 모델**로 그레인 패턴을 생성한다.

### AR 모델의 수학적 정의

```
grain[y][x] = Σᵢ Σⱼ coeff[i][j] × grain[y-i][x-j] + noise

- grain[y][x]: 현재 위치의 그레인 값
- coeff[i][j]: AR 계수 (전송됨)
- grain[y-i][x-j]: 이전 위치의 그레인 값
- noise: 백색 잡음 (PRNG으로 생성)
```

직관적으로:
- 현재 그레인 = 이전 위치 그레인들의 **가중 평균** + 랜덤 노이즈
- 계수(coeff)가 그레인의 **공간적 상관관계**를 결정
- 노이즈가 그레인의 **랜덤성**을 결정

### AR Lag

**AR lag**는 참조하는 이전 행의 수다:

```
AR lag = 2:
  참조 영역:
  ○ ○ ○ ○ ○
  ○ ○ ○ ○ ○
  ○ ○ C × ×    C = 현재 위치
                   ○ = 참조 가능
                   × = 아직 생성 안 됨

AR lag = 3:
  참조 영역:
  ○ ○ ○ ○ ○ ○ ○
  ○ ○ ○ ○ ○ ○ ○
  ○ ○ ○ ○ ○ ○ ○
  ○ ○ ○ C × × ×
```

AR lag가 클수록:
- 더 넓은 영역의 상관관계 모델링
- 더 많은 계수 필요 (더 많은 비트)
- 더 복잡한 그레인 패턴 표현 가능

### 루마 그레인

```cpp
// 루마 그레인 템플릿 생성
void generate_luma_grain_template(int grain[64][64],
                                  const int* ar_coeffs, int ar_lag,
                                  uint16_t* prng_seed) {
    // AR lag에 따른 계수 개수
    // lag=0: 0개 (순수 노이즈)
    // lag=1: 3개
    // lag=2: 8개
    // lag=3: 24개

    for (int y = 0; y < 64; y++) {
        for (int x = 0; x < 64; x++) {
            // 1단계: 백색 잡음 생성
            int noise = gaussian_rand(prng_seed);

            // 2단계: AR 필터 적용
            int ar_sum = 0;
            int coeff_idx = 0;

            // 이전 행들에서 참조
            for (int dy = -ar_lag; dy <= 0; dy++) {
                for (int dx = -3; dx <= 3; dx++) {
                    // 현재 행에서는 현재 위치 이전만 참조
                    if (dy == 0 && dx >= 0) continue;
                    // 범위 체크
                    if (y + dy < 0) continue;
                    if (x + dx < 0 || x + dx >= 64) continue;

                    ar_sum += ar_coeffs[coeff_idx] * grain[y + dy][x + dx];
                    coeff_idx++;
                }
            }

            // 3단계: 노이즈 + AR 합
            grain[y][x] = clip_grain(noise + (ar_sum >> AR_PRECISION));
        }
    }
}
```

루마 그레인 템플릿은 **64×64** 크기다.

### 크로마 그레인

크로마는 루마와의 **상관관계**까지 모델링한다:

```cpp
// 크로마 그레인 템플릿 생성
void generate_chroma_grain_template(int grain_chroma[32][32],
                                    const int grain_luma[64][64],
                                    const int* ar_coeffs, int ar_lag,
                                    int luma_coeff,  // 루마 의존 계수
                                    uint16_t* prng_seed) {
    for (int y = 0; y < 32; y++) {
        for (int x = 0; x < 32; x++) {
            // 1단계: 백색 잡음
            int noise = gaussian_rand(prng_seed);

            // 2단계: AR 필터 (크로마 자체)
            int ar_sum = 0;
            // ... (루마와 유사)

            // 3단계: 루마 그레인과의 상관관계 추가
            // 크로마 위치에 해당하는 루마 그레인 참조
            int luma_y = y * 2;  // 4:2:0 서브샘플링 고려
            int luma_x = x * 2;
            int luma_contribution = luma_coeff * grain_luma[luma_y][luma_x];

            // 4단계: 합산
            grain_chroma[y][x] = clip_grain(
                noise + (ar_sum >> AR_PRECISION) + (luma_contribution >> AR_PRECISION)
            );
        }
    }
}
```

수식으로:

```
grain_chroma[y][x] = Σᵢⱼ coeff[i][j] × grain_chroma[y-i][x-j]
                   + coeff_luma × grain_luma[2y][2x]   // 루마 의존
                   + noise
```

크로마 그레인 템플릿은 **32×32** 크기다 (4:2:0 서브샘플링).

---

## 19.3 그레인 파라미터 파싱

### 파라미터 위치

Film Grain 파라미터는 **Frame Header**에 포함된다 (스펙 Section 5.9.30 `film_grain_params()`):

```cpp
struct FilmGrainParams {
    // 기본 제어
    bool apply_grain;           // 그레인 적용 여부
    uint16_t grain_seed;        // 난수 시드
    bool update_grain;          // 이전 프레임 파라미터 재사용?

    // 스케일링 곡선 제어점
    int num_y_points;           // 루마 제어점 수 (0~14)
    uint8_t point_y_value[14];  // 루마 값 (0~255)
    uint8_t point_y_scaling[14]; // 해당 위치의 그레인 강도

    int num_cb_points;          // Cb 제어점 수
    int num_cr_points;          // Cr 제어점 수
    // ... cb, cr 제어점들

    // AR 계수
    int ar_coeff_lag;           // AR lag (0~3)
    int8_t ar_coeffs_y[24];     // 루마 AR 계수 (+128 오프셋)
    int8_t ar_coeffs_cb[25];    // Cb AR 계수 (루마 의존 계수 포함)
    int8_t ar_coeffs_cr[25];    // Cr AR 계수

    // 기타
    int grain_scale_shift;      // 그레인 크기 스케일링
    bool overlap_flag;          // 블록 간 오버랩 블렌딩
    bool clip_to_restricted_range;
};
```

### 조건부 파싱

Film Grain은 Sequence Header에서 활성화되어야 한다:

```cpp
void parse_film_grain_params(BitReader* br, FilmGrainParams* params,
                             const SequenceHeader* seq) {
    // Sequence Header에서 film_grain_params_present가 0이면 스킵
    if (!seq->film_grain_params_present) {
        params->apply_grain = false;
        return;
    }

    params->apply_grain = br->read_bit();
    if (!params->apply_grain) {
        return;  // 그레인 미적용
    }

    params->grain_seed = br->read_bits(16);
    params->update_grain = br->read_bit();

    if (!params->update_grain) {
        // 이전 프레임 파라미터 재사용
        int ref_idx = br->read_bits(3);
        // params를 참조 프레임에서 복사
        return;
    }

    // 새 파라미터 파싱
    parse_scaling_points(br, params);
    parse_ar_coefficients(br, params);
    // ...
}
```

### 스케일링 곡선

스케일링 곡선은 **밝기에 따른 그레인 강도**를 결정한다:

```
제어점 예시 (num_y_points = 4):

point_y_value:   [32, 80, 176, 224]
point_y_scaling: [40, 60,  80,  40]

그래프:
     강도
      ^
  80  │        ___
  60  │    ___/   \
  40  │___/        \___
      └───┼───┼───┼───► 밝기
          32  80 176 224

해석:
- 밝기 32 이하: 강도 40 (어두운 영역)
- 밝기 80: 강도 60
- 밝기 176: 강도 80 (중간 밝기에서 최대)
- 밝기 224 이상: 강도 40 (밝은 영역)
```

실제 필름에서 어두운 영역과 밝은 영역의 그레인 특성이 다르기 때문에 이런 곡선이 필요하다.

구간 선형 보간:

```cpp
int get_scaling_value(const FilmGrainParams* params, int luma_value) {
    // 제어점 간 선형 보간
    for (int i = 0; i < params->num_y_points - 1; i++) {
        int x0 = params->point_y_value[i];
        int x1 = params->point_y_value[i + 1];
        if (luma_value >= x0 && luma_value < x1) {
            int y0 = params->point_y_scaling[i];
            int y1 = params->point_y_scaling[i + 1];
            // 선형 보간
            return y0 + (y1 - y0) * (luma_value - x0) / (x1 - x0);
        }
    }
    // 범위 밖: 첫 번째 또는 마지막 값
    if (luma_value < params->point_y_value[0])
        return params->point_y_scaling[0];
    return params->point_y_scaling[params->num_y_points - 1];
}
```

---

## 19.4 PRNG (의사 난수 생성기)

### LFSR (Linear Feedback Shift Register)

AV1은 16-bit LFSR로 난수를 생성한다:

```cpp
// 16-bit LFSR PRNG
uint16_t prng_step(uint16_t* state) {
    // 탭 위치: 0, 1, 3, 12
    uint16_t bit = ((*state >> 0) ^ (*state >> 1) ^
                    (*state >> 3) ^ (*state >> 12)) & 1;
    *state = (*state >> 1) | (bit << 15);
    return *state;
}
```

시각화:

```
LFSR 동작:

  비트:  15 14 13 12 11 10  9  8  7  6  5  4  3  2  1  0
         ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
state:   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
         └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
                    ↑                          ↑     ↑  ↑
                    │                          │     │  │
                    └──────────────────────────┴─────┴──┴─→ XOR → new bit
                                                              │
                                                              ▼
                                                           bit 15
                    ←──────────── 오른쪽 시프트 ──────────────
```

### 가우시안 노이즈 생성

백색 잡음은 **가우시안 LUT(Look-Up Table)**에서 샘플링한다:

```cpp
// 사전 계산된 가우시안 분포 테이블 (256개 엔트리)
const int8_t gaussian_lut[256] = {
    // 표준 정규 분포를 양자화한 값들
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // ... (중앙 집중, 양 끝은 드묾)
};

int gaussian_rand(uint16_t* prng_seed) {
    uint16_t rand_val = prng_step(prng_seed);
    int idx = rand_val & 0xFF;  // 하위 8비트 → LUT 인덱스
    int sign = (rand_val >> 8) & 1;  // 9번째 비트 → 부호
    int value = gaussian_lut[idx];
    return sign ? -value : value;
}
```

### 재현성

`grain_seed`가 같으면 **항상 같은 그레인 패턴**이 생성된다. 이것이 중요한 이유:
- 인코더와 디코더가 동일한 결과 생성
- 다중 디코더가 동일한 결과 생성
- seek 후에도 해당 프레임의 그레인이 동일

---

## 19.5 그레인 합성 프로세스

### 전체 과정

```cpp
void synthesize_film_grain(Frame* frame, const FilmGrainParams* params) {
    if (!params->apply_grain) {
        return;
    }

    // 1단계: PRNG 초기화
    uint16_t prng = params->grain_seed;

    // 2단계: 그레인 템플릿 생성
    int grain_luma[64][64];
    int grain_cb[32][32];
    int grain_cr[32][32];

    generate_luma_grain_template(grain_luma, params->ar_coeffs_y,
                                  params->ar_coeff_lag, &prng);
    generate_chroma_grain_template(grain_cb, grain_luma, params->ar_coeffs_cb,
                                   params->ar_coeff_lag,
                                   params->cb_luma_mult, &prng);
    generate_chroma_grain_template(grain_cr, grain_luma, params->ar_coeffs_cr,
                                   params->ar_coeff_lag,
                                   params->cr_luma_mult, &prng);

    // 3단계: 스케일링 LUT 생성
    int scaling_lut_y[256];
    int scaling_lut_cb[256];
    int scaling_lut_cr[256];

    build_scaling_lut(scaling_lut_y, params->point_y_value,
                     params->point_y_scaling, params->num_y_points);
    // ... cb, cr 스케일링 LUT

    // 4단계: 프레임의 각 블록에 그레인 적용
    apply_grain_to_frame(frame, grain_luma, grain_cb, grain_cr,
                         scaling_lut_y, scaling_lut_cb, scaling_lut_cr,
                         params, &prng);
}
```

### 블록별 그레인 적용

프레임을 **32×32 블록** 단위로 처리한다:

```cpp
void apply_grain_to_frame(Frame* frame, ..., uint16_t* prng) {
    int block_cols = (frame->width + 31) / 32;
    int block_rows = (frame->height + 31) / 32;

    for (int by = 0; by < block_rows; by++) {
        for (int bx = 0; bx < block_cols; bx++) {
            // 템플릿에서 랜덤 오프셋 선택
            int offset_y = (prng_step(prng) % 32);
            int offset_x = (prng_step(prng) % 32);

            apply_grain_to_block(frame, bx, by,
                                grain_luma, grain_cb, grain_cr,
                                offset_y, offset_x,
                                scaling_lut_y, scaling_lut_cb, scaling_lut_cr,
                                params);
        }
    }
}
```

### 단일 블록 처리

```cpp
void apply_grain_to_block(Frame* frame, int bx, int by,
                          const int grain_luma[64][64], ...,
                          int offset_y, int offset_x,
                          const int* scaling_lut_y, ...) {
    int start_x = bx * 32;
    int start_y = by * 32;

    // 루마 처리
    for (int y = 0; y < 32 && start_y + y < frame->height; y++) {
        for (int x = 0; x < 32 && start_x + x < frame->width; x++) {
            // 현재 픽셀 값
            int py = start_y + y;
            int px = start_x + x;
            int luma = frame->y_plane[py * frame->y_stride + px];

            // 템플릿에서 그레인 값 추출 (랜덤 오프셋 적용)
            int gy = (offset_y + y) % 64;
            int gx = (offset_x + x) % 64;
            int grain = grain_luma[gy][gx];

            // 스케일링 적용 (밝기에 따른 강도 조절)
            int scaling = scaling_lut_y[luma];
            grain = (grain * scaling) >> 8;

            // 그레인 합산
            int result = luma + grain;
            frame->y_plane[py * frame->y_stride + px] = clip_pixel(result);
        }
    }

    // 크로마 처리 (유사하게, 16×16 블록)
    // ...
}
```

### 오버랩 블렌딩

`overlap_flag`가 설정되면 블록 경계에서 그레인을 블렌딩한다:

```cpp
// 블록 경계에서 2픽셀 오버랩 블렌딩
if (params->overlap_flag && bx > 0) {
    // 왼쪽 경계 블렌딩 (2픽셀)
    for (int y = 0; y < 32; y++) {
        for (int x = 0; x < 2; x++) {
            // 현재 블록의 그레인
            int grain_curr = grain_luma[(offset_y + y) % 64][(offset_x + x) % 64];
            // 이전 블록의 그레인 (다른 오프셋)
            int grain_prev = grain_luma[(prev_offset_y + y) % 64][(prev_offset_x + 32 - 2 + x) % 64];
            // 블렌딩 (가중 평균)
            int weight = (x == 0) ? 1 : 2;  // 경계에 가까울수록 낮은 가중치
            grain = (grain_curr * weight + grain_prev * (3 - weight)) / 3;
        }
    }
}
```

오버랩 블렌딩은 블록 경계에서의 불연속을 방지한다:

```
오버랩 없음:               오버랩 있음:
┌───────┬───────┐          ┌───────┬───────┐
│ 그레인A│ 그레인B│          │ 그레인A│▓│ 그레인B│
│       │       │    →     │       │▓│       │
│       │       │          │       │▓│       │
└───────┴───────┘          └───────┴───────┘
    ↑                              ▓ = 블렌딩 영역
블록 경계에서
급격한 변화
```

---

## 19.6 synthesize_film_grain() 전체 구현

```cpp
void synthesize_film_grain(Frame* frame, const FilmGrainParams* params) {
    if (!params->apply_grain || params->num_y_points == 0) {
        return;
    }

    // 1. PRNG 초기화
    uint16_t prng = params->grain_seed;

    // 2. 그레인 템플릿 생성
    int grain_luma[64][64] = {0};
    int grain_cb[32][32] = {0};
    int grain_cr[32][32] = {0};

    if (params->ar_coeff_lag > 0) {
        generate_ar_grain(grain_luma, 64, params->ar_coeffs_y,
                         params->ar_coeff_lag, params->grain_scale_shift, &prng);
    } else {
        // AR lag=0: 순수 가우시안 노이즈
        for (int y = 0; y < 64; y++) {
            for (int x = 0; x < 64; x++) {
                grain_luma[y][x] = gaussian_rand(&prng) << params->grain_scale_shift;
            }
        }
    }

    // 크로마 템플릿 (루마 의존성 포함)
    if (params->num_cb_points > 0 || params->chroma_scaling_from_luma) {
        generate_chroma_grain(grain_cb, grain_luma, params, true, &prng);
    }
    if (params->num_cr_points > 0 || params->chroma_scaling_from_luma) {
        generate_chroma_grain(grain_cr, grain_luma, params, false, &prng);
    }

    // 3. 스케일링 LUT 구축
    int scaling_lut_y[256];
    build_scaling_lut(scaling_lut_y, params->point_y_value,
                     params->point_y_scaling, params->num_y_points);

    // 4. 블록별 그레인 적용
    int block_cols = (frame->width + 31) / 32;
    int block_rows = (frame->height + 31) / 32;

    int prev_offset_y = 0, prev_offset_x = 0;

    for (int by = 0; by < block_rows; by++) {
        for (int bx = 0; bx < block_cols; bx++) {
            // 블록별 랜덤 오프셋
            int offset_y = prng_step(&prng) % 32;
            int offset_x = prng_step(&prng) % 32;

            // 루마 그레인 적용
            apply_luma_grain_block(frame, bx, by,
                                  grain_luma, offset_y, offset_x,
                                  scaling_lut_y, params,
                                  prev_offset_y, prev_offset_x);

            // 크로마 그레인 적용
            if (params->num_cb_points > 0) {
                apply_chroma_grain_block(frame, bx, by, 1,  // Cb
                                        grain_cb, offset_y / 2, offset_x / 2,
                                        params);
            }
            if (params->num_cr_points > 0) {
                apply_chroma_grain_block(frame, bx, by, 2,  // Cr
                                        grain_cr, offset_y / 2, offset_x / 2,
                                        params);
            }

            prev_offset_y = offset_y;
            prev_offset_x = offset_x;
        }
    }
}
```

---

## 19.7 Film Grain의 효과

### 비트레이트 절감

```
그레인 있는 원본 영상:
- 그대로 인코딩: 10 Mbps 필요

AV1 Film Grain 적용:
- 깨끗한 영상 인코딩: 6 Mbps
- 그레인 파라미터: ~0.1 Mbps (프레임당 수백 바이트)
- 총: ~6.1 Mbps

절감: ~40%
```

### 시각적 품질

```
        │
  품질  │        ★ 원본 (그레인 있음)
        │
        │    ▲ AV1 + Film Grain
        │        (거의 원본 수준)
        │
        │  ● 그레인 없이 디코딩
        │        (깨끗하지만 "디지털" 느낌)
        │
        │  × 그레인 그대로 인코딩
        │        (저품질, 아티팩트 많음)
        │
        └────────────────────────► 비트레이트
```

### 적용 시나리오

```
Film Grain이 효과적인 경우:
- 필름 촬영 영화 (실제 필름 그레인)
- 의도적 그레인 추가 영상 (예술적 효과)
- 저조도 촬영 (카메라 노이즈가 그레인처럼 보임)
- 오래된 영상 복원 (원본 그레인 보존)

Film Grain이 불필요한 경우:
- 애니메이션 (그레인 없음)
- 깨끗한 스튜디오 촬영
- 컴퓨터 그래픽 (CG)
- 스크린 캡처
```

---

## 정리

이 장에서 배운 내용:

- **Film Grain의 문제**: 고주파, 랜덤, 시간 비상관 → 압축 효율 저하
- **AV1 전략**: 인코더에서 그레인 제거 → 파라미터만 전송 → 디코더에서 합성
- **AR 모델**: `grain[y][x] = Σ coeff × grain[이전] + noise`
- **루마 템플릿**: 64×64, 최대 24개 AR 계수
- **크로마 템플릿**: 32×32, 루마 의존 계수 포함
- **스케일링 곡선**: 밝기에 따른 그레인 강도 조절
- **PRNG**: 16-bit LFSR, grain_seed로 재현성 보장
- **적용 위치**: 루프 외부 (Loop Restoration 이후, 디스플레이 직전)

Film Grain Synthesis로 **비트레이트는 대폭 절감**하면서 **원본의 질감은 복원**할 수 있다.

---

## 다음 장 예고

Ch 20에서는 **타일과 병렬 디코딩**을 다룬다. 프레임을 독립적인 타일로 나누어 병렬 처리하는 방법과 세그멘테이션을 살펴본다.

---

## 관련 항목

- [Ch 18: Loop Restoration](/blog/media/av1/part5-filters/chapter18-loop-restoration) — Film Grain 직전 단계
- [Ch 10: 프레임 조립](/blog/media/av1/part4-prediction/chapter10-frame-assembly) — 전체 디코딩 파이프라인
- [Ch 5: Frame Header](/blog/media/av1/part2-bitstream/chapter05-frame-header) — film_grain_params 위치
