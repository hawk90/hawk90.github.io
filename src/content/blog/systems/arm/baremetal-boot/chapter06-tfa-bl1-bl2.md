---
title: "Chapter 6: TF-A BL1 → BL2 흐름"
date: 2026-05-22T06:00:00
description: "BL1의 image load, EL3 SMC를 통한 BL2 handoff, FIP(Firmware Image Package) 레이아웃을 코드로 따라갑니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 6
tags: [arm, baremetal, tf-a, bl1, bl2, fip, smc]
draft: true
---

> Outline — BL1이 BL2를 secure SRAM에 적재하고 EL3 SMC로 control을 넘기는 구체 흐름, FIP 안의 image header 파싱, 그리고 BL2가 BL31·BL32·BL33을 차례로 적재하는 순서를 다룹니다.
