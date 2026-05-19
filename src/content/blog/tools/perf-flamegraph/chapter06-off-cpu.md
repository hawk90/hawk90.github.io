---
title: "Ch 6: off-CPU FlameGraph"
date: 2026-05-17T06:00:00
description: "blocking 시간 분석. sched_switch tracepoint 활용."
tags: [perf, off-CPU, Blocking]
series: "perf and FlameGraph"
seriesOrder: 6
draft: true
---

## 예정 내용
- on-CPU vs off-CPU 차이
- 왜 off-CPU 분석 — I/O / 락 / 슬립
- sched:sched_switch tracepoint
- perf record -e sched:sched_switch
- offcputime (bcc) — eBPF 기반
- off-CPU FlameGraph
- BCC / bpftrace 활용
