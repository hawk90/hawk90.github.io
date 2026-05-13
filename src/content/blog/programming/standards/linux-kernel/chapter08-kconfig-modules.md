---
title: "Ch 8: Kconfig & Modules"
date: 2025-05-14T08:00:00
description: "Kconfig 설정 시스템, 모듈 구조, module_init/exit, 라이선스 선언."
tags: [Linux, Kernel, Kconfig, Modules, module_init]
series: "Linux Kernel Coding Style"
seriesOrder: 8
draft: false
---

> "Kconfig is the kernel's configuration language."

## Kconfig 기초

### 설정 항목 선언

```kconfig
# drivers/my_driver/Kconfig

config MY_DRIVER
        tristate "My awesome driver"
        depends on PCI
        select FW_LOADER
        help
          This driver provides support for My Device.

          To compile this driver as a module, choose M here.
          If unsure, say N.
```

### 타입

```kconfig
# bool: y 또는 n
config DEBUG_INFO
        bool "Enable debug info"

# tristate: y, m, 또는 n
config MY_MODULE
        tristate "My module"

# int: 정수
config MAX_CPUS
        int "Maximum number of CPUs"
        default 64

# hex: 16진수
config PHYS_OFFSET
        hex "Physical address of memory"
        default 0x80000000

# string: 문자열
config DEFAULT_HOSTNAME
        string "Default hostname"
        default "(none)"
```

### 의존성

```kconfig
# depends on: 조건이 참이어야 보임
config FEATURE_A
        bool "Feature A"
        depends on FEATURE_B

# select: 자동 활성화 (주의해서 사용)
config FEATURE_A
        bool "Feature A"
        select FEATURE_B  # FEATURE_B도 활성화됨

# imply: 약한 select (덮어쓰기 가능)
config FEATURE_A
        bool "Feature A"
        imply FEATURE_B

# 복합 조건
config MY_FEATURE
        depends on (ARCH_X || ARCH_Y) && !BROKEN
```

### 메뉴 구조

```kconfig
# 메뉴 시작
menu "My Driver Options"

config MY_DRIVER
        tristate "Enable my driver"

config MY_DRIVER_DEBUG
        bool "Enable debug output"
        depends on MY_DRIVER

# 메뉴 끝
endmenu

# 조건부 메뉴
menuconfig MY_SUBSYSTEM
        bool "My Subsystem"

if MY_SUBSYSTEM

config MY_OPTION_A
        bool "Option A"

config MY_OPTION_B
        bool "Option B"

endif # MY_SUBSYSTEM
```

## 모듈 구조

### 기본 모듈 템플릿

```c
// SPDX-License-Identifier: GPL-2.0-only
/*
 * My Driver - description
 *
 * Copyright (C) 2024 Author <author@example.com>
 */

#include <linux/module.h>
#include <linux/init.h>

static int __init my_driver_init(void)
{
        pr_info("My driver loaded\n");
        return 0;
}

static void __exit my_driver_exit(void)
{
        pr_info("My driver unloaded\n");
}

module_init(my_driver_init);
module_exit(my_driver_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Author <author@example.com>");
MODULE_DESCRIPTION("My awesome driver");
MODULE_VERSION("1.0");
```

### 빌트인 vs 모듈

```c
// __init: 초기화 후 메모리 해제 (빌트인)
static int __init my_init(void) { ... }

// __exit: 모듈일 때만 포함
static void __exit my_exit(void) { ... }

// __initdata: 초기화 데이터 (읽기 전용)
static const char __initdata banner[] = "My Driver v1.0";

// __devinit/__devexit: deprecated (제거됨)
```

### 모듈 파라미터

```c
#include <linux/moduleparam.h>

// 기본 타입
static int debug_level = 0;
module_param(debug_level, int, 0644);
MODULE_PARM_DESC(debug_level, "Debug verbosity level (0-3)");

static bool enable_feature = true;
module_param(enable_feature, bool, 0644);

static char *device_name = "mydev";
module_param(device_name, charp, 0444);

// 배열
static int values[4];
static int num_values;
module_param_array(values, int, &num_values, 0644);

// 콜백 포함
static int my_param_set(const char *val, const struct kernel_param *kp)
{
        int ret = param_set_int(val, kp);
        if (ret == 0)
                apply_new_setting();
        return ret;
}

static const struct kernel_param_ops my_param_ops = {
        .set = my_param_set,
        .get = param_get_int,
};
module_param_cb(my_param, &my_param_ops, &my_param_value, 0644);
```

### 권한 플래그

```c
// 권한 (8진수)
// 0644 = owner rw, group r, other r
// 0444 = 읽기 전용
// 0 = sysfs에 노출 안 함

module_param(debug, int, 0644);  // /sys/module/xxx/parameters/debug
module_param(secret, int, 0);    // sysfs에 없음
```

## 라이선스

### MODULE_LICENSE

```c
// GPL 호환 라이선스
MODULE_LICENSE("GPL");              // GPLv2 이상
MODULE_LICENSE("GPL v2");           // GPLv2만
MODULE_LICENSE("GPL and additional rights");
MODULE_LICENSE("Dual BSD/GPL");
MODULE_LICENSE("Dual MIT/GPL");
MODULE_LICENSE("Dual MPL/GPL");

// 비GPL (일부 기능 제한)
MODULE_LICENSE("Proprietary");
```

### SPDX 식별자

```c
// 파일 첫 줄에 (주석 안)
// SPDX-License-Identifier: GPL-2.0-only
// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-License-Identifier: MIT
```

## 플랫폼 드라이버

### 기본 구조

```c
#include <linux/platform_device.h>

static int my_probe(struct platform_device *pdev)
{
        struct device *dev = &pdev->dev;

        dev_info(dev, "Probing device\n");
        return 0;
}

static int my_remove(struct platform_device *pdev)
{
        dev_info(&pdev->dev, "Removing device\n");
        return 0;
}

static const struct of_device_id my_of_match[] = {
        { .compatible = "vendor,my-device" },
        { },
};
MODULE_DEVICE_TABLE(of, my_of_match);

static struct platform_driver my_driver = {
        .probe  = my_probe,
        .remove = my_remove,
        .driver = {
                .name = "my-driver",
                .of_match_table = my_of_match,
        },
};

module_platform_driver(my_driver);
```

### PCI 드라이버

```c
#include <linux/pci.h>

static const struct pci_device_id my_pci_ids[] = {
        { PCI_DEVICE(VENDOR_ID, DEVICE_ID) },
        { 0 },
};
MODULE_DEVICE_TABLE(pci, my_pci_ids);

static int my_pci_probe(struct pci_dev *pdev,
                        const struct pci_device_id *id)
{
        return 0;
}

static void my_pci_remove(struct pci_dev *pdev)
{
}

static struct pci_driver my_pci_driver = {
        .name     = "my-pci-driver",
        .id_table = my_pci_ids,
        .probe    = my_pci_probe,
        .remove   = my_pci_remove,
};

module_pci_driver(my_pci_driver);
```

## Makefile

### 기본 Makefile

```makefile
# drivers/my_driver/Makefile

obj-$(CONFIG_MY_DRIVER) += my_driver.o

# 다중 소스 파일
my_driver-y := core.o utils.o
my_driver-$(CONFIG_MY_DRIVER_DEBUG) += debug.o
```

### 외부 모듈 빌드

```makefile
# 외부 모듈 Makefile
KDIR ?= /lib/modules/$(shell uname -r)/build

obj-m += my_module.o

all:
        $(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
        $(MAKE) -C $(KDIR) M=$(PWD) clean
```

## 디버그 출력

### printk 레벨

```c
#include <linux/printk.h>

// 레벨별 매크로 (권장)
pr_emerg("System is unusable\n");      // 0
pr_alert("Action must be taken\n");    // 1
pr_crit("Critical condition\n");       // 2
pr_err("Error condition\n");           // 3
pr_warn("Warning condition\n");        // 4
pr_notice("Normal but significant\n"); // 5
pr_info("Informational\n");            // 6
pr_debug("Debug message\n");           // 7 (CONFIG_DYNAMIC_DEBUG)

// 디바이스 포함 출력 (권장)
dev_err(dev, "Error on device %s\n", dev_name(dev));
dev_warn(dev, "Warning message\n");
dev_info(dev, "Info message\n");
dev_dbg(dev, "Debug message\n");
```

### Dynamic Debug

```c
// CONFIG_DYNAMIC_DEBUG 활성화 시
pr_debug("This can be enabled at runtime\n");
dev_dbg(dev, "This too\n");

// /sys/kernel/debug/dynamic_debug/control로 제어
// echo 'file my_driver.c +p' > /sys/kernel/debug/dynamic_debug/control
```

## 정리

| 항목 | 설명 |
|------|------|
| Kconfig | 설정 항목 정의 |
| tristate | y/m/n 세 가지 상태 |
| depends on | 의존성 |
| module_init | 초기화 함수 등록 |
| module_exit | 종료 함수 등록 |
| MODULE_LICENSE | 라이선스 선언 필수 |
| module_param | 런타임 파라미터 |

---

다음 장에서는 **Tools & Documentation**을 다룬다. checkpatch, sparse, 커널 문서화 도구를 살펴본다.
