---
title: "Ch 1: PCIe Fundamentals — 계층 구조와 토폴로지"
slug: "embedded/hardware/pcie/chapter01-fundamentals"
date: 2026-05-19T09:01:00
description: "PCIe 아키텍처의 기초 — point-to-point 직렬 링크, 3-Layer 모델, Root Complex·Switch·Endpoint 토폴로지, Gen 1부터 7.0까지의 진화."
series: "PCIe Deep Dive"
seriesOrder: 1
tags: [pcie, architecture, topology, root-complex, gen7]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"PCIe는 *공유 parallel bus*인 PCI를 버리고 *point-to-point 직렬 링크*로 전환한 후, 같은 stack 위에서 *Gen 1의 2.5 GT/s*부터 *Gen 7의 128 GT/s*까지 22년간 진화했습니다."** — 토폴로지는 *Root Complex·Switch·Endpoint*로 구성된 트리, stack은 *Transaction·Data Link·Physical 3계층*입니다. CXL은 PCIe PHY를 활용하고, UCIe는 별도의 die-to-die PHY 위에서 PCIe·CXL 프로토콜을 운반합니다.

이 시리즈는 *PCIe 6.1·7.0 시대의 동작과 구현*을 19편으로 정리합니다. 1차 자료는 *PCI-SIG 공개 자료·Linux `drivers/pci/` 소스·QEMU PCIe emulation·CPU 벤더 매뉴얼*입니다. PCIe Base Specification 본문은 *§ navigation aid*로만 인용하며, *spec wording을 재생산하지 않고* 자체 분석과 구현 관점의 해설입니다. 자세한 정책은 [시리즈 자료 출처 안내](#시리즈-자료-출처-안내) 참고.

PCIe를 처음 만나는 사람이 가장 헷갈리는 부분은 *"공유 버스가 아니다"*라는 점입니다. PCI는 *모든 디바이스가 같은 wire를 공유*했고 *clock·address·data line이 32~64개 평행*하게 깔렸습니다. PCIe는 그 모델을 완전히 뒤집어서 *2개 디바이스 사이의 전용 직렬 link*로 만들었습니다. 이 *근본 전환*이 이후 모든 결정의 출발점입니다.

## PCI에서 PCIe로

PCI 33/66 MHz·PCI-X 133 MHz는 *parallel·shared bus*였습니다. 그 모델의 한계가 *2000년대 초*에 분명해졌습니다.

| 한계 | 영향 |
|------|------|
| 여러 디바이스가 버스 자원을 공유 | 동시에 전송하려면 중재와 대기가 필요 |
| Parallel wire 간 *skew* | 배선과 타이밍 제약이 증가 |
| Bus arbitration overhead | 동시 요청 시 *대기·취소* |
| Physical layout | 공유 신호의 부하와 배선 제약 |

PCIe는 이 모두를 *point-to-point 직렬 링크*로 풀었습니다. *디바이스 하나당 link 하나*, *bus arbitration 없음*, *clock recovery는 receiver가 직접 PLL로 추출*. 이후 세대에서 전송률을 높였으며, Gen 2의 5 GT/s에서 Gen 3의 8 GT/s처럼 증가 비율이 항상 두 배인 것은 아닙니다.

## 3-Layer Stack

모든 PCIe 패킷은 *3계층 stack*을 위에서 아래로 내려갑니다.

| 계층 | 역할 | 단위 |
|------|------|------|
| **Transaction Layer (TL)** | Memory·I/O·Config·Message 요청 생성·split transaction | TLP (Transaction Layer Packet) |
| **Data Link Layer (DLL)** | TLP를 신뢰성 있게 전달·sequence number·ACK/NAK·flow control | DLLP + TLP wrapper |
| **Physical Layer (PHY)** | Serialize·encoding·equalization·link training | Symbol·Block·Flit |

수신 측은 *역순*으로 올라옵니다. 이 *대칭 stack*이 PCIe의 *layered design*이고, 각 계층은 정의된 인터페이스로 정보를 주고받습니다. 아래 ACK/NAK·TLP별 LCRC 설명은 Non-Flit Mode를 기준으로 하고, Flit Mode의 차이는 뒤에서 구분합니다.

## 토폴로지 — RC·Switch·Endpoint·Bridge

PCIe는 *트리 구조*입니다. *Root Complex (RC)*가 루트, *Switch*가 중간 노드, *Endpoint (EP)*가 리프입니다.

| 노드 | 역할 |
|------|------|
| **Root Complex** | 프로세서·메모리 서브시스템과 PCIe 계층을 연결하는 진입점 |
| **Root Port** | RC 내부의 *downstream 시작점*. 통상 RC가 *여러 Root Port* 보유 |
| **Switch** | *Upstream Port 1개 + Downstream Port N개*. 패킷 라우팅 |
| **Endpoint** | *Leaf 디바이스*. NIC·NVMe SSD·GPU·NPU 등 |
| **Bridge** | *PCIe ↔ PCI* 변환. 레거시 PCI 디바이스 attach |

PCI의 *bus·device·function (BDF) 식별*은 PCIe에서도 그대로 쓰입니다. RC 전체가 반드시 00:00.0이라는 단일 function으로 표현되지는 않습니다. 시스템에는 여러 segment/domain과 host bridge가 있을 수 있습니다.

Switch는 *내부적으로 가상 PCI-PCI Bridge*들의 묶음입니다. *Upstream Port 1개 → Downstream Port N개* 구조이고, 각 port의 bridge가 primary·secondary·subordinate bus 번호로 하위 계층을 표현합니다. *lspci -t* 출력의 트리 들여쓰기가 *이 구조의 직접 반영*입니다.

## Lane과 Link Width

PCIe의 *link 1개*는 *1, 2, 4, 8, 16, 32 개의 lane*으로 구성될 수 있습니다.

| Lane 수 | 표기 | 적용 |
|---------|------|------|
| 1 | x1 | 저속 EP — sound card, slow NIC |
| 4 | x4 | M.2 NVMe SSD |
| 8 | x8 | 25/100 GbE NIC, mid-range GPU |
| 16 | x16 | high-end GPU, AI accelerator |
| 32 | x32 | 일부 datacenter device (spec 정의·실 채택 적음) |

각 lane은 *송신 differential pair + 수신 differential pair = 4개의 wire*. *x16*이면 *16 lane × 2 pair × 2 wire = 64 wire*가 연결됩니다.

*Link width negotiation*은 *link training* 시 *양단의 capability를 비교*해서 양단 지원과 실제 배선·포트 분할·정책에 맞는 width로 연결합니다. 보드 결함으로 *일부 lane이 죽으면* 더 좁은 width로 *fallback* 합니다.

## Generation 진화 — Gen 1부터 Gen 7까지

| 세대 | Rate (per lane) | 발표 | Encoding | 비고 |
|------|----------------|------|----------|------|
| PCIe 1.0 | 2.5 GT/s | 2003 | 8b/10b | NRZ |
| PCIe 2.0 | 5.0 GT/s | 2007 | 8b/10b | NRZ |
| PCIe 3.0 | 8.0 GT/s | 2010 | 128b/130b | NRZ, overhead 감소 |
| PCIe 4.0 | 16 GT/s | 2017 | 128b/130b | NRZ |
| PCIe 5.0 | 32 GT/s | 2019 | 128b/130b | NRZ |
| PCIe 6.0 | 64 GT/s | 2022 | PAM4 + FLIT mode + FEC | *PAM4 첫 도입* |
| PCIe 7.0 | 128 GT/s | 2025 | PAM4 + FLIT + FEC | *spec 1.0 발표* |

x16 한 방향의 전송률은 Gen 1에서 8b/10b를 적용하면 4 GB/s, Gen 7에서는 protocol overhead를 빼기 전 256 GB/s입니다. 계산 조건이 다르므로 이 비율을 유효 payload의 64배 증가로 읽으면 안 됩니다.

Gen 5 x16 한 방향은 32 × (128/130) × 16 / 8 ≈ 63.0 GB/s, 양방향 합계는 약 126.0 GB/s입니다. 이는 encoding 반영 후의 산술 상한으로, TLP·DLLP·idle 및 실제 부하를 반영한 실측값이 아닙니다.

## Encoding 진화 — 8b/10b → 128b/130b → PAM4

각 세대의 *encoding 변화*가 *대역폭 효율*과 *signal integrity*의 균형점을 옮겼습니다.

| Encoding | 사용 세대 | Overhead | 특징 |
|----------|----------|----------|------|
| **8b/10b** | Gen 1·2 | 20% | DC balance·clock recovery 쉬움, overhead 큼 |
| **128b/130b** | Gen 3·4·5 | 1.5% | Overhead 작음, scrambler 필수 |
| **PAM4** | Gen 6·7 고속 동작 | Flit·CRC·FEC 비용을 따로 계산 | *4-level* 신호로 *bit 2개를 1 symbol*에 담음 |

Gen 6의 PAM4는 *signal integrity 한계 회피*가 핵심 동기입니다. *NRZ*는 *2-level (0, 1)*이라 같은 비트율에서 더 높은 symbol rate가 필요. PAM4는 *symbol rate를 절반*으로 유지하면서 *4-level*로 *비트율 2배*를 달성합니다. 다만 *4-level 신호는 noise margin이 1/3*이라 *FEC (Forward Error Correction) 필수*가 되었습니다.

## FLIT Mode — Gen 6 이후의 큰 변화

Gen 6부터 *FLIT (Flow Control Unit) mode*가 도입되어 가변 길이 TLP를 256B 고정 전송 단위에 담습니다. TLP 자체가 모두 256B가 되는 것은 아닙니다.

| 항목 | 기존 (Gen 5까지) | FLIT mode (Gen 6+) |
|------|-----------------|-------------------|
| Unit 크기 | 가변 (TLP 길이) | *256B 고정* |
| Error 검출 | LCRC (CRC-32) | *FEC + CRC* |
| Retry 단위 | TLP | *FLIT* |
| Latency | 패킷·부하·구현에 의존 | 고정 전송 단위를 사용하나 지연은 부하·재전송·구현에 의존 |

[PCI-SIG의 Flit 설명](https://pcisig.com/what-flit-mode-and-why-did-pci-sig-move-unit-data-exchange)은 고정 단위가 오류 정정과 전송 효율을 다루기 위한 선택이라고 설명합니다. 이를 실시간 지연 보장으로 해석하면 안 됩니다. CXL.cachemem의 flit 형식은 PCIe Flit과 구분해야 합니다.

## 인접 표준 — CXL·UCIe·NVMe

PCIe는 *그 자체로도 표준*이지만, *2026 datacenter*에서는 *다른 protocol들의 PHY*로도 동작합니다.

| 표준 | 관계 | 비고 |
|------|------|------|
| **CXL** (1.1~4.0) | *같은 PCIe PHY*에서 *alternate protocol*로 negotiate | Memory·cache coherent device |
| **UCIe** (1.0~2.0) | *PCIe protocol*을 *chiplet die-to-die*에 적용 | PCIe PHY를 공유하는 것은 아님 |
| **NVMe** | *PCIe 위 storage protocol* | 가장 큰 PCIe 응용 |
| **AMD Infinity Fabric / Intel UPI** | CPU 간 *별도 PHY* | PCIe와 *공존* |

[CXL 4.0 Internals Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position)에서 *CXL이 PCIe 위에 어떻게 얹히는지* 다뤘습니다. *PCIe 6.0 64 GT/s 위에 CXL 3.x, PCIe 7.0 128 GT/s 위에 CXL 4.0*이 결합되는 구조입니다.

## 자주 하는 실수

### "PCIe는 공유 버스다"

*PCI는 공유 버스*, *PCIe는 point-to-point*. 같은 *Configuration model·BDF 식별*을 쓰지만 *물리·전송 계층은 완전히 다른 기술*. PCI bus arbiter·shared signal 개념은 PCIe에는 없습니다.

### "Switch가 hub와 같다"

PCIe Switch는 *내부적으로 가상 PCI-PCI Bridge 묶음*이고 *각 port가 별도 bus 번호*. *Ethernet hub*나 *USB hub*와 달리 upstream 용량·동시 트래픽·switch 내부 자원에 따라 경합할 수 있습니다. 독립 링크가 전체 경로 대역폭을 보장하지는 않습니다.

### "Gen 6은 단순히 Gen 5의 2배"

*PAM4·FEC·FLIT mode*가 함께 도입되어 *근본 모델 변경*. 단순 속도 2배가 아닌 *encoding·error model·packet 구조 동시 변경*. 실제 driver·firmware 변경이 큽니다.

### "x16이면 GPU에 무조건 x16"

*Link width negotiation*은 *capability + 보드 lane mapping + bifurcation 설정*의 결과. *RC가 x16 Root Port를 x8+x8로 split*하면 GPU도 *x8로 동작*. *lspci -vv*에서 *LnkCap*과 *LnkSta*를 비교해 확인합니다.

### "PCIe 7.0이 곧 양산"

PCIe 7.0 spec 1.0은 *2025년 발표*되었지만 제품의 출하 시점·포트 속도·상호운용성은 개별 발표와 시험으로 확인해야 합니다. [PCI-SIG는 7.0을 2025년 6월 11일 공개](https://pcisig.com/specifications)했습니다. 규격 발표일에서 양산 시점을 자동으로 계산하지 않습니다.

## 정리

- PCIe는 *PCI의 shared parallel bus*를 *point-to-point serial link*로 전환한 차세대 인터커넥트입니다.
- *3-Layer Stack*: Transaction (TLP) → Data Link (DLLP·ACK/NAK·FC) → Physical (link training·encoding).
- *토폴로지*는 *RC·Switch·Endpoint·Bridge*의 트리. Switch는 *내부적으로 가상 P2P Bridge 묶음*.
- *Lane*은 *2 differential pair*이고, *x1·x4·x8·x16*가 일반적. *link width*는 training 시 협상.
- *Generation*: Gen 1 (2.5 GT/s) → Gen 7 (128 GT/s). 대역폭은 방향·encoding·protocol 비용을 명시해 계산합니다.
- *Encoding*: 8b/10b → 128b/130b → *PAM4 + FEC* (Gen 6+).
- *FLIT mode* (Gen 6+)가 *256B 고정 전송 단위*을 도입.
- *CXL·UCIe·NVMe*가 서로 다른 계층 관계를 가집니다. CXL은 PCIe PHY를 활용하고, NVMe는 PCIe 위에서 동작하며, UCIe는 die-to-die 전송을 제공합니다.

## 다음 편

[Ch 2: TLP — Transaction Layer Packet](/blog/embedded/hardware/pcie/chapter02-tlp)에서 *PCIe 데이터 전송의 기본 단위*인 TLP의 구조와 종류, *split transaction* 흐름을 본격적으로 분해합니다.

## 관련 항목

- [CXL 4.0 Internals Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position) — PCIe 위에 얹히는 alternate protocol
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Modern Embedded Recipes: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)

## 시리즈 자료 출처 안내

본 시리즈의 *1차 자료*는 다음과 같습니다:

- **PCI-SIG 공개 자료** — Base Spec ECN·white paper·DevCon 발표·press release
- **Linux Kernel `drivers/pci/` 소스** — GPL, 자유 분석 가능
- **QEMU PCIe emulation 소스** — GPL
- **CPU 벤더 매뉴얼** — Intel SDM Vol 3·AMD64 Architecture Vol 2·ARM SMMUv3 등 공개 문서
- **Datasheet 공개 부분** — Synopsys DesignWare PCIe Controller 등 IP 벤더 공개 자료

PCI Express Base Specification 문서(Revision 6.1, 2023 / 7.0, 2025)는 *참고 자료*로 § 번호만 인용합니다. spec 본문의 wording·table·figure를 *재생산하지 않으며*, *자체 분석과 구현 관점의 해설*입니다.

> PCI Express® and PCIe® are registered trademarks of PCI-SIG.
> Spec 인용은 PCI-SIG의 저작권을 따릅니다.
