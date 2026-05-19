---
title: "Ch 22: 디버깅 — DEBUG, JTAG, serial, post-mortem"
date: 2026-05-09T22:00:00
description: "부트로더 디버깅 — CONFIG_DEBUG_UART, JTAG, 시리얼 콘솔, panic dump 읽기."
series: "Bootloader Internals"
seriesOrder: 22
tags: [embedded, bootloader, u-boot, debugging, jtag]
draft: true
---

> Outline — *시리얼이 안 나올 때* — `CONFIG_DEBUG_UART` early console. JTAG로 OpenOCD/Lauterbach 붙이는 워크플로. U-Boot crash 분석 — register dump 읽는 법, `bdinfo`. 시리즈 마무리 + 다음 시리즈(BSP / Buildroot) 연결.
