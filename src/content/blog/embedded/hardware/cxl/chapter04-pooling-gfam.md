---
title: "Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유"
date: 2026-05-16T09:04:00
description: "CXL 2.0 pooling, CXL 3.x fabric, GFAM (Global Fabric Attached Memory)."
series: "CXL 4.0 Internals"
seriesOrder: 4
tags: [cxl, memory-pooling, sharing, hypervisor]
draft: true
---

> Outline — CXL 2.0 — Single-level switch + multi-LD time-share pooling, CXL 3.0 — Multi-level switch + coherent multi-host fabric, GFAM — fabric 전역에서 보이는 메모리 풀, PBR (Port-Based Routing) — switch가 라우팅, Fabric Manager — out-of-band 컨트롤, Coherency Domain ID, 실 사례 — Meta·Microsoft·AMD MI300 Cluster.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
