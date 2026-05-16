---
title: "Ch 16: Buildroot/Yocto와 BSP — rootfs 통합"
date: 2026-05-20T16:00:00
description: "BSP에서 rootfs 빌드 시스템 선택과 통합 — Buildroot 외부 트리, Yocto 메타레이어."
series: "BSP Development"
seriesOrder: 16
tags: [embedded, bsp, buildroot, yocto, rootfs]
draft: true
---

> Outline — Buildroot 외부 트리 (BR2_EXTERNAL)로 BSP의 rootfs 부분. Yocto의 meta-<bsp> 레이어. *Buildroot vs Yocto* — 팀 크기·릴리스 주기·SDK 요구에 따른 선택. *Buildroot 시리즈 Ch 10*과의 분업 — Buildroot는 *도구*, 여기서는 *BSP의 한 부분*.
