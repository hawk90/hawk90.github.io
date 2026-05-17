---
title: "Ch 6: Bus Functional Model (BFM) in C"
date: 2025-09-09T06:00:00
description: "Driver와 RTL 사이의 protocol-aware adapter."
series: "Driver-RTL Co-simulation"
seriesOrder: 6
tags: [bfm, axi, pcie, protocol-checker]
draft: true
---

> Outline — *BFM 정의* — bus protocol을 functional model로 구현. *AXI BFM*·*PCIe BFM*·*AHB BFM*. *C로 작성된 BFM과 DPI-C 연결*. *Master·slave·monitor BFM*. *Protocol assertion·timing checker*. *Driver의 register write/read가 BFM을 통해 RTL에 도달*. *Open source* — Verilator AXI BFM·CocoTB extensions·UVM-AXI.
