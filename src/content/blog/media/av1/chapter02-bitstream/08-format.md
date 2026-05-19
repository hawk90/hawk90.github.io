---
title: "Ch 2.8: Low Overhead vs Length-Delimited 포맷"
date: 2026-05-16T03:08:00
description: ".obu (Low Overhead), Annex B (Length-Delimited), MP4/WebM 컨테이너 — AV1 비트스트림이 저장되는 세 가지 모양."
tags: [AV1, Video, Codec, Container, AnnexB]
series: "AV1"
seriesOrder: 2.08
draft: true
---

같은 *논리적 OBU* 들이 *물리적으로는 두 가지 다른 패킹* 으로 저장된다. 이 절은 그 두 포맷과 *컨테이너가 어떻게 끼는지* 를 정리한다.

## 두 가지 패킹

| 포맷 | 별명 | OBU 크기 결정 | 사용처 |
|------|------|--------------|--------|
| **Low Overhead Bitstream Format** | 단순 모드 | OBU 헤더의 `obu_has_size_field` | `.obu`, `.av1` raw 파일 |
| **Length-Delimited Bitstream Format** | **Annex B** | OBU마다 *외부* 크기 prefix | 일부 컨테이너, 디버깅 |

스펙 Section *Annex B* 에 후자가 정의된다 — *이름이 곧 Annex B*.

## Low Overhead Format

```text
[OBU₁][OBU₂][OBU₃][OBU₄]...
  └─ obu_has_size_field=1 이면 헤더 안에 LEB128 size
     →  OBU 자체가 자기 길이를 가지고 있다
```

특징:
- OBU 헤더 1바이트 + (선택) Extension 1바이트 + **LEB128 size** + payload
- 추가 메타데이터 없음 — *가장 콤팩트*
- raw `.obu` 파일, `.av1` raw 파일이 이 포맷

### hexdump 예시

```text
$ xxd test.obu
00000000: 0a0b 0000 0024 2900 1008 ... ← OBU₁ (SEQ_HEADER, size 11)
0000000d: 1200 ...                      ← OBU₂ (TEMPORAL_DELIMITER, size 0)
0000000f: 32a4 01 ...                   ← OBU₃ (FRAME, size LEB128(164))
```

각 OBU의 *바이트 경계는 헤더의 size 필드* 가 결정. 외부 도움 없음.

## Length-Delimited Format (Annex B)

```text
[temporal_unit_size : leb128]
  [frame_unit_size : leb128]
    [obu_length : leb128] [OBU₁]
    [obu_length : leb128] [OBU₂]
    ...
```

특징:
- **OBU 헤더의 `obu_has_size_field=0`** — 헤더 안에 size가 없다
- 대신 *외부 prefix* 로 크기를 알려줌:
  - `temporal_unit_size` — *한 TU* 전체 크기 (LEB128)
  - `frame_unit_size` — *한 Frame Unit* 전체 크기 (LEB128) — TU 안에 여러 개 가능
  - `obu_length` — 각 OBU의 크기 (LEB128)
- 3중 LEB128 — 더 무겁지만 *프레임 단위로 잘라 보내기* 좋다

### Frame Unit

Annex B에서만 등장하는 *그룹*. 한 *디코딩 프레임* 의 OBU들을 묶는다.

```text
Frame Unit
├── [obu_length] FRAME_HEADER_OBU (or FRAME_OBU)
├── [obu_length] TILE_GROUP_OBU
└── [obu_length] TILE_GROUP_OBU   (있다면)
```

TU 안에 *여러 프레임* (스케일러빌리티) 이 있으면 *Frame Unit이 여러 개*.

## 어디서 어느 포맷을?

| 사용처 | 포맷 |
|--------|------|
| `.obu` 파일 (libaom 출력) | Low Overhead |
| `.av1` raw 파일 | Low Overhead |
| MP4 (`.mp4`) | **컨테이너가 OBU를 카운트** — Low Overhead 또는 size=0 (컨테이너가 길이 제공) |
| WebM (`.webm`) | 같은 — MKV 의 *SimpleBlock/Block* 안에 OBU |
| IVF (`.ivf`) | 각 *프레임* 을 32비트 길이 prefix로 감싼다 (Annex B와 유사하지만 다름) |
| FFmpeg 의 *raw* 출력 | 옵션에 따라 둘 다 |

### MP4의 av1C 박스

MP4 컨테이너는 *Sequence Header를 mdat 밖* 의 `av1C` 박스에 둔다 — 비디오 메타데이터 영역.

```text
moov/trak/mdia/minf/stbl/stsd/av01/av1C
  ├── seq_profile, seq_level_idx
  ├── seq_tier, high_bitdepth, ...
  └── configOBUs:    SEQUENCE_HEADER_OBU 의 직접 복사
```

이렇게 *스트림 본문에 SEQ_HEADER 가 안 와도* 디코더가 시작할 수 있다. 그리고 본문(`mdat`)에는 *프레임 OBU만* 들어간다.

## IVF — 디버깅용 raw

libaom·dav1d 의 *테스트 도구* 가 자주 쓰는 `.ivf` 포맷.

```text
IVF 파일
├── File header (32 bytes)
│   ├── "DKIF" signature
│   ├── version, header_length
│   ├── codec FourCC ("AV01")
│   ├── width, height, framerate
│   └── 0
└── Frames
    ├── [frame_size : u32] [pts : u64] [data]
    ├── [frame_size : u32] [pts : u64] [data]
    └── ...
```

각 프레임이 *32비트 크기 + 64비트 PTS* 로 감싸진다. `data` 안에는 *Low Overhead OBU들이 한 디스플레이 프레임 분량*.

```bash
$ ffmpeg -i input.mp4 -c:v copy output.ivf
```

## 포맷 변환

### Low Overhead ↔ Annex B

도구가 있다.

```bash
# libaom의 aomdec / aomenc 옵션
aomenc --annexb=1 -o output.av1 input.y4m   # Annex B 출력
aomenc --annexb=0 -o output.obu input.y4m   # Low Overhead 출력
```

OBU의 *헤더 1바이트 + size 필드* 만 변환하면 되므로 *재인코딩 없이* 가능.

### MP4 추출

```bash
# mp4 → ivf (raw OBU)
ffmpeg -i video.mp4 -c:v copy -f ivf video.ivf

# mp4 → low-overhead obu
ffmpeg -i video.mp4 -c:v copy -f data video.obu  # 또는 OBU-extract 도구
```

## obu_has_size_field 의 의미

- Low Overhead 포맷에서는 *반드시 1*. 디코더가 길이를 알 길이 없다
- Annex B에서는 *0이 일반적* — 외부 prefix 가 알려준다. 1이어도 무방 (중복)
- MP4에서는 *0 또는 1 둘 다* — 컨테이너가 길이를 알기 때문
- 인코더 호환성 최대화 위해 *항상 1로 둬도 페널티 거의 없음* (LEB128 한두 바이트)

## 정리

- **Low Overhead** — OBU 헤더가 *자기 길이를 들고 있다*. raw `.obu`/`.av1`
- **Annex B (Length-Delimited)** — *외부 prefix* 가 길이를 알려준다. *TU → Frame Unit → OBU* 3중 그룹
- MP4·WebM은 *컨테이너가 길이를 책임* — `obu_has_size_field` 가 자유로움
- `.ivf` 는 *프레임 단위 크기 prefix* + Low Overhead 본문
- `av1C` 박스는 *Sequence Header를 mdat 밖에* 둔다 — MP4의 표준 방식

## 다음 절

다음은 **2.9 Trailing Bits와 Byte Alignment** — OBU의 *마지막 1~7비트* 가 무슨 일을 하는지.

## 관련 항목

- [2.7 스펙 표기법](/blog/media/av1/chapter02-bitstream/07-notation)
- [2.9 Trailing Bits와 Byte Alignment](/blog/media/av1/chapter02-bitstream/09-trailing)
- [Ch 25: 컨테이너와 전송](/blog/media/av1/chapter25-container-transport)
