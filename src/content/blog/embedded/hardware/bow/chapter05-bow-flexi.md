---
title: "Ch 5: BoW Flexi — 저비용 구현"
date: 2026-05-16T05:00:00
description: "Organic substrate에서도 동작하는 BoW의 최저비용 프로파일 — 130μm bump pitch, 긴 reach, 엣지·임베디드 칩렛."
series: "BoW 개요"
seriesOrder: 5
tags: [bow, flexi, organic, low-cost]
draft: false
---

## 한 줄 요약

> **"BoW Flexi는 *advanced packaging을 일부러 포기*한 변형입니다."** — bump pitch를 *130 μm까지 키워* organic substrate에서도 양산 가능하게 했습니다. bandwidth density는 *Standard의 절반*이지만, *패키징 단가는 한 자릿수 낮습니다*. 엣지 SoC, 추론 칩, IoT 가속기가 주된 타깃입니다.

[Ch 3](/blog/embedded/hardware/bow/chapter03-vs-ucie)에서 BoW와 UCIe의 비교를 봤고, [Ch 4](/blog/embedded/hardware/bow/chapter04-bow-memory)에서 BoW Memory를 봤습니다. 이번 글은 BoW의 *가장 큰 차별점*인 *Flexi 프로파일*에 집중합니다. *왜 130 μm 같은 큰 pitch를 쓰는지*, *어떤 시장을 노리는지*, *어디까지 양보 가능한지*가 주제입니다.

## Flexi가 푸는 문제

칩렛이 좋다는 건 다들 알지만, 대부분의 회사가 *advanced packaging에 들어가지 못합니다*. 이유는 단순합니다.

```text
advanced packaging의 진입 장벽
├── CoWoS 라인 capacity 부족 (NVIDIA·AMD가 선점)
├── 대당 200달러 이상의 packaging 비용
├── 새 EDA flow 학습 비용
├── 신뢰성 검증 데이터 부족
└── 양산 ramp-up 위험
```

엣지 SoC 회사 입장에서 *대당 5달러짜리 BGA 패키지*를 쓰던 자리에 *200달러짜리 silicon interposer*를 넣을 수는 없습니다. 그러나 *칩렛의 이점*은 갖고 싶습니다. *I/O와 compute 분리*, *die 크기 축소로 수율 향상*, *다양한 메모리 옵션*.

이 자리를 BoW Flexi가 채웁니다. *organic substrate*에서 *그대로* 양산 가능하면서, *충분한 칩렛 간 대역폭*을 제공합니다.

## 130 μm bump pitch — 왜 130인가

bump pitch가 작을수록 같은 면적에 더 많은 lane이 들어갑니다. 그런데 *작을수록 양산이 어렵습니다*. organic substrate의 *현실적 한계*는 *130~150 μm*입니다.

```text
substrate별 최소 bump pitch
                          [μm]
organic (standard)        130~150
organic (high-density)    100~130
silicon bridge            45~55
silicon interposer        25~45
hybrid bonding            5~10
```

130 μm로 잡으면 *기존 organic 라인*에서 *수율 손실 없이* 양산 가능합니다. 100 μm는 *high-density organic*이 필요하고, 일부 라인에서만 가능합니다. Flexi는 *최대 양산성*을 노려 *130 μm*를 표준으로 정했습니다.

## Flexi의 spec 비교

BoW Standard와 비교한 표입니다.

| 항목 | BoW Standard | BoW Flexi |
|------|--------------|-----------|
| Bump pitch | 100 μm | 130 μm |
| Lane 밀도 | ~1.6× | 1× (기준) |
| Bandwidth density | ~2 Tbps/mm² | ~1 Tbps/mm² |
| Per-lane rate | 4~16 Gbps | 4 Gbps 권장 (최대 8) |
| Reach | ~25 mm | ~50 mm |
| 패키징 | organic / Si bridge | organic 전용 |
| Termination | ODT 필수(고속) | 4 Gbps에서 unterminated 가능 |
| 추정 단가 차이 | 1× | 0.3~0.5× |

per-lane rate를 *4 Gbps로 낮춘* 게 핵심입니다. 4 Gbps에서는:
- *Unterminated*로도 동작 (driver power 감소)
- *Signal integrity 여유*가 커서 organic 위 trace도 안정적
- 길이를 *50 mm까지* 늘려도 *eye가 열림*

bandwidth density는 *절반*이지만, *시스템에서 충분한 경우가 많습니다*. 추론 SoC에서 *200~400 GB/s 칩렛 간 대역폭*이면 대부분 적정합니다.

## Reach가 길다는 의미

Flexi의 *50 mm reach*는 floorplan에 큰 자유를 줍니다.

```text
BoW Standard (reach ~25 mm)
┌─────────────────────────────┐
│   Die A   Die B   Die C     │ ← 모두 한 줄로 인접 배치 필요
└─────────────────────────────┘

BoW Flexi (reach ~50 mm)
┌─────────────────────────────────────┐
│  Die A                              │
│                                     │
│                                     │
│                       Die B         │ ← 대각선 배치도 가능
│                                     │
│  Die C                              │
└─────────────────────────────────────┘
```

이 자유도가 *thermal management*에도 유리합니다. 발열이 큰 compute die와 IO die를 *분리해 배치*해 *국소 hotspot을 피합니다*. silicon interposer는 die 간 거리가 좁아 *열이 한쪽에 집중*되기 쉽습니다.

## Eliyan NuLink — Flexi 계열의 상용 예

Eliyan은 BoW Flexi와 *유사한 PHY*인 NuLink를 발표했습니다. 사양상 100% 일치는 아니지만 *동일한 시장*을 노립니다. 핵심 특징입니다.

```text
Eliyan NuLink 개요
- per-lane: 16 Gbps (Flexi 스펙보다 높음, 자체 개선)
- bump pitch: 130 μm (organic 호환)
- reach: ~50 mm
- power: 0.5 pJ/bit
- application: AI accelerator + memory chiplet
```

Eliyan은 *Compute Die와 HBM-class 메모리*를 *organic substrate*에 묶는 레퍼런스를 *수차례 시연*했습니다. *CoWoS 없이 HBM-급 대역폭*을 만든다는 점에서 *큰 화제*가 됐습니다.

```text
NuLink 시연 구성
        organic substrate
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────┐   NuLink    ┌──────────┐   │
│  │ AI core │ ◄────────► │  HBM     │   │
│  │  die    │  ~1 TB/s   │  stack   │   │
│  └─────────┘             └──────────┘   │
│                                         │
└─────────────────────────────────────────┘

전통 구성 (CoWoS)        대안 구성 (NuLink/Flexi)
- silicon interposer     - organic substrate
- ~3 TB/s per stack      - ~1 TB/s per stack
- 단가 200~300달러       - 단가 5~10달러
```

bandwidth는 *1/3 수준*이지만, *비용은 1/20~1/30* 수준입니다. AI 추론용이라면 *충분히 매력적인 trade-off*입니다.

## 적용 분야

Flexi의 *명확한 타깃*은 다음과 같습니다.

### 1. 엣지 AI 추론 칩

엣지 디바이스의 AI 가속기는 *10~50 TOPS* 수준이고 *200 GB/s 메모리 대역폭*이면 충분합니다. Flexi의 *organic substrate + DDR/LPDDR 칩렛* 구성이 *완벽한 fit*입니다.

```text
엣지 AI SoC 구성 예
- Compute die: 7nm AI 가속기 (10 TOPS, 50 mm²)
- IO die: 22nm I/O 칩렛 (USB, MIPI, SerDes)
- Memory die: LPDDR5 controller + PHY
- 모두 organic substrate에 BoW Flexi로 연결
- 총 BoM: 일반 SoC 대비 +5달러
```

monolithic SoC로 만들면 *7nm 면적이 커져* 수율이 떨어집니다. 칩렛으로 나누면 *공정·면적을 최적화*하면서 *원가가 줄어듭니다*.

### 2. IoT 가속기

IoT 디바이스의 가속기는 *비용에 매우 민감*합니다. silicon interposer는 *완전히 불가능*하고, BoW Standard도 *오버킬*입니다. Flexi의 *4 Gbps lane*이 *power와 비용*에서 적합합니다.

### 3. 네트워킹 SoC의 보조 칩렛

메인 스위치 다이는 BoW Standard로 연결하고, *외부 management CPU*나 *기능 칩렛*은 Flexi로 붙이는 *하이브리드 구성*도 가능합니다.

### 4. 자동차 SoC

자동차 SoC는 *신뢰성과 비용*이 결정적입니다. organic substrate의 *수십 년 검증된 신뢰성*과 Flexi의 *전기적 여유*가 *AEC-Q100 인증*에 유리합니다.

## Trade-off

Flexi의 *대가*도 분명합니다.

### Bandwidth density 절반

같은 면적으로 *절반의 대역폭*입니다. 한쪽 die의 shoreline이 *부족하면* Flexi로는 안 됩니다. 이 경우 BoW Standard 또는 UCIe로 *상위 변형*해야 합니다.

### Per-lane rate 4 Gbps 권장

8 Gbps도 가능은 하지만 *organic trace 길이 제한*과 *signal integrity 제한*이 빠듯해집니다. *보수적 설계*에서는 4 Gbps에 머무릅니다.

### CoWoS급 대역폭 *불가능*

HBM의 *819 GB/s*나 UCIe Advanced의 *수 TB/s*는 Flexi로 만들 수 없습니다. *고대역폭 시장은 다른 표준의 자리*입니다.

### Termination 옵션 분기

unterminated 4 Gbps와 terminated 8 Gbps가 *PHY 옵션*입니다. 같은 die에 두 옵션을 모두 지원하려면 *PHY 면적이 커집니다*. *한 옵션으로 통일*하는 게 깔끔합니다.

## Flexi와 advanced packaging의 공존

같은 회사가 *제품 라인*마다 BoW Flexi와 advanced packaging을 *나눠 쓰는 구성*이 점점 흔합니다.

```text
한 회사의 제품 라인 예
                    BoW Flexi   BoW Standard   UCIe Advanced
                    (organic)   (Si bridge)    (CoWoS)
                    
Entry SoC           ●
Mainstream SoC                  ●
HPC/AI SoC                                     ●
```

*공정 IP*와 *PHY IP*는 *공유*하지만, *packaging*만 *제품에 맞춰* 선택합니다. 이게 *칩렛 시대의 다층 전략*입니다.

## EDA flow의 차이

Flexi는 *EDA flow도 더 단순*합니다.

| flow 단계 | UCIe Advanced | BoW Flexi |
|-----------|---------------|-----------|
| Floorplan | silicon interposer 고려 | substrate 평면 단순 |
| Routing | 25 μm pitch 미세 routing | 130 μm 일반 routing |
| Signal integrity | 매우 빡빡, 3D 시뮬레이션 필수 | 표준 2.5D 시뮬레이션 |
| Power integrity | 고밀도 power grid | 일반 BGA 수준 |
| DRC | advanced packaging DRC | 기존 BGA DRC |
| 검증 시간 | 길다 (수주) | 짧다 (며칠) |

엔지니어링 비용 관점에서도 Flexi가 *진입 장벽이 낮습니다*. 작은 팀, 적은 검증 자원으로도 *양산 가능한 칩렛 설계*가 됩니다.

## 자주 하는 실수

### Flexi인데 *높은 per-lane rate*를 노림

Flexi의 본질은 *4 Gbps unterminated*입니다. 12 Gbps를 organic으로 밀어붙이면 *signal integrity 마진*이 *위험 수준*까지 떨어집니다. *4 Gbps에서 충분한 lane을 두는 게* 정답입니다.

### *얇은 organic substrate*에 *많은 layer*를 가정

organic substrate는 *layer 수에 따라 비용이 빠르게 증가*합니다. 16-layer organic은 *얇은 substrate인데도 단가가 silicon bridge 수준*이 되기도 합니다. Flexi 설계는 *최소 layer 수*를 노립니다.

### *Reach 50 mm 끝까지* 쓰기

reach 한계는 *worst case*입니다. 실제 설계에서는 *30~40 mm*에 머무는 게 *수율과 신뢰성*에 안전합니다. *온도·습도 변화*까지 고려해야 합니다.

### *Standard와 Flexi*의 *PHY 호환성*을 가정

bump pitch가 다르기 때문에 *physical floorplan이 호환되지 않습니다*. 같은 PHY IP의 *프로파일 옵션*으로 둘 다 지원하더라도, *floorplan 단계에서 결정*해야 합니다.

### *Eliyan NuLink = BoW Flexi*로 가정

NuLink는 *Flexi 계열의 정신*을 따르지만, *세부 사양은 다릅니다* (16 Gbps per lane, 자체 PHY IP). 표준 호환은 *부분적*입니다. NuLink IP를 쓰면 *Eliyan에 종속*되지만, 그만큼 *성능이 더 높습니다*.

## 정리

- BoW Flexi는 BoW의 *organic substrate 전용 프로파일*입니다.
- bump pitch *130 μm*, per-lane rate *4 Gbps*, reach *~50 mm*가 핵심 spec입니다.
- bandwidth density는 *~1 Tbps/mm²*로 Standard의 절반이지만, *패키징 단가는 한 자릿수 낮습니다*.
- *엣지 AI, IoT 가속기, 자동차 SoC, 보조 칩렛*에 어울립니다.
- *unterminated 동작*과 *signal integrity 여유*가 장점입니다.
- *EDA flow*도 더 단순해 *작은 팀*도 진입할 수 있습니다.
- Eliyan NuLink가 *유사 정신의 상용 IP*로 *AI accelerator + 메모리 칩렛* 시장을 노립니다.
- 같은 회사가 *제품 라인별*로 Flexi·Standard·UCIe를 *나눠 쓰는 전략*이 일반화됩니다.

## 다음 편

[Ch 6: 패키징 요구사항](/blog/embedded/hardware/bow/chapter06-packaging)에서는 BoW를 *실제 양산*하기 위한 packaging·EDA·DFT 요구사항을 정리합니다. *known good die 전략*과 *boundary scan*까지 포함합니다.

## 관련 항목

- [Ch 1: BoW 개요](/blog/embedded/hardware/bow/chapter01-overview)
- [Ch 3: BoW 2.0 vs UCIe 비교](/blog/embedded/hardware/bow/chapter03-vs-ucie)
- [Ch 4: BoW Memory](/blog/embedded/hardware/bow/chapter04-bow-memory)
- [Ch 6: 패키징 요구사항](/blog/embedded/hardware/bow/chapter06-packaging)
- [UCIe Ch 1: 개요](/blog/embedded/hardware/ucie/chapter01-overview)
- [HBM Ch 1: 메모리 스택](/blog/embedded/hardware/hbm/chapter01-overview)
- [원문 — OCP ODSA BoW Specification](https://www.opencompute.org/projects/ocp-server/odsa)
