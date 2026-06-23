---
title: "Ch 11: SR-IOV·mdev"
date: 2026-05-17T11:00:00
description: "FPGA 공유 — PF/VF·virtual function·mediated device."
tags: [QEMU, sr-iov, mdev, multi-tenant]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 11
draft: true
---

FPGA 한 대를 여러 VM이나 tenant가 *공유*하는 것은 datacenter ROI의 핵심입니다. **SR-IOV**는 하드웨어로, **mdev**는 소프트웨어로 device를 *가상 함수 다수*로 분할합니다. 이 장은 두 패턴과 FPGA 특화 응용(XRT VF, OPAE, DFL AFU)을 함께 봅니다.

## 왜 FPGA를 공유하나

FPGA는 비쌉니다 — Alveo U250이 USD 10k+, datacenter 카드는 더 비싸죠. 한 VM이 *대부분의 시간* idle이면 ROI가 나쁩니다. 공유는:

- **Datacenter ROI** — 같은 FPGA를 4~16 tenant가 시분할
- **Cloud FPGA-as-a-service** — AWS F1, Alibaba/Tencent FPGA cloud
- **Multi-team usage** — 한 회사 안에서도 팀 단위 공유

FPGA는 partial reconfiguration(Ch 8) 덕분에 *영역별 다른 tenant*를 두는 게 자연스럽습니다.

## SR-IOV (Single Root I/O Virtualization)

PCIe 표준 기능. 하드웨어가 *Physical Function*(PF) 하나를 *여러 Virtual Function*(VF)으로 분할.

| 함수 | 역할 |
|------|------|
| **PF** | host에서 보이는 *진짜* device. FPGA 관리·VF 생성·partition reset |
| **VF** | *가상 device*. guest에 pass-through 가능. 자기만의 BAR·MSI-X |

VF 활성화:

```bash
echo 4 | sudo tee /sys/bus/pci/devices/0000:01:00.0/sriov_numvfs

lspci -d 10ee:
# 01:00.0  PF (Alveo U250)
# 01:00.1  VF0
# 01:00.2  VF1
# 01:00.3  VF2
# 01:00.4  VF3
```

각 VF를 *vfio-pci*에 바인딩(Ch 10과 동일) 후 다른 VM에 pass-through.

```bash
for vf in 01:00.1 01:00.2; do
    echo "10ee 5038" > /sys/bus/pci/drivers/vfio-pci/new_id   # VF device id (PF와 다름)
    echo 0000:$vf > /sys/bus/pci/drivers/vfio-pci/bind
done

# Guest A
qemu-system-x86_64 -enable-kvm -device vfio-pci,host=01:00.1 ...

# Guest B
qemu-system-x86_64 -enable-kvm -device vfio-pci,host=01:00.2 ...
```

## SR-IOV의 제약

- **`NumVFs`는 펌웨어가 정함** — runtime 변경 어려움. 보드 reset이 필요할 수도.
- **HW 지원 필수** — PCIe Spec의 SR-IOV capability + Xilinx/Intel FPGA shell의 PR + VF awareness.
- **per-VF resource limit** — 메모리·queue·throughput이 *나뉘어* 할당.

## mdev (Mediated Device)

SR-IOV가 HW 기능이라면 mdev는 *SW로* virtual function을 제공. **NVIDIA vGPU**가 대표적 사례.

| 항목 | SR-IOV VF | mdev |
|------|-----------|------|
| HW 지원 | 필수 | 불필요(PF만) |
| 동적 함수 수 | 펌웨어 결정 | runtime 결정 |
| 격리 | HW IOMMU group | SW + HW IOMMU |
| Driver | VF 별도 driver | parent + UUID 인스턴스 |

mdev에서는 *parent driver*가 같은 PF에서 *여러 mdev 인스턴스*를 만들어 냅니다.

```bash
PARENT=/sys/bus/pci/devices/0000:01:00.0

# 사용 가능한 mdev type 확인
ls $PARENT/mdev_supported_types/
# fpga-1q-256m  fpga-2q-512m  fpga-4q-1g

# UUID로 instance 생성
UUID=$(uuidgen)
echo $UUID | sudo tee $PARENT/mdev_supported_types/fpga-1q-256m/create

# 결과
ls /sys/bus/mdev/devices/$UUID

# Guest에 pass-through
qemu-system-x86_64 -enable-kvm \
    -device vfio-pci,sysfsdev=/sys/bus/mdev/devices/$UUID ...
```

mdev type 이름(`fpga-1q-256m`)이 *resource profile*을 담습니다 — "1 queue, 256MB memory". vendor가 type을 정의해 두면 admin은 *적절한 type*을 골라 mdev 생성.

## Scalable IOV (S-IOV) — Intel의 발전형

Intel의 **S-IOV**는 mdev를 발전시킨 *수만 개 가상 함수*를 가능하게 합니다. PCIe ATS(Address Translation Service) + PASID(Process Address Space ID)를 결합.

| 항목 | SR-IOV | S-IOV |
|------|--------|-------|
| 최대 VF | 256 (PCIe Spec) | 65535+ |
| PASID 사용 | 안 함 | 핵심 |
| Granularity | function | task |

S-IOV는 PCIe Deep Dive 시리즈에서 자세히 다룹니다.

## FPGA-specific patterns

vendor framework이 SR-IOV·mdev를 어떻게 활용하는지.

### Xilinx XRT VF

XRT는 PF가 *shell 관리*, VF가 *user logic slot* 담당. Ch 13에서 자세히.

```text
PF (xclmgmt) — shell management, PR controller
VF1 (xocl)   — User logic slot 1 (tenant A)
VF2 (xocl)   — User logic slot 2 (tenant B)
...
```

### Intel OPAE + DFL AFU

OPAE는 PF가 *PR region 관리*, mdev나 VF가 *AFU*(Accelerated Function Unit) 단위로 노출. Ch 12에서 자세히.

## Driver — PF SR-IOV configuration

```c
static int my_fpga_pf_sriov_configure(struct pci_dev *pdev, int num_vfs) {
    int ret;

    if (num_vfs > MAX_VFS) return -EINVAL;

    if (num_vfs == 0) {
        pci_disable_sriov(pdev);
        return 0;
    }

    /* HW partition — 각 VF에 user logic slot 할당 */
    my_fpga_setup_vf_partitions(pdev, num_vfs);

    ret = pci_enable_sriov(pdev, num_vfs);
    return ret < 0 ? ret : num_vfs;
}

static struct pci_driver my_fpga_pf_driver = {
    .name           = "my-fpga-pf",
    .id_table       = pf_id_table,
    .probe          = my_fpga_pf_probe,
    .sriov_configure = my_fpga_pf_sriov_configure,
};
```

userspace에서 `echo 4 > sriov_numvfs`를 쓰면 kernel이 `sriov_configure(4)`를 호출합니다.

## VF driver — 일반 PCI driver

VF는 자기만의 vendor/device ID를 가집니다.

```c
static const struct pci_device_id vf_id_table[] = {
    { PCI_DEVICE(0x10ee, 0x5038) },   /* VF id, PF와 다름 */
    { }
};

static struct pci_driver my_fpga_vf_driver = {
    .name     = "my-fpga-vf",
    .id_table = vf_id_table,
    .probe    = my_fpga_vf_probe,
};
```

VF driver는 *PF의 기능 일부만* 접근 가능 — partition 안의 user logic, 자기 채널, 자기 IRQ.

## Performance isolation — QoS

여러 tenant가 같은 FPGA를 쓰면 *한 tenant가 자원을 독점*하지 않도록 QoS가 필요합니다.

- **Bandwidth cap** — VF당 DMA throughput 제한
- **Queue limit** — VF당 descriptor ring 깊이
- **Memory cap** — VF당 HBM/DDR allocation
- **Power throttle** — 발열·전력 균등

vendor shell이 이 정책을 implementation, driver(PF)가 set up.

## Cloud FPGA 예시

| 서비스 | FPGA | 공유 메커니즘 |
|--------|------|----------------|
| AWS F1 (f1.16xlarge) | UltraScale+ x8 | per-instance dedicated (공유 X) |
| AWS F2 | (announced) | dedicated |
| Azure NP-series | Stratix 10 | dedicated |
| GCP FPGA | (limited preview) | dedicated |
| Alibaba/Tencent | varies | SR-IOV multi-tenant |

대부분의 cloud는 *현재* 보드 단위 dedicated이지만, *multi-tenant FPGA*가 차세대 표준으로 가고 있습니다 — 가격 격차가 크기 때문.

## Cloud FPGA tenancy 시각

```text
Single FPGA card (Alveo U250)
┌────────────────────────────────────────┐
│  Static Shell (PF) — DMA, mgmt         │
│ ────────────────────────────────────── │
│  DFX Region 1 — Tenant A's NPU         │
│ ────────────────────────────────────── │
│  DFX Region 2 — Tenant B's encoder     │
│ ────────────────────────────────────── │
│  DFX Region 3 — Tenant C's HFT engine  │
│ ────────────────────────────────────── │
│  DFX Region 4 — (empty / future)       │
└────────────────────────────────────────┘
```

각 tenant는 *자기 region + 자기 VF*만 봅니다. Ch 8의 PR과 Ch 11의 SR-IOV가 *합쳐져* multi-tenant FPGA가 됩니다.

## 흔한 함정

- **VF 활성 시 PF reset** — 일부 FPGA는 sriov_numvfs 변경 시 *PF가 잠시 reset*. 운영 중이라면 maintenance window 필요.
- **mdev type 부재** — vendor driver가 mdev 정의 안 해 두면 사용 불가.
- **ACS 없는 메인보드** — VF가 *같은 group*으로 묶여 격리 깨짐. ACS 확인.
- **NumVFs > MaxVFs** — 펌웨어 한도 초과. lspci에서 ` SR-IOV Capability` 안의 InitialVFs·TotalVFs 확인.

## 정리

- **SR-IOV**: PCIe 표준. PF 1 + VF 다수. HW partition 필요. `sriov_numvfs`로 활성.
- **mdev**: SW 기반. parent driver가 type별로 인스턴스 생성. NVIDIA vGPU가 대표.
- **S-IOV**: Intel의 확장. PASID로 *수만 개* 가상 함수 가능.
- **XRT VF**·**OPAE AFU**·**DFL** — FPGA vendor framework이 SR-IOV·mdev를 활용해 multi-tenant 구현.
- driver: PF는 `sriov_configure` 구현, VF는 일반 PCI driver. resource partition은 vendor shell에서.
- **Multi-tenant FPGA** = PR(Ch 8) + SR-IOV(Ch 11). datacenter cloud FPGA의 표준.
- QoS·bandwidth cap·power throttle이 production 운영의 핵심.

## 다음 장 예고

다음 장은 *Intel FPGA의 management 스택* — **OPAE + DFL framework**입니다. Bitstream에 metadata가 포함된 DFL이 driver를 *어떻게 자동 discovery*하게 만드는지를 봅니다.

## 관련 항목

- [Ch 10: VFIO-PCI 패스스루](/blog/tools/emulation/qemu-fpga-driver/chapter10-vfio-pci-passthrough)
- [Ch 12: OPAE·DFL Framework](/blog/tools/emulation/qemu-fpga-driver/chapter12-opae-dfl)
- [Ch 13: Xilinx XRT 스택](/blog/tools/emulation/qemu-fpga-driver/chapter13-xilinx-xrt)
- [PCIe Deep Dive — SR-IOV](/blog/embedded/hardware/pcie/chapter01-fundamentals)
