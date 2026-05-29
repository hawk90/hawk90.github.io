---
title: "Ch 1: BoW 개요 — 오픈소스 칩렛 인터페이스"
date: 2026-05-16T01:00:00
description: "Bunch of Wires — OCP ODSA가 만든 royalty-free D2D 표준, organic substrate에서도 동작하는 저비용 칩렛 인터페이스."
series: "BoW 개요"
seriesOrder: 1
tags: [bow, ocp, chiplet, d2d]
draft: true
---

## 한 줄 요약

> **"BoW는 *비싼 advanced packaging에 들어가지 않으려는* 칩렛 인터페이스입니다."** — UCIe가 *최대 대역폭 밀도*를 노리고 silicon interposer를 요구한다면, BoW는 *organic substrate에서도 동작*하는 *가장 단순한 D2D*를 목표로 합니다. OCP ODSA Working Group이 만들었고, 사양은 *royalty-free*입니다.

칩렛 시대가 열리면서 *D2D(die-to-die) 인터페이스 표준*이 갑자기 여럿 등장했습니다. UCIe, BoW, OpenHBI, AIB. 각자 *서로 다른 시장과 가격대*를 노립니다. 그중 BoW는 가장 *실용주의적인 접근*입니다. 고대역폭이 필요한 GPU·HBM 스택은 UCIe에게 넘기고, *organic substrate에서 동작하는 저비용 칩렛*에 집중합니다. AI 추론 칩, 네트워킹 SoC, 엣지 디바이스가 주된 타깃입니다.

이 시리즈는 BoW를 *내부 구조부터 패키징까지* 정리합니다. 첫 글에서는 BoW가 *어떤 문제를 푸는지*, *누가 만들었는지*, *어디에 쓰이는지* 짚습니다.

## 왜 BoW가 필요했나

2018년 무렵 칩렛이 메인스트림에 들어오면서 *D2D 인터페이스의 단편화*가 문제였습니다. AMD는 Infinity Fabric을 자체 IP로 가졌고, Intel은 AIB를 갖고 있었지만 외부 라이선스가 까다로웠습니다. 외부 ASIC 벤더와 IP 회사들은 *공개된 표준*이 필요했습니다.

이 자리를 OCP(Open Compute Project)의 ODSA(Open Domain-Specific Architecture) Working Group이 채웠습니다. 2019년에 BoW를 발표했고, *royalty-free 사양*으로 공개했습니다. 핵심 멤버는 다음과 같습니다.

| 회사 | 역할 |
|------|------|
| Marvell | Tahoe BoW PHY 레퍼런스, 네트워킹 SoC 적용 |
| AMD | 아키텍처 입력, 검증 |
| Samsung | 파운드리 측 packaging 검증 |
| Synopsys | BoW PHY IP 상용화 |
| Cadence | EDA flow, signal integrity 시뮬레이션 |
| Hewlett Packard Enterprise | 시스템 통합, 메모리 풀링 활용 |
| Eliyan | NuLink (BoW-Flexi 계열) 상용화 |

ODSA의 목표는 *open chiplet ecosystem*입니다. 한 회사가 모든 칩렛을 만드는 대신, *여러 회사의 칩렛*을 *하나의 패키지에 조합*할 수 있어야 합니다. 이를 위해서는 인터페이스가 *공개되고*, *라이선스 비용이 없으며*, *대중적인 패키징 기술*에서 동작해야 합니다.

## BoW가 푸는 문제

BoW의 설계 목표는 *세 가지*입니다.

### 1. 패키징 비용 최소화

UCIe Advanced는 *silicon interposer*(TSMC CoWoS, Samsung I-Cube)를 전제로 합니다. silicon interposer는 *25 μm bump pitch*까지 가능하지만, 한 장에 *수백 달러*의 추가 비용이 듭니다. 대량 양산 칩에서는 부담스럽습니다.

BoW는 *organic substrate*에서도 동작하도록 설계됐습니다. organic substrate는 *기존 BGA 패키지*에 쓰던 그 substrate입니다. *bump pitch는 100~130 μm*로 크지만, *대당 비용은 수 달러* 수준입니다. silicon interposer 대비 *10~100배 싸다*는 뜻입니다.

### 2. royalty-free

UCIe는 표준 자체는 공개되어 있지만, *실리콘 구현(PHY IP)*은 여전히 상용 IP 회사를 통합니다. BoW는 *사양·레퍼런스 디자인·테스트 벡터*까지 OCP가 무료로 배포합니다. 자체 PHY를 만들 자원이 있는 회사라면 *외부 IP 라이선스 비용 없이* 구현 가능합니다.

### 3. 단순한 protocol stack

UCIe는 *physical·D2D·protocol* 세 레이어를 모두 정의합니다. BoW는 *physical layer만* 표준화하고, *protocol은 사용자가 고릅니다*. CXL, AXI, custom 무엇이든 *BoW 위에 얹을 수 있습니다*. 단순함이 양날의 칼이긴 합니다. 호환성 검증을 자체로 책임져야 합니다.

## BoW의 위치

D2D 인터페이스를 *bump pitch vs bandwidth density*로 나열하면 BoW의 자리가 보입니다.

![D2D 표준의 bump pitch vs 대역폭 밀도](/images/blog/hardware/bow/diagrams/ch01-bandwidth-density.svg)

같은 그림을 표로 보면 다음과 같습니다.

| 표준 | bump pitch | 대역폭 밀도 | 패키징 | 주 용도 |
|------|------------|-------------|--------|---------|
| BoW Flexi | 130 μm | ~1 Tbps/mm² | organic substrate | 저비용 SoC, 엣지 AI |
| BoW Standard | 100 μm | ~2 Tbps/mm² | organic 또는 silicon bridge | 네트워킹, 추론 칩 |
| UCIe Standard | 45 μm | ~5 Tbps/mm² | silicon bridge (EMIB, LSI) | 데이터센터 SoC |
| UCIe Advanced | 25 μm | ~10 Tbps/mm² | silicon interposer (CoWoS) | GPU + HBM, AI training |

BoW와 UCIe는 *직접 경쟁이라기보다 다른 시장을 노립니다*. 한 칩에 *두 인터페이스가 공존*하는 경우도 가능합니다. CPU 코어 다이끼리는 UCIe로 묶고, 외부 I/O 칩렛은 BoW로 붙이는 식입니다.

## Slice — BoW의 기본 단위

BoW의 *기본 빌딩 블록*은 **Slice**입니다. Slice 하나가 *16개의 data lane*과 *forwarded clock*, 그리고 *sideband 신호*를 묶은 단위입니다. UCIe의 module과 비슷한 위치입니다.

![BoW Slice — 16 데이터 레인 + forwarded clock + sideband](/images/blog/hardware/bow/diagrams/ch01-slice.svg)

대역폭이 더 필요하면 *Slice를 여러 개 병렬로 묶습니다*. 8 Slice는 128 lane, 16 Slice는 256 lane이 됩니다. *Slice 단위로 scaling*하는 구조가 BoW의 특징입니다.

per-lane data rate는 *4 Gbps에서 16 Gbps*까지 *step별로 선택*합니다. 자세한 슬라이스 구조는 [Ch 2](/blog/embedded/hardware/bow/chapter02-architecture)에서 다룹니다.

## 적용 분야

BoW가 *어디에 쓰이는지* 보면 표준의 성격이 더 분명해집니다.

### 네트워킹 SoC

Marvell의 *Tahoe* PHY는 BoW를 *800G 이더넷 스위치 칩*에 씁니다. 한 패키지에 *SerDes 다이*와 *스위치 다이*를 organic substrate로 묶고, 그 사이를 BoW로 연결합니다. silicon interposer 없이도 *수십 Tbps의 칩렛 간 대역폭*을 확보합니다.

### 추론용 AI 칩

Eliyan의 *NuLink*는 BoW Flexi 계열로, *AI 추론 칩의 메모리 칩렛*을 organic substrate에 붙입니다. CoWoS 라인이 부족한 상황에서 *대안 packaging*으로 주목받습니다. 한국의 Naver·Kakao의 AI 추론 칩 스타트업들도 이 방향을 검토합니다.

### 엣지·임베디드

엣지 SoC에서 *MCU 다이*에 *AI 가속기 칩렛*을 얹는 구성도 BoW에 어울립니다. silicon interposer는 *과한 비용*이고, BoW Flexi의 *1 Tbps/mm²*면 충분한 경우가 많습니다.

### 메모리 풀링

HPE는 *CXL 메모리 풀*을 BoW Memory 변형으로 구성하는 레퍼런스를 발표했습니다. 자세한 내용은 [Ch 4](/blog/embedded/hardware/bow/chapter04-bow-memory)에서 다룹니다.

## 생태계 현황

2026년 기준 BoW 생태계는 *UCIe보다 작지만 안정적으로 성장*합니다.

| 카테고리 | 구성 요소 |
|---------|----------|
| 사양 | BoW 1.0 (2020) 초기 발표 · BoW 2.0 (2022) Flexi/Memory 변형 추가 · BoW Memory (진행 중) |
| PHY IP | Synopsys DesignWare BoW PHY · Cadence BoW IP · Marvell Tahoe (사내 PHY) |
| 패키징 | Samsung Foundry I-Cube (silicon bridge) · TSMC InFO/LSI · ASE organic substrate |
| 검증 도구 | Cadence Sigrity (SI/PI) · Ansys SIwave · OCP 레퍼런스 테스트 벡터 |

한국 파운드리 입장에서 BoW는 *I-Cube와 X-Cube 둘 다*에 매핑됩니다. I-Cube는 silicon bridge 기반이라 BoW Standard에 적합하고, organic 기반의 *FOPLP(Fan-Out Panel Level Packaging)* 라인은 BoW Flexi와 어울립니다.

## UCIe와 협력 vs 경쟁

자주 받는 질문이 "BoW와 UCIe 중 어느 쪽이 이길까"입니다. *틀린 질문*입니다. 두 표준은 서로 *다른 패키징·다른 가격대*를 노리고, *공존*할 가능성이 높습니다.

![패키지 한 장 안에서 UCIe와 BoW가 공존](/images/blog/hardware/bow/diagrams/ch01-ucie-bow-coexist.svg)

UCIe로는 HBM·고대역폭 가속기를 붙이고, BoW로는 *비용에 민감한 I/O 칩렛*을 붙이는 구성입니다. 두 표준의 *공존 모델*입니다. [UCIe Ch 1](/blog/embedded/hardware/ucie/chapter01-overview)에서 UCIe 쪽 시각을 함께 보면 좋습니다.

## 자주 하는 오해

### "BoW는 UCIe의 *열등한* 대체품"

bandwidth density만 보면 그렇지만, *조건이 다릅니다*. silicon interposer 없이 그 정도가 나오는 표준은 BoW 외에 없습니다. *비용/대역폭* 척도로 보면 BoW가 우위입니다.

### "BoW는 organic만 지원"

아닙니다. BoW Standard는 *silicon bridge*에도 잘 맞고, BoW Flexi가 *organic 전용*입니다. 둘은 *다른 프로파일*입니다. [Ch 5](/blog/embedded/hardware/bow/chapter05-bow-flexi)에서 차이를 자세히 봅니다.

### "OCP가 만든 거니까 *서버용*뿐"

OCP의 출신지는 서버이지만, BoW 사용처는 *네트워킹·엣지·임베디드까지* 넓습니다. 사양 자체에 *서버 가정*이 박혀 있지 않습니다.

### "PHY는 무료라 *추가 비용이 없다*"

사양은 무료지만, *PHY를 직접 설계*하려면 *수십 인년의 design 노력*이 듭니다. 대부분은 Synopsys·Cadence의 *상용 BoW PHY IP*를 라이선스해서 씁니다. 그 비용은 UCIe IP와 비슷한 수준입니다.

## 정리

- BoW는 OCP ODSA Working Group이 만든 *royalty-free D2D 인터페이스*입니다.
- 설계 목표는 *organic substrate에서도 동작*하는 *저비용 칩렛 연결*입니다.
- 기본 단위는 *16-lane Slice*이고, *4~16 Gbps per lane*에서 동작합니다.
- UCIe와 *직접 경쟁이 아니라 다른 시장*을 노립니다. 한 패키지에 *공존* 가능합니다.
- bandwidth density는 *Flexi 1 Tbps/mm² ~ Standard 2 Tbps/mm²*로 UCIe보다 낮지만, *bump pitch가 크고 organic 가능*입니다.
- 적용 분야는 *네트워킹 SoC, AI 추론, 엣지 SoC, CXL 메모리 풀링*입니다.
- 한국 파운드리(Samsung I-Cube, FOPLP)와도 *잘 맞는 표준*입니다.
- protocol layer는 표준에서 *분리*되어 있어 *CXL·AXI·custom*을 자유롭게 얹을 수 있습니다.

## 다음 편

[Ch 2: BoW 아키텍처 — 슬라이스 구조](/blog/embedded/hardware/bow/chapter02-architecture)에서는 *Slice의 내부*를 파헤칩니다. 16 lane의 구성, forwarded clock의 동작, sideband의 역할, Slice 간 alignment까지 다룹니다.

## 관련 항목

- [Ch 2: BoW 아키텍처](/blog/embedded/hardware/bow/chapter02-architecture)
- [Ch 3: BoW 2.0 vs UCIe 비교](/blog/embedded/hardware/bow/chapter03-vs-ucie)
- [Ch 5: BoW Flexi — 저비용 구현](/blog/embedded/hardware/bow/chapter05-bow-flexi)
- [UCIe Ch 1: 개요](/blog/embedded/hardware/ucie/chapter01-overview)
- [HBM Ch 1: 메모리 스택](/blog/embedded/hardware/hbm/chapter01-overview)
- [CXL Ch 1: 코히어런트 인터커넥트](/blog/embedded/hardware/cxl/chapter01-overview)
- [원문 — OCP ODSA BoW Specification](https://www.opencompute.org/projects/ocp-server/odsa)
