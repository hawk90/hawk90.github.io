---
title: "Ch 13: Switching·Fabric Manager — 2.0 pooling에서 3.x fabric까지"
date: 2026-05-16T09:13:00
description: "CXL switch의 진화와 Fabric Manager의 역할."
series: "CXL 4.0 Internals"
seriesOrder: 13
tags: [cxl, switch, fabric, rack-scale]
draft: true
---

> Outline — CXL 2.0 switching — single-host fan-out·multi-host pooling, CXL 3.0 fabric — multi-level switch·PBR·GFAM, Switch internal — port table·routing·QoS, Fabric Manager — out-of-band control plane (allocation·hot-plug·monitoring), MCTP (Management Component Transport Protocol) — FM↔switch 통신, DCD (Dynamic Capacity Device) — runtime 메모리 재할당, Composability vision.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
