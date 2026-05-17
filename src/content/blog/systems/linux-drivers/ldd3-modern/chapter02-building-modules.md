---
title: "Ch 2: Building and Running Modules"
date: 2026-06-01T02:00:00
description: "Hello world 모듈부터 — module_init·module_exit·Kbuild·printk의 모던 사용."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 2
tags: [linux, driver, module, kbuild]
draft: true
---

> Outline — `module_init`·`module_exit`·`MODULE_LICENSE`. Kbuild 구조 — `obj-m`·`make -C $(KDIR) M=$(PWD) modules`. `insmod`·`rmmod`·`modprobe`·`lsmod`·`modinfo`. printk levels — `KERN_INFO`·`pr_info`·`dev_info`. 6.x에서의 *signed modules*와 *MODULE_IMPORT_NS*.
