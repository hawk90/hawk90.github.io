---
title: "Ch 1: CXL의 자리와 진화 — 1.1에서 4.0까지"
date: 2026-05-16T09:01:00
description: "CXL이 푸는 문제, 세대별 진화, 4.0의 핵심 변경 (128 GT/s·Bundled Port)."
series: "CXL 4.0 Internals"
seriesOrder: 1
tags: [cxl, pcie, memory, interconnect]
draft: false
---

## 한 줄 요약

> **"CXL은 *PCIe 인프라*를 그대로 쓰면서 *가속기와 메모리 디바이스가 CPU와 더 가깝게 동작하도록* 만든 인터커넥트입니다."** — 가속기는 *host 메모리를 캐시*하고, host는 *device 메모리를 native load/store*합니다. CXL 4.0은 *PCIe 7.0 기반 128 GT/s*에 *Bundled Port·Streamlined Port*를 더한 세대입니다.

이 시리즈는 *CXL 4.0의 핵심 동작과 구현*을 15편으로 정리합니다. 1차 자료는 *CXL Consortium 공개 발표·Linux drivers/cxl/ 소스·QEMU 에뮬레이션·hyperscale 운용 자료*입니다. CXL 4.0 spec 문서는 *참고 자료*로 § 번호만 인용하며, *spec 내용의 재생산이 아닌 자체 분석·구현 관점의 해설*입니다.

## CXL이 푸는 문제 — PCIe만으로는 부족했던 것

PCIe는 *I/O 시맨틱*만 정의합니다. 그래서 가속기가 *host RAM의 hot region*을 빠르게 접근하려면 *매번 DMA로 복사*해야 하고, host가 *GPU·NPU의 HBM/DRAM*을 보려면 *벤더 전용 API*나 *PCIe MMIO*로 우회해야 했습니다. 이 *왕복 비용*이 *AI·HPC 워크로드의 성장*과 함께 점점 더 큰 병목이 되었습니다.

CXL은 *세 프로토콜의 묶음*으로 이 문제를 풉니다.

| 프로토콜 | 시맨틱 | 의무 여부 |
|---------|--------|----------|
| **CXL.io** | PCIe 호환 I/O — discovery·enumeration·error reporting·HPA lookup | *모든 디바이스 필수* |
| **CXL.cache** | 디바이스가 *host 메모리를 캐시* — coherent read/write | 선택 (Type 1·2) |
| **CXL.mem** | host가 *device 메모리를 load/store* — load instruction이 직접 동작 | 선택 (Type 2·3) |

세 프로토콜은 *같은 PCIe PHY*에 *시분할 다중화*되어 흐릅니다. *디바이스 측이 CXL을 지원*하면 *config space의 DVSEC (Designated Vendor-Specific Extended Capability)*이 *호스트에 CXL 호환임을 알림*. 호스트는 이를 보고 CXL 인터페이스를 활성화합니다.

## 세 프로토콜의 분리가 만든 단순함

CXL 설계의 가장 *영리한 결정*은 *I/O와 메모리·캐시 시맨틱의 분리*입니다.

- *CXL.io만 필수* — discovery·enumeration이 *기존 PCIe 그대로*이므로 *모든 PCIe 호스트가 CXL 디바이스를 일단 인식*할 수 있습니다. 호환성 비용 최소.
- *CXL.cache·CXL.mem은 선택* — 디바이스 유형에 맞게 *추가 능력만 켭니다*. SmartNIC는 CXL.cache만, 메모리 expander는 CXL.mem만 켭니다.
- *세 프로토콜이 같은 케이블* — *별도 인터커넥트 표준이 안 생기고* PCIe 인프라(slot·cable·switch·retimer)가 *그대로 재사용*됩니다.

이 *분리·재사용* 덕분에 *데이터센터 OEM 입장에서 CXL 채택 비용*이 *지난 10년의 어떤 새 인터커넥트보다도 낮습니다*. *Intel·AMD·NVIDIA 모두 같은 표준*을 *동시 양산*에 적용한 이유입니다.

## 세대 진화 — 매 세대 새로운 사용 모델

CXL은 *2019년 1.1 발표 이후 5세대*에 걸쳐 *backward compatibility를 유지*하면서 *사용 모델을 확장*했습니다.

| 세대 | 발표 | 추가된 핵심 능력 | 베이스 PHY |
|------|------|----------------|-----------|
| **1.1** | 2019 | 세 프로토콜 정의, Type 1·2·3 디바이스 분류 | PCIe 5.0 (32 GT/s) |
| **2.0** | 2020 | Managed Hot-Plug, persistent memory, single-level switching, multi-LD pooling | PCIe 5.0 |
| **3.0** | 2022 | Multi-level switching, *Coherent fabric*, GFAM, peer-to-peer, BISnp | PCIe 6.0 (64 GT/s) |
| **3.1** | 2023 | Direct P2P CXL.mem, Extended Metadata, TSP (Trusted Security Protocol) | PCIe 6.0 |
| **3.2** | 2024 | Performance monitoring, hotness monitoring, late poison, PPR Enhancement | PCIe 6.0 |
| **4.0** | 2025 | *128 GT/s* (PCIe 7.0), *Bundled Port*, *Streamlined Port*, *x2 native width*, *4 retimer 지원* | **PCIe 7.0 (128 GT/s)** |

각 세대의 *큰 점프*는 *서로 다른 방향*에서 일어났습니다.

- **2.0 = Switch·Pool** — 단일 호스트 직접 연결을 넘어 *디바이스 공유*.
- **3.0 = Fabric·GFAM** — Multi-host coherent fabric, 글로벌 메모리 풀.
- **4.0 = Bandwidth·Port aggregation** — 같은 fabric을 *두 배 빠르게*, *port를 묶어* 운용.

CXL 4.0이 *프로토콜을 크게 바꾸지 않은* 이유는 *3.0에서 도입된 Coherent Fabric·GFAM이 아직 막 양산 단계*에 들어섰기 때문입니다. 4.0은 *그 위에서 운용성·대역폭·port 집계*를 다듬는 세대입니다.

## CXL 4.0의 핵심 변경

CXL Consortium의 *공개 발표·press release·white paper 자료*가 강조하는 4.0의 주요 변경:

| 영역 | 변경 |
|------|------|
| **물리 계층** | *128 GT/s* — PCIe 7.0 PHY 그대로 사용. *x2 native width* 신규. *retimer 4개* 지원으로 *장거리 link* 가능. |
| **토폴로지** | **Bundled Port** — 여러 upstream port를 *논리적으로 묶어* host에 단일 그룹으로 노출. **Streamlined Port** — 간소화된 enumeration·운용 흐름. |
| **유지보수** | *Host-initiated PPR* (Post Package Repair) — host가 *부팅 시 device의 bad row repair* 트리거. *Memory sparing* — boot 또는 *다음 boot로 deferral*해 sparing 수행. |
| **CVME 강화** | *Patrol Scrub cycle end* 이벤트 추가, granularity control 강화. |
| **Compliance** | *Extended Metadata Capability* test 추가, *Compliance Mode DOE* 활용. |
| **Errata 흡수** | *3.2 errata 모두 통합*. |

*Flit 구조 자체는 3.0과 동일* — 같은 FEC·CRC·256B flit 배열을 *그대로 128 GT/s에서 사용*. *Backward compatibility 보장*. *4.0 디바이스가 3.x host에 attach되어도 동작*. 자세한 내용은 [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 분해합니다.

## Bundled Port — 4.0의 가시적 변화

*Bundled Port*는 *데이터센터 운용자 입장에서 가장 가시적*인 새 기능입니다. *디바이스가 multiple upstream port*를 가질 때, 그것들을 *논리적으로 하나의 port group*으로 묶어 *host에 노출*합니다.

기대 효과:

- **Latency 감소** — 트래픽이 *덜 혼잡한 port로 dynamic routing*.
- **Bandwidth 증가** — 여러 port를 *aggregated bandwidth*로 활용.
- **QoS 개선** — port 별로 *traffic class 분리* 가능.

운용 사례는 *대용량 메모리 디바이스가 16-lane link 하나로 부족할 때* *여러 link을 묶어 사용*하는 방식. 또는 *서로 다른 VH (virtual hierarchy)에 별도 port*를 *동시 노출*해 *fan-out 효율*을 높이는 방식.

## Flex Bus — 같은 PHY로 PCIe·CXL 둘 다

CXL의 *물리적 매개체*는 *Flex Bus*입니다. Flex Bus는 *PCIe·CXL 두 모드*를 *같은 PHY로 지원*하며, *training 결과에 따라 dynamic하게 모드 선택*합니다.

| 특성 | 의미 |
|------|------|
| 모드 자동 협상 | 부팅 시 *PCIe 모드 또는 CXL 모드* 결정 |
| 같은 PHY | PCIe Base Specification PHY 그대로 |
| Lane 구성 | x1, x2, x4, x8, x16 |
| Speed | CXL 4.0에서 8/16/32/64/128 GT/s 모두 |
| Bifurcation | CXL 모드 x8·x4, *128 GT/s에서 x2 native* |

*Flex Bus의 진짜 가치*는 *호스트 측 PCIe 인프라를 그대로 활용*하면서 *CXL 호환 디바이스만 추가*하면 되는 것입니다.

## Layering 개관 — 다음 14편의 지도

CXL 디바이스의 *프로토콜 스택*은 일반 PCIe와 유사한 구조에 *ARB/MUX*가 추가됩니다.

| Layer | 책임 | 시리즈 챕터 |
|-------|------|-----------|
| Transaction | CXL.io/cache/mem 트랜잭션 단위 | [Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)·[7](/blog/embedded/hardware/cxl/chapter07-cxl-cache)·[8](/blog/embedded/hardware/cxl/chapter08-cxl-mem) |
| Link | Flit 단위 신뢰성 (CRC·FEC·retry) | [Ch 9](/blog/embedded/hardware/cxl/chapter09-flit-format) |
| ARB/MUX | 세 프로토콜의 PHY 다중화 | [Ch 10](/blog/embedded/hardware/cxl/chapter10-arb-mux) |
| Flex Bus Physical | PCIe PHY, 모드 협상 | [Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features) |

ARB/MUX는 *CXL 고유* 레이어로 *세 프로토콜의 flit·packet을 하나의 PHY에 시분할*합니다.

## 이 시리즈의 구성

| Ch | 주제 |
|----|------|
| 1 (현 글) | CXL의 자리와 진화 |
| 2 | System Architecture — Type 1·2·3·MLD·MH-MLD |
| 3 | 메모리 일관성 — HDM-DB·HDM-D·Bias·BISnp |
| 4 | Pooling·GFAM·Fabric |
| 5 | CXL 4.0의 핵심 새 기능 |
| 6 | CXL.io |
| 7 | CXL.cache |
| 8 | CXL.mem |
| 9 | Flit Format |
| 10 | ARB/MUX |
| 11 | Linux drivers/cxl/ 분석 |
| 12 | QEMU CXL 에뮬레이션 |
| 13 | Switching·Fabric Manager |
| 14 | Security — IDE·SPDM·TSP·CXL TEE |
| 15 | RAS·Performance·Compliance |

## 자주 하는 실수

### "CXL.mem만 켜면 CPU가 device DRAM을 모두 본다"

*HDM Decoder가 매핑한 영역만* 보입니다. *디바이스가 HDM Decoder를 commit*하지 않으면 *load instruction이 fault*. Linux는 `cxl create-region` 후에야 시스템 RAM 또는 DAX로 노출합니다.

### "CXL 4.0이 CXL 3.x와 완전히 다른 프로토콜이다"

*Flit 구조·FEC·CRC는 3.0과 동일*. PHY가 *128 GT/s로 빨라지고* *Bundled Port·운용 기능*이 추가됐을 뿐 *프로토콜 레벨에서 BC가 보장*됩니다. *3.x 호스트에 4.0 디바이스가 attach해도 동작*.

### "CXL은 NVLink·Infinity Fabric을 대체한다"

*용도가 다릅니다*. NVLink/IF는 *GPU 간 단일 도메인 초고대역폭*에 최적. CXL은 *general purpose 메모리·일반 가속기 공유*. *공존*이 현실입니다. NVIDIA GB200도 *NVLink + CXL 둘 다* 노출합니다.

### "CXL 디바이스를 PCIe 슬롯에 그냥 꽂으면 된다"

*PCIe 5.0 이상 슬롯*과 *BIOS의 CEDT (CXL Early Discovery Table) 지원*이 필요. 옛 BIOS는 *CXL DVSEC을 무시*해 *일반 PCIe로만 인식*합니다. *BIOS update가 거의 필수*입니다.

## 정리

- CXL은 *PCIe 인프라*를 *그대로 쓰면서* 가속기·메모리 디바이스를 *CPU 가까이* 끌어옵니다.
- *세 프로토콜* (CXL.io/cache/mem) 중 *CXL.io만 필수*. 나머지는 *디바이스 사용 모델에 따라 선택*.
- *세대 진화*는 *backward compat 유지*하며 매 세대 *새 사용 모델*을 추가. 2.0 switch, 3.0 fabric, 4.0 bandwidth+port aggregation.
- CXL 4.0의 *핵심 변경*: *128 GT/s (PCIe 7.0)*, *Bundled Port·Streamlined Port*, *x2 native width*, *Host-initiated PPR*, *4 retimer 지원*.
- *Flit 구조·FEC·CRC는 3.0과 동일* — 프로토콜 안정성 + 운용성 진화.
- 본 시리즈는 *15편*으로 *개념·프로토콜·구현·운용*을 흐름으로 정리합니다.

## 다음 편

[Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD](/blog/embedded/hardware/cxl/chapter02-system-architecture)에서 *디바이스 분류*와 *Multi Logical Device·Multi-Headed Device의 구조*를 본격적으로 분해합니다.

## 관련 항목

- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Embedded Security Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)

## 시리즈 자료 출처 안내

본 시리즈의 *1차 자료*는 다음과 같습니다:

- **CXL Consortium 공개 자료** — press release, white paper, conference talk, webinar
- **Linux Kernel `drivers/cxl/` 소스** — GPL, 자유 분석 가능
- **QEMU CXL emulation 소스** — GPL
- **Hyperscale 공개 연구 자료** — Meta·Microsoft·Samsung·SK Hynix·Astera Labs의 공개 발표·논문

CXL 4.0 *Specification 문서* (Compute Express Link Specification Revision 4.0, Version 1.0, August 13, 2025)는 *참고 자료*로 § 번호만 인용합니다. spec 본문의 wording·table·figure를 *재생산하지 않으며*, *자체 분석과 구현 관점의 해설*입니다.

> CXL® and Compute Express Link® are trademarks of the Compute Express Link Consortium, Inc.
> Spec 인용은 © 2019-2025 COMPUTE EXPRESS LINK CONSORTIUM, INC. ALL RIGHTS RESERVED.의 저작권을 따릅니다.
