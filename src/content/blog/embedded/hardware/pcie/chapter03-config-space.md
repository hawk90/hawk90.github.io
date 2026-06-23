---
title: "Ch 3: Configuration Space — 4 KB ECAM·Capability Linked List"
date: 2026-05-19T09:03:00
description: "PCIe Configuration Space — 256 byte PCI 영역 + 4 KB Extended·Type 0/1 header·Capability chain·ECAM 메모리 매핑."
series: "PCIe Deep Dive"
seriesOrder: 3
tags: [pcie, configuration-space, ecam, capability, dvsec]
draft: false
---

## 한 줄 요약

> **"Configuration Space는 PCIe device의 *명함과 다이얼*입니다."** — 처음 *256 byte는 PCI Local Bus*에서 정의된 영역, 다음 *3840 byte는 PCIe Extended*. *Type 0 header (EP)·Type 1 header (Bridge)* 두 형식, *Capability linked list*가 *PCI-PM·MSI·PCIe Cap·Power Budgeting* 같은 기능을 *체인으로* 연결합니다. *ECAM*이 그 4 KB를 *MMIO로 매핑*합니다.

[Ch 2 TLP](/blog/embedded/hardware/pcie/chapter02-tlp)에서 *Configuration TLP의 라우팅 방식*을 봤습니다. 이 장은 *Configuration TLP가 읽고 쓰는 4 KB 영역의 layout*을 본격적으로 분해합니다.

## Configuration Space 4 KB

| 영역 | 크기 | 비고 |
|------|------|------|
| **PCI Configuration** | 256 byte (offset 0x00 ~ 0xFF) | 원본 PCI Local Bus 정의 |
| **PCIe Extended** | 3840 byte (offset 0x100 ~ 0xFFF) | PCIe가 추가, *Extended Capability* 영역 |

각 device·function이 *4 KB Configuration Space*를 보유. *Multi-function device*는 *function별로 4 KB*. *Multi-host MR-IOV 같은 경우*는 더 복잡.

## Type 0 vs Type 1 Header

처음 *64 byte (0x00 ~ 0x3F)*가 *header*. 두 가지 형식:

| Type | 사용 | 식별 |
|------|------|------|
| **Type 0** | Endpoint | Bit 0x0E[6:0] = 0x00 |
| **Type 1** | Bridge·Root Port·Switch Port | Bit 0x0E[6:0] = 0x01 |

*Switch downstream port·root port*는 *Type 1*. 그 *아래 device로 향하는 routing*에 *primary·secondary·subordinate bus 번호*가 필요해서 *Type 0와 layout 다름*.

## Type 0 Header (Endpoint)

| Offset | 필드 | 의미 |
|--------|------|------|
| 0x00 | Vendor ID | PCI-SIG 부여 |
| 0x02 | Device ID | Vendor 부여 |
| 0x04 | Command | enable·bus master·memory 등 control |
| 0x06 | Status | error·capability 등 |
| 0x08 | Revision ID·Class Code | device class 분류 |
| 0x0C | Cache Line Size·Latency Timer·Header Type | header 종류 식별 |
| 0x10 | BAR0 | Base Address Register |
| 0x14 | BAR1 | |
| 0x18 | BAR2 | |
| 0x1C | BAR3 | |
| 0x20 | BAR4 | |
| 0x24 | BAR5 | |
| 0x28 | Cardbus CIS Pointer | (대부분 unused) |
| 0x2C | Subsystem Vendor·Subsystem Device | OEM 식별 |
| 0x30 | Expansion ROM BAR | option ROM |
| 0x34 | Capabilities Pointer | *capability chain 시작 offset* |
| 0x3C | Interrupt Line·Pin·Min_Gnt·Max_Lat | legacy 인터럽트 |

## Type 1 Header (Bridge·Root Port)

| Offset | 필드 | 의미 |
|--------|------|------|
| 0x00~0x0C | (Type 0와 동일) | identity·control |
| 0x10 | BAR0 | Bridge 자체 MMIO |
| 0x14 | BAR1 | |
| 0x18 | Primary·Secondary·Subordinate Bus·Sec Latency | *bus routing* |
| 0x1C | I/O Base·Limit·Secondary Status | I/O range |
| 0x20 | Memory Base·Limit | non-prefetch memory range |
| 0x24 | Prefetchable Memory Base·Limit | prefetchable range |
| 0x28~0x2C | Prefetchable Base·Limit Upper 32 | 64-bit prefetchable |
| 0x30 | I/O Base·Limit Upper 16 | |
| 0x34 | Capabilities Pointer | |
| 0x38 | Expansion ROM BAR | |
| 0x3C | Interrupt·Bridge Control | |

*Secondary·Subordinate bus 번호*가 *Type 1의 핵심*. *upstream에서 보낸 Config TLP*가 *어떤 bus로 forward*할지 결정.

## Capabilities Pointer·Capability List

*Capabilities Pointer (offset 0x34)*가 *capability chain의 첫 entry offset*. 각 capability는 *3 byte 헤더*:

| 필드 | bit | 의미 |
|------|-----|------|
| Capability ID | 0~7 | capability 종류 |
| Next Pointer | 8~15 | 다음 capability offset (0이면 끝) |
| (Capability별 데이터) | 16~ | capability 본문 |

대표적인 *PCI Capability ID*:

| ID | 의미 |
|----|------|
| 0x01 | Power Management |
| 0x05 | MSI |
| 0x10 | **PCI Express** (이게 PCIe Cap) |
| 0x11 | MSI-X |
| 0x12 | SATA Data·Index Config |
| 0x13 | Advanced Features |

## PCIe Capability (ID 0x10)

*PCIe Cap*은 *device·link·slot·root control/status*를 묶음:

| Sub-register | offset | 의미 |
|--------------|--------|------|
| PCIe Capabilities | +0x02 | device type·slot·int message # |
| Device Capabilities | +0x04 | max payload·extended tag 지원 등 |
| Device Control | +0x08 | max payload·MaxReadReq·extended tag enable·NS·RO |
| Device Status | +0x0A | correctable·non-fatal·fatal·unsupported error |
| Link Capabilities | +0x0C | max speed·max width·ASPM 지원 |
| Link Control | +0x10 | ASPM enable·link disable·retrain |
| Link Status | +0x12 | current speed·current width·training |
| Slot Capabilities·Control·Status | +0x14~+0x1A | hot-plug |
| Root Control·Status | +0x1C~+0x20 | PME·root port specific |

`lspci -vv | grep -A 10 "Express Endpoint"` 출력의 *LnkCap·LnkSta·LnkCtl*이 이 영역들. *PCIe tuning의 핵심*.

## Extended Capability (offset 0x100~)

*4 KB 영역*에는 *Extended Capability*가 줄지어 있습니다. *PCIe 3.0 이상 기능*은 대부분 여기에:

| ID | 명칭 |
|----|------|
| 0x0001 | Advanced Error Reporting (AER) |
| 0x0002 | Virtual Channel |
| 0x0003 | Device Serial Number |
| 0x0009 | Vendor-Specific (VSEC) |
| 0x000B | Vendor-Specific Extended (DVSEC) |
| 0x000F | Access Control Services (ACS) |
| 0x0010 | SR-IOV |
| 0x0011 | MR-IOV |
| 0x0018 | Latency Tolerance Reporting (LTR) |
| 0x001D | Downstream Port Containment (DPC) |
| 0x001E | L1 PM Substates |
| 0x0023 | Resizable BAR (ReBAR) |
| 0x0026 | Address Translation Services (ATS) |
| 0x0027 | TPH Requester |
| 0x002A | Process Address Space ID (PASID) |
| 0x002E | Data Object Exchange (DOE) |
| 0x0030 | Integrity & Data Encryption (IDE) |

각 Extended Cap는 *4 byte 헤더 (Cap ID + Version + Next Pointer 12-bit)*. 자세한 layout은 PCIe Base Spec § 7.

## DVSEC — Vendor 확장

*DVSEC (Designated Vendor-Specific Extended Capability, ID 0x000B)*은 *vendor가 자기 capability를 표준 형식으로 광고*하는 영역. *CXL이 DVSEC로 자기를 식별*합니다:

| 필드 | 의미 |
|------|------|
| DVSEC Header 1 | Length·Vendor ID |
| DVSEC Header 2 | Revision·DVSEC ID |
| DVSEC Body | vendor-specific 내용 |

CXL 1.1+ device는 *DVSEC ID = 0x0~0x10* 사이 여러 entry로 자기를 광고. [CXL Internals Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)에서 자세히.

## ECAM — Enhanced Configuration Access Mechanism

원본 PCI는 *I/O port (0xCF8·0xCFC)*로 Configuration access. PCIe는 *MMIO mapping*인 *ECAM*을 표준화:

| 영역 | 의미 |
|------|------|
| ECAM base address | UEFI·ACPI가 지정 (보통 `0xE0000000` 근처) |
| 1 device·function | 4 KB |
| 1 bus | 4 KB × 256 (32 device × 8 function) = 1 MB |
| 1 PCIe segment (256 bus) | 256 MB |

ECAM 주소 계산: `ECAM_BASE + (Bus << 20) + (Dev << 15) + (Func << 12) + Reg`. *segment 단위로 여러 ECAM 영역* 운영도 가능.

Linux는 *ACPI MCFG 테이블*에서 ECAM 영역을 읽음. `dmesg | grep MCFG`로 확인 가능.

## Configuration Access — Type 0 vs Type 1

*Configuration TLP*는 *Bus 번호*에 따라 routing:

| 시나리오 | 적용 |
|---------|------|
| Bus 번호 = *bridge의 secondary* | bridge가 *Type 0로 변환*해 그 bus로 보냄 |
| Bus 번호 ∈ *bridge의 secondary~subordinate 범위* | bridge가 *Type 1으로 forward* |
| Bus 번호가 *범위 밖* | bridge가 *unsupported request 반환* |

Type 1 → Type 0 변환이 *bridge·switch downstream port*의 *enumeration 핵심 동작*.

## Latency Tolerance Reporting (LTR)

*LTR*은 *EP가 RC에게 "지금 N ns latency까지 견딜 수 있다"*고 알려주는 메커니즘:

| 비트 | 의미 |
|------|------|
| Snoop Latency Value·Scale | snoop 가능한 max latency |
| No-snoop Latency Value·Scale | snoop 안 하는 max latency |

RC는 이 정보로 *deeper power state로 진입 결정*. *모바일·저전력 platform의 핵심*.

## 자주 하는 실수

### "Configuration Space는 256 byte"

*PCI는 256 byte, PCIe는 4 KB*. *Extended Cap (AER·SR-IOV·ATS 등)*은 *256 byte 너머*에 있음. *0x100 이상 access*가 *Configuration TLP*로 안 되면 *ECAM이 활성 안 됨* — *legacy CF8/CFC*만 동작.

### "Vendor ID 0xFFFF면 device 없음"

*Vendor ID 0xFFFF는 "device 없음" 표시*. 일부 *broken device*가 *0xFFFF 반환*해서 enumeration이 *device 미존재로 인식*. 데이터시트로 *vendor ID 확인 필수*.

### "PCIe Cap이 곧 PCIe device 인증"

PCIe Capability ID 0x10은 *해당 device가 PCIe임을 명시*. 다만 *없어도 PCIe device가 있음* — 일부 *legacy compatible* device. *BIOS·UEFI가 ECAM 매핑*하면 *물리적 PCIe slot*임은 거의 확실.

### "Capability chain은 짧다"

복잡한 device(NIC·NVMe)는 *Cap 5~10개 + Extended Cap 10~20개*. NIC 같은 경우 *MSI·MSI-X·SR-IOV·ARI·ATS·PASID·PRI·AER·DPC·LTR·DOE·IDE* 모두 가질 수 있음.

### "ECAM이 동작하면 모든 device 보임"

ECAM은 *UEFI·ACPI MCFG에 등록된 영역*만 매핑. *secondary domain·virtio*는 *별도 controller*. `lspci -D`로 *domain·bus 분리* 확인.

## 정리

- Configuration Space는 *4 KB* — 256 byte PCI + 3840 byte PCIe Extended.
- *Type 0 (EP)·Type 1 (Bridge)* 두 헤더 형식. *Type 1*에 *bus routing 정보*.
- *Capabilities Pointer (0x34)*가 *capability linked list* 시작. *PM·MSI·PCIe Cap·MSI-X* 등 chain.
- *Extended Capability* (0x100~)에 *AER·SR-IOV·DPC·ATS·PASID·DOE·IDE* 등 PCIe 3.0+ 기능.
- *DVSEC*은 *vendor 확장 영역* — CXL이 *자기 식별에 사용*.
- *ECAM*이 *4 KB Configuration*을 *MMIO로 매핑*. UEFI MCFG에 등록.
- *Type 1 → Type 0 변환*이 *enumeration의 핵심* — bridge가 *secondary/subordinate*로 라우팅.
- *LTR*이 *EP의 latency tolerance*를 RC에 알림 — power state 결정.

## 다음 편

[Ch 4: BAR & MMIO — 자원의 호스트 주소 공간 매핑](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 *device 자원을 host address space에 매핑*하는 *BAR의 size 결정·prefetchable·ReBAR* 등을 분해합니다.

## 관련 항목

- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — Configuration TLP의 routing
- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio)
- [Ch 18: Register Maps](/blog/embedded/hardware/pcie/chapter18-register-maps) — 비트별 reference
- [CXL Internals Ch 6: CXL.io·DVSEC](/blog/embedded/hardware/cxl/chapter06-cxl-io)

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
