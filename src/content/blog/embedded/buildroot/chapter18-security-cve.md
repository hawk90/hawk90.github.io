---
title: "Ch 18: Security·CVE 추적 — pkg-stats와 reproducible builds"
date: 2026-05-19T18:00:00
description: "Buildroot의 CVE 추적·legal info 산출·SBOM·reproducible build로 보안과 컴플라이언스를 관리하는 패턴."
series: "Buildroot Practical"
seriesOrder: 18
tags: [embedded, buildroot, security, cve, sbom, reproducible-builds]
draft: true
---

Outline:
- make pkg-stats — CVE·NVD 매칭
- legal-info — license 산출
- BR2_REPRODUCIBLE — bit-perfect 빌드
- SBOM 생성 (CycloneDX·SPDX)
- 보안 옵션 — relro, ssp, pie
- root password·서비스 비활성화 패턴
