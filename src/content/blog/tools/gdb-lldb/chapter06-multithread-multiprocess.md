---
title: "Ch 6: 멀티스레드 / 멀티프로세스 디버깅"
date: 2025-08-21T02:00:00
description: "thread / process apply. scheduler-locking. follow-fork."
tags: [gdb, Multithread, Multiprocess]
series: "GDB and LLDB"
seriesOrder: 6
draft: true
---

## 예정 내용
- info threads / thread N — 스레드 전환
- thread apply all bt — 모든 스레드 bt
- scheduler-locking — 한 스레드만 진행
- follow-fork-mode parent/child
- detach-on-fork
- 비결정적 버그 — 자주 멈춤 / record-and-replay (rr)
