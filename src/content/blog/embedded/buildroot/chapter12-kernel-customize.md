---
title: "Ch 12: Linux 커널 customize — defconfig fragment와 DTS"
date: 2026-05-19T12:00:00
description: "Buildroot에서 mainline 커널을 vendor 트리·custom config·in-tree DTS로 customize하는 패턴."
series: "Buildroot Practical"
seriesOrder: 12
tags: [embedded, buildroot, linux-kernel, defconfig, devicetree]
draft: true
---

Outline:
- BR2_LINUX_KERNEL_* 옵션 트리
- mainline vs vendor fork — custom source location
- defconfig 선택 + fragment (KCONFIG_*)
- in-tree DTS vs out-of-tree DTS
- 모듈 빌드와 rootfs 통합
- linux-rebuild / linux-reinstall 흐름
