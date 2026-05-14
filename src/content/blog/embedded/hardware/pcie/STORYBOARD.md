---
title: "PCIe Deep Dive — Storyboard"
date: 2026-10-01T00:00:00
description: "PCIe 시리즈 설계 문서 — 챕터별 깊이·다이어그램·코드·레퍼런스 계획"
tags: [PCIe, storyboard, internal]
draft: true
---

# PCIe Deep Dive — Storyboard

## 시리즈 목표

현재 16개 챕터가 헤더만 있는 스텁 상태. 본 스토리보드는 각 챕터를 다음 기준으로 채운다.

- **분량**: 챕터당 500~700줄 (PCIe는 계층 많고 정보 밀도 높아 DDR/NVMe보다 약간 큼)
- **깊이 기준**: PCI-SIG Base spec 인용, 실제 root complex/switch/endpoint 동작, 리눅스 PCI subsystem 코드, lspci/setpci 활용
- **시각 자료**: 챕터당 3~5개의 TikZ 다이어그램
- **레퍼런스**: PCIe Base spec 절·항, Linux `drivers/pci/`, PCI Express Card Electromechanical Spec

## 챕터별 스토리보드

### Ch 1: 기초 — Topology, Layers, Generations

**의도**: PCIe 스택 전체 개념을 한 챕터에.

- ✦ PCI vs PCI-X vs PCIe 비교 (parallel bus → point-to-point serial)
- ✦ Root Complex / Switch / Endpoint / Bridge — 토폴로지
- ✦ 3-Layer 모델 — Transaction / Data Link / Physical
- ✦ Lane / Link / Symbol — 1×, 4×, 8×, 16× 의미
- ✦ Generations — Gen1 2.5GT/s ~ Gen6 64GT/s
- ✦ 8b/10b vs 128b/130b vs PAM4 encoding
- ◦ Form factors — CEM / SFF-8639 (U.2/U.3) / EDSFF / M.2
- ◦ CXL on PCIe physical layer (간단 언급)

**다이어그램** (5)
1. PCI parallel vs PCIe point-to-point
2. Root Complex topology — RC, switch, endpoints
3. 3-layer stack (TL/DLL/PHY)
4. Lane bonding (×1/×4/×16)
5. Generation throughput table (data rate, encoding overhead, x16 GB/s)

**코드**: `lspci -t`, `lspci -vv` 출력 해석
**레퍼런스**: PCIe Base 6.0 §1 Introduction

---

### Ch 2: TLP — Transaction Layer Packet

**의도**: PCIe 데이터 전송의 기본 단위.

- ✦ TLP 구조 — Header(3/4 DW) + Data + ECRC
- ✦ TLP Types — MRd / MWr / IORd / IOWr / CfgRd / CfgWr / Msg / Cpl
- ✦ Format/Type 인코딩
- ✦ Memory Read flow — MRd → CplD chain (split transaction)
- ✦ Address routing — 32-bit vs 64-bit
- ✦ ID routing (Bus/Dev/Func)
- ✦ Implicit routing (Msg)
- ◦ TLP Prefix (E2E TLP Prefix, OBFF, LPR)
- ◦ TLP processing hints (TPH)
- ◦ Address Translation Services (ATS)

**다이어그램** (5)
1. TLP 일반 구조 (header + data + ECRC)
2. Header DW0/DW1/DW2/DW3 분해 (Memory TLP)
3. MRd → MRdCpl 시퀀스 (split-tx)
4. Address routing vs ID routing 비교
5. TLP types 분류 트리

**코드**: `setpci` raw access, kernel `pci-aer` TLP header decode
**레퍼런스**: PCIe Base 6.0 §2 Transaction Layer

---

### Ch 3: Configuration Space — 4KB ECAM

**의도**: PCIe 디바이스의 “명함과 다이얼”.

- ✦ PCI Configuration Space 256B + PCIe Extended 4KB
- ✦ Header Type 0 (endpoint) vs Type 1 (bridge)
- ✦ Vendor/Device/Class ID
- ✦ BAR (Base Address Register) — Ch 4와 연결
- ✦ Capability Linked List (offset 0x34 → cap chain)
- ✦ Extended Capabilities (DPC, AER, ATS, ACS, PASID)
- ✦ ECAM (Enhanced Config Access Mech) — MMIO 매핑
- ◦ Type 0 vs Type 1 routing (configuration access)
- ◦ Latency Tolerance Reporting (LTR)

**다이어그램** (4)
1. Config Space 4KB map (region별 색칠)
2. Type 0 vs Type 1 header 비교
3. Capability linked list traversal
4. ECAM 주소 매핑 — Bus:Dev:Func:Reg

**코드**: `setpci -s 00:00.0 0x04.W`, `lspci -xxxx`, `pci_read_config_dword`
**레퍼런스**: PCIe Base 6.0 §7 Configuration Space, PCI Local Bus 3.0

---

### Ch 4: BAR — Memory / IO Mapping

**의도**: 디바이스 자원을 호스트 주소 공간에 매핑.

- ✦ BAR0~BAR5 6개 슬롯
- ✦ Memory BAR — 32-bit / 64-bit (2 슬롯 사용), prefetchable 비트
- ✦ I/O BAR — legacy
- ✦ Size 결정 — write all-1s, read mask
- ✦ Resource enumeration — BIOS / Linux PCI 코드
- ✦ Resizable BAR (ReBAR) — 64GB GPU 등
- ◦ Expansion ROM BAR
- ◦ ATS / PRI 의 가상화 영향
- ◦ SR-IOV BAR (VF BAR)

**다이어그램** (4)
1. BAR 종류 (Mem32 / Mem64 / IO / ROM) flag bit 분해
2. BAR size probing 알고리즘
3. ReBAR 동작 — 권장 size 협상
4. SR-IOV VF BAR mapping

**코드**: `lspci -vv | grep Region`, `/sys/bus/pci/devices/.../resource`
**레퍼런스**: PCIe Base 6.0 §7.5 BAR, ReBAR ECN

---

### Ch 5: Interrupts — INTx / MSI / MSI-X

**의도**: 인터럽트 전송 메커니즘 3가지.

- ✦ INTx legacy — 4개 wire (INTA/B/C/D), level-triggered
- ✦ MSI — 1~32 vectors, single address+data write
- ✦ MSI-X — 2048 vectors, per-vector table + PBA
- ✦ MSI Capability vs MSI-X Capability 구조
- ✦ Interrupt Vector Address — APIC redirection
- ✦ Per-vector masking, pending bit
- ◦ Edge-triggered semantics
- ◦ Interrupt Remapping (Intel VT-d, AMD-Vi)

**다이어그램** (4)
1. INTx (wired) vs MSI vs MSI-X 비교
2. MSI Capability 구조
3. MSI-X Table + PBA
4. MSI → APIC → CPU vector flow

**코드**: `cat /proc/interrupts`, `pci_alloc_irq_vectors`
**레퍼런스**: PCIe Base 6.0 §6.1 Interrupts, PCI Local Bus 3.0 §6.8

---

### Ch 6: Power Management — D-states / L-states / ASPM

**의도**: 전력 절감의 두 축 — 디바이스 state, link state.

- ✦ Device states — D0 (active) / D1 / D2 / D3hot / D3cold
- ✦ Link states — L0 / L0s / L1 / L1.1 / L1.2 / L2 / L3
- ✦ ASPM (Active State Power Management) — L0s / L1 자동 진입
- ✦ PCI-PM Capability — D-state 전환
- ✦ PME (Power Management Event) wake-up
- ✦ CLKREQ#, REFCLK gating
- ◦ Latency Tolerance Reporting → ASPM
- ◦ L1 sub-states (L1.1, L1.2) — 모바일/저전력

**다이어그램** (4)
1. D-state / L-state 전이도
2. ASPM L0s 진입 시퀀스
3. L1.2 entry — CLKREQ# gating
4. PME wake path

**코드**: `lspci -vv | grep "Power\|ASPM\|PM"`, `/sys/bus/pci/devices/.../power/control`
**레퍼런스**: PCIe Base 6.0 §5 Power Management, PCI Bus PM 1.2

---

### Ch 7: 에러 처리 — Correctable / Uncorrectable / Fatal

**의도**: PCIe 에러의 계층별 분류·복구.

- ✦ Error 분류 — Correctable (CE) / Uncorrectable Non-Fatal (UE-NF) / Uncorrectable Fatal (UE-F)
- ✦ Layer별 에러 — Physical (LTSSM recovery) / DLL (ACK/NAK, replay) / TL (poisoned TLP)
- ✦ Advanced Error Reporting (AER) capability
- ✦ Error log header — first error pointer
- ✦ ERR_COR / ERR_NONFATAL / ERR_FATAL Messages
- ✦ Linux pci-aer 드라이버 처리
- ◦ Downstream Port Containment (DPC) — switch가 fault 격리
- ◦ Hot Reset / Function-Level Reset (FLR)
- ◦ Replay Number / Replay Timer

**다이어그램** (5)
1. 에러 분류 트리
2. AER Capability 구조
3. Replay buffer + ACK/NAK 흐름
4. ERR Message routing — root complex로
5. DPC 격리 시나리오

**코드**: `aer-inject` 도구, `drivers/pci/pcie/aer.c` 핵심 함수
**레퍼런스**: PCIe Base 6.0 §6.2 Error Handling, AER specification

---

### Ch 8: Data Link Layer — DLLP / ACK / NAK / FC

**의도**: 신뢰성 보장 계층. TLP를 손실 없이.

- ✦ DLLP 종류 — ACK / NAK / FC (Flow Control) / PM / Vendor
- ✦ ACK/NAK 프로토콜 — TLP sequence number, replay buffer
- ✦ Replay Timer — 미수신 ACK 시 재전송
- ✦ Credit-Based Flow Control — Posted / Non-Posted / Completion
- ✦ FC Init (FC_INIT1, FC_INIT2) — 링크 활성화 시
- ✦ Update FC interval
- ◦ CRC-16 (LCRC) for TLP/DLLP
- ◦ DLL state machine

**다이어그램** (4)
1. DLLP 구조 + 종류
2. TLP send + ACK 흐름 (정상)
3. NAK + replay 흐름
4. Flow Control credit 갱신 다이어그램

**코드**: `setpci` DLLP counters, kernel link replay counter
**레퍼런스**: PCIe Base 6.0 §3 Data Link Layer

---

### Ch 9: Physical Layer — LTSSM / Equalization / SerDes

**의도**: 가장 깊은 곳. lane 신호.

- ✦ LTSSM (Link Training and Status State Machine) 상태들 — Detect / Polling / Configuration / Recovery / L0 / L0s / L1 / L2 / Disabled / Hot Reset
- ✦ Link training 시퀀스 (Detect → Polling.Active → Polling.Compliance → Configuration → L0)
- ✦ TS1 / TS2 ordered set
- ✦ Equalization — Phase 0~3 (transmitter preset, coefficient sweep)
- ✦ Lane reversal, polarity inversion
- ✦ SKP ordered set (Clock compensation)
- ✦ 128b/130b encoding (Gen3+), PAM4 (Gen6)
- ◦ ESM (Embedded Slot Management) for Gen5
- ◦ FLIT mode (Gen6)

**다이어그램** (5)
1. LTSSM 상태 전이도
2. Link training timeline (Detect → L0)
3. TS1/TS2 16-symbol 구조
4. Equalization 4 phase
5. Gen1~6 encoding 비교

**코드**: `lspci -vv | grep -E "LnkSta|LnkCap"`, link train debug
**레퍼런스**: PCIe Base 6.0 §4 Physical Layer

---

### Ch 10: 리눅스 PCI 기초 — enumeration, 드라이버

**의도**: 커널이 PCIe를 어떻게 보고 다루는가.

- ✦ Boot enumeration — BIOS/UEFI가 끝낸 상태 + Linux re-enum
- ✦ `struct pci_dev`, `struct pci_bus`, `struct pci_host_bridge`
- ✦ Driver matching — `pci_device_id` table, ACPI matching
- ✦ probe/remove lifecycle
- ✦ `pci_enable_device`, `pci_request_regions`, `pci_set_master`
- ✦ sysfs (`/sys/bus/pci/`) — class/device/vendor/resource/config
- ◦ ACPI PRT (Pin Routing Table)
- ◦ pcie-portdriver

**다이어그램** (3)
1. Boot enumeration timing (firmware → kernel)
2. Driver lifecycle (probe → IRQ → I/O → remove)
3. sysfs tree

**코드**: 간단한 PCIe 드라이버 skeleton, `drivers/pci/probe.c`
**레퍼런스**: kernel.org PCI documentation

---

### Ch 11: DMA — IOMMU, mapping, coherent vs streaming

**의도**: PCIe 디바이스가 메모리에 직접 접근하는 메커니즘.

- ✦ DMA Direction — bidirectional / to_device / from_device
- ✦ Coherent DMA buffer (dma_alloc_coherent) — 작은 영역, 영구
- ✦ Streaming DMA (dma_map_single/sg) — 큰 영역, 일회성
- ✦ IOMMU (Intel VT-d, AMD-Vi, ARM SMMU) — IOVA → PA translation
- ✦ ATS / PRI / PASID — SVM (Shared Virtual Memory)
- ✦ Cache coherency 처리 — invalidate/flush
- ✦ swiotlb (bounce buffer)
- ◦ DMA mask (32-bit vs 64-bit device)
- ◦ IOMMU groups

**다이어그램** (4)
1. CPU vs Device DMA 흐름
2. IOMMU 매핑 (IOVA → PA)
3. Coherent vs Streaming 사용 패턴
4. SVM / PASID — process VA == device VA

**코드**: `dma_alloc_coherent`, `dma_map_sg`, `iommu_map`
**레퍼런스**: kernel.org dma-api docs, VT-d spec

---

### Ch 12: 리눅스 PCI 고급 — Hot-plug, SR-IOV, AER

**의도**: 운영 시 자주 만나는 고급 기능.

- ✦ Hot-plug — surprise vs orderly, pciehp 드라이버
- ✦ SR-IOV — PF/VF, VF BAR, VF driver
- ✦ AER 통합 — recovery callback (link_reset, slot_reset)
- ✦ DPC integration
- ✦ ARI (Alternative Routing-ID Interpretation) — 256+ functions
- ◦ ATS / PRI / PASID 활성화 (vfio)
- ◦ vfio-pci pass-through

**다이어그램** (4)
1. Hot-plug 시퀀스 (link down → device remove → re-enum)
2. SR-IOV PF/VF 트리
3. AER recovery callback flow
4. vfio-pci → guest VM path

**코드**: `echo 1 > /sys/bus/pci/devices/.../sriov_numvfs`, vfio binding
**레퍼런스**: SR-IOV spec, kernel.org SR-IOV doc

---

### Ch 13: 도구 — lspci / setpci / pcimem / vfio

**의도**: PCIe 트러블슈팅 도구.

- ✦ `lspci` 전체 옵션 — `-vv`, `-t`, `-D`, `-x[xxxx]`
- ✦ `setpci` — raw config write (위험!)
- ✦ `pcimem` — BAR 직접 read/write
- ✦ Capability dump 해석 — `lspci -vv` 출력 라벨링
- ✦ `dmesg | grep pci` 흔한 에러 메시지
- ✦ `/sys/kernel/debug/pci/` (디버그 인터페이스)
- ◦ Hardware tools — protocol analyzer (LeCroy / Keysight), TLP capture
- ◦ Open-source FPGA-based analyzer 간단 언급

**다이어그램** (2)
1. lspci 출력 영역 라벨 (linkstat, captabs, capabilities)
2. 트러블슈팅 의사결정 트리 (lspci → AER → dmesg → setpci)

**코드**: 자주 쓰는 lspci/setpci 명령 모음
**레퍼런스**: lspci/setpci man pages, kernel pci debugfs

---

### Ch 14: 트러블슈팅 — 시나리오북

**의도**: 실무에서 만나는 PCIe 문제 케이스북.

- ✦ 디바이스가 안 보임 — link training fail / enumeration miss
- ✦ Link Training fail — equalization, retimer 의심
- ✦ Link downgrade — Gen4 보드에서 Gen2로 떨어짐, 원인 추적
- ✦ Correctable error storm — 노이즈/접점 의심
- ✦ Hang / freeze — completion timeout, AER fatal
- ✦ ACS / IOMMU group 분리 안 됨 (vfio)
- ✦ Hot-plug 실패
- ✦ 성능 미달 — payload size / MaxReadReq 미설정
- ◦ Lane reversal 잘못
- ◦ Power budgeting 부족

**다이어그램** (4)
1. 디바이스 not visible — 체크리스트 트리
2. Link state diagnostic flow
3. AER error log → 원인 매핑
4. 성능 진단 흐름 (MPS, MRRS, payload)

**코드**: 시나리오별 명령 스니펫, debug dmesg 패턴
**레퍼런스**: PCI-SIG Compliance Programs, AER ECN

---

### Ch 15: 성능 — Bandwidth / Latency / Tuning

**의도**: PCIe 성능 측정·튜닝.

- ✦ Theoretical BW vs Effective BW — encoding overhead, ACK 비용
- ✦ Max Payload Size (MPS) — 128B / 256B / 512B / 4KB
- ✦ Max Read Request Size (MRRS)
- ✦ Completion combining / TLP coalescing
- ✦ Latency 측정 — completion latency, doorbell latency
- ✦ ACS Direct Translation, ATS 효과
- ✦ Posted vs Non-posted 비율 영향
- ◦ NUMA locality — switch traversal cost
- ◦ Peer-to-peer DMA

**다이어그램** (4)
1. Theoretical vs Effective BW 계산
2. MPS 영향 (작은 MPS → header overhead 증가)
3. Latency breakdown — host → root → switch → endpoint
4. NUMA topology + PCIe latency

**코드**: `lspci -vv | grep MaxPayload`, `setpci` MPS 변경, fio over NVMe BW
**레퍼런스**: PCIe Base §2.2.2 Max Payload Size, Mellanox/NVIDIA PCIe tuning guides

---

### Ch 16: 레지스터·자료구조 맵

**의도**: 참조용.

- ✦ Configuration Space 4KB 전체 맵
- ✦ Type 0 / Type 1 header 비트별
- ✦ PCI Express Capability 구조 (Device/Link/Slot/Root Control/Status)
- ✦ AER Capability registers
- ✦ MSI / MSI-X Capability
- ✦ Power Management Capability
- ◦ DPC, ACS, PASID, ARI
- ◦ Vendor-specific Extended Capabilities

**다이어그램** (4)
1. Configuration Space 4KB map
2. PCI Express Cap 구조도 (offset 0x00~0x3C)
3. AER Cap layout
4. Capability linked list 예시 traversal

**코드**: 헤더 인용 (`include/uapi/linux/pci_regs.h`)
**레퍼런스**: PCIe Base 6.0 §7 (all of it)

---

## 챕터별 분량 계획

| 챕터 | 목표 줄수 | 다이어그램 |
|------|-----------|-----------|
| 1 fundamentals | 600 | 5 |
| 2 tlp | 700 | 5 |
| 3 config-space | 600 | 4 |
| 4 bar-mmio | 550 | 4 |
| 5 interrupts | 600 | 4 |
| 6 power-management | 600 | 4 |
| 7 error-handling | 700 | 5 |
| 8 dllp | 550 | 4 |
| 9 physical-layer | 800 | 5 |
| 10 linux-basics | 500 | 3 |
| 11 linux-dma | 700 | 4 |
| 12 linux-advanced | 600 | 4 |
| 13 tools | 500 | 2 |
| 14 troubleshooting | 650 | 4 |
| 15 performance | 600 | 4 |
| 16 register-maps | 500 | 4 |
| **합계** | **~9750줄** | **65** |

## 레퍼런스

### PCI-SIG 표준 (1차)

| 문서 | 활용 챕터 |
|------|-----------|
| PCI Express Base Specification 6.0 / 6.1 | 전 챕터 |
| PCI Express CEM (Card Electromechanical) Specification | 1 (form factor) |
| PCI Express Mini CEM, M.2 spec | 1 |
| PCI-SIG ECNs — Resizable BAR, DPC, FLR | 4, 7, 12 |
| PCI Local Bus Specification 3.0 | 3, 5 (legacy 토대) |
| SR-IOV Specification | 12 |
| ATS / PRI / PASID Specifications | 11, 12 |
| ACS (Access Control Services) | 12, 14 |

PCI-SIG는 회원 가입 필요(유료). 공식 ECN과 PCI-SIG White Papers는 부분 공개.

### 책

| 책 | 활용 |
|------|------|
| PCI Express Technology 3.0 (Mindshare, Jackson + Budruk) | 전 챕터 — 가장 풀이 좋은 책 |
| PCI System Architecture (Mindshare) | 3, 5 (legacy PCI) |
| Computer Architecture: A Quantitative Approach (Patterson/Hennessy) §I/O | 1, 11 |

### 벤더 / 기술 문서

| 출처 | 활용 |
|------|------|
| Intel Architecture Software Developer Manual Vol 3 (IOMMU, MSI) | 5, 11 |
| AMD64 Architecture Vol 2 (AMD-Vi) | 11 |
| ARM SMMU Specification | 11 |
| Synopsys DesignWare PCIe Controller databook | 1, 2, 9 |
| Mellanox/NVIDIA PCIe tuning guides | 15 |
| Intel VT-d (Virtualization Technology for Directed I/O) spec | 11, 12 |

### 학술·콘퍼런스

- PCI-SIG DevCon 발표 (PCIe 6.0/7.0 미리보기)
- HotChips PCIe sessions
- FAST/SIGCOMM PCIe-related papers
- Linux Plumbers Conference PCI track

### 리눅스 커널

| 경로 | 활용 |
|------|------|
| `drivers/pci/probe.c`, `bus.c` | 10 |
| `drivers/pci/pcie/aer.c` | 7 |
| `drivers/pci/pcie/dpc.c` | 7 |
| `drivers/pci/iov.c` (SR-IOV) | 12 |
| `drivers/pci/hotplug/pciehp_*.c` | 12 |
| `drivers/pci/msi/msi.c` | 5 |
| `drivers/iommu/` | 11 |
| `Documentation/PCI/` | 10–12 |
| `include/uapi/linux/pci_regs.h` | 16 |

### 도구

- `pciutils` (lspci/setpci) — Ch 13
- `pcimem`, `pcimemspeed` — Ch 13, 15
- `aer-inject` (kernel module) — Ch 7
- `dpcgo` (DPC test) — Ch 7
- Hardware: Teledyne LeCroy/Keysight PCIe protocol analyzer — Ch 9, 14
- Open-source: `pcie-tlp-injector` (FPGA based)

## 작성 순서 권장

1. 스토리보드 사용자 검토
2. Ch 1 (개요) → Ch 2 (TLP) → Ch 3 (config) → Ch 4 (BAR) — 토대
3. Ch 5 (IRQ) → Ch 6 (PM) → Ch 7 (error) — 시스템 자원
4. Ch 8 (DLL) → Ch 9 (PHY) — 깊은 계층
5. Ch 10~12 — Linux 통합
6. Ch 13~16 — 도구 / 운영 / 참조

## 검증

- 챕터 1편 작성 후 사용자 검토 → OK면 다음.
- 다이어그램 `scripts/detect-text-overlap.py`로 overlap 검증.
