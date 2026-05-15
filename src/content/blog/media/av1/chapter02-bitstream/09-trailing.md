---
title: "Ch 2.9: Trailing Bits와 Byte Alignment"
date: 2025-10-01T03:09:00
description: "OBU 끝의 trailing_one_bit + trailing_zero_bits, byte_alignment 함수, padding OBU."
tags: [AV1, Video, Codec, ByteAlignment, Padding]
series: "AV1"
seriesOrder: 2.09
draft: false
---

OBU의 *바이트 경계* 를 맞추는 작은 트릭. 사소해 보이지만 *비트 단위 파서가 동기화* 되는 데 필수다.

## 왜 정렬이 필요한가

대부분의 syntax는 *비트 단위* 로 정의된다 (`f(4)`, `uvlc()`, …). 그러나 OBU의 다음 데이터는 *바이트 경계에서 시작* 해야 한다.

이유:
1. **OBU size 필드는 바이트 단위** — payload가 정확히 `size` 바이트 차야 함
2. **산술 코더 바이트 정렬** — 타일 데이터는 *바이트 정렬된 시작점* 을 가정
3. **다음 OBU의 시작도 바이트 정렬** — Low Overhead 포맷에서 헤더 파싱이 일관됨

`f(4)` 같은 비트 단위 디스크립터를 7개 쓰면 *비트 28개* 만 진전한다. 남은 *4비트* 는 어떻게 처리할 것인가? — 답이 **trailing bits**.

## trailing_bits() 함수 (Section 5.3.4)

OBU 페이로드 끝에 호출되는 함수.

```cpp
void trailing_bits() {
    int trailing_one_bit = read_bit();
    assert(trailing_one_bit == 1);             // 항상 1

    while (bit_position % 8 != 0) {
        int trailing_zero_bit = read_bit();
        assert(trailing_zero_bit == 0);        // 항상 0
    }
}
```

규칙:
- *첫 비트는 1* (`trailing_one_bit`)
- 그 후 *바이트 경계까지 0으로 채움* (`trailing_zero_bits`)

### 예시

OBU 본문이 4비트만 의미가 있다고 하자. trailing_bits를 붙이면:

```text
[데이터 4비트][1][0][0][0]   ← 8비트 = 1바이트
              ↑ trailing_one_bit
                 ↑↑↑ trailing_zero_bits (3개)
```

본문 5비트면:

```text
[데이터 5비트][1][0][0]      ← 8비트
```

본문 8비트(이미 정렬)면:

```text
[데이터 8비트][1][0][0][0][0][0][0][0]   ← 16비트 = 2바이트
              └─ 같은 자리에서 시작하지만, *반드시* 1바이트 더 추가
```

즉 **이미 정렬돼도 trailing_bits는 1바이트 추가** 된다. 이게 *항상 trailing_one_bit가 존재* 하는 이유.

## 왜 trailing_one_bit가 1인가

목적은 두 가지.

1. **`obu_size` 결정 보조** — payload 끝을 찾을 때 *마지막 1비트를 찾으면 됨*. 패딩 영역과 데이터 영역의 경계 표시
2. **에러 검출** — 마지막 1비트가 없거나, 1 이후에 1이 또 나오면 *파서가 비트 단위로 빗나간 것*. 디코더가 검출 가능

H.264·HEVC의 *rbsp_trailing_bits* 와 거의 같은 트릭.

## byte_alignment() 함수 (Section 5.3.5)

비슷하지만 다른 함수. *trailing_one_bit 없이* 바이트 경계만 맞춘다.

```cpp
void byte_alignment() {
    while (bit_position % 8 != 0) {
        int zero_bit = read_bit();
        assert(zero_bit == 0);
    }
}
```

차이:
- `trailing_bits()` 는 *OBU의 끝* 에서, 끝을 *표시*
- `byte_alignment()` 는 *OBU 내부* 에서, *다음 구간 시작 전* 에 정렬

### 어디서 byte_alignment 가 호출되나

가장 흔한 자리: **OBU_FRAME 안의 헤더와 타일 사이**.

```cpp
void parse_obu_frame(BitReader& sub) {
    parse_frame_header_obu(sub);

    byte_alignment(sub);            // ← 여기

    parse_tile_group_obu(sub);
}
```

타일 데이터는 *산술 코더의 입력* 이고, 산술 코더는 *바이트 단위 입력* 을 가정. 그래서 *프레임 헤더가 비트 단위로 끝나면* `byte_alignment` 로 정렬한 다음 타일을 시작한다.

## 정렬 규칙 요약

| 디스크립터 사용 시점 | 함수 | trailing_one_bit |
|----------------------|------|-----------------|
| OBU의 *끝* | `trailing_bits()` | **있음 (1)** |
| OBU *내부 구간 사이* | `byte_alignment()` | 없음 |

## OBU_PADDING — 명시적 패딩 OBU

`obu_type = 15` = `OBU_PADDING`. *정렬용 더미 OBU*.

```text
[OBU_PADDING header][size : LEB128][N bytes of arbitrary data]
```

- 페이로드 내용은 *디코더가 무시*
- 보통 *0으로 채운다*
- 용도:
  - 컨테이너 정렬 (예: 4096바이트 블록 경계)
  - 일정한 *비트레이트 페이싱*
  - 향후 다중 작가의 *예약 공간*

대부분의 콘텐츠에는 `OBU_PADDING` 이 *전혀 등장하지 않는다*.

## 실제 OBU 끝의 모양

`OBU_FRAME` 의 마지막 몇 바이트를 보자.

```text
... [타일 데이터 마지막 바이트들] [trailing_bits()]

타일 데이터는 이미 바이트 정렬되어 끝남 (산술 코더가 완료될 때 정렬됨).
그래서 trailing_bits()는 추가 1바이트 = 0x80 (= 1000_0000) 를 붙임.
```

가장 일반적인 끝 패턴: **`0x80`** 한 바이트가 OBU 끝에 보이면 trailing_bits 흔적.

## 파서 구현 패턴

```cpp
void parse_obu(BitReader& reader, OBUType type, uint32_t size) {
    auto sub = reader.subreader(size);

    switch (type) {
        case OBU_FRAME:
            parse_frame_header(sub);
            byte_alignment(sub);            // 헤더와 타일 사이
            parse_tile_group(sub);
            // 타일 끝에서 산술 코더가 자기 정렬
            break;

        case OBU_FRAME_HEADER:
            parse_frame_header(sub);
            // trailing_bits 는 sub 의 끝에서
            break;

        // ...
    }

    // OBU 끝 처리
    trailing_bits_or_consume_padding(sub);  // 남은 비트가 trailing_bits 패턴인지 확인
    reader.skip(size);                       // 어쨌든 size 만큼 진전
}
```

### 핵심 원칙

- *파서가 syntax 보다 적게 읽었더라도* (스펙이 허용하는 경우) *OBU size 만큼은 항상 진전*
- 남은 비트는 *대개 trailing_bits 패턴* — 위반이면 비트스트림 오류

## 검증 도구

`av1-bitstream-analyzer` 같은 도구가 trailing_bits를 검사한다.

```text
$ av1-analyzer sample.obu
OBU FRAME size=156
  frame_header: 23 bits
  byte_alignment: padded 1 bit (0)
  tile_group: 130 bytes
  trailing_bits: 0x80 ✓
```

`trailing_bits: 0x80 ✗` 같은 메시지가 나오면 *비트스트림이 오염* 됐거나 *인코더 버그*.

## 정리

- OBU 끝에는 `trailing_bits()` — **`1` + zero padding**
- `byte_alignment()` 는 OBU 내부에서 *바이트 경계 정렬* — `0` 만
- `OBU_PADDING` 은 *명시적 더미 OBU*, 컨테이너 정렬용
- 마지막 바이트가 `0x80` 이면 *trailing_bits 흔적* (가장 흔한 패턴)
- 모든 *비트 단위 구간 끝* 은 *바이트 정렬* 로 닫힌다 — 산술 코더가 바이트 입력을 가정하기 때문

## 챕터 마무리

여기서 Ch 2 *비트스트림 구조* 가 끝난다. 다음 Ch 3 *Tiles · Superblocks* 부터는 *프레임 내부* 의 공간 구조로 들어간다.

배운 것:
- 7계층 (CVS → … → Coefficient)
- OBU 의 비트 레이아웃과 LEB128
- 파싱 메인 루프
- 4가지 프레임 타입과 show_frame / show_existing_frame
- Sequence Header 가 담는 *전역 설정*
- 코덱 스트링 `av01.X.YYZ.B` 해독
- 디스크립터 `f(n)`, `uvlc()`, `S()`, `L(n)`, …
- Low Overhead vs Annex B
- trailing_bits / byte_alignment

다음 장으로.

## 관련 항목

- [2.0 개요](/blog/media/av1/chapter02-bitstream/00-overview)
- [2.8 Low Overhead vs Length-Delimited](/blog/media/av1/chapter02-bitstream/08-format)
- [Ch 3: Tiles · Superblocks](/blog/media/av1/chapter03-tiles-superblocks)
