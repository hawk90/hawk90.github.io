---
title: "Ch 18: Register Maps — Config Space·Capability 비트 reference"
slug: "embedded/hardware/pcie/chapter18-register-maps"
date: 2026-05-19T09:18:00
description: "PCIe register reference — Type 0/1 header·PCIe Cap·AER·MSI·MSI-X·SR-IOV·ACS·LTR의 주요 비트 layout."
series: "PCIe Deep Dive"
seriesOrder: 18
tags: [pcie, register-map, reference, configuration-space, bitfield]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"이 장은 이 시리즈에서 읽은 레지스터의 offset과 비트를 Linux v6.12 `include/uapi/linux/pci_regs.h`의 이름 그대로 한곳에 모은 reference입니다."** 모든 행은 그 헤더의 `#define`과 주석에서 옮겼고, 헤더에 없는 비트는 pciutils 3.13.0 `lib/header.h`나 mainline 헤더에서 가져왔다고 표시했습니다. 비트마다 시리즈 VM에서 실제로 읽은 값이 있는 곳은 해당 장을 걸었습니다.

[Ch 1~17](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 각 레지스터의 동작을 봤습니다. 이 장은 `setpci`나 드라이버 코드를 쓸 때 찾아보는 용도입니다. 레지스터 이름 열의 `PCI_` 접두사가 붙은 상수는 [Linux v6.12 `pci_regs.h`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/uapi/linux/pci_regs.h)에 있습니다.

## 비트 위치를 찾은 뒤 접근 속성 확인하기

이 reference는 비트 위치를 찾는 용도이며, 표에 있다는 이유로 같은 방식으로 읽고 쓸 수 있다는 뜻은 아닙니다. 예를 들어 AER Status에는 기록된 비트를 1로 써서 지우는 W1C(Write One to Clear) 동작이 있습니다. 읽은 값을 수정해 통째로 되쓰면 남기려던 다른 오류 기록까지 지울 수 있습니다. Mask·Severity·Control과 Status의 접근 규칙을 구분해야 합니다.

[Linux v6.12 AER 구현](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/pci/pcie/aer.c)의 status clear와 [Ch 15](/blog/embedded/hardware/pcie/chapter15-tools)의 조회·제어 구분을 함께 봅니다. Capability의 시작 offset, register 폭, 장치 종류와 해당 비트의 접근 속성을 확인한 뒤 driver가 소유한 변경 경로를 사용합니다. 이 표는 오류 기록 보존이나 장치 상태 관리를 대신하는 write recipe가 아닙니다.

## Type 0 Header (Endpoint)

| Offset | 크기 | `pci_regs.h` | 헤더 주석 / 비고 |
|------|------|------|------|
| 0x00 | 2 | `PCI_VENDOR_ID` | 16 bits |
| 0x02 | 2 | `PCI_DEVICE_ID` | 16 bits |
| 0x04 | 2 | `PCI_COMMAND` | 아래 비트 표 |
| 0x06 | 2 | `PCI_STATUS` | 아래 비트 표 |
| 0x08 | 1 | `PCI_REVISION_ID` | `PCI_CLASS_REVISION`(0x08)은 "High 24 bits are class, low 8 revision" |
| 0x09 | 1 | `PCI_CLASS_PROG` | Reg. Level Programming Interface |
| 0x0A | 2 | `PCI_CLASS_DEVICE` | Device class |
| 0x0C | 1 | `PCI_CACHE_LINE_SIZE` | |
| 0x0D | 1 | `PCI_LATENCY_TIMER` | |
| 0x0E | 1 | `PCI_HEADER_TYPE` | 하위 7비트 형식, 0x80 Multi-Function ([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)) |
| 0x0F | 1 | `PCI_BIST` | |
| 0x10~0x24 | 4×6 | `PCI_BASE_ADDRESS_0`~`_5` | [Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio) |
| 0x28 | 4 | `PCI_CARDBUS_CIS` | |
| 0x2C | 2 | `PCI_SUBSYSTEM_VENDOR_ID` | |
| 0x2E | 2 | `PCI_SUBSYSTEM_ID` | |
| 0x30 | 4 | `PCI_ROM_ADDRESS` | "Bits 31..11 are address, 10..1 reserved" |
| 0x34 | 1 | `PCI_CAPABILITY_LIST` | 첫 capability offset |
| 0x3C | 1 | `PCI_INTERRUPT_LINE` | |
| 0x3D | 1 | `PCI_INTERRUPT_PIN` | |
| 0x3E | 1 | `PCI_MIN_GNT` | |
| 0x3F | 1 | `PCI_MAX_LAT` | |

## Command Register (0x04)

| 비트 | `pci_regs.h:40-51` | 헤더 주석 |
|------|------|------|
| 0 | `PCI_COMMAND_IO` | Enable response in I/O space |
| 1 | `PCI_COMMAND_MEMORY` | Enable response in Memory space |
| 2 | `PCI_COMMAND_MASTER` | Enable bus mastering |
| 3 | `PCI_COMMAND_SPECIAL` | Enable response to special cycles |
| 4 | `PCI_COMMAND_INVALIDATE` | Use memory write and invalidate |
| 5 | `PCI_COMMAND_VGA_PALETTE` | Enable palette snooping |
| 6 | `PCI_COMMAND_PARITY` | Enable parity checking |
| 7 | `PCI_COMMAND_WAIT` | Enable address/data stepping |
| 8 | `PCI_COMMAND_SERR` | Enable SERR |
| 9 | `PCI_COMMAND_FAST_BACK` | Enable back-to-back writes |
| 10 | `PCI_COMMAND_INTX_DISABLE` | INTx Emulation Disable |

시리즈 VM의 e1000e Command는 0x0406이었습니다([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)). bit 1·2(Memory, Bus Master)와 bit 10(INTx Disable, MSI-X 사용 중)이 켜진 값입니다. [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)에서는 igb에 `COMMAND=0100:0100`으로 bit 8만 켰습니다.

## Status Register (0x06)

| 비트 | `pci_regs.h:53-69` | 헤더 주석 |
|------|------|------|
| 0 | `PCI_STATUS_IMM_READY` | Immediate Readiness |
| 3 | `PCI_STATUS_INTERRUPT` | Interrupt status |
| 4 | `PCI_STATUS_CAP_LIST` | Support Capability List |
| 5 | `PCI_STATUS_66MHZ` | Support 66 MHz PCI 2.1 bus |
| 6 | `PCI_STATUS_UDF` | User Definable Features [obsolete] |
| 7 | `PCI_STATUS_FAST_BACK` | Accept fast-back to back |
| 8 | `PCI_STATUS_PARITY` | Detected parity error |
| 10:9 | `PCI_STATUS_DEVSEL_MASK` | DEVSEL timing |
| 11 | `PCI_STATUS_SIG_TARGET_ABORT` | Set on target abort |
| 12 | `PCI_STATUS_REC_TARGET_ABORT` | Master ack of target abort |
| 13 | `PCI_STATUS_REC_MASTER_ABORT` | Set on master abort |
| 14 | `PCI_STATUS_SIG_SYSTEM_ERROR` | Set when we drive SERR |
| 15 | `PCI_STATUS_DETECTED_PARITY` | Set on parity error |

QEMU는 오류 메시지가 SERR# 또는 DevCtl enable 검사를 통과할 때 bit 14를 세웁니다(`hw/pci/pcie_aer.c:200-209`, `222-223`).

## Type 1 Header (Bridge) — 차이점

| Offset | `pci_regs.h:131-161` | 비고 |
|------|------|------|
| 0x18 | `PCI_PRIMARY_BUS` | |
| 0x19 | `PCI_SECONDARY_BUS` | |
| 0x1A | `PCI_SUBORDINATE_BUS` | "Highest bus number behind the bridge" |
| 0x1B | `PCI_SEC_LATENCY_TIMER` | |
| 0x1C / 0x1D | `PCI_IO_BASE` / `PCI_IO_LIMIT` | |
| 0x1E | `PCI_SEC_STATUS` | |
| 0x20 / 0x22 | `PCI_MEMORY_BASE` / `PCI_MEMORY_LIMIT` | 1 MiB 단위 window |
| 0x24 / 0x26 | `PCI_PREF_MEMORY_BASE` / `PCI_PREF_MEMORY_LIMIT` | 하위 4비트 1이면 64-bit (`PCI_PREF_RANGE_TYPE_64`) |
| 0x28 / 0x2C | `PCI_PREF_BASE_UPPER32` / `PCI_PREF_LIMIT_UPPER32` | |
| 0x30 / 0x32 | `PCI_IO_BASE_UPPER16` / `PCI_IO_LIMIT_UPPER16` | |
| 0x38 | `PCI_ROM_ADDRESS1` | Type 0의 0x30과 같은 형식 |
| 0x3E | `PCI_BRIDGE_CONTROL` | bit 6 `PCI_BRIDGE_CTL_BUS_RESET` = Secondary bus reset |

root port 00:03.0의 실제 값과 해석은 [Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)에 있습니다.

## PCIe Capability (ID 0x10) — Sub-register

| Offset | `pci_regs.h:474-705` | 헤더 주석 |
|------|------|------|
| +0x02 | `PCI_EXP_FLAGS` | Capabilities register (버전 bit 3:0, type bit 7:4) |
| +0x04 | `PCI_EXP_DEVCAP` | Device capabilities |
| +0x08 | `PCI_EXP_DEVCTL` | Device Control |
| +0x0A | `PCI_EXP_DEVSTA` | Device Status |
| +0x0C | `PCI_EXP_LNKCAP` | Link Capabilities |
| +0x10 | `PCI_EXP_LNKCTL` | Link Control |
| +0x12 | `PCI_EXP_LNKSTA` | Link Status |
| +0x14 | `PCI_EXP_SLTCAP` | Slot Capabilities |
| +0x18 | `PCI_EXP_SLTCTL` | Slot Control |
| +0x1A | `PCI_EXP_SLTSTA` | Slot Status |
| +0x1C | `PCI_EXP_RTCTL` | Root Control |
| +0x1E | `PCI_EXP_RTCAP` | Root Capabilities |
| +0x20 | `PCI_EXP_RTSTA` | Root Status |
| +0x24 | `PCI_EXP_DEVCAP2` | Device Capabilities 2 |
| +0x28 | `PCI_EXP_DEVCTL2` | Device Control 2 |
| +0x2A | `PCI_EXP_DEVSTA2` | Device Status 2 |
| +0x2C | `PCI_EXP_LNKCAP2` | Link Capabilities 2 |
| +0x30 | `PCI_EXP_LNKCTL2` | Link Control 2 |
| +0x32 | `PCI_EXP_LNKSTA2` | Link Status 2 |
| +0x34 / +0x38 / +0x3A | `PCI_EXP_SLTCAP2` / `SLTCTL2` / `SLTSTA2` | Slot Capabilities·Control·Status 2 |

`setpci`에서는 `CAP_EXP+10.w`처럼 capability 시작 기준 offset으로 씁니다([Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer)).

## Device Control (+0x08)

| 비트 | `pci_regs.h:502-525` | 헤더 주석 |
|------|------|------|
| 0 | `PCI_EXP_DEVCTL_CERE` | Correctable Error Reporting En. |
| 1 | `PCI_EXP_DEVCTL_NFERE` | Non-Fatal Error Reporting Enable |
| 2 | `PCI_EXP_DEVCTL_FERE` | Fatal Error Reporting Enable |
| 3 | `PCI_EXP_DEVCTL_URRE` | Unsupported Request Reporting En. |
| 4 | `PCI_EXP_DEVCTL_RELAX_EN` | Enable relaxed ordering |
| 7:5 | `PCI_EXP_DEVCTL_PAYLOAD` | Max_Payload_Size, 0~5 = 128~4096 바이트 |
| 8 | `PCI_EXP_DEVCTL_EXT_TAG` | Extended Tag Field Enable |
| 9 | `PCI_EXP_DEVCTL_PHANTOM` | Phantom Functions Enable |
| 10 | `PCI_EXP_DEVCTL_AUX_PME` | Auxiliary Power PM Enable |
| 11 | `PCI_EXP_DEVCTL_NOSNOOP_EN` | Enable No Snoop |
| 14:12 | `PCI_EXP_DEVCTL_READRQ` | Max_Read_Request_Size, 0~5 = 128~4096 바이트 |
| 15 | `PCI_EXP_DEVCTL_BCR_FLR` | Bridge Configuration Retry / FLR |

예를 들어 `0x2810`은 `(v & 0x00e0) >> 5 = 0`이라 MPS 128바이트, `(v & 0x7000) >> 12 = 2`라 MRRS 512바이트, bit 4·11이 켜져 RO·No Snoop입니다. [Ch 15](/blog/embedded/hardware/pcie/chapter15-tools)에서 이 값을 넣은 dump를 `lspci -F`로 해석해 같은 결과를 얻었습니다. bit 0~3이 쓰기 가능해야 장치가 오류 메시지를 보낸다는 점은 [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 봤습니다.

## Link Status (+0x12)

| 비트 | `pci_regs.h:567-584` | 헤더 주석 |
|------|------|------|
| 3:0 | `PCI_EXP_LNKSTA_CLS` | Current Link Speed (1=2.5, 2=5, 3=8, 4=16, 5=32, 6=64 GT/s) |
| 9:4 | `PCI_EXP_LNKSTA_NLW` | Negotiated Link Width |
| 11 | `PCI_EXP_LNKSTA_LT` | Link Training |
| 12 | `PCI_EXP_LNKSTA_SLC` | Slot Clock Configuration |
| 13 | `PCI_EXP_LNKSTA_DLLLA` | Data Link Layer Link Active |
| 14 | `PCI_EXP_LNKSTA_LBMS` | Link Bandwidth Management Status |
| 15 | `PCI_EXP_LNKSTA_LABS` | Link Autonomous Bandwidth Status |

시리즈 VM root port의 Link Status 0x2011은 DLLLA·x1·2.5 GT/s입니다([Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer)). Link Status 2의 equalization 비트는 Linux v6.12에 정의가 없고 pciutils 3.13.0 `lib/header.h:933-937`에 있습니다.

## AER Capability (Extended ID 0x0001)

| Offset | `pci_regs.h:753-807` | 헤더 주석 |
|------|------|------|
| +0x04 | `PCI_ERR_UNCOR_STATUS` | Uncorrectable Error Status |
| +0x08 | `PCI_ERR_UNCOR_MASK` | Uncorrectable Error Mask |
| +0x0C | `PCI_ERR_UNCOR_SEVER` | Uncorrectable Error Severity |
| +0x10 | `PCI_ERR_COR_STATUS` | Correctable Error Status |
| +0x14 | `PCI_ERR_COR_MASK` | Correctable Error Mask |
| +0x18 | `PCI_ERR_CAP` | Advanced Error Capabilities & Ctrl |
| +0x1C | `PCI_ERR_HEADER_LOG` | Header Log Register (16 bytes) |
| +0x2C | `PCI_ERR_ROOT_COMMAND` | Root Error Command |
| +0x30 | `PCI_ERR_ROOT_STATUS` | |
| +0x34 | `PCI_ERR_ROOT_ERR_SRC` | Error Source Identification |

### Uncorrectable Error Status·Mask·Severity (+0x04/+0x08/+0x0C)

| 비트 | `pci_regs.h:755-771` | 헤더 주석 |
|------|------|------|
| 0 | `PCI_ERR_UNC_UND` | Undefined |
| 4 | `PCI_ERR_UNC_DLP` | Data Link Protocol |
| 5 | `PCI_ERR_UNC_SURPDN` | Surprise Down |
| 12 | `PCI_ERR_UNC_POISON_TLP` | Poisoned TLP |
| 13 | `PCI_ERR_UNC_FCP` | Flow Control Protocol |
| 14 | `PCI_ERR_UNC_COMP_TIME` | Completion Timeout |
| 15 | `PCI_ERR_UNC_COMP_ABORT` | Completer Abort |
| 16 | `PCI_ERR_UNC_UNX_COMP` | Unexpected Completion |
| 17 | `PCI_ERR_UNC_RX_OVER` | Receiver Overflow |
| 18 | `PCI_ERR_UNC_MALF_TLP` | Malformed TLP |
| 19 | `PCI_ERR_UNC_ECRC` | ECRC Error Status |
| 20 | `PCI_ERR_UNC_UNSUP` | Unsupported Request |
| 21 | `PCI_ERR_UNC_ACSV` | ACS Violation |
| 22 | `PCI_ERR_UNC_INTN` | internal error |
| 23 | `PCI_ERR_UNC_MCBTLP` | MC blocked TLP |
| 24 | `PCI_ERR_UNC_ATOMEG` | Atomic egress blocked |
| 25 | `PCI_ERR_UNC_TLPPRE` | TLP prefix blocked |
| 28 | (mainline 7.4-rc3) `PCI_ERR_UNC_IDE_CHECK` | IDE Check Failed |
| 29 | (mainline 7.4-rc3) `PCI_ERR_UNC_MISR_IDE` | Misrouted IDE TLP |

마지막 두 행은 Linux v6.12에 없고 2026-11-16에 받은 mainline `pci_regs.h:792-793`에 있습니다([Ch 13](/blog/embedded/hardware/pcie/chapter13-virtualization-2)). [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)의 `error status/mask=00100000/02400000`은 bit 20(UR)이 status, bit 22·25가 mask인 값입니다.

### Correctable Error Status·Mask (+0x10/+0x14)

| 비트 | `pci_regs.h:777-784` | 헤더 주석 |
|------|------|------|
| 0 | `PCI_ERR_COR_RCVR` | Receiver Error Status |
| 6 | `PCI_ERR_COR_BAD_TLP` | Bad TLP Status |
| 7 | `PCI_ERR_COR_BAD_DLLP` | Bad DLLP Status |
| 8 | `PCI_ERR_COR_REP_ROLL` | REPLAY_NUM Rollover |
| 12 | `PCI_ERR_COR_REP_TIMER` | Replay Timer Timeout |
| 13 | `PCI_ERR_COR_ADV_NFAT` | Advisory Non-Fatal |
| 14 | `PCI_ERR_COR_INTERNAL` | Corrected Internal |
| 15 | `PCI_ERR_COR_LOG_OVER` | Header Log Overflow |

## MSI Capability (ID 0x05)

| Offset | `pci_regs.h:307-321` | 헤더 주석 |
|------|------|------|
| +0x02 | `PCI_MSI_FLAGS` | Message Control |
| +0x04 | `PCI_MSI_ADDRESS_LO` | Lower 32 bits |
| +0x08 | `PCI_MSI_ADDRESS_HI` | Upper 32 bits (if `PCI_MSI_FLAGS_64BIT` set) |
| +0x08 / +0x0C | `PCI_MSI_DATA_32` / `PCI_MSI_DATA_64` | data, 32-bit / 64-bit 장치 |
| +0x0C / +0x10 | `PCI_MSI_MASK_32` / `PCI_MSI_MASK_64` | Mask bits |
| +0x10 / +0x14 | `PCI_MSI_PENDING_32` / `PCI_MSI_PENDING_64` | Pending |

### Message Control

| 비트 | `pci_regs.h` | 헤더 주석 |
|------|------|------|
| 0 | `PCI_MSI_FLAGS_ENABLE` | MSI feature enabled |
| 3:1 | `PCI_MSI_FLAGS_QMASK` | Maximum queue size available |
| 6:4 | `PCI_MSI_FLAGS_QSIZE` | Message queue size configured |
| 7 | `PCI_MSI_FLAGS_64BIT` | 64-bit addresses allowed |
| 8 | `PCI_MSI_FLAGS_MASKBIT` | Per-vector masking capable |

MSI가 최대 32개라는 제한은 [Linux v6.12 MSI HOWTO](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/msi-howto.rst)(120-127행)에 있습니다([Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts)).

## MSI-X Capability (ID 0x11)

| Offset | `pci_regs.h:324-335` | 헤더 주석 |
|------|------|------|
| +0x02 | `PCI_MSIX_FLAGS` | Message Control |
| +0x04 | `PCI_MSIX_TABLE` | `_BIR` 0x7 = BAR index, `_OFFSET` 0xfffffff8 = Offset into specified BAR |
| +0x08 | `PCI_MSIX_PBA` | 같은 형식 |

### Message Control

| 비트 | `pci_regs.h` | 헤더 주석 |
|------|------|------|
| 10:0 | `PCI_MSIX_FLAGS_QSIZE` | Table size (N-1 인코딩, 최대 2048) |
| 14 | `PCI_MSIX_FLAGS_MASKALL` | Mask all vectors for this function |
| 15 | `PCI_MSIX_FLAGS_ENABLE` | MSI-X enable |

### Table Entry (16 byte)

| Offset | `pci_regs.h:338-343` |
|------|------|
| 0x0 | `PCI_MSIX_ENTRY_LOWER_ADDR` |
| 0x4 | `PCI_MSIX_ENTRY_UPPER_ADDR` |
| 0x8 | `PCI_MSIX_ENTRY_DATA` |
| 0xC | `PCI_MSIX_ENTRY_VECTOR_CTRL`, bit 0 `PCI_MSIX_ENTRY_CTRL_MASKBIT` |

시리즈 VM NVMe의 실제 table 내용은 [Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts)에 있습니다.

## SR-IOV Capability (Extended ID 0x0010)

| Offset | `pci_regs.h:948-970` | 헤더 주석 | igb(03:00.0)에서 본 값 |
|------|------|------|------|
| +0x04 | `PCI_SRIOV_CAP` | SR-IOV Capabilities | |
| +0x08 | `PCI_SRIOV_CTRL` | SR-IOV Control | `ARIHierarchy+` |
| +0x0A | `PCI_SRIOV_STATUS` | SR-IOV Status | |
| +0x0C | `PCI_SRIOV_INITIAL_VF` | Initial VFs | 8 |
| +0x0E | `PCI_SRIOV_TOTAL_VF` | Total VFs | 8 |
| +0x10 | `PCI_SRIOV_NUM_VF` | Number of VFs | 0 → 2 |
| +0x12 | `PCI_SRIOV_FUNC_LINK` | Function Dependency Link | 0 |
| +0x14 | `PCI_SRIOV_VF_OFFSET` | First VF Offset | 128 |
| +0x16 | `PCI_SRIOV_VF_STRIDE` | Following VF Stride | 2 |
| +0x1A | `PCI_SRIOV_VF_DID` | VF Device ID | 0x10ca |
| +0x1C | `PCI_SRIOV_SUP_PGSIZE` | Supported Page Sizes | 0x553 |
| +0x20 | `PCI_SRIOV_SYS_PGSIZE` | System Page Size | 0x1 |
| +0x24~ | `PCI_SRIOV_BAR` | VF BAR0 부터 | VF BAR0·BAR3 각 16 KiB |
| +0x3C | `PCI_SRIOV_VFM` | VF Migration State Array Offset | 0 |

오른쪽 열은 [Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)의 `lspci -vv` SR-IOV 출력에서 옮겼습니다.

## ACS Capability (Extended ID 0x000D)

| Offset | `pci_regs.h:989-999` |
|------|------|
| +0x04 | `PCI_ACS_CAP` |
| +0x06 | `PCI_ACS_CTRL` |
| +0x08 | `PCI_ACS_EGRESS_CTL_V` |

### ACS Capability·Control 비트

| 비트 | `pci_regs.h` | 헤더 주석 | QEMU root port Cap / Ctl |
|------|------|------|------|
| 0 | `PCI_ACS_SV` | Source Validation | + / + |
| 1 | `PCI_ACS_TB` | Translation Blocking | + / - |
| 2 | `PCI_ACS_RR` | P2P Request Redirect | + / + |
| 3 | `PCI_ACS_CR` | P2P Completion Redirect | + / + |
| 4 | `PCI_ACS_UF` | Upstream Forwarding | + / + |
| 5 | `PCI_ACS_EC` | P2P Egress Control | - / - |
| 6 | `PCI_ACS_DT` | Direct Translated P2P | + / - |

오른쪽 열은 시리즈 VM root port의 `ACSCap`·`ACSCtl` 줄입니다([Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)의 `lspci -vv`). ACS 유무가 IOMMU group에 미친 영향은 [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)에 있습니다.

## LTR Capability (Extended ID 0x0018)

| Offset | `pci_regs.h:979-985` |
|------|------|
| +0x04 | `PCI_LTR_MAX_SNOOP_LAT` |
| +0x06 | `PCI_LTR_MAX_NOSNOOP_LAT` |

### Latency Format

| 비트 | `pci_regs.h` | 뜻 |
|------|------|------|
| 9:0 | `PCI_LTR_VALUE_MASK` 0x3ff | Value |
| 12:10 | `PCI_LTR_SCALE_MASK` 0x1c00 | Scale |

Scale 값의 단위는 pciutils 3.13.0 `cap_ltr_scale()`(`ls-ecaps.c:53-56`)이 `PCI_LTR_*` 필드를 해석할 때 쓰는 `1 << (scale * 5)` ns이고, Linux v6.12 `encode_l12_threshold()`(`drivers/pci/pcie/aspm.c:514-545`)도 L1.2 threshold에 같은 단위를 씁니다. 0=1 ns, 1=32 ns, 2=1024 ns, 3=32768 ns, 4=1048576 ns, 5=33554432 ns입니다. 시리즈 VM에는 LTR 장치가 없습니다.

## ECAM 주소 계산

Linux v6.12 `include/linux/pci-ecam.h:23-34`의 정의입니다.

```c
#define PCIE_ECAM_BUS_SHIFT	20 /* Bus number */
#define PCIE_ECAM_DEVFN_SHIFT	12 /* Device and Function number */
#define PCIE_ECAM_REG_MASK	0xfff /* Limit offset to a maximum of 4K */
```

| 단위 | 크기 |
|------|------|
| function 하나 | 4 KiB (offset 12비트) |
| bus 하나 (devfn 256) | 1 MiB |
| bus 256개 | 256 MiB |

시리즈 VM의 ECAM base는 0x4010000000이었고, e1000e(bus 2)의 config는 0x4010200000에서 읽혔습니다([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)).

## 이 시리즈의 장 목록

| 장 | 이 장의 표와 연결되는 실험 |
|------|------|
| [Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals) | Express Capability type, LnkCap·LnkSta |
| [Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp) | DevCtl Extended Tag, AER Header Log |
| [Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space) | Type 0·Type 1 header dump, ECAM |
| [Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio) | BAR sizing, SR-IOV |
| [Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts) | MSI·MSI-X |
| [Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management) | PMCSR, ASPM Control |
| [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling) | AER 주입 |
| [Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp) | DLLLA, Data Link 오류 비트 |
| [Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer) | Link Control·Link Status 2 |
| [Ch 10](/blog/embedded/hardware/pcie/chapter10-linux-basics) ~ [Ch 17](/blog/embedded/hardware/pcie/chapter17-performance) | Linux 드라이버·운영·도구·성능 |

다음 [Ch 19 고급 기능](/blog/embedded/hardware/pcie/chapter19-advanced-features)에서 Lane Margining·10-bit Tag·TPH·ACS·L0p를 이어 갑니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals) — 시리즈 VM 구성
- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — 같은 헤더를 처음 배울 때 보는 쪽. 이 장은 비트 단위로 찾아볼 때
- [CXL Internals Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) — PCIe 위 alternate protocol
- [HBM·GDDR 심화 Ch 9: CXL.mem](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 29: CXL Interconnect](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)

## 시리즈 자료 출처 안내

이 글의 표는 Linux v6.12 `include/uapi/linux/pci_regs.h`의 정의와 주석을 옮긴 것이고, 헤더에 없는 비트는 출처를 따로 적었습니다. 관찰값은 Ch 1의 시리즈 VM에서 읽었습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.

> PCI Express® and PCIe® are registered trademarks of PCI-SIG.
