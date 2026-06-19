---
title: "Ch 11: Linux drivers/cxl/ 분석 — Mainline kernel CXL 구현"
date: 2026-05-16T09:11:00
description: "Linux 6.x의 CXL subsystem 코드 구조와 probe 흐름."
series: "CXL 4.0 Internals"
seriesOrder: 11
tags: [cxl, linux, driver, daxctl]
draft: true
---

> Outline — 모듈 구조 — cxl_acpi·cxl_pci·cxl_core·cxl_mem·cxl_port·cxl_pmem, 의존성 체인, cxl_pci_probe 단계별 호출 (DVSEC 확인·MMIO 매핑·mailbox 초기화·memdev 등록), HDM Decoder 프로그래밍 코드 (core/hdm.c), Region 생성 sysfs path (decoder → region → DAX), Mailbox API (core/mbox.c), Linux 6.0+에서 안정화, Modern Recipes Ch 151 연결.
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
