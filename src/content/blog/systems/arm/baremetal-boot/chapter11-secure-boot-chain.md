---
title: "Chapter 11: Secure Boot Chain End-to-End"
date: 2026-05-22T11:00:00
description: "ROM key에서 시작하는 신뢰 사슬 — BL2 sign verify, BL31 verify, kernel signature까지를 끝까지 따라갑니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 11
tags: [arm, baremetal, secure-boot, root-of-trust, hab, mcuboot]
draft: true
---

> Outline — Root of Trust가 되는 SoC ROM key·OTP fuse·HAB super-root, BL2/BL31/BL33 단계별 signature 검증 흐름, MCUboot의 anti-rollback, 그리고 kernel image 검증까지 *한 사슬*로 연결합니다.
