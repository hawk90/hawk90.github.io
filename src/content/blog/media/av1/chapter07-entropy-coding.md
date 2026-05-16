---
title: "Ch 7: 엔트로피 디코딩"
date: 2025-10-01T08:00:00
description: "AV1의 Multi-Symbol Arithmetic Coder — CDF 기반 산술 코딩과 적응적 확률 업데이트."
tags: [AV1, Video, Codec, Entropy, Arithmetic Coding, MSAC]
series: "AV1"
seriesOrder: 7
draft: true
---

## 7.1 정보 이론 직관

엔트로피 코딩을 이해하려면 **정보량**의 개념부터 시작해야 한다.

### 놀라움과 정보량

- "내일 해가 뜬다" → 놀랍지 않다 → 정보량이 작다
- "7월에 눈이 내린다" → 매우 놀랍다 → 정보량이 크다

**놀라운 정도 = 정보량 = 필요한 비트 수**

### 로그가 왜 나오는가

동전 던지기로 이해하자:
- 동전 1번 → 2가지 결과 → 1비트로 표현 (앞=0, 뒤=1)
- 동전 2번 → 4가지 결과 → 2비트
- 동전 3번 → 8가지 결과 → 3비트

패턴: `비트 수 = log₂(가능한 결과 수)`

확률 p인 사건의 정보량:
```
I(x) = log₂(1/p) = -log₂(p) bits
```

| 확률 p | 정보량 |
|--------|--------|
| 0.5 | 1 bit |
| 0.25 | 2 bits |
| 0.125 | 3 bits |
| 0.9 | 0.15 bits |
| 0.01 | 6.64 bits |

확률이 높을수록(예측 가능할수록) 정보량이 적다.

### 엔트로피

**엔트로피(Entropy)**는 평균적으로 필요한 비트 수다:

```
H(X) = -Σᵢ p(xᵢ) × log₂ p(xᵢ) bits/symbol
```

예시:
- 공정한 동전: H = 0.5×1 + 0.5×1 = **1 bit** (당연!)
- 편향 동전(앞=90%): H = 0.9×0.15 + 0.1×3.32 = **0.47 bit** → 1비트도 필요 없다!

비디오 비트스트림의 심볼 대부분은 편향되어 있다 (0이 압도적으로 많음). 엔트로피가 낮다 = 적은 비트로 표현 가능 = **압축 가능**.

## 7.2 왜 산술 코딩인가

### Huffman 코딩의 한계

Huffman 코딩은 심볼당 **정수 비트**만 할당할 수 있다.

| 심볼 | 확률 | 이론적 비트 | Huffman |
|------|------|------------|---------|
| A | 0.9 | 0.15 bits | 1 bit (최소) |
| B | 0.1 | 3.32 bits | 1 bit |

p=0.9인 심볼에도 최소 1비트가 필요하다. 이론적 최적(0.15 bits)에 비해 엄청난 낭비다.

### 산술 코딩의 아이디어

산술 코딩은 **분수 비트(fractional bit)**를 할당한다:
- 전체 메시지를 [0, 1) 구간의 하나의 분수로 표현
- 심볼마다 구간을 확률 비례로 축소
- 최종 구간 내의 이진수 하나가 전체 메시지를 표현

## 7.3 산술 코딩 원리

### 구간 축소

초기 구간: [low, high) = [0, 1)

심볼 s를 디코딩할 때:
```
range = high - low
high  = low + range × CDF(s+1)
low   = low + range × CDF(s)
```

**CDF(Cumulative Distribution Function)**:
- CDF(0) = 0
- CDF(n) = 1
- CDF(i) = 이전 심볼들의 확률 누적합

### 예시

3심볼 알파벳: A=0.6, B=0.3, C=0.1
- CDF = [0, 0.6, 0.9, 1.0]

메시지 "AB" 코딩:
1. 초기: [0, 1)
2. 'A' (CDF 0~0.6): [0, 0.6)
3. 'B' (CDF 0.6~0.9): [0.36, 0.54)

```
초기:  |====A(0.6)====|===B(0.3)===|=C=|
       0              0.6          0.9  1

'A':   |====A====|===B===|=C=|
       0         0.36    0.54 0.6

'AB':  |------|XXXXX|------|  (0.36 ~ 0.54)
```

최종 구간 [0.36, 0.54) 내의 아무 이진수로 메시지를 표현할 수 있다.

## 7.4 AV1 Multi-Symbol AC

(스펙 Section 8.2)

AV1은 **정수 산술**로 산술 코딩을 구현한다. 15-bit 정밀도를 사용한다.

### 디코더 상태

```cpp
struct SymbolDecoder {
    uint16_t val;     // 현재 비트스트림에서 읽은 값
    uint16_t rng;     // 현재 구간 크기 (range)
    int      cnt;     // 남은 비트 수
};
```

### CDF 표현

CDF는 15-bit 정수 배열이다:
- CDF[i] ∈ [0, 32768]
- CDF[n_symbols] = 32768 (= 2^15, 전체 확률 = 1.0)

예: 3심볼 (A=60%, B=30%, C=10%)
- CDF = [0, 19661, 29491, 32768]

### read_symbol 알고리즘

```cpp
int read_symbol(uint16_t* cdf, int n_symbols) {
    // 1. range를 n_symbols개 구간으로 CDF 비례 분할
    uint32_t rng = decoder.rng;
    uint32_t val = decoder.val;

    // 2. val이 어느 구간에 속하는지 찾기
    int s = 0;
    uint32_t low = 0;
    uint32_t high = 0;

    for (s = 0; s < n_symbols; s++) {
        low = (rng * cdf[s]) >> 15;
        high = (rng * cdf[s + 1]) >> 15;
        if (val < high)
            break;
    }

    // 3. val, rng 업데이트 (해당 구간으로 축소)
    decoder.val = val - low;
    decoder.rng = high - low;

    // 4. 정규화 (renormalization)
    renormalize();

    // 5. CDF 적응적 업데이트
    update_cdf(cdf, s, n_symbols);

    return s;  // 디코딩된 심볼
}
```

### H.264 CABAC과의 차이

| 특성 | H.264 CABAC | AV1 MSAC |
|------|-------------|----------|
| 심볼 크기 | 이진 (0 또는 1) | 최대 16값 |
| 이진화 | 필요 | 불필요 |
| 직렬 의존성 | 높음 | 낮음 |
| 병렬화 | 어려움 | 용이 |

CABAC은 모든 심볼을 **이진화(binarize)**해서 한 비트씩 코딩한다. AV1은 원본 심볼 그대로 코딩한다.

## 7.5 구간 정규화 (Renormalization)

구간이 너무 작아지면 정밀도가 부족해진다. 정규화로 구간 크기를 유지한다.

### 정규화 조건

`rng < 2^14` (16384)이면 정규화 필요.

### 정규화 동작

```cpp
void renormalize() {
    while (decoder.rng < 16384) {
        decoder.rng <<= 1;
        decoder.val = (decoder.val << 1) | read_bit();
        decoder.cnt--;

        if (decoder.cnt < 0) {
            // 비트스트림에서 새 바이트 읽기
            decoder.val |= read_byte() << (-decoder.cnt);
            decoder.cnt += 8;
        }
    }
}
```

정규화 후 `rng`는 항상 [2^14, 2^15) 범위다.

## 7.6 CDF 적응적 업데이트

(스펙 Section 8.3)

AV1의 핵심 특징: **확률이 학습된다**.

### 왜 적응적인가

비디오의 통계적 특성은 프레임/영역마다 변한다:
- 평탄한 영역: 0 계수가 거의 대부분
- 복잡한 영역: 다양한 계수값 분포

고정 확률 → 낭비. 적응 확률 → 실제 분포에 수렴.

### 업데이트 공식

```cpp
void update_cdf(uint16_t* cdf, int symbol, int n_symbols) {
    // 학습률 계산 (카운터 기반)
    int count = cdf[n_symbols];  // 마지막 요소 = 카운터
    int rate = 4 + (count < 32 ? count : 32);

    // CDF 업데이트
    for (int i = 0; i < n_symbols; i++) {
        int target = (i < symbol) ? 0 : 32768;
        cdf[i] += (target - cdf[i]) >> rate;
    }

    // 카운터 증가
    if (count < 32)
        cdf[n_symbols] = count + 1;
}
```

- `target[i]` = (i < decoded_symbol) ? 0 : 32768
- `rate` = 작을수록 빠른 적응, 클수록 안정적

### 학습 과정

초기: CDF가 균등 분포에서 시작.

심볼 관측 후: 관측된 심볼의 확률이 증가하는 방향으로 CDF 이동.

```
초기 (균등):   |===A===|===B===|===C===|
A 반복 관측:  |=====A=====|=B=|=C=|
```

## 7.7 컨텍스트 모델링

같은 구문 요소라도 **상황마다 다른 CDF**를 사용한다.

### 예: 파티션 타입

파티션 타입을 읽을 때:
- 위쪽 블록이 SPLIT인가?
- 왼쪽 블록이 SPLIT인가?
- 현재 블록 크기가 무엇인가?

이 조건 조합 → **컨텍스트 인덱스** → 해당 CDF 테이블 선택.

```cpp
int get_partition_context(int row, int col, BlockSize bsize) {
    int above = has_above ? AbovePartition[col] : 0;
    int left = has_left ? LeftPartition[row] : 0;
    int bsCtx = bsize_to_context[bsize];

    return (above + left) * 4 + bsCtx;
}

// 해당 컨텍스트의 CDF로 파티션 타입 읽기
int partition = read_symbol(partition_cdf[ctx], NUM_PARTITION_TYPES);
```

### 왜 컨텍스트가 중요한가

- 파티션이 SPLIT인 영역 옆의 블록도 SPLIT일 확률이 높다.
- 적절한 컨텍스트 → 더 정확한 확률 → 더 적은 비트.

## 7.8 Default CDF 테이블

(스펙 Section 9)

AV1 스펙에는 **200개 이상의 CDF 테이블**이 정의되어 있다.

### 주요 CDF 테이블

| CDF 테이블 | 용도 |
|-----------|------|
| partition_cdf | 파티션 타입 |
| y_mode_cdf | 루마 Intra 예측 모드 |
| uv_mode_cdf | 크로마 Intra 예측 모드 |
| tx_size_cdf | 변환 크기 |
| mv_joint_cdf | MV joint 타입 |
| mv_class_cdf | MV magnitude class |
| coeff_base_cdf | 계수 베이스 레벨 |
| ... | ... |

### CDF 초기화

**Key Frame**:
- 모든 CDF를 default 값(균등 분포 또는 학습된 기본값)으로 리셋.

**Inter Frame**:
- 이전 프레임의 CDF를 시작점으로 사용 가능.
- `disable_cdf_update=0`이면 프레임 디코딩 후 CDF를 참조 버퍼에 저장.

### frame_end_update_cdf

프레임 디코딩 완료 후:
```cpp
if (!disable_cdf_update) {
    // 현재 프레임의 최종 CDF를 참조 버퍼에 저장
    RefCDF[refresh_frame_flags] = CurrentCDF;
}
```

다음 Inter 프레임이 이 참조를 사용하면, 학습된 CDF에서 시작한다.

## 7.9 기타 디코딩 함수

### read_literal

산술 코더 내에서 n비트 리터럴을 읽는다:

```cpp
uint32_t read_literal(int n) {
    uint32_t value = 0;
    for (int i = n - 1; i >= 0; i--) {
        // 균등 확률(50:50)로 1비트 디코딩
        static uint16_t uniform_cdf[2] = {16384, 32768};
        int bit = read_symbol(uniform_cdf, 2);
        value |= (bit << i);
    }
    return value;
}
```

### read_bool

1비트 불리언 값:

```cpp
int read_bool() {
    static uint16_t uniform_cdf[2] = {16384, 32768};
    return read_symbol(uniform_cdf, 2);
}
```

### init_decoder / exit_decoder

```cpp
void init_decoder(uint8_t* data, int size) {
    decoder.val = (data[0] << 8) | data[1];
    decoder.rng = 32768;
    decoder.cnt = 14;  // 16 - 2 (이미 읽은 비트)
}

void exit_decoder() {
    // 남은 비트 버림
    // 정상 종료 시 특정 패턴 확인 가능
}
```

## 7.10 실제 디코딩 예시

파티션 타입을 디코딩한다고 하자:

```
비트스트림: 0xAB 0xCD ...
컨텍스트: 위=SPLIT, 왼=NONE, bsize=32×32

1. 컨텍스트 인덱스 계산 → ctx = 5
2. partition_cdf[ctx] = [8192, 16384, 24576, 28672, 32768]
   (NONE=25%, HORZ=25%, VERT=25%, SPLIT=12.5%, 기타=12.5% 정도)
3. read_symbol(partition_cdf[ctx], 10)
4. val이 속하는 구간 찾기 → SPLIT (심볼 3)
5. CDF 업데이트: SPLIT 확률 약간 증가
6. 결과: PARTITION_SPLIT
```

## 정리

- **엔트로피**는 평균적으로 필요한 비트 수다. `H = -Σ p log₂ p`.
- **산술 코딩**은 분수 비트를 할당해 Shannon 한계에 가깝게 도달한다.
- AV1은 **Multi-Symbol AC**를 사용한다. 이진화 없이 최대 16값 알파벳을 직접 코딩.
- **15-bit 정수 산술**로 구현. CDF[n] = 32768.
- **구간 정규화**로 정밀도를 유지한다.
- **CDF 적응적 업데이트**로 실제 분포에 수렴한다.
- **컨텍스트 모델링**으로 상황별로 다른 CDF를 사용한다.
- AV1 스펙에는 **200+ CDF 테이블**이 정의되어 있다.

## 다음 장 예고

Ch 8에서는 Intra 예측을 다룬다. DC, Paeth, Smooth, 방향 예측의 13가지 모드를 살펴본다.

## 관련 항목

- [Ch 6: 블록 구조](/blog/media/av1/part3-blocks/chapter06-block-structure)
- [Ch 8: Intra 예측](/blog/media/av1/part4-prediction/chapter08-intra-prediction)
- [Ch 9: 변환과 양자화](/blog/media/av1/part3-blocks/chapter09-transform-quantization)
