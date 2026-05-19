---
title: "Ch 11: 리눅스 실시간 — PREEMPT_RT·EtherCAT"
date: 2026-05-16T11:00:00
description: "Linux 위에서 산업 이더넷 master를 돌리려면."
series: "Industrial Ethernet 심화"
seriesOrder: 11
tags: [linux, preempt-rt, xenomai, ethercat-driver]
draft: true
---

> Outline — *PREEMPT_RT* — mainline에 통합 (v6.12). *Xenomai*·*RTAI* 비교. *CPU isolation* — `isolcpus`·`nohz_full`·`rcu_nocbs`. *NIC tuning* — IRQ affinity·busy poll·DMA·ring size. *Latency measurement* — `cyclictest`·`hackbench`. *EtherCAT IgH 드라이버 설정*. PLC vs softPLC.
