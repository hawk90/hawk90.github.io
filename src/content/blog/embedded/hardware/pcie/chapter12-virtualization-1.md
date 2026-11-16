---
title: "Ch 12: Virtualization I — Pass-through·SR-IOV·VFIO·DPDK·SPDK"
slug: "embedded/hardware/pcie/chapter12-virtualization-1"
date: 2026-05-19T09:12:00
description: "PCIe hardware virtualization — SR-IOV PF/VF·VFIO container/group/device·DPDK·SPDK·ACS·FLR."
series: "PCIe Deep Dive"
seriesOrder: 12
tags: [pcie, sr-iov, vfio, dpdk, spdk, virtualization, acs]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 장치 소유권과 격리부터 확인하기

Pass-through는 장치를 guest나 userspace 드라이버가 직접 제어하게 합니다. SR-IOV는 PF가 VF를 만들어 내는 하드웨어 기능이고, VFIO는 장치를 userspace에 넘기는 Linux 인터페이스입니다. DPDK·SPDK는 그 위에서 I/O를 처리하는 userspace 프로그램입니다. 세 이름은 층이 다릅니다.

이 장은 시리즈 VM(QEMU 11.1.3 virt + SMMUv3, Debian 13, 커널 6.12.116)에서 igb로 VF를 만들고, `edu` 장치를 VFIO로 넘겨 userspace 프로그램이 MMIO와 DMA를 직접 하게 합니다. 그 과정에서 이 VM이 VFIO에 왜 한 번 거절당했는지도 봅니다. 기준 문서는 [Linux v6.12 VFIO 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/vfio.rst)와 [SR-IOV HOWTO](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/pci-iov-howto.rst)입니다.

## PF·VF와 두 가지 주소 간격

[Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 igb(03:00.0)로 VF 두 개를 만들었습니다. 같은 PF에서 VF 관계를 조회합니다.

```bash
pf=0000:03:00.0
echo 2 > "/sys/bus/pci/devices/$pf/sriov_numvfs"
cat "/sys/bus/pci/devices/$pf/sriov_totalvfs"
cat "/sys/bus/pci/devices/$pf/sriov_numvfs"
find "/sys/bus/pci/devices/$pf/" -maxdepth 1 -name 'virtfn*' -type l -exec readlink -f '{}' \;
```

```text
7
2
/sys/devices/pci0000:00/0000:00:05.0/0000:03:10.0
/sys/devices/pci0000:00/0000:00:05.0/0000:03:10.2
```

이전 판의 명령은 `find` 경로 끝에 `/`가 없었는데, 그대로 실행하면 아무것도 나오지 않았습니다. `/sys/bus/pci/devices/<BDF>`는 symlink이고 `find`는 기본적으로 시작 경로의 symlink를 따라가지 않기 때문입니다. 끝에 `/`를 붙이자 VF 두 개가 나왔습니다. 각 VF의 sysfs 값은 다음과 같았고, 실험 뒤 VF는 지웠습니다.

```text
03:10.0 group=13 reset_method=flr physfn=0000:03:00.0
03:10.2 group=14 reset_method=flr physfn=0000:03:00.0
```

| 항목 | 시리즈 VM 값 | 뜻 |
|------|------|------|
| `sriov_totalvfs` | 7 | capability의 Total VFs는 8이지만 igb 드라이버가 `pci_sriov_set_totalvfs(pdev, 7)`로 낮춤 |
| `sriov_numvfs` | 2 | 지금 켠 VF 수 |
| VF BDF | 03:10.0, 03:10.2 | First VF Offset 128, Stride 2로 계산 ([Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)) |
| VF IOMMU group | 13, 14 | VF마다 따로 |
| VF reset 방법 | `flr` | VF 단위 reset 가능 |

VF는 자기 IOMMU group과 FLR을 가지므로 VFIO로 하나씩 넘길 수 있습니다. 반면 VF가 쓰는 queue·대역폭 같은 내부 자원은 PF 드라이버가 나눠 주는 것이라 VF 번호만으로 독립성을 판단할 수는 없습니다. SR-IOV HOWTO(43-88행)도 VF 생성과 해제를 PF의 `sriov_numvfs` 쓰기와 PF 드라이버의 `pci_enable_sriov()`·`pci_disable_sriov()`로 설명합니다.

## VFIO의 group/container 경로

VFIO 문서(55-71행)는 IOMMU group을 "a set of devices which is isolatable from all other devices in the system"으로 정의하고, group이 VFIO의 소유권 단위라고 적습니다. 문서의 legacy API 순서대로 userspace 프로그램 `vfio_edu.c`를 짜서 `edu`(06:00.0)를 넘겼습니다.

먼저 장치를 `vfio-pci`에 붙입니다. [Ch 10](/blog/embedded/hardware/pcie/chapter10-linux-basics)의 `driver_override`를 썼습니다.

```text
edu driver=vfio-pci group=6
05:00.0 driver=pcieport
crw------- 1 root root 236,   0 Nov 16 14:15 6
crw-rw-rw- 1 root root  10, 196 Nov 16 14:08 vfio
```

group 6에는 switch downstream port 05:00.0도 들어 있습니다([Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)). 그래도 group은 viable로 나왔습니다. port에 붙은 `pcieport` 드라이버가 `.driver_managed_dma = true`(`drivers/pci/pcie/portdrv.c:797`)라서 DMA 소유권을 주장하지 않기 때문입니다.

### 첫 시도 — interrupt remapping이 없어 거절

```text
API version 0, TYPE1v2 1
group 6 viable=1
SET_IOMMU failed: Operation not permitted
rc=1
vfio_iommu_type1_attach_group: No interrupt remapping support.  Use the module param "allow_unsafe_interrupts" to enable VFIO IOMMU support on this platform
```

group 열기와 container 연결까지는 됐지만 `VFIO_SET_IOMMU`에서 막혔습니다. Linux v6.12 `vfio_iommu_type1.c:2248-2250`은 `iommu_group_has_isolated_msi()`가 거짓이면 이 경고를 내고 실패합니다. [Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts)에서 본 대로 이 VM의 MSI 컨트롤러는 GICv2m이고, GICv2m 드라이버는 isolated MSI 플래그를 세우지 않습니다. userspace가 장치 DMA로 아무 SPI 번호나 doorbell에 쓸 수 있는 환경에서는 장치를 넘기지 않습니다.

### 둘째 시도 — 위험을 알고 허용

이 실험은 VFIO 흐름을 보기 위한 것이라 모듈 파라미터 `allow_unsafe_interrupts`(`vfio_iommu_type1.c:46-49`)를 잠시 켜고 다시 돌렸습니다. 실제 운영 시스템에서 켜면 위에서 막은 위험을 그대로 받아들이게 됩니다. 실험 뒤 0으로 되돌렸습니다.

```text
API version 0, TYPE1v2 1
group 6 viable=1
BAR0 region: size 0x100000 offset 0x0 flags 0x7
MSI irq count 1
edu id via mmap: 0x010000ed
mapped vaddr 0xffffa063f000 at iova 0x100000
userspace DMA round trip through IOVA 0x100000: ok
unmapped 4096 bytes
rc=0
```

| 순서 | ioctl·동작 | 결과 |
|------|------|------|
| Container 열기 | `/dev/vfio/vfio`, `VFIO_CHECK_EXTENSION(VFIO_TYPE1v2_IOMMU)` | 지원 1 |
| Group 확인 | `VFIO_GROUP_GET_STATUS` | viable |
| 연결·IOMMU 설정 | `VFIO_GROUP_SET_CONTAINER`, `VFIO_SET_IOMMU` | 첫 시도 실패, 둘째 성공 |
| 장치 fd | `VFIO_GROUP_GET_DEVICE_FD("0000:06:00.0")` | 성공 |
| region·IRQ 정보 | `VFIO_DEVICE_GET_REGION_INFO`, `GET_IRQ_INFO` | BAR0 1 MiB, mmap 가능(flags 0x7), MSI 1개 |
| MMIO | BAR0를 `mmap`해 ID 읽기 | 0x010000ed, 커널 드라이버로 읽은 값과 같음 |
| DMA 매핑 | 프로세스 메모리 4 KiB를 `VFIO_IOMMU_MAP_DMA`로 IOVA 0x100000에 | 성공 |
| DMA | `edu` DMA로 앞 2 KiB를 장치 buffer로 보냈다가 뒤 2 KiB로 받음 | 일치 |
| 정리 | `VFIO_IOMMU_UNMAP_DMA` 후 fd 닫기 | 4096바이트 해제 |

userspace 프로그램이 정한 IOVA 0x100000을 장치가 그대로 썼습니다. [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)의 커널 드라이버에서는 커널이 IOVA를 골랐지만, VFIO에서는 userspace가 IOVA 공간을 직접 관리합니다. 중간 ioctl이 실패하면 거기서 멈추고 이미 만든 것만 정리해야 합니다. 첫 시도가 `SET_IOMMU`에서 바로 끝난 것이 그 예입니다.

### 장치를 열면 reset이 일어난다

둘째 시도 때 커널 로그에는 이런 줄이 남았습니다.

```text
pcieport 0000:05:00.0: unlocked secondary bus reset via: pciehp_reset_slot+0x90/0x178
pcieport 0000:05:00.0: pciehp: Timeout on hotplug command 0x03f1 (issued 1052 msec ago)
```

vfio-pci는 장치를 열 때 `vfio_pci_core_enable()`(`drivers/vfio/pci/vfio_pci_core.c:466-491`)에서 `pci_try_reset_function()`을 부릅니다. `edu`는 FLR이 없어 reset 방법이 `bus`뿐이라([Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)) 위 switch downstream port의 secondary bus reset이 쓰였습니다. 이 port 아래에 다른 장치가 있었다면 함께 reset됩니다. 이어진 `pciehp: Timeout on hotplug command` 경고의 원인은 이번에 확인하지 않았습니다. VF처럼 FLR이 있는 장치라면 그 장치만 reset됩니다.

## ACS와 reset은 별도 문제

VFIO 문서(55-65행)는 ACS가 없는 bridge에서 function 사이 redirection이 IOMMU를 거치지 않을 수 있고, PCIe-to-PCI bridge 아래 장치는 bridge에서 나온 것처럼 보인다고 설명합니다. 시리즈 VM에서 ACS가 있는 root port 아래 장치는 혼자 group을 갖고, ACS가 없는 XIO3130 downstream port 아래 장치는 port와 같은 group이었습니다.

group 격리와 reset 범위는 다른 질문입니다. 위 `edu`는 group 6을 혼자 쓰지 않았고, reset은 위 port 기준의 bus reset이었습니다. 반대로 VF는 group도 따로, reset도 FLR로 따로였습니다. 장치를 넘기기 전에 sysfs `iommu_group`과 `reset_method`를 둘 다 봐야 합니다.

## DPDK·SPDK의 위치

이 VM에서 DPDK·SPDK는 실행하지 않았습니다. [DPDK Linux Drivers 문서](https://doc.dpdk.org/guides/linux_gsg/linux_drivers.html)(2026-11-16 열람)는 DPDK 포트용 커널 모듈로 모든 경우에 `vfio-pci`를 권하고, bifurcated driver를 쓰는 PMD는 커널 드라이버에서 떼면 안 된다고 적습니다. IOMMU가 없을 때 쓰는 VFIO no-IOMMU 모드(`enable_unsafe_noiommu_mode=1`)에 대해서는 IOMMU 보호를 포기하므로 "inherently unsafe"라고 경고합니다. 위 `allow_unsafe_interrupts`와 같은 종류의 타협입니다.

SPDK에 대해서는 QEMU 11.1.3 `docs/system/devices/vfio-user.rst`가 SPDK의 가상 NVMe 컨트롤러를 vfio-user 서버의 예로 듭니다. 아래 절에서 다룹니다.

| 층 | 이 장에서 담당한 것 | 남는 책임 |
|------|------|------|
| VFIO·IOMMU | group 소유권, `MAP_DMA`로 허용한 주소 | 올바른 매핑·해제, MSI 격리 여부 |
| userspace 드라이버 (`vfio_edu.c`) | 레지스터 순서, DMA 시작·완료 확인 | 장치별 protocol과 오류 처리 |
| 운영 | 어떤 장치를 넘길지, reset 영향 | 같은 bus의 이웃 장치 |

## mdev와 vfio-user

[Linux v6.12 `vfio-mediated-device.rst`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/vfio-mediated-device.rst)는 mediated device를 SR-IOV가 없는 DMA 장치를 가상화하기 위한 공통 관리 인터페이스로 소개합니다. 부모 드라이버가 장치를 나눠 VFIO에 노출하는 방식입니다.

vfio-user는 QEMU 문서의 설명대로 PCI 장치를 QEMU 밖의 userspace 프로세스에서 구현하는 프로토콜이고, vhost-user와 비슷하지만 virtio에 한정되지 않습니다. 커널이 처리하는 VFIO와 달리 전부 userspace에서 처리됩니다. 이름은 비슷해도 물리 장치를 `vfio-pci`로 넘기는 이 장의 경로와는 장치가 구현되는 위치가 다릅니다.

## 정리

- igb VF 두 개는 각자 IOMMU group(13·14)과 FLR을 가졌고, `virtfn`·`physfn` 링크로 PF와 이어졌습니다.
- VFIO legacy 경로를 container → group → IOMMU → device fd → region·DMA 순서로 실행해, userspace가 IOVA 0x100000으로 `edu` DMA를 돌렸습니다.
- 이 VM은 GICv2m에 isolated MSI가 없어 VFIO가 `No interrupt remapping support`로 거절했고, `allow_unsafe_interrupts`를 켜야 진행됐습니다.
- `pcieport`는 DMA를 관리하지 않는 드라이버라 group viability를 막지 않습니다.
- FLR이 없는 `edu`는 열릴 때 위 port의 secondary bus reset을 받았습니다. group과 reset 범위는 따로 확인합니다.

## 다음 편

[Ch 13: Virtualization II — vIOMMU·Scalable IOV·VirtIO·IDE·TDISP](/blog/embedded/hardware/pcie/chapter13-virtualization-2)에서 guest 쪽 vIOMMU와 virtio, confidential I/O를 다룹니다.

## 관련 항목

- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — VF BAR와 RID offset·stride
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — isolated MSI와 GICv2m
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — IOMMU group·ACS
- [Ch 13: Virtualization II](/blog/embedded/hardware/pcie/chapter13-virtualization-2)

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3 기준이고, `vfio_edu.c`는 Debian 13 게스트에서 gcc 14.2.0으로 빌드해 Ch 1의 시리즈 VM에서 실행했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
