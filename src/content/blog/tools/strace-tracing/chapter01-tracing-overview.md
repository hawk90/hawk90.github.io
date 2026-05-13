---
title: "Ch 1: 트레이싱이란 / 종류 비교"
date: 2025-08-30T01:00:00
description: "ptrace / perf_event_open / eBPF — 세 가지 메커니즘. 비용 비교."
tags: [Tracing, ptrace, eBPF]
series: "System Tracing"
seriesOrder: 1
draft: true
---

## 예정 내용
- 트레이싱 카테고리 — syscall / library / userspace / kernel
- 메커니즘 — ptrace / perf_event / kprobe / uprobe / eBPF
- 비용 비교 (strace 매우 느림, eBPF 최소)
- 도구 선택 표
