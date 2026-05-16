---
title: "Ch 20: 양산 환경 — CI/CD, 재현 가능 빌드, 서명"
date: 2026-05-20T20:00:00
description: "BSP를 양산으로 옮기는 단계 — CI 빌드, 재현성, 코드 서명, 키 관리."
series: "BSP Development"
seriesOrder: 20
tags: [embedded, bsp, ci-cd, signing, production]
draft: true
---

> Outline — *내 PC에서 빌드*에서 *CI에서 자동 빌드*로. 재현 가능 빌드 — `SOURCE_DATE_EPOCH`, fixed toolchain, locked package versions. 서명 키의 *세 등급* — dev 키, QA 키, production 키. HSM 사용 패턴. 양산 라인의 flash 도구 (`uuu`·`uniflash`).
