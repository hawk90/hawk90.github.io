---
title: "Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port"
date: 2026-05-16T09:05:00
description: "PCIe 7.0 기반 128 GT/s, Bundled Port·Streamlined Port의 동기와 효과."
series: "CXL 4.0 Internals"
seriesOrder: 5
tags: [cxl, cxl-4, internals]
draft: true
---

> Outline — PCIe 7.0 PHY 위 128 GT/s — Flit 구조 (256B FEC·CRC)는 3.0과 동일, Backward compatibility 보장, x2 native width 추가, retimer 4개 지원 (장거리 link), Bundled Port — multiple upstream port 집계, Streamlined Port — 간소화된 enumeration, Maintenance — Host-initiated PPR·memory sparing at boot, 운용 효과 — latency↓·bandwidth↑·QoS↑.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
>
> 시리즈 출처 안내는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) footer 참고.
