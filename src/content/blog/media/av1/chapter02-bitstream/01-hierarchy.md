---
title: "Ch 2.1: 비트스트림 계층 구조"
date: 2026-05-16T03:01:00
description: "AV1 비트스트림이 어떻게 7개 계층으로 쌓여 있는지 — Coded Video Sequence부터 Coefficient까지."
tags: [AV1, Video, Codec, Bitstream, Hierarchy]
series: "AV1"
seriesOrder: 2.01
draft: true
---

AV1 비트스트림은 *동심원* 처럼 7개 계층으로 쌓여 있다. 가장 바깥은 *전체 비디오 한 편*, 가장 안은 *한 변환 계수* 다. 각 계층은 자기 위 계층의 *유효 구간* 안에서만 의미가 있다.

## 전체 조감도

![비트스트림 계층 구조](/images/blog/av1/diagrams/ch02-bitstream-hierarchy.svg)

위에서 아래로 한 단계씩.

## 1) Coded Video Sequence (CVS)

가장 바깥. **하나의 Sequence Header OBU 로 시작해 다음 Sequence Header OBU 직전까지** 가 한 CVS다.

- 한 파일에 CVS가 여러 개 있을 수 있다 (드물게)
- 같은 CVS 안에서는 *프로파일·해상도·비트 깊이·도구 활성화 플래그* 가 동일
- CVS 경계가 곧 *완전 리셋 가능 지점* — 디코더 상태가 새 Sequence Header 로 재초기화된다

스펙 정의: Section 7.5 *Decoding the sequence header OBU* 가 끝나면 새 CVS가 시작된다.

## 2) Temporal Unit (TU)

같은 *표시 시각(presentation timestamp)* 을 가지는 OBU들의 묶음. 보통 *디스플레이 프레임 1장* 에 대응한다.

- 시작 마커: `TEMPORAL_DELIMITER_OBU` (크기 0)
- 끝: 다음 `TEMPORAL_DELIMITER_OBU` 직전
- 한 TU 안에 *디코딩되는 프레임은 여러 장* 일 수 있다 — 그러나 *표시되는 프레임* 은 보통 1장

```text
Temporal Unit
├── TEMPORAL_DELIMITER_OBU
├── [SEQUENCE_HEADER_OBU]        (필요한 경우만)
├── [METADATA_OBU(s)]            (HDR, 타임코드 등)
├── FRAME_OBU 또는
│   ├── FRAME_HEADER_OBU
│   └── TILE_GROUP_OBU(s)
└── [REDUNDANT_FRAME_HEADER_OBU] (에러 복원용, 선택)
```

## 3) Frame

비트스트림 상의 *한 부호화 프레임* — Spatial Scalability·Temporal Scalability를 빼면 디코딩 단위와 1:1이다.

- 정보: `FRAME_HEADER_OBU` 또는 `FRAME_OBU` 의 헤더 부분
- 픽셀 데이터: `TILE_GROUP_OBU` 들 또는 `FRAME_OBU` 의 타일 부분
- 4가지 타입: KEY / INTER / INTRA_ONLY / SWITCH (→ 2.4)

### show_frame vs show_existing_frame

| 플래그 | 의미 |
|--------|------|
| `show_frame = 1` | 이 프레임을 출력 큐에 넣는다 |
| `show_frame = 0` | 참조용으로만 디코딩 (예: ALTREF) |
| `show_existing_frame = 1` | 새 디코딩 없이 *참조 버퍼* 의 프레임을 출력 |

ALTREF 구조에서는 *비주얼이 없는 프레임* 을 먼저 디코딩해 두고, 나중에 `show_existing_frame` 으로 꺼내 보인다.

## 4) Tile Group / Tile

한 프레임은 *직사각형 타일* 들로 격자 분할된다. 같은 프레임의 타일들은 *서로 독립적으로* 디코딩 가능하다 — 병렬화 단위.

- `tile_cols × tile_rows` 격자
- 한 *Tile Group* 은 여러 타일을 묶은 OBU. 한 프레임에 Tile Group이 여러 개 있을 수 있다 (분할 전송)
- Large Scale Tile Mode 에서는 `TILE_LIST_OBU` 로 *타일만* 보낼 수도 있다

타일 격자 / 크기 제약은 Ch 3에서 자세히 다룬다.

## 5) Superblock

타일 안의 정사각 단위. **128×128** 또는 **64×64** — Sequence Header의 `use_128x128_superblock` 으로 결정.

- 한 슈퍼블록은 *재귀적 파티션* 으로 더 작은 블록들로 분할된다
- 슈퍼블록 경계에서 *루프 필터 강도* 가 갱신된다 (deblocking grid)

```text
Superblock 128×128
└── Partition: SPLIT/HORZ/VERT/...
    └── Block 64×64
        └── Partition ...
            └── Block 4×4 (최소)
```

## 6) Block (Partition)

슈퍼블록을 더 잘게 나눈 *예측·변환의 단위*. 10가지 파티션 타입(NONE, SPLIT, HORZ, VERT, HORZ_A, HORZ_B, VERT_A, VERT_B, HORZ_4, VERT_4) 으로 트리 형태로 쪼개진다.

- 가능한 블록 크기: 4×4 ~ 128×128
- *예측 모드* (intra/inter), *변환 크기*, *움직임 벡터* 가 블록 단위로 결정
- 변환은 블록보다 더 작게 쪼개질 수 있다 (TX partitioning)

## 7) Transform Coefficient

가장 안쪽. 한 변환 블록 안의 *DCT/ADST/FLIPADST/IDTX 계수* 다. 산술 부호화로 인코딩된 *마지막 데이터* 다.

- 변환 크기: 4×4 ~ 64×64 (정사각/직사각)
- 변환 종류: DCT, ADST, FLIPADST, IDTX 의 4가지 *X×Y* 조합 (총 16종)
- 계수는 *지그재그 스캔* 순서로 인코딩된다 (Ch 9에서)

## 디코딩 순서 ≠ 표시 순서

ALTREF·Overlay 구조 때문에 두 순서가 갈린다.

```text
디코딩 순서:  F0 KEY → F1 → F2 → ALTREF (참조용) → F3 → F4 → OVERLAY (ALTREF 표시)
                                  show_frame=0                  show_existing_frame=1

표시 순서:    F0     → F1 → F2 →                  F3 → F4 → ALTREF(=OVERLAY)
```

이 흐름이 *순방향 예측만 가능한 단순 코덱* 보다 압축률을 올리는 핵심이다.

## 정리

- AV1은 7계층: **CVS → TU → Frame → Tile Group → Tile → Superblock → Block → Coefficient**
- TU의 경계는 `TEMPORAL_DELIMITER_OBU`
- 타일은 *병렬 디코딩 단위*, 슈퍼블록은 *재귀 파티션의 출발점*
- 디코딩 순서와 표시 순서가 다를 수 있다 (`show_frame=0` + `show_existing_frame=1`)

## 다음 절

다음은 **2.2 OBU(Open Bitstream Unit)** — 모든 계층을 감싸는 *물리적 단위* 의 비트 레이아웃이다.

## 관련 항목

- [2.0 개요](/blog/media/av1/chapter02-bitstream/00-overview)
- [2.2 OBU](/blog/media/av1/chapter02-bitstream/02-obu)
- [Ch 3: Tiles · Superblocks](/blog/media/av1/chapter03-tiles-superblocks)
