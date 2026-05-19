---
title: "Ch 16: 디블로킹 필터"
date: 2026-05-16T17:00:00
description: "AV1의 디블로킹 필터 — 블록 경계 강도, 4/8/14-tap 필터, sharpness, flatness 판별의 원리와 구현."
tags: [AV1, Video, Codec, Deblocking, Loop Filter]
series: "AV1"
seriesOrder: 16
draft: true
---

Ch 10에서 프레임을 복원하고 BMP로 저장했다. 자세히 보면 **블록 경계에 희미한 줄**이 보인다. 특히 QP가 높거나 단색 영역에서 눈에 띈다. 이것이 **블록 아티팩트(blocking artifact)**다.

AV1의 **디블로킹 필터(Deblocking Filter)**는 이 아티팩트를 제거하면서도 실제 에지는 보존한다. 이 장에서는 디블로킹 필터의 원리와 구현을 상세히 살펴본다.

---

## 16.0 직관 — 왜 복원 직후 이미지에 격자무늬가 보이는가

### 직접 확인

Ch 10에서 복원한 프레임을 200% 확대해 보자.

```
┌─────────────────────────────────────────┐
│                                         │
│     부드러운 영역                         │
│                                         │
│─────────────────────────────────────────│  ← 블록 경계 (눈에 보이는 선)
│                                         │
│     부드러운 영역                         │
│                                         │
└─────────────────────────────────────────┘
```

원본 이미지에는 없던 **가로/세로 줄**이 보인다. 이것이 블록 경계 아티팩트다.

### 원인: 독립적인 양자화

각 블록은 **독립적으로** 양자화된다.

```
블록 A의 양자화:
  원본 픽셀: 100
  양자화 후: 103  → 양자화 오차 = +3

블록 B의 양자화 (바로 옆):
  원본 픽셀: 100
  양자화 후: 98   → 양자화 오차 = -2

경계에서의 차이: 103 - 98 = 5
→ 원래는 연속적이어야 할 영역에 5만큼의 불연속
→ 눈에 "선"으로 보임
```

### 양자화 세기와 아티팩트

```
낮은 QP (고화질):
  - 양자화 스텝 작음 → 오차 작음
  - 블록 경계 거의 안 보임

높은 QP (저화질):
  - 양자화 스텝 큼 → 오차 큼
  - 블록 경계가 격자무늬처럼 보임
```

### 해결 아이디어

```
단순 접근: 블록 경계를 부드럽게 (블러)
문제: 실제 에지(건물 윤곽, 글자)도 흐려짐

AV1의 접근: "아티팩트 경계" vs "실제 에지"를 구별
  - 아티팩트 경계: 경계 양쪽이 비슷한데 살짝 다름 → 필터링
  - 실제 에지: 경계 양쪽이 원래부터 많이 다름 → 보존
```

---

## 16.1 왜 블록 경계에 줄이 생기는가

### 블록 기반 압축의 본질적 한계

```
영상 압축의 기본 구조:
1. 프레임을 블록으로 분할
2. 각 블록을 독립적으로 처리 (예측 → 잔차 → 변환 → 양자화)
3. 인접 블록 간 조율 없음

결과:
- 각 블록의 양자화 오차가 독립적
- 경계에서 오차가 급격히 바뀜
- 눈에 "선"으로 인식됨
```

### 경계 불연속의 시각화

```
원본 (연속적):
100 100 100 | 100 100 100
            블록 경계

양자화 후 (불연속):
103 102 101 | 98 99 100
            ↑
         5만큼 점프
         → 눈에 선으로 보임
```

### 아티팩트가 심해지는 조건

1. **높은 QP**: 양자화 오차가 큼
2. **평탄한 영역**: 작은 차이도 눈에 띔
3. **단색 배경**: 경계가 더 선명함
4. **움직임 적은 영상**: 정적인 아티팩트가 계속 보임

---

## 16.2 디블로킹 필터 동작 원리

### 적용 순서 (스펙 Section 7.14.1)

디블로킹은 **두 단계**로 적용된다.

```
1단계: 수직 경계(vertical edges) 필터링
       │   │   │   │
       ↓   ↓   ↓   ↓
       왼쪽↔오른쪽 픽셀 간 필터

2단계: 수평 경계(horizontal edges) 필터링
       ─ ─ ─ ─ ─ ─ ─
       ↑   ↑   ↑   ↑
       위↔아래 픽셀 간 필터
```

순서가 중요하다. 수직 필터링 결과가 수평 필터링의 입력이 된다.

### 4개의 독립 필터 레벨

```cpp
struct LoopFilterParams {
    int level[4];      // 각 성분의 기본 필터 레벨
    int sharpness;     // 전역 sharpness (0~7)
    int ref_deltas[8]; // 참조 프레임별 delta
    int mode_deltas[2];// 예측 모드별 delta
};

// level[0]: 루마 수직 경계
// level[1]: 루마 수평 경계
// level[2]: Cb (크로마)
// level[3]: Cr (크로마)
```

### 경계 강도(Boundary Strength) 결정

경계 양쪽 블록의 특성에 따라 필터 강도가 달라진다.

```
강도 결정 규칙:

Level 4 (가장 강함):
  - Intra 블록 경계
  - 또는 변환 블록(TX) 경계

Level 2 (중간):
  - 양쪽이 다른 참조 프레임 사용
  - 또는 MV 차이가 4 이상

Level 1 (약함):
  - 양쪽 중 하나라도 비제로 계수 있음

Level 0 (필터 안 함):
  - 위 조건 모두 해당 안 됨
```

### 필터 종류 (스펙 Section 7.14.5)

경계 강도와 영역 특성에 따라 3가지 필터 중 선택한다.

```
┌───────────────────────────────────────────────────────────┐
│                    디블로킹 필터 종류                      │
├─────────────────┬────────────────┬─────────────────────────┤
│ 필터 종류       │ 영향 범위      │ 사용 조건              │
├─────────────────┼────────────────┼─────────────────────────┤
│ 4-tap narrow    │ 경계 ±2 픽셀   │ 기본, 에지 근처        │
│ 8-tap wide      │ 경계 ±4 픽셀   │ 평탄 영역, 중간 크기   │
│ 14-tap flat     │ 경계 ±7 픽셀   │ 매우 평탄, 큰 블록     │
└─────────────────┴────────────────┴─────────────────────────┘
```

---

## 16.3 디블로킹 필터 수학

### 픽셀 명명 규칙

```
경계 양쪽의 픽셀 이름:

p7 p6 p5 p4 p3 p2 p1 p0 | q0 q1 q2 q3 q4 q5 q6 q7
                        ↑
                     경계 위치

- p0: 경계 바로 왼쪽 (또는 위쪽)
- q0: 경계 바로 오른쪽 (또는 아래쪽)
- p1, p2, ...: 경계에서 멀어지는 방향
```

### Narrow Filter (4-tap, 스펙 Section 7.14.5.1)

가장 기본적인 필터. 경계 ±2 픽셀(p1, p0, q0, q1)에 적용된다.

```cpp
void apply_narrow_filter(
    int8_t* p1, int8_t* p0, int8_t* q0, int8_t* q1,
    int limit, int hev)
{
    // 1단계: 기본 delta 계산
    int delta = q0 - p0;

    // 2단계: HEV 모드면 p1-q1 보정 추가
    if (!hev) {
        delta = clip3(-128, 127, 3 * delta + clip3(-128, 127, p1 - q1));
    } else {
        delta = clip3(-128, 127, 3 * delta);
    }

    // 3단계: 클리핑
    delta = clip3(-limit, limit, delta);

    // 4단계: 적용
    *p0 = clip_pixel(*p0 + delta);
    *q0 = clip_pixel(*q0 - delta);

    // HEV가 아니면 p1, q1도 살짝 조정
    if (!hev) {
        int delta_outer = clip3(-limit, limit, (delta + 1) >> 1);
        *p1 = clip_pixel(*p1 + delta_outer);
        *q1 = clip_pixel(*q1 - delta_outer);
    }
}
```

### Wide Filter (8-tap, 스펙 Section 7.14.5.2)

평탄한 영역에서 사용. 더 많은 픽셀을 평균화한다.

```cpp
void apply_wide_filter_8(
    int8_t* p3, int8_t* p2, int8_t* p1, int8_t* p0,
    int8_t* q0, int8_t* q1, int8_t* q2, int8_t* q3)
{
    // 가중 평균으로 부드럽게
    // 공식: 중심에 가까운 픽셀에 더 큰 가중치

    int p2_new = (p3 + p3 + p2 + 2*p1 + 2*p0 + 2*q0 + q1 + 4) >> 3;
    int p1_new = (p3 + p2 + p1 + p0 + q0 + q1 + 4) >> 3;
    int p0_new = (p2 + p1 + p0 + q0 + q1 + q2 + 4) >> 3;
    int q0_new = (p1 + p0 + q0 + q1 + q2 + q3 + 4) >> 3;
    int q1_new = (p0 + q0 + q1 + q2 + q3 + q3 + 4) >> 3;
    int q2_new = (2*p0 + 2*q0 + 2*q1 + q2 + q3 + q3 + 4) >> 3;

    *p2 = p2_new; *p1 = p1_new; *p0 = p0_new;
    *q0 = q0_new; *q1 = q1_new; *q2 = q2_new;
}
```

### Flat Filter (14-tap, 스펙 Section 7.14.5.3)

가장 넓은 필터. 매우 평탄한 큰 블록 경계에서 사용.

```cpp
void apply_flat_filter_14(int8_t* p, int8_t* q)
{
    // p[-7] ~ p[0] 와 q[0] ~ q[7] 총 14 픽셀 사용

    // 각 픽셀에 대한 가중 평균
    // 경계에서 멀수록 원래 값에 가깝게 유지
    int p6_new = (7*p[-7] + 2*p[-6] + p[-5] + p[-4] + p[-3] +
                  p[-2] + p[-1] + p[0] + q[0] + 8) >> 4;

    int p5_new = (6*p[-7] + 2*p[-6] + 2*p[-5] + p[-4] + p[-3] +
                  p[-2] + p[-1] + p[0] + q[0] + q[1] + 8) >> 4;

    // ... p4 ~ q4도 유사 ...

    int q5_new = (p[-1] + p[0] + q[0] + q[1] + q[2] + q[3] +
                  2*q[4] + 2*q[5] + 6*q[6] + 8) >> 4;

    int q6_new = (p[0] + q[0] + q[1] + q[2] + q[3] + q[4] +
                  q[5] + 2*q[6] + 7*q[7] + 8) >> 4;

    // 결과 저장
    p[-6] = p6_new; p[-5] = p5_new; // ...
    q[5] = q5_new; q[6] = q6_new;
}
```

### Sharpness 파라미터

sharpness(0~7)는 필터 강도를 전역적으로 제한한다.

```cpp
int adjust_limit_for_sharpness(int limit, int sharpness)
{
    if (sharpness == 0) return limit;

    int max_limit;
    if (sharpness > 4) {
        max_limit = 9 - sharpness;  // sharpness 5→4, 6→3, 7→2
    } else {
        max_limit = sharpness + 3;  // sharpness 1→4, 2→5, 3→6, 4→7
    }

    return min(limit, max_limit);
}

// sharpness가 높으면 → limit이 작아짐 → 에지 보호 강화
```

---

## 16.4 필터 크기와 마스크 결정 프로세스

### get_filter_strength() (스펙 Section 7.14.2)

블록의 특성에서 필터 레벨을 도출한다.

```cpp
int get_filter_strength(
    DecoderContext* ctx,
    int block_x, int block_y,
    int plane,      // 0=luma, 1=Cb, 2=Cr
    int direction)  // 0=vertical, 1=horizontal
{
    // 기본 레벨
    int base_level = ctx->lf.level[plane * 2 + direction];

    // 세그먼트 delta
    int seg_id = ctx->segment_id[block_y][block_x];
    int seg_delta = ctx->segment_features[seg_id].lf_delta;

    // 참조 프레임 delta
    int ref = ctx->ref_frame[block_y][block_x];
    int ref_delta = ctx->lf.ref_deltas[ref];

    // 예측 모드 delta
    int mode = ctx->prediction_mode[block_y][block_x];
    int mode_delta = ctx->lf.mode_deltas[mode == ZEROMV ? 1 : 0];

    // 합산
    int level = base_level + seg_delta + ref_delta + mode_delta;

    // sharpness 적용
    level = adjust_limit_for_sharpness(level, ctx->lf.sharpness);

    return clip3(0, 63, level);
}
```

### get_filter_size() (스펙 Section 7.14.3)

블록 크기와 경계 유형에서 필터 길이를 결정한다.

```cpp
int get_filter_size(
    int block_size_p,  // 경계 왼쪽(위쪽) 블록 크기
    int block_size_q,  // 경계 오른쪽(아래쪽) 블록 크기
    bool is_tx_edge,   // 변환 블록 경계인가
    bool is_cb_edge)   // 코딩 블록 경계인가
{
    // 변환 블록 경계이지만 코딩 블록 경계가 아니면 → 4-tap
    if (is_tx_edge && !is_cb_edge) {
        return 4;
    }

    // 블록 크기에 따른 최대 필터 크기
    int min_size = min(block_size_p, block_size_q);

    if (min_size >= 16) {
        return 14;  // 큰 블록: 14-tap
    } else if (min_size >= 8) {
        return 8;   // 중간 블록: 8-tap
    } else {
        return 4;   // 작은 블록: 4-tap
    }
}
```

### Flatness 판별 (스펙 Section 7.14.5)

넓은 필터를 적용할지 결정하는 평탄성 검사다.

```cpp
bool check_flatness(
    const int8_t* p, const int8_t* q,
    int range,      // 검사 범위 (4 또는 8)
    int threshold)  // 평탄성 임계값
{
    // 경계 기준 픽셀(p0, q0)과의 차이가 모두 threshold 이하인지

    // p쪽 검사
    for (int i = 1; i < range; i++) {
        if (abs(p[-i] - p[0]) > threshold) return false;
    }

    // q쪽 검사
    for (int i = 1; i < range; i++) {
        if (abs(q[i] - q[0]) > threshold) return false;
    }

    return true;
}

// threshold는 bit depth에 따라:
// 8-bit: 1
// 10-bit: 4
// 12-bit: 16
int get_flat_threshold(int bit_depth) {
    return 1 << (bit_depth - 8);
}
```

### HEV 마스크 (High Edge Variance, 스펙 Section 7.14.6)

narrow filter에서 내부/외부 픽셀 처리를 결정한다.

```cpp
bool check_hev(
    int p1, int p0, int q0, int q1,
    int hev_threshold)
{
    // 경계 바로 옆 픽셀(p0-p1, q0-q1)의 차이가 크면 HEV
    return (abs(p1 - p0) > hev_threshold) ||
           (abs(q1 - q0) > hev_threshold);
}

// HEV=true면 p1, q1은 수정하지 않음 (에지 보호)
// HEV=false면 p1, q1도 살짝 조정 (부드러운 영역)
```

### get_filter_mask() (스펙 Section 7.14.4)

필터링할 경계를 식별하는 마스크를 생성한다.

```cpp
void generate_filter_masks(
    DecoderContext* ctx,
    int tile_x, int tile_y,
    int tile_width, int tile_height)
{
    // 4×4 블록 단위로 순회
    for (int y = 0; y < tile_height; y += 4) {
        for (int x = 0; x < tile_width; x += 4) {
            // 수직 경계 마스크 (x가 경계인 위치)
            if (x > 0) {
                int level = get_filter_strength(ctx, tile_x + x, tile_y + y, 0, 0);
                ctx->v_mask[y/4][x/4] = (level > 0);
            }

            // 수평 경계 마스크 (y가 경계인 위치)
            if (y > 0) {
                int level = get_filter_strength(ctx, tile_x + x, tile_y + y, 0, 1);
                ctx->h_mask[y/4][x/4] = (level > 0);
            }
        }
    }
}
```

---

## 16.5 디블로킹 필터 전체 구현

### apply_deblocking() 전체 흐름

```cpp
void apply_deblocking(DecoderContext* ctx)
{
    // 타일 단위로 처리
    for (int tile = 0; tile < ctx->num_tiles; tile++) {
        int tile_x = ctx->tiles[tile].x;
        int tile_y = ctx->tiles[tile].y;
        int tile_w = ctx->tiles[tile].width;
        int tile_h = ctx->tiles[tile].height;

        // 1단계: 수직 경계 필터링
        filter_vertical_edges(ctx, tile_x, tile_y, tile_w, tile_h);

        // 2단계: 수평 경계 필터링
        filter_horizontal_edges(ctx, tile_x, tile_y, tile_w, tile_h);
    }

    // 크로마도 동일하게 (다른 필터 레벨로)
    for (int plane = 1; plane <= 2; plane++) {
        for (int tile = 0; tile < ctx->num_tiles; tile++) {
            // ... 크로마 필터링 ...
        }
    }
}
```

### 단일 경계 필터링

```cpp
void filter_edge(
    DecoderContext* ctx,
    int x, int y,           // 경계 위치
    int direction,          // 0=vertical, 1=horizontal
    int plane)              // 0=Y, 1=Cb, 2=Cr
{
    // 1. 필터 강도 확인
    int level = get_filter_strength(ctx, x, y, plane, direction);
    if (level == 0) return;

    // 2. 경계 양쪽 픽셀 가져오기
    int8_t p[8], q[8];
    get_edge_pixels(ctx, x, y, direction, plane, p, q);

    // 3. 필터 적용 조건 확인
    int threshold = (level >> 4) + 1;
    if (!should_filter(p, q, threshold)) {
        return;  // 실제 에지 → 필터 안 함
    }

    // 4. 필터 크기 결정
    int filter_size = get_filter_size(
        get_block_size(ctx, x - 1, y),
        get_block_size(ctx, x, y),
        is_tx_edge(ctx, x, y),
        is_cb_edge(ctx, x, y)
    );

    // 5. Flatness 확인
    int flat_threshold = get_flat_threshold(ctx->bit_depth);
    bool flat4 = check_flatness(p, q, 4, flat_threshold);
    bool flat8 = flat4 && check_flatness(p, q, 8, flat_threshold);

    // 6. 필터 적용
    if (filter_size >= 14 && flat8) {
        apply_flat_filter_14(p, q);
    } else if (filter_size >= 8 && flat4) {
        apply_wide_filter_8(p - 3, p - 2, p - 1, p, q, q + 1, q + 2, q + 3);
    } else {
        int hev = check_hev(p[-1], p[0], q[0], q[1], level >> 4);
        apply_narrow_filter(p - 1, p, q, q + 1, level, hev);
    }

    // 7. 결과를 프레임에 다시 쓰기
    set_edge_pixels(ctx, x, y, direction, plane, p, q);
}
```

### 필터 적용 조건 판단

```cpp
bool should_filter(const int8_t* p, const int8_t* q, int threshold)
{
    // 스펙 공식: |p0 - q0| × 2 + |p1 - q1| / 2 <= threshold
    int diff = abs(p[0] - q[0]) * 2 + abs(p[-1] - q[1]) / 2;

    if (diff > threshold) {
        // 경계 양쪽의 차이가 너무 큼 → 실제 에지
        return false;
    }

    // 추가 조건: p쪽과 q쪽 내부 변화도 확인
    if (abs(p[0] - p[-1]) > threshold / 2 ||
        abs(q[0] - q[1]) > threshold / 2) {
        return false;
    }

    return true;
}
```

---

## 16.6 디블로킹 필터의 효과

### Before/After 비교

```
필터 적용 전 (블록 경계에서):
... 102 103 105 | 98 99 100 ...
              ↑
           7만큼 점프

필터 적용 후:
... 102 103 102 | 100 99 100 ...
              ↑
           2만큼 점프 (부드러움)
```

### PSNR 변화

디블로킹 필터는 **PSNR을 약간 낮출 수 있다**. 왜냐하면 필터링으로 픽셀 값이 원본과 달라지기 때문이다. 하지만 **시각적 품질은 향상**된다.

```
디블로킹 전: PSNR = 32.5 dB (블록 아티팩트 눈에 띔)
디블로킹 후: PSNR = 32.3 dB (부드러워 보임)

PSNR은 낮지만, 실제 영상은 더 좋아 보임
→ PSNR만으로 화질을 판단하면 안 됨
```

### 시각화 코드

```cpp
void visualize_deblocking_effect(
    const uint8_t* before,
    const uint8_t* after,
    int width, int height,
    const char* output_file)
{
    // 차이 이미지 생성
    uint8_t* diff = malloc(width * height);

    for (int i = 0; i < width * height; i++) {
        int d = abs(before[i] - after[i]);
        diff[i] = min(255, d * 10);  // 차이를 10배 확대
    }

    write_bmp(output_file, diff, width, height);
    free(diff);

    // 결과: 블록 경계 위치가 밝게 나타남
}
```

---

## 16.7 구현 최적화

### SIMD 가속

디블로킹 필터는 픽셀 단위 연산이 많아 SIMD로 가속할 수 있다.

```cpp
// SSE2 예시 (narrow filter)
void apply_narrow_filter_sse2(
    __m128i* p1, __m128i* p0, __m128i* q0, __m128i* q1,
    __m128i limit)
{
    // 8개 경계를 동시에 처리
    __m128i delta = _mm_sub_epi16(*q0, *p0);
    delta = _mm_mullo_epi16(delta, _mm_set1_epi16(3));

    // 클리핑 및 적용
    delta = _mm_max_epi16(_mm_min_epi16(delta, limit),
                          _mm_sub_epi16(_mm_setzero_si128(), limit));

    *p0 = _mm_add_epi16(*p0, delta);
    *q0 = _mm_sub_epi16(*q0, delta);
}
```

### 병렬 처리

- 수직 경계와 수평 경계는 **순차적**으로 처리해야 함
- 하지만 같은 방향의 **다른 타일**은 병렬 가능

```cpp
// OpenMP 예시
void apply_deblocking_parallel(DecoderContext* ctx)
{
    // 수직 경계: 타일 간 병렬
    #pragma omp parallel for
    for (int tile = 0; tile < ctx->num_tiles; tile++) {
        filter_vertical_edges_tile(ctx, tile);
    }

    // 동기화 필요

    // 수평 경계: 타일 간 병렬
    #pragma omp parallel for
    for (int tile = 0; tile < ctx->num_tiles; tile++) {
        filter_horizontal_edges_tile(ctx, tile);
    }
}
```

---

## 정리

- **블록 아티팩트**는 독립적인 양자화로 인한 경계 불연속
- **디블로킹 필터**는 아티팩트 경계를 부드럽게 하고 실제 에지는 보존
- 3가지 필터 종류:
  - **4-tap narrow**: 기본, 경계 ±2 픽셀
  - **8-tap wide**: 평탄 영역, 경계 ±4 픽셀
  - **14-tap flat**: 매우 평탄, 경계 ±7 픽셀
- **Flatness 판별**로 넓은 필터 적용 여부 결정
- **HEV 마스크**로 에지 근처에서 필터 강도 제한
- **sharpness**로 전역적인 에지 보호 수준 조절
- 적용 순서: 수직 경계 → 수평 경계

---

## 다음 장 예고

Ch 17에서는 **CDEF (Constrained Directional Enhancement Filter)**를 다룬다. 디블로킹이 처리하지 못하는 **링잉 아티팩트**를 에지 방향을 감지하여 제거하는 AV1 고유 필터를 살펴본다.

---

## 관련 항목

- [Ch 10: 프레임 조립](/blog/media/av1/chapter10-frame-assembly) — 복원 픽셀 생성
- [Ch 17: CDEF](/blog/media/av1/chapter17-cdef) — 방향성 강화 필터
- [Ch 9: 변환과 양자화](/blog/media/av1/chapter09-transform-quantization) — 양자화 오차의 원인
