---
title: "Ch 12: QEMU CXL 에뮬레이션 — 노트북에서 CXL 개발"
date: 2026-05-16T09:12:00
description: "QEMU 8.0+의 CXL Type 3 에뮬레이션과 드라이버 검증 워크플로."
series: "CXL 4.0 Internals"
seriesOrder: 12
tags: [cxl, cxl-4, internals]
draft: true
---

> Outline — QEMU CXL 지원 현황 (Type 3 stable, Type 2 experimental, Multi-LD partial), 호스트 머신 모델 (`-machine q35,cxl=on`), CXL Type 3 디바이스 추가 명령, Linux guest에서 cxl_acpi → cxl_pci → cxl_mem 인식 흐름, CEDT (CXL Early Discovery Table) 자동 생성, Region 생성·DAX 모드 전환, 드라이버 개발 사이클, 한계 (latency 시뮬레이션 부정확, CXL.cache 미지원), Modern Recipes Ch 150 연결.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
>
> 시리즈 출처 안내는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) footer 참고.
