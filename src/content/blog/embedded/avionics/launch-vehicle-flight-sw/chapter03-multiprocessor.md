---
title: "Ch 3: 멀티프로세서 SW — AMP·SMP·OpenAMP·RPMsg"
date: 2026-05-27T03:00:00
description: "Heterogeneous SoC에서 ARM·DSP·FPGA가 SW로 협력하는 표준 패턴."
series: "Launch Vehicle Flight Software"
seriesOrder: 3
tags: [avionics, amp, smp, openamp, rpmsg, ipc]
draft: true
---

> Outline — *SMP* (대칭, Linux+여러 코어) vs *AMP* (비대칭, Linux + bare-metal·RTOS). *Heterogeneous AMP* — ARM에 Linux + DSP/Cortex-R에 RTOS. **OpenAMP** — Linaro 표준, master-remote IPC. **RPMsg** — virtio-기반 메시지 채널. **remoteproc** (Linux) — remote 프로세서 lifecycle 관리. 발사체 FCC에서 *역할 분담*과 *fault isolation*에 활용.
