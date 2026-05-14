---
title: "Ch 2: Secure Boot — 부트 체인 검증"
date: 2025-09-20T03:00:00
description: "ROM → bootloader → kernel → app. 각 단계 서명 검증. Root of Trust."
tags: [Secure Boot, Root of Trust, Cryptography]
series: "Embedded Security"
seriesOrder: 2
draft: true
---

## 예정 내용
- Root of Trust — 변경 불가 ROM
- 부트 체인 — ROM verify bootloader → bootloader verify kernel → ...
- 키 관리 — OTP (One-Time Programmable) fuse
- HW Secure Boot — ATF (Arm Trusted Firmware), HAB (NXP), CSE
- 검증 알고리즘 — ECDSA / RSA
- anti-rollback (nonce / monotonic counter)
- Measured Boot (TPM)
