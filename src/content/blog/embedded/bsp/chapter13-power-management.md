---
title: "Ch 13: Power Management — suspend/resume, runtime PM, regulators"
date: 2026-05-09T13:00:00
description: "BSP의 전력 관리 — suspend-to-RAM, runtime PM, regulator framework, CPU idle/freq."
series: "BSP Development"
seriesOrder: 13
tags: [embedded, bsp, power-management, pm, runtime-pm]
draft: true
---

> Outline — Linux PM의 4개 축 — *system sleep* (suspend-to-RAM/disk), *runtime PM* (디바이스별 dynamic suspend), *cpuidle* (CPU C-states), *cpufreq* (DVFS). regulator framework로 전원 도메인 제어. BSP가 정의해야 할 것 — `suspend_ops`, `pm_ops`, DT의 `power-domains`. 양산에서의 측정과 튜닝.
