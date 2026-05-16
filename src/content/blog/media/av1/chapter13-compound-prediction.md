---
title: "Ch 13: Compound 예측"
date: 2025-10-01T14:00:00
description: "AV1의 Compound 예측 — Averaged, Distance-Weighted, Wedge, DIFFWTD, Inter-Intra 블렌딩의 원리와 구현."
tags: [AV1, Video, Codec, Compound, Prediction]
series: "AV1"
seriesOrder: 13
draft: true
---

지금까지 Inter 예측은 **하나의 참조 프레임**에서 복사해 오는 것이었다. 하지만 현실의 비디오에서는 한 참조만으로는 부족한 경우가 많다. 장면이 서서히 바뀌는 페이드, 물체가 가려졌다 나타나는 영역, 두 물체가 겹치는 경계 등이 그런 예다. AV1은 **두 개의 참조를 섞는** Compound 예측으로 이런 상황을 처리한다.

이 장에서는 AV1의 5가지 Compound 모드를 살펴본다.

---

## 13.1 왜 두 참조를 섞는가

### 단일 참조의 한계

Ch 12에서 본 Inter 예측은 하나의 참조 프레임에서 블록을 복사해 왔다. 대부분의 경우 이것으로 충분하지만, 다음 상황에서는 한 참조만으로 정확한 예측이 어렵다.

**1. 페이드 인/아웃 (Fade)**

장면 전환 시 두 장면이 서서히 섞인다.

```
프레임 N:    장면 A (100%)
프레임 N+1:  장면 A (70%) + 장면 B (30%)
프레임 N+2:  장면 A (40%) + 장면 B (60%)
프레임 N+3:  장면 B (100%)
```

N+1이나 N+2를 예측할 때, A만 참조하면 B 성분을 놓치고, B만 참조하면 A 성분을 놓친다. 두 참조를 적절히 섞으면 정확도가 올라간다.

**2. 부분 가림(Occlusion)**

물체가 다른 물체 뒤로 지나가는 장면을 생각하자.

```
프레임 N-2: [  물체A  ]     [배경]
프레임 N-1: [물체A의 일부][물체B][배경]  ← B가 A를 가림
프레임 N:   [물체A 전체]   [물체B][배경]  ← A가 다시 나타남
```

프레임 N에서 "다시 나타난 A 영역"은:
- N-1에서는 B에 가려져 보이지 않았다
- N-2에서는 보였지만 시간적으로 멀다

이때 N-1과 N-2를 함께 참조하면, 가려진 영역과 보이는 영역을 적절히 섞을 수 있다.

**3. 조명 변화(Lighting Change)**

조명이 서서히 변하는 장면에서는 과거 참조와 미래 참조(B-프레임의 경우) 사이의 중간값이 현재에 더 가깝다.

### 핵심 아이디어: 가중 평균

두 참조를 섞는 기본 공식은 다음과 같다.

```
pred(x,y) = w0 × pred_ref0(x,y) + w1 × pred_ref1(x,y)
```

여기서 `w0 + w1 = 1`이다. AV1에서는 가중치를 64 단위로 표현한다.

```
pred(x,y) = (m × pred_ref0 + (64 - m) × pred_ref1 + 32) >> 6
```

- `m`: 0~64 사이의 마스크 값
- `m = 32`: 50/50 균등 혼합
- `m = 64`: ref0만 사용
- `m = 0`: ref1만 사용

이 가중치를 **어떻게 결정하느냐**에 따라 5가지 Compound 모드가 나뉜다.

```
┌─────────────────────────────────────────────────────────────┐
│                    Compound 예측 모드                        │
├─────────────────────────────────────────────────────────────┤
│  모드              │  가중치 결정 방식                        │
├─────────────────────────────────────────────────────────────┤
│  Averaged          │  고정 (50/50)                           │
│  Distance-Weighted │  시간 거리에서 자동 계산                  │
│  Wedge             │  16개 사전 정의 마스크 중 선택            │
│  DIFFWTD           │  두 예측의 차이에서 자동 생성             │
│  Inter-Intra       │  블록 경계→내부 방향 감쇄 마스크          │
└─────────────────────────────────────────────────────────────┘
```

---

## 13.2 Averaged Compound — 가장 단순한 혼합

### 동작 원리

Averaged Compound는 가장 단순한 형태로, 두 참조를 **동일한 가중치**로 섞는다.

```cpp
// Averaged Compound 공식
pred(x,y) = (pred_ref0(x,y) + pred_ref1(x,y) + 1) >> 1
```

모든 픽셀에서 `m = 32` (50/50)로 고정된다.

### H.264 B-프레임과의 비교

이 방식은 H.264의 **양방향 예측(bi-prediction)**과 동일하다.

```
H.264 B-프레임:
  pred = (pred_from_past + pred_from_future + 1) >> 1

AV1 Averaged Compound:
  pred = (pred_ref0 + pred_ref1 + 1) >> 1
```

차이점은 AV1에서는 ref0과 ref1이 반드시 과거/미래일 필요가 없다는 것이다. 두 개의 과거 프레임(예: LAST + GOLDEN)을 섞을 수도 있다.

### 언제 사용되나

- 두 참조가 비슷하게 유효할 때
- 페이드 중간 지점
- 움직임이 없거나 작은 영역에서 두 참조의 평균이 노이즈를 줄일 때

### 구현

```cpp
void predict_averaged_compound(
    const uint8_t* ref0, const uint8_t* ref1,
    uint8_t* pred,
    int width, int height, int stride)
{
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int p0 = ref0[y * stride + x];
            int p1 = ref1[y * stride + x];
            pred[y * stride + x] = (p0 + p1 + 1) >> 1;
        }
    }
}
```

---

## 13.3 Distance-Weighted Compound — 시간 거리 기반

### 동기

두 참조 프레임이 현재 프레임과 **다른 시간 거리**에 있다면, 더 가까운 쪽이 더 비슷할 가능성이 높다.

```
프레임 순서:  ... 5 ... 8 ... 10 ...
                 │     │      │
              ref0   ref1  current

ref0까지 거리: 10 - 5 = 5
ref1까지 거리: 10 - 8 = 2

→ ref1이 더 가까우므로 더 큰 가중치
```

### 가중치 계산 (스펙 Section 7.11.3.15)

```cpp
// 시간 거리 계산
d0 = abs(current_order_hint - ref0_order_hint);
d1 = abs(current_order_hint - ref1_order_hint);

// 가중치 도출 (d1이 작을수록 ref0에 더 큰 가중치)
// AV1 스펙에서는 lookup table 사용
weight0 = d1 * 64 / (d0 + d1);  // 개념적
weight1 = 64 - weight0;
```

실제 스펙에서는 나눗셈을 피하기 위해 **사전 계산된 테이블**을 사용한다.

```cpp
// 스펙의 Distance Weighted 테이블 (개념적)
// dist_ratio = d0 / d1 를 양자화한 인덱스로 가중치 조회
static const int dist_weight_table[16] = {
    64, 60, 56, 52, 48, 44, 40, 36,
    32, 28, 24, 20, 16, 12,  8,  4
};
```

### 자동 계산의 이점

Distance-Weighted는 **추가 시그널링이 필요 없다**.

```
비트스트림에 저장되는 정보:
  - compound_type = COMPOUND_DIST (가중 방식 지정만)
  - 가중치 자체는 전송하지 않음!

디코더가 직접 계산:
  - 참조 프레임의 order_hint는 이미 알고 있음
  - 현재 프레임의 order_hint도 알고 있음
  - → 가중치를 동일하게 재계산 가능
```

이것이 Averaged보다 정교하면서도 비트를 추가로 쓰지 않는 효율적인 방식이다.

### 구현

```cpp
// order_hint에서 거리 계산 (wraparound 고려)
int get_relative_dist(int a, int b, int order_hint_bits) {
    int diff = a - b;
    int m = 1 << (order_hint_bits - 1);
    diff = (diff & (m - 1)) - (diff & m);
    return diff;
}

void predict_distance_weighted_compound(
    const uint8_t* ref0, const uint8_t* ref1,
    uint8_t* pred,
    int width, int height, int stride,
    int ref0_order, int ref1_order, int cur_order,
    int order_hint_bits)
{
    // 거리 계산
    int d0 = abs(get_relative_dist(cur_order, ref0_order, order_hint_bits));
    int d1 = abs(get_relative_dist(cur_order, ref1_order, order_hint_bits));

    // 가중치 계산 (0이면 균등)
    int w0, w1;
    if (d0 == 0 || d1 == 0) {
        w0 = w1 = 32;
    } else {
        // 가까운 쪽에 더 큰 가중치
        w0 = (d1 * 64) / (d0 + d1);
        w1 = 64 - w0;
    }

    // 블렌딩
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int p0 = ref0[y * stride + x];
            int p1 = ref1[y * stride + x];
            pred[y * stride + x] = (w0 * p0 + w1 * p1 + 32) >> 6;
        }
    }
}
```

---

## 13.4 Wedge Compound — 사선 마스크 기반

### 동기: 블록 내에서 경계가 있는 경우

블록 하나 안에 **두 물체의 경계**가 지나갈 수 있다.

```
┌─────────────┐
│ 배경        │
│   ╲─────────│  ← 물체 경계가 대각선으로
│     ╲ 물체  │
│       ╲     │
└─────────────┘
```

이 블록을:
- 왼쪽 위(배경)는 ref0(이전 배경)으로
- 오른쪽 아래(물체)는 ref1(물체 이동 전)으로

예측하면 정확도가 올라간다. Wedge Compound는 이를 위해 **공간적으로 다른 가중치**를 사용한다.

### 16개 Wedge 마스크 (스펙 Section 7.11.3.12)

AV1은 16가지 방향의 사전 정의된 마스크를 제공한다.

```
Wedge 방향 예시 (8×8 블록 기준):

방향 0:       방향 4:       방향 8:       방향 12:
──────────    │             ╲             ╱
              │               ╲         ╱
              │                 ╲     ╱
              │                   ╲ ╱

수평          수직          대각선↘      대각선↗
```

정확한 마스크 값은 블록 크기마다 다르며, 스펙의 `wedge_masks[]` 테이블에 정의되어 있다.

### 마스크 값의 의미

```cpp
// Wedge 마스크 적용
pred(x,y) = (mask(x,y) * pred_ref0(x,y) +
             (64 - mask(x,y)) * pred_ref1(x,y) + 32) >> 6
```

- `mask(x,y) = 64`: 해당 픽셀은 ref0만
- `mask(x,y) = 0`: 해당 픽셀은 ref1만
- `mask(x,y) = 32`: 50/50 혼합 (경계 부근)

### 시그널링 (스펙 Section 5.11.37)

```
비트스트림에 전송되는 정보:
  - wedge_index: 4 bits (16개 방향 중 선택)
  - wedge_sign:  1 bit (마스크 반전 여부)

총 5비트로 32가지 조합 가능
```

`wedge_sign`이 1이면 마스크를 반전한다.

```cpp
if (wedge_sign) {
    mask(x,y) = 64 - original_mask(x,y);
    // ref0과 ref1의 역할이 바뀜
}
```

### Wedge 마스크 테이블 구조

```cpp
// 블록 크기별 Wedge 마스크 (개념적)
struct WedgeMasks {
    uint8_t masks[16][MAX_BLOCK_HEIGHT][MAX_BLOCK_WIDTH];
};

// 8×8 블록의 수평 wedge (방향 0) 예시
// 위쪽 = 64 (ref0), 아래쪽 = 0 (ref1), 중간 = 그라데이션
uint8_t wedge_8x8_dir0[8][8] = {
    {64, 64, 64, 64, 64, 64, 64, 64},  // row 0: 전부 ref0
    {64, 64, 64, 64, 64, 64, 64, 64},  // row 1: 전부 ref0
    {60, 60, 60, 60, 60, 60, 60, 60},  // row 2: 거의 ref0
    {48, 48, 48, 48, 48, 48, 48, 48},  // row 3: ref0 우세
    {32, 32, 32, 32, 32, 32, 32, 32},  // row 4: 50/50
    {16, 16, 16, 16, 16, 16, 16, 16},  // row 5: ref1 우세
    { 4,  4,  4,  4,  4,  4,  4,  4},  // row 6: 거의 ref1
    { 0,  0,  0,  0,  0,  0,  0,  0},  // row 7: 전부 ref1
};
```

### 구현

```cpp
// Wedge 마스크 조회
const uint8_t* get_wedge_mask(int block_size, int wedge_index, int wedge_sign) {
    const uint8_t* base_mask = wedge_masks_table[block_size][wedge_index];
    // wedge_sign이면 반전 마스크 반환
    if (wedge_sign) {
        return wedge_masks_inverted_table[block_size][wedge_index];
    }
    return base_mask;
}

void predict_wedge_compound(
    const uint8_t* ref0, const uint8_t* ref1,
    uint8_t* pred,
    int width, int height, int stride,
    int wedge_index, int wedge_sign)
{
    // 블록 크기에 맞는 마스크 조회
    int block_size = get_block_size_index(width, height);
    const uint8_t* mask = get_wedge_mask(block_size, wedge_index, wedge_sign);

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int m = mask[y * width + x];
            int p0 = ref0[y * stride + x];
            int p1 = ref1[y * stride + x];
            pred[y * stride + x] = (m * p0 + (64 - m) * p1 + 32) >> 6;
        }
    }
}
```

---

## 13.5 DIFFWTD — 차이 기반 가중치

### 동기

Wedge는 마스크 방향을 인코더가 선택해야 한다. 하지만 어떤 경우에는 **두 예측 자체의 차이**를 보면 어디에 경계가 있는지 알 수 있다.

```
ref0 예측:           ref1 예측:           차이:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 100 100 100 │     │ 100 100 100 │     │  0   0   0  │ ← 비슷 → ref0=ref1
│ 100 100 100 │     │  80  80  80 │     │ 20  20  20  │ ← 약간 다름
│ 100 100  50 │     │  80  80 200 │     │ 20  20 150  │ ← 많이 다름!
└─────────────┘     └─────────────┘     └─────────────┘
```

차이가 큰 픽셀에서는 한쪽이 더 정확할 가능성이 높으므로, 차이에 따라 **자동으로** 가중치를 결정한다.

### DIFFWTD 알고리즘 (스펙 Section 7.11.3.13)

```cpp
// 1단계: 두 예측의 차이 계산
diff(x,y) = |pred_ref0(x,y) - pred_ref1(x,y)|

// 2단계: 차이를 마스크로 변환
// 두 가지 변환 함수 중 선택 (mask_type에 따라)
if (mask_type == 0) {
    // 차이가 크면 ref0에 가중치
    mask(x,y) = 64 - (diff(x,y) >> threshold_shift);
} else {
    // 차이가 크면 ref1에 가중치
    mask(x,y) = (diff(x,y) >> threshold_shift);
}

// 클리핑
mask(x,y) = clip(mask(x,y), 0, 64);

// 3단계: 블렌딩
pred(x,y) = (mask(x,y) * pred_ref0 + (64 - mask(x,y)) * pred_ref1 + 32) >> 6
```

### 시그널링

```
비트스트림에 전송되는 정보:
  - mask_type: 1 bit (두 가지 변환 함수 중 선택)

단 1비트! (Wedge의 5비트보다 효율적)
```

마스크 자체는 전송하지 않는다. 디코더도 같은 두 예측을 생성하므로 동일한 마스크를 계산할 수 있다.

### 왜 두 가지 mask_type이 있나

직관적으로:
- **type 0**: 차이가 큰 곳에서 ref0을 신뢰
- **type 1**: 차이가 큰 곳에서 ref1을 신뢰

인코더는 둘 다 시도해보고 더 나은 쪽을 선택한다.

### 구현

```cpp
void predict_diffwtd_compound(
    const uint8_t* ref0, const uint8_t* ref1,
    uint8_t* pred,
    int width, int height, int stride,
    int mask_type)
{
    // 임시 마스크 버퍼
    uint8_t mask[MAX_BLOCK_SIZE * MAX_BLOCK_SIZE];

    // 1단계: 차이 기반 마스크 생성
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int p0 = ref0[y * stride + x];
            int p1 = ref1[y * stride + x];
            int diff = abs(p0 - p1);

            // 차이를 마스크로 변환
            int m;
            if (mask_type == 0) {
                // 차이가 작으면 균등, 크면 ref0 우세
                m = 38 + (diff >> 2);  // 스펙의 실제 공식
            } else {
                // 차이가 작으면 균등, 크면 ref1 우세
                m = 38 - (diff >> 2);
            }
            mask[y * width + x] = CLIP(m, 0, 64);
        }
    }

    // 선택적: 마스크에 블러 적용 (더 부드러운 전환)
    // smooth_diffwtd_mask(mask, width, height);

    // 2단계: 블렌딩
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int m = mask[y * width + x];
            int p0 = ref0[y * stride + x];
            int p1 = ref1[y * stride + x];
            pred[y * stride + x] = (m * p0 + (64 - m) * p1 + 32) >> 6;
        }
    }
}
```

---

## 13.6 Inter-Intra Compound — 인터 + 인트라 혼합

### 동기: 참조가 불완전한 영역

Inter 예측이 실패하는 대표적인 경우가 있다:
- **새로 나타난 물체**: 이전 프레임에 없던 영역
- **가려졌다 나타난 영역**: 참조 프레임에서 다른 물체에 가려져 있었음
- **급격한 변화**: 조명, 색상이 크게 바뀐 영역

이런 영역에서는 **Intra 예측(주변 픽셀 기반)**이 Inter보다 나을 수 있다. Inter-Intra Compound는 둘을 섞는다.

### 동작 원리

```cpp
pred(x,y) = mask(x,y) * pred_inter(x,y) +
            (64 - mask(x,y)) * pred_intra(x,y)
```

여기서:
- `pred_inter`: 일반적인 Inter 예측 (참조 프레임에서)
- `pred_intra`: Intra 예측 (현재 프레임의 주변 픽셀에서)
- `mask`: 경계에서 내부로 감쇄하는 사전 정의 마스크

### 사용 가능한 Intra 모드 (스펙 Section 5.11.35)

Inter-Intra에서는 4가지 Intra 모드만 사용할 수 있다:

```
1. DC_PRED     — 주변 픽셀의 평균
2. V_PRED      — 위쪽 픽셀 복사
3. H_PRED      — 왼쪽 픽셀 복사
4. SMOOTH_PRED — 부드러운 그라데이션
```

복잡한 각도 모드(Paeth, 45° 등)는 사용하지 않는다.

### Inter-Intra 마스크 (스펙 Section 7.11.3.14)

마스크는 블록 크기와 Intra 모드에 따라 사전 정의되어 있다.

```
V_PRED의 마스크 (위쪽에서 복사):
┌─────────────────────┐
│ 64 64 64 64 64 64 64│  ← 위쪽: Intra 우세 (위쪽 참조)
│ 56 56 56 56 56 56 56│
│ 44 44 44 44 44 44 44│  ← 중간: 혼합
│ 32 32 32 32 32 32 32│
│ 20 20 20 20 20 20 20│
│ 10 10 10 10 10 10 10│  ← 아래쪽: Inter 우세
│  4  4  4  4  4  4  4│
│  0  0  0  0  0  0  0│
└─────────────────────┘

H_PRED의 마스크 (왼쪽에서 복사):
┌─────────────────────┐
│ 64 56 44 32 20 10 4 0│  ← Intra에서 Inter로 감쇄
│ 64 56 44 32 20 10 4 0│
│ 64 56 44 32 20 10 4 0│
│ ...                  │
└─────────────────────┘
```

### 시그널링

```
비트스트림에 전송되는 정보:
  - interintra_mode: 2 bits (4가지 Intra 모드 중 선택)
  - 추가로 wedge 사용 여부 시그널 가능
```

### 구현

```cpp
// Inter-Intra 마스크 조회
const uint8_t* get_interintra_mask(int block_size, int intra_mode) {
    // 모드별 사전 정의 마스크 반환
    return interintra_masks_table[block_size][intra_mode];
}

void predict_inter_intra_compound(
    const uint8_t* ref,           // Inter 예측 결과
    const uint8_t* above_row,     // 위쪽 참조 픽셀
    const uint8_t* left_col,      // 왼쪽 참조 픽셀
    uint8_t* pred,
    int width, int height, int stride,
    int intra_mode)
{
    // 1단계: Intra 예측 생성
    uint8_t intra_pred[MAX_BLOCK_SIZE * MAX_BLOCK_SIZE];
    switch (intra_mode) {
        case DC_PRED:
            predict_dc(above_row, left_col, intra_pred, width, height);
            break;
        case V_PRED:
            predict_vertical(above_row, intra_pred, width, height);
            break;
        case H_PRED:
            predict_horizontal(left_col, intra_pred, width, height);
            break;
        case SMOOTH_PRED:
            predict_smooth(above_row, left_col, intra_pred, width, height);
            break;
    }

    // 2단계: 마스크 조회
    int block_size = get_block_size_index(width, height);
    const uint8_t* mask = get_interintra_mask(block_size, intra_mode);

    // 3단계: 블렌딩
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int m = mask[y * width + x];
            int p_inter = ref[y * stride + x];
            int p_intra = intra_pred[y * width + x];
            // 주의: Inter-Intra에서는 mask가 Intra 가중치
            pred[y * stride + x] = ((64 - m) * p_inter + m * p_intra + 32) >> 6;
        }
    }
}
```

---

## 13.7 Compound 예측 통합 구현

### predict_compound() 전체 흐름

```cpp
enum CompoundType {
    COMPOUND_AVERAGE,
    COMPOUND_DIST,
    COMPOUND_WEDGE,
    COMPOUND_DIFFWTD,
    COMPOUND_INTER_INTRA  // 별도 플래그로 처리되기도 함
};

void predict_compound(
    BlockContext* ctx,
    const uint8_t* ref0_buf, int ref0_stride,
    const uint8_t* ref1_buf, int ref1_stride,
    uint8_t* pred, int pred_stride)
{
    int width = ctx->block_width;
    int height = ctx->block_height;

    // 1단계: 두 참조에서 각각 예측 생성
    uint8_t pred0[MAX_BLOCK_SIZE * MAX_BLOCK_SIZE];
    uint8_t pred1[MAX_BLOCK_SIZE * MAX_BLOCK_SIZE];

    motion_compensate(ref0_buf, ref0_stride, ctx->mv0, pred0, width, height);
    motion_compensate(ref1_buf, ref1_stride, ctx->mv1, pred1, width, height);

    // 2단계: Compound 타입에 따라 블렌딩
    switch (ctx->compound_type) {
        case COMPOUND_AVERAGE:
            // 50/50 균등 혼합
            for (int i = 0; i < width * height; i++) {
                pred[i] = (pred0[i] + pred1[i] + 1) >> 1;
            }
            break;

        case COMPOUND_DIST:
            // 시간 거리 기반 가중치
            predict_distance_weighted(pred0, pred1, pred, width, height,
                                      ctx->ref0_order, ctx->ref1_order,
                                      ctx->cur_order);
            break;

        case COMPOUND_WEDGE:
            // 사선 마스크
            predict_wedge_compound(pred0, pred1, pred, width, height,
                                   width,  // stride
                                   ctx->wedge_index, ctx->wedge_sign);
            break;

        case COMPOUND_DIFFWTD:
            // 차이 기반 마스크
            predict_diffwtd_compound(pred0, pred1, pred, width, height,
                                     width, ctx->mask_type);
            break;
    }

    // 출력을 pred 버퍼에 복사 (stride 고려)
    for (int y = 0; y < height; y++) {
        memcpy(pred + y * pred_stride,
               pred + y * width,
               width * sizeof(uint8_t));
    }
}
```

### Compound 모드 선택 플로우 (디코더)

```cpp
void decode_compound_mode(BitstreamReader* br, BlockContext* ctx)
{
    // 두 개의 참조가 사용되는지 확인
    if (!is_compound(ctx->ref_frame[0], ctx->ref_frame[1])) {
        ctx->is_compound = false;
        return;
    }

    ctx->is_compound = true;

    // compound_type 읽기
    // (inter_compound_mode 심볼에서 디코딩)
    ctx->compound_type = read_compound_type(br, ctx);

    if (ctx->compound_type == COMPOUND_WEDGE) {
        ctx->wedge_index = read_symbol(br, wedge_cdf, 16);
        ctx->wedge_sign = read_literal(br, 1);
    }
    else if (ctx->compound_type == COMPOUND_DIFFWTD) {
        ctx->mask_type = read_literal(br, 1);
    }
    // COMPOUND_DIST와 COMPOUND_AVERAGE는 추가 파라미터 없음
}
```

---

## 13.8 Compound 모드 비교

| 모드 | 가중치 결정 | 추가 비트 | 장점 | 적합한 상황 |
|------|-------------|----------|------|-------------|
| Averaged | 고정 50/50 | 0 | 단순 | 두 참조가 비슷할 때 |
| Dist-Weighted | 시간 거리 | 0 | 자동 적응 | 시간 비대칭 참조 |
| Wedge | 16개 마스크 | 5 | 공간 분리 | 물체 경계 |
| DIFFWTD | 차이 기반 | 1 | 콘텐츠 적응 | 불규칙한 경계 |
| Inter-Intra | 경계 감쇄 | 2 | 새 영역 처리 | 가림/나타남 |

### 인코더의 모드 선택

인코더는 보통 모든 모드를 RD(Rate-Distortion) 비용으로 비교한다.

```
RD_cost = Distortion + λ × Rate

각 모드의 RD 비용 계산:
1. Averaged:    dist(pred_avg, original)    + λ × 0
2. Dist-Weight: dist(pred_dist, original)   + λ × 0
3. Wedge:       min over 32 options of dist + λ × 5
4. DIFFWTD:     min over 2 options of dist  + λ × 1
5. Inter-Intra: min over 4 modes of dist    + λ × 2

최소 비용 모드 선택
```

비트가 적게 드는 Averaged/Dist-Weight가 선호되지만, 물체 경계에서는 5비트를 써서라도 Wedge가 훨씬 낮은 왜곡을 줄 수 있다.

---

## 정리

- **Compound 예측**은 두 참조 프레임을 섞어 더 정확한 예측을 만든다
- **Averaged**: 50/50 균등 혼합, 추가 비트 없음
- **Distance-Weighted**: 시간 거리에 따른 자동 가중치, 추가 비트 없음
- **Wedge**: 16개 사선 마스크로 공간 분리, 5비트 시그널링
- **DIFFWTD**: 두 예측의 차이에서 마스크 자동 생성, 1비트 시그널링
- **Inter-Intra**: Inter와 Intra 예측을 블렌딩, 새로 나타난 영역에 유용
- 모든 블렌딩은 6비트 마스크(0~64) 기반:
  ```
  pred = (m × pred0 + (64-m) × pred1 + 32) >> 6
  ```

---

## 다음 장 예고

Ch 14에서는 **Global Motion과 Warped Motion**을 다룬다. 카메라가 팬하거나 줌할 때 프레임 전체에 적용되는 아핀 변환, 그리고 블록 레벨의 워프드 예측과 OBMC를 살펴본다.

---

## 관련 항목

- [Ch 12: Inter 예측](/blog/media/av1/part4-prediction/chapter12-inter-prediction) — 단일 참조 Inter 예측
- [Ch 14: Global/Warped Motion](/blog/media/av1/part4-prediction/chapter14-global-warped-motion) — 아핀 변환과 OBMC
- [Ch 11: 참조 프레임](/blog/media/av1/part4-prediction/chapter11-reference-frames) — 참조 프레임 시스템
