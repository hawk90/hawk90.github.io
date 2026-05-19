---
title: "Ch 4: CXL.mem — 디바이스 메모리 접근"
date: 2026-05-16T04:00:00
description: "Host가 device memory를 직접 byte-addressable로 — load/store 시맨틱."
series: "CXL 심화"
seriesOrder: 4
tags: [cxl, cxl-mem, hdm, memory-expansion]
draft: true
---

> Outline — *Host → Device* 방향. *HDM (Host-managed Device Memory)* — 호스트 주소 공간에 매핑. *M2S Request* — Rd·Wr. *S2M Response* — NDR·DRS. *Cacheable·non-cacheable* region. *latency·bandwidth* 특성과 NUMA-like 효과. *Type 3 device*의 핵심.
