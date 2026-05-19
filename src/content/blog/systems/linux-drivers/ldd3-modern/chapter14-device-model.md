---
title: "Ch 14: The Linux Device Model"
date: 2026-05-13T14:00:00
description: "kobject·sysfs·bus·class·device — Linux 디바이스 모델의 뼈대."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 14
tags: [linux, device-model, kobject, sysfs, udev]
draft: true
---

> Outline — *kobject* — refcount + sysfs entry. *sysfs* — `/sys/...` 노출. *bus_type*·`device_driver`·`device` 3-tuple — driver model. *class* — userspace 뷰. *device tree* — `of_*` 함수로 DT 노드 매칭. *udev* — netlink uevent. 6.x의 `auxiliary_bus` — peripheral subdevice 모델.
