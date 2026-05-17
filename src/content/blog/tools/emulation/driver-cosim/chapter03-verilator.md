---
title: "Ch 3: Verilator — Open Source SV Simulator"
date: 2025-09-09T03:00:00
description: "RTL → C++ — driver code와 link되는 가장 빠른 simulator."
series: "Driver-RTL Co-simulation"
seriesOrder: 3
tags: [verilator, simulator, open-source, c-plus-plus]
draft: true
---

> Outline — *Verilator 모델* — SystemVerilog → cycle-accurate C++ class. *V<top>.h·.cpp* 생성. *Driver 코드를 같은 C++ binary에 link*. *Timing model* — clock·reset·toggle. *Waveform output* — VCD·FST. *Coverage·assertion 지원*. *DPI 지원*. *Verilator 한계* — synthesizable subset만. *생태계* — Chipyard·OpenROAD·NVIDIA gen-AI sim.
