---
title: "Ch 8: 리눅스 드라이버 작성"
date: 2026-05-17T08:00:00
description: "가상 디바이스용 리눅스 PCI 드라이버를 작성한다."
tags: [QEMU, Linux, Driver, kernel-module, ioctl, sysfs]
series: "QEMU Fake Device Driver"
seriesOrder: 8
draft: true
---

지금까지 QEMU 측 device를 만들었으니, 이제 *Linux driver*를 작성합니다. PCI probe·BAR mapping·IRQ 등록·user-space 노출까지 *완전한 driver*를 만들어 *insmod 후 동작* 확인합니다.

## driver 골격

```c
/* my_pci_driver.c */
#include <linux/module.h>
#include <linux/pci.h>
#include <linux/interrupt.h>
#include <linux/cdev.h>
#include <linux/uaccess.h>

#define DRV_NAME "my_pci"
#define MSIX_VECTORS 8

struct my_dev {
    struct pci_dev *pdev;
    void __iomem *mmio;

    struct vec_data {
        struct my_dev *dev;
        int idx;
        u32 pending;
    } vec[MSIX_VECTORS];

    /* char device 노출 */
    struct cdev cdev;
    dev_t devt;
    struct class *class;
    struct device *device;

    struct completion done;
};

#define IDENT_MAGIC 0x46414b45   /* "FAKE" */

static int my_pci_probe(struct pci_dev *pdev, const struct pci_device_id *id);
static void my_pci_remove(struct pci_dev *pdev);

static const struct pci_device_id my_pci_ids[] = {
    { PCI_DEVICE(0x1234, 0x5678) },
    { 0 }
};
MODULE_DEVICE_TABLE(pci, my_pci_ids);

static struct pci_driver my_pci_driver = {
    .name     = DRV_NAME,
    .id_table = my_pci_ids,
    .probe    = my_pci_probe,
    .remove   = my_pci_remove,
};

module_pci_driver(my_pci_driver);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Your Name");
MODULE_DESCRIPTION("My fake PCI driver");
```

`module_pci_driver`가 *init/exit boilerplate*를 자동 생성.

## probe — device 초기화

```c
static int my_pci_probe(struct pci_dev *pdev,
                         const struct pci_device_id *id) {
    struct my_dev *d;
    int ret;

    d = devm_kzalloc(&pdev->dev, sizeof(*d), GFP_KERNEL);
    if (!d) return -ENOMEM;

    d->pdev = pdev;
    init_completion(&d->done);
    pci_set_drvdata(pdev, d);

    /* 1. enable */
    ret = pci_enable_device(pdev);
    if (ret) return ret;

    pci_set_master(pdev);

    /* 2. BAR0 mapping */
    ret = pci_request_regions(pdev, DRV_NAME);
    if (ret) goto err_disable;

    d->mmio = pci_iomap(pdev, 0, 0);
    if (!d->mmio) {
        ret = -EIO;
        goto err_release;
    }

    /* 3. IDENT 확인 */
    u32 ident = readl(d->mmio + REG_IDENT);
    if (ident != IDENT_MAGIC) {
        dev_err(&pdev->dev, "bad IDENT 0x%x\n", ident);
        ret = -ENODEV;
        goto err_unmap;
    }

    dev_info(&pdev->dev, "device version 0x%x\n",
             readl(d->mmio + REG_VERSION));

    /* 4. MSI-X */
    ret = my_setup_irq(d);
    if (ret) goto err_unmap;

    /* 5. DMA mask */
    ret = dma_set_mask_and_coherent(&pdev->dev, DMA_BIT_MASK(64));
    if (ret) goto err_free_irq;

    /* 6. char device 생성 */
    ret = my_create_chardev(d);
    if (ret) goto err_free_irq;

    /* 7. device 활성 */
    writel(CTRL_ENABLE, d->mmio + REG_CTRL);
    writel(0, d->mmio + REG_INTR_MASK);

    dev_info(&pdev->dev, "probed\n");
    return 0;

err_free_irq:
    /* ... cleanup ... */
err_unmap:
    pci_iounmap(pdev, d->mmio);
err_release:
    pci_release_regions(pdev);
err_disable:
    pci_disable_device(pdev);
    return ret;
}
```

각 단계가 *역순으로* cleanup되어야 함. `devm_*` 사용으로 *일부 자동화*.

## remove — cleanup

```c
static void my_pci_remove(struct pci_dev *pdev) {
    struct my_dev *d = pci_get_drvdata(pdev);

    writel(0, d->mmio + REG_CTRL);    /* disable */

    my_remove_chardev(d);

    for (int v = 0; v < MSIX_VECTORS; v++) {
        free_irq(pci_irq_vector(pdev, v), &d->vec[v]);
    }
    pci_free_irq_vectors(pdev);

    pci_iounmap(pdev, d->mmio);
    pci_release_regions(pdev);
    pci_disable_device(pdev);
}
```

probe의 *역순*.

## IRQ setup

```c
static irqreturn_t my_hard_irq(int irq, void *dev_id) {
    struct vec_data *vd = dev_id;
    u32 pending = readl(vd->dev->mmio + REG_INTR_STATUS);
    if (!pending) return IRQ_NONE;

    writel(pending, vd->dev->mmio + REG_INTR_STATUS);   /* W1C */
    vd->pending = pending;
    return IRQ_WAKE_THREAD;
}

static irqreturn_t my_threaded_irq(int irq, void *dev_id) {
    struct vec_data *vd = dev_id;
    if (vd->pending & INTR_DONE) {
        complete(&vd->dev->done);
    }
    return IRQ_HANDLED;
}

static int my_setup_irq(struct my_dev *d) {
    int n = pci_alloc_irq_vectors(d->pdev, MSIX_VECTORS, MSIX_VECTORS,
                                   PCI_IRQ_MSIX);
    if (n < MSIX_VECTORS) return -ENOSPC;

    for (int v = 0; v < n; v++) {
        d->vec[v].dev = d;
        d->vec[v].idx = v;
        int irq = pci_irq_vector(d->pdev, v);
        int ret = request_threaded_irq(irq, my_hard_irq, my_threaded_irq,
                                        IRQF_SHARED, DRV_NAME, &d->vec[v]);
        if (ret) return ret;
    }
    return 0;
}
```

## Char device — user-space 노출

```c
static int my_open(struct inode *ino, struct file *filp) {
    struct my_dev *d = container_of(ino->i_cdev, struct my_dev, cdev);
    filp->private_data = d;
    return 0;
}

#define IOCTL_DMA_XFER _IOWR('M', 1, struct my_xfer_arg)

struct my_xfer_arg {
    __u64 in_addr;
    __u64 out_addr;
    __u32 len;
};

static long my_ioctl(struct file *filp, unsigned cmd, unsigned long arg) {
    struct my_dev *d = filp->private_data;
    struct my_xfer_arg req;

    switch (cmd) {
    case IOCTL_DMA_XFER:
        if (copy_from_user(&req, (void __user *)arg, sizeof(req)))
            return -EFAULT;
        return my_dma_xfer(d, req.in_addr, req.out_addr, req.len);
    }
    return -ENOTTY;
}

static const struct file_operations my_fops = {
    .owner = THIS_MODULE,
    .open  = my_open,
    .unlocked_ioctl = my_ioctl,
};

static int my_create_chardev(struct my_dev *d) {
    int ret = alloc_chrdev_region(&d->devt, 0, 1, DRV_NAME);
    if (ret) return ret;

    cdev_init(&d->cdev, &my_fops);
    ret = cdev_add(&d->cdev, d->devt, 1);
    if (ret) goto err_unreg;

    d->class = class_create(THIS_MODULE, DRV_NAME);
    d->device = device_create(d->class, NULL, d->devt, NULL, "my0");
    return 0;
err_unreg:
    unregister_chrdev_region(d->devt, 1);
    return ret;
}
```

guest에서 `/dev/my0`이 생김. `open(2)` + `ioctl(2)`로 user-space 접근.

## sysfs 노출

device 정보를 `/sys/class/my_pci/my0/`에 노출.

```c
static ssize_t version_show(struct device *dev,
                             struct device_attribute *attr, char *buf) {
    struct my_dev *d = dev_get_drvdata(dev);
    u32 ver = readl(d->mmio + REG_VERSION);
    return sprintf(buf, "0x%08x\n", ver);
}
static DEVICE_ATTR_RO(version);

static struct attribute *my_attrs[] = {
    &dev_attr_version.attr,
    NULL,
};
ATTRIBUTE_GROUPS(my);
```

probe에서 `sysfs_create_groups`. guest에서 `cat /sys/class/.../version`.

## debugfs

debug 용 — `/sys/kernel/debug/my_pci/`.

```c
static int my_regs_show(struct seq_file *m, void *v) {
    struct my_dev *d = m->private;
    seq_printf(m, "CTRL:        0x%08x\n", readl(d->mmio + REG_CTRL));
    seq_printf(m, "STATUS:      0x%08x\n", readl(d->mmio + REG_INTR_STATUS));
    return 0;
}
DEFINE_SHOW_ATTRIBUTE(my_regs);

debugfs_create_file("regs", 0444, d->dbg_dir, d, &my_regs_fops);
```

`cat /sys/kernel/debug/my_pci/regs`로 register dump.

## 빌드 — out-of-tree

```text
# Makefile
obj-m := my_pci_driver.o

KDIR ?= /lib/modules/$(shell uname -r)/build

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean
```

```bash
make
ls *.ko
# my_pci_driver.ko
```

## guest에서 사용

```bash
# 1. driver insmod
sudo insmod my_pci_driver.ko

# 2. dmesg 확인
sudo dmesg | tail
# my_pci 0000:00:04.0: device version 0x00010000
# my_pci 0000:00:04.0: probed

# 3. /dev/my0 확인
ls -la /dev/my0
# crw------- 1 root root 245, 0 ... /dev/my0

# 4. user-space test
sudo ./my_test
```

## user-space test 프로그램

```c
/* my_test.c */
#include <stdio.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <sys/mman.h>

int main(void) {
    int fd = open("/dev/my0", O_RDWR);
    /* ... ioctl로 DMA xfer ... */
    close(fd);
}
```

driver와 user-space의 *full stack*이 *수십 줄*에.

## Multi-instance handling

같은 device가 여러 개면 *cdev region* 등을 *device 단위*로.

```c
static atomic_t my_dev_counter = ATOMIC_INIT(0);

int idx = atomic_inc_return(&my_dev_counter) - 1;
device_create(d->class, NULL, MKDEV(MAJOR(d->devt), idx), NULL, "my%d", idx);
```

`/dev/my0`·`/dev/my1`·... 식으로.

## 흔한 함정

- **probe error 시 cleanup 누락** — partial state로 다음 probe시 충돌. *역순 cleanup* 엄격.
- **IRQ handler에서 mutex** — sleeping 함수 호출 시 deadlock. spinlock 사용.
- **DMA mask 누락** — 64-bit DMA addr이 *32-bit로 잘림*. `dma_set_mask_and_coherent(64)`.
- **module unload 시 dangling pointer** — user-space가 `/dev/my0` open한 상태에서 unload. usage count로 보호.

## 정리

- Linux PCI driver의 *표준 구조*: `pci_driver` 등록 → probe/remove callback.
- **probe**: enable·BAR·IRQ·DMA·char dev 순. error 시 *역순 cleanup*.
- IRQ는 *hard + threaded* 두 단계. hard에서 clear, thread에서 work.
- **`/dev/my0`** (char device)로 user-space 노출. `ioctl`로 command.
- **sysfs**(`/sys/class/.../`)와 **debugfs**(`/sys/kernel/debug/.../`)로 정보·diagnostics.
- out-of-tree 빌드: `make M=$PWD modules`.
- multi-instance는 *atomic counter*로 식별.

## 다음 장 예고

다음 장은 *driver 디버깅* — GDB·tracepoint·dmesg·error injection을 총동원.

## 관련 항목

- [Ch 7: DMA 버퍼 처리](/blog/tools/emulation/qemu-fake-device/chapter07-dma)
- [Ch 9: 디버깅](/blog/tools/emulation/qemu-fake-device/chapter09-debugging)
- [QEMU Embedded — GDB Remote](/blog/tools/emulation/qemu-embedded/chapter10-gdb-remote)
- [FPGA Driver — IRQ Model](/blog/tools/emulation/qemu-fpga-driver/chapter05-irq-model)
