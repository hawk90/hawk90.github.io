---
title: "Ch 3: 빌드 시스템 — Kconfig, Makefile, defconfig"
date: 2026-05-09T03:00:00
description: "U-Boot의 빌드 시스템 — Kconfig 옵션, Makefile 구조, defconfig 패턴, out-of-tree 빌드."
series: "Bootloader Internals"
seriesOrder: 3
tags: [embedded, bootloader, u-boot, kconfig, build]
draft: true
---

> Outline — `make qemu_arm64_defconfig` → `make menuconfig` → `make` 흐름. `configs/`·`board/`·`arch/`·`common/` 디렉터리. Kbuild 빌드 시스템과 커널과의 유사성·차이. cross-compile 환경 변수.
