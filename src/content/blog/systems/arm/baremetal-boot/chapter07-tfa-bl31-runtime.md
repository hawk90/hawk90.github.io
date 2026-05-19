---
title: "Chapter 7: TF-A BL31 EL3 Runtime"
date: 2026-05-22T07:00:00
description: "BL31의 EL3 runtime — PSCI·SDEI·RAS service의 dispatcher 구조와 SMC 처리 흐름을 분석합니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 7
tags: [arm, baremetal, tf-a, bl31, psci, sdei, ras, el3]
draft: true
---

> Outline — 부팅 후에도 살아 있는 BL31의 역할 — SMC dispatcher, PSCI handler, SDEI(Software Delegated Exception), RAS(Reliability Availability Serviceability) service의 구조와 진입점을 정리합니다.
