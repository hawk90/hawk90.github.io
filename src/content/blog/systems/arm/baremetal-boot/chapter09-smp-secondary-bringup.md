---
title: "Chapter 9: SMP Secondary CPU Bring-up"
date: 2026-05-22T09:00:00
description: "spin table 방식과 PSCI CPU_ON 방식의 secondary CPU 깨우기 — Linux smp_init 진입까지를 봅니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 9
tags: [arm, baremetal, smp, psci, spin-table, secondary-cpu]
draft: true
---

> Outline — DT의 `enable-method` 분기(`"spin-table"` vs `"psci"`), spin table 주소 polling 흐름, PSCI CPU_ON SMC 흐름, 그리고 Linux의 `smp_init`이 secondary core에 진입하는 시점까지를 추적합니다.
