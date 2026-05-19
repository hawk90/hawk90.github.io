---
title: "Ch 9: 전력 관리 — Runtime PM"
date: 2026-05-16T09:00:00
description: "유휴 NPU를 끄고·다시 켠다 — 모바일·서버 모두 핵심."
series: "NPU 드라이버 개발"
seriesOrder: 9
tags: [npu, runtime-pm, power-management, dvfs]
draft: true
---

> Outline — *Linux runtime PM* — `pm_runtime_get_sync`·`pm_runtime_put_autosuspend`. *Reference counting*. *DVFS*·*devfreq*·*OPP table*. *Clock gating*·*power gating*. *Wakeup latency budget*. *Idle policy* — autosuspend delay tuning. *thermal·power budget* 통합.
