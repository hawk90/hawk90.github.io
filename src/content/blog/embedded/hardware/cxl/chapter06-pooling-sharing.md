---
title: "Ch 6: 메모리 풀링과 공유"
date: 2026-05-16T06:00:00
description: "CXL 2.0의 핵심 가치 — 여러 호스트가 메모리 풀을 동적으로 분할."
series: "CXL 심화"
seriesOrder: 6
tags: [cxl, memory-pooling, sharing, hypervisor]
draft: true
---

> Outline — *Memory pooling* — 1 pool ↔ N hosts, time-shared. *Memory sharing* — N hosts 동시 접근 (coherence 필요). *Dynamic Capacity Device (DCD)* — host가 capacity를 in-flight 할당받는다. *Hypervisor 통합* — VFIO·QEMU·KVM. *Hot-add/remove* — Linux의 `dax`·`memory_hotplug`. TCO 절감 모델.
