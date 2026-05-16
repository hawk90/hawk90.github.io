---
title: "Ch 2.2: OBU(Open Bitstream Unit)"
date: 2025-10-01T03:02:00
description: "OBU 헤더 비트 레이아웃, 8가지 타입, Extension Header, LEB128 크기 필드."
tags: [AV1, Video, Codec, OBU, Bitstream]
series: "AV1"
seriesOrder: 2.02
draft: true
---

OBU(Open Bitstream Unit)는 AV1 비트스트림의 **기본 단위** 다. 모든 데이터 — 시퀀스 설정, 프레임 헤더, 타일 데이터, 메타데이터 — 가 OBU에 담긴다. 이 절에서는 OBU의 *비트 레이아웃* 을 본다.

## OBU 전체 구조

```text
+-----------+-----------+---------------+----------+
| OBU Header| Extension | OBU Size      | Payload  |
| (1 byte)  | Header    | (LEB128, 0-8) | (size B) |
|           | (0-1 B)   |               |          |
+-----------+-----------+---------------+----------+
```

- **OBU Header** — 항상 1바이트
- **Extension Header** — `obu_extension_flag=1` 일 때만 1바이트
- **OBU Size** — `obu_has_size_field=1` 일 때만, LEB128 가변 길이
- **Payload** — OBU 타입별 본문

## OBU Header (Section 5.3.2)

1바이트 안에 6개 필드.

```text
MSB                                     LSB
+---+-------------------+---+---+----+
| F | obu_type (4)      | E | S | R |
+---+-------------------+---+---+----+
  7   6 5 4 3            2   1   0
```

| 필드 | 비트 | 값 | 의미 |
|------|------|-----|------|
| `obu_forbidden_bit` (F) | 1 | 0 | 항상 0. 1이면 스펙 위반 |
| `obu_type` | 4 | 1~15 | OBU 종류 (아래 표) |
| `obu_extension_flag` (E) | 1 | 0/1 | Extension Header 유무 |
| `obu_has_size_field` (S) | 1 | 0/1 | Size 필드 유무 |
| `obu_reserved_1bit` (R) | 1 | 0 | 예약, 0 |

스펙 syntax (4.10 표기로):

```text
obu_header() {
    obu_forbidden_bit        f(1)
    obu_type                 f(4)
    obu_extension_flag       f(1)
    obu_has_size_field       f(1)
    obu_reserved_1bit        f(1)
    if (obu_extension_flag)
        obu_extension_header()
}
```

`obu_has_size_field` 가 0이라면 *컨테이너(MP4/WebM)* 가 길이를 알려준다고 가정한다. Low Overhead format에서는 거의 항상 1.

## OBU 타입 (Section 6.2.2)

`obu_type` 4비트 — 8가지가 정의되어 있다.

| obu_type | 값 | 이름 | 페이로드 |
|----------|----|----|---------|
| `OBU_SEQUENCE_HEADER` | 1 | 시퀀스 헤더 | 프로파일·해상도·도구 활성화·Color Config |
| `OBU_TEMPORAL_DELIMITER` | 2 | 시간 단위 경계 | 비어있음 (size=0) |
| `OBU_FRAME_HEADER` | 3 | 프레임 헤더 | 헤더만, 타일은 별도 OBU |
| `OBU_TILE_GROUP` | 4 | 타일 그룹 | 타일 데이터 |
| `OBU_METADATA` | 5 | 메타데이터 | HDR/타임코드/스케일러빌리티 등 |
| `OBU_FRAME` | 6 | 프레임 (결합) | 헤더 + 타일 데이터 (한 프레임 1타일 그룹) |
| `OBU_REDUNDANT_FRAME_HEADER` | 7 | 중복 헤더 | 에러 복원용 |
| `OBU_TILE_LIST` | 8 | 타일 리스트 | Large Scale Tile Mode 용 |
| 9~14 | — | 예약 | 무시 |
| `OBU_PADDING` | 15 | 패딩 | 바이트 정렬용, 무시 |

### OBU_FRAME vs OBU_FRAME_HEADER + OBU_TILE_GROUP

같은 의미인데 *전송 단위가 다르다*.

- **`OBU_FRAME`** — 헤더 + 타일이 한 OBU. *한 프레임에 타일 그룹이 1개* 일 때 사용. 더 콤팩트.
- **`OBU_FRAME_HEADER` + `OBU_TILE_GROUP` × N** — 한 프레임에 여러 타일 그룹. 네트워크 패킷 분할에 유리.

대부분의 단순 콘텐츠는 `OBU_FRAME` 하나로 충분하다.

## Extension Header (Section 5.3.3)

`obu_extension_flag=1` 이면 추가 1바이트.

```text
+-----------+----------+----------+
| temporal  | spatial  | reserved |
| _id (3)   | _id (2)  | (3)      |
+-----------+----------+----------+
  7 6 5       4 3        2 1 0
```

- `temporal_id` (3비트) — 시간적 스케일러빌리티 레이어 ID
- `spatial_id` (2비트) — 공간적 스케일러빌리티 레이어 ID
- `extension_header_reserved_3bits` — 0

스케일러빌리티를 안 쓰면 Extension Header가 등장하지 않는다 — 대부분의 스트림이 그렇다.

## OBU Size — LEB128

`obu_has_size_field=1` 이면 *페이로드의 바이트 수* 가 **LEB128 (Little Endian Base 128)** 로 인코딩된다.

### LEB128 규칙

- 각 바이트의 *MSB* 는 "계속" 플래그
  - MSB = 1 → 다음 바이트도 같은 정수의 일부
  - MSB = 0 → 마지막 바이트
- 하위 7비트가 데이터, *리틀 엔디안* 으로 결합
- AV1 스펙은 최대 8바이트, 즉 *2^32 − 1* 까지 표현

```text
바이트       MSB  데이터(7비트)
0x83         1    000_0011  → 0x03  (계속)
0x01         0    000_0001  → 0x01  (끝)

결합: 0x03 | (0x01 << 7) = 3 + 128 = 131
```

### LEB128 디코딩 (Section 4.10.5)

```cpp
uint32_t read_leb128(BitReader& reader) {
    uint32_t value = 0;
    for (int i = 0; i < 8; ++i) {
        uint8_t byte = reader.read_bits(8);
        value |= uint32_t(byte & 0x7F) << (7 * i);
        if ((byte & 0x80) == 0) break;
    }
    return value;
}
```

### LEB128 인코딩

```cpp
size_t write_leb128(BitWriter& w, uint32_t v) {
    size_t bytes = 0;
    do {
        uint8_t b = v & 0x7F;
        v >>= 7;
        if (v != 0) b |= 0x80;   // 계속 비트
        w.write_bits(b, 8);
        bytes++;
    } while (v != 0);
    return bytes;
}
```

### 표현 가능 길이

| 바이트 수 | 최대 표현 정수 | 의미 |
|-----------|---------------|------|
| 1 | 127 | 작은 헤더 OBU |
| 2 | 16,383 | 1080p key frame 한 타일 그룹 |
| 3 | 2,097,151 | 4K key frame 정도 |
| 4 | 268,435,455 | 매우 큰 프레임 |
| 5~8 | up to 2^32-1 | 한 OBU의 이론적 상한 |

실무에서는 *3바이트 LEB128 이내* 가 대부분이다.

## 디코더가 OBU를 발견하는 절차

1. 1바이트 읽어 OBU Header 풀기 → `obu_type`, `obu_extension_flag`, `obu_has_size_field` 확보
2. `obu_extension_flag=1` 이면 1바이트 더 읽어 Extension Header
3. `obu_has_size_field=1` 이면 LEB128로 *Payload 크기* `N` 결정. 0이면 컨테이너가 알려준 길이 사용
4. Payload N바이트를 읽어 *해당 OBU 타입의 파서* 로 넘김
5. 반복

```cpp
while (reader.remaining_bytes() > 0) {
    OBUHeader h = parse_obu_header(reader);
    uint32_t size = h.has_size
        ? read_leb128(reader)
        : reader.remaining_bytes();   // 컨테이너 의존

    auto payload = reader.subreader(size);
    dispatch(h, payload);              // 타입별 파서로
    reader.skip(size);
}
```

## 정리

- OBU = **1바이트 헤더 + (선택)1바이트 확장 + (선택)LEB128 크기 + 페이로드**
- `obu_type` 4비트로 8가지 타입 + PADDING(15)
- LEB128은 *바이트당 7비트* 가변 길이 정수. AV1은 최대 8바이트
- Extension Header는 스케일러빌리티 때만 등장
- `obu_has_size_field=0` 이면 컨테이너(MP4/WebM)가 길이를 책임진다

## 다음 절

다음은 **2.3 파싱 흐름** — 디코더 메인 루프가 OBU를 어떻게 분배하는지, 실제 hexdump를 풀어 본다.

## 관련 항목

- [2.1 비트스트림 계층 구조](/blog/media/av1/chapter02-bitstream/01-hierarchy)
- [2.3 OBU 파싱 흐름](/blog/media/av1/chapter02-bitstream/03-parsing)
- [2.8 Low Overhead vs Length-Delimited](/blog/media/av1/chapter02-bitstream/08-format)
