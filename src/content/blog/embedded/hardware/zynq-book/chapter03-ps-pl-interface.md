---
title: "Ch 3: PS-PL Interface — AXI"
date: 2026-05-19T03:00:00
description: "AXI4·AXI4-Lite·AXI4-Stream — PS와 PL 사이의 데이터 통로."
series: "The Zynq Book"
seriesOrder: 3
tags: [zynq, axi, axi-stream, dma]
draft: true
---

> Outline — *AXI4 변종* — Full(memory mapped)·Lite(register access)·Stream(continuous data). *GP/HP/ACP 포트* — General Purpose·High Performance·Accelerator Coherency Port. *PL → DDR 직접 접근* via HP. *ACP* — L2 cache coherent path. SW 관점 — register map은 memory-mapped 디바이스로 보인다. *AXI DMA* IP — 핵심 가속 채널.
