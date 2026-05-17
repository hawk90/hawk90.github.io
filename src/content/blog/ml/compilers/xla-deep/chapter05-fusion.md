---
title: "Ch 5: Operator Fusion 전략"
date: 2027-08-01T05:00:00
description: "Fusion이 왜 ML compiler의 가장 큰 무기인가."
series: "XLA·OpenXLA 심화"
seriesOrder: 5
tags: [xla, fusion, kernel-launch, bandwidth]
draft: true
---

> Outline — *Why fusion* — kernel launch overhead·memory roundtrip 제거. *Vertical (producer-consumer)* vs *horizontal (siblings)*. *Fusion kind* — loop·input·output·custom. *Cost model* — bytes saved·register pressure. *GPU code generation* — single kernel. *HLO `Fusion` op*과 backend별 codegen.
