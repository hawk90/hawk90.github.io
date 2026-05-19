---
title: "Ch 11: 부트로그 디버깅"
date: 2026-05-09T11:00:00
description: "부트 실패 패턴 카탈로그 — 시리얼 garbage, hang, panic, late hang의 대응."
series: "BSP Development"
seriesOrder: 11
tags: [embedded, bsp, debugging, bootlog]
draft: true
---

> Outline — *시리얼 출력이 garbage* → baudrate / UART pinmux. *SPL은 나오나 U-Boot가 hang* → DRAM. *kernel decompress 후 침묵* → earlycon 미설정. *Kernel panic at init* → rootfs 인자. *driver probe 실패* → DT binding. 각 패턴의 진단 명령과 수정 지점.
