---
title: "Ch 7: core dump 분석"
date: 2025-08-21T03:00:00
description: "ulimit / core_pattern. gdb -c. 패닉 사후 분석."
tags: [gdb, Core Dump, Crash]
series: "GDB / LLDB"
seriesOrder: 7
---

## 예정 내용
- ulimit -c unlimited
- /proc/sys/kernel/core_pattern (systemd-coredump / apport)
- gdb /path/to/exe /path/to/core
- coredumpctl (systemd)
- mini-coredumps / macOS .crash
- ASAN / TSAN coredump 차이
