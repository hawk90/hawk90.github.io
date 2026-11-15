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

이 시리즈는 CXL의 개념·프로토콜·소프트웨어 관찰을 15편으로 정리합니다. PCIe enumeration과 물리 주소·캐시의 기본 개념을 아는 독자를 대상으로 합니다. 규격·발표에서 정의한 기능과 Linux·QEMU에서 관찰한 구현을 구분하며, 특정 버전의 소스 확인을 CXL 4.0 전체 지원이나 실측으로 확대하지 않습니다.

## CXL이 푸는 문제 — PCIe만으로는 부족했던 것

PCIe 장치도 DMA·MMIO·주소 변환 등으로 메모리에 접근할 수 있으므로 “매 접근마다 소프트웨어가 복사해야 한다”고 단정할 수 없습니다. CXL이 추가하는 핵심은 디바이스의 host 메모리 캐싱과 host가 접근하는 device 메모리에 대한 일관성·메모리 의미입니다. 실제 복사 제거와 성능 향상은 장치·driver·runtime과 workload에 따릅니다.

CXL은 *세 프로토콜의 묶음*으로 이 문제를 풉니다.

| 프로토콜 | 시맨틱 | 의무 여부 |
|---------|--------|----------|
| **CXL.io** | PCIe 호환 I/O — discovery·enumeration·configuration·error reporting | *모든 디바이스 필수* |
| **CXL.cache** | 디바이스가 *host 메모리를 캐시* — coherent read/write | 선택 (Type 1·2) |
| **CXL.mem** | host가 *device 메모리를 load/store* — load instruction이 직접 동작 | 선택 (Type 2·3) |

CXL.io와 CXL.cache/mem의 link 처리는 공통 물리 링크와 ARB/MUX에서 결합됩니다. 모든 프로토콜이 같은 형식의 packet을 같은 비율로 번갈아 보낸다는 뜻은 아닙니다. 링크의 CXL mode 협상과 host·device 지원이 먼저 필요하며, 이후 PCIe configuration space의 DVSEC 등으로 기능을 발견합니다. DVSEC를 읽은 것만으로 CXL.mem 접근 경로가 완성되지는 않습니다.

## 세 프로토콜의 분리가 만든 단순함

CXL 설계의 가장 *영리한 결정*은 *I/O와 메모리·캐시 시맨틱의 분리*입니다.

- CXL.io는 필수입니다. PCIe 호환 발견·설정 기반을 사용하지만 모든 PCIe host에서 모든 CXL 기능을 사용할 수 있다는 보장은 아닙니다.
- *CXL.cache·CXL.mem은 선택* — 디바이스 유형에 맞게 *추가 능력만 켭니다*. 캐시만 필요한 Type 1은 CXL.cache를, memory expander인 Type 3는 CXL.mem을 켭니다.
- 공통 물리 기반을 활용합니다. 다만 해당 속도·mode·토폴로지를 지원하는 root port·switch·retimer·firmware가 필요합니다. 일반 PCIe 부품을 그대로 연결하면 CXL.cache/mem도 동작한다고 가정하지 않습니다.

## 세대 진화 — 매 세대 새로운 사용 모델

CXL은 *2019년 1.1 발표 이후 5세대*에 걸쳐 *backward compatibility를 유지*하면서 *사용 모델을 확장*했습니다.

| 세대 | 발표 | 추가된 핵심 능력 | 베이스 PHY |
|------|------|----------------|-----------|
| **1.1** | 2019 | 세 프로토콜 정의, Type 1·2·3 디바이스 분류 | PCIe 5.0 (32 GT/s) |
| **2.0** | 2020 | Managed Hot-Plug, persistent memory, single-level switching, multi-LD pooling | PCIe 5.0 |
| **3.0** | 2022 | Multi-level switching, *Coherent fabric*, GFAM, peer-to-peer, BISnp | PCIe 6.0 (64 GT/s) |
| **3.1** | 2023 | Direct P2P CXL.mem, Extended Metadata, TSP (TEE Security Protocol) | PCIe 6.0 |
| **3.2** | 2024 | CHMU(Hot-Page Monitoring Unit), 추가 performance monitoring event, PPR 강화, TSP 확장 | PCIe 6.0 |
| **4.0** | 2025 | *128 GT/s* (PCIe 7.0), *Bundled Port*, *Streamlined Port*, *x2 native width*, *4 retimer 지원* | **PCIe 7.0 (128 GT/s)** |

각 세대의 *큰 점프*는 *서로 다른 방향*에서 일어났습니다.

- **2.0 = Switch·Pool** — 단일 호스트 직접 연결을 넘어 *디바이스 공유*.
- **3.0 = Fabric·GFAM** — Multi-host coherent fabric, 글로벌 메모리 풀.
- **4.0 = Bandwidth·Port aggregation** — 같은 fabric을 *두 배 빠르게*, *port를 묶어* 운용.

4.0은 *3.x의 프로토콜과 256B flit을 그대로 유지*하면서 대역폭과 port 집계, memory RAS를 더한 세대입니다.

## CXL 4.0의 핵심 변경

[CXL Consortium의 4.0 발표문](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-Specification-Release_FINAL_Website-Copy.pdf)과 [2025년 12월 소개 자료](https://computeexpresslink.org/wp-content/uploads/2025/12/CXL_4.0-Webinar_December-2025_FINAL.pdf)의 주요 변경입니다. 자료의 표지 날짜와 내부 슬라이드 날짜는 각각 12월 4일과 3일이므로 하나의 실험 날짜로 사용하지 않습니다.

| 영역 | 변경 |
|------|------|
| **물리 계층** | *128 GT/s* — PCIe 7.0 PHY 그대로 사용. *x2 native width* 신규. *retimer 4개* 지원으로 *장거리 link* 가능. |
| **토폴로지** | **Bundled Port** — 디바이스의 여러 port를 *한 묶음*으로 써 대역폭을 늘림. 묶음마다 *표준 port 하나 이상*과 *Streamlined Port* 여러 개. Streamlined Port는 데이터 대역폭 확장용으로 *면적·전력을 줄인* port이고 256B flit 모드만 씀. |
| **유지보수** | *Host-initiated PPR* (Post Package Repair) — reset을 넘어 유지되는 설정 bit로 *부팅 시 DRAM row repair*. *Memory sparing* — device boot 시 수행하거나 *다음 boot로 미룸*. |
| **CVME 강화** | *Patrol Scrub* cycle의 event 생성과 granularity control. |

*256B flit 형식은 3.x 그대로*이고, 컨소시엄은 링크 속도 향상과 latency adder에 관한 설계 목표를 제시합니다. 이는 workload의 load-to-use 지연이 같다는 실측 결과가 아닙니다. 이전 세대와의 호환은 협상한 속도·mode와 공통 기능의 범위에서 해석해야 합니다. 자세한 내용은 [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 분해합니다.

## Bundled Port — 4.0의 가시적 변화

4.0에서 운용자 눈에 가장 먼저 띄는 변화가 *Bundled Port*입니다. 디바이스가 여러 upstream port를 가질 때 그것들을 *논리적으로 한 port group*으로 묶어 host에 노출하는 기능입니다.

이 시리즈의 흐름에서 중요한 것은 이것이 *link 한 가닥의 속도를 올리는 방향(128 GT/s)과는 다른 축*이라는 점입니다. 한쪽은 파이프를 굵게 하고, 다른 쪽은 파이프를 여러 개 묶습니다. 4.0이 두 축을 동시에 건드렸다는 사실이 이 장에서 잡아 둘 지점이고, 묶었을 때 실제로 무엇이 좋아지는지는 [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 봅니다.

## Flex Bus — 같은 PHY로 PCIe·CXL 둘 다

CXL의 *물리적 매개체*는 *Flex Bus*입니다. Flex Bus는 *PCIe·CXL 두 모드*를 *같은 PHY로 지원*하며, *training 결과에 따라 dynamic하게 모드 선택*합니다.

| 특성 | 의미 |
|------|------|
| 모드 자동 협상 | 부팅 시 *PCIe 모드 또는 CXL 모드* 결정 |
| 같은 PHY | PCIe Base Specification PHY 그대로 |
| native width | 4.0은 x2 native 지원을 추가합니다. degraded width와 같은 분류로 섞지 않습니다. |
| 속도·mode | 실제 링크의 협상 속도와 flit mode를 확인합니다. |

CXL 기능을 사용할 수 있는지는 endpoint 하나의 기능표로 끝나지 않습니다. root port, 연결 경로와 firmware/OS 지원도 함께 확인합니다.


## Layering 개관 — 다음 14편의 지도

CXL 디바이스의 *프로토콜 스택*은 일반 PCIe와 유사한 구조에 *ARB/MUX*가 추가됩니다.

| Layer | 책임 | 시리즈 챕터 |
|-------|------|-----------|
| Transaction | CXL.io/cache/mem 트랜잭션 단위 | [Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)·[7](/blog/embedded/hardware/cxl/chapter07-cxl-cache)·[8](/blog/embedded/hardware/cxl/chapter08-cxl-mem) |
| Link | Flit 단위 신뢰성 (CRC·FEC·retry) | [Ch 9](/blog/embedded/hardware/cxl/chapter09-flit-format) |
| ARB/MUX | 세 프로토콜의 PHY 다중화 | [Ch 10](/blog/embedded/hardware/cxl/chapter10-arb-mux) |
| Flex Bus Physical | PCIe PHY, 모드 협상 | [Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features) |

ARB/MUX는 link layer 사이의 중재와 물리 경로 선택을 담당합니다. 세부 framing과 제약은 해당 세대·flit mode의 규칙을 적용하며 [Ch 10](/blog/embedded/hardware/cxl/chapter10-arb-mux)에서 구분합니다.

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

메모리 접근에는 플랫폼 window, 경로의 decoder, OS 매핑과 영역의 상태가 함께 맞아야 합니다. Linux에는 firmware가 이미 구성한 region도 있으므로 사용자가 반드시 `cxl create-region`을 호출해야 하는 것은 아닙니다. Device DAX와 System RAM 노출도 별도 단계이며, 설정 부족이 항상 같은 CPU fault로 나타난다고 단정하지 않습니다.

### "CXL 4.0이 CXL 3.x와 완전히 다른 프로토콜이다"

*256B flit 형식과 3.x 프로토콜은 그대로*입니다. PHY가 *128 GT/s로 빨라지고* *Bundled Port·memory RAS*가 추가됐을 뿐, 이전 버전과 *하위 호환*을 유지합니다.

### "CXL은 NVLink·Infinity Fabric을 대체한다"

*용도가 다릅니다*. NVLink/IF는 *GPU 간 단일 도메인 초고대역폭*용이고, CXL은 *범용 메모리·가속기 연결*용입니다.

### "CXL 디바이스를 PCIe 슬롯에 그냥 꽂으면 된다"

해당 CXL 기능을 지원하는 플랫폼과 경로가 필요합니다. ACPI 기반 플랫폼에서 Linux v6.12의 `drivers/cxl/acpi.c`는 CEDT로 host bridge와 fixed memory window를 발견합니다. CEDT가 존재하는 것과 endpoint·decoder·OS 메모리 노출이 모두 준비된 것은 다릅니다.

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
- [Modern Embedded Recipes: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Embedded Security Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)

## 시리즈 자료 출처 안내

이 시리즈에서는 자료의 판과 검증 범위를 장별로 명시합니다. 규격의 기능과 공개 발표의 목표, 소프트웨어 구현과 실제 장치 결과는 서로 다른 증거입니다.

- [CXL 1.1 공개 규격](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-1.1-Specification.pdf), [CXL 3.1 공개 평가판](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf): 절 번호는 명시한 판을 따릅니다. 전체 규격을 구현·인증했다는 뜻은 아닙니다.
- [CXL 4.0 발표문](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-Specification-Release_FINAL_Website-Copy.pdf), [소개 자료](https://computeexpresslink.org/wp-content/uploads/2025/12/CXL_4.0-Webinar_December-2025_FINAL.pdf), [공식 Q&A](https://computeexpresslink.org/blog/introducing-the-cxl-4-0-specification-webinar-qa-recap-4386/): 발표 범위의 기능·제약을 확인합니다.
- [Linux v6.12 `drivers/cxl`](https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl), [ndctl v80](https://github.com/pmem/ndctl/tree/04815e5f8b87e02a4fb5a61aeebaa5cad25a15c3): 이 글의 소스 대조 기준입니다. 확인하지 않은 v7.3-rc나 현재 master를 실행 근거로 표기하지 않습니다.
- QEMU와 하드웨어의 실제 실행 여부·버전은 각 실습 장에서 구분합니다. Type 3 에뮬레이션은 4.0 링크·일관성·성능을 재현하는 시험이 아닙니다.
- 논문의 측정은 그 논문이 사용한 장치·플랫폼·workload에 한정합니다.

> CXL® and Compute Express Link® are trademarks of the Compute Express Link Consortium, Inc.
> spec 인용은 Compute Express Link Consortium, Inc.의 저작권을 따릅니다.
