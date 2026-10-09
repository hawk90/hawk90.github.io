---
title: "Ch 1: CXL의 자리와 진화 — 1.1에서 4.0까지"
slug: "embedded/hardware/cxl/chapter01-cxl-position"
date: 2026-05-16T09:01:00
description: "CXL이 푸는 문제, 세대별 진화, 4.0의 핵심 변경 (128 GT/s·Bundled Port)."
series: "CXL 4.0 Internals"
seriesOrder: 1
tags: [cxl, pcie, memory, interconnect]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL은 *PCIe 인프라*를 그대로 쓰면서 *가속기와 메모리 디바이스가 CPU와 더 가깝게 동작하도록* 만든 인터커넥트입니다."** — 가속기는 *host 메모리를 캐시*하고, host는 *device 메모리를 native load/store*합니다. CXL 4.0은 *PCIe 7.0 기반 128 GT/s*에 *Bundled Port·Streamlined Port*를 더한 세대입니다.

이 시리즈는 *CXL 4.0의 핵심 동작과 구현*을 15편으로 정리합니다. 1차 자료는 *CXL Consortium 공개 발표·Linux drivers/cxl/ 소스·QEMU 에뮬레이션·hyperscale 운용 자료*입니다. CXL 4.0 spec 문서는 *참고 자료*로 § 번호만 인용하며, *spec 내용의 재생산이 아닌 자체 분석·구현 관점의 해설*입니다.

## CXL이 푸는 문제 — PCIe만으로는 부족했던 것

PCIe는 *I/O 시맨틱*만 정의합니다. 그래서 가속기가 *host RAM의 hot region*을 빠르게 접근하려면 *매번 DMA로 복사*해야 하고, host가 *GPU·NPU의 HBM/DRAM*을 보려면 *벤더 전용 API*나 *PCIe MMIO*로 우회해야 했습니다. 이 *왕복 비용*이 *AI·HPC 워크로드의 성장*과 함께 점점 더 큰 병목이 되었습니다.

CXL은 *세 프로토콜의 묶음*으로 이 문제를 풉니다.

| 프로토콜 | 시맨틱 | 의무 여부 |
|---------|--------|----------|
| **CXL.io** | PCIe 호환 I/O — discovery·enumeration·configuration·error reporting | *모든 디바이스 필수* |
| **CXL.cache** | 디바이스가 *host 메모리를 캐시* — coherent read/write | 선택 (Type 1·2) |
| **CXL.mem** | host가 *device 메모리를 load/store* — load instruction이 직접 동작 | 선택 (Type 2·3) |

세 프로토콜은 *같은 PCIe PHY*에 *시분할 다중화*되어 흐릅니다. *디바이스 측이 CXL을 지원*하면 *config space의 DVSEC (Designated Vendor-Specific Extended Capability)*이 *호스트에 CXL 호환임을 알림*. 호스트는 이를 보고 CXL 인터페이스를 활성화합니다.

## 세 프로토콜의 분리가 만든 단순함

CXL 설계의 가장 *영리한 결정*은 *I/O와 메모리·캐시 시맨틱의 분리*입니다.

- *CXL.io만 필수* — discovery·enumeration이 *기존 PCIe 그대로*이므로 *모든 PCIe 호스트가 CXL 디바이스를 일단 인식*할 수 있습니다. 호환성 비용 최소.
- *CXL.cache·CXL.mem은 선택* — 디바이스 유형에 맞게 *추가 능력만 켭니다*. 캐시만 필요한 Type 1은 CXL.cache를, memory expander인 Type 3는 CXL.mem을 켭니다.
- *세 프로토콜이 같은 케이블* — *별도 인터커넥트 표준이 안 생기고* PCIe 인프라(slot·cable·switch·retimer)가 *그대로 재사용*됩니다.

## 세대 진화 — 매 세대 새로운 사용 모델

CXL은 *2019년 1.1 발표 이후 5세대*에 걸쳐 *backward compatibility를 유지*하면서 *사용 모델을 확장*했습니다.

| 세대 | 발표 | 추가된 핵심 능력 | 베이스 PHY |
|------|------|----------------|-----------|
| **1.1** | 2019 | 세 프로토콜 정의, Type 1·2·3 디바이스 분류 | PCIe 5.0 (32 GT/s) |
| **2.0** | 2020 | Managed Hot-Plug, persistent memory, single-level switching, multi-LD pooling | PCIe 5.0 |
| **3.0** | 2022 | Multi-level switching, *Coherent fabric*, GFAM, peer-to-peer, BISnp | PCIe 6.0 (64 GT/s) |
| **3.1** | 2023 | Direct P2P CXL.mem, Extended Metadata, TSP (Trusted Security Protocol) | PCIe 6.0 |
| **3.2** | 2024 | CHMU(Hot-Page Monitoring Unit), 추가 performance monitoring event, PPR 강화, TSP 확장 | PCIe 6.0 |
| **4.0** | 2025 | *128 GT/s* (PCIe 7.0), *Bundled Port*, *Streamlined Port*, *x2 native width*, *4 retimer 지원* | **PCIe 7.0 (128 GT/s)** |

각 세대의 *큰 점프*는 *서로 다른 방향*에서 일어났습니다.

- **2.0 = Switch·Pool** — 단일 호스트 직접 연결을 넘어 *디바이스 공유*.
- **3.0 = Fabric·GFAM** — Multi-host coherent fabric, 글로벌 메모리 풀.
- **4.0 = Bandwidth·Port aggregation** — 같은 fabric을 *두 배 빠르게*, *port를 묶어* 운용.

4.0은 *3.x의 프로토콜과 256B flit을 그대로 유지*하면서 대역폭과 port 집계, memory RAS를 더한 세대입니다.

## CXL 4.0의 핵심 변경

CXL Consortium의 4.0 발표문(2025년 11월 18일)과 4.0 소개 웨비나(2025년 12월)가 밝힌 주요 변경:

| 영역 | 변경 |
|------|------|
| **물리 계층** | *128 GT/s* — PCIe 7.0 PHY 그대로 사용. *x2 native width* 신규. *retimer 4개* 지원으로 *장거리 link* 가능. |
| **토폴로지** | **Bundled Port** — 디바이스의 여러 port를 *한 묶음*으로 써 대역폭을 늘림. 묶음마다 *표준 port 하나 이상*과 *Streamlined Port* 여러 개. Streamlined Port는 데이터 대역폭 확장용으로 *면적·전력을 줄인* port이고 256B flit 모드만 씀. |
| **유지보수** | *Host-initiated PPR* (Post Package Repair) — reset을 넘어 유지되는 설정 bit로 *부팅 시 DRAM row repair*. *Memory sparing* — device boot 시 수행하거나 *다음 boot로 미룸*. |
| **CVME 강화** | *Patrol Scrub* cycle의 event 생성과 granularity control. |

*256B flit 형식은 3.x 그대로*이고, 컨소시엄은 대역폭을 두 배로 하면서 *지연을 더하지 않았다*고 밝혔습니다. CXL 3.x·2.0·1.1·1.0과 *완전한 하위 호환*을 유지합니다. 자세한 내용은 [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 분해합니다.

## Bundled Port — 4.0의 가시적 변화

4.0에서 운용자 눈에 가장 먼저 띄는 변화가 *Bundled Port*입니다. 디바이스가 여러 upstream port를 가질 때 그것들을 *논리적으로 한 port group*으로 묶어 host에 노출하는 기능입니다.

이 시리즈의 흐름에서 중요한 것은 이것이 *link 한 가닥의 속도를 올리는 방향(128 GT/s)과는 다른 축*이라는 점입니다. 한쪽은 파이프를 굵게 하고, 다른 쪽은 파이프를 여러 개 묶습니다. 4.0이 두 축을 동시에 건드렸다는 사실이 이 장에서 잡아 둘 지점이고, 묶었을 때 실제로 무엇이 좋아지는지는 [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 봅니다.

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

*256B flit 형식과 3.x 프로토콜은 그대로*입니다. PHY가 *128 GT/s로 빨라지고* *Bundled Port·memory RAS*가 추가됐을 뿐, 이전 버전과 *하위 호환*을 유지합니다.

### "CXL은 NVLink·Infinity Fabric을 대체한다"

*용도가 다릅니다*. NVLink/IF는 *GPU 간 단일 도메인 초고대역폭*용이고, CXL은 *범용 메모리·가속기 연결*용입니다.

### "CXL 디바이스를 PCIe 슬롯에 그냥 꽂으면 된다"

*CXL을 지원하는 root port*와 *플랫폼 펌웨어의 CEDT(CXL Early Discovery Table)*가 필요합니다. Linux의 `drivers/cxl/acpi.c`는 CEDT를 읽어 CXL host bridge와 메모리 window를 찾습니다.

## 정리

- CXL은 *PCIe 인프라*를 *그대로 쓰면서* 가속기·메모리 디바이스를 *CPU 가까이* 끌어옵니다.
- *세 프로토콜* (CXL.io/cache/mem) 중 *CXL.io만 필수*. 나머지는 *디바이스 사용 모델에 따라 선택*.
- *세대 진화*는 *backward compat 유지*하며 매 세대 *새 사용 모델*을 추가. 2.0 switch, 3.0 fabric, 4.0 bandwidth+port aggregation.
- CXL 4.0의 *핵심 변경*: *128 GT/s (PCIe 7.0)*, *Bundled Port*(Streamlined Port 포함), *native x2 width*, *retimer 최대 4개*, *memory RAS 강화*(PPR, sparing, patrol scrub event).
- *256B flit과 3.x 프로토콜은 그대로* — 이전 버전과 하위 호환.
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

이 시리즈는 다음 자료를 근거로 합니다.

- **CXL spec** — 컨소시엄이 공개한 CXL 3.1 spec(평가판, 2023-08)과 CXL 1.1 spec. 본문의 §·표 번호는 3.1 기준이고, 값은 표를 그대로 옮기지 않고 필요한 것만 인용합니다.
- **CXL Consortium 발표 자료** — CXL 3.2 발표문(2024-12-03), CXL 4.0 발표문(2025-11-18)과 소개 웨비나(2025-12-03). 4.0 spec 본문은 쓰지 않았으므로, 4.0 내용은 이 발표 자료에 나온 범위만 다룹니다.
- **Linux 커널 소스** — mainline v7.3-rc6(2026-10-08)의 `drivers/cxl/`·`include/cxl/` 등 (GPL)
- **QEMU 소스·문서** — QEMU master(2026-10) (GPL)
- **ndctl·pciutils** — `cxl`·`daxctl` 문서와 테스트, `lspci` 소스
- **논문** — Sun et al. (MICRO 2023, CXL 디바이스 실측), Pond·TPP (ASPLOS 2023)

> CXL® and Compute Express Link® are trademarks of the Compute Express Link Consortium, Inc.
> spec 인용은 Compute Express Link Consortium, Inc.의 저작권을 따릅니다.
