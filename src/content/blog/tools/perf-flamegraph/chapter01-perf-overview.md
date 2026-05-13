---
title: "Ch 1: perf 개요 — HW PMU + SW 이벤트"
date: 2025-08-25T01:00:00
description: "Linux perf의 본질 — perf_event_open syscall, PMU 카운터, 소프트웨어 이벤트."
tags: [perf, PMU, Profiling]
series: "perf and FlameGraph"
seriesOrder: 1
draft: true
---

## 예정 내용
- perf 역사 — Linux 2.6.31+
- perf_event_open syscall
- HW PMU 카운터 — cycles, instructions, cache, branches
- SW 이벤트 — context-switches, page-faults
- tracepoint / kprobe / uprobe / USDT
- 설치 — linux-tools-$(uname -r)
- 권한 — perf_event_paranoid
