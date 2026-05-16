---
title: "Ch 2.4: Temporal Unit과 Frame Type"
date: 2025-10-01T03:04:00
description: "Temporal Unit의 정의, KEY/INTER/INTRA_ONLY/SWITCH 4가지 프레임 타입, show_frame과 show_existing_frame의 정확한 의미."
tags: [AV1, Video, Codec, TemporalUnit, FrameType]
series: "AV1"
seriesOrder: 2.04
draft: true
---

비트스트림의 *물리 단위* (OBU)를 보았으니 이제 *의미 단위* (Frame, Temporal Unit)를 보자.

## Temporal Unit 다시 보기

**Temporal Unit (TU)** = 같은 *표시 시각* 을 가지는 OBU들의 묶음.

```text
[TEMPORAL_DELIMITER_OBU]
  [SEQUENCE_HEADER_OBU?]     ← 시퀀스 시작이나 도구 변경 시
  [METADATA_OBU*]            ← 0개 이상 (HDR, 타임코드, …)
  ──── 하나 이상의 프레임 ────
    [REDUNDANT_FRAME_HEADER_OBU?]
    OBU_FRAME 또는
      OBU_FRAME_HEADER + OBU_TILE_GROUP+
```

규칙 (Section 7.5):
- 한 TU 안에 **`OBU_FRAME_HEADER` 는 최대 한 번** (또는 `OBU_FRAME` 한 번). 중복은 `REDUNDANT_FRAME_HEADER` 만 허용
- `TEMPORAL_DELIMITER_OBU` 는 *처음에 한 번* — TU 안에 두 번 나오면 에러
- 같은 *프레임을 다른 레이어* 로 두 번 보내는 경우 `Extension Header` 의 `temporal_id`/`spatial_id` 가 다르다

## 4가지 Frame Type (Section 6.8.2)

`frame_type` 은 2비트, 4가지 값.

| `frame_type` | 값 | 이름 | 참조 가능? | 상태 리셋? | 용도 |
|---|---|---|---|---|---|
| `KEY_FRAME` | 0 | 키 프레임 | 없음 (intra only) | **완전 리셋** | 무작위 접근 지점 |
| `INTER_FRAME` | 1 | 일반 인터 | 7개 슬롯 모두 | 없음 | 대부분의 프레임 |
| `INTRA_ONLY_FRAME` | 2 | 인트라 전용 | 없음 (intra only) | **부분** (참조 슬롯만 갱신) | 장면 전환·삽입 |
| `SWITCH_FRAME` | 3 | 스위치 프레임 | 7개 슬롯 모두 | 일부 | 에러 복구·비트레이트 적응 |

### KEY_FRAME

- 완전 독립 디코딩 가능 — 이전 프레임 *불필요*
- 디코더 상태가 *모두 초기화* 된다: 참조 슬롯·확률 모델·CDF
- 보통 *Sequence Header 직후* 에 등장 (필수는 아님)
- `show_frame=1` 이 일반적

### INTER_FRAME

- 가장 흔한 타입. 이전·이후 프레임을 참조해 *움직임 보상* 으로 차분만 보냄
- 참조: 7개의 *참조 슬롯* 중 최대 7개를 동시에 (Ch 11)
- 디코딩이 끝나면 `refresh_frame_flags` 비트마스크에 따라 참조 슬롯이 갱신된다

### INTRA_ONLY_FRAME

- 프레임 내 예측만 (인터 X)
- 그러나 *상태 리셋은 부분적* — 참조 슬롯 갱신은 발생하지만 *확률 모델은 유지* 가능
- 용도: 장면 전환 후 *Key Frame 만큼 비싸지 않은* 인트라 프레임
- HEVC의 *IDR vs CRA* 와 비슷한 구분

### SWITCH_FRAME

- `frame_size_override_flag=1` 강제
- *모든 참조 프레임이 사용 가능* 함을 보장 — 비트레이트 적응 시 *다른 스트림으로 점프* 가능
- 사용 예: 라이브 스트리밍에서 *720p ↔ 1080p* 전환
- 매우 드물게 사용

## show_frame — 출력 큐 진입

`show_frame` 은 1비트. **출력 큐에 넣을지** 만 결정한다 — *디코딩은 무조건 한다*.

| `show_frame` | 결과 |
|--------------|------|
| 1 | 디코딩 후 출력 큐에 넣음. 표시 시각이 진행 |
| 0 | 디코딩만 하고 참조 슬롯에 저장. **출력 안 함** |

`show_frame=0` 의 전형적 사용은 **ALTREF**.

```text
디코딩 순서: F0(key) → F1 → F2 → ALTREF → F3 → F4 → OVERLAY
                                  ↓ show_frame=0       ↓ show_existing_frame=1
표시 순서:   F0     → F1 → F2 →                F3 → F4 → ALTREF
```

- *디코딩 순서* 와 *표시 순서* 가 달라진다 (B-frame 같은 효과를 ALTREF로 구현)
- *ALTREF 는 미래 프레임의 평균* 일 때가 많다 — 노이즈가 평균화돼 *압축에 매우 유리*

## show_existing_frame — 재출력

`show_existing_frame=1` 이면 디코더는 *새 디코딩을 안 한다*. 단지 **참조 슬롯에서 프레임을 꺼내 출력 큐에 넣는다**.

```text
frame_header() 안:
    show_existing_frame   f(1)
    if (show_existing_frame) {
        frame_to_show_map_idx   f(3)   // 8개 슬롯 중 어느 것을 꺼낼지
        if (decoder_model_info_present_flag) ...
        if (frame_id_numbers_present_flag) ...
        // 끝 — 나머지 프레임 헤더는 없음
    } else {
        // 일반 프레임 헤더 파싱 계속
    }
```

비용 = `frame_to_show_map_idx` 3비트 + trailing bits + LEB128 size. 한 *OBU* 가 *수 바이트* 로 끝난다.

### 왜 필요한가

ALTREF 패턴에서 *원래 미래 프레임이었던 ALTREF* 를 *원래 시점* 에서 출력하기 위해. ALTREF의 시점에는 `show_frame=0` 으로 디코딩만 해 두고, 진짜 표시 시점이 오면 `show_existing_frame=1` 한 줄로 *공짜 재출력* 한다.

이 패턴 덕분에 *디코더는 한 번만 일하고 결과는 두 번 재사용* 된다 — 매우 효율적.

## 디스플레이 큐 모델

```text
디코딩 순서:    F0  F1  F2  ALTREF  F3  F4  OVERLAY
                ↓   ↓   ↓     ↓     ↓   ↓     ↓
show_frame:     1   1   1     0     1   1     -    (OVERLAY는 show_existing_frame)
출력 큐:        F0  F1  F2          F3  F4    ALTREF (재출력)

표시 시각:      t0  t1  t2          t3  t4    t5
```

`show_frame=0` 이거나 `show_existing_frame` 인 OBU는 *표시 시각을 진행시키지 않는다* (구현체마다 다소 다름; 스펙은 PTS를 정의하지 않음 — 컨테이너의 영역).

## error_resilient_mode

프레임 헤더에 `error_resilient_mode` 1비트가 있다. **켜지면**:
- 이 프레임은 *완전히 독립적으로 디코딩 가능* 해야 한다 (확률 모델 리셋 등)
- `primary_ref_frame = PRIMARY_REF_NONE` 강제
- `refresh_frame_flags` 가 *모든 슬롯* 을 갱신할 수 있어야 함

라이브 스트리밍이나 *재시작 가능한 단위* 를 만들 때 사용.

## 정리

- **Temporal Unit** = `TEMPORAL_DELIMITER_OBU` 부터 다음 `TEMPORAL_DELIMITER_OBU` 직전까지
- 4가지 Frame Type: KEY / INTER / INTRA_ONLY / SWITCH — 각각 *상태 리셋 정도* 가 다르다
- `show_frame=0` 으로 *디코딩만 하고 표시 안 함* (ALTREF)
- `show_existing_frame=1` 로 *공짜 재출력* (OVERLAY)
- 디코딩 순서와 표시 순서가 갈리는 것이 *AV1 압축률의 핵심*

## 다음 절

다음은 **2.5 Sequence Header 개요** — 시퀀스 전체에 한 번만 보내는 *전역 설정* 의 구조.

## 관련 항목

- [2.3 OBU 파싱 흐름](/blog/media/av1/chapter02-bitstream/03-parsing)
- [2.5 Sequence Header 개요](/blog/media/av1/chapter02-bitstream/05-sequence-header)
- [Ch 11: 참조 프레임 관리](/blog/media/av1/chapter11-reference-frames)
