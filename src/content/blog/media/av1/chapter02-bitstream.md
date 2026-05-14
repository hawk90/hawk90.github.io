---
title: "Ch 2: 비트스트림 구조"
date: 2025-10-01T02:00:00
description: "AV1 비트스트림의 계층 구조 — OBU, Temporal Unit, Frame, Tile의 관계와 파싱 흐름."
tags: [AV1, Video, Codec, Bitstream, OBU]
series: "AV1"
seriesOrder: 2
draft: false
---

AV1 디코더가 가장 먼저 하는 일은 비트스트림을 파싱하는 것이다. 이 장에서는 비트스트림의 구조를 위에서 아래로 훑어본다. 아직 코드는 쓰지 않고, 구조만 이해한다.

## 2.1 비트스트림 계층 구조

### 전체 조감도

AV1 비트스트림은 다음과 같은 계층 구조를 갖는다.

![비트스트림 계층 구조](/images/blog/av1/diagrams/ch02-bitstream-hierarchy.svg)

각 계층은 **OBU(Open Bitstream Unit)**라는 단위로 나뉜다.

### 디코딩 파이프라인 한눈에 보기

![AV1 디코딩 파이프라인](/images/blog/av1/diagrams/ch02-decoding-pipeline.svg)

## 2.2 OBU(Open Bitstream Unit)

### OBU란

OBU는 AV1 비트스트림의 **기본 단위**다. H.264의 NAL Unit과 유사하지만 더 단순하다.

| 특성 | H.264 NAL Unit | AV1 OBU |
|------|----------------|---------|
| 경계 표시 | Start Code (0x000001) | 명시적 크기 필드 |
| 파싱 복잡도 | 높음 (emulation prevention) | 낮음 |
| 확장성 | 제한적 | 유연함 |

### OBU 헤더 구조 (스펙 Section 5.3.2)

OBU 헤더는 1바이트(+ 선택적 확장 1바이트)다.

![OBU 헤더 구조](/images/blog/av1/diagrams/ch02-obu-header.svg)

`extension_flag=1`이면 Extension Header 1바이트가 추가되어 `temporal_id`(3비트), `spatial_id`(2비트), `reserved`(3비트)를 포함한다.

### OBU 타입 목록 (스펙 Section 6.2.2)

| obu_type | 값 | 설명 |
|----------|---|------|
| SEQUENCE_HEADER_OBU | 1 | 시퀀스 전역 설정 |
| TEMPORAL_DELIMITER_OBU | 2 | 시간 단위 경계 표시 |
| FRAME_HEADER_OBU | 3 | 프레임 헤더 (타일 데이터 별도) |
| TILE_GROUP_OBU | 4 | 타일 데이터 |
| METADATA_OBU | 5 | 메타데이터 (HDR, 타임코드 등) |
| FRAME_OBU | 6 | 프레임 헤더 + 타일 데이터 결합 |
| REDUNDANT_FRAME_HEADER_OBU | 7 | 에러 복원용 중복 헤더 |
| TILE_LIST_OBU | 8 | Large Scale Tiles용 |
| PADDING_OBU | 15 | 바이트 정렬용 패딩 |

### OBU 크기 필드: LEB128

`obu_has_size_field=1`이면 OBU 크기가 **LEB128** 형식으로 인코딩된다.

```
LEB128 (Little Endian Base 128):
- 각 바이트의 MSB가 "계속" 플래그
- 하위 7비트가 데이터
- 최대 8바이트 (최대값 ≤ 2^32 - 1)

예시: 0x83 0x01
  0x83 = 1000_0011 → 계속 플래그=1, 데이터=0x03
  0x01 = 0000_0001 → 계속 플래그=0, 데이터=0x01
  결과 = 0x03 | (0x01 << 7) = 3 + 128 = 131
```

```cpp
// LEB128 디코딩 (스펙 Section 4.10.5)
uint32_t read_leb128(BitReader& reader) {
    uint32_t value = 0;
    for (int i = 0; i < 8; ++i) {
        uint8_t byte = reader.read_bits(8);
        value |= (byte & 0x7F) << (7 * i);
        if ((byte & 0x80) == 0) break;
    }
    return value;
}
```

## 2.3 OBU 파싱 예시

### 실제 비트스트림 분석

64×64 Key Frame 비트스트림의 hexdump를 보자.

```
$ xxd sample.obu | head -5
00000000: 0a0b 0000 0024 2900 1008 ...

첫 바이트 0x0A = 0000_1010
  forbidden(1)    = 0      ✓
  obu_type(4)     = 0001   = 1 = SEQUENCE_HEADER_OBU
  extension(1)    = 0      (확장 헤더 없음)
  has_size(1)     = 1      (크기 필드 있음)
  reserved(1)     = 0      ✓

두 번째 바이트 0x0B = LEB128(11)
  → 이 OBU의 payload 크기 = 11 바이트
```

### OBU 파싱 메인 루프

```cpp
// 스펙 Section 5.2 obu_parse()
while (!reader.eof()) {
    OBUHeader header = parse_obu_header(reader);
    uint32_t size = header.has_size ? read_leb128(reader) : remaining;

    switch (header.type) {
        case OBU_SEQUENCE_HEADER:
            parse_sequence_header(reader);
            break;
        case OBU_TEMPORAL_DELIMITER:
            // 새로운 시간 단위 시작
            break;
        case OBU_FRAME:
            parse_frame_header(reader);
            parse_tile_group(reader);
            break;
        case OBU_FRAME_HEADER:
            parse_frame_header(reader);
            break;
        case OBU_TILE_GROUP:
            parse_tile_group(reader);
            break;
        case OBU_METADATA:
            parse_metadata(reader);
            break;
        case OBU_PADDING:
            reader.skip(size);  // 무시
            break;
    }
}
```

## 2.4 Temporal Unit과 Frame

### Temporal Unit

**Temporal Unit**은 하나의 시간 단위다. 보통 하나의 표시 프레임에 대응한다.

```
Temporal Unit
├── TEMPORAL_DELIMITER_OBU (경계 표시)
├── SEQUENCE_HEADER_OBU (필요시)
└── FRAME_OBU 또는
    ├── FRAME_HEADER_OBU
    └── TILE_GROUP_OBU(s)
```

`TEMPORAL_DELIMITER_OBU`는 "여기서부터 새로운 시간 단위"라는 표시다. 크기가 0인 OBU다.

### Frame Types (스펙 Section 6.8.2)

AV1은 네 가지 프레임 타입을 정의한다.

| frame_type | 값 | 설명 |
|------------|---|------|
| KEY_FRAME | 0 | 완전한 독립 프레임, 모든 상태 리셋 |
| INTER_FRAME | 1 | 이전/이후 프레임 참조 |
| INTRA_ONLY_FRAME | 2 | 프레임 내 예측만, 상태 유지 |
| SWITCH_FRAME | 3 | 에러 복구용 특수 프레임 |

### show_frame vs show_existing_frame

두 가지 중요한 플래그가 있다.

**show_frame**:
- 이 프레임을 화면에 출력할 것인가?
- `show_frame=0`: 참조용으로만 디코딩 (ALTREF 등)

**show_existing_frame**:
- 새로 디코딩하지 말고 버퍼에 있는 프레임을 보여줘
- 디코딩 비용 = 0
- Overlay Frame에 사용

```
ALTREF 프레임 처리 흐름:

디코딩 순서:  F0 → F1 → F2 → ALTREF → F3 → F4 → OVERLAY
                              ↓                    ↓
                        show_frame=0         show_existing_frame=1
                        (보이지 않음)          (ALTREF를 표시)

표시 순서:    F0 → F1 → F2 → F3 → F4 → OVERLAY(=ALTREF)
```

## 2.5 Sequence Header 개요

### Sequence Header란

**Sequence Header**는 전체 비디오 시퀀스에 적용되는 전역 설정이다. 프레임 단위가 아닌 시퀀스 단위의 정보를 담는다.

```
Sequence Header 핵심 필드:
├── seq_profile (0=Main, 1=High, 2=Professional)
├── max_frame_width, max_frame_height
├── use_128x128_superblock
├── 도구 활성화 플래그들
│   ├── enable_cdef
│   ├── enable_restoration
│   ├── enable_warped_motion
│   └── ...
├── Color Config
│   ├── bit_depth (8/10/12)
│   ├── subsampling (4:2:0/4:2:2/4:4:4)
│   └── color_primaries, transfer, matrix
└── Timing Info (선택적)
```

Sequence Header의 상세 내용은 Ch 3에서 다룬다.

## 2.6 Profiles, Levels, Tiers

### Profiles — 어떤 도구를 쓸 수 있는가

| Profile | seq_profile | 비트 깊이 | 크로마 | 용도 |
|---------|-------------|-----------|--------|------|
| Main | 0 | 8, 10 | 4:0:0, 4:2:0 | 일반 스트리밍 |
| High | 1 | 8, 10 | + 4:4:4 | 스크린 콘텐츠 |
| Professional | 2 | 8, 10, 12 | + 4:2:2 | 방송, 영화 |

### Levels — 어떤 해상도/비트레이트까지

```
Level   MaxPicSize    MaxHSize   MaxVSize   Example
──────────────────────────────────────────────────────
2.0     147,456       2048       1152       426×240
2.1     278,784       2816       1584       640×360
3.0     665,856       4352       2448       854×480
3.1     1,065,024     5504       3096       1280×720
4.0     2,359,296     6144       3456       1920×1080
4.1     2,359,296     6144       3456       1920×1080
5.0     8,912,896     8192       4352       2560×1440
5.1     8,912,896     8192       4352       3840×2160
5.2     8,912,896     8192       4352       3840×2160
5.3     8,912,896     8192       4352       3840×2160
6.0     35,651,584    16384      8704       7680×4320
6.1     35,651,584    16384      8704       7680×4320
6.2     35,651,584    16384      8704       7680×4320
6.3     35,651,584    16384      8704       7680×4320
```

### Tiers — 비트레이트 등급

| Tier | 설명 |
|------|------|
| Main | 일반 애플리케이션 |
| High | 더 높은 peak bitrate 허용 |

### 코덱 스트링 읽는 법

```
형식: av01.<Profile>.<Level><Tier>.<BitDepth>

예시:
av01.0.04M.10 = Main Profile, Level 3.0, Main Tier, 10-bit
av01.2.19H.12 = Professional Profile, Level 6.3, High Tier, 12-bit
```

## 2.7 스펙 표기법과 디스크립터

AV1 스펙을 읽기 위해 알아야 할 표기법이다.

### 비트 읽기 함수 (스펙 Section 4.10)

| 함수 | 설명 | 예시 |
|------|------|------|
| `f(n)` | 고정 n비트 읽기 (unsigned, MSB first) | `f(4)` = 4비트 |
| `uvlc()` | 가변 길이 코드 (Exp-Golomb 유사) | |
| `le(n)` | 리틀엔디안 n바이트 정수 | `le(4)` = 4바이트 |
| `leb128()` | LEB128 가변 길이 정수 | |
| `su(n)` | 부호 있는 n비트 | MSB가 부호 |
| `ns(n)` | Non-symmetric 코딩 | 2의 거듭제곱이 아닐 때 |

### 산술 코더 내부 함수

| 함수 | 설명 |
|------|------|
| `S()` | 심볼 디코더 호출 (CDF 기반) |
| `L(n)` | 리터럴 n비트 (균등 확률) |
| `NS(n)` | 산술 코더 내부 비대칭 코딩 |

### 핵심 수학 함수 (스펙 Section 4.7)

```cpp
// Clip3: 범위 클리핑
Clip3(low, high, x) = min(high, max(low, x))

// Clip1: 비트 깊이 범위 클리핑
Clip1(x) = Clip3(0, (1 << BitDepth) - 1, x)

// Round2: 반올림 후 시프트
Round2(x, n) = (x + (1 << (n - 1))) >> n

// FloorLog2: 최상위 비트 위치
FloorLog2(x) = 31 - count_leading_zeros(x)

// CeilLog2: 천장 로그2
CeilLog2(x) = (x > 0) ? FloorLog2(x - 1) + 1 : 0
```

## 2.8 Low Overhead vs Length-Delimited 포맷

AV1 비트스트림은 두 가지 포맷으로 저장될 수 있다.

### Low Overhead Format

```
[OBU1][OBU2][OBU3]...

- OBU가 직렬로 나열
- obu_has_size_field로 크기 결정
- .obu, .av1 파일
```

### Length-Delimited Format (Annex B)

```
[TU_size][OBU1_size][OBU1][OBU2_size][OBU2]...

- Temporal Unit 레벨에서도 크기 필드 추가
- MP4, WebM 컨테이너에서 사용
```

## 2.9 Trailing Bits와 Byte Alignment

### trailing_bits()

OBU 끝에서 바이트 경계를 맞추는 패딩이다.

```
trailing_bits():
  trailing_one_bit = 1  // 1비트
  while (not byte aligned):
    trailing_zero_bit = 0
```

### byte_alignment()

현재 비트 위치를 바이트 경계로 정렬한다.

```cpp
void byte_alignment() {
    while (bit_position % 8 != 0) {
        read_bit();  // 버림
    }
}
```

## 정리

- **OBU**는 AV1 비트스트림의 기본 단위다
- OBU 헤더는 1바이트(+ 선택적 확장 1바이트)로 단순하다
- **LEB128**은 가변 길이 정수 인코딩이다
- **Temporal Unit**은 하나의 시간 단위(표시 프레임)에 대응한다
- **Frame Types**: KEY_FRAME, INTER_FRAME, INTRA_ONLY_FRAME, SWITCH_FRAME
- **show_existing_frame**으로 버퍼의 프레임을 재사용할 수 있다
- **Profiles**: Main(스트리밍), High(4:4:4), Professional(12-bit)
- 스펙의 `f(n)`, `uvlc()`, `leb128()` 표기법을 이해해야 한다

## 다음 장 예고

Ch 3에서는 Sequence Header를 상세히 다룬다. 프로파일, 도구 활성화 플래그, Color Config의 의미를 파악하고 실제 파싱을 시작한다.

## 관련 항목

- [Ch 1: AV1의 역사와 도구 체인](/blog/media/av1/chapter01-history-tools)
- [Ch 3: 타일과 슈퍼블록](/blog/media/av1/chapter03-tiles-superblocks)
