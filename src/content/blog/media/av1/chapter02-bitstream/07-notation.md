---
title: "Ch 2.7: 스펙 표기법과 디스크립터"
date: 2025-10-01T03:07:00
description: "f(n), uvlc(), leb128(), su(n), ns(n), S(), L(n), NS(n) — AV1 스펙을 읽는 데 필요한 디스크립터 전부."
tags: [AV1, Video, Codec, Spec, Descriptors]
series: "AV1"
seriesOrder: 2.07
draft: true
---

AV1 스펙을 한 번이라도 펴 본 사람은 `f(4)`, `uvlc()`, `S()` 같은 *디스크립터* 가 빼곡한 syntax를 봤을 것이다. 이 절은 그 디스크립터들의 의미를 한꺼번에 정리한다.

스펙 Section 4.10 *Parsing process* 가 출처.

## 비트 단순 읽기 함수

가장 흔한 디스크립터들. *산술 코더와 무관* 한 일반 비트 읽기.

### `f(n)` — Fixed-width unsigned

n비트를 *고정 길이 부호 없는 정수* 로 읽는다. MSB first.

```cpp
uint32_t f(int n) {
    uint32_t v = 0;
    for (int i = 0; i < n; ++i)
        v = (v << 1) | read_bit();
    return v;
}
```

예: `f(4)` = 0~15. 가장 일반적인 디스크립터.

### `uvlc()` — Unsigned variable-length code

Exp-Golomb 유사 가변 길이. **leading zero 개수** 로 비트 길이를 결정.

```cpp
uint32_t uvlc() {
    int leadingZeros = 0;
    while (read_bit() == 0) {
        if (++leadingZeros > 32) return /* error */;
    }
    if (leadingZeros >= 32) return UINT32_MAX;
    uint32_t value = read_bits(leadingZeros);
    return value + (1u << leadingZeros) - 1;
}
```

| 코드 | 디코드 값 |
|------|-----------|
| `1` | 0 |
| `010` | 1 |
| `011` | 2 |
| `00100` | 3 |
| `00101` | 4 |
| `00110` | 5 |
| `00111` | 6 |
| `0001000` | 7 |

작은 정수일수록 짧다. Frame size 등 *대부분 작지만 가끔 큰* 값에 유용.

### `le(n)` — Little-endian n-byte unsigned

n바이트 리틀엔디안 정수.

```cpp
uint64_t le(int n) {
    uint64_t v = 0;
    for (int i = 0; i < n; ++i)
        v |= uint64_t(read_bits(8)) << (8 * i);
    return v;
}
```

`le(4)` = 4바이트 정수. 거의 안 쓰이고 *컨테이너와의 인터페이스* 에서 가끔 등장.

### `leb128()` — Little-endian base-128

가변 길이 정수, 각 바이트가 *7비트 데이터 + 1비트 continuation*. (2.2 OBU 참고.)

```cpp
uint32_t leb128() {
    uint32_t v = 0;
    for (int i = 0; i < 8; ++i) {
        uint8_t b = read_bits(8);
        v |= uint32_t(b & 0x7F) << (7 * i);
        if (!(b & 0x80)) return v;
    }
    return v;  // error if MSB still set
}
```

OBU의 `obu_size`, 일부 메타데이터 길이에 쓰인다.

### `su(n)` — Signed unsigned (n-bit signed)

n비트 *부호 있는* 정수. MSB가 부호 비트, 음수는 *2의 보수* 가 아니라 *부호+크기*.

```cpp
int32_t su(int n) {
    int32_t v = f(n);
    int32_t sign_mask = 1 << (n - 1);
    if (v & sign_mask) v = v - (1 << n);   // 2의 보수 변환
    return v;
}
```

스펙 본문은 *2의 보수* 로 풀어 쓰므로 위와 같이 정의된다 (Section 4.10.6). 음수 표현이 흔치 않아 주의가 필요.

### `ns(n)` — Non-symmetric truncated

n이 *2의 거듭제곱이 아닐 때* 사용. 작은 값에 더 짧은 비트.

```cpp
uint32_t ns(int n) {
    int w = FloorLog2(n) + 1;
    int m = (1 << w) - n;
    uint32_t v = read_bits(w - 1);
    if (v < m) return v;
    int extra_bit = read_bit();
    return (v << 1) - m + extra_bit;
}
```

예: `n=5` → 값 0,1,2,3,4 인코딩. 0~2는 2비트, 3~4는 3비트.

`tile_cols`, `tile_rows` 같은 *작은 비균등 정수* 에 쓰인다.

## 산술 코더 (Symbol Decoder)

AV1은 *Daala 산술 코더* — H.264/H.265의 CABAC와 비슷하지만 *non-binary* 도 지원.

### `S()` — Symbol (CDF 기반)

확률 분포 CDF를 받아 *하나의 심볼* 을 디코딩.

```cpp
int S(const cdf_t* cdf, int n_symbols) {
    // n_symbols-1 개의 CDF 엔트리에서 산술 디코더가 한 심볼 선택
    // 동시에 CDF 업데이트 (adaptive)
}
```

스펙 syntax에서는 `mode = S()` 처럼 *CDF 컨텍스트가 함수 위에 명시* 된다.

```text
y_mode  S()   // current y mode CDF table
```

CDF 자체는 *컨텍스트* 에 따라 다른 테이블을 본다 — 인접 블록 정보 등으로 결정.

### `L(n)` — Literal (n-bit equiprobable)

n비트를 *균등 확률* 가정으로 산술 코더에서 읽는다.

```cpp
uint32_t L(int n) {
    uint32_t v = 0;
    for (int i = 0; i < n; ++i)
        v = (v << 1) | read_bool(/* prob = 128, equiprobable */);
    return v;
}
```

평가하기 어려운 빈도의 비트 (예: 일부 사인 비트)에 사용.

### `NS(n)` — Non-symmetric arithmetic

산술 코더 안에서의 *non-symmetric* 코딩. `ns(n)` 의 산술 코더 버전.

```cpp
uint32_t NS(int n) {
    int w = FloorLog2(n) + 1;
    int m = (1 << w) - n;
    uint32_t v = L(w - 1);
    if (v < m) return v;
    int extra_bit = L(1);
    return (v << 1) - m + extra_bit;
}
```

## 함수 표기 — `B(...)`, `T()`

스펙 syntax에 종종 등장.

| 표기 | 의미 |
|------|------|
| `B(...)` | *Boolean* 산술 코더 호출 — 1비트, 확률 인자 명시 |
| `T()` | *Trailing bits* 처리 (2.9에서) |
| `byte_alignment()` | 바이트 경계로 정렬 |

## 핵심 수학 함수 (Section 4.7)

스펙 본문에서 가독성 위해 자주 호출되는 매크로 같은 함수들.

```cpp
// Clip3: 범위 클리핑
int Clip3(int low, int high, int x) {
    return min(high, max(low, x));
}

// Clip1: 비트 깊이 범위 클리핑
int Clip1(int x) {
    return Clip3(0, (1 << BitDepth) - 1, x);
}

// Round2: 부호 있는 반올림 후 시프트
int Round2(int x, int n) {
    return (x + (1 << (n - 1))) >> n;
}

// Round2Signed: 부호 있는 ARM-style 반올림
int Round2Signed(int x, int n) {
    return x < 0 ? -Round2(-x, n) : Round2(x, n);
}

// FloorLog2: 최상위 비트 위치 (x > 0 가정)
int FloorLog2(uint32_t x) {
    return 31 - count_leading_zeros(x);
}

// CeilLog2
int CeilLog2(uint32_t x) {
    return (x <= 1) ? 0 : FloorLog2(x - 1) + 1;
}
```

## syntax 예시 — frame_size()

`frame_size()` syntax (Section 5.9.5) 를 본 디스크립터로 읽으면:

```text
frame_size() {
    if (frame_size_override_flag) {
        frame_width_minus_1   f(n)   // n = frame_width_bits_minus_1 + 1
        frame_height_minus_1  f(n)   // n = frame_height_bits_minus_1 + 1
        FrameWidth  = frame_width_minus_1 + 1
        FrameHeight = frame_height_minus_1 + 1
    } else {
        FrameWidth  = MaxFrameWidth
        FrameHeight = MaxFrameHeight
    }
    superres_params()
    compute_image_size()
}
```

- `f(n)` 으로 width/height 읽기 — Sequence Header가 정한 비트 수만큼
- 나머지는 *계산식*

스펙 syntax는 *디스크립터 + 계산식* 의 혼합이다.

## 컨텍스트 정보 — `[ ]`

`y_mode S()` 처럼 인자가 없어 보이는 함수도 *글로벌 컨텍스트* 를 본다. 스펙 본문에서:

```text
y_mode    S()    // YModeCdf[ above_y_mode ][ left_y_mode ]
```

`YModeCdf` 가 *CDF 테이블의 2차원 배열* — 위/왼쪽 모드를 인덱스로 사용. 이 자체가 *컨텍스트 모델* 의 정의.

## 정리

| 디스크립터 | 분류 | 입출력 |
|------------|------|--------|
| `f(n)` | 단순 | n비트 unsigned, MSB first |
| `uvlc()` | 단순 | Exp-Golomb-like 가변 unsigned |
| `le(n)` | 단순 | n바이트 little-endian unsigned |
| `leb128()` | 단순 | LEB128 가변 unsigned |
| `su(n)` | 단순 | n비트 signed (부호+크기) |
| `ns(n)` | 단순 | non-symmetric (2^k 아닐 때) |
| `S()` | 산술 | CDF 기반 심볼 |
| `L(n)` | 산술 | n비트 균등 확률 리터럴 |
| `NS(n)` | 산술 | non-symmetric 산술 |
| `B(p)` | 산술 | 확률 p로 1비트 |

수학 함수 `Clip3`, `Clip1`, `Round2`, `FloorLog2`, `CeilLog2` 는 *어디서나* 등장하므로 *손에 익혀* 두자.

## 다음 절

다음은 **2.8 Low Overhead vs Length-Delimited 포맷** — 같은 OBU 들이 *파일·컨테이너에 어떻게 패킹되는지*.

## 관련 항목

- [2.6 Profiles · Levels · Tiers](/blog/media/av1/chapter02-bitstream/06-profiles-levels)
- [2.8 Low Overhead vs Length-Delimited](/blog/media/av1/chapter02-bitstream/08-format)
- [Ch 7: 엔트로피 코딩](/blog/media/av1/chapter07-entropy-coding) — 산술 코더 내부
