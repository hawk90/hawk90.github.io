---
title: "4-05: sysfs·debugfs·procfs — Kernel ↔ Userspace 통신"
date: 2026-05-20T18:00:00
description: "sysfs (device attribute), debugfs (debug), procfs (process info). Driver tuning, monitoring."
series: "Modern Embedded Recipes"
seriesOrder: 23
tags: [recipes, sysfs, debugfs, procfs, kernel-userspace]
draft: true
---

## 한 줄 요약

> **"sysfs = device, debugfs = debug, procfs = process info"** — kernel/user 인터페이스 3종.

## sysfs — Device 속성 노출

```text
/sys/class/        — device class
/sys/devices/       — device tree
/sys/bus/           — bus type (pci, i2c, etc.)
/sys/module/        — loaded modules
/sys/firmware/      — firmware info
/sys/kernel/        — kernel settings
```

```bash
# CPU frequency
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
# performance

# GPIO
ls /sys/class/gpio/
# gpiochip0  export  unexport

# Network
cat /sys/class/net/eth0/speed
# 1000

# Thermal
cat /sys/class/thermal/thermal_zone0/temp
# 45000  (°C × 1000)

# Block
cat /sys/block/sda/queue/scheduler
# [mq-deadline] kyber bfq none
```

각 driver가 *attribute file* 노출.

## sysfs Attribute — Driver 측

```c
/* Show — read */
static ssize_t my_show(struct device *dev, struct device_attribute *attr,
                        char *buf) {
    struct my_data *d = dev_get_drvdata(dev);
    return sprintf(buf, "%d\n", d->value);
}

/* Store — write */
static ssize_t my_store(struct device *dev, struct device_attribute *attr,
                         const char *buf, size_t count) {
    struct my_data *d = dev_get_drvdata(dev);
    int v;
    if (kstrtoint(buf, 10, &v)) return -EINVAL;
    d->value = v;
    return count;
}

static DEVICE_ATTR(value, 0664, my_show, my_store);
                         /* mode  read    write */

/* Probe */
device_create_file(&pdev->dev, &dev_attr_value);
```

```bash
cat /sys/devices/.../value     # show 호출
echo 42 > /sys/devices/.../value   # store 호출
```

## Attribute Group

```c
static struct attribute *my_attrs[] = {
    &dev_attr_value.attr,
    &dev_attr_status.attr,
    &dev_attr_config.attr,
    NULL,
};

static const struct attribute_group my_attr_group = {
    .name = "control",
    .attrs = my_attrs,
};

sysfs_create_group(&pdev->dev.kobj, &my_attr_group);
```

→ `/sys/devices/.../control/value`, `/control/status`, `/control/config`.

## udev Rules — sysfs Event 반응

```text
# /etc/udev/rules.d/99-myrule.rules
SUBSYSTEM=="usb", ATTR{idVendor}=="1234", ATTR{idProduct}=="5678", \
    RUN+="/usr/local/bin/myhandler.sh"

SUBSYSTEM=="net", KERNEL=="eth*", ACTION=="add", \
    RUN+="/usr/local/bin/setup-net.sh"
```

USB·hot-plug device → udev가 *sysfs 변화 감지* → handler 실행.

## debugfs — Debug 전용

```c
#include <linux/debugfs.h>

static struct dentry *debug_dir;

static int my_show(struct seq_file *s, void *v) {
    struct my_data *d = s->private;
    seq_printf(s, "counter: %u\n", d->counter);
    seq_printf(s, "errors:  %u\n", d->errors);
    return 0;
}

static int my_open(struct inode *inode, struct file *file) {
    return single_open(file, my_show, inode->i_private);
}

static const struct file_operations my_fops = {
    .open    = my_open,
    .read    = seq_read,
    .llseek  = seq_lseek,
    .release = single_release,
};

/* Init */
debug_dir = debugfs_create_dir("mydriver", NULL);
debugfs_create_file("stats", 0444, debug_dir, my_data, &my_fops);

/* Cleanup */
debugfs_remove_recursive(debug_dir);
```

```bash
# Mount (usually auto)
mount -t debugfs none /sys/kernel/debug

cat /sys/kernel/debug/mydriver/stats
```

debugfs — *개발용*. Production kernel은 *비활성화 권장*.

## debugfs vs sysfs 사용 구분

```text
sysfs:
  - Stable interface
  - Document하면 ABI 보장
  - 한 file = 한 value
  - User-visible (production OK)
  
debugfs:
  - Unstable (kernel 버전 따라 변경)
  - 복잡한 데이터 가능
  - 개발·디버그 전용
```

## procfs — Process Info

```text
/proc/cpuinfo
/proc/meminfo
/proc/version
/proc/uptime
/proc/stat
/proc/<pid>/status
/proc/<pid>/maps
/proc/<pid>/fd/
/proc/<pid>/sched
/proc/interrupts
/proc/net/...
```

```bash
# Process info
cat /proc/$(pidof myapp)/status
# Name:   myapp
# State:  R (running)
# Pid:    1234
# VmRSS:  4096 kB
# Threads: 4

# Memory map
cat /proc/$(pidof myapp)/maps
# 00400000-00404000 r-xp 00000000 fd:00 12345 /usr/bin/myapp
# ...

# Kernel call stack of thread
cat /proc/$(pidof myapp)/stack
```

## /proc/sys — Kernel Tunables

```bash
# Display
cat /proc/sys/kernel/sched_latency_ns

# Modify
echo 10000000 > /proc/sys/kernel/sched_latency_ns

# Persistent — /etc/sysctl.d/
echo "kernel.sched_latency_ns = 10000000" > /etc/sysctl.d/99-rt.conf
```

`sysctl` — 표준 도구:

```bash
sysctl -a | grep sched
sysctl -w kernel.sched_latency_ns=10000000
```

## procfs entry — Driver

```c
/* Legacy — proc_create_seq_data */
static const struct proc_ops my_proc_ops = {
    .proc_open    = my_open,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

proc_create("mydriver", 0444, NULL, &my_proc_ops);
```

Modern Linux — `proc_create_seq_data` 권장. 새 driver는 *sysfs·debugfs 우선*.

## seq_file — 큰 출력 안전

```c
static int my_seq_show(struct seq_file *m, void *v) {
    int i;
    for (i = 0; i < 1000; i++) {
        seq_printf(m, "line %d\n", i);
    }
    return 0;
}
```

`seq_file` — kernel buffer management 자동. user-space `read()`에 page 단위로 전달.

## netlink — Kernel ↔ Userspace Async

```c
/* Kernel */
struct sock *nl_sk = netlink_kernel_create(&init_net, NETLINK_USERSOCK, &cfg);
struct sk_buff *skb = nlmsg_new(...);
nlmsg_unicast(nl_sk, skb, pid);

/* User */
int sock = socket(AF_NETLINK, SOCK_RAW, NETLINK_USERSOCK);
bind(sock, ...);
recv(sock, buf, sizeof(buf), 0);
```

NetworkManager·systemd·dbus — *netlink로 kernel event 수신*.

## perf events — sysfs/perf

```bash
ls /sys/devices/cpu/events/
# branches  cache-misses  cpu-cycles  instructions  ...
ls /sys/devices/cpu/format/
# event  inv  cmask  ...

# perf 사용
perf stat -e cpu/event=0x4d/ ./prog
```

PMU event names — sysfs 통해 노출.

## 자동차 ECU — sysfs 운영 모니터링

```c
/* Driver provides */
DEVICE_ATTR(temperature, 0444, temp_show, NULL);
DEVICE_ATTR(rpm, 0444, rpm_show, NULL);
DEVICE_ATTR(fault_count, 0444, fault_show, NULL);
DEVICE_ATTR(mode, 0664, mode_show, mode_store);

/* Monitor process — periodic poll */
while (1) {
    int fd = open("/sys/devices/myecu/temperature", O_RDONLY);
    read(fd, buf, sizeof(buf));
    close(fd);
    sleep(1);
}
```

자동차 *diagnostic tools* — sysfs로 데이터 노출 + udev로 *event*.

## sysfs Best Practices

```text
1. 한 attribute = 한 value
2. ASCII text (binary 피함)
3. Newline로 끝남
4. Lock 짧게
5. Static name (PCI bus·device 위치 의존 안 함)
```

Linux Documentation: `Documentation/ABI/`.

## 자주 하는 실수

> ⚠️ sysfs에 큰 binary

```c
static ssize_t firmware_show(...) {
    return memcpy(buf, firmware_data, 1024*1024);   /* 1 MB — sysfs 4 KB limit */
}
```

→ `binattr` (binary attribute) 또는 *별도 char device*.

> ⚠️ debugfs production 활성

```text
CONFIG_DEBUG_FS=y → debugfs 노출
   → 보안 위험·complexity
```

→ production kernel 비활성.

> ⚠️ procfs로 새 driver

```c
proc_create(...);   /* 옛 방식 */
```

→ sysfs·debugfs 권장.

> ⚠️ Lock 안 짧음

```c
static ssize_t my_show(...) {
    mutex_lock(&m);
    msleep(100);   /* ← sysfs read 100ms? — block */
    mutex_unlock(&m);
}
```

→ 짧게.

## 정리

- **sysfs** = device attribute, stable ABI, production.
- **debugfs** = debug, unstable, dev 전용.
- **procfs** = process·system info.
- **udev rules** — sysfs event 반응.
- **netlink** — async kernel event.
- Driver tuning·monitoring 표준.

다음 편은 **IRQ Affinity·RPS**.

## 관련 항목

- [4-04: UIO·VFIO](/blog/embedded/modern-recipes/part4-04-uio-vfio)
- [4-06: IRQ Affinity](/blog/embedded/modern-recipes/part4-06-irq-affinity)
