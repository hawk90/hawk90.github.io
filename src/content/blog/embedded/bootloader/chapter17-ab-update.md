---
title: "Ch 17: A/B 업데이트와 boot 이중화"
date: 2026-05-09T17:00:00
description: "A/B 슬롯 부트 — 양산 시스템의 안전한 펌웨어 업데이트와 자동 fallback."
series: "Bootloader Internals"
seriesOrder: 17
tags: [embedded, bootloader, u-boot, ab-update, fallback]
draft: true
---

> Outline — *왜 A/B인가* — OTA 중 전원 끊김에서 살아남기, rollback. 두 슬롯에 같은 부트 체인. *boot counter*·*successful boot flag*로 자동 fallback. U-Boot의 `bootcount`·`altbootcmd`. Android A/B와의 비교. partition layout 설계.
