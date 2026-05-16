---
title: "Ch 8: Linux 커널 설정"
date: 2026-05-20T08:00:00
description: "BSP에서 커널을 빌드 — defconfig 선택·커스터마이즈, DT 통합, 모듈 vs 빌트인."
series: "BSP Development"
seriesOrder: 8
tags: [embedded, bsp, linux-kernel, defconfig]
draft: true
---

> Outline — `arch/<arch>/configs/<board>_defconfig`. *어떤 옵션을 빌트인*하고 *어떤 옵션을 모듈*로 — initramfs 크기 vs 유연성. `arch/<arch>/boot/dts/`에 DT 추가. `make Image`·`Image.gz`·`zImage` 선택. *vendor 커널 vs mainline 커널* 트레이드오프.
