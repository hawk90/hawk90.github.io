---
title: "4-05: sysfs·configfs — kobject 기반 User 인터페이스"
date: 2026-05-20T18:00:00
description: "sysfs attribute, attribute group, configfs로 user space에서 driver를 제어하는 표준 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 23
tags: [recipes, sysfs, configfs, kobject, udev]
---

## 한 줄 요약

> **"sysfs = driver가 user에 보여주는 작은 텍스트 파일."** kobject 트리에 attribute를 매다는 한 줄로 LED 밝기든 fan 속도든 똑같은 모양의 인터페이스가 됩니다.

## 어떤 상황에서 쓰나

LED 모듈에 brightness 값을 외부에서 바꾸고 싶거나, 산업용 ECU에서 fan PWM duty를 실시간으로 조절해야 할 때 ioctl보다 sysfs가 훨씬 단순합니다. `echo 80 > /sys/class/leds/status/brightness` 한 줄로 끝나니, 쉘 스크립트·systemd unit·monitoring agent에서 그대로 쓸 수 있습니다.

자동차나 산업 장비의 운영 모니터링도 거의 sysfs로 끝납니다. 온도, 회전수, fault count를 모두 sysfs로 노출하면 별도의 daemon 없이 텍스트 파일 폴링만으로 telemetry가 만들어집니다. configfs는 *user space가 새 객체를 만드는* 정반대의 흐름인데, USB gadget이나 target framework가 표준으로 씁니다.

## 핵심 개념

sysfs는 kobject 트리의 *외부 표현*입니다.

```text
struct kobject       sysfs 디렉터리에 대응
struct attribute     디렉터리 안의 파일 하나
struct sysfs_ops     read/write 처리 함수 테이블
DEVICE_ATTR 매크로   show/store 두 함수를 한 번에 묶는 helper
```

규칙은 단순합니다. attribute 파일 하나는 *값 하나*를 가지고, ASCII로 표현하며, 마지막에 newline을 둡니다. 한 파일에 여러 값을 채우면 race가 생기고 user side 파싱도 복잡해집니다.

configfs는 sysfs와 비슷한 모양이지만 *user가 mkdir로 새 객체를 만들 수 있다*는 점이 다릅니다. USB gadget을 새로 만들거나 NVMe target subsystem을 등록하는 등 *생성·파괴*가 동적이어야 하는 경우에 쓰입니다.

## 코드 / 실제 사용 예

### Device attribute 한 개

```c
#include <linux/device.h>

static unsigned int g_value;
static DEFINE_MUTEX(g_lock);

static ssize_t value_show(struct device *dev, struct device_attribute *a,
                          char *buf) {
    unsigned int v;
    mutex_lock(&g_lock);
    v = g_value;
    mutex_unlock(&g_lock);
    return sysfs_emit(buf, "%u\n", v);
}

static ssize_t value_store(struct device *dev, struct device_attribute *a,
                           const char *buf, size_t count) {
    unsigned int v;
    if (kstrtouint(buf, 10, &v)) return -EINVAL;
    if (v > 100) return -ERANGE;

    mutex_lock(&g_lock);
    g_value = v;
    mutex_unlock(&g_lock);
    return count;
}

static DEVICE_ATTR_RW(value);
```

`DEVICE_ATTR_RW`는 mode `0644`로 read/write attribute를 등록합니다. 읽기 전용은 `_RO`, 쓰기 전용은 `_WO`를 씁니다. 출력에는 `sprintf` 대신 buffer 길이를 안전하게 처리하는 `sysfs_emit`을 사용합니다.

### Attribute group으로 한 번에 등록

```c
static struct attribute *sample_attrs[] = {
    &dev_attr_value.attr,
    &dev_attr_mode.attr,
    &dev_attr_status.attr,
    NULL,
};

static const struct attribute_group sample_group = {
    .name  = "control",       /* /sys/.../control/ 디렉터리 생성 */
    .attrs = sample_attrs,
};

static int sample_probe(struct platform_device *pdev) {
    int rc = sysfs_create_group(&pdev->dev.kobj, &sample_group);
    if (rc) return rc;

    /* devm 형 helper도 있다 */
    return devm_device_add_group(&pdev->dev, &sample_group);
}
```

`devm_device_add_group`을 쓰면 driver unbind 시 자동으로 정리됩니다. 잘 쓰면 `remove`에서 cleanup을 빠뜨릴 일이 없습니다.

### 결과 모양

```bash
$ ls /sys/devices/platform/sample/control/
mode  status  value

$ cat /sys/devices/platform/sample/control/value
0

$ echo 42 > /sys/devices/platform/sample/control/value
$ cat /sys/devices/platform/sample/control/value
42
```

device class와 결합하면 `/sys/class/...`에 안정된 symlink가 생기고, udev rule이 이걸 보고 hot-plug 동작을 정의합니다.

### udev rule과 결합

```text
# /etc/udev/rules.d/90-sample.rules
SUBSYSTEM=="sample", ACTION=="add", \
    RUN+="/usr/bin/setup-sample.sh %k"

KERNEL=="leds*", ATTR{brightness}="64"
```

device가 들어오면 udev가 sysfs 트리를 보고 rule을 매칭합니다. 초기값 설정은 udev로 처리하는 편이 driver 안에 hard-code하는 것보다 깔끔합니다.

### Binary attribute — 큰 데이터

```c
static ssize_t fw_read(struct file *f, struct kobject *k,
                       struct bin_attribute *a,
                       char *buf, loff_t off, size_t count) {
    if (off >= fw_size) return 0;
    if (off + count > fw_size) count = fw_size - off;
    memcpy(buf, fw_data + off, count);
    return count;
}

static struct bin_attribute fw_attr = {
    .attr = { .name = "firmware", .mode = 0444 },
    .read = fw_read,
    .size = 0,                /* runtime 결정 */
};

sysfs_create_bin_file(&pdev->dev.kobj, &fw_attr);
```

ASCII 텍스트가 어색한 firmware blob·calibration data는 binary attribute로 노출합니다. 일반 attribute는 page size(보통 4 KB) 제한이 있어 큰 데이터에는 부적합합니다.

### configfs — user가 객체를 만든다

```bash
mount -t configfs none /sys/kernel/config

# USB gadget 인스턴스 생성
mkdir /sys/kernel/config/usb_gadget/g1
echo 0x1d6b > /sys/kernel/config/usb_gadget/g1/idVendor
echo 0x0104 > /sys/kernel/config/usb_gadget/g1/idProduct

mkdir /sys/kernel/config/usb_gadget/g1/configs/c.1
mkdir /sys/kernel/config/usb_gadget/g1/functions/acm.0
ln -s ../../functions/acm.0 ../../configs/c.1/
echo musb-hdrc.0 > /sys/kernel/config/usb_gadget/g1/UDC
```

`mkdir` 한 번이 kernel 객체 하나의 생성에 대응합니다. USB gadget, NVMe-oF target, LIO iSCSI target이 같은 패턴을 사용합니다.

### sysfs_notify로 user에게 신호 보내기

```c
/* 값이 바뀌었음을 알린다 */
sysfs_notify(&pdev->dev.kobj, NULL, "value");
```

user 쪽에서는 `poll`이나 `epoll`로 attribute 파일을 감시하다가 변화 시점에 깨어납니다. 주기적 polling 없이 이벤트 기반 monitoring이 가능합니다.

## 측정 / 성능 비교

sysfs read/write 자체는 가벼운 syscall + kernel function call입니다. fast path 인터페이스가 아니라 *제어 plane*이라는 점만 잊지 않으면 됩니다.

```text
인터페이스                  one round-trip cost
sysfs read (단일 정수)      3~5 µs
ioctl (단순 명령)           2~3 µs
netlink unicast             8~12 µs
shared memory pointer       <50 ns
```

LED brightness나 fan duty 같은 *초당 수십 회 미만*의 제어에는 sysfs로 충분합니다. 1 kHz 이상의 sensor sampling이나 audio stream을 sysfs로 빼면 syscall 비용이 누적되어 빠르게 한계에 부딪힙니다.

## 자주 보는 함정

> 한 파일에 여러 값

```c
return sysfs_emit(buf, "%u %u %u\n", a, b, c);
```

규약상 *한 attribute = 한 값*입니다. 여러 값을 모아 두면 parser가 깨지고, store 쪽에서 partial write도 처리하기 어렵습니다. 값마다 별도 attribute로 쪼개는 편이 좋습니다.

> store 안에서 긴 작업

```c
static ssize_t reset_store(...) {
    msleep(500);   /* user는 echo 동안 차단 */
    return count;
}
```

`echo`가 500 ms 멈춥니다. 긴 작업은 work queue에 큐잉하고 `store`는 즉시 반환합니다. 완료 통지는 `sysfs_notify`로 보냅니다.

> Lock 없이 share state read·write

```c
return sysfs_emit(buf, "%u\n", g_value);   /* tearing 가능 */
```

여러 user가 동시에 read/write하면 32비트 이상의 값에서 tearing이 일어날 수 있습니다. mutex 또는 atomic으로 보호합니다.

> ASCII 규약 무시

```c
return sysfs_emit(buf, "%08x", v);   /* 마지막 newline 누락 */
```

마지막 newline이 빠지면 `cat` 출력이 prompt와 붙고, 일부 parser가 EOF를 잘못 잡습니다. `\n`을 잊지 않습니다.

> Cleanup 누락

```c
static void sample_remove(struct platform_device *pdev) {
    /* sysfs_remove_group 누락 */
}
```

다음 bind 때 `sysfs: cannot create duplicate filename` 오류가 납니다. `devm_device_add_group` 같은 managed API로 등록과 해제를 한 쌍으로 묶는 편이 안전합니다.

## 정리

- sysfs는 driver state를 ASCII 한 줄로 노출하는 가장 단순한 인터페이스입니다.
- 한 attribute = 한 값, 마지막 newline 포함이라는 규약을 지켜야 user 도구와 호환됩니다.
- `DEVICE_ATTR_RW`·`sysfs_emit`·`devm_device_add_group`을 묶어 쓰면 등록·해제·출력 모두 안전하게 처리됩니다.
- udev rule은 sysfs 트리를 보고 동작을 정의하므로 driver와 자연스럽게 결합됩니다.
- `sysfs_notify`는 user 쪽 polling을 이벤트 기반으로 바꿔 줍니다.
- configfs는 정반대로 user가 객체를 *만드는* 인터페이스이고, USB gadget·NVMe target이 대표 사례입니다.
- sysfs는 *제어 plane*이라는 점을 기억합니다. 고빈도 data path는 mmap·io_uring·char device로 보내야 합니다.

다음 편은 **IRQ Affinity**입니다.

## 관련 항목

- [1-04: Device Tree](/blog/embedded/modern-recipes/part1-04-device-tree)
- [4-01: Kernel Module](/blog/embedded/modern-recipes/part4-01-kernel-module)
- [4-06: IRQ Affinity](/blog/embedded/modern-recipes/part4-06-irq-affinity)
