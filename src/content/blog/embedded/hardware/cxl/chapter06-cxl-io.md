---
title: "Ch 6: CXL.io — PCIe와의 차이·DOE·DVSEC"
date: 2026-05-16T09:06:00
description: "CXL.io 프로토콜의 PCIe 호환성과 CXL 고유 확장."
series: "CXL 4.0 Internals"
seriesOrder: 6
tags: [cxl, cxl-io, pcie, discovery]
draft: true
---

> Outline — CXL.io 역할 — discovery·enumeration·configuration·error reporting, PCIe와 99% 호환, CXL DVSEC (Designated Vendor-Specific Extended Capability) — 디바이스가 CXL 호환임을 알리는 표지, DOE (Data Object Exchange) — SPDM·CMA·IDE_KM 같은 보조 프로토콜의 mailbox 채널, UIO (Unordered I/O) — P2P 흐름, Direct CXL.mem access (3.1+) — accelerator 간 P2P, Linux 측 인식 경로 (lspci DVSEC·DOE caps).
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
