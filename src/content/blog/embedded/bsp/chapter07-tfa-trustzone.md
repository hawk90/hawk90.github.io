---
title: "Ch 7: TF-A와 TrustZone 통합"
date: 2026-05-20T07:00:00
description: "ARM Trusted Firmware-A를 BSP에 통합 — BL31 빌드, U-Boot와 BL33 결합, secure/non-secure 분리."
series: "BSP Development"
seriesOrder: 7
tags: [embedded, bsp, tf-a, trustzone, security]
draft: true
---

> Outline — TF-A 빌드 (`make CROSS_COMPILE=... PLAT=<board> bl31`). BL31(secure monitor)·BL32(secure payload)·BL33(U-Boot)의 결합 흐름. TrustZone에 의한 메모리·peripheral 분리. SiP(Silicon Provider) service. OP-TEE 통합 (BL32 슬롯).
