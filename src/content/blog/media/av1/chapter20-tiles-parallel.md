---
title: "Ch 20: 타일과 병렬 디코딩"
date: 2026-05-16T21:00:00
description: "AV1의 타일 시스템 — 독립적 디코딩, Tile Group OBU, 세그멘테이션."
tags: [AV1, Video, Codec, Tile, Parallel, Segmentation]
series: "AV1"
seriesOrder: 20
draft: true
---

지금까지 다룬 디코딩 과정은 모두 **단일 프레임 전체**를 순차적으로 처리했다. 4K나 8K 영상에서는 이 방식이 병목이 된다 — 프레임 하나가 워낙 커서 한 코어로는 실시간 처리가 불가능하다.

이 장에서는 **타일(Tile)** 시스템을 다룬다. 프레임을 독립적인 영역으로 나누어 병렬 처리를 가능하게 하는 기술이다. 또한 **세그멘테이션(Segmentation)**도 살펴본다 — 프레임 내 영역별로 다른 인코딩 파라미터를 적용하는 기능이다.

---

## 20.1 타일 구조

### 타일이란?

**타일**은 프레임을 분할한 직사각형 영역이다:

```
1920×1080 프레임을 2×2 타일로 분할:

┌──────────────┬──────────────┐
│              │              │
│    Tile 0    │    Tile 1    │
│   960×540    │   960×540    │
│              │              │
├──────────────┼──────────────┤
│              │              │
│    Tile 2    │    Tile 3    │
│   960×540    │   960×540    │
│              │              │
└──────────────┴──────────────┘
```

각 타일은 **완전히 독립적**으로 디코딩할 수 있다. 이것이 병렬 처리의 핵심이다.

### 타일 그리드 정의

타일은 **열(column) 경계**와 **행(row) 경계**로 정의한다:

```cpp
// 타일 그리드 구조
struct TileInfo {
    int tile_cols;           // 타일 열 수
    int tile_rows;           // 타일 행 수
    int tile_col_starts[64]; // 각 열의 시작 위치 (슈퍼블록 단위)
    int tile_row_starts[64]; // 각 행의 시작 위치 (슈퍼블록 단위)
};
```

두 가지 방식으로 지정할 수 있다:

**1. 균일 간격 (uniform spacing)**

```
tile_cols_log2 = 1 → 2열
tile_rows_log2 = 1 → 2행
→ 4개 타일, 모두 같은 크기

예: 1920×1080, 2×2
- 각 타일 = 960×540 (또는 슈퍼블록 경계로 반올림)
```

**2. 비균일 간격 (explicit sizing)**

```
개별 열/행 크기 명시:
tile_width_sb[0] = 20  (1280픽셀)
tile_width_sb[1] = 10  (640픽셀)

→ 왼쪽 타일이 더 큼 (2:1 비율)
```

파싱:

```cpp
void parse_tile_info(BitReader* br, TileInfo* ti, const FrameHeader* fh) {
    int sb_cols = (fh->frame_width + fh->sb_size - 1) / fh->sb_size;
    int sb_rows = (fh->frame_height + fh->sb_size - 1) / fh->sb_size;

    // 균일 간격 여부
    int uniform_tile_spacing = br->read_bit();

    if (uniform_tile_spacing) {
        // log2로 지정
        ti->tile_cols_log2 = br->read_bits(...);
        ti->tile_rows_log2 = br->read_bits(...);
        // 균일하게 분할
        compute_uniform_tile_starts(ti, sb_cols, sb_rows);
    } else {
        // 개별 크기 명시
        int start = 0;
        for (int i = 0; start < sb_cols; i++) {
            ti->tile_col_starts[i] = start;
            int width = br->read_ns(...) + 1;
            start += width;
        }
        ti->tile_cols = i;
        // 행도 유사하게...
    }
}
```

### 타일 간 독립성

**핵심**: 타일 경계를 넘는 참조가 불가능하다.

```
┌───────────────┬───────────────┐
│               │               │
│     A         │      B        │
│         ×←────┼───→×          │
│    Intra      │               │
│    예측에서    │               │
│   B 참조 불가  │               │
└───────────────┴───────────────┘
          타일 경계
```

영향받는 요소:

1. **Intra 예측**: 타일 경계 너머 픽셀 참조 불가
2. **엔트로피 코딩**: 타일별 독립 CDF (문맥 정보 공유 안 함)
3. **MV 예측**: 타일 경계 너머 MV 후보 불가
4. **Loop Filter**: 타일 경계에서 필터링 조건 변경

이 독립성 덕분에:
- 각 타일을 **별도 스레드**에서 동시에 디코딩 가능
- 타일 간 **의존성 없음** = 완전한 병렬화

### 타일 크기 제한

AV1 레벨에 따라 최대 타일 면적이 제한된다:

```
Level 2.0~2.1: 최대 2,097,152 루마 샘플 (약 1920×1080)
Level 3.0~3.1: 최대 2,097,152 루마 샘플
Level 4.0~4.1: 최대 4,194,304 루마 샘플 (약 2048×2048)
Level 5.0~5.1: 최대 8,912,896 루마 샘플 (약 4096×2176)
Level 6.0~6.3: 제한 완화
```

타일 하나가 이 제한을 초과하면 더 많은 타일로 분할해야 한다.

---

## 20.2 Tile Group OBU

### 비트스트림 구조

타일 데이터는 **OBU_TILE_GROUP**에 담긴다:

```
프레임 비트스트림:

┌─────────────────────┐
│ OBU_FRAME_HEADER    │  ← 프레임 헤더
└─────────────────────┘
┌─────────────────────┐
│ OBU_TILE_GROUP      │  ← 타일 그룹 (여러 개 가능)
│   tg_start = 0      │
│   tg_end = 3        │
│   tile_size[0..3]   │
│   tile_data[0..3]   │
└─────────────────────┘
```

여러 Tile Group OBU로 나눌 수도 있다:

```
┌───────────────────┐
│ OBU_TILE_GROUP    │
│   tg_start = 0    │
│   tg_end = 1      │  ← Tile 0, 1
│   tile_size[0,1]  │
│   tile_data[0,1]  │
└───────────────────┘
┌───────────────────┐
│ OBU_TILE_GROUP    │
│   tg_start = 2    │
│   tg_end = 3      │  ← Tile 2, 3
│   tile_size[2,3]  │
│   tile_data[2,3]  │
└───────────────────┘
```

### 파싱

```cpp
struct TileGroup {
    int tg_start;                // 시작 타일 인덱스
    int tg_end;                  // 끝 타일 인덱스
    int tile_size[MAX_TILES];    // 각 타일의 바이트 크기
    uint8_t* tile_data[MAX_TILES]; // 압축된 타일 데이터
};

void parse_tile_group(BitReader* br, TileGroup* tg, const TileInfo* ti) {
    int num_tiles = ti->tile_cols * ti->tile_rows;

    // 타일 범위 읽기
    if (num_tiles > 1) {
        int tile_bits = log2(num_tiles - 1) + 1;
        tg->tg_start = br->read_bits(tile_bits);
        tg->tg_end = br->read_bits(tile_bits);
    } else {
        tg->tg_start = 0;
        tg->tg_end = 0;
    }

    br->align_to_byte();  // 바이트 정렬

    // 각 타일 크기와 데이터
    for (int tile_idx = tg->tg_start; tile_idx <= tg->tg_end; tile_idx++) {
        if (tile_idx < tg->tg_end) {
            // 마지막 타일 제외: 크기 명시
            int size_bits = ti->tile_size_bytes * 8;
            tg->tile_size[tile_idx] = br->read_le(size_bits) + 1;
        } else {
            // 마지막 타일: 남은 모든 바이트
            tg->tile_size[tile_idx] = br->remaining_bytes();
        }

        // 타일 데이터 포인터 저장
        tg->tile_data[tile_idx] = br->current_position();
        br->skip_bytes(tg->tile_size[tile_idx]);
    }
}
```

### 병렬 디코딩

타일 크기를 먼저 읽으면 **동시에** 디코딩을 시작할 수 있다:

```cpp
void decode_tiles_parallel(Frame* frame, const TileGroup* tg,
                           const TileInfo* ti) {
    std::vector<std::thread> threads;

    for (int tile_idx = tg->tg_start; tile_idx <= tg->tg_end; tile_idx++) {
        threads.emplace_back([=]() {
            // 각 타일에 독립 BitReader 생성
            BitReader tile_br(tg->tile_data[tile_idx], tg->tile_size[tile_idx]);

            // 타일 위치 계산
            int tile_col = tile_idx % ti->tile_cols;
            int tile_row = tile_idx / ti->tile_cols;
            int start_sb_col = ti->tile_col_starts[tile_col];
            int start_sb_row = ti->tile_row_starts[tile_row];

            // 독립적으로 디코딩
            decode_single_tile(frame, &tile_br, tile_col, tile_row);
        });
    }

    // 모든 타일 완료 대기
    for (auto& t : threads) {
        t.join();
    }
}
```

### 타일 순서

타일은 **래스터 순서(raster order)**로 번호가 매겨진다:

```
2×2 타일:

┌─────┬─────┐
│  0  │  1  │
├─────┼─────┤
│  2  │  3  │
└─────┴─────┘

3×2 타일:

┌─────┬─────┬─────┐
│  0  │  1  │  2  │
├─────┼─────┼─────┤
│  3  │  4  │  5  │
└─────┴─────┴─────┘

tile_idx = tile_row × tile_cols + tile_col
```

---

## 20.3 세그멘테이션 (Segmentation)

### 개념

**세그멘테이션**은 프레임을 **논리적 영역**으로 분류하는 기능이다. 타일과 달리 임의의 모양이 가능하다:

```
영상:
┌────────────────────────────────┐
│       배경 (하늘)              │
│                                │
│        ┌────────┐              │
│        │  인물  │              │
│        │        │              │
│        └────────┘              │
│    배경 (땅)                    │
└────────────────────────────────┘

세그먼트 분류:
┌────────────────────────────────┐
│ segment_id = 0 (배경, 저품질)   │
│                                │
│        ┌────────┐              │
│        │seg = 1 │              │
│        │(인물,  │              │
│        │고품질) │              │
│        └────────┘              │
│ segment_id = 0                 │
└────────────────────────────────┘
```

최대 **8개 세그먼트**(segment_id = 0~7)를 정의할 수 있다.

### 세그먼트별 파라미터

각 세그먼트에 다른 인코딩 파라미터를 적용한다:

```cpp
enum SegmentFeature {
    SEG_LVL_ALT_Q,        // 양자화 오프셋
    SEG_LVL_ALT_LF_Y_V,   // 루마 수직 필터 오프셋
    SEG_LVL_ALT_LF_Y_H,   // 루마 수평 필터 오프셋
    SEG_LVL_ALT_LF_U,     // Cb 필터 오프셋
    SEG_LVL_ALT_LF_V,     // Cr 필터 오프셋
    SEG_LVL_REF_FRAME,    // 참조 프레임 강제
    SEG_LVL_SKIP,         // 잔차 스킵 강제
    SEG_LVL_GLOBALMV,     // Global Motion 강제
    SEG_LVL_MAX
};

struct SegmentationParams {
    bool enabled;
    bool update_map;      // 세그먼트 맵 업데이트 여부
    bool update_data;     // 세그먼트 파라미터 업데이트 여부
    bool temporal_update; // 이전 프레임 맵 예측 사용

    // 세그먼트별 기능 활성화 및 값
    bool feature_enabled[8][SEG_LVL_MAX];
    int feature_data[8][SEG_LVL_MAX];
};
```

### 주요 기능

**SEG_LVL_ALT_Q (양자화 오프셋)**:

```
기본 QP = 30

segment_id = 0: delta_q = 0   → QP = 30 (배경, 보통 품질)
segment_id = 1: delta_q = -10 → QP = 20 (인물, 고품질)
segment_id = 2: delta_q = +20 → QP = 50 (정적 영역, 저품질)
```

**SEG_LVL_SKIP (잔차 스킵)**:

```
segment_id = 2에 SKIP 설정:
→ 해당 영역의 모든 블록에 잔차 없음
→ 완전히 정적인 영역에 유용
→ 비트 대폭 절약
```

**SEG_LVL_REF_FRAME (참조 프레임 강제)**:

```
segment_id = 0 (배경): REF_FRAME = LAST_FRAME (고정)
segment_id = 1 (전경): REF_FRAME = 자유 선택

→ 배경은 항상 이전 프레임 참조 강제
→ 카메라 고정 영상에서 배경 처리 효율화
```

### 세그먼트 맵

각 블록의 segment_id는 **세그먼트 맵**에 저장된다:

```cpp
struct SegmentMap {
    int8_t map[MAX_SB_ROWS][MAX_SB_COLS][BLOCK_SIZES];
};

// 블록별 segment_id 파싱
int parse_segment_id(BitReader* br, const SegmentationParams* seg,
                     int mi_row, int mi_col) {
    if (!seg->enabled) {
        return 0;
    }

    if (seg->temporal_update) {
        // 이전 프레임 맵에서 예측
        int pred = get_predicted_segment_id(mi_row, mi_col);
        int use_pred = br->read_symbol(seg_pred_cdf);
        if (use_pred) {
            return pred;
        }
    }

    // 새 segment_id 파싱 (3비트)
    return br->read_symbol(segment_id_cdf);
}
```

세그먼트 맵은 프레임 간에 **유지**될 수 있다. `temporal_update`가 설정되면 이전 프레임의 segment_id를 예측자로 사용한다.

### 활용 사례

**1. 화상 회의 (ROI 인코딩)**:

```
┌────────────────────────────────┐
│  segment_id = 1 (배경)         │
│         QP = 45 (저품질)       │
│                                │
│     ┌──────────────┐          │
│     │ segment_id=0 │          │
│     │ (얼굴)       │          │
│     │ QP = 25      │          │
│     │ (고품질)     │          │
│     └──────────────┘          │
│                                │
└────────────────────────────────┘

→ 비트의 대부분을 얼굴에 집중
→ 체감 품질 향상 + 비트레이트 절감
```

**2. 스포츠 중계**:

```
┌────────────────────────────────┐
│    관중석 (segment_id = 2)      │
│         QP = 50                │
├────────────────────────────────┤
│    경기장 (segment_id = 0)      │
│         QP = 25                │
│                                │
│   ⚽ 공 (segment_id = 1)        │
│      QP = 20 (최고 품질)        │
│                                │
└────────────────────────────────┘

→ 시청자 관심 영역에 비트 집중
```

**3. 정적 배경 처리**:

```
segment_id = 0 (배경): SEG_LVL_SKIP + SEG_LVL_REF_FRAME = LAST
segment_id = 1 (전경): 자유

→ 배경 영역은 이전 프레임 그대로 복사
→ 잔차도 없음
→ 극단적 비트 절약
```

---

## 20.4 병렬 디코딩 전략

### 타일 vs 세그먼트

| 특성 | 타일 | 세그먼트 |
|------|------|----------|
| 목적 | 병렬 처리 | 품질 조절 |
| 모양 | 직사각형 그리드 | 임의 (블록 단위) |
| 독립성 | 완전 독립 (경계 참조 불가) | 상호 참조 가능 |
| 오버헤드 | 압축 효율 손실 | 세그먼트 맵 전송 필요 |

### 병렬 디코딩 구현

```cpp
class ParallelDecoder {
    ThreadPool pool;
    std::vector<Frame> tile_buffers;

public:
    void decode_frame(const OBU* frame_obu) {
        // 1단계: 프레임 헤더 파싱 (순차)
        FrameHeader fh;
        parse_frame_header(&fh);

        // 2단계: 타일 정보 파싱 (순차)
        TileInfo ti;
        parse_tile_info(&ti);

        // 3단계: 타일 크기 파싱 (순차)
        TileGroup tg;
        parse_tile_sizes(&tg, &ti);

        // 4단계: 타일 디코딩 (병렬!)
        std::vector<std::future<void>> futures;
        for (int t = 0; t < ti.tile_cols * ti.tile_rows; t++) {
            futures.push_back(pool.enqueue([=]() {
                decode_tile(t, &tg, &ti, &fh);
            }));
        }

        // 5단계: 완료 대기
        for (auto& f : futures) {
            f.get();
        }

        // 6단계: 루프 필터 (의존성 있음, 주의 필요)
        apply_loop_filters(&fh);
    }
};
```

### 루프 필터와 병렬 처리

루프 필터(디블로킹, CDEF, Loop Restoration)는 타일 경계에서 **주의**가 필요하다:

```
디블로킹:
- 타일 경계에서 필터 강도 조정
- loop_filter_across_tiles_enabled 플래그로 제어

CDEF:
- 타일 경계 너머 픽셀 참조 가능 (루프 외부)
- 64×64 슈퍼블록 단위로 처리

Loop Restoration:
- Restoration Unit이 타일 경계를 넘을 수 있음
- stripe 경계에서 처리 분리
```

```cpp
void apply_deblocking_with_tiles(Frame* frame, const TileInfo* ti,
                                 bool filter_across_tiles) {
    for (int edge_y = 0; edge_y < frame->height; edge_y++) {
        for (int edge_x = 0; edge_x < frame->width; edge_x++) {
            // 타일 경계인가?
            bool is_tile_boundary = is_at_tile_boundary(edge_x, edge_y, ti);

            if (is_tile_boundary && !filter_across_tiles) {
                continue;  // 타일 경계에서 필터링 스킵
            }

            apply_deblock_edge(frame, edge_x, edge_y);
        }
    }
}
```

---

## 20.5 병렬 처리의 비용

타일로 분할하면 **압축 효율이 떨어진다**:

```
1×1 타일 (타일 없음):
- 모든 예측이 전체 프레임 참조 가능
- 최고 압축 효율
- 병렬 처리 불가

4×4 타일 (16개):
- 타일 경계에서 예측 끊김
- 각 타일 독립 CDF → 적응 느림
- 비트레이트 ~5~10% 증가
- 16-way 병렬 처리 가능
```

트레이드오프:

```
병렬성 ↑ = 타일 수 ↑ = 압축 효율 ↓

4K 60fps 예시:
- 1×1 타일: 압축 최적, 단일 코어 처리 불가능
- 4×4 타일: 압축 5% 손실, 16코어 활용 가능

→ 실시간 디코딩을 위해 약간의 효율 손실 감수
```

---

## 정리

이 장에서 배운 내용:

- **타일**: 프레임을 독립적인 직사각형으로 분할
- **타일 간 독립성**: Intra/Inter 예측, 엔트로피 코딩 모두 독립 → 완전 병렬화 가능
- **Tile Group OBU**: 타일 크기 먼저 파싱 → 동시 디코딩 시작
- **세그멘테이션**: 최대 8개 논리 영역으로 분류
- **세그먼트 기능**: 양자화 오프셋, 필터 오프셋, 참조 프레임 강제, 잔차 스킵
- **활용**: ROI 인코딩, 화상 회의, 스포츠 중계
- **트레이드오프**: 병렬성 ↑ = 압축 효율 ↓

타일은 **물리적 분할** (병렬 처리용), 세그멘테이션은 **논리적 분류** (품질 조절용)이다.

---

## 다음 장 예고

Ch 21에서는 **Superres와 Scalability**를 다룬다. 저비트레이트에서 해상도를 축소해서 인코딩한 뒤 디코더에서 업스케일하는 Superres, 그리고 여러 해상도/프레임레이트를 하나의 비트스트림에 담는 Scalability를 살펴본다.

---

## 관련 항목

- [Ch 3: Sequence Header와 타일](/blog/media/av1/chapter02-bitstream/05-sequence-header) — 타일 설정
- [Ch 16: 디블로킹 필터](/blog/media/av1/chapter16-deblocking) — 타일 경계 처리
- [Ch 21: Superres와 Scalability](/blog/media/av1/chapter21-superres-scalability) — 확장성
