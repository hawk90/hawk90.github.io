---
title: "Ch 4: BAR & MMIO — Device 자원의 호스트 주소 매핑"
date: 2026-05-19T09:04:00
description: "Base Address Register — Memory·I/O·64-bit·Prefetchable·size 결정·ReBAR·SR-IOV VF BAR."
series: "PCIe Deep Dive"
seriesOrder: 4
tags: [pcie, bar, mmio, rebar, sr-iov]
draft: false
---

## 한 줄 요약

> **"BAR은 *device가 host address space에 자기 자원을 광고*하는 register입니다."** — Type 0 header에 *6개 BAR 슬롯*이 있고, *Memory (32/64-bit, prefetchable 여부)·I/O*의 4 종류. *Size는 BAR에 all-1s 쓰고 읽어 mask로 결정*. *ReBAR*는 *64 GB BAR*까지 협상 가능. *SR-IOV VF BAR*는 *stride로 여러 VF를 매핑*.

[Ch 3 Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)에서 *BAR 슬롯이 0x10~0x24 6개*임을 봤습니다. 이 장은 *BAR의 동작 원리·size negotiation·ReBAR·VF BAR*을 본격적으로 분해합니다.

## BAR — 4 종류

각 BAR는 *Bit 0~2*가 *type 표시*:

| Type | bit 0 | bit 1~2 | 추가 비트 | 사용 |
|------|-------|---------|----------|------|
| **Memory BAR 32-bit** | 0 | 00 | Prefetchable (bit 3) | MMIO 32-bit |
| **Memory BAR 64-bit** | 0 | 10 | Prefetchable (bit 3) | MMIO 64-bit, *BAR 2개 슬롯 사용* |
| **I/O BAR** | 1 | — | reserved | Legacy I/O space |
| **Reserved** | 0 | 01·11 | — | — |

*I/O BAR는 64 KB legacy I/O port*. 현대 device는 *거의 안 씀*. 대부분 *Memory BAR*만 사용.

## BAR Size 결정 — Probing

OS·BIOS는 *각 BAR의 size*를 *probing*으로 알아냅니다:

| 단계 | 동작 |
|------|------|
| 1 | BAR에 *원래 값* 읽어 저장 |
| 2 | BAR에 *all-1s (0xFFFFFFFF)* write |
| 3 | BAR 다시 read |
| 4 | 읽은 값에서 *type 비트 (0~2 또는 0~3) mask out* |
| 5 | *bitwise NOT + 1* → BAR size (power of 2) |
| 6 | 원래 값 *복원* |

예: BAR에 all-1s 쓰고 읽었더니 *0xFFF00000*. mask out 후 *NOT + 1 = 0x00100000 (1 MB)*. 즉 *이 BAR이 1 MB 자원*임.

*device가 "내 BAR은 N byte"라고 광고*하는 메커니즘. host가 *그 size만큼 address range를 할당*.

## 64-bit BAR

*64-bit Memory BAR*는 *2개 BAR 슬롯 사용*:

| 슬롯 | 의미 |
|------|------|
| BAR N | 하위 32-bit + type 비트 |
| BAR N+1 | 상위 32-bit |

BAR0·BAR1가 *하나의 64-bit BAR*이면 BAR2·BAR3·BAR4·BAR5만 *남은 4 슬롯*. *GPU·NPU 같은 대용량 device*는 *64-bit BAR 필수* — *4 GB 이상 자원*은 *32-bit BAR 표현 불가*.

## Prefetchable

*Prefetchable bit (Memory BAR의 bit 3)*가 *2가지 의미*:

| 비트 | 의미 |
|------|------|
| 1 | RC가 *speculative prefetch 가능*. side-effect 없음 보장 |
| 0 | *side-effect 있음* — register 매번 정확한 transaction 필요 |

*GPU VRAM·RAM 영역*은 *prefetchable*. *MMIO control register*는 *non-prefetchable*. *prefetchable만이 64-bit BAR 가능* — *32-bit 주소 공간 위로 매핑*하려면 *speculative 안전성* 보장이 필요해서.

## Resource Enumeration — BIOS·OS 역할

| 단계 | 행위 |
|------|------|
| 1 | UEFI/BIOS가 *enumeration* — 모든 BAR size probe·tentative address 할당 |
| 2 | RC·switch의 *MMIO window* 설정 |
| 3 | Linux PCI subsystem이 *재할당 시도* — `pci_assign_resource` |
| 4 | `/sys/bus/pci/devices/.../resource`에 *최종 할당된 BAR 정보* 노출 |
| 5 | Driver가 *MMIO mapping* — `pci_iomap()`·`ioremap()` |

*Resource conflict*가 흔한 문제. *BAR size > 사용 가능 MMIO window*면 *device 비활성화*. `dmesg | grep "BAR.*can't"`로 진단.

## Expansion ROM BAR

*offset 0x30 (Type 0)·0x38 (Type 1)*에 *Option ROM BAR*. *device boot ROM 자원*:

| 항목 | 의미 |
|------|------|
| bit 0 | ROM Enable (0이면 access 안 됨) |
| bit 1~10 | reserved |
| bit 11~31 | ROM base address |

NIC·GPU의 *legacy BIOS Option ROM*이 이 영역에 매핑. *UEFI Secure Boot*에서 *서명 검증*. *VGA Option ROM*이 *PC boot의 진입점*.

## Resizable BAR (ReBAR)

기존 BAR은 *device가 광고한 size 그대로 사용*. *ReBAR*는 *runtime에 BAR size 협상 가능*하게 함:

| 항목 | 의미 |
|------|------|
| Capability ID | 0x0023 (Extended Cap) |
| Sizes 지원 | 1 MB ~ 8 TB (40-bit 표현) |
| 협상 | BIOS·driver가 *device가 광고한 지원 size 중 선택* |

*GPU에 ReBAR enable*하면 *전체 VRAM (예: 24 GB) 을 BAR로 매핑*. 이전엔 *256 MB BAR*만 매핑되어 *partial copy*. ReBAR로 *zero-copy direct mapping* 가능 — *AMD SAM (Smart Access Memory)·NVIDIA Resizable BAR*이 이 기능.

*BIOS에서 ReBAR 활성화 + UEFI mode + 64-bit OS*가 *필수 조건*.

## SR-IOV VF BAR

*SR-IOV (ID 0x0010)*는 *Physical Function (PF)*이 *여러 Virtual Function (VF)*를 광고하는 메커니즘. *VF BAR*는 *별도 layout*:

| 필드 | 의미 |
|------|------|
| VF BAR0~5 | 각 VF가 가질 BAR 정의 (template) |
| VF Stride | 한 VF BAR이 *다음 VF로 얼마나 떨어진* offset |
| NumVFs | 활성 VF 수 (PF가 *런타임에 설정*) |
| First VF Offset | VF 번호 시작 offset |

*N개 VF 활성화*하면 *VF BAR N개가 stride로 매핑*. 예: VF BAR0 = 4 KB, stride = 4 KB, NumVFs = 8 → 32 KB MMIO range가 *8개 VF의 BAR로 mapping*.

*Driver는 PF + VF 별도*. Mellanox NIC·Intel 100 GbE 등이 *SR-IOV 채택*.

## BAR Mapping — Linux 측

`/sys/bus/pci/devices/<BDF>/resource` 파일의 *각 줄이 한 BAR*:

| 컬럼 | 의미 |
|------|------|
| start | BAR base physical address |
| end | last physical address |
| flags | type·prefetchable 등 |

`pci_iomap(pdev, bar_num, max_size)`이 *driver가 BAR에 ioremap 적용*. Returns *virtual address* — *kernel space에서 readl/writel로 access*.

```c
// Driver 예
ctrl_base = pci_iomap(pdev, 0, 4096);
writel(0x00000001, ctrl_base + REG_ENABLE);
```

## 자주 하는 실수

### "BAR Size = device 메모리 크기"

*BAR Size는 device가 광고한 자원 크기*이지 *실제 사용 용량*과 다를 수 있음. 일부 device는 *BAR 영역의 일부만 valid*. driver가 *layout 명확히 알고 access*.

### "Memory BAR면 prefetchable"

*Control register 영역*은 *non-prefetchable*. *RAM/VRAM 영역*은 *prefetchable*. *모든 Memory BAR가 prefetchable 아님*. *RC의 deeper power state 진입*에 영향.

### "ReBAR이 자동"

*BIOS·UEFI 설정·OS driver·UEFI mode + GOP·64-bit OS* 모두 필요. Windows·Linux 일부 driver는 *ReBAR 명시 활성화 안 하면 사용 안 함*. NVIDIA·AMD는 *Resizable BAR 설정 옵션*.

### "VF BAR이 단독 BAR"

*VF BAR은 PF의 SR-IOV Cap에 template*. *NumVFs 설정 안 하면 매핑 안 됨*. *VF는 별도 BDF·별도 driver*지만 *BAR은 stride로 PF가 통제*.

### "BAR 6개면 충분"

*64-bit BAR*은 *2 슬롯 사용*. *4 GB 이상 자원이 3개*면 BAR 6개 다 사용. *복잡 device*는 *내부 mailbox·doorbell 영역 분리*로 BAR 다수 사용.

## 정리

- BAR은 *device가 host address space에 자원 광고*하는 register. *Type 0 header*에 *6 슬롯*.
- 4 종류: *Memory 32-bit·Memory 64-bit·I/O·reserved*. *I/O는 현대 거의 unused*.
- *Size는 all-1s 쓰고 read해서 mask로 결정*.
- *64-bit BAR은 2 슬롯 사용*. *prefetchable bit*가 *speculative 안전성* 보장.
- *Resource enumeration*은 *BIOS → Linux PCI subsystem*. `/sys/.../resource`로 확인.
- *Expansion ROM BAR*에 *device boot ROM* (Option ROM·UEFI GOP).
- *ReBAR*가 *runtime BAR size 협상* — *GPU 전체 VRAM 매핑* (AMD SAM, NVIDIA RBAR).
- *SR-IOV VF BAR*은 *stride로 다수 VF에 매핑*.

## 다음 편

[Ch 5: Interrupts — INTx·MSI·MSI-X](/blog/embedded/hardware/pcie/chapter05-interrupts)에서 *PCIe 인터럽트 전송 메커니즘 3가지*와 *per-vector masking·APIC redirection*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — pci_iomap·driver matching
- [Ch 12: Virtualization I — SR-IOV·VFIO](/blog/embedded/hardware/pcie/chapter12-virtualization-1)

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
