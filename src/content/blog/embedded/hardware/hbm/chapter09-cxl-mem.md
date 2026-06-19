---
title: "CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층"
date: 2026-06-15T09:01:00
description: "CXL.mem이 메모리 계층에 끼어드는 자리 — on-package HBM과 DRAM DIMM 사이의 새 tier."
series: "HBM·GDDR 심화"
seriesOrder: 9
tags: [cxl, memory-tiering, hbm, ddr, ndp]
draft: false
---

## 한 줄 요약

> **"HBM은 *대역폭*을 풀고, DDR은 *용량*을 풀지만, *PCIe 너머의 메모리*는 둘 다 못 풉니다."** — CXL.mem은 *PCIe 5.0/6.0 위에 cache-coherent 프로토콜*을 얹어 *호스트 메모리 컨트롤러가 외부 디바이스의 DRAM을 native load/store로 접근*하게 합니다. HBM이 *on-package 64~192 GB*에 머무는 동안, CXL.mem은 *card 한 장당 256 GB~2 TB*를 *50~150 ns 추가 지연*에 풀어 줍니다.

[Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 *LLaMA 70B inference*에 *780 GB 메모리*가 필요하다는 걸 봤습니다. H100 *5장의 HBM3*을 다 묶어도 *480 GB*입니다. *모자랍니다*. *PCIe 너머로 DRAM을 끌어와* 이 간극을 메우는 길이 CXL.mem입니다. 이 장은 *CXL.mem이 메모리 계층의 어디에 끼는지*, *어떤 지연·대역폭 비용*을 치르는지를 정리합니다.

## 메모리 계층의 새 자리

기존 메모리 계층은 *세 단*이었습니다.

| Tier | 대표 | 지연 | 대역폭 | 용량 (단일 도메인) |
|------|------|------|--------|-------------------|
| L1 cache | SRAM (on-die) | 1 ns | 수십 TB/s | 32~64 KB/core |
| L2/L3 cache | SRAM (on-die) | 5~20 ns | 수 TB/s | MB 단위 |
| HBM | DRAM stack (on-package) | 100~150 ns | 0.8~1.2 TB/s | 24~192 GB |
| DDR DIMM | DRAM (PCB DIMM) | 80~120 ns | 80~100 GB/s | 1~6 TB (CPU 한 소켓) |
| NAND SSD | Flash (NVMe) | 50~100 µs | 7~14 GB/s | 4~64 TB |

지연·대역폭·용량의 *한 자리수씩 차이*가 *네 단계*에 걸쳐 있습니다. 그런데 *DDR과 SSD 사이에 큰 간극*이 있습니다. *수십 µs*의 NAND는 *load/store*로 못 씁니다. *page fault·DMA·드라이버 호출*이 끼어듭니다.

CXL.mem은 이 *간극*을 채웁니다.

| Tier | 대표 | 지연 | 대역폭 | 용량 |
|------|------|------|--------|------|
| HBM | on-package stack | 100~150 ns | 0.8~1.2 TB/s | 192 GB |
| DDR DIMM | local socket | 80~120 ns | 80~100 GB/s | 6 TB |
| **CXL.mem** | **CXL card** | **150~300 ns** | **30~120 GB/s** | **256 GB~2 TB** |
| NAND SSD | NVMe | 50~100 µs | 14 GB/s | 64 TB |

CXL.mem은 *DDR과 SSD 사이*에 *지연이 두 배쯤 큰 새 단*을 만듭니다. *load/store* 의미를 잃지 않고 *용량을 한 자리수 키우는* 자리입니다.

![메모리 계층에서 CXL.mem의 자리](/images/blog/hardware/hbm/diagrams/ch09-cxl-mem-tier.svg)

## PCIe 위에 *load/store*를 얹는 길

CXL의 핵심은 *PCIe 물리 계층 재사용*입니다. CXL 1.1/2.0은 PCIe 5.0 (32 GT/s) PHY 위에, CXL 3.x는 PCIe 6.0 (64 GT/s) PHY 위에 *세 프로토콜*을 다중화합니다.

| 프로토콜 | 목적 | 트래픽 |
|----------|------|--------|
| CXL.io | PCIe 호환 enumeration·config·DMA | TLP 기반 |
| CXL.cache | 디바이스가 호스트 메모리를 *캐시* | D2H request, H2D snoop |
| CXL.mem | 호스트가 디바이스 메모리를 *load/store* | M2S (host→device), S2M (device→host) |

같은 링크에서 *세 프로토콜이 시분할*로 흐릅니다. CXL.mem의 *M2S Req·S2M NDR/DRS* 메시지는 *cache line 단위(64 B)*로 DRAM에 read/write를 일으킵니다.

단계별 흐름:

| 단계 | 동작 |
|------|------|
| 1 | 호스트 CPU → CXL Switch → CXL Memory Device: *M2S Req* (Read, addr=0x...) |
| 2 | Memory Device가 DRAM read (cache line) |
| 3 | CXL Memory Device → CXL Switch → 호스트 CPU: *S2M DRS* (Data, 64 B) |

*핵심*: CPU의 *load instruction*이 *MMU 변환 → 메모리 컨트롤러 → CXL link → CXL.mem device*를 거쳐 *64 B 라인 한 줄*을 가져옵니다. *드라이버 호출 없음*. *DMA 셋업 없음*. NVMe SSD와는 완전히 다른 의미입니다.

이게 가능한 이유는 *호스트의 메모리 컨트롤러가 CXL Root Port를 *DDR DIMM과 같은 등급으로* 취급하기 때문입니다. *HDM Decoder*가 *물리 주소 일부 범위*를 CXL device에 매핑합니다.

## 지연·대역폭 실측

같은 *PCIe 링크*라도 *Gen 5 x16*과 *Gen 6 x16*의 차이는 큽니다.

| 링크 | 이론 대역폭 (단방향) | 실측 메모리 처리량 (read) |
|------|---------------------|--------------------------|
| PCIe 5.0 x8 (CXL Type 3) | 32 GB/s | 24~28 GB/s |
| PCIe 5.0 x16 (CXL Type 3) | 64 GB/s | 50~58 GB/s |
| PCIe 6.0 x16 (CXL 3.0) | 128 GB/s | 100~120 GB/s |

*프로토콜 오버헤드*가 *15~20%* 정도 빠집니다. CXL.mem의 *transaction overhead*와 *flow control credit* 관리가 들어가서입니다.

지연은 *링크 거리·flit 처리 단계·DDR 자체 지연*의 합입니다.

| 시나리오 | 지연 (load round-trip) |
|---------|----------------------|
| local DDR5 | 80~100 ns |
| CXL.mem (direct attached) | 170~220 ns |
| CXL.mem (through switch) | 250~350 ns |
| CXL.mem (pooled, 2-hop fabric) | 400~600 ns |

*Direct attached*가 *DDR보다 2배쯤 느립니다*. *Switch 1단*이 들어가면 *3배*. *NUMA의 remote 노드 접근(140~180 ns)보다도 살짝 느린* 영역입니다.

CXL이 *DRAM 대체*가 아니라 *DRAM의 다음 tier*인 이유입니다.

## 현세대 디바이스 — 누가 만들고 있나

CXL Type 3 *메모리 디바이스*는 *2024년부터 양산*에 들어갔습니다.

| 디바이스 | 제조사 | 용량 | 인터페이스 |
|---------|--------|------|-----------|
| **CMM-D** (Compute Memory Module-DDR) | Samsung | 128~512 GB | EDSFF E3.S, CXL 2.0 |
| **Niagara** | SK Hynix | 96~256 GB | EDSFF E3.S, CXL 2.0 |
| **Leo** | Astera Labs | 256 GB~2 TB | AIC, CXL 2.0 |
| **CXL Memory Expander** | Micron | 256 GB | EDSFF, CXL 2.0 |
| **CXL Type 3** | Marvell, Intel, Rambus | 다양 | 다양 |

특히 *Samsung CMM-D*와 *SK Hynix Niagara*는 한국 두 회사의 *HBM 너머 메모리 전략*의 핵심입니다. HBM 시장의 90%를 가진 두 회사가 *CXL 시장에서도 선두권*을 노립니다.

*Astera Labs Leo*는 *fabless* 모델로 *Micron·Samsung DRAM*을 *2 TB까지* 묶어 *single CXL card*로 제공합니다. *Meta·Microsoft Azure 데이터센터*에 *2024년부터 배치*되고 있습니다.

## 어디서 쓰면 효과가 크나

CXL.mem의 *지연 페널티(2배)*와 *용량 확장(10배+)*의 트레이드오프가 가치 있는 워크로드는 *제한적*입니다.

**잘 맞는 경우**

- *LLM inference KV cache* — *순차 access가 많아* 지연에 덜 민감, *용량 폭증* (Ch 8에서 본 640 GB)
- *In-memory database* (SAP HANA, Redis) — *cold tier*를 CXL.mem에 두고 *hot tier*는 DDR
- *대규모 컨테이너 호스트* — *memory overcommit* 대신 *CXL pool*에서 동적 할당
- *과학 계산 (FEM, CFD)* — *checkpoint·intermediate data*를 *load/store*로 접근

**잘 안 맞는 경우**

- *HPC tight loop* — 지연에 민감, HBM/L3가 답
- *Training의 weight·activation* — 대역폭이 우선, HBM이 답
- *graphics·real-time rendering* — frame-rate 의존, GDDR이 답

핵심은 *지연 200~400 ns에 견디는 워크로드인가*입니다.

## OS·소프트웨어 통합

CXL.mem은 *load/store가 native로 가능*하지만 *OS가 인식하고 배치를 결정*해야 합니다.

**Linux CXL 서브시스템** (kernel 6.0+)

```text
sysfs:
  /sys/bus/cxl/devices/
    ├── root0/           # CXL Root
    ├── port0/           # Upstream port
    ├── decoder0.0/      # HDM decoder (physical address → device)
    ├── mem0/            # Memory device
    └── region0/         # 묶인 메모리 영역 (e.g., interleave)

명령:
  cxl list -RT          # 전체 토폴로지
  cxl create-region -d decoder0.0 ...   # region 생성
  daxctl list           # DAX 디바이스 (RAM 대신 mmap)
```

CXL 메모리는 두 가지 모드로 *호스트에 노출*됩니다.

| 모드 | 어떻게 보이나 | 용도 |
|------|--------------|------|
| **System RAM** | `numactl` node로 등장, 일반 RAM처럼 사용 | 자동 tier (numabalance), 가장 간단 |
| **DAX** | `/dev/dax0.0`, mmap으로 직접 접근 | application이 *어디에 둘지* 결정 |

*tiered memory* 자동화는 *Linux NUMA balancing + Promotion/Demotion 데몬*이 *page activity*를 보고 *hot page를 DDR로, cold page를 CXL.mem으로* 옮깁니다. Meta의 *Transparent Page Promotion* 패치가 *mainline 6.5*에 들어갔습니다.

## HBM과 어떻게 공존하나

같은 가속기 보드에 *HBM과 CXL.mem이 함께* 있는 그림이 *2025~2026년 표준*입니다.

가정 시스템 구성 — Blackwell-class GPU + CXL pool:

| 컴포넌트 | 구성 |
|---------|------|
| GPU 측 HBM | 4 stack × 48 GB HBM3E = 192 GB @ 8 TB/s |
| GPU compute → CXL link | PCIe 5.0 x16 |
| CXL Switch | 1대, 2개 downstream |
| CXL Type 3 | 2 TB × 2장 = 4 TB (KV cache pool) |
| **총 메모리** | HBM 192 GB + CXL 4096 GB = **4288 GB** |
| 대역폭 | HBM 8 TB/s vs CXL 100 GB/s |

*HBM은 weight*가 들어가고, *CXL은 KV cache pool*이 들어갑니다. *Ch 8의 LLaMA 70B (780 GB)*는 *HBM 한 장으로는 못 풀던 문제*가 *CXL 추가로 해결*됩니다. 데이터센터는 *동일 GPU·다른 CXL 양*으로 *워크로드별 SKU*를 만들 수 있습니다.

## 자주 하는 실수

### "CXL.mem은 DRAM을 대체한다"

*그렇지 않습니다*. 지연이 *2~4배 큽니다*. *DDR DIMM은 socket당 6 TB까지 가는데도* 살아남는 이유는 *80~100 ns 지연* 때문입니다. CXL.mem은 *DDR을 대체하는 게 아니라*, *DDR 너머의 확장*입니다.

### "CXL = NVMe와 비슷한 거다"

전혀 다릅니다. NVMe는 *block 단위 I/O*, *드라이버 호출*, *page fault*입니다. CXL.mem은 *cache line 단위 load/store*, *드라이버 없음*, *MMU 변환만*입니다. *지연 자리수가 다릅니다*. NVMe는 µs, CXL은 ns.

### "CXL.mem은 HBM의 대체"

*반대*입니다. HBM은 *대역폭*, CXL은 *용량*입니다. *완전 보완 관계*입니다. *HBM이 있으면 CXL이 더 잘 활용*되고, *CXL이 있으면 HBM에 대역폭만 집중*할 수 있습니다.

### "CXL 1.1과 2.0과 3.0은 다 호환된다"

*제한적입니다*. 디바이스가 *backward compat*은 보장하지만, *switch·pooling·fabric*은 *2.0/3.x 전용 기능*입니다. CXL 1.1 디바이스는 *direct attach만* 가능합니다. 시스템 설계 시 *프로토콜 버전*을 *정확히 매칭*해야 합니다.

## 한국 메모리 산업의 위치 — 다시

[Ch 1](/blog/embedded/hardware/hbm/chapter01-overview)에서 봤듯 *HBM은 한국 두 회사가 90% 점유*합니다. CXL.mem 시장은 *2024~2025년 막 시작된* 영역이라 *점유율 데이터가 아직 빈약*하지만 *공급 측 우위가 그대로 이어질 가능성*이 큽니다.

| 회사 | 제품 | 시장 상태 |
|------|------|----------|
| Samsung | CMM-D (CXL Memory Module - DDR), 최대 512 GB | 양산 |
| SK Hynix | Niagara, 96~256 GB | 양산 |
| Micron | CXL Expander (DDR5 기반) | 양산 |
| Astera Labs | Leo platform (fabless, 한국 DRAM 사용) | 양산 |

CXL.mem은 *PCIe·CXL 인터페이스 IP*와 *DRAM 모듈*을 *모두 가진 회사*가 우위입니다. *DRAM 시장의 한국 우위*가 *CXL.mem 시장으로 자연 확장*되는 구조입니다. 차세대로는 *HBM과 CXL을 통합한 패키지* 형태가 *각사 로드맵*에서 거론됩니다.

## 정리

- CXL.mem은 *PCIe 5.0/6.0 위에 cache-coherent load/store를 얹은* 프로토콜입니다.
- *DDR DIMM과 SSD 사이의 간극*에 *지연 150~300 ns, 대역폭 30~120 GB/s, 용량 256 GB~2 TB*의 *새 tier*를 만듭니다.
- 호스트의 *HDM Decoder*가 *물리 주소 일부*를 *CXL device*에 매핑해 *드라이버 없이 load/store*가 가능합니다.
- *HBM 대체가 아닙니다*. *HBM은 대역폭, CXL은 용량*으로 *완전 보완* 관계입니다.
- LLM inference의 *KV cache pool*, in-memory DB의 *cold tier*, *컨테이너 호스트의 overcommit*이 *가장 잘 맞는 워크로드*입니다.
- Linux는 *kernel 6.0+에서 CXL 서브시스템*과 *NUMA balancing*으로 *자동 tiering*을 지원합니다.
- 디바이스 시장은 *Samsung CMM-D·SK Hynix Niagara·Astera Labs Leo·Micron Expander*로 *2024년부터 양산*에 들어갔고, *HBM 시장의 한국 우위*가 *CXL.mem으로 자연 확장*되고 있습니다.

## 다음 편

[Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서는 *M2S·S2M 메시지*가 어떻게 흐르는지, *HDM Decoder가 어떻게 주소 범위를 매핑*하는지, *BI·Snoop Filter가 cache coherency를 유지하는 방식*을 본격적으로 본격적으로 분해합니다.

## 관련 항목

- [Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage) — KV cache 폭증 문제, CXL.mem이 푸는 자리
- [Ch 5: 메모리 대역폭 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck) — Roofline에서 CXL.mem의 자리
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol) (다음 편)
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
