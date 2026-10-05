---
title: "SoC에 JTAG이 안 붙을 때 — 전원 도메인·디버그 잠금·클럭 게이팅"
slug: "tools/debugging/embedded/chapter13-jtag-wont-attach-soc"
date: 2026-10-05T10:13:00
description: "SoC 수준에서 DAP 접근이 실패하는 원인을 전원 도메인, 디버그 인증·잠금, 클럭 게이팅 관점에서 진단."
series: "Embedded Debugging"
seriesOrder: 13
tags: [jtag, dap, coresight, soc, bring-up]
draft: true
topics: ["tools", "tools/debugging"]
---

MCU에서 JTAG이 안 붙는 원인은 대개 배선과 설정입니다. SoC에서는 디버그 로직 자체가 꺼진 전원 도메인에 있거나, 보안 설정으로 잠겨 있거나, 클럭이 없는 경우가 더 많습니다.

## MCU와 SoC의 차이

이 절은 작성 예정입니다.

## DP는 보이는데 AP가 안 보일 때

이 절은 작성 예정입니다.

## 디버그 전원 도메인과 power-up 요청

이 절은 작성 예정입니다.

## 디버그 인증과 잠금

이 절은 작성 예정입니다.

## 코어가 클럭 게이팅·WFI 상태일 때

이 절은 작성 예정입니다.

## 정리

이 절은 작성 예정입니다.

## 다음 장 예고

다음 장에서 다룰 주제는 **JTAG 없이 Hang 잡기**입니다.

## 관련 항목

- [이전 장](/blog/tools/debugging/embedded/chapter12-bootrom-stall)
- [다음 장](/blog/tools/debugging/embedded/chapter14-hang-without-jtag)
