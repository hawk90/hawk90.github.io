---
title: "Ch 6: 명령 큐와 제출"
date: 2027-12-01T06:00:00
description: "Command stream·doorbell·queue — NPU에 작업을 보내는 길."
series: "NPU 드라이버 개발"
seriesOrder: 6
tags: [npu, command-queue, doorbell, scheduler]
draft: true
---

> Outline — *Ring buffer* — head·tail·doorbell. *Submit ioctl* — command stream + dependency. *drm_sched*·*drm_gpu_scheduler* — kernel-side scheduler. *Multi-context*·*priority*·*preemption*. *Out-of-order submission*·*in-order completion*. *Userspace submission (UMD-direct)* — Mesa·UMR 패턴.
