---
title: "커널 모듈 기초 — init/exit·Parameter·KBuild·modprobe"
slug: "embedded/modern-recipes/part7-06-kernel-module"
date: 2026-04-16T09:05:00
description: "Linux kernel module의 진입점, 모듈 파라미터, KBuild Makefile, insmod·modprobe 흐름을 Debian 13 arm64에서 직접 빌드·로드하며 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 80
tags: [recipes, kernel-module, ko, kbuild]
topics: ["embedded"]
---

## 한 줄 요약

> **"Kernel module = `.ko` 한 개로 동적 로드하는 driver 단위."** `module_init`과 `module_exit` 두 함수만 있으면 시작할 수 있고, 나머지는 Kbuild·sysfs·modprobe가 받쳐 줍니다. 이 글의 모든 출력은 Debian 13 arm64(커널 `6.12.116+deb13-arm64`, gcc 14.2.0, kmod 34.2)에서 직접 빌드·로드한 결과입니다.

## 어떤 상황에서 쓰나

새 장치를 받아 레지스터부터 확인해야 하거나, 기존 driver에 작은 패치를 얹어 동작을 바꿔야 할 때가 있습니다. 커널 이미지를 다시 빌드하면 부팅 절차와 검증까지 다시 해야 하지만, `.ko` 하나로 작업하면 `insmod`·`rmmod`로 넣었다 뺐다 하며 바로 시험할 수 있습니다. 전원을 끄지 않고 USB 기기를 꽂았다 뽑는 것처럼, 커널을 재부팅하지 않고 기능을 끼웠다 빼는 셈입니다.

커널 소스 밖에서 배포되는 driver(예: NVIDIA의 GPU driver)는 모듈 형태로만 쓸 수 있고, 커널 버전이 바뀔 때마다 다시 빌드해야 합니다. 반대로 WireGuard처럼 mainline에 들어온 기능은 커널 설정(`CONFIG_WIREGUARD`, v6.12 `drivers/net/Kconfig:75`)으로 켜므로 따로 빌드하지 않습니다.

## 핵심 개념

Kernel module은 네 가지로 이루어집니다.

1. **진입점** — `module_init` / `module_exit`
2. **메타데이터** — `MODULE_LICENSE` / `MODULE_AUTHOR` / `MODULE_DESCRIPTION`
3. **빌드** — Kbuild Makefile + 커널 빌드 트리(또는 headers 패키지)
4. **로드** — `insmod` / `rmmod` / `modprobe` + `depmod`

라이선스 문자열은 문서가 아니라 동작에 영향을 줍니다. 커널은 `"GPL"`, `"GPL v2"`, `"Dual MIT/GPL"` 등 정해진 문자열만 GPL 호환으로 봅니다(v6.12 `include/linux/license.h`의 `license_is_gpl_compatible`). 호환이 아니면 `EXPORT_SYMBOL_GPL`로 내보낸 심볼을 쓸 수 없고, 로드하면 커널에 `P` taint가 남습니다. 아래 실행에서 둘 다 확인합니다.

## 코드 / 실제 사용 예

### Hello 모듈 한 장

`utsname()`은 `<linux/utsname.h>`에 선언되어 있습니다. 이 include를 빼면 gcc 14가 `error: implicit declaration of function 'utsname'`으로 빌드를 멈췄습니다.

```c
#include <linux/module.h>
#include <linux/init.h>
#include <linux/kernel.h>
#include <linux/utsname.h>

static int __init hello_init(void) {
    pr_info("hello: loaded on kernel %s\n", utsname()->release);
    return 0;
}

static void __exit hello_exit(void) {
    pr_info("hello: unloaded\n");
}

module_init(hello_init);
module_exit(hello_exit);

MODULE_LICENSE("GPL v2");
MODULE_AUTHOR("Sang-Deok Yoon");
MODULE_DESCRIPTION("Minimal kernel module");
MODULE_VERSION("1.0");
```

`__init`이 붙은 함수는 별도 섹션에 들어갑니다. 모듈은 init이 성공하면 그 섹션을 작업 큐에서 해제하고(v6.12 `kernel/module/main.c:79-80`, `:2479`의 `do_free_init`), built-in으로 빌드하면 부팅이 끝날 때 커널이 init 영역을 한꺼번에 해제합니다. 7-01과 같은 QEMU v6.12 부팅에서는 `Run /init` 바로 앞에 `Freeing unused kernel memory: 2880K`가 찍혔습니다(arm64 `free_initmem()`, v6.12 `arch/arm64/mm/init.c:424`).

### Kbuild Makefile

```makefile
obj-m += hello.o

KDIR ?= /lib/modules/$(shell uname -r)/build
PWD  := $(shell pwd)

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean

install:
	$(MAKE) -C $(KDIR) M=$(PWD) modules_install
	depmod -a
```

`-C`로 커널 빌드 트리의 Kbuild를 부르고, `M=$(PWD)`가 이 디렉터리를 가리킵니다. Debian에서는 `linux-headers-$(uname -r)` 패키지가 `/lib/modules/$(uname -r)/build`를 채웁니다. Cross compile에는 `ARCH`·`CROSS_COMPILE`을 더하고 `KDIR`을 대상 커널의 빌드 트리로 줍니다([7-05](/blog/embedded/modern-recipes/part7-05-kernel-build)).

```bash
make
insmod ./hello.ko && rmmod hello
dmesg
modinfo ./hello.ko
```

```text
[  994.684870] hello: loading out-of-tree module taints kernel.
[  994.685424] hello: module verification failed: signature and/or required key missing - tainting kernel
[  994.689250] hello: loaded on kernel 6.12.116+deb13-arm64
[  994.703913] hello: unloaded
```

```text
version:        1.0
description:    Minimal kernel module
author:         Sang-Deok Yoon
license:        GPL v2
srcversion:     DAE86D9F2922742458246CF
depends:        
name:           hello
vermagic:       6.12.116+deb13-arm64 SMP mod_unload modversions aarch64
```

첫 두 줄의 경고는 라이선스와 관계없습니다. 하나는 커널 트리 밖에서 빌드한 모듈(taint `O`), 다른 하나는 이 Debian 커널이 `CONFIG_MODULE_SIG=y`라서 서명 없는 모듈을 올렸다는 표시(taint `E`)입니다(`kernel/module/main.c:2034`, `:2064`). `CONFIG_MODULE_SIG_FORCE`는 꺼져 있어 로드 자체는 막지 않았습니다. 이 시점 `/proc/sys/kernel/tainted`는 12288(= 4096 `O` + 8192 `E`)이었습니다.

### Module 파라미터

```c
// SPDX-License-Identifier: GPL-2.0
#include <linux/module.h>
#include <linux/moduleparam.h>
#include <linux/printk.h>

static int sample_rate = 48000;
module_param(sample_rate, int, 0644);
MODULE_PARM_DESC(sample_rate, "Sample rate in Hz");

static char *device_name = "default";
module_param(device_name, charp, 0444);
MODULE_PARM_DESC(device_name, "Underlying device name");

static int chans[4];
static int chans_count;
module_param_array(chans, int, &chans_count, 0644);
MODULE_PARM_DESC(chans, "Channel map");

static int __init sample_init(void)
{
	pr_info("sample: rate=%d dev=%s chans=%d\n", sample_rate, device_name, chans_count);
	pr_debug("sample: debug message\n");
	return 0;
}

static void __exit sample_exit(void)
{
	pr_info("sample: unloaded\n");
}

module_init(sample_init);
module_exit(sample_exit);
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("module_param demo");
```

```bash
insmod ./sample.ko sample_rate=96000 device_name=hw:0,0 chans=1,2,3,4
ls -l /sys/module/sample/parameters/
head /sys/module/sample/parameters/*
echo 44100 > /sys/module/sample/parameters/sample_rate
cat /sys/module/sample/parameters/sample_rate
echo x > /sys/module/sample/parameters/device_name
```

```text
-rw-r--r-- 1 root root 4096 Nov 16 14:04 chans
-r--r--r-- 1 root root 4096 Nov 16 14:04 device_name
-rw-r--r-- 1 root root 4096 Nov 16 14:04 sample_rate
==> /sys/module/sample/parameters/chans <==
1,2,3,4

==> /sys/module/sample/parameters/device_name <==
hw:0,0

==> /sys/module/sample/parameters/sample_rate <==
96000
44100
bash: line 37: /sys/module/sample/parameters/device_name: Permission denied
[ 3620.447235] sample: rate=96000 dev=hw:0,0 chans=4
```

`module_param`의 셋째 인자가 sysfs 파일의 권한입니다. `0444`인 `device_name`은 root도 쓸 수 없었고, `0644`인 `sample_rate`는 로드 뒤에 바뀌었습니다. 다만 바뀐 값은 변수에 들어갈 뿐이고, init에서 한 번 읽고 끝나는 코드라면 다시 읽지 않습니다. 권한을 `0`으로 주면 sysfs 파일이 생기지 않습니다.

### insmod·modprobe·rmmod

`insmod`는 파일 경로 하나를 그대로 올리고, `modprobe`는 이름으로 `/lib/modules/$(uname -r)/modules.dep`를 찾아, 거기 적힌 의존 모듈을 먼저 올린 뒤 대상 모듈을 올립니다. 모듈을 그 디렉터리에 넣은 뒤에는 `depmod -a`로 색인을 다시 만들어야 `modprobe`가 찾습니다.

```bash
mkdir -p /lib/modules/$(uname -r)/extra
cp sample.ko /lib/modules/$(uname -r)/extra/
depmod -a
grep '^extra/sample' /lib/modules/$(uname -r)/modules.dep
echo "options sample sample_rate=22050" > /etc/modprobe.d/sample.conf
modprobe sample
cat /sys/module/sample/parameters/sample_rate
```

```text
extra/sample.ko:
22050
```

`modules.dep`의 `extra/sample.ko:` 줄은 의존 모듈이 없다는 뜻입니다. `/etc/modprobe.d/`의 `options` 줄은 `modprobe`가 모듈을 올릴 때 파라미터로 붙였습니다(`modprobe.d(5)`). `insmod`는 이 파일을 읽지 않습니다.

### printk loglevel과 dynamic debug

`pr_debug`를 뺀 `pr_*` 매크로는 `KERN_*` 접두사를 붙인 `printk`입니다. v6.12 `include/linux/kern_levels.h`의 값은 `KERN_EMERG` 0, `KERN_ALERT` 1, `KERN_CRIT` 2, `KERN_ERR` 3, `KERN_WARNING` 4, `KERN_NOTICE` 5, `KERN_INFO` 6, `KERN_DEBUG` 7입니다. 콘솔에는 *console_loglevel*보다 숫자가 작은 메시지만 나가고, 현재 값은 `/proc/sys/kernel/printk`로 보고 바꿉니다(`Documentation/core-api/printk-basics.rst:57-72`).

`CONFIG_DYNAMIC_DEBUG=y`인 이 커널에서 `pr_debug`는 `DEBUG`를 정의하지 않으면 dynamic debug에 등록만 되고 꺼진 상태로 시작합니다(v6.12 `include/linux/printk.h:597-619`). 위 `sample`의 `pr_debug`는 처음 로드 때 찍히지 않았습니다. 켜는 방법은 두 가지이고, 둘 다 해 봤습니다.

```bash
echo "module sample +p" > /proc/dynamic_debug/control
grep '\[sample\]' /proc/dynamic_debug/control
modprobe -r sample
modprobe sample dyndbg=+p
dmesg
```

```text
/root/p7/706b/sample.c:22 [sample]sample_init =p "sample: debug message\n"
[ 3646.625311] sample: rate=22050 dev=default chans=0
[ 3646.625567] sample: debug message
```

`control` 파일에 쓴 설정은 이미 올라온 모듈에만 적용되므로, init 안의 `pr_debug`를 보려면 로드할 때 `dyndbg=+p`를 줍니다. `/etc/modprobe.d/*.conf`의 `options sample dyndbg=+p`로도 같은 효과를 냅니다(`Documentation/admin-guide/dynamic-debug-howto.rst:267-270`).

### 부팅 시 자동 로드

```text
# /etc/modules-load.d/sample.conf
sample
```

```text
# /etc/modprobe.d/sample.conf
options sample sample_rate=96000
blacklist nouveau
```

`modules-load.d`는 부팅 때 `systemd-modules-load.service`가 읽어 올릴 모듈의 고정 목록이고, `modprobe.d`는 `modprobe`가 모듈을 올릴 때의 옵션·blacklist입니다(`modules-load.d(5)`, `modprobe.d(5)`, systemd 257). `modules-load.d(5)`는 PCI·USB ID처럼 모듈 안에 들어 있는 정보로 자동 로드하는 쪽이 대개 더 낫다고 적습니다. 장치가 나타날 때 udev가 modalias로 모듈을 찾기 때문입니다([7-03](/blog/embedded/modern-recipes/part7-03-device-tree-basics)의 `MODULE_DEVICE_TABLE`). 이 두 파일은 재부팅이 필요해 이 글에서는 `modprobe.d`의 `options`만 위에서 시험했습니다.

## 측정 / 성능 비교

모듈 로드 시간은 이 글에서 재지 않았습니다. 위 `dmesg`의 시각으로 보면 `sample`의 `rate=` 줄과 `debug message` 줄은 같은 init 안에서 0.26 ms 차이로 찍혔지만, 이것은 로드 전체 시간이 아닙니다. 로드 시간을 비교하려면 `insmod`를 `perf stat`이나 `time`으로 여러 번 돌려 분포를 봐야 하고.

## 자주 보는 함정

> ⚠️ 라이선스 누락 또는 GPL 비호환 라이선스

`MODULE_LICENSE`를 빼면 v6.12 headers의 modpost가 빌드를 멈춥니다. GPL 비호환 라이선스로 `EXPORT_SYMBOL_GPL` 심볼(`kobject_create_and_add`는 v6.12 `lib/kobject.c:806`에서 `EXPORT_SYMBOL_GPL`)을 쓰면 역시 빌드 단계에서 막힙니다.

```text
ERROR: modpost: missing MODULE_LICENSE() in /root/p7/706c/nolic.o
ERROR: modpost: GPL-incompatible module prop.ko uses GPL-only symbol 'kernel_kobj'
ERROR: modpost: GPL-incompatible module prop.ko uses GPL-only symbol 'kobject_create_and_add'
```

GPL 전용 심볼을 쓰지 않는 `MODULE_LICENSE("Proprietary")` 모듈은 빌드되고 로드됩니다. 대신 커널이 `P` taint를 남깁니다. `tainted` 값이 12288에서 12289로 바뀌었고, 그 뒤 찍힌 커널 경고에는 taint 문자가 함께 나왔습니다.

```text
[ 3671.452522] prop2: module license 'Proprietary' taints kernel.
[ 3671.453026] Disabling lock debugging due to kernel taint
...
[ 3671.538026] Tainted: [P]=PROPRIETARY_MODULE, [O]=OOT_MODULE, [E]=UNSIGNED_MODULE
```

`module verification failed`는 서명 문제(`E`)이지 라이선스 문제가 아닙니다.

> ⚠️ 다른 커널용으로 빌드한 모듈

v6.12 mainline 트리로 빌드한 모듈을 이 Debian 커널에 올렸더니 거부됐습니다.

```text
insmod: ERROR: could not insert module /root/p7/703/src/demo_v2.ko: Invalid module format
[ 3671.622591] module demo_v2: .gnu.linkonce.this_module section size must match the kernel's built struct module size at run time
```

두 모듈의 `vermagic`도 달랐습니다(`6.12.0 SMP preempt mod_unload aarch64`와 `6.12.116+deb13-arm64 SMP mod_unload modversions aarch64`). 같은 6.12라도 설정과 패치가 다르면 구조체 배치가 달라지므로, 모듈은 올릴 커널의 headers나 빌드 트리로 빌드합니다. 커널이 바뀔 때마다 외부 모듈을 자동으로 다시 빌드하는 도구로 DKMS가 있습니다.

> ⚠️ `kmalloc(GFP_KERNEL)`을 atomic 문맥에서 호출

```c
static irqreturn_t isr(int irq, void *d) {
    void *p = kmalloc(64, GFP_KERNEL);   /* may sleep */
    ...
    return IRQ_HANDLED;
}
```

`GFP_KERNEL` 할당은 메모리를 회수하느라 잠들 수 있습니다. 커널 문서는 interrupt handler 같은 atomic 문맥에서는 `GFP_NOWAIT`를 쓰고, 메모리 예비분까지 써야 할 이유가 있을 때만 `GFP_ATOMIC`을 쓰라고 적습니다(`Documentation/core-api/memory-allocation.rst:45-52`). `GFP_NOWAIT`는 메모리가 부족하면 실패하기 쉬우므로 실패 경로를 함께 둡니다. `might_sleep()`은 `CONFIG_DEBUG_ATOMIC_SLEEP`이 켜진 커널에서 atomic 문맥 호출을 stack trace로 알려 줍니다(`include/linux/kernel.h:87-96`). 이 Debian 커널은 그 옵션이 꺼져 있어(`# CONFIG_DEBUG_ATOMIC_SLEEP is not set`) 이 경고는 재현하지 않았습니다.

> ⚠️ `module_exit`에서 등록 해제 누락

`/sys/kernel/leak_demo` kobject를 만들고 exit에서 `kobject_put()`을 빠뜨린 모듈을 내렸다가 다시 올렸습니다.

```c
static void __exit l_exit(void)
{
	/* kobject_put(k) forgotten */
}
```

```text
[ 3671.537758] sysfs: cannot create duplicate filename '/kernel/leak_demo'
...
[ 3671.541266] kobject: kobject_add_internal failed for leak_demo with -EEXIST, don't try to register things with the same name in the same directory.
```

`rmmod` 뒤에도 `/sys/kernel/leak_demo`가 남아 있었고, 두 번째 `insmod`는 `Cannot allocate memory`로 실패했습니다(init이 `NULL`을 받아 `-ENOMEM`을 돌려준 결과). `rmmod`로는 이 항목이 지워지지 않아, 이 실험에서는 재부팅하기 전까지 같은 이름을 다시 쓸 수 없었습니다. 장치에 묶인 자원이라면 `devm_*` API가 driver detach 때 자동으로 풉니다([7-03](/blog/embedded/modern-recipes/part7-03-device-tree-basics)).

## 정리

- 진입점은 `module_init`·`module_exit` 한 쌍이고, 라이선스 문자열이 GPL 전용 심볼 사용과 `P` taint를 정합니다.
- Out-of-tree·서명 없는 모듈은 `O`·`E` taint를 남기며, 이것은 라이선스와 별개입니다.
- Kbuild Makefile은 `obj-m`과 `-C $(KDIR) M=$(PWD)`가 핵심이고, `KDIR`은 올릴 커널의 트리여야 합니다.
- `module_param`의 권한이 `/sys/module/<이름>/parameters/` 파일의 권한입니다.
- `modprobe`는 `depmod`가 만든 `modules.dep`와 `/etc/modprobe.d/`를 읽고, `insmod`는 둘 다 읽지 않습니다.
- `pr_debug`는 dynamic debug로 켜고, init 안의 메시지는 로드 때 `dyndbg=+p`로 켭니다.
- exit에서 해제를 빠뜨린 sysfs 항목은 모듈을 내려도 남아 재로드를 막습니다.

다음 편은 [7-07: 캐릭터 드라이버](/blog/embedded/modern-recipes/part7-07-char-driver)입니다.

## 관련 항목

- [7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
- [7-05: 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-09: mmap](/blog/embedded/modern-recipes/part7-09-mmap)
- [7-12: sysfs](/blog/embedded/modern-recipes/part7-12-sysfs)
