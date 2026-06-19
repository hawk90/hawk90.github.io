---
title: "Ch 10: ARB/MUX — 세 프로토콜의 PHY 다중화"
date: 2026-05-16T09:10:00
description: "같은 PHY에 CXL.io·CXL.cache·CXL.mem을 시분할로 흘리는 layer."
series: "CXL 4.0 Internals"
seriesOrder: 10
tags: [cxl, cxl-4, internals]
draft: true
---

> Outline — ARB/MUX의 역할 — Transaction Layer와 Physical Layer 사이의 multiplexer, vLSM (virtual Link State Machine) — protocol별 link state, ALMP (ARB/MUX Link Management Packet) — protocol negotiation·power transition, Bypass Feature, arbitration policy — CXL.mem과 .cache 우선, .io fallback, Flit 단위 시분할 흐름.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
>
> 시리즈 출처 안내는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) footer 참고.
