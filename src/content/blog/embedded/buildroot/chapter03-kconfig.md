---
title: "Ch 3: Kconfig 설정 — menuconfig와 defconfig"
date: 2026-05-19T03:00:00
description: "Buildroot의 Kconfig 시스템 — make menuconfig 사용법, defconfig 패턴, 옵션 의존성."
series: "Buildroot Practical"
seriesOrder: 3
tags: [embedded, buildroot, kconfig, defconfig]
draft: true
---

> Outline — `make menuconfig` 인터페이스, *Target options*·*Toolchain*·*System configuration*·*Kernel*·*Target packages*·*Filesystem images*·*Bootloaders*·*Host utilities* 8개 메뉴. `make qemu_aarch64_virt_defconfig` 같은 defconfig 흐름. `make savedefconfig`로 *최소 차이* defconfig 추출.
