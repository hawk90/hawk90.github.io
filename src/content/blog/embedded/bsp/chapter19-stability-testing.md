---
title: "Ch 19: Stability testing — stress와 soak"
date: 2026-05-20T19:00:00
description: "양산 BSP의 안정성 검증 — stress 도구, 장기간 soak, thermal 사이클, EMC 영향."
series: "BSP Development"
seriesOrder: 19
tags: [embedded, bsp, stability, stress, soak, testing]
draft: true
---

> Outline — *stress* 도구 — `stress-ng`(CPU·memory·IO 부하), `memtester`·`stressapptest`(DRAM 안정성 검증), `iperf`(네트워크). *soak test* — 72시간·168시간 연속 가동. *thermal cycle test* — 환경 챔버에서 −40°C ~ 85°C 반복. *EMC*와 EOS 시나리오. 안정성 회귀 감시 (dmesg watchdog).
