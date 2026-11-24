---
title: "Ch 5: Interrupts — INTx·MSI·MSI-X·Interrupt Remapping"
slug: "embedded/hardware/pcie/chapter05-interrupts"
date: 2026-05-19T09:05:00
description: "PCIe 인터럽트 메커니즘 3가지 — Legacy INTx·MSI 32 vector·MSI-X 2048 vector·IOMMU Interrupt Remapping."
series: "PCIe Deep Dive"
seriesOrder: 5
tags: [pcie, interrupts, msi, msi-x, intx, interrupt-remapping]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"PCIe 장치의 인터럽트는 결국 '어느 주소에 어떤 값을 쓰는가'입니다."** INTx는 PCI의 공유 인터럽트 선을 흉내 낸 방식이고, MSI와 MSI-X는 장치가 인터럽트 컨트롤러의 doorbell 주소에 메모리 쓰기를 하는 방식입니다. MSI는 최대 32개를 연속으로, MSI-X는 BAR 안의 table로 최대 2048개를 각자 따로 잡습니다. IOMMU가 있으면 그 doorbell 주소마저 IOVA로 바뀝니다.

[Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 BAR 배치를 봤습니다. MSI-X table은 그 BAR 안에 있습니다. 이 장은 시리즈 VM(QEMU 11.1.3 virt + SMMUv3, Debian 13, 커널 6.12.116)에서 실제 MSI-X table을 읽고, 인터럽트가 어느 CPU에 떨어지는지 확인합니다.

## 이 VM의 인터럽트 컨트롤러

QEMU 11.1.3 `finalize_msi_controller()`(`hw/arm/virt.c:2765-2777`)는 GICv2·WHPX·in-kernel irqchip을 쓰는 HVF일 때 GICv2m을, 그 밖의 GICv3 구성에서는 ITS를 MSI 컨트롤러로 고릅니다. 이 VM은 `-accel hvf`라서 GICv2m frame이 MSI를 받습니다. 부팅 로그입니다.

```text
GICv2m: ACPI overriding V2M MSI_TYPER (base:80, num:64)
GICv2m: range[mem 0x08020000-0x08020fff], SPI[80:143]
```

MSI 전용 SPI가 80~143, 모두 64개입니다. `/proc/interrupts`의 chip 이름이 `GICv2m-PCI-MSIX-0000:01:00.0`이면 그 장치의 MSI-X, `GICv3 36 Level`이면 GIC에 직접 연결된 선 인터럽트입니다. x86의 IO-APIC·LAPIC 경로와는 장치가 다르지만, 장치가 doorbell에 쓴다는 구조는 같습니다.

## INTx — Legacy Virtual Wire

PCI는 장치마다 INTA~INTD 핀을 두고 여러 장치가 한 선을 나눠 썼습니다. PCIe에는 그 선이 없어서, 같은 모델을 메시지로 흉내 냅니다. 시리즈 VM에서 INTx로 동작하는 장치가 하나 있습니다. root bus의 virtio-net(00:01.0)은 MSI-X Capability가 없어 INTx를 씁니다.

```text
 50:       1045          0          0          0     GICv3  36 Level     virtio0
	Control: I/O+ Mem+ BusMaster+ SpecCycle- MemWINV- VGASnoop- ParErr- Stepping- SERR- FastB2B- DisINTx-
	Interrupt: pin A routed to IRQ 50
```

(`/proc/interrupts`와 `lspci -s 00:01.0 -vv` 발췌.) `Level`은 level-triggered라는 뜻이고, `DisINTx-`는 Command 레지스터의 INTx Disable 비트가 꺼져 INTx를 내보낼 수 있다는 뜻입니다. `lspci -vv`에서 INTx가 IRQ 50으로 라우팅된 function은 셋입니다(00:01.0, 00:05.0, 03:00.0). 다만 00:05.0과 03:00.0은 MSI-X를 쓰므로, 지금 이 선에 handler를 단 것은 `virtio0` 하나입니다. 여러 function이 INTx를 실제로 쓰면 한 선을 나눠 쓰게 되고, 그때는 인터럽트가 왔을 때 handler가 자기 장치의 상태를 읽어 자기 것인지 확인해야 합니다. 아파트 공동 현관 초인종처럼 누가 눌렀는지는 각 집이 인터폰 화면을 봐야 아는 구조입니다.

## MSI — Message Signaled Interrupt

MSI Capability(ID 0x05)는 Message Address와 Message Data를 담고, 장치는 인터럽트를 낼 때 그 주소에 그 값을 씁니다. Linux v6.12 `pci_regs.h:309-315`의 Message Control 필드입니다.

| 필드 | 정의 | 뜻 |
|------|------|------|
| Multiple Message Capable | `PCI_MSI_FLAGS_QMASK` 0x000e | 장치가 원하는 vector 수 (2의 거듭제곱 인코딩) |
| Multiple Message Enable | `PCI_MSI_FLAGS_QSIZE` 0x0070 | 실제로 허락된 vector 수 |
| 64-bit | `PCI_MSI_FLAGS_64BIT` 0x0080 | Message Address 상위 32비트 존재 |
| Per-vector masking | `PCI_MSI_FLAGS_MASKBIT` 0x0100 | Mask·Pending 레지스터 존재 |

[Linux v6.12 MSI HOWTO](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/msi-howto.rst)(120-127행)는 MSI가 최대 32개, 2의 거듭제곱 개수로 제한되고 vector를 연속으로 할당해야 해서 MSI-X만큼 많이 받지 못할 수 있다고 적습니다. 일부 플랫폼에서는 MSI vector가 모두 같은 CPU 집합을 향해야 한다는 제약도 같은 단락에 있습니다.

per-vector mask는 선택 기능입니다. 시리즈 VM에서 두 NIC가 서로 다릅니다.

```text
== 02:00.0
	Capabilities: [d0] MSI: Enable- Count=1/1 Maskable- 64bit+
		Address: 0000000000000000  Data: 0000
== 03:00.0
	Capabilities: [50] MSI: Enable- Count=1/1 Maskable+ 64bit+
		Address: 0000000000000000  Data: 0000
		Masking: 00000000  Pending: 00000000
```

igb(03:00.0)는 `Maskable+`라서 Mask·Pending 레지스터가 보이고, e1000e(02:00.0)는 없습니다. 둘 다 MSI-X를 쓰므로 MSI는 `Enable-`입니다.

## MSI-X — Per-vector Independent

MSI-X Capability(ID 0x11)는 vector마다 주소·데이터·mask를 따로 가진 table을 BAR 안에 둡니다. `pci_regs.h:325-343`의 정의입니다.

| 항목 | 정의 |
|------|------|
| Table Size | `PCI_MSIX_FLAGS_QSIZE` 0x07FF, N-1 인코딩이라 최대 2048 |
| Function Mask / Enable | `PCI_MSIX_FLAGS_MASKALL` 0x4000 / `PCI_MSIX_FLAGS_ENABLE` 0x8000 |
| Table·PBA 위치 | `PCI_MSIX_TABLE_BIR` 하위 3비트가 BAR 번호, 나머지가 offset |
| Entry 크기 | `PCI_MSIX_ENTRY_SIZE` 16 |

시리즈 VM 장치들의 table 위치입니다.

| 장치 | Count | Table | PBA |
|------|------|------|------|
| 01:00.0 NVMe | 65 | BAR0 + 0x2000 | BAR0 + 0x3000 |
| 02:00.0 e1000e | 5 | BAR3 + 0x0 | BAR3 + 0x2000 |
| 03:00.0 igb | 10 | BAR3 + 0x0 | BAR3 + 0x2000 |
| 07:00.0 virtio-net | 4 | BAR1 + 0x0 | BAR1 + 0x800 |
| 00:03.0 root port | 1 | BAR0 + 0x0 | BAR0 + 0x800 |

NVMe는 레지스터와 table이 같은 BAR0에, e1000e·igb는 MSI-X 전용 BAR3에 둡니다. 어느 쪽이든 table은 BAR 주소 공간의 일부라서 config space가 아니라 MMIO로 읽습니다.

## MSI-X Table Entry — 실제로 읽어 보기

NVMe BAR0은 0x10000000이고 table은 0x2000에 있습니다. QEMU monitor `xp`로 게스트 물리 주소 0x10002000부터 읽었습니다.

```text
(qemu) xp /24wx 0x10002000
10002000: 0xfffff040 0x00000000 0x0000005f 0x00000000
10002010: 0xfffff040 0x00000000 0x00000060 0x00000000
10002020: 0xfffff040 0x00000000 0x00000061 0x00000000
10002030: 0xfffff040 0x00000000 0x00000062 0x00000000
10002040: 0xfffff040 0x00000000 0x00000063 0x00000000
10002050: 0x00000000 0x00000000 0x00000000 0x00000001
```

한 줄이 한 entry이고, `pci_regs.h:339-343`대로 Lower Address(+0), Upper Address(+4), Data(+8), Vector Control(+0xc)입니다. 앞 다섯 entry가 쓰이고 있고, 여섯째 entry는 Vector Control bit 0(`PCI_MSIX_ENTRY_CTRL_MASKBIT`)이 1인 masked 상태입니다.

Data 0x5f~0x63(95~99)은 GICv2m의 SPI 범위 80~143 안의 번호입니다. Linux v6.12 `gicv2m_compose_msi_msg()`(`drivers/irqchip/irq-gic-v2m.c:84-100`)가 `msg->data = data->hwirq`로 넣는 값입니다. 주소는 조금 다릅니다. 같은 함수가 처음 만드는 주소는 frame 물리 주소 0x08020000에 `V2M_MSI_SETSPI_NS`(0x040)를 더한 0x08020040인데, table에는 0xfffff040이 들어 있습니다. 함수 마지막 줄의 `iommu_dma_compose_msi_msg()`(`drivers/iommu/dma-iommu.c:1843-`)가 장치에 IOMMU domain이 있으면 주소의 page 부분을 IOVA로 바꾸기 때문입니다. 그 IOVA는 `iommu_dma_get_msi_page()`(1765-1800행)가 doorbell page를 SMMU page table에 `IOMMU_WRITE | IOMMU_NOEXEC | IOMMU_MMIO`로 매핑하며 할당합니다. 하위 0x040은 그대로 남습니다. 장치가 보기에는 doorbell도 IOMMU를 거치는 DMA 쓰기 대상입니다.

## Interrupt 흐름 — Device에서 ISR까지

위 table을 기준으로 NVMe 인터럽트 하나의 경로입니다.

| 단계 | 시리즈 VM에서의 실체 |
|------|------|
| 1 | NVMe가 completion을 쓰고 entry의 주소 0xfffff040에 data 0x61을 메모리 쓰기 |
| 2 | SMMUv3가 IOVA 0xfffff000 page를 GICv2m frame 0x08020000으로 변환 |
| 3 | 쓰인 data는 `gicv2m_compose_msi_msg()`가 넣은 hwirq(SPI 번호)이고, 주소는 `V2M_MSI_SETSPI_NS` 레지스터 |
| 4 | Linux가 hwirq를 Linux IRQ 번호(70~74)로 바꿔 등록된 handler를 affinity에 맞는 CPU에서 호출 (`/proc/interrupts` 카운트) |

## Linux PCI IRQ API

드라이버는 `pci_alloc_irq_vectors()` 계열로 vector를 받습니다. Linux v6.12 `pci_alloc_irq_vectors_affinity()`(`drivers/pci/msi/api.c:254-`)는 flag에 `PCI_IRQ_MSIX`가 있으면 MSI-X를 먼저, 실패하면 `PCI_IRQ_MSI`로 MSI를, 그래도 실패하면 `PCI_IRQ_INTX`가 있고 `min_vecs == 1`이며 장치에 INTx IRQ가 있을 때만 INTx를 씁니다(282-294행). flag 정의는 `include/linux/pci.h:1078-1081`이고, `PCI_IRQ_ALL_TYPES`는 세 가지를 모두 허락합니다.

NVMe 드라이버가 실제로 어떻게 부르는지가 좋은 예입니다. `nvme_setup_irqs()`(`drivers/nvme/host/pci.c:2255-2292`)는 `PCI_IRQ_ALL_TYPES | PCI_IRQ_AFFINITY`로 admin queue 1개와 polling이 아닌 I/O queue 수만큼을 요청합니다. I/O queue 상한은 `nvme_max_io_queues()`(2294-2303행)가 `num_possible_cpus()`에 write·poll queue 수를 더해 정하고, 두 모듈 파라미터의 기본값은 0입니다. 시리즈 VM은 CPU가 4개이므로 요청은 5개이고, 장치가 65개를 광고해도 실제로는 IRQ 70~74 다섯 개만 할당됐습니다.

```c
	unsigned int flags = PCI_IRQ_ALL_TYPES | PCI_IRQ_AFFINITY;
	...
	irq_queues = 1;
	if (!(dev->ctrl.quirks & NVME_QUIRK_SINGLE_VECTOR))
		irq_queues += (nr_io_queues - poll_queues);
	if (dev->ctrl.quirks & NVME_QUIRK_BROKEN_MSI)
		flags &= ~PCI_IRQ_MSI;
	return pci_alloc_irq_vectors_affinity(pdev, 1, irq_queues, flags,
					      &affd);
```

(`nvme_setup_irqs()` 발췌.) `NVME_QUIRK_BROKEN_MSI` 장치는 MSI를 빼고 MSI-X나 INTx만 허락합니다. quirk로 특정 방식만 막는 패턴입니다.

## CPU 분산 — IRQ Affinity

`PCI_IRQ_AFFINITY`를 주면 커널이 vector를 CPU에 나눠 고정합니다(managed affinity). 시리즈 VM의 NVMe 다섯 IRQ입니다.

```text
irq 70 hwirq=0 aff=0-3 eff=0 chip=GICv2m-PCI-MSIX-0000:01:00.0
irq 71 hwirq=1 aff=0 eff=0 chip=GICv2m-PCI-MSIX-0000:01:00.0
irq 72 hwirq=2 aff=1 eff=1 chip=GICv2m-PCI-MSIX-0000:01:00.0
irq 73 hwirq=3 aff=2 eff=2 chip=GICv2m-PCI-MSIX-0000:01:00.0
irq 74 hwirq=4 aff=3 eff=3 chip=GICv2m-PCI-MSIX-0000:01:00.0
```

`aff`는 `/proc/irq/N/smp_affinity_list`, `eff`는 `effective_affinity_list`입니다. admin queue(q0)는 `pre_vectors = 1`로 분산에서 빠져 모든 CPU를 허락받았고, I/O queue 넷은 CPU 0~3에 하나씩 고정됐습니다. 이 고정이 실제로 동작하는지 CPU 2에서만 읽기를 냈습니다.

```bash
taskset -c 2 dd if=/dev/nvme0n1 of=/dev/null bs=4k count=2000 iflag=direct
```

```text
 73:          0          0          0          0  GICv2m-PCI-MSIX-0000:01:00.0   3 Edge      nvme0q3
8192000 bytes (8.2 MB, 7.8 MiB) copied, 0.187326 s, 43.7 MB/s
 73:          0          0       2000          0  GICv2m-PCI-MSIX-0000:01:00.0   3 Edge      nvme0q3
```

4 KiB 읽기 2000번에 CPU 2 열의 nvme0q3이 정확히 2000 늘었고, 다른 queue는 변하지 않았습니다. 요청을 낸 CPU의 queue로 들어가고 그 queue의 완료 인터럽트가 같은 CPU로 돌아온 것입니다. 우체국 창구를 CPU마다 하나씩 두고, 접수한 창구에서 결과도 받는 구조입니다.

## Interrupt Remapping — IOMMU

위 MSI-X table의 0xfffff040은 doorbell page를 IOMMU에 매핑한 결과이지 interrupt remapping은 아닙니다. 그 page는 `IOMMU_WRITE | IOMMU_NOEXEC | IOMMU_MMIO`로 매핑되고, [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)의 QEMU SMMU trace에서 igb의 MSI 쓰기가 IOVA 0xfffff040에서 0x8020040으로 바뀌는 기록을 볼 수 있습니다. 하지만 장치가 같은 doorbell에 다른 SPI 번호를 써도 이 매핑은 막지 못합니다.

Linux v6.12 `msi_device_has_isolated_msi()`(`kernel/irq/msi.c:1697-1713`) 주석은 isolated MSI를 "장치에서 CPU까지의 경로에 있는 하드웨어가 MSI가 지정한 인터럽트 번호를 그 장치가 낼 권한이 있는지 검사하는 것"으로 정의하고, VFIO에서 일반 DMA 쓰기로 만든 가짜 MSI가 다른 보안 영역에 인터럽트를 거는 것을 막는 데 필요하다고 적습니다. 이 성질을 뜻하는 `IRQ_DOMAIN_FLAG_ISOLATED_MSI`는 Intel interrupt remapping(`drivers/iommu/intel/irq_remapping.c:572`), AMD IOMMU(`amd/iommu.c:3790`), GICv3 ITS(`irq-gic-v3-its.c:5392`)가 세우고, GICv2m 드라이버에는 없습니다. 그래서 이 VM에서는 [Ch 12](/blog/embedded/hardware/pcie/chapter12-virtualization-1)의 VFIO가 "No interrupt remapping support"로 장치 할당을 거절합니다.

x86에서는 위 flag를 세우는 Intel·AMD IOMMU 드라이버가 interrupt remapping을 맡습니다. 이 VM에서는 실행하지 않았고, Linux v6.12 문서로 확인한 범위만 적습니다. `kernel-parameters.txt:2291-2299`의 `intremap=`는 Intel IOMMU에서 기본값 `on`이고, `off`는 remapping을, `nosid`는 "Source ID checking"을 끕니다.

[Ch 10의 QEMU NVMe 실험](/blog/embedded/hardware/pcie/chapter10-linux-basics#qemu-nvme-한-대로-연결해서-확인하기)에서는 MSI-X `Count=65`인 장치에 Linux IRQ 세 개가 할당됐고, 16 KiB 쓰기·읽기 구간에서 `nvme0q1`의 count가 43에서 52로 증가했습니다. 이는 capability의 최대 개수·실제 할당·handler 동작이 서로 다른 관찰이라는 예입니다. 해당 Arm guest에서는 APIC 대신 GICv2m 경로가 표시됐습니다.

## 자주 하는 실수

### "PCIe에는 INTx가 없다"

시리즈 VM의 root bus virtio-net은 MSI-X가 없어 INTx(`GICv3 36 Level`)로 동작합니다. 새 드라이버가 MSI-X를 먼저 고르는 것은 맞지만, INTx는 `pci_alloc_irq_vectors()`의 마지막 fallback으로 남아 있습니다.

### "MSI-X Count만큼 vector를 받는다"

Count는 장치가 table에 가진 entry 수입니다. NVMe는 65개를 광고했지만 드라이버가 CPU 수에 맞춰 5개를 요청했고, 이 VM의 GICv2m은 MSI용 SPI가 64개뿐입니다. 장치·드라이버·컨트롤러 세 쪽의 상한 중 가장 작은 값이 실제 수입니다.

### "Per-vector mask는 항상 있다"

MSI의 per-vector mask는 `PCI_MSI_FLAGS_MASKBIT`가 있는 장치만 가집니다. 시리즈 VM에서 igb는 `Maskable+`, e1000e와 `edu`는 `Maskable-`였습니다. MSI-X는 entry마다 Vector Control의 mask 비트가 있고, NVMe table의 여섯째 entry가 그 비트가 켜진 예입니다.

### "MSI 주소는 인터럽트 컨트롤러의 물리 주소다"

IOMMU domain이 붙은 장치라면 MSI 주소는 IOVA입니다. 시리즈 VM의 NVMe table에는 GICv2m 물리 주소 0x08020040이 아니라 0xfffff040이 들어 있었습니다. 인터럽트가 오지 않을 때 table을 읽어 물리 주소와 비교하면 잘못된 결론을 냅니다. IOMMU 매핑까지 같이 봐야 합니다.

### "IOMMU가 있으면 MSI도 격리된다"

시리즈 VM은 SMMUv3가 MSI doorbell을 IOVA로 매핑했지만 GICv2m에는 isolated MSI가 없습니다. Linux 주석이 말하는 격리는 인터럽트 번호를 검사하는 하드웨어가 있어야 성립하고, VFIO는 이 차이 때문에 장치 할당을 거절했습니다.

## 정리

- INTx는 level-triggered 선을 흉내 내고, 시리즈 VM에서는 root bus virtio-net이 IRQ 50으로 INTx를 썼습니다.
- MSI는 최대 32개를 2의 거듭제곱으로 연속 할당하고, per-vector mask는 선택입니다.
- MSI-X는 BAR 안 table로 최대 2048개, entry 16바이트에 주소·데이터·mask가 있습니다.
- NVMe MSI-X entry의 데이터는 GICv2m SPI 번호, 주소는 IOMMU가 바꾼 IOVA였습니다.
- `pci_alloc_irq_vectors()`는 MSI-X → MSI → INTx 순서로 시도하고, INTx는 flag와 `min_vecs == 1` 조건이 있어야 씁니다.
- NVMe는 CPU당 I/O queue 하나에 managed affinity를 걸고, CPU 2의 읽기 2000번이 CPU 2의 queue 인터럽트 2000번으로 돌아왔습니다.

## 다음 편

[Ch 6: Power Management — D-state·L-state·ASPM](/blog/embedded/hardware/pcie/chapter06-power-management)에서 장치 전력 상태와 링크 전력 상태를 시리즈 VM에서 바꿔 보고 읽습니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — MSI·MSI-X Capability 위치
- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — MSI-X table이 사는 BAR
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — `pci_alloc_irq_vectors`
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — MSI doorbell이 들어가는 IOMMU 매핑

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12 기준이고 실행은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
