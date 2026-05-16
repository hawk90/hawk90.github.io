---
title: "Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지"
date: 2026-05-19T10:00:00
description: "Buildroot로 BeagleBone Black용 완전한 시스템을 구축 — defconfig부터 SD 카드 부팅까지."
series: "Buildroot Practical"
seriesOrder: 10
tags: [embedded, buildroot, beaglebone, practical]
draft: true
---

> Outline — `make beaglebone_defconfig`로 시작. U-Boot·kernel·rootfs 빌드. SD 카드 파티션·이미지 굽기. 첫 부팅 디버깅. *내 패키지* 한 개 + *내 overlay* 한 줄 추가. 시리즈 마무리 + BSP 시리즈로의 연결 — Buildroot가 rootfs를 책임지고, BSP는 *모든 것의 통합*.
