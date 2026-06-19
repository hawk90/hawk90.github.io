---
title: "Ch 8: CXL.mem — M2S·S2M·HDM Decoder"
date: 2026-05-16T09:08:00
description: "호스트가 디바이스 메모리를 load/store하는 프로토콜."
series: "CXL 4.0 Internals"
seriesOrder: 8
tags: [cxl, cxl-mem, hdm, memory-expansion]
draft: true
---

> Outline — CXL.mem 동기 — host가 device memory를 native load/store, M2S Req (MemRd·MemInv)·RwD (MemWr+data), S2M NDR (Cmp·Cmp-S)·DRS (MemData)·BISnp (Type 2만), Read 트랜잭션 흐름·Write 트랜잭션 흐름, Tag 기반 out-of-order completion, HDM Decoder — SPA → DPA 매핑, interleave, Linux 측 sysfs path (`cxl list -DT`).
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
