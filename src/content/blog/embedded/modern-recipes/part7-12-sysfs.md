---
title: "sysfs·configfs 활용 — kobject 기반 User 인터페이스"
slug: "embedded/modern-recipes/part7-12-sysfs"
date: 2026-04-16T09:11:00
description: "sysfs attribute, attribute group, configfs로 user space에서 driver를 제어하는 표준 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 86
tags: [recipes, sysfs, configfs, kobject, udev]
topics: ["embedded"]
---

## 한 줄 요약

> **"sysfs = driver가 사용자 공간에 보여 주는 작은 텍스트 파일."** kobject 트리에 attribute를 달면 `cat`과 `echo`로 읽고 쓰는 제어 인터페이스가 됩니다. 이 글의 driver·udev·configfs 출력은 모두 Debian 13 arm64(커널 `6.12.116+deb13-arm64`, systemd/udev 257)에서 직접 돌린 결과입니다.

## 어떤 상황에서 쓰나

LED 밝기나 fan PWM duty처럼 가끔 바꾸는 제어 값은 ioctl을 정의하는 것보다 sysfs 파일 하나가 단순합니다. 셸 스크립트에서 `echo 42 > .../value`로 바로 쓸 수 있고, 전용 도구 없이 `cat`으로 상태를 볼 수 있습니다. 집 안의 온도 조절기 다이얼처럼, 자주 돌리지는 않지만 누구나 바로 보고 돌릴 수 있는 손잡이입니다.

configfs는 방향이 반대입니다. sysfs는 커널이 만든 객체를 사용자에게 보여 주고, configfs는 사용자가 `mkdir`로 커널 객체를 만듭니다. USB gadget을 사용자 공간에서 조립하는 것이 대표 예이고, 아래에서 실제로 만들어 봅니다.

## 핵심 개념

| 커널 쪽 | sysfs에서 보이는 것 |
|---|---|
| `struct kobject` | 디렉터리 |
| `struct attribute` (+ show/store) | 디렉터리 안의 파일 하나 |
| `struct attribute_group` (`.name`) | 파일 묶음, 이름이 있으면 하위 디렉터리 |
| `struct bin_attribute` | 텍스트가 아닌 바이너리 파일 |

커널 문서의 규칙은 "Attributes should be ASCII text files, preferably with only one value per file"입니다(v6.12 `Documentation/filesystems/sysfs.rst:62-65`). 같은 문서는 같은 타입 값의 배열 정도는 한 파일에 담아도 된다고 덧붙입니다. show는 `PAGE_SIZE` 크기 버퍼를 받으며 `sysfs_emit()`/`sysfs_emit_at()`로만 채워야 합니다(같은 문서 240-246행).

## 코드 / 실제 사용 예

### Attribute group을 가진 platform driver

아래 모듈은 platform device `sample`과 driver를 함께 등록합니다. 읽기·쓰기 attribute `value`, 읽기 전용 `status`, 쓰기 전용 `reset`, 바이너리 `firmware`를 `control/` 하위 디렉터리에 둡니다. Attribute는 probe에서 직접 만들지 않고 `.driver.dev_groups`에 넘겨 driver core가 bind 때 만들고 unbind 때 지우게 했습니다(v6.12 `include/linux/device/driver.h:79`, `:116`).

```c
// SPDX-License-Identifier: GPL-2.0
#include <linux/delay.h>
#include <linux/device.h>
#include <linux/module.h>
#include <linux/mutex.h>
#include <linux/platform_device.h>
#include <linux/sysfs.h>

static unsigned int g_value;
static DEFINE_MUTEX(g_lock);
static const char fw_data[] = "calibration-blob-v1";

static ssize_t value_show(struct device *dev, struct device_attribute *a, char *buf)
{
	unsigned int v;

	mutex_lock(&g_lock);
	v = g_value;
	mutex_unlock(&g_lock);
	return sysfs_emit(buf, "%u\n", v);
}

static ssize_t value_store(struct device *dev, struct device_attribute *a,
			   const char *buf, size_t count)
{
	unsigned int v;
	int ret = kstrtouint(buf, 10, &v);

	if (ret)
		return ret;
	if (v > 100)
		return -ERANGE;
	mutex_lock(&g_lock);
	g_value = v;
	mutex_unlock(&g_lock);
	sysfs_notify(&dev->kobj, "control", "value");   /* wake poll() on the file */
	return count;
}
static DEVICE_ATTR_RW(value);

static ssize_t status_show(struct device *dev, struct device_attribute *a, char *buf)
{
	return sysfs_emit(buf, "ok\n");
}
static DEVICE_ATTR_RO(status);

static ssize_t reset_store(struct device *dev, struct device_attribute *a,
			   const char *buf, size_t count)
{
	msleep(500);                                    /* long work inside store */
	return count;
}
static DEVICE_ATTR_WO(reset);

static ssize_t firmware_read(struct file *f, struct kobject *k, struct bin_attribute *a,
			     char *buf, loff_t off, size_t count)
{
	return memory_read_from_buffer(buf, count, &off, fw_data, sizeof(fw_data) - 1);
}
static BIN_ATTR_RO(firmware, sizeof(fw_data) - 1);

static struct attribute *sample_attrs[] = {
	&dev_attr_value.attr,
	&dev_attr_status.attr,
	&dev_attr_reset.attr,
	NULL,
};

static struct bin_attribute *sample_bin_attrs[] = {
	&bin_attr_firmware,
	NULL,
};

static const struct attribute_group sample_group = {
	.name      = "control",                         /* subdirectory */
	.attrs     = sample_attrs,
	.bin_attrs = sample_bin_attrs,
};
__ATTRIBUTE_GROUPS(sample);                         /* sample_groups[] */

static int sample_probe(struct platform_device *pdev)
{
	dev_info(&pdev->dev, "probed; groups are added by the driver core\n");
	return 0;
}

static struct platform_driver sample_driver = {
	.probe  = sample_probe,
	.driver = {
		.name       = "sample",
		.dev_groups = sample_groups,
	},
};

static struct platform_device *sample_pdev;

static int __init sample_init(void)
{
	int ret = platform_driver_register(&sample_driver);

	if (ret)
		return ret;
	sample_pdev = platform_device_register_simple("sample", -1, NULL, 0);
	if (IS_ERR(sample_pdev)) {
		platform_driver_unregister(&sample_driver);
		return PTR_ERR(sample_pdev);
	}
	return 0;
}

static void __exit sample_exit(void)
{
	platform_device_unregister(sample_pdev);
	platform_driver_unregister(&sample_driver);
}

module_init(sample_init);
module_exit(sample_exit);
MODULE_LICENSE("GPL");
```

```bash
make            # obj-m += sample.o, KDIR=/lib/modules/$(uname -r)/build
insmod sample.ko
D=/sys/devices/platform/sample/control
ls -l $D
cat $D/value $D/status
echo 42 > $D/value && cat $D/value
echo 101 > $D/value; echo abc > $D/value; cat $D/value
hexdump -C $D/firmware
```

```text
total 0
-r--r--r-- 1 root root   19 Nov 16 14:41 firmware
--w------- 1 root root 4096 Nov 16 14:41 reset
-r--r--r-- 1 root root 4096 Nov 16 14:41 status
-rw-r--r-- 1 root root 4096 Nov 16 14:41 value
0
ok
42
bash: line 6: echo: write error: Numerical result out of range
bash: line 6: echo: write error: Invalid argument
42
00000000  63 61 6c 69 62 72 61 74  69 6f 6e 2d 62 6c 6f 62  |calibration-blob|
00000010  2d 76 31                                          |-v1|
00000013
```

- `DEVICE_ATTR_RW`는 0644, `_RO`는 0444, `_WO`는 0200 파일을 만들었습니다(`ls -l`의 `-rw-r--r--`, `-r--r--r--`, `--w-------`).
- store가 돌려준 에러는 `write`의 errno가 됩니다. 범위를 넘은 101은 `-ERANGE`로, 숫자가 아닌 `abc`는 `kstrtouint`의 `-EINVAL`로 거부되어 셸이 `Numerical result out of range`·`Invalid argument`를 찍었고, 값은 42로 남았습니다.
- 바이너리 attribute `firmware`의 크기 19(0x13)는 `BIN_ATTR_RO`에 준 길이이고, 내용이 그대로 읽혔습니다.
- driver만 떼었다가 다시 붙여도 중복 이름 에러가 나지 않았습니다. unbind하면 `control/`이 사라지고, 다시 bind하면 그대로 다시 생겼습니다. `dev_groups`는 driver core가 bind 때 만들고 unbind 때 지웁니다. 모듈을 `rmmod`/`insmod`하는 것으로는 이 구분이 보이지 않습니다. 이 모듈은 device까지 지우므로, attribute를 지우지 않는 잘못된 driver도 다시 올리면 성공하기 때문입니다(독립 검증에서 확인).

```bash
echo sample > /sys/bus/platform/drivers/sample/unbind; ls /sys/devices/platform/sample
echo sample > /sys/bus/platform/drivers/sample/bind && ls $D
```

```text
driver_override
modalias
power
subsystem
uevent
firmware
reset
status
value
```

### `sysfs_notify` — 값이 바뀌면 깨우기

store에서 `sysfs_notify(&dev->kobj, "control", "value")`를 불러 두면, 사용자 공간은 그 파일을 `poll`로 기다릴 수 있습니다. 파일을 한 번 읽은 뒤 `POLLPRI`·`POLLERR`로 기다리고, 깨어나면 처음부터 다시 읽습니다. kernfs의 poll은 알림이 오면 `EPOLLERR|EPOLLPRI`를 돌려줍니다(v6.12 `fs/kernfs/file.c:842-843`, 읽기 → poll → 다시 읽기 순서는 같은 파일 822-829행 주석).

```c
#include <fcntl.h>
#include <poll.h>
#include <stdio.h>
#include <unistd.h>

int main(void)
{
	const char *path = "/sys/devices/platform/sample/control/value";
	char buf[16];
	int fd = open(path, O_RDONLY);
	read(fd, buf, sizeof buf);                      /* must read once before poll */
	struct pollfd p = { .fd = fd, .events = POLLPRI | POLLERR };
	int n = poll(&p, 1, 3000);
	lseek(fd, 0, SEEK_SET);
	ssize_t r = read(fd, buf, sizeof buf - 1);
	buf[r > 0 ? r : 0] = 0;
	printf("poll=%d revents=0x%x, new value=%s", n, p.revents, buf);
	return 0;
}
```

`notify`를 배경으로 띄워 두고 `echo 7 > $D/value`를 하자 다음 줄이 찍혔습니다. `revents` 0xa는 `POLLERR`(0x8)와 `POLLPRI`(0x2)입니다.

```text
poll=1 revents=0xa, new value=7
```

### 결과를 udev rule로 초기화하기

장치가 나타날 때의 초기값은 driver에 하드코딩하지 않고 udev rule로 줄 수 있습니다. 이 attribute들은 `dev_groups`라 driver가 bind될 때 생기므로(v6.12 `drivers/base/dd.c:677`) rule은 `add`가 아니라 `bind` 이벤트에 겁니다. 독립 검증에서 `ACTION=="add"`로 걸었더니 20번 중 8번은 `control/`이 아직 없어 udev가 `No such file or directory`로 쓰기를 건너뛰었습니다. 아래 `bind` rule로는 모듈을 10번 올려 10번 모두 값이 0이 아니라 64로 시작했습니다. `ATTR{}`에는 장치 디렉터리 기준 상대 경로를 쓸 수 있어 `control/value`에 바로 썼습니다.

```text
SUBSYSTEM=="platform", KERNEL=="sample", ACTION=="bind", ATTR{control/value}="64"
```

```text
bind rule: value 64 in 10/10 runs
```

이 VM의 udev는 `udevadm --version` 기준 257입니다.

### configfs — 사용자가 USB gadget을 만든다

configfs에서는 `mkdir`가 커널 객체를 만듭니다. 커널 문서의 USB gadget 절차(v6.12 `Documentation/usb/gadget_configfs.rst`)대로, 가상 USB 장치 컨트롤러(`dummy_hcd`)에 CDC ACM serial gadget을 붙였습니다. Debian 커널은 `CONFIG_USB_DUMMY_HCD=m`, `CONFIG_USB_CONFIGFS_ACM=y`입니다.

```bash
modprobe dummy_hcd && modprobe libcomposite
G=/sys/kernel/config/usb_gadget/g1
mkdir $G
echo 0x1d6b > $G/idVendor
echo 0x0104 > $G/idProduct
mkdir -p $G/strings/0x409 && echo demo > $G/strings/0x409/product
mkdir $G/configs/c.1
mkdir $G/functions/acm.0
ln -s $G/functions/acm.0 $G/configs/c.1/
ls /sys/class/udc/ && cat /sys/class/udc/*/state
echo dummy_udc.0 > $G/UDC
sleep 1
cat /sys/class/udc/*/state
ls /dev/ttyACM* /dev/ttyGS*
```

```text
dummy_udc.0
not attached
configured
/dev/ttyACM0
/dev/ttyGS0
```

`UDC`에 컨트롤러 이름을 쓰고 가상 host의 열거가 끝나자(독립 검증의 dmesg 기준 수백 ms, 그래서 `sleep 1`을 둠) 상태가 `configured`가 됐고, gadget 쪽 serial `/dev/ttyGS0`과, 같은 VM의 가상 host가 본 `/dev/ttyACM0`이 함께 생겼습니다. 실제 보드라면 `dummy_udc.0` 자리에 SoC의 USB device 컨트롤러 이름이 들어갑니다. 지울 때는 `UDC`를 비우고, 링크와 디렉터리를 만든 역순으로 지웁니다.

## 측정 / 성능 비교

sysfs 읽기 한 번의 비용을 같은 VM에서 다른 작업이 없을 때(load average 0.05) 쟀습니다(20만 회 평균, 두 번). [7-07](/blog/embedded/modern-recipes/part7-07-char-driver)의 char driver `ioctl`은 같은 VM에서 호출당 156 ns였습니다.

```c
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>

static double now(void)
{
	struct timespec ts;
	clock_gettime(CLOCK_MONOTONIC, &ts);
	return ts.tv_sec + ts.tv_nsec / 1e9;
}

int main(void)
{
	const char *path = "/sys/devices/platform/sample/control/value";
	enum { N = 200000 };
	char buf[16];
	int fd = open(path, O_RDONLY);
	double t0 = now();
	for (int i = 0; i < N; i++)
		pread(fd, buf, sizeof buf, 0);          /* fd kept open */
	double t1 = now();
	for (int i = 0; i < N; i++) {             /* open + read + close each time */
		int f = open(path, O_RDONLY);
		read(f, buf, sizeof buf);
		close(f);
	}
	double t2 = now();
	printf("pread on open fd: %.0f ns/read\nopen+read+close: %.0f ns/read\n",
	       (t1 - t0) / N * 1e9, (t2 - t1) / N * 1e9);
	return 0;
}
```

```text
pread on open fd: 287 ns/read
open+read+close: 1474 ns/read
pread on open fd: 287 ns/read
open+read+close: 1430 ns/read
```

fd를 열어 둔 채 `pread`로 다시 읽으면 300 ns대였지만, 매번 `open`·`read`·`close`를 하면 다섯 배쯤(1.4 µs 안팎) 걸렸습니다. 셸 스크립트의 `cat`은 매번 여는 쪽이고, 프로세스 생성 비용까지 더해집니다. 그래서 sysfs는 가끔 읽고 쓰는 제어 값에 맞고, 자주 오가는 데이터는 char device의 `read`·`mmap`([7-09](/blog/embedded/modern-recipes/part7-09-mmap))으로 보냅니다.

## 자주 보는 함정

> ⚠️ Attribute group을 두 번 등록

```c
static int sample_probe(struct platform_device *pdev) {
    int rc = sysfs_create_group(&pdev->dev.kobj, &sample_group);
    if (rc) return rc;
    return devm_device_add_group(&pdev->dev, &sample_group);   /* same group again */
}
```

같은 group을 `sysfs_create_group`과 `devm_device_add_group`으로 두 번 만들면 두 번째가 같은 이름의 디렉터리를 다시 만들려다 실패합니다. 한 가지만 씁니다. driver가 정적인 group을 가진다면 위 예처럼 `.dev_groups`가 가장 단순합니다. probe 안에서 조건에 따라 붙여야 할 때만 `devm_device_add_group`(v6.12 `drivers/base/core.c:2845-2874`)을 씁니다.

> ⚠️ store 안에서 오래 걸리는 작업

위 `reset_store`는 `msleep(500)`을 합니다. `time (echo 1 > $D/reset)`은 real 0.513 s였습니다. `echo`를 부른 쪽이 그만큼 멈추므로, 오래 걸리는 작업은 workqueue로 넘기고 store는 바로 반환한 뒤 끝나면 `sysfs_notify`로 알립니다.

> ⚠️ 여러 값을 한 파일에

```c
return sysfs_emit(buf, "%u %u %u\n", a, b, c);
```

커널 문서는 한 파일에 한 값을 권하고, 같은 타입의 배열까지만 허용합니다. 서로 다른 의미의 값을 한 줄에 섞으면 사용자 공간이 위치로 파싱해야 하고, store 쪽은 일부만 바꾸는 쓰기를 표현할 방법이 없습니다.

> ⚠️ 마지막 newline 누락

```c
return sysfs_emit(buf, "%08x", v);   /* no trailing newline */
```

`cat`의 출력이 다음 셸 prompt와 붙습니다. 커널 문서의 show 예도 `"\n"`으로 끝납니다(`sysfs.rst:266`).

> ⚠️ 등록한 attribute를 지우지 않음

`sysfs_create_group`으로 직접 만들었다면 remove에서 `sysfs_remove_group`을 불러야 합니다. 빠뜨리면 unbind 후 다시 bind할 때(또는 device가 남은 채 driver 모듈만 다시 올릴 때) `sysfs: cannot create duplicate filename`이 납니다([7-06](/blog/embedded/modern-recipes/part7-06-kernel-module)에서 kobject로 같은 에러를 실제로 냈습니다). `.dev_groups`나 `devm_device_add_group`은 이 짝을 driver core가 맞춥니다.

## 정리

- sysfs attribute는 텍스트 파일 하나, 값 하나, show는 `sysfs_emit`입니다.
- 정적인 attribute는 `.driver.dev_groups`로 넘기면 bind·unbind 때 driver core가 만들고 지웁니다.
- store가 돌려준 에러는 `write`의 errno로 사용자에게 그대로 보입니다.
- `sysfs_notify`를 부르면 사용자 공간은 `POLLPRI`·`POLLERR`로 그 파일을 기다릴 수 있습니다.
- 초기값은 udev rule의 `ATTR{}`로 줄 수 있습니다.
- configfs는 사용자가 `mkdir`로 커널 객체를 만드는 인터페이스이고, USB gadget을 그렇게 조립합니다.
- sysfs 읽기는 fd를 열어 둬도 300 ns 안팎, 매번 열면 1.4 µs 안팎이라 제어용입니다.

다음 편은 **IRQ Affinity**입니다.

## 관련 항목

- [7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
- [7-06: Kernel Module](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-07: 캐릭터 드라이버](/blog/embedded/modern-recipes/part7-07-char-driver)
- [7-13: IRQ Affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
