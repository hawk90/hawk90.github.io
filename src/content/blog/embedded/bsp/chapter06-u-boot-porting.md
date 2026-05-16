---
title: "Ch 6: U-Boot 보드 포팅"
date: 2026-05-20T06:00:00
description: "BSP 관점에서의 U-Boot 추가 — defconfig·board.c·DT 통합 흐름."
series: "BSP Development"
seriesOrder: 6
tags: [embedded, bsp, u-boot, porting]
draft: true
---

> Outline — *부트로더 시리즈 Ch 21*이 *U-Boot 자체* 시각이라면, 이 글은 *전체 BSP*의 한 단계로서 U-Boot 포팅. defconfig 작성, board init hook 채우기, DT 분기. 부트 첫 시리얼 출력에 도달하는 디버깅 사이클.
