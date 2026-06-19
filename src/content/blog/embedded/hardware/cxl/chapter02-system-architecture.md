---
title: "Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD"
date: 2026-05-16T09:02:00
description: "CXL 디바이스 분류와 multi-LD·multi-head 구조."
series: "CXL 4.0 Internals"
seriesOrder: 2
tags: [cxl, cxl-type, mld, mh-mld, bundled-port]
draft: false
---

## 한 줄 요약

> **"CXL은 *디바이스를 5가지 형태*로 정의합니다."** — *Type 1·2·3* 세 기본 유형에 *MLD·MH-MLD* 두 multi-host 변형이 더해집니다. *Type 1은 cache-only NIC*, *Type 2는 메모리 있는 가속기*, *Type 3는 메모리 expander*, *MLD는 한 디바이스를 여러 host가 시분할*, *MH-MLD는 여러 upstream port를 가진 multi-headed device*입니다. CXL 4.0의 *Bundled Port*는 이 구분 위에 *port 집계* 한 층을 더 얹은 것입니다.

[Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position)에서 *세 프로토콜과 backward-compatible한 세대 진화*를 봤습니다. 이 장은 *디바이스 측 분류*입니다. *어떤 프로토콜 조합*을 지원하느냐, *몇 개의 host에 동시 노출*되느냐가 *디바이스 타입을 결정*합니다.

## 세 가지 기본 유형

CXL은 *지원하는 프로토콜 조합*으로 *디바이스를 3가지 type*으로 분류합니다.

| Type | 프로토콜 | 자체 메모리 | 핵심 능력 |
|------|---------|------------|----------|
| **Type 1** | CXL.io + CXL.cache | 없음 | host 메모리를 *coherent 캐시* |
| **Type 2** | CXL.io + CXL.cache + CXL.mem | 있음 (HBM·DRAM) | host와 *양방향 cache-coherent 공유* |
| **Type 3** | CXL.io + CXL.mem | 있음 (DRAM) | *host에 메모리 노출* |

CXL.io는 *모든 유형 필수*. 다른 두 프로토콜은 *디바이스 사용 모델에 따라 선택*입니다. 자세한 동작은 [Ch 6 CXL.io](/blog/embedded/hardware/cxl/chapter06-cxl-io)·[Ch 7 CXL.cache](/blog/embedded/hardware/cxl/chapter07-cxl-cache)·[Ch 8 CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 봅니다.

### Type 1 — Cache-only Accelerator

*자체 메모리 없는 가속기*입니다. *host 메모리를 캐시*해 PCIe 라운드트립을 회피합니다.

| 카테고리 | 예상 활용 |
|---------|---------|
| SmartNIC·DPU | packet metadata·flow state 캐싱 |
| Network appliance | routing table·NAT entry 캐싱 |
| HBA·storage offload | block translation table 캐싱 |

CXL 1.1부터 정의된 가장 단순한 type이지만 *production CXL.cache 디바이스는 아직 적습니다*. *2025+ 점진 양산* 단계입니다.

### Type 2 — Accelerator with Memory

*자체 HBM/DRAM을 가진 가속기*입니다. *host와 양방향 cache coherent*입니다.

| 제품군 | 자체 메모리 | 비고 |
|--------|-----------|------|
| AMD Instinct MI300X | 192 GB HBM3 | 처음부터 *Infinity Fabric + CXL 통합* 설계 |
| AMD Instinct MI325X | 256 GB HBM3E | MI300X 후속 |
| Intel Gaudi 3 | HBM2E | CXL 호환 PCIe |
| Versal AI Premium 계열 | FPGA + DDR/HBM | AMD/Xilinx CXL IP 통합 |
| NVIDIA Hopper/Blackwell | HBM3·HBM3E | NVLink 중심, CXL 모드는 제품·시점 의존 |

Type 2의 *coherency가 가장 복잡*합니다. *양방향 캐시 + Bias 전환*이 필요한데 [Ch 3 메모리 일관성](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 본격 분해합니다.

### Type 3 — Memory Expander

*순수 메모리 디바이스*입니다. *DRAM 모듈을 PCIe 너머로 노출*합니다.

| 제품 | 회사 | 폼팩터 |
|------|------|--------|
| CMM-D (Compute Memory Module-DDR) | Samsung | EDSFF E3.S |
| Niagara | SK Hynix | EDSFF E3.S |
| Leo | Astera Labs | AIC |
| CXL Memory Expander | Micron | EDSFF |
| Type 3 CXL Memory | Marvell·Rambus | AIC |

Type 3은 *device 측 캐시가 없습니다*. 모든 cache는 *host CPU의 L1·L2·L3*에 있고 *coherency 관리도 host* 단독. 그래서 *Type 3가 가장 단순*하고 *가장 흔합니다*.

## MLD — Multi Logical Device

*하나의 물리 디바이스를 여러 logical device로 분할*해 *여러 host가 시분할 사용*하는 구조입니다. CXL 2.0부터 정의됐습니다.

핵심 개념:

| 요소 | 역할 |
|------|------|
| Logical Device (LD) | 디바이스 자원의 *논리적 분할 단위* |
| LD-ID | 각 LD를 식별하는 ID — CXL.mem·CXL.io 양쪽에 노출 |
| Fabric Manager | LD를 *어느 host에 할당할지* out-of-band로 결정 |

운영 흐름:

1. Memory expander가 *2 TB physical capacity*를 가짐
2. Fabric Manager가 *512 GB × 4 LD*로 분할
3. Host A·B·C에 각각 LD0·LD1·LD2 할당
4. LD3은 *미할당 pool*로 유지
5. Host A의 워크로드 종료 시 *LD0 회수*, 새 워크로드에 *재할당*

이 *동적 재할당*이 *CXL 2.0 pooling의 핵심 가치*입니다. 자세한 흐름은 [Ch 4 Pooling·GFAM](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서.

## Shared FAM — 같은 영역을 다중 host 공유

CXL 3.0의 *Coherent Fabric*은 *같은 메모리 영역*을 *여러 host가 동시 접근*하게 합니다. *Pooling이 time-share*라면 *Shared FAM은 simultaneous share*. 일관성은 *Back-Invalidation Snoop* 메커니즘으로 유지됩니다.

| 모드 | 특성 | 적합 워크로드 |
|------|------|-------------|
| **Pooling (2.0)** | host별 *exclusive* time-share | 컨테이너 host overcommit, dynamic VM 메모리 |
| **Shared FAM (3.0+)** | multi-host *동시 read/write*, BISnp로 일관성 | 분산 DB·in-memory cache·shared model state |

Shared FAM은 *cache invalidation 트래픽*이 크게 늘 수 있어 *application 측 coordination*(transaction·lock)이 거의 필수입니다.

## MH-MLD — Multi-Headed Device

*디바이스가 multiple upstream port*를 가지는 구조입니다. 즉 *여러 host에 동시 attach*되어 보입니다.

| 차이 | MLD | MH-MLD |
|------|-----|--------|
| 물리 port 수 | 1개 | 여러 개 |
| host attach | switch 통해 multi-host | 직접 multi-host |
| Use case | switched pooling | direct multi-host (예: blade enclosure) |

MH-MLD의 *LD 관리*는 *MH-MLD 내부의 controller*가 합니다. *각 head별 LD*를 *독립적으로 인식·관리*. Fabric Manager 없이도 *enclosure level*에서 *dynamic 재할당*이 가능합니다.

## Bundled Port — 4.0의 새 layer

CXL 4.0의 *Bundled Port*는 *MH-MLD의 multiple port*를 *논리적으로 묶어 하나의 port group처럼 host에 노출*합니다.

기존 vs 4.0:

| 항목 | MH-MLD 전통 (3.x) | Bundled Port (4.0) |
|------|------------------|-------------------|
| Port 노출 | 각 port 독립 enumeration | *논리적 단일 group*으로 노출 |
| Host 측 관리 | port별 별도 device로 인식 | *port group을 한 device처럼* 인식 |
| 트래픽 라우팅 | host가 port 선택 | *device가 dynamic routing* |
| 효과 | 운영자가 port별 관리 | latency↓, bandwidth↑, QoS↑ |

[Ch 5 CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *Bundled Port·Streamlined Port의 동작*을 본격 분해합니다.

## Linux 측 인식 — 유형별 path

각 디바이스 유형이 *Linux에 어떻게 보이는지*가 다릅니다.

```bash
# Type 3 — 가장 흔한
$ ls /sys/bus/cxl/devices/
mem0/         # cxl_mem 드라이버
decoder0.0/   # HDM Decoder
region0/      # 사용자가 생성한 region

# Type 2 — accelerator + memory
$ ls /sys/bus/cxl/devices/
mem0/         # CXL.mem 영역
# 가속기 자체는 vendor-specific driver로 등록 (별도 sysfs)

# Type 1 — vendor driver 내부 사용
# 별도 sysfs 노출 없음. cxl_pci subsystem이 cache 인터페이스를 vendor 드라이버에 전달
```

*Type 3의 sysfs path*가 *Linux drivers/cxl/ 코드의 중심*입니다. 자세한 코드 워크스루는 [Ch 11 Linux drivers/cxl/](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서.

## 자주 하는 실수

### "Type 3 = Type 2의 단순 버전"

*디바이스 구현은 그렇지만 운영은 다릅니다*. Type 3는 *대량 메모리 관리·tiered memory·NUMA 통합*이 복잡. Type 2는 *coherency가 복잡한 대신 사용 패턴이 명확*(GPU 같은 compute). *운영 복잡도가 디바이스 복잡도와 일치하지 않습니다*.

### "MLD와 Shared FAM은 같은 거다"

*완전히 다릅니다*. MLD는 *time-share* (한 시점 한 host). Shared FAM은 *coherent simultaneous share* (동시 다중 access). coherency 메커니즘이 *완전히 다릅니다*.

### "Type 1 NIC를 데이터센터에 들이면 packet 처리가 빨라진다"

*Cache hit rate가 충분히 높을 때만*. *불규칙한 packet metadata access*는 *cache miss → host 라운드트립*이라 *오히려 느릴 수 있음*. 워크로드 access pattern *분석이 도입 전 필수*.

### "MH-MLD는 한 host 다운 시 다른 host도 함께 죽는다"

*그렇지 않습니다*. 각 head가 *독립 control path*를 가지므로 *한 host failure가 다른 host에 격리*됩니다. 단 *Fabric Manager redundancy*가 *실 운영의 핵심*.

### "Bundled Port가 Multi-LD를 대체한다"

*직교 개념*입니다. Bundled Port는 *port 수준 집계*, MLD는 *capacity 수준 분할*. *둘 다 동시 가능*. 예: *Bundled Port로 묶인 multi-LD device*.

## 정리

- CXL 디바이스는 *프로토콜 조합*으로 *Type 1·2·3*. *cache-only NIC·memory 가진 가속기·memory expander*입니다.
- *MLD*는 *한 디바이스를 LD로 분할*해 *multi-host time-share pooling*.
- *Shared FAM*은 *같은 메모리 영역을 multi-host simultaneous share*. CXL 3.0+에서 BISnp로 일관성 유지.
- *MH-MLD*는 *multiple upstream port를 가진 디바이스*. CXL 4.0의 *Bundled Port*는 그 port들을 *논리적으로 묶음*.
- Linux 측 *Type 3가 가장 흔한 sysfs path*. Type 1·2는 *vendor driver*가 추가 처리.

## 다음 편

[Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 *Type 2 가속기의 양방향 cache coherency*가 *어떻게 유지*되는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position)
- [Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)
- [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)
- [HBM·GDDR 심화 Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types) — 같은 분류를 *메모리 산업 관점*에서

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium 공개 자료·각 디바이스 벤더 공식 발표·Linux drivers/cxl/ 소스*를 1차 자료로 합니다. CXL 4.0 Specification (Revision 4.0, Version 1.0)은 *§ 번호 navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
