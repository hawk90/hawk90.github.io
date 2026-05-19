---
title: "Ch 4: ltrace — 라이브러리 함수 트레이싱"
date: 2026-05-17T04:00:00
description: "ltrace — 동적 링킹된 libc/lib 함수 호출. strace + ltrace 결합."
tags: [ltrace, Library, Dynamic Linking]
series: "System Tracing"
seriesOrder: 4
draft: true
---

## 예정 내용
- ltrace ./prog — 라이브러리 호출
- -S — syscall 같이
- -f — fork
- -e 필터
- 한계 — 정적 링킹 / inline 함수
- 비용 — strace보다 더 느림
