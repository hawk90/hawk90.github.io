---
title: "Ch 15: RAS·Performance·Compliance — 운용·검증의 마지막 단계"
date: 2026-05-16T09:15:00
description: "Reliability·Availability·Serviceability, 성능 고려사항, Compliance Testing."
series: "CXL 4.0 Internals"
seriesOrder: 15
tags: [cxl, cxl-4, internals]
draft: true
---

> Outline — RAS 이벤트 등급 — Information·Warning·Failure·Fatal, Viral·AER·Recovery, Poison list와 page offline, CVME (CXL Virtual Memory Errors), Performance Considerations — latency budget·bandwidth utilization·Roofline 적용, Compliance Testing (Ch 14) — 표준 test case·Compliance Mode DOE·Extended Metadata Capability test, 실 운용 사례 — `cxl health`·event log·bpftrace 추적, 시리즈 마무리.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
>
> 시리즈 출처 안내는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) footer 참고.
