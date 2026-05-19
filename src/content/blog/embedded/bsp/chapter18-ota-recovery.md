---
title: "Ch 18: OTA와 field recovery"
date: 2026-05-09T18:00:00
description: "현장 배포된 보드의 펌웨어 업데이트와 복구 — RAUC/SWUpdate 통합, recovery 파티션, USB recovery."
series: "BSP Development"
seriesOrder: 18
tags: [embedded, bsp, ota, recovery, rauc, swupdate]
draft: true
---

> Outline — *부트로더 시리즈 Ch 20*과의 분업 — 거기서는 *도구 자체*, 여기서는 *BSP 통합*. RAUC bundle을 어떻게 생성·서명·배포할지. *recovery 파티션* 설계 — 최소 시스템으로 OTA·완전 복구. USB DFU·`uuu` 같은 양산 복구 도구.
