---
title: "Ch 13: U-Boot 통합 — 빌드·env·fw_env"
date: 2026-05-19T13:00:00
description: "Buildroot가 U-Boot를 가져와 빌드·패키징하는 방식과 env·fw_env.config로 런타임에 접근하는 패턴."
series: "Buildroot Practical"
seriesOrder: 13
tags: [embedded, buildroot, u-boot, bootloader, fw-env]
draft: true
---

Outline:
- BR2_TARGET_UBOOT_* 옵션
- defconfig·custom config·patches
- 산출물 (u-boot.bin / u-boot.img / SPL / FIT)
- boot.scr / uEnv.txt 통합
- fw_env.config — userspace에서 env 접근
- 흔한 실수 — env 위치 mismatch
