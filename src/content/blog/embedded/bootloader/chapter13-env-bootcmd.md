---
title: "Ch 13: 환경 변수와 bootcmd"
date: 2026-05-09T13:00:00
description: "U-Boot 환경 변수 시스템 — saveenv·bootcmd·bootargs·distro_bootcmd 패턴."
series: "Bootloader Internals"
seriesOrder: 13
tags: [embedded, bootloader, u-boot, env, bootcmd]
draft: true
---

> Outline — 환경 변수의 저장 위치 (MMC env partition·SPI flash·UBI). `setenv`/`saveenv`/`printenv` 흐름. `bootcmd`·`bootargs`·`bootdelay` 핵심 변수. distro_bootcmd — 표준화된 부트 시나리오. 환경 변수 *redundancy* (이중화).
