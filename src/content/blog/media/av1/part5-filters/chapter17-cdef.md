---
title: "Ch 17: CDEF"
date: 2025-10-01T18:00:00
description: "AV1의 CDEF — Constrained Directional Enhancement Filter, 에지 방향 감지와 비선형 필터."
tags: [AV1, Video, Codec, CDEF, Filter]
series: "AV1"
seriesOrder: 17
draft: false
---

Ch 16에서 디블로킹 필터를 살펴봤다. 블록 경계의 계단 현상은 잘 처리했지만, 블록 내부에 남은 아티팩트는 어떻게 할까? 특히 강한 에지 주변에 물결처럼 나타나는 **링잉(ringing) 아티팩트**는 디블로킹만으로는 해결되지 않는다.

이 장에서는 AV1 고유의 필터인 **CDEF(Constrained Directional Enhancement Filter)**를 다룬다. 에지 방향을 감지해서 에지를 따라 필터링하고, 비선형 클리핑으로 극단적인 값을 제한하는 방식이다.

---

## 17.1 CDEF가 해결하는 문제

디블로킹 필터의 한계부터 이해해야 CDEF가 왜 필요한지 알 수 있다.

### 디블로킹의 한계

디블로킹 필터는 **블록 경계만** 처리한다:

```
┌─────────┬─────────┐
│         │         │
│ Block A │ Block B │
│         │         │
│         ↑         │
└─────────┴─────────┘
          │
     디블로킹 적용 위치
     (경계 4~14픽셀만)
```

블록 내부에서 발생하는 아티팩트는 전혀 건드리지 않는다. 그래서 경계는 매끄러워졌는데 블록 안쪽은 여전히 문제가 있는 경우가 생긴다.

### 링잉 아티팩트

**링잉 아티팩트**는 강한 에지 주변에 물결 패턴이 나타나는 현상이다:

```
원본 에지:                      링잉 발생 후:

██████████░░░░░░░░░░            ██████████░░░░░░░░░░
██████████░░░░░░░░░░            ███████▒▒░░░▒░░░░░░
██████████░░░░░░░░░░            ██████████░░░░░░░░░
██████████░░░░░░░░░░    →       ███████▒▒░░░▒░░░░░░
██████████░░░░░░░░░░            ██████████░░░░░░░░░
                                      ↑
                                 에지 주변 물결 패턴
```

발생 원인은 **고주파 양자화 오차**다:

1. 강한 에지는 고주파 성분이 많다
2. 양자화가 고주파를 손상시킨다
3. 역변환 시 손상된 고주파가 에지 주변으로 퍼진다
4. 물결 같은 패턴이 나타난다

이 현상은 JPEG에서도 볼 수 있다 — 선명한 경계 주변에 색이 번지는 것과 같은 원리다.

### CDEF의 전략

CDEF는 다음 3단계 전략으로 링잉을 해결한다:

```
1단계: 에지 방향 감지
┌─────────────┐
│     ╲       │  → 방향 = 45° (북동-남서)
│      ╲      │
│       ╲     │
└─────────────┘

2단계: 에지를 따라 필터링
     ╲  ╲  ╲        에지 방향의 픽셀들만 참조
      ╲  P  ╲       → 에지는 보존, 노이즈는 평균화
       ╲  ╲  ╲

3단계: 극단적 차이는 무시
     만약 참조 픽셀이 현재 픽셀과 너무 다르면
     → "이건 노이즈가 아니라 진짜 에지"
     → 필터링에서 제외
```

핵심 아이디어는:
- 에지와 **같은 방향**의 픽셀들은 비슷해야 한다 (노이즈면 평균화)
- 에지와 **수직 방향**의 픽셀들은 크게 달라도 정상이다 (진짜 에지)

---

## 17.2 에지 방향 감지

CDEF는 8×8 블록 단위로 에지 방향을 감지한다. 8가지 방향 중에서 가장 강한 에지를 찾는다.

### 8가지 방향

```
방향 0: 수직 (0°)        방향 1: 22.5°
    │                        ╲
    │                         ╲
    │                          ╲

방향 2: 45°             방향 3: 67.5°
     ╲                        ─╲
      ╲                         ─
       ╲

방향 4: 수평 (90°)       방향 5: 112.5°
─────                       ─╱
                             ╱

방향 6: 135°            방향 7: 157.5°
     ╱                       ╱─
    ╱                       ╱
   ╱
```

각 방향은 22.5° 간격이다. 총 8방향 × 22.5° = 180°를 커버한다. 180° 이상은 대칭이므로 필요 없다.

### 분산(Variance) 계산

각 방향에서 **분산**을 계산해서 에지 강도를 측정한다:

```cpp
// 8×8 블록에서 에지 방향 감지
int find_edge_direction(const uint8_t* block, int stride) {
    int cost[8] = {0};

    // 각 방향별로 비용(분산) 계산
    for (int dir = 0; dir < 8; dir++) {
        // 해당 방향으로 라인을 긋고 픽셀 수집
        for (int line = 0; line < 8; line++) {
            int line_sum = 0;
            int line_count = 0;

            // 방향 dir의 line번째 라인 픽셀들 수집
            for (int i = 0; i < 8; i++) {
                int x, y;
                get_direction_position(dir, line, i, &x, &y);
                if (x >= 0 && x < 8 && y >= 0 && y < 8) {
                    line_sum += block[y * stride + x];
                    line_count++;
                }
            }

            // 라인 평균 계산
            int line_avg = line_sum / line_count;

            // 라인 평균과 블록 평균의 차이 누적
            cost[dir] += (line_avg - block_avg) * (line_avg - block_avg);
        }
    }

    // 분산이 가장 큰 방향 = 에지 방향
    int best_dir = 0;
    int max_cost = cost[0];
    for (int dir = 1; dir < 8; dir++) {
        if (cost[dir] > max_cost) {
            max_cost = cost[dir];
            best_dir = dir;
        }
    }

    return best_dir;
}
```

직관적으로 이해하면:

```
세로 에지가 있는 블록:          분산 계산 결과:

░░░░████                        방향 0 (수직): 분산 ↑↑↑ 최대!
░░░░████                        방향 2 (45°):  분산 ↑
░░░░████                        방향 4 (수평): 분산 ↓↓↓ 최소
░░░░████
                                → 에지 방향 = 0 (수직)
```

수직 방향(방향 0)으로 라인을 그으면 한쪽은 밝고 한쪽은 어두워서 분산이 크다. 수평 방향(방향 4)으로 라인을 그으면 밝은 픽셀과 어두운 픽셀이 섞여서 분산이 작다.

### 분산 공식

수학적으로 정리하면:

```
cost[dir] = Σᵢ (line_avg[dir][i] - block_avg)²

- line_avg[dir][i]: 방향 dir의 i번째 라인 평균
- block_avg: 블록 전체 평균
- 분산이 크다 = 해당 방향으로 명암 변화가 크다 = 에지 존재
```

### 최적화: 부분합 테이블

실제 구현에서는 매번 분산을 계산하지 않고 **부분합(partial sum) 테이블**을 미리 만들어 둔다:

```cpp
// 최적화된 방향 감지
int find_edge_direction_optimized(const uint8_t* block, int stride) {
    // 1단계: 부분합 테이블 생성 (O(64))
    int partial[8][15];  // 각 방향, 각 라인의 합
    compute_partial_sums(block, stride, partial);

    // 2단계: 각 방향 분산 계산 (테이블 참조만)
    int cost[8];
    for (int dir = 0; dir < 8; dir++) {
        cost[dir] = compute_cost_from_partial(partial[dir]);
    }

    // 3단계: 최대 분산 방향 선택
    return argmax(cost, 8);
}
```

이렇게 하면 8×8 = 64픽셀을 한 번만 순회해도 모든 방향의 분산을 계산할 수 있다.

---

## 17.3 방향성 비선형 필터

에지 방향을 찾았으면 이제 실제 필터링이다. CDEF 필터는 두 가지 특징이 있다:
1. **방향성**: 에지 방향에 따라 필터 모양이 달라진다
2. **비선형**: 차이가 너무 크면 무시한다 (constrain 함수)

### 필터 커널 구조

5×5 영역에서 **12개 픽셀**만 사용한다:

```
방향 0 (수직)의 필터 커널:

      . s . s .
      . P . P .
      . . C . .     C = 현재 픽셀 (center)
      . P . P .     P = Primary tap (가중치 높음)
      . s . s .     s = Secondary tap (가중치 낮음)
```

방향에 따라 커널이 회전한다:

```
방향 0 (수직):          방향 4 (수평):         방향 2 (45°):
    . s . s .              . . . . .              . . . s s
    . P . P .              s P . P s              . . P . .
    . . C . .              . . C . .              . . C . .
    . P . P .              s P . P s              . . P . .
    . s . s .              . . . . .              s s . . .
```

Primary tap은 에지 **방향**에 있는 픽셀이다. 에지를 따라 평활화한다.
Secondary tap은 에지 **수직 방향**에 있는 픽셀이다. 추가 노이즈 제거용이다.

### constrain 함수: 핵심 비선형성

일반 필터는 모든 참조 픽셀을 똑같이 사용한다. CDEF는 다르다:

```cpp
// constrain 함수 — CDEF의 핵심
int constrain(int diff, int strength, int damping) {
    // diff: 참조 픽셀 - 현재 픽셀
    // strength: 필터 강도 (0~15)
    // damping: 감쇠 파라미터 (3~6)

    int abs_diff = abs(diff);
    int sign_diff = (diff > 0) ? 1 : -1;

    // 핵심 로직: strength보다 크면 점점 무시
    int shift = damping - log2(strength);
    int threshold = max(0, strength - (abs_diff >> shift));

    return sign_diff * min(abs_diff, threshold);
}
```

직관적 설명:

```
diff (참조-현재)     constrain(diff)
─────────────────────────────────────
      작음             그대로 사용 (노이즈로 판단)
      중간             부분적으로 사용
      큼               무시 (진짜 에지로 판단)

예시 (strength=8):
diff = 3   →  constrain = 3   (100% 사용)
diff = 10  →  constrain = 6   (부분 사용)
diff = 20  →  constrain = 0   (완전 무시)
```

이것이 **"Constrained"**의 의미다 — 극단적인 차이는 제한(constrain)해서 무시한다.

### 필터 수식

전체 CDEF 필터 수식:

```
output = curr + round(Σᵢ wᵢ × constrain(ref[i] - curr, str, damp))

- curr: 현재 픽셀 값
- ref[i]: i번째 참조 픽셀 값
- wᵢ: 가중치 (Primary=2, Secondary=1)
- str: strength
- damp: damping
```

구현 코드:

```cpp
int cdef_filter_pixel(int curr, const int* primary_refs, const int* secondary_refs,
                      int primary_str, int secondary_str, int damping) {
    int sum = 0;

    // Primary tap 기여 (가중치 2)
    for (int i = 0; i < 2; i++) {
        int diff = primary_refs[i] - curr;
        sum += 2 * constrain(diff, primary_str, damping);
    }

    // Secondary tap 기여 (가중치 1)
    for (int i = 0; i < 4; i++) {
        int diff = secondary_refs[i] - curr;
        sum += 1 * constrain(diff, secondary_str, damping);
    }

    // 정규화 및 적용
    int delta = (sum + 4) >> 3;  // 총 가중치 합 = 8
    return clip_pixel(curr + delta);
}
```

---

## 17.4 CDEF 파라미터

CDEF는 세 가지 파라미터로 제어된다.

### Primary Strength (0~15)

에지 방향 필터의 강도:

```
Primary Strength = 0:   필터링 없음 (에지 방향)
Primary Strength = 4:   약한 필터링
Primary Strength = 8:   중간 필터링
Primary Strength = 15:  강한 필터링
```

높을수록 에지 방향으로 더 많이 평활화한다. 노이즈가 많은 영역에서는 높게, 디테일이 중요한 영역에서는 낮게 설정한다.

### Secondary Strength (0, 1, 2, 4)

에지 수직 방향 필터의 강도:

```
Secondary Strength = 0:  수직 방향 필터링 없음
Secondary Strength = 1:  매우 약함
Secondary Strength = 2:  약함
Secondary Strength = 4:  중간
```

0, 1, 2, 4만 가능하다 (4가지). Primary보다 훨씬 약하게 설정하는 것이 보통이다. 에지를 가로지르는 방향으로 너무 강하게 필터링하면 에지가 뭉개진다.

### Damping (3~6)

클리핑 감쇠 수준:

```
Damping = 3:  민감함 — 작은 차이도 클리핑
Damping = 6:  둔감함 — 큰 차이만 클리핑
```

damping이 작으면 constrain 함수가 더 공격적으로 차이를 무시한다. 큰 강도(high strength)에서는 damping도 키워서 균형을 맞춘다.

### 비트 깊이별 기본값

```cpp
// 비트 깊이에 따른 damping 기본값
int get_default_damping(int bit_depth) {
    switch (bit_depth) {
        case 8:  return 3;
        case 10: return 4;
        case 12: return 5;
        default: return 3;
    }
}
```

비트 깊이가 높을수록 값의 범위가 넓어지므로 damping을 키운다.

---

## 17.5 프리셋 시스템

CDEF는 전체 프레임에 같은 파라미터를 쓰지 않는다. **영역별로 다른 설정**을 적용한다.

### 프리셋 정의

프레임 헤더에서 최대 **8개 프리셋**을 정의한다:

```cpp
struct CDEFParams {
    int cdef_bits;           // 프리셋 개수 = 1 << cdef_bits (0~3비트)
    int cdef_y_pri_strength[8];    // 루마 Primary strength
    int cdef_y_sec_strength[8];    // 루마 Secondary strength
    int cdef_uv_pri_strength[8];   // 크로마 Primary strength
    int cdef_uv_sec_strength[8];   // 크로마 Secondary strength
    int cdef_damping;              // 전체 damping (3~6)
};
```

예시:

```
cdef_bits = 2 → 4개 프리셋 사용

프리셋 0: pri=4,  sec=1  (약한 필터)
프리셋 1: pri=8,  sec=2  (중간 필터)
프리셋 2: pri=12, sec=4  (강한 필터)
프리셋 3: pri=0,  sec=0  (필터 OFF)
```

### 블록별 프리셋 선택

**64×64 슈퍼블록** 단위로 프리셋 인덱스를 전송한다:

```
프레임:
┌─────────┬─────────┬─────────┬─────────┐
│ 64×64   │ 64×64   │ 64×64   │ 64×64   │
│ idx=1   │ idx=0   │ idx=2   │ idx=1   │
├─────────┼─────────┼─────────┼─────────┤
│ 64×64   │ 64×64   │ 64×64   │ 64×64   │
│ idx=0   │ idx=3   │ idx=1   │ idx=0   │
└─────────┴─────────┴─────────┴─────────┘

idx=0: 약한 필터 (평탄한 영역)
idx=1: 중간 필터 (보통 영역)
idx=2: 강한 필터 (노이즈 많은 영역)
idx=3: 필터 OFF (디테일 중요한 영역)
```

각 슈퍼블록에 `cdef_bits` 비트만 전송하면 된다.

### skip 플래그

프리셋이 "OFF" 상태면 해당 블록은 건너뛴다:

```cpp
// 프리셋 선택
int preset_idx = decode_cdef_index(cdef_bits);

// pri=0, sec=0이면 CDEF 스킵
if (cdef_params.y_pri_strength[preset_idx] == 0 &&
    cdef_params.y_sec_strength[preset_idx] == 0) {
    return;  // 이 슈퍼블록은 CDEF 적용 안 함
}
```

---

## 17.6 apply_cdef() 구현

전체 CDEF 처리 과정을 구현으로 정리한다.

### 프레임 레벨 처리

```cpp
void apply_cdef(Frame* frame, const CDEFParams* params) {
    int sb_cols = (frame->width + 63) / 64;   // 슈퍼블록 열 수
    int sb_rows = (frame->height + 63) / 64;  // 슈퍼블록 행 수

    // 각 64×64 슈퍼블록 처리
    for (int sb_y = 0; sb_y < sb_rows; sb_y++) {
        for (int sb_x = 0; sb_x < sb_cols; sb_x++) {

            // 1) 프리셋 인덱스 가져오기
            int preset_idx = frame->cdef_idx[sb_y][sb_x];

            // 2) skip 체크
            if (params->y_pri_strength[preset_idx] == 0 &&
                params->y_sec_strength[preset_idx] == 0) {
                continue;
            }

            // 3) 슈퍼블록 내 8×8 블록들 처리
            apply_cdef_superblock(frame, params, preset_idx,
                                  sb_x * 64, sb_y * 64);
        }
    }
}
```

### 슈퍼블록 레벨 처리

```cpp
void apply_cdef_superblock(Frame* frame, const CDEFParams* params,
                           int preset_idx, int sb_x, int sb_y) {
    int pri_str_y = params->y_pri_strength[preset_idx];
    int sec_str_y = params->y_sec_strength[preset_idx];
    int pri_str_uv = params->uv_pri_strength[preset_idx];
    int sec_str_uv = params->uv_sec_strength[preset_idx];
    int damping = params->damping;

    // 64×64 내 8×8 블록들 (8×8 = 64개 블록)
    for (int by = 0; by < 8; by++) {
        for (int bx = 0; bx < 8; bx++) {
            int block_x = sb_x + bx * 8;
            int block_y = sb_y + by * 8;

            // 경계 체크
            if (block_x >= frame->width || block_y >= frame->height) {
                continue;
            }

            // 루마 처리
            apply_cdef_block(frame->y_plane, frame->y_stride,
                            block_x, block_y,
                            pri_str_y, sec_str_y, damping);

            // 크로마 처리 (4:2:0이면 4×4 블록)
            if (frame->subsampling_x && frame->subsampling_y) {
                apply_cdef_block(frame->u_plane, frame->uv_stride,
                                block_x / 2, block_y / 2,
                                pri_str_uv, sec_str_uv, damping);
                apply_cdef_block(frame->v_plane, frame->uv_stride,
                                block_x / 2, block_y / 2,
                                pri_str_uv, sec_str_uv, damping);
            }
        }
    }
}
```

### 8×8 블록 레벨 처리

```cpp
void apply_cdef_block(uint8_t* plane, int stride,
                      int block_x, int block_y,
                      int pri_str, int sec_str, int damping) {
    uint8_t* block = plane + block_y * stride + block_x;

    // 1단계: 에지 방향 감지
    int dir = find_edge_direction(block, stride);

    // 2단계: 방향에 따른 탭 위치 결정
    const int (*pri_taps)[2] = cdef_primary_taps[dir];
    const int (*sec_taps)[2] = cdef_secondary_taps[dir];

    // 3단계: 각 픽셀에 필터 적용
    uint8_t output[8][8];

    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            int curr = block[y * stride + x];
            int sum = 0;

            // Primary tap (2개, 가중치 2)
            for (int i = 0; i < 2; i++) {
                int ref_x = x + pri_taps[i][0];
                int ref_y = y + pri_taps[i][1];
                if (ref_x >= 0 && ref_x < 8 && ref_y >= 0 && ref_y < 8) {
                    int ref = block[ref_y * stride + ref_x];
                    sum += 2 * constrain(ref - curr, pri_str, damping);
                }
            }

            // Secondary tap (4개, 가중치 1)
            for (int i = 0; i < 4; i++) {
                int ref_x = x + sec_taps[i][0];
                int ref_y = y + sec_taps[i][1];
                if (ref_x >= 0 && ref_x < 8 && ref_y >= 0 && ref_y < 8) {
                    int ref = block[ref_y * stride + ref_x];
                    sum += 1 * constrain(ref - curr, sec_str, damping);
                }
            }

            // 정규화 및 클리핑
            int delta = (sum + 4) >> 3;
            output[y][x] = clip_pixel(curr + delta);
        }
    }

    // 4단계: 결과 복사
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            block[y * stride + x] = output[y][x];
        }
    }
}
```

---

## 17.7 CDEF vs 디블로킹 비교

두 필터의 역할을 정리한다:

| 항목 | 디블로킹 | CDEF |
|------|----------|------|
| 대상 아티팩트 | 블록 경계 계단 | 링잉, 블록 내부 노이즈 |
| 처리 위치 | 블록 경계 (4~14픽셀) | 블록 전체 (8×8) |
| 방향성 | 수직/수평만 | 8방향 |
| 선형성 | 선형 필터 | 비선형 (constrain) |
| 파라미터 | Level (블록 강도) | Strength, Damping |
| 적응성 | 블록 경계별 결정 | 64×64 프리셋 선택 |

처리 순서:

```
복원된 프레임
    │
    ▼
┌───────────────┐
│ 디블로킹 필터  │ ← 먼저: 블록 경계 정리
└───────────────┘
    │
    ▼
┌───────────────┐
│    CDEF       │ ← 다음: 링잉 제거
└───────────────┘
    │
    ▼
┌───────────────┐
│ Loop Restore  │ ← 마지막: 전체 보정 (Ch 18)
└───────────────┘
    │
    ▼
참조 버퍼 저장
```

---

## 17.8 SIMD 최적화

CDEF는 계산이 많아서 SIMD 최적화가 중요하다.

### 에지 방향 감지

8방향 분산 계산을 병렬화:

```cpp
// AVX2로 8방향 동시 계산
__m256i cost = _mm256_setzero_si256();

for (int y = 0; y < 8; y++) {
    // 8픽셀 로드
    __m256i row = _mm256_cvtepu8_epi32(_mm_loadl_epi64(block + y * stride));

    // 각 방향별 누적
    // ... (방향별 인덱스로 셔플 및 누적)
}

// 최대 분산 방향 찾기
int best_dir = horizontal_max_index(cost);
```

### constrain 함수

SIMD로 여러 픽셀의 constrain을 동시 계산:

```cpp
// 8픽셀 동시 constrain
__m128i cdef_constrain_sse(const uint8_t* ref, const uint8_t* curr,
                           int strength, int damping) {
    __m128i ref_vec = _mm_loadl_epi64(ref);
    __m128i curr_vec = _mm_loadl_epi64(curr);

    // diff = ref - curr
    __m128i diff = _mm_sub_epi16(ref_vec, curr_vec);
    __m128i abs_diff = _mm_abs_epi16(diff);
    __m128i sign = _mm_sign_epi16(_mm_set1_epi16(1), diff);

    // threshold 계산
    __m128i shift = _mm_set1_epi16(damping - log2(strength));
    __m128i threshold = _mm_subs_epu16(
        _mm_set1_epi16(strength),
        _mm_srl_epi16(abs_diff, shift)
    );

    // min(abs_diff, threshold) × sign
    __m128i result = _mm_mullo_epi16(
        sign,
        _mm_min_epi16(abs_diff, threshold)
    );

    return result;
}
```

---

## 정리

이 장에서 배운 내용:

- **CDEF 목적**: 디블로킹이 처리 못하는 **링잉 아티팩트**와 블록 내부 노이즈 제거
- **에지 방향 감지**: 8×8 블록에서 8방향 분산 계산, 최대 분산 방향 = 에지 방향
- **방향성 필터**: Primary tap(에지 방향 2픽셀) + Secondary tap(수직 방향 4픽셀)
- **constrain 함수**: 차이가 strength보다 크면 점점 무시 — "Constrained"의 의미
- **파라미터**: Primary strength(0~15), Secondary strength(0,1,2,4), Damping(3~6)
- **프리셋 시스템**: 프레임당 최대 8개 프리셋, 64×64 단위로 인덱스 선택
- **처리 순서**: 디블로킹 → CDEF → Loop Restoration

CDEF의 핵심 통찰은 **"에지를 따라 필터링하면 에지는 보존되고 노이즈만 줄어든다"**는 것이다.

---

## 다음 장 예고

Ch 18에서는 **Loop Restoration**을 다룬다. 디블로킹과 CDEF가 국소적 문제를 해결했다면, Loop Restoration은 넓은 영역(256×256까지)에 걸친 전체적인 화질 저하를 보정한다. Wiener 필터와 Self-Guided Restoration(SGRPROJ) 두 가지 방식을 살펴본다.

---

## 관련 항목

- [Ch 16: 디블로킹 필터](/blog/media/av1/part5-filters/chapter16-deblocking) — CDEF 전 단계
- [Ch 18: Loop Restoration](/blog/media/av1/part5-filters/chapter18-loop-restoration) — CDEF 후 단계
- [Ch 9: 변환과 양자화](/blog/media/av1/part3-blocks/chapter09-transform-quant) — 링잉 아티팩트의 원인
