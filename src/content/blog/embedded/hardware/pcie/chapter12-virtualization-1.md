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

Pass-through는 장치를 guest나 userspace driver가 직접 제어하게 합니다. SR-IOV는 PF가 VF를 제공하는 하드웨어 기능이고, VFIO는 장치를 userspace에 노출하는 Linux interface입니다. DPDK·SPDK는 그 위에서 network·storage I/O를 처리할 수 있지만, 세 이름은 같은 기능이 아닙니다.

이 장은 [Linux v6.12 VFIO 문서](https://www.kernel.org/doc/html/v6.12/driver-api/vfio.html), [SR-IOV HOWTO](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/pci-iov-howto.rst)를 기준으로 소유권과 실패 조건을 설명합니다. 실제 VF 생성, driver unbind, NIC·NVMe의 VFIO 전환이나 QEMU passthrough는 실행하지 않았습니다. 가짜 BDF 출력이나 성공한 guest 열거 결과도 제시하지 않습니다.

## PF·VF와 두 가지 주소 간격

PF는 VF 수와 공유 하드웨어 자원을 관리하고, 각 VF는 별도 PCI function으로 열거돼 driver를 가질 수 있습니다. VF의 queue·interrupt·대역폭과 reset 범위는 장치 구현에 달려 있습니다. PF와 별도 BDF라고 모든 내부 자원과 장애가 독립적인 것은 아닙니다.

| 항목 | 확인할 의미 |
|------|------|
| `sriov_totalvfs` | kernel이 노출한 지원 VF 수. 실제 생성 가능한 자원도 확인 |
| `sriov_numvfs` | 활성 VF 수. 변경에는 PF driver·사용 중인 VF·resource 제약이 관여 |
| `virtfnN` | PF에서 실제 VF를 가리키는 sysfs link |
| VF BAR aperture | VF의 MMIO 범위. PF의 SR-IOV BAR 정의와 연결 |
| First VF Offset·VF Stride | Routing ID 배치. BAR의 byte 간격과 다름 |

BDF를 PF 이름의 문자열 패턴으로 추측하지 않습니다. 아래는 실제 Linux에서 관계를 조회하는 명령 예이며 이 작업에서는 실행하지 않았습니다. 예시 PF를 대상 BDF로 바꿔야 하고, 속성이 없으면 지원되지 않는 경우도 확인합니다.

```bash
pf=0000:01:00.0
cat "/sys/bus/pci/devices/$pf/sriov_totalvfs"
cat "/sys/bus/pci/devices/$pf/sriov_numvfs"
find "/sys/bus/pci/devices/$pf" -maxdepth 1 -name 'virtfn*' -type l -exec readlink -f '{}' \;
```

VF 수를 쓰는 제어 명령은 기존 VF의 I/O를 중단할 수 있으므로 조회와 구분합니다. 생성 실패는 firmware·MMIO·bus 번호·driver 제한 등을 나눠 조사해야 합니다. 임의 NIC가 항상 64개 이상 VF를 지원한다고 가정하지 않습니다.

## VFIO의 group/container 경로

Group은 외부 장치와 격리 가능한 최소 소유권 단위입니다. 같은 group에 독립적인 신뢰 domain을 섞지 않아야 하고, group 내 장치들의 binding 상태를 확인해야 합니다. 문서의 legacy group API는 다음 의존 순서를 갖습니다.

| 순서 | 필요한 확인 |
|------|------|
| Container 열기 | `/dev/vfio/vfio`, API version과 IOMMU extension 지원 |
| Group 열기 | 실제 IOMMU group과 권한. `VFIO_GROUP_GET_STATUS`의 viability |
| Container에 연결 | `VFIO_GROUP_SET_CONTAINER` 성공 여부 |
| IOMMU 설정 | 지원된 type으로 `VFIO_SET_IOMMU` 성공 여부 |
| Device fd 획득 | 실제 BDF로 `VFIO_GROUP_GET_DEVICE_FD` |
| I/O 준비 | region·IRQ 정보 조회, 허용된 DMA map과 register protocol |
| 종료 | DMA·IRQ 중단 후 mapping·device·group·container를 정리 |

중간 ioctl이 실패했는데 뒤 단계를 계속 진행하면 안 됩니다. 성공한 객체만 정리하고, mapping 주소·크기·권한을 기록해야 합니다. VFIO는 장치 firmware의 모든 결함이나 사용자가 허용한 DMA 범위 안의 데이터 손상까지 막아 주는 기능은 아닙니다.

새 cdev·IOMMUFD 경로는 [v6.12 VFIO cdev 문서](https://www.kernel.org/doc/html/v6.12/driver-api/vfio.html#vfio-device-cdev)처럼 별도의 bind·attach 절차를 따릅니다. Group/container ioctl 예에 `/dev/vfio/devices/vfioN`만 끼워 넣어 바꿀 수는 없습니다.

## ACS와 reset은 별도 문제

ACS의 Source Validation·P2P Redirect 등은 우회 경로를 제한하는 데 쓰입니다. Redirect는 무조건 모든 P2P packet을 폐기한다는 뜻이 아닙니다. 실제 group 구성은 ACS 외에도 topology·DMA alias와 장치 내부 경로를 반영합니다.

또한 group이 단독이라고 reset 범위까지 단독인 것은 아닙니다. FLR 지원, bus reset이 영향을 주는 이웃 장치, PF·VF의 공유 상태를 각각 확인해야 합니다. Reset 방법을 선택할 때는 대상 I/O 중단과 복구 책임도 정해야 합니다. ACS override는 실제 격리 하드웨어를 만들지 않고, reset 하나가 이전 소유자의 모든 비밀 데이터 삭제를 입증하지도 않습니다.

## DPDK·SPDK의 위치

[DPDK Linux Drivers 문서](https://doc.dpdk.org/guides/linux_gsg/linux_drivers.html)는 driver별 binding 조건과 VFIO 사용을 설명합니다. 모든 PMD가 장치를 vfio-pci로 넘기는 것은 아니며, kernel driver와 함께 동작하는 방식도 있습니다. Hugepage 크기·개수, polling CPU와 queue 배치는 플랫폼·driver에 맞춰야 합니다.

[SPDK System Configuration](https://spdk.io/doc/system_configuration.html)은 userspace storage I/O를 위한 장치·메모리 준비를 설명합니다. 운영 중인 NVMe를 driver에서 분리하면 파일시스템 I/O가 끊길 수 있으므로, 단순히 따라 실행할 초기화 명령으로 제시하지 않습니다. Userspace라는 사실만으로 kernel보다 항상 빠르거나 전체 I/O가 zero-copy라는 결론도 나오지 않습니다.

| 층 | 담당하는 것 | 별도로 남는 책임 |
|------|------|------|
| VFIO·IOMMU | 장치 접근·허용된 DMA 주소 공간 | 올바른 mapping·권한·종료 |
| PMD·userspace driver | queue·descriptor·doorbell protocol | 실제 장치 지원과 오류 처리 |
| 응용 프로그램 | 요청과 buffer 수명·재시도 | 완료 전 재사용 금지, 데이터 일관성 |
| 운영 환경 | 장치 소유권·CPU·메모리 자원 | 이웃 장치·reset 영향과 복구 절차 |

## mdev와 vfio-user

mdev는 parent driver가 mediated device를 제공하는 framework입니다. 소프트웨어가 개입한다는 이유만으로 항상 격리가 약하다고 서열을 정하지 않습니다. 어떤 hardware partition·검증·DMA 경계를 사용하는지를 봐야 합니다.

vfio-user는 별도 process가 device model을 제공하는 protocol이며, 물리 장치를 kernel vfio-pci로 넘기는 것과 같은 경로가 아닙니다. 둘 다 VFIO 관련 용어를 사용해도 소유권·주소 공간·장치 구현 위치를 따로 확인합니다.

## 정리

- SR-IOV의 VF는 별도 function이며 PF와 공유하는 제약이 있습니다.
- 실제 VF 관계는 `virtfnN`으로 확인하고 BDF를 추측하지 않습니다.
- VFIO group viability·IOMMU·DMA mapping은 각각 성공을 검사합니다.
- Group 격리, reset 격리, 데이터 삭제는 서로 다른 증거가 필요합니다.
- DPDK·SPDK의 driver·메모리·CPU 조건과 실제 성능은 개별 환경에서 검증합니다.

## 다음 편

[Ch 13: Virtualization II — vIOMMU·Scalable IOV·VirtIO·IDE·TDISP](/blog/embedded/hardware/pcie/chapter13-virtualization-2)에서 *guest 측 vIOMMU·dynamic partition (S-IOV)·VirtIO·Confidential I/O*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — VF BAR aperture와 RID offset·stride
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — IOMMU group·ATS
- [Ch 13: Virtualization II](/blog/embedded/hardware/pcie/chapter13-virtualization-2)

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
