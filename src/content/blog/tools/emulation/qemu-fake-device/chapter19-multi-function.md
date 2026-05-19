---
title: "Ch 19: Multi-Function PCI 디바이스"
date: 2026-05-17T19:00:00
description: "Function 분리·shared resource — multi-function PCI 패턴."
tags: [QEMU, multi-function, pci, mfd]
series: "QEMU Fake Device Driver"
seriesOrder: 19
draft: true
---

PCI device는 *function 8개*까지 가질 수 있습니다. 한 silicon에 *Ethernet + WiFi*, *NVMe + Management*, *XRT의 user + mgmt*처럼 *기능 분리*. 이 장은 multi-function device의 구현 패턴을 다룹니다.

## Function이란

PCI device의 BDF(Bus·Device·Function) 중 *function*.

```text
01:04.0   ← function 0
01:04.1   ← function 1
01:04.2   ← function 2
...
01:04.7
```

같은 device의 *function별*로 *별개 vendor/device ID*도 가능. 각자 *독립 driver* matching.

## 사용 사례

| device | function 0 | function 1 |
|--------|------------|------------|
| Wi-Fi + BT card | Wi-Fi (8086:24FB) | Bluetooth (8086:0029) |
| Realtek combo | Ethernet | Card reader |
| Xilinx XRT | xclmgmt (mgmt) | xocl (user) |
| BMC | NIC | KCS for IPMI |
| AI accelerator | compute (PF) | mgmt |

*독립 driver*가 *분리된 기능* 다룸. 같은 board의 *두 다른 device*인 셈.

## 두 함수 구현

```c
/* function 0 */
typedef struct MyMgmtState {
    PCIDevice parent_obj;
    MemoryRegion mmio;
    MyDeviceCommon *shared;   /* 공유 자원 */
} MyMgmtState;

/* function 1 */
typedef struct MyUserState {
    PCIDevice parent_obj;
    MemoryRegion mmio;
    MyDeviceCommon *shared;
} MyUserState;

/* 공유 자원 */
typedef struct MyDeviceCommon {
    uint32_t board_revision;
    QemuMutex lock;
    /* ... */
} MyDeviceCommon;
```

두 function이 *같은 backend*에 reference. PCI bridge가 *config space*를 *function 별로* 분리.

## Function bit 설정

```c
static void my_mgmt_realize(PCIDevice *pdev, Error **errp) {
    pdev->config[PCI_HEADER_TYPE] |= PCI_HEADER_TYPE_MULTI_FUNCTION;
    /* function 0 표시 */
}

static void my_user_realize(PCIDevice *pdev, Error **errp) {
    /* function 1: device function 정의 */
}
```

`PCI_HEADER_TYPE_MULTI_FUNCTION` bit가 *multi-function 활성*. function 0에 *반드시* 설정.

## CLI attach

```bash
qemu-system-x86_64 \
    -device my-mgmt,addr=04.0,multifunction=on \
    -device my-user,addr=04.1
```

`addr=04.1`이 *function 1*. PCI tree에 *같은 device·다른 function*으로.

## 공유 자원 접근

```c
static void mgmt_command(MyMgmtState *s, int cmd) {
    qemu_mutex_lock(&s->shared->lock);
    /* shared resource 접근 */
    qemu_mutex_unlock(&s->shared->lock);
}

static void user_command(MyUserState *s, int cmd) {
    qemu_mutex_lock(&s->shared->lock);
    /* same shared resource */
    qemu_mutex_unlock(&s->shared->lock);
}
```

mutex로 *race 방지*. 두 function이 *같은 hardware backend*를 보므로 필수.

## Linux MFD framework

guest에서 *연관된 sub-device*를 *공통 driver tree*로 관리하려면 **MFD**(Multi-Function Device) framework.

```c
/* drivers/mfd/my_mfd.c */
static struct mfd_cell my_subdevs[] = {
    { .name = "my-uart-subdev" },
    { .name = "my-gpio-subdev" },
    { .name = "my-i2c-subdev" },
};

static int my_mfd_probe(struct pci_dev *pdev, const struct pci_device_id *id) {
    /* PCI device 한 개 */
    /* 그러나 N개 sub-device가 동시 */
    return mfd_add_devices(&pdev->dev, PLATFORM_DEVID_AUTO,
                            my_subdevs, ARRAY_SIZE(my_subdevs),
                            NULL, 0, NULL);
}
```

각 sub-device가 *자기 driver*로 binding. 한 SoC의 *여러 internal block*을 *각자 다른 driver*로 매핑.

## XRT 같은 분리

Xilinx XRT의 mgmt·user function 분리(FPGA Driver Ch 13)가 *production 예시*. QEMU에서 가짜 XRT를 *완전히* 모사할 수 있습니다 — function 0(xclmgmt)와 function 1(xocl) 분리.

## Multi-function vs SR-IOV

| 항목 | Multi-function | SR-IOV |
|------|----------------|--------|
| 함수 수 | 최대 8 | 최대 256 |
| 식별 | 각자 vendor/device ID | 동일 (VF는 별도 ID) |
| 자원 | 공유 또는 분리 | 분리 |
| 사용 | 기능 분리 | 가상화 |

multi-function은 *static* (compile time), SR-IOV는 *runtime numvfs*.

## ARI — Alternative Routing-ID

PCIe의 ARI는 *256 function*까지 지원. 표준 *8 function* 제한 제거.

```c
pcie_ari_init(pdev, 0x150, 0);
```

modern SR-IOV이 ARI 기반.

## VF in multi-function

multi-function PF + SR-IOV VF 조합도 가능.

```text
01:04.0  PF0 (mgmt)
01:04.1  PF1 (user)
01:04.2  VF of PF1
01:04.3  VF of PF1
...
```

복잡하지만 *real datacenter*가 정확히 이 layout.

## Configuration space 격리

각 function이 *256B independent config space*. capability·BAR이 *각자 분리*.

```c
/* mgmt config */
mgmt_pdev->config[PCI_INTERRUPT_PIN] = 1;   /* INTA */

/* user config */
user_pdev->config[PCI_INTERRUPT_PIN] = 2;   /* INTB */
```

INTx routing도 *function별 다른 line* 가능.

## driver binding

```c
/* mgmt driver */
static const struct pci_device_id mgmt_ids[] = {
    { PCI_DEVICE(0x1234, 0x5678) },
    { 0 }
};
static struct pci_driver mgmt_driver = {
    .name = "my-mgmt",
    .id_table = mgmt_ids,
    .probe = mgmt_probe,
};

/* user driver — 별도 module */
static const struct pci_device_id user_ids[] = {
    { PCI_DEVICE(0x1234, 0x5679) },
    { 0 }
};
static struct pci_driver user_driver = {
    .name = "my-user",
    .id_table = user_ids,
    .probe = user_probe,
};
```

두 module을 *각자 load*. 또는 한 module에 *두 driver* 등록.

## Cross-function communication

function A가 *function B의 status*를 알고 싶을 때. *direct memory access* 또는 *shared sysfs*.

```c
/* user 측 — mgmt의 sysfs 접근 */
struct device *mgmt_dev = bus_find_device_by_name(&pci_bus_type, NULL, "0000:01:04.0");
const char *status;
device_property_read_string(mgmt_dev, "board-status", &status);
```

또는 *MFD core*가 cross-function communication 제공.

## 흔한 함정

- **PCI_HEADER_TYPE_MULTI_FUNCTION 누락** — function 0에 *반드시* set. 안 그러면 *function 1~7 미보임*.
- **공유 자원 race** — mutex 누락. data corruption.
- **driver load 순서** — user driver가 mgmt 의존. mgmt가 *먼저 probe* 보장.
- **PCIe ARI 미지원 host** — old chipset은 8 function 한도. fallback.

## 정리

- PCI device는 최대 *8 function*. modern PCIe + ARI로 *256*.
- `PCI_HEADER_TYPE_MULTI_FUNCTION` flag가 multi-function 활성.
- 각 function이 *독립 vendor/device ID*·*config space*·*BAR*.
- 공유 자원은 *common state struct*에 mutex로 보호.
- Linux의 **MFD framework**로 한 PCI에서 N sub-device 노출.
- XRT(mgmt/user)·Wi-Fi+BT가 production 예시.
- multi-function + SR-IOV 조합으로 *복잡한 cloud topology*.
- driver는 *function별 module* 또는 한 module에 *N pci_driver*.

## 다음 장 예고

다음 장은 *runtime device dynamics* — **hot-plug/unplug**.

## 관련 항목

- [Ch 18: Performance Modeling](/blog/tools/emulation/qemu-fake-device/chapter18-performance-modeling)
- [Ch 20: Hotplug](/blog/tools/emulation/qemu-fake-device/chapter20-hotplug)
- [FPGA Driver — Xilinx XRT](/blog/tools/emulation/qemu-fpga-driver/chapter13-xilinx-xrt)
