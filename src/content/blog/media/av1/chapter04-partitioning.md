---
title: "Ch 4: 블록 파티셔닝"
date: 2026-05-16T05:00:00
description: "AV1의 10가지 파티션 모드 — SPLIT, HORZ, VERT, T-shape, 4-way와 재귀적 분할 구조."
tags: [AV1, Video, Codec, Partitioning, Block]
series: "AV1"
seriesOrder: 4
draft: true
---

## 4.1 왜 블록으로 나누는가

프레임 전체를 한 번에 처리하면 너무 복잡하다. 작은 블록으로 나눠서 각 블록에 최적의 전략을 적용하는 것이 효율적이다.

영상의 영역별 특성은 다르다:
- **평탄한 영역**(하늘, 벽): 픽셀 값이 거의 일정하다. 큰 블록 하나로 충분하다.
- **복잡한 영역**(나뭇잎, 텍스처): 변화가 심하다. 작은 블록 여러 개로 세밀하게 다뤄야 한다.
- **경계 영역**(건물 윤곽, 사물 테두리): 수평 또는 수직 에지가 있다. 직사각형 블록이 경계에 잘 맞는다.

H.264는 16×16 매크로블록을 고정 크기로 사용했다. 하늘 같은 넓은 평탄 영역에서도 16×16 단위로 처리해야 해서 비효율적이었다.

AV1은 128×128부터 4×4까지 **재귀적으로 분할**한다. 콘텐츠에 맞게 블록 크기가 적응한다.

```
평탄한 영역          복잡한 영역
+---------------+    +---+---+---+---+
|               |    |   |   |   |   |
|               |    +---+---+---+---+
|    64×64      |    |   |   |   |   |
|               |    +---+---+---+---+
|               |    |   |   |   |   |
+---------------+    +---+---+---+---+
  블록 1개로 충분      16개 이상 블록 필요
```

## 4.2 슈퍼블록 그리드

프레임은 먼저 **슈퍼블록(Superblock)** 그리드로 나뉜다. Sequence Header의 `use_128x128_superblock` 플래그에 따라 슈퍼블록 크기가 결정된다:

| use_128x128_superblock | 슈퍼블록 크기 |
|------------------------|--------------|
| 0                      | 64×64        |
| 1                      | 128×128      |

슈퍼블록 그리드 계산:

```
sbSize = use_128x128_superblock ? 128 : 64
sb_cols = ceil(FrameWidth / sbSize)
sb_rows = ceil(FrameHeight / sbSize)
```

예를 들어 1920×1080 프레임에서 64×64 슈퍼블록을 사용하면:
- sb_cols = ceil(1920 / 64) = 30
- sb_rows = ceil(1080 / 64) = 17
- 총 510개 슈퍼블록

프레임 가장자리에서는 **불완전 슈퍼블록**이 생길 수 있다. 예를 들어 1920은 64의 배수이지만 1080은 아니다. 마지막 행의 슈퍼블록들은 아래쪽이 잘린다. 디코더는 이를 적절히 처리해야 한다.

## 4.3 24가지 블록 크기

AV1은 정사각형과 직사각형을 포함해 **24가지 블록 크기**를 지원한다.

### 정사각형 블록 (6종)

| 인덱스 | 이름 | 크기 |
|--------|------|------|
| 0 | BLOCK_4X4 | 4×4 |
| 3 | BLOCK_8X8 | 8×8 |
| 6 | BLOCK_16X16 | 16×16 |
| 9 | BLOCK_32X32 | 32×32 |
| 12 | BLOCK_64X64 | 64×64 |
| 15 | BLOCK_128X128 | 128×128 |

### 직사각형 블록 (18종)

직사각형은 1:2 비율과 1:4 비율이 있다.

**1:2 비율 (12종)**:

| 인덱스 | 이름 | 크기 |
|--------|------|------|
| 1 | BLOCK_4X8 | 4×8 |
| 2 | BLOCK_8X4 | 8×4 |
| 4 | BLOCK_8X16 | 8×16 |
| 5 | BLOCK_16X8 | 16×8 |
| 7 | BLOCK_16X32 | 16×32 |
| 8 | BLOCK_32X16 | 32×16 |
| 10 | BLOCK_32X64 | 32×64 |
| 11 | BLOCK_64X32 | 64×32 |
| 13 | BLOCK_64X128 | 64×128 |
| 14 | BLOCK_128X64 | 128×64 |

**1:4 비율 (6종)**:

| 인덱스 | 이름 | 크기 |
|--------|------|------|
| 16 | BLOCK_4X16 | 4×16 |
| 17 | BLOCK_16X4 | 16×4 |
| 18 | BLOCK_8X32 | 8×32 |
| 19 | BLOCK_32X8 | 32×8 |
| 20 | BLOCK_16X64 | 16×64 |
| 21 | BLOCK_64X16 | 64×16 |

1:4 비율 블록은 HORZ_4와 VERT_4 파티션에서 생성된다.

## 4.4 10가지 파티션 타입

(스펙 Section 6.4.4)

각 슈퍼블록은 재귀적으로 분할된다. 분할 방법은 10가지 파티션 타입 중 하나로 결정된다.

![10가지 파티션 타입](/images/blog/av1/diagrams/ch04-partition-types.svg)

### PARTITION_NONE (0)

분할하지 않는다. 현재 블록 크기 그대로 사용한다.

```
+-------+
|       |
|   N   |
|       |
+-------+
```

평탄한 영역에서 주로 선택된다. 블록 크기가 클수록 오버헤드가 적다.

### PARTITION_HORZ (1)

수평으로 2등분한다. 위아래 두 블록이 생긴다.

```
+-------+
|   A   |
+-------+
|   B   |
+-------+
```

32×32 블록이 PARTITION_HORZ로 분할되면 두 개의 32×16 블록이 된다.

### PARTITION_VERT (2)

수직으로 2등분한다. 좌우 두 블록이 생긴다.

```
+---+---+
|   |   |
| A | B |
|   |   |
+---+---+
```

32×32 블록이 PARTITION_VERT로 분할되면 두 개의 16×32 블록이 된다.

### PARTITION_SPLIT (3)

4등분한다. 각 자식 블록은 다시 파티션 결정을 한다(재귀적 분할).

```
+---+---+
| A | B |
+---+---+
| C | D |
+---+---+
```

32×32 블록이 PARTITION_SPLIT으로 분할되면 네 개의 16×16 블록이 되고, 각 16×16 블록에서 다시 파티션 타입을 결정할 수 있다.

**PARTITION_SPLIT만 재귀적이다.** 나머지 9가지 파티션은 리프 노드를 생성한다.

### PARTITION_HORZ_A (4)

T자 형태(위쪽이 둘로 나뉨). 위에 두 개, 아래에 하나.

```
+---+---+
| A | B |
+---+---+
|   C   |
+-------+
```

32×32 블록이 PARTITION_HORZ_A로 분할되면:
- A: 16×16
- B: 16×16
- C: 32×16

### PARTITION_HORZ_B (5)

역T자 형태(아래쪽이 둘로 나뉨). 위에 하나, 아래에 두 개.

```
+-------+
|   A   |
+---+---+
| B | C |
+---+---+
```

32×32 블록이 PARTITION_HORZ_B로 분할되면:
- A: 32×16
- B: 16×16
- C: 16×16

### PARTITION_VERT_A (6)

왼쪽이 둘로 나뉜 T자. 왼쪽에 두 개, 오른쪽에 하나.

```
+---+---+
| A |   |
+---+ C |
| B |   |
+---+---+
```

32×32 블록이 PARTITION_VERT_A로 분할되면:
- A: 16×16
- B: 16×16
- C: 16×32

### PARTITION_VERT_B (7)

오른쪽이 둘로 나뉜 T자. 왼쪽에 하나, 오른쪽에 두 개.

```
+---+---+
|   | B |
| A +---+
|   | C |
+---+---+
```

32×32 블록이 PARTITION_VERT_B로 분할되면:
- A: 16×32
- B: 16×16
- C: 16×16

### PARTITION_HORZ_4 (8)

수평으로 4등분한다. 1:4 비율의 가로 스트립 4개가 생긴다.

```
+-------+
|   A   |
+-------+
|   B   |
+-------+
|   C   |
+-------+
|   D   |
+-------+
```

32×32 블록이 PARTITION_HORZ_4로 분할되면 네 개의 32×8 블록이 된다.

### PARTITION_VERT_4 (9)

수직으로 4등분한다. 1:4 비율의 세로 스트립 4개가 생긴다.

```
+-+-+-+-+
| | | | |
|A|B|C|D|
| | | | |
+-+-+-+-+
```

32×32 블록이 PARTITION_VERT_4로 분할되면 네 개의 8×32 블록이 된다.

## 4.5 파티션 타입별 제약

모든 파티션 타입이 모든 블록 크기에서 허용되는 것은 아니다.

### 블록 크기별 허용 파티션

| 블록 크기 | 허용되는 파티션 |
|-----------|----------------|
| 128×128 | NONE, HORZ, VERT, SPLIT, HORZ_A, HORZ_B, VERT_A, VERT_B, HORZ_4, VERT_4 |
| 64×64 | 모두 허용 |
| 32×32 | 모두 허용 |
| 16×16 | 모두 허용 |
| 8×8 | NONE, HORZ, VERT, SPLIT |
| 4×4 | NONE만 (더 이상 분할 불가) |

**최소 블록 크기는 4×4이다.** 8×8 블록에서 T-shape나 4-way 파티션을 사용하면 결과 블록이 4×4보다 작아질 수 있어서 허용되지 않는다.

### 프레임 가장자리 제약

프레임 경계에서는 파티션 선택이 제한된다. 블록이 프레임 밖으로 나가면 안 되기 때문이다.

```cpp
// 스펙 Section 6.4.4 partition 함수의 일부 로직
if (AvailR && AvailD) {
    // 오른쪽과 아래 모두 유효 → 모든 파티션 허용
} else if (AvailD) {
    // 아래만 유효 → SPLIT 또는 HORZ만 허용
} else if (AvailR) {
    // 오른쪽만 유효 → SPLIT 또는 VERT만 허용
} else {
    // 둘 다 유효하지 않음 → 현재 블록이 프레임 내
    // NONE 선택 (더 이상 분할 불가)
}
```

## 4.6 파티션 트리: 재귀적 구조

(스펙 Section 5.11.4)

파티션은 트리 구조를 형성한다. 루트는 슈퍼블록이고, PARTITION_SPLIT이 적용되면 네 자식으로 분기한다.

### Z-order 순회

자식 블록은 **Z-order**(래스터 스캔 순서)로 처리된다:

```
+---+---+
| 0 | 1 |
+---+---+
| 2 | 3 |
+---+---+
```

왼쪽 위(0) → 오른쪽 위(1) → 왼쪽 아래(2) → 오른쪽 아래(3) 순서다.

### 재귀 파싱 예시

64×64 슈퍼블록에서 다음 분할이 일어났다고 하자:

1. 루트 64×64: PARTITION_SPLIT → 4개의 32×32
2. 첫 번째 32×32 (왼쪽 위): PARTITION_NONE → 리프
3. 두 번째 32×32 (오른쪽 위): PARTITION_HORZ → 두 개의 32×16 리프
4. 세 번째 32×32 (왼쪽 아래): PARTITION_SPLIT → 4개의 16×16
5. 네 번째 32×32 (오른쪽 아래): PARTITION_NONE → 리프

트리 구조:

```
               64×64 (SPLIT)
              /    |    \    \
         32×32  32×32  32×32  32×32
         NONE   HORZ   SPLIT  NONE
                / \    /|\\
             32×16 32×16  16×16 (×4)
```

### parse_partition 재귀 구현

```cpp
void parse_partition(int row, int col, BlockSize bsize) {
    // 프레임 경계 확인
    if (!is_inside(row, col)) return;

    // 파티션 타입 읽기 (산술 디코딩)
    PartitionType partition = read_partition_type(row, col, bsize);

    // 자식 블록 크기 계산
    BlockSize subSize = get_subsize(bsize, partition);
    int halfW = block_width[bsize] / 2;
    int halfH = block_height[bsize] / 2;
    int quarterH = block_height[bsize] / 4;
    int quarterW = block_width[bsize] / 4;

    switch (partition) {
        case PARTITION_NONE:
            decode_block(row, col, bsize);
            break;

        case PARTITION_HORZ:
            decode_block(row, col, subSize);
            decode_block(row + halfH, col, subSize);
            break;

        case PARTITION_VERT:
            decode_block(row, col, subSize);
            decode_block(row, col + halfW, subSize);
            break;

        case PARTITION_SPLIT:
            // 재귀: 4개 자식 각각에 대해 파티션 결정
            parse_partition(row, col, subSize);
            parse_partition(row, col + halfW, subSize);
            parse_partition(row + halfH, col, subSize);
            parse_partition(row + halfH, col + halfW, subSize);
            break;

        case PARTITION_HORZ_A:
            decode_block(row, col, subSize);           // 왼쪽 위 (1/4)
            decode_block(row, col + halfW, subSize);   // 오른쪽 위 (1/4)
            decode_block(row + halfH, col, subSize);   // 아래 (1/2)
            break;

        case PARTITION_HORZ_B:
            decode_block(row, col, subSize);           // 위 (1/2)
            decode_block(row + halfH, col, subSize);   // 왼쪽 아래 (1/4)
            decode_block(row + halfH, col + halfW, subSize); // 오른쪽 아래 (1/4)
            break;

        case PARTITION_VERT_A:
            decode_block(row, col, subSize);           // 왼쪽 위 (1/4)
            decode_block(row + halfH, col, subSize);   // 왼쪽 아래 (1/4)
            decode_block(row, col + halfW, subSize);   // 오른쪽 (1/2)
            break;

        case PARTITION_VERT_B:
            decode_block(row, col, subSize);           // 왼쪽 (1/2)
            decode_block(row, col + halfW, subSize);   // 오른쪽 위 (1/4)
            decode_block(row + halfH, col + halfW, subSize); // 오른쪽 아래 (1/4)
            break;

        case PARTITION_HORZ_4:
            for (int i = 0; i < 4; i++) {
                decode_block(row + i * quarterH, col, subSize);
            }
            break;

        case PARTITION_VERT_4:
            for (int i = 0; i < 4; i++) {
                decode_block(row, col + i * quarterW, subSize);
            }
            break;
    }
}
```

### 최대 재귀 깊이

64×64 슈퍼블록 기준:
- 64×64 → 32×32 → 16×16 → 8×8 → 4×4
- 최대 4단계 재귀 (log2(64) - log2(4) = 4)

128×128 슈퍼블록 기준:
- 128×128 → 64×64 → 32×32 → 16×16 → 8×8 → 4×4
- 최대 5단계 재귀 (log2(128) - log2(4) = 5)

## 4.7 크로마 블록 크기 제약

4:2:0 서브샘플링에서 크로마의 해상도는 루마의 절반이다. 따라서 **크로마 블록의 최소 크기 제약**이 있다.

### 루마 → 크로마 매핑

| 루마 블록 | 4:2:0 크로마 블록 |
|-----------|-------------------|
| 4×4 | 2×2 |
| 8×8 | 4×4 |
| 4×8 | 2×4 |
| 8×4 | 4×2 |

**문제**: 2×2 크로마 블록은 변환/예측이 비효율적이다.

### 크로마 블록 최소 크기

스펙은 크로마 블록의 최소 크기를 제한한다. `get_plane_residual_size()` 함수가 크로마 평면의 실제 잔차 블록 크기를 결정한다.

작은 루마 블록들은 **크로마 처리를 위해 묶일 수** 있다. 예를 들어 4개의 4×4 루마 블록이 있으면, 해당 영역의 크로마는 하나의 4×4 블록으로 처리될 수 있다.

## 4.8 파티션 결정: 인코더의 역할

디코더는 비트스트림에서 파티션 타입을 읽기만 한다. **어떤 파티션이 최적인지 결정하는 것은 인코더의 일**이다.

### Rate-Distortion Optimization (RDO)

인코더는 각 파티션 옵션의 비용을 계산한다:

```
J = D + λ × R

J: RD 비용 (낮을수록 좋음)
D: 왜곡 (원본과의 차이)
R: 비트 수 (필요한 비트)
λ: 라그랑주 승수 (품질 vs 비트레이트 트레이드오프)
```

인코더는 모든 가능한 파티션 조합을 시도하고, 가장 낮은 J 값을 가진 파티션을 선택한다.

### 탐색 전략

완전 탐색(exhaustive search)은 비용이 너무 크다. 실제 인코더는 휴리스틱을 사용한다:

1. **Early termination**: PARTITION_NONE의 비용이 충분히 낮으면 분할 탐색을 중단
2. **Pruning**: 이전 프레임의 파티션 구조를 힌트로 사용
3. **ML 기반**: 신경망으로 파티션 후보를 사전 필터링

libaom의 `--cpu-used` 옵션이 이 탐색 깊이를 조절한다. 낮은 값(0)은 더 철저한 탐색, 높은 값(8+)은 빠른 휴리스틱.

## 4.9 H.264/HEVC와의 비교

### H.264

- 고정 16×16 매크로블록
- 매크로블록 내부에서만 파티션: 16×16, 16×8, 8×16, 8×8
- 8×8 블록 내부: 8×8, 8×4, 4×8, 4×4
- **Quad-tree만**, T-shape 없음

### HEVC

- 최대 64×64 CTU (Coding Tree Unit)
- Quad-tree로 CU(Coding Unit) 분할
- CU 내부에서 PU(Prediction Unit) 분할: 2N×2N, 2N×N, N×2N, N×N
- **T-shape 없음**, 정사각형 중심

### AV1

- 최대 128×128 슈퍼블록
- 10가지 파티션 타입 (T-shape, 4-way 포함)
- **직사각형에도 재귀 분할 가능**
- 콘텐츠 적응성이 가장 높음

```
H.264      HEVC       AV1
16×16      64×64      128×128     최대 블록
4×4        4×4        4×4         최소 블록
4가지      4가지      10가지      파티션 타입
없음       없음       있음        T-shape
없음       없음       있음        4-way split
```

## 정리

- 프레임은 **슈퍼블록 그리드**로 나뉜다 (64×64 또는 128×128).
- 각 슈퍼블록은 **재귀적으로 분할**된다.
- **10가지 파티션 타입**: NONE, HORZ, VERT, SPLIT, HORZ_A/B, VERT_A/B, HORZ_4, VERT_4.
- **PARTITION_SPLIT만 재귀적**이다. 나머지는 리프 노드.
- **24가지 블록 크기**가 지원된다 (정사각형 6 + 직사각형 18).
- 최소 블록 크기는 **4×4**이다.
- 크로마는 4:2:0에서 **최소 크기 제약**이 있다.
- **파티션 결정은 인코더가** RDO로 수행한다.
- AV1은 H.264/HEVC보다 **유연한 파티션 구조**를 가진다.

## 다음 장 예고

Ch 5에서는 Frame Header를 다룬다. 프레임 타입, 양자화 설정, 루프 필터 설정 등 프레임별 파라미터를 살펴본다.

## 관련 항목

- [Ch 3: Sequence Header와 공간 구조](/blog/media/av1/chapter02-bitstream/05-sequence-header)
- [Ch 5: Frame Header](/blog/media/av1/chapter05-frame-header)
- [Ch 6: 블록 구조와 CB/TB](/blog/media/av1/chapter06-block-structure)
