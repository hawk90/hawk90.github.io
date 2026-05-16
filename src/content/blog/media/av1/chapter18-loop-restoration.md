---
title: "Ch 18: Loop Restoration"
date: 2025-10-01T19:00:00
description: "AV1의 Loop Restoration — Wiener 필터, SGRPROJ(Self-Guided Restoration), RU 단위 처리."
tags: [AV1, Video, Codec, Loop Restoration, Wiener, SGRPROJ]
series: "AV1"
seriesOrder: 18
draft: true
---

Ch 16에서 디블로킹으로 블록 경계를 정리하고, Ch 17에서 CDEF로 링잉 아티팩트를 처리했다. 그런데 여전히 전체적으로 약간 흐릿하거나 노이즈가 남아 있는 영역이 있다. 국소적인 문제는 해결했지만, **넓은 영역에 걸친 전체적인 화질 저하**는 아직이다.

이 장에서는 **Loop Restoration**을 다룬다. 3단 필터 파이프라인의 마지막 단계로, 수백 픽셀 단위의 넓은 영역에서 최적 필터를 적용하는 "마지막 전체 보정" 필터다.

---

## 18.1 왜 3번째 필터가 필요한가

디블로킹과 CDEF가 처리하지 못하는 문제가 있다.

### 각 필터의 한계

```
디블로킹:
- 처리 영역: 블록 경계 4~14픽셀
- 해결하는 문제: 블록 경계 계단 현상
- 한계: 블록 내부는 건드리지 않음

CDEF:
- 처리 영역: 8×8 블록
- 해결하는 문제: 링잉 아티팩트, 국소 노이즈
- 한계: 에지 주변만 처리, 넓은 영역의 전체적인 열화는 못 고침
```

남은 문제:

```
┌────────────────────────────────────────┐
│                                        │
│    전체적으로 약간 흐릿한 영역         │
│    (디블로킹/CDEF가 건드리지 않음)     │
│                                        │
│    원인: 고주파 양자화 손실의           │
│    전체적인 영향                       │
│                                        │
└────────────────────────────────────────┘
```

### Loop Restoration의 역할

Loop Restoration은 **수백 픽셀 단위**의 넓은 영역에 최적화된 필터를 적용한다:

```
처리 단위 비교:

디블로킹:       4~14 픽셀 (경계만)
CDEF:           8×8 블록 (64 픽셀)
Loop Restore:   64×64 ~ 256×256 (4,096 ~ 65,536 픽셀)
                        └─ 훨씬 넓은 영역
```

비유하자면 사진 보정 워크플로우와 같다:
- 디블로킹 = 경계선 보정
- CDEF = 노이즈 제거
- Loop Restoration = 최종 레벨/샤프닝 보정

---

## 18.2 Loop Restoration의 위치와 구조

### 3단 필터 파이프라인

Loop Restoration은 파이프라인의 **마지막** 단계다:

```
복원된 프레임 (역변환 + 역양자화)
    │
    ▼
┌───────────────┐
│ 디블로킹 필터  │  ← 1단계: 블록 경계
└───────────────┘
    │
    ▼
┌───────────────┐
│    CDEF       │  ← 2단계: 링잉, 국소 노이즈
└───────────────┘
    │
    ▼
┌───────────────┐
│ Loop Restore  │  ← 3단계: 전체적인 화질 보정
└───────────────┘
    │
    ▼
참조 버퍼 저장 / 출력
```

Loop Restoration 이후의 결과가 **참조 버퍼에 저장**된다. 다음 프레임의 Inter 예측이 이 깨끗한 버전을 참조한다.

### Restoration Unit (RU)

Loop Restoration은 **Restoration Unit(RU)** 단위로 처리한다:

```cpp
// RU 크기 옵션
enum RestUnitSize {
    RU_64x64   = 64,    // lr_unit_shift = 0
    RU_128x128 = 128,   // lr_unit_shift = 1
    RU_256x256 = 256    // lr_unit_shift = 2
};
```

각 RU에서 **독립적으로** 필터 타입을 선택한다:

```
프레임을 RU로 분할:

┌──────────┬──────────┬──────────┐
│ RU (0,0) │ RU (0,1) │ RU (0,2) │
│ Wiener   │ SGRPROJ  │ NONE     │
├──────────┼──────────┼──────────┤
│ RU (1,0) │ RU (1,1) │ RU (1,2) │
│ SGRPROJ  │ NONE     │ Wiener   │
└──────────┴──────────┴──────────┘

- Wiener: Wiener 필터 적용
- SGRPROJ: Self-Guided Restoration 적용
- NONE: 필터 없음 (원본 유지)
```

### 필터 타입

3가지 복원 모드:

```cpp
enum RestorationType {
    RESTORE_NONE,     // 필터 미적용
    RESTORE_WIENER,   // 위너 필터
    RESTORE_SGRPROJ   // Self-Guided Restoration
};
```

루마(Y), Cb, Cr 각각 **독립적으로** 설정한다. 루마에 Wiener를 쓰면서 크로마에는 SGRPROJ를 쓸 수 있다.

---

## 18.3 Wiener Filter — 최적 선형 필터

### 이론적 배경

**위너 필터(Wiener Filter)**는 신호 처리의 고전적인 최적 필터다:

```
목표: 복원 신호와 원본 신호의 MSE(Mean Squared Error)를 최소화하는
      선형 필터를 찾는다.

주파수 영역:
H(ω) = S_xy(ω) / S_xx(ω)

- S_xy: 원본-복원 교차 스펙트럼 (cross-spectrum)
- S_xx: 복원 자기 스펙트럼 (auto-spectrum)
```

직관적으로:
- 노이즈가 많은 주파수 대역은 억제
- 신호가 강한 주파수 대역은 보존/강화
- 수학적으로 MSE 최소화를 보장

### AV1의 Wiener 구현

AV1은 **7-tap 분리 가능(separable) 필터**를 사용한다:

```
7-tap 수평 필터 × 7-tap 수직 필터

      수평 필터 (7 tap):
      h[-3]  h[-2]  h[-1]  h[0]  h[1]  h[2]  h[3]
        │      │      │     │     │     │     │
        ▼      ▼      ▼     ▼     ▼     ▼     ▼
      [ p0 ][ p1 ][ p2 ][ P ][ p4 ][ p5 ][ p6 ]
                           │
                           ▼
                        결과
```

분리 가능(separable) = 2D 필터를 1D 필터 두 번으로 분해:

```
2D 필터 (7×7 = 49개 계수) → 1D × 1D (7 + 7 = 14개 계수)
                                    └─ 계산량 대폭 감소
```

### 계수 대칭과 정규화

대칭 제약:

```
h[-3] = h[3]
h[-2] = h[2]
h[-1] = h[1]
h[0]  = 중앙 (자동 계산)

→ 6개 고유 계수만 전송 (h[-3], h[-2], h[-1] × 수평/수직)
```

합 제약:

```
Σ h[i] = 128   (정규화 상수)

h[0] = 128 - 2 × (h[-3] + h[-2] + h[-1])
```

계수 범위:

```
h[-3] ∈ [-5, 10]
h[-2] ∈ [-23, 8]
h[-1] ∈ [-17, 72]
```

### Wiener 필터 적용

```cpp
void apply_wiener(const uint8_t* src, uint8_t* dst,
                  int width, int height, int stride,
                  const int* h_filter, const int* v_filter) {
    // 임시 버퍼 (수평 필터 결과)
    int16_t* tmp = allocate_temp(width, height);

    // 1단계: 수평 필터
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int sum = 0;
            for (int i = -3; i <= 3; i++) {
                int px = clamp(x + i, 0, width - 1);
                sum += h_filter[i + 3] * src[y * stride + px];
            }
            // InterRound0 비트 시프트 (중간 정밀도)
            tmp[y * width + x] = (sum + (1 << (WIENER_ROUND0 - 1))) >> WIENER_ROUND0;
        }
    }

    // 2단계: 수직 필터
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int sum = 0;
            for (int j = -3; j <= 3; j++) {
                int py = clamp(y + j, 0, height - 1);
                sum += v_filter[j + 3] * tmp[py * width + x];
            }
            // InterRound1 비트 시프트 → 최종 결과
            int result = (sum + (1 << (WIENER_ROUND1 - 1))) >> WIENER_ROUND1;
            dst[y * stride + x] = clip_pixel(result);
        }
    }

    free(tmp);
}
```

상수 정의:

```cpp
// 8비트 기준
#define WIENER_ROUND0 3   // 수평 필터 후 시프트
#define WIENER_ROUND1 11  // 수직 필터 후 시프트
```

---

## 18.4 SGRPROJ — Self-Guided Restoration

### 이론적 배경

**SGRPROJ**는 Guided Image Filtering의 변형이다:

```
Guided Image Filtering:
- 가이드 이미지를 참조해서 에지를 보존하면서 노이즈 제거
- 가이드 = 원본(깨끗한 이미지)이면 에지 보존 성능 좋음

Self-Guided:
- 가이드 이미지 = 입력 자기 자신
- "자기 자신의 에지 구조를 따라 필터링"
```

핵심 아이디어:
- 픽셀 주변의 **분산**을 계산
- 분산이 크면 (에지 있음) → 필터링 약하게
- 분산이 작으면 (평탄 영역) → 필터링 강하게

### 알고리즘 2단계

**1단계: Self-Guided Filter**

두 가지 반경(r1, r2)으로 박스 필터를 적용한다:

```cpp
// 반경 r의 Self-Guided Filter
void self_guided_filter(const uint8_t* src, int* output,
                        int width, int height, int stride,
                        int r, int eps) {
    // 박스 필터: (2r+1) × (2r+1) 영역
    int box_size = (2 * r + 1) * (2 * r + 1);

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            // 박스 영역의 평균(μ)과 분산(σ²) 계산
            int sum = 0, sum_sq = 0;
            for (int j = -r; j <= r; j++) {
                for (int i = -r; i <= r; i++) {
                    int px = clamp(x + i, 0, width - 1);
                    int py = clamp(y + j, 0, height - 1);
                    int val = src[py * stride + px];
                    sum += val;
                    sum_sq += val * val;
                }
            }

            int mu = sum / box_size;                    // 평균
            int sigma_sq = sum_sq / box_size - mu * mu; // 분산

            // 가이드 필터 계수
            // a = σ² / (σ² + ε)
            // b = μ × (1 - a)
            int a = (sigma_sq << SGRPROJ_PRECISION) / (sigma_sq + eps);
            int b = mu * ((1 << SGRPROJ_PRECISION) - a);

            // 필터 출력: f = a × src + b
            int curr = src[y * stride + x];
            output[y * width + x] = (a * curr + b) >> SGRPROJ_PRECISION;
        }
    }
}
```

ε(eps)의 역할:

```
ε이 클수록:
  → a = σ²/(σ²+ε) 가 작아짐
  → 출력이 평균(μ)에 가까워짐
  → 더 강한 smoothing

ε이 작을수록:
  → a가 1에 가까워짐
  → 출력이 원본에 가까워짐
  → 에지 보존
```

**2단계: Linear Projection**

두 반경의 필터 출력을 선형 결합한다:

```cpp
// 최종 출력
void sgrproj_linear_projection(const int* f0, const int* f1,
                               const uint8_t* src, uint8_t* dst,
                               int width, int height, int stride,
                               int w0, int w1) {
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int idx = y * width + x;
            int curr = src[y * stride + x];

            // output = w0 × f0 + w1 × f1 + (1 - w0 - w1) × src
            int w_src = (1 << SGRPROJ_PRJ_BITS) - w0 - w1;
            int result = w0 * f0[idx] + w1 * f1[idx] + w_src * curr;
            result = (result + (1 << (SGRPROJ_PRJ_BITS - 1))) >> SGRPROJ_PRJ_BITS;

            dst[y * stride + x] = clip_pixel(result);
        }
    }
}
```

w0, w1은 **인코더가 R-D 최적화**로 결정해서 전송한다.

### 왜 두 반경인가?

```
작은 반경 (r=1, r=2):
  - 좁은 영역의 평균/분산 계산
  - 세밀한 디테일 보존에 유리
  - 큰 노이즈 제거에는 약함

큰 반경 (r=2, r=3):
  - 넓은 영역의 평균/분산 계산
  - 넓게 퍼진 노이즈 제거에 유리
  - 세밀한 디테일이 뭉개질 수 있음

두 결과를 결합:
  → 다양한 콘텐츠에 적응
  → 인코더가 최적 가중치 결정
```

### SGRPROJ 파라미터 세트

AV1은 **16개 사전 정의된 파라미터 세트**를 제공한다:

```
set  0: r0=2, eps0=12, r1=1, eps1= 4
set  1: r0=2, eps0=15, r1=1, eps1= 6
set  2: r0=2, eps0=18, r1=1, eps1= 8
...
set 10: r0=0, eps0= 0, r1=2, eps1=20   (f0 비활성화)
...
set 15: r0=0, eps0= 0, r1=3, eps1=32   (f1만 사용)
```

r=0이면 해당 필터가 비활성화된다. 인덱스 하나(4비트)만 전송하면 된다.

---

## 18.5 박스 필터 최적화: Integral Image

SGRPROJ의 박스 필터는 **O(r²)** 연산이 필요하다. 256×256 RU에 r=3이면 엄청난 계산량이다.

### Integral Image (Summed Area Table)

**O(1)**로 박스 합을 계산하는 기법:

```cpp
// 1단계: Integral Image 구축 (한 번만)
void build_integral_image(const uint8_t* src, int* S, int* Sq,
                          int width, int height, int stride) {
    // S[y][x] = Σ src[0..y][0..x]
    // Sq[y][x] = Σ src[0..y][0..x]²
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int val = src[y * stride + x];
            S[y * width + x] = val
                + (x > 0 ? S[y * width + x - 1] : 0)
                + (y > 0 ? S[(y-1) * width + x] : 0)
                - (x > 0 && y > 0 ? S[(y-1) * width + x - 1] : 0);
            Sq[y * width + x] = val * val
                + (x > 0 ? Sq[y * width + x - 1] : 0)
                + (y > 0 ? Sq[(y-1) * width + x] : 0)
                - (x > 0 && y > 0 ? Sq[(y-1) * width + x - 1] : 0);
        }
    }
}

// 2단계: O(1) 박스 합
int box_sum(const int* S, int x, int y, int r, int width) {
    // (x-r, y-r) ~ (x+r, y+r) 영역의 합
    int x0 = max(0, x - r - 1);
    int y0 = max(0, y - r - 1);
    int x1 = min(width - 1, x + r);
    int y1 = min(height - 1, y + r);

    return S[y1 * width + x1]
         - S[y0 * width + x1]
         - S[y1 * width + x0]
         + S[y0 * width + x0];
}
```

시각적으로:

```
Integral Image에서 박스 합 계산:

      x0         x1
  ┌───┼──────────┼───┐
  │   │          │   │
y0├───A──────────B───┤
  │   │ 박스 영역 │   │
  │   │          │   │
y1├───C──────────D───┤
  │   │          │   │
  └───┴──────────┴───┘

박스 합 = D - B - C + A
        = S[y1][x1] - S[y0][x1] - S[y1][x0] + S[y0][x0]

→ 박스 크기에 관계없이 4번의 참조만 필요
```

---

## 18.6 경계 처리

### 프레임 경계

RU가 프레임 경계에 걸치면 경계 밖 픽셀이 필요하다:

```cpp
// 경계 확장: 가장 가까운 픽셀 복제 (clamp)
int get_source_sample(const uint8_t* plane, int x, int y,
                      int width, int height, int stride) {
    x = clamp(x, 0, width - 1);
    y = clamp(y, 0, height - 1);
    return plane[y * stride + x];
}
```

Mirror가 아닌 **clamp** 방식이다:

```
프레임 경계:
                    │
... 120 130 140 [150]│ → 150 150 150 ...
                    │     clamp (복제)
```

### Stripe 경계

Loop Restoration은 **64-line stripe** 단위로 처리한다. 이는 디블로킹 필터와 동기화를 위한 것이다:

```
Stripe 경계 처리:

┌────────────────────────────────────┐
│ Stripe N                           │
│                                    │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤ ← 경계
│ Stripe N+1                         │
│                                    │
└────────────────────────────────────┘

RU가 stripe 경계를 넘을 때:
- 위쪽 2행: 필터링되지 않은 원본(deblocked) 사용
- 아래쪽 2행: 필터링되지 않은 원본 사용
```

이렇게 하면 stripe 간 의존성이 없어서 병렬 처리가 가능하다.

---

## 18.7 apply_loop_restoration() 구현

전체 Loop Restoration 처리 과정:

```cpp
void apply_loop_restoration(Frame* frame, const LoopRestorationParams* params) {
    // 각 평면(Y, Cb, Cr) 독립 처리
    for (int plane = 0; plane < 3; plane++) {
        RestorationType frame_type = params->lr_type[plane];

        // 프레임 전체가 NONE이면 스킵
        if (frame_type == RESTORE_NONE) {
            continue;
        }

        // RU 크기 결정
        int ru_size = get_ru_size(params, plane);
        int ru_cols = (get_plane_width(frame, plane) + ru_size - 1) / ru_size;
        int ru_rows = (get_plane_height(frame, plane) + ru_size - 1) / ru_size;

        // 각 RU 처리
        for (int ru_y = 0; ru_y < ru_rows; ru_y++) {
            for (int ru_x = 0; ru_x < ru_cols; ru_x++) {
                int ru_idx = ru_y * ru_cols + ru_x;

                // RU별 필터 타입 확인
                RestorationType ru_type = params->lr_unit_type[plane][ru_idx];

                switch (ru_type) {
                    case RESTORE_NONE:
                        // 아무것도 안 함
                        break;

                    case RESTORE_WIENER:
                        apply_wiener_to_ru(frame, plane, params, ru_x, ru_y);
                        break;

                    case RESTORE_SGRPROJ:
                        apply_sgrproj_to_ru(frame, plane, params, ru_x, ru_y);
                        break;
                }
            }
        }
    }
}
```

### RU별 Wiener 적용

```cpp
void apply_wiener_to_ru(Frame* frame, int plane,
                        const LoopRestorationParams* params,
                        int ru_x, int ru_y) {
    int ru_size = get_ru_size(params, plane);
    int start_x = ru_x * ru_size;
    int start_y = ru_y * ru_size;

    // RU 크기 계산 (프레임 경계 고려)
    int ru_width = min(ru_size, get_plane_width(frame, plane) - start_x);
    int ru_height = min(ru_size, get_plane_height(frame, plane) - start_y);

    // Wiener 계수 가져오기
    int ru_idx = ru_y * params->ru_cols[plane] + ru_x;
    const int* h_filter = params->wiener_h[plane][ru_idx];
    const int* v_filter = params->wiener_v[plane][ru_idx];

    // 필터 적용
    uint8_t* plane_ptr = get_plane_ptr(frame, plane);
    int stride = get_plane_stride(frame, plane);

    apply_wiener(plane_ptr + start_y * stride + start_x,
                 plane_ptr + start_y * stride + start_x,  // in-place 가능
                 ru_width, ru_height, stride,
                 h_filter, v_filter);
}
```

### RU별 SGRPROJ 적용

```cpp
void apply_sgrproj_to_ru(Frame* frame, int plane,
                         const LoopRestorationParams* params,
                         int ru_x, int ru_y) {
    int ru_size = get_ru_size(params, plane);
    int start_x = ru_x * ru_size;
    int start_y = ru_y * ru_size;

    int ru_width = min(ru_size, get_plane_width(frame, plane) - start_x);
    int ru_height = min(ru_size, get_plane_height(frame, plane) - start_y);

    // 파라미터 세트 인덱스 가져오기
    int ru_idx = ru_y * params->ru_cols[plane] + ru_x;
    int set_idx = params->sgrproj_set[plane][ru_idx];
    const SGRProjParams* sgr = &sgr_params_table[set_idx];

    // 가중치 가져오기
    int w0 = params->sgrproj_w0[plane][ru_idx];
    int w1 = params->sgrproj_w1[plane][ru_idx];

    uint8_t* plane_ptr = get_plane_ptr(frame, plane);
    int stride = get_plane_stride(frame, plane);

    // 임시 버퍼
    int* f0 = allocate_temp(ru_width, ru_height);
    int* f1 = allocate_temp(ru_width, ru_height);

    // 1단계: 두 반경으로 Self-Guided Filter
    if (sgr->r0 > 0) {
        self_guided_filter(plane_ptr + start_y * stride + start_x, f0,
                          ru_width, ru_height, stride,
                          sgr->r0, sgr->eps0);
    }
    if (sgr->r1 > 0) {
        self_guided_filter(plane_ptr + start_y * stride + start_x, f1,
                          ru_width, ru_height, stride,
                          sgr->r1, sgr->eps1);
    }

    // 2단계: Linear Projection
    sgrproj_linear_projection(f0, f1,
                              plane_ptr + start_y * stride + start_x,
                              plane_ptr + start_y * stride + start_x,
                              ru_width, ru_height, stride,
                              w0, w1);

    free(f0);
    free(f1);
}
```

---

## 18.8 3단 필터 파이프라인 완성

### 전체 파이프라인

```cpp
void apply_loop_filters(Frame* frame) {
    // 1단계: 디블로킹
    apply_deblocking(frame);

    // 2단계: CDEF
    if (frame->enable_cdef) {
        apply_cdef(frame, &frame->cdef_params);
    }

    // 3단계: Loop Restoration
    if (frame->enable_restoration) {
        apply_loop_restoration(frame, &frame->lr_params);
    }
}
```

### 단계별 PSNR 변화

각 필터가 화질에 기여하는 정도:

```
┌──────────────────────────────────────────────┐
│ 단계별 PSNR 변화 (전형적인 예시)              │
├──────────────────────────────────────────────┤
│                                              │
│ 복원 직후:      32.5 dB                      │
│ + Deblocking:  33.1 dB (+0.6 dB)            │
│ + CDEF:        33.8 dB (+0.7 dB)            │
│ + Restoration: 34.2 dB (+0.4 dB)            │
│                                              │
│ 총 개선:        +1.7 dB                      │
└──────────────────────────────────────────────┘
```

콘텐츠에 따라 각 필터의 기여도는 달라진다:
- 블록 경계가 뚜렷한 저비트레이트: 디블로킹 기여 큼
- 에지가 많은 콘텐츠: CDEF 기여 큼
- 전체적으로 흐릿한 콘텐츠: Loop Restoration 기여 큼

---

## 18.9 Wiener vs SGRPROJ 비교

| 항목 | Wiener | SGRPROJ |
|------|--------|---------|
| 필터 종류 | 선형 (linear) | 비선형 (edge-aware) |
| 에지 보존 | 약함 | 강함 |
| 계산량 | 낮음 (7×7 컨볼루션) | 높음 (박스 필터 + projection) |
| 파라미터 | 6개 계수 | 세트 인덱스 + 가중치 2개 |
| 적합한 콘텐츠 | 평탄한 영역 | 에지가 많은 영역 |

인코더는 R-D 최적화로 각 RU에 최적의 필터를 선택한다. 일반적으로:
- 하늘, 벽 같은 평탄한 영역 → Wiener
- 나뭇잎, 머리카락 같은 디테일 영역 → SGRPROJ 또는 NONE

---

## 정리

이 장에서 배운 내용:

- **Loop Restoration의 목적**: 디블로킹/CDEF가 처리 못하는 **넓은 영역의 전체적인 화질 저하** 보정
- **3단 필터 파이프라인**: 디블로킹 → CDEF → Loop Restoration → 참조 버퍼 저장
- **Restoration Unit(RU)**: 64×64 ~ 256×256 단위, 각 RU에서 독립적으로 필터 선택
- **Wiener Filter**: 7-tap 분리 가능 선형 필터, MSE 최소화, 6개 계수 전송
- **SGRPROJ**: Self-Guided Restoration, 분산 기반 에지 보존, 두 반경의 결합
- **Integral Image**: O(1) 박스 합 계산으로 SGRPROJ 최적화
- **단계별 PSNR 개선**: 각 필터가 0.4~0.7 dB씩 기여, 총 1.5~2.0 dB 개선 가능

Loop Restoration으로 **3단 필터 파이프라인이 완성**되었다. 이 결과가 참조 버퍼에 저장되어 다음 프레임의 Inter 예측에 사용된다.

---

## 다음 장 예고

Ch 19에서는 **Film Grain**을 다룬다. 인코딩 시 제거했던 필름 그레인을 디코더에서 합성으로 복원하는 기술이다. Loop Restoration까지가 "복원"이라면, Film Grain은 "예술적 터치"에 해당한다.

---

## 관련 항목

- [Ch 16: 디블로킹 필터](/blog/media/av1/part5-filters/chapter16-deblocking) — 1단계 필터
- [Ch 17: CDEF](/blog/media/av1/part5-filters/chapter17-cdef) — 2단계 필터
- [Ch 19: Film Grain](/blog/media/av1/part6-features/chapter19-film-grain) — 그레인 합성
