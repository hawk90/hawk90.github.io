---
title: "Ch 7: bpftrace 실전 — 시그널 / 파일 / 네트워크"
date: 2025-08-31T03:00:00
description: "흔한 bpftrace 한 줄 — open / signal / TCP / VFS / scheduler 트레이스."
tags: [bpftrace, Tracing, Production]
series: "System Tracing"
seriesOrder: 7
draft: true
---

## 예정 내용
- 파일 열기 — tracepoint:syscalls:sys_enter_openat
- 시그널 — tracepoint:signal:signal_generate
- TCP — kprobe:tcp_v4_connect
- VFS read 분포 — histogram
- 스케줄러 지연 — sched_wakeup → sched_switch
- 흔한 도구 묶음 (Brendan Gregg bpftrace 스크립트)
