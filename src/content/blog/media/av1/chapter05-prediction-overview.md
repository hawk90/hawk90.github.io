---
title: "Ch 5: Frame Header"
date: 2025-10-01T06:00:00
description: "AV1 Frame Header 구조 — 프레임 타입, 양자화, 세그멘테이션, 필터 파라미터."
tags: [AV1, Video, Codec, Frame Header, Quantization]
series: "AV1"
seriesOrder: 5
draft: false
---

## 5.1 Frame Header의 역할

(스펙 Section 5.9 uncompressed_header)

Sequence Header가 시퀀스 전체에 적용되는 설정이라면, **Frame Header는 해당 프레임에만 적용되는 설정**이다.

Frame Header에 담기는 정보:
- 프레임 타입 (Key/Inter/Intra-only/Switch)
- 프레임 크기
- 양자화 파라미터
- 세그멘테이션 설정
- 타일 구조
- 루프 필터/CDEF/Restoration 파라미터
- 참조 프레임 정보 (Inter 프레임일 때)
- 글로벌 모션 파라미터 (Inter 프레임일 때)

Frame Header는 **산술 코딩 전에 파싱**된다. 산술 디코더가 초기화되기 전에 이 메타데이터들을 읽어야 하기 때문이다.

## 5.2 show_existing_frame

(스펙 Section 5.9.2)

`show_existing_frame` 플래그가 1이면, 새로운 프레임을 디코딩하지 않고 **참조 버퍼에 있는 기존 프레임을 표시**한다.

```
show_existing_frame = f(1)  // 1비트 읽기
if (show_existing_frame) {
    frame_to_show_map_idx = f(3)  // 8개 버퍼 중 하나
    // 디코딩 없이 해당 버퍼 출력
    return
}
```

이 기능은 **Overlay Frame**에서 사용된다. ALTREF 프레임은 디코딩 순서상 먼저 디코딩되지만 표시는 나중에 된다. Overlay Frame이 `show_existing_frame=1`로 ALTREF를 표시한다.

## 5.3 프레임 타입

(스펙 Section 5.9.3)

```
frame_type = f(2)  // 2비트
```

| 값 | 프레임 타입 | 설명 |
|----|------------|------|
| 0 | KEY_FRAME | 랜덤 액세스 포인트. 다른 프레임 참조 없음. |
| 1 | INTER_FRAME | 이전 프레임 참조. 가장 흔한 타입. |
| 2 | INTRA_ONLY_FRAME | Intra 예측만 사용하지만 Key Frame은 아님. |
| 3 | SWITCH_FRAME | 비트레이트/해상도 전환용. |

### KEY_FRAME

- 완전히 독립적. 어떤 참조 프레임도 필요 없다.
- 디코딩 시작점(IDR). 스트림 중간에서 재생을 시작할 수 있다.
- 모든 CDF를 기본값으로 리셋.
- 모든 참조 버퍼를 현재 프레임으로 갱신.

### INTER_FRAME

- 참조 프레임을 사용한 Motion Compensation.
- 7개의 명명된 참조(LAST, LAST2, LAST3, GOLDEN, BWDREF, ALTREF2, ALTREF) 중 선택.
- 대부분의 프레임이 이 타입.

### INTRA_ONLY_FRAME

- Intra 예측만 사용하지만 Key Frame처럼 버퍼를 모두 리셋하지는 않음.
- 스케일러블 코딩 등에서 사용.

### SWITCH_FRAME

- 해상도나 비트레이트 전환 시 사용.
- 모든 디코더가 이 프레임으로 동기화할 수 있음.

## 5.4 show_frame과 error_resilient_mode

```
show_frame = f(1)
```

- `show_frame=1`: 디코딩 후 화면에 표시.
- `show_frame=0`: 디코딩만 하고 표시 안 함 (ALTREF 같은 비표시 참조 프레임).

```
error_resilient_mode = f(1)
```

- `error_resilient_mode=1`: 에러 복원 모드.
  - 이전 프레임의 CDF를 사용하지 않고 기본 CDF로 시작.
  - 프레임 손실 시에도 복구 가능.
  - 비트 효율은 낮아짐 (적응이 안 되므로).

## 5.5 프레임 크기

(스펙 Section 5.9.5~5.9.9)

Key Frame과 Intra-only Frame에서는 프레임 크기를 직접 읽는다:

```
frame_width_minus_1 = f(frame_width_bits + 1)
frame_height_minus_1 = f(frame_height_bits + 1)

FrameWidth = frame_width_minus_1 + 1
FrameHeight = frame_height_minus_1 + 1
```

`frame_width_bits`와 `frame_height_bits`는 Sequence Header의 `max_frame_width_minus_1`과 `max_frame_height_minus_1`을 표현하는 데 필요한 비트 수다.

### Super Resolution

Superres는 **인코딩 시 축소 → 디코딩 후 확대** 방식이다.

```
use_superres = f(1)
if (use_superres) {
    superres_denom = f(3) + 9  // 9~16
} else {
    superres_denom = 8  // 1:1
}
```

실제 코딩 너비 계산:

```
UpscaledWidth = FrameWidth
FrameWidth = (UpscaledWidth * 8 + superres_denom / 2) / superres_denom
```

Superres는 비트레이트가 극도로 낮을 때 화질 개선에 도움이 된다. 작게 인코딩하고 크게 복원한다.

### Render Size

```
render_and_frame_size_different = f(1)
if (render_and_frame_size_different) {
    render_width_minus_1 = f(16)
    render_height_minus_1 = f(16)
}
```

Render size는 최종 표시 크기다. Frame size(디코딩 크기)와 다를 수 있다.

## 5.6 양자화 파라미터

(스펙 Section 5.9.12)

양자화는 **화질과 비트레이트의 트레이드오프**를 결정한다.

### base_q_idx

```
base_q_idx = f(8)  // 0~255
```

- 프레임 전체의 양자화 기준값.
- 값이 클수록 양자화가 거칠다 → 화질↓ 비트레이트↓.
- **0 = 무손실** (양자화 스텝 = 1).

일반적인 범위:
- 고화질: 20~60
- 중간 화질: 60~120
- 저화질: 120~200

### Delta Q

루마와 크로마에 다른 양자화를 적용할 수 있다:

```
DeltaQYDc    // 루마 DC 오프셋
DeltaQUDc    // Cb DC 오프셋
DeltaQUAc    // Cb AC 오프셋
DeltaQVDc    // Cr DC 오프셋
DeltaQVAc    // Cr AC 오프셋
```

인간의 시각은 크로마에 덜 민감하므로, 크로마에 더 거친 양자화를 적용해도 눈에 띄지 않는다.

### Quantization Matrix

```
using_qmatrix = f(1)
if (using_qmatrix) {
    qm_y = f(4)  // 0~15
    qm_u = f(4)
    qm_v = f(4)
}
```

Quantization Matrix는 **주파수별로 다른 양자화 강도**를 적용한다. 인간 시각 시스템(HVS)은 고주파에 덜 민감하므로, 고주파 계수를 더 거칠게 양자화할 수 있다.

### delta_q_present

```
delta_q_present = f(1)
if (delta_q_present) {
    delta_q_res = f(2)
}
```

`delta_q_present=1`이면 **슈퍼블록 단위로 양자화 오프셋**을 적용할 수 있다. ROI(Region of Interest) 인코딩에 유용하다. 중요한 영역에 더 적은 양자화(더 높은 화질)를 적용할 수 있다.

## 5.7 세그멘테이션

(스펙 Section 5.9.14)

세그멘테이션은 프레임을 **최대 8개 영역**으로 분류하고, 영역별로 다른 파라미터를 적용하는 기능이다.

### 왜 필요한가

화상 회의를 예로 들자:
- 얼굴: 중요. 높은 화질 필요.
- 배경: 덜 중요. 낮은 화질로 비트 절약.

세그멘테이션으로 얼굴에 낮은 QP(높은 화질)를, 배경에 높은 QP(낮은 화질)를 적용할 수 있다.

### 파라미터

```
segmentation_enabled = f(1)
if (segmentation_enabled) {
    segmentation_update_map = f(1)
    segmentation_temporal_update = f(1)
    segmentation_update_data = f(1)
    // 각 세그먼트별 feature 값 읽기
}
```

세그먼트별로 설정 가능한 feature:

| Feature ID | 이름 | 설명 |
|------------|------|------|
| 0 | SEG_LVL_ALT_Q | 양자화 오프셋 |
| 1 | SEG_LVL_ALT_LF_Y_V | 루마 수직 루프 필터 오프셋 |
| 2 | SEG_LVL_ALT_LF_Y_H | 루마 수평 루프 필터 오프셋 |
| 3 | SEG_LVL_ALT_LF_U | Cb 루프 필터 오프셋 |
| 4 | SEG_LVL_ALT_LF_V | Cr 루프 필터 오프셋 |
| 5 | SEG_LVL_REF_FRAME | 참조 프레임 강제 지정 |
| 6 | SEG_LVL_SKIP | 잔차 스킵 강제 |
| 7 | SEG_LVL_GLOBALMV | 글로벌 모션 사용 강제 |

### 세그먼트 맵

각 블록이 어느 세그먼트에 속하는지를 나타내는 맵이다. 세그먼트 ID(0~7)가 블록마다 할당된다.

- `segmentation_update_map=1`: 현재 프레임에서 세그먼트 맵 갱신.
- `segmentation_temporal_update=1`: 이전 프레임의 세그먼트 맵을 예측 값으로 사용.

## 5.8 타일 정보

(스펙 Section 5.9.15)

타일 구조는 이미 Ch 3에서 다뤘지만, 타일 관련 파라미터는 Frame Header에서 읽는다.

```
uniform_tile_spacing_flag = f(1)
if (uniform_tile_spacing_flag) {
    // tile_cols_log2, tile_rows_log2 읽기
} else {
    // 명시적 타일 크기 지정
}
```

### context_update_tile_id

```
context_update_tile_id = f(tile_bits)
```

CDF 업데이트를 수행할 타일을 지정한다. 단일 타일만 CDF를 업데이트하고, 다른 타일은 그 결과를 사용한다.

## 5.9 루프 필터 파라미터

(스펙 Section 5.9.11)

루프 필터는 블록 경계의 **블록킹 아티팩트**를 제거한다.

```
loop_filter_level[0] = f(6)  // 루마 수직 (0~63)
loop_filter_level[1] = f(6)  // 루마 수평
if (Planes > 1 && (level[0] || level[1])) {
    loop_filter_level[2] = f(6)  // Cb
    loop_filter_level[3] = f(6)  // Cr
}

loop_filter_sharpness = f(3)  // 0~7, 엣지 보호 수준
```

### Delta Loop Filter

```
loop_filter_delta_enabled = f(1)
if (loop_filter_delta_enabled) {
    loop_filter_delta_update = f(1)
    if (loop_filter_delta_update) {
        // ref_deltas[8], mode_deltas[2] 읽기
    }
}
```

참조 프레임 타입별, 예측 모드별로 필터 강도를 조정할 수 있다:
- `ref_deltas[8]`: INTRA_FRAME, LAST_FRAME, ..., ALTREF_FRAME 별 오프셋.
- `mode_deltas[2]`: ZERO_MV, NEW_MV 등 모드별 오프셋.

## 5.10 CDEF 파라미터

(스펙 Section 5.9.19)

CDEF(Constrained Directional Enhancement Filter)는 **방향성 아티팩트**를 제거한다.

```
cdef_damping_minus_3 = f(2)
cdef_bits = f(2)

num_presets = 1 << cdef_bits  // 최대 8개 프리셋

for (i = 0; i < num_presets; i++) {
    cdef_y_pri_strength[i] = f(4)   // 루마 primary 강도
    cdef_y_sec_strength[i] = f(2)   // 루마 secondary 강도
    cdef_uv_pri_strength[i] = f(4)  // 크로마 primary 강도
    cdef_uv_sec_strength[i] = f(2)  // 크로마 secondary 강도
}
```

- `cdef_damping`: 클리핑 임계값 감쇠. 3~6.
- `cdef_bits`: 프리셋 개수 결정. 0~3 → 1~8개 프리셋.
- 각 64×64 블록에서 어떤 프리셋을 사용할지 별도로 시그널링.

## 5.11 Loop Restoration 파라미터

(스펙 Section 5.9.20)

Loop Restoration은 블록킹과 링잉 아티팩트를 **후처리로 복원**한다.

```
lr_type[0] = lr_type_value  // Y 평면
lr_type[1] = lr_type_value  // U 평면
lr_type[2] = lr_type_value  // V 평면
```

| 값 | 타입 | 설명 |
|----|------|------|
| 0 | RESTORE_NONE | 복원 없음 |
| 1 | RESTORE_WIENER | Wiener 필터 |
| 2 | RESTORE_SGRPROJ | Self-guided 필터 |
| 3 | RESTORE_SWITCHABLE | 블록별 선택 |

```
lr_unit_shift = f(1)
if (lr_unit_shift) {
    lr_unit_extra_shift = f(1)
}
```

Restoration Unit(RU) 크기:
- `lr_unit_shift=0`: 64×64
- `lr_unit_shift=1`, `extra=0`: 128×128
- `lr_unit_shift=1`, `extra=1`: 256×256

## 5.12 TX Mode

(스펙 Section 5.9.21)

```
if (CodedLossless) {
    TxMode = TX_MODE_ONLY_4X4
} else {
    tx_mode_select = f(1)
    if (tx_mode_select) {
        TxMode = TX_MODE_SELECT
    } else {
        TxMode = TX_MODE_LARGEST
    }
}
```

| TX Mode | 설명 |
|---------|------|
| TX_MODE_ONLY_4X4 | 무손실 모드. 4×4 변환만 사용. |
| TX_MODE_LARGEST | 최대 변환 크기 사용. |
| TX_MODE_SELECT | 블록별로 변환 크기 시그널링. |

## 5.13 Skip Mode

(스펙 Section 5.9.22)

Skip Mode는 특정 조건에서 **매우 효율적인 인코딩**을 가능하게 한다.

```
skip_mode_present = f(1)
```

Skip Mode 조건:
1. Inter 프레임이어야 함.
2. 특정 두 참조 프레임 사이의 NEAREST_NEARESTMV 예측.
3. 잔차가 0.

`skipModeFrame[2]`는 Skip Mode에 사용할 두 참조 프레임을 결정한다. `GetRelativeDistance()` 함수로 프레임 순서를 비교한다.

## 5.14 Reference Frame 정보 (Inter 프레임)

(스펙 Section 5.9.4)

Inter 프레임에서는 7개의 명명된 참조가 어떤 버퍼 슬롯을 가리키는지 읽는다:

```
for (i = LAST_FRAME; i <= ALTREF_FRAME; i++) {
    ref_frame_idx[i] = f(3)  // 8개 슬롯 중 하나
}
```

| 명명된 참조 | 일반적인 용도 |
|------------|---------------|
| LAST_FRAME | 바로 이전 프레임 |
| LAST2_FRAME | 2개 전 프레임 |
| LAST3_FRAME | 3개 전 프레임 |
| GOLDEN_FRAME | 장기 참조 (장면 변화 없는 배경) |
| BWDREF_FRAME | 미래 프레임 (B 프레임 예측) |
| ALTREF2_FRAME | 보조 미래 참조 |
| ALTREF_FRAME | 주요 미래 참조 (Temporal Filter 적용) |

### frame_refs_short_signaling

참조 프레임 할당을 간략화하는 경로:

```
frame_refs_short_signaling = f(1)
if (frame_refs_short_signaling) {
    last_frame_idx = f(3)
    gold_frame_idx = f(3)
    set_frame_refs()  // 나머지 자동 할당
}
```

## 5.15 Global Motion 파라미터

(스펙 Section 5.9.24~5.9.29)

Global Motion은 **프레임 전체에 적용되는 움직임**을 표현한다. 카메라 팬, 줌, 회전 등.

```
for (ref = LAST_FRAME; ref <= ALTREF_FRAME; ref++) {
    // 각 참조 프레임에 대한 변환 파라미터 읽기
    is_global[ref] = f(1)
    if (is_global[ref]) {
        is_rot_zoom = f(1)
        if (is_rot_zoom) {
            type = ROTZOOM
        } else {
            is_translation = f(1)
            type = is_translation ? TRANSLATION : AFFINE
        }
    } else {
        type = IDENTITY
    }
    // 변환 파라미터 디코딩
}
```

| 변환 타입 | 파라미터 수 | 설명 |
|----------|------------|------|
| IDENTITY | 0 | 변환 없음 |
| TRANSLATION | 2 | 평행 이동 |
| ROTZOOM | 4 | 회전 + 줌 |
| AFFINE | 6 | 전체 어파인 변환 |

Global Motion 파라미터는 **sub-exponential 코딩**으로 압축된다. 작은 값은 적은 비트, 큰 값은 많은 비트를 사용한다.

## 5.16 Frame Header 파싱 순서

```
parse_frame_header() {
    1. show_existing_frame
       (1이면 기존 버퍼 출력 후 리턴)

    2. frame_type, show_frame, error_resilient_mode

    3. 프레임 크기 (frame_width, frame_height)

    4. Superres 파라미터

    5. Render size (선택)

    6. 참조 프레임 정보 (Inter일 때)

    7. 양자화 파라미터 (base_q_idx, delta_q)

    8. 세그멘테이션 파라미터

    9. 타일 정보

    10. 루프 필터 파라미터

    11. CDEF 파라미터

    12. Loop Restoration 파라미터

    13. TX Mode

    14. Skip Mode

    15. Global Motion (Inter일 때)
}
```

## 정리

- Frame Header는 **해당 프레임에만 적용되는 설정**을 담는다.
- `show_existing_frame=1`이면 **디코딩 없이 기존 버퍼 출력**.
- **4가지 프레임 타입**: KEY_FRAME, INTER_FRAME, INTRA_ONLY_FRAME, SWITCH_FRAME.
- **base_q_idx(0~255)**가 양자화 강도를 결정한다. 0은 무손실.
- **세그멘테이션**으로 최대 8개 영역에 다른 파라미터 적용.
- **루프 필터**는 블록 경계 아티팩트를 제거한다.
- **CDEF**는 방향성 아티팩트를 제거한다.
- **Loop Restoration**은 Wiener/SGRPROJ 필터로 후처리한다.
- Inter 프레임에서 **7개 명명된 참조**와 **Global Motion**을 읽는다.

## 다음 장 예고

Ch 6에서는 블록 구조를 다룬다. Coding Block(CB)과 Transform Block(TB)의 관계, 각 블록에서 읽는 정보를 살펴본다.

## 관련 항목

- [Ch 3: Sequence Header와 공간 구조](/blog/media/av1/part2-bitstream/chapter03-tiles-superblocks)
- [Ch 4: 블록 파티셔닝](/blog/media/av1/part3-blocks/chapter04-partitioning)
- [Ch 6: 블록 구조와 CB/TB](/blog/media/av1/part3-blocks/chapter06-block-structure)
