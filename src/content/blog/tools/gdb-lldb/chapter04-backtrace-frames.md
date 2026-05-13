---
title: "Ch 4: backtrace / 프레임 / 호출 스택"
date: 2025-08-20T04:00:00
description: "bt / frame / up / down. 호출 스택 분석. inline 함수의 까다로움."
tags: [gdb, lldb, Backtrace, Stack]
series: "GDB and LLDB"
seriesOrder: 4
draft: true
---

## 예정 내용
- backtrace / bt — 호출 스택
- frame N / up / down — 프레임 이동
- info frame — 프레임 정보
- inline 함수 — 디버그 정보 의존
- ABI별 프롤로그 / 에필로그
- 최적화 코드의 스택 위장
