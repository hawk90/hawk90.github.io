---
title: "Ch 15: 부트 시간 최적화"
date: 2026-05-20T15:00:00
description: "boot에서 application까지 시간을 줄이는 기법 — measurement, Falcon, deferred init, kernel slim."
series: "BSP Development"
seriesOrder: 15
tags: [embedded, bsp, boot-time, optimization, sub-second]
draft: true
---

> Outline — *measure first* — `printk timestamps`, `bootchartd`, `systemd-analyze`. 단계별 최적화 — *부트로더*(Falcon mode), *커널*(모듈화·initcall_debug), *userspace*(서비스 의존성 분석). sub-second boot 사례. 자동차·산업용 보드의 *cold start* 요구사항.
