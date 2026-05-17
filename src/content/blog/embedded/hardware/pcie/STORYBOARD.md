---
title: "PCIe Deep Dive — Storyboard"
date: 2026-10-01T00:00:00
description: "PCIe 시리즈 설계 문서 — 챕터별 깊이·다이어그램·코드·레퍼런스 계획"
tags: [PCIe, storyboard, internal]
draft: true
---

# PCIe Deep Dive — Storyboard

## 시리즈 목표

현재 16개 챕터가 헤더만 있는 스텁 상태 → **18개 챕터로 확장** (가상화 깊이를 위해 Ch 12·13·14 분리).
본 스토리보드는 각 챕터를 다음 기준으로 채운다.

- **분량**: 챕터당 500~900줄 (가상화 챕터는 더 큼, 정보 밀도 높음)
- **시기 기준 (2026-05)**: PCIe **6.1** 정착, PCIe **7.0** spec 1.0 발표 (2025 말), CXL **3.1/3.2**, UCIe **2.0**, IOMMUFD (kernel 6.6+) 도입, PCIe **IDE/TDISP** (2022 ECN) confidential I/O 상용 시작
- **깊이 기준**: PCI-SIG Base spec 인용, 실제 root complex/switch/endpoint 동작, 리눅스 PCI/VFIO/IOMMUFD subsystem 코드, lspci/setpci 활용
- **시각 자료**: 챕터당 3~6개의 TikZ 다이어그램
- **레퍼런스**: PCIe Base 6.1/7.0 spec, CXL 3.1, UCIe 2.0, Intel TDX/AMD SEV-TIO whitepaper, Linux `drivers/pci/`, `drivers/iommufd/`, `drivers/vfio/`

## 챕터별 스토리보드

### Ch 1: 기초 — Topology, Layers, Generations

**의도**: PCIe 스택 전체 개념 + *2026 기준* 인접 표준(CXL/UCIe) 위치 잡기.

- ✦ PCI vs PCI-X vs PCIe 비교 (parallel bus → point-to-point serial)
- ✦ Root Complex / Switch / Endpoint / Bridge — 토폴로지
- ✦ 3-Layer 모델 — Transaction / Data Link / Physical
- ✦ Lane / Link / Symbol — 1×, 4×, 8×, 16× 의미
- ✦ Generations — Gen1 2.5GT/s ~ Gen6 64GT/s ~ **Gen7 128GT/s (2025 spec)**
- ✦ 8b/10b vs 128b/130b vs **PAM4 (Gen6+)** encoding
- ✦ **FLIT mode (Gen6+)** — 256B fixed-size unit, error correction 단위 변화
- ✦ **CXL on PCIe** — 같은 PHY, alternate protocol negotiation (CXL.io/.cache/.mem)
- ✦ **UCIe (Universal Chiplet Interconnect)** — chiplet 시대, PCIe protocol over die-to-die
- ◦ Form factors — CEM / SFF-8639 (U.2/U.3) / EDSFF / M.2 / OCP NIC 3.0

**다이어그램** (6)
1. PCI parallel vs PCIe point-to-point
2. Root Complex topology — RC, switch, endpoints
3. 3-layer stack (TL/DLL/PHY)
4. Lane bonding (×1/×4/×16)
5. Generation throughput table (Gen1~Gen7, NRZ vs PAM4 표시)
6. **PCIe / CXL / UCIe 위치 관계** — 같은 PHY 위 다른 protocol stack

**코드**: `lspci -t`, `lspci -vv` 출력 해석, `lspci -vv | grep "LnkSta"` (PAM4 indicator)
**레퍼런스**: PCIe Base 6.1 §1, PCIe 7.0 draft §1, CXL 3.1 §1, UCIe 1.1/2.0 overview

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

**의도**: 신뢰성 보장 계층. TLP를 손실 없이. *Gen6+ FLIT mode 도입으로 큰 변화*.

- ✦ DLLP 종류 — ACK / NAK / FC (Flow Control) / PM / Vendor
- ✦ ACK/NAK 프로토콜 — TLP sequence number, replay buffer
- ✦ Replay Timer — 미수신 ACK 시 재전송
- ✦ Credit-Based Flow Control — Posted / Non-Posted / Completion
- ✦ FC Init (FC_INIT1, FC_INIT2) — 링크 활성화 시
- ✦ Update FC interval
- ✦ CRC-16 (LCRC) for TLP/DLLP
- ✦ **FLIT mode (Gen6+)** — 256B FLIT 단위 transmission, FEC + CRC 통합
- ✦ **FLIT 기반 retry** — 기존 TLP 단위 → FLIT 단위 ACK
- ◦ DLL state machine
- ◦ Gen7 변경점 (Gen6 FLIT 위 PAM4 + 128 GT/s)

**다이어그램** (5)
1. DLLP 구조 + 종류
2. TLP send + ACK 흐름 (정상, NRZ mode)
3. NAK + replay 흐름
4. Flow Control credit 갱신 다이어그램
5. **FLIT mode 비교** — 가변 길이 TLP + LCRC → 256B fixed FLIT + FEC

**코드**: `setpci` DLLP counters, kernel link replay counter, `lspci -vv | grep "LnkSta2"` (FLIT mode 표시)
**레퍼런스**: PCIe Base 6.1 §3 Data Link Layer, PCIe 6.0 FLIT mode ECN

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

**의도**: PCIe 디바이스가 메모리에 직접 접근하는 메커니즘 — *호스트* 측.

- ✦ DMA Direction — bidirectional / to_device / from_device
- ✦ Coherent DMA buffer (dma_alloc_coherent) — 작은 영역, 영구
- ✦ Streaming DMA (dma_map_single/sg) — 큰 영역, 일회성
- ✦ IOMMU (Intel VT-d, AMD-Vi, ARM SMMU) — IOVA → PA translation
- ✦ IOMMU groups — RID grouping, ACS 영향
- ✦ ATS / PRI / PASID — SVM (Shared Virtual Memory)
- ✦ Cache coherency 처리 — invalidate/flush
- ✦ swiotlb (bounce buffer)
- ✦ **IOMMUFD subsystem (kernel 6.6+, 2023)** — 차세대 userspace IOMMU API, legacy `vfio container` 대체
- ✦ IOMMUFD 핵심 객체 — ioas / hwpt / device — VFIO에서 마이그레이션 진행 중
- ◦ DMA mask (32-bit vs 64-bit device)
- ◦ IOMMU page table 형식 (Intel VT-d 5-level, ARM SMMUv3 stage 1/2)

**다이어그램** (4)
1. CPU vs Device DMA 흐름
2. IOMMU 매핑 (IOVA → PA), page table walk
3. Coherent vs Streaming 사용 패턴
4. SVM / PASID — process VA == device VA

**코드**: `dma_alloc_coherent`, `dma_map_sg`, `iommu_map`, `/sys/kernel/iommu_groups/`
**레퍼런스**: kernel.org dma-api docs, VT-d spec, AMD IOMMU spec, ARM SMMUv3

> *이 챕터는 호스트 IOMMU에 집중. Guest 측 vIOMMU와 가상화 통합은 Ch 13에서.*

---

### Ch 12: PCIe Virtualization I — Pass-through, SR-IOV, VFIO

**의도**: 단일 물리 디바이스를 다수 가상 머신/컨테이너가 공유하는 *하드웨어 레벨* 가상화.

**SR-IOV (Single Root I/O Virtualization)**
- ✦ PF (Physical Function) / VF (Virtual Function) — 펌웨어가 정의
- ✦ SR-IOV Extended Capability (offset 0x0010) 레지스터 맵
- ✦ VF BAR — `VF BAR0`이 stride로 N개 VF에 매핑
- ✦ NumVFs 설정 — `sriov_numvfs` sysfs
- ✦ VF Driver 모델 — VF는 PF와 독립 driver 가능
- ✦ SR-IOV 한계 — 정적 partition, NumVFs는 펌웨어 fix
- ◦ MR-IOV (Multi-Root) — 사실상 deprecated, 언급만

**VFIO (Virtual Function I/O)**
- ✦ VFIO 아키텍처 — `vfio-pci` driver + container + group + device
- ✦ IOMMU groups → VFIO group 매핑 — ACS 분리 의존
- ✦ Container = address space, group = isolation, device = endpoint
- ✦ Userspace driver pattern — DPDK, SPDK가 활용
- ✦ vfio_pci_core (kernel 5.14+) — variant driver 지원
- ✦ Mediated Devices (`mdev`) — soft partition, NVIDIA vGPU
- ✦ **VFIO → IOMMUFD migration (kernel 6.6+)** — `vfio_compat` shim, 새 코드는 iommufd 권장
- ✦ **`/dev/iommu` + `/dev/vfio/devices/vfioN`** — file descriptor 모델 변화
- ◦ VFIO-User (out-of-process) — SPDK
- ◦ `noiommu` mode (위험)

**Pass-through**
- ✦ QEMU/KVM pass-through 흐름 — guest BIOS → PCI enum → VF driver
- ✦ ACS (Access Control Services) — same-group cross-DMA 차단
- ✦ Reset modes — FLR, secondary bus reset, hot reset

**다이어그램** (5)
1. SR-IOV PF/VF 트리 + VF BAR stride 매핑
2. SR-IOV Extended Capability 레지스터 layout (offset by offset)
3. VFIO 4계층 — container ↔ group ↔ device ↔ IOMMU
4. vfio-pci → QEMU → guest VM full path
5. IOMMU group과 ACS — 같은 group의 cross-DMA 차단 원리

**코드**:
- `echo 1 > /sys/bus/pci/devices/.../sriov_numvfs`
- `vfio-pci` binding, `/dev/vfio/N`
- QEMU `-device vfio-pci,host=01:00.0`
- DPDK/SPDK userspace driver 예시

**레퍼런스**:
- SR-IOV Specification (PCI-SIG)
- kernel.org `Documentation/PCI/pci-iov-howto.rst`
- kernel.org `Documentation/driver-api/vfio.rst`
- LWN: "An introduction to SR-IOV" (Mauro Carvalho Chehab)
- DPDK Programmer's Guide §13 VFIO

**코드 경로**: `drivers/pci/iov.c`, `drivers/vfio/pci/vfio_pci.c`

---

### Ch 13: PCIe Virtualization II — vIOMMU, Scalable IOV, VirtIO-PCI, Confidential I/O

**의도**: *Guest 측* 가상화 + *동적 partition* (S-IOV) + *반가상화* (VirtIO) + *기밀 I/O* (IDE/TDISP) — pass-through의 한계를 해결하는 *차세대* 기술 묶음.

**vIOMMU (Guest IOMMU)**
- ✦ 왜 필요한가 — guest 안에서도 nested IOMMU, guest userspace pass-through, kernel bypass
- ✦ Emulated vIOMMU (QEMU intel-iommu, virtio-iommu) — 느림
- ✦ Hardware-assisted vIOMMU — VT-d nested translation, ARM SMMUv3 nested stages
- ✦ 2-stage translation — Stage 1 (guest IOVA → guest PA), Stage 2 (guest PA → host PA)
- ✦ virtio-iommu (paravirtualized) — guest driver가 hypervisor와 협력
- ◦ AMD IOMMU v2 guest translation

**Scalable IOV (Intel S-IOV)**
- ✦ SR-IOV vs S-IOV — *VF (펌웨어 분할) vs ADI (소프트웨어 분할)*
- ✦ ADI (Assignable Device Interface) — Mediated VFIO 기반
- ✦ S-IOV의 핵심 차이 — VF 수 제약 없음, dynamic resize, lighter HW
- ✦ Intel IDXD (Data Streaming Accelerator) — S-IOV 첫 상용 사례
- ✦ kernel `drivers/dma/idxd/` — work queue 기반 ADI
- ✦ S-IOV에 필요한 PASID — process address space 식별
- ◦ Composition with vIOMMU

**VirtIO-PCI**
- ✦ Paravirtualization 개념 — guest가 자기 가상화됨 알고 협력
- ✦ VirtIO 1.x spec — modern VirtIO PCI device
- ✦ VirtIO PCI configuration layout — capability 기반 (Common / Notify / ISR / Device / PCI)
- ✦ virtqueue — descriptor ring, available ring, used ring
- ✦ Packed virtqueue (1.1+) — 단일 ring, cache-friendly
- ✦ VirtIO-net, VirtIO-blk, VirtIO-scsi 흐름
- ✦ vDPA (Virtio Data Path Acceleration) — VirtIO control + hardware data path
- ◦ VirtIO-iommu, VirtIO-fs, VirtIO-gpu 간단 언급

**Live Migration**
- ✦ Pass-through 디바이스의 live migration 문제
- ✦ Dirty page tracking (PRI 활용)
- ✦ vDPA·virtio가 live migration에 유리한 이유
- ◦ Pre-copy / post-copy 기법

**Confidential I/O (PCIe IDE + TDISP)** — *2026 신규 영역*
- ✦ 동기 — confidential VM(TDX/SEV-SNP/CCA)이 pass-through 디바이스를 *신뢰*하려면?
- ✦ **PCIe IDE (Integrity & Data Encryption, 2022 ECN)** — link 레벨 AES-GCM 암호화 + 무결성
- ✦ **TDISP (TEE Device Interface Security Protocol)** — guest TEE ↔ 디바이스 attestation·세션
- ✦ **CMA-SPDM** — 디바이스 measurement·attestation 프로토콜
- ✦ Intel TDX-IO, AMD SEV-TIO, ARM CCA + RMM device assignment
- ✦ NVIDIA H100 Confidential Computing (CC mode) — 첫 상용 사례
- ◦ Selective IDE vs Link IDE
- ◦ Stream cipher key 관리, IDE_KM 매니지먼트

**다이어그램** (6)
1. SR-IOV vs Scalable IOV 비교 — 펌웨어 분할 vs ADI 동적
2. vIOMMU 2-stage translation (guest IOVA → guest PA → host PA)
3. VirtIO-PCI capability layout + virtqueue 구조
4. vDPA 아키텍처 — control: VirtIO, data path: HW
5. Live migration of pass-through device — dirty tracking 흐름
6. **TDISP 세션 수립** — guest TEE ↔ TPM/PSP ↔ device (SPDM exchange + IDE setup)

**코드**:
- `echo "Scalable" > /sys/bus/pci/devices/.../sriov_drivers_autoprobe` (예)
- IDXD `accel-config` 도구 — work queue 구성
- QEMU `-device virtio-net-pci,...` + vhost-net
- vhost-vdpa 디바이스 binding

**레퍼런스**:
- Intel Scalable I/O Virtualization Technical Specification
- VirtIO 1.2 Specification (OASIS)
- VirtIO-iommu device specification
- Linux Plumbers Conf — "Scalable IOV / IDXD" sessions
- LWN: "Scalable I/O virtualization", "vDPA: an alternative to pass-through"
- KVM Forum talks on vIOMMU
- DPDK vDPA Programmer's Guide

**코드 경로**: `drivers/dma/idxd/`, `drivers/vhost/vdpa.c`, `drivers/iommu/virtio-iommu.c`, `drivers/virtio/`

---

### Ch 14: 리눅스 PCI 운영 — Hot-plug, AER recovery, DPC

**의도**: 운영 환경에서 자주 만나는 고급 기능 — Ch 12·13 가상화에서 빠진 *운영 측* 주제.

- ✦ Hot-plug — surprise vs orderly, `pciehp` 드라이버
- ✦ Slot Capabilities / Slot Status / Slot Control
- ✦ Native PCIe Hot-plug vs ACPI-based
- ✦ AER 운영 통합 — recovery callback (`error_detected`, `link_reset`, `slot_reset`, `resume`)
- ✦ DPC (Downstream Port Containment) integration — link 차단 후 recovery
- ✦ ARI (Alternative Routing-ID Interpretation) — 256+ functions per device
- ✦ EEH (Enhanced Error Handling) — POWER 아키텍처
- ◦ Surprise removal 시 driver detach 흐름
- ◦ Hotplug + SR-IOV — VF가 살아있을 때 PF 제거?

**다이어그램** (4)
1. Hot-plug 시퀀스 (button press → slot ctrl → link down → device remove)
2. AER recovery callback state machine (detected → reset → resume)
3. DPC trigger + recovery flow
4. ARI 통한 256 functions 표현 (8-bit function vs ARI bus extension)

**코드**: pciehp sysfs, `aer-inject`, `dpcgo`, `setpci` slot ctrl
**레퍼런스**: PCIe Base 6.0 §6.7 (Hot-plug), AER ECN, kernel `Documentation/PCI/pcieaer-howto.rst`

**코드 경로**: `drivers/pci/hotplug/pciehp_*.c`, `drivers/pci/pcie/aer.c`, `drivers/pci/pcie/dpc.c`

---

### Ch 15: 도구 — lspci / setpci / pcimem / vfio

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

### Ch 16: 트러블슈팅 — 시나리오북

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

### Ch 17: 성능 — Bandwidth / Latency / Tuning

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

### Ch 18: 레지스터·자료구조 맵

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
| 11 linux-dma + iommu | 750 | 4 |
| 12 virtualization-i (sriov, vfio) | 850 | 5 |
| 13 virtualization-ii (viommu, s-iov, virtio-pci) | 900 | 5 |
| 14 linux-ops (hot-plug, aer, dpc) | 600 | 4 |
| 15 tools | 500 | 2 |
| 16 troubleshooting | 700 | 4 |
| 17 performance | 600 | 4 |
| 18 register-maps | 500 | 4 |
| **합계** | **~11650줄** | **76** |

## 레퍼런스

### PCI-SIG 표준 (1차)

| 문서 | 발표 | 활용 챕터 |
|------|------|-----------|
| PCI Express Base Specification 6.1 (2023) | 2023 | 전 챕터 — *현재 기준* |
| PCI Express Base Specification 7.0 (1.0, 2025 말) | 2025 | 1, 8, 9 — 128 GT/s, PAM4 정착 |
| PCI Express CEM Specification | — | 1 (form factor) |
| PCI Express Mini CEM, M.2 spec | — | 1 |
| PCI-SIG ECNs — Resizable BAR, DPC, FLR | — | 4, 7, 14 |
| PCI Local Bus Specification 3.0 | legacy | 3, 5 |
| SR-IOV Specification | — | 12 |
| ATS / PRI / PASID Specifications | — | 11, 12, 13 |
| ACS (Access Control Services) | — | 12, 16 |
| **PCIe IDE (Integrity & Data Encryption) ECN** | 2022 | 13 — confidential I/O 토대 |
| **TDISP (TEE Device Interface Security Protocol)** | 2022 | 13 — pass-through 신뢰 |
| **CMA-SPDM (Component Measurement & Authentication)** | 2022 | 13 — 디바이스 attestation |

PCI-SIG는 회원 가입 필요(유료). 공식 ECN과 PCI-SIG White Papers는 부분 공개.

### 인접 표준 (CXL / UCIe / etc.)

| 문서 | 발표 | 활용 챕터 |
|------|------|-----------|
| **CXL 3.1 Specification** (CXL Consortium) | 2023 | 1, 8 — PCIe 6.0 PHY 공유, memory pooling |
| **CXL 3.2 Specification** | 2024 | 1 — fabric, hot-plug 확장 |
| **UCIe 2.0** (Universal Chiplet Interconnect Express) | 2024 | 1 — chiplet 시대, PCIe ↔ 다이렉트 |
| **NVMe Base 2.0+** | 2021+ | 11, 15, 17 — PCIe 위 가장 큰 응용 |
| **SNIA NVMe over Fabrics** | — | 17 (참고) |

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
| AMD64 Architecture Vol 2 (AMD-Vi) | 11, 13 |
| ARM SMMU v3 Specification | 11, 13 |
| Synopsys DesignWare PCIe Controller databook | 1, 2, 9 |
| Mellanox/NVIDIA PCIe tuning guides | 17 |
| Intel VT-d (Virtualization Technology for Directed I/O) spec | 11, 12, 13 |
| **Intel Scalable I/O Virtualization Technical Specification** | 13 |
| **Intel TDX (Trust Domain Extensions) Spec + TDISP integration** | 13 |
| **AMD SEV-SNP + PCIe pass-through whitepaper** | 13 |
| **ARM CCA (Confidential Compute Architecture)** | 13 |
| **NVIDIA Confidential Computing on H100** | 13 |
| **VirtIO 1.2 Specification (OASIS)** | 13 |
| **VirtIO-iommu Device Specification** | 13 |

### 학술·콘퍼런스

- PCI-SIG DevCon 발표 (PCIe 6.0/7.0 미리보기, IDE/TDISP 도입)
- HotChips PCIe / CXL sessions
- FAST / SIGCOMM PCIe-related papers
- **Linux Plumbers Conference** PCI / IOMMU / VFIO / virtio tracks (특히 2023~ IOMMUFD 도입 토론)
- **KVM Forum** — vIOMMU, vDPA, confidential computing
- **OCP Global Summit** — CXL 적용 사례

### 리눅스 커널

| 경로 | 활용 |
|------|------|
| `drivers/pci/probe.c`, `bus.c` | 10 |
| `drivers/pci/pcie/aer.c` | 7, 14 |
| `drivers/pci/pcie/dpc.c` | 7, 14 |
| `drivers/pci/iov.c` (SR-IOV) | 12 |
| `drivers/pci/hotplug/pciehp_*.c` | 14 |
| `drivers/pci/msi/msi.c` | 5 |
| `drivers/iommu/` (Intel/AMD/ARM 백엔드) | 11 |
| **`drivers/iommufd/`** (kernel 6.6+) — 차세대 IOMMU userspace API | 11, 12, 13 |
| **`drivers/vfio/pci/`** + `vfio_pci_core` | 12 |
| **`drivers/dma/idxd/`** (Intel DSA — Scalable IOV 첫 사례) | 13 |
| **`drivers/vhost/vdpa.c`** — vDPA control path | 13 |
| **`drivers/iommu/virtio-iommu.c`** — paravirtualized IOMMU | 13 |
| `drivers/virtio/` (virtio_pci_modern.c) | 13 |
| `Documentation/PCI/` | 10–14 |
| `Documentation/userspace-api/iommufd.rst` | 11–13 |
| `include/uapi/linux/pci_regs.h` | 18 |

### 도구

- `pciutils` (lspci/setpci) — Ch 15
- `pcimem`, `pcimemspeed` — Ch 15, 17
- `aer-inject` (kernel module) — Ch 7, 14
- `dpcgo` (DPC test) — Ch 7, 14
- Hardware: Teledyne LeCroy/Keysight PCIe protocol analyzer — Ch 9, 16
- Open-source: `pcie-tlp-injector` (FPGA based)
- **`accel-config`** — Intel IDXD (S-IOV) work queue 설정 — Ch 13
- **`dpdk-devbind.py`** — VFIO binding helper — Ch 12
- **`virsh nodedev-detach`** — libvirt 디바이스 detach — Ch 12, 13

## 최신성·시점 정리 (2026-05 기준)

| 분야 | 현 상태 | 다음 변곡점 |
|------|---------|-------------|
| Base spec | PCIe 6.1 정착, **PCIe 7.0 spec 1.0** 발표 (2025 말, 128 GT/s, PAM4 유지) | Gen8 (~2030, 256 GT/s 예측) |
| FLIT mode | Gen6+ FLIT 정착, NRZ↔FLIT dual mode | Gen7에서 FLIT 단독 |
| 인접 표준 | CXL 3.1 정착, **CXL 3.2** (2024), **UCIe 2.0** (2024) | CXL 4.0, UCIe 3.0 |
| Linux IOMMU API | **IOMMUFD** (kernel 6.6+) 도입, VFIO compat | VFIO container 점진적 deprecation |
| 가상화 SoTA | SR-IOV 안정, **Scalable IOV** (Intel IDXD 위주) 상용, vDPA 확산 | S-IOV 더 많은 디바이스, **TDISP** 인증 시작 |
| Confidential I/O | **PCIe IDE** (2022 ECN), **TDISP** spec 안정, NVIDIA H100 CC 상용 | TDX-IO/SEV-TIO/CCA 보편화 (2026~) |
| 응용 | NVMe 2.0+, GPU compute (HBM3e), DPU/SmartNIC 확산 | CXL memory pooling 상용 |

## 작성 순서 권장

1. 스토리보드 사용자 검토
2. Ch 1 (개요) → Ch 2 (TLP) → Ch 3 (config) → Ch 4 (BAR) — 토대
3. Ch 5 (IRQ) → Ch 6 (PM) → Ch 7 (error) — 시스템 자원
4. Ch 8 (DLL) → Ch 9 (PHY) — 깊은 계층
5. Ch 10 → Ch 11 (DMA/IOMMU + IOMMUFD) — Linux 토대
6. Ch 12 (SR-IOV/VFIO) → Ch 13 (vIOMMU/S-IOV/VirtIO/IDE/TDISP) — *가상화 메인 작전*
7. Ch 14 (Hot-plug/AER 운영) — 운영
8. Ch 15~18 — 도구 / 트러블슈팅 / 성능 / 참조

## 검증

- 챕터 1편 작성 후 사용자 검토 → OK면 다음.
- 다이어그램 `scripts/detect-text-overlap.py`로 overlap 검증.
- 최신성 점검: PCIe 7.0 spec 정식 공개 시 / IOMMUFD가 VFIO container 완전 대체 시 / TDISP 상용 디바이스 출현 시 → 챕터 13 refresh.
