---
title: "Chapter 3: Cortex-M Linker Script & Memory Map"
date: 2026-05-22T03:00:00
description: "Cortex-M의 `.text/.data/.bss/.stack` 배치와 LMA·VMA 이중성을 링커 스크립트로 정확히 다룹니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 3
tags: [arm, baremetal, cortex-m, linker-script, memory-map, lma-vma]
draft: true
---

> Outline — `MEMORY`와 `SECTIONS`의 두 축, LMA(Load) vs VMA(Virtual) 분리, vector table·stack·heap의 자리 잡기, `_estack`·`_sidata`·`_sbss` 같은 symbol이 Reset_Handler와 어떻게 묶이는지를 정리합니다.
