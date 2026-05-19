---
title: "Ch 4: Pin Mux와 Clock"
date: 2026-05-09T04:00:00
description: "보드의 가장 보드-특화된 초기화 — pin 멀티플렉싱과 clock tree 설정."
series: "BSP Development"
seriesOrder: 4
tags: [embedded, bsp, pinmux, clock]
draft: true
---

> Outline — SoC 핀이 *여러 기능*을 가진다 — pinmux로 한 모드 선택. DT의 `pinctrl-0`·`pinctrl-names` 패턴. Clock tree — root oscillator → PLL → divider → leaf clocks. Common Clock Framework (CCF). 보드별 변경점이 *어디서* 정의되는지.
