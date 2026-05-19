---
title: "Ch 6: OTA Update — 서명 / rollback 방지"
date: 2026-05-08T07:00:00
description: "안전한 펌웨어 업데이트. A/B 슬롯, delta update, 서명 검증."
tags: [OTA, Firmware Update, Rollback]
series: "Embedded Security"
seriesOrder: 6
draft: true
---

## 예정 내용
- OTA 흐름 — 다운로드 / 검증 / 적용
- 서명 검증 — RSA / ECDSA
- A/B 슬롯 vs single image
- 부트 매니저 — Mender, SWUpdate, MCUboot
- delta update — bsdiff / detools
- rollback 방지 — 모노토닉 카운터
- 네트워크 보안 — TLS / 인증서 pinning
