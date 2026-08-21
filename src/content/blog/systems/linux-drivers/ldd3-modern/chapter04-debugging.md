---
title: "Ch 4: Debugging Techniques"
slug: "systems/linux-drivers/ldd3-modern/chapter04-debugging"
date: 2026-05-13T04:00:00
description: "Kernel debug — printk, dmesg, /proc·/sys, oops 분석, kdb, ftrace, kprobes."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 4
tags: [linux, driver, debugging, dmesg, ftrace]
draft: true
topics: ["systems", "systems/linux-drivers"]
---

> Outline — `printk`·`dynamic_debug`·`pr_debug`·`dev_dbg`. `/sys/kernel/debug` (debugfs). oops 메시지 읽기 — `decode_stacktrace.sh`. *모던 도구* — ftrace·tracepoint·kprobes·BPF (`bpftrace`). KASan·KMSan·UBSan in kernel.
