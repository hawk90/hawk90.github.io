---
title: "Ch 14: Global & Warped Motion"
date: 2026-05-16T15:00:00
description: "AV1의 Global/Warped Motion — 아핀 변환의 4가지 모델, Local Warp, OBMC의 원리와 구현."
tags: [AV1, Video, Codec, Global Motion, Warped Motion, OBMC]
series: "AV1"
seriesOrder: 14
draft: true
---

지금까지 본 Inter 예측에서는 **평행 이동(translation)**만 가능했다. Motion Vector `(mvx, mvy)`는 참조 블록을 x, y 방향으로 이동하는 것뿐이다. 하지만 현실의 카메라는 **팬(pan), 틸트(tilt), 줌(zoom), 회전(rotation)**까지 할 수 있다. 이런 복잡한 움직임을 단순 MV로 표현하면 비효율적이다.

AV1은 **Global Motion**과 **Local Warped Motion**으로 이 문제를 해결한다. 이 장에서는 아핀 변환의 기초부터 OBMC까지 살펴본다.

---

## 14.0 직관 — 아핀 변환이란

### 점, 선, 면이 어떻게 움직이는가

기하학적 변환을 이해하려면 **격자(grid)**를 상상하면 좋다.

```
원본 격자:           변환 후 격자:
┌───┬───┬───┐
│   │   │   │       → 어떻게 바뀌는가?
├───┼───┼───┤
│   │   │   │
└───┴───┴───┘
```

**1. IDENTITY (항등 변환)**

움직임 없음. 격자가 그대로다.

```
x' = x
y' = y
```

**2. TRANSLATION (평행 이동)**

모든 점이 같은 방향으로 같은 거리만큼 이동한다.

```
x' = x + tx
y' = y + ty
```

자유도: 2개 (tx, ty)

```
원본:          평행이동 (tx=2, ty=1):
┌───┐
│   │    →        ┌───┐
└───┘             │   │
                  └───┘
```

**3. ROTZOOM (회전 + 확대/축소)**

한 점을 중심으로 회전하면서 크기가 변한다. 정사각형은 회전된 정사각형으로.

```
x' = a × x - b × y + tx
y' = b × x + a × y + ty
```

여기서:
- `a = scale × cos(θ)`
- `b = scale × sin(θ)`
- 자유도: 4개 (a, b, tx, ty)

```
원본:          ROTZOOM (45° 회전, 1.2배 확대):
□
       →         ◇  (마름모 형태로 회전됨)
```

**4. AFFINE (아핀 변환)**

평행 이동 + 회전 + 확대 + 기울임(shear)까지 가능하다. 정사각형이 **평행사변형**으로 바뀔 수 있다.

```
x' = a × x + b × y + tx
y' = c × x + d × y + ty
```

자유도: 6개 (a, b, c, d, tx, ty)

```
원본:          AFFINE (기울임 포함):
□
       →         ▱  (평행사변형)
```

### 아핀 변환의 핵심 성질

- **직선은 직선으로 유지된다** (곡선이 되지 않음)
- **평행선은 평행으로 유지된다**
- 원이나 곡선은 변형될 수 있다 (원 → 타원)

### 왜 비디오 압축에 필요한가

카메라가 움직이면 프레임 전체의 픽셀이 특정 패턴으로 이동한다.

```
카메라 동작:      결과적인 MV 패턴:

팬 (옆으로 이동)   모든 블록 MV가 같은 방향
                  → → → → → →
                  → → → → → →

줌 (확대)         MV가 중심에서 방사형
                  ↖ ↑ ↗
                  ← · →
                  ↙ ↓ ↘

회전              MV가 원형 패턴
                  ↗ → ↘
                  ↑   ↓
                  ↖ ← ↙
```

**문제**: 블록마다 개별 MV를 보내면 비트가 많이 든다.

**해결**: "이 프레임은 카메라가 오른쪽으로 3픽셀 팬했다"라는 **단일 파라미터 세트**로 수백 개 블록의 MV를 한 번에 대체한다.

---

## 14.1 Global Motion — 프레임 전체의 기하학적 변환

### 개념

Global Motion은 **프레임 레벨**에서 정의된다. 각 참조 프레임에 대해 하나의 글로벌 모션 파라미터 세트를 전송한다.

```
Frame Header에 포함:
  global_motion_params[ref_frame] = {type, params[]}

예:
  LAST 프레임에 대해:   type=TRANSLATION, tx=8, ty=0
  GOLDEN 프레임에 대해: type=IDENTITY (움직임 없음)
```

### 4가지 모션 모델 (스펙 Section 5.9.24)

| 모델 | 파라미터 수 | 설명 | 사용 예 |
|------|------------|------|---------|
| IDENTITY | 0 | 움직임 없음 | 고정 카메라 |
| TRANSLATION | 2 | 평행 이동 | 카메라 팬 |
| ROTZOOM | 4 | 회전 + 줌 | 핸드헬드 흔들림, 줌 |
| AFFINE | 6 | 일반 아핀 | 복잡한 카메라 움직임 |

### 파라미터 표현 (스펙 Section 5.9.24)

모든 파라미터는 **고정소수점**으로 표현된다.

```cpp
// 단위: 1 << 16 = 1.0 (WARPEDMODEL_PREC_BITS = 16)
// 예: a = 65536은 1.0을 의미
//     a = 32768은 0.5를 의미

struct GlobalMotionParams {
    int gm_type;      // IDENTITY, TRANSLATION, ROTZOOM, AFFINE
    int gm_params[6]; // 고정소수점 파라미터
    // params[0] = a, params[1] = b, params[2] = tx
    // params[3] = c, params[4] = d, params[5] = ty
};
```

### IDENTITY

```cpp
// 변환 없음
gm_params = {65536, 0, 0, 0, 65536, 0};
// x' = 1.0 * x + 0 * y + 0 = x
// y' = 0 * x + 1.0 * y + 0 = y
```

### TRANSLATION

```cpp
// tx = 8 픽셀 (1/8 서브픽셀 단위로 64)
gm_params = {65536, 0, 512, 0, 65536, 0};  // tx = 512 = 8 << 6
// x' = x + 8
// y' = y
```

**주의**: Global Motion의 translation은 **1/64 픽셀** 단위다 (일반 MV는 1/8).

### ROTZOOM

```cpp
// 45° 회전, 1.1배 확대 예시
// cos(45°) * 1.1 ≈ 0.778
// sin(45°) * 1.1 ≈ 0.778
// a = 0.778 * 65536 = 50972
// b = 0.778 * 65536 = 50972
gm_params = {50972, 50972, tx, -50972, 50972, ty};
// x' = 0.778*x + 0.778*y + tx
// y' = -0.778*x + 0.778*y + ty
```

ROTZOOM에서는 회전 행렬의 특성상 `c = -b`, `d = a`가 강제된다.

### AFFINE

```cpp
// 완전 자유로운 6개 파라미터
gm_params = {a, b, tx, c, d, ty};
// x' = a*x + b*y + tx
// y' = c*x + d*y + ty
```

### Global Motion 적용 (스펙 Section 7.11.3.5)

```cpp
void apply_global_motion(
    int block_x, int block_y,
    int block_width, int block_height,
    const GlobalMotionParams* gm,
    const uint8_t* ref_frame,
    uint8_t* pred)
{
    for (int y = 0; y < block_height; y++) {
        for (int x = 0; x < block_width; x++) {
            // 블록 좌상단 기준 좌표
            int src_x = block_x + x;
            int src_y = block_y + y;

            // 아핀 변환 적용 (고정소수점)
            int ref_x, ref_y;
            if (gm->gm_type == IDENTITY) {
                ref_x = src_x << 16;
                ref_y = src_y << 16;
            } else {
                // x' = a*x + b*y + tx
                // y' = c*x + d*y + ty
                ref_x = gm->gm_params[0] * src_x +
                        gm->gm_params[1] * src_y +
                        gm->gm_params[2];
                ref_y = gm->gm_params[3] * src_x +
                        gm->gm_params[4] * src_y +
                        gm->gm_params[5];
            }

            // 고정소수점 → 서브픽셀 좌표
            int int_x = ref_x >> 16;
            int int_y = ref_y >> 16;
            int frac_x = (ref_x >> 10) & 63;  // 1/64 → 1/8 변환
            int frac_y = (ref_y >> 10) & 63;

            // 서브픽셀 보간
            pred[y * block_width + x] =
                subpixel_interpolate(ref_frame, int_x, int_y,
                                     frac_x, frac_y);
        }
    }
}
```

### Global Motion 시그널링 (스펙 Section 5.9.24)

```
Frame Header에서:
  1. gm_type 읽기 (2 bits로 4가지 타입)
  2. 타입에 따라 파라미터 개수 결정
  3. 각 파라미터를 signed 고정소수점으로 읽기

비트 비용:
  - IDENTITY: 2 bits (타입만)
  - TRANSLATION: 2 + 2×12 = 26 bits (대략)
  - ROTZOOM: 2 + 4×12 = 50 bits (대략)
  - AFFINE: 2 + 6×12 = 74 bits (대략)
```

한 프레임에 수천 개 블록이 있다면, 74비트로 모든 블록의 MV를 대체하는 것은 매우 효율적이다.

---

## 14.2 Local Warped Motion — 블록 레벨 아핀 변환

### Global Motion의 한계

Global Motion은 **프레임 전체**에 하나의 변환만 적용한다. 하지만:

- 전경과 배경이 다르게 움직이는 경우
- 물체가 회전하면서 이동하는 경우
- 여러 물체가 각각 다른 방향으로 움직이는 경우

이럴 때는 **블록마다 다른** 아핀 변환이 필요하다.

### Local Warp의 아이디어

```
핵심: 인접 블록들의 MV를 관찰 → 아핀 파라미터 추정

         [MV1]          [MV2]
           ↓              ↓
    ┌──────────────────────────┐
    │                          │
    │     현재 블록             │
    │                          │
    └──────────────────────────┘
           ↑
         [MV3]

세 점의 MV가 다르다면 → 단순 translation이 아님
→ 아핀 변환으로 모델링 가능
```

### 아핀 모델 추정 (스펙 Section 7.10.4)

**최소 자승법(Least Squares)**으로 아핀 파라미터를 추정한다.

```
입력: 인접 블록의 (좌표, MV) 쌍 여러 개
      (x₁, y₁) → MV₁
      (x₂, y₂) → MV₂
      (x₃, y₃) → MV₃
      ...

목표: 아핀 파라미터 (a, b, c, d, tx, ty) 찾기
      minimize Σᵢ ‖(xᵢ', yᵢ') - A(xᵢ, yᵢ) - t‖²
```

### find_warp_samples() (스펙 Section 7.10.4)

인접 블록에서 유효한 MV 샘플을 수집한다.

```cpp
struct WarpSample {
    int x, y;      // 블록 중심 좌표
    int mvx, mvy;  // 해당 블록의 MV
};

int find_warp_samples(
    int block_x, int block_y,
    int block_width, int block_height,
    WarpSample* samples)
{
    int num_samples = 0;

    // 위쪽 인접 블록들 스캔
    for (int x = block_x - 1; x <= block_x + block_width; x += 4) {
        if (has_valid_mv(x, block_y - 1)) {
            samples[num_samples++] = get_sample(x, block_y - 1);
            if (num_samples >= MAX_WARP_SAMPLES) break;
        }
    }

    // 왼쪽 인접 블록들 스캔
    for (int y = block_y; y < block_y + block_height; y += 4) {
        if (has_valid_mv(block_x - 1, y)) {
            samples[num_samples++] = get_sample(block_x - 1, y);
            if (num_samples >= MAX_WARP_SAMPLES) break;
        }
    }

    // 위-왼쪽 대각 블록
    if (has_valid_mv(block_x - 1, block_y - 1)) {
        samples[num_samples++] = get_sample(block_x - 1, block_y - 1);
    }

    return num_samples;
}
```

### 샘플 개수에 따른 모델 선택

```
샘플 개수:  적용 모델:
    < 2     Warp 불가 → 일반 MV 사용
    = 2     ROTZOOM (4 파라미터)로 폴백
    >= 3    AFFINE (6 파라미터) 가능
```

### setup_shear() (스펙 Section 7.11.3.6)

추정된 아핀 파라미터가 **유효한 범위**인지 검사한다.

```cpp
bool setup_shear(WarpParams* params)
{
    // 아핀 행렬: [a b; c d]
    // shear 성분: alpha = a - d, beta = b + c

    int alpha = params->a - params->d;
    int beta = params->b + params->c;

    // shear가 너무 크면 워프 비활성화
    // (시각적으로 이상한 결과 방지)
    if (abs(alpha) > WARP_PARAM_MAX || abs(beta) > WARP_PARAM_MAX) {
        return false;  // 워프 불가
    }

    params->alpha = alpha;
    params->beta = beta;
    return true;
}
```

### Warp 예측 실행 (스펙 Section 7.11.3)

```cpp
void warp_predict(
    int block_x, int block_y,
    int block_width, int block_height,
    const WarpParams* warp,
    const uint8_t* ref_frame,
    uint8_t* pred)
{
    // 블록 중심 기준
    int center_x = block_x + block_width / 2;
    int center_y = block_y + block_height / 2;

    for (int y = 0; y < block_height; y++) {
        for (int x = 0; x < block_width; x++) {
            // 블록 중심 기준 상대 좌표
            int rel_x = (block_x + x) - center_x;
            int rel_y = (block_y + y) - center_y;

            // 아핀 변환 적용
            int ref_x = warp->a * rel_x + warp->b * rel_y +
                        center_x * (1 << WARPEDMODEL_PREC_BITS) + warp->tx;
            int ref_y = warp->c * rel_x + warp->d * rel_y +
                        center_y * (1 << WARPEDMODEL_PREC_BITS) + warp->ty;

            // 서브픽셀 보간
            pred[y * block_width + x] =
                warp_interpolate(ref_frame, ref_x, ref_y);
        }
    }
}
```

### Local Warp의 장점

```
장점:
  - 추가 비트 거의 없음 (인접 MV에서 자동 추정)
  - 복잡한 물체 움직임에 적응

제약:
  - 유효한 인접 MV가 충분해야 함 (최소 2~3개)
  - 계산 복잡도 증가
```

---

## 14.3 OBMC — Overlapped Block Motion Compensation

### 문제: 블록 경계 불연속

인접 블록의 MV가 크게 다르면 블록 경계에서 **불연속**이 발생한다.

```
블록 A (MV = 오른쪽):    블록 B (MV = 아래쪽):
┌─────────────┬─────────────┐
│  → → →      │      ↓ ↓ ↓  │
│  → → →      │      ↓ ↓ ↓  │
│  → → →      │      ↓ ↓ ↓  │
└─────────────┴─────────────┘
              ↑
           경계에서 급격한 불연속!
```

이런 불연속은 디블로킹 필터로 완화할 수 있지만, 애초에 예측 단계에서 부드럽게 하면 더 효율적이다.

### OBMC의 아이디어 (스펙 Section 7.11.3.8)

**이웃 블록의 예측을 현재 블록의 경계 영역과 블렌딩**한다.

```
1. 현재 블록의 표준 Inter 예측 생성 (pred_current)
2. 위쪽 이웃의 MV로 현재 블록 영역을 예측 (pred_above)
3. 왼쪽 이웃의 MV로 현재 블록 영역을 예측 (pred_left)
4. 경계 영역에서 블렌딩:
   pred = w_curr × pred_current + w_above × pred_above + w_left × pred_left
```

### 가중치 마스크

가중치는 경계 근처에서 이웃이 크고, 내부로 갈수록 현재 블록이 커진다.

```
위쪽 이웃의 가중치 (obmc_mask_above):
┌─────────────────────┐
│ 64 64 64 64 64 64 64│  ← 위쪽 경계: 이웃 가중치 최대
│ 48 48 48 48 48 48 48│
│ 32 32 32 32 32 32 32│  ← 중간: 50/50
│ 16 16 16 16 16 16 16│
│  0  0  0  0  0  0  0│  ← 내부: 현재 블록만
│  0  0  0  0  0  0  0│
│  0  0  0  0  0  0  0│
│  0  0  0  0  0  0  0│
└─────────────────────┘

왼쪽 이웃의 가중치 (obmc_mask_left):
┌─────────────────────┐
│ 64 48 32 16 0 0 0 0 │
│ 64 48 32 16 0 0 0 0 │
│ 64 48 32 16 0 0 0 0 │
│ ... (같은 패턴)      │
└─────────────────────┘
```

### OBMC 구현 (스펙 Section 7.11.3.8)

```cpp
void obmc_predict(
    int block_x, int block_y,
    int block_width, int block_height,
    uint8_t* pred,
    const NeighborInfo* neighbors,
    const uint8_t* ref_frames[])
{
    // 1단계: 현재 블록의 기본 예측 (이미 완료)
    // pred에 현재 MV로 예측된 값이 있음

    // 2단계: 위쪽 이웃으로 오버랩
    if (neighbors->above_available && neighbors->above_uses_inter) {
        uint8_t pred_above[MAX_BLOCK_SIZE * MAX_BLOCK_SIZE];

        // 위쪽 이웃의 MV로 현재 블록 영역 예측
        motion_compensate(
            ref_frames[neighbors->above_ref],
            neighbors->above_mv,
            block_x, block_y, block_width, block_height,
            pred_above
        );

        // 블렌딩 (위쪽 몇 줄만)
        int overlap_rows = min(block_height / 2, 4);  // 보통 2~4줄
        for (int y = 0; y < overlap_rows; y++) {
            int w_neighbor = obmc_mask[y];  // 예: 64, 48, 32, 16
            int w_current = 64 - w_neighbor;
            for (int x = 0; x < block_width; x++) {
                int idx = y * block_width + x;
                pred[idx] = (w_current * pred[idx] +
                             w_neighbor * pred_above[idx] + 32) >> 6;
            }
        }
    }

    // 3단계: 왼쪽 이웃으로 오버랩 (유사하게)
    if (neighbors->left_available && neighbors->left_uses_inter) {
        uint8_t pred_left[MAX_BLOCK_SIZE * MAX_BLOCK_SIZE];

        motion_compensate(
            ref_frames[neighbors->left_ref],
            neighbors->left_mv,
            block_x, block_y, block_width, block_height,
            pred_left
        );

        int overlap_cols = min(block_width / 2, 4);
        for (int y = 0; y < block_height; y++) {
            for (int x = 0; x < overlap_cols; x++) {
                int w_neighbor = obmc_mask[x];
                int w_current = 64 - w_neighbor;
                int idx = y * block_width + x;
                pred[idx] = (w_current * pred[idx] +
                             w_neighbor * pred_left[idx] + 32) >> 6;
            }
        }
    }
}
```

### OBMC 마스크 테이블

```cpp
// 블록 크기별 OBMC 감쇄 곡선
// 값: 0~64 (이웃 가중치)
static const int obmc_mask_4[4] = {64, 48, 32, 16};
static const int obmc_mask_8[8] = {64, 56, 48, 40, 32, 24, 16, 8};
static const int obmc_mask_16[16] = {
    64, 60, 56, 52, 48, 44, 40, 36,
    32, 28, 24, 20, 16, 12,  8,  4
};
```

### OBMC의 효과

```
OBMC 적용 전:              OBMC 적용 후:
┌─────────┬─────────┐     ┌─────────┬─────────┐
│         │         │     │         │         │
│  100    │   50    │     │  100  ~70~  50    │
│         │ 급격한  │     │       부드러운     │
│         │ 경계    │     │       전환        │
└─────────┴─────────┘     └─────────┴─────────┘
```

디블로킹 전에 이미 경계가 부드러우므로 필터 부담이 줄어든다.

### OBMC 활성화 조건

```cpp
bool should_use_obmc(BlockContext* ctx)
{
    // OBMC는 Inter 블록에서만 가능
    if (!is_inter(ctx)) return false;

    // OBMC가 활성화되어 있어야 함 (시퀀스/프레임 레벨)
    if (!ctx->enable_obmc) return false;

    // 블록 크기가 너무 작으면 비활성화
    if (ctx->block_width < 8 || ctx->block_height < 8) return false;

    return true;
}
```

---

## 14.4 Global Motion vs Local Warp vs OBMC 비교

| 특성 | Global Motion | Local Warp | OBMC |
|------|--------------|------------|------|
| 적용 범위 | 프레임 전체 | 개별 블록 | 블록 경계 |
| 파라미터 전송 | Frame Header | 없음 (자동 추정) | 없음 |
| 변환 종류 | 4가지 모델 | AFFINE만 | 블렌딩 |
| 목적 | 카메라 움직임 | 복잡한 물체 | 경계 부드러움 |
| 비트 비용 | 2~74 bits/frame | 0 | 0 |

### 예시 시나리오

**시나리오 1: 카메라 팬**
- Global Motion = TRANSLATION이 가장 효과적
- 모든 블록이 같은 MV → 프레임 레벨에서 한 번만 코딩

**시나리오 2: 회전하는 물체 + 고정 배경**
- 배경: Global Motion = IDENTITY
- 물체: Local Warp로 회전 모델링

**시나리오 3: 여러 물체가 다르게 움직임**
- Global Motion은 도움 안 됨
- 블록별 MV + OBMC로 경계 처리

---

## 14.5 Inter 예측 모드 전체 흐름

```cpp
void predict_inter_block(BlockContext* ctx, uint8_t* pred)
{
    // 1. 기본 예측 모드 결정
    if (use_global_motion(ctx)) {
        // Global Motion 적용
        apply_global_motion(ctx->x, ctx->y, ctx->width, ctx->height,
                           &ctx->global_motion, ctx->ref_frame, pred);
    }
    else if (can_use_warp(ctx)) {
        // Local Warped Motion 적용
        WarpSample samples[MAX_WARP_SAMPLES];
        int num = find_warp_samples(ctx, samples);
        if (num >= 2) {
            WarpParams warp;
            estimate_warp_params(samples, num, &warp);
            if (setup_shear(&warp)) {
                warp_predict(ctx, &warp, pred);
            } else {
                // 폴백: 일반 motion compensation
                motion_compensate(ctx, pred);
            }
        }
    }
    else {
        // 일반 Motion Compensation
        motion_compensate(ctx, pred);
    }

    // 2. Compound 처리 (두 번째 참조가 있으면)
    if (ctx->is_compound) {
        predict_compound(ctx, pred);
    }

    // 3. OBMC 적용 (활성화되어 있으면)
    if (should_use_obmc(ctx)) {
        obmc_predict(ctx, pred);
    }
}
```

---

## 정리

- **Global Motion**은 프레임 레벨의 기하학적 변환 (4가지 모델)
  - IDENTITY: 움직임 없음
  - TRANSLATION: 평행 이동 (카메라 팬)
  - ROTZOOM: 회전 + 줌 (4 파라미터)
  - AFFINE: 일반 아핀 (6 파라미터)
- **Local Warped Motion**은 블록 레벨 아핀 변환
  - 인접 MV에서 자동 추정 → 추가 비트 없음
  - 복잡한 물체 움직임에 적응
- **OBMC**는 이웃 블록 예측을 경계에서 블렌딩
  - 블록 경계의 불연속 완화
  - 디블로킹 필터 부담 감소
- 세 기법은 **동시에** 적용될 수 있음:
  - 배경은 Global Motion으로
  - 물체는 Local Warp로
  - 경계는 OBMC로

---

## 다음 장 예고

Ch 15에서는 **MFMV (Motion Field Motion Vectors)**를 다룬다. 참조 프레임의 MV 정보를 현재 프레임으로 "전이"하는 시간적 MV 예측을 살펴본다.

---

## 관련 항목

- [Ch 12: Inter 예측](/blog/media/av1/chapter12-inter-prediction) — 기본 Motion Compensation
- [Ch 13: Compound 예측](/blog/media/av1/chapter13-compound-prediction) — 두 참조 블렌딩
- [Ch 15: MFMV](/blog/media/av1/chapter15-mfmv) — 시간적 MV 전파
