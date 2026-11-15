---
title: "Ch 2: TLP — Transaction Layer Packet"
slug: "embedded/hardware/pcie/chapter02-tlp"
date: 2026-05-19T09:02:00
description: "PCIe의 기본 packet인 TLP — 3/4 DW header·5 가족·split transaction·라우팅 3 방식·Producer-Consumer ordering."
series: "PCIe Deep Dive"
seriesOrder: 2
tags: [pcie, tlp, transaction-layer, split-transaction, routing]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"TLP는 *Transaction Layer가 만드는 PCIe의 기본 packet*입니다."** — *3 또는 4 DW header + payload + 선택 ECRC* 구조, *Memory·I/O·Config·Message·Completion* 다섯 가족. *Memory Read*는 *split transaction*이라 *Tag로 매칭*하고 *out-of-order 가능*. 라우팅은 *Address·ID·Implicit*의 3 방식.

[Ch 1 Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 *3-Layer Stack*을 봤습니다. 이 장은 *Transaction Layer가 만드는 TLP*의 구조와 흐름을 본격적으로 분해합니다.

## TLP 기본 구조

이 절은 Non-Flit Mode의 기본 TLP 형식입니다. Flit Mode의 새 header·packing 규칙과 혼합하지 않습니다.

| 영역 | 크기 | 의미 |
|------|------|------|
| **Header** | 3 또는 4 DW (12·16 byte) | TLP 타입·routing·attribute |
| **Data Payload** | 0 ~ MaxPayloadSize | Write payload, Completion data |
| **Digest (ECRC)** | 4 byte (선택) | End-to-End CRC |

Memory Request에서 3 DW·4 DW는 각각 32-bit·64-bit 주소 형식입니다. 모든 TLP의 header 크기를 주소 폭으로 해석할 수는 없습니다. Completion과 Configuration 등은 자기 형식을 따릅니다.

## TLP 종류 — 5 가족

| 가족 | 종류 | 책임 |
|------|------|------|
| **Memory** | MRd·MWr·MRdLk | 메인메모리 또는 device memory 접근 |
| **I/O** | IORd·IOWr | Legacy I/O space (현대 거의 unused) |
| **Configuration** | CfgRd0/1·CfgWr0/1 | PCIe Configuration Space 접근 |
| **Message** | Msg·MsgD | Interrupt·error·power 관리 |
| **Completion** | Cpl·CplD·CplLk·CplDLk | Non-posted 요청의 응답 |

트래픽 비중은 장치와 부하에 따라 달라집니다. 비율을 단정하려면 해당 환경의 packet capture나 counter가 필요합니다.

## Header DW 분해 — Memory TLP 예

*Memory Write TLP (4 DW header)*의 *layout*:

| DW | 영역 | 의미 |
|----|------|------|
| DW0 | Fmt[2:0]·Type[4:0]·TC·Attr·AT·Length | TLP 타입·길이·attribute |
| DW1 | Requester ID·Tag·Last DW BE·First DW BE | Source 식별·byte enable |
| DW2 | Address High[63:32] | 64-bit 상위 |
| DW3 | Address Low[31:2] | 64-bit 하위 |

*Fmt·Type*이 *TLP 가족과 변종*을 인코딩. *Memory Write 64-bit*는 *Fmt=011·Type=00000*. *Length*는 *DW 단위*고 *최대 1024 DW (4 KB)*까지.

## Posted vs Non-Posted vs Completion

PCIe는 *3가지 transaction 부류*를 가집니다.

| 부류 | 예 | Completion |
|------|-----|------------|
| **Posted** | MWr·MsgD | *없음* — 보내고 끝 |
| **Non-Posted** | MRd·CfgRd·CfgWr·IORd·IOWr | *Completion 필수* |
| **Completion** | Cpl·CplD | Non-Posted 요청에 *돌아오는 응답* |

*Memory Write는 Posted* — *fire and forget*. *Memory Read는 Non-Posted* — *requester가 Tag로 outstanding 추적*. *Completion이 Tag를 같이 실어* 돌아옵니다.

## Split Transaction — Memory Read 흐름

| 단계 | 동작 |
|------|------|
| 1 | Requester가 *MRd (Tag=5, Len=8 DW)* 발송 |
| 2 | Tag=5를 *outstanding queue*에 등록 |
| 3 | Requester가 *다른 요청 발송 가능* (parallel) |
| 4 | Completer가 *CplD (Tag=5, 8 DW data)* 응답 |
| 5 | Requester가 *Tag=5 retire* |

*Tag*가 *요청-응답 매칭*의 키. 한 requester는 *여러 outstanding read 동시 보유*. *response 순서가 다를 수 있음*. PCIe 기본 *32 tag (5-bit)*, 8-bit Extended Tag와 별도의 10-bit Tag 기능을 구분합니다. 10-bit 요청 tag는 상위 두 비트가 모두 0인 값을 제외하므로 최대 768개입니다. [Altera R-Tile의 Tag Allocation 설명](https://docs.altera.com/r/docs/683501/26.1/r-tile-avalon-streaming-ip-for-pci-express-user-guide/tag-allocation)도 유효 범위를 256~1023으로 설명합니다.

*큰 read는 여러 Completion으로 split 가능*. MPS가 256 B이면 4 KiB 데이터에는 적어도 16개의 data completion이 필요합니다. alignment·Read Completion Boundary·실제 분할에 따라 더 많을 수 있고, 한 요청의 모든 데이터를 받은 뒤 tag를 해제합니다.

## Routing — 3 가지 방식

| 방식 | 사용 | 적용 TLP |
|------|------|---------|
| **Address routing** | Address 기반 destination | Memory·I/O |
| **ID routing** | Requester ID·Completer ID 기반 | Configuration·Completion |
| **Implicit routing** | RC 또는 직접 destination | Message |

Switch는 *Address 또는 ID*를 보고 *어느 downstream port로 forward*. *MMIO BAR range가 어떤 EP의 것인지* table로 관리, *Configuration은 BDF*로 라우팅.

## Header DW 1 — Requester ID·Tag·BE

DW 1의 *Requester ID는 16-bit*:

| 영역 | bit | 의미 |
|------|-----|------|
| Bus | 15:8 | PCI bus 번호 |
| Device | 7:3 | Device 번호 |
| Function | 2:0 | Function 번호 |

*ARI (Alternative Routing-ID Interpretation)* 활성화 시 *Function 영역 확장* — single device가 *256 function* 표현 가능.

Tag 용량은 기본 5-bit, 8-bit Extended Tag, 별도 10-bit Tag 지원·설정을 구분합니다. 디바이스의 실제 outstanding 자원과도 같지 않습니다.

*First DW BE·Last DW BE (각 4-bit)*: payload의 *첫·마지막 DW에서 어느 byte가 valid*인지. *partial DW write*에 사용.

## TLP Attribute — Ordering·Caching

DW 0의 *Attribute (Attr) 비트*:

| 비트 | 의미 |
|------|------|
| **NS (No Snoop)** | RC가 *cache snoop을 skip* — graphics traffic 등 |
| **RO (Relaxed Ordering)** | Strict write ordering *완화*, parallelism 증가 |
| **TH (TLP Hints)** | TPH 관련 별도 header bit. Attr의 NS·RO·IDO와 구분 |
| **IDO (ID-Based Ordering)** | 다른 ID의 traffic 사이 *ordering 완화* |

*Performance tuning의 핵심*. *잘못 쓰면 데이터 손상*. NIC·NVMe 드라이버가 *intentionally* 사용.

## Producer-Consumer Ordering

PCIe는 *PCI 시절의 strict ordering 모델*을 *부분적으로 유지*:

| 규칙 | 효과 |
|------|------|
| Posted Write가 *다음 Posted Write*를 추월 못 함 | strict write ordering |
| Posted Write가 *이전 Read Completion*을 추월 *가능* | latency 개선 |
| Posted Write가 *Non-Posted Read*를 *추월 가능* | 일반적인 경우 |

*Producer-Consumer 모델*: producer가 *data write → flag write* 순서로 보내고 consumer가 *flag read → data read*. PCIe가 같은 경로·traffic class와 관련 attribute 등 ordering 조건을 확인해야 합니다. 전송 순서와 CPU cache 가시성·장치 작업 완료는 별도 문제입니다.

RO를 켠 요청의 순서 완화를 CPU barrier 하나로 취소할 수는 없습니다. [Linux device I/O 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/device-io.rst)는 posted MMIO write의 수신 확인이 필요할 때 같은 장치에서 안전한 register를 read-back하는 방식을 설명합니다. DMA 메모리 동기화와 장치의 완료 protocol도 각각 지켜야 합니다.

## ECRC — End-to-End CRC

기본적으로 PCIe는 *DLL의 LCRC*만 사용 — *link 단위* 보호. *ECRC는 option*으로 *RC↔EP end-to-end* 보호:

| 영역 | LCRC | ECRC |
|------|------|------|
| 적용 범위 | Link 1 hop | End-to-end (multi-hop) |
| 위치 | DLL이 추가 | TL이 추가, *Digest 영역* |
| 활성화 | Non-Flit Mode의 link 보호 | *AER capability*로 enable |
| 비용 | 자동 | CPU·EP 모두 ECRC 처리 능력 필요 |

*Switch가 중간 transformation 안 한다*는 가정으로 *ECRC가 RC→EP 보호*. *RAS-critical 시스템*에서 활성화.

## TPH·ATS·PRI·PASID — 고급 기능

| 기능 | 역할 |
|------|------|
| **TPH (TLP Processing Hints)** | RC에 *cache placement hint* 전달 — DDIO 등 |
| **ATS (Address Translation Services)** | EP가 *직접 IOMMU translation cache 보유* |
| **PRI (Page Request Interface)** | EP가 *page fault*를 host에 요청 |
| **PASID (Process Address Space ID)** | *process별 address space* 식별 |

ATS·PRI·PASID 묶음은 *Shared Virtual Memory (SVM)*의 토대. [Ch 11 DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 자세히.

## 자주 하는 실수

### "MWr Completion 기다린다"

*Posted*라 *Completion 없음*. *flush 보장은 read-back* (해당 BAR 또는 다른 register read). read-back은 같은 장치의 안전한 register와 해당 ordering 조건을 사용해야 합니다. 무관한 장치의 임의 read로 flush를 보장할 수는 없습니다.

### "Tag는 무한"

기본 *5-bit (32 outstanding)*. 8-bit Extended Tag는 256개, 별도의 10-bit 기능은 요청 tag 최대 768개입니다. EP의 *Tag 자원*이 부족하면 *throughput 한계*. 지원과 효과는 장치·경로·부하별로 확인합니다.

### "Address routing이면 IOMMU 불필요"

*EP가 보낸 address*는 *device가 본 address*. IOMMU 활성화면 *device 입장의 IOVA*를 *host 입장의 PA*로 translate. EP는 *IOMMU 존재를 모름* (ATS 제외).

### "ECRC만 켜면 RAS 완벽"

ECRC는 *RC↔EP* 데이터 무결성. ECRC는 규정된 TLP 필드를 검사하고, poison은 이미 알게 된 데이터 오류를 표시합니다. Poison이 header 변조를 검출하는 CRC를 대신하지는 않습니다. *AER capability*까지 같이 enable 해야 *fault report*. *Switch DPC*까지 묶어야 *containment*.

### "Length는 byte"

*Length는 DW (4 byte) 단위*. *Length=8*은 *32 byte*. *0 → 4096 byte (1024 DW)*. *최대 MaxPayloadSize 또는 MaxReadRequestSize 제한*.

## 정리

- TLP는 *3 또는 4 DW header + payload + 선택 ECRC* 구조의 PCIe 기본 packet.
- *5 가족*: Memory·I/O·Config·Message·Completion. *MRd/MWr가 대부분*.
- *Posted (Write)·Non-Posted (Read·Config)·Completion*의 *3 transaction 부류*.
- *Memory Read는 split transaction* — Tag로 매칭, *out-of-order 가능*.
- 라우팅: *Address (Memory)·ID (Config·Cpl)·Implicit (Msg)*.
- *Attribute*가 *snoop·ordering·hint* 제어. *RO·NS*가 *performance tuning*의 핵심.
- *Producer-Consumer ordering*이 *driver의 write barrier 가정*의 토대.
- *ECRC*는 *end-to-end 무결성* option, *AER*과 함께 RAS에 사용.
- *ATS·PRI·PASID*는 *SVM*의 토대.

## 다음 편

[Ch 3: Configuration Space — 4 KB ECAM·Capability](/blog/embedded/hardware/pcie/chapter03-config-space)에서 *PCIe device의 명함*인 Configuration Space와 *capability linked list*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals)
- [Ch 7: Error Handling (AER)](/blog/embedded/hardware/pcie/chapter07-error-handling) — ECRC·poisoned TLP
- [Ch 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp) — TLP 위 link-level wrapper
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — ATS·PRI·PASID

## 시리즈 자료 출처 안내

본 글은 *PCI-SIG 공개 자료·Linux drivers/pci 소스·CPU 벤더 매뉴얼*을 1차 자료로 합니다. PCIe Base Specification은 *§ navigation aid*로만 인용. 자세한 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
