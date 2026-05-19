---
title: "Chapter 12: Boot 디버깅"
date: 2026-05-22T12:00:00
description: "JTAG halt-at-reset, ROM trace, semihosting, hardfault 분석 — 부트가 죽었을 때의 진단 도구를 정리합니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 12
tags: [arm, baremetal, debug, jtag, semihosting, hardfault]
draft: true
---

> Outline — 부트 단계별로 *무엇이 죽었는지*를 판정하는 도구 — JTAG halt-at-reset로 첫 명령 진입 확인, ETM/ITM trace, semihosting 초기 출력, HardFault·SecureFault·SError 분석 흐름을 정리합니다.
