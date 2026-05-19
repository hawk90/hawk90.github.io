---
title: "Ch 1: Why Pre-Silicon Driver Verification"
date: 2026-05-17T01:00:00
description: "Silicon 없이 driver 검증 — co-simulation의 의미."
series: "Driver-RTL Co-simulation"
seriesOrder: 1
tags: [cosim, dpi-c, pre-silicon, verification]
draft: true
---

> Outline — *문제* — chip tape-out 전 driver 검증 불가, post-silicon에 버그 발견하면 비용 폭증. *해결책* — RTL simulation에 driver C 코드를 *직접 연결*. *Cosim의 가치* — cycle-accurate·timing-aware·reproducible. *비교 대상* — QEMU (functional only)·FPGA prototype·post-silicon test. *NPU·chiplet·SoC 진로의 표준 도구*. 시리즈 — DPI-C·Verilator·CocoTB·SystemC TLM 8장.
