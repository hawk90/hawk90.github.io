---
title: "Ch 3: Device Tree 설계"
date: 2026-05-09T03:00:00
description: "보드 토폴로지를 DT로 표현 — SoC dtsi 상속, 보드 dts 작성, overlay 활용."
series: "BSP Development"
seriesOrder: 3
tags: [embedded, bsp, device-tree, dts]
draft: true
---

> Outline — `<soc>.dtsi`(SoC 공통) → `<board>.dts`(보드 변형) 상속. 노드 명명·`compatible` 문자열·`reg`/`interrupts`/`clocks` 표준 속성. `Documentation/devicetree/bindings/` 검증. DT overlay로 보드 변형 관리.
