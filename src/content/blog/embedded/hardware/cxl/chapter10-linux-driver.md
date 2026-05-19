---
title: "Ch 10: 리눅스 CXL 드라이버"
date: 2026-05-16T10:00:00
description: "drivers/cxl/·cxl-cli·daxctl — 커널 입장에서 CXL 다루기."
series: "CXL 심화"
seriesOrder: 10
tags: [cxl, linux, driver, daxctl]
draft: true
---

> Outline — *Kernel CXL subsystem* — `drivers/cxl/`. *CDAT (Coherent Device Attribute Table)* 파싱. *Region/decoder* 구성. *Userspace* — `cxl-cli`·`daxctl`·`ndctl`. *DAX device* — `/dev/daxN.M`. *Memory hotplug*과 ZONE_MOVABLE. *CXL events*·*RAS*·*reliability*. PetaLinux 등 임베디드 환경 적용 노트.
