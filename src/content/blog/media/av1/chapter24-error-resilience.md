---
title: "Ch 24: Error Resilience"
date: 2026-05-16T01:00:00
description: "AV1의 Error Resilience — error_resilient_mode, Switch Frame, Redundant Frame Header, 에러 복원 전략."
tags: [AV1, Video, Codec, Error Resilience, Recovery]
series: "AV1"
seriesOrder: 24
draft: true
---

이번 장에서는 AV1의 **Error Resilience**(에러 복원) 기능을 살펴본다. 네트워크 전송 중 발생하는 에러 상황에서 디코더가 어떻게 대응하는지, 인코더가 어떤 도구를 활용할 수 있는지를 다룬다.

---

## 24.1 비디오 전송에서의 에러

### 24.1.1 에러 발생 원인

비디오 전송 중 에러가 발생하는 주요 원인:

```
┌─────────────────────────────────────────────────────────────┐
│  에러 발생 시나리오                                          │
│                                                             │
│  1. 패킷 손실 (Packet Loss)                                 │
│     - UDP 기반 스트리밍 (RTP, WebRTC)                       │
│     - 네트워크 혼잡 시 라우터에서 패킷 폐기                 │
│     - 재전송 없음 (실시간 요구사항)                         │
│                                                             │
│  2. 비트 에러 (Bit Error)                                   │
│     - 무선 전송 (Wi-Fi, 5G, 위성)                          │
│     - 열악한 네트워크 환경                                  │
│     - 체크섬 실패 → 패킷 폐기                               │
│                                                             │
│  3. 지연 변동 (Jitter)                                      │
│     - 패킷 도착 시간 불균일                                 │
│     - 버퍼 언더런 → 프레임 누락                            │
└─────────────────────────────────────────────────────────────┘
```

### 24.1.2 에러 드리프트 (Error Drift)

비디오 코덱의 **시간적 예측** 특성 때문에 에러가 **누적**된다.

```
┌─────────────────────────────────────────────────────────────┐
│  에러 드리프트 현상                                          │
│                                                             │
│  시간 →                                                      │
│  [Key] → [P1] → [P2] → [P3] → [P4] → [Key] →              │
│                   ↑                                         │
│               에러 발생                                      │
│                                                             │
│  P2 손상:                                                   │
│  - P2가 P1 참조 → P2 화면 깨짐                             │
│  - P3가 P2 참조 → P3도 화면 깨짐 (전파)                    │
│  - P4가 P3 참조 → P4도 화면 깨짐 (누적)                    │
│  - 다음 Key Frame까지 에러 지속                            │
│                                                             │
│  시각적 증상:                                               │
│  - 블록 깨짐이 점점 심해짐                                  │
│  - 색상 오류가 퍼져나감                                     │
│  - 움직임이 어색해짐                                        │
└─────────────────────────────────────────────────────────────┘
```

```cpp
// 에러 전파 예시
struct FrameBuffer {
    bool corrupted[8];  // 각 참조 프레임의 손상 여부

    bool is_processable(int ref_idx) {
        // 참조 프레임이 손상되었으면 현재 프레임도 신뢰 불가
        return !corrupted[ref_idx];
    }
};
```

---

## 24.2 AV1의 에러 복원 도구

### 24.2.1 error_resilient_mode

**AV1 스펙 섹션 5.9.3** (uncompressed_header):

```cpp
// Frame Header에서 error_resilient_mode 플래그
struct FrameHeader {
    bool error_resilient_mode;
    // ...
};

// error_resilient_mode = 1일 때:
// 1. CDF(확률 분포)를 기본값으로 리셋
// 2. 이전 프레임의 CDF 적응 결과에 의존하지 않음
// 3. 프레임 순서 힌트 사용 제한
```

활성화 시 동작:

```
┌─────────────────────────────────────────────────────────────┐
│  error_resilient_mode 효과                                  │
│                                                             │
│  일반 모드:                                                 │
│  [Frame N-1] ──CDF 전달──> [Frame N] ──CDF 전달──> [Frame N+1]
│                                                             │
│  에러 발생 시:                                              │
│  [Frame N-1] ──?──> [Frame N (손상)] ──?──> [Frame N+1]     │
│                      CDF 손상 전파                          │
│                                                             │
│  error_resilient_mode:                                      │
│  [Frame N-1]   [Frame N]   [Frame N+1]                      │
│                  ↓            ↓                             │
│              기본 CDF      기본 CDF                         │
│              (독립)        (독립)                           │
│                                                             │
│  장점: CDF 손상 전파 차단                                   │
│  단점: CDF 적응 혜택 상실 → 압축 효율 약간 감소             │
└─────────────────────────────────────────────────────────────┘
```

### 24.2.2 Processable Frames

**AV1 스펙 Annex C.2** (Processable Frames):

디코더가 **"안전하게 처리 가능한"** 프레임을 판별하는 규칙이다.

```cpp
// Processable 프레임 판별
bool is_processable(const Frame& frame, const FrameBuffer& buffer) {
    // Key Frame: 항상 processable (완전 독립)
    if (frame.frame_type == KEY_FRAME) {
        return true;
    }

    // Intra-only Frame: 항상 processable
    if (frame.frame_type == INTRA_ONLY_FRAME) {
        return true;
    }

    // Inter Frame: 모든 참조 프레임이 processable이고 손상되지 않아야 함
    for (int i = 0; i < REFS_PER_FRAME; i++) {
        int ref_idx = frame.ref_frame_idx[i];
        if (frame.uses_reference[i]) {
            // 참조가 유효하고 손상되지 않았는지 확인
            if (!buffer.ref_valid[ref_idx] || buffer.corrupted[ref_idx]) {
                return false;
            }
        }
    }

    return true;
}
```

```
Processable 판별 규칙:

processable(frame) =
    frame.type == KEY_FRAME ||
    frame.type == INTRA_ONLY_FRAME ||
    (all ref in frame.references:
        processable(ref) && !corrupted(ref))
```

### 24.2.3 Decoder Consequences

**AV1 스펙 Annex C.3** (Decoder Consequences):

손상 프레임 감지 시 디코더의 행동:

```cpp
class ErrorResilientDecoder {
    FrameBuffer buffer;

public:
    void on_frame_received(const Frame& frame) {
        // 1. 손상 감지 (CRC 실패, 파싱 에러 등)
        bool corrupted = detect_corruption(frame);

        if (corrupted) {
            // 2. 해당 프레임 폐기 (디스플레이 안 함)
            discard_frame(frame);

            // 3. 참조 버퍼에서 해당 프레임 마킹
            mark_corrupted(frame);

            return;
        }

        // 4. Processable 검사
        if (!is_processable(frame, buffer)) {
            // 참조가 손상됨 → 디코딩해도 신뢰 불가
            discard_frame(frame);
            mark_corrupted(frame);
            return;
        }

        // 5. 정상 디코딩
        decode_frame(frame);
    }

    void on_key_frame_received(const Frame& key_frame) {
        // Key Frame 도착 → 완전 복구
        reset_all_corruption_flags();
        decode_frame(key_frame);
    }

private:
    void mark_corrupted(const Frame& frame) {
        // refresh_frame_flags에 해당하는 슬롯에 손상 마킹
        for (int i = 0; i < 8; i++) {
            if (frame.refresh_frame_flags & (1 << i)) {
                buffer.corrupted[i] = true;
            }
        }
    }
};
```

### 24.2.4 Switch Frame (S-Frame)

**Switch Frame**은 **어떤 참조 상태에서든 디코딩 가능**하도록 설계된 특수 프레임이다.

```
┌─────────────────────────────────────────────────────────────┐
│  Switch Frame 용도                                          │
│                                                             │
│  시나리오: 적응형 스트리밍에서 품질 전환                    │
│                                                             │
│  품질 1 (720p):  [K1] → [P] → [P] → [P] → ...              │
│  품질 2 (1080p): [K2] → [P] → [P] → [S] → [P] → ...        │
│                                      ↑                      │
│                                 Switch Frame                │
│                                                             │
│  클라이언트가 720p에서 1080p로 전환 시:                     │
│  - S-Frame은 참조 상태와 무관하게 디코딩 가능               │
│  - 즉시 전환 가능 (Key Frame까지 기다릴 필요 없음)          │
│  - Key Frame보다 효율적 (일부 Inter 참조 허용)             │
└─────────────────────────────────────────────────────────────┘
```

```cpp
// Switch Frame 특성
struct SwitchFrame {
    // frame_type == SWITCH_FRAME

    // 특별 규칙:
    // 1. 이전 Key Frame의 참조만 사용 가능
    // 2. 모든 블록이 S-frame 참조 규칙을 따름
    // 3. CDF는 기본값으로 리셋
};

// S-Frame 디코딩
void decode_switch_frame(const Frame& sframe) {
    // 참조 상태 리셋
    reset_reference_state();

    // 기본 CDF로 디코딩
    use_default_cdf();

    // 디코딩
    decode_frame(sframe);
}
```

---

## 24.3 Redundant Frame Header

### 24.3.1 목적

**Redundant Frame Header OBU** (OBU 타입 7)은 Frame Header의 **사본**을 별도로 전송한다.

```
┌─────────────────────────────────────────────────────────────┐
│  Redundant Frame Header 목적                                │
│                                                             │
│  일반 비트스트림:                                           │
│  [Frame Header OBU] [Tile Group OBU] [Tile Group OBU] ...  │
│          ↓                                                  │
│     Frame Header 손실 시 전체 프레임 디코딩 불가           │
│                                                             │
│  Redundant Frame Header 사용:                               │
│  [Frame Header OBU] [Redundant FH] [Tile Group] [Tile Group]│
│          ↓              ↓                                   │
│     원본 손실        사본으로 복구                          │
└─────────────────────────────────────────────────────────────┘
```

### 24.3.2 OBU 구조

**AV1 스펙 섹션 5.3.2** (OBU Types):

```cpp
// OBU 타입
enum OBUType {
    OBU_SEQUENCE_HEADER = 1,
    OBU_TEMPORAL_DELIMITER = 2,
    OBU_FRAME_HEADER = 3,
    OBU_TILE_GROUP = 4,
    OBU_METADATA = 5,
    OBU_FRAME = 6,
    OBU_REDUNDANT_FRAME_HEADER = 7,  // Redundant Frame Header
    OBU_TILE_LIST = 8,
    OBU_PADDING = 15,
};

// Redundant Frame Header OBU
// 내용: Frame Header OBU와 완전히 동일
// 디코더: 먼저 도착한 것 사용
```

### 24.3.3 사용 예시

```cpp
// 인코더: Redundant Frame Header 생성
void write_frame_with_redundancy(BitstreamWriter& bw, const Frame& frame) {
    // 원본 Frame Header
    write_obu(bw, OBU_FRAME_HEADER, frame.header);

    // Redundant Frame Header (동일 내용)
    write_obu(bw, OBU_REDUNDANT_FRAME_HEADER, frame.header);

    // Tile Groups
    for (const auto& tile_group : frame.tile_groups) {
        write_obu(bw, OBU_TILE_GROUP, tile_group);
    }
}

// 디코더: Redundant Frame Header 처리
void parse_redundant_frame_header(BitReader& br) {
    // 이미 Frame Header를 파싱했으면 무시
    if (frame_header_parsed) {
        skip_obu(br);
        return;
    }

    // Frame Header가 손실되었으면 사용
    parse_frame_header(br);
    frame_header_parsed = true;
}
```

---

## 24.4 실전 에러 복원 전략

### 24.4.1 Intra Refresh

**Intra Refresh**는 주기적으로 프레임 일부를 **강제 Intra 코딩**하여 에러 전파를 **공간적으로 차단**한다.

```
┌─────────────────────────────────────────────────────────────┐
│  Intra Refresh 패턴                                         │
│                                                             │
│  방식 1: Column Intra Refresh (CIR)                        │
│  ┌────────────────────────────────────┐                     │
│  │ I │   │   │   │   │   │   │   │   │  Frame N            │
│  │   │ I │   │   │   │   │   │   │   │  Frame N+1          │
│  │   │   │ I │   │   │   │   │   │   │  Frame N+2          │
│  │   │   │   │ I │   │   │   │   │   │  Frame N+3          │
│  └────────────────────────────────────┘                     │
│  매 프레임마다 다른 열을 Intra로 코딩                       │
│                                                             │
│  방식 2: Adaptive Intra Refresh (AIR)                      │
│  - 에러 발생 영역 주변을 Intra로 갱신                       │
│  - 피드백 기반 (NACK 수신 시)                              │
└─────────────────────────────────────────────────────────────┘
```

```cpp
// Column Intra Refresh 인코더
class ColumnIntraRefresh {
    int refresh_period;  // 전체 열 갱신 주기 (프레임 수)
    int current_column;

public:
    void on_encode_frame(Frame& frame) {
        // 현재 열의 모든 블록을 Intra로 강제
        int col = current_column;
        for (int row = 0; row < frame.rows; row++) {
            frame.blocks[row][col].force_intra = true;
        }

        // 다음 열로 이동
        current_column = (current_column + 1) % frame.cols;
    }
};
```

### 24.4.2 Reference Frame 순환

**참조 체인 길이를 제한**하여 에러 전파 범위를 줄인다.

```
┌─────────────────────────────────────────────────────────────┐
│  Reference Frame 순환 전략                                  │
│                                                             │
│  문제 (긴 참조 체인):                                       │
│  [Key] → P → P → P → P → P → P → P → [Key]                │
│          └──────────────────────────────┘                   │
│               에러가 오래 지속                              │
│                                                             │
│  해결 (Golden Frame 주기적 갱신):                          │
│  [Key] → P → P → [G] → P → P → [G] → P → [Key]            │
│                   ↑             ↑                           │
│              Golden Frame    Golden Frame                   │
│              (독립적 복구 포인트)                           │
│                                                             │
│  Golden Frame 특성:                                         │
│  - Key Frame보다 효율적 (일부 참조 허용)                   │
│  - 에러 발생 시 Golden Frame으로 복구                      │
│  - 참조 체인 끊기                                          │
└─────────────────────────────────────────────────────────────┘
```

```cpp
// Golden Frame 관리
class GoldenFrameManager {
    int golden_interval;  // Golden Frame 간격 (프레임 수)
    int frames_since_golden;

public:
    bool should_encode_golden() {
        frames_since_golden++;
        if (frames_since_golden >= golden_interval) {
            frames_since_golden = 0;
            return true;
        }
        return false;
    }

    void encode_golden_frame(Frame& frame) {
        // GOLDEN_FRAME 슬롯에 저장되도록 설정
        frame.refresh_frame_flags |= (1 << GOLDEN_FRAME_IDX);

        // 품질 높게 인코딩 (더 많은 비트 할당)
        frame.qp = frame.base_qp - 4;
    }
};
```

### 24.4.3 Forward Error Correction (FEC)

전송 계층에서 **오류 정정 코드**를 추가한다.

```
┌─────────────────────────────────────────────────────────────┐
│  FEC 예시 (Reed-Solomon)                                    │
│                                                             │
│  데이터 패킷: [P1] [P2] [P3] [P4]                           │
│  FEC 패킷:   [F1] [F2]                                      │
│                                                             │
│  전송: [P1] [P2] [P3] [P4] [F1] [F2]                       │
│                 ↓                                           │
│  손실: [P1] [  ] [P3] [P4] [F1] [F2]                       │
│                                                             │
│  복구: FEC로 P2 복원 가능 (4개 중 4개 수신 시)             │
│                                                             │
│  비용: 대역폭 오버헤드 (이 예에서 50%)                     │
└─────────────────────────────────────────────────────────────┘
```

### 24.4.4 WebRTC에서의 적용

```cpp
// WebRTC 에러 복원 설정 예시
struct WebRTCErrorResilienceConfig {
    bool error_resilient_mode = true;
    bool use_golden_frames = true;
    int golden_interval = 30;  // 30프레임마다

    // FEC 설정
    bool enable_fec = true;
    float fec_overhead = 0.2;  // 20% 오버헤드

    // NACK 재전송
    bool enable_nack = true;
    int max_nack_retries = 3;

    // 적응형 대응
    void on_packet_loss_detected(float loss_rate) {
        if (loss_rate > 0.05) {
            // 손실률 5% 초과 → FEC 강화
            fec_overhead = 0.3;
            // Golden 간격 줄임
            golden_interval = 15;
        }
    }
};
```

---

## 24.5 에러 감지 방법

### 24.5.1 비트스트림 레벨 감지

```cpp
class BitstreamErrorDetector {
public:
    bool check_frame(const Frame& frame) {
        // 1. OBU 크기 검증
        if (!verify_obu_sizes(frame)) {
            return false;
        }

        // 2. Syntax 요소 범위 검사
        if (!verify_syntax_ranges(frame)) {
            return false;
        }

        // 3. 참조 프레임 유효성
        if (!verify_reference_frames(frame)) {
            return false;
        }

        // 4. CRC 검사 (있는 경우)
        if (frame.has_crc && !verify_crc(frame)) {
            return false;
        }

        return true;
    }

private:
    bool verify_syntax_ranges(const Frame& frame) {
        // 예: qindex는 0~255 범위
        if (frame.base_qindex > 255) return false;

        // 예: ref_frame_idx는 0~7 범위
        for (int i = 0; i < REFS_PER_FRAME; i++) {
            if (frame.ref_frame_idx[i] > 7) return false;
        }

        return true;
    }
};
```

### 24.5.2 픽셀 레벨 감지

```cpp
// 디코딩 후 품질 검사 (선택적)
class PixelErrorDetector {
public:
    bool check_decoded_frame(const Frame& current, const Frame& previous) {
        // 급격한 품질 변화 감지
        double psnr = compute_psnr(current, previous);

        if (psnr < threshold) {
            // 의심스러운 프레임
            return false;
        }

        return true;
    }

    bool check_block_boundaries(const Frame& frame) {
        // 블록 경계의 불연속성 검사
        for (int y = 0; y < frame.height - 8; y += 8) {
            for (int x = 0; x < frame.width - 8; x += 8) {
                if (is_boundary_discontinuous(frame, x, y)) {
                    return false;
                }
            }
        }
        return true;
    }
};
```

---

## 24.6 에러 복원 모드 선택 가이드

### 24.6.1 사용 시나리오별 권장

| 시나리오 | error_resilient_mode | Golden 간격 | FEC | NACK |
|----------|---------------------|-------------|-----|------|
| 로컬 파일 재생 | 불필요 | 긴 간격 | 불필요 | 불필요 |
| VoD 스트리밍 | 선택적 | 중간 간격 | 낮음 | 가능 |
| 라이브 스트리밍 | 권장 | 짧은 간격 | 중간 | 제한적 |
| WebRTC 화상회의 | 필수 | 짧은 간격 | 높음 | 필수 |
| 위성 전송 | 필수 | 짧은 간격 | 매우 높음 | 불가 |

### 24.6.2 압축 효율 vs 에러 복원 트레이드오프

```
┌─────────────────────────────────────────────────────────────┐
│  트레이드오프 관계                                          │
│                                                             │
│  압축 효율 ↑                              에러 복원 ↑       │
│  ├──────────────────────────────────────────────────┤       │
│  │                                                   │       │
│  긴 GOP          ←─────────────────→      짧은 GOP  │       │
│  CDF 적응        ←─────────────────→      기본 CDF  │       │
│  깊은 참조       ←─────────────────→      얕은 참조 │       │
│  FEC 없음        ←─────────────────→      FEC 있음  │       │
│                                                             │
│  설정 예시 (압축 우선):                                     │
│  - GOP = 250 프레임                                        │
│  - error_resilient_mode = false                            │
│  - Golden 간격 = 60 프레임                                 │
│                                                             │
│  설정 예시 (복원 우선):                                     │
│  - GOP = 60 프레임                                         │
│  - error_resilient_mode = true                             │
│  - Golden 간격 = 10 프레임                                 │
│  - FEC 20%                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 정리

1. 비디오 전송에서 에러는 **패킷 손실**, **비트 에러**, **지연 변동**으로 발생한다.

2. **에러 드리프트**는 참조 프레임 손상이 이후 프레임으로 누적 전파되는 현상이다.

3. **error_resilient_mode**는 CDF를 기본값으로 리셋하여 이전 프레임 의존성을 제거한다.

4. **Processable Frames** 규칙으로 디코더가 안전하게 처리 가능한 프레임을 판별한다.

5. **Switch Frame**은 어떤 참조 상태에서든 디코딩 가능한 특수 프레임이다.

6. **Redundant Frame Header OBU**는 Frame Header 손실에 대비한 백업이다.

7. **Intra Refresh**는 주기적 Intra 코딩으로 에러 전파를 공간적으로 차단한다.

8. **Golden Frame 순환**은 참조 체인을 짧게 유지하여 복구 포인트를 제공한다.

---

## 다음 장 예고

Ch 25에서는 **Container와 Transport**를 다룬다. AV1 비트스트림을 담는 MP4, WebM 컨테이너와 RTP 전송 방식을 살펴본다.

---

## 관련 항목

- [Ch 23: Decoder Model](/blog/media/av1/chapter23-decoder-model)
- [Ch 5: Frame Header 분석](/blog/media/av1/chapter05-prediction-overview)
- [Ch 7: 엔트로피 코딩과 MSAC](/blog/media/av1/chapter07-entropy-coding)
- [AV1 Spec Annex C](https://aomediacodec.github.io/av1-spec/#error-resilience) — Error Resilience
