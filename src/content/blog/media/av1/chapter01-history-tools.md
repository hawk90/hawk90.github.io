---
title: "Ch 1: AV1의 역사와 도구 체인"
date: 2025-10-01T02:00:00
description: "AOM 컨소시엄의 탄생, AV1의 위치, libaom·dav1d·SVT-AV1·rav1e 도구 체인, HEVC/VVC와의 비교."
tags: [AV1, Video, Codec, libaom, dav1d, SVT-AV1]
series: "AV1"
seriesOrder: 1
draft: true
---

왜 AV1인가, 그리고 무엇을 만들 것인가. 이 장에서는 비디오 코덱의 기본 개념부터 AV1이 탄생하게 된 배경, 그리고 실제로 사용할 도구들을 살펴본다.

## 1.1 비디오 코덱이란

### 한 문장 정의

비디오 코덱은 **"예측 가능한 것은 예측하고, 나머지만 효율적으로 저장하는 기계"**다.

### 인코더와 디코더

비디오 코덱은 두 부분으로 구성된다.

| 구성 요소 | 역할 | 방향 |
|-----------|------|------|
| **인코더(Encoder)** | 원본 → 비트스트림 | 압축 |
| **디코더(Decoder)** | 비트스트림 → 복원 영상 | 복원 |

```
원본 비디오     →  [인코더]  →  비트스트림  →  [디코더]  →  복원 비디오
(6 GB/분)                      (50 MB/분)                  (≈원본)
```

인코더는 복잡한 분석과 결정을 수행하고, 디코더는 인코더가 내린 결정을 충실히 재현한다. 이 책에서 만들 것은 **디코더**다.

### 손실 vs 무손실

대부분의 비디오 압축은 **손실(Lossy)** 압축이다.

- 원본과 100% 동일하지 않다
- 인간이 인지하지 못하는 수준의 차이만 허용한다
- 이것이 200:1 같은 극단적 압축률을 가능하게 한다

무손실(Lossless)도 가능하지만 압축률이 매우 낮다 (AV1에서 `base_q_idx=0`).

## 1.2 Hybrid Video Coding

### 모든 현대 코덱의 공통 구조

1967년(DPCM)부터 1990년(H.261), 그리고 현재의 AV1까지 **기본 구조는 동일**하다. 이를 Hybrid Video Coding이라 부른다.

```
┌─────────────────────────────────────────────────────────────┐
│                    Hybrid Video Coding                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   원본 ──→ [예측] ──→ [잔차] ──→ [변환] ──→ [양자화] ──→ [엔트로피]  │
│              ↑                                      │         │
│              └──────────────────────────────────────┘         │
│                     (디코더 루프)                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5단계 파이프라인

**(1) 예측(Prediction)** — "이미 아는 것으로 추측한다"

```
직관: "옆 픽셀이 파란색이면 이 픽셀도 파란색일 것이다"
```

- **Intra 예측**: 같은 프레임 내 이웃 픽셀 참조 → [Ch 8](/blog/media/av1/part4-prediction/chapter08-intra-prediction)에서 상세히 다룸
- **Inter 예측**: 이전/이후 프레임 참조 → [Ch 12](/blog/media/av1/part4-prediction/chapter12-inter-prediction)에서 상세히 다룸
- 예측이 정확할수록 보낼 정보가 줄어든다

**(2) 잔차(Residual)** — "추측이 틀린 부분만 기록한다"

```
residual(x, y) = original(x, y) - prediction(x, y)
```

- 예측이 좋으면 잔차 ≈ 0 → 매우 적은 비트
- 예측이 나쁘면 잔차가 큼 → 비트 많이 필요
- 비유: "서울 기온이 15도입니다"보다 "어제보다 2도 높습니다"가 더 짧다

**(3) 변환(Transform)** — "공간 패턴을 주파수로 바꾼다"

- 픽셀 값을 "저주파(부드러운 변화)"와 "고주파(급격한 변화)"로 분리
- 자연 영상: 에너지의 대부분이 저주파에 집중
- 결과: 소수의 큰 계수 + 다수의 0에 가까운 계수 → [Ch 9](/blog/media/av1/part3-blocks/chapter09-transform-quantization)에서 상세히 다룸
- 비유: 음악을 "도레미" 음계로 분해하는 것과 유사

**(4) 양자화(Quantization)** — "정밀도를 낮춰 비트를 줄인다"

```
qcoeff = round(coeff / step)
```

- 아이디어: 13.7을 14로 반올림하면 소수점을 저장할 필요 없다
- **이것이 유일한 손실 발생 지점** — 나머지 단계는 모두 가역적
- 양자화 세기(QP)를 높이면: 비트↓ 화질↓, 낮추면: 비트↑ 화질↑
- 인간 시각에 덜 민감한 고주파를 더 거칠게 양자화

**(5) 엔트로피 코딩(Entropy Coding)** — "자주 나오는 패턴에 짧은 코드를 부여"

```
모스 부호: 'E'(자주 씀) = .    'Q'(드물게 씀) = --.-
```

- 양자화 후 0이 매우 많음 → 0에 아주 짧은 코드 부여
- AV1은 산술 코딩(Arithmetic Coding) 사용 → [Ch 7](/blog/media/av1/part2-bitstream/chapter07-entropy-coding)에서 상세히 다룸
- 이론적 한계: Shannon 엔트로피보다 짧을 수 없다

## 1.3 비디오 코덱의 역사

### 타임라인

```
1967  DPCM (차분 펄스 코드 변조)
  │
1988  H.261 — 최초의 실용적 비디오 코덱
  │
1995  H.262/MPEG-2 — DVD의 표준
  │
2003  H.264/AVC — 20년간 지배, 유튜브·스마트폰의 코덱
  │
2013  H.265/HEVC — 4K 시대, 그러나 특허 지옥
  │     VP9 — Google의 로열티 프리 대안
  │
2018  AV1 — AOMedia의 로열티 프리 차세대 코덱
  │
2020  H.266/VVC — HEVC의 후속 (또 특허 문제)
  │
현재  AV2 — AOMedia 차세대 개발 중
```

### H.265/HEVC의 특허 위기

H.265/HEVC는 기술적으로 우수했지만, 특허 문제가 심각했다.

| 특허 풀 | 관리 주체 |
|---------|-----------|
| MPEG-LA | 기존 MPEG 특허 풀 |
| HEVC Advance | 추가 특허 풀 |
| Velos Media | 또 다른 특허 풀 |

세 곳에서 별도로 라이선스를 요구하니 비용 불확실성이 커졌고, 업계의 저항이 시작되었다.

## 1.4 AOM(Alliance for Open Media)의 탄생

### 세 기술의 융합

2015년, 세 가지 기술이 하나로 합쳐졌다.

| 기술 | 출처 | 기여 |
|------|------|------|
| VP9 | Google | 블록 구조, 예측 모드 |
| Daala | Mozilla | 엔트로피 코딩, 필터 |
| Thor | Cisco | 변환, 참조 프레임 |

### 창립 멤버와 목표

**창립 멤버** (2015):
- Google, Mozilla, Cisco, Microsoft, Amazon, Netflix, Intel

**이후 합류** (40+ 기업):
- Apple, Samsung, NVIDIA, ARM, Facebook, Hulu 등

**목표**:
- 로열티 프리 비디오 코덱
- BSD-2-Clause 라이선스
- AOMedia Patent License 1.0 (특허 방어)
- 오픈 소스 레퍼런스 구현 (libaom)

## 1.5 AV1 vs HEVC vs VVC

### 압축 효율 비교

```
동일 화질 기준 비트레이트 비교 (H.264 = 100%)

H.264/AVC  ████████████████████  100%
VP9        ████████████          60%
H.265/HEVC ████████████          55%
AV1        ██████████            50%
H.266/VVC  ████████              45%
```

- AV1은 H.264 대비 약 50% 비트레이트 절감 (동일 품질)
- VP9 대비 약 30% 절감

### 로열티와 채택 현황

| 코덱 | 로열티 | 주요 채택처 |
|------|--------|-------------|
| H.264 | 무료 (소비자용) | 모든 곳 |
| HEVC | 복잡한 특허 구조 | Apple, 일부 방송 |
| VP9 | 무료 | YouTube, Android |
| **AV1** | **무료** | **YouTube, Netflix, Discord, WebRTC** |
| VVC | 특허 비용 발생 | 아직 제한적 |

### 하드웨어 디코딩 지원 (2024~)

| 제조사 | 지원 시작 |
|--------|-----------|
| Intel | 11세대 이후 (Tiger Lake) |
| AMD | RDNA 3 이후 (RX 7000) |
| NVIDIA | RTX 30 시리즈 이후 |
| Apple | M3 이후 |
| MediaTek | Dimensity 1000+ |
| Qualcomm | Snapdragon 8 Gen 1+ |

## 1.6 AV1 도구 체인

실제로 AV1을 다루는 데 사용하는 소프트웨어들이다.

### libaom — 레퍼런스 인코더/디코더

AOMedia 공식 구현체다. 느리지만 정확하다.

```bash
# 설치
brew install aom          # macOS
apt install libaom-dev    # Linux

# 인코딩 예시
aomenc --codec=av1 --cpu-used=6 --width=64 --height=64 \
       --limit=1 -o output.obu input.y4m

# 디코딩 예시
aomdec --output-bit-depth=8 -o output.y4m input.obu
```

**특징**:
- 모든 AV1 기능 지원
- 인코더 + 디코더 모두 포함
- 속도보다 정확성 우선
- 디버깅·비교 기준으로 사용

### dav1d — 고성능 디코더

VideoLAN/FFmpeg 프로젝트에서 개발한 가장 빠른 소프트웨어 디코더다.

```bash
# 설치
brew install dav1d        # macOS
apt install dav1d         # Linux

# 디코딩 예시
dav1d -i input.obu -o output.y4m --framethreads 1 --tilethreads 1
```

**특징**:
- 어셈블리 레벨 SIMD 최적화 (AVX2, NEON)
- 멀티스레드 디코딩
- 최고 수준의 디코딩 성능
- Firefox, VLC, mpv 등에서 사용

### SVT-AV1 — 프로덕션 인코더

Intel과 Netflix가 공동 개발한 프로덕션급 인코더다.

```bash
# 인코딩 예시
SvtAv1EncApp -i input.y4m -b output.ivf --preset 6 --crf 30
```

**특징**:
- 병렬화에 최적화된 구조
- preset 0~13 (느림~빠름)
- CRF 기반 품질 제어
- Netflix, YouTube 등에서 실제 사용
- 인코더만 제공 (디코더 없음)

### rav1e — Rust 인코더

Rust로 작성된 안전한 인코더다.

```bash
# 인코딩 예시
rav1e input.y4m -o output.ivf --speed 6 --quantizer 100
```

**특징**:
- 메모리 안전성 (Rust)
- 깔끔한 코드 구조
- 학습·실험용으로 적합
- libaom보다 빠르지만 SVT-AV1보다 느림

### 도구 비교 표

| 도구 | 인코더 | 디코더 | 속도 | 용도 |
|------|--------|--------|------|------|
| libaom | ✓ | ✓ | 느림 | 레퍼런스, 디버깅 |
| dav1d | ✗ | ✓ | 매우 빠름 | 재생기 |
| SVT-AV1 | ✓ | ✗ | 빠름 | 프로덕션 인코딩 |
| rav1e | ✓ | ✗ | 보통 | 실험, 학습 |

## 1.7 분석 및 디버깅 도구

### ffprobe — 비트스트림 빠른 확인

```bash
ffprobe -show_frames -select_streams v:0 input.obu
```

프레임 타입, 크기, 키프레임 여부 등을 빠르게 확인할 수 있다.

### AOM Analyzer — 비주얼 분석기

OBU 구조, 파티션 트리, 모션 벡터를 그래픽으로 시각화한다. 웹 기반 도구도 있다.

### YUView — YUV 비교 도구

두 YUV 영상을 나란히 비교하고, 차이 시각화, PSNR 계산을 지원한다.

### hexdump

```bash
# 바이트 단위 확인
xxd input.obu | head -20

# 비트 단위 확인 (OBU 헤더 분석용)
xxd -b input.obu | head -5
```

## 1.8 AV1의 현재 위치

### 채택 현황 (2024~)

| 서비스 | 사용 방식 |
|--------|-----------|
| YouTube | 전체 트래픽의 상당 부분 AV1 서빙 |
| Netflix | 4K HDR 콘텐츠에 AV1 사용 |
| Twitch | 실시간 스트리밍에 AV1 도입 |
| Discord | 화상 통화에 AV1 사용 |
| WebRTC | 브라우저 기본 AV1 지원 |

### 왜 AV1인가

1. **로열티 프리** — 특허 비용 없음
2. **높은 압축 효율** — H.264 대비 50% 절감
3. **광범위한 지원** — 브라우저, 하드웨어, 플랫폼
4. **개방된 개발** — 오픈 소스, 커뮤니티 참여
5. **미래 보장** — AV2 개발 진행 중

## 정리

- **비디오 코덱**은 예측 → 잔차 → 변환 → 양자화 → 엔트로피의 5단계 파이프라인이다
- **Hybrid Video Coding** 구조는 1967년부터 현재까지 기본 원리가 동일하다
- **AV1**은 VP9 + Daala + Thor의 융합으로 탄생했다
- **로열티 프리**가 HEVC 대비 AV1의 가장 큰 장점이다
- **libaom**(레퍼런스), **dav1d**(고속 디코더), **SVT-AV1**(프로덕션 인코더)이 핵심 도구다

## 다음 장 예고

Ch 2에서는 AV1 비트스트림의 구조를 다룬다. OBU(Open Bitstream Unit)의 개념, 헤더 구조, Temporal Unit과 Frame의 계층 관계를 살펴본다.

## 관련 항목

- [Ch 0: 디지털 비디오 기초](/blog/media/av1/part1-basics/chapter00-digital-video)
- [Ch 2: 비트스트림 구조](/blog/media/av1/part2-bitstream/chapter02-bitstream)
