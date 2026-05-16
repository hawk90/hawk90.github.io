---
title: "Ch 2.3: OBU 파싱 흐름"
date: 2025-10-01T03:03:00
description: "디코더 메인 루프가 OBU를 어떻게 분배하는지 — 실제 hexdump 파싱과 obu_parse() 의사 코드."
tags: [AV1, Video, Codec, OBU, Parser]
series: "AV1"
seriesOrder: 2.03
draft: true
---

이제 OBU의 비트 레이아웃을 알았으니 디코더가 *연속된 바이트 스트림* 을 받아 어떻게 분배하는지 본다.

## 메인 루프 — 의사 코드

스펙 Section 5.2 *general OBU syntax* 의 의도를 정리하면:

```cpp
// 결과: 디코더 상태가 점진적으로 채워진다.
void decode_bitstream(BitReader& reader) {
    while (reader.remaining_bytes() > 0) {
        // 1) 헤더
        OBUHeader header = parse_obu_header(reader);

        // 2) 크기
        uint32_t size = header.has_size_field
            ? read_leb128(reader)
            : reader.remaining_bytes();

        // 3) 페이로드를 서브 리더로 떼어 내고 분배
        auto sub = reader.subreader(size);

        switch (header.type) {
            case OBU_SEQUENCE_HEADER:
                state.seq = parse_sequence_header(sub);
                break;
            case OBU_TEMPORAL_DELIMITER:
                // 페이로드 없음 — 새 TU 시작 신호
                state.seen_frame_header_in_tu = false;
                break;
            case OBU_FRAME_HEADER:
                state.frame = parse_frame_header(sub, state.seq);
                state.seen_frame_header_in_tu = true;
                break;
            case OBU_TILE_GROUP:
                parse_tile_group(sub, state.frame);
                break;
            case OBU_FRAME:
                state.frame = parse_frame_header(sub, state.seq);
                parse_tile_group(sub, state.frame);
                state.seen_frame_header_in_tu = true;
                break;
            case OBU_METADATA:
                parse_metadata(sub);
                break;
            case OBU_PADDING:
                /* skip */
                break;
            case OBU_TILE_LIST:
                parse_tile_list(sub);
                break;
            case OBU_REDUNDANT_FRAME_HEADER:
                // 이미 본 frame_header와 *완전 동일* 해야 함
                verify_redundant(state.frame, sub);
                break;
            default:
                /* reserved 9~14: 무시 */
                break;
        }

        reader.skip(size);
    }
}
```

핵심은 두 가지.

1. **헤더는 항상 1바이트** — 어디서 OBU가 시작되는지 알면 `obu_type` 을 즉시 알 수 있다
2. **페이로드는 size로 잘라낸다** — 파서가 "내가 쓸 만큼만 읽고" 나머지는 *남기는 게 허용된다*. 디코더는 항상 `size` 만큼 진전한다.

## 실제 hexdump 파싱

64×64 Key Frame 비트스트림의 시작 부분을 읽어 보자.

```text
$ xxd sample.obu | head -3
00000000: 0a0b 0000 0024 2900 1008 ...
```

### 첫 OBU

```text
바이트 0x0A = 0000_1010
  F  (1)  = 0
  type (4)= 0001 = 1  = OBU_SEQUENCE_HEADER
  E  (1)  = 0
  S  (1)  = 1                ← size field 있음
  R  (1)  = 0
```

다음 바이트 `0x0B` = LEB128(11). 즉 *Sequence Header payload는 11바이트*.

→ 다음 11바이트(`0x00 0x00 0x00 0x24 0x29 0x00 0x10 0x08 ...`)가 Sequence Header.

### 두 번째 OBU

11바이트 건너뛴 뒤 첫 바이트를 다시 읽는다. (예시 데이터는 생략)

```text
다음 OBU 시작
바이트 0x12 = 0001_0010 (가정)
  type = 0010 = 2 = OBU_TEMPORAL_DELIMITER
  E = 0, S = 1, R = 0
```

`OBU_TEMPORAL_DELIMITER` 는 *페이로드 없음* — 다음 LEB128로 `0` 이 인코딩된다 (`0x00`). "여기서부터 새로운 TU" 신호일 뿐.

### 세 번째 OBU — OBU_FRAME (typical)

```text
바이트 0x32 = 0011_0010
  type = 0110 = 6 = OBU_FRAME
  E = 0, S = 1, R = 0
```

LEB128로 큰 정수가 따라온다 (수십~수천 바이트). 그 안에 *Frame Header + Tile Group* 이 결합되어 들어 있다.

## OBU_FRAME 페이로드의 내부

`OBU_FRAME` 페이로드는 두 단계로 파싱된다.

```cpp
void parse_obu_frame(BitReader& sub, SeqState& seq, FrameState& f) {
    // 단계 1: frame_header_obu() — Section 5.9
    parse_frame_header_obu(sub, seq, f);

    // 단계 2: byte 정렬
    byte_alignment(sub);

    // 단계 3: tile_group_obu() — Section 5.11.1
    parse_tile_group_obu(sub, f);
}
```

`byte_alignment()` 가 *프레임 헤더와 타일 데이터 사이의 패딩* 을 처리한다. 타일 데이터는 반드시 *바이트 경계에서 시작* 한다 — 산술 코더가 바이트 입력을 가정하기 때문.

## 디코더 상태 모델

`obu_parse()` 가 *순수 함수가 아니라는 것* 이 중요하다. 디코더 상태에는 다음이 누적된다.

```text
DecoderState
├── seq                       (현재 유효한 Sequence Header)
├── frame                     (현재 디코딩 중인 Frame Header)
├── ref_frames[8]             (참조 프레임 슬롯 — Ch 11)
├── seen_frame_header_in_tu   (한 TU에 frame_header가 두 번 오는지 검증용)
└── tu_open                   (TEMPORAL_DELIMITER 이후 새 TU 진행 중인지)
```

`OBU_TEMPORAL_DELIMITER` 가 오면 `seen_frame_header_in_tu = false`. 새 TU 안에서 *한 프레임 헤더만 허용* (또는 `OBU_REDUNDANT_FRAME_HEADER`).

## 파싱 오류 시 동작

스펙은 *fail-safe 동작* 을 명시한다.

- 알 수 없는 `obu_type` (9~14) → **무시하고 size만큼 건너뛴다**. 디코더는 계속 진행
- `obu_forbidden_bit = 1` → 스펙 위반. 디코더가 거부할 수 있음
- LEB128이 8바이트를 넘으면 → 비트스트림 오류
- `obu_has_size_field=0` 이고 컨테이너가 길이를 모름 → 디코딩 불가

이 *전방 호환성* 이 OBU 설계의 강점이다 — 미래에 새 OBU 타입을 추가해도 옛 디코더가 무시하고 지나간다.

## 도구로 검증해 보기

`aomdec`(libaom)·`dav1d`·`av1-bitstream-analyzer` 가 hexdump를 사람이 읽을 수 있는 형태로 풀어 준다.

```text
$ aomdec --verbose sample.obu | head
OBU: type=SEQUENCE_HEADER  size=11
  seq_profile=0  max_frame_width=64  max_frame_height=64  ...
OBU: type=TEMPORAL_DELIMITER  size=0
OBU: type=FRAME  size=156
  frame_type=KEY_FRAME  show_frame=1  ...
```

스펙을 따라가다 막히면 *덤프와 비교하면서* 읽는 것이 가장 빠르다.

## 정리

- 디코더는 *while 루프* 안에서 OBU 헤더 → 크기 → 페이로드 → 다음 OBU 를 반복
- `OBU_TEMPORAL_DELIMITER` 는 *비어있는 신호* — 새 TU 시작 표시
- `OBU_FRAME` 은 *Frame Header + Tile Group* 결합. 둘 사이에 `byte_alignment()`
- 알 수 없는 `obu_type` 은 *무시* — 전방 호환성
- 디코더 상태는 OBU를 가로질러 누적된다

## 다음 절

다음은 **2.4 Temporal Unit과 Frame Type** — KEY / INTER / INTRA_ONLY / SWITCH 가 *어떻게 다른지* 와 `show_existing_frame` 의 정확한 의미.

## 관련 항목

- [2.2 OBU](/blog/media/av1/chapter02-bitstream/02-obu)
- [2.4 Temporal Unit과 Frame Type](/blog/media/av1/chapter02-bitstream/04-temporal-frame)
- [Ch 11: 참조 프레임 관리](/blog/media/av1/chapter11-reference-frames)
