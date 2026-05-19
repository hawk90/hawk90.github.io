---
title: "Ch 15: MFMV"
date: 2026-05-16T16:00:00
description: "AV1의 MFMV — Motion Field Motion Vectors, 시간적 MV 전파와 스케일링 메커니즘."
tags: [AV1, Video, Codec, MFMV, Motion Vector]
series: "AV1"
seriesOrder: 15
draft: true
---

Ch 12에서 MV 후보 리스트를 만들 때, 주로 **공간적 이웃**(위, 왼쪽 블록)에서 MV를 가져왔다. 하지만 비디오는 시간적 연속성이 강하다. "1초 전 같은 위치의 블록이 어떻게 움직였는지"를 알면, 현재 블록의 MV를 더 잘 예측할 수 있다.

AV1의 **MFMV(Motion Field Motion Vectors)**는 참조 프레임에 저장된 MV 정보를 현재 프레임의 MV 후보로 "전이(propagate)"하는 기법이다. 이 장에서는 Motion Field의 구조와 시간적 MV 예측의 원리를 살펴본다.

---

## 15.1 Motion Field란

### 개념

Motion Field는 프레임의 **모든 블록에 대한 MV 맵**이다.

```
프레임 N-1의 Motion Field:
┌───┬───┬───┬───┬───┬───┬───┬───┐
│→2 │→3 │→2 │↓1 │↓2 │↓1 │→1 │→1 │
├───┼───┼───┼───┼───┼───┼───┼───┤
│→2 │→3 │→2 │↓2 │↓2 │↓1 │→1 │→2 │
├───┼───┼───┼───┼───┼───┼───┼───┤
│→1 │→2 │→1 │↓1 │↓1 │→0 │→1 │→1 │
├───┼───┼───┼───┼───┼───┼───┼───┤
│ · │ · │→1 │→1 │→1 │→1 │→1 │ · │
└───┴───┴───┴───┴───┴───┴───┴───┘

각 칸: 해당 4×4 블록의 MV
(→2 = 오른쪽으로 2픽셀, ↓1 = 아래로 1픽셀)
```

### 저장 해상도

AV1은 Motion Field를 **4×4 블록 해상도**로 저장한다.

```
왜 4×4인가?
- 모든 블록 크기의 최소 공약수
- 8×8 블록 → 2×2개의 4×4 MV 저장
- 64×64 블록 → 16×16개의 4×4 MV 저장 (모두 같은 값)

메모리 사용량:
- 1080p 프레임: (1920/4) × (1080/4) = 480 × 270 = 129,600개 MV
- MV당 4바이트 (x, y 각 16비트) → 약 500KB/프레임
```

### 저장되는 정보

```cpp
struct MotionFieldEntry {
    int16_t mv_x;        // MV x 성분 (1/8 픽셀 단위)
    int16_t mv_y;        // MV y 성분 (1/8 픽셀 단위)
    int8_t ref_frame;    // 참조 프레임 인덱스 (LAST, GOLDEN 등)
};

// 프레임당 Motion Field
MotionFieldEntry motion_field[HEIGHT/4][WIDTH/4];
```

---

## 15.2 MFMV의 핵심 아이디어

### 시간적 MV 예측

핵심 가정:

> "참조 프레임에서 블록 B가 MV=(3, -2)로 코딩됐다면, 현재 프레임의 같은 위치도 비슷한 MV를 가질 것이다."

```
프레임 N-1 (참조):              프레임 N (현재):
┌─────────────────┐           ┌─────────────────┐
│                 │           │                 │
│   블록 B        │           │   블록 B'       │
│   MV=(3, -2)    │    →→     │   MV≈(3, -2)?   │
│                 │           │                 │
└─────────────────┘           └─────────────────┘
```

움직이는 물체는 연속적으로 비슷한 방향으로 움직이는 경향이 있으므로, 이 가정은 대부분 유효하다.

### 공간적 vs 시간적 MV 예측 비교

```
공간적 예측 (Ch 12):
- 현재 프레임의 위/왼쪽 이웃에서 MV 가져옴
- 장점: 항상 사용 가능
- 단점: 물체 경계에서 정확도 떨어짐

시간적 예측 (MFMV):
- 참조 프레임의 같은 위치에서 MV 가져옴
- 장점: 움직이는 물체에서 정확
- 단점: 장면 전환, 새 물체에서 무효
```

### MFMV가 MV 후보 리스트에 기여하는 방식

Ch 12에서 본 MV 후보 리스트에 MFMV 후보가 추가된다.

```
MV 후보 리스트 (최대 2개 후보):
┌─────────────────────────────────────────┐
│ 1. 공간적 후보 (위/왼쪽 이웃)            │
│ 2. 공간적 후보 (대각 이웃)              │
│ 3. MFMV 후보 (참조 프레임에서)    ← NEW │
│ 4. MFMV 후보 (다른 참조 프레임)   ← NEW │
│ 5. Global MV                            │
│ 6. Zero MV                              │
└─────────────────────────────────────────┘

→ 상위 2개를 NEARESTMV, NEARMV로 사용
```

---

## 15.3 시간 스케일링 — MV 크기 조정

### 문제: 시간 거리가 다르다

참조 프레임의 MV는 **그 프레임이 자신의 참조를 가리키던 MV**다. 시간 거리가 다르면 그대로 쓸 수 없다.

```
예시:
프레임 5: MV=(8, 0) → 프레임 3을 참조 (거리 2)
프레임 6: 프레임 5를 참조 (거리 1)

프레임 6에서 MFMV를 쓸 때:
- 프레임 5의 MV=(8, 0)은 "2프레임 동안 8픽셀 이동"을 의미
- 프레임 6→5는 1프레임 거리
- 스케일링: MV' = 8 × (1/2) = 4
```

### 스케일링 공식 (스펙 Section 7.10.2.1)

```cpp
// 시간 스케일링
scaled_mv = ref_mv × (current_to_ref_dist / ref_to_refref_dist)

// 실제 구현 (고정소수점)
int scale_mv(int ref_mv, int cur_dist, int ref_dist) {
    // 나눗셈을 곱셈으로 변환 (정수 연산 최적화)
    // scale = cur_dist / ref_dist
    // AV1은 이를 위한 lookup table 사용

    if (ref_dist == 0) return 0;

    // 16비트 고정소수점 스케일
    int scale = (cur_dist << 14) / ref_dist;

    // 스케일 적용
    int scaled = (ref_mv * scale + (1 << 13)) >> 14;

    return scaled;
}
```

### 구체적인 예시

```
시나리오:
- 프레임 순서: 0, 4, 6, 8
- 프레임 6을 디코딩 중
- 프레임 4의 Motion Field에서 MFMV 후보 추출

프레임 4의 블록 B:
  - MV = (12, -8)
  - 참조 = 프레임 0
  - ref_dist = 4 - 0 = 4

프레임 6에서 MFMV:
  - cur_dist = 6 - 4 = 2 (현재→참조 프레임4)
  - 또는 cur_dist = 6 - 0 = 6 (현재→참조 프레임0, 같은 참조 사용 시)

케이스 1: 프레임 6이 프레임 4를 참조할 때
  - 시간 거리가 다름, 스케일링 필요
  - scaled_mv = (12, -8) × (2/4) = (6, -4)

케이스 2: 프레임 6이 프레임 0을 직접 참조할 때
  - 프레임 4의 MV를 그대로 전이 (같은 참조 방향)
  - scaled_mv = (12, -8) × (6/4) = (18, -12)
```

### 스케일 범위 제한

```cpp
// 스케일이 너무 크거나 작으면 무효
#define MIN_SCALE (1 << 10)   // 1/16
#define MAX_SCALE (1 << 18)   // 16

bool is_valid_scale(int scale) {
    return scale >= MIN_SCALE && scale <= MAX_SCALE;
}
```

극단적인 시간 거리 차이(예: 16배 이상)에서는 MFMV를 사용하지 않는다.

---

## 15.4 Motion Field 저장 프로세스

### 프레임 디코딩 완료 후 저장

```cpp
void store_motion_field(
    DecoderContext* ctx,
    const MotionInfo* block_motion,  // 디코딩된 블록 정보
    int block_x, int block_y,
    int block_width, int block_height)
{
    // 4×4 블록 단위로 Motion Field에 저장

    // Intra 블록은 MV 없음
    if (block_motion->is_intra) {
        for (int y = 0; y < block_height; y += 4) {
            for (int x = 0; x < block_width; x += 4) {
                int mf_x = (block_x + x) / 4;
                int mf_y = (block_y + y) / 4;
                ctx->motion_field[mf_y][mf_x].ref_frame = INTRA_FRAME;
                ctx->motion_field[mf_y][mf_x].mv_x = 0;
                ctx->motion_field[mf_y][mf_x].mv_y = 0;
            }
        }
        return;
    }

    // Inter 블록: MV 저장
    for (int y = 0; y < block_height; y += 4) {
        for (int x = 0; x < block_width; x += 4) {
            int mf_x = (block_x + x) / 4;
            int mf_y = (block_y + y) / 4;

            ctx->motion_field[mf_y][mf_x].ref_frame = block_motion->ref_frame[0];
            ctx->motion_field[mf_y][mf_x].mv_x = block_motion->mv[0].x;
            ctx->motion_field[mf_y][mf_x].mv_y = block_motion->mv[0].y;
        }
    }
}
```

### 저장 시점

```
프레임 디코딩 흐름:
1. 비트스트림에서 블록 정보 파싱
2. 예측 생성 (Intra/Inter)
3. 잔차 추가 → 복원 픽셀
4. Motion Field에 MV 저장    ← 이 시점
5. 루프 필터 적용
6. 참조 버퍼에 프레임 저장
```

---

## 15.5 MFMV 후보 추출 프로세스

### 참조 프레임 선택

MFMV는 **최대 2개의 참조 프레임**에서 후보를 추출한다.

```cpp
// MFMV에 사용할 참조 프레임 결정
void select_mfmv_references(
    DecoderContext* ctx,
    int* ref_frames,
    int* num_refs)
{
    *num_refs = 0;

    // 우선순위: LAST, BWDREF, ALTREF2, ALTREF
    static const int priority[] = {
        LAST_FRAME, BWDREF_FRAME, ALTREF2_FRAME, ALTREF_FRAME
    };

    for (int i = 0; i < 4 && *num_refs < 2; i++) {
        int ref = priority[i];
        if (ctx->ref_valid[ref] && ctx->ref_order_hint[ref] != ctx->order_hint) {
            ref_frames[(*num_refs)++] = ref;
        }
    }
}
```

### 후보 위치 샘플링

현재 블록 위치와 주변에서 MFMV 후보를 샘플링한다.

```cpp
// MFMV 후보 위치 (상대 좌표)
static const int mfmv_sample_positions[][2] = {
    {0, 0},       // 블록 중심
    {-4, 0},      // 왼쪽
    {0, -4},      // 위
    {4, 0},       // 오른쪽
    {0, 4},       // 아래
    {-4, -4},     // 왼쪽 위
    {4, -4},      // 오른쪽 위
};
```

### estimate_motion_field() (스펙 Section 7.10.2)

```cpp
void estimate_motion_field(
    DecoderContext* ctx,
    int block_x, int block_y,
    int block_width, int block_height,
    MvCandidate* candidates,
    int* num_candidates)
{
    *num_candidates = 0;

    // 사용할 참조 프레임 선택
    int ref_frames[2];
    int num_refs;
    select_mfmv_references(ctx, ref_frames, &num_refs);

    for (int r = 0; r < num_refs && *num_candidates < 2; r++) {
        int ref = ref_frames[r];
        RefFrameBuffer* ref_buf = &ctx->ref_frame_bufs[ref];

        // 시간 스케일 계산
        int cur_to_ref = get_relative_dist(ctx->order_hint, ref_buf->order_hint);
        if (cur_to_ref == 0) continue;

        // 블록 중심 위치
        int center_x = block_x + block_width / 2;
        int center_y = block_y + block_height / 2;

        // Motion Field에서 샘플링
        for (int s = 0; s < NUM_MFMV_SAMPLES && *num_candidates < 2; s++) {
            int sample_x = center_x + mfmv_sample_positions[s][0];
            int sample_y = center_y + mfmv_sample_positions[s][1];

            // 범위 체크
            if (sample_x < 0 || sample_x >= ctx->width ||
                sample_y < 0 || sample_y >= ctx->height) {
                continue;
            }

            // Motion Field 조회
            int mf_x = sample_x / 4;
            int mf_y = sample_y / 4;
            MotionFieldEntry* entry = &ref_buf->motion_field[mf_y][mf_x];

            // Intra 블록은 스킵
            if (entry->ref_frame == INTRA_FRAME) continue;

            // 시간 스케일링
            int ref_to_refref = get_relative_dist(
                ref_buf->order_hint,
                ctx->ref_order_hints[entry->ref_frame]
            );
            if (ref_to_refref == 0) continue;

            int scale = compute_scale(cur_to_ref, ref_to_refref);
            if (!is_valid_scale(scale)) continue;

            // 스케일된 MV
            int scaled_mvx = scale_mv(entry->mv_x, scale);
            int scaled_mvy = scale_mv(entry->mv_y, scale);

            // 후보 추가 (중복 체크)
            if (!is_duplicate_candidate(candidates, *num_candidates,
                                        scaled_mvx, scaled_mvy)) {
                candidates[*num_candidates].mv_x = scaled_mvx;
                candidates[*num_candidates].mv_y = scaled_mvy;
                candidates[*num_candidates].ref_frame = ref;
                (*num_candidates)++;
            }
        }
    }
}
```

---

## 15.6 MFMV와 MV 후보 리스트 통합

### 최종 MV 후보 리스트 구성

```cpp
void build_mv_candidate_list(
    DecoderContext* ctx,
    int block_x, int block_y,
    int block_width, int block_height,
    int ref_frame,
    MvCandidate* list,
    int* list_size)
{
    *list_size = 0;

    // 1. 공간적 후보 (가장 높은 우선순위)
    add_spatial_candidates(ctx, block_x, block_y, ref_frame, list, list_size);

    // 2. MFMV 후보
    if (ctx->enable_mfmv && *list_size < 2) {
        MvCandidate mfmv_candidates[2];
        int num_mfmv;
        estimate_motion_field(ctx, block_x, block_y,
                              block_width, block_height,
                              mfmv_candidates, &num_mfmv);

        for (int i = 0; i < num_mfmv && *list_size < 2; i++) {
            // 참조 프레임이 일치하는 후보만
            if (mfmv_candidates[i].ref_frame == ref_frame) {
                if (!is_duplicate(list, *list_size, &mfmv_candidates[i])) {
                    list[(*list_size)++] = mfmv_candidates[i];
                }
            }
        }
    }

    // 3. Global Motion
    if (*list_size < 2 && ctx->global_motion[ref_frame].gm_type != IDENTITY) {
        add_global_mv_candidate(ctx, block_x, block_y, ref_frame, list, list_size);
    }

    // 4. Zero MV (폴백)
    while (*list_size < 2) {
        list[*list_size].mv_x = 0;
        list[*list_size].mv_y = 0;
        list[*list_size].ref_frame = ref_frame;
        (*list_size)++;
    }
}
```

### MFMV 활성화 조건

```cpp
bool is_mfmv_enabled(DecoderContext* ctx)
{
    // Sequence Header에서 활성화되어야 함
    if (!ctx->seq_header.enable_order_hint) return false;

    // Frame Header에서도 활성화되어야 함
    if (!ctx->frame_header.use_ref_frame_mvs) return false;

    // Intra 프레임에서는 사용 불가
    if (ctx->frame_header.frame_type == KEY_FRAME ||
        ctx->frame_header.frame_type == INTRA_ONLY_FRAME) {
        return false;
    }

    return true;
}
```

---

## 15.7 MFMV의 효과

### 비트 절약

MFMV가 좋은 후보를 제공하면:

```
MFMV 없이:
  - MV 후보: (0, 0), (이웃 MV)
  - 실제 MV: (12, -8)
  - NEWMV로 12, -8을 직접 전송 필요 → 많은 비트

MFMV로:
  - MV 후보: (12, -8), (이웃 MV)  ← MFMV가 정확한 후보 제공
  - NEARESTMV 선택 → 0비트
  - 또는 작은 MVD만 전송
```

### 적용 시나리오

```
효과적인 경우:
- 일정한 속도로 움직이는 물체
- 카메라 팬/틸트
- 배경의 평행 이동

효과 없는 경우:
- 장면 전환
- 새로 나타난 물체
- 급격한 움직임 변화
- 가려진 영역
```

### 실제 비트 절약 예시

```
테스트 시퀀스: 1080p 30fps, 움직임 있는 영상

MFMV 비활성화:
  - Inter 블록 MV 비트: 평균 8.5 bits/block

MFMV 활성화:
  - Inter 블록 MV 비트: 평균 6.2 bits/block
  - 절약: ~27%

(실제 절약률은 콘텐츠에 따라 다름)
```

---

## 15.8 디버깅과 시각화

### Motion Field 덤프

```cpp
void dump_motion_field(DecoderContext* ctx, int frame_num)
{
    char filename[256];
    sprintf(filename, "motion_field_%03d.txt", frame_num);
    FILE* f = fopen(filename, "w");

    fprintf(f, "Motion Field for frame %d\n", frame_num);
    fprintf(f, "Size: %d x %d (4x4 blocks)\n",
            ctx->width / 4, ctx->height / 4);

    for (int y = 0; y < ctx->height / 4; y++) {
        for (int x = 0; x < ctx->width / 4; x++) {
            MotionFieldEntry* e = &ctx->motion_field[y][x];
            if (e->ref_frame == INTRA_FRAME) {
                fprintf(f, "  .  ");
            } else {
                fprintf(f, "%3d,%3d ", e->mv_x, e->mv_y);
            }
        }
        fprintf(f, "\n");
    }

    fclose(f);
}
```

### MV 필드 시각화

```cpp
void visualize_mv_field(
    const uint8_t* frame,
    const MotionFieldEntry* mf,
    int width, int height,
    uint8_t* output)
{
    // 원본 프레임 복사
    memcpy(output, frame, width * height);

    // 각 4×4 블록에 화살표 그리기
    for (int by = 0; by < height / 4; by++) {
        for (int bx = 0; bx < width / 4; bx++) {
            MotionFieldEntry* e = &mf[by * (width/4) + bx];

            if (e->ref_frame == INTRA_FRAME) continue;

            // 블록 중심
            int cx = bx * 4 + 2;
            int cy = by * 4 + 2;

            // 화살표 끝점 (MV 방향, 축소해서 표시)
            int ex = cx + e->mv_x / 8;  // 1/8 픽셀 → 픽셀
            int ey = cy + e->mv_y / 8;

            // 화살표 그리기 (간단한 선)
            draw_line(output, width, height, cx, cy, ex, ey, 255);
        }
    }
}
```

---

## 15.9 마일스톤: 멀티프레임 시퀀스 디코딩

Ch 15까지의 내용으로 **여러 프레임을 연속 디코딩**할 수 있다.

```cpp
void decode_video_sequence(const char* input_file)
{
    DecoderContext ctx;
    init_decoder(&ctx);

    FILE* f = fopen(input_file, "rb");
    int frame_num = 0;

    while (!feof(f)) {
        // OBU 파싱 (Ch 2)
        ObuHeader obu;
        if (!parse_obu(f, &obu)) break;

        if (obu.type == OBU_FRAME || obu.type == OBU_FRAME_HEADER) {
            // 프레임 디코딩
            decode_frame(&ctx, &obu);

            // 복원 이미지 저장
            char filename[256];
            sprintf(filename, "frame_%03d.bmp", frame_num);
            write_bmp(filename, ctx.reconstructed, ctx.width, ctx.height);

            // Motion Field 저장 (다음 프레임의 MFMV용)
            // → decode_frame() 내부에서 이미 처리됨

            frame_num++;
        }
    }

    fclose(f);
    printf("Decoded %d frames\n", frame_num);
}
```

### 체크포인트

```
이 시점에서 우리 디코더가 할 수 있는 것:
✓ OBU 파싱 (Ch 2)
✓ 시퀀스/프레임 헤더 해석 (Ch 3, 5)
✓ 타일/슈퍼블록 구조 (Ch 3)
✓ 파티셔닝 재귀 (Ch 4)
✓ 블록 모드 파싱 (Ch 6)
✓ 엔트로피 디코딩 (Ch 7)
✓ Intra 예측 (Ch 8)
✓ 변환/양자화 (Ch 9)
✓ 프레임 조립 (Ch 10)
✓ 참조 프레임 관리 (Ch 11)
✓ Inter 예측 + 서브픽셀 보간 (Ch 12)
✓ Compound 예측 (Ch 13)
✓ Global/Warped Motion (Ch 14)
✓ MFMV 시간적 예측 (Ch 15)

아직 남은 것:
- 루프 필터 (Ch 16-17)
- Film Grain (Ch 19)
```

---

## 정리

- **Motion Field**는 프레임의 4×4 블록 해상도 MV 맵
- **MFMV**는 참조 프레임의 MV를 현재 프레임의 MV 후보로 전이
- **시간 스케일링**으로 다른 시간 거리를 보정:
  ```
  scaled_mv = ref_mv × (cur_dist / ref_dist)
  ```
- MFMV 후보는 공간적 후보와 함께 MV 후보 리스트에 추가됨
- 일정한 움직임 시퀀스에서 **큰 비트 절약** 가능
- MFMV 활성화 조건:
  - Sequence Header의 `enable_order_hint`
  - Frame Header의 `use_ref_frame_mvs`
  - Inter 프레임만

---

## 다음 장 예고

Ch 16에서는 **디블로킹 필터**를 다룬다. 복원 직후 이미지에 보이는 블록 경계 아티팩트를 어떻게 제거하는지 살펴본다.

---

## 관련 항목

- [Ch 11: 참조 프레임](/blog/media/av1/chapter11-reference-frames) — 참조 버퍼 구조
- [Ch 12: Inter 예측](/blog/media/av1/chapter12-inter-prediction) — MV 후보 리스트
- [Ch 14: Global/Warped Motion](/blog/media/av1/chapter14-global-warped-motion) — 다른 고급 모션 기법
- [Ch 16: 디블로킹 필터](/blog/media/av1/chapter16-deblocking) — 블록 경계 처리
