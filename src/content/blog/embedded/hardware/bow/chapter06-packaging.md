---
title: "Ch 6: 패키징 요구사항"
date: 2026-05-16T06:00:00
description: "Substrate·bump·EDA flow·DFT — BoW를 실제 양산하는 조건과 known good die 전략."
series: "BoW 개요"
seriesOrder: 6
tags: [bow, packaging, substrate, dft]
draft: false
---

## 한 줄 요약

> **"BoW 양산의 *진짜 어려움*은 *packaging과 test*입니다."** — PHY IP는 사기만 하면 됩니다. 그러나 *substrate 선택, bump 설계, known good die 전략, boundary scan*은 직접 결정해야 합니다. 이 글은 *BoW를 실제로 양산하기 위한 체크리스트*입니다.

[Ch 1~5](/blog/embedded/hardware/bow/chapter01-overview)에서 BoW의 *사양·아키텍처·변형*을 다뤘습니다. 마지막 글에서는 *현실의 양산*을 봅니다. 사양은 같지만 *substrate를 무엇으로 고르는지*, *test는 어떻게 할지*에 따라 *수율과 비용이 크게 갈립니다*.

## Packaging substrate 옵션

BoW를 양산할 때 *substrate 선택*이 *첫 번째 결정*입니다. 옵션별 특징을 정리하면 다음과 같습니다.

### 1. Organic substrate

![organic substrate — die가 bump로 organic laminate에 결합](/images/blog/hardware/bow/diagrams/ch06-organic.svg)

특징:

- bump pitch: 100~150 μm
- 단가: 매우 낮음 (~$5 for 100 mm²)
- routing 자유도: 중간
- 신뢰성: 검증됨
- BoW Flexi와 Standard 일부 지원

대부분의 BGA 패키지가 organic입니다. *수십 년 검증된 자리*이고 *공급망이 안정적*입니다.

### 2. Silicon bridge (EMIB, LSI, I-Cube)

![silicon bridge — 작은 Si fragment를 organic 안에 박아 미세 routing](/images/blog/hardware/bow/diagrams/ch06-silicon-bridge.svg)

특징:

- bump pitch: 45~55 μm (bridge 영역)
- 단가: 중간 (~$30~$50 for 100 mm²)
- 대표 기술: Intel EMIB, TSMC LSI, Samsung I-Cube
- BoW Standard와 UCIe Standard 둘 다 지원

*작은 silicon fragment*만 사용해 *비용을 줄이면서* 미세 routing이 가능합니다. *대부분의 organic 면적은 그대로 유지*합니다.

### 3. Silicon interposer (CoWoS, X-Cube)

![silicon interposer — full Si layer + TSV, organic base 위에 적층](/images/blog/hardware/bow/diagrams/ch06-interposer.svg)

특징:

- bump pitch: 25~45 μm
- 단가: 높음 ($200+ for 100 mm²)
- 대표 기술: TSMC CoWoS-S/L, Samsung X-Cube
- UCIe Advanced 전용

BoW는 silicon interposer를 *전제하지 않습니다*. silicon interposer가 필요한 시장은 UCIe Advanced의 자리입니다.

### 옵션 선택 결정 트리

```text
BoW PHY가 정해진 뒤
        │
        ├── BoW Flexi (130μm)
        │      │
        │      └─► organic substrate 일반 라인
        │
        ├── BoW Standard (100μm)
        │      │
        │      ├── high-density organic 사용 가능?
        │      │     YES → organic substrate
        │      │     NO  → silicon bridge
        │      └── reach가 25mm 이상?
        │            YES → organic substrate 권장
        │            NO  → silicon bridge 권장
        │
        └── (UCIe로 넘어감) ──► silicon bridge 또는 interposer
```

## Bump 설계

bump 수와 floorplan은 *PHY 면적과 routing 자유도*를 결정합니다.

### Bump map의 기본

한 Slice의 bump 요구는 다음과 같습니다.

Slice 하나의 bump 요구는 다음과 같습니다 (대략).

| 항목 | bump 수 |
|------|---------|
| 16 data lane × 1 | 16 |
| 1 fwd clock × 1 | 1 |
| 2~4 sideband × 1 | 2~4 |
| power / ground (data lane 1개당 1 GND 권장) | ~16 |
| reference signal | 2~4 |
| **총** | **~40 bump per Slice** |

reference signal과 GND를 합치면 *Slice 1개에 40~50 bump*가 필요합니다. 16 Slice 구성이라면 *~700 bump*입니다.

### Bump pitch에 따른 면적

130 μm pitch라면 *Slice당 bump 면적*은:

```text
40 bump × (130μm × 130μm) = 0.676 mm²

130μm pitch에서 lane 16개를 1열 배치:
세로 길이 = 16 × 130μm = 2.08 mm
가로 길이 = 5~6 × 130μm = 0.78 mm
(GND·power·sb 포함)

→ Slice 평면: ~1.6 mm²
```

100 μm pitch라면 같은 Slice가 *~1 mm²*로 줄어듭니다. 25 μm pitch(UCIe Advanced)라면 *~0.06 mm²*까지 줄어듭니다. *bump pitch가 평면 효율*을 결정합니다.

### Redundant bump

[Ch 2](/blog/embedded/hardware/bow/chapter02-architecture)에서 본 *redundant lane*은 *bump map에 별도 bump를 할당*해야 합니다. 시뮬레이션에서는 잘 잡혀도 *bump map에 누락*되면 *수율 향상이 불가능*합니다.

## EDA flow

BoW 양산의 *EDA flow*는 *4단계*로 나뉩니다.

![BoW EDA flow — PHY 통합, floorplan, signal integrity, package co-design](/images/blog/hardware/bow/diagrams/ch06-eda-flow.svg)

### PHY IP 선택

상용 IP 옵션은 다음과 같습니다.

| IP 회사 | 제품 | 지원 프로파일 | 공정 |
|---------|------|---------------|------|
| Synopsys | DesignWare BoW PHY | Standard, Flexi | 7nm, 5nm, 3nm |
| Cadence | BoW Controller + PHY | Standard | 7nm, 5nm |
| Marvell | Tahoe (사내 PHY) | Standard | 7nm, 5nm |
| Eliyan | NuLink (Flexi-유사) | 자체 변형 | 5nm |

IP 선택에서 *공정 가용성*과 *레퍼런스 디자인 유무*가 핵심입니다. Synopsys는 *가장 많은 공정 노드*를 지원하고, Eliyan은 *organic substrate에 가장 강합니다*.

### Signal integrity 시뮬레이션

BoW에서는 *eye diagram 검증*이 가장 중요합니다. 시뮬레이션 도구는 *Cadence Sigrity, Ansys SIwave, Synopsys HSPICE*입니다.

```text
eye diagram 검증의 핵심 체크
- eye height ≥ 100 mV (4 Gbps 기준)
- eye width ≥ 0.6 UI
- timing margin (skew worst case 포함)
- crosstalk (인접 lane)
- power supply noise injection
```

organic substrate는 *trace 길이가 길어* crosstalk가 *silicon interposer 대비 두드러집니다*. 그래서 *GND lane을 충분히* 두는 게 *signal integrity 비결*입니다.

### Substrate co-design

substrate routing은 *전통적으로 packaging house*가 담당했지만, BoW에서는 *die designer와 함께 co-design*하는 추세입니다.

```text
co-design이 필요한 이유
- bump map ≠ optimal substrate routing
- die가 정한 bump 위치가 substrate에서 routing congestion 유발 가능
- die-first 또는 substrate-first 둘 다 시뮬레이션 비용 큼
```

Cadence·Synopsys의 *die-package co-design 도구*가 이 영역에 진입했지만, 아직 *수작업 iteration이 많습니다*.

## DFT — Design for Test

BoW link를 *test하지 못하면 양산할 수 없습니다*. DFT의 핵심 항목입니다.

### Boundary scan

JTAG IEEE 1149.1을 *D2D link에 확장*한 *IEEE 1149.6/1149.10*이 BoW link 검증에 쓰입니다.

![boundary scan — BoW PHY 안의 scan cell이 TAP controller로 모이고 JTAG chain으로 묶임](/images/blog/hardware/bow/diagrams/ch06-boundary-scan.svg)

scan 모드로 *각 lane을 직접 제어*해 *open/short fault*를 잡습니다. PHY가 *normal mode로 동작하지 못해도* boundary scan으로는 검증 가능합니다.

### Built-in self test (BIST)

PHY 안에 *self-test 회로*를 넣어 *production test 시간을 줄입니다*.

BoW PHY 안에 들어가는 BIST 회로는 다음 블록들로 구성됩니다.

- pattern generator
- data lane (전송 경로)
- pattern checker
- fail counter

테스트 절차는 다음과 같습니다.

1. test pattern 생성 (PRBS, fixed pattern)
2. lane으로 send
3. loopback 또는 paired die에서 receive
4. checker가 pattern 비교
5. 실패 lane index 보고

production test에서는 *수 ms 안에* 모든 lane을 검증합니다. JTAG 외부 비교에 비해 *훨씬 빠릅니다*.

### Repair flow

*bad lane을 redundant lane으로 remap*하는 절차입니다.

```text
repair flow
1. die singulation 후 wafer test
2. BIST 실행 → bad lane index 추출
3. e-fuse 또는 OTP에 remap table 기록
4. final test에서 remap 확인
5. packaging
```

e-fuse는 *die 안의 작은 영역*에 *수십 비트의 정보*를 저장합니다. *한 번 burn하면 변경 불가*이지만, *die마다 다른 remap*이 가능합니다.

## Known Good Die (KGD) 전략

칩렛 양산의 *핵심 문제*는 KGD입니다. *die를 packaging에 넣기 전에* 모두 *동작 확인*되어야 합니다.

### KGD가 어려운 이유

```text
KGD test의 모순
1. die 단위 test는 wafer probing으로 진행
2. probing card는 microbump pitch를 따라가기 어려움
   (130μm는 가능, 25μm는 거의 불가능)
3. high-speed BoW link는 probe로 fully test 불가능
4. functional test 일부만 가능
5. packaging 후 final test에서 비로소 발견되는 결함 있음
```

이 문제를 다음 방식으로 완화합니다.

### KGD 강화 전략

| 전략 | 설명 |
|------|------|
| 보수적 design margin | 마진을 *충분히 크게* 두어 *probing test로도 잡힘* |
| Built-in self test | PHY 내부 BIST로 *probing 없이 자가 검증* |
| Stack-aware test | packaging 후에도 *재구성 가능한* redundant 활용 |
| 양산 ramp-up 보수성 | 초기 KGD rate를 *낮게 가정*하고 *yield curve 학습* |

Samsung Foundry의 I-Cube/X-Cube 라인은 *KGD wafer 단위 테스트 자동화*에 투자해 *advanced packaging의 약점*인 KGD를 보완하고 있습니다.

## 양산 ramp-up

BoW SoC를 처음 양산할 때 다음 단계를 거칩니다.

```bash
# 단순화한 양산 ramp-up 일정
# (실제는 12~18개월)

# 1. Engineering Sample (ES) — 첫 silicon
ES1: 디자인 검증, 기본 동작 확인
ES2: PHY tuning, signal integrity 측정
ES3: BIST 검증, package co-design 완료

# 2. Production Validation (PV)
PV1: KGD test flow 확정
PV2: yield 측정 (~수백 unit)
PV3: reliability test (HTOL, HAST)

# 3. Mass Production (MP)
MP ramp: 월 수천 → 수만 → 수십만 unit
```

이 과정에서 *yield 학습 곡선*이 BoW SoC의 *경제성*을 결정합니다. 일반적으로 *조기 양산 단계의 yield*는 *50~70%*에 머물고, *수개월에 걸쳐 90%+*로 올라갑니다.

## 자주 하는 실수

### *PHY IP 라이선스만 사면 끝*이라고 가정

PHY IP는 *컴포넌트의 한 부분*일 뿐입니다. *substrate co-design, signal integrity, BIST, KGD flow*는 모두 *추가 작업*입니다. PHY 라이선스 비용보다 *통합·검증 비용이 크게 들기*도 합니다.

### *Bump map을 die 디자인 끝물에* 결정

bump map은 *floorplan 초기 단계*에서 결정해야 합니다. die 디자인이 끝난 뒤 bump를 옮기면 *PHY 영역 전체를 재배치*해야 할 수도 있습니다.

### *Redundant lane*을 *PHY 시뮬레이션에서만* 확인

[Ch 2](/blog/embedded/hardware/bow/chapter02-architecture)에서도 언급했지만, *bump 할당까지 포함*해야 실제로 redundant가 작동합니다. *e-fuse remap 회로*도 함께 구현해야 합니다.

### *BIST 없이* boundary scan에만 의존

boundary scan은 *low-speed test*입니다. BoW link의 *high-speed 동작*은 *BIST가 있어야* production test에서 검증할 수 있습니다.

### *Substrate routing*을 *packaging house에 통째로 맡김*

bump pitch가 작거나 lane이 많으면 *packaging house가 routing congestion*에 막힙니다. *die-package co-design*을 *초기 단계부터* 진행해야 합니다.

### Organic substrate를 *너무 얇게* 설계

layer 수를 줄이려고 *trace를 무리하게 압축*하면 *crosstalk가 폭발*합니다. *최소 layer 수*는 *signal integrity 시뮬레이션*으로 결정합니다.

## 정리

- BoW 양산의 *substrate 선택*은 *PHY 변형과 시스템 비용*을 결정합니다.
- *organic substrate*(BoW Flexi/일부 Standard)와 *silicon bridge*(BoW Standard)가 BoW의 자리입니다.
- *bump 설계*는 *Slice당 40~50 bump*를 기준으로 합니다. redundant lane도 *bump map에 반영*해야 합니다.
- EDA flow는 *PHY IP 통합 → floorplan → signal integrity → package co-design*의 4단계입니다.
- DFT는 *boundary scan + BIST + e-fuse remap*이 표준 구성입니다.
- *Known Good Die*는 칩렛 양산의 *핵심 과제*입니다. *probing 한계*를 BIST와 보수적 design margin으로 완화합니다.
- 양산 ramp-up은 *12~18개월*이 일반적이고, *yield 학습 곡선*이 *경제성*을 결정합니다.
- Samsung Foundry, TSMC, ASE 모두 BoW에 *맞는 라인*을 운영하지만, *세부 PDK·DRC*는 라인마다 다릅니다.

## 시리즈 마무리

BoW 시리즈를 여기서 마칩니다. 1장에서 *BoW의 정체*를, 2장에서 *Slice 구조*를, 3장에서 *UCIe와의 비교*를, 4장에서 *메모리 변형*을, 5장에서 *Flexi 프로파일*을, 6장에서 *양산의 현실*을 다뤘습니다.

칩렛 시대는 *한 표준이 모든 시장을 지배하지 않습니다*. UCIe는 advanced packaging의 표준이 될 것이고, BoW는 *organic substrate의 표준*으로 자리 잡을 가능성이 높습니다. *한 패키지에 둘 다 쓰는 구성*도 점점 흔해질 것입니다.

다음에 읽으면 좋은 시리즈를 추천합니다.

- [UCIe 시리즈](/blog/embedded/hardware/ucie/chapter01-overview) — BoW의 *상위 시장*에 있는 표준입니다. 두 표준의 *공존 모델*을 이해하려면 함께 봐야 합니다.
- [HBM 시리즈](/blog/embedded/hardware/hbm/chapter01-overview) — 고대역폭 메모리 스택. *advanced packaging의 대표 응용*입니다.
- [CXL 시리즈](/blog/embedded/hardware/cxl/chapter01-overview) — 코히어런트 인터커넥트. BoW Memory 위에 얹히는 *대표 protocol*입니다.

## 관련 항목

- [Ch 1: BoW 개요](/blog/embedded/hardware/bow/chapter01-overview)
- [Ch 2: BoW 아키텍처](/blog/embedded/hardware/bow/chapter02-architecture)
- [Ch 3: BoW 2.0 vs UCIe 비교](/blog/embedded/hardware/bow/chapter03-vs-ucie)
- [Ch 4: BoW Memory](/blog/embedded/hardware/bow/chapter04-bow-memory)
- [Ch 5: BoW Flexi](/blog/embedded/hardware/bow/chapter05-bow-flexi)
- [UCIe Ch 1: 개요](/blog/embedded/hardware/ucie/chapter01-overview)
- [HBM Ch 1: 메모리 스택](/blog/embedded/hardware/hbm/chapter01-overview)
- [CXL Ch 1: 개요](/blog/embedded/hardware/cxl/chapter01-overview)
- [원문 — OCP ODSA BoW Specification](https://www.opencompute.org/projects/ocp-server/odsa)
- [원문 — IEEE 1149.6 boundary scan](https://standards.ieee.org/ieee/1149.6/)
