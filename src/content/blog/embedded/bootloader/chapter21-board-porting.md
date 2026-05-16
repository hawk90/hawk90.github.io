---
title: "Ch 21: 새 보드 포팅 — defconfig부터 첫 부팅까지"
date: 2026-05-18T21:00:00
description: "U-Boot에 새 보드를 추가하는 전체 워크플로 — configs·board·dts·MAINTAINERS."
series: "Bootloader Internals"
seriesOrder: 21
tags: [embedded, bootloader, u-boot, porting, board]
draft: true
---

> Outline — *비슷한 보드를 베이스로* 시작하는 패턴. 6개 파일 변경 — `configs/<board>_defconfig`, `board/<vendor>/<board>/`, `arch/<arch>/dts/<board>.dts`, `include/configs/<board>.h`, `Kconfig`, `MAINTAINERS`. 첫 시리얼 출력까지의 디버깅 단계. *BSP 시리즈 Ch 6*과 두 관점으로 함께 보기.
