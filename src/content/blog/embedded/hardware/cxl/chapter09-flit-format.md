---
title: "Ch 9: Flit Format — 68B vs 256B vs Latency-Optimized"
date: 2026-05-16T09:09:00
description: "Flit 단위 구조의 세대 별 변화."
series: "CXL 4.0 Internals"
seriesOrder: 9
tags: [cxl, cxl-4, internals]
draft: true
---

> Outline — Flit 개념 — Flow Control Unit, 68B flit (CXL 1.1·2.0) — 528-bit, PCIe 5.0 baseline, 256B flit (3.0+) — PCIe 6.0 FEC+CRC, throughput 위주, Latency-Optimized 256B flit — 작은 메시지 빠르게 보냄, Standard 256B flit — 큰 payload throughput, Flit packing rules — slot·DLLP·LLR, Protocol ID·payload·trailer, Backward compatibility negotiation.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
>
> 시리즈 출처 안내는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) footer 참고.
