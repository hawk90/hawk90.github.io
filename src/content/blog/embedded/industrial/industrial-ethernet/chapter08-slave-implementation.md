---
title: "Ch 8: 슬레이브 디바이스 구현 — ASIC vs FPGA vs SoC"
date: 2026-05-15T08:00:00
description: "EtherCAT 슬레이브를 만든다면 — Beckhoff ESC, FPGA IP, soft IP 중 무엇?"
series: "Industrial Ethernet"
seriesOrder: 8
tags: [slave, asic, fpga, soc, esc, hardware]
draft: true
---

> Outline — *3 옵션* — (1) Beckhoff ESC ASIC (ET1100, ET1200), (2) FPGA IP (Beckhoff IP Core, Xilinx/Altera reference), (3) PHY-only + soft MAC (불가능, 결정성 부족). *비용 vs 유연성*. *마이크로컨트롤러 + ESC* — Cortex-M4 + ET1200이 흔한 조합. *Stack* — SOES (open-source), Acontis, Beckhoff TwinCAT. *PROFINET 슬레이브* — Siemens ERTEC ASIC, Renesas, TI 솔루션. *EtherNet/IP* — Cortex-M + 일반 PHY로 충분 (cyclic 1ms).
