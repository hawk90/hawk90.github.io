---
title: "Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp"
date: 2026-05-16T09:03:00
description: "Host-managed Device Memory 두 종류와 일관성 메커니즘."
series: "CXL 4.0 Internals"
seriesOrder: 3
tags: [cxl, cxl-4, internals]
draft: true
---

> Outline — HDM (Host-managed Device Memory) 정의, HDM-DB (Device-Backed, BISnp 기반 양방향 일관성) — Type 2의 양방향 cache, HDM-D (Device-Owned, Bias 기반 단방향) — Bias 전환으로 snoop overhead 회피, Bias 모드 — Host Bias vs Device Bias 의 전환 흐름, BISnp (Back-Invalidation Snoop) — CXL 3.0+의 explicit invalidation, snoop filter, software trigger.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
>
> 시리즈 출처 안내는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) footer 참고.
