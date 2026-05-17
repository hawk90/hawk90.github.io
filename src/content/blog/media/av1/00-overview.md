---
title: "AV1: 시리즈 개요"
date: 2026-05-01T00:00:00
description: "AV1 코덱 완전 정복. 비트스트림 구조부터 디코더 구현, 인코더 전략까지."
series: "AV1"
seriesOrder: 0
tags: [AV1, Codec, Video, AOMedia, Bitstream]
draft: true
---

AV1은 Alliance for Open Media가 개발한 로열티 프리 비디오 코덱이다. 이 시리즈는 AV1 스펙 전체를 다룬다.

## 대상 독자

- 비디오 코덱에 관심 있는 개발자
- 디코더/인코더 구현자
- 스트리밍 시스템 엔지니어
- 영상 처리 연구자

## 스펙 기준

- **AV1 Bitstream & Decoding Process Specification v1.0.0 with Errata 1**
- aom (libaom) 참조 구현
- dav1d, SVT-AV1 구현 참고

## 시리즈 구조

```text
AV1 (30장)
│
├── Part 1: Basics (2장) ─────────────── 배경 지식
├── Part 2: Bitstream (4장) ──────────── OBU와 헤더 파싱
├── Part 3: Blocks (3장) ─────────────── 블록 분할과 변환
├── Part 4: Prediction (7장) ─────────── Intra/Inter 예측
├── Part 5: Filters (3장) ────────────── 루프 필터
├── Part 6: Features (4장) ───────────── 부가 기능
├── Part 7: System (3장) ─────────────── 디코더 모델과 전송
└── Part 8: Encoder (4장) ────────────── 인코더 전략과 검증
```

---

## Part 1: Basics — 배경

| Ch | 제목 | 내용 |
|----|------|------|
| 0 | [디지털 비디오 기초](/blog/media/av1/chapter00-digital-video) | 색공간, 샘플링, 프레임 타입 |
| 1 | [AV1 역사와 도구](/blog/media/av1/chapter01-history-tools) | VP9 → AV1, aomenc/dav1d/SVT |

---

## Part 2: Bitstream — 비트스트림 구조

| Ch | 제목 | 내용 |
|----|------|------|
| 2 | [비트스트림 구조](/blog/media/av1/chapter02-bitstream/00-overview) | OBU, Temporal Unit, Frame |
| 3 | [Sequence Header](/blog/media/av1/chapter03-tiles-superblocks) | 프로파일, 해상도, Color Config |
| 5 | [Frame Header](/blog/media/av1/chapter05-prediction-overview) | 프레임별 파라미터, Skip Mode |
| 7 | [엔트로피 디코딩](/blog/media/av1/chapter07-entropy-coding) | Symbol, CDF, Multi-symbol |

---

## Part 3: Blocks — 블록 처리

| Ch | 제목 | 내용 |
|----|------|------|
| 4 | [블록 파티셔닝](/blog/media/av1/chapter04-partitioning) | Superblock → 재귀 분할 |
| 6 | [블록 구조](/blog/media/av1/chapter06-block-structure) | mode_info, transform block |
| 9 | [변환과 양자화](/blog/media/av1/chapter09-transform-quantization) | DCT/ADST, Quant Matrix |

---

## Part 4: Prediction — 예측

| Ch | 제목 | 내용 |
|----|------|------|
| 8 | [Intra 예측](/blog/media/av1/chapter08-intra-prediction) | DC, Angular, Paeth, CfL, Palette |
| 10 | [프레임 조립](/blog/media/av1/chapter10-frame-assembly) | 예측 + 역변환 + 클리핑 |
| 11 | [참조 프레임](/blog/media/av1/chapter11-reference-frames) | 8개 슬롯, refresh, 순서 힌트 |
| 12 | [Inter 예측](/blog/media/av1/chapter12-inter-prediction) | MV 예측, 보간 필터 |
| 13 | [Compound 예측](/blog/media/av1/chapter13-compound-prediction) | 두 참조 블렌딩, Wedge, Diff |
| 14 | [Global & Warped Motion](/blog/media/av1/chapter14-global-warped-motion) | 전역 모션, 아핀, OBMC |
| 15 | [MFMV](/blog/media/av1/chapter15-mfmv) | Motion Field MV |

---

## Part 5: Filters — 루프 필터

| Ch | 제목 | 내용 |
|----|------|------|
| 16 | [디블로킹](/blog/media/av1/chapter16-deblocking) | 수직/수평 필터, bS 결정 |
| 17 | [CDEF](/blog/media/av1/chapter17-cdef) | 방향성 필터, pri/sec 강도 |
| 18 | [Loop Restoration](/blog/media/av1/chapter18-loop-restoration) | Wiener, Self-guided |

---

## Part 6: Features — 부가 기능

| Ch | 제목 | 내용 |
|----|------|------|
| 19 | [Film Grain](/blog/media/av1/chapter19-film-grain) | 필름 그레인 합성 |
| 20 | [타일과 병렬](/blog/media/av1/chapter20-tiles-parallel) | 타일 구조, 병렬 디코딩 |
| 21 | [Superres & Scalability](/blog/media/av1/chapter21-superres-scalability) | 업스케일, SVC |
| 22 | [Metadata OBU](/blog/media/av1/chapter22-metadata) | HDR, 타이밍, 사용자 데이터 |

---

## Part 7: System — 시스템

| Ch | 제목 | 내용 |
|----|------|------|
| 23 | [Decoder Model](/blog/media/av1/chapter23-decoder-model) | 버퍼링, 레벨, 타이밍 |
| 24 | [Error Resilience](/blog/media/av1/chapter24-error-resilience) | 에러 복구, OBU 독립성 |
| 25 | [Container & Transport](/blog/media/av1/chapter25-container-transport) | MP4, WebM, RTP, CMAF |

---

## Part 8: Encoder — 인코더 전략

| Ch | 제목 | 내용 |
|----|------|------|
| 26 | [Rate Control](/blog/media/av1/chapter26-rate-control) | CBR, VBR, 2-pass |
| 27 | [GOP & Keyframe](/blog/media/av1/chapter27-gop-keyframe-ltr) | 구조 설계, LTR |
| 28 | [Temporal Filter & AQ](/blog/media/av1/chapter28-temporal-filter-aq) | 시간 필터링, 적응형 QP |
| 29 | [테스트 벡터](/blog/media/av1/chapter29-test-vectors) | 공식 벡터, 검증 방법 |

---

## 학습 경로

### 디코더 개발자 (16장)

```
Ch 0 → 2 → 3 → 5 → 4 → 7 → 6 → 8 → 9 → 11 → 12 → 10 → 16 → 17 → 18 → 29
```

### 인코더 개발자 (20장)

```
디코더 경로 + Ch 13 → 14 → 15 → 26 → 27 → 28
```

### 시스템/스트리밍 (10장)

```
Ch 0 → 2 → 3 → 20 → 23 → 24 → 25 → 22 → 21 → 29
```

### 빠른 개요 (6장)

```
Ch 0 → 2 → 4 → 8 → 12 → 25
```

---

## 실무 도구

| 도구 | 용도 |
|------|------|
| `aomenc` | 참조 인코더 (libaom) |
| `aomdec` | 참조 디코더 (libaom) |
| `dav1d` | 고성능 디코더 (VideoLAN) |
| `rav1e` | Rust AV1 인코더 |
| `SVT-AV1` | Intel/Netflix 인코더 |
| `av1parser` | 비트스트림 분석 |
| `ffmpeg` | 트랜스코딩 |

---

## 참고 자료

- [AV1 Spec (aomedia.org)](https://aomedia.org/av1-bitstream-and-decoding-process-specification/)
- [libaom (aomedia.googlesource.com)](https://aomedia.googlesource.com/aom/)
- [dav1d (code.videolan.org)](https://code.videolan.org/videolan/dav1d)
- [SVT-AV1 (gitlab.com)](https://gitlab.com/AOMediaCodec/SVT-AV1)

---

## 다음 장

[Ch 0: 디지털 비디오 기초](/blog/media/av1/chapter00-digital-video)에서 시작한다.
