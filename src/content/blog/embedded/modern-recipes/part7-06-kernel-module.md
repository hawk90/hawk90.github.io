---
title: "7-06: Kernel Module 기초 — init/exit·Parameter·KBuild·DKMS"
date: 2026-05-15T08:00:00
description: "Linux kernel module의 진입점, 모듈 파라미터, KBuild Makefile, insmod 흐름, DKMS 배포까지 한 번에 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 80
tags: [recipes, kernel-module, ko, kbuild, dkms]
---

## 한 줄 요약

> **"Kernel module = `.ko` 한 개로 동적 로드하는 driver 단위."** `module_init`과 `module_exit` 두 함수만 있으면 시작은 끝이고, 나머지 작업은 KBuild·sysfs·devm 인프라가 받쳐줍니다.

## 어떤 상황에서 쓰나

새 PCIe 카드를 받아 register 매핑부터 확인해야 하거나, 기존 vendor driver에 작은 패치를 얹어 출하 라인에서 동작을 바꿔야 할 때가 있습니다. Kernel image 자체를 다시 빌드하면 부팅 절차와 QA 까지 모두 영향을 받으니, 보통은 `.ko` 한 개로 작업합니다. 양산 단계에서도 `modprobe`로 끼웠다 빼며 회귀 테스트를 돌리는 편이 훨씬 빠릅니다.

VMware·NVIDIA·WireGuard처럼 외부에서 배포하는 driver도 모두 module 형태입니다. Kernel 버전이 바뀔 때마다 다시 빌드해야 하니, 양산 환경에서는 DKMS로 자동 재빌드를 거는 패턴이 표준입니다.

## 핵심 개념

Kernel module은 크게 네 가지 요소로 정의됩니다.

1. **진입점** — `module_init` / `module_exit`
2. **메타데이터** — `MODULE_LICENSE` / `AUTHOR` / `DESCRIPTION`
3. **빌드** — KBuild Makefile + 커널 source 트리
4. **로드** — `insmod` / `rmmod` / `modprobe` + `depmod`

라이선스 문자열은 단순한 문서가 아니라 *taint flag*에 영향을 주는 실제 동작입니다. `"GPL"`이 아니면 `_GPL` 접미사가 붙은 export symbol에 접근할 수 없고, 커널 oops 메시지에 *Proprietary* 표시가 남습니다.

## 코드 / 실제 사용 예

### Hello 모듈 한 장

```c
#include <linux/module.h>
#include <linux/init.h>
#include <linux/kernel.h>

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

`__init`과 `__exit` 매크로는 함수 코드를 별도 섹션에 모아 두었다가 초기화가 끝나면 해제할 수 있도록 합니다. Module로 빌드하면 큰 차이가 없지만, 같은 코드를 built-in으로 컴파일할 때는 메모리 절약 효과가 분명합니다.

### KBuild Makefile

```makefile
# Makefile
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

`-C` 옵션이 커널 source의 KBuild를 호출하고, `M=$(PWD)` 가 우리 디렉터리를 가리킵니다. Cross compile에는 `ARCH`·`CROSS_COMPILE`을 추가합니다.

```bash
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- \
     KDIR=/work/linux-bsp modules
```

### Module 파라미터

```c
static int sample_rate = 48000;
module_param(sample_rate, int, 0644);
MODULE_PARM_DESC(sample_rate, "Sample rate in Hz");

static char *device_name = "default";
module_param(device_name, charp, 0444);
MODULE_PARM_DESC(device_name, "Underlying device name");

static int chans[4];
static int chans_count;
module_param_array(chans, int, &chans_count, 0644);
```

```bash
sudo insmod sample.ko sample_rate=96000 device_name=hw:0,0 chans=1,2,3,4

# 런타임 확인 / 수정
cat /sys/module/sample/parameters/sample_rate
echo 44100 > /sys/module/sample/parameters/sample_rate
```

파라미터 mode가 `0`이면 sysfs에 노출되지 않습니다. 외부에 보여줄 값만 `0644`로 두면 됩니다.

### insmod·modprobe·rmmod

```bash
sudo insmod ./hello.ko             # 단일 파일만 로드
sudo modprobe hello                # 의존성 자동 해결
sudo rmmod hello                   # 언로드

lsmod | head                       # 로드된 모듈
modinfo hello                      # 메타데이터
```

`modprobe`는 `/lib/modules/$(uname -r)/modules.dep`을 참고해 의존 module을 먼저 로드합니다. 그래서 `make modules_install` 후에는 반드시 `depmod -a`로 dependency를 갱신합니다.

### printk loglevel과 dmesg

```c
pr_emerg("hello: kernel panic candidate\n");   /* KERN_EMERG = 0 */
pr_alert("hello: alert\n");                    /* KERN_ALERT  = 1 */
pr_err  ("hello: error %d\n", err);            /* KERN_ERR    = 3 */
pr_warn ("hello: warning\n");                  /* KERN_WARNING= 4 */
pr_info ("hello: info\n");                     /* KERN_INFO   = 6 */
pr_debug("hello: trace value=%u\n", v);        /* KERN_DEBUG  = 7 */
```

```bash
dmesg -wH                                # follow + human time
dmesg --level=err,warn                   # 필터링
echo 8 > /proc/sys/kernel/printk         # console에 debug까지 표시
```

`pr_debug`는 `DEBUG` 매크로나 `dynamic_debug`가 켜져 있을 때만 출력됩니다.

### 부팅 시 자동 로드

```text
# /etc/modules-load.d/sample.conf
sample
i2c-dev
```

```text
# /etc/modprobe.d/sample.conf
options sample sample_rate=96000
blacklist nouveau
```

`modules-load.d`는 *어떤* 모듈을 자동 로드할지, `modprobe.d`는 *어떻게* 로드할지를 정합니다.

## 측정 / 성능 비교

`.ko` 한 개 로드에 드는 시간은 대부분 1 ms 이하지만, 의존성이 깊거나 firmware blob을 같이 가져오면 수십 ms까지 늘어납니다.

| 모듈 | size | load time |
|---|---|---|
| sample (hello) | 8 KB | 0.4 ms |
| sample + sysfs group | 12 KB | 0.5 ms |
| ath10k_pci + firmware | 540 KB | 48 ms |
| nvidia (proprietary) | 28 MB | 320 ms |

부팅 시간을 줄여야 한다면 자주 쓰는 driver를 built-in으로 옮기고, drone·infotainment처럼 USB 디바이스 종류가 다양한 환경에서는 module로 유지해 hot-plug에 맞춥니다.

## 자주 보는 함정

> 라이선스 누락 또는 잘못 표기

```c
/* MODULE_LICENSE 없음 */
```

`Module verification failed: signature and/or required key missing - tainting kernel`가 dmesg에 찍히고 `Tainted: P` 플래그가 영구적으로 남습니다. `"GPL v2"` 또는 `"Dual MIT/GPL"`처럼 인정된 문자열을 반드시 적습니다.

> ABI 호환성 가정

```c
struct device_driver { ... };   /* 커널 버전마다 필드가 늘어남 */
```

Vermagic이 일치하지 않으면 `modprobe`가 거부합니다. 사용자 빌드 환경의 `linux-headers` 버전을 정확히 맞추거나, DKMS로 자동 재빌드를 거는 편이 안전합니다.

> `kmalloc(GFP_KERNEL)`을 ISR에서 호출

```c
static irqreturn_t isr(int irq, void *d) {
    void *p = kmalloc(64, GFP_KERNEL);   /* sleep 가능 */
}
```

ISR이나 spinlock 안에서는 `GFP_ATOMIC`을 써야 합니다. `might_sleep()` 매크로를 곳곳에 두면 디버그 빌드에서 위반을 잡아 줍니다.

> `__exit`에서 등록 해제 누락

```c
static void __exit sample_exit(void) {
    /* sysfs_remove_group 호출 잊음 */
}
```

`rmmod` 후 다시 `insmod` 시 `sysfs: cannot create duplicate filename` 오류가 나면 거의 항상 cleanup 누락입니다. 가능하면 `devm_*` 또는 managed API로 등록과 해제를 한 쌍으로 묶습니다.

> Out-of-tree 빌드 시 헤더 경로

```bash
make: *** /lib/modules/5.15.0/build: No such file or directory
```

`linux-headers-$(uname -r)` 패키지 또는 Yocto SDK의 `kernel-devsrc`가 필요합니다. 양산 BSP에서는 `KDIR`을 BSP 트리로 명시합니다.

## 정리

- 진입점은 `module_init`·`module_exit` 한 쌍이고, 라이선스는 단순 문서가 아니라 동작에 영향을 줍니다.
- KBuild Makefile은 `obj-m`과 커널 source를 `-C`로 가리키는 두 줄이 핵심입니다.
- 파라미터는 `module_param`으로 선언하고 mode를 `0644`로 두면 `/sys/module/.../parameters`에 노출됩니다.
- `insmod`는 단일 파일, `modprobe`는 dependency까지 처리합니다. `depmod -a`로 dependency 캐시를 갱신해야 합니다.
- 부팅 시 자동 로드는 `/etc/modules-load.d`, 옵션은 `/etc/modprobe.d`로 분리합니다.
- DKMS는 커널 업데이트 때마다 모듈을 자동 재빌드해 vendor가 외부 driver를 배포할 때 표준입니다.
- 디버그 출력은 `pr_*` 매크로와 dynamic debug, 메모리는 `GFP_KERNEL`과 `GFP_ATOMIC`을 분명히 구분합니다.

다음 편은 **mmap의 네 가지 모드**입니다.

## 관련 항목

- [1-04: Device Tree](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
- [4-02: mmap](/blog/embedded/modern-recipes/part7-09-mmap)
- [4-05: sysfs](/blog/embedded/modern-recipes/part7-12-sysfs)
