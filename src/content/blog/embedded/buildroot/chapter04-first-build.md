---
title: "Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템"
date: 2026-05-19T04:00:00
description: "qemu_aarch64_virt_defconfig로 첫 시스템을 빌드하고 QEMU에서 부팅하는 전체 흐름."
series: "Buildroot Practical"
seriesOrder: 4
tags: [embedded, buildroot, qemu, first-build]
draft: true
---

> Outline — `git clone` → `make qemu_aarch64_virt_defconfig` → `make` → 30분 대기 → `output/images/start-qemu.sh`. 빌드 중 *각 단계*가 의미하는 것 (toolchain·linux·u-boot·busybox·rootfs). 첫 login prompt. *dl/* 캐시의 역할.
