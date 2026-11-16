---
title: "Ch 11: DMA·IOMMU — Coherent·Streaming·ATS·PRI·PASID·IOMMUFD"
slug: "embedded/hardware/pcie/chapter11-linux-dma"
date: 2026-05-19T09:11:00
description: "Linux DMA API — coherent·streaming·scatter-gather·IOMMU mapping·ATS·PRI·PASID·SVM·IOMMUFD."
series: "PCIe Deep Dive"
seriesOrder: 11
tags: [pcie, dma, iommu, ats, pasid, iommufd, svm]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 주소와 소유권부터 구분하기

CPU가 쓰는 포인터와 장치에 넘기는 DMA 주소는 다른 값입니다. CPU virtual address, host physical address, 장치가 보는 `dma_addr_t`가 따로 있고, IOMMU가 있으면 셋째가 IOVA가 됩니다. 이 장은 [Ch 10](/blog/embedded/hardware/pcie/chapter10-linux-basics)의 `edu` 드라이버로 실제 DMA를 돌려 세 주소가 어떻게 다른지, IOMMU가 무엇을 바꾸고 막는지 시리즈 VM(QEMU 11.1.3 virt + SMMUv3, Debian 13, 커널 6.12.116)에서 확인합니다.

API 계약의 기준은 [Linux v6.12 DMA API HOWTO](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/core-api/dma-api-howto.rst)입니다.

## 실험 — edu로 4 KiB를 왕복시키기

QEMU `edu` 장치는 내부에 4 KiB buffer(장치 주소 0x40000)를 두고, DMA source·destination·count 레지스터와 command 레지스터로 RAM과 이 buffer 사이를 복사합니다(QEMU 11.1.3 `docs/specs/edu.rst`). 기본 DMA 주소 폭은 28비트(256 MiB)입니다. 실험 드라이버는 `dma_alloc_coherent()`로 4 KiB 두 개를 받아, 하나에 0x00~0xff 패턴을 채우고 RAM → EDU → RAM으로 보낸 뒤 비교합니다.

```c
	src = dma_alloc_coherent(&pdev->dev, 4096, &a, GFP_KERNEL);
	dst = dma_alloc_coherent(&pdev->dev, 4096, &b, GFP_KERNEL);
	for (i = 0; i < 4096; i++)
		src[i] = i & 0xff;
	edu_dma(pdev, edu, a, EDU_BUF, 4096, 0);              /* RAM -> EDU */
	edu_dma(pdev, edu, EDU_BUF, b, 4096, EDU_DMA_TO_RAM); /* EDU -> RAM */
```

(`edu_demo.c` 발췌. `edu_dma()`는 레지스터 넷을 쓰고 START 비트가 내려갈 때까지 기다립니다.)

```text
edu_demo 0000:06:00.0: step 3 dma mask 28 bits ok
edu_demo 0000:06:00.0: dma src: cpu phys 0x0000000135199000 -> dma addr 0x000000000ffff000
edu_demo 0000:06:00.0: dma dst: cpu phys 0x0000000135197000 -> dma addr 0x000000000fffe000
edu_demo 0000:06:00.0: RAM->EDU done, irq status 0x100
edu_demo 0000:06:00.0: EDU->RAM done, irq status 0x100
edu_demo 0000:06:00.0: compare: 0 of 4096 bytes differ
```

buffer의 물리 주소는 0x135199000, 약 4.8 GiB 위치입니다. 28비트 장치는 이 주소를 낼 수 없습니다. 그런데 장치에 넘긴 DMA 주소는 0xffff000으로 256 MiB 아래이고, 왕복한 4096바이트가 하나도 다르지 않았습니다. SMMUv3가 IOVA 0xffff000을 물리 0x135199000으로 바꿔 준 결과입니다. IOVA가 장치의 28비트 mask 아래에서 나왔습니다. irq status 0x100은 `edu.rst`의 "raise interrupt 0x100 after finishing the DMA" 값입니다.

## IOMMU가 없으면 — 같은 장치가 probe부터 실패

같은 장치의 IOMMU group을 identity domain으로 바꾸면 IOVA 변환 없이 물리 주소를 그대로 씁니다. 드라이버를 떼고 sysfs로 group type을 바꾼 뒤 다시 올렸습니다.

```bash
rmmod edu_demo
echo identity > /sys/kernel/iommu_groups/6/type
insmod /root/edu/edu_demo.ko dma_test=1
```

```text
rc=0 type=identity
insmod rc=0
edu_demo 0000:06:00.0: probe: matched 1234:11e8
edu_demo 0000:06:00.0: probe with driver edu_demo failed with error -5
40000000-13c65ffff : System RAM
```

probe가 -5(`-EIO`)로 실패했습니다. Linux v6.12 `dma_set_mask()`(`kernel/dma/mapping.c:865-881`)는 `dma_supported()`가 거짓이면 `-EIO`를 돌려줍니다. 이 VM의 RAM은 0x40000000(1 GiB)부터 시작하므로 28비트 mask로는 RAM의 어느 바이트에도 직접 닿을 수 없습니다. IOMMU가 있을 때는 같은 mask가 IOVA 공간의 제약일 뿐이었고, 없을 때는 장치를 쓸 수 없게 만드는 제약이 됐습니다. 실험 뒤 group type을 `DMA`로 되돌리고 드라이버가 다시 붙는 것을 확인했습니다.

Debian 커널은 `CONFIG_SWIOTLB=y`이지만, 이 경우처럼 mask가 RAM 전체보다 아래를 가리키면 bounce buffer로도 해결되지 않았습니다.

## IOMMU가 막는 모습 — 매핑하지 않은 IOVA

이번에는 DMA source에 매핑한 적이 없는 IOVA 0x0abc0000을 넣었습니다. 게스트 쪽 결과입니다.

```text
edu_demo 0000:06:00.0: bad DMA: source IOVA 0x0abc0000 was never mapped
edu_demo 0000:06:00.0: bad DMA finished, irq status 0x0
```

장치는 DMA를 끝냈다고 보고했습니다. 무슨 일이 있었는지는 QEMU monitor에서 `trace-event smmuv3_* on`, `trace-event smmu_* on`으로 켠 trace에 남았습니다.

```text
smmu_iotlb_lookup_miss IOTLB cache MISS asid=7 vmid=0 addr=0xabc0000 hit=8 miss=2052 hit rate=0
smmu_ptw_level stage=1 level=0 iova=0xabc0000 subpage_sz=0x8000000000 baseaddr=0x100c8a000 offset=0 => pte=0x100c8c003
smmu_ptw_level stage=1 level=1 iova=0xabc0000 subpage_sz=0x40000000 baseaddr=0x100c8c000 offset=0 => pte=0x106388003
smmu_ptw_level stage=1 level=2 iova=0xabc0000 subpage_sz=0x200000 baseaddr=0x106388000 offset=85 => pte=0x0
smmuv3_propagate_event SMMU_EVT_F_TRANSLATION sid=0x600
```

SMMU가 stage 1 page table을 level 0→1→2로 내려가다 level 2 entry가 0인 것을 보고 translation fault를 냈습니다. SID 0x600은 BDF 06:00.0입니다. 장치가 4 KiB를 4바이트씩 읽으려 할 때마다 이 fault가 나서 1024번 반복됐고, 같은 trace에서 0x0abc0000대 주소의 `smmuv3_translate_success`는 한 번도 없었습니다. IOMMU가 매핑하지 않은 주소로의 DMA를 막은 것입니다.

같은 trace에는 정상 변환의 예도 있습니다. `smmuv3_translate_success ... sid=0x300 iova=0xfffff040 translated=0x8020040`는 igb(03:00.0)의 MSI 쓰기가 IOVA 0xfffff040에서 GICv2m doorbell 0x08020040으로 바뀐 기록입니다. [Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts)에서 MSI-X table에 IOVA가 들어 있던 이유가 여기서 직접 보입니다.

한 가지는 설명하지 못했습니다. QEMU trace에는 event queue 인터럽트 발생(`smmuv3_trigger_irq irq=0`)이 1024번 찍혔지만, 게스트의 `/proc/interrupts`에서 `arm-smmu-v3-evtq` 카운트는 실험 전후 344로 같았고 `arm-smmu-v3 ... event 0x10 received` 로그도 없었습니다. Linux v6.12 `arm_smmu_evtq_thread()`(`drivers/iommu/arm/arm-smmu-v3/arm-smmu-v3.c:1820-`)는 stall이 아닌 translation fault를 rate limit 안에서 로그로 남기게 되어 있으므로, 이 VM에서 event가 커널까지 전달되지 않은 원인은 확인하지 못했습니다. 실제 시스템에서 IOMMU fault를 찾을 때 게스트 로그가 비어 있다는 사실만으로 fault가 없었다고 판단하면 안 된다는 예로 남깁니다.

## Coherent와 Streaming DMA

위 실험은 coherent DMA입니다. DMA API HOWTO의 두 모델과 실패 확인 방법을 정리합니다.

| 모델 | 성공·실패 확인 | 수명과 해제 |
|------|------|------|
| `dma_alloc_coherent()` | CPU 포인터 NULL 검사. 받은 `dma_addr_t`를 장치에 전달 | DMA가 끝난 뒤 같은 장치·크기·주소로 `dma_free_coherent()` |
| `dma_map_single()` | `dma_mapping_error()` 검사 (HOWTO 529-542행) | 완료 확인 뒤 같은 크기·방향으로 unmap |
| `dma_map_sg()` | 반환 count가 0이면 실패 (HOWTO 600-604행) | 아래 SG 규칙 참고 |

coherent 메모리도 장치 protocol의 순서는 지켜야 합니다. descriptor의 주소를 쓴 뒤 valid 비트를 올리고 doorbell을 울리는 순서가 바뀌면 장치는 반쯤 쓴 descriptor를 읽습니다. 실험 드라이버는 `writeq()`로 레지스터를 순서대로 쓰고 START 비트를 마지막에 썼습니다.

### Streaming 방향은 장치 기준

streaming DMA의 방향은 장치가 메모리를 읽는지 쓰는지로 정합니다. 화물 인도장에 비유하면, 장치가 짐을 싣는 동안 CPU가 같은 짐을 바꾸면 안 되고, 다 실은 뒤에 소유권을 넘겨받아야 합니다.

| 방향 | 장치 접근 | CPU가 다시 접근할 때 |
|------|------|------|
| `DMA_TO_DEVICE` | 메모리를 읽음 | 장치 사용이 끝난 뒤 |
| `DMA_FROM_DEVICE` | 메모리에 씀 | 완료 확인 뒤 unmap 또는 `dma_sync_single_for_cpu()` |
| `DMA_BIDIRECTIONAL` | 읽고 씀 | 같은 mapping에서 CPU·device sync를 번갈아 |

### Scatter-gather의 두 개수

DMA API HOWTO(600-621행)는 `dma_map_sg()`가 연속된 entry를 합칠 수 있어 반환 count가 `nents`보다 작을 수 있다고 적습니다. 장치에는 count개의 segment를 `sg_dma_address()`·`sg_dma_len()`으로 알리고, unmap에는 처음 넘긴 `nents`를 그대로 넘겨야 합니다. 문서는 이 부분을 "should _NOT_ be the 'count' value"라고 강조합니다. sync 함수도 같은 규칙입니다(657행).

mapping이 성공했다는 것은 DMA가 끝났다는 뜻이 아닙니다. HOWTO도 unmap 앞에 "make sure DMA activity has already finished"를 반복합니다. 장치가 아직 쓰고 있는 메모리를 풀면, 위 bad DMA 실험과 반대로 IOMMU 매핑이 이미 다른 용도로 바뀐 주소에 장치가 쓰게 됩니다.

## DMA mask와 bounce buffer

드라이버는 장치가 실제로 지원하는 주소 폭을 `dma_set_mask_and_coherent()`로 선언하고 반환값을 검사합니다. sysfs `dma_mask_bits`가 그 결과입니다. 시리즈 VM에서 `edu`는 28, NVMe는 64였습니다. 64-bit CPU나 64-bit BAR가 있다고 장치의 DMA 엔진도 64비트인 것은 아닙니다. `edu`가 그 예입니다.

## IOMMU와 Group

[Linux v6.12 VFIO 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/vfio.rst)(55-71행)는 IOMMU group을 "a set of devices which is isolatable from all other devices in the system"이라고 정의하고, ACS가 없는 bridge나 PCIe-to-PCI bridge 때문에 격리 단위가 커질 수 있다고 설명합니다. 시리즈 VM의 group이 그 예입니다.

```text
group 6 type=DMA devs=0000:05:00.0 0000:06:00.0 
group 7 type=DMA devs=0000:05:01.0 0000:07:00.0 
group 10 type=DMA devs=0000:01:00.0 
group 12 type=DMA devs=0000:03:00.0 
```

root port 아래의 NVMe(group 10)와 igb(group 12)는 혼자 group을 가집니다. QEMU root port에는 ACS Capability가 있습니다([Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)의 `[148 v1] Access Control Services`). 반면 XIO3130 switch의 downstream port에는 ACS가 없어서, 그 아래 장치는 downstream port와 같은 group에 묶였습니다. `edu`를 VFIO로 넘기려면 group 6의 다른 구성원도 함께 처리해야 한다는 뜻입니다. [Ch 12](/blog/embedded/hardware/pcie/chapter12-virtualization-1)에서 다룹니다.

group type은 `DMA`(IOVA 변환)와 `identity`(변환 없음)가 있고, 위 실험처럼 드라이버가 없을 때 sysfs로 바꿀 수 있습니다.

## ATS·PRI·PASID와 SVA

세 Extended Capability의 ID는 Linux v6.12 `pci_regs.h`에서 ATS 0x0F, PRI 0x13, PASID 0x1B입니다. PASID 폭은 PASID Capability 레지스터의 `PCI_PASID_CAP_WIDTH`(0x1f00, 5비트 필드, 940행)에 있습니다.

| 기능 | 이름이 말하는 역할 | 시리즈 VM |
|------|------|------|
| ATS | 장치가 주소 변환 결과를 요청·보관 | virtio-net(07:00.0) `ATSCap` 있음, `ATSCtl: Enable-` |
| PRI | 장치가 page를 요청 | 장치 없음 |
| PASID | 요청마다 address space를 구분 | 장치 없음 |

장치가 process 주소 공간을 그대로 쓰는 SVA는 IOMMU 드라이버 지원이 필요합니다. Debian 13 arm64 커널은 `# CONFIG_ARM_SMMU_V3_SVA is not set`이라서, 이 커널에서는 SMMUv3로 SVA를 쓸 수 없습니다. virtio-net의 ATS가 꺼져 있는 것도 capability가 있다는 사실과 OS가 그 기능을 켰다는 사실이 다르다는 예입니다.

## IOMMUFD와 userspace

IOMMUFD는 `/dev/iommu`로 I/O 주소 공간(IOAS)과 hardware page table(HWPT) 객체를 userspace에 주는 인터페이스입니다([Linux v6.12 IOMMUFD 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/userspace-api/iommufd.rst)). Debian 13 arm64 커널은 `# CONFIG_IOMMUFD is not set`이고, 실제로 `/dev/iommu`가 없습니다(`ls: cannot access '/dev/iommu'`). VFIO는 group 방식의 `/dev/vfio/vfio`만 있습니다. 이 VM에서 IOMMUFD는 실행하지 않았습니다. 배포판 커널이라도 이 기능이 켜져 있는지부터 확인해야 하는 이유입니다.

## 정리

- `edu` DMA 왕복에서 CPU 물리 주소 0x135199000이 장치에는 IOVA 0xffff000으로 보였고, 4096바이트가 모두 맞았습니다.
- IOMMU를 identity로 바꾸자 28비트 DMA mask가 RAM(0x40000000부터)에 닿지 못해 `dma_set_mask()`가 `-EIO`를 냈습니다.
- 매핑하지 않은 IOVA로의 DMA는 SMMU translation fault 1024번으로 막혔지만, 이 VM의 게스트 로그에는 SMMU event가 나오지 않았습니다.
- SG는 장치에 반환 count개, unmap·sync에는 원래 `nents`를 씁니다.
- ACS가 없는 switch port 아래 장치는 port와 같은 IOMMU group에 묶였습니다.
- Debian 13 arm64 커널은 SMMUv3 SVA와 IOMMUFD가 꺼져 있습니다.

## 다음 편

[Ch 12: Virtualization I — Pass-through·SR-IOV·VFIO](/blog/embedded/hardware/pcie/chapter12-virtualization-1)에서 IOMMU group 단위로 장치를 VFIO에 넘기고 SR-IOV VF를 다룹니다.

## 관련 항목

- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — SR-IOV VF BAR
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — MSI doorbell도 IOVA로 매핑되는 모습
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — `edu_demo` 드라이버
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1)
- [Ch 13: Virtualization II](/blog/embedded/hardware/pcie/chapter13-virtualization-2) — vIOMMU·S-IOV·IDE/TDISP
- [Driver + RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — DMA descriptor ring을 silicon 전에 RTL과 돌려 보는 흐름

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3 기준이고, 실험은 Ch 1의 시리즈 VM에서 [Ch 10](/blog/embedded/hardware/pcie/chapter10-linux-basics)의 실험 드라이버로 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
