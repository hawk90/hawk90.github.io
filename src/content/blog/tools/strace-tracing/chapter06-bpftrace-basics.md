---
title: "Ch 6: bpftrace 기초 — 언어 / probe"
date: 2026-08-31T02:00:00
description: "bpftrace — awk-like DSL. probe 타입, 변수, map, action."
tags: [bpftrace, eBPF, DSL]
series: "System Tracing"
seriesOrder: 6
draft: true
---

## 예정 내용
- bpftrace -e 'BEGIN { ... }' / one-liner
- probe — kprobe / kretprobe / tracepoint / uprobe / interval / profile
- 액션 — print / printf / count / histogram
- 변수 — @map[key] = ...
- 내장 변수 — pid, comm, kstack, ustack
- 시각화 — @ 히스토그램 출력
