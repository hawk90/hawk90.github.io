---
title: "Chapter 8: PSCI / SMCCC"
date: 2026-05-22T08:00:00
description: "PSCI의 CPU power state 모델과 SMCCC ABI — OS와 EL3 사이의 통신 규약을 정리합니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 8
tags: [arm, baremetal, psci, smccc, cpu-power, abi]
draft: true
---

> Outline — PSCI(Power State Coordination Interface)의 CPU_ON·CPU_OFF·CPU_SUSPEND·SYSTEM_RESET function ID, SMCCC(SMC Calling Convention) 1.2의 register 사용 규약, OS와 EL3 사이의 호환성 보장 메커니즘을 다룹니다.
