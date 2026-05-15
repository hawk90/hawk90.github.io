---
title: "Ch 2: 비트스트림 구조 — 개요"
date: 2025-10-01T03:00:00
description: "AV1 비트스트림이 어떻게 계층화되는지 — OBU·Temporal Unit·Frame·Tile의 관계를 한눈에."
tags: [AV1, Video, Codec, Bitstream, OBU]
series: "AV1"
seriesOrder: 2.0
draft: false
---

AV1 디코더가 가장 먼저 하는 일은 비트스트림을 파싱하는 것이다. 이 장에서는 AV1 비트스트림의 계층 구조를 위에서 아래로 훑는다. 아직 코드는 거의 쓰지 않고, *어떤 단위가 어떤 단위를 감싸는지*만 정확히 잡는다.

## 한 줄 정리

AV1 비트스트림은 **OBU(Open Bitstream Unit)** 의 연속이다. 같은 시점을 가리키는 OBU들이 모여 **Temporal Unit** 을, 같은 의미를 가진 OBU들이 모여 **Frame** 을 구성한다.

## 이 장에서 다루는 것

- **2.1 계층 구조** — Temporal Unit → Frame → Tile Group → Tile → Superblock → ...
- **2.2 OBU** — 헤더 비트 레이아웃, 타입 8가지, LEB128 크기 인코딩
- **2.3 파싱 흐름** — 디코더가 OBU를 어떻게 받아 처리하는가 (메인 루프)
- **2.4 Temporal Unit / Frame Type** — KEY / INTER / INTRA_ONLY / SWITCH, show_frame과 show_existing_frame
- **2.5 Sequence Header 개요** — 시퀀스 전역 설정, 도구 활성화 플래그, Color Config
- **2.6 Profiles · Levels · Tiers** — 코덱 스트링 `av01.X.YYZ.B`
- **2.7 스펙 표기법** — `f(n)`, `uvlc()`, `le(n)`, `leb128()`, `su(n)`, `ns(n)`, `S()`, `L(n)`
- **2.8 Low Overhead vs Length-Delimited** — `.obu` vs Annex B(MP4/WebM)
- **2.9 Trailing Bits / Byte Alignment** — OBU 마지막의 패딩 규칙

## 왜 OBU인가

H.264/HEVC의 **NAL Unit** 과 비슷한 자리에 AV1의 OBU가 있다. 그러나 두 가지가 다르다.

| 항목 | H.264 NAL | AV1 OBU |
|------|-----------|---------|
| 경계 표시 | Start Code `0x000001` | **명시적 크기 필드 (LEB128)** |
| Emulation prevention | 필요 (`0x03` 삽입) | **불필요** |
| 헤더 길이 | 1바이트 (forbidden_zero_bit + nal_unit_type + ...) | 1바이트 (+ 확장 1바이트 선택적) |
| 사용자 데이터 | SEI | METADATA_OBU (구조화) |

OBU는 *바이트 정렬된 길이를 들고 있는 컨테이너* 다. 디코더가 시작 코드를 스캔할 필요가 없고, 파서가 더 단순하다.

## 이 장이 끝나면 답할 수 있는 것

- OBU 헤더의 1바이트를 읽어 type / extension / size 플래그를 풀 수 있는가
- LEB128로 인코딩된 크기 필드 11바이트를 읽을 수 있는가
- 코덱 스트링 `av01.0.04M.10` 이 어떤 설정인지 풀 수 있는가
- `show_frame=0` 인 프레임이 무엇을 의미하는지 설명할 수 있는가
- 스펙의 `f(4)`, `uvlc()` 표기를 보고 어떤 비트 패턴을 기대해야 하는지 아는가

준비됐다면 *2.1 계층 구조* 부터 시작하자.

## 관련 항목

- [2.1 비트스트림 계층 구조](/blog/media/av1/chapter02-bitstream/01-hierarchy)
- [Ch 1: AV1의 역사와 도구 체인](/blog/media/av1/chapter01-history-tools)
- [Ch 3: Tiles · Superblocks](/blog/media/av1/chapter03-tiles-superblocks)
