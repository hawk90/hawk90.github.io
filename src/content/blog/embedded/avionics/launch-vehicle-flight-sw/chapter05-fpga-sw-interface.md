---
title: "Ch 5: FPGA-SW 인터페이스"
date: 2026-05-27T05:00:00
description: "AXI·register map·IRQ·DMA descriptor ring — SW 측에서 보는 FPGA 통합."
series: "Launch Vehicle Flight Software"
seriesOrder: 5
tags: [avionics, fpga, axi, dma, irq, register-map]
draft: true
---

> Outline — *SW 관점*의 FPGA — Verilog 자체보다 *인터페이스 계약*. **AXI** (AXI4·AXI-Lite·AXI-Stream) — Xilinx Zynq의 PS-PL bridge. **register map**의 표준화 (control·status·data registers). **IRQ** routing — FPGA IP → GIC → kernel ISR. **DMA descriptor ring** — scatter-gather descriptor chain, completion ring. Zynq UltraScale+에서의 실제 사례.
