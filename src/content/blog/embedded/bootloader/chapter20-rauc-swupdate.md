---
title: "Ch 20: RAUC / SWUpdate — 펌웨어 업데이트 프레임워크"
date: 2026-05-18T20:00:00
description: "U-Boot와 통합되는 펌웨어 업데이트 프레임워크 — RAUC와 SWUpdate의 비교와 적용."
series: "Bootloader Internals"
seriesOrder: 20
tags: [embedded, bootloader, u-boot, rauc, swupdate, ota]
draft: true
---

> Outline — *왜 프레임워크인가* — A/B + 검증 + 진행 보고 + 롤백 모두 직접 짜기 부담. RAUC (Pengutronix) — bundle 포맷, U-Boot env로 슬롯 표시. SWUpdate (sbabic) — Mongoose UI, SUOTA, suricatta. 두 도구의 *철학 차이*와 *선택 기준*. U-Boot 측 설정.
