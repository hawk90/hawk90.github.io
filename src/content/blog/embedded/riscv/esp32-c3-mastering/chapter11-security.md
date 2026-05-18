---
title: "Ch 11: 보안 — Secure Boot, Flash Encryption, eFuse"
date: 2026-05-01T11:00:00
description: "ECDSA 기반 Secure Boot V2, AES-256 Flash Encryption, eFuse 키 보관."
series: "ESP32-C3 Mastering"
seriesOrder: 11
tags: [security, secure-boot, flash-encryption, efuse, esp32-c3]
draft: true
---

> Outline — *eFuse* — one-time-writable 키 슬롯·설정 비트. *Secure Boot V2* — bootloader·partition·app 모두 ECDSA-256 서명. *Flash Encryption* — AES-256 XTS, eFuse 키. *Two modes* — Development (재플래시 가능) vs Release (일방향 봉인). *Anti-rollback*. *HMAC accelerator*, *Digital Signature peripheral*. 운영 워크플로 — 키 생성, 양산 라인 통합. *흔한 실수* — 개발 모드에서 안 풀고 봉인 → 영구 brick.
