---
title: "Ch 14: Security — IDE·SPDM·TSP·CXL TEE"
date: 2026-05-16T09:14:00
description: "CXL 보안 메커니즘 4종의 위치와 관계."
series: "CXL 4.0 Internals"
seriesOrder: 14
tags: [cxl, cxl-4, internals]
draft: true
---

> Outline — 위협 모델 — link sniffing·MITM·device spoofing·firmware downgrade·co-tenant 도용, IDE (Integrity and Data Encryption) — link 트래픽 AES-GCM 암호화, SPDM (DMTF DSP0274) — 디바이스 인증·키 교환·session 협상, CMA (Component Measurement Attestation) — firmware hash 측정·검증, TSP (Trusted Security Protocol, CXL 3.1+) — fabric 통합 보안, CXL TEE (TDISP) — TVM에 디바이스 안전 attach, AMD SEV-TIO·Intel TDX Connect·ARM CCA의 CXL 통합.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
>
> 시리즈 출처 안내는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) footer 참고.
