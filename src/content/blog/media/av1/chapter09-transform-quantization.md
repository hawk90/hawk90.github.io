---
title: "Ch 9: 변환과 양자화"
date: 2025-10-01T10:00:00
description: "AV1의 잔차 복원 — 계수 파싱, 역양자화, DCT/ADST/IDTX 역변환, 16가지 2D 변환 조합."
tags: [AV1, Video, Codec, Transform, Quantization, DCT]
series: "AV1"
seriesOrder: 9
draft: true
---

예측은 완벽하지 않다. 아무리 좋은 예측을 해도 **원본과 예측의 차이**(잔차, residual)는 존재한다. AV1은 이 잔차를 **주파수 영역으로 변환**하여 압축한다. 이 장에서는 비트스트림에서 변환 계수를 파싱하고, 역양자화와 역변환을 거쳐 잔차를 복원하는 과정을 살펴본다.

---

## 9.1 잔차란 무엇인가

### 인코더와 디코더의 관점

**인코더 관점:**
```
residual(x, y) = original(x, y) - prediction(x, y)
```

인코더는 원본 픽셀에서 예측값을 빼서 잔차를 계산한다. 잔차는 원본 픽셀보다 훨씬 작은 값들로 이루어지므로 압축에 유리하다.

**디코더 관점:**
```
비트스트림 → 계수 파싱 → 역양자화 → 역변환 → 잔차
```

디코더는 원본 픽셀을 모른다. 비트스트림에서 양자화된 변환 계수를 읽어 역과정을 거쳐 잔차를 복원한다.

### 잔차 복원 파이프라인

```
+-------------+     +----------+     +----------+     +--------+
| 비트스트림  | --> |  계수    | --> |  역양자화 | --> | 역변환  |
| (압축 계수) |     |  파싱    |     | (qcoeff→ |     | (주파수→|
+-------------+     +----------+     |  dcoeff) |     |  공간)  |
                                     +----------+     +--------+
                                                           |
                                                           v
                                                     +-----------+
                                                     |   잔차    |
                                                     | (residual)|
                                                     +-----------+
```

최종 복원 픽셀은 `prediction + residual`로 계산된다.

---

## 9.2 주파수 영역이란

### 소리에서 출발하기

주파수 개념은 소리에서 이해하기 쉽다:

| 소리 | 주파수 | 특징 |
|------|--------|------|
| 베이스 드럼 | 저주파 | 느리게 진동, 부드러운 변화 |
| 하이햇 | 고주파 | 빠르게 진동, 급격한 변화 |

오디오 이퀄라이저는 주파수별로 볼륨을 조절한다 — "저음 줄이고 고음 올리기".

### 영상도 똑같다

| 영상 영역 | 주파수 | 예시 |
|-----------|--------|------|
| 부드러운 영역 | 저주파 | 하늘, 벽, 단색 배경 |
| 급격한 영역 | 고주파 | 에지, 텍스처, 글자 윤곽 |

**변환(Transform)** = "이미지의 이퀄라이저"

### 1D 예시로 느껴보기

```
원본 신호:     [128, 130, 129, 131, 200, 198, 201, 199]
               ↑ 부드러운 영역 ↑    ↑ 급격한 점프 ↑

DCT 변환 후:   [DC=177, 저주파=큰값, ..., 고주파=작은값]
               대부분의 에너지가 앞쪽(저주파)에 집중!
```

**핵심 통찰:** 앞쪽 몇 개만 보내고 나머지는 0으로 처리해도 대충 복원된다 — 이것이 **압축**이다.

### 2D 확장

이미지 블록은 행 방향 + 열 방향으로 각각 변환한다:

```
+-------+-------+-------+-------+
|  DC   |       |       |       |
| (평균)|       | ←저주파→       |
+-------+       +-------+-------+
|       |       |       |       |
|       |       |       |       |
+-------+-------+-------+-------+
|       |       |       |       |
| ↑     |       |       | 고주파 |
| 저    |       |       |  ↓    |
| 주    |       |       |       |
| 파    |       |       |       |
+-------+-------+-------+-------+
```

- **좌상단** = 저주파 (평균, 부드러운 변화)
- **우하단** = 고주파 (에지, 노이즈)

자연 영상은 좌상단에 에너지가 집중되고, 우하단은 거의 0이다.

---

## 9.3 계수 파싱

비트스트림에서 변환 계수를 추출하는 과정이다 (스펙 Section 5.11.39).

### 스캔 순서

변환 블록 내 계수는 **지그재그(zigzag) 스캔** 순서로 읽는다:

```
8×8 블록의 지그재그 스캔:

 0  1  5  6 14 15 27 28
 2  4  7 13 16 26 29 42
 3  8 12 17 25 30 41 43
 9 11 18 24 31 40 44 53
10 19 23 32 39 45 52 54
20 22 33 38 46 51 55 60
21 34 37 47 50 56 59 61
35 36 48 49 57 58 62 63
```

저주파(좌상단)에서 고주파(우하단) 순서로 읽어서 연속된 0들을 효율적으로 압축한다.

### EOB (End-of-Block) 파싱

대부분의 블록은 고주파 계수가 0이다. EOB는 "이 위치 이후로 모두 0"을 알린다:

```
계수:     [5, 3, -2, 1, 0, 0, 0, 0, ...]
          ↑           ↑
          |           EOB = 4 (위치 4부터 모두 0)
          첫 번째 계수
```

**EOB 파싱 단계:**

1. **all_zero**: 이 블록의 계수가 모두 0인가? (1비트)
2. **eob_pt**: EOB 위치 범주 (로그 스케일 구간)
3. **eob_extra**: EOB 범주 내 정확한 위치

### 계수 레벨 파싱

계수의 절대값을 다단계로 파싱한다:

```
단계 1: coeff_base → 0, 1, 2, 3+ 구분
         |
         +-- 0, 1, 2면 → 완료
         |
         +-- 3이면 → 단계 2로

단계 2: coeff_br → 추가 레벨 (4~14)
         |
         +-- 14 미만이면 → 완료
         |
         +-- 14 이상이면 → 단계 3으로

단계 3: Exp-Golomb → 큰 계수 코딩

단계 4: sign → 부호 비트 (0=양수, 1=음수)
```

### 컨텍스트 모델링

현재 계수의 확률은 **이웃 계수의 레벨**에 영향받는다:

```
이웃 5개:
        +---+---+
        | A | B |
    +---+---+---+
    | C | D | X | ← 현재 위치
    +---+---+---+

context = min(A + B + C + D + diagonal, 4)
```

이웃 계수가 크면 현재 계수도 클 확률이 높다.

### parse_coefficients 의사 코드

```cpp
void parse_coefficients(int plane, int start_x, int start_y,
                        int tx_size, int tx_type) {
    int w = tx_width[tx_size];
    int h = tx_height[tx_size];
    int16_t coeffs[32 * 32] = {0};

    // 1. all_zero 체크
    bool all_zero = read_symbol(cdf_all_zero);
    if (all_zero) return;  // 모든 계수가 0

    // 2. EOB 파싱
    int eob = parse_eob(tx_size);

    // 3. 스캔 순서 테이블 선택
    const int* scan = get_scan(tx_size, tx_type);

    // 4. EOB까지 계수 파싱
    for (int i = eob - 1; i >= 0; i--) {
        int pos = scan[i];
        int ctx = get_coeff_context(coeffs, pos, w);

        // coeff_base 파싱
        int level = read_symbol(cdf_coeff_base[ctx]);

        if (level == 3) {
            // coeff_br 파싱 (추가 레벨)
            level += read_symbol(cdf_coeff_br[ctx]);
            if (level >= 14) {
                // Exp-Golomb으로 큰 계수
                level += read_golomb();
            }
        }

        if (level > 0) {
            // 부호 비트
            int sign = read_literal(1);
            coeffs[pos] = sign ? -level : level;
        }
    }

    // 5. 역양자화 및 역변환
    dequantize(coeffs, tx_size, plane);
    inverse_transform_2d(coeffs, tx_size, tx_type);
}
```

---

## 9.4 역양자화

양자화는 계수를 **더 적은 비트**로 표현하기 위해 정밀도를 줄이는 과정이다. 역양자화는 그 역과정이다 (스펙 Section 7.12.2).

### 양자화 공식

**인코더 (양자화):**
```
qcoeff = round(coeff / qstep)
```

**디코더 (역양자화):**
```
dcoeff = qcoeff × qstep
```

### qstep 결정

**qindex**는 0~255 범위의 양자화 파라미터다. Frame Header의 `base_q_idx`에서 시작한다.

```
qindex → 양자화 테이블 조회 → qstep
```

| qindex | DC qstep | AC qstep |
|--------|----------|----------|
| 0      | 4        | 4        |
| 50     | 18       | 21       |
| 100    | 48       | 62       |
| 150    | 111      | 152      |
| 200    | 254      | 349      |
| 255    | 1336     | 1828     |

DC 계수(평균값)와 AC 계수(주파수 성분)에 **별도 테이블**을 적용한다.

### 루마/크로마 분리

Frame Header에서 `delta_q` 값을 읽어 Y, U, V 평면별로 다른 qindex를 적용할 수 있다:

```
Y_qindex  = base_q_idx + DeltaQYDc
U_qindex  = base_q_idx + DeltaQUDc
V_qindex  = base_q_idx + DeltaQVDc
```

### Quantization Matrix (QM)

HVS(Human Visual System)는 저주파에 더 민감하다. QM은 주파수 위치별 가중치를 적용한다:

```
dcoeff = qcoeff × qstep × qm_value[row][col] / 16
```

| 위치 | qm_value | 의미 |
|------|----------|------|
| 좌상단 | 16 | 저주파 — 더 정밀 |
| 우하단 | 8~12 | 고주파 — 더 거칠게 |

### dequantize 구현

```cpp
void dequantize(int16_t* coeffs, int tx_size, int plane) {
    int w = tx_width[tx_size];
    int h = tx_height[tx_size];

    // qindex 결정
    int qindex = get_qindex(plane);

    // DC/AC qstep 조회
    int dc_qstep = dc_qlookup[qindex];
    int ac_qstep = ac_qlookup[qindex];

    // 역양자화
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            int idx = y * w + x;
            int qstep = (x == 0 && y == 0) ? dc_qstep : ac_qstep;

            // QM 적용 (using_qmatrix가 true일 때)
            if (using_qmatrix) {
                int qm = qmatrix[qm_level][plane][tx_size][y][x];
                coeffs[idx] = (coeffs[idx] * qstep * qm + 8) >> 4;
            } else {
                coeffs[idx] = coeffs[idx] * qstep;
            }
        }
    }
}
```

---

## 9.5 역변환 수학

### DCT (Discrete Cosine Transform)

DCT는 신호를 **코사인 기저 함수들의 가중합**으로 분해한다 (스펙 Section 7.13.2.3).

**1D DCT 정의:**
```
Forward:  X[k] = Σₙ x[n] × cos(π(2n+1)k / 2N)
Inverse:  x[n] = Σₖ X[k] × cos(π(2n+1)k / 2N)
```

**직관:**
- X[0] = **DC 성분** (평균값)
- X[k>0] = **AC 성분** (주파수 k의 진폭)
- 자연 영상은 에너지가 저주파에 집중 → 고주파 계수는 대부분 0에 가까움

### 정수 근사 DCT

실수 코사인 값을 **정수 행렬로 근사**하여 고정소수점 연산으로 처리한다.

**AV1의 4-point IDCT 행렬:**
```
[a  b  a  c]     a = 2896 (≈ cos(π/8) × 4096)
[a  c -a -b]     b = 3784 (≈ cos(π/16) × 4096)
[a -c -a  b]     c = 1567 (≈ cos(3π/16) × 4096)
[a -b  a -c]
```

**곱셈 후 정규화:**
```cpp
result = (sum + (1 << 11)) >> 12;  // 반올림 후 right shift
```

### 2D 변환 = 행 변환 + 열 변환

2D 변환은 **분리 가능(separable)**하다:

```
1. 각 행에 1D IDCT 적용 → 중간 결과
2. 각 열에 1D IDCT 적용 → 최종 잔차
```

```cpp
void inverse_transform_2d(int16_t* coeffs, int tx_size, int tx_type) {
    int w = tx_width[tx_size];
    int h = tx_height[tx_size];
    int16_t temp[32 * 32];

    // 1. 행 변환 (수평)
    for (int y = 0; y < h; y++) {
        inverse_transform_1d(&coeffs[y * w], &temp[y * w], w, tx_type_h);
    }

    // 전치
    transpose(temp, w, h);

    // 2. 열 변환 (수직)
    for (int x = 0; x < w; x++) {
        inverse_transform_1d(&temp[x * h], &coeffs[x * h], h, tx_type_v);
    }

    // 전치 복원
    transpose(coeffs, h, w);
}
```

### Butterfly 연산

DCT를 효율적으로 구현하는 핵심 빌딩 블록이다 (스펙 Section 7.13.2.1):

```
2-input butterfly:
    BF(a, b, cos, sin):
        x = a × cos + b × sin
        y = a × sin - b × cos
```

**N-point DCT = log₂(N) 단계의 butterfly 연산**

| 방식 | 곱셈 횟수 |
|------|-----------|
| 행렬 곱셈 | N × N |
| Butterfly | O(N log N) |

8-point DCT: 64번 → 24번으로 감소.

### 배열 순열 (Permutation)

Butterfly 단계 간 데이터 접근 패턴을 최적화하기 위해 **입력/출력 순서를 재배열**한다 (스펙 Section 7.13.2.2, 7.13.2.4~5):

- **Inverse DCT**: 비트 반전(bit-reversal) 순서
- **Inverse ADST**: 별도 순열 테이블

---

## 9.6 ADST — 비대칭 사인 변환

DCT는 양쪽 경계가 대칭일 때 효율적이다. 하지만 Intra 예측은 **한쪽 경계에서 시작**한다 (스펙 Section 7.13.2.6).

### DCT vs ADST

| 변환 | 경계 조건 | 적합한 상황 |
|------|-----------|-------------|
| DCT | 양쪽 대칭 | 양쪽이 비슷할 때 |
| ADST | 한쪽 고정, 반대쪽 자유 | 한쪽에서 예측할 때 |

**1D ADST 정의:**
```
X[k] = Σₙ x[n] × sin(π(2n+1)(2k+1) / 4N)
```

### Intra 예측과의 관계

Intra 예측은 위/왼쪽 경계에서 시작한다:

```
참조 픽셀:  [A B C D E F G H]
            ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
예측 방향 →  +---------------+
             | 예측값이      |
             | 경계 근처에서 |
             | 더 정확      |
             +---------------+
```

**잔차는 경계 근처에서 작고, 멀어질수록 클 수 있다** — ADST가 이 비대칭 분포를 더 잘 표현한다.

### FLIPADST

ADST의 입력을 좌우 반전한다:

```
입력:     [a, b, c, d, e, f, g, h]
반전:     [h, g, f, e, d, c, b, a]
ADST 적용
```

**잔차가 반대쪽 경계 근처에서 더 작을 때** 사용한다.

### IDTX (Identity Transform)

**변환을 하지 않는다** (스펙 Section 7.13.2.9):

```cpp
output[i] = input[i] × scale_factor
```

**적합한 상황:**
- 스크린 콘텐츠 (텍스트, 아이콘, 그래픽)
- Sharp edge가 많은 영상
- 주파수 변환이 오히려 비효율적인 경우

**크기별 스케일링 팩터:**

| 변환 | 스케일 |
|------|--------|
| IDTX4 | × √2 |
| IDTX8 | × 2 |
| IDTX16 | × 2√2 |
| IDTX32 | × 4 |

### WHT (Walsh-Hadamard Transform)

**무손실 코딩**(base_q_idx=0)에서 4×4 블록 전용이다 (스펙 Section 7.13.2.10):

```cpp
// 곱셈 없음! 덧셈/뺄셈만
a = input[0] + input[1];
b = input[0] - input[1];
c = input[2] + input[3];
d = input[2] - input[3];

output[0] = a + c;
output[1] = b + d;
output[2] = a - c;
output[3] = b - d;
```

**왜 DCT 대신 WHT?** 무손실에서는 에너지 집중보다 **정확한 복원**이 중요하다.

---

## 9.7 16가지 2D 변환 조합

수평/수직 방향에 **독립적으로 다른 커널**을 적용할 수 있다 (스펙 Section 5.11.40).

### 4가지 1D 커널 × 4가지 = 16가지

| | DCT | ADST | FLIPADST | IDTX |
|---|-----|------|----------|------|
| **DCT** | DCT-DCT | DCT-ADST | DCT-FLIP | DCT-IDTX |
| **ADST** | ADST-DCT | ADST-ADST | ADST-FLIP | ADST-IDTX |
| **FLIPADST** | FLIP-DCT | FLIP-ADST | FLIP-FLIP | FLIP-IDTX |
| **IDTX** | IDTX-DCT | IDTX-ADST | IDTX-FLIP | IDTX-IDTX |

표기: `H-V` (수평 변환 - 수직 변환)

### 블록 크기에 따른 제한

| 블록 크기 | 허용되는 tx_type |
|-----------|------------------|
| 4×4, 8×8 | 16가지 모두 |
| 16×16 | 약 6가지 |
| 32×32 | DCT-DCT, IDTX-IDTX 등 |
| 64×64 | DCT-DCT만 |

큰 블록에서 다양한 커널의 이점이 적기 때문이다.

### get_transform_set (스펙 Section 5.11.48)

블록 크기와 예측 모드에 따라 **허용되는 tx_type 세트**를 결정한다:

```
Set 0: {DCT-DCT}                         // 큰 블록
Set 1: {DCT-DCT, ADST-DCT, DCT-ADST, ADST-ADST, FLIPADST-DCT, ...}
Set 2: 16가지 전부                       // 작은 블록
```

### Intra vs Inter

| 모드 | tx_type 결정 |
|------|-------------|
| Intra | 예측 모드에서 **유도** (V_PRED → ADST-DCT) |
| Inter | 비트스트림에서 **직접 시그널링** |

**compute_transform_type** (스펙 Section 5.11.40):

```cpp
int compute_transform_type(int mode, int tx_size) {
    if (is_intra) {
        // Intra: 예측 모드에서 유도
        switch (mode) {
            case V_PRED:  return ADST_DCT;   // 수직 예측 → 수평 ADST
            case H_PRED:  return DCT_ADST;   // 수평 예측 → 수직 ADST
            case DC_PRED: return DCT_DCT;
            // ...
        }
    } else {
        // Inter: 비트스트림에서 읽기
        return read_tx_type(tx_size);
    }
}
```

### get_scan (스펙 Section 5.11.41)

tx_type과 tx_size에 따라 **스캔 순서 테이블**을 선택한다:

| tx_type | 스캔 순서 |
|---------|-----------|
| DCT-DCT | 기본 지그재그 |
| ADST-DCT | 행 우선 |
| DCT-ADST | 열 우선 |

---

## 9.8 변환 블록 크기와 분할

### TX Size 결정

**tx_depth**는 Coding Block 내에서 Transform Block을 추가 분할하는 깊이다:

```
CB 32×32 (tx_depth=0)
    ↓ tx_depth=1
TB 16×16  16×16
16×16  16×16
    ↓ tx_depth=2
TB 8×8 8×8  8×8 8×8
   8×8 8×8  8×8 8×8
   8×8 8×8  8×8 8×8
   8×8 8×8  8×8 8×8
```

**최대 분할:** 2단계 (예: 32×32 CB → 16×16 TB → 8×8 TB)

### 직사각형 변환

AV1은 **직사각형 변환 블록**을 지원한다:

| 비율 | 크기 |
|------|------|
| 2:1 | 4×8, 8×16, 16×32, 32×64 |
| 4:1 | 4×16, 8×32, 16×64 |
| 1:2 | 8×4, 16×8, 32×16, 64×32 |
| 1:4 | 16×4, 32×8, 64×16 |

행과 열에 **서로 다른 크기의 커널**을 적용한다.

### 19가지 TX 크기

```
정사각형:  4×4, 8×8, 16×16, 32×32, 64×64
2:1 비율:  4×8, 8×16, 16×32, 32×64
4:1 비율:  4×16, 8×32, 16×64
1:2 비율:  8×4, 16×8, 32×16, 64×32
1:4 비율:  16×4, 32×8, 64×16
```

---

## 9.9 복원: 예측 + 잔차

최종 복원 픽셀은 예측값과 잔차를 더해서 계산한다 (스펙 Section 7.12.3):

```cpp
reconstruct(x, y) = clip(prediction(x, y) + residual(x, y), 0, max)
```

### 클리핑이 필요한 이유

예측값 + 잔차가 유효 범위를 벗어날 수 있다:

```
예측값:   200
잔차:     +80
합계:     280  → clip(280, 0, 255) = 255
```

### 비트 깊이별 클리핑 범위

| 비트 깊이 | 범위 |
|-----------|------|
| 8-bit | 0 ~ 255 |
| 10-bit | 0 ~ 1023 |
| 12-bit | 0 ~ 4095 |

### reconstruct 구현

```cpp
void reconstruct(int plane, int start_x, int start_y,
                 int w, int h, int16_t* residual) {
    int max_val = (1 << bit_depth) - 1;

    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            int pred = prediction[plane][start_y + y][start_x + x];
            int res = residual[y * w + x];

            // 복원 및 클리핑
            int recon = pred + res;
            if (recon < 0) recon = 0;
            if (recon > max_val) recon = max_val;

            frame[plane][start_y + y][start_x + x] = recon;
        }
    }
}
```

### 복원 결과 시각화

```
+------------+     +------------+     +------------+
| 예측 블록   |  +  |  잔차 블록  |  =  | 복원 블록   |
| (대략적    |     | (차이 보정) |     | (원본에    |
|  형태)     |     |            |     |  가까움)   |
+------------+     +------------+     +------------+
```

잔차의 에너지는 대부분 0에 가깝다 — 예측이 잘 되었다는 의미다.

---

## 정리

1. **잔차** = 원본 - 예측, 디코더는 비트스트림에서 역복원한다.

2. **계수 파싱**: 지그재그 스캔, EOB, coeff_base → coeff_br → sign.

3. **역양자화**: qindex → qstep 테이블 조회, DC/AC 분리, QM 적용.

4. **역변환**: DCT(대칭), ADST(비대칭), FLIPADST(반전), IDTX(변환 없음), WHT(무손실).

5. **2D 변환**: 16가지 H-V 조합, 블록 크기에 따라 허용 세트 제한.

6. **Butterfly**: O(N log N) 효율적 구현, 배열 순열로 접근 패턴 최적화.

7. **복원**: prediction + residual, 비트 깊이에 맞게 클리핑.

8. **변환 선택**: Intra는 모드에서 유도, Inter는 직접 시그널링.

---

## 다음 장 예고

Ch 10에서는 **첫 프레임 완성**을 다룬다. 모든 블록을 순회하여 프레임 전체를 조립하고, YUV → RGB 변환을 거쳐 최종 이미지를 출력한다.

---

## 관련 항목

- [Ch 8: Intra 예측](/blog/media/av1/chapter08-intra-prediction) — 예측값 생성
- [Ch 7: 엔트로피 코딩](/blog/media/av1/chapter07-entropy-coding) — 계수 파싱의 기반
- [Ch 10: 첫 프레임 완성](/blog/media/av1/chapter10-frame-assembly) — 블록 순회와 프레임 조립
