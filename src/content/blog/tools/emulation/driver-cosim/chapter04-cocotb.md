---
title: "Ch 4: CocoTB — Python Testbench"
date: 2025-09-09T04:00:00
description: "Python coroutine으로 RTL testbench — productivity gain."
series: "Driver-RTL Co-simulation"
seriesOrder: 4
tags: [cocotb, python, testbench, vpi]
draft: true
---

> Outline — *CocoTB framework* — Python coroutine 기반 testbench. *VPI/VHPI*로 simulator hook (Verilator·Icarus·VCS·Questa·Xcelium). *@cocotb.test() decorator·dut signal access*. *Awaitable* — `RisingEdge`·`Timer`·`ReadOnly`. *bus driver/monitor pattern*·*AXI BFM*. *pytest 통합·coverage reporting*. *Driver C 코드를 ctypes로 import* — Python에서 driver-RTL 묶기.
