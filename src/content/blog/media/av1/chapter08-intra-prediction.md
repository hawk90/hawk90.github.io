---
title: "Ch 8: Intra 예측"
date: 2026-05-16T09:00:00
description: "AV1의 Intra 예측 — DC, Paeth, Smooth, 56개 방향 예측, CfL, Filter Intra."
tags: [AV1, Video, Codec, Intra, Prediction]
series: "AV1"
seriesOrder: 8
draft: true
---

## 8.1 Intra 예측의 핵심 아이디어

Intra 예측은 **이미 복원된 이웃 픽셀**로 현재 블록을 예측한다.

```
참조 가능 (이미 복원됨)
    ↓
+---+---+---+---+---+
| ↖ | a | a | a | a |  ← above (위)
+---+---+---+---+---+
| l | ? | ? | ? | ? |  ← 현재 블록
+---+---+---+---+---+     (예측 대상)
| l | ? | ? | ? | ? |
+---+---+---+---+---+
| l | ? | ? | ? | ? |
+---+---+---+---+---+
  ↑
 left (왼쪽)
```

### 참조 샘플

N×N 블록에서:
- **above**: 위쪽 N개 픽셀
- **left**: 왼쪽 N개 픽셀
- **above-left**: 대각선 코너 1개

총 **2N+1개**의 참조 픽셀을 사용한다.

### 가장자리 처리

프레임 가장자리에서 참조가 없을 때:
- 사용 가능한 이웃으로 복제 (mirroring)
- 기본값(128) 사용

### 모드 시그널링

```
y_mode: 13가지 기본 모드 + angle_delta
uv_mode: 13가지 + CfL

엔트로피 코딩으로 모드 인덱스 디코딩
```

## 8.2 13가지 기본 모드

(스펙 Section 7.11.2)

| 모드 | 이름 | 설명 |
|------|------|------|
| 0 | DC_PRED | 이웃 평균 |
| 1 | V_PRED | 수직 (90°) |
| 2 | H_PRED | 수평 (180°) |
| 3 | D45_PRED | 대각선 45° |
| 4 | D135_PRED | 대각선 135° |
| 5 | D113_PRED | 113° |
| 6 | D157_PRED | 157° |
| 7 | D203_PRED | 203° |
| 8 | D67_PRED | 67° |
| 9 | SMOOTH_PRED | 4방향 블렌딩 |
| 10 | SMOOTH_V_PRED | 수직 블렌딩 |
| 11 | SMOOTH_H_PRED | 수평 블렌딩 |
| 12 | PAETH_PRED | 가장 가까운 이웃 선택 |

방향 모드(1~8)에는 **angle_delta**(±3)가 추가되어 총 56개 방향이 된다.

## 8.3 DC_PRED

가장 단순한 예측. 이웃 픽셀의 **산술 평균**으로 블록 전체를 채운다.

### 수식

```
pred(x, y) = (Σ above[i] + Σ left[j]) / (2 × N)
```

위쪽 N개 + 왼쪽 N개의 평균.

### 변형

| 조건 | 공식 |
|------|------|
| 위/왼 모두 있음 | (Σ above + Σ left) / (2N) |
| 위만 있음 | Σ above / N |
| 왼만 있음 | Σ left / N |
| 둘 다 없음 | 128 (중간값) |

### 구현

```cpp
int predict_dc(int* above, int* left, int N, bool has_above, bool has_left) {
    int sum = 0;
    int count = 0;

    if (has_above) {
        for (int i = 0; i < N; i++) sum += above[i];
        count += N;
    }
    if (has_left) {
        for (int i = 0; i < N; i++) sum += left[i];
        count += N;
    }

    return (count > 0) ? (sum + count / 2) / count : 128;
}
```

### 언제 효과적인가

평탄한 영역: 하늘, 벽, 균일한 배경.

## 8.4 PAETH_PRED

대각선 그래디언트를 따라가되, **가장 신뢰할 수 있는 이웃**을 선택한다.

### 수식

```
base = left[y] + above[x] - above_left

pLeft      = |base - left[y]|
pAbove     = |base - above[x]|
pAboveLeft = |base - above_left|

pred(x, y) = argmin(left[y], above[x], above_left)
```

세 후보(left, above, above_left) 중 `base`에 가장 가까운 값을 선택한다.

### 직관

```
      |  a
------+-----
  l   |  ?

base = l + a - al (대각선 연장)
```

대각선 방향의 그래디언트를 예측하되, 실제 이웃 값 중 가장 가까운 것을 사용한다.

### 구현

```cpp
int paeth_predict(int left, int above, int above_left) {
    int base = left + above - above_left;

    int p_left = abs(base - left);
    int p_above = abs(base - above);
    int p_above_left = abs(base - above_left);

    if (p_left <= p_above && p_left <= p_above_left)
        return left;
    else if (p_above <= p_above_left)
        return above;
    else
        return above_left;
}
```

### 언제 효과적인가

대각선 패턴, 점진적 색상 변화, 텍스처 경계.

## 8.5 SMOOTH 예측

이웃 픽셀을 **부드럽게 블렌딩**한다.

### SMOOTH_PRED (4방향)

위, 아래, 좌, 우 4방향에서 가중치를 적용한다.

```
below_pred = left[N-1]   (아래쪽 경계 추정)
right_pred = above[N-1]  (오른쪽 경계 추정)

pred(x, y) = (above[x] × sm_weights_v[y]
            + below_pred × (256 - sm_weights_v[y])
            + left[y] × sm_weights_h[x]
            + right_pred × (256 - sm_weights_h[x])
            + 256) >> 9
```

### 가중치 테이블

`sm_weights`는 블록 크기별로 사전 정의된다. 이차 곡선을 근사한다.

```cpp
// 4×4 블록용 가중치 (예시)
const int sm_weights_4[4] = {255, 149, 85, 64};
```

경계에서 중앙으로 갈수록 가중치가 감소한다.

### SMOOTH_V_PRED (수직만)

```
pred(x, y) = (above[x] × sm_weights[y]
            + below_pred × (256 - sm_weights[y])
            + 128) >> 8
```

### SMOOTH_H_PRED (수평만)

```
pred(x, y) = (left[y] × sm_weights[x]
            + right_pred × (256 - sm_weights[x])
            + 128) >> 8
```

### 언제 효과적인가

점진적 그래디언트, 조명 변화, 그라데이션.

## 8.6 Directional 예측 (56방향)

(스펙 Section 7.11.2.4)

### 8개 기본 방향

```
             90° (V_PRED)
              ↑
   135°     |     67°
      \     |     /
       \    |    /
        \   |   /
180° ----+----→ 0°
  (H)   /   |   \
       /    |    \
      /     |     \
   203°     |    157°
            ↓
          270°

기본 모드: V(90°), H(180°), D45, D135, D113, D157, D203, D67
```

### angle_delta

기본 각도에서 **±3도 단위**로 미세 조정:

```
angle_delta ∈ {-3, -2, -1, 0, +1, +2, +3}
실제 각도 = nominal_angle + angle_delta × 3

예: D45_PRED + delta=+2 → 45 + 6 = 51°
```

총 방향 수: 8 × 7 = **56개**.

### 방향 예측의 수학

각도에서 기울기(dx, dy)를 계산하고, 참조 위치를 결정한다.

```cpp
void predict_directional(int angle, int* pred, int N,
                         int* above, int* left) {
    int dx, dy;
    angle_to_gradient(angle, &dx, &dy);

    for (int y = 0; y < N; y++) {
        for (int x = 0; x < N; x++) {
            // 방향에 따라 참조 위치 계산 (서브픽셀 정밀도)
            int ref_offset = ((x + 1) * dx) >> 8;
            int frac = ((x + 1) * dx) & 0xFF;

            // 선형 보간
            if (angle < 90) {
                // 위쪽 참조
                pred[y * N + x] = (above[ref_offset] * (256 - frac)
                                 + above[ref_offset + 1] * frac
                                 + 128) >> 8;
            } else {
                // 왼쪽 참조
                // ...
            }
        }
    }
}
```

서브픽셀 정밀도: **1/256 단위** 보간.

### Intra Edge 처리

(스펙 Section 7.11.2.7~7.11.2.12)

참조 픽셀을 개선하는 여러 서브프로세스:

| 함수 | 역할 |
|------|------|
| `filter_corner()` | 코너 참조 픽셀 보정 |
| `intra_edge_filter()` | 3-tap 또는 5-tap 로우패스 필터 |
| `intra_edge_upsample()` | 참조 픽셀 2배 업샘플링 |

작은 블록(8×8 이하) + 특정 각도에서 업샘플링이 활성화된다.

## 8.7 Filter Intra

(스펙 Section 7.11.2.6)

참조 픽셀에 **7-tap 필터**를 적용해서 예측한다.

### 5가지 필터 타입

| 타입 | 설명 |
|------|------|
| FILTER_DC | DC 기반 필터 |
| FILTER_V | 수직 기반 필터 |
| FILTER_H | 수평 기반 필터 |
| FILTER_D157 | 대각선 기반 필터 |
| FILTER_PAETH | Paeth 기반 필터 |

### 처리 방식

4×2 서브블록 단위로 순차 생성:

```
1. 이웃 픽셀에서 7개 참조 샘플 수집
2. 7-tap 필터 적용:
   pred = Σᵢ filter_coeff[i] × ref[i]
3. 결과를 다음 서브블록의 참조로 사용 (재귀적)
```

필터링된 참조는 더 "깨끗"해서 경계 화질이 개선된다.

## 8.8 Chroma from Luma (CfL)

(스펙 Section 7.11.5)

**루마 신호로 크로마를 예측**한다. 자연 영상에서 밝기 변화와 색 변화는 같은 위치에서 발생하기 때문이다.

### 핵심 수식

```
AC_luma(x, y) = reconstructed_luma(x, y) - mean(reconstructed_luma)
pred_chroma(x, y) = DC_chroma + α × AC_luma(x, y)
```

- `DC_chroma`: DC_PRED로 구한 크로마 기저값
- `α`: 스케일링 파라미터 (시그널링됨, 16개 값 중 하나)
- `AC_luma`: 루마의 DC를 제거한 교류 성분

### 4:2:0 처리

크로마 해상도가 루마의 절반이므로:
1. 루마를 2×2 평균으로 서브샘플링
2. 서브샘플링된 루마의 AC 성분 계산
3. 크로마 예측 생성

```cpp
void predict_cfl(int* chroma_pred, int* luma_recon,
                 int N, int alpha, int dc_chroma) {
    // 1. 루마 평균 계산
    int luma_mean = 0;
    for (int i = 0; i < N * N; i++)
        luma_mean += luma_recon[i];
    luma_mean /= (N * N);

    // 2. AC + 스케일링 → 크로마 예측
    for (int i = 0; i < N * N; i++) {
        int ac = luma_recon[i] - luma_mean;
        int scaled = (alpha * ac + 256) >> 9;
        chroma_pred[i] = Clip1(dc_chroma + scaled);
    }
}
```

### 왜 효과적인가

- 경계, 텍스처 구조가 루마/크로마에서 공유됨
- 크로마에서 복잡한 패턴을 별도로 코딩하지 않아도 됨

## 8.9 Palette Mode

(스펙 Section 7.11.6)

**스크린 콘텐츠**(UI, 텍스트, 애니메이션)에 최적화된 모드.

### 동작

1. **팔레트 정의**: 2~8색 컬러북
2. **인덱스 할당**: 블록 내 각 픽셀에 컬러 인덱스
3. **엔트로피 코딩**: 인덱스 시퀀스 압축

```
팔레트: [#FF0000, #00FF00, #0000FF]

블록:
0 0 0 1
0 1 1 1    → 인덱스 시퀀스 코딩
2 2 1 1
2 2 2 1
```

### 팔레트 재사용

이전 블록의 팔레트를 재사용할 수 있다. 새 색상만 추가하면 된다.

### 적용 대상

- UI 스크린샷
- 애니메이션
- 텍스트 렌더링
- 로고, 그래픽

## 8.10 Intra Block Copy (IntraBC)

(스펙 Section 7.11.7)

**같은 프레임 내**에서 이미 복원된 영역을 복사한다.

### 동작

```
+---------+---------+
|         |  ref    |  ← 이미 복원됨
|         |  블록   |
+---------+---------+
|  현재   |         |
|  블록   |         |  → ref를 블록 벡터로 참조
+---------+---------+
```

블록 벡터(BV)로 참조 위치를 지정한다.

### 제약

- **정수 벡터만** 허용 (서브픽셀 불가)
- 참조 영역이 **이미 복원**되어 있어야 함
- 타일 경계를 넘을 수 없음

### 적용 대상

- 반복 패턴 (UI 요소)
- 텍스트 복제
- 스크린 콘텐츠

## 8.11 모드 선택 과정

디코더는 비트스트림에서 모드를 읽는다:

```
1. y_mode 읽기 (13가지 중 하나)
2. 방향 모드면 angle_delta 읽기 (±3)
3. Filter Intra 플래그 확인
4. 크로마: uv_mode 읽기 (13가지 + CfL)
5. Palette/IntraBC 플래그 확인
```

인코더는 RDO로 최적 모드를 선택한다.

## 정리

- Intra 예측은 **이웃 픽셀**으로 현재 블록을 예측한다.
- **13가지 기본 모드**: DC, V, H, D45, D135, D113, D157, D203, D67, SMOOTH 3종, PAETH.
- **56개 방향**: 8개 기본 방향 + angle_delta(±3).
- **DC_PRED**: 이웃 평균. 평탄 영역에 효과적.
- **PAETH_PRED**: 대각선 그래디언트 + 가장 가까운 이웃. 텍스처 경계에 효과적.
- **SMOOTH**: 가중 블렌딩. 그래디언트에 효과적.
- **Filter Intra**: 7-tap 필터로 경계 화질 개선.
- **CfL**: 루마로 크로마 예측. 자연 영상에서 효율적.
- **Palette**: 스크린 콘텐츠용 컬러북.
- **IntraBC**: 같은 프레임 내 블록 복사.

## 다음 장 예고

Ch 9에서는 변환과 양자화를 다룬다. DCT, ADST, Identity 변환과 역양자화를 살펴본다.

## 관련 항목

- [Ch 6: 블록 구조](/blog/media/av1/chapter06-block-structure)
- [Ch 7: 엔트로피 디코딩](/blog/media/av1/chapter07-entropy-coding)
- [Ch 9: 변환과 양자화](/blog/media/av1/chapter09-transform-quantization)
