---
title: "Ch 16: Verified Boot — RSA 서명과 public key 임베딩"
date: 2026-05-09T16:00:00
description: "U-Boot Verified Boot — FIT 서명, public key를 U-Boot DT에 박는 워크플로."
series: "Bootloader Internals"
seriesOrder: 16
tags: [embedded, bootloader, u-boot, verified-boot, security]
draft: true
---

> Outline — Verified Boot의 신뢰 체인 — ROM이 SPL을, SPL이 U-Boot를, U-Boot가 FIT를 검증. RSA 키 쌍 생성, public key를 *U-Boot의 control DT*에 임베드, `mkimage -k`로 FIT 서명. anti-rollback과의 관계. `embedded-security/chapter02-secure-boot`와의 분업.
