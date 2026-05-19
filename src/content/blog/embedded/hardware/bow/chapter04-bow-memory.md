---
title: "Ch 4: BoW Memory — 직접 메모리 접근"
date: 2026-05-16T04:00:00
description: "Memory-coherent extension — D2D 위에 CXL·OMI를 얹어 메모리 칩렛을 붙이는 BoW의 메모리 풀링 모드."
series: "BoW 개요"
seriesOrder: 4
tags: [bow, memory, coherence]
draft: false
---

## 한 줄 요약

> **"BoW Memory는 *메모리 트랜잭션을 BoW PHY 위에 매핑*하는 프로파일입니다."** — D2D 위에 CXL·OMI 같은 *코히어런트 protocol*을 얹어, *메모리 칩렛*을 *organic substrate*로 부착합니다. HBM 수준의 대역폭은 아니지만 *비용은 한 자릿수 낮습니다*.

[Ch 1~3](/blog/embedded/hardware/bow/chapter01-overview)에서 BoW의 *PHY 표준*을 봤습니다. 이번에는 BoW 위에 얹는 *메모리 protocol*과 그것이 만드는 *시스템 아키텍처*를 다룹니다. *DDR을 어떻게 칩렛으로 분리하는지*, *CXL 메모리 풀이 어떻게 BoW로 구성되는지*가 주제입니다.

## 왜 메모리를 칩렛으로 분리하나

전통적으로 *DRAM은 PCB 위의 DIMM*에 있고, *컨트롤러는 SoC 안*에 있었습니다. 이 모델의 한계가 점점 드러납니다.

![전통적 메모리 계층 — SoC 안에 컨트롤러, 외부 DIMM](/images/blog/hardware/bow/diagrams/ch04-traditional.svg)

이 모델의 한계는 다음과 같습니다.

- DDR PHY 면적이 SoC die의 *20~30%*를 차지합니다.
- 다양한 메모리(DDR/HBM/LPDDR/CXL)를 동시에 지원하려면 *PHY를 여러 개*  들고 있어야 합니다.
- 신호 무결성 한계로 *lane 수·속도가 정체*됩니다.

칩렛 시대의 발상은 *메모리 컨트롤러를 SoC에서 분리*해 *별도 다이*로 만드는 것입니다. 한 SoC가 *여러 종류의 메모리 컨트롤러 칩렛*을 *D2D로 골라* 붙일 수 있게 됩니다.

![칩렛화된 메모리 계층 — 컨트롤러를 별도 다이로 분리, BoW로 연결](/images/blog/hardware/bow/diagrams/ch04-chiplet.svg)

이 구조에서 *D2D 인터페이스에 얹는 protocol*이 *메모리 트랜잭션*입니다. 그 정합 사양이 BoW Memory입니다.

## BoW Memory의 정의

BoW Memory는 *별도의 PHY 표준*이 아닙니다. BoW Standard PHY 위에 *메모리 트랜잭션 매핑*을 추가한 *프로파일*입니다.

![BoW Memory 스택 — CPU / Coherency Protocol / BoW Framing / BoW PHY](/images/blog/hardware/bow/diagrams/ch04-stack.svg)

핵심은 *어떤 protocol을 얹어도 표준의 골격이 흔들리지 않는다*는 점입니다. BoW 사양은 *transaction framing 가이드*를 제공하고, *세부 protocol*은 시스템 설계자가 선택합니다.

## 호환 protocol

BoW Memory와 *조합 가능한 protocol*은 크게 셋입니다.

### 1. CXL.mem

CXL.mem은 *Compute Express Link* 사양 안의 *메모리 코히어런트 채널*입니다. 원래 PCIe 6.0 Gen5/Gen6 PHY 위에서 정의됐지만, *PHY-agnostic*하게도 쓸 수 있습니다. BoW PHY 위에 CXL.mem을 얹으면 *Type 3 메모리 디바이스*를 칩렛 형태로 만들 수 있습니다.

![BoW + CXL.mem — host SoC와 메모리 expander가 BoW로 연결](/images/blog/hardware/bow/diagrams/ch04-cxl-mem.svg)

이 구성의 장점은 *CXL 생태계의 software stack을 그대로* 쓸 수 있다는 점입니다. 호스트 입장에서는 BoW든 PCIe든 *동일한 CXL 메모리*로 보입니다. 자세한 CXL 동작은 [CXL Ch 2](/blog/embedded/hardware/cxl/chapter02-protocol)를 참고하면 좋습니다.

### 2. OMI (Open Memory Interface)

OMI는 OpenCAPI Consortium이 만든 *고대역폭 메모리 인터페이스*입니다. *25 Gbps SerDes* 기반인데, BoW PHY 위에도 *transaction 형식*을 매핑할 수 있습니다.

| protocol | 출신 | 위치 |
|----------|------|------|
| CXL.mem | PCIe 생태계 | 데이터센터 메인 |
| OMI | IBM POWER 생태계 | 고대역폭 메모리 |
| Custom | 사내 설계 | 가속기 specific |

OMI는 *지연 우선*이 특징입니다. CXL.mem보다 *수십 ns* 빠릅니다. *HPC와 고성능 메모리 풀*에서 BoW + OMI 조합이 검토됩니다.

### 3. Custom protocol

가속기 회사들은 *자체 메모리 트랜잭션*을 정의해 BoW에 얹기도 합니다. 예를 들어 *AI 가속기 + 메모리 칩렛* 구성에서 *cache coherency를 단순화*한 protocol을 쓰는 식입니다.

![Custom — AI accelerator와 HBM-class 컨트롤러 다이 사이의 BoW link](/images/blog/hardware/bow/diagrams/ch04-ai-mem.svg)

생태계 호환성은 잃지만 *불필요한 protocol layer*를 빼서 *latency와 power를 최적화*할 수 있습니다.

## Coherence 모델

메모리 칩렛이 *cache coherent*인지 *non-coherent*인지에 따라 시스템 복잡도가 크게 다릅니다.

| coherence 수준 | 특징 | 적용 |
|----------------|------|------|
| Non-coherent | host가 *직접 write-back* 관리 | 단순 메모리 확장 |
| Device-coherent | device쪽 cache는 *host directory*에 등록 | CXL.cache 일부 |
| Fully coherent | snoop·invalidate 모두 지원 | CXL.cache + CXL.mem |

BoW Memory는 *coherence 모델을 강제하지 않습니다*. PHY는 *바이트 단위 transaction*만 옮기고, *coherence는 위 protocol이 책임*입니다. 이게 *protocol-agnostic transport*의 의미입니다.

## Latency budget

메모리 칩렛이 *DDR DIMM과 비교해 받아들일 수 있는 latency*는 시스템마다 다릅니다.

| 메모리 접근 | latency (대략) |
|-------------|----------------|
| L1 cache hit | ~1 ns |
| L2 cache hit | ~3 ns |
| L3 cache hit | ~12 ns |
| SoC 내장 DDR | ~50 ns |
| BoW + DDR 칩렛 | ~80 ns |
| CXL Type 3 (over PCIe) | ~170 ns |
| NUMA remote | 200 ns+ |

BoW가 추가하는 latency는 *one-way 2~3 ns*, round trip 5~6 ns 정도입니다. DDR 자체의 50~70 ns에 비해 *작은 추가 비용*입니다. 호스트 입장에서 *SoC 내장 DDR보다 50~60% 느린* 메모리가 됩니다.

이 수준의 latency는 *L3 backing memory*나 *대용량 메모리 풀*에는 적절하지만, *latency-critical*한 cache fill에는 부담스럽습니다. *tiered memory* 구조에서 *hot tier가 아닌 warm tier*에 적합합니다.

## 한국 컨텍스트 — Samsung·SK Hynix

한국 메모리 회사들이 BoW Memory에 관심을 갖는 이유는 분명합니다.

### Samsung Foundry

Samsung은 *I-Cube (silicon bridge)*와 *X-Cube (3D stacking)* 두 라인을 운영합니다. BoW Memory의 *organic substrate 옵션*은 I-Cube보다 *더 싼 라인*에 매핑됩니다. *AI 추론 SoC + DDR 칩렛*을 *organic substrate*로 묶는 구성은 Samsung의 *FOPLP 라인*과 잘 맞습니다.

### SK Hynix

SK Hynix의 *HBM4*는 *hybrid bonding*으로 *D2D 인터페이스 자체를 표준 D2D 위에 얹는* 방향을 검토합니다. *HBM4의 base die*와 *호스트 SoC*를 *BoW 또는 UCIe*로 연결하는 구성이 회자됩니다. 이 영역은 BoW와 UCIe Advanced가 *경쟁*하는 자리입니다.

### Naver·Kakao AI 추론 칩

국내 AI 추론 칩 스타트업들은 *CoWoS 라인 capacity 부족* 때문에 *대안 packaging*을 적극 검토합니다. BoW Memory가 *organic substrate*에서 *DDR 칩렛 부착*을 가능하게 하면, *추론 SoC의 BoM*을 *수십 % 줄일 수 있습니다*.

## 실제 메모리 칩렛 구성 예

Eliyan이 발표한 *NuLink + DDR 칩렛* 레퍼런스를 단순화하면 다음과 같습니다.

![Eliyan NuLink reference — organic substrate에 compute die + memory controller die](/images/blog/hardware/bow/diagrams/ch04-nulink.svg)

D2D bandwidth가 *DDR5의 외부 대역폭과 매칭*되어 *병목이 생기지 않습니다*. 더 많은 메모리 컨트롤러 칩렛을 붙이면 *선형으로 확장*합니다.

## 자주 하는 실수

### *DDR PHY를 D2D PHY로 그대로* 쓰려는 시도

DDR PHY는 *PCB 환경*과 *training protocol*에 최적화되어 있어 D2D에 그대로 쓸 수 없습니다. *완전히 다른 PHY*가 필요합니다. BoW PHY 또는 UCIe PHY 위에 *메모리 transaction을 얹어야* 합니다.

### *CXL.mem latency*를 *BoW 환경*에 그대로 가정

PCIe 6.0 위의 CXL.mem latency 수치(~170 ns)는 *PCIe SerDes의 CDR*과 *retry buffer overhead*를 포함합니다. BoW 위의 CXL.mem은 *훨씬 빠릅니다*. CXL spec의 latency 값을 *그대로 가져오면 안 됩니다*.

### *coherence를 PHY에서* 해결하려는 시도

PHY는 byte transaction만 옮깁니다. *cache coherence는 protocol layer*에서 처리해야 합니다. 둘을 섞으면 *PHY 복잡도가 폭발*합니다.

### *organic substrate에서 HBM 수준 대역폭*을 기대

BoW Memory + organic substrate로는 *200~400 GB/s*가 현실적입니다. HBM3의 *819 GB/s*에 비하면 *절반 수준*입니다. *충분히 빠르지만 동급은 아닙니다*.

### *Tiered memory*의 *hot tier*에 BoW 메모리 배치

BoW 메모리는 *warm tier*에 적합합니다. *hot tier*는 *SoC 내장 DDR이나 HBM*이 맞습니다. tier 배치는 *latency budget*을 따져 정해야 합니다.

## 정리

- BoW Memory는 *PHY 변형이 아니라 protocol 프로파일*입니다.
- BoW PHY 위에 *CXL.mem, OMI, custom* protocol을 얹어 메모리 칩렛을 부착합니다.
- coherence 모델은 *protocol layer가 책임*입니다. PHY는 *byte transaction*만 옮깁니다.
- 추가 latency는 *one-way 2~3 ns*, DDR 대비 *50~60% 더 느린 정도*입니다.
- bandwidth는 *200~400 GB/s*가 현실적입니다. HBM 수준은 아니지만 *organic substrate*에서 이 정도면 충분합니다.
- *tiered memory의 warm tier*나 *CXL 메모리 풀의 칩렛 구현*에 적합합니다.
- 한국 메모리 회사들에게 *CoWoS 의존도를 낮추는 대안 packaging*으로 매력적입니다.
- Eliyan NuLink 같은 *상용 레퍼런스*가 *수년간 검증*되고 있습니다.

## 다음 편

[Ch 5: BoW Flexi — 저비용 구현](/blog/embedded/hardware/bow/chapter05-bow-flexi)에서는 BoW의 *최저비용 프로파일*을 봅니다. 130 μm bump pitch, organic substrate, *엣지·임베디드 칩렛*에 어떻게 어울리는지 다룹니다.

## 관련 항목

- [Ch 1: BoW 개요](/blog/embedded/hardware/bow/chapter01-overview)
- [Ch 2: BoW 아키텍처](/blog/embedded/hardware/bow/chapter02-architecture)
- [Ch 3: BoW 2.0 vs UCIe](/blog/embedded/hardware/bow/chapter03-vs-ucie)
- [Ch 5: BoW Flexi](/blog/embedded/hardware/bow/chapter05-bow-flexi)
- [CXL Ch 1: 개요](/blog/embedded/hardware/cxl/chapter01-overview)
- [CXL Ch 2: Protocol](/blog/embedded/hardware/cxl/chapter02-protocol)
- [HBM Ch 1: 메모리 스택](/blog/embedded/hardware/hbm/chapter01-overview)
- [원문 — OCP ODSA BoW Specification](https://www.opencompute.org/projects/ocp-server/odsa)
- [원문 — CXL Specification](https://www.computeexpresslink.org/specification)
