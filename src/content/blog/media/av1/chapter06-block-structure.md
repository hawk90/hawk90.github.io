---
title: "Ch 6: 블록 구조"
date: 2025-10-01T06:00:00
description: "AV1의 블록 계층 — Superblock, Coding Block, Transform Block의 관계와 디코딩 순서."
tags: [AV1, Video, Codec, Superblock, Coding Block, Transform Block]
series: "AV1"
seriesOrder: 6
draft: false
---

## 6.1 블록 계층 구조

AV1은 세 단계의 블록 계층을 가진다:

```
Superblock (SB)
    └── Coding Block (CB)
            └── Transform Block (TB)
```

| 블록 타입 | 역할 | 크기 범위 |
|----------|------|----------|
| Superblock | 파티셔닝의 루트 | 64×64 또는 128×128 |
| Coding Block | 예측의 단위 | 4×4 ~ 128×128 (24종) |
| Transform Block | 변환의 단위 | 4×4 ~ 64×64 (19종) |

각 레벨은 서로 다른 목적을 가진다. SB는 최상위 분할 단위, CB는 예측 모드와 참조 프레임을 결정하는 단위, TB는 실제 변환과 양자화가 적용되는 단위다.

## 6.2 Superblock 그리드

(스펙 Section 5.11.2)

프레임은 슈퍼블록 그리드로 덮인다. 각 슈퍼블록은 독립적으로 파티셔닝된다.

### 래스터 스캔 순서

슈퍼블록은 **좌→우, 상→하** 순서(래스터 스캔)로 처리된다:

```
+-----+-----+-----+-----+
|  0  |  1  |  2  |  3  |
+-----+-----+-----+-----+
|  4  |  5  |  6  |  7  |
+-----+-----+-----+-----+
|  8  |  9  | 10  | 11  |
+-----+-----+-----+-----+
```

```cpp
// 프레임 디코딩 메인 루프
void decode_frame() {
    for (int sbRow = 0; sbRow < sbRows; sbRow++) {
        for (int sbCol = 0; sbCol < sbCols; sbCol++) {
            int row = sbRow * sbSize;
            int col = sbCol * sbSize;
            parse_partition(row, col, SB_SIZE);
        }
    }
}
```

### 불완전 슈퍼블록

프레임 가장자리에서 슈퍼블록이 프레임 경계를 넘을 수 있다. 이 경우 해당 영역은 **강제로 더 작은 블록으로 분할**된다.

예: 1920×1080 프레임에서 64×64 슈퍼블록 사용 시
- 마지막 행 슈퍼블록: 64×(1080 mod 64) = 64×56 영역만 유효
- 아래쪽 8픽셀은 슈퍼블록 밖

## 6.3 Coding Block (CB)

(스펙 Section 5.11.5~5.11.7)

파티셔닝의 **리프 노드**가 Coding Block이다. CB에서 예측 모드, 참조 프레임, Motion Vector 등이 결정된다.

### 24가지 블록 크기

**정사각형 (6종)**:
- 4×4, 8×8, 16×16, 32×32, 64×64, 128×128

**1:2 직사각형 (12종)**:
- 4×8, 8×4, 8×16, 16×8, 16×32, 32×16, 32×64, 64×32, 64×128, 128×64

**1:4 직사각형 (6종)**:
- 4×16, 16×4, 8×32, 32×8, 16×64, 64×16

### CB에서 읽는 정보

각 Coding Block에서 다음 정보를 읽거나 결정한다:

| 정보 | 설명 |
|------|------|
| skip | 잔차가 모두 0인가 |
| skip_mode | Skip Mode 사용 여부 |
| seg_id | 세그먼트 ID (0~7) |
| is_inter | Intra vs Inter 예측 |
| y_mode | 루마 Intra 예측 모드 |
| uv_mode | 크로마 Intra 예측 모드 |
| ref_frame[2] | 참조 프레임 (Inter) |
| motion_vector | Motion Vector (Inter) |
| tx_size | 변환 블록 크기 |
| delta_q | 블록 레벨 양자화 오프셋 |
| delta_lf | 블록 레벨 루프 필터 오프셋 |

### 블록 디코딩 흐름

```
decode_block(row, col, bsize) {
    1. read_segment_id()
       → 세그먼트 맵에서 seg_id 결정

    2. read_skip_mode() / read_skip()
       → 잔차 스킵 여부 결정

    3. read_delta_q() / read_delta_lf()
       → 블록 레벨 양자화/필터 오프셋 (활성화된 경우)

    4. is_inter 결정
       → Key Frame이면 무조건 Intra
       → Inter Frame이면 비트스트림에서 읽거나 세그먼트 설정 참조

    5. 예측 모드 정보 읽기
       Intra: intra_frame_mode_info()
       Inter: inter_frame_mode_info()

    6. read_cdef()
       → 64×64 블록 단위로 CDEF 프리셋 인덱스

    7. read_loop_restoration_unit()
       → Restoration Unit 단위로 복원 타입

    8. compute_prediction()
       → 예측 픽셀 생성

    9. residual()
       → 잔차 읽기 + 역변환 + 예측에 더하기
}
```

### 헬퍼 함수들

(스펙 Section 5.11)

```cpp
// 블록이 프레임 내에 있는지 확인
bool is_inside(int row, int col) {
    return row >= 0 && row < MiRows && col >= 0 && col < MiCols;
}

// 세그먼트 맵에서 seg_id 조회
int get_segment_id() {
    if (!segmentation_enabled)
        return 0;
    return SegmentIds[row][col];
}

// 특정 세그먼트 기능 활성화 여부
bool segmentation_feature_active(int seg_id, int feature) {
    return segmentation_enabled &&
           FeatureEnabled[seg_id][feature];
}
```

## 6.4 Transform Block (TB)

(스펙 Section 5.11.36)

Transform Block은 **실제 변환이 적용되는 단위**다. CB 내부에서 TB로 추가 분할될 수 있다.

### 19가지 TB 크기

**정사각형 (5종)**:
- 4×4, 8×8, 16×16, 32×32, 64×64

**직사각형 (14종)**:
- 4×8, 8×4, 8×16, 16×8, 4×16, 16×4
- 8×32, 32×8, 16×32, 32×16, 16×64, 64×16, 32×64, 64×32

CB와 TB 크기는 다를 수 있다:
- CB가 32×32이고 TB가 16×16이면 → 4개의 TB로 분할
- CB가 16×32이고 TB가 8×16이면 → 4개의 TB로 분할

### CB와 TB의 관계

```
CB 32×32, TB 32×32:
+---------------+
|               |
|      TB       |
|               |
+---------------+
(1개 TB)

CB 32×32, TB 16×16:
+-------+-------+
|  TB0  |  TB1  |
+-------+-------+
|  TB2  |  TB3  |
+-------+-------+
(4개 TB)

CB 32×32, TB 8×8:
+---+---+---+---+
|   |   |   |   |
+---+---+---+---+
|   |   |   |   |
+---+---+---+---+
|   |   |   |   |
+---+---+---+---+
|   |   |   |   |
+---+---+---+---+
(16개 TB)
```

### TX Mode

Frame Header의 `TxMode`가 TB 크기 결정 방식을 지정한다:

| TX Mode | 동작 |
|---------|------|
| TX_MODE_ONLY_4X4 | 무손실 모드. 항상 4×4 변환. |
| TX_MODE_LARGEST | CB 크기에서 허용되는 최대 TB 크기 사용. |
| TX_MODE_SELECT | 블록별로 TB 크기 시그널링. |

### Var TX Size

(스펙 Section 5.11.17)

`TX_MODE_SELECT`일 때, CB 내부에서 **재귀적으로 TB를 분할**할 수 있다.

```cpp
void var_tx_size(int row, int col, TxSize txSize, int depth) {
    if (row >= MiRows || col >= MiCols)
        return;

    // TX 분할 여부 읽기
    int txfm_split = read_txfm_split(txSize, depth);

    if (txfm_split) {
        // 4개 자식으로 분할
        TxSize subTxSize = sub_tx_size_map[txSize];
        int halfW = tx_width[txSize] / 2;
        int halfH = tx_height[txSize] / 2;

        var_tx_size(row, col, subTxSize, depth + 1);
        var_tx_size(row, col + halfW, subTxSize, depth + 1);
        var_tx_size(row + halfH, col, subTxSize, depth + 1);
        var_tx_size(row + halfH, col + halfW, subTxSize, depth + 1);
    } else {
        // 현재 크기로 확정 → 계수 파싱
        read_coefficients(row, col, txSize);
    }
}
```

TX 분할 깊이 예시:
- depth=0: CB와 같은 크기 (예: 32×32)
- depth=1: 4등분 (예: 16×16 × 4개)
- depth=2: 한 번 더 4등분 (예: 8×8 × 16개)

### Transform Tree

TB 분할은 **Transform Tree**를 형성한다:

```
        32×32 (split)
       /    \    \    \
    16×16  16×16  16×16  16×16
    (none) (split)(none) (none)
           /  |  \  \
         8×8 8×8 8×8 8×8
```

각 리프에서 계수를 파싱하고 역변환을 수행한다.

## 6.5 크로마 블록 처리

4:2:0 서브샘플링에서 크로마 해상도는 루마의 절반이다.

### 루마 → 크로마 블록 매핑

| 루마 CB | 크로마 CB (4:2:0) |
|---------|------------------|
| 4×4 | 2×2 |
| 8×8 | 4×4 |
| 16×16 | 8×8 |
| 32×32 | 16×16 |
| 4×8 | 2×4 |
| 8×4 | 4×2 |

### 최소 크로마 블록 제약

2×2 크로마 블록은 변환 효율이 낮다. 스펙은 **작은 루마 블록들을 크로마에서 묶어서 처리**하도록 한다.

```cpp
BlockSize get_plane_residual_size(BlockSize bsize, int plane) {
    if (plane == 0)  // 루마
        return bsize;

    // 크로마 (4:2:0)
    int subX = 1, subY = 1;  // 수평/수직 서브샘플링
    int w = block_width[bsize] >> subX;
    int h = block_height[bsize] >> subY;

    // 최소 4×4 보장
    if (w < 4 || h < 4) {
        // 여러 루마 블록을 합쳐서 크로마 처리
        return get_adjusted_chroma_size(...);
    }

    return size_from_dimensions(w, h);
}
```

4개의 4×4 루마 블록이 있으면, 해당 8×8 루마 영역에 대응하는 4×4 크로마 블록 하나로 처리된다.

## 6.6 블록 간 의존성

### Intra 예측 의존성

Intra 예측은 **인접 블록의 복원된 픽셀**을 참조한다:
- 위쪽(above) 블록의 아래쪽 행
- 왼쪽(left) 블록의 오른쪽 열

따라서 래스터 스캔 순서(좌→우, 상→하)로 처리해야 위쪽과 왼쪽 참조가 항상 사용 가능하다.

```
참조 가능 (이미 복원됨)
    ↓
+---+---+---+
|   | ↓ |   |
+---+---+---+
| → | X |   |  ← X를 처리할 때
+---+---+---+     위(↓)와 왼쪽(→)은 참조 가능
|   |   |   |
+---+---+---+
```

### 엔트로피 컨텍스트 의존성

산술 디코딩의 CDF는 이전 블록의 정보를 컨텍스트로 사용한다:
- 위쪽 블록의 파티션 타입
- 왼쪽 블록의 예측 모드
- 인접 블록의 변환 크기

```cpp
int get_partition_context(int row, int col, BlockSize bsize) {
    int above = PartitionContexts[row - 1][col];  // 위쪽
    int left = PartitionContexts[row][col - 1];   // 왼쪽
    return (above << 2) | left;  // 컨텍스트 인덱스
}
```

## 6.7 Z-order 처리

슈퍼블록 내부에서 블록들은 **Z-order**(재귀적 depth-first)로 처리된다.

```
64×64 슈퍼블록이 SPLIT으로 4개의 32×32가 된 경우:

처리 순서:
+---+---+
| 0 | 1 |
+---+---+
| 2 | 3 |
+---+---+

만약 0번(32×32)이 다시 SPLIT되면:
+---+---+---+---+
|0.0|0.1| 1 | 1 |
+---+---+   |   |
|0.2|0.3|   |   |
+---+---+---+---+
| 2 | 2 | 3 | 3 |
|   |   |   |   |
|   |   |   |   |
+---+---+---+---+

처리 순서: 0.0 → 0.1 → 0.2 → 0.3 → 1 → 2 → 3
```

Z-order는 depth-first이므로 스택 기반 재귀로 자연스럽게 구현된다.

## 6.8 전체 프레임 디코딩 흐름

```cpp
void decode_frame() {
    // 1. Frame Header 파싱
    parse_frame_header();

    // 2. 타일 루프
    for (int tileRow = 0; tileRow < TileRows; tileRow++) {
        for (int tileCol = 0; tileCol < TileCols; tileCol++) {
            // 타일 내 슈퍼블록 루프
            int startRow = TileRowStart[tileRow];
            int endRow = TileRowStart[tileRow + 1];
            int startCol = TileColStart[tileCol];
            int endCol = TileColStart[tileCol + 1];

            for (int row = startRow; row < endRow; row += sbSize) {
                for (int col = startCol; col < endCol; col += sbSize) {
                    // 3. 슈퍼블록 파티셔닝 + 블록 디코딩
                    parse_partition(row, col, SB_SIZE);
                }
            }
        }
    }

    // 4. 루프 필터 적용
    apply_loop_filter();

    // 5. CDEF 적용
    apply_cdef();

    // 6. Loop Restoration 적용
    apply_loop_restoration();

    // 7. Superres 업스케일 (활성화된 경우)
    apply_superres();

    // 8. 참조 버퍼 갱신
    update_reference_frames();
}
```

## 정리

- AV1은 **3단계 블록 계층**을 가진다: SB → CB → TB.
- **Superblock**은 파티셔닝의 루트다 (64×64 또는 128×128).
- **Coding Block**은 예측의 단위다. 24가지 크기, 예측 모드/참조/MV 결정.
- **Transform Block**은 변환의 단위다. 19가지 크기, CB 내부에서 추가 분할 가능.
- 슈퍼블록은 **래스터 스캔** 순서로 처리된다.
- 슈퍼블록 내부 블록은 **Z-order**로 처리된다.
- **Intra 예측**은 인접 블록 복원 픽셀에 의존한다.
- **엔트로피 컨텍스트**는 인접 블록 정보를 참조한다.
- 크로마는 4:2:0에서 **최소 크기 제약**이 있다.

## 다음 장 예고

Ch 7에서는 엔트로피 디코딩을 다룬다. 비트를 심볼로 변환하는 Multi-Symbol Arithmetic Coder(MSAC)를 살펴본다.

## 관련 항목

- [Ch 4: 블록 파티셔닝](/blog/media/av1/chapter04-partitioning)
- [Ch 5: Frame Header](/blog/media/av1/chapter05-prediction-overview)
- [Ch 7: 엔트로피 디코딩](/blog/media/av1/chapter07-entropy-coding)
