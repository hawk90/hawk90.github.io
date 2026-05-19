---
title: "Ch 3: BoW 2.0 vs UCIe 비교"
date: 2026-05-16T03:00:00
description: "Bandwidth density·packaging·생태계 — 두 D2D 표준을 정량으로 비교하고 선택 기준을 정리합니다."
series: "BoW 개요"
seriesOrder: 3
tags: [bow, ucie, comparison]
draft: false
---

## 한 줄 요약

> **"UCIe는 *대역폭 밀도*, BoW는 *비용 효율*."** — UCIe Advanced는 silicon interposer 위에서 10 Tbps/mm²까지 가는 *고급 인터페이스*입니다. BoW는 organic substrate에서도 1~2 Tbps/mm²를 내는 *저비용 인터페이스*입니다. 둘은 *경쟁이 아니라 다른 시장*입니다.

이 글에서는 두 표준의 *기술·비용·생태계*를 정량 비교합니다. *결정 기준*도 함께 제시합니다. 어느 한쪽이 일방적으로 우월하지 않습니다. *시스템의 제약*에 따라 답이 달라집니다.

## 한눈에 보는 비교 표

가장 자주 인용되는 차이를 표로 정리하면 다음과 같습니다.

| 항목 | BoW Flexi | BoW Standard | UCIe Standard | UCIe Advanced |
|------|-----------|--------------|---------------|----------------|
| Bump pitch | 130 μm | 100 μm | 45 μm | 25 μm |
| Bandwidth density | ~1 Tbps/mm² | ~2 Tbps/mm² | ~5 Tbps/mm² | ~10 Tbps/mm² |
| 패키징 | organic | organic / Si bridge | Si bridge (EMIB/LSI) | Si interposer (CoWoS) |
| Reach | ~50 mm | ~25 mm | ~2 mm | ~2 mm |
| Per-lane rate | 4 Gbps | 4~16 Gbps | 4~32 Gbps | 16~32 Gbps |
| Latency (one-way) | ~3 ns | ~2 ns | ~2 ns | <2 ns |
| pJ/bit (raw) | ~0.7 | ~0.5 | ~0.3 | ~0.25 |
| Protocol stack | PHY only | PHY only | PHY + D2D + Protocol | PHY + D2D + Protocol |
| Spec license | royalty-free | royalty-free | royalty-free | royalty-free |
| 대표 PHY IP | Eliyan NuLink | Synopsys, Marvell | Synopsys, Cadence | Synopsys, Cadence |

수치는 *대표값*입니다. 공정·구현·packaging 변형에 따라 ±30% 차이는 흔합니다.

## 1. 패키징 비용 — 가장 큰 차이

D2D 표준을 고를 때 *가장 결정적인 변수*는 패키징입니다.

```text
패키지 단가 (대략, 100mm² die 기준)
                              [USD]
organic substrate           ──┤ ~5
silicon bridge (EMIB)       ──────────┤ ~50
silicon interposer (CoWoS)  ─────────────────────────────┤ ~200+
```

silicon interposer는 *대당 200달러 이상*이 들 수 있습니다. 양산 SoC에서는 *BoM의 30% 이상*을 차지하기도 합니다. 게다가 *CoWoS 라인 capacity 부족*은 2023년 이후 만성적 문제입니다. NVIDIA·AMD가 *대부분의 라인을 선점*하면서 중소 fabless는 *공급 부족*에 시달립니다.

BoW Flexi는 *organic substrate*만 있으면 됩니다. 기존 BGA 라인 그대로 양산 가능합니다. *공급 부족 위험이 거의 없습니다*. 한국의 *SK Hynix HBM4 hybrid bonding*은 advanced packaging의 또 다른 축이지만, 모든 SoC가 *그 수준의 packaging*을 감당하지 못합니다.

## 2. Bandwidth density 비교

bandwidth density만 보면 *UCIe Advanced가 압도적*입니다.

```text
shoreline 1mm당 대역폭 (Tbps/mm)
                  
BoW Flexi      ▪▪▪
BoW Standard   ▪▪▪▪▪▪
UCIe Standard  ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪
UCIe Advanced  ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪
```

다만 이 차이는 *bump pitch에서 결정*됩니다. 25 μm pitch라면 130 μm 대비 *27배 더 많은 bump*가 같은 면적에 들어갑니다. 결국 *packaging 기술이 모든 것을 결정*합니다.

### 시스템에서 충분한 bandwidth는 얼마인가

*모든 시스템이 10 Tbps/mm²를 필요로 하지 않습니다*. 대표 사례별 *필요 대역폭*을 보면:

| 시스템 | 필요 D2D BW | 최소 충분 표준 |
|--------|-------------|----------------|
| 엣지 AI 추론 (10 TOPS) | ~100 GB/s | BoW Flexi |
| 네트워킹 스위치 (3.2 Tbps) | ~400 GB/s | BoW Standard |
| 데이터센터 CPU (코어-IO) | ~1 TB/s | UCIe Standard |
| GPU + HBM | ~5 TB/s | UCIe Advanced |
| HPC/AI 학습 (NVLink급) | ~10 TB/s | UCIe Advanced + 다중 module |

대부분의 시스템은 *UCIe Advanced까지 필요하지 않습니다*. 추론·네트워킹·엣지는 *BoW로 충분*합니다.

## 3. Protocol stack — 표준의 무게

UCIe는 *Physical + D2D adapter + Protocol* 3 layer를 모두 정의합니다.

```text
UCIe 스택                          BoW 스택
┌──────────────────────┐         ┌──────────────────────┐
│ Protocol Layer       │         │  (사용자 정의)        │
│ (CXL.io, PCIe, etc.) │         │   CXL, AXI, custom   │
├──────────────────────┤         ├──────────────────────┤
│ D2D Adapter Layer    │         │  (사용자 정의)        │
│ (CRC, retry, FEC)    │         │   필요 시 직접 구현   │
├──────────────────────┤         ├──────────────────────┤
│ Physical Layer       │         │  Physical Layer      │
│ (lane, clock, sb)    │         │  (lane, clock, sb)   │
└──────────────────────┘         └──────────────────────┘
```

UCIe의 장점은 *interoperability*입니다. 회사 A의 칩렛과 회사 B의 칩렛을 *그대로 붙일* 수 있습니다. BoW는 *PHY만 표준*이므로, 위에 얹는 protocol을 *양쪽이 합의*해야 합니다.

반대로 BoW의 장점은 *자유도*입니다. 위 layer에 *원하는 만큼*만 protocol을 올릴 수 있습니다. *불필요한 layer를 빼서* 면적·전력을 아낄 수 있습니다.

| 상황 | 유리한 표준 |
|------|-------------|
| 외부 회사 칩렛과 *plug-and-play* | UCIe |
| 사내에서 *전체 설계 통제* | BoW |
| 빠른 *prototyping* | BoW (단순) |
| 표준 준수 *인증 필요* | UCIe |

## 4. Latency

같은 패키지 안에서 D2D를 거치는 *one-way latency*입니다.

| 표준 | one-way latency | 비고 |
|------|-----------------|------|
| BoW Flexi | ~3 ns | 4 Gbps 기준 |
| BoW Standard | ~2 ns | 8~16 Gbps |
| UCIe Standard | ~2 ns | D2D adapter 포함 |
| UCIe Advanced | <2 ns | 최단 경로 |

*근본적 차이는 크지 않습니다*. UCIe의 D2D adapter layer가 *수 ns의 overhead*를 추가하지만, *클럭 도메인 동기화*를 자동으로 해주는 대가입니다. BoW는 *user가 직접 해야* 하지만 *latency를 더 줄일 수 있습니다*.

## 5. Power

raw pJ/bit 값은 다음과 같습니다.

```text
pJ/bit (raw PHY)
                    
BoW Flexi      ▪▪▪▪▪▪▪    0.7
BoW Standard   ▪▪▪▪▪      0.5
UCIe Standard  ▪▪▪        0.3
UCIe Advanced  ▪▪▪        0.25
```

흥미롭게도 *UCIe가 더 효율적*인 이유는 *bump pitch가 작아* trace가 짧고 *capacitance가 작기 때문*입니다. organic substrate에서는 lane 길이가 길어 *driver power*가 더 필요합니다.

다만 *데이터 양이 같다면* BoW Flexi의 0.7 pJ/bit도 *PCIe 5.0의 ~6 pJ/bit*에 비하면 *훨씬 효율적*입니다. D2D 자체가 *SerDes link 대비 한 자릿수 효율*입니다.

## 6. Reach

D2D link가 *얼마나 멀리 갈 수 있는지*입니다. 이게 *floorplan 자유도*를 결정합니다.

```text
Reach (link 길이)
                                                     [mm]
UCIe Advanced     ▪▪                                  2
UCIe Standard     ▪▪                                  2
BoW Standard      ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪          25
BoW Flexi         ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪  50
```

UCIe는 *인접 die*만 연결합니다. BoW는 *substrate를 가로질러* 멀리 갈 수 있습니다. 한 패키지에 *4개 이상의 die*를 자유로운 배치로 연결하려면 BoW가 *유리*합니다.

## 7. 생태계

생태계는 *UCIe 쪽이 압도적*입니다.

| 항목 | BoW | UCIe |
|------|-----|------|
| 표준 발표 시점 | 2019 (1.0), 2022 (2.0) | 2022 (1.0), 2024 (2.0) |
| Working Group 멤버 | ~30 | ~120 |
| 발표된 PHY IP | 3~4종 | 10종 이상 |
| 발표된 실제 제품 | 5종 내외 | 20종 이상 |
| 대중 인지도 | 낮음 | 높음 |

UCIe는 Intel·AMD·TSMC·ARM·Samsung 등 *주요 회사 대부분*이 참여하고, 빠르게 *de facto 표준*으로 자리 잡았습니다. BoW는 *틈새 표준*에 가깝지만, *그 틈새가 작지 않다는 것*이 핵심입니다.

## 결정 기준

언제 어느 쪽을 고를지 *간단한 결정 트리*입니다.

```text
시스템의 필요 D2D 대역폭은?
    │
    ├── < 500 GB/s ──► BoW Flexi 검토
    │                    │
    │                    └── organic 라인 사용 가능?  YES → BoW Flexi
    │                                                NO  → BoW Standard
    │
    ├── 500 GB/s ~ 2 TB/s ──► BoW Standard 또는 UCIe Standard
    │                            │
    │                            ├── 외부 칩렛 + 인증 필요  → UCIe Standard
    │                            └── 사내 설계, 비용 우선  → BoW Standard
    │
    └── > 2 TB/s ──► UCIe Advanced
                       │
                       └── (BoW로는 면적 부족)
```

추가로 다음 변수도 따져 봅니다.

- *CoWoS 라인 capacity* — 부족하면 BoW
- *time-to-market* — 짧으면 BoW (단순)
- *power budget* — 매우 빠듯하면 UCIe (pJ/bit 우위)
- *생태계 의존* — 외부 IP를 많이 쓰면 UCIe

## 흔한 오해 풀기

### "UCIe가 미래이고 BoW는 *과도기 표준*"

UCIe는 *고급 시장의 표준*이 되겠지만, *모든 칩렛 SoC가 silicon interposer를 쓰지는 않을 것*입니다. organic substrate 시장이 *없어지지 않는 한* BoW의 자리도 남습니다.

### "BoW가 *덜 안정적*이다"

표준이 단순하다고 *덜 안정적*이지 않습니다. Marvell Tahoe는 *800G 스위치 칩*에서 *수년간 양산*되고 있습니다. organic substrate의 *수율과 신뢰성*이 *수십 년 검증*된 자리이기도 합니다.

### "두 표준 중 *하나만 골라야 한다*"

[Ch 1](/blog/embedded/hardware/bow/chapter01-overview)에서 봤듯 *한 칩에 둘 다* 가능합니다. UCIe로 HBM, BoW로 I/O 칩렛 같은 *하이브리드 디자인*이 점점 늘어납니다.

### "BoW는 *한국 파운드리에 불리*"

오히려 반대입니다. Samsung Foundry의 *I-Cube*는 *silicon bridge*에 강점이 있고, *FOPLP*는 *organic 기반*입니다. BoW Standard/Flexi와 *잘 맞는 라인*입니다. UCIe Advanced 시장에서는 TSMC CoWoS가 압도적이지만, BoW 시장에서는 *Samsung도 경쟁력 있는 위치*에 있습니다.

## 자주 하는 실수

### *bandwidth density만* 비교하기

UCIe Advanced의 10 Tbps/mm²만 보고 *BoW를 탈락*시키는 경우. *bump pitch와 packaging cost*를 함께 고려해야 합니다. *시스템 BoM 전체*에서 D2D 비용이 어디서 오는지 봐야 정확합니다.

### *현재 IP catalog로만* 비교

지금 시점에서 *UCIe IP가 더 많지만*, BoW PHY IP도 *수년간 안정적으로 공급*되고 있습니다. *향후 5년 로드맵*에서 어느 표준이 *사라지지 않을지*가 중요합니다. 둘 다 *살아남을* 가능성이 높습니다.

### *Latency 차이*를 과대평가

표에서 봤듯 BoW vs UCIe latency 차이는 *1 ns 안*입니다. *기능 수준에서는* 영향이 미미한 경우가 많습니다. 대부분의 응용에서 *결정 변수가 아닙니다*.

## 정리

- BoW는 *organic substrate에서 동작*하는 *저비용 D2D*입니다.
- UCIe Advanced는 *silicon interposer*에서 *최대 대역폭 밀도*를 노립니다.
- 두 표준은 *bump pitch와 packaging cost*에서 결정적 차이가 납니다.
- bandwidth density는 *UCIe Advanced > UCIe Standard > BoW Standard > BoW Flexi* 순입니다.
- 패키지 비용은 *organic ≪ silicon bridge ≪ silicon interposer*로 한 자릿수씩 차이 납니다.
- protocol stack은 *UCIe가 무겁고 BoW가 가볍습니다*. 인증 vs 자유도의 trade-off입니다.
- 생태계는 UCIe가 압도적이지만, *BoW도 안정적으로 성장*합니다.
- *둘 중 하나*가 아니라 *한 패키지에 공존*이 점점 흔해집니다.

## 다음 편

[Ch 4: BoW Memory — 직접 메모리 접근](/blog/embedded/hardware/bow/chapter04-bow-memory)에서는 BoW의 *메모리 변형*을 봅니다. CXL·OMI를 BoW 위에 얹어 *메모리 칩렛을 organic substrate에 붙이는* 구성입니다.

## 관련 항목

- [Ch 1: BoW 개요](/blog/embedded/hardware/bow/chapter01-overview)
- [Ch 2: BoW 아키텍처](/blog/embedded/hardware/bow/chapter02-architecture)
- [Ch 4: BoW Memory](/blog/embedded/hardware/bow/chapter04-bow-memory)
- [Ch 5: BoW Flexi](/blog/embedded/hardware/bow/chapter05-bow-flexi)
- [UCIe Ch 1: 개요](/blog/embedded/hardware/ucie/chapter01-overview)
- [UCIe Ch 2: PHY와 module](/blog/embedded/hardware/ucie/chapter02-phy-module)
- [HBM Ch 1: 메모리 스택](/blog/embedded/hardware/hbm/chapter01-overview)
- [원문 — UCIe Specification](https://www.uciexpress.org/specification)
- [원문 — OCP ODSA BoW Spec](https://www.opencompute.org/projects/ocp-server/odsa)
