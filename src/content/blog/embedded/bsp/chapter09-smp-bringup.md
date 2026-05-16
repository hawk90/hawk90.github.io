---
title: "Ch 9: Multi-core SMP bring-up"
date: 2026-05-20T09:00:00
description: "보드의 다른 코어를 깨우는 절차 — PSCI, spin-table, ARM CPU hotplug."
series: "BSP Development"
seriesOrder: 9
tags: [embedded, bsp, smp, psci, multicore]
draft: true
---

> Outline — *왜 boot CPU 외의 코어가 자동으로 안 도는가* — secondary core는 *대기 상태*로 reset. PSCI(Power State Coordination Interface) — `cpu_on`·`cpu_off`·`cpu_suspend`. spin-table 방식 (오래된 시스템). ARM·RISC-V의 secondary CPU release 메커니즘. DT의 `cpus` 노드와 `enable-method`.
