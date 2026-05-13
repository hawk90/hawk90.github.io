---
title: "Ch 3: strace 고급 — 필터 / 통계 / multi-process"
date: 2025-08-30T03:00:00
description: "-c (통계), -y (fd 이름), -k (콜스택), -e signal, -e network."
tags: [strace, Advanced]
series: "System Tracing"
seriesOrder: 3
draft: true
---

## 예정 내용
- -c — syscall 통계 (count, time)
- -y / -yy — fd name 해석
- -k — 콜스택 (CONFIG_HAVE_RELIABLE_STACKTRACE)
- -e signal — 시그널만
- -e network — 네트워크 syscall
- 인터프리트 도구 — strace-graph
