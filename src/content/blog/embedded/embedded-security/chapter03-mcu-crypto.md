---
title: "Ch 3: MCU 크립토 — HW accelerator (AES / SHA / ECC)"
date: 2026-05-08T04:00:00
description: "MCU 내장 crypto 엔진. 소프트웨어 vs 하드웨어. constant-time."
tags: [Crypto, AES, ECC, MCU]
series: "Embedded Security"
seriesOrder: 3
draft: true
---

## 예정 내용
- AES-128/256 — block cipher
- SHA-256 — hash
- ECC (Curve25519, P-256) — 비대칭
- HW accelerator — STM32 CRYP, NXP CAU, NRF CC310
- TRNG — true random number generator
- 소프트웨어 fallback — mbedTLS / wolfSSL / tinycrypt
- constant-time 구현 — 타이밍 사이드채널 방지
