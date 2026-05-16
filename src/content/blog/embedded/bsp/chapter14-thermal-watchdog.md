---
title: "Ch 14: Thermal과 watchdog"
date: 2026-05-20T14:00:00
description: "보드 안전 장치 — thermal zone과 trip point, hardware watchdog 통합."
series: "BSP Development"
seriesOrder: 14
tags: [embedded, bsp, thermal, watchdog, safety]
draft: true
---

> Outline — Linux thermal framework — sensor·zone·trip point·cooling device. DT의 `thermal-zones` 노드. CPU throttling cooling device. *하드웨어 watchdog* — `/dev/watchdog`, `WDIOC_KEEPALIVE`, systemd watchdog 통합. *boot-time watchdog* — 부팅이 너무 오래 걸리면 reset.
