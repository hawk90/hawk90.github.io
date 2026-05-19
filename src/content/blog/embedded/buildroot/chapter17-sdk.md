---
title: "Ch 17: SDK 생성·배포 — make sdk와 application 워크플로"
date: 2026-05-19T17:00:00
description: "Buildroot가 만든 toolchain을 application 개발자에게 SDK로 배포하는 패턴과 relocatable toolchain 한계."
series: "Buildroot Practical"
seriesOrder: 17
tags: [embedded, buildroot, sdk, toolchain, application]
draft: true
---

Outline:
- make sdk — relocatable toolchain
- 산출물 구조 (host/, target sysroot)
- environment-setup 스크립트
- IDE 통합 (VS Code, CLion)
- application 개발자 워크플로
- Yocto SDK와의 차이
