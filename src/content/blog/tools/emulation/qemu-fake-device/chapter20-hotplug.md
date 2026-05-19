---
title: "Ch 20: 핫플러그/핫언플러그"
date: 2026-05-17T20:00:00
description: "device_add·device_del·refcount — runtime device dynamics."
tags: [QEMU, hotplug, pcie, hot-add]
series: "QEMU Fake Device Driver"
seriesOrder: 20
draft: true
---

production cloud는 *VM 실행 중* device를 *add/remove*합니다. NVMe disk attach·NIC reassign·GPU scaling. driver가 *probe·remove를 자주* 거치는 환경에서 *atomic state·resource cleanup·in-flight handling*이 critical.

## Hot-plug 흐름

```text
1. QMP: device_add my-pci-device,id=hot0
        │
2. QEMU: PCIDevice 생성 + realize
        │
3. PCIe slot에 *hot plug event* 발사
        │
4. Guest kernel: PCI hotplug notification
        │
5. Guest: PCI scan → my_pci_probe 호출
        │
6. Driver: 정상 probe sequence (Ch 8)
```

guest 입장에서는 *동적으로 device 출현*. PCIe spec의 hot-plug capability가 표준화.

## QMP — device_add

```text
{ "execute": "device_add",
  "arguments": {
    "driver": "my-pci-device",
    "id": "hot0",
    "bus": "pcie.0"
  } }
```

또는 monitor:

```text
(qemu) device_add my-pci-device,id=hot0
```

guest에서 *수 ms* 안에 device 인식.

## QMP — device_del

```text
{ "execute": "device_del", "arguments": { "id": "hot0" } }
```

```text
(qemu) device_del hot0
```

guest의 *remove path* 호출. driver의 `my_pci_remove` 실행.

## device 등록 — hotplug 가능 표시

```c
static void my_pci_class_init(ObjectClass *klass, void *data) {
    DeviceClass *dc = DEVICE_CLASS(klass);
    PCIDeviceClass *pc = PCI_DEVICE_CLASS(klass);

    /* ... */
    pc->realize = my_pci_realize;

    /* hot-plug 지원 */
    dc->hotpluggable = true;
}
```

기본 PCIe device는 hotpluggable. 명시적으로 *비활성*하는 device(예: legacy ISA)도 있음.

## Guest 측 — driver remove 흐름

```c
static void my_pci_remove(struct pci_dev *pdev) {
    struct my_dev *d = pci_get_drvdata(pdev);

    /* 1. 신규 작업 차단 */
    atomic_set(&d->shutting_down, 1);

    /* 2. in-flight 작업 drain */
    drain_pending_requests(d);

    /* 3. IRQ free */
    free_irq(...);
    pci_free_irq_vectors(pdev);

    /* 4. char dev remove */
    device_destroy(d->class, d->devt);
    cdev_del(&d->cdev);

    /* 5. BAR unmap */
    pci_iounmap(pdev, d->mmio);
    pci_release_regions(pdev);

    /* 6. disable */
    pci_disable_device(pdev);
}
```

*역순 cleanup*. *in-flight 처리*가 critical.

## Atomic state

remove 중에 *user-space가 ioctl* 호출하면 위험.

```c
static long my_ioctl(struct file *filp, unsigned cmd, unsigned long arg) {
    struct my_dev *d = filp->private_data;

    if (atomic_read(&d->shutting_down)) {
        return -ENODEV;
    }

    /* 작업 수행 */
}
```

`shutting_down` flag로 *새 작업 차단*. 진행 중인 작업은 *완료 대기*.

## Refcount 보호

```c
static int my_open(struct inode *ino, struct file *filp) {
    struct my_dev *d = container_of(...);
    if (!atomic_inc_not_zero(&d->refcount)) {
        return -ENODEV;
    }
    filp->private_data = d;
    return 0;
}

static int my_release(struct inode *ino, struct file *filp) {
    struct my_dev *d = filp->private_data;
    if (atomic_dec_and_test(&d->refcount)) {
        /* 마지막 reference */
        cleanup_dev(d);
    }
    return 0;
}
```

refcount 0될 때까지 *cleanup 보류*. user-space가 open한 상태에서 *remove 시도*하면 *defer*.

## Surprise removal

cloud 환경에서 *VM 외부 trigger*로 device 사라짐.

```text
(qemu) device_del hot0
   ↓ (guest kernel context 무관)
guest의 driver:
   - request 진행 중
   - DMA in-flight
   - IRQ pending
```

driver는 *모든 진행 중 작업*을 *graceful*하게 fail. *kernel panic 절대 금지*.

## DMA in-flight 처리

```c
static void my_pci_remove(struct pci_dev *pdev) {
    /* ... */

    /* DMA in-flight 완료 대기 */
    while (atomic_read(&d->dma_in_flight) > 0) {
        msleep(10);
        if (timeout--) {
            dev_warn(...);
            break;
        }
    }

    /* DMA buffer free */
    dma_free_coherent(...);
}
```

timeout 후 *강제 cleanup*도 가능. memory leak 감수.

## PCIe hot-plug capability

QEMU는 PCIe root port가 *hot-plug capable*. PCIe spec의 *Slot Capabilities·Slot Status* register가 정상 동작.

```bash
# guest에서
guest$ lspci -vvv -s 00:01.0
00:01.0 PCI bridge: ...
    PCIe Cap: HotPlug+ ...
    Slot Cap: ...
```

guest의 PCI hotplug driver가 이 capability를 *발견하면 자동* 처리.

## SHPC vs PCIe Native

| Type | 사용 |
|------|------|
| **PCIe Native Hotplug** | modern, slot capability 기반 |
| **SHPC** (Standard Hot-Plug Controller) | legacy PCI |
| **ACPI Hotplug** | x86 specific, BIOS 통합 |

QEMU는 모두 지원. modern QEMU machine(`q35`)은 PCIe Native가 기본.

## Power management 통합

remove 중에 device의 *current state*가 의미. *active state*에서 갑작스러운 unplug는 위험.

```c
static int my_pci_suspend(struct device *dev) {
    struct my_dev *d = dev_get_drvdata(dev);
    /* save state */
    return 0;
}

static int my_pci_resume(struct device *dev) {
    struct my_dev *d = dev_get_drvdata(dev);
    /* restore state */
    return 0;
}

static SIMPLE_DEV_PM_OPS(my_pci_pm_ops, my_pci_suspend, my_pci_resume);
```

PCI suspend/resume이 정상 동작해야 hot-plug도 안전.

## Test scenario

```bash
# Test loop
while true; do
    qmp_cmd 'device_add my-pci-device,id=hot0'
    sleep 1
    guest_cmd 'insmod my_pci_driver.ko'
    guest_cmd 'run_test'
    guest_cmd 'rmmod my_pci_driver'
    qmp_cmd 'device_del hot0'
    sleep 1
done
```

100~1000회 반복 → *resource leak* 또는 *crash* 감지.

## Reset on add

새로 attached된 device는 *clean state*. realize에서 reset.

```c
static void my_pci_realize(...) {
    /* ... */
    my_pci_reset(DEVICE(s));   /* 명시적 reset */
}
```

re-add 시나리오에서 *이전 state*가 *오염되지 않게*.

## VM migration + hot-plug

migration 중에 *plug 상태* 일치 필요.

| 상태 | source | destination |
|------|--------|-------------|
| not plugged | -device 없음 | -device 없음 |
| plugged | -device my-pci-device | -device my-pci-device |
| hot-plug in transit | ??? | ??? |

대부분 *migration 시 hot-plug 정지*. mid-migration plug/unplug 비지원.

## 흔한 함정

- **dangling user-space fd** — driver remove 후에도 *user-space가 fd open*. refcount로 보호.
- **PCIe root port 부족** — q35는 *기본 1개 root port*. hot-plug 시 `pcie-root-port` 추가.
- **module ref count** — `try_module_get` 누락 시 *driver unload*가 *device probe 중*에 발생.
- **IRQ in-flight** — remove 도중 IRQ가 *이미 dispatched*. handler가 *device 무효 검사* 필요.

## 정리

- Hot-plug로 *VM 실행 중* device add/remove. cloud의 표준.
- QMP `device_add`/`device_del`로 trigger. guest는 *PCIe slot event*로 인식.
- driver의 `remove` callback이 *probe의 역순*. in-flight 처리·refcount·atomic state.
- **PCIe Native Hotplug**(modern) vs SHPC(legacy) vs ACPI Hotplug(x86).
- *Surprise removal*에 *graceful*하게 fail. panic 금지.
- DMA in-flight·user-space fd·IRQ pending이 *critical race*.
- Test: hot-plug loop 1000회로 *leak·crash* 감지.

## 다음 장 예고

다음 장은 *advanced error reporting* — **AER**(Advanced Error Reporting) emulation.

## 관련 항목

- [Ch 19: Multi-Function PCI](/blog/tools/emulation/qemu-fake-device/chapter19-multi-function)
- [Ch 21: AER Emulation](/blog/tools/emulation/qemu-fake-device/chapter21-aer-emulation)
- [QEMU Internals — Migration](/blog/tools/emulation/qemu-internals/chapter10-migration)
