---
title: "Ch 12: Inter 예측"
date: 2025-10-01T13:00:00
description: "AV1의 Inter 예측 — Motion Vector, 1/8 픽셀 정밀도, 보간 필터, MV 예측 시스템."
tags: [AV1, Video, Codec, Inter, Motion Vector]
series: "AV1"
seriesOrder: 12
draft: true
---

Inter 예측은 AV1 압축의 핵심이다. 비디오의 **90% 이상의 블록**이 Inter 예측으로 처리된다. 이 장에서는 참조 프레임에서 현재 블록을 예측하는 **Motion Vector**, **서브픽셀 보간**, **MV 예측 시스템**을 살펴본다.

---

## 12.1 Inter 예측의 직관

### "복사 + 붙여넣기"

Inter 예측의 핵심 아이디어는 단순하다:

```
이전 프레임과 현재 프레임은 거의 같다.
차이가 나는 이유 = 물체가 움직였기 때문.
"물체가 어디로 움직였는지"만 알려주면,
이전 프레임에서 해당 위치를 복사한다.
```

이 "어디로 움직였는지"가 **Motion Vector (MV)**다.

### 예시

```
이전 프레임:                   현재 프레임:
+------------------+           +------------------+
|      ○          |           |          ○      |
|    공이         |    →→→    |        공이     |
|    여기 있음     |    MV     |        여기로   |
|                  |  = (3,0)  |        이동     |
+------------------+           +------------------+

MV = (3, 0) → "공이 오른쪽으로 3픽셀 이동"
```

### 왜 효과적인가

30fps 영상에서:
- 대부분의 장면은 정적 배경
- 움직이는 물체도 연속 프레임 간 위치 변화가 작음
- MV 하나로 블록 전체를 예측 → **잔차가 거의 0**
- 극소량의 비트만 필요

---

## 12.2 Motion Vector의 의미

### MV = 참조 위치 오프셋

```
MV = (mvx, mvy)

의미: "이 블록은 참조 프레임의 (x + mvx, y + mvy) 위치에서 왔다"
```

**현재 블록 위치가 (100, 200)이고 MV = (-5, 3)이면:**
- 참조 위치 = (100 - 5, 200 + 3) = (95, 203)
- 참조 프레임의 (95, 203) 위치에서 블록을 복사

### 1/8 픽셀 정밀도 (스펙 Section 7.10)

AV1의 MV는 **1/8 픽셀 단위**다:

```
MV 값 19 → 19/8 = 2.375 픽셀 오프셋

정수 부분: 2 → 참조 블록의 대략적 위치
소수 부분: 3/8 → 정수 위치 사이를 보간으로 채움
```

**왜 서브픽셀인가?**

물체는 정수 픽셀 단위로 움직이지 않는다:

```
30fps에서 1픽셀/프레임 = 30픽셀/초

실제 물체 속도가 25픽셀/초라면?
→ 매 프레임 0.83픽셀 이동
→ 정수 MV로는 0 또는 1밖에 표현 못함
→ 1/8 픽셀이면 0.875 (7/8)로 정확히 표현
```

| 정밀도 | 표현 가능 | 정확도 | 비트 |
|--------|-----------|--------|------|
| 정수 | 0, 1, 2, ... | 낮음 | 적음 |
| 1/2 | 0, 0.5, 1, ... | 중간 | 중간 |
| 1/4 | 0, 0.25, 0.5, ... | 높음 | 많음 |
| 1/8 | 0, 0.125, 0.25, ... | 매우 높음 | 더 많음 |

AV1은 **1/8 픽셀** (3-bit 소수부)로 정확도와 비트 비용의 균형을 맞춘다.

### MV 범위

```
MV 값 범위: -2^14 ~ 2^14 - 1 (1/8 픽셀 단위)
실제 범위: ±2048 픽셀
```

4K 영상(3840×2160)에서도 프레임 전체를 커버한다.

---

## 12.3 Inter 모드와 MV 예측

MV를 직접 전송하면 비트 낭비다. **MV 예측**으로 비트를 절약한다.

### MV 후보 리스트

인접 블록의 MV를 수집하여 **후보 리스트**를 만든다 (스펙 Section 7.10.2):

```
현재 블록 위치와 인접 블록:

    +---+---+---+---+
    | T0| T1| T2| TR|  ← 위쪽 행 (Top)
+---+---+---+---+---+
| L0|   현재 블록   |
+---+               +
| L1|               |
+---+---+---+---+---+
  ↑
  왼쪽 열 (Left)

후보 수집 순서:
1. T0 (위-왼쪽)
2. L0 (왼쪽-위)
3. T1, T2 (위)
4. L1 (왼쪽)
5. TR (위-오른쪽)
6. 시간적 MV (이전 프레임의 동일 위치)
```

**중복 제거 후 최대 4개 후보 확정.**

### 4가지 Inter 모드

| 모드 | 설명 | 추가 비트 |
|------|------|-----------|
| **NEARESTMV** | 후보 리스트의 첫 번째 MV 사용 | 0 bits |
| **NEARMV** | 후보 리스트의 두 번째 MV 사용 | 0 bits |
| **GLOBALMV** | 프레임 레벨 글로벌 모션 모델 | 0 bits |
| **NEWMV** | MVD(차분)를 명시적으로 전송 | MVD 비트 |

### NEARESTMV / NEARMV

**가장 효율적**. 후보 리스트에서 그대로 사용:

```
후보 리스트: [MV0, MV1, MV2, MV3]

NEARESTMV → actual_mv = MV0
NEARMV → actual_mv = MV1

추가 비트: 0 (이미 예측 가능)
```

대부분의 블록은 이웃과 비슷한 움직임을 가지므로 NEARESTMV/NEARMV로 충분하다.

### GLOBALMV

프레임 전체의 **글로벌 모션**(카메라 팬, 줌 등)을 사용:

```
actual_mv = global_motion_params로 계산한 MV

추가 비트: 0 (Frame Header에서 이미 전송)
```

카메라가 일정하게 움직이는 장면에서 효과적.

### NEWMV

후보 MV로 부족할 때 **차분(MVD)**을 전송:

```
actual_mv = nearest_mv + mvd

MVD = (mvd_x, mvd_y)를 비트스트림에서 읽음
```

### MVD 코딩 (스펙 Section 7.10.3)

MVD는 다단계로 코딩한다:

```
단계 1: mv_joint
        → 어느 축에 움직임이 있는지
        → MV_JOINT_ZERO, MV_JOINT_HNZVZ, MV_JOINT_HZVNZ, MV_JOINT_HNZVNZ

단계 2: mv_class (각 축)
        → 크기 범위 (0~10 클래스)
        → 클래스 0: 0~1
        → 클래스 10: 1024~2047

단계 3: mv_bit
        → 클래스 내 정확한 정수 부분

단계 4: mv_fr
        → 소수 부분 (1/4 픽셀까지)

단계 5: mv_hp
        → 고정밀 모드일 때 1/8 픽셀
```

**예시:**

```
MVD = 19 (1/8 픽셀 단위) = 2.375 픽셀

분해:
- 정수 부분: 2 → mv_class = 1, mv_bit으로 코딩
- 소수 부분: 3/8 → mv_fr (0.25) + mv_hp (0.125)
```

### find_mv_candidates 의사 코드

```cpp
void find_mv_candidates(int mi_row, int mi_col, int bsize,
                        int ref_frame, MvStack* mv_stack) {
    mv_stack->count = 0;

    // 1. 공간적 후보 수집
    scan_row(mi_row - 1, mi_col, bsize, ref_frame, mv_stack);  // 위쪽
    scan_col(mi_row, mi_col - 1, bsize, ref_frame, mv_stack);  // 왼쪽
    scan_point(mi_row - 1, mi_col + width4, ref_frame, mv_stack);  // 위-오른쪽

    // 2. 시간적 후보 수집
    temporal_scan(mi_row, mi_col, ref_frame, mv_stack);

    // 3. 추가 검색 (대각선 등)
    if (mv_stack->count < 2) {
        extra_search(mi_row, mi_col, ref_frame, mv_stack);
    }

    // 4. 정렬 및 중복 제거
    sort_and_deduplicate(mv_stack);

    // 5. 부족하면 제로 MV로 채움
    while (mv_stack->count < 4) {
        add_mv(mv_stack, 0, 0);
    }
}
```

---

## 12.4 서브픽셀 보간

### 문제

MV가 (2.375, -1.125)면 참조 프레임에 **해당 위치의 픽셀이 없다**:

```
정수 픽셀 격자:
  x=0   x=1   x=2   x=3   x=4
   ●-----●-----●-----●-----●
   |     |     |     |     |
   ●-----●-----●-----●-----●
   |     |  ○  |     |     |  ← (2.375, 1.125) 위치
   ●-----●-----●-----●-----●     정수 격자 사이

   ● = 실제 픽셀
   ○ = 서브픽셀 위치 (픽셀 없음)
```

### 해결: 보간 필터

주변 정수 위치 픽셀들로 **가중 평균**:

```
result = Σᵢ filter[i] × ref[pos + i]
```

### AV1의 4가지 보간 필터

| 필터 | 탭 수 | 특성 | 용도 |
|------|-------|------|------|
| EIGHTTAP_REGULAR | 8 | 범용 | 가장 일반적 |
| EIGHTTAP_SMOOTH | 8 | 부드러움 | 평탄한 영역 |
| EIGHTTAP_SHARP | 8 | 날카로움 | 에지, 텍스처 |
| BILINEAR | 2 | 단순 | 저복잡도 |

### 8-tap 필터 계수 (스펙 Section 7.11.3.4)

**EIGHTTAP_REGULAR, 1/8 픽셀 오프셋별 계수:**

```
frac=0: [ 0,   0,   0, 128,   0,   0,   0,   0]  // 정수 위치
frac=1: [ 0,   1,  -5, 126,   8,  -3,   1,   0]  // 1/8
frac=2: [-1,   3, -10, 122,  18,  -6,   2,   0]  // 2/8
frac=3: [-1,   4, -13, 118,  27,  -9,   3,  -1]  // 3/8
frac=4: [-1,   4, -16, 112,  37, -11,   4,  -1]  // 4/8 = 1/2
frac=5: [-1,   5, -18, 105,  48, -14,   4,  -1]  // 5/8
frac=6: [-1,   5, -19,  97,  58, -16,   5,  -1]  // 6/8
frac=7: [-1,   5, -19,  88,  68, -18,   5,   0]  // 7/8
```

**특성:**
- 계수 합 = 128 (정규화)
- 중심 근처에 큰 가중치
- 음수 계수로 ringing 억제

### BILINEAR 필터

가장 단순한 선형 보간:

```cpp
result = ref[x] × (8 - frac) + ref[x+1] × frac
```

| frac | ref[x] 가중치 | ref[x+1] 가중치 |
|------|---------------|-----------------|
| 0 | 8 | 0 |
| 1 | 7 | 1 |
| 2 | 6 | 2 |
| 4 | 4 | 4 |
| 7 | 1 | 7 |

### 2D 보간 = 수평 + 수직

2D 보간은 **분리 가능(separable)**:

```
1. 모든 행에 수평 보간 적용 → 중간 버퍼
2. 중간 버퍼의 모든 열에 수직 보간 적용 → 최종 결과
```

```cpp
void subpixel_interpolate(uint8_t* ref, int ref_stride,
                          int x, int y, int frac_x, int frac_y,
                          int width, int height,
                          int filter_type,
                          int16_t* output) {
    int16_t temp[64 * 71];  // 중간 버퍼 (패딩 포함)
    const int8_t* h_filter = get_filter(filter_type, frac_x);
    const int8_t* v_filter = get_filter(filter_type, frac_y);

    // 1. 수평 보간
    for (int r = -3; r < height + 4; r++) {  // 수직 필터용 패딩
        for (int c = 0; c < width; c++) {
            int sum = 0;
            for (int k = 0; k < 8; k++) {
                sum += h_filter[k] * ref[(y + r) * ref_stride + (x + c - 3 + k)];
            }
            temp[(r + 3) * width + c] = (sum + 64) >> 7;  // 중간 정밀도
        }
    }

    // 2. 수직 보간
    for (int r = 0; r < height; r++) {
        for (int c = 0; c < width; c++) {
            int sum = 0;
            for (int k = 0; k < 8; k++) {
                sum += v_filter[k] * temp[(r + k) * width + c];
            }
            output[r * width + c] = (sum + 64) >> 7;
        }
    }
}
```

### Dual Filter

수평/수직 **독립적으로 필터 선택** 가능:

```
예: 수평 = SHARP, 수직 = SMOOTH

수평 에지가 강한 영상에서:
- 수평 방향: 에지 보존 → SHARP
- 수직 방향: 부드럽게 → SMOOTH
```

---

## 12.5 Motion Compensation 구현

### predict_inter 전체 흐름

```cpp
void predict_inter(int mi_row, int mi_col, int bsize,
                   int ref_frame, int_mv mv, int16_t* pred) {
    // 1. 참조 프레임 선택
    int ref_idx = ref_frame_idx[ref_frame - LAST_FRAME];
    RefFrameBuffer* ref = &ref_frames[ref_idx];

    // 2. 블록 크기
    int width = block_width[bsize];
    int height = block_height[bsize];

    // 3. MV 분해 (정수 + 소수)
    int mv_x = mv.mv.x;
    int mv_y = mv.mv.y;

    int int_x = mv_x >> 3;          // 정수 부분
    int int_y = mv_y >> 3;
    int frac_x = mv_x & 7;          // 소수 부분 (0~7)
    int frac_y = mv_y & 7;

    // 4. 참조 위치 계산
    int ref_x = mi_col * MI_SIZE + int_x;
    int ref_y = mi_row * MI_SIZE + int_y;

    // 5. 경계 처리 (패딩)
    if (needs_border_extension(ref_x, ref_y, width, height, ref)) {
        extend_border(ref, ref_x, ref_y, width, height);
    }

    // 6. 보간 필터 적용
    int filter_type = get_interp_filter(mi_row, mi_col);

    if (frac_x == 0 && frac_y == 0) {
        // 정수 위치: 직접 복사
        copy_block(ref, ref_x, ref_y, pred, width, height);
    } else if (frac_y == 0) {
        // 수평 보간만
        horizontal_interpolate(ref, ref_x, ref_y, frac_x, filter_type,
                               pred, width, height);
    } else if (frac_x == 0) {
        // 수직 보간만
        vertical_interpolate(ref, ref_x, ref_y, frac_y, filter_type,
                             pred, width, height);
    } else {
        // 2D 보간
        subpixel_interpolate(ref, ref_x, ref_y, frac_x, frac_y,
                             filter_type, pred, width, height);
    }
}
```

### 경계 처리

MV가 프레임 밖을 가리킬 때:

```
참조 프레임:
+------------------+
|                  |
|    유효 영역     |
|                  |
+------------------+
  ↑
  MV가 여기를 가리키면?
```

**엣지 픽셀 복제 (padding)**:

```cpp
void extend_border(RefFrameBuffer* ref, int x, int y, int w, int h) {
    // 왼쪽 경계
    if (x < 0) {
        for (int r = 0; r < h; r++) {
            for (int c = x; c < 0; c++) {
                extended[r][c - x] = ref->Y[r * ref->stride + 0];
            }
        }
    }
    // 오른쪽, 위, 아래도 유사하게 처리
}
```

---

## 12.6 Inter vs Intra 비교

### 예측 정확도

```
Intra 예측:
- 같은 프레임의 이웃 픽셀 참조
- 경계에서만 정보 획득
- 블록 내부는 "추정"

Inter 예측:
- 이전 프레임의 동일 영역 참조
- 전체 블록의 실제 픽셀 정보
- 훨씬 정확한 예측
```

### 잔차 비교

```
Intra 블록 잔차:           Inter 블록 잔차:
+---------------+           +---------------+
| 15  12  -8  5 |           |  1  -1   0   2|
| 10  -5  13 -7 |           | -2   0   1  -1|
| -9  11   8 -4 |           |  0   1  -1   0|
|  6  -3  -2  9 |           |  1   0   0  -2|
+---------------+           +---------------+
  값이 큼 (압축 어려움)        값이 작음 (압축 쉬움)
```

### 비트 비용

| 항목 | Intra | Inter |
|------|-------|-------|
| 예측 모드 | 13가지 + angle | MV 모드 |
| MV | 없음 | 0~많음 (모드에 따라) |
| 잔차 | 많음 | 적음 |
| **총 비트** | 중간~많음 | **적음** |

---

## 정리

1. **MV의 의미**: 참조 프레임에서 가져올 위치의 오프셋.

2. **1/8 픽셀 정밀도**: 3-bit 소수부로 서브픽셀 움직임 표현.

3. **MV 예측**: 인접 블록 MV로 후보 리스트, NEARESTMV/NEARMV는 0비트.

4. **NEWMV**: MVD(차분)를 다단계로 코딩 (mv_joint → mv_class → mv_bit).

5. **보간 필터**: 4종류 (REGULAR, SMOOTH, SHARP, BILINEAR), 8-tap.

6. **2D 보간**: 수평 + 수직 분리 가능, Dual Filter 지원.

7. **경계 처리**: 엣지 픽셀 복제로 프레임 밖 참조 처리.

8. **Inter의 장점**: 잔차가 작아 압축 효율 높음.

---

## 다음 장 예고

Ch 13에서는 **Compound 예측**을 다룬다. 두 참조 프레임을 혼합하여 더 정밀한 예측을 만드는 **Averaged**, **Distance-Weighted**, **Wedge**, **DIFFWTD** 기법을 살펴본다.

---

## 관련 항목

- [Ch 11: 참조 프레임](/blog/media/av1/chapter11-reference-frames) — 참조 버퍼 시스템
- [Ch 13: Compound 예측](/blog/media/av1/chapter13-compound-prediction) — 두 참조 혼합
- [Ch 14: 글로벌/워프드 모션](/blog/media/av1/chapter14-global-warped-motion) — 기하학적 변환
