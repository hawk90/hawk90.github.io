---
title: "Ch 7: CXL.cache — D2H·H2D 흐름과 coherency state"
date: 2026-05-16T09:07:00
description: "디바이스가 호스트 메모리를 캐시하는 프로토콜."
series: "CXL 4.0 Internals"
seriesOrder: 7
tags: [cxl, cxl-cache, coherence]
draft: true
---

> Outline — CXL.cache 동기 — 가속기가 host 메모리를 native 캐시해 PCIe round-trip 회피, D2H 메시지 — Req (Read·Write·Invalidate)·Resp, H2D 메시지 — Snoop·Resp·Data, Cache state — Modified·Exclusive·Shared·Invalid (MESI 변형), Snoop 흐름 — host CPU의 cache와 device cache 간 일관성, Type 1 디바이스 시나리오 — SmartNIC packet metadata 캐싱, false sharing 위험.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
