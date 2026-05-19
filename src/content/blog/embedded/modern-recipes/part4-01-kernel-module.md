---
title: "4-01: Kernel Module 레시피 — Char Device·Platform Driver·DKMS"
date: 2026-05-20T14:00:00
description: "Linux kernel module 작성. Char device, platform driver, devicetree match, DKMS 배포."
series: "Modern Embedded Recipes"
seriesOrder: 19
tags: [recipes, kernel-module, char-device, platform-driver, dkms]
draft: true
---

## 한 줄 요약

> **"Kernel module = .ko file로 동적 로드"** — driver·subsystem 추가의 표준.

## Hello World Module

```c
/* hello.c */
#include <linux/module.h>
#include <linux/init.h>

static int __init hello_init(void) {
    pr_info("hello: loaded\n");
    return 0;
}

static void __exit hello_exit(void) {
    pr_info("hello: unloaded\n");
}

module_init(hello_init);
module_exit(hello_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("name");
MODULE_DESCRIPTION("Hello world");
MODULE_VERSION("1.0");
```

```makefile
# Makefile
obj-m += hello.o

all:
	$(MAKE) -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules

clean:
	$(MAKE) -C /lib/modules/$(shell uname -r)/build M=$(PWD) clean
```

```bash
make
sudo insmod hello.ko
dmesg | tail   # "hello: loaded"
sudo rmmod hello
```

## Char Device

```c
#include <linux/cdev.h>
#include <linux/fs.h>

static dev_t dev_num;
static struct cdev my_cdev;
static struct class *my_class;

static ssize_t my_read(struct file *f, char __user *u, size_t s, loff_t *o) {
    char data[] = "Hello from kernel\n";
    size_t n = min(s, sizeof(data) - *o);
    if (n <= 0) return 0;
    if (copy_to_user(u, data + *o, n)) return -EFAULT;
    *o += n;
    return n;
}

static struct file_operations fops = {
    .owner = THIS_MODULE,
    .read = my_read,
};

static int __init mod_init(void) {
    alloc_chrdev_region(&dev_num, 0, 1, "mychar");
    cdev_init(&my_cdev, &fops);
    cdev_add(&my_cdev, dev_num, 1);
    my_class = class_create(THIS_MODULE, "mychar");
    device_create(my_class, NULL, dev_num, NULL, "mychar");
    return 0;
}

static void __exit mod_exit(void) {
    device_destroy(my_class, dev_num);
    class_destroy(my_class);
    cdev_del(&my_cdev);
    unregister_chrdev_region(dev_num, 1);
}
```

```bash
sudo insmod mychar.ko
cat /dev/mychar     # "Hello from kernel"
```

## Platform Driver — Devicetree Match

```c
#include <linux/platform_device.h>
#include <linux/of.h>

static int my_probe(struct platform_device *pdev) {
    struct device_node *np = pdev->dev.of_node;
    
    /* IRQ from DT */
    int irq = platform_get_irq(pdev, 0);
    
    /* MMIO from DT */
    void __iomem *base = devm_platform_ioremap_resource(pdev, 0);
    if (IS_ERR(base)) return PTR_ERR(base);
    
    /* GPIO */
    struct gpio_desc *led = devm_gpiod_get(&pdev->dev, "led", GPIOD_OUT_LOW);
    
    /* Property */
    u32 freq;
    of_property_read_u32(np, "clock-frequency", &freq);
    
    dev_info(&pdev->dev, "probed: irq=%d, freq=%u\n", irq, freq);
    return 0;
}

static int my_remove(struct platform_device *pdev) {
    dev_info(&pdev->dev, "removed\n");
    return 0;
}

static const struct of_device_id my_of_match[] = {
    { .compatible = "myco,mydev" },
    { },
};
MODULE_DEVICE_TABLE(of, my_of_match);

static struct platform_driver my_driver = {
    .probe = my_probe,
    .remove = my_remove,
    .driver = {
        .name = "mydev",
        .of_match_table = my_of_match,
    },
};
module_platform_driver(my_driver);
```

```dts
/* devicetree */
mydev@40000000 {
    compatible = "myco,mydev";
    reg = <0x40000000 0x1000>;
    interrupts = <0 42 4>;
    clock-frequency = <100000000>;
    led-gpios = <&gpio1 5 GPIO_ACTIVE_HIGH>;
};
```

## devm_ Family — 자동 Cleanup

```c
void *p = devm_kzalloc(&pdev->dev, size, GFP_KERNEL);
void __iomem *r = devm_ioremap(&pdev->dev, phys, size);
int rc = devm_request_irq(&pdev->dev, irq, isr, 0, "name", pdev);
struct gpio_desc *g = devm_gpiod_get(&pdev->dev, "name", GPIOD_OUT_LOW);
```

`devm_*` — driver unload·probe fail 시 *자동 release*. memory leak 회피.

## IRQ Handler

```c
static irqreturn_t my_isr(int irq, void *data) {
    struct my_dev *dev = data;
    
    /* Top half — short, ack */
    u32 status = readl(dev->base + STATUS_REG);
    writel(status, dev->base + ACK_REG);
    
    /* Bottom half — schedule */
    schedule_work(&dev->work);
    
    return IRQ_HANDLED;
}

/* Threaded IRQ — modern */
request_threaded_irq(irq, NULL, my_thread_isr,
                     IRQF_ONESHOT, "mydev", dev);
```

## kobject·sysfs

```c
static ssize_t my_show(struct device *d, struct device_attribute *a, char *buf) {
    return sprintf(buf, "%d\n", read_status());
}

static ssize_t my_store(struct device *d, struct device_attribute *a,
                         const char *buf, size_t count) {
    int val;
    sscanf(buf, "%d", &val);
    set_value(val);
    return count;
}

static DEVICE_ATTR(status, 0664, my_show, my_store);

device_create_file(&pdev->dev, &dev_attr_status);
```

```bash
cat /sys/devices/.../status
echo 42 > /sys/devices/.../status
```

## DKMS — Dynamic Kernel Module Support

```bash
# dkms.conf
PACKAGE_NAME="mydriver"
PACKAGE_VERSION="1.0"
BUILT_MODULE_NAME[0]="mydriver"
DEST_MODULE_LOCATION[0]="/kernel/drivers/misc"
AUTOINSTALL="yes"
MAKE[0]="make -C $kernel_source_dir M=$dkms_tree/$PACKAGE_NAME/$PACKAGE_VERSION/build"

# Install
sudo dkms add .
sudo dkms build mydriver/1.0
sudo dkms install mydriver/1.0

# Kernel update 시 자동 rebuild
```

DKMS — *kernel 변경 시 자동 rebuild*. NVIDIA·VirtualBox·Wireguard 표준 배포.

## Loadable vs Built-in

```text
Loadable (.ko):
  Y in Kconfig — module
  insmod·modprobe로 로드
  
Built-in (Y):
  Y — kernel image 안 컴파일
  부팅 시 자동 활성
```

```bash
# 현재 module 목록
lsmod

# 로드된 module info
modinfo mydriver
```

## Cross-Compile

```bash
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- \
     KERNEL_DIR=/path/to/kernel modules
```

임베디드 — *target kernel source* 같은 version으로 build.

## Locking — spin_lock·mutex

```c
static DEFINE_SPINLOCK(my_lock);
static DEFINE_MUTEX(my_mutex);

/* ISR-safe */
spin_lock_irqsave(&my_lock, flags);
critical();
spin_unlock_irqrestore(&my_lock, flags);

/* Sleep OK */
mutex_lock(&my_mutex);
critical();
mutex_unlock(&my_mutex);
```

ISR ↔ task — spinlock. Task-only — mutex.

## Sleeping

```c
msleep(100);                  /* 100 ms sleep */
usleep_range(50, 100);         /* 50-100 µs */

/* Wait queue */
DECLARE_WAIT_QUEUE_HEAD(my_wq);
wait_event_interruptible(my_wq, condition);

/* Wake from ISR */
wake_up_interruptible(&my_wq);
```

`schedule()`·`msleep` — ISR에서 *금지*.

## Memory Allocation

```c
void *p1 = kmalloc(size, GFP_KERNEL);   /* sleep OK */
void *p2 = kzalloc(size, GFP_KERNEL);   /* zeroed */
void *p3 = kmalloc(size, GFP_ATOMIC);   /* ISR safe */
void *p4 = vmalloc(size);                /* virtual contiguous, large */

kfree(p1);
vfree(p4);
```

`GFP_KERNEL` — page fault·sleep OK. `GFP_ATOMIC` — no sleep (ISR·spinlock).

## Module Parameters

```c
static int debug_level = 0;
module_param(debug_level, int, 0644);
MODULE_PARM_DESC(debug_level, "Debug verbosity 0-3");

static char *device_name = "default";
module_param(device_name, charp, 0444);

/* Load */
sudo insmod mydriver.ko debug_level=2 device_name=foo
```

`/sys/module/mydriver/parameters/debug_level`에 노출.

## ftrace·trace_events

```c
#define CREATE_TRACE_POINTS
#include <trace/events/my_subsys.h>

TRACE_EVENT(my_event,
    TP_PROTO(int val),
    TP_ARGS(val),
    TP_STRUCT__entry(__field(int, val)),
    TP_fast_assign(__entry->val = val;),
    TP_printk("value=%d", __entry->val)
);

trace_my_event(42);
```

```bash
echo 1 > /sys/kernel/debug/tracing/events/my_subsys/my_event/enable
cat /sys/kernel/debug/tracing/trace
```

## 자주 하는 실수

> ⚠️ GFP_KERNEL in ISR

```c
static irqreturn_t isr(int irq, void *data) {
    void *p = kmalloc(64, GFP_KERNEL);   /* ← sleep 가능, ISR fault */
}
```

→ `GFP_ATOMIC`.

> ⚠️ Mutex in spin_lock

```c
spin_lock(&l);
mutex_lock(&m);   /* sleep — deadlock 가능 */
```

→ spinlock 안 mutex 금지.

> ⚠️ devm_ 안 쓰고 leak

```c
char *p = kmalloc(...);
if (error) return -ENOMEM;   /* p 누수 */
```

→ devm_kmalloc 또는 명시 cleanup.

> ⚠️ Module dependency 누락

```bash
sudo insmod my.ko
# unknown symbol foo_function
```

→ 의존 module 먼저, 또는 `modprobe` (dependency 자동).

## 정리

- **Char device** + cdev·class — `/dev/mydev` 노출.
- **Platform driver** + devicetree match — 표준 SoC driver.
- **devm_*** — 자동 cleanup.
- **DKMS** — kernel update 자동 rebuild.
- spin_lock·mutex 구분, GFP_KERNEL·GFP_ATOMIC 구분.
- Module param·sysfs — runtime 통제.

다음 편은 **mmap·dma_buf**.

## 관련 항목

- [3-06: NEON 심화](/blog/embedded/modern-recipes/part3-06-neon)
- [4-02: mmap·dma_buf](/blog/embedded/modern-recipes/part4-02-mmap)
