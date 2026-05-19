---
title: "Ch 9: DRAM 초기화 — controller programming과 training"
date: 2026-05-09T09:00:00
description: "DDR controller 초기화 시퀀스 — 레지스터 프로그래밍, training, 보드별 파라미터의 위치."
series: "Bootloader Internals"
seriesOrder: 9
tags: [embedded, bootloader, u-boot, ddr, dram]
draft: true
---

> Outline — DDR3/DDR4 초기화 시퀀스 — power-on, PLL lock, controller config, ZQ calibration, read/write leveling. SoC별 *DDR training blob*과 U-Boot의 통합. 보드별 timing 파라미터가 어디서 오는지 (SoC vendor의 DDR config tool).
