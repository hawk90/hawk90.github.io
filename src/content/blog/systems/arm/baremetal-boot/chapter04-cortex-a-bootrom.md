---
title: "Chapter 4: Cortex-A BootROM 분석"
date: 2026-05-22T04:00:00
description: "NXP i.MX, STM32MP, RPi 4의 vendor BootROM을 비교하며 첫 명령부터 BL1 로드까지의 책임을 분리합니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 4
tags: [arm, baremetal, cortex-a, bootrom, imx, stm32mp, rpi]
draft: true
---

> Outline — NXP i.MX(IVT + HAB), STM32MP(FSBL signed header), Raspberry Pi 4(GPU-firmware-driven) 세 BootROM을 비교해 *공통 책임*과 *vendor 특화* 부분을 가립니다.
