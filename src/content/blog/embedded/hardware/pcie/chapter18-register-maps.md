---
title: "Ch 18: Register Maps — Config Space·Capability 비트 reference"
date: 2026-05-19T09:18:00
description: "PCIe register reference — Type 0/1 header·PCIe Cap·AER·MSI·MSI-X·SR-IOV·ACS·LTR의 주요 비트 layout."
series: "PCIe Deep Dive"
seriesOrder: 18
tags: [pcie, register-map, reference, configuration-space, bitfield]
draft: false
---

## 한 줄 요약

> **"본 reference는 *PCIe 진단·tuning에 자주 쓰이는 register*의 비트 layout을 모은 *cheat sheet*입니다."** — 정확한 spec은 *PCIe Base 6.1 § 7*가 1차 자료. 본 reference는 *setpci·driver 코드 작성 시 빠른 lookup*용. *Linux `include/uapi/linux/pci_regs.h`*가 *symbolic 이름 출처*.

[Ch 1~17](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 *각 register의 의미·동작*을 봤습니다. 이 장은 *비트 layout을 한 곳에 모은 reference*입니다.

## Type 0 Header (Endpoint)

| Offset | 크기 | 필드 | 설명 |
|--------|------|------|------|
| 0x00 | 2 | Vendor ID | PCI-SIG 부여 |
| 0x02 | 2 | Device ID | Vendor 부여 |
| 0x04 | 2 | Command | enable·bus master·memory 등 |
| 0x06 | 2 | Status | error·capability·int 등 |
| 0x08 | 1 | Revision ID | |
| 0x09 | 3 | Class Code | base·sub·programming interface |
| 0x0C | 1 | Cache Line Size | |
| 0x0D | 1 | Latency Timer | (legacy PCI) |
| 0x0E | 1 | Header Type | bit 7: multi-func, bit 0~6: 0=Type 0 |
| 0x0F | 1 | BIST | built-in self test |
| 0x10 | 4 | BAR 0 | |
| 0x14 | 4 | BAR 1 | |
| 0x18 | 4 | BAR 2 | |
| 0x1C | 4 | BAR 3 | |
| 0x20 | 4 | BAR 4 | |
| 0x24 | 4 | BAR 5 | |
| 0x28 | 4 | Cardbus CIS Pointer | |
| 0x2C | 2 | Subsystem Vendor ID | |
| 0x2E | 2 | Subsystem Device ID | |
| 0x30 | 4 | Expansion ROM Base Address | |
| 0x34 | 1 | Capabilities Pointer | first cap offset |
| 0x3C | 1 | Interrupt Line | |
| 0x3D | 1 | Interrupt Pin | INTA/B/C/D |
| 0x3E | 1 | Min_Gnt | (legacy) |
| 0x3F | 1 | Max_Lat | (legacy) |

## Command Register (0x04)

| Bit | 의미 |
|-----|------|
| 0 | I/O Space Enable |
| 1 | Memory Space Enable |
| 2 | Bus Master Enable |
| 3 | Special Cycle Enable (legacy) |
| 4 | Memory Write and Invalidate (legacy) |
| 5 | VGA Palette Snoop (legacy) |
| 6 | Parity Error Response |
| 8 | SERR# Enable |
| 9 | Fast Back-to-Back (legacy) |
| 10 | Interrupt Disable |

## Status Register (0x06)

| Bit | 의미 |
|-----|------|
| 3 | Interrupt Status |
| 4 | Capabilities List (이 device가 capability 가짐) |
| 5 | 66 MHz Capable (legacy) |
| 7 | Fast Back-to-Back Capable (legacy) |
| 8 | Master Data Parity Error |
| 11 | Signaled Target Abort |
| 12 | Received Target Abort |
| 13 | Received Master Abort |
| 14 | Signaled System Error |
| 15 | Detected Parity Error |

## Type 1 Header (Bridge) — 차이점

| Offset | 필드 |
|--------|------|
| 0x18 | Primary Bus Number |
| 0x19 | Secondary Bus Number |
| 0x1A | Subordinate Bus Number |
| 0x1B | Secondary Latency Timer |
| 0x1C | I/O Base |
| 0x1D | I/O Limit |
| 0x1E | Secondary Status |
| 0x20 | Memory Base |
| 0x22 | Memory Limit |
| 0x24 | Prefetchable Memory Base |
| 0x26 | Prefetchable Memory Limit |
| 0x28 | Prefetchable Base Upper 32 |
| 0x2C | Prefetchable Limit Upper 32 |
| 0x30 | I/O Base Upper 16 |
| 0x32 | I/O Limit Upper 16 |
| 0x3E | Bridge Control |

## PCIe Capability (ID 0x10) — Sub-register

| Offset | 필드 |
|--------|------|
| +0x00 | PCIe Cap List (ID + Next + Cap Version) |
| +0x02 | PCIe Capabilities (Device/Port Type) |
| +0x04 | Device Capabilities |
| +0x08 | Device Control |
| +0x0A | Device Status |
| +0x0C | Link Capabilities |
| +0x10 | Link Control |
| +0x12 | Link Status |
| +0x14 | Slot Capabilities |
| +0x18 | Slot Control |
| +0x1A | Slot Status |
| +0x1C | Root Control |
| +0x20 | Root Status |
| +0x24 | Device Capabilities 2 |
| +0x28 | Device Control 2 |
| +0x2A | Device Status 2 |
| +0x2C | Link Capabilities 2 |
| +0x30 | Link Control 2 |
| +0x32 | Link Status 2 |

## Device Control (+0x08)

| Bit | 의미 |
|-----|------|
| 0 | Correctable Error Reporting Enable |
| 1 | Non-Fatal Error Reporting Enable |
| 2 | Fatal Error Reporting Enable |
| 3 | Unsupported Request Reporting Enable |
| 4 | Relaxed Ordering Enable |
| 5~7 | MaxPayload (000=128, 001=256, ..., 101=4096) |
| 8 | Extended Tag Field Enable |
| 9 | Phantom Functions Enable |
| 10 | Auxiliary Power PM Enable |
| 11 | No Snoop Enable |
| 12~14 | MaxReadRequest (000=128, ..., 101=4096) |
| 15 | Initiate Function Level Reset (FLR) |

## Link Status (+0x12)

| Bit | 의미 |
|-----|------|
| 0~3 | Current Link Speed (0001=2.5GT, 0010=5GT, ..., 0110=64GT) |
| 4~9 | Negotiated Link Width |
| 10 | Undefined |
| 11 | Link Training |
| 12 | Slot Clock Configuration |
| 13 | Data Link Layer Link Active |
| 14 | Link BW Management Status |
| 15 | Link Autonomous BW Status |

## AER Capability (Extended ID 0x0001)

| Offset | 필드 |
|--------|------|
| +0x00 | Capability ID·Version·Next |
| +0x04 | Uncorrectable Error Status |
| +0x08 | Uncorrectable Error Mask |
| +0x0C | Uncorrectable Error Severity |
| +0x10 | Correctable Error Status |
| +0x14 | Correctable Error Mask |
| +0x18 | AER Capabilities·Control |
| +0x1C | Header Log (4 DW = 16 byte) |
| +0x2C | Root Error Command (Root Port only) |
| +0x30 | Root Error Status |

### Uncorrectable Error Status·Mask·Severity (+0x04/+0x08/+0x0C)

| Bit | 의미 |
|-----|------|
| 4 | Data Link Protocol Error |
| 5 | Surprise Down Error |
| 12 | Poisoned TLP |
| 13 | Flow Control Protocol Error |
| 14 | Completion Timeout |
| 15 | Completer Abort |
| 16 | Unexpected Completion |
| 17 | Receiver Overflow |
| 18 | Malformed TLP |
| 19 | ECRC Error |
| 20 | Unsupported Request |
| 21 | ACS Violation |
| 22 | Uncorrectable Internal Error |
| 23 | MC Blocked TLP |
| 24 | AtomicOp Egress Blocked |
| 25 | TLP Prefix Blocked Error |

### Correctable Error Status·Mask (+0x10/+0x14)

| Bit | 의미 |
|-----|------|
| 0 | Receiver Error |
| 6 | Bad TLP |
| 7 | Bad DLLP |
| 8 | Replay Number Rollover |
| 12 | Replay Timer Timeout |
| 13 | Advisory Non-Fatal Error |
| 14 | Corrected Internal Error |
| 15 | Header Log Overflow |

## MSI Capability (ID 0x05)

| Offset | 필드 |
|--------|------|
| +0x00 | Cap ID·Next |
| +0x02 | Message Control |
| +0x04 | Message Address (32-bit) |
| +0x08 | Message Address Upper (64-bit MSI만) |
| +0x08 또는 +0x0C | Message Data |
| +0x10 | Mask Bits (per-vector mask 지원 시) |
| +0x14 | Pending Bits |

### Message Control

| Bit | 의미 |
|-----|------|
| 0 | MSI Enable |
| 1~3 | Multiple Message Capable (000=1, 001=2, ..., 101=32) |
| 4~6 | Multiple Message Enable |
| 7 | 64-bit Address Capable |
| 8 | Per-vector Masking Capable |

## MSI-X Capability (ID 0x11)

| Offset | 필드 |
|--------|------|
| +0x00 | Cap ID·Next |
| +0x02 | Message Control |
| +0x04 | Table BIR (BAR index) + Table Offset |
| +0x08 | PBA BIR + PBA Offset |

### Message Control

| Bit | 의미 |
|-----|------|
| 10:0 | Table Size – 1 (max 2048) |
| 14 | Function Mask |
| 15 | MSI-X Enable |

### Table Entry (16 byte)

| Offset | 필드 |
|--------|------|
| 0 | Message Address Low |
| 4 | Message Address Upper |
| 8 | Message Data |
| 12 | Vector Control (bit 0: mask) |

## SR-IOV Capability (Extended ID 0x0010)

| Offset | 필드 |
|--------|------|
| +0x00 | Cap ID·Version·Next |
| +0x04 | SR-IOV Capabilities |
| +0x08 | SR-IOV Control |
| +0x0A | SR-IOV Status |
| +0x0C | InitialVFs |
| +0x0E | TotalVFs |
| +0x10 | NumVFs |
| +0x12 | Function Dependency Link |
| +0x14 | First VF Offset |
| +0x16 | VF Stride |
| +0x1A | VF Device ID |
| +0x1C | Supported Page Sizes |
| +0x20 | System Page Size |
| +0x24~0x38 | VF BAR 0~5 |
| +0x3C | VF Migration State Array Offset |

## ACS Capability (Extended ID 0x000F)

| Offset | 필드 |
|--------|------|
| +0x00 | Cap ID·Version·Next |
| +0x04 | ACS Capability |
| +0x06 | ACS Control |
| +0x08 | Egress Control Vector |

### ACS Capability (bit 표시)

| Bit | 의미 |
|-----|------|
| 0 | Source Validation |
| 1 | Translation Blocking |
| 2 | P2P Request Redirect |
| 3 | P2P Completion Redirect |
| 4 | Upstream Forwarding |
| 5 | P2P Egress Control |
| 6 | Direct Translated P2P |

## LTR Capability (Extended ID 0x0018)

| Offset | 필드 |
|--------|------|
| +0x00 | Cap ID·Version·Next |
| +0x04 | Max Snoop Latency |
| +0x06 | Max No-Snoop Latency |

### Latency Format

| Bit | 의미 |
|-----|------|
| 0~9 | Value |
| 10~12 | Scale (0=1ns·1=32ns·2=1024ns·3=32768ns·4=1048576ns·5=33554432ns) |
| 15 | Requirement (1: Required) |

## ECAM 주소 계산

```text
ECAM_address = ECAM_BASE
             + (Bus << 20)
             + (Device << 15)
             + (Function << 12)
             + (Register_offset)
```

| 단위 | 크기 |
|------|------|
| 1 function | 4 KB |
| 1 device (8 functions) | 32 KB |
| 1 bus (32 devices) | 1 MB |
| 1 segment (256 buses) | 256 MB |

## Linux `include/uapi/linux/pci_regs.h`

이 헤더가 *모든 register·bit symbolic 이름*. 예:

| 상수 | 값 |
|------|------|
| `PCI_COMMAND_MEMORY` | 0x02 |
| `PCI_COMMAND_MASTER` | 0x04 |
| `PCI_EXP_DEVCTL` | 8 |
| `PCI_EXP_DEVCTL_PAYLOAD` | 0x00e0 |
| `PCI_EXP_LNKSTA_CLS` | 0x000f |
| `PCI_ERR_UNCOR_STATUS` | 0x04 (AER offset) |
| `PCI_MSIX_TBL_BIR` | 0x07 |
| `PCI_EXT_CAP_ID_AER` | 0x01 |
| `PCI_EXT_CAP_ID_SRIOV` | 0x10 |

driver 코드는 *symbolic 이름 사용 권장* — *magic number 회피*.

## 시리즈 마무리 — 18편 회고

본 시리즈는 *PCIe의 동작·구현·운영*을 *18편*으로 풀었습니다.

- Ch 1: Fundamentals — Gen·encoding·stack·topology
- Ch 2: TLP — 5 가족·split transaction·routing·ordering
- Ch 3: Configuration Space — 4 KB ECAM·Capability chain
- Ch 4: BAR & MMIO — size probe·ReBAR·VF BAR
- Ch 5: Interrupts — INTx·MSI·MSI-X·Interrupt Remapping
- Ch 6: Power Management — D/L states·ASPM·L1 substates·PME
- Ch 7: Error Handling — AER 3-tier·DPC·Poisoned TLP
- Ch 8: DLLP — ACK/NAK·Flow Control·FLIT mode
- Ch 9: Physical Layer — LTSSM·Equalization·SerDes
- Ch 10: Linux Basics — struct pci_dev·driver model·sysfs
- Ch 11: DMA·IOMMU — coherent·streaming·ATS·PASID·IOMMUFD
- Ch 12: Virtualization I — SR-IOV·VFIO·DPDK·SPDK·ACS
- Ch 13: Virtualization II — vIOMMU·S-IOV·VirtIO·IDE·TDISP
- Ch 14: Linux Operations — pciehp·AER recovery·DPC·ARI
- Ch 15: Tools — lspci·setpci·pcimem·debugfs·analyzer
- Ch 16: Troubleshooting — 10 시나리오북
- Ch 17: Performance — BW·MPS·NUMA·DDIO·P2P
- Ch 18: Register Maps — 본 reference

PCIe는 *CXL·UCIe·NVMe의 토대*이고 *2025~2026 datacenter interconnect의 공유 인프라*입니다. Gen 6 FLIT mode·PAM4·Confidential I/O·IOMMUFD·Scalable IOV 등의 *최신 기능*도 함께 다뤘습니다. *upstream tracking 인프라*(audit-upstream-freshness.py)로 *Linux drivers/pci/*의 변경을 *자동 추적*합니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals) — 시리즈 시작
- [CXL Internals Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) — PCIe 위 alternate protocol
- [HBM·GDDR 심화 Ch 9: CXL.mem](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 29: CXL Interconnect](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)

## 시리즈 자료 출처 안내

본 글의 1차 자료는 *PCIe Base Specification·Linux `include/uapi/linux/pci_regs.h`·Linux `drivers/pci/`·CPU 벤더 매뉴얼*입니다. PCIe Specification은 *§ navigation aid*로만 인용 — *spec 본문 재생산 없음*. 자세한 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.

> PCI Express® and PCIe® are registered trademarks of PCI-SIG.
> Spec 인용은 PCI-SIG의 저작권을 따릅니다.
