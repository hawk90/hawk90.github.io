---
title: "Ch 5: Falcon Mode — SPL이 커널을 직접 부팅"
date: 2026-05-09T05:00:00
description: "U-Boot Falcon Mode — SPL이 U-Boot Proper를 건너뛰고 커널을 직접 부트. 부트 시간 단축의 핵심."
series: "Bootloader Internals"
seriesOrder: 5
tags: [embedded, bootloader, u-boot, falcon, boot-time]
draft: true
---

> Outline — *왜 Falcon인가* — sub-second boot이 필요한 양산 시스템. 동작 — SPL이 `args`(DT + boot args)와 kernel image를 미리 정해진 위치에서 직접 로드. 양산용 *Run-time* vs 개발용 *U-Boot Proper* 흐름의 공존. 한계 — 변수 인터랙션 없음.
