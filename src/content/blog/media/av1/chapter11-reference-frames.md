---
title: "Ch 11: 참조 프레임"
date: 2026-05-16T12:00:00
description: "AV1의 참조 프레임 시스템 — 8개 슬롯, 7개 명명된 참조, ALTREF, refresh_frame_flags."
tags: [AV1, Video, Codec, Reference Frame, ALTREF]
series: "AV1"
seriesOrder: 11
draft: true
---

지금까지 **Intra 프레임**을 디코딩했다. Intra 프레임은 다른 프레임을 참조하지 않고 자체적으로 완결된다. 하지만 비디오의 대부분은 **Inter 프레임**이다. Inter 프레임은 **이전 프레임을 참조**하여 예측한다. 이 장에서는 과거 프레임을 기억하고 재활용하는 **참조 프레임 시스템**을 살펴본다.

---

## 11.1 Reference Frame Buffer — 8개의 기억 슬롯

### 버퍼 구조

AV1은 **8개의 참조 프레임 슬롯**을 가진다 (스펙 Section 7.20):

```cpp
struct RefFrameBuffer {
    uint8_t* Y;              // 루마 평면 데이터
    uint8_t* U;              // Cb 평면 데이터
    uint8_t* V;              // Cr 평면 데이터
    int width;               // 프레임 너비
    int height;              // 프레임 높이
    int frame_type;          // KEY, INTER, INTRA_ONLY, S
    int order_hint;          // 프레임 순서 힌트
    int8_t* mv_map;          // Motion Vector 맵 (MFMV용)
    bool valid;              // 슬롯이 유효한지
};

RefFrameBuffer ref_frames[8];  // 8개 슬롯
```

### 슬롯 인덱스

```
슬롯 0  ┌──────────────────┐
        │ Frame Data       │
        │ (Y, U, V, MV)    │
        └──────────────────┘
슬롯 1  ┌──────────────────┐
        │ Frame Data       │
        └──────────────────┘
   ...
슬롯 7  ┌──────────────────┐
        │ Frame Data       │
        └──────────────────┘
```

각 슬롯에는 완전히 디코딩된 프레임의 **YUV 데이터**, **MV 맵**, **메타데이터**가 저장된다.

---

## 11.2 7개 명명된 참조

8개 슬롯 중 최대 **7개를 동시에 참조**할 수 있다. 각 참조에는 의미 있는 이름이 부여된다 (스펙 Section 6.8.2):

| 이름 | 의미 | 시간 방향 |
|------|------|-----------|
| **LAST_FRAME** | 가장 최근 과거 프레임 | 과거 |
| **LAST2_FRAME** | 두 번째 최근 과거 | 과거 |
| **LAST3_FRAME** | 세 번째 최근 과거 | 과거 |
| **GOLDEN_FRAME** | 장기 참조 (고품질) | 과거 |
| **BWDREF_FRAME** | 가까운 미래 참조 | 미래 |
| **ALTREF2_FRAME** | 중간 미래 참조 | 미래 |
| **ALTREF_FRAME** | 먼 미래 참조 (시간 필터링) | 미래 |

### ref_frame_idx — 이름과 슬롯의 매핑

Frame Header에서 **ref_frame_idx[7]** 배열을 읽어 명명된 참조와 슬롯을 연결한다:

```cpp
// Frame Header에서 파싱
int ref_frame_idx[7];  // 각 명명된 참조가 어느 슬롯을 가리키는지

// 예시
ref_frame_idx[0] = 2;  // LAST_FRAME → 슬롯 2
ref_frame_idx[1] = 3;  // LAST2_FRAME → 슬롯 3
ref_frame_idx[2] = 4;  // LAST3_FRAME → 슬롯 4
ref_frame_idx[3] = 1;  // GOLDEN_FRAME → 슬롯 1
ref_frame_idx[4] = 5;  // BWDREF_FRAME → 슬롯 5
ref_frame_idx[5] = 6;  // ALTREF2_FRAME → 슬롯 6
ref_frame_idx[6] = 0;  // ALTREF_FRAME → 슬롯 0
```

```
명명된 참조              슬롯
┌─────────────┐         ┌───────┐
│ LAST_FRAME  │ ──────→ │ [2]   │
├─────────────┤         ├───────┤
│ LAST2_FRAME │ ──────→ │ [3]   │
├─────────────┤         ├───────┤
│ LAST3_FRAME │ ──────→ │ [4]   │
├─────────────┤         ├───────┤
│ GOLDEN      │ ──────→ │ [1]   │
├─────────────┤         ├───────┤
│ BWDREF      │ ──────→ │ [5]   │
├─────────────┤         ├───────┤
│ ALTREF2     │ ──────→ │ [6]   │
├─────────────┤         ├───────┤
│ ALTREF      │ ──────→ │ [0]   │
└─────────────┘         └───────┘
```

### 명명된 참조의 의미

**LAST 계열 (과거 참조):**
- **LAST_FRAME**: 표시 순서에서 바로 직전 프레임. 가장 자주 사용.
- **LAST2_FRAME**: 두 프레임 전. 급격한 움직임이나 가림 해결에 유용.
- **LAST3_FRAME**: 세 프레임 전. 더 긴 시간 참조.

**GOLDEN_FRAME (장기 참조):**
- 주기적으로 갱신되는 고품질 참조 프레임.
- 장면 전환 후 첫 프레임이나 I-프레임 품질의 프레임.
- 여러 프레임에 걸쳐 참조될 수 있음.

**미래 참조:**
- **BWDREF_FRAME**: 가까운 미래. 양방향 예측의 한 축.
- **ALTREF2_FRAME**: 중간 거리 미래.
- **ALTREF_FRAME**: 가장 먼 미래. 시간 필터링으로 생성된 특수 프레임.

---

## 11.3 Reference Frame Update

### refresh_frame_flags

프레임 디코딩 완료 후 **어떤 슬롯을 현재 프레임으로 갱신할지** 결정한다 (스펙 Section 5.9.2):

```
refresh_frame_flags = 8-bit 비트마스크

bit i = 1이면 → ref_frames[i]를 현재 프레임으로 갱신
bit i = 0이면 → ref_frames[i] 유지
```

**예시:**

```
refresh_frame_flags = 0b00010010 (0x12)
                        ↑  ↑
                        │  └─ 슬롯 1 갱신
                        └──── 슬롯 4 갱신

나머지 슬롯(0, 2, 3, 5, 6, 7)은 유지
```

### 프레임 타입별 갱신 패턴

| 프레임 타입 | 일반적인 refresh_frame_flags | 의미 |
|-------------|------------------------------|------|
| KEY_FRAME | 0xFF (모든 슬롯) | 새 시퀀스 시작 |
| INTER (일반) | 특정 슬롯만 | LAST 슬롯 갱신 |
| INTRA_ONLY | 상황에 따라 | 컨텍스트 리셋 |
| S_FRAME | 특정 슬롯 | 스위칭 포인트 |

### update_reference_frames 구현

```cpp
void update_reference_frames(uint8_t refresh_flags) {
    for (int i = 0; i < 8; i++) {
        if (refresh_flags & (1 << i)) {
            // 슬롯 i를 현재 프레임으로 갱신
            copy_frame(&ref_frames[i], &current_frame);
            ref_frames[i].order_hint = current_order_hint;
            ref_frames[i].frame_type = current_frame_type;
            ref_frames[i].valid = true;

            // MV 맵도 저장 (MFMV용)
            copy_mv_map(&ref_frames[i].mv_map, &current_mv_map);
        }
    }
}
```

### 갱신 타이밍

```
Frame 디코딩 완료
        ↓
   [Loop Filter]
        ↓
    [CDEF]
        ↓
 [Loop Restoration]
        ↓
  update_reference_frames()  ← 여기서 갱신
        ↓
    다음 프레임 처리
```

필터링 **후**에 갱신하므로, 참조 프레임은 **최종 품질**의 픽셀을 포함한다.

---

## 11.4 ALTREF Frame — 보이지 않는 미래의 참조

### 개념

ALTREF(Alternative Reference)는 **화면에 표시되지 않는 참조 전용 프레임**이다:

```
show_frame = 0      ← 화면에 표시 안 함
show_existing_frame = 0
```

**왜 필요한가?**

인코더가 **미래 N개 프레임을 시간적으로 필터링**하여 노이즈가 줄어든 "깨끗한" 프레임을 생성한다. 이 프레임을 참조로 사용하면 **예측 정확도가 향상**된다.

### Temporal Filtering

여러 프레임의 동일 영역을 **가중 평균**한다:

```
ALTREF = weighted_avg(Frame[-2], Frame[-1], Frame[0], Frame[+1], Frame[+2])
```

마치 **장노출(long exposure) 사진**과 유사하다:
- 정적 배경: 선명하게
- 노이즈: 평균화로 제거
- 움직이는 물체: 모션 보정 후 평균

### ALTREF의 디코딩 흐름

```
디코딩 순서:  [KEY] → [F1] → [F2] → [ALTREF] → [F3] → [F4] → [OVERLAY]
                                      ↑
                              show_frame = 0 (표시 안 함)
                              참조로만 사용
```

ALTREF는:
1. 비트스트림에 존재
2. 디코딩 수행
3. 참조 버퍼에 저장
4. **화면에는 표시 안 함**
5. 이후 프레임들이 이 프레임을 참조

---

## 11.5 Overlay Frame — show_existing_frame

### 개념

**이미 버퍼에 있는 프레임을 화면에 표시**한다 (스펙 Section 5.9.2):

```
show_existing_frame = 1
frame_to_show_map_idx = 슬롯 번호
```

**디코딩 비용 = 0**. 새로 디코딩하지 않고 버퍼의 프레임을 그대로 출력한다.

### 표시 순서 vs 디코딩 순서

```
시간(표시 순서) →  0    1    2    3    4    5    6    7

디코딩 순서:    [KEY] [P1] [P2] [ALT] [P3] [P4] [OVL]
                 ↓    ↓    ↓    ↓    ↓    ↓    ↓
표시 순서:     [KEY] [P1] [P2] [P3] [P4] [OVL] ← ALT와 같은 내용
                            ↑              ↑
                       표시 안 함      show_existing_frame=1
```

- **ALTREF**는 디코딩 순서 4에서 디코딩되지만 **표시되지 않음**
- **OVERLAY**는 디코딩 순서 7에서 **디코딩 없이** ALTREF를 표시

### show_existing_frame 처리

```cpp
void decode_frame_header() {
    if (show_existing_frame) {
        int idx = frame_to_show_map_idx;

        // 디코딩 없이 버퍼의 프레임 출력
        output_frame(&ref_frames[idx]);

        // refresh_frame_flags에 따라 슬롯 갱신
        update_reference_frames(refresh_frame_flags);

        return;  // 프레임 디코딩 생략
    }

    // 정상 디코딩 진행...
}
```

---

## 11.6 GOP (Group of Pictures) 구조

### 계층적 참조 구조

```
      ┌────────────── GOP ──────────────┐
      │                                 │
      KEY ──→ P ──→ P ──→ ALT ──→ P ──→ OVL
       │       │    │      ↑      │      │
       │       │    │      │      │      │
       │       └────┴──────┘      │      │
       │           참조           │      │
       └──────────────────────────┘      │
                   장기 참조             │
                                         │
                                 (ALT 내용 표시)
```

### 양방향 예측

ALTREF 덕분에 **과거와 미래 모두 참조** 가능:

```
Frame F3의 참조 가능 프레임:

과거 참조:  KEY, F1, F2 (LAST, LAST2, LAST3)
미래 참조:  ALTREF (표시 순서상 F7과 유사)

F3 = weighted_prediction(LAST, ALTREF)
     ↑
     양방향 예측으로 더 정확한 결과
```

---

## 11.7 H.264와의 비교

### H.264의 참조 프레임 관리

```
H.264:
- List 0: 과거 참조 (최대 16개)
- List 1: 미래 참조 (최대 16개)
- 인덱스로 참조 (list0_ref_idx, list1_ref_idx)
- 참조 픽처 리스트 재정렬 (RPLR) 복잡함
```

### AV1의 참조 프레임 관리

```
AV1:
- 8개 슬롯, 7개 명명된 참조
- 의미론적 이름 (LAST, GOLDEN, ALTREF)
- ref_frame_idx로 슬롯 매핑
- 직관적이고 명확한 구조
```

### 비교 표

| 특성 | H.264 | AV1 |
|------|-------|-----|
| 슬롯 수 | 16 (DPB) | 8 |
| 동시 참조 수 | List별 최대 16 | 7 |
| 참조 방식 | 인덱스 기반 | 명명된 참조 |
| 복잡도 | 높음 (RPLR) | 낮음 |
| 양방향 예측 | B-프레임 | ALTREF 기반 |

---

## 11.8 참조 프레임 버퍼 상태 추적

디버깅을 위해 각 프레임 디코딩 전후로 버퍼 상태를 출력한다:

```cpp
void dump_ref_buffer_state(const char* stage) {
    printf("=== Reference Buffer State (%s) ===\n", stage);
    printf("Slot | Valid | Type | Order | Resolution\n");
    printf("-----|-------|------|-------|------------\n");

    for (int i = 0; i < 8; i++) {
        if (ref_frames[i].valid) {
            printf("  %d  |   Y   | %4s | %5d | %dx%d\n",
                   i,
                   frame_type_name(ref_frames[i].frame_type),
                   ref_frames[i].order_hint,
                   ref_frames[i].width,
                   ref_frames[i].height);
        } else {
            printf("  %d  |   N   |  -   |   -   |   -\n", i);
        }
    }

    printf("\nNamed References:\n");
    for (int i = 0; i < 7; i++) {
        printf("  %s → slot %d\n",
               ref_name[i], ref_frame_idx[i]);
    }
    printf("\n");
}
```

**출력 예시:**

```
=== Reference Buffer State (After Frame 3) ===
Slot | Valid | Type | Order | Resolution
-----|-------|------|-------|------------
  0  |   Y   |  KEY |     0 | 1920x1080
  1  |   Y   | INTR |     1 | 1920x1080
  2  |   Y   | INTR |     2 | 1920x1080
  3  |   Y   | INTR |     3 | 1920x1080
  4  |   N   |  -   |   -   |   -
  5  |   N   |  -   |   -   |   -
  6  |   N   |  -   |   -   |   -
  7  |   N   |  -   |   -   |   -

Named References:
  LAST_FRAME → slot 3
  LAST2_FRAME → slot 2
  LAST3_FRAME → slot 1
  GOLDEN_FRAME → slot 0
  BWDREF_FRAME → slot 4
  ALTREF2_FRAME → slot 5
  ALTREF_FRAME → slot 6
```

---

## 정리

1. **8개 슬롯**: RefFrameBuffer[8]에 디코딩된 프레임 저장.

2. **7개 명명된 참조**: LAST, LAST2, LAST3, GOLDEN, BWDREF, ALTREF2, ALTREF.

3. **ref_frame_idx**: 명명된 참조와 슬롯의 매핑 테이블.

4. **refresh_frame_flags**: 8-bit 비트마스크로 어떤 슬롯을 갱신할지 결정.

5. **ALTREF**: show_frame=0인 참조 전용 프레임, 시간 필터링으로 생성.

6. **Overlay**: show_existing_frame=1로 버퍼의 프레임을 디코딩 없이 출력.

7. **GOP 구조**: 계층적 참조로 양방향 예측 지원.

8. **H.264 대비 장점**: 명명된 슬롯으로 직관적, RPLR 없이 단순.

---

## 다음 장 예고

Ch 12에서는 **Inter 예측**을 다룬다. 참조 프레임에서 현재 블록을 예측하는 핵심 메커니즘인 **Motion Vector**, **서브픽셀 보간**, **MV 예측**을 살펴본다.

---

## 관련 항목

- [Ch 10: 프레임 조립](/blog/media/av1/chapter10-frame-assembly) — 첫 프레임 완성
- [Ch 12: Inter 예측](/blog/media/av1/chapter12-inter-prediction) — Motion Vector와 보간
- [Ch 5: Frame Header](/blog/media/av1/chapter05-prediction-overview) — ref_frame_idx 파싱
