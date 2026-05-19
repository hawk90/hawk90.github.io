---
title: "Ch 8: End-to-End — Driver + RTL Co-sim"
date: 2026-05-17T08:00:00
description: "Verilator + DPI-C + Linux driver — 통합 cosim flow."
series: "Driver-RTL Co-simulation"
seriesOrder: 8
tags: [cosim, end-to-end, verilator, driver-integration]
draft: true
---

> Outline — *Complete workflow* — RTL → Verilator → C++ harness + Linux driver. *DPI-C로 driver의 MMIO write가 RTL register write로 직결*. *IRQ injection from RTL to driver thread*. *Test runner* — pytest + CocoTB + driver C bin. *CI pipeline integration*·*nightly regression*. *Performance* — cycle-accurate simulation 속도와 trade-off. *NPU·accelerator pre-silicon driver dev의 실전 청사진*. 시리즈 마무리.
