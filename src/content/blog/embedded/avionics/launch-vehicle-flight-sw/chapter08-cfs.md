---
title: "Ch 8: NASA cFS — 오픈소스 flight SW"
date: 2026-05-27T08:00:00
description: "NASA Core Flight System — flight SW framework의 사실상 표준."
series: "Launch Vehicle Flight Software"
seriesOrder: 8
tags: [avionics, cfs, nasa, flight-software, framework]
draft: true
---

> Outline — **cFS** = *Core Flight Executive (cFE) + OSAL (OS Abstraction Layer) + PSP (Platform Support Package) + apps*. **cFE 4대 서비스** — Executive(앱 lifecycle)·Time·Event·Software Bus(메시지). *App*은 message로만 통신 — *fault isolation* 자연스러움. 진짜 미션 (LADEE·MMS·Lunar Reconnaissance Orbiter 등). 채택 진입점 — github.com/nasa/cFS.
