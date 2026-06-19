---
title: "CXL Type 1·2·3 디바이스 분류 — Cache·Accelerator·Memory"
date: 2026-06-15T09:03:00
description: "CXL 디바이스 세 유형 — Type 1 (cache-only), Type 2 (accelerator with memory), Type 3 (memory expander)의 사용 사례와 트래픽 패턴."
series: "HBM·GDDR 심화"
seriesOrder: 11
tags: [cxl, cxl-type, accelerator, memory-expander]
draft: false
---

## 한 줄 요약

> **"같은 CXL 링크라도 *어떤 프로토콜 조합*을 쓰는지에 따라 *완전히 다른 디바이스*가 됩니다."** — *Type 1*은 *NIC·HBA가 host 메모리를 캐시*, *Type 2*는 *GPU·NPU가 host와 양방향 캐시 공유*, *Type 3*는 *메모리 expander*. 각 유형은 *대표 사례·트래픽 패턴·Linux 인식 경로*가 다릅니다.

[Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 *프로토콜 메시지*를 봤습니다. 같은 메시지라도 *Type 1·2·3 디바이스*가 *어떻게 사용*하는지가 *완전히 다릅니다*. 이 장은 *디바이스 유형 분류*와 *실 제품 매핑*을 정리합니다.

## 세 유형의 핵심 차이

CXL은 *지원하는 프로토콜 조합*으로 디바이스 유형을 정의합니다.

| Type | 프로토콜 | 자체 메모리 | 핵심 능력 |
|------|---------|------------|----------|
| **Type 1** | CXL.io + CXL.cache | 없음 | host 메모리를 *coherent 캐시* |
| **Type 2** | CXL.io + CXL.cache + CXL.mem | 있음 (HBM·DRAM) | host와 *양방향 cache-coherent 공유* |
| **Type 3** | CXL.io + CXL.mem | 있음 (DRAM) | *host에게 메모리 노출* |

핵심 결정 변수는 *어느 방향의 cache coherency가 필요한가*입니다.
- Type 1: device → host 캐시 (network packet 메타데이터 등)
- Type 2: 양방향 (GPU shared workload)
- Type 3: host → device (메모리 확장)

## Type 1 — Cache-only Accelerator

Type 1은 *자체 메모리 없는 가속기*입니다. *host 메모리를 cache*해서 빠르게 접근합니다.

NIC 시나리오 (packet metadata가 host DRAM 0x1000에 있는 경우):

| 단계 | 동작 |
|------|------|
| 1 | NIC가 패킷 처리 위해 metadata 필요 → *D2H Req* RdShared, addr=0x1000 |
| 2 | Host → NIC: *H2D DRS* data, addr=0x1000. NIC가 local cache에 저장 |
| 3 | 다음 패킷도 같은 metadata 사용 → NIC cache hit, host 접근 없음 |

*Type 1은 양산 사례가 아직 적은 영역*입니다. 시장의 *SmartNIC·DPU 제품 다수*가 *PCIe 기반에 머무르고*, *CXL.cache로의 전환*은 *2025+ 점진 진행* 중입니다. 후보 제품군:

| 카테고리 | 대표 제품군 |
|---------|------------|
| SmartNIC | NVIDIA ConnectX·BlueField, Marvell OCTEON, Intel IPU 계열 |
| DPU | NVIDIA BlueField, AMD Pensando, Marvell OCTEON 10 |
| 5G/network appliance | 다양한 vendor |

*이 카테고리들이 CXL Type 1으로 전환*될 가능성이 거론되지만 *실제 spec 지원·양산은 product별로 다름*. 도입 검토 시 *해당 제품의 CXL 1.1/2.0 지원 여부*를 *데이터시트*로 확인해야 합니다.

*Type 1의 가치*는 *host RAM의 hot region을 device 측에 prefetch*해 *PCIe round-trip을 회피*하는 것입니다. 네트워크 라우팅 테이블·flow state 같은 *hot metadata*에 효과적인 영역입니다.

## Type 2 — Accelerator with Memory

Type 2는 *자체 HBM/DRAM을 가진 가속기*입니다. GPU·NPU·FPGA 가속기가 여기 속합니다.

LLM inference 시나리오 (Type 2 GPU + HBM):

| Phase | Host 측 | Device 측 | 트래픽 |
|-------|--------|----------|--------|
| 1. Weight 로딩 | M2S RwD로 GPU HBM에 weight write | HBM에 weight 저장 | host → device 대량 |
| 2. GPU compute | (idle) | Bias 전환: Device Bias, HBM compute (snoop 없음) | 거의 없음 |
| 3. Output 회수 | Bias 전환: Host Bias, M2S Req로 read | S2M DRS로 output data | device → host |

*Type 2의 핵심*은 *cache coherency가 양방향*이라는 점. host도 *GPU HBM을 직접 load/store*할 수 있고, GPU도 *host RAM을 캐시*할 수 있습니다. *Bias 전환*으로 *coherency overhead를 phase별로 최적화*.

*대표 사례 (CXL 모드 또는 호환성 명시된 제품 위주):*

| 제품 | 회사 | 비고 |
|------|------|------|
| Instinct MI300X·MI325X | AMD | 처음부터 *Infinity Fabric + CXL 통합* 설계, EPYC와 자연스러운 조합 |
| Gaudi 3 | Intel | HBM2E 기반 가속기, CXL 호환 PCIe 인터페이스 |
| Sapeon·Rebellions NPU 계열 | Sapeon Inc·Rebellions | 한국 AI 가속기, 일부 제품군이 CXL 옵션 검토 |
| Versal AI Premium 계열 | AMD/Xilinx | FPGA 기반, CXL IP 통합 가능 |

NVIDIA의 경우 *Hopper/Blackwell은 NVLink 중심*. *CXL 모드 지원 여부와 범위는 제품 변종·시점별로 다름*. *AMD MI300X*는 *원래부터 CXL 기반*이라 *AMD EPYC + Instinct* 조합에서 자연스러운 흐름.

## Type 3 — Memory Expander

Type 3은 *순수 메모리 디바이스*입니다. *DRAM 모듈을 PCIe 너머로 노출*합니다.

Memory Expander 시나리오 — *HDM Decoder가 SPA 0x80_0000_0000을 mem0에 매핑*한 경우:

| 단계 | 동작 |
|------|------|
| 1 | CPU 명령: `rax = [0x80_0000_0000]` |
| 2 | Host → Device: *M2S Req* MemRd, addr=0x80_0000_0000 |
| 3 | Device가 DRAM read |
| 4 | Device → Host: *S2M DRS* 64 B data |
| 5 | Host 측 cache가 hot data 보관 (device 측엔 cache 없음) |

*Type 3의 핵심*은 *device 측 cache 없음*. 모든 cache는 *host CPU의 L1·L2·L3*에 있고, *coherency 관리도 host*가 단독으로 합니다. 그래서 *Type 3는 가장 단순*하고 *가장 흔합니다*.

*대표 사례*:

| 제품 | 회사 | 용량 | 폼팩터 |
|------|------|------|--------|
| CMM-D (Compute Memory Module-DDR) | Samsung | 128~512 GB | EDSFF E3.S |
| Niagara | SK Hynix | 96~256 GB | EDSFF E3.S |
| Leo | Astera Labs | up to ~2 TB | AIC |
| CXL Memory Expander | Micron | 256 GB | EDSFF |
| Type 3 CXL Memory | Marvell | 다양 | AIC |
| MAX Memory | Rambus | 다양 | AIC |

[Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 봤듯 *Samsung·SK Hynix 두 한국 회사*가 *HBM 시장 우위를 CXL Type 3에 확장*하는 중입니다.

## Linux 인식 경로 — 유형별

Linux는 *어떤 드라이버를 binding*하느냐로 유형을 구분합니다.

```bash
# Type 3 — 가장 흔한 path
$ ls /sys/bus/cxl/devices/
mem0/         # cxl_mem 드라이버
decoder0.0/   # HDM Decoder
region0/      # 사용자가 생성한 region

# Type 2 — accelerator + memory
$ ls /sys/bus/cxl/devices/
mem0/         # CXL.mem 영역
dev0/         # accelerator (vendor-specific driver)
```

*Type 1*은 보통 *별도 sysfs 노출 없음* — *vendor 전용 드라이버*가 *CXL.cache*를 *내부 사용*하고 *기존 PCI subsystem*에 *기존 device처럼* 노출합니다.

## 트래픽 패턴 비교

같은 PCIe 5.0 x16 링크에서 *유형별 트래픽 특성*:

| 유형 | 주된 트래픽 | 평균 burst | 지연 민감도 |
|------|------------|-----------|------------|
| Type 1 | CXL.cache D2H Req·H2D DRS | 64 B | 매우 높음 (network jitter) |
| Type 2 (compute phase) | 거의 없음 (Device Bias) | — | — |
| Type 2 (data phase) | CXL.mem 양방향 | 4 KB~ | 중간 |
| Type 3 (read-heavy) | M2S Req + S2M DRS | 64 B | 중간 |
| Type 3 (write-heavy) | M2S RwD + S2M NDR | 64 B | 낮음 (write buffer) |

*Type 2가 가장 동적*입니다 — phase별로 트래픽이 완전히 달라집니다.

## 자주 하는 실수

### "Type 3가 Type 2보다 항상 단순하다"

*디바이스 구현은 그렇지만 운영은 다릅니다*. Type 3는 *대량 메모리 관리·tiered memory·NUMA 통합*이 복잡합니다. Type 2는 *coherency가 복잡한 대신 사용 패턴이 명확*(GPU 같은 컴퓨트). 운영 복잡도가 *반드시 디바이스 복잡도와 일치하지 않습니다*.

### "Type 1 NIC = 무조건 빠름"

*Cache hit rate가 충분히 높을 때만*입니다. *불규칙한 packet metadata access*는 *cache miss → host 라운드트립*이라 *오히려 느려질 수 있음*. *워크로드 access pattern 분석*이 *Type 1 도입 전 필수*입니다.

### "NVIDIA GPU는 NVLink만 쓴다"

*GH200·B200부터 CXL 모드 지원*. NVLink 도메인 밖(non-NVIDIA host)에서는 *CXL Type 2*로 동작합니다. *NVIDIA 전유물이 아닙니다*.

### "Type 3 디바이스에 CXL.cache 트래픽이 보이면 이상"

*맞습니다*. Type 3은 *CXL.io + CXL.mem*만 사용. *CXL.cache 트래픽이 보이면* *spec 위반 또는 firmware bug*입니다. `cxl event-log`로 추적.

### "MI300X와 Hopper는 같은 카테고리"

*아닙니다*. MI300X는 *처음부터 Type 2*로 설계됐고, Hopper는 *NVLink 기본·CXL Type 2 옵션*. 운영 시 *CXL 모드 활성화 여부에 따라* 트래픽 특성이 다릅니다.

## 정리

- CXL 디바이스는 *지원 프로토콜 조합*으로 *Type 1·2·3* 세 유형으로 나뉩니다.
- *Type 1*은 *cache-only* — NIC·DPU가 host 메모리를 캐시. CXL.io + CXL.cache.
- *Type 2*는 *memory 가진 accelerator* — GPU·NPU. 양방향 cache-coherent. 세 프로토콜 다 사용.
- *Type 3*는 *memory expander* — DRAM 모듈을 PCIe 너머로 노출. CXL.io + CXL.mem.
- Linux는 *cxl_mem·vendor-specific 드라이버*로 *유형을 sysfs path*에 노출합니다.
- *트래픽 패턴*은 유형별로 매우 다르며, *Type 2의 phase별 동적 패턴*이 가장 복잡합니다.
- 한국 메모리 두 회사가 *Type 3 시장 선두권*이며, *Type 2*에는 Sapeon·Rebellions가 진입.

## 다음 편

[Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)에서는 *디바이스 한 대*에서 *데이터센터 전체 토폴로지*로 시야를 넓힙니다. CXL Switch·Pooling·Fabric·GFAM이 *어떻게 multi-host 메모리 공유*를 가능하게 하는지, 그리고 *시리즈 마무리*까지.

## 관련 항목

- [Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric) (다음 편)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
