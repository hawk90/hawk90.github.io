---
title: "Ch 25: Container와 Transport"
date: 2025-10-02T01:00:00
description: "AV1의 컨테이너와 전송 — Length-Delimited, MP4, WebM, AVIF, RTP, Large Scale Tiles."
tags: [AV1, Video, Codec, Container, MP4, WebM, AVIF, RTP]
series: "AV1"
seriesOrder: 25
draft: false
---

AV1 비트스트림은 OBU(Open Bitstream Unit)의 연속이다. 하지만 실제 파일이나 네트워크 전송에서는 **컨테이너 포맷**이 필요하다. 이 장에서는 AV1이 다양한 컨테이너와 전송 프로토콜에 어떻게 패키징되는지 살펴본다.

```
[AV1 OBU Stream] ─┬─→ [Length-Delimited] ─→ raw .obu 파일
                  ├─→ [ISOBMFF/MP4]      ─→ .mp4, .m4v
                  ├─→ [WebM/Matroska]    ─→ .webm, .mkv
                  ├─→ [AVIF/HEIF]        ─→ .avif (이미지)
                  └─→ [RTP Payload]      ─→ 실시간 스트리밍
```

---

## 25.1 Low Overhead vs Length-Delimited

AV1 스펙은 두 가지 비트스트림 포맷을 정의한다.

### Low Overhead Bitstream Format

**Low Overhead 포맷**은 OBU 자체만으로 구성된다. 각 OBU의 `obu_has_size_field`가 1이면 OBU 내부에 크기 정보가 포함된다.

```
┌─────────────────────────────────────────────────────┐
│                  Low Overhead Format                 │
├─────────────────────────────────────────────────────┤
│ OBU₁(with size) │ OBU₂(with size) │ OBU₃(with size) │
└─────────────────────────────────────────────────────┘

OBU 구조:
┌───────────────────────────────────────┐
│ obu_header (1-2 bytes)                │
│   obu_type (4 bits)                   │
│   obu_extension_flag (1 bit)          │
│   obu_has_size_field (1 bit) = 1      │
│   [extension header if flag=1]        │
├───────────────────────────────────────┤
│ obu_size (leb128, variable length)    │
├───────────────────────────────────────┤
│ obu_payload (obu_size bytes)          │
└───────────────────────────────────────┘
```

이 포맷은 **ISOBMFF, WebM** 등 컨테이너 내부에서 사용된다.

### Length-Delimited Bitstream Format (Annex B)

**Length-Delimited 포맷**(Annex B)은 Temporal Unit 단위로 길이를 명시한다. 파일 저장이나 간단한 스트리밍에 적합하다.

```
┌─────────────────────────────────────────────────────────┐
│              Length-Delimited Format                     │
├─────────────────────────────────────────────────────────┤
│ temporal_unit_size₁(leb128) │ temporal_unit₁            │
├─────────────────────────────────────────────────────────┤
│ temporal_unit_size₂(leb128) │ temporal_unit₂            │
├─────────────────────────────────────────────────────────┤
│ temporal_unit_size₃(leb128) │ temporal_unit₃            │
└─────────────────────────────────────────────────────────┘

각 Temporal Unit 내부:
┌─────────────────────────────────────────────────────────┐
│ frame_unit_size₁(leb128) │ frame_unit₁                  │
├─────────────────────────────────────────────────────────┤
│ frame_unit_size₂(leb128) │ frame_unit₂                  │
└─────────────────────────────────────────────────────────┘

각 Frame Unit 내부:
┌─────────────────────────────────────────────────────────┐
│ obu₁(with size) │ obu₂(with size) │ ...                 │
└─────────────────────────────────────────────────────────┘
```

#### Temporal Unit과 Frame Unit

- **Temporal Unit**: 같은 presentation time을 공유하는 Frame Unit들의 집합
- **Frame Unit**: 하나의 Frame OBU와 관련 OBU들 (Frame Header, Tile Group 등)

```cpp
// Length-Delimited 파싱
struct LengthDelimitedParser {
    bool parse_bitstream(BitReader& reader) {
        while (!reader.eof()) {
            // Temporal Unit 크기 읽기
            uint64_t tu_size = reader.read_leb128();
            uint64_t tu_end = reader.position() + tu_size;

            while (reader.position() < tu_end) {
                // Frame Unit 크기 읽기
                uint64_t fu_size = reader.read_leb128();
                uint64_t fu_end = reader.position() + fu_size;

                while (reader.position() < fu_end) {
                    // OBU 파싱
                    parse_obu(reader);
                }
            }
        }
        return true;
    }
};
```

### leb128 인코딩

크기 필드는 **LEB128**(Little Endian Base 128) 방식으로 인코딩된다.

```
LEB128 인코딩 규칙:
- 각 바이트의 MSB(bit 7)가 continuation flag
- bit 7 = 1: 다음 바이트가 더 있음
- bit 7 = 0: 마지막 바이트
- bit 0-6: 실제 데이터 (7비트씩)

예: 값 300 = 0x12C
- 300 = 0b100101100
- 바이트 1: 0b10101100 = 0xAC (bit7=1, 값=44)
- 바이트 2: 0b00000010 = 0x02 (bit7=0, 값=2)
- 결과: 44 + (2 << 7) = 44 + 256 = 300
```

```cpp
// LEB128 읽기
uint64_t read_leb128(BitReader& reader) {
    uint64_t value = 0;
    for (int i = 0; i < 8; i++) {
        uint8_t byte = reader.read_bits(8);
        value |= (uint64_t)(byte & 0x7F) << (i * 7);
        if ((byte & 0x80) == 0) break;
    }
    return value;
}

// LEB128 쓰기
void write_leb128(BitWriter& writer, uint64_t value) {
    do {
        uint8_t byte = value & 0x7F;
        value >>= 7;
        if (value != 0) byte |= 0x80;
        writer.write_bits(8, byte);
    } while (value != 0);
}
```

### 두 포맷 비교

| 특성 | Low Overhead | Length-Delimited |
|------|--------------|------------------|
| 오버헤드 | 최소 | TU/FU 크기 추가 |
| Random Access | 어려움 | TU 단위로 가능 |
| 에러 복구 | 어려움 | TU 단위로 재동기화 |
| 사용처 | 컨테이너 내부 | 파일, 단순 스트리밍 |
| 파일 확장자 | 없음 (컨테이너 사용) | .obu |

---

## 25.2 ISOBMFF (MP4)

**ISOBMFF**(ISO Base Media File Format)는 가장 널리 사용되는 컨테이너다. MP4, M4V, MOV 등이 이 포맷을 기반으로 한다.

### AV1 in MP4 구조

```
MP4 파일 구조 (AV1 포함):
┌──────────────────────────────────────────────────┐
│ ftyp (File Type Box)                             │
│   major_brand = 'av01' 또는 'isom'               │
│   compatible_brands = ['av01', 'iso2', ...]      │
├──────────────────────────────────────────────────┤
│ moov (Movie Box)                                 │
│ ├─ mvhd (Movie Header)                           │
│ ├─ trak (Track Box) - Video                      │
│ │  ├─ tkhd (Track Header)                        │
│ │  └─ mdia (Media Box)                           │
│ │     ├─ mdhd (Media Header)                     │
│ │     ├─ hdlr (Handler Reference) = 'vide'       │
│ │     └─ minf (Media Information)                │
│ │        └─ stbl (Sample Table)                  │
│ │           ├─ stsd (Sample Description)         │
│ │           │  └─ av01 (AV1 Sample Entry)        │
│ │           │     └─ av1C (AV1 Configuration)    │
│ │           ├─ stts (Time to Sample)             │
│ │           ├─ stss (Sync Sample) - Keyframes    │
│ │           ├─ stsz (Sample Size)                │
│ │           └─ stco/co64 (Chunk Offset)          │
│ │  ...                                           │
│ └─ trak (Track Box) - Audio (optional)           │
├──────────────────────────────────────────────────┤
│ mdat (Media Data Box)                            │
│   [AV1 OBU data in Low Overhead format]          │
└──────────────────────────────────────────────────┘
```

### av01 Sample Entry

AV1 비디오 트랙은 **av01** Sample Entry를 사용한다.

```
av01 Sample Entry 구조:
┌─────────────────────────────────────────┐
│ VisualSampleEntry base fields           │
│   width, height                         │
│   compressorname = "AV1 Coding"         │
├─────────────────────────────────────────┤
│ av1C (AV1CodecConfigurationBox)         │
├─────────────────────────────────────────┤
│ optional: colr, pasp, clap, ...         │
└─────────────────────────────────────────┘
```

### av1C Configuration Box

**av1C**는 AV1 디코더 초기화에 필요한 정보를 담는다.

```
av1C 구조 (AV1CodecConfigurationRecord):
┌───────────────────────────────────────────────────┐
│ marker (1) = 1                                    │
│ version (7) = 1                                   │
├───────────────────────────────────────────────────┤
│ seq_profile (3)           │ seq_level_idx_0 (5)   │
├───────────────────────────────────────────────────┤
│ seq_tier_0 (1)                                    │
│ high_bitdepth (1)                                 │
│ twelve_bit (1)                                    │
│ monochrome (1)                                    │
│ chroma_subsampling_x (1)                          │
│ chroma_subsampling_y (1)                          │
│ chroma_sample_position (2)                        │
├───────────────────────────────────────────────────┤
│ reserved (3) = 0                                  │
│ initial_presentation_delay_present (1)           │
│ initial_presentation_delay_minus_one (4) OR      │
│ reserved (4) = 0                                  │
├───────────────────────────────────────────────────┤
│ configOBUs[] (variable)                           │
│   - Sequence Header OBU                           │
│   - [optional Metadata OBUs]                      │
└───────────────────────────────────────────────────┘
```

```cpp
struct AV1CodecConfigurationRecord {
    uint8_t marker : 1;           // always 1
    uint8_t version : 7;          // always 1
    uint8_t seq_profile : 3;
    uint8_t seq_level_idx_0 : 5;
    uint8_t seq_tier_0 : 1;
    uint8_t high_bitdepth : 1;
    uint8_t twelve_bit : 1;
    uint8_t monochrome : 1;
    uint8_t chroma_subsampling_x : 1;
    uint8_t chroma_subsampling_y : 1;
    uint8_t chroma_sample_position : 2;
    uint8_t reserved1 : 3;
    uint8_t initial_presentation_delay_present : 1;
    uint8_t initial_presentation_delay_minus_one : 4;
    std::vector<uint8_t> configOBUs;  // Sequence Header 등
};

// av1C 파싱
AV1CodecConfigurationRecord parse_av1C(const uint8_t* data, size_t size) {
    AV1CodecConfigurationRecord config;
    BitReader reader(data, size);

    config.marker = reader.read_bits(1);
    config.version = reader.read_bits(7);
    config.seq_profile = reader.read_bits(3);
    config.seq_level_idx_0 = reader.read_bits(5);
    config.seq_tier_0 = reader.read_bits(1);
    config.high_bitdepth = reader.read_bits(1);
    config.twelve_bit = reader.read_bits(1);
    config.monochrome = reader.read_bits(1);
    config.chroma_subsampling_x = reader.read_bits(1);
    config.chroma_subsampling_y = reader.read_bits(1);
    config.chroma_sample_position = reader.read_bits(2);
    config.reserved1 = reader.read_bits(3);
    config.initial_presentation_delay_present = reader.read_bits(1);
    config.initial_presentation_delay_minus_one = reader.read_bits(4);

    // 나머지는 configOBUs
    size_t remaining = size - 4;
    config.configOBUs.resize(remaining);
    reader.read_bytes(config.configOBUs.data(), remaining);

    return config;
}
```

### AV1 Codec String

MIME 타입과 Codec String 형식:

```
MIME Type: video/mp4; codecs="av01.P.LLT.DD"

P   = seq_profile (0, 1, 2)
LL  = seq_level_idx (2자리, 00-31)
T   = seq_tier (M=Main, H=High)
DD  = bit_depth (08, 10, 12)

선택적 추가 필드:
.M  = monochrome (0 or 1)
.CCC = chroma_subsampling (3자리: 110, 100, 000 등)
.c  = chroma_sample_position (0, 1, 2)
.C  = color_primaries
.T  = transfer_characteristics
.M  = matrix_coefficients
.F  = video_full_range_flag
```

예시:
```
av01.0.04M.08     - Profile 0, Level 4.0 Main, 8-bit
av01.0.08M.10     - Profile 0, Level 4.0 Main, 10-bit
av01.1.13H.10     - Profile 1, Level 5.1 High, 10-bit
av01.2.19H.12     - Profile 2, Level 6.3 High, 12-bit

전체 형식:
av01.0.08M.10.0.110.01.01.01.0
```

### Sample과 OBU 매핑

MP4에서 각 **sample**은 하나의 Temporal Unit에 해당한다.

```
Sample 내용 (Low Overhead Format):
┌───────────────────────────────────────────────────┐
│ Temporal Delimiter OBU (optional)                 │
├───────────────────────────────────────────────────┤
│ Frame Header OBU (optional, show_existing_frame)  │
├───────────────────────────────────────────────────┤
│ Frame OBU (또는 Tile Group OBU들)                 │
├───────────────────────────────────────────────────┤
│ Padding OBU (optional)                            │
└───────────────────────────────────────────────────┘

주의:
- Sequence Header는 av1C에 저장 (sample에 중복 가능)
- Metadata OBU는 av1C에 저장 또는 sample에 포함
- obu_has_size_field = 1 필수
```

---

## 25.3 WebM (Matroska)

**WebM**은 Matroska 컨테이너의 웹용 프로파일이다. VP8, VP9, AV1을 지원한다.

### Matroska 구조

```
Matroska/WebM 구조:
┌────────────────────────────────────────────────────┐
│ EBML Header                                        │
│   DocType = "webm" 또는 "matroska"                 │
├────────────────────────────────────────────────────┤
│ Segment                                            │
│ ├─ SeekHead (optional, index)                      │
│ ├─ Info (segment information)                      │
│ ├─ Tracks                                          │
│ │  └─ TrackEntry (Video)                           │
│ │     ├─ TrackNumber                               │
│ │     ├─ TrackType = 1 (video)                     │
│ │     ├─ CodecID = "V_AV1"                         │
│ │     ├─ CodecPrivate = [av1C data]                │
│ │     └─ Video                                     │
│ │        ├─ PixelWidth, PixelHeight                │
│ │        └─ Colour (optional)                      │
│ ├─ Chapters (optional)                             │
│ ├─ Cues (seek index, optional)                     │
│ └─ Cluster (frame data)                            │
│    ├─ Timestamp                                    │
│    └─ SimpleBlock / BlockGroup                     │
│       └─ Block (AV1 frame data)                    │
└────────────────────────────────────────────────────┘
```

### CodecID와 CodecPrivate

```
AV1 in WebM:
- CodecID: "V_AV1"
- CodecPrivate: av1C와 동일한 AV1CodecConfigurationRecord
  (단, Box header 제외, 데이터만)

CodecPrivate 내용:
┌───────────────────────────────────────┐
│ AV1CodecConfigurationRecord (4 bytes) │
│ configOBUs[] (Sequence Header 등)     │
└───────────────────────────────────────┘
```

### Block 데이터

각 Block은 Low Overhead 포맷의 OBU 시퀀스를 포함한다.

```
Block 구조:
┌──────────────────────────────────────────┐
│ Track Number (EBML variable int)         │
│ Relative Timestamp (16-bit signed)       │
│ Flags (keyframe, invisible, etc.)        │
├──────────────────────────────────────────┤
│ Frame Data:                              │
│   OBU₁ (with size) │ OBU₂ │ ...          │
└──────────────────────────────────────────┘

SimpleBlock flags (1 byte):
  bit 7: Keyframe
  bit 3: Invisible
  bit 1-2: Lacing
  bit 0: Discardable
```

```cpp
// WebM AV1 Block 파싱
struct WebMBlock {
    uint64_t track_number;
    int16_t relative_timestamp;
    bool keyframe;
    bool invisible;
    bool discardable;
    std::vector<uint8_t> frame_data;
};

WebMBlock parse_simple_block(const uint8_t* data, size_t size) {
    WebMBlock block;
    EBMLReader reader(data, size);

    block.track_number = reader.read_vint();
    block.relative_timestamp = reader.read_int16();

    uint8_t flags = reader.read_byte();
    block.keyframe = (flags >> 7) & 1;
    block.invisible = (flags >> 3) & 1;
    block.discardable = flags & 1;

    size_t data_size = size - reader.position();
    block.frame_data.resize(data_size);
    reader.read_bytes(block.frame_data.data(), data_size);

    return block;
}
```

### WebM vs MP4 비교

| 특성 | WebM (Matroska) | MP4 (ISOBMFF) |
|------|-----------------|---------------|
| 라이선스 | 로열티 프리 | 로열티 프리 |
| 브라우저 지원 | Chrome, Firefox, Edge | 모든 브라우저 |
| 스트리밍 | HLS/DASH 제한적 | HLS/DASH 완벽 |
| 메타데이터 | 풍부 (챕터, 자막 등) | 풍부 |
| 파일 크기 | EBML 오버헤드 | 약간 작음 |
| 도구 지원 | ffmpeg, mkvtoolnix | 광범위 |

---

## 25.4 AVIF

**AVIF**(AV1 Image File Format)는 AV1 Intra-Only 프레임을 HEIF 컨테이너에 담는 이미지 포맷이다.

### AVIF 구조

```
AVIF 파일 구조:
┌────────────────────────────────────────────────────┐
│ ftyp (File Type Box)                               │
│   major_brand = 'avif' 또는 'avis' (sequence)      │
│   compatible_brands = ['avif', 'mif1', 'miaf', ...]│
├────────────────────────────────────────────────────┤
│ meta (Meta Box)                                    │
│ ├─ hdlr (Handler) = 'pict'                         │
│ ├─ pitm (Primary Item)                             │
│ ├─ iloc (Item Location)                            │
│ ├─ iinf (Item Info)                                │
│ │  └─ infe (Item Info Entry)                       │
│ │     item_type = 'av01'                           │
│ ├─ iprp (Item Properties)                          │
│ │  ├─ ipco (Property Container)                    │
│ │  │  ├─ av1C (AV1 Configuration)                  │
│ │  │  ├─ ispe (Image Spatial Extents)              │
│ │  │  ├─ pixi (Pixel Information)                  │
│ │  │  ├─ colr (Color Information)                  │
│ │  │  └─ ...                                       │
│ │  └─ ipma (Property Association)                  │
│ └─ iref (Item Reference, optional)                 │
├────────────────────────────────────────────────────┤
│ mdat (Media Data Box)                              │
│   [AV1 Intra-Only Frame OBUs]                      │
└────────────────────────────────────────────────────┘
```

### still_picture 플래그

AVIF는 AV1 스펙의 **still_picture** 플래그를 사용한다.

```
Sequence Header에서:
- still_picture = 1: 이 시퀀스는 단일 정지 화상
- reduced_still_picture_header = 1: 간소화된 헤더

간소화 헤더 (reduced_still_picture_header = 1):
- timing_info_present_flag = 0
- initial_display_delay_present_flag = 0
- operating_points_cnt_minus_1 = 0
- decoder_model_info_present_flag = 0
- display_model_info_present_flag = 0
- color_config.color_range = 1 (Full range)
```

```cpp
// AVIF용 Sequence Header 생성
void create_avif_sequence_header(AV1Encoder& encoder) {
    encoder.set_still_picture(true);
    encoder.set_reduced_still_picture_header(true);
    encoder.set_frame_type(KEY_FRAME);
    encoder.set_show_frame(true);

    // Intra-Only 설정
    encoder.enable_intra_only(true);
    encoder.disable_inter_prediction(true);
}
```

### AVIF 특징

```
AVIF의 장점:
┌─────────────────────────────────────────────────────┐
│ 1. 높은 압축 효율                                    │
│    - JPEG 대비 50% 이상 용량 절감                    │
│    - WebP 대비 20-30% 용량 절감                      │
├─────────────────────────────────────────────────────┤
│ 2. 10/12비트 HDR 지원                               │
│    - PQ, HLG 전달 함수                              │
│    - BT.2020 색역                                   │
├─────────────────────────────────────────────────────┤
│ 3. 알파 채널 지원                                    │
│    - 별도 alpha item 또는 auxiliary image           │
├─────────────────────────────────────────────────────┤
│ 4. 다중 이미지                                       │
│    - 이미지 시퀀스 (avis)                            │
│    - 썸네일, 대체 해상도                             │
├─────────────────────────────────────────────────────┤
│ 5. 로열티 프리                                       │
│    - AV1과 동일한 라이선스                           │
└─────────────────────────────────────────────────────┘
```

### AVIF 이미지 시퀀스

애니메이션을 위한 **avis**(AVIF Sequence) 브랜드:

```
AVIF Sequence 구조:
┌────────────────────────────────────────────────────┐
│ ftyp                                               │
│   major_brand = 'avis'                             │
├────────────────────────────────────────────────────┤
│ meta                                               │
│   ... (정지 이미지와 유사)                          │
├────────────────────────────────────────────────────┤
│ moov (Movie Box)                                   │
│ ├─ mvhd                                            │
│ └─ trak                                            │
│    └─ mdia                                         │
│       └─ minf                                      │
│          └─ stbl                                   │
│             └─ stsd                                │
│                └─ av01                             │
├────────────────────────────────────────────────────┤
│ mdat (모든 프레임 데이터)                           │
└────────────────────────────────────────────────────┘
```

### AVIF MIME 타입

```
정지 이미지: image/avif
시퀀스:      image/avif-sequence (또는 image/avif)

codecs 파라미터:
image/avif; codecs="av01.0.04M.10"
```

---

## 25.5 RTP Payload

실시간 스트리밍(WebRTC, VoIP 등)을 위해 AV1을 RTP로 전송하는 방법이 **RFC 9430**에 정의되어 있다.

### RTP Payload 구조

```
RTP Packet 구조:
┌────────────────────────────────────────────────────┐
│ RTP Header (12 bytes minimum)                      │
│   V=2, P, X, CC, M, PT, Sequence Number            │
│   Timestamp, SSRC                                  │
│   [CSRC list, extensions]                          │
├────────────────────────────────────────────────────┤
│ AV1 Aggregation Header (1-2 bytes)                 │
├────────────────────────────────────────────────────┤
│ AV1 OBU Element(s)                                 │
│   - OBU Header                                     │
│   - OBU Size (leb128, optional)                    │
│   - OBU Payload                                    │
└────────────────────────────────────────────────────┘
```

### Aggregation Header

```
Aggregation Header (첫 번째 바이트):
┌─────────────────────────────────────────┐
│ Z (1)  │ Y (1)  │ W (2)  │ N (1) │ rsvd │
└─────────────────────────────────────────┘

Z: OBU element의 첫 부분이 이전 패킷에서 시작했는지
Y: OBU element의 마지막 부분이 다음 패킷으로 이어지는지
W: OBU element 개수 정보
   00: 임의 개수, 각 OBU에 크기 필드 있음
   01: 1개
   10: 2개, 첫 OBU에 크기 필드 있음
   11: 3개, 처음 두 OBU에 크기 필드 있음
N: 새 Temporal Unit 시작

W != 0이면 마지막 OBU의 크기 필드 생략 가능
(패킷 끝까지가 마지막 OBU)
```

```cpp
struct AV1AggregationHeader {
    uint8_t Z : 1;      // Fragment start in previous packet
    uint8_t Y : 1;      // Fragment continues in next packet
    uint8_t W : 2;      // OBU count hint
    uint8_t N : 1;      // New temporal unit
    uint8_t reserved : 3;
};

// Aggregation Header 파싱
AV1AggregationHeader parse_aggregation_header(uint8_t byte) {
    AV1AggregationHeader header;
    header.Z = (byte >> 7) & 1;
    header.Y = (byte >> 6) & 1;
    header.W = (byte >> 4) & 3;
    header.N = (byte >> 3) & 1;
    header.reserved = byte & 7;
    return header;
}
```

### Fragmentation

큰 프레임은 여러 RTP 패킷으로 분할된다.

```
프레임 분할 예 (큰 Tile Group):

원본 OBU: [Header][Payload: 5000 bytes]

RTP Packet 1:
┌─────────────────────────────────────────┐
│ Aggregation Header: Z=0, Y=1, W=01, N=1 │
│ OBU Header + Payload[0:1399]            │
└─────────────────────────────────────────┘

RTP Packet 2:
┌─────────────────────────────────────────┐
│ Aggregation Header: Z=1, Y=1, W=01, N=0 │
│ Payload[1400:2799]                      │
└─────────────────────────────────────────┘

RTP Packet 3:
┌─────────────────────────────────────────┐
│ Aggregation Header: Z=1, Y=1, W=01, N=0 │
│ Payload[2800:4199]                      │
└─────────────────────────────────────────┘

RTP Packet 4:
┌─────────────────────────────────────────┐
│ Aggregation Header: Z=1, Y=0, W=01, N=0 │
│ Payload[4200:4999]                      │
└─────────────────────────────────────────┘
```

### Aggregation

작은 OBU들은 하나의 RTP 패킷에 집약할 수 있다.

```
여러 OBU 집약 예:

Temporal Delimiter + Frame Header + Tile Group (작은 타일):

RTP Packet:
┌─────────────────────────────────────────────────────┐
│ Aggregation Header: Z=0, Y=0, W=00, N=1             │
├─────────────────────────────────────────────────────┤
│ OBU Element 1: Temporal Delimiter                   │
│   obu_size(leb128) + obu_header + (no payload)      │
├─────────────────────────────────────────────────────┤
│ OBU Element 2: Frame Header                         │
│   obu_size(leb128) + obu_header + payload           │
├─────────────────────────────────────────────────────┤
│ OBU Element 3: Tile Group                           │
│   obu_size(leb128) + obu_header + payload           │
└─────────────────────────────────────────────────────┘
```

### Dependency Descriptor (DD)

WebRTC에서 SFU(Selective Forwarding Unit) 최적화를 위해 **Dependency Descriptor** RTP 확장이 사용된다.

```
Dependency Descriptor 구조:
┌─────────────────────────────────────────────────────┐
│ mandatory_descriptor_fields                         │
│   start_of_frame (1)                                │
│   end_of_frame (1)                                  │
│   frame_dependency_template_id (6)                  │
│   frame_number (16)                                 │
├─────────────────────────────────────────────────────┤
│ extended_descriptor_fields (optional)               │
│   template_dependency_structure                     │
│   active_decode_targets_bitmask                     │
│   custom_dtis                                       │
│   custom_fdiffs                                     │
│   custom_chains                                     │
└─────────────────────────────────────────────────────┘

frame_dependency_template_id로 미리 정의된
프레임 의존성 패턴을 참조 → SFU가 비트스트림을
파싱하지 않고도 레이어 전환 가능
```

### SDP 협상

```
SDP (Session Description Protocol) 예:

m=video 9 UDP/TLS/RTP/SAVPF 41
a=rtpmap:41 AV1/90000
a=fmtp:41 profile=0;level-idx=5;tier=0
a=extmap:1 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:2 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:3 https://aomediacodec.github.io/av1-rtp-spec/#dependency-descriptor-rtp-header-extension

fmtp 파라미터:
- profile: seq_profile (0, 1, 2)
- level-idx: seq_level_idx (0-31)
- tier: seq_tier (0=Main, 1=High)
```

---

## 25.6 Large Scale Tiles (Annex D)

**Large Scale Tiles**는 매우 큰 해상도(예: 8K, 16K, 360° 비디오)를 효율적으로 처리하기 위한 기능이다. Annex D에 정의되어 있다.

### 기본 개념

```
Large Scale Tiles 시나리오:
┌─────────────────────────────────────────────────────┐
│                                                     │
│    16K×8K (16384×8192) 360° 비디오                  │
│    ┌───┬───┬───┬───┬───┬───┬───┬───┐               │
│    │ T0│ T1│ T2│ T3│ T4│ T5│ T6│ T7│               │
│    ├───┼───┼───┼───┼───┼───┼───┼───┤               │
│    │ T8│ T9│T10│T11│T12│T13│T14│T15│               │
│    └───┴───┴───┴───┴───┴───┴───┴───┘               │
│                                                     │
│    사용자가 보는 영역 (viewport):                   │
│    ┌─────────┐                                      │
│    │ T2│ T3 │  ← 일부 타일만 고해상도로 전송        │
│    │T10│ T11│                                       │
│    └─────────┘                                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Camera Tile 구조

**Camera Tile**은 큰 프레임을 여러 독립 타일로 분할하여 개별 처리한다.

```
Camera Tile 개념:
┌─────────────────────────────────────────────────────┐
│ 물리 카메라 배열 (예: 6대 카메라)                   │
│                                                     │
│   Cam0    Cam1    Cam2                              │
│  ┌────┐  ┌────┐  ┌────┐                             │
│  │    │  │    │  │    │                             │
│  └────┘  └────┘  └────┘                             │
│   Cam3    Cam4    Cam5                              │
│  ┌────┐  ┌────┐  ┌────┐                             │
│  │    │  │    │  │    │                             │
│  └────┘  └────┘  └────┘                             │
│                                                     │
│ → 각 카메라 영역을 독립 인코딩 + 전체 스티칭        │
└─────────────────────────────────────────────────────┘
```

### Large Scale Tiles 비트스트림

```
Large Scale Tile 비트스트림 구조:

Sequence Header:
  use_128x128_superblock = 1 (보통)

Frame:
  tile_cols = 8 (또는 그 이상)
  tile_rows = 2 (또는 그 이상)

┌─────────────────────────────────────────────────────┐
│ Frame Header OBU                                    │
│   frame_width_minus_1 = 16383 (16K)                 │
│   frame_height_minus_1 = 8191 (8K)                  │
│   tile_cols_log2 = 3 (8 columns)                    │
│   tile_rows_log2 = 1 (2 rows)                       │
│   context_update_tile_id = 0                        │
├─────────────────────────────────────────────────────┤
│ Tile List OBU (optional, for random access)         │
│   output_frame_width_in_tiles_minus_1               │
│   output_frame_height_in_tiles_minus_1              │
│   tile_count_minus_1                                │
│   tile_info_entry[]                                 │
├─────────────────────────────────────────────────────┤
│ Tile Group OBU(s)                                   │
│   각 타일 독립 디코딩 가능                          │
└─────────────────────────────────────────────────────┘
```

### Tile List OBU

**Tile List OBU**(obu_type = 8)는 타일의 랜덤 액세스를 지원한다.

```
Tile List OBU 구조:
┌─────────────────────────────────────────────────────┐
│ output_frame_width_in_tiles_minus_1 (8 bits)        │
│ output_frame_height_in_tiles_minus_1 (8 bits)       │
│ tile_count_minus_1 (16 bits)                        │
├─────────────────────────────────────────────────────┤
│ for i in 0..tile_count:                             │
│   anchor_frame_idx (8 bits)                         │
│   anchor_tile_row (8 bits)                          │
│   anchor_tile_col (8 bits)                          │
│   tile_data_size_minus_1 (16 bits)                  │
│   coded_tile_data[tile_data_size]                   │
└─────────────────────────────────────────────────────┘
```

```cpp
struct TileListOBU {
    uint8_t output_frame_width_in_tiles_minus_1;
    uint8_t output_frame_height_in_tiles_minus_1;
    uint16_t tile_count_minus_1;

    struct TileInfoEntry {
        uint8_t anchor_frame_idx;
        uint8_t anchor_tile_row;
        uint8_t anchor_tile_col;
        uint16_t tile_data_size_minus_1;
        std::vector<uint8_t> coded_tile_data;
    };
    std::vector<TileInfoEntry> tiles;
};

// Tile List 파싱
TileListOBU parse_tile_list(BitReader& reader) {
    TileListOBU list;
    list.output_frame_width_in_tiles_minus_1 = reader.read_bits(8);
    list.output_frame_height_in_tiles_minus_1 = reader.read_bits(8);
    list.tile_count_minus_1 = reader.read_bits(16);

    for (int i = 0; i <= list.tile_count_minus_1; i++) {
        TileListOBU::TileInfoEntry entry;
        entry.anchor_frame_idx = reader.read_bits(8);
        entry.anchor_tile_row = reader.read_bits(8);
        entry.anchor_tile_col = reader.read_bits(8);
        entry.tile_data_size_minus_1 = reader.read_bits(16);

        entry.coded_tile_data.resize(entry.tile_data_size_minus_1 + 1);
        reader.read_bytes(entry.coded_tile_data.data(),
                         entry.tile_data_size_minus_1 + 1);

        list.tiles.push_back(entry);
    }
    return list;
}
```

### 360° 비디오 응용

```
360° Viewport Adaptive Streaming:
┌─────────────────────────────────────────────────────┐
│                                                     │
│ 1. 전체 프레임을 다중 타일로 인코딩                 │
│                                                     │
│ 2. 서버에서 타일별로 다중 품질 준비                 │
│    - 고품질 (높은 비트레이트)                       │
│    - 중간 품질                                      │
│    - 저품질 (낮은 비트레이트)                       │
│                                                     │
│ 3. 클라이언트가 현재 viewport 보고                  │
│    - 시선 방향 + FOV 정보                           │
│                                                     │
│ 4. 서버가 적응적 타일 전송                          │
│    - Viewport 내 타일: 고품질                       │
│    - Viewport 주변 타일: 중간 품질                  │
│    - 나머지 타일: 저품질 또는 생략                  │
│                                                     │
│ 5. 클라이언트에서 타일 합성 + 디스플레이            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Large Scale Tiles 장단점

| 장점 | 단점 |
|------|------|
| 타일별 독립 디코딩 | 타일 경계에서 품질 저하 가능 |
| Viewport 적응 스트리밍 | 복잡한 서버/클라이언트 로직 |
| 대역폭 효율 | 타일 분할 오버헤드 |
| 병렬 디코딩 용이 | 타일 간 예측 제한 |

---

## 25.7 컨테이너 선택 가이드

### 사용 사례별 권장

| 사용 사례 | 권장 컨테이너 | 이유 |
|-----------|---------------|------|
| 웹 스트리밍 (HLS/DASH) | MP4 (fMP4) | 광범위한 지원 |
| 웹 브라우저 직접 재생 | WebM 또는 MP4 | 브라우저 호환성 |
| 오프라인 저장 | MP4 또는 MKV | 도구 지원, 메타데이터 |
| 정지 이미지 | AVIF | 최고 압축률 |
| 실시간 통신 (WebRTC) | RTP | 저지연 전송 |
| 360° VR | MP4 + Large Scale | Viewport 적응 |
| 방송 | MP4 (CMAF) | 업계 표준 |

### ffmpeg 예제

```bash
# MP4로 인코딩
ffmpeg -i input.y4m -c:v libaom-av1 -crf 30 -b:v 0 output.mp4

# WebM으로 인코딩
ffmpeg -i input.y4m -c:v libaom-av1 -crf 30 -b:v 0 output.webm

# AVIF 정지 이미지
ffmpeg -i input.png -c:v libaom-av1 -still-picture 1 output.avif

# MP4에서 raw OBU 추출
ffmpeg -i input.mp4 -c:v copy -f obu output.obu

# raw OBU를 MP4로 래핑
ffmpeg -i input.obu -c:v copy output.mp4
```

---

## 정리

- **Low Overhead vs Length-Delimited**: 컨테이너 내부는 Low Overhead, 단독 파일은 Length-Delimited
- **ISOBMFF (MP4)**: av01 Sample Entry + av1C Configuration Box
- **WebM**: V_AV1 CodecID + CodecPrivate (av1C 데이터)
- **AVIF**: still_picture 플래그 + HEIF 컨테이너
- **RTP Payload**: Aggregation Header + OBU Element, RFC 9430
- **Large Scale Tiles**: Tile List OBU, 360° viewport adaptive streaming
- **Codec String**: av01.P.LLT.DD 형식
- **leb128**: 가변 길이 정수 인코딩

---

## 다음 장 예고

Ch 26에서는 **Rate Control**을 다룬다. CBR, VBR, CRF, 2-pass 인코딩 등 비트레이트 제어 기법을 살펴본다.

---

## 관련 항목

- [Ch 2: OBU와 비트스트림](/blog/media/av1/chapter02-obu-bitstream) — OBU 구조
- [Ch 20: Tiles와 병렬 처리](/blog/media/av1/chapter20-tiles-parallel) — 타일 구조
- [Ch 24: Error Resilience](/blog/media/av1/chapter24-error-resilience) — 에러 복구
- [AV1 Bitstream & Decoding Process Specification](https://aomediacodec.github.io/av1-spec/)
- [AV1 Codec ISO Media File Format Binding](https://aomediacodec.github.io/av1-isobmff/)
- [AV1 RTP Payload Format (RFC 9430)](https://www.rfc-editor.org/rfc/rfc9430)
