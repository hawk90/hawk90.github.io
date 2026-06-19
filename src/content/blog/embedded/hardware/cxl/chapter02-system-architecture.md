---
title: "Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD"
date: 2026-05-16T09:02:00
description: "CXL 디바이스 분류와 multi-LD·multi-head 구조."
series: "CXL 4.0 Internals"
seriesOrder: 2
tags: [cxl, device-type, accelerator]
draft: true
---

> Outline — Type 1 (cache-only NIC·DPU), Type 2 (accelerator with memory, HBM3·DRAM), Type 3 (memory expander), MLD (Multi Logical Device) — multi-host pooling을 위한 분할, MH-MLD (Multi-Headed Device) — 복수 upstream port, Bundled Port·Streamlined Port의 위치, 실 사례 (Samsung CMM-D, SK Hynix Niagara, AMD MI300X, Astera Labs Leo).
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
