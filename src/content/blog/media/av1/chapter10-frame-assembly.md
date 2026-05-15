---
title: "Ch 10: 프레임 조립"
date: 2025-10-01T11:00:00
description: "AV1 프레임 조립 — 블록 순회, 크로마 처리, YUV→RGB 변환, 첫 프레임 완성과 검증."
tags: [AV1, Video, Codec, Frame, Decoding]
series: "AV1"
seriesOrder: 10
draft: false
---

지금까지 개별 블록을 예측하고 잔차를 복원하는 방법을 배웠다. 이 장에서는 **모든 블록을 순회**하여 프레임 전체를 조립하고, **YUV → RGB 변환**을 거쳐 최종 이미지를 출력한다. 이 장을 완료하면 첫 번째 Intra 프레임이 복원된다.

---

## 10.1 블록 순회 순서

프레임 디코딩은 **두 레벨의 중첩 루프**로 이루어진다 (스펙 Section 5.11).

### Superblock 레벨: 래스터 스캔

프레임은 Superblock 그리드로 나뉜다. 각 SB를 **좌→우, 상→하** 순서로 처리한다:

```
+-----+-----+-----+-----+
|  0  |  1  |  2  |  3  |  → sb_row = 0
+-----+-----+-----+-----+
|  4  |  5  |  6  |  7  |  → sb_row = 1
+-----+-----+-----+-----+
|  8  |  9  | 10  | 11  |  → sb_row = 2
+-----+-----+-----+-----+
    sb_col →
```

### SB 내부: Z-order (재귀적 depth-first)

각 Superblock 내부는 파티션 트리를 따라 **Z-order**로 순회한다:

```
PARTITION_SPLIT 예시 (64×64 SB):

+---+---+---+---+
| 0 | 1 | 4 | 5 |
+---+---+---+---+
| 2 | 3 | 6 | 7 |
+---+---+---+---+
| 8 | 9 |12 |13 |
+---+---+---+---+
|10 |11 |14 |15 |
+---+---+---+---+

처리 순서: 0 → 1 → 2 → 3 → 4 → 5 → ... → 15
```

### decode_frame 메인 루프

```cpp
void decode_frame() {
    // Superblock 크기 (64 또는 128)
    int sb_size = use_128x128_superblock ? 128 : 64;

    // Superblock 그리드 크기
    int sb_cols = (frame_width + sb_size - 1) / sb_size;
    int sb_rows = (frame_height + sb_size - 1) / sb_size;

    // 모든 Superblock 순회 (래스터 스캔)
    for (int sb_row = 0; sb_row < sb_rows; sb_row++) {
        for (int sb_col = 0; sb_col < sb_cols; sb_col++) {
            int mi_row = sb_row * (sb_size / MI_SIZE);
            int mi_col = sb_col * (sb_size / MI_SIZE);

            // SB 내부 파티션 트리 순회 (재귀)
            parse_partition(mi_row, mi_col, sb_size);
        }
    }
}
```

### parse_partition 재귀

```cpp
void parse_partition(int mi_row, int mi_col, int bsize) {
    // 프레임 경계 체크
    if (mi_row >= mi_rows || mi_col >= mi_cols) return;

    // 파티션 타입 파싱
    PartitionType partition = parse_partition_type(mi_row, mi_col, bsize);

    switch (partition) {
        case PARTITION_NONE:
            decode_block(mi_row, mi_col, bsize);
            break;

        case PARTITION_HORZ:
            decode_block(mi_row, mi_col, bsize);  // 상단
            decode_block(mi_row + half, mi_col, bsize);  // 하단
            break;

        case PARTITION_VERT:
            decode_block(mi_row, mi_col, bsize);  // 좌측
            decode_block(mi_row, mi_col + half, bsize);  // 우측
            break;

        case PARTITION_SPLIT:
            int sub = bsize - 1;  // 한 단계 작은 크기
            parse_partition(mi_row, mi_col, sub);  // 좌상
            parse_partition(mi_row, mi_col + half, sub);  // 우상
            parse_partition(mi_row + half, mi_col, sub);  // 좌하
            parse_partition(mi_row + half, mi_col + half, sub);  // 우하
            break;

        // HORZ_A, HORZ_B, VERT_A, VERT_B, HORZ_4, VERT_4 도 처리
    }
}
```

---

## 10.2 블록 간 의존성

블록 순회 순서는 **예측 의존성** 때문에 중요하다.

### Intra 예측 의존성

Intra 예측은 **위쪽**과 **왼쪽** 이웃 픽셀을 참조한다:

```
    +---+---+---+---+---+
    | A | B | C | D | E |  ← 위쪽 참조 (이미 복원됨)
+---+---+---+---+---+---+
| L |   |   |   |   |   |  ← 왼쪽 참조 (이미 복원됨)
+---+   현재 블록       +
| M |                   |
+---+                   +
| N |                   |
+---+---+---+---+---+---+
```

**순서 위반 시 잘못된 예측 → 디코딩 오류**

래스터 스캔 + Z-order는 이 의존성을 자연스럽게 만족한다:
- 위쪽 블록은 이전 SB 행에서 이미 복원됨
- 왼쪽 블록은 같은 SB 행에서 먼저 처리됨

### 엔트로피 코딩 컨텍스트

엔트로피 코딩도 이웃 블록 정보에 의존한다:

```cpp
struct AboveContext {
    int mode[MAX_MI_COLS];      // 위쪽 블록의 예측 모드
    int txfm[MAX_MI_COLS];      // 위쪽 블록의 변환 크기
    int skip[MAX_MI_COLS];      // 위쪽 블록의 skip 플래그
    int coeff_level[MAX_MI_COLS]; // 위쪽 블록의 계수 레벨
};

struct LeftContext {
    int mode[MAX_MI_ROWS];
    int txfm[MAX_MI_ROWS];
    int skip[MAX_MI_ROWS];
    int coeff_level[MAX_MI_ROWS];
};
```

**매 블록 디코딩 후 컨텍스트 업데이트:**

```cpp
void update_context(int mi_row, int mi_col, int bsize, BlockInfo* info) {
    int w4 = num_4x4_blocks_wide[bsize];
    int h4 = num_4x4_blocks_high[bsize];

    // 위쪽 컨텍스트 업데이트 (현재 행의 다음 블록용)
    for (int i = 0; i < w4; i++) {
        above_context.mode[mi_col + i] = info->mode;
        above_context.txfm[mi_col + i] = info->tx_size;
        above_context.skip[mi_col + i] = info->skip;
    }

    // 왼쪽 컨텍스트 업데이트
    for (int i = 0; i < h4; i++) {
        left_context.mode[mi_row + i] = info->mode;
        left_context.txfm[mi_row + i] = info->tx_size;
        left_context.skip[mi_row + i] = info->skip;
    }
}
```

---

## 10.3 크로마 처리

### 4:2:0 서브샘플링

AV1은 4:2:0 서브샘플링이 가장 일반적이다:

```
루마 (Y):        크로마 (U, V):
+---+---+---+---+    +---+---+
| Y | Y | Y | Y |    | U | U |
+---+---+---+---+    +---+---+
| Y | Y | Y | Y |    | U | U |
+---+---+---+---+    +---+---+
| Y | Y | Y | Y |
+---+---+---+---+
| Y | Y | Y | Y |
+---+---+---+---+

루마 8×8 → 크로마 4×4
```

### 루마-크로마 블록 크기 관계

| 루마 블록 | 크로마 블록 (4:2:0) |
|-----------|---------------------|
| 64×64 | 32×32 |
| 32×32 | 16×16 |
| 16×16 | 8×8 |
| 8×8 | 4×4 |
| 4×4 | **상위 블록 단위** |

**4×4 루마 블록의 특수 처리:**

4×4 루마 블록은 크로마가 2×2가 되어 너무 작다. 이 경우 **여러 4×4 루마 블록을 묶어서** 크로마를 처리한다:

```
루마 4×4 블록 4개:     크로마 4×4 블록 1개:
+---+---+               +---+
| A | B |               | C |
+---+---+    →          +---+
| C | D |
+---+---+
```

### 세 평면 디코딩

Y, U(Cb), V(Cr) 세 평면을 각각 독립적으로 디코딩한다:

```cpp
void decode_block(int mi_row, int mi_col, int bsize) {
    // 블록 모드 정보 파싱
    BlockInfo info;
    parse_block_info(&info, mi_row, mi_col, bsize);

    // 루마 디코딩
    decode_plane(PLANE_Y, mi_row, mi_col, bsize, &info);

    // 크로마 디코딩 (서브샘플링 적용)
    if (has_chroma(mi_row, mi_col, bsize)) {
        int chroma_size = get_chroma_block_size(bsize);
        int chroma_row = mi_row >> subsampling_y;
        int chroma_col = mi_col >> subsampling_x;

        decode_plane(PLANE_U, chroma_row, chroma_col, chroma_size, &info);
        decode_plane(PLANE_V, chroma_row, chroma_col, chroma_size, &info);
    }
}
```

---

## 10.4 YUV → RGB 변환

디코딩된 프레임은 YUV 색공간이다. 화면 출력을 위해 **RGB로 변환**한다.

### BT.709 변환 행렬

HD 콘텐츠(720p, 1080p, 4K)에서 가장 일반적인 표준이다:

```
실수 연산 (Full Range, Y∈[0,255]):

R = Y + 1.5748 × (Cr − 128)
G = Y − 0.1873 × (Cb − 128) − 0.4681 × (Cr − 128)
B = Y + 1.8556 × (Cb − 128)
```

### Limited Range vs Full Range

| 범위 | Y | Cb, Cr |
|------|---|--------|
| Limited (TV) | 16 ~ 235 | 16 ~ 240 |
| Full (PC) | 0 ~ 255 | 0 ~ 255 |

대부분의 비디오 콘텐츠는 **Limited Range**다.

### 정수 연산 버전

실수 연산은 느리다. 정수 연산으로 변환한다 (8-bit, BT.709, Limited Range):

```cpp
void yuv_to_rgb_bt709_limited(int Y, int Cb, int Cr,
                               uint8_t* R, uint8_t* G, uint8_t* B) {
    // Limited Range 보정
    int y = Y - 16;
    int cb = Cb - 128;
    int cr = Cr - 128;

    // 정수 연산 (스케일 256 = 2^8)
    int r = (298 * y + 459 * cr + 128) >> 8;
    int g = (298 * y -  55 * cb - 136 * cr + 128) >> 8;
    int b = (298 * y + 541 * cb + 128) >> 8;

    // 클리핑
    *R = (r < 0) ? 0 : (r > 255) ? 255 : r;
    *G = (g < 0) ? 0 : (g > 255) ? 255 : g;
    *B = (b < 0) ? 0 : (b > 255) ? 255 : b;
}
```

### 색공간 표준 비교

| 표준 | 용도 | 특징 |
|------|------|------|
| BT.601 | SD (480i/576i) | 구형 TV |
| BT.709 | HD (720p~4K) | 현대 대부분 |
| BT.2020 | UHD, HDR | 넓은 색역 |

**각 표준의 계수가 다른 이유:** 색 재현 범위(gamut)와 휘도 특성이 다르다.

### 크로마 업샘플링

4:2:0에서 크로마는 루마의 1/4 해상도다. RGB 변환 전에 **업샘플링**이 필요하다:

```cpp
// 간단한 최근접 이웃 (Nearest Neighbor) 업샘플링
void upsample_chroma_nn(uint8_t* chroma, int chroma_w, int chroma_h,
                        uint8_t* output, int luma_w, int luma_h) {
    for (int y = 0; y < luma_h; y++) {
        for (int x = 0; x < luma_w; x++) {
            int cx = x >> 1;  // /2
            int cy = y >> 1;
            output[y * luma_w + x] = chroma[cy * chroma_w + cx];
        }
    }
}

// 더 좋은 품질: 쌍선형(Bilinear) 보간
void upsample_chroma_bilinear(uint8_t* chroma, int chroma_w, int chroma_h,
                               uint8_t* output, int luma_w, int luma_h) {
    for (int y = 0; y < luma_h; y++) {
        for (int x = 0; x < luma_w; x++) {
            float cx = (x + 0.5f) / 2.0f - 0.5f;
            float cy = (y + 0.5f) / 2.0f - 0.5f;

            int x0 = (int)cx, y0 = (int)cy;
            int x1 = x0 + 1, y1 = y0 + 1;
            float fx = cx - x0, fy = cy - y0;

            // 경계 체크
            x0 = clamp(x0, 0, chroma_w - 1);
            x1 = clamp(x1, 0, chroma_w - 1);
            y0 = clamp(y0, 0, chroma_h - 1);
            y1 = clamp(y1, 0, chroma_h - 1);

            // 쌍선형 보간
            float v00 = chroma[y0 * chroma_w + x0];
            float v01 = chroma[y0 * chroma_w + x1];
            float v10 = chroma[y1 * chroma_w + x0];
            float v11 = chroma[y1 * chroma_w + x1];

            float top = v00 * (1 - fx) + v01 * fx;
            float bot = v10 * (1 - fx) + v11 * fx;
            output[y * luma_w + x] = top * (1 - fy) + bot * fy;
        }
    }
}
```

---

## 10.5 이미지 출력

### BMP 파일 포맷

BMP는 비압축 포맷으로 구현이 간단하다:

```
+----------------------+
| BITMAPFILEHEADER     | 14 bytes
+----------------------+
| BITMAPINFOHEADER     | 40 bytes
+----------------------+
| RGB 픽셀 데이터       | width × height × 3 bytes
+----------------------+
```

### BMP 헤더 구조

```cpp
#pragma pack(push, 1)
struct BMPFileHeader {
    uint16_t type;       // 'BM' = 0x4D42
    uint32_t size;       // 파일 크기
    uint16_t reserved1;  // 0
    uint16_t reserved2;  // 0
    uint32_t offset;     // 픽셀 데이터 오프셋 (54)
};

struct BMPInfoHeader {
    uint32_t size;         // 40
    int32_t  width;        // 너비
    int32_t  height;       // 높이 (양수: bottom-up, 음수: top-down)
    uint16_t planes;       // 1
    uint16_t bit_count;    // 24 (RGB)
    uint32_t compression;  // 0 (비압축)
    uint32_t image_size;   // 픽셀 데이터 크기
    int32_t  x_ppm;        // 0
    int32_t  y_ppm;        // 0
    uint32_t colors_used;  // 0
    uint32_t colors_important; // 0
};
#pragma pack(pop)
```

### write_bmp 구현

```cpp
bool write_bmp(const char* filename, uint8_t* rgb,
               int width, int height) {
    FILE* f = fopen(filename, "wb");
    if (!f) return false;

    // 행 패딩 (4바이트 정렬)
    int row_size = ((width * 3 + 3) / 4) * 4;
    int image_size = row_size * height;

    // 헤더 설정
    BMPFileHeader fh = {
        .type = 0x4D42,
        .size = 54 + image_size,
        .offset = 54
    };

    BMPInfoHeader ih = {
        .size = 40,
        .width = width,
        .height = -height,  // top-down
        .planes = 1,
        .bit_count = 24,
        .image_size = image_size
    };

    // 헤더 쓰기
    fwrite(&fh, sizeof(fh), 1, f);
    fwrite(&ih, sizeof(ih), 1, f);

    // 픽셀 데이터 쓰기 (RGB → BGR 변환)
    uint8_t row[row_size];
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int src = (y * width + x) * 3;
            int dst = x * 3;
            row[dst + 0] = rgb[src + 2];  // B
            row[dst + 1] = rgb[src + 1];  // G
            row[dst + 2] = rgb[src + 0];  // R
        }
        fwrite(row, row_size, 1, f);
    }

    fclose(f);
    return true;
}
```

---

## 10.6 품질 검증

### PSNR (Peak Signal-to-Noise Ratio)

디코딩 품질을 측정하는 표준 지표다:

```
MSE = (1/N) × Σ (original[i] - decoded[i])²

PSNR = 10 × log₁₀(MAX² / MSE) dB
```

8-bit 영상에서 MAX = 255.

### PSNR 해석

| PSNR (dB) | 품질 |
|-----------|------|
| < 30 | 열악 — 눈에 띄는 열화 |
| 30 ~ 40 | 양호 — 약간의 열화 |
| 40 ~ 50 | 우수 — 거의 구분 불가 |
| > 50 | 완벽 — 무손실에 가까움|

### psnr 계산 구현

```cpp
double calculate_psnr(uint8_t* original, uint8_t* decoded,
                       int width, int height, int channels) {
    double mse = 0;
    int total = width * height * channels;

    for (int i = 0; i < total; i++) {
        double diff = original[i] - decoded[i];
        mse += diff * diff;
    }

    mse /= total;

    if (mse == 0) return INFINITY;  // 완전 동일

    return 10.0 * log10(255.0 * 255.0 / mse);
}
```

### aomdec과 비교

레퍼런스 디코더 aomdec으로 정확성을 검증한다:

```bash
# aomdec으로 디코딩
aomdec -o reference.y4m input.obu

# Y 평면만 추출하여 바이트 비교
cmp my_output.yuv reference.yuv
```

**바이트 완전 일치**가 목표다. 불일치 시 디버깅이 필요하다.

---

## 10.7 디버깅 가이드

출력이 틀렸을 때의 체계적인 진단 방법이다.

### 증상별 원인 진단

| 증상 | 가능한 원인 | 확인 방법 |
|------|-------------|-----------|
| 완전히 깨진 이미지 (노이즈) | 산술 디코더 초기화 오류 | 첫 번째 심볼부터 비교 |
| 블록 패턴이 보임 | 역변환 오류 또는 예측 모드 오류 | 블록 단위 예측값 덤프 |
| 색이 전체적으로 틀림 | YUV→RGB 변환 계수 오류 | Y 채널만 먼저 비교 |
| 밝기는 맞는데 색이 다름 | 크로마 서브샘플링 처리 오류 | Cb, Cr 평면 별도 비교 |
| 일부 블록만 틀림 | 파티션 트리 또는 컨텍스트 오류 | 해당 (row, col) 블록 추적 |

### 단계별 디버깅 전략

```
1. aomdec으로 레퍼런스 출력 생성

2. Y 평면을 바이트 단위로 비교 → 첫 번째 불일치 위치 찾기

3. 불일치 위치의 (row, col, bsize) 계산

4. 해당 블록의 중간 결과를 단계별로 덤프:
   a. 예측 모드
   b. 예측 값
   c. 양자화 계수
   d. 역변환 결과
   e. 복원 값

5. dav1d 디버그 빌드와 같은 블록의 중간 결과 비교
```

### 유용한 덤프 함수

```cpp
void dump_block(const char* stage, int row, int col, int bsize,
                const int16_t* data, int width, int height) {
    printf("[%s] block(%d,%d) size=%dx%d:\n",
           stage, row, col, width, height);

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            printf("%4d ", data[y * width + x]);
        }
        printf("\n");
    }
    printf("\n");
}

// 사용 예
dump_block("prediction", mi_row, mi_col, bsize, pred, w, h);
dump_block("coefficients", mi_row, mi_col, bsize, coeffs, w, h);
dump_block("residual", mi_row, mi_col, bsize, residual, w, h);
dump_block("reconstructed", mi_row, mi_col, bsize, recon, w, h);
```

### dav1d와 비교하기

dav1d는 고품질 AV1 디코더로 디버그 빌드를 지원한다:

```bash
# 디버그 빌드
meson setup build -Dlogging=true
ninja -C build

# 상세 로그 출력
DAV1D_LOG=all ./build/tools/dav1d -i input.obu -o /dev/null

# 출력에서 확인 가능:
# - 블록별 예측 모드
# - Motion Vector (Inter 프레임)
# - 변환 타입
# - 계수 레벨
```

### 체크포인트

이 장을 완료하면:

```
+-------------+     +-----------+     +-------------+
|  예측 블록   |  +  |  잔차 블록 |  =  |  복원 블록   |
+-------------+     +-----------+     +-------------+
      ↓                   ↓                  ↓
  Intra 예측         변환/양자화         프레임 버퍼
      ↓                   ↓                  ↓
   Ch 8              Ch 9              현재 장

                         ↓
                  +-------------+
                  | YUV → RGB   |
                  +-------------+
                         ↓
                  +-------------+
                  | BMP 출력    |
                  +-------------+
```

**"우리가 만든 디코더가 첫 번째 이미지를 복원했다!"**

---

## 정리

1. **블록 순회**: Superblock 래스터 스캔 + SB 내부 Z-order.

2. **의존성**: Intra 예측은 위/왼쪽 참조, 엔트로피는 컨텍스트에 의존.

3. **크로마**: 4:2:0 서브샘플링, 루마 8×8 → 크로마 4×4.

4. **YUV→RGB**: BT.709 정수 연산, Limited Range 보정, 클리핑.

5. **출력**: BMP 포맷 (비압축, 구현 간단).

6. **검증**: PSNR 계산, aomdec 레퍼런스 비교.

7. **디버깅**: 증상별 진단 표, 블록 단위 덤프, dav1d 비교.

---

## 다음 장 예고

Ch 11에서는 **참조 프레임**을 다룬다. 8개 슬롯, 7개 명명된 참조(LAST, GOLDEN, ALTREF 등), 프레임 버퍼 갱신 메커니즘을 살펴본다. 이를 통해 Inter 예측의 기반을 이해한다.

---

## 관련 항목

- [Ch 9: 변환과 양자화](/blog/media/av1/part3-blocks/chapter09-transform-quantization) — 잔차 복원
- [Ch 8: Intra 예측](/blog/media/av1/part4-prediction/chapter08-intra-prediction) — 예측값 생성
- [Ch 11: 참조 프레임](/blog/media/av1/part4-prediction/chapter11-reference-frames) — Inter 예측의 기반
