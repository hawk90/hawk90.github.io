---
title: "Ch 16: OTA·이미지 업데이트 — RAUC와 swupdate"
date: 2026-05-19T16:00:00
description: "Buildroot에서 RAUC·swupdate·Mender를 통합해 A/B 부팅·atomic update를 제공하는 패턴."
series: "Buildroot Practical"
seriesOrder: 16
tags: [embedded, buildroot, ota, rauc, swupdate, mender]
draft: true
---

Outline:
- 비교 — RAUC vs swupdate vs Mender
- RAUC 통합 — config, slot, bundle
- swupdate 통합 — sw-description, image
- A/B slot 부팅 (U-Boot bootcount/altbootcmd)
- 서명·암호화·롤백 정책
- 흔한 실패 — slot 크기 부족, env 비동기
