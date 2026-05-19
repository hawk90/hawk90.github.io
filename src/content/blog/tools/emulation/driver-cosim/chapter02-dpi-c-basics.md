---
title: "Ch 2: SystemVerilog DPI-C 기초"
date: 2026-05-17T02:00:00
description: "Import·export·data type — SV와 C 사이의 다리."
series: "Driver-RTL Co-simulation"
seriesOrder: 2
tags: [dpi-c, systemverilog, import-dpi, export-dpi]
draft: true
---

> Outline — *DPI-C 표준* — SV LRM에 포함된 C foreign interface. *`import "DPI-C" function void c_func(...)`*·*`export "DPI-C" task sv_task`*. *Data type 매핑* — int·shortreal·string·packed array·struct. *Context vs pure function*. *Lifecycle* — initial·always_ff에서 호출. *Vendor 차이* — VCS·Questa·Xcelium·Verilator의 DPI 지원. C side header 자동 생성.
