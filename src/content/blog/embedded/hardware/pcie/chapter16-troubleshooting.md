---
title: "Ch 16: Troubleshooting — 실무 시나리오북"
slug: "embedded/hardware/pcie/chapter16-troubleshooting"
date: 2026-05-19T09:16:00
description: "QEMU 시리즈 VM에서 실제로 만난 PCIe 증상 열 가지 — 장치 미노출·링크 속도·침묵하는 AER·복구 실패·반영 안 된 설정·VFIO 거절·IOMMU group·DMA mask·hot-plug·인터럽트 위치."
series: "PCIe Deep Dive"
seriesOrder: 16
tags: [pcie, troubleshooting, debugging, scenarios]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"이 장은 이 시리즈를 쓰면서 시리즈 VM에서 실제로 만난 증상 열 가지를, 증상 → 첫 확인 → 원인 → 근거 순서로 다시 묶은 케이스북입니다."** 각 증상의 재현과 로그는 원래 장에 있고, 여기서는 진단 순서와 판단 근거만 모읍니다. 실제 하드웨어에서만 생기는 신호 무결성·전원·BIOS 문제는 재현하지 않았으므로 다루지 않습니다.

[Ch 15](/blog/embedded/hardware/pcie/chapter15-tools)에서 도구를 정리했습니다. 이 장의 모든 시나리오는 QEMU 11.1.3 virt 위의 Debian 13(커널 6.12.116)에서 관찰한 것이고, 근거는 Linux v6.12와 QEMU 11.1.3 소스입니다.

## 시나리오 1 — 장치가 안 보이거나 드라이버가 안 붙음

| 단계 | 내용 |
|------|------|
| 증상 | `lspci`에 없거나, 있는데 `Kernel driver in use`가 없음 |
| 첫 확인 | `lspci -tv`의 bus 범위, 위 bridge의 `Bus: primary/secondary/subordinate`, sysfs `driver_override` |

| 관찰 | 원인 | 근거 |
|------|------|------|
| ECAM으로 읽은 bus 9가 `0xffffffff` 네 개 | 그 bus에 장치가 없음 | [Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)의 `xp` 읽기, `pci_bus_generic_read_dev_vendor_id()`(`probe.c:2392-2406`) |
| bridge의 secondary bus가 0이면 아래 장치가 안 보임 | 열거가 bus 번호를 주지 않음 | [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)의 CXL 실험 |
| `id_table`이 맞는데 드라이버가 안 붙음 | `driver_override`가 다른 드라이버 이름 | [Ch 10](/blog/embedded/hardware/pcie/chapter10-linux-basics), `pci_match_device()`(`pci-driver.c:142-143`) |

## 시나리오 2 — 링크 속도·폭이 LnkCap보다 낮음

| 단계 | 내용 |
|------|------|
| 증상 | root port `LnkCap: Speed 16GT/s, Width x16`, `LnkSta: Speed 2.5GT/s, Width x1` |
| 첫 확인 | 아래 장치의 LnkCap, Link Status의 LBMS·DLLLA |

시리즈 VM에서 낮은 쪽은 장치였습니다. NVMe의 LnkCap이 2.5 GT/s x1이라 링크도 그 값입니다([Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)). QEMU는 training 없이 `pcie_sync_bridge_lnk()`로 장치 값을 port에 복사합니다. 실제 하드웨어에서 양쪽 LnkCap이 모두 높은데 낮게 잡혔다면, Linux의 ASM2824 quirk가 쓰는 판단 기준인 `LBMS=1, DLLLA=0`부터 봅니다([Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer), `quirks.c:38-135`).

`lspci`가 `(overdriven)`을 붙이면 LnkSta가 LnkCap보다 큰 상태입니다(pciutils `ls-caps.c:776-779`의 `link_compare()`). 시리즈 VM의 rp5는 실험 도중 LnkCap이 0x00300000(속도·폭 0)으로 바뀌어 이 표시가 붙었고, 언제 바뀌었는지는 확인하지 않았습니다([Ch 14](/blog/embedded/hardware/pcie/chapter14-linux-operations)).

## 시나리오 3 — 장치는 오류를 기록했는데 AER 로그가 없음

| 단계 | 내용 |
|------|------|
| 증상 | `dmesg`에 AER 줄이 없는데 `lspci -vv`의 `UESta`에 `MalfTLP+` |
| 첫 확인 | 같은 장치의 `DevCtl: CorrErr NonFatalErr FatalErr UnsupReq` |

QEMU의 igb·e1000e는 AER Capability가 있지만 DevCtl의 reporting enable 비트가 쓰기 가능으로 열리지 않아 모두 `-`였고, 그래서 ERR 메시지가 나가지 않았습니다([Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling), QEMU `pcie_aer.c:196-231`). AER Capability가 없는 NVMe는 Linux가 reporting을 아예 켜지 않습니다(`aer.c:367-392`). sysfs `aer_dev_*` 통계도 커널이 받은 오류만 세므로 이 경우 0입니다.

## 시나리오 4 — AER 복구가 실패함

| 단계 | 내용 |
|------|------|
| 증상 | `AER: can't recover (no error_detected callback)`, `device recovery failed` |
| 첫 확인 | 오류가 난 bridge 아래 모든 장치의 드라이버가 `err_handler`를 가졌는지 |

callback 없는 장치가 하나라도 있으면 `PCI_ERS_RESULT_NO_AER_DRIVER`가 되어 복구가 실패합니다(`err.c:62-74`). 시리즈 VM에서 virtio-net이 그 예였고, callback을 가진 igb는 software 주입으로 `error_detected` → link reset → `slot_reset` → `resume`까지 성공했습니다([Ch 15](/blog/embedded/hardware/pcie/chapter15-tools)). Fatal 오류에서 장치 쪽 원인이 `type=Inaccessible`로만 찍히는 것은 Linux가 그 장치의 AER 레지스터를 읽지 않기 때문입니다(`aer.c:1208-1250`). reset 전에 `lspci -vv`로 직접 읽어 둡니다.

## 시나리오 5 — 커널은 켰다는데 레지스터는 그대로

| 단계 | 내용 |
|------|------|
| 증상 | `pci ...: enabling Extended Tags` 로그, sysfs `link/l0s_aspm`이 1 |
| 첫 확인 | `lspci -vv`의 `DevCtl: ExtTag`, `LnkCtl: ASPM`, `setpci`로 원본 값 |

시리즈 VM에서는 두 경우 모두 레지스터가 바뀌지 않았습니다. QEMU가 Device Control·Link Control의 해당 비트를 쓰기 가능으로 열지 않았고(`pcie.c:369-371`, `385-390`), 커널은 쓴 뒤 다시 읽지 않습니다([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp), [Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)). ASPM sysfs 값은 커널의 `link->aspm_enabled`를 보여 줄 뿐입니다(`aspm.c:1535-1543`). Retrain Link·Target Link Speed 쓰기도 같은 식으로 무시됐습니다([Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer)).

## 시나리오 6 — VFIO가 장치 할당을 거절함

| 단계 | 내용 |
|------|------|
| 증상 | `VFIO_SET_IOMMU`가 `Operation not permitted`, 커널에 `No interrupt remapping support` |
| 첫 확인 | 플랫폼 MSI 컨트롤러가 isolated MSI를 제공하는지 |

시리즈 VM은 HVF 때문에 GICv2m을 쓰고, GICv2m 드라이버는 `IRQ_DOMAIN_FLAG_ISOLATED_MSI`를 세우지 않습니다. `vfio_iommu_type1.c:2248-2250`이 이 조건으로 거절했습니다([Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts), [Ch 12](/blog/embedded/hardware/pcie/chapter12-virtualization-1)). `allow_unsafe_interrupts`로 넘어갈 수는 있지만 그 위험을 받아들이는 선택입니다.

## 시나리오 7 — IOMMU group에 장치가 여럿

| 단계 | 내용 |
|------|------|
| 증상 | `/sys/kernel/iommu_groups/6/devices`에 `0000:05:00.0`과 `0000:06:00.0` |
| 첫 확인 | 위 port에 ACS Capability가 있는지 (`lspci -vv`의 `Access Control Services`) |

ACS가 있는 root port 아래 장치는 혼자 group을 가졌고, ACS가 없는 XIO3130 downstream port 아래 장치는 port와 같은 group이었습니다([Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)). 이때도 port에 `pcieport`가 붙어 있으면 `driver_managed_dma` 덕분에 VFIO group은 viable입니다(`portdrv.c:797`). 다만 FLR이 없는 장치는 VFIO가 열 때 port의 secondary bus reset을 받았습니다([Ch 12](/blog/embedded/hardware/pcie/chapter12-virtualization-1)).

## 시나리오 8 — probe가 `-5`로 실패함

| 단계 | 내용 |
|------|------|
| 증상 | `probe with driver edu_demo failed with error -5` |
| 첫 확인 | 드라이버의 DMA mask, `/sys/kernel/iommu_groups/<N>/type`, `/proc/iomem`의 RAM 시작 주소 |

28비트 DMA mask를 쓰는 `edu`가 IOMMU group을 `identity`로 바꾸자 `dma_set_mask()`가 `-EIO`를 냈습니다. RAM이 0x40000000부터라 28비트로는 닿을 수 없기 때문입니다(`kernel/dma/mapping.c:865-881`). group을 `DMA`로 되돌리면 IOVA가 mask 아래에서 나와 정상 동작했습니다([Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)).

## 시나리오 9 — hot-plug한 장치가 바로 안 보임

| 단계 | 내용 |
|------|------|
| 증상 | `device_add` 직후 `lspci`에 없음 |
| 첫 확인 | `dmesg`의 `pciehp: Slot(N): Button press: will power on in 5 sec`, Slot Status `PresDet`, Link Status `DLActive` |

QEMU의 hot-plug는 Attention Button 이벤트로 오고, pciehp는 5초를 기다린 뒤 전원을 켭니다(`pciehp_ctrl.c:169-204`). 그 뒤 `Card present` → `Link Up` → 열거 순서로 장치가 나타났습니다. BAR는 port에 미리 잡혀 있던 bridge window 안에 들어갔습니다([Ch 14](/blog/embedded/hardware/pcie/chapter14-linux-operations)). VF가 켜진 PF를 떼면 VF도 함께 사라졌습니다.

## 시나리오 10 — 인터럽트가 예상과 다른 곳에 옴

| 단계 | 내용 |
|------|------|
| 증상 | MSI-X table의 주소가 인터럽트 컨트롤러 물리 주소와 다름, 특정 CPU에만 인터럽트 |
| 첫 확인 | `/proc/interrupts`, `/proc/irq/N/effective_affinity_list`, IOMMU 매핑 |

NVMe MSI-X table의 주소 0xfffff040은 GICv2m 물리 주소가 아니라 IOMMU가 매핑한 IOVA였고, 같은 IOVA 0xfffff040이 igb(sid 0x300)의 MSI 쓰기에서 0x8020040으로 바뀌는 것이 QEMU SMMU trace에 남았습니다([Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts), [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)). CPU 2에서만 읽기를 내자 CPU 2에 고정된 queue의 인터럽트만 정확히 2000 늘었습니다. NVMe 드라이버의 managed affinity 때문입니다.

## 증거를 보존하고 다음 단계로 넘어가기

이 시리즈에서 원인을 찾을 수 있었던 공통 패턴은 세 가지였습니다. 커널 로그를 믿기 전에 레지스터를 다시 읽었고(시나리오 3·5), 같은 증상을 다른 경로로 재현했고(QEMU 주입과 `aer_inject`), 원인 후보마다 소스의 해당 줄을 찾았습니다. reset이나 rescan은 증상을 지우므로, 하기 전에 `lspci -vv -xxxx`, `dmesg`, sysfs `aer_dev_*`를 먼저 저장합니다.

## 추가 진단 도구 모음

| 알고 싶은 것 | 이 시리즈에서 쓴 방법 |
|------|------|
| 장치·bus 구조 | `lspci -tv`, `lspci -nn` |
| 레지스터 원본 | `lspci -xxxx`, `setpci` |
| 커널이 배치한 자원 | `/proc/iomem`, sysfs `resource` |
| 인터럽트 | `/proc/interrupts`, `/sys/kernel/irq/N/` |
| 오류 | `dmesg`, sysfs `aer_dev_*`, `lspci -vv`의 `UESta`·`CESta` |
| 가상 머신 안의 MMIO·IOMMU 동작 | QEMU monitor `xp`, `trace-event smmu*` |

## 일반 진단 결정 트리

| 단계 | 질문 | 다음 |
|------|------|------|
| 1 | `lspci -tv`에 장치가 있는가 | 없으면 시나리오 1 |
| 2 | 드라이버가 붙었는가 | 아니면 `driver_override`·`dmesg`의 probe 오류(시나리오 1·8) |
| 3 | LnkSta가 기대값인가 | 아니면 시나리오 2 |
| 4 | 오류 로그나 장치 status가 있는가 | 있으면 시나리오 3·4 |
| 5 | 설정을 바꿨는데 효과가 없는가 | 시나리오 5 |
| 6 | VFIO·IOMMU 문제인가 | 시나리오 6·7·8 |

## 자주 하는 실수

### "재부팅으로 해결되면 끝"

reset·rescan은 장치의 오류 status와 커널 상태를 지웁니다. 시나리오 4처럼 원인 비트를 reset 전에 읽어야 하는 경우가 있습니다.

### "로그 한 줄이 상태를 말해 준다"

`enabling Extended Tags`, `l0s_aspm=1`, `wakeup=enabled`는 모두 커널 쪽 의도나 정책이었고 레지스터와 달랐습니다([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp), [Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)).

### "VFIO에 bind하면 바로 쓸 수 있다"

IOMMU group, isolated MSI, reset 범위 세 조건을 모두 봐야 했습니다(시나리오 6·7).

## 정리

- 장치가 안 보이면 bus 범위와 bridge bus 번호, 드라이버가 안 붙으면 `driver_override`부터 봅니다.
- 링크가 낮으면 양쪽 LnkCap과 LBMS·DLLLA를 봅니다.
- AER 로그가 없다고 오류가 없는 것은 아니고, 복구 실패는 callback 없는 드라이버에서 옵니다.
- 커널이 켰다는 설정은 레지스터로 다시 확인합니다.
- VFIO는 isolated MSI·IOMMU group·reset 범위를 함께 봅니다.
- DMA mask 실패와 인터럽트 위치 문제는 IOMMU 매핑까지 같이 봐야 풀립니다.

## 다음 편

[Ch 17: Performance — Bandwidth·Latency·Tuning](/blog/embedded/hardware/pcie/chapter17-performance)에서 PCIe 성능을 무엇으로 재고 어디까지 계산할 수 있는지 다룹니다.

## 관련 항목

- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — AER·DPC
- [Ch 14: Linux Operations](/blog/embedded/hardware/pcie/chapter14-linux-operations) — pciehp·recovery
- [Ch 15: Tools](/blog/embedded/hardware/pcie/chapter15-tools)
- [Ch 17: Performance](/blog/embedded/hardware/pcie/chapter17-performance)
- [Embedded Debugging Ch 18: 고속 링크 bring-up](/blog/tools/debugging/embedded/chapter18-highspeed-link-bringup) — 실제 보드의 링크 문제

## 시리즈 자료 출처 안내

이 글의 시나리오는 모두 Ch 1의 시리즈 VM에서 관찰한 것이고, 각 근거는 해당 장과 Linux v6.12·QEMU 11.1.3 소스 줄에 있습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
